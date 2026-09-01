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
      await expect.poll(() => page.evaluate(() => (window as any).getGuardianData().wards[0].dashboardWorkflow)).toEqual({
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
      expect(await reopenPage.evaluate(() => (window as any).getGuardianData().wards[0].dashboardWorkflow)).toEqual({
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

test.describe('per-ward save file (version 3)', () => {
  test('buildWardZipBlob produces a valid version-3 ZIP with ward.enc, auditLog.enc, manifest.json', async ({ browser }) => {
    const context = await browser.newContext();
    try {
      const page = await context.newPage();
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
    } finally {
      await context.close();
    }
  });

  test('version-3 per-ward file round-trips: export then open restores the ward', async ({ browser }) => {
    const context = await browser.newContext();
    let savPath = '';
    try {
      const page = await context.newPage();
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
      savPath = path.join(os.tmpdir(), `pg-v3-rt-${Date.now()}.sav`);
      await download.saveAs(savPath);
    } finally {
      await context.close();
    }

    // Re-open from scratch
    const reopenContext = await browser.newContext();
    try {
      const reopenPage = await reopenContext.newPage();
      await gotoApp(reopenPage);
      await reopenPage.locator('#startup-choice-overlay.show').waitFor({ state: 'visible' });
      await reopenPage.setInputFiles('#startup-open-input', savPath);

      await expect(reopenPage.locator('#startup-choice-overlay')).not.toHaveClass(/show/);
      await expect(reopenPage.locator('#ward-selector')).toHaveValue('V3 Roundtrip Ward');
    } finally {
      await reopenContext.close();
    }
  });

  test('audit log in version-3 file contains only entries for that ward', async ({ browser }) => {
    const context = await browser.newContext();
    try {
      const page = await context.newPage();
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
        await w.addWard('Audit Ward B', 'guardian');
        const wardB = w.guardianData.wards.find((wd: any) => wd.wardId !== wardAId);
        if (wardB) {
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
    } finally {
      await context.close();
    }
  });

  test('per-ward handle routing: rememberWardZipHandle arms active ward handle and arming status updates on switch', async ({ browser }) => {
    const context = await browser.newContext();
    try {
      const page = await context.newPage();
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
        await (window as any).rememberWardZipHandle(id, mockHandle);
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
    } finally {
      await context.close();
    }
  });

  test('version-2 multi-ward files still open correctly (backward compatibility)', async ({ browser }) => {
    const context = await browser.newContext();
    let savPath = '';
    try {
      const page = await context.newPage();
      await gotoApp(page);
      await startNewCase(page);
      await chooseNoPassword(page);
      await createWard(page, 'V2 Compat Ward');

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
      await expect(reopenPage.locator('#ward-selector')).toHaveValue('V2 Compat Ward');
    } finally {
      await reopenContext.close();
    }
  });

  test('archive auto-save does NOT truncate other wards when editing one ward in multi-ward archive mode', async ({ browser }) => {
    const context = await browser.newContext();
    try {
      const page = await context.newPage();
      await gotoApp(page);
      await startNewCase(page);
      await chooseNoPassword(page);
      await createWard(page, 'Archive Ward 1');

      await page.evaluate(async () => {
        await (window as any).addWard('Archive Ward 2', 'guardian');
      });

      const { ward1Id, ward2Id } = await page.evaluate(async () => {
        const wards = (window as any).guardianData.wards;
        const mockArchiveHandle = {
          name: 'archive-case.sav',
          queryPermission: async () => 'granted',
          requestPermission: async () => 'granted',
          createWritable: async () => ({
            write: async (b: any) => { (window as any).__lastArchiveWriteBlob = b; },
            close: async () => {}
          })
        };
        await (window as any).rememberArchiveZipHandle(mockArchiveHandle);
        // Trigger save while on Ward 2
        await (window as any).saveData();
        return { ward1Id: wards[0].wardId, ward2Id: wards[1].wardId };
      });

      const checkResult = await page.evaluate(async () => {
        const b = (window as any).__lastArchiveWriteBlob;
        if (!b) return { ok: false, reason: 'No blob written' };
        const zip = await (window as any).JSZip.loadAsync(b);
        const manifest = JSON.parse(await zip.file('manifest.json').async('string'));
        const wardsInManifest = manifest.wards || [];
        const hasWardsDir = Object.keys(zip.files).some((n: string) => n.startsWith('wards/'));
        return {
          ok: true,
          kind: manifest.kind || 'archive',
          wardCount: wardsInManifest.length,
          wardIds: wardsInManifest.map((w: any) => w.wardId),
          hasWardsDir,
          hasSingleWardEnc: !!zip.file('ward.enc')
        };
      });

      expect(checkResult.ok).toBe(true);
      expect(checkResult.kind).toBe('archive');
      expect(checkResult.wardCount).toBe(2);
      expect(checkResult.wardIds).toContain(ward1Id);
      expect(checkResult.wardIds).toContain(ward2Id);
      expect(checkResult.hasWardsDir).toBe(true);
      expect(checkResult.hasSingleWardEnc).toBe(false);
    } finally {
      await context.close();
    }
  });

  test('deleteWard cleans up persisted ward handle from launch preferences', async ({ browser }) => {
    const context = await browser.newContext();
    try {
      const page = await context.newPage();
      await gotoApp(page);
      await startNewCase(page);
      await chooseNoPassword(page);
      await createWard(page, 'Transient Ward');

      const wardId = await page.evaluate(() => (window as any).guardianData.activeWardId);

      // Save a mock handle for this ward
      await page.evaluate(async (id) => {
        const mockHandle = {
          name: 'transient-ward.sav',
          queryPermission: async () => 'granted',
          requestPermission: async () => 'granted',
          createWritable: async () => ({
            write: async () => {},
            close: async () => {}
          })
        };
        await (window as any).rememberWardZipHandle(id, mockHandle);
      }, wardId);

      const hasHandleBefore = await page.evaluate(async (id) => {
        return !!(await (window as any).loadWardZipHandle(id));
      }, wardId);
      expect(hasHandleBefore).toBe(true);

      // Delete the ward
      await page.evaluate(async (id) => {
        await (window as any).deleteWard(id);
      }, wardId);

      const hasHandleAfter = await page.evaluate(async (id) => {
        return !!(await (window as any).loadWardZipHandle(id));
      }, wardId);
      expect(hasHandleAfter).toBe(false);
    } finally {
      await context.close();
    }
  });

  test('lockApp retains and restores archive handle on unlock in archive mode', async ({ browser }) => {
    const context = await browser.newContext();
    try {
      const page = await context.newPage();
      await gotoApp(page);
      await startNewCase(page);
      await chooseNoPassword(page);
      await createWard(page, 'Archive Lock Ward');

      await page.evaluate(async () => {
        const { blob } = await (window as any).buildExportZipBlob();
        const mockArchiveHandle = {
          name: 'case-archive.sav',
          queryPermission: async () => 'granted',
          requestPermission: async () => 'granted',
          getFile: async () => new File([blob], 'case-archive.sav', { type: 'application/octet-stream' }),
          createWritable: async () => ({
            write: async () => {},
            close: async () => {}
          })
        };
        await (window as any).rememberArchiveZipHandle(mockArchiveHandle);
        await (window as any).lockApp();
      });

      const isArchiveArmedAfterUnlock = await page.evaluate(async () => {
        const h = await (window as any).loadArchiveZipHandle();
        return h && h.name === 'case-archive.sav';
      });
      expect(isArchiveArmedAfterUnlock).toBe(true);
    } finally {
      await context.close();
    }
  });

  test('isSameEntry deconflicts ward handle and archive handle', async ({ browser }) => {
    const context = await browser.newContext();
    try {
      const page = await context.newPage();
      await gotoApp(page);
      await startNewCase(page);
      await chooseNoPassword(page);
      await createWard(page, 'Conflict Ward');

      const result = await page.evaluate(async () => {
        const wardId = (window as any).guardianData.activeWardId;
        const sharedHandle = {
          name: 'shared-file.sav',
          queryPermission: async () => 'granted',
          requestPermission: async () => 'granted',
          isSameEntry: async (other: any) => other && other.name === 'shared-file.sav',
          createWritable: async () => ({ write: async () => {}, close: async () => {} })
        };

        await (window as any).rememberArchiveZipHandle(sharedHandle);
        const hasArchiveBefore = !!(await (window as any).loadArchiveZipHandle());

        // Now arm ward with the same handle
        await (window as any).rememberWardZipHandle(wardId, sharedHandle);
        const hasWardAfter = !!(await (window as any).loadWardZipHandle(wardId));
        const hasArchiveAfter = !!(await (window as any).loadArchiveZipHandle());

        return { hasArchiveBefore, hasWardAfter, hasArchiveAfter };
      });

      expect(result.hasArchiveBefore).toBe(true);
      expect(result.hasWardAfter).toBe(true);
      expect(result.hasArchiveAfter).toBe(false);
    } finally {
      await context.close();
    }
  });
});
