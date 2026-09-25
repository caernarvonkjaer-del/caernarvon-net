import { test, expect, type Page } from '@playwright/test';
import { freshStartNoPassword, createSimplifiedWard, fillMinimalValidSimplifiedWard } from './support/target';
import { extractPdfText } from './support/pdf-extract';
import { REMUNERATION_NONE_REPORTED } from '../../src/core/filing/statutory-text.js';

// Milestone 60J -- Part VII, Guardian(s) Declaration of Remuneration, brought
// to the same footing Milestone 58D put Annual's Part XI on.
//
// s. 744.367(3)(a) requires the annual guardianship report to INCLUDE a
// declaration of remuneration. Simplified had no way to say "I received
// none": the page offered only "+ Add Entry", the sidebar treated an empty
// Part VII as done, export never asked, and the PDF omitted the part
// entirely -- so a guardian who received remuneration but never opened the
// page filed a document that did not mention the subject at all.
//
// AGENTS.md section 4 is deliberate about the distinction this test is NOT
// about: the sidebar's "no items to report" prompt on ordinary schedules must
// never become an export gate, because the court's own workbook does not
// collect that declaration. Part VII is the exception the statute names, which
// is why 58D gated Annual's Part XI and why this matches it.

const REM_ROW = { guardian: 'Rachel M. Alvarez', type: 'Guardian fee', description: 'Court-approved annual fee', amount: '1250.50' };

/** The sidebar check and the export gate for Part VII, read together. */
function partSevenState(page: Page) {
  return page.evaluate(async () => {
    const w = window as any;
    const issues = (await w.GuardianForms.testing.validate.open()).map((i: any) => (typeof i === 'string' ? i : i.message));
    return {
      sidebarComplete: !!w.GuardianForms.testing.status.navChecks().checks['s-p7'],
      partSevenIssues: issues.filter((m: string) => /Part VII/.test(m)),
      declaredNone: !!(w.GuardianForms.testing.field('scheduleNoItems') && w.GuardianForms.testing.field('scheduleNoItems.remuneration')),
      rows: (w.GuardianForms.testing.field('remuneration') || []).length,
    };
  });
}

async function openFreshSimplified(page: Page, name: string) {
  await freshStartNoPassword(page);
  await createSimplifiedWard(page, name);
  await fillMinimalValidSimplifiedWard(page);
  // fillMinimalValidSimplifiedWard declares "none received" so the rest of the
  // fixture is exportable; clear it to reach the genuinely unanswered state.
  await page.evaluate(() => {
    const d = (window as any).GuardianForms.testing.snapshot().filing;
    d.remuneration = [];
    if (d.scheduleNoItems) d.scheduleNoItems.remuneration = false;
    (window as any).GuardianForms.testing.replaceFiling(d);
  });
  await page.evaluate(() => (window as any).GuardianForms.testing.save.flush());
}

test.describe('Milestone 60J: Part VII must be answered, and is always declared', () => {
  test('the sidebar and the export gate agree at every state of Part VII', async ({ page }) => {
    test.setTimeout(150_000);
    await openFreshSimplified(page, 'Part VII Truth Table Ward');

    // 1. Unanswered: no entries, no declaration.
    const unanswered = await partSevenState(page);
    expect(unanswered.rows).toBe(0);
    expect(unanswered.declaredNone).toBe(false);
    expect(unanswered.sidebarComplete, 'an unanswered Part VII must not read complete').toBe(false);
    expect(unanswered.partSevenIssues.join(' '), 'an unanswered Part VII must block export').toContain('declare the remuneration received, or verify there is none to report');

    // 2. Declared none -- through the real checkbox, not by writing state.
    await page.evaluate(() => (window as any).GuardianForms.testing.navigate('/p7'));
    const declareNone = page.locator('[data-simplified-change="schedule-no-items"][data-schedule="remuneration"]');
    await expect(declareNone, 'no "none to report" control on Part VII').toBeVisible();
    await declareNone.check();
    await page.evaluate(() => (window as any).GuardianForms.testing.save.flush());
    const declared = await partSevenState(page);
    expect(declared.declaredNone).toBe(true);
    expect(declared.sidebarComplete).toBe(true);
    expect(declared.partSevenIssues).toEqual([]);

    // 3. Adding an entry withdraws the declaration: the two must never both
    // stand, or the filing contradicts the schedule printed beside it.
    await page.locator('[data-simplified-action="add-remuneration"]').click();
    await page.evaluate(() => (window as any).GuardianForms.testing.save.flush());
    const added = await partSevenState(page);
    expect(added.rows).toBe(1);
    expect(added.declaredNone, 'adding an entry must withdraw the "none received" declaration').toBe(false);

    // 4. A half-filled row blocks: the row itself is now incomplete.
    await page.evaluate(() => {
      (window as any).GuardianForms.testing.patchFiling({ 'remuneration.0.amount': '500' });
      (window as any).GuardianForms.testing.save.auto();
    });
    await page.evaluate(() => (window as any).GuardianForms.testing.save.flush());
    const halfFilled = await partSevenState(page);
    expect(halfFilled.sidebarComplete, 'a row missing its required fields must not read complete').toBe(false);
    expect(halfFilled.partSevenIssues.join(' ')).toMatch(/Guardian Name|Type/);

    // 5. A complete row satisfies both, with no declaration ticked.
    await page.evaluate((row) => {
      const t = (window as any).GuardianForms.testing;
      t.patchFiling({ 'remuneration.0': { ...t.field('remuneration.0'), ...row } });
    }, REM_ROW);
    await page.evaluate(() => (window as any).GuardianForms.testing.save.flush());
    const complete = await partSevenState(page);
    expect(complete.declaredNone).toBe(false);
    expect(complete.sidebarComplete).toBe(true);
    expect(complete.partSevenIssues).toEqual([]);
  });

  test('a filing with no remuneration still prints Part VII, with the statute and an explicit "none"', async ({ page }) => {
    test.setTimeout(150_000);
    await openFreshSimplified(page, 'Part VII None Ward');
    await page.evaluate(() => {
      (window as any).GuardianForms.testing.patchFiling({ 'scheduleNoItems.remuneration': true });
      (window as any).GuardianForms.testing.save.auto();
    });
    await page.evaluate(() => (window as any).GuardianForms.testing.save.flush());

    const text = await extractPdfText(await page.evaluate(async () => {
      const w = window as any;
      const { buildSimplifiedAccountingModel, generateCourtFormPdf } = await w.GuardianForms.testing.generateOutput.simplifiedPdf();
      const doc = await generateCourtFormPdf(buildSimplifiedAccountingModel(w.GuardianForms.testing.snapshot().filing, { printDate: '2026-09-20' }));
      return doc.output();
    }));

    expect(text).toContain('DECLARATION OF REMUNERATION');
    expect(text).toContain(REMUNERATION_NONE_REPORTED);
    // The statute's own words reach the filed page. Checked in pieces because
    // extraction inserts line breaks between runs.
    for (const phrase of ['must both include a declaration', 'overtly or covertly', 'in cash or in kind']) {
      expect(text.replace(/\s+/g, ' '), `"${phrase}" missing from the filed Part VII`).toContain(phrase);
    }
    // The statute sets the defined term in curly quotation marks; this proves
    // the embedded PDF font carries those glyphs rather than dropping them,
    // which is what licenses statutory-text.js to use them.
    expect(text.replace(/\s+/g, ' '), 'the curly-quoted defined term did not survive into the PDF')
      .toContain('“remuneration”');
    expect(text).not.toContain('poperty');
    expect(text).not.toContain('in case or in kind');
  });

  test('a filing with remuneration prints the entries, including the amount', async ({ page }) => {
    test.setTimeout(150_000);
    await openFreshSimplified(page, 'Part VII Entries Ward');
    await page.evaluate((row) => {
      (window as any).GuardianForms.testing.patchFiling({ 'remuneration': [row] });
      (window as any).GuardianForms.testing.save.auto();
    }, REM_ROW);
    await page.evaluate(() => (window as any).GuardianForms.testing.save.flush());

    const text = await extractPdfText(await page.evaluate(async () => {
      const w = window as any;
      const { buildSimplifiedAccountingModel, generateCourtFormPdf } = await w.GuardianForms.testing.generateOutput.simplifiedPdf();
      const doc = await generateCourtFormPdf(buildSimplifiedAccountingModel(w.GuardianForms.testing.snapshot().filing, { printDate: '2026-09-20' }));
      return doc.output();
    }));

    expect(text).toContain(REM_ROW.guardian);
    expect(text).toContain(REM_ROW.type);
    expect(text, 'the remuneration amount never reached the filed document').toContain('$1,250.50');
    expect(text).not.toContain(REMUNERATION_NONE_REPORTED);
    expect(text.replace(/\s+/g, ' ')).toContain('must both include a declaration');
  });

  test('the Part VII page offers an Amount input bound to the row', async ({ page }) => {
    test.setTimeout(150_000);
    await openFreshSimplified(page, 'Part VII Amount Ward');
    await page.evaluate(() => (window as any).GuardianForms.testing.navigate('/p7'));
    await page.locator('[data-simplified-action="add-remuneration"]').click();
    const amount = page.locator('[data-form-path="remuneration.0.amount"]');
    await expect(amount, 'Part VII has no Amount input').toBeVisible();
    await amount.fill('1250.50');
    await amount.blur();
    await page.evaluate(() => (window as any).GuardianForms.testing.save.flush());
    expect(await page.evaluate(() => (window as any).GuardianForms.testing.field('remuneration.0.amount'))).toBe('1250.50');
  });
});
