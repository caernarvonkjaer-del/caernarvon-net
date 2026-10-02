import { describe, expect, test } from 'vitest';
import JSZip from 'jszip';
import { readFileSync } from 'node:fs';
import {
  GUARDIAN_PAGED_SCHEDULES,
  GUARDIAN_NEVER_WRITTEN_SHEETS,
  partIIIGuardianCells,
  isPrintedCaption,
} from '../../src/core/excel/guardian-inventory-pages.js';
import { templateSheets } from './support/template-cells.js';

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

  // The list is empty today: D10 extended C-5's map to its third page, which
  // was its only entry. It stays as the declared home for a page the court
  // adds that genuinely has no data behind it -- the test above requires every
  // schedule page to be in one place or the other, so a new page cannot be
  // silently dropped, but it must not be used to paper over a page the app
  // should be reaching.
  test('the never-written list names real sheets that no page map reaches', async () => {
    const sheets = new Set(await templateSheetNames());
    const mapped = new Set(mappedPages());
    for (const name of GUARDIAN_NEVER_WRITTEN_SHEETS) {
      expect(sheets.has(name), `${name} is not in the workbook`).toBe(true);
      expect(mapped.has(name), `${name} is reachable, so it must not be force-pruned`).toBe(false);
    }
  });

  // Every printed slot the court's form provides is reachable. This is what
  // D10 bought: before it, C-5's third page held eight joint-owner slots the
  // app could not use, and a 16-asset filing was refused an Excel export the
  // form could have carried.
  test('no schedule page in the workbook is unreachable', async () => {
    const mapped = new Set(mappedPages());
    const unreachable = (await templateSheetNames())
      .filter((n) => SCHEDULE_PAGE.test(n) && !mapped.has(n));
    expect(unreachable, 'schedule pages the exporter can never write to').toEqual([]);
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

// Milestone 72A. PART III's field table is the one place the exporter and the
// importer learn where each guardian's details go, so it is checked against
// the workbook here rather than trusted. The defect it replaced wrote every
// field onto the caption row above its box, for the whole life of the form.
describe('PART III guardian blocks against the shipped workbook', () => {
  test("each caption cell holds the form's caption, and each box beneath it is an empty, writable cell", async () => {
    const p3 = (await templateSheets('guardian')).get('PART III');
    expect(p3, 'the workbook has a PART III sheet').toBeTruthy();
    for (let i = 0; i < 3; i++) {
      for (const f of partIIIGuardianCells(i)) {
        const where = `guardian ${i + 1} ${f.key}`;
        if (f.caption) expect(p3.cells.get(f.caption)?.text, `${where}: caption ${f.caption}`).toBe(f.text);
        expect(p3.covered.has(f.box), `${where}: ${f.box} is not hidden inside a merge`).toBe(false);
        if (i === 0 && f.key === 'name') {
          // The one box the form fills itself; written over by decision (2026-10-01).
          expect(p3.cells.get(f.box), "Guardian #1's name box links to the Cover").toEqual({ kind: 'FORMULA', text: "'SUMMARY I '!D23" });
        } else {
          expect(p3.cells.get(f.box), `${where}: ${f.box} is empty in the template`).toBeUndefined();
        }
      }
    }
  });

  test('every box sits directly beneath its own caption', () => {
    for (let i = 0; i < 3; i++) {
      for (const f of partIIIGuardianCells(i).filter((x) => x.caption)) {
        const [, bc, br] = /([A-Z]+)(\d+)/.exec(f.box);
        const [, cc, cr] = /([A-Z]+)(\d+)/.exec(f.caption);
        expect(bc, `${f.key} box and caption share a column`).toBe(cc);
        expect(Number(br), `${f.key} box is the row beneath its caption`).toBe(Number(cr) + 1);
      }
    }
  });

  // The importer's fallback for workbooks exported before 72A reads the
  // caption row only when it holds something other than the caption. A
  // caption saved slightly differently by another program must still count
  // as the caption, or the importer would read it in as a guardian's SSN.
  test('a caption is recognized loosely, and a value is never mistaken for one', () => {
    const caption = "Guardian #1's SSN / EIN";
    expect(isPrintedCaption(caption, caption)).toBe(true);
    expect(isPrintedCaption("  guardian #1’s   SSN / EIN ", caption), 'spaces, case and a curly apostrophe').toBe(true);
    expect(isPrintedCaption('123-45-6789', caption)).toBe(false);
    expect(isPrintedCaption('', caption), 'an empty cell is not the caption').toBe(false);
    expect(isPrintedCaption(null, caption)).toBe(false);
    expect(isPrintedCaption("Co-Guardian #2's SSN / EIN", caption), "another guardian's caption is not this one").toBe(false);
  });
});
