import { expect, test, type Page } from '@playwright/test';
import { freshStartNoPassword } from './support/target';

// Milestone 63E. Every filing type's Cover has an optional UCN (Uniform Case Number) field beside Case
// Number. It is kept exactly as typed -- it is NOT run through the Case Number formatter, which would
// reshape a 20-character UCN into something the court cannot match -- it persists, and leaving it blank
// changes nothing (no validation error, no placeholder). The print side is proved in
// pdf-form-specific.spec.ts and tests/unit/ucn-header.spec.js.
//
// Each filing type's cover binds its inputs its own way (data-bind, data-field-path or data-annual-path), so
// the field is found by whichever of those carries the path.

const TYPES = [
  { label: 'Initial Inventory', type: 'guardian' },
  { label: 'Annual Accounting', type: 'annual' },
  { label: 'Simplified Accounting', type: 'simplified' },
  { label: 'Plan - Simplified', type: 'planSimplified' },
  { label: 'Plan - Initial', type: 'planInitial' },
  { label: 'Plan - Annual', type: 'planAnnual' },
  { label: 'Plan - Minor', type: 'planMinor' },
] as const;

const ucnInput = (page: Page) => page.locator(
  '#main-content input[data-bind="ucn"], #main-content input[data-field-path="ucn"], #main-content input[data-annual-path="ucn"]',
).first();

const UCN = '50-2026-ga-000123-xxxx-xx';   // deliberately lower-case: kept as typed, not case-folded or reformatted

for (const { label, type } of TYPES) {
  test(`${label}: the Cover's UCN is kept as typed, persists across navigation, and is optional`, async ({ page }) => {
    await freshStartNoPassword(page);
    await page.evaluate(([t]) => (window as any).GuardianForms.testing.createFiling.add(`Ucn ${t}`, t), [type]);
    await page.evaluate(() => (window as any).GuardianForms.testing.navigate('/'));

    const input = ucnInput(page);
    await expect(input, `the ${label} Cover should have a UCN field`).toBeVisible();

    // Optional: blank by default, and it is not one of the things the filer is told is missing.
    await expect(input).toHaveValue('');
    // The open filing's own validator (70T: the first validator that happened
    // to be loaded is not necessarily this filing type's).
    const missingBefore: string[] = await page.evaluate(async () => {
      const raw = await (window as any).GuardianForms.testing.validate.open();
      return raw.map((e: any) => String(e?.message ?? e));
    });
    expect(missingBefore.filter((m) => /\bUCN\b/i.test(m)), 'a blank UCN is never reported as missing').toEqual([]);

    // Kept exactly as typed.
    await input.fill(UCN);
    await input.blur();
    await expect(input).toHaveValue(UCN);
    expect(await page.evaluate(() => (window as any).GuardianForms.testing.field('ucn')), 'stored exactly as typed').toBe(UCN);

    // Survives leaving the page and coming back.
    await page.evaluate(() => (window as any).GuardianForms.testing.navigate('/summary'));
    await page.evaluate(() => (window as any).GuardianForms.testing.navigate('/'));
    await expect(ucnInput(page)).toHaveValue(UCN);
  });
}

// Milestone 73S (decisions 73S-1, 73S-2, 73S-4, 73S-N1; the requester,
// 2026-10-04): every cover stars the UCN as a reminder -- the star hidden from
// a screen reader, which hears the box's hint instead, and nothing marks it
// required -- and Preview's "Review recommended" box reminds while it is blank
// or not in the UCN's 20-character shape. It never blocks and never changes a
// sidebar mark, in every county. Red-first: no star, no hint, no reminder.
const go = (page: Page, route: string) => page.evaluate((r) => (window as any).GuardianForms.testing.navigate(r), route);
const reminder = (page: Page) => page.locator('#main-content .alert-warning li', { hasText: 'The UCN' });
const marks = (page: Page) => page.evaluate(() => JSON.stringify((window as any).GuardianForms.testing.status.navChecks().checks));

for (const { label, type } of TYPES) {
  test(`${label}: the UCN is starred as a reminder, Preview reminds while it is blank or out of shape, and it never blocks`, async ({ page }) => {
    test.setTimeout(120_000);
    await freshStartNoPassword(page);
    await page.evaluate(([t]) => (window as any).GuardianForms.testing.createFiling.add(`Ucn Star ${t}`, t), [type]);
    await go(page, '/');

    const input = ucnInput(page);
    const id = await input.getAttribute('id');
    const star = page.locator(`#main-content label[for="${id}"] .req`);
    await expect(star, 'the UCN is starred').toHaveCount(1);
    await expect(star, 'the star is hidden from a screen reader').toHaveAttribute('aria-hidden', 'true');
    expect(await input.getAttribute('aria-required'), 'nothing marks it required').toBeNull();
    expect(await input.getAttribute('data-field-required')).toBeNull();
    const hint = await input.getAttribute('aria-describedby');
    await expect(page.locator(`[id="${hint}"]`), 'a screen reader hears what the star means').toHaveText('Starred as a reminder: export never stops for a blank UCN.');
    const blankMarks = await marks(page);

    await go(page, '/print');
    await expect(reminder(page), 'a blank UCN is a reminder').toContainText("The UCN is blank. Enter it from the Clerk's case record.");
    const missing: string[] = await page.evaluate(async () => (await (window as any).GuardianForms.testing.validate.open()).map((e: any) => String(e?.message ?? e)));
    expect(missing.filter((t) => /\bUCN\b/.test(t)), 'never a missing item').toEqual([]);

    await go(page, '/');
    await ucnInput(page).fill('26-000123-GD');
    await ucnInput(page).blur();
    await go(page, '/print');
    await expect(reminder(page), 'a Case Number in the UCN box is out of shape').toContainText(`The UCN "26-000123-GD" isn't in the UCN's 20-character shape`);

    await go(page, '/');
    await ucnInput(page).fill(UCN);
    await ucnInput(page).blur();
    await go(page, '/print');
    // The print page is drawn (every form's has the export reason line) before "no reminder" is judged.
    await expect(page.locator('#export-reason')).toBeAttached({ timeout: 20_000 });
    await expect(reminder(page), 'in shape: no reminder').toHaveCount(0);
    await go(page, '/');
    expect(await marks(page), 'the UCN never changes a sidebar mark').toBe(blankMarks);
  });
}
