// Milestone 76G items 2-4 and 6: what a new form made from another carries.
//  2. Initial Inventory -> Annual: Schedule A got each C-1 source's full
//     projected amount ($24,000 at 50% as $24,000) and every trust was
//     answered "Created after the GID? No"; trusts beyond three went unsaid.
//  3. The guardian's residence or office address carried blank between the
//     Annual family, the Annual Plan and the Simplified; only Guardian 1
//     carried into an Initial Inventory or Initial Plan (the Plan padded with
//     three blank cards).
//  4. Annual -> Final started without Schedule D, the B-4 bank accounts,
//     Part VIII, Part IX or the guardian's relationship, and its notice said
//     every schedule starts blank and the county came from the case record.
//  6. A Cover county edit re-countied whichever case had the same typed case
//     number -- never the filing's own linked case.
import { afterAll, beforeAll, describe, expect, test, vi } from 'vitest';
import { carryOverFields } from '../../src/core/filing/carry-over.js';
import * as conversion from '../../src/core/filing/conversion.js';

const { convertGuardianSchedulesToAnnual, describeConversion } = conversion;
const trustsNotCarriedNote = (names) => conversion.trustsNotCarriedNote(names);
import { initializeEmptyData } from '../../src/core/filing/filing-registry.js';
import { syncLinkedCaseCounty } from '../../src/core/navigation/ward-county.js';
import { replaceCaseFile, blankCaseFile } from '../../src/core/state.js';

// The Starting Balance carry reads each form's totals.
beforeAll(async () => {
  vi.stubGlobal('window', globalThis);
  const [{ provideFeatureServices }, annualTotals, guardianTotals, simplifiedTotals] = await Promise.all([
    import('../../src/core/runtime/features.js'),
    import('../../src/features/annual-accounting/totals.js'),
    import('../../src/features/guardian-inventory/totals.js'),
    import('../../src/features/simplified-accounting/totals.js'),
  ]);
  provideFeatureServices({ totals: { annual: annualTotals.calcTotalsAnnual, guardian: guardianTotals.calcTotalsGuardian, simplified: simplifiedTotals.calcTotals } });
});
afterAll(() => vi.unstubAllGlobals());

const json = (x) => JSON.parse(JSON.stringify(x));
const blank = (type) => ({ ...json(initializeEmptyData(type)), inventoryType: type });

describe('item 2: Initial Inventory -> Annual', () => {
  const inventory = (trusts) => ({
    ...blank('guardian'),
    scheduleC1: [{ payerName: 'SSA', typeOfIncome: 'Benefits', annualIncomeAmount: 24000, wardPercent: 50 }],
    scheduleC4: trusts.map((trustName) => ({ trustName, trusteeName: 'Bank', wardPercent: 100 })),
  });

  test('Schedule A starts blank, and each trust\'s "created after the GID?" is left for the filer', () => {
    const dest = blank('annual');
    convertGuardianSchedulesToAnnual(inventory(['Pooled Trust']), dest);
    expect(dest.schA).toEqual([]);
    expect(dest.trusts[0]).toMatchObject({ hasTrust: 'Yes', name: 'Pooled Trust', createdAfterGID: '' });
  });

  test('the trusts Part VIII cannot hold are named', () => {
    const dest = blank('annual');
    const { trustsNotCarried } = convertGuardianSchedulesToAnnual(inventory(['T1', 'T2', 'T3', 'T4', '']), dest);
    expect(dest.trusts.map((t) => t.name)).toEqual(['T1', 'T2', 'T3']);
    expect(trustsNotCarried).toEqual(['T4', 'Schedule C-4 trust 5']);
    expect(trustsNotCarriedNote(trustsNotCarried)).toContain('Part VIII holds three trusts, so these were not carried: T4; Schedule C-4 trust 5.');
    expect(trustsNotCarriedNote([])).toBe('');
  });

  test('the notice no longer promises income sources', () => {
    const note = describeConversion('guardian', 'annual');
    expect(note).not.toContain('income sources');
    expect(note).toContain('Schedule A (income) starts blank');
  });
});

describe("item 3: the guardian's address and co-guardians", () => {
  const office = { name: 'Ann Guardian', mailingStreet: '1 Mail St', mailingCityStateZip: 'Tampa, FL 33602', officeStreet: '9 Office Rd', officeCityStateZip: 'Clearwater, FL 33755', officeSameAsMailing: false };

  test("an Annual's office address is the Simplified's residence address, and back", () => {
    const toSimplified = carryOverFields({ ...blank('annual'), guardians: [office] }, 'simplified');
    expect(toSimplified.guardians[0]).toMatchObject({ residenceStreet: '9 Office Rd', residenceCityStateZip: 'Clearwater, FL 33755' });
    const back = carryOverFields({ ...blank('simplified'), guardians: [{ name: 'Ann Guardian', residenceStreet: '9 Office Rd', residenceCityStateZip: 'Clearwater, FL 33755' }] }, 'annual');
    expect(back.guardians[0]).toMatchObject({ officeStreet: '9 Office Rd', officeCityStateZip: 'Clearwater, FL 33755' });
  });

  test('"same as mailing" arrives as the mailing address', () => {
    const out = carryOverFields({ ...blank('annual'), guardians: [{ ...office, officeStreet: '', officeCityStateZip: '', officeSameAsMailing: true }] }, 'simplified');
    expect(out.guardians[0]).toMatchObject({ residenceStreet: '1 Mail St', residenceCityStateZip: 'Tampa, FL 33602' });
  });

  test('the Annual Plan and the Simplified, both ways', () => {
    expect(carryOverFields({ ...blank('planAnnual'), planGuardians: [office] }, 'simplified').guardians[0].residenceStreet).toBe('9 Office Rd');
    expect(carryOverFields({ ...blank('simplified'), guardians: [{ name: 'Ann', residenceStreet: '9 Office Rd' }] }, 'planAnnual').planGuardians[0].officeStreet).toBe('9 Office Rd');
  });

  test('entered co-guardians carry into an Initial Inventory and an Initial Plan, with no blank padding', () => {
    const gs = [office, { name: 'Bo Co-Guardian', phone: '727-555-0100' }, { name: '', signatureState: 'none', officeSameAsMailing: false }];
    const inv = carryOverFields({ ...blank('annual'), guardians: gs }, 'guardian');
    expect(inv.guardians.map((g) => g.name)).toEqual(['Ann Guardian', 'Bo Co-Guardian']);
    const plan = carryOverFields({ ...blank('annual'), guardians: gs }, 'planInitial');
    expect(plan.planGuardians.map((g) => g.name)).toEqual(['Ann Guardian', 'Bo Co-Guardian']);
    const fromPlan = carryOverFields({ ...blank('planAnnual'), planGuardians: gs }, 'guardian');
    expect(fromPlan.guardians.map((g) => g.name)).toEqual(['Ann Guardian', 'Bo Co-Guardian']);
    expect(carryOverFields({ ...blank('annual'), guardians: [office] }, 'planInitial').planGuardians).toHaveLength(1);
  });
});

describe('item 4 (decision 76G-3): Annual -> Final starts from what the Annual holds', () => {
  const annual = {
    ...blank('annual'),
    periodFrom: '2025-01-01', periodTo: '2025-12-31',
    schA: [{ payer: 'SSA', amount: 100 }],
    schD1: [{ description: 'Checking', fullAmount: 5000, wardPct: 100, restricted: 'No' }],
    schB4Accounts: [{ id: 'acct-1', bankName: 'First Bank', accountNumber: '1234' }],
    trusts: [{ hasTrust: 'Yes', createdAfterGID: 'No', name: 'Pooled Trust' }],
    bondDepositoryState: 'bond-only', bondAmount: 25000, bondingCompany: 'Surety Co',
    guardianRelationship: 'Daughter',
    certWardStatus: 'Living',
    scheduleNoItems: { schd2: true, sch_a: false, scha: true },
  };

  test('holdings, accounts, trusts, bond and relationship carry; transactions and the ward\'s status do not', () => {
    const out = carryOverFields(annual, 'finalAccounting');
    expect(out.periodFrom).toBe('2026-01-01');
    expect(out.schD1).toEqual(annual.schD1);
    expect(out.schB4Accounts).toEqual(annual.schB4Accounts);
    expect(out.trusts).toEqual(annual.trusts);
    expect(out).toMatchObject({ bondDepositoryState: 'bond-only', bondAmount: 25000, bondingCompany: 'Surety Co', guardianRelationship: 'Daughter' });
    expect(out.scheduleNoItems).toEqual({ schd2: true });
    expect(out.schA).toBeUndefined();
    expect(out.certWardStatus).toBeUndefined();
    out.schD1[0].fullAmount = 1;
    expect(annual.schD1[0].fullAmount).toBe(5000);
  });

  test('another pair carries none of it', () => {
    expect(carryOverFields(annual, 'trustAccounting').schD1).toBeUndefined();
  });

  test('the notice says what carried, and that the county is the ward\'s', () => {
    const note = describeConversion('annual', 'finalAccounting');
    expect(note).toContain("Schedule D's holdings, the Schedule B-4 bank accounts, Part VIII's trusts, Part IX's bond and the guardian's relationship are carried");
    expect(note).not.toContain('every schedule start blank');
    expect(note).toContain("restored from this ward's record");
    expect(describeConversion('annual', 'trustAccounting')).toContain('The accounting period and every schedule start blank');
  });
});

describe("item 6: a Cover county edit reaches the filing's own case only", () => {
  const setup = () => {
    const cf = blankCaseFile();
    cf.cases = [
      { id: 'case-own', caseNumber: '', county: '' },
      { id: 'case-other', caseNumber: '24-000888-GD', county: 'Pasco' },
    ];
    replaceCaseFile(cf);
    return cf;
  };
  test('the linked case takes the county', () => {
    const cf = setup();
    expect(syncLinkedCaseCounty({ caseId: 'case-own', caseNumber: '24-000888-GD' }, 'Pinellas')).toBe(true);
    expect(cf.cases.map((c) => c.county)).toEqual(['Pinellas', 'Pasco']);
  });
  test('a case that only shares the typed number is left alone', () => {
    const cf = setup();
    expect(syncLinkedCaseCounty({ caseNumber: '24-000888-GD' }, 'Pinellas')).toBe(false);
    expect(cf.cases[1].county).toBe('Pasco');
  });
});
