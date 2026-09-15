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

  // Found 2026-09-13 while implementing Milestone 43A: convertGuardianSchedulesToAnnual()
  // read the legacy isRestricted/isPersonalResidence/isIncomeProperty booleans
  // with no fallback to the tri-state restricted/residence/income fields the
  // current Guardian Inventory UI actually writes -- every converted row
  // carried over as "No" regardless of what the filer selected.
  test('Guardian Inventory -> Annual Accounting carries restricted/residence/income from the tri-state fields, not the dead legacy booleans', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Guardian Source Ward', 'guardian');

    const sourceWardId = await page.evaluate(() => {
      const d = (window as any).D;
      Object.assign(d, {
        scheduleB1: [{ institutionName: 'Fifth Third Bank', accountType: 'Checking', fullAssetAmount: '5000', wardPercent: '100', restricted: 'Yes' }],
        scheduleA1: [{ propertyDescription: 'Homestead', fullAssetValue: '200000', wardPercent: '100', residence: 'Yes', income: 'No' }],
        scheduleB3: [{ description: 'Brokerage Account', fullAssetValue: '3000', wardPercent: '100', restricted: 'Yes' }],
      });
      return d.wardId;
    });

    const newWard = await page.evaluate(async (srcId) => {
      await (window as any).convertExistingWard(srcId, 'annual');
      return (window as any).getActiveWard();
    }, sourceWardId);

    expect(newWard.inventoryType).toBe('annual');
    expect(newWard.schD1[0].restricted).toBe('Yes');
    expect(newWard.schD2[0].residence).toBe('Yes');
    expect(newWard.schD2[0].income).toBe('No');
    expect(newWard.schD4[0].restricted).toBe('Yes');
  });

  // Milestone 50A. A walkthrough reported the attorney name appearing
  // duplicated on this exact path; verified 2026-09-14 against current
  // master (not reproduced -- carryOverFieldsForPlan()'s planAnnual branch
  // is a single `attorney: attyName` assignment, no concatenation). Closed
  // as a real defect, but the suspected mechanism is cheap to pin
  // permanently so a future edit to that function can't quietly introduce
  // it. See MILESTONE-50-PROPOSAL.md's 50A "Verified" section for the full
  // analysis, including the likely source of the observation (the same
  // attorney field legitimately appears on three different routes -- Cover,
  // Attorney Certification, and Summary -- which is not a bug).
  test('Initial Guardianship Plan -> Annual Guardianship Plan carries the attorney name exactly once, never doubled', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Plan Attorney Source Ward', 'planInitial');

    const sourceWardId = await page.evaluate(() => {
      const d = (window as any).D;
      d.attorneyName = 'Zensiqua Okaforsson';
      return d.wardId;
    });

    const newWard = await page.evaluate(async (srcId) => {
      await (window as any).convertExistingWard(srcId, 'planAnnual');
      return (window as any).getActiveWard();
    }, sourceWardId);

    expect(newWard.inventoryType).toBe('planAnnual');
    expect(newWard.attorney).toBe('Zensiqua Okaforsson');
  });

  // Milestone 43F, Decision 4: tests/unit/convert-targets.spec.js (Milestone
  // 42E/42G) already pins convertTargetsFor()'s own per-source eligibility
  // exhaustively at the data level -- including that Plan Minor is never
  // offered as a target for any source, and is offered no targets of its
  // own -- but nothing had ever driven the real modal <select> to confirm
  // it actually renders that filtered list, rather than (for example) some
  // other, unfiltered set of <option>s the modal builds independently.
  test('the modal\'s target <select> renders exactly convertTargetsFor()\'s eligible list, for a normal source and for Plan Minor\'s fully-ineligible case', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Guardian Source Ward', 'guardian');

    await page.evaluate(() => (window as any).showConvertWardModal());
    await page.locator('#convertWardModal.show').waitFor({ state: 'visible' });

    const guardianTargets = await page.evaluate(() => (window as any).convertTargetsFor('guardian'));
    expect(guardianTargets.length).toBeGreaterThan(0);
    expect(guardianTargets).not.toContain('planMinor');
    let renderedValues = await page.locator('#convert-target-type option').evaluateAll(
      (opts) => opts.map((o) => (o as HTMLOptionElement).value),
    );
    expect(renderedValues).toEqual(guardianTargets);

    // Plan Minor as a source is the fully-ineligible case: convertTargetsFor
    // returns an empty array, and the modal must show zero <option>s plus
    // the "can't be converted" note rather than leaving stale options from
    // the previous source selection on screen.
    await createWard(page, 'Minor Source Ward', 'planMinor');
    await page.evaluate(() => (window as any).showConvertWardModal());
    await page.locator('#convertWardModal.show').waitFor({ state: 'visible' });

    const minorTargets = await page.evaluate(() => (window as any).convertTargetsFor('planMinor'));
    expect(minorTargets).toEqual([]);
    renderedValues = await page.locator('#convert-target-type option').evaluateAll(
      (opts) => opts.map((o) => (o as HTMLOptionElement).value),
    );
    expect(renderedValues).toEqual([]);
    await expect(page.locator('#convert-note')).toContainText("can't be converted");
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
