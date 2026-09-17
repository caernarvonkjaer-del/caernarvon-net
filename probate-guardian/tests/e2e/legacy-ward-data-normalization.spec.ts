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

  test('explicit canonical answers win over stale aliases and unanswered values remain blank', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Canonical Data Ward', 'guardian');

    const normalized = await page.evaluate(() => {
      const d = (window as any).D;
      Object.assign(d, {
        scheduleA1: [{ residence: 'No', isPersonalResidence: true, income: '', isIncomeProperty: null }],
        scheduleB1: [{ restricted: 'No', isRestricted: true }],
        scheduleB2: [{ inSafeDepositBox: '' }, { inSafeDepositBox: null }, {}],
        scheduleB3: [{ restricted: '', isRestricted: null, inSafeDepositBox: 'No' }],
        hasSafeDepositBox: 'No',
        safeDepositBoxFiled: '',
        amendedForm: 'No',
        isAmended: true,
        q7SocialSecurity: 'No',
        q7Ssdi: '',
        q7Hmo: true,
        q7Ssi: false,
        q7Medicare: null,
        benefits: {
          socialSecurity: { eligible: 'No', appliedFor: '' },
          pension: { eligible: true, appliedFor: false },
          ssi: {},
        },
      });
      (window as any).normalizeWardData(d);
      return {
        scheduleA1: d.scheduleA1[0],
        scheduleB1: d.scheduleB1[0],
        scheduleB2: d.scheduleB2[0],
        scheduleB2Null: d.scheduleB2[1].inSafeDepositBox,
        scheduleB2Missing: d.scheduleB2[2].inSafeDepositBox,
        scheduleB3: d.scheduleB3[0],
        hasSafeDepositBox: d.hasSafeDepositBox,
        safeDepositBoxFiled: d.safeDepositBoxFiled,
        amendedForm: d.amendedForm,
        hasLegacyAmendedFlag: Object.hasOwn(d, 'isAmended'),
        benefits: d.benefits.socialSecurity,
        pension: d.benefits.pension,
        ssi: d.benefits.ssi,
        q7: [d.q7SocialSecurity, d.q7Ssdi, d.q7Hmo, d.q7Ssi, d.q7Medicare],
      };
    });

    expect(normalized.scheduleA1.residence).toBe('No');
    expect(normalized.scheduleA1.income).toBe('');
    expect(normalized.scheduleA1).not.toHaveProperty('isPersonalResidence');
    expect(normalized.scheduleA1).not.toHaveProperty('isIncomeProperty');
    expect(normalized.scheduleB1.restricted).toBe('No');
    expect(normalized.scheduleB1).not.toHaveProperty('isRestricted');
    expect(normalized.scheduleB2.inSafeDepositBox).toBe('');
    expect(normalized.scheduleB2Null).toBe('');
    expect(normalized.scheduleB2Missing).toBe('');
    expect(normalized.scheduleB3).toMatchObject({ restricted: '', inSafeDepositBox: 'No' });
    expect(normalized.scheduleB3).not.toHaveProperty('isRestricted');
    expect(normalized).toMatchObject({
      hasSafeDepositBox: 'No',
      safeDepositBoxFiled: '',
      amendedForm: 'No',
      hasLegacyAmendedFlag: false,
      benefits: { eligible: 'No', appliedFor: '' },
      pension: { eligible: 'Yes', appliedFor: 'No' },
      ssi: { eligible: '', appliedFor: '' },
      q7: ['No', '', 'Yes', 'No', ''],
    });
  });

  test('57A migrates legacy dependent bond/depository dates without guessing negative answers', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Legacy Bond Choice Ward', 'guardian');

    const guardian = await page.evaluate(() => {
      const d = (window as any).D;
      delete d.bondWaived;
      d.bondWaivedDate = '2026-01-15';
      (window as any).normalizeWardData(d);
      return { bondWaived: d.bondWaived, restrictedDepository: d.restrictedDepository };
    });
    expect(guardian).toEqual({ bondWaived: 'Yes', restrictedDepository: '' });

    await createWard(page, 'Legacy Annual Depository Ward', 'annual');
    const annual = await page.evaluate(() => {
      const d = (window as any).D;
      delete d.restrictedDepository;
      delete d.bondWaived;
      d.restrictedDepositoryReceiptDate = '2026-02-03';
      (window as any).normalizeWardData(d);
      return { bondWaived: d.bondWaived, restrictedDepository: d.restrictedDepository };
    });
    expect(annual).toEqual({ bondWaived: '', restrictedDepository: 'Yes' });
  });

  // Found during Milestone 42/44's closing-verification full-suite run
  // (2026-09-14), which caught two real e2e failures (ward-lock.spec.ts and
  // backup-restore-sav.spec.ts) neither one directly names as a
  // normalizeWardData() bug -- both just assert window.D is empty after
  // leaving a ward and get a non-empty object back. Root cause: Milestone
  // 38E's setD() (src/core/state.js) unconditionally runs
  // normalizeWardData(d) whenever d is truthy, and an empty object is
  // truthy. core/navigation/ward-lifecycle.js's enterDashboardEditingFocus()
  // -- which every '/dashboard' navigation runs, per router.js -- calls
  // setD({}) to mean "no active ward," but migrateBoolean()'s top-level
  // calls (hasSafeDepositBox, safeDepositBoxFiled, amendedForm, and the 13
  // q7* keys) each backfill '' onto a field that is merely absent, so the
  // "empty" sentinel silently grows 16 blank-string keys the instant it's
  // set. legacy-app.js's own lockApp() sets window.D={} directly for the
  // same purpose and was never affected, which is why this went unnoticed.
  test('normalizeWardData() leaves a genuinely empty object empty (the "no active ward" sentinel)', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Sentinel Check Ward', 'guardian');

    const keyCount = await page.evaluate(() => {
      const empty = {};
      (window as any).normalizeWardData(empty);
      return Object.keys(empty).length;
    });

    expect(keyCount).toBe(0);
  });
});
