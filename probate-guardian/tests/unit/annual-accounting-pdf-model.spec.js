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
});
