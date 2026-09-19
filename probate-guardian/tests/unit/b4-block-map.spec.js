import { describe, expect, test } from 'vitest';
import JSZip from 'jszip';
import { readFileSync } from 'node:fs';
import { SCH_B4_ACCOUNT_BLOCKS } from '../../src/core/excel/b4-register-pages.js';

// SCH_B4_ACCOUNT_BLOCKS in annual-accounting/excel.js says which register
// pages belong to which bank account and how many rows each block holds. The
// shipped workbook is the authority for both (AGENTS.md section 13), and the
// two can drift the moment either changes: a stale entry would write an
// account's disbursements onto pages that no longer exist, or leave real
// pages unreachable, in a filed financial document.
//
// So this reads the block map back out of the template rather than trusting
// it: blocks begin where the pre-printed Line # restarts at 1, and a block's
// capacity is the count of pre-printed Line # cells across its pages.
//
// The constant lives in core/excel/b4-register-pages.js precisely so it can be
// imported here without dragging in the feature module and the window bridge.
// Each page records where its register starts and how many pre-printed rows it
// has, because the writer needs both and they are not uniform.

const TEMPLATE_JS = 'templates/annual-template.js';
const REGISTER = /^SCH B-4 OTHER DISB p(\d+)$/;

function expectedBlocks() {
  return SCH_B4_ACCOUNT_BLOCKS.map((b) => ({
    account: b.account,
    pages: b.pages.map((p) => ({ page: p.page, firstRow: p.firstRow, rows: p.rows })),
    capacity: b.capacity,
  }));
}

async function actualBlocksFromTemplate() {
  const js = readFileSync(TEMPLATE_JS, 'utf8');
  const b64 = /annual="([A-Za-z0-9+/=]+)"/.exec(js)[1];
  const zip = await JSZip.loadAsync(Buffer.from(b64, 'base64'));
  const wb = await zip.file('xl/workbook.xml').async('string');
  const rels = await zip.file('xl/_rels/workbook.xml.rels').async('string');
  const target = new Map();
  for (const m of rels.matchAll(/Id="([^"]+)"[^>]*Target="([^"]+)"/g)) target.set(m[1], m[2]);

  const pages = [];
  for (const tag of wb.match(/<sheet\b[^>]*\/?>/g) || []) {
    const name = /name="([^"]+)"/.exec(tag)?.[1];
    const rid = /r:id="([^"]+)"/.exec(tag)?.[1];
    const hit = name && REGISTER.exec(name);
    if (hit && rid) pages.push({ page: Number(hit[1]), part: 'xl/' + target.get(rid).replace(/^\//, '') });
  }
  pages.sort((a, b) => a.page - b.page);

  const cellRe = /<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g;
  const blocks = [];
  for (const { page, part } of pages) {
    const xml = await zip.file(part).async('string');
    const cells = new Map();
    for (let m = cellRe.exec(xml); m; m = cellRe.exec(xml)) {
      const ref = /r="([A-Z]+)(\d+)"/.exec(m[1]);
      const v = m[2] ? /<v>([\s\S]*?)<\/v>/.exec(m[2]) : null;
      if (ref && v) cells.set(`${ref[1]}|${ref[2]}`, { str: /t="s"/.test(m[1]), val: v[1] });
    }
    // Header row: column C reads "Check #" (a shared string). Line numbers are
    // the numeric column B cells below it.
    const shared = await zip.file('xl/sharedStrings.xml').async('string');
    const si = [...shared.matchAll(/<si>([\s\S]*?)<\/si>/g)].map((m) => m[1].replace(/<[^>]+>/g, ''));
    let header = null;
    for (const [k, c] of cells) {
      const [col, row] = k.split('|');
      if (col === 'C' && c.str && si[Number(c.val)]?.trim() === 'Check #') {
        header = Math.min(header ?? Infinity, Number(row));
      }
    }
    const lines = [];
    for (const [k, c] of cells) {
      const [col, row] = k.split('|');
      if (col === 'B' && !c.str && Number(row) > header && /^\d+$/.test(c.val)) lines.push(Number(c.val));
    }
    lines.sort((a, b) => a - b);
    // Where this page's register actually starts: the first row carrying a
    // pre-printed Line #. p2 begins at row 20, every other page at row 8.
    let firstRow = Infinity;
    for (const [k, c] of cells) {
      const [col, row] = k.split('|');
      if (col === 'B' && !c.str && Number(row) > header && /^\d+$/.test(c.val)) {
        firstRow = Math.min(firstRow, Number(row));
      }
    }
    if (lines[0] === 1) blocks.push({ account: blocks.length + 1, pages: [], capacity: 0 });
    const block = blocks[blocks.length - 1];
    block.pages.push({ page, firstRow, rows: lines.length });
    block.capacity += lines.length;
  }
  return blocks;
}

describe('SCH_B4_ACCOUNT_BLOCKS matches the shipped workbook', () => {
  test('block count, pages and capacities all agree', async () => {
    const expected = expectedBlocks();
    const actual = await actualBlocksFromTemplate();
    expect(expected.length, 'the constant declares no blocks').toBeGreaterThan(0);
    expect(actual).toEqual(expected);
  }, 60_000);

  test('the workbook supports twelve accounts', async () => {
    const actual = await actualBlocksFromTemplate();
    expect(actual).toHaveLength(12);
    expect(actual[0].pages.map((p) => p.page)).toEqual([2, 3, 4, 5, 6, 7]);
    expect(actual[0].pages[0]).toEqual({ page: 2, firstRow: 20, rows: 25 });
    expect(actual[0].capacity).toBe(160);
    expect(actual[3].pages[0]).toEqual({ page: 16, firstRow: 8, rows: 31 });
    expect(actual[11].pages.map((p) => p.page)).toEqual([48, 49, 50, 51]);
    expect(actual.reduce((s, b) => s + b.capacity, 0)).toBe(1382);
  }, 60_000);
});
