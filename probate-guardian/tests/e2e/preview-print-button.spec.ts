import { test, expect, type Page } from '@playwright/test';
import {
  freshStartNoPassword, createWard, createSimplifiedWard, fillMinimalValidAnnualWard, fillMinimalValidSimplifiedWard,
  fillMinimalValidPlanAnnualWard, expectExportReady, clickExport,
} from './support/target';

// Milestone 73O part 4: Preview & Export works the same way on every form --
// one banner wording, a Print button (the Annual family's and the Simplified's
// Previews never had one), and the status line beside the buttons saying
// "Generating PDF…" or "Preparing Excel export…" while a file is made and
// "✓ Exported!" once it is saved (only the Inventory said anything).

const FORMS = ['guardian', 'simplified', 'annual', 'finalAccounting', 'trustAccounting', 'planSimplified', 'planAnnual', 'planInitial', 'planMinor'];
const navigate = (page: Page, route: string) => page.evaluate((r) => (window as any).GuardianForms.testing.navigate(r), route);

test.describe('73O part 4: Preview & Export the same way on every form', () => {
  test('every form\'s Preview has the one banner wording and a Print button', async ({ page }) => {
    test.setTimeout(240_000);
    await freshStartNoPassword(page);
    for (const [i, type] of FORMS.entries()) {
      await page.evaluate(([t, n]) => (window as any).GuardianForms.testing.createFiling.add(n, t), [type, `Preview Ward ${i + 1}`]);
      await navigate(page, '/print');
      const banner = page.locator('.print-preview-banner');
      await expect(banner.locator('strong').first(), type).toHaveText('Preview & Export');
      await expect(banner.getByRole('button', { name: 'Print', exact: true }), type).toHaveCount(1);
    }
  });

  test('the Annual\'s and the Simplified\'s Print button prints: it says what is missing, or opens the PDF to print', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Print Annual Ward', 'annual');
    await navigate(page, '/print');
    await page.getByRole('button', { name: 'Print', exact: true }).click();
    const dialog = page.locator('.modal-overlay.show');
    await expect(dialog).toContainText(/Cannot print: \d+ required items? still missing/);
    await dialog.getByRole('button').first().click();

    await createSimplifiedWard(page, 'Print Simplified Ward');
    await fillMinimalValidSimplifiedWard(page);
    await navigate(page, '/print');
    const popup = page.waitForEvent('popup', { timeout: 30_000 });
    await page.getByRole('button', { name: 'Print', exact: true }).click();
    // Past the missing-items check, the PDF opens in a new tab to print.
    expect(await popup).toBeTruthy();
  });

  test('saving a PDF or a workbook says so on every form, as the Inventory did', async ({ page }) => {
    test.setTimeout(240_000);
    await freshStartNoPassword(page);
    const status = page.locator('#export-status');

    await createWard(page, 'Status Plan Ward', 'planAnnual');
    await fillMinimalValidPlanAnnualWard(page);
    await navigate(page, '/print');
    const planPdf = page.locator('[data-form-action="save-pdf-plan-annual"]');
    await expectExportReady(planPdf);
    await clickExport(planPdf);
    await expect(status).toHaveText('✓ Exported!');

    await createWard(page, 'Status Annual Ward', 'annual');
    await fillMinimalValidAnnualWard(page);
    await navigate(page, '/print');
    const excel = page.locator('[data-annual-action="save-excel"]');
    await expectExportReady(excel);
    const download = clickExport(excel);
    await expect(status).toHaveText(/Preparing Excel export…|✓ Exported!/);
    await download;
    await expect(status).toHaveText('✓ Exported!');
    await expect(status).toHaveText('', { timeout: 10_000 });
  });
});
