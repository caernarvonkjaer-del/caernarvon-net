import { test, expect, type Page } from '@playwright/test';
import { freshStartNoPassword, createWard, fillMinimalValidAnnualWard, dismissScheduleDocPrompt } from './support/target';

// Milestone 74P: entry helpers on the Inventory and the address cards, driven
// through the real pages (QA report UX-08, UX-09, UX-24). Red-first: none of
// these controls existed before 74P.

const go = (page: Page, route: string) => page.evaluate((r) => (window as any).GuardianForms.testing.navigate(r), route);
const field = (page: Page, path: string) => page.evaluate((p) => (window as any).GuardianForms.testing.field(p), path);

async function typeInto(page: Page, selector: string, value: string) {
  const box = page.locator(selector);
  await box.fill(value);
  await box.dispatchEvent('input');
  await box.blur();
}

test.describe('Milestone 74P', () => {
  test("C-1: the yearly total is proposed as the payment is typed, filled in only on Use, and offered for no frequency it can't count", async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Helper C-1 Ward', 'guardian');
    await go(page, '/c1');
    await page.locator('[data-inventory-action="add-entry"][data-schedule="c1"]').click();
    const helper = page.locator('[data-c1-helper="0"]');
    await expect(helper, 'no frequency yet: nothing to count').toBeHidden();

    await page.locator('[data-bind="scheduleC1.0.frequencyOfPayment"]').selectOption('Monthly');
    // The first entry on a schedule asks about supporting documents.
    await dismissScheduleDocPrompt(page);
    await expect(helper).toBeVisible();
    await expect(page.locator('[data-c1-times="0"]')).toHaveText('× 12 payments a year');
    await typeInto(page, '[data-c1-payment="0"]', '1,850');
    await expect(page.locator('[data-c1-result="0"]')).toHaveText('$22,200.00');
    expect(await field(page, 'scheduleC1.0.annualIncomeAmount'), 'nothing is filled in before Use').toBe(0);

    await page.locator('[data-inventory-action="c1-use-yearly"][data-index="0"]').click();
    await expect.poll(() => field(page, 'scheduleC1.0.annualIncomeAmount')).toBe(22200);
    await expect(page.locator('[data-bind="scheduleC1.0.annualIncomeAmount"]')).toHaveValue(/22,?200/);

    await page.locator('[data-bind="scheduleC1.0.frequencyOfPayment"]').selectOption('Quarterly');
    await expect(page.locator('[data-c1-times="0"]')).toHaveText('× 4 payments a year');
    await page.locator('[data-bind="scheduleC1.0.frequencyOfPayment"]').selectOption('Other');
    await expect(helper, 'Other: nothing to propose').toBeHidden();
    expect(await field(page, 'scheduleC1.0.annualIncomeAmount'), 'the filed figure stays the filer\'s').toBe(22200);
  });

  test('A-1: a share below 100% offers "Add a joint owner for this asset", which adds a C-5 row describing the asset', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Helper C-5 Ward', 'guardian');
    await go(page, '/a1');
    await page.locator('[data-inventory-action="add-entry"][data-schedule="a1"]').click();
    // The description box formats as typed names are formatted: "Family Home".
    await typeInto(page, '[data-bind="scheduleA1.0.propertyDescription"]', 'Family home');
    // The first entry on a schedule asks about supporting documents.
    await dismissScheduleDocPrompt(page);
    await typeInto(page, '[data-bind="scheduleA1.0.fullAssetValue"]', '250000');
    const offer = page.locator('[data-joint-owner-offer="scheduleA1.0"]');
    await expect(offer, 'a blank share: no offer').toBeHidden();
    await typeInto(page, '[data-bind="scheduleA1.0.wardPercent"]', '100');
    await expect(offer, 'the ward owns it all').toBeHidden();
    await typeInto(page, '[data-bind="scheduleA1.0.wardPercent"]', '50');
    await expect(offer).toBeVisible();

    await offer.getByRole('button', { name: '+ Add a joint owner for this asset' }).click();
    await expect(page.locator('[data-joint-owner-status="scheduleA1.0"]')).toContainText('Added to Schedule C-5 as Joint Owner 1');
    const c5 = await field(page, 'scheduleC5');
    expect(c5).toHaveLength(1);
    expect(c5[0]).toMatchObject({ assetDescription: 'Schedule A-1, Item 1 — Family Home', totalAssetValue: 250000, jointOwnerPercent: '', ownerName: '' });
    await go(page, '/c5');
    await expect(page.locator('[data-bind="scheduleC5.0.assetDescription"]')).toHaveValue('Schedule A-1, Item 1 — Family Home');
  });

  test('Annual Part III: "same as mailing" hides the residence / office address and keeps what was typed for when it is unticked', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Helper Annual Ward', 'annual');
    await fillMinimalValidAnnualWard(page);
    await page.evaluate(() => (window as any).GuardianForms.testing.patchFiling({ 'guardians.0.officeStreet': '9 Old Office Rd' }));
    await go(page, '/p3');
    const office = page.locator('[data-form-path="guardians.0.officeStreet"]');
    await expect(office).toHaveValue('9 Old Office Rd');
    await page.locator('#guardians_0_officeSameAsMailing').check();
    await expect(office, 'hidden while ticked').toHaveCount(0);
    expect(await field(page, 'guardians.0.officeSameAsMailing')).toBe(true);
    expect(await field(page, 'guardians.0.officeStreet'), 'kept').toBe('9 Old Office Rd');
    await page.locator('#guardians_0_officeSameAsMailing').uncheck();
    await expect(office, 'back, as typed').toHaveValue('9 Old Office Rd');
  });

  test('Annual Plan cover: "same as residence" hides the ward\'s mailing address and keeps it for when it is unticked', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Helper Plan Ward', 'planAnnual');
    await page.evaluate(() => (window as any).GuardianForms.testing.patchFiling({ mailingAddress: 'PO Box 1' }));
    await go(page, '/');
    const mailing = page.locator('#mailingAddress');
    await expect(mailing).toHaveValue('PO Box 1');
    await page.locator('#mailingSameAsResidence').check();
    await expect(mailing).toHaveCount(0);
    expect(await field(page, 'mailingSameAsResidence')).toBe(true);
    await page.locator('#mailingSameAsResidence').uncheck();
    await expect(mailing).toHaveValue('PO Box 1');
  });
});
