import { test, expect, type Page, type BrowserContext } from '@playwright/test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  freshStartNoPassword, createWard, createSimplifiedWard,
  fillMinimalValidGuardianWard, fillMinimalValidSimplifiedWard, fillMinimalValidAnnualWard, importWorkbookConfirmed,
} from './support/target';
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

// Until TEST-REVIEW.md Delivery 1M (2026-10-13) two describes here pinned
// seven of the Simplified's and the Inventory's cells by address (the Part II
// figures in their own rows, PART IV-VI boxes, the bond block) with a full
// export per case, and one re-imported the Inventory's workbook. Every cell
// they named is in tests/e2e/support/export-manifests.ts, which the guarded
// describes below check in the exported file (every value in its box, no
// caption or formula changed), and which tests/unit/workbook-contract.spec.js
// writes onto the Clerk's template and round-trips field by field; the 72A
// describe below still re-imports a real export through the Import control.

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

    // The further exports -- "Yes/No and dropdown boxes, export N of M: each
    // box holds its own sequence of answers" -- ran here until Delivery 1M,
    // one full export each. tests/unit/workbook-contract.spec.js runs every
    // coded export of the same manifest onto the Clerk's template; the
    // browser proves run 1 above.
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
