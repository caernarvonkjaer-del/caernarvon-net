// Canonical .sav ZIP packaging, File System Access API handles, and export/import operations.
import {
  encryptJSON,
  decryptJSONWithKey,
  getSecurityMode,
  getCryptoKey,
} from './crypto.js';
import {
  loadAppState,
  savePersistedCaseFileHandle,
  loadPersistedCaseFileHandle,
  forgetPersistedCaseFileHandle,
  markCaseOpenedBefore,
} from './launch-preferences.js';
import { clearSessionRestoreCache, saveSessionRestoreCache } from './recovery-cache.js';
import { MERGED_LISTS, caseRecords, fingerprintCase, getDiskBase, mergeCase, setDiskBase } from './case-merge.js';
import { readCaseFileZip } from './case-zip-read.js';
import { commitPendingEdits, getActiveWard, getAppState, getCaseFile, getTemplateCache, requestSave } from '../state.js';
import { dirtyGenerationNow, getAutoExportIntervalMinutes, getLastExportAt, isDirtySinceExport, markSavedIfUnchangedSince, setAutoExportIntervalMinutes, setDirtySinceExport, setLastExportAt } from './export-state.js';
import { auditLog, auditLogLength, loadAuditLogEntries, truncateAuditLog } from '../activity/audit-log.js';
// Milestone 70, 70H: the export state is ./export-state.js's; re-exported for
// the modules that import it from here.
export { getLastExportAt, isDirtySinceExport, setDirtySinceExport, setLastExportAt };
import { migratePlanTriState } from '../filing/plan-tristate.js';
import { IMPORT_SIZE_LIMITS } from '../security/input-hardening.js';
import { alertModal, confirmModal, showModal } from '../ui/dialogs.js';
import { notifyProbateGuardianTabStateChanged } from '../navigation/tab-state.js';
import { commitStoredDateDrafts } from '../form/commit-coordinator.js';
import { setPath } from '../form/paths.js';

export const CASE_FILE_FORMAT_VERSION = 1;

let _autoSaveArmed = false;
let _saveTimer = null; // the pending debounced save (autoSave()), if any
let _saveRetrySweepTimer = null;
let _lastSavedTickTimer = null;
let _fallbackReminderTimer = null;

// The open case file's handle (the file every save writes): this module's
// own since Milestone 70's 70I -- it was mirrored onto window, which nothing
// read.
let _caseFileHandle = null;
export function getCaseFileHandle() {
  return _caseFileHandle;
}
export function setCaseFileHandle(handle) {
  _caseFileHandle = handle;
}

export function isAutoSaveArmed() {
  return _autoSaveArmed;
}



export async function saveBlobAs(blob, suggestedName, preWriteValidator) {
  if (typeof window !== 'undefined' && window.showSaveFilePicker) {
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName,
        types: [{ description: 'Guardian Forms data file', accept: { 'application/octet-stream': ['.sav'] } }],
      });
      if (typeof preWriteValidator === 'function') {
        const proceed = await preWriteValidator(handle);
        if (!proceed) {
          const abortErr = new Error('The user aborted a request.');
          abortErr.name = 'AbortError';
          throw abortErr;
        }
      }
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      return handle;
    } catch (e) {
      if (e && e.name === 'AbortError') throw e;
      console.warn('showSaveFilePicker/createWritable unavailable, falling back to download link', e);
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = suggestedName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  return null;
}

export async function rememberCaseFileHandle(handle) {
  if (!handle) return;
  // Milestone 76A: what this tab knows the file holds belongs to one file. A
  // file just read takes the handle it was read from; any other file starts
  // with nothing known, so its first save writes this tab's case whole.
  const base = getDiskBase();
  if (base && base.handle !== handle) {
    if (base.handle === null) base.handle = handle;
    else forgetFileContents();
  }
  const caseFile = getCaseFile();
  if (handle.name) caseFile.lastSavedFileName = handle.name;
  setCaseFileHandle(handle);
  await savePersistedCaseFileHandle(handle);
  await refreshAutoSaveArmedStatus();
}

export function suggestedCaseFileName() {
  const caseFile = getCaseFile();
  return (caseFile && caseFile.lastSavedFileName) || 'guardianshipwarddata.sav';
}

export async function loadCaseFileHandle() {
  const current = getCaseFileHandle();
  if (current) return current;
  const handle = await loadPersistedCaseFileHandle();
  if (handle) {
    setCaseFileHandle(handle);
    return handle;
  }
  return null;
}

export async function forgetCaseFileHandle() {
  forgetFileContents();
  setCaseFileHandle(null);
  await forgetPersistedCaseFileHandle();
  await refreshAutoSaveArmedStatus();
}

// What a filer is told a case file part is, when it could not be read. The
// kinds come from case-reader.js's loadCaseFileFromZip() and from this file's
// decryptCaseFileCore() and case-import.js's importSavArchiveOrWard().
const UNREADABLE_PART_LABELS = {
  parties: 'The shared records of people (wards, guardians and attorneys)',
  cases: 'The case records (case numbers and counties)',
  partyDismissals: 'Your list of people marked as not duplicates of each other',
  guardian: 'The guardian name and email saved with this file',
  preferences: "This file's saved settings (circuit and save reminders)",
  activity: 'The activity history',
};

/** Filer-facing names for the parts of a case file that could not be read. */
export function describeUnreadableParts(parts) {
  return (Array.isArray(parts) ? parts : []).map((p) => {
    // A password-protected file's manifest holds no names (manifestWardEntry()).
    if (p && p.kind === 'filing') return p.name ? `The filing for "${p.name}"` : 'A filing whose name could not be read';
    return UNREADABLE_PART_LABELS[p && p.kind] || 'An unrecognized part of the file';
  });
}

/**
 * A case file was opened, or re-read after an unlock, and some parts could not
 * be read. Everything else is already loaded. Used to be silent: the file
 * opened without those parts and, in Chrome/Edge, the first auto-save rewrote
 * the original without them for good. Now the original stops being the file
 * auto-save writes to (the next save asks where to save), and the filer is
 * told exactly what could not be read. Returns true when anything was
 * unreadable -- the caller must then not remember the file's handle.
 * (master b2d97f5, carried.)
 */
export async function protectPartiallyReadCaseFile(parts, fileName = '') {
  const labels = describeUnreadableParts(parts);
  if (!labels.length) return false;
  try {
    await forgetCaseFileHandle();
  } catch (e) {
    console.warn('Could not detach the damaged case file', e);
  }
  const named = fileName ? `"${fileName}"` : 'this file';
  await alertModal({
    title: 'Part of this file could not be read',
    message: `These parts of ${named} could not be read, so they were not opened:\n\n${labels.map((l) => `• ${l}`).join('\n')}\n\n`
      + 'Everything else opened. Your original file has not been changed, and it will not be saved over automatically. '
      + 'To keep what opened, use Save Backup and save it under a new name. Keep the original file as well: '
      + 'what could not be read may still be recoverable from it.',
  });
  return true;
}

export async function refreshAutoSaveArmedStatus() {
  let armed = false;
  let handle = null;
  try {
    handle = await loadCaseFileHandle();
    if (handle && handle.queryPermission) {
      armed = (await handle.queryPermission({ mode: 'readwrite' })) === 'granted';
    }
  } catch (e) {
    /* treat as not armed */
  }
  _autoSaveArmed = armed;
  if (typeof document !== 'undefined') {
    const el = document.getElementById('auto-save-armed-indicator');
    if (el) {
      const fileName = handle && handle.name;
      if (armed) {
        el.textContent = fileName ? `Auto-save: ready ✓ (${fileName})` : 'Auto-save: ready ✓';
        el.style.color = 'var(--ok-text)';
      } else if (handle) {
        el.textContent = `Auto-save: click Save Backup once to re-enable (${fileName})`;
        el.style.color = 'var(--warn-text)';
      } else if (typeof window !== 'undefined' && window.showSaveFilePicker) {
        el.textContent = `Auto-save: needs manual save (${suggestedCaseFileName()})`;
        el.style.color = 'var(--ink-3)';
      } else {
        el.textContent = 'Auto-save: not available in this browser — use Save/Export before closing this tab';
        el.style.color = 'var(--warn-text)';
      }
      // Milestone 73R part 1: a short window cuts the line; the whole on hover.
      el.title = el.textContent;
    }
  }
}

export function getJSZip() {
  if (typeof window !== 'undefined' && window.JSZip) {
    return window.JSZip;
  }
  throw new Error('JSZip library unavailable');
}

/**
 * One filing's line in the manifest -- the only part of a .sav a zip tool
 * shows without the password. A password-protected file used to list each
 * ward's name here in plain text, so anyone holding the file could read the
 * names of the people in the case. The name is written only when the file is
 * unencrypted (readable by anyone anyway); every version reads a filing's
 * name from the filing itself, never from here. (master 5de3707, carried.)
 */
function manifestWardEntry(ward, file) {
  return getSecurityMode() === 'encrypted'
    ? { wardId: ward.wardId, file }
    : { wardId: ward.wardId, wardName: ward.wardName || '', file };
}

/**
 * The message for a file saved in a newer case-file format than this build
 * reads, or null. Such a file used to open as if it were this format: an
 * older tab -- production caches the page for a year, so old tabs linger --
 * would drop whatever the newer format added and, in Chrome/Edge, auto-save
 * over the file. Every way a file comes in refuses it instead. A file with no
 * version predates the field and is format 1. (master 5de3707, carried.)
 */
export function newerCaseFileFormatMessage(manifest) {
  const version = Number(manifest && manifest.version);
  if (!(version > CASE_FILE_FORMAT_VERSION)) return null;
  return 'This file was saved by a newer version of Guardian Forms than the one open in this tab, so it was not opened here: '
    + 'this version could lose what the newer one saved. Refresh the page (Ctrl+F5) to load the current version, then open the file again.';
}

// `state`: the records to write (case-merge.js's caseRecords()), when a save
// writes something other than the open case's own -- a merged save keeps the
// file's copy of a record both tabs changed until the filer chooses (Milestone
// 76A). The open case's otherwise.
export async function buildCaseFileBlob({ state = null } = {}) {
  // A save still pending from the debounce would only write this again.
  if (_saveTimer) {
    clearTimeout(_saveTimer);
    _saveTimer = null;
  }
  const salt = (await loadAppState('cryptoSalt')) || null;
  const verifier = (await loadAppState('cryptoVerifier')) || null;
  const JSZip = getJSZip();
  const zip = new JSZip();
  const wardIndex = [];
  const caseFile = getCaseFile();
  const records = state || caseRecords(caseFile);

  for (const ward of records.wards) {
    const file = `wards/${ward.wardId}.enc`;
    zip.file(file, await encryptJSON(ward));
    wardIndex.push(manifestWardEntry(ward, file));
  }

  const appStateBlob = {
    // Milestone 40D: `theme` is deliberately NOT serialized here any more. It is
    // a per-device display preference in localStorage (see
    // core/theme-preference.js), not case data, so a .sav written from now on
    // carries no theme at all and opening a file never changes appearance.
    // Removing the write in applyTheme() alone would not have stopped this line:
    // it re-read persisted app state directly. Old files may still carry the key;
    // loadCaseFileFromZip() consumes it once as a migration seed and never as an
    // appearance override.
    walkthroughCompleted: await loadAppState('walkthroughCompleted'),
    firstLaunchSeen: await loadAppState('firstLaunchSeen'),
    continuePromptShown: await loadAppState('continuePromptShown'),
    recentWards: await loadAppState('recentWards'),
    autoExportIntervalMinutes: getAutoExportIntervalMinutes(),
    lastExportAt: getLastExportAt(),
    unlockFailState: await loadAppState('unlockFailState'),
    // Milestone 54: unlike every other field above, this one is sourced from
    // caseFile, not loadAppState() -- it IS case-scoped state, not a launch
    // preference. It rides in this blob rather than getting its own CSV row
    // and .enc zip entry (the design 54A originally shipped with) because
    // this blob is read ONLY at full .sav launch-load (loadCaseFileFromZip(),
    // src/core/persistence/case-reader.js), never by importSavArchiveOrWard()'s merge-import
    // path or by the session-restore-cache path -- exactly the behavior a
    // circuit selection needs: restored when a whole file is opened, left
    // alone by "Open Backup"/"Restore"/"Import" merging data into an
    // already-open case. A dedicated zip entry read by decryptCaseFileCore()
    // could not make that distinction without its caller re-implementing it.
    selectedCircuit: caseFile.selectedCircuit || 6,
  };

  const templateCache = getTemplateCache();
  const templateTypes = Object.keys(templateCache).filter((t) => templateCache[t]);
  for (const type of templateTypes) {
    zip.file(`templates/${type}.b64`, templateCache[type]);
  }

  const auditLogEntries = await loadAuditLogEntries();
  zip.file('auditLog.enc', await encryptJSON(auditLogEntries));
  const core = await encryptCaseFileCore({
    guardianInfo: { guardianName: records.guardianName, guardianEmail: records.guardianEmail },
    parties: records.parties,
    cases: records.cases,
    dismissedPartyPairs: records.dismissedPartyPairs,
  });
  zip.file('parties.enc', core.parties);
  zip.file('cases.enc', core.cases);
  zip.file('partyDismissals.enc', core.partyDismissals);
  zip.file(
    'manifest.json',
    JSON.stringify(
      {
        format: 'probate-guardian-case',
        version: CASE_FILE_FORMAT_VERSION,
        exportedAt: new Date().toISOString(),
        securityMode: getSecurityMode(),
        salt,
        verifier,
        guardian: core.guardian,
        appState: await encryptJSON(appStateBlob),
        templates: templateTypes,
        wards: wardIndex,
      },
      null,
      2
    )
  );

  const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
  return { blob, count: wardIndex.length };
}

export async function buildSingleWardExportBlob(wardId) {
  const caseFile = getCaseFile();
  const ward = (caseFile.wards || []).find((w) => w.wardId === wardId);
  if (!ward) throw new Error(`buildSingleWardExportBlob: ward "${wardId}" not found`);

  const salt = (await loadAppState('cryptoSalt')) || null;
  const verifier = (await loadAppState('cryptoVerifier')) || null;
  const JSZip = getJSZip();
  const zip = new JSZip();
  zip.file(`wards/${ward.wardId}.enc`, await encryptJSON(ward));

  const auditLogEntries = await loadAuditLogEntries();
  const wardAuditEntries = auditLogEntries.filter((e) => e && e.wardId === wardId);
  zip.file('auditLog.enc', await encryptJSON(wardAuditEntries));
  zip.file(
    'manifest.json',
    JSON.stringify(
      {
        format: 'probate-guardian-case',
        version: CASE_FILE_FORMAT_VERSION,
        exportedAt: new Date().toISOString(),
        securityMode: getSecurityMode(),
        salt,
        verifier,
        guardian: await encryptJSON({
          guardianName: caseFile.guardianName,
          guardianEmail: caseFile.guardianEmail,
        }),
        templates: [],
        wards: [manifestWardEntry(ward, `wards/${ward.wardId}.enc`)],
      },
      null,
      2
    )
  );

  const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
  return blob;
}

export function formatRelativeTime(ts) {
  const diffMin = Math.floor((Date.now() - ts) / 60000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin} minute${diffMin === 1 ? '' : 's'} ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr} hour${diffHr === 1 ? '' : 's'} ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay} day${diffDay === 1 ? '' : 's'} ago`;
}

export function markDirtySinceExport() {
  setDirtySinceExport(true);
  if (typeof window !== 'undefined') {
    notifyProbateGuardianTabStateChanged();
  }
}

// Reads one clock, not two. The old second clock (_lastAutoSavedAt) was set
// by saveData() before it had even checked for a writable handle, so this
// indicator could report "Last backup: just now" in a browser that cannot
// background-save at all -- directly contradicting the armed-status line
// beside it. A save is now reported only once writeCaseToHandle() has
// actually written.
export function updateLastSavedIndicator() {
  if (typeof document === 'undefined') return;
  const el = document.getElementById('last-saved-indicator');
  if (!el) return;
  const dirty = isDirtySinceExport();
  const lastSave = getLastExportAt() || 0;

  if (dirty && !lastSave) {
    el.textContent = '● Unsaved changes';
    el.style.color = 'var(--warn-text)';
  } else if (lastSave) {
    el.textContent = `✓ Last backup: ${formatRelativeTime(lastSave)}`;
    el.style.color = 'var(--ok-text)';
  } else {
    el.textContent = 'No backup saved yet';
    el.style.color = 'var(--ink-3)';
  }
  el.title = el.textContent; // Milestone 73R part 1: whole on hover when cut
}

// `log: false` still advances the save clock (the "Last backup" indicator
// depends on it) but writes no Activity Log entry, and its rollback leaves the
// log alone.
export async function beginRecordingExport(message, wardId = null, { log = true } = {}) {
  const previousLastExportAt = getLastExportAt();
  const auditLenBefore = auditLogLength();
  setLastExportAt(Date.now());
  if (log) await auditLog('DATA_EXPORT', message, true, wardId);
  return function rollback() {
    setLastExportAt(previousLastExportAt);
    if (log) truncateAuditLog(auditLenBefore);
  };
}

// Milestone 76D: no file is written with a weaker password than it had. Save
// As from a case with no password onto a password-protected case file would
// replace it with one anyone can read; the filer is asked first.
async function keepsPasswordStrength(handle) {
  if (getSecurityMode() !== 'none') return true;
  try {
    const file = await handle.getFile();
    if (!file || !file.size) return true;
    const zip = await getJSZip().loadAsync(file);
    const entry = zip.file('manifest.json');
    if (!entry) return true;
    const manifest = JSON.parse(await entry.async('string'));
    if (!manifest || !manifest.securityMode || manifest.securityMode === 'none') return true;
  } catch (e) {
    return true; // not a case file: nothing protected is replaced
  }
  return confirmModal({
    title: 'Replace a password-protected file?',
    message: `"${handle.name}" is a password-protected case file, and this case has no password. Saving here replaces it with a file anyone who has it can read.`,
    confirmLabel: 'Replace it',
    cancelLabel: 'Choose another file',
    danger: true,
  });
}

export async function exportCaseFileZip() {
  const caseFile = getCaseFile();
  if (!caseFile.wards || caseFile.wards.length === 0) {
    await alertModal('No wards to back up. Please add or open a ward first.');
    return;
  }
  if (typeof window !== 'undefined' && typeof window.JSZip === 'undefined') {
    await alertModal('ZIP library failed to load — cannot export.');
    return;
  }
  const count = caseFile.wards.length;
  let rollback = null;
  try {
    // Milestone 76A: one save at a time, and saved only up to the change it
    // wrote. A download (Firefox, Safari) marks the case saved as before
    // (decision 76A-4).
    const { handle, suggestedName } = await oneSaveAtATime(async () => {
      const generation = dirtyGenerationNow();
      rollback = await beginRecordingExport(`Exported ${count} form(s) to backup file`);
      const state = caseRecords(getCaseFile());
      const { blob } = await buildCaseFileBlob({ state });
      if (!caseSizeAllowsWrite(blob)) {
        const tooLarge = new Error(_lastSizeRefusal);
        tooLarge.name = 'CaseTooLarge';
        throw tooLarge;
      }
      const name = suggestedCaseFileName();
      const picked = await saveBlobAs(blob, name, keepsPasswordStrength);
      if (picked) {
        await rememberCaseFileHandle(picked);
        markCaseOpenedBefore();
        await rememberWritten(picked, state);
        announceWrite(picked);
      }
      if (markSavedIfUnchangedSince(generation)) await clearSessionRestoreCache();
      return { handle: picked, suggestedName: name };
    });
    hideAutoExportReminder();
    updateLastSavedIndicator();
    if (typeof window !== 'undefined') {
      notifyProbateGuardianTabStateChanged();
    }
    const savedName = handle ? handle.name : suggestedName;
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('pg:backup-saved', { detail: { fileName: savedName, count } }));
    }
    await alertModal(`Backup complete: ${count} form(s) saved to ${savedName}`);
  } catch (e) {
    if (rollback) rollback();
    if (e && e.name === 'AbortError') return;
    if (e && e.name === 'CaseTooLarge') {
      await alertModal({ title: 'This case is too large to save', message: e.message });
      return;
    }
    console.error('export failed', e);
    auditLog('DATA_EXPORT', String((e && e.message) || e), false);
    await alertModal('Export failed: ' + ((e && e.message) || e));
  }
}

// Consecutive-failure tracking lives here rather than in one caller, so the
// 1s autosave debounce, the periodic sweep, and the manual Save Backup
// button all escalate a write failure the same way. Previously only
// saveData() counted failures, so an identical disk/permission error
// surfaced as a persistent error banner or as nothing at all depending
// purely on which path happened to trigger the write.
let _consecutiveSaveFailures = 0;
const SAVE_FAILURE_THRESHOLD = 2;

// Milestone 76C (decision 76C-1): every case this app saves opens again. The
// open limit is the size measured to save and reopen in every browser
// (input-hardening.js's IMPORT_SIZE_LIMITS.sav); a case above it is never
// written -- the file stays as it was and the filer is told what is largest --
// and a case nearing it is warned about once a session, by banner (saves run
// after every edit, so never a dialog). Before 76C a case grown past the open
// limit saved normally and could never be opened again.
const CASE_SIZE_WARN_SHARE = 0.8;
let _caseSizeWarned = false;
let _lastSizeRefusal = '';

function megabytes(bytes) {
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

/** The case's largest supporting documents, biggest first: [{ name, filing, size }]. */
export function largestAttachments(caseFile = getCaseFile(), count = 3) {
  const found = [];
  for (const ward of (caseFile && caseFile.wards) || []) {
    for (const byPeriod of Object.values((ward && ward.scheduleDocs) || {})) {
      for (const slot of Object.values(byPeriod || {})) {
        const files = Array.isArray(slot) ? slot : (slot && Array.isArray(slot.files) ? slot.files : []);
        for (const f of files) {
          if (f && f.size > 0) found.push({ name: f.name || '(unnamed)', filing: ward.wardName || '(unnamed)', size: f.size });
        }
      }
    }
  }
  return found.sort((a, b) => b.size - a.size).slice(0, count);
}

function largestNote() {
  const big = largestAttachments();
  return big.length ? ` Its largest supporting documents: ${big.map((d) => `${d.name} (${megabytes(d.size)}, ${d.filing})`).join('; ')}.` : '';
}

function showCaseSizeBanner(message, over) {
  if (typeof document === 'undefined') return;
  const el = document.getElementById('case-size-banner');
  const text = document.getElementById('case-size-banner-text');
  if (!el || !text) return;
  text.textContent = message;
  el.classList.toggle('over', !!over);
  el.style.display = 'block';
}

export function hideCaseSizeBanner() {
  if (typeof document === 'undefined') return;
  const el = document.getElementById('case-size-banner');
  if (el) el.style.display = 'none';
}

function caseSizeAllowsWrite(blob) {
  const limit = IMPORT_SIZE_LIMITS.sav;
  if (blob.size > limit) {
    _lastSizeRefusal = `This case is too large to save: ${megabytes(blob.size)}, more than the ${megabytes(limit)} this app can open again. `
      + `Nothing was written, so your case file is as it was, and your latest changes are not saved. `
      + `Remove supporting documents to bring it under ${megabytes(limit)}.${largestNote()}`;
    showCaseSizeBanner(_lastSizeRefusal, true);
    return false;
  }
  _lastSizeRefusal = '';
  const banner = typeof document !== 'undefined' ? document.getElementById('case-size-banner') : null;
  if (banner && banner.classList.contains('over')) hideCaseSizeBanner();
  if (blob.size >= limit * CASE_SIZE_WARN_SHARE && !_caseSizeWarned) {
    _caseSizeWarned = true;
    showCaseSizeBanner(`This case file is ${megabytes(blob.size)}; the most this app can open again is ${megabytes(limit)}, and a larger case will not be saved.`
      + `${largestNote()} Removing documents you no longer need keeps it well under the limit.`, false);
  }
  return true;
}

// Milestone 76A: one save at a time. Saves started together -- the debounce,
// a tab being hidden, a lock, an import -- used to run at once and finish in
// any order, so an older one could land last and be marked saved.
let _saveQueue = Promise.resolve();
/**
 * @template T
 * @param {() => Promise<T>} run
 * @returns {Promise<T>}
 */
function oneSaveAtATime(run) {
  const result = _saveQueue.then(run, run);
  _saveQueue = result.then(() => {}, () => {});
  return result;
}

// Milestone 76A (decision 76A-1): no save while a lock is being undone. An
// unlock records itself (the failed-attempt count) and so asks for a save; it
// used to land a second later while the lock was still reading the case back
// into an emptied memory, and a case slow to read -- one with attached
// statements -- was written over its file EMPTY. app-lock.js holds saves from
// before it empties memory until the case is back.
let _savesHeld = 0;
export function holdSaves() {
  _savesHeld += 1;
  let released = false;
  return () => {
    if (!released) { released = true; _savesHeld -= 1; }
  };
}

// Milestone 76A (decision 76A-2): records both this tab and another changed
// since this tab last read or wrote the file. Each is written as the file has
// it, this tab keeps its own, and the filer is asked (src/core/modals/
// case-conflicts.js, through 'pg:case-conflicts') -- until then, every save
// keeps the file's copy. `_announced`: the ones already asked about.
const _pendingConflicts = new Map();
const _announced = new Set();

function forgetFileContents() {
  setDiskBase(null);
  _pendingConflicts.clear();
  _announced.clear();
}

/** The records changed both here and in another tab, still unanswered. */
export function pendingCaseConflicts() {
  return [..._pendingConflicts.values()];
}

/**
 * The filer's answers, by record key: 'mine' keeps this tab's copy (the next
 * save writes it), 'theirs' takes the file's. null: not answered -- asked
 * again at the next save.
 */
export function resolveCaseConflicts(answers) {
  if (!answers) {
    _announced.clear();
    return;
  }
  let answered = false;
  for (const [key, choice] of Object.entries(answers)) {
    const conflict = _pendingConflicts.get(key);
    if (!conflict || (choice !== 'mine' && choice !== 'theirs')) continue;
    if (choice === 'theirs') useFileCopy(conflict);
    _pendingConflicts.delete(key);
    _announced.delete(key);
    answered = true;
  }
  if (answered) requestSave();
}

function useFileCopy({ list, id, theirs }) {
  const caseFile = getCaseFile();
  const idKey = MERGED_LISTS[list];
  const records = caseFile[list] || (caseFile[list] = []);
  const at = records.findIndex((r) => r && String(r[idKey]) === id);
  if (theirs) {
    if (at >= 0) records[at] = theirs;
    else records.push(theirs);
  } else if (at >= 0) {
    records.splice(at, 1);
  }
  announceMerged([{ list, id }]);
}

function announceMerged(pulled) {
  if (typeof window === 'undefined' || !pulled.length) return;
  const activeId = getCaseFile().activeWardId;
  const active = pulled.find((p) => p.list === 'wards' && p.id === activeId);
  window.dispatchEvent(new CustomEvent('pg:case-merged', {
    detail: {
      pulled: pulled.map(({ list, id }) => ({ list, id })),
      activeChanged: !!active,
      activeRemoved: !!active && !getActiveWard(),
    },
  }));
}

// Another tab says it wrote a case file: the next save reads the file again
// even if its size and time look unchanged (a file system with 2-second
// times; the same size by chance). Names only the file, never case data.
const WRITES_CHANNEL = 'probate-guardian-case-writes';
let _writesChannel = null;
let _peerWrote = false;
function writesChannel() {
  if (_writesChannel !== null) return _writesChannel || null;
  _writesChannel = false;
  try {
    if (typeof window !== 'undefined' && typeof BroadcastChannel !== 'undefined') {
      const channel = new BroadcastChannel(WRITES_CHANNEL);
      channel.addEventListener('message', () => { _peerWrote = true; });
      // Node's channel would keep a unit test's process alive; browsers have no unref.
      const unref = /** @type {any} */ (channel).unref;
      if (typeof unref === 'function') unref.call(channel);
      _writesChannel = channel;
    }
  } catch (e) {
    /* no channel: size and time alone decide */
  }
  return _writesChannel || null;
}

function announceWrite(handle) {
  try { writesChannel()?.postMessage({ type: 'case-file-written', name: handle && handle.name }); } catch (e) { /* non-critical */ }
}

// What this tab has just written to `handle`: the next save compares with it.
async function rememberWritten(handle, state) {
  let stat = null;
  try {
    const f = await handle.getFile();
    stat = { size: f.size, lastModified: f.lastModified };
  } catch (e) {
    /* the next save reads the file instead */
  }
  setDiskBase({ handle, fp: await fingerprintCase(state), stat });
}

// Milestone 76A (decision 76A-2): before writing, see what another tab or
// window saved since this tab last read or wrote the file, and merge record by
// record (case-merge.js). Returns the records to write, or null to write this
// tab's case as it is -- when nothing is known about the file, it is not the
// same file or case, it has not changed, or it can't be read whole -- or
// { refused } when a newer version of the app saved it.
async function mergeWithFile(handle) {
  const base = getDiskBase();
  if (!base || base.handle !== handle) return null;
  const peerWrote = _peerWrote;
  _peerWrote = false;
  let file;
  try {
    file = await handle.getFile();
  } catch (e) {
    return null;
  }
  const unchanged = !peerWrote && base.stat && base.stat.size === file.size && base.stat.lastModified === file.lastModified;
  if (unchanged && !_pendingConflicts.size) return null;
  let theirs;
  try {
    const zip = await getJSZip().loadAsync(file);
    const manifestEntry = zip.file('manifest.json');
    if (!manifestEntry) return null;
    const manifest = JSON.parse(await manifestEntry.async('string'));
    if (manifest.format !== 'probate-guardian-case') return null;
    const newerFormat = newerCaseFileFormatMessage(manifest);
    if (newerFormat) {
      // Another tab on a newer version saved this file: never save over it.
      await forgetCaseFileHandle();
      void alertModal(newerFormat);
      return { refused: true };
    }
    if ((manifest.salt || null) !== (getAppState('cryptoSalt') || null)) return null;
    theirs = await readCaseFileZip(zip, manifest, getCryptoKey());
  } catch (e) {
    console.warn('Could not read the case file before saving; writing this tab\'s case', e);
    return null;
  }
  if (theirs.unreadable.length) return null;
  const caseFile = getCaseFile();
  const mine = caseRecords(caseFile);
  const theirsRecords = caseRecords(theirs.caseFile);
  const [mineFp, theirsFp] = await Promise.all([fingerprintCase(mine), fingerprintCase(theirsRecords)]);
  const result = mergeCase({
    base: base.fp, mine, mineFp, theirs: theirsRecords, theirsFp,
    pending: new Set(_pendingConflicts.keys()), activeWardId: caseFile.activeWardId,
  });
  if (result.pulled.length) {
    for (const list of Object.keys(MERGED_LISTS)) caseFile[list] = result.next[list];
  }
  caseFile.guardianName = result.next.guardianName;
  caseFile.guardianEmail = result.next.guardianEmail;
  caseFile.dismissedPartyPairs = result.next.dismissedPartyPairs;
  await mergeActivityLog(theirs.auditLog);
  const templates = getTemplateCache();
  for (const [type, b64] of Object.entries(theirs.templates || {})) {
    if (!templates[type]) templates[type] = b64;
  }
  _pendingConflicts.clear();
  for (const conflict of result.conflicts) _pendingConflicts.set(conflict.key, conflict);
  for (const key of [..._announced]) if (!_pendingConflicts.has(key)) _announced.delete(key);
  const unasked = result.conflicts.filter((c) => !_announced.has(c.key));
  if (unasked.length && typeof window !== 'undefined') {
    for (const c of unasked) _announced.add(c.key);
    window.dispatchEvent(new CustomEvent('pg:case-conflicts', { detail: { conflicts: pendingCaseConflicts() } }));
  }
  announceMerged(result.pulled);
  return { written: result.written };
}

// The Activity Log keeps both tabs' entries.
async function mergeActivityLog(theirs) {
  if (!Array.isArray(theirs) || !theirs.length) return;
  const entries = await loadAuditLogEntries(); // the live list
  const keyOf = (e) => e && `${e.timestamp}|${e.eventType}|${e.details}|${e.wardId || ''}`;
  const known = new Set(entries.map(keyOf));
  const added = theirs.filter((e) => e && !known.has(keyOf(e)));
  if (!added.length) return;
  entries.push(...added);
  entries.sort((a, b) => String(a.timestamp).localeCompare(String(b.timestamp)));
}

export function writeCaseToHandle(handle, viaTimer) {
  return oneSaveAtATime(() => writeCaseNow(handle, viaTimer));
}

// Milestone 76D (design 4): when the filer last changed each filing -- a
// stored field, `lastEdited`, set as a save finds a filing changed since its
// file last held it (case-merge.js's fingerprints, which leave the stamps
// out). `lastModified` could not say this: it is restamped on every save of
// the open filing, changed or not, and on every filing an import brings in.
// Restore from Backup shows it beside each copy. With nothing known of the
// file yet, the open filing is stamped when the case has changes.
async function stampEditedFilings() {
  const caseFile = getCaseFile();
  const now = new Date().toISOString();
  const base = getDiskBase();
  if (!base || !base.fp) {
    const active = getActiveWard();
    if (active && isDirtySinceExport()) active.lastEdited = now;
    return;
  }
  const fp = await fingerprintCase({ wards: caseFile.wards });
  for (const ward of caseFile.wards || []) {
    const id = ward && ward.wardId != null ? String(ward.wardId) : '';
    if (id && fp.wards.get(id) !== base.fp.wards.get(id)) ward.lastEdited = now;
  }
}

async function writeCaseNow(handle, viaTimer) {
  if (_savesHeld > 0) return null;
  const generation = dirtyGenerationNow();
  await stampEditedFilings();
  const merged = await mergeWithFile(handle);
  if (merged && merged.refused) return null;
  const caseFile = getCaseFile();
  const count = (caseFile.wards || []).length;
  // Milestone 62: automatic saves are not written to the Activity Log. `viaTimer`
  // is true for both the interval sweep (silentAutoExport) and the debounced
  // save after every edit (saveData() below), so logging them would
  // bury the entries that matter -- unlocks, manual backups, restores -- and,
  // because the log rides inside every save, grow the file on each one.
  const rollback = await beginRecordingExport(`Saved ${count} form(s) to existing backup file`, null, { log: !viaTimer });
  const state = merged ? merged.written : caseRecords(caseFile);
  try {
    const { blob } = await buildCaseFileBlob({ state });
    if (!caseSizeAllowsWrite(blob)) {
      rollback();
      return null;
    }
    const writable = await handle.createWritable();
    await writable.write(blob);
    await writable.close();
  } catch (e) {
    rollback();
    _consecutiveSaveFailures += 1;
    if (_consecutiveSaveFailures >= SAVE_FAILURE_THRESHOLD) showSaveError(handle && handle.name);
    throw e;
  }
  _consecutiveSaveFailures = 0;
  hideSaveError();
  await rememberWritten(handle, state);
  announceWrite(handle);
  // Saved only up to the change this save began with, and not while a record
  // changed in another tab too still waits for the filer (Milestone 76A).
  if (!_pendingConflicts.size && markSavedIfUnchangedSince(generation)) {
    await clearSessionRestoreCache();
    hideAutoExportReminder();
  }
  await refreshAutoSaveArmedStatus();
  updateLastSavedIndicator();
  if (typeof window !== 'undefined') {
    notifyProbateGuardianTabStateChanged();
    window.dispatchEvent(
      new CustomEvent('pg:backup-saved', {
        detail: { fileName: handle.name, count, viaTimer: !!viaTimer },
      })
    );
  }
  return count;
}

export async function silentAutoExport() {
  try {
    if (typeof window !== 'undefined' && typeof window.JSZip === 'undefined') return false;
    const handle = await loadCaseFileHandle();
    if (!handle) return false;
    const perm = await handle.queryPermission({ mode: 'readwrite' });
    if (perm !== 'granted') {
      await refreshAutoSaveArmedStatus();
      return false;
    }
    await writeCaseToHandle(handle, true);
    return true;
  } catch (e) {
    console.warn('Silent auto-export failed, will show reminder instead', e);
    await refreshAutoSaveArmedStatus();
    return false;
  }
}

export function getWardFileStem(ward) {
  const namePart = (ward && ward.wardName || 'Ward').trim().replace(/[\s_]+/g, '-').replace(/[^a-zA-Z0-9-]/g, '') || 'Ward';
  const casePart = (ward && ward.caseNumber || '').trim().replace(/[\s_]+/g, '-').replace(/[^a-zA-Z0-9-]/g, '');
  return casePart ? `${namePart}-${casePart}-guardianshipwarddata` : `${namePart}-guardianshipwarddata`;
}

export function getWardFileName(ward) {
  return `${getWardFileStem(ward)}.sav`;
}

export async function validateWardBackupOverwrite(pickedHandle) {
  const caseHandle = await loadCaseFileHandle();
  const caseFile = getCaseFile();
  if (caseHandle && typeof pickedHandle.isSameEntry === 'function') {
    try {
      if ((await pickedHandle.isSameEntry(caseHandle)) && caseFile.wards && caseFile.wards.length > 1) {
        return confirmModal(
          'Warning: You selected your main case file, which holds multiple wards. Overwriting it with just this one ward will replace the other wards on disk. Are you sure you want to overwrite?'
        );
      }
    } catch (e) {
      /* non-critical */
    }
  }
  return true;
}

export function finishSingleWardExport(handle, ward) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('pg:backup-saved', {
        detail: {
          fileName: handle ? handle.name : ward ? getWardFileName(ward) : 'ward.sav',
          wardId: ward && ward.wardId,
          kind: 'ward-export',
        },
      })
    );
  }
}

export async function saveBackupNow() {
  try {
    const handle = await loadCaseFileHandle();
    if (handle && handle.requestPermission) {
      const perm = await handle.requestPermission({ mode: 'readwrite' });
      if (perm === 'granted') {
        if ((await writeCaseToHandle(handle, false)) != null) await alertModal('Backup saved.');
        else await alertModal({ title: 'Not saved', message: _lastSizeRefusal || 'Nothing was saved. Try again in a moment.' });
        return;
      }
    }
  } catch (e) {
    console.warn('Reusing remembered case file failed', e);
  }
  await exportCaseFileZip();
}

export function showAutoExportReminder(firstTime) {
  if (typeof document === 'undefined') return;
  const el = document.getElementById('auto-export-reminder');
  const titleEl = document.getElementById('auto-export-reminder-title');
  const textEl = document.getElementById('auto-export-reminder-text');
  if (titleEl && textEl) {
    if (firstTime) {
      titleEl.textContent = 'Save Your First Backup';
      textEl.textContent = 'Save a .sav case file now. In Chrome or Edge, choosing a file enables automatic saving; otherwise save backups manually.';
    } else {
      titleEl.textContent = 'Unsaved Changes';
      textEl.textContent = 'You have changes since your last backup file.';
    }
  }
  if (el) el.style.display = 'flex';
}

export function hideAutoExportReminder() {
  if (typeof document === 'undefined') return;
  const el = document.getElementById('auto-export-reminder');
  if (el) el.style.display = 'none';
}

// Shows the case's save settings once startup has it: the auto-save interval
// and the last-save clock are the case's own (case-reader.js reads both from
// an opened file; a new case starts at 10 minutes, never saved). Until
// Milestone 70's 70I this read both back out of app state, where nothing had
// put them -- so an opened file's last save showed as none, and its interval
// as 10 minutes.
export async function loadAutoExportPrefs() {
  if (typeof document !== 'undefined') {
    const sel = /** @type {HTMLSelectElement|null} */ (document.getElementById('auto-export-interval-select'));
    if (sel) sel.value = String(getAutoExportIntervalMinutes());
  }
  updateLastSavedIndicator();
  refreshAutoSaveArmedStatus();
}

// The auto-save setting, saved with the case. It used to reach app state
// only, which the case file does not save, so the choice was gone at the next
// launch (Milestone 70, 70I).
export async function saveAutoExportIntervalPref(minutes) {
  setAutoExportIntervalMinutes(minutes);
  autoSave();
  setupAutoExportTimer();
}

// Despite the name, this is NOT a second autosave engine. The real autosave
// is autoSave()'s 1-second debounce (below; legacy-app.js's until Milestone
// 70's 70I), which writes after every edit. This is
// a sparse retry-and-nudge sweep: it only does anything when the debounce
// could NOT write -- no handle established yet, or write permission revoked --
// in which case it retries once and otherwise raises the reminder toast. The
// exported name is kept because startup and the interval setting call it by
// that name; only the internals are renamed.
//
// It read the module-private _dirtySinceExport here, which legacy-app.js never
// updates (it assigns its own variable, which this module sees only through
// the window accessor), so the private copy was effectively always false and
// this callback returned early every time -- the sweep never retried anything.
// isDirtySinceExport() reads the shared value.
export function setupAutoExportTimer() {
  if (_saveRetrySweepTimer) {
    clearInterval(_saveRetrySweepTimer);
    _saveRetrySweepTimer = null;
  }
  const minutes = getAutoExportIntervalMinutes();
  if (!minutes) return;
  _saveRetrySweepTimer = setInterval(async () => {
    if (!isDirtySinceExport()) return;
    const savedSilently = await silentAutoExport();
    if (!savedSilently) showAutoExportReminder();
  }, minutes * 60 * 1000);
}

export function setupLastSavedTicker() {
  if (_lastSavedTickTimer) clearInterval(_lastSavedTickTimer);
  _lastSavedTickTimer = setInterval(updateLastSavedIndicator, 30 * 1000);
}

export function setupFallbackSaveReminder() {
  if (typeof window !== 'undefined' && window.showSaveFilePicker) return;
  if (_fallbackReminderTimer) clearInterval(_fallbackReminderTimer);
  _fallbackReminderTimer = setInterval(() => {
    // Same fix as the sweep above: the private copy was never updated by
    // legacy-app.js, so this modal never appeared for the browsers that need
    // it most (no File System Access API means no background save at all).
    if (isDirtySinceExport()) {
      showModal('fallbackSaveModal');
    }
  }, 15 * 60 * 1000);
}

// Milestone 52B: the decode pipeline for one encrypted ward record, used by
// importSavArchiveOrWard() below. Deliberately has no try/catch of its own
// -- the caller wraps it to re-throw a specific per-ward message.
export async function decodeWardRecord(encoded, key) {
  // Kept as saved (Milestone 76B): text is escaped where it is shown.
  return migratePlanTriState(await decryptJSONWithKey(encoded, key));
}

// Milestone 52B: the four-field encrypt fan-out shared by
// buildCaseFileBlob() below and recovery-cache.js's
// saveSessionRestoreCache(). Returns ciphertext strings only -- each caller
// keeps deciding where its own ciphertext lands (buildCaseFileBlob() scatters
// three of them across separate zip entries and the fourth into the
// manifest; saveSessionRestoreCache() puts all four as sibling fields on one
// IndexedDB record), so this does not touch either caller's output shape.
export async function encryptCaseFileCore({ guardianInfo, parties, cases, dismissedPartyPairs }) {
  return {
    guardian: await encryptJSON(guardianInfo),
    parties: await encryptJSON(parties || []),
    cases: await encryptJSON(cases || []),
    partyDismissals: await encryptJSON(dismissedPartyPairs || []),
  };
}

// Milestone 52B: the matching decrypt side for parties/cases/partyDismissals
// only -- guardian info is deliberately NOT included here. Both callers
// already treat a corrupted guardian blob as fatal (case-file.js re-throws a
// specific "wrong password" message; recovery-cache.js lets it propagate to
// its own outer catch), and that's left exactly as it was. What WAS
// inconsistent, and is resolved here: case-file.js already tolerated a
// corrupted parties/cases/partyDismissals blob (log a warning, fall back to
// an empty array, keep going), while recovery-cache.js had no per-field
// guard at all, so the same kind of corruption there aborted the entire
// session-restore. recovery-cache.js is brought up to case-file.js's
// standard -- see MILESTONE-52-PROPOSAL.md's 52B section for why that
// direction, not the reverse. `source` only shades the console.warn text
// (e.g. "from imported file" vs "from session-restore cache").
export async function decryptCaseFileCore({ parties, cases, partyDismissals }, key, { source = '' } = {}) {
  const suffix = source ? ` ${source}` : '';
  // Present but unreadable, for protectPartiallyReadCaseFile()'s wording.
  const unreadable = [];
  let importedParties = [];
  if (parties) {
    try {
      const p = await decryptJSONWithKey(parties, key);
      if (Array.isArray(p)) importedParties = p;
    } catch (e) {
      console.warn(`Could not read parties${suffix}`, e);
      unreadable.push({ kind: 'parties' });
    }
  }
  let importedCases = [];
  if (cases) {
    try {
      const c = await decryptJSONWithKey(cases, key);
      if (Array.isArray(c)) importedCases = c;
    } catch (e) {
      console.warn(`Could not read cases${suffix}`, e);
      unreadable.push({ kind: 'cases' });
    }
  }
  let importedPartyDismissals = [];
  if (partyDismissals) {
    try {
      const d = await decryptJSONWithKey(partyDismissals, key);
      if (Array.isArray(d)) importedPartyDismissals = d;
    } catch (e) {
      console.warn(`Could not read party dismissals${suffix}`, e);
      unreadable.push({ kind: 'partyDismissals' });
    }
  }
  return {
    parties: importedParties,
    cases: importedCases,
    dismissedPartyPairs: importedPartyDismissals,
    unreadable,
  };
}


export async function saveWardToState(ward){
  if(!ward)return false;
  ward.lastModified=new Date().toISOString();
  // The ward is already live in caseFile; schedule persistence. Under the
  // unified single-file model, one autoSave() covers every ward regardless
  // of which one was actually edited -- there's no per-ward file to track.
  autoSave();
  return true;
}

export async function deleteWardFromState(wardId){
  // deleteWard() already updates the live array; schedule persistence.
  autoSave();
  return true;
}

// Every change schedules one save, a second later (a burst of edits saves
// once). Moved from legacy-app.js (Milestone 70, 70I); modules ask for it
// through the case store's requestSave(), which main.js points here.
export async function autoSave(){
  setDirtySinceExport(true);
  updateLastSavedIndicator();
  notifyProbateGuardianTabStateChanged();
  if(_saveTimer)clearTimeout(_saveTimer);
  _saveTimer=setTimeout(()=>{_saveTimer=null;saveData();},1000);
}

// Cancels any pending debounced save and saves the CURRENTLY active ward
// immediately, after committing a field still being typed in (the case
// store's commitPendingEdits(), which main.js wires to the form layer). Must be called before reassigning activeWardId/window.D —
// otherwise a save scheduled for the old ward fires after the switch and
// silently writes the new ward's data instead, losing the old edit.
export async function flushPendingSave(){
  if(_saveTimer){
    clearTimeout(_saveTimer);
    _saveTimer=null;
  }
  commitPendingEdits();
  await saveData();
}

// The persistent "could not save" banner, shown after consecutive failed
// writes (writeCaseToHandle(), above) and hidden by the next good one.
// It names the file and the way out (2026-10-20): it said only "Check your
// connection/storage and try again". The changes stay in the tab, and every
// later save -- after an edit, when the tab is hidden, the retry sweep --
// tries the file again. Dismiss (shell-events.js) hides it until the next
// failed save; its button had no handler, so it could not be closed.
export function showSaveError(fileName=''){
  if(typeof document==='undefined')return;
  const el=document.getElementById('save-error-banner');
  const text=document.getElementById('save-error-banner-text');
  if(text){
    const file=fileName?`"${fileName}"`:'the case file';
    text.textContent=`Your work could not be saved to ${file}. Your changes are still in this tab. `
      +'Use Save Backup to save them somewhere else, or check the drive and the file: the next save tries again.';
  }
  if(el)el.style.display='block';
}

export function hideSaveError(){
  if(typeof document==='undefined')return;
  const el=document.getElementById('save-error-banner');
  if(el)el.style.display='none';
}

// Captures dirty state in the temporary recovery cache, then rewrites the
// complete case file when a writable handle is available. No open handle
// is a normal pre-save state, not an error. Under the unified single-file
// model this is deliberately simple: there is exactly one handle and one
// write, covering every ward -- the old version had to separately track
// which non-active wards were dirtied off the active-ward path (dashboard
// archive toggle, workflow edits) because each ward could have its OWN
// file; that distinction no longer exists, so there is nothing left to
// track beyond the single "changed since the last save" flag (export-state.js).
//
// Returns whether it wrote the case file.
export async function saveData(){
  // Nothing should be persisted while the app is locked — there's no
  // encryption key to write with. This isn't a failure (e.g. autoSave()
  // debounced from an edit made right before auto-lock kicked in), so it
  // must not trip the save-error banner the way an actual write problem would.
  if(getSecurityMode()==='encrypted'&&!getCryptoKey())return false;
  // Milestone 76A: only a case with changes is written. A tab with nothing
  // changed wrote its whole copy each time it was hidden, locked or closed --
  // over whatever another tab had saved since.
  if(!isDirtySinceExport())return false;
  const activeWard=getActiveWard();
  if(activeWard){
    commitStoredDateDrafts(activeWard,setPath);
    activeWard.lastModified=new Date().toISOString();
  }
  // Best-effort local resume snapshot, used only by lockApp() when the app
  // auto-locks before any .sav has ever been saved (see recovery-cache.js's
  // file header); a successful .sav write clears it. Awaited so callers
  // that depend on it having landed before acting further (lockApp() wiping
  // memory, beforeunload) aren't racing an in-flight IndexedDB write.
  if(isDirtySinceExport()){
    // This is only a best-effort crash-recovery snapshot. It is not the
    // durable .sav case file, so an IndexedDB/cache failure must not look
    // like a failed case-file save (and must not clear a real write error).
    await saveSessionRestoreCache();
  }
  // No "last saved" stamp here: at this point no handle has been checked,
  // no permission verified, and no write attempted. writeCaseToHandle()
  // records the save once it has actually written one.
  const handle=await loadCaseFileHandle();
  if(!handle)return false;
  try{
    const perm=await handle.queryPermission({mode:'readwrite'});
    if(perm!=='granted'){
      await refreshAutoSaveArmedStatus();
      return false;
    }
    // Failure counting and the error banner live in writeCaseToHandle() so
    // every caller reports a failed write identically.
    return (await writeCaseToHandle(handle,true))!=null;
  }catch(e){
    console.error('save failed',e);
    return false;
  }
}

// Save before the page goes: on unload, and whenever the tab is hidden.
// Installed once by main.js (Milestone 70, 70I), not when the code loads.
/** @param {{ signal?: AbortSignal }} [options] */
export function installSaveListeners({signal}={}){
  writesChannel(); // hear other tabs' saves from the start (Milestone 76A)
  window.addEventListener('beforeunload',flushPendingSave,{signal});
  document.addEventListener('visibilitychange',()=>{
    if(document.hidden)flushPendingSave();
    else updateLastSavedIndicator(); // background tabs throttle the 30s ticker, so the "X minutes ago" text can go stale while hidden
  },{signal});
}
