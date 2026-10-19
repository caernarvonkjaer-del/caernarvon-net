import { test, expect } from '@playwright/test';
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs/promises';
import JSZip from 'jszip';
import {
  gotoApp,
  startNewCase,
  chooseNoPassword,
  chooseEncrypted,
  createWard,
  acceptDynDialog,
  autoAcceptDynDialogs,
} from './support/target';
import { currentTarget, skipExpectedTargetExclusion } from './support/target-profile';

async function ensureSaveControlsOpen(page: import('@playwright/test').Page) {
  const saveToggleBtn = page.locator('#save-controls-toggle-btn');
  if (await saveToggleBtn.isVisible()) {
    const text = await saveToggleBtn.textContent();
    if (text && text.includes('Show')) {
      await saveToggleBtn.click();
    }
  }
}

// importSavArchiveOrWard() (src/core/persistence/case-file.js) dispatches
// this once caseFile.wards is fully merged, before its own completion
// alert() -- registered as a page-side promise before the triggering
// setInputFiles() call, same idiom this file's own pg:backup-saved usage
// in verified-inventory-workflow.spec.ts already establishes.
function waitForBackupRestored(page: import('@playwright/test').Page) {
  return page.evaluate(() => new Promise((resolve) => {
    window.addEventListener('pg:backup-restored', (e) => resolve((e as CustomEvent).detail), { once: true });
  }));
}

// Milestone 50G: exportCaseFileZip()/saveBackupNow() trigger the download
// (synchronously, inside saveBlobAs()'s fallback <a> click -- the File
// System Access API is force-disabled for every test target, see this
// file's own header comment) and only afterwards show a trailing
// "Backup complete"/"Backup saved" alertModal(), so the two are waited on
// in that same order here rather than a single native `dialog` listener
// armed before the trigger.
async function captureDownload(page: import('@playwright/test').Page, trigger: () => Promise<void>) {
  const downloadPromise = page.waitForEvent('download');
  await trigger();
  const download = await downloadPromise;
  await acceptDynDialog(page);
  const savePath = path.join(os.tmpdir(), `pg-test-${Date.now()}-${Math.random().toString(36).slice(2)}.sav`);
  await download.saveAs(savePath);
  return { path: savePath, filename: download.suggestedFilename() };
}

test.describe('Milestone 18: Multi-Ward Backup & Save Controls Restore', { tag: '@origin-state' }, () => {

  // Milestone 76D (decision 76D-1): Open Backup became two actions -- Open
  // Case File (switch cases) and Restore from Backup (merge, filing by filing).
  test('Save Controls has Save Backup, Open Case File and Restore from Backup buttons with correct attributes', async ({ browser }) => {
    const context = await browser.newContext();
    try {
      const page = await context.newPage();
      await gotoApp(page);
      await startNewCase(page);
      await chooseNoPassword(page);
      await createWard(page, 'Test Ward 1');

      await ensureSaveControlsOpen(page);

      const backupAllBtn = page.locator('button[data-shell-action="backup-all-wards"]');
      await expect(backupAllBtn).toBeVisible();
      await expect(backupAllBtn).toHaveText(/Save Backup \(\.sav\)/);

      await expect(page.locator('button[data-shell-action="open-backup-sav"]')).toHaveCount(0);
      const openCaseBtn = page.locator('button[data-shell-action="open-case-file"]');
      await expect(openCaseBtn).toBeVisible();
      await expect(openCaseBtn).toHaveText(/Open Case File \(\.sav\)/);
      const restoreBtn = page.locator('button[data-shell-action="restore-backup-sav"]');
      await expect(restoreBtn).toBeVisible();
      await expect(restoreBtn).toHaveText(/Restore from Backup \(\.sav\)/);

      const backupInput = page.locator('#backup-import-input');
      await expect(backupInput).toHaveAttribute('type', 'file');
      await expect(backupInput).toHaveAttribute('accept', '.sav,.zip');
    } finally {
      await context.close();
    }
  });

  test('Save Backup exports a valid multi-ward archive containing all wards and self-contained audit log', async ({ browser }) => {
    const context = await browser.newContext();
    try {
      const page = await context.newPage();
      await gotoApp(page);
      await startNewCase(page);
      await chooseNoPassword(page);
      await createWard(page, 'Backup Ward Alpha');

      // Add a second ward
      await page.evaluate(async () => {
        (window as any).alert = () => {};
        await (window as any).GuardianForms.testing.createFiling.add('Backup Ward Beta', 'simplified');
      });

      await ensureSaveControlsOpen(page);

      // Click "Backup All Wards (.sav)" and capture download
      const backupAllBtn = page.locator('button[data-shell-action="backup-all-wards"]');
      const { path: backupPath, filename } = await captureDownload(page, async () => {
        await backupAllBtn.click();
      });
      expect(filename).toBe('guardianshipwarddata.sav');

      // Inspect exported ZIP file
      const buffer = await fs.readFile(backupPath);
      const zip = await JSZip.loadAsync(buffer);

      // Verify manifest.json matches the unified case-file format
      const manifestFile = zip.file('manifest.json');
      expect(manifestFile).toBeTruthy();
      const manifest = JSON.parse(await manifestFile!.async('string'));
      expect(manifest.format).toBe('probate-guardian-case');
      expect(manifest.version).toBe(1);
      expect(manifest.wards.length).toBe(2);

      // Verify auditLog.enc contains self-contained export record
      const auditFile = zip.file('auditLog.enc');
      expect(auditFile).toBeTruthy();
      const auditContent = await auditFile!.async('string');
      const entries = JSON.parse(auditContent.replace(/^PLAIN:/, ''));
      const exportEntry = entries.find((e: any) => e.eventType === 'DATA_EXPORT' && e.details.includes('Exported 2 form(s) to backup file'));
      expect(exportEntry).toBeTruthy();
    } finally {
      await context.close();
    }
  });

  test('Open Backup (.sav) in a clean session restores all wards and sets active state', async ({ browser }) => {
    const context1 = await browser.newContext();
    let backupPath = '';
    try {
      const page = await context1.newPage();
      await gotoApp(page);
      await startNewCase(page);
      await chooseNoPassword(page);
      await createWard(page, 'Restored Alpha');

      await page.evaluate(async () => {
        (window as any).alert = () => {};
        await (window as any).GuardianForms.testing.createFiling.add('Restored Beta', 'annual');
      });

      await ensureSaveControlsOpen(page);
      const backupAllBtn = page.locator('button[data-shell-action="backup-all-wards"]');
      const res = await captureDownload(page, async () => {
        await backupAllBtn.click();
      });
      backupPath = res.path;
    } finally {
      await context1.close();
    }

    // New context representing a fresh launch / separate session
    const context2 = await browser.newContext();
    try {
      const page = await context2.newPage();
      await gotoApp(page);
      await startNewCase(page);
      await chooseNoPassword(page);
      await createWard(page, 'Temporary Ward');

      // Auto-accept confirm and alert dialogs
      const dialogs = autoAcceptDynDialogs(page);

      // Trigger Open Backup (.sav) using the file input
      const restoredPromise = waitForBackupRestored(page);
      await page.setInputFiles('#backup-import-input', backupPath);
      await restoredPromise;
      // pg:backup-restored fires before the trailing "Backup restored"
      // alertModal(), so wait for that second dialog to actually be
      // accepted too before stopping the watcher -- otherwise it can be
      // left open, overlapping whatever the test does next.
      await expect.poll(() => dialogs.messages.length).toBe(2);
      dialogs.stop();

      // Verify wards are restored
      const wardCount = await page.evaluate(() => (window as any).GuardianForms.testing.snapshot().caseFile.wards.length);
      const wardNames = await page.evaluate(() => (window as any).GuardianForms.testing.snapshot().caseFile.wards.map((w: any) => w.wardName));

      expect(wardNames).toContain('Restored Alpha');
      expect(wardNames).toContain('Restored Beta');
      expect(wardCount).toBeGreaterThanOrEqual(2);
    } finally {
      await context2.close();
    }
  });

  test('Encrypted backup round-trips with master password verification', async ({ browser }) => {
    const context1 = await browser.newContext();
    let backupPath = '';
    const masterPassword = 'CorrectMasterPass123!';

    try {
      const page = await context1.newPage();
      await gotoApp(page);
      await startNewCase(page);
      await chooseEncrypted(page, masterPassword);
      await createWard(page, 'Secret Ward 1');

      await page.evaluate(async () => {
        (window as any).alert = () => {};
        await (window as any).GuardianForms.testing.createFiling.add('Secret Ward 2', 'guardian');
      });

      await ensureSaveControlsOpen(page);
      const backupAllBtn = page.locator('button[data-shell-action="backup-all-wards"]');
      const res = await captureDownload(page, async () => {
        await backupAllBtn.click();
      });
      backupPath = res.path;
    } finally {
      await context1.close();
    }

    // Open in another context with same encrypted session
    const context2 = await browser.newContext();
    try {
      const page = await context2.newPage();
      await gotoApp(page);
      await startNewCase(page);
      await chooseEncrypted(page, masterPassword);
      await createWard(page, 'Scratch Ward');

      const dialogs = autoAcceptDynDialogs(page, { promptValue: masterPassword });

      const restoredPromise = waitForBackupRestored(page);
      await page.setInputFiles('#backup-import-input', backupPath);
      await restoredPromise;
      // Three dialogs in this encrypted flow: the restore confirm, the
      // master-password prompt, then the trailing "Backup restored" alert.
      await expect.poll(() => dialogs.messages.length).toBe(3);
      dialogs.stop();

      const wardNames = await page.evaluate(() => (window as any).GuardianForms.testing.snapshot().caseFile.wards.map((w: any) => w.wardName));
      expect(wardNames).toContain('Secret Ward 1');
      expect(wardNames).toContain('Secret Ward 2');
    } finally {
      await context2.close();
    }
  });

  // 'Open Backup merges a case file that happens to contain just one ward'
  // ran here until TEST-REVIEW.md Delivery 1M (2026-10-13): its own note
  // said a one-ward file is the same manifest and flow as the multi-ward
  // restore above.

  // Milestone 38C renamed the hazard rather than removing it. Restore no longer
  // rebinds window.D to the restored ward, because it no longer opens any ward
  // at all -- it clears focus and lands on the dashboard. What still must not
  // happen is window.D retaining the pre-restore in-memory edit, so that is
  // what this now asserts, followed by an explicit Edit to prove the restored
  // data is what a subsequent open yields.
  test('Open Backup replacing actively open ward leaves no stale window.D, and an explicit Edit yields the restored data', async ({ browser }) => {
    const context1 = await browser.newContext();
    let backupPath = '';
    try {
      const page = await context1.newPage();
      await gotoApp(page);
      await startNewCase(page);
      await chooseNoPassword(page);
      await createWard(page, 'Rebind Target Ward');

      // Set a recognizable case number
      await page.evaluate(() => {
        (window as any).GuardianForms.testing.patchFiling({ 'caseNumber': 'CASE-SAVED-IN-BACKUP' });
      });

      await ensureSaveControlsOpen(page);
      const backupAllBtn = page.locator('button[data-shell-action="backup-all-wards"]');
      const res = await captureDownload(page, async () => {
        await backupAllBtn.click();
      });
      backupPath = res.path;
    } finally {
      await context1.close();
    }

    const context2 = await browser.newContext();
    try {
      const page = await context2.newPage();
      await gotoApp(page);
      await startNewCase(page);
      await chooseNoPassword(page);

      // Stays armed for both restores this test drives further down. Its
      // background poll loop competes for the same page/CDP session as this
      // test's own foreground evaluates/waitForFunctions, so each restore's
      // pair of dialogs (confirm, then a trailing alert once the whole
      // import finishes) is explicitly waited out to completion via
      // dialogs.messages before doing anything else with the page --
      // otherwise the watcher can be starved indefinitely by the
      // uninterrupted foreground activity right after it, exactly the
      // failure this comment is here to prevent from silently reappearing.
      const dialogs = autoAcceptDynDialogs(page);

      // First restore the backup to load the ward. Restore does not open it,
      // so reaching the data requires an explicit switch.
      await page.setInputFiles('#backup-import-input', backupPath);
      await page.waitForFunction(() => ((window as any).GuardianForms.testing.snapshot().caseFile?.wards || []).length === 1, { timeout: 10_000 });
      await expect.poll(() => dialogs.messages.length).toBe(2);
      expect(await page.evaluate(() => (window as any).GuardianForms.testing.snapshot().caseFile.activeWardId)).toBe(null);

      await page.evaluate(() => (() => { const tt = (window as any).GuardianForms.testing; return tt.activateFiling.open(tt.snapshot().caseFile.wards[0].wardId); })());
      const caseNum1 = await page.evaluate(() => (window as any).GuardianForms.testing.snapshot().filing?.caseNumber);
      expect(caseNum1).toBe('CASE-SAVED-IN-BACKUP');

      // Now simulate active in-memory modifications on window.D
      await page.evaluate(() => {
        (window as any).GuardianForms.testing.patchFiling({ 'caseNumber': 'CASE-BEFORE-RESTORE' });
      });
      const modifiedCaseNum = await page.evaluate(() => (window as any).GuardianForms.testing.snapshot().filing?.caseNumber);
      expect(modifiedCaseNum).toBe('CASE-BEFORE-RESTORE');

      // Re-restore the backup. Focus is released and window.D cleared, so the
      // stale 'CASE-BEFORE-RESTORE' edit must be gone rather than lingering on
      // a detached ward object.
      await page.setInputFiles('#backup-import-input', backupPath);
      // Wait on window.D actually being cleared, not on activeWardId: restore
      // nulls focus synchronously but window.D is cleared by the dashboard
      // entry it navigates to, so waiting on the flag races that navigation.
      await page.waitForFunction(
        () => Object.keys((window as any).GuardianForms.testing.snapshot().filing || {}).length === 0,
        { timeout: 10_000 }
      );
      await expect.poll(() => dialogs.messages.length).toBe(4);
      expect(await page.evaluate(() => (window as any).GuardianForms.testing.snapshot().filing?.caseNumber)).toBeUndefined();

      // Opening it again yields the backup's data, not the discarded edit.
      await page.evaluate(() => (() => { const tt = (window as any).GuardianForms.testing; return tt.activateFiling.open(tt.snapshot().caseFile.wards[0].wardId); })());
      const reboundCaseNum = await page.evaluate(() => (window as any).GuardianForms.testing.snapshot().filing?.caseNumber);
      expect(reboundCaseNum).toBe('CASE-SAVED-IN-BACKUP');
      dialogs.stop();
    } finally {
      await context2.close();
    }
  });

  // 'after Open Backup, explicitly opening a ward respects cross-tab lock
  // contention' ran here until TEST-REVIEW.md Delivery 1M (2026-10-13):
  // its own note said contention is reached on the explicit open and
  // unchanged by the restore, and ward-lock.spec.ts proves that handover.

  // Milestone 41B, Step 6: the one real behavioral change introduced by
  // re-pointing Save Backup at saveBackupNow() -- a second click, once a
  // file handle exists from an earlier grant, silently rewrites instead of
  // repeating the Save-As prompt. Every other test in this file exercises a
  // fresh browser.newContext() with no prior save, so saveBackupNow()'s own
  // loadCaseFileHandle() always comes back empty and every click falls
  // through to the identical exportCaseFileZip() download path -- this is
  // the one path with zero coverage in either direction before this test.
  // Playwright cannot drive the real native showSaveFilePicker dialog, so a
  // mock FileSystemFileHandle is armed directly via rememberCaseFileHandle()
  // -- the same idiom case-file-protection.spec.ts already established for
  // exercising this branch.
  test('Save Backup rewrites silently, with no repeat Save-As dialog, once a case file handle already exists', async ({ browser }) => {
    const context = await browser.newContext();
    try {
      const page = await context.newPage();
      await gotoApp(page);
      await startNewCase(page);
      await chooseNoPassword(page);
      await createWard(page, 'Handle Reuse Ward');
      await ensureSaveControlsOpen(page);

      // First click, no handle yet: today's exact "Save-As" behavior.
      const backupAllBtn = page.locator('button[data-shell-action="backup-all-wards"]');
      await captureDownload(page, async () => {
        await backupAllBtn.click();
      });

      // Arm a mock handle, as if the picker above had just granted one.
      await page.evaluate(async () => {
        const blob = await (window as any).GuardianForms.testing.exportArchive.caseFile();
        const mockHandle = {
          name: 'case-file.sav',
          writeCallCount: 0,
          queryPermission: async () => 'granted',
          requestPermission: async () => 'granted',
          getFile: async () => new File([blob], 'case-file.sav', { type: 'application/octet-stream' }),
          createWritable: async () => ({
            write: async () => { (window as any).__mockHandleWriteCount = ((window as any).__mockHandleWriteCount || 0) + 1; },
            close: async () => {},
          }),
        };
        await (window as any).GuardianForms.testing.launchState.rememberHandle(mockHandle);
      });

      // Second click: expect a silent rewrite -- no second download event --
      // and the alert() path saveBackupNow() takes on success. The first
      // click's own handler collapses the save-controls panel, so it must
      // be reopened before the button is clickable again.
      await ensureSaveControlsOpen(page);
      let downloadFired = false;
      page.once('download', () => { downloadFired = true; });
      await backupAllBtn.click();
      await page.waitForFunction(() => (window as any).__mockHandleWriteCount === 1, { timeout: 5000 });
      const alertMessage = await acceptDynDialog(page);

      expect(downloadFired).toBe(false);
      expect(alertMessage).toBe('Backup saved.');
    } finally {
      await context.close();
    }
  });

  // Milestone 76D (decision 76D-1): Open Case File switches cases. With
  // unsaved changes it can't write, it asks first ("Go back" keeps the case
  // open); then it closes the case to the start screen -- nothing remembered,
  // so the other file is chosen there and opens with its own password.
  test('Open Case File asks before losing unsaved changes, then closes the case to the start screen', async ({ browser }) => {
    const context = await browser.newContext();
    try {
      const page = await context.newPage();
      await gotoApp(page);
      await startNewCase(page);
      await chooseNoPassword(page);
      await createWard(page, 'Switch Away Ward');
      await page.evaluate(() => (window as any).GuardianForms.testing.save.markDirty());
      await ensureSaveControlsOpen(page);
      const openCase = page.locator('button[data-shell-action="open-case-file"]');
      const box = page.locator('.modal-overlay[id^="dyn-dialog-"].show .modal-box');

      await openCase.click();
      await expect(box.locator('.modal-box-intro')).toContainText('changes that are not saved to its file');
      await box.locator('[data-dyn-action="cancel"]').click();
      await expect(page.locator('#startup-choice-overlay.show')).toHaveCount(0);
      expect(await page.evaluate(() => (window as any).GuardianForms.testing.snapshot().caseFile.wards.length)).toBe(1);

      await ensureSaveControlsOpen(page);
      await openCase.click();
      await box.locator('[data-dyn-action="confirm"]').click();
      await page.locator('#startup-choice-overlay.show').waitFor({ state: 'visible' });
    } finally {
      await context.close();
    }
  });
});
