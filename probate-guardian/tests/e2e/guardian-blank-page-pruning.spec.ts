import { test as base, expect } from '@playwright/test';
import JSZip from 'jszip';
import path from 'node:path';
import os from 'node:os';
import { freshStartNoPassword, createWard, fillMinimalValidGuardianWard } from './support/target';
import { extractXlsx } from './support/xlsx-extract';
import { readAll } from './support/stream';

// The court's Initial Inventory workbook ships every printed page of all
// eleven schedules -- 21 continuation pages beyond each schedule's first. The
// exporter fills only the pages a filing reaches, so an inventory listing a
// house, two bank accounts and a car used to be filed with 21 pages of empty
// pre-printed grid. The form's own instructions say to remove them.
//
// Removing them is the easy half. Every continuation page is named by its
// schedule's page-1 total:
//
//   A-1-REAL ESTATE pg 1!C48 = I47+'A-1-REAL ESTATE pg 2'!I47+'...pg 3'!I47
//   B-1 CASH pg 1!C56 = 'B-1 CASH pg 4'!I57+'...pg 3'!I57+'...pg 2'!I57+'...pg 1'!I55
//
// Remove a page and leave those and the schedule total resolves to #REF!,
// silently, in a filed court inventory. So this asserts both halves, and
// separately that a page about to receive assets survives -- pruning a page
// out from under its own rows would delete listed property from an inventory,
// which is far worse than shipping a blank page.
//
// The same standard was applied to Annual Accounting first; see
// excel-blank-page-pruning.spec.ts.

/** Continuation pages no minimal filing reaches. */
const SHOULD_BE_PRUNED = [
  'A-1-REAL ESTATE pg 2', 'A-1-REAL ESTATE pg 3',
  'A-2-REAL ESTATE MTG pg 2', 'A-2-REAL ESTATE MTG pg 3',
  'B-1 CASH pg 2', 'B-1 CASH pg 3', 'B-1 CASH pg 4',
  'B-2 PER PROP pg 2', 'B-2 PER PROP pg 3', 'B-2 PER PROP pg 4',
  'B-3 INTANGIBLE pg 2',
  'B-4 PERS PROP LIAB pg 2', 'B-4 PERS PROP LIAB pg 3', 'B-4 PERS PROP LIAB pg 4',
  'C-1 INCOME pg 2', 'C-1 INCOME pg 3',
  'C-2 LAWSUIT AGAINST pg 2',
  'C-3 LAWSUIT BY WARD pg 2',
  'C-4 TRUSTS pg 2',
  'C-5 JOINT OWNERS pg 2', 'C-5 JOINT OWNERS pg 3',
];

/** Pages the court's form always includes, data or not. */
const MUST_SURVIVE = [
  'SUMMARY I ', 'SUMMARY II', 'PART III', 'PART IV', 'PART V', 'PART VI',
  'A-1-REAL ESTATE pg 1', 'A-2-REAL ESTATE MTG pg 1 ', 'B-1 CASH pg 1',
  'B-2 PER PROP pg 1', 'B-3 INTANGIBLE pg 1;', 'B-4 PERS PROP LIAB pg 1',
  'C-1 INCOME pg 1', 'C-2 LAWSUIT AGAINST 1', 'C-3 LAWSUIT BY WARD pg 1',
  'C-4 TRUSTS pg 1', 'C-5 JOINT OWNERS pg 1 ',
];

/**
 * Every page-1 cell that reached into a continuation page. Read out of the
 * shipped workbook; several schedules total more than one column (B-1 totals
 * the account value and its restricted portion separately, B-3 three ways).
 */
const SCHEDULE_TOTALS = [
  ['A-1-REAL ESTATE pg 1', 'I48'],
  ['A-2-REAL ESTATE MTG pg 1 ', 'H56'],
  ['B-1 CASH pg 1', 'I56'],
  ['B-1 CASH pg 1', 'J56'],
  ['B-2 PER PROP pg 1', 'G64'],
  ['B-2 PER PROP pg 1', 'I64'],
  ['B-3 INTANGIBLE pg 1;', 'H68'],
  ['B-3 INTANGIBLE pg 1;', 'I68'],
  ['B-3 INTANGIBLE pg 1;', 'K68'],
  ['B-4 PERS PROP LIAB pg 1', 'H54'],
  ['C-1 INCOME pg 1', 'J55'],
  ['C-2 LAWSUIT AGAINST 1', 'H50'],
  ['C-3 LAWSUIT BY WARD pg 1', 'H51'],
  ['C-4 TRUSTS pg 1', 'K59'],
  ['C-5 JOINT OWNERS pg 1 ', 'H55'],
] as const;

/**
 * Where those page-1 totals are carried forward to. This is the chain the
 * court actually reads -- the summaries, and PART V's bond calculation -- so
 * it is the chain that must not break.
 */
const CARRIED_FORWARD = [
  ['SUMMARY I ', 'G30', "'A-1-REAL ESTATE pg 1'!I48"],
  ['SUMMARY I ', 'G31', "'A-2-REAL ESTATE MTG pg 1 '!H56"],
  ['SUMMARY I ', 'G34', "'B-1 CASH pg 1'!I56"],
  ['SUMMARY I ', 'G35', "'B-2 PER PROP pg 1'!G64"],
  ['SUMMARY I ', 'G36', "'B-3 INTANGIBLE pg 1;'!H68"],
  ['SUMMARY I ', 'G37', "'B-4 PERS PROP LIAB pg 1'!H54"],
  ['SUMMARY II', 'H8', "'C-1 INCOME pg 1'!J55"],
  ['SUMMARY II', 'H10', "'C-3 LAWSUIT BY WARD pg 1'!H51"],
  ['SUMMARY II', 'H11', "'C-4 TRUSTS pg 1'!K59"],
  ['SUMMARY II', 'H12', "'C-5 JOINT OWNERS pg 1 '!H55"],
  ['PART V', 'H18', "'B-1 CASH pg 1'!J56"],
  ['PART V', 'H19', "'B-3 INTANGIBLE pg 1;'!I68"],
] as const;

function decodeXml(text: string): string {
  return text
    .replace(/&apos;/g, "'").replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
}

/** Every formula on one sheet, keyed by cell address. */
async function formulasOn(bytes: Buffer, sheetName: string): Promise<Map<string, string>> {
  const zip = await JSZip.loadAsync(bytes);
  const wbXml = await zip.file('xl/workbook.xml')!.async('string');
  const relsXml = await zip.file('xl/_rels/workbook.xml.rels')!.async('string');
  const rels = new Map<string, string>();
  for (const m of relsXml.matchAll(/Id="([^"]+)"[^>]*Target="([^"]+)"/g)) rels.set(m[1], m[2]);
  // Attribute order is the writer's choice -- ExcelJS does not emit
  // name-then-r:id -- so match the tag and read each attribute separately.
  let rid: string | null = null;
  for (const tag of wbXml.match(/<sheet\b[^>]*\/?>/g) || []) {
    if (decodeXml(/name="([^"]+)"/.exec(tag)?.[1] ?? '') === sheetName) {
      rid = /r:id="([^"]+)"/.exec(tag)?.[1] ?? null;
    }
  }
  const out = new Map<string, string>();
  if (!rid) return out;
  const xml = await zip.file('xl/' + rels.get(rid)!.replace(/^\//, ''))!.async('string');
  const cellRe = /<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g;
  for (let m = cellRe.exec(xml); m; m = cellRe.exec(xml)) {
    const ref = /r="([A-Z]+\d+)"/.exec(m[1])?.[1];
    const f = m[2] ? /<f[^>]*>([\s\S]*?)<\/f>/.exec(m[2]) : null;
    if (ref && f) out.set(ref, decodeXml(f[1]));
  }
  return out;
}

/**
 * A house, two bank accounts and a car -- everything on its schedule's page 1.
 * Rows are complete: an entry missing a required field fails the readiness
 * check and disables the Excel button before any of this is reached.
 */
const SMALL_INVENTORY = {
  scheduleA1: [{
    propertyDescription: 'Homestead residence', streetAddress: '14 Palm Ave',
    cityStateZip: 'Clearwater, FL 33755', notes: 'Primary residence',
    residence: 'Yes', income: 'No', fullAssetValue: 240000, wardPercent: 0.5,
  }],
  scheduleB1: [
    {
      institutionName: 'Bay Bank', accountNumber: '10001111', streetAddress: '1 Bay St',
      cityStateZip: 'Clearwater, FL 33755', restricted: 'No', accountType: 'Checking',
      fullAssetAmount: 8200, wardPercent: 0.5,
    },
    {
      institutionName: 'Gulf Credit Union', accountNumber: '20002222', streetAddress: '2 Gulf Rd',
      cityStateZip: 'Largo, FL 33770', restricted: 'Yes', accountType: 'Savings',
      fullAssetAmount: 31500, wardPercent: 0.5,
    },
  ],
  scheduleB2: [{
    description: '2014 Honda Civic', streetAddress: '14 Palm Ave',
    cityStateZip: 'Clearwater, FL 33755', valuationMethod: 'NADA',
    fullAssetValue: 6400, wardPercent: 0.5, inSafeDepositBox: 'No',
  }],
};

/** Which scheduleNoItems flag a populated schedule has to clear. */
const NO_ITEMS_KEY = (schedule: string) => schedule.replace(/^schedule/, '').toLowerCase();

async function exportGuardianXlsx(
  page: import('@playwright/test').Page,
  inventory: Record<string, unknown[]> = SMALL_INVENTORY,
) {
  await freshStartNoPassword(page);
  await createWard(page, 'Prune Inventory Ward', 'guardian');
  await fillMinimalValidGuardianWard(page);
  await page.evaluate(({ fx, keys }) => {
    const d = (window as any).D;
    Object.assign(d, fx);
    // fillMinimalValidGuardianWard() marks every schedule "no items"; a
    // schedule that now has entries must not still claim to be empty.
    for (const k of keys) if (d.scheduleNoItems) d.scheduleNoItems[k] = false;
    (window as any).autoSave();
  }, { fx: inventory, keys: Object.keys(inventory).map(NO_ITEMS_KEY) });
  await page.evaluate(() => (window as any).flushPendingSave());
  await page.evaluate(() => (window as any).navigate('/print'));
  const excel = page.locator('[data-inventory-action="save-excel"]');
  await expect(excel).toBeEnabled({ timeout: 20_000 });
  const download = page.waitForEvent('download', { timeout: 40_000 });
  await excel.click();
  return { bytes: await readAll(await (await download).createReadStream()), download: await download };
}

// Milestone 59C-2 (C2). Four of these six inspect the same SMALL_INVENTORY
// export. The two that do not are left per-test on purpose: one seeds a
// different inventory, and the round-trip case needs the live Download object
// to feed back into the app, not just the bytes.
const test = base.extend<Record<string, never>, { prunedInventory: Buffer }>({
  prunedInventory: [async ({ browser }, use) => {
    const page = await browser.newPage();
    try {
      await use((await exportGuardianXlsx(page)).bytes);
    } finally {
      await page.close();
    }
  }, { scope: 'worker', timeout: 180_000 }],
});

test.describe('blank Initial Inventory pages are pruned from the Excel export', () => {
  test('every unreached continuation page is removed, every first page kept', async ({ prunedInventory }) => {
    const bytes = prunedInventory;
    const info = await extractXlsx(bytes);

    for (const name of SHOULD_BE_PRUNED) {
      expect(info.sheetNames, `${name} should have been pruned`).not.toContain(name);
    }
    for (const name of MUST_SURVIVE) {
      expect(info.sheetNames, `${name} must never be pruned`).toContain(name);
    }
    // The court's form is 40 sheets; dropping 21 leaves 19.
    expect(info.sheetNames.length, `sheet count: ${info.sheetNames.length}`).toBe(19);
  });

  test('every schedule total survives the removal without #REF!', async ({ prunedInventory }) => {
    const bytes = prunedInventory;

    for (const [sheet, cell] of SCHEDULE_TOTALS) {
      const f = (await formulasOn(bytes, sheet)).get(cell);
      expect(f, `${sheet}!${cell} lost its formula`).toBeTruthy();
      expect(f, `${sheet}!${cell} went to #REF!`).not.toContain('#REF');
      for (const gone of SHOULD_BE_PRUNED) {
        expect(f, `${sheet}!${cell} still names removed page ${gone}`).not.toContain(`'${gone}'!`);
      }
    }
  });

  // A schedule total that survives on its own page is not enough: the
  // summaries and PART V's bond figure read those totals, and that is what the
  // court's reviewer actually looks at.
  test('the summaries still carry every schedule total forward', async ({ prunedInventory }) => {
    const bytes = prunedInventory;
    const cache = new Map<string, Map<string, string>>();
    for (const [sheet, cell, expected] of CARRIED_FORWARD) {
      if (!cache.has(sheet)) cache.set(sheet, await formulasOn(bytes, sheet));
      const f = cache.get(sheet)!.get(cell);
      expect(f, `${sheet}!${cell} lost its formula`).toBeTruthy();
      expect(f, `${sheet}!${cell} went to #REF!`).not.toContain('#REF');
      expect(f, `${sheet}!${cell} no longer reads its schedule total`).toContain(expected);
    }
  });

  test('a page about to receive assets is not pruned out from under it', async ({ page }) => {
    test.setTimeout(180_000);
    // B-1 CASH page 1 holds six accounts; a seventh spills onto page 2.
    // Pruning a page the writer then fills would delete listed property from
    // a court inventory.
    const { bytes } = await exportGuardianXlsx(page, {
      scheduleB1: Array.from({ length: 7 }, (_, i) => ({
        institutionName: `Bank ${i + 1}`, accountNumber: `ACCT-${i + 1}`,
        streetAddress: `${i + 1} Main St`, cityStateZip: 'Clearwater, FL 33755',
        restricted: 'No', accountType: 'Checking',
        fullAssetAmount: 1000 + i, wardPercent: 0.5,
      })),
    });
    const info = await extractXlsx(bytes);
    expect(info.sheetNames, 'B-1 CASH pg 2 carries the seventh account').toContain('B-1 CASH pg 2');
    expect(info.sheetNames, 'B-1 CASH pg 3 is still unreached').not.toContain('B-1 CASH pg 3');

    const text = Object.values(info.getSheetCells('B-1 CASH pg 2')).join('');
    expect(text, 'the seventh account did not reach page 2').toContain('Bank 7');

    const f = (await formulasOn(bytes, 'B-1 CASH pg 1')).get('I56');
    expect(f, 'the cash total dropped its surviving page 2').toContain("'B-1 CASH pg 2'!");
    expect(f, 'the cash total still names removed page 3').not.toContain("'B-1 CASH pg 3'!");
  });

  test('the assets themselves still reach the surviving pages', async ({ prunedInventory }) => {
    const bytes = prunedInventory;
    const info = await extractXlsx(bytes);

    expect(Object.values(info.getSheetCells('A-1-REAL ESTATE pg 1')).join(''))
      .toContain('Homestead residence');
    const cash = Object.values(info.getSheetCells('B-1 CASH pg 1')).join('');
    expect(cash).toContain('Bay Bank');
    expect(cash).toContain('Gulf Credit Union');
    expect(Object.values(info.getSheetCells('B-2 PER PROP pg 1')).join(''))
      .toContain('2014 Honda Civic');
  });

  // Pruning would be worthless if the filer could not reopen what they filed.
  // parseInitialInventoryWorkbook() skips a page that is not in the file, so a
  // pruned workbook should read back exactly the entries it was written with.
  test('a pruned workbook reads back into the app unchanged', async ({ page }) => {
    test.setTimeout(240_000);
    const { download } = await exportGuardianXlsx(page);
    const file = path.join(os.tmpdir(), `pg-guardian-prune-${Date.now()}.xlsx`);
    await download.saveAs(file);

    await createWard(page, 'Pruned Import Target', 'guardian');
    await page.evaluate(() => (window as any).navigate('/'));
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.setInputFiles('input[type="file"][accept=".xlsx"]', file);
    await page.waitForFunction(
      () => ((window as any).D?.scheduleA1 || []).length > 0,
      undefined,
      { timeout: 20_000 },
    );

    const back = await page.evaluate(() => {
      const d = (window as any).D;
      return {
        a1: (d.scheduleA1 || []).map((r: any) => r.propertyDescription),
        b1: (d.scheduleB1 || []).map((r: any) => r.institutionName),
        b2: (d.scheduleB2 || []).map((r: any) => r.description),
      };
    });

    // Case-insensitive: the importer title-cases free text through
    // capitalizeImportedFields(), so 'Homestead residence' comes back
    // 'Homestead Residence'. What matters here is that nothing was lost.
    const lower = (xs: string[]) => xs.map((x) => String(x).toLowerCase());
    expect(errors, `page errors during import: ${errors.join('\n')}`).toEqual([]);
    expect(lower(back.a1)).toEqual(['homestead residence']);
    expect(lower(back.b1)).toEqual(['bay bank', 'gulf credit union']);
    expect(lower(back.b2)).toEqual(['2014 honda civic']);
  });
});
