import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import {
  freshStartNoPassword, createWard, createSimplifiedWard,
  fillMinimalValidAnnualWard, fillMinimalValidSimplifiedWard,
  fillMinimalValidPlanInitialWard, fillMinimalValidPlanAnnualWard, fillMinimalValidPlanMinorWard,
} from './support/target';
import { readAll } from './support/stream';
import { extractPdfTextRuns, type PdfTextRun } from './support/pdf-extract';

// Milestone 68D. Every Annual, Final and Trust Accounting cover page printed
// its period as "From: 01/01/2026   To: 12/31/202" -- the last digit of the
// year gone. The key-value grid wrapped column-1 values at a hardcoded 148pt
// when only 119pt exist before column 2, and column 2's opaque background is
// drawn after column 1's text, so anything in that 29pt window was painted
// over: the period on every accounting, and long ward and attorney names the
// same way. The Simplified Accounting's period sits in column 2 and ran
// 2.31pt past the table border into the margin (nothing behind it, so
// legible -- but the same cause).
//
// A text-extraction assertion passes with the defect live: the covered
// characters are all in the text layer. So this reads each drawn run's
// position and width from the generated file and checks its right edge
// against the boundary the engine lays out -- for a column-1 value, where
// column 2's background begins; for a column-2 or full-width value, the
// table's right border. Both come from the engine's own geometry
// (src/core/pdf/pdf-engine.js: 1in margins on a 612pt page, 468pt of content,
// two 234pt columns, value text 115pt into its column), not from the wrap
// constant, because the constant was the thing that was wrong.

const MARGIN = 72;
const CONTENT_W = 468;
const VALUE_X = 115;
const COL1_VALUE_X = MARGIN + VALUE_X;      // 187
const COL2_X = MARGIN + CONTENT_W / 2;      // 306: column 2's background begins here
const COL2_VALUE_X = COL2_X + VALUE_X;      // 421
const BORDER_RIGHT = MARGIN + CONTENT_W;    // 540: the table's right border
const COL1_LABEL_X = MARGIN + 4;            // 76: where column 1's labels are drawn
const COL2_LABEL_X = COL2_X + 4;            // 310: where column 2's labels are drawn
const EPS = 0.5;
// A value wrapped to four 8pt lines (jsPDF's 1.15 line height) still ends
// within 28pt below its row's baseline; 44 leaves room without reaching the
// next row's values, which are grid values too and judged the same way.
const ROW_SPAN = 44;

const LONG_WARD = 'Bartholomew Fitzgerald-Cunningham Montgomery-Whitfield III';
const LONG_ATTORNEY = 'Bartholomew Fitzgerald-Cunningham, Esq.';
const PERIOD = { periodFrom: '2026-01-01', periodTo: '2026-12-31' };

async function download(page: Page, selector: string) {
  await page.evaluate(() => (window as any).GuardianForms.testing.save.flush());
  await page.evaluate(() => (window as any).GuardianForms.testing.navigate('/print'));
  const button = page.locator(selector);
  await expect(button).toBeEnabled({ timeout: 20_000 });
  const dl = page.waitForEvent('download', { timeout: 40_000 });
  await button.click();
  return readAll(await (await dl).createReadStream());
}

type ValueRun = PdfTextRun & { limit: number };

/**
 * The page-1 runs drawn as key-value values, each with the right edge it must
 * stay inside. A value run starts at or right of column 1's value x and sits
 * on, or up to ROW_SPAN below, a row whose column-1 label shares that
 * baseline. A row with a column-2 label is paired, so its column-1 value is
 * bounded by column 2's background; a row without one spans the table, and
 * its value is bounded by the border, as every column-2 value is.
 */
function gridValueRuns(runs: PdfTextRun[]): ValueRun[] {
  const page1 = runs.filter((r) => r.page === 1);
  const at = (x: number) => (r: PdfTextRun) => Math.abs(r.x - x) < EPS;
  const rowBaselines = page1.filter(at(COL1_LABEL_X)).map((r) => r.y);
  const pairedBaselines = new Set(page1.filter(at(COL2_LABEL_X)).map((r) => r.y));
  const out: ValueRun[] = [];
  for (const r of page1) {
    // Column 2's labels start right of column 1's values; they are not values.
    if (r.x < COL1_VALUE_X - EPS || at(COL2_LABEL_X)(r) || r.text.trim() === '') continue;
    const baseline = rowBaselines.find((ly) => r.y <= ly + EPS && r.y >= ly - ROW_SPAN);
    if (baseline === undefined) continue;
    const paired = [...pairedBaselines].some((py) => Math.abs(py - baseline) < EPS);
    const limit = r.x >= COL2_VALUE_X - EPS || !paired ? BORDER_RIGHT : COL2_X;
    out.push({ ...r, limit });
  }
  return out;
}

// Soft, so one run reports every overrun rather than the first.
function expectInside(runs: ValueRun[], label: string) {
  for (const r of runs) {
    expect.soft(r.x + r.width, `${label}: "${r.text}" starts at x ${r.x.toFixed(1)} and must end by ${r.limit}`).toBeLessThanOrEqual(r.limit + EPS);
  }
}

// Set PG_PDF_OUT to a directory to keep each generated PDF for rasterising --
// the completion gate for 68D is a rendered page, not a text layer.
const pdfOut = process.env.PG_PDF_OUT;

// wardInGrid: the accountings print the ward's name as a grid value; the
// Plans print it in the page header and their grids start at the case number.
for (const form of [
  { label: 'Annual Accounting', type: 'annual', fill: fillMinimalValidAnnualWard, pdfButton: '[data-annual-action="save-pdf"]', attorneyPath: 'attorney', wardInGrid: true },
  { label: 'Simplified Accounting', type: 'simplified', fill: fillMinimalValidSimplifiedWard, pdfButton: '[data-simplified-action="save-pdf"]', attorneyPath: 'attorney', wardInGrid: true },
  { label: 'Initial Plan', type: 'planInitial', fill: fillMinimalValidPlanInitialWard, pdfButton: '[data-form-action="save-pdf-plan-initial"]', attorneyPath: 'attorneyName', wardInGrid: false },
  { label: 'Annual Plan', type: 'planAnnual', fill: fillMinimalValidPlanAnnualWard, pdfButton: '[data-form-action="save-pdf-plan-annual"]', attorneyPath: '', wardInGrid: false },
  { label: 'Minor Plan', type: 'planMinor', fill: fillMinimalValidPlanMinorWard, pdfButton: '[data-form-action="save-pdf-plan-minor"]', attorneyPath: '', wardInGrid: false },
]) {
  test(`${form.label}: the cover page's period, names and every other grid value stay inside their columns`, async ({ page }) => {
    test.setTimeout(120_000);
    await freshStartNoPassword(page);
    if (form.type === 'simplified') await createSimplifiedWard(page, `${form.label} Geometry`);
    else await createWard(page, `${form.label} Geometry`, form.type);
    await form.fill(page);
    const patch: Record<string, string> = { wardName: LONG_WARD, ...PERIOD };
    if (form.attorneyPath) patch[form.attorneyPath] = LONG_ATTORNEY;
    await page.evaluate((p) => { (window as any).GuardianForms.testing.patchFiling(p); }, patch);

    const bytes = await download(page, form.pdfButton);
    if (pdfOut) fs.writeFileSync(path.join(pdfOut, `${form.type}.pdf`), bytes);

    const values = gridValueRuns(await extractPdfTextRuns(bytes));
    const texts = JSON.stringify(values.map((r) => r.text));
    const period = values.filter((r) => /12\/31\/2026$/.test(r.text.trim()));
    expect(period.length, `${form.label}: the period's end date is drawn as a grid value; values seen: ${texts}`).toBeGreaterThan(0);
    // The reported case first, by name, then the two long names, then the
    // whole class -- every value the grid drew on the page.
    expectInside(period, `${form.label} period`);
    if (form.wardInGrid) {
      const ward = values.filter((r) => r.text.trim().length >= 8 && LONG_WARD.includes(r.text.trim()));
      expect(ward.length, `${form.label}: the ward name is drawn as a grid value; values seen: ${texts}`).toBeGreaterThan(0);
      expectInside(ward, `${form.label} ward name`);
    }
    if (form.attorneyPath) {
      const attorney = values.filter((r) => r.text.trim().length >= 8 && LONG_ATTORNEY.includes(r.text.trim()));
      expect(attorney.length, `${form.label}: the attorney name is drawn as a grid value; values seen: ${texts}`).toBeGreaterThan(0);
      expectInside(attorney, `${form.label} attorney`);
    }
    expectInside(values, `${form.label} grid value`);
  });
}
