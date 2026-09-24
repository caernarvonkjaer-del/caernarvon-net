import { test, expect } from '@playwright/test';
import path from 'node:path';
import os from 'node:os';
import { freshStartNoPassword, createWard, fillMinimalValidAnnualWard } from './support/target';

// Importing an Annual Accounting workbook stopped at the first ward
// percentage on Schedules D-1 to D-5: "Import failed: r2 is not a function".
// The exporter writes a percentage as a fraction (50% as 0.5), so a plain
// export then re-import hit it. The importer writes into the open filing as
// it reads, so the Cover had already imported while D-1 came back empty and
// nothing after it was read -- a half-imported filing. Found by Milestone
// 70's dependency audit: annual-accounting/excel.js took r2 off window, but
// legacy-app.js declares it with const, which is not a window property.
// No test imported a ward percentage before this one.

const ROWS = {
  schD1: [{ description: 'Brokerage account', accountNo: '1234', restricted: 'No', type: 'Stock', fullAmount: 1000, wardPct: '50', carryingValue: 500, wardValue: '' }],
  schD2: [{ description: 'Family home', residence: 'Yes', income: 'No', fullValue: 200000, wardPct: '100', carryingValue: 200000 }],
  schD3: [{ description: 'Mineral rights', fullAmount: 3000, wardPct: '33.33', carryingValue: 999.9, wardAmount: '' }],
  schD4: [{ description: 'Certificate of deposit', restricted: 'No', fullAmount: 8000, wardPct: '12.5', carryingValue: 1000, wardValue: '' }],
  // 2.5, not 1: the exporter's percentValue() treats any value up to 1 as
  // already a fraction, so a 1% share is written as 100% -- a separate
  // defect, reported rather than pinned here.
  schD5: [{ description: 'Car loan', loanNo: 'L-77', loanType: 'Auto', fullDebt: 4000, wardPct: '2.5', wardBalance: '' }],
  schE: [{ bankName: 'First Bank', transferInDate: '2026-02-01', transferInAmt: 250, transferOutDate: '', transferOutAmt: '' }],
};

test('an Annual workbook with ward percentages on Schedules D-1 to D-5 re-imports completely', async ({ page }) => {
  test.setTimeout(120_000);
  await freshStartNoPassword(page);
  await createWard(page, 'Ward Percentage Export', 'annual');
  await fillMinimalValidAnnualWard(page);
  await page.evaluate((rows) => {
    const w = window as any;
    Object.assign(w.D, rows);
    w.autoSave();
  }, ROWS);

  await page.evaluate(() => (window as any).navigate('/print'));
  const download = page.waitForEvent('download', { timeout: 30_000 });
  await page.locator('[data-annual-action="save-excel"]').click();
  const xlsxPath = path.join(os.tmpdir(), `pg-annual-ward-pct-${Date.now()}.xlsx`);
  await (await download).saveAs(xlsxPath);

  await createWard(page, 'Ward Percentage Import', 'annual');
  await page.evaluate(() => (window as any).navigate('/'));
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.setInputFiles('input[type="file"][accept=".xlsx"]', xlsxPath);
  // Schedule E is read after D-5: its row arriving means the import ran past the percentages.
  await page.waitForFunction(() => ((window as any).D.schE || []).length > 0 || ((window as any).D.caseNumber && ((window as any).D.schD1 || []).length === 0 && document.body.innerText.includes('Import failed')), undefined, { timeout: 15_000 }).catch(() => {});

  const imported = await page.evaluate(() => {
    const d = (window as any).D;
    const first = (key: string) => (d[key] || [])[0] || {};
    return {
      caseNumber: d.caseNumber,
      // As text: after the import, D-1 to D-4 hold the percentage as a number
      // (it matches carrying value / full amount); D-5 keeps the imported text.
      pct: ['schD1', 'schD2', 'schD3', 'schD4', 'schD5'].map((k) => [k, first(k).description, String(first(k).wardPct)]),
      schE: first('schE').bankName,
    };
  });

  expect(errors, 'no import error').toEqual([]);
  expect(imported.caseNumber).toBe('2026-CP-000789');
  expect(imported.pct).toEqual([
    // Descriptions come back title-cased: the importer capitalizes imported text.
    ['schD1', 'Brokerage Account', '50'],
    ['schD2', 'Family Home', '100'],
    ['schD3', 'Mineral Rights', '33.33'],
    ['schD4', 'Certificate of Deposit', '12.5'],
    ['schD5', 'Car Loan', '2.5'],
  ]);
  expect(imported.schE, 'Schedule E, read after D-5, imported too').toBe('First Bank');
});
