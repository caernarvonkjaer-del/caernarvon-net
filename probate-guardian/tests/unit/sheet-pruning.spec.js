import { describe, expect, test } from 'vitest';
import {
  parseAdditiveFormula,
  rebuildAdditiveFormula,
  planSheetPrune,
  pruneSheets,
} from '../../src/core/excel/sheet-pruning.js';

// The formulas below are taken verbatim from the embedded Annual Accounting
// template. They are the reason this module exists and the reason it is
// conservative: each schedule's p1 total reaches into its own continuation
// pages, so deleting a blank page without rebuilding them puts #REF! into a
// filed financial document.
const SCH_A = "H41+'SCH A INCOME p2'!H38";
const SCH_D1 = "J58+'SCH D-1 CASH p2'!J56+'SCH D-1 CASH p3'!J56+'SCH D-1 CASH p4'!J56";
const SCH_C = "F55+G55+'SCH C CAPITAL ADJ p2'!F48+'SCH C CAPITAL ADJ p2'!G48+'SCH C CAPITAL ADJ p3'!F48";
const B4_SUM = "SUM('SCH B-4 OTHER DISB p2'!AK8+'SCH B-4 OTHER DISB p3'!AM8)";

describe('parsing additive formulas', () => {
  test('a bare chain of local and qualified references', () => {
    const p = parseAdditiveFormula(SCH_A);
    expect(p.wrapped).toBe(false);
    expect(p.operands).toEqual([
      { sheet: null, text: 'H41' },
      { sheet: 'SCH A INCOME p2', text: "'SCH A INCOME p2'!H38" },
    ]);
  });

  test('a SUM-wrapped chain', () => {
    const p = parseAdditiveFormula(B4_SUM);
    expect(p.wrapped).toBe(true);
    expect(p.operands).toHaveLength(2);
    expect(p.operands[0].sheet).toBe('SCH B-4 OTHER DISB p2');
  });

  test('several local operands before the qualified ones', () => {
    const p = parseAdditiveFormula(SCH_C);
    expect(p.operands.slice(0, 2)).toEqual([
      { sheet: null, text: 'F55' },
      { sheet: null, text: 'G55' },
    ]);
    expect(p.operands).toHaveLength(5);
  });

  // Anything it cannot fully account for must be refused: silently rewriting a
  // formula this does not understand would change what a court is told.
  test.each([
    ['', 'empty'],
    [null, 'null'],
    ['H41-\'X\'!H38', 'subtraction'],
    ["H41+5", 'a literal operand'],
    ["SUM(A1:A9)", 'a range'],
    ["IF(A1>0,'X'!B1,0)", 'a conditional'],
    ["SUM('X'!A1+ROUND('Y'!B1,2))", 'a nested call'],
    ["'X'!A1:B2", 'a qualified range'],
    ["H41+", 'a dangling operator'],
  ])('refuses %s (%s)', (formula) => {
    expect(parseAdditiveFormula(formula)).toBeNull();
    expect(rebuildAdditiveFormula(formula, () => true)).toBeNull();
  });
});

describe('rebuilding without the doomed pages', () => {
  test('drops one continuation page and keeps the local operand', () => {
    expect(rebuildAdditiveFormula(SCH_A, (s) => s === 'SCH A INCOME p2')).toBe('H41');
  });

  test('drops several pages named in one expression', () => {
    const doomed = new Set(['SCH D-1 CASH p2', 'SCH D-1 CASH p3', 'SCH D-1 CASH p4']);
    expect(rebuildAdditiveFormula(SCH_D1, (s) => doomed.has(s))).toBe('J58');
  });

  test('keeps the pages that survive', () => {
    expect(rebuildAdditiveFormula(SCH_D1, (s) => s === 'SCH D-1 CASH p3'))
      .toBe("J58+'SCH D-1 CASH p2'!J56+'SCH D-1 CASH p4'!J56");
  });

  test('preserves the SUM wrapper when there was one', () => {
    expect(rebuildAdditiveFormula(B4_SUM, (s) => s === 'SCH B-4 OTHER DISB p3'))
      .toBe("SUM('SCH B-4 OTHER DISB p2'!AK8)");
  });

  test('returns null when nothing is dropped, so the cell is untouched', () => {
    expect(rebuildAdditiveFormula(SCH_D1, () => false)).toBeNull();
  });

  test('returns null rather than emptying a formula', () => {
    expect(rebuildAdditiveFormula("'X'!A1+'Y'!B2", () => true)).toBeNull();
  });
});

/** Minimal ExcelJS stand-in: only what the pruner touches. */
function fakeWorkbook(spec) {
  const sheets = Object.entries(spec).map(([name, cells], i) => ({
    name,
    id: i + 1,
    cells,
    eachRow(_opts, fn) {
      for (const [address, formula] of Object.entries(this.cells)) {
        const cell = this.cells[address] && typeof this.cells[address] === 'object'
          ? this.cells[address]
          : (this.cells[address] = { address, formula, value: undefined });
        fn({ eachCell: (_o, cb) => cb(cell) });
      }
    },
  }));
  return {
    worksheets: sheets,
    getWorksheet(name) { return sheets.find(s => s.name === name); },
    removeWorksheet(id) {
      const i = sheets.findIndex(s => s.id === id);
      if (i >= 0) sheets.splice(i, 1);
    },
  };
}

describe('planning and applying a prune', () => {
  test('removes blank continuation pages and rewrites their schedule total', () => {
    const wb = fakeWorkbook({
      'SCH D-1 CASH p1': { J59: SCH_D1 },
      'SCH D-1 CASH p2': {},
      'SCH D-1 CASH p3': {},
      'SCH D-1 CASH p4': {},
    });
    const res = pruneSheets(wb, ['SCH D-1 CASH p2', 'SCH D-1 CASH p3', 'SCH D-1 CASH p4']);
    expect(res.removed).toEqual(['SCH D-1 CASH p2', 'SCH D-1 CASH p3', 'SCH D-1 CASH p4']);
    expect(res.kept).toEqual([]);
    expect(wb.worksheets.map(w => w.name)).toEqual(['SCH D-1 CASH p1']);
    expect(wb.getWorksheet('SCH D-1 CASH p1').cells.J59.value).toEqual({ formula: 'J58' });
  });

  // The whole point of the conservatism: an unrecognised formula keeps its
  // page rather than breaking the total.
  test('keeps a page whose referencing formula cannot be rebuilt', () => {
    const wb = fakeWorkbook({
      'SCH X p1': { A1: "IF('SCH X p2'!B1>0,1,0)" },
      'SCH X p2': {},
    });
    const res = pruneSheets(wb, ['SCH X p2']);
    expect(res.removed).toEqual([]);
    expect(res.kept).toEqual([
      { sheet: 'SCH X p2', reason: 'formula at SCH X p1!A1 cannot be rebuilt safely' },
    ]);
    expect(wb.worksheets).toHaveLength(2);
  });

  // One formula naming several candidates: if it cannot be rebuilt, all of
  // them have to stay, not just the first one noticed.
  test('an unsafe shared formula rescues every page it names', () => {
    const wb = fakeWorkbook({
      'S p1': { A1: "MAX('S p2'!A1,'S p3'!A1)" },
      'S p2': {},
      'S p3': {},
    });
    const res = pruneSheets(wb, ['S p2', 'S p3']);
    expect(res.removed).toEqual([]);
    expect(res.kept.map(k => k.sheet).sort()).toEqual(['S p2', 'S p3']);
  });

  test('a formula living on a doomed sheet does not block its own removal', () => {
    const wb = fakeWorkbook({
      'SCH Y p1': { A1: "A2+'SCH Y p2'!A1" },
      'SCH Y p2': { Z9: 'IF(A1,1,0)' },
    });
    const res = pruneSheets(wb, ['SCH Y p2']);
    expect(res.removed).toEqual(['SCH Y p2']);
    expect(wb.getWorksheet('SCH Y p1').cells.A1.value).toEqual({ formula: 'A2' });
  });

  test('candidates that are not in the workbook are ignored', () => {
    const wb = fakeWorkbook({ 'SCH Z p1': { A1: 'A2' } });
    const res = pruneSheets(wb, ['SCH Z p9']);
    expect(res.removed).toEqual([]);
    expect(wb.worksheets).toHaveLength(1);
  });

  test('an empty candidate list changes nothing', () => {
    const wb = fakeWorkbook({ 'SCH Z p1': { A1: 'A2' }, 'SCH Z p2': {} });
    expect(pruneSheets(wb, []).removed).toEqual([]);
    expect(wb.worksheets).toHaveLength(2);
  });
});
