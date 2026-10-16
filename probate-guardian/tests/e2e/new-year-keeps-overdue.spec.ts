import { test, expect, type Page } from '@playwright/test';
import { freshStartNoPassword, createSimplifiedWard } from './support/target';

// Milestone 74K (decisions 74K-1 and 74K-2, the requester, 2026-10-06; QA
// report BUG-20, UX-06), through the dashboard card's real New year button:
// a Simplified Accounting for 07/01/2023-06/30/2024, still Draft and past its
// 10/01/2024 due date. The dialog says so; after the new year starts, the
// dashboard keeps the old year in view as overdue, and the new year's Period
// From is the day after the old Period To. Before, the row read "No
// deadline" and the unfiled year was reachable only through Prior years.
// The period is long past, so the case holds whatever today is.

const snapshot = (page: Page) => page.evaluate(() => (window as any).GuardianForms.testing.snapshot());
const navigate = (page: Page, route: string) => page.evaluate((r) => (window as any).GuardianForms.testing.navigate(r), route);

async function clearOverlays(page: Page) {
  const reminder = page.locator('[data-shell-action="hide-auto-export-reminder"]');
  if (await reminder.isVisible().catch(() => false)) await reminder.click();
}

test('a new year over an overdue, unfiled year: the dialog says so, the dashboard keeps it, Period From is the day after', async ({ page }) => {
  test.setTimeout(120_000);
  await freshStartNoPassword(page);
  await createSimplifiedWard(page, 'Overdue Ward');
  await page.evaluate(() => {
    const w = window as any;
    w.GuardianForms.testing.patchFiling({ periodFrom: '2023-07-01', periodTo: '2024-06-30' }); // setup (D9)
    return w.GuardianForms.testing.save.flush();
  });
  const wardId = (await snapshot(page)).filing.wardId;

  await navigate(page, '/dashboard');
  await clearOverlays(page);
  await page.locator(`[data-dashboard-action="new-year"][data-ward-id="${wardId}"]`).click();
  const unfiled = page.locator('#new-year-unfiled');
  await expect(unfiled).toBeVisible();
  await expect(unfiled).toHaveText('2023-2024 is still marked Draft and was due 10/01/2024. Starting the new year keeps 2023-2024 under Prior years; the dashboard keeps showing it as overdue until it is marked filed.');
  await page.locator('[data-modal-action="start-new-year"]').click();
  await page.waitForFunction((id) => (window as any).GuardianForms.testing.snapshot().caseFile.wards.find((x: any) => x.wardId === id)?.activeYearKey === 'Year 2', wardId);

  const opened = (await snapshot(page)).filing;
  expect([opened.periodFrom, opened.periodTo]).toEqual(['2024-07-01', '']);

  await navigate(page, '/dashboard');
  await clearOverlays(page);
  await expect(page.locator(`[data-dashboard-ward-id="${wardId}"] [data-earlier-year-overdue]`)).toHaveText('Earlier year overdue: 2023-2024, due 10/01/2024');
  await expect(page.locator('.dashboard-stat-action .dashboard-stat-num')).toHaveText('1');
});
