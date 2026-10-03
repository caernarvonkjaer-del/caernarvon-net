import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  freshStartNoPassword, createWard, createSimplifiedWard, autoAcceptDynDialogs,
  fillMinimalValidGuardianWard, fillMinimalValidAnnualWard, fillMinimalValidSimplifiedWard,
} from './support/target';
import { exportWithWrites, loadWorkbook } from './support/workbook-vs-template';

// Milestone 72 follow-up (found while building 72H). The court's workbooks
// have no box for a signature's chosen state, its stamp image, or which
// guardian served the copies (71B), and the importers rebuilt each guardian
// from the workbook's boxes alone, so importing a filing's own workbook back
// silently turned a stamped signature into the default and cleared the tick.
// The Inventory was fixed in 72H; the Annual family and the Simplified the
// same way: the filing's values are kept, for the same person only, so a
// workbook whose guardian is someone else never inherits them. Driven through
// the real Import from Excel control.

const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
const field = (page: Page, p: string) => page.evaluate((x) => (window as any).GuardianForms.testing.field(x), p);

async function importWorkbook(page: Page, bytes: Buffer) {
  const file = path.join(os.tmpdir(), `pg-keep-${Date.now()}-${Math.random().toString(36).slice(2)}.xlsx`);
  fs.writeFileSync(file, bytes);
  await page.evaluate(() => (window as any).GuardianForms.testing.patchFiling({ wardName: 'Import Pending' }));
  await page.evaluate(() => (window as any).GuardianForms.testing.navigate('/'));
  const dialogs = autoAcceptDynDialogs(page);
  await page.setInputFiles('input[type="file"][accept=".xlsx"]', file);
  // Finished, not merely begun: the ward's name is read first, before the
  // Simplified asks to replace its guardian slots, so it alone would let the
  // checks below run against a half-imported filing. Every importer empties
  // the file box as its very last step.
  await expect.poll(() => page.evaluate(() => {
    const box = document.querySelector('input[type="file"][accept=".xlsx"]') as HTMLInputElement | null;
    return (window as any).GuardianForms.testing.field('wardName') !== 'Import Pending' && !box?.files?.length;
  }), { timeout: 30_000 }).toBe(true);
  dialogs.stop();
}

/**
 * The workbook with one person's name box (a guardian's or the preparer's) set
 * to `to`, as a hand-edited workbook might hold.
 */
async function withNameBox(bytes: Buffer, sheet: string, cell: string, to: string): Promise<Buffer> {
  const wb = await loadWorkbook(bytes);
  wb.getWorksheet(sheet).getCell(cell).value = to;
  return Buffer.from(await wb.xlsx.writeBuffer());
}

for (const form of [
  // The stamped guardian and that guardian's name box: Guardian #1 on the
  // Inventory (PART III F8, its first block) and the Annual (PART II, III F25).
  // On the Simplified, Guardian #1's name is the Cover's guardian, linked in the
  // app and by formula in the workbook, so it is never "someone else" on its
  // own; a co-guardian is, so Guardian #2 (PARTS III, IV F25) carries the stamp.
  { type: 'guardian', fill: fillMinimalValidGuardianWard, sheet: 'PART III', cell: 'F8', idx: 0 },
  { type: 'annual', fill: fillMinimalValidAnnualWard, sheet: 'PART II, III', cell: 'F25', idx: 0 },
  { type: 'simplified', fill: fillMinimalValidSimplifiedWard, sheet: 'PARTS III, IV', cell: 'F25', idx: 1 },
] as const) {
  test(`${form.type}: a stamped guardian signature survives importing the filing's own workbook, and only for the same person`, async ({ page }) => {
    test.setTimeout(240_000);
    await freshStartNoPassword(page);
    if (form.type === 'simplified') await createSimplifiedWard(page, 'Keep Stamp Simplified');
    else await createWard(page, `Keep Stamp ${form.type}`, form.type);
    await form.fill(page);
    const g = `guardians.${form.idx}`;
    if (form.idx > 0) {
      await page.evaluate(() => {
        const t = (window as any).GuardianForms.testing;
        const d = t.snapshot().filing;
        d.guardians[1] = { ...d.guardians[0], name: 'Second Guardian', ssn: '987-65-4321', email: 'second@example.com' };
        t.replaceFiling(d);
      });
    }
    await page.evaluate(([path, img]) => (window as any).GuardianForms.testing.patchFiling({
      [`${path}.signatureState`]: 'stamp', [`${path}.signatureImage`]: img, [`${path}.certifiesService`]: true,
    }), [g, PNG]);
    const name = await field(page, `${g}.name`);
    const { bytes } = await exportWithWrites(page, form.type);

    await importWorkbook(page, bytes);
    expect(await field(page, `${g}.name`)).toBe(name);
    expect(await field(page, `${g}.signatureState`), 'the same person keeps the stamp').toBe('stamp');
    expect(await field(page, `${g}.signatureImage`)).toBe(PNG);
    expect(await field(page, `${g}.certifiesService`), 'and stays the guardian who served the copies').toBe(true);

    // A workbook whose Guardian #1 is someone else: that person must not
    // inherit the filing's guardian's stamp.
    await importWorkbook(page, await withNameBox(bytes, form.sheet, form.cell, 'Someone Else Entirely'));
    expect(String(await field(page, `${g}.name`)).toLowerCase()).toBe('someone else entirely');
    expect(await field(page, `${g}.signatureState`) || '', 'a different person keeps nothing').not.toBe('stamp');
    expect(await field(page, `${g}.certifiesService`) || false, 'nor becomes the guardian who served the copies').toBe(false);
  });
}

for (const form of [
  // The outside preparer and the preparer's name box: PART IV I13 on the
  // Inventory, PART IV, V J15 on the Annual. The Inventory's was missed when the
  // guardians were fixed, and found when the milestone's open items were
  // listed; the Annual's was fixed with its guardians but tested only here.
  { type: 'guardian', fill: fillMinimalValidGuardianWard, sheet: 'PART IV', cell: 'I13' },
  { type: 'annual', fill: fillMinimalValidAnnualWard, sheet: 'PART IV, V', cell: 'J15' },
] as const) {
  test(`${form.type}: an outside preparer's stamped signature survives importing the filing's own workbook, and only for the same person`, async ({ page }) => {
    test.setTimeout(240_000);
    await freshStartNoPassword(page);
    await createWard(page, `Keep Preparer ${form.type}`, form.type);
    await form.fill(page);
    await page.evaluate((img) => (window as any).GuardianForms.testing.patchFiling({
      'preparer.name': 'Outside Preparer', 'preparer.signatureState': 'stamp', 'preparer.signatureImage': img,
    }), PNG);
    const { bytes } = await exportWithWrites(page, form.type);

    await importWorkbook(page, bytes);
    expect(await field(page, 'preparer.name')).toBe('Outside Preparer');
    expect(await field(page, 'preparer.signatureState'), 'the same preparer keeps the stamp').toBe('stamp');
    expect(await field(page, 'preparer.signatureImage')).toBe(PNG);

    await importWorkbook(page, await withNameBox(bytes, form.sheet, form.cell, 'Someone Else Entirely'));
    expect(String(await field(page, 'preparer.name')).toLowerCase()).toBe('someone else entirely');
    expect(await field(page, 'preparer.signatureState') || '', 'a different preparer keeps nothing').not.toBe('stamp');
  });
}
