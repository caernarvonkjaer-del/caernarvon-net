import { expect, test, type Page } from '@playwright/test';
import { freshStartNoPassword } from './support/target';

// Milestone 63F. Three pages are marked incomplete by a sidebar rule the export validators do not have (or,
// for Simplified Part III, whose messages the validator files under the Cover):
//
//   Simplified Part III            the sidebar wants the two period dates -- the validator files them under
//                                  the Cover, though the same fields are rendered on Part III
//   Plan - Annual, 3G Benefits     a benefit answered, or "None of the above", or "Other" -- no validator rule
//   Plan - Minors, Preparer &      preparer name, attorney name, attorney signature date -- no validator rule
//   Attorney
//
// The sidebar asks "have you finished with this page?"; the export gate asks "does this satisfy the court?",
// and they are allowed to differ. So the box on these pages could show only a generic sentence -- the filer
// was told the page was unfinished and not what was missing. It now lists what is missing, each item a link
// that jumps to the field.
//
// section-guidance-invariant.spec.ts is the walk that found these (it is strict now: no exemptions). What only
// this file can prove is PARITY: each list is derived from the sidebar's own rule, so doing exactly what the
// list says must turn the sidebar mark green and clear the box. A list that drifted from the rule would leave
// a filer who followed it still marked incomplete.

const box = (page: Page) => page.locator('#page-local-guidance .section-local-guidance');
const mark = (page: Page, nav: string) => page.locator(`[data-nav="${nav}"] .nav-check`);

async function open(page: Page, type: string, route: string) {
  await freshStartNoPassword(page);
  await page.evaluate(([t]) => (window as any).GuardianForms.testing.createFiling.add(`Wants ${t}`, t), [type]);
  await page.evaluate((r) => (window as any).GuardianForms.testing.navigate(r), route);
  await page.locator('#main-content h1').first().waitFor();
}

// Milestone 70, 70T (D9): the edits these tests make are what is under test --
// the sidebar mark and the box must follow the filer's own edit -- so they go
// through GuardianForms.testing.setField() on the page showing the field, with
// no forced sidebar refresh (the spec used to write the data raw and then call
// updateNavDots() itself, which a real edit may or may not do).
const edit = (page: Page, path: string, value: unknown) =>
  page.evaluate(([p, v]) => (window as any).GuardianForms.testing.setField(p, v), [path, value] as const);

test.describe('Simplified Part III: the two period dates', () => {
  test('lists both dates as links that land on Part III, and entering them clears the box and turns the mark green', async ({ page }) => {
    await open(page, 'simplified', '/p3');
    await expect(mark(page, 's-p3')).toHaveClass(/incomplete/);

    await expect(box(page)).toBeVisible();
    await expect(box(page).getByRole('button', { name: /Period From/i })).toBeVisible();
    await expect(box(page).getByRole('button', { name: /Period To/i })).toBeVisible();

    // The link lands on the field on THIS page -- it must not send the filer to the Cover.
    await box(page).getByRole('button', { name: /Period From/i }).click();
    expect(await page.evaluate(() => (window as any).GuardianForms.testing.snapshot().currentPage)).toBe('/p3');
    await expect(page.locator('#main-content input[data-field-path="periodFrom"]')).toBeFocused();

    await edit(page, 'periodFrom', '2026-01-01');
    await edit(page, 'periodTo', '2026-12-31');
    await expect(mark(page, 's-p3')).toHaveClass(/\bcomplete\b/);
    await expect(box(page)).toHaveCount(0);
  });

  test('only the date that is still missing is listed', async ({ page }) => {
    await open(page, 'simplified', '/p3');
    await edit(page, 'periodFrom', '2026-01-01');
    await expect(box(page).getByRole('button', { name: /Period To/i })).toBeVisible();
    await expect(box(page).getByRole('button', { name: /Period From/i })).toHaveCount(0);
  });
});

test.describe('Plan - Annual 3G Insurance & Benefits: one benefit answered, or None, or Other', () => {
  test('names the choice, links to it, and ticking None turns the mark green and clears the box', async ({ page }) => {
    await open(page, 'planAnnual', '/p4');
    await expect(mark(page, 'pa-p4')).toHaveClass(/incomplete/);

    await expect(box(page)).toBeVisible();
    const item = box(page).getByRole('button', { name: /benefit|None of the above/i }).first();
    await expect(item).toBeVisible();
    await item.click();
    await expect(page.locator('#main-content input[data-form-path="q3BenefitsNone"]')).toBeFocused();

    await page.locator('#main-content input[data-form-path="q3BenefitsNone"]').check();
    await expect(mark(page, 'pa-p4')).toHaveClass(/\bcomplete\b/);
    await expect(box(page)).toHaveCount(0);
  });

  test('answering any benefit satisfies it too — the list and the rule agree', async ({ page }) => {
    await open(page, 'planAnnual', '/p4');
    const first = await page.evaluate(() => Object.keys((window as any).GuardianForms.testing.field('benefits') || {})[0]);
    await edit(page, `benefits.${first}.eligible`, 'Yes');
    await expect(mark(page, 'pa-p4')).toHaveClass(/\bcomplete\b/);
    await expect(box(page)).toHaveCount(0);
  });
});

// Milestone 71B: this page's sidebar rule is now validatePlanMinor()'s own --
// the preparer and the attorney are each optional until started, then need a
// name and a valid signature -- so it is no longer a sidebar-only rule and the
// validator's messages explain it. Until 71B this test pinned the old rule
// (three names and a date, always), under which a filer with no attorney could
// never finish the page; and the box's own list would have told a filer who
// started only an attorney to add a preparer as well.
test.describe('Plan - Minors Preparer & Attorney: each role optional until started (Milestone 71B)', () => {
  test('a blank page is finished; a started attorney lists only what that attorney lacks, and supplying it turns the mark green', async ({ page }) => {
    await open(page, 'planMinor', '/p7');
    await expect(mark(page, 'pm-p7'), 'no preparer and no attorney: nothing to finish').toHaveClass(/\bcomplete\b/);
    await expect(box(page)).toHaveCount(0);

    await edit(page, 'attorney_signatureDate', '2027-01-15');
    await expect(mark(page, 'pm-p7')).toHaveClass(/incomplete/);
    await expect(box(page).getByRole('button', { name: /Attorney name is required/i })).toBeVisible();
    await expect(box(page).getByRole('button', { name: /Preparer/i }), 'a preparer was never started, so none is asked for').toHaveCount(0);

    // Milestone 72C: a started attorney also needs a primary email, as on
    // every other form, so the name alone leaves exactly that outstanding.
    await edit(page, 'attorney_name', 'An Attorney');
    await expect(mark(page, 'pm-p7')).toHaveClass(/incomplete/);
    await expect(box(page).getByRole('button', { name: /Attorney email is required/i })).toBeVisible();

    await edit(page, 'attorney_email', 'attorney@example.com');
    await expect(mark(page, 'pm-p7')).toHaveClass(/\bcomplete\b/);
    await expect(box(page)).toHaveCount(0);
  });
});
