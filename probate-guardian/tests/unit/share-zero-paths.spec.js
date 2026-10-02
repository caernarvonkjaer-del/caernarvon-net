// Milestone 72B. A share of 0 is an answer -- the filer saying the ward owns
// none of an asset -- and a blank share is no answer. Each path a share takes
// must keep the two apart. Two did not: converting an Initial Inventory into
// an Annual mapped every share with `x||''`, so a 0% share arrived blank (and
// the Annual then reported it missing), and the Annual's Part VIII export did
// the same. The Annual's share writer turned a blank into an asserted 0%. The
// same conversion also turned an unanswered Restricted?, Personal Residence?
// or Income Property? into 'No' (AGENTS.md section 4 forbids it at any stage)
// and a $0 value into a blank.
import { afterAll, beforeAll, describe, expect, test, vi } from 'vitest';
import { percentValue } from '../../src/core/excel/excel-engine.js';
import { shareFromWorkbookCell } from '../../src/core/excel/share-cell.js';
import { emptyDataAnnual } from '../../src/core/filing/models/annual.js';
import { emptyDataSimplified } from '../../src/core/filing/models/simplified.js';

// The conversions carry a Starting Balance through the feature totals, so
// those are provided first, as tests/unit/carried-balance.spec.js does.
let convertGuardianSchedulesToAnnual, convertToSimplified, convertSimplifiedToAnnual;
beforeAll(async () => {
  vi.stubGlobal('window', globalThis);
  const [{ provideFeatureServices }, annualTotals, guardianTotals, simplifiedTotals] = await Promise.all([
    import('../../src/core/runtime/features.js'),
    import('../../src/features/annual-accounting/totals.js'),
    import('../../src/features/guardian-inventory/totals.js'),
    import('../../src/features/simplified-accounting/totals.js'),
  ]);
  provideFeatureServices({ totals: { annual: annualTotals.calcTotalsAnnual, guardian: guardianTotals.calcTotalsGuardian, simplified: simplifiedTotals.calcTotals } });
  ({ convertGuardianSchedulesToAnnual, convertToSimplified, convertSimplifiedToAnnual } = await import('../../src/core/filing/conversion.js'));
});
afterAll(() => vi.unstubAllGlobals());

const inventory = (share, extra = {}) => ({
  inventoryType: 'guardian',
  scheduleA1: [{ propertyDescription: 'House', fullAssetValue: 0, wardPercent: share, residence: '', income: 'No' }],
  scheduleA2: [{ lenderName: 'Bank', fullDebtBalance: 1000, wardPercent: share }],
  scheduleB1: [{ institutionName: 'Bank', accountType: 'Checking', fullAssetAmount: 0, wardPercent: share, restricted: '' }],
  scheduleB2: [{ description: 'Car', fullAssetValue: 3000, wardPercent: share }],
  scheduleB3: [{ description: 'Bond', fullAssetValue: 500, wardPercent: share, restricted: '' }],
  scheduleB4: [{ lenderName: 'Card', fullLiabilityBalance: 200, wardPercent: share }],
  scheduleC1: [{ payerName: 'SSA', annualIncomeAmount: 0, wardPercent: share }],
  scheduleC4: [{ trustName: 'Pooled Trust', wardPercent: share }],
  ...extra,
});

const converted = (src) => {
  const dest = { ...emptyDataAnnual(), inventoryType: 'annual' };
  convertGuardianSchedulesToAnnual(src, dest);
  return dest;
};

const annualShares = (d) => [
  ...d.schD1.map((r) => r.wardPct), ...d.schD2.map((r) => r.wardPct), ...d.schD3.map((r) => r.wardPct),
  ...d.schD4.map((r) => r.wardPct), ...d.schD5.map((r) => r.wardPct), d.trusts[0].wardPct,
];

describe('Initial Inventory -> Annual keeps every share as entered', () => {
  test('a 0 share arrives as 0 in every Schedule D row and in Part VIII', () => {
    expect(annualShares(converted(inventory(0)))).toEqual([0, 0, 0, 0, 0, 0, 0]);
  });

  test('a blank share arrives blank', () => {
    expect(annualShares(converted(inventory('')))).toEqual(['', '', '', '', '', '', '']);
  });

  test('a 50 share arrives as 50', () => {
    expect(annualShares(converted(inventory(50)))).toEqual([50, 50, 50, 50, 50, 50, 50]);
  });

  test('a $0 value arrives as 0, not blank', () => {
    const d = converted(inventory(50));
    expect(d.schD1[0].fullAmount).toBe(0);
    expect(d.schD2[0].fullValue).toBe(0);
    expect(d.schD2[0].carryingValue).toBe(0);
    expect(d.schA[0].amount).toBe(0);
  });

  test("an unanswered Yes/No arrives unanswered, never as 'No'; an answer arrives as given", () => {
    const d = converted(inventory(50));
    expect(d.schD1[0].restricted, 'B-1 Restricted? unanswered').toBe('');
    expect(d.schD2[0].residence, 'A-1 Personal Residence? unanswered').toBe('');
    expect(d.schD2[0].income, 'A-1 Income Property? answered No').toBe('No');
    expect(d.schD4[0].restricted, 'B-3 Restricted? unanswered').toBe('');
    // The pre-normalization booleans still map.
    const legacy = converted(inventory(50, { scheduleB1: [{ institutionName: 'Bank', isRestricted: true, wardPercent: 50 }] }));
    expect(legacy.schD1[0].restricted).toBe('Yes');
  });
});

describe('remuneration amounts keep $0 between the Annual and the Simplified', () => {
  test('Annual -> Simplified', () => {
    const dest = { ...emptyDataSimplified(), inventoryType: 'simplified' };
    convertToSimplified({ inventoryType: 'annual', remuneration: [{ guardian: 'G', type: 'Fee', amount: 0 }] }, 'annual', dest);
    expect(dest.remuneration[0].amount).toBe(0);
  });
  test('Simplified -> Annual', () => {
    const dest = { ...emptyDataAnnual(), inventoryType: 'annual' };
    convertSimplifiedToAnnual({ inventoryType: 'simplified', remuneration: [{ guardian: 'G', type: 'Fee', amount: 0 }] }, dest);
    expect((dest.remuneration || []).map((r) => r.amount)).toContain(0);
  });
});

describe("the Annual's share writer and the importers' share reader", () => {
  test('percentValue(): 0 is written as 0, a blank as an empty cell, 50 as the fraction', () => {
    expect(percentValue(0)).toBe(0);
    expect(percentValue('')).toBe('');
    expect(percentValue(50)).toBe(0.5);
  });

  test('shareFromWorkbookCell(): an empty cell reads blank, a 0 cell reads 0, a fraction reads as a percentage', () => {
    expect(shareFromWorkbookCell(null)).toBe('');
    expect(shareFromWorkbookCell('')).toBe('');
    expect(shareFromWorkbookCell(0)).toBe(0);
    expect(shareFromWorkbookCell(0.5)).toBe(50);
  });
});
