import { test, expect } from '@playwright/test';
import path from 'node:path';
import os from 'node:os';
import { type Page } from '@playwright/test';
import { gotoApp, startNewCase, chooseNoPassword, createWard, chooseCoverCounty, exportAndCapture, acceptDynDialog } from './support/target';

// The following tests cover the unified single-case-file model that
// replaced the old per-ward-file / multi-ward-archive split. Several tests
// that used to exist for that old split (per-ward handle arming, the
// version-1/2 migration modal, ward-vs-archive handle disambiguation) have
// no equivalent anymore -- there is exactly one handle and one file format
// now, so those scenarios are simply impossible rather than needing a fix.
/** The dashboard's own Backup button for one filing: the single-filing .sav a filer saves. */
async function backUpFilingFromDashboard(page: Page, filingId: string) {
  await page.evaluate(() => (window as any).GuardianForms.testing.navigate('/dashboard'));
  await page.locator('#main-content [data-dashboard-bound="true"]').waitFor();
  await page.locator(`[data-dashboard-action="backup"][data-ward-id="${filingId}"]`).click();
}

test.describe('Dashboard preference isolation and single-ward backup/export', () => {
  test('dashboard browser preferences are excluded from ward data and exported archives', async ({ browser }) => {
    const context = await browser.newContext();
    try {
      const page = await context.newPage();
      await gotoApp(page);
      await startNewCase(page);
      await chooseNoPassword(page);
      await createWard(page, 'Preference Isolation Ward');
      // lastModified is excluded deliberately: entering the dashboard commits
      // and saves the open filing (Milestone 38C), and saveData() re-stamps
      // lastModified, so a byte-identical comparison would fail on a timestamp
      // that a save is *supposed* to change. What this test guards is that no
      // dashboard preference reaches ward data, which that field cannot carry.
      const wardSnapshot = () => page.evaluate(() => JSON.stringify(
        (window as any).GuardianForms.testing.snapshot().caseFile.wards.map((f: any) => {
          const { lastModified, ...rest } = f;
          return rest;
        })
      ));
      const wardBefore = await wardSnapshot();

      await page.evaluate(() => (window as any).GuardianForms.testing.navigate('/dashboard'));
      await page.locator('#main-content [data-dashboard-bound="true"]').waitFor();
      // The assignment select that used to write this preference was retired
      // with the rest of the toolbar filters, so seed the stored payload
      // directly. What this test guards is that dashboard preferences live in
      // localStorage and never reach the case-file archive.
      await page.evaluate(() => localStorage.setItem(
        'pg-dashboard-preferences-v1',
        JSON.stringify({ supervisingProfessionalFilter: 'alex attorney', onboardingDismissed: true }),
      ));

      const archive = await page.evaluate(async () => {
        const blob = await (window as any).GuardianForms.testing.exportArchive.caseFile();
        const zip = await (window as any).JSZip.loadAsync(blob);
        const entries: Array<{ name: string; text: string }> = [];
        for (const [name, entry] of Object.entries(zip.files) as Array<[string, any]>) {
          if (!entry.dir) entries.push({ name, text: await entry.async('string') });
        }
        return entries;
      });

      expect(await wardSnapshot()).toBe(wardBefore);
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
        // Setup (D9): the workflow status and assignee as saved.
        const t = (window as any).GuardianForms.testing;
        t.patchFiling({ dashboardWorkflow: { status: 'pending-court-review', assigneeName: '  Alex   Attorney  ' } });
        const ward = t.snapshot().filing;
        return { wardId: ward.wardId, yearKey: ward.activeYearKey || 'Year 1' };
      });

      await page.evaluate((wardId) => (window as any).GuardianForms.testing.year.startNew(wardId), original.wardId);
      await expect.poll(() => page.evaluate(() => (window as any).GuardianForms.testing.snapshot().caseFile.wards[0].dashboardWorkflow)).toEqual({
        assigneeName: 'Alex Attorney',
      });
      expect(await page.evaluate(() => (window as any).GuardianForms.testing.snapshot().caseFile.wards[0].years[0].data.dashboardWorkflow)).toEqual({
        status: 'pending-court-review',
        assigneeName: '  Alex   Attorney  ',
      });

      await page.evaluate(({ wardId, yearKey }) => (window as any).GuardianForms.testing.year.switchTo(wardId, yearKey), original);
      await expect.poll(() => page.evaluate(() => (window as any).GuardianForms.testing.snapshot().caseFile.wards[0].dashboardWorkflow)).toEqual({
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
      await page.evaluate(() => (window as any).GuardianForms.testing.navigate('/dashboard'));
      await page.locator('#main-content [data-dashboard-bound="true"]').waitFor();
      const row = page.locator('.dashboard-triage-row').filter({ hasText: 'Workflow Roundtrip Ward' });
      await row.locator('[data-dashboard-change="workflow-status"]').selectOption('pending-court-review');
      await row.locator('[data-dashboard-change="assignee"]').fill('Alex Attorney');
      await row.locator('[data-dashboard-change="assignee"]').press('Tab');
      await expect.poll(() => page.evaluate(() => (window as any).GuardianForms.testing.snapshot().caseFile.wards[0].dashboardWorkflow)).toEqual({
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
      await expect.poll(() => reopenPage.evaluate(() => (window as any).GuardianForms.testing.snapshot().caseFile?.wards?.[0]?.dashboardWorkflow)).toEqual({
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
        const t = (window as any).GuardianForms.testing;
        const wardId = t.snapshot().caseFile.activeWardId;
        await t.recordActivity('TEST_EVENT', 'test entry 1');
        await t.recordActivity('TEST_EVENT', 'test entry 2');

        const blob = await t.exportArchive.singleFiling(wardId);
        const zip = await (window as any).JSZip.loadAsync(blob);
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
      // A single-ward export has no appState/templates section at all. Since
      // Milestone 38C the reader does NOT adopt an active ward from that (or
      // from any archive) -- opening one lands on the neutral dashboard.
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
      await chooseCoverCounty(page, 'Orange');

      // The dashboard's Backup button for this filing. File System Access is
      // disabled for every test target, so it downloads, then confirms.
      // (Milestone 70, 70T: this called saveBlobAs() directly.)
      const filingId = await page.evaluate(() => (window as any).GuardianForms.testing.snapshot().caseFile.activeWardId);
      const downloadPromise = page.waitForEvent('download');
      await backUpFilingFromDashboard(page, filingId);
      const download = await downloadPromise;
      expect(await acceptDynDialog(page)).toContain('Backup saved for');
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
      // Milestone 38C: opening a case file must NOT reopen an editor -- the
      // archive no longer carries activeWardId and load keeps focus null, so
      // the sidebar is neutral and the user chooses Edit. Switching
      // explicitly is what proves the ward data round-tripped.
      await expect(reopenPage.locator('#ward-selector')).toHaveValue('');
      await reopenPage.evaluate(() => (() => { const tt = (window as any).GuardianForms.testing; return tt.activateFiling.open(tt.snapshot().caseFile.wards[0].wardId); })());
      await expect(reopenPage.locator('#ward-selector')).toHaveValue('Single Export Roundtrip Ward');

      // 40C-1 Item 9: single-ward export carries no Party records, but
      // on reopen the ward Party is reconstructed with its county under the unanimity rule.
      const partyData = await reopenPage.evaluate(() => {
        const t = (window as any).GuardianForms.testing;
        const ward = t.snapshot().caseFile.wards[0];
        const party = t.sharedRecords.wardPartyForFiling(ward.wardId);
        return {
          wardCounty: ward.county,
          hasParty: Boolean(party),
          partyCounty: party?.county,
          partyRole: party?.roles,
        };
      });
      expect(partyData.wardCounty).toBe('Orange');
      expect(partyData.hasParty).toBe(true);
      expect(partyData.partyCounty).toBe('Orange');
      expect(partyData.partyRole).toContain('ward');
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
        const t = (window as any).GuardianForms.testing;
        const wardAId = t.snapshot().caseFile.activeWardId;

        await t.recordActivity('WARD_A_EVENT', 'ward A entry');

        await t.createFiling.add('Audit Ward B', 'guardian');
        const wardB = t.snapshot().caseFile.wards.find((wd: any) => wd.wardId !== wardAId);
        const wardBId = wardB?.wardId;
        if (wardB) {
          await t.activateFiling.open(wardB.wardId);
          await t.recordActivity('WARD_B_EVENT', 'ward B entry');
        }

        const unfilteredEntries = await t.persistenceState.auditEntries();

        // Single-ward export for ward A -- should NOT include ward B's entries
        const blobA = await t.exportArchive.singleFiling(wardAId);
        const zipA = await (window as any).JSZip.loadAsync(blobA);
        const auditStr = await zipA.file('auditLog.enc').async('string');
        const exportedEntries = JSON.parse(auditStr.replace(/^PLAIN:/, ''));
        return {
          wardAId,
          wardBId,
          unfilteredEntries,
          exportedEntries,
        };
      });

      expect(result.wardBId).toBeTruthy();
      expect(result.wardBId).not.toBe(result.wardAId);
      expect(result.unfilteredEntries.some((e: any) => e.eventType === 'WARD_A_EVENT' && e.wardId === result.wardAId)).toBe(true);
      expect(result.unfilteredEntries.some((e: any) => e.eventType === 'WARD_B_EVENT' && e.wardId === result.wardBId)).toBe(true);
      expect(result.exportedEntries.length).toBeGreaterThanOrEqual(1);
      expect(result.exportedEntries.every((e: any) => e.wardId === result.wardAId)).toBe(true);
      expect(result.exportedEntries.some((e: any) => e.eventType === 'WARD_A_EVENT' && e.wardId === result.wardAId)).toBe(true);
      expect(result.exportedEntries.some((e: any) => e.eventType === 'WARD_B_EVENT' || e.wardId === result.wardBId)).toBe(false);
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

      const dirtyBefore = await page.evaluate(() => {
        // Disable showSaveFilePicker to simulate Firefox / Safari
        (window as any).showSaveFilePicker = undefined;
        (window as any).GuardianForms.testing.save.markDirty();
        return (window as any).GuardianForms.testing.snapshot().hasUnsavedChanges;
      });

      // Milestone 50G: saveBackupNow() falls through to exportCaseFileZip(),
      // whose trailing "Backup complete" alert is now an awaitable
      // alertModal() -- that promise only resolves once the DOM dialog is
      // dismissed, so calling saveBackupNow() from inside a single evaluate()
      // and awaiting it there would deadlock (nothing outside that evaluate
      // call could interact with the dialog to dismiss it). Start it, then
      // dismiss the dialog from the test side, same as elsewhere in this file.
      // The sidebar's own Save Backup button. (Milestone 70, 70T: this called
      // saveBackupNow() directly.)
      const saveToggle = page.locator('#save-controls-toggle-btn');
      if ((await saveToggle.textContent())?.includes('Show')) await saveToggle.click();
      const downloadPromise = page.waitForEvent('download');
      await page.locator('button[data-shell-action="backup-all-wards"]').click();
      await downloadPromise;
      const alertMsg = await acceptDynDialog(page);

      const result = await page.evaluate(async () => ({
        dirtyAfter: (window as any).GuardianForms.testing.snapshot().hasUnsavedChanges,
        // A plain download yields no reconnectable handle -- the fast-path
        // Open screen on next launch should NOT be offered from this alone.
        caseOpenedBefore: await (window as any).GuardianForms.testing.persistenceState.hasOpenedBefore(),
      }));

      expect(dirtyBefore).toBe(true);
      expect(result.dirtyAfter).toBe(false);
      expect(result.caseOpenedBefore).toBe(false);
      expect(alertMsg).toContain('Backup complete');
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
      (window as any).alert = () => { };
      await (window as any).GuardianForms.testing.createFiling.add('Bulk Ward Beta', 'simplified');
    });

    await page.evaluate(() => (window as any).GuardianForms.testing.navigate('/dashboard'));
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

      // Setup (D9): a recovery snapshot and unsaved changes, as mid-session.
      const before = await page.evaluate(async () => {
        const t = (window as any).GuardianForms.testing;
        await t.recoveryCache.save();
        t.save.markDirty();
        const wardId = t.snapshot().caseFile.activeWardId;
        const blob = await t.exportArchive.singleFiling(wardId);
        const zip = await (window as any).JSZip.loadAsync(blob);
        const auditStr = await zip.file('auditLog.enc').async('string');
        const entries = JSON.parse(auditStr.replace(/^PLAIN:/, ''));
        // The file a filer would pick to share the copy to.
        (window as any).showSaveFilePicker = async () => ({
          name: 'shared_copy.sav',
          queryPermission: async () => 'granted',
          requestPermission: async () => 'granted',
          isSameEntry: async () => false,
          createWritable: async () => ({ write: async () => { }, close: async () => { } }),
        });
        return { wardId, dirtyBefore: t.snapshot().hasUnsavedChanges, containsThisWardsEntries: entries.every((e: any) => e.wardId === wardId) };
      });

      // The dashboard's Backup button, saving the shared copy. (Milestone 70,
      // 70T: this called finishSingleWardExport() directly.)
      await backUpFilingFromDashboard(page, before.wardId);
      expect(await acceptDynDialog(page)).toContain('Backup saved for');

      const testResult = await page.evaluate(async () => {
        const t = (window as any).GuardianForms.testing;
        const caseFileName = await t.persistenceState.caseFileName();
        return {
          cacheAfter: !!(await t.persistenceState.sessionCache()),
          dirtyAfter: t.snapshot().hasUnsavedChanges,
          caseHandleUnaffected: caseFileName === null || caseFileName !== 'shared_copy.sav',
        };
      });

      expect(before.dirtyBefore).toBe(true);
      expect(before.containsThisWardsEntries).toBe(true);
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
