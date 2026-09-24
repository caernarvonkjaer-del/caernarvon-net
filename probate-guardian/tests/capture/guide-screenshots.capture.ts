import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import {
  freshStartNoPassword, createWard, gotoApp, startNewCase, chooseNoPassword, chooseEncrypted,
  createSimplifiedWard, fillMinimalValidGuardianWard, fillMinimalValidSimplifiedWard,
  fillMinimalValidAnnualWard, fillMinimalValidPlanInitialWard, fillMinimalValidPlanAnnualWard,
  fillMinimalValidPlanMinorWard, fillMinimalValidPlanSimplifiedWard, autoAcceptDynDialogs,
  dismissScheduleDocPrompt,
} from '../e2e/support/target';

// Milestone 56G / 59B / 66: capture harness for help/index.html's figures.
//
// NOT part of the regression suite -- it is dedicated documentation tooling
// discovered exclusively via playwright.capture.config.ts and invoked via
// `npm run capture:guide`. It reproduces G1's pinned capture table:
//
//   Target      web (dist/web) -- what a filer actually receives, NOT the
//               `source` target, which serves raw source from disk per request
//   Browser     chromium
//   Viewport    1280x800, deviceScaleFactor 1, for every capture
//   Theme       light
//   Fixture     the synthetic names already used by the guide's existing
//               images, so replacements sit beside survivors consistently
//   Format      JPEG q82, each under 150 KB after encoding (these become
//               data: URIs in an already-oversized file and base64 adds ~1/3)
//
// Run: npm run capture:guide

const OUT = process.env.PG_CAPTURE_DIR || path.join(process.cwd(), '.guide-shots');
const WARD = 'Eleanor Marie Whitfield';

test.use({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1, colorScheme: 'light' });
test.beforeAll(() => fs.mkdirSync(OUT, { recursive: true }));

test('capture: signature Draw tab and applied stamp', async ({ page }) => {
  await freshStartNoPassword(page);
  await createWard(page, WARD, 'guardian');
  await page.evaluate(() => (window as any).navigate('/d1'));
  await page.waitForURL(/#\/d1$/);

  // 'stamp', not 'image' -- SIGNATURE_STATES in core/validation/signature-state.js.
  const stamp = page.locator('input[type="radio"][value="stamp"]').first();
  await stamp.waitFor({ state: 'visible' });
  await stamp.check();

  const pad = page.locator('[data-sig-tab="draw"]').first();
  await pad.waitFor({ state: 'visible' });
  // Two tabs, not three -- the reason these figures are being re-shot.
  await expect(page.locator('[data-sig-tab]')).toHaveCount(2);

  const panel = page.locator('.plan-radio-row').first()
    .locator('xpath=ancestor::*[self::div or self::section][1]');
  await panel.screenshot({ path: path.join(OUT, 'signature-draw.jpg'), quality: 82, type: 'jpeg' });

  // Draw a stroke on the canvas, then apply, and shoot the applied state.
  const canvas = page.locator('canvas').first();
  await expect(canvas).toBeVisible();
  const box = await canvas.boundingBox();
  expect(box).not.toBeNull();
  if (!box) throw new Error('Canvas bounding box is null');
  await page.mouse.move(box.x + 30, box.y + box.height * 0.6);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.4, box.y + box.height * 0.25);
  await page.mouse.move(box.x + box.width * 0.7, box.y + box.height * 0.7);
  await page.mouse.up();
  await page.getByRole('button', { name: /Apply Signature/i }).first().click();
  await page.waitForTimeout(400);
  await panel.screenshot({ path: path.join(OUT, 'signature-applied.jpg'), quality: 82, type: 'jpeg' });
});

test('capture: dashboard toolbar, Helpful Resources, Help panel', async ({ page }) => {
  await freshStartNoPassword(page);
  await createWard(page, WARD, 'guardian');
  await page.evaluate(() => (window as any).navigate('/dashboard'));
  await page.waitForURL(/#\/dashboard/);
  const reminder = page.locator('[data-shell-action="hide-auto-export-reminder"]');
  if (await reminder.count()) await reminder.click();
  // The PWA "Offline access available" notice (pwa-ui.js) floats over the
  // top-right on its own timer and covered the Help panel's header in the
  // first capture -- a syntactically fine image of the wrong thing, which is
  // what G4 exists to catch. Dismiss it before shooting anything.
  // Scoped to #pwa-status-notice: a bare name:'Dismiss' also matches the
  // continue-prompt's aria-labelled x, which the toast then intercepts.
  const toast = page.locator('#pwa-status-notice');
  if (await toast.count()) {
    const d = toast.getByRole('button', { name: 'Dismiss', exact: true });
    if (await d.count()) await d.click();
    await expect(toast).toBeHidden();
  }
  await page.waitForTimeout(400);

  // Report a Bug and Comment Card are the controls 56E documented and this
  // figure must show; assert before shooting so a silent miss cannot ship.
  await expect(page.locator('[data-feedback-open="bug"]')).toBeVisible();
  await page.screenshot({ path: path.join(OUT, 'dashboard.jpg'), quality: 80, type: 'jpeg' });

  // The whole panel -- selector plus the county accordions beneath it. An
  // earlier attempt cropped to the selector's own wrapper and produced a 4 KB
  // picture of one drop-down, which shows none of what the section describes.
  const resources = page.locator('.sidebar-resources-panel').first();
  await expect(resources).toBeVisible();
  await expect(page.locator('.sidebar-resource-group').first()).toBeVisible();
  await resources.screenshot({ path: path.join(OUT, 'resources.jpg'), quality: 82, type: 'jpeg' });

  await page.locator('#help-toggle-btn').click();
  await expect(page.locator('#help-panel')).toBeVisible();
  await expect(page.locator('[data-shell-action="export-help"]')).toHaveText('View User Guide');
  await page.locator('#help-panel').screenshot({ path: path.join(OUT, 'help-panel.jpg'), quality: 82, type: 'jpeg' });
});

// Not a figure -- a fact check. The guide now tells filers the Preview banner
// carries All Filings / theme / Help "for every filing type". One of the
// existing figures shows a BLOCKED preview whose banner has none of them, so
// either that image predates the change or the blocked state genuinely lacks
// them. Report which, rather than guessing.
test('probe: does a blocked preview carry the shell actions?', async ({ page }) => {
  await freshStartNoPassword(page);
  await createWard(page, WARD, 'guardian');
  await page.evaluate(() => (window as any).navigate('/print'));
  await page.waitForURL(/#\/print$/);
  await page.waitForTimeout(800);
  const report = {
    blockedBannerHasAllFilings: await page.locator('[data-shell-action="dashboard"]').count(),
    blockedBannerHasTheme: await page.locator('[data-shell-action="toggle-theme"]').count(),
    blockedBannerHasHelp: await page.locator('#help-toggle-btn').count(),
    previewBlocked: await page.getByText(/Preview blocked|required field/i).count(),
  };
  fs.writeFileSync(path.join(OUT, 'blocked-preview-probe.json'), JSON.stringify(report, null, 2));
  console.log('BLOCKED PREVIEW PROBE', JSON.stringify(report));

  // And capture it: the existing "required fields still missing" figure shows
  // a banner with none of the three shell controls, which the probe above
  // proves is no longer how a blocked preview renders.
  const toast = page.locator('#pwa-status-notice');
  if (await toast.count()) {
    const d = toast.getByRole('button', { name: 'Dismiss', exact: true });
    if (await d.count()) await d.click();
  }
  await page.waitForTimeout(300);
  await page.screenshot({
    path: path.join(OUT, 'preview-blocked.jpg'),
    quality: 80,
    type: 'jpeg',
    clip: { x: 270, y: 0, width: 1010, height: 560 },
  });
});

// Milestone 66. D-4 and D-5's existing figures predate two required
// questions this milestone documents in prose: 64A-1/D16's "Has the surety
// bond been waived by court order?" (D-4) and 64A-2/65A's "Indicate if Ward
// is:" (D-5). Neither control existed when the current images were captured
// -- confirmed by opening both extracted from help/index.html before writing
// this test, not assumed from a milestone doc's say-so (AGENTS.md section 2):
// D-4's image runs straight from "Name of Bonding Company" to "If bond
// waived - date of order" with no Yes/No question between them, and D-5's
// image shows "Service Date (on this date)" alone on its row with nothing
// where the dropdown now sits.
/**
 * Both floating toasts the dashboard capture test above already knows to
 * dismiss (the PWA offline-access offer and the "Save Your First Backup"
 * reminder) also float over a freshly created ward's first schedule pages,
 * arriving on their own timers rather than at page load -- the same G4
 * problem this file's own history names: "a syntactically fine image of the
 * wrong thing." Dismissed here so D-4/D-5's captures show the form, not a
 * toast sitting on top of it.
 */
async function dismissFloatingToasts(page: import('@playwright/test').Page) {
  // index.html's #auto-export-reminder is STATIC markup -- always present in
  // the DOM regardless of whether it's actually shown, so `.count()` is
  // always >= 1 here and is never a useful signal on its own. Milestone 66
  // Finding 9 completion found this the hard way: calling this helper right
  // after ward creation (before the reminder's own show condition is true)
  // made `.click()` wait the full 60s test timeout for an element that was
  // never going to become visible, silently eating every capture test that
  // called this helper more than once per page. `.isVisible()` resolves
  // immediately either way and never blocks.
  const reminder = page.locator('[data-shell-action="hide-auto-export-reminder"]');
  if (await reminder.isVisible().catch(() => false)) await reminder.click();
  // #pwa-status-notice, by contrast, is created on demand by pwa-ui.js's
  // getPwaNotice() -- it genuinely doesn't exist until first shown, so
  // `.count()` is a safe presence check for it specifically.
  const toast = page.locator('#pwa-status-notice');
  if (await toast.count()) {
    const d = toast.getByRole('button', { name: 'Dismiss', exact: true });
    if (await d.isVisible().catch(() => false)) await d.click();
  }
  await page.waitForTimeout(300);
}

test('capture: D-4 Bond & Surety Info with the waiver question', async ({ page }) => {
  await freshStartNoPassword(page);
  await createWard(page, WARD, 'guardian');
  await page.evaluate(() => (window as any).navigate('/d4'));
  await page.waitForURL(/#\/d4$/);
  await dismissFloatingToasts(page);

  // Scoped to input[...], not the bare attribute selector -- 63A/63F's jump-to-
  // field links in the "Complete these items" box carry the same data-field-path
  // on a <button>, and a strict-mode locator match on both is exactly the kind
  // of thing this file's own header warns about verifying rather than assuming.
  // Milestone 67B: the four-state arrangement question replaced "Has the
  // surety bond been waived?"; "Bond only" reveals the bond fields.
  await page.locator('#bondDepositoryState_2').check();
  await page.waitForTimeout(300);
  await page.locator('input[data-bind="bondAmount"]').fill('140000');
  await page.locator('input[data-field-path="bondPeriodFrom"]').fill('03/15/2026');
  await page.locator('input[data-field-path="bondPeriodTo"]').fill('03/15/2027');
  await page.locator('input[data-field-path="bondingCompany"]').fill('Western Surety Company');
  await page.locator('input[data-field-path="bondingCompany"]').blur();
  await page.waitForTimeout(300);

  // The question this figure exists to show. Assert before shooting so a
  // silent miss (e.g. the question regressing back out of the page) cannot
  // ship a screenshot that fails to demonstrate its own caption.
  await expect(page.locator('#bondDepositoryState_2')).toBeChecked();
  await expect(page.locator('#main-content')).toContainText('Which applies to this guardianship?');

  const row = page.locator('#main-content .row.g-3').first();
  await row.screenshot({ path: path.join(OUT, 'd4-bond.jpg'), quality: 82, type: 'jpeg' });
});

test('capture: D-5 Certificate of Service with Indicate if Ward is', async ({ page }) => {
  await freshStartNoPassword(page);
  await createWard(page, WARD, 'guardian');
  await page.evaluate(() => (window as any).navigate('/d5'));
  await page.waitForURL(/#\/d5$/);
  await dismissFloatingToasts(page);

  // See the D-4 test above: scoped to input/select[...], not the bare
  // attribute, for the same jump-to-field-button collision.
  await page.locator('input[data-field-path="serviceRecipients.0.name"]').fill('Harold J. Whitfield');
  await page.locator('input[data-field-path="serviceRecipients.0.address"]').fill('1850 Coffee Pot Blvd NE');
  await page.locator('input[data-field-path="serviceRecipients.0.cityStateZip"]').fill('St. Petersburg, FL 33704');
  await page.locator('input[data-field-path="serviceRecipients.1.name"]').fill('Clerk of the Circuit Court, Probate Division');
  await page.locator('input[data-field-path="serviceRecipients.1.address"]').fill('315 Court St, Room 106');
  await page.locator('input[data-field-path="serviceRecipients.1.cityStateZip"]').fill('Clearwater, FL 33756');
  await page.locator('input[data-field-path="serviceDate"]').fill('05/04/2026');
  await page.locator('select[data-bind="serviceIndicateIf"]').selectOption('Ward is totally incapacitated');
  await page.locator('input[data-field-path="serviceAttorney.name"]').fill('Daniel R. Okafor, Esq.');
  await page.locator('input[data-field-path="serviceAttorney.signatureDate"]').fill('05/04/2026');
  await page.locator('input[data-field-path="serviceAttorney.barNumber"]').fill('0123456');
  await page.locator('input[data-field-path="serviceAttorney.phone"]').fill('(727) 555-0188');
  await page.locator('input[data-field-path="serviceAttorney.streetAddress"]').fill('150 2nd Ave N, Suite 800');
  await page.locator('input[data-field-path="serviceAttorney.cityStateZip"]').fill('St. Petersburg, FL 33701');
  await page.locator('h1').first().click();
  await page.waitForTimeout(300);

  // The field this figure exists to show -- Milestone 64A-2/65A's required
  // "Indicate if Ward is:" dropdown, absent from the current image.
  await expect(page.locator('select[data-bind="serviceIndicateIf"]')).toBeVisible();
  await expect(page.locator('select[data-bind="serviceIndicateIf"]')).toHaveValue('Ward is totally incapacitated');

  await page.screenshot({ path: path.join(OUT, 'd5-certificate.jpg'), quality: 82, type: 'jpeg' });
});

// ═══════════════════════════════════════════════════════════════════════
// Milestone 66 Finding 9 completion. Milestone 62 renamed the app
// "Probate Guardian" -> "Guardian Forms" throughout the live source (see
// index.html:191, :258, :44, :114 and legacy-app.js:5613, :7736 -- all
// already read "Guardian Forms"/"Guardian Forms App", confirmed before
// writing any of the tests below). Finding 9's first pass fixed three
// figures for free and named four more; a full image-by-image visual
// triage (56G method: open every embedded image and look at it, never
// infer from alt text or caption) found 56 of the guide's 83 images still
// showed the retired sidebar brand badge, dialog titles, or in-app
// boilerplate text. Every test below re-shoots one of those 56 against
// current source -- correct branding falls out automatically since the
// source itself is already clean; nothing here special-cases any text.
//
// Ward identity is kept consistent with the D-4/D-5 figures Finding 8
// already re-shot (Eleanor Marie Whitfield / guardian Margaret
// Whitfield-Harris / attorney Daniel R. Okafor, Esq. / case 26-001234-GD /
// Pinellas County) so the guide's figures read as one continuous example
// case, matching the pattern the original (stale) figures already used.
// Schedule row content mirrors what the stale figures actually showed
// (transcribed by direct visual inspection before writing this file) where
// practical; some figures (Simplified/Annual Accounting Part II amounts,
// D-2's signature-method radios, per-row Comments text) use the shared
// fixtures.ts/target.ts MINIMAL_VALID_* defaults instead of hand-matching
// every old figure's exact number -- recorded as a judgment call in
// MILESTONE-66-PROPOSAL.md rather than silently treated as exact.

const GUARDIAN_WARD = 'Eleanor Marie Whitfield';
const MINOR_WARD = 'Jacob Whitfield';

/** Guardian Inventory (Initial Inventory) schedule row shapes, mirroring legacy-app.js's `mk` factories. */
const A1_ROW = { propertyDescription: 'Single Family Home', streetAddress: '1850 Coffee Pot Blvd NE', cityStateZip: 'St. Petersburg, FL 33704', notes: 'Homestead; Parcel 07-31-17-1234-000-0050', residence: 'Yes', income: 'No', fullAssetValue: 425000, wardPercent: 50 };
const A2_ROW = { lenderName: 'Suncoast Credit Union', lenderAddress: '6801 E Hillsborough Ave', lenderCityStateZip: 'Tampa, FL 33610', accountNumber: 'MTG-88213', notes: 'First mortgage on 1850 Coffee Pot Blvd NE', liabilityType: 'Mortgage', fullDebtBalance: 96000, wardPercent: 50 };
const B1_ROWS = [
  { institutionName: 'Bank of Tampa', restricted: 'No', accountType: 'Checking', accountNumber: '4471', streetAddress: '601 Bayshore Blvd', cityStateZip: 'Tampa, FL 33606', fullAssetAmount: 18250.42, wardPercent: 100 },
  { institutionName: 'Bank of Tampa', restricted: 'Yes', accountType: 'Restricted Depository Savings', accountNumber: '9902', streetAddress: '601 Bayshore Blvd', cityStateZip: 'Tampa, FL 33606', fullAssetAmount: 150000, wardPercent: 100 },
];
const B2_ROWS = [
  { description: '', streetAddress: '1850 Coffee Pot Blvd NE', cityStateZip: 'St. Petersburg, FL 33704', valuationMethod: 'Kelley Blue Book private party — good condition', fullAssetValue: 14500, wardPercent: 100, inSafeDepositBox: 'No', isVehicle: true, vehicleYear: '2019', vehicleMake: 'Toyota', vehicleModel: 'Camry LE', vehicleVin: '4T1B11HK5KU123456', odometerMileage: '48210' },
  { description: 'Diamond Solitaire Ring, 1.2 Ct (appraisal #A-2291)', streetAddress: 'Bank of Tampa, 601 Bayshore Blvd', cityStateZip: 'Tampa, FL 33606', valuationMethod: 'Certified jewelry appraisal — excellent condition', fullAssetValue: 6800, wardPercent: 100, inSafeDepositBox: 'Yes', isVehicle: false },
];
const B3_ROW = { description: 'Vanguard IRA, Acct. Ending 7731 (250 Sh VTI, 400 Sh BND)', streetAddress: '100 Vanguard Blvd', cityStateZip: 'Malvern, PA 19355', restricted: 'No', fullAssetValue: 97400, wardPercent: 100, inSafeDepositBox: 'No' };
const B4_ROW = { lenderName: 'Toyota Financial Services', relatedProperty: '2019 Toyota Camry LE (B-2, Item 1)', accountNumber: 'TFS-501177', lenderAddress: 'PO Box 5855, Carol Stream, IL 60197', liabilityType: 'Loan', fullLiabilityBalance: 5320, wardPercent: 100 };
const C1_ROW = { payerName: 'Social Security Administration', payerAddress: '6401 Security Blvd', payerCityStateZip: 'Baltimore, MD 21235', typeOfIncome: 'Social Security retirement', frequencyOfPayment: 'Monthly', paymentBasis: '$1,940/month', annualIncomeAmount: 23280, wardPercent: 100 };
const C2_ROW = { claimantName: 'Bayfront Medical Group', lawsuitDescription: 'Collection of Unpaid Medical Bills', courtJurisdiction: 'County Court, Pinellas County', caseNumber: '25-CC-004421', claimantAddress: '701 6th St S', claimantCityStateZip: 'St. Petersburg, FL 33701', dateFiled: '2025-11-02', amountOfClaim: 3150, wardPercent: 100 };
const C4_ROW = { trustName: 'Whitfield Family Revocable Trust', trusteeName: 'Margaret Whitfield-Harris, Successor Trustee', trusteeAddress: '220 12th Ave NE', trusteeCityStateZip: 'St. Petersburg, FL 33701', dateCreated: '2014-06-12', trustType: 'Living', trustAmount: 62000, wardPercent: 100 };
const C5_ROW = { assetDescription: 'Single Family Home — Schedule A-1, Item 1', ownerName: 'Harold J. Whitfield', ownerAddress: '1850 Coffee Pot Blvd NE', ownerCityStateZip: 'St. Petersburg, FL 33704', relationshipToWard: 'Spouse', totalAssetValue: 425000, jointOwnerPercent: 50 };

test.describe('Milestone 66 Finding 9: re-shoot every stale-branding figure', () => {
  test('capture: startup screens (start dialog, protect-data dialog, unlock dialog)', async ({ page }) => {
    await gotoApp(page);
    // The PWA offline-access offer floats in on its own timer (see
    // dismissFloatingToasts' own comment on this file's history) -- give it
    // a moment to appear so this figure matches the original composition
    // (dialog + toast both visible), but don't fail the capture if it
    // doesn't show under this run's timing.
    await page.locator('#pwa-status-notice').waitFor({ state: 'visible', timeout: 4000 }).catch(() => {});
    await page.locator('#startup-choice-overlay.show').waitFor({ state: 'visible' });
    await page.screenshot({ path: path.join(OUT, 'start-dialog.jpg'), quality: 82, type: 'jpeg' });

    await startNewCase(page);
    await page.locator('#security-choice-overlay.show').waitFor({ state: 'visible' });
    await page.screenshot({ path: path.join(OUT, 'protect-data-dialog.jpg'), quality: 82, type: 'jpeg' });

    await chooseEncrypted(page, 'CaptureTest123!');
    await createWard(page, GUARDIAN_WARD, 'guardian');
    // Save controls (including Lock) sit collapsed behind "Show save
    // controls" by default (legacy-app.js's _saveControlsCollapsed) --
    // expand before the Lock button is clickable.
    await page.click('#save-controls-toggle-btn');
    await page.locator('[data-shell-action="lock"]').waitFor({ state: 'visible' });
    await page.click('[data-shell-action="lock"]');
    await page.locator('#unlock-overlay.show').waitFor({ state: 'visible' });
    await page.screenshot({ path: path.join(OUT, 'unlock-dialog.jpg'), quality: 82, type: 'jpeg' });
  });

  test('capture: Start New Form screen and the Active Filing dropdown with three filings', async ({ page }) => {
    await freshStartNoPassword(page);
    // Landing state before any ward exists is the "Start New Form" selector
    // itself -- matches the stale figure's own composition (no sidebar).
    await page.getByRole('heading', { name: 'Start New Form' }).waitFor({ state: 'visible' });
    await page.screenshot({ path: path.join(OUT, 'start-new-form.jpg'), quality: 82, type: 'jpeg' });

    // All three filings deliberately share GUARDIAN_WARD's name -- matches
    // what the stale figure itself already showed (three same-named entries
    // in the dropdown) and is exactly the case doAddWard()/
    // doConfirmSimplifiedEligibility() auto-detect: creating a second/third
    // filing under a name that already matches an existing ward
    // auto-selects it as a carry-over source and, once carried over, shows
    // an alertModal() summarizing what was carried -- confirmed live (a
    // first attempt hung 60s waiting for #simplifiedEligibilityModal to
    // hide, which turned out to be blocked behind that unacknowledged
    // alert). autoAcceptDynDialogs covers any number of these across all
    // three creations rather than guessing which ones fire.
    const dialogs = autoAcceptDynDialogs(page);
    await createWard(page, GUARDIAN_WARD, 'guardian');
    await createSimplifiedWard(page, GUARDIAN_WARD);
    await createWard(page, GUARDIAN_WARD, 'annual');
    dialogs.stop();
    await dismissFloatingToasts(page);
    // #ward-selector is the Active Filing combobox. Matches
    // combobox-keyboard-nav.spec.ts's own proven pattern: .click() (not
    // .focus(), which didn't reliably trigger onWardSelectorFocus() under
    // Playwright and hung this capture for the full 60s test timeout) and
    // wait for the dropdown's [role="option"] rows specifically -- the
    // wrapper can exist without options rendered yet.
    await page.locator('#ward-selector').click();
    await page.locator('#ward-selector-dropdown [role="option"]').first().waitFor({ state: 'visible' });
    await page.waitForTimeout(200);
    await page.screenshot({ path: path.join(OUT, 'active-filing-dropdown.jpg'), quality: 82, type: 'jpeg' });
  });

  test('capture: Guardian Inventory -- cover, summary, every schedule, D1-D3', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, GUARDIAN_WARD, 'guardian');
    await dismissFloatingToasts(page);

    // A-1 in its genuinely untouched state (no rows, checkbox unchecked) --
    // the yellow "what's required" checklist only shows before the schedule
    // is satisfied either way, so this has to happen before the valid-data
    // fill below marks every schedule complete via scheduleNoItems.
    await page.evaluate(() => (window as any).navigate('/a1'));
    await page.waitForURL(/#\/a1$/);
    await page.locator('button:has-text("Add Property")').first().waitFor({ state: 'visible' });
    await page.screenshot({ path: path.join(OUT, 'inventory-a1-empty.jpg'), quality: 82, type: 'jpeg' });

    await fillMinimalValidGuardianWard(page);
    await page.evaluate(([a1, a2, b1, b2, b3, b4, c1, c2, c4, c5]) => {
      const d = (window as any).D;
      Object.assign(d, {
        caseNumber: '26-001234-GD', gid: '2026-03-15', county: 'Pinellas',
        guardianName: 'Margaret Whitfield-Harris', attorneyForGuardian: 'Daniel R. Okafor, Esq.',
        hasSafeDepositBox: true, safeDepositBoxFiled: true,
      });
      d.guardians = [{ name: 'Margaret Whitfield-Harris', ssnEin: '123-45-6789', phone: '(727) 555-0142', streetAddress: '220 12th Ave NE', cityStateZip: 'St. Petersburg, FL 33701', signatureDate: '2026-05-01' }];
      d.preparer = { name: 'Lisa Chen, Paralegal', ssnEin: '987-65-4321', phone: '(727) 555-0199', streetAddress: '150 2nd Ave N, Suite 800', cityStateZip: 'St. Petersburg, FL 33701', signatureDate: '2026-05-01' };
      d.attorney = { name: 'Daniel R. Okafor, Esq.', barNumber: '00123456', phone: '(727) 555-0188', streetAddress: '150 2nd Ave N, Suite 800', cityStateZip: 'St. Petersburg, FL 33701', signatureDate: '2026-05-01', filingDate: '2026-05-04' };
      d.scheduleA1 = [a1]; d.scheduleA2 = [a2];
      d.scheduleB1 = b1; d.scheduleB2 = b2; d.scheduleB3 = [b3]; d.scheduleB4 = [b4];
      d.scheduleC1 = [c1]; d.scheduleC2 = [c2]; d.scheduleC4 = [c4]; d.scheduleC5 = [c5];
      Object.assign(d.scheduleNoItems, { a1: false, a2: false, b1: false, b2: false, b3: false, b4: false, c1: false, c2: false, c3: true, c4: false, c5: false });
      (window as any).autoSave();
    }, [A1_ROW, A2_ROW, B1_ROWS, B2_ROWS, B3_ROW, B4_ROW, C1_ROW, C2_ROW, C4_ROW, C5_ROW]);
    await page.evaluate(() => (window as any).flushPendingSave());

    const shots: Array<[string, string]> = [
      ['/', 'inventory-cover.jpg'],
      ['/summary', 'inventory-summary.jpg'],
      ['/a1', 'inventory-a1.jpg'],
      ['/a2', 'inventory-a2.jpg'],
      ['/b1', 'inventory-b1.jpg'],
      ['/b2', 'inventory-b2.jpg'],
      ['/b3', 'inventory-b3.jpg'],
      ['/b4', 'inventory-b4.jpg'],
      ['/c1', 'inventory-c1.jpg'],
      ['/c2', 'inventory-c2.jpg'],
      ['/c4', 'inventory-c4.jpg'],
      ['/c5', 'inventory-c5.jpg'],
      ['/d1', 'inventory-d1.jpg'],
      ['/d2', 'inventory-d2.jpg'],
      ['/d3', 'inventory-d3.jpg'],
    ];
    for (const [route, file] of shots) {
      await page.evaluate((r) => (window as any).navigate(r), route);
      await page.waitForURL(new RegExp(`#${route.replace('/', '\\/')}$`));
      await dismissFloatingToasts(page);
      // schedule-doc-ack.js's advisory modal ("Supporting documentation --
      // you have entered items...") pops up over any schedule that now has
      // rows, covering the whole page -- confirmed live: a first attempt
      // shot every populated schedule with this dialog sitting on top of
      // the actual content. Dismiss (Cancel/"Not now") before shooting, not
      // accept, so this capture pass doesn't write an acknowledgement into
      // the ward data it's only using for illustration.
      await dismissScheduleDocPrompt(page);
      await page.screenshot({ path: path.join(OUT, file), quality: 82, type: 'jpeg' });
    }

    // C-3's "I verify there are none" state -- the schedule this pattern was
    // already documented against (stale figure's own caption).
    await page.evaluate(() => (window as any).navigate('/c3'));
    await page.waitForURL(/#\/c3$/);
    // The advisory modal re-appears on every schedule navigation once ANY
    // schedule has rows this session (its "Not now"/Cancel dismissal is
    // per-view, not per-ward) -- confirmed live, it blocked C-3 too, despite
    // C-3 itself having zero rows (verified-none checked). Dismiss on every
    // navigation to a financial schedule, not just the ones with new rows.
    await dismissScheduleDocPrompt(page);
    await page.getByText('I verify there are no lawsuits pending').waitFor({ state: 'visible' });
    await page.screenshot({ path: path.join(OUT, 'inventory-c3-verified.jpg'), quality: 82, type: 'jpeg' });

    // Supporting Documents / Comments -- same page, scrolled so that block
    // sits in view instead of an exact crop (documented simplification).
    await page.evaluate(() => (window as any).navigate('/c2'));
    await page.waitForURL(/#\/c2$/);
    await dismissScheduleDocPrompt(page);
    await page.getByRole('heading', { name: /Supporting Documents/ }).first().scrollIntoViewIfNeeded();
    await page.waitForTimeout(200);
    await page.screenshot({ path: path.join(OUT, 'inventory-supporting-docs.jpg'), quality: 82, type: 'jpeg' });
  });

  test('capture: Simplified Accounting -- cover, Part II, IV, VI, VII', async ({ page }) => {
    await freshStartNoPassword(page);
    await createSimplifiedWard(page, GUARDIAN_WARD);
    await dismissFloatingToasts(page);
    await fillMinimalValidSimplifiedWard(page);
    await page.evaluate(() => {
      const d = (window as any).D;
      Object.assign(d, { caseNumber: '26-001234-GD', gid: '2026-03-15', county: 'Pinellas', guardian: 'Margaret Whitfield-Harris', attorney: 'Daniel R. Okafor, Esq.' });
      (window as any).autoSave();
    });
    await page.evaluate(() => (window as any).flushPendingSave());

    const shots: Array<[string, string, string]> = [
      ['/', 'simplified-cover.jpg', ''],
      ['/p2', 'simplified-partII.jpg', ''],
      ['/p4', 'simplified-partIV.jpg', 'Part IV'],
      ['/p6', 'simplified-partVI.jpg', 'Part VI'],
      ['/p7', 'simplified-partVII.jpg', 'Part VII'],
    ];
    for (const [route, file, headingHint] of shots) {
      await page.evaluate((r) => (window as any).navigate(r), route);
      await page.waitForURL(new RegExp(`#${route.replace('/', '\\/')}$`));
      await dismissFloatingToasts(page);
      if (headingHint) {
        await page.getByRole('heading', { name: new RegExp(headingHint) }).first().scrollIntoViewIfNeeded();
        await page.waitForTimeout(200);
      }
      await page.screenshot({ path: path.join(OUT, file), quality: 82, type: 'jpeg' });
    }
  });

  test('capture: Annual Accounting -- cover, Schedule A, Schedule B-4, Parts VI/VII, Part IX bond', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, GUARDIAN_WARD, 'annual');
    await dismissFloatingToasts(page);
    await fillMinimalValidAnnualWard(page);
    await page.evaluate(() => {
      const d = (window as any).D;
      Object.assign(d, { caseNumber: '26-001234-GD', gid: '2025-03-15', county: 'Pinellas', guardian: 'Margaret Whitfield-Harris', attorney: 'Daniel R. Okafor, Esq.', startingBalance: '398130.42' });
      d.schB4 = [
        { bankAccountId: '', checkNo: '1041', datePaid: '2026-04-03', category: 'Care Facility', payee: 'Sunrise Senior Living', amount: '4850' },
        { bankAccountId: '', checkNo: '1042', datePaid: '2026-04-05', category: 'Medical / Pharmacy', payee: 'Walgreens #4471', amount: '86.40' },
        { bankAccountId: '', checkNo: '1043', datePaid: '2026-04-12', category: 'Utilities', payee: 'Duke Energy', amount: '142.18' },
      ];
      d.schD1 = [{ description: 'Bank of Tampa checking', accountNo: '4471', restricted: 'No', type: 'Checking', fullAmount: '18250.42', wardPct: '100', restrictedAmt: '0' }];
      d.schD4 = [{ description: 'Vanguard IRA', restricted: 'No', fullAmount: '99120', wardPct: '100', carryingValue: '99120', wardValue: '99120', restrictedAmt: '0' }];
      (window as any).autoSave();
    });
    await page.evaluate(() => (window as any).flushPendingSave());

    const shots: Array<[string, string, string]> = [
      ['/', 'annual-cover.jpg', ''],
      ['/scha', 'annual-scha.jpg', ''],
      ['/schb4', 'annual-schb4.jpg', ''],
      ['/p67', 'annual-p67.jpg', ''],
      ['/p9', 'annual-p9-bond.jpg', 'Part IX'],
    ];
    for (const [route, file, headingHint] of shots) {
      await page.evaluate((r) => (window as any).navigate(r), route);
      await page.waitForURL(new RegExp(`#${route.replace('/', '\\/')}$`));
      await dismissFloatingToasts(page);
      await dismissScheduleDocPrompt(page); // see Guardian Inventory loop's comment above
      if (headingHint) {
        await page.getByRole('heading', { name: new RegExp(headingHint) }).first().scrollIntoViewIfNeeded();
        await page.waitForTimeout(200);
      }
      await page.screenshot({ path: path.join(OUT, file), quality: 82, type: 'jpeg' });
    }
  });

  test('capture: Initial Guardianship Plan -- cover, Q2-3, ADL grid, directives, signatures', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, GUARDIAN_WARD, 'planInitial');
    await dismissFloatingToasts(page);
    await fillMinimalValidPlanInitialWard(page);

    const shots: Array<[string, string]> = [
      ['/', 'plan-initial-cover.jpg'],
      ['/p2', 'plan-initial-p2.jpg'],
      ['/p6', 'plan-initial-adl.jpg'],
      ['/p8', 'plan-initial-directives.jpg'],
      ['/p9', 'plan-initial-signatures.jpg'],
    ];
    for (const [route, file] of shots) {
      await page.evaluate((r) => (window as any).navigate(r), route);
      await page.waitForURL(new RegExp(`#${route.replace('/', '\\/')}$`));
      await dismissFloatingToasts(page);
      await page.screenshot({ path: path.join(OUT, file), quality: 82, type: 'jpeg' });
    }
  });

  test('capture: Annual Guardianship Plan -- cover, rights, insurance, residences, ADL, remuneration, signatures', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, GUARDIAN_WARD, 'planAnnual');
    await dismissFloatingToasts(page);
    await fillMinimalValidPlanAnnualWard(page);

    const shots: Array<[string, string]> = [
      ['/', 'plan-annual-cover.jpg'],
      ['/p6', 'plan-annual-rights.jpg'],
      ['/p4', 'plan-annual-insurance.jpg'],
      ['/p2', 'plan-annual-residences.jpg'],
      ['/p7', 'plan-annual-adl.jpg'],
      ['/p10', 'plan-annual-remuneration.jpg'],
      ['/p11', 'plan-annual-signatures.jpg'],
    ];
    for (const [route, file] of shots) {
      await page.evaluate((r) => (window as any).navigate(r), route);
      await page.waitForURL(new RegExp(`#${route.replace('/', '\\/')}$`));
      await dismissFloatingToasts(page);
      await page.screenshot({ path: path.join(OUT, file), quality: 82, type: 'jpeg' });
    }
  });

  test('capture: Simplified Annual Plan -- Questions 1-9', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, GUARDIAN_WARD, 'planSimplified');
    await dismissFloatingToasts(page);
    await fillMinimalValidPlanSimplifiedWard(page);
    await page.evaluate(() => (window as any).navigate('/p2'));
    await page.waitForURL(/#\/p2$/);
    await dismissFloatingToasts(page);
    await page.screenshot({ path: path.join(OUT, 'plan-simplified-questions.jpg'), quality: 82, type: 'jpeg' });
  });

  test('capture: Annual Plan -- Minors -- education, cover, preparer & attorney', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, MINOR_WARD, 'planMinor');
    await dismissFloatingToasts(page);
    await fillMinimalValidPlanMinorWard(page);

    const shots: Array<[string, string]> = [
      ['/p5', 'plan-minor-education.jpg'],
      ['/', 'plan-minor-cover.jpg'],
      ['/p7', 'plan-minor-preparer.jpg'],
    ];
    for (const [route, file] of shots) {
      await page.evaluate((r) => (window as any).navigate(r), route);
      await page.waitForURL(new RegExp(`#${route.replace('/', '\\/')}$`));
      await dismissFloatingToasts(page);
      await page.screenshot({ path: path.join(OUT, file), quality: 82, type: 'jpeg' });
    }
  });

  test('capture: Print Preview page (Guardian Inventory)', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, GUARDIAN_WARD, 'guardian');
    await dismissFloatingToasts(page);
    await fillMinimalValidGuardianWard(page);
    await page.evaluate(() => (window as any).navigate('/print'));
    await page.waitForURL(/#\/print$/);
    await dismissFloatingToasts(page);
    await page.locator('button:has-text("Save as PDF")').first().waitFor({ state: 'visible' });
    await page.screenshot({ path: path.join(OUT, 'print-preview.jpg'), quality: 82, type: 'jpeg' });
  });

  test('capture: sidebar save controls and dark mode', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, GUARDIAN_WARD, 'guardian');
    await dismissFloatingToasts(page);
    await fillMinimalValidGuardianWard(page);
    // fillMinimalValidGuardianWard() only mutates window.D -- it does not
    // itself re-render, so the cover page's own inputs were still showing
    // whatever was on screen from before the fill (blank, immediately after
    // ward creation) until this navigate() forces a fresh render off the
    // now-populated data. Confirmed live: a first attempt without this line
    // shot an entirely blank cover for both figures below.
    await page.evaluate(() => (window as any).navigate('/'));
    await page.waitForURL(/#\/$/);

    await page.click('#save-controls-toggle-btn');
    await page.locator('#save-controls-body').waitFor({ state: 'visible' });
    await page.waitForTimeout(200);
    await page.screenshot({ path: path.join(OUT, 'sidebar-save-controls.jpg'), quality: 82, type: 'jpeg' });

    await page.click('[data-shell-action="toggle-theme"]');
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(OUT, 'dark-mode.jpg'), quality: 82, type: 'jpeg' });
  });

  // Help-panel-driven captures (Manage Shared Records, guided tour, Activity
  // Log) all go through /dashboard, matching the one context this exact
  // #help-toggle-btn -> #help-panel sequence is already proven reliable in
  // (this file's own pre-existing dashboard capture test, above). A first
  // attempt drove this from a Guardian Inventory cover page instead and hit
  // a genuine timeout waiting for #help-panel to become visible after the
  // same click that works fine from dashboard -- rather than chase why one
  // route's help toggle didn't open reliably (a real app question, but not
  // this milestone's branding scope), this uses the route already known to
  // work.
  test('capture: Manage Shared Records, guided tour, Activity Log (via dashboard help panel)', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, GUARDIAN_WARD, 'guardian');
    await dismissFloatingToasts(page);
    await fillMinimalValidGuardianWard(page);
    await page.evaluate(() => (window as any).navigate('/dashboard'));
    await page.waitForURL(/#\/dashboard/);
    await dismissFloatingToasts(page);

    // Help panel footer buttons -- index.html's #help-panel-footer:
    // data-shell-action="start-walkthrough"/"export-help"/"activity-log"/
    // "party-management".
    await page.click('#help-toggle-btn');
    await page.locator('#help-panel').waitFor({ state: 'visible' });
    await page.click('[data-shell-action="party-management"]');
    await page.getByRole('heading', { name: 'Manage Shared Records' }).waitFor({ state: 'visible' });
    await page.screenshot({ path: path.join(OUT, 'manage-shared-records.jpg'), quality: 82, type: 'jpeg' });

    await page.evaluate(() => (window as any).navigate('/dashboard'));
    await page.waitForURL(/#\/dashboard/);
    await dismissFloatingToasts(page);
    await page.click('#help-toggle-btn');
    await page.locator('#help-panel').waitFor({ state: 'visible' });
    await page.click('[data-shell-action="start-walkthrough"]');
    // Whichever the tour's first step is -- MILESTONE-66-PROPOSAL.md records
    // that the stale figure's alt text ("highlighting the filing progress
    // card") no longer matches any current step, a content drift beyond
    // this pass's branding scope, noted rather than silently forced to fit.
    await page.locator('#walkthrough-tooltip').waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(OUT, 'guided-tour-step.jpg'), quality: 82, type: 'jpeg' });
    // Escape does NOT close the walkthrough (confirmed live: it left the
    // tooltip open through a subsequent navigate(), which then hung the
    // browser context's teardown for the full test timeout with no other
    // error surfaced). skipWalkthrough() -- index.html's own "Skip Tour"
    // button, data-shell-action="skip-walkthrough" -- is the real close path.
    await page.click('[data-shell-action="skip-walkthrough"]');
    await page.locator('#walkthrough-tooltip').waitFor({ state: 'hidden' }).catch(() => {});

    await page.evaluate(() => (window as any).navigate('/dashboard'));
    await page.waitForURL(/#\/dashboard/);
    await dismissFloatingToasts(page);
    await page.click('#help-toggle-btn');
    await page.locator('#help-panel').waitFor({ state: 'visible' });
    await page.click('[data-shell-action="activity-log"]');
    await page.getByRole('heading', { name: 'Activity Log' }).waitFor({ state: 'visible' });
    await page.screenshot({ path: path.join(OUT, 'activity-log.jpg'), quality: 82, type: 'jpeg' });
  });
});

test.afterAll(() => {
  const expectedFiles = [
    'signature-draw.jpg',
    'signature-applied.jpg',
    'dashboard.jpg',
    'resources.jpg',
    'help-panel.jpg',
    'preview-blocked.jpg',
    'blocked-preview-probe.json',
    'd4-bond.jpg',
    'd5-certificate.jpg',
    // Milestone 66 Finding 9 completion -- 55 more figures (the 56th, the
    // Initial Inventory cover, is also spliced into help/index.html for the
    // workspace-overview figure, so it appears twice in the guide but is
    // captured once here).
    'start-dialog.jpg', 'protect-data-dialog.jpg', 'unlock-dialog.jpg',
    'start-new-form.jpg', 'active-filing-dropdown.jpg',
    'inventory-a1-empty.jpg', 'inventory-cover.jpg', 'inventory-summary.jpg',
    'inventory-a1.jpg', 'inventory-a2.jpg', 'inventory-b1.jpg', 'inventory-b2.jpg',
    'inventory-b3.jpg', 'inventory-b4.jpg', 'inventory-c1.jpg', 'inventory-c2.jpg',
    'inventory-c4.jpg', 'inventory-c5.jpg', 'inventory-d1.jpg', 'inventory-d2.jpg',
    'inventory-d3.jpg', 'inventory-c3-verified.jpg', 'inventory-supporting-docs.jpg',
    'simplified-cover.jpg', 'simplified-partII.jpg', 'simplified-partIV.jpg',
    'simplified-partVI.jpg', 'simplified-partVII.jpg',
    'annual-cover.jpg', 'annual-scha.jpg', 'annual-schb4.jpg', 'annual-p67.jpg', 'annual-p9-bond.jpg',
    'plan-initial-cover.jpg', 'plan-initial-p2.jpg', 'plan-initial-adl.jpg',
    'plan-initial-directives.jpg', 'plan-initial-signatures.jpg',
    'plan-annual-cover.jpg', 'plan-annual-rights.jpg', 'plan-annual-insurance.jpg',
    'plan-annual-residences.jpg', 'plan-annual-adl.jpg', 'plan-annual-remuneration.jpg',
    'plan-annual-signatures.jpg',
    'plan-simplified-questions.jpg',
    'plan-minor-education.jpg', 'plan-minor-cover.jpg', 'plan-minor-preparer.jpg',
    'print-preview.jpg',
    'sidebar-save-controls.jpg', 'manage-shared-records.jpg', 'guided-tour-step.jpg',
    'activity-log.jpg', 'dark-mode.jpg',
  ];

  const actualFiles = fs.readdirSync(OUT).filter((f) => fs.statSync(path.join(OUT, f)).isFile());
  expect(new Set(actualFiles), 'Expected exact output inventory without unexpected files').toEqual(new Set(expectedFiles));

  for (const file of expectedFiles) {
    const filePath = path.join(OUT, file);
    expect(fs.existsSync(filePath), `Expected capture output ${file} to exist`).toBe(true);
    if (file.endsWith('.jpg')) {
      const stat = fs.statSync(filePath);
      expect(stat.size, `Expected ${file} to be nonzero size`).toBeGreaterThan(0);
      expect(stat.size, `Expected ${file} to be <= 150 KiB (153,600 bytes)`).toBeLessThanOrEqual(153600);
    }
  }

  const probePath = path.join(OUT, 'blocked-preview-probe.json');
  const probe = JSON.parse(fs.readFileSync(probePath, 'utf8'));
  expect(probe).toHaveProperty('blockedBannerHasAllFilings');
  expect(probe).toHaveProperty('blockedBannerHasTheme');
  expect(probe).toHaveProperty('blockedBannerHasHelp');
  expect(probe).toHaveProperty('previewBlocked');
});
