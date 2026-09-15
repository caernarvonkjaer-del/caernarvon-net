import { test, expect } from '@playwright/test';
import { gotoApp } from './support/target';

test.describe('first-access terms acknowledgement', { tag: '@origin-state' }, () => {
  test('blocks startup until terms are checked, then remembers the current version', async ({ page }) => {
    await gotoApp(page, { acceptTerms: false });

    const terms = page.locator('#pg-terms-overlay');
    await expect(terms).toHaveClass(/show/);
    await expect(page.locator('#pg-terms-continue')).toBeDisabled();
    await expect(page.locator('#startup-choice-overlay')).toHaveAttribute('aria-hidden', 'true');

    await page.keyboard.press('Escape');
    await expect(terms).toHaveClass(/show/);

    await page.locator('#pg-terms-agree').check();
    await expect(page.locator('#pg-terms-continue')).toBeEnabled();
    await page.locator('#pg-terms-continue').click();

    await expect(terms).not.toHaveClass(/show/);
    await expect(page.locator('#startup-choice-overlay')).toHaveClass(/show/);
    await expect(page.locator('#startup-choice-overlay')).toHaveAttribute('aria-hidden', 'false');
    await expect.poll(() => page.evaluate(() => localStorage.getItem('pg.termsAccepted'))).toBe('2026-09-15');

    await page.reload({ waitUntil: 'networkidle' });
    await expect(terms).not.toHaveClass(/show/);
    await expect(page.locator('#startup-choice-overlay')).toHaveClass(/show/);
  });

  test('requires acknowledgement again when the stored version is stale', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('pg.termsAccepted', 'stale-version'));
    await gotoApp(page, { acceptTerms: false });
    await expect(page.locator('#pg-terms-overlay')).toHaveClass(/show/);
  });
});
