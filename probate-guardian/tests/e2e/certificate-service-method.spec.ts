import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  freshStartNoPassword, createWard, createSimplifiedWard, reopenFilingWithStoredShape, autoAcceptDynDialogs,
  fillMinimalValidGuardianWard, fillMinimalValidAnnualWard, fillMinimalValidSimplifiedWard, fillMinimalValidPlanAnnualWard,
} from './support/target';
import { readAll } from './support/stream';
import { extractPdfText } from './support/pdf-extract';
import { exportWithWrites, loadWorkbook, cellValue } from './support/workbook-vs-template';

// Milestone 72G, as a filer meets it: the method of service and the ward's
// status, kept apart. The method -- "How were the copies served?" -- prints on
// the PDF on its own line and never reaches the workbook; the ward's status is
// a dropdown that fills the workbook's "Indicate if:" box (Annual K23,
// Simplified J39, Inventory J25). Driven with real clicks and keystrokes;
// workbooks read with ExcelJS; pre-72G workbooks imported through the real
// Import from Excel control.

const go = (page: Page, route: string) => page.evaluate((r) => (window as any).GuardianForms.testing.navigate(r), route);
const field = (page: Page, p: string) => page.evaluate((x) => (window as any).GuardianForms.testing.field(x), p);
const control = (page: Page, tag: 'input' | 'select', p: string) =>
  page.locator(`#main-content ${tag}[data-form-path="${p}"], #main-content ${tag}[data-field-path="${p}"], #main-content ${tag}[data-bind="${p}"]`).first();

async function typeInto(page: Page, p: string, value: string) {
  const input = control(page, 'input', p);
  await input.fill(value);
  await input.blur();
}

async function pdfText(page: Page, selector: string) {
  await page.evaluate(() => (window as any).GuardianForms.testing.save.flush());
  await go(page, '/');
  await go(page, '/print');
  const button = page.locator(selector);
  await expect(button).toBeEnabled({ timeout: 30_000 });
  const dl = page.waitForEvent('download', { timeout: 60_000 });
  await button.click();
  return (await extractPdfText(await readAll(await (await dl).createReadStream()))).replace(/\s+/g, ' ');
}

async function sheetTexts(bytes: Buffer, sheet: string): Promise<Map<string, string>> {
  const wb = await loadWorkbook(bytes);
  const out = new Map<string, string>();
  // cellValue(): the guard's own reader (text, a number, or null) -- ExcelJS's
  // cell.text throws on some of the workbook's cells.
  wb.getWorksheet(sheet).eachRow((row: any) => row.eachCell((cell: any) => { if (!cell.formula) out.set(cell.address, String(cellValue(cell) ?? '')); }));
  return out;
}

// Finished when the workbook's ward name replaces a placeholder only the
// import can overwrite (certificate-old-details.spec.ts's reasoning).
async function importWorkbook(page: Page, bytes: Buffer, until: () => Promise<boolean>) {
  const file = path.join(os.tmpdir(), `pg-72g-${Date.now()}-${Math.random().toString(36).slice(2)}.xlsx`);
  fs.writeFileSync(file, bytes);
  await page.evaluate(() => (window as any).GuardianForms.testing.patchFiling({ wardName: 'Import Pending' }));
  await go(page, '/');
  const dialogs = autoAcceptDynDialogs(page);
  await page.setInputFiles('input[type="file"][accept=".xlsx"]', file);
  await expect.poll(() => field(page, 'wardName'), { timeout: 30_000 }).not.toBe('Import Pending');
  await expect.poll(until, { timeout: 30_000 }).toBe(true);
  // Milestone 73T part 2: finished, its notice dismissed -- the importer empties the file box last.
  await expect.poll(() => page.evaluate(() => !(document.querySelector('input[type="file"][accept=".xlsx"]') as HTMLInputElement | null)?.files?.length), { timeout: 30_000 }).toBe(true);
  dialogs.stop();
}

async function withBox(bytes: Buffer, sheet: string, cell: string, value: string): Promise<Buffer> {
  const wb = await loadWorkbook(bytes);
  wb.getWorksheet(sheet).getCell(cell).value = value;
  return Buffer.from(await wb.xlsx.writeBuffer());
}

test.describe('Milestone 72G: the method on the PDF, the ward\'s status in the workbook', () => {
  for (const form of [
    { label: 'Annual', type: 'annual', fill: fillMinimalValidAnnualWard, route: '/p10', sheet: 'PART X', box: 'K23', pdf: '[data-annual-action="save-pdf"]' },
    { label: 'Simplified', type: 'simplified', fill: fillMinimalValidSimplifiedWard, route: '/p6', sheet: 'PARTS V, VI ', box: 'J39', pdf: '[data-simplified-action="save-pdf"]' },
  ] as const) {
    test(`${form.label}: chosen and typed on the certificate page, both land where they belong and survive reopening`, async ({ page }) => {
      test.setTimeout(300_000);
      await freshStartNoPassword(page);
      if (form.type === 'simplified') await createSimplifiedWard(page, `Service Method ${form.label}`);
      else await createWard(page, `Service Method ${form.label}`, form.type);
      await form.fill(page);
      await go(page, form.route);
      await control(page, 'select', 'certWardStatus').selectOption('Ward is under 14 years old');
      await typeInto(page, 'certIndicator', 'U.S. Mail to each recipient');
      await expect.poll(() => field(page, 'certWardStatus')).toBe('Ward is under 14 years old');
      await expect.poll(() => field(page, 'certIndicator')).toBe('U.S. Mail to each recipient');

      const { bytes } = await exportWithWrites(page, form.type);
      const cells = await sheetTexts(bytes, form.sheet);
      expect(cells.get(form.box), `${form.box} is the ward's status`).toBe('Ward is under 14 years old');
      expect([...cells.values()].some((v) => v.includes('U.S. Mail to each recipient')), 'the method never reaches the workbook').toBe(false);

      const text = await pdfText(page, form.pdf);
      expect(text).toContain('Method of service: U.S. Mail to each recipient');
      expect(text).toContain('Indicate if Ward is: Ward is under 14 years old');

      const reopened = await reopenFilingWithStoredShape(page, {});
      expect(reopened).toMatchObject({ certWardStatus: 'Ward is under 14 years old', certIndicator: 'U.S. Mail to each recipient' });
    });

    test(`${form.label}: a workbook exported before 72G -- "mailed" in the box arrives as the method; a ward's status arrives as the status`, async ({ page }) => {
      test.setTimeout(300_000);
      await freshStartNoPassword(page);
      if (form.type === 'simplified') await createSimplifiedWard(page, `Old Box ${form.label}`);
      else await createWard(page, `Old Box ${form.label}`, form.type);
      await form.fill(page);
      const { bytes } = await exportWithWrites(page, form.type);
      expect(await field(page, 'certIndicatorMigrated'), 'this filing has been opened since 72G').toBe(true);
      const statusBefore = await field(page, 'certWardStatus');

      await importWorkbook(page, await withBox(bytes, form.sheet, form.box, 'mailed'), async () => (await field(page, 'certIndicator')) === 'mailed');
      expect(await field(page, 'certWardStatus'), 'a method says nothing of the ward\'s status').toBe(statusBefore);

      await importWorkbook(page, await withBox(bytes, form.sheet, form.box, 'Ward is under 14 years old'), async () => (await field(page, 'certWardStatus')) === 'Ward is under 14 years old');
      expect(await field(page, 'certIndicator'), 'the filing\'s method is kept').toBe('mailed');
    });
  }

  test('Inventory: D-5 gains the method box; it prints on the PDF and never reaches PART VI', async ({ page }) => {
    test.setTimeout(300_000);
    await freshStartNoPassword(page);
    await createWard(page, 'Service Method Inventory', 'guardian');
    await fillMinimalValidGuardianWard(page);
    await go(page, '/d5');
    await typeInto(page, 'serviceMethod', 'Hand delivery');
    await expect.poll(() => field(page, 'serviceMethod')).toBe('Hand delivery');
    const { bytes } = await exportWithWrites(page, 'guardian');
    const cells = await sheetTexts(bytes, 'PART VI');
    expect(cells.get('J25')).toBe('N/A');
    expect([...cells.values()].some((v) => v.includes('Hand delivery'))).toBe(false);
    const text = await pdfText(page, '[data-inventory-action="save-pdf"]');
    expect(text).toContain('Method of service: Hand delivery');
    const reopened = await reopenFilingWithStoredShape(page, {});
    expect(reopened.serviceMethod).toBe('Hand delivery');
  });

  test('a Plan: the relabelled box prints as its own line', async ({ page }) => {
    test.setTimeout(180_000);
    await freshStartNoPassword(page);
    await createWard(page, 'Service Method Plan', 'planAnnual');
    await fillMinimalValidPlanAnnualWard(page);
    await go(page, '/p12');
    await expect(page.locator('#main-content')).toContainText('How were the copies served?');
    await typeInto(page, 'certIndicator', 'E-mail to the attorney');
    const text = await pdfText(page, '[data-form-action="save-pdf-plan-annual"]');
    expect(text).toContain('Method of service: E-mail to the attorney');
    expect(text).not.toContain('| E-mail to the attorney');
  });
});
