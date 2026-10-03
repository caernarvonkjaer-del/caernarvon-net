import { test, expect, type Page } from '@playwright/test';
import { freshStartNoPassword, createWard } from './support/target';

// Milestone 72I. On the Inventory's and the Annual's Cover, the question "No
// attorney is entered. Why is this guardian filing without one?" shares the
// page with Type of Guardianship. Choosing "Guardian Advocate" there showed no
// hint pointing at the matching answer until the filer left the Cover and came
// back: the hint was built only when the page was drawn. Now it follows the
// dropdown as the filer uses it -- and it stays a hint, never an answer.

const hint = (page: Page) => page.locator('#main-content [data-attorney-waiver-basis] [data-waiver-advocate-hint]');
const typeSelect = (page: Page) => page.locator('#main-content select[data-form-path="typeOfGuardianship"], #main-content select[data-bind="typeOfGuardianship"]').first();
const field = (page: Page, p: string) => page.evaluate((x) => (window as any).GuardianForms.testing.field(x), p);

for (const type of ['guardian', 'annual'] as const) {
  test(`${type}: the Guardian Advocate hint appears as soon as it is chosen, and goes with Plenary or a chosen reason`, async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, `Advocate Hint ${type}`, type);
    await page.evaluate(() => (window as any).GuardianForms.testing.navigate('/'));
    await expect(page.locator('#main-content [data-attorney-waiver-basis]')).toBeVisible();
    await expect(hint(page)).toHaveCount(0);

    await typeSelect(page).selectOption('Guardian Advocate');
    await expect(hint(page), 'at once, without leaving the Cover').toBeVisible();
    expect(await field(page, 'attorneyWaiverBasis'), 'a hint, never an automatic answer').toBe('');

    await typeSelect(page).selectOption('Plenary');
    await expect(hint(page)).toHaveCount(0);

    await typeSelect(page).selectOption('Guardian Advocate');
    await expect(hint(page)).toBeVisible();
    await page.locator('#attorney_waiver_basis_court-order').check();
    await expect.poll(() => field(page, 'attorneyWaiverBasis')).toBe('court-order');
    await expect(hint(page), 'a reason is chosen').toHaveCount(0);
  });
}
