import { test, expect, type Page } from '@playwright/test';
import { freshStartNoPassword, createWard, fillMinimalValidPlanSimplifiedWard } from './support/target';

// Milestone 55A Option B -- the follow-up 55A's Decision explicitly deferred.
//
// 55A styled the FreeText ("Add Note") per-editor toolbar and deliberately left
// Highlight's alone, because the two are structurally different components in
// `lib/pdfjs/pdf.mjs`: FreeText uses `BasicColorPicker` (one native
// `<input type="color" class="basicColorPicker">`), Highlight uses `ColorPicker`
// (`<button class="colorPicker"><span class="swatch"></span></button>` that
// appends a `<div class="dropdown" role="listbox">` of swatch buttons INSIDE
// itself when clicked). A selector written for one does not reach the other,
// and 55A's "Note color"/"Delete note" labels would mislabel a highlight.
//
// The 2026-09-18 containment fix made Highlight's toolbar behave -- absolute,
// unscaled, no stray marks on the filing -- but explicitly not look like
// anything: no surface, no border, no shadow, an iconless delete button, no
// accessible names, and a dropdown with no rule for its own `.hidden` class
// (so choosing a color left the swatch list open on the page).
//
// This spec covers appearance, labelling and dropdown behaviour for Highlight,
// and guards that FreeText's own toolbar -- 55A's deliverable -- is untouched.

async function openPreview(page: Page) {
  await freshStartNoPassword(page);
  await createWard(page, 'Highlight Toolbar Ward', 'planSimplified');
  await fillMinimalValidPlanSimplifiedWard(page);
  await page.evaluate(() => (window as any).navigate('/print'));
  await page.locator('#print-doc-container .pdf-page').first().waitFor({ state: 'visible', timeout: 20000 });
}

const pageHeight = (page: Page) => page.evaluate(
  () => Math.round(document.querySelector('#print-doc-container .pdf-page')!.getBoundingClientRect().height),
);

/** Select a run of page text so pdf.js promotes it to a Highlight editor. */
async function highlightSomeText(page: Page) {
  await page.evaluate(() => {
    const span = [...document.querySelectorAll('#print-doc-container .textLayer span')]
      .find((s) => (s.textContent || '').trim().length > 4);
    if (!span) throw new Error('no text-layer span to highlight');
    const r = document.createRange();
    r.selectNodeContents(span);
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(r);
    span.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
  });
  // Milestone 59C-3 retained this one deliberately. PDF.js's highlight editor
  // is created asynchronously by its own annotation layer, which exposes no
  // event or DOM flag for "the editor you just caused now exists" -- callers
  // assert on .highlightEditor afterwards, but this helper cannot, because
  // some callers legitimately expect zero editors. Converting it means
  // reaching into PDF.js internals for a 6-test surface, which is 59C-2/PDF
  // territory rather than a wait replacement.
  await page.waitForTimeout(1200);
}

async function makeHighlight(page: Page) {
  await openPreview(page);
  await page.locator('[data-annotate-action="toggle"]').click();
  await page.locator('[data-annotate-action="highlight"]').click();
  // Retained (59C-3): entering highlight mode is PDF.js-internal and surfaces
  // no observable ready state. See the note in highlightSomeText().
  await page.waitForTimeout(400);
  await highlightSomeText(page);
  await expect(page.locator('.highlightEditor')).toHaveCount(1);
  await expect(page.locator('.highlightEditor .editToolbar')).toBeVisible();
}

/** Computed chrome of a toolbar, as a filer would perceive it. */
const chromeOf = (page: Page, selector: string) => page.evaluate((sel) => {
  const el = document.querySelector(sel);
  if (!el) return null;
  const cs = getComputedStyle(el);
  return {
    background: cs.backgroundColor,
    borderWidth: cs.borderTopWidth,
    borderStyle: cs.borderTopStyle,
    borderRadius: cs.borderTopLeftRadius,
    boxShadow: cs.boxShadow,
    position: cs.position,
    fontSize: parseFloat(cs.fontSize),
  };
}, selector);

test.describe('Milestone 55A Option B: Highlight editor toolbar', () => {
  test('the toolbar reads as application chrome, not an unstyled strip', async ({ page }) => {
    test.setTimeout(120_000);
    await makeHighlight(page);

    const chrome = await chromeOf(page, '.highlightEditor .editToolbar');
    expect(chrome, 'no Highlight toolbar rendered').not.toBeNull();
    // A transparent background is the unstyled state: the toolbar's controls
    // float directly over the court document with nothing separating them.
    expect(chrome!.background, 'toolbar must sit on its own surface').not.toBe('rgba(0, 0, 0, 0)');
    expect(chrome!.borderStyle, 'toolbar must have a visible edge').toBe('solid');
    expect(parseFloat(chrome!.borderWidth)).toBeGreaterThan(0);
    expect(parseFloat(chrome!.borderRadius)).toBeGreaterThan(0);
    expect(chrome!.boxShadow, 'toolbar must lift off the page').not.toBe('none');
    expect(chrome!.position).toBe('absolute');
    expect(chrome!.fontSize).toBeLessThan(30);
  });

  test('its controls are named for highlights, and delete is not a blank button', async ({ page }) => {
    test.setTimeout(120_000);
    await makeHighlight(page);

    const picker = page.locator('.highlightEditor .colorPicker');
    await expect(picker).toHaveAttribute('aria-label', 'Highlight color');
    await expect(picker).toHaveAttribute('title', 'Highlight color');

    const del = page.locator('.highlightEditor .deleteButton');
    await expect(del).toHaveAttribute('aria-label', 'Delete highlight');
    await expect(del).toHaveAttribute('title', 'Delete highlight');

    // pdf.mjs creates the delete button with no child content at all; without
    // decoration a filer sees an empty square where a trash icon belongs.
    const delContent = await del.evaluate((el) => ({
      svgs: el.querySelectorAll('svg').length,
      text: (el.textContent || '').trim(),
    }));
    expect(delContent.svgs > 0 || delContent.text.length > 0, 'delete button has no visible content').toBe(true);

    // 55A's FreeText wording must not have been reused on a highlight.
    const names = await page.evaluate(() => [...document.querySelectorAll('.highlightEditor .editToolbar [aria-label]')]
      .map((el) => el.getAttribute('aria-label') || ''));
    expect(names.some((n) => /note/i.test(n)), `highlight control labelled as a note: ${JSON.stringify(names)}`).toBe(false);

    // The button's swatch is the only thing that tells a filer which color is
    // active, so it has to actually render.
    const swatch = await page.locator('.highlightEditor .colorPicker > .swatch').evaluate((el) => {
      const r = el.getBoundingClientRect();
      return { w: Math.round(r.width), h: Math.round(r.height), bg: getComputedStyle(el).backgroundColor };
    });
    expect(swatch.w).toBeGreaterThanOrEqual(12);
    expect(swatch.h).toBeGreaterThanOrEqual(12);
    expect(swatch.bg).not.toBe('rgba(0, 0, 0, 0)');
  });

  test('the color dropdown opens over the page, names its colors, and closes again', async ({ page }) => {
    test.setTimeout(120_000);
    await makeHighlight(page);
    const before = await pageHeight(page);

    await page.locator('.highlightEditor .colorPicker').click();
    const dropdown = page.locator('.highlightEditor .colorPicker .dropdown');
    await expect(dropdown).toBeVisible();

    // pdf.mjs appends the dropdown INSIDE the toolbar button. Left in normal
    // flow it grows the toolbar and pushes the filing around.
    const dd = await dropdown.evaluate((el) => {
      const cs = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return { position: cs.position, background: cs.backgroundColor, h: Math.round(r.height) };
    });
    expect(dd.position, 'an in-flow dropdown resizes the toolbar').toBe('absolute');
    expect(dd.background, 'the swatch list must have its own surface').not.toBe('rgba(0, 0, 0, 0)');
    expect(await pageHeight(page), 'opening the dropdown must not resize the page').toBe(before);

    const options = page.locator('.highlightEditor .colorPicker .dropdown button');
    await expect(options).toHaveCount(5);
    const labels = await options.evaluateAll((els) => els.map((el) => el.getAttribute('aria-label') || ''));
    expect(labels).toEqual(['Yellow', 'Green', 'Blue', 'Pink', 'Red']);

    const tooSmall = await options.evaluateAll((els) => els
      .map((el) => el.getBoundingClientRect())
      .filter((r) => r.width < 12 || r.height < 12).length);
    expect(tooSmall, 'a color option rendered as a sliver').toBe(0);

    const fillBefore = await page.locator('#print-doc-container svg.highlight').first()
      .evaluate((el) => getComputedStyle(el).fill);

    await options.nth(1).click(); // Green
    // Milestone 59C-3: wait for the repaint this test is asserting, rather
    // than sleeping 400ms and assuming it landed. The assertion below is kept
    // unchanged for its failure message.
    await expect
      .poll(() => page.locator('#print-doc-container svg.highlight').first()
        .evaluate((el) => getComputedStyle(el).fill))
      .not.toBe(fillBefore);

    const fillAfter = await page.locator('#print-doc-container svg.highlight').first()
      .evaluate((el) => getComputedStyle(el).fill);
    expect(fillAfter, 'choosing a color did not repaint the highlight').not.toBe(fillBefore);

    // hideDropdown() only adds a `hidden` class; without a rule for it the
    // swatch list stays open on top of the filing.
    await page.locator('.highlightEditor .colorPicker').click();
    await expect(dropdown).toBeHidden();
  });

  test('Add Note keeps its own 55A toolbar and wording', async ({ page }) => {
    test.setTimeout(120_000);
    await openPreview(page);
    const pdfPage = page.locator('#print-doc-container .pdf-page').first();
    await page.locator('[data-annotate-action="toggle"]').click();
    const noteBtn = page.locator('[data-annotate-action="note"]');

    // A FreeText toolbar exists only while its editor is SELECTED, and a
    // just-placed editor is in editing mode, not selected. This is
    // pdf-annotate.spec.ts's own established recipe: place, type, toggle the
    // mode off to commit, toggle it back on, then click the editor.
    await noteBtn.click();
    await pdfPage.click({ position: { x: 80, y: 80 } });
    await page.keyboard.type('Guard check');
    await noteBtn.click();
    const note = pdfPage.locator('.freeTextEditor').first();
    await expect(note).toHaveCount(1);
    await noteBtn.click();
    const noteBox = (await note.boundingBox())!;
    await page.mouse.click(noteBox.x + noteBox.width / 2, noteBox.y + noteBox.height / 2);
    await expect(note).toHaveClass(/selectedEditor/);

    await expect(page.locator('.freeTextEditor .basicColorPicker')).toHaveAttribute('aria-label', 'Note color');
    await expect(page.locator('.freeTextEditor .deleteButton')).toHaveAttribute('aria-label', 'Delete note');

    const chrome = await chromeOf(page, '.freeTextEditor .editToolbar');
    expect(chrome!.position).toBe('absolute');
    expect(chrome!.background).not.toBe('rgba(0, 0, 0, 0)');
    expect(chrome!.borderStyle).toBe('solid');
    expect(chrome!.fontSize).toBeLessThan(30);
  });
});
