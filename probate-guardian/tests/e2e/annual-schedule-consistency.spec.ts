import { test, expect } from '@playwright/test';
import { freshStartNoPassword, createWard, crossCheckNavAndSummaryStatus, fillMinimalValidAnnualWard } from './support/target';
import { dismissScheduleDocPrompt } from './support/target';

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
      await page.evaluate((r) => (window as any).GuardianForms.testing.navigate(r), route);

      const before = await page.evaluate((k) => !!(window as any).GuardianForms.testing.status.navChecks().checks[k], key);
      expect(before, `${route} should start incomplete on a blank filing`).toBe(false);

      const box = page.locator(`input[data-annual-change="schedule-no-items"][data-schedule="${schedule}"]`);
      await expect(box, `${route} should offer a verify-none checkbox`).toBeVisible();
      await box.check();

      const after = await page.evaluate((k) => !!(window as any).GuardianForms.testing.status.navChecks().checks[k], key);
      expect(after, `${route} should be complete once the filer verifies there is nothing to report`).toBe(true);

      // The sidebar reads the same result, and the change handler refreshes it
      // on click -- so the filer sees the check without navigating away first.
      await expect(page.locator(`[data-nav="${key}"] .nav-check`)).toHaveClass(/\bcomplete\b/);

      // ...and unchecking it must put the schedule back, not latch it complete.
      await box.uncheck();
      const undone = await page.evaluate((k) => !!(window as any).GuardianForms.testing.status.navChecks().checks[k], key);
      expect(undone, `${route} should return to incomplete when the filer unchecks the box`).toBe(false);
      await box.check();
    }

    // With every schedule verified empty, the Summary page's schedule badges
    // agree with the sidebar and with computeNavChecks() itself.
    await page.evaluate(() => (window as any).GuardianForms.testing.navigate('/summary'));
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

  // AGENTS.md section 4, pinned for Milestone 70's 70D gate. On these fourteen
  // schedules the sidebar is deliberately stricter than the export gate: it
  // wants a complete row or the "no items to report" box before it marks a
  // schedule done -- a declaration the Clerk's own Annual workbook never
  // collects, and blank schedules are accepted in Pinellas. Export must never
  // demand it. Part XI is the one schedule both demand, because section
  // 744.367(3)(a) says the report must include a remuneration declaration.
  test('a blank schedule reads unfinished in the sidebar but never blocks export; Part XI blocks both', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Blank Schedules Ward', 'annual');
    await fillMinimalValidAnnualWard(page);
    // Every schedule blank and none declared empty; Part XI declared.
    await page.evaluate(() => (window as any).GuardianForms.testing.patchFiling({
      schA: [], schB1: [], schB2: [], schB3: [], schB4: [], schC: [], schD1: [], schD2: [], schD3: [], schD4: [], schD5: [],
      schE: [], schF1: [], schF2: [], scheduleNoItems: { remuneration: true },
    }));
    const gate = await page.evaluate(() => (window as any).GuardianForms.testing.validate.exportGate());
    expect(gate.canExport, `export must not demand a blank schedule: ${JSON.stringify(gate.messages)}`).toBe(true);
    const nav = await page.evaluate(() => (window as any).GuardianForms.testing.status.navChecks());
    for (const { key } of VERIFY_NONE_SCHEDULES) {
      expect(nav.checks[key], `${key}: the sidebar still asks about a blank schedule`).toBe(false);
    }
    expect(nav.checks['a-p11'], 'Part XI is declared').toBe(true);

    // Part XI unanswered: the sidebar and the export gate both stop.
    await page.evaluate(() => (window as any).GuardianForms.testing.patchFiling({ scheduleNoItems: {} }));
    const blocked = await page.evaluate(() => (window as any).GuardianForms.testing.validate.exportGate());
    expect(blocked.canExport, 'an unanswered Part XI blocks export').toBe(false);
    expect(JSON.stringify(blocked.messages)).toMatch(/Part XI/);
    const after = await page.evaluate(() => (window as any).GuardianForms.testing.status.navChecks());
    expect(after.checks['a-p11'], 'an unanswered Part XI is unfinished in the sidebar').toBe(false);
  });

  // Milestone 43D drove Part VIII's own completion rule through the real UI:
  // the "I certify there are no trusts" box, or a named trust row. Milestone
  // 73F part 2 (decision 73F-5) made Part VIII's mark the export checks' rule
  // instead: question #1 decides it. "No" completes Part VIII; "Yes" needs a
  // trust described and its "created after the GID?" answered. The box alone
  // no longer completes it -- the question is still unanswered, and Print
  // Preview asks it -- and the box itself goes in 73F part 3.
  test('Part VIII (Trusts) completes when its question is answered, as Print Preview reads it', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Part VIII Trusts Ward', 'annual');
    await page.evaluate(() => (window as any).GuardianForms.testing.navigate('/p8'));
    const done = () => page.evaluate(() => !!(window as any).GuardianForms.testing.status.navChecks().checks['a-p8']);
    const answer = (path: string, value: string) => page.locator(`#main-content input[type="radio"][data-form-path="${path}"][value="${value}"]`);

    expect(await done(), '/p8 should start incomplete on a blank filing').toBe(false);

    const box = page.locator('input[data-annual-change="schedule-no-items"][data-schedule="a-p8"]');
    await expect(box).toBeVisible();
    await box.check();
    expect(await done(), 'the box alone leaves the question unanswered').toBe(false);
    await expect(page.locator('#main-content #page-local-guidance')).toContainText('Does the Ward have one or more Trusts?');
    await box.uncheck();

    await answer('trusts.0.hasTrust', 'No').check();
    expect(await done(), '"No" completes Part VIII').toBe(true);
    await expect(page.locator('[data-nav="a-p8"] .nav-check')).toHaveClass(/\bcomplete\b/);

    await answer('trusts.0.hasTrust', 'Yes').check();
    expect(await done(), '"Yes" naming no trust is incomplete').toBe(false);
    await page.evaluate(() => {
      const t = (window as any).GuardianForms.testing;
      t.setField('trusts.0.name', 'Family Trust');
      t.setField('trusts.0.trustee', 'Jane Doe');
    });
    expect(await done(), 'a described trust still needs "created after the GID?"').toBe(false);
    await answer('trusts.0.createdAfterGID', 'No').check();
    expect(await done(), '"Yes" with a described trust, its question answered, completes Part VIII').toBe(true);
  });

  test('schedule totals update as the filer types, on schedules other than A', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Live Totals Ward', 'annual');

    // Schedule B-1 (attorney fees) -- the first schedule that had no refresh
    // hook of its own at all before this pass.
    await page.evaluate(() => (window as any).GuardianForms.testing.navigate('/schb1'));
    const total = page.locator('[data-annual-total="schB1"]');
    await expect(total).toHaveText('0.00');

    // Schedules start with no rows at all, so add one before typing in it.
    await page.locator('[data-annual-action="add-row"][data-collection="schB1"]').click();
    await dismissScheduleDocPrompt(page); // Milestone 57C-R advisory modal
    const amount = page.locator('input[data-annual-path^="schB1."][data-annual-path$=".amount"]').first();
    await amount.fill('1250.50');
    await expect(total, 'Schedule B-1 total should follow the row being typed in').toHaveText('1,250.50');

    await amount.fill('2000');
    await expect(total).toHaveText('2,000.00');

    // Schedule A still works -- it used to be the only one that did, via a
    // one-off hook this pass replaced with the shared mechanism.
    await page.evaluate(() => (window as any).GuardianForms.testing.navigate('/scha'));
    const schATotal = page.locator('[data-annual-total="schA"]');
    await expect(schATotal).toHaveText('0.00');
    await page.locator('[data-annual-action="add-row"][data-collection="schA"]').click();
    await dismissScheduleDocPrompt(page); // Milestone 57C-R advisory modal
    await page.locator('input[data-annual-path^="schA."][data-annual-path$=".amount"]').first().fill('750');
    await expect(schATotal).toHaveText('750.00');
  });
});
