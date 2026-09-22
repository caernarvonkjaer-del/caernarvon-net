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

    expect(details.headers.slice(-2)).toEqual(["Ward's %", "Ward's Amount"]);
    expect(details.colWidths).toEqual([5, 25, 18, 14, 10, 12, 16]);
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

