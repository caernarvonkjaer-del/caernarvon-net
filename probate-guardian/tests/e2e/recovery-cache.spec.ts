import { test, expect } from '@playwright/test';
import { gotoApp, startNewCase, chooseNoPassword, createWard } from './support/target';

// SESSION-RESTORE CACHE (index.html): saveData() writes a temporary
// IndexedDB snapshot (pg-session-cache) whenever there are unsaved changes;
// checkSessionRestoreCacheAtLaunch() offers to restore it via a native
// confirm() on the next launch, before the normal startup-choice screen
// ever shows; a successful .sav export clears it. IndexedDB persists across
// page.goto() calls within the same browser context/origin, so "close and
// reopen" is simulated by calling gotoApp() again in the same test.
async function forceCacheWrite(page: import('@playwright/test').Page) {
  await page.evaluate(() => (window as any).flushPendingSave());
}

test.describe('recovery-cache (crash recovery)', () => {
  test('offers to restore unsaved work on next launch, and restores it', async ({ page }) => {
    await gotoApp(page);
    await startNewCase(page);
    await chooseNoPassword(page);
    await createWard(page, 'Never Saved Ward');
    await forceCacheWrite(page);

    page.on('dialog', (d) => d.accept()); // checkSessionRestoreCacheAtLaunch()'s confirm()
    await gotoApp(page);

    // Restore succeeds -> initApp() skips promptOpenOrStartAtLaunch() entirely.
    await expect(page.locator('#startup-choice-overlay')).not.toHaveClass(/show/);
    await expect(page.locator('#ward-selector')).toHaveValue('Never Saved Ward');
  });

  test('declining the offer discards the cache and starts fresh', async ({ page }) => {
    await gotoApp(page);
    await startNewCase(page);
    await chooseNoPassword(page);
    await createWard(page, 'Discarded Ward');
    await forceCacheWrite(page);

    // Two different native dialogs fire on this reload: the app's own
    // beforeunload guard (real unsaved changes exist -- accept it, i.e.
    // "yes, leave"), then checkSessionRestoreCacheAtLaunch()'s confirm()
    // (decline the restore offer itself).
    page.on('dialog', (d) => (d.type() === 'beforeunload' ? d.accept() : d.dismiss()));
    await gotoApp(page);

    // Declined -> cache cleared -> falls through to the normal startup screen.
    await expect(page.locator('#startup-choice-overlay')).toHaveClass(/show/);
  });

  test('a successful .sav save clears the cache so the offer does not repeat', async ({ page }) => {
    await gotoApp(page);
    await startNewCase(page);
    await chooseNoPassword(page);
    await createWard(page, 'Saved Ward');
    await forceCacheWrite(page);

    page.once('dialog', (d) => d.accept());
    await page.evaluate(() => { void (window as any).exportGuardianDataZip(); });
    // exportGuardianDataZip() saves via the download fallback, then clears
    // the recovery cache (index.html:4094) -- no need to capture the file
    // itself for this test, just that the export completed.
    await page.waitForEvent('download');

    await gotoApp(page);
    await expect(page.locator('#startup-choice-overlay')).toHaveClass(/show/); // no restore offer this time
  });
});
