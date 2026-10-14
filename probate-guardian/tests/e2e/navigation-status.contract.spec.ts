import { test, expect, type Page } from '@playwright/test';
import { freshStartNoPassword, createWard, createSimplifiedWard, acceptDynDialog, dismissScheduleDocPrompt } from './support/target';

// Milestone 33, Phase 2.3 -- Migration Sequence step 2 ("shared navigation/
// status pilot ... then migrate Guardian, Simplified, and Annual only after
// parity is demonstrated"). The Plan-family pilot proved the shape; Annual,
// Simplified, and Annual's finalAccounting/trustAccounting formEngine()
// aliases now share the same config-driven test loop (their architecture
// matches the Plan types closely enough to reuse it verbatim).
// Guardian does NOT reuse this loop -- its Next-button gate covers only the
// 11 numbered schedule pages. Cover and D1-D5 are marked, counted and (since
// Milestone 63A) EXPLAINED when incomplete, but never block Next (decision D1);
// Print is unmarked. A page-level walk of that rule lives in
// section-guidance-invariant.spec.ts. A brand-new schedule has 0 rows so no per-field jump link exists
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
  // Delivery 1M: the jump-focus case runs for one type per field convention.
  jumpFocus?: boolean;
};

/**
 * Follows a jump link to `path` on `route` the way every guidance box and
 * Print Preview link does: a jump-to-field control, clicked, reaches the app's
 * own delegate (form-events.js), which navigates and focuses the field.
 * (Milestone 70, 70T: these tests called focusFieldByPath() directly.)
 */
async function followJumpLink(page: Page, route: string, path: string) {
  await page.evaluate(([r, fieldPath]) => {
    const link = document.createElement('button');
    link.type = 'button';
    link.dataset.formAction = 'jump-to-field';
    link.dataset.route = r;
    link.dataset.jumpPath = fieldPath;
    document.body.append(link);
    link.click();
    link.remove();
  }, [route, path] as [string, string]);
}

const CONFIGS: NavStatusConfig[] = [
  {
    featureName: 'Annual',
    filingType: 'annual',
    validateFnName: 'validateAnnual',
    jumpTestFieldPath: 'caseNumber',
    jumpFocus: true, // the Annual family's data-annual-path fields
    // 'Part II — Starting Balance', guaranteed blank on a fresh ward.
    nonCoverRoute: '/p2',
    // No bare window.doSavePdf global exists -- the real handler is a
    // closure-private _printModule.doSavePdf(), reachable only through the
    // delegated click handler, same as annual-mount.spec.ts's own
    // blocked-export test.
    triggerBlockedExport: (page) => page.locator('[data-annual-action="save-pdf"]').click(),
  },
  // finalAccounting/trustAccounting are formEngine()==='annual' aliases --
  // same module, same validateAnnual(), same rendered print.js markup, just
  // different displayed legal copy -- and ran every case here until
  // TEST-REVIEW.md Delivery 1M (2026-10-13). annual-mount.spec.ts's alias
  // cases and output-semantics.artifact.spec.ts keep their legal copy and
  // identity under test; the nav gate they once bypassed is one code path.
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
    triggerBlockedExport: (page) => page.locator('[data-simplified-action="save-pdf"]').click(),
  },
  {
    featureName: 'Plan Annual',
    filingType: 'planAnnual',
    validateFnName: 'validatePlanAnnual',
    jumpTestFieldPath: 'caseNumber',
    jumpFocus: true, // the data-form-path fields the Simplified and the Plans share (src/core/form/field-html.js)
    nonCoverRoute: '/p2',
    triggerBlockedExport: (page) => page.evaluate(() => (window as any).GuardianForms.testing.saveOutput.pdfPlanAnnual()),
  },
  {
    featureName: 'Plan Initial',
    filingType: 'planInitial',
    validateFnName: 'validatePlanInitial',
    jumpTestFieldPath: 'caseNumber',
    nonCoverRoute: '/p2',
    triggerBlockedExport: (page) => page.evaluate(() => (window as any).GuardianForms.testing.saveOutput.pdfPlanInitial()),
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
    triggerBlockedExport: (page) => page.evaluate(() => (window as any).GuardianForms.testing.saveOutput.pdfPlanMinor()),
  },
  {
    featureName: 'Plan Simplified',
    filingType: 'planSimplified',
    validateFnName: 'validatePlanSimplified',
    jumpTestFieldPath: 'caseNumber',
    nonCoverRoute: '/p2',
    // Milestone 74C: a real click, as on every form -- the button is
    // clickable on an incomplete filing and the click says why.
    triggerBlockedExport: (page) => page.locator('[data-plan-simplified-action="save-pdf"]').click(),
  },
];

for (const { featureName, filingType, validateFnName, jumpTestFieldPath, nonCoverRoute, createFiling, triggerBlockedExport, jumpFocus } of CONFIGS) {
  const makeFiling = (page: Page, name: string) => (createFiling ? createFiling(page, name) : createWard(page, name, filingType));

  test.describe(`${featureName} navigation/status contract`, () => {
    test('disabled Next guidance on the blank Cover page lists every missing item, from the same validator Print Preview uses', async ({ page }) => {
      await freshStartNoPassword(page);
      await makeFiling(page, `${featureName} Nav Guidance Ward`);
      await page.evaluate(() => (window as any).GuardianForms.testing.navigate('/'));

      await expect(page.locator('#page-next-btn')).toBeDisabled();
      const guidance = page.locator('#page-local-guidance');
      await expect(guidance).toBeVisible();

      // adaptValidationErrors() is the same function renderLocalSectionGuidance()
      // calls internally to group errors onto routes -- reusing it here (rather
      // than re-deriving route/section logic in the test) means this asserts
      // against the real production grouping, not a parallel guess at it.
      const expectedCoverCount = await page.evaluate(async () => {
        const structured = await (window as any).GuardianForms.testing.validate.structured(); // this filing's own validator, adapted
        return structured.filter((e: any) => e.route === '/').length;
      });
      expect(expectedCoverCount).toBeGreaterThan(0);

      await expect(guidance.locator('[data-form-action="jump-to-field"]')).toHaveCount(expectedCoverCount);
    });

    // Two field conventions carry focus (data-annual-path, data-form-path);
    // one case each since Delivery 1M, where every type ran it.
    if (jumpFocus) test('a jump link moves focus to the field it names', async ({ page }) => {
      await freshStartNoPassword(page);
      await makeFiling(page, `${featureName} Jump Link Ward`);
      await page.evaluate(() => (window as any).GuardianForms.testing.navigate('/'));

      const jumpLink = page.locator(`#page-local-guidance [data-form-action="jump-to-field"][data-field-path="${jumpTestFieldPath}"]`);
      await expect(jumpLink).toBeVisible();
      await jumpLink.click();

      await expect(page.locator(`[data-form-path="${jumpTestFieldPath}"]`)).toBeFocused();
    });

    // 'guidance identifies a missing field while already on its own page, not
    // bucketed onto Cover' ran here per type until Delivery 1M:
    // tests/unit/section-status.spec.js and validation-adapter.spec.js pin
    // the section-to-route resolution, and section-guidance-invariant.spec.ts
    // walks every incomplete page of seven types for a box that lists
    // something to jump to.

    test('Print Preview banner and the blocked-export alert agree on how many issues remain', async ({ page }) => {
      await freshStartNoPassword(page);
      await makeFiling(page, `${featureName} Export Gate Parity Ward`);
      await page.evaluate(() => (window as any).GuardianForms.testing.navigate('/print'));

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
    await page.evaluate(() => (window as any).GuardianForms.testing.navigate('/a1'));

    // blocksNext() (core/status/section-guidance-policy.js) gates only the 11
    // numbered schedule pages -- Cover/D1-D5 are explained but never block Next
    // (Milestone 63A, D1), and Print is unmarked. A brand-new schedule has 0 rows, so the page's
    // only item here is the schedule's own question -- an entry, or the "none
    // apply" tick (a prompt since Milestone 73F part 3, 73F-4) -- whose jump
    // link has no real field target (the checkbox carries no data-bind/id). A
    // row must exist before any per-field jump link with a real focusable
    // target appears.
    await expect(page.locator('#page-next-btn')).toBeDisabled();
    await page.locator('[data-inventory-action="add-entry"][data-schedule="a1"]').click();
    await dismissScheduleDocPrompt(page); // Milestone 57C-R advisory modal

    // The page lists its blockers and its own questions (Milestone 73F part
    // 2); a row nobody has typed in is no entry, so A-1 still asks for one
    // (73F part 3), as an Annual schedule does.
    const expectedCount = await page.evaluate(async () => {
      const t = (window as any).GuardianForms.testing;
      const structured = await t.validate.structured();
      const prompts = t.validate.evaluate().prompts || [];
      return structured.filter((e: any) => e.route === '/a1').length + prompts.filter((p: any) => p.route === '/a1').length;
    });
    expect(expectedCount).toBeGreaterThan(0);

    const guidance = page.locator('#page-local-guidance');
    await expect(guidance).toBeVisible();
    const jumpLinks = guidance.locator('[data-form-action="jump-to-field"]');
    await expect(jumpLinks).toHaveCount(expectedCount);

    // Guardian's own field markup never emits data-form-path (only the
    // shared Plan-type field builder, src/core/form/field-html.js, does) -- the jump
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

  // Typing in a box and then pressing one of the list's links writes the box
  // as the cursor leaves it, and the write changes the list. The list used to
  // be redrawn between the press and the release, replacing the link pressed:
  // the click did nothing. It now waits for the click (nav-marks.js).
  test('a link in the list of what the page needs works on the first click, straight from a box just typed in', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Guardian Nav Guidance Ward', 'guardian');
    await page.evaluate(() => (window as any).GuardianForms.testing.navigate('/a1'));
    await page.locator('[data-inventory-action="add-entry"][data-schedule="a1"]').click();
    await dismissScheduleDocPrompt(page);

    const typed = page.locator('[data-bind="scheduleA1.0.propertyDescription"]');
    await typed.click();
    await typed.pressSequentially('Single Family Home');
    const other = page.locator('#page-local-guidance [data-form-action="jump-to-field"]:not([data-field-path="scheduleA1.0.propertyDescription"])').first();
    const otherPath = await other.getAttribute('data-field-path');
    expect(otherPath).toBeTruthy();
    await other.click();
    await expect(page.locator(`[data-bind="${otherPath}"]`)).toBeFocused();
    expect(await page.evaluate(() => (window as any).GuardianForms.testing.field('scheduleA1.0.propertyDescription'))).toBe('Single Family Home');
  });

  // Milestone 33, Item 3 (sub-phase 3a): Schedules B-2 through C-5 share the
  // exact same "row + dot-path" shape A-1/A-2/B-1 already proved above. All
  // eight ran this loop until TEST-REVIEW.md Delivery 1M (2026-10-13): one
  // of each letter stays, and validation-structured-paths.spec.ts proves
  // every issue of every schedule carries a path. B-2's own vehicle-field ID
  // exception gets its own dedicated test right after this loop.
  const ROW_SCHEDULES: { key: string; route: string }[] = [
    { key: 'b3', route: '/b3' },
    { key: 'c4', route: '/c4' },
  ];
  for (const { key, route } of ROW_SCHEDULES) {
    test(`disabled Next guidance on Schedule ${key.toUpperCase()} identifies every missing item once a row exists`, async ({ page }) => {
      await freshStartNoPassword(page);
      await createWard(page, `Guardian ${key.toUpperCase()} Guidance Ward`, 'guardian');
      await page.evaluate((r) => (window as any).GuardianForms.testing.navigate(r), route);
      await page.locator(`[data-inventory-action="add-entry"][data-schedule="${key}"]`).click();
      await dismissScheduleDocPrompt(page); // Milestone 57C-R advisory modal

      // Its blockers and its own question, as on A-1 above (73F part 3).
      const expectedCount = await page.evaluate(async (r) => {
        const t = (window as any).GuardianForms.testing;
        const structured = await t.validate.structured();
        const prompts = t.validate.evaluate().prompts || [];
        return structured.filter((e: any) => e.route === r).length + prompts.filter((p: any) => p.route === r).length;
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
    await page.evaluate(() => (window as any).GuardianForms.testing.navigate('/b2'));
    await page.locator('[data-inventory-action="add-entry"][data-schedule="b2"]').click();
    // renderB2Fields() renders Year/Make/Model/VIN/Odometer as raw inputs
    // with no data-bind at all once a row is marked a vehicle -- their only
    // focusable selector is the input's own literal id.
    await page.locator('[data-inventory-change="toggle-vehicle"][data-index="0"]').check();
    // Milestone 57C-R advisory modal. Since 73L it waits for an entry: the
    // vehicle tick makes the row one, so it opens here, not after "+ Add"
    // (a jump waits behind an open dialog, validation-adapter.js).
    await dismissScheduleDocPrompt(page);

    const yearPath = await page.evaluate(async () => {
      const structured = await (window as any).GuardianForms.testing.validate.structured();
      return structured.find((e: any) => e.route === '/b2' && e.label === 'Year')?.path;
    });
    expect(yearPath).toBe('b2-vehicle-year-0');
    await followJumpLink(page, '/b2', yearPath);
    await expect(page.locator(`#${yearPath}`)).toBeFocused();
  });

  // Until Milestone 63A the Guardian D-1..D-5 pages were never explained
  // (#page-local-guidance was drawn only for gated pages), so there was no
  // on-page UI surface to click through here and these tests drove the two
  // functions directly. Since 63A the box renders on those pages -- the
  // page-level behaviour is proved in bond-depository.spec.ts (D-4's
  // reporter case, since Milestone 67B) and section-guidance-invariant.spec.ts
  // -- but the path
  // derivation is still worth proving in isolation: adaptValidationErrors() and
  // focusFieldByPath() are the two functions a jump link uses, and the bugs
  // recorded here (D-1's hardcoded guardian-#1 fallback; D-2's Preparer/Attorney
  // fields resolving to nothing) live entirely inside them.
  test('D-1 Guardian #2 signature jump link targets guardian #2, not guardian #1 (regression)', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Guardian D-1 Co-Guardian Ward', 'guardian');
    await page.evaluate(() => {
      const w = window as any;
      w.GuardianForms.testing.patchFiling({ 'guardians.0': { name: 'Guardian One', signatureDate: '01/01/2024', ssnEin: '123-45-6789', phone: '555-111-2222', streetAddress: '1 Main St', cityStateZip: 'Tampa, FL 33601' } });
      // Milestone 73A: a guardian's saved "/s/" is asked again (a guardian
      // signs by hand or by stamp), which gives Guardian #2 a real, findable
      // signature issue for this test to target.
      w.GuardianForms.testing.patchFiling({ guardians: [...w.GuardianForms.testing.field('guardians'), { name: 'Guardian Two', signatureDate: '', signatureState: 'typed', ssnEin: '987-65-4321', phone: '555-333-4444', streetAddress: '2 Oak St', cityStateZip: 'Tampa, FL 33602' }] });
    });
    await page.evaluate(() => (window as any).GuardianForms.testing.navigate('/d1'));

    const targetPath = await page.evaluate(async () => {
      const structured = await (window as any).GuardianForms.testing.validate.structured();
      return structured.find((e: any) => e.section === 'D-1 Guardian #2' && e.label.includes('choose Unsigned'))?.path;
    });
    expect(targetPath).toBe('guardians.1.signatureState');

    await followJumpLink(page, '/d1', targetPath);
    // The first of Guardian #2's own choices (Unsigned), not Guardian #1's.
    await expect(page.locator('#sigstate_guardians_1_none')).toBeFocused();
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
      w.GuardianForms.testing.patchFiling({ 'preparer.signatureState': 'typed' });
      w.GuardianForms.testing.patchFiling({ 'attorney.signatureState': 'typed' });
    });
    await page.evaluate(() => (window as any).GuardianForms.testing.navigate('/d2'));

    const paths = await page.evaluate(async () => {
      const structured = await (window as any).GuardianForms.testing.validate.structured();
      return {
        preparerDate: structured.find((e: any) => e.section === 'D-2 Preparer' && e.label.includes('date signed'))?.path,
        attorneySignatureDate: structured.find((e: any) => e.section === 'D-2 Attorney' && e.label.includes('date signed'))?.path,
        attorneyFilingDate: structured.find((e: any) => e.section === 'D-2 Attorney' && e.label === 'Filing Date is required.')?.path,
      };
    });
    expect(paths.preparerDate).toBe('preparer.signatureDate');
    expect(paths.attorneySignatureDate).toBe('attorney.signatureDate');
    expect(paths.attorneyFilingDate).toBe('attorney.filingDate');

    await followJumpLink(page, '/d2', paths.attorneyFilingDate);
    await expect(page.locator(`[data-bind="${paths.attorneyFilingDate}"]`)).toBeFocused();
  });

  test('D-3 Safe Deposit Box radios and D-4 Bond fields resolve real, distinct targets', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Guardian D-3-D-4 Ward', 'guardian');
    await page.evaluate(() => (window as any).GuardianForms.testing.navigate('/d3'));

    // D-3's two questions are mutually exclusive at any one time (the second
    // only applies once the first is answered Yes) -- a fresh ward hits the
    // first, unanswered-question branch.
    const sdbPath = await page.evaluate(async () => {
      const structured = await (window as any).GuardianForms.testing.validate.structured();
      return structured.find((e: any) => e.section === 'D-3')?.path;
    });
    // Milestone 38E migrated D-3 off its hand-rolled sdb-yes/sdb-no radio ids
    // onto the shared yesNoRadioHTML() component, keyed by the real data
    // path -- both the Yes and No inputs now share data-form-path
    // "hasSafeDepositBox" rather than each having their own element id, so
    // focusFieldByPath() (which queries by data-form-path/data-bind/id, not
    // id alone) lands on whichever renders first in the DOM (Yes).
    expect(sdbPath).toBe('hasSafeDepositBox');
    await followJumpLink(page, '/d3', sdbPath);
    await expect(page.locator(`[data-form-path="${sdbPath}"]`).first()).toBeFocused();

    // Milestone 67B: D-4's bond fields no longer raise validator issues (nothing
    // in the bond block gates export), so their paths are exercised through
    // the jump-to-field helper directly rather than through an issue.
    await page.evaluate(() => (window as any).GuardianForms.testing.navigate('/d4'));
    await page.evaluate(() => { (window as any).GuardianForms.testing.patchFiling({ 'bondDepositoryState': 'bond-only' }); (window as any).GuardianForms.testing.navigate('/d4'); });
    await followJumpLink(page, '/d4', 'bondingCompany');
    await expect(page.locator('[data-bind="bondingCompany"]')).toBeFocused();
  });

  // Milestone 72H: D-5 no longer asks for the attorney's name -- the
  // certificate's attorney is D-2's, and D-2 asks; its issue resolves there.
  test('D-5 resolves its distinct shapes: bare service date and recipient rows; the attorney is asked on D-2', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Guardian D-5 Ward', 'guardian');
    await page.evaluate(() => {
      // Milestone 57B: a STARTED recipient row, not a blank one. Under D16 a
      // wholly blank recipient list means the filer has listed nobody, which
      // now raises the attestation ("no recipients are required...") instead
      // of demanding Recipient 1's fields — so a blank row no longer produces
      // a "D-5 Recipient 1 — Name" issue for this test to resolve. Starting
      // the row is what makes it owed, which is the shape being tested here.
      (window as any).GuardianForms.testing.patchFiling({ 'serviceRecipients': [{ name: '', line2: '100 2nd Ave S', line3: '' }] });
      // Milestone 71B: attorney fields raise issues only once an attorney is
      // started, so start one -- the paths under test are the attorney issues'.
      (window as any).GuardianForms.testing.patchFiling({ 'attorneyForGuardian': 'Sample Attorney' });
    });
    await page.evaluate(() => (window as any).GuardianForms.testing.navigate('/d5'));

    const paths = await page.evaluate(async () => {
      const structured = await (window as any).GuardianForms.testing.validate.structured();
      return {
        serviceDate: structured.find((e: any) => e.section === 'D-5')?.path,
        recipientName: structured.find((e: any) => e.section === 'D-5 Recipient 1' && e.label === 'Name')?.path,
        attorneyName: structured.find((e: any) => e.section === 'D-5 Attorney' && e.label === 'Name')?.path,
        d2AttorneyName: structured.find((e: any) => e.section === 'D-2 Attorney' && e.label === 'Name')?.path,
      };
    });
    expect(paths.serviceDate).toBe('serviceDate');
    expect(paths.recipientName).toBe('serviceRecipients.0.name');
    expect(paths.attorneyName, 'D-5 asks for no attorney name (72H)').toBeUndefined();
    expect(paths.d2AttorneyName).toBe('attorney.name');

    await followJumpLink(page, '/d5', paths.recipientName);
    await expect(page.locator(`[data-bind="${paths.recipientName}"]`)).toBeFocused();
  });

  test('Print Preview panel and the blocked-export alert agree on how many issues remain', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Guardian Export Gate Parity Ward', 'guardian');
    await page.evaluate(() => (window as any).GuardianForms.testing.navigate('/print'));

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

    await page.locator('[data-inventory-action="save-pdf"]').click();
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
  test('Part III co-guardian #2 signature targets guardian #2, not guardian #1 (regression)', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Annual Co-Guardian Ward', 'annual');
    // Milestone 73A: a guardian's saved "/s/" is asked again (a guardian
    // signs by hand or by stamp), which gives Guardian #2 a real, findable
    // signature issue for this test to target.
    await page.evaluate(() => {
      const w = window as any;
      w.GuardianForms.testing.patchFiling({ 'guardians': [
        { name: 'Guardian One', signatureDate: '01/01/2024', ssn: '123-45-6789', phone: '555-111-2222', mailingStreet: '1 Main St', mailingCityStateZip: 'Tampa, FL 33601' },
        { name: 'Guardian Two', signatureDate: '', signatureState: 'typed', ssn: '987-65-4321', phone: '555-333-4444', mailingStreet: '2 Oak St', mailingCityStateZip: 'Tampa, FL 33602' },
      ] });
    });
    await page.evaluate(() => (window as any).GuardianForms.testing.navigate('/p3'));

    const targetPath = await page.evaluate(async () => {
      const structured = await (window as any).GuardianForms.testing.validate.structured();
      return structured.find((e: any) => e.section === 'Part III' && e.label.includes('Guardian #2') && e.label.includes('choose Unsigned'))?.path;
    });
    expect(targetPath).toBe('guardians.1.signatureState');

    await followJumpLink(page, '/p3', targetPath);
    // The first of Guardian #2's own choices (Unsigned), not Guardian #1's.
    await expect(page.locator('#sigstate_guardians_1_none')).toBeFocused();
  });

  test('Schedule B-1 row resolves via the detail-side "Line N" ordinal, not the section', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Annual Schedule B-1 Ward', 'annual');
    await page.evaluate(() => {
      (window as any).GuardianForms.testing.patchFiling({ 'schB1': [{ bankAcct: '111222333', checkNo: '1001', datePaid: '01/01/2024', payee: '', amount: '500' }] });
    });
    await page.evaluate(() => (window as any).GuardianForms.testing.navigate('/schb1'));
    // Milestone 57C-R advisory modal: a populated schedule the filer has not
    // acknowledged raises it as the page draws, and nothing here waits for it.
    // Left open, it takes focus whenever it lands after the jump below (4 of
    // 10 WebKit runs), and when it lands first the jump moves focus out of an
    // open dialog -- neither is what this test is about.
    await dismissScheduleDocPrompt(page);

    const targetPath = await page.evaluate(async () => {
      const structured = await (window as any).GuardianForms.testing.validate.structured();
      return structured.find((e: any) => e.section === 'Schedule B-1' && e.label.includes('Payee'))?.path;
    });
    expect(targetPath).toBe('schB1.0.payee');

    await followJumpLink(page, '/schb1', targetPath);
    await expect(page.locator(`[data-annual-path="${targetPath}"], [data-form-path="${targetPath}"]`)).toBeFocused();
  });

  test('Part IV Preparer and Part V Attorney resolve to their own distinct field shapes', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Annual Preparer Attorney Ward', 'annual');
    await page.evaluate(() => {
      // Milestone 71B: attorney fields raise issues only once an attorney is
      // started, so start one -- the paths under test are the attorney issues'.
      (window as any).GuardianForms.testing.patchFiling({ 'attorney': 'Sample Attorney' });
    });
    await page.evaluate(() => (window as any).GuardianForms.testing.navigate('/p4'));

    const paths = await page.evaluate(async () => {
      const structured = await (window as any).GuardianForms.testing.validate.structured();
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

    await followJumpLink(page, '/p4', paths.preparerStreet);
    await expect(page.locator(`[data-form-path="${paths.preparerStreet}"]`)).toBeFocused();
  });

  // 'Schedule D-1 "Type" and D-5 "Loan Type" resolve to distinct fields' and
  // 'Schedule C "Gain or Loss" compound message resolves to the first field'
  // ran here until Delivery 1M: both asserted issue paths alone, which
  // tests/baseline/ms73-validator-golden.json records through
  // validator-engines.spec.js and validation-structured-paths.spec.ts checks.
});

test.describe('Simplified field-path accuracy (Milestone 33, Item 3, sub-phase 3c)', () => {
  test('Part IV guardian residence/mailing pair and Part V/VI field-name divergences from Annual', async ({ page }) => {
    await freshStartNoPassword(page);
    await createSimplifiedWard(page, 'Simplified Field Shape Ward');
    await page.evaluate(() => {
      (window as any).GuardianForms.testing.patchFiling({ 'guardians.0': {
        name: 'Guardian One', signatureDate: '01/01/2024', ssn: '123-45-6789', phone: '555-111-2222', email: 'g1@example.com',
        mailingStreet: '1 Main St', mailingCityStateZip: 'Tampa, FL 33601', residenceStreet: '', residenceCityStateZip: '',
      } });
      // Milestone 71B: attorney fields raise issues only once an attorney is
      // started, so start one -- the paths under test are the attorney issues'.
      (window as any).GuardianForms.testing.patchFiling({ 'attorney': 'Sample Attorney' });
    });
    await page.evaluate(() => (window as any).GuardianForms.testing.navigate('/p4'));

    const p4Path = await page.evaluate(async () => {
      const structured = await (window as any).GuardianForms.testing.validate.structured();
      // Simplified's own residence/mailing address split -- Annual has no
      // equivalent field pair on its guardian rows.
      return structured.find((e: any) => e.section === 'Part IV' && e.label.includes('Residence Street'))?.path;
    });
    expect(p4Path).toBe('guardians.0.residenceStreet');
    await followJumpLink(page, '/p4', p4Path);
    await expect(page.locator(`[data-form-path="${p4Path}"]`)).toBeFocused();

    await page.evaluate(() => (window as any).GuardianForms.testing.navigate('/p5'));
    const otherPaths = await page.evaluate(async () => {
      const structured = await (window as any).GuardianForms.testing.validate.structured();
      return {
        // Simplified names this attorney_barNumber; Annual names the
        // conceptually identical field attorney_bar.
        barNumber: structured.find((e: any) => e.section === 'Part V' && e.label.includes('Bar Number'))?.path,
      };
    });
    expect(otherPaths.barNumber).toBe('attorney_barNumber');

    await page.evaluate(() => (window as any).GuardianForms.testing.navigate('/p6'));
    const p6Path = await page.evaluate(async () => {
      const structured = await (window as any).GuardianForms.testing.validate.structured();
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
      (window as any).GuardianForms.testing.patchFiling({ 'q1Residences': [{ name: '', street: '123 Group Home Ln', cityStateZip: 'Tampa, FL 33601' }] });
    });
    await page.evaluate(() => (window as any).GuardianForms.testing.navigate('/p2'));

    const targetPath = await page.evaluate(async () => {
      const structured = await (window as any).GuardianForms.testing.validate.structured();
      return structured.find((e: any) => e.section === '1. Residences' && e.label.includes('row'))?.path;
    });
    expect(targetPath).toBe('q1Residences.0.name');

    await followJumpLink(page, '/p2', targetPath);
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
      w.GuardianForms.testing.patchFiling({ 'q9Providers': [
        { name: 'Dr. First', providerType: 'Psychiatrist' },
        { name: '', providerType: 'Neurologist' },
      ] });
    });
    await page.evaluate(() => (window as any).GuardianForms.testing.navigate('/p5'));

    const providerPath = await page.evaluate(async () => {
      const structured = await (window as any).GuardianForms.testing.validate.structured();
      return structured.find((e: any) => e.section === '9. Examining Providers')?.path;
    });
    expect(providerPath).toBe('q9Providers.1.name');
    await followJumpLink(page, '/p5', providerPath);
    await expect(page.locator(`[data-form-path="${providerPath}"]`)).toBeFocused();

    await page.evaluate(() => (window as any).GuardianForms.testing.navigate('/p10'));
    // Milestone 35-3: attorney fields are pro se-safe -- required only once
    // the filer has started entering one (see validatePlanInitial()). Seed
    // just the bar number so the conditional block fires and attorney_name
    // still resolves a real error/path, without claiming attorney fields are
    // unconditionally required for a blank filing (they no longer are).
    await page.evaluate(() => { (window as any).GuardianForms.testing.patchFiling({ 'attorney_bar': '123456' }); });
    const attorneyPath = await page.evaluate(async () => {
      const structured = await (window as any).GuardianForms.testing.validate.structured();
      // attorney_name: since Milestone 73O part 1 the plan's one attorney
      // name, shown on the Cover and in the certification.
      return structured.find((e: any) => e.section === 'Attorney Certification' && e.label.includes('Attorney name'))?.path;
    });
    expect(attorneyPath).toBe('attorney_name');
  });

  test('Plan Minor "Preparer & Attorney" resolves three same-page fields to three distinct targets', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Plan Minor Preparer Attorney Ward', 'planMinor');
    await page.evaluate(() => (window as any).GuardianForms.testing.navigate('/p7'));

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
    const preparerName = await page.evaluate(async () => {
      const w = window as any;
      w.GuardianForms.testing.patchFiling({ 'preparer_signatureDate': '2027-01-15' });
      const structured = (await w.GuardianForms.testing.validate.structured());
      const path = structured.find((e: any) => e.section === 'Preparer & Attorney' && e.label.includes('Preparer name'))?.path;
      w.GuardianForms.testing.patchFiling({ 'preparer_signatureDate': '' });
      return path;
    });
    const attorneyName = await page.evaluate(async () => {
      const w = window as any;
      w.GuardianForms.testing.patchFiling({ 'attorney_signatureDate': '2027-01-15' });
      const structured = (await w.GuardianForms.testing.validate.structured());
      const path = structured.find((e: any) => e.section === 'Preparer & Attorney' && e.label.includes('Attorney name'))?.path;
      w.GuardianForms.testing.patchFiling({ 'attorney_signatureDate': '' });
      return path;
    });
    const attorneySignatureDate = await page.evaluate(async () => {
      const w = window as any;
      w.GuardianForms.testing.patchFiling({ 'attorney_name': 'John Attorney' });
      // Milestone 39-C: a blank date with no signatureState now legitimately
      // resolves to Unsigned (no error) -- signatureState must be set
      // explicitly to "typed" to force a real, findable "date signed" error.
      w.GuardianForms.testing.patchFiling({ 'attorney_signatureState': 'typed' });
      const structured = (await w.GuardianForms.testing.validate.structured());
      return structured.find((e: any) => e.section === 'Preparer & Attorney' && e.label.includes('Attorney') && e.label.includes('date signed'))?.path;
    });
    const paths = { preparerName, attorneyName, attorneySignatureDate };
    expect(paths).toEqual({ preparerName: 'preparer_name', attorneyName: 'attorney_name', attorneySignatureDate: 'attorney_signatureDate' });

    await followJumpLink(page, '/p7', paths.attorneySignatureDate);
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
      w.GuardianForms.testing.patchFiling({ 'q7RestoreRights': 'Yes' });
      w.GuardianForms.testing.patchFiling({ 'q7RestoreExplain': '' });
      w.GuardianForms.testing.patchFiling({ 'q9Remuneration': 'Yes' });
      w.GuardianForms.testing.patchFiling({ 'q9RemunerationExplain': '' });
    });
    await page.evaluate(() => (window as any).GuardianForms.testing.navigate('/p2'));

    const paths = await page.evaluate(async () => {
      const structured = await (window as any).GuardianForms.testing.validate.structured();
      return {
        q7: structured.find((e: any) => e.section === 'The Plan' && e.label.includes('Question 7 explanation'))?.path,
        q9: structured.find((e: any) => e.section === 'The Plan' && e.label.includes('Question 9 explanation'))?.path,
      };
    });
    expect(paths).toEqual({ q7: 'q7RestoreExplain', q9: 'q9RemunerationExplain' });

    await followJumpLink(page, '/p2', paths.q7);
    await expect(page.locator(`[data-form-path="${paths.q7}"]`)).toBeFocused();
  });
});

// Until TEST-REVIEW.md Delivery 1M (2026-10-13) this file went on with 38
// cases that patched a filing's data and asked whether the sidebar's mark
// agreed with the export gate (Milestones 40C-E, 55B, 55D, 57B, 57E-1, 58D
// and 57's signature parity). Since Milestone 73F part 2 the sidebar's marks
// are the export checks' own, and tests/unit/sidebar-export-parity.spec.js
// judges that agreement over every variant of all nine filing types; the
// rules those cases carried are pinned in tests/unit: attorney-block and
// plan-attorney-started (55D), service-recipients and service-method (57B),
// date-rules (55B), signature-completeness (57), and
// annual-trust-and-remuneration-rules (57E-1, 58D).
