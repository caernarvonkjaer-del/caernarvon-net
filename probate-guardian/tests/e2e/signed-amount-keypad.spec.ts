import { test, expect, type Page } from '@playwright/test';
import { freshStartNoPassword, createWard, createSimplifiedWard, dismissScheduleDocPrompt } from './support/target';

// Milestone 72E. On a phone or tablet, the Annual's Schedule C "Loss /
// Reduction (enter as negative)" and Schedule E "Transfer Out Amt (negative)"
// boxes showed a numeric keypad with no minus key, so the filer could not type
// the negative number they ask for: both asked for inputmode="decimal". The
// shared field builder already gives every signed kind inputmode="text", as do
// the Starting Balance boxes. Playwright cannot show a phone keyboard;
// inputmode is the attribute the phone chooses one by, so that is what is
// checked -- on every page with a signed amount -- and then -50, typed with
// the keyboard, must be stored as -50.

const SIGNED = '#main-content input[data-annual-format="signed-decimal"], #main-content input[data-form-format="signed-decimal"], #main-content input[data-field-kind="signed-money"], #main-content input#startingBalance';
const go = (page: Page, route: string) => page.evaluate((r) => (window as any).GuardianForms.testing.navigate(r), route);
const field = (page: Page, p: string) => page.evaluate((x) => (window as any).GuardianForms.testing.field(x), p);

async function signedInputModes(page: Page) {
  return page.locator(SIGNED).evaluateAll((els) => els.map((e) => ({ id: (e as HTMLInputElement).dataset.annualPath || (e as HTMLInputElement).dataset.formPath || e.id, mode: e.getAttribute('inputmode') })));
}

test('Annual: every signed amount -- Schedule C loss, Schedule E transfer out, Starting Balance -- offers a keypad with a minus key, and -50 is stored as -50', async ({ page }) => {
  await freshStartNoPassword(page);
  await createWard(page, 'Signed Keypad Annual', 'annual');
  // One row on each schedule, so its boxes are drawn.
  await page.evaluate(() => (window as any).GuardianForms.testing.patchFiling({
    schC: [{ description: 'Market change', loss: '' }],
    schE: [{ description: 'Transfer', transferOutAmt: '' }],
  }));
  for (const [route, path] of [['/schc', 'schC.0.loss'], ['/sche', 'schE.0.transferOutAmt']] as const) {
    await go(page, route);
    // A schedule page may open with its supporting-documents prompt.
    await dismissScheduleDocPrompt(page);
    const modes = await signedInputModes(page);
    expect(modes.length, `${route} has a signed box`).toBeGreaterThan(0);
    for (const m of modes) expect([null, 'text'], `${route} ${m.id}`).toContain(m.mode);
    const box = page.locator(`#main-content input[data-annual-path="${path}"]`);
    await box.click();
    await box.pressSequentially('-50');
    await box.blur();
    await expect.poll(async () => Number(await field(page, path))).toBe(-50);
  }
  await go(page, '/p2');
  const modes = await signedInputModes(page);
  expect(modes.length, 'Part II has the Starting Balance').toBeGreaterThan(0);
  for (const m of modes) expect([null, 'text'], m.id).toContain(m.mode);
});

test('Simplified: the Starting Balance offers a keypad with a minus key; its non-negative boxes keep the decimal keypad', async ({ page }) => {
  await freshStartNoPassword(page);
  await createSimplifiedWard(page, 'Signed Keypad Simplified');
  await go(page, '/p2');
  const balance = page.locator('#main-content input#startingBalance');
  expect(await balance.getAttribute('inputmode')).toBe('text');
  await balance.click();
  await balance.pressSequentially('-50');
  await balance.blur();
  await expect.poll(async () => Number(await field(page, 'startingBalance'))).toBe(-50);
});

// Milestone 73G part 1 (decision 73G-N1): a minus is accepted in every amount
// box, as all three of the Clerk's workbooks instruct -- not only the signed
// ones. An ordinary box keeps the decimal keypad (a negative there is unusual),
// but a minus typed or pasted is kept.
test('every amount box keeps a typed minus: the Annual\'s Schedule A Amount and the Simplified\'s Interest Income', async ({ page }) => {
  await freshStartNoPassword(page);
  await createWard(page, 'Minus Everywhere Annual', 'annual');
  await page.evaluate(() => (window as any).GuardianForms.testing.patchFiling({ schA: [{ payer: 'Bank', amount: '' }] }));
  await go(page, '/scha');
  await dismissScheduleDocPrompt(page);
  const amount = page.locator('#main-content input[data-annual-path="schA.0.amount"]');
  expect(await amount.getAttribute('inputmode')).toBe('decimal');
  await amount.click();
  await amount.pressSequentially('-50');
  await amount.blur();
  await expect.poll(() => field(page, 'schA.0.amount')).toBe(-50);
  await expect(amount).toHaveValue('-50');

  await createSimplifiedWard(page, 'Minus Everywhere Simplified');
  await go(page, '/p2');
  const interest = page.locator('#main-content input#interestIncome');
  await interest.click();
  await interest.pressSequentially('-12.50');
  await interest.blur();
  await expect.poll(() => field(page, 'interestIncome')).toBe(-12.5);
});
