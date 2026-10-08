import { test, expect, type Page } from '@playwright/test';
import {
  freshStartNoPassword, createWard, createSimplifiedWard, fillMinimalValidAnnualWard, fillMinimalValidSimplifiedWard,
  fillMinimalValidGuardianWard, fillMinimalValidPlanAnnualWard, acceptDynDialog, dismissDynDialog,
  expectExportReady, clickExport,
} from './support/target';
import { readAll } from './support/stream';
import { extractPdfText } from './support/pdf-extract';

// Milestone 74B: a co-guardian the filer has started is in the filing. A filer
// can apply a co-guardian's stamp before typing the co-guardian's name. On the
// Annual family and the Simplified no check, workbook or PDF included such a
// card -- the filer saw the stamp on the page and filed without it, warned of
// nothing; the Inventory's checks asked for its name, but after an override
// its PDF left the card out. Now one rule decides "started" on all nine forms
// (rowStarted(): a stamp counts), the checks ask for the card's details, and
// the PDF prints its block in its own place, labelled by its card. A started
// Plan co-guardian is checked like the first guardian.

const STAMP = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAAAAonXk=';
const go = (page: Page, route: string) => page.evaluate((r) => (window as any).GuardianForms.testing.navigate(r), route);
const openPaths = (page: Page): Promise<string[]> => page.evaluate(async () => (await (window as any).GuardianForms.testing.validate.open()).map((m: any) => String(m.path || '')));

function watchErrors(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  return errors;
}

/** A guardian card holding only an applied stamp, appended through the filing (after the first card only, with `onlyFirst`); its index. */
async function stampOnlyCoGuardian(page: Page, list = 'guardians', onlyFirst = false): Promise<number> {
  return page.evaluate(({ list, stamp, onlyFirst }) => {
    const T = (window as any).GuardianForms.testing;
    const rows = T.field(list).slice(0, onlyFirst ? 1 : undefined);
    const blank = Object.fromEntries(Object.entries(rows[0]).map(([k, v]) => [k, typeof v === 'boolean' ? false : '']));
    T.patchFiling({ [list]: [...rows, { ...blank, signatureState: 'stamp', signatureImage: stamp }] });
    return rows.length;
  }, { list, stamp: STAMP, onlyFirst });
}

/** Print Preview: the blocked list, then Continue, then the saved PDF's text. */
async function previewOverrideAndSave(page: Page, saveSelector: string) {
  await page.evaluate(() => (window as any).GuardianForms.testing.save.flush());
  await go(page, '/');
  await go(page, '/print');
  const blocked = page.locator('#print-doc-container .pdf-preview-blocked');
  await expect(blocked).toBeVisible({ timeout: 60_000 });
  const listed = await blocked.locator('.pdf-preview-blocked-list').textContent();
  await page.locator('#print-doc-container [data-preview-action="override"]').click();
  await acceptDynDialog(page);
  const button = page.locator(saveSelector);
  await expectExportReady(button, 60_000);
  const dl = clickExport(button, 120_000);
  const text = (await extractPdfText(await readAll(await (await dl).createReadStream()))).replace(/\s+/g, ' ');
  return { listed: String(listed || ''), text };
}

const ACCOUNTINGS: Array<[string, (page: Page) => Promise<void>, string, string]> = [
  ['annual', async (page) => { await createWard(page, 'Stamped Annual', 'annual'); await fillMinimalValidAnnualWard(page); }, '[data-annual-action="save-pdf"]', 'Co-Guardian #2'],
  ['simplified', async (page) => { await createSimplifiedWard(page, 'Stamped Simplified'); await fillMinimalValidSimplifiedWard(page); }, '[data-simplified-action="save-pdf"]', 'Co-Guardian #2'],
  ['guardian', async (page) => { await createWard(page, 'Stamped Inventory', 'guardian'); await fillMinimalValidGuardianWard(page); }, '[data-inventory-action="save-pdf"]', 'Guardian #2'],
];

for (const [type, make, saveSelector, label] of ACCOUNTINGS) {
  test(`${type}: a co-guardian holding only a stamp is checked, and printed in its own place after an override`, async ({ page }) => {
    test.setTimeout(240_000);
    const errors = watchErrors(page);
    await freshStartNoPassword(page);
    await make(page);
    expect(await stampOnlyCoGuardian(page), 'the second card').toBe(1);
    expect(await openPaths(page), 'the checks ask for its name').toContain('guardians.1.name');
    const { listed, text } = await previewOverrideAndSave(page, saveSelector);
    expect(listed, 'Preview lists it').toContain('Guardian #2');
    expect(text, 'the PDF prints its block, labelled by its card').toContain(label);
    expect(errors).toEqual([]);
  });
}

test('the Annual Plan: a started co-guardian is checked like the first guardian', async ({ page }) => {
  test.setTimeout(180_000);
  const errors = watchErrors(page);
  await freshStartNoPassword(page);
  await createWard(page, 'Stamped Plan', 'planAnnual');
  await fillMinimalValidPlanAnnualWard(page);
  // The fixture's Plan already lists co-guardians; this card goes after them.
  const i = await stampOnlyCoGuardian(page, 'planGuardians');
  const paths = await openPaths(page);
  for (const field of ['name', 'mailingStreet', 'phone', 'ssn']) expect(paths, field).toContain(`planGuardians.${i}.${field}`);
  // Its Signatures page names them. Leaving the page clears the fixture's
  // untouched cards (73C) and keeps this one, so it may move up the list.
  await go(page, '/');
  await go(page, '/p11');
  const now = (await page.evaluate(() => (window as any).GuardianForms.testing.field('planGuardians'))).findIndex((g: any) => g.signatureImage === STAMP);
  expect(now, 'kept').toBeGreaterThan(0);
  await expect(page.locator('#main-content #page-local-guidance')).toContainText(`Co-Guardian ${now + 1} printed name is required`);
  expect(errors).toEqual([]);
});

// Remove's existing confirmation asks before deleting a started card -- the
// stamp included. It used to delete a stamp-only card without a word.
const REMOVES: Array<[string, (page: Page) => Promise<void>, string, string, string]> = [
  ['annual', async (page) => { await createWard(page, 'Remove Annual', 'annual'); await fillMinimalValidAnnualWard(page); }, 'guardians', '/p3', '[data-annual-action="remove-row"][data-collection="guardians"][data-index="1"]'],
  ['simplified', async (page) => { await createSimplifiedWard(page, 'Remove Simplified'); await fillMinimalValidSimplifiedWard(page); }, 'guardians', '/p4', '[data-simplified-action="remove-guardian"][data-index="1"]'],
  ['planAnnual', async (page) => { await createWard(page, 'Remove Plan', 'planAnnual'); await fillMinimalValidPlanAnnualWard(page); }, 'planGuardians', '/p11', '[data-form-action="remove-plan-guardian"][data-index="1"]'],
];

for (const [type, make, list, route, removeSelector] of REMOVES) {
  test(`${type}: Remove asks before deleting a co-guardian holding only a stamp`, async ({ page }) => {
    test.setTimeout(120_000);
    const errors = watchErrors(page);
    await freshStartNoPassword(page);
    await make(page);
    expect(await stampOnlyCoGuardian(page, list, true)).toBe(1);
    await go(page, route);
    const stamped = () => page.evaluate((l) => (window as any).GuardianForms.testing.field(l).map((g: any) => !!g.signatureImage), list);
    await page.locator(`#main-content ${removeSelector}`).click();
    expect(await dismissDynDialog(page), 'it asks').toContain('Remove co-guardian #2?');
    expect(await stamped(), 'Cancel keeps the card and its stamp').toEqual([false, true]);
    await page.locator(`#main-content ${removeSelector}`).click();
    await acceptDynDialog(page);
    await expect.poll(stamped, { message: 'confirming removes it' }).toEqual([false]);
    expect(errors).toEqual([]);
  });
}
