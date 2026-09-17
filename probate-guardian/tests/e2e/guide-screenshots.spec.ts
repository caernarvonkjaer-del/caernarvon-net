import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { freshStartNoPassword, createWard } from './support/target';

// Milestone 56G: capture harness for help/index.html's figures.
//
// NOT part of the regression suite -- it asserts nothing about behaviour and
// writes files. Unless PG_CAPTURE=1 it registers no tests at all, so a full
// `npx playwright test` run never executes it (see the gating note below). It
// lives in the repo rather than in a scratch directory so a future re-shoot
// reproduces the same conditions, which is the whole point of G1's pinned
// capture table:
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
// Run: PG_TARGET=web PG_CAPTURE=1 npx playwright test tests/e2e/guide-screenshots.spec.ts

const OUT = process.env.PG_CAPTURE_DIR || path.join(process.cwd(), '.guide-shots');
const WARD = 'Eleanor Marie Whitfield';
const CAPTURING = process.env.PG_CAPTURE === '1';

// Gated by DEFINING nothing rather than by test.skip(). The suite's
// skip-classification-audit.spec.ts (Milestone 31, Phase 0.3) requires every
// dynamic skip to go through target-profile.ts's three classified helpers --
// skipExpectedTargetExclusion / skipEnvironmentLimitation / skipTemporaryGap
// -- so a skip reason is always machine-classifiable. None of the three
// describes this file: it is not a target exclusion, not an environment
// limitation, and not a temporary gap. It is a capture harness that is not a
// test at all. So it registers zero tests in an ordinary run instead of three
// unclassifiable skips, which is also the more honest report -- these were
// never tests waiting to be enabled.
//
// (An earlier revision did call test.skip() here and the audit caught it in
// the closing full-suite run, which is the audit working exactly as intended.)
const capture = CAPTURING ? test : (() => {}) as unknown as typeof test;

if (CAPTURING) {
  test.use({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1, colorScheme: 'light' });
  test.beforeAll(() => fs.mkdirSync(OUT, { recursive: true }));
}

capture('capture: signature Draw tab and applied stamp', async ({ page }) => {
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
  const box = await canvas.boundingBox();
  if (box) {
    await page.mouse.move(box.x + 30, box.y + box.height * 0.6);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * 0.4, box.y + box.height * 0.25);
    await page.mouse.move(box.x + box.width * 0.7, box.y + box.height * 0.7);
    await page.mouse.up();
  }
  await page.getByRole('button', { name: /Apply Signature/i }).first().click();
  await page.waitForTimeout(400);
  await panel.screenshot({ path: path.join(OUT, 'signature-applied.jpg'), quality: 82, type: 'jpeg' });
});

capture('capture: dashboard toolbar, Helpful Resources, Help panel', async ({ page }) => {
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
capture('probe: does a blocked preview carry the shell actions?', async ({ page }) => {
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
