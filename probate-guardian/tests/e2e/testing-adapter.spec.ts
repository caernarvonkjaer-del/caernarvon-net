import { test, expect } from '@playwright/test';
import { gotoApp, startNewCase, chooseNoPassword, createWard } from './support/target';

// Milestone 70, 70T: GuardianForms.testing in a real page (the unit contract
// is tests/unit/testing-adapter.spec.js).
//   - D3/T3: it exists only when the runner set the pre-boot flag -- which the
//     test support's gotoApp() now does -- and setting the flag after the page
//     has booted enables nothing.
//   - D9: setField() is the edit a filer makes (the form's own normalization
//     runs); patchFiling() is setup and deliberately skips it.

test.describe('GuardianForms.testing in the page', () => {
  test('present when the runner enabled it before boot; the flag itself is gone', async ({ page }) => {
    await gotoApp(page);
    expect(await page.evaluate(() => ({
      testing: typeof (window as any).GuardianForms?.testing?.snapshot,
      flagLeft: '__GUARDIAN_FORMS_TEST_MODE__' in window,
    }))).toEqual({ testing: 'function', flagLeft: false });
  });

  test('absent on an ordinary launch, and a flag set after boot enables nothing', async ({ page }) => {
    await gotoApp(page, { testMode: false });
    expect(await page.evaluate(() => typeof (window as any).GuardianForms)).toBe('undefined');
    await page.evaluate(() => { (window as any).__GUARDIAN_FORMS_TEST_MODE__ = true; });
    await page.waitForTimeout(200);
    expect(await page.evaluate(() => typeof (window as any).GuardianForms)).toBe('undefined');
  });

  test('setField() makes the edit a filer makes; patchFiling() only arranges data', async ({ page }) => {
    await gotoApp(page);
    await startNewCase(page);
    await chooseNoPassword(page);
    await createWard(page, 'Adapter Ward', 'guardian');
    // The Cover page shows the case number field. A typed case number is
    // normalized by the form (finalizeCaseNumber); a patched one is not.
    const typed = await page.evaluate(() => {
      const t = (window as any).GuardianForms.testing;
      t.setField('caseNumber', '26cp123');
      return t.field('caseNumber');
    });
    const patched = await page.evaluate(() => {
      const t = (window as any).GuardianForms.testing;
      t.patchFiling({ caseNumber: '26cp123' });
      return t.field('caseNumber');
    });
    expect(patched, 'setup writes exactly what it is given').toBe('26cp123');
    expect(typed, 'a real edit is normalized').not.toBe('26cp123');
  });

  test('queries are copies: changing a snapshot changes nothing in the app', async ({ page }) => {
    await gotoApp(page);
    await startNewCase(page);
    await chooseNoPassword(page);
    await createWard(page, 'Copy Ward', 'guardian');
    const after = await page.evaluate(() => {
      const t = (window as any).GuardianForms.testing;
      const snap = t.snapshot(); // copy-write: deliberate -- the point is that it changes nothing
      snap.filing.wardName = 'Changed in the copy';
      snap.caseFile.wards.length = 0;
      return t.snapshot();
    });
    expect(after.filing.wardName).toBe('Copy Ward');
    expect(after.caseFile.wards).toHaveLength(1);
  });
});
