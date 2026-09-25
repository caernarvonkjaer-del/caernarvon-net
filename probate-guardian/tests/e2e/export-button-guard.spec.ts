import { expect, test } from '@playwright/test';
import { createWard, fillMinimalValidGuardianWard, fillMinimalValidPlanMinorWard, freshStartNoPassword } from './support/target';

// Milestone 67. Reported live against the deployed portable build: clicking
// "Save as PDF" produced a browser warning that the download was blocked
// because "this page tried to save multiple files automatically." Root
// cause, confirmed by reading every doSavePdf()/doSaveExcel() across all
// seven filing types: none disabled its button during the async export, so
// a second click while the first was still generating fired a second, near-
// simultaneous automatic download -- exactly what a browser's multiple-
// automatic-downloads protection blocks. beginExport() (Milestone 67,
// src/core/ui/export-guard.js) fixes this once, for every filing type's
// Save as PDF/Excel button.
//
// What this proves that tests/unit/export-guard.spec.js's isolated-function
// test cannot: that the real button, in the real rendered page, is actually
// wired to the guard -- a wrong selector string would make beginExport()
// silently find nothing and do nothing, which is invisible without driving
// the real click.

test.describe('Save as PDF/Excel: a second click while one is already running does nothing', () => {
  test('Plan Minor Save as PDF -- the exact button this was reported against', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Export Guard Plan Minor Ward', 'planMinor');
    await fillMinimalValidPlanMinorWard(page);
    await page.evaluate(() => (window as any).GuardianForms.testing.navigate('/print'));

    const selector = '[data-form-action="save-pdf-plan-minor"]';
    const btn = page.locator(selector);
    await expect(btn).toBeEnabled();

    const downloadPromise = page.waitForEvent('download', { timeout: 20_000 });

    // Dispatch the click and read `disabled` back in the same page.evaluate()
    // round trip -- no `await` between the two, so this observes the state
    // exactly as it is the instant the synchronous part of the click handler
    // finishes (beginExport() disables the button before doSavePdf()'s first
    // `await`), regardless of how fast PDF generation itself turns out to be.
    const disabledImmediatelyAfterClick = await page.evaluate((sel) => {
      const el = document.querySelector(sel) as HTMLButtonElement;
      el.click();
      return el.disabled;
    }, selector);
    expect(disabledImmediatelyAfterClick, 'the button must already be disabled synchronously after the click that starts the export').toBe(true);

    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain('AnnualPlanMinors');

    // The export finished; a real retry (or a legitimate second export) must
    // still work -- this is a re-entrancy guard, not a one-shot lockout.
    await expect(btn).toBeEnabled();
    const secondDownloadPromise = page.waitForEvent('download', { timeout: 20_000 });
    await btn.click();
    await secondDownloadPromise;
  });

  test('Guardian Inventory -- both Save as PDF and Save as Excel guard independently', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Export Guard Guardian Ward', 'guardian');
    await fillMinimalValidGuardianWard(page);
    await page.evaluate(() => (window as any).GuardianForms.testing.navigate('/print'));

    const pdfSelector = '[data-inventory-action="save-pdf"]';
    const excelSelector = '[data-inventory-action="save-excel"]';

    const pdfDownloadPromise = page.waitForEvent('download', { timeout: 20_000 });
    const pdfDisabledImmediately = await page.evaluate((sel) => {
      const el = document.querySelector(sel) as HTMLButtonElement;
      el.click();
      return el.disabled;
    }, pdfSelector);
    expect(pdfDisabledImmediately, 'Save as PDF must disable synchronously on click').toBe(true);
    await pdfDownloadPromise;
    await expect(page.locator(pdfSelector)).toBeEnabled();

    const excelDownloadPromise = page.waitForEvent('download', { timeout: 20_000 });
    const excelDisabledImmediately = await page.evaluate((sel) => {
      const el = document.querySelector(sel) as HTMLButtonElement;
      el.click();
      return el.disabled;
    }, excelSelector);
    expect(excelDisabledImmediately, 'Save as Excel must disable synchronously on click, independently of the PDF button').toBe(true);
    // Save as PDF must not have been affected by Save as Excel's own guard --
    // each button's disabled state is its own, not a single shared lock.
    expect(await page.locator(pdfSelector).isDisabled()).toBe(false);
    await excelDownloadPromise;
    await expect(page.locator(excelSelector)).toBeEnabled();
  });
});
