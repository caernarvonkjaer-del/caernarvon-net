import { test, expect } from '@playwright/test';
import JSZip from 'jszip';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  freshStartNoPassword, createWard, createSimplifiedWard,
  fillMinimalValidGuardianWard, fillMinimalValidSimplifiedWard,
} from './support/target';
import { readAll } from './support/stream';

// Values land in the court's input boxes, checked against the exported file.
//
// Three filing types had the same defect: a value written onto the cell
// holding the printed caption, leaving the real box empty. Simplified's Part I
// identity block and Part II accounting summary, and Guardian's PART IV/V/VI
// signature and bond pages. Every one survived the whole suite because the
// importer read the same wrong cell, so the round trip agreed with itself.
//
// Simplified Part II was the costly one. Each figure fell on the next Line's
// row, and the two that landed on the total rows never entered the workbook's
// own SUM ranges: a filing reporting 100,000 opening, 2,200 in settlement
// deposits and 4,400 in federal tax was filed with a blank Line 1, Total
// Income of 11, Total Disbursements of 33, and Remaining Assets On Hand of -22
// instead of 97,778.
//
// tests/unit/excel-write-targets.spec.js guards the addresses mechanically.
// This proves the result in the file a filer actually hands the clerk.

const dec = (s: string) => s.replace(/&apos;/g, "'").replace(/&quot;/g, '"')
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');

type Cell = { formula: string | null; text: string };

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

// ── Simplified ───────────────────────────────────────────────────────────────

const MONEY = { startingBalance: 100000, interestIncome: 11, depositsSettlement: 2200, serviceCharges: 33, federalIncomeTax: 4400 };

async function exportSimplified(page: import('@playwright/test').Page) {
  await freshStartNoPassword(page);
  await createSimplifiedWard(page, 'Placement Ward');
  await fillMinimalValidSimplifiedWard(page);
  await page.evaluate((m) => { Object.assign((window as any).D, m); (window as any).autoSave(); }, MONEY);
  await page.evaluate(() => (window as any).flushPendingSave());
  await page.evaluate(() => (window as any).navigate('/print'));
  const excel = page.locator('[data-simplified-action="save-excel"]');
  await expect(excel).toBeEnabled({ timeout: 20_000 });
  const dl = page.waitForEvent('download', { timeout: 40_000 });
  await excel.click();
  return readAll(await (await dl).createReadStream());
}

test.describe('Simplified Part II reports the figures the filer entered', () => {
  test('each Line\'s figure sits in that Line\'s own row', async ({ page }) => {
    test.setTimeout(180_000);
    const c = await sheetCells(await exportSimplified(page), 'PARTS I, II ');
    expect(c.get('H19')?.text, 'Line 1 Starting Balance').toBe('100000');
    expect(c.get('G22')?.text, 'Line 2 Interest Income').toBe('11');
    expect(c.get('G23')?.text, 'Line 3 Deposits pursuant to Settlement').toBe('2200');
    expect(c.get('G27')?.text, 'Line 5 Service Charges').toBe('33');
    expect(c.get('G28')?.text, 'Line 6 Federal Income Tax').toBe('4400');
  });

  // The figures that used to land on the total rows wiped these captions AND
  // fell outside the sums, so the totals were computed from one input each.
  test('the section captions and totals are left to the workbook', async ({ page }) => {
    test.setTimeout(180_000);
    const c = await sheetCells(await exportSimplified(page), 'PARTS I, II ');
    expect(c.get('B20')?.text, 'the Income banner').toBe('Income ');
    expect(c.get('C24')?.text, 'the Total Income caption').toBe('Total Income');
    expect(c.get('C29')?.text, 'the Total Disbursements caption').toBe('Total Disbursements');
    expect(c.get('H24')?.formula, 'Total Income stays a formula').toBe('SUM(G22:G23)');
    expect(c.get('H29')?.formula, 'Total Disbursements stays a formula').toBe('SUM(G27:G28)');
    expect(c.get('H31')?.formula, 'Remaining Assets stays a formula').toBe('H19+H24-H29');
  });

  // Both SUM ranges now see both of their inputs, which is what makes Line 8
  // resolve to 97,778 rather than -22 when the workbook recalculates.
  test('every figure falls inside the range that totals it', async ({ page }) => {
    test.setTimeout(180_000);
    const c = await sheetCells(await exportSimplified(page), 'PARTS I, II ');
    for (const ref of ['G22', 'G23']) expect(c.get(ref)?.text, `${ref} feeds Total Income`).toBeTruthy();
    for (const ref of ['G27', 'G28']) expect(c.get(ref)?.text, `${ref} feeds Total Disbursements`).toBeTruthy();
    const income = Number(c.get('G22')!.text) + Number(c.get('G23')!.text);
    const disb = Number(c.get('G27')!.text) + Number(c.get('G28')!.text);
    expect(income).toBe(2211);
    expect(disb).toBe(4433);
    expect(Number(c.get('H19')!.text) + income - disb).toBe(97778);
  });

  test('the period and linked names stay propagated, not frozen', async ({ page }) => {
    test.setTimeout(180_000);
    const bytes = await exportSimplified(page);
    const p34 = await sheetCells(bytes, 'PARTS III, IV');
    expect(p34.get('C10')?.formula).toBe("'PARTS I, II '!E13");
    expect(p34.get('F10')?.formula).toBe("'PARTS I, II '!H13");
    expect(p34.get('F15')?.formula, "Guardian #1's name is linked to Part I").toBe("'PARTS I, II '!D16");
    const p56 = await sheetCells(bytes, 'PARTS V, VI ');
    expect(p56.get('B11')?.text, 'the "from" caption survived').toContain('from');
    expect(p56.get('D12')?.formula).toBe("'PARTS I, II '!E13");
    expect(p56.get('J17')?.formula, 'the attorney name is linked to Part I').toBe("'PARTS I, II '!D15");
    expect(p56.get('J41')?.formula).toBe("'PARTS I, II '!D15");
  });
});

// ── Initial Inventory ────────────────────────────────────────────────────────

const INV = {
  bondAmount: '25000', bondPeriodFrom: '2026-02-02', bondPeriodTo: '2027-03-03',
  bondingCompany: 'Gulf Surety',
  // Milestone 64A-2, item 2.4.
  serviceIndicateIf: 'N/A',
};

async function exportGuardian(page: import('@playwright/test').Page) {
  await freshStartNoPassword(page);
  await createWard(page, 'Placement Inventory', 'guardian');
  await fillMinimalValidGuardianWard(page);
  await page.evaluate((v) => {
    const d = (window as any).D;
    Object.assign(d, v);
    d.preparer = {
      name: 'PREPARER-NAME', ssnEin: 'PREPARER-SSN', phone: 'PREPARER-PHONE',
      streetAddress: 'PREPARER-STREET', cityStateZip: 'PREPARER-CITY', signatureDate: '2026-04-04',
      // Milestone 64A-2, item 2.5: distinct from the signature date, so a
      // fallback could not make this assertion pass by accident.
      asOfDate: '2026-04-01',
    };
    d.attorney = {
      name: 'ATTY-NAME', barNumber: 'ATTY-BAR', phone: 'ATTY-PHONE',
      streetAddress: 'ATTY-STREET', cityStateZip: 'ATTY-CITY',
      signatureDate: '2026-05-05', filingDate: '2026-06-06',
    };
    d.serviceAttorney = {
      name: 'SVC-NAME', barNumber: 'SVC-BAR', phone: 'SVC-PHONE',
      streetAddress: 'SVC-STREET', cityStateZip: 'SVC-CITY', signatureDate: '2026-07-07',
    };
    d.serviceDate = '2026-08-08';
    (window as any).autoSave();
  }, INV);
  await page.evaluate(() => (window as any).flushPendingSave());
  await page.evaluate(() => (window as any).navigate('/print'));
  const excel = page.locator('[data-inventory-action="save-excel"]');
  await expect(excel).toBeEnabled({ timeout: 20_000 });
  const dl = page.waitForEvent('download', { timeout: 40_000 });
  await excel.click();
  return readAll(await (await dl).createReadStream());
}

test.describe('Initial Inventory fills its boxes, not its captions', () => {
  test('the bond block keeps its captions and fills its boxes', async ({ page }) => {
    test.setTimeout(180_000);
    const c = await sheetCells(await exportGuardian(page), 'PART V');
    expect(c.get('B26')?.text, 'the Bond Amount caption').toBe('Bond Amount');
    expect(c.get('D27')?.text, 'the From: caption').toBe('From:');
    expect(c.get('F27')?.text, 'the To: caption').toBe('To:');
    expect(c.get('G26')?.text, 'the bond amount box').toBe('25000');
    expect(c.get('E27')?.text, 'the bond period start box').toBe('2026-02-02');
    expect(c.get('G27')?.text, 'the bond period end box').toBe('2027-03-03');
    expect(c.get('D28')?.text, 'the bonding company box').toBe('Gulf Surety');
  });

  test('PART IV writes the preparer and attorney into the row below each caption', async ({ page }) => {
    test.setTimeout(180_000);
    const c = await sheetCells(await exportGuardian(page), 'PART IV');
    expect(c.get('I12')?.text, "the Preparer's Name caption").toBe("Preparer's Name");
    expect(c.get('I13')?.text).toBe('PREPARER-NAME');
    expect(c.get('B15')?.text).toBe('PREPARER-SSN');
    expect(c.get('I15')?.text).toBe('PREPARER-STREET');
    expect(c.get('B17')?.text).toBe('PREPARER-PHONE');
    expect(c.get('I17')?.text).toBe('PREPARER-CITY');
    expect(c.get('G13')?.text).toBe('2026-04-04');
    // Milestone 64A-2, item 2.5. H8 is the workbook's own "Date " caption and
    // H9 the box beneath it; B9 beside them stays the SUMMARY I ward-name
    // formula, never overwritten.
    expect(c.get('H8')?.text, 'the "Date" caption survives').toBe('Date ');
    expect(c.get('H9')?.text, 'the compilation as-of date').toBe('2026-04-01');
    expect(c.get('B9')?.formula, 'the ward-name formula survives').toBe("'SUMMARY I '!C7");
    // Two distinct dates on this page, and the name stays linked.
    expect(c.get('C21')?.text, 'the notification Date:').toBe('2026-06-06');
    expect(c.get('G26')?.text, 'the Attorney Signature date').toBe('2026-05-05');
    expect(c.get('I26')?.formula, "the attorney's name is linked to SUMMARY I").toBe("'SUMMARY I '!D24");
    expect(c.get('B28')?.text).toBe('ATTY-BAR');
    expect(c.get('I28')?.text).toBe('ATTY-STREET');
    expect(c.get('B30')?.text).toBe('ATTY-PHONE');
    expect(c.get('I30')?.text).toBe('ATTY-CITY');
  });

  test('PART VI puts the bar number and street address in their own boxes', async ({ page }) => {
    test.setTimeout(180_000);
    const c = await sheetCells(await exportGuardian(page), 'PART VI');
    expect(c.get('B28')?.text, "the Bar Number caption").toBe("Attorney's Bar Number");
    expect(c.get('J28')?.text, 'the Street Address caption').toBe("Attorney's Street Address");
    expect(c.get('G25')?.text, 'the service date').toBe('2026-08-08');
    expect(c.get('G27')?.text, 'the attorney signature date').toBe('2026-07-07');
    // These two used to be swapped onto each other's cells.
    expect(c.get('B29')?.text, 'bar number').toBe('SVC-BAR');
    expect(c.get('J29')?.text, 'street address').toBe('SVC-STREET');
    expect(c.get('B31')?.text).toBe('SVC-PHONE');
    expect(c.get('J31')?.text).toBe('SVC-CITY');
    expect(c.get('J27')?.formula, "the attorney's name is linked").toBe("'SUMMARY I '!D24");
    // Milestone 64A-2, item 2.4. J24 holds the workbook's own pre-printed
    // "Indicate if:" caption (confirmed by reading the real cell -- read-first,
    // not the master check's shorthand, which named J24 for what is really
    // J25); the answer belongs in J25, the caption's own empty box, or
    // writing it would silently destroy the caption (AGENTS.md section 10, P1).
    expect(c.get('J24')?.text, 'the "Indicate if:" caption survives').toBe('Indicate if:');
    expect(c.get('J25')?.text, '"Indicate if:" answer').toBe('N/A');
  });

  test('everything written still reads back into the app', async ({ page }) => {
    test.setTimeout(240_000);
    const bytes = await exportGuardian(page);
    const file = path.join(os.tmpdir(), `pg-placement-${Date.now()}.xlsx`);
    fs.writeFileSync(file, bytes);

    await createWard(page, 'Placement Import Target', 'guardian');
    await page.evaluate(() => (window as any).navigate('/'));
    await page.setInputFiles('input[type="file"][accept=".xlsx"]', file);
    await page.waitForFunction(() => ((window as any).D?.bondAmount || '') !== '', undefined, { timeout: 20_000 });

    const back = await page.evaluate(() => {
      const d = (window as any).D;
      return {
        bondAmount: String(d.bondAmount), bondPeriodFrom: d.bondPeriodFrom, bondPeriodTo: d.bondPeriodTo,
        preparerName: d.preparer?.name, preparerPhone: d.preparer?.phone,
        attyBar: d.attorney?.barNumber, attySig: d.attorney?.signatureDate, attyFiling: d.attorney?.filingDate,
        svcBar: d.serviceAttorney?.barNumber, svcStreet: d.serviceAttorney?.streetAddress,
        serviceIndicateIf: d.serviceIndicateIf,
        preparerAsOf: d.preparer?.asOfDate,
      };
    });
    expect(back.serviceIndicateIf).toBe('N/A'); // Milestone 64A-2, item 2.4.
    expect(back.preparerAsOf).toBe('2026-04-01'); // Milestone 64A-2, item 2.5.
    expect(back.bondAmount).toBe('25000');
    expect(back.bondPeriodFrom).toBe('2026-02-02');
    expect(back.bondPeriodTo).toBe('2027-03-03');
    expect(String(back.preparerName).toUpperCase()).toBe('PREPARER-NAME');
    expect(String(back.attyBar).toUpperCase()).toBe('ATTY-BAR');
    // The signature date never survived a round trip before: it was written to
    // the caption cell and read back from it as the word "Date".
    expect(back.attySig).toBe('2026-05-05');
    expect(back.attyFiling).toBe('2026-06-06');
    expect(String(back.svcBar).toUpperCase()).toBe('SVC-BAR');
    expect(String(back.svcStreet).toUpperCase()).toBe('SVC-STREET');
  });
});
