// Milestone 74Q: an exported workbook shows its totals when opened. The totals
// are the Clerk's formulas, and the file stores no computed result for them
// (the templates hold 0), so a previewer, an e-filing viewer or a script that
// doesn't recalculate showed $0 in every total. saveWorkbookFile() -- the one
// save every export goes through -- marks the file "recalculate on open"
// (decision 1, settled 2026-10-06). It writes no formula and no result.
//
// Each of the three court workbooks is saved through saveWorkbookFile() itself
// and the written file's xl/workbook.xml read back (AGENTS.md section 5: read
// the exported file, never a re-import). The <calcPr> element is self-closing
// and appears once, so a tag match is coarse and safe here (section 10, P2
// concerns cells, whose tags nest).
import { describe, expect, test } from 'vitest';
import JSZip from 'jszip';
import { saveWorkbookFile } from '../../src/core/excel/excel-engine.js';
import { templateWorkbook } from './support/exceljs-node.js';

async function savedBytes(workbook) {
  // Under Node the save stops before the download; keep what it wrote.
  let written = null;
  const write = workbook.xlsx.writeBuffer.bind(workbook.xlsx);
  workbook.xlsx.writeBuffer = async (...args) => { written = await write(...args); return written; };
  await saveWorkbookFile(workbook, 'test.xlsx');
  return written;
}

const calcPr = (workbookXml) => {
  const tags = workbookXml.match(/<calcPr\b[^>]*\/?>/g) || [];
  expect(tags, 'one <calcPr> element').toHaveLength(1);
  return Object.fromEntries([...tags[0].matchAll(/(\w+)="([^"]*)"/g)].map((m) => [m[1], m[2]]));
};

describe.each(['annual', 'guardian', 'simplified'])('the %s workbook, as saved', (name) => {
  test('asks the opening program to recalculate the Clerk\'s formulas', async () => {
    const bytes = await savedBytes(await templateWorkbook(name));
    expect(bytes, 'the save wrote the workbook').toBeTruthy();
    const zip = await JSZip.loadAsync(bytes);
    expect(calcPr(await zip.file('xl/workbook.xml').async('string')).fullCalcOnLoad).toBe('1');
  }, 240_000);
});
