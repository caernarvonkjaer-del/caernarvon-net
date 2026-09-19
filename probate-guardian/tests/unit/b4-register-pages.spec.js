import { describe, expect, test } from 'vitest';
import {
  isB4RegisterSheetName,
  b4PageNumber,
  parseB4SummaryFormula,
  rebuildB4SummaryFormula,
  planB4PagesToKeep,
  pruneB4RegisterPages,
  B4_SUMMARY_SHEET,
  B4_CATEGORY_ROWS,
} from '../../src/core/excel/b4-register-pages.js';

const P = 'SCH B-4 OTHER DISB p';

// The real shape, taken verbatim from the shipped template's I10 (truncated to
// the first block for readability). Note the per-page column differences --
// p2 uses AK8 where its continuation pages use AM8 -- which is exactly why the
// references are read from the formula instead of being reconstructed.
const REAL_I10 = `SUM('${P}2'!AK8+'${P}3'!AM8+'${P}4'!AM8+'${P}5'!AM8+'${P}6'!AM8+'${P}7'!AM8+'${P}8'!AP7)`;

describe('B-4 register sheet naming', () => {
  test.each([
    [`${P}2`, true, 2],
    [`${P}19`, true, 19],
    [`${P}51`, true, 51],
    [B4_SUMMARY_SHEET, false, NaN],
    ['SCH A INCOME p1', false, NaN],
    [`${P}`, false, NaN],
    [`${P}2a`, false, NaN],
  ])('%s -> register=%s page=%s', (name, isReg, num) => {
    expect(isB4RegisterSheetName(name)).toBe(isReg);
    if (Number.isNaN(num)) expect(b4PageNumber(name)).toBeNaN();
    else expect(b4PageNumber(name)).toBe(num);
  });

  // The summary page shares the prefix and must never be treated as a
  // register page -- removing it would take the category totals with it.
  test('the summary page is not a register page', () => {
    expect(isB4RegisterSheetName(B4_SUMMARY_SHEET)).toBe(false);
  });
});

describe('parsing the summary category formula', () => {
  test('splits the real formula into per-page references', () => {
    const refs = parseB4SummaryFormula(REAL_I10);
    expect(refs).toHaveLength(7);
    expect(refs[0]).toEqual({ sheet: `${P}2`, ref: 'AK8' });
    expect(refs[1]).toEqual({ sheet: `${P}3`, ref: 'AM8' });
    expect(refs[6]).toEqual({ sheet: `${P}8`, ref: 'AP7' });
  });

  // Anything that is not a plain SUM of sheet-qualified references is a shape
  // this module does not understand, and rewriting it could silently change a
  // court filing's arithmetic.
  test.each([
    ['', 'empty'],
    [null, 'null'],
    ["SUM('X'!A1+5)", 'a literal operand'],
    ["SUM('X'!A1+A2)", 'an unqualified local reference'],
    ["SUM('X'!A1)+SUM('Y'!A1)", 'two SUMs'],
    ["SUMIF('X'!A1,1)", 'a different function'],
    ["SUM('X'!A1-'Y'!A1)", 'subtraction rather than addition'],
  ])('refuses to parse %s (%s)', (formula) => {
    expect(parseB4SummaryFormula(formula)).toEqual([]);
  });
});

describe('rebuilding the summary formula', () => {
  test('keeps only the surviving pages, preserving each page\'s own cell', () => {
    const out = rebuildB4SummaryFormula(REAL_I10, [`${P}2`, `${P}8`]);
    expect(out).toBe(`SUM('${P}2'!AK8+'${P}8'!AP7)`);
  });

  test('returns null when nothing was dropped, so the cell is left alone', () => {
    const all = [2, 3, 4, 5, 6, 7, 8].map(n => `${P}${n}`);
    expect(rebuildB4SummaryFormula(REAL_I10, all)).toBeNull();
  });

  test('returns null rather than producing an empty SUM()', () => {
    expect(rebuildB4SummaryFormula(REAL_I10, [])).toBeNull();
    expect(rebuildB4SummaryFormula(REAL_I10, ['SCH A INCOME p1'])).toBeNull();
  });

  test('returns null for a formula shape it does not understand', () => {
    expect(rebuildB4SummaryFormula("SUM('X'!A1+2)", ['X'])).toBeNull();
  });
});

describe('planning which pages to keep', () => {
  const blocks = [
    { pages: [2, 3, 4, 5, 6, 7] },
    { pages: [8, 9, 10, 11] },
    { pages: [12, 13, 14, 15] },
    { pages: [16, 17, 18, 19] },
  ];

  test('an empty filing still keeps block 1\'s first page', () => {
    expect(planB4PagesToKeep([], blocks)).toEqual([2]);
  });

  test('a single short account keeps only its first page', () => {
    expect(planB4PagesToKeep([2], blocks)).toEqual([2]);
  });

  test('an account that overflows keeps its continuation pages too', () => {
    expect(planB4PagesToKeep([2, 3, 4], blocks)).toEqual([2, 3, 4]);
  });

  // The block's first page carries the bank name and account number. Keeping
  // rows without it would file those disbursements under no account at all.
  test('a later block keeps its header page even when rows start further in', () => {
    expect(planB4PagesToKeep([9], blocks)).toEqual([2, 8, 9]);
  });

  test('several accounts keep each of their own header pages', () => {
    expect(planB4PagesToKeep([2, 8, 12, 16], blocks)).toEqual([2, 8, 12, 16]);
  });

  test('unused blocks are dropped entirely', () => {
    expect(planB4PagesToKeep([2, 12], blocks)).toEqual([2, 12]);
  });
});

/** Minimal ExcelJS stand-in: only what pruneB4RegisterPages actually touches. */
function fakeWorkbook(registerPages, { formulaFor } = {}) {
  const made = (name, id) => ({
    name,
    id,
    _cells: {},
    getCell(addr) {
      if (!this._cells[addr]) this._cells[addr] = { formula: undefined, value: undefined };
      return this._cells[addr];
    },
  });
  const summary = made(B4_SUMMARY_SHEET, 1);
  for (const row of B4_CATEGORY_ROWS) {
    const f = formulaFor
      ? formulaFor(row)
      : `SUM(${registerPages.map(n => `'${P}${n}'!AM${row}`).join('+')})`;
    summary._cells[`I${row}`] = { formula: f, value: undefined };
  }
  const sheets = [summary, ...registerPages.map((n, i) => made(`${P}${n}`, i + 2))];
  return {
    worksheets: sheets,
    getWorksheet(name) { return sheets.find(s => s.name === name); },
    removeWorksheet(id) {
      const i = sheets.findIndex(s => s.id === id);
      if (i >= 0) sheets.splice(i, 1);
    },
  };
}

describe('pruning a workbook', () => {
  test('removes unused pages and rewrites all 18 category totals', () => {
    const wb = fakeWorkbook([2, 3, 4, 5]);
    const res = pruneB4RegisterPages(wb, [2, 3]);
    expect(res.removed).toEqual([`${P}4`, `${P}5`]);
    expect(res.rewritten).toEqual(B4_CATEGORY_ROWS);
    expect(res.skipped).toBeNull();
    expect(wb.worksheets.map(w => w.name)).toEqual([B4_SUMMARY_SHEET, `${P}2`, `${P}3`]);
    const rebuilt = wb.getWorksheet(B4_SUMMARY_SHEET)._cells.I10.value.formula;
    expect(rebuilt).toBe(`SUM('${P}2'!AM10+'${P}3'!AM10)`);
    expect(rebuilt).not.toContain(`${P}4`);
  });

  test('does nothing when every page is in use', () => {
    const wb = fakeWorkbook([2, 3]);
    const res = pruneB4RegisterPages(wb, [2, 3]);
    expect(res.removed).toEqual([]);
    expect(res.rewritten).toEqual([]);
    expect(wb.worksheets).toHaveLength(3);
  });

  // The two halves are not independently valid: removing pages while leaving a
  // formula that still names them produces #REF! in a filed document.
  test('removes nothing when a category formula cannot be rebuilt safely', () => {
    const wb = fakeWorkbook([2, 3, 4], {
      formulaFor: (row) => (row === 17 ? "SUM('X'!A1+99)" : `SUM('${P}2'!AM${row}+'${P}3'!AM${row}+'${P}4'!AM${row})`),
    });
    const res = pruneB4RegisterPages(wb, [2]);
    expect(res.skipped).toMatch(/unexpected shape/);
    expect(res.removed).toEqual([]);
    expect(wb.worksheets).toHaveLength(4);
    expect(wb.getWorksheet(B4_SUMMARY_SHEET)._cells.I10.value).toBeUndefined();
  });

  test('refuses to remove every register page', () => {
    const wb = fakeWorkbook([2, 3]);
    const res = pruneB4RegisterPages(wb, []);
    expect(res.skipped).toMatch(/every register page/);
    expect(wb.worksheets).toHaveLength(3);
  });

  test('is a no-op when the summary page is absent', () => {
    const wb = fakeWorkbook([2, 3]);
    wb.removeWorksheet(1);
    const res = pruneB4RegisterPages(wb, [2]);
    expect(res.skipped).toMatch(/summary page not found/);
    expect(wb.worksheets.map(w => w.name)).toEqual([`${P}2`, `${P}3`]);
  });

  test('never removes the summary page itself', () => {
    const wb = fakeWorkbook([2, 3, 4]);
    pruneB4RegisterPages(wb, [2]);
    expect(wb.getWorksheet(B4_SUMMARY_SHEET)).toBeTruthy();
  });
});
