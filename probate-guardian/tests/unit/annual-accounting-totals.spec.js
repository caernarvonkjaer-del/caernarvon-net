import { describe, expect, test } from 'vitest';
import { calcTotalsAnnual } from '../../src/features/annual-accounting/totals.js';

// Milestone 40H-H: Schedule E/F-1/F-2 were the only three schedule totals in
// annual-accounting/index.js computed locally at render time instead of
// through calcTotalsAnnual() -- calcTotalsAnnual() had no schE_in/schE_out/
// schF1/schF2 key at all, confirmed by grep before this fix. No dedicated
// unit spec for this function existed before now.
describe('calcTotalsAnnual: Schedule E/F-1/F-2', () => {
  test('schF1 sums Schedule F-1 sale prices', () => {
    const t = calcTotalsAnnual({ schF1: [{ salePrice: '402000' }, { salePrice: '15000' }] });
    expect(t.schF1).toBe(417000);
  });

  test('schF2 sums Schedule F-2 sale prices independently of schF1', () => {
    const t = calcTotalsAnnual({
      schF1: [{ salePrice: '402000' }],
      schF2: [{ salePrice: '8000' }, { salePrice: '2500' }],
    });
    expect(t.schF1).toBe(402000);
    expect(t.schF2).toBe(10500);
  });

  test('schE_in and schE_out sum independently', () => {
    const t = calcTotalsAnnual({
      schE: [
        { transferInAmt: '5000', transferOutAmt: '0' },
        { transferInAmt: '0', transferOutAmt: '-5000' },
      ],
    });
    expect(t.schE_in).toBe(5000);
    expect(t.schE_out).toBe(-5000);
  });

  test('all four default to 0 for an empty or missing schedule', () => {
    const t = calcTotalsAnnual({});
    expect(t).toMatchObject({ schE_in: 0, schE_out: 0, schF1: 0, schF2: 0 });
  });
});

// Milestone 64B-1, item 9.1 / D7. Schedules D-2, D-3, D-4 store a plain
// entered "Carrying Value" (form column I/H/I), never scaled by Ward's % on
// the workbook -- the page total is a plain SUM of that column. This app
// was independently multiplying Carrying Value by Ward's % in two places
// (here and in pdf-model.js's row builders), so a 50%-owned $190,000 real
// estate line with a $82,500 Carrying Value printed $41,250, and the
// schedule's own printed total was wrong by the same fraction. Every
// existing fixture before this milestone used wardPct: 100, where the bug
// is invisible (multiplying by 1 changes nothing) -- these use 50%
// specifically so the fix is provable.
//
// D-4's Restricted Amt is separate and was wrong in a different way: the
// workbook's D-4 sheet computes it as Full Amount x Ward's % on restricted
// lines (K = IF(F="Yes", G*H, 0)), the same pattern schD1_restricted already
// uses -- never from Carrying Value at all, scaled or not. This app derived
// it from Carrying Value x Ward's %, so a $100,000 full amount / 50% ward /
// $80,000 carrying / restricted line printed a Restricted Amt of $40,000
// where the workbook prints $50,000 (Alan accepted this fix 2026-09-21,
// D7 -- it changes a submitted number on any filing with a partly-owned or
// carrying-not-equal-to-full restricted intangible).
describe('Milestone 64B-1: Schedule D-2/D-3/D-4 Carrying Value is unscaled; D-4 Restricted Amt is Full Amount x Ward\'s %', () => {
  test('D-2 Carrying Value totals unscaled; Ward\'s Value stays Full x Ward\'s %', () => {
    const t = calcTotalsAnnual({
      schD2: [{ fullValue: '190000', wardPct: '50', carryingValue: '82500' }],
    });
    expect(t.schD2_carrying).toBe(82500);
    expect(t.schD2_ward).toBe(95000);
  });

  test('D-3 Carrying Value totals unscaled; Ward\'s Amount stays Full x Ward\'s %', () => {
    const t = calcTotalsAnnual({
      schD3: [{ fullAmount: '6000', wardPct: '50', carryingValue: '3000' }],
    });
    expect(t.schD3_carrying).toBe(3000);
    expect(t.schD3_ward).toBe(3000);
  });

  test('D-4 Carrying Value totals unscaled; Restricted Amt is Full Amount x Ward\'s %, not Carrying Value', () => {
    const t = calcTotalsAnnual({
      schD4: [{ fullAmount: '100000', wardPct: '50', carryingValue: '80000', restricted: 'Yes' }],
    });
    expect(t.schD4_carrying).toBe(80000);
    expect(t.schD4_ward).toBe(50000);
    // Matches the workbook's K = IF(F="Yes", G*H, 0): 100000 * 0.5 = 50000,
    // not 80000 * 0.5 = 40000.
    expect(t.schD4_restricted).toBe(50000);
    // Part IX's "Unrestricted" line is schD4_ward - schD4_restricted --
    // must be 0 here (matching the workbook), not a spurious $10,000 or a
    // negative figure.
    expect(t.schD4_ward - t.schD4_restricted).toBe(0);
  });

  test('an unrestricted D-4 line contributes nothing to schD4_restricted regardless of its Carrying or Full Amount', () => {
    const t = calcTotalsAnnual({
      schD4: [{ fullAmount: '100000', wardPct: '50', carryingValue: '80000', restricted: 'No' }],
    });
    expect(t.schD4_restricted).toBe(0);
  });

  test('the D-4 bond-requirement term now agrees with the workbook on a partly-owned restricted line', () => {
    // bondReq = (schD1_total - schD1_restricted) + schD3_ward + (schD4_ward - schD4_restricted).
    // Isolate the D-4 term: with only a restricted D-4 line entered, schD1
    // and schD3 contribute 0, so bondReq reduces to (schD4_ward - schD4_restricted).
    const t = calcTotalsAnnual({
      schD4: [{ fullAmount: '100000', wardPct: '50', carryingValue: '80000', restricted: 'Yes' }],
    });
    expect(t.bondReq).toBe(0);
  });
});
