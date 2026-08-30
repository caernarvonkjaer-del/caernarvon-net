import { expect, test } from '@playwright/test';
import { freshStartNoPassword } from './support/target';

const VIEWPORTS = [
  { name: 'desktop', width: 1920, height: 1080 },
  { name: 'laptop', width: 1366, height: 768 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'mobile', width: 390, height: 844 },
];

test('dashboard remains coherent across Milestone 15 viewports and themes', async ({ page }, testInfo) => {
  await freshStartNoPassword(page);
  for (const [name, type] of [
    ['Correction Required', 'guardian'],
    ['Deadline Approaching', 'annual'],
    ['Awaiting Court', 'annual'],
    ['Approved Filing', 'planSimplified'],
    ['Standard Draft', 'planAnnual'],
  ]) {
    await page.evaluate(([wardName, inventoryType]) => (window as any).addWard(wardName, inventoryType), [name, type]);
  }

  await page.evaluate(() => {
    const wards = (window as any).getGuardianData().wards;
    const dateString = (date: Date) => [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-');
    const dueSoonPeriodEnd = new Date();
    dueSoonPeriodEnd.setDate(dueSoonPeriodEnd.getDate() - 82);
    wards[0].dashboardWorkflow = { status: 'disapproved-needs-correction', assigneeName: 'Morgan Lee' };
    wards[1].periodTo = dateString(dueSoonPeriodEnd);
    wards[1].dashboardWorkflow = { status: 'draft', assigneeName: 'Morgan Lee' };
    wards[2].periodTo = dateString(dueSoonPeriodEnd);
    wards[2].dashboardWorkflow = { status: 'pending-court-review', assigneeName: 'Jordan Patel' };
    wards[3].periodTo = dateString(dueSoonPeriodEnd);
    wards[3].dashboardWorkflow = { status: 'approved', assigneeName: 'Jordan Patel' };
    wards[4].dashboardWorkflow = { status: 'draft' };
    (window as any).navigate('/dashboard');
  });

  const main = page.locator('#main-content');
  await main.locator('[data-dashboard-bound="true"]').waitFor();
  await page.locator('#dashboard-role').selectOption('professional');
  await page.locator('[data-shell-action="hide-auto-export-reminder"]').click();

  for (const theme of ['light', 'dark']) {
    await page.evaluate((nextTheme) => { document.documentElement.dataset.theme = nextTheme; }, theme);
    for (const viewport of VIEWPORTS) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.waitForFunction((isNarrow) => {
        const sidebar = document.querySelector('.sidebar');
        if (!sidebar) return false;
        const rect = sidebar.getBoundingClientRect();
        return isNarrow ? rect.right <= 1 : rect.left >= -1;
      }, viewport.width <= 900);
      await expect(page.locator('#sidebar-backdrop')).toBeHidden();
      if (await page.locator('#walkthrough-overlay.active').count()) {
        await page.locator('[data-shell-action="skip-walkthrough"]').click();
      }
      await expect(page.locator('#walkthrough-overlay')).not.toHaveClass(/active/);
      const coveringLayers = await page.evaluate(() => [...document.body.querySelectorAll('*')].filter((element) => {
        const style = getComputedStyle(element);
        if (!['fixed', 'absolute'].includes(style.position) || style.display === 'none' || style.visibility === 'hidden') return false;
        const rect = element.getBoundingClientRect();
        return rect.width >= innerWidth * .9 && rect.height >= innerHeight * .9 && Number(style.opacity || 1) > 0;
      }).map(element => ({ id: element.id, className: element.className, position: getComputedStyle(element).position })));
      expect(coveringLayers, `${theme} ${viewport.name} covering layers`).toEqual([]);
      const overflow = await main.evaluate((root) => {
        const rootRect = root.getBoundingClientRect();
        const selectors = '.dashboard-page-header,.dashboard-toolbar,.dashboard-summary-strip,.dashboard-triage-row,.dashboard-control,.dashboard-priority-badge';
        const escaped = [...root.querySelectorAll(selectors)].filter((element) => {
          const rect = element.getBoundingClientRect();
          return rect.left < rootRect.left - 1 || rect.right > rootRect.right + 1;
        }).map(element => element.className);
        return {
          page: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
          escaped,
        };
      });
      expect(overflow, `${theme} ${viewport.name} dashboard overflow`).toEqual({ page: false, escaped: [] });
      await page.screenshot({
        path: testInfo.outputPath(`milestone-15-${theme}-${viewport.name}-${viewport.width}x${viewport.height}.png`),
        fullPage: false,
      });
    }
  }

  await page.evaluate(() => { document.documentElement.dataset.theme = 'light'; });
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.locator('#dashboard-role').selectOption('assistant');
  await expect(main.locator('.dashboard-page-header #dashboard-assignment-filter')).toHaveCount(1);
  await expect(main.locator('.dashboard-supervisor-control')).toContainText('Working on behalf of');
  await page.screenshot({ path: testInfo.outputPath('milestone-15-assistant-light-1366x768.png'), fullPage: false });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForFunction(() => document.querySelector('.sidebar')?.getBoundingClientRect().right <= 1);
  await page.screenshot({ path: testInfo.outputPath('milestone-15-assistant-light-390x844.png'), fullPage: false });
  await main.locator('.dashboard-triage-row').first().scrollIntoViewIfNeeded();
  await page.screenshot({ path: testInfo.outputPath('milestone-15-mobile-row-light-390x844.png'), fullPage: false });
});