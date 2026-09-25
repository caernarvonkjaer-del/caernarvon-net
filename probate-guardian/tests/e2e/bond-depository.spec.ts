import { test, expect, type Page } from '@playwright/test';
import JSZip from 'jszip';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { freshStartNoPassword, createWard, fillMinimalValidGuardianWard, fillMinimalValidAnnualWard } from './support/target';
import { readAll } from './support/stream';
import { extractPdfText } from './support/pdf-extract';

// Milestone 67B. A guardian whose bond was waived by court order, or whose
// assets sit in a restricted depository instead of under a surety, could not
// file an Annual, Final or Trust Accounting: Save as PDF and Save as Excel
// stayed disabled on "Part IX -- Bond Amount" and "Part IX -- Bonding
// Company" -- fields the form's own UI and data model called optional. The
// Initial Inventory blocked on all four bond fields and its own Yes/No
// waiver question. Court-user report of 2026-09-23, observations 2, 3 and 4.
//
// Decided: nothing in the bond block gates export on either form, and the
// tester's four-state question -- restricted depository only / bond and
// restricted depository / bond only / bond waived by court order -- replaces
// the separate questions on both. Each state reveals only the fields it
// needs, on the click (Milestone 67F's routed control), none of them
// required; the print preview warns instead; the PDF prints one approved
// line per state; the Excel is unchanged (the Annual workbook has no cell for
// any of it beyond the receipt date it always carried; the Inventory's has
// only the waiver-date line it always wrote).

const STATES = ['depository-only', 'bond-and-depository', 'bond-only', 'bond-waived'] as const;

const dec = (s: string) => s.replace(/&apos;/g, "'").replace(/&quot;/g, '"')
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');

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
  await page.evaluate(() => (window as any).flushPendingSave());
  await page.evaluate(() => (window as any).navigate('/print'));
  const button = page.locator(selector);
  await expect(button).toBeEnabled({ timeout: 20_000 });
  const dl = page.waitForEvent('download', { timeout: 40_000 });
  await button.click();
  return readAll(await (await dl).createReadStream());
}

const pdfText = async (bytes: Buffer) => (await extractPdfText(bytes)).replace(/\s+/g, ' ');

async function setFields(page: Page, patch: Record<string, unknown>) {
  await page.evaluate((p) => { Object.assign((window as any).D, p); (window as any).autoSave(); }, patch);
  await page.evaluate(() => (window as any).flushPendingSave());
}

const BLANK_BOND = { bondAmount: '', bondPeriodFrom: '', bondPeriodTo: '', bondingCompany: '', bondWaivedDate: '', restrictedDepositoryReceiptDate: '' };
const FULL_BOND = { bondAmount: '5000', bondPeriodFrom: '2026-01-01', bondPeriodTo: '2027-01-01', bondingCompany: 'Gulf Surety', bondWaivedDate: '2026-03-03', restrictedDepositoryReceiptDate: '2026-02-02' };

/** Every issue the export gate would raise for the given page prefix. */
const sectionIssues = (page: Page, validator: string, prefix: string) => page.evaluate(([v, p]) => {
  const issues = (window as any)[v]() || [];
  return issues.map((i: any) => String(i?.message ?? i)).filter((m: string) => m.startsWith(p));
}, [validator, prefix] as [string, string]);

const advisories = (page: Page) => page.locator('#main-content .alert-warning li');

for (const form of [
  { label: 'Guardian Inventory', type: 'guardian', route: '/d4', section: 'D-4', validator: 'validateGuardian', fill: fillMinimalValidGuardianWard,
    pdfButton: '[data-inventory-action="save-pdf"]', excelButton: '[data-inventory-action="save-excel"]' },
  { label: 'Annual Accounting', type: 'annual', route: '/p9', section: 'Part IX', validator: 'validateAnnual', fill: fillMinimalValidAnnualWard,
    pdfButton: '[data-annual-action="save-pdf"]', excelButton: '[data-annual-action="save-excel"]' },
]) {
  test.describe(`Milestone 67B — ${form.label}`, () => {
    test('the export gate never blocks on the bond block: every state, blank or filled', async ({ page }) => {
      await freshStartNoPassword(page);
      await createWard(page, `${form.label} Bond Gate`, form.type);
      await form.fill(page);
      for (const state of ['', ...STATES]) {
        for (const fields of [BLANK_BOND, FULL_BOND]) {
          await setFields(page, { bondDepositoryState: state, ...fields });
          expect(await sectionIssues(page, form.validator, form.section), `state=${JSON.stringify(state)} fields=${fields === BLANK_BOND ? 'blank' : 'filled'}`).toEqual([]);
        }
      }
      // And the buttons agree with the validator.
      await setFields(page, { bondDepositoryState: '', ...BLANK_BOND });
      await page.evaluate(() => (window as any).navigate('/print'));
      await expect(page.locator(form.pdfButton)).toBeEnabled();
      await expect(page.locator(form.excelButton)).toBeEnabled();
    });

    test('each state reveals only its fields, on the click, and switching states keeps what was typed', async ({ page }) => {
      await freshStartNoPassword(page);
      await createWard(page, `${form.label} Bond Reveal`, form.type);
      await form.fill(page);
      await setFields(page, { bondDepositoryState: '', ...BLANK_BOND });
      await page.evaluate((r) => (window as any).navigate(r), form.route);

      const option = (i: number) => page.locator(`#bondDepositoryState_${i}`);
      // Annual's inputs carry data-form-path; the Inventory's date inputs
      // data-field-path and its numeric/text inputs data-bind (see 67A's spec).
      const receipt = page.locator('#main-content input[data-form-path="restrictedDepositoryReceiptDate"], #main-content input[data-field-path="restrictedDepositoryReceiptDate"]');
      const amount = page.locator('#main-content input[data-form-path="bondAmount"], #main-content input[data-field-path="bondAmount"], #main-content input[data-bind="bondAmount"]');
      const waiverDate = page.locator('#main-content input[data-form-path="bondWaivedDate"], #main-content input[data-field-path="bondWaivedDate"]');

      // Unanswered reveals nothing.
      await expect(receipt).toHaveCount(0);
      await expect(amount).toHaveCount(0);
      await expect(waiverDate).toHaveCount(0);

      await option(0).check(); // Restricted depository only
      await expect(receipt.first()).toBeVisible();
      await expect(amount).toHaveCount(0);
      await expect(waiverDate).toHaveCount(0);

      await option(2).check(); // Bond only
      await expect(amount.first()).toBeVisible();
      await expect(receipt).toHaveCount(0);
      await amount.first().fill('5000');
      await amount.first().dispatchEvent('change');

      await option(1).check(); // Bond and restricted depository
      await expect(amount.first()).toBeVisible();
      await expect(receipt.first()).toBeVisible();
      await expect(amount.first(), 'the amount typed under Bond only is still there').toHaveValue(/5,?000/);

      await option(3).check(); // Bond waived by court order
      await expect(waiverDate.first()).toBeVisible();
      await expect(amount).toHaveCount(0);
      expect(String(await page.evaluate(() => (window as any).D.bondAmount)), 'hidden, not deleted (section 4)').toMatch(/5000/);
      await expect(option(3)).toBeChecked();
    });

    test('the print preview warns, never blocks: unanswered, and each state\'s blank fields', async ({ page }) => {
      await freshStartNoPassword(page);
      await createWard(page, `${form.label} Bond Advisory`, form.type);
      await form.fill(page);
      await setFields(page, { bondDepositoryState: '', ...BLANK_BOND });
      await page.evaluate(() => (window as any).navigate('/print'));
      await expect(advisories(page).filter({ hasText: `${form.section} — The bond / restricted depository arrangement is not stated` })).toHaveCount(1);

      await setFields(page, { bondDepositoryState: 'bond-only' });
      await page.evaluate(() => (window as any).navigate('/print'));
      await expect(advisories(page).filter({ hasText: `${form.section} — Bond Amount is blank` })).toHaveCount(1);
      await expect(advisories(page).filter({ hasText: `${form.section} — Name of Bonding Company is blank` })).toHaveCount(1);

      await setFields(page, { bondDepositoryState: 'bond-only', bondAmount: '5000', bondingCompany: 'Gulf Surety' });
      await page.evaluate(() => (window as any).navigate('/print'));
      await expect(advisories(page).filter({ hasText: `${form.section} —` })).toHaveCount(0);
      await expect(page.locator(form.pdfButton)).toBeEnabled();
    });

    test('a filing saved under the old shape reads back with the answer it implied, and the old fields are gone', async ({ page }) => {
      await freshStartNoPassword(page);
      await createWard(page, `${form.label} Bond Legacy`, form.type);
      await form.fill(page);
      // The shape a .sav from before this milestone carries.
      await page.evaluate((legacy) => {
        const d = (window as any).D;
        delete d.bondDepositoryState;
        Object.assign(d, legacy);
        (window as any).autoSave();
      }, form.type === 'guardian'
        ? { bondWaived: 'Yes', bondWaivedDate: '2026-03-03', bondAmount: '', bondingCompany: '' }
        : { restrictedDepository: 'Yes', restrictedDepositoryReceiptDate: '2026-02-02', bondAmount: '5000', bondingCompany: 'Gulf Surety' });
      await page.evaluate((r) => (window as any).navigate(r), form.route);
      const after = await page.evaluate(() => {
        const d = (window as any).D;
        return {
          state: d.bondDepositoryState, hasWaived: 'bondWaived' in d, hasDepository: 'restrictedDepository' in d,
          waiverDate: d.bondWaivedDate, receipt: d.restrictedDepositoryReceiptDate,
          // Named on failure, so a surviving key shows the object's shape.
          bondKeys: Object.keys(d).filter((k) => /bond|depository/i.test(k)).sort(),
        };
      });
      expect(after.state).toBe(form.type === 'guardian' ? 'bond-waived' : 'bond-and-depository');
      expect(after.hasWaived, 'the retired bondWaived tri-state is removed').toBe(false);
      expect(after.hasDepository, 'the retired restrictedDepository tri-state is removed').toBe(false);
      if (form.type === 'guardian') expect(after.waiverDate).toBe('2026-03-03'); else expect(after.receipt).toBe('2026-02-02');
      // A blank legacy filing stays unanswered -- never coerced (section 4).
      await page.evaluate(() => { const d = (window as any).D; d.bondDepositoryState = ''; d.bondWaived = ''; d.restrictedDepository = ''; Object.assign(d, { bondAmount: '', bondingCompany: '', bondPeriodFrom: '', bondPeriodTo: '', bondWaivedDate: '', restrictedDepositoryReceiptDate: '' }); (window as any).autoSave(); });
      await page.evaluate((r) => (window as any).navigate(r), form.route);
      expect(await page.evaluate(() => (window as any).D.bondDepositoryState)).toBe('');
    });

    // The sidebar asks, export does not demand (AGENTS.md section 4), and the
    // page must explain the mark it cannot clear by itself -- Milestone 63A's
    // reporter case, which this question inherited from the waiver question
    // it replaced. On the Inventory, Next is deliberately not blocked (63A,
    // D1); on the Annual family the page gates Next as every non-Inventory
    // page does, which is no stricter than the Bond Amount requirement it
    // replaces.
    test('the sidebar asks for the arrangement, the page explains the mark and links to the question, and answering clears both', async ({ page }) => {
      await freshStartNoPassword(page);
      await createWard(page, `${form.label} Bond Explains`, form.type);
      await form.fill(page);
      // Every bond field blank as well as the state: with bond details
      // present, the mount-time migration would (rightly) read "bond only"
      // from them, and the question would already be answered.
      await setFields(page, { bondDepositoryState: '', ...BLANK_BOND });
      await page.evaluate((r) => (window as any).navigate(r), form.route);
      const navKey = form.type === 'guardian' ? 'd4' : 'a-p9';
      const mark = page.locator(`[data-nav="${navKey}"] .nav-check`);
      const box = page.locator('#page-local-guidance .section-local-guidance');

      await expect(mark, 'the sidebar marks the page unfinished while the arrangement is unstated').toHaveClass(/incomplete/);
      await expect(box, 'the page must say why').toBeVisible();
      await expect(box).toContainText(/restricted depository, a bond, both, or a bond waived/i);
      if (form.type === 'guardian') await expect(page.locator('#page-next-btn'), 'D1: explain, do not block').toBeEnabled();

      // The jump link lands on the question itself.
      await box.getByRole('button', { name: /restricted depository, a bond/i }).click();
      await expect(page.locator('input[name="radio_bondDepositoryState"]:focus')).toHaveCount(1);

      // Answering clears the box and turns the mark green; the export gate
      // never cared either way.
      await page.locator('#bondDepositoryState_2').check();
      await page.evaluate(() => (window as any).updateNavDots?.());
      await expect(box).toHaveCount(0);
      await expect(mark).toHaveClass(/\bcomplete\b/);
      expect(await sectionIssues(page, form.validator, form.section)).toEqual([]);
    });

    test('the PDF states the arrangement in the approved words; the Excel is unchanged, and importing it answers the question', async ({ page }) => {
      test.setTimeout(300_000);
      await freshStartNoPassword(page);
      await createWard(page, `${form.label} Bond PDF`, form.type);
      await form.fill(page);

      await setFields(page, { bondDepositoryState: 'bond-waived', ...BLANK_BOND, bondWaivedDate: '2026-03-03' });
      expect(await pdfText(await download(page, form.pdfButton))).toContain('Bond waived by court order dated 03/03/2026.');

      await setFields(page, { bondDepositoryState: 'depository-only', ...BLANK_BOND, restrictedDepositoryReceiptDate: '2026-02-02' });
      const depositoryPdf = await pdfText(await download(page, form.pdfButton));
      expect(depositoryPdf).toContain('Assets held in a restricted depository. Most recent receipt dated 02/02/2026.');
      expect(depositoryPdf).not.toContain('Bond waived by court order');

      // Excel: the state itself has no cell on either form. The Inventory's
      // waiver date reaches PART V G15 as it always has; the Annual's receipt
      // date reaches PART IX G9 as it always has. Nothing else is written.
      await setFields(page, { bondDepositoryState: 'bond-waived', ...BLANK_BOND, bondWaivedDate: '2026-03-03', restrictedDepositoryReceiptDate: '2026-02-02' });
      const bytes = await download(page, form.excelButton);
      if (form.type === 'guardian') {
        const p5 = await sheetText(bytes, 'PART V');
        expect(p5.get('G15'), 'the order date, as the serial for 2026-03-03').toBe('46084');
        for (const v of p5.values()) expect(v).not.toMatch(/bond-waived|depository-only|Bond waived by court order/);
      } else {
        const p9 = await sheetText(bytes, 'PART IX ');
        expect(p9.get('G9'), 'the receipt date, as the serial for 2026-02-02').toBe('46055');
        // 2026-09-24: a blank Bond Amount is a blank cell, not a $0 bond.
        expect(p9.get('H20') ?? '', 'a blank Bond Amount exports blank, not 0').toBe('');
        for (const v of p9.values()) expect(v).not.toMatch(/bond-waived|depository-only|Bond waived by court order/);
      }

      // Importing that workbook into a filing with the question unanswered
      // answers it from the one date the workbook carries -- the same rule a
      // pre-67B .sav gets on mount -- so the page and the sidebar agree.
      // The case number is blanked first so its return is the completion
      // signal (see preparer-flag.spec.ts).
      const file = path.join(os.tmpdir(), `pg-bond-${form.type}-${Date.now()}.xlsx`);
      fs.writeFileSync(file, bytes);
      const caseNumber = await page.evaluate(() => (window as any).D.caseNumber);
      expect(caseNumber, 'the fixture case number is the import signal').toBeTruthy();
      await setFields(page, { bondDepositoryState: '', ...BLANK_BOND, caseNumber: '' });
      await page.evaluate(() => (window as any).navigate('/'));
      await page.setInputFiles('input[type="file"][accept=".xlsx"]', file);
      await page.waitForFunction((cn) => (window as any).D.caseNumber === cn, caseNumber, { timeout: 20_000 });
      expect(await page.evaluate(() => (window as any).D.bondDepositoryState), 'the imported date answers the question')
        .toBe(form.type === 'guardian' ? 'bond-waived' : 'depository-only');
      // ...and the blank amount comes back blank, not as the 0 both readers
      // hand back for an empty cell (2026-09-24).
      expect(await page.evaluate(() => (window as any).D.bondAmount), 'a blank Bond Amount reads back blank, not 0').toBe('');

      // An answer the filing already had is not overwritten by a workbook
      // that cannot carry one.
      await setFields(page, { bondDepositoryState: 'bond-and-depository', caseNumber: '' });
      await page.evaluate(() => (window as any).navigate('/'));
      await page.setInputFiles('input[type="file"][accept=".xlsx"]', file);
      await page.waitForFunction((cn) => (window as any).D.caseNumber === cn, caseNumber, { timeout: 20_000 });
      expect(await page.evaluate(() => (window as any).D.bondDepositoryState), 'a stored answer survives the import').toBe('bond-and-depository');
    });
  });
}
