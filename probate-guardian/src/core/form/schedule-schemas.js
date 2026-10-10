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
import { emptyRecipient } from '../filing/recipient-shape.js';

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
      // Milestone 74P: "Residence / office address same as mailing address".
      officeSameAsMailing: false,
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
    // Milestone 73O part 2: a name and four address lines (recipient-shape.js).
    factory: () => emptyRecipient(),
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
  // Milestone 75E (decision 75E-1): each Annual schedule's label names its
  // own schedule, pinned to the screen's heading by
  // tests/unit/schedule-labels.spec.js. Ten named the wrong one (B-1/B-2
  // swapped, B-3, D-2 to D-5 shifted, F-1, F-2) or none of its heading's
  // words (D-1); nothing showed them -- the Remove question says "this entry"
  // for a schedule.
  schA: {
    factory: () => ({ payer: '', description: '', bank: '', accountNo: '', amount: '' }),
    label: 'Schedule A Income Entry',
    floor: 0,
    max: Infinity,
  },
  schB1: {
    factory: () => ({ bankAcct: '', checkNo: '', periodFrom: '', periodTo: '', datePaid: '', payee: '', courtOrderDate: '', amount: '' }),
    label: 'Schedule B-1 Attorney Fee',
    floor: 0,
    max: Infinity,
  },
  schB2: {
    factory: () => ({ bankAcct: '', checkNo: '', periodFrom: '', periodTo: '', datePaid: '', payee: '', courtOrderDate: '', amount: '' }),
    label: 'Schedule B-2 Guardian Fee',
    floor: 0,
    max: Infinity,
  },
  schB3: {
    factory: () => ({ bankAcct: '', checkNo: '', periodFrom: '', periodTo: '', datePaid: '', payee: '', courtOrderDate: '', amount: '' }),
    label: 'Schedule B-3 Other Court-Ordered Disbursement',
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
  // Milestone 73B: "Restricted?", "Personal Residence?" and "Income
  // Property?" start unanswered (AGENTS.md section 4), as the data model
  // always said; they used to arrive answered No.
  schD1: {
    factory: () => ({ description: '', accountNo: '', restricted: '', type: '', fullAmount: '', wardPct: '', restrictedAmt: '' }),
    label: 'Schedule D-1 Cash Asset',
    floor: 0,
    max: Infinity,
  },
  schD2: {
    factory: () => ({ description: '', residence: '', income: '', fullValue: '', wardPct: '', carryingValue: '', wardValue: '' }),
    label: 'Schedule D-2 Real Estate Entry',
    floor: 0,
    max: Infinity,
  },
  schD3: {
    factory: () => ({ description: '', fullAmount: '', wardPct: '', carryingValue: '', wardAmount: '' }),
    label: 'Schedule D-3 Personal Property Entry',
    floor: 0,
    max: Infinity,
  },
  schD4: {
    factory: () => ({ description: '', restricted: '', fullAmount: '', wardPct: '', carryingValue: '', wardValue: '', restrictedAmt: '' }),
    label: 'Schedule D-4 Intangible Asset Entry',
    floor: 0,
    max: Infinity,
  },
  schD5: {
    factory: () => ({ description: '', loanNo: '', loanType: '', fullDebt: '', wardPct: '', wardBalance: '' }),
    label: 'Schedule D-5 Mortgage / Loan / Liability Entry',
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
    label: 'Schedule F-1 Sale of Real Property',
    floor: 0,
    max: Infinity,
  },
  schF2: {
    factory: () => ({ description: '', bank: '', accountNo: '', courtOrderDate: '', salePrice: '' }),
    label: 'Schedule F-2 Sale of Personal Property',
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
