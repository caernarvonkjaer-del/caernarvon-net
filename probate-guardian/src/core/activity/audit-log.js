// Milestone 70, 70I: the Activity Log's entries -- every unlock, backup,
// restore and import -- held in memory here and saved inside the case file
// (case-file.js encrypts the whole log into auditLog.enc). Moved from
// legacy-app.js, which held them as _auditLogEntries.
import { getCaseFile } from '../state.js';

let _auditLogEntries = []; // {id, timestamp, eventType, details, success, wardId?}
let _auditLogNextId = 1;

export async function auditLog(eventType, details, success = true, wardId = null) {
  // Recorded in the in-memory _auditLogEntries used for .sav packaging and the
  // in-app activity viewer. This used to try a Tauri `audit_log` command first
  // and fall back to here; that branch could never run in either shipped build.
  try {
    const entry = {timestamp: new Date().toISOString(), eventType, details, success};
    if (wardId) entry.wardId = wardId;
    await appendAuditLogEntry(entry);
  } catch (e) {
    console.warn('Audit log fallback failed:', e);
  }
}

// In memory, entries are kept unencrypted, on purpose, the same way the old
// IDB store held them: a failed-unlock attempt has to be logged before any
// password has been verified, so no encryption key can be assumed to exist
// yet. That's only true of memory, though — by the time any of this reaches
// a .sav file, a real save is happening, which (see saveData()'s own guard)
// cannot happen at all in 'encrypted' mode without the key (crypto.js) already set.
// buildCaseFileBlob() encrypts the whole log at that point, same as
// appState, rather than leaving ward names and other case details sitting
// in plaintext inside a file this app actively encourages emailing and
// copying around. Deliberately does NOT call autoSave() itself:
// writeCaseToHandle() logs its own DATA_EXPORT entry as part of every
// manual save (automatic saves are not logged -- Milestone 62), and having
// that schedule another save would loop forever, one save always
// triggering the next. An entry logged for any other reason rides
// along in whatever save happens next instead — exactly as independent of
// the ward-edit debounce as the old IDB store's own audit log always was.
export async function appendAuditLogEntry(entry){
  entry.id=_auditLogNextId++;
  // Tag with the filing the entry is about, so a single-ward export
  // (buildSingleWardExportBlob) can include only that filing's own entries.
  // A caller that names the filing keeps it: syncing a closed filing from
  // Manage Shared Records logs about that filing while another is open, and
  // tagging every entry with the open one filed it under the wrong filing --
  // that filing's export carried it, the closed one's missed it (found in
  // Milestone 71's review; fixed after Milestone 72, 2026-10-03). Otherwise
  // the active ward. Entries created before this tagging, or app-level events
  // with no active ward, will have wardId undefined/null and are excluded
  // from single-ward exports (but preserved in the main case file and the
  // activity log).
  if(!entry.wardId&&getCaseFile().activeWardId)entry.wardId=getCaseFile().activeWardId;
  _auditLogEntries.push(entry);
  return true;
}

export async function loadAuditLogEntries(){
  return _auditLogEntries;
}

// A case file's own log, as it opens (loadCaseFileFromZip()); numbering
// carries on from its highest id.
export function replaceAuditLog(loaded){
  _auditLogEntries=Array.isArray(loaded)?loaded:[];
  _auditLogNextId=_auditLogEntries.reduce((m,e)=>Math.max(m,(e&&e.id)||0),0)+1;
}

// A save records itself in the log before it writes (case-file.js's
// beginRecordingExport()); if the write then fails, its entry is taken back.
export function auditLogLength(){return _auditLogEntries.length;}

export function truncateAuditLog(length){_auditLogEntries.length=length;}
