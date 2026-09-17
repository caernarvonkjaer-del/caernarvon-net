import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs';
import {
  freshStartNoPassword, createWard, createSimplifiedWard,
  fillMinimalValidGuardianWard, fillMinimalValidSimplifiedWard, fillMinimalValidAnnualWard,
  fillMinimalValidPlanAnnualWard, fillMinimalValidPlanInitialWard,
  fillMinimalValidPlanMinorWard, fillMinimalValidPlanSimplifiedWard,
} from './support/target';
import { extractPdfText } from './support/pdf-extract';

// Milestone 38B / 44C: every one of the nine filing types renders exactly one
// shared readiness card on Preview & Export, with the county-policy title,
// the collapsed-by-default / manual-review summary when automatic checks
// pass, a retained hand toggle across a same-route rerender that resets on
// fresh Preview entry, canonical jump-link routing for issue rows, and no
// trace of the card in court output. Milestone 54's explicitly authorized side
// edit also pins the Preview & Export banner's filing-level shell controls for
// every filing type, including previews too short to need the page navigator.

type FilingKey = 'guardian' | 'simplified' | 'annual' | 'finalAccounting' | 'trustAccounting'
  | 'planSimplified' | 'planAnnual' | 'planInitial' | 'planMinor';

type Config = {
  key: FilingKey;
  createFiling: (page: Page, name: string) => Promise<void>;
  saveButtonSelector: string;
};

async function annualFamily(page: Page, name: string, key: FilingKey) {
  await createWard(page, name, key);
  await fillMinimalValidAnnualWard(page);
  if (key !== 'annual') {
    await page.evaluate((v) => { (window as any).D.filingType = v; }, key === 'finalAccounting' ? 'Final' : 'Trust');
  }
}

const CONFIGS: Config[] = [
  { key: 'guardian', createFiling: async (p, n) => { await createWard(p, n, 'guardian'); await fillMinimalValidGuardianWard(p); }, saveButtonSelector: '[data-inventory-action="save-pdf"]' },
  { key: 'simplified', createFiling: async (p, n) => { await createSimplifiedWard(p, n); await fillMinimalValidSimplifiedWard(p); }, saveButtonSelector: '[data-simplified-action="save-pdf"]' },
  { key: 'annual', createFiling: (p, n) => annualFamily(p, n, 'annual'), saveButtonSelector: '[data-annual-action="save-pdf"]' },
  { key: 'finalAccounting', createFiling: (p, n) => annualFamily(p, n, 'finalAccounting'), saveButtonSelector: '[data-annual-action="save-pdf"]' },
  { key: 'trustAccounting', createFiling: (p, n) => annualFamily(p, n, 'trustAccounting'), saveButtonSelector: '[data-annual-action="save-pdf"]' },
  { key: 'planSimplified', createFiling: async (p, n) => { await createWard(p, n, 'planSimplified'); await fillMinimalValidPlanSimplifiedWard(p); }, saveButtonSelector: '[data-plan-simplified-action="save-pdf"]' },
  { key: 'planAnnual', createFiling: async (p, n) => { await createWard(p, n, 'planAnnual'); await fillMinimalValidPlanAnnualWard(p); }, saveButtonSelector: '[data-form-action="save-pdf-plan-annual"]' },
  { key: 'planInitial', createFiling: async (p, n) => { await createWard(p, n, 'planInitial'); await fillMinimalValidPlanInitialWard(p); }, saveButtonSelector: '[data-form-action="save-pdf-plan-initial"]' },
  { key: 'planMinor', createFiling: async (p, n) => { await createWard(p, n, 'planMinor'); await fillMinimalValidPlanMinorWard(p); }, saveButtonSelector: '[data-form-action="save-pdf-plan-minor"]' },
];

const card = (page: Page) => page.locator('#filing-readiness-card');
const isOpen = (page: Page) => card(page).evaluate((el: HTMLDetailsElement) => el.open);
const pendingIds = (page: Page) => card(page).locator('.readiness-row:has(.readiness-mark.pending)').evaluateAll((els) => els.map((el) => (el as HTMLElement).dataset.readinessId));
const setCounty = (page: Page, county: string) => page.evaluate((c) => { (window as any).D.county = c; }, county);
const rerenderPreview = (page: Page) => page.evaluate(() => (window as any).renderPage('/print'));
const goPreview = (page: Page) => page.evaluate(() => (window as any).navigate('/print'));

for (const { key, createFiling } of CONFIGS) {
  test.describe(`${key}: shared readiness card contract`, () => {
    test('exactly one card; Clerk title with local context only for Pinellas/Pasco, Filing title elsewhere; collapsed with the manual-review sentence when automatic checks pass', async ({ page }) => {
      await freshStartNoPassword(page);
      await createFiling(page, `${key} Readiness Card Ward`);
      await setCounty(page, 'Pinellas');
      await goPreview(page);

      await expect(card(page)).toHaveCount(1);
      await expect(page.locator('.readiness-panel')).toHaveCount(1);
      const previewShellActions = page.locator('.print-preview-banner [data-preview-shell-actions] .pv-shell-actions');
      await expect(previewShellActions).toHaveCount(1);
      await expect(previewShellActions).toContainText('All Filings');
      await expect(previewShellActions.locator('[data-shell-action="toggle-theme"]')).toBeVisible();
      await expect(previewShellActions.locator('[data-shell-action="toggle-help"]')).toBeVisible();
      await expect(card(page)).toHaveAttribute('data-readiness-filing', key);
      const tags = await card(page).evaluate((el) => ({ self: el.tagName, first: el.firstElementChild?.tagName }));
      expect(tags).toEqual({ self: 'DETAILS', first: 'SUMMARY' });

      await expect(card(page).locator('.validation-title')).toContainText("Clerk's Review Readiness");
      await expect(card(page).locator('.validation-title')).toContainText('Automated checks passed; manual review remains.');
      expect(await card(page).evaluate((el: HTMLDetailsElement) => el.open)).toBe(false);
      await expect(card(page).locator('.readiness-mark.pending')).toHaveCount(0);
      // Manual rows are never shown as automatic passes.
      const manualGroup = card(page).locator('.validation-group', { hasText: "can't verify" });
      await expect(manualGroup).toHaveCount(1);
      await expect(manualGroup.locator('.readiness-mark.ok, .readiness-mark.pending')).toHaveCount(0);
      await expect(manualGroup.locator('.readiness-mark.manual').first()).toBeAttached();

      await setCounty(page, 'Orange');
      await rerenderPreview(page);
      await expect(card(page)).toHaveCount(1);
      await expect(card(page).locator('.validation-title')).toContainText('Filing Readiness');
      await expect(card(page)).not.toContainText(/Pinellas|Pasco|Sixth (Judicial )?Circuit/);
    });

    test('a hand toggle survives a same-route rerender and resets on fresh Preview entry', async ({ page }) => {
      await freshStartNoPassword(page);
      await createFiling(page, `${key} Readiness Toggle Ward`);
      await setCounty(page, 'Orange');
      await goPreview(page);
      expect(await isOpen(page)).toBe(false);

      // Native disclosure semantics: keyboard-operable via the summary. The
      // `toggle` event is dispatched on a later task; wait for it before
      // rerendering so the test doesn't race its own event queue (a real
      // rerender never follows a click within the same task).
      await card(page).evaluate((el) => {
        (window as any).__readinessToggled = false;
        el.addEventListener('toggle', () => { (window as any).__readinessToggled = true; }, { once: true });
      });
      await card(page).locator('summary').focus();
      await page.keyboard.press('Enter');
      await expect.poll(() => isOpen(page)).toBe(true);
      await page.waitForFunction(() => (window as any).__readinessToggled === true);

      await rerenderPreview(page);
      await expect(card(page)).toHaveCount(1);
      await expect.poll(() => isOpen(page)).toBe(true);

      await page.evaluate(() => (window as any).navigate('/'));
      await goPreview(page);
      await expect(card(page)).toHaveCount(1);
      expect(await isOpen(page)).toBe(false);
    });
  });
}

test.describe('automatic failures and routing', () => {
  test('Guardian Inventory: a blocking validator issue opens the card, is listed once, and its jump link focuses the real field', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Readiness Routing Ward', 'guardian');
    await fillMinimalValidGuardianWard(page);
    await page.evaluate(() => { (window as any).D.wardName = ''; });
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
  // link" behaviour -- it was red on master before the Milestone 57 revert and
  // is fixed here rather than carried forward. readiness-card.js's jumpLink()
  // still suppresses the link for a row that already passed (row.ok === true).
  test('Plan Annual: a failed predicate opens the card, shows as pending, and offers a jump link', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Readiness Predicate Ward', 'planAnnual');
    await fillMinimalValidPlanAnnualWard(page);
    await page.evaluate(() => { (window as any).D.planGuardians[0].mailingStreet = ''; });
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
