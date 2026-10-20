import { test, expect, type Page } from '@playwright/test';
import { freshStartNoPassword, createWard, fillMinimalValidAnnualWard } from './support/target';
import { extractPdfTextRuns } from './support/pdf-extract';

// Milestone 76H items 4 and 5, read from the generated PDF. The PDF library
// leaves out any letter its font lacks, and the font held Latin-1 only:
// "Dvořák" printed "Dvoák", "Łukasz Żółć" printed "ukasz ó" (decision 76H-1:
// embed Latin Extended-A and -B, and say on screen what still can't print).
// And it stopped drawing a line at a tab or a lone carriage return: "Reads
// well.<tab>Col two text" printed "Reads well.".

async function annualPdfText(page: Page) {
  const pdf = await page.evaluate(async () => {
    const t = (window as any).GuardianForms.testing;
    const { buildAnnualAccountingModel, generateCourtFormPdf } = await t.generateOutput.annualPdf();
    return (await generateCourtFormPdf(buildAnnualAccountingModel(t.snapshot().filing, { signatureStyle: 'typed', printDate: '2026-10-20' }))).output();
  });
  const runs = await extractPdfTextRuns(pdf);
  return runs.map((r) => r.text).join(' ').replace(/\s+/g, ' ');
}

test('names with Latin Extended letters print as typed, and a tab or carriage return no longer cuts a line short', async ({ page }) => {
  test.setTimeout(150_000);
  await freshStartNoPassword(page);
  await createWard(page, 'Letters Ward', 'annual');
  await fillMinimalValidAnnualWard(page);
  await page.evaluate(() => (window as any).GuardianForms.testing.patchFiling({
    guardian: 'Łukasz Żółć',
    'guardians.0.name': 'Łukasz Żółć',
    schA: [
      { payer: 'Antonín Dvořák', description: 'Reads well.\tCol two text', bank: 'Ştefan Bank', accountNo: '1', amount: 10 },
      { payer: 'Payer Two', description: 'Line one\rLine two', bank: 'B', accountNo: '2', amount: 5 },
    ],
    'scheduleNoItems.scha': false,
  }));
  const text = await annualPdfText(page);
  expect(text).toContain('Antonín Dvořák');
  expect(text).toContain('Łukasz Żółć');
  expect(text).toContain('Ştefan Bank');
  expect(text).toContain('Col two text');
  expect(text).toContain('Line two');
});

test('a box holding a letter the PDF can\'t print says so as the filer leaves it, and when the page is drawn again', async ({ page }) => {
  test.setTimeout(150_000);
  await freshStartNoPassword(page);
  await createWard(page, 'Note Ward', 'annual');
  const go = (route: string) => page.evaluate((r) => (window as any).GuardianForms.testing.navigate(r), route);
  await go('/p3');
  const name = page.locator('#main-content [data-form-path="guardians.0.name"], #main-content [data-field-path="guardians.0.name"]').first();
  const note = page.locator('#main-content [data-field-note="true"]');

  await name.fill('Nguyễn Văn An');
  await name.press('Tab');
  await expect(note).toHaveText('The filed PDF can\'t print "ễ": it would be left out. Type it another way.');

  await go('/p2');
  await go('/p3');
  await expect(note).toHaveText('The filed PDF can\'t print "ễ": it would be left out. Type it another way.');

  await name.fill('Nguyen Van An');
  await name.press('Tab');
  await expect(note).toHaveCount(0);
  await name.fill('Łukasz Żółć');
  await name.press('Tab');
  await expect(note).toHaveCount(0);
});
