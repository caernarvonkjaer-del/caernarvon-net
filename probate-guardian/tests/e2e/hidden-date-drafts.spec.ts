import { test, expect, type Page } from '@playwright/test';
import { freshStartNoPassword, createWard, createSimplifiedWard } from './support/target';
import { dateFieldsFor, dateUse } from '../../src/core/filing/date-fields.js';

// Milestone 76E, through the real pages. A date still being typed (text
// that isn't a date yet) blocks every output, and can't be overridden
// (decision 73F-3) -- but only while its box is in use: shown by the page, or
// carried by the court output. A bad attorney-waiver order date, then an
// attorney entered, blocked every output with the box nowhere on the page.
//
// The first test holds date-fields.js's conditions to the pages: for each
// box another answer can hide, the page shows it exactly when the list says
// it is shown. The others drive what a filer does.

const go = (page: Page, route: string) => page.evaluate((r) => (window as any).GuardianForms.testing.navigate(r), route);
const patch = (page: Page, shape: Record<string, unknown>) => page.evaluate((s) => (window as any).GuardianForms.testing.patchFiling(s), shape);
const filing = (page: Page) => page.evaluate(() => (window as any).GuardianForms.testing.snapshot().filing);
// The export checks' impossible-date blockers (decision 73F-3), as messages.
const gateMessages = async (page: Page): Promise<string[]> => (await page.evaluate(() => (window as any).GuardianForms.testing.validate.evaluate())).blockers
  .filter((i: any) => i.code === 'field.date.invalid').map((i: any) => i.message);
const box = (page: Page, path: string) => page.locator(`#main-content [data-field-path="${path}"], #main-content [data-form-path="${path}"]`).and(page.locator('input'));

function watchErrors(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  return errors;
}

const ATTORNEY_ANNUAL = { attorney: 'Ann Lawyer' };
const BOND_ANSWERS = ['', 'bond-only', 'depository-only', 'bond-and-depository', 'bond-waived'].map((s) => ({ bondDepositoryState: s }));
// Per form: a starting shape (rows the conditional boxes sit on), then for
// each page the answers tried there, in turn.
const SWEEP: Array<{ type: string; base: Record<string, unknown>; pages: Record<string, Array<Record<string, unknown>>> }> = [
  { type: 'annual', base: { trusts: [{}, {}, {}] }, pages: {
    '/': [{ attorneyWaiverBasis: 'court-order', filingType: 'Trust' }, { ...ATTORNEY_ANNUAL, filingType: 'Annual' }, { attorney: '', attorneyWaiverBasis: 'other' }],
    '/p4': [{ 'guardians.0.isPreparer': true }, { 'guardians.0.isPreparer': false }],
    '/p8': [{ 'trusts.0.hasTrust': 'Yes' }, { 'trusts.0.hasTrust': 'No' }],
    '/p9': BOND_ANSWERS,
    '/p10': [ATTORNEY_ANNUAL, { attorney: '' }],
  } },
  { type: 'simplified', base: {}, pages: { '/p6': [{ attorney: 'Ann Lawyer' }, { attorney: '' }] } },
  { type: 'guardian', base: {}, pages: {
    '/': [{ attorneyWaiverBasis: 'court-order' }, { attorneyForGuardian: 'Ann Lawyer' }, { attorneyForGuardian: '', attorneyWaiverBasis: 'other' }],
    '/d2': [{ 'guardians.0.isPreparer': true }, { 'guardians.0.isPreparer': false }],
    '/d4': BOND_ANSWERS,
    '/d5': [{ attorneyForGuardian: 'Ann Lawyer' }, { attorneyForGuardian: '' }],
  } },
  { type: 'planAnnual', base: { q10Directives: [{ courtRevoked: '' }] }, pages: {
    '/p9': [{ q10Executed: true, 'q10Directives.0.courtRevoked': 'Yes' }, { 'q10Directives.0.courtRevoked': 'No' }, { q10Executed: false }],
  } },
  { type: 'planInitial', base: { q11Directives: [{}] }, pages: { '/p8': [{ q11Executed: true }, { q11Executed: false }] } },
];

for (const form of SWEEP) test(`${form.type}: each date box another answer hides is on the page exactly when date-fields.js says it is shown`, async ({ page }) => {
  test.setTimeout(180_000);
  const errors = watchErrors(page);
  await freshStartNoPassword(page);
  const seen = new Map<string, Set<boolean>>();
  {
    if (form.type === 'simplified') await createSimplifiedWard(page, 'Sweep Ward');
    else await createWard(page, 'Sweep Ward', form.type);
    await patch(page, form.base);
    for (const [route, answers] of Object.entries(form.pages)) {
      const entries = dateFieldsFor(form.type).filter((e: any) => e.shown && e.route === route);
      expect(entries.length, `${form.type} ${route}`).toBeGreaterThan(0);
      for (const answer of answers) {
        await patch(page, answer);
        await go(page, route);
        await expect(page.locator('#main-content')).not.toBeEmpty();
        const d = await filing(page);
        for (const entry of entries as any[]) {
          const path = entry.path || `${entry.list}.0.${entry.field}`;
          const use = dateUse(d, path);
          const shown = use.inUse && !use.hiddenButPrinted;
          await expect(box(page, path), `${form.type} ${route} ${path} with ${JSON.stringify(answer)}`).toHaveCount(shown ? 1 : 0);
          const key = `${form.type} ${path}`;
          if (!seen.has(key)) seen.set(key, new Set());
          seen.get(key)!.add(shown);
        }
      }
    }
  }
  // Every condition was seen both ways, so none passed by never changing.
  expect([...seen].filter(([, both]) => both.size < 2).map(([key]) => key)).toEqual([]);
  expect(errors).toEqual([]);
});

test("a bad date in a box an answer then hides stops blocking, and is back in its box when the answer shows it again", async ({ page }) => {
  test.setTimeout(180_000);
  const errors = watchErrors(page);
  await freshStartNoPassword(page);
  await createWard(page, 'Hidden Date Ward', 'annual');
  await go(page, '/');
  await page.locator('#main-content input[name="attorney_waiver_basis"][value="court-order"]').check();
  const order = box(page, 'attorneyWaiverOrderDate');
  await order.fill('02/30/2026');
  await order.press('Tab');
  const named = 'Part I — Date of the order must be a valid date using a four-digit year.';
  await expect.poll(() => gateMessages(page)).toContain(named);

  const attorney = box(page, 'attorney');
  await attorney.fill('Ann Lawyer');
  await attorney.press('Tab');
  await expect(order).toHaveCount(0);
  expect(await gateMessages(page)).not.toContain(named);

  await attorney.fill('');
  await attorney.press('Tab');
  await expect(order).toHaveValue('02/30/2026');
  await expect.poll(() => gateMessages(page)).toContain(named);
  expect(errors).toEqual([]);
});

test('a schedule row holding only a date still being typed survives leaving the page, with the date on it', async ({ page }) => {
  test.setTimeout(180_000);
  const errors = watchErrors(page);
  await freshStartNoPassword(page);
  await createWard(page, 'Draft Row Ward', 'annual');
  await patch(page, { schB1: [], 'scheduleNoItems.schb1': false });
  await go(page, '/schb1');
  await page.locator('#main-content [data-annual-action="add-row"][data-collection="schB1"]').click();
  const paid = box(page, 'schB1.0.datePaid');
  await paid.fill('02/30/2026');
  await paid.press('Tab');
  await go(page, '/p2');
  await go(page, '/schb1');
  await expect(box(page, 'schB1.0.datePaid')).toHaveValue('02/30/2026');
  expect((await filing(page)).schB1).toHaveLength(1);
  await expect.poll(() => gateMessages(page)).toContain('Schedule B-1 — Line 1 — Date Paid must be a valid date using a four-digit year.');
  expect(errors).toEqual([]);
});

test("a Plan's date box shows the date still being typed when the page is drawn again (it showed nothing while that date blocked)", async ({ page }) => {
  test.setTimeout(180_000);
  const errors = watchErrors(page);
  await freshStartNoPassword(page);
  await createWard(page, 'Plan Draft Ward', 'planAnnual');
  await go(page, '/p9');
  await page.locator('#main-content #q10Executed').check();
  const signed = box(page, 'q10Directives.0.dateSigned');
  await signed.fill('02/30/2026');
  await signed.press('Tab');
  await go(page, '/p2');
  await go(page, '/p9');
  await expect(box(page, 'q10Directives.0.dateSigned')).toHaveValue('02/30/2026');
  await expect.poll(() => gateMessages(page)).toContain('10. Advance Directives — Directive 1 — Date executed / signed must be a valid date using a four-digit year.');
  await page.locator('#main-content #q10Executed').uncheck();
  await expect.poll(() => gateMessages(page)).not.toContain('10. Advance Directives — Directive 1 — Date executed / signed must be a valid date using a four-digit year.');
  expect(errors).toEqual([]);
});
