import { expect, test } from '@playwright/test';
import { freshStartNoPassword } from './support/target';

const sourceTarget = (process.env.PG_TARGET || 'source') === 'source';

test('failed feature chunk shows a reload action instead of a blank view', async ({ page }) => {
  test.skip(!sourceTarget, 'The source target exposes a stable unbundled chunk URL for failure injection');

  await freshStartNoPassword(page);
  await page.evaluate(() => (window as any).addWard('Chunk Retry Ward', 'guardian'));

  let failedOnce = false;
  await page.route('**/src/features/dashboard/index.js', async route => {
    failedOnce = true;
    await route.abort('failed');
  });
  await page.evaluate(() => (window as any).navigate('/dashboard'));

  const main = page.locator('#main-content');
  await expect(main).toContainText('This section could not be loaded.');
  await expect(main.getByRole('button', { name: 'Reload' })).toBeVisible();
  expect(failedOnce).toBe(true);

  await page.unroute('**/src/features/dashboard/index.js');
  await Promise.all([
    page.waitForEvent('load'),
    main.getByRole('button', { name: 'Reload' }).click(),
  ]);
  await expect(page).toHaveURL(/#\/dashboard/);
  await expect(main).not.toContainText('This section could not be loaded.');
});
