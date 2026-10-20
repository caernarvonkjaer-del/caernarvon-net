import { test, expect, type Page } from '@playwright/test';
import { freshStartNoPassword, createWard } from './support/target';

// Milestone 76L items 1, 2 and 3, with real key presses (AGENTS.md section 6).
//  1. The dashboard's status menu saved the filing, wrote an Activity Log
//     entry and redrew the whole dashboard on every arrow key, and the redraw
//     dropped keyboard focus.
//  2. The Initial Inventory's phone, SSN, case, account and check boxes
//     reformatted on every keystroke: fixing 555 to 556 in (727) 555-1234
//     gave (727) 551-2346.
//  3. Escape in a suggestion list closed the whole dialog, and what was typed
//     with it (Add Form's name list; the Convert dialog's form picker).

const statusChanges = (page: Page) => page.evaluate(async () => (await (window as any).GuardianForms.testing.persistenceState.auditEntries())
  .filter((e: any) => e.eventType === 'STATUS_CHANGED').length);

test.describe('76L: the dashboard status menu and the Inventory boxes', () => {
  test('arrow keys browse the status menu; Enter saves and logs once; focus stays on the menu', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Keyboard Status Ward', 'annual');
    await page.evaluate(() => (window as any).GuardianForms.testing.navigate('/dashboard'));
    await page.locator('#main-content [data-dashboard-bound="true"]').waitFor();
    const select = page.locator('.dashboard-triage-row').filter({ hasText: 'Keyboard Status Ward' }).locator('[data-dashboard-change="workflow-status"]');
    const workflow = () => page.evaluate(() => (window as any).GuardianForms.testing.snapshot().caseFile.wards[0].dashboardWorkflow ?? null);
    const before = await statusChanges(page);

    await select.focus();
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');
    await page.waitForTimeout(300);
    expect(await workflow(), 'nothing saved while browsing').toBeNull();
    expect(await statusChanges(page), 'nothing logged while browsing').toBe(before);

    const chosen = await select.inputValue();
    await page.keyboard.press('Enter');
    await expect.poll(workflow).toEqual({ status: chosen });
    expect(await statusChanges(page), 'one entry').toBe(before + 1);
    await expect(page.locator('.dashboard-triage-row').filter({ hasText: 'Keyboard Status Ward' }).locator('[data-dashboard-change="workflow-status"]'), 'focus stays').toBeFocused();
  });

  test('leaving the menu after browsing back to where it started saves and logs nothing', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Round Trip Ward', 'annual');
    await page.evaluate(() => (window as any).GuardianForms.testing.navigate('/dashboard'));
    await page.locator('#main-content [data-dashboard-bound="true"]').waitFor();
    const select = page.locator('.dashboard-triage-row').filter({ hasText: 'Round Trip Ward' }).locator('[data-dashboard-change="workflow-status"]');
    const before = await statusChanges(page);
    await select.focus();
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowUp');
    await page.keyboard.press('Tab');
    await page.waitForTimeout(300);
    expect(await page.evaluate(() => (window as any).GuardianForms.testing.snapshot().caseFile.wards[0].dashboardWorkflow ?? null)).toBeNull();
    expect(await statusChanges(page)).toBe(before);
  });

  test('Escape closes a suggestion list first, then the dialog', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Escape List Ward', 'guardian');

    // Add Form: the name box's list of names on file.
    await page.evaluate(() => (window as any).GuardianForms.testing.createFiling.openDialog('planInitial'));
    await page.locator('#addWardModal.show').waitFor({ state: 'visible' });
    const name = page.locator('#new-ward-name');
    await name.click();
    await name.pressSequentially('Escape L');
    const nameList = page.locator('#new-ward-name-dropdown');
    await expect(nameList).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(nameList).toBeHidden();
    await expect(page.locator('#addWardModal.show'), 'the dialog stays').toBeVisible();
    await expect(name, 'what was typed stays').toHaveValue('Escape L');
    await page.keyboard.press('Escape');
    await expect(page.locator('#addWardModal.show')).toBeHidden();

    // New Filing from Existing: the form picker.
    await page.evaluate(() => (window as any).GuardianForms.testing.convertFiling.openDialog());
    await page.locator('#convertWardModal.show').waitFor({ state: 'visible' });
    await page.locator('#convert-source-ward').click();
    const sourceList = page.locator('#convert-source-ward-dropdown');
    await expect(sourceList).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(sourceList).toBeHidden();
    await expect(page.locator('#convertWardModal.show'), 'the dialog stays').toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('#convertWardModal.show')).toBeHidden();
  });

  test('correcting one digit of an Inventory phone number changes only that digit', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Phone Fix Ward', 'guardian');
    await page.evaluate(() => (window as any).GuardianForms.testing.navigate('/d1'));
    const phone = page.locator('#main-content input[data-bind="guardians.0.phone"]');
    await phone.click();
    await phone.pressSequentially('7275551234');
    await phone.blur();
    await expect(phone).toHaveValue('(727) 555-1234');
    // Put the cursor after the third 5, delete it, type 6.
    await phone.evaluate((el) => { (el as HTMLInputElement).focus(); (el as HTMLInputElement).setSelectionRange(9, 9); });
    await page.keyboard.press('Backspace');
    await page.keyboard.type('6');
    await phone.blur();
    await expect(phone).toHaveValue('(727) 556-1234');
    expect(await page.evaluate(() => (window as any).GuardianForms.testing.snapshot().filing.guardians[0].phone)).toBe('(727) 556-1234');
  });
});
