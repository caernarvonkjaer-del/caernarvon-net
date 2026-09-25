import { test, expect, type Browser, type Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
// @ts-ignore -- plain .mjs tooling, no types
import { extract } from '../../scripts/ms70-sav-corpus.mjs';
// @ts-ignore -- plain .mjs tooling, no types
import { startServer } from '../../scripts/serve-portable-http.mjs';

// Milestone 70, 70A: "Characterize the mixed-version surfaces by kind ...
// with a test that a record written by one version is read correctly by the
// other." Production has no service worker, so nothing makes open tabs
// update: after the merge deploys, one filer can have a tab on the old code
// and a tab on the new code, on the same case, at once -- and a tab reloaded
// into the new version keeps its own sessionStorage.
//
// Two versions are served from one origin here, the way production swaps
// versions under one URL: /old/ is a pre-Milestone-70 build (default the 9/24
// evening zip's commit, b28bf25; PG_MIXED_OLD_SHA re-pins it -- at the merge
// gate, to the build production then runs) and /new/ is this tree. Browsers
// share storage, BroadcastChannel and Web Locks per origin, so the two see
// each other exactly as two production tabs would. Every check runs in both
// directions and goes through each version's own code:
//   localStorage    pg.termsAccepted (the terms screen), pg-theme-v1 (the
//                   theme at load), pg-default-circuit (the Helpful Resources
//                   circuit), pg-last-position (resuming the last filing and
//                   page after opening a case), pg-tab-heartbeats-v1 (below);
//   BroadcastChannel probate-guardian-tabs and the heartbeats: a tab with a
//                   filing open makes the other version's tab warn, naming it;
//   sessionStorage  pg-tab-warning-dismissed-v1: dismissed in one version,
//                   still dismissed after the same tab reloads into the other;
//   Web Locks       pg-ward-<id>: a filing open in one version is locked in
//                   the other;
//   IndexedDB       pg-launch-pref (the "opened a case before" flag) and
//                   pg-session-cache (the recovery snapshot, decrypted by the
//                   other version).
// A last test records the exact shape of everything shared -- keys, value
// shapes, database versions and stores, the tab message, the lock name --
// for both versions in tests/baseline/ms70-shared-storage-golden.json, and
// requires the two to be identical.
//
// Excluded, and why:
//   - pg-launch-pref's remembered file handle (zipFileHandle): a real
//     FileSystemFileHandle comes only from a user-driven picker, which a test
//     cannot produce; the key itself is in the recorded shape of the store.
//   - pg-offline-access-answered, pg-update-reload-pending-v1 and the
//     service-worker caches (pg-shell-<version>, pg-offline-<version>): used
//     only by the web build's src/pwa-ui.js and sw.js; production runs the
//     portable build, which loads neither.
//   - Process-local state, which versions never share: the court-template
//     cache (_templateCache), the encryption key, module state.
// The unlock-failure count travels in the .sav archive's app state and is
// covered by tests/e2e/sav-corpus.characterization.spec.ts.
//
// Regenerate the golden only for a deliberate, recorded change:
// PG_UPDATE_GOLDEN=1 npx playwright test tests/e2e/mixed-version.characterization.spec.ts

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, '..', '..');
const OLD_SHA = process.env.PG_MIXED_OLD_SHA || 'b28bf25';
const PORT = 4337; // the milestone-70 branch's own (MILESTONE-70-FIX-LEDGER.md)
const FIXTURE = path.join(ROOT, 'tests', 'fixtures', 'sav', '28-zip-0924b-plain.sav');
const FIRST_FILING = 'Corpus Ward One';
const GOLDEN = path.join(ROOT, 'tests', 'baseline', 'ms70-shared-storage-golden.json');
const UPDATE = process.env.PG_UPDATE_GOLDEN === '1';
type Version = 'old' | 'new';
const DIRECTIONS: [Version, Version][] = [['old', 'new'], ['new', 'old']];

let server: any;
test.beforeAll(async () => {
  server = await startServer({ port: PORT, mounts: [{ base: '/old/', dir: extract(OLD_SHA) }, { base: '/new/', dir: ROOT }] });
});
test.afterAll(async () => { await new Promise((resolve) => server.close(resolve)); });

const url = (v: Version) => `http://localhost:${PORT}/${v}/index.html`;

async function openApp(page: Page, v: Version, { acceptTerms = true } = {}) {
  await page.addInitScript((accept) => {
    delete (window as any).showSaveFilePicker;
    delete (window as any).showOpenFilePicker;
    if (accept) localStorage.setItem('pg.termsAccepted', '2026-09-15');
  }, acceptTerms);
  await page.goto(url(v), { waitUntil: 'networkidle' });
}

async function newTab(browser: Browser | null, context: any, v: Version, options = {}) {
  const page: Page = await context.newPage();
  await openApp(page, v, options);
  return page;
}

async function freshCase(page: Page) {
  await page.locator('#startup-choice-overlay.show').waitFor({ state: 'visible' });
  await page.click('#startup-newcase-btn, #startup-newcase-link');
  await page.locator('#security-choice-overlay.show').waitFor({ state: 'visible' });
  await page.click('#security-choice-overlay [data-startup-action="select-security"][data-security-mode="none"]');
  await page.locator('#security-choice-overlay').waitFor({ state: 'hidden' });
}

/**
 * A brand-new case shows only the form picker; the theme button and the
 * circuit picker are on the dashboard, which needs a filing. One Guardian
 * Inventory with no county: the Helpful Resources circuit then falls back to
 * the device default (pg-default-circuit), which a case file's own saved
 * circuit would otherwise override.
 */
async function toDashboard(page: Page) {
  await page.evaluate(() => (window as any).showAddWardModalForType('guardian'));
  await page.locator('#addWardModal.show').waitFor({ state: 'visible' });
  await page.fill('#new-ward-name', 'Mixed Version Ward');
  await page.click('#addWardModal [data-modal-action="add-ward"]');
  await page.locator('#addWardModal').waitFor({ state: 'hidden' });
  await page.evaluate(() => (window as any).navigate('/dashboard'));
  await page.locator('#theme-toggle-btn').waitFor({ state: 'visible' });
}

async function openFixture(page: Page) {
  await page.locator('#startup-choice-overlay.show').waitFor({ state: 'visible' });
  await page.setInputFiles('#startup-open-input', FIXTURE);
  await expect(page.locator('#startup-choice-overlay')).not.toHaveClass(/show/);
  await page.waitForFunction(() => ((window as any).caseFile?.wards || []).length === 9);
}

const firstFilingId = (page: Page) => page.evaluate((name) => (window as any).caseFile.wards.find((w: any) => w.wardName === name).wardId, FIRST_FILING);
const openFiling = (page: Page, id: string) => page.evaluate((wardId) => (window as any).switchWard(wardId), id);

for (const [writer, reader] of DIRECTIONS) {
  test.describe(`${writer} tab writes, ${reader} tab reads`, () => {
    test('terms accepted in one version are honored by the other', async ({ browser }) => {
      const context = await browser.newContext();
      const a = await newTab(browser, context, writer, { acceptTerms: false });
      await a.locator('#pg-terms-overlay.show').waitFor({ state: 'visible' });
      await a.check('#pg-terms-agree');
      await a.click('#pg-terms-continue');
      await expect(a.locator('#pg-terms-overlay')).not.toHaveClass(/show/);
      const b = await newTab(browser, context, reader, { acceptTerms: false });
      await b.locator('#startup-choice-overlay.show').waitFor({ state: 'visible' });
      expect(await b.locator('#pg-terms-overlay.show').count(), 'no terms screen').toBe(0);
      await context.close();
    });

    test('a theme picked in one version paints the other at load', async ({ browser }) => {
      const context = await browser.newContext();
      const a = await newTab(browser, context, writer);
      await freshCase(a);
      await toDashboard(a);
      expect(await a.evaluate(() => document.documentElement.dataset.theme)).toBe('light');
      await a.locator('#theme-toggle-btn').click();
      await expect.poll(() => a.evaluate(() => document.documentElement.dataset.theme)).toBe('dark');
      const b = await newTab(browser, context, reader);
      expect(await b.evaluate(() => document.documentElement.dataset.theme), 'painted dark before anything ran').toBe('dark');
      await context.close();
    });

    test('a circuit picked in one version is the other\'s default', async ({ browser }) => {
      const context = await browser.newContext();
      const a = await newTab(browser, context, writer);
      await freshCase(a);
      await toDashboard(a);
      await a.locator('#sidebar-circuit-select').selectOption('13');
      const b = await newTab(browser, context, reader);
      await freshCase(b);
      await toDashboard(b);
      await expect(b.locator('#sidebar-circuit-select')).toHaveValue('13');
      await context.close();
    });

    test('the other version resumes the filing and page the first was on', async ({ browser }) => {
      const context = await browser.newContext();
      const a = await newTab(browser, context, writer);
      await openFixture(a);
      const id = await firstFilingId(a);
      expect(await openFiling(a, id)).not.toBe(false);
      await a.evaluate(() => (window as any).navigate('/print'));
      await a.close(); // releases the filing's lock -- asynchronously
      const b = await newTab(browser, context, reader);
      // What the first version left behind, as the second finds it.
      expect(await b.evaluate(() => JSON.parse(localStorage.getItem('pg-last-position') || 'null')))
        .toMatchObject({ route: '/print', wardId: id });
      // Otherwise the resume can race the closed tab's lock release and land on
      // the dashboard -- a real outcome, but not the one checked here.
      await expect.poll(() => b.evaluate(async () => ((await navigator.locks.query()).held || []).filter((l) => String(l.name).startsWith('pg-ward-')).length)).toBe(0);
      await openFixture(b);
      await expect.poll(() => b.evaluate(() => [(window as any).caseFile.activeWardId, location.hash])).toEqual([id, '#/print']);
      await context.close();
    });

    test('a filing open in one version makes the other warn, and a dismissal survives a reload into the other version', async ({ browser }) => {
      test.setTimeout(90_000);
      const context = await browser.newContext();
      const a = await newTab(browser, context, writer);
      await openFixture(a);
      expect(await openFiling(a, await firstFilingId(a))).not.toBe(false);
      const b = await newTab(browser, context, reader);
      const notice = b.locator('#tab-safety-notice');
      await expect(notice).toBeVisible({ timeout: 15_000 });
      await expect(notice.locator('.app-toast-title')).toHaveText('Another tab is active');
      await expect(notice.locator('.app-toast-desc')).toContainText(`Other tab: ${FIRST_FILING}.`);
      await notice.getByRole('button', { name: 'Continue here anyway' }).click();
      await expect(notice).toBeHidden();
      // The same tab, reloaded into the first tab's version: still dismissed.
      await b.goto(url(writer), { waitUntil: 'networkidle' });
      expect(await b.evaluate(() => sessionStorage.getItem('pg-tab-warning-dismissed-v1'))).toBe('1');
      await b.waitForTimeout(9_000); // two heartbeats
      await expect(b.locator('#tab-safety-notice')).toBeHidden();
      await context.close();
    });

    test('a filing open in one version is locked in the other', async ({ browser }) => {
      const context = await browser.newContext();
      const a = await newTab(browser, context, writer);
      await openFixture(a);
      const id = await firstFilingId(a);
      expect(await openFiling(a, id)).not.toBe(false);
      const b = await newTab(browser, context, reader);
      // Not resuming the first tab's position: the lock is what is checked here.
      await b.evaluate(() => localStorage.removeItem('pg-last-position'));
      await openFixture(b);
      expect(await openFiling(b, id), 'refused').toBe(false);
      await expect(b.locator('#ward-locked-overlay')).toHaveClass(/show/);
      await context.close();
    });

    test('the "opened a case before" flag and the recovery snapshot are read by the other version', async ({ browser }) => {
      const context = await browser.newContext();
      const b = await newTab(browser, context, reader);
      expect(await b.evaluate(() => (window as any).hasOpenedCaseBefore()), 'control: not yet').toBe(false);
      const a = await newTab(browser, context, writer);
      await openFixture(a);
      expect(await a.evaluate(() => (window as any).saveSessionRestoreCache())).toBe(true);
      const names = await a.evaluate(() => (window as any).caseFile.wards.map((w: any) => w.wardName));
      expect(await b.evaluate(() => (window as any).hasOpenedCaseBefore())).toBe(true);
      const snapshot = await b.evaluate(async () => {
        const w = window as any;
        const cache = await w._sessionCacheGet();
        const wards = [];
        for (const x of cache.wards) wards.push((await w.decryptJSONWithKey(x.enc, null)).wardName);
        const guardian = await w.decryptJSONWithKey(cache.guardian, null);
        return { securityMode: cache.securityMode, wards, guardianKeys: Object.keys(guardian).sort() };
      });
      expect(snapshot).toEqual({ securityMode: 'none', wards: names, guardianKeys: ['guardianEmail', 'guardianName'] });
      await context.close();
    });
  });
}

/** Keys and value shapes, not values: what another version must be able to read. */
async function sharedStorageShape(page: Page) {
  return page.evaluate(async () => {
    const shape = (v: any): any => Array.isArray(v) ? [v.length ? shape(v[0]) : null]
      : v && typeof v === 'object' ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, shape(v[k])])) : typeof v;
    const LITERAL = new Set(['pg.termsAccepted', 'pg-theme-v1', 'pg-default-circuit', 'pg-tab-warning-dismissed-v1']);
    const store = (s: Storage) => Object.fromEntries(Object.keys(s).filter((k) => k.startsWith('pg')).sort().map((k) => {
      const raw = s.getItem(k) as string;
      if (LITERAL.has(k)) return [k, raw];
      try { return [k, shape(JSON.parse(raw))]; } catch { return [k, 'string']; }
    }));
    const databases = [];
    for (const info of (await indexedDB.databases()).filter((d) => d.name && d.name.startsWith('pg-')).sort((x, y) => String(x.name).localeCompare(String(y.name)))) {
      const db: IDBDatabase = await new Promise((resolve, reject) => { const r = indexedDB.open(info.name as string); r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error); });
      const stores: Record<string, unknown> = {};
      for (const name of [...db.objectStoreNames].sort()) {
        const entries: [IDBValidKey[], unknown[]] = await new Promise((resolve) => {
          const os = db.transaction(name, 'readonly').objectStore(name);
          const keys = os.getAllKeys();
          keys.onsuccess = () => { const vals = os.getAll(); vals.onsuccess = () => resolve([keys.result, vals.result]); };
        });
        stores[name] = Object.fromEntries(entries[0].map((k, i) => [String(k), shape(entries[1][i])]).sort(([p], [q]) => p.localeCompare(q)));
      }
      databases.push({ name: info.name, version: db.version, stores });
      db.close();
    }
    const w = window as any;
    const held = ((await navigator.locks.query()).held || []).map((l: any) => String(l.name).replace(w.caseFile.activeWardId, '<filing id>')).sort();
    return { localStorage: store(localStorage), sessionStorage: store(sessionStorage), indexedDB: databases, webLocksHeld: held, tabMessage: w.__tabMessageShape || null };
  });
}

test('both versions write the same shape into everything they share', async ({ browser }) => {
  test.setTimeout(120_000);
  const shapes: Record<string, unknown> = {};
  for (const v of ['old', 'new'] as Version[]) {
    const context = await browser.newContext();
    // An observer on the same origin -- a blank not-found page, so it does not
    // join in as a tab itself -- records the shape of the tab message the
    // session tab broadcasts.
    const observer = await context.newPage();
    await observer.goto(`http://localhost:${PORT}/${v}/__observer__`);
    await observer.evaluate(() => {
      const shape = (x: any): any => Array.isArray(x) ? [x.length ? shape(x[0]) : null]
        : x && typeof x === 'object' ? Object.fromEntries(Object.keys(x).sort().map((k) => [k, shape(x[k])])) : typeof x;
      const channel = new BroadcastChannel('probate-guardian-tabs');
      (window as any).__seen = [];
      channel.onmessage = (e) => { if (e.data && e.data.hasActiveCase) (window as any).__seen.push(shape(e.data)); };
    });
    const page = await newTab(browser, context, v, { acceptTerms: false });
    await page.locator('#pg-terms-overlay.show').waitFor({ state: 'visible' });
    await page.check('#pg-terms-agree');
    await page.click('#pg-terms-continue');
    await openFixture(page);
    await page.locator('#sidebar-circuit-select').selectOption('13');
    await page.locator('#theme-toggle-btn').click();
    expect(await openFiling(page, await firstFilingId(page))).not.toBe(false);
    await page.evaluate(() => (window as any).navigate('/print'));
    expect(await page.evaluate(() => (window as any).saveSessionRestoreCache())).toBe(true);
    await expect.poll(() => observer.evaluate(() => (window as any).__seen.length), { timeout: 15_000 }).toBeGreaterThan(0);
    const tabMessage = await observer.evaluate(() => (window as any).__seen[(window as any).__seen.length - 1]);
    await page.evaluate((m) => { (window as any).__tabMessageShape = m; }, tabMessage);
    shapes[v] = await sharedStorageShape(page);
    await context.close();
  }
  expect(shapes.new, 'the new version writes exactly what the old one does').toEqual(shapes.old);

  const record = { note: '', oldVersion: OLD_SHA, shape: shapes.old };
  const golden = fs.existsSync(GOLDEN) ? JSON.parse(fs.readFileSync(GOLDEN, 'utf8')) : null;
  if (UPDATE) {
    record.note = 'Milestone 70, 70A: the shape of everything two versions of Guardian Forms share in one browser (localStorage, sessionStorage, IndexedDB, the tab message, the filing lock name), written by tests/e2e/mixed-version.characterization.spec.ts; both versions must match it. Regenerate only for a deliberate, recorded change.';
    fs.writeFileSync(GOLDEN, JSON.stringify(record, null, 1) + '\n');
  }
  expect(shapes.new, 'against the golden').toEqual((golden || record).shape);
});
