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

// Milestone 41-2: same "0 visual diff" proof technique as the Cover page
// test above, for the Signatures page's Guardian-block card (name +
// contact fields; the signature-date field and signature-state control
// widget are unchanged page composition, not part of the card). Verified
// once by hand -- git-stashing just this page's card-wiring change and
// diffing extractFormContentSnapshot() output before/after found zero
// difference -- pinned here as a permanent regression guard.
test('Signatures page renders byte-identical visible text and control values through the Guardian identity card', async ({ page }) => {
  await freshStartNoPassword(page);
  await createWard(page, 'Sig Diff Ward', 'planSimplified');
  await fillMinimalValidPlanSimplifiedWard(page);
  await page.evaluate(() => {
    (window as any).D.attorney_name = 'Robin Cruz, Esq.';
    (window as any).D.attorney_bar = '0123456';
  });
  await page.evaluate(() => (window as any).navigate('/p3'));
  const snapshot = await extractFormContentSnapshot(page);
  expect(snapshot).toBe("Signatures\nAll Filings\n?\nPreparer's note: Before attaching any signature on this page, confirm you have that party's actual legal authorization to sign on their behalf. Do not sign for a party you have not been authorized to sign for.\nUnder penalty of perjury, I declare that I have read the foregoing and the facts alleged are true to the best of my knowledge and belief.\nThe form provides space for two guardians or guardian advocates. Fill in the second block only if there is a co-guardian.\nGuardian / Guardian Advocate\nLink Person\nPrinted Name\n*\nDate Signed\nUse MM/DD/YYYY\nSignature\nUnsigned\n\"/s/\" Signed\nSignature Stamp\nPhone Number\nEmail Address\nMailing Address\n+ Add Co-Guardian\nCertification and Signature of Preparer\nLink Person\nThe preparation of this form is based upon information provided by the guardian(s). The preparer has not audited or reviewed the plan or supporting documents.\nPreparer Name\nDate Signed\nUse MM/DD/YYYY\nTelephone Number\nPreparer Email Address\nMailing Address\nCity / State / Zip\nCertification and Signature of Guardian's Attorney\nLink Person\nThe undersigned notifies the Court of the filing of this plan and represents that it conforms to the requirements of Florida Guardianship Law. Leave blank if no attorney is involved.\nAttorney Name\nFlorida Bar Number\nTelephone Number\nDate Signed\nUse MM/DD/YYYY\nPrimary Email (e-filing)\nSecondary Email (optional)\nMailing Address\nCity / State / Zip\nSupporting Documents — accounting period 01/01/2026 to 12/31/2026\n\nUpload PDF supplemental documents only. Supplemental PDFs are inserted as uploaded; Probate Guardian does not certify or remediate uploaded documents for accessibility. Stored on this device only, encrypted with the rest of this ward's data.\n\n+ Upload PDF(s)\nNo supporting documents uploaded for this period.\nComments\n← Back\nPreview & Export →\n---CONTROL VALUES---\n[input:Sample Guardian]\n[input:01/05/2027]\n[radio:sigstate_planGuardians_0=unchecked]\n[radio:sigstate_planGuardians_0=checked]\n[radio:sigstate_planGuardians_0=unchecked]\n[input:(555) 555-5555]\n[input:guardian@example.com]\n[input:123 Main St, Clearwater, FL 33755]\n[input:]\n[input:]\n[input:]\n[input:]\n[input:]\n[input:]\n[input:Robin Cruz, Esq.]\n[input:00123456]\n[input:]\n[input:]\n[input:]\n[input:]\n[input:]\n[input:]\n[input:]\n[textarea:]");
});
