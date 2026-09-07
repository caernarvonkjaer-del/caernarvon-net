import { test, expect } from '@playwright/test';
import { freshStartNoPassword, createWard, crossCheckNavAndSummaryStatus } from './support/target';

// Two Annual Accounting behaviours that Guardian Inventory already had and
// Annual didn't, closed as one consistency pass:
//
//  1. "I verify there are no X to report for this schedule." now counts as
//     completing that schedule, so a filer with nothing to report can finish
//     the form. Before this, checking the box stored the flag and changed the
//     printed schedule, but computeNavChecks() still required at least one
//     fully-filled row, leaving the schedule permanently marked incomplete.
//
//  2. Schedule totals recompute as the filer types. Only Schedule A did this,
//     via a hardcoded getElementById('schA_total') hook; every other schedule
//     showed a stale figure until the page happened to re-render.

// Every schedule that offers the verify-none checkbox, with the nav key it
// must flip. `schedule` is the data-schedule value on the checkbox itself.
const VERIFY_NONE_SCHEDULES = [
  { route: '/scha', schedule: 'scha', key: 'a-scha' },
  { route: '/schb1', schedule: 'schb1', key: 'a-schb1' },
  { route: '/schb2', schedule: 'schb2', key: 'a-schb2' },
  { route: '/schb3', schedule: 'schb3', key: 'a-schb3' },
  { route: '/schb4', schedule: 'schb4', key: 'a-schb4' },
  { route: '/schc', schedule: 'schc', key: 'a-schc' },
  { route: '/schd1', schedule: 'schd1', key: 'a-schd1' },
  { route: '/schd2', schedule: 'schd2', key: 'a-schd2' },
  { route: '/schd3', schedule: 'schd3', key: 'a-schd3' },
  { route: '/schd4', schedule: 'schd4', key: 'a-schd4' },
  { route: '/schd5', schedule: 'schd5', key: 'a-schd5' },
  { route: '/sche', schedule: 'sche', key: 'a-sche' },
  { route: '/schf1', schedule: 'schf1', key: 'a-schf1' },
  { route: '/schf2', schedule: 'schf2', key: 'a-schf2' },
];

test.describe('annual accounting schedule consistency', () => {
  test('verifying a schedule has nothing to report completes it on every surface', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Verify None Ward', 'annual');

    for (const { route, schedule, key } of VERIFY_NONE_SCHEDULES) {
      await page.evaluate((r) => (window as any).navigate(r), route);

      const before = await page.evaluate((k) => !!(window as any).computeNavChecks().checks[k], key);
      expect(before, `${route} should start incomplete on a blank filing`).toBe(false);

      const box = page.locator(`input[data-annual-change="schedule-no-items"][data-schedule="${schedule}"]`);
      await expect(box, `${route} should offer a verify-none checkbox`).toBeVisible();
      await box.check();

      const after = await page.evaluate((k) => !!(window as any).computeNavChecks().checks[k], key);
      expect(after, `${route} should be complete once the filer verifies there is nothing to report`).toBe(true);

      // The sidebar reads the same result, and the change handler refreshes it
      // on click -- so the filer sees the check without navigating away first.
      await expect(page.locator(`[data-nav="${key}"] .nav-check`)).toHaveClass(/complete/);

      // ...and unchecking it must put the schedule back, not latch it complete.
      await box.uncheck();
      const undone = await page.evaluate((k) => !!(window as any).computeNavChecks().checks[k], key);
      expect(undone, `${route} should return to incomplete when the filer unchecks the box`).toBe(false);
      await box.check();
    }

    // With every schedule verified empty, the Summary page's schedule badges
    // agree with the sidebar and with computeNavChecks() itself.
    await page.evaluate(() => (window as any).navigate('/summary'));
    const rows = await crossCheckNavAndSummaryStatus(page, [
      { route: '/scha', key: 'a-scha' },
      { route: '/schb1', key: 'a-schb1' },
      { route: '/schc', key: 'a-schc' },
      { route: '/sche', key: 'a-sche' },
      { route: '/schd1', key: ['a-schd1', 'a-schd2', 'a-schd3', 'a-schd4', 'a-schd5'] },
      { route: '/schf1', key: ['a-schf1', 'a-schf2'] },
    ]);

    for (const row of rows) {
      expect(row.expectComplete, `${row.route} should be complete after verifying none`).toBe(true);
      if (row.sidebarComplete !== null) {
        expect(row.sidebarComplete, `${row.route} sidebar disagrees with computeNavChecks()`).toBe(true);
      }
      expect(row.summaryComplete, `${row.route} Summary badge disagrees with computeNavChecks()`).toBe(true);
    }
  });

  test('schedule totals update as the filer types, on schedules other than A', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Live Totals Ward', 'annual');

    // Schedule B-1 (attorney fees) -- the first schedule that had no refresh
    // hook of its own at all before this pass.
    await page.evaluate(() => (window as any).navigate('/schb1'));
    const total = page.locator('[data-annual-total="schB1"]');
    await expect(total).toHaveText('0.00');

    // Schedules start with no rows at all, so add one before typing in it.
    await page.locator('[data-annual-action="add-row"][data-collection="schB1"]').click();
    const amount = page.locator('input[data-annual-path^="schB1."][data-annual-path$=".amount"]').first();
    await amount.fill('1250.50');
    await expect(total, 'Schedule B-1 total should follow the row being typed in').toHaveText('1,250.50');

    await amount.fill('2000');
    await expect(total).toHaveText('2,000.00');

    // Schedule A still works -- it used to be the only one that did, via a
    // one-off hook this pass replaced with the shared mechanism.
    await page.evaluate(() => (window as any).navigate('/scha'));
    const schATotal = page.locator('[data-annual-total="schA"]');
    await expect(schATotal).toHaveText('0.00');
    await page.locator('[data-annual-action="add-row"][data-collection="schA"]').click();
    await page.locator('input[data-annual-path^="schA."][data-annual-path$=".amount"]').first().fill('750');
    await expect(schATotal).toHaveText('750.00');
  });
});
