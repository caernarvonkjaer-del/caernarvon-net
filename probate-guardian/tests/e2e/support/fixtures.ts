// What a complete filing of each type actually contains, as data.
//
// Milestone 57A follow-up. This used to exist only as behaviour, inside
// target.ts's fillMinimalValid*Ward() helpers, which reach into window.D and
// mutate it. That made it unreachable for the PDF specs, which never create a
// ward at all -- they hand an object literal straight to a model builder. So
// those specs wrote their own idea of a complete filing, and it drifted: 57A
// added a required bond-waiver answer and the literals kept describing a
// filing that no longer existed, with every assertion still green.
//
// Declaring it as plain data instead gives both sides one source. The helpers
// apply it to window.D; the PDF specs spread it under their own overrides.
// When the court requires a new field, it is added here once and both follow.
//
// These are OVERLAYS, not whole filings: each is merged over the app's own
// initializeEmptyData(type), which is where every real filing starts and which
// guarantees the collections the validators index into without guarding. Merge
// with mergeFixture() below (installed in the page as window.__pgMergeFixture)
// so a row like guardians[0] is merged into the base row rather than replacing
// it and dropping keys the base defined.
//
// Nothing here is guesswork: each field is one the filing type's own validator
// requires, and fixture-completeness.ts asserts that by running the real
// export boundary over the result. If a field below stops being required, or a
// new one starts, that assertion fails rather than this file going quietly
// stale.

/** Applied over initializeEmptyData('guardian'). Mirrors validateGuardian(). */
export const MINIMAL_VALID_GUARDIAN = {
  wardName: 'Export Test Ward',
  caseNumber: '2026-CP-000123',
  gid: '2026-01-01',
  county: 'Pinellas',
  guardianName: 'Sample Guardian',
  attorneyForGuardian: 'Sample Attorney',
  typeOfGuardianship: 'Plenary',
  hasSafeDepositBox: false,
  safeDepositBoxFiled: false,
  bondAmount: '1000',
  bondPeriodFrom: '2026-01-01',
  bondPeriodTo: '2027-01-01',
  bondingCompany: 'Sample Bonding Co',
  // Milestone 57A added a required Yes/No for the bond waiver. A filing this
  // fixture describes is meant to be export-ready, so it answers it; 'No'
  // needs no order date.
  bondWaived: 'No',
  serviceDate: '2026-01-02',
  scheduleNoItems: {
    a1: true, a2: true, b1: true, b2: true, b3: true, b4: true,
    c1: true, c2: true, c3: true, c4: true, c5: true,
  },
  guardians: [{
    name: 'Sample Guardian', ssnEin: '123-45-6789', phone: '555-555-5555',
    streetAddress: '123 Main St', cityStateZip: 'Clearwater, FL 33755', signatureDate: '2026-01-02',
  }],
  preparer: {
    name: 'Sample Preparer', ssnEin: '987-65-4321', phone: '555-555-5556',
    streetAddress: '123 Main St', cityStateZip: 'Clearwater, FL 33755', signatureDate: '2026-01-02',
  },
  attorney: {
    name: 'Sample Attorney', barNumber: '123456', phone: '555-555-5557',
    streetAddress: '123 Main St', cityStateZip: 'Clearwater, FL 33755',
    signatureDate: '2026-01-02', filingDate: '2026-01-02',
  },
  serviceRecipients: [{ name: 'Sample Recipient', address: '123 Main St', cityStateZip: 'Clearwater, FL 33755' }],
  serviceAttorney: {
    name: 'Sample Attorney', barNumber: '123456', phone: '555-555-5557',
    streetAddress: '123 Main St', cityStateZip: 'Clearwater, FL 33755', signatureDate: '2026-01-02',
  },
} as const;

/** Applied over initializeEmptyData('annual'). Mirrors validateAnnual(). */
export const MINIMAL_VALID_ANNUAL = {
  wardName: 'Annual Export Test Ward',
  caseNumber: '2026-CP-000789',
  guardian: 'Sample Guardian',
  periodFrom: '2026-01-01',
  periodTo: '2026-12-31',
  gid: '2025-01-01',
  county: 'Pinellas',
  amendedForm: 'No',
  startingBalance: '10000',
  bondAmount: '5000',
  bondingCompany: 'Sample Bonding Co.',
  // Milestone 57A added a required Yes/No for the restricted depository.
  // 'No' needs no receipt date.
  restrictedDepository: 'No',
  certDate: '2026-12-31',
  schA: [{ payer: 'Social Security', description: 'Monthly benefit', bank: 'Sample Bank', accountNo: '1234', amount: '500' }],
  // Line 20 (starting balance + income - disbursements) will not equal Line 30
  // (sum of Schedule D listings) unless the D schedules are populated to
  // match. Providing the written explanation the form asks for is both
  // simpler and more realistic than hand-balancing every schedule -- but a
  // fixture that overrides the schedules with its own figures inherits this
  // sentence, so it should say something true of its own numbers.
  reconcileExplanation: 'Test fixture: Schedule D listings intentionally left blank.',
  trusts: [{ hasTrust: 'No', createdAfterGID: '' }],
  guardians: [{
    name: 'Sample Guardian', ssn: '123-45-6789', phone: '555-555-5555',
    email: 'guardian@example.com', mailingStreet: '123 Main St',
    mailingCityStateZip: 'Clearwater, FL 33755', signatureDate: '2027-01-05',
  }],
  preparer: {
    name: 'Sample Preparer', ssn: '123-45-6789', phone: '555-555-5555',
    street: '123 Main St', cityStateZip: 'Clearwater, FL 33755', signatureDate: '2027-01-05',
  },
  // Milestone 39-C: `attorney` (the attorney's own printed name) has no
  // independent requirement in validateAnnual(), but checkSignatureState()
  // infers the legacy attorney_signatureDate as a typed signature and then
  // correctly requires a printed name to go with it.
  attorney: 'Sample Attorney',
  attorney_bar: '123456',
  attorney_phone: '555-555-5555',
  attorney_email: 'attorney@example.com', // Milestone 55D: now required
  attorney_street: '123 Main St',
  attorney_cityStateZip: 'Clearwater, FL 33755',
  attorney_signatureDate: '2027-01-05',
  certRecipients: [{ name: 'Sample Recipient' }],
} as const;

/** Applied over initializeEmptyData('simplified'). Mirrors validateSimplified(). */
export const MINIMAL_VALID_SIMPLIFIED = {
  wardName: 'Simplified Export Test Ward',
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
  attorney_email: 'attorney@example.com', // Milestone 55D: now required
  attorney_street: '123 Main St',
  attorney_cityStateZip: 'Clearwater, FL 33755',
  certServiceDate: '2027-01-05',
  certIndicator: 'Mailed',
  guardians: [{
    name: 'Sample Guardian', ssn: '123-45-6789', phone: '555-555-5555', email: 'guardian@example.com',
    mailingStreet: '123 Main St', mailingCityStateZip: 'Clearwater, FL 33755',
    residenceStreet: '123 Main St', residenceCityStateZip: 'Clearwater, FL 33755',
    signatureDate: '2027-01-05',
  }],
  certRecipients: [
    { name: 'Recipient One', line2: '', line3: '' },
    { name: '', line2: '', line3: '' },
    { name: 'Recipient Three', line2: '', line3: '' },
    { name: '', line2: '', line3: '' },
  ],
} as const;

/**
 * Applied over initializeEmptyData('planAnnual'). Mirrors validatePlanAnnual().
 *
 * Incomplete on its own: the per-right and per-ADL answers are missing,
 * because those lists are the app's (window.PLAN_RIGHTS / PLAN_ADLS) and a
 * static copy of them here would go stale the moment a right is added. Apply
 * __pgPlanDefaults() alongside this overlay, which derives them from whatever
 * the app currently defines.
 */
export const MINIMAL_VALID_PLAN_ANNUAL = {
  wardName: 'Plan Annual Export Test Ward',
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
  q9MentalNone: true,
  q9PhysNone: true,
  q10NoDirectives: false,
  q10Executed: true,
  q10ExecDNR: true,
  q10Directives: [{ title: 'Do Not Resuscitate Order', dateSigned: '2025-06-01', signedBy: 'Sample Guardian', agents: '', alternates: '', relationship: '', contact: '', courtRevoked: 'No', orderDate: '', orderCounty: '' }],
  q11NoRemuneration: true,
  q11NoRemunerationName: 'Sample Guardian',
  certPhysicianAttached: true,
  planGuardians: [
    { name: 'Sample Guardian', ssn: '123-45-6789', phone: '555-555-5555', email: 'guardian@example.com', signatureDate: '2027-01-05', mailingStreet: '123 Main St', mailingCityStateZip: 'Clearwater, FL 33755', officeStreet: '', officeCityStateZip: '', relationship: 'Professional Guardian' },
    { name: '', ssn: '', phone: '', email: '', signatureDate: '', mailingStreet: '', mailingCityStateZip: '', officeStreet: '', officeCityStateZip: '', relationship: '' },
    { name: '', ssn: '', phone: '', email: '', signatureDate: '', mailingStreet: '', mailingCityStateZip: '', officeStreet: '', officeCityStateZip: '', relationship: '' },
  ],
} as const;

export const MINIMAL_VALID: Record<string, Record<string, unknown>> = {
  guardian: MINIMAL_VALID_GUARDIAN,
  annual: MINIMAL_VALID_ANNUAL,
  finalAccounting: MINIMAL_VALID_ANNUAL,
  trustAccounting: MINIMAL_VALID_ANNUAL,
  simplified: MINIMAL_VALID_SIMPLIFIED,
  planAnnual: MINIMAL_VALID_PLAN_ANNUAL,
};
