// Type definitions for Ward, FilingDescriptor, and FilingType.

/**
 * @typedef {'guardian' | 'simplified' | 'annual' | 'finalAccounting' | 'trustAccounting' | 'planSimplified' | 'planAnnual' | 'planInitial' | 'planMinor'} FilingType
 */

/**
 * @typedef {'inventory' | 'accounting' | 'plan'} FilingFamily
 */

/**
 * @typedef {'guardian' | 'simplified' | 'annual' | 'planSimplified' | 'planAnnual' | 'planInitial' | 'planMinor'} FilingEngineId
 */

/**
 * @typedef {Object} FilingCapabilities
 * @property {boolean} pdf - Whether the filing can generate PDF output.
 * @property {boolean} docx - Whether the filing can generate Word DOCX output.
 * @property {boolean} excel - Whether the filing can generate Excel XLSX output.
 */

/**
 * @typedef {Object} FilingDescriptor
 * @property {string} id - Canonical filing identifier.
 * @property {FilingFamily} family - Filing family classification.
 * @property {FilingEngineId} engineId - Output engine routing ID.
 * @property {FilingType} inventoryType - Form inventory/accounting type key.
 * @property {string} [filingTypeValue] - Value in form field (e.g. 'Annual', 'Final', 'Trust').
 * @property {string} displayName - Human-readable display label.
 * @property {string} [outputName] - Output title for exports.
 * @property {string} documentTitle - Legal document title heading.
 * @property {string} filenameStem - Prefix for downloaded files.
 * @property {FilingCapabilities} capabilities - Supported export formats.
 */

/**
 * @typedef {Object} Ward
 * @property {string} wardId - Unique identifier for the ward.
 * @property {string} [wardName] - Full legal name of the ward.
 * @property {FilingType | string} [inventoryType] - Inventory or accounting filing type key.
 * @property {string[]} [years] - List of recorded filing years.
 * @property {string} [activeYear] - Currently active filing year.
 * @property {Record<string, any>} [data] - Current form field state.
 * @property {string} [caseId] - Foreign key reference to a SharedCase.
 * @property {string} [wardPartyId] - Foreign key reference to a Party with 'ward' role.
 * @property {string} [caseNumber] - Court case number.
 * @property {string} [ucn] - Uniform Case Number (used by planMinor).
 * @property {string} [county] - County of jurisdiction.
 * @property {string} [notes] - Case notes.
 * @property {string} [createdAt] - ISO creation timestamp.
 * @property {string} [updatedAt] - ISO modification timestamp.
 * @property {boolean} [locked] - Lock flag for editing.
 */

export {};
