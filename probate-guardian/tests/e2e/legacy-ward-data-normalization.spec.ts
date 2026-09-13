import { test, expect } from '@playwright/test';
import { freshStartNoPassword, createWard } from './support/target';

// Milestone 43A: replaces tests/unit/milestone-38e.spec.js, deleted because
// its three assertions were guarded behind `if (window.normalizeWardData)`/
// `if (window.calc)` checks that were always false in that suite's Node-only
// (no jsdom) environment -- 3/3 "pass" with zero assertions ever executing.
// normalizeWardData() and window.calc's restricted/unrestricted asset-math
// functions are classic-script window-only functions in legacy-app.js with
// no ES-module counterpart, so a real regression guard needs a real browser.
// This is that guard, covering the same two behaviors the dead file claimed
// to (Guardian Inventory legacy-boolean normalization; restricted/
// unrestricted totals against the resulting tri-state data).
test.describe('legacy boolean -> tri-state ward data normalization (Guardian Inventory)', () => {
  test('normalizeWardData() migrates every legacy boolean field to its tri-state equivalent', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Legacy Data Ward', 'guardian');

    const normalized = await page.evaluate(() => {
      const d = (window as any).D;
      Object.assign(d, {
        scheduleA1: [{ propertyDescription: 'Home', fullAssetValue: '250000', wardPercent: '100', isPersonalResidence: true, isIncomeProperty: false }],
        scheduleB1: [{ institutionName: 'Legacy Bank', fullAssetAmount: '1000', wardPercent: '100', isRestricted: true }],
        scheduleB2: [{ description: 'Furniture', fullAssetValue: '1200', wardPercent: '100', inSafeDepositBox: true }],
        scheduleB3: [{ description: 'Brokerage', fullAssetValue: '500', wardPercent: '100', isRestricted: false, inSafeDepositBox: false }],
        hasSafeDepositBox: true,
        safeDepositBoxFiled: false,
        isAmended: true,
      });
      (window as any).normalizeWardData(d);
      return {
        residence: d.scheduleA1[0].residence,
        income: d.scheduleA1[0].income,
        b1Restricted: d.scheduleB1[0].restricted,
        b2SafeDeposit: d.scheduleB2[0].inSafeDepositBox,
        b3Restricted: d.scheduleB3[0].restricted,
        b3SafeDeposit: d.scheduleB3[0].inSafeDepositBox,
        hasSafeDepositBox: d.hasSafeDepositBox,
        safeDepositBoxFiled: d.safeDepositBoxFiled,
        amendedForm: d.amendedForm,
      };
    });

    expect(normalized).toEqual({
      residence: 'Yes',
      income: 'No',
      b1Restricted: 'Yes',
      b2SafeDeposit: 'Yes',
      b3Restricted: 'No',
      b3SafeDeposit: 'No',
      hasSafeDepositBox: 'Yes',
      safeDepositBoxFiled: 'No',
      amendedForm: 'Yes',
    });
  });

  test('window.calc restricted/unrestricted totals are correct against normalized tri-state data', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Restricted Asset Math Ward', 'guardian');

    const totals = await page.evaluate(() => {
      const d = (window as any).D;
      Object.assign(d, {
        scheduleB1: [
          { institutionName: 'Bank A', fullAssetAmount: '1000', wardPercent: '100', isRestricted: true },
          { institutionName: 'Bank B', fullAssetAmount: '4000', wardPercent: '50', isRestricted: false },
        ],
        scheduleB3: [
          { description: 'Restricted Trust', fullAssetValue: '500', wardPercent: '100', isRestricted: true },
          { description: 'Open Brokerage', fullAssetValue: '900', wardPercent: '100', isRestricted: false },
        ],
      });
      (window as any).normalizeWardData(d);
      return {
        restrictedCash: (window as any).calc.restrictedCash(),
        unrestrictedCash: (window as any).calc.unrestrictedCash(),
        restrictedIntang: (window as any).calc.restrictedIntang(),
        unrestrictedIntang: (window as any).calc.unrestrictedIntang(),
      };
    });

    expect(totals).toEqual({
      restrictedCash: 1000,
      unrestrictedCash: 2000, // Bank B: 4000 * 50%
      restrictedIntang: 500,
      unrestrictedIntang: 900,
    });
  });
});
