import { test, expect, type Page, type Locator } from '@playwright/test';
import { freshStartNoPassword, createWard, createSimplifiedWard, fillMinimalValidAnnualWard, fillMinimalValidGuardianWard, fillMinimalValidSimplifiedWard, acceptDynDialog, dismissScheduleDocPrompt, expectExportReady, clickExport } from './support/target';
import { readAll } from './support/stream';
import { extractPdfText } from './support/pdf-extract';
import { DECIDED_OVERWRITES } from './support/workbook-vs-template';
import annualTemplate from '../../templates/annual-template.js';
import guardianTemplate from '../../templates/guardian-template.js';
import simplifiedTemplate from '../../templates/simplified-template.js';

// Milestone 71E. The QA filing printed Line 20 $797,229.19 beside Line 30
// $797,229.18 and said they were equal; its next filing's Starting Balance box
// showed `797229.1849999999`; a Trust Accounting created from it started from
// the whole guardianship estate; a ward with more debt than assets had its
// negative Starting Balance turned into $0 whenever the filing opened; and a
// $0.00 Starting Balance was reported missing. Every figure now rounds the way
// the Clerk's workbook displays (71A's measurement), every carry goes through
// one function, and the Starting Balance box keeps what the filer typed.
//
// Workbooks are read from the exported file with ExcelJS (the library the app
// uses) -- never re-imported, which would agree with a broken exporter
// (AGENTS.md section 5, P1/P2).

const ANNUAL_FAMILY = ['annual', 'finalAccounting', 'trustAccounting'] as const;

const field = (page: Page, p: string) => page.evaluate((x) => (window as any).GuardianForms.testing.field(x), p);
const navigate = (page: Page, route: string) => page.evaluate((r) => (window as any).GuardianForms.testing.navigate(r), route);
const issues = (page: Page) => page.evaluate(async () => (await (window as any).GuardianForms.testing.validate.open()).map((e: any) => String(e.message ?? e)));
const activeId = (page: Page) => page.evaluate(() => (window as any).GuardianForms.testing.snapshot().filing.wardId as string);

async function typeInto(box: Locator, text: string) {
  await box.click();
  await box.fill('');
  if (text) await box.pressSequentially(text);
  await box.press('Tab');
}

/** Closes the filing and opens it again from the saved case file. */
async function reopen(page: Page) {
  await page.evaluate(async () => {
    const x = (window as any).GuardianForms.testing;
    await x.save.flush();
    const id = x.snapshot().filing.wardId;
    await x.activateFiling.close();
    await x.activateFiling.open(id);
  });
}

async function convert(page: Page, sourceId: string, target: string) {
  await page.evaluate(([id, to]) => {
    (window as any).__pgConvert = (window as any).GuardianForms.testing.convertFiling.convert(id, to).then(() => (window as any).GuardianForms.testing.snapshot().filing);
  }, [sourceId, target]);
  await acceptDynDialog(page);
  return page.evaluate(() => (window as any).__pgConvert);
}

async function download(page: Page, selector: string): Promise<Buffer> {
  await page.evaluate(() => (window as any).GuardianForms.testing.save.flush());
  await navigate(page, '/print');
  const override = page.locator('#print-doc-container .pdf-preview-blocked [data-preview-action="override"]');
  if (await override.count()) { await override.click(); await acceptDynDialog(page); }
  const button = page.locator(selector);
  await expectExportReady(button, 20_000);
  const dl = clickExport(button, 40_000);
  return readAll(await (await dl).createReadStream());
}

const pdfText = async (page: Page, selector: string) => (await extractPdfText(await download(page, selector))).replace(/\s+/g, ' ');

/**
 * Template formula cells the export replaces with a value, by decision -- the
 * one list, shared with the export guard (support/workbook-vs-template.ts),
 * so a new overwrite fails here as well as there. Both are Guardian #1's name
 * over the form's own link: the Annual's F25 decided 2026-09-19, and the
 * Inventory's 'PART III'!F8 decided 2026-10-01 (Milestone 72A; this spec found
 * it during Milestone 71), each with a warning when the names differ.
 */
const KNOWN_OVERWRITES = DECIDED_OVERWRITES;

/**
 * Loads the exported workbook and the Clerk's template with ExcelJS. Returns
 * the requested input cells' values, and every template formula cell (on a
 * sheet the export kept) that the export holds as a plain value instead.
 * A formula the export rewrote is not listed: blank-page pruning drops the
 * pruned pages from each page-total formula by design
 * (guardian-blank-page-pruning.spec.ts, excel-blank-page-pruning.spec.ts).
 */
async function readWorkbook(page: Page, exported: Buffer, templateB64: string, cells: Array<[string, string]>) {
  await page.addScriptTag({ url: 'lib/exceljs.min.js' });
  await page.waitForFunction(() => typeof (window as any).ExcelJS !== 'undefined');
  return page.evaluate(async ({ bytes, tpl, want }) => {
    const ExcelJS = (window as any).ExcelJS;
    const load = async (buf: ArrayBuffer) => { const wb = new ExcelJS.Workbook(); await wb.xlsx.load(buf); return wb; };
    const out = await load(new Uint8Array(bytes).buffer);
    const bin = atob(tpl);
    const tplBytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) tplBytes[i] = bin.charCodeAt(i);
    const template = await load(tplBytes.buffer);
    const lost: string[] = [];
    let checked = 0;
    template.eachSheet((ts: any) => {
      const os = out.getWorksheet(ts.name);
      if (!os) return; // a blank page the export pruned
      ts.eachRow({ includeEmpty: false }, (row: any) => row.eachCell({ includeEmpty: false }, (cell: any) => {
        if (cell.type !== ExcelJS.ValueType.Formula) return;
        checked++;
        if (os.getCell(cell.address).type !== ExcelJS.ValueType.Formula) lost.push(`'${ts.name}'!${cell.address}`);
      }));
    });
    const values = want.map(([sheet, addr]) => out.getWorksheet(sheet)?.getCell(addr).value ?? null);
    return { values, lost, checked };
  }, { bytes: [...exported], tpl: templateB64, want: cells });
}

test.describe('Milestone 71E: figures that match the Clerk\'s workbook, and carries that match the prior filing', () => {
  for (const type of ANNUAL_FAMILY) {
    test(`${type}: the QA figures print $797,229.19 on both lines, balance, and carry as 797229.19`, async ({ page }) => {
      test.setTimeout(300_000);
      await freshStartNoPassword(page);
      await createWard(page, 'QA Carry Source', type);
      await fillMinimalValidAnnualWard(page);
      // Line 20 is the raw carried Starting Balance the QA filing held (no activity);
      // Line 30 is a 50% share of $1,594,458.37 -- 797229.185 in binary.
      await page.evaluate(() => (window as any).GuardianForms.testing.patchFiling({
        startingBalance: 797229.1849999999, schA: [], schB1: [], schB2: [], schB3: [], schB4: [], schC: [],
        schD1: [{ description: 'Brokerage', accountNo: '1', restricted: 'No', type: 'Stock', fullAmount: 1594458.37, wardPct: 50, restrictedAmt: '' }],
      }));
      const sourceId = await activeId(page);

      await navigate(page, '/p67');
      await expect(page.locator('#main-content .alert-success')).toContainText('Net Assets from Changes (797,229.19) equals Net Assets from Balances (797,229.19)');
      const pdf = await pdfText(page, '[data-annual-action="save-pdf"]');
      expect(pdf).toContain('797,229.19');
      expect(pdf, 'no line prints the other rounding').not.toContain('797,229.18');

      if (type === 'annual') {
        const final = await convert(page, sourceId, 'finalAccounting');
        expect(final.startingBalance, 'rounded to cents, stored as a number').toBe(797229.19);
        expect(final.startingBalanceCarry).toMatchObject({ used: 'line30', value: 797229.19 });
        await navigate(page, '/p2');
        await expect(page.locator('#main-content input[data-field-path="startingBalance"]')).toHaveValue('797229.19');

        await page.evaluate((id) => (window as any).GuardianForms.testing.activateFiling.open(id), sourceId);
        const trust = await convert(page, sourceId, 'trustAccounting');
        expect(trust.startingBalance, 'never the guardianship estate').toBe('');
        await navigate(page, '/p2');
        await expect(page.locator('#main-content [data-starting-balance-notes]')).toContainText('A trust accounting does not start from the guardianship\'s net assets');
      } else {
        // A Final or Trust Accounting's New Year carries its own ending balance
        // (Trust -> Trust is inside the trust boundary).
        await page.evaluate((id) => (window as any).GuardianForms.testing.year.startNew(id), sourceId);
        expect(await field(page, 'startingBalance')).toBe(797229.19);
        expect(await field(page, 'startingBalanceCarry')).toMatchObject({ used: 'line30', value: 797229.19 });
      }
    });

    test(`${type}: -5000 typed into Starting Balance keeps its minus through reopening, the PDF and the workbook; $0.00 is an answer`, async ({ page }) => {
      test.setTimeout(300_000);
      await freshStartNoPassword(page);
      await createWard(page, `Negative ${type}`, type);
      await fillMinimalValidAnnualWard(page);
      await navigate(page, '/p2');
      const box = () => page.locator('#main-content input[data-field-path="startingBalance"]');
      await typeInto(box(), '-5000');
      await expect(box(), 'the minus is kept').toHaveValue('-5000');
      expect(await field(page, 'startingBalance')).toBe(-5000);
      await navigate(page, '/p67');
      await navigate(page, '/p2');
      await expect(box(), 'after leaving the page and coming back').toHaveValue('-5000');
      await reopen(page);
      await navigate(page, '/p2');
      await expect(box(), 'still -5000 after the filing is closed and reopened (it used to become 0)').toHaveValue('-5000');

      expect(await pdfText(page, '[data-annual-action="save-pdf"]'), "the Annual PDF's negative style").toContain('Starting Balance [Net Assets per Prior Report] $-5,000.00');
      const wb = await readWorkbook(page, await download(page, '[data-annual-action="save-excel"]'), annualTemplate, [['PART VI, VII ', 'I8']]);
      expect(wb.values, "'PART VI, VII '!I8 holds the negative number").toEqual([-5000]);
      expect(wb.checked, 'the template has formulas to check').toBeGreaterThan(100);
      expect(wb.lost, 'no template formula on a kept sheet is replaced by a value').toEqual(KNOWN_OVERWRITES.annual);

      await navigate(page, '/p2');
      await typeInto(box(), '0');
      expect(await field(page, 'startingBalance')).toBe(0);
      expect(await issues(page), '$0.00 is an answer').not.toContain('Part II — Starting Balance');
      await typeInto(box(), '');
      expect(await field(page, 'startingBalance'), 'an empty box is blank, not $0').toBe('');
      expect(await issues(page)).toContain('Part II — Starting Balance');
    });

    test(`${type}: a negative ending balance carries into the next filing and survives reopening`, async ({ page }) => {
      test.setTimeout(300_000);
      await freshStartNoPassword(page);
      await createWard(page, `Debts ${type}`, type);
      await fillMinimalValidAnnualWard(page);
      // Debts above assets end the period at -5,000.
      await page.evaluate(() => (window as any).GuardianForms.testing.patchFiling({
        startingBalance: -5000, schA: [], schB1: [], schB2: [], schB3: [], schB4: [], schC: [],
        schD1: [{ description: 'Checking', accountNo: '1', restricted: 'No', type: 'Checking', fullAmount: 1000, wardPct: 100, restrictedAmt: '' }],
        schD5: [{ description: 'Mortgage', loanNo: '9', loanType: 'Home', fullDebt: 6000, wardPct: 100 }],
      }));
      const sourceId = await activeId(page);
      if (type === 'annual') {
        const final = await convert(page, sourceId, 'finalAccounting');
        expect(final.startingBalance).toBe(-5000);
      } else {
        await page.evaluate((id) => (window as any).GuardianForms.testing.year.startNew(id), sourceId);
        expect(await field(page, 'startingBalance')).toBe(-5000);
      }
      await reopen(page);
      await navigate(page, '/p2');
      await expect(page.locator('#main-content input[data-field-path="startingBalance"]')).toHaveValue('-5000');
    });
  }

  test('simplified: -250.5 typed into Starting Balance keeps its minus through reopening, the PDF and the workbook; $0.00 is an answer', async ({ page }) => {
    test.setTimeout(300_000);
    await freshStartNoPassword(page);
    await createSimplifiedWard(page, 'Negative Simplified');
    await fillMinimalValidSimplifiedWard(page);
    await navigate(page, '/p2');
    const box = () => page.locator('#main-content #startingBalance');
    await typeInto(box(), '-250.5');
    await expect(box()).toHaveValue('-250.5');
    expect(await field(page, 'startingBalance')).toBe(-250.5);
    await reopen(page);
    await navigate(page, '/p2');
    await expect(box(), 'still negative after the filing is closed and reopened').toHaveValue('-250.5');

    expect(await pdfText(page, '[data-simplified-action="save-pdf"]'), "the Simplified PDF's negative style").toContain('Line 1 Starting Balance [Net Assets per the Prior Report] $-250.50');
    const wb = await readWorkbook(page, await download(page, '[data-simplified-action="save-excel"]'), simplifiedTemplate, [['PARTS I, II ', 'H19']]);
    expect(wb.values, "'PARTS I, II '!H19 holds the negative number").toEqual([-250.5]);
    expect(wb.checked).toBeGreaterThan(5);
    expect(wb.lost, 'no template formula on a kept sheet is replaced by a value').toEqual(KNOWN_OVERWRITES.simplified);

    await navigate(page, '/p2');
    await typeInto(box(), '0');
    expect(await field(page, 'startingBalance')).toBe(0);
    expect(await issues(page)).not.toContain('Part II — Starting Balance (Line 1)');
    await typeInto(box(), '');
    expect(await field(page, 'startingBalance')).toBe('');
    expect(await issues(page)).toContain('Part II — Starting Balance (Line 1)');
  });

  test('an Inventory PDF and an Annual PDF print the same half-cent value the same way ($1.01, as Excel shows it); the Inventory workbook keeps its formulas', async ({ page }) => {
    test.setTimeout(300_000);
    await freshStartNoPassword(page);
    // 2.01 x 50% is 1.005 -- 1.00499999999999989... in binary. The Inventory
    // PDF printed $1.00 (Math.round(x*100)/100); Excel shows $1.01.
    await createWard(page, 'Half Cent Inventory', 'guardian');
    await fillMinimalValidGuardianWard(page);
    await page.evaluate(() => (window as any).GuardianForms.testing.patchFiling({
      scheduleA1: [{ propertyDescription: 'Half Cent Lot', streetAddress: '1 Main St', cityStateZip: 'Clearwater, FL 33755', notes: '', residence: 'No', income: 'No', fullAssetValue: 2.01, wardPercent: 50 }],
    }));
    await navigate(page, '/a1');
    await dismissScheduleDocPrompt(page);
    const inventoryPdf = await pdfText(page, '[data-inventory-action="save-pdf"]');
    expect(inventoryPdf).toMatch(/Half Cent Lot.*?\$1\.01/);
    expect(inventoryPdf).not.toMatch(/Half Cent Lot.*?\$1\.00 /);
    const wb = await readWorkbook(page, await download(page, '[data-inventory-action="save-excel"]'), guardianTemplate, []);
    expect(wb.checked).toBeGreaterThan(100);
    expect(wb.lost, 'no template formula on a kept sheet is replaced by a value (one, by decision)').toEqual(KNOWN_OVERWRITES.guardian);

    await createWard(page, 'Half Cent Annual', 'annual');
    await fillMinimalValidAnnualWard(page);
    await page.evaluate(() => (window as any).GuardianForms.testing.patchFiling({
      schD1: [{ description: 'Half Cent Account', accountNo: '1', restricted: 'No', type: 'Checking', fullAmount: 2.01, wardPct: 50, restrictedAmt: '' }],
    }));
    const annualPdf = await pdfText(page, '[data-annual-action="save-pdf"]');
    expect(annualPdf).toMatch(/Half Cent Account .*?\$2\.01 50% \$1\.01/);
  });
});
