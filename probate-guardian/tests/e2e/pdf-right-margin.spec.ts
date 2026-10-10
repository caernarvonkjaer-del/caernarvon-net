import { test, expect, type Page } from '@playwright/test';
import {
  createSimplifiedWard, createWard, fillMinimalValidAnnualWard, fillMinimalValidGuardianWard,
  fillMinimalValidPlanAnnualWard, fillMinimalValidPlanInitialWard, fillMinimalValidPlanMinorWard,
  fillMinimalValidPlanSimplifiedWard, fillMinimalValidSimplifiedWard, freshStartNoPassword,
} from './support/target';

// Milestone 73N part 1: no ink past the one-inch right margin, on any page of
// any of the nine forms, with realistically long typed text. Every heading
// and title was drawn on one line: a long ward name ran the page-1 caption off
// the paper, a long bank name did the same to Schedule B-4's account title and
// its "Subtotal -- ..." label, and the Simplified Annual Plan's Question 8,
// once a box is ticked, was about 625pt wide in a 468pt column. Only the
// Inventory's schedules had a check like this
// (guardian-inventory-schedule-layout.spec.ts).
//
// Real ink, read off the rendered canvas: pdf.js's text-layer widths come out
// about 16% wide (signature-block-address-margin.spec.ts), so they would
// report overflow no ink commits. Red-first: every form fails with the source
// set aside (the caption alone runs off the page).

const PAGE_W_PT = 612;
const RIGHT_EDGE_PT = 540;
const EDGE_TOLERANCE_PT = 1.5; // a rule centred on the content edge straddles it

const LONG_WARD = 'Alexandria Maximiliana Konstantinopoulou-Worthington-Smythe III';
const LONG_BANK = 'First National Bank and Trust Company of the Greater Tampa Bay Metropolitan Region';

const FORMS: Array<{ type: string; make: (page: Page) => Promise<void>; long?: Record<string, unknown> }> = [
  { type: 'guardian', make: async (p) => { await createWard(p, 'Margin GI', 'guardian'); await fillMinimalValidGuardianWard(p); } },
  { type: 'simplified', make: async (p) => { await createSimplifiedWard(p, 'Margin SA'); await fillMinimalValidSimplifiedWard(p); } },
  ...['annual', 'finalAccounting', 'trustAccounting'].map((type) => ({
    type,
    make: async (p: Page) => { await createWard(p, `Margin ${type}`, type); await fillMinimalValidAnnualWard(p); },
    long: {
      schB4Accounts: [{ id: 'acct-long', bankName: LONG_BANK, accountNumber: '0011-2233-4455' }],
      schB4: [{ checkNo: '101', datePaid: '2026-03-01', category: 'Utilities', payee: 'Power Co', amount: 125, bankAccountId: 'acct-long' }],
    },
  })),
  {
    type: 'planSimplified',
    make: async (p) => { await createWard(p, 'Margin PS', 'planSimplified'); await fillMinimalValidPlanSimplifiedWard(p); },
    long: { q8None: false, q8DNR: true, q8LivingWill: true },
  },
  { type: 'planAnnual', make: async (p) => { await createWard(p, 'Margin PA', 'planAnnual'); await fillMinimalValidPlanAnnualWard(p); } },
  { type: 'planInitial', make: async (p) => { await createWard(p, 'Margin PI', 'planInitial'); await fillMinimalValidPlanInitialWard(p); } },
  { type: 'planMinor', make: async (p) => { await createWard(p, 'Margin PM', 'planMinor'); await fillMinimalValidPlanMinorWard(p); } },
];

/** The rightmost inked point on each rendered page, and where on the page it is. */
async function inkPastRightEdge(page: Page) {
  // Milestone 73R part 3: the Preview draws only the pages on screen; this reads every page.
  await page.evaluate(() => (window as any).GuardianForms.testing.preview.drawAll());
  return page.evaluate(([pageW, edge]) => {
    const out: Array<{ page: number; xPt: number; yPt: number }> = [];
    [...document.querySelectorAll('#print-doc-container .pdf-page')].forEach((host, idx) => {
      const canvas = host.querySelector('canvas') as HTMLCanvasElement | null;
      if (!canvas) return;
      const pxPerPt = canvas.width / pageW;
      const x0 = Math.ceil(edge * pxPerPt);
      const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
      const img = ctx.getImageData(x0, 0, canvas.width - x0, canvas.height).data;
      const w = canvas.width - x0;
      for (let y = 0; y < canvas.height; y++) {
        for (let x = w - 1; x >= 0; x--) {
          const i = ((y * w) + x) * 4;
          if (img[i] < 200 || img[i + 1] < 200 || img[i + 2] < 200) {
            out.push({ page: idx + 1, xPt: Math.round(((x0 + x + 1) / pxPerPt) * 10) / 10, yPt: Math.round((y / pxPerPt) * 10) / 10 });
            return;
          }
        }
      }
    });
    return out;
  }, [PAGE_W_PT, RIGHT_EDGE_PT + EDGE_TOLERANCE_PT] as const);
}

test.describe('Milestone 73N part 1: no ink past the right margin on any form', () => {
  for (const form of FORMS) {
    test(`${form.type}: ${form.long ? 'a long ward name and the form\'s own long titles stay' : 'a long ward name stays'} inside the margin`, async ({ page }) => {
      test.setTimeout(150_000);
      await freshStartNoPassword(page);
      await form.make(page);
      await page.evaluate((shape) => (window as any).GuardianForms.testing.patchFiling(shape), { wardName: LONG_WARD, ...(form.long || {}) });
      await page.evaluate(() => (window as any).GuardianForms.testing.save.flush());
      await page.evaluate(() => (window as any).GuardianForms.testing.navigate('/print'));
      await page.locator('#print-doc-container .pdf-page canvas').first().waitFor({ state: 'visible', timeout: 60_000 });
      await page.evaluate(() => {
        for (const el of document.querySelectorAll('#print-doc-container .pdf-page')) (el as HTMLElement).style.display = 'block';
      });
      const pages = await page.locator('#print-doc-container .pdf-page').count();
      await expect.poll(() => page.locator('#print-doc-container .pdf-page canvas').count(), { timeout: 60_000 }).toBe(pages);
      await expect(page.locator('#print-doc-container')).toContainText('Konstantinopoulou');
      expect(await inkPastRightEdge(page), 'ink past the right margin').toEqual([]);
    });
  }
});
