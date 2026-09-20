import { test, expect } from '@playwright/test';
import { freshStartNoPassword } from './support/target';
import { extractPdfText, extractPdfTextRuns } from './support/pdf-extract';

// Milestone 61G. The PDF engine's `notice` renderer drew the body text and
// discarded the block's `title`, so headings the models set never reached the
// page. tests/unit/pdf-engine-notice-title.spec.js pins the renderer's source;
// this proves the heading actually lands in the finished document, which only
// a real generate-and-extract can show.
//
// Two cases, deliberately from different form families, because the fix is in
// the shared engine and not in any one model:
//   - a certification heading on the Simplified Plan, where a filer reading a
//     signature page needs to know whose certification it is;
//   - 'Bond Calculation' on the Guardian Inventory, one of three headings in
//     the Milestone 60 forms that this document originally reported as
//     unaffected. They were not; the grep behind that claim used a one-line
//     window and missed every notice whose `tag:` key sits between `type:`
//     and `title:`.

test.describe('Milestone 61G: notice-block headings reach the filed PDF', () => {
  test('the Simplified Plan prints its guardian certification heading', async ({ page }) => {
    await freshStartNoPassword(page);

    const bytes = await page.evaluate(async () => {
      const { buildPlanSimplifiedModel, generateCourtFormPdf } = await (window as any).loadPlanSimplifiedPdf();
      const model = buildPlanSimplifiedModel({
        wardName: 'Notice Title Ward',
        caseNumber: '26-000111-GD',
        county: 'Pinellas',
        periodFrom: '2025-01-01',
        periodTo: '2025-12-31',
        planGuardians: [{ name: 'Robin Vance', signatureDate: '2026-01-05', email: 'r@example.com', phone: '(727) 555-0111', mailingAddress: '1 Main St' }],
      });
      const doc = await generateCourtFormPdf(model);
      return Array.from(new Uint8Array(doc.output('arraybuffer')));
    });

    const text = await extractPdfText(new Uint8Array(bytes));
    expect(text).toMatch(/CERTIFICATION AND SIGNATURE OF GUARDIAN\(S\)/i);
  });

  test('the Guardian Inventory prints its Bond Calculation heading', async ({ page }) => {
    await freshStartNoPassword(page);

    const bytes = await page.evaluate(async () => {
      const { buildVerifiedInventoryModel, generateCourtFormPdf } = await (window as any).loadGuardianPdf();
      const model = buildVerifiedInventoryModel({
        wardName: 'Bond Heading Ward',
        caseNumber: '26-000222-GD',
        county: 'Pinellas',
        bondAmount: '50000',
      });
      const doc = await generateCourtFormPdf(model);
      return Array.from(new Uint8Array(doc.output('arraybuffer')));
    });

    // Deliberately NOT a substring search on the whole page: this notice's own
    // body text opens with the words "Bond Calculation consists of liquid
    // assets...", so /Bond Calculation/ matched even with the heading missing.
    // The heading is its own text run; the body is a different, longer one.
    const runs = await extractPdfTextRuns(new Uint8Array(bytes));
    const headingRun = runs.find((r) => r.text.trim() === 'Bond Calculation');
    expect(headingRun, 'the heading should be drawn as its own run, above the body').toBeTruthy();

    const bodyRun = runs.find((r) => r.text.includes('consists of liquid assets'));
    expect(bodyRun, 'the notice body should still be drawn').toBeTruthy();
    // Lower y is further down the page in this engine's coordinate space, so
    // the heading must sit above the paragraph it introduces.
    expect(headingRun!.y).toBeGreaterThan(bodyRun!.y);
  });
});
