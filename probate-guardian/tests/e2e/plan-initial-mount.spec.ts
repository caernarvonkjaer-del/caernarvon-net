import { test, expect } from '@playwright/test';
import { freshStartNoPassword, createWard, fillMinimalValidPlanInitialWard, extractFormContentSnapshot } from './support/target';
import { registerPlanMountTests } from './support/plan-fixture';

// Plan Initial is the fourth feature extraction (Milestone 5 of
// INDEX-SPLIT-PLAN.md) -- mirrors plan-annual-mount.spec.ts's shape.
// No Excel round-trip spec: this filing type has no Excel support at all
// (see the Milestone 5 plan's "Confirmed facts").

registerPlanMountTests({
  featureName: 'Plan Initial',
  filingType: 'planInitial',
  routes: ['/', '/summary', '/p2', '/p3', '/p4', '/p5', '/p6', '/p7', '/p8', '/p9', '/p10', '/print'],
  fillValidWard: fillMinimalValidPlanInitialWard,
  triggerExport: (page) => page.evaluate(() => (window as any).doSavePdfPlanInitial()),
  triggerBlockedExport: (page) => page.evaluate(() => (window as any).doSavePdfPlanInitial()),
  navChecks: [
    { route: '/', key: 'pi-cover' },
    { route: '/p2', key: 'pi-p2' },
    { route: '/p3', key: 'pi-p3' },
    { route: '/p4', key: 'pi-p4' },
    { route: '/p5', key: 'pi-p5' },
    { route: '/p6', key: 'pi-p6' },
    { route: '/p7', key: 'pi-p7' },
    { route: '/p8', key: 'pi-p8' },
    { route: '/p9', key: 'pi-p9' },
    { route: '/p10', key: 'pi-p10' },
  ],
});

// Milestone 41-3: "0 visual diff" snapshot pins for Plan Initial's Tier 2/1
// field migration, verified via git-stash before/after. The Cover page came
// back byte-identical (both Cover cards reused unchanged from 41-2). The
// Signatures page carries the same two deliberate improvements Plan Minor's
// migration did: the guardian name field now has the data-field-required
// marker validatePlanInitial() always implied, and the guardian phone field
// is now formatted like every other phone field on the page.
test('Cover page renders byte-identical visible text and control values through the reused Tier 2 cards', async ({ page }) => {
  await freshStartNoPassword(page);
  await createWard(page, 'Init Diff Ward', 'planInitial');
  await fillMinimalValidPlanInitialWard(page);
  await page.evaluate(() => (window as any).navigate('/'));
  const snapshot = await extractFormContentSnapshot(page);
  // Milestone 63E: the Cover gained an optional UCN field -- one label and one (empty) input.
  expect(snapshot).toBe("Initial Guardianship Plan — Cover\nAll Filings\n?\nThis report, with original signatures, is due within 60 days after the Letters of Guardianship are signed, and remains in effect until amended or replaced by the approval of an Annual Guardianship Plan.\nWARD & CASE INFORMATION\nName of Ward\n*\nCase Number\n*\nCounty\n*\nUCN\nSuccessor Guardianship? (if applicable)\n— select —\nSuccessor\nStandby\nSurrogate\nEmergency Temporary Guardianship\nNone\nGuardianship Inception Date\n*\nUse MM/DD/YYYY. When this guardianship began. For an original guardian this is usually the same day the letters were signed.\nDate Letters Were Signed\n*\nUse MM/DD/YYYY. When this guardian's letters were signed. For a successor guardian this is later than the inception date, and the 60-day deadline for this plan runs from it (F.S. 744.362(1)).\nFor the Period From\n*\nUse MM/DD/YYYY\nThrough\n*\nUse MM/DD/YYYY\nGUARDIAN, ATTORNEY & RESIDENCE\nGuardian Name(s)\n*\nAttorney Name\nThe ward is living:\n*\nIn a private residence leased or owned by them (house, condo or apartment)\nIn a private residence not leased or owned by them (such as family member)\nIn a facility (Skilled Nursing, Assisted Living, etc.)\nAddress Where Ward Is Currently Residing\n*\nCity / State / ZIP\n*\nPhone\nMailing Address for Ward (if different from above)\nMailing City / State / ZIP\nList any preexisting orders not to resuscitate or preexisting advance directives, the date signed, whether suspended by the court, and the steps taken to identify and locate them. Attach a copy of any directives to the plan.\nSupporting Documents — reporting period 01/01/2026 to 12/31/2026\n\nUpload PDF supplemental documents only. Supplemental PDFs are inserted as uploaded; Guardian Forms does not certify or remediate uploaded documents for accessibility. Stored on this device only, encrypted with the rest of this ward's data.\n\n+ Upload PDF(s)\nNo supporting documents uploaded for this period.\nComments\nNext →\n---CONTROL VALUES---\n[input:Init Diff Ward]\n[input:26-000654]\n[input:Pinellas]\n[input:]\n[select:]\n[input:01/05/2026]\n[input:01/06/2026]\n[input:01/01/2026]\n[input:12/31/2026]\n[input:Sample Guardian]\n[input:]\n[radio:radio_wardLiving=unchecked]\n[radio:radio_wardLiving=unchecked]\n[radio:radio_wardLiving=checked]\n[input:123 Main St]\n[input:Clearwater, FL 33755]\n[input:]\n[input:]\n[input:]\n[textarea:]\n[input:]\n[textarea:]");
});

test('Signatures page renders the expected visible text and control values through the Guardian field migration', async ({ page }) => {
  await freshStartNoPassword(page);
  await createWard(page, 'Init Diff Ward', 'planInitial');
  await fillMinimalValidPlanInitialWard(page);
  await page.evaluate(() => (window as any).navigate('/p9'));
  const snapshot = await extractFormContentSnapshot(page);
  expect(snapshot).toBe("Certification and Signature of Guardian(s)\nAll Filings\n?\nPreparer's note: Before attaching any signature on this page, confirm you have that party's actual legal authorization to sign on their behalf. Do not sign for a party you have not been authorized to sign for.\nIf the Ward's ability to exercise rights has changed since the Order Determining Capacity and Appointing Guardian, the guardian must file a Petition to Remove or Petition to Restore Rights, as appropriate.\nCheck all that apply:\nThe Ward was declared totally incapacitated and has not been given a copy of this plan\nThe Ward is a minor under the age of 14 and has not been given a copy of this plan\nThe guardian has consulted with the Ward, to the extent reasonable, has honored the Ward's wishes, and to the maximum extent possible the plan is in accordance with the Ward's wishes or consistent with the rights retained by the Ward\nIn exercising his or her powers, the guardian shall recognize any rights retained by the ward (F.S. 744.363(6))\nThe plan does not restrict the physical liberty of the Ward except as necessary to protect the Ward and others from serious physical injury, illness, or disease\nThe plan provides for the Ward's medical care and mental health treatment\n\nUnder penalties of perjury, each signing guardian declares they have read and examined the foregoing plan, and the facts alleged are true, to the best of their knowledge and belief.\n\nGuardian\nLink Person\nName\n*\nRelationship to Ward\nSSN/EIN\nPhone Number\nDate Signed\nUse MM/DD/YYYY\nSignature\nUnsigned\n\"/s/\" Signed\nSignature Stamp\nStreet Address\nCity/State/Zip\n+ Add Co-Guardian\nAll guardians of the person must sign and provide their most current address, telephone number, and SSN. Only reports with original signatures will be audited by the Clerk of the Court.\nSupporting Documents — reporting period 01/01/2026 to 12/31/2026\n\nUpload PDF supplemental documents only. Supplemental PDFs are inserted as uploaded; Guardian Forms does not certify or remediate uploaded documents for accessibility. Stored on this device only, encrypted with the rest of this ward's data.\n\n+ Upload PDF(s)\nNo supporting documents uploaded for this period.\nComments\n← Back\nNext →\n---CONTROL VALUES---\n[checkbox:certIncapacitatedNoCopy=unchecked]\n[checkbox:certMinorNoCopy=unchecked]\n[checkbox:certConsulted=checked]\n[checkbox:certRecognizeRights=unchecked]\n[checkbox:certNoRestriction=unchecked]\n[checkbox:certProvidesCare=unchecked]\n[input:Sample Guardian]\n[input:Parent]\n[input:123-45-6789]\n[input:(555) 555-5555]\n[input:01/11/2026]\n[radio:sigstate_planGuardians_0=unchecked]\n[radio:sigstate_planGuardians_0=checked]\n[radio:sigstate_planGuardians_0=unchecked]\n[input:123 Main St]\n[input:Clearwater, FL 33755]\n[input:]\n[textarea:]");
});

// Milestone 58C. Primary Email carries a required asterisk only once an
// attorney has been started, and "started" changes while the filer types --
// so the marker has to move with them, not be decided once at render.
//
// The pro se half matters most: a filer with no attorney must never see a
// required field in a block they are entitled to leave empty (Fla. Prob. R.
// 5.030 / Ch. 393 Guardian Advocate).
test('Milestone 58C: Primary Email\'s required marker follows the attorney block, live and in place', async ({ page }) => {
  await freshStartNoPassword(page);
  await createWard(page, 'Attorney Marker Ward', 'planInitial');
  await fillMinimalValidPlanInitialWard(page);
  await page.evaluate(() => {
    const w = window as any;
    for (const k of ['attorney_name', 'attorney_bar', 'attorney_email', 'attorney_secondaryEmail',
      'attorney_street', 'attorney_cityStateZip', 'attorney_phone',
      'attorney_signatureDate', 'attorney_signatureState']) w.D[k] = '';
    w.navigate('/p10');
  });

  // input[...] specifically: the local-guidance panel renders a jump-to-field
  // button with the same data-field-path once the section reports incomplete.
  const email = page.locator('input[data-field-path="attorney_email"]');
  const asterisk = page.locator('label[for="attorney_email"] .req');
  await expect(email).toBeVisible();

  // Nothing entered: no marker, nothing announced as required.
  await expect(asterisk).toHaveCount(0);
  await expect(email).not.toHaveAttribute('aria-required', 'true');

  // Typing a phone number -- and nothing else -- starts the attorney block.
  const phone = page.locator('input[data-field-path="attorney_phone"]');
  await phone.click();
  await phone.fill('727-555-0143');
  await phone.dispatchEvent('change');

  await expect(asterisk, 'the marker appears as soon as the block is started').toHaveCount(1);
  await expect(email).toHaveAttribute('aria-required', 'true');

  // In place: the field the filer is typing in still holds focus, because the
  // marker is an attribute toggle rather than a re-render.
  expect(await page.evaluate(() => (document.activeElement as HTMLElement)?.getAttribute('data-field-path')))
    .toBe('attorney_phone');

  // Clearing the block returns it to the pro se state.
  await phone.fill('');
  await phone.dispatchEvent('change');
  await expect(asterisk, 'clearing the last attorney field restores the pro se state').toHaveCount(0);
  await expect(email).not.toHaveAttribute('aria-required', 'true');
});
