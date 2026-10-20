import { test, expect } from '@playwright/test';
import { freshStartNoPassword, createWard, fillMinimalValidAnnualWard, acceptDynDialog } from './support/target';

// Milestone 76J item 1, through the real Preview. A guardian has a blank Type
// of Guardianship (an ordinary item they can override) and a supporting
// statement that isn't a usable PDF. Save as Excel said to choose "Continue
// despite outstanding requirements" -- but Preview offered no Continue,
// because the statement problem can't be overridden, though the workbook
// never contains statements. Now the Excel reason line has its own Continue,
// the blocked list says which outputs each problem stops, and after it Save
// as Excel saves; the PDF stays blocked.

test('a PDF-only problem leaves Save as Excel its own Continue', async ({ page }) => {
  test.setTimeout(180_000);
  await freshStartNoPassword(page);
  await createWard(page, 'Excel Continue Ward', 'annual');
  await fillMinimalValidAnnualWard(page);
  await page.evaluate(() => {
    const t = (window as any).GuardianForms.testing;
    const d = t.snapshot().filing;
    const period = `${d.periodFrom || ''}__${d.periodTo || ''}`;
    t.patchFiling({ // setup (D9)
      typeOfGuardianship: '',
      scheduleDocs: { schA: { [period]: { comment: '', files: [{ name: 'statement.pdf', size: 5, dataUrl: 'data:application/pdf;base64,aGVsbG8=', technicalStatus: 'ready' }] } } },
    });
    return t.navigate('/print');
  });

  await expect(page.locator('#print-doc-container .pdf-preview-blocked')).toBeVisible();
  await expect(page.locator('#print-doc-container [data-preview-action="override"]')).toHaveCount(0);
  await page.locator('#print-doc-container .pdf-preview-blocked-details summary').click();
  await expect(page.locator('#print-doc-container [data-issue-outputs="pdf"]').first()).toContainText('PDF only');

  const continueExcel = page.locator('[data-export-continue="excel"]');
  await expect(continueExcel).toBeVisible();
  await continueExcel.click();
  await acceptDynDialog(page);
  await expect(continueExcel).toHaveCount(0);

  const download = page.waitForEvent('download');
  await page.locator('[data-annual-action="save-excel"]').click();
  // The fixture's Lines 20/30 explanation has no box in the court's workbook,
  // so Save as Excel asks first (Milestone 73M) -- not a refusal.
  const asked = await acceptDynDialog(page);
  expect(asked).toContain('Save the workbook without');
  expect((await download).suggestedFilename()).toMatch(/\.xlsx$/);
});
