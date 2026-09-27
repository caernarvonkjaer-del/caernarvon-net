import { test, expect } from '@playwright/test';
import { freshStartNoPassword, createWard } from './support/target';

// Milestone 70, 70I finding, on master too: deleting a prior accounting year
// from the dashboard deleted it and then told the filer it had failed. The
// dialog's confirm handler redrew the dashboard with renderDashboardGrid(),
// which is the dashboard's own function and never a global, so the call threw
// after the deletion and the handler's catch showed "Failed to delete year.
// Check console." A filer reading that could retry, or distrust a case file
// that was fine. Driven through the real controls: the dashboard's "Prior
// years" button, the year's delete button, the confirmation.
const DYN_DIALOG = '.modal-overlay[id^="dyn-dialog-"].show';

test('deleting a prior year from the dashboard deletes it and says nothing failed', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await freshStartNoPassword(page);
  await createWard(page, 'Prior Year Ward', 'annual');
  const filingId = await page.evaluate(() => (window as any).GuardianForms.testing.snapshot().caseFile.wards[0].wardId);
  await page.evaluate((id) => (window as any).GuardianForms.testing.year.startNew(id), filingId);
  await page.evaluate(() => (window as any).GuardianForms.testing.navigate('/dashboard'));
  const years = () => page.evaluate((id) => ((window as any).GuardianForms.testing.snapshot().caseFile.wards
    .find((f: any) => f.wardId === id).years || []).map((y: any) => y.key), filingId);
  expect(await years()).toHaveLength(1);

  await page.click(`[data-dashboard-action="prior-years"][data-ward-id="${filingId}"]`);
  await page.locator(`[data-form-action="confirm-delete-ward-year"][data-ward-id="${filingId}"]`).click();
  await page.locator('#deleteYearModal.show').waitFor({ state: 'visible' });
  await page.click('#deleteYearModal [data-modal-action="delete-ward-year"]');
  await expect(page.locator('#deleteYearModal')).not.toHaveClass(/show/);

  await expect.poll(years).toEqual([]);
  await page.waitForTimeout(500); // an alert, had one been raised, is up by now
  await expect(page.locator(DYN_DIALOG), 'no "Failed to delete year" alert').toHaveCount(0);
  expect(errors.filter((e) => /Failed to delete year|renderDashboardGrid/.test(e))).toEqual([]);
});
