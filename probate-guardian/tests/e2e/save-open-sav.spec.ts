import { test, expect } from '@playwright/test';
import path from 'node:path';
import os from 'node:os';
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
  test('unencrypted export then open round-trips ward data', async ({ page }) => {
    await gotoApp(page);
    await startNewCase(page);
    await chooseNoPassword(page);
    await createWard(page, 'Roundtrip Ward Plain');

    const savPath = await exportAndCapture(page);

    // Simulate closing and reopening: a fresh app instance, opened via file.
    await gotoApp(page);
    await page.locator('#startup-choice-overlay.show').waitFor({ state: 'visible' });
    await page.setInputFiles('#startup-open-input', savPath);

    await expect(page.locator('#startup-choice-overlay')).not.toHaveClass(/show/);
    await expect(page.locator('#ward-selector')).toHaveValue('Roundtrip Ward Plain');
  });

  test('dashboard browser preferences are excluded from ward data and exported archives', async ({ page }) => {
    await gotoApp(page);
    await startNewCase(page);
    await chooseNoPassword(page);
    await createWard(page, 'Preference Isolation Ward');
    const wardBefore = await page.evaluate(() => JSON.stringify((window as any).getGuardianData().wards));

    await page.evaluate(() => (window as any).navigate('/dashboard'));
    await page.locator('#main-content [data-dashboard-bound="true"]').waitFor();
    await page.locator('#dashboard-role').selectOption('assistant');
    await page.locator('#dashboard-assignment-filter').selectOption('unassigned');

    const archive = await page.evaluate(async () => {
      const { blob } = await (window as any).buildExportZipBlob();
      const zip = await (window as any).JSZip.loadAsync(blob);
      const entries: Array<{ name: string; text: string }> = [];
      for (const [name, entry] of Object.entries(zip.files) as Array<[string, any]>) {
        if (!entry.dir) entries.push({ name, text: await entry.async('string') });
      }
      return entries;
    });

    expect(await page.evaluate(() => JSON.stringify((window as any).getGuardianData().wards))).toBe(wardBefore);
    expect(archive.map((entry) => entry.name)).not.toContain('pg-dashboard-preferences-v1');
    const archiveText = archive.map((entry) => entry.text).join('\n');
    expect(archiveText).not.toContain('pg-dashboard-preferences-v1');
    expect(archiveText).not.toContain('supervisingProfessionalFilter');
    expect(archiveText).not.toContain('onboardingDismissed');
  });

  test('new year clears workflow status, carries assignment, and prior year restores both', async ({ page }) => {
    await gotoApp(page);
    await startNewCase(page);
    await chooseNoPassword(page);
    await createWard(page, 'Workflow Year Ward');
    const original = await page.evaluate(() => {
      const ward = (window as any).getGuardianData().wards[0];
      ward.dashboardWorkflow = { status: 'pending-court-review', assigneeName: '  Alex   Attorney  ' };
      return { wardId: ward.wardId, yearKey: ward.activeYearKey || 'Year 1' };
    });

    await page.evaluate((wardId) => (window as any).startNewWardYear(wardId), original.wardId);
    await expect.poll(() => page.evaluate(() => (window as any).getGuardianData().wards[0].dashboardWorkflow)).toEqual({
      assigneeName: 'Alex Attorney',
    });
    expect(await page.evaluate(() => (window as any).getGuardianData().wards[0].years[0].data.dashboardWorkflow)).toEqual({
      status: 'pending-court-review',
      assigneeName: '  Alex   Attorney  ',
    });

    await page.evaluate(({ wardId, yearKey }) => (window as any).switchWardYear(wardId, yearKey), original);
    await expect.poll(() => page.evaluate(() => (window as any).getGuardianData().wards[0].dashboardWorkflow)).toEqual({
      status: 'pending-court-review',
      assigneeName: '  Alex   Attorney  ',
    });
  });

  test('explicit dashboard status and assignment round-trip through .sav', async ({ page }) => {
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
    await expect.poll(() => page.evaluate(() => (window as any).getGuardianData().wards[0].dashboardWorkflow)).toEqual({
      status: 'pending-court-review',
      assigneeName: 'Alex Attorney',
    });

    const savPath = await exportAndCapture(page);
    await gotoApp(page);
    await page.locator('#startup-choice-overlay.show').waitFor({ state: 'visible' });
    await page.setInputFiles('#startup-open-input', savPath);

    await expect(page.locator('#startup-choice-overlay')).not.toHaveClass(/show/);
    expect(await page.evaluate(() => (window as any).getGuardianData().wards[0].dashboardWorkflow)).toEqual({
      status: 'pending-court-review',
      assigneeName: 'Alex Attorney',
    });
  });

  test('encrypted export then open: wrong password rejected, correct password round-trips data', async ({ page }) => {
    const password = 'sav-roundtrip-password-42';
    await gotoApp(page);
    await startNewCase(page);
    await chooseEncrypted(page, password);
    await createWard(page, 'Roundtrip Ward Encrypted');

    const savPath = await exportAndCapture(page);

    await gotoApp(page);
    await page.locator('#startup-choice-overlay.show').waitFor({ state: 'visible' });
    await page.setInputFiles('#startup-open-input', savPath);

    // promptPasswordForFile() (index.html:3317) puts the unlock overlay in
    // 'openFile' mode -- same #unlock-overlay, no confirm row.
    await page.locator('#unlock-overlay.show').waitFor({ state: 'visible' });
    await expect(page.locator('#unlock-password-confirm')).toBeHidden();

    await page.fill('#unlock-password', 'not-the-right-password');
    await page.click('#unlock-submit-btn');
    await expect(page.locator('#unlock-overlay')).toHaveClass(/show/);
    await expect(page.locator('#unlock-error')).toBeVisible();
    await expect(page.locator('#startup-choice-overlay')).not.toHaveClass(/show/); // stays past the startup screen while retrying

    await page.fill('#unlock-password', password);
    await page.click('#unlock-submit-btn');
    await expect(page.locator('#unlock-overlay')).not.toHaveClass(/show/);
    await expect(page.locator('#ward-selector')).toHaveValue('Roundtrip Ward Encrypted');
  });

  test('a corrupted .sav file is rejected with an error, not a crash', async ({ page }) => {
    await gotoApp(page);
    await startNewCase(page);
    await chooseNoPassword(page);
    await createWard(page, 'Corruption Source Ward');
    const goodPath = await exportAndCapture(page);

    const fs = await import('node:fs/promises');
    const bytes = await fs.readFile(goodPath);
    const corruptPath = goodPath.replace(/\.sav$/, '-corrupt.sav');
    // Truncate to a third of the archive -- guarantees an invalid/incomplete
    // ZIP rather than one that merely fails a checksum on one entry.
    await fs.writeFile(corruptPath, bytes.subarray(0, Math.floor(bytes.length / 3)));

    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));

    await gotoApp(page);
    await page.locator('#startup-choice-overlay.show').waitFor({ state: 'visible' });
    // The failure alert() fires from inside loadCaseFileAtLaunch()'s async
    // JSZip.loadAsync() rejection, not synchronously with setInputFiles() --
    // wait for the dialog itself rather than racing a `once` handler against
    // test teardown.
    const dialogPromise = page.waitForEvent('dialog');
    await page.setInputFiles('#startup-open-input', corruptPath);
    await (await dialogPromise).accept();

    // Rejected, not crashed: still on the startup screen, no uncaught errors.
    await expect(page.locator('#startup-choice-overlay')).toHaveClass(/show/);
    expect(errors).toEqual([]);
  });
});

test.describe('per-ward save file (version 3)', () => {
  test('buildWardZipBlob produces a valid version-3 ZIP with ward.enc, auditLog.enc, manifest.json', async ({ page }) => {
    await gotoApp(page);
    await startNewCase(page);
    await chooseNoPassword(page);
    await createWard(page, 'V3 Format Ward');

    const result = await page.evaluate(async () => {
      const w = (window as any);
      const wardId = w.guardianData.activeWardId;
      // Generate some audit entries for this ward
      await w.auditLog('TEST_EVENT', 'test entry 1');
      await w.auditLog('TEST_EVENT', 'test entry 2');

      const blob = await w.buildWardZipBlob(wardId);
      const zip = await w.JSZip.loadAsync(blob);
      const fileNames = Object.keys(zip.files).sort();
      const manifest = JSON.parse(await zip.file('manifest.json').async('string'));
      const hasWardEnc = !!zip.file('ward.enc');
      const hasAuditLog = !!zip.file('auditLog.enc');
      // Version-2 entries should NOT exist
      const hasWardsDir = fileNames.some((n: string) => n.startsWith('wards/'));
      return { fileNames, manifest, hasWardEnc, hasAuditLog, hasWardsDir, wardId };
    });

    expect(result.fileNames).toEqual(['auditLog.enc', 'manifest.json', 'ward.enc']);
    expect(result.manifest.format).toBe('probate-guardian-export');
    expect(result.manifest.kind).toBe('ward');
    expect(result.manifest.version).toBe(3);
    expect(result.manifest.wardId).toBe(result.wardId);
    expect(result.manifest.wardName).toBe('V3 Format Ward');
    expect(result.manifest.securityMode).toBe('none');
    expect(result.manifest.salt).toBeNull();
    expect(result.manifest.verifier).toBeNull();
    expect(result.manifest.guardian).toBeTruthy();
    expect(result.hasWardEnc).toBe(true);
    expect(result.hasAuditLog).toBe(true);
    expect(result.hasWardsDir).toBe(false);
    // v2 fields should NOT be present
    expect(result.manifest.appState).toBeUndefined();
    expect(result.manifest.wards).toBeUndefined();
    expect(result.manifest.templates).toBeUndefined();
    // Audit log scope declared in the manifest itself, not just comments
    expect(result.manifest.auditLogScope).toBe('ward-only');
    expect(result.manifest.auditLogNote).toBeTruthy();
  });

  test('version-3 per-ward file round-trips: export then open restores the ward', async ({ page }) => {
    await gotoApp(page);
    await startNewCase(page);
    await chooseNoPassword(page);
    await createWard(page, 'V3 Roundtrip Ward');

    // Build v3 blob and download it via the fallback path
    const downloadPromise = page.waitForEvent('download');
    page.once('dialog', (d) => d.accept());
    await page.evaluate(async () => {
      const w = (window as any);
      const wardId = w.guardianData.activeWardId;
      const blob = await w.buildWardZipBlob(wardId);
      w.saveBlobAs(blob, 'v3-roundtrip.sav');
    });
    const download = await downloadPromise;
    const savPath = path.join(os.tmpdir(), `pg-v3-rt-${Date.now()}.sav`);
    await download.saveAs(savPath);

    // Re-open from scratch
    await gotoApp(page);
    await page.locator('#startup-choice-overlay.show').waitFor({ state: 'visible' });
    await page.setInputFiles('#startup-open-input', savPath);

    await expect(page.locator('#startup-choice-overlay')).not.toHaveClass(/show/);
    await expect(page.locator('#ward-selector')).toHaveValue('V3 Roundtrip Ward');
  });

  test('audit log in version-3 file contains only entries for that ward', async ({ page }) => {
    await gotoApp(page);
    await startNewCase(page);
    await chooseNoPassword(page);
    await createWard(page, 'Audit Ward A');

    const result = await page.evaluate(async () => {
      const w = (window as any);
      const wardAId = w.guardianData.activeWardId;

      // Create audit entries for ward A
      await w.auditLog('WARD_A_EVENT', 'ward A entry');

      // Create a second ward
      await w.addWard('guardian');
      const wardB = w.guardianData.wards.find((wd: any) => wd.wardId !== wardAId);
      if (wardB) {
        wardB.wardName = 'Audit Ward B';
        await w.switchWard(wardB.wardId);
        await w.auditLog('WARD_B_EVENT', 'ward B entry');
      }

      // Build v3 for ward A — should NOT include ward B's entries
      const blobA = await w.buildWardZipBlob(wardAId);
      const zipA = await w.JSZip.loadAsync(blobA);
      const auditStr = await zipA.file('auditLog.enc').async('string');
      // In 'none' mode, encryptJSON uses PLAIN: prefix
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
  });

  test('per-ward handle routing: rememberZipHandle arms active ward handle and arming status updates on switch', async ({ page }) => {
    await gotoApp(page);
    await startNewCase(page);
    await chooseNoPassword(page);
    await createWard(page, 'Handle Ward 1');

    const status1 = await page.locator('#auto-save-armed-indicator').textContent();
    expect(status1).toContain('Auto-save:');

    // Create a mock handle for Ward 1
    const ward1Id = await page.evaluate(() => (window as any).guardianData.activeWardId);
    await page.evaluate(async (id) => {
      const mockHandle = {
        name: 'handle-ward-1.sav',
        queryPermission: async () => 'granted',
        requestPermission: async () => 'granted',
        createWritable: async () => ({
          write: async () => {},
          close: async () => {}
        })
      };
      await (window as any).rememberZipHandle(id, mockHandle);
    }, ward1Id);

    await expect(page.locator('#auto-save-armed-indicator')).toHaveText(/Auto-save: ready ✓ \(handle-ward-1\.sav\)/);

    // Add second ward and switch to it
    await page.evaluate(async () => {
      await (window as any).addWard('Handle Ward 2', 'guardian');
    });

    // On ward 2, ward 1's handle is not armed
    const status2 = await page.locator('#auto-save-armed-indicator').textContent();
    expect(status2).not.toContain('handle-ward-1.sav');

    // Switch back to Ward 1
    const ward1 = await page.evaluate((id) => (window as any).guardianData.wards.find((w: any) => w.wardId === id), ward1Id);
    await page.evaluate(async (w) => {
      await (window as any).activateWard(w);
    }, ward1);

    // Ward 1's handle is restored and armed
    await expect(page.locator('#auto-save-armed-indicator')).toHaveText(/Auto-save: ready ✓ \(handle-ward-1\.sav\)/);
  });

  test('version-2 multi-ward files still open correctly (backward compatibility)', async ({ page }) => {
    // This is the existing unencrypted round-trip test — just verify it
    // still works now that loadStateFromSavZip has a v3 branch.
    await gotoApp(page);
    await startNewCase(page);
    await chooseNoPassword(page);
    await createWard(page, 'V2 Compat Ward');

    const savPath = await exportAndCapture(page);

    await gotoApp(page);
    await page.locator('#startup-choice-overlay.show').waitFor({ state: 'visible' });
    await page.setInputFiles('#startup-open-input', savPath);

    await expect(page.locator('#startup-choice-overlay')).not.toHaveClass(/show/);
    await expect(page.locator('#ward-selector')).toHaveValue('V2 Compat Ward');
  });
});
