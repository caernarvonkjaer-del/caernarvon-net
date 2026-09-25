import { test, expect } from '@playwright/test';
import { freshStartNoPassword, createWard, chooseCoverCounty } from './support/target';

// Milestone 49B through the real UI: the ward's residence details are shared
// between two Plans linked to the same ward Party; marking one Closed on the
// dashboard cuts it off; Manage Shared Records and the closed filing's own
// Cover each offer "Sync with Current"; marking it Open again does not
// rewrite it until the next live edit.

async function dismissReminder(page: import('@playwright/test').Page) {
  const reminderDismiss = page.locator('[data-shell-action="hide-auto-export-reminder"]');
  if (await reminderDismiss.isVisible()) await reminderDismiss.click();
}

test('ward residence syncs between open Plans, stops for a closed one, and syncs on request from the record and from the Cover', async ({ page }) => {
  await freshStartNoPassword(page);

  // Filing 1: Annual Plan. Selecting a county links the ward Party.
  await createWard(page, 'Eleanor Whitfield', 'planAnnual');
  await chooseCoverCounty(page, 'Pinellas');
  const filing1 = await page.evaluate(() => (window as any).GuardianForms.testing.field('wardId'));
  await page.fill('[data-form-path="residenceAddress"]', '410 Bayshore Dr');
  await page.fill('[data-form-path="residenceCityStateZip"]', 'Clearwater, FL 33756');
  await page.locator('[data-form-path="residenceCityStateZip"]').blur();
  const partyAfterFill = await page.evaluate(() => { const w = window as any; return w.GuardianForms.testing.sharedRecords.resolveParty(w.GuardianForms.testing.field('wardPartyId')).address; });
  expect(partyAfterFill).toEqual({ street: '410 Bayshore Dr', cityStateZip: 'Clearwater, FL 33756' });

  // Filing 2: Initial Plan for the same ward, linked through the carry-over source.
  await dismissReminder(page);
  await page.evaluate((t) => (window as any).GuardianForms.testing.createFiling.openDialog(t), 'planInitial');
  await page.locator('#addWardModal.show').waitFor({ state: 'visible' });
  await page.fill('#new-ward-name', 'Eleanor Whitfield');
  await page.selectOption('#carry-source-ward', filing1);
  await page.click('#addWardModal [data-modal-action="add-ward"]');
  await page.locator('#addWardModal').waitFor({ state: 'hidden' });
  await page.evaluate(() => (window as any).GuardianForms.testing.navigate('/'));
  const filing2 = await page.evaluate(() => (window as any).GuardianForms.testing.field('wardId'));
  expect(await page.evaluate(([a, b]) => { const w = window as any; const f = (id: string) => w.GuardianForms.testing.snapshot().caseFile.wards.find((x: any) => x.wardId === id); return f(a).wardPartyId === f(b).wardPartyId; }, [filing1, filing2])).toBe(true);

  // Live sync while both are open: editing the phone on filing 2 reaches filing 1.
  await page.fill('[data-form-path="residencePhone"]', '(727) 555-0101');
  await page.locator('[data-form-path="residencePhone"]').blur();
  expect(await page.evaluate((id) => (window as any).GuardianForms.testing.snapshot().caseFile.wards.find((x: any) => x.wardId === id).residencePhone, filing1)).toBe('(727) 555-0101');

  // Mark filing 1 Closed on the dashboard.
  await page.evaluate(() => (window as any).GuardianForms.testing.navigate('/dashboard'));
  await page.waitForURL(/#\/dashboard/);
  await page.click(`[data-dashboard-action="archive"][data-ward-id="${filing1}"]`);
  await expect(page.locator(`[data-dashboard-action="archive"][data-ward-id="${filing1}"]`)).toHaveText('Mark Open');

  // A further edit on filing 2 no longer reaches the closed filing 1.
  await page.evaluate((id) => (window as any).GuardianForms.testing.activateFiling.open(id), filing2);
  await page.evaluate(() => (window as any).GuardianForms.testing.navigate('/'));
  await page.fill('[data-form-path="residencePhone"]', '(727) 555-0202');
  await page.locator('[data-form-path="residencePhone"]').blur();
  expect(await page.evaluate((id) => (window as any).GuardianForms.testing.snapshot().caseFile.wards.find((x: any) => x.wardId === id).residencePhone, filing1)).toBe('(727) 555-0101');

  // Manage Shared Records lists the closed filing under the ward's record with a sync button.
  await dismissReminder(page);
  await page.evaluate(() => (window as any).GuardianForms.testing.navigate('/party-management'));
  await page.waitForURL(/#\/party-management/);
  const driftRow = page.locator('#party-directory-rows').getByText('Closed filing').locator('..');
  await expect(driftRow).toContainText('Eleanor Whitfield — Annual Guardianship Plan');
  await expect(driftRow).toContainText('Ward differs: Phone');
  await driftRow.locator('[data-form-action="party-sync-closed"]').click();
  await expect(page.locator('#party-directory-rows')).not.toContainText('Closed filing');
  expect(await page.evaluate((id) => (window as any).GuardianForms.testing.snapshot().caseFile.wards.find((x: any) => x.wardId === id).residencePhone, filing1)).toBe('(727) 555-0202');

  // Drift again, this time synced from the closed filing's own Cover.
  await page.evaluate((id) => (window as any).GuardianForms.testing.activateFiling.open(id), filing2);
  await page.evaluate(() => (window as any).GuardianForms.testing.navigate('/'));
  await page.fill('[data-form-path="residenceAddress"]', '12 Oak St');
  await page.locator('[data-form-path="residenceAddress"]').blur();
  await page.evaluate((id) => (window as any).GuardianForms.testing.activateFiling.open(id), filing1);
  await page.evaluate(() => (window as any).GuardianForms.testing.navigate('/'));
  const notice = page.locator('[data-closed-filing-sync]');
  await expect(notice).toBeVisible();
  await expect(notice).toContainText('This filing is closed.');
  await expect(notice).toContainText('Ward "Eleanor Whitfield": Street Address');
  await expect(page.locator('[data-form-path="residenceAddress"]')).toHaveValue('410 Bayshore Dr');
  await notice.locator('[data-form-action="filing-sync-closed"]').click();
  await expect(page.locator('[data-closed-filing-sync]')).toHaveCount(0);
  await expect(page.locator('[data-form-path="residenceAddress"]')).toHaveValue('12 Oak St');

  // Mark Open: nothing is rewritten by itself, but the next live edit flows again.
  await page.evaluate((id) => (window as any).GuardianForms.testing.activateFiling.open(id), filing2);
  await page.evaluate(() => (window as any).GuardianForms.testing.navigate('/'));
  await page.fill('[data-form-path="residencePhone"]', '(727) 555-0303');
  await page.locator('[data-form-path="residencePhone"]').blur();
  await page.evaluate(() => (window as any).GuardianForms.testing.navigate('/dashboard'));
  await page.waitForURL(/#\/dashboard/);
  await page.click('[data-dashboard-action="toggle-closed"]'); // the Closed Filings section starts collapsed
  await page.click(`#dashboard-closed-queue [data-dashboard-action="archive"][data-ward-id="${filing1}"]`);
  await expect(page.locator(`[data-dashboard-action="archive"][data-ward-id="${filing1}"]`)).toHaveText('Mark Closed');
  expect(await page.evaluate((id) => (window as any).GuardianForms.testing.snapshot().caseFile.wards.find((x: any) => x.wardId === id).residencePhone, filing1)).toBe('(727) 555-0202');
  await page.evaluate((id) => (window as any).GuardianForms.testing.activateFiling.open(id), filing2);
  await page.evaluate(() => (window as any).GuardianForms.testing.navigate('/'));
  await page.fill('[data-form-path="residencePhone"]', '(727) 555-0404');
  await page.locator('[data-form-path="residencePhone"]').blur();
  expect(await page.evaluate((id) => (window as any).GuardianForms.testing.snapshot().caseFile.wards.find((x: any) => x.wardId === id).residencePhone, filing1)).toBe('(727) 555-0404');
});
