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
  triggerExport: (page) => page.evaluate(() => (window as any).GuardianForms.testing.saveOutput.pdfPlanAnnual()),
  triggerBlockedExport: (page) => page.evaluate(() => (window as any).GuardianForms.testing.saveOutput.pdfPlanAnnual()),
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
  await page.evaluate(() => (window as any).GuardianForms.testing.navigate('/'));
  const snapshot = await extractFormContentSnapshot(page);
  // Milestone 63E: the Cover gained an optional UCN field -- one label and one (empty) input.
  // Milestone 73S (73S-N1): the UCN is starred as a reminder, and its hint
  // says what the star means (the star is hidden from a screen reader).
  // Milestone 74P: the ward's "Mailing address same as residence" box (unticked) before the mailing fields.
  // Milestone 73O part 4: the shared footer (decision 73O-4) and the documents
  // headings in their small capitals (the style targets their h2) -- the only
  // differences, read before updating.
  // Milestone 73P (D25): the documents note says "encrypted" only on a case
  // file with a password; this one has none.
  expect(snapshot).toBe("TEST SYSTEM - Do not use for filing - Annual Guardianship Plan — Cover\nAll Filings\n?\nThis plan reports on the ward as a person: where they live, the care they receive, their abilities and their rights. It is a separate filing from any accounting, which reports on their money and property. A physician's report must be filed separately at the same time — the app does not produce it.\nWARD & CASE INFORMATION\nName of Ward\n*\nCase Number\n*\nCounty\n*\nUCN\n*\nStarred as a reminder: export never stops for a blank UCN.\nSocial Security Number\nGuardianship Inception Date\n*\nUse MM/DD/YYYY\nReporting Period From\n*\nUse MM/DD/YYYY\nReporting Period To\n*\nUse MM/DD/YYYY\nEnter the coming plan year: it begins the day after the anniversary month of the Letters of Guardianship ends, and ends on the last day of that month a year later (F.S. 744.367(1)). For calendar-year filing, January 1 to December 31.\nGUARDIAN, ATTORNEY & RESIDENCE\nGuardian Name(s)\n*\nAttorney Name\nThe ward is living:\n*\nIn a private residence leased or owned by them\nIn a private residence not leased or owned by them\nIn a facility (skilled nursing, assisted living, etc.)\nAddress Where Ward Resides\n*\nCity / State / ZIP\n*\nPhone\nMailing address same as residence\nMailing Address (if different)\nMailing City / State / ZIP\nSUPPORTING DOCUMENTS — REPORTING PERIOD 01/01/2026 TO 12/31/2026\n\nUpload PDF supplemental documents only. Supplemental PDFs are inserted as uploaded; Guardian Forms does not certify or remediate uploaded documents for accessibility. Stored on this device only, in this case file, which has no password.\n\n+ Upload PDF(s)\nNo supporting documents uploaded for this period.\nCOMMENTS\n\u00a0\nPage 1 of 14\nNext: Summary →\n---CONTROL VALUES---\n[input:Ann Diff Ward]\n[input:26-000321]\n[input:Pinellas]\n[input:]\n[input:]\n[input:01/01/2025]\n[input:01/01/2026]\n[input:12/31/2026]\n[input:Sample Guardian]\n[input:]\n[radio:radio_wardLiving=unchecked]\n[radio:radio_wardLiving=unchecked]\n[radio:radio_wardLiving=checked]\n[input:123 Main St]\n[input:Clearwater, FL 33755]\n[input:]\n[checkbox:mailingSameAsResidence=unchecked]\n[input:]\n[input:]\n[input:]\n[textarea:]");
});

// Milestone 72C: no attorney is entered here, so Primary Email (e-filing) is no
// longer marked required -- it is, live, once an attorney is started.
test('Signatures page renders byte-identical visible text and control values through the Guardian field migration', async ({ page }) => {
  await freshStartNoPassword(page);
  await createWard(page, 'Ann Diff Ward', 'planAnnual');
  await fillMinimalValidPlanAnnualWard(page);
  await page.evaluate(() => (window as any).GuardianForms.testing.navigate('/p11'));
  const snapshot = await extractFormContentSnapshot(page);
  // Milestone 73F part 3: asterisks follow the checks -- the guardian's Date Signed is required only under "/s/" Signed, which a guardian isn't offered; SSN / EIN, Phone Number and Mailing Street Address are required (*).
  // Milestone 74P: the guardian's "Residence or office address same as mailing address" box (unticked).
  // Milestone 73N part 2: the certifications, the preamble and the attorney's certification in the court's own words.
  // Milestone 73O part 4: the shared footer (decision 73O-4) and the documents
  // headings in their small capitals (the style targets their h2) -- the only
  // differences, read before updating.
  // Milestone 73P (D25): the documents note says "encrypted" only on a case
  // file with a password; this one has none.
  expect(snapshot).toBe("TEST SYSTEM - Do not use for filing - Signatures\nAll Filings\n?\nPreparer's note: Before attaching any signature on this page, confirm you have that party's actual legal authorization to sign on their behalf. Do not sign for a party you have not been authorized to sign for.\nCERTIFICATION AND SIGNATURE OF GUARDIAN(S)\n(Check all that apply) If the Ward's ability to exercise rights has changed since the Order Determining Capacity and/or Order Appointing Guardian, the guardian must either file a petition to remove or restore rights as appropriate, or provide an explanation as to why no change should be made.\nThe Ward was declared totally incapacitated and has not been given a copy of this plan.\nThe Ward is a minor and has not been given a copy of this plan.\nThe guardian has consulted with the Ward, to the extent reasonable, has honored the Ward's wishes, and to the maximum extent possible the plan is in accordance with the Ward's wishes or consistent with the rights retained by the Ward.\nThe plan does not restrict the physical liberty of the Ward except as necessary to protect the Ward and others from serious physical injury, illness, or disease.\nThe plan provides for the Ward's medical care and mental health treatment.\nThe physician's statement of an examination of the Ward no more than 90 days before the beginning of the plan period is attached.\nIn exercising his or her powers, the guardian shall recognize any rights retained by the ward [FS 744.363(6)].\nIf rights have changed and no petition is being filed, explain why\nUNDER PENALTIES OF PERJURY, I declare that I have read and examined the foregoing plan, and the facts alleged are true, to the best of my knowledge and belief.\nGuardian\nLink Person\nPrinted Name\n*\nDate Signed\nUse MM/DD/YYYY\nSignature\nUnsigned\nSignature Stamp\nSSN / EIN\n*\nPhone Number\n*\nEmail Address\nMailing Street Address\n*\nMailing City / State / ZIP\nResidence or office address same as mailing address\nResidence or Office Street Address\nResidence or Office City / State / ZIP\nRelationship to Ward\n+ Add Co-Guardian\nCERTIFICATION AND SIGNATURE OF GUARDIAN'S ATTORNEY\nLeave blank if no attorney is involved.\nThe undersigned hereby notifies the Court of the filing of the annual guardianship plan for the period 01/01/2026 through 12/31/2026. The undersigned hereby notifies the Court of the annual guardianship plan of the guardian of the person. This annual guardianship plan is the representation of the guardian. I have not audited the accompanying annual plan. The undersigned attorney represents that he/she has examined the contents of the annual guardianship plan and that it conforms to the requirements of the Florida Guardianship Law and the standards for the plans in Pinellas County.\nAttorney Certification\nLink Person\nAttorney Name\nDate Signed\nUse MM/DD/YYYY\nSignature\nUnsigned\n\"/s/\" Signed\nSignature Stamp\nBar Number\nPhone Number\nPrimary Email (e-filing)\nSecondary Email (optional)\nStreet Address\nCity / State / ZIP\nSUPPORTING DOCUMENTS — REPORTING PERIOD 01/01/2026 TO 12/31/2026\n\nUpload PDF supplemental documents only. Supplemental PDFs are inserted as uploaded; Guardian Forms does not certify or remediate uploaded documents for accessibility. Stored on this device only, in this case file, which has no password.\n\n+ Upload PDF(s)\nNo supporting documents uploaded for this period.\nCOMMENTS\n← Previous: 11. Remuneration\nPage 12 of 14\nNext: Certificate of Service →\n---CONTROL VALUES---\n[checkbox:certIncapacitatedNoCopy=unchecked]\n[checkbox:certMinorNoCopy=unchecked]\n[checkbox:certConsulted=unchecked]\n[checkbox:certNoRestriction=unchecked]\n[checkbox:certProvidesMedical=unchecked]\n[checkbox:certPhysicianAttached=checked]\n[checkbox:certRecognizeRights=unchecked]\n[textarea:]\n[input:Sample Guardian]\n[input:01/05/2026]\n[radio:sigstate_planGuardians_0=checked]\n[radio:sigstate_planGuardians_0=unchecked]\n[input:123-45-6789]\n[input:(555) 555-5555]\n[input:guardian@example.com]\n[input:123 Main St]\n[input:Clearwater, FL 33755]\n[checkbox:planGuardians.0.officeSameAsMailing=unchecked]\n[input:]\n[input:]\n[input:Professional Guardian]\n[input:]\n[input:]\n[radio:sigstate_attorney=checked]\n[radio:sigstate_attorney=unchecked]\n[radio:sigstate_attorney=unchecked]\n[input:]\n[input:]\n[input:]\n[input:]\n[input:]\n[input:]\n[input:]\n[textarea:]");
});
