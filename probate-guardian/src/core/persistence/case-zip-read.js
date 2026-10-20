// Milestone 76A: reading an already-parsed .sav into plain values, touching
// nothing else -- its filings, guardian, shared records, preferences,
// templates and Activity Log. Out of case-reader.js's loadCaseFileFromZip(),
// which reads through here and then makes the result the open case; a save
// reads the file through here too, to see what another tab or window saved
// since (case-file.js), without disturbing the case that is open.
import { decryptJSONWithKey, plainPartsRefused } from './crypto.js';
import { migrateFilingYears } from '../filing/year-links.js';
import { migratePlanTriState } from '../filing/plan-tristate.js';
import { blankCaseFile } from '../state.js';

/**
 * `key` may be null in 'none' mode -- decryptJSONWithKey checks for the PLAIN:
 * prefix before ever touching it. Returns the case as read; the app
 * preferences (null when the file has none, or they could not be read); the
 * templates by type; the Activity Log (null when the file has none, or it
 * could not be read); and every part that exists, or that the manifest lists,
 * but could not be read, in the order case-file.js's
 * protectPartiallyReadCaseFile() names them. A part a file simply does not
 * have (an older file with no parties.enc) is not damage and is not listed.
 */
export async function readCaseFileZip(zip, manifest, key) {
  const caseFile = blankCaseFile();
  const unreadable = [];
  // Milestone 76K item 1: a protected file's unprotected part is unreadable.
  const opts = { refusePlain: plainPartsRefused(manifest) };
  const partiesFile = zip.file('parties.enc');
  if (partiesFile) {
    try {
      const parties = await decryptJSONWithKey(await partiesFile.async('string'), key, opts);
      if (Array.isArray(parties)) caseFile.parties = parties;
    } catch (e) { console.warn('Could not read parties from .sav file', e); unreadable.push({ kind: 'parties' }); }
  }
  const casesFile = zip.file('cases.enc');
  if (casesFile) {
    try {
      const cases = await decryptJSONWithKey(await casesFile.async('string'), key, opts);
      if (Array.isArray(cases)) caseFile.cases = cases;
    } catch (e) { console.warn('Could not read cases from .sav file', e); unreadable.push({ kind: 'cases' }); }
  }
  const partyDismissalsFile = zip.file('partyDismissals.enc');
  if (partyDismissalsFile) {
    try {
      const dismissals = await decryptJSONWithKey(await partyDismissalsFile.async('string'), key, opts);
      if (Array.isArray(dismissals)) caseFile.dismissedPartyPairs = dismissals;
    } catch (e) { console.warn('Could not read party dismissals from .sav file', e); unreadable.push({ kind: 'partyDismissals' }); }
  }
  for (const entry of (Array.isArray(manifest.wards) ? manifest.wards : [])) {
    const f = zip.file(entry.file);
    const filing = { kind: 'filing', name: (entry && entry.wardName) || '', file: (entry && entry.file) || '' };
    if (!f) { console.warn('Case file entry missing:', entry.file); unreadable.push(filing); continue; }
    try {
      // Kept as saved (Milestone 76B): text is escaped where it is shown.
      const ward = await decryptJSONWithKey(await f.async('string'), key, opts);
      // Milestone 76F: a filing saved before it read as 76F keeps it -- here,
      // where every read of the file passes, so the save's check against
      // what is on disk (case-merge.js) reads it the same way.
      // Milestone 76K item 6: an older Plan's Yes/No answers stored as
      // true/false too (Milestone 37-5). It ran only on Open Backup and a
      // dropped file, so on a normal open an explicit "No" showed unanswered
      // on the page while the export checks and the PDF read it as "No".
      if (ward && ward.wardId) caseFile.wards.push(migrateFilingYears(migratePlanTriState(ward)));
      else unreadable.push(filing);
    } catch (e) { console.warn('Skipping unreadable ward in .sav file', entry.file, e); unreadable.push(filing); }
  }
  caseFile.lastSavedFileName = null; // stamped fresh by rememberCaseFileHandle() once this file gets a handle
  if (manifest.guardian) {
    try {
      const g = await decryptJSONWithKey(manifest.guardian, key, opts);
      caseFile.guardianName = g.guardianName || '';
      caseFile.guardianEmail = g.guardianEmail || '';
    } catch (e) { console.warn('Could not read guardian info from .sav file', e); unreadable.push({ kind: 'guardian' }); }
  }
  let appState = null;
  if (manifest.appState) {
    try {
      appState = await decryptJSONWithKey(manifest.appState, key, opts);
    } catch (e) { console.warn('Could not read app preferences from .sav file', e); unreadable.push({ kind: 'preferences' }); }
  }
  // A damaged template entry is skipped, as a damaged filing is: exports fall
  // back to the app's own copy of that workbook.
  const templates = {};
  for (const type of (Array.isArray(manifest.templates) ? manifest.templates : [])) {
    const f = zip.file(`templates/${type}.b64`);
    try {
      if (f) templates[type] = await f.async('string');
    } catch (e) { console.warn('Skipping unreadable template in .sav file', type, e); }
  }
  let auditLog = null;
  const auditFile = zip.file('auditLog.enc');
  if (auditFile) {
    try {
      const entries = await decryptJSONWithKey(await auditFile.async('string'), key, opts);
      if (Array.isArray(entries)) auditLog = entries;
    } catch (e) { console.warn('Could not read audit log from .sav file', e); unreadable.push({ kind: 'activity' }); }
  }
  return { caseFile, appState, templates, auditLog, unreadable };
}
