// Milestone 74H: answers within one filing that contradict each other, named
// in Preview's "Review recommended" with both answers and where they are.
// None blocks and none says which answer is right (decision 74H-1).
//
//   a  Inventory: no safe deposit box, while a B-2 or B-3 item is in one
//   c  Inventory A-1, Annual family D-2: two properties marked Personal Residence
//   e  Initial Plan: the Cover says "In a facility", question 2 ticks only Private Residence
//   g  Initial Plan, Plan for Minors: both "declared totally incapacitated" and "a minor"
//   h  Annual Plan: question 2 "has not moved", question 1 lists two residences
//   j  Annual family: Part XI "no remuneration" beside Schedule B-2's guardian fees
//      (the wording the requester reviewed, 2026-10-08)
//   -  Schedule E transfers that don't balance; the Simplified's Line 8 below zero
//
// The bond below its requirement (b) is in bond-depository.spec.js. The
// checks across filings (f, i, k) are not built (decision 74H-3), and d is not
// checkable (74P chose no link from a C-5 row to its asset).
//
// Red-first: consistency-advisories.js doesn't exist before 74H, and Preview
// said none of these.
import { afterAll, beforeAll, describe, expect, test, vi } from 'vitest';
import {
  annualConsistencyAdvisories, consistencyAdvisories, guardianConsistencyAdvisories,
  planAnnualConsistencyAdvisories, planInitialConsistencyAdvisories, planMinorConsistencyAdvisories,
  simplifiedConsistencyAdvisories,
} from '../../src/core/filing/consistency-advisories.js';

const FACILITY = 'In a facility (Skilled Nursing, Assisted Living, etc.)';
const messages = (list) => list.map((a) => a.message);

describe('a: the Inventory\'s safe deposit box', () => {
  test('answered No while B-2 and B-3 items are in one: both named', () => {
    const notes = guardianConsistencyAdvisories({
      hasSafeDepositBox: 'No',
      scheduleB2: [{ inSafeDepositBox: 'No' }, { inSafeDepositBox: 'Yes' }],
      scheduleB3: [{ inSafeDepositBox: true }],
    });
    expect(notes).toEqual([{
      code: 'consistency.safe-deposit-box', severity: 'advisory', field: 'hasSafeDepositBox',
      message: 'D-3 — "Does the ward have a safe deposit box…?" is answered No, while B-2 row 2 and B-3 row 1 are marked "In Safe Deposit Box?" Yes. Review both before filing.',
    }]);
  });

  test('one item reads "is"; Yes, unanswered or nothing in a box says nothing', () => {
    expect(messages(guardianConsistencyAdvisories({ hasSafeDepositBox: false, scheduleB2: [{ inSafeDepositBox: 'Yes' }] })))
      .toEqual(['D-3 — "Does the ward have a safe deposit box…?" is answered No, while B-2 row 1 is marked "In Safe Deposit Box?" Yes. Review both before filing.']);
    for (const answer of ['Yes', '', undefined]) {
      expect(guardianConsistencyAdvisories({ hasSafeDepositBox: answer, scheduleB2: [{ inSafeDepositBox: 'Yes' }] }), String(answer)).toEqual([]);
    }
    expect(guardianConsistencyAdvisories({ hasSafeDepositBox: 'No', scheduleB2: [{ inSafeDepositBox: 'No' }] })).toEqual([]);
  });
});

describe('c: two personal residences', () => {
  test('Inventory A-1 and the Annual family\'s D-2, in each form\'s words', () => {
    expect(guardianConsistencyAdvisories({ scheduleA1: [{ residence: 'Yes' }, { residence: 'No' }, { residence: 'Yes' }] })).toEqual([{
      code: 'consistency.two-residences', severity: 'advisory', field: 'scheduleA1.2.residence',
      message: 'A-1 — Rows 1 and 3 are both marked "Personal Residence?" Yes. Review them before filing.',
    }]);
    expect(messages(annualConsistencyAdvisories({ schD2: [{ residence: 'Yes' }, { residence: 'Yes' }, { residence: 'Yes' }] })))
      .toEqual(['Schedule D-2 — Lines 1, 2 and 3 are all marked "Personal Residence?" Yes. Review them before filing.']);
  });

  test('one residence says nothing', () => {
    expect(guardianConsistencyAdvisories({ scheduleA1: [{ residence: 'Yes' }, { residence: '' }] })).toEqual([]);
    expect(annualConsistencyAdvisories({ schD2: [{ residence: 'Yes' }] })).toEqual([]);
  });
});

describe('j: Part XI "no remuneration" beside Schedule B-2\'s guardian fees', () => {
  test('the wording the requester reviewed, with the total and the count', () => {
    const notes = annualConsistencyAdvisories({
      scheduleNoItems: { remuneration: true },
      schB2: [{ amount: 1000 }, { amount: 200 }, { amount: '' }, { amount: 50 }],
    });
    expect(notes).toEqual([{
      code: 'consistency.remuneration-and-fees', severity: 'advisory', field: 'scheduleNoItems.remuneration',
      message: 'Part XI — No remuneration is declared, while Schedule B-2 lists guardian fees and costs of $1,250.00 (3 entries). The app does not decide whether those fees are remuneration Part XI must declare (§744.367(3)(a)); review both before filing.',
    }]);
    expect(messages(annualConsistencyAdvisories({ scheduleNoItems: { remuneration: true }, schB2: [{ amount: 75 }] }))[0])
      .toContain('of $75.00 (1 entry)');
  });

  test('no tick, or no fees, says nothing', () => {
    expect(annualConsistencyAdvisories({ scheduleNoItems: {}, schB2: [{ amount: 1000 }] })).toEqual([]);
    expect(annualConsistencyAdvisories({ scheduleNoItems: { remuneration: true }, schB2: [{ amount: '' }, { amount: 0 }] })).toEqual([]);
  });
});

describe('Schedule E: transfers in and out that don\'t balance', () => {
  test('compared by size, quoting the workbook', () => {
    const notes = annualConsistencyAdvisories({ schE: [{ transferInAmt: 5000, transferOutAmt: '' }, { transferInAmt: '', transferOutAmt: -4000 }] });
    expect(notes).toEqual([{
      code: 'consistency.transfers-unbalanced', severity: 'advisory', field: 'schE.0.transferInAmt',
      message: 'Schedule E — Transfers in add up to $5,000.00 and transfers out to $4,000.00, so they don\'t balance. The Clerk\'s workbook says: "Each transfer should be listed twice. Once going out of an account and again going into another account." Review them before filing.',
    }]);
  });

  test('balanced, or an out entered without its minus (the sign note\'s business), or none: nothing', () => {
    expect(annualConsistencyAdvisories({ schE: [{ transferInAmt: 5000, transferOutAmt: -5000 }] })).toEqual([]);
    expect(annualConsistencyAdvisories({ schE: [{ transferInAmt: 5000 }, { transferOutAmt: 5000 }] })).toEqual([]);
    expect(annualConsistencyAdvisories({ schE: [] })).toEqual([]);
    expect(annualConsistencyAdvisories({ schE: [{ transferInAmt: 100.004, transferOutAmt: -100 }] }), 'to the cent').toEqual([]);
  });
});

describe('the Simplified\'s Line 8', () => {
  test('below zero: the report\'s ($1,999.13)', () => {
    expect(simplifiedConsistencyAdvisories({}, { remaining: -1999.13 })).toEqual([{
      code: 'consistency.remaining-below-zero', severity: 'advisory', field: 'startingBalance',
      message: 'Part II — Line 8 — Remaining Assets On Hand is below zero: ($1,999.13). Review the amounts in Part II before filing.',
    }]);
  });

  test('zero, above zero, a fraction of a cent below, or no totals: nothing', () => {
    for (const remaining of [0, 10, -0.004]) expect(simplifiedConsistencyAdvisories({}, { remaining }), String(remaining)).toEqual([]);
    expect(simplifiedConsistencyAdvisories({}, null)).toEqual([]);
  });
});

describe('e and g: the Initial Plan', () => {
  test('e: a facility on the Cover, only Private Residence in question 2', () => {
    expect(planInitialConsistencyAdvisories({ wardLiving: FACILITY, q2PrivateResidence: true })).toEqual([{
      code: 'consistency.facility-and-private-residence', severity: 'advisory', field: 'q2PrivateResidence',
      message: `2–3. Setting & Medical Care — Question 2 ticks only "Private Residence", while the Cover says the ward is living "${FACILITY}". Review both before filing.`,
    }]);
  });

  test('e: another setting ticked too, or a private residence on the Cover, says nothing', () => {
    expect(planInitialConsistencyAdvisories({ wardLiving: FACILITY, q2PrivateResidence: true, q2ALF: true })).toEqual([]);
    expect(planInitialConsistencyAdvisories({ wardLiving: 'In a private residence leased or owned by them (house, condo or apartment)', q2PrivateResidence: true })).toEqual([]);
    expect(planInitialConsistencyAdvisories({ wardLiving: FACILITY, q2SkilledNursing: true })).toEqual([]);
  });

  test('g: both certifications', () => {
    expect(messages(planInitialConsistencyAdvisories({ certIncapacitatedNoCopy: true, certMinorNoCopy: true }))).toEqual([
      'Signatures — Both "The Ward was declared totally incapacitated and has not been given a copy of this plan" and "The Ward is a minor under the age of 14 and has not been given a copy of this plan" are ticked. Review both before filing.',
    ]);
    expect(planInitialConsistencyAdvisories({ certIncapacitatedNoCopy: true })).toEqual([]);
  });
});

describe('g: the Plan for Minors', () => {
  test('both certifications', () => {
    expect(planMinorConsistencyAdvisories({ certIncapacitated: true, certMinor: true })).toEqual([{
      code: 'consistency.incapacitated-and-minor', severity: 'advisory', field: 'certMinor',
      message: 'Guardian Signatures — Both "The Ward was declared totally incapacitated." and "The Ward is a minor." are ticked. Review both before filing.',
    }]);
    expect(planMinorConsistencyAdvisories({ certMinor: true })).toEqual([]);
  });
});

describe('h: the Annual Plan', () => {
  const residence = (name) => ({ name, facilityType: '', street: '', cityStateZip: '', phone: '', from: null, to: null });
  test('"has not moved" while question 1 lists two residences', () => {
    expect(planAnnualConsistencyAdvisories({ q2NoMove: true, q1Residences: [residence('Sunrise ALF'), residence('Oak Manor')] })).toEqual([{
      code: 'consistency.not-moved-and-residences', severity: 'advisory', field: 'q2NoMove',
      message: '2–3. Residence & Care — Question 2 is ticked "N/A — the ward has not moved since the last plan was filed", while question 1 lists 2 residences. Review both before filing.',
    }]);
  });

  test('one residence, an untouched second card, or not ticked: nothing', () => {
    expect(planAnnualConsistencyAdvisories({ q2NoMove: true, q1Residences: [residence('Sunrise ALF')] })).toEqual([]);
    expect(planAnnualConsistencyAdvisories({ q2NoMove: true, q1Residences: [residence('Sunrise ALF'), residence('')] })).toEqual([]);
    expect(planAnnualConsistencyAdvisories({ q2NoMove: false, q1Residences: [residence('A'), residence('B')] })).toEqual([]);
  });
});

describe('by form', () => {
  test('each engine gets its own checks; a consistent or empty filing raises none', () => {
    expect(consistencyAdvisories({ certIncapacitated: true, certMinor: true }, 'planMinor').length).toBe(1);
    expect(consistencyAdvisories({ certIncapacitated: true, certMinor: true }, 'planSimplified')).toEqual([]);
    expect(consistencyAdvisories({}, 'simplified', { totals: { remaining: -1 } }).length).toBe(1);
    for (const engineId of ['guardian', 'annual', 'simplified', 'planInitial', 'planMinor', 'planAnnual']) {
      expect(consistencyAdvisories({}, engineId), engineId).toEqual([]);
      expect(consistencyAdvisories(null, engineId), engineId).toEqual([]);
    }
  });
});

// Each warning reaches Preview's "Review recommended" (73F part 1's
// evaluate<Engine>().advisories) and is never a blocker.
describe('in Preview', () => {
  let m;
  beforeAll(async () => {
    vi.stubGlobal('window', globalThis);
    const [registry, engines, features, guardianTotals, simplifiedTotals] = await Promise.all([
      import('../../src/core/filing/filing-registry.js'),
      import('../../src/core/validation/engines/index.js'),
      import('../../src/core/runtime/features.js'),
      import('../../src/features/guardian-inventory/totals.js'),
      import('../../src/features/simplified-accounting/totals.js'),
    ]);
    // The totals the composition root hands core (src/features-loader.js).
    features.provideFeatureServices({ totals: { guardian: guardianTotals.calcTotalsGuardian, simplified: simplifiedTotals.calcTotals } });
    m = { registry, engines };
  }, 120_000);
  afterAll(() => vi.unstubAllGlobals());

  const typed = (type, extra) => ({ ...JSON.parse(JSON.stringify(m.registry.initializeEmptyData(type))), inventoryType: type, ...extra });
  const judged = (filing) => m.engines.evaluateFiling(filing);
  const codesOf = (list) => list.map((a) => a.code);

  test('the Inventory: a, c, a small share, a negative amount and a bond below its requirement', () => {
    const d = typed('guardian', {
      hasSafeDepositBox: 'No',
      scheduleA1: [{ residence: 'Yes', fullAssetValue: -5, wardPercent: 100 }, { residence: 'Yes', fullAssetValue: 10, wardPercent: 0.5 }],
      scheduleB1: [{ institutionName: 'Bank', fullAssetAmount: 50000, wardPercent: 100, restricted: 'No' }],
      scheduleB2: [{ description: 'Ring', fullAssetValue: 100, wardPercent: 100, inSafeDepositBox: 'Yes' }],
      bondDepositoryState: 'bond-only', bondAmount: 10000, bondingCompany: 'Gulf Surety',
    });
    const { advisories, blockers } = judged(d);
    expect(codesOf(advisories)).toEqual(expect.arrayContaining([
      'consistency.safe-deposit-box', 'consistency.two-residences', 'ward-share.small', 'amount.negative-unusual', 'bond-depository.bond-shortfall',
    ]));
    for (const code of ['consistency.', 'amount.', 'ward-share.', 'bond-depository.']) {
      expect(blockers.some((b) => String(b.code).startsWith(code)), code).toBe(false);
    }
    expect(advisories.every((a) => a.severity === 'advisory')).toBe(true);
  });

  test('the Annual: c, j, Schedule E, a positive loss, and a bond below its requirement', () => {
    const d = typed('annual', {
      schD2: [{ residence: 'Yes' }, { residence: 'Yes' }],
      scheduleNoItems: { remuneration: true },
      schB2: [{ amount: 1250 }],
      schC: [{ description: 'Adj', gain: '', loss: 250 }],
      schE: [{ transferInAmt: 5000, transferOutAmt: -4000 }],
      schD1: [{ description: 'Checking', fullAmount: 20000, wardPct: 100, restricted: 'No' }],
      bondDepositoryState: 'bond-only', bondAmount: 1000, bondingCompany: 'Gulf Surety',
    });
    expect(codesOf(judged(d).advisories)).toEqual(expect.arrayContaining([
      'consistency.two-residences', 'consistency.remuneration-and-fees', 'consistency.transfers-unbalanced', 'amount.loss-positive', 'bond-depository.bond-shortfall',
    ]));
  });

  test('the Simplified\'s Line 8 below zero, and the three Plans', () => {
    expect(codesOf(judged(typed('simplified', { startingBalance: 100, serviceCharges: 50, federalIncomeTax: 2049.13 })).advisories))
      .toContain('consistency.remaining-below-zero');
    expect(codesOf(judged(typed('planInitial', { wardLiving: FACILITY, q2PrivateResidence: true, certIncapacitatedNoCopy: true, certMinorNoCopy: true })).advisories))
      .toEqual(expect.arrayContaining(['consistency.facility-and-private-residence', 'consistency.incapacitated-and-minor']));
    expect(codesOf(judged(typed('planMinor', { certIncapacitated: true, certMinor: true })).advisories)).toContain('consistency.incapacitated-and-minor');
    const residence = (name) => ({ name, facilityType: '', street: '', cityStateZip: '', phone: '', from: null, to: null });
    expect(codesOf(judged(typed('planAnnual', { q2NoMove: true, q1Residences: [residence('A'), residence('B')] })).advisories))
      .toContain('consistency.not-moved-and-residences');
  });

  test('a blank filing of every type raises none of these', () => {
    for (const type of ['guardian', 'annual', 'finalAccounting', 'trustAccounting', 'simplified', 'planInitial', 'planAnnual', 'planMinor', 'planSimplified']) {
      const found = judged(typed(type)).advisories.filter((a) => /^(consistency|amount)\./.test(a.code) || a.code === 'bond-depository.bond-shortfall' || a.code === 'ward-share.small');
      expect(found, type).toEqual([]);
    }
  });
});
