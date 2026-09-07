import { test, expect } from '@playwright/test';
import { createSimplifiedWard, createWard, freshStartNoPassword } from './support/target';

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

test('Guardian D-3 and D-4 summary panels use responsive two-column rows', async ({ page }) => {
  await freshStartNoPassword(page);
  await page.evaluate(() => (window as any).addWard('Guardian Summary Layout Ward', 'guardian'));
  await page.locator('[data-inventory-change="import-excel"]').waitFor({ state: 'attached' });

  await page.setViewportSize({ width: 1280, height: 900 });
  for (const route of ['/d3', '/d4']) {
    await page.evaluate((nextRoute) => (window as any).navigate(nextRoute), route);
    const panels = page.locator('.schedule-page > .row.g-3 > .col-12.col-lg-6 > .summary-box');
    await expect(panels).toHaveCount(2);
    const desktopColumns = await panels.evaluateAll(elements => new Set(elements.map(element => (element as HTMLElement).getBoundingClientRect().x)).size);
    expect(desktopColumns, `${route} desktop columns`).toBe(2);
  }

  await page.setViewportSize({ width: 700, height: 900 });
  await page.evaluate(() => (window as any).navigate('/d4'));
  const mobilePanels = page.locator('.schedule-page > .row.g-3 > .col-12.col-lg-6 > .summary-box');
  const mobileColumns = await mobilePanels.evaluateAll(elements => new Set(elements.map(element => (element as HTMLElement).getBoundingClientRect().x)).size);
  expect(mobileColumns).toBe(1);
});

test('Annual Accounting schedule entries use responsive Bootstrap grid columns', async ({ page }) => {
  await freshStartNoPassword(page);
  await page.evaluate(() => (window as any).addWard('Annual Schedule Layout Ward', 'annual'));
  await page.evaluate(() => {
    const data = (window as any).D;
    data.schA = [
      { payer: 'Social Security', description: 'Monthly benefit', bank: 'Bank One', accountNo: '1', amount: 1000 },
      { payer: 'Pension', description: 'Monthly benefit', bank: 'Bank Two', accountNo: '2', amount: 500 },
    ];
    data.schB1 = [
      { bankAcct: '1', checkNo: '100', periodFrom: '2026-01-01', periodTo: '2026-01-31', datePaid: '2026-02-01', payee: 'Attorney One', courtOrderDate: '2026-01-15', amount: 100 },
      { bankAcct: '2', checkNo: '101', periodFrom: '2026-02-01', periodTo: '2026-02-28', datePaid: '2026-03-01', payee: 'Attorney Two', courtOrderDate: '2026-02-15', amount: 200 },
    ];
  });

  await page.setViewportSize({ width: 1600, height: 900 });
  await page.evaluate(() => (window as any).navigate('/scha'));
  const incomeColumns = page.locator('.schedule-entry-grid > .col-12 > .entry-card');
  await expect(incomeColumns).toHaveCount(2);
  const incomeXPositions = await incomeColumns.evaluateAll(elements => new Set(elements.map(element => (element as HTMLElement).getBoundingClientRect().x)).size);
  expect(incomeXPositions).toBe(1);

  await page.evaluate(() => (window as any).navigate('/schb1'));
  const feeColumns = page.locator('.schedule-entry-grid > .col-12.col-xxl-6 > .entry-card');
  await expect(feeColumns).toHaveCount(2);
  const feeXPositions = await feeColumns.evaluateAll(elements => new Set(elements.map(element => (element as HTMLElement).getBoundingClientRect().x)).size);
  expect(feeXPositions).toBe(2);

  await page.setViewportSize({ width: 700, height: 900 });
  const mobileXPositions = await feeColumns.evaluateAll(elements => new Set(elements.map(element => (element as HTMLElement).getBoundingClientRect().x)).size);
  expect(mobileXPositions).toBe(1);
});

test('plan record cards use their responsive Bootstrap grid classifications', async ({ page }) => {
  const assertCardColumns = async (route: string, columnClass: string, expectedDesktopColumns: number, containerSelector = '.schedule-entry-grid') => {
    await page.evaluate((nextRoute) => (window as any).navigate(nextRoute), route);
    const cards = page.locator(`${containerSelector} > ${columnClass} > .entry-card`);
    await expect(cards).toHaveCount(2);
    const xPositions = await cards.evaluateAll(elements => new Set(elements.map(element => (element as HTMLElement).getBoundingClientRect().x)).size);
    expect(xPositions, `${route} desktop columns`).toBe(expectedDesktopColumns);
    return cards;
  };

  await freshStartNoPassword(page);
  await createWard(page, 'Annual Plan Layout Ward', 'planAnnual');
  await page.evaluate(() => {
    const data = (window as any).D;
    data.q1Residences = [{}, {}];
    data.q4Providers = [{}, {}];
    data.q10Executed = true;
    data.q10Directives = [{}, {}];
  });
  await page.setViewportSize({ width: 1440, height: 900 });
  await assertCardColumns('/p2', '.col-12.col-xl-6', 2);
  await assertCardColumns('/p5', '.col-12.col-xl-6', 2);
  await assertCardColumns('/p9', '.col-12', 1);

  await createWard(page, 'Initial Plan Layout Ward', 'planInitial');
  await page.evaluate(() => {
    const data = (window as any).D;
    data.q9Providers = [{}, {}];
    data.q11Directives = [{}, {}];
  });
  await assertCardColumns('/p5', '.col-12.col-xl-6', 2);
  await assertCardColumns('/p8', '.col-12', 1);

  await createWard(page, 'Minor Plan Layout Ward', 'planMinor');
  await page.evaluate(() => {
    const data = (window as any).D;
    data.q2Residences = [{}, {}];
    data.q3Providers = [{}, {}];
  });
  await assertCardColumns('/p2', '.col-12.col-xl-6', 2);
  const minorProviderCards = await assertCardColumns('/p3', '.col-12.col-xl-6', 2);

  await page.setViewportSize({ width: 700, height: 900 });
  const mobileXPositions = await minorProviderCards.evaluateAll(elements => new Set(elements.map(element => (element as HTMLElement).getBoundingClientRect().x)).size);
  expect(mobileXPositions).toBe(1);

  await createSimplifiedWard(page, 'Simplified Accounting Layout Ward');
  await page.evaluate(() => {
    const data = (window as any).D;
    data.guardians = [{ name: 'Guardian 1' }, { name: 'Guardian 2' }];
    data.remuneration = [{ guardian: 'Guardian 1', type: 'Services' }, { guardian: 'Guardian 2', type: 'Care' }];
  });
  await page.setViewportSize({ width: 1440, height: 900 });
  await assertCardColumns('/p4', '.col-12.col-md-6', 2, '.card-grid-2col');
  await assertCardColumns('/p7', '.col-12.col-xl-6', 2);

  await createWard(page, 'Simplified Plan Layout Ward', 'planSimplified');
  await page.evaluate(() => (window as any).navigate('/p2'));
  await expect(page.locator('.entry-card')).toHaveCount(0);
});
