import { test, expect, type Page } from '@playwright/test';
import {
  freshStartNoPassword, createWard,
  fillMinimalValidPlanAnnualWard, fillMinimalValidPlanSimplifiedWard, fillMinimalValidPlanMinorWard, fillMinimalValidPlanInitialWard,
  fillMinimalValidAnnualWard,
} from './support/target';

// Milestone 68A. A guardian filing an Annual Guardianship Plan for the coming
// year -- say 01/01/2027 to 12/31/2027 -- and signing it today could not
// export: "Signatures -- Guardian date signed must be on or after Reporting
// Period To", Save as PDF disabled, no override. The only remedy was a
// signature dated after the end of a period that had not happened, on a
// filing sworn under penalty of perjury. The Simplified Plan raised it three
// times (guardian, preparer, attorney); the Minor Plan, found by the build's
// audit, three times too. The rule was carried over from the accountings,
// where it is correct: an accounting reports on a period that has ended.
//
// Decided 2026-09-23: remove the rule from the Plans, keep it on the
// accountings. Every signer on every Plan signs before the period even
// starts here -- the reported case -- and the filing exports through the
// real Save as PDF button; the sidebar's signature key stays complete. The
// Initial Plan never had the rule (audited, not assumed): its case is the
// runtime confirmation the decision asked for, and the guard that it stays
// that way. The last case shows the accountings keep theirs.

const PERIOD = { periodFrom: '2026-01-01', periodTo: '2026-12-31' };
const SIGNED_BEFORE_THE_PERIOD = '2025-12-15';
const ORDER_RULE = /must be on or after (Reporting|Accounting) Period To/;

const messages = (page: Page, validator: string) =>
  page.evaluate((v) => ((window as any)[v]() || []).map((i: any) => String(i?.message ?? i)), validator);

async function signBeforeThePeriod(page: Page, type: string) {
  await page.evaluate(([t, date, period]) => {
    const w = window as any;
    const d = w.D;
    Object.assign(d, period);
    d.planGuardians[0].signatureDate = date;
    // Every other signer the form has, started so its checks apply.
    if (t === 'planAnnual') { d.attorney = 'Jordan Reyes, Esq.'; d.attorney_email = 'attorney@example.com'; d.attorney_signatureDate = date; }
    if (t === 'planSimplified') { d.preparer_name = 'Sam Okafor'; d.preparer_signatureDate = date; d.attorney = 'Jordan Reyes, Esq.'; d.attorney_signatureDate = date; }
    if (t === 'planMinor') { d.preparer_signatureDate = date; d.attorney_signatureDate = date; }
    if (t === 'planInitial') { d.attorney_signatureDate = date; }
    w.autoSave();
  }, [type, SIGNED_BEFORE_THE_PERIOD, PERIOD] as [string, string, typeof PERIOD]);
  await page.evaluate(() => (window as any).flushPendingSave());
}

for (const form of [
  { label: 'Annual Plan', type: 'planAnnual', fill: fillMinimalValidPlanAnnualWard, validator: 'validatePlanAnnual', keys: ['pa-p11'], pdfButton: '[data-form-action="save-pdf-plan-annual"]' },
  { label: 'Simplified Plan', type: 'planSimplified', fill: fillMinimalValidPlanSimplifiedWard, validator: 'validatePlanSimplified', keys: ['ps-p3'], pdfButton: '[data-plan-simplified-action="save-pdf"]' },
  { label: 'Minor Plan', type: 'planMinor', fill: fillMinimalValidPlanMinorWard, validator: 'validatePlanMinor', keys: ['pm-p6', 'pm-p7'], pdfButton: '[data-form-action="save-pdf-plan-minor"]' },
  { label: 'Initial Plan', type: 'planInitial', fill: fillMinimalValidPlanInitialWard, validator: 'validatePlanInitial', keys: ['pi-p9', 'pi-p10'], pdfButton: '[data-form-action="save-pdf-plan-initial"]' },
]) {
  test(`${form.label}: signed before the period it plans for, by every signer, and it files`, async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, `${form.label} Signed Early`, form.type);
    await form.fill(page);
    await signBeforeThePeriod(page, form.type);

    const issues = await messages(page, form.validator);
    expect(issues.filter((m) => ORDER_RULE.test(m)), `${form.label}: no signature is ordered against the period`).toEqual([]);
    const checks = await page.evaluate(() => (window as any).computeNavChecks().checks);
    for (const key of form.keys) expect(checks[key], `${form.label}: sidebar ${key} stays complete`).toBe(true);

    await page.evaluate(() => (window as any).navigate('/print'));
    await expect(page.locator(form.pdfButton), `${form.label}: Save as PDF is enabled`).toBeEnabled({ timeout: 20_000 });
  });
}

test('Annual Accounting keeps the rule: a guardian signature dated before the accounting period ends still blocks', async ({ page }) => {
  await freshStartNoPassword(page);
  await createWard(page, 'Accounting Signed Early', 'annual');
  await fillMinimalValidAnnualWard(page);
  await page.evaluate((date) => { const w = window as any; w.D.guardians[0].signatureDate = date; w.autoSave(); }, '2026-06-01');
  await page.evaluate(() => (window as any).flushPendingSave());
  const issues = await messages(page, 'validateAnnual');
  expect(issues.filter((m) => ORDER_RULE.test(m)), 'the accounting orders the signature against its period').not.toEqual([]);
  expect(await page.evaluate(() => (window as any).computeNavChecks().checks['a-p3']), 'and its sidebar agrees').toBe(false);
});
