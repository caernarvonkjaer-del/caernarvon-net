import { test, expect, type Page } from '@playwright/test';
import { freshStartNoPassword, createWard } from './support/target';

// Milestone 74L, for a filer using a screen reader: what a box is called and
// what it says is wrong, read from the page as a screen reader gets it
// (Playwright's accessible name and description).

const navigate = (page: Page, route: string) => page.evaluate((r) => (window as any).GuardianForms.testing.navigate(r), route);
const DATE_ERROR = 'Enter a real date as MM/DD/YYYY, with a four-digit year.';

test.describe('74L: errors and groups a screen reader can read', () => {
  test('an impossible date is described by its error, beside its hint, and the error goes once the date is real', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Date Error Ward', 'planInitial');
    await navigate(page, '/');
    const box = page.getByRole('textbox', { name: /Guardianship Inception Date/ });

    await box.fill('02/30/2026');
    await box.press('Tab');
    await expect(box).toHaveAttribute('aria-invalid', 'true');
    await expect(box).toHaveAccessibleDescription(new RegExp(`Use MM/DD/YYYY.*${DATE_ERROR.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`));

    // Drawn again (away and back), the box still holding it still says so.
    await navigate(page, '/p2');
    await navigate(page, '/');
    await expect(box).toHaveValue('02/30/2026');
    await expect(box).toHaveAccessibleDescription(new RegExp(DATE_ERROR.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));

    await box.fill('02/28/2026');
    await box.press('Tab');
    await expect(box).not.toHaveAttribute('aria-invalid', 'true');
    await expect(box).toHaveAccessibleDescription(/^Use MM\/DD\/YYYY/);
    await expect(page.locator('[data-date-feedback]')).toHaveCount(0);
  });

  test('a Plan check group is a group named by its question; its first checkbox is named by its own label alone', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Group Name Ward', 'planInitial');

    // Question 2 has no caption of its own: the question's heading names it.
    await navigate(page, '/p2');
    const q2 = page.getByRole('group', { name: /^The guardian states the place and kind of residential setting best suited/ });
    await expect(q2).toBeVisible();
    await expect(q2.getByRole('checkbox').first()).toHaveAccessibleName('Assisted Living (ALF)');

    // The certification's "(Check all that apply)" names its group, not its first box.
    await navigate(page, '/p9');
    const cert = page.getByRole('group', { name: '(Check all that apply)' });
    await expect(cert).toBeVisible();
    const first = cert.getByRole('checkbox').first();
    await expect(first).not.toHaveAccessibleName(/Check all that apply/);
    expect((await first.evaluate((el) => (el as HTMLInputElement).labels?.[0]?.textContent || '')).trim().length).toBeGreaterThan(0);
  });

  test('the dashboard\'s Judge box is named for the column it sits in', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Judge Name Ward', 'guardian');
    await navigate(page, '/dashboard');
    await expect(page.getByRole('textbox', { name: 'Judge for Judge Name Ward' })).toBeVisible();
    await expect(page.getByRole('textbox', { name: /Assignee/ })).toHaveCount(0);
  });
});
