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

  test('Save Controls has Save Backup and Open Backup buttons with correct attributes', async ({ browser }) => {
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

      const openBackupBtn = page.locator('button[data-shell-action="open-backup-sav"]');
      await expect(openBackupBtn).toBeVisible();
      await expect(openBackupBtn).toHaveText(/Open Backup \(\.sav\)/);

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
        await (window as any).addWard('Backup Ward Beta', 'simplified');
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
        await (window as any).addWard('Restored Beta', 'annual');
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
      const wardCount = await page.evaluate(() => (window as any).caseFile.wards.length);
      const wardNames = await page.evaluate(() => (window as any).caseFile.wards.map((w: any) => w.wardName));

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
        await (window as any).addWard('Secret Ward 2', 'guardian');
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

      const wardNames = await page.evaluate(() => (window as any).caseFile.wards.map((w: any) => w.wardName));
      expect(wardNames).toContain('Secret Ward 1');
      expect(wardNames).toContain('Secret Ward 2');
    } finally {
      await context2.close();
    }
  });

  test('Open Backup merges a case file that happens to contain just one ward', async ({ browser }) => {
    // Under the unified case-file model there is no separate "single-ward"
    // file shape to special-case -- a case file with one ward (e.g. from
    // Save Data File) and one with many (Backup All Wards) are the exact
    // same manifest format, so Open Backup treats them identically.
    const context1 = await browser.newContext();
    let singleWardPath = '';
    try {
      const page = await context1.newPage();
      await gotoApp(page);
      await startNewCase(page);
      await chooseNoPassword(page);
      await createWard(page, 'Single Ward Solo');

      await ensureSaveControlsOpen(page);
      const saveWardBtn = page.locator('button[data-shell-action="backup-all-wards"]');
      const res = await captureDownload(page, async () => {
        await saveWardBtn.click();
      });
      singleWardPath = res.path;
    } finally {
      await context1.close();
    }

    const context2 = await browser.newContext();
    try {
      const page = await context2.newPage();
      await gotoApp(page);
      await startNewCase(page);
      await chooseNoPassword(page);
      await createWard(page, 'Host Ward');

      const dialogs = autoAcceptDynDialogs(page);

      await page.setInputFiles('#backup-import-input', singleWardPath);
      // pg:backup-restored fires before the completion alert(), so waiting on
      // it risks checking dialogs.messages before the 2nd dialog is recorded --
      // poll the exact value under test instead.
      await expect.poll(() => dialogs.messages.length).toBe(2);
      dialogs.stop();

      // One confirmation dialog, then the completion alert -- same flow as
      // restoring a many-ward backup, just with "1 ward(s)".
      expect(dialogs.messages[0]).toContain('Restore backup containing 1 ward(s)');
      expect(dialogs.messages[1]).toContain('Backup restored');

      // Both the pre-existing host ward and the merged one are present.
      const wardNames = await page.evaluate(() => (window as any).caseFile.wards.map((w: any) => w.wardName));
      expect(wardNames).toContain('Host Ward');
      expect(wardNames).toContain('Single Ward Solo');
    } finally {
      await context2.close();
    }
  });

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
        (window as any).D.caseNumber = 'CASE-SAVED-IN-BACKUP';
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
      await page.waitForFunction(() => ((window as any).caseFile?.wards || []).length === 1, { timeout: 10_000 });
      await expect.poll(() => dialogs.messages.length).toBe(2);
      expect(await page.evaluate(() => (window as any).caseFile.activeWardId)).toBe(null);

      await page.evaluate(() => (window as any).switchWard((window as any).caseFile.wards[0].wardId));
      const caseNum1 = await page.evaluate(() => (window as any).D?.caseNumber);
      expect(caseNum1).toBe('CASE-SAVED-IN-BACKUP');

      // Now simulate active in-memory modifications on window.D
      await page.evaluate(() => {
        (window as any).D.caseNumber = 'CASE-BEFORE-RESTORE';
      });
      const modifiedCaseNum = await page.evaluate(() => (window as any).D?.caseNumber);
      expect(modifiedCaseNum).toBe('CASE-BEFORE-RESTORE');

      // Re-restore the backup. Focus is released and window.D cleared, so the
      // stale 'CASE-BEFORE-RESTORE' edit must be gone rather than lingering on
      // a detached ward object.
      await page.setInputFiles('#backup-import-input', backupPath);
      // Wait on window.D actually being cleared, not on activeWardId: restore
      // nulls focus synchronously but window.D is cleared by the dashboard
      // entry it navigates to, so waiting on the flag races that navigation.
      await page.waitForFunction(
        () => Object.keys((window as any).D || {}).length === 0,
        { timeout: 10_000 }
      );
      await expect.poll(() => dialogs.messages.length).toBe(4);
      expect(await page.evaluate(() => (window as any).D?.caseNumber)).toBeUndefined();

      // Opening it again yields the backup's data, not the discarded edit.
      await page.evaluate(() => (window as any).switchWard((window as any).caseFile.wards[0].wardId));
      const reboundCaseNum = await page.evaluate(() => (window as any).D?.caseNumber);
      expect(reboundCaseNum).toBe('CASE-SAVED-IN-BACKUP');
      dialogs.stop();
    } finally {
      await context2.close();
    }
  });

  // Milestone 38C: restore itself no longer calls switchWard/activateWard, so
  // contention is no longer reached by restoring -- it is reached when the user
  // explicitly opens the ward afterwards. The lock behaviour under contention
  // is the part worth covering and is unchanged.
  test('after Open Backup, explicitly opening a ward respects cross-tab lock contention', async ({ browser }) => {
    // Same exclusion ward-lock.spec.ts's own describe-level guard already
    // documents: src/core/ward-lock.js explicitly bypasses the Web Locks API
    // on file:// origins, which is how the portable target is served.
    skipExpectedTargetExclusion(currentTarget === 'portable', 'Web Locks API is bypassed on file:// protocol (src/core/ward-lock.js), which is how the portable target is served');
    const context = await browser.newContext();
    try {
      const tab1 = await context.newPage();
      await gotoApp(tab1);
      await startNewCase(tab1);
      await chooseNoPassword(tab1);
      await createWard(tab1, 'Lock Contention Ward');

      const targetWardId = await tab1.evaluate(() => (window as any).caseFile.activeWardId);
      expect(targetWardId).toBeTruthy();

      await ensureSaveControlsOpen(tab1);

      // Export backup containing this ward
      const res = await captureDownload(tab1, async () => {
        await tab1.click('button[data-shell-action="backup-all-wards"]');
      });
      const backupPath = res.path;

      // Verify Tab 1 holds the lock
      const tab1Locks = await tab1.evaluate(async () => (await navigator.locks.query()).held?.map(l => l.name) || []);
      expect(tab1Locks).toContain(`pg-ward-${targetWardId}`);

      // Tab 1's ward creation autosaved a session-restore snapshot to their
      // shared (same-origin) pg-session-cache IndexedDB database, since the
      // File System Access API's real handle-based export (the one branch
      // that clears it) is force-disabled for every test target -- left in
      // place, Tab 2's own boot would find it and show a "restore previous
      // session?" confirmModal() before it ever reaches the startup-choice
      // screen startNewCase() expects, well before this test's own dialog
      // watcher is armed for what it actually came here to test. A real
      // successful Save-As clears this same cache (see exportCaseFileZip()),
      // so this is exactly that cleanup, done explicitly since the fallback
      // download path this suite exercises doesn't get to do it itself.
      await tab1.evaluate(async () => {
        await (window as any).clearSessionRestoreCache();
        (window as any)._dirtySinceExport = false;
      });

      // Now open Tab 2 in the same browser context (shares that same
      // IndexedDB, hence the cleanup above, and the Web Locks API manager
      // this test is actually about).
      const tab2 = await context.newPage();
      await gotoApp(tab2);
      await startNewCase(tab2);
      await chooseNoPassword(tab2);
      // Tab 2 starts fresh with no existing wards

      const tab2Dialogs = autoAcceptDynDialogs(tab2);

      // Restore the backup in Tab 2. This loads the ward but opens nothing.
      await tab2.setInputFiles('#backup-import-input', backupPath);
      await tab2.waitForFunction(() => ((window as any).caseFile?.wards || []).length >= 1, { timeout: 10_000 });
      expect(await tab2.evaluate(() => (window as any).caseFile.activeWardId)).toBe(null);
      // Two dialogs (restore confirm, then the trailing completion alert)
      // -- wait for both before proceeding, same reasoning as the other
      // restore flows above.
      await expect.poll(() => tab2Dialogs.messages.length).toBe(2);
      tab2Dialogs.stop();

      // The user then chooses Edit, which is where contention now surfaces.
      await tab2.evaluate((id) => (window as any).switchWard(id), targetWardId);

      // switchWard -> activateWard hit contention and triggered ward locked modal on Tab 2.
      // expect(...).toBeVisible() already auto-retries precisely on this element;
      // a fixed wait beforehand would be pure redundancy on top of it.
      const lockedModal = tab2.locator('#ward-locked-overlay');
      await expect(lockedModal).toBeVisible();

      // Tab 2 must not hold the lock on targetWardId
      const tab2HeldId = await tab2.evaluate(() => (window as any).getCurrentLockedWardId());
      expect(tab2HeldId).toBe(null);

      // Tab 1 must still hold the lock on targetWardId
      const tab1HeldId = await tab1.evaluate(() => (window as any).getCurrentLockedWardId());
      expect(tab1HeldId).toBe(targetWardId);
    } finally {
      await context.close();
    }
  });

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
        const { blob } = await (window as any).buildCaseFileBlob();
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
        await (window as any).rememberCaseFileHandle(mockHandle);
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

});

