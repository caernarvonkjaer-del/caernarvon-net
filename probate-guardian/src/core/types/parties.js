// Type definitions for Party, SharedCase, GuardianEntry, and ServiceRecipient.

/**
 * @typedef {Object} PartyIdentifiers
 * @property {string | null} [taxId] - Tax ID or SSN.
 * @property {string | null} [barNumber] - Florida Bar number (for attorneys).
 */

/**
 * @typedef {Object} PartyAddress
 * @property {string} [street] - Street address line.
 * @property {string} [cityStateZip] - City, State, and Zip code.
 */

/**
 * @typedef {Object} Party
 * @property {string} id - Unique UUID or ID of the party.
 * @property {string[]} roles - Array of assigned roles ('guardian', 'attorney', 'preparer', 'recipient', 'ward').
 * @property {string} name - Legal name of individual or entity.
 * @property {PartyIdentifiers} identifiers - Identification numbers.
 * @property {string | null} [phone] - Contact telephone number.
 * @property {string | null} [email] - Primary contact email.
 * @property {string | null} [secondaryEmail] - Secondary email address.
 * @property {PartyAddress} address - Mailing/residence address.
 * @property {PartyAddress | null} [officeAddress] - Professional office address.
 * @property {string | null} [county] - Milestone 40C-A: canonical Florida county
 *   for a Party with the 'ward' role; null until the first explicit Cover
 *   selection. Later filings for this ward hydrate from it. Meaningless for
 *   non-ward roles, and never derived from an attorney county.
 * @property {string | null} [notes] - Internal notes.
 * @property {string} createdAt - ISO creation timestamp.
 * @property {string} updatedAt - ISO modification timestamp.
 * @property {string | null} [mergedInto] - Tombstone pointer to surviving Party if merged.
 * @property {PartyMergeRecord | null} [mergeRecord] - What the merge changed elsewhere, written on
 *   the merged-away (sub) party so unmergeParty() can reverse it; null otherwise. A tombstone
 *   with mergedInto but no mergeRecord predates undo tracking and cannot be unmerged.
 */

/**
 * @typedef {Object} PartyMergeRecord
 * @property {string} mergedAt - ISO timestamp of the merge.
 * @property {string[]} adoptedFields - Dotted Party paths backfilled onto the primary from this sub.
 * @property {string[]} adoptedRoles - Roles the primary gained from this sub.
 * @property {Array<{ wardId: string, role: string, index: number }>} repointedSlots - Filing FK slots moved from this sub to the primary.
 * @property {string[]} repointedCases - caseFile.cases[].id values whose wardPartyId moved to the primary.
 */

/**
 * @typedef {Object} SharedCase
 * @property {string} id - Unique UUID or ID of the case.
 * @property {string} caseNumber - Court case docket number.
 * @property {string} county - Florida county of jurisdiction.
 * @property {string | null} [wardPartyId] - Foreign key reference to primary ward party.
 * @property {string} createdAt - ISO creation timestamp.
 * @property {string} updatedAt - ISO modification timestamp.
 */

/**
 * @typedef {Object} GuardianEntry
 * @property {string} [name] - Co-guardian name.
 * @property {string} [ssn] - Co-guardian Social Security Number.
 * @property {string} [phone] - Co-guardian telephone number.
 * @property {string} [email] - Co-guardian email address.
 * @property {string} [mailingStreet] - Co-guardian mailing street address.
 * @property {string} [mailingCityStateZip] - Co-guardian mailing city, state, zip.
 * @property {string} [officeStreet] - Professional office street address.
 * @property {string} [officeCityStateZip] - Professional office city, state, zip.
 * @property {string} [residenceStreet] - Residential street address.
 * @property {string} [residenceCityStateZip] - Residential city, state, zip.
 * @property {string} [mailingAddress] - Single-line combined mailing address.
 * @property {string} [signatureDate] - Date signed.
 * @property {string | null} [partyId] - Linked party entity foreign key.
 */

/**
 * @typedef {Object} ServiceRecipient
 * @property {string} [name] - Recipient name.
 * @property {string} [line2] - Address line 2 (e.g. street address).
 * @property {string} [line3] - Address line 3 (e.g. city, state, zip).
 * @property {string} [line4] - Address line 4 or email.
 * @property {string} [address] - Combined address string.
 * @property {string} [serviceMethod] - Method of service (e.g. 'e-portal', 'mail').
 * @property {string} [email] - Service email address.
 * @property {string | null} [partyId] - Linked party entity foreign key.
 */

export {};
