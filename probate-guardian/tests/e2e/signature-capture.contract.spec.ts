import { test, expect } from '@playwright/test';
import { freshStartNoPassword, createWard, fillMinimalValidPlanSimplifiedWard } from './support/target';

// Milestone 39-B: three-state signature control (Unsigned / "/s/" Signed /
// Signature Stamp) on Plan Simplified's Guardian card -- the pilot role for
// this mechanism (src/core/signature/signature-pad.js,
// src/core/signature/signature-state-control.js,
// src/core/validation/signature-state.js). Proves the real export-blocking
// path agrees with the UI, not just the validator in isolation.

async function gotoSignaturesPage(page: import('@playwright/test').Page) {
  await page.evaluate(() => (window as any).navigate('/p3'));
  await page.locator('[data-signature-state-group^="planGuardians.0"]').waitFor({ state: 'visible' });
}

test.describe('Milestone 39-B: signature state control (pilot: Plan Simplified Guardian)', () => {
  test('legacy migration: a filing with a signatureDate but no stored signatureState shows "/s/" Signed pre-selected', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Sig Legacy Ward', 'planSimplified');
    await fillMinimalValidPlanSimplifiedWard(page); // sets signatureDate, never signatureState
    await gotoSignaturesPage(page);

    const typedRadio = page.locator('[data-signature-state-group="planGuardians.0"] input[value="typed"]');
    await expect(typedRadio).toBeChecked();

    // And the real export path already treats this filing as complete --
    // the inference is read-time only, never written back into window.D.
    const storedState = await page.evaluate(() => (window as any).D.planGuardians[0].signatureState);
    expect(storedState).toBeFalsy();
  });

  test('Unsigned validates and exports cleanly with no date required', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Sig Unsigned Ward', 'planSimplified');
    await fillMinimalValidPlanSimplifiedWard(page);
    await gotoSignaturesPage(page);

    await page.locator('[data-signature-state-group="planGuardians.0"] input[value="none"]').check();
    await page.waitForTimeout(200); // route re-render on change

    await page.evaluate(() => (window as any).navigate('/print'));
    await expect(page.locator('#print-doc-container .pdf-page').first()).toBeVisible({ timeout: 15000 });
    await expect(page.locator('.print-preview-banner')).toContainText('Ready to export');
  });

  test('"/s/" Signed selected but date blank blocks with the tri-state message', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Sig Typed Incomplete Ward', 'planSimplified');
    await fillMinimalValidPlanSimplifiedWard(page);
    await page.evaluate(() => { (window as any).D.planGuardians[0].signatureDate = ''; });
    await gotoSignaturesPage(page);

    await page.locator('[data-signature-state-group="planGuardians.0"] input[value="typed"]').check();
    await page.evaluate(() => (window as any).navigate('/print'));

    await expect(page.locator('body')).toContainText('date signed is required to apply "/s/" Signed', { timeout: 10000 });
    await expect(page.locator('#print-doc-container .pdf-page')).toHaveCount(0);
  });

  test('Signature Stamp: capture widget only mounts in Stamp state; drawing and applying persists an image and unblocks export', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Sig Stamp Ward', 'planSimplified');
    await fillMinimalValidPlanSimplifiedWard(page);
    await gotoSignaturesPage(page);

    // Not visible in the other two states.
    await expect(page.locator('.signature-pad')).toHaveCount(0);

    await page.locator('[data-signature-state-group="planGuardians.0"] input[value="stamp"]').check();
    await page.waitForTimeout(200);
    const pad = page.locator('.signature-pad');
    await expect(pad).toBeVisible();

    // Before applying anything, the filing is blocked on the stamp image.
    await page.evaluate(() => (window as any).navigate('/print'));
    await expect(page.locator('body')).toContainText('signature stamp image is required', { timeout: 10000 });
    await gotoSignaturesPage(page);

    // Draw something and apply it.
    const canvas = page.locator('.signature-pad-panel[data-sig-panel="draw"] canvas');
    const box = await canvas.boundingBox();
    if (!box) throw new Error('signature canvas not visible');
    await page.mouse.move(box.x + 20, box.y + 20);
    await page.mouse.down();
    await page.mouse.move(box.x + 150, box.y + 60, { steps: 10 });
    await page.mouse.up();
    await page.locator('[data-sig-action="apply"]').click();

    await expect.poll(() => page.evaluate(() => !!(window as any).D.planGuardians[0].signatureImage)).toBe(true);
    await expect(page.locator('.signature-stamp-preview img')).toBeVisible();

    await page.evaluate(() => (window as any).navigate('/print'));
    await expect(page.locator('#print-doc-container .pdf-page').first()).toBeVisible({ timeout: 15000 });
    await expect(page.locator('.print-preview-banner')).toContainText('Ready to export');

    // Not just "didn't throw" -- confirm pdf-engine.js's renderSignatureImage()
    // actually painted an image XObject onto the Signatures page, via
    // pdf.js's own operator list for the finalized bytes (independent of
    // the live preview's own canvas render).
    const paintedImage = await page.evaluate(async () => {
      const { buildPlanSimplifiedModel } = await import('/probate-guardian/src/features/plan-simplified/pdf-model.js');
      const { generateCourtFormPdf } = await import('/probate-guardian/src/core/pdf/pdf-engine.js');
      const { finalizeCourtFormPdf } = await import('/probate-guardian/src/core/pdf/pdf-finalizer.js');
      const { ensurePdfjs } = await import('/probate-guardian/src/core/pdf/pdfjs-loader.js');
      const model = buildPlanSimplifiedModel((window as any).D);
      const doc = await generateCourtFormPdf(model);
      const finalized = await finalizeCourtFormPdf(doc);
      const pdfjsLib = await ensurePdfjs();
      const pdfDoc = await pdfjsLib.getDocument({ data: finalized }).promise;
      for (let i = 1; i <= pdfDoc.numPages; i++) {
        const p = await pdfDoc.getPage(i);
        const opList = await p.getOperatorList();
        if (opList.fnArray.includes(pdfjsLib.OPS.paintImageXObject)) return true;
      }
      return false;
    });
    expect(paintedImage).toBe(true);
  });
});
