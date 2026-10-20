import { test, expect } from '@playwright/test';
import { gotoApp, startNewCase, chooseNoPassword, createWard, exportAndCapture, acceptDynDialog } from './support/target';

// Milestone 57 review: reverted 57H's cross-session "Continue on This
// Device" restore, which kept a durable copy of case data (plaintext for
// unencrypted cases) sitting in IndexedDB indefinitely -- nothing cleared it
// after a successful save, and declining the old restore offer no longer
// discarded it either. See src/core/persistence/recovery-cache.js's file
// header for the two much narrower mechanisms that replaced it:
//  - pg-session-cache (IndexedDB): same-tab auto-lock recovery only, for a
//    case that has never been saved to a .sav file yet. Covered by
//    unlock.spec.ts (lock/unlock without ever exporting); this file only
//    proves a successful save clears it.
//  - pg-last-position (localStorage): no case data, just the last route and
//    ward id, so reopening a case can land back where the filer was instead
//    of always on the dashboard.

test.describe('recovery-cache (position memory + save clears the lock-recovery cache)', () => {
  // Milestone 76K item 4 (decision 76K-2, the requester's): the lock-recovery
  // snapshot is retired -- the lock keeps unsaved work sealed in the tab
  // (Milestone 76A) -- so an unsaved case writes no copy of itself here, and
  // a save deletes one an earlier version left behind.
  test('an unsaved case writes no copy to browser storage; a .sav save deletes one an earlier version left', async ({ page }) => {
    await gotoApp(page);
    await startNewCase(page);
    await chooseNoPassword(page);
    await createWard(page, 'Saved Ward');
    await page.evaluate(() => (window as any).GuardianForms.testing.save.flush());

    const cacheBefore = await page.evaluate(() => (window as any).GuardianForms.testing.persistenceState.sessionCache());
    expect(cacheBefore, 'no copy of the unsaved case').toBeNull();

    // Setup (D9): the copy an earlier version wrote, in its slot.
    await page.evaluate(() => new Promise<void>((resolve, reject) => {
      const open = indexedDB.open('pg-session-cache');
      open.onupgradeneeded = () => { if (!open.result.objectStoreNames.contains('snapshot')) open.result.createObjectStore('snapshot'); };
      open.onsuccess = () => {
        const tx = open.result.transaction('snapshot', 'readwrite');
        tx.objectStore('snapshot').put({ savedAt: 1, securityMode: 'none', wards: [{ wardId: 'old', enc: 'PLAIN:{}' }] }, 'current');
        tx.oncomplete = () => { open.result.close(); resolve(); };
        tx.onerror = () => reject(tx.error);
      };
      open.onerror = () => reject(open.error);
    }));
    expect(await page.evaluate(() => (window as any).GuardianForms.testing.persistenceState.sessionCache())).not.toBeNull();

    const downloadPromise = page.waitForEvent('download');
    await page.evaluate(() => { void (window as any).GuardianForms.testing.saveArchive.all(); });
    await downloadPromise;
    await acceptDynDialog(page); // "Backup complete" alertModal()

    const cacheAfter = await page.evaluate(() => (window as any).GuardianForms.testing.persistenceState.sessionCache());
    expect(cacheAfter).toBeNull();
  });

  test('reopening a .sav lands back on the last page and ward, not the dashboard', async ({ page }) => {
    await gotoApp(page);
    await startNewCase(page);
    await chooseNoPassword(page);
    await createWard(page, 'Position Ward', 'guardian');
    await page.evaluate(() => (window as any).GuardianForms.testing.navigate('/b1'));
    await expect.poll(() => page.evaluate(() => (window as any).GuardianForms.testing.snapshot().currentPage)).toBe('/b1');

    const savPath = await exportAndCapture(page);

    await gotoApp(page);
    await page.locator('#startup-choice-overlay.show').waitFor({ state: 'visible' });
    await page.setInputFiles('#startup-open-input', savPath);
    await expect(page.locator('#startup-choice-overlay')).not.toHaveClass(/show/);

    await expect.poll(() => page.evaluate(() => window.location.hash)).toBe('#/b1');
    await expect(page.locator('#ward-selector')).toHaveValue('Position Ward');
  });

  test('starting a new case forgets the remembered position', async ({ page }) => {
    await gotoApp(page);
    await startNewCase(page);
    await chooseNoPassword(page);
    await createWard(page, 'Old Ward', 'guardian');
    await page.evaluate(() => (window as any).GuardianForms.testing.navigate('/b1'));
    await expect.poll(() => page.evaluate(() => (window as any).GuardianForms.testing.snapshot().currentPage)).toBe('/b1');
    await expect.poll(() => page.evaluate(() => localStorage.getItem('pg-last-position'))).toBeTruthy();

    await gotoApp(page);
    await page.locator('#startup-choice-overlay.show').waitFor({ state: 'visible' });
    await page.click('[data-startup-action="start-new-ward"]');

    // Polled, not read once. startNewWardAtLaunch() (legacy-app.js) resolves
    // the startup choice, then `await`s forgetPersistedCaseFileHandle() before
    // it calls clearLastPosition() -- so the clear lands a tick or two after
    // the click, and a synchronous read here saw the previous session's
    // marker still in place. The feature works; the assertion was racing it.
    // Every other assertion in this test already polls; this one did not,
    // because the spec was hand-edited and never executed (the Milestone 57
    // review had no Chromium available -- see MILESTONE-57-REVIEW-HANDOFF.md).
    await expect.poll(() => page.evaluate(() => localStorage.getItem('pg-last-position'))).toBeNull();
  });
});
