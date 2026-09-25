import { test, expect, type Page } from '@playwright/test';
import { PDFDocument } from 'pdf-lib';
import { freshStartNoPassword, createWard } from './support/target';

// Milestone 40C-D, scoped to regression coverage only.
//
// 40C-D was written as a bug fix for four claimed failures when the accounting
// period changes: a stale Supporting Documents heading, the section collapsing,
// lost focus, and cleared uploads/comments. Browser verification against the
// live build found that NONE of them reproduce. The heading refreshes, nothing
// collapses, focus holds, and period-keyed content is re-keyed rather than
// destroyed. So there is nothing to fix -- but also, at the time, nothing
// asserting any of it.
//
// The behaviour that matters most is the one that looks like data loss and
// isn't: scheduleDocs[scheduleKey][periodKey] buckets per accounting period
// (legacy-app.js's scheduleDocPeriodKey() builds `${periodFrom}__${periodTo}`),
// so changing the period correctly presents an empty slot, and changing it back
// must bring the original content back intact. A future change to the key
// scheme could quietly turn that round trip into real, permanent loss of a
// filer's uploaded evidence, with nothing to catch it.
//
// The browser check round-tripped a comment only; uploaded files share the same
// slot, so the same conclusion was inferred but never observed. Both halves are
// asserted here.

// Schedule A's own key and page. (Until Milestone 70's 70T the first two tests
// used 'annualSchA', a key no page renders: they proved a slot no filer ever
// sees. They now go through Schedule A's Supporting Documents section.)
const SCHEDULE_KEY = 'schA';
const SCHEDULE_ROUTE = '/scha';
const PERIOD_ONE = { from: '2025-01-01', to: '2025-12-31' };
const PERIOD_TWO = { from: '2026-01-01', to: '2026-06-30' };
const COMMENT = `textarea[data-schedule-key="${SCHEDULE_KEY}"]`;
const SECTION = '.schedule-docs-section';

/** A real PDF with `pages` blank pages, as a filer's statement would arrive. */
async function pdfWithPages(pages: number): Promise<Buffer> {
  const doc = await PDFDocument.create();
  for (let i = 0; i < pages; i++) doc.addPage([612, 792]);
  return Buffer.from(await doc.save());
}

/** Setup (D9): the accounting period, then Schedule A redrawn for it. The real Cover inputs are the third test's subject. */
async function showScheduleFor(page: Page, period: { from: string; to: string }) {
  await page.evaluate(({ pd, route }) => {
    const t = (window as any).GuardianForms.testing;
    t.patchFiling({ periodFrom: pd.from, periodTo: pd.to });
    return t.navigate(route);
  }, { pd: period, route: SCHEDULE_ROUTE });
  await expect(page.locator(SECTION).first()).toBeVisible();
}

test.describe('Milestone 40C-D: accounting-period re-keying of supporting documents', () => {
  test('changing the period presents an empty slot, and changing it back restores the comment and the uploads', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Period Rekey Ward', 'annual');

    // Period one: the comment typed where a filer types it ...
    await showScheduleFor(page, PERIOD_ONE);
    await page.locator(COMMENT).fill('Bank statements for the full year are attached.');
    await page.locator(COMMENT).blur();
    // ... filed under the key the app derives for the period ...
    const bucketsAfterComment = await page.evaluate((key) => Object.keys((window as any).GuardianForms.testing.snapshot().filing.scheduleDocs?.[key] || {}), SCHEDULE_KEY);
    expect(bucketsAfterComment).toEqual([`${PERIOD_ONE.from}__${PERIOD_ONE.to}`]);
    // ... and two statements uploaded through the section's own control, as
    // real PDFs the app reads and checks (6 and 7 pages).
    await page.locator(`${SECTION} input[type="file"][data-schedule-key="${SCHEDULE_KEY}"]`).setInputFiles([
      { name: 'chase-jan-jun.pdf', mimeType: 'application/pdf', buffer: await pdfWithPages(6) },
      { name: 'chase-jul-dec.pdf', mimeType: 'application/pdf', buffer: await pdfWithPages(7) },
    ]);
    await expect(page.locator(`${SECTION} .sched-doc-row`)).toHaveCount(2);
    await expect(page.locator(`${SECTION} .sched-doc-row`)).toContainText(['6 pages', '7 pages']);
    await showScheduleFor(page, PERIOD_ONE);
    await expect(page.locator(`${SECTION} .sched-doc-row`)).toHaveCount(2);

    // Switch to a different period: a fresh, empty slot is correct here.
    await showScheduleFor(page, PERIOD_TWO);
    await expect(page.locator(COMMENT), 'a new period starts with its own empty slot').toHaveValue('');
    await expect(page.locator(`${SECTION} .sched-doc-row`)).toHaveCount(0);
    await expect(page.locator(`${SECTION} .sched-doc-empty`)).toContainText('for this period');

    // Switch back. This is the assertion that matters: the first period's
    // content must still be there, files included.
    await showScheduleFor(page, PERIOD_ONE);
    await expect(page.locator(COMMENT)).toHaveValue('Bank statements for the full year are attached.');
    await expect(page.locator(`${SECTION} .sched-doc-name`)).toContainText(['chase-jan-jun.pdf', 'chase-jul-dec.pdf']);
    await expect(page.locator(`${SECTION} .sched-doc-row`)).toContainText(['6 pages', '7 pages']);

    // Both buckets coexist rather than one having overwritten the other.
    const buckets = await page.evaluate((key) => Object.keys((window as any).GuardianForms.testing.snapshot().filing.scheduleDocs[key]).sort(), SCHEDULE_KEY);
    expect(buckets).toEqual([
      `${PERIOD_ONE.from}__${PERIOD_ONE.to}`,
      `${PERIOD_TWO.from}__${PERIOD_TWO.to}`,
    ]);
  });

  test('the Supporting Documents heading follows the current accounting period', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Period Heading Ward', 'annual');
    const heading = page.locator(`${SECTION} h2`).first();

    // With no period set, it says so instead of showing a half-empty range.
    await showScheduleFor(page, { from: '', to: '' });
    await expect(heading).toContainText('set the accounting period on the Cover page');

    // Displayed as MM/DD/YYYY, and it tracks the period rather than going stale.
    await showScheduleFor(page, PERIOD_ONE);
    await expect(heading).toContainText('accounting period 01/01/2025 to 12/31/2025');
    await showScheduleFor(page, PERIOD_TWO);
    await expect(heading).toContainText('accounting period 01/01/2026 to 06/30/2026');
    await expect(heading).not.toContainText('2025');
  });

  // Milestone 43F, Decision 3: the tests above used to drive getScheduleDocSlot()/
  // renderScheduleDocsSection()/scheduleDocPeriodKey() directly through
  // page.evaluate() -- none of them touched the real rendered DOM (since 70T
  // they read the rendered section too). The
  // render function itself has no collapse/accordion behavior at all
  // (confirmed by reading it directly: it's a plain always-visible
  // `<div class="schedule-docs-section no-print">`, matching this file's
  // own header comment that "nothing collapses"), so there is no real
  // collapse behavior to assert against. What real UI interaction *can*
  // check, and nothing did: does the heading actually update on screen
  // after a real period edit through the Cover page's own inputs, and does
  // typing in the real Comments textarea ever lose focus (the historical
  // "lost focus" complaint) -- which would happen if any code path
  // re-rendered the page on every keystroke.
  test('the Supporting Documents heading updates through real period navigation, and the Comments box never loses focus while typing', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Real UI Period Ward', 'annual');

    // Blank period, before anything is filled in: real navigation, real locator.
    await page.evaluate(() => (window as any).GuardianForms.testing.navigate('/scha'));
    await expect(page.locator('.schedule-docs-section h2').first()).toContainText(
      'set the accounting period on the Cover page',
    );

    // Set the period through the actual Cover page inputs, not window.D.
    await page.evaluate(() => (window as any).GuardianForms.testing.navigate('/'));
    await page.fill('input[data-field-path="periodFrom"]', '01/15/2025');
    await page.locator('input[data-field-path="periodTo"]').click();
    await page.fill('input[data-field-path="periodTo"]', '12/31/2025');
    await page.locator('input[data-field-path="periodFrom"]').click();

    await page.evaluate(() => (window as any).GuardianForms.testing.navigate('/scha'));
    await expect(page.locator('.schedule-docs-section h2').first()).toContainText(
      'accounting period 01/15/2025 to 12/31/2025',
    );

    // Type into the real Comments textarea -- must never lose focus mid-type,
    // since updateScheduleComment() (legacy-app.js) does not call renderPage().
    const comment = page.locator('textarea[data-schedule-key="schA"]');
    await comment.click();
    await comment.pressSequentially('Bank statements are attached for the full year.');
    await expect(comment).toBeFocused();
    await expect(comment).toHaveValue('Bank statements are attached for the full year.');

    // Navigating away and back must not lose the comment.
    await page.evaluate(() => (window as any).GuardianForms.testing.navigate('/schb1'));
    await page.evaluate(() => (window as any).GuardianForms.testing.navigate('/scha'));
    await expect(page.locator('textarea[data-schedule-key="schA"]')).toHaveValue(
      'Bank statements are attached for the full year.',
    );

    // Changing the period again (still through real UI) presents a real,
    // empty textarea for the new period -- and the first period's comment
    // is still there when we navigate back to it.
    await page.evaluate(() => (window as any).GuardianForms.testing.navigate('/'));
    await page.fill('input[data-field-path="periodFrom"]', '01/01/2026');
    await page.locator('input[data-field-path="periodTo"]').click();
    await page.fill('input[data-field-path="periodTo"]', '06/30/2026');
    await page.locator('input[data-field-path="periodFrom"]').click();
    await page.evaluate(() => (window as any).GuardianForms.testing.navigate('/scha'));
    await expect(page.locator('textarea[data-schedule-key="schA"]')).toHaveValue('');

    await page.evaluate(() => (window as any).GuardianForms.testing.navigate('/'));
    await page.fill('input[data-field-path="periodFrom"]', '01/15/2025');
    await page.locator('input[data-field-path="periodTo"]').click();
    await page.fill('input[data-field-path="periodTo"]', '12/31/2025');
    await page.locator('input[data-field-path="periodFrom"]').click();
    await page.evaluate(() => (window as any).GuardianForms.testing.navigate('/scha'));
    await expect(page.locator('textarea[data-schedule-key="schA"]')).toHaveValue(
      'Bank statements are attached for the full year.',
    );
  });

  test('a Guardian Inventory keys by filing year, not by accounting period', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Guardian Rekey Ward', 'guardian');

    // Guardian has no accounting period; scheduleDocPeriodKey() falls back to
    // activeYearKey (defaulting to 'initial'), so a period change cannot move a
    // Guardian filing's uploads at all. Schedule A-1's own section ('a1'; the
    // key used to be 'guardianSchA1', which no page renders -- 70T).
    const comment = page.locator('textarea[data-schedule-key="a1"]');
    const buckets = () => page.evaluate(() => Object.keys((window as any).GuardianForms.testing.snapshot().filing.scheduleDocs?.a1 || {}));
    await page.evaluate(() => (window as any).GuardianForms.testing.navigate('/a1'));
    await comment.fill('Appraisal attached.');
    await comment.blur();
    expect(await buckets()).toEqual(['initial']);

    // Setup (D9): a period, as if one had been entered.
    await page.evaluate(() => {
      const t = (window as any).GuardianForms.testing;
      t.patchFiling({ periodFrom: '2026-01-01', periodTo: '2026-12-31' });
      return t.navigate('/a1');
    });
    expect(await buckets()).toEqual(['initial']);
    await expect(comment).toHaveValue('Appraisal attached.');
  });
});
