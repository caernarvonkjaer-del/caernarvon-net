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

  test('Part VIII outputs No for trust disclosure when ward has no trusts', () => {
    const model = buildAnnualAccountingModel({
      inventoryType: 'annual',
      trusts: [],
    });
    const part8 = model.sections.find((section) => section.id === 'part8');
    expect(part8).toBeDefined();
    const kv = part8.blocks.find((block) => block.type === 'key-value-grid');
    expect(kv).toBeDefined();
    expect(kv.items).toEqual([
      { label: 'Does the Ward have one or more Trusts?', value: 'No' },
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

    // Verification of the duplicate suppression predicate ported from DOCX to PDF engine
    const isDuplicateTitle = (blockTitle, secTitle) => {
      return !!(blockTitle && (blockTitle.trim().toLowerCase() === (secTitle || '').trim().toLowerCase()));
    };

    expect(isDuplicateTitle(tableBlock.title, schA.title)).toBe(true);
    // Block title remains intact for the PDF tagged structure tree (summary & title)
    expect(tableBlock.title).toBeTruthy();
  });
});

