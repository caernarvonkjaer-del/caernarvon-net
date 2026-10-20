import { test, expect, type Page } from '@playwright/test';
import { freshStartNoPassword, createWard, createSimplifiedWard, gotoApp } from './support/target';

// Milestone 76F through the real dashboard and dialogs. A guardian opens last
// year's filing from Prior Years to fix a typo, then clicks New Year: the new
// year repeated a period that already existed and started from that older
// year's ending balance. Opening an older year lost the filing's case link.
// An older year opened for correction changed the shared records. And Delete
// Year went ahead while another tab had the filing open.

const snapshot = (page: Page) => page.evaluate(() => (window as any).GuardianForms.testing.snapshot());
const navigate = (page: Page, route: string) => page.evaluate((r) => (window as any).GuardianForms.testing.navigate(r), route);
async function clearOverlays(page: Page) {
  const reminder = page.locator('[data-shell-action="hide-auto-export-reminder"]');
  if (await reminder.isVisible().catch(() => false)) await reminder.click();
}

test('New Year with an earlier year open follows the latest year, and the dialog says so', async ({ page }) => {
  test.setTimeout(150_000);
  await freshStartNoPassword(page);
  await createSimplifiedWard(page, 'Latest Year Ward');
  const wardId = (await snapshot(page)).filing.wardId;
  await page.evaluate(async (id) => {
    const g = (window as any).GuardianForms.testing;
    g.patchFiling({ periodFrom: '2023-07-01', periodTo: '2024-06-30', startingBalance: 1000, interestIncome: 10 }); // setup (D9)
    await g.year.startNew(id);
    g.patchFiling({ periodTo: '2025-06-30', interestIncome: 20 }); // Year 2: 07/01/2024 - 06/30/2025, ends at 1030
    await g.year.switchTo(id, 'Year 1');
    await g.save.flush();
  }, wardId);
  expect((await snapshot(page)).filing.activeYearKey).toBe('Year 1');

  await navigate(page, '/dashboard');
  await clearOverlays(page);
  await page.locator(`[data-dashboard-action="new-year"][data-ward-id="${wardId}"]`).click();
  await expect(page.locator('#new-year-note')).toContainText('The new year follows 2024-2025, the latest year -- not 2023-2024, which is open now.');
  await page.locator('[data-modal-action="start-new-year"]').click();
  await page.waitForFunction((id) => (window as any).GuardianForms.testing.snapshot().caseFile.wards.find((x: any) => x.wardId === id)?.activeYearKey === 'Year 3', wardId);
  const opened = (await snapshot(page)).filing;
  expect([opened.periodFrom, opened.periodTo]).toEqual(['2025-07-01', '']);
  expect(Number(opened.startingBalance)).toBe(1030);
});

test('an earlier year keeps the filing\'s case link, says it is open for correction, and its edits stay in that year', async ({ page }) => {
  test.setTimeout(150_000);
  await freshStartNoPassword(page);
  await createWard(page, 'Linked Ward', 'annual');
  const wardId = (await snapshot(page)).filing.wardId;
  await page.evaluate(async (id) => {
    const g = (window as any).GuardianForms.testing;
    g.patchCase({ cases: [{ id: 'case-1', caseNumber: '2024-CP-000123', county: 'Pinellas', wardPartyId: null }] }); // setup (D9)
    g.patchFiling({ periodFrom: '2024-01-01', periodTo: '2024-12-31' });
    await g.year.startNew(id);
    g.patchFiling({ caseId: 'case-1' }); // linked in Year 2
    await g.year.switchTo(id, 'Year 1');
  }, wardId);
  const year1 = (await snapshot(page)).filing;
  expect(year1.activeYearKey).toBe('Year 1');
  expect(year1.caseId).toBe('case-1');

  await navigate(page, '/');
  await expect(page.locator('#main-content [data-closed-filing-sync]')).toContainText('This is an earlier year, open for correction.');
});

test('Delete Year stops while another tab has the filing open', async ({ browser }) => {
  test.setTimeout(150_000);
  const context = await browser.newContext();
  try {
    const page = await context.newPage();
    await freshStartNoPassword(page);
    await createWard(page, 'Locked Year Ward', 'annual');
    const wardId = (await snapshot(page)).filing.wardId;
    await page.evaluate(async (id) => {
      const g = (window as any).GuardianForms.testing;
      await g.year.startNew(id);
      await g.save.flush();
    }, wardId);
    await navigate(page, '/dashboard');
    await clearOverlays(page);
    await page.evaluate(() => (window as any).GuardianForms.testing.filingLock.release());

    // Another tab of the app holds the filing.
    const other = await context.newPage();
    await gotoApp(other);
    await other.evaluate((name) => new Promise<void>((resolve) => {
      navigator.locks.request(name, () => { resolve(); return new Promise(() => {}); });
    }), `pg-ward-${wardId}`);

    await page.click(`[data-dashboard-action="prior-years"][data-ward-id="${wardId}"]`);
    await page.locator(`[data-form-action="confirm-delete-ward-year"][data-ward-id="${wardId}"]`).click();
    await page.locator('#deleteYearModal.show').waitFor({ state: 'visible' });
    await page.click('#deleteYearModal [data-modal-action="delete-ward-year"]');
    await expect(page.locator('#ward-locked-overlay')).toBeVisible();
    const years = (await snapshot(page)).caseFile.wards.find((w: any) => w.wardId === wardId).years.map((y: any) => y.key);
    expect(years).toEqual(['Year 1']);
  } finally {
    await context.close();
  }
});
