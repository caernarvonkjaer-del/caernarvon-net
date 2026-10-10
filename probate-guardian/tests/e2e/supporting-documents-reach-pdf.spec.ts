import { test, expect, type Page } from '@playwright/test';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import {
  freshStartNoPassword, createWard, createSimplifiedWard, dismissScheduleDocPrompt, expectExportReady, clickExport,
  fillMinimalValidPlanMinorWard, fillMinimalValidSimplifiedWard, fillMinimalValidPlanInitialWard,
  fillMinimalValidAnnualWard, fillMinimalValidPlanAnnualWard,
} from './support/target';
import { buildSupplementalAttachmentFixture } from './support/supplemental-pdf-fixture';
import { readAll } from './support/stream';

// Found 2026-10-10, fixed at the requester's named approval: a supporting
// document a filer attached never reached the saved PDF on the Plan for
// Minors (any screen -- its title stopped matching on 2026-09-07), the
// Simplified Accounting (Parts II-VII -- never mapped) or the Initial Plan's
// Attorney screen (never mapped), though each screen says "Supplemental PDFs
// are inserted as uploaded". Each screen's document now prints after its own
// section; the Minors' Questions 2 and 3 share "Questions 2-3", in screen
// order. Driven through each screen's Upload button and the Save as PDF the
// filer uses; the saved file is read for its bookmarks and pages.

type Screen = { route: string; key: string; section: string };

const FORMS: Array<{ name: string; make: (page: Page) => Promise<void>; screens: Screen[] }> = [
  {
    name: 'Plan for Minors',
    make: async (page) => { await createWard(page, 'Docs Minor', 'planMinor'); await fillMinimalValidPlanMinorWard(page); },
    screens: [
      { route: '/', key: 'planMCover', section: 'Cover' },
      { route: '/p2', key: 'planMResidences', section: 'Questions 2-3' },
      { route: '/p3', key: 'planMProviders', section: 'Questions 2-3' },
      { route: '/p4', key: 'planMMedical', section: 'Question 4' },
      { route: '/p5', key: 'planMEducation', section: 'Question 5' },
      { route: '/p6', key: 'planMSignatures', section: 'Certification' },
      { route: '/p7', key: 'planMPreparerAttorney', section: 'Preparer & Attorney' },
    ],
  },
  {
    name: 'Simplified Accounting',
    make: async (page) => { await createSimplifiedWard(page, 'Docs Simplified'); await fillMinimalValidSimplifiedWard(page); },
    screens: [
      { route: '/p2', key: 'p2', section: 'Part II - Accounting Summary' },
      { route: '/p3', key: 'p3', section: 'Part III - Guardian Declaration' },
      { route: '/p4', key: 'p4', section: 'Part IV - Guardian Information' },
      { route: '/p5', key: 'p5', section: 'Part V - Attorney Signature' },
      { route: '/p6', key: 'p6', section: 'Part VI - Certificate of Service' },
      { route: '/p7', key: 'p7', section: 'Part VII - Remuneration' },
    ],
  },
  // Found 2026-10-10: after Start New Year every filing has a year key, and
  // the PDF looked the Accountings' and Plans' documents up under it while
  // the screen files them by the year's dates -- none reached the PDF.
  {
    name: 'Annual Accounting, second year',
    make: async (page) => { await createWard(page, 'Docs Year Two', 'annual'); await fillMinimalValidAnnualWard(page); await secondYear(page, fillMinimalValidAnnualWard); },
    screens: [{ route: '/scha', key: 'schA', section: 'Schedule A - Income' }],
  },
  {
    name: 'Annual Plan, second year',
    make: async (page) => { await createWard(page, 'Docs Plan Year Two', 'planAnnual'); await fillMinimalValidPlanAnnualWard(page); await secondYear(page, fillMinimalValidPlanAnnualWard); },
    screens: [{ route: '/p2', key: 'planAResidences', section: 'Question 1' }],
  },
  {
    name: 'Initial Plan (Attorney screen)',
    make: async (page) => { await createWard(page, 'Docs Initial', 'planInitial'); await fillMinimalValidPlanInitialWard(page); },
    screens: [{ route: '/p10', key: 'planIAttorney', section: 'Attorney Certification' }],
  },
];

/**
 * Start New Year on the open filing and fill the new year, which a new year
 * clears (setup). The fixture's own dates: what matters here is the year key.
 */
async function secondYear(page: Page, fill: (page: Page) => Promise<void>) {
  await page.evaluate(async () => {
    const t = (window as any).GuardianForms.testing;
    await t.year.startNew(t.snapshot().activeFilingId);
  });
  await fill(page);
  expect(await page.evaluate(() => (window as any).GuardianForms.testing.snapshot().filing.activeYearKey), 'in its second year').toBe('Year 2');
}

/** Attaches one PDF on the screen through its own Upload button, and types a comment naming the screen. */
async function attachOn(page: Page, screen: Screen) {
  await page.evaluate((route) => (window as any).GuardianForms.testing.navigate(route), screen.route);
  await dismissScheduleDocPrompt(page);
  const fixture = await buildSupplementalAttachmentFixture(page, `ATTACHED FOR ${screen.key}`, { id: `doc-${screen.key}`, name: `${screen.key}.pdf` });
  const chooser = page.waitForEvent('filechooser');
  await page.locator(`[data-form-action="choose-schedule-docs"][data-input-id="sched-doc-input-${screen.key}"]`).click();
  await (await chooser).setFiles({ name: `${screen.key}.pdf`, mimeType: 'application/pdf', buffer: Buffer.from(fixture.dataUrl.split(',')[1], 'base64') });
  await expect(page.locator(`[data-form-action="remove-schedule-doc"][data-schedule-key="${screen.key}"]`), `${screen.key}: listed on its screen`).toHaveCount(1);
  await dismissScheduleDocPrompt(page);
  await page.locator(`textarea[data-form-input="schedule-comment"][data-schedule-key="${screen.key}"]`).fill(`Comment for ${screen.key}`);
}

/** The saved PDF's pages' text and its top-level bookmarks' first pages. */
async function readSaved(bytes: Buffer) {
  const loading = pdfjsLib.getDocument({ data: new Uint8Array(bytes), verbosity: 0 });
  const pdf = await loading.promise;
  const pages: string[] = [];
  for (let p = 1; p <= pdf.numPages; p++) {
    pages.push((await (await pdf.getPage(p)).getTextContent()).items.map((item: any) => item.str).join(' '));
  }
  const bookmarks: Array<{ title: string; page: number }> = [];
  for (const item of (await pdf.getOutline()) || []) {
    const dest = typeof item.dest === 'string' ? await pdf.getDestination(item.dest) : item.dest;
    if (dest?.[0]) bookmarks.push({ title: item.title, page: (await pdf.getPageIndex(dest[0])) + 1 });
  }
  await loading.destroy().catch(() => {});
  return { pages, bookmarks };
}

test.describe('Supporting documents reach the saved PDF, after their own section', () => {
  for (const form of FORMS) {
    test(`${form.name}: every screen's document is in the PDF, after its section`, async ({ page }) => {
      test.setTimeout(240_000);
      await freshStartNoPassword(page);
      await form.make(page);
      for (const screen of form.screens) await attachOn(page, screen);

      await page.evaluate(() => (window as any).GuardianForms.testing.save.flush());
      await page.evaluate(() => (window as any).GuardianForms.testing.navigate('/print'));
      const save = page.locator('[data-output-action="save-pdf"]').first();
      await expectExportReady(save, 60_000);
      const saved = await readSaved(await readAll(await (await clickExport(save)).createReadStream()));

      const attachedAt: number[] = [];
      for (const screen of form.screens) {
        const attached = saved.pages.findIndex((text) => text.includes(`ATTACHED FOR ${screen.key}`)) + 1;
        expect(attached, `${screen.key}: its document is in the saved PDF`).toBeGreaterThan(0);
        const start = saved.bookmarks.find((b) => b.title === screen.section)?.page ?? 0;
        expect(start, `${screen.section}: bookmarked (${JSON.stringify(saved.bookmarks)})`).toBeGreaterThan(0);
        const next = saved.bookmarks.filter((b) => b.page > start).map((b) => b.page).sort((a, b) => a - b)[0] ?? saved.pages.length + 1;
        // The PDF's Supporting Documents block prints the filer's comment, not the file's name.
        const listed = saved.pages.findIndex((text, i) => i + 1 >= start && text.includes(`Comment for ${screen.key}`)) + 1;
        expect(listed, `${screen.key}: listed under ${screen.section}`).toBeGreaterThanOrEqual(start);
        expect(listed, `${screen.key}: listed under ${screen.section}, before the next section`).toBeLessThanOrEqual(next);
        expect(attached, `${screen.key}: its pages follow its section's list`).toBeGreaterThan(listed);
        attachedAt.push(attached);
      }
      // Screens sharing a section, and screens in order: their documents in screen order.
      expect([...attachedAt].sort((a, b) => a - b), 'in screen order').toEqual(attachedAt);
    });
  }
});
