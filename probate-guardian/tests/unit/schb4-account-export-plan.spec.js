import { describe, expect, test } from 'vitest';

globalThis.window = globalThis.window || {};
globalThis.window.guardianHasAnyData = () => false;

const { planSchB4Export, SCH_B4_ACCOUNT_BLOCKS } = await import('../../src/features/annual-accounting/excel.js');

// Milestone 57 review: before this, doSaveExcel() blocked the ENTIRE Annual
// Accounting Excel export -- every schedule, not just B-4 -- the instant a
// filer had disbursements split across more than one bank account, because
// the code only ever wrote to one B-4 page (p2). The bundled court template
// actually has 18 B-4 check-register pages grouped into 4 account-sized
// blocks (SCH_B4_ACCOUNT_BLOCKS, verified against the live template's XML).
// planSchB4Export() is the pure grouping/capacity logic doSaveExcel() and
// importExcel() both use; it has no ExcelJS/workbook dependency, so it's
// tested directly here rather than through a full workbook round-trip.
describe('planSchB4Export', () => {
  test('four blocks are defined, one per supported account', () => {
    expect(SCH_B4_ACCOUNT_BLOCKS).toHaveLength(4);
  });

  test('two accounts with normal row counts no longer block export', () => {
    const accounts = [
      { id: 'a1', bankName: 'First Bank', accountNo: '111' },
      { id: 'a2', bankName: 'Second Bank', accountNo: '222' },
    ];
    const rows = [
      { bankAccountId: 'a1', checkNo: '100' },
      { bankAccountId: 'a2', checkNo: '200' },
      { bankAccountId: 'a1', checkNo: '101' },
    ];
    const plan = planSchB4Export(rows, accounts);
    expect(plan.ok).toBe(true);
    expect(plan.groups).toHaveLength(2);
    expect(plan.groups[0]).toMatchObject({ bankName: 'First Bank', accountNo: '111' });
    expect(plan.groups[0].rows.map((r) => r.checkNo)).toEqual(['100', '101']);
    expect(plan.groups[1].rows.map((r) => r.checkNo)).toEqual(['200']);
    // Account 1 -> block 0, account 2 -> block 1 -- distinct template pages.
    expect(plan.groups[0].block).toBe(SCH_B4_ACCOUNT_BLOCKS[0]);
    expect(plan.groups[1].block).toBe(SCH_B4_ACCOUNT_BLOCKS[1]);
  });

  test('no accounts defined falls back to one unlabeled group on the first block (legacy shape)', () => {
    const rows = [{ bankAccountId: '', checkNo: '1' }, { bankAccountId: '', checkNo: '2' }];
    const plan = planSchB4Export(rows, []);
    expect(plan.ok).toBe(true);
    expect(plan.groups).toHaveLength(1);
    expect(plan.groups[0]).toMatchObject({ bankName: '', accountNo: '', block: SCH_B4_ACCOUNT_BLOCKS[0] });
    expect(plan.groups[0].rows).toHaveLength(2);
  });

  test('more than 4 accounts blocks export with a clear message, PDF still offered', () => {
    const accounts = Array.from({ length: 5 }, (_, i) => ({ id: `a${i}`, bankName: `Bank ${i}`, accountNo: `${i}` }));
    const plan = planSchB4Export([], accounts);
    expect(plan.ok).toBe(false);
    expect(plan.message).toMatch(/up to 4/);
    expect(plan.message).toMatch(/PDF/);
  });

  test('an account with more rows than its block can hold blocks export, names the account', () => {
    const accounts = [{ id: 'a1', bankName: 'Overflow Bank', accountNo: '999' }];
    const blockCap = SCH_B4_ACCOUNT_BLOCKS[0].reduce((sum, p) => sum + (p.last - p.first + 1), 0);
    const rows = Array.from({ length: blockCap + 1 }, (_, i) => ({ bankAccountId: 'a1', checkNo: `${i}` }));
    const plan = planSchB4Export(rows, accounts);
    expect(plan.ok).toBe(false);
    expect(plan.message).toContain('Overflow Bank');
    expect(plan.message).toContain(String(blockCap));
  });

  test('a row with no matching account, while accounts exist, blocks export', () => {
    const accounts = [{ id: 'a1', bankName: 'First Bank', accountNo: '111' }];
    const rows = [{ bankAccountId: 'a1', checkNo: '1' }, { bankAccountId: '', checkNo: '2' }];
    const plan = planSchB4Export(rows, accounts);
    expect(plan.ok).toBe(false);
    expect(plan.message).toMatch(/not assigned/);
  });

  test('a full row count exactly at a block\'s capacity is allowed, not just under it', () => {
    const accounts = [{ id: 'a1', bankName: 'Exact Bank', accountNo: '1' }];
    const blockCap = SCH_B4_ACCOUNT_BLOCKS[0].reduce((sum, p) => sum + (p.last - p.first + 1), 0);
    const rows = Array.from({ length: blockCap }, (_, i) => ({ bankAccountId: 'a1', checkNo: `${i}` }));
    const plan = planSchB4Export(rows, accounts);
    expect(plan.ok).toBe(true);
    expect(plan.groups[0].rows).toHaveLength(blockCap);
  });
});
