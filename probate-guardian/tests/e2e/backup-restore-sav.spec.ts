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
  createWard
} from './support/target';

async function ensureSaveControlsOpen(page: import('@playwright/test').Page) {
  const saveToggleBtn = page.locator('#save-controls-toggle-btn');
  if (await saveToggleBtn.isVisible()) {
    const text = await saveToggleBtn.textContent();
    if (text && text.includes('Show')) {
      await saveToggleBtn.click();
    }
  }
}

async function captureDownload(page: import('@playwright/test').Page, trigger: () => Promise<void>) {
  const downloadPromise = page.waitForEvent('download');
  page.once('dialog', (d) => d.accept());
  await trigger();
  const download = await downloadPromise;
  const savePath = path.join(os.tmpdir(), `pg-test-${Date.now()}-${Math.random().toString(36).slice(2)}.sav`);
  await download.saveAs(savePath);
  return { path: savePath, filename: download.suggestedFilename() };
}

test.describe('Milestone 18: Multi-Ward Backup & Save Controls Restore', () => {

  test('Save Controls has Backup All Wards (.sav) and Open Backup (.sav) buttons with correct attributes', async ({ browser }) => {
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
      await expect(backupAllBtn).toHaveText(/Backup All Wards \(\.sav\)/);

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

  test('Backup All Wards (.sav) exports a valid multi-ward archive containing all wards and self-contained audit log', async ({ browser }) => {
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
      expect(filename).toBe('probate_guardian_all_wards_backup.sav');

      // Inspect exported ZIP file
      const buffer = await fs.readFile(backupPath);
      const zip = await JSZip.loadAsync(buffer);

      // Verify manifest.json has kind: 'backup' and version: 3
      const manifestFile = zip.file('manifest.json');
      expect(manifestFile).toBeTruthy();
      const manifest = JSON.parse(await manifestFile!.async('string'));
      expect(manifest.format).toBe('probate-guardian-export');
      expect(manifest.kind).toBe('backup');
      expect(manifest.version).toBe(3);
      expect(manifest.wards.length).toBe(2);

      // Verify auditLog.enc contains self-contained export record
      const auditFile = zip.file('auditLog.enc');
      expect(auditFile).toBeTruthy();
      const auditContent = await auditFile!.async('string');
      const entries = JSON.parse(auditContent.replace(/^PLAIN:/, ''));
      const exportEntry = entries.find((e: any) => e.eventType === 'DATA_EXPORT' && e.details.includes('Exported full backup of 2 ward(s)'));
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
      page.on('dialog', async (dialog) => {
        await dialog.accept();
      });

      // Trigger Open Backup (.sav) using the file input
      await page.setInputFiles('#backup-import-input', backupPath);

      // Verify wards are restored
      await page.waitForTimeout(1000);
      const wardCount = await page.evaluate(() => (window as any).guardianData.wards.length);
      const wardNames = await page.evaluate(() => (window as any).guardianData.wards.map((w: any) => w.wardName));

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

      page.on('dialog', async (dialog) => {
        if (dialog.type() === 'prompt') {
          await dialog.accept(masterPassword);
        } else {
          await dialog.accept();
        }
      });

      await page.setInputFiles('#backup-import-input', backupPath);
      await page.waitForTimeout(1000);

      const wardNames = await page.evaluate(() => (window as any).guardianData.wards.map((w: any) => w.wardName));
      expect(wardNames).toContain('Secret Ward 1');
      expect(wardNames).toContain('Secret Ward 2');
    } finally {
      await context2.close();
    }
  });

  test('Open Backup guides the user if a single-ward file is mistakenly selected', async ({ browser }) => {
    const context1 = await browser.newContext();
    let singleWardPath = '';
    try {
      const page = await context1.newPage();
      await gotoApp(page);
      await startNewCase(page);
      await chooseNoPassword(page);
      await createWard(page, 'Single Ward Solo');

      await ensureSaveControlsOpen(page);
      // Export single ward via Save Data File
      const saveWardBtn = page.locator('button[data-shell-action="export-data"]');
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

      const dialogMessages: string[] = [];
      page.on('dialog', async (dialog) => {
        dialogMessages.push(dialog.message());
        await dialog.accept();
      });

      // Pass single ward file to Open Backup
      await page.setInputFiles('#backup-import-input', singleWardPath);
      await page.waitForTimeout(1000);

      // Verify exactly one confirmation dialog was shown, followed by the completion alert
      expect(dialogMessages.length).toBe(2);
      expect(dialogMessages[0]).toContain('single-ward save file');
      expect(dialogMessages[0]).toContain('Single Ward Solo');
      expect(dialogMessages[1]).toContain('Import complete');

      // Verify ward was loaded
      const wardNames = await page.evaluate(() => (window as any).guardianData.wards.map((w: any) => w.wardName));
      expect(wardNames).toContain('Single Ward Solo');
    } finally {
      await context2.close();
    }
  });

  test('Open Backup replacing actively open ward rebinds window.D to the updated ward', async ({ browser }) => {
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

      page.on('dialog', async (d) => { await d.accept(); });

      // First restore the backup to load the ward
      await page.setInputFiles('#backup-import-input', backupPath);
      await page.waitForTimeout(1000);

      const caseNum1 = await page.evaluate(() => (window as any).D?.caseNumber);
      expect(caseNum1).toBe('CASE-SAVED-IN-BACKUP');

      // Now simulate active in-memory modifications on window.D
      await page.evaluate(() => {
        (window as any).D.caseNumber = 'CASE-BEFORE-RESTORE';
      });
      const modifiedCaseNum = await page.evaluate(() => (window as any).D?.caseNumber);
      expect(modifiedCaseNum).toBe('CASE-BEFORE-RESTORE');

      // Re-restore backup; switchWard must rebind window.D to the newly hydrated ward object
      await page.setInputFiles('#backup-import-input', backupPath);
      await page.waitForTimeout(1000);

      const reboundCaseNum = await page.evaluate(() => (window as any).D?.caseNumber);
      expect(reboundCaseNum).toBe('CASE-SAVED-IN-BACKUP');
    } finally {
      await context2.close();
    }
  });

  test('Open Backup restores wards through switchWard/activateWard and respects cross-tab lock contention', async ({ browser }) => {
    const context = await browser.newContext();
    try {
      const tab1 = await context.newPage();
      await gotoApp(tab1);
      await startNewCase(tab1);
      await chooseNoPassword(tab1);
      await createWard(tab1, 'Lock Contention Ward');

      const targetWardId = await tab1.evaluate(() => (window as any).guardianData.activeWardId);
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

      // Now open Tab 2 in the same browser context (shares Web Locks API manager)
      const tab2 = await context.newPage();
      await gotoApp(tab2);
      await startNewCase(tab2);
      await chooseNoPassword(tab2);
      // Tab 2 starts fresh with no existing wards

      tab2.on('dialog', async (d) => { await d.accept(); });

      // Restore the backup in Tab 2
      await tab2.setInputFiles('#backup-import-input', backupPath);
      await tab2.waitForTimeout(1000);

      // switchWard -> activateWard hit contention and triggered ward locked modal on Tab 2
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

});

