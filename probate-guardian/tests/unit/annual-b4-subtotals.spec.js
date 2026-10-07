// Milestone 73T part 3 (decision 73T-1): the Annual workbook's Schedule B-4
// category subtotals, read with ExcelJS from the embedded template.
//
// Each register page (SCH B-4 OTHER DISB p2..p51) sorts its payments into the
// summary's eighteen categories through a hidden grid: one grid row per
// category, one grid column per payment row, each cell
// IF(E<row>="<category>",I<row>,0). In the Clerk's own workbook some cells
// tested the wrong cells -- "Taxes: Intangible" ignored a page's first payment
// on p2, p4-p11 and p13-p19; "Utilities" skipped p8's second payment and
// p12's first -- and this repo's p20-p51, copied from p8-p11, carried the same
// (301 cells). A payment on one of those rows was filed out of the SUMMARY,
// Part VI H16 and Line 20, while the PDF counted it. Corrected by
// scripts/fix-annual-b4-subtotals.py, with the requester's approval as the
// Clerk's representative (AGENTS.md section 5).
import { beforeAll, describe, expect, test } from 'vitest';
import { templateWorkbook } from './support/exceljs-node.js';

const colNum = (c) => [...c].reduce((n, ch) => n * 26 + ch.charCodeAt(0) - 64, 0);
const majority = (xs) => [...xs.reduce((m, x) => m.set(x, (m.get(x) || 0) + 1), new Map())].sort((a, b) => b[1] - a[1])[0][0];

describe("the Annual workbook's Schedule B-4 subtotals (73T-1)", () => {
  let pages;
  beforeAll(async () => {
    const wb = await templateWorkbook('annual');
    pages = wb.worksheets.filter((ws) => /^SCH B-4 OTHER DISB p\d+$/.test(ws.name)).map((ws) => {
      const grid = [];
      const sums = [];
      ws.eachRow({ includeEmpty: false }, (row, r) => row.eachCell({ includeEmpty: false }, (c) => {
        const f = c.value && typeof c.value === 'object' ? c.formula : null;
        if (!f) return;
        const m = /^IF\(([A-Z]+)(\d+)="([^"]+)",([A-Z]+)(\d+),0\)$/.exec(f);
        if (m) grid.push({ addr: c.address, col: c.address.replace(/\d+$/, ''), row: r, f, testCol: m[1], testRow: +m[2], cat: m[3], amtCol: m[4], amtRow: +m[5] });
        const s = /^SUM\(([A-Z]+)(\d+):([A-Z]+)(\d+)\)$/.exec(f);
        if (s && +s[2] === r && +s[4] === r) sums.push({ addr: c.address, row: r, from: s[1], to: s[3] });
      }));
      return { name: ws.name, grid, sums };
    });
  }, 240_000);

  test('every grid cell tests its own column\'s payment row -- category (E) and amount (I) -- for its own row\'s category', () => {
    const wrong = [];
    for (const { name, grid } of pages) {
      const cols = [...new Set(grid.map((x) => x.col))].sort((a, b) => colNum(a) - colNum(b));
      const firstRow = majority(grid.filter((x) => x.col === cols[0]).map((x) => x.testRow));
      const catOf = new Map([...new Set(grid.map((x) => x.row))].map((r) => [r, majority(grid.filter((x) => x.row === r).map((x) => x.cat))]));
      for (const x of grid) {
        const want = firstRow + colNum(x.col) - colNum(cols[0]);
        if (x.testCol !== 'E' || x.amtCol !== 'I' || x.testRow !== want || x.amtRow !== want || x.cat !== catOf.get(x.row)) wrong.push(`${name}!${x.addr} = ${x.f}`);
      }
    }
    expect(wrong).toEqual([]);
  });

  test('every page has the grid, and every category row is added up across all of it', () => {
    expect(pages.length).toBe(50);
    const short = [];
    for (const { name, grid, sums } of pages) {
      expect(grid.length, `${name} has its grid`).toBeGreaterThan(400);
      const cols = [...new Set(grid.map((x) => x.col))].sort((a, b) => colNum(a) - colNum(b));
      for (const r of new Set(grid.map((x) => x.row))) {
        const sum = sums.find((s) => s.row === r && s.from === cols[0]);
        if (!sum || sum.to !== cols[cols.length - 1]) short.push(`${name} row ${r}: ${sum ? `SUM(${sum.from}:${sum.to})` : 'no total'} for a grid ${cols[0]}..${cols[cols.length - 1]}`);
      }
    }
    expect(short).toEqual([]);
  });
});
