import { test, expect } from '@playwright/test';
import path from 'node:path';
import os from 'node:os';
import { freshStartNoPassword, createWard, fillMinimalValidGuardianWard } from './support/target';

test.describe('excel-export-import', () => {
  test('exporting to the bundled blank template then re-importing round-trips key fields', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Excel Roundtrip Ward');
    await fillMinimalValidGuardianWard(page);
    await page.evaluate(() => (window as any).navigate('/print'));

    const downloadPromise = page.waitForEvent('download', { timeout: 20_000 });
    await page.evaluate(() => { void (window as any).doSaveExcel(); });
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.xlsx$/i);
    const xlsxPath = path.join(os.tmpdir(), `pg-excel-roundtrip-${Date.now()}.xlsx`);
    await download.saveAs(xlsxPath);

    // A second, blank guardian ward to import into -- importExcelFile()
    // (index.html:16667) writes onto the currently active ward (window.D).
    await createWard(page, 'Blank Import Target Ward');
    await page.evaluate(() => (window as any).navigate('/'));

    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    // The "Import Excel File" <input> is rendered inline on the Cover page
    // with no id (index.html:15389); it's reachable by its distinguishing
    // attributes regardless of which page instance rendered it.
    await page.setInputFiles('input[type="file"][accept=".xlsx"]', xlsxPath);
    await page.waitForTimeout(1000);

    const imported = await page.evaluate(() => ({
      wardName: (window as any).D.wardName,
      caseNumber: (window as any).D.caseNumber,
      county: (window as any).D.county,
      guardianName: (window as any).D.guardianName,
    }));
    expect(imported.caseNumber).toBe('2026-CP-000123');
    expect(imported.county).toBe('Pinellas');
    expect(imported.guardianName).toBe('Sample Guardian');
    expect(errors).toEqual([]);
  });
});
