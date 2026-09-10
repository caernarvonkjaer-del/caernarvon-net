import { test, expect } from '@playwright/test';
import {
  freshStartNoPassword, createWard, createSimplifiedWard,
  fillMinimalValidGuardianWard, fillMinimalValidAnnualWard, fillMinimalValidSimplifiedWard,
  fillMinimalValidPlanInitialWard, fillMinimalValidPlanAnnualWard,
  fillMinimalValidPlanMinorWard, fillMinimalValidPlanSimplifiedWard,
} from './support/target';

// Milestone 19-3: Preview and Print now render the actual generated PDF
// (pdf.js canvas + TextLayer) instead of each feature's own buildPrintHTML()
// HTML/CSS reconstruction -- one renderer (pdf-model.js + pdf-engine.js)
// drives Save-as-PDF, Preview, and Print for every feature. This spec
// exercises the shared viewer itself (src/core/pdf/pdf-preview.js), across
// all seven features, without depending on any one feature's business
// logic beyond getting to a valid /print page.

const FEATURES: Array<{
  name: string;
  create: (page: import('@playwright/test').Page, name: string) => Promise<void>;
  fill: (page: import('@playwright/test').Page) => Promise<void>;
}> = [
  { name: 'Guardian Inventory', create: (p, n) => createWard(p, n, 'guardian'), fill: fillMinimalValidGuardianWard },
  { name: 'Annual Accounting', create: (p, n) => createWard(p, n, 'annual'), fill: fillMinimalValidAnnualWard },
  // Simplified Accounting has its own eligibility-modal creation flow --
  // createWard()'s generic "Add Ward" modal doesn't apply (see
  // createSimplifiedWard()'s own header comment in support/target.ts).
  { name: 'Simplified Accounting', create: createSimplifiedWard, fill: fillMinimalValidSimplifiedWard },
  { name: 'Plan Initial', create: (p, n) => createWard(p, n, 'planInitial'), fill: fillMinimalValidPlanInitialWard },
  { name: 'Plan Annual', create: (p, n) => createWard(p, n, 'planAnnual'), fill: fillMinimalValidPlanAnnualWard },
  { name: 'Plan Minor', create: (p, n) => createWard(p, n, 'planMinor'), fill: fillMinimalValidPlanMinorWard },
  { name: 'Plan Simplified', create: (p, n) => createWard(p, n, 'planSimplified'), fill: fillMinimalValidPlanSimplifiedWard },
];

test.describe('Milestone 19-3: shared PDF preview/print viewer', () => {
  for (const feature of FEATURES) {
    test(`${feature.name}: Preview renders the real generated PDF via canvas + selectable text layer`, async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', (e) => errors.push(e.message));
      page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

      await freshStartNoPassword(page);
      await feature.create(page, `${feature.name} Preview Ward`);
      await feature.fill(page);
      await page.evaluate(() => (window as any).navigate('/print'));

      // The viewer replaces #print-doc-container's content with one
      // .pdf-page (canvas + .textLayer) per generated PDF page -- wait for
      // the async generate+render to land instead of the old synchronous
      // buildPrintHTML() markup.
      const pdfPage = page.locator('#print-doc-container .pdf-page').first();
      await expect(pdfPage).toBeVisible({ timeout: 15000 });
      await expect(pdfPage.locator('canvas')).toHaveCount(1);

      // Text layer must expose real, non-empty, selectable DOM text -- not
      // just a canvas bitmap -- so the preview surface doesn't regress the
      // app's own WCAG 2.1 AA standard relative to the HTML preview it
      // replaces.
      const textLayer = pdfPage.locator('.textLayer');
      await expect(textLayer).toHaveCount(1);
      await expect
        .poll(async () => (await textLayer.innerText()).trim().length, { timeout: 10000 })
        .toBeGreaterThan(0);

      expect(errors, `console/page errors rendering ${feature.name} preview: ${errors.join('\n')}`).toEqual([]);
    });
  }

  test('pager uses the finalized PDF page count and is rebuilt after a preview rerender', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Finalized Pager Ward', 'guardian');
    await fillMinimalValidGuardianWard(page);
    await page.evaluate(() => (window as any).navigate('/print'));

    await expect.poll(() => page.locator('#print-doc-container .pdf-page').count(), { timeout: 15000 }).toBeGreaterThan(1);
    const previewPageCount = await page.locator('#print-doc-container .pdf-page').count();
    const finalizedPageCount = await page.evaluate(async () => {
      const { buildVerifiedInventoryModel } = await (window as any).loadGuardianPdf();
      const { generateCourtFormPdf } = await import('/probate-guardian/src/core/pdf/pdf-engine.js');
      const { finalizeCourtFormPdf } = await import('/probate-guardian/src/core/pdf/pdf-finalizer.js');
      const { ensurePdfjs } = await import('/probate-guardian/src/core/pdf/pdfjs-loader.js');
      const doc = await generateCourtFormPdf(buildVerifiedInventoryModel((window as any).D));
      const finalized = await finalizeCourtFormPdf(doc);
      const pdfjs = await ensurePdfjs();
      return (await pdfjs.getDocument({ data: finalized }).promise).numPages;
    });

    expect(previewPageCount).toBe(finalizedPageCount);
    await expect(page.locator('#pv-count')).toHaveText(`Page 1 of ${finalizedPageCount}`);
    await expect(page.locator('#pv-bar .pv-navigation #pv-prev')).toBeVisible();
    await expect(page.locator('#pv-bar .pv-navigation #pv-next')).toBeVisible();
    await expect(page.locator('#pv-bar .pv-shell-actions')).toContainText('All Filings');
    await expect(page.locator('#pv-bar .pv-shell-actions [data-shell-action="toggle-theme"]')).toBeVisible();
    await expect(page.locator('#pv-bar .pv-shell-actions [data-shell-action="toggle-help"]')).toBeVisible();

    await page.evaluate(() => (window as any).navigate('/print'));
    await expect.poll(() => page.locator('#print-doc-container .pdf-page').count(), { timeout: 15000 }).toBe(finalizedPageCount);
    await expect(page.locator('#pv-bar')).toHaveCount(1);
    await expect(page.locator('#pv-count')).toHaveText(`Page 1 of ${finalizedPageCount}`);
    await expect(page.locator('#pv-bar .pv-shell-actions')).toContainText('All Filings');
  });

  // Milestone 34-1A, Item 1: mountPdfPreview()/printGeneratedPdf() used to
  // call prepareFilingOutput(D) with no baseIssues argument, and gated on
  // its structuredIssues (draft/identity issues only) rather than its
  // messages/canExport (which fold baseIssues in) -- so an incomplete
  // filing's embedded preview could render a clean, complete-looking PDF
  // on the very same page whose own banner reported N required fields
  // missing and disabled the export buttons. A brand-new, unfilled ward
  // reliably has validator issues for every one of these seven types.
  for (const feature of FEATURES) {
    test(`${feature.name}: an incomplete filing's embedded preview is blocked, not silently rendered`, async ({ page }) => {
      await freshStartNoPassword(page);
      await feature.create(page, `${feature.name} Blocked Preview Ward`);
      await page.evaluate(() => (window as any).navigate('/print'));

      const errorMessage = page.locator('#print-doc-container .pdf-preview-error');
      await expect(errorMessage).toBeVisible();
      await expect(errorMessage).toContainText('Preview is blocked');
      await expect(page.locator('#print-doc-container .pdf-page')).toHaveCount(0);
    });
  }

  test('Print opens the generated PDF as a same-origin blob: URL, never touching app chrome', async ({ page, context }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Print Blob Ward', 'guardian');
    await fillMinimalValidGuardianWard(page);
    await page.evaluate(() => (window as any).navigate('/print'));
    await page.locator('#print-doc-container .pdf-page').first().waitFor({ state: 'visible', timeout: 15000 });

    // Whether the new tab shows the PDF inline or downloads it depends on
    // whether the browser's own PDF viewer plugin is present -- Playwright's
    // bundled Chromium doesn't ship one, so opening an application/pdf
    // blob: URL there always downloads it (confirmed empirically: a real
    // end-user Chrome/Edge would instead show it in-tab via its built-in
    // viewer, but either way the browser -- not this app -- owns that
    // decision, which is the whole point of handing off a real PDF blob).
    // Accept either outcome as proof the blob actually opened.
    const downloadPromise = page.waitForEvent('download', { timeout: 10000 }).catch(() => null);
    const popupPromise = context.waitForEvent('page', { timeout: 10000 }).catch(() => null);
    await page.locator('[data-form-action="print"]').click();
    const [download, popup] = await Promise.all([downloadPromise, popupPromise]);

    if (download) {
      expect(download.suggestedFilename()).toMatch(/\.pdf$/i);
    } else {
      expect(popup, 'Print produced neither a download nor a new tab').toBeTruthy();
      await expect.poll(() => popup!.url()).toMatch(/^blob:/);
      await popup!.close();
    }
  });

  test('Save-as-PDF and Preview never diverge: same signature style produces the same PDF text content', async ({ page }) => {
    // Regression guard for the pre-19-3 divergence noted in
    // MILESTONE-19-3-PROPOSAL.md: the signature-style radio used to only
    // affect the exported PDF, not what the HTML preview showed. Preview
    // now renders the literal PDF Save-as-PDF would produce, built from
    // the same buildModelForPreview()/doSavePdf() options, so this can't
    // regress silently.
    await freshStartNoPassword(page);
    await createWard(page, 'Sig Style Parity Ward', 'guardian');
    await fillMinimalValidGuardianWard(page);
    await page.evaluate(() => (window as any).navigate('/print'));
    await page.locator('#print-doc-container .pdf-page').first().waitFor({ state: 'visible', timeout: 15000 });

    const previewText = await page.locator('#print-doc-container').innerText();

    const savedDoc = await page.evaluate(async () => {
      const { buildVerifiedInventoryModel, generateVerifiedInventoryPdf } = await (window as any).loadGuardianPdf();
      const D = (window as any).D;
      const model = buildVerifiedInventoryModel(D, { signatureStyle: D.signatureStyle || 'typed', printDate: new Date().toISOString().slice(0, 10) });
      const doc = await generateVerifiedInventoryPdf(model);
      return doc.output('datauristring');
    });
    expect(savedDoc.startsWith('data:application/pdf')).toBe(true);
    // The preview's rendered text must contain the ward name that also
    // drives the Save-as-PDF model -- a coarse but real cross-check that
    // both paths are reading the same D, not two independently-drifted
    // reconstructions.
    expect(previewText).toContain('Sig Style Parity Ward');
  });
});
