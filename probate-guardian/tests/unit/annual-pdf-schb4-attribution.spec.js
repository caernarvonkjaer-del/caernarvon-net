import { describe, expect, test } from 'vitest';
import { buildAnnualAccountingModel } from '../../src/features/annual-accounting/pdf-model.js';

// Schedule B-4's check register, attributed to the bank account each payment
// left.
//
// The court's workbook prints each account's disbursements in that account's
// own block of register pages, under that account's name and number. The PDF
// has to say the same, and it carries more weight there: the workbook is
// withheld whenever it cannot represent the filing faithfully -- more accounts
// than it has blocks, or disbursements not yet assigned to one -- and the PDF
// is the fallback. A flat register would leave the court unable to tell which
// account a payment came from in precisely the cases where the workbook could
// not tell it either.
//
// What these pin down is that no disbursement is ever printed under an account
// it did not leave, that none is dropped, and that the grouped register still
// adds up to the same schedule total as before.

const REGISTER = /Check Register/;

const model = (D) => buildAnnualAccountingModel({ inventoryType: 'annual', ...D });
const schB4Section = (D) => model(D).sections.find((s) => s.id === 'schB4');
const registers = (D) => schB4Section(D).blocks.filter((b) => REGISTER.test(b.title || ''));
const recap = (D) => schB4Section(D).blocks.find((b) => /Total by Bank Account/.test(b.title || ''));
/** Every payee named anywhere in a block's rows. */
const payees = (block) => block.rows.map((r) => r[4]);

const ACCOUNTS = [
  { id: 'a1', bankName: 'Bay Bank', accountNumber: '10001111' },
  { id: 'a2', bankName: 'Gulf Credit Union', accountNumber: '20002222' },
];

const disb = (bankAccountId, payee, amount, checkNo = '1000') => ({
  bankAccountId, payee, amount, checkNo, datePaid: '2026-03-04', category: 'Utilities',
});

describe('no bank accounts defined (the long-standing single-account filing)', () => {
  const D = { schB4: [disb('', 'Duke Energy', '100.00'), disb('', 'City Water', '50.00')] };

  test('prints one unlabelled register, exactly as before', () => {
    const blocks = registers(D);
    expect(blocks).toHaveLength(1);
    expect(blocks[0].title).toBe('Schedule B-4: All Other Disbursements — Check Register');
    expect(payees(blocks[0])).toEqual(['Duke Energy', 'City Water']);
    expect(blocks[0].totals).toEqual({ label: 'Schedule B-4 Detail Total', value: '$150.00' });
  });

  test('adds no per-account recap, which would name accounts that do not exist', () => {
    expect(recap(D)).toBeUndefined();
  });

  test('an empty schedule prints no register at all, only the category summary', () => {
    expect(registers({ schB4: [] })).toHaveLength(0);
  });
});

describe('with bank accounts defined', () => {
  const D = {
    schB4Accounts: ACCOUNTS,
    schB4: [
      disb('a1', 'Duke Energy', '100.00', '1001'),
      disb('a2', 'Bayview Apartments', '250.00', '1002'),
      disb('a1', 'City Water', '50.00', '1003'),
    ],
  };

  test('each account gets its own register, headed by its bank name and number', () => {
    const blocks = registers(D);
    expect(blocks.map((b) => b.title)).toEqual([
      'Schedule B-4: Check Register — Bay Bank — Account No. 10001111',
      'Schedule B-4: Check Register — Gulf Credit Union — Account No. 20002222',
    ]);
  });

  test('a register carries that account\'s disbursements and nobody else\'s', () => {
    const [bay, gulf] = registers(D);
    expect(payees(bay)).toEqual(['Duke Energy', 'City Water']);
    expect(payees(gulf)).toEqual(['Bayview Apartments']);
  });

  test('each register subtotals only its own rows', () => {
    const [bay, gulf] = registers(D);
    expect(bay.totals).toEqual({ label: 'Subtotal — Bay Bank — Account No. 10001111', value: '$150.00' });
    expect(gulf.totals).toEqual({ label: 'Subtotal — Gulf Credit Union — Account No. 20002222', value: '$250.00' });
  });

  // The '#' column is the row's place in Schedule B-4 as a whole, not its place
  // inside the account's block. It is the number the editor puts on that
  // entry's card ("Line 3"), so a court query about line 3 leads the filer to
  // the row the court is actually looking at.
  test('line numbers stay the row\'s position in the schedule, not in the block', () => {
    const [bay, gulf] = registers(D);
    expect(bay.rows.map((r) => r[0])).toEqual(['1', '3']);
    expect(gulf.rows.map((r) => r[0])).toEqual(['2']);
  });

  test('the recap reconciles the per-account subtotals to the schedule total', () => {
    const block = recap(D);
    expect(block.rows).toEqual([
      ['Bay Bank — Account No. 10001111', '$150.00'],
      ['Gulf Credit Union — Account No. 20002222', '$250.00'],
    ]);
    expect(block.totals.value).toBe('$400.00');
    expect(block.colWidths.reduce((a, b) => a + b, 0)).toBe(100);
  });

  // An account with nothing paid from it was still accounted for. Omitting it
  // would read as though the filer had never held it.
  test('an account with no disbursements still gets a register saying so', () => {
    const blocks = registers({ ...D, schB4: [disb('a1', 'Duke Energy', '100.00')] });
    expect(blocks).toHaveLength(2);
    expect(payees(blocks[1])).toEqual(['No entries']);
    expect(blocks[1].totals.value).toBe('$0.00');
  });

  // Two accounts at the same bank -- an operating account and a reserve -- is
  // ordinary. If the heading were the bank name alone the two registers would
  // be indistinguishable, which is the whole failure this work exists to fix.
  test('two accounts at the same bank are told apart by number', () => {
    const blocks = registers({
      schB4Accounts: [
        { id: 'a1', bankName: 'Bay Bank', accountNumber: '10001111' },
        { id: 'a2', bankName: 'Bay Bank', accountNumber: '99997777' },
      ],
      schB4: [disb('a1', 'Duke Energy', '100.00'), disb('a2', 'City Water', '50.00')],
    });
    expect(blocks[0].title).not.toBe(blocks[1].title);
    expect(blocks[0].title).toContain('10001111');
    expect(blocks[1].title).toContain('99997777');
  });

  test('an account the filer has not named yet falls back to its position', () => {
    const blocks = registers({
      schB4Accounts: [{ id: 'a1', bankName: '', accountNumber: '' }],
      schB4: [disb('a1', 'Duke Energy', '100.00')],
    });
    expect(blocks[0].title).toBe('Schedule B-4: Check Register — Account 1');
  });
});

// The workbook refuses to write an unassigned disbursement rather than file it
// under whichever account happens to be first. The PDF has no such constraint,
// and a payment missing from the filing entirely is the worse error -- so it
// prints them, under a heading that says the attribution is outstanding.
describe('disbursements not assigned to any account', () => {
  const D = {
    schB4Accounts: ACCOUNTS,
    schB4: [
      disb('a1', 'Duke Energy', '100.00'),
      disb('', 'Unknown Payee', '75.00'),
      disb('nonexistent-id', 'Stale Reference', '25.00'),
    ],
  };

  test('are printed in their own named group rather than dropped', () => {
    const blocks = registers(D);
    const orphans = blocks.find((b) => /Not Assigned/.test(b.title));
    expect(orphans, 'unassigned disbursements must still reach the filing').toBeDefined();
    expect(payees(orphans)).toEqual(['Unknown Payee', 'Stale Reference']);
    expect(orphans.totals.value).toBe('$100.00');
  });

  test('are never folded into a real account', () => {
    const [bay, gulf] = registers(D);
    expect(payees(bay)).toEqual(['Duke Energy']);
    expect(payees(gulf)).toEqual(['No entries']);
  });

  test('still reconcile to the schedule total', () => {
    const block = recap(D);
    expect(block.rows.at(-1)).toEqual(['Not Assigned to a Bank Account', '$100.00']);
    expect(block.totals.value).toBe('$200.00');
  });

  test('every disbursement appears exactly once across all registers', () => {
    const all = registers(D).flatMap(payees).filter((p) => p !== 'No entries');
    expect(all).toHaveLength(D.schB4.length);
    expect(new Set(all).size).toBe(D.schB4.length);
  });
});
