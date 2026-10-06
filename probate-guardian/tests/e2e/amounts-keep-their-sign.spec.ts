import { test, expect, type Page } from '@playwright/test';
import { freshStartNoPassword, createWard, createSimplifiedWard, dismissScheduleDocPrompt } from './support/target';
import { extractPdfText } from './support/pdf-extract';

// Milestone 73G part 1: one way to read, keep and show an amount, in the
// browser. Before it, a box holding a negative -- imported, carried or
// converted -- showed it as positive and stored it back positive when the
// filer merely tabbed through; negative D-1 to D-4 amounts were set to 0 on
// every page drawn; "(1000)" typed as the Clerk's Schedule E asks became
// 1000; and "$1,234.56" in the Simplified's remuneration Amount filed as
// $0.00. The filing is patched only to stand in for what an import or an
// older save leaves; every edit is made in the real box.

const go = (page: Page, route: string) => page.evaluate((r) => (window as any).GuardianForms.testing.navigate(r), route);
const field = (page: Page, p: string) => page.evaluate((x) => (window as any).GuardianForms.testing.field(x), p);
const patch = (page: Page, shape: Record<string, unknown>) => page.evaluate((s) => (window as any).GuardianForms.testing.patchFiling(s), shape);

function watchErrors(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  return errors;
}

test('Annual: an imported -50 on Schedule A shows as -50 and survives a tab-through', async ({ page }) => {
  const errors = watchErrors(page);
  await freshStartNoPassword(page);
  await createWard(page, 'Tab Through Ward', 'annual');
  await patch(page, { schA: [{ payer: 'Bank', description: 'Refund reversal', bank: 'Bank', accountNo: '1', amount: -50 }] });
  await go(page, '/scha');
  await dismissScheduleDocPrompt(page);
  const box = page.locator('#main-content input[data-annual-path="schA.0.amount"]');
  await expect(box).toHaveValue('-50');
  await box.focus();
  await page.keyboard.press('Tab');
  expect(await field(page, 'schA.0.amount')).toBe(-50);
  expect(errors).toEqual([]);
});

test('Annual: an imported -200 on Schedule D-1 survives a page change', async ({ page }) => {
  const errors = watchErrors(page);
  await freshStartNoPassword(page);
  await createWard(page, 'Overdrawn Ward', 'annual');
  await patch(page, { schD1: [{ description: 'Checking (overdrawn)', accountNo: '1', restricted: 'No', type: 'Checking', fullAmount: -200, wardPct: 100 }] });
  await go(page, '/schd1');
  await dismissScheduleDocPrompt(page);
  await go(page, '/');
  await go(page, '/schd1');
  await dismissScheduleDocPrompt(page);
  expect(await field(page, 'schD1.0.fullAmount')).toBe(-200);
  await expect(page.locator('#main-content input[data-annual-path="schD1.0.fullAmount"]')).toHaveValue('-200');
  expect(errors).toEqual([]);
});

test('Annual: "(1000)" typed in Schedule E\'s Transfer Out, as the Clerk\'s workbook asks, is stored as -1000', async ({ page }) => {
  const errors = watchErrors(page);
  await freshStartNoPassword(page);
  await createWard(page, 'Parentheses Ward', 'annual');
  await patch(page, { schE: [{ bankName: 'Bank', transferOutAmt: '' }] });
  await go(page, '/sche');
  await dismissScheduleDocPrompt(page);
  const box = page.locator('#main-content input[data-annual-path="schE.0.transferOutAmt"]');
  await box.click();
  await box.pressSequentially('(1000)');
  await box.blur();
  await expect.poll(() => field(page, 'schE.0.transferOutAmt')).toBe(-1000);
  await expect(box).toHaveValue('-1000');
  expect(errors).toEqual([]);
});

test('Simplified: "$1,234.56" in the remuneration Amount is stored as 1234.56 and files as $1,234.56', async ({ page }) => {
  test.setTimeout(120_000);
  const errors = watchErrors(page);
  await freshStartNoPassword(page);
  await createSimplifiedWard(page, 'Remuneration Amount Ward');
  await go(page, '/p7');
  await page.locator('[data-simplified-action="add-remuneration"]').click();
  await page.locator('[data-form-path="remuneration.0.guardian"]').fill('Jane Guardian');
  await page.locator('[data-form-path="remuneration.0.type"]').fill('Guardian Fee');
  const box = page.locator('[data-form-path="remuneration.0.amount"]');
  await box.fill('$1,234.56');
  await box.blur();
  expect(await field(page, 'remuneration.0.amount')).toBe(1234.56);
  await expect(box).toHaveValue('1234.56');
  await page.evaluate(() => (window as any).GuardianForms.testing.save.flush());
  const text = await extractPdfText(await page.evaluate(async () => {
    const w = window as any;
    const { buildSimplifiedAccountingModel, generateCourtFormPdf } = await w.GuardianForms.testing.generateOutput.simplifiedPdf();
    const doc = await generateCourtFormPdf(buildSimplifiedAccountingModel(w.GuardianForms.testing.snapshot().filing, { printDate: '2026-10-06' }));
    return doc.output();
  }));
  expect(text).toContain('$1,234.56');
  expect(errors).toEqual([]);
});

test("Annual: an amount typed in a way that can't be read stays as typed, is marked, and is named before filing", async ({ page }) => {
  const errors = watchErrors(page);
  await freshStartNoPassword(page);
  await createWard(page, 'Unreadable Amount Ward', 'annual');
  await patch(page, { schA: [{ payer: 'Bank', description: 'Interest', bank: 'Bank', accountNo: '1', amount: '' }] });
  await go(page, '/scha');
  await dismissScheduleDocPrompt(page);
  const box = page.locator('#main-content input[data-annual-path="schA.0.amount"]');
  await box.fill('1.000,50');
  await box.blur();
  await expect(box).toHaveValue('1.000,50');
  await expect(box).toHaveAttribute('aria-invalid', 'true');
  await expect(page.locator('#main-content [data-amount-feedback="true"]')).toContainText("can't be read as an amount");
  expect(await field(page, 'schA.0.amount')).toBe('1.000,50');
  const named = await page.evaluate(async () => (await (window as any).GuardianForms.testing.validate.evaluate()).blockers.filter((i: any) => i.code === 'field.amount.unreadable').map((i: any) => [i.path, i.route]));
  expect(named).toEqual([['schA.0.amount', '/scha']]);
  // Drawn again later (a reopened filing), the box still says so.
  await go(page, '/');
  await go(page, '/scha');
  await dismissScheduleDocPrompt(page);
  await expect(page.locator('#main-content input[data-annual-path="schA.0.amount"]')).toHaveAttribute('aria-invalid', 'true');
  expect(errors).toEqual([]);
});
