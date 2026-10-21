import { test, expect, type Page } from '@playwright/test';
import { freshStartNoPassword, createWard } from './support/target';

// Milestone 77B: next year's report, from this one. A guardian testing the
// app wasn't sure the case was meant to carry into later reports ("I am not
// 100% sure if that is the final intent based on the demo"). It is -- each
// row's New year, and New Filing from Existing -- but nothing said so until a
// filer found the buttons. While the case has a filing, the dashboard now
// says how in one line (decision 77B-1), with a link to the guide's section;
// the dashboard tour gains a step for each (tests/unit/guided-tour-content).

const go = (page: Page, route: string) => page.evaluate((r) => (window as any).GuardianForms.testing.navigate(r), route);
const LINE = "Next year: use New year on a filing's row — it starts from this year's filing. Another form for the same ward: New Filing from Existing. How a case carries forward";

test('the dashboard says how a case carries forward once it has a filing, and links the guide', async ({ page }) => {
  test.setTimeout(120_000);
  await freshStartNoPassword(page);
  await go(page, '/dashboard');
  // A case with no filing yet (the start cards, not the filings list).
  await expect(page.locator('#main-content')).toBeVisible();
  await page.waitForTimeout(1000);
  await expect(page.locator('[data-dashboard-carry-over]'), 'nothing to carry yet').toHaveCount(0);

  await createWard(page, 'Carry Forward Ward', 'annual');
  await go(page, '/dashboard');
  const line = page.locator('[data-dashboard-carry-over]');
  await expect(line).toHaveText(LINE);
  // The buttons it names are on the page.
  await expect(page.locator('[data-dashboard-action="new-year"]').first()).toBeVisible();
  await expect(page.locator('[data-dashboard-action="select-existing"]')).toBeVisible();

  const popup = page.waitForEvent('popup');
  await line.getByRole('button', { name: 'How a case carries forward' }).click();
  const guide = await popup;
  expect(guide.url()).toMatch(/help\/index\.html#year$/);
  await guide.close();
});
