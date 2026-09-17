import { describe, it, expect } from 'vitest';
import { newSchB4Id, normalizeSchB4Accounts, sortedSchB4Rows } from '../../src/core/filing/schb4-accounts.js';

describe('Schedule B-4 Account Contract', () => {
  it('generates unique, opaque IDs', () => {
    const id1 = newSchB4Id();
    const id2 = newSchB4Id();
    expect(id1).toBeTruthy();
    expect(id2).toBeTruthy();
    expect(id1).not.toBe(id2);
  });

  it('normalizes accounts and links legacy bankAcct numbers', () => {
    const data = {
      schB4Accounts: [
        { id: 'acct-1', bankName: 'First National', accountNo: '1234' },
      ],
      schB4: [
        { checkNo: '101', bankAcct: '1234', payee: 'Doctor', amount: '150' },
        { checkNo: '102', bankAcct: '9999', payee: 'Pharmacy', amount: '50' },
      ],
    };

    normalizeSchB4Accounts(data);

    expect(data.schB4[0].id).toBeTruthy();
    expect(data.schB4[0].bankAccountId).toBe('acct-1');
    expect(data.schB4[1].id).toBeTruthy();
    expect(data.schB4[1].bankAccountId).toBe('');
  });

  it('sorts check numbers naturally with alphanumeric support', () => {
    const rows = [
      { id: 'r1', checkNo: 'CHK-105', datePaid: '2026-03-01', amount: '50' },
      { id: 'r2', checkNo: '102', datePaid: '2026-01-15', amount: '100' },
      { id: 'r3', checkNo: '101', datePaid: '2026-01-10', amount: '200' },
      { id: 'r4', checkNo: 'CHK-104A', datePaid: '2026-02-01', amount: '75' },
      { id: 'r5', checkNo: '102', datePaid: '2026-01-05', amount: '150' },
    ];

    const sorted = sortedSchB4Rows(rows);

    expect(sorted.map(r => r.id)).toEqual(['r3', 'r5', 'r2', 'r4', 'r1']);
  });
});

