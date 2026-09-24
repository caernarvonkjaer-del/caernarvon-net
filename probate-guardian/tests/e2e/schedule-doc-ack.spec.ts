import { test, expect, type Page } from '@playwright/test';
import {
  freshStartNoPassword,
  createWard,
  acceptDynDialog,
  dismissDynDialog,
  escapeDynDialog,
} from './support/target';

// Milestone 57C-R: the supplemental-documentation acknowledgement, in a real
// browser. The unit spec (schedule-doc-ack.spec.js) covers the state model;
// this covers what only a browser can answer -- that the modal actually
// appears on navigation, at the right moments and no others.
//
// TIMING, established by running it rather than by reading it: addEntry() ends
// with renderPage(getCurrentPage()), so adding a row re-runs mount() and the
// prompt fires IMMEDIATELY. The filer is asked the moment the schedule becomes
// populated, which is both better than waiting for a later visit and closer to
// how the behavior was specified. An earlier draft of this spec assumed the
// prompt waited for a re-entry and failed on every case.
//
// Read src/core/filing/schedule-doc-ack.js's header for why this feature
// deliberately gates nothing. The last test here is the one that would have
// caught Milestone 57's first attempt on day one.

const DYN_DIALOG = '.modal-overlay[id^="dyn-dialog-"].show .modal-box';

async function goto(page: Page, route: string) {
  await page.evaluate((r) => (window as any).navigate(r), route);
  await page.waitForURL(new RegExp(`#${route.replace('/', '\\/')}$`));
}

async function addGuardianRow(page: Page, schedule: string) {
  await page.locator(`[data-inventory-action="add-entry"][data-schedule="${schedule}"]`).click();
}

/**
 * Types into the first A-1 row, so it carries the filer's work. An untouched
 * +Add row is removed when the filer leaves the page (blank-card clean-up,
 * src/core/form/prune-cards.js); these cases were written on 2026-09-17,
 * while that clean-up was not running, and assumed an untouched row
 * survived a round trip. What they test is the question, not the clean-up.
 */
async function giveA1RowContent(page: Page) {
  const description = page.locator('#main-content [data-bind="scheduleA1.0.propertyDescription"]');
  await description.fill('Family home');
  await description.blur();
}

/** No dialog should appear; allow the mount hook time to have fired if it were going to. */
async function expectNoDialog(page: Page, why: string) {
  await page.waitForTimeout(400);
  expect(await page.locator(DYN_DIALOG).isVisible().catch(() => false), why).toBe(false);
}

const ackState = (page: Page) => page.evaluate(() => JSON.stringify((window as any).D.scheduleDocsAck ?? null));

test.describe('Milestone 57C-R: supplemental-documentation acknowledgement', () => {
  test('an empty schedule prompts nothing; populating one prompts once', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Ack Ward', 'guardian');

    // A fresh filing must be silent. The hook fires on mount, so without the
    // populated-guard every schedule page would greet the filer with a dialog.
    await goto(page, '/a1');
    await expectNoDialog(page, 'empty Schedule A-1 must not prompt');

    await addGuardianRow(page, 'a1');
    const message = await acceptDynDialog(page);
    expect(message).toMatch(/supporting documentation/i);
    expect(message).toMatch(/does not collect/i);

    // Acknowledged: silent from here, including on re-entry.
    await goto(page, '/summary');
    await goto(page, '/a1');
    await expectNoDialog(page, 'an acknowledged schedule must not prompt again');
  });

  test('the acknowledgement is per schedule, not per filing', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Per Schedule Ward', 'guardian');

    await goto(page, '/a1');
    await addGuardianRow(page, 'a1');
    await acceptDynDialog(page);

    // B-1 is a different schedule and has not been acknowledged.
    await goto(page, '/b1');
    await addGuardianRow(page, 'b1');
    await acceptDynDialog(page);

    const state = await ackState(page);
    expect(state).toContain('a1');
    expect(state).toContain('b1');
  });

  // Decision 5: a non-yes records nothing and blocks nothing. confirmModal
  // resolves false on Escape as well as Cancel, so a refusal must never
  // discard the filer's work -- it only means the question returns.
  test('declining leaves the row alone and the question returns', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Decline Ward', 'guardian');
    await goto(page, '/a1');

    await addGuardianRow(page, 'a1');
    await dismissDynDialog(page);
    expect(await page.evaluate(() => (window as any).D.scheduleA1.length), 'Cancel must not discard the row').toBe(1);
    await giveA1RowContent(page);

    await goto(page, '/summary');
    await goto(page, '/a1');
    await escapeDynDialog(page);
    expect(await page.evaluate(() => (window as any).D.scheduleA1.length), 'Escape must not discard the row').toBe(1);

    // Still unacknowledged after two refusals, and still asking.
    await goto(page, '/summary');
    await goto(page, '/a1');
    await acceptDynDialog(page);
    expect(await ackState(page)).toContain('a1');
  });

  test('rows that never passed through an Add button are still caught', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Import Ward', 'guardian');
    // Stands in for an Excel import or New Filing from Existing: the data
    // arrives directly, with no Add click anywhere. Detection is on the DATA,
    // which is the whole reason the hook lives in mount() rather than on the
    // Add button.
    await page.evaluate(() => { (window as any).D.scheduleB2 = [{ description: 'Imported vehicle' }]; });
    await goto(page, '/b2');
    expect(await acceptDynDialog(page)).toMatch(/supporting documentation/i);
  });

  test('a recorded acknowledgement survives re-normalization', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Roundtrip Ward', 'guardian');
    await goto(page, '/a1');
    await addGuardianRow(page, 'a1');
    await acceptDynDialog(page);
    expect(await ackState(page)).toContain('a1');

    // normalizeWardData() runs this on every load; it must not wipe a
    // recorded acknowledgement, or every reopen would re-ask.
    await page.evaluate(() => (window as any).normalizeScheduleDocsAck((window as any).D));
    await goto(page, '/summary');
    await goto(page, '/a1');
    await expectNoDialog(page, 'normalization must preserve a recorded acknowledgement');
  });

  test('narrative Plan pages never prompt', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Plan Ward', 'planAnnual');
    for (const route of ['/', '/p2', '/p3']) {
      await goto(page, route);
      await expectNoDialog(page, `Plan route ${route} must not prompt`);
    }
  });

  // THE REGRESSION CASE. Milestone 57's first attempt made this same condition
  // raise a validation issue and drive computeNavChecks(), so no filing was
  // ever "clean" -- 46 e2e failures across 16 specs. 57C-R must leave both
  // untouched whether or not the filer ever acknowledges anything.
  test('acknowledgement state changes neither export validation nor the sidebar', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Neutrality Ward', 'guardian');
    await goto(page, '/a1');

    const snapshot = () => page.evaluate(() => ({
      issues: (window as any).validateGuardian().length,
      nav: JSON.stringify((window as any).computeNavChecks?.() ?? null),
    }));

    await addGuardianRow(page, 'a1');
    await dismissDynDialog(page);
    await giveA1RowContent(page);
    const unacknowledged = await snapshot();

    await goto(page, '/summary');
    await goto(page, '/a1');
    await acceptDynDialog(page);
    const acknowledged = await snapshot();

    expect(acknowledged.issues, 'acknowledging must not change the issue count').toBe(unacknowledged.issues);
    expect(acknowledged.nav, 'acknowledging must not change any nav check').toBe(unacknowledged.nav);
  });
});
