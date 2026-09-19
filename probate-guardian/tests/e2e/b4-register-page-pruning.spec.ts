import { test, expect } from '@playwright/test';
import JSZip from 'jszip';
import { freshStartNoPassword, createWard, fillMinimalValidAnnualWard } from './support/target';
import { extractXlsx } from './support/xlsx-extract';

// Schedule B-4 ships one check-register page per printed page of the court's
// form -- p2 through p19. The app writes only the pages a filing fills, so
// every unused page used to land in the exported workbook: a guardian with
// three disbursements filed a document carrying seventeen blank register
// pages. The court's own instructions say "Remove any blank pages".
//
// The delicate part is not the removal. SCH B-4 OTHER DISB SUMMARY p1 totals
// each of eighteen disbursement categories by naming every register page's
// hidden subtotal cell one at a time, so a page removed without rebuilding
// those formulas leaves #REF! in the category totals -- and through them in
// Part II's disbursement line. This spec asserts both halves, because either
// one alone produces a defective filing.

const REGISTER = /^SCH B-4 OTHER DISB p(\d+)$/;
const SUMMARY = 'SCH B-4 OTHER DISB SUMMARY p1';

function decodeXml(text: string): string {
  return text
    .replace(/&apos;/g, "'").replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
}

async function readAll(stream: NodeJS.ReadableStream): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks);
}

/** The summary's eighteen category formulas, straight out of the sheet XML. */
async function summaryFormulas(bytes: Buffer): Promise<string[]> {
  const zip = await JSZip.loadAsync(bytes);
  const wbXml = await zip.file('xl/workbook.xml')!.async('string');
  const relsXml = await zip.file('xl/_rels/workbook.xml.rels')!.async('string');
  const rels = new Map<string, string>();
  for (const m of relsXml.matchAll(/Id="([^"]+)"[^>]*Target="([^"]+)"/g)) rels.set(m[1], m[2]);
  // Attribute order is the writer's choice -- ExcelJS does not emit
  // name-then-r:id -- so match the tag and read each attribute separately.
  let rid: string | null = null;
  for (const tag of wbXml.match(/<sheet\b[^>]*\/?>/g) || []) {
    if (/name="([^"]+)"/.exec(tag)?.[1] === SUMMARY) rid = /r:id="([^"]+)"/.exec(tag)?.[1] ?? null;
  }
  if (!rid) return [];
  const part = 'xl/' + rels.get(rid)!.replace(/^\//, '');
  const xml = await zip.file(part)!.async('string');
  // Cells may be self-closing, and ExcelJS writes ' as &apos; -- decoding
  // matters because every sheet reference in these formulas is quoted.
  const byRef = new Map<string, string>();
  const cellRe = /<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g;
  for (let m = cellRe.exec(xml); m; m = cellRe.exec(xml)) {
    const ref = /r="([A-Z]+\d+)"/.exec(m[1])?.[1];
    const f = m[2] ? /<f[^>]*>([\s\S]*?)<\/f>/.exec(m[2]) : null;
    if (ref && f) byRef.set(ref, decodeXml(f[1]));
  }
  const out: string[] = [];
  for (let row = 10; row <= 27; row++) {
    const f = byRef.get(`I${row}`);
    if (f) out.push(f);
  }
  return out;
}

async function exportAnnualXlsx(page: import('@playwright/test').Page) {
  await freshStartNoPassword(page);
  await createWard(page, 'B4 Prune Ward', 'annual');
  await fillMinimalValidAnnualWard(page);
  await page.evaluate(() => {
    const d = (window as any).D;
    // A handful of disbursements: enough to fill p2, nowhere near its 25-row
    // capacity, so pages p3-p19 have nothing to carry.
    d.schB4 = [
      { checkNo: '1001', datePaid: '2026-03-04', category: 'Utilities', payee: 'Duke Energy', amount: '184.22' },
      { checkNo: '1002', datePaid: '2026-04-11', category: 'Rent', payee: 'Bayview Apartments', amount: '1250.00' },
      { checkNo: '1003', datePaid: '2026-05-09', category: 'Medical / Pharmacy', payee: 'Walgreens', amount: '42.60' },
    ];
    (window as any).autoSave();
  });
  await page.evaluate(() => (window as any).flushPendingSave());
  await page.evaluate(() => (window as any).navigate('/print'));
  // Annual's Print/Export page exposes the Excel action as
  // data-annual-action="save-excel" -- the same hook output-semantics uses.
  const excel = page.locator('[data-annual-action="save-excel"]');
  await expect(excel).toBeEnabled({ timeout: 20_000 });
  const download = page.waitForEvent('download', { timeout: 40_000 });
  await excel.click();
  return readAll(await (await download).createReadStream());
}

test.describe('Schedule B-4 register pages are pruned to what the filing uses', () => {
  test('blank register pages are removed and the category totals follow', async ({ page }) => {
    test.setTimeout(180_000);
    const bytes = await exportAnnualXlsx(page);

    const info = await extractXlsx(bytes);
    const registers = info.sheetNames
      .filter((n) => REGISTER.test(n))
      .map((n) => Number(REGISTER.exec(n)![1]))
      .sort((a, b) => a - b);

    // p2 is block 1's first page: it carries the bank/account header and the
    // rows we wrote, so it must survive. Everything else was blank.
    expect(registers, 'only the pages in use should survive').toEqual([2]);
    expect(info.sheetNames, 'the summary page must never be removed').toContain(SUMMARY);

    // The half that makes this safe rather than merely tidy.
    const formulas = await summaryFormulas(bytes);
    expect(formulas.length, 'all eighteen category totals should still be formulas').toBe(18);
    for (const f of formulas) {
      expect(f, `formula still references a removed page: ${f}`).not.toMatch(/OTHER DISB p(?!2')\d+/);
      expect(f, 'formula went to #REF!').not.toContain('#REF');
      expect(f, 'formula lost its surviving page').toContain("OTHER DISB p2'!");
    }
  });

  test('the disbursements themselves still reach the surviving page', async ({ page }) => {
    test.setTimeout(180_000);
    const bytes = await exportAnnualXlsx(page);
    const info = await extractXlsx(bytes);

    // Pruning must not disturb what was written. p2's register starts at row
    // 20, columns C/D/E/G/I.
    const cells = info.getSheetCells('SCH B-4 OTHER DISB p2');
    const text = Object.values(cells).join('');
    for (const payee of ['Duke Energy', 'Bayview Apartments', 'Walgreens']) {
      expect(text, `${payee} missing from the surviving register page`).toContain(payee);
    }
    expect(info.getCell('SCH B-4 OTHER DISB p2', 'C20')).toBe('1001');
  });
});
