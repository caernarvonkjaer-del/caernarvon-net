import { test, expect, type Page } from '@playwright/test';
import { freshStartNoPassword, createWard, fillMinimalValidPlanAnnualWard } from './support/target';
import { readAll } from './support/stream';
import { extractPdfText } from './support/pdf-extract';

// Milestone 68G. Annual Plan question 6 asks, for twelve rights, whether the
// ward is now capable of having each restored. The court's form (page 6)
// has FOUR columns -- Yes / No / Not Removed / Needs to be Restored -- and
// the app offered three, dropping "No", so a guardian whose ward had a right
// removed and is NOT capable of having it restored had no honest answer.
// §744.3675(3)(b) requires a statement of whether the ward can have rights
// restored, which admits "no".
//
// Settled 2026-09-24: the form's four columns, in its order. The three
// existing stored values are unchanged ("Capable of restoration" is shown
// as the form's "Yes"), a stored "No" is new, and nothing is migrated -- a
// blank right stays blank.

const RIGHTS_ROUTE = '/p6';
const go = (page: Page, route: string) => page.evaluate((r) => (window as any).GuardianForms.testing.navigate(r), route);
const radio = (page: Page, right: string, value: string) => page.locator(`#main-content input[name="right_${right}"][value="${value}"]`);
const rights = (page: Page) => page.evaluate(() => ({ ...(window as any).GuardianForms.testing.field('rights') }));
const issues = (page: Page) => page.evaluate(async () => ((await (window as any).GuardianForms.testing.validate.open()) || []).map((i: any) => String(i?.message ?? i)));

test('question 6 shows the court form\'s four columns, "No" is a stored answer, and "Yes" keeps its stored value', async ({ page }) => {
  test.setTimeout(120_000);
  await freshStartNoPassword(page);
  await createWard(page, 'Annual Plan Rights No', 'planAnnual');
  await fillMinimalValidPlanAnnualWard(page);
  await go(page, RIGHTS_ROUTE);

  // The header is the form's, in the form's order.
  await expect(page.locator('#main-content .plan-rights-table thead th')).toHaveText(['Right', 'Yes', 'No', 'Not Removed', 'Needs to be Restored']);

  // "No" is an answer of its own.
  await radio(page, 'marry', 'No').check();
  expect((await rights(page)).marry).toBe('No');

  // "Yes" is the existing stored value, so saved plans read unchanged, and
  // it still raises the petition note.
  await radio(page, 'vote', 'Capable of restoration').check();
  expect((await rights(page)).vote).toBe('Capable of restoration');
  // The question 7 note is decided when the page renders (unchanged by this
  // item), so re-open the page before reading it.
  await go(page, RIGHTS_ROUTE);
  await expect(page.locator('#main-content')).toContainText(/marked at least one right as capable of restoration/i);

  // Both count as answered.
  expect((await issues(page)).filter((m) => /still unanswered in question 6/.test(m))).toEqual([]);

  // The PDF prints the form's words.
  await page.evaluate(() => (window as any).GuardianForms.testing.save.flush());
  await go(page, '/print');
  const button = page.locator('[data-form-action="save-pdf-plan-annual"]');
  await expect(button).toBeEnabled({ timeout: 20_000 });
  const dl = page.waitForEvent('download', { timeout: 40_000 });
  await button.click();
  const text = (await extractPdfText(await readAll(await (await dl).createReadStream()))).replace(/\s+/g, ' ');
  expect(text).toContain('Right to marry No');
  expect(text).toContain('Right to vote Yes');
  expect(text).not.toContain('Capable of restoration');
});

test('a plan saved with "Capable of restoration" shows that answer as Yes, and a blank right stays blank', async ({ page }) => {
  await freshStartNoPassword(page);
  await createWard(page, 'Annual Plan Rights Legacy', 'planAnnual');
  await fillMinimalValidPlanAnnualWard(page);
  await page.evaluate(() => { const w = window as any; w.GuardianForms.testing.patchFiling({ 'rights.travel': 'Capable of restoration' }); w.GuardianForms.testing.patchFiling({ 'rights.marry': '' }); w.GuardianForms.testing.save.auto(); });
  await go(page, RIGHTS_ROUTE);
  await expect(radio(page, 'travel', 'Capable of restoration')).toBeChecked();
  await expect(page.locator('#main-content input[name="right_marry"]:checked')).toHaveCount(0);
  expect((await rights(page)).marry, 'never guessed').toBe('');
  expect((await issues(page)).some((m) => /1 right still unanswered in question 6/.test(m)), 'a blank right is still unanswered').toBe(true);
});
