// Milestone 76I, part 2: what the court's workbook can't file faithfully
// blocks Save as Excel only (design 3; decisions 76I-2, 76I-3), and Part XI /
// Part VII lines read back as written (decision 76I-6).
//  3. A Schedule B-4 row with no category, or one outside the workbook's 18,
//     was counted on the PDF but in none of the workbook's category totals: a
//     $500 row made the PDF's Line 20 $400 and the workbook's $900.
//  4. An unreadable amount was filed as text (#VALUE! up to Summary I on the
//     Inventory) or as parseFloat's guess ("1.234,56" as 1.234).
//  7. A line with no guardian was filed "  —    —  $500.00" and read back
//     garbled.
import { describe, expect, test, vi } from 'vitest';

vi.mock('../../src/core/navigation/router.js', () => ({ navigate: () => {}, renderPage: () => {}, getCurrentPage: () => '/' }));
globalThis.window = globalThis.window || globalThis;

const { loadExcelJS, templateWorkbook } = await import('./support/exceljs-node.js');
const { workbookBlockIssues } = await import('../../src/core/excel/workbook-blocks.js');
const { canonicalB4Category, B4_CATEGORIES } = await import('../../src/core/accounting/b4-categories.js');
const { authorizeFilingOutput, clearOutputAcknowledgement } = await import('../../src/core/filing/output-authorization.js');
const { remunerationLine, splitRemuneration } = await import('../../src/core/excel/workbook-contract/remuneration-line.js');
const { readWorkbookDraft } = await import('../../src/core/excel/workbook-contract/index.js');
const { writeContract } = await import('../../src/core/excel/workbook-contract/engine.js');
const { ANNUAL_CONTRACT } = await import('../../src/core/excel/workbook-contract/annual.js');
const { initializeEmptyData } = await import('../../src/core/filing/filing-registry.js');
const { BLANK_SCHEDULE_ENTRY } = await import('../../src/core/form/blank-rows.js');
const { evaluateFiling } = await import('../../src/core/validation/engines/index.js');

const json = (x) => JSON.parse(JSON.stringify(x));
const codes = (d) => workbookBlockIssues(d).map((i) => [i.code, i.path]);

describe('item 3: a B-4 row the workbook cannot total blocks Save as Excel only', () => {
  const b4 = (category) => ({ ...BLANK_SCHEDULE_ENTRY.schB4(), payee: 'Pharmacy', datePaid: '2026-02-01', amount: 500, category });
  test('no category, or one outside the 18, is named; one of the 18 and an untouched row are not', () => {
    const d = { inventoryType: 'annual', schB4: [b4(''), b4('Groceries'), b4('Medical / Pharmacy'), BLANK_SCHEDULE_ENTRY.schB4()] };
    expect(codes(d)).toEqual([['excel.workbook.b4-category', 'schB4.0.category'], ['excel.workbook.b4-category', 'schB4.1.category']]);
    expect(workbookBlockIssues(d)[1].message).toContain('"Groceries" is not one of the court\'s 18 categories');
  });

  test('it cannot be overridden for the workbook, and does not touch the PDF', () => {
    clearOutputAcknowledgement();
    const d = { wardId: 'w76i', inventoryType: 'annual', schB4: [b4('')] };
    const issues = workbookBlockIssues(d);
    expect(issues[0]).toMatchObject({ bypassable: false, capabilities: ['excel'] });
    expect(authorizeFilingOutput(d, () => [], { capability: 'excel', additionalIssues: issues }).status).toBe('blocked');
    expect(authorizeFilingOutput(d, () => [], { capability: 'pdf', additionalIssues: issues }).status).toBe('allowed');
  });

  test("an import reads a category in another case or spacing as the workbook's own", async () => {
    expect(B4_CATEGORIES).toHaveLength(18);
    expect(canonicalB4Category('  medical /  pharmacy ')).toBe('Medical / Pharmacy');
    expect(canonicalB4Category('Groceries')).toBe('Groceries');
    const filing = { ...json(initializeEmptyData('annual')), inventoryType: 'annual', schB4: [b4('rent ')] };
    const wb = await templateWorkbook('annual');
    writeContract(wb, ANNUAL_CONTRACT, filing, {});
    const ExcelJS = loadExcelJS();
    const again = new ExcelJS.Workbook();
    await again.xlsx.load(await wb.xlsx.writeBuffer());
    expect(readWorkbookDraft(again, 'annual', { filing }).draft.schB4[0].category).toBe('Rent');
  }, 240_000);
});

describe('item 4: an unreadable amount the workbook would write blocks Save as Excel only', () => {
  test('on every form, an amount the workbook writes and that is in use', () => {
    expect(codes({ inventoryType: 'annual', schA: [{ payer: 'Bank', amount: 'about 200' }] })).toEqual([['excel.workbook.amount-unreadable', 'schA.0.amount']]);
    expect(codes({ inventoryType: 'guardian', scheduleA1: [{ propertyDescription: 'Home', fullAssetValue: '1.234,56' }] })).toEqual([['excel.workbook.amount-unreadable', 'scheduleA1.0.fullAssetValue']]);
    expect(codes({ inventoryType: 'simplified', interestIncome: 'ten dollars' })).toEqual([['excel.workbook.amount-unreadable', 'interestIncome']]);
  });

  test('not one the workbook does not write, nor one hidden by its answer', () => {
    // Part VIII's ward amount under No: hidden, and filed nowhere.
    expect(codes({ inventoryType: 'annual', trusts: [{ hasTrust: 'No', wardAmount: 'about 200' }] })).toEqual([]);
    // The Annual Plan's remuneration amount: a Plan has no workbook.
    expect(codes({ inventoryType: 'planAnnual', q11Amount: 'about 200' })).toEqual([]);
    expect(codes({ inventoryType: 'annual', schA: [{ payer: 'Bank', amount: 200 }] })).toEqual([]);
  });
});

describe("items 3 and 4 reach each workbook's own export checks", () => {
  const blocked = (type, extra) => evaluateFiling({ ...json(initializeEmptyData(type)), inventoryType: type, ...extra })
    .blockers.filter((i) => String(i.code).startsWith('excel.workbook.')).map((i) => i.path);
  test('Annual, Initial Inventory and Simplified', () => {
    expect(blocked('annual', { schB4: [{ ...BLANK_SCHEDULE_ENTRY.schB4(), payee: 'Pharmacy', amount: 500, category: '' }] })).toEqual(['schB4.0.category']);
    expect(blocked('guardian', { scheduleA1: [{ propertyDescription: 'Home', fullAssetValue: '1.234,56' }] })).toEqual(['scheduleA1.0.fullAssetValue']);
    expect(blocked('simplified', { interestIncome: 'ten dollars' })).toEqual(['interestIncome']);
  });
});

describe('item 7: a Part XI / Part VII line reads back as written, and never shows empty dashes (decision 76I-6)', () => {
  const back = (r) => { const line = remunerationLine(r); const { __line, ...entry } = splitRemuneration(line); return [line, entry]; };
  test('a complete entry keeps its wording', () => {
    expect(back({ guardian: 'Ann Guardian', type: 'Fee', amount: 1500, description: 'Q1' }))
      .toEqual(['Ann Guardian  —  Fee  —  $1500.00  —  Q1', { guardian: 'Ann Guardian', type: 'Fee', amount: 1500, description: 'Q1' }]);
  });
  test('missing segments are named, never left as dashes, and come back where they were', () => {
    expect(back({ guardian: '', type: 'Fee', amount: 250, description: '' })).toEqual(['Type: Fee  —  $250.00', { guardian: '', type: 'Fee', amount: 250, description: '' }]);
    expect(back({ guardian: '', type: '', amount: 500, description: '' })).toEqual(['$500.00', { guardian: '', type: '', amount: 500, description: '' }]);
    expect(back({ guardian: 'Ann Guardian', type: 'Fee', amount: '', description: '500' }))
      .toEqual(['Guardian: Ann Guardian  —  Type: Fee  —  Description: 500', { guardian: 'Ann Guardian', type: 'Fee', amount: '', description: '500' }]);
    for (const r of [{ guardian: '', type: 'Fee', amount: 250 }, { guardian: '', type: '', amount: 500 }]) expect(remunerationLine(r)).not.toMatch(/—\s+—/);
  });
  test('a line filed before reads as it always did', () => {
    expect(splitRemuneration('Ann Guardian  —  Fee  —  $250.00')).toMatchObject({ guardian: 'Ann Guardian', type: 'Fee', amount: 250 });
  });
});
