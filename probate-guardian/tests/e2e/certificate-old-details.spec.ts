import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  freshStartNoPassword, createWard, createSimplifiedWard, reopenFilingWithStoredShape, autoAcceptDynDialogs,
  fillMinimalValidGuardianWard, fillMinimalValidSimplifiedWard,
} from './support/target';
import { exportWithWrites, loadWorkbook } from './support/workbook-vs-template';

// Milestone 72H: the certificate of service's attorney is the filing's
// attorney (D-2 on the Inventory, Part V on the Simplified), as the Clerk's
// workbooks link it. What a filer typed on the old certificate is never
// thrown away unasked: anything that still differs from the filing
// attorney's is listed on the certificate page until the filer clicks
// "Discard old details" -- an explicit deletion (AGENTS.md section 4). Driven
// through the real button and the real Import from Excel control.

const field = (page: Page, p: string) => page.evaluate((x) => (window as any).GuardianForms.testing.field(x), p);
const go = (page: Page, route: string) => page.evaluate((r) => (window as any).GuardianForms.testing.navigate(r), route);
const note = (page: Page) => page.locator('#main-content [data-old-certificate-details]');

// The import is finished when the workbook's ward name replaces a placeholder
// only the import can overwrite -- a check on a value the filing may already
// hold would pass before the import had run.
async function importWorkbook(page: Page, bytes: Buffer, until: () => Promise<boolean>) {
  const file = path.join(os.tmpdir(), `pg-72h-${Date.now()}-${Math.random().toString(36).slice(2)}.xlsx`);
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

/** Rewrites boxes in an exported workbook, as a workbook exported before 72H could hold them. */
async function withBoxes(bytes: Buffer, edits: Array<[string, string, string]>): Promise<Buffer> {
  const wb = await loadWorkbook(bytes);
  for (const [sheet, cell, value] of edits) wb.getWorksheet(sheet).getCell(cell).value = value;
  return Buffer.from(await wb.xlsx.writeBuffer());
}

test.describe('Milestone 72H: details typed on the old certificate', () => {
  test('Inventory: a differing old D-5 Bar number is listed on D-5 until "Discard old details" is clicked, and stays gone after reopening', async ({ page }) => {
    test.setTimeout(120_000);
    await freshStartNoPassword(page);
    await createWard(page, 'Old Certificate Inventory', 'guardian');
    await fillMinimalValidGuardianWard(page);
    // As saved before 72H: D-5 held its own Bar number, and the fill never ran.
    await reopenFilingWithStoredShape(page, {
      certAttorneyMigrated: false,
      serviceAttorney: { name: 'Sample Attorney', barNumber: '01234567', phone: '555-555-5557', streetAddress: '123 Main St', cityStateZip: 'Clearwater, FL 33755', signatureDate: '2026-01-02', signatureState: '', signatureImage: '' },
    });
    await go(page, '/d5');
    // The fill ran once (D-2's Bar number was not blank, so it is unchanged).
    expect(await field(page, 'certAttorneyMigrated')).toBe(true);
    expect(await field(page, 'attorney.barNumber')).toBe('123456');
    await expect(page.locator('#main-content [data-certificate-attorney-line]')).toContainText('Signed by Sample Attorney, Florida Bar # 123456');
    await expect(note(page)).toContainText("Florida Bar #: 01234567. The certificate now prints D-2's (123456).");
    // No D-5 input for the details any more.
    await expect(page.locator('#main-content input[data-bind="serviceAttorney.barNumber"], #main-content input[data-field-path="serviceAttorney.barNumber"]')).toHaveCount(0);

    await note(page).getByRole('button', { name: 'Discard old details' }).click();
    await expect(note(page)).toHaveCount(0);
    const reopened = await reopenFilingWithStoredShape(page, {});
    expect(reopened.serviceAttorney.barNumber).toBe('');
    expect(reopened.serviceAttorney.signatureDate, "the certificate's own signature date is kept").toBe('2026-01-02');
    await go(page, '/d5');
    await expect(page.locator('#main-content [data-certificate-attorney-line]')).toBeVisible();
    await expect(note(page)).toHaveCount(0);
  });

  test('Inventory: workbooks exported before 72H -- a blank D-2 box is filled from the certificate\'s, a differing one is kept and noted, and a 72H export notes nothing', async ({ page }) => {
    test.setTimeout(240_000);
    await freshStartNoPassword(page);
    await createWard(page, 'Old Workbook Inventory', 'guardian');
    await fillMinimalValidGuardianWard(page);
    const { bytes } = await exportWithWrites(page, 'guardian');
    expect(await field(page, 'certAttorneyMigrated'), 'this filing has been opened since 72H').toBe(true);

    // A 72H export holds D-2's details in both places: nothing to note.
    await importWorkbook(page, bytes, async () => (await field(page, 'attorney.barNumber')) === '123456');
    expect(await field(page, 'serviceAttorney.barNumber')).toBe('');
    await go(page, '/d5');
    await expect(note(page)).toHaveCount(0);

    // D-2's Bar number box emptied, the certificate's filled: D-2 arrives filled.
    const blankD2 = await withBoxes(bytes, [['PART IV', 'B28', ''], ['PART VI', 'B29', '07654321']]);
    await importWorkbook(page, blankD2, async () => (await field(page, 'attorney.barNumber')) === '07654321');
    expect(await field(page, 'serviceAttorney.barNumber')).toBe('');
    await go(page, '/d5');
    await expect(note(page)).toHaveCount(0);

    // Both filled and different: the certificate's is kept and shown.
    const differ = await withBoxes(bytes, [['PART VI', 'B29', '01234567']]);
    await importWorkbook(page, differ, async () => (await field(page, 'serviceAttorney.barNumber')) === '01234567');
    expect(await field(page, 'attorney.barNumber')).toBe('123456');
    await go(page, '/d5');
    await expect(note(page)).toContainText('Florida Bar #: 01234567');
    await expect(note(page).getByRole('button', { name: 'Discard old details' })).toBeVisible();
  });

  test('Simplified: a differing certificate Bar number from an older workbook is noted on Part VI and discarded there', async ({ page }) => {
    test.setTimeout(240_000);
    await freshStartNoPassword(page);
    await createSimplifiedWard(page, 'Old Workbook Simplified');
    await fillMinimalValidSimplifiedWard(page);
    const { bytes } = await exportWithWrites(page, 'simplified');
    const P56 = 'PARTS V, VI ';
    const differ = await withBoxes(bytes, [[P56, 'B43', '01234567']]);
    await importWorkbook(page, differ, async () => (await field(page, 'certAttyBarNumber')) === '01234567');
    expect(await field(page, 'attorney_barNumber')).toBe('123456');
    await go(page, '/p6');
    await expect(note(page)).toContainText("Florida Bar #: 01234567. The certificate now prints Part V's (123456).");
    await expect(page.locator('#main-content input[data-form-path="certAttyBarNumber"], #main-content input[data-field-path="certAttyBarNumber"]')).toHaveCount(0);
    await note(page).getByRole('button', { name: 'Discard old details' }).click();
    await expect(note(page)).toHaveCount(0);
    expect(await field(page, 'certAttyBarNumber')).toBe('');
  });
});
