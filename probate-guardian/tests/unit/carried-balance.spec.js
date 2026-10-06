// Milestone 71E: one carry of an ending balance into a new filing's Starting
// Balance (src/core/filing/starting-balance-carry.js), and the Starting
// Balance's own rules.
//
// Five paths carried a Starting Balance and none agreed: the four that carried
// anything carried an unrounded float (the QA filing's next year showed
// `797229.1849999999`); Annual -> Final/Trust always took Line 30, even a $0
// one from a filing with no Schedule D; an Initial Inventory converted into its
// first Annual carried nothing; a Trust Accounting created from an Annual
// started from the whole estate; a carried negative became $0 when the filing
// opened; and a $0.00 Starting Balance was reported missing. The Clerk's audit
// lists any difference from the prior filing's ending balance as a
// discrepancy.
import { afterAll, beforeAll, describe, expect, test, vi } from 'vitest';
import { openFiling } from './support/open-filing.js';
import { emptyDataAnnual } from '../../src/core/filing/models/annual.js';
import { emptyDataGuardian, mk } from '../../src/core/filing/models/guardian.js';
import { emptyDataSimplified } from '../../src/core/filing/models/simplified.js';
import { getD } from '../../src/core/state.js';

let carry;
let validateAnnual;
let annualReconcileState;
let hasScheduleDFigure;

beforeAll(async () => {
  vi.stubGlobal('window', globalThis);
  const [{ provideFeatureServices }, annualTotals, guardianTotals, simplifiedTotals] = await Promise.all([
    import('../../src/core/runtime/features.js'),
    import('../../src/features/annual-accounting/totals.js'),
    import('../../src/features/guardian-inventory/totals.js'),
    import('../../src/features/simplified-accounting/totals.js'),
  ]);
  provideFeatureServices({ totals: { annual: annualTotals.calcTotalsAnnual, guardian: guardianTotals.calcTotalsGuardian, simplified: simplifiedTotals.calcTotals } });
  annualReconcileState = annualTotals.annualReconcileState;
  carry = await import('../../src/core/filing/starting-balance-carry.js');
  ({ hasScheduleDFigure } = await import('../../src/core/filing/schedule-d-figure.js'));
  ({ validateAnnual } = await import('../../src/features/annual-accounting/index.js'));
});

afterAll(() => {
  vi.unstubAllGlobals();
});

const d1 = (fullAmount, wardPct = 100) => ({ description: 'Account', accountNo: '1', restricted: 'No', type: 'Checking', fullAmount, wardPct, restrictedAmt: '' });
// Starting Balance 1,000 plus 200 income: Line 20 is 1,200.
const annual = (over = {}) => ({ ...emptyDataAnnual(), wardId: 'src', inventoryType: 'annual', periodFrom: '2026-01-01', periodTo: '2026-12-31', startingBalance: 1000, schA: [{ payer: 'Bank', description: 'Interest', bank: 'B', accountNo: '1', amount: 200 }], ...over });

describe('the one carry: which figure, rounded to cents, stored as a number', () => {
  test('Annual family: Line 30 when the source has a Schedule D figure', () => {
    const r = carry.carriedEndingBalance(annual({ schD1: [d1(1200)] }), 'finalAccounting');
    expect(r).toEqual({ value: 1200, line20: 1200, line30: 1200, used: 'line30' });
  });

  test('Annual family: Line 20 when the source has no Schedule D figure (it used to carry a $0 Line 30)', () => {
    expect(carry.carriedEndingBalance(annual(), 'finalAccounting')).toMatchObject({ value: 1200, used: 'line20' });
    // Rows holding only text are not a Schedule D figure.
    expect(carry.carriedEndingBalance(annual({ schD1: [{ ...d1(''), description: 'Closed account' }] }), 'annual')).toMatchObject({ used: 'line20' });
  });

  test('a Schedule D with amounts but blank shares is still a Schedule D (entered amounts, not computed totals)', () => {
    const src = annual({ schD1: [d1(5000, '')] });
    expect(hasScheduleDFigure(src)).toBe(true);
    expect(carry.carriedEndingBalance(src, 'annual')).toMatchObject({ used: 'line30', value: 0 });
  });

  test('the QA figure carries as the number the Clerk\'s workbook prints, never the raw double', () => {
    const src = annual({ startingBalance: 797229.1849999999, schA: [], schD1: [d1(1594458.37, 50)] });
    const r = carry.carriedEndingBalance(src, 'annual');
    expect(r.value).toBe(797229.19);
    expect(r.line20).toBe(797229.19);
    expect(typeof r.value).toBe('number');
  });

  test('a negative ending balance carries as that negative', () => {
    const src = annual({ schD1: [d1(1000)], schD5: [{ description: 'Mortgage', loanNo: '1', loanType: 'Home', fullDebt: 6000, wardPct: 100 }] });
    expect(carry.carriedEndingBalance(src, 'annual')).toMatchObject({ used: 'line30', value: -5000 });
  });

  test('Initial Inventory: its Summary I total (Rule 5.696(b)(1): "the value of assets on the inventory")', () => {
    const inv = { ...emptyDataGuardian(), wardId: 'inv', inventoryType: 'guardian', gid: '2026-01-01', scheduleA1: [{ ...mk.a1(), propertyDescription: 'Home', fullAssetValue: 1000.01, wardPercent: 50 }] };
    expect(carry.carriedEndingBalance(inv, 'annual')).toEqual({ value: 500.01, line20: '', line30: '', used: 'inventoryTotal' });
  });

  test('Simplified: the remaining assets on hand', () => {
    const s = { ...emptyDataSimplified(), wardId: 'simp', inventoryType: 'simplified', startingBalance: 1234.56, interestIncome: 0.1, depositsSettlement: 0.2, serviceCharges: 0.3, federalIncomeTax: 1.005 };
    // 1233.5549999999998 in binary; the Clerk's workbook shows $1,233.56.
    expect(carry.carriedEndingBalance(s, 'annual')).toMatchObject({ used: 'simplifiedRemaining', value: 1233.56 });
  });
});

describe('every carry path calls the one carry', () => {
  // New Year (filing-years.js) runs against the saved case file; the browser
  // spec and year-rollover.characterization.spec.ts drive it.
  let carryOverFields;
  let conversion;
  beforeAll(async () => {
    ({ carryOverFields } = await import('../../src/core/filing/carry-over.js'));
    conversion = await import('../../src/core/filing/conversion.js');
  });

  test('New Filing from Existing (Annual family -> Annual family): Line 20 when there is no Schedule D, rounded, with its record', () => {
    const f = carryOverFields(annual({ startingBalance: 797229.1849999999, schA: [] }), 'finalAccounting');
    expect(f.startingBalance).toBe(797229.19);
    expect(f.startingBalanceCarry).toMatchObject({ used: 'line20', value: 797229.19, sourceWardId: 'src' });
  });

  test('Initial Inventory -> Annual: the Summary I total (it carried nothing before)', () => {
    const inv = { ...emptyDataGuardian(), wardId: 'inv', inventoryType: 'guardian', gid: '2026-01-01', scheduleA1: [{ ...mk.a1(), propertyDescription: 'Home', fullAssetValue: 1000.01, wardPercent: 50 }] };
    const dest = { ...emptyDataAnnual(), inventoryType: 'annual' };
    conversion.convertGuardianSchedulesToAnnual(inv, dest);
    expect(dest.startingBalance).toBe(500.01);
    expect(dest.startingBalanceCarry).toMatchObject({ used: 'inventoryTotal', value: 500.01 });
    const trust = { ...emptyDataAnnual(), inventoryType: 'trustAccounting' };
    conversion.convertGuardianSchedulesToAnnual(inv, trust);
    expect(trust.startingBalance).toBe('');
  });

  test('Annual -> Simplified: Line 30, as a number', () => {
    const dest = { ...emptyDataSimplified(), inventoryType: 'simplified' };
    conversion.convertToSimplified(annual({ schD1: [d1(1100.005)] }), 'annual', dest);
    expect(dest.startingBalance).toBe(1100.01);
    expect(dest.startingBalanceCarry).toMatchObject({ used: 'line30', value: 1100.01 });
  });

  test('Simplified -> Annual: the remaining assets on hand', () => {
    const s = { ...emptyDataSimplified(), wardId: 'simp', inventoryType: 'simplified', startingBalance: 1234.56, interestIncome: 0.1, depositsSettlement: 0.2, serviceCharges: 0.3, federalIncomeTax: 1.005 };
    const dest = { ...emptyDataAnnual(), inventoryType: 'annual' };
    conversion.convertSimplifiedToAnnual(s, dest);
    expect(dest.startingBalance).toBe(1233.56);
    expect(dest.startingBalanceCarry).toMatchObject({ used: 'simplifiedRemaining', value: 1233.56 });
  });

  test('the conversion dialog promises only what arrives', () => {
    expect(conversion.describeConversion('annual', 'trustAccounting')).toContain('Starting Balance is left blank');
    expect(conversion.describeConversion('guardian', 'annual')).toContain('The Initial Inventory\'s total becomes the Starting Balance');
    expect(conversion.describeConversion('guardian', 'trustAccounting')).toContain('Starting Balance is left blank');
    expect(conversion.describeConversion('annual', 'finalAccounting')).not.toContain('left blank');
  });
});

describe('the trust boundary: nothing is carried into or out of a Trust Accounting (D9)', () => {
  test.each([
    ['annual', 'trustAccounting'], ['finalAccounting', 'trustAccounting'], ['guardian', 'trustAccounting'], ['simplified', 'trustAccounting'],
    ['trustAccounting', 'annual'], ['trustAccounting', 'finalAccounting'], ['trustAccounting', 'simplified'],
  ])('%s -> %s carries nothing', (from, to) => {
    const src = from === 'guardian' ? { ...emptyDataGuardian(), inventoryType: 'guardian' }
      : from === 'simplified' ? { ...emptyDataSimplified(), inventoryType: 'simplified', startingBalance: 10 }
        : annual({ inventoryType: from, schD1: [d1(1200)] });
    expect(carry.carriedEndingBalance(src, to)).toEqual({ value: '', line20: '', line30: '', used: 'none-trust' });
  });

  test('Trust -> Trust (and a Trust Accounting\'s own New Year) carries under the ordinary rule', () => {
    expect(carry.carriedEndingBalance(annual({ inventoryType: 'trustAccounting', schD1: [d1(700)] }), 'trustAccounting')).toMatchObject({ used: 'line30', value: 700 });
  });
});

describe('the provenance record, and the notes that read it', () => {
  test('applyCarriedStartingBalance() writes the number and the record', () => {
    const dest = { inventoryType: 'finalAccounting' };
    carry.applyCarriedStartingBalance(dest, annual({ schD1: [d1(1100)] }));
    expect(dest.startingBalance).toBe(1100);
    expect(dest.startingBalanceCarry).toMatchObject({ sourceWardId: 'src', sourceLabel: 'Annual Accounting 01/01/2026–12/31/2026', used: 'line30', value: 1100, line20: 1200, line30: 1100 });
    expect(dest.startingBalanceCarry.carriedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  test('a prior filing whose Lines 20 and 30 differ is said so; a Starting Balance changed since the carry is said so', () => {
    const dest = { inventoryType: 'annual' };
    carry.applyCarriedStartingBalance(dest, annual({ schD1: [d1(1100)] }));
    expect(carry.startingBalanceNotes(dest).map((n) => n.code)).toEqual(['starting-balance.prior-unbalanced']);
    dest.startingBalance = 1000;
    const notes = carry.startingBalanceNotes(dest);
    expect(notes.map((n) => n.code)).toEqual(['starting-balance.prior-unbalanced', 'starting-balance.changed-since-carry']);
    expect(notes[1].message).toContain('Starting Balance ($1,000.00) differs from the prior filing\'s ending balance ($1,100.00)');
    expect(notes.every((n) => n.severity === 'advisory')).toBe(true);
  });

  test('across the trust boundary the note says where the figure comes from instead', () => {
    const dest = { inventoryType: 'trustAccounting' };
    carry.applyCarriedStartingBalance(dest, annual({ schD1: [d1(1200)] }));
    expect(dest.startingBalance).toBe('');
    const [note] = carry.startingBalanceNotes(dest);
    expect(note.code).toBe('starting-balance.trust-not-carried');
    expect(note.message).toContain('the amount the annual accounting disbursed into the trust');
  });

  test('an amended accounting for the source\'s period is pointed out; the source itself is not switched', () => {
    const src = annual({ wardId: 'orig', caseId: 'c1', schD1: [d1(1200)] });
    const amended = annual({ wardId: 'amend', caseId: 'c1', amendedForm: 'Yes', schD1: [d1(1250)] });
    const dest = { wardId: 'next', inventoryType: 'annual' };
    carry.applyCarriedStartingBalance(dest, src);
    expect(dest.startingBalance).toBe(1200);
    const codes = carry.startingBalanceNotes(dest, { wards: [src, amended, dest] }).map((n) => n.code);
    expect(codes).toContain('starting-balance.amended-source-exists');
    // Carrying from the amended one raises no such note.
    const dest2 = { wardId: 'next2', inventoryType: 'annual' };
    carry.applyCarriedStartingBalance(dest2, amended);
    expect(carry.startingBalanceNotes(dest2, { wards: [src, amended, dest2] }).map((n) => n.code)).not.toContain('starting-balance.amended-source-exists');
  });

  test('a filing with no carry record has no notes (typed by hand, or created before 71E)', () => {
    expect(carry.startingBalanceNotes({ startingBalance: 5 })).toEqual([]);
  });
});

describe('the Starting Balance itself', () => {
  test('$0.00 is an answer; an empty box is not', () => {
    openFiling(annual({ startingBalance: 0 }));
    expect(validateAnnual().map((e) => String(e.message))).not.toContain('Part II — Starting Balance');
    openFiling(annual({ startingBalance: '' }));
    expect(validateAnnual().map((e) => String(e.message))).toContain('Part II — Starting Balance');
  });

  // Milestone 73G part 1: what opening a filing does to its amounts is
  // normalizeWardData()'s lossless reading (the per-page clamp is retired).
  test('opening a filing no longer turns a negative Starting Balance into $0', async () => {
    const { normalizeWardData } = await import('../../src/core/filing/normalize-filing.js');
    expect(normalizeWardData(annual({ startingBalance: -5000 })).startingBalance).toBe(-5000);
    expect(normalizeWardData(annual({ startingBalance: '(5,000.00)' })).startingBalance).toBe(-5000);
  });

  test('the balance check compares the two lines as they print', () => {
    // 797229.1849999999 and 797229.185 both print as 797,229.19: balanced.
    expect(annualReconcileState({ netAssets: 797229.1849999999, netAssetsFromD: 797229.185 }, emptyDataAnnual()).outOfBalance).toBe(false);
    // 797,229.19 and 797,229.18 print differently: never "equals".
    const st = annualReconcileState({ netAssets: 797229.19, netAssetsFromD: 797229.18 }, emptyDataAnnual());
    expect(st.outOfBalance).toBe(true);
    expect(st.diff).toBe(0.01);
  });
});
