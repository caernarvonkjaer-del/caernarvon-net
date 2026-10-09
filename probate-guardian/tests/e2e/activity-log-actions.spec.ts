import { test, expect, type Page } from '@playwright/test';
import { freshStartNoPassword, createWard } from './support/target';

// Milestone 74S (decision 74S-4): deleting a filing or a prior year, Mark
// Closed / Mark Open, and a status change are recorded in the Activity Log,
// each naming the action and the filing -- never the filing's contents. None
// was recorded.

const entries = async (page: Page, type: string) => (await page.evaluate(() => (window as any).GuardianForms.testing.persistenceState.auditEntries()))
  .filter((e: any) => e.eventType === type).map((e: any) => e.details);
const dashboard = (page: Page) => page.evaluate(() => (window as any).GuardianForms.testing.navigate('/dashboard'));

test.describe('74S: what a filer does to a filing is recorded', () => {
  test('a status change, Mark Closed, Mark Open, a prior year deleted and a filing deleted each leave an entry', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Logged Ward', 'guardian');
    const id = await page.evaluate(() => (window as any).GuardianForms.testing.snapshot().filing.wardId);
    await page.evaluate((wardId) => (window as any).GuardianForms.testing.year.startNew(wardId), id);
    await dashboard(page);

    await page.getByRole('combobox', { name: 'Workflow status for Logged Ward' }).selectOption('pending-court-review');
    await expect.poll(() => entries(page, 'STATUS_CHANGED')).toEqual([expect.stringMatching(/^Status of the Initial Inventory for Logged Ward set to .+/)]);

    await page.locator(`[data-dashboard-action="archive"][data-ward-id="${id}"]`).click();
    await expect.poll(() => entries(page, 'FILING_CLOSED')).toEqual(['Marked closed: the Initial Inventory for Logged Ward']);
    await page.locator('[data-dashboard-action="toggle-closed"]').click();
    await page.locator(`[data-dashboard-action="archive"][data-ward-id="${id}"]`).click();
    await expect.poll(() => entries(page, 'FILING_REOPENED')).toEqual(['Marked open: the Initial Inventory for Logged Ward']);

    await page.locator(`[data-dashboard-action="prior-years"][data-ward-id="${id}"]`).click();
    await page.getByRole('button', { name: 'Permanently delete this year' }).first().click();
    await page.locator('[data-modal-action="delete-ward-year"]').click();
    await expect.poll(() => entries(page, 'YEAR_DELETED')).toEqual([expect.stringMatching(/^Deleted .+ of the Initial Inventory for Logged Ward$/)]);
    await page.locator('#priorYearsModal [data-modal-action="close"]').click();

    await dashboard(page);
    await page.locator(`[data-dashboard-action="delete"][data-ward-id="${id}"]`).click();
    await page.locator('[data-modal-action="delete-ward"]').click();
    await expect.poll(() => entries(page, 'FILING_DELETED')).toEqual(['Deleted the Initial Inventory for Logged Ward']);

    // The Activity Log page names each kind.
    await page.evaluate(() => (window as any).GuardianForms.testing.navigate('/activity-log'));
    for (const label of ['Filing status changed', 'Filing marked closed', 'Filing marked open', 'Prior year deleted', 'Filing deleted']) {
      await expect(page.locator('#main-content .activity-row').filter({ hasText: label }).first()).toBeVisible();
    }
  });
});
