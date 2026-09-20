import { describe, expect, test, beforeAll } from 'vitest';

// Milestone 58E. A ward routinely has several filings open at once -- an
// Initial Inventory, this year's Annual Accounting, last year's, a Trust
// Accounting. Every one of those dashboard cards has a Delete button, and all
// of them used to raise the same sentence, naming only the ward. The only way
// to know which filing you were about to destroy was to remember which button
// you pressed, and the action cannot be undone.
//
// These pin the clause rules. The real dialog is driven in routes.spec.ts.

let deleteFilingConfirmation;
beforeAll(async () => {
  ({ deleteFilingConfirmation } = await import('../../src/core/filing/delete-confirmation.js'));
});

describe('deleteFilingConfirmation()', () => {
  test('names the filing type, the ward, the case and the period', () => {
    expect(deleteFilingConfirmation({
      inventoryType: 'trustAccounting', wardName: 'Dorothy Jean Ashford',
      caseNumber: '26-001203-GD', periodFrom: '2025-03-14', periodTo: '2026-03-13',
    })).toBe('Delete Trust Accounting for "Dorothy Jean Ashford" — case 26-001203-GD, 03/14/2025 through 03/13/2026? This action cannot be undone.');
  });

  test('two filings for the same ward read differently', () => {
    const ward = { wardName: 'Dorothy Jean Ashford', caseNumber: '26-001203-GD' };
    const annual = deleteFilingConfirmation({ ...ward, inventoryType: 'annual', periodFrom: '2025-01-01', periodTo: '2025-12-31' });
    const trust = deleteFilingConfirmation({ ...ward, inventoryType: 'trustAccounting', periodFrom: '2025-03-14', periodTo: '2026-03-13' });
    expect(annual).not.toBe(trust);
    expect(annual).toContain('Annual Accounting');
    expect(trust).toContain('Trust Accounting');
  });

  // An Initial Inventory has no reporting period at all. It must not print a
  // dangling "through" or an empty date range.
  test('omits the period entirely when the filing has none', () => {
    const msg = deleteFilingConfirmation({ inventoryType: 'guardian', wardName: 'Harold Bennett', caseNumber: '26-002487-GD' });
    expect(msg).toBe('Delete Initial Inventory for "Harold Bennett" — case 26-002487-GD? This action cannot be undone.');
    expect(msg).not.toContain('through');
  });

  test('omits a half-entered period rather than printing one open end', () => {
    const msg = deleteFilingConfirmation({ inventoryType: 'annual', wardName: 'W', caseNumber: 'C', periodFrom: '2025-01-01', periodTo: '' });
    expect(msg).not.toContain('through');
    expect(msg).not.toContain('01/01/2025');
  });

  // Plan Minor stores its case number as ucn, with ref as the fallback --
  // caseNumberOf()'s rule, which this builder must not re-implement.
  test('Plan Minor resolves its case number by ucn, then ref', () => {
    expect(deleteFilingConfirmation({ inventoryType: 'planMinor', wardName: 'M', ucn: 'UCN-1', ref: 'REF-9' })).toContain('case UCN-1');
    expect(deleteFilingConfirmation({ inventoryType: 'planMinor', wardName: 'M', ucn: '', ref: 'REF-9' })).toContain('case REF-9');
  });

  test('keeps the prior-year warning, before the irreversibility sentence', () => {
    const msg = deleteFilingConfirmation({ inventoryType: 'annual', wardName: 'W', years: [{}, {}] });
    expect(msg).toContain('This will also permanently delete 2 prior years of saved accounting for this form.');
    expect(msg.endsWith('This action cannot be undone.')).toBe(true);
    expect(deleteFilingConfirmation({ inventoryType: 'annual', wardName: 'W', years: [{}] })).toContain('1 prior year of');
  });

  test('an unknown legacy type degrades to "this form" rather than undefined', () => {
    const msg = deleteFilingConfirmation({ inventoryType: 'someRetiredType', wardName: 'W' });
    expect(msg).toContain('Delete this form for "W"?');
    expect(msg).not.toContain('undefined');
  });

  test('survives a filing with nothing on it', () => {
    expect(() => deleteFilingConfirmation()).not.toThrow();
    expect(deleteFilingConfirmation({})).toBe('Delete this form? This action cannot be undone.');
  });
});
