import { test, expect } from '@playwright/test';
import path from 'node:path';
import os from 'node:os';
import { gotoApp, startNewCase, chooseNoPassword, createWard, exportAndCapture } from './support/target';

// The following tests cover the unified single-case-file model that
// replaced the old per-ward-file / multi-ward-archive split. Several tests
// that used to exist for that old split (per-ward handle arming, the
// version-1/2 migration modal, ward-vs-archive handle disambiguation) have
// no equivalent anymore -- there is exactly one handle and one file format
// now, so those scenarios are simply impossible rather than needing a fix.
test.describe('Dashboard preference isolation and single-ward backup/export', () => {
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
});
