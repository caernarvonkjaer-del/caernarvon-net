import { test, expect, type Page } from '@playwright/test';
import { freshStartNoPassword, createWard } from './support/target';

// Milestone 74L (decision 74L-2): the browser tab names the page and the
// filing type, never the ward -- "Schedule B-1 — Initial Inventory — Guardian
// Forms", the test system's warning first while it is on. It read "Guardian
// Forms App" on every page, so tabs, history and a screen reader's page
// announcement couldn't tell pages apart.

const PREFIX = 'TEST SYSTEM - Do not use for filing - ';
const testing = (page: Page) => page.evaluate(() => Object.keys((window as any).GuardianForms.testing));
const navigate = (page: Page, route: string) => page.evaluate((r) => (window as any).GuardianForms.testing.navigate(r), route);
/** The page's heading as the filer reads it: without the warning or the header's buttons. */
const heading = (page: Page) => page.evaluate(() => {
  const h1 = document.querySelector('#main-content .schedule-page h1') as HTMLElement;
  const copy = h1.cloneNode(true) as HTMLElement;
  copy.querySelectorAll('.test-system-title-prefix, .form-header-actions, [aria-hidden="true"]').forEach((n) => n.remove());
  return (copy.textContent || '').replace(/\s+/g, ' ').trim();
});

test.describe('74L: the tab title names the page', () => {
  test('it follows the page, names the filing type, and never the ward', async ({ page }) => {
    await freshStartNoPassword(page);
    expect(await testing(page)).toContain('setTestSystemTitleWarning');
    await createWard(page, 'Pemberton Title Ward', 'guardian');

    await navigate(page, '/b1');
    const b1 = await heading(page);
    expect(b1).toMatch(/B-1/);
    await expect(page).toHaveTitle(`${PREFIX}${b1} — Initial Inventory — Guardian Forms`);

    await navigate(page, '/c4');
    const c4 = await heading(page);
    expect(c4).not.toBe(b1);
    await expect(page).toHaveTitle(`${PREFIX}${c4} — Initial Inventory — Guardian Forms`);
    expect(await page.title()).not.toContain('Pemberton');
  });

  test('a heading that already names the form does not repeat it; the dashboard has no filing type', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Cover Title Ward', 'planInitial');
    await navigate(page, '/');
    await expect(page).toHaveTitle(`${PREFIX}Initial Guardianship Plan — Cover — Guardian Forms`);

    await navigate(page, '/dashboard');
    await expect(page).toHaveTitle(/^TEST SYSTEM - Do not use for filing - .+ — Guardian Forms$/);
    expect(await page.title()).not.toContain('Initial Guardianship Plan');
    expect(await page.title()).not.toContain('Cover Title Ward');
  });

  test('with the test-system warning off, the title has no warning', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Warning Off Ward', 'planAnnual');
    await page.evaluate(() => (window as any).GuardianForms.testing.setTestSystemTitleWarning(false));
    await navigate(page, '/');
    await expect(page).toHaveTitle('Annual Guardianship Plan — Cover — Guardian Forms');
  });
});
