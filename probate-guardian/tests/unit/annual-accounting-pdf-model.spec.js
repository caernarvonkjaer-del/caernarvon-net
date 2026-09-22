import { describe, expect, test } from 'vitest';
import { buildAnnualAccountingModel } from '../../src/features/annual-accounting/pdf-model.js';

describe('Trust Accounting PDF model', () => {
  test('keeps percentage and currency columns distinct and wide enough', () => {
    const model = buildAnnualAccountingModel({
      inventoryType: 'trustAccounting', filingType: 'Trust',
      trusts: [{
        hasTrust: 'Yes', name: 'Redacted Special Needs Trust', trustee: 'Redacted Trustee',
        accountNo: 'xxxx-7734', createdAfterGID: 'Yes', wardPct: '100', wardAmount: '49075',
      }],
    });
    const part8 = model.sections.find((section) => section.id === 'part8');
    const details = part8.blocks.find((block) => block.title === 'Trust Accounts Details');

    // Milestone 64B-2, item 10.2 widened this table from seven columns to
    // nine (Date Created, Type of Trust). The intent of this case is
    // unchanged: the last two columns stay distinct and wide enough for their
    // headers and a normal dollar amount -- 8% and 16% of 468pt here, against
    // the measured minimums of 7.9% and 14.0%.
    expect(details.headers.slice(-2)).toEqual(["Ward's %", "Ward's Amount"]);
    expect(details.colWidths).toEqual([4, 14, 10, 18, 11, 13, 6, 8, 16]);
    expect(details.colWidths.reduce((total, width) => total + width, 0)).toBe(100);
  });

  test('Part VIII leaves an unanswered trust disclosure blank', () => {
    const model = buildAnnualAccountingModel({
      inventoryType: 'annual',
      trusts: [],
    });
    const part8 = model.sections.find((section) => section.id === 'part8');
    expect(part8).toBeDefined();
    const kv = part8.blocks.find((block) => block.type === 'key-value-grid');
    expect(kv).toBeDefined();
    expect(kv.items).toEqual([
      { label: 'Does the Ward have one or more Trusts?', value: '' },
    ]);
  });

  test('duplicate section and block titles are identified for PDF suppression while preserving block.title for accessibility', () => {
    const model = buildAnnualAccountingModel({
      inventoryType: 'annual',
      schA: [{ payer: 'Social Security', description: 'Monthly', bank: 'Chase', accountNo: '1234', amount: '1000' }],
    });
    const schA = model.sections.find((section) => section.id === 'schA');
    expect(schA).toBeDefined();
    expect(schA.title).toBe('SCHEDULE A: Income Received During Period');
    const tableBlock = schA.blocks.find((b) => b.type === 'table');
    expect(tableBlock).toBeDefined();
    expect(tableBlock.title).toBe('Schedule A: Income Received During Period');

    // Verification of the PDF engine's duplicate-title suppression predicate
    const isDuplicateTitle = (blockTitle, secTitle) => {
      return !!(blockTitle && (blockTitle.trim().toLowerCase() === (secTitle || '').trim().toLowerCase()));
    };

    expect(isDuplicateTitle(tableBlock.title, schA.title)).toBe(true);
    // Block title remains intact for the PDF tagged structure tree (summary & title)
    expect(tableBlock.title).toBeTruthy();
  });
});

// Milestone 64B-1, item 9.1 / D7. See annual-accounting-totals.spec.js for
// the full explanation -- these pin the same fix on the printed row and
// schedule-total cells, not just the calculator.
describe('Milestone 64B-1: printed Carrying Value is unscaled; D-4 Restricted Amt is Full Amount x Ward\'s %', () => {
  test('D-2 prints the entered Carrying Value unscaled, and totals it unscaled', () => {
    const model = buildAnnualAccountingModel({
      inventoryType: 'annual',
      schD2: [{ description: 'Home', fullValue: '190000', wardPct: '50', carryingValue: '82500' }],
    });
    const schD2 = model.sections.find((s) => s.id === 'schD2').blocks[0];
    const row = schD2.rows[0];
    // headers: ['#', 'Description / Address', 'Residence?', 'Income?', 'Full Value', "Ward's %", 'Carrying Value', 'Total Value']
    expect(row[6]).toBe('$82,500.00');
    expect(row[7]).toBe('$95,000.00');
    expect(schD2.totals.value).toBe('$82,500.00 / $95,000.00');
  });

  test('D-3 prints the entered Carrying Value unscaled, and totals it unscaled', () => {
    const model = buildAnnualAccountingModel({
      inventoryType: 'annual',
      schD3: [{ description: 'Furniture', fullAmount: '6000', wardPct: '50', carryingValue: '3000' }],
    });
    const schD3 = model.sections.find((s) => s.id === 'schD3').blocks[0];
    const row = schD3.rows[0];
    // headers: ['#', 'Description / Location', 'Full Amount', "Ward's %", 'Carrying Value', "Ward's Amount"]
    expect(row[4]).toBe('$3,000.00');
    expect(row[5]).toBe('$3,000.00');
    expect(schD3.totals.value).toBe('$3,000.00 / $3,000.00');
  });

  test('D-4 prints the entered Carrying Value unscaled, and Restricted Amt as Full Amount x Ward\'s % (matching the workbook), not Carrying Value x Ward\'s %', () => {
    const model = buildAnnualAccountingModel({
      inventoryType: 'annual',
      schD4: [{ description: 'Brokerage Account', fullAmount: '100000', wardPct: '50', carryingValue: '80000', restricted: 'Yes' }],
    });
    const schD4 = model.sections.find((s) => s.id === 'schD4').blocks[0];
    const row = schD4.rows[0];
    // headers: ['#', 'Description', 'Restricted?', 'Full Amount', "Ward's %", 'Carrying Value', 'Total Value', 'Restricted Amt']
    expect(row[5]).toBe('$80,000.00'); // Carrying Value, unscaled
    expect(row[6]).toBe('$50,000.00'); // Total Value = Ward's Value = Full x Ward's %
    expect(row[7]).toBe('$50,000.00'); // Restricted Amt = Full x Ward's %, matching the workbook's K = IF(F="Yes", G*H, 0) -- not $40,000 (Carrying x Ward's %)
    expect(schD4.totals.value).toBe('$80,000.00 / $50,000.00');
  });

  test('Part IX prints the D-4 RESTRICTED and Unrestricted lines agreeing with the workbook on a partly-owned restricted line', () => {
    const model = buildAnnualAccountingModel({
      inventoryType: 'annual',
      schD4: [{ description: 'Brokerage Account', fullAmount: '100000', wardPct: '50', carryingValue: '80000', restricted: 'Yes' }],
    });
    const part9 = model.sections.find((s) => s.id === 'part9');
    const bondBlock = part9.blocks.find((b) => b.title === 'Statutory Bond Calculation Breakdown');
    const restrictedRow = bondBlock.rows.find((r) => r[0] === 'Schedule D-4 — Intangible Assets RESTRICTED');
    const unrestrictedRow = bondBlock.rows.find((r) => r[0] === 'Schedule D-4 — Intangible Assets (Unrestricted)');
    expect(restrictedRow[1]).toBe('$50,000.00');
    expect(unrestrictedRow[1]).toBe('$0.00');
  });
});


// Milestone 64B-2, item 10.1 / D8 (decided 2026-09-21: always print the first
// page). Schedules E, F-1 and F-2 were the only three that vanished entirely
// when empty -- every other schedule (A, B-1..B-4, C, D-1..D-5) always prints
// its first page with a "No entries" row. The court's form C9 requires the
// page, and AGENTS.md section 4 records that the Clerk accepts blank
// schedules, so a filing with no bank transfers was being handed over missing
// a page the form expects. The Excel path already shipped all three first
// pages, so for one filing the workbook had Schedule F-1 and the PDF did not.
// Uses the existing "No entries" row form, not a new "nothing to report"
// declaration -- that distinction is the whole of section 4's sidebar/export
// rule.
describe('Milestone 64B-2, item 10.1: Schedules E, F-1 and F-2 always print their first page', () => {
  const emptyModel = () => buildAnnualAccountingModel({ inventoryType: 'annual' });

  test.each([
    ['schE', 'SCHEDULE E: Bank Transfers During Period'],
    ['schF1', 'SCHEDULE F-1: Sales of Real Property During Period'],
    ['schF2', 'SCHEDULE F-2: Sales of Personal Property During Period'],
  ])('%s prints even with no rows entered', (id, title) => {
    const section = emptyModel().sections.find((s) => s.id === id);
    expect(section, `${id} section must exist on an empty filing`).toBeDefined();
    expect(section.title).toBe(title);
  });

  test.each([['schE'], ['schF1'], ['schF2']])('%s empty row is a "No entries" row with one cell per header', (id) => {
    const table = emptyModel().sections.find((s) => s.id === id).blocks.find((b) => b.type === 'table');
    expect(table.rows).toHaveLength(1);
    expect(table.rows[0]).toHaveLength(table.headers.length);
    expect(table.rows[0].join(' ')).toContain('No entries');
  });

  test('a populated schedule still prints its real rows, not the placeholder', () => {
    const model = buildAnnualAccountingModel({
      inventoryType: 'annual',
      schE: [{ bankName: 'Chase ***1234', transferInDate: '2026-02-01', transferInAmt: '500' }],
    });
    const table = model.sections.find((s) => s.id === 'schE').blocks.find((b) => b.type === 'table');
    expect(table.rows).toHaveLength(1);
    expect(table.rows[0].join(' ')).toContain('Chase ***1234');
    expect(table.rows[0].join(' ')).not.toContain('No entries');
  });
});

// Milestone 64B-2, item 10.2. Form PART VIII B15 "Date Trust created:" and
// B16 "Type of Trust:" are required per trust, and the app captures both
// (trusts[n].dateCreated, .trustType) -- but the printed Trust Accounts
// Details table listed neither. The Excel export already wrote both, so for
// the same trust the filed workbook carried the date and type and the filed
// PDF did not. Column order follows the form: Name, Trustee, Account #, Date
// Created, Type of Trust, then the app's own "After GID?" and the ward
// figures.
describe('Milestone 64B-2, item 10.2: Part VIII prints Date Created and Type of Trust', () => {
  const trustModel = () => buildAnnualAccountingModel({
    inventoryType: 'annual',
    trusts: [
      { hasTrust: 'Yes', name: 'Bennett Family Revocable Trust', trustee: 'Rachel M. Alvarez', accountNo: '***7777', dateCreated: '2009-06-12', trustType: 'Revocable Living', createdAfterGID: 'No', wardPct: 100, wardAmount: 50000 },
      { name: 'Bennett Special Needs Trust', trustee: 'Chas Addams', accountNo: '***8888', dateCreated: '2024-09-15', trustType: 'Special Needs', createdAfterGID: 'Yes', wardPct: 50, wardAmount: 24000 },
    ],
  });
  const details = (model) => model.sections.find((s) => s.id === 'part8').blocks
    .find((b) => b.title === 'Trust Accounts Details');

  test("the form's two columns are present, in the form's order", () => {
    expect(details(trustModel()).headers).toEqual([
      '#', 'Name of Trust', 'Trustee', 'Account #', 'Date Created', 'Type of Trust', 'After GID?', "Ward's %", "Ward's Amount",
    ]);
  });

  test('each trust prints its own date and type', () => {
    const rows = details(trustModel()).rows;
    expect(rows[0][4]).toBe('06/12/2009');
    expect(rows[0][5]).toBe('Revocable Living');
    expect(rows[1][4]).toBe('09/15/2024');
    expect(rows[1][5]).toBe('Special Needs');
  });

  test('widths and alignments still reconcile with nine columns', () => {
    const d = details(trustModel());
    expect(d.colWidths).toHaveLength(d.headers.length);
    expect(d.colAlign).toHaveLength(d.headers.length);
    expect(d.colWidths.reduce((a, b) => a + b, 0)).toBe(100);
    // Minimums measured in the proposal (embedded Liberation Sans at the
    // engine's table sizes) for the tokens that cannot wrap.
    const minimums = { 'Account #': 17.4, 'Date Created': 10.7, "Ward's %": 7.9, "Ward's Amount": 14.0 };
    for (const [header, min] of Object.entries(minimums)) {
      const width = d.colWidths[d.headers.indexOf(header)];
      expect(width, `${header} needs >= ${min}%`).toBeGreaterThanOrEqual(min);
    }
  });

  test('a trust with no date or type entered leaves those cells blank, not "undefined"', () => {
    const model = buildAnnualAccountingModel({
      inventoryType: 'annual',
      trusts: [{ name: 'Older Trust', trustee: 'T', accountNo: '1', wardPct: 100, wardAmount: 1 }],
    });
    const row = details(model).rows[0];
    expect(row[4]).toBe('');
    expect(row[5]).toBe('');
  });
});
