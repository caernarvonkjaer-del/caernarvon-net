import { test, expect } from '@playwright/test';
import {
  freshStartNoPassword, createWard, createSimplifiedWard,
  fillMinimalValidPlanSimplifiedWard, fillMinimalValidGuardianWard,
  fillMinimalValidSimplifiedWard, fillMinimalValidAnnualWard,
  fillMinimalValidPlanAnnualWard, fillMinimalValidPlanInitialWard,
  fillMinimalValidPlanMinorWard, acceptDynDialog,
} from './support/target';

// Milestone 39-A spike: pdf.js AnnotationEditorLayer integration on Print
// Preview (src/core/pdf/pdf-annotate.js, src/core/pdf/pdf-preview.js).
// Covers the toolbar's own behavior and the "Persistence design" section's
// fingerprint/drift/reapply mechanism.
//
// Milestone 45B: no longer a Plan Simplified pilot -- annotation is rolled
// out to all nine filing keys (eight hosts; annual/final/trust share one).
// The toolbar-behavior tests below still drive Plan Simplified because it
// is the smallest and fastest to render, not because it is the only type
// that has the toolbar -- the ANNOTATED_TYPES loop covers that.

test.describe('Print Preview annotation (Milestone 39-A mechanism, 45B rollout)', () => {
  // Milestone 45B: this used to assert the toolbar was absent everywhere
  // except the Plan Simplified pilot. That gate was the pilot's, not the
  // end state -- 45B's breadth decision (all eight filing types) supersedes
  // 39-A's Non-Goal #3, which scoped the pilot rather than the outcome. The
  // test is inverted rather than deleted: the thing worth guarding now is
  // that every type actually mounts it, which is also what would catch a
  // host being missed or regressing back to no options object.
  const ANNOTATED_TYPES: Array<{ name: string; setup: (page: any) => Promise<void> }> = [
    { name: 'planSimplified', setup: async (page) => { await createWard(page, 'Ann PS', 'planSimplified'); await fillMinimalValidPlanSimplifiedWard(page); } },
    { name: 'planMinor', setup: async (page) => { await createWard(page, 'Ann PM', 'planMinor'); await fillMinimalValidPlanMinorWard(page); } },
    { name: 'planInitial', setup: async (page) => { await createWard(page, 'Ann PI', 'planInitial'); await fillMinimalValidPlanInitialWard(page); } },
    { name: 'planAnnual', setup: async (page) => { await createWard(page, 'Ann PA', 'planAnnual'); await fillMinimalValidPlanAnnualWard(page); } },
    { name: 'simplified', setup: async (page) => { await createSimplifiedWard(page, 'Ann SA'); await fillMinimalValidSimplifiedWard(page); } },
    { name: 'annual', setup: async (page) => { await createWard(page, 'Ann AA', 'annual'); await fillMinimalValidAnnualWard(page); } },
    { name: 'finalAccounting', setup: async (page) => { await createWard(page, 'Ann FA', 'finalAccounting'); await fillMinimalValidAnnualWard(page); } },
    { name: 'trustAccounting', setup: async (page) => { await createWard(page, 'Ann TA', 'trustAccounting'); await fillMinimalValidAnnualWard(page); } },
    { name: 'guardian', setup: async (page) => { await createWard(page, 'Ann GI', 'guardian'); await fillMinimalValidGuardianWard(page); } },
  ];

  for (const type of ANNOTATED_TYPES) {
    test(`${type.name}: Print Preview mounts the annotate toolbar (Milestone 45B rollout)`, async ({ page }) => {
      await freshStartNoPassword(page);
      await type.setup(page);
      await page.evaluate(() => (window as any).navigate('/print'));
      await page.locator('#print-doc-container .pdf-page').first().waitFor({ state: 'visible', timeout: 20000 });
      await expect(page.locator('[data-annotate-action="toggle"]')).toHaveCount(1);
      // Non-Goal #2 still holds for every type it rolls out to: the toolbar
      // must never write into validated form data.
      expect(await page.evaluate(() => JSON.stringify((window as any).D).includes('freeTextEditor'))).toBe(false);
    });
  }

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

  // AnnotationEditorUIManager's viewParameters.realScale defaults to
  // PixelsPerInch.PDF_TO_CSS_UNITS (~1.333, pdf.mjs:2742) and is only ever
  // updated from a "scalechanging" event a full PDFViewer would dispatch --
  // this integration has no such viewer and never fired one, so every new
  // editor's click position was normalized against a canvas ~12% narrower
  // than the one actually on screen (1.5, renderPagesInto()'s hardcoded
  // scale), throwing placement off everywhere except very near the origin.
  // Regression pin: click deep in the bottom-right quadrant and require the
  // new editor to land there too, not pulled toward the top-left corner.
  test('Add Note places the new FreeText editor near the clicked position, not pinned to a corner', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Annotate Position Ward', 'planSimplified');
    await fillMinimalValidPlanSimplifiedWard(page);
    await page.evaluate(() => (window as any).navigate('/print'));
    const pdfPage = page.locator('#print-doc-container .pdf-page').first();
    await pdfPage.waitFor({ state: 'visible', timeout: 15000 });

    await page.locator('[data-annotate-action="toggle"]').click();
    await page.locator('[data-annotate-action="note"]').click();

    const preClickBox = (await pdfPage.boundingBox())!;
    const clickX = preClickBox.width * 0.75;
    const clickY = preClickBox.height * 0.8;
    await pdfPage.click({ position: { x: clickX, y: clickY } });

    // Re-measure the page's box after the click: Playwright auto-scrolls the
    // target into view for a click on a page taller than the viewport, so a
    // box captured beforehand can already be stale by the time the editor
    // exists -- comparing against it would compare two different scroll
    // positions and misreport a correctly-placed editor as mislocated.
    const pageBox = (await pdfPage.boundingBox())!;
    const editorBox = (await pdfPage.locator('.freeTextEditor').boundingBox())!;
    const editorCenterX = editorBox.x - pageBox.x + editorBox.width / 2;
    const editorCenterY = editorBox.y - pageBox.y + editorBox.height / 2;
    expect(editorCenterX).toBeGreaterThan(pageBox.width * 0.5);
    expect(editorCenterY).toBeGreaterThan(pageBox.height * 0.5);
  });

  // Two real, independent bugs made Highlight mode a complete no-op, found
  // by tracing why a selection never turned into a rendered highlight:
  //
  // 1. AnnotationEditorLayer was constructed with textLayer: null always
  //    (pdf-annotate.js's addPage()), which makes enableTextSelection() a
  //    silent no-op (pdf.mjs:27048-27057 guards its whole body on
  //    this.#textLayer?.div) -- no pointerdown listener was ever attached
  //    to any text layer. Fixed by passing { div: textLayerDiv }.
  // 2. Even with a real selection reaching highlightSelection(), it was
  //    constructed with drawLayer: null. HighlightEditor extends
  //    DrawingEditor, whose _addOutlines() unconditionally calls
  //    parent.drawLayer.draw(...) (pdf.mjs:21965/21973) to render the
  //    highlight as an SVG path -- confirmed live to throw "Cannot read
  //    properties of null (reading 'draw')", uncaught, for every single
  //    highlight. Fixed by constructing and wiring a real pdfjsLib.DrawLayer
  //    (see pdf-annotate.js's addPage()).
  //
  // A third, adjacent bug surfaced once the above two let a highlight
  // actually get as far as being added to the page: highlightColors was
  // also passed null, and getNonHCMColorName() (pdf.mjs:2841, called from
  // every new Highlight editor's telemetry hook) has no null guard the way
  // its neighbor getNonHCMColor() does -- confirmed live to throw
  // uncaught right after the highlight was otherwise created successfully.
  // Fixed by passing pdf.js's own default highlight color palette string.
  //
  // Playwright's synthetic mouse drag does not reliably produce a native
  // browser text selection across pdf.js's absolutely-positioned per-line
  // text-layer spans (confirmed empirically: document.getSelection() stayed
  // empty through an identical drag sequence even after all three fixes
  // above landed) -- a Playwright/CDP input-simulation limitation, not
  // something in this app's code to fix. A programmatic Selection, which
  // triggers the exact same "selectionchange" -> highlightSelection() path
  // pdf.js's own UIManager listens for, is what a real user's mouse drag
  // reaches, and is the standard way to test Selection-driven behavior
  // under browser automation.
  test('Highlight mode creates a highlight editor from a real text selection', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));

    await freshStartNoPassword(page);
    await createWard(page, 'Annotate Real Highlight Ward', 'planSimplified');
    await fillMinimalValidPlanSimplifiedWard(page);
    await page.evaluate(() => (window as any).navigate('/print'));
    const pdfPage = page.locator('#print-doc-container .pdf-page').first();
    await pdfPage.waitFor({ state: 'visible', timeout: 15000 });

    await page.locator('[data-annotate-action="toggle"]').click();
    await page.locator('[data-annotate-action="highlight"]').click();

    const textSpan = pdfPage.locator('.textLayer span').first();
    await textSpan.waitFor({ state: 'attached' });
    const selection = await page.evaluate(() => {
      const span = document.querySelector('.textLayer span') as HTMLElement;
      const textNode = span.firstChild;
      if (!textNode) return null;
      const range = document.createRange();
      range.selectNodeContents(textNode);
      const sel = window.getSelection()!;
      sel.removeAllRanges();
      sel.addRange(range);
      return sel.toString();
    });
    expect(selection).toBeTruthy();

    await expect(pdfPage.locator('.highlightEditor')).toHaveCount(1);
    expect(errors, `page errors: ${errors.join('\n')}`).toEqual([]);

    // Milestone 50D. The DrawLayer-authored svg.highlight/svg.highlightOutline
    // elements (siblings of .highlightEditor, appended directly under
    // .pdf-page) were missing from print.css's scoped-down pdf_viewer.css
    // port entirely -- confirmed live, the highlight itself rendered the
    // correct yellow, but the selection outline drawn on top of it had no
    // fill and fell back to opaque black, and even the correct yellow
    // painted mix-blend-mode:normal (an opaque block) instead of upstream's
    // multiply (a tint). The selection this test just made leaves the
    // highlight selected, which is the exact state that triggered both.
    const svgs = await page.evaluate(() => {
      const host = document.querySelector('#print-doc-container .pdf-page')!;
      return [...host.querySelectorAll('svg')].map((s) => ({
        cls: s.getAttribute('class') || '',
        fill: getComputedStyle(s).fill,
        blend: getComputedStyle(s).mixBlendMode,
      }));
    });
    const highlight = svgs.find((s) => s.cls.split(' ').includes('highlight'));
    expect(highlight, 'the highlight svg itself must be present').toBeTruthy();
    expect(highlight!.fill).toBe('rgb(255, 255, 152)'); // the palette's default yellow, #FFFF98
    expect(highlight!.blend).toBe('multiply'); // tints the text underneath rather than covering it
    // No SVG inside .pdf-page may compute an opaque black fill -- worded to
    // catch any future missing-rule regression of this same shape, not just
    // this one element (the black shape was specifically the unfilled
    // highlightOutline falling back to the SVG default, not a color choice
    // anyone made on purpose).
    for (const svg of svgs) {
      expect(svg.fill, `svg.${svg.cls} must not fall back to opaque black`).not.toBe('rgb(0, 0, 0)');
    }
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

    await page.locator('[data-annotate-action="clear"]').click();
    await acceptDynDialog(page);
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
    // Milestone 43E: >0 is a transport-only check (satisfied by a single
    // stray byte) -- the real content proof is the getAnnotations() re-parse
    // below, but a multi-page court form's base64 bytes are realistically
    // tens of KB at minimum, so this floor catches a truncated/near-empty
    // save well before that slower re-parse would.
    expect(stored.pdfBytes.length).toBeGreaterThan(10000);
    expect(typeof stored.contentFingerprint).toBe('string');
    // Milestone 45A: stored bytes are gzipped before base64 encoding.
    expect(stored.encoding).toBe('gzip');

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
      const raw = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) raw[i] = binary.charCodeAt(i);
      // Milestone 45A: stored bytes are gzipped, so this read path has to
      // inflate before parsing -- exactly what pdf-preview.js's own reader
      // now does.
      const stream = new Blob([raw]).stream().pipeThrough(new DecompressionStream('gzip'));
      const bytes = new Uint8Array(await new Response(stream).arrayBuffer());
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

// Milestone 45A: the storage/compression pass 39-A's own "Persistence
// design" asked for before any wider rollout. Its flagged concern was that
// storing the whole annotated PDF "roughly doubles what a Print Preview
// save adds to the .sav file" -- measured on the smallest filing type, and
// due once annotation broadened past it.
//
// The measurement refuted the assumption that drafted the fix: a
// maximally-filled Annual Accounting's annotated PDF is 269,008 raw bytes /
// 358,680 base64'd, but only 60,282 gzipped / 83,888 base64'd -- a ~77%
// reduction, not the "few percent" expected of an already-compressed
// format. jsPDF does not compress its content streams by default. The .sav's
// own zip layer cannot recover any of this, because filing data is
// encrypted (high-entropy) before being zipped, so compressing here is the
// only place the saving is still available.
test.describe('Milestone 45A: annotation storage compression', () => {
  test('stored annotation bytes are gzipped, materially smaller than the raw PDF, and still round-trip', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Annotate Compress Ward', 'planSimplified');
    await fillMinimalValidPlanSimplifiedWard(page);
    await page.evaluate(() => (window as any).navigate('/print'));
    const pdfPage = page.locator('#print-doc-container .pdf-page').first();
    await pdfPage.waitFor({ state: 'visible', timeout: 15000 });

    await page.locator('[data-annotate-action="toggle"]').click();
    await page.locator('[data-annotate-action="note"]').click();
    await pdfPage.click({ position: { x: 60, y: 60 } });
    await page.keyboard.type('Compression check');
    await pdfPage.click({ position: { x: 300, y: 300 } });

    const downloadPromise = page.waitForEvent('download', { timeout: 10000 });
    await page.locator('[data-annotate-action="save"]').click();
    await downloadPromise;

    const sizes = await page.evaluate(async () => {
      const stored = (window as any).D.printAnnotations;
      const binary = atob(stored.pdfBytes);
      const raw = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) raw[i] = binary.charCodeAt(i);
      const stream = new Blob([raw]).stream().pipeThrough(new DecompressionStream('gzip'));
      const inflated = new Uint8Array(await new Response(stream).arrayBuffer());
      return { encoding: stored.encoding, storedBase64: stored.pdfBytes.length, inflatedBytes: inflated.length };
    });

    expect(sizes.encoding).toBe('gzip');
    // The inflated PDF must be substantially larger than what we stored --
    // i.e. compression actually did something, rather than the marker being
    // set on uncompressed bytes.
    expect(sizes.inflatedBytes).toBeGreaterThan(sizes.storedBase64);

    // And the round trip still renders: reopening shows the annotation
    // baked in, with no drift-discard announcement.
    await page.evaluate(() => (window as any).navigate('/'));
    await page.evaluate(() => (window as any).navigate('/print'));
    await page.locator('#print-doc-container .pdf-page').first().waitFor({ state: 'visible', timeout: 15000 });
    expect(await page.evaluate(() => !!(window as any).D.printAnnotations)).toBe(true);
  });

  test('an annotation saved by the 39-A pilot (raw base64, no encoding marker) still loads', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Annotate Legacy Ward', 'planSimplified');
    await fillMinimalValidPlanSimplifiedWard(page);
    await page.evaluate(() => (window as any).navigate('/print'));
    const pdfPage = page.locator('#print-doc-container .pdf-page').first();
    await pdfPage.waitFor({ state: 'visible', timeout: 15000 });

    await page.locator('[data-annotate-action="toggle"]').click();
    await page.locator('[data-annotate-action="note"]').click();
    await pdfPage.click({ position: { x: 60, y: 60 } });
    await page.keyboard.type('Legacy shape');
    await pdfPage.click({ position: { x: 300, y: 300 } });
    const downloadPromise = page.waitForEvent('download', { timeout: 10000 });
    await page.locator('[data-annotate-action="save"]').click();
    await downloadPromise;

    // Rewrite the stored entry into the exact shape the 39-A pilot wrote:
    // raw (uncompressed) base64 and no `encoding` field at all.
    await page.evaluate(async () => {
      const D = (window as any).D;
      const binary = atob(D.printAnnotations.pdfBytes);
      const raw = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) raw[i] = binary.charCodeAt(i);
      const stream = new Blob([raw]).stream().pipeThrough(new DecompressionStream('gzip'));
      const inflated = new Uint8Array(await new Response(stream).arrayBuffer());
      let bin = '';
      for (let i = 0; i < inflated.length; i += 0x8000) bin += String.fromCharCode(...inflated.subarray(i, i + 0x8000));
      D.printAnnotations = {
        pdfBytes: btoa(bin),
        contentFingerprint: D.printAnnotations.contentFingerprint,
        capturedAt: D.printAnnotations.capturedAt,
      };
      (window as any).autoSave?.();
    });

    // Reopening must still reapply it -- not discard it as drift, and not
    // throw trying to gunzip bytes that were never gzipped.
    await page.evaluate(() => (window as any).navigate('/'));
    await page.evaluate(() => (window as any).navigate('/print'));
    await page.locator('#print-doc-container .pdf-page').first().waitFor({ state: 'visible', timeout: 15000 });
    const after = await page.evaluate(() => (window as any).D.printAnnotations);
    expect(after).toBeTruthy();
    expect(after.encoding).toBeUndefined();
  });
});
