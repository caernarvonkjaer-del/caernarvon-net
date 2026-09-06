import { test, expect } from '@playwright/test';
import { freshStartNoPassword } from './support/target';

test('all visible form controls have accessible names across form types', async ({ page }) => {
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
    await page.evaluate((type) => (window as any).addWard(`Accessibility ${type}`, type), formType);
    await page.locator('#main-content').waitFor({ state: 'visible' });
    const routes = await page.locator('[data-page]').evaluateAll((elements) => [...new Set(elements.map((element: any) => element.dataset.page))]);
    for (const route of routes) {
      await page.evaluate((nextRoute) => (window as any).navigate(nextRoute), route);
      await page.locator('#main-content').waitFor({ state: 'visible' });
      const unlabeled = await page.locator('#main-content input, #main-content select, #main-content textarea').evaluateAll((controls) => controls
        .filter((control: any) => control.type !== 'hidden' && control.type !== 'file' && !control.disabled && control.getClientRects().length > 0)
        .filter((control: any) => {
          const labels = control.id
            ? [...document.querySelectorAll('label[for]')].filter((label: any) => label.htmlFor === control.id)
            : [];
          return !control.getAttribute('aria-label')
            && !control.getAttribute('aria-labelledby')
            && !labels.length
            && !control.closest('label');
        })
        .map((control: any) => ({
          type: control.type || control.tagName.toLowerCase(),
          id: control.id,
          path: control.dataset?.formPath || control.dataset?.bind || control.dataset?.annualPath || '',
        })));
      expect(unlabeled, `${formType} ${route} has unlabeled controls`).toEqual([]);
    }
  }
});

test('Activity Log toolbar controls have explicit labels', async ({ page }) => {
  await freshStartNoPassword(page);
  await page.evaluate(() => (window as any).addWard('Activity Log Labels', 'guardian'));
  await page.evaluate(() => (window as any).navigate('/activity-log'));

  await expect(page.locator('label[for="activity-log-search"]')).toHaveText('Search activity log details');
  await expect(page.locator('label[for="activity-log-status"]')).toHaveText('Filter activity log by result');
  await expect(page.locator('label[for="activity-log-type"]')).toHaveText('Filter activity log by event type');
});
