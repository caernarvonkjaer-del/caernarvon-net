import { test, expect, type Page } from '@playwright/test';
import { freshStartNoPassword, createWard, fillMinimalValidAnnualWard } from './support/target';
import { extractPdfTextRuns, type PdfTextRun } from './support/pdf-extract';

// Milestone 76H item 1, read from the generated PDF. A row taller than a whole
// page -- a Plan for Minors Question 5 answer of about 300 words, a 300-word
// Schedule B-4 payee, a long explanation -- moved to a new page and was drawn
// whole there, running on past the footer and off the paper; the lost lines
// were missing from the PDF's text too. Now it continues onto the next page.
//
// Each text is numbered words ("a001 a002 ..."), so every one can be looked
// for. A word is on the paper when it is above the footer's rule: y > 96 in
// the PDF's own coordinates (the rule is drawn 96pt from the bottom of the
// 792pt page; the footer's own text sits below it).
const FOOTER_RULE_Y = 96;
const words = (prefix: string, n: number) => Array.from({ length: n }, (_, i) => `${prefix}${String(i + 1).padStart(3, '0')}`);

function placed(runs: PdfTextRun[], tokens: string[]) {
  const where = new Map<string, number[]>();
  for (const run of runs) {
    for (const token of run.text.split(/\s+/)) {
      if (!where.has(token)) where.set(token, []);
      where.get(token)!.push(run.y);
    }
  }
  return {
    missing: tokens.filter((t) => !where.has(t)),
    belowFooter: tokens.filter((t) => (where.get(t) || []).some((y) => y <= FOOTER_RULE_Y)),
    pages: new Set(runs.filter((r) => tokens.some((t) => r.text.includes(t))).map((r) => r.page)).size,
  };
}

async function pdfRuns(page: Page, kind: 'annual' | 'planMinor', extra: Record<string, unknown>) {
  const pdf = await page.evaluate(async ({ k, data }) => {
    const t = (window as any).GuardianForms.testing;
    if (k === 'planMinor') {
      const { buildPlanMinorModel, generateCourtFormPdf } = await t.generateOutput.planMinorPdf();
      return (await generateCourtFormPdf(buildPlanMinorModel({
        inventoryType: 'planMinor', wardName: 'Minor Doe', county: 'Pinellas', periodFrom: '2026-01-01', periodTo: '2026-12-31', ...data,
      }))).output();
    }
    const { buildAnnualAccountingModel, generateCourtFormPdf } = await t.generateOutput.annualPdf();
    return (await generateCourtFormPdf(buildAnnualAccountingModel({ ...t.snapshot().filing, ...data }, { signatureStyle: 'typed', printDate: '2026-10-20' }))).output();
  }, { k: kind, data: extra });
  return extractPdfTextRuns(pdf);
}

test('a Plan for Minors Question 5 answer taller than a page continues onto the next, every word on the paper', async ({ page }) => {
  test.setTimeout(150_000);
  await freshStartNoPassword(page);
  const a = words('a', 430);
  const d = words('d', 60);
  const runs = await pdfRuns(page, 'planMinor', { q5SchoolProgress: a.join(' '), q5Interpersonal: d.join(' ') });
  const result = placed(runs, [...a, ...d]);
  expect(result.missing).toEqual([]);
  expect(result.belowFooter).toEqual([]);
  expect(result.pages).toBeGreaterThan(1);
});

test('a Schedule B-4 payee and an explanation taller than a page continue, every word on the paper', async ({ page }) => {
  test.setTimeout(150_000);
  await freshStartNoPassword(page);
  await createWard(page, 'Long Text Ward', 'annual');
  await fillMinimalValidAnnualWard(page);
  const p = words('p', 300);
  const e = words('e', 800);
  const runs = await pdfRuns(page, 'annual', {
    schB4: [{ checkNo: '101', datePaid: '2026-03-01', category: 'Other', payee: p.join(' '), amount: 25 }],
    reconcileExplanation: e.join(' '),
  });
  for (const [name, tokens] of [['payee', p], ['explanation', e]] as const) {
    const result = placed(runs, tokens);
    expect(result.missing, `${name}: every word printed`).toEqual([]);
    expect(result.belowFooter, `${name}: none at or below the footer`).toEqual([]);
    expect(result.pages, `${name}: continued onto another page`).toBeGreaterThan(1);
  }
});
