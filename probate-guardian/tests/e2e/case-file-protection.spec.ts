import { test, expect } from '@playwright/test';
import { gotoApp, startNewCase, chooseNoPassword, createWard } from './support/target';

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
        await (window as any).addWard('Case Ward 2', 'guardian');
      });

      const { ward1Id, ward2Id } = await page.evaluate(async () => {
        const wards = (window as any).caseFile.wards;
        const mockCaseHandle = {
          name: 'case-file.sav',
          queryPermission: async () => 'granted',
          requestPermission: async () => 'granted',
          createWritable: async () => ({
            write: async (b: any) => { (window as any).__lastCaseWriteBlob = b; },
            close: async () => {}
          })
        };
        await (window as any).rememberCaseFileHandle(mockCaseHandle);
        // Trigger save while on Ward 2
        await (window as any).saveData();
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
          wardIds: wardsInManifest.map((w: any) => w.wardId),
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
        const { blob } = await (window as any).buildCaseFileBlob();
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
        await (window as any).rememberCaseFileHandle(mockCaseHandle);
        await (window as any).lockApp();
      });

      const isCaseArmedAfterUnlock = await page.evaluate(async () => {
        const h = await (window as any).loadCaseFileHandle();
        return h && h.name === 'case-file.sav';
      });
      expect(isCaseArmedAfterUnlock).toBe(true);
    } finally {
      await context.close();
    }
  });

  test('saveBlobAs preWriteValidator halts createWritable, throws AbortError, and leaves case file untouched when user cancels overwrite', async ({ browser }) => {
    const context = await browser.newContext();
    try {
      const page = await context.newPage();
      await gotoApp(page);
      await startNewCase(page);
      await chooseNoPassword(page);
      await createWard(page, 'Ward First');
      await createWard(page, 'Ward Second');

      const testResult = await page.evaluate(async () => {
        let writeCallCount = 0;
        let writtenBytes = 0;
        const { blob: multiWardBlob } = await (window as any).buildCaseFileBlob();

        const caseHandle = {
          name: 'case-file.sav',
          queryPermission: async () => 'granted',
          requestPermission: async () => 'granted',
          isSameEntry: async (other: any) => other && other.name === 'case-file.sav',
          getFile: async () => new File([multiWardBlob], 'case-file.sav', { type: 'application/octet-stream' }),
          createWritable: async () => ({
            write: async (chunk: any) => {
              writeCallCount++;
              writtenBytes = chunk.size || chunk.byteLength || 0;
            },
            close: async () => {}
          })
        };

        await (window as any).rememberCaseFileHandle(caseHandle);
        // Mock showSaveFilePicker to return the same caseHandle (as if user picked it in the file dialog)
        (window as any).showSaveFilePicker = async () => caseHandle;

        let confirmCalled = false;
        (window as any).confirm = () => {
          confirmCalled = true;
          return false; // user rejects overwriting the multi-ward case file
        };

        const activeWard = (window as any).caseFile.wards[0];
        const singleWardBlob = await (window as any).buildSingleWardExportBlob(activeWard.wardId);

        let caughtErrorName = null;
        try {
          await (window as any).saveBlobAs(singleWardBlob, 'test.sav', (window as any).validateWardBackupOverwrite);
        } catch (e: any) {
          caughtErrorName = e && e.name;
        }

        const caseStillArmed = !!(await (window as any).loadCaseFileHandle());

        return { confirmCalled, caughtErrorName, writeCallCount, writtenBytes, caseStillArmed };
      });

      expect(testResult.confirmCalled).toBe(true);
      expect(testResult.caughtErrorName).toBe('AbortError');
      expect(testResult.writeCallCount).toBe(0);
      expect(testResult.writtenBytes).toBe(0);
      expect(testResult.caseStillArmed).toBe(true);
    } finally {
      await context.close();
    }
  });

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
        const { blob: multiWardBlob } = await (window as any).buildCaseFileBlob();

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

        await (window as any).rememberCaseFileHandle(caseHandle);
        (window as any).showSaveFilePicker = async () => caseHandle;

        (window as any).__confirmCalled = false;
        (window as any).confirm = () => {
          (window as any).__confirmCalled = true;
          return false; // reject overwrite
        };
        (window as any).alert = () => {};
      });

      await page.evaluate(() => (window as any).navigate('/dashboard'));
      await page.locator('#main-content [data-dashboard-bound="true"]').waitFor();
      await page.locator('#dashboard-role').selectOption('professional');

      const wardAId = await page.evaluate(() => (window as any).caseFile.wards.find((w: any) => w.wardName === 'Dash Ward A')?.wardId);
      const backupBtn = page.locator(`[data-dashboard-action="backup"][data-ward-id="${wardAId}"]`).first();
      await expect(backupBtn).toBeVisible();
      await backupBtn.click();

      await expect.poll(() => page.evaluate(() => (window as any).__confirmCalled)).toBe(true);

      const result = await page.evaluate(async () => {
        return {
          writeCallCount: (window as any).__writeCallCount,
          caseStillArmed: !!(await (window as any).loadCaseFileHandle()),
        };
      });

      expect(result.writeCallCount).toBe(0);
      expect(result.caseStillArmed).toBe(true);
    } finally {
      await context.close();
    }
  });

  test('triggerImportZip (the sidebar\'s "Open Data File" button) arms a writable case-file handle via showOpenFilePicker', async ({ browser }) => {
    const context = await browser.newContext();
    try {
      const page = await context.newPage();
      await gotoApp(page);
      await startNewCase(page);
      await chooseNoPassword(page);
      await createWard(page, 'Open Data File Test Ward');

      const result = await page.evaluate(async () => {
        const w = window as any;
        const { blob } = await w.buildCaseFileBlob();
        const openHandle = {
          name: 'opened-case.sav',
          queryPermission: async () => 'granted',
          requestPermission: async () => 'granted',
          isSameEntry: async (other: any) => other && other.name === 'opened-case.sav',
          getFile: async () => new File([blob], 'opened-case.sav', { type: 'application/octet-stream' }),
          createWritable: async () => ({ write: async () => {}, close: async () => {} }),
        };
        w.showOpenFilePicker = async () => [openHandle];
        w.confirm = () => true; // "replace the existing ward(s)?" prompt inside importSavArchiveOrWard()

        await w.triggerImportZip();

        const armed = await w.loadCaseFileHandle();
        return { armedName: armed?.name };
      });

      expect(result.armedName).toBe('opened-case.sav');
    } finally {
      await context.close();
    }
  });
});
