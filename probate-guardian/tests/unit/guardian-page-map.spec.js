import { describe, expect, test } from 'vitest';
import JSZip from 'jszip';
import { readFileSync } from 'node:fs';
import {
  GUARDIAN_PAGED_SCHEDULES,
  GUARDIAN_NEVER_WRITTEN_SHEETS,
} from '../../src/core/excel/guardian-inventory-pages.js';

// Drift guard between the Initial Inventory page maps and the shipped
// workbook. The maps say which sheets each schedule spans; the workbook is the
// authority (AGENTS.md section 13).
//
// This matters more since the exporter started pruning. Before, a stale entry
// meant a schedule quietly failed to write some rows. Now a page missing from
// the maps is a page the exporter believes nothing can reach -- so it is
// deleted from the filing. If a real page fell out of a map, the pruner would
// remove a page of listed assets from a court inventory and rewrite the
// schedule total to match, leaving nothing on the face of the document to show
// anything was dropped.
//
// So the direction that must never regress is: every schedule page in the
// workbook is either in a page map or on the never-written list, and nothing
// is on the never-written list that a map can reach.

const TEMPLATE_JS = 'templates/guardian-template.js';

// Schedule pages are the ones named for a schedule; everything else in the
// workbook is structural (the summaries, Parts III-VI, the hidden dropdown
// source, and the veryHidden Acerno_Cache_XXXXX artifact) and is never pruned.
const SCHEDULE_PAGE = /^[ABC]-\d/;

async function templateSheetNames() {
  const js = readFileSync(TEMPLATE_JS, 'utf8');
  const b64 = /["'`]([A-Za-z0-9+/=]{500,})["'`]/.exec(js)[1];
  const zip = await JSZip.loadAsync(Buffer.from(b64, 'base64'));
  const wb = await zip.file('xl/workbook.xml').async('string');
  return (wb.match(/<sheet\b[^>]*\/?>/g) || [])
    .map((tag) => /name="([^"]+)"/.exec(tag)?.[1])
    .filter(Boolean)
    .map((n) => n.replace(/&apos;/g, "'").replace(/&amp;/g, '&'));
}

const mappedPages = () => GUARDIAN_PAGED_SCHEDULES.flatMap((s) => s.pages.map((p) => p.name));

describe('Initial Inventory page maps against the shipped workbook', () => {
  test('every mapped page really exists in the workbook', async () => {
    const sheets = new Set(await templateSheetNames());
    const missing = mappedPages().filter((n) => !sheets.has(n));
    expect(missing, 'page maps name sheets the workbook does not have').toEqual([]);
  });

  // The one that protects filed data: a schedule page absent from the maps is
  // a page the pruner deletes.
  test('every schedule page in the workbook is accounted for', async () => {
    const mapped = new Set([...mappedPages(), ...GUARDIAN_NEVER_WRITTEN_SHEETS]);
    const orphans = (await templateSheetNames())
      .filter((n) => SCHEDULE_PAGE.test(n) && !mapped.has(n));
    expect(orphans, 'schedule pages in neither a page map nor the never-written list').toEqual([]);
  });

  test('the never-written list names real sheets that no page map reaches', async () => {
    const sheets = new Set(await templateSheetNames());
    const mapped = new Set(mappedPages());
    for (const name of GUARDIAN_NEVER_WRITTEN_SHEETS) {
      expect(sheets.has(name), `${name} is not in the workbook`).toBe(true);
      expect(mapped.has(name), `${name} is reachable, so it must not be force-pruned`).toBe(false);
    }
  });

  test('no page is claimed by two schedules', () => {
    const all = mappedPages();
    expect(new Set(all).size, 'a sheet appears in more than one page map').toBe(all.length);
  });

  // Row positions are the other half of the geometry. A wrong row writes an
  // asset into the wrong slot of the printed form, or over its totals.
  test('every page has at least one row slot, and they ascend within a page', () => {
    for (const { key, pages } of GUARDIAN_PAGED_SCHEDULES) {
      for (const p of pages) {
        expect(p.rows.length, `${key} ${p.name} has no row slots`).toBeGreaterThan(0);
        const sorted = [...p.rows].sort((a, b) => a - b);
        expect(p.rows, `${key} ${p.name} row slots are not in order`).toEqual(sorted);
        expect(new Set(p.rows).size, `${key} ${p.name} repeats a row`).toBe(p.rows.length);
      }
    }
  });
});
