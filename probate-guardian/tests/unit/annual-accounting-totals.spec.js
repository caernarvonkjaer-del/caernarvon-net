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
