import { test, expect, type Page } from '@playwright/test';
import { freshStartNoPassword, createWard, fillMinimalValidPlanSimplifiedWard } from './support/target';

// The per-editor toolbar pdf.js creates for a selected annotation is
// application chrome. It must never take up layout space in the rendered
// filing, and it must never render its controls as stray marks across the
// page.
//
// REPORTED DEFECT (2026-09-18). Selecting a Highlight left a thin dash on the
// page and extended the page by roughly 450px of empty space below it. The
// cause was that `src/styles/print.css` carries a deliberately scoped-down
// copy of the upstream annotation-editor styles which omits the per-editor
// toolbar rules entirely. Milestone 55A restored them for the FreeText editor
// only -- an explicit scope decision at the time, because the defect then
// reported was FreeText-only -- so Highlight's toolbar still rendered with
// position:static (hence the page growth), font-size:150px inherited from the
// scaled annotation layer, and unstyled 16x6 empty buttons (hence the dashes).
//
// Measured before the fix, on a selected highlight:
//   .editToolbar  position:static  388x450  font-size:150px  display:block
//   button.colorPicker      16x6   y=607   empty
//   div.divider            388x0   y=661
//   button.deleteButton     16x6   y=832   empty
//
// This spec asserts the CONTAINMENT CONTRACT generically, for whichever editor
// type is exercised, because the omission was never specific to one of them.
// That is the whole point: a third editor type must not be able to reintroduce
// this a third time.

async function openPreview(page: Page) {
  await freshStartNoPassword(page);
  await createWard(page, 'Toolbar Containment Ward', 'planSimplified');
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
  await page.waitForTimeout(1200);
}

test.describe('annotation editor toolbars stay contained (reported 2026-09-18)', () => {
  test('a selected Highlight does not extend the page or leave marks on it', async ({ page }) => {
    test.setTimeout(120_000);
    await openPreview(page);
    const before = await pageHeight(page);

    await page.locator('[data-annotate-action="toggle"]').click();
    await page.locator('[data-annotate-action="highlight"]').click();
    await page.waitForTimeout(400);
    await highlightSomeText(page);

    await expect(page.locator('.highlightEditor')).toHaveCount(1);

    // The symptom the filer actually saw: 450px of empty page below the
    // content, because a static-positioned toolbar occupies layout space.
    const after = await pageHeight(page);
    expect(after, `page grew ${after - before}px when a highlight was selected`).toBe(before);

    const highlightToolbar = page.locator('.highlightEditor .editToolbar');
    await expect(highlightToolbar).toBeVisible();
    await expect(highlightToolbar.locator('.colorPicker')).toBeVisible();
    await expect(highlightToolbar.locator('.deleteButton')).toBeVisible();

    const toolbar = await highlightToolbar.evaluate((tb) => {
      const r = tb.getBoundingClientRect();
      const cs = getComputedStyle(tb);
      return { h: Math.round(r.height), position: cs.position, fontSize: parseFloat(cs.fontSize) };
    });
    expect(toolbar.position, 'a static toolbar takes up page layout').toBe('absolute');
    expect(toolbar.h, 'toolbar is chrome, not a 450px block').toBeLessThan(80);
    expect(toolbar.fontSize, 'must not inherit the scaled annotation-layer font').toBeLessThan(30);
  });

  test('no annotation control renders as a stray sliver over the filing', async ({ page }) => {
    test.setTimeout(120_000);
    await openPreview(page);
    await page.locator('[data-annotate-action="toggle"]').click();
    await page.locator('[data-annotate-action="highlight"]').click();
    await page.waitForTimeout(400);
    await highlightSomeText(page);

    const highlightToolbar = page.locator('.highlightEditor .editToolbar');
    await expect(highlightToolbar).toBeVisible();
    await expect(highlightToolbar.locator('.colorPicker')).toBeVisible();
    await expect(highlightToolbar.locator('.deleteButton')).toBeVisible();

    const controls = await page.locator('.highlightEditor .editToolbar button, .highlightEditor .editToolbar input').all();
    expect(controls.length, 'expected toolbar controls to be present').toBeGreaterThanOrEqual(2);

    // The dashes were empty 16x6 buttons. Any visible control in an editor
    // toolbar should be a real, clickable size -- nothing that reads as a
    // mark on the court document.
    const slivers = await page.evaluate(() => {
      const out: Array<{ cls: string; w: number; h: number }> = [];
      for (const c of document.querySelectorAll('.editToolbar button, .editToolbar input')) {
        const r = c.getBoundingClientRect();
        if (r.width === 0 && r.height === 0) continue; // genuinely hidden is fine
        if (r.height < 12 || r.width < 12) out.push({ cls: (c.className || '').toString(), w: Math.round(r.width), h: Math.round(r.height) });
      }
      return out;
    });
    expect(slivers, `controls rendering as slivers: ${JSON.stringify(slivers)}`).toEqual([]);
  });

  test('FreeText stays correct -- the generic rules must not regress Milestone 55A', async ({ page }) => {
    test.setTimeout(120_000);
    await openPreview(page);
    const pdfPage = page.locator('#print-doc-container .pdf-page').first();
    await page.locator('[data-annotate-action="toggle"]').click();
    const before = await pageHeight(page);

    const noteBtn = page.locator('[data-annotate-action="note"]');
    await noteBtn.click();
    await pdfPage.click({ position: { x: 80, y: 80 } });
    await page.keyboard.type('FreeText containment note');
    await noteBtn.click(); // commit note
    const note = pdfPage.locator('.freeTextEditor').first();
    await expect(note).toHaveCount(1);
    await noteBtn.click(); // re-enable mode
    const noteBox = (await note.boundingBox())!;
    await page.mouse.click(noteBox.x + noteBox.width / 2, noteBox.y + noteBox.height / 2);
    await expect(note).toHaveClass(/selectedEditor/);

    expect(await pageHeight(page), 'adding a note must not resize the page').toBe(before);

    const freeTextToolbar = page.locator('.freeTextEditor .editToolbar');
    await expect(freeTextToolbar).toBeVisible();
    await expect(freeTextToolbar.locator('input.basicColorPicker')).toBeVisible();
    await expect(freeTextToolbar.locator('.deleteButton')).toBeVisible();

    const tb = await freeTextToolbar.evaluate((el) => {
      const cs = getComputedStyle(el);
      return { position: cs.position, display: cs.display, fontSize: parseFloat(cs.fontSize) };
    });
    expect(tb.position).toBe('absolute');
    expect(tb.fontSize).toBeLessThan(30);
  });
});
