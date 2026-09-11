import { test, expect, type Page } from '@playwright/test';
import {
  freshStartNoPassword, createWard,
  fillMinimalValidPlanAnnualWard, fillMinimalValidPlanInitialWard,
  fillMinimalValidPlanMinorWard, fillMinimalValidPlanSimplifiedWard,
} from './support/target';

// Milestone 34-1A, Item 1: readiness status must reflect export eligibility.
// Before this, several `auto` readiness-panel checks (guardian contact
// fields, provider-list "at least one row", Plan Minor's preparer signature
// date) were never enforced by the corresponding validatePlanX(), so a plan
// could show a pending readiness item while the print page's own banner
// said "Ready to export" for the exact same missing field -- or the
// reverse, agree by accident. These tests prove the readiness panel and the
// real export gate now always agree, for every one of the four Plan types.

type ReadinessConfig = {
  featureName: string;
  filingType: 'planAnnual' | 'planInitial' | 'planMinor' | 'planSimplified';
  fill: (page: Page) => Promise<void>;
  // Mutates window.D to blank exactly one of the newly-promoted fields.
  blankPromotedField: (page: Page) => Promise<void>;
  // Substring of the readiness-panel row label this blanked field belongs to.
  readinessRowLabel: string;
  // CSS selector for this type's Save-as-PDF button -- Plan Simplified uses
  // its own data-plan-simplified-action attribute, not data-form-action
  // like the other three types (see navigation-status.contract.spec.ts's
  // triggerBlockedExport configs for the same distinction).
  saveButtonSelector: string;
};

const CONFIGS: ReadinessConfig[] = [
  {
    featureName: 'Plan Annual',
    filingType: 'planAnnual',
    fill: fillMinimalValidPlanAnnualWard,
    blankPromotedField: (page) => page.evaluate(() => {
      (window as any).D.planGuardians[0].mailingStreet = '';
    }),
    readinessRowLabel: 'Guardian address, phone and SSN/EIN provided',
    saveButtonSelector: '[data-form-action="save-pdf-plan-annual"]',
  },
  {
    featureName: 'Plan Initial',
    filingType: 'planInitial',
    fill: fillMinimalValidPlanInitialWard,
    blankPromotedField: (page) => page.evaluate(() => {
      (window as any).D.planGuardians[0].street = '';
    }),
    readinessRowLabel: 'Guardian address, phone and SSN/EIN provided',
    saveButtonSelector: '[data-form-action="save-pdf-plan-initial"]',
  },
  {
    featureName: 'Plan Minor',
    filingType: 'planMinor',
    fill: fillMinimalValidPlanMinorWard,
    blankPromotedField: (page) => page.evaluate(() => {
      (window as any).D.planGuardians[0].mailingStreet = '';
    }),
    readinessRowLabel: 'Guardian address, phone and taxpayer ID provided',
    saveButtonSelector: '[data-form-action="save-pdf-plan-minor"]',
  },
  {
    featureName: 'Plan Simplified',
    filingType: 'planSimplified',
    fill: fillMinimalValidPlanSimplifiedWard,
    blankPromotedField: (page) => page.evaluate(() => {
      (window as any).D.planGuardians[0].phone = '';
    }),
    readinessRowLabel: 'Guardian contact details provided (email, phone, mailing address)',
    saveButtonSelector: '[data-plan-simplified-action="save-pdf"]',
  },
];

for (const { featureName, filingType, fill, blankPromotedField, readinessRowLabel, saveButtonSelector } of CONFIGS) {
  test.describe(`${featureName} readiness/export-gating contract`, () => {
    test('a fully completed plan preserves manual-review wording and is not blocked from export', async ({ page }) => {
      await freshStartNoPassword(page);
      await createWard(page, `${featureName} Readiness Ready Ward`, filingType);
      await fill(page);
      await page.evaluate(() => (window as any).navigate('/print'));

      await expect(page.locator('.print-preview-banner')).toContainText('Ready to export');
      await expect(page.locator('.readiness-panel .validation-title')).toContainText('Automated checks passed; manual review remains');
      await expect(page.locator('.readiness-panel .readiness-mark.pending')).toHaveCount(0);
      await expect(page.locator(saveButtonSelector)).toBeEnabled();
    });

    test('blanking a newly-promoted field blocks export AND the readiness panel agrees', async ({ page }) => {
      await freshStartNoPassword(page);
      await createWard(page, `${featureName} Readiness Drift Ward`, filingType);
      await fill(page);
      await blankPromotedField(page);
      await page.evaluate(() => (window as any).navigate('/print'));

      // The banner is the real export gate (validatePlanX() + supplemental
      // issues) -- it must report at least one issue now.
      const bannerText = await page.locator('.print-preview-banner').innerText();
      expect(bannerText).toMatch(/\d+\s+issue/);
      await expect(page.locator(saveButtonSelector)).toBeDisabled();

      // The readiness panel's own independently-computed check for this
      // same field must show it pending, not silently agree with "ready"
      // by omission -- this is the actual drift Item 1 closes.
      await expect(page.locator('.readiness-panel .validation-title')).toContainText('outstanding');
      const row = page.locator('.readiness-panel .readiness-row', { hasText: readinessRowLabel });
      await expect(row).toBeVisible();
      await expect(row.locator('.readiness-mark')).toHaveClass(/pending/);
    });
  });
}

test.describe('Plan Annual physician-statement reminder (DECISION: manual, not blocking)', () => {
  test('certPhysicianAttached unchecked appears as a manual reminder, never as a pending auto check, and does not block export alone', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Plan Annual Physician Reminder Ward', 'planAnnual');
    await fillMinimalValidPlanAnnualWard(page);
    await page.evaluate(() => {
      (window as any).D.certPhysicianAttached = false;
    });
    await page.evaluate(() => (window as any).navigate('/print'));

    // Every other required field is present (the fixture's own baseline) --
    // certPhysicianAttached alone must not block export or show as an
    // outstanding auto check, since it depends on an external,
    // unverifiable-by-software fact.
    await expect(page.locator('.print-preview-banner')).toContainText('Ready to export');
    await expect(page.locator('.readiness-panel .validation-title')).toContainText('Automated checks passed; manual review remains');
    await expect(page.locator('[data-form-action="save-pdf-plan-annual"]')).toBeEnabled();

    const manualList = page.locator('.readiness-panel .validation-group', { hasText: "can't verify" });
    await expect(manualList).toContainText("physician's statement");
  });
});
