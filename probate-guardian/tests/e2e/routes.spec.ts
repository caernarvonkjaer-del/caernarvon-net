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
    await page.locator('[data-inventory-change="import-excel"]').waitFor({ state: 'attached' });
    await page.evaluate(() => (window as any).navigate('/dashboard'));

    await expect(page).toHaveURL(/#\/dashboard/);
    await expect(page.locator('#main-content')).toContainText('Dashboard Smoke Test Ward');
    expect(errors).toEqual([]);
  });

  test('dashboard controls work without inline event handlers', async ({ page }) => {
    await freshStartNoPassword(page);
    await page.evaluate(() => (window as any).addWard('Alpha Dashboard Ward', 'guardian'));
    await page.locator('[data-inventory-change="import-excel"]').waitFor({ state: 'attached' });
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
    await expect(page.locator('#dashboard-group-toggle')).toContainText('Grouped by Type');
    await page.locator('#dashboard-group-toggle').dispatchEvent('click');
    await expect(page.locator('#dashboard-group-toggle')).toContainText('Grouped by Case');
  });

  test('role-aware dashboard triage uses local preferences without mutating wards', async ({ page }) => {
    await freshStartNoPassword(page);
    await page.evaluate(() => (window as any).addWard('<img src=x onerror=alert(1)> Alpha Ward', 'guardian'));
    await page.locator('[data-inventory-change="import-excel"]').waitFor({ state: 'attached' });
    await page.evaluate(() => (window as any).addWard('Beta Ward', 'annual'));
    await page.evaluate(() => (window as any).addWard('Gamma Ward', 'planSimplified'));
    await page.evaluate(() => (window as any).addWard('Delta Ward', 'annual'));
    const beforePreferences = await page.evaluate(() => {
      const wards = (window as any).getGuardianData().wards;
      const periodTo = new Date();
      periodTo.setDate(periodTo.getDate() - 90);
      const dueTodayPeriodEnd = [periodTo.getFullYear(), String(periodTo.getMonth() + 1).padStart(2, '0'), String(periodTo.getDate()).padStart(2, '0')].join('-');
      wards[0].gid = '2026-01-01';
      wards[0].dashboardWorkflow = { status: 'disapproved-needs-correction', assigneeName: 'Alex Attorney' };
      wards[1].periodTo = dueTodayPeriodEnd;
      wards[1].dashboardWorkflow = { status: 'pending-court-review' };
      wards[2].periodTo = dueTodayPeriodEnd;
      wards[3].periodTo = dueTodayPeriodEnd;
      wards[3].dashboardWorkflow = { status: 'approved' };
      return JSON.stringify(wards);
    });
    await page.evaluate(() => (window as any).navigate('/dashboard'));

    const main = page.locator('#main-content');
    await main.locator('[data-dashboard-bound="true"]').waitFor();
    const expectPrimaryMetricStrip = async () => {
      const primaryMetrics = main.locator('.dashboard-triage-summary .dashboard-stat:not(.dashboard-stat-secondary)');
      await expect(primaryMetrics).toHaveCount(3);
      await expect(primaryMetrics.filter({ hasText: 'Action Items / Exceptions' })).toContainText('1');
      await expect(primaryMetrics.filter({ hasText: 'Approaching Deadlines' })).toContainText('1');
      await expect(primaryMetrics.filter({ hasText: 'Pending Court Review' })).toContainText('1');
      await expect(main.locator('.dashboard-triage-summary')).not.toContainText('Combined total');
      await expect(main.locator('.dashboard-summary-secondary')).toContainText('Combined total');
    };

    await expect(main.locator('.dashboard-family-row')).toHaveCount(4);
    await expect(main.locator('#dashboard-role')).toHaveCount(1);
    await expect(main.locator('.dashboard-page-header #dashboard-role')).toHaveCount(1);
    await expect(main.locator('.dashboard-page-header #dashboard-assignment-filter')).toHaveCount(0);
    await expect(main.locator('[data-dashboard-action="select-existing"]')).toHaveCount(1);
    await expect(main.locator('.dashboard-page-header [data-dashboard-action="select-existing"]')).toHaveText(/New Filing from Existing/);
    await expect(main.locator('.inventory-convert-banner')).toHaveCount(0);
    await expect(main.locator('img[src="x"]')).toHaveCount(0);
    await expect(main).toContainText('<img src=x onerror=alert(1)> Alpha Ward');
    await expectPrimaryMetricStrip();
    await expect(main.locator('.dashboard-worklist-tab').filter({ hasText: 'Deadlines' })).toContainText('2');
    await expect(main.locator('.dashboard-deadlines-list')).not.toContainText('Beta Ward');
    await expect(main.locator('.dashboard-deadlines-list')).not.toContainText('Delta Ward');
    await expect(main.locator('[data-dashboard-action="select-existing"]')).toHaveCount(1);
    await expect(main.locator('.dashboard-family-row').filter({ hasText: 'Alpha Ward' })).toHaveAttribute('data-dashboard-priority', 'urgent');
    await expect(main.locator('.dashboard-family-row').filter({ hasText: 'Gamma Ward' })).toHaveAttribute('data-dashboard-priority', 'warning');

    await page.locator('#dashboard-role').selectOption('professional');
    await expect(main.locator('.dashboard-triage-row')).toHaveCount(4);
    await expect(main.locator('#dashboard-role')).toHaveCount(1);
    await expect(main.locator('#dashboard-assignment-filter')).toHaveCount(1);
    await expect(main.locator('.dashboard-page-header #dashboard-assignment-filter')).toHaveCount(0);
    await expectPrimaryMetricStrip();
    await expect(main.locator('[data-dashboard-change="workflow-status"]')).toHaveCount(4);
    await expect(main.locator('[data-dashboard-change="assignee"]')).toHaveCount(4);
    await expect(main.locator('.dashboard-triage-row').filter({ hasText: 'Alpha Ward' })).toHaveAttribute('data-dashboard-priority', 'urgent');
    await expect(main.locator('.dashboard-triage-row').filter({ hasText: 'Beta Ward' })).toHaveAttribute('data-dashboard-priority', 'pending');
    await expect(main.locator('.dashboard-triage-row').filter({ hasText: 'Gamma Ward' })).toHaveAttribute('data-dashboard-priority', 'warning');
    await expect(main.locator('.dashboard-triage-row').filter({ hasText: 'Delta Ward' })).toHaveAttribute('data-dashboard-priority', 'approved');
    await page.locator('#dashboard-deadline-filter').selectOption('due-soon');
    await expect(main.locator('.dashboard-triage-row')).toHaveCount(1);
    await expect(main.locator('.dashboard-triage-row')).toContainText('Gamma Ward');
    await expect(main.locator('.dashboard-triage-row')).not.toContainText('Beta Ward');
    await expect(main.locator('.dashboard-triage-row')).not.toContainText('Delta Ward');
    await page.locator('#dashboard-deadline-filter').selectOption('all');

    await page.locator('#dashboard-role').selectOption('assistant');
    await expect(main.locator('#dashboard-role')).toHaveCount(1);
    await expect(main.locator('#dashboard-assignment-filter')).toHaveCount(1);
    await expect(main.locator('.dashboard-page-header #dashboard-assignment-filter')).toHaveCount(1);
    await expectPrimaryMetricStrip();
    await expect(page.locator('#dashboard-assignment-filter')).toContainText('Alex Attorney');
    await page.locator('#dashboard-assignment-filter').selectOption('unassigned');
    await expect(main.locator('.dashboard-triage-row')).toHaveCount(3);
    await expect(page.evaluate(() => localStorage.getItem('pg-dashboard-preferences-v1'))).resolves.toContain('assistant');

    const afterPreferences = await page.evaluate(() => JSON.stringify((window as any).getGuardianData().wards));
    expect(afterPreferences).toBe(beforePreferences);

    await page.evaluate(() => (window as any).navigate('/inventory-select'));
    await page.evaluate(() => (window as any).navigate('/dashboard'));
    await page.evaluate(() => (window as any).navigate('/inventory-select'));
    await page.evaluate(() => (window as any).navigate('/dashboard'));
    await main.locator('[data-dashboard-bound="true"]').waitFor();
    await page.locator('#dashboard-assignment-filter').selectOption('all');
    await main.locator('[data-dashboard-ward-id="' + await page.evaluate(() => (window as any).getGuardianData().wards[2].wardId) + '"] [data-dashboard-action="archive"]').dispatchEvent('click');
    await expect(main.locator('.dashboard-triage-row')).toHaveCount(3);
    expect(await page.evaluate(() => (window as any).getGuardianData().wards[2].archived)).toBe(true);
  });

  test('explicit dashboard workflow changes persist normalized metadata', async ({ page }) => {
    await freshStartNoPassword(page);
    await page.evaluate(() => (window as any).addWard('Workflow Ward', 'guardian'));
    await page.locator('[data-inventory-change="import-excel"]').waitFor({ state: 'attached' });
    await page.evaluate(() => (window as any).navigate('/dashboard'));
    await page.locator('#main-content [data-dashboard-bound="true"]').waitFor();
    await page.locator('#dashboard-role').selectOption('professional');

    const row = page.locator('.dashboard-triage-row').filter({ hasText: 'Workflow Ward' });
    await row.locator('[data-dashboard-change="workflow-status"]').selectOption('approved');
    await expect.poll(() => page.evaluate(() => (window as any).getGuardianData().wards[0].dashboardWorkflow)).toEqual({ status: 'approved' });
    await expect(page.locator('#last-saved-indicator')).toContainText('Unsaved changes');

    const assignee = row.locator('[data-dashboard-change="assignee"]');
    await assignee.fill('  <img src=x onerror=alert(1)> Alex   Attorney  ');
    await assignee.press('Tab');
    await expect.poll(() => page.evaluate(() => (window as any).getGuardianData().wards[0].dashboardWorkflow)).toEqual({
      status: 'approved',
      assigneeName: '<img src=x onerror=alert(1)> Alex Attorney',
    });
    await expect(page.locator('.dashboard-triage-row img[src="x"]')).toHaveCount(0);

    await row.locator('[data-dashboard-change="workflow-status"]').selectOption('auto');
    await expect.poll(() => page.evaluate(() => (window as any).getGuardianData().wards[0].dashboardWorkflow)).toEqual({
      assigneeName: '<img src=x onerror=alert(1)> Alex Attorney',
    });
    await row.locator('[data-dashboard-change="assignee"]').fill('   ');
    await row.locator('[data-dashboard-change="assignee"]').press('Tab');
    await expect.poll(() => page.evaluate(() => (window as any).getGuardianData().wards[0].dashboardWorkflow)).toBeUndefined();
  });

  test('shell controls work without inline event handlers', async ({ page }) => {
    await freshStartNoPassword(page);
    await page.evaluate(() => (window as any).addWard('Alpha Shell Ward', 'guardian'));
    await page.locator('[data-inventory-change="import-excel"]').waitFor({ state: 'attached' });
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
    await page.getByRole('button', { name: 'Skip Tour' }).click();

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

    await page.locator('#sidebar [data-form-action="navigate"][data-route="/p2"]').click();
    await expect(page).toHaveURL(/#\/p2$/);
    await page.locator('#q1Residences').fill('A supported residence');
    await expect.poll(() => page.evaluate(() => (window as any).D.q1Residences)).toBe('A supported residence');

    const restoreRights = page.locator('#q7RestoreRights');
    await restoreRights.check();
    await expect.poll(() => page.evaluate(() => (window as any).D.q7RestoreRights)).toBe('Yes');
    await expect(page.locator('[data-form-path][oninput], [data-form-path][onchange], [data-form-path][onfocus], [data-form-path][onblur], [data-form-control][oninput], [data-form-control][onfocus], [data-form-control][onblur]')).toHaveCount(0);
  });

  test('all 9 form types render a standardized summary page at /summary with case info', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

    for (const type of INVENTORY_TYPES) {
      await freshStartNoPassword(page);
      await page.evaluate((t) => (window as any).addWard(`Summary Test Ward ${t}`, t), type);
      await page.evaluate(() => (window as any).navigate('/summary'));

      const main = page.locator('#main-content');
      await expect(main).not.toBeEmpty();
      await expect(main.locator('.summary-box').first()).toBeVisible();
      await expect(main.getByRole('heading', { level: 1 })).toContainText('Summary');
    }

    expect(errors).toEqual([]);
  });

  test('form fields in dark mode use light gray background with black font', async ({ page }) => {
    await freshStartNoPassword(page);
    await page.evaluate(() => (window as any).addWard('Dark Theme Form Ward', 'simplified'));
    await page.evaluate(() => { document.documentElement.dataset.theme = 'dark'; });

    const wardNameInput = page.locator('#wardName');
    await expect(wardNameInput).toBeVisible();

    const styles = await wardNameInput.evaluate((el) => {
      const computed = window.getComputedStyle(el);
      return {
        bg: computed.backgroundColor,
        color: computed.color,
      };
    });

    // #dde3eb is rgb(221, 227, 235), black font is rgb(0, 0, 0)
    expect(styles.bg).toBe('rgb(221, 227, 235)');
    expect(styles.color).toBe('rgb(0, 0, 0)');
  });
});


