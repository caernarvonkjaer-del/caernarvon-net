import { test as base, expect } from '@playwright/test';
import JSZip from 'jszip';
import { freshStartNoPassword, createWard, fillMinimalValidAnnualWard, fillMinimalValidGuardianWard } from './support/target';
import { readAll } from './support/stream';

// The court's workbooks propagate their headers by DEFINED NAME, not by cell
// reference. 'SCH A INCOME p1'!D2 is literally `=Name_of_Ward`. In the Annual
// template Name_of_Ward is named by 88 formulas, Case_Number by 86 and
// Filing_Type by 86 -- about 270 cells -- and the Guardian template's county
// and Yes/No dropdowns list their options by name.
//
// saveWorkbookFile() used to wipe every defined name before writing, so all of
// those resolved to #NAME? in the filed workbook and the dropdowns lost their
// lists. Nothing caught it because the app's own importer reads cells by
// address and never evaluates a formula -- the same blind spot that hid the
// Simplified Part I row shift.
//
// So this asserts against the exported file: the names the formulas need are
// present, and the formulas still name them.
//
// Print areas are deliberately included. They are not defined names as far as
// ExcelJS is concerned -- it keeps them on worksheet.pageSetup -- but they are
// stored as one in the file, keyed by a POSITIONAL localSheetId. Milestone
// 57D's twelve-account extension inserted 32 sheets ahead of PART XI and left
// its print area pointing at index 57, which had become a B-4 register page:
// that page shipped clipped to A1:G32 and PART XI shipped with no print area
// at all.

const NS_ANNUAL = ['Name_of_Ward', 'Case_Number', 'Filing_Type', 'From_Date', 'To_Date', 'Guardian', 'Attorney'];
const NS_GUARDIAN = ['countyname', 'yesORno'];

const dec = (s: string) => s.replace(/&apos;/g, "'").replace(/&quot;/g, '"')
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');

/** The workbook's defined names and its sheet order, straight out of the file. */
async function workbookMeta(bytes: Buffer) {
  const zip = await JSZip.loadAsync(bytes);
  const xml = await zip.file('xl/workbook.xml')!.async('string');
  const sheets = (xml.match(/<sheet\b[^>]*\/?>/g) || [])
    .map((t) => dec(/name="([^"]+)"/.exec(t)?.[1] ?? ''));
  const defined = new Map<string, { localSheetId: string | null; target: string }>();
  for (const m of xml.matchAll(/<definedName\b([^>]*)>([\s\S]*?)<\/definedName>/g)) {
    const name = dec(/name="([^"]+)"/.exec(m[1])?.[1] ?? '');
    const localSheetId = /localSheetId="(\d+)"/.exec(m[1])?.[1] ?? null;
    // Print areas repeat the name per sheet; key those by name+id.
    defined.set(localSheetId && name.startsWith('_xlnm.') ? `${name}#${localSheetId}` : name,
      { localSheetId, target: dec(m[2]) });
  }
  return { sheets, defined, zip };
}

/** Every formula on one sheet, by address. */
async function formulasOn(zip: JSZip, sheetName: string) {
  const wbXml = await zip.file('xl/workbook.xml')!.async('string');
  const relsXml = await zip.file('xl/_rels/workbook.xml.rels')!.async('string');
  const rels = new Map<string, string>();
  for (const m of relsXml.matchAll(/Id="([^"]+)"[^>]*Target="([^"]+)"/g)) rels.set(m[1], m[2]);
  let rid: string | null = null;
  for (const tag of wbXml.match(/<sheet\b[^>]*\/?>/g) || []) {
    if (dec(/name="([^"]+)"/.exec(tag)?.[1] ?? '') === sheetName) rid = /r:id="([^"]+)"/.exec(tag)?.[1] ?? null;
  }
  const out = new Map<string, string>();
  if (!rid) return out;
  const xml = await zip.file('xl/' + rels.get(rid)!.replace(/^\//, ''))!.async('string');
  const cellRe = /<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g;
  for (let m = cellRe.exec(xml); m; m = cellRe.exec(xml)) {
    const ref = /r="([A-Z]+\d+)"/.exec(m[1])?.[1];
    const f = m[2] ? /<f[^>]*>([\s\S]*?)<\/f>/.exec(m[2])?.[1] : undefined;
    if (ref && f) out.set(ref, dec(f));
  }
  return out;
}

async function exportAnnual(page: import('@playwright/test').Page) {
  await freshStartNoPassword(page);
  await createWard(page, 'Defined Names Ward', 'annual');
  await fillMinimalValidAnnualWard(page);
  await page.evaluate(() => (window as any).flushPendingSave());
  await page.evaluate(() => (window as any).navigate('/print'));
  const excel = page.locator('[data-annual-action="save-excel"]');
  await expect(excel).toBeEnabled({ timeout: 20_000 });
  const dl = page.waitForEvent('download', { timeout: 40_000 });
  await excel.click();
  return readAll(await (await dl).createReadStream());
}

async function exportGuardian(page: import('@playwright/test').Page) {
  await freshStartNoPassword(page);
  await createWard(page, 'Defined Names Inventory', 'guardian');
  await fillMinimalValidGuardianWard(page);
  await page.evaluate(() => (window as any).flushPendingSave());
  await page.evaluate(() => (window as any).navigate('/print'));
  const excel = page.locator('[data-inventory-action="save-excel"]');
  await expect(excel).toBeEnabled({ timeout: 20_000 });
  const dl = page.waitForEvent('download', { timeout: 40_000 });
  await excel.click();
  return readAll(await (await dl).createReadStream());
}

// Milestone 59C-2 (C2). Four of the five tests below inspect the SAME Annual
// workbook, and each used to generate its own: fresh start, create ward, fill
// it, navigate to print, click export, wait for the download. That is the
// expensive part of this file by a wide margin -- the unzip-and-read that
// follows is milliseconds.
//
// A worker-scoped fixture generates it once and hands the same immutable
// bytes to each test. test.step() would not do: it shares nothing between
// separate test() declarations. The fixture owns its own page and closes it.
//
// The bytes are READ ONLY. If a future test needs to mutate the workbook or
// round-trip it through the app, it must export its own copy rather than
// mutating this one -- see excel-pruned-roundtrip.spec.ts, which is left
// per-test for exactly that reason.
//
// Accepted trade (recorded in MILESTONE-59-PROPOSAL.md): a failure during
// this one export now fails all four tests together instead of one, and the
// per-test independence that makes a failure easy to localise is reduced.
const test = base.extend<Record<string, never>, { annualWorkbook: Buffer }>({
  annualWorkbook: [async ({ browser }, use) => {
    const page = await browser.newPage();
    try {
      await use(await exportAnnual(page));
    } finally {
      await page.close();
    }
  }, { scope: 'worker', timeout: 180_000 }],
});

test.describe('the exported workbook keeps the names its formulas depend on', () => {
  test('Annual keeps every header-propagation name', async ({ annualWorkbook }) => {
    const { defined } = await workbookMeta(annualWorkbook);
    for (const name of NS_ANNUAL) {
      expect([...defined.keys()], `${name} was stripped; ~270 formulas resolve to #NAME? without it`)
        .toContain(name);
    }
    expect(defined.get('Name_of_Ward')?.target).toContain('PART I');
    expect(defined.get('Case_Number')?.target).toContain('PART I');
  });

  test('the formulas that use those names are still there to use them', async ({ annualWorkbook }) => {
    const { zip, defined } = await workbookMeta(annualWorkbook);
    const f = await formulasOn(zip, 'SCH A INCOME p1');
    // D2 is the ward-name header on the schedule page.
    expect(f.get('D2'), 'the header formula is gone').toBe('Name_of_Ward');
    expect([...defined.keys()], 'the formula names something the file no longer defines')
      .toContain('Name_of_Ward');
  });

  test('Guardian keeps the names its dropdowns list options by', async ({ page }) => {
    test.setTimeout(180_000);
    const { defined } = await workbookMeta(await exportGuardian(page));
    for (const name of NS_GUARDIAN) {
      expect([...defined.keys()], `${name} was stripped; its dropdown loses its list`)
        .toContain(name);
    }
  });

  // Custom-view leftovers are per-user Excel metadata, meaningless in a filed
  // form, and three of them point at #REF! in the template. ExcelJS drops the
  // .wvu.Cols ones on load; this pins that none of the rest is written back.
  test('per-user custom-view names are not carried into the filing', async ({ annualWorkbook }) => {
    const { defined } = await workbookMeta(annualWorkbook);
    const wvu = [...defined.keys()].filter((n) => n.includes('.wvu.'));
    expect(wvu, 'custom-view metadata should not reach a filed workbook').toEqual([]);
    for (const [name, entry] of defined) {
      expect(entry.target, `${name} carries a #REF!`).not.toContain('#REF!');
    }
  });

  // A print area is keyed by positional localSheetId, so inserting sheets
  // silently repoints it. The twelve-account extension did exactly that.
  //
  // Only the export-visible half is asserted here. A self-consistency check on
  // the exported file would be vacuous: ExcelJS regenerates each print area
  // from worksheet.pageSetup, so the name it writes always agrees with the
  // sheet it sits on -- even when it is sitting on the wrong sheet. The
  // template itself is guarded in tests/unit/template-print-areas.spec.js,
  // where the misalignment is actually visible.
  test('PART XI specifically, the one the extension displaced', async ({ annualWorkbook }) => {
    const { sheets, defined } = await workbookMeta(annualWorkbook);
    const partXi = [...defined.entries()].find(([n, e]) => n.startsWith('_xlnm.Print_Area') && e.target.includes('PART XI'));
    expect(partXi, 'PART XI lost its print area').toBeTruthy();
    expect(sheets[Number(partXi![1].localSheetId)]).toBe('PART XI');
    // And the register page it had been pointing at has none of its own.
    const strays = [...defined.entries()].filter(([n, e]) =>
      n.startsWith('_xlnm.Print_Area') && /SCH B-4 OTHER DISB p\d+/.test(sheets[Number(e.localSheetId)] ?? ''));
    expect(strays, 'a B-4 register page would print clipped').toEqual([]);
  });
});
