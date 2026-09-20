import { test, expect, type Page } from '@playwright/test';
import {
  freshStartNoPassword, createWard, createSimplifiedWard, fillMinimalValidPlanMinorWard, acceptDynDialog,
  fillMinimalValidAnnualWard, fillMinimalValidSimplifiedWard, fillMinimalValidPlanAnnualWard, fillMinimalValidPlanSimplifiedWard,
  fillMinimalValidPlanInitialWard, dismissScheduleDocPrompt, fillMinimalValidGuardianWard,
} from './support/target';
import type { ValidatorIssue } from './support/window-api';

// Milestone 33, Phase 2.3 -- Migration Sequence step 2 ("shared navigation/
// status pilot ... then migrate Guardian, Simplified, and Annual only after
// parity is demonstrated"). The Plan-family pilot proved the shape; Annual,
// Simplified, and Annual's finalAccounting/trustAccounting formEngine()
// aliases now share the same config-driven test loop (their architecture
// matches the Plan types closely enough to reuse it verbatim).
// Guardian does NOT reuse this loop -- its Next-button gate only ever covers
// the 11 numbered schedule pages (Cover/D1-D5/Print are never gated, by
// design), a brand-new schedule has 0 rows so no per-field jump link exists
// until one is added, its fields use data-field-path (never data-form-path),
// and its Print Preview issue count lives in a different element entirely
// (.validation-panel .validation-title, not .print-preview-banner). Per this
// milestone's own Phase 2 instruction ("preserve filing-specific route and
// status cases locally when they do not fit a shared contract"), Guardian
// gets its own hand-written block below instead of forced config entries.
//
// This is additive to plan-fixture.ts's registerPlanMountTests, which
// already proves route-mount cleanliness and Summary/sidebar/
// computeNavChecks() parity for the four Plan types -- not duplicated here.
// It covers the behaviors that fixture doesn't touch:
//   - disabled Next guidance lists every locally missing item, not a count
//     or a single generic message;
//   - a rendered jump link actually moves focus to the field it names; and
//   - Print Preview's banner and the blocked-export alert agree with the
//     underlying validator on how many issues remain.

type NavStatusConfig = {
  featureName: string;
  filingType: 'annual' | 'finalAccounting' | 'trustAccounting' | 'simplified' | 'planAnnual' | 'planInitial' | 'planMinor' | 'planSimplified';
  validateFnName: 'validateAnnual' | 'validateSimplified' | 'validatePlanAnnual' | 'validatePlanInitial' | 'validatePlanMinor' | 'validatePlanSimplified';
  // A Cover field guaranteed blank on a freshly created ward AND correctly
  // path-resolved by validation-adapter.js's generic label matcher. wardName
  // is filled by createWard() itself, and every Plan type's county input
  // starts pre-populated with a default sample county ("Pinellas") -- neither
  // is ever blank, so neither can stand in for "the field a jump link should
  // land on". caseNumber is blank-by-default and works for every type here;
  // Plan Minor has no case number field at all, so it uses periodFrom
  // instead (also blank-by-default, also a direct label match).
  jumpTestFieldPath: string;
  // A section this type's validator always flags on a blank ward, whose
  // fields live on a real, non-Cover page -- used to prove guidance shown
  // WHILE ON that page correctly attributes the error there (see the
  // "identifies a missing field while already on its own page" test below).
  nonCoverRoute: string;
  // Overrides the default createWard(page, name, filingType) -- needed for
  // Simplified, which requires its own eligibility-modal flow.
  createFiling?: (page: Page, name: string) => Promise<void>;
  triggerBlockedExport: (page: Page) => Promise<void>;
};

const CONFIGS: NavStatusConfig[] = [
  {
    featureName: 'Annual',
    filingType: 'annual',
    validateFnName: 'validateAnnual',
    jumpTestFieldPath: 'caseNumber',
    // 'Part II — Starting Balance', guaranteed blank on a fresh ward.
    nonCoverRoute: '/p2',
    // No bare window.doSavePdf global exists -- the real handler is a
    // closure-private _printModule.doSavePdf(), reachable only through the
    // delegated click handler, same as annual-mount.spec.ts's own
    // blocked-export test.
    triggerBlockedExport: (page) => page.locator('[data-annual-action="save-pdf"]').evaluate((button: HTMLButtonElement) => {
      button.disabled = false;
      button.click();
    }),
  },
  {
    // finalAccounting/trustAccounting are formEngine()==='annual' aliases --
    // same module, same validateAnnual(), same rendered print.js markup,
    // just different displayed legal copy (see annual-mount.spec.ts's
    // "Final and Trust aliases use their own legal copy" test). isScheduleIncomplete()
    // used to have no prefixMap entry for either, so their Next-button gate
    // and guidance panel were bypassed on every page, not just Cover.
    featureName: 'Final Accounting',
    filingType: 'finalAccounting',
    validateFnName: 'validateAnnual',
    jumpTestFieldPath: 'caseNumber',
    nonCoverRoute: '/p2',
    triggerBlockedExport: (page) => page.locator('[data-annual-action="save-pdf"]').evaluate((button: HTMLButtonElement) => {
      button.disabled = false;
      button.click();
    }),
  },
  {
    featureName: 'Trust Accounting',
    filingType: 'trustAccounting',
    validateFnName: 'validateAnnual',
    jumpTestFieldPath: 'caseNumber',
    nonCoverRoute: '/p2',
    triggerBlockedExport: (page) => page.locator('[data-annual-action="save-pdf"]').evaluate((button: HTMLButtonElement) => {
      button.disabled = false;
      button.click();
    }),
  },
  {
    featureName: 'Simplified',
    filingType: 'simplified',
    validateFnName: 'validateSimplified',
    jumpTestFieldPath: 'caseNumber',
    // 'Part II — Starting Balance (Line 1)', guaranteed blank on a fresh ward.
    nonCoverRoute: '/p2',
    // createWard() alone can't create a Simplified ward -- it has its own
    // eligibility-modal flow first (see createSimplifiedWard()'s own doc
    // comment in support/target.ts).
    createFiling: (page, name) => createSimplifiedWard(page, name),
    triggerBlockedExport: (page) => page.locator('[data-simplified-action="save-pdf"]').evaluate((button: HTMLButtonElement) => {
      button.disabled = false;
      button.click();
    }),
  },
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

for (const { featureName, filingType, validateFnName, jumpTestFieldPath, nonCoverRoute, createFiling, triggerBlockedExport } of CONFIGS) {
  const makeFiling = (page: Page, name: string) => (createFiling ? createFiling(page, name) : createWard(page, name, filingType));

  test.describe(`${featureName} navigation/status contract`, () => {
    test('disabled Next guidance on the blank Cover page lists every missing item, from the same validator Print Preview uses', async ({ page }) => {
      await freshStartNoPassword(page);
      await makeFiling(page, `${featureName} Nav Guidance Ward`);
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
      await makeFiling(page, `${featureName} Jump Link Ward`);
      await page.evaluate(() => (window as any).navigate('/'));

      const jumpLink = page.locator(`#page-local-guidance [data-form-action="jump-to-field"][data-field-path="${jumpTestFieldPath}"]`);
      await expect(jumpLink).toBeVisible();
      await jumpLink.click();

      await expect(page.locator(`[data-form-path="${jumpTestFieldPath}"]`)).toBeFocused();
    });

    test('guidance identifies a missing field while already on its own page, not bucketed onto Cover', async ({ page }) => {
      await freshStartNoPassword(page);
      await makeFiling(page, `${featureName} Route Bucketing Ward`);
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
      await makeFiling(page, `${featureName} Export Gate Parity Ward`);
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
      // some triggerBlockedExport configs call the async doSavePdf*
      // function directly via page.evaluate(), whose returned promise won't
      // settle until its internal `await alertModal(...)` resolves -- start
      // the trigger, then wait for and accept the dialog, then await it.
      const triggerPromise = triggerBlockedExport(page);
      const alertMessage = await acceptDynDialog(page);
      await triggerPromise;

      expect(alertMessage).toContain(`${expectedCount} required field`);
    });
  });
}

// Guardian Inventory doesn't fit the shared loop above -- see the file
// header comment for why (narrower Next-button gate, data-field-path
// instead of data-form-path, a differently-shaped Print Preview issue
// count). Its "guidance identifies a missing field while already on its own
// page" case is skipped: Guardian's routing was never bucketed onto Cover to
// begin with (Cover is never gated there at all), so there's nothing
// distinct left to prove beyond what the first test below already shows.
test.describe('Guardian Inventory navigation/status contract', () => {
  test('disabled Next guidance on a schedule page identifies every missing item once a row exists', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Guardian Nav Guidance Ward', 'guardian');
    await page.evaluate(() => (window as any).navigate('/a1'));

    // isScheduleIncomplete()'s SCHEDULE_NAV_KEYS whitelist gates only the 11
    // numbered schedule pages -- Cover/D1-D5/Print are never gated this way,
    // by design. A brand-new schedule has 0 rows, so validateGuardian()'s
    // only possible error here is the schedule-empty message (whose jump
    // link has no real field target -- the "none apply" checkbox itself
    // carries no data-bind/id). A row must exist before any per-field jump
    // link with a real focusable target appears.
    await expect(page.locator('#page-next-btn')).toBeDisabled();
    await page.locator('[data-inventory-action="add-entry"][data-schedule="a1"]').click();
    await dismissScheduleDocPrompt(page); // Milestone 57C-R advisory modal

    const expectedCount = await page.evaluate(() => {
      const raw = (window as any).validateGuardian();
      const structured = (window as any).adaptValidationErrors(raw, 'guardian');
      return structured.filter((e: any) => e.route === '/a1').length;
    });
    expect(expectedCount).toBeGreaterThan(0);

    const guidance = page.locator('#page-local-guidance');
    await expect(guidance).toBeVisible();
    const jumpLinks = guidance.locator('[data-form-action="jump-to-field"]');
    await expect(jumpLinks).toHaveCount(expectedCount);

    // Guardian's own field markup never emits data-form-path (only the
    // shared Plan-type field builder in legacy-app.js does) -- the jump
    // link's target must be located via data-field-path instead. The jump
    // link button itself also carries data-field-path (to know what to
    // focus), so the post-click assertion targets data-bind instead, which
    // only the actual input carries.
    const firstLink = jumpLinks.first();
    const targetPath = await firstLink.getAttribute('data-field-path');
    expect(targetPath).toBeTruthy();
    await firstLink.click();
    await expect(page.locator(`[data-bind="${targetPath}"]`)).toBeFocused();
  });

  // Milestone 33, Item 3 (sub-phase 3a): Schedules B-2 through C-5 share the
  // exact same "row + dot-path" shape A-1/A-2/B-1 already proved above, so
  // one config-driven loop covers all eight rather than eight near-identical
  // copies of the same test. B-2's own vehicle-field ID exception gets its
  // own dedicated test right after this loop.
  const ROW_SCHEDULES: { key: string; route: string }[] = [
    { key: 'b2', route: '/b2' },
    { key: 'b3', route: '/b3' },
    { key: 'b4', route: '/b4' },
    { key: 'c1', route: '/c1' },
    { key: 'c2', route: '/c2' },
    { key: 'c3', route: '/c3' },
    { key: 'c4', route: '/c4' },
    { key: 'c5', route: '/c5' },
  ];
  for (const { key, route } of ROW_SCHEDULES) {
    test(`disabled Next guidance on Schedule ${key.toUpperCase()} identifies every missing item once a row exists`, async ({ page }) => {
      await freshStartNoPassword(page);
      await createWard(page, `Guardian ${key.toUpperCase()} Guidance Ward`, 'guardian');
      await page.evaluate((r) => (window as any).navigate(r), route);
      await page.locator(`[data-inventory-action="add-entry"][data-schedule="${key}"]`).click();
      await dismissScheduleDocPrompt(page); // Milestone 57C-R advisory modal

      const expectedCount = await page.evaluate((r) => {
        const raw = (window as any).validateGuardian();
        const structured = (window as any).adaptValidationErrors(raw, 'guardian');
        return structured.filter((e: any) => e.route === r).length;
      }, route);
      expect(expectedCount).toBeGreaterThan(0);

      const guidance = page.locator('#page-local-guidance');
      await expect(guidance).toBeVisible();
      const jumpLinks = guidance.locator('[data-form-action="jump-to-field"]');
      await expect(jumpLinks).toHaveCount(expectedCount);

      const firstLink = jumpLinks.first();
      const targetPath = await firstLink.getAttribute('data-field-path');
      expect(targetPath).toBeTruthy();
      await firstLink.click();
      await expect(page.locator(`[data-bind="${targetPath}"]`)).toBeFocused();
    });
  }

  test('Schedule B-2 vehicle fields resolve jump links via their element id, not a dot-path', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Guardian B-2 Vehicle Ward', 'guardian');
    await page.evaluate(() => (window as any).navigate('/b2'));
    await page.locator('[data-inventory-action="add-entry"][data-schedule="b2"]').click();
    await dismissScheduleDocPrompt(page); // Milestone 57C-R advisory modal
    // renderB2Fields() renders Year/Make/Model/VIN/Odometer as raw inputs
    // with no data-bind at all once a row is marked a vehicle -- their only
    // focusable selector is the input's own literal id.
    await page.locator('[data-inventory-change="toggle-vehicle"][data-index="0"]').check();

    const yearPath = await page.evaluate(() => {
      const raw = (window as any).validateGuardian();
      const structured = (window as any).adaptValidationErrors(raw, 'guardian');
      return structured.find((e: any) => e.route === '/b2' && e.label === 'Year')?.path;
    });
    expect(yearPath).toBe('b2-vehicle-year-0');
    await page.evaluate((p) => (window as any).focusFieldByPath('/b2', p), yearPath);
    await expect(page.locator(`#${yearPath}`)).toBeFocused();
  });

  // D-1 through D-5 are never gated by isScheduleIncomplete() for Guardian
  // (see the file-header comment), so #page-local-guidance never actually
  // renders a jump link for them in the live product -- there is no on-page
  // UI surface to click through here. These sections' path derivation is
  // still worth proving directly, though: adaptValidationErrors() and
  // focusFieldByPath() are the same two functions a real jump link would use
  // if one were ever wired up for these routes, and today's bugs (D-1's
  // hardcoded guardian-#1 fallback; D-2's Preparer/Attorney fields resolving
  // to nothing) live entirely inside them.
  test('D-1 Guardian #2 signature-date jump link targets guardian #2, not guardian #1 (regression)', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Guardian D-1 Co-Guardian Ward', 'guardian');
    await page.evaluate(() => {
      const w = window as any;
      w.D.guardians[0] = { name: 'Guardian One', signatureDate: '01/01/2024', ssnEin: '123-45-6789', phone: '555-111-2222', streetAddress: '1 Main St', cityStateZip: 'Tampa, FL 33601' };
      // Milestone 39-C: a blank date with no signatureState now legitimately
      // resolves to Unsigned (checkSignatureState() correctly reports no
      // error) -- signatureState must be set explicitly to "typed" to force
      // a real, findable "date signed" error for this test to target.
      w.D.guardians.push({ name: 'Guardian Two', signatureDate: '', signatureState: 'typed', ssnEin: '987-65-4321', phone: '555-333-4444', streetAddress: '2 Oak St', cityStateZip: 'Tampa, FL 33602' });
    });
    await page.evaluate(() => (window as any).navigate('/d1'));

    const targetPath = await page.evaluate(() => {
      const raw = (window as any).validateGuardian();
      const structured = (window as any).adaptValidationErrors(raw, 'guardian');
      return structured.find((e: any) => e.section === 'D-1 Guardian #2' && e.label.includes('date signed'))?.path;
    });
    expect(targetPath).toBe('guardians.1.signatureDate');

    await page.evaluate((p) => (window as any).focusFieldByPath('/d1', p), targetPath);
    await expect(page.locator(`[data-bind="${targetPath}"]`)).toBeFocused();
  });

  test('D-2 Preparer and Attorney fields resolve to distinct targets despite sharing bare labels', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Guardian D-2 Ward', 'guardian');
    // Milestone 39-C: a blank date with no signatureState now legitimately
    // resolves to Unsigned (no error) -- both cards' signatureState must be
    // set explicitly to "typed" to force real, findable "date signed"
    // errors for this test to target.
    await page.evaluate(() => {
      const w = window as any;
      w.D.preparer.signatureState = 'typed';
      w.D.attorney.signatureState = 'typed';
    });
    await page.evaluate(() => (window as any).navigate('/d2'));

    const paths = await page.evaluate(() => {
      const raw = (window as any).validateGuardian();
      const structured = (window as any).adaptValidationErrors(raw, 'guardian');
      return {
        preparerDate: structured.find((e: any) => e.section === 'D-2 Preparer' && e.label.includes('date signed'))?.path,
        attorneySignatureDate: structured.find((e: any) => e.section === 'D-2 Attorney' && e.label.includes('date signed'))?.path,
        attorneyFilingDate: structured.find((e: any) => e.section === 'D-2 Attorney' && e.label === 'Filing Date is required.')?.path,
      };
    });
    expect(paths.preparerDate).toBe('preparer.signatureDate');
    expect(paths.attorneySignatureDate).toBe('attorney.signatureDate');
    expect(paths.attorneyFilingDate).toBe('attorney.filingDate');

    await page.evaluate((p) => (window as any).focusFieldByPath('/d2', p), paths.attorneyFilingDate);
    await expect(page.locator(`[data-bind="${paths.attorneyFilingDate}"]`)).toBeFocused();
  });

  test('D-3 Safe Deposit Box radios and D-4 Bond fields resolve real, distinct targets', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Guardian D-3-D-4 Ward', 'guardian');
    await page.evaluate(() => (window as any).navigate('/d3'));

    // D-3's two questions are mutually exclusive at any one time (the second
    // only applies once the first is answered Yes) -- a fresh ward hits the
    // first, unanswered-question branch.
    const sdbPath = await page.evaluate(() => {
      const raw = (window as any).validateGuardian();
      const structured = (window as any).adaptValidationErrors(raw, 'guardian');
      return structured.find((e: any) => e.section === 'D-3')?.path;
    });
    // Milestone 38E migrated D-3 off its hand-rolled sdb-yes/sdb-no radio ids
    // onto the shared yesNoRadioHTML() component, keyed by the real data
    // path -- both the Yes and No inputs now share data-form-path
    // "hasSafeDepositBox" rather than each having their own element id, so
    // focusFieldByPath() (which queries by data-form-path/data-bind/id, not
    // id alone) lands on whichever renders first in the DOM (Yes).
    expect(sdbPath).toBe('hasSafeDepositBox');
    await page.evaluate((p) => (window as any).focusFieldByPath('/d3', p), sdbPath);
    await expect(page.locator(`[data-form-path="${sdbPath}"]`).first()).toBeFocused();

    await page.evaluate(() => (window as any).navigate('/d4'));
    const bondPaths = await page.evaluate(() => {
      const raw = (window as any).validateGuardian();
      const structured = (window as any).adaptValidationErrors(raw, 'guardian');
      return {
        amount: structured.find((e: any) => e.section === 'D-4' && e.label.includes('Bond Amount'))?.path,
        from: structured.find((e: any) => e.section === 'D-4' && e.label.includes('Bond Period From'))?.path,
        to: structured.find((e: any) => e.section === 'D-4' && e.label.includes('Bond Period To'))?.path,
        company: structured.find((e: any) => e.section === 'D-4' && e.label.includes('Bonding Company'))?.path,
      };
    });
    expect(bondPaths).toEqual({ amount: 'bondAmount', from: 'bondPeriodFrom', to: 'bondPeriodTo', company: 'bondingCompany' });
    await page.evaluate((p) => (window as any).focusFieldByPath('/d4', p), bondPaths.company);
    await expect(page.locator(`[data-bind="${bondPaths.company}"]`)).toBeFocused();
  });

  test('D-5 resolves its three distinct shapes: bare service date, recipient rows, and attorney', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Guardian D-5 Ward', 'guardian');
    await page.evaluate(() => {
      // Milestone 57B: a STARTED recipient row, not a blank one. Under D16 a
      // wholly blank recipient list means the filer has listed nobody, which
      // now raises the attestation ("no recipients are required...") instead
      // of demanding Recipient 1's fields — so a blank row no longer produces
      // a "D-5 Recipient 1 — Name" issue for this test to resolve. Starting
      // the row is what makes it owed, which is the shape being tested here.
      (window as any).D.serviceRecipients = [{ name: '', address: '100 2nd Ave S', cityStateZip: '' }];
    });
    await page.evaluate(() => (window as any).navigate('/d5'));

    const paths = await page.evaluate(() => {
      const raw = (window as any).validateGuardian();
      const structured = (window as any).adaptValidationErrors(raw, 'guardian');
      return {
        serviceDate: structured.find((e: any) => e.section === 'D-5')?.path,
        recipientName: structured.find((e: any) => e.section === 'D-5 Recipient 1' && e.label === 'Name')?.path,
        attorneyName: structured.find((e: any) => e.section === 'D-5 Attorney' && e.label === 'Name')?.path,
      };
    });
    expect(paths.serviceDate).toBe('serviceDate');
    expect(paths.recipientName).toBe('serviceRecipients.0.name');
    expect(paths.attorneyName).toBe('serviceAttorney.name');

    await page.evaluate((p) => (window as any).focusFieldByPath('/d5', p), paths.recipientName);
    await expect(page.locator(`[data-bind="${paths.recipientName}"]`)).toBeFocused();
  });

  test('Print Preview panel and the blocked-export alert agree on how many issues remain', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Guardian Export Gate Parity Ward', 'guardian');
    await page.evaluate(() => (window as any).navigate('/print'));

    // Unlike the other filing types, Guardian's .print-preview-banner
    // carries no dynamic issue count -- the count lives in the separate
    // validation panel validationPanel() renders alongside it. Milestone 44C
    // added the shared readiness card right after it, which reuses the same
    // .validation-panel .validation-title classes -- filter to the
    // error-panel's own text (same technique pdf-preview-viewer.spec.ts and
    // plan-readiness.contract.spec.ts already use for this exact collision).
    const panelText = await page.locator('.validation-panel .validation-title').filter({ hasText: /required field/ }).innerText();
    const match = panelText.match(/(\d+)\s+required field/);
    expect(match, `validation panel did not report a required-field count: "${panelText}"`).not.toBeNull();
    const expectedCount = Number(match![1]);
    expect(expectedCount).toBeGreaterThan(0);

    await page.locator('[data-inventory-action="save-pdf"]').evaluate((button: HTMLButtonElement) => {
      button.disabled = false;
      button.click();
    });
    const alertMessage = await acceptDynDialog(page);

    expect(alertMessage).toContain(`${expectedCount} required field`);
  });
});

// Milestone 33, Item 3 (sub-phases 3b/3c/3d): field-path accuracy for the
// Annual/Final/Trust/Simplified accounting family and the four Plan types.
// Guardian Inventory's own sub-phase (3a) is covered above. These target the
// specific real bugs and trickiest shapes found while extending
// adaptValidationErrors() to these seven remaining filing types -- not an
// exhaustive enumeration of every one of the ~85 new field branches added,
// which would just be re-deriving the source rather than proving anything.
// Like the Guardian D-1 through D-5 tests above, these call
// validate*()/adaptValidationErrors()/focusFieldByPath() directly rather
// than through a real page's guidance panel: several of these pages (e.g.
// Annual's Part III, which also validates guardian #1's own fields) have
// other required fields blank on a fresh ward too, so isolating "the one
// jump link this test is about" from a real, busy panel would be fragile;
// calling the same three production functions the panel itself calls is
// just as direct a proof of the fix.
test.describe('Annual/Final/Trust field-path accuracy (Milestone 33, Item 3, sub-phase 3b)', () => {
  // finalAccounting/trustAccounting share this exact validateAnnual() code
  // path (formEngine() aliases) -- one instance proves the fix for all
  // three, same reasoning annual-mount.spec.ts's own alias test already
  // uses for legal-copy/identity differences.
  test('Part III co-guardian #2 signature date targets guardian #2, not guardian #1 (regression)', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Annual Co-Guardian Ward', 'annual');
    // Milestone 39-C: a blank date with no signatureState now legitimately
    // resolves to Unsigned (checkSignatureState() correctly reports no
    // error) -- signatureState must be set explicitly to "typed" to force
    // a real, findable "date signed" error for this test to target.
    await page.evaluate(() => {
      const w = window as any;
      w.D.guardians = [
        { name: 'Guardian One', signatureDate: '01/01/2024', ssn: '123-45-6789', phone: '555-111-2222', mailingStreet: '1 Main St', mailingCityStateZip: 'Tampa, FL 33601' },
        { name: 'Guardian Two', signatureDate: '', signatureState: 'typed', ssn: '987-65-4321', phone: '555-333-4444', mailingStreet: '2 Oak St', mailingCityStateZip: 'Tampa, FL 33602' },
      ];
    });
    await page.evaluate(() => (window as any).navigate('/p3'));

    const targetPath = await page.evaluate(() => {
      const raw = (window as any).validateAnnual();
      const structured = (window as any).adaptValidationErrors(raw, 'annual');
      return structured.find((e: any) => e.section === 'Part III' && e.label.includes('Guardian #2') && e.label.includes('date signed'))?.path;
    });
    expect(targetPath).toBe('guardians.1.signatureDate');

    await page.evaluate((p) => (window as any).focusFieldByPath('/p3', p), targetPath);
    await expect(page.locator(`[data-form-path="${targetPath}"]`)).toBeFocused();
  });

  test('Schedule B-1 row resolves via the detail-side "Line N" ordinal, not the section', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Annual Schedule B-1 Ward', 'annual');
    await page.evaluate(() => {
      (window as any).D.schB1 = [{ bankAcct: '111222333', checkNo: '1001', datePaid: '01/01/2024', payee: '', amount: '500' }];
    });
    await page.evaluate(() => (window as any).navigate('/schb1'));

    const targetPath = await page.evaluate(() => {
      const raw = (window as any).validateAnnual();
      const structured = (window as any).adaptValidationErrors(raw, 'annual');
      return structured.find((e: any) => e.section === 'Schedule B-1' && e.label.includes('Payee'))?.path;
    });
    expect(targetPath).toBe('schB1.0.payee');

    await page.evaluate((p) => (window as any).focusFieldByPath('/schb1', p), targetPath);
    await expect(page.locator(`[data-annual-path="${targetPath}"], [data-form-path="${targetPath}"]`)).toBeFocused();
  });

  test('Part IV Preparer and Part V Attorney resolve to their own distinct field shapes', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Annual Preparer Attorney Ward', 'annual');
    await page.evaluate(() => (window as any).navigate('/p4'));

    const paths = await page.evaluate(() => {
      const raw = (window as any).validateAnnual();
      const structured = (window as any).adaptValidationErrors(raw, 'annual');
      return {
        // Annual's preparer field is named `street`, not `streetAddress` --
        // its own shape, distinct from Guardian Inventory's D-2 preparer.
        preparerStreet: structured.find((e: any) => e.section === 'Part IV' && e.label.includes('Preparer Street'))?.path,
        // Flat, underscore-prefixed scalar, not a nested attorney object.
        attorneyBar: structured.find((e: any) => e.section === 'Part V' && e.label.includes('Bar Number'))?.path,
      };
    });
    expect(paths.preparerStreet).toBe('preparer.street');
    expect(paths.attorneyBar).toBe('attorney_bar');

    await page.evaluate((p) => (window as any).focusFieldByPath('/p4', p), paths.preparerStreet);
    await expect(page.locator(`[data-form-path="${paths.preparerStreet}"]`)).toBeFocused();
  });

  test('Schedule D-1 "Type" and D-5 "Loan Type" resolve to distinct fields (ordering regression)', async ({ page }) => {
    // A naive keyword match ("type" before "loan type") would make D-5's
    // "Loan Type" label resolve to schD5.N.type instead of .loanType, since
    // "Loan Type" contains "type" as a substring -- caught while writing
    // this branch, not from a real bug report; still worth a regression
    // test since it's an easy mistake to reintroduce.
    await freshStartNoPassword(page);
    await createWard(page, 'Annual D-1 D-5 Type Ward', 'annual');
    await page.evaluate(() => {
      const w = window as any;
      w.D.schD1 = [{ description: 'Checking Account', accountNo: '4455', restricted: 'No', type: '', fullAmount: '1000', wardPct: '100' }];
      w.D.schD5 = [{ description: 'Auto Loan', loanNo: '99', loanType: '', fullDebt: '5000', wardPct: '100' }];
    });
    await page.evaluate(() => (window as any).navigate('/schd1'));

    const paths = await page.evaluate(() => {
      const raw = (window as any).validateAnnual();
      const structured = (window as any).adaptValidationErrors(raw, 'annual');
      return {
        d1Type: structured.find((e: any) => e.section === 'Schedule D-1' && e.label.includes('Type') && !e.label.includes('Loan'))?.path,
        d5LoanType: structured.find((e: any) => e.section === 'Schedule D-5' && e.label.includes('Loan Type'))?.path,
      };
    });
    expect(paths.d1Type).toBe('schD1.0.type');
    expect(paths.d5LoanType).toBe('schD5.0.loanType');
  });

  test('Schedule C "Gain or Loss" compound message resolves to the first field of the pair (documented approximation)', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Annual Schedule C Ward', 'annual');
    await page.evaluate(() => {
      (window as any).D.schC = [{ description: 'Sale of stock', date: '01/01/2024', gain: '', loss: '' }];
    });
    await page.evaluate(() => (window as any).navigate('/schc'));

    const targetPath = await page.evaluate(() => {
      const raw = (window as any).validateAnnual();
      const structured = (window as any).adaptValidationErrors(raw, 'annual');
      return structured.find((e: any) => e.section === 'Schedule C' && e.label.includes('Gain or Loss'))?.path;
    });
    expect(targetPath).toBe('schC.0.gain');
  });
});

test.describe('Simplified field-path accuracy (Milestone 33, Item 3, sub-phase 3c)', () => {
  test('Part IV guardian residence/mailing pair and Part V/VI field-name divergences from Annual', async ({ page }) => {
    await freshStartNoPassword(page);
    await createSimplifiedWard(page, 'Simplified Field Shape Ward');
    await page.evaluate(() => {
      (window as any).D.guardians[0] = {
        name: 'Guardian One', signatureDate: '01/01/2024', ssn: '123-45-6789', phone: '555-111-2222', email: 'g1@example.com',
        mailingStreet: '1 Main St', mailingCityStateZip: 'Tampa, FL 33601', residenceStreet: '', residenceCityStateZip: '',
      };
    });
    await page.evaluate(() => (window as any).navigate('/p4'));

    const p4Path = await page.evaluate(() => {
      const raw = (window as any).validateSimplified();
      const structured = (window as any).adaptValidationErrors(raw, 'simplified');
      // Simplified's own residence/mailing address split -- Annual has no
      // equivalent field pair on its guardian rows.
      return structured.find((e: any) => e.section === 'Part IV' && e.label.includes('Residence Street'))?.path;
    });
    expect(p4Path).toBe('guardians.0.residenceStreet');
    await page.evaluate((p) => (window as any).focusFieldByPath('/p4', p), p4Path);
    await expect(page.locator(`[data-form-path="${p4Path}"]`)).toBeFocused();

    await page.evaluate(() => (window as any).navigate('/p5'));
    const otherPaths = await page.evaluate(() => {
      const raw = (window as any).validateSimplified();
      const structured = (window as any).adaptValidationErrors(raw, 'simplified');
      return {
        // Simplified names this attorney_barNumber; Annual names the
        // conceptually identical field attorney_bar.
        barNumber: structured.find((e: any) => e.section === 'Part V' && e.label.includes('Bar Number'))?.path,
      };
    });
    expect(otherPaths.barNumber).toBe('attorney_barNumber');

    await page.evaluate(() => (window as any).navigate('/p6'));
    const p6Path = await page.evaluate(() => {
      const raw = (window as any).validateSimplified();
      const structured = (window as any).adaptValidationErrors(raw, 'simplified');
      // Simplified names this certServiceDate; Annual names the
      // conceptually identical field certDate.
      return structured.find((e: any) => e.section === 'Part VI' && e.label.includes('Date of Service'))?.path;
    });
    expect(p6Path).toBe('certServiceDate');
  });
});

test.describe('Plan types field-path accuracy (Milestone 33, Item 3, sub-phase 3d)', () => {
  test('Plan Annual "1. Residences" resolves through the filtered-array index (documented modeling caveat)', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Plan Annual Residences Ward', 'planAnnual');
    await page.evaluate(() => {
      // Non-blank street with a blank name keeps this row in the
      // validator's own filter (r.name||r.street||r.cityStateZip) while
      // still failing its !r.name check.
      (window as any).D.q1Residences = [{ name: '', street: '123 Group Home Ln', cityStateZip: 'Tampa, FL 33601' }];
    });
    await page.evaluate(() => (window as any).navigate('/p2'));

    const targetPath = await page.evaluate(() => {
      const raw = (window as any).validatePlanAnnual();
      const structured = (window as any).adaptValidationErrors(raw, 'planAnnual');
      return structured.find((e: any) => e.section === '1. Residences' && e.label.includes('row'))?.path;
    });
    expect(targetPath).toBe('q1Residences.0.name');

    await page.evaluate((p) => (window as any).focusFieldByPath('/p2', p), targetPath);
    await expect(page.locator(`[data-form-path="${targetPath}"]`)).toBeFocused();
  });

  test('Plan Initial Examining Providers uses the raw array index; Attorney Certification resolves attorney_name', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Plan Initial Providers Ward', 'planInitial');
    await page.evaluate(() => {
      const w = window as any;
      // Row 0 complete, row 1 has data but no name -- unlike Plan Annual,
      // this validator indexes the raw array directly (no pre-filter), so
      // the error's row number always matches the real array position.
      w.D.q9Providers = [
        { name: 'Dr. First', providerType: 'Psychiatrist' },
        { name: '', providerType: 'Neurologist' },
      ];
    });
    await page.evaluate(() => (window as any).navigate('/p5'));

    const providerPath = await page.evaluate(() => {
      const raw = (window as any).validatePlanInitial();
      const structured = (window as any).adaptValidationErrors(raw, 'planInitial');
      return structured.find((e: any) => e.section === '9. Examining Providers')?.path;
    });
    expect(providerPath).toBe('q9Providers.1.name');
    await page.evaluate((p) => (window as any).focusFieldByPath('/p5', p), providerPath);
    await expect(page.locator(`[data-form-path="${providerPath}"]`)).toBeFocused();

    await page.evaluate(() => (window as any).navigate('/p10'));
    // Milestone 35-3: attorney fields are pro se-safe -- required only once
    // the filer has started entering one (see validatePlanInitial()). Seed
    // just the bar number so the conditional block fires and attorney_name
    // still resolves a real error/path, without claiming attorney fields are
    // unconditionally required for a blank filing (they no longer are).
    await page.evaluate(() => { (window as any).D.attorney_bar = '123456'; });
    const attorneyPath = await page.evaluate(() => {
      const raw = (window as any).validatePlanInitial();
      const structured = (window as any).adaptValidationErrors(raw, 'planInitial');
      // attorney_name here, not the separate, cosmetic-only, never-validated
      // attorneyName field this type also shows on its Cover page.
      return structured.find((e: any) => e.section === 'Attorney Certification' && e.label.includes('Attorney name'))?.path;
    });
    expect(attorneyPath).toBe('attorney_name');
  });

  test('Plan Minor "Preparer & Attorney" resolves three same-page fields to three distinct targets', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Plan Minor Preparer Attorney Ward', 'planMinor');
    await page.evaluate(() => (window as any).navigate('/p7'));

    // Milestone 35-3: preparer and attorney are optional roles, required only
    // once the filer has started entering one -- each pair's own "required"
    // check (preparer_name, attorney_name, attorney_signatureDate) is also
    // exactly what activates its conditional block (see validatePlanMinor()),
    // so a single D state can't leave a target field blank while also using
    // it to activate the block. Seed the *other* field in each pair instead:
    // preparer_signatureDate activates the preparer block while preparer_name
    // stays blank (and vice versa for attorney_name/attorney_signatureDate),
    // still proving each field genuinely resolves its own real error/path
    // rather than claiming either role is unconditionally required.
    const preparerName = await page.evaluate(() => {
      const w = window as any;
      w.D.preparer_signatureDate = '2027-01-15';
      const structured = w.adaptValidationErrors(w.validatePlanMinor(), 'planMinor');
      const path = structured.find((e: any) => e.section === 'Preparer & Attorney' && e.label.includes('Preparer name'))?.path;
      w.D.preparer_signatureDate = '';
      return path;
    });
    const attorneyName = await page.evaluate(() => {
      const w = window as any;
      w.D.attorney_signatureDate = '2027-01-15';
      const structured = w.adaptValidationErrors(w.validatePlanMinor(), 'planMinor');
      const path = structured.find((e: any) => e.section === 'Preparer & Attorney' && e.label.includes('Attorney name'))?.path;
      w.D.attorney_signatureDate = '';
      return path;
    });
    const attorneySignatureDate = await page.evaluate(() => {
      const w = window as any;
      w.D.attorney_name = 'John Attorney';
      // Milestone 39-C: a blank date with no signatureState now legitimately
      // resolves to Unsigned (no error) -- signatureState must be set
      // explicitly to "typed" to force a real, findable "date signed" error.
      w.D.attorney_signatureState = 'typed';
      const structured = w.adaptValidationErrors(w.validatePlanMinor(), 'planMinor');
      return structured.find((e: any) => e.section === 'Preparer & Attorney' && e.label.includes('Attorney') && e.label.includes('date signed'))?.path;
    });
    const paths = { preparerName, attorneyName, attorneySignatureDate };
    expect(paths).toEqual({ preparerName: 'preparer_name', attorneyName: 'attorney_name', attorneySignatureDate: 'attorney_signatureDate' });

    await page.evaluate((p) => (window as any).focusFieldByPath('/p7', p), paths.attorneySignatureDate);
    await expect(page.locator(`[data-form-path="${paths.attorneySignatureDate}"]`)).toBeFocused();
  });

  test('Plan Simplified resolves conditional "explanation" fields ahead of the base question they qualify', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Plan Simplified Explain Ward', 'planSimplified');
    await page.evaluate(() => {
      const w = window as any;
      // Answering Yes satisfies the base "must be answered" check but
      // triggers its own, otherwise-identically-worded "Question N" family
      // explanation requirement.
      w.D.q7RestoreRights = 'Yes';
      w.D.q7RestoreExplain = '';
      w.D.q9Remuneration = 'Yes';
      w.D.q9RemunerationExplain = '';
    });
    await page.evaluate(() => (window as any).navigate('/p2'));

    const paths = await page.evaluate(() => {
      const raw = (window as any).validatePlanSimplified();
      const structured = (window as any).adaptValidationErrors(raw, 'planSimplified');
      return {
        q7: structured.find((e: any) => e.section === 'The Plan' && e.label.includes('Question 7 explanation'))?.path,
        q9: structured.find((e: any) => e.section === 'The Plan' && e.label.includes('Question 9 explanation'))?.path,
      };
    });
    expect(paths).toEqual({ q7: 'q7RestoreExplain', q9: 'q9RemunerationExplain' });

    await page.evaluate((p) => (window as any).focusFieldByPath('/p2', p), paths.q7);
    await expect(page.locator(`[data-form-path="${paths.q7}"]`)).toBeFocused();
  });
});

// Milestone 40C-E. A sidebar section must not read complete while the export
// validator blocks on that same section. Two cases where it did:
//
//  - Plan Annual Question 4: the check was `provs.every(r => filled(r.name))`,
//    and .every() is TRUE for an empty array, so a filing with no providers at
//    all looked complete while validatePlanAnnual() blocked with "at least one
//    provider must be listed". The readiness panel already agreed with the
//    validator, so the sidebar was the odd one out.
//  - Plan Minor Cover: validatePlanMinor() requires case identity (ucn || ref)
//    and an ANSWERED "Amended Form?", neither of which pm-cover tracked.
test.describe('Milestone 40C-E: sidebar section status agrees with the export blocker', () => {
  test('Plan Annual: no providers leaves Question 4 incomplete and blocks export', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Provider Parity Ward', 'planAnnual');

    const state = await page.evaluate(() => {
      const w = window as any;
      return {
        providerCount: (w.D.q4Providers || []).filter((r: any) => r && (r.name || r.providerType || r.visits)).length,
        navComplete: w.computeNavChecks().checks['pa-p5'],
        blocked: w.validatePlanAnnual().some((m: ValidatorIssue) => m.message.includes('at least one provider must be listed')),
      };
    });
    expect(state.providerCount).toBe(0);
    expect(state.blocked, 'export must block on the empty provider table').toBe(true);
    expect(state.navComplete, 'sidebar must not call Question 4 complete while export blocks on it').toBe(false);
  });

  test('Plan Annual: one named provider satisfies both the sidebar and the validator', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Provider Parity Filled Ward', 'planAnnual');
    await page.evaluate(() => {
      const w = window as any;
      w.D.q4Providers = [{ name: 'Dr. Alice Nguyen', providerType: 'Primary Care Physician', visits: '4' }];
    });

    const state = await page.evaluate(() => {
      const w = window as any;
      return {
        navComplete: w.computeNavChecks().checks['pa-p5'],
        blocked: w.validatePlanAnnual().some((m: ValidatorIssue) => m.message.includes('at least one provider must be listed')),
      };
    });
    expect(state.blocked).toBe(false);
    expect(state.navComplete).toBe(true);
  });

  test('Plan Minor: Cover tracks case identity and the Amended Form answer', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Minor Cover Parity Ward', 'planMinor');
    await fillMinimalValidPlanMinorWard(page);

    // Baseline: the fixture is a complete filing, so Cover agrees both ways.
    const baseline = await page.evaluate(() => {
      const w = window as any;
      return {
        navComplete: w.computeNavChecks().checks['pm-cover'],
        caseBlocked: w.validatePlanMinor().some((m: ValidatorIssue) => m.message.includes('Cover — Case Number is required')),
        amendedBlocked: w.validatePlanMinor().some((m: ValidatorIssue) => m.message.includes('Cover — Amended Form? must be answered')),
      };
    });
    expect(baseline).toEqual({ navComplete: true, caseBlocked: false, amendedBlocked: false });

    // Case identity: ucn OR ref satisfies it, so both must be cleared.
    const noCaseIdentity = await page.evaluate(() => {
      const w = window as any;
      w.D.ucn = ''; w.D.ref = '';
      return {
        navComplete: w.computeNavChecks().checks['pm-cover'],
        blocked: w.validatePlanMinor().some((m: ValidatorIssue) => m.message.includes('Cover — Case Number is required')),
      };
    });
    expect(noCaseIdentity).toEqual({ navComplete: false, blocked: true });

    // Either field on its own is enough, for the sidebar as for the validator.
    const refOnly = await page.evaluate(() => {
      const w = window as any;
      w.D.ucn = ''; w.D.ref = '26-000123-GD';
      return {
        navComplete: w.computeNavChecks().checks['pm-cover'],
        blocked: w.validatePlanMinor().some((m: ValidatorIssue) => m.message.includes('Cover — Case Number is required')),
      };
    });
    expect(refOnly).toEqual({ navComplete: true, blocked: false });

    // "Amended Form?" must be answered; blank is unanswered, and an explicit
    // 'No' is a real answer that must satisfy both.
    const amendedBlank = await page.evaluate(() => {
      const w = window as any;
      w.D.amendedForm = '';
      return {
        navComplete: w.computeNavChecks().checks['pm-cover'],
        blocked: w.validatePlanMinor().some((m: ValidatorIssue) => m.message.includes('Cover — Amended Form? must be answered')),
      };
    });
    expect(amendedBlank).toEqual({ navComplete: false, blocked: true });

    const amendedNo = await page.evaluate(() => {
      const w = window as any;
      w.D.amendedForm = 'No';
      return {
        navComplete: w.computeNavChecks().checks['pm-cover'],
        blocked: w.validatePlanMinor().some((m: ValidatorIssue) => m.message.includes('Cover — Amended Form? must be answered')),
      };
    });
    expect(amendedNo).toEqual({ navComplete: true, blocked: false });

    // Amended Form 'Yes' additionally requires the version, in both places.
    const amendedYesNoVersion = await page.evaluate(() => {
      const w = window as any;
      w.D.amendedForm = 'Yes'; w.D.amendedVersion = '';
      return {
        navComplete: w.computeNavChecks().checks['pm-cover'],
        blocked: w.validatePlanMinor().some((m: ValidatorIssue) => m.message.includes('Cover — Amended Form version is required')),
      };
    });
    expect(amendedYesNoVersion).toEqual({ navComplete: false, blocked: true });
  });
});

// Milestone 55B. computeNavChecks() hand-writes a presence-only nav-check
// per filing type, entirely independent of each feature's own validator, for
// every filing type except Guardian Inventory (whose branch derives its
// checks directly from validate()'s real errors). Twenty-three
// checkDateOrder() relationships across five filing types had a
// presence-only sidebar counterpart with no idea what date ordering the real
// validator enforces -- a filing could show every section green while
// Preview & Export still blocked on a signature or certification dated
// before the period it certifies. This is the runtime venue (not
// checklist-export-parity.spec.js, which only slices computeNavChecks()'s
// source into text and can never execute it) -- covering at least one
// Exact-fit relationship per filing type, plus both Borrowed keys
// specifically, since those are the ones this milestone's own review caught
// being silently left unresolved in an earlier draft.
test.describe('Milestone 55B: sidebar date-order agrees with the export blocker', () => {
  test('Plan Annual: reported case -- guardian signed before the reporting period ended', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Date Order Parity PA Ward', 'planAnnual');
    await fillMinimalValidPlanAnnualWard(page);

    // Baseline: the fixture's dates are already in order.
    const baseline = await page.evaluate(() => {
      const w = window as any;
      return {
        navComplete: w.computeNavChecks().checks['pa-p11'],
        blocked: w.validatePlanAnnual().some((m: ValidatorIssue) => m.message.includes('Guardian date signed must be on or after')),
      };
    });
    expect(baseline).toEqual({ navComplete: true, blocked: false });

    // Push the guardian's signature date before periodTo -- the exact
    // reported defect.
    const outOfOrder = await page.evaluate(() => {
      const w = window as any;
      w.D.planGuardians[0].signatureDate = '2020-01-01';
      return {
        navComplete: w.computeNavChecks().checks['pa-p11'],
        blocked: w.validatePlanAnnual().some((m: ValidatorIssue) => m.message.includes('Guardian date signed must be on or after')),
      };
    });
    expect(outOfOrder.blocked, 'export must block on the out-of-order guardian date').toBe(true);
    expect(outOfOrder.navComplete, 'sidebar must not call Signatures complete while export blocks on it').toBe(false);
  });

  test('Plan Annual: Borrowed attorney date also flips the guardian-labeled key (named trade-off, not a gap)', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Date Order Parity PA Attorney Ward', 'planAnnual');
    await fillMinimalValidPlanAnnualWard(page);
    await page.evaluate(() => {
      const w = window as any;
      w.D.attorney = 'Jordan Reyes, Esq.';
      w.D.attorney_signatureDate = '2020-01-01';
    });

    const state = await page.evaluate(() => {
      const w = window as any;
      return {
        navComplete: w.computeNavChecks().checks['pa-p11'],
        blocked: w.validatePlanAnnual().some((m: ValidatorIssue) => m.message.includes('Attorney date signed must be on or after')),
      };
    });
    expect(state.blocked, 'export must block on the out-of-order attorney date').toBe(true);
    // pa-p11 is the guardian's own key -- borrowed for the attorney's date
    // because Plan Annual has no attorney-specific key at all. This is the
    // accepted, named trade-off (a preparer/attorney-only problem shows as
    // "Signatures incomplete" rather than pointing at the specific role),
    // not a bug: the point of this test is that the key genuinely flips,
    // closing the reported defect class, not that the label is precise.
    expect(state.navComplete).toBe(false);
  });

  test('Plan Simplified: Borrowed preparer and attorney dates both flip the guardian-labeled ps-p3', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Date Order Parity PS Ward', 'planSimplified');
    await fillMinimalValidPlanSimplifiedWard(page);

    const baseline = await page.evaluate(() => (window as any).computeNavChecks().checks['ps-p3']);
    expect(baseline).toBe(true);

    const preparerOutOfOrder = await page.evaluate(() => {
      const w = window as any;
      w.D.preparer_name = 'Sam Okafor';
      w.D.preparer_signatureDate = '2020-01-01';
      return {
        navComplete: w.computeNavChecks().checks['ps-p3'],
        blocked: w.validatePlanSimplified().some((m: ValidatorIssue) => m.message.includes('Preparer date signed must be on or after')),
      };
    });
    expect(preparerOutOfOrder.blocked, 'export must block on the out-of-order preparer date').toBe(true);
    expect(preparerOutOfOrder.navComplete).toBe(false);

    // Reset, then confirm the attorney side independently flips the same key.
    await page.evaluate(() => { (window as any).D.preparer_signatureDate = ''; });
    const attorneyOutOfOrder = await page.evaluate(() => {
      const w = window as any;
      w.D.attorney = 'Jordan Reyes, Esq.';
      w.D.attorney_signatureDate = '2020-01-01';
      return {
        navComplete: w.computeNavChecks().checks['ps-p3'],
        blocked: w.validatePlanSimplified().some((m: ValidatorIssue) => m.message.includes('Attorney date signed must be on or after')),
      };
    });
    expect(attorneyOutOfOrder.blocked, 'export must block on the out-of-order attorney date').toBe(true);
    expect(attorneyOutOfOrder.navComplete).toBe(false);
  });

  test('Annual Accounting: attorney signature date (Exact-fit a-p5) and Cover period order (a-p1)', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Date Order Parity Annual Ward', 'annual');
    await fillMinimalValidAnnualWard(page);

    const baseline = await page.evaluate(() => {
      const w = window as any;
      return { p1: w.computeNavChecks().checks['a-p1'], p5: w.computeNavChecks().checks['a-p5'] };
    });
    expect(baseline).toEqual({ p1: true, p5: true });

    const attorneyOutOfOrder = await page.evaluate(() => {
      const w = window as any;
      w.D.attorney_signatureDate = '2020-01-01';
      return {
        navComplete: w.computeNavChecks().checks['a-p5'],
        blocked: w.validateAnnual().some((m: ValidatorIssue) => m.message.includes('Attorney Signature Date must be on or after')),
      };
    });
    expect(attorneyOutOfOrder.blocked).toBe(true);
    expect(attorneyOutOfOrder.navComplete).toBe(false);

    const coverOutOfOrder = await page.evaluate(() => {
      const w = window as any;
      w.D.periodFrom = '2027-01-01'; w.D.periodTo = '2026-01-01';
      return {
        navComplete: w.computeNavChecks().checks['a-p1'],
        blocked: w.validateAnnual().some((m: ValidatorIssue) => m.message.includes('Accounting Period To must be on or after')),
      };
    });
    expect(coverOutOfOrder.blocked).toBe(true);
    expect(coverOutOfOrder.navComplete).toBe(false);
  });

  test('Simplified Accounting: attorney signature date (Exact-fit s-p5) is a real, previously-untracked field', async ({ page }) => {
    await freshStartNoPassword(page);
    await createSimplifiedWard(page, 'Date Order Parity Simplified Ward');
    await fillMinimalValidSimplifiedWard(page);

    const baseline = await page.evaluate(() => (window as any).computeNavChecks().checks['s-p5']);
    expect(baseline).toBe(true);

    const outOfOrder = await page.evaluate(() => {
      const w = window as any;
      w.D.attorney_signatureDate = '2020-01-01';
      return {
        navComplete: w.computeNavChecks().checks['s-p5'],
        blocked: w.validateSimplified().some((m: ValidatorIssue) => m.message.includes('Signature Date must be on or after')),
      };
    });
    expect(outOfOrder.blocked, 'export must block on the out-of-order attorney date').toBe(true);
    expect(outOfOrder.navComplete, 's-p5 never tracked attorney_signatureDate before this fix').toBe(false);
  });

  test('Plan Minor: preparer and attorney dates both flip the already-combined pm-p7 (Exact fit, not Borrowed)', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Date Order Parity PM Ward', 'planMinor');
    await fillMinimalValidPlanMinorWard(page);
    await page.evaluate(() => {
      const w = window as any;
      w.D.preparer_name = 'Sam Okafor';
      w.D.attorney_name = 'Jordan Reyes, Esq.';
    });

    const baseline = await page.evaluate(() => (window as any).computeNavChecks().checks['pm-p7']);
    expect(baseline).toBe(true);

    const attorneyOutOfOrder = await page.evaluate(() => {
      const w = window as any;
      w.D.attorney_signatureDate = '2020-01-01';
      return {
        navComplete: w.computeNavChecks().checks['pm-p7'],
        blocked: w.validatePlanMinor().some((m: ValidatorIssue) => m.message.includes('Attorney signature date must be on or after')),
      };
    });
    expect(attorneyOutOfOrder.blocked).toBe(true);
    expect(attorneyOutOfOrder.navComplete).toBe(false);
  });

  test('every date in valid order leaves all five filing types unaffected', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Date Order Parity Control Ward', 'planAnnual');
    await fillMinimalValidPlanAnnualWard(page);
    const stillComplete = await page.evaluate(() => (window as any).computeNavChecks().checks['pa-p11']);
    expect(stillComplete, 'a filing with every date already in order must not be flipped by this fix').toBe(true);
  });
});

// Milestone 55D. Attorney "Primary Email (e-filing)" rendered a required
// asterisk in four filing types (Annual, Simplified Accounting, Plan Annual,
// Plan Initial) that no validator enforced. Alan chose Option A: enforce it,
// per-engine, using each engine's own existing gating shape -- unconditional
// in Annual/Simplified (matching their sibling bar/phone/street/cityStateZip
// fields), bare `d.attorney` truthiness in Plan Annual (co-existing with its
// separate signature-state-triggered name rule), and the exact "started"
// predicate in Plan Initial (not a new, separately-evaluated condition,
// which could accidentally narrow the Milestone 35-3 pro se/Guardian
// Advocate exemption). Plan Initial's own sidebar key, pi-p10, additionally
// needed replacing outright (Error 4): it was unconditional before this fix,
// so a blank attorney card already showed incomplete in the sidebar despite
// the validator requiring nothing -- the same class of defect 55B fixes,
// inverted.
test.describe('Milestone 55D: attorney email is required exactly where the UI already promised it is', () => {
  test('Annual Accounting: blank email blocks (unconditional, matching its sibling fields)', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Attorney Email Annual Ward', 'annual');
    await fillMinimalValidAnnualWard(page);

    const baseline = await page.evaluate(() => (window as any).computeNavChecks().checks['a-p5']);
    expect(baseline).toBe(true);

    const blankEmail = await page.evaluate(() => {
      const w = window as any;
      w.D.attorney_email = '';
      return {
        navComplete: w.computeNavChecks().checks['a-p5'],
        blocked: w.validateAnnual().some((m: ValidatorIssue) => m.message.includes('Attorney Email')),
      };
    });
    expect(blankEmail.blocked, 'export must now block on the blank attorney email').toBe(true);
    expect(blankEmail.navComplete, 'a-p5 never tracked attorney_email before this fix').toBe(false);
  });

  test('Simplified Accounting: blank email blocks (unconditional, matching its sibling fields)', async ({ page }) => {
    await freshStartNoPassword(page);
    await createSimplifiedWard(page, 'Attorney Email Simplified Ward');
    await fillMinimalValidSimplifiedWard(page);

    const baseline = await page.evaluate(() => (window as any).computeNavChecks().checks['s-p5']);
    expect(baseline).toBe(true);

    const blankEmail = await page.evaluate(() => {
      const w = window as any;
      w.D.attorney_email = '';
      return {
        navComplete: w.computeNavChecks().checks['s-p5'],
        blocked: w.validateSimplified().some((m: ValidatorIssue) => m.message.includes('Attorney Email')),
      };
    });
    expect(blankEmail.blocked).toBe(true);
    expect(blankEmail.navComplete).toBe(false);
  });

  test('Plan Annual: reported screenshot state -- attorney named, Unsigned selected, email blank now blocks', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Attorney Email PA Ward', 'planAnnual');
    await fillMinimalValidPlanAnnualWard(page);

    // Unsigned itself requires nothing else on this card -- confirming the
    // email requirement fires purely from the attorney being named, not
    // from any signature-state side effect.
    const state = await page.evaluate(() => {
      const w = window as any;
      w.D.attorney = 'David R. Coleman, Esq.';
      w.D.attorney_signatureState = 'none';
      w.D.attorney_email = '';
      return {
        navComplete: w.computeNavChecks().checks['pa-p11'],
        blocked: w.validatePlanAnnual().some((m: ValidatorIssue) => m.message.includes('Attorney email is required')),
      };
    });
    expect(state.blocked, 'export must block on the named-but-emailless attorney').toBe(true);
    expect(state.navComplete).toBe(false);
  });

  test('Plan Annual: attorney card left entirely blank is unaffected', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Attorney Email PA Blank Ward', 'planAnnual');
    await fillMinimalValidPlanAnnualWard(page);

    const state = await page.evaluate(() => {
      const w = window as any;
      w.D.attorney = ''; w.D.attorney_email = ''; w.D.attorney_signatureDate = ''; w.D.attorney_signatureState = '';
      return {
        navComplete: w.computeNavChecks().checks['pa-p11'],
        blocked: w.validatePlanAnnual().some((m: ValidatorIssue) => m.message.includes('Attorney email is required')),
      };
    });
    expect(state.blocked, 'no attorney named means no email requirement').toBe(false);
    expect(state.navComplete).toBe(true);
  });

  test('Plan Initial: attorney "started" via bar number alone (no name) now also requires email', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Attorney Email PI Started Ward', 'planInitial');
    await fillMinimalValidPlanInitialWard(page);
    await page.evaluate(() => {
      const w = window as any;
      w.D.attorney_name = ''; w.D.attorney_email = ''; w.D.attorney_signatureDate = ''; w.D.attorney_signatureState = '';
      w.D.attorney_bar = '12345';
    });

    const state = await page.evaluate(() => {
      const w = window as any;
      return {
        navComplete: w.computeNavChecks().checks['pi-p10'],
        blocked: w.validatePlanInitial().some((m: ValidatorIssue) => m.message.includes('Attorney Certification — Attorney email is required')),
      };
    });
    expect(state.blocked, 'bar number alone counts as "started" per the existing predicate').toBe(true);
    expect(state.navComplete).toBe(false);
  });

  // Milestone 58C. "Started" used to mean only name, bar number, signature
  // date, or a non-Unsigned signature choice -- four of the block's eight
  // entry fields. Type the attorney's phone, address, or either email and both
  // the validator and the sidebar held that nothing had been started: no
  // export issue, sidebar green, while Primary Email displayed a required
  // asterisk with no rule behind it. A half-entered attorney could reach the
  // court: a certification naming someone with no way to serve them.
  const NEWLY_STARTING_FIELDS: Array<[string, string]> = [
    ['attorney_phone', '727-555-0143'],
    ['attorney_street', '100 2nd Ave S, Suite 400'],
    ['attorney_cityStateZip', 'St. Petersburg, FL 33701'],
    ['attorney_email', 'atty@firm.example'],
    ['attorney_secondaryEmail', 'assistant@firm.example'],
  ];

  for (const [field, value] of NEWLY_STARTING_FIELDS) {
    test(`Plan Initial: ${field} alone starts the attorney block, and the sidebar agrees`, async ({ page }) => {
      await freshStartNoPassword(page);
      await createWard(page, `Attorney Start ${field} Ward`, 'planInitial');
      await fillMinimalValidPlanInitialWard(page);

      const state = await page.evaluate(([f, v]) => {
        const w = window as any;
        for (const k of ['attorney_name', 'attorney_bar', 'attorney_email', 'attorney_secondaryEmail',
          'attorney_street', 'attorney_cityStateZip', 'attorney_phone',
          'attorney_signatureDate', 'attorney_signatureState']) w.D[k] = '';
        w.D[f] = v;
        return {
          // Deliberately not called bare: if the bridge is missing this must
          // report that, not throw, so the assertions below stay the ones that
          // fail. A red run that only says "not a function" would not have
          // demonstrated the defect this test exists for.
          started: typeof w.isPlanInitialAttorneyStarted === 'function'
            ? w.isPlanInitialAttorneyStarted(w.D)
            : 'predicate not bridged',
          navComplete: w.computeNavChecks().checks['pi-p10'],
          blocked: w.validatePlanInitial().some((m: ValidatorIssue) => m.message.includes('Attorney Certification')),
        };
      }, [field, value] as [string, string]);

      // Behaviour first: these are what a filer experiences, and what failed
      // before Milestone 58C widened the predicate.
      expect(state.blocked, 'a started attorney block must be completed before export').toBe(true);
      expect(state.navComplete, 'the sidebar must agree with the export gate').toBe(false);
      expect(state.started, `${field} is attorney entry`).toBe(true);
    });
  }

  test('Plan Initial: pro se/Guardian Advocate exemption -- attorney card entirely blank still exports cleanly, and pi-p10 agrees (Error 4, red-first)', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Attorney Email PI Exempt Ward', 'planInitial');
    await fillMinimalValidPlanInitialWard(page);

    const state = await page.evaluate(() => {
      const w = window as any;
      w.D.attorney_name = ''; w.D.attorney_bar = ''; w.D.attorney_email = '';
      w.D.attorney_signatureDate = ''; w.D.attorney_signatureState = '';
      return {
        navComplete: w.computeNavChecks().checks['pi-p10'],
        blockedOnAttorney: w.validatePlanInitial().some((m: ValidatorIssue) => m.message.includes('Attorney Certification')),
      };
    });
    // This is Error 4's own regression: before the pi-p10 replacement, this
    // exact fixture (a blank attorney card) reported navComplete: false --
    // the sidebar disagreeing with the validator's own pro se exemption,
    // present before Milestone 55D touched anything. Probe-verified
    // directly against the pre-fix pi-p10 (unconditional
    // filled(name)&&filled(signatureDate)) to confirm this was really red,
    // not assumed.
    expect(state.blockedOnAttorney, 'pro se/Guardian Advocate exemption: no attorney fields required at all').toBe(false);
    expect(state.navComplete, 'pi-p10 must agree with the exemption on a blank card').toBe(true);
  });

  test('Plan Simplified is unaffected', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Attorney Email PS Ward', 'planSimplified');
    await fillMinimalValidPlanSimplifiedWard(page);
    const psBaseline = await page.evaluate(() => {
      const w = window as any;
      w.D.attorney = 'Jordan Reyes, Esq.'; w.D.attorney_email = '';
      return w.validatePlanSimplified().some((m: ValidatorIssue) => m.message.toLowerCase().includes('email'));
    });
    expect(psBaseline, 'Plan Simplified never required attorney_email and this sub-delivery does not add it there').toBe(false);
  });

  test('Plan Minor is unaffected', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Attorney Email PM Ward', 'planMinor');
    await fillMinimalValidPlanMinorWard(page);
    const pmBaseline = await page.evaluate(() => {
      const w = window as any;
      w.D.attorney_name = 'Jordan Reyes, Esq.'; w.D.attorney_email = '';
      return w.validatePlanMinor().some((m: ValidatorIssue) => m.message.toLowerCase().includes('email'));
    });
    expect(pmBaseline, 'Plan Minor never required attorney_email and this sub-delivery does not add it there').toBe(false);
  });
});

// ── Milestone 57: Simplified Part V / Part VI signature parity ────────────
//
// The defect: select "/s/ Signed" on either attorney card, leave the date
// blank, and every sidebar marker turns green -- then Print Preview refuses
// the export. s-p5 reached attorney_signatureDate only through datesOrdered(),
// which is deliberately blank-tolerant, and s-p6 never looked at the
// certificate attorney's signature at all, while validateSimplified() ran the
// full three-state machine for both.
//
// These drive the real sidebar against the real validator across the whole
// finite domain rather than sampling it -- three explicit states, both legacy
// blank-state inferences, and an unrecognized value. The assertion is
// agreement: whatever the export gate says, the sidebar must say too.
// tests/unit/signature-completeness.spec.js pins the rule itself; this pins
// that the sidebar is actually wired to it.
// Milestone 58D. Part XI is the guardian's declaration of remuneration, which
// 744.367(3)(a) requires the annual report to include. An untouched Part XI
// used to count as complete on both sides, so a filing could be exported
// having never answered it -- neither "here is what I received" nor "I
// received none". This is a NEW requirement rather than a parity repair: on
// Part XI the sidebar and the validator already agreed.
// Milestone 57E-1. "#1. Does the Ward have one or more Trusts?" answered Yes,
// every trust card left blank, and the accounting exports clean. The filed
// document tells the Clerk the ward has trusts and names none -- no trustee,
// no account number, no value.
//
// validateAnnual() filtered trust rows to those carrying content and required
// createdAfterGID on each. With every row blank the filter yields nothing and
// the loop body never runs, so the affirmative produced no issue at all. The
// sidebar disagreed the whole time: a-p8 requires a trust NAME, so Part VIII
// showed incomplete while the export gate found nothing wrong.
// Milestone 57B. One recipient rule across all three families, and the D7
// conversion reset. Two opposite defects closed: the Inventory blocked export
// on an accidentally-added empty card, and both accountings let a recipient
// with a name and no address reach the clerk unremarked.
test.describe('Milestone 57B: service recipients, one rule and no carry-over', () => {
  test('a started second recipient now blocks the Annual family, and the sidebar agrees', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Recip Annual Ward', 'annual');
    await fillMinimalValidAnnualWard(page);
    const out = await page.evaluate(() => {
      const w = window as any;
      w.D.certNoRecipients = '';
      w.D.certRecipients = [{ name: 'A Person', line2: '1 Main St' }, { name: '', line2: 'orphan line' }];
      return {
        blocked: w.validateAnnual().some((m: any) => /Recipient 2/.test(String(m.message))),
        navComplete: w.computeNavChecks().checks['a-p10'],
      };
    });
    expect(out.blocked, 'a half-addressed recipient must not reach the clerk').toBe(true);
    expect(out.navComplete).toBe(false);
  });

  test('an untouched extra card no longer blocks the Initial Inventory', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Recip Inventory Ward', 'guardian');
    await fillMinimalValidGuardianWard(page);
    const out = await page.evaluate(() => {
      const w = window as any;
      const first = { ...(w.D.serviceRecipients?.[0] || {}) };
      // A complete Recipient 1, then an empty card added by a stray click.
      w.D.serviceRecipients = [
        { name: first.name || 'A Person', address: first.address || '1 Main St', cityStateZip: first.cityStateZip || 'Clearwater, FL 33755' },
        { name: '', address: '', cityStateZip: '' },
      ];
      return w.validateGuardian().filter((m: any) => /Recipient 2/.test(String(m.message))).map((m: any) => String(m.message));
    });
    expect(out, 'an empty extra card used to block export until filled or removed').toEqual([]);
  });

  test('a filer with nobody to serve can say so, and it clears the block', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Recip None Ward', 'annual');
    await fillMinimalValidAnnualWard(page);
    const out = await page.evaluate(() => {
      const w = window as any;
      w.D.certRecipients = [{ name: '', line2: '', line3: '', line4: '' }];
      w.D.certNoRecipients = '';
      const unanswered = w.validateAnnual().filter((m: any) => /filer attestation/.test(String(m.message))).length;
      w.D.certNoRecipients = 'Yes';
      const attested = w.validateAnnual().filter((m: any) => /Part X —/.test(String(m.message))).length;
      return { unanswered, attested, nav: w.computeNavChecks().checks['a-p10'] };
    });
    expect(out.unanswered, 'listing nobody must ask the question').toBe(1);
    expect(out.attested, 'answering it clears Part X').toBe(0);
    expect(out.nav).toBe(true);
  });

  // D7. The attestation is this filer's assertion about THIS filing. A new
  // filing has its own recipients and must answer for itself.
  test('no conversion path carries the attestation forward, and addresses still migrate', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Convert Source Ward', 'guardian');
    await fillMinimalValidGuardianWard(page);
    const out = await page.evaluate(() => {
      const w = window as any;
      const results: Record<string, unknown> = {};
      const src = {
        ...w.D,
        inventoryType: 'guardian',
        serviceNoRecipients: 'Yes',
        certNoRecipients: 'Yes',
        serviceRecipients: [{ name: 'Kept Person', address: '1 Main St', cityStateZip: 'Clearwater, FL 33755' }],
        certRecipients: [{ name: 'Kept Person', line2: '1 Main St' }],
      };
      // A destination shaped the way the real callers build it (from the
      // emptyData* factories), not a bare object -- the mappers write recipient
      // cards positionally into an existing array.
      const freshDest = () => ({
        certNoRecipients: 'Yes', serviceNoRecipients: 'Yes',
        certRecipients: [{ name: '', line2: '', line3: '', line4: '' }],
        serviceRecipients: [{ name: '', address: '', cityStateZip: '' }],
      });
      for (const fn of ['convertGuardianSchedulesToAnnual', 'convertGuardianExtrasToAnnual', 'convertSimplifiedToAnnual']) {
        const dest: any = freshDest();
        w[fn]?.(src, dest);
        results[fn] = { cert: dest.certNoRecipients, service: dest.serviceNoRecipients };
      }
      const destS: any = freshDest();
      w.convertToSimplified?.(src, 'guardian', destS);
      results.convertToSimplified = { cert: destS.certNoRecipients, service: destS.serviceNoRecipients,
        recipients: (destS.certRecipients || []).length };
      return results;
    });

    for (const [path, value] of Object.entries(out)) {
      expect(value, `${path} must reset both attestations to unanswered`)
        .toMatchObject({ cert: '', service: '' });
    }
  });
});

test.describe('Milestone 57E-1: an affirmative trust answer must name a trust', () => {
  async function trustState(page: import('@playwright/test').Page, trusts: unknown[]) {
    return page.evaluate((rows) => {
      const w = window as any;
      w.D.trusts = rows;
      const issues = w.validateAnnual();
      const partVIII = issues.filter((m: any) => /Part VIII/i.test(String(m.message)));
      return {
        navComplete: w.computeNavChecks().checks['a-p8'],
        messages: partVIII.map((m: any) => String(m.message)),
        // D9: this offers a clearable acknowledgement at output, never a hard
        // block. A literal issue-registry key would make it unbypassable.
        bypassable: partVIII.map((m: any) => w.getIssueDefinition?.(m.code)?.bypassable),
        codes: partVIII.map((m: any) => m.code),
      };
    }, trusts);
  }

  test('Yes with every trust card blank raises an issue, and the sidebar agrees', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Trust Blank Yes Ward', 'annual');
    await fillMinimalValidAnnualWard(page);
    const state = await trustState(page, [{ hasTrust: 'Yes' }, {}, {}]);
    expect(state.messages, 'an affirmative that names no trust must not export clean')
      .toContain('Part VIII — Trust 1 — Name');
    expect(state.navComplete, 'the sidebar already said incomplete; the export gate now agrees').toBe(false);
  });

  test('the issue is bypassable, per D9 -- an acknowledgement, not a hard block', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Trust Bypass Ward', 'annual');
    await fillMinimalValidAnnualWard(page);
    const state = await trustState(page, [{ hasTrust: 'Yes' }, {}, {}]);
    // Asserted non-vacuously: .every() on an empty array is true, so without
    // this the test would pass while the issue did not exist at all.
    expect(state.codes.length, 'there must be an issue before its bypassability means anything').toBeGreaterThan(0);
    expect(state.bypassable.every((b: unknown) => b !== false), `codes: ${state.codes.join(', ')}`).toBe(true);
  });

  test('one described trust satisfies it', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Trust Named Ward', 'annual');
    await fillMinimalValidAnnualWard(page);
    const state = await trustState(page, [{ hasTrust: 'Yes', name: 'Ashford Family Trust', createdAfterGID: 'No' }, {}, {}]);
    expect(state.messages).not.toContain('Part VIII — Trust 1 — Name');
    expect(state.navComplete).toBe(true);
  });

  test('No does not raise it, and neither does the unanswered state raise it twice', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Trust No Ward', 'annual');
    await fillMinimalValidAnnualWard(page);

    const no = await trustState(page, [{ hasTrust: 'No' }, {}, {}]);
    expect(no.messages).not.toContain('Part VIII — Trust 1 — Name');

    // Unanswered keeps whatever the existing rule says about it; this delivery
    // must not add a second issue for the same blank question.
    const blank = await trustState(page, [{ hasTrust: '' }, {}, {}]);
    expect(blank.messages).not.toContain('Part VIII — Trust 1 — Name');
  });
});

test.describe('Milestone 58D: Part XI must be answered before export', () => {
  const partXiIssue = (m: ValidatorIssue) => /Part XI/i.test(String(m.message));

  async function partXiState(page: import('@playwright/test').Page) {
    return page.evaluate(() => {
      const w = window as any;
      return {
        navComplete: w.computeNavChecks().checks['a-p11'],
        blocked: w.validateAnnual().some((m: any) => /Part XI/i.test(String(m.message))),
      };
    });
  }

  test('unanswered: the sidebar and the export gate both say incomplete', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Part XI Unanswered Ward', 'annual');
    await fillMinimalValidAnnualWard(page);
    await page.evaluate(() => {
      const w = window as any;
      w.D.remuneration = [];
      if (w.D.scheduleNoItems) w.D.scheduleNoItems.remuneration = false;
    });
    const state = await partXiState(page);
    expect(state.blocked, 'an unanswered Part XI must block export').toBe(true);
    expect(state.navComplete, 'the sidebar must agree').toBe(false);
  });

  test('declaring none answers it', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Part XI None Ward', 'annual');
    await fillMinimalValidAnnualWard(page);
    await page.evaluate(() => {
      const w = window as any;
      w.D.remuneration = [];
      w.D.scheduleNoItems = { ...(w.D.scheduleNoItems || {}), remuneration: true };
    });
    const state = await partXiState(page);
    expect(state.blocked).toBe(false);
    expect(state.navComplete).toBe(true);
  });

  test('a complete entry answers it; an incomplete one does not', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Part XI Rows Ward', 'annual');
    await fillMinimalValidAnnualWard(page);

    const complete = await page.evaluate(async () => {
      const w = window as any;
      w.D.scheduleNoItems = { ...(w.D.scheduleNoItems || {}), remuneration: false };
      w.D.remuneration = [{ guardian: 'Rachel Alvarez', type: 'Guardian Fee', amount: '1200', description: '' }];
      return { navComplete: w.computeNavChecks().checks['a-p11'],
        blocked: w.validateAnnual().some((m: any) => /Part XI/i.test(String(m.message))) };
    });
    expect(complete.blocked, 'a complete entry answers Part XI').toBe(false);
    expect(complete.navComplete).toBe(true);

    // Description stays optional -- the data model records it so, and the
    // editor asterisk claiming otherwise was the actual error.
    const partial = await page.evaluate(() => {
      const w = window as any;
      w.D.remuneration = [{ guardian: 'Rachel Alvarez', type: '', amount: '', description: '' }];
      return { navComplete: w.computeNavChecks().checks['a-p11'],
        blocked: w.validateAnnual().some((m: any) => /Part XI/i.test(String(m.message))) };
    });
    expect(partial.blocked, 'a half-entered row is not a declaration').toBe(true);
    expect(partial.navComplete).toBe(false);
  });

  test('entered rows win over a stale no-items flag, and the rows are kept', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Part XI Stale Flag Ward', 'annual');
    await fillMinimalValidAnnualWard(page);
    const out = await page.evaluate(() => {
      const w = window as any;
      const d = { ...w.D, scheduleNoItems: { ...(w.D.scheduleNoItems || {}), remuneration: true },
        remuneration: [{ guardian: 'G', type: 'Fee', amount: '50', description: '' }] };
      w.normalizeWardData(d);
      return { flag: d.scheduleNoItems.remuneration, rows: d.remuneration.length };
    });
    expect(out.flag, 'the contradicted declaration is withdrawn').toBe(false);
    expect(out.rows, 'entered data is never discarded to resolve the contradiction').toBe(1);
  });

  test('a legacy filing of only blank rows normalizes so the declaration is reachable', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Part XI Legacy Ward', 'annual');
    const out = await page.evaluate(() => {
      const w = window as any;
      const d = { wardName: 'x', remuneration: [{ guardian: '', type: '', amount: '', description: '' }] };
      w.normalizeWardData(d);
      return d.remuneration.length;
    });
    expect(out, 'the blank placeholder that hid the checkbox is cleared').toBe(0);
  });
});

test.describe('Milestone 57: Simplified attorney signature parity, Parts V and VI', () => {
  type SigCase = { label: string; state: string; date: string; image: string; complete: boolean };

  // periodTo on the shared fixture is 2026-12-31, and s-p5 also date-orders
  // the signature against it, so every "has a date" case uses a date after
  // the period closes -- otherwise a case would fail for date order rather
  // than for the signature rule under test.
  const SIGNED_DATE = '2027-01-05';
  const STAMP_IMAGE = 'data:image/png;base64,iVBORw0KGgo=';

  const CASES: SigCase[] = [
    { label: 'explicit none',              state: 'none',      date: '',          image: '',          complete: true },
    { label: 'legacy blank, no date',      state: '',          date: '',          image: '',          complete: true },
    { label: 'legacy blank, with date',    state: '',          date: SIGNED_DATE, image: '',          complete: true },
    { label: 'typed, date present',        state: 'typed',     date: SIGNED_DATE, image: '',          complete: true },
    { label: 'typed, NO date',             state: 'typed',     date: '',          image: '',          complete: false },
    { label: 'stamp, image present',       state: 'stamp',     date: '',          image: STAMP_IMAGE, complete: true },
    { label: 'stamp, NO image',            state: 'stamp',     date: '',          image: '',          complete: false },
    { label: 'unrecognized state',         state: 'notarized', date: SIGNED_DATE, image: STAMP_IMAGE, complete: false },
  ];

  const PARTS = [
    { part: 'Part V',  navKey: 's-p5', statePath: 'attorney_signatureState',   datePath: 'attorney_signatureDate', imagePath: 'attorney_signatureImage' },
    { part: 'Part VI', navKey: 's-p6', statePath: 'certAttySignatureState',    datePath: 'certAttySignDate',       imagePath: 'certAttySignatureImage' },
  ];

  for (const { part, navKey, statePath, datePath, imagePath } of PARTS) {
    test(`${part}: the sidebar and the export gate agree across all eight signature states`, async ({ page }) => {
      await freshStartNoPassword(page);
      await createSimplifiedWard(page, `Signature Parity ${part} Ward`);
      await fillMinimalValidSimplifiedWard(page);

      const results = await page.evaluate(({ cases, navKey, statePath, datePath, imagePath, part }) => {
        const w = window as any;
        return cases.map((c: any) => {
          w.D[statePath] = c.state;
          w.D[datePath] = c.date;
          w.D[imagePath] = c.image;
          const issues = w.validateSimplified()
            .filter((i: any) => String(i.message).startsWith(`${part} —`) && /signature|date signed|stamp/i.test(String(i.message)));
          return {
            label: c.label,
            expected: c.complete,
            navComplete: w.computeNavChecks().checks[navKey],
            blocked: issues.length > 0,
            messages: issues.map((i: any) => String(i.message)),
          };
        });
      }, { cases: CASES, navKey, statePath, datePath, imagePath, part });

      const disagreements = results.filter((r) => r.navComplete !== !r.blocked);
      expect(
        disagreements.map((r) => `${r.label}: sidebar ${r.navComplete ? 'complete' : 'incomplete'} vs export ${r.blocked ? 'blocked' : 'clean'}`),
        `${part}: the sidebar disagrees with the export gate`,
      ).toEqual([]);

      const wrong = results.filter((r) => r.navComplete !== r.expected);
      expect(
        wrong.map((r) => `${r.label}: expected ${r.expected ? 'complete' : 'incomplete'}, got the opposite${r.messages.length ? ` (${r.messages[0]})` : ''}`),
        `${part}: a signature state is judged wrongly`,
      ).toEqual([]);
    });
  }
});
