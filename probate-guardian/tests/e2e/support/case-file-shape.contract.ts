// Compile-time static type contract testing for canonical CaseFile and WardRecord shapes.
// Validated via `npm run check:types` (tsc --noEmit).

import type { CaseFile, WardRecord } from '../../../src/core/types/case-file.js';
import type { Party, SharedCase } from '../../../src/core/types/parties.js';

// ---------------------------------------------------------------------------
// POSITIVE TYPE CONTRACTS: valid shape definitions
// ---------------------------------------------------------------------------

export const validParty: Party = {
  id: 'party-001',
  roles: ['guardian'],
  name: 'Jane Doe',
  identifiers: { taxId: null, barNumber: null },
  phone: '555-0199',
  email: 'jane@example.com',
  secondaryEmail: null,
  address: { street: '123 Main St', cityStateZip: 'Orlando, FL 32801' },
  officeAddress: null,
  mailingAddress: null,
  county: 'Orange',
  notes: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  mergedInto: null,
  mergeRecord: null,
};

export const validSharedCase: SharedCase = {
  id: 'case-001',
  caseNumber: '2026-GA-0001',
  county: 'Orange',
  wardPartyId: 'party-001',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

export const validWardRecord: WardRecord = {
  wardId: 'ward-001',
  wardName: 'John Doe',
  inventoryType: 'annual',
  years: ['2025', '2026'],
  activeYear: '2026',
  data: {},
  file: 'wards/ward-001.enc',
  notes: 'Sample note',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  locked: false,
};

export const validCaseFile: CaseFile = {
  activeWardId: 'ward-001',
  guardianName: 'Jane Doe',
  guardianEmail: 'jane@example.com',
  parties: [validParty],
  cases: [validSharedCase],
  dismissedPartyPairs: [['party-001', 'party-002']],
  wards: [validWardRecord],
  lastSavedFileName: 'sample.sav',
};

// ---------------------------------------------------------------------------
// NEGATIVE TYPE CONTRACTS: static compile errors enforced via @ts-expect-error
// ---------------------------------------------------------------------------

// 1. Missing required wardId on WardRecord
// @ts-expect-error WardRecord requires property wardId
export const missingWardId: WardRecord = {
  wardName: 'Missing ID Ward',
};

// 2. Non-string wardId on WardRecord
export const invalidWardIdType: WardRecord = {
  // @ts-expect-error wardId must be a string
  wardId: 12345,
};

// 3. Missing required Party properties (id, roles, name, identifiers, address, createdAt, updatedAt)
// @ts-expect-error Party requires id, roles, name, identifiers, address, createdAt, updatedAt
export const missingPartyRequiredProps: Party = {
  name: 'Incomplete Party',
};

// 4. Invalid guardianName type on CaseFile (must be string)
export const invalidGuardianNameType: CaseFile = {
  activeWardId: null,
  // @ts-expect-error guardianName must be a string
  guardianName: 99999,
  guardianEmail: 'test@example.com',
  parties: [],
  cases: [],
  dismissedPartyPairs: [],
  wards: [],
};

// 5. Malformed dismissedPartyPairs tuple (must be Array<[string, string]>)
export const invalidDismissedPartyPairs: CaseFile = {
  activeWardId: null,
  guardianName: 'Jane Doe',
  guardianEmail: 'jane@example.com',
  parties: [],
  cases: [],
  // @ts-expect-error dismissedPartyPairs elements must be [string, string] tuples
  dismissedPartyPairs: [['only-one-item']],
  wards: [],
};
