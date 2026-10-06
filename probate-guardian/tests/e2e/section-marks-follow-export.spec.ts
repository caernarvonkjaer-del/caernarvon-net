import { test, expect, type Page } from '@playwright/test';
import {
  freshStartNoPassword, createWard, fillMinimalValidAnnualWard, fillMinimalValidPlanAnnualWard, fillMinimalValidGuardianWard,
  acceptDynDialog,
} from './support/target';

// Milestone 73F part 2: one answer to "is this section complete?". The
// sidebar's marks, the page's "Complete these items" list, the dashboard and
// Print Preview all read the export checks' own answer, so a page can't show
// ✓ while Preview blocks it, and an incomplete page always names what it
// needs. Through the real pages:

const go = (page: Page, route: string) => page.evaluate((r) => (window as any).GuardianForms.testing.navigate(r), route);
const patch = (page: Page, shape: Record<string, unknown>) => page.evaluate((s) => (window as any).GuardianForms.testing.patchFiling(s), shape);
const mark = (page: Page, key: string) => page.evaluate((k) => (window as any).GuardianForms.testing.status.navChecks().checks[k], key);
const guidance = (page: Page) => page.locator('#main-content #page-local-guidance');

function watchErrors(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  return errors;
}

test('the Annual Plan\'s Signatures page: a guardian without a phone is − and the page names it (it showed ✓ while export blocked)', async ({ page }) => {
  test.setTimeout(180_000);
  const errors = watchErrors(page);
  await freshStartNoPassword(page);
  await createWard(page, 'Marks Plan Annual', 'planAnnual');
  await fillMinimalValidPlanAnnualWard(page);
  await patch(page, { 'planGuardians.0.phone': '' });
  await go(page, '/p11');
  expect(await mark(page, 'pa-p11'), 'the sidebar marks Signatures unfinished').toBe(false);
  await expect(page.locator('#nav-sections [data-nav="pa-p11"] .nav-check.incomplete')).toHaveCount(1);
  await expect(guidance(page)).toContainText('Guardian phone number is required');
  // Entering it completes the page.
  await page.locator('input[data-field-path="planGuardians.0.phone"]').fill('(727) 555-0100');
  await page.locator('input[data-field-path="planGuardians.0.phone"]').blur();
  await expect.poll(() => mark(page, 'pa-p11')).toBe(true);
  await expect(guidance(page)).toBeEmpty();
  expect(errors).toEqual([]);
});

test('an impossible date: Part I is − and its page names the date (the sidebar ignored a date still being typed)', async ({ page }) => {
  test.setTimeout(180_000);
  const errors = watchErrors(page);
  await freshStartNoPassword(page);
  await createWard(page, 'Marks Bad Date', 'annual');
  await fillMinimalValidAnnualWard(page);
  await go(page, '/');
  expect(await mark(page, 'a-p1')).toBe(true);
  const gid = page.locator('input[data-field-path="gid"]').first();
  await gid.fill('02/30/2025');
  await gid.blur();
  await expect.poll(() => mark(page, 'a-p1'), { message: 'an impossible GID holds Part I back' }).toBe(false);
  await expect(guidance(page)).not.toBeEmpty();
  await expect(guidance(page).locator('[data-form-action="jump-to-field"][data-field-path="gid"]')).toHaveCount(1);
  expect(errors).toEqual([]);
});

test('Preview after "Continue despite outstanding requirements": the banner says what is still outstanding, not "Ready to export"', async ({ page }) => {
  test.setTimeout(180_000);
  const errors = watchErrors(page);
  await freshStartNoPassword(page);
  await createWard(page, 'Marks Override', 'annual');
  await fillMinimalValidAnnualWard(page);
  await patch(page, { amendedForm: '' });
  await go(page, '/print');
  const status = page.locator('.print-preview-banner [data-preview-status]');
  await expect(status).toContainText('1 issue');
  await expect(status).not.toContainText('issue(s)');
  await page.locator('#print-doc-container [data-preview-action="override"]').click();
  await acceptDynDialog(page);
  await expect(status).toContainText('Continuing with 1 item outstanding');
  await expect(page.locator('#print-doc-container .pdf-page').first()).toBeVisible({ timeout: 30_000 });
  expect(errors).toEqual([]);
});

test('Preview counts sections by page, as the sidebar does: Part I and Part III are two, not one "Part"', async ({ page }) => {
  test.setTimeout(180_000);
  const errors = watchErrors(page);
  await freshStartNoPassword(page);
  await createWard(page, 'Marks Sections', 'annual');
  await fillMinimalValidAnnualWard(page);
  await patch(page, { amendedForm: '', 'guardians.0.phone': '' });
  await go(page, '/print');
  const blocked = page.locator('#print-doc-container .pdf-preview-blocked');
  await expect(blocked.locator('.pdf-preview-blocked-summary')).toContainText('2 required items still missing, across 2 sections.');
  await expect(blocked.locator('.pdf-preview-blocked-section')).toHaveText(['Part I', 'Part III']);
  // The missing-items panel counts the same way.
  await expect(page.locator('.validation-panel .validation-sub', { hasText: 'listed below' })).toContainText('Across 2 sections');
  expect(errors).toEqual([]);
});

test('the Inventory\'s D-1 list says whose detail is missing ("Guardian #2 — Phone", not "Phone")', async ({ page }) => {
  test.setTimeout(180_000);
  const errors = watchErrors(page);
  await freshStartNoPassword(page);
  await createWard(page, 'Marks Owner', 'guardian');
  await fillMinimalValidGuardianWard(page);
  await page.evaluate(() => {
    const T = (window as any).GuardianForms.testing;
    T.patchFiling({ guardians: [...T.field('guardians'), { name: 'Second Guardian' }] });
  });
  await go(page, '/d1');
  await expect(guidance(page)).toContainText('Guardian #2 — Phone');
  await expect(guidance(page)).not.toContainText(/👉\s*Phone\b/);
  expect(errors).toEqual([]);
});
