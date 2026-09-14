import { test, expect } from '@playwright/test';
import { freshStartNoPassword, createWard, fillMinimalValidPlanSimplifiedWard, extractFormContentSnapshot } from './support/target';
import { registerPlanMountTests } from './support/plan-fixture';

// Plan Simplified is the second feature extraction (Milestone 3 of
// INDEX-SPLIT-PLAN.md) -- mirrors simplified-mount.spec.ts's shape, since
// this is the module whose mount()/dispose()/dynamic-import wiring proves
// the generalized src/core/feature-bridge.js factory (Milestone 3, Phase A)
// against a second real feature. No Excel round-trip spec: this filing type
// has no Excel support at all (see the Milestone 3 plan's "Confirmed facts").

registerPlanMountTests({
  featureName: 'Plan Simplified',
  filingType: 'planSimplified',
  routes: ['/', '/summary', '/p2', '/p3', '/print'],
  fillValidWard: fillMinimalValidPlanSimplifiedWard,
  triggerExport: (page) => page.locator('[data-plan-simplified-action="save-pdf"]').click(),
  // Unlike the other three plan types, Plan Simplified's export button is
  // driven by disabled/enabled state rather than an alert-only guard -- an
  // incomplete filing leaves the button disabled, so exercising the blocked
  // path has to force it enabled before clicking, not just trigger the click.
  triggerBlockedExport: (page) => page.locator('[data-plan-simplified-action="save-pdf"]').evaluate((button: HTMLButtonElement) => {
    button.disabled = false;
    button.click();
  }),
  navChecks: [
    { route: '/', key: 'ps-cover' },
    { route: '/p2', key: 'ps-p2' },
    { route: '/p3', key: 'ps-p3' },
  ],
});

// Milestone 41-2: "0 visual diff" proof for the Tier 2 card pilot on the
// Cover page. Verified once by hand at implementation time -- git-stashing
// just the card-wiring change in plan-simplified/index.js and comparing
// extractFormContentSnapshot() output before/after found zero difference --
// this pins that verified-identical snapshot as a permanent regression
// guard against a future change to these cards silently altering what a
// filer sees or the values a filled-in field round-trips as.
test('Cover page renders byte-identical visible text and control values through the Tier 2 card pilot', async ({ page }) => {
  await freshStartNoPassword(page);
  await createWard(page, 'Text Diff Ward', 'planSimplified');
  await fillMinimalValidPlanSimplifiedWard(page);
  await page.evaluate(() => (window as any).navigate('/'));
  const snapshot = await extractFormContentSnapshot(page);
  expect(snapshot).toBe("Simplified Annual Plan — Cover\nAll Filings\n?\nThis plan reports on the ward as a person: where they have lived, the care they received, and how they are doing. It is a separate filing from any accounting, which reports on their money and property.\nWARD & CASE INFORMATION\nName of Ward\n*\nCase Number\n*\nCounty\n*\nREPORTING PERIOD\nReporting Period From\n*\nUse MM/DD/YYYY\nReporting Period To\n*\nUse MM/DD/YYYY\nSupporting Documents — accounting period 01/01/2026 to 12/31/2026\n\nUpload PDF supplemental documents only. Supplemental PDFs are inserted as uploaded; Probate Guardian does not certify or remediate uploaded documents for accessibility. Stored on this device only, encrypted with the rest of this ward's data.\n\n+ Upload PDF(s)\nNo supporting documents uploaded for this period.\nComments\nNext →\n---CONTROL VALUES---\n[input:Text Diff Ward]\n[input:26-000789]\n[input:Pinellas]\n[input:01/01/2026]\n[input:12/31/2026]\n[input:]\n[textarea:]");
});
