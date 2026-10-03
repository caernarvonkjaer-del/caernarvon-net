import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  freshStartNoPassword, createWard, fillMinimalValidAnnualWard, fillMinimalValidGuardianWard,
  dismissScheduleDocPrompt, autoAcceptDynDialogs,
} from './support/target';
import { exportWithWrites } from './support/workbook-vs-template';

// The sidebar's filing card (Net Assets on an accounting, Total Value on the
// Initial Inventory) was recalculated after a typed edit and when a filing was
// opened or switched, but not when a page was simply redrawn. So removing or
// duplicating a schedule row, or importing an Excel workbook, changed the
// figures on every page while the card kept the old total until the next
// keystroke -- the kind of stale "$0.00" the browser review of Milestone 71
// reported (H2), which could not be reproduced by typing. Found 2026-10-03
// while re-shooting the user guide. Driven through the real buttons and the
// real Import from Excel control.

const card = (page: Page) => page.locator('#ward-info-display .ward-info-total').innerText();
const money = (n: number) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const annualNet = (page: Page) => page.evaluate(() => (window as any).GuardianForms.testing.status.annualTotals().netAssets);

async function typeInto(page: Page, selector: string, value: string) {
  const box = page.locator(selector).first();
  await box.fill(value);
  await box.blur();
  await page.waitForTimeout(200);
}

test('annual: Remove and Duplicate on Schedule B-4 keep the sidebar\'s Net Assets current', async ({ page }) => {
  test.setTimeout(180_000);
  await freshStartNoPassword(page);
  await createWard(page, 'Sidebar Rows Annual', 'annual');
  await fillMinimalValidAnnualWard(page);
  await page.evaluate(() => (window as any).GuardianForms.testing.patchFiling({ schB4: [
    { bankAccountId: '', checkNo: '1', datePaid: '2026-04-03', category: 'Rent', payee: 'A', amount: '1000' },
    { bankAccountId: '', checkNo: '2', datePaid: '2026-04-04', category: 'Rent', payee: 'B', amount: '2000' },
  ] }));
  await page.evaluate(() => (window as any).GuardianForms.testing.navigate('/p2'));
  await typeInto(page, '[data-annual-path="startingBalance"]', '10000');
  expect(await card(page), 'a typed edit always updated the card').toBe(money(await annualNet(page)));

  await page.evaluate(() => (window as any).GuardianForms.testing.navigate('/schb4'));
  await dismissScheduleDocPrompt(page);
  const before = await annualNet(page);
  await page.locator('[data-annual-action="remove-row"][data-collection="schB4"]').first().click();
  await expect.poll(() => annualNet(page)).not.toBe(before);
  expect(await card(page), 'after Remove').toBe(money(await annualNet(page)));

  const afterRemove = await annualNet(page);
  await page.locator('[data-annual-action="duplicate-row"][data-collection="schB4"]').first().click();
  await expect.poll(() => annualNet(page)).not.toBe(afterRemove);
  expect(await card(page), 'after Duplicate').toBe(money(await annualNet(page)));
});

test('guardian: Remove on Schedule B-1 keeps the sidebar\'s Total Value current', async ({ page }) => {
  test.setTimeout(180_000);
  await freshStartNoPassword(page);
  await createWard(page, 'Sidebar Rows Inventory', 'guardian');
  await fillMinimalValidGuardianWard(page);
  await page.evaluate(() => (window as any).GuardianForms.testing.patchFiling({ scheduleB1: [
    { institutionName: 'Bank A', restricted: 'No', accountType: 'Checking', accountNumber: '1', streetAddress: '1 Main St', cityStateZip: 'Clearwater, FL 33755', fullAssetAmount: 1000, wardPercent: 100 },
    { institutionName: 'Bank B', restricted: 'No', accountType: 'Savings', accountNumber: '2', streetAddress: '1 Main St', cityStateZip: 'Clearwater, FL 33755', fullAssetAmount: 2000, wardPercent: 100 },
  ], 'scheduleNoItems.b1': false }));
  await page.evaluate(() => (window as any).GuardianForms.testing.navigate('/b1'));
  await dismissScheduleDocPrompt(page);
  // A typed edit first, so the card is current before the button.
  await typeInto(page, 'input[data-bind="scheduleB1.0.accountNumber"]', '11');
  const typed = await card(page);
  await page.locator('[data-inventory-action="remove-entry"][data-schedule="b1"]').first().click();
  await page.waitForTimeout(500);
  expect(await page.evaluate(() => (window as any).GuardianForms.testing.field('scheduleB1').length)).toBe(1);
  expect(await card(page), 'after Remove the card no longer shows the removed account').not.toBe(typed);
});

test('annual: importing a workbook updates the sidebar\'s Net Assets', async ({ page }) => {
  test.setTimeout(240_000);
  await freshStartNoPassword(page);
  await createWard(page, 'Sidebar Import Annual', 'annual');
  await fillMinimalValidAnnualWard(page);
  await page.evaluate(() => (window as any).GuardianForms.testing.navigate('/p2'));
  await typeInto(page, '[data-annual-path="startingBalance"]', '10000');
  const { bytes } = await exportWithWrites(page, 'annual');

  // Change the Starting Balance by typing, then import the earlier workbook.
  await page.evaluate(() => (window as any).GuardianForms.testing.navigate('/p2'));
  await typeInto(page, '[data-annual-path="startingBalance"]', '20000');
  expect(await card(page)).toBe(money(await annualNet(page)));

  const file = path.join(os.tmpdir(), `pg-sidebar-${Date.now()}.xlsx`);
  fs.writeFileSync(file, bytes);
  await page.evaluate(() => (window as any).GuardianForms.testing.patchFiling({ wardName: 'Import Pending' }));
  await page.evaluate(() => (window as any).GuardianForms.testing.navigate('/'));
  const dialogs = autoAcceptDynDialogs(page);
  await page.setInputFiles('input[type="file"][accept=".xlsx"]', file);
  await expect.poll(() => page.evaluate(() => {
    const box = document.querySelector('input[type="file"][accept=".xlsx"]') as HTMLInputElement | null;
    return (window as any).GuardianForms.testing.field('wardName') !== 'Import Pending' && !box?.files?.length;
  }), { timeout: 30_000 }).toBe(true);
  await dialogs.stop();
  await page.waitForTimeout(300);

  expect(String(await page.evaluate(() => (window as any).GuardianForms.testing.field('startingBalance')))).toMatch(/^10000(\.0+)?$/);
  expect(await card(page), 'after the import the card shows the imported figures').toBe(money(await annualNet(page)));
});
