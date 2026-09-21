import { expect, test, type Page } from '@playwright/test';
import { freshStartNoPassword } from './support/target';

// Milestone 63E. Every filing type's Cover has an optional UCN (Uniform Case Number) field beside Case
// Number. It is kept exactly as typed -- it is NOT run through the Case Number formatter, which would
// reshape a 20-character UCN into something the court cannot match -- it persists, and leaving it blank
// changes nothing (no validation error, no placeholder). The print side is proved in
// pdf-form-specific.spec.ts and tests/unit/ucn-header.spec.js.
//
// Each filing type's cover binds its inputs its own way (data-bind, data-field-path or data-annual-path), so
// the field is found by whichever of those carries the path.

const TYPES = [
  { label: 'Initial Inventory', type: 'guardian' },
  { label: 'Annual Accounting', type: 'annual' },
  { label: 'Simplified Accounting', type: 'simplified' },
  { label: 'Plan - Simplified', type: 'planSimplified' },
  { label: 'Plan - Initial', type: 'planInitial' },
  { label: 'Plan - Annual', type: 'planAnnual' },
  { label: 'Plan - Minor', type: 'planMinor' },
] as const;

const ucnInput = (page: Page) => page.locator(
  '#main-content input[data-bind="ucn"], #main-content input[data-field-path="ucn"], #main-content input[data-annual-path="ucn"]',
).first();

const UCN = '50-2026-ga-000123-xxxx-xx';   // deliberately lower-case: kept as typed, not case-folded or reformatted

for (const { label, type } of TYPES) {
  test(`${label}: the Cover's UCN is kept as typed, persists across navigation, and is optional`, async ({ page }) => {
    await freshStartNoPassword(page);
    await page.evaluate(([t]) => (window as any).addWard(`Ucn ${t}`, t), [type]);
    await page.evaluate(() => (window as any).navigate('/'));

    const input = ucnInput(page);
    await expect(input, `the ${label} Cover should have a UCN field`).toBeVisible();

    // Optional: blank by default, and it is not one of the things the filer is told is missing.
    await expect(input).toHaveValue('');
    const missingBefore: string[] = await page.evaluate(() => {
      const w = window as any;
      const raw = (w.validateGuardian || w.validateAnnual || w.validateSimplified || w.validatePlanAnnual
        || w.validatePlanInitial || w.validatePlanMinor || w.validatePlanSimplified)?.(w.D) || [];
      return raw.map((e: any) => String(e?.message ?? e));
    });
    expect(missingBefore.filter((m) => /\bUCN\b/i.test(m)), 'a blank UCN is never reported as missing').toEqual([]);

    // Kept exactly as typed.
    await input.fill(UCN);
    await input.blur();
    await expect(input).toHaveValue(UCN);
    expect(await page.evaluate(() => (window as any).D.ucn), 'stored exactly as typed').toBe(UCN);

    // Survives leaving the page and coming back.
    await page.evaluate(() => (window as any).navigate('/summary'));
    await page.evaluate(() => (window as any).navigate('/'));
    await expect(ucnInput(page)).toHaveValue(UCN);
  });
}
