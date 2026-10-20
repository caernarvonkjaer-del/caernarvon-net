// Milestone 76F: which of a filing's years is the latest, and where its case
// and ward links live.
//
// A filing keeps one year's data at its top level (the open year) and the
// others in `years[]` (filing-years.js). Every field that isn't one of
// WARD_SYSTEM_KEYS belongs to a year -- and the case link (`caseId`) and the
// ward's shared-record link (`wardPartyId`) used to be among them. Linked in
// Year 2, they were missing in Year 1: opening Year 1 took the filing out of
// its case group, setting its county created a second ward record for the
// same person, and a New Filing from Existing made from it created a second
// case. Decision 76F-2 (the requester's): the case link and the ward link
// belong to the filing; the guardian, attorney and preparer links stay with
// each year's rows (a successor guardian is normal), and merges reach every
// year. A link an older year held that differs from the filing's -- a change
// of venue -- is kept on that year and shown, never silently overwritten.
//
// And decision 76F-1: a new year follows the latest year, whichever is open;
// decision 76F-4: an older year opened for correction behaves like a closed
// filing (its edits don't reach the shared records).

import { mergeInventoryYearOneDocs } from './doc-period.js';

/** The links that belong to the filing, not to a year. */
export const FILING_LINK_KEYS = Object.freeze(['caseId', 'wardPartyId']);
/** Where an older year keeps a link that differs from the filing's. */
export const YEAR_LINK_KEYS = Object.freeze({ caseId: 'yearCaseId', wardPartyId: 'yearWardPartyId' });

const yearNumber = (key) => {
  const m = /^Year (\d+)$/.exec(String(key || ''));
  return m ? Number(m[1]) : 0;
};

/**
 * The latest year's key -- the highest "Year N" the filing has, open or
 * archived -- or null for a filing that has never started a new year.
 * @param {any} ward
 */
export function latestYearKey(ward) {
  if (!ward || !ward.activeYearKey) return null;
  const keys = [ward.activeYearKey, ...(Array.isArray(ward.years) ? ward.years.map((y) => y && y.key) : [])];
  return keys.reduce((best, key) => (yearNumber(key) > yearNumber(best) ? key : best), ward.activeYearKey);
}

/** Whether an earlier year than the latest is the one open. */
export function isOlderYearOpen(ward) {
  const latest = latestYearKey(ward);
  return !!latest && latest !== ward.activeYearKey;
}

/**
 * The latest year's data as the filing would hold it open: the filing itself
 * when the latest year is open, else the filing with that year's data laid
 * over it. A read-only view, for what describes "the year a new year follows".
 * @param {any} ward
 */
export function latestYearView(ward) {
  if (!isOlderYearOpen(ward)) return ward;
  const latest = ward.years.find((y) => y && y.key === latestYearKey(ward));
  return latest ? { ...ward, ...latest.data, activeYearKey: latest.key } : ward;
}

/**
 * Moves the case and ward links onto the filing (decision 76F-2). The
 * filing's link is the latest year's -- or, where the latest year has none,
 * the next latest that has one; a year holding a different one keeps it as
 * its own (`yearCaseId`, `yearWardPartyId`), shown in Prior Years. The keys
 * leave every archived year's data so they can't come back with it.
 * Idempotent; returns whether anything changed.
 * @param {any} ward
 */
export function migrateFilingLinks(ward) {
  if (!ward || typeof ward !== 'object' || !Array.isArray(ward.years) || !ward.years.length) return false;
  let changed = false;
  // Every year's data, latest first; the open year's is the filing's top level.
  const open = { key: ward.activeYearKey || null, data: ward, isOpen: true };
  const years = [open, ...ward.years.filter((y) => y && y.data && typeof y.data === 'object')]
    .sort((a, b) => yearNumber(b.key) - yearNumber(a.key));
  for (const key of FILING_LINK_KEYS) {
    // Moved already (or never stored per year): no archived year holds it.
    if (!ward.years.some((y) => y && y.data && Object.prototype.hasOwnProperty.call(y.data, key))) continue;
    const valueOf = (y) => (y.data[key] || null);
    const chosen = years.map(valueOf).find(Boolean) || null;
    for (const y of years) {
      const held = valueOf(y);
      if (held && held !== chosen) { y.data[YEAR_LINK_KEYS[key]] = held; changed = true; }
      if (!y.isOpen) { delete y.data[key]; changed = true; }
    }
    if ((ward[key] || null) !== chosen) { ward[key] = chosen; changed = true; }
  }
  return changed;
}

/**
 * Everything 76F moves when a filing is read: its links (above) and the
 * Inventory's first-year documents (doc-period.js). Idempotent; returns the
 * filing.
 * @param {any} ward
 */
export function migrateFilingYears(ward) {
  if (!ward || typeof ward !== 'object') return ward;
  migrateFilingLinks(ward);
  mergeInventoryYearOneDocs(ward);
  return ward;
}
