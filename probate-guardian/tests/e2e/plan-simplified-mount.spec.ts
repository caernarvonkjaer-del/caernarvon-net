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
  // Milestone 74C: Save as PDF is clickable on an incomplete filing, as on
  // every form, and the click says why it can't export. (It used to be the one
  // Plan whose button was drawn disabled, so this forced it enabled first.)
  triggerBlockedExport: (page) => page.locator('[data-plan-simplified-action="save-pdf"]').click(),
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
  await page.evaluate(() => (window as any).GuardianForms.testing.navigate('/'));
  const snapshot = await extractFormContentSnapshot(page);
  // Milestone 63E: the Cover gained an optional UCN field -- one label and one (empty) input.
  // Milestone 73S (73S-N1): the UCN is starred as a reminder, and its hint
  // says what the star means (the star is hidden from a screen reader).
  // Milestone 73O part 4: the shared footer (decision 73O-4) and the documents
  // headings in their small capitals (the style targets their h2) -- the only
  // differences, read before updating.
  expect(snapshot).toBe("TEST SYSTEM - Do not use for filing - Simplified Annual Plan — Cover\nAll Filings\n?\nThis plan reports on the ward as a person: where they have lived, the care they received, and how they are doing. It is a separate filing from any accounting, which reports on their money and property.\nWARD & CASE INFORMATION\nName of Ward\n*\nCase Number\n*\nCounty\n*\nUCN\n*\nStarred as a reminder: export never stops for a blank UCN.\nREPORTING PERIOD\nReporting Period From\n*\nUse MM/DD/YYYY\nReporting Period To\n*\nUse MM/DD/YYYY\nSUPPORTING DOCUMENTS — REPORTING PERIOD 01/01/2026 TO 12/31/2026\n\nUpload PDF supplemental documents only. Supplemental PDFs are inserted as uploaded; Guardian Forms does not certify or remediate uploaded documents for accessibility. Stored on this device only, encrypted with the rest of this ward's data.\n\n+ Upload PDF(s)\nNo supporting documents uploaded for this period.\nCOMMENTS\n\u00a0\nPage 1 of 6\nNext: Summary →\n---CONTROL VALUES---\n[input:Text Diff Ward]\n[input:26-000789]\n[input:Pinellas]\n[input:]\n[input:01/01/2026]\n[input:12/31/2026]\n[input:]\n[textarea:]");
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
    (window as any).GuardianForms.testing.patchFiling({ 'attorney_name': 'Robin Cruz, Esq.' });
    (window as any).GuardianForms.testing.patchFiling({ 'attorney_bar': '0123456' });
  });
  await page.evaluate(() => (window as any).GuardianForms.testing.navigate('/p3'));
  const snapshot = await extractFormContentSnapshot(page);
  // Milestone 73F part 3: asterisks follow the checks -- the guardian's Phone Number and Mailing Address are required (*).
  // Milestone 73N part 3: the preparer and attorney cards say the court's form has no place for them.
  // Milestone 73O part 4: the shared footer (decision 73O-4) and the documents
  // headings in their small capitals (the style targets their h2) -- the only
  // differences, read before updating.
  expect(snapshot).toBe("TEST SYSTEM - Do not use for filing - Signatures\nAll Filings\n?\nPreparer's note: Before attaching any signature on this page, confirm you have that party's actual legal authorization to sign on their behalf. Do not sign for a party you have not been authorized to sign for.\nUnder penalty of perjury, I declare that I have read the foregoing and the facts alleged are true to the best of my knowledge and belief.\nThe form provides space for two guardians or guardian advocates. Fill in the second block only if there is a co-guardian.\nGuardian / Guardian Advocate\nLink Person\nPrinted Name\n*\nDate Signed\nUse MM/DD/YYYY\nSignature\nUnsigned\nSignature Stamp\nPhone Number\n*\nEmail Address\nMailing Address\n*\n+ Add Co-Guardian\nCertification and Signature of Preparer\nLink Person\nThe court’s Simplified Plan has no place for this; it is kept for your records. The attorney’s name prints on the certificate of service if the attorney certifies it.\nPreparer Name\nDate Signed\nUse MM/DD/YYYY\nTelephone Number\nPreparer Email Address\nMailing Address\nCity / State / Zip\nCertification and Signature of Guardian's Attorney\nLink Person\nThe court’s Simplified Plan has no place for this; it is kept for your records. The attorney’s name prints on the certificate of service if the attorney certifies it.\nAttorney Name\nFlorida Bar Number\nTelephone Number\nDate Signed\nUse MM/DD/YYYY\nPrimary Email (e-filing)\nSecondary Email (optional)\nMailing Address\nCity / State / Zip\nSUPPORTING DOCUMENTS — REPORTING PERIOD 01/01/2026 TO 12/31/2026\n\nUpload PDF supplemental documents only. Supplemental PDFs are inserted as uploaded; Guardian Forms does not certify or remediate uploaded documents for accessibility. Stored on this device only, encrypted with the rest of this ward's data.\n\n+ Upload PDF(s)\nNo supporting documents uploaded for this period.\nCOMMENTS\n← Previous: The Plan\nPage 4 of 6\nNext: Certificate of Service →\n---CONTROL VALUES---\n[input:Sample Guardian]\n[input:01/05/2026]\n[radio:sigstate_planGuardians_0=checked]\n[radio:sigstate_planGuardians_0=unchecked]\n[input:(555) 555-5555]\n[input:guardian@example.com]\n[input:123 Main St, Clearwater, FL 33755]\n[input:]\n[input:]\n[input:]\n[input:]\n[input:]\n[input:]\n[input:Robin Cruz, Esq.]\n[input:00123456]\n[input:]\n[input:]\n[input:]\n[input:]\n[input:]\n[input:]\n[input:]\n[textarea:]");
});
