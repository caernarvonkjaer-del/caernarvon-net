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

async function openSimplifiedPreview(page: Page, cityStateZip: string = LONG_CITY_STATE_ZIP) {
  await freshStartNoPassword(page);
  await createSimplifiedWard(page, 'Address Margin Ward');
  await fillMinimalValidSimplifiedWard(page);
  await page.evaluate(([street, csz]) => {
    const d = (window as any).GuardianForms.testing.snapshot().filing;
    for (const g of d.guardians || []) {
      g.mailingStreet = street;
      g.mailingCityStateZip = csz;
      g.residenceStreet = street;
      g.residenceCityStateZip = csz;
    }
    (window as any).GuardianForms.testing.replaceFiling(d); // setup (D9)
  }, [LONG_STREET, cityStateZip]);
  await page.evaluate(() => (window as any).GuardianForms.testing.save.flush());
  await page.evaluate(() => (window as any).GuardianForms.testing.navigate('/print'));
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
    const results: Array<{ page: number; yTop: number; yBot: number; rightPt: number; clearBeforeValuePt: number }> = [];
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
        //
        // Anchor on the value's own first inked pixel rather than on the span
        // origin: a glyph's antialiasing bleeds a fraction of a point to the
        // left of its origin, which reads as "no clear space" if probed there.
        const valueLeftPx = (r.left - hr.left) / domPerPt * pxPerPt;
        let inkStart = Math.max(0, Math.floor(valueLeftPx - (1.5 * pxPerPt)));
        while (inkStart < canvas.width && !inked[inkStart]) inkStart++;
        let clearPx = 0;
        for (let x = inkStart - 1; x >= 0 && !inked[x]; x--) {
          clearPx++;
          if (clearPx > 20 * pxPerPt) break;
        }
        results.push({
          page: idx + 1,
          yTop: Math.round(yTop * 10) / 10,
          yBot: Math.round(yBot * 10) / 10,
          rightPt: rightmost < 0 ? 0 : Math.round(((rightmost + 1) / pxPerPt) * 10) / 10,
          clearBeforeValuePt: Math.round((clearPx / pxPerPt) * 10) / 10,
        });
      }
    });
    return results;
  }, [needle, PAGE_W_PT] as const);
}

/**
 * The "Residence Address" block: its label and the two value lines beneath it.
 * Span positions are accurate even though span widths are not, so this reads
 * position only.
 */
function readAddressBlock(page: Page, street: string, cityStateZip: string) {
  return page.evaluate(([streetText, cszText, pageW]) => {
    type Run = { text: string; mid: number; left: number };
    const runs: Run[] = [];
    for (const host of document.querySelectorAll('#print-doc-container .pdf-page')) {
      const hr = host.getBoundingClientRect();
      if (!hr.width) continue;
      const k = hr.width / (pageW as number);
      for (const s of host.querySelectorAll('.textLayer span')) {
        const text = (s.textContent || '').trim();
        if (!text) continue;
        const r = s.getBoundingClientRect();
        runs.push({ text, mid: ((r.top + r.bottom) / 2 - hr.top) / k, left: (r.left - hr.left) / k });
      }
    }
    // Milestone 60F: Simplified's signature blocks render through `fields`,
    // which draws a label without the trailing colon the legacy `details`
    // stack appended. Matching the bare label keeps this test pinned to the
    // layout property it is about rather than to a punctuation mark.
    const label = runs.find((run) => run.text.startsWith('Residence Address')) || null;
    // Take the lines belonging to THIS label, not the mailing block above it.
    const after = label ? runs.filter((run) => run.mid > label.mid) : runs;
    return {
      label,
      street: after.find((run) => run.text.includes(streetText as string)) || null,
      city: after.find((run) => run.text.includes(cszText as string)) || null,
    };
  }, [street, cityStateZip, PAGE_W_PT] as const);
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

    const rows = await measureInkOnRowsContaining(page, LONG_STREET);
    expect(rows.length, 'no address rows found to measure').toBeGreaterThan(0);

    // Clear space immediately left of where the value starts. The postal-block
    // layout satisfies this structurally -- the label is on its own line above
    // -- but the assertion is the property, not the mechanism, so a regression
    // back to a colliding side-by-side shape still fails here. Verified red on
    // the pre-fix engine, where it measured 0.
    const collided = rows.filter((r) => r.clearBeforeValuePt < 2);
    expect(collided, `label ink runs into value ink: ${JSON.stringify(collided, null, 1)}`).toEqual([]);
  });

  test('an address prints as a postal block under its own label', async ({ page }) => {
    test.setTimeout(150_000);
    await openSimplifiedPreview(page);

    const block = await readAddressBlock(page, LONG_STREET, LONG_CITY_STATE_ZIP);
    expect(block.label, 'no "Residence Address" label found').toBeTruthy();
    expect(block.street, 'street line missing from the filing').toBeTruthy();
    expect(block.city, 'city/state/zip line missing from the filing').toBeTruthy();

    // Standard US form: label, then delivery line, then city/state/ZIP, each
    // on its own line and in that order.
    expect(block.street!.mid, 'the delivery line is not under its label').toBeGreaterThan(block.label!.mid + 2);
    expect(block.city!.mid, 'city/state/ZIP is not under the delivery line').toBeGreaterThan(block.street!.mid + 2);

    // Under the label rather than hanging off in the old value column, so the
    // block reads as one address. `fields` sets the label and its value lines
    // at the same left edge (the legacy stack indented the value 6pt), so the
    // bound is a small tolerance either way rather than a strict indent.
    expect(block.street!.left - block.label!.left, 'the delivery line is left of its own label').toBeGreaterThan(-1);
    expect(block.street!.left - block.label!.left, 'the block is indented too far to read as a unit').toBeLessThan(20);
    expect(Math.abs(block.city!.left - block.street!.left), 'block lines are not flush with each other').toBeLessThan(1);
  });

  test('the street stays on its own line when the filer omits the city comma', async ({ page }) => {
    test.setTimeout(150_000);
    // The regression the structural composer exists for. The old code joined
    // the stored fields with a comma and split them back apart on commas, so
    // this input collapsed the whole address onto one line.
    const noComma = 'St. Petersburg FL 33704';
    await openSimplifiedPreview(page, noComma);

    const block = await readAddressBlock(page, LONG_STREET, noComma);
    expect(block.street, 'street line missing from the filing').toBeTruthy();
    expect(block.city, 'city/state/zip line missing from the filing').toBeTruthy();
    expect(block.city!.mid - block.street!.mid, 'street and city collapsed onto one line').toBeGreaterThan(2);

    // And the collapsed single line was what overflowed, so check the ink too.
    const rows = await measureInkOnRowsContaining(page, LONG_STREET);
    const overflowing = rows.filter((r) => r.rightPt > RIGHT_EDGE_PT + EDGE_TOLERANCE_PT);
    expect(overflowing, `real ink past the right margin: ${JSON.stringify(overflowing, null, 1)}`).toEqual([]);
  });

  // Milestone 60F. The `fields` grid reserved a flat 28pt per row, which holds
  // a label and two value lines; a row whose value wraps further was drawn
  // into the space the block had already handed to whatever follows it.
  //
  // This is deliberately an ENGINE-level case with a hostile input, not a
  // filing-shaped one, and the distinction is the point. At the full content
  // width these blocks use, no realistic address wraps past two lines -- an
  // attempt to provoke this through the UI with a long street and a
  // co-guardian produced no wrap at all, so it proved nothing and was
  // deleted rather than kept as decoration. Three columns of a genuinely long
  // value is a condition the renderer must survive, but not one this form's
  // own data reaches today. Verified red by reinstating the fixed row height.
  test('a field row taller than 28pt reserves its real height instead of running into the next block', async ({ page }) => {
    test.setTimeout(150_000);
    await openSimplifiedPreview(page);

    const probe = await page.evaluate(async () => {
      const w = window as any;
      const { buildSimplifiedAccountingModel, generateCourtFormPdf } = await w.GuardianForms.testing.generateOutput.simplifiedPdf();
      const model = buildSimplifiedAccountingModel(w.GuardianForms.testing.snapshot().filing, { printDate: '2026-09-20' });
      const part4 = model.sections.find((s: any) => s.id === 'part4');
      const block = part4.blocks.find((b: any) => b.type === 'signature-block');
      // One row of three narrow columns, each holding a long structured value:
      // 9 wrapped lines where the fixed height reserved room for 2.
      const long = Array.from({ length: 9 }, (_, i) => `Line ${i + 1} of a deliberately long structured value`);
      block.fields = [[
        { label: 'Probe A', value: long },
        { label: 'Probe B', value: long },
        { label: 'Probe C', value: long },
      ]];
      // A marker block immediately after it, so there is something to overrun.
      part4.blocks.splice(part4.blocks.indexOf(block) + 1, 0, {
        type: 'notice', tag: 'P', text: 'ZZMARKERZZ follows the signature block.',
      });
      const doc = await generateCourtFormPdf(model);
      return doc.output();
    });

    const { extractPdfTextRuns } = await import('./support/pdf-extract');
    const runs = await extractPdfTextRuns(probe);
    const marker = runs.find((r) => r.text.includes('ZZMARKERZZ'));
    const lastLine = runs.find((r) => r.text.includes('Line 9 of a deliberately long'));
    expect(marker, 'the marker block is missing from the PDF').toBeTruthy();
    expect(lastLine, 'the row\'s last wrapped line is missing from the PDF').toBeTruthy();

    // Positions, not reading order: the generator emits the marker after the
    // row either way, so only geometry can tell whether it was drawn clear of
    // it. PDF y runs up the page, so "below" means a SMALLER y.
    expect(marker!.page, 'the marker landed on a different page from the row').toBe(lastLine!.page);
    expect(
      lastLine!.y - marker!.y,
      `the following block was drawn on top of the row it should follow (row last line y=${lastLine!.y.toFixed(1)}, marker y=${marker!.y.toFixed(1)})`,
    ).toBeGreaterThan(0);
  });
});
