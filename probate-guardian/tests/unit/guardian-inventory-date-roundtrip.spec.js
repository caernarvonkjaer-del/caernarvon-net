import { describe, expect, test } from 'vitest';
import { readRepoSource, sliceBalancedFunction } from './support/legacy-source-extract.js';
import { setDateCell, toExcelSerialDate } from '../../src/core/excel/excel-engine.js';

// Milestone 57 review: Guardian Inventory's importer dt() only handled a Date
// object or an Excel serial number. A date string fell through to
// `v.substring(0,10)` -- '10/01/2026' unchanged -- and got stored where every
// other date field expects ISO 'YYYY-MM-DD'. Annual Accounting's own importer
// (gcDate() in excel.js) already normalized both formats; dt() was fixed to
// do the same.
//
// The REVERT OF MILESTONE 57 reframes this fix without invalidating it. 57F
// had changed the exporter to write 'MM/DD/YYYY', which is what turned a
// latent importer weakness into a live round-trip bug: the app could not read
// its own output. Reverting 57F restores the ISO exporter, so that specific
// bug is gone by another route. dt()'s tolerance is kept anyway, because it is
// strictly more permissive than the exporter and costs nothing -- a workbook
// touched by Excel, produced by a clerk, or exported by an older build can
// still hand back US-format text. What is NOT claimed any more is that this
// fixes a live self-round-trip defect.
//
// Milestone 67E retired the per-file fmtD string formatter: the exporter now
// writes every date through the shared setDateCell() -- an Excel serial under
// a date format -- and ExcelJS hands that back on import as a Date at UTC
// midnight (or the bare serial, should the format ever be lost). The first
// test below pins THAT round trip, across the year boundary, in place of the
// ISO-text one it used to pin.
//
// dt() is not exported (it is local to parseInitialInventoryWorkbook() in
// guardian-inventory/excel.js), so it is sliced out of the real source and
// evaluated, the same technique bar-number.spec.js established for
// legacy-app.js closures.
const EXCEL_FILE = 'src/features/guardian-inventory/excel.js';

function loadDt() {
  const source = readRepoSource(EXCEL_FILE);
  const body = sliceBalancedFunction(source, 'const dt=(s,a)=>{');
  expect(body, 'dt not found (or braces unbalanced) in ' + EXCEL_FILE).toBeTruthy();
  // dt()'s only external reference is rawv(s,a); stub it as a plain lookup
  // so the sheet/cell shape ExcelJS normally provides doesn't need mocking.
  return new Function('rawv', `${body}\nreturn dt;`)((s, a) => s[a]);
}

describe('Guardian Inventory Excel date round-trip (gid, dateFiled, actionDate, dateCreated)', () => {
  // Pins the exporter's output and the importer's reading of it together, so
  // a future change to either side is a deliberate, visible decision rather
  // than a silent one -- which is exactly how 57F broke the round-trip.
  test('the exporter writes a serial and dt() reads it back as the same ISO day -- the round-trip itself', () => {
    const dt = loadDt();
    const cells = {};
    const sheet = {
      getCell: (a) => (cells[a] = cells[a] || { value: undefined, numFmt: 'mm/dd/yy;@' }),
      workbook: { properties: { date1904: false } },
    };
    for (const iso of ['2026-10-01', '2025-12-31', '2026-01-01']) {
      setDateCell(sheet, 'F7', iso);
      const serial = cells.F7.value;
      expect(serial, `${iso} is written as its serial`).toBe(toExcelSerialDate(iso));
      // What ExcelJS hands back under a date format: a Date at UTC midnight,
      // built the way its excelToDate() builds it.
      expect(dt({ F7: new Date(Math.round(24 * (serial - 25569) * 3600 * 1000)) }, 'F7')).toBe(iso);
      // And the bare serial, should the format ever be lost.
      expect(dt({ F7: serial }, 'F7')).toBe(iso);
    }
  });

  test('dt() still accepts an ISO string, a Date, and a two-digit year', () => {
    const dt = loadDt();
    expect(dt({ F7: '2026-10-01' }, 'F7')).toBe('2026-10-01');
    expect(dt({ F7: new Date('2026-10-01T00:00:00Z') }, 'F7')).toBe('2026-10-01');
    expect(dt({ F7: '10/1/26' }, 'F7')).toBe('2026-10-01');
  });

  test('dt() returns null for blank or unparseable text instead of a truncated garbage string', () => {
    const dt = loadDt();
    expect(dt({}, 'F7')).toBeNull();
    expect(dt({ F7: '' }, 'F7')).toBeNull();
    expect(dt({ F7: 'not a date' }, 'F7')).toBeNull();
  });
});
