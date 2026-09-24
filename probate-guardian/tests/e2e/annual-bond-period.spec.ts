import { test, expect, type Page } from '@playwright/test';
import JSZip from 'jszip';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { freshStartNoPassword, createWard, fillMinimalValidAnnualWard } from './support/target';
import { readAll } from './support/stream';
import { extractPdfTextItems } from './support/pdf-extract';

// Milestone 67D. The court's Annual workbook fills the Bond Period boxes on
// PART IX for itself: E21 is `=From_Date` and G21 is `=To_Date`, the defined
// names that carry the accounting period. The app used to write its own
// bondPeriodFrom/bondPeriodTo over those two cells -- a blank input wrote
// empty over the formula, a typed one replaced it with a literal -- so every
// Annual, Final and Trust export reached the clerk with the form's own
// mechanism destroyed, and on most filings (the ones where the filer left the
// boxes alone) with the Bond Period simply blank. Excel's repair does not
// restore it, because the formulas were gone before Excel saw the file.
//
// Decided 2026-09-23: the bond period is the accounting period. The app no
// longer writes E21/G21; the PDF falls back to the accounting period when
// the app's own fields are blank so the two filed documents agree; a typed
// bond period that differs is not blocked, but the filer is told in words
// approved for the purpose; and the importer stops reading E21/G21 -- a
// freshly written formula cell carries no computed value, so reading it
// would wipe the field on every round trip -- and takes the accounting
// period instead.
//
// Every assertion here is against the file or PDF a filer actually receives
// (AGENTS.md section 5: never verify a formula survived by re-importing).

const ACCOUNTING = { periodFrom: '2026-01-01', periodTo: '2026-12-31' };
const TYPED = { bondPeriodFrom: '2026-03-01', bondPeriodTo: '2027-02-28' };

const dec = (s: string) => s.replace(/&apos;/g, "'").replace(/&quot;/g, '"')
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');

/** Formula and text of every cell on one sheet, straight out of the file. */
async function sheetCells(bytes: Buffer, sheetName: string) {
  const zip = await JSZip.loadAsync(bytes);
  const wbXml = await zip.file('xl/workbook.xml')!.async('string');
  const relsXml = await zip.file('xl/_rels/workbook.xml.rels')!.async('string');
  const rels = new Map<string, string>();
  for (const m of relsXml.matchAll(/Id="([^"]+)"[^>]*Target="([^"]+)"/g)) rels.set(m[1], m[2]);
  let rid: string | null = null;
  for (const tag of wbXml.match(/<sheet\b[^>]*\/?>/g) || []) {
    if (dec(/name="([^"]+)"/.exec(tag)?.[1] ?? '') === sheetName) rid = /r:id="([^"]+)"/.exec(tag)?.[1] ?? null;
  }
  const out = new Map<string, { formula: string | null; text: string }>();
  if (!rid) return out;
  const xml = await zip.file('xl/' + rels.get(rid)!.replace(/^\//, ''))!.async('string');
  // Self-closing cells are why this cannot be a naive <c ...>...</c> match
  // (AGENTS.md section 10, P2).
  const cellRe = /<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g;
  for (let m = cellRe.exec(xml); m; m = cellRe.exec(xml)) {
    const ref = /r="([A-Z]+\d+)"/.exec(m[1])?.[1];
    if (!ref) continue;
    const body = m[2] ?? '';
    const f = /<f[^>]*>([\s\S]*?)<\/f>/.exec(body)?.[1];
    const v = /<v>([\s\S]*?)<\/v>/.exec(body)?.[1];
    out.set(ref, { formula: f ? dec(f) : null, text: v ?? '' });
  }
  return out;
}

async function annualWard(page: Page, name: string, bond: Record<string, string>) {
  await freshStartNoPassword(page);
  await createWard(page, name, 'annual');
  await fillMinimalValidAnnualWard(page);
  await page.evaluate((b) => { Object.assign((window as any).D, b); (window as any).autoSave(); }, bond);
  await page.evaluate(() => (window as any).flushPendingSave());
}

async function download(page: Page, action: 'save-excel' | 'save-pdf') {
  await page.evaluate(() => (window as any).navigate('/print'));
  const button = page.locator(`[data-annual-action="${action}"]`);
  await expect(button).toBeEnabled({ timeout: 20_000 });
  const dl = page.waitForEvent('download', { timeout: 40_000 });
  await button.click();
  return readAll(await (await dl).createReadStream());
}

/**
 * The Bond Period under Bond Policy Details, from the PDF's own text. The
 * value is drawn as two runs -- "From: …" then "To: …" -- so they are read
 * from the items that follow the "Bond Period" label and joined.
 */
async function bondPeriodLine(pdf: Buffer) {
  const pages = await extractPdfTextItems(pdf);
  const page = pages.find((items) => items.some((s) => s.includes('Bond Policy Details')));
  expect(page, 'the PDF has a Bond Policy Details block').toBeTruthy();
  // Milestone 68D wraps the grid's values at the real column width, so the
  // Bond Period now spans two lines ("From: 03/01/2026   To:" / "02/28/2027")
  // and pdf.js splits each line at its gaps. Read the dates out of the runs
  // that follow the label rather than expecting one run per endpoint.
  const after = page!.slice(page!.indexOf('Bond Period') + 1, page!.indexOf('Bond Period') + 9).join(' ').replace(/\s+/g, ' ');
  const m = /From: (\d{2}\/\d{2}\/\d{4}) To: (\d{2}\/\d{2}\/\d{4})/.exec(after);
  expect(m, `"From: <date> To: <date>" after the Bond Period label: ${JSON.stringify(after)}`).toBeTruthy();
  return `From: ${m![1]} To: ${m![2]}`;
}

test.describe('Milestone 67D: the Bond Period is the accounting period', () => {
  test('the exported workbook keeps the form\'s own Bond Period formulas, and a re-import takes the accounting period', async ({ page }) => {
    test.setTimeout(240_000);
    await annualWard(page, 'Bond Period Formula Ward', TYPED);
    const bytes = await download(page, 'save-excel');

    const p9 = await sheetCells(bytes, 'PART IX ');
    expect(p9.get('E21')?.formula, 'Bond Period From is the workbook\'s =From_Date, not a literal').toBe('From_Date');
    expect(p9.get('G21')?.formula, 'Bond Period To is the workbook\'s =To_Date, not a literal').toBe('To_Date');
    // The names those formulas resolve to still carry the accounting period.
    const p1 = await sheetCells(bytes, 'PART I');
    expect(p1.get('E18')?.text, 'the accounting period start is in the file').toBeTruthy();
    expect(p1.get('H18')?.text, 'the accounting period end is in the file').toBeTruthy();

    // Re-import. A freshly written formula cell has no computed value, so the
    // importer must not read E21/G21 at all: it derives the bond period from
    // the accounting period it just read from PART I.
    const file = path.join(os.tmpdir(), `pg-bond-period-${Date.now()}.xlsx`);
    fs.writeFileSync(file, bytes);
    await createWard(page, 'Bond Period Import Target', 'annual');
    await page.evaluate(() => (window as any).navigate('/'));
    await page.setInputFiles('input[type="file"][accept=".xlsx"]', file);
    await page.waitForFunction(() => (window as any).D.caseNumber === '2026-CP-000789', undefined, { timeout: 20_000 });
    const back = await page.evaluate(() => {
      const d = (window as any).D;
      return { periodFrom: d.periodFrom, periodTo: d.periodTo, bondPeriodFrom: d.bondPeriodFrom, bondPeriodTo: d.bondPeriodTo };
    });
    expect(back.periodFrom).toBe(ACCOUNTING.periodFrom);
    expect(back.periodTo).toBe(ACCOUNTING.periodTo);
    expect(back.bondPeriodFrom, 'the typed bond period is not read back; the accounting period is').toBe(ACCOUNTING.periodFrom);
    expect(back.bondPeriodTo).toBe(ACCOUNTING.periodTo);
  });

  test('the print page says, in the approved words, that a differing typed bond period will not reach the Excel', async ({ page }) => {
    await annualWard(page, 'Bond Period Advisory Ward', TYPED);
    await page.evaluate(() => (window as any).navigate('/print'));

    const advisory = page.locator('#main-content .alert-warning li', { hasText: 'The bond period entered differs from the accounting period' });
    await expect(advisory, 'one line per differing edge').toHaveCount(2);
    await expect(advisory.first()).toContainText('The filed Excel will show the accounting period.');
    // Values are named so the filer can see which is which.
    await expect(advisory.first()).toContainText('2026-03-01');
    await expect(advisory.first()).toContainText('2026-01-01');

    // Bond period equal to the accounting period: nothing to say.
    await page.evaluate((b) => { Object.assign((window as any).D, b); (window as any).autoSave(); }, ACCOUNTING);
    await page.evaluate(() => { const w = window as any; w.D.bondPeriodFrom = w.D.periodFrom; w.D.bondPeriodTo = w.D.periodTo; w.autoSave(); });
    await page.evaluate(() => (window as any).navigate('/print'));
    await expect(advisory).toHaveCount(0);

    // Blank bond period: the form derives it, and warning would push the
    // filer to fill in what the form fills for them.
    await page.evaluate(() => { const w = window as any; w.D.bondPeriodFrom = ''; w.D.bondPeriodTo = ''; w.autoSave(); });
    await page.evaluate(() => (window as any).navigate('/print'));
    await expect(advisory).toHaveCount(0);
  });

  test('the PDF prints the typed bond period, and the accounting period when none is typed', async ({ page }) => {
    test.setTimeout(240_000);
    await annualWard(page, 'Bond Period PDF Ward', TYPED);
    expect(await bondPeriodLine(await download(page, 'save-pdf'))).toBe('From: 03/01/2026 To: 02/28/2027');

    // Left blank, the PDF must agree with the Excel, which the form fills
    // from the accounting period.
    await page.evaluate(() => { const w = window as any; w.D.bondPeriodFrom = ''; w.D.bondPeriodTo = ''; w.autoSave(); });
    await page.evaluate(() => (window as any).flushPendingSave());
    expect(await bondPeriodLine(await download(page, 'save-pdf'))).toBe('From: 01/01/2026 To: 12/31/2026');
  });
});
