import { test, expect } from '@playwright/test';
import { freshStartNoPassword } from './support/target';

test('signature-style controls and legacy bindings are absent from every form route', async ({ page }) => {
  await freshStartNoPassword(page);

  const formTypes = [
    'guardian',
    'simplified',
    'annual',
    'finalAccounting',
    'trustAccounting',
    'planSimplified',
    'planAnnual',
    'planInitial',
    'planMinor',
  ];

  for (const formType of formTypes) {
    await page.evaluate((type) => (window as any).addWard(`Signature audit ${type}`, type), formType);
    const routes = await page.locator('[data-page]').evaluateAll((elements) => [...new Set(elements.map((element: any) => element.dataset.page))]);
    for (const route of routes) {
      await page.evaluate((nextRoute) => (window as any).navigate(nextRoute), route);
      await page.locator('#main-content').waitFor({ state: 'visible' });
      await expect(page.locator('#main-content')).not.toContainText('Use /s/ format');
      await expect(page.locator('#main-content [data-form-path*="useSlashS"], #main-content [data-bind*="useSlashS"], #main-content [data-annual-path*="useSlashS"]')).toHaveCount(0);
    }
  }
});