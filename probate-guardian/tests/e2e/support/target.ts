import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import type { Page } from '@playwright/test';

// package.json has "type": "module", so this file runs as ESM under
// Playwright's loader -- no __dirname available, derive it the ESM way.
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// See playwright.config.ts — same PG_TARGET values, same four parity targets
// from INDEX-SPLIT-PLAN.md's Milestone 1 acceptance criteria.
const target = process.env.PG_TARGET || 'source';

// Every browser project forces the File System Access API's feature-detect
// off, so the app always takes the download/upload fallback path that real
// Firefox/Safari users already hit today (index.html:3885, 3946, 4234 all
// gate on window.showSaveFilePicker). That fallback path is what makes
// save/open automatable at all — real native pickers can't be driven by
// Playwright, and this exercises a genuinely shipped path rather than a
// synthetic shortcut.
export async function gotoApp(page: Page): Promise<void> {
  await page.addInitScript(() => {
    // @ts-expect-error - intentionally removing these for test automation
    delete window.showSaveFilePicker;
    // @ts-expect-error - intentionally removing these for test automation
    delete window.showOpenFilePicker;
  });
  if (target === 'portable') {
    const filePath = path.resolve(__dirname, '../../../dist/portable/index.html');
    await page.goto(pathToFileURL(filePath).href, { waitUntil: 'networkidle' });
  } else {
    await page.goto('/', { waitUntil: 'networkidle' });
  }
}

/** Fresh install / brand-new browser: dismiss the startup screen with "Start a New Case". */
export async function startNewCase(page: Page): Promise<void> {
  await page.locator('#startup-choice-overlay.show').waitFor({ state: 'visible' });
  await page.click('#startup-newcase-btn, #startup-newcase-link');
  await page.locator('#startup-choice-overlay').waitFor({ state: 'hidden' });
}

/** Choose "No Password / No Encryption" on the data-protection screen. */
export async function chooseNoPassword(page: Page): Promise<void> {
  await page.locator('#security-choice-overlay.show').waitFor({ state: 'visible' });
  await page.click('#security-choice-overlay button[onclick*="selectSecurityMode(\'none\')"]');
  await page.locator('#security-choice-overlay').waitFor({ state: 'hidden' });
}

/** Choose "Encrypted & Password Protected" and set the master password. */
export async function chooseEncrypted(page: Page, pw: string): Promise<void> {
  await page.locator('#security-choice-overlay.show').waitFor({ state: 'visible' });
  await page.click('#security-choice-overlay button[onclick*="selectSecurityMode(\'encrypted\')"]');
  await page.locator('#unlock-overlay.show').waitFor({ state: 'visible' });
  await page.fill('#unlock-password', pw);
  await page.fill('#unlock-password-confirm', pw);
  await page.click('#unlock-submit-btn');
  await page.locator('#unlock-overlay').waitFor({ state: 'hidden' });
}

/** Full fresh-install fast path used by most specs that don't care about the choice screens themselves. */
export async function freshStartNoPassword(page: Page): Promise<void> {
  await gotoApp(page);
  await startNewCase(page);
  await chooseNoPassword(page);
}

/**
 * Creates a ward via the Add Ward modal (index.html: showAddWardModal() /
 * doAddWard()). Works from any page the modal is reachable from — the
 * inventory-select cards and the sidebar's "+ Add Ward" both just call
 * showAddWardModal()/showAddWardModalForType(type) then doAddWard().
 * 'simplified' has its own eligibility modal first and isn't handled here.
 */
export async function createWard(page: Page, name: string, type = 'guardian'): Promise<void> {
  await page.evaluate((t) => (window as any).showAddWardModalForType(t), type);
  await page.locator('#addWardModal.show').waitFor({ state: 'visible' });
  await page.fill('#new-ward-name', name);
  await page.click('#addWardModal button[onclick="doAddWard()"]');
  await page.locator('#addWardModal').waitFor({ state: 'hidden' });
}

/**
 * Fills every field validate() (index.html:15854) requires for a Guardian
 * Inventory ward, directly on window.D via evaluate rather than driving 18
 * form pages of UI -- the export/validation logic under test doesn't care
 * how the data got there. All 11 schedules are marked via their "no items
 * to report" checkbox (scheduleNoItems) rather than populated with rows,
 * since validate() accepts either.
 */
export async function fillMinimalValidGuardianWard(page: Page): Promise<void> {
  await page.evaluate(() => {
    const d = (window as any).D;
    Object.assign(d, {
      wardName: d.wardName || 'Export Test Ward',
      caseNumber: '2026-CP-000123',
      gid: '2026-01-01',
      county: 'Pinellas',
      guardianName: 'Sample Guardian',
      attorneyForGuardian: 'Sample Attorney',
      typeOfGuardianship: 'Plenary',
      bondAmount: '1000',
      bondPeriodFrom: '2026-01-01',
      bondPeriodTo: '2027-01-01',
      bondingCompany: 'Sample Bonding Co',
      serviceDate: '2026-01-02',
    });
    d.scheduleNoItems = Object.fromEntries(
      ['a1', 'a2', 'b1', 'b2', 'b3', 'b4', 'c1', 'c2', 'c3', 'c4', 'c5'].map((k) => [k, true])
    );
    d.guardians = [{
      name: 'Sample Guardian', ssnEin: '123-45-6789', phone: '555-555-5555',
      streetAddress: '123 Main St', cityStateZip: 'Clearwater, FL 33755', signatureDate: '2026-01-02',
    }];
    d.preparer = {
      name: 'Sample Preparer', ssnEin: '987-65-4321', phone: '555-555-5556',
      streetAddress: '123 Main St', cityStateZip: 'Clearwater, FL 33755', signatureDate: '2026-01-02',
    };
    d.attorney = {
      name: 'Sample Attorney', barNumber: '123456', phone: '555-555-5557',
      streetAddress: '123 Main St', cityStateZip: 'Clearwater, FL 33755',
      signatureDate: '2026-01-02', filingDate: '2026-01-02',
    };
    d.serviceRecipients = [{ name: 'Sample Recipient', address: '123 Main St', cityStateZip: 'Clearwater, FL 33755' }];
    d.serviceAttorney = {
      name: 'Sample Attorney', barNumber: '123456', phone: '555-555-5557',
      streetAddress: '123 Main St', cityStateZip: 'Clearwater, FL 33755', signatureDate: '2026-01-02',
    };
    (window as any).autoSave();
  });
  await page.evaluate(() => (window as any).flushPendingSave());
}

/**
 * Simplified Accounting has its own dedicated creation flow --
 * showAddWardModalForType('simplified') redirects straight to the
 * eligibility modal instead of the generic Add Ward modal (index.html's
 * doConfirmSimplifiedEligibility() then creates a 'simplified' ward if both
 * answers are 'Yes', or falls back to a plain 'annual' ward otherwise), so
 * createWard() above can't be used for this type. Always answers both
 * eligibility questions 'Yes' so the resulting ward is genuinely Simplified.
 */
export async function createSimplifiedWard(page: Page, name: string): Promise<void> {
  await page.evaluate(() => (window as any).showAddWardModalForType('simplified'));
  await page.locator('#simplifiedEligibilityModal.show').waitFor({ state: 'visible' });
  await page.fill('#elig-ward-name', name);
  await page.selectOption('#elig-depository', 'Yes');
  await page.selectOption('#elig-only-transactions', 'Yes');
  await page.click('#simplifiedEligibilityModal button[onclick="doConfirmSimplifiedEligibility()"]');
  await page.locator('#simplifiedEligibilityModal').waitFor({ state: 'hidden' });
}

/**
 * Fills every field validateSimplified() (src/features/simplified-
 * accounting/index.js) requires for a Simplified Accounting ward, directly
 * on window.D via evaluate -- same reasoning as fillMinimalValidGuardianWard.
 */
export async function fillMinimalValidSimplifiedWard(page: Page): Promise<void> {
  await page.evaluate(() => {
    const d = (window as any).D;
    Object.assign(d, {
      wardName: d.wardName || 'Simplified Export Test Ward',
      caseNumber: '2026-CP-000456',
      ssn: '123-45-6789',
      gid: '2026-01-01',
      periodFrom: '2026-01-01',
      periodTo: '2026-12-31',
      guardian: 'Sample Guardian',
      attorney: 'Sample Attorney',
      typeOfGuardianship: 'Plenary',
      county: 'Pinellas',
      amendedForm: 'No',
      eligDepository: 'Yes',
      eligOnlyTransactions: 'Yes',
      startingBalance: '1000',
      interestIncome: '10',
      depositsSettlement: '0',
      serviceCharges: '5',
      federalIncomeTax: '0',
      attorney_barNumber: '123456',
      attorney_phone: '555-555-5557',
      attorney_street: '123 Main St',
      attorney_cityStateZip: 'Clearwater, FL 33755',
      certServiceDate: '2026-01-02',
      certIndicator: 'Mailed',
    });
    d.guardians = [{
      name: 'Sample Guardian', ssn: '123-45-6789', phone: '555-555-5555', email: 'guardian@example.com',
      mailingStreet: '123 Main St', mailingCityStateZip: 'Clearwater, FL 33755',
      residenceStreet: '123 Main St', residenceCityStateZip: 'Clearwater, FL 33755',
      signatureDate: '2026-01-02',
    }];
    d.certRecipients = [
      { name: 'Recipient One', line2: '', line3: '' },
      { name: '', line2: '', line3: '' },
      { name: 'Recipient Three', line2: '', line3: '' },
      { name: '', line2: '', line3: '' },
    ];
    (window as any).autoSave();
  });
  await page.evaluate(() => (window as any).flushPendingSave());
}

/**
 * Plan Simplified has no eligibility redirect like Simplified Accounting --
 * showAddWardModalForType('planSimplified') goes straight to the generic
 * Add Ward modal (confirmed by reading that function: only 'simplified' is
 * special-cased), so the existing createWard() helper above works unchanged
 * for this type; no dedicated creation helper is needed.
 *
 * Fills every field validatePlanSimplified()
 * (src/features/plan-simplified/index.js) requires, directly on window.D --
 * same reasoning as the other fillMinimalValid* helpers. q7/q9 are answered
 * 'No' and q8 is answered via the NONE box, so no conditional explanation
 * fields are required on top of the base set.
 */
export async function fillMinimalValidPlanSimplifiedWard(page: Page): Promise<void> {
  await page.evaluate(() => {
    const d = (window as any).D;
    Object.assign(d, {
      wardName: d.wardName || 'Plan Simplified Export Test Ward',
      caseNumber: '2026-CP-000789',
      county: 'Pinellas',
      periodFrom: '2026-01-01',
      periodTo: '2026-12-31',
      q1Residences: '123 Main St, Clearwater, FL 33755 (all year)',
      q2BestPlacement: 'Familiar setting close to family and medical providers.',
      q3MedicalTreatment: 'Annual check-up with Dr. Alvarez in March.',
      q4Diagnosis: 'Stable; continues to require assistance with daily decisions.',
      q5SocialServices: 'Weekly day program and family visits.',
      q6Interaction: 'Regular positive contact with guardian and family.',
      q7RestoreRights: 'No',
      q8DNR: false, q8LivingWill: false, q8Surrogate: false, q8POA: false, q8Other: false, q8None: true,
      q9Remuneration: 'No',
    });
    d.planGuardians = [
      { name: 'Sample Guardian', signatureDate: '2026-01-02', email: 'guardian@example.com', phone: '555-555-5555', mailingAddress: '123 Main St, Clearwater, FL 33755' },
      { name: '', signatureDate: '', email: '', phone: '', mailingAddress: '' },
    ];
    (window as any).autoSave();
  });
  await page.evaluate(() => (window as any).flushPendingSave());
}

/**
 * Plan Annual has no eligibility redirect either -- same confirmation as
 * Plan Simplified, createWard() above works unchanged for this type.
 *
 * Fills every field validatePlanAnnual() (src/features/plan-annual/index.js)
 * requires, directly on window.D. Answers every window.PLAN_RIGHTS/
 * window.PLAN_ADLS key generically (reading the live constant rather than
 * hardcoding its 12/16 keys, so this doesn't silently go stale if the form
 * changes) rather than enumerating them here. Populates one row each in the
 * three repeating tables (residences, providers, directives) so the
 * extracted row-CRUD path (addPlanRow/removePlanRow/duplicatePlanRow) is
 * actually exercised, not just flat fields.
 */
export async function fillMinimalValidPlanAnnualWard(page: Page): Promise<void> {
  await page.evaluate(() => {
    const d = (window as any).D;
    const rights: Record<string, string> = {};
    for (const [k] of (window as any).PLAN_RIGHTS) rights[k] = 'Not removed';
    const adls: Record<string, string> = {};
    for (const [k] of (window as any).PLAN_ADLS) adls[k] = 'Ward needs no help';
    Object.assign(d, {
      wardName: d.wardName || 'Plan Annual Export Test Ward',
      caseNumber: '2026-CP-000321',
      county: 'Pinellas',
      gid: '2025-01-01',
      periodFrom: '2026-01-01',
      periodTo: '2026-12-31',
      guardian: 'Sample Guardian',
      wardLiving: 'In a facility (skilled nursing, assisted living, etc.)',
      residenceAddress: '123 Main St',
      residenceCityStateZip: 'Clearwater, FL 33755',
      q1Residences: [{ name: 'Sample Facility', street: '123 Main St', cityStateZip: 'Clearwater, FL 33755', phone: '555-555-5555', facilityType: 'Assisted Living', from: '2026-01-01', to: '' }],
      q2NoMove: true,
      q3SettingALF: true,
      q4Providers: [{ name: 'Dr. Sample Provider', street: '', cityStateZip: '', phone: '', providerType: 'Primary Care Physician', visits: '4' }],
      q5SocialSkills: 'Communicates well and enjoys group activities.',
      q5Activities: 'Weekly physical therapy; effective at maintaining mobility.',
      rights,
      adls,
      q9MentalNone: true,
      q9PhysNone: true,
      q10NoDirectives: false,
      q10Executed: true,
      q10ExecDNR: true,
      q10Directives: [{ title: 'Do Not Resuscitate Order', dateSigned: '2025-06-01', signedBy: 'Sample Guardian', agents: '', alternates: '', relationship: '', contact: '', courtRevoked: 'No', orderDate: '', orderCounty: '' }],
      q11NoRemuneration: true,
      q11NoRemunerationName: 'Sample Guardian',
      certPhysicianAttached: true,
    });
    d.planGuardians = [
      { name: 'Sample Guardian', ssn: '123-45-6789', phone: '555-555-5555', email: 'guardian@example.com', signatureDate: '2026-01-02', mailingStreet: '123 Main St', mailingCityStateZip: 'Clearwater, FL 33755', officeStreet: '', officeCityStateZip: '', relationship: 'Professional Guardian' },
      { name: '', ssn: '', phone: '', email: '', signatureDate: '', mailingStreet: '', mailingCityStateZip: '', officeStreet: '', officeCityStateZip: '', relationship: '' },
      { name: '', ssn: '', phone: '', email: '', signatureDate: '', mailingStreet: '', mailingCityStateZip: '', officeStreet: '', officeCityStateZip: '', relationship: '' },
    ];
    (window as any).autoSave();
  });
  await page.evaluate(() => (window as any).flushPendingSave());
}

export async function fillMinimalValidPlanMinorWard(page: Page): Promise<void> {
  await page.evaluate(() => {
    const d = (window as any).D;
    Object.assign(d, {
      wardName: d.wardName || 'Plan Minor Export Test Ward',
      county: 'Pinellas',
      periodFrom: '2026-01-01',
      periodTo: '2026-12-31',
      guardianName: 'Sample Guardian',
      q1ResidenceName: 'Sample Residence',
      q1Street: '123 Main St',
      q1City: 'Clearwater',
      q1State: 'FL',
      q1Zip: '33755',
      q3Providers: [{ first: 'Sample', mi: '', last: 'Provider', street: '', city: '', state: '', zip: '', phone: '', providerType: 'Primary Care Physician', visits: '4' }],
      q4Primary: true,
      q5SchoolProgress: 'Progressing well in all subjects.',
      q5SocialDevelopment: 'Age-appropriate social development.',
      q5Communicates: 'Communicates clearly with peers and adults.',
      q5Interpersonal: 'Maintains healthy relationships with family and friends.',
      q5NoUnmetNeeds: true,
      certConsulted: true,
      preparer_name: 'Sample Preparer',
      attorney_name: 'Sample Attorney',
      attorney_signatureDate: '2026-01-12',
    });
    d.planGuardians = [
      { name: 'Sample Guardian', tin: '123-45-6789', phone: '555-555-5555', mailingStreet: '123 Main St', mailingCityStateZip: 'Clearwater, FL 33755', relationship: 'Parent', email: 'guardian@example.com', signatureDate: '2026-01-11' },
      { name: '', tin: '', phone: '', mailingStreet: '', mailingCityStateZip: '', relationship: '', email: '', signatureDate: '' },
    ];
    (window as any).autoSave();
  });
  await page.evaluate(() => (window as any).flushPendingSave());
}

export async function fillMinimalValidPlanInitialWard(page: Page): Promise<void> {
  await page.evaluate(() => {
    const d = (window as any).D;
    const adls: Record<string, string> = {};
    for (const [k] of (window as any).INITIAL_ADLS) adls[k] = 'Ward needs no help';
    Object.assign(d, {
      wardName: d.wardName || 'Plan Initial Export Test Ward',
      caseNumber: '2026-CP-000654',
      county: 'Pinellas',
      inceptionDate: '2026-01-05',
      lettersSignedDate: '2026-01-06',
      guardianNames: 'Sample Guardian',
      wardLiving: 'In a facility (Skilled Nursing, Assisted Living, etc.)',
      residenceAddress: '123 Main St',
      residenceCityStateZip: 'Clearwater, FL 33755',
      q2Setting: 'Assisted Living (ALF)',
      q3MedPrimary: true,
      q4Mental: 'Routine examination by Psychiatrist/Psychologist',
      q5Personal: 'Care Facility',
      q6CareFacility: true,
      q9Providers: [{ name: 'Dr. Sample Provider', providerType: 'Primary Care Physician', examDate: '2026-01-10', street: '', cityStateZip: '', phone: '' }],
      adls,
      mentalDementia: true,
      physMobility: true,
      usesNone: true,
      needsNone: true,
      q11NoDirectives: false,
      q11Executed: true,
      q11ExecDNR: true,
      q11Directives: [{ title: 'Do Not Resuscitate Order', dateSigned: '2025-06-01', signedBy: 'Sample Guardian', agents: '', alternates: '', relationship: '', contact: '', courtRevoked: 'No', orderDate: '', orderCounty: '' }],
      committeeIncorporated: 'Yes',
      certConsulted: true,
      attorney_name: 'Sample Attorney',
      attorney_signatureDate: '2026-01-12',
    });
    d.planGuardians = [
      { name: 'Sample Guardian', ssn: '123-45-6789', street: '123 Main St', phone: '555-555-5555', cityStateZip: 'Clearwater, FL 33755', signatureDate: '2026-01-11', relationship: 'Parent' },
      { name: '', ssn: '', street: '', phone: '', cityStateZip: '', signatureDate: '', relationship: '' },
      { name: '', ssn: '', street: '', phone: '', cityStateZip: '', signatureDate: '', relationship: '' },
      { name: '', ssn: '', street: '', phone: '', cityStateZip: '', signatureDate: '', relationship: '' },
    ];
    (window as any).autoSave();
  });
  await page.evaluate(() => (window as any).flushPendingSave());
}

/**
 * Covers every field validateAnnual() requires. Also works unchanged for
 * finalAccounting/trustAccounting wards (formEngine() aliases -- same data
 * shape, same validator). No schedule rows are required by validateAnnual()
 * itself (rows are only checked for completeness if they have any data), so
 * one populated Schedule A row is added to exercise duplicateAnnualRow/the
 * row-add path, matching the pattern used for the other Excel-capable type
 * (Simplified Accounting).
 */
export async function fillMinimalValidAnnualWard(page: Page): Promise<void> {
  await page.evaluate(() => {
    const d = (window as any).D;
    Object.assign(d, {
      wardName: d.wardName || 'Annual Export Test Ward',
      caseNumber: '2026-CP-000789',
      guardian: 'Sample Guardian',
      periodFrom: '2026-01-01',
      periodTo: '2026-12-31',
      gid: '2025-01-01',
      county: 'Pinellas',
      filingType: 'Annual',
      startingBalance: '10000',
      bondAmount: '5000',
      bondingCompany: 'Sample Bonding Co.',
      certDate: '2026-12-31',
      schA: [{ payer: 'Social Security', description: 'Monthly benefit', bank: 'Sample Bank', accountNo: '1234', amount: '500' }],
      // Line 20 (starting balance + income - disbursements) won't equal
      // Line 30 (sum of Schedule D listings) unless the D schedules are
      // populated to match -- simpler to provide the required written
      // explanation for the (realistic) discrepancy than to hand-balance
      // every schedule.
      reconcileExplanation: 'Test fixture: Schedule D listings intentionally left blank.',
    });
    d.guardians[0] = { ...d.guardians[0], name: 'Sample Guardian', ssn: '123-45-6789', phone: '555-555-5555', email: 'guardian@example.com', mailingStreet: '123 Main St', mailingCityStateZip: 'Clearwater, FL 33755', signatureDate: '2026-12-30' };
    d.preparer = { name: 'Sample Preparer', ssn: '123-45-6789', phone: '555-555-5555', street: '123 Main St', cityStateZip: 'Clearwater, FL 33755', signatureDate: '2026-12-30' };
    Object.assign(d, {
      attorney_bar: '123456',
      attorney_phone: '555-555-5555',
      attorney_street: '123 Main St',
      attorney_cityStateZip: 'Clearwater, FL 33755',
      attorney_signatureDate: '2026-12-30',
    });
    d.certRecipients[0] = { ...d.certRecipients[0], name: 'Sample Recipient' };
    (window as any).autoSave();
  });
  await page.evaluate(() => (window as any).flushPendingSave());
}
