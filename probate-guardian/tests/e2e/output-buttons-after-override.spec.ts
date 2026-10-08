import { test, expect, type Page } from '@playwright/test';
import { freshStartNoPassword, createWard, createSimplifiedWard, acceptDynDialog, clickExport, expectExportReady } from './support/target';
import { readAll } from './support/stream';

// Milestone 74C, with Milestone 73M step 5. Save as PDF and Save as Excel stay
// clickable on all nine forms and say why they can't export -- in a reason
// line beside them before the click, and on the click.
//
// What a filer saw before:
//   - Simplified Annual Plan: after "Continue despite outstanding
//     requirements", Print worked but Save as PDF stayed greyed out, with
//     nothing to say why (QA report BUG-11). The Preview re-enabled only the
//     buttons its per-form selectors matched, and none matched that form's.
//   - Every form: a greyed-out button gave no reason -- not on hover, not to a
//     screen reader (QA report UX-30).
//   - The three accountings, coming back to Preview after a Continue: Save as
//     Excel was drawn ready from the earlier Continue, which opening Preview
//     had just cleared, and the click only redrew the page -- it saved nothing
//     and said nothing (found by the batch regression, 2026-10-07).
//
// Each filing is new and empty: every requirement outstanding, all of them
// ones "Continue" can acknowledge.

const OVERRIDE = '#print-doc-container [data-preview-action="override"]';
const CONTINUE = 'Continue despite outstanding requirements';

// Each form's own buttons, by the attributes they have always carried, so the
// cases also run against the forms as they were before 74C (red-first).
const FORMS: Array<{ label: string; create: (page: Page, name: string) => Promise<void>; pdf: string; excel: string | null }> = [
  { label: 'Initial Inventory', create: (page, name) => createWard(page, name, 'guardian'), pdf: '[data-inventory-action="save-pdf"]', excel: '[data-inventory-action="save-excel"]' },
  { label: 'Annual Accounting', create: (page, name) => createWard(page, name, 'annual'), pdf: '[data-annual-action="save-pdf"]', excel: '[data-annual-action="save-excel"]' },
  { label: 'Final Accounting', create: (page, name) => createWard(page, name, 'finalAccounting'), pdf: '[data-annual-action="save-pdf"]', excel: '[data-annual-action="save-excel"]' },
  { label: 'Trust Accounting', create: (page, name) => createWard(page, name, 'trustAccounting'), pdf: '[data-annual-action="save-pdf"]', excel: '[data-annual-action="save-excel"]' },
  { label: 'Simplified Accounting', create: (page, name) => createSimplifiedWard(page, name), pdf: '[data-simplified-action="save-pdf"]', excel: '[data-simplified-action="save-excel"]' },
  { label: 'Annual Plan', create: (page, name) => createWard(page, name, 'planAnnual'), pdf: '[data-form-action="save-pdf-plan-annual"]', excel: null },
  { label: 'Initial Plan', create: (page, name) => createWard(page, name, 'planInitial'), pdf: '[data-form-action="save-pdf-plan-initial"]', excel: null },
  { label: 'Annual Plan for Minors', create: (page, name) => createWard(page, name, 'planMinor'), pdf: '[data-form-action="save-pdf-plan-minor"]', excel: null },
  { label: 'Simplified Annual Plan', create: (page, name) => createWard(page, name, 'planSimplified'), pdf: '[data-plan-simplified-action="save-pdf"]', excel: null },
];

const go = (page: Page, route: string) => page.evaluate((r) => (window as any).GuardianForms.testing.navigate(r), route);

async function openEmptyPreview(page: Page, form: (typeof FORMS)[number]) {
  await freshStartNoPassword(page);
  await form.create(page, `${form.label} Output Buttons`);
  await go(page, '/print');
  await expect(page.locator(OVERRIDE), 'the Preview offers Continue').toBeVisible({ timeout: 60_000 });
}

async function choose(page: Page) {
  await page.locator(OVERRIDE).click();
  await acceptDynDialog(page);
}

for (const form of FORMS) {
  const PDF = `#main-content ${form.pdf}`;
  const EXCEL = form.excel ? `#main-content ${form.excel}` : '';
  test.describe(form.label, () => {
    // The QA report's case. Red-first: before 74C the Simplified Annual
    // Plan's button stayed disabled after Continue, so the click never came;
    // the other eight forms passed both ways.
    test('after "Continue despite outstanding requirements", Save as PDF downloads the PDF', async ({ page }) => {
      test.setTimeout(240_000);
      await openEmptyPreview(page, form);
      await choose(page);
      const pdf = await clickExport(page.locator(PDF), 120_000);
      expect(pdf.suggestedFilename()).toMatch(/\.pdf$/i);
      expect((await readAll(await pdf.createReadStream())).subarray(0, 5).toString('latin1')).toBe('%PDF-');
    });

    // Red-first: before 74C there was no reason line -- the buttons were
    // greyed out with nothing to say why, and could not be clicked.
    test('before Continue, the reason line says what stops each button, which points to it; the click says why', async ({ page }) => {
      test.setTimeout(180_000);
      await openEmptyPreview(page, form);
      const reason = page.locator('#export-reason');
      for (const [selector, action] of form.excel ? [[PDF, 'save-pdf'], [EXCEL, 'save-excel']] : [[PDF, 'save-pdf']]) {
        await expect(page.locator(selector), 'clickable').toBeEnabled();
        await expect(page.locator(selector), 'described by the reason line').toHaveAttribute('aria-describedby', 'export-reason');
        await expect(page.locator(selector), 'one attribute names every export button').toHaveAttribute('data-output-action', action);
      }
      await expect(reason.locator('[data-export-reason="outstanding"]')).toContainText(form.excel ? 'Save as PDF and Save as Excel:' : 'Save as PDF:');
      await expect(reason).toContainText(`requirements outstanding — see the list on this page, or choose “${CONTINUE}”`);

      let downloaded = false;
      page.on('download', () => { downloaded = true; });
      await page.locator(PDF).click();
      const said = await acceptDynDialog(page);
      expect(said).toMatch(/^Cannot export — \d+ required fields missing\. /);
      expect(said).toContain(`or choose “${CONTINUE}” to export anyway`);
      expect(downloaded, 'nothing was saved').toBe(false);

      // Continue clears what it acknowledged from the reason line.
      await choose(page);
      await expectExportReady(page.locator(PDF), 20_000, 'Save as PDF: nothing in its way after Continue');
      if (form.excel) await expectExportReady(page.locator(EXCEL), 20_000, 'Save as Excel: nothing in its way after Continue');
    });

    if (form.excel) {
      // Red-first: before 73M, coming back to Preview drew Save as Excel ready
      // and its click only redrew the page -- no file, no word.
      test('coming back to Preview after a Continue and a save, Save as Excel says why it can\'t export, and saves nothing', async ({ page }) => {
        test.setTimeout(240_000);
        await openEmptyPreview(page, form);
        await choose(page);
        const saved = await clickExport(page.locator(EXCEL), 120_000);
        expect(saved.suggestedFilename()).toMatch(/\.xlsx$/i);

        // Leave Preview and come back, changing nothing.
        await go(page, '/');
        await go(page, '/print');
        await expect(page.locator(OVERRIDE), 'the earlier Continue covered that visit only').toBeVisible({ timeout: 60_000 });

        let downloaded = false;
        page.on('download', () => { downloaded = true; });
        await page.locator(EXCEL).click();
        const said = await acceptDynDialog(page);
        expect(said).toMatch(/^Cannot export to Excel — \d+ required fields missing\. /);
        expect(said).toContain(`or choose “${CONTINUE}” to export anyway`);
        expect(downloaded, 'nothing was saved').toBe(false);
        // ...and the reason line beside it said so before the click.
        await expect(page.locator('#export-reason [data-export-reason="outstanding"]')).toContainText('Save as Excel');
      });
    }
  });
}
