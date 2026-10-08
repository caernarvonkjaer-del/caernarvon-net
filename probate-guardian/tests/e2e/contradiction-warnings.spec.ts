import { test, expect, type Page } from '@playwright/test';
import {
  freshStartNoPassword, createWard, fillMinimalValidGuardianWard, fillMinimalValidPlanAnnualWard,
  dismissScheduleDocPrompt, expectExportReady, clickExport,
} from './support/target';

// Milestone 74H, as a filer meets it: two answers in one filing that
// contradict each other are named in Preview's "Review recommended", both
// answers quoted, and nothing stops the PDF (decision 74H-1). Each answer is
// given on its real page; the filing is patched only to hold the complete
// rows the answers sit on, as the minimal valid fixtures do.
//
// Red-first: before 74H Preview said none of these.

const go = (page: Page, route: string) => page.evaluate((r) => (window as any).GuardianForms.testing.navigate(r), route);
const patch = (page: Page, shape: Record<string, unknown>) => page.evaluate((s) => (window as any).GuardianForms.testing.patchFiling(s), shape);
const warning = (page: Page, text: string) => page.locator('#main-content .alert-warning li', { hasText: text });

async function openPrint(page: Page) {
  await page.evaluate(() => (window as any).GuardianForms.testing.save.flush());
  await go(page, '/print');
}

async function answer(page: Page, path: string, value: 'Yes' | 'No') {
  await page.locator(`fieldset[data-yes-no-group="${path}"] input[type="radio"][value="${value}"]`).check();
}

test('Inventory: no safe deposit box while a B-2 item is in one, and a bond below its requirement -- warned; the PDF still saves', async ({ page }) => {
  test.setTimeout(180_000);
  await freshStartNoPassword(page);
  await createWard(page, 'Contradiction Inventory', 'guardian');
  await fillMinimalValidGuardianWard(page);
  // A complete B-1 account and B-2 item, as a filer would have entered them.
  await patch(page, {
    scheduleNoItems: { a1: true, a2: true, b1: false, b2: false, b3: true, b4: true, c1: true, c2: true, c3: true, c4: true, c5: true },
    scheduleB1: [{ institutionName: 'First Bank', restricted: 'No', accountType: 'Checking', accountNumber: '1234', streetAddress: '1 Bank St', cityStateZip: 'Clearwater, FL 33755', fullAssetAmount: 50000, wardPercent: 100 }],
    scheduleB2: [{ description: 'Diamond ring', streetAddress: '123 Main St', cityStateZip: 'Clearwater, FL 33755', valuationMethod: 'Appraisal', fullAssetValue: 2500, wardPercent: 100, inSafeDepositBox: '', isVehicle: false, vehicleYear: '', vehicleMake: '', vehicleModel: '', vehicleVin: '', odometerMileage: '' }],
  });

  await go(page, '/d3');
  await answer(page, 'hasSafeDepositBox', 'No');
  await go(page, '/b2');
  await dismissScheduleDocPrompt(page);
  await answer(page, 'scheduleB2.0.inSafeDepositBox', 'Yes');

  await openPrint(page);
  await expect(warning(page, 'D-3 — "Does the ward have a safe deposit box…?" is answered No, while B-2 row 1 is marked "In Safe Deposit Box?" Yes.')).toBeVisible({ timeout: 20_000 });
  await expect(warning(page, 'D-4 — Bond Amount ($1,000.00) is below the bond requirement this filing calculates ($52,500.00).')).toBeVisible();
  await expect(warning(page, 'The court often requires a bond in the amount of the Ward\'s liquid assets.')).toBeVisible();

  const save = page.locator('[data-inventory-action="save-pdf"]');
  await expectExportReady(save, 20_000, 'a warning, never a blocker');
  const pdf = await clickExport(save);
  expect(pdf.suggestedFilename()).toMatch(/\.pdf$/i);
});

test('Annual Plan: "has not moved" while question 1 lists two residences -- warned; the PDF still saves', async ({ page }) => {
  test.setTimeout(180_000);
  await freshStartNoPassword(page);
  await createWard(page, 'Contradiction Annual Plan', 'planAnnual');
  await fillMinimalValidPlanAnnualWard(page);

  // The fixture lists one residence and answers "has not moved"; the filer
  // adds a second residence on question 1's page.
  await go(page, '/p2');
  await page.locator('[data-form-action="add-plan-row"][data-collection="q1Residences"]').click();
  const name = page.locator('#main-content input[data-form-path="q1Residences.1.name"]');
  await name.fill('Oak Manor');
  await name.blur();
  await go(page, '/p3');
  await expect(page.locator('#main-content input[data-form-path="q2NoMove"]')).toBeChecked();

  await openPrint(page);
  await expect(warning(page, '2–3. Residence & Care — Question 2 is ticked "N/A — the ward has not moved since the last plan was filed", while question 1 lists 2 residences.')).toBeVisible({ timeout: 20_000 });

  const save = page.locator('[data-output-action="save-pdf"]');
  await expectExportReady(save, 20_000, 'a warning, never a blocker');
  const pdf = await clickExport(save);
  expect(pdf.suggestedFilename()).toMatch(/\.pdf$/i);
});
