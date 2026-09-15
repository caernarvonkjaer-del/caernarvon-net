import { expect, test, type Page } from '@playwright/test';
import { freshStartNoPassword } from './support/target';

// Milestone 43G: split from one test running all 6 viewports x 2 themes (12
// combinations) in a single run, where one early failure masked every other
// combination's result. Each combination is now its own test, at the cost
// of repeating the (cheap) ward-setup fixture per combination rather than
// once for all twelve.

const VIEWPORTS = [
  { name: 'desktop', width: 1920, height: 1080 },
  { name: 'laptop', width: 1366, height: 768 },
  { name: 'triage-dead-zone-wide', width: 1280, height: 800 },
  { name: 'triage-dead-zone-narrow', width: 1150, height: 800 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'mobile', width: 390, height: 844 },
];

async function setUpDashboard(page: Page) {
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
    const wards = (window as any).getCaseFile().wards;
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
  await page.locator('[data-shell-action="hide-auto-export-reminder"]').click();
  return main;
}

for (const theme of ['light', 'dark'] as const) {
  for (const viewport of VIEWPORTS) {
    test(`dashboard remains coherent at ${theme} ${viewport.name} (${viewport.width}x${viewport.height})`, async ({ page }, testInfo) => {
      const main = await setUpDashboard(page);

      await page.evaluate((nextTheme) => { document.documentElement.dataset.theme = nextTheme; }, theme);
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
      await expect(main.locator('.dashboard-triage-assignee').first(), `${theme} ${viewport.name} judge is visible`).toBeVisible();
      await expect(main.locator('.dashboard-triage-actions').first(), `${theme} ${viewport.name} actions are visible`).toBeVisible();
      const queueOverflow = await main.locator('.dashboard-triage-queue').evaluate((queue) => queue.scrollWidth <= queue.clientWidth + 1);
      expect(queueOverflow, `${theme} ${viewport.name} triage queue does not scroll horizontally`).toBe(true);
      await expect(main.locator('.dashboard-triage-header')).toContainText('Judge');
      await expect(main.locator('.dashboard-triage-header')).not.toContainText('Assignment');
      await page.screenshot({
        path: testInfo.outputPath(`milestone-15-${theme}-${viewport.name}-${viewport.width}x${viewport.height}.png`),
        fullPage: false,
      });
    });
  }
}

test('dashboard hides the retired assignment filter and keeps search, at a stable desktop size', async ({ page }, testInfo) => {
  const main = await setUpDashboard(page);
  await page.evaluate(() => { document.documentElement.dataset.theme = 'light'; });
  await page.setViewportSize({ width: 1366, height: 768 });
  await expect(main.locator('#dashboard-assignment-filter')).toHaveCount(0);
  await expect(main.locator('#dashboard-search')).toHaveCount(1);
  await page.screenshot({ path: testInfo.outputPath('milestone-15-light-1366x768.png'), fullPage: false });
});

test('mobile viewport collapses the sidebar and renders a scrollable triage row', async ({ page }, testInfo) => {
  const main = await setUpDashboard(page);
  await page.evaluate(() => { document.documentElement.dataset.theme = 'light'; });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForFunction(() => document.querySelector('.sidebar')?.getBoundingClientRect().right <= 1);
  await page.screenshot({ path: testInfo.outputPath('milestone-15-mobile-light-390x844.png'), fullPage: false });
  await main.locator('.dashboard-triage-row').first().scrollIntoViewIfNeeded();
  await page.screenshot({ path: testInfo.outputPath('milestone-15-mobile-row-light-390x844.png'), fullPage: false });
});

test('dashboard action buttons share identical horizontal positions on rows with and without prior years', async ({ page }) => {
  await freshStartNoPassword(page);

  await page.evaluate((type) => (window as any).addWard('Ward With Prior Years', type), 'annual');
  await page.evaluate((type) => (window as any).addWard('Ward Without Prior Years', type), 'annual');

  await page.evaluate(() => {
    const caseFile = (window as any).getCaseFile();
    const ward1 = caseFile.wards.find((w: any) => w.wardName === 'Ward With Prior Years');
    ward1.years = [{ key: '2023', label: '2023 Accounting', archivedAt: new Date().toISOString(), data: {} }];
    (window as any).navigate('/dashboard');
  });

  const main = page.locator('#main-content');
  await main.locator('[data-dashboard-bound="true"]').waitFor();
  await page.setViewportSize({ width: 1440, height: 900 });

  const rows = main.locator('.dashboard-triage-row');
  await expect(rows).toHaveCount(2);

  // Assert one row has the "Prior years" button and one has the placeholder
  await expect(rows.nth(0).locator('[data-dashboard-action="prior-years"]')).toHaveCount(1);
  await expect(rows.nth(1).locator('.dashboard-action-empty')).toHaveCount(1);

  const positions = await rows.evaluateAll((rowElements) => {
    return rowElements.map((row) => {
      const actions = row.querySelector('.dashboard-triage-actions');
      if (!actions) return null;
      const getLeft = (sel: string) => {
        const el = actions.querySelector(sel);
        return el ? Math.round(el.getBoundingClientRect().left) : null;
      };
      return {
        open: getLeft('[data-dashboard-action="open-ward"]'),
        backup: getLeft('[data-dashboard-action="backup"]'),
        pdf: getLeft('[data-dashboard-action="pdf"]'),
        newYear: getLeft('[data-dashboard-action="new-year"]'),
        priorYearsOrEmpty: getLeft('[data-dashboard-action="prior-years"]') ?? getLeft('.dashboard-action-empty'),
        archive: getLeft('[data-dashboard-action="archive"]'),
        delete: getLeft('[data-dashboard-action="delete"]'),
      };
    });
  });

  expect(positions[0]).not.toBeNull();
  expect(positions[1]).not.toBeNull();

  // Columns preceding prior-years share identical left positions
  expect(positions[0]!.open).toBe(positions[1]!.open);
  expect(positions[0]!.backup).toBe(positions[1]!.backup);
  expect(positions[0]!.pdf).toBe(positions[1]!.pdf);
  expect(positions[0]!.newYear).toBe(positions[1]!.newYear);
  // Prior years button and empty placeholder share identical left positions
  expect(positions[0]!.priorYearsOrEmpty).toBe(positions[1]!.priorYearsOrEmpty);
  // Columns following prior-years share identical left positions
  expect(positions[0]!.archive).toBe(positions[1]!.archive);
  expect(positions[0]!.delete).toBe(positions[1]!.delete);
});

test('dashboard column sorting toggles only between ascending and descending', async ({ page }) => {
  await freshStartNoPassword(page);
  await page.evaluate((type) => (window as any).addWard('Zulu Filing', type), 'annual');
  await page.evaluate((type) => (window as any).addWard('Alpha Filing', type), 'guardian');
  await page.evaluate(() => (window as any).navigate('/dashboard'));
  await page.locator('#main-content [data-dashboard-bound="true"]').waitFor();
  await page.setViewportSize({ width: 1440, height: 900 });

  const wardSort = page.locator('[data-dashboard-sort="name"]');
  await wardSort.click();
  await expect(wardSort).toHaveAttribute('aria-sort', 'ascending');
  await wardSort.click();
  await expect(wardSort).toHaveAttribute('aria-sort', 'descending');
  await wardSort.click();
  await expect(wardSort).toHaveAttribute('aria-sort', 'ascending');
});
