import { describe, expect, test } from 'vitest';
import JSZip from 'jszip';
import { readFileSync } from 'node:fs';

// Simplified Annual Accounting's workbook, held to the same standard as the
// other two: no blank pages in a filed document.
//
// Annual Accounting and Initial Inventory both needed pruning, because their
// workbooks ship continuation pages for schedules that overflow. Simplified
// has no schedules and no continuation pages -- it is four filing pages, a
// cover, and two hidden sheets Excel needs but never prints. Every one of the
// four is written on every export, because each carries the ward's name, the
// case number and the accounting period regardless of how little else the
// filing holds. So there is nothing to prune, and the exporter deliberately
// does not call pruneSheets().
//
// That conclusion is only true of the workbook as it ships today, which is
// what this pins. If the template ever gains a page, this fails and whoever
// added it has to say which bucket it belongs in -- rather than the page
// quietly joining every filing blank, which is the failure the other two
// workbooks actually had.

const TEMPLATE_JS = 'templates/simplified-template.js';

/** Written on every export by simplified-accounting/excel.js's doSaveExcel(). */
const ALWAYS_WRITTEN = ['PARTS I, II ', 'PARTS III, IV', 'PARTS V, VI ', 'PART VII'];

/**
 * Printed but never written: the court's cover page. It is not blank -- it
 * carries the form's title, its purpose paragraph and its revision date, and
 * pulls the case number from PARTS I, II by formula.
 */
const PRINTED_NOT_WRITTEN = ['COVER'];

/**
 * Never printed. 'Drop Down Data' backs the form's data-validation lists;
 * Acerno_Cache_XXXXX is an artifact of the software the court authored the
 * workbook with. Both are hidden in the file itself, so neither reaches paper
 * and neither is a blank page.
 */
const HIDDEN = ['Acerno_Cache_XXXXX', 'Drop Down Data'];

async function sheets() {
  const js = readFileSync(TEMPLATE_JS, 'utf8');
  const b64 = /["'`]([A-Za-z0-9+/=]{500,})["'`]/.exec(js)[1];
  const zip = await JSZip.loadAsync(Buffer.from(b64, 'base64'));
  const wb = await zip.file('xl/workbook.xml').async('string');
  return (wb.match(/<sheet\b[^>]*\/?>/g) || []).map((tag) => ({
    name: /name="([^"]+)"/.exec(tag)?.[1],
    state: /state="([^"]+)"/.exec(tag)?.[1] ?? 'visible',
  }));
}

describe('Simplified Annual Accounting ships no blank pages', () => {
  test('every sheet in the workbook is accounted for', async () => {
    const known = new Set([...ALWAYS_WRITTEN, ...PRINTED_NOT_WRITTEN, ...HIDDEN]);
    const all = (await sheets()).map((s) => s.name);
    const unaccounted = all.filter((n) => !known.has(n));
    expect(unaccounted, 'a new sheet must be classified before it can ship').toEqual([]);
    expect(all).toHaveLength(known.size);
  });

  test('the only visible sheets are the four written pages and the cover', async () => {
    const visible = (await sheets()).filter((s) => s.state === 'visible').map((s) => s.name);
    expect(visible.sort()).toEqual([...ALWAYS_WRITTEN, ...PRINTED_NOT_WRITTEN].sort());
  });

  test('the two structural sheets stay hidden, so they never print', async () => {
    const byName = new Map((await sheets()).map((s) => [s.name, s.state]));
    for (const name of HIDDEN) {
      expect(byName.get(name), `${name} must not be visible`).not.toBe('visible');
    }
  });

  // There is no continuation page to reach: no sheet is a second page of
  // anything. This is the property that makes pruning unnecessary here, so it
  // is worth stating rather than leaving implied by the list above.
  test('no sheet is a continuation of another', async () => {
    const continuations = (await sheets())
      .map((s) => s.name)
      .filter((n) => /\b(pg|p|page)\s*[2-9]\b/i.test(n));
    expect(continuations).toEqual([]);
  });
});
