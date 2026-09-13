import { test, expect } from '@playwright/test';
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

const SCHEDULE_KEY = 'annualSchA';
const PERIOD_ONE = { from: '2025-01-01', to: '2025-12-31' };
const PERIOD_TWO = { from: '2026-01-01', to: '2026-06-30' };

test.describe('Milestone 40C-D: accounting-period re-keying of supporting documents', () => {
  test('changing the period presents an empty slot, and changing it back restores the comment and the uploads', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Period Rekey Ward', 'annual');

    // Period one, with a comment and two "uploaded" files in the slot the real
    // key derivation hands back.
    const seeded = await page.evaluate(({ key, period }) => {
      const w = window as any;
      w.D.periodFrom = period.from;
      w.D.periodTo = period.to;
      const slot = w.getScheduleDocSlot(key);
      slot.comment = 'Bank statements for the full year are attached.';
      slot.files = [
        { name: 'chase-jan-jun.pdf', size: 24576, pageCount: 6, technicalStatus: 'ready' },
        { name: 'chase-jul-dec.pdf', size: 31744, pageCount: 7, technicalStatus: 'ready' },
      ];
      return { periodKey: w.scheduleDocPeriodKey(), comment: slot.comment, fileCount: slot.files.length };
    }, { key: SCHEDULE_KEY, period: PERIOD_ONE });

    expect(seeded.periodKey).toBe(`${PERIOD_ONE.from}__${PERIOD_ONE.to}`);
    expect(seeded.fileCount).toBe(2);

    // Switch to a different period: a fresh, empty bucket is correct here.
    const afterSwitch = await page.evaluate(({ key, period }) => {
      const w = window as any;
      w.D.periodFrom = period.from;
      w.D.periodTo = period.to;
      const slot = w.getScheduleDocSlot(key);
      return { periodKey: w.scheduleDocPeriodKey(), comment: slot.comment, fileCount: slot.files.length };
    }, { key: SCHEDULE_KEY, period: PERIOD_TWO });

    expect(afterSwitch.periodKey).toBe(`${PERIOD_TWO.from}__${PERIOD_TWO.to}`);
    expect(afterSwitch.comment, 'a new period starts with its own empty slot').toBe('');
    expect(afterSwitch.fileCount).toBe(0);

    // Switch back. This is the assertion that matters: the first period's
    // content must still be there, files included.
    const afterReturn = await page.evaluate(({ key, period }) => {
      const w = window as any;
      w.D.periodFrom = period.from;
      w.D.periodTo = period.to;
      const slot = w.getScheduleDocSlot(key);
      return {
        comment: slot.comment,
        fileNames: slot.files.map((f: any) => f.name),
        pageCounts: slot.files.map((f: any) => f.pageCount),
      };
    }, { key: SCHEDULE_KEY, period: PERIOD_ONE });

    expect(afterReturn.comment).toBe('Bank statements for the full year are attached.');
    expect(afterReturn.fileNames).toEqual(['chase-jan-jun.pdf', 'chase-jul-dec.pdf']);
    expect(afterReturn.pageCounts).toEqual([6, 7]);

    // Both buckets coexist rather than one having overwritten the other.
    const buckets = await page.evaluate((key) => {
      const w = window as any;
      return Object.keys(w.D.scheduleDocs[key]).sort();
    }, SCHEDULE_KEY);
    expect(buckets).toEqual([
      `${PERIOD_ONE.from}__${PERIOD_ONE.to}`,
      `${PERIOD_TWO.from}__${PERIOD_TWO.to}`,
    ]);
  });

  test('the Supporting Documents heading follows the current accounting period', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Period Heading Ward', 'annual');

    const headings = await page.evaluate(({ key, one, two }) => {
      const w = window as any;
      const headingFor = (period: { from: string; to: string }) => {
        w.D.periodFrom = period.from;
        w.D.periodTo = period.to;
        const html = w.renderScheduleDocsSection(key);
        return (html.match(/<h2>([\s\S]*?)<\/h2>/) || [])[1] || '';
      };
      const blank = (() => {
        w.D.periodFrom = ''; w.D.periodTo = '';
        const html = w.renderScheduleDocsSection(key);
        return (html.match(/<h2>([\s\S]*?)<\/h2>/) || [])[1] || '';
      })();
      return { blank, first: headingFor(one), second: headingFor(two) };
    }, { key: SCHEDULE_KEY, one: PERIOD_ONE, two: PERIOD_TWO });

    // Displayed as MM/DD/YYYY, and it tracks the period rather than going stale.
    expect(headings.first).toContain('accounting period 01/01/2025 to 12/31/2025');
    expect(headings.second).toContain('accounting period 01/01/2026 to 06/30/2026');
    expect(headings.second).not.toContain('2025');
    // With no period set, it says so instead of showing a half-empty range.
    expect(headings.blank).toContain('set the accounting period on the Cover page');
  });

  test('a Guardian Inventory keys by filing year, not by accounting period', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Guardian Rekey Ward', 'guardian');

    // Guardian has no accounting period; scheduleDocPeriodKey() falls back to
    // activeYearKey (defaulting to 'initial'), so a period change cannot move a
    // Guardian filing's uploads at all.
    const result = await page.evaluate((key) => {
      const w = window as any;
      const first = w.scheduleDocPeriodKey();
      const slot = w.getScheduleDocSlot(key);
      slot.comment = 'Appraisal attached.';
      w.D.periodFrom = '2026-01-01';
      w.D.periodTo = '2026-12-31';
      return { first, second: w.scheduleDocPeriodKey(), comment: w.getScheduleDocSlot(key).comment };
    }, 'guardianSchA1');

    expect(result.first).toBe('initial');
    expect(result.second).toBe('initial');
    expect(result.comment).toBe('Appraisal attached.');
  });
});
