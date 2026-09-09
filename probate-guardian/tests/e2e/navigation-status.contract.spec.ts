import { test, expect, type Page } from '@playwright/test';
import { freshStartNoPassword, createWard } from './support/target';

// Milestone 33, Phase 2.3 pilot -- Plan family only (Migration Sequence,
// step 2: "extend the existing Plan fixture ... then migrate Guardian,
// Simplified, and Annual only after parity is demonstrated"). This is
// additive to plan-fixture.ts's registerPlanMountTests, which already
// proves route-mount cleanliness and Summary/sidebar/computeNavChecks()
// parity for all four Plan types -- it is not duplicated here. This file
// covers the three navigation/status behaviors that fixture doesn't touch:
//   - disabled Next guidance lists every locally missing item, not a count
//     or a single generic message;
//   - a rendered jump link actually moves focus to the field it names; and
//   - Print Preview's banner and the blocked-export alert agree with the
//     underlying validator on how many issues remain.
// Guardian, Annual, and Simplified are deliberately out of scope for this
// pilot; they migrate in only once this shape is reviewed and confirmed.

type PlanNavStatusConfig = {
  featureName: string;
  filingType: 'planAnnual' | 'planInitial' | 'planMinor' | 'planSimplified';
  validateFnName: 'validatePlanAnnual' | 'validatePlanInitial' | 'validatePlanMinor' | 'validatePlanSimplified';
  // A Cover field guaranteed blank on a freshly created ward AND correctly
  // path-resolved by validation-adapter.js's generic label matcher. wardName
  // is filled by createWard() itself, and every type's county input starts
  // pre-populated with a default sample county ("Pinellas") -- neither is
  // ever blank, so neither can stand in for "the field a jump link should
  // land on". caseNumber is blank-by-default and universal to three of the
  // four types; Plan Minor has no case number field at all, so it uses
  // periodFrom instead (also blank-by-default, also a direct label match).
  jumpTestFieldPath: string;
  // A section this type's validator always flags on a blank ward, whose
  // fields live on a real, non-Cover page -- used to prove guidance shown
  // WHILE ON that page correctly attributes the error there (see the
  // "identifies a missing field while already on its own page" test below).
  nonCoverRoute: string;
  triggerBlockedExport: (page: Page) => Promise<void>;
};

const CONFIGS: PlanNavStatusConfig[] = [
  {
    featureName: 'Plan Annual',
    filingType: 'planAnnual',
    validateFnName: 'validatePlanAnnual',
    jumpTestFieldPath: 'caseNumber',
    nonCoverRoute: '/p2',
    triggerBlockedExport: (page) => page.evaluate(() => (window as any).doSavePdfPlanAnnual()),
  },
  {
    featureName: 'Plan Initial',
    filingType: 'planInitial',
    validateFnName: 'validatePlanInitial',
    jumpTestFieldPath: 'caseNumber',
    nonCoverRoute: '/p2',
    triggerBlockedExport: (page) => page.evaluate(() => (window as any).doSavePdfPlanInitial()),
  },
  {
    featureName: 'Plan Minor',
    filingType: 'planMinor',
    validateFnName: 'validatePlanMinor',
    jumpTestFieldPath: 'periodFrom',
    // Plan Minor's own '3. Treatment Providers' section only ever fires
    // per-row (no rows exist on a blank ward, so no error) -- '4. Medical
    // Services' is the first section guaranteed to fire unconditionally.
    nonCoverRoute: '/p4',
    triggerBlockedExport: (page) => page.evaluate(() => (window as any).doSavePdfPlanMinor()),
  },
  {
    featureName: 'Plan Simplified',
    filingType: 'planSimplified',
    validateFnName: 'validatePlanSimplified',
    jumpTestFieldPath: 'caseNumber',
    nonCoverRoute: '/p2',
    // Same reasoning as plan-simplified-mount.spec.ts: this filing type's
    // export button is disabled/enabled rather than an alert-only guard, so
    // the blocked path has to force it enabled before clicking.
    triggerBlockedExport: (page) => page.locator('[data-plan-simplified-action="save-pdf"]').evaluate((button: HTMLButtonElement) => {
      button.disabled = false;
      button.click();
    }),
  },
];

for (const { featureName, filingType, validateFnName, jumpTestFieldPath, nonCoverRoute, triggerBlockedExport } of CONFIGS) {
  test.describe(`${featureName} navigation/status contract`, () => {
    test('disabled Next guidance on the blank Cover page lists every missing item, from the same validator Print Preview uses', async ({ page }) => {
      await freshStartNoPassword(page);
      await createWard(page, `${featureName} Nav Guidance Ward`, filingType);
      await page.evaluate(() => (window as any).navigate('/'));

      await expect(page.locator('#page-next-btn')).toBeDisabled();
      const guidance = page.locator('#page-local-guidance');
      await expect(guidance).toBeVisible();

      // adaptValidationErrors() is the same function renderLocalSectionGuidance()
      // calls internally to group errors onto routes -- reusing it here (rather
      // than re-deriving route/section logic in the test) means this asserts
      // against the real production grouping, not a parallel guess at it.
      const expectedCoverCount = await page.evaluate(({ fnName, filingType }) => {
        const raw = (window as any)[fnName]();
        const structured = (window as any).adaptValidationErrors(raw, filingType);
        return structured.filter((e: any) => e.route === '/').length;
      }, { fnName: validateFnName, filingType });
      expect(expectedCoverCount).toBeGreaterThan(0);

      await expect(guidance.locator('[data-form-action="jump-to-field"]')).toHaveCount(expectedCoverCount);
    });

    test('a jump link moves focus to the field it names', async ({ page }) => {
      await freshStartNoPassword(page);
      await createWard(page, `${featureName} Jump Link Ward`, filingType);
      await page.evaluate(() => (window as any).navigate('/'));

      const jumpLink = page.locator(`#page-local-guidance [data-form-action="jump-to-field"][data-field-path="${jumpTestFieldPath}"]`);
      await expect(jumpLink).toBeVisible();
      await jumpLink.click();

      await expect(page.locator(`[data-form-path="${jumpTestFieldPath}"]`)).toBeFocused();
    });

    test('guidance identifies a missing field while already on its own page, not bucketed onto Cover', async ({ page }) => {
      await freshStartNoPassword(page);
      await createWard(page, `${featureName} Route Bucketing Ward`, filingType);
      await page.evaluate((r) => (window as any).navigate(r), nonCoverRoute);

      // Before the section->route resolution fix, every one of this type's
      // non-Cover section labels fell through to '/' by default -- visiting
      // this page directly, the guidance panel would show NOTHING (its
      // filter is an exact currentRoute match unless currentRoute is '/'),
      // even though computeNavChecks() already knows this page is
      // incomplete. This is the most direct proof the bucketing bug is
      // fixed: the item now actually appears while standing on its own page.
      const guidance = page.locator('#page-local-guidance');
      await expect(guidance).toBeVisible();
      const jumpLinks = guidance.locator(`[data-form-action="jump-to-field"][data-route="${nonCoverRoute}"]`);
      await expect(jumpLinks.first()).toBeVisible();
    });

    test('Print Preview banner and the blocked-export alert agree on how many issues remain', async ({ page }) => {
      await freshStartNoPassword(page);
      await createWard(page, `${featureName} Export Gate Parity Ward`, filingType);
      await page.evaluate(() => (window as any).navigate('/print'));

      // The banner's own rendered count is the ground truth here (it is
      // print.js's actual errors.length, not a parallel guess at it) --
      // the invariant under test is that the blocked-export alert, built
      // from a second, independent preflight() call in the same module,
      // reports the same number rather than drifting from it.
      const bannerText = await page.locator('.print-preview-banner').innerText();
      const match = bannerText.match(/(\d+)\s+issue/);
      expect(match, `banner did not report an issue count: "${bannerText}"`).not.toBeNull();
      const expectedCount = Number(match![1]);
      expect(expectedCount).toBeGreaterThan(0);

      // Same ordering constraint as plan-fixture.ts's blocked-export test:
      // the trigger's own promise won't settle until the alert it raises is
      // dismissed, so it must be started (not awaited) before the dialog wait.
      const dialogPromise = page.waitForEvent('dialog');
      const triggerPromise = triggerBlockedExport(page);
      const dialog = await dialogPromise;
      const alertMessage = dialog.message();
      await dialog.accept();
      await triggerPromise;

      expect(alertMessage).toContain(`${expectedCount} required field`);
    });
  });
}
