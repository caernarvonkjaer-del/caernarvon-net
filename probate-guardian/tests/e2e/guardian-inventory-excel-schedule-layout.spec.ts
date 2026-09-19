import { test, expect } from '@playwright/test';
import path from 'node:path';
import os from 'node:os';
import { freshStartNoPassword, createWard, fillMinimalValidGuardianWard } from './support/target';

// Milestone 52K: each of Guardian Inventory's 11 schedules had its Excel
// page/sheet-name + row-number layout hand-typed twice -- once in
// doSaveExcel()'s fillScheduleXX() writer, once more in
// parseInitialInventoryWorkbook()'s readRows() call -- under two different
// key names for the same field ('name' on the writer side, 'sheet' on the
// reader side). Both sides now share one SCHEDULE_XX_PAGES constant. This is
// the round-trip proof that the hoist didn't change which cell backs which
// row: every schedule is filled to its exact page-template capacity (the
// same cap src/core/excel/excel-capacity.js enforces), including the last
// row of the last page -- the boundary a writer/reader page-advance
// off-by-one would surface on first.

const SCHEDULES: Record<string, { cap: number; row: (i: number) => Record<string, unknown> }> = {
  scheduleA1: {
    cap: 20,
    row: (i) => ({
      propertyDescription: `A1 Property ${i}`, streetAddress: `${i} A1 St`, cityStateZip: `A1City, FL ${10000 + i}`,
      notes: `A1 note ${i}`, residence: i % 2 === 0 ? 'Yes' : 'No', income: i % 2 === 0 ? 'No' : 'Yes',
      fullAssetValue: 1000 + i, wardPercent: 0.5,
    }),
  },
  scheduleA2: {
    cap: 24,
    row: (i) => ({
      lenderName: `A2 Lender ${i}`, lenderAddress: `${i} A2 Ave`, lenderCityStateZip: `A2City, FL ${20000 + i}`,
      accountNumber: `A2-ACCT-${i}`, liabilityType: 'Mortgage', fullDebtBalance: 2000 + i, wardPercent: 0.5,
    }),
  },
  scheduleB1: {
    cap: 36,
    row: (i) => ({
      institutionName: `B1 Bank ${i}`, accountNumber: `B1-${i}`, streetAddress: `${i} B1 Rd`, cityStateZip: `B1City, FL ${30000 + i}`,
      restricted: i % 2 === 0 ? 'Yes' : 'No', accountType: 'Checking', fullAssetAmount: 3000 + i, wardPercent: 0.5,
    }),
  },
  scheduleB2: {
    cap: 39,
    row: (i) => ({
      description: `B2 Item ${i}`, streetAddress: `${i} B2 Blvd`, cityStateZip: `B2City, FL ${40000 + i}`,
      valuationMethod: 'Appraisal', fullAssetValue: 4000 + i, wardPercent: 0.5, inSafeDepositBox: i % 2 === 0 ? 'Yes' : 'No',
    }),
  },
  scheduleB3: {
    cap: 20,
    row: (i) => ({
      description: `B3 Intangible ${i}`, streetAddress: `${i} B3 Way`, cityStateZip: `B3City, FL ${50000 + i}`,
      restricted: i % 2 === 0 ? 'Yes' : 'No', fullAssetValue: 5000 + i, wardPercent: 0.5, inSafeDepositBox: i % 2 === 0 ? 'No' : 'Yes',
    }),
  },
  scheduleB4: {
    cap: 33,
    row: (i) => ({
      lenderName: `B4 Creditor ${i}`, lenderAddress: `${i} B4 Ct`, relatedProperty: `B4 Property ${i}`,
      accountNumber: `B4-${i}`, liabilityType: 'Loan', fullLiabilityBalance: 6000 + i, wardPercent: 0.5,
    }),
  },
  scheduleC1: {
    cap: 23,
    row: (i) => ({
      payerName: `C1 Payer ${i}`, payerAddress: `${i} C1 Dr`, payerCityStateZip: `C1City, FL ${60000 + i}`,
      typeOfIncome: 'Pension', frequencyOfPayment: 'Monthly', paymentBasis: 'Fixed', annualIncomeAmount: 7000 + i, wardPercent: 0.5,
    }),
  },
  scheduleC2: {
    cap: 13,
    row: (i) => ({
      lawsuitDescription: `C2 Suit ${i}`, caseNumber: `C2CASE${i}`, courtJurisdiction: 'Circuit Court',
      claimantName: `C2 Claimant ${i}`, claimantAddress: `${i} C2 Ln`, dateFiled: '2026-01-01', amountOfClaim: 8000 + i, wardPercent: 0.5,
    }),
  },
  scheduleC3: {
    cap: 14,
    row: (i) => ({
      defendantName: `C3 Defendant ${i}`, actionDescription: `C3 Action ${i}`, caseNumber: `C3CASE${i}`,
      status: 'Pending', courtJurisdiction: 'Circuit Court', actionDate: '2026-01-01', estimatedSettlement: 9000 + i, wardPercent: 0.5,
    }),
  },
  scheduleC4: {
    cap: 16,
    row: (i) => ({
      trustName: `C4 Trust ${i}`, trusteeName: `C4 Trustee ${i}`, trusteeAddress: `${i} C4 Pl`, trusteeCityStateZip: `C4City, FL ${70000 + i}`,
      dateCreated: '2026-01-01', accountNumber: `C4-${i}`, trustType: 'Pooled', trustAmount: 10000 + i, wardPercent: 0.5,
    }),
  },
  scheduleC5: {
    // 23 since D10 extended the page map to the form's third page; 15 before.
    cap: 23,
    row: (i) => ({
      assetDescription: `C5 Asset ${i}`, ownerAddress: `${i} C5 Sq`, ownerName: `C5 Owner ${i}`, ownerCityStateZip: `C5City, FL ${80000 + i}`,
      relationshipToWard: 'Sibling', totalAssetValue: 11000 + i, jointOwnerPercent: 0.5,
    }),
  },
};

test.describe('Guardian Inventory Excel schedule layout (Milestone 52K)', () => {
  test('all 11 schedules round-trip through export/import at full page capacity, including the last row of the last page', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Excel Schedule Layout Ward', 'guardian');
    await fillMinimalValidGuardianWard(page);

    const fixture: Record<string, unknown[]> = {};
    for (const [key, { cap, row }] of Object.entries(SCHEDULES)) {
      fixture[key] = Array.from({ length: cap }, (_, i) => row(i));
    }

    await page.evaluate((fx) => {
      Object.assign((window as any).D, fx);
      (window as any).autoSave();
    }, fixture);
    await page.evaluate(() => (window as any).flushPendingSave());
    await page.evaluate(() => (window as any).navigate('/print'));

    const downloadPromise = page.waitForEvent('download', { timeout: 30_000 });
    await page.locator('[data-inventory-action="save-excel"]').click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.xlsx$/i);
    const xlsxPath = path.join(os.tmpdir(), `pg-52k-schedule-layout-${Date.now()}.xlsx`);
    await download.saveAs(xlsxPath);

    await createWard(page, 'Blank Schedule Import Target', 'guardian');
    await page.evaluate(() => (window as any).navigate('/'));

    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.setInputFiles('input[type="file"][accept=".xlsx"]', xlsxPath);
    await page.waitForFunction(
      (k) => Array.isArray((window as any).D[k]) && (window as any).D[k].length > 0,
      'scheduleA1',
      { timeout: 15_000 },
    );

    for (const [key, { cap, row }] of Object.entries(SCHEDULES)) {
      const imported = await page.evaluate((k) => (window as any).D[k], key);
      expect(imported, `${key} row count`).toHaveLength(cap);

      // Every row, not just the last -- a page-advance off-by-one would
      // typically shift every row after the break, not just the final one.
      for (let i = 0; i < cap; i++) {
        const expectedRow = row(i);
        const importedRow = imported[i];
        for (const field of Object.keys(expectedRow)) {
          const expectedVal = expectedRow[field];
          const actualVal = importedRow[field];
          // Pre-existing quirk, unrelated to 52K's page/row-layout hoist:
          // the reader's pct() multiplies the raw cell value by 100 (it
          // assumes the cell holds a 0-1 fraction), but the writer stores
          // wardPercent as-is -- the same plain 0-100 number the form's
          // "Ward's % (0-100)" input and its own >0 validation use. Written
          // 50 therefore reads back 5000. Not 52K's to fix (flagged
          // separately); this test writes a fraction here so the
          // assertion reflects what the reader actually returns rather
          // than papering over a real round-trip defect.
          if (field === 'wardPercent' || field === 'jointOwnerPercent') {
            expect(actualVal, `${key}[${i}].${field}`).toBeCloseTo((expectedVal as number) * 100, 5);
          } else if (typeof expectedVal === 'number') {
            expect(actualVal, `${key}[${i}].${field}`).toBeCloseTo(expectedVal, 5);
          } else {
            expect(actualVal, `${key}[${i}].${field}`).toBe(expectedVal);
          }
        }
      }
    }

    expect(errors, `console/page errors during Excel import: ${errors.join('\n')}`).toEqual([]);
  });
});
