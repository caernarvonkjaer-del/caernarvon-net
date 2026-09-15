import { test, expect, type Page, type BrowserContext } from '@playwright/test';
import { freshStartNoPassword, createWard, createSimplifiedWard } from './support/target';

// The dedicated help/index.html page is wired in as a permanent
// part of the app -- opened via window.open(), a same-origin top-level
// navigation the CSP's script-src/object-src restrictions don't touch (same
// reasoning as the print-preview PDF blob navigation elsewhere in the app).
//
// Two distinct behaviors, per an explicit product decision: on the dashboard
// (no filing open), "?" still opens the in-app Help panel -- guided tour,
// activity log, and shared records live only there and aren't needed
// mid-filing -- and the panel's "View User Guide" button opens the manual
// unanchored. Inside a filing, "?" skips the panel entirely and opens the
// manual straight to the anchor matching the current page, per
// legacy-app.js's USER_GUIDE_ANCHORS map.

async function clickAndCaptureGuideTab(page: Page, context: BrowserContext, selector: string) {
  // The "Save Your First Backup" / "Unsaved Changes" reminder (same
  // #auto-export-reminder element used on the dashboard) can pop up on its
  // own timer mid-filing too, and overlaps the topnav -- dismiss it if
  // present right before every click, not just once up front.
  const reminder = page.locator('[data-shell-action="hide-auto-export-reminder"]');
  if (await reminder.isVisible().catch(() => false)) await reminder.click();

  const [guideTab] = await Promise.all([
    context.waitForEvent('page'),
    page.click(selector),
  ]);
  await guideTab.waitForLoadState();
  const url = guideTab.url();
  await guideTab.close();
  return url;
}

test.describe('user guide wiring', () => {
  test('dashboard: "?" opens the Help panel; View User Guide opens the manual unanchored', async ({ page, context }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Dashboard Guide Ward', 'guardian');
    await page.evaluate(() => (window as any).navigate('/dashboard'));
    await page.waitForURL(/#\/dashboard/);
    const reminder = page.locator('[data-shell-action="hide-auto-export-reminder"]');
    if (await reminder.count()) await reminder.click();

    await page.locator('#help-toggle-btn').waitFor({ state: 'visible' });
    await page.click('#help-toggle-btn');
    await expect(page.locator('#help-panel')).toBeVisible();
    await expect(page.locator('[data-shell-action="export-help"]')).toHaveText('View User Guide');

    const url = await clickAndCaptureGuideTab(page, context, '[data-shell-action="export-help"]');
    expect(url).toMatch(/help\/$/);
  });

  const GUARDIAN_CASES: Array<[string, string]> = [
    ['/', 'inventory-cover'],
    ['/summary', 'inventory-summary'],
    ['/a1', 'inventory-a'],
    ['/a2', 'inventory-a'],
    ['/b2', 'inventory-b'],
    ['/c4', 'inventory-c'],
    ['/d5', 'inventory-d'],
    // No '/print' case: Print Preview renders its own toolbar (Save as PDF /
    // Save as Excel / Print / E-Filing Portal) instead of the standard
    // topnav-actions bar, so there is no "?" button on that page at all --
    // 'preview' stays in USER_GUIDE_ANCHORS as harmless, forward-compatible
    // data, but nothing currently triggers it.
  ];
  test('Guardian Inventory: "?" jumps to the matching schedule-group anchor per page, skipping the panel', async ({ page, context }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Inventory Guide Ward', 'guardian');
    for (const [route, anchor] of GUARDIAN_CASES) {
      await page.evaluate((r) => (window as any).navigate(r), route);
      await page.waitForURL(new RegExp(`#${route.replace('/', '\\/')}$`));
      const url = await clickAndCaptureGuideTab(page, context, '#help-toggle-btn');
      expect(url, `route ${route}`).toContain(`help/#${anchor}`);
      await expect(page.locator('#help-panel'), `route ${route} panel`).not.toBeVisible();
    }
  });

  const SIMPLIFIED_CASES: Array<[string, string]> = [
    ['/', 'simplified-accounting-p1'],
    ['/p2', 'simplified-accounting-p2'],
    ['/p5', 'simplified-accounting-p3-7'],
  ];
  test('Simplified Accounting: "?" jumps to the matching Part anchor', async ({ page, context }) => {
    await freshStartNoPassword(page);
    await createSimplifiedWard(page, 'Simplified Guide Ward');
    for (const [route, anchor] of SIMPLIFIED_CASES) {
      await page.evaluate((r) => (window as any).navigate(r), route);
      await page.waitForURL(new RegExp(`#${route.replace('/', '\\/')}$`));
      const url = await clickAndCaptureGuideTab(page, context, '#help-toggle-btn');
      expect(url, `route ${route}`).toContain(`help/#${anchor}`);
    }
  });

  const ANNUAL_CASES: Array<[string, string]> = [
    ['/', 'annual-accounting-p1'],
    ['/summary', 'annual-accounting-p67'],
    ['/schb3', 'annual-accounting-schedules'],
    ['/p9', 'annual-accounting-p8-11'],
  ];
  test('Annual Accounting: "?" jumps to the matching Part/schedule anchor', async ({ page, context }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Annual Guide Ward', 'annual');
    for (const [route, anchor] of ANNUAL_CASES) {
      await page.evaluate((r) => (window as any).navigate(r), route);
      await page.waitForURL(new RegExp(`#${route.replace('/', '\\/')}$`));
      const url = await clickAndCaptureGuideTab(page, context, '#help-toggle-btn');
      expect(url, `route ${route}`).toContain(`help/#${anchor}`);
    }
  });

  test('trustAccounting and finalAccounting alias to the same Annual Accounting anchors', async ({ page, context }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Trust Guide Ward', 'trustAccounting');
    await page.evaluate(() => (window as any).navigate('/schd2'));
    await page.waitForURL(/#\/schd2$/);
    let url = await clickAndCaptureGuideTab(page, context, '#help-toggle-btn');
    expect(url).toContain('help/#annual-accounting-schedules');

    await createWard(page, 'Final Guide Ward', 'finalAccounting');
    await page.evaluate(() => (window as any).navigate('/p2'));
    await page.waitForURL(/#\/p2$/);
    url = await clickAndCaptureGuideTab(page, context, '#help-toggle-btn');
    expect(url).toContain('help/#annual-accounting-p2');
  });

  const PLAN_CASES: Array<[string, string, string]> = [
    ['planSimplified', '/p2', 'simplified-plan'],
    ['planAnnual', '/p5', 'annual-plan'],
    ['planInitial', '/p3', 'initial-plan'],
    ['planMinor', '/p4', 'minor-plan'],
  ];
  test('the four Plan types: every page maps to the one whole-filing anchor (no h3 breakdown exists yet)', async ({ page, context }) => {
    await freshStartNoPassword(page);
    for (const [type, route, anchor] of PLAN_CASES) {
      await createWard(page, `${type} Guide Ward`, type);
      await page.evaluate((r) => (window as any).navigate(r), route);
      await page.waitForURL(new RegExp(`#${route.replace('/', '\\/')}$`));
      const url = await clickAndCaptureGuideTab(page, context, '#help-toggle-btn');
      expect(url, `${type} ${route}`).toContain(`help/#${anchor}`);
    }
  });
});
