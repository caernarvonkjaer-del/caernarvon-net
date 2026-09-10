import { test, expect } from '@playwright/test';
import { createSimplifiedWard, createWard, freshStartNoPassword } from './support/target';

test.describe('GD-derived guardianship selection controls', () => {
  test('existing guardianship-type fields expose canonical GD options', async ({ page }) => {
    await freshStartNoPassword(page);

    await createWard(page, 'Inventory Type Options Ward', 'guardian');
    const inventoryType = page.locator('[data-bind="typeOfGuardianship"]');
    await expect(inventoryType).toBeVisible();
    await inventoryType.selectOption('Guardian Advocate');
    expect(await page.evaluate(() => (window as any).D.typeOfGuardianship)).toBe('Guardian Advocate');

    await createWard(page, 'Annual Type Options Ward', 'annual');
    const annualType = page.locator('[data-annual-path="typeOfGuardianship"]');
    await expect(annualType).toBeVisible();
    await annualType.selectOption('Limited');
    expect(await page.evaluate(() => (window as any).D.typeOfGuardianship)).toBe('Limited');

    await createSimplifiedWard(page, 'Simplified Type Options Ward');
    const simplifiedType = page.locator('[data-form-path="typeOfGuardianship"]');
    await expect(simplifiedType).toBeVisible();
    await simplifiedType.selectOption('Minor - Person - Property');
    expect(await page.evaluate(() => (window as any).D.typeOfGuardianship)).toBe('Minor - Person - Property');

    await createWard(page, 'Initial Lifecycle Options Ward', 'planInitial');
    const initialLifecycle = page.locator('[data-form-path="successorGuardianship"]');
    await expect(initialLifecycle).toBeVisible();
    await initialLifecycle.selectOption('Successor');
    expect(await page.evaluate(() => (window as any).D.successorGuardianship)).toBe('Successor');
  });
});
