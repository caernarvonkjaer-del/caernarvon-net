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
      await page.waitForFunction(() => typeof (window as any).doSavePdfGuardian === 'function');
    await page.evaluate(() => (window as any).navigate('/dashboard'));

    await expect(page).toHaveURL(/#\/dashboard/);
    await expect(page.locator('#main-content')).toContainText('Dashboard Smoke Test Ward');
    expect(errors).toEqual([]);
  });

  test('dashboard controls work without inline event handlers', async ({ page }) => {
    await freshStartNoPassword(page);
    await page.evaluate(() => (window as any).addWard('Alpha Dashboard Ward', 'guardian'));
    await page.waitForFunction(() => typeof (window as any).doSavePdfGuardian === 'function');
    await page.evaluate(() => (window as any).addWard('Beta Dashboard Ward', 'annual'));
    await expect(page.locator('#main-content').getByRole('heading', { name: 'Part I — Required Information' })).toBeVisible();
    await page.evaluate(() => (window as any).navigate('/dashboard'));

    const main = page.locator('#main-content');
    await main.locator('[data-dashboard-bound="true"]').waitFor();
    await expect(main.locator('[onchange], [onclick], [oninput], [onkeydown]')).toHaveCount(0);

    const groupToggle = page.locator('#dashboard-group-toggle');
    await groupToggle.dispatchEvent('click');
    await expect(groupToggle).toContainText('Grouped by Case');
    await groupToggle.dispatchEvent('click');
    await expect(groupToggle).toContainText('Flat Grid');

    await page.locator('#dashboard-search').fill('Alpha');
    await expect(main.locator('.ward-card')).toHaveCount(1);
    await expect(main.locator('.ward-card')).toContainText('Alpha Dashboard Ward');

    await main.locator('[data-dashboard-action="archive"]').dispatchEvent('click');
    await expect(main.locator('.ward-card')).toHaveCount(0);
    await main.getByRole('button', { name: /Archived \/ Closed Wards/ }).dispatchEvent('click');
    await expect(main.locator('.ward-card')).toContainText('Alpha Dashboard Ward');

    await page.evaluate(() => (window as any).navigate('/inventory-select'));
    await page.evaluate(() => (window as any).navigate('/dashboard'));
    await main.locator('[data-dashboard-bound="true"]').waitFor();
    await expect(page.locator('#dashboard-group-toggle')).toContainText('Flat Grid');
    await page.locator('#dashboard-group-toggle').dispatchEvent('click');
    await expect(page.locator('#dashboard-group-toggle')).toContainText('Grouped by Type');
  });

  test('shell controls work without inline event handlers', async ({ page }) => {
    await freshStartNoPassword(page);
    await page.evaluate(() => (window as any).addWard('Alpha Shell Ward', 'guardian'));
    await page.waitForFunction(() => typeof (window as any).doSavePdfGuardian === 'function');
    await page.evaluate(() => (window as any).addWard('Beta Shell Ward', 'annual'));
    await expect(page.locator('#main-content').getByRole('heading', { name: 'Part I — Required Information' })).toBeVisible();
    await page.evaluate(() => (window as any).navigate('/dashboard'));
    await page.locator('[data-dashboard-bound="true"]').waitFor();

    await expect(page.locator('[data-shell-action][onclick], [data-shell-action][oninput], [data-shell-action][onchange], [data-shell-action][onfocus], [data-shell-action][onkeydown], #ward-selector[oninput], #ward-selector[onfocus], #ward-selector[onkeydown]')).toHaveCount(0);

    const html = page.locator('html');
    const initialTheme = await html.getAttribute('data-theme');
    await page.locator('#theme-toggle-btn').dispatchEvent('click');
    await expect(html).toHaveAttribute('data-theme', initialTheme === 'dark' ? 'light' : 'dark');

    await page.locator('#help-toggle-btn').dispatchEvent('click');
    await expect(page.locator('#help-panel')).toBeVisible();
    await page.locator('.help-panel-close').dispatchEvent('click');
    await expect(page.locator('#help-panel')).toBeHidden();

    const selector = page.locator('#ward-selector');
    await selector.focus();
    await expect(page.locator('#ward-selector-dropdown')).toContainText('Alpha Shell Ward');
    await selector.fill('Alpha Shell Ward');
    await selector.press('Enter');
    await expect(selector).toHaveValue('Alpha Shell Ward');

    await page.setViewportSize({ width: 700, height: 800 });
    const mobileMenu = page.locator('#mobile-menu-btn');
    await mobileMenu.click();
    await expect(mobileMenu).toHaveAttribute('aria-expanded', 'true');
    await expect(page.locator('#sidebar')).toHaveClass(/mobile-open/);
    await page.locator('#sidebar-backdrop').click({ position: { x: 690, y: 400 } });
    await expect(mobileMenu).toHaveAttribute('aria-expanded', 'false');
    await expect(page.locator('#sidebar')).not.toHaveClass(/mobile-open/);
  });

  test('ward management modals work without inline event handlers', async ({ page }) => {
    await freshStartNoPassword(page);
    await page.evaluate(() => (window as any).showAddWardModalForType('guardian'));
    await expect(page.locator('#lazy-fragment-host [onclick], #lazy-fragment-host [oninput], #lazy-fragment-host [onchange], #lazy-fragment-host [onfocus], #lazy-fragment-host [onkeydown]')).toHaveCount(0);

    await page.locator('#new-ward-name').fill('alpha modal ward');
    await expect(page.locator('#new-ward-name')).toHaveValue('Alpha Modal Ward');
    await page.locator('#addWardModal [data-modal-action="add-ward"]').click();
    await expect(page.locator('#addWardModal')).toBeHidden();
    await expect(page.locator('#ward-selector')).toHaveValue('Alpha Modal Ward');

    await page.evaluate(() => (window as any).showRenameWardModal());
    await page.locator('#rename-ward-input').fill('renamed modal ward');
    await page.locator('#renameWardModal [data-modal-action="rename-ward"]').click();
    await expect(page.locator('#renameWardModal')).toBeHidden();
    await expect(page.locator('#ward-selector')).toHaveValue('Renamed Modal Ward');

    await page.evaluate(() => (window as any).confirmDeleteWard());
    await page.locator('#deleteWardModal [data-modal-action="delete-ward"]').click();
    await expect(page.locator('#deleteWardModal')).toBeHidden();
    await expect.poll(() => page.evaluate(() => (window as any).guardianData.wards.length)).toBe(0);
  });

  test('shared plan controls persist through delegated form events', async ({ page }) => {
    await freshStartNoPassword(page);
    await page.evaluate(() => (window as any).addWard('Shared Form Ward', 'planSimplified'));
    await page.locator('[data-shell-action="hide-auto-export-reminder"]').click();

    const caseNumber = page.locator('#caseNumber');
    await caseNumber.fill('2026cp123');
    await caseNumber.blur();
    await expect(caseNumber).toHaveValue('20-026123-GD');
    await expect.poll(() => page.evaluate(() => (window as any).D.caseNumber)).toBe('20-026123-GD');

    const county = page.locator('#county');
    await county.fill('Ora');
    await page.locator('#county-dropdown [data-county="Orange"]').click();
    await expect(county).toHaveValue('Orange');
    await expect.poll(() => page.evaluate(() => (window as any).D.county)).toBe('Orange');

    await page.locator('#main-content [data-form-action="navigate"][data-route="/p2"]').click();
    await expect(page).toHaveURL(/#\/p2$/);
    await page.locator('#q1Residences').fill('A supported residence');
    await expect.poll(() => page.evaluate(() => (window as any).D.q1Residences)).toBe('A supported residence');

    const restoreRights = page.locator('#q7RestoreRights');
    await restoreRights.check();
    await expect.poll(() => page.evaluate(() => (window as any).D.q7RestoreRights)).toBe('Yes');
    await expect(page.locator('[data-form-path][oninput], [data-form-path][onchange], [data-form-path][onfocus], [data-form-path][onblur], [data-form-control][oninput], [data-form-control][onfocus], [data-form-control][onblur]')).toHaveCount(0);
  });
});
