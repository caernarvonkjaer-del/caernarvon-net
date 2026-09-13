import { test, expect } from '@playwright/test';
import { freshStartNoPassword, createWard } from './support/target';

// Milestone 40H-I: "New Filing from Existing" (Convert Ward) -- a
// ward-selector default that pointed at the wrong ward, and a same-family
// accounting-to-accounting carryover gap (Annual -> Final/Trust) that
// dropped starting balance and certificate-of-service recipients while
// leaving the confirmation message describing the old, narrower behavior.
// No prior e2e coverage of Convert Ward existed before this file.

test.describe('Convert Ward / "New Filing from Existing"', () => {
  test('ward selector defaults to the active ward, not the first ward ever created', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'First Ward Ever', 'guardian');
    await createWard(page, 'Second Ward Active', 'annual');
    // createWard() leaves the newly-created ward active and on its own Cover
    // page -- confirm that before exercising the selector default.
    const activeName = await page.evaluate(() => (window as any).getActiveWard()?.wardName);
    expect(activeName).toBe('Second Ward Active');

    await page.evaluate(() => (window as any).showConvertWardModal());
    await page.locator('#convertWardModal.show').waitFor({ state: 'visible' });

    await expect(page.locator('#convert-source-ward')).toHaveValue('Second Ward Active');
  });

  test('Annual -> Final Accounting carries starting balance and cert recipients, leaves period and schedules blank', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Annual Source Ward', 'annual');

    const sourceWardId = await page.evaluate(() => {
      const d = (window as any).D;
      Object.assign(d, {
        periodFrom: '01/01/2026',
        periodTo: '12/31/2026',
        schD1: [{ fullAmount: '150000', wardPct: '100', restricted: 'No' }],
        certRecipients: [{ name: 'Jane Interested Party', line2: '100 Main St', line3: 'Tampa, FL 33602', line4: '' }],
      });
      return d.wardId;
    });
    const expectedStartingBalance = await page.evaluate(
      () => (window as any).calcTotalsAnnual((window as any).D).netAssetsFromD,
    );
    expect(expectedStartingBalance).toBe(150000);

    const newWard = await page.evaluate(async (srcId) => {
      await (window as any).convertExistingWard(srcId, 'finalAccounting');
      return (window as any).getActiveWard();
    }, sourceWardId);

    expect(newWard.inventoryType).toBe('finalAccounting');
    // Annual Accounting's own mount-time sanitizeNegativeAmounts() coerces
    // startingBalance to a number regardless of what carryOverAccountingToAccounting()
    // hands it, so this asserts numeric correctness rather than a JS type.
    expect(Number(newWard.startingBalance)).toBe(expectedStartingBalance);
    expect(newWard.certRecipients).toEqual([
      { name: 'Jane Interested Party', line2: '100 Main St', line3: 'Tampa, FL 33602', line4: '' },
    ]);
    // Period and schedules must NOT carry -- a new accounting period starts
    // blank, and schedule line-items are this period's own transactions,
    // not last period's.
    expect(newWard.periodFrom).toBeFalsy();
    expect(newWard.periodTo).toBeFalsy();
    expect(newWard.schD1).toEqual([]);
  });

  test('confirmation message for an Annual -> Trust conversion describes what actually carried', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Trust Source Ward', 'annual');

    const message = await page.evaluate(() => (window as any).describeConversion('annual', 'trustAccounting'));

    expect(message).toContain('Starting Balance is set to this filing\'s ending net assets');
    expect(message).toContain('certificate-of-service recipients are carried');
    expect(message).toContain('County is restored from this ward\'s case record');
    expect(message).toContain('accounting period and every schedule start blank');
  });
});
