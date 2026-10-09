import { test, expect, type Page } from '@playwright/test';
import { freshStartNoPassword, createWard, createSimplifiedWard, dismissScheduleDocPrompt } from './support/target';

// Milestone 73P (D14, decision 73P-1): removing a card asks first when the
// card holds anything -- schedule entries, recipients, witnesses, Plan rows
// and every co-guardian, on every form. They went at once (only most forms'
// co-guardians asked; the Inventory's D-1 didn't). An untouched card goes
// without a question.

const field = (page: Page, path: string) => page.evaluate((p) => (window as any).GuardianForms.testing.field(p), path);
const navigate = (page: Page, route: string) => page.evaluate((r) => (window as any).GuardianForms.testing.navigate(r), route);
const dialog = (page: Page) => page.locator('.modal-overlay.show');

test.describe('73P: Remove asks first when a card holds anything', () => {
  test('an Inventory entry: an untouched one goes at once; one with an entry asks, Keep keeps it, Remove removes it', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Remove Entry Ward', 'guardian');
    await navigate(page, '/a1');
    const add = page.locator('[data-inventory-action="add-entry"][data-schedule="a1"]');
    const remove = page.locator('[data-inventory-action="remove-entry"][data-schedule="a1"][data-index="0"]');

    await add.click();
    await dismissScheduleDocPrompt(page);
    await remove.click();
    await expect(dialog(page)).toHaveCount(0);
    expect(await field(page, 'scheduleA1')).toEqual([]);

    await add.click();
    await dismissScheduleDocPrompt(page);
    const box = page.locator('[data-bind="scheduleA1.0.propertyDescription"]');
    await box.fill('Single Family Home');
    await box.press('Tab');
    await dismissScheduleDocPrompt(page);
    await remove.click();
    await expect(dialog(page)).toContainText('Remove this entry (1)? What is entered on it is deleted.');
    await dialog(page).getByRole('button', { name: 'Keep it' }).click();
    expect(await field(page, 'scheduleA1.0.propertyDescription')).toBe('Single Family Home');
    await remove.click();
    await dialog(page).getByRole('button', { name: 'Remove' }).click();
    expect(await field(page, 'scheduleA1')).toEqual([]);
  });

  test('the Inventory\'s D-1 co-guardian asks, as the other forms\' do', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Remove Guardian Ward', 'guardian');
    await page.evaluate(() => (window as any).GuardianForms.testing.patchFiling({ guardians: [{ name: 'Pat Guardian' }, { name: 'Sam Coguardian' }] })); // setup (D9)
    await navigate(page, '/d1');
    await page.locator('[data-inventory-action="remove-guardian"][data-index="1"]').click();
    await expect(dialog(page)).toContainText('Remove co-guardian Sam Coguardian?');
    await dialog(page).getByRole('button', { name: 'Cancel' }).click();
    expect((await field(page, 'guardians')).length).toBe(2);
  });

  test('a Plan row and a Simplified recipient ask too', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Remove Plan Ward', 'planAnnual');
    await page.evaluate(() => (window as any).GuardianForms.testing.patchFiling({ q1Residences: [{ name: 'Bayview Care Center', street: '1 Bay St' }] })); // setup (D9)
    await navigate(page, '/p2');
    await page.locator('[data-form-action="remove-plan-row"][data-collection="q1Residences"][data-index="0"]').click();
    await expect(dialog(page)).toContainText('Remove this residence (1)?');
    await dialog(page).getByRole('button', { name: 'Keep it' }).click();
    expect((await field(page, 'q1Residences')).length).toBe(1);

    await createSimplifiedWard(page, 'Remove Recipient Ward');
    await page.evaluate(() => (window as any).GuardianForms.testing.patchFiling({ certRecipients: [{ name: 'Jane Interested Party' }, { name: 'Robin Second' }] })); // setup (D9)
    await navigate(page, '/p6');
    await page.locator('[data-simplified-action="remove-recipient"][data-index="1"]').click();
    await expect(dialog(page)).toContainText('Remove this service recipient (2)?');
    await dialog(page).getByRole('button', { name: 'Remove' }).click();
    expect((await field(page, 'certRecipients')).map((r: any) => r.name)).toEqual(['Jane Interested Party']);
  });
});
