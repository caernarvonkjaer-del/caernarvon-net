import { describe, expect, test } from 'vitest';
import { readRepoSource, sliceBalancedFunction } from './support/legacy-source-extract.js';

// Milestone 57 review: Guardian Inventory's Excel export writes dates as
// 'MM/DD/YYYY' text (fmtD(), doSaveExcel()) but its importer's dt() only
// handled a Date object or an Excel serial number -- a string (exactly what
// re-opening the app's own exported file hands back) fell through to
// `v.substring(0,10)`, i.e. '10/01/2026' unchanged, and got stored where
// every other date field expects ISO 'YYYY-MM-DD'. Annual Accounting's own
// importer (gcDate() in excel.js) already normalized both formats; dt() is
// fixed here to do the same.
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
  test('fmtD() writes MM/DD/YYYY for an ISO date', () => {
    const fmtD = loadFmtD();
    expect(fmtD('2026-10-01')).toBe('10/01/2026');
  });

  test('dt() reads its own MM/DD/YYYY export back as ISO -- the reported regression', () => {
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
