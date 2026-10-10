import { test, expect, type Page } from '@playwright/test';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import {
  freshStartNoPassword, createWard, dismissScheduleDocPrompt, expectExportReady, clickExport,
  fillMinimalValidAnnualWard, fillMinimalValidPlanAnnualWard,
} from './support/target';
import { buildSupplementalAttachmentFixture } from './support/supplemental-pdf-fixture';
import { readAll } from './support/stream';

// Milestone 75A (decision 75A-1, "join and offer", the requester 2026-10-10).
// A document attached before the reporting dates were typed dropped out of
// the screen and the PDF once they were; so did a page's documents when a
// date was corrected. Now the first joins the dates as they're typed, and
// after a correction the section offers to move the documents here --
// nothing moves without the click. A new year still starts empty, offering
// nothing of the year before.

const SECTION = '.schedule-docs-section';
const go = (page: Page, route: string) => page.evaluate((r) => (window as any).GuardianForms.testing.navigate(r), route);
const dateBox = (page: Page, path: string) => page.locator(`[data-form-path="${path}"], [data-bind="${path}"]`).first();

async function attach(page: Page, key: string, text: string) {
  const fixture = await buildSupplementalAttachmentFixture(page, text, { id: `doc-${key}`, name: `${key}.pdf` });
  const chooser = page.waitForEvent('filechooser');
  await page.locator(`[data-form-action="choose-schedule-docs"][data-input-id="sched-doc-input-${key}"]`).click();
  await (await chooser).setFiles({ name: `${key}.pdf`, mimeType: 'application/pdf', buffer: Buffer.from(fixture.dataUrl.split(',')[1], 'base64') });
  await expect(page.locator(`${SECTION} .sched-doc-name`, { hasText: `${key}.pdf` })).toHaveCount(1);
  await dismissScheduleDocPrompt(page);
}

async function typeDate(page: Page, path: string, value: string) {
  const box = dateBox(page, path);
  await box.fill(value);
  await box.blur();
}

/** The text of every page of the PDF the filer saves from the Preview. */
async function savedPdfText(page: Page): Promise<string> {
  await page.evaluate(() => (window as any).GuardianForms.testing.save.flush());
  await go(page, '/print');
  const save = page.locator('[data-output-action="save-pdf"]').first();
  await expectExportReady(save, 60_000);
  const bytes = await readAll(await (await clickExport(save)).createReadStream());
  const loading = pdfjsLib.getDocument({ data: new Uint8Array(bytes), verbosity: 0 });
  const pdf = await loading.promise;
  const pages: string[] = [];
  for (let p = 1; p <= pdf.numPages; p++) pages.push((await (await pdf.getPage(p)).getTextContent()).items.map((item: any) => item.str).join(' '));
  await loading.destroy().catch(() => {});
  return pages.join('\n');
}

test.describe('Milestone 75A: supporting documents follow the reporting dates', () => {
  test('a document attached before the dates stays when they are typed, on the same page, and is filed', async ({ page }) => {
    test.setTimeout(180_000);
    await freshStartNoPassword(page);
    await createWard(page, 'Dates Plan', 'planAnnual');
    await go(page, '/');
    await dismissScheduleDocPrompt(page);
    await expect(page.locator(`${SECTION} h2`).first()).toContainText('set the reporting period on the Cover page');
    await attach(page, 'planACover', 'PHYSICIAN LETTER');

    // The Cover's own date boxes; the section is on the same page.
    await typeDate(page, 'periodFrom', '01/01/2026');
    await typeDate(page, 'periodTo', '12/31/2026');
    // Where the document is filed now (the section also leaves an empty slot
    // for each set of dates it is drawn under, as it always has). Before 75A
    // it stayed under no dates, out of the screen's and the PDF's sight.
    await expect.poll(() => page.evaluate(() => Object.fromEntries(Object.entries((window as any).GuardianForms.testing.snapshot().filing.scheduleDocs.planACover)
      .filter(([, slot]: any) => slot.files.length).map(([key, slot]: any) => [key, slot.files.map((f: any) => f.name)]))),
      { message: 'filed under the dates now' }).toEqual({ '2026-01-01__2026-12-31': ['planACover.pdf'] });
    await expect(page.locator(`${SECTION} h2`).first(), 'the heading follows at once').toContainText('reporting period 01/01/2026 to 12/31/2026');
    await expect(page.locator(`${SECTION} .sched-doc-name`, { hasText: 'planACover.pdf' }), 'still listed').toHaveCount(1);

    await fillMinimalValidPlanAnnualWard(page);
    expect(await savedPdfText(page)).toContain('PHYSICIAN LETTER');
  });

  test('after a date is corrected, the section offers the documents, and moves them only when asked', async ({ page }) => {
    test.setTimeout(180_000);
    await freshStartNoPassword(page);
    await createWard(page, 'Dates Annual', 'annual');
    await fillMinimalValidAnnualWard(page);
    await go(page, '/scha');
    await dismissScheduleDocPrompt(page);
    await attach(page, 'schA', 'BANK STATEMENT');

    await go(page, '/');
    await typeDate(page, 'periodTo', '12/30/2026');
    await go(page, '/scha');
    await dismissScheduleDocPrompt(page);
    const offer = page.locator(`${SECTION} .sched-doc-elsewhere`);
    await expect(page.locator(`${SECTION} .sched-doc-row`), 'the corrected dates hold nothing yet').toHaveCount(0);
    await expect(offer).toHaveText('1 document is attached under 01/01/2026 to 12/31/2026. Move it to these dates');

    await offer.getByRole('button', { name: 'Move it to these dates' }).click();
    await expect(page.locator(`${SECTION} .sched-doc-name`, { hasText: 'schA.pdf' })).toHaveCount(1);
    await expect(offer).toHaveCount(0);
    expect(await savedPdfText(page)).toContain('BANK STATEMENT');
  });

  test('a new year starts empty and offers nothing of the year before', async ({ page }) => {
    test.setTimeout(180_000);
    await freshStartNoPassword(page);
    await createWard(page, 'Dates New Year', 'annual');
    await fillMinimalValidAnnualWard(page);
    await go(page, '/scha');
    await dismissScheduleDocPrompt(page);
    await attach(page, 'schA', 'LAST YEAR');

    await page.evaluate(async () => {
      const t = (window as any).GuardianForms.testing;
      await t.year.startNew(t.snapshot().activeFilingId);
    });
    await go(page, '/');
    await typeDate(page, 'periodFrom', '01/01/2027');
    await typeDate(page, 'periodTo', '12/31/2027');
    await go(page, '/scha');
    await dismissScheduleDocPrompt(page);
    await expect(page.locator(`${SECTION} .sched-doc-row`)).toHaveCount(0);
    await expect(page.locator(`${SECTION} .sched-doc-elsewhere`), 'last year\'s documents stay last year\'s').toHaveCount(0);
    expect(await page.evaluate(() => Object.keys((window as any).GuardianForms.testing.snapshot().filing.scheduleDocs.schA)),
      'kept under last year\'s dates').toContain('2026-01-01__2026-12-31');
  });
});
