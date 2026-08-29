import { test, expect } from '@playwright/test';
import { gotoApp, startNewCase, chooseEncrypted, createWard } from './support/target';

// lockApp() (index.html) clears the crypto key and re-runs ensureUnlocked()
// in-page, no navigation needed — so lock/unlock is testable within one
// session without relying on any persisted state surviving a reload.
//
// updateSidebar() (index.html:7038) hides #sidebar entirely while
// guardianData.wards.length===0, so a ward must exist before the sidebar
// is present at all. The Lock button itself lives inside the "Save &
// Backup" panel, which starts collapsed by default (applySaveControlsCollapsedState()) —
// that collapse is a separate, unrelated UI concern, so this test invokes
// lockApp() directly (the same global the button's onclick calls) rather
// than depending on that panel's expand/collapse state.
test.describe('unlock', () => {
  test('wrong password is rejected, correct password re-enters', async ({ page }) => {
    const password = 'correct-horse-battery-staple';
    await gotoApp(page);
    await startNewCase(page);
    await chooseEncrypted(page, password);
    await createWard(page, 'Test Ward');

    // Reached the app past the password gate.
    await expect(page.locator('#sidebar')).toBeVisible();

    // lockApp() doesn't resolve until the unlock form is submitted, so this
    // must not await its returned promise -- just kick it off and let the
    // page keep running while we drive the resulting UI.
    await page.evaluate(() => { void (window as any).lockApp(); });
    await expect(page.locator('#unlock-overlay')).toHaveClass(/show/);
    await expect(page.locator('#unlock-password-confirm')).toBeHidden(); // unlock mode, not create mode

    await page.fill('#unlock-password', 'definitely-wrong');
    await page.click('#unlock-submit-btn');
    await expect(page.locator('#unlock-overlay')).toHaveClass(/show/); // still locked
    await expect(page.locator('#unlock-error')).toBeVisible();

    await page.fill('#unlock-password', password);
    await page.click('#unlock-submit-btn');
    await expect(page.locator('#unlock-overlay')).not.toHaveClass(/show/);
    await expect(page.locator('#sidebar')).toBeVisible();
    await expect(page.locator('#ward-selector')).toHaveValue('Test Ward'); // case data survived the lock cycle
  });
});
