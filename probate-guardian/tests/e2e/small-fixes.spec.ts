import { test, expect, type Page } from '@playwright/test';
import { freshStartNoPassword, createWard } from './support/target';

// Milestone 73P's small fixes (D22-D27, D32, the Help panel) and 74S's
// progress card (UX-13) and Active Filing box (UX-27), each as a filer meets it.

const navigate = (page: Page, route: string) => page.evaluate((r) => (window as any).GuardianForms.testing.navigate(r), route);

test.describe('73P and 74S: small fixes', () => {
  test('Link to Case names a ward once, though the case holds two of its filings (D22)', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Twin Ward', 'guardian');
    await createWard(page, 'Twin Ward', 'annual'); // carried from the Inventory: one case
    const ids = await page.evaluate(() => (window as any).GuardianForms.testing.snapshot().caseFile.wards.map((w: any) => [w.wardId, w.caseId]));
    expect(ids[0][1]).toBeTruthy();
    expect(ids[1][1]).toBe(ids[0][1]);
    await navigate(page, '/dashboard');
    await page.locator(`[data-dashboard-action="link-case"][data-ward-id="${ids[0][0]}"]`).click();
    const option = page.locator('#pick-case-existing option').nth(1);
    expect(((await option.textContent()) || '').match(/Twin Ward/g)).toHaveLength(1);
  });

  test('New Year says what a Plan\'s new year starts from (D23)', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Year Plan Ward', 'planAnnual');
    await navigate(page, '/dashboard');
    await page.locator('[data-dashboard-action="new-year"]').first().click();
    const modal = page.locator('#startNewYearModal.show');
    await expect(modal).not.toContainText('blank year');
    await expect(modal.locator('#new-year-note')).toHaveText("The new year keeps the ward's and the guardians' details. The plan's answers, signatures and dates are cleared for the new filing: each describes one year.");
    await expect(modal).not.toContainText('Starting Balance');
  });

  test('the dashboard\'s button says "Save case file as…", and the documents box says a case with no password has none (D24, D25)', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Words Ward', 'planInitial');
    await navigate(page, '/');
    await expect(page.locator('.schedule-docs-hint').first()).toContainText('in this case file, which has no password');
    await expect(page.locator('.schedule-docs-hint').first()).not.toContainText('encrypted');
    await navigate(page, '/dashboard');
    await expect(page.getByRole('button', { name: /Save case file as…/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /Export All Filings/ })).toHaveCount(0);
  });

  test('Enter in the Active Filing box opens the one filing the typed text leaves; the box names the filing in full (D26, UX-27)', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Pemberton Switch Ward', 'guardian');
    await createWard(page, 'Alvarez Switch Ward', 'planAnnual');
    const box = page.locator('#ward-selector');
    await expect(box).toHaveAttribute('title', 'Alvarez Switch Ward — Annual Guardianship Plan');
    await expect(box).toHaveAccessibleDescription('Alvarez Switch Ward — Annual Guardianship Plan');
    await box.click();
    await box.fill('Pemb');
    await box.press('Enter');
    await expect.poll(() => page.evaluate(() => (window as any).GuardianForms.testing.snapshot().filing.wardName)).toBe('Pemberton Switch Ward');
    await expect(box).toHaveAttribute('title', 'Pemberton Switch Ward — Initial Inventory');
  });

  test('the dashboard\'s search box fills its place at 1280px and 2,200px, its placeholder whole (D27)', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Search Ward', 'guardian');
    await navigate(page, '/dashboard');
    for (const width of [1280, 2200]) {
      await page.setViewportSize({ width, height: 900 });
      const sizes = await page.evaluate(() => {
        const control = document.querySelector('.dashboard-search-control') as HTMLElement;
        const wrap = document.querySelector('.dashboard-search-wrap') as HTMLElement;
        const input = document.getElementById('dashboard-search') as HTMLInputElement;
        const probe = document.createElement('span');
        probe.style.cssText = `position:absolute;visibility:hidden;white-space:nowrap;font:${getComputedStyle(input).font}`;
        probe.textContent = input.placeholder;
        document.body.append(probe);
        const text = probe.getBoundingClientRect().width;
        probe.remove();
        return { control: control.getBoundingClientRect().width, wrap: wrap.getBoundingClientRect().width, input: input.clientWidth, text };
      });
      expect(Math.abs(sizes.wrap - sizes.control), `${width}px: the box fills its place`).toBeLessThan(2);
      expect(sizes.input, `${width}px: the placeholder fits`).toBeGreaterThanOrEqual(sizes.text);
    }
  });

  test('the Simplified\'s eligibility dialog says what its Load Ward Info list carries (D32)', async ({ page }) => {
    await freshStartNoPassword(page);
    await page.evaluate(() => (window as any).GuardianForms.testing.createFiling.openDialog('simplified'));
    const modal = page.locator('#simplifiedEligibilityModal.show');
    await expect(modal).toContainText("Carries over the ward's name, case number, county, guardian contact details and the attorney's details from an existing case");
    await expect(modal).not.toContainText('from an existing Simplified Annual Plan');
  });

  test('the Help panel lists the nine filing types, and places the theme button and the amounts rightly', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Help Annual Ward', 'annual');
    await navigate(page, '/dashboard');
    await page.click('#help-toggle-btn');
    const panel = page.locator('#help-panel');
    await expect(panel).toContainText("beside each page's title");
    await expect(panel).not.toContainText('sun/moon button in the sidebar');
    // The open panel follows the page.
    await navigate(page, '/inventory-select');
    await expect(panel).toContainText('Nine filing types');
    await expect(panel.locator('h4')).toHaveCount(9);
    await expect(panel).not.toContainText('Three Types of Inventory');
    await page.evaluate(() => (window as any).GuardianForms.testing.activateFiling.open(
      (window as any).GuardianForms.testing.snapshot().caseFile.wards[0].wardId));
    await navigate(page, '/');
    await expect(panel).toContainText('dollars and cents');
    await expect(panel).not.toContainText('nearest dollar');
  });

  test('the progress card says it counts the pages to fill in (UX-13)', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Progress Ward', 'guardian');
    await expect(page.locator('.ward-progress-count')).toHaveText(/^\d+ of 17 pages to fill in complete$/);
    await expect(page.getByRole('progressbar', { name: /pages to fill in complete/ })).toBeVisible();
  });
});
