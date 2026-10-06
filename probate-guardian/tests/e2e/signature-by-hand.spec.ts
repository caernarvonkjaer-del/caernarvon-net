import { test, expect, type Page } from '@playwright/test';
import {
  freshStartNoPassword, createWard, createSimplifiedWard, fillMinimalValidAnnualWard, fillMinimalValidPlanAnnualWard,
  reopenFilingWithStoredShape, acceptDynDialog, autoAcceptDynDialogs,
} from './support/target';
import { readAll } from './support/stream';
import { extractPdfText } from './support/pdf-extract';
import { exportWithWrites } from './support/workbook-vs-template';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// Milestone 73A: Unsigned prints a blank line; guardians sign by hand or by
// stamp. An Unsigned guardian printed "/s/ Name" above the Rule 2.515
// electronic-signature caption on all nine forms. The requester's decision
// (2026-10-04, Pinellas Clerk practice resting on the court workbook's "Only
// the guardian's signature must be original"; flagged for a qualified person):
// a guardian signs by hand (Unsigned) or with a Signature Stamp, never "/s/";
// attorneys and outside preparers keep all three choices. A filing being
// prepared moves to the new rule when opened, and a guardian's saved "/s/" is
// asked again; a closed filing and an archived year keep what they were filed
// with; Mark Open asks again; New Year clears every choice and stamp; an Excel
// import never changes the rule.

const t = (page: Page) => page.evaluate(() => (window as any).GuardianForms.testing.snapshot().filing);
const patch = (page: Page, shape: Record<string, unknown>) => page.evaluate((s) => (window as any).GuardianForms.testing.patchFiling(s), shape);
const go = (page: Page, route: string) => page.evaluate((r) => (window as any).GuardianForms.testing.navigate(r), route);
const issues = (page: Page): Promise<string[]> => page.evaluate(async () => (await (window as any).GuardianForms.testing.validate.open()).map((m: any) => String(m.message)));
const ASKED = 'Part III — Guardian #1 signature: choose Unsigned (to sign by hand) or Signature Stamp; a guardian no longer signs with "/s/"';

function watchErrors(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  return errors;
}

/** The PDF Save as PDF downloads, as text; past an acknowledgeable override if one is asked. */
async function pdfText(page: Page, selector: string): Promise<string> {
  await page.evaluate(() => (window as any).GuardianForms.testing.save.flush());
  await go(page, '/');
  await go(page, '/print');
  const button = page.locator(selector);
  await expect(button).toBeAttached({ timeout: 60_000 });
  if (await button.isDisabled()) {
    await page.locator('#print-doc-container [data-preview-action="override"]').click();
    await acceptDynDialog(page);
  }
  await expect(button).toBeEnabled({ timeout: 60_000 });
  const dl = page.waitForEvent('download', { timeout: 120_000 });
  await button.click();
  return (await extractPdfText(await readAll(await (await dl).createReadStream()))).replace(/\s+/g, ' ');
}

/** The choices a signature control offers, '*' marking the chosen one. */
const choices = (page: Page, group: string) => page.locator(`#main-content [data-signature-state-group="${group}"] input[type="radio"]`)
  .evaluateAll((radios) => radios.map((r) => `${(r as HTMLInputElement).value}${(r as HTMLInputElement).checked ? '*' : ''}`));

test('the Annual: an Unsigned guardian prints a blank line to sign by hand; the attorney\'s "/s/" still prints', async ({ page }) => {
  test.setTimeout(240_000);
  const errors = watchErrors(page);
  await freshStartNoPassword(page);
  await createWard(page, 'By Hand Annual', 'annual');
  await fillMinimalValidAnnualWard(page);
  await patch(page, { 'attorney_signatureState': 'typed' });
  await go(page, '/p3');
  expect(await choices(page, 'guardians.0'), 'a guardian: Unsigned or Signature Stamp, Unsigned chosen though a date is typed').toEqual(['none*', 'stamp']);
  await go(page, '/p5');
  expect(await choices(page, 'attorney')).toEqual(['none', 'typed*', 'stamp']);
  const text = await pdfText(page, '[data-annual-action="save-pdf"]');
  expect(text).toContain('Signature of Sample Guardian');
  expect(text).not.toContain('/s/ Sample Guardian');
  expect(text).toContain('/s/ Sample Attorney');
  expect(errors).toEqual([]);
});

test('the Annual Plan: an Unsigned guardian prints a blank line to sign by hand', async ({ page }) => {
  test.setTimeout(240_000);
  const errors = watchErrors(page);
  await freshStartNoPassword(page);
  await createWard(page, 'By Hand Plan', 'planAnnual');
  await fillMinimalValidPlanAnnualWard(page);
  const text = await pdfText(page, '[data-form-action="save-pdf-plan-annual"]');
  expect(text).toContain('Signature of Sample Guardian');
  expect(text).not.toContain('/s/ Sample Guardian');
  expect(errors).toEqual([]);
});

test('every form: a guardian\'s signature offers Unsigned and Signature Stamp, never "/s/"', async ({ page }) => {
  test.setTimeout(300_000);
  const errors = watchErrors(page);
  await freshStartNoPassword(page);
  const FORMS: Array<[string, string, string]> = [
    ['guardian', '/d1', 'guardians.0'], ['annual', '/p3', 'guardians.0'], ['finalAccounting', '/p3', 'guardians.0'], ['trustAccounting', '/p3', 'guardians.0'],
    ['simplified', '/p4', 'guardians.0'], ['planInitial', '/p9', 'planGuardians.0'], ['planAnnual', '/p11', 'planGuardians.0'],
    ['planMinor', '/p6', 'planGuardians.0'], ['planSimplified', '/p3', 'planGuardians.0'],
  ];
  for (const [type, route, group] of FORMS) {
    if (type === 'simplified') await createSimplifiedWard(page, `Choices ${type}`);
    else await createWard(page, `Choices ${type}`, type);
    await go(page, route);
    expect(await choices(page, group), type).toEqual(['none*', 'stamp']);
  }
  expect(errors).toEqual([]);
});

test('a filing being prepared, opened, asks again for a guardian\'s saved "/s/"', async ({ page }) => {
  test.setTimeout(240_000);
  const errors = watchErrors(page);
  await freshStartNoPassword(page);
  await createWard(page, 'Asked Again', 'annual');
  await fillMinimalValidAnnualWard(page);
  // As a filing saved before the guardian rule: no policy, the guardian's
  // blank choice with a date (which printed "/s/").
  const reopened = await reopenFilingWithStoredShape(page, { signaturePolicy: null, 'guardians.0.signatureState': '' });
  expect(reopened.signaturePolicy).toBe(2);
  expect(reopened.guardians[0].signatureState, 'the implied "/s/" made explicit').toBe('typed');
  expect(await issues(page)).toContain(ASKED);
  await go(page, '/p3');
  expect(await choices(page, 'guardians.0'), 'nothing chosen').toEqual(['none', 'stamp']);
  await expect(page.locator('#main-content .signature-ask-again')).toContainText('A guardian no longer signs with "/s/"');
  // Choosing Unsigned answers it.
  await page.locator('label[for="sigstate_guardians_0_none"]').click();
  await expect.poll(() => issues(page)).not.toContain(ASKED);
  expect(errors).toEqual([]);
});

test('a closed filing keeps and reprints its "/s/"; Mark Open asks again', async ({ page }) => {
  test.setTimeout(300_000);
  const errors = watchErrors(page);
  await freshStartNoPassword(page);
  await createWard(page, 'Closed Filing', 'annual');
  await fillMinimalValidAnnualWard(page);
  const id = (await t(page)).wardId;
  const closed = await reopenFilingWithStoredShape(page, { signaturePolicy: null, archived: true, 'guardians.0.signatureState': '' });
  expect(closed.signaturePolicy ?? null, 'a closed filing is not moved to the guardian rule').toBeNull();
  expect(closed.guardians[0].signatureState).toBe('');
  expect(await issues(page)).not.toContain(ASKED);
  const text = await pdfText(page, '[data-annual-action="save-pdf"]');
  expect(text, 'a reprint matches the filed copy').toContain('/s/ Sample Guardian');

  // Mark Open, through the dashboard's Closed Filings.
  await go(page, '/dashboard');
  await page.locator('[data-dashboard-action="toggle-closed"]').click();
  await page.locator(`#dashboard-closed-queue [data-dashboard-action="archive"][data-ward-id="${id}"]`).click();
  await page.evaluate((wardId) => (window as any).GuardianForms.testing.activateFiling.open(wardId), id);
  const reopened = await t(page);
  expect(reopened.archived).toBeFalsy();
  expect(reopened.signaturePolicy).toBe(2);
  expect(await issues(page)).toContain(ASKED);
  expect(errors).toEqual([]);
});

test('an archived year switched back in reprints its "/s/", and keeps it after reopening', async ({ page }) => {
  test.setTimeout(300_000);
  const errors = watchErrors(page);
  await freshStartNoPassword(page);
  await createWard(page, 'Filed Year', 'annual');
  await fillMinimalValidAnnualWard(page);
  // Year 1, filed before the guardian rule: its snapshot has no policy and
  // the guardian's blank choice with a date.
  const id = await page.evaluate(() => {
    const T = (window as any).GuardianForms.testing;
    const f = T.snapshot().filing;
    const SYSTEM = ['wardId', 'inventoryType', 'createdDate', 'lastModified', 'archived', 'scheduleDocs', 'years', 'activeYearKey', 'yearCounter'];
    const data = Object.fromEntries(Object.entries(f).filter(([k]) => !SYSTEM.includes(k)));
    delete (data as any).signaturePolicy;
    (data as any).guardians = (data as any).guardians.map((g: any) => ({ ...g, signatureState: '' }));
    T.patchFiling({ years: [{ key: 'Year 1', label: '2025', archivedAt: '2026-01-31T00:00:00.000Z', data }], activeYearKey: 'Year 2', yearCounter: 2 });
    return f.wardId;
  });
  await page.evaluate(() => (window as any).GuardianForms.testing.save.flush());
  await go(page, '/dashboard');
  await page.locator(`[data-dashboard-action="prior-years"][data-ward-id="${id}"]`).click();
  await page.locator('[data-form-action="edit-prior-year"][data-year-key="Year 1"]').click();
  await page.waitForFunction((wid) => (window as any).GuardianForms.testing.snapshot().caseFile.wards.find((w: any) => w.wardId === wid)?.activeYearKey === 'Year 1', id);
  expect((await t(page)).signaturePolicy, 'a filed year keeps the rule it was filed under').toBe(1);
  const text = await pdfText(page, '[data-annual-action="save-pdf"]');
  expect(text).toContain('/s/ Sample Guardian');
  // Reopened later, still Year 1's rule.
  const again = await reopenFilingWithStoredShape(page, {});
  expect(again.signaturePolicy).toBe(1);
  expect(again.guardians[0].signatureState).toBe('');
  expect(errors).toEqual([]);
});

test('New Year clears every signer\'s choice and stamp, and an Excel import keeps the rule', async ({ page }) => {
  test.setTimeout(300_000);
  const errors = watchErrors(page);
  await freshStartNoPassword(page);
  await createWard(page, 'Stamped', 'annual');
  await fillMinimalValidAnnualWard(page);
  const STAMP = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAAAAonXk=';
  await patch(page, { 'guardians.0.signatureState': 'stamp', 'guardians.0.signatureImage': STAMP, attorney_signatureState: 'stamp', attorney_signatureImage: STAMP });
  const id = (await t(page)).wardId;
  await page.evaluate(() => (window as any).GuardianForms.testing.save.flush());
  await go(page, '/dashboard');
  await page.locator(`[data-dashboard-action="new-year"][data-ward-id="${id}"]`).click();
  await page.locator('[data-modal-action="start-new-year"]').click();
  await page.waitForFunction((wid) => (window as any).GuardianForms.testing.snapshot().caseFile.wards.find((w: any) => w.wardId === wid)?.activeYearKey === 'Year 2', id);
  const year2 = await t(page);
  expect([year2.guardians[0].signatureState, year2.guardians[0].signatureImage, year2.attorney_signatureState, year2.attorney_signatureImage]).toEqual(['', '', '', '']);
  expect(year2.signaturePolicy).toBe(2);

  // A year marked 1 stays 1 through an export and re-import of its workbook.
  await patch(page, { signaturePolicy: 1 });
  const { bytes } = await exportWithWrites(page, 'annual');
  const file = path.join(os.tmpdir(), `pg-sig-policy-${Date.now()}.xlsx`);
  fs.writeFileSync(file, bytes);
  await patch(page, { wardName: 'Import Pending' });
  await go(page, '/');
  const dialogs = autoAcceptDynDialogs(page);
  await page.setInputFiles('input[type="file"][accept=".xlsx"]', file);
  await expect.poll(() => page.evaluate(() => {
    const box = document.querySelector('input[type="file"][accept=".xlsx"]') as HTMLInputElement | null;
    return (window as any).GuardianForms.testing.field('wardName') !== 'Import Pending' && !box?.files?.length;
  }), { timeout: 60_000 }).toBe(true);
  dialogs.stop();
  await page.waitForTimeout(300);
  expect((await t(page)).signaturePolicy, 'the import never changes the rule').toBe(1);
  expect(errors).toEqual([]);
});
