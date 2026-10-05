// Milestone 73D: unticking a box never loses what was typed (AGENTS.md
// section 4), and what a hidden box holds is never filed.
//
// - Inventory B-2: a vehicle's description is built from its Year, Make,
//   Model, VIN and mileage where it is filed -- the PDF, the workbook and
//   conversion to the Annual family's Schedule D-3 -- and the filer's own
//   Description is left alone for when the box is unticked. A vehicle's
//   safe-deposit answer is kept but ignored: no total, PDF row or workbook
//   cell counts it.
// - Initial, Annual and Minors Plans: an "Explanation" prints only while the
//   box that shows it is ticked; hidden text is kept, not filed. The lists
//   below are written out by hand, from each page's own conditions.
import { describe, expect, it } from 'vitest';
import { buildVerifiedInventoryModel } from '../../src/features/guardian-inventory/pdf-model.js';
import { isInSafeDepositBox, makeGuardianCalc } from '../../src/features/guardian-inventory/totals.js';
import { convertGuardianSchedulesToAnnual } from '../../src/core/filing/conversion.js';
import { buildPlanInitialModel } from '../../src/features/plan-initial/pdf-model.js';
import { buildPlanAnnualModel } from '../../src/features/plan-annual/pdf-model.js';
import { buildPlanMinorModel } from '../../src/features/plan-minor/pdf-model.js';
import { initializeEmptyData } from '../../src/core/filing/filing-registry.js';

const VEHICLE = {
  isVehicle: true, description: 'Grandfather Clock', vehicleYear: '2019', vehicleMake: 'Honda', vehicleModel: 'Civic',
  vehicleVin: '1HGCV1F30KA000001', odometerMileage: '42,000', inSafeDepositBox: 'Yes',
  streetAddress: '1 Main St', cityStateZip: 'Clearwater, FL 33755', valuationMethod: 'KBB', fullAssetValue: '15000', wardPercent: '100',
};
const VEHICLE_TEXT = '2019 Honda Civic — VIN: 1HGCV1F30KA000001 — Odometer: 42,000 mi';
const CLOCK = {
  isVehicle: false, description: 'Mantel Clock', inSafeDepositBox: 'Yes',
  streetAddress: '1 Main St', cityStateZip: 'Clearwater, FL 33755', valuationMethod: 'Appraisal', fullAssetValue: '400', wardPercent: '100',
};

describe("73D: Schedule B-2 -- a vehicle's description and safe-deposit answer", () => {
  const b2Table = (rows) => {
    const model = buildVerifiedInventoryModel({ ...initializeEmptyData('guardian'), wardName: 'Ward', caseNumber: '26-000001-GD', scheduleB2: rows });
    const tables = model.sections.flatMap((s) => s.blocks || []).filter((b) => Array.isArray(b?.headers) && b.headers.includes('In Safe Deposit Box?'));
    expect(tables).toHaveLength(1);
    return tables[0];
  };

  it("the PDF prints a vehicle's own description and no safe-deposit answer; an ordinary item prints the filer's", () => {
    const table = b2Table([VEHICLE, CLOCK]);
    const col = (name) => table.headers.indexOf(name);
    expect(table.rows[0][col('Description')]).toBe(VEHICLE_TEXT);
    expect(table.rows[0][col('In Safe Deposit Box?')]).toBe('');
    expect(table.rows[0][col('Amount in Safe Deposit Box')]).toBe('—');
    expect(table.rows[1][col('Description')]).toBe('Mantel Clock');
    expect(table.rows[1][col('In Safe Deposit Box?')]).toBe('Yes');
    expect(table.rows[1][col('Amount in Safe Deposit Box')]).toBe('$400.00');
  });

  it("the safe-deposit total ignores a vehicle's kept answer", () => {
    expect(isInSafeDepositBox(VEHICLE)).toBe(false);
    expect(isInSafeDepositBox(CLOCK)).toBe(true);
    const calc = makeGuardianCalc({ scheduleB2: [VEHICLE, CLOCK] });
    expect(calc.totalSdbB2()).toBe(400);
    expect(calc.totalB2()).toBe(15400);
  });

  it("conversion to the Annual family's D-3 carries the vehicle's own description", () => {
    const dest = {};
    convertGuardianSchedulesToAnnual({ scheduleB2: [VEHICLE, CLOCK] }, dest);
    expect(dest.schD3.map((r) => r.description)).toEqual([VEHICLE_TEXT, 'Mantel Clock']);
  });

  it("a vehicle with nothing typed into its fields files no description -- not the filer's other text", () => {
    const bare = { ...CLOCK, isVehicle: true, vehicleYear: '', vehicleMake: '', vehicleModel: '', vehicleVin: '', odometerMileage: '' };
    expect(b2Table([bare]).rows[0][0]).toBe('');
  });
});

// [Explanation field, the answers that show its box, answers both cases
// share] -- from each page.
const PLANS = {
  planInitial: [
    ['q2Explain', { q2Other: true }], ['q3MedExplain', { q3MedOther: true }], ['q4Explain', { q4None: true }],
    ['q5Explain', { q5Other: true }], ['q6Explain', { q6Other: true }], ['q7Explain', { q7Other: true }],
    ['mentalExplain', { mentalOther: true }], ['physExplain', { physOther: true }], ['usesExplain', { usesOther: true }],
    ['needsExplain', { needsOther: true }], ['committeeExplain', { committeeIncorporated: 'No' }],
    // The directive list prints only once "the ward executed" is ticked.
    ['q11ExecOtherText', { q11ExecOther: true }, { q11Executed: true }],
  ],
  planAnnual: [
    ['q3SettingExplain', { q3SettingOther: true }], ['q3MedExplain', { q3MedNone: true }], ['q3MentalExplain', { q3MentalOther: true }],
    ['q3PersonalExplain', { q3PersonalNone: true }], ['q3SocialExplain', { q3SocialOther: true }], ['q3BenefitsExplain', { q3BenefitsNone: true }],
    ['q9MentalExplain', { q9MentalOther: true }], ['q9PhysExplain', { q9PhysOther: true }], ['q9UsesExplain', { q9UsesOther: true }],
    ['q9NeedsExplain', { q9NeedsOther: true }],
  ],
  planMinor: [['q4Explain', { q4Other: true }], ['q5Explain', { q5Other: true }]],
};
const BUILD = { planInitial: buildPlanInitialModel, planAnnual: buildPlanAnnualModel, planMinor: buildPlanMinorModel };

describe('73D: a Plan "Explanation" prints only while its box is shown', () => {
  for (const [type, fields] of Object.entries(PLANS)) {
    for (const [id, shownBy, shared = {}] of fields) {
      it(`${type}: ${id}`, () => {
        const text = `Kept reason for ${id}`;
        const printed = (extra) => JSON.stringify(BUILD[type]({ ...initializeEmptyData(type), wardName: 'Ward', ...shared, [id]: text, ...extra })).includes(text);
        expect(printed({}), 'hidden: kept but not filed').toBe(false);
        expect(printed(shownBy), 'shown: filed').toBe(true);
      });
    }
  }
});
