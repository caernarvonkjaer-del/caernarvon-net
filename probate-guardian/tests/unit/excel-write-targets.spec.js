import { describe, expect, test, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { templateSheets } from './support/template-cells.js';

vi.mock('../../src/core/navigation/router.js', () => ({ navigate: () => {}, renderPage: () => {}, getCurrentPage: () => '/' }));
globalThis.window = globalThis.window || globalThis;
const { contractTargets } = await import('../../src/core/excel/workbook-contract/engine.js');
const { GUARDIAN_CONTRACT } = await import('../../src/core/excel/workbook-contract/guardian.js');
const { ANNUAL_CONTRACT } = await import('../../src/core/excel/workbook-contract/annual.js');

// Every setCell() target in every exporter, checked against the court's
// template. This is the guard for a defect class that shipped three times.
//
// Twice the app wrote a value onto the cell holding a printed LABEL, leaving
// the form's real input box empty: Simplified's Part I identity block, and
// Guardian's PART IV/V/VI signature and bond pages. Once it wrote onto a cell
// the workbook computes, destroying propagation. And once it wrote to a cell
// inside a merge, which ExcelJS silently redirects to the merge master --
// Simplified's starting balance landed on the "Income" banner that way, while
// Line 1 stayed blank and Line 8 came out negative.
//
// All of it survived every suite because each importer read the same wrong
// cell. The round trips agreed with a broken exporter perfectly. So this looks
// at the template instead and asks, for each address the exporter writes:
//
//   LABEL    a shared string sits there -- unless the cell carries a dropdown,
//            in which case the string is a default the app is meant to replace
//   FORMULA  the workbook computes it; writing a literal freezes it
//   COVERED  inside a merge but not its master; the write lands elsewhere
//
// ALLOWED below is the deliberate exceptions list, each with the reason. A new
// entry there is a decision, not a formality: it means the app is knowingly
// overwriting something the court's form put in that cell.
//
// BLIND SPOT (Milestone 72A): this reads only the addresses typed literally in
// a call -- setCell(p1, 'C5', ...). Writes whose address is built while the
// export runs (`F${b+1}`, a page table's row, a field table's box) are
// invisible to it: 186 of the three exporters' 362 set(Date)Cell calls, counted
// 2026-10-02. The Inventory's PART III loop was one of them, and it wrote over
// fifteen of the form's captions for its whole life with this test passing.
// tests/e2e/excel-form-field-placement.spec.ts closes the gap: it checks every
// write the exporters make, however its address is built, in the exported file.
//
// Milestone 73T part 2: an exporter that writes through its workbook contract
// (src/core/excel/workbook-contract/) is read from the contract instead --
// every address it can write, the built ones included, so for those forms the
// blind spot is gone. The Inventory's is the first (part 2), the Annual
// family's the second (part 3).
const CONTRACT_EXPORTERS = { guardian: GUARDIAN_CONTRACT, annual: ANNUAL_CONTRACT };

const EXPORTERS = [
  ['annual', 'src/features/annual-accounting/excel.js'],
  ['guardian', 'src/features/guardian-inventory/excel.js'],
  ['simplified', 'src/features/simplified-accounting/excel.js'],
];

/**
 * Targets that legitimately overwrite something in the template.
 * Key: `${template}|${sheet}|${cell}`.
 */
const ALLOWED = new Map([
  // Dropdown defaults. The template ships a starting option and the app
  // replaces it with the filer's answer; each of these cells carries a
  // dataValidation list, which is what distinguishes a default from a label.
  ['annual|PART I|H4', 'filing type: dropdown default'],
  ['annual|PART I|J6', 'amended form: dropdown default'],
  ['guardian|SUMMARY I |I8', 'amended form: dropdown default'],
  ['guardian|SUMMARY I |D26', 'safe deposit box: dropdown default'],
  ['guardian|SUMMARY I |H26', 'safe deposit box filed: dropdown default'],
  // Guardian #1's name box is the form's own ='SUMMARY I '!D23. DECIDED
  // 2026-10-01: written over, as the Annual's F25 is, with the same advisory
  // when the two differ. Invisible here until 73T part 2 read the Inventory
  // from its contract (the PART III loop built its addresses).
  ['guardian|PART III|F8', 'guardian 1 name: form links it to the Cover; overwrite allowed (2026-10-01), advisory on divergence'],
  // The one cell the court's form computes for itself that the app still
  // writes a literal over. DECIDED 2026-09-19 (Alan, by name): conform to the
  // form, allow the overwrite, warn on it -- src/core/filing/form-derived-
  // fields.js raises an advisory when the entered value differs from the one
  // the form derives, surfaced on the print page through the existing
  // renderOutputAdvisories() panel. See tests/unit/form-derived-fields.spec.js.
  //
  // 'PART IX '!E21/G21 (the bond period, = From_Date / = To_Date) were on
  // this list until Milestone 67D. DECIDED 2026-09-23: the bond period IS the
  // accounting period, so the app no longer writes those two cells and the
  // form's formulas fill them. The advisory on a differing typed value stays;
  // the allowance does not, so a reintroduced write fails this test.
  ['annual|PART II, III|F25', 'guardian 1 name: form links it to PART I; overwrite allowed, advisory on divergence'],
]);

/**
 * (sheet, cell, line) for every setCell / setDateCell whose worksheet
 * variable resolves. setDateCell() (Milestone 67E) writes the same cells the
 * string writer used to, so it is policed the same way -- a date written
 * onto a caption or a formula is no less a defect for being a real date.
 */
function writeTargets(jsPath, tpl) {
  if (CONTRACT_EXPORTERS[tpl]) {
    return contractTargets(CONTRACT_EXPORTERS[tpl]).filter((t) => t.dir !== 'import').map((t) => ({ sheet: t.sheet, cell: t.cell, line: t.path }));
  }
  const src = readFileSync(jsPath, 'utf8');
  const varSheet = new Map();
  for (const m of src.matchAll(/(?:const|let)\s+(\w+)\s*=\s*workbook\.getWorksheet\(\s*'([^']+)'\s*\)/g)) {
    varSheet.set(m[1], m[2]);
  }
  const out = [];
  for (const m of src.matchAll(/set(?:Date)?Cell\(\s*(\w+)\s*,\s*['`]([A-Z]+)(\d+)['`]/g)) {
    const sheet = varSheet.get(m[1]);
    if (!sheet) continue;
    out.push({ sheet, cell: `${m[2]}${m[3]}`, line: src.slice(0, m.index).split('\n').length });
  }
  return out;
}

describe.each(EXPORTERS)('%s exporter write targets', (tpl, jsPath) => {
  test('never write onto a label, a formula, or a covered merge cell', async () => {
    const sheets = await templateSheets(tpl);
    const offences = [];
    for (const { sheet, cell, line } of writeTargets(jsPath, tpl)) {
      if (ALLOWED.has(`${tpl}|${sheet}|${cell}`)) continue;
      const info = sheets.get(sheet);
      if (!info) {
        offences.push(`${jsPath}:${line} writes to unknown sheet '${sheet}'`);
        continue;
      }
      if (info.covered.has(cell)) {
        const range = info.covered.get(cell);
        offences.push(`${jsPath}:${line} '${sheet}'!${cell} is inside merge ${range}; `
          + `ExcelJS writes it to ${range.split(':')[0]} instead`);
        continue;
      }
      const at = info.cells.get(cell);
      if (!at) continue;
      if (at.kind === 'FORMULA') {
        offences.push(`${jsPath}:${line} '${sheet}'!${cell} holds the workbook's formula =${at.text}`);
      } else if (!info.validated.has(cell)) {
        offences.push(`${jsPath}:${line} '${sheet}'!${cell} holds the printed label ${JSON.stringify(at.text.slice(0, 60))}`);
      }
    }
    expect(offences, `write targets that overwrite the court's own form:\n${offences.join('\n')}`).toEqual([]);
  });
});

describe('the exceptions list itself', () => {
  test('every entry names a target the exporter still writes', async () => {
    const written = new Set();
    for (const [tpl, jsPath] of EXPORTERS) {
      for (const { sheet, cell } of writeTargets(jsPath, tpl)) written.add(`${tpl}|${sheet}|${cell}`);
    }
    const stale = [...ALLOWED.keys()].filter((k) => !written.has(k));
    expect(stale, 'allowances kept for writes that no longer happen').toEqual([]);
  });

  test('every entry carries a reason', () => {
    for (const [key, reason] of ALLOWED) {
      expect(String(reason).length, `${key} needs a reason`).toBeGreaterThan(10);
    }
  });
});
