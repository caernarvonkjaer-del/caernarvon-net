import { describe, expect, test } from 'vitest';
import { readRepoSource, sliceBalancedFunction } from './support/legacy-source-extract.js';

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
// fixes a live self-round-trip defect; the first test below now pins the
// reverted ISO exporter rather than 57F's MM/DD/YYYY one.
//
// Neither closure is exported (both are local to doSaveExcel()/
// parseInitialInventoryWorkbook() in guardian-inventory/excel.js, matching
// this repo's other per-file Excel date closures -- see
// date-truncation-helpers.spec.js), so they are sliced out of the real
// source and evaluated, the same technique bar-number.spec.js established
// for legacy-app.js closures.
const EXCEL_FILE = 'src/features/guardian-inventory/excel.js';

function loadFmtD() {
  const source = readRepoSource(EXCEL_FILE);
  const body = sliceBalancedFunction(source, 'const fmtD=s=>{');
  expect(body, 'fmtD not found (or braces unbalanced) in ' + EXCEL_FILE).toBeTruthy();
  return new Function(`${body}\nreturn fmtD;`)();
}

function loadDt() {
  const source = readRepoSource(EXCEL_FILE);
  const body = sliceBalancedFunction(source, 'const dt=(s,a)=>{');
  expect(body, 'dt not found (or braces unbalanced) in ' + EXCEL_FILE).toBeTruthy();
  // dt()'s only external reference is rawv(s,a); stub it as a plain lookup
  // so the sheet/cell shape ExcelJS normally provides doesn't need mocking.
  return new Function('rawv', `${body}\nreturn dt;`)((s, a) => s[a]);
}

describe('Guardian Inventory Excel date round-trip (gid, dateFiled, actionDate, dateCreated)', () => {
  // Pins the exporter format so a future change to it is a deliberate,
  // visible decision rather than a silent one -- which is exactly how 57F
  // broke the round-trip.
  test('fmtD() writes ISO, matching the reverted (pre-57F) exporter', () => {
    const fmtD = loadFmtD();
    expect(fmtD('2026-10-01')).toBe('2026-10-01');
  });

  test('dt() reads whatever fmtD() just wrote back as ISO -- the round-trip itself', () => {
    const fmtD = loadFmtD();
    const dt = loadDt();
    const exported = fmtD('2026-10-01');
    expect(dt({ F7: exported }, 'F7')).toBe('2026-10-01');
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
