// Milestone 73G part 2: an amount whose sign is unexpected, and a share that
// reads as 1% or less, are said beside the box and in Preview's "Review
// recommended" -- never blocked, never changed (decisions 73G-1 and 73G-N1).
//
//   - A positive Schedule C Loss or Schedule E Transfer Out is warned,
//     quoting the Clerk's Annual workbook (`SCH C CAPITAL ADJ p1`!C17,
//     `SCH E BANK TRANS p1`!C8, read with a parser).
//   - A negative is noted wherever one is unusual: every amount box but the
//     Starting Balance and Schedule C's Gain (either sign is ordinary there).
//   - The Inventory's shares get the Annual's small-share note.
//   - The Inventory no longer reports a negative schedule amount as "must be
//     > 0"; a blank or 0 one still is.
//
// Red-first: sign-advisories.js and the Inventory's share notes don't exist
// before 73G part 2, and the Inventory reported -5 as "must be > 0".
import { afterAll, beforeAll, describe, expect, test, vi } from 'vitest';
import { amountSignNote, signAdvisories, LOSS_INSTRUCTION, TRANSFER_OUT_INSTRUCTION } from '../../src/core/filing/sign-advisories.js';
import { inventoryShareAdvisories, smallShareNote, wardShareAdvisories } from '../../src/core/filing/ward-share-advisories.js';

let engine;
let model;
beforeAll(async () => {
  vi.stubGlobal('window', globalThis);
  engine = await import('../../src/core/validation/engines/guardian.js');
  model = await import('../../src/core/filing/models/guardian.js');
});
afterAll(() => vi.unstubAllGlobals());

const codes = (list) => list.map((a) => a.code);

describe('the Clerk\'s instructions are quoted as the workbook prints them', () => {
  test('loss and transfer out', () => {
    expect(LOSS_INSTRUCTION).toBe('Losses should be entered as negative numbers, e.g., -2500.');
    expect(TRANSFER_OUT_INSTRUCTION).toBe('Transfers out should be entered as negative numbers.');
  });
});

describe('Preview: the Annual family', () => {
  for (const type of ['annual', 'finalAccounting', 'trustAccounting']) {
    test(`${type}: a positive loss and a positive transfer out are warned; negative ones are not`, () => {
      const notes = signAdvisories({
        inventoryType: type,
        schC: [{ gain: 0, loss: 250 }, { gain: 0, loss: -250 }],
        schE: [{ transferInAmt: 500, transferOutAmt: 500 }, { transferInAmt: 500, transferOutAmt: -500 }],
      });
      expect(notes).toEqual([
        {
          code: 'amount.loss-positive', severity: 'advisory', field: 'schC.0.loss',
          message: 'Schedule C — Line 1 — Loss / Reduction is positive: $250.00, so it raises the Net Capital Adjustments. The Clerk\'s workbook says: "Losses should be entered as negative numbers, e.g., -2500." It is filed as entered.',
        },
        {
          code: 'amount.transfer-out-positive', severity: 'advisory', field: 'schE.0.transferOutAmt',
          message: 'Schedule E — Line 1 — Transfer Out Amount is positive: $500.00. The Clerk\'s workbook says: "Transfers out should be entered as negative numbers." It is filed as entered.',
        },
      ]);
    });
  }

  test('a negative where one is unusual is noted, with where it is and the amount', () => {
    const notes = signAdvisories({
      inventoryType: 'annual',
      schA: [{ amount: 100 }, { amount: -50 }],
      schB2: [{ amount: -10 }],
      schD1: [{ fullAmount: -200 }],
      schD5: [{ fullDebt: -1 }],
      schE: [{ transferInAmt: -5, transferOutAmt: -5 }],
      bondAmount: -1000,
      remuneration: [{ amount: -3 }],
    });
    expect(notes.map((a) => [a.code, a.field])).toEqual([
      ['amount.negative-unusual', 'schA.1.amount'],
      ['amount.negative-unusual', 'schB2.0.amount'],
      ['amount.negative-unusual', 'schD1.0.fullAmount'],
      ['amount.negative-unusual', 'schD5.0.fullDebt'],
      ['amount.negative-unusual', 'schE.0.transferInAmt'],
      ['amount.negative-unusual', 'bondAmount'],
      ['amount.negative-unusual', 'remuneration.0.amount'],
    ]);
    expect(notes[2].message).toBe('Schedule D-1 — Line 1 — Full Asset Amount is negative: ($200.00). A negative amount is unusual here; check its sign. It is filed as entered.');
    expect(notes[5].message).toBe('Part IX — Bond Amount is negative: ($1,000.00). A negative amount is unusual here; check its sign. It is filed as entered.');
    expect(notes.every((a) => a.severity === 'advisory')).toBe(true);
  });

  test('either sign is ordinary for the Starting Balance and Schedule C\'s Gain', () => {
    expect(signAdvisories({ inventoryType: 'annual', startingBalance: -100, schC: [{ gain: -50, loss: '' }] })).toEqual([]);
  });

  test('blank, 0 and unreadable text say nothing here (unreadable text has its own check)', () => {
    expect(signAdvisories({ inventoryType: 'annual', schA: [{ amount: '' }, { amount: 0 }, { amount: 'N/A' }], schC: [{ loss: 0 }] })).toEqual([]);
  });

  test('text saved before it was read as a number is judged by what it reads as', () => {
    expect(codes(signAdvisories({ inventoryType: 'annual', schC: [{ loss: '250' }], schA: [{ amount: '(50)' }] })))
      .toEqual(['amount.negative-unusual', 'amount.loss-positive']);
  });
});

describe('Preview: the Simplified, the Inventory and the Annual Plan', () => {
  test('Simplified: a negative Starting Balance is ordinary; a negative income, disbursement or remuneration is noted', () => {
    const notes = signAdvisories({ inventoryType: 'simplified', startingBalance: -5, interestIncome: -12.5, federalIncomeTax: -1, remuneration: [{ amount: -2 }] });
    expect(notes.map((a) => a.field)).toEqual(['interestIncome', 'federalIncomeTax', 'remuneration.0.amount']);
    expect(notes[0].message).toBe('Part II — Interest Income is negative: ($12.50). A negative amount is unusual here; check its sign. It is filed as entered.');
    expect(notes[2].message).toMatch(/^Part VII — Remuneration 1 — Amount is negative/);
  });

  test('Inventory: in its own words ("A-1 row 2"), on every schedule amount and the bond', () => {
    const notes = signAdvisories({
      inventoryType: 'guardian',
      scheduleA1: [{ fullAssetValue: 100 }, { fullAssetValue: -5 }],
      scheduleA2: [{ fullDebtBalance: -100 }],
      scheduleC1: [{ annualIncomeAmount: -12 }],
      bondAmount: -1,
    });
    expect(notes.map((a) => a.field)).toEqual(['scheduleA1.1.fullAssetValue', 'scheduleA2.0.fullDebtBalance', 'scheduleC1.0.annualIncomeAmount', 'bondAmount']);
    expect(notes[0].message).toBe('A-1 row 2 — Full Asset Value is negative: ($5.00). A negative amount is unusual here; check its sign. It is filed as entered.');
    expect(notes[3].message).toMatch(/^D-4 — Bond Amount is negative/);
  });

  test('Annual Plan: a negative remuneration amount is noted; the other Plans keep no amount', () => {
    expect(codes(signAdvisories({ inventoryType: 'planAnnual', q11Amount: -1 }))).toEqual(['amount.negative-unusual']);
    expect(signAdvisories({ inventoryType: 'planInitial', q11Amount: -1 })).toEqual([]);
    expect(signAdvisories(null)).toEqual([]);
  });
});

describe('beside the box', () => {
  test('the note for each kind of box, or nothing', () => {
    expect(amountSignNote('annual', 'schC.0.loss', 250)).toBe('The Clerk\'s workbook says: "Losses should be entered as negative numbers, e.g., -2500." This one is positive, so it raises the Net Capital Adjustments. It is filed as entered.');
    expect(amountSignNote('finalAccounting', 'schE.3.transferOutAmt', 1)).toBe('The Clerk\'s workbook says: "Transfers out should be entered as negative numbers." This one is positive. It is filed as entered.');
    expect(amountSignNote('annual', 'schC.0.loss', -250)).toBe('');
    expect(amountSignNote('annual', 'schD1.0.fullAmount', -200)).toBe('A negative amount is unusual here; check its sign. It is filed as entered.');
    expect(amountSignNote('guardian', 'scheduleB1.2.fullAssetAmount', -1)).toBe('A negative amount is unusual here; check its sign. It is filed as entered.');
    expect(amountSignNote('annual', 'startingBalance', -1)).toBe('');
    expect(amountSignNote('simplified', 'startingBalance', -1)).toBe('');
    expect(amountSignNote('annual', 'schC.0.gain', -1)).toBe('');
    expect(amountSignNote('annual', 'schA.0.amount', 50)).toBe('');
    expect(amountSignNote('annual', 'schA.0.payee', -1), 'not an amount box').toBe('');
    expect(amountSignNote('guardian', 'schC.0.loss', 250), 'the rule is the Annual family\'s').toBe('');
  });

  test('a share of 1% or less, on the Annual family\'s Schedule D and every Inventory share', () => {
    expect(smallShareNote('annual', 'schD1.0.wardPct', 0.5)).toBe("Ward's % reads as 0.5%. If the ward's share is the whole amount, enter 100.");
    expect(smallShareNote('trustAccounting', 'schD5.2.wardPct', '1')).toBe("Ward's % reads as 1%. If the ward's share is the whole amount, enter 100.");
    expect(smallShareNote('guardian', 'scheduleB2.1.wardPercent', 0.25)).toBe("Ward's % reads as 0.25%. If the ward's share is the whole amount, enter 100.");
    expect(smallShareNote('guardian', 'scheduleC5.0.jointOwnerPercent', 0.5)).toBe("Joint Owner's % reads as 0.5%. Enter a share as a percentage: 50 for half.");
    for (const v of [50, 0, '', null, 1.5, -0.5, 'x']) expect(smallShareNote('guardian', 'scheduleA1.0.wardPercent', v), String(v)).toBe('');
    expect(smallShareNote('annual', 'trusts.0.wardPct', 0.5), 'not a Schedule D share').toBe('');
    expect(smallShareNote('simplified', 'schD1.0.wardPct', 0.5)).toBe('');
  });
});

describe('Preview: the Inventory\'s shares', () => {
  test('a share above 0 and at most 1 is pointed out on every schedule, in the Inventory\'s words', () => {
    const notes = inventoryShareAdvisories({
      scheduleA1: [{ wardPercent: 100 }, { wardPercent: 0.5 }],
      scheduleC4: [{ wardPercent: '1' }],
      scheduleC5: [{ jointOwnerPercent: 0.5 }],
    });
    expect(notes).toEqual([
      { code: 'ward-share.small', severity: 'advisory', field: 'scheduleA1.1.wardPercent', message: "A-1 row 2 — Ward's % reads as 0.5%. If the ward's share is the whole amount, enter 100." },
      { code: 'ward-share.small', severity: 'advisory', field: 'scheduleC4.0.wardPercent', message: "C-4 row 1 — Ward's % reads as 1%. If the ward's share is the whole amount, enter 100." },
      { code: 'ward-share.small', severity: 'advisory', field: 'scheduleC5.0.jointOwnerPercent', message: "C-5 row 1 — Joint Owner's % reads as 0.5%. Enter a share as a percentage: 50 for half." },
    ]);
    expect(inventoryShareAdvisories(null)).toEqual([]);
  });

  test('the Annual\'s notes read as they did', () => {
    expect(wardShareAdvisories({ schD1: [{ wardPct: 0.5 }] })[0].message).toBe("Schedule D-1 — Line 1 — Ward's % reads as 0.5%. If the ward's share is the whole amount, enter 100.");
  });
});

describe('the Inventory\'s own checks', () => {
  const issuesFor = (row) => engine.collectGuardianIssues({ ...model.emptyDataGuardian(), scheduleA1: [{ ...model.mk.a1(), ...row }] })
    .map((i) => (typeof i === 'string' ? i : i.message));

  test('a negative Full Asset Value is no longer "must be > 0"; a blank or 0 one still is', () => {
    const rule = 'A-1 row 1 — Full Asset Value must be > 0.';
    expect(issuesFor({ fullAssetValue: -5 })).not.toContain(rule);
    expect(issuesFor({ fullAssetValue: 0 })).toContain(rule);
    expect(issuesFor({ fullAssetValue: '' })).toContain(rule);
    expect(issuesFor({ fullAssetValue: 5 })).not.toContain(rule);
  });

  test('the share list the checks use is the one the notes use', async () => {
    const shares = await import('../../src/core/filing/ward-share-advisories.js');
    expect(engine.INVENTORY_SHARE_FIELDS).toBe(shares.INVENTORY_SHARE_FIELDS);
  });
});
