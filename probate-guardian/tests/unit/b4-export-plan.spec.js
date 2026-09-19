import { describe, expect, test } from 'vitest';
import {
  planSchB4Export,
  B4_PLAN_TOO_MANY_ACCOUNTS,
  B4_PLAN_ACCOUNT_OVER_CAPACITY,
  B4_PLAN_UNASSIGNED_ROWS,
} from '../../src/core/excel/b4-export-plan.js';
import { b4AccountLabel } from '../../src/core/accounting/bank-accounts.js';
import { SCH_B4_ACCOUNT_BLOCKS } from '../../src/core/excel/b4-register-pages.js';

const BLOCKS = SCH_B4_ACCOUNT_BLOCKS;
const acct = (id, bankName = 'Bay Bank', accountNumber = '00012345') => ({ id, bankName, accountNumber });
const rowsFor = (id, n) => Array.from({ length: n }, (_, i) => ({
  bankAccountId: id, checkNo: String(1000 + i), payee: `Payee ${i}`, amount: '10.00',
}));

describe('account labels', () => {
  test.each([
    [{ bankName: 'Bay Bank', accountNumber: '00012345' }, 0, 'Bay Bank …2345'],
    [{ bankName: 'Bay Bank', accountNumber: '' }, 0, 'Bay Bank'],
    [{ bankName: '', accountNumber: '998877' }, 0, 'Account …8877'],
    [{}, 2, 'Account 3'],
    [null, 0, 'Account 1'],
  ])('%j -> %s', (account, index, expected) => {
    expect(b4AccountLabel(account, index)).toBe(expected);
  });
});

describe('no accounts defined (the long-standing shape)', () => {
  test('an empty filing plans one empty group in block 1', () => {
    const plan = planSchB4Export([], [], BLOCKS);
    expect(plan.ok).toBe(true);
    expect(plan.groups).toHaveLength(1);
    expect(plan.groups[0].account).toBeNull();
    expect(plan.usedPages).toEqual([]);
  });

  test('rows fill block 1 page by page, respecting each page\'s own row count', () => {
    // p2 holds 25 from row 20; p3 holds 27 from row 8.
    const plan = planSchB4Export(rowsFor('', 30), [], BLOCKS);
    expect(plan.ok).toBe(true);
    const [g] = plan.groups;
    expect(g.pages.map(p => [p.page, p.firstRow, p.rows.length]))
      .toEqual([[2, 20, 25], [3, 8, 5]]);
    expect(plan.usedPages).toEqual([2, 3]);
  });

  test('exactly block 1\'s capacity is allowed', () => {
    const plan = planSchB4Export(rowsFor('', 160), [], BLOCKS);
    expect(plan.ok).toBe(true);
    expect(plan.groups[0].pages.reduce((s, p) => s + p.rows.length, 0)).toBe(160);
    expect(plan.usedPages).toEqual([2, 3, 4, 5, 6, 7]);
  });

  test('one row past it is refused rather than truncated', () => {
    const plan = planSchB4Export(rowsFor('', 161), [], BLOCKS);
    expect(plan.ok).toBe(false);
    expect(plan.problems[0].code).toBe(B4_PLAN_ACCOUNT_OVER_CAPACITY);
    expect(plan.problems[0].message).toContain('161');
    expect(plan.groups).toEqual([]);
  });
});

describe('several accounts', () => {
  test('each account lands in its own block, in filer order', () => {
    const accounts = [acct('a'), acct('b'), acct('c')];
    const plan = planSchB4Export(
      [...rowsFor('a', 3), ...rowsFor('b', 2), ...rowsFor('c', 1)], accounts, BLOCKS,
    );
    expect(plan.ok).toBe(true);
    expect(plan.groups.map(g => g.block.account)).toEqual([1, 2, 3]);
    expect(plan.groups.map(g => g.pages[0].page)).toEqual([2, 8, 12]);
    expect(plan.groups.map(g => g.pages[0].rows.length)).toEqual([3, 2, 1]);
  });

  test('an account with no disbursements still keeps its header page', () => {
    const plan = planSchB4Export(rowsFor('a', 2), [acct('a'), acct('b')], BLOCKS);
    expect(plan.ok).toBe(true);
    // Block 2's first page is kept so the filing shows the account, not a gap.
    expect(plan.usedPages).toContain(8);
  });

  // The 5+ case this workbook was extended for.
  test('five accounts each reach their own block', () => {
    const accounts = ['a', 'b', 'c', 'd', 'e'].map(id => acct(id));
    const rows = accounts.flatMap(a => rowsFor(a.id, 4));
    const plan = planSchB4Export(rows, accounts, BLOCKS);
    expect(plan.ok).toBe(true);
    expect(plan.groups).toHaveLength(5);
    expect(plan.groups.map(g => g.pages[0].page)).toEqual([2, 8, 12, 16, 20]);
    expect(plan.problems).toEqual([]);
  });

  test('twelve accounts are the ceiling and all fit', () => {
    const accounts = Array.from({ length: 12 }, (_, i) => acct(`a${i}`));
    const rows = accounts.flatMap(a => rowsFor(a.id, 1));
    const plan = planSchB4Export(rows, accounts, BLOCKS);
    expect(plan.ok).toBe(true);
    expect(plan.groups).toHaveLength(12);
    expect(plan.groups.at(-1).pages[0].page).toBe(48);
  });

  test('a thirteenth account is refused and named', () => {
    const accounts = Array.from({ length: 13 }, (_, i) => acct(`a${i}`, `Bank ${i}`, `9999000${i}`));
    const plan = planSchB4Export(accounts.flatMap(a => rowsFor(a.id, 1)), accounts, BLOCKS);
    expect(plan.ok).toBe(false);
    const problem = plan.problems.find(p => p.code === B4_PLAN_TOO_MANY_ACCOUNTS);
    expect(problem.message).toContain('13 bank accounts');
    expect(problem.message).toContain('12');
    expect(problem.message).toContain('Bank 12');
  });

  test('an account over its own block\'s capacity is refused and named', () => {
    const accounts = [acct('a'), acct('b', 'Gulf Credit Union', '55556666')];
    // Block 2 holds 111.
    const plan = planSchB4Export(rowsFor('b', 112), accounts, BLOCKS);
    expect(plan.ok).toBe(false);
    const problem = plan.problems.find(p => p.code === B4_PLAN_ACCOUNT_OVER_CAPACITY);
    expect(problem.message).toContain('Gulf Credit Union …6666');
    expect(problem.message).toContain('112');
    expect(problem.message).toContain('111');
  });

  // Filing an unassigned row under whatever account is first attributes real
  // money to the wrong bank. Refuse instead; the PDF still carries every row.
  test('unassigned rows are refused rather than guessed at', () => {
    const plan = planSchB4Export(
      [...rowsFor('a', 2), { checkNo: '9', payee: 'Nobody', amount: '5' }],
      [acct('a')], BLOCKS,
    );
    expect(plan.ok).toBe(false);
    const problem = plan.problems.find(p => p.code === B4_PLAN_UNASSIGNED_ROWS);
    expect(problem.message).toContain('1 Schedule B-4 disbursement is not assigned');
  });

  test('a row naming an account that no longer exists counts as unassigned', () => {
    const plan = planSchB4Export(rowsFor('deleted-account', 1), [acct('a')], BLOCKS);
    expect(plan.ok).toBe(false);
    expect(plan.problems.some(p => p.code === B4_PLAN_UNASSIGNED_ROWS)).toBe(true);
  });

  test('an account overflowing does not stop the others being planned', () => {
    const accounts = [acct('a'), acct('b')];
    const plan = planSchB4Export([...rowsFor('a', 5), ...rowsFor('b', 200)], accounts, BLOCKS);
    expect(plan.ok).toBe(false);
    expect(plan.groups.map(g => g.block.account)).toEqual([1]);
  });

  test('a long account spans its whole block', () => {
    const plan = planSchB4Export(rowsFor('b', 111), [acct('a'), acct('b')], BLOCKS);
    expect(plan.ok).toBe(true);
    const g = plan.groups.find(x => x.block.account === 2);
    expect(g.pages.map(p => [p.page, p.rows.length])).toEqual([[8, 30], [9, 27], [10, 27], [11, 27]]);
  });
});

describe('degenerate input', () => {
  test.each([
    [null, null, 'nulls'],
    [undefined, undefined, 'undefined'],
    [[null, undefined], [null], 'holes in both lists'],
  ])('survives %s', (rows, accounts) => {
    const plan = planSchB4Export(rows, accounts, BLOCKS);
    expect(plan.groups.length).toBeLessThanOrEqual(1);
    expect(Array.isArray(plan.usedPages)).toBe(true);
  });

  test('no blocks at all plans nothing rather than throwing', () => {
    const plan = planSchB4Export(rowsFor('', 3), [], []);
    expect(plan.ok).toBe(false);
    expect(plan.groups).toEqual([]);
  });
});
