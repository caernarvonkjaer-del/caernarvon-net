import { test, expect } from '@playwright/test';
import { gotoApp, startNewCase, chooseEncrypted, createWard } from './support/target';

// Milestone 76K items 4 and 5, with real key presses (AGENTS.md section 6).
//  5. Escape dismissed the lock screen with the case already cleared from
//     memory: a blank "Locked" page whose only way out -- reloading -- lost
//     work since the last save. The start and password-choice screens closed
//     the same way, onto nothing.
//  4. While locked, the hidden sidebar still held the ward's name in its
//     picker and info card, and a dialog built into the page stayed open.

test.describe('76K: the lock and start screens', () => {
  test('Escape leaves the lock screen up; while locked no ward name is on the page; unlocking brings the filing back', async ({ page }) => {
    const password = 'correct-horse-battery-staple';
    await gotoApp(page);
    await startNewCase(page);
    await chooseEncrypted(page, password);
    await createWard(page, 'Escape Test Ward');
    await expect(page.locator('#ward-selector')).toHaveValue('Escape Test Ward');

    // The Lock button sits in a collapsed panel; the lock it runs is what is under test (as unlock.spec.ts).
    await page.evaluate(() => { void (window as any).GuardianForms.testing.lock(); });
    const lock = page.locator('#unlock-overlay');
    await expect(lock).toHaveClass(/show/);
    await page.keyboard.press('Escape');
    await expect(lock).toHaveClass(/show/);
    await page.locator('#unlock-password').press('Escape');
    await expect(lock).toHaveClass(/show/);

    const pageText = await page.evaluate(() => document.body.innerText + [...document.querySelectorAll('input')].map((i) => (i as HTMLInputElement).value).join(' '));
    expect(pageText).not.toContain('Escape Test Ward');

    await page.fill('#unlock-password', password);
    await page.click('#unlock-submit-btn');
    await expect(lock).not.toHaveClass(/show/);
    await expect(page.locator('#ward-selector')).toHaveValue('Escape Test Ward');
  });

  test('Escape does not close the start or password-choice screens', async ({ page }) => {
    await gotoApp(page);
    const start = page.locator('#startup-choice-overlay');
    await expect(start).toHaveClass(/show/);
    await page.keyboard.press('Escape');
    await expect(start).toHaveClass(/show/);
    await startNewCase(page);
    const choice = page.locator('#security-choice-overlay');
    await expect(choice).toHaveClass(/show/);
    await page.keyboard.press('Escape');
    await expect(choice).toHaveClass(/show/);
  });
});
