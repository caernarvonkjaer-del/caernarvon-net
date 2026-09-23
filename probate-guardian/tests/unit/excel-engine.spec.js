import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect, vi } from 'vitest';
import {
  setCell,
  numValue,
  percentValue,
  sanitizeCellValue,
  saveWorkbookFile,
  toExcelSerialDate,
  setDateCell,
} from '../../src/core/excel/excel-engine.js';

// Milestone 51D rewrote this spec down to the module's surviving exports. It
// previously covered fourteen, ten of which had no production caller; see
// excel-engine.js's own header for what was deleted and why, including the
// reader-semantics divergence (0 vs '' for an unparseable cell) that makes those
// readers deliberately NOT interchangeable with the features' local ones.
//
// setCell, numValue and percentValue are covered here because 51D made them live:
// all three feature excel.js files now import setCell, and annual-accounting also
// imports numValue/percentValue, in place of byte-identical local closures.
describe('Excel Engine unit tests', () => {
  describe('numeric coercion helpers', () => {
    it('numValue parses floats or falls back to 0', () => {
      expect(numValue('123.45')).toBe(123.45);
      expect(numValue(67)).toBe(67);
      expect(numValue('')).toBe(0);
      expect(numValue(null)).toBe(0);
      expect(numValue('not a number')).toBe(0);
    });

    it('percentValue converts percentages to decimal fractions', () => {
      expect(percentValue(50)).toBe(0.5);
      expect(percentValue('25')).toBe(0.25);
      expect(percentValue(0.75)).toBe(0.75);
      expect(percentValue('0.15')).toBe(0.15);
      expect(percentValue('invalid')).toBe(0);
    });

    it('numValue and percentValue match the closures they replaced in annual-accounting/excel.js', () => {
      // The local ones were `v=>parseFloat(v)||0` and
      // `v=>{const p=parseFloat(v);return isNaN(p)?0:p>1?p/100:p;}`. Pinning the
      // equivalence is what makes 51D's adoption provably behavior-neutral rather
      // than merely asserted.
      const localNv = v => parseFloat(v) || 0;
      const localPv = (v) => { const p = parseFloat(v); return isNaN(p) ? 0 : p > 1 ? p / 100 : p; };
      for (const v of ['', null, undefined, 0, 1, 0.5, 50, 100, '0', '50', '0.25', 'x', '12.5%', -3, 1e3]) {
        expect(numValue(v), `numValue(${JSON.stringify(v)})`).toBe(localNv(v));
        expect(percentValue(v), `percentValue(${JSON.stringify(v)})`).toBe(localPv(v));
      }
    });
  });

  describe('sanitization and cell writing', () => {
    it('sanitizeCellValue prefixes formula-injection characters with a single quote', () => {
      expect(sanitizeCellValue('=SUM(A1:A2)')).toBe("'=SUM(A1:A2)");
      expect(sanitizeCellValue('+1')).toBe("'+1");
      expect(sanitizeCellValue('-1')).toBe("'-1");
      expect(sanitizeCellValue('@import')).toBe("'@import");
      expect(sanitizeCellValue('Plain text')).toBe('Plain text');
      expect(sanitizeCellValue(null)).toBe('');
    });

    it('sanitizeCellValue defers to legacy-app.js sanitizeForExcel when it is present', () => {
      // In the browser that global always exists, so this wrapper is a passthrough
      // and adopting core setCell cannot change what the features sanitized with.
      const spy = vi.fn(() => 'DELEGATED');
      const original = globalThis.window;
      globalThis.window = { sanitizeForExcel: spy };
      try {
        expect(sanitizeCellValue('=danger')).toBe('DELEGATED');
        expect(spy).toHaveBeenCalledWith('=danger');
      } finally {
        if (original === undefined) delete globalThis.window;
        else globalThis.window = original;
      }
    });

    // Milestone 51 widened both rules to OWASP's complete CSV-injection set and
    // pins them as EQUAL here. The previous version of this test hardcoded a copy
    // of the legacy rule, which would silently go stale the moment either side
    // changed -- so this reads the production regex out of legacy-app.js instead
    // of restating it.
    const OWASP_LEADING_CHARS = ['=', '+', '-', '@', '\t', '\r', '\n'];

    it('the production sanitizer guards OWASP\'s complete leading-character set', () => {
      const legacySource = fs.readFileSync(
        path.resolve(process.cwd(), 'src/legacy-app.js'), 'utf8',
      );
      const match = legacySource.match(/function sanitizeForExcel\(s\)\{\s*return (\/\^\[[^\]]+\]\/)\.test\(s\)/);
      expect(match, 'sanitizeForExcel() must still be findable in legacy-app.js').toBeTruthy();
      // eslint-disable-next-line no-eval
      const legacyRule = eval(match[1]);
      for (const ch of OWASP_LEADING_CHARS) {
        expect(legacyRule.test(ch + 'x'), `production rule must escape ${JSON.stringify(ch)}`).toBe(true);
      }
      // A leading space is NOT on the list and must not be escaped -- over-escaping
      // would put a stray apostrophe into a filed court document.
      expect(legacyRule.test(' =x')).toBe(false);
      expect(legacyRule.test('x')).toBe(false);
    });

    it('the Node fallback escapes exactly the same set as the production rule', () => {
      const original = globalThis.window;
      if (original !== undefined) delete globalThis.window;
      try {
        for (const ch of OWASP_LEADING_CHARS) {
          expect(sanitizeCellValue(ch + 'x'), `fallback must escape ${JSON.stringify(ch)}`).toBe("'" + ch + 'x');
        }
        expect(sanitizeCellValue(' =x')).toBe(' =x');
        expect(sanitizeCellValue('plain')).toBe('plain');
      } finally {
        if (original !== undefined) globalThis.window = original;
      }
    });

    it('setCell writes sanitized values or numbers to a worksheet cell', () => {
      const cells = {};
      const sheet = { getCell: (addr) => (cells[addr] = cells[addr] || { value: undefined }) };

      setCell(sheet, 'A1', 'Hello');
      expect(cells.A1.value).toBe('Hello');

      setCell(sheet, 'A2', 1234.5);
      expect(cells.A2.value).toBe(1234.5);

      setCell(sheet, 'A3', '');
      expect(cells.A3.value).toBeNull();

      setCell(sheet, 'A4', null);
      expect(cells.A4.value).toBeNull();

      setCell(sheet, 'A5', '=BAD()');
      expect(cells.A5.value).toBe("'=BAD()");
    });

    it('setCell tolerates a missing sheet instead of throwing', () => {
      // The local closures this replaced had no such guard; it is the only
      // behavioral difference, and it is strictly additive.
      expect(setCell(null, 'A1', 'x')).toBeNull();
      expect(setCell(undefined, 'A1', 'x')).toBeNull();
    });

    it('setCell returns the cell it wrote', () => {
      const cell = { value: undefined };
      const sheet = { getCell: () => cell };
      expect(setCell(sheet, 'B2', 'v')).toBe(cell);
    });
  });

  // Milestone 67C. The Annual template defines yesORno as a range in ANOTHER
  // workbook ([1]DropDownData!$A$6:$A$8). ExcelJS never writes the external-
  // link parts that would resolve it, so the exported file carried a pointer
  // to nothing and Excel opened every Annual/Final/Trust export with its
  // repair dialog. The filter keys on the target, not the name: Guardian's
  // yesORno is the same name pointing inside its own workbook, read by a live
  // dropdown, and must survive. tests/e2e/excel-defined-names.spec.ts proves
  // both against real exports; this pins the predicate itself.
  describe('saveWorkbookFile drops defined names that point outside the workbook', () => {
    const namesAfterSave = async (model) => {
      const names = { model };
      const workbook = { definedNames: names, xlsx: { writeBuffer: async () => new Uint8Array([1]) } };
      // No window: the function returns after writing the buffer, before the
      // browser-only download step.
      const original = globalThis.window;
      if (original !== undefined) delete globalThis.window;
      try {
        await saveWorkbookFile(workbook, 'x.xlsx');
      } finally {
        if (original !== undefined) globalThis.window = original;
      }
      return names.model.map((e) => e.name);
    };

    it("removes Annual's orphan and keeps every name the workbook resolves itself", async () => {
      expect(await namesAfterSave([
        { name: 'yesORno', ranges: ["'[1]DropDownData'!$A$6:$A$8"] },
        { name: 'Name_of_Ward', ranges: ["'PART I'!$C$3"] },
        { name: 'From_Date', ranges: ["'PART I'!$E$18"] },
        { name: '_xlnm.Print_Area', ranges: ["'PART XI'!$A$1:$L$40"], localSheetId: 57 },
      ])).toEqual(['Name_of_Ward', 'From_Date', '_xlnm.Print_Area']);
    });

    it("keeps Guardian's same-named yesORno because its target is internal", async () => {
      expect(await namesAfterSave([
        { name: 'yesORno', ranges: ['DropDownData!$A$6:$A$8'] },
        { name: 'countyname', ranges: ['DropDownData!$B$2:$B$68'] },
      ])).toEqual(['yesORno', 'countyname']);
    });

    it('still drops per-user custom-view names alongside', async () => {
      expect(await namesAfterSave([
        { name: 'Z_9E3F.wvu.PrintArea', ranges: ["'PART I'!$A$1:$L$50"], localSheetId: 0 },
        { name: 'Case_Number', ranges: ["'PART I'!$H$4"] },
      ])).toEqual(['Case_Number']);
    });
  });

  // Milestone 67E. Every date the app wrote into a filed workbook was text --
  // '2026-01-01' as a shared string -- in cells the court's form had
  // formatted for US dates, so the clerk saw ISO text where the form shows
  // 10/2/2015, and the column sorted as text. A filing date is a calendar
  // day, not an instant: the serial is computed from the year, month and day
  // alone, so no timezone can shift it in either direction (this repository
  // has already shipped and fixed one timezone-shifted date, commit 656cccf).
  // tests/e2e/excel-date-cells.spec.ts proves the result in the generated
  // files; this pins the arithmetic and the cell contract.
  describe('date cells are written as Excel serials (Milestone 67E)', () => {
    // Anchored on two facts, not on the helper's own formula: 2026-01-01 is
    // 20454 days after the Unix epoch, and Excel's 1900 system puts the epoch
    // at 25569; the court's own example row in the Annual template holds
    // 42279 for 2015-10-02.
    it('toExcelSerialDate turns a calendar day into the 1900-system serial', () => {
      expect(toExcelSerialDate('2026-01-01')).toBe(46023);
      expect(toExcelSerialDate('2015-10-02')).toBe(42279);
      expect(toExcelSerialDate('1899-12-31')).toBe(1);
      expect(toExcelSerialDate('2024-02-29')).toBe(45351);
      expect(toExcelSerialDate('2025-12-31')).toBe(46022);
    });

    it('resolves every accepted input form to the same day, with no timezone involved', () => {
      expect(toExcelSerialDate('2026-01-01T00:00:00.000Z')).toBe(46023);
      // A Date late in the UTC day is the case a local-timezone conversion
      // would shift backwards.
      expect(toExcelSerialDate(new Date('2026-01-01T23:59:59Z'))).toBe(46023);
      expect(toExcelSerialDate('01/01/2026')).toBe(46023);
      expect(toExcelSerialDate('1/1/2026')).toBe(46023);
    });

    it('honours the 1904 date system when the workbook uses it', () => {
      expect(toExcelSerialDate('2026-01-01', { date1904: true })).toBe(46023 - 1462);
    });

    it('returns null for anything that is not a calendar day', () => {
      for (const v of ['', null, undefined, 'abc', '2026-02-30', '2026-13-01', '2026-1', 0, 46023]) {
        expect(toExcelSerialDate(v), `toExcelSerialDate(${JSON.stringify(v)})`).toBeNull();
      }
    });

    const fakeSheet = (date1904 = false) => {
      const cells = {};
      return {
        cells,
        getCell: (addr) => (cells[addr] = cells[addr] || { value: undefined, numFmt: undefined }),
        workbook: { properties: { date1904 } },
      };
    };

    it('setDateCell writes the serial and gives an unformatted cell a date format', () => {
      // 'PART IV, V'!H31 and the court-order-date columns on SCH B-1/B-2/B-3
      // are General in the template; a serial in a General cell shows as
      // 46392, so the writer supplies the form's own mm/dd/yy;@.
      const sheet = fakeSheet();
      setDateCell(sheet, 'H31', '2027-01-05');
      expect(sheet.cells.H31.value).toBe(46392);
      expect(sheet.cells.H31.numFmt).toBe('mm/dd/yy;@');
    });

    it("setDateCell keeps the court's own date format when the cell has one", () => {
      const sheet = fakeSheet();
      sheet.getCell('F5').numFmt = 'm/d/yyyy';
      setDateCell(sheet, 'F5', '2025-01-01');
      expect(sheet.cells.F5.value).toBe(45658);
      expect(sheet.cells.F5.numFmt).toBe('m/d/yyyy');
    });

    it('setDateCell follows the workbook date system', () => {
      const sheet = fakeSheet(true);
      setDateCell(sheet, 'E18', '2026-01-01');
      expect(sheet.cells.E18.value).toBe(46023 - 1462);
    });

    it('setDateCell writes blank as an empty cell and unparseable text as sanitized text, as setCell would', () => {
      const sheet = fakeSheet();
      setDateCell(sheet, 'A1', '');
      expect(sheet.cells.A1.value).toBeNull();
      setDateCell(sheet, 'A2', null);
      expect(sheet.cells.A2.value).toBeNull();
      setDateCell(sheet, 'A3', 'abc');
      expect(sheet.cells.A3.value).toBe('abc');
      expect(sheet.cells.A3.numFmt).toBeUndefined();
      setDateCell(sheet, 'A4', '=x');
      expect(sheet.cells.A4.value).toBe("'=x");
    });

    it('setDateCell tolerates a missing sheet and returns the cell it wrote', () => {
      expect(setDateCell(null, 'A1', '2026-01-01')).toBeNull();
      const sheet = fakeSheet();
      expect(setDateCell(sheet, 'B2', '2026-01-01')).toBe(sheet.cells.B2);
    });

    // Introducing the helper is not the deliverable; routing every date write
    // through it is. The three per-exporter string formatters (annual's fD,
    // guardian's and simplified's fmtD) are deleted, so a date write that
    // bypassed setDateCell would have to reinvent one -- and this fails if
    // any comes back.
    it('the three exporters keep no string date formatter of their own', () => {
      for (const file of ['src/features/annual-accounting/excel.js', 'src/features/guardian-inventory/excel.js', 'src/features/simplified-accounting/excel.js']) {
        const src = fs.readFileSync(path.resolve(process.cwd(), file), 'utf8');
        expect(src, `${file} still declares or calls fD()/fmtD()`).not.toMatch(/\b(fD|fmtD)\s*=|\b(fD|fmtD)\s*\(/);
        expect(src, `${file} writes dates through setDateCell()`).toContain('setDateCell(');
      }
    });
  });
});
