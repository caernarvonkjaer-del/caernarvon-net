import { test, expect, type Page } from '@playwright/test';
import { freshStartNoPassword, createWard, createSimplifiedWard } from './support/target';

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
      w.D.guardians.push({ name: 'Guardian Two', signatureDate: '', ssnEin: '987-65-4321', phone: '555-333-4444', streetAddress: '2 Oak St', cityStateZip: 'Tampa, FL 33602' });
    });
    await page.evaluate(() => (window as any).navigate('/d1'));

    const targetPath = await page.evaluate(() => {
      const raw = (window as any).validateGuardian();
      const structured = (window as any).adaptValidationErrors(raw, 'guardian');
      return structured.find((e: any) => e.section === 'D-1 Guardian #2' && e.label.includes('Signature Date'))?.path;
    });
    expect(targetPath).toBe('guardians.1.signatureDate');

    await page.evaluate((p) => (window as any).focusFieldByPath('/d1', p), targetPath);
    await expect(page.locator(`[data-bind="${targetPath}"]`)).toBeFocused();
  });

  test('D-2 Preparer and Attorney fields resolve to distinct targets despite sharing bare labels', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Guardian D-2 Ward', 'guardian');
    await page.evaluate(() => (window as any).navigate('/d2'));

    const paths = await page.evaluate(() => {
      const raw = (window as any).validateGuardian();
      const structured = (window as any).adaptValidationErrors(raw, 'guardian');
      return {
        preparerDate: structured.find((e: any) => e.section === 'D-2 Preparer' && e.label === 'Date is required.')?.path,
        attorneySignatureDate: structured.find((e: any) => e.section === 'D-2 Attorney' && e.label === 'Signature Date is required.')?.path,
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
    expect(sdbPath).toBe('sdb-yes');
    await page.evaluate((p) => (window as any).focusFieldByPath('/d3', p), sdbPath);
    await expect(page.locator(`#${sdbPath}`)).toBeFocused();

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
      (window as any).D.serviceRecipients = [{ name: '', address: '', cityStateZip: '' }];
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
    // validation panel validationPanel() renders alongside it.
    const panelText = await page.locator('.validation-panel .validation-title').innerText();
    const match = panelText.match(/(\d+)\s+required field/);
    expect(match, `validation panel did not report a required-field count: "${panelText}"`).not.toBeNull();
    const expectedCount = Number(match![1]);
    expect(expectedCount).toBeGreaterThan(0);

    const dialogPromise = page.waitForEvent('dialog');
    const triggerPromise = page.locator('[data-inventory-action="save-pdf"]').evaluate((button: HTMLButtonElement) => {
      button.disabled = false;
      button.click();
    });
    const dialog = await dialogPromise;
    const alertMessage = dialog.message();
    await dialog.accept();
    await triggerPromise;

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
    await page.evaluate(() => {
      const w = window as any;
      w.D.guardians = [
        { name: 'Guardian One', signatureDate: '01/01/2024', ssn: '123-45-6789', phone: '555-111-2222', mailingStreet: '1 Main St', mailingCityStateZip: 'Tampa, FL 33601' },
        { name: 'Guardian Two', signatureDate: '', ssn: '987-65-4321', phone: '555-333-4444', mailingStreet: '2 Oak St', mailingCityStateZip: 'Tampa, FL 33602' },
      ];
    });
    await page.evaluate(() => (window as any).navigate('/p3'));

    const targetPath = await page.evaluate(() => {
      const raw = (window as any).validateAnnual();
      const structured = (window as any).adaptValidationErrors(raw, 'annual');
      return structured.find((e: any) => e.section === 'Part III' && e.label.includes('Guardian #2') && e.label.includes('Signature Date'))?.path;
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

    const paths = await page.evaluate(() => {
      const raw = (window as any).validatePlanMinor();
      const structured = (window as any).adaptValidationErrors(raw, 'planMinor');
      return {
        preparerName: structured.find((e: any) => e.section === 'Preparer & Attorney' && e.label.includes('Preparer name'))?.path,
        attorneyName: structured.find((e: any) => e.section === 'Preparer & Attorney' && e.label.includes('Attorney name'))?.path,
        attorneySignatureDate: structured.find((e: any) => e.section === 'Preparer & Attorney' && e.label.includes('Attorney signature date'))?.path,
      };
    });
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
