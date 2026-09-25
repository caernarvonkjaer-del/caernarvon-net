import { test, expect } from '@playwright/test';
import { gotoApp, startNewCase, chooseNoPassword, createWard, acceptDynDialog, dismissDynDialog } from './support/target';

// The following tests cover the unified single-case-file model that
// replaced the old per-ward-file / multi-ward-archive split. Several tests
// that used to exist for that old split (per-ward handle arming, the
// version-1/2 migration modal, ward-vs-archive handle disambiguation) have
// no equivalent anymore -- there is exactly one handle and one file format
// now, so those scenarios are simply impossible rather than needing a fix.
test.describe('Case file protection: preWriteValidator, multi-ward isolation, and auto-save', () => {
  test('case auto-save does NOT truncate other wards when editing one ward', async ({ browser }) => {
    const context = await browser.newContext();
    try {
      const page = await context.newPage();
      await gotoApp(page);
      await startNewCase(page);
      await chooseNoPassword(page);
      await createWard(page, 'Case Ward 1');

      await page.evaluate(async () => {
        await (window as any).GuardianForms.testing.createFiling.add('Case Ward 2', 'guardian');
      });

      const { ward1Id, ward2Id } = await page.evaluate(async () => {
        const wards = (window as any).GuardianForms.testing.snapshot().caseFile.wards;
        const mockCaseHandle = {
          name: 'case-file.sav',
          queryPermission: async () => 'granted',
          requestPermission: async () => 'granted',
          createWritable: async () => ({
            write: async (b: any) => { (window as any).__lastCaseWriteBlob = b; },
            close: async () => {}
          })
        };
        await (window as any).GuardianForms.testing.launchState.rememberHandle(mockCaseHandle);
        // Trigger save while on Ward 2
        await (window as any).GuardianForms.testing.save.saveData();
        return { ward1Id: wards[0].wardId, ward2Id: wards[1].wardId };
      });

      const checkResult = await page.evaluate(async () => {
        const b = (window as any).__lastCaseWriteBlob;
        if (!b) return { ok: false, reason: 'No blob written' };
        const zip = await (window as any).JSZip.loadAsync(b);
        const manifest = JSON.parse(await zip.file('manifest.json').async('string'));
        const wardsInManifest = manifest.wards || [];
        return {
          ok: true,
          wardCount: wardsInManifest.length,
          wardIds: wardsInManifest.map((f: any) => f.wardId),
          hasWardsDir: Object.keys(zip.files).some((n: string) => n.startsWith('wards/')),
        };
      });

      expect(checkResult.ok).toBe(true);
      expect(checkResult.wardCount).toBe(2);
      expect(checkResult.wardIds).toContain(ward1Id);
      expect(checkResult.wardIds).toContain(ward2Id);
      expect(checkResult.hasWardsDir).toBe(true);
    } finally {
      await context.close();
    }
  });

  test('lockApp retains and restores the case file handle on unlock', async ({ browser }) => {
    const context = await browser.newContext();
    try {
      const page = await context.newPage();
      await gotoApp(page);
      await startNewCase(page);
      await chooseNoPassword(page);
      await createWard(page, 'Case Lock Ward');

      await page.evaluate(async () => {
        const blob = await (window as any).GuardianForms.testing.exportArchive.caseFile();
        const mockCaseHandle = {
          name: 'case-file.sav',
          queryPermission: async () => 'granted',
          requestPermission: async () => 'granted',
          getFile: async () => new File([blob], 'case-file.sav', { type: 'application/octet-stream' }),
          createWritable: async () => ({
            write: async () => {},
            close: async () => {}
          })
        };
        await (window as any).GuardianForms.testing.launchState.rememberHandle(mockCaseHandle);
        await (window as any).GuardianForms.testing.lock();
      });

      const isCaseArmedAfterUnlock = await page.evaluate(async () => (await (window as any).GuardianForms.testing.persistenceState.caseFileName()) === 'case-file.sav');
      expect(isCaseArmedAfterUnlock).toBe(true);
    } finally {
      await context.close();
    }
  });

  // saveBlobAs()'s own contract -- a pre-write validator that refuses stops the
  // write and throws AbortError -- is checked on the module in
  // tests/unit/case-file.spec.js since Milestone 70's 70T (this test called
  // window.saveBlobAs() with window.validateWardBackupOverwrite). The filer's
  // path through that validator is the next test: the dashboard's Backup
  // button refusing to overwrite the multi-filing case file.

  test('dashboard single-ward backup uses preWriteValidator and protects the case file from accidental overwrite', async ({ browser }) => {
    const context = await browser.newContext();
    try {
      const page = await context.newPage();
      await gotoApp(page);
      await startNewCase(page);
      await chooseNoPassword(page);
      await createWard(page, 'Dash Ward A');
      await createWard(page, 'Dash Ward B');

      await page.evaluate(async () => {
        (window as any).__writeCallCount = 0;
        const multiWardBlob = await (window as any).GuardianForms.testing.exportArchive.caseFile();

        const caseHandle = {
          name: 'case-file.sav',
          queryPermission: async () => 'granted',
          requestPermission: async () => 'granted',
          isSameEntry: async (other: any) => other && other.name === 'case-file.sav',
          getFile: async () => new File([multiWardBlob], 'case-file.sav', { type: 'application/octet-stream' }),
          createWritable: async () => ({
            write: async () => { (window as any).__writeCallCount++; },
            close: async () => {}
          })
        };

        await (window as any).GuardianForms.testing.launchState.rememberHandle(caseHandle);
        (window as any).showSaveFilePicker = async () => caseHandle;
      });

      await page.evaluate(() => (window as any).GuardianForms.testing.navigate('/dashboard'));
      await page.locator('#main-content [data-dashboard-bound="true"]').waitFor();

      const wardAId = await page.evaluate(() => (window as any).GuardianForms.testing.snapshot().caseFile.wards.find((f: any) => f.wardName === 'Dash Ward A')?.wardId);
      const backupBtn = page.locator(`[data-dashboard-action="backup"][data-ward-id="${wardAId}"]`).first();
      await expect(backupBtn).toBeVisible();

      // Count only writes caused by the button. Entering the dashboard commits
      // and saves the open filing (Milestone 38C), and that legitimate
      // case-file save goes through this same stubbed handle -- so the counter
      // is already 1 by now, for a reason that has nothing to do with the
      // overwrite protection under test.
      await page.evaluate(() => { (window as any).__writeCallCount = 0; });
      await backupBtn.click();

      // Milestone 50G: reject overwrite -- validateWardBackupOverwrite()'s
      // confirmModal() replaces the old window.confirm() stub.
      const confirmMessage = await dismissDynDialog(page);
      expect(confirmMessage).toBeTruthy();

      const result = await page.evaluate(async () => {
        return {
          writeCallCount: (window as any).__writeCallCount,
          caseStillArmed: !!(await (window as any).GuardianForms.testing.persistenceState.caseFileName()),
        };
      });

      expect(result.writeCallCount).toBe(0);
      expect(result.caseStillArmed).toBe(true);
    } finally {
      await context.close();
    }
  });

  // The sidebar's Open Backup (.sav) button with the File System Access picker
  // available: the file a filer opens becomes the case file later saves
  // write to. (Until Milestone 70's 70T this called triggerImportZip()
  // directly -- a function no button has called since Milestone 41B
  // consolidated save and backup to two buttons, 4cd5723. The button runs
  // triggerOpenBackupSav().)
  test('the sidebar\'s Open Backup button arms a writable case-file handle via showOpenFilePicker', async ({ browser }) => {
    const context = await browser.newContext();
    try {
      const page = await context.newPage();
      await gotoApp(page);
      await startNewCase(page);
      await chooseNoPassword(page);
      await createWard(page, 'Open Data File Test Ward');

      await page.evaluate(async () => {
        const w = window as any;
        const blob = await w.GuardianForms.testing.exportArchive.caseFile();
        const openHandle = {
          name: 'opened-case.sav',
          queryPermission: async () => 'granted',
          requestPermission: async () => 'granted',
          isSameEntry: async (other: any) => other && other.name === 'opened-case.sav',
          getFile: async () => new File([blob], 'opened-case.sav', { type: 'application/octet-stream' }),
          createWritable: async () => ({ write: async () => {}, close: async () => {} }),
        };
        w.showOpenFilePicker = async () => [openHandle];
      });

      const saveToggle = page.locator('#save-controls-toggle-btn');
      if ((await saveToggle.textContent())?.includes('Show')) await saveToggle.click();
      await page.locator('button[data-shell-action="open-backup-sav"]').click();
      await acceptDynDialog(page); // "replace the existing ward(s)?"
      await acceptDynDialog(page); // trailing "Backup restored" alert

      expect(await page.evaluate(() => (window as any).GuardianForms.testing.persistenceState.caseFileName())).toBe('opened-case.sav');
    } finally {
      await context.close();
    }
  });
});
