import { test, expect, type Page } from '@playwright/test';
import { freshStartNoPassword, createWard, fillMinimalValidGuardianWard, dismissScheduleDocPrompt } from './support/target';
import { exportWithWrites, loadWorkbook, cellValue } from './support/workbook-vs-template';

// Milestone 73D: on the Inventory's Schedule B-2, ticking "This item is a
// vehicle" and unticking it used to empty the Description, or fill it with
// whatever was typed into the vehicle fields ("2019"), because the vehicle
// fields were copied over it on every keystroke; ticking also wiped "In Safe
// Deposit Box?" for good. Unticking never deletes what was typed (AGENTS.md
// section 4): the Description and the answer are kept, and a vehicle's
// description is built from its own fields where it is filed. Every step goes
// through the real page; the workbook is the exported file.

const field = (page: Page, path: string) => page.evaluate((p) => (window as any).GuardianForms.testing.field(p), path);
const patch = (page: Page, shape: Record<string, unknown>) => page.evaluate((s) => (window as any).GuardianForms.testing.patchFiling(s), shape);
const go = (page: Page, route: string) => page.evaluate((r) => (window as any).GuardianForms.testing.navigate(r), route);

function watchErrors(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  return errors;
}

async function type(page: Page, selector: string, value: string) {
  const box = page.locator(selector);
  await box.fill(value);
  await box.press('Tab');
}

test('ticking and unticking "This item is a vehicle" keeps the Description and the safe-deposit answer; the workbook files the vehicle', async ({ page }) => {
  test.setTimeout(300_000);
  const errors = watchErrors(page);
  await freshStartNoPassword(page);
  await createWard(page, 'Vehicle Toggle', 'guardian');
  await fillMinimalValidGuardianWard(page);
  await patch(page, { scheduleB2: [] });
  await go(page, '/b2');

  await page.locator('[data-inventory-action="add-entry"][data-schedule="b2"]').click();
  await dismissScheduleDocPrompt(page);
  await type(page, '#b2-description-0', 'Grandfather Clock');
  // Entering the row raises the supporting-documents reminder (Milestone
  // 57C-R); it is not what this test is about.
  await dismissScheduleDocPrompt(page);
  const safeDeposit = page.locator('#main-content').getByRole('group', { name: /In Safe Deposit Box\?/ });
  await safeDeposit.getByLabel('Yes').check();
  expect(await field(page, 'scheduleB2.0.inSafeDepositBox')).toBe('Yes');

  // A vehicle: the safe-deposit question is hidden, its answer kept.
  const vehicleBox = page.getByLabel('This item is a vehicle');
  await vehicleBox.check();
  await expect(page.locator('#b2-vehicle-year-0')).toBeVisible();
  await expect(safeDeposit).toHaveCount(0);
  await type(page, '#b2-vehicle-year-0', '2019');
  expect(await field(page, 'scheduleB2.0.description'), 'typing a Year leaves the Description alone').toBe('Grandfather Clock');
  expect(await field(page, 'scheduleB2.0.inSafeDepositBox'), 'ticking keeps the answer').toBe('Yes');

  // Unticked: the filer's own Description and answer come back.
  await vehicleBox.uncheck();
  await expect(page.locator('#b2-description-0')).toHaveValue('Grandfather Clock');
  await expect(safeDeposit.getByLabel('Yes')).toBeChecked();
  expect(await field(page, 'scheduleB2.0.description')).toBe('Grandfather Clock');

  // A vehicle again, filled in: the workbook files the vehicle's own
  // description, and no safe-deposit answer (none applies to a vehicle).
  await vehicleBox.check();
  await type(page, '#b2-vehicle-make-0', 'Honda');
  await type(page, '#b2-vehicle-model-0', 'Civic');
  await type(page, '#b2-vehicle-vin-0', '1HGCV1F30KA000001');
  await type(page, '#b2-vehicle-mileage-0', '42,000');
  await patch(page, {
    'scheduleB2.0.streetAddress': '1 Main St', 'scheduleB2.0.cityStateZip': 'Clearwater, FL 33755',
    'scheduleB2.0.valuationMethod': 'Kelley Blue Book', 'scheduleB2.0.fullAssetValue': 15000,
  });
  const { bytes } = await exportWithWrites(page, 'guardian');
  const sheet = (await loadWorkbook(bytes)).getWorksheet('B-2 PER PROP pg 1');
  expect(cellValue(sheet.getCell('C33'))).toBe('2019 Honda Civic — VIN: 1HGCV1F30KA000001 — Odometer: 42,000 mi');
  expect(cellValue(sheet.getCell('H33')), 'no safe-deposit answer is filed for a vehicle').toBeNull();
  expect(await field(page, 'scheduleB2.0.description'), 'the filer\'s Description is still kept').toBe('Grandfather Clock');
  expect(await field(page, 'scheduleB2.0.inSafeDepositBox')).toBe('Yes');
  expect(errors).toEqual([]);
});
