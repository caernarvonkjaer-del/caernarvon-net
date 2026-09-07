import { test, expect } from '@playwright/test';
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs/promises';
import { gotoApp, startNewCase, chooseNoPassword, chooseEncrypted, createWard } from './support/target';

// window.showSaveFilePicker/showOpenFilePicker are deleted for every test
// (support/target.ts), so exportGuardianDataZip()/the startup Open flow
// always take the download-link / <input type=file> fallback path real
// Firefox/Safari users hit today (saveBlobAs(), index.html:3884;
// openCaseFileAtLaunch(), index.html:4550). Fixtures are generated live
// through the real export flow rather than hand-authored, since hand-
// crafting a byte-correct AES-256-GCM+HMAC archive would be far more
// fragile than just using the app to make one.
async function exportAndCapture(page: import('@playwright/test').Page) {
  const downloadPromise = page.waitForEvent('download');
  page.once('dialog', (d) => d.accept()); // exportGuardianDataZip()'s completion alert()
  await page.evaluate(() => { void (window as any).exportGuardianDataZip(); });
  const download = await downloadPromise;
  const savePath = path.join(os.tmpdir(), `pg-test-${Date.now()}-${Math.random().toString(36).slice(2)}.sav`);
  await download.saveAs(savePath);
  return savePath;
}

test.describe('save-open-sav (fallback download/upload path)', () => {
  test('unencrypted export then open round-trips ward data', async ({ browser }) => {
    const context = await browser.newContext();
    let savPath = '';
    try {
      const page = await context.newPage();
      await gotoApp(page);
      await startNewCase(page);
      await chooseNoPassword(page);
      await createWard(page, 'Roundtrip Ward Plain');

      savPath = await exportAndCapture(page);
    } finally {
      await context.close();
    }

    // Simulate closing and reopening: a fresh app instance, opened via file.
    const reopenContext = await browser.newContext();
    try {
      const reopenPage = await reopenContext.newPage();
      await gotoApp(reopenPage);
      await reopenPage.locator('#startup-choice-overlay.show').waitFor({ state: 'visible' });
      await reopenPage.setInputFiles('#startup-open-input', savPath);

      await expect(reopenPage.locator('#startup-choice-overlay')).not.toHaveClass(/show/);
      await expect(reopenPage.locator('#ward-selector')).toHaveValue('Roundtrip Ward Plain');
    } finally {
      await reopenContext.close();
    }
  });

  test('dashboard browser preferences are excluded from ward data and exported archives', async ({ browser }) => {
    const context = await browser.newContext();
    try {
      const page = await context.newPage();
      await gotoApp(page);
      await startNewCase(page);
      await chooseNoPassword(page);
      await createWard(page, 'Preference Isolation Ward');
      const wardBefore = await page.evaluate(() => JSON.stringify((window as any).getCaseFile().wards));

      await page.evaluate(() => (window as any).navigate('/dashboard'));
      await page.locator('#main-content [data-dashboard-bound="true"]').waitFor();
      await page.locator('#dashboard-role').selectOption('assistant');
      await page.locator('#dashboard-assignment-filter').selectOption('unassigned');

      const archive = await page.evaluate(async () => {
        const { blob } = await (window as any).buildCaseFileBlob();
        const zip = await (window as any).JSZip.loadAsync(blob);
        const entries: Array<{ name: string; text: string }> = [];
        for (const [name, entry] of Object.entries(zip.files) as Array<[string, any]>) {
          if (!entry.dir) entries.push({ name, text: await entry.async('string') });
        }
        return entries;
      });

      expect(await page.evaluate(() => JSON.stringify((window as any).getCaseFile().wards))).toBe(wardBefore);
      expect(archive.map((entry) => entry.name)).not.toContain('pg-dashboard-preferences-v1');
      const archiveText = archive.map((entry) => entry.text).join('\n');
      expect(archiveText).not.toContain('pg-dashboard-preferences-v1');
      expect(archiveText).not.toContain('supervisingProfessionalFilter');
      expect(archiveText).not.toContain('onboardingDismissed');
    } finally {
      await context.close();
    }
  });

  test('new year clears workflow status, carries assignment, and prior year restores both', async ({ browser }) => {
    const context = await browser.newContext();
    try {
      const page = await context.newPage();
      await gotoApp(page);
      await startNewCase(page);
      await chooseNoPassword(page);
      await createWard(page, 'Workflow Year Ward');
      const original = await page.evaluate(() => {
        const ward = (window as any).getCaseFile().wards[0];
        ward.dashboardWorkflow = { status: 'pending-court-review', assigneeName: '  Alex   Attorney  ' };
        return { wardId: ward.wardId, yearKey: ward.activeYearKey || 'Year 1' };
      });

      await page.evaluate((wardId) => (window as any).startNewWardYear(wardId), original.wardId);
      await expect.poll(() => page.evaluate(() => (window as any).getCaseFile().wards[0].dashboardWorkflow)).toEqual({
        assigneeName: 'Alex Attorney',
      });
      expect(await page.evaluate(() => (window as any).getCaseFile().wards[0].years[0].data.dashboardWorkflow)).toEqual({
        status: 'pending-court-review',
        assigneeName: '  Alex   Attorney  ',
      });

      await page.evaluate(({ wardId, yearKey }) => (window as any).switchWardYear(wardId, yearKey), original);
      await expect.poll(() => page.evaluate(() => (window as any).getCaseFile().wards[0].dashboardWorkflow)).toEqual({
        status: 'pending-court-review',
        assigneeName: '  Alex   Attorney  ',
      });
    } finally {
      await context.close();
    }
  });

  test('explicit dashboard status and assignment round-trip through .sav', async ({ browser }) => {
    const context = await browser.newContext();
    let savPath = '';
    try {
      const page = await context.newPage();
      await gotoApp(page);
      await startNewCase(page);
      await chooseNoPassword(page);
      await createWard(page, 'Workflow Roundtrip Ward');
      await page.evaluate(() => (window as any).navigate('/dashboard'));
      await page.locator('#main-content [data-dashboard-bound="true"]').waitFor();
      await page.locator('#dashboard-role').selectOption('professional');
      const row = page.locator('.dashboard-triage-row').filter({ hasText: 'Workflow Roundtrip Ward' });
      await row.locator('[data-dashboard-change="workflow-status"]').selectOption('pending-court-review');
      await row.locator('[data-dashboard-change="assignee"]').fill('Alex Attorney');
      await row.locator('[data-dashboard-change="assignee"]').press('Tab');
      await expect.poll(() => page.evaluate(() => (window as any).getCaseFile().wards[0].dashboardWorkflow)).toEqual({
        status: 'pending-court-review',
        assigneeName: 'Alex Attorney',
      });

      savPath = await exportAndCapture(page);
    } finally {
      await context.close();
    }

    const reopenContext = await browser.newContext();
    try {
      const reopenPage = await reopenContext.newPage();
      await gotoApp(reopenPage);
      await reopenPage.locator('#startup-choice-overlay.show').waitFor({ state: 'visible' });
      await reopenPage.setInputFiles('#startup-open-input', savPath);

      await expect(reopenPage.locator('#startup-choice-overlay')).not.toHaveClass(/show/);
      expect(await reopenPage.evaluate(() => (window as any).getCaseFile().wards[0].dashboardWorkflow)).toEqual({
        status: 'pending-court-review',
        assigneeName: 'Alex Attorney',
      });
    } finally {
      await reopenContext.close();
    }
  });

  test('encrypted export then open: wrong password rejected, correct password round-trips data', async ({ browser }) => {
    const password = 'sav-roundtrip-password-42';
    const context = await browser.newContext();
    let savPath = '';
    try {
      const page = await context.newPage();
      await gotoApp(page);
      await startNewCase(page);
      await chooseEncrypted(page, password);
      await createWard(page, 'Roundtrip Ward Encrypted');

      savPath = await exportAndCapture(page);
    } finally {
      await context.close();
    }

    const reopenContext = await browser.newContext();
    try {
      const reopenPage = await reopenContext.newPage();
      await gotoApp(reopenPage);
      await reopenPage.locator('#startup-choice-overlay.show').waitFor({ state: 'visible' });
      await reopenPage.setInputFiles('#startup-open-input', savPath);

      // promptPasswordForFile() puts the unlock overlay in
      // 'openFile' mode -- same #unlock-overlay, no confirm row.
      await reopenPage.locator('#unlock-overlay.show').waitFor({ state: 'visible' });
      await expect(reopenPage.locator('#unlock-password-confirm')).toBeHidden();

      await reopenPage.fill('#unlock-password', 'not-the-right-password');
      await reopenPage.click('#unlock-submit-btn');
      await expect(reopenPage.locator('#unlock-overlay')).toHaveClass(/show/);
      await expect(reopenPage.locator('#unlock-error')).toBeVisible();
      await expect(reopenPage.locator('#startup-choice-overlay')).not.toHaveClass(/show/);

      await reopenPage.fill('#unlock-password', password);
      await reopenPage.click('#unlock-submit-btn');
      await expect(reopenPage.locator('#unlock-overlay')).not.toHaveClass(/show/);
      await expect(reopenPage.locator('#ward-selector')).toHaveValue('Roundtrip Ward Encrypted');
    } finally {
      await reopenContext.close();
    }
  });

  test('a corrupted .sav file is rejected with an error, not a crash', async ({ browser }) => {
    const context = await browser.newContext();
    let goodPath = '';
    try {
      const page = await context.newPage();
      await gotoApp(page);
      await startNewCase(page);
      await chooseNoPassword(page);
      await createWard(page, 'Corruption Source Ward');
      goodPath = await exportAndCapture(page);
    } finally {
      await context.close();
    }

    const fs = await import('node:fs/promises');
    const bytes = await fs.readFile(goodPath);
    const corruptPath = goodPath.replace(/\.sav$/, '-corrupt.sav');
    await fs.writeFile(corruptPath, bytes.subarray(0, Math.floor(bytes.length / 3)));

    const corruptContext = await browser.newContext();
    try {
      const corruptPage = await corruptContext.newPage();
      const errors: string[] = [];
      corruptPage.on('pageerror', (e) => errors.push(e.message));

      await gotoApp(corruptPage);
      await corruptPage.locator('#startup-choice-overlay.show').waitFor({ state: 'visible' });
      const dialogPromise = corruptPage.waitForEvent('dialog');
      await corruptPage.setInputFiles('#startup-open-input', corruptPath);
      await (await dialogPromise).accept();

      // Rejected, not crashed: still on the startup screen, no uncaught errors.
      await expect(corruptPage.locator('#startup-choice-overlay')).toHaveClass(/show/);
      expect(errors).toEqual([]);
    } finally {
      await corruptContext.close();
    }
  });
});

// The following describe block covers the unified single-case-file model
// that replaced the old per-ward-file / multi-ward-archive split. Several
// tests that used to exist here for that old split (per-ward handle
// arming, the version-1/2 migration modal, ward-vs-archive handle
// disambiguation) have no equivalent anymore -- there is exactly one
// handle and one file format now, so those scenarios are simply
// impossible rather than needing a fix.
test.describe('unified case file', () => {
  test('buildSingleWardExportBlob produces a valid case-file-shaped ZIP with ward.enc, auditLog.enc, manifest.json', async ({ browser }) => {
    const context = await browser.newContext();
    try {
      const page = await context.newPage();
      await gotoApp(page);
      await startNewCase(page);
      await chooseNoPassword(page);
      await createWard(page, 'Single Export Ward');

      const result = await page.evaluate(async () => {
        const w = (window as any);
        const wardId = w.caseFile.activeWardId;
        await w.auditLog('TEST_EVENT', 'test entry 1');
        await w.auditLog('TEST_EVENT', 'test entry 2');

        const blob = await w.buildSingleWardExportBlob(wardId);
        const zip = await w.JSZip.loadAsync(blob);
        const fileNames = Object.keys(zip.files).sort();
        const manifest = JSON.parse(await zip.file('manifest.json').async('string'));
        const hasWardEnc = !!zip.file(`wards/${wardId}.enc`);
        const hasAuditLog = !!zip.file('auditLog.enc');
        return { fileNames, manifest, hasWardEnc, hasAuditLog, wardId };
      });

      expect(result.fileNames).toEqual(['auditLog.enc', 'manifest.json', 'wards/', `wards/${result.wardId}.enc`]);
      // Same unified format as the main case file -- no separate "single ward" shape.
      expect(result.manifest.format).toBe('probate-guardian-case');
      expect(result.manifest.version).toBe(1);
      expect(result.manifest.wards).toEqual([{ wardId: result.wardId, wardName: 'Single Export Ward', file: `wards/${result.wardId}.enc` }]);
      expect(result.manifest.securityMode).toBe('none');
      expect(result.manifest.salt).toBeNull();
      expect(result.manifest.verifier).toBeNull();
      expect(result.manifest.guardian).toBeTruthy();
      expect(result.hasWardEnc).toBe(true);
      expect(result.hasAuditLog).toBe(true);
      // A single-ward export has no appState/templates section at all -- the
      // reader (loadCaseFileFromZip) defaults activeWardId to this one ward.
      expect(result.manifest.appState).toBeUndefined();
      expect(result.manifest.templates).toEqual([]);
    } finally {
      await context.close();
    }
  });

  test('single-ward export round-trips: export then open restores the ward', async ({ browser }) => {
    const context = await browser.newContext();
    let savPath = '';
    try {
      const page = await context.newPage();
      await gotoApp(page);
      await startNewCase(page);
      await chooseNoPassword(page);
      await createWard(page, 'Single Export Roundtrip Ward');

      const downloadPromise = page.waitForEvent('download');
      page.once('dialog', (d) => d.accept());
      await page.evaluate(async () => {
        const w = (window as any);
        const wardId = w.caseFile.activeWardId;
        const blob = await w.buildSingleWardExportBlob(wardId);
        w.saveBlobAs(blob, 'single-ward-roundtrip.sav');
      });
      const download = await downloadPromise;
      savPath = path.join(os.tmpdir(), `pg-single-rt-${Date.now()}.sav`);
      await download.saveAs(savPath);
    } finally {
      await context.close();
    }

    const reopenContext = await browser.newContext();
    try {
      const reopenPage = await reopenContext.newPage();
      await gotoApp(reopenPage);
      await reopenPage.locator('#startup-choice-overlay.show').waitFor({ state: 'visible' });
      await reopenPage.setInputFiles('#startup-open-input', savPath);

      await expect(reopenPage.locator('#startup-choice-overlay')).not.toHaveClass(/show/);
      await expect(reopenPage.locator('#ward-selector')).toHaveValue('Single Export Roundtrip Ward');
    } finally {
      await reopenContext.close();
    }
  });

  test('audit log in a single-ward export contains only entries for that ward', async ({ browser }) => {
    const context = await browser.newContext();
    try {
      const page = await context.newPage();
      await gotoApp(page);
      await startNewCase(page);
      await chooseNoPassword(page);
      await createWard(page, 'Audit Ward A');

      const result = await page.evaluate(async () => {
        const w = (window as any);
        const wardAId = w.caseFile.activeWardId;

        await w.auditLog('WARD_A_EVENT', 'ward A entry');

        await w.addWard('Audit Ward B', 'guardian');
        const wardB = w.caseFile.wards.find((wd: any) => wd.wardId !== wardAId);
        if (wardB) {
          await w.switchWard(wardB.wardId);
          await w.auditLog('WARD_B_EVENT', 'ward B entry');
        }

        // Single-ward export for ward A -- should NOT include ward B's entries
        const blobA = await w.buildSingleWardExportBlob(wardAId);
        const zipA = await w.JSZip.loadAsync(blobA);
        const auditStr = await zipA.file('auditLog.enc').async('string');
        const entries = JSON.parse(auditStr.replace(/^PLAIN:/, ''));
        return {
          wardAId,
          entryCount: entries.length,
          allMatchWardA: entries.every((e: any) => e.wardId === wardAId),
          hasWardBEntry: entries.some((e: any) => e.eventType === 'WARD_B_EVENT'),
        };
      });

      expect(result.entryCount).toBeGreaterThanOrEqual(1);
      expect(result.allMatchWardA).toBe(true);
      expect(result.hasWardBEntry).toBe(false);
    } finally {
      await context.close();
    }
  });

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

  test('saveBackupNow in fallback browser (no showSaveFilePicker) downloads and marks case saved but not case-opened', async ({ browser }) => {
    const context = await browser.newContext();
    try {
      const page = await context.newPage();
      await gotoApp(page);
      await startNewCase(page);
      await chooseNoPassword(page);
      await createWard(page, 'Fallback Ward');

      const result = await page.evaluate(async () => {
        // Disable showSaveFilePicker to simulate Firefox / Safari
        (window as any).showSaveFilePicker = undefined;

        let alertMsg = '';
        (window as any).alert = (msg: string) => { alertMsg = msg; };

        (window as any).markDirtySinceExport();
        const dirtyBefore = (window as any).pgHasUnsavedChanges();

        await (window as any).saveBackupNow();

        const dirtyAfter = (window as any).pgHasUnsavedChanges();
        // A plain download yields no reconnectable handle -- the fast-path
        // Open screen on next launch should NOT be offered from this alone.
        const caseOpenedBefore = await (window as any).hasOpenedCaseBefore();

        return { dirtyBefore, dirtyAfter, caseOpenedBefore, alertMsg };
      });

      expect(result.dirtyBefore).toBe(true);
      expect(result.dirtyAfter).toBe(false);
      expect(result.caseOpenedBefore).toBe(false);
      expect(result.alertMsg).toContain('Backup complete');
    } finally {
      await context.close();
    }
  });

  test('dashboard Export All Wards button exports the unified case file', async ({ page }) => {
    await gotoApp(page);
    await startNewCase(page);
    await chooseNoPassword(page);
    await createWard(page, 'Bulk Ward Alpha');
    await page.evaluate(async () => {
      (window as any).alert = () => {};
      await (window as any).addWard('Bulk Ward Beta', 'simplified');
    });

    await page.evaluate(() => (window as any).navigate('/dashboard'));
    await page.locator('#main-content [data-dashboard-bound="true"]').waitFor();
    await expect(page.locator('.dashboard-export-all')).toBeVisible();

    const downloadPromise = page.waitForEvent('download');
    await page.click('.dashboard-export-all');
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe('guardianshipwarddata.sav');
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

  test('dashboard single-ward backup is decoupled from the main case save state', async ({ browser }) => {
    // Sharing a copy of one ward is a side action now, not a real save of
    // the case -- it deliberately does not clear _dirtySinceExport or the
    // recovery cache, since neither reflects only this one ward. See
    // finishSingleWardExport()'s comment in legacy-app.js.
    const context = await browser.newContext();
    try {
      const page = await context.newPage();
      await gotoApp(page);
      await startNewCase(page);
      await chooseNoPassword(page);
      await createWard(page, 'Cache Guard Ward');

      const testResult = await page.evaluate(async () => {
        const w = (window as any);
        const wardId = w.caseFile.activeWardId;
        const ward = w.caseFile.wards.find((item: any) => item.wardId === wardId);

        await w.saveSessionRestoreCache();
        w.markDirtySinceExport();
        const dirtyBefore = w.pgHasUnsavedChanges();

        const blob = await w.buildSingleWardExportBlob(wardId);
        const zip = await w.JSZip.loadAsync(blob);
        const auditStr = await zip.file('auditLog.enc').async('string');
        const entries = JSON.parse(auditStr.replace(/^PLAIN:/, ''));
        const containsThisWardsEntries = entries.every((e: any) => e.wardId === wardId);

        const mockHandle = {
          name: 'shared_copy.sav',
          queryPermission: async () => 'granted',
          requestPermission: async () => 'granted',
          isSameEntry: async () => false,
          createWritable: async () => ({ write: async () => {}, close: async () => {} })
        };
        w.finishSingleWardExport(mockHandle, ward);

        const cacheAfter = await w._sessionCacheGet();
        const dirtyAfter = w.pgHasUnsavedChanges();
        const caseHandleAfter = await w.loadCaseFileHandle();

        return {
          dirtyBefore,
          containsThisWardsEntries,
          cacheAfter: !!cacheAfter,
          dirtyAfter,
          caseHandleUnaffected: caseHandleAfter === null || caseHandleAfter?.name !== 'shared_copy.sav',
        };
      });

      expect(testResult.dirtyBefore).toBe(true);
      expect(testResult.containsThisWardsEntries).toBe(true);
      // Still dirty and the recovery cache is still there -- a shared copy
      // of one ward says nothing about whether the real case file was saved.
      expect(testResult.cacheAfter).toBe(true);
      expect(testResult.dirtyAfter).toBe(true);
      expect(testResult.caseHandleUnaffected).toBe(true);
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
