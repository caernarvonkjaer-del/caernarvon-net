import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { freshStartNoPassword, createWard } from '../e2e/support/target';

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
  const reminder = page.locator('[data-shell-action="hide-auto-export-reminder"]');
  if (await reminder.count()) await reminder.click();
  const toast = page.locator('#pwa-status-notice');
  if (await toast.count()) {
    const d = toast.getByRole('button', { name: 'Dismiss', exact: true });
    if (await d.count()) await d.click();
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
  await page.locator('input[data-bind="bondAmount"]').fill('140000');
  await page.locator('input[data-field-path="bondPeriodFrom"]').fill('03/15/2026');
  await page.locator('input[data-field-path="bondPeriodTo"]').fill('03/15/2027');
  await page.locator('input[data-field-path="bondingCompany"]').fill('Western Surety Company');
  await page.locator('#yesno_bondWaived_no').check();
  await page.locator('[data-yes-no-group="bondWaived"]').click();
  await page.waitForTimeout(300);

  // The question this figure exists to show. Assert before shooting so a
  // silent miss (e.g. the toggle regressing back out of the page) cannot ship
  // a screenshot that fails to demonstrate its own caption.
  await expect(page.locator('[data-yes-no-group="bondWaived"]')).toBeVisible();
  await expect(page.locator('[data-yes-no-group="bondWaived"]')).toContainText('Has the surety bond been waived by court order?');

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
