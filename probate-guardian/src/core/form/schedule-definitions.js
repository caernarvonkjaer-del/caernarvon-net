// Milestone 26: Declarative Schedule & Repeatable Group Definitions
// Centralizes row factories, constraints, party ID lockstep sync, and calculation hooks.

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

/**
 * Adds a new clean row to a collection, respecting max constraint and party synchronization.
 */
export function addCollectionRow(collectionKey, data = (typeof window !== 'undefined' ? window.D : null), factoryOverride = null) {
  if (!data) return false;
  const schema = SCHEDULE_SCHEMAS[collectionKey];
  if (!schema) return false;

  if (!Array.isArray(data[collectionKey])) {
    data[collectionKey] = [];
  }

  if (data[collectionKey].length >= (schema.max || Infinity)) {
    return false;
  }

  const factory = factoryOverride || schema.factory;
  if (typeof factory !== 'function') return false;
  data[collectionKey].push(factory());

  if (schema.syncPartyIds) {
    const partyKey = schema.syncPartyIds;
    if (!Array.isArray(data[partyKey])) {
      data[partyKey] = [];
    }
    data[partyKey].push(null);
  }
  if (typeof window !== 'undefined') window.markFilingRevisionChanged?.('collection-add');

  return true;
}

/**
 * Duplicates a row at index, respecting max constraint and party synchronization.
 * Duplicated rows start with a unlinked (null) party ID to prevent accidental alias collisions.
 */
export function duplicateCollectionRow(collectionKey, index, data = (typeof window !== 'undefined' ? window.D : null)) {
  if (!data) return false;
  const schema = SCHEDULE_SCHEMAS[collectionKey];
  if (!schema) return false;

  const list = data[collectionKey];
  if (!Array.isArray(list) || !list[index]) return false;

  if (list.length >= (schema.max || Infinity)) {
    return false;
  }

  const clone = JSON.parse(JSON.stringify(list[index]));
  list.splice(index + 1, 0, clone);

  if (schema.syncPartyIds) {
    const partyKey = schema.syncPartyIds;
    if (!Array.isArray(data[partyKey])) {
      data[partyKey] = [];
    }
    data[partyKey].splice(index + 1, 0, null);
  }
  if (typeof window !== 'undefined') window.markFilingRevisionChanged?.('collection-duplicate');

  return true;
}

/**
 * Removes a row at index, respecting floor constraint and party synchronization.
 */
export function removeCollectionRow(collectionKey, index, data = (typeof window !== 'undefined' ? window.D : null)) {
  if (!data) return false;
  const schema = SCHEDULE_SCHEMAS[collectionKey];
  if (!schema) return false;

  const list = data[collectionKey];
  if (!Array.isArray(list) || index < 0 || index >= list.length) return false;

  const floor = schema.floor !== undefined ? schema.floor : 0;
  if (list.length <= floor) {
    return false;
  }

  list.splice(index, 1);

  if (schema.syncPartyIds) {
    const partyKey = schema.syncPartyIds;
    if (Array.isArray(data[partyKey])) {
      data[partyKey].splice(index, 1);
    }
  }
  if (typeof window !== 'undefined') window.markFilingRevisionChanged?.('collection-remove');

  return true;
}

if (typeof window !== 'undefined') {
  window.SCHEDULE_SCHEMAS = SCHEDULE_SCHEMAS;
  window.addCollectionRow = addCollectionRow;
  window.duplicateCollectionRow = duplicateCollectionRow;
  window.removeCollectionRow = removeCollectionRow;
}
