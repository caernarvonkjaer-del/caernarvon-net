// Milestone 26's row factories and limits for the Annual family's and the
// Simplified's lists, keyed by list name alone. Moved here unchanged from
// schedule-definitions.js by Milestone 73V so the list rules (collections.js)
// can build on it without an import cycle; schedule-definitions.js re-exports
// it as SCHEDULE_SCHEMAS.
//
// Deprecated as a lookup: the same list differs between forms, so new code
// finds a list's rules by (filing type, list key) through collections.js.
// This object keeps exactly what it held before, for the callers and tests
// that read it.

export const SCHEDULE_SCHEMAS = {
  // Parties & Service
  guardians: {
    factory: () => ({
      name: '',
      ssn: '',
      phone: '',
      email: '',
      mailingStreet: '',
      mailingCityStateZip: '',
      officeStreet: '',
      officeCityStateZip: '',
      signatureDate: '',
      // Milestone 39-C
      signatureState: '',
      signatureImage: '',
      // Milestone 67A: "This person prepared this filing" -- lives on the
      // row so it is removed with the guardian (src/core/form/preparer-flag.js).
      isPreparer: false,
      // Milestone 71B: "This guardian served the copies" -- on the row for
      // the same reason (src/core/filing/unrepresented-filing.js).
      certifiesService: false,
    }),
    label: 'Co-Guardian',
    floor: 1,
    max: 3,
    syncPartyIds: 'guardianPartyIds',
  },
  certRecipients: {
    factory: () => ({ name: '', line2: '', line3: '', line4: '' }),
    label: 'Service Recipient',
    floor: 1,
    max: Infinity,
  },
  remuneration: {
    factory: () => ({ guardian: '', type: '', description: '', amount: '' }),
    label: 'Remuneration Entry',
    floor: 0,
    max: Infinity,
  },

  // Annual Accounting Schedules
  schA: {
    factory: () => ({ payer: '', description: '', bank: '', accountNo: '', amount: '' }),
    label: 'Schedule A Income Entry',
    floor: 0,
    max: Infinity,
  },
  schB1: {
    factory: () => ({ bankAcct: '', checkNo: '', periodFrom: '', periodTo: '', datePaid: '', payee: '', courtOrderDate: '', amount: '' }),
    label: 'Schedule B-1 Guardian Fee',
    floor: 0,
    max: Infinity,
  },
  schB2: {
    factory: () => ({ bankAcct: '', checkNo: '', periodFrom: '', periodTo: '', datePaid: '', payee: '', courtOrderDate: '', amount: '' }),
    label: 'Schedule B-2 Attorney Fee',
    floor: 0,
    max: Infinity,
  },
  schB3: {
    factory: () => ({ bankAcct: '', checkNo: '', periodFrom: '', periodTo: '', datePaid: '', payee: '', courtOrderDate: '', amount: '' }),
    label: 'Schedule B-3 Other Professional Fee',
    floor: 0,
    max: Infinity,
  },
  schB4: {
    factory: () => ({ bankAcct: '', checkNo: '', datePaid: '', payee: '', description: '', category: '', amount: '' }),
    label: 'Schedule B-4 General Disbursement',
    floor: 0,
    max: Infinity,
    categories: [
      'Food / Household', 'Clothing', 'Medical / Dental', 'Medications',
      'Housing / Rent', 'Utilities', 'Transportation', 'Insurance',
      'Taxes', 'Care Facility', 'Personal Allowance', 'Education',
      'Entertainment / Recreation', 'Maintenance / Repairs', 'Bank / Court Fees',
      'Gifts', 'Ward Incidentals', 'Other Disbursements',
    ],
  },
  schC: {
    factory: () => ({ description: '', date: '', gain: '', loss: '' }),
    label: 'Schedule C Capital Transaction',
    floor: 0,
    max: Infinity,
  },
  schD1: {
    factory: () => ({ description: '', accountNo: '', restricted: 'No', type: '', fullAmount: '', wardPct: '', restrictedAmt: '' }),
    label: 'Schedule D-1 Bank Account',
    floor: 0,
    max: Infinity,
  },
  schD2: {
    factory: () => ({ description: '', residence: 'No', income: 'No', fullValue: '', wardPct: '', carryingValue: '', wardValue: '' }),
    label: 'Schedule D-2 Securities Entry',
    floor: 0,
    max: Infinity,
  },
  schD3: {
    factory: () => ({ description: '', fullAmount: '', wardPct: '', carryingValue: '', wardAmount: '' }),
    label: 'Schedule D-3 Real Estate Entry',
    floor: 0,
    max: Infinity,
  },
  schD4: {
    factory: () => ({ description: '', restricted: 'No', fullAmount: '', wardPct: '', carryingValue: '', wardValue: '', restrictedAmt: '' }),
    label: 'Schedule D-4 Personal Property Entry',
    floor: 0,
    max: Infinity,
  },
  schD5: {
    factory: () => ({ description: '', loanNo: '', loanType: '', fullDebt: '', wardPct: '', wardBalance: '' }),
    label: 'Schedule D-5 Other Asset Entry',
    floor: 0,
    max: Infinity,
  },
  schE: {
    factory: () => ({ bankName: '', transferInDate: '', transferInAmt: '', transferOutDate: '', transferOutAmt: '' }),
    label: 'Schedule E Paired Transfer',
    floor: 0,
    max: Infinity,
  },
  schF1: {
    factory: () => ({ description: '', bank: '', accountNo: '', courtOrderDate: '', salePrice: '' }),
    label: 'Schedule F-1 Outstanding Claim',
    floor: 0,
    max: Infinity,
  },
  schF2: {
    factory: () => ({ description: '', bank: '', accountNo: '', courtOrderDate: '', salePrice: '' }),
    label: 'Schedule F-2 Contingent Liability',
    floor: 0,
    max: Infinity,
  },

  // Guardianship Plan Schedules
  planGuardians: {
    factory: () => ({ name: '', signatureDate: '', phone: '', email: '', mailingAddress: '' }),
    label: 'Plan Guardian',
    floor: 1,
    max: 3,
    syncPartyIds: 'guardianPartyIds',
  },
  q2Residences: {
    factory: () => ({ name: '', street: '', city: '', state: '', zip: '', phone: '' }),
    label: 'Plan Residence',
    floor: 0,
    max: Infinity,
  },
  q3Providers: {
    factory: () => ({ first: '', last: '', specialty: '', address: '', phone: '', examDate: '', nextDate: '' }),
    label: 'Plan Medical Provider',
    floor: 0,
    max: Infinity,
  },
};
