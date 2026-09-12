import { test, expect } from '@playwright/test';
import {
  freshStartNoPassword, createWard,
  fillMinimalValidPlanSimplifiedWard, fillMinimalValidGuardianWard,
} from './support/target';

// Milestone 39-A spike: pdf.js AnnotationEditorLayer integration on Print
// Preview, piloted on Plan Simplified only (src/core/pdf/pdf-annotate.js,
// src/core/pdf/pdf-preview.js). Covers the toolbar's own behavior and the
// "Persistence design" section's fingerprint/drift/reapply mechanism --
// not a full rollout, since 39-C/39-D/39-E extend this to every other
// filing type and to reusable stamps.

test.describe('Milestone 39-A: Print Preview annotation (pilot: Plan Simplified)', () => {
  test('the annotate toolbar is gated to the pilot type only', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Annotate Gate Ward', 'guardian');
    await fillMinimalValidGuardianWard(page);
    await page.evaluate(() => (window as any).navigate('/print'));
    await page.locator('#print-doc-container .pdf-page').first().waitFor({ state: 'visible', timeout: 15000 });
    await expect(page.locator('[data-annotate-action="toggle"]')).toHaveCount(0);
  });

  test('toggle reveals the sub-toolbar; Add Note creates an editable FreeText editor; Undo removes it', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));

    await freshStartNoPassword(page);
    await createWard(page, 'Annotate Note Ward', 'planSimplified');
    await fillMinimalValidPlanSimplifiedWard(page);
    await page.evaluate(() => (window as any).navigate('/print'));
    const pdfPage = page.locator('#print-doc-container .pdf-page').first();
    await pdfPage.waitFor({ state: 'visible', timeout: 15000 });

    const toggle = page.locator('[data-annotate-action="toggle"]');
    await expect(toggle).toBeVisible();
    const noteBtn = page.locator('[data-annotate-action="note"]');
    await expect(noteBtn).toBeHidden();
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-pressed', 'true');
    await expect(noteBtn).toBeVisible();

    await noteBtn.click();
    await expect(noteBtn).toHaveAttribute('aria-pressed', 'true');
    // Clicking the page surface while in FreeText mode is what pdf.js's own
    // editor uses to place a new editor at that point.
    await pdfPage.click({ position: { x: 60, y: 60 } });
    await expect(pdfPage.locator('.freeTextEditor')).toHaveCount(1);

    await page.locator('[data-annotate-action="undo"]').click();
    await expect(pdfPage.locator('.freeTextEditor')).toHaveCount(0);

    expect(errors, `page errors: ${errors.join('\n')}`).toEqual([]);
  });

  test('Highlight mode is selectable and mutually exclusive with Add Note', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Annotate Highlight Ward', 'planSimplified');
    await fillMinimalValidPlanSimplifiedWard(page);
    await page.evaluate(() => (window as any).navigate('/print'));
    await page.locator('#print-doc-container .pdf-page').first().waitFor({ state: 'visible', timeout: 15000 });

    await page.locator('[data-annotate-action="toggle"]').click();
    const noteBtn = page.locator('[data-annotate-action="note"]');
    const highlightBtn = page.locator('[data-annotate-action="highlight"]');
    await noteBtn.click();
    await expect(noteBtn).toHaveAttribute('aria-pressed', 'true');
    await highlightBtn.click();
    await expect(highlightBtn).toHaveAttribute('aria-pressed', 'true');
    await expect(noteBtn).toHaveAttribute('aria-pressed', 'false');
  });

  test('Clear Annotations removes every editor, and the toolbar never enters validated form data', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Annotate Clear Ward', 'planSimplified');
    await fillMinimalValidPlanSimplifiedWard(page);
    await page.evaluate(() => (window as any).navigate('/print'));
    const pdfPage = page.locator('#print-doc-container .pdf-page').first();
    await pdfPage.waitFor({ state: 'visible', timeout: 15000 });

    await page.locator('[data-annotate-action="toggle"]').click();
    const noteBtn = page.locator('[data-annotate-action="note"]');
    // A FreeText editor left empty is discarded once it loses focus (real
    // pdf.js behavior, confirmed empirically) -- each note needs content
    // typed, then the tool re-armed (not just clicked elsewhere, which
    // would place a third empty editor at that point since FreeText mode
    // stays active) before the next click creates a genuinely separate one.
    await noteBtn.click();
    await pdfPage.click({ position: { x: 60, y: 60 } });
    await page.keyboard.type('First note');
    await noteBtn.click(); // off (commits the editor, mode -> NONE)
    await noteBtn.click(); // back on for the second note
    await pdfPage.click({ position: { x: 60, y: 120 } });
    await page.keyboard.type('Second note');
    await noteBtn.click(); // off again
    await expect(pdfPage.locator('.freeTextEditor')).toHaveCount(2);

    page.once('dialog', (d) => d.accept());
    await page.locator('[data-annotate-action="clear"]').click();
    await expect(pdfPage.locator('.freeTextEditor')).toHaveCount(0);

    // Non-Goal #2: annotations never merge into any validated answer.
    const hasFieldLeak = await page.evaluate(() => JSON.stringify((window as any).D).includes('freeTextEditor'));
    expect(hasFieldLeak).toBe(false);
  });

  test('Save Annotated PDF downloads a PDF and persists printAnnotations on the filing; reopening the preview reapplies it', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Annotate Persist Ward', 'planSimplified');
    await fillMinimalValidPlanSimplifiedWard(page);
    await page.evaluate(() => (window as any).navigate('/print'));
    const pdfPage = page.locator('#print-doc-container .pdf-page').first();
    await pdfPage.waitFor({ state: 'visible', timeout: 15000 });

    await page.locator('[data-annotate-action="toggle"]').click();
    await page.locator('[data-annotate-action="note"]').click();
    await pdfPage.click({ position: { x: 60, y: 60 } });
    await page.keyboard.type('Ask the judge about X');
    // Commit the FreeText editor (click elsewhere on the layer, out of the
    // editor) before saving -- an editor still in its editing state may not
    // be flushed into annotationStorage yet.
    await pdfPage.click({ position: { x: 300, y: 300 } });

    const downloadPromise = page.waitForEvent('download', { timeout: 10000 });
    await page.locator('[data-annotate-action="save"]').click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.pdf$/i);

    const stored = await page.evaluate(() => (window as any).D.printAnnotations);
    expect(stored).toBeTruthy();
    expect(typeof stored.pdfBytes).toBe('string');
    expect(stored.pdfBytes.length).toBeGreaterThan(0);
    expect(typeof stored.contentFingerprint).toBe('string');

    // Reopen the preview fresh (simulates closing and reopening Print
    // Preview in the same session) -- the "Persistence design" round trip.
    await page.evaluate(() => (window as any).navigate('/'));
    await page.evaluate(() => (window as any).navigate('/print'));
    await page.locator('#print-doc-container .pdf-page').first().waitFor({ state: 'visible', timeout: 15000 });

    // 39-A's own "Persistence design" flags an unresolved question: does a
    // reopened, previously-annotated PDF rehydrate as a live, editable
    // AnnotationEditorLayer editor, or only as baked-in page content? No
    // .freeTextEditor DOM node appears without the user re-drawing anything
    // -- confirmed empirically, not assumed.
    expect(await page.locator('.freeTextEditor').count()).toBe(0);

    // But the annotation itself: did it survive at all, just not as a live
    // editor? Independently re-parse the *stored* bytes (not the live
    // mounted document) via page.getAnnotations() -- pdf.js's real-annotation
    // read path, separate from the editor layer entirely -- to check whether
    // saveDocument() actually baked a real, parseable FreeText annotation
    // into the file, or whether the mark was lost outright.
    const storedAnnotationCheck = await page.evaluate(async () => {
      const D = (window as any).D;
      const { ensurePdfjs } = await import('/probate-guardian/src/core/pdf/pdfjs-loader.js');
      const pdfjsLib = await ensurePdfjs();
      const binary = atob(D.printAnnotations.pdfBytes);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      const doc = await pdfjsLib.getDocument({ data: bytes }).promise;
      const page1 = await doc.getPage(1);
      const annotations = await page1.getAnnotations({ intent: 'display' });
      return annotations.map((a: any) => ({ subtype: a.subtype, contents: a.contents ?? a.titleObj?.str ?? null }));
    });
    // eslint-disable-next-line no-console
    console.log('39-A spike finding: real annotations parsed back out of the stored bytes =', JSON.stringify(storedAnnotationCheck));
    expect(storedAnnotationCheck.some((a: any) => a.subtype === 'FreeText')).toBe(true);
  });
});
