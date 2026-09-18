import { test, expect, type Page } from '@playwright/test';
import { freshStartNoPassword, createSimplifiedWard, fillMinimalValidSimplifiedWard } from './support/target';

// REPORTED DEFECT (2026-09-18), with a screenshot of Simplified Annual
// Accounting's Part IV: a guardian's address ran past the right margin of the
// court document and printed on top of its own label --
// "Residence Addre[ss]88 Snell Isle Blvd NE, St. Petersburg, FL 33704".
//
// src/core/pdf/pdf-engine.js's `signature-block` renderer has two layouts. The
// `fields` grid was given comma-aware wrapping bounded by its column; the
// legacy `details` stack was not. An earlier fix therefore appeared to resolve
// this while leaving every filing type that prints a guardian address through
// `details` still broken -- annual, final and trust accounting (all three
// share annual-accounting/pdf-model.js) plus simplified accounting.
//
// Two separate causes, and this spec has a case for each, because fixing only
// one still leaves a defective filing:
//   * the value was drawn at a hardcoded 60pt to the right of its label, and
//     "Residence Address: " is about 74pt wide at 7.5pt bold;
//   * the value was never wrapped to any width, so a real address simply
//     continued into the one-inch margin Fla. R. Gen. Prac. & Jud. Admin.
//     2.520 requires the court's copy to keep clear.
//
// MEASURED FROM THE CANVAS, NOT THE TEXT LAYER, and that distinction cost a
// wrong diagnosis once. pdf.js lays each text run out in a substitute face and
// corrects it with a transform; here the spans come out about 16% wider than
// the ink actually committed. Measuring the DOM claimed the centered court
// caption ran 18pt past the margin and the page footer 7pt -- a canvas scan
// showed neither puts down any ink past it at all. Span POSITIONS are
// trustworthy and are used below to find rows; span WIDTHS are not, and are
// used for nothing.
//
// For reference, the only ink past the margin anywhere in this filing is
// 0.7-2.0pt of table and header rule: borders drawn ON the content edge, whose
// stroke width necessarily straddles it. That is why the bound here is 541pt
// rather than a hard 540.

const PAGE_W_PT = 612;
const MARGIN_PT = 72;
const RIGHT_EDGE_PT = PAGE_W_PT - MARGIN_PT; // 540
/** Tolerance for a rule stroke centred on the content edge. */
const EDGE_TOLERANCE_PT = 1;

const LONG_STREET = '88 Snell Isle Blvd NE';
const LONG_CITY_STATE_ZIP = 'St. Petersburg, FL 33704';

async function openSimplifiedPreview(page: Page) {
  await freshStartNoPassword(page);
  await createSimplifiedWard(page, 'Address Margin Ward');
  await fillMinimalValidSimplifiedWard(page);
  await page.evaluate(([street, csz]) => {
    const d = (window as any).D;
    for (const g of d.guardians || []) {
      g.mailingStreet = street;
      g.mailingCityStateZip = csz;
      g.residenceStreet = street;
      g.residenceCityStateZip = csz;
    }
    (window as any).autoSave();
  }, [LONG_STREET, LONG_CITY_STATE_ZIP]);
  await page.evaluate(() => (window as any).flushPendingSave());
  await page.evaluate(() => (window as any).navigate('/print'));
  await page.locator('#print-doc-container .pdf-page').first().waitFor({ state: 'visible', timeout: 30000 });
  await page.evaluate(() => {
    // The pager keeps every page in the DOM but shows one at a time; each has
    // to be laid out for its text positions to be readable.
    for (const el of document.querySelectorAll('#print-doc-container .pdf-page')) {
      (el as HTMLElement).style.display = 'block';
    }
  });
}

/**
 * Locate the rows a piece of text occupies, then measure the real ink on those
 * canvas rows. Returns one entry per matching run.
 */
function measureInkOnRowsContaining(page: Page, needle: string) {
  return page.evaluate(([text, pageW]) => {
    const results: Array<{ page: number; yTop: number; yBot: number; rightPt: number; clearBeforeValuePt: number; labelOnRow: boolean }> = [];
    const pages = [...document.querySelectorAll('#print-doc-container .pdf-page')];
    pages.forEach((host, idx) => {
      const canvas = host.querySelector('canvas') as HTMLCanvasElement | null;
      if (!canvas) return;
      const hr = host.getBoundingClientRect();
      if (!hr.width) return;
      const pxPerPt = canvas.width / pageW;
      const domPerPt = hr.width / pageW;
      const hits = [...host.querySelectorAll('.textLayer span')]
        .filter((s) => (s.textContent || '').includes(text));
      if (!hits.length) return;
      const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
      for (const span of hits) {
        const r = span.getBoundingClientRect();
        const yTop = (r.top - hr.top) / domPerPt;
        const yBot = (r.bottom - hr.top) / domPerPt;
        const y0 = Math.max(0, Math.floor(yTop * pxPerPt));
        const y1 = Math.min(canvas.height - 1, Math.ceil(yBot * pxPerPt));
        const img = ctx.getImageData(0, y0, canvas.width, Math.max(1, y1 - y0 + 1)).data;
        const rows = Math.max(1, y1 - y0 + 1);
        const inked: boolean[] = new Array(canvas.width).fill(false);
        for (let ry = 0; ry < rows; ry++) {
          for (let x = 0; x < canvas.width; x++) {
            const i = ((ry * canvas.width) + x) * 4;
            if (img[i] < 200 || img[i + 1] < 200 || img[i + 2] < 200) inked[x] = true;
          }
        }
        let rightmost = -1;
        for (let x = canvas.width - 1; x >= 0; x--) { if (inked[x]) { rightmost = x; break; } }
        // The gutter, measured where it actually matters: the clear space
        // immediately to the LEFT of where this value starts. The span's left
        // edge is a position, so it is reliable. If the label's ink has run
        // past that point there is no clear space at all, which is exactly
        // what the reported "Residence Addre[ss]88 Snell" looked like.
        //
        // An earlier version of this took the widest clear corridor anywhere
        // on the row instead. That passed on the broken renderer -- the gap
        // between two words of the address was wide enough to satisfy it --
        // so it proved nothing. Measure at the boundary, not the row.
        const valueLeftPx = (r.left - hr.left) / domPerPt * pxPerPt;
        let clearPx = 0;
        for (let x = Math.floor(valueLeftPx - (0.5 * pxPerPt)); x >= 0 && !inked[x]; x--) {
          clearPx++;
          if (clearPx > 20 * pxPerPt) break;
        }
        // Does the label share this row, or did the value drop onto its own
        // line below it? Span positions are reliable; widths are not.
        const labelOnRow = [...host.querySelectorAll('.textLayer span')].some((s) => {
          if (!/Address:/.test(s.textContent || '')) return false;
          const lr = s.getBoundingClientRect();
          const mid = ((lr.top + lr.bottom) / 2 - hr.top) / domPerPt;
          return mid >= yTop - 1 && mid <= yBot + 1;
        });
        results.push({
          page: idx + 1,
          yTop: Math.round(yTop * 10) / 10,
          yBot: Math.round(yBot * 10) / 10,
          rightPt: rightmost < 0 ? 0 : Math.round(((rightmost + 1) / pxPerPt) * 10) / 10,
          clearBeforeValuePt: Math.round((clearPx / pxPerPt) * 10) / 10,
          labelOnRow,
        });
      }
    });
    return results;
  }, [needle, PAGE_W_PT] as const);
}

test.describe('signature-block addresses stay inside the margin (reported 2026-09-18)', () => {
  test('no ink from a guardian address crosses the one-inch right margin', async ({ page }) => {
    test.setTimeout(150_000);
    await openSimplifiedPreview(page);

    const street = await measureInkOnRowsContaining(page, LONG_STREET);
    const city = await measureInkOnRowsContaining(page, 'FL 33704');
    const rows = [...street, ...city];
    expect(rows.length, 'no address rows found to measure').toBeGreaterThan(2);

    const limit = RIGHT_EDGE_PT + EDGE_TOLERANCE_PT;
    const overflowing = rows
      .filter((r) => r.rightPt > limit)
      .map((r) => ({ page: r.page, yTop: r.yTop, rightPt: r.rightPt, overPt: Math.round((r.rightPt - RIGHT_EDGE_PT) * 10) / 10 }));
    expect(overflowing, `real ink past the right margin: ${JSON.stringify(overflowing, null, 1)}`).toEqual([]);
  });

  test('an address value never prints on top of its own label', async ({ page }) => {
    test.setTimeout(150_000);
    await openSimplifiedPreview(page);

    // Only rows where the label and value share a line can collide. If a
    // value has dropped onto its own line below the label there is nothing
    // here to check, and the wrap case covers that shape instead.
    const rows = (await measureInkOnRowsContaining(page, LONG_STREET)).filter((r) => r.labelOnRow);
    expect(rows.length, 'no row found with an address label and its value side by side').toBeGreaterThan(0);

    // 2pt of clear space before the value begins. The renderer reserves 6pt;
    // a collision leaves none at all. Verified to fail on the pre-fix engine.
    const collided = rows.filter((r) => r.clearBeforeValuePt < 2);
    expect(collided, `label ink runs into value ink: ${JSON.stringify(collided, null, 1)}`).toEqual([]);
  });

  test('a long address wraps onto its own second line rather than being clipped', async ({ page }) => {
    test.setTimeout(150_000);
    await openSimplifiedPreview(page);

    // Wrapping must not cost the reader any of the address: both halves have
    // to appear, on separate lines, since neither fits beside the other.
    // Span positions are accurate even though span widths are not.
    const lines = await page.evaluate(([street, csz]) => {
      const out: Array<{ text: string; mid: number }> = [];
      for (const host of document.querySelectorAll('#print-doc-container .pdf-page')) {
        const hr = host.getBoundingClientRect();
        if (!hr.width) continue;
        const k = hr.width / 612;
        for (const s of host.querySelectorAll('.textLayer span')) {
          const t = (s.textContent || '').trim();
          if (!t.includes(street) && !t.includes(csz)) continue;
          const r = s.getBoundingClientRect();
          out.push({ text: t, mid: ((r.top + r.bottom) / 2 - hr.top) / k });
        }
      }
      return out;
    }, [LONG_STREET, LONG_CITY_STATE_ZIP] as const);

    const streetLine = lines.find((l) => l.text.includes(LONG_STREET));
    const cityLine = lines.find((l) => l.text.includes(LONG_CITY_STATE_ZIP));
    expect(streetLine, 'street line missing from the filing').toBeTruthy();
    expect(cityLine, 'city/state/zip line missing from the filing').toBeTruthy();
    expect(Math.abs(cityLine!.mid - streetLine!.mid), 'the address did not wrap onto a second line').toBeGreaterThan(2);
  });
});
