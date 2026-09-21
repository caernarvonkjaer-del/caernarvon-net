import { test, expect } from '@playwright/test';
import { freshStartNoPassword, createWard, fillMinimalValidPlanAnnualWard, extractFormContentSnapshot } from './support/target';
import { registerPlanMountTests } from './support/plan-fixture';

// Plan Annual is the third feature extraction (Milestone 4 of
// INDEX-SPLIT-PLAN.md) -- mirrors plan-simplified-mount.spec.ts's shape.
// No Excel round-trip spec: this filing type has no Excel support at all
// (see the Milestone 4 plan's "Confirmed facts").

registerPlanMountTests({
  featureName: 'Plan Annual',
  filingType: 'planAnnual',
  routes: ['/', '/summary', '/p2', '/p3', '/p4', '/p5', '/p6', '/p7', '/p8', '/p9', '/p10', '/p11', '/print'],
  fillValidWard: fillMinimalValidPlanAnnualWard,
  triggerExport: (page) => page.evaluate(() => (window as any).doSavePdfPlanAnnual()),
  triggerBlockedExport: (page) => page.evaluate(() => (window as any).doSavePdfPlanAnnual()),
  navChecks: [
    { route: '/', key: 'pa-cover' },
    { route: '/p2', key: 'pa-p2' },
    { route: '/p3', key: 'pa-p3' },
    { route: '/p4', key: 'pa-p4' },
    { route: '/p5', key: 'pa-p5' },
    { route: '/p6', key: 'pa-p6' },
    { route: '/p7', key: 'pa-p7' },
    { route: '/p8', key: 'pa-p8' },
    { route: '/p9', key: 'pa-p9' },
    { route: '/p10', key: 'pa-p10' },
    { route: '/p11', key: 'pa-p11' },
  ],
});

// Milestone 41-3: Plan Annual's Tier 2/1 migration came back byte-identical
// on BOTH pages -- the cleanest of the four Plan types, because this one
// already applied its own formatters (formatName/formatSSN/formatPhone/
// formatAddress) and already showed the required asterisk for guardian 0,
// so routing through renderFormField() changed nothing visible. Verified via
// git-stash before/after; pinned here as permanent regression guards.
test('Cover page renders byte-identical visible text and control values through the Tier 2 cards', async ({ page }) => {
  await freshStartNoPassword(page);
  await createWard(page, 'Ann Diff Ward', 'planAnnual');
  await fillMinimalValidPlanAnnualWard(page);
  await page.evaluate(() => (window as any).navigate('/'));
  const snapshot = await extractFormContentSnapshot(page);
  expect(snapshot).toBe("Annual Guardianship Plan — Cover\nAll Filings\n?\nThis plan reports on the ward as a person: where they live, the care they receive, their abilities and their rights. It is a separate filing from any accounting, which reports on their money and property. A physician's report must be filed separately at the same time — the app does not produce it.\nWARD & CASE INFORMATION\nName of Ward\n*\nCase Number\n*\nCounty\n*\nSocial Security Number\nGuardianship Inception Date\n*\nUse MM/DD/YYYY\nReporting Period From\n*\nUse MM/DD/YYYY\nReporting Period To\n*\nUse MM/DD/YYYY\nGUARDIAN, ATTORNEY & RESIDENCE\nGuardian Name(s)\n*\nAttorney Name\nThe ward is living:\n*\nIn a private residence leased or owned by them\nIn a private residence not leased or owned by them\nIn a facility (skilled nursing, assisted living, etc.)\nAddress Where Ward Resides\n*\nCity / State / ZIP\n*\nPhone\nMailing Address (if different)\nMailing City / State / ZIP\nSupporting Documents — accounting period 01/01/2026 to 12/31/2026\n\nUpload PDF supplemental documents only. Supplemental PDFs are inserted as uploaded; Guardian Forms does not certify or remediate uploaded documents for accessibility. Stored on this device only, encrypted with the rest of this ward's data.\n\n+ Upload PDF(s)\nNo supporting documents uploaded for this period.\nComments\nNext →\n---CONTROL VALUES---\n[input:Ann Diff Ward]\n[input:26-000321]\n[input:Pinellas]\n[input:]\n[input:01/01/2025]\n[input:01/01/2026]\n[input:12/31/2026]\n[input:Sample Guardian]\n[input:]\n[radio:radio_wardLiving=unchecked]\n[radio:radio_wardLiving=unchecked]\n[radio:radio_wardLiving=checked]\n[input:123 Main St]\n[input:Clearwater, FL 33755]\n[input:]\n[input:]\n[input:]\n[input:]\n[textarea:]");
});

test('Signatures page renders byte-identical visible text and control values through the Guardian field migration', async ({ page }) => {
  await freshStartNoPassword(page);
  await createWard(page, 'Ann Diff Ward', 'planAnnual');
  await fillMinimalValidPlanAnnualWard(page);
  await page.evaluate(() => (window as any).navigate('/p11'));
  const snapshot = await extractFormContentSnapshot(page);
  expect(snapshot).toBe("Signatures\nAll Filings\n?\nCERTIFICATION OF GUARDIAN(S)\nCheck each statement that applies. If the ward's ability to exercise rights has changed since the order appointing you, you must either file a petition to remove or restore rights, or explain below why no change should be made.\nThe ward was declared totally incapacitated and has not been given a copy of this plan\nThe ward is a minor and has not been given a copy of this plan\nThe guardian has consulted with the ward, honored their wishes, and the plan accords with them to the maximum extent possible\nThe plan does not restrict the ward's physical liberty except as necessary to prevent serious injury, illness or disease\nThe plan provides for the ward's medical care and mental health treatment\nThe physician's statement of an examination within 90 days before the plan period is attached\nIn exercising their powers, the guardian recognizes any rights retained by the ward (F.S. 744.363(6))\nIf rights have changed and no petition is being filed, explain why\nPreparer's note: Before attaching any signature on this page, confirm you have that party's actual legal authorization to sign on their behalf. Do not sign for a party you have not been authorized to sign for.\nUnder penalties of perjury, I declare that I have read and examined the foregoing plan, and the facts alleged are true, to the best of my knowledge and belief.\nGuardian\nLink Person\nPrinted Name\n*\nDate Signed\n*\nUse MM/DD/YYYY\nSignature\nUnsigned\n\"/s/\" Signed\nSignature Stamp\nSSN / EIN\nPhone Number\nEmail Address\nMailing Street Address\nMailing City / State / ZIP\nResidence or Office Street Address\nResidence or Office City / State / ZIP\nRelationship to Ward\n+ Add Co-Guardian\nCERTIFICATION OF GUARDIAN'S ATTORNEY\nThe attorney notifies the court of this filing and represents that the plan conforms to Florida Guardianship Law. Leave blank if no attorney is involved.\nAttorney Certification\nLink Person\nAttorney Name\nDate Signed\nUse MM/DD/YYYY\nSignature\nUnsigned\n\"/s/\" Signed\nSignature Stamp\nBar Number\nPhone Number\nPrimary Email (e-filing)\n*\nSecondary Email (optional)\nStreet Address\nCity / State / ZIP\nSupporting Documents — accounting period 01/01/2026 to 12/31/2026\n\nUpload PDF supplemental documents only. Supplemental PDFs are inserted as uploaded; Guardian Forms does not certify or remediate uploaded documents for accessibility. Stored on this device only, encrypted with the rest of this ward's data.\n\n+ Upload PDF(s)\nNo supporting documents uploaded for this period.\nComments\n← Back\nPreview & Export →\n---CONTROL VALUES---\n[checkbox:certIncapacitatedNoCopy=unchecked]\n[checkbox:certMinorNoCopy=unchecked]\n[checkbox:certConsulted=unchecked]\n[checkbox:certNoRestriction=unchecked]\n[checkbox:certProvidesMedical=unchecked]\n[checkbox:certPhysicianAttached=checked]\n[checkbox:certRecognizeRights=unchecked]\n[textarea:]\n[input:Sample Guardian]\n[input:01/05/2027]\n[radio:sigstate_planGuardians_0=unchecked]\n[radio:sigstate_planGuardians_0=checked]\n[radio:sigstate_planGuardians_0=unchecked]\n[input:123-45-6789]\n[input:(555) 555-5555]\n[input:guardian@example.com]\n[input:123 Main St]\n[input:Clearwater, FL 33755]\n[input:]\n[input:]\n[input:Professional Guardian]\n[input:]\n[input:]\n[radio:sigstate_attorney=checked]\n[radio:sigstate_attorney=unchecked]\n[radio:sigstate_attorney=unchecked]\n[input:]\n[input:]\n[input:]\n[input:]\n[input:]\n[input:]\n[input:]\n[textarea:]");
});
