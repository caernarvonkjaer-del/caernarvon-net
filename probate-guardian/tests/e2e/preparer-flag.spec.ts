import { test, expect, type Page } from '@playwright/test';
import JSZip from 'jszip';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { freshStartNoPassword, createWard, fillMinimalValidGuardianWard, fillMinimalValidAnnualWard } from './support/target';
import { readAll } from './support/stream';
import { extractPdfText } from './support/pdf-extract';

// Milestone 67A. A guardian who prepares their own Initial Inventory or Annual
// Accounting reads, on the Preparer page, "If you are the Guardian,
// Co-Guardian, or Guardian Attorney -- DO NOT SIGN HERE" -- and then could not
// export, because the app required all six preparer fields and a signature
// regardless. Court-user report of 2026-09-23, observation 1.
//
// The Clerk accepts a filing with no outside preparer if the guardian
// identifies themself as the preparer, so each guardian card and the attorney
// card carry "This person prepared this filing". Ticking it drops the
// preparer block's requirements, hides the card behind a notice naming who
// is identified, prints "Prepared by <name>, guardian" on the PDF, and
// leaves the workbook's preparer cells empty -- even when something was
// typed into the block before it was hidden, since hidden is not filed.
// Only one party can be the preparer; the flag lives on the row, so deleting
// that guardian returns the filing to "no preparer identified".
//
// Every interaction here is a real click (AGENTS.md section 6).

const PREPARED_BY_GUARDIAN = 'Prepared by Sample Guardian, guardian. No outside preparer.';
const PREPARED_BY_ATTORNEY = "Prepared by Sample Attorney, guardian's attorney. No outside preparer.";

const dec = (s: string) => s.replace(/&apos;/g, "'").replace(/&quot;/g, '"')
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');

/** Text of every cell on one sheet of an exported workbook. */
async function sheetText(bytes: Buffer, sheetName: string) {
  const zip = await JSZip.loadAsync(bytes);
  const wbXml = await zip.file('xl/workbook.xml')!.async('string');
  const relsXml = await zip.file('xl/_rels/workbook.xml.rels')!.async('string');
  const rels = new Map<string, string>();
  for (const m of relsXml.matchAll(/Id="([^"]+)"[^>]*Target="([^"]+)"/g)) rels.set(m[1], m[2]);
  const shared: string[] = [];
  const ssFile = zip.file('xl/sharedStrings.xml');
  if (ssFile) {
    for (const m of (await ssFile.async('string')).matchAll(/<si>([\s\S]*?)<\/si>/g)) {
      shared.push(dec([...m[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((t) => t[1]).join('')));
    }
  }
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
    if (!ref) continue;
    const v = /<v>([\s\S]*?)<\/v>/.exec(m[2] ?? '')?.[1];
    out.set(ref, v === undefined ? '' : (/\bt="s"/.test(m[1]) ? (shared[Number(v)] ?? '') : v));
  }
  return out;
}

async function download(page: Page, selector: string) {
  await page.evaluate(() => (window as any).GuardianForms.testing.save.flush());
  await page.evaluate(() => (window as any).GuardianForms.testing.navigate('/print'));
  // The banner names what would disable a button ("— N issue(s)"), so a
  // blocked export fails here with the reason rather than on a bare
  // "disabled". (The two forms word the ready state differently, so only
  // the blocked wording is asserted against.)
  await expect(page.locator('#main-content .print-preview-banner')).not.toContainText('issue(s)');
  const button = page.locator(selector);
  await expect(button).toBeEnabled({ timeout: 20_000 });
  const dl = page.waitForEvent('download', { timeout: 40_000 });
  await button.click();
  return readAll(await (await dl).createReadStream());
}

const pdfText = async (bytes: Buffer) => (await extractPdfText(bytes)).replace(/\s+/g, ' ');

test.describe('Milestone 67A: a guardian or attorney can be the preparer', () => {
  test('Guardian Inventory: the flag drops the block, unblocks export, names the person on the PDF, and keeps the workbook cells empty', async ({ page }) => {
    test.setTimeout(300_000);
    await freshStartNoPassword(page);
    await createWard(page, 'Preparer Flag Inventory', 'guardian');
    await fillMinimalValidGuardianWard(page);
    // The fixture names an outside preparer. Empty the block: this is the
    // guardian who followed "DO NOT SIGN HERE".
    await page.evaluate(() => {
      const w = window as any;
      w.GuardianForms.testing.patchFiling({ preparer: { ...w.GuardianForms.testing.field('preparer'), ...{ name: '', ssnEin: '', phone: '', streetAddress: '', cityStateZip: '', signatureDate: '', signatureState: '', signatureImage: '' } } });
      w.GuardianForms.testing.save.auto();
    });
    const issues = () => page.evaluate(async () => (await (window as any).GuardianForms.testing.validate.open()).map((e: any) => String(e.message ?? e)));
    expect((await issues()).filter((m) => m.startsWith('D-2 Preparer')).length, 'before: the preparer block blocks').toBeGreaterThan(0);
    await page.evaluate(() => (window as any).GuardianForms.testing.navigate('/print'));
    await expect(page.locator('[data-inventory-action="save-pdf"]'), 'before: export is disabled').toBeDisabled();

    // Tick the box on Guardian #1's card.
    await page.evaluate(() => (window as any).GuardianForms.testing.navigate('/d1'));
    await page.locator('#preparer_flag_guardians_0_isPreparer').check();
    await expect(page.locator('#preparer_flag_guardians_0_isPreparer')).toBeChecked();
    expect((await issues()).filter((m) => m.startsWith('D-2 Preparer')), 'after: nothing in the preparer block blocks').toEqual([]);
    expect((await issues()).filter((m) => m.startsWith('D-2 Attorney')), 'the attorney block is untouched').toEqual([]);

    // The Preparer page says who is named and where the box lives; the card
    // itself is gone, the attorney card is not.
    await page.evaluate(() => (window as any).GuardianForms.testing.navigate('/d2'));
    await expect(page.locator('#main-content [data-preparer-waived]')).toContainText('Sample Guardian (Guardian #1)');
    await expect(page.locator('#main-content [data-preparer-waived]')).toContainText('D-1');
    // Guardian Inventory's inputs carry data-field-path (its textInput() keeps
    // them on the legacy data-bind write path and suppresses data-form-path).
    await expect(page.locator('#main-content [data-field-path="preparer.name"]')).toHaveCount(0);
    await expect(page.locator('#main-content [data-field-path="attorney.name"]')).toHaveCount(1);
    // And the attorney card carries its own box, unticked.
    await expect(page.locator('#preparer_flag_attorney_isPreparer')).not.toBeChecked();

    // Something typed into the block earlier is kept (section 4) but must not
    // reach the filed workbook: hidden is not filed.
    await page.evaluate(() => {
      const w = window as any;
      w.GuardianForms.testing.patchFiling({ preparer: { ...w.GuardianForms.testing.field('preparer'), ...{ name: 'RETAINED-NAME', ssnEin: '111-11-1111', phone: '555-000-0000', streetAddress: 'RETAINED-STREET', cityStateZip: 'RETAINED-CITY' } } });
      w.GuardianForms.testing.save.auto();
    });
    const pdf = await pdfText(await download(page, '[data-inventory-action="save-pdf"]'));
    expect(pdf).toContain(PREPARED_BY_GUARDIAN);
    expect(pdf, 'the outside preparer\'s compilation disclaimer is not printed for a guardian').not.toContain('I have compiled the accompanying');
    expect(pdf).not.toContain('RETAINED-NAME');
    const p4 = await sheetText(await download(page, '[data-inventory-action="save-excel"]'), 'PART IV');
    for (const ref of ['I13', 'B15', 'I15', 'B17', 'I17', 'G13']) {
      expect(p4.get(ref) ?? '', `PART IV!${ref} stays empty`).toBe('');
    }
    // The attorney block, on the same sheet, is still written.
    expect(p4.get('B28')).toBe('123456');

    // Only one preparer: ticking a co-guardian's box clears Guardian #1's,
    // visibly, on the click.
    await page.evaluate(() => (window as any).GuardianForms.testing.navigate('/d1'));
    await page.locator('[data-inventory-action="add-guardian"]').click();
    const coName = page.locator('#main-content [data-field-path="guardians.1.name"]');
    await coName.fill('Second Guardian');
    await coName.dispatchEvent('change');
    await page.locator('#preparer_flag_guardians_1_isPreparer').check();
    await expect(page.locator('#preparer_flag_guardians_1_isPreparer')).toBeChecked();
    await expect(page.locator('#preparer_flag_guardians_0_isPreparer'), 'Guardian #1\'s box clears').not.toBeChecked();
    expect(await page.evaluate(() => (window as any).GuardianForms.testing.field('guardians').map((g: any) => !!g.isPreparer))).toEqual([false, true]);

    // Deleting the preparer returns the filing to "no preparer identified".
    // The block was filled with the RETAINED-* values above, which would
    // satisfy it; empty it again so the requirement's return is observable.
    await page.evaluate(() => {
      const w = window as any;
      w.GuardianForms.testing.patchFiling({ preparer: { ...w.GuardianForms.testing.field('preparer'), ...{ name: '', ssnEin: '', phone: '', streetAddress: '', cityStateZip: '' } } });
      w.GuardianForms.testing.save.auto();
    });
    await page.locator('[data-inventory-action="remove-guardian"][data-index="1"]').click();
    expect(await page.evaluate(() => (window as any).GuardianForms.testing.field('guardians.length'))).toBe(1);
    expect(await page.evaluate(() => (window as any).GuardianForms.testing.field('guardians').map((g: any) => !!g.isPreparer)), 'no flag survives').toEqual([false]);
    expect((await issues()).filter((m) => m.startsWith('D-2 Preparer')).length, 'the block is required again').toBeGreaterThan(0);
    await page.evaluate(() => (window as any).GuardianForms.testing.navigate('/d2'));
    // input[...] specifically: the page-local guidance box renders a
    // jump-to-field button with the same data-field-path once the section
    // reports incomplete (same as the Milestone 58C test notes).
    await expect(page.locator('#main-content input[data-field-path="preparer.name"]'), 'the card is back').toHaveCount(1);

    // The attorney can be the preparer too.
    await page.locator('#preparer_flag_attorney_isPreparer').check();
    expect((await issues()).filter((m) => m.startsWith('D-2 Preparer'))).toEqual([]);
    await expect(page.locator('#main-content [data-preparer-waived]')).toContainText('Sample Attorney');
    expect(await pdfText(await download(page, '[data-inventory-action="save-pdf"]'))).toContain(PREPARED_BY_ATTORNEY);
  });

  test('Annual Accounting: the same on Part III, IV and V, and the sidebar agrees', async ({ page }) => {
    test.setTimeout(300_000);
    await freshStartNoPassword(page);
    await createWard(page, 'Preparer Flag Annual', 'annual');
    await fillMinimalValidAnnualWard(page);
    await page.evaluate(() => {
      const w = window as any;
      w.GuardianForms.testing.patchFiling({ preparer: { ...w.GuardianForms.testing.field('preparer'), ...{ name: '', ssn: '', phone: '', street: '', cityStateZip: '', signatureDate: '', signatureState: '', signatureImage: '' } } });
      w.GuardianForms.testing.save.auto();
    });
    const issues = () => page.evaluate(async () => (await (window as any).GuardianForms.testing.validate.open()).map((e: any) => String(e.message ?? e)));
    const sidebar = () => page.evaluate(() => !!(window as any).GuardianForms.testing.status.navChecks().checks['a-p4']);
    expect((await issues()).filter((m) => m.startsWith('Part IV')).length).toBeGreaterThan(0);
    expect(await sidebar(), 'before: Part IV reads incomplete').toBe(false);

    await page.evaluate(() => (window as any).GuardianForms.testing.navigate('/p3'));
    await page.locator('#preparer_flag_guardians_0_isPreparer').check();
    expect((await issues()).filter((m) => m.startsWith('Part IV'))).toEqual([]);
    expect(await sidebar(), 'after: the sidebar and the export gate agree').toBe(true);

    await page.evaluate(() => (window as any).GuardianForms.testing.navigate('/p4'));
    await expect(page.locator('#main-content [data-preparer-waived]')).toContainText('Sample Guardian (Guardian #1)');
    await expect(page.locator('#main-content [data-preparer-waived]')).toContainText('Part III');
    await expect(page.locator('#main-content [data-form-path="preparer.name"]')).toHaveCount(0);

    const pdf = await pdfText(await download(page, '[data-annual-action="save-pdf"]'));
    expect(pdf).toContain(PREPARED_BY_GUARDIAN);
    const p45 = await sheetText(await download(page, '[data-annual-action="save-excel"]'), 'PART IV, V');
    for (const ref of ['J15', 'B17', 'B19', 'J17', 'J19', 'H15']) {
      expect(p45.get(ref) ?? '', `PART IV, V!${ref} stays empty`).toBe('');
    }
    expect(p45.get('B33'), 'the attorney block is still written').toBe('123456');

    // Attorney as preparer, from Part V.
    await page.evaluate(() => (window as any).GuardianForms.testing.navigate('/p5'));
    await page.locator('#preparer_flag_attorney_isPreparer').check();
    expect(await page.evaluate(() => (window as any).GuardianForms.testing.field('guardians.0.isPreparer'))).toBe(false);
    expect(await page.evaluate(() => (window as any).GuardianForms.testing.field('attorney_isPreparer'))).toBe(true);
    expect(await pdfText(await download(page, '[data-annual-action="save-pdf"]'))).toContain(PREPARED_BY_ATTORNEY);
  });

  // The workbook has no cell for the flag. Importing must not silently drop
  // it when the workbook names no preparer -- and must clear it when the
  // workbook does name one, since that is the stronger statement.
  test('Annual re-import keeps the flag when the workbook names no preparer, and clears it when it does', async ({ page }) => {
    test.setTimeout(300_000);
    await freshStartNoPassword(page);
    await createWard(page, 'Preparer Flag Import', 'annual');
    await fillMinimalValidAnnualWard(page);
    await page.evaluate(() => {
      const w = window as any;
      w.GuardianForms.testing.patchFiling({ preparer: { ...w.GuardianForms.testing.field('preparer'), ...{ name: '', ssn: '', phone: '', street: '', cityStateZip: '', signatureDate: '' } } });
      w.GuardianForms.testing.patchFiling({ 'guardians.0.isPreparer': true });
      w.GuardianForms.testing.save.auto();
    });
    // The flag alone must clear the gate; anything left here names itself.
    // The export boundary is prepareFilingOutput(), not the validator alone
    // (draft, identity and supplemental issues ride along), so that is what
    // is asserted clear.
    expect(await page.evaluate(() => (window as any).GuardianForms.testing.validate.exportGate()))
      .toEqual({ messages: [], canExport: true });
    const noPreparer = await download(page, '[data-annual-action="save-excel"]');
    const noPreparerFile = path.join(os.tmpdir(), `pg-preparer-flag-none-${Date.now()}.xlsx`);
    fs.writeFileSync(noPreparerFile, noPreparer);

    // Both workbooks come from this one ward, so the import lands on the
    // flagged filing itself. The import restores the case number, which is
    // blanked first so its return is the completion signal -- a field that
    // is already right cannot tell "imported" from "not yet".
    const importInto = async (file: string) => {
      await page.evaluate(() => { const w = window as any; w.GuardianForms.testing.patchFiling({ 'caseNumber': '' }); w.GuardianForms.testing.save.auto(); });
      await page.evaluate(() => (window as any).GuardianForms.testing.navigate('/'));
      await page.setInputFiles('input[type="file"][accept=".xlsx"]', file);
      await page.waitForFunction(() => (window as any).GuardianForms.testing.field('caseNumber') === '2026-CP-000789', undefined, { timeout: 20_000 });
    };

    await importInto(noPreparerFile);
    expect(await page.evaluate(() => ({ flagged: !!(window as any).GuardianForms.testing.field('guardians.0.isPreparer'), preparer: (window as any).GuardianForms.testing.field('preparer')?.name })),
      'a workbook with empty preparer cells does not un-name the guardian').toEqual({ flagged: true, preparer: '' });

    // A workbook that names an outside preparer wins. Produce it from the
    // same ward with the outside preparer named and nobody flagged.
    await page.evaluate(() => {
      const w = window as any;
      w.GuardianForms.testing.patchFiling({ preparer: { ...w.GuardianForms.testing.field('preparer'), ...{ name: 'Sample Preparer', ssn: '123-45-6789', phone: '555-555-5555', street: '123 Main St', cityStateZip: 'Clearwater, FL 33755', signatureDate: '2027-01-05' } } });
      w.GuardianForms.testing.patchFiling({ 'guardians.0.isPreparer': false });
      w.GuardianForms.testing.save.auto();
    });
    const withPreparer = await download(page, '[data-annual-action="save-excel"]');
    const withPreparerFile = path.join(os.tmpdir(), `pg-preparer-flag-named-${Date.now()}.xlsx`);
    fs.writeFileSync(withPreparerFile, withPreparer);

    // Flag the guardian again, then import the workbook that names an
    // outside preparer: the workbook's statement is the stronger one.
    await page.evaluate(() => { const w = window as any; w.GuardianForms.testing.patchFiling({ 'guardians.0.isPreparer': true }); w.GuardianForms.testing.save.auto(); });
    await importInto(withPreparerFile);
    expect(await page.evaluate(() => ({ flagged: !!(window as any).GuardianForms.testing.field('guardians.0.isPreparer'), preparer: (window as any).GuardianForms.testing.field('preparer')?.name })),
      'the named outside preparer clears the flag').toEqual({ flagged: false, preparer: 'Sample Preparer' });
  });
});
