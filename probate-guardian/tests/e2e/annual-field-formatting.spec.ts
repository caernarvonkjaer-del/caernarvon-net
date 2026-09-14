import { test, expect } from '@playwright/test';
import { freshStartNoPassword, createWard, fillMinimalValidAnnualWard } from './support/target';

// Regression coverage for two Annual Accounting field-level bugs, both
// isolated to inpD() (this feature's own field-rendering helper -- every
// other module already got these right):
//
//  1. SSN/EIN inputs were type="password" instead of the CSS-based
//     .ssn-masked convention every other module uses. A real password field
//     in the DOM makes Chrome's password manager offer to save it, using
//     whatever text input happens to sit nearest as the "username" --
//     observed with a Signature Date field standing in as the "username".
//
//  2. Schedule E's combined "Bank Name / Account #" field matched inpD()'s
//     isName heuristic (its label contains "name"), routing it through
//     formatName()'s title-casing. A guardian who types an account number
//     partially masked by their bank statement (e.g. "xxxx1234") had the
//     leading character capitalized on blur and in the exported PDF.
test.describe('Annual Accounting field formatting', () => {
  test('SSN/EIN fields use CSS masking, not a real password input', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Field Formatting Ward', 'annual');
    await fillMinimalValidAnnualWard(page);

    // Part V (Guardian Attorney Signature) identifies the attorney by Bar
    // Number, not SSN/EIN -- only Part III (Guardians) and Part IV
    // (Preparer) have an SSN/EIN field to check.
    for (const route of ['/p3', '/p4']) {
      await page.evaluate((r) => (window as any).navigate(r), route);
      const ssnInputs = page.locator('input.ssn-masked');
      const count = await ssnInputs.count();
      expect(count, `${route} should have at least one SSN/EIN field`).toBeGreaterThan(0);
      for (let i = 0; i < count; i++) {
        await expect(ssnInputs.nth(i)).toHaveAttribute('type', 'text');
      }
      // The reveal button toggles visibility via a class, not by swapping
      // input type -- confirm the existing app-wide toggle-ssn handler
      // still recognizes these inputs after the type change.
      const revealBtn = page.locator('.ssn-reveal-btn').first();
      await revealBtn.click();
      await expect(ssnInputs.first()).toHaveClass(/ssn-revealed/);
    }
  });

  test('Schedule E bank name / account field is not title-cased', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Field Formatting Ward', 'annual');
    await fillMinimalValidAnnualWard(page);

    await page.evaluate(() => (window as any).navigate('/sche'));
    await page.locator('[data-annual-action="add-row"][data-collection="schE"]').click();
    const bankInput = page.locator('input[data-annual-path^="schE."][data-annual-path$=".bankName"]').first();
    await bankInput.fill('xxxx1234 suncoast bank');
    await bankInput.blur();
    await expect(bankInput).toHaveValue('xxxx1234 suncoast bank');

    const stored = await page.evaluate(() => (window as any).D.schE[0].bankName);
    expect(stored).toBe('xxxx1234 suncoast bank');
  });
});

// Annual/Final/Trust's own persistAnnualControl() write path is retired;
// every field now writes through form-contract.js like Simplified Accounting
// and the four Plans. These pin the parts only that retired path used to do,
// and that it is genuinely gone rather than still running alongside.
test.describe('Annual Accounting on the shared write path', () => {
  test('a name field is written by exactly one path: two autosaves for input then blur, not three', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Single Writer Ward', 'annual');
    await page.evaluate(() => (window as any).navigate('/scha'));
    await page.locator('[data-annual-action="add-row"][data-collection="schA"]').click();
    const payer = page.locator('[data-annual-path="schA.0.payer"]');
    await payer.waitFor({ state: 'visible' });

    // Before this, the container listener and the document listener both
    // claimed this field (it carries data-field-path AND data-annual-path):
    // input ran the tail once, blur ran it twice -- three autosaves.
    await page.evaluate(() => {
      (window as any).__autoSaves = 0;
      (window as any).autoSave = () => { (window as any).__autoSaves += 1; };
    });
    await payer.fill('social security administration');
    await payer.blur();
    await expect(payer).toHaveValue('Social Security Administration');
    expect(await page.evaluate(() => (window as any).__autoSaves)).toBe(2);
    expect(await page.evaluate(() => (window as any).D.schA[0].payer)).toBe('Social Security Administration');
  });

  test('Schedule C loss keeps its minus: filtered live, a negative Number on blur, live totals following', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Signed Decimal Ward', 'annual');
    await page.evaluate(() => (window as any).navigate('/schc'));
    await page.locator('[data-annual-action="add-row"][data-collection="schC"]').click();
    const loss = page.locator('[data-annual-path="schC.0.loss"]');
    await loss.waitFor({ state: 'visible' });

    // This field is hand-rolled (data-annual-path only, no data-field-path):
    // the one kind of Annual control the shared listener never used to see.
    await loss.fill('-1,250');
    await expect(loss).toHaveValue('-1250');
    await expect(page.locator('[data-annual-total="schC_losses"]')).toHaveText('(1,250.00)');
    expect(await page.evaluate(() => (window as any).D.schC[0].loss)).toBe('-1250');

    await loss.blur();
    expect(await page.evaluate(() => (window as any).D.schC[0].loss)).toBe(-1250);
    await expect(loss).toHaveValue('-1250');
    await expect(page.locator('[data-annual-total="schC_net"]')).toHaveText('(1,250.00)');
  });

  test('an amount filters live as typed, so "1,000" never reaches the running total as 1', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Live Filter Ward', 'annual');
    await page.evaluate(() => (window as any).navigate('/scha'));
    await page.locator('[data-annual-action="add-row"][data-collection="schA"]').click();
    const amount = page.locator('[data-annual-path="schA.0.amount"]');
    await amount.waitFor({ state: 'visible' });

    await amount.fill('1,000');
    await expect(amount).toHaveValue('1000');
    await expect(page.locator('[data-annual-total="schA"]')).toHaveText('1,000.00');
    expect(await page.evaluate(() => (window as any).D.schA[0].amount)).toBe('1000');
    await amount.blur();
    expect(await page.evaluate(() => (window as any).D.schA[0].amount)).toBe(1000);
  });

  test('phone and SSN format on blur through the shared finalizer', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Blur Format Ward', 'annual');
    await page.evaluate(() => (window as any).navigate('/p3'));

    const phone = page.locator('[data-annual-path="guardians.0.phone"]');
    await phone.fill('5555550101');
    await phone.blur();
    await expect(phone).toHaveValue('(555) 555-0101');
    expect(await page.evaluate(() => (window as any).D.guardians[0].phone)).toBe('(555) 555-0101');

    const ssn = page.locator('[data-annual-path="guardians.0.ssn"]');
    await ssn.fill('123456789');
    await ssn.blur();
    await expect(ssn).toHaveValue('123-45-6789');
    expect(await page.evaluate(() => (window as any).D.guardians[0].ssn)).toBe('123-45-6789');
  });
});
