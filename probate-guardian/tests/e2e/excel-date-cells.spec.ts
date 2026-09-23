import { test, expect, type Page } from '@playwright/test';
import JSZip from 'jszip';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  freshStartNoPassword, createWard, createSimplifiedWard,
  fillMinimalValidAnnualWard, fillMinimalValidGuardianWard, fillMinimalValidSimplifiedWard,
} from './support/target';
import { readAll } from './support/stream';

// Milestone 67E. Every date the app wrote into a filed workbook was TEXT --
// the ISO string '2026-01-01' as a shared string -- in cells the court's form
// had already formatted for US dates (mm/dd/yy;@, m/d/yyyy). Text ignores the
// format: the clerk saw 2026-01-01 where the form's own example row shows
// 10/2/2015, the column sorted as text, and date arithmetic against it
// failed. The court's own example at 'SCH B-4 OTHER DISB p2'!D16 is the
// serial 42279 under numFmtId 14, which is what a date cell is.
//
// Now every date write goes through one helper that turns the stored
// YYYY-MM-DD into an Excel serial -- a pure day count, so no timezone can
// enter in either direction -- and makes sure the cell carries a date format
// (four template cells had none: 'PART IV, V'!H31 and the court-order-date
// columns on SCH B-1/B-2/B-3, which showed the raw serial otherwise).
//
// Three kinds of assertion, because each catches something the others miss:
//   - exact cells: the XML carries no t attribute and <v> holds the serial,
//     e.g. 2026-01-01 -> <v>46023</v>. A test on the DISPLAYED string would
//     pass on the old text output, so it is never used as the guard.
//   - coverage: no app-written cell on any sheet of any of the three
//     exporters holds date-shaped text. That is what catches a date writer
//     that was missed -- invisible until a filer sorts a column.
//   - the round trip across a year boundary: 12/31 must come back 12/31, not
//     12/30 or 01/01. This repository has already shipped and fixed one
//     timezone-shifted date (commit 656cccf).
//
// Serials below are anchored on two facts, not on the helper's own formula:
// 2026-01-01 is 46023 (20454 days from the Unix epoch + 25569), and the
// court's own 2015-10-02 example is 42279. Everything else is a day offset.

const DATE_BUILTIN = new Set([14, 15, 16, 17, 18, 19, 20, 21, 22, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 45, 46, 47, 50, 51, 52, 53, 54, 55, 56, 57, 58]);

const dec = (s: string) => s.replace(/&apos;/g, "'").replace(/&quot;/g, '"')
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');

type Cell = { t: string | null; s: number; text: string; formula: string | null };

/** A workbook opened for inspection: sheet list, styles and cell reader. */
async function openWorkbook(bytes: Buffer | Uint8Array) {
  const zip = await JSZip.loadAsync(bytes);
  const wbXml = await zip.file('xl/workbook.xml')!.async('string');
  const relsXml = await zip.file('xl/_rels/workbook.xml.rels')!.async('string');
  const rels = new Map<string, string>();
  for (const m of relsXml.matchAll(/Id="([^"]+)"[^>]*Target="([^"]+)"/g)) rels.set(m[1], m[2]);
  const sheets: Array<{ name: string; file: string }> = [];
  for (const tag of wbXml.match(/<sheet\b[^>]*\/?>/g) || []) {
    const name = dec(/name="([^"]+)"/.exec(tag)?.[1] ?? '');
    const rid = /r:id="([^"]+)"/.exec(tag)?.[1];
    if (name && rid) sheets.push({ name, file: 'xl/' + rels.get(rid)!.replace(/^\//, '') });
  }
  const shared: string[] = [];
  const ssFile = zip.file('xl/sharedStrings.xml');
  if (ssFile) {
    for (const m of (await ssFile.async('string')).matchAll(/<si>([\s\S]*?)<\/si>/g)) {
      shared.push(dec([...m[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((t) => t[1]).join('')));
    }
  }
  // Styles: which cellXfs index carries a date number format.
  const styles = await zip.file('xl/styles.xml')!.async('string');
  const custom = new Map<number, string>();
  for (const m of styles.matchAll(/<numFmt\b[^>]*numFmtId="(\d+)"[^>]*formatCode="([^"]*)"/g)) custom.set(Number(m[1]), dec(m[2]));
  const xfIds: number[] = [];
  const cellXfs = /<cellXfs\b[^>]*>([\s\S]*?)<\/cellXfs>/.exec(styles)?.[1] ?? '';
  for (const m of cellXfs.matchAll(/<xf\b([^>]*?)(?:\/>|>[\s\S]*?<\/xf>)/g)) xfIds.push(Number(/numFmtId="(\d+)"/.exec(m[1])?.[1] ?? 0));
  const isDateXf = (s: number) => {
    const id = xfIds[s] ?? 0;
    if (DATE_BUILTIN.has(id)) return true;
    const code = (custom.get(id) || '').replace(/\[[^\]]*]/g, '').replace(/"[^"]*"/g, '');
    return /[ymd]/i.test(code);
  };
  const cellCache = new Map<string, Map<string, Cell>>();
  const cellsOf = async (sheetName: string) => {
    if (cellCache.has(sheetName)) return cellCache.get(sheetName)!;
    const out = new Map<string, Cell>();
    const sheet = sheets.find((sh) => sh.name === sheetName);
    if (sheet) {
      const xml = await zip.file(sheet.file)!.async('string');
      // Self-closing cells are why this cannot be a naive <c ...>...</c>
      // match (AGENTS.md section 10, P2).
      const cellRe = /<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g;
      for (let m = cellRe.exec(xml); m; m = cellRe.exec(xml)) {
        const ref = /r="([A-Z]+\d+)"/.exec(m[1])?.[1];
        if (!ref) continue;
        const t = /\bt="([^"]+)"/.exec(m[1])?.[1] ?? null;
        const s = Number(/\bs="(\d+)"/.exec(m[1])?.[1] ?? 0);
        const body = m[2] ?? '';
        const f = /<f[^>]*>([\s\S]*?)<\/f>/.exec(body)?.[1];
        const v = /<v>([\s\S]*?)<\/v>/.exec(body)?.[1];
        let text = v ?? '';
        if (t === 's' && v !== undefined) text = shared[Number(v)] ?? '';
        if (t === 'inlineStr') text = [...body.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((x) => dec(x[1])).join('');
        out.set(ref, { t, s, text, formula: f ? dec(f) : null });
      }
    }
    cellCache.set(sheetName, out);
    return out;
  };
  return { sheets, isDateXf, cellsOf };
}

async function openTemplate(name: 'annual' | 'guardian' | 'simplified') {
  const js = fs.readFileSync(path.resolve(process.cwd(), `templates/${name}-template.js`), 'utf8');
  const b64 = /["'`]([A-Za-z0-9+/=]{500,})["'`]/.exec(js)![1];
  return openWorkbook(Buffer.from(b64, 'base64'));
}

/**
 * Every app-written cell in the export holding date-shaped TEXT -- the ISO
 * '2026-01-01' the retired formatters produced, or US '1/1/2026' -- on any
 * sheet, whatever the cell's number format. That is what a missed date
 * writer looks like. "App-written" = its text is not what the template has
 * at that address.
 *
 * It keys on the value's shape, not the cell's format, for two reasons. A
 * writer missed on a cell the template left General would write ISO text
 * into a General cell, which a format-keyed sweep never looks at. And the
 * court's templates put date number formats on cells that hold text -- the
 * attorney's bar number ('PART IV, V'!B33), a check number (SCH B-1!E10),
 * the guardian's name and the type of guardianship on SUMMARY I -- so a
 * format-keyed sweep reported those as missed dates on its first run. They
 * are not; text under a date format displays as text.
 */
async function dateShapedText(exported: Awaited<ReturnType<typeof openWorkbook>>, template: Awaited<ReturnType<typeof openWorkbook>>) {
  const looksLikeDate = (s: string) => /^\d{4}-\d{2}-\d{2}(?:[T\s].*)?$/.test(s) || /^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(s);
  const offenders: string[] = [];
  for (const { name } of exported.sheets) {
    const cells = await exported.cellsOf(name);
    const tpl = await template.cellsOf(name);
    for (const [ref, c] of cells) {
      if (!(c.t === 's' || c.t === 'str' || c.t === 'inlineStr')) continue;
      if (!looksLikeDate(c.text.trim())) continue;
      if (tpl.get(ref)?.text === c.text) continue;
      offenders.push(`'${name}'!${ref} = ${JSON.stringify(c.text)}`);
    }
  }
  return offenders;
}

function expectSerial(cell: Cell | undefined, serial: number, label: string) {
  expect(cell, `${label}: cell is present`).toBeTruthy();
  expect(cell!.t, `${label}: a date cell is numeric -- no t attribute, not a shared string`).toBeNull();
  expect(cell!.text, `${label}: the serial`).toBe(String(serial));
}

async function exportExcel(page: Page, selector: string) {
  await page.evaluate(() => (window as any).flushPendingSave());
  await page.evaluate(() => (window as any).navigate('/print'));
  const button = page.locator(selector);
  await expect(button).toBeEnabled({ timeout: 20_000 });
  const dl = page.waitForEvent('download', { timeout: 40_000 });
  await button.click();
  return readAll(await (await dl).createReadStream());
}

test.describe('Milestone 67E: exported dates are dates, not text', () => {
  test('Annual: exact cells, the four unformatted template cells, coverage, and a round trip across the year boundary', async ({ page }) => {
    test.setTimeout(240_000);
    await freshStartNoPassword(page);
    await createWard(page, 'Date Cells Annual Ward', 'annual');
    await fillMinimalValidAnnualWard(page);
    await page.evaluate(() => {
      const d = (window as any).D;
      // The inception date sits on the far side of the year boundary from the
      // period, and one Schedule B-1 row reaches the court-order-date column
      // the template left unformatted.
      d.gid = '2025-12-31';
      d.schB1 = [{ bankAcct: '1234', checkNo: '101', periodFrom: '2026-02-01', periodTo: '2026-02-28', datePaid: '2026-03-04', payee: 'Sample Attorney', courtOrderDate: '2026-02-15', amount: '100' }];
      (window as any).autoSave();
    });
    const bytes = await exportExcel(page, '[data-annual-action="save-excel"]');
    const wb = await openWorkbook(bytes);

    const p1 = await wb.cellsOf('PART I');
    expectSerial(p1.get('E18'), 46023, 'PART I!E18 period from 2026-01-01');
    expectSerial(p1.get('H18'), 46387, 'PART I!H18 period to 2026-12-31');
    expectSerial(p1.get('F5'), 46022, 'PART I!F5 inception 2025-12-31');
    const p23 = await wb.cellsOf('PART II, III');
    expectSerial(p23.get('D25'), 46392, 'PART II, III!D25 guardian signature 2027-01-05');
    const p45 = await wb.cellsOf('PART IV, V');
    expectSerial(p45.get('H31'), 46392, 'PART IV, V!H31 attorney signature 2027-01-05');
    const p10 = await wb.cellsOf('PART X');
    expectSerial(p10.get('G23'), 46387, 'PART X!G23 certificate date 2026-12-31');
    const b1 = await wb.cellsOf('SCH B-1 ATTORNEY FEES');
    expectSerial(b1.get('F10'), 46054, 'SCH B-1!F10 period from 2026-02-01');
    expectSerial(b1.get('G10'), 46081, 'SCH B-1!G10 period to 2026-02-28');
    expectSerial(b1.get('H10'), 46085, 'SCH B-1!H10 date paid 2026-03-04');
    expectSerial(b1.get('J10'), 46068, 'SCH B-1!J10 court order date 2026-02-15');

    // The template left these two General; a serial in a General cell shows
    // as 46392, so the writer must have given them a date format.
    expect(wb.isDateXf(p45.get('H31')!.s), 'PART IV, V!H31 carries a date format').toBe(true);
    expect(wb.isDateXf(b1.get('J10')!.s), 'SCH B-1!J10 carries a date format').toBe(true);

    // The cells the template formatted keep the court's own format.
    expect(wb.isDateXf(p1.get('E18')!.s)).toBe(true);

    expect(await dateShapedText(wb, await openTemplate('annual')),
      'app-written cells holding date-shaped text (a date writer was missed)').toEqual([]);

    // Round trip. What comes back must be the same calendar day, on both
    // sides of the year boundary.
    const file = path.join(os.tmpdir(), `pg-date-cells-${Date.now()}.xlsx`);
    fs.writeFileSync(file, bytes);
    await createWard(page, 'Date Cells Import Target', 'annual');
    await page.evaluate(() => (window as any).navigate('/'));
    await page.setInputFiles('input[type="file"][accept=".xlsx"]', file);
    await page.waitForFunction(() => (window as any).D.caseNumber === '2026-CP-000789', undefined, { timeout: 20_000 });
    const back = await page.evaluate(() => {
      const d = (window as any).D;
      return {
        gid: d.gid, periodFrom: d.periodFrom, periodTo: d.periodTo,
        certDate: d.certDate, attorneySig: d.attorney_signatureDate,
        b1: d.schB1?.[0] && { periodFrom: d.schB1[0].periodFrom, datePaid: d.schB1[0].datePaid, courtOrderDate: d.schB1[0].courtOrderDate },
      };
    });
    expect(back.gid, '12/31 must come back 12/31 -- not 12/30, not 01/01').toBe('2025-12-31');
    expect(back.periodFrom, '01/01 must come back 01/01').toBe('2026-01-01');
    expect(back.periodTo).toBe('2026-12-31');
    expect(back.certDate).toBe('2026-12-31');
    expect(back.attorneySig).toBe('2027-01-05');
    expect(back.b1).toEqual({ periodFrom: '2026-02-01', datePaid: '2026-03-04', courtOrderDate: '2026-02-15' });
  });

  test('Guardian Inventory: exact cells and coverage', async ({ page }) => {
    test.setTimeout(180_000);
    await freshStartNoPassword(page);
    await createWard(page, 'Date Cells Inventory', 'guardian');
    await fillMinimalValidGuardianWard(page);
    const wb = await openWorkbook(await exportExcel(page, '[data-inventory-action="save-excel"]'));

    const s1 = await wb.cellsOf('SUMMARY I ');
    expectSerial(s1.get('F7'), 46023, 'SUMMARY I!F7 inception 2026-01-01');
    const p5 = await wb.cellsOf('PART V');
    expectSerial(p5.get('E27'), 46023, 'PART V!E27 bond period from 2026-01-01');
    expectSerial(p5.get('G27'), 46388, 'PART V!G27 bond period to 2027-01-01');
    const p4 = await wb.cellsOf('PART IV');
    expectSerial(p4.get('G13'), 46024, 'PART IV!G13 preparer signature 2026-01-02');

    expect(await dateShapedText(wb, await openTemplate('guardian')),
      'app-written cells holding date-shaped text (a date writer was missed)').toEqual([]);
  });

  test('Simplified Accounting: exact cells and coverage', async ({ page }) => {
    test.setTimeout(180_000);
    await freshStartNoPassword(page);
    await createSimplifiedWard(page, 'Date Cells Simplified');
    await fillMinimalValidSimplifiedWard(page);
    const wb = await openWorkbook(await exportExcel(page, '[data-simplified-action="save-excel"]'));

    const p12 = await wb.cellsOf('PARTS I, II ');
    expectSerial(p12.get('E13'), 46023, 'PARTS I, II!E13 period from 2026-01-01');
    expectSerial(p12.get('H13'), 46387, 'PARTS I, II!H13 period to 2026-12-31');
    expectSerial(p12.get('F4'), 46023, 'PARTS I, II!F4 inception 2026-01-01');
    const p56 = await wb.cellsOf('PARTS V, VI ');
    expectSerial(p56.get('H39'), 46392, 'PARTS V, VI!H39 certificate of service date 2027-01-05');

    expect(await dateShapedText(wb, await openTemplate('simplified')),
      'app-written cells holding date-shaped text (a date writer was missed)').toEqual([]);
  });
});
