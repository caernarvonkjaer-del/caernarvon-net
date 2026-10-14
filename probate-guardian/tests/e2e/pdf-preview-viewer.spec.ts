import { test, expect, type Page } from '@playwright/test';
import {
  freshStartNoPassword, createWard, createSimplifiedWard,
  fillMinimalValidGuardianWard, fillMinimalValidAnnualWard, fillMinimalValidSimplifiedWard,
  fillMinimalValidPlanInitialWard, fillMinimalValidPlanAnnualWard,
  fillMinimalValidPlanMinorWard, fillMinimalValidPlanSimplifiedWard,
} from './support/target';

// Milestone 43E added a Trust Accounting entry here (from pdf-evidence-lab's
// Milestone 34-1D evidence test), on its own finding that no Trust-specific
// code exists anywhere -- Trust shares Annual's engine. TEST-REVIEW.md
// Delivery 1M (2026-10-13) took it out again on the same finding: the Final
// and Trust Accountings are the Annual's print.js host, and
// output-semantics.artifact.spec.ts keeps their legal copy and identity under
// test on a real download.

// Milestone 19-3: Preview and Print now render the actual generated PDF
// (pdf.js canvas + TextLayer) instead of each feature's own buildPrintHTML()
// HTML/CSS reconstruction -- one renderer (pdf-model.js + pdf-engine.js)
// drives Save-as-PDF, Preview, and Print for every feature. This spec
// exercises the shared viewer itself (src/core/pdf/pdf-preview.js), across
// all seven features, without depending on any one feature's business
// logic beyond getting to a valid /print page.

const FEATURES: Array<{
  key: string;
  name: string;
  create: (page: Page, name: string) => Promise<void>;
  fill: (page: Page) => Promise<void>;
}> = [
  { key: 'guardian', name: 'Guardian Inventory', create: (p, n) => createWard(p, n, 'guardian'), fill: fillMinimalValidGuardianWard },
  { key: 'annual', name: 'Annual Accounting', create: (p, n) => createWard(p, n, 'annual'), fill: fillMinimalValidAnnualWard },
  // Simplified Accounting has its own eligibility-modal creation flow --
  // createWard()'s generic "Add Ward" modal doesn't apply (see
  // createSimplifiedWard()'s own header comment in support/target.ts).
  { key: 'simplified', name: 'Simplified Accounting', create: createSimplifiedWard, fill: fillMinimalValidSimplifiedWard },
  { key: 'planInitial', name: 'Plan Initial', create: (p, n) => createWard(p, n, 'planInitial'), fill: fillMinimalValidPlanInitialWard },
  { key: 'planAnnual', name: 'Plan Annual', create: (p, n) => createWard(p, n, 'planAnnual'), fill: fillMinimalValidPlanAnnualWard },
  { key: 'planMinor', name: 'Plan Minor', create: (p, n) => createWard(p, n, 'planMinor'), fill: fillMinimalValidPlanMinorWard },
  { key: 'planSimplified', name: 'Plan Simplified', create: (p, n) => createWard(p, n, 'planSimplified'), fill: fillMinimalValidPlanSimplifiedWard },
];

const card = (page: Page) => page.locator('#filing-readiness-card');
const isOpen = (page: Page) => card(page).evaluate((el: HTMLDetailsElement) => el.open);
const setCounty = (page: Page, county: string) => page.evaluate((c) => { (window as any).GuardianForms.testing.patchFiling({ 'county': c }); }, county);
// Also a same-route re-render, the way a filer gets one: navigating to the page again.
const goPreview = (page: Page) => page.evaluate(() => (window as any).GuardianForms.testing.navigate('/print'));

test.describe('Milestone 19-3: shared PDF preview/print viewer', () => {
  for (const feature of FEATURES) {
    // Until TEST-REVIEW.md Delivery 1M (2026-10-13) three specs each built a
    // complete filing of every type and opened Preview: this one for the
    // viewer, readiness-card.contract.spec.ts for the shared readiness card
    // (Milestones 38B, 44C and 54) and pdf-annotate.spec.ts for the annotate
    // toolbar's rollout (45B). One Preview per print.js host now carries all
    // three; the Final and Trust Accountings share the Annual's.
    test(`${feature.name}: Preview renders the real generated PDF via canvas + selectable text layer, with exactly one readiness card and the annotate toolbar`, async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', (e) => errors.push(e.message));
      page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

      await freshStartNoPassword(page);
      await feature.create(page, `${feature.name} Preview Ward`);
      await feature.fill(page);
      await setCounty(page, 'Pinellas');
      await goPreview(page);

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

      // The shared readiness card: exactly one, a real <details> with a
      // <summary> first child, the Clerk's title with local context for
      // Pinellas/Pasco, collapsed with the manual-review sentence when the
      // automatic checks pass, and manual rows never shown as automatic
      // passes. Milestone 54's banner shell controls, on every type.
      await expect(card(page)).toHaveCount(1);
      await expect(page.locator('.readiness-panel')).toHaveCount(1);
      const previewShellActions = page.locator('.print-preview-banner [data-preview-shell-actions] .pv-shell-actions');
      await expect(previewShellActions).toHaveCount(1);
      await expect(previewShellActions).toContainText('All Filings');
      await expect(previewShellActions.locator('[data-shell-action="toggle-theme"]')).toBeVisible();
      await expect(previewShellActions.locator('[data-shell-action="toggle-help"]')).toBeVisible();
      await expect(card(page)).toHaveAttribute('data-readiness-filing', feature.key);
      const tags = await card(page).evaluate((el) => ({ self: el.tagName, first: el.firstElementChild?.tagName }));
      expect(tags).toEqual({ self: 'DETAILS', first: 'SUMMARY' });
      await expect(card(page).locator('.validation-title')).toContainText("Clerk's Review Readiness");
      await expect(card(page).locator('.validation-title')).toContainText('Automated checks passed; manual review remains.');
      expect(await isOpen(page)).toBe(false);
      await expect(card(page).locator('.readiness-mark.pending')).toHaveCount(0);
      const manualGroup = card(page).locator('.validation-group', { hasText: "can't verify" });
      await expect(manualGroup).toHaveCount(1);
      await expect(manualGroup.locator('.readiness-mark.ok, .readiness-mark.pending')).toHaveCount(0);
      await expect(manualGroup.locator('.readiness-mark.manual').first()).toBeAttached();

      // Milestone 45B: every host mounts the annotate toolbar, and (39-A's
      // Non-Goal #2) the toolbar never writes into validated form data.
      await expect(page.locator('[data-annotate-action="toggle"]')).toHaveCount(1);
      expect(await page.evaluate(() => JSON.stringify((window as any).GuardianForms.testing.snapshot().filing).includes('freeTextEditor'))).toBe(false);

      // Elsewhere than Pinellas/Pasco the card is Filing Readiness, with no
      // local context.
      await setCounty(page, 'Orange');
      await goPreview(page);
      await expect(card(page)).toHaveCount(1);
      await expect(card(page).locator('.validation-title')).toContainText('Filing Readiness');
      await expect(card(page)).not.toContainText(/Pinellas|Pasco|Sixth (Judicial )?Circuit/);

      // A hand toggle survives a same-route rerender and resets on fresh
      // Preview entry. Native disclosure semantics: keyboard-operable via the
      // summary. The `toggle` event is dispatched on a later task; wait for
      // it before rerendering so the test doesn't race its own event queue
      // (a real rerender never follows a click within the same task).
      expect(await isOpen(page)).toBe(false);
      await card(page).evaluate((el) => {
        (window as any).__readinessToggled = false;
        el.addEventListener('toggle', () => { (window as any).__readinessToggled = true; }, { once: true });
      });
      await card(page).locator('summary').focus();
      await page.keyboard.press('Enter');
      await expect.poll(() => isOpen(page)).toBe(true);
      await page.waitForFunction(() => (window as any).__readinessToggled === true);
      await goPreview(page);
      await expect(card(page)).toHaveCount(1);
      await expect.poll(() => isOpen(page)).toBe(true);
      await page.evaluate(() => (window as any).GuardianForms.testing.navigate('/'));
      await goPreview(page);
      await expect(card(page)).toHaveCount(1);
      expect(await isOpen(page)).toBe(false);

      expect(errors, `console/page errors rendering ${feature.name} preview: ${errors.join('\n')}`).toEqual([]);
    });
  }

  test('pager uses the finalized PDF page count and is rebuilt after a preview rerender', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Finalized Pager Ward', 'guardian');
    await fillMinimalValidGuardianWard(page);
    await page.evaluate(() => (window as any).GuardianForms.testing.navigate('/print'));

    await expect.poll(() => page.locator('#print-doc-container .pdf-page').count(), { timeout: 15000 }).toBeGreaterThan(1);
    const previewPageCount = await page.locator('#print-doc-container .pdf-page').count();
    const finalizedPageCount = await page.evaluate(async () => {
      const { buildVerifiedInventoryModel } = await (window as any).GuardianForms.testing.generateOutput.guardianPdf();
      const { generateCourtFormPdf } = await import('/probate-guardian/src/core/pdf/pdf-engine.js');
      const { finalizeCourtFormPdf } = await import('/probate-guardian/src/core/pdf/pdf-finalizer.js');
      const { ensurePdfjs } = await import('/probate-guardian/src/core/pdf/pdfjs-loader.js');
      const doc = await generateCourtFormPdf(buildVerifiedInventoryModel((window as any).GuardianForms.testing.snapshot().filing));
      const finalized = await finalizeCourtFormPdf(doc);
      const pdfjs = await ensurePdfjs();
      return (await pdfjs.getDocument({ data: finalized }).promise).numPages;
    });

    expect(previewPageCount).toBe(finalizedPageCount);
    await expect(page.locator('#pv-count')).toHaveText(`Page 1 of ${finalizedPageCount}`);
    await expect(page.locator('#pv-bar .pv-navigation #pv-prev')).toBeVisible();
    await expect(page.locator('#pv-bar .pv-navigation #pv-next')).toBeVisible();
    await expect(page.locator('#pv-bar .pv-shell-actions')).toHaveCount(0);
    const shellActions = page.locator('.print-preview-banner [data-preview-shell-actions] .pv-shell-actions');
    await expect(shellActions).toContainText('All Filings');
    await expect(shellActions.locator('[data-shell-action="toggle-theme"]')).toBeVisible();
    await expect(shellActions.locator('[data-shell-action="toggle-help"]')).toBeVisible();

    await page.evaluate(() => (window as any).GuardianForms.testing.navigate('/print'));
    await expect.poll(() => page.locator('#print-doc-container .pdf-page').count(), { timeout: 15000 }).toBe(finalizedPageCount);
    await expect(page.locator('#pv-bar')).toHaveCount(1);
    await expect(page.locator('#pv-count')).toHaveText(`Page 1 of ${finalizedPageCount}`);
    await expect(page.locator('#pv-bar .pv-shell-actions')).toHaveCount(0);
    await expect(page.locator('.print-preview-banner [data-preview-shell-actions] .pv-shell-actions')).toContainText('All Filings');
  });

  // Milestone 34-1A, Item 1: mountPdfPreview()/printGeneratedPdf() used to
  // call prepareFilingOutput(D) with no baseIssues argument, and gated on
  // its structuredIssues (draft/identity issues only) rather than its
  // messages/canExport (which fold baseIssues in) -- so an incomplete
  // filing's embedded preview could render a clean, complete-looking PDF
  // on the very same page whose own banner reported N required fields
  // missing and disabled the export buttons. A brand-new, unfilled ward
  // reliably has validator issues for every one of these seven types.
  // "<type>: an incomplete filing's embedded preview is blocked, not silently
  // rendered" ran here for every type until TEST-REVIEW.md Delivery 1M
  // (2026-10-13): output-buttons-after-override.spec.ts opens the same empty
  // Preview per print.js host and carries the blocked panel, the override's
  // confirm and the banner after it, on its way to a real Save as PDF.

  test('Print opens the generated PDF as a same-origin blob: URL, never touching app chrome', async ({ page, context }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Print Blob Ward', 'guardian');
    await fillMinimalValidGuardianWard(page);
    await page.evaluate(() => (window as any).GuardianForms.testing.navigate('/print'));
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
    await page.evaluate(() => (window as any).GuardianForms.testing.navigate('/print'));
    await page.locator('#print-doc-container .pdf-page').first().waitFor({ state: 'visible', timeout: 15000 });

    const previewText = await page.locator('#print-doc-container').innerText();

    const savedDoc = await page.evaluate(async () => {
      const { buildVerifiedInventoryModel, generateVerifiedInventoryPdf } = await (window as any).GuardianForms.testing.generateOutput.guardianPdf();
      const D = (window as any).GuardianForms.testing.snapshot().filing;
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

  // Milestone 42B: the stale-deployment error panel's "Reload Page" button
  // was an inline onclick= inside an innerHTML string, which index.html's
  // CSP (script-src 'self', no 'unsafe-inline') silently blocks -- the one
  // error state where Reload most needs to work was the one where it never
  // fired. Aborting the pdf.js module fetch is the real chunk-load failure
  // that branch exists for. Confirmed red against the inline-onclick code.
  test('stale-deployment error panel has a Reload Page button that actually reloads', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Reload Button Ward', 'guardian');
    await fillMinimalValidGuardianWard(page);
    await page.route('**/lib/pdfjs/pdf.mjs', (route) => route.abort());
    await page.evaluate(() => (window as any).GuardianForms.testing.navigate('/print'));

    const panel = page.locator('#print-doc-container .pdf-preview-error');
    await expect(panel).toBeVisible({ timeout: 15000 });
    await expect(panel).toContainText('reload the page');
    const reload = panel.locator('[data-preview-action="reload"]');
    await expect(reload).toHaveText('Reload Page');

    await page.unroute('**/lib/pdfjs/pdf.mjs');
    const reloaded = page.waitForEvent('load', { timeout: 10000 });
    await reload.click();
    await reloaded;
  });
});
