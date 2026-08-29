import { test, expect } from '@playwright/test';
import { freshStartNoPassword } from './support/target';

// One smoke test per filing type, per Milestone 1's scoped safety net (not
// exhaustive per-schedule coverage -- that's a later milestone). Uses
// addWard(name, inventoryType) directly (index.html:5266) rather than
// driving each type's Add Ward modal/eligibility screen, since those UI
// paths are a separate concern from "does this filing type's page render."
const INVENTORY_TYPES = [
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

test.describe('routes', () => {
  for (const type of INVENTORY_TYPES) {
    test(`${type} ward renders its cover page with no console errors`, async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', (e) => errors.push(e.message));
      page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

      await freshStartNoPassword(page);
      await page.evaluate((t) => (window as any).addWard('Route Smoke Test Ward', t), type);

      const main = page.locator('#main-content');
      await expect(main).not.toBeEmpty();
      const text = await main.innerText();
      expect(text.trim().length).toBeGreaterThan(0);
      expect(errors, `console/page errors while rendering ${type}: ${errors.join('\n')}`).toEqual([]);
    });
  }

  test('dashboard renders once a ward exists, with no console errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

    await freshStartNoPassword(page);
    await page.evaluate(() => (window as any).addWard('Dashboard Smoke Test Ward', 'guardian'));
    await page.evaluate(() => (window as any).navigate('/dashboard'));

    await expect(page).toHaveURL(/#\/dashboard/);
    await expect(page.locator('#main-content')).toContainText('Dashboard Smoke Test Ward');
    expect(errors).toEqual([]);
  });
});
