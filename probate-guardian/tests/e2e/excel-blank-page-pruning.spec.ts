import { test as base, expect } from '@playwright/test';
import JSZip from 'jszip';
import { freshStartNoPassword, createWard, fillMinimalValidAnnualWard } from './support/target';
import { extractXlsx } from './support/xlsx-extract';
import { readAll } from './support/stream';

// The court's Annual Accounting workbook ships every printed page of every
// schedule, and the app writes only the pages a filing needs. Without pruning,
// a guardian with one income row and three disbursements filed a workbook of
// 58 sheets, roughly thirty of them blank. The form's own instructions say
// "Remove any blank pages".
//
// Removing them is the easy half. Every blank continuation page is named by a
// formula somewhere else -- each schedule's p1 total reaches into its own
// continuation pages:
//
//   SCH A INCOME p1!H42 = H41+'SCH A INCOME p2'!H38
//   SCH D-1 CASH p1!J59 = J58+'SCH D-1 CASH p2'!J56+'...p3'!J56+'...p4'!J56
//   SCH B-4 SUMMARY p1!I10 = SUM('...p2'!AK8+'...p3'!AM8+...)   (18 of these)
//
// Remove a page and leave those and the schedule total resolves to #REF!,
// silently, in a filed financial document. This spec asserts both halves, and
// separately asserts that a page which IS about to receive data survives --
// pruning a page out from under its own rows would be the worse failure.

const SUMMARY_B4 = 'SCH B-4 OTHER DISB SUMMARY p1';

/** Continuation pages that should never survive a filing that does not fill them. */
const SHOULD_BE_PRUNED = [
  'SCH C CAPITAL ADJ p2', 'SCH C CAPITAL ADJ p3', 'SCH C CAPITAL ADJ p4',
  'SCH D-1 CASH p2', 'SCH D-1 CASH p3', 'SCH D-1 CASH p4',
  'SCH D-2 REAL ESTATE p2', 'SCH D-3 PERSONAL PROP p2',
  'SCH D-4 INTANGIBLE p2', 'SCH D-5 MORTGAGES p2',
  'SCH E BANK TRANS p2', 'SCH E BANK TRANS p3', 'SCH E BANK TRANS p4',
  'SCH F-1 SALES REAL PROP p2', 'SCH F-2 SALES PERSONAL PROP p2',
  'SCH A INCOME p2',
];

/** Pages the court's form always includes, data or not. */
const MUST_SURVIVE = [
  'PART I', 'PART II, III', 'PART VIII', 'PART XI',
  SUMMARY_B4, 'SCH B-4 OTHER DISB p2',
  'SCH A INCOME p1', 'SCH C CAPITAL ADJ p1', 'SCH D-1 CASH p1', 'SCH E BANK TRANS p1',
];

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
    if (/name="([^"]+)"/.exec(tag)?.[1] === sheetName) rid = /r:id="([^"]+)"/.exec(tag)?.[1] ?? null;
  }
  const out = new Map<string, string>();
  if (!rid) return out;
  const xml = await zip.file('xl/' + rels.get(rid)!.replace(/^\//, ''))!.async('string');
  // Cells may be self-closing, and ExcelJS writes ' as &apos; -- decoding
  // matters because every sheet reference in these formulas is quoted.
  const cellRe = /<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g;
  for (let m = cellRe.exec(xml); m; m = cellRe.exec(xml)) {
    const ref = /r="([A-Z]+\d+)"/.exec(m[1])?.[1];
    const f = m[2] ? /<f[^>]*>([\s\S]*?)<\/f>/.exec(m[2]) : null;
    if (ref && f) out.set(ref, decodeXml(f[1]));
  }
  return out;
}

async function exportAnnualXlsx(
  page: import('@playwright/test').Page,
  seed?: (d: any) => void,
) {
  await freshStartNoPassword(page);
  await createWard(page, 'Prune Ward', 'annual');
  await fillMinimalValidAnnualWard(page);
  await page.evaluate((seedSrc) => {
    const d = (window as any).D;
    d.schB4 = [
      { checkNo: '1001', datePaid: '2026-03-04', category: 'Utilities', payee: 'Duke Energy', amount: '184.22' },
      { checkNo: '1002', datePaid: '2026-04-11', category: 'Rent', payee: 'Bayview Apartments', amount: '1250.00' },
      { checkNo: '1003', datePaid: '2026-05-09', category: 'Medical / Pharmacy', payee: 'Walgreens', amount: '42.60' },
    ];
    if (seedSrc) new Function('d', seedSrc)(d);
    (window as any).autoSave();
  }, seed ? seed.toString().replace(/^[^{]*\{/, '').replace(/\}\s*$/, '') : null);
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

// Milestone 59C-2 (C2). Three of these four tests inspect the same default
// export; only the "about to receive data" case seeds different data and so
// must still build its own. Generated once per worker, read-only.
const test = base.extend<Record<string, never>, { prunedAnnual: Buffer }>({
  prunedAnnual: [async ({ browser }, use) => {
    const page = await browser.newPage();
    try {
      await use(await exportAnnualXlsx(page));
    } finally {
      await page.close();
    }
  }, { scope: 'worker', timeout: 180_000 }],
});

test.describe('blank schedule pages are pruned from the Excel export', () => {
  test('unused continuation pages are removed across every schedule', async ({ prunedAnnual }) => {
    const bytes = prunedAnnual;
    const info = await extractXlsx(bytes);

    for (const name of SHOULD_BE_PRUNED) {
      expect(info.sheetNames, `${name} should have been pruned`).not.toContain(name);
    }
    for (const name of MUST_SURVIVE) {
      expect(info.sheetNames, `${name} must never be pruned`).toContain(name);
    }
    // B-4's own register pages: only the one in use.
    const b4 = info.sheetNames.filter((n) => /^SCH B-4 OTHER DISB p\d+$/.test(n));
    expect(b4).toEqual(['SCH B-4 OTHER DISB p2']);
    // The court's form is 58 sheets; a minimal filing should land far below.
    expect(info.sheetNames.length, `sheet count: ${info.sheetNames.length}`).toBeLessThanOrEqual(26);
  });

  test('every schedule total survives the removal without #REF!', async ({ prunedAnnual }) => {
    const bytes = prunedAnnual;

    // Each schedule's p1 total previously reached into the pages just removed.
    for (const [sheet, cell] of [
      ['SCH A INCOME p1', 'H42'],
      ['SCH D-1 CASH p1', 'J59'],
      ['SCH E BANK TRANS p1', 'F42'],
      ['SCH C CAPITAL ADJ p1', 'G56'],
    ] as const) {
      const f = (await formulasOn(bytes, sheet)).get(cell);
      expect(f, `${sheet}!${cell} lost its formula`).toBeTruthy();
      expect(f, `${sheet}!${cell} went to #REF!`).not.toContain('#REF');
      for (const gone of SHOULD_BE_PRUNED) {
        expect(f, `${sheet}!${cell} still names removed page ${gone}`).not.toContain(`'${gone}'!`);
      }
    }

    // And B-4's eighteen category totals, which use the SUM() shape.
    const b4 = await formulasOn(bytes, SUMMARY_B4);
    for (let row = 10; row <= 27; row++) {
      const f = b4.get(`I${row}`);
      expect(f, `B-4 summary I${row} lost its formula`).toBeTruthy();
      expect(f, `B-4 summary I${row} went to #REF!`).not.toContain('#REF');
      expect(f, `B-4 summary I${row} lost its surviving page`).toContain("OTHER DISB p2'!");
    }
  });

  test('a page that is about to receive data is not pruned out from under it', async ({ page }) => {
    test.setTimeout(180_000);
    // Schedule A spills onto p2 from its twenty-first income row. Pruning a
    // page that the writer then fills would lose real financial data, which is
    // a far worse failure than shipping a blank page.
    const bytes = await exportAnnualXlsx(page, (d: any) => {
      d.schA = Array.from({ length: 24 }, (_, i) => ({
        payer: `Payer ${i + 1}`,
        description: 'Monthly benefit',
        bank: 'Sample Bank',
        accountNo: String(1000 + i),
        amount: String(100 + i),
      }));
    });
    const info = await extractXlsx(bytes);
    expect(info.sheetNames, 'SCH A INCOME p2 carries rows 21+ and must survive')
      .toContain('SCH A INCOME p2');

    // The overflow rows really are on it, and its total still adds up.
    const cells = info.getSheetCells('SCH A INCOME p2');
    const text = Object.values(cells).join('');
    expect(text, 'row 21 did not reach p2').toContain('Payer 21');
    expect(text, 'row 24 did not reach p2').toContain('Payer 24');
    const f = (await formulasOn(bytes, 'SCH A INCOME p1')).get('H42');
    expect(f, 'Schedule A total dropped its surviving p2').toContain("'SCH A INCOME p2'!");
  });

  test('the disbursements themselves still reach the surviving page', async ({ prunedAnnual }) => {
    const bytes = prunedAnnual;
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
