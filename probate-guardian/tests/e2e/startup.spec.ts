import { test, expect } from '@playwright/test';
import { gotoApp, startNewCase, chooseNoPassword } from './support/target';

test.describe('startup', () => {
  test('fresh install shows the startup-choice screen, no console errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));

    await gotoApp(page);

    await expect(page.locator('#startup-choice-overlay')).toHaveClass(/show/);
    await expect(page.locator('#startup-newcase-btn')).toBeVisible();
    expect(errors).toEqual([]);
  });

  test('Start a New Case -> No Password reaches the inventory selector', async ({ page }) => {
    await gotoApp(page);
    await startNewCase(page);
    await chooseNoPassword(page);

    await expect(page.locator('#startup-choice-overlay')).not.toHaveClass(/show/);
    await expect(page.locator('#security-choice-overlay')).not.toHaveClass(/show/);
    // No wards exist yet, so renderPage('/dashboard') redirects to /inventory-select.
    await expect(page.locator('#main-content')).not.toBeEmpty();
    await expect(page).toHaveURL(/#\/inventory-select/);
  });

  test('Start a New Case -> Encrypted shows the create-password form', async ({ page }) => {
    await gotoApp(page);
    await startNewCase(page);
    await page.locator('#security-choice-overlay.show').waitFor({ state: 'visible' });
    await page.click('#security-choice-overlay button[onclick*="selectSecurityMode(\'encrypted\')"]');

    await expect(page.locator('#unlock-overlay')).toHaveClass(/show/);
    await expect(page.locator('#unlock-password-confirm')).toBeVisible(); // confirm row only shown when creating
  });
});
