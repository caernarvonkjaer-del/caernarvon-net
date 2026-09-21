import { test, expect } from '@playwright/test';
import { freshStartNoPassword, createWard, fillMinimalValidPlanMinorWard, extractFormContentSnapshot } from './support/target';
import { registerPlanMountTests } from './support/plan-fixture';

// Plan Minor is the fifth and last feature extraction (Milestone 6 of
// INDEX-SPLIT-PLAN.md) -- mirrors plan-initial-mount.spec.ts's shape.
// No Excel round-trip spec: this filing type has no Excel support at all
// (see the Milestone 6 plan's "Confirmed facts").

registerPlanMountTests({
  featureName: 'Plan Minor',
  filingType: 'planMinor',
  routes: ['/', '/summary', '/p2', '/p3', '/p4', '/p5', '/p6', '/p7', '/print'],
  fillValidWard: fillMinimalValidPlanMinorWard,
  triggerExport: (page) => page.evaluate(() => (window as any).doSavePdfPlanMinor()),
  triggerBlockedExport: (page) => page.evaluate(() => (window as any).doSavePdfPlanMinor()),
  // The guardian sibling ward created alongside the Plan Minor filing in the
  // remount-cycling test needs its own mount to settle before the switch
  // loop starts, or the first switchWard() races the guardian feature's
  // Excel-import wiring.
  waitForReady: (page) => page.locator('[data-inventory-change="import-excel"]').waitFor({ state: 'attached' }),
  navChecks: [
    { route: '/', key: 'pm-cover' },
    { route: '/p2', key: 'pm-p2' },
    { route: '/p3', key: 'pm-p3' },
    { route: '/p4', key: 'pm-p4' },
    { route: '/p5', key: 'pm-p5' },
    { route: '/p6', key: 'pm-p6' },
    { route: '/p7', key: 'pm-p7' },
  ],
});

// Milestone 41-3: same "0 visual diff" proof technique as Plan Simplified's
// own 41-2 cards. Two real, deliberate content changes survive this
// snapshot (not accidental drift, confirmed via git-stash before/after):
// the Guardian name field now carries the data-field-required marker it
// was always missing despite validatePlanMinor() genuinely requiring it
// for the first guardian, and the phone field is now consistently
// formatted like every other phone field on this page (it was the one
// hand-rolled field with no formatting at all).
test('Cover page renders the expected visible text and control values through the Tier 2/1 field migration', async ({ page }) => {
  await freshStartNoPassword(page);
  await createWard(page, 'Minor Diff Ward', 'planMinor');
  await fillMinimalValidPlanMinorWard(page);
  await page.evaluate(() => (window as any).navigate('/'));
  const snapshot = await extractFormContentSnapshot(page);
  expect(snapshot).toBe("Annual Plan — Minors — Cover\nAll Filings\n?\nThis is the Annual Guardianship Plan used when the ward is a minor. It has no rights-restoration table or ADL ratings — instead it covers residence, medical care, and the minor's education and social development.\nMINOR & CASE INFORMATION\nMinor's Name\n*\nCounty\n*\nUCN\nCase #\nFor the Period From\n*\nUse MM/DD/YYYY\nTo\n*\nUse MM/DD/YYYY\nAmended Form?\nYes\nNo\nGUARDIAN & CURRENT RESIDENCE\nGuardian Name(s)\n*\nProfessional Guardian?\nYes\nNo\nPublic Guardian?\nYes\nNo\nResidence Name\n*\nStreet Address\n*\nCity\nState\nZip\nPhone Number\nSupporting Documents — accounting period 01/01/2026 to 12/31/2026\n\nUpload PDF supplemental documents only. Supplemental PDFs are inserted as uploaded; Guardian Forms does not certify or remediate uploaded documents for accessibility. Stored on this device only, encrypted with the rest of this ward's data.\n\n+ Upload PDF(s)\nNo supporting documents uploaded for this period.\nComments\nNext →\n---CONTROL VALUES---\n[input:Minor Diff Ward]\n[input:Pinellas]\n[input:2026-CP-000987]\n[input:]\n[input:01/01/2026]\n[input:12/31/2026]\n[radio:yesno_amendedForm=unchecked]\n[radio:yesno_amendedForm=checked]\n[input:Sample Guardian]\n[radio:yesno_professionalGuardian=unchecked]\n[radio:yesno_professionalGuardian=unchecked]\n[radio:yesno_publicGuardian=unchecked]\n[radio:yesno_publicGuardian=unchecked]\n[input:Sample Residence]\n[input:123 Main St]\n[input:Clearwater]\n[input:FL]\n[input:33755]\n[input:]\n[input:]\n[textarea:]");
});

test('Signatures page renders the expected visible text and control values through the Guardian identity/contact field migration', async ({ page }) => {
  await freshStartNoPassword(page);
  await createWard(page, 'Minor Diff Ward', 'planMinor');
  await fillMinimalValidPlanMinorWard(page);
  await page.evaluate(() => (window as any).navigate('/p6'));
  const snapshot = await extractFormContentSnapshot(page);
  expect(snapshot).toBe("Certification and Signature of Guardian(s)\nAll Filings\n?\nCheck all that apply:\nThe Ward was declared totally incapacitated.\nThe Ward is a minor.\nThe guardian has consulted with the Ward, to the extent reasonable, has honored the Ward's wishes, and to the maximum extent possible the plan is in accordance with the Ward's wishes or consistent with the rights retained by the Ward.\nThe plan does not restrict the physical liberty of the Ward except as necessary to protect the Ward and others from serious physical injury, illness, or disease.\nThe plan provides for the Ward's medical care and mental health treatment.\nThe physician's statement of an examination of the Ward no more than 90 days before the beginning of the plan period is attached.\nPreparer's note: Before attaching any signature on this page, confirm you have that party's actual legal authorization to sign on their behalf. Do not sign for a party you have not been authorized to sign for.\n\nUnder penalties of perjury, each signing guardian declares they have read and examined the foregoing plan, and the facts alleged are true, to the best of their knowledge and belief.\n\nGuardian\nLink Person\nName\n*\nRelationship to Ward\nSSN/EIN #\nTelephone #\nDate Signed\nUse MM/DD/YYYY\nSignature\nUnsigned\n\"/s/\" Signed\nSignature Stamp\nMailing Address\nCity/State/Zip\nEmail Address\n+ Add Co-Guardian\nSupporting Documents — accounting period 01/01/2026 to 12/31/2026\n\nUpload PDF supplemental documents only. Supplemental PDFs are inserted as uploaded; Guardian Forms does not certify or remediate uploaded documents for accessibility. Stored on this device only, encrypted with the rest of this ward's data.\n\n+ Upload PDF(s)\nNo supporting documents uploaded for this period.\nComments\n← Back\nNext →\n---CONTROL VALUES---\n[checkbox:certIncapacitated=unchecked]\n[checkbox:certMinor=unchecked]\n[checkbox:certConsulted=checked]\n[checkbox:certNoRestriction=unchecked]\n[checkbox:certProvidesCare=unchecked]\n[checkbox:certPhysicianAttached=unchecked]\n[input:Sample Guardian]\n[input:Parent]\n[input:123-45-6789]\n[input:(555) 555-5555]\n[input:01/11/2027]\n[radio:sigstate_planGuardians_0=unchecked]\n[radio:sigstate_planGuardians_0=checked]\n[radio:sigstate_planGuardians_0=unchecked]\n[input:123 Main St]\n[input:Clearwater, FL 33755]\n[input:guardian@example.com]\n[input:]\n[textarea:]");
});
