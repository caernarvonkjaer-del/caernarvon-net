import { expect, test, type Page } from '@playwright/test';
import { readFile, rename } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { gotoApp } from './support/target';

const webTarget = process.env.PG_TARGET === 'web';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

type OfflineStatus = {
  type: string;
  ready: boolean;
  available: boolean;
  cacheVersion: string;
  criticalCount: number;
  offlineCount: number;
  cachedCount: number;
  message?: string;
};

async function waitForActiveWorker(page: Page): Promise<void> {
  await page.waitForFunction(async () => Boolean((await navigator.serviceWorker?.getRegistration())?.active));
}

async function sendWorkerMessage(page: Page, type: string): Promise<OfflineStatus> {
  return page.evaluate(async (messageType) => {
    const registration = await navigator.serviceWorker.getRegistration();
    const worker = navigator.serviceWorker.controller || registration?.active;
    if (!worker) {
      throw new Error('No active service worker');
    }
    return new Promise((resolve, reject) => {
      const channel = new MessageChannel();
      const timer = window.setTimeout(() => reject(new Error(`Timed out waiting for ${messageType}`)), 120_000);
      channel.port1.onmessage = (event) => {
        window.clearTimeout(timer);
        resolve(event.data);
      };
      worker.postMessage({ type: messageType }, [channel.port2]);
    });
  }, type) as Promise<OfflineStatus>;
}

async function generatedManifest(): Promise<{ cacheVersion: string; entries: Array<{ url: string; tier: string }> }> {
  const worker = await readFile(path.join(root, 'dist/web/sw.js'), 'utf8');
  const match = worker.match(/const PRECACHE_MANIFEST=(\{.*\});\r?\nconst CACHE_PREFIX=/);
  if (!match) throw new Error('Generated precache manifest not found in dist/web/sw.js');
  return JSON.parse(match[1]);
}

test.describe('hosted offline cache', () => {
  test.skip(!webTarget, 'Service workers apply only to the built hosted target');
  test.describe.configure({ mode: 'serial' });

  test('first load installs the atomic critical shell', async ({ page, context }) => {
    await gotoApp(page);
    await waitForActiveWorker(page);

    const status = await sendWorkerMessage(page, 'GET_OFFLINE_STATUS');
    expect(status.available).toBe(true);
    expect(status.ready).toBe(false);
    expect(status.criticalCount).toBeGreaterThan(0);

    const shellEntries = await page.evaluate(async (version) => {
      const cache = await caches.open(`pg-shell-${version}`);
      return (await cache.keys()).map(request => request.url);
    }, status.cacheVersion);
    expect(shellEntries).toHaveLength(status.criticalCount);
    expect(shellEntries.some(url => url.endsWith('/index.html'))).toBe(true);

    await context.setOffline(true);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page).toHaveTitle('Probate Guardian App');
    await context.setOffline(false);
  });

  test('DOWNLOAD_OFFLINE_PACK completes and writes a versioned ready marker', async ({ page }) => {
    await gotoApp(page);
    await waitForActiveWorker(page);

    const result = await sendWorkerMessage(page, 'DOWNLOAD_OFFLINE_PACK');
    expect(result.type).toBe('OFFLINE_PACK_READY');
    expect(result.ready).toBe(true);
    expect(result.cachedCount).toBe(result.offlineCount);

    const marker = await page.evaluate(async (version) => {
      const cache = await caches.open(`pg-offline-${version}`);
      const keys = await cache.keys();
      const markerRequest = keys.find(request => request.url.includes('__pg_offline_ready__'));
      return markerRequest ? cache.match(markerRequest).then(response => response?.json()) : null;
    }, result.cacheVersion);
    expect(marker).toEqual({ ready: true, cacheVersion: result.cacheVersion });
  });

  test('partial offline-pack failure remains not-ready and can retry', async ({ page }) => {
    await gotoApp(page);
    await waitForActiveWorker(page);

    const manifest = await generatedManifest();
    const victim = [...manifest.entries].reverse().find(entry => entry.tier === 'offline');
    if (!victim) throw new Error('Offline manifest has no retry-test candidate');
    const victimPath = path.join(root, 'dist/web', victim.url.replace(/^\.\//, ''));
    const hiddenPath = `${victimPath}.offline-test`;

    await rename(victimPath, hiddenPath);
    try {
      await expect(page.locator('#pwa-status-notice .app-toast-title')).toHaveText('Offline access available');
      await page.locator('#pwa-status-notice').getByRole('button', { name: 'Download', exact: true })
        .evaluate(button => (button as HTMLButtonElement).click());
      await expect(page.locator('#pwa-status-notice .app-toast-title')).toHaveText('Offline download incomplete');
      const partial = await sendWorkerMessage(page, 'GET_OFFLINE_STATUS');
      expect(partial.ready).toBe(false);
      expect(partial.cachedCount).toBeGreaterThan(0);
      expect(partial.cachedCount).toBeLessThan(partial.offlineCount);
    } finally {
      await rename(hiddenPath, victimPath);
    }

    await page.locator('#pwa-status-notice').getByRole('button', { name: 'Retry', exact: true })
      .evaluate(button => (button as HTMLButtonElement).click());
    await expect(page.locator('#pwa-status-notice .app-toast-title')).toHaveText('Offline access ready');
    const retried = await sendWorkerMessage(page, 'GET_OFFLINE_STATUS');
    expect(retried.ready).toBe(true);
    expect(retried.cachedCount).toBe(retried.offlineCount);
  });

  test('never caches sav, case-data, or blob URLs', async ({ page }) => {
    await gotoApp(page);
    await waitForActiveWorker(page);

    await page.evaluate(async () => {
      await fetch('probe.sav').catch(() => undefined);
      await fetch('case-data/probe.json').catch(() => undefined);
      const blobUrl = URL.createObjectURL(new Blob(['private case data']));
      try { await fetch(blobUrl); } finally { URL.revokeObjectURL(blobUrl); }
    });

    const cachedUrls = await page.evaluate(async () => {
      const names = await caches.keys();
      const requests = await Promise.all(names.map(async name => (await caches.open(name)).keys()));
      return requests.flat().map(request => request.url);
    });
    expect(cachedUrls.some(url => url.endsWith('.sav'))).toBe(false);
    expect(cachedUrls.some(url => url.includes('/case-data/'))).toBe(false);
    expect(cachedUrls.some(url => url.startsWith('blob:'))).toBe(false);
  });
});
