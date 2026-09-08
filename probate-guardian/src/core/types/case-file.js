// Type definitions for canonical CaseFile, CaseMetadata, and WardRecord.

/**
 * @typedef {Object} WardRecord
 * @property {string} wardId - Unique identifier for the ward/filing.
 * @property {string} [wardName] - Ward display name.
 * @property {string} [inventoryType] - Inventory or accounting filing type key.
 * @property {string[]} [years] - Accounting/plan years present for this ward.
 * @property {string} [activeYear] - Currently selected accounting/plan year.
 * @property {Record<string, any>} [data] - Filing form data object.
 * @property {string} [file] - Relative storage path in .sav archive (e.g. 'wards/ward-1.enc').
 * @property {string} [notes] - Internal case notes.
 * @property {string} [createdAt] - ISO timestamp when the ward was created.
 * @property {string} [updatedAt] - ISO timestamp when the ward was last modified.
 * @property {boolean} [locked] - True if ward is locked against edits.
 */

/**
 * @typedef {Object} CaseMetadata
 * @property {string} format - Archive format identifier ('probate-guardian-case').
 * @property {number} version - Archive format version number.
 * @property {string} exportedAt - ISO timestamp when the archive was exported.
 * @property {string} securityMode - Encryption mode ('plain', 'session', 'password').
 * @property {string | null} [salt] - Base64 salt for key derivation.
 * @property {string | null} [verifier] - Verification ciphertext or digest.
 * @property {{ guardianName?: string, guardianEmail?: string } | string} [guardian] - Guardian info or encrypted ciphertext.
 * @property {any} [appState] - Encrypted or raw app settings blob.
 * @property {string[]} [templates] - Bundled template keys.
 * @property {Array<{ wardId: string, wardName: string, file: string }>} [wards] - Manifest ward index entries.
 */

/**
 * @typedef {Object} CaseFile
 * @property {string | null} activeWardId - Currently active ward ID.
 * @property {string} guardianName - Primary guardian name across the case file.
 * @property {string} guardianEmail - Primary guardian email across the case file.
 * @property {import('./parties.js').Party[]} parties - Master directory of shared parties.
 * @property {import('./parties.js').SharedCase[]} cases - Master directory of linked court matters.
 * @property {Array<[string, string]>} dismissedPartyPairs - Rejected duplicate pairs.
 * @property {WardRecord[]} wards - Array of ward records in this case file.
 * @property {string} [lastSavedFileName] - Last known file name on disk.
 */

export {};
