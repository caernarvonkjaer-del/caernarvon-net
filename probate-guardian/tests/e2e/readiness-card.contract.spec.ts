import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs';
import { freshStartNoPassword, createWard, fillMinimalValidGuardianWard, fillMinimalValidPlanAnnualWard } from './support/target';
import { extractPdfText } from './support/pdf-extract';

// Milestone 38B / 44C: every one of the nine filing types renders exactly one
// shared readiness card on Preview & Export, with the county-policy title,
// the collapsed-by-default / manual-review summary when automatic checks
// pass, a retained hand toggle across a same-route rerender that resets on
// fresh Preview entry, canonical jump-link routing for issue rows, and no
// trace of the card in court output. Milestone 54's explicitly authorized side
// edit also pins the Preview & Export banner's filing-level shell controls for
// every filing type, including previews too short to need the page navigator.
//
// Since TEST-REVIEW.md Delivery 1M (2026-10-13) the per-type contract (one
// card, its titles, the collapsed summary, the shell controls, the hand
// toggle) runs in pdf-preview-viewer.spec.ts's one Preview per print.js host,
// with the viewer and the annotate toolbar; this file keeps the card's
// routing and its exclusion from court output.

const card = (page: Page) => page.locator('#filing-readiness-card');
const isOpen = (page: Page) => card(page).evaluate((el: HTMLDetailsElement) => el.open);
const pendingIds = (page: Page) => card(page).locator('.readiness-row:has(.readiness-mark.pending)').evaluateAll((els) => els.map((el) => (el as HTMLElement).dataset.readinessId));
const setCounty = (page: Page, county: string) => page.evaluate((c) => { (window as any).GuardianForms.testing.patchFiling({ 'county': c }); }, county);
const goPreview = (page: Page) => page.evaluate(() => (window as any).GuardianForms.testing.navigate('/print'));

test.describe('automatic failures and routing', () => {
  test('Guardian Inventory: a blocking validator issue opens the card, is listed once, and its jump link focuses the real field', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Readiness Routing Ward', 'guardian');
    await fillMinimalValidGuardianWard(page);
    await page.evaluate(() => { (window as any).GuardianForms.testing.patchFiling({ 'wardName': '' }); });
    await goPreview(page);

    expect(await isOpen(page)).toBe(true);
    await expect(card(page).locator('.validation-title')).toContainText(/\d+ items? outstanding/);
    const row = card(page).locator('.readiness-row[data-readiness-class="automatic"]', { hasText: /Ward/ }).first();
    await expect(row.locator('.readiness-mark')).toHaveClass(/pending/);
    const jump = row.locator('[data-form-action="jump-to-field"]');
    await expect(jump).toHaveCount(1);
    await jump.click();
    // focusFieldByPath() resolves any of the binding conventions; the
    // Guardian cover field may use an id or a data-* path attribute.
    await expect.poll(() => page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null;
      if (!el || !/^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)) return null;
      return [el.id, el.dataset.formPath, el.dataset.fieldPath, el.dataset.bind].filter(Boolean).join('|');
    })).toContain('wardName');
  });

  // Milestone 57 follow-up 6f2ef12 gave every plan-family predicate id a real
  // route/path via PLAN_PREDICATE_ROUTES (readiness-config.js), restoring "Go
  // to field" for Plan filings the same way Guardian/Accounting's predicates()
  // already supplied theirs. efdd45a updated the UNIT test for that and missed
  // this e2e contract, which went on asserting the old "predicate rows carry no
  // link" behavior -- it was red on master before the Milestone 57 revert and
  // is fixed here rather than carried forward. readiness-card.js's jumpLink()
  // still suppresses the link for a row that already passed (row.ok === true).
  test('Plan Annual: a failed predicate opens the card, shows as pending, and offers a jump link', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Readiness Predicate Ward', 'planAnnual');
    await fillMinimalValidPlanAnnualWard(page);
    await page.evaluate(() => { (window as any).GuardianForms.testing.patchFiling({ 'planGuardians.0.mailingStreet': '' }); });
    await goPreview(page);

    expect(await isOpen(page)).toBe(true);
    expect(await pendingIds(page)).toEqual(['signatures.guardian1.contact']);
    await expect(card(page).locator('.validation-title')).toContainText('1 item outstanding');
    const row = card(page).locator('.readiness-row', { hasText: 'Guardian address, phone and SSN/EIN provided' });
    await expect(row.locator('.readiness-mark')).toHaveClass(/pending/);
    await expect(row.locator('[data-form-action="jump-to-field"]')).toHaveCount(1);
    await expect(card(page).locator('[data-readiness-id="signatures.guardian1.contact"]')).toHaveCount(1);
  });
});

test.describe('court output exclusion', () => {
  test('the readiness card never reaches the generated PDF', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Readiness Output Ward', 'planAnnual');
    await fillMinimalValidPlanAnnualWard(page);
    await setCounty(page, 'Pinellas');
    await goPreview(page);
    await expect(card(page).locator('.validation-title')).toContainText("Clerk's Review Readiness");

    const download = page.waitForEvent('download', { timeout: 20_000 });
    await page.locator('[data-form-action="save-pdf-plan-annual"]').click();
    const path = await (await download).path();
    const text = await extractPdfText(new Uint8Array(fs.readFileSync(path!)));
    expect(text).not.toMatch(/Clerk's Review Readiness|Filing Readiness|Before you file|Checked from this filing|manual review remains/i);
  });
});
