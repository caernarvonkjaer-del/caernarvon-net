import { test, expect, type Page } from '@playwright/test';
import { freshStartNoPassword, createWard } from './support/target';

// Milestone 74J-2 (answered 2026-10-16 as Pinellas Clerk practice; decision
// 74J-N1), through the real pages: a Final Accounting's sidebar has a Final
// Report page, asked like a schedule -- each of its two lists answered by a
// row or by "I verify there are none", the mark unfinished until both are.
// An Annual Accounting has no such page.

const go = (page: Page, route: string) => page.evaluate((r) => (window as any).GuardianForms.testing.navigate(r), route);
const filing = (page: Page) => page.evaluate(() => (window as any).GuardianForms.testing.snapshot().filing);
const mark = (page: Page) => page.evaluate(() => (window as any).GuardianForms.testing.status.navChecks().checks['a-final']);

test("a Final Accounting's Final Report page: a list ticked none, the other answered by a row; an Annual has no such page", async ({ page }) => {
  test.setTimeout(120_000);
  await freshStartNoPassword(page);
  await createWard(page, 'Final Report Ward', 'finalAccounting');
  const link = page.locator('[data-nav="a-final"]');
  // The link carries its mark beside the label.
  await expect(link).toContainText('Final Report — Rule 5.680(c)');
  // (Its sidebar section opens on the current page, as every section does.)
  await go(page, '/final');
  await expect(link).toBeVisible();
  await expect(page.locator('#main-content h1')).toContainText('Final Report — Rule 5.680(c)');
  expect(await mark(page), 'unanswered: the page is unfinished').toBe(false);

  await page.locator('#main-content input[data-schedule="finalreserved"]').check();
  await page.locator('#main-content [data-annual-action="add-row"][data-collection="finalTurnover"]').click();
  await page.locator('#main-content input[data-annual-path="finalTurnover.0.asset"]').fill('Checking account at First Bank');
  await page.locator('#main-content input[data-annual-path="finalTurnover.0.recipient"]').fill('Jane Heir, daughter');
  await page.locator('#main-content input[data-annual-path="finalTurnover.0.recipient"]').blur();
  await expect.poll(() => mark(page), { message: 'both lists answered' }).toBe(true);
  const saved = await filing(page);
  expect([saved.scheduleNoItems?.finalreserved, saved.finalTurnover]).toEqual([true, [{ asset: 'Checking account at First Bank', recipient: 'Jane Heir, daughter' }]]);

  await createWard(page, 'Annual Without Final Report', 'annual');
  await go(page, '/');
  await expect(page.locator('[data-nav="a-final"]')).toHaveCount(0);
});
