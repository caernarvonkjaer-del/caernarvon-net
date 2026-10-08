import { beforeAll, describe, expect, test } from 'vitest';

// Milestone 74P: entry helpers on the Inventory and the address cards (QA
// report UX-08, UX-09, UX-24).
//
// What a filer saw: on C-1 they recorded how often a payment comes and then
// worked out the yearly total by hand; every jointly owned asset on A-1 to
// B-4 with a ward's share below 100% was typed again on C-5 with nothing
// connecting the two; and a mailing address the same as the residence (a
// Plan's ward) or an office address the same as the mailing address (a
// guardian on the Annual family and the Annual Plan) was typed twice.
//
// Red-first: none of the helpers existed; every case below fails on the code
// before 74P.

globalThis.window = globalThis.window || globalThis;
const helpers = await import('../../src/core/form/entry-helpers.js');
const { withSameAddresses, filedOffice } = await import('../../src/core/form/same-address.js');
const { initializeEmptyData } = await import('../../src/core/filing/filing-registry.js');
const { getCollection } = await import('../../src/core/form/collections.js');
const { buildAnnualAccountingModel } = await import('../../src/features/annual-accounting/pdf-model.js');
const { buildPlanAnnualModel } = await import('../../src/features/plan-annual/pdf-model.js');
const { buildPlanInitialModel } = await import('../../src/features/plan-initial/pdf-model.js');
const { carryOverAccountingToAccounting, carryOverFieldsForPlan } = await import('../../src/core/filing/carry-over.js');
// Conversion reads each form's totals through the feature services, as the app provides them at startup.
{
  const { provideFeatureServices } = await import('../../src/core/runtime/features.js');
  const [annualTotals, guardianTotals, simplifiedTotals] = await Promise.all([
    import('../../src/features/annual-accounting/totals.js'),
    import('../../src/features/guardian-inventory/totals.js'),
    import('../../src/features/simplified-accounting/totals.js'),
  ]);
  provideFeatureServices({ totals: { annual: annualTotals.calcTotalsAnnual, guardian: guardianTotals.calcTotalsGuardian, simplified: simplifiedTotals.calcTotals } });
}

const text = (model) => JSON.stringify(model);

describe("C-1's yearly total (decision 74P-1)", () => {
  test('a payment times the payments in a year, rounded to cents', () => {
    expect(helpers.yearlyTotal('1850', 'Monthly')).toBe(22200);
    expect(helpers.yearlyTotal('$1,850.00', 'Monthly')).toBe(22200);
    expect(helpers.yearlyTotal('300', 'Quarterly')).toBe(1200);
    expect(helpers.yearlyTotal('2,500', 'Semi-Annually')).toBe(5000);
    expect(helpers.yearlyTotal('960.10', 'Annually')).toBe(960.1);
    expect(helpers.yearlyTotal('33.333', 'Monthly')).toBe(400);
  });

  test('nothing to propose for Other, no frequency, or no readable amount', () => {
    expect(helpers.yearlyTotal('100', 'Other')).toBe(null);
    expect(helpers.yearlyTotal('100', '')).toBe(null);
    expect(helpers.yearlyTotal('', 'Monthly')).toBe(null);
    expect(helpers.yearlyTotal('about 600', 'Monthly')).toBe(null);
    expect(helpers.paymentsPerYear('Other')).toBe(0);
    expect(helpers.PAYMENTS_PER_YEAR).toEqual({ Monthly: 12, Quarterly: 4, 'Semi-Annually': 2, Annually: 1 });
  });

  test('every frequency the C-1 page offers is counted, but Other', () => {
    // The page's own list: Monthly, Quarterly, Semi-Annually, Annually, Other.
    for (const f of ['Monthly', 'Quarterly', 'Semi-Annually', 'Annually']) expect(helpers.paymentsPerYear(f), f).toBeGreaterThan(0);
  });
});

describe('a C-5 joint owner from an A-1 to B-4 row (decision 74P-2)', () => {
  const row = (list, fields) => ({ ...getCollection('guardian', list).factory(), ...fields });

  test('offered while the ward\'s share is a number below 100%', () => {
    for (const v of [50, '50', 0, '99.5']) expect(helpers.offersJointOwner({ wardPercent: v }), String(v)).toBe(true);
    for (const v of [100, '100', '', null, undefined, -5, 'half', 150]) expect(helpers.offersJointOwner({ wardPercent: v }), String(v)).toBe(false);
  });

  test("each source schedule's description, as the workbook's example writes it, and its full value; nothing else", () => {
    const cases = [
      ['scheduleA1', { propertyDescription: 'Family home', fullAssetValue: 250000 }, 'Schedule A-1, Item 1 — Family home', 250000],
      ['scheduleA2', { lenderName: 'First Bank', fullDebtBalance: 90000 }, 'Schedule A-2, Item 1 — First Bank', 90000],
      ['scheduleB1', { institutionName: 'Sample Bank', fullAssetAmount: 1200 }, 'Schedule B-1, Item 1 — Sample Bank', 1200],
      ['scheduleB2', { description: 'Piano', fullAssetValue: 800 }, 'Schedule B-2, Item 1 — Piano', 800],
      ['scheduleB3', { description: 'Brokerage account', fullAssetValue: 5000 }, 'Schedule B-3, Item 1 — Brokerage account', 5000],
      ['scheduleB4', { lenderName: 'Card Co', fullLiabilityBalance: 300 }, 'Schedule B-4, Item 1 — Card Co', 300],
    ];
    for (const [list, fields, description, value] of cases) {
      expect(helpers.jointOwnerRowFrom(list, row(list, { ...fields, wardPercent: 50 }), 0), list).toEqual({ assetDescription: description, totalAssetValue: value });
    }
    // A vehicle is described as the filing describes it; a row with no
    // description still names its place; the item number is the row's.
    const car = row('scheduleB2', { isVehicle: true, vehicleYear: '2019', vehicleMake: 'Honda', vehicleModel: 'Civic', fullAssetValue: 9000 });
    expect(helpers.jointOwnerRowFrom('scheduleB2', car, 2).assetDescription).toBe('Schedule B-2, Item 3 — 2019 Honda Civic');
    expect(helpers.jointOwnerRowFrom('scheduleA1', row('scheduleA1', {}), 1)).toEqual({ assetDescription: 'Schedule A-1, Item 2', totalAssetValue: 0 });
    expect(helpers.jointOwnerRowFrom('scheduleC1', row('scheduleC1', {}), 0)).toBe(null);
  });

  test("the joint owner's share is left blank (73B) and nothing links the rows", () => {
    const c5 = { ...getCollection('guardian', 'scheduleC5').factory(), ...helpers.jointOwnerRowFrom('scheduleA1', row('scheduleA1', { propertyDescription: 'Home', fullAssetValue: 1 }), 0) };
    expect(c5.jointOwnerPercent).toBe('');
    expect(Object.keys(c5).sort()).toEqual(Object.keys(getCollection('guardian', 'scheduleC5').factory()).sort());
  });
});

describe('"Same as" for an address typed twice (decision 74P-3)', () => {
  const guardian = (fields) => ({ ...getCollection('annual', 'guardians').factory(), name: 'Pat Guardian', mailingStreet: '1 Main St', mailingCityStateZip: 'Clearwater, FL 33755', officeStreet: '9 Old Office Rd', officeCityStateZip: 'Tampa, FL 33602', ...fields });

  test('the factories start every box unticked', () => {
    expect(initializeEmptyData('annual').guardians[0].officeSameAsMailing).toBe(false);
    expect(getCollection('annual', 'guardians').factory().officeSameAsMailing).toBe(false);
    expect(getCollection('planAnnual', 'planGuardians').factory().officeSameAsMailing).toBe(false);
    expect(initializeEmptyData('planAnnual').mailingSameAsResidence).toBe(false);
    expect(initializeEmptyData('planInitial').mailingSameAsResidence).toBe(false);
  });

  test('ticked, the second address is filed as the first; the typed one is kept, and nothing ticked changes nothing', () => {
    const filing = { guardians: [guardian({ officeSameAsMailing: true }), guardian({ name: 'Co' })], residenceAddress: '5 Elm St', residenceCityStateZip: 'Largo, FL 33770', mailingAddress: 'PO Box 1', mailingCityStateZip: 'Largo, FL 33779', mailingSameAsResidence: true };
    const filed = withSameAddresses(filing);
    expect([filed.guardians[0].officeStreet, filed.guardians[0].officeCityStateZip]).toEqual(['1 Main St', 'Clearwater, FL 33755']);
    expect(filed.guardians[1].officeStreet, 'an unticked guardian files their own').toBe('9 Old Office Rd');
    expect([filed.mailingAddress, filed.mailingCityStateZip]).toEqual(['5 Elm St', 'Largo, FL 33770']);
    expect([filing.guardians[0].officeStreet, filing.mailingAddress], 'the stored values are untouched').toEqual(['9 Old Office Rd', 'PO Box 1']);
    const untouched = { guardians: [guardian({})] };
    expect(withSameAddresses(untouched)).toBe(untouched);
    expect(filedOffice(guardian({ officeSameAsMailing: true }))).toEqual({ street: '1 Main St', cityStateZip: 'Clearwater, FL 33755' });
  });

  test("the Annual family's PDF prints the mailing address as the guardian's residence / office while ticked", () => {
    const d = { ...initializeEmptyData('annual'), guardians: [guardian({ officeSameAsMailing: true })] };
    expect(text(buildAnnualAccountingModel(d))).not.toContain('9 Old Office Rd');
    expect(text(buildAnnualAccountingModel({ ...d, guardians: [guardian({})] }))).toContain('9 Old Office Rd');
  });

  test("the Annual Plan's PDF: the guardian's office, and the ward's mailing address", () => {
    const g = { ...getCollection('planAnnual', 'planGuardians').factory(), name: 'Pat', mailingStreet: '1 Main St', mailingCityStateZip: 'Clearwater, FL 33755', officeStreet: '9 Old Office Rd', officeSameAsMailing: true };
    const d = { ...initializeEmptyData('planAnnual'), planGuardians: [g], residenceAddress: '5 Elm St', residenceCityStateZip: 'Largo, FL 33770', mailingAddress: 'PO Box 1', mailingSameAsResidence: true };
    const model = buildPlanAnnualModel(d);
    expect(text(model)).not.toContain('9 Old Office Rd');
    expect(text(model)).not.toContain('PO Box 1');
    const mailing = JSON.stringify(model).match(/"label":"Mailing Address \(if different\)","value":"([^"]*)"/);
    expect(mailing?.[1]).toBe('5 Elm St');
  });

  test("the Initial Plan's PDF: the ward's mailing address", () => {
    const d = { ...initializeEmptyData('planInitial'), residenceAddress: '5 Elm St', residenceCityStateZip: 'Largo, FL 33770', mailingAddress: 'PO Box 1', mailingSameAsResidence: true };
    expect(text(buildPlanInitialModel(d))).not.toContain('PO Box 1');
    expect(text(buildPlanInitialModel({ ...d, mailingSameAsResidence: false }))).toContain('PO Box 1');
  });

  test('converting a filing carries each box with the addresses, so a hidden address never surfaces unticked', () => {
    const src = { ...initializeEmptyData('annual'), guardians: [guardian({ officeSameAsMailing: true })] };
    expect(carryOverAccountingToAccounting(src, 'annual').guardians[0].officeSameAsMailing).toBe(true);
    expect(carryOverFieldsForPlan(src, 'planAnnual').planGuardians[0].officeSameAsMailing).toBe(true);
  });
});

// The Annual's workbook, written with the app's own ExcelJS onto the Clerk's
// template and read back.
describe("the Annual family's workbook", () => {
  let wb, back, writeContract, ANNUAL_CONTRACT, contractIndex, loadExcelJS;
  const guardian = (fields) => ({ ...getCollection('annual', 'guardians').factory(), name: 'Pat Guardian', ssn: '123-45-6789', mailingStreet: '1 Main St', mailingCityStateZip: 'Clearwater, FL 33755', officeStreet: '9 Old Office Rd', officeCityStateZip: 'Tampa, FL 33602', ...fields });
  const filing = (g) => ({ ...initializeEmptyData('annual'), wardName: 'Ward', caseNumber: '2026-GA-1', guardians: [g] });

  beforeAll(async () => {
    let templateWorkbook;
    ({ loadExcelJS, templateWorkbook } = await import('./support/exceljs-node.js'));
    ({ writeContract } = await import('../../src/core/excel/workbook-contract/engine.js'));
    ({ ANNUAL_CONTRACT } = await import('../../src/core/excel/workbook-contract/annual.js'));
    contractIndex = await import('../../src/core/excel/workbook-contract/index.js');
    wb = await templateWorkbook('annual');
    writeContract(wb, ANNUAL_CONTRACT, filing(guardian({ officeSameAsMailing: true })), {});
    back = new (loadExcelJS().Workbook)();
    await back.xlsx.load(await wb.xlsx.writeBuffer());
  }, 240_000);

  test("ticked, PART II, III's office boxes hold the mailing address; an import of that workbook keeps the box ticked", () => {
    const sheet = back.getWorksheet('PART II, III');
    expect([sheet.getCell('F31').value, sheet.getCell('F33').value]).toEqual(['1 Main St', 'Clearwater, FL 33755']);
    const { draft } = contractIndex.readWorkbookDraft(back, 'annual', { filing: filing(guardian({ officeSameAsMailing: true })) });
    expect(draft.guardians[0].officeSameAsMailing).toBeUndefined();
  });

  test('a workbook showing a different office address unticks the box, so the address it carries is the one filed', () => {
    const sheet = back.getWorksheet('PART II, III');
    sheet.getCell('F31').value = '44 New Office Ave';
    const { draft } = contractIndex.readWorkbookDraft(back, 'annual', { filing: filing(guardian({ officeSameAsMailing: true })) });
    expect(draft.guardians[0].officeSameAsMailing).toBe(false);
    expect(draft.guardians[0].officeStreet).toBe('44 New Office Ave');
  });
});
