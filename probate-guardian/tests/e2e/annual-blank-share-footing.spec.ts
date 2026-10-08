import { test, expect, type Page } from '@playwright/test';
import { freshStartNoPassword, createWard, fillMinimalValidAnnualWard, acceptDynDialog, dismissScheduleDocPrompt, expectExportReady, clickExport } from './support/target';
import { readAll } from './support/stream';
import { extractPdfText } from './support/pdf-extract';

// Milestone 71D. A filer who left a Schedule D-1 Ward's % blank saw the full
// amount counted in the on-screen totals and Line 30, but a PDF exported
// through "Continue despite outstanding requirements" printed that row's
// Ward's Amount as $0.00 and its Ward's % as "100%" while the schedule total
// still included the whole amount -- a filed column that did not add up. A
// blank share now counts as 0% everywhere (decision D3), as the court's
// workbook computes it, and prints as "—". The D-1 instruction no longer tells
// the filer to type 1 for 100% (it is read as 1%).

const navigate = (page: Page, route: string) => page.evaluate((r) => (window as any).GuardianForms.testing.navigate(r), route);

test('Annual D-1 with a blank share: the exported column adds up, and the blank prints as "—"', async ({ page }) => {
  test.setTimeout(240_000);
  await freshStartNoPassword(page);
  await createWard(page, 'Blank Share Footing', 'annual');
  await fillMinimalValidAnnualWard(page);
  await page.evaluate(() => {
    const row = (description: string, fullAmount: number, wardPct: string) => ({ description, accountNo: '1', restricted: 'No', type: 'Checking', fullAmount, wardPct, restrictedAmt: '' });
    (window as any).GuardianForms.testing.patchFiling({ schD1: [row('Whole Account', 1000, '100'), row('Blank Share', 5000, ''), row('Half Account', 200, '50')] });
  });

  // On screen: the blank row adds nothing, as in the workbook.
  expect(await page.evaluate(() => (window as any).GuardianForms.testing.status.annualTotals().schD1_total)).toBe(1100);

  // The D-1 instruction says 0-100, not "1 for 100%".
  await navigate(page, '/schd1');
  await dismissScheduleDocPrompt(page); // a schedule with rows asks about supporting documents as it opens
  const instructions = page.locator('#main-content .schedule-instructions').first();
  await expect(instructions).toContainText('as a number from 0 to 100');
  await expect(instructions).not.toContainText('as decimal');

  await page.evaluate(() => (window as any).GuardianForms.testing.save.flush());
  await navigate(page, '/print');
  await page.locator('#print-doc-container .pdf-preview-blocked [data-preview-action="override"]').click();
  await acceptDynDialog(page);
  const button = page.locator('[data-annual-action="save-pdf"]');
  await expectExportReady(button, 20_000);
  const dl = clickExport(button, 40_000);
  const pdf = (await extractPdfText(await readAll(await (await dl).createReadStream()))).replace(/\s+/g, ' ');

  // Each row prints its own Ward's Amount; they add up to the printed total.
  expect(pdf).toMatch(/Whole Account .*?\$1,000\.00 100% \$1,000\.00/);
  expect(pdf).toMatch(/Blank Share .*?\$5,000\.00 — \$0\.00/);
  expect(pdf).toMatch(/Half Account .*?\$200\.00 50% \$100\.00/);
  expect(pdf).toContain("Cash Assets Total (Ward's Amount) $1,100.00");
  expect(pdf, 'a blank share never prints as 100%').not.toMatch(/Blank Share .*?\$5,000\.00 100%/);
});
