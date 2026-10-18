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

// Milestone 74H part 2 (decision 74H-N1, the requester, 2026-10-16): checks
// that compare a Plan with the ward's other filings -- those of the same
// linked case, or with the same Case # when one isn't linked (74O-N1). The
// Plans hold no Type of Guardianship (73B); the newest other filing that
// answers it is read, and named. Built after 73F part 2, as decision 74H-3
// set out; the wording was approved as drafted.
describe('f, i and k: a Plan against the ward\'s other filings', () => {
  let caseConsistencyAdvisories;
  beforeAll(async () => {
    ({ caseConsistencyAdvisories } = await import('../../src/core/filing/consistency-advisories.js'));
  });
  const CASE = '26-000123-GD';
  const inventory = (extra = {}) => ({ wardId: 'inv', inventoryType: 'guardian', caseNumber: CASE, lastModified: '2026-10-01T00:00:00Z', ...extra });
  const annual = (extra = {}) => ({ wardId: 'ann', inventoryType: 'annual', caseNumber: CASE, lastModified: '2026-10-10T00:00:00Z', ...extra });
  const plan = (type, extra = {}) => ({ wardId: 'plan', inventoryType: type, caseNumber: CASE, ref: CASE, ...extra });
  const run = (filing, others) => caseConsistencyAdvisories(filing, filing.inventoryType, [filing, ...others]);

  test('f, the Initial Plan: "retains the right" on a Plenary guardianship, read from the newest filing that answers it', () => {
    const d = plan('planInitial', { q3MedWardDecides: true, q6WardDecides: true });
    expect(run(d, [inventory({ typeOfGuardianship: 'Limited' }), annual({ typeOfGuardianship: 'Plenary' })])).toEqual([
      {
        code: 'consistency.retains-right-on-plenary', severity: 'advisory', field: 'q3MedWardDecides',
        message: '2–3. Setting & Medical Care — Question 3 ticks "The ward retains the right to make their own decision", while the ward\'s Annual Accounting records the Type of Guardianship as "Plenary". Review both before filing.',
      },
      {
        code: 'consistency.retains-right-on-plenary', severity: 'advisory', field: 'q6WardDecides',
        message: '6–7. Socialization & Benefits — Question 6 ticks "The Ward retains the right to make their own decision", while the ward\'s Annual Accounting records the Type of Guardianship as "Plenary". Review both before filing.',
      },
    ]);
  });

  test('f, the Annual Plan: its question-3 boxes in one warning', () => {
    const d = plan('planAnnual', { q3EnsureWardDecides: true, q3SocialWardDecides: true });
    expect(messages(run(d, [inventory({ typeOfGuardianship: 'Plenary' })]))).toEqual([
      '2–3. Residence & Care — Question 3 ticks "The Ward retains the right to decide" and "The ward retains the right to make their own decision", while the ward\'s Verified Initial Inventory records the Type of Guardianship as "Plenary". Review both before filing.',
    ]);
  });

  test('f says nothing for a Limited guardianship, an unticked box, another case, or a Plan alone', () => {
    const d = plan('planInitial', { q3MedWardDecides: true });
    expect(run(d, [inventory({ typeOfGuardianship: 'Limited' })])).toEqual([]);
    expect(run(plan('planInitial'), [inventory({ typeOfGuardianship: 'Plenary' })])).toEqual([]);
    expect(run(d, [inventory({ typeOfGuardianship: 'Plenary', caseNumber: '26-999999-GD' })])).toEqual([]);
    expect(run(d, [])).toEqual([]);
    expect(caseConsistencyAdvisories(d, 'planInitial', null)).toEqual([]);
  });

  test('i: the Initial Plan answers Trusts No while the Inventory\'s C-4 lists one', () => {
    const d = plan('planInitial', { q7Trusts: 'No' });
    expect(run(d, [inventory({ scheduleC4: [{ trustName: 'Pemberton Family Revocable Trust' }] })])).toEqual([{
      code: 'consistency.trusts-no-and-inventory-trust', severity: 'advisory', field: 'q7Trusts',
      message: '6–7. Socialization & Benefits — Question 7 answers Trusts "No", while the ward\'s Verified Initial Inventory lists a trust on Schedule C-4: Pemberton Family Revocable Trust. Review both before filing.',
    }]);
    expect(messages(run(d, [inventory({ scheduleC4: [{ trustName: 'A Trust' }, { trustName: '' }, { trustName: 'B Trust' }] })]))).toEqual([
      '6–7. Socialization & Benefits — Question 7 answers Trusts "No", while the ward\'s Verified Initial Inventory lists trusts on Schedule C-4: A Trust; B Trust. Review both before filing.',
    ]);
    for (const answer of ['Yes', '']) expect(run(plan('planInitial', { q7Trusts: answer }), [inventory({ scheduleC4: [{ trustName: 'A Trust' }] })]), answer).toEqual([]);
    expect(run(d, [inventory({ scheduleC4: [] })])).toEqual([]);
  });

  test('k: a Plan for Minors on a Minor - Property guardianship, the question left to a qualified person', () => {
    const d = plan('planMinor');
    expect(run(d, [inventory({ typeOfGuardianship: 'Minor - Property' })])).toEqual([{
      code: 'consistency.minor-plan-on-property-guardianship', severity: 'advisory', field: 'wardName',
      message: 'Cover — The ward\'s Verified Initial Inventory records the Type of Guardianship as "Minor - Property", while this filing is a Plan for Minors. Section 744.367(1) has each guardian of the person file an annual guardianship plan; the app does not decide whether a guardian of the property alone files one. Review before filing.',
    }]);
    for (const type of ['Minor - Person', 'Minor - Person - Property', '']) expect(run(d, [inventory({ typeOfGuardianship: type })]), type).toEqual([]);
  });

  test('each check is its own Plan\'s: the other forms get none', () => {
    const others = [inventory({ typeOfGuardianship: 'Plenary', scheduleC4: [{ trustName: 'A Trust' }] })];
    for (const type of ['guardian', 'annual', 'simplified', 'planSimplified']) {
      expect(run({ ...plan(type), q3MedWardDecides: true, q7Trusts: 'No' }, others), type).toEqual([]);
    }
  });
});

// Milestone 74O-5 (answered 2026-10-16: a plan's remuneration declaration
// covers the year just ended; 74O-N2: the facts only, the Simplified too):
// the Annual Plan's Question 11 against the ward's accounting whose period
// ends the day before the plan year begins. A warning when one declares none
// and the other lists some; never a blocker.
describe('74O-5: the Annual Plan\'s remuneration against the accounting for the year just ended', () => {
  let caseConsistencyAdvisories;
  beforeAll(async () => {
    ({ caseConsistencyAdvisories } = await import('../../src/core/filing/consistency-advisories.js'));
  });
  const CASE = '26-000555-GD';
  const plan = (extra = {}) => ({ wardId: 'plan', inventoryType: 'planAnnual', caseNumber: CASE, periodFrom: '2026-01-01', periodTo: '2026-12-31', ...extra });
  const accounting = (type, extra = {}) => ({ wardId: `acct-${type}`, inventoryType: type, caseNumber: CASE, periodFrom: '2025-01-01', periodTo: '2025-12-31', ...extra });
  const fees = [{ guardian: 'Pat Guardian', type: 'Fee', amount: 1000, description: '' }, { guardian: 'Pat Guardian', type: 'Costs', amount: 200, description: '' }];
  const run = (filing, others) => caseConsistencyAdvisories(filing, 'planAnnual', [filing, ...others]).filter((a) => a.code === 'consistency.remuneration-plan-and-accounting');

  test('the plan declares none, the Annual Accounting lists some', () => {
    expect(run(plan({ q11NoRemuneration: true }), [accounting('annual', { remuneration: fees })])).toEqual([{
      code: 'consistency.remuneration-plan-and-accounting', severity: 'advisory', field: 'q11NoRemuneration',
      message: "11. Remuneration — Question 11 declares that no remuneration was received, while the ward's Annual Accounting for 01/01/2025 through 12/31/2025 lists $1,200.00 in Part XI (2 entries). Review both before filing.",
    }]);
  });

  test('the plan records some, the accounting declares none; the Simplified\'s Part VII is read too', () => {
    expect(messages(run(plan({ q11ReceivedName: 'Pat Guardian', q11Amount: 1200 }), [accounting('annual', { scheduleNoItems: { remuneration: true } })]))).toEqual([
      "11. Remuneration — Question 11 records remuneration received, while the ward's Annual Accounting for 01/01/2025 through 12/31/2025 declares in Part XI that there is none to report. Review both before filing.",
    ]);
    expect(messages(run(plan({ q11NoRemuneration: true }), [accounting('simplified', { remuneration: fees.slice(0, 1) })]))).toEqual([
      "11. Remuneration — Question 11 declares that no remuneration was received, while the ward's Simplified Annual Accounting for 01/01/2025 through 12/31/2025 lists $1,000.00 in Part VII (1 entry). Review both before filing.",
    ]);
  });

  test('silent when they agree, when either is unanswered, or when no accounting ends the day before the plan year', () => {
    expect(run(plan({ q11NoRemuneration: true }), [accounting('annual', { scheduleNoItems: { remuneration: true } })])).toEqual([]);
    expect(run(plan({ q11Amount: 1200 }), [accounting('annual', { remuneration: fees })])).toEqual([]);
    expect(run(plan(), [accounting('annual', { remuneration: fees })])).toEqual([]);
    expect(run(plan({ q11NoRemuneration: true }), [accounting('annual')])).toEqual([]);
    expect(run(plan({ q11NoRemuneration: true }), [accounting('annual', { periodTo: '2025-11-30', remuneration: fees })])).toEqual([]);
    expect(run(plan({ q11NoRemuneration: true, periodFrom: '' }), [accounting('annual', { remuneration: fees })])).toEqual([]);
    expect(run(plan({ q11NoRemuneration: true }), [accounting('annual', { caseNumber: '26-999999-GD', remuneration: fees })])).toEqual([]);
  });

  test('only the Annual Plan is compared', () => {
    for (const type of ['planInitial', 'planMinor', 'planSimplified']) {
      const d = { ...plan({ q11NoRemuneration: true }), inventoryType: type };
      expect(caseConsistencyAdvisories(d, type, [d, accounting('annual', { remuneration: fees })]).filter((a) => a.code === 'consistency.remuneration-plan-and-accounting'), type).toEqual([]);
    }
  });
});

// The code review of 74O-5 (2026-10-17, fixed on the requester's choice): the
// warning read only the latest edited accounting ending the day before the
// plan year, and only the year it was on -- so one that had started its next
// year was missed, an Annual and a Trust Accounting for the same year (or an
// original and its amendment) gave a missed or a false warning by which was
// edited last, and $0.00 counted as remuneration received. The Question 11
// note now reads the same accountings (carry-forward-hints.js).
describe('74O-5 after the code review', () => {
  let caseConsistencyAdvisories, accountingRemuneration;
  beforeAll(async () => {
    ({ caseConsistencyAdvisories } = await import('../../src/core/filing/consistency-advisories.js'));
    ({ accountingRemuneration } = await import('../../src/core/filing/carry-forward-hints.js'));
  });
  const CASE = '26-000555-GD';
  const plan = (extra = {}) => ({ wardId: 'plan', inventoryType: 'planAnnual', caseNumber: CASE, periodFrom: '2026-01-01', periodTo: '2026-12-31', ...extra });
  const accounting = (type, extra = {}) => ({ wardId: `acct-${type}`, inventoryType: type, caseNumber: CASE, periodFrom: '2025-01-01', periodTo: '2025-12-31', ...extra });
  const fees = [{ guardian: 'Pat Guardian', type: 'Fee', amount: 1000, description: '' }, { guardian: 'Pat Guardian', type: 'Costs', amount: 200, description: '' }];
  const run = (filing, others) => caseConsistencyAdvisories(filing, 'planAnnual', [filing, ...others]).filter((a) => a.code === 'consistency.remuneration-plan-and-accounting');
  const LISTS = "11. Remuneration — Question 11 declares that no remuneration was received, while the ward's Annual Accounting for 01/01/2025 through 12/31/2025 lists $1,200.00 in Part XI (2 entries). Review both before filing.";
  const NONE = "11. Remuneration — Question 11 records remuneration received, while the ward's Annual Accounting for 01/01/2025 through 12/31/2025 declares in Part XI that there is none to report. Review both before filing.";

  test('an accounting that has started its next year is read for the year it archived', () => {
    const moved = accounting('annual', { periodFrom: '2026-01-01', periodTo: '', activeYearKey: 'Year 2',
      years: [{ key: 'Year 1', data: { periodFrom: '2025-01-01', periodTo: '2025-12-31', remuneration: fees } }, { key: 'Year 2', data: {} }] });
    expect(messages(run(plan({ q11NoRemuneration: true }), [moved]))).toEqual([LISTS]);
  });

  test('an Annual and a Trust Accounting for the year: "none" is warned by any that lists some; "some" only when none lists any', () => {
    const annual = accounting('annual', { remuneration: fees, lastModified: '2026-01-05T00:00:00Z' });
    const trust = accounting('trustAccounting', { scheduleNoItems: { remuneration: true }, lastModified: '2026-02-01T00:00:00Z' });
    expect(messages(run(plan({ q11NoRemuneration: true }), [annual, trust]))).toEqual([LISTS]);
    expect(run(plan({ q11ReceivedName: 'Pat Guardian', q11Amount: 1200 }), [annual, trust])).toEqual([]);
  });

  test('an amended accounting is read over its original, whichever was edited last', () => {
    const original = accounting('annual', { wardId: 'original', remuneration: fees, lastModified: '2026-03-01T00:00:00Z' });
    const amendment = accounting('annual', { wardId: 'amendment', amendedForm: 'Yes', scheduleNoItems: { remuneration: true }, lastModified: '2026-02-01T00:00:00Z' });
    expect(run(plan({ q11NoRemuneration: true }), [original, amendment])).toEqual([]);
    expect(messages(run(plan({ q11ReceivedName: 'Pat Guardian', q11Amount: 1200 }), [original, amendment]))).toEqual([NONE]);
  });

  test('$0.00 received is not remuneration received', () => {
    expect(run(plan({ q11Amount: 0 }), [accounting('annual', { scheduleNoItems: { remuneration: true } })])).toEqual([]);
  });

  test('the Question 11 note shows the accountings the warning compares, the Simplified\'s Part VII among them', () => {
    const lastYear = accounting('annual', { wardId: 'y2025', remuneration: fees, lastModified: '2026-01-05T00:00:00Z' });
    const thisYear = accounting('annual', { wardId: 'y2026', periodFrom: '2026-01-01', periodTo: '2026-12-31', scheduleNoItems: { remuneration: true }, lastModified: '2026-09-01T00:00:00Z' });
    const notes = accountingRemuneration(plan(), [plan(), lastYear, thisYear]);
    expect(notes.map((n) => [n.name, n.period, n.part, n.none])).toEqual([['Annual Accounting', '01/01/2025 through 12/31/2025', 'Part XI', false]]);
    const simplified = accounting('simplified', { remuneration: fees.slice(0, 1) });
    expect(accountingRemuneration(plan(), [plan(), simplified]).map((n) => n.part)).toEqual(['Part VII']);
  });
});
