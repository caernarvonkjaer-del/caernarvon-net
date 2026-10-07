import { test, expect, type Page, type BrowserContext } from '@playwright/test';
import JSZip from 'jszip';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  freshStartNoPassword, createWard, createSimplifiedWard,
  fillMinimalValidGuardianWard, fillMinimalValidSimplifiedWard, fillMinimalValidAnnualWard, importWorkbookConfirmed,
} from './support/target';
import { readAll } from './support/stream';
import {
  exportWithWrites, templateWorkbook, loadWorkbook, integrityProblems, placementProblems,
  completenessProblems, templateValue, DECIDED_OVERWRITES, type FormName, type Write,
} from './support/workbook-vs-template';
import {
  inventoryManifest, annualManifest, simplifiedManifest, codedRuns, codeFinite, finiteExpected, setPath,
  type Manifest, type Coding,
} from './support/export-manifests';

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
  await page.evaluate((m) => { (window as any).GuardianForms.testing.patchFiling(m); }, MONEY);
  await page.evaluate(() => (window as any).GuardianForms.testing.save.flush());
  await page.evaluate(() => (window as any).GuardianForms.testing.navigate('/print'));
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
    const d = (window as any).GuardianForms.testing.snapshot().filing;
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
      // Milestone 72B: required once an attorney is entered.
      email: 'atty@example.com',
      streetAddress: 'ATTY-STREET', cityStateZip: 'ATTY-CITY',
      signatureDate: '2026-05-05', filingDate: '2026-06-06',
    };
    d.serviceAttorney = {
      name: 'SVC-NAME', barNumber: 'SVC-BAR', phone: 'SVC-PHONE',
      streetAddress: 'SVC-STREET', cityStateZip: 'SVC-CITY', signatureDate: '2026-07-07',
    };
    d.serviceDate = '2026-08-08';
    (window as any).GuardianForms.testing.replaceFiling(d);
  }, INV);
  await page.evaluate(() => (window as any).GuardianForms.testing.save.flush());
  await page.evaluate(() => (window as any).GuardianForms.testing.navigate('/print'));
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
    // Milestone 67E: dates are Excel serials now, not ISO text -- 2026-02-02
    // is 46055 and 2027-03-03 is 46449 (excel-date-cells.spec.ts owns the
    // date contract; these pin placement).
    expect(c.get('E27')?.text, 'the bond period start box').toBe('46055');
    expect(c.get('G27')?.text, 'the bond period end box').toBe('46449');
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
    expect(c.get('G13')?.text, 'preparer signature 2026-04-04 as a serial').toBe('46116');
    // Milestone 64A-2, item 2.5. H8 is the workbook's own "Date " caption and
    // H9 the box beneath it; B9 beside them stays the SUMMARY I ward-name
    // formula, never overwritten.
    expect(c.get('H8')?.text, 'the "Date" caption survives').toBe('Date ');
    expect(c.get('H9')?.text, 'the compilation as-of date 2026-04-01 as a serial').toBe('46113');
    expect(c.get('B9')?.formula, 'the ward-name formula survives').toBe("'SUMMARY I '!C7");
    // Two distinct dates on this page, and the name stays linked.
    expect(c.get('C21')?.text, 'the notification Date: 2026-06-06 as a serial').toBe('46179');
    expect(c.get('G26')?.text, 'the Attorney Signature date 2026-05-05 as a serial').toBe('46147');
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
    expect(c.get('G25')?.text, 'the service date 2026-08-08 as a serial').toBe('46242');
    expect(c.get('G27')?.text, 'the attorney signature date 2026-07-07 as a serial').toBe('46210');
    // These two used to be swapped onto each other's cells. Milestone 72H:
    // and they hold D-2's attorney, as PART IV does -- the certificate's
    // attorney is the filing's. The SVC-* values this filing still holds were
    // typed on D-5 before; they are no longer exported.
    expect(c.get('B29')?.text, 'bar number').toBe('ATTY-BAR');
    expect(c.get('J29')?.text, 'street address').toBe('ATTY-STREET');
    expect(c.get('B31')?.text).toBe('ATTY-PHONE');
    expect(c.get('J31')?.text).toBe('ATTY-CITY');
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
    await page.evaluate(() => (window as any).GuardianForms.testing.navigate('/'));
    await importWorkbookConfirmed(page, file);
    await page.waitForFunction(() => ((window as any).GuardianForms.testing.snapshot().filing?.bondAmount || '') !== '', undefined, { timeout: 20_000 });

    const back = await page.evaluate(() => {
      const d = (window as any).GuardianForms.testing.snapshot().filing;
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
    // Milestone 72H: the workbook's certificate boxes hold D-2's values, so
    // the import keeps nothing for the certificate -- nothing to note.
    expect(back.svcBar).toBe('');
    expect(back.svcStreet).toBe('');
  });
});

// ── Milestone 72A: every box every exporter writes ───────────────────────────
//
// The tests above pin particular boxes. These check every box, on every page,
// against the Clerk's own workbook (support/workbook-vs-template.ts), for a
// filing filled to the workbook's capacity (support/export-manifests.ts):
//
//   - no caption of the form changed, and no formula changed -- except the
//     decided overwrites below, a box carrying a dropdown (its text is a
//     default to replace), and a page total that lost only the terms naming
//     pages the export removed;
//   - every value in its own box, each value unique to its box;
//   - every write the exporters made is one the manifest names, and none was
//     aimed inside a merge (ExcelJS moves those to the merge's master);
//   - each Yes/No and dropdown box, over a few more exports, holding its own
//     sequence of answers, so a swapped pair cannot pass.
//
// Found by building it: the Inventory's PART III (fifteen captions), C-3 (the
// defendant over each printed Line #) and C-5 (the joint owner's name and
// street swapped against the form's instructions).

// Time limits: about three times what each took on this workstation's D:
// drive (FAT32, where the browser suite runs about twice as slowly as from an
// NTFS copy) with the spec run on its own, 2026-10-02 -- the Inventory's
// capacity filing built and exported in about 30 s and each further export
// took about 9 s; the Annual's (with all 1,382 Schedule B-4 rows) about 56 s
// and 19 s; the Simplified's about 23 s. The suite's 60 s default is left as it is.
type Guarded = { form: FormName; build: () => Manifest; open: (page: Page) => Promise<void>; setup: number; run: number };
const GUARDED: readonly Guarded[] = [
  {
    form: 'guardian', build: inventoryManifest, setup: 120_000, run: 45_000,
    open: async (page) => { await freshStartNoPassword(page); await createWard(page, 'Guard Inventory', 'guardian'); await fillMinimalValidGuardianWard(page); },
  },
  {
    form: 'annual', build: () => annualManifest('Annual'), setup: 180_000, run: 75_000,
    open: async (page) => { await freshStartNoPassword(page); await createWard(page, 'Guard Annual', 'annual'); await fillMinimalValidAnnualWard(page); },
  },
  {
    form: 'simplified', build: simplifiedManifest, setup: 90_000, run: 45_000,
    open: async (page) => { await freshStartNoPassword(page); await createSimplifiedWard(page, 'Guard Simplified'); await fillMinimalValidSimplifiedWard(page); },
  },
];

/**
 * Merges `patch` into the open filing -- objects key by key, arrays index by
 * index -- so the fixture's own fields (the attorney's name, a guardian's
 * flags) survive beside the manifest's.
 */
async function mergeIntoFiling(page: Page, patch: Record<string, unknown>) {
  await page.evaluate((p) => {
    const t = (window as any).GuardianForms.testing;
    const d = t.snapshot().filing;
    const isObj = (v: unknown) => v !== null && typeof v === 'object' && !Array.isArray(v);
    const merge = (into: any, from: any) => {
      for (const [k, v] of Object.entries(from)) {
        if (Array.isArray(v)) {
          if (!Array.isArray(into[k])) into[k] = [];
          v.forEach((item, i) => { if (isObj(item) && isObj(into[k][i])) merge(into[k][i], item); else into[k][i] = item; });
        } else if (isObj(v) && isObj(into[k])) merge(into[k], v);
        else into[k] = v;
      }
    };
    merge(d, p);
    t.replaceFiling(d);
  }, patch);
}

const list = (problems: string[]) => `${problems.length} problem(s):\n${problems.slice(0, 60).join('\n')}${problems.length > 60 ? '\n...' : ''}`;

for (const g of GUARDED) {
  const manifest = g.build();
  const runs = codedRuns(manifest.finite);

  // Not serial: a failed check must not hide the others. The shared export is
  // made once per worker; a failure restarts the worker, which makes it again.
  test.describe(`${g.form}: every box the exporter writes, against the Clerk's workbook`, () => {
    let context: BrowserContext;
    let page: Page;
    let coding: Coding;
    let exported: any;
    let template: any;
    let writes: Write[] = [];

    const finiteExpectations = (run: number) => manifest.finite.map((f) => ({ sheet: f.sheet, cell: f.cell, value: finiteExpected(manifest.finite, coding, f, run), path: `${f.path} (export ${run + 1} of ${runs})` }));

    test.beforeAll(async ({ browser }) => {
      test.setTimeout(g.setup);
      context = await browser.newContext();
      page = await context.newPage();
      await g.open(page);
      template = await templateWorkbook(g.form);
      coding = codeFinite(manifest.finite, (f) => templateValue(template, f.sheet, f.cell));
      const patch = structuredClone(manifest.patch);
      for (const f of manifest.finite) setPath(patch, f.path, coding.answer(f, 0));
      await mergeIntoFiling(page, patch);
      const out = await exportWithWrites(page, g.form);
      writes = out.writes;
      exported = await loadWorkbook(out.bytes);
    });

    test.afterAll(async () => { await context?.close(); });

    test("no caption of the form is changed, and no formula", () => {
      const { problems, formulas, captions } = integrityProblems(template, exported, { overwrites: DECIDED_OVERWRITES[g.form] });
      expect(formulas, 'the template has formulas to check').toBeGreaterThan(5);
      expect(captions, 'the template has captions to check').toBeGreaterThan(20);
      expect(problems, list(problems)).toEqual([]);
    });

    test('every value is in its own box', () => {
      const problems = placementProblems(exported, [...manifest.expectations, ...finiteExpectations(0)]);
      expect(problems, list(problems)).toEqual([]);
    });

    test('every write is a box the manifest names, aimed at the box itself', () => {
      expect(writes.length, 'the recorder saw the export').toBeGreaterThan(manifest.expectations.length / 2);
      const problems = completenessProblems(writes, [...manifest.expectations, ...finiteExpectations(0)]);
      expect(problems, list(problems)).toEqual([]);
    });

    for (let run = 1; run < runs; run++) {
      test(`Yes/No and dropdown boxes, export ${run + 1} of ${runs}: each box holds its own sequence of answers`, async () => {
        test.setTimeout(g.run);
        const patch: Record<string, unknown> = {};
        for (const f of manifest.finite) setPath(patch, f.path, coding.answer(f, run));
        await mergeIntoFiling(page, patch);
        const out = await exportWithWrites(page, g.form);
        const problems = placementProblems(await loadWorkbook(out.bytes), finiteExpectations(run));
        expect(problems, list(problems)).toEqual([]);
      });
    }
  });
}

// ── Milestone 72A: workbooks exported before the fixes still import ─────────
//
// An exported file is put back into the layout the app used to write --
// with ExcelJS, on the file itself -- and imported through the real Import
// from Excel control. The importer reads each field's box, and falls back to
// the old place only where the file shows it was written the old way.

async function importInto(page: Page, form: 'guardian' | 'annual', bytes: Buffer, name: string) {
  const file = path.join(os.tmpdir(), `pg-72a-${form}-${Date.now()}.xlsx`);
  fs.writeFileSync(file, bytes);
  await createWard(page, name, form);
  await page.evaluate(() => (window as any).GuardianForms.testing.navigate('/'));
  // Milestone 73T parts 2 and 3: the import confirms and then gives a notice.
  await importWorkbookConfirmed(page, file);
  await page.waitForFunction((n) => {
    const d = (window as any).GuardianForms.testing.snapshot().filing;
    return d && d.wardName && d.wardName !== n;
  }, name, { timeout: 30_000 });
  return page.evaluate(() => (window as any).GuardianForms.testing.snapshot().filing);
}

test.describe('Milestone 72A: workbooks exported before the fixes still import', () => {
  // About 17 s each on D: (see the time limits above).
  test('Inventory: PART III details on the caption rows, and C-3 written the old way, arrive in their fields; a 72A export round-trips', async ({ page }) => {
    test.setTimeout(60_000);
    await freshStartNoPassword(page);
    await createWard(page, 'Legacy Inventory Source', 'guardian');
    await fillMinimalValidGuardianWard(page);
    await page.evaluate(() => (window as any).GuardianForms.testing.patchFiling({
      wardName: 'Legacy Ward',
      guardians: [
        { name: 'Ann Guardian', signatureDate: '2026-03-04', ssnEin: '111-22-3333', streetAddress: '1 First St', phone: '727-555-0101', cityStateZip: 'Clearwater, FL 33755' },
        { name: 'Bob Coguardian', signatureDate: '2026-03-05', ssnEin: '444-55-6666', streetAddress: '2 Second St', phone: '727-555-0102', cityStateZip: 'Largo, FL 33770' },
      ],
      scheduleC3: [
        { defendantName: 'Big Chain Store', actionDescription: 'Negligence', status: 'Mediation set', courtJurisdiction: 'Civil, Pinellas', caseNumber: '25-0001-CI', actionDate: '2026-02-02', estimatedSettlement: 30000, wardPercent: 100 },
        { defendantName: 'Acme Movers', actionDescription: 'Property Damage', status: 'Demand sent', courtJurisdiction: 'County Court', caseNumber: '', actionDate: null, estimatedSettlement: 5000, wardPercent: 50 },
      ],
      scheduleNoItems: {},
    }));
    const { bytes } = await exportWithWrites(page, 'guardian');

    // A 72A export reads straight back.
    const now = await importInto(page, 'guardian', bytes, 'Round Trip Target');
    expect(now.guardians.slice(0, 2).map((g: any) => [g.ssnEin, g.streetAddress, g.phone, g.cityStateZip, g.signatureDate]))
      .toEqual([['111-22-3333', '1 First St', '727-555-0101', 'Clearwater, FL 33755', '2026-03-04'], ['444-55-6666', '2 Second St', '727-555-0102', 'Largo, FL 33770', '2026-03-05']]);
    expect(now.scheduleC3.map((r: any) => [r.defendantName, r.actionDescription, r.caseNumber]))
      .toEqual([['Big Chain Store', 'Negligence', '25-0001-CI'], ['Acme Movers', 'Property Damage', '']]);

    // The same file, laid out as the app wrote it before 72A.
    const wb = await loadWorkbook(bytes);
    const p3 = wb.getWorksheet('PART III');
    for (const b of [7, 13]) {
      for (const [caption, box] of [[`D${b}`, `D${b + 1}`], [`B${b + 2}`, `B${b + 3}`], [`F${b + 2}`, `F${b + 3}`], [`B${b + 4}`, `B${b + 5}`], [`F${b + 4}`, `F${b + 5}`]]) {
        p3.getCell(caption).value = p3.getCell(box).value;
        p3.getCell(box).value = null;
      }
    }
    const c3 = wb.getWorksheet('C-3 LAWSUIT BY WARD pg 1');
    c3.getCell('B20').value = 'Big Chain Store'; c3.getCell('C20').value = 'Negligence / 25-0001-CI'; c3.getCell('C23').value = null;
    c3.getCell('B25').value = 'Acme Movers'; c3.getCell('C25').value = 'Property Damage'; c3.getCell('C28').value = null;
    const legacy = Buffer.from(await wb.xlsx.writeBuffer());

    const before = await importInto(page, 'guardian', legacy, 'Legacy Import Target');
    expect(before.guardians.slice(0, 2).map((g: any) => [g.ssnEin, g.streetAddress, g.phone, g.cityStateZip, g.signatureDate]), 'the details on the caption rows arrive')
      .toEqual([['111-22-3333', '1 First St', '727-555-0101', 'Clearwater, FL 33755', '2026-03-04'], ['444-55-6666', '2 Second St', '727-555-0102', 'Largo, FL 33770', '2026-03-05']]);
    expect(before.scheduleC3.map((r: any) => [r.defendantName, r.actionDescription, r.caseNumber]), 'the old C-3 layout arrives in its fields')
      .toEqual([['Big Chain Store', 'Negligence', '25-0001-CI'], ['Acme Movers', 'Property Damage', '']]);
  });

  test("Annual: the county arrives from the county box, and from D23 in a workbook exported before 72A", async ({ page }) => {
    test.setTimeout(60_000);
    await freshStartNoPassword(page);
    await createWard(page, 'Legacy Annual Source', 'annual');
    await fillMinimalValidAnnualWard(page);
    await page.evaluate(() => (window as any).GuardianForms.testing.patchFiling({ wardName: 'Legacy Annual Ward', county: 'Pasco' }));
    const { bytes } = await exportWithWrites(page, 'annual');
    const wb = await loadWorkbook(bytes);
    expect(wb.getWorksheet('PART I').getCell('H2').value, "the county is in the form's county box").toBe('Pasco');
    expect(wb.getWorksheet('PART IV, V').getCell('B29').formula, "Part V's Name of county still reads it").toBe("'PART I'!H2");

    expect((await importInto(page, 'annual', bytes, 'Annual Round Trip Target')).county).toBe('Pasco');

    const p1 = wb.getWorksheet('PART I');
    p1.getCell('D23').value = 'Pasco';
    p1.getCell('H2').value = 'Select County';
    const legacy = Buffer.from(await wb.xlsx.writeBuffer());
    expect((await importInto(page, 'annual', legacy, 'Annual Legacy Target')).county, 'the county from D23').toBe('Pasco');
  });
});

// ── Milestones 72B and 73T part 3: Part VIII's share and amount in the Clerk's boxes ──
//
// Milestone 72B: the app wrote each trust's share and amount into the D cells
// beside their captions, which the Clerk's workbook formats as long dates, so
// a 50% share showed as "February 19, 1900"; it gave them the share and money
// formats. Milestone 73T part 3 (row 3): those D cells are locked leaders --
// the Clerk's boxes are H17/H18 (and H27/H28, H37/H38), already formatted as a
// share and an amount, and H8 for "any trust?". Written there now; 0 stays 0
// and an empty slot stays empty; a workbook exported either older way still
// imports the numbers it held.
test.describe("Milestones 72B and 73T: the Annual's Part VIII trusts", () => {
  test("a share and an amount land in the Clerk's boxes as a percentage and dollars; 0 stays 0; an empty trust slot stays empty; the older layouts import", async ({ page }) => {
    test.setTimeout(60_000);
    await freshStartNoPassword(page);
    await createWard(page, 'Part VIII Source', 'annual');
    await fillMinimalValidAnnualWard(page);
    await page.evaluate(() => (window as any).GuardianForms.testing.patchFiling({
      wardName: 'Trust Ward',
      trusts: [
        { hasTrust: 'Yes', createdAfterGID: 'No', name: 'Pooled Trust', trustee: 'Trust Co', accountNo: 'T-1', dateCreated: '2020-05-01', trustType: 'Pooled', wardPct: 50, wardAmount: 12000 },
        { hasTrust: 'Yes', createdAfterGID: 'No', name: 'Remainder Trust', trustee: 'Trust Co', accountNo: 'T-2', dateCreated: '2021-05-01', trustType: 'Special Needs', wardPct: 0, wardAmount: 0 },
        { hasTrust: '', createdAfterGID: '', name: '', trustee: '', accountNo: '', dateCreated: '', trustType: '', wardPct: '', wardAmount: '' },
      ],
    }));
    const { bytes } = await exportWithWrites(page, 'annual');
    const wb = await loadWorkbook(bytes);
    const p8 = wb.getWorksheet('PART VIII');
    expect(p8.getCell('H8').value, '"any trust?" in the Clerk\'s H8').toBe('Yes');
    expect([p8.getCell('H17').value, p8.getCell('H17').numFmt], 'a 50% share is the fraction under the box\'s percentage format').toEqual([0.5, '0.00%']);
    expect(p8.getCell('H18').value, 'the amount is a number').toBe(12000);
    expect(String(p8.getCell('H18').numFmt), "under the box's own number format").not.toMatch(/yy|mmmm/);
    expect([p8.getCell('H27').value, p8.getCell('H28').value], '0% and $0 stay 0').toEqual([0, 0]);
    expect([p8.getCell('H37').value, p8.getCell('H38').value], 'an empty trust slot stays empty, not $0').toEqual([null, null]);
    expect(['D8', 'D17', 'D18', 'D27', 'D28'].map((a) => p8.getCell(a).value), 'nothing in the locked D cells').toEqual([null, null, null, null, null]);

    const file = path.join(os.tmpdir(), `pg-72b-part8-${Date.now()}.xlsx`);
    const reimport = async (buf: Buffer, name: string) => {
      fs.writeFileSync(file, buf);
      await createWard(page, name, 'annual');
      await page.evaluate(() => (window as any).GuardianForms.testing.navigate('/'));
      await importWorkbookConfirmed(page, file);
      await page.waitForFunction(() => ((window as any).GuardianForms.testing.snapshot().filing?.trusts?.[0]?.name || '') !== '', undefined, { timeout: 30_000 });
      return page.evaluate(() => (window as any).GuardianForms.testing.snapshot().filing.trusts.map((t: any) => [t.wardPct, t.wardAmount]));
    };
    expect(await reimport(bytes, 'Part VIII Round Trip'), 'this export reads back').toEqual([[50, 12000], [0, 0], ['', '']]);

    // The layouts before 73T part 3 wrote the D cells and left the H boxes
    // empty: since 72B the fraction and the amount under share and money
    // formats; before it the 0-100 figure and the amount as plain numbers
    // under the template's own date format.
    for (const ref of ['H17', 'H18', 'H27', 'H28']) p8.getCell(ref).value = null;
    for (const [pct, amt, share, amount] of [['D17', 'D18', 0.5, 12000], ['D27', 'D28', 0, 0]] as const) {
      p8.getCell(pct).value = share; p8.getCell(pct).numFmt = '0.00%';
      p8.getCell(amt).value = amount; p8.getCell(amt).numFmt = '"$"#,##0.00';
    }
    expect(await reimport(Buffer.from(await wb.xlsx.writeBuffer()), 'Part VIII Before 73T'), 'an export from 72B to 73T reads back the numbers it held')
      .toEqual([[50, 12000], [0, 0], ['', '']]);
    for (const [pct, amt, share, amount] of [['D17', 'D18', 50, 12000], ['D27', 'D28', 0, 0]] as const) {
      p8.getCell(pct).value = share; p8.getCell(pct).numFmt = '[$-409]mmmm\\ d\\,\\ yyyy;@';
      p8.getCell(amt).value = amount; p8.getCell(amt).numFmt = '[$-409]mmmm\\ d\\,\\ yyyy;@';
    }
    expect(await reimport(Buffer.from(await wb.xlsx.writeBuffer()), 'Part VIII Legacy'), 'an export from before 72B reads back the numbers it held')
      .toEqual([[50, 12000], [0, 0], ['', '']]);
  });
});
