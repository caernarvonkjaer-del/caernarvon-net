import { test, expect } from '@playwright/test';
import { freshStartNoPassword } from './support/target';

test('schedule entry cards use responsive two-column flow', async ({ page }) => {
  await freshStartNoPassword(page);
  await page.evaluate(() => (window as any).addWard('Schedule Layout Ward', 'guardian'));
  await page.locator('[data-inventory-change="import-excel"]').waitFor({ state: 'attached' });
  await page.evaluate(() => {
    const data = (window as any).D;
    data.scheduleA2 = [{ lenderName: 'Lender', lenderAddress: '1 Main Street', lenderCityStateZip: 'Tampa, FL 33602', liabilityType: 'Mortgage', accountNumber: '1', notes: '', fullDebtBalance: 1000, wardPercent: 100 }];
    data.scheduleB1 = [
      { institutionName: 'Bank One', accountType: 'Checking', accountNumber: '1', streetAddress: '1 Main Street', cityStateZip: 'Tampa, FL 33602', fullAssetAmount: 1000, wardPercent: 100 },
      { institutionName: 'Bank Two', accountType: 'Savings', accountNumber: '2', streetAddress: '2 Main Street', cityStateZip: 'Tampa, FL 33602', fullAssetAmount: 2000, wardPercent: 100 },
    ];
    data.scheduleB2 = [
      { description: 'Vehicle', streetAddress: '1 Main Street', cityStateZip: 'Tampa, FL 33602', valuationMethod: 'KBB', fullAssetValue: 1000, wardPercent: 100 },
      { description: 'Furniture', streetAddress: '1 Main Street', cityStateZip: 'Tampa, FL 33602', valuationMethod: 'Inventory', fullAssetValue: 500, wardPercent: 100 },
    ];
    data.scheduleB3 = [
      { description: 'IRA', streetAddress: '1 Main Street', cityStateZip: 'Tampa, FL 33602', fullAssetValue: 1000, wardPercent: 100 },
      { description: 'Bond', streetAddress: '1 Main Street', cityStateZip: 'Tampa, FL 33602', fullAssetValue: 500, wardPercent: 100 },
    ];
  });
  await page.evaluate(() => (window as any).navigate('/'));

  await page.setViewportSize({ width: 1280, height: 900 });
  for (const route of ['/a2', '/b1', '/b2', '/b3']) {
    await page.evaluate((nextRoute) => (window as any).navigate(nextRoute), route);
    const cards = page.locator('.schedule-entry-grid > .col-12 > .entry-card');
    await expect(cards.first()).toBeVisible();
    const columns = await cards.evaluateAll(elements => new Set(elements.map(element => (element as HTMLElement).getBoundingClientRect().x)).size);
    const firstWidth = await cards.first().evaluate(element => (element as HTMLElement).getBoundingClientRect().width);
    if (route === '/a2') {
      expect(columns, `${route} desktop columns`).toBe(1);
      expect(firstWidth).toBeLessThan(700);
    } else {
      expect(columns, `${route} desktop columns`).toBe(2);
    }
  }

  await page.setViewportSize({ width: 700, height: 900 });
  await page.evaluate(() => (window as any).navigate('/b1'));
  const mobileCards = page.locator('.schedule-entry-grid > .col-12 > .entry-card');
  const mobileColumns = await mobileCards.evaluateAll(elements => new Set(elements.map(element => (element as HTMLElement).getBoundingClientRect().x)).size);
  expect(mobileColumns).toBe(1);
});
