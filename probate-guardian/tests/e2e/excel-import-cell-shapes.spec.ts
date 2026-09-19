import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { freshStartNoPassword, createSimplifiedWard } from './support/target';

// Milestone 53B: the non-vacuous gate for the Excel IMPORT direction.
//
// Every pre-existing Excel round-trip spec (annual-mount, simplified-mount,
// guardian-inventory-mount, guardian-inventory-excel-schedule-layout) imports
// a workbook THIS APP EXPORTED, and setCell() writes only null, numbers, or
// sanitized strings. Those workbooks therefore contain no formula cells, no
// rich text, no hyperlinks, no #REF!, and no native Date values -- they
// exercise exactly one branch of unwrapCellValue (the primitive passthrough).
// A court clerk's template, or a workbook a filer edited by hand in Excel,
// contains all of them; that is the documented reason unwrapCellValue exists.
//
// 51D's commit message records the trap this avoids: its first workbook gate
// "reported identical even with percentValue deliberately broken" because the
// fixture never reached the code under test. So this spec builds a workbook
// containing the shapes the app never writes, at the real template addresses
// Simplified Accounting's importer reads, and asserts each lands in window.D
// correctly. It runs identically before and after the cell-reader cluster
// moves to src/core/excel/cell-reader.js -- it was confirmed green against the
// legacy legacy-app.js implementation first (step B1), which is what makes it
// evidence about the move rather than about the new module.
//
// Simplified Accounting is the vehicle: smallest import surface, and its Cover
// reads go straight through readCellText() with no feature-local wrapper.

const SHEET = 'PARTS I, II ';

// Each row: the address simplified-accounting/excel.js reads, the window.D
// field it writes, the ExcelJS cell shape to plant, and the expected result.
const EXPECTED = {
  wardName: 'Eleanor Whitfield',
  caseNumber: '26-001234',
  attorney: 'Daniel R. Okafor, Esq.',
  gid: '2026-03-15',
  guardian: '',
  county: 'Pinellas',
};

test.describe('Excel import: cell shapes the app never exports (Milestone 53B)', () => {
  test('richText, formula, hyperlink, native Date, error and padded-string cells all import correctly', async ({ page }) => {
    await freshStartNoPassword(page);
    await createSimplifiedWard(page, 'Cell Shapes Import Target');
    await page.evaluate(() => (window as any).navigate('/'));

    // ExcelJS is lazily loaded by the app and is not bridged onto window
    // (Milestone 51E deleted window.getExcelJS). Load the same vendored copy
    // the app itself uses so the fixture is built by the identical library
    // version that will parse it.
    await page.addScriptTag({ url: 'lib/exceljs.min.js' });
    await page.waitForFunction(() => typeof (window as any).ExcelJS !== 'undefined', { timeout: 15_000 });

    const bytes = await page.evaluate(async (sheetName) => {
      const ExcelJS = (window as any).ExcelJS;
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet(sheetName);

      // C4 -> wardName: rich text, two runs, second one bold.
      ws.getCell('C4').value = { richText: [{ text: 'Eleanor ' }, { text: 'Whitfield', font: { bold: true } }] };
      // H4 -> caseNumber: a formula cell with a cached result.
      ws.getCell('H4').value = { formula: '"26-"&"001234"', result: '26-001234' };
      // D15 -> attorney: a hyperlink; the display text is what must import.
      // (D15/D16 are the court form's real Attorney/Guardian value cells; the
      // importer used to read D16/D17, one row low -- see D11.)
      ws.getCell('D15').value = { text: 'Daniel R. Okafor, Esq.', hyperlink: 'mailto:okafor@example.test' };
      // F4 -> gid: a native Date. The importer then applies .substring(0,10),
      // which only yields a correct date if readCellText normalized through
      // fmtDate(toISOString()) rather than Date#toString().
      ws.getCell('F4').value = new Date(Date.UTC(2026, 2, 15));
      // D16 -> guardian: an error cell. Must import blank, never "[object
      // Object]" or "#REF!" into a filed document's guardian field.
      ws.getCell('D16').value = { error: '#REF!' };
      // G2 -> county: a plain string with surrounding whitespace.
      ws.getCell('G2').value = '   Pinellas   ';

      const buffer = await wb.xlsx.writeBuffer();
      return Array.from(new Uint8Array(buffer));
    }, SHEET);

    const xlsxPath = path.join(os.tmpdir(), `pg-53b-cell-shapes-${Date.now()}.xlsx`);
    fs.writeFileSync(xlsxPath, Buffer.from(bytes));

    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));

    await page.setInputFiles('input[type="file"][accept=".xlsx"]', xlsxPath);
    await page.waitForFunction(
      (expected) => (window as any).D.wardName === expected,
      EXPECTED.wardName,
      { timeout: 15_000 },
    );

    const imported = await page.evaluate(() => ({
      wardName: (window as any).D.wardName,
      caseNumber: (window as any).D.caseNumber,
      attorney: (window as any).D.attorney,
      gid: (window as any).D.gid,
      guardian: (window as any).D.guardian,
      county: (window as any).D.county,
    }));

    // richText: both runs joined, no "[object Object]".
    expect(imported.wardName, 'richText cell -> joined runs').toBe(EXPECTED.wardName);
    // formula: the cached result, not the formula text.
    expect(imported.caseNumber, 'formula cell -> cached result').toBe(EXPECTED.caseNumber);
    // hyperlink: the display text, not the mailto: URL.
    expect(imported.attorney, 'hyperlink cell -> display text').toBe(EXPECTED.attorney);
    // native Date: normalized through fmtDate(toISOString()); a Date#toString()
    // prefix would be "Sun Mar 15" and a timezone shift would give 2026-03-14.
    expect(imported.gid, 'native Date cell -> ISO yyyy-mm-dd').toBe(EXPECTED.gid);
    // error cell: blank, never the error token or "[object Object]".
    expect(imported.guardian, 'error cell -> blank').toBe(EXPECTED.guardian);
    expect(imported.guardian).not.toContain('REF');
    expect(imported.guardian).not.toContain('object');
    // padded string: trimmed.
    expect(imported.county, 'padded string -> trimmed').toBe(EXPECTED.county);

    // No value anywhere may have stringified an object.
    for (const [field, value] of Object.entries(imported)) {
      expect(String(value), `${field} must never be a stringified object`).not.toContain('[object Object]');
    }

    expect(errors, 'no uncaught page errors during import').toEqual([]);
  });

  test('the cell-reader cluster is gone from window at runtime', async ({ page }) => {
    await freshStartNoPassword(page);
    // Static removal from legacy-app.js is checked by cell-reader.spec.js's
    // source scan; this is the only check that would catch a copy living in an
    // inline <script> in index.html or a fragment. None exists today -- this
    // pins that.
    const stillGlobal = await page.evaluate(() =>
      ['fmtDate', 'fmtDateCard', 'unwrapCellValue', 'readCellText'].filter((n) => n in window),
    );
    expect(stillGlobal).toEqual([]);
  });
});
