import { test, expect, type Page } from '@playwright/test';
import { freshStartNoPassword, createWard } from './support/target';

// Milestone 74J (decision 74J-1): on an existing accounting, the Cover's
// Filing Type box asks before it changes the filing's type -- its title, PDF
// and workbook all follow it -- and the Activity Log records a change. It
// changed at once, with no question and no record, by a slip of the mouse.

const snapshot = (page: Page) => page.evaluate(() => (window as any).GuardianForms.testing.snapshot().filing);
const entries = (page: Page) => page.evaluate(() => (window as any).GuardianForms.testing.persistenceState.auditEntries());

test.describe('74J: a filing keeps its type unless the filer says so', () => {
  test('choosing Annual on a Final Accounting asks; Cancel keeps it Final, Yes changes it and is recorded', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Type Change Ward', 'finalAccounting');
    await page.evaluate(() => (window as any).GuardianForms.testing.navigate('/'));
    const box = page.getByRole('combobox', { name: /Filing Type/ });
    await expect(box).toHaveValue('Final');

    await box.selectOption('Annual');
    const dialog = page.locator('.modal-overlay.show');
    await expect(dialog.getByRole('heading', { name: 'Change the filing type?' })).toBeVisible();
    await expect(dialog).toContainText('Change this Final Accounting into an Annual Accounting? Its title, PDF and workbook will say Annual.');
    await dialog.getByRole('button', { name: 'Keep Final Accounting' }).click();
    await expect(dialog).toHaveCount(0);
    await expect(box).toHaveValue('Final');
    expect((await snapshot(page)).inventoryType).toBe('finalAccounting');
    expect((await entries(page)).filter((e: any) => e.eventType === 'FILING_TYPE_CHANGED')).toEqual([]);

    await box.selectOption('Annual');
    await dialog.getByRole('button', { name: 'Change to Annual Accounting' }).click();
    await expect(dialog).toHaveCount(0);
    expect((await snapshot(page)).inventoryType).toBe('annual');
    await expect(page.getByRole('combobox', { name: /Filing Type/ })).toHaveValue('Annual');
    const changed = (await entries(page)).filter((e: any) => e.eventType === 'FILING_TYPE_CHANGED');
    expect(changed.map((e: any) => e.details)).toEqual(['Filing type changed from Final Accounting to Annual Accounting']);
  });

  test('a change into Trust also says the Starting Balance stays as entered', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Trust Change Ward', 'annual');
    await page.evaluate(() => (window as any).GuardianForms.testing.navigate('/'));
    await page.getByRole('combobox', { name: /Filing Type/ }).selectOption('Trust');
    const dialog = page.locator('.modal-overlay.show');
    await expect(dialog).toContainText('The Starting Balance in Part II stays as entered');
    await dialog.getByRole('button', { name: 'Keep Annual Accounting' }).click();
    expect((await snapshot(page)).inventoryType).toBe('annual');
  });
});
