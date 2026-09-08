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
