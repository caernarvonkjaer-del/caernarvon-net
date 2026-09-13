import { test, expect } from '@playwright/test';
import { freshStartNoPassword, createWard } from './support/target';

test.describe('Plan benefit answers are explicit Yes/No/Unanswered radios', () => {
  test('Plan Annual benefit table starts unanswered and stores both explicit answers', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Annual Benefits Ward', 'planAnnual');
    await page.evaluate(() => (window as any).navigate('/p4'));

    const eligible = page.locator('fieldset[data-yes-no-group="benefits.socialSecurity.eligible"]');
    await expect(eligible).toBeVisible();
    await expect(eligible.locator('legend')).toHaveText('Eligible?');
    await expect(eligible.locator('input:checked')).toHaveCount(0);
    await eligible.locator('input[value="No"]').check();
    expect(await page.evaluate(() => (window as any).D.benefits.socialSecurity.eligible)).toBe('No');

    const other = page.locator('fieldset[data-yes-no-group="benefits.other.appliedFor"]');
    await expect(other).toBeVisible();
    await expect(other.locator('input:checked')).toHaveCount(0);
    await other.locator('input[value="Yes"]').check();
    expect(await page.evaluate(() => (window as any).D.benefits.other.appliedFor)).toBe('Yes');
  });

  test('Plan Initial Question 7 starts unanswered and stores No without triggering a Yes-only explanation', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Initial Benefits Ward', 'planInitial');
    await page.evaluate(() => (window as any).navigate('/p4'));

    const trusts = page.locator('fieldset[data-yes-no-group="q7Trusts"]');
    const pending = page.locator('fieldset[data-yes-no-group="q7PendingBenefits"]');
    await expect(trusts).toBeVisible();
    await expect(trusts.locator('input:checked')).toHaveCount(0);
    await expect(pending.locator('input:checked')).toHaveCount(0);

    await trusts.locator('input[value="No"]').check();
    await pending.locator('input[value="No"]').check();
    expect(await page.evaluate(() => ({
      trusts: (window as any).D.q7Trusts,
      pending: (window as any).D.q7PendingBenefits,
    }))).toEqual({ trusts: 'No', pending: 'No' });
  });
});
