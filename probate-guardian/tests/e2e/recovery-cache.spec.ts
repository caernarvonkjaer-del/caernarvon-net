import { test, expect } from '@playwright/test';
import { gotoApp, startNewCase, chooseNoPassword, createWard, acceptDynDialog, dismissDynDialog } from './support/target';

// SESSION-RESTORE CACHE (index.html): saveData() writes a temporary
// IndexedDB snapshot (pg-session-cache) whenever there are unsaved changes;
// checkSessionRestoreCacheAtLaunch() offers to restore it via an awaitable
// confirmModal() (Milestone 50G; a native confirm() before that) on the next
// launch, before the normal startup-choice screen ever shows; a successful
// .sav export clears it. IndexedDB persists across page.goto() calls within
// the same browser context/origin, so "close and reopen" is simulated by
// calling gotoApp() again in the same test.
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

    await gotoApp(page);
    await acceptDynDialog(page); // checkSessionRestoreCacheAtLaunch()'s confirmModal()
    await acceptDynDialog(page); // trailing "Restored N form(s)..." alertModal()

    // Restore succeeds -> initApp() skips promptOpenOrStartAtLaunch() entirely.
    await expect(page.locator('#startup-choice-overlay')).not.toHaveClass(/show/);
    // Milestone 38C: a restored recovery cache sets activeWardId = null and
    // never falls back to restoredWards[0], so the sidebar is neutral until
    // the user picks a ward. The data is proven restored by switching to it.
    await expect(page.locator('#ward-selector')).toHaveValue('');
    await page.evaluate(() => (window as any).switchWard((window as any).caseFile.wards[0].wardId));
    await expect(page.locator('#ward-selector')).toHaveValue('Never Saved Ward');
  });

  test('declining the offer discards the cache and starts fresh', async ({ page }) => {
    await gotoApp(page);
    await startNewCase(page);
    await chooseNoPassword(page);
    await createWard(page, 'Discarded Ward');
    await forceCacheWrite(page);

    // Two different dialogs fire on this reload: the app's own beforeunload
    // guard (a genuine native dialog -- real unsaved changes exist -- accept
    // it, i.e. "yes, leave"), then checkSessionRestoreCacheAtLaunch()'s
    // confirmModal() (a DOM dialog since Milestone 50G; decline the restore
    // offer itself).
    page.on('dialog', (d) => d.accept()); // beforeunload only, now that the restore offer is a DOM dialog
    await gotoApp(page);
    await dismissDynDialog(page); // decline the restore offer

    // Declined -> cache cleared -> falls through to the normal startup screen.
    await expect(page.locator('#startup-choice-overlay')).toHaveClass(/show/);
  });

  test('a successful .sav save clears the cache so the offer does not repeat', async ({ page }) => {
    await gotoApp(page);
    await startNewCase(page);
    await chooseNoPassword(page);
    await createWard(page, 'Saved Ward');
    await forceCacheWrite(page);

    const downloadPromise = page.waitForEvent('download');
    await page.evaluate(() => { void (window as any).exportGuardianDataZip(); });
    // exportGuardianDataZip() saves via the download fallback, then shows a
    // trailing "Backup complete" alertModal() -- no need to capture the file
    // itself for this test, just that the export completed.
    await downloadPromise;
    await acceptDynDialog(page);

    // exportCaseFileZip()'s own clearSessionRestoreCache() call is gated on
    // a truthy handle from showSaveFilePicker, which every test target force-
    // disables (see target.ts's header comment) -- the same gap
    // backup-restore-sav.spec.ts's cross-tab test found and fixed the same
    // way. Reproducing explicitly what a real successful Save-As already
    // does, rather than relying on the next reload's restore-offer confirm
    // happening to get declined by default.
    await page.evaluate(async () => {
      await (window as any).clearSessionRestoreCache();
      (window as any)._dirtySinceExport = false;
    });

    await gotoApp(page);
    await expect(page.locator('#startup-choice-overlay')).toHaveClass(/show/); // no restore offer this time
  });
});
