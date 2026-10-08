import { describe, expect, test } from 'vitest';
import {
  BOND_DEPOSITORY_OPTIONS, BOND_DEPOSITORY_STATES, normalizeBondDepositoryState,
  revealsBond, revealsDepository, revealsWaiver, hasBondDetails,
  inferBondDepositoryState, migrateBondDepository, bondDepositoryAdvisories, bondDepositoryPdfLines,
  bondAmountCellValue, bondAmountFromCell, bondStateFromWorkbook,
} from '../../src/core/filing/bond-depository.js';

// Milestone 67B. One four-state question -- restricted depository only, bond
// and restricted depository, bond only, bond waived by court order -- replaces
// the Inventory's "has the bond been waived?" and the Annual's "restricted
// depository?" and, on both forms, nothing in the bond block blocks export any
// more. This module is the shared half: reading a filing saved under the old
// shape, what each state reveals, what the print preview warns about, and
// what the PDF says.

const fmt = (iso) => { const [y, m, d] = iso.split('-'); return `${m}/${d}/${y}`; };

describe('the states and what each reveals', () => {
  test('four states, in the order the tester proposed them, with their labels', () => {
    expect(BOND_DEPOSITORY_OPTIONS.map((o) => o.value)).toEqual(BOND_DEPOSITORY_STATES);
    expect(BOND_DEPOSITORY_OPTIONS.map((o) => o.label)).toEqual([
      'Restricted depository only', 'Bond and restricted depository', 'Bond only', 'Bond waived by court order',
    ]);
  });

  test('anything that is not a state normalizes to unanswered', () => {
    for (const v of ['', null, undefined, 'Yes', 'No', 'waived', 0, true]) expect(normalizeBondDepositoryState(v)).toBe('');
    for (const s of BOND_DEPOSITORY_STATES) expect(normalizeBondDepositoryState(s)).toBe(s);
  });

  test('each state reveals only the fields it needs', () => {
    const table = {
      'depository-only': [true, false, false],
      'bond-and-depository': [true, true, false],
      'bond-only': [false, true, false],
      'bond-waived': [false, false, true],
      '': [false, false, false],
    };
    for (const [state, [dep, bond, waiver]] of Object.entries(table)) {
      expect([revealsDepository(state), revealsBond(state), revealsWaiver(state)], state).toEqual([dep, bond, waiver]);
    }
  });
});

describe('reading a filing saved under the old shape (the migration table)', () => {
  test('a stored state wins over every legacy field', () => {
    expect(inferBondDepositoryState({ bondDepositoryState: 'bond-only', bondWaived: 'Yes', restrictedDepository: 'Yes' })).toBe('bond-only');
  });

  test('Inventory: bondWaived Yes, or a waiver date alone, reads as bond-waived', () => {
    expect(inferBondDepositoryState({ bondWaived: 'Yes' })).toBe('bond-waived');
    expect(inferBondDepositoryState({ bondWaived: true })).toBe('bond-waived');
    expect(inferBondDepositoryState({ bondWaived: '', bondWaivedDate: '2026-03-03' })).toBe('bond-waived');
    // Waived wins even with bond details typed earlier.
    expect(inferBondDepositoryState({ bondWaived: 'Yes', bondAmount: '5000' })).toBe('bond-waived');
  });

  test('Annual: restricted depository Yes with bond details is both; without, depository only', () => {
    expect(inferBondDepositoryState({ restrictedDepository: 'Yes', bondAmount: '5000', bondingCompany: 'Gulf Surety' })).toBe('bond-and-depository');
    expect(inferBondDepositoryState({ restrictedDepository: 'Yes' })).toBe('depository-only');
    // The 57A legacy rule: a receipt date can only have been entered because
    // there is a depository.
    expect(inferBondDepositoryState({ restrictedDepository: '', restrictedDepositoryReceiptDate: '2026-02-02' })).toBe('depository-only');
  });

  test('a bond amount or a bonding company with no depository answer, or with an explicit No, reads as bond-only', () => {
    expect(inferBondDepositoryState({ bondAmount: '5000' })).toBe('bond-only');
    expect(inferBondDepositoryState({ restrictedDepository: 'No', bondingCompany: 'Gulf Surety' })).toBe('bond-only');
    expect(inferBondDepositoryState({ bondWaived: 'No', bondingCompany: 'Gulf Surety', bondPeriodFrom: '2026-01-01' })).toBe('bond-only');
  });

  // On the Annual the bond period is the accounting period (Milestone 67D):
  // every filing has one and the importer derives it for every workbook, so
  // the dates alone say nothing about a bond. Found by the e2e import round
  // trip, where a depository-only filing came back as bond-and-depository.
  test('the bond period dates alone are not a bond', () => {
    expect(hasBondDetails({ bondPeriodFrom: '2026-01-01', bondPeriodTo: '2027-01-01' })).toBe(false);
    expect(inferBondDepositoryState({ bondWaived: 'No', bondPeriodFrom: '2026-01-01' })).toBe('');
    expect(inferBondDepositoryState({ restrictedDepositoryReceiptDate: '2026-02-02', bondPeriodFrom: '2026-01-01', bondPeriodTo: '2027-01-01', bondAmount: 0 })).toBe('depository-only');
  });

  // Both workbooks write a blank Bond Amount as the number 0 (numValue) and
  // read it back as 0, so a re-imported filing with no bond must not become
  // one. Found by the e2e import round trip.
  test('a zero bond amount is not a bond', () => {
    for (const zero of [0, '0', '0.00']) expect(hasBondDetails({ bondAmount: zero }), String(zero)).toBe(false);
    expect(hasBondDetails({ bondAmount: 'TBD' }), 'non-numeric text is still something the filer typed').toBe(true);
    expect(inferBondDepositoryState({ restrictedDepositoryReceiptDate: '2026-02-02', bondAmount: 0 })).toBe('depository-only');
    expect(inferBondDepositoryState({ bondAmount: 0 })).toBe('');
  });

  // AGENTS.md section 4: never coerce an unanswered tri-state into a state.
  test('nothing entered stays unanswered -- a blank answer with blank fields is not depository-only', () => {
    expect(inferBondDepositoryState({})).toBe('');
    expect(inferBondDepositoryState({ restrictedDepository: '', bondWaived: '', bondAmount: '', bondingCompany: '' })).toBe('');
    expect(inferBondDepositoryState({ restrictedDepository: 'No', bondWaived: 'No' })).toBe('');
    expect(inferBondDepositoryState(null)).toBe('');
  });

  test('migrateBondDepository sets the state once, removes the retired tri-states, and is idempotent', () => {
    const inv = { bondWaived: 'Yes', bondWaivedDate: '2026-03-03', bondAmount: '' };
    expect(migrateBondDepository(inv)).toBe(true);
    expect(inv).toEqual({ bondDepositoryState: 'bond-waived', bondWaivedDate: '2026-03-03', bondAmount: '' });
    expect(migrateBondDepository(inv)).toBe(false);

    const ann = { restrictedDepository: 'Yes', restrictedDepositoryReceiptDate: '2026-02-02', bondAmount: '5000' };
    migrateBondDepository(ann);
    expect(ann).toEqual({ bondDepositoryState: 'bond-and-depository', restrictedDepositoryReceiptDate: '2026-02-02', bondAmount: '5000' });

    const fresh = { bondDepositoryState: '', bondAmount: '' };
    expect(migrateBondDepository(fresh)).toBe(false);
    expect(fresh.bondDepositoryState).toBe('');
    expect(migrateBondDepository(null)).toBe(false);
  });

  test('a garbage stored state is re-inferred rather than kept', () => {
    const f = { bondDepositoryState: 'waived', bondWaivedDate: '2026-03-03' };
    migrateBondDepository(f);
    expect(f.bondDepositoryState).toBe('bond-waived');
  });

  // Milestone 73M, decided 2026-10-07: only a file saved under the old shape
  // is guessed for. A current filing -- it has the question, unanswered --
  // stays unanswered whatever its fields hold, so a filer who typed bond
  // details is asked, and an import that left the answer blank is not
  // guessed again when the page redraws. Until 73M each of these was guessed.
  test('a current filing whose answer is blank stays blank, whatever its fields hold', () => {
    const current = [
      { bondDepositoryState: '', bondAmount: '5000', bondingCompany: 'Gulf Surety' },
      { bondDepositoryState: '', restrictedDepositoryReceiptDate: '2026-02-02' },
      { bondDepositoryState: '', bondWaivedDate: '2026-03-03' },
    ];
    for (const f of current) {
      expect(inferBondDepositoryState(f), JSON.stringify(f)).toBe('');
      expect(migrateBondDepository(f), JSON.stringify(f)).toBe(false);
      expect(bondDepositoryPdfLines(f, fmt), JSON.stringify(f)).toEqual([]);
      expect(bondDepositoryAdvisories(f).map((a) => a.code), JSON.stringify(f)).toEqual(['bond-depository.unanswered']);
    }
    // A null answer is unanswered too: tidied to '', never guessed.
    const nulled = { bondDepositoryState: null, bondAmount: '5000' };
    expect(inferBondDepositoryState(nulled)).toBe('');
    migrateBondDepository(nulled);
    expect(nulled.bondDepositoryState).toBe('');
    // Saved under the old shape -- a retired Yes/No present, even blank, or
    // no question at all -- is still read as before.
    expect(inferBondDepositoryState({ bondDepositoryState: '', bondWaived: '', bondWaivedDate: '2026-03-03' })).toBe('bond-waived');
    expect(inferBondDepositoryState({ bondDepositoryState: '', restrictedDepository: '', bondAmount: '5000' })).toBe('bond-only');
    expect(inferBondDepositoryState({ bondAmount: '5000' })).toBe('bond-only');
    // A stored answer always wins.
    expect(inferBondDepositoryState({ bondDepositoryState: 'bond-only', restrictedDepositoryReceiptDate: '2026-02-02' })).toBe('bond-only');
  });
});

// Milestone 73M: an imported workbook answers the question only where one
// arrangement alone could have produced what it carries. The Inventory's
// workbook has no depository box, so its bond details fit "bond only" and
// "bond and restricted depository" alike (it used to come back as "Bond
// only"); the Annual's bond details alone fit "bond only" and an unanswered
// filing alike.
describe('the arrangement an imported workbook shows', () => {
  test('the Inventory: a waiver date means bond waived; bond details alone are left for the filer', () => {
    expect(bondStateFromWorkbook({ bondWaivedDate: '2026-03-03' }, 'guardian')).toBe('bond-waived');
    expect(bondStateFromWorkbook({ bondAmount: 5000, bondingCompany: 'Gulf Surety' }, 'guardian')).toBe('');
    expect(bondStateFromWorkbook({}, 'guardian')).toBe('');
  });

  test('the Annual family: the receipt date with or without bond details; bond details alone are left for the filer', () => {
    expect(bondStateFromWorkbook({ restrictedDepositoryReceiptDate: '2026-02-02' }, 'annual')).toBe('depository-only');
    expect(bondStateFromWorkbook({ restrictedDepositoryReceiptDate: '2026-02-02', bondAmount: 5000 }, 'annual')).toBe('bond-and-depository');
    expect(bondStateFromWorkbook({ restrictedDepositoryReceiptDate: '2026-02-02', bondingCompany: 'Gulf Surety' }, 'annual')).toBe('bond-and-depository');
    expect(bondStateFromWorkbook({ bondAmount: 5000, bondingCompany: 'Gulf Surety' }, 'annual')).toBe('');
    // The bond period alone is the accounting period, and a 0 amount is a
    // blank cell (67D, 2026-09-24): neither is a bond.
    expect(bondStateFromWorkbook({ restrictedDepositoryReceiptDate: '2026-02-02', bondAmount: 0, bondPeriodFrom: '2026-01-01' }, 'annual')).toBe('depository-only');
  });

  test('no draft, or a form with no bond block, answers nothing', () => {
    expect(bondStateFromWorkbook(null, 'annual')).toBe('');
    expect(bondStateFromWorkbook({ bondWaivedDate: '2026-03-03' }, 'simplified')).toBe('');
  });
});

// 2026-09-24, requester: a blank Bond Amount exports blank, not 0, and reads
// back blank. The Annual wrote a blank field to PART IX H20 as the number 0
// (numValue) and read it back as 0; the Inventory's reader hands a blank G26
// back as 0 too. Neither is a bond.
describe('the Bond Amount cell: blank stays blank in both directions', () => {
  test('a blank field writes a blank cell; a number writes the number', () => {
    for (const blank of ['', null, undefined]) expect(bondAmountCellValue(blank), String(blank)).toBe('');
    expect(bondAmountCellValue('5000')).toBe(5000);
    expect(bondAmountCellValue(5000)).toBe(5000);
    expect(bondAmountCellValue('2500.50')).toBe(2500.5);
    // A typed 0 is written faithfully; only an empty field is a blank cell.
    expect(bondAmountCellValue('0')).toBe(0);
    expect(bondAmountCellValue('TBD'), 'non-numeric text cannot go in a numeric cell, and 0 would misstate it').toBe('');
  });

  test('a blank cell, and the 0 both readers hand back for one, read as a blank field', () => {
    for (const blank of ['', null, undefined, 0, '0']) expect(bondAmountFromCell(blank), String(blank)).toBe('');
    expect(bondAmountFromCell(5000)).toBe(5000);
    expect(bondAmountFromCell('5000')).toBe(5000);
    expect(bondAmountFromCell(NaN)).toBe('');
  });
});

describe('what the print preview warns about -- advisory, never blocking', () => {
  const codes = (f, section) => bondDepositoryAdvisories(f, { section }).map((a) => a.code);

  test('unanswered: one advisory that says the filing can still be filed', () => {
    const [a, ...rest] = bondDepositoryAdvisories({ bondDepositoryState: '' }, { section: 'Part IX' });
    expect(rest).toEqual([]);
    expect(a.code).toBe('bond-depository.unanswered');
    expect(a.severity).toBe('advisory');
    expect(a.field).toBe('bondDepositoryState');
    expect(a.message).toMatch(/^Part IX — /);
    expect(a.message).toContain('can be filed without it');
  });

  test('each state warns only about the fields it reveals, and only when blank', () => {
    expect(codes({ bondDepositoryState: 'bond-only' }, 'D-4')).toEqual(['bond-depository.bond-amount', 'bond-depository.bonding-company']);
    expect(codes({ bondDepositoryState: 'bond-only', bondAmount: '5000', bondingCompany: 'Gulf Surety' }, 'D-4')).toEqual([]);
    expect(codes({ bondDepositoryState: 'depository-only' }, 'D-4')).toEqual(['bond-depository.receipt-date']);
    expect(codes({ bondDepositoryState: 'depository-only', restrictedDepositoryReceiptDate: '2026-02-02' }, 'D-4')).toEqual([]);
    expect(codes({ bondDepositoryState: 'bond-and-depository', bondAmount: '5000' }, 'D-4'))
      .toEqual(['bond-depository.bonding-company', 'bond-depository.receipt-date']);
    expect(codes({ bondDepositoryState: 'bond-waived' }, 'D-4')).toEqual(['bond-depository.waiver-date']);
    expect(codes({ bondDepositoryState: 'bond-waived', bondWaivedDate: '2026-03-03' }, 'D-4')).toEqual([]);
  });

  // Milestone 74H (decision 74H-2, any shortfall -- Pinellas Clerk practice,
  // the threshold approved by name under AGENTS.md section 5): a Bond Amount
  // below the requirement the form calculates, quoting each form's own
  // workbook. Red-first: no such advisory existed.
  test('a bond below the requirement is pointed out, quoting the form\'s own workbook', () => {
    const bond = { bondDepositoryState: 'bond-only', bondAmount: 10000, bondingCompany: 'Gulf Surety' };
    const [inventory, ...rest] = bondDepositoryAdvisories(bond, { section: 'D-4', form: 'guardian', requirement: 50100 });
    expect(rest).toEqual([]);
    expect(inventory).toEqual({
      code: 'bond-depository.bond-shortfall', severity: 'advisory', field: 'bondAmount',
      message: 'D-4 — Bond Amount, $10,000.00, is below the bond requirement this filing calculates, $50,100.00. The Clerk\'s workbook says: "The court often requires a bond in the amount of the Ward\'s liquid assets." The filing can be filed as it is.',
    });
    expect(bondDepositoryAdvisories({ ...bond, bondAmount: '10000' }, { section: 'Part IX', form: 'annual', requirement: 20000 })[0].message)
      .toBe('Part IX — Bond Amount, $10,000.00, is below the bond requirement this filing calculates, $20,000.00. The Clerk\'s workbook says: "Guardianship bond amount should be the amount of all liquid assets less those in a restricted depository or frozen account." The filing can be filed as it is.');
  });

  test('any shortfall, to the cent; a bond at or above the requirement says nothing', () => {
    const bond = (bondAmount) => ({ bondDepositoryState: 'bond-and-depository', bondAmount, bondingCompany: 'Gulf Surety', restrictedDepositoryReceiptDate: '2026-02-02' });
    expect(codes(bond(19999.99), 'Part IX')).toEqual([]);
    expect(bondDepositoryAdvisories(bond(19999.99), { section: 'Part IX', requirement: 20000 }).map((a) => a.code)).toEqual(['bond-depository.bond-shortfall']);
    expect(bondDepositoryAdvisories(bond(20000), { section: 'Part IX', requirement: 20000 })).toEqual([]);
    expect(bondDepositoryAdvisories(bond(25000), { section: 'Part IX', requirement: 20000 })).toEqual([]);
    expect(bondDepositoryAdvisories(bond(20000), { section: 'Part IX', requirement: 20000.004 }), 'compared in cents').toEqual([]);
  });

  test('no shortfall is judged without a bond: a waived bond, a depository only, a blank or unreadable amount, or no requirement given', () => {
    const judged = (f) => bondDepositoryAdvisories(f, { section: 'D-4', form: 'guardian', requirement: 50000 }).map((a) => a.code);
    expect(judged({ bondDepositoryState: 'bond-waived', bondWaivedDate: '2026-03-03', bondAmount: 1 })).toEqual([]);
    expect(judged({ bondDepositoryState: 'depository-only', restrictedDepositoryReceiptDate: '2026-02-02', bondAmount: 1 })).toEqual([]);
    expect(judged({ bondDepositoryState: 'bond-only', bondingCompany: 'Gulf Surety', bondAmount: '' })).toEqual(['bond-depository.bond-amount']);
    expect(judged({ bondDepositoryState: 'bond-only', bondingCompany: 'Gulf Surety', bondAmount: 'N/A' })).toEqual([]);
    expect(bondDepositoryAdvisories({ bondDepositoryState: 'bond-only', bondingCompany: 'Gulf Surety', bondAmount: 1 }, { section: 'D-4' })).toEqual([]);
  });

  test('the section label leads every message, so the filer knows which page', () => {
    for (const a of bondDepositoryAdvisories({ bondDepositoryState: 'bond-and-depository' }, { section: 'D-4' })) {
      expect(a.message.startsWith('D-4 — ')).toBe(true);
    }
    expect(bondDepositoryAdvisories(null)).toEqual([]);
  });
});

describe('what the PDF says (requester-approved wording, 2026-09-23)', () => {
  test('bond waived prints the order date', () => {
    expect(bondDepositoryPdfLines({ bondDepositoryState: 'bond-waived', bondWaivedDate: '2026-03-03' }, fmt))
      .toEqual(['Bond waived by court order dated 03/03/2026.']);
    expect(bondDepositoryPdfLines({ bondDepositoryState: 'bond-waived' }, fmt))
      .toEqual(['Bond waived by court order dated [date].']);
  });

  test('a restricted depository prints the receipt date, with or without a bond', () => {
    const line = 'Assets held in a restricted depository. Most recent receipt dated 02/02/2026.';
    expect(bondDepositoryPdfLines({ bondDepositoryState: 'depository-only', restrictedDepositoryReceiptDate: '2026-02-02' }, fmt)).toEqual([line]);
    expect(bondDepositoryPdfLines({ bondDepositoryState: 'bond-and-depository', restrictedDepositoryReceiptDate: '2026-02-02' }, fmt)).toEqual([line]);
  });

  test('bond only and unanswered add nothing -- the bond block prints as today', () => {
    expect(bondDepositoryPdfLines({ bondDepositoryState: 'bond-only', bondAmount: '5000' }, fmt)).toEqual([]);
    expect(bondDepositoryPdfLines({ bondDepositoryState: '' }, fmt)).toEqual([]);
    expect(bondDepositoryPdfLines(null, fmt)).toEqual([]);
  });
});
