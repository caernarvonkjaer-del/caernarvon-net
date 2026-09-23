import { test as base, expect } from '@playwright/test';
import JSZip from 'jszip';
import path from 'node:path';
import os from 'node:os';
import { freshStartNoPassword, createSimplifiedWard, fillMinimalValidSimplifiedWard } from './support/target';
import { readAll } from './support/stream';

// Simplified Annual Accounting's Part I identity block, checked against the
// exported workbook rather than against the app's own re-import.
//
// That distinction is the whole point of this spec. Every value here used to
// be written one row below its label: the ward's SSN printed over the "From"
// label, the case number under "Attorney for Guardian", the attorney under
// "Guardian", the guardian under "Type of Guardianship", and the type of
// guardianship over the "Part II" section heading. The accounting period
// printed blank, and the Case Number box showed the period end date.
//
// No test caught it for the entire life of the file, because importExcel()
// read the same wrong cells. The app round-tripped its own output perfectly
// while disagreeing with the court's form on every single field -- so a
// round-trip assertion is worth nothing here, and this reads the cells
// directly instead (AGENTS.md section 14).
//
// The court's layout, read out of the shipped template with an XML parser:
// each label sits in column B, its value in the merged D<row>:I<row> beside
// it, except the two rows the workbook fills itself by formula.

const SHEET = 'PARTS I, II ';

const WARD = 'Eleanor Whitfield';
const CASE = '26-CP-004417';
const ATTORNEY = 'Daniel R. Okafor, Esq.';
const GUARDIAN = 'Marcia L. Vance';
const TYPE = 'Plenary';
const SSN = '123-45-6789';
const FROM = '2026-01-01';
const TO = '2026-12-31';
// Milestone 67E: the file holds dates as Excel serials, not ISO text.
// excel-date-cells.spec.ts owns that contract; here they only pin placement.
const FROM_SERIAL = '46023';
const TO_SERIAL = '46387';

const dec = (s: string) => s.replace(/&apos;/g, "'").replace(/&quot;/g, '"')
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');

type Cell = { formula: string | null; text: string };

/** Every cell of one sheet, by address, with formulas kept distinct from values. */
async function sheetCells(bytes: Buffer, sheetName: string): Promise<Map<string, Cell>> {
  const zip = await JSZip.loadAsync(bytes);
  const wbXml = await zip.file('xl/workbook.xml')!.async('string');
  const relsXml = await zip.file('xl/_rels/workbook.xml.rels')!.async('string');
  const rels = new Map<string, string>();
  for (const m of relsXml.matchAll(/Id="([^"]+)"[^>]*Target="([^"]+)"/g)) rels.set(m[1], m[2]);

  const shared: string[] = [];
  const ssFile = zip.file('xl/sharedStrings.xml');
  if (ssFile) {
    const ss = await ssFile.async('string');
    for (const m of ss.matchAll(/<si>([\s\S]*?)<\/si>/g)) {
      shared.push(dec([...m[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((t) => t[1]).join('')));
    }
  }

  let rid: string | null = null;
  for (const tag of wbXml.match(/<sheet\b[^>]*\/?>/g) || []) {
    if (dec(/name="([^"]+)"/.exec(tag)?.[1] ?? '') === sheetName) rid = /r:id="([^"]+)"/.exec(tag)?.[1] ?? null;
  }
  const out = new Map<string, Cell>();
  if (!rid) return out;
  const xml = await zip.file('xl/' + rels.get(rid)!.replace(/^\//, ''))!.async('string');
  // Cells may be self-closing; a pattern that assumes an opening tag walks
  // into the NEXT cell's body and misreports which address owns a formula.
  // That exact mistake is what hid this defect (AGENTS.md section 14).
  const cellRe = /<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g;
  for (let m = cellRe.exec(xml); m; m = cellRe.exec(xml)) {
    const ref = /r="([A-Z]+\d+)"/.exec(m[1])?.[1];
    if (!ref) continue;
    const body = m[2] ?? '';
    const f = /<f[^>]*>([\s\S]*?)<\/f>/.exec(body)?.[1];
    const v = /<v>([\s\S]*?)<\/v>/.exec(body)?.[1];
    const text = v === undefined ? '' : (/t="s"/.test(m[1]) ? (shared[Number(v)] ?? '') : v);
    out.set(ref, { formula: f ? dec(f) : null, text: String(text) });
  }
  return out;
}

async function exportSimplified(page: import('@playwright/test').Page) {
  await freshStartNoPassword(page);
  await createSimplifiedWard(page, WARD);
  await fillMinimalValidSimplifiedWard(page);
  await page.evaluate((v) => {
    const d = (window as any).D;
    d.wardName = v.WARD; d.caseNumber = v.CASE; d.attorney = v.ATTORNEY;
    d.guardian = v.GUARDIAN; d.typeOfGuardianship = v.TYPE; d.ssn = v.SSN;
    d.periodFrom = v.FROM; d.periodTo = v.TO;
    (window as any).autoSave();
  }, { WARD, CASE, ATTORNEY, GUARDIAN, TYPE, SSN, FROM, TO });
  await page.evaluate(() => (window as any).flushPendingSave());
  await page.evaluate(() => (window as any).navigate('/print'));
  const excel = page.locator('[data-simplified-action="save-excel"]');
  await expect(excel).toBeEnabled({ timeout: 20_000 });
  const dl = page.waitForEvent('download', { timeout: 40_000 });
  await excel.click();
  const download = await dl;
  return { bytes: await readAll(await download.createReadStream()), download };
}

// Milestone 59C-2 (C2). Five of these six inspect the same Simplified export.
// The sixth round-trips the file back through the app's importer and needs the
// live Download object, so it still builds its own.
const test = base.extend<Record<string, never>, { simplifiedWorkbook: Buffer }>({
  simplifiedWorkbook: [async ({ browser }, use) => {
    const page = await browser.newPage();
    try {
      await use((await exportSimplified(page)).bytes);
    } finally {
      await page.close();
    }
  }, { scope: 'worker', timeout: 180_000 }],
});

test.describe('Simplified Part I writes each value beside its own label', () => {
  test('every identity field lands in the cell its label points at', async ({ simplifiedWorkbook }) => {
    const cells = await sheetCells(simplifiedWorkbook, SHEET);

    // The header cells the rest of the workbook propagates from.
    expect(cells.get('C4')?.text, 'C4 is the Name of Ward box').toBe(WARD);
    expect(cells.get('H4')?.text, 'H4 is the Case Number box').toBe(CASE);

    // r13 "For the Period": From in E13:F13, To in H13:I13.
    expect(cells.get('E13')?.text, 'period From belongs in E13').toBe(FROM_SERIAL);
    expect(cells.get('H13')?.text, 'period To belongs in H13').toBe(TO_SERIAL);

    // r15/r16/r17, each beside its own label.
    expect(cells.get('D15')?.text, 'D15 is the Attorney for Guardian box').toBe(ATTORNEY);
    expect(cells.get('D16')?.text, 'D16 is the Guardian box').toBe(GUARDIAN);
    expect(cells.get('D17')?.text, 'D17 is the Type of Guardianship box').toBe(TYPE);
  });

  // The regression that started this: writes aimed at E14/H14 fall inside the
  // D14:I14 merge, and ExcelJS redirects a merged-member write to the master.
  // The Case Number formula was the casualty.
  test('the workbook\'s own propagation formulas are left intact', async ({ simplifiedWorkbook }) => {
    const cells = await sheetCells(simplifiedWorkbook, SHEET);

    expect(cells.get('D12')?.formula, 'D12 must still pull the ward name from C4').toBe('C4');
    expect(cells.get('D14')?.formula, 'D14 must still pull the case number from H4').toBe('H4');
    // And specifically not a literal left behind by a stray write.
    expect(cells.get('D14')?.text, 'D14 must not hold a written-in date').not.toBe(TO);
  });

  test('the COVER page still reads the Case Number cell, not a clobbered one', async ({ simplifiedWorkbook }) => {
    const bytes = simplifiedWorkbook;
    const cover = await sheetCells(bytes, 'COVER');
    expect(cover.get('D7')?.formula, 'the cover reads Part I\'s case-number cell')
      .toBe("'PARTS I, II '!D14:I14");
    // D14 is a live formula (asserted above), so the cover resolves to the
    // case number rather than to whatever was last written over it.
    const parts = await sheetCells(bytes, SHEET);
    expect(parts.get('D14')?.formula).toBe('H4');
    expect(parts.get('H4')?.text).toBe(CASE);
  });

  // The court's Simplified form has no ward-SSN field -- its only SSN cells
  // are the guardians' SSN/EIN on PARTS III, IV. The ward's used to go to D13,
  // the printed "From" label, so a required and sensitive value both destroyed
  // a label and appeared unmasked on a form that never asked for it.
  test('the ward\'s SSN is not written anywhere on Part I', async ({ simplifiedWorkbook }) => {
    const cells = await sheetCells(simplifiedWorkbook, SHEET);

    expect(cells.get('D13')?.text, 'D13 is the printed "From" label').toBe('From');
    expect(cells.get('G13')?.text, 'G13 is the printed "To" label').toBe('To');
    for (const [ref, cell] of cells) {
      expect(cell.text, `the ward's SSN must not appear at ${ref}`).not.toContain(SSN);
      expect(cell.text, `bare SSN digits must not appear at ${ref}`).not.toContain('123456789');
    }
  });

  test('the Part II section heading is not overwritten', async ({ simplifiedWorkbook }) => {
    const cells = await sheetCells(simplifiedWorkbook, SHEET);
    expect(cells.get('B18')?.text).toBe('Part II');
    expect(cells.get('D18')?.text, 'D18 is the Part II heading, not a data cell')
      .toContain('ACCOUNTING SUMMARY');
  });

  // The round trip is still worth asserting -- but only after the cells above
  // are pinned independently, since agreeing with a broken exporter is exactly
  // how this went unnoticed.
  test('the identity block round-trips through the corrected cells', async ({ page }) => {
    test.setTimeout(240_000);
    const { download } = await exportSimplified(page);
    const file = path.join(os.tmpdir(), `pg-simplified-part1-${Date.now()}.xlsx`);
    await download.saveAs(file);

    await createSimplifiedWard(page, 'Part I Import Target');
    await page.evaluate(() => (window as any).navigate('/'));
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.setInputFiles('input[type="file"][accept=".xlsx"]', file);
    await page.waitForFunction(
      (w) => (window as any).D.wardName === w,
      WARD,
      { timeout: 20_000 },
    );

    const back = await page.evaluate(() => {
      const d = (window as any).D;
      return {
        caseNumber: d.caseNumber, attorney: d.attorney, guardian: d.guardian,
        typeOfGuardianship: d.typeOfGuardianship,
        periodFrom: d.periodFrom, periodTo: d.periodTo,
      };
    });

    expect(errors, `page errors during import: ${errors.join('\n')}`).toEqual([]);
    expect(back.caseNumber).toBe(CASE);
    expect(back.attorney).toBe(ATTORNEY);
    expect(back.guardian).toBe(GUARDIAN);
    expect(back.typeOfGuardianship).toBe(TYPE);
    // Both period dates used to resolve to the same merge master and come
    // back identical.
    expect(back.periodFrom).toBe(FROM);
    expect(back.periodTo).toBe(TO);
    expect(back.periodFrom).not.toBe(back.periodTo);
  });
});
