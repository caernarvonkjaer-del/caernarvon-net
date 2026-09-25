import { test, expect } from '@playwright/test';
import { freshStartNoPassword, createWard, fillMinimalValidAnnualWard } from './support/target';

// A Schedule D ward's share typed as 1% was counted as 100% -- on screen, in
// the PDF and in the court workbook -- because the Annual Accounting read any
// value of 1 or less as already a fraction (0.5% as 50%). The field tells the
// filer to enter 50 for 50%, and the court's workbook holds each share in a
// percentage cell that it multiplies into the ward's share (D-1: K = H * I),
// so a 1% share of $10,000 was filed as $10,000. Fixed with the requester's
// approval (AGENTS.md section 5), 2026-09-24.
//
// The exported workbook itself is read here -- with ExcelJS, the library the
// app uses -- never a re-import, which would agree with a broken exporter
// (AGENTS.md section 5, P1/P2).

const ROWS = [
  { description: 'One Percent', wardPct: '1', expectCell: 0.01, share: 100 },
  { description: 'Half', wardPct: '50', expectCell: 0.5, share: 5000 },
  { description: 'Half A Percent', wardPct: '0.5', expectCell: 0.005, share: 50 },
  { description: 'Whole', wardPct: '100', expectCell: 1, share: 10000 },
];

test('Schedule D-1 ward shares are written to the court workbook as percentages, and small ones are noted', async ({ page }) => {
  test.setTimeout(120_000);
  await freshStartNoPassword(page);
  await createWard(page, 'Ward Share Export', 'annual');
  await fillMinimalValidAnnualWard(page);
  await page.evaluate((rows) => {
    const w = window as any;
    w.D.schD1 = rows.map((r: any) => ({ description: r.description, accountNo: '1', restricted: 'No', type: 'Stock', fullAmount: 10000, wardPct: r.wardPct, restrictedAmt: '' }));
    w.autoSave();
  }, ROWS);

  expect(await page.evaluate(() => (window as any).calcTotalsAnnual((window as any).D).schD1_total), "the app's own D-1 total")
    .toBe(ROWS.reduce((sum, r) => sum + r.share, 0));

  await page.evaluate(() => (window as any).navigate('/print'));
  const excel = page.locator('[data-annual-action="save-excel"]');
  await expect(excel, 'the notes never block export').toBeEnabled({ timeout: 20_000 });
  const notes = await page.locator('.alert-warning li', { hasText: "Ward's % reads as" }).allInnerTexts();
  expect(notes).toEqual([
    "Schedule D-1 — Line 1 — Ward's % reads as 1%. If the ward's share is the whole amount, enter 100.",
    "Schedule D-1 — Line 3 — Ward's % reads as 0.5%. If the ward's share is the whole amount, enter 100.",
  ]);

  const download = page.waitForEvent('download', { timeout: 30_000 });
  await excel.click();
  const chunks: Buffer[] = [];
  for await (const c of await (await download).createReadStream()) chunks.push(c as Buffer);
  const bytes = [...Buffer.concat(chunks)];
  await page.addScriptTag({ url: 'lib/exceljs.min.js' });
  await page.waitForFunction(() => typeof (window as any).ExcelJS !== 'undefined');
  const cells = await page.evaluate(async (b) => {
    const wb = new (window as any).ExcelJS.Workbook();
    await wb.xlsx.load(new Uint8Array(b).buffer);
    const ws = wb.getWorksheet('SCH D-1 CASH p1');
    return [25, 28, 31, 34].map((r) => ({ desc: ws.getCell(`C${r}`).value, I: ws.getCell(`I${r}`).value, K: ws.getCell(`K${r}`).formula }));
  }, bytes);
  expect(cells).toEqual(ROWS.map((r, i) => ({ desc: r.description, I: r.expectCell, K: `H${25 + 3 * i}*I${25 + 3 * i}` })));
});
