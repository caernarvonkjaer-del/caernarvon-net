import { test, expect, type Page } from '@playwright/test';
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs';
import { freshStartNoPassword, createWard, fillMinimalValidGuardianWard } from './support/target';
import {
  SCHEDULE_A1_PAGES, SCHEDULE_B2_PAGES, SCHEDULE_B3_PAGES, SCHEDULE_B4_PAGES, SCHEDULE_C2_PAGES,
} from '../../src/core/excel/guardian-inventory-pages.js';

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
      fullAssetValue: 1000 + i, wardPercent: 50,
    }),
  },
  scheduleA2: {
    cap: 24,
    row: (i) => ({
      lenderName: `A2 Lender ${i}`, lenderAddress: `${i} A2 Ave`, lenderCityStateZip: `A2City, FL ${20000 + i}`,
      accountNumber: `A2-ACCT-${i}`, liabilityType: 'Mortgage', fullDebtBalance: 2000 + i, wardPercent: 50,
    }),
  },
  scheduleB1: {
    cap: 36,
    row: (i) => ({
      institutionName: `B1 Bank ${i}`, accountNumber: `B1-${i}`, streetAddress: `${i} B1 Rd`, cityStateZip: `B1City, FL ${30000 + i}`,
      restricted: i % 2 === 0 ? 'Yes' : 'No', accountType: 'Checking', fullAssetAmount: 3000 + i, wardPercent: 50,
    }),
  },
  scheduleB2: {
    cap: 39,
    row: (i) => ({
      description: `B2 Item ${i}`, streetAddress: `${i} B2 Blvd`, cityStateZip: `B2City, FL ${40000 + i}`,
      valuationMethod: 'Appraisal', fullAssetValue: 4000 + i, wardPercent: 50, inSafeDepositBox: i % 2 === 0 ? 'Yes' : 'No',
    }),
  },
  scheduleB3: {
    cap: 20,
    row: (i) => ({
      description: `B3 Intangible ${i}`, streetAddress: `${i} B3 Way`, cityStateZip: `B3City, FL ${50000 + i}`,
      restricted: i % 2 === 0 ? 'Yes' : 'No', fullAssetValue: 5000 + i, wardPercent: 50, inSafeDepositBox: i % 2 === 0 ? 'No' : 'Yes',
    }),
  },
  scheduleB4: {
    cap: 33,
    row: (i) => ({
      lenderName: `B4 Creditor ${i}`, lenderAddress: `${i} B4 Ct`, relatedProperty: `B4 Property ${i}`,
      accountNumber: `B4-${i}`, liabilityType: 'Loan', fullLiabilityBalance: 6000 + i, wardPercent: 50,
    }),
  },
  scheduleC1: {
    cap: 23,
    row: (i) => ({
      payerName: `C1 Payer ${i}`, payerAddress: `${i} C1 Dr`, payerCityStateZip: `C1City, FL ${60000 + i}`,
      typeOfIncome: 'Pension', frequencyOfPayment: 'Monthly', paymentBasis: 'Fixed', annualIncomeAmount: 7000 + i, wardPercent: 50,
    }),
  },
  scheduleC2: {
    cap: 13,
    row: (i) => ({
      lawsuitDescription: `C2 Suit ${i}`, caseNumber: `C2CASE${i}`, courtJurisdiction: 'Circuit Court',
      claimantName: `C2 Claimant ${i}`, claimantAddress: `${i} C2 Ln`, claimantCityStateZip: `C2City, FL ${90000 + i}`, dateFiled: '2026-01-01', amountOfClaim: 8000 + i, wardPercent: 50,
    }),
  },
  scheduleC3: {
    cap: 14,
    row: (i) => ({
      defendantName: `C3 Defendant ${i}`, actionDescription: `C3 Action ${i}`, caseNumber: `C3CASE${i}`,
      status: 'Pending', courtJurisdiction: 'Circuit Court', actionDate: '2026-01-01', estimatedSettlement: 9000 + i, wardPercent: 50,
    }),
  },
  scheduleC4: {
    cap: 16,
    row: (i) => ({
      trustName: `C4 Trust ${i}`, trusteeName: `C4 Trustee ${i}`, trusteeAddress: `${i} C4 Pl`, trusteeCityStateZip: `C4City, FL ${70000 + i}`,
      dateCreated: '2026-01-01', accountNumber: `C4-${i}`, trustType: 'Pooled', trustAmount: 10000 + i, wardPercent: 50,
    }),
  },
  scheduleC5: {
    // 23 since D10 extended the page map to the form's third page; 15 before.
    cap: 23,
    row: (i) => ({
      assetDescription: `C5 Asset ${i}`, ownerAddress: `${i} C5 Sq`, ownerName: `C5 Owner ${i}`, ownerCityStateZip: `C5City, FL ${80000 + i}`,
      relationshipToWard: 'Sibling', totalAssetValue: 11000 + i, jointOwnerPercent: 50,
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
      (window as any).GuardianForms.testing.patchFiling(fx);
    }, fixture);
    await page.evaluate(() => (window as any).GuardianForms.testing.save.flush());
    await page.evaluate(() => (window as any).GuardianForms.testing.navigate('/print'));

    const downloadPromise = page.waitForEvent('download', { timeout: 30_000 });
    await page.locator('[data-inventory-action="save-excel"]').click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.xlsx$/i);
    const xlsxPath = path.join(os.tmpdir(), `pg-52k-schedule-layout-${Date.now()}.xlsx`);
    await download.saveAs(xlsxPath);

    await createWard(page, 'Blank Schedule Import Target', 'guardian');
    await page.evaluate(() => (window as any).GuardianForms.testing.navigate('/'));

    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.setInputFiles('input[type="file"][accept=".xlsx"]', xlsxPath);
    await page.waitForFunction(
      (k) => { const rows = (window as any).GuardianForms.testing.field(k); return Array.isArray(rows) && rows.length > 0; },
      'scheduleA1',
      { timeout: 15_000 },
    );

    for (const [key, { cap, row }] of Object.entries(SCHEDULES)) {
      const imported = await page.evaluate((k) => (window as any).GuardianForms.testing.field(k), key);
      expect(imported, `${key} row count`).toHaveLength(cap);

      // Every row, not just the last -- a page-advance off-by-one would
      // typically shift every row after the break, not just the final one.
      for (let i = 0; i < cap; i++) {
        const expectedRow = row(i);
        const importedRow = imported[i];
        for (const field of Object.keys(expectedRow)) {
          const expectedVal = expectedRow[field];
          const actualVal = importedRow[field];
          // Milestone 60K fixed the percentage boundary: the writer now puts
          // the fraction the workbook's 0.00% cells expect, and the reader
          // turns it back into the app's 0-100 number, so 50 round-trips as
          // 50. (Before 60K this test had to write 0.5 and expect 50 back,
          // because the writer stored the 0-100 number as-is -- which also
          // made every Ward's Value in the filed workbook 100x too large.)
          if (typeof expectedVal === 'number') {
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

// Milestone 60K. Reads the EXPORTED FILE, not a re-import of it: the importer
// reads by address and evaluates nothing, so it agrees with a broken exporter
// perfectly (AGENTS.md section 5). Uses the app's own vendored ExcelJS inside
// the page, the way excel-import-cell-shapes.spec.ts does.
type CellShot = { value: unknown; formula: string | null; numFmt: string | null };
async function readExportedCells(page: Page, xlsxPath: string, wants: Array<[string, string]>): Promise<Record<string, CellShot>> {
  await page.addScriptTag({ url: 'lib/exceljs.min.js' });
  await page.waitForFunction(() => typeof (window as any).ExcelJS !== 'undefined', { timeout: 15_000 });
  const b64 = fs.readFileSync(xlsxPath).toString('base64');
  return page.evaluate(async ([data, cells]) => {
    const ExcelJS = (window as any).ExcelJS;
    const wb = new ExcelJS.Workbook();
    const bin = atob(data as string);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    await wb.xlsx.load(bytes.buffer);
    const out: Record<string, { value: unknown; formula: string | null; numFmt: string | null }> = {};
    for (const [sheet, addr] of cells as Array<[string, string]>) {
      const cell = wb.getWorksheet(sheet)?.getCell(addr);
      const v = cell?.value;
      const isFormula = v && typeof v === 'object' && 'formula' in v;
      out[`${sheet}!${addr}`] = {
        value: isFormula ? (v as any).result ?? null : (v ?? null),
        formula: isFormula ? (v as any).formula : null,
        numFmt: cell?.numFmt ?? null,
      };
    }
    return out;
  }, [b64, wants] as const);
}

async function exportGuardianWorkbook(page: Page, overlay: Record<string, unknown>, stem: string): Promise<string> {
  await page.evaluate((fx) => {
    const d = (window as any).GuardianForms.testing.snapshot().filing;
    // Keep the minimal fixture's "no items" answers for schedules this overlay
    // does not populate; only the populated ones flip to false.
    for (const [k, v] of Object.entries(fx)) {
      if (k === 'scheduleNoItems') Object.assign(d.scheduleNoItems = d.scheduleNoItems || {}, v as object);
      else d[k] = v;
    }
    (window as any).GuardianForms.testing.replaceFiling(d);
  }, overlay);
  await page.evaluate(() => (window as any).GuardianForms.testing.save.flush());
  await page.evaluate(() => (window as any).GuardianForms.testing.navigate('/print'));
  const saveExcel = page.locator('[data-inventory-action="save-excel"]');
  await saveExcel.waitFor({ state: 'visible', timeout: 15_000 });
  if (await saveExcel.isDisabled()) {
    // Say WHY the gate is closed rather than timing out on a download that
    // can never start.
    const issues = await page.evaluate(() => [...document.querySelectorAll('#print-doc-container ~ *, .validation-panel, [class*="validation"], [class*="readiness"]')]
      .map((el) => (el as HTMLElement).innerText).filter(Boolean).join('\n'));
    throw new Error(`Save as Excel is disabled for this fixture. Export gate said:\n${issues}`);
  }
  const downloadPromise = page.waitForEvent('download', { timeout: 30_000 });
  await saveExcel.click();
  const download = await downloadPromise;
  const xlsxPath = path.join(os.tmpdir(), `${stem}-${Date.now()}.xlsx`);
  await download.saveAs(xlsxPath);
  return xlsxPath;
}

test.describe('Guardian Inventory Excel export writes what the court form computes with (Milestone 60K)', () => {
  const a1 = SCHEDULE_A1_PAGES[0], b2 = SCHEDULE_B2_PAGES[0], b3 = SCHEDULE_B3_PAGES[0], b4 = SCHEDULE_B4_PAGES[0], c2 = SCHEDULE_C2_PAGES[0];
  // 0%, 50% and 100% on B-2, B-3, B-4 and C-2. A-1 is the one schedule whose
  // validator rejects a 0% row ("Ward's % must be > 0"), so it carries 25%
  // instead -- a fraction that is neither 0 nor 1 still proves the conversion.
  const PCTS: Record<string, number[]> = { [a1.name]: [25, 50, 100] };
  const pctsFor = (name: string) => PCTS[name] || [0, 50, 100];
  const pctRows = (pcts: number[], mk: (i: number, pct: number) => Record<string, unknown>) => pcts.map((p, i) => mk(i, p));
  const FIXTURE = {
    scheduleNoItems: { a1: false, b2: false, b3: false, b4: false, c2: false },
    scheduleA1: pctRows(pctsFor(a1.name), (i, p) => ({ propertyDescription: `A1 ${p}%`, streetAddress: `${i} A1 St`, cityStateZip: 'A1City, FL 10000', residence: 'No', income: 'No', fullAssetValue: 1000, wardPercent: p })),
    scheduleB2: pctRows(pctsFor(b2.name), (i, p) => ({ description: `B2 ${p}%`, streetAddress: `${i} B2 Blvd`, cityStateZip: 'B2City, FL 40000', valuationMethod: 'Appraisal', fullAssetValue: 1000, wardPercent: p, inSafeDepositBox: 'Yes' })),
    scheduleB3: pctRows(pctsFor(b3.name), (i, p) => ({ description: `B3 ${p}%`, streetAddress: `${i} B3 Way`, cityStateZip: 'B3City, FL 50000', restricted: 'No', fullAssetValue: 1000, wardPercent: p, inSafeDepositBox: 'No' })),
    scheduleB4: pctRows(pctsFor(b4.name), (i, p) => ({ lenderName: `B4 Creditor ${p}%`, lenderAddress: `${i} B4 Ct`, relatedProperty: `B4 Property ${i}`, accountNumber: `B4-ACCT-${p}`, liabilityType: 'Loan', fullLiabilityBalance: 1000, wardPercent: p })),
    scheduleC2: pctRows(pctsFor(c2.name), (i, p) => ({ lawsuitDescription: `C2 Suit ${p}%`, caseNumber: `C2CASE${i}`, courtJurisdiction: 'Circuit Court', claimantName: `C2 Claimant ${i}`, claimantAddress: `${i} Bayshore Dr NE`, claimantCityStateZip: `St Petersburg, FL 3371${i}`, dateFiled: '2026-01-01', amountOfClaim: 1000, wardPercent: p })),
  };

  test('Ward\'s % cells hold fractions, formulas survive, B-4\'s account number and C-2\'s city/state/ZIP land on the form\'s fifth line', async ({ page }) => {
    test.setTimeout(150_000);
    await freshStartNoPassword(page);
    await createWard(page, 'Excel Boundary Ward', 'guardian');
    await fillMinimalValidGuardianWard(page);
    const xlsxPath = await exportGuardianWorkbook(page, FIXTURE, 'pg-60k-boundary');

    const wants: Array<[string, string]> = [];
    for (const r of a1.rows.slice(0, 3)) wants.push([a1.name, `H${r}`], [a1.name, `I${r}`]);
    for (const r of b2.rows.slice(0, 3)) wants.push([b2.name, `F${r}`], [b2.name, `G${r}`], [b2.name, `I${r}`]);
    for (const r of b3.rows.slice(0, 3)) wants.push([b3.name, `G${r}`], [b3.name, `H${r}`], [b3.name, `K${r}`]);
    for (const r of b4.rows.slice(0, 3)) wants.push([b4.name, `G${r}`], [b4.name, `H${r}`], [b4.name, `C${r + 3}`], [b4.name, `C${r + 4}`]);
    for (const r of c2.rows.slice(0, 3)) wants.push([c2.name, `G${r}`], [c2.name, `H${r}`], [c2.name, `C${r + 3}`], [c2.name, `C${r + 4}`]);
    const cells = await readExportedCells(page, xlsxPath, wants);
    const at = (sheet: string, addr: string) => cells[`${sheet}!${addr}`];

    // The court's Ward's % cells are formatted 0.00% (styles.xml numFmtId 10)
    // and its Ward's Value formulas multiply by them: 1000 x 0.5 = 500. The
    // exporter used to write the model's 0-100 number, so 1000 x 50 = 50,000
    // -- every ward value in the filed workbook was 100 times too large.
    // ExcelJS does not calculate, so the product the form WILL show on open is
    // verified separately: full value x the fraction actually in the cell,
    // compared with the app's own calculator for the same rows.
    const appTotals = await page.evaluate(() => (window as any).GuardianForms.testing.status.guardianTotals());
    const expectedTotals: Record<string, number> = { totalA1: 0, totalB2: 0, totalB3: 0, totalB4: 0, totalC2: 0 };
    const WANT: Record<string, number> = { totalA1: 1750, totalB2: 1500, totalB3: 1500, totalB4: 1500, totalC2: 1500 };
    ([[a1, 'H', 'I', 'totalA1'], [b2, 'F', 'G', 'totalB2'], [b3, 'G', 'H', 'totalB3'], [b4, 'G', 'H', 'totalB4'], [c2, 'G', 'H', 'totalC2']] as const).forEach(([pg, pctCol, valCol, totalKey]) => {
      const p = pg as typeof a1;
      const FRACTIONS = pctsFor(p.name).map((x) => x / 100);
      p.rows.slice(0, 3).forEach((r, i) => {
        const pctCell = at(p.name, `${pctCol}${r}`);
        expect(pctCell.value, `${p.name}!${pctCol}${r} should hold the fraction for ${FRACTIONS[i] * 100}%`).toBe(FRACTIONS[i]);
        // The template's percent format survives the write, so Excel shows "50.00%", not "0.5".
        expect(pctCell.numFmt, `${p.name}!${pctCol}${r} number format`).toMatch(/%/);
        const val = at(p.name, `${valCol}${r}`);
        expect(val.formula, `${p.name}!${valCol}${r} must still be the form's own product formula`).toMatch(/^[A-Z]+\d+\*[A-Z]+\d+$/);
        expect(val.formula, `${p.name}!${valCol}${r} must multiply by the percent cell just written`).toContain(`${pctCol}${r}`);
        expectedTotals[totalKey] += 1000 * (pctCell.value as number);
      });
    });
    // (0 or 25) + 50 + 100 percent of $1,000 each, both by the cells and by the app.
    for (const [key, sum] of Object.entries(expectedTotals)) {
      expect(sum, `${key} from the exported cells`).toBe(WANT[key]);
      expect(appTotals[key], `${key} from the app's calculator`).toBe(WANT[key]);
    }
    // The derived safe-deposit cells are the workbook's formulas, never written.
    expect(at(b2.name, `I${b2.rows[0]}`).formula).toMatch(/^IF\(H\d+="Yes",G\d+,0\)$/);
    expect(at(b3.name, `K${b3.rows[0]}`).formula).toMatch(/^IF\(J\d+="Yes"/);

    // B-4: account number on the fifth line of the block (the form's worked
    // example), fourth line left blank; C-2: city/state/ZIP on the fifth line.
    b4.rows.slice(0, 3).forEach((r, i) => {
      expect(at(b4.name, `C${r + 4}`).value, `B-4 account number line`).toBe(`B4-ACCT-${pctsFor(b4.name)[i]}`);
      expect(at(b4.name, `C${r + 3}`).value, `B-4 fourth line stays blank`).toBeNull();
    });
    c2.rows.slice(0, 3).forEach((r, i) => {
      expect(at(c2.name, `C${r + 3}`).value).toBe(`${i} Bayshore Dr NE`);
      expect(at(c2.name, `C${r + 4}`).value).toBe(`St Petersburg, FL 3371${i}`);
    });
  });

  test('a workbook exported before 60K (0-100 percentages, B-4 account on the fourth line) still imports correctly', async ({ page }) => {
    test.setTimeout(150_000);
    await freshStartNoPassword(page);
    await createWard(page, 'Legacy Excel Ward', 'guardian');
    await fillMinimalValidGuardianWard(page);
    const xlsxPath = await exportGuardianWorkbook(page, FIXTURE, 'pg-60k-legacy');

    // Rewrite the file the way the pre-60K exporter did, using the same ExcelJS.
    await page.addScriptTag({ url: 'lib/exceljs.min.js' });
    await page.waitForFunction(() => typeof (window as any).ExcelJS !== 'undefined', { timeout: 15_000 });
    const b64 = fs.readFileSync(xlsxPath).toString('base64');
    const legacyBytes = await page.evaluate(async ([data, a1Name, a1Row, b4Name, b4Row]) => {
      const ExcelJS = (window as any).ExcelJS;
      const wb = new ExcelJS.Workbook();
      const bin = atob(data as string);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      await wb.xlsx.load(bytes.buffer);
      wb.getWorksheet(a1Name as string).getCell(`H${a1Row}`).value = 50;       // legacy: 50 meant 50%
      const b4 = wb.getWorksheet(b4Name as string);
      b4.getCell(`C${(b4Row as number) + 3}`).value = 'LEGACY-ACCT';           // legacy: fourth line
      b4.getCell(`C${(b4Row as number) + 4}`).value = null;
      const buffer = await wb.xlsx.writeBuffer();
      return Array.from(new Uint8Array(buffer));
    }, [b64, a1.name, a1.rows[1], b4.name, b4.rows[1]] as const);
    const legacyPath = path.join(os.tmpdir(), `pg-60k-legacy-rewritten-${Date.now()}.xlsx`);
    fs.writeFileSync(legacyPath, Buffer.from(legacyBytes));

    await createWard(page, 'Legacy Import Target', 'guardian');
    await page.evaluate(() => (window as any).GuardianForms.testing.navigate('/'));
    await page.setInputFiles('input[type="file"][accept=".xlsx"]', legacyPath);
    await page.waitForFunction(() => Array.isArray((window as any).GuardianForms.testing.field('scheduleA1')) && (window as any).GuardianForms.testing.field('scheduleA1.length') > 0, undefined, { timeout: 15_000 });

    const imported = await page.evaluate(() => {
      const d = (window as any).GuardianForms.testing.snapshot().filing;
      return {
        a1Pct: d.scheduleA1.map((r: any) => r.wardPercent),
        b4Acct: d.scheduleB4.map((r: any) => r.accountNumber),
        b2Keys: Object.keys(d.scheduleB2[0]),
        c2City: d.scheduleC2.map((r: any) => r.claimantCityStateZip),
      };
    });
    // Row 2 was rewritten to the legacy 50; rows 1 and 3 keep the fractions 0.25 and 1.
    expect(imported.a1Pct).toEqual([25, 50, 100]);
    // Row 2's account number was moved to the legacy fourth line; the reader finds it there.
    expect(imported.b4Acct).toEqual(['B4-ACCT-0', 'LEGACY-ACCT', 'B4-ACCT-100']);
    // The stored safe-deposit amount is gone from imported rows.
    expect(imported.b2Keys).not.toContain('amountInSDB');
    expect(imported.c2City).toEqual(['St Petersburg, FL 33710', 'St Petersburg, FL 33711', 'St Petersburg, FL 33712']);
  });
});
