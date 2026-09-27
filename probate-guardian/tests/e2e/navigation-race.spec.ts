import { expect, test, type Page } from '@playwright/test';
import { freshStartNoPassword } from './support/target';
import { currentTarget, skipEnvironmentLimitation } from './support/target-profile';

// Milestone 70, 70K gate: "rapid navigation cannot commit stale work". One
// navigation owns the page at a time (src/core/navigation/router.js): a newer
// one aborts the older, whose feature -- still downloading, or still drawing --
// then commits nothing. And a navigation draws its page once: navigate() used
// to draw it and then again when the hash change it caused came back.
//
// Milestone 70's 70G recorded the race this closes, in the mount rounds it
// then had to slow down: a filing's slow first mount drawn over the dashboard
// the filer had already gone back to.

// The number of times the page has been drawn from now on: each draw replaces
// #main-content's children in one step.
async function countDraws(page: Page): Promise<() => Promise<number>> {
  await page.evaluate(() => {
    const main = document.getElementById('main-content')!;
    main.dataset.draws = '0';
    new MutationObserver((records) => {
      const drawn = records.filter((r) => r.target === main && r.addedNodes.length > 0).length;
      if (drawn) main.dataset.draws = String(Number(main.dataset.draws) + drawn);
    }).observe(main, { childList: true });
  });
  return async () => Number(await page.locator('#main-content').getAttribute('data-draws'));
}

// Long enough for a hash change the router caused to come back and be acted on.
const SETTLE_MS = 400;

test.describe('one navigation owns the page', () => {
  test('a navigation draws its page once, and the Back button still draws the page it goes back to', async ({ page }) => {
    await freshStartNoPassword(page);
    await page.evaluate(() => (window as any).GuardianForms.testing.createFiling.add('Draw Once', 'annual'));
    const draws = await countDraws(page);

    await page.evaluate(() => (window as any).GuardianForms.testing.navigate('/p2'));
    await page.waitForTimeout(SETTLE_MS);
    await expect(page.locator('#main-content h1').first()).toContainText('Part II');
    expect(await draws(), 'drawn by navigate(), and not again by the hash change it set').toBe(1);

    await page.goBack();
    await expect(page.locator('#main-content h1').first()).toContainText('Cover & Part I');
    await page.waitForTimeout(SETTLE_MS);
    expect(await draws(), "the Back button is the filer's own navigation: drawn once").toBe(2);
  });

  test('two navigations in a row: only the second is drawn', async ({ page }) => {
    await freshStartNoPassword(page);
    await page.evaluate(() => (window as any).GuardianForms.testing.createFiling.add('Two In A Row', 'annual'));
    const draws = await countDraws(page);

    await page.evaluate(async () => {
      const t = (window as any).GuardianForms.testing;
      const first = t.navigate('/p2');
      const second = t.navigate('/p3');
      await Promise.all([first, second]);
    });
    await page.waitForTimeout(SETTLE_MS);
    await expect(page.locator('#main-content h1').first()).toContainText('Part III');
    expect(await page.evaluate(() => (window as any).GuardianForms.testing.snapshot().currentPage)).toBe('/p3');
    expect(await draws(), 'the first was superseded before it drew').toBe(1);
  });

  test("a filing's slow first page is not drawn over the dashboard the filer went back to", async ({ page }) => {
    skipEnvironmentLimitation(currentTarget !== 'source', 'The source target exposes a stable unbundled chunk URL to hold back');

    await freshStartNoPassword(page);
    await page.evaluate(() => (window as any).GuardianForms.testing.createFiling.add('Already Here', 'annual'));
    await page.evaluate(() => (window as any).GuardianForms.testing.navigate('/dashboard'));
    await expect(page.locator('#main-content [data-dashboard-root]')).toBeVisible();

    // The Plan's code is held back: its first page waits for it.
    const CHUNK = '**/src/features/plan-minor/index.js';
    let requested!: () => void;
    const planRequested = new Promise<void>((resolve) => { requested = resolve; });
    let release!: () => void;
    const released = new Promise<void>((resolve) => { release = resolve; });
    await page.route(CHUNK, async (route) => {
      requested();
      await released;
      await route.continue();
    });

    // A new Plan opens -- and, while its page waits for its code, the filer
    // goes back to All Filings.
    await page.evaluate(() => { void (window as any).GuardianForms.testing.createFiling.add('Slow Plan', 'planMinor'); });
    await planRequested;
    expect(await page.evaluate(() => (window as any).GuardianForms.testing.navigate('/dashboard'))).toBe(true);
    await expect(page.locator('#main-content [data-dashboard-root]')).toBeVisible();

    const planLoaded = page.waitForResponse(CHUNK);
    release();
    await planLoaded;
    await page.waitForTimeout(SETTLE_MS);

    await expect(page.locator('#main-content [data-dashboard-root]')).toBeVisible();
    await expect(page.locator('#main-content')).not.toContainText('Annual Plan — Minors — Cover');
    expect(await page.evaluate(() => {
      const snap = (window as any).GuardianForms.testing.snapshot();
      return { page: snap.currentPage, open: snap.activeFilingId };
    })).toEqual({ page: '/dashboard', open: null });
  });
});
