import { test, expect } from '@playwright/test';
import { gotoApp, startNewCase, chooseNoPassword } from './support/target';
import { currentTargetProfile, skipExpectedTargetExclusion, skipEnvironmentLimitation } from './support/target-profile';

test.describe('startup', { tag: '@origin-state' }, () => {
  test('fresh install shows the startup-choice screen, no console errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));

    await gotoApp(page);

    await expect(page.locator('#startup-choice-overlay')).toHaveClass(/show/);
    await expect(page.locator('#startup-choice-overlay')).toContainText('Open Case File (.sav)');
    await expect(page.locator('#startup-choice-overlay')).toContainText('Start a New Case');
    await expect(page.locator('#startup-choice-overlay')).toContainText('your whole case lives in one .sav file');
    await expect(page.locator('#startup-newcase-btn')).toBeVisible();
    expect(errors).toEqual([]);
  });

  test('Start a New Case -> No Password reaches the inventory selector', async ({ page }) => {
    await gotoApp(page);
    await startNewCase(page);
    await chooseNoPassword(page);

    await expect(page.locator('#startup-choice-overlay')).not.toHaveClass(/show/);
    await expect(page.locator('#security-choice-overlay')).not.toHaveClass(/show/);
    // No wards exist yet, so renderPage('/dashboard') redirects to /inventory-select.
    await expect(page.locator('#main-content')).not.toBeEmpty();
    await expect(page).toHaveURL(/#\/inventory-select/);
  });

  test('Start a New Case -> Encrypted shows the create-password form', async ({ page }) => {
    await gotoApp(page);
    await startNewCase(page);
    await page.locator('#security-choice-overlay.show').waitFor({ state: 'visible' });
    await page.click('#security-choice-overlay [data-startup-action="select-security"][data-security-mode="encrypted"]');

    await expect(page.locator('#unlock-overlay')).toHaveClass(/show/);
    await expect(page.locator('#unlock-password-confirm')).toBeVisible(); // confirm row only shown when creating
  });

  test('a deleted remembered case file falls back without poisoning later launches', async ({ page, browserName }) => {
    // The "remembered file handle" launch-preference mechanism (pg-launch-pref)
    // stores a real FileSystemFileHandle, which requires the File System
    // Access API -- target-profile.ts's supportsFileSystemAccessAutomation
    // is already false for portable/file:// origins for exactly this reason
    // (they never get FSA pickers, regardless of automation). Confirmed by
    // running this profile for real: navigator.storage.getDirectory() throws
    // a SecurityError under file://, not a product bug.
    skipExpectedTargetExclusion(!currentTargetProfile?.supportsFileSystemAccessAutomation, 'the remembered-launch-file mechanism (pg-launch-pref, a FileSystemFileHandle) depends on the File System Access API, unsupported on file:// origins');
    // Confirmed by running the cross-browser smoke profile for real: this
    // test's own setup stores a real OPFS-derived FileSystemFileHandle into
    // IndexedDB via structured clone, then relies on the app's
    // forgetPersistedCaseFileHandle() deleting that key once the handle
    // proves unreadable. Firefox round-trips it as an empty object rather
    // than the app ever observing a failure to clean up after (the read-back
    // is `{}`, not the original handle nor `undefined`) -- the File System
    // Access API's persistence/permission extensions this depends on
    // (queryPermission and friends) are a Chromium-originated surface Firefox
    // doesn't implement the same way. A harness/API-support limitation, not
    // a product bug -- Edge is unaffected (same underlying Chromium engine).
    skipEnvironmentLimitation(browserName !== 'chromium', "Firefox's File System Access API support doesn't round-trip a persisted FileSystemFileHandle through IndexedDB the same way Chromium-based browsers do");
    await gotoApp(page);
    await page.evaluate(async () => {
      const root = await navigator.storage.getDirectory();
      const handle = await root.getFileHandle('deleted-remembered-case.sav', { create: true });
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open('pg-launch-pref', 1);
        request.onupgradeneeded = () => request.result.createObjectStore('flags');
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      await new Promise<void>((resolve, reject) => {
        const transaction = db.transaction('flags', 'readwrite');
        transaction.objectStore('flags').put(handle, 'zipFileHandle');
        transaction.objectStore('flags').put(true, 'hasOpenedBefore');
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
      });
      db.close();
      await root.removeEntry('deleted-remembered-case.sav');
    });

    await page.reload({ waitUntil: 'networkidle' });

    await expect(page.locator('#startup-choice-overlay')).toHaveClass(/show/);
    await expect(page.locator('#startup-file-status')).toContainText('could not be found');
    const launchPreferences = await page.evaluate(async () => {
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open('pg-launch-pref', 1);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      return new Promise((resolve) => {
        const transaction = db.transaction('flags', 'readonly');
        const store = transaction.objectStore('flags');
        const handleRequest = store.get('zipFileHandle');
        const openedRequest = store.get('hasOpenedBefore');
        transaction.oncomplete = () => {
          db.close();
          resolve({ rememberedHandle: handleRequest.result, hasOpenedBefore: openedRequest.result });
        };
      });
    });
    expect(launchPreferences).toEqual({ rememberedHandle: undefined, hasOpenedBefore: true });
  });

  test('an unresponsive remembered file handle times out', async ({ page }) => {
    await gotoApp(page);
    const result = await page.evaluate(async () => {
      const startedAt = performance.now();
      try {
        await (window as any).readRememberedFile({ getFile: () => new Promise(() => {}) }, 25);
        return { name: 'resolved', elapsed: performance.now() - startedAt };
      } catch (error) {
        return { name: error instanceof DOMException ? error.name : 'Error', elapsed: performance.now() - startedAt };
      }
    });
    expect(result.name).toBe('TimeoutError');
    expect(result.elapsed).toBeLessThan(1000);
  });
});
