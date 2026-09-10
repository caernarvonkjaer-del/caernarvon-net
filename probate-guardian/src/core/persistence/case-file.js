// Canonical .sav ZIP packaging, File System Access API handles, and export/import operations.
import {
  encryptJSON,
  decryptJSONWithKey,
  getSecurityMode,
  getCryptoKey,
  deriveKeyFromPassword,
} from './crypto.js';
import {
  loadAppState,
  saveAppState,
  savePersistedCaseFileHandle,
  loadPersistedCaseFileHandle,
  forgetPersistedCaseFileHandle,
  markCaseOpenedBefore,
} from './launch-preferences.js';
import { clearSessionRestoreCache } from './recovery-cache.js';
import { getCaseFile, getTemplateCache } from '../state.js';
import { migratePlanTriState } from '../filing/plan-tristate.js';

export const CASE_FILE_FORMAT_VERSION = 1;

let _caseFileHandle = null;
let _autoSaveArmed = false;
let _autoExportIntervalMinutes = 10;
let _lastExportAt = null;
let _autoExportTimer = null;
let _lastSavedTickTimer = null;
let _fallbackReminderTimer = null;
let _dirtySinceExport = false;

export function getCaseFileHandle() {
  if (typeof window !== 'undefined' && window._caseFileHandle !== undefined) {
    return window._caseFileHandle;
  }
  return _caseFileHandle;
}

export function setCaseFileHandle(handle) {
  _caseFileHandle = handle;
  if (typeof window !== 'undefined') {
    window._caseFileHandle = handle;
  }
}

export function isAutoSaveArmed() {
  return _autoSaveArmed;
}

export function isDirtySinceExport() {
  if (typeof window !== 'undefined' && window._dirtySinceExport !== undefined) {
    return window._dirtySinceExport;
  }
  return _dirtySinceExport;
}

export function setDirtySinceExport(dirty) {
  _dirtySinceExport = dirty;
  if (typeof window !== 'undefined') {
    window._dirtySinceExport = dirty;
  }
}

export async function saveBlobAs(blob, suggestedName, preWriteValidator) {
  if (typeof window !== 'undefined' && window.showSaveFilePicker) {
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName,
        types: [{ description: 'Probate Guardian data file', accept: { 'application/octet-stream': ['.sav'] } }],
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
  setCaseFileHandle(null);
  await forgetPersistedCaseFileHandle();
  await refreshAutoSaveArmedStatus();
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
    }
  }
}

function getJSZip() {
  if (typeof window !== 'undefined' && window.JSZip) {
    return window.JSZip;
  }
  throw new Error('JSZip library unavailable');
}

export async function buildCaseFileBlob() {
  if (typeof window !== 'undefined' && window._saveTimer) {
    clearTimeout(window._saveTimer);
    window._saveTimer = null;
  }
  const salt = (await loadAppState('cryptoSalt')) || null;
  const verifier = (await loadAppState('cryptoVerifier')) || null;
  const JSZip = getJSZip();
  const zip = new JSZip();
  const wardIndex = [];
  const caseFile = getCaseFile();

  for (const ward of (caseFile.wards || [])) {
    const file = `wards/${ward.wardId}.enc`;
    zip.file(file, await encryptJSON(ward));
    wardIndex.push({ wardId: ward.wardId, wardName: ward.wardName || '', file });
  }

  const appStateBlob = {
    activeWardId: caseFile.activeWardId,
    theme: await loadAppState('theme'),
    walkthroughCompleted: await loadAppState('walkthroughCompleted'),
    firstLaunchSeen: await loadAppState('firstLaunchSeen'),
    continuePromptShown: await loadAppState('continuePromptShown'),
    recentWards: await loadAppState('recentWards'),
    autoExportIntervalMinutes: (typeof window !== 'undefined' && window._autoExportIntervalMinutes !== undefined) ? window._autoExportIntervalMinutes : _autoExportIntervalMinutes,
    lastExportAt: (typeof window !== 'undefined' && window._lastExportAt !== undefined) ? window._lastExportAt : _lastExportAt,
    unlockFailState: await loadAppState('unlockFailState'),
  };

  const templateCache = getTemplateCache();
  const templateTypes = Object.keys(templateCache).filter((t) => templateCache[t]);
  for (const type of templateTypes) {
    zip.file(`templates/${type}.b64`, templateCache[type]);
  }

  const auditLogEntries = (typeof window !== 'undefined' && window._auditLogEntries) || [];
  zip.file('auditLog.enc', await encryptJSON(auditLogEntries));
  zip.file('parties.enc', await encryptJSON(caseFile.parties || []));
  zip.file('cases.enc', await encryptJSON(caseFile.cases || []));
  zip.file('partyDismissals.enc', await encryptJSON(caseFile.dismissedPartyPairs || []));
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

  const auditLogEntries = (typeof window !== 'undefined' && window._auditLogEntries) || [];
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
        wards: [{ wardId: ward.wardId, wardName: ward.wardName || '', file: `wards/${ward.wardId}.enc` }],
      },
      null,
      2
    )
  );

  const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
  return blob;
}

function formatRelativeTime(ts) {
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
  if (typeof window !== 'undefined' && typeof window.notifyProbateGuardianTabStateChanged === 'function') {
    window.notifyProbateGuardianTabStateChanged();
  }
}

export function updateLastSavedIndicator() {
  if (typeof document === 'undefined') return;
  const el = document.getElementById('last-saved-indicator');
  if (!el) return;
  const dirty = isDirtySinceExport();
  const lastExport = (typeof window !== 'undefined' && window._lastExportAt !== undefined) ? window._lastExportAt : _lastExportAt;
  if (dirty) {
    el.textContent = '● Unsaved changes';
    el.style.color = 'var(--warn-text)';
  } else if (lastExport) {
    el.textContent = `✓ Last backup: ${formatRelativeTime(lastExport)}`;
    el.style.color = 'var(--ok-text)';
  } else {
    el.textContent = 'No backup saved yet';
    el.style.color = 'var(--ink-3)';
  }
}

export async function beginRecordingExport(message, wardId = null) {
  const previousLastExportAt = _lastExportAt;
  const auditEntries = (typeof window !== 'undefined' && window._auditLogEntries) || [];
  const auditLenBefore = auditEntries.length;
  _lastExportAt = Date.now();
  if (typeof window !== 'undefined') {
    if (window._appState) window._appState.lastExportAt = _lastExportAt;
    if (typeof window.auditLog === 'function') {
      await window.auditLog('DATA_EXPORT', message, true, wardId);
    }
  }
  return function rollback() {
    _lastExportAt = previousLastExportAt;
    if (typeof window !== 'undefined') {
      if (window._appState) window._appState.lastExportAt = previousLastExportAt;
      if (window._auditLogEntries) window._auditLogEntries.length = auditLenBefore;
    }
  };
}

export async function exportCaseFileZip() {
  const caseFile = getCaseFile();
  if (!caseFile.wards || caseFile.wards.length === 0) {
    alert('No wards to back up. Please add or open a ward first.');
    return;
  }
  if (typeof window !== 'undefined' && typeof window.JSZip === 'undefined') {
    alert('ZIP library failed to load — cannot export.');
    return;
  }
  const count = caseFile.wards.length;
  let rollback = null;
  try {
    rollback = await beginRecordingExport(`Exported ${count} form(s) to backup file`);
    const { blob } = await buildCaseFileBlob();
    const suggestedName = suggestedCaseFileName();
    const handle = await saveBlobAs(blob, suggestedName);
    if (handle) {
      await rememberCaseFileHandle(handle);
      clearSessionRestoreCache();
      markCaseOpenedBefore();
    }
    setDirtySinceExport(false);
    hideAutoExportReminder();
    updateLastSavedIndicator();
    if (typeof window !== 'undefined' && typeof window.notifyProbateGuardianTabStateChanged === 'function') {
      window.notifyProbateGuardianTabStateChanged();
    }
    const savedName = handle ? handle.name : suggestedName;
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('pg:backup-saved', { detail: { fileName: savedName, count } }));
    }
    alert(`Backup complete: ${count} form(s) saved to ${savedName}`);
  } catch (e) {
    if (rollback) rollback();
    if (e && e.name === 'AbortError') return;
    console.error('export failed', e);
    if (typeof window !== 'undefined' && typeof window.auditLog === 'function') {
      window.auditLog('DATA_EXPORT', String((e && e.message) || e), false);
    }
    alert('Export failed: ' + ((e && e.message) || e));
  }
}

export async function writeCaseToHandle(handle, viaTimer) {
  const caseFile = getCaseFile();
  const count = (caseFile.wards || []).length;
  const message = viaTimer
    ? `Auto-saved ${count} form(s) in the background`
    : `Saved ${count} form(s) to existing backup file`;
  const rollback = await beginRecordingExport(message);
  try {
    const { blob } = await buildCaseFileBlob();
    const writable = await handle.createWritable();
    await writable.write(blob);
    await writable.close();
  } catch (e) {
    rollback();
    throw e;
  }
  setDirtySinceExport(false);
  clearSessionRestoreCache();
  hideAutoExportReminder();
  await refreshAutoSaveArmedStatus();
  updateLastSavedIndicator();
  if (typeof window !== 'undefined') {
    if (typeof window.notifyProbateGuardianTabStateChanged === 'function') {
      window.notifyProbateGuardianTabStateChanged();
    }
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
        return confirm(
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
        await writeCaseToHandle(handle, false);
        alert('Backup saved.');
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
      textEl.textContent = "It only takes a moment, and protects your case's data if something happens to this browser.";
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

export async function loadAutoExportPrefs() {
  try {
    const savedMinutes = await loadAppState('autoExportIntervalMinutes');
    _autoExportIntervalMinutes = savedMinutes === null || savedMinutes === undefined ? 10 : Number(savedMinutes);
    const savedLast = await loadAppState('lastExportAt');
    _lastExportAt = savedLast ? Number(savedLast) : null;
  } catch (e) {
    console.warn('Could not load auto-export preferences', e);
  }
  if (typeof document !== 'undefined') {
    const sel = document.getElementById('auto-export-interval-select');
    if (sel) sel.value = String(_autoExportIntervalMinutes);
  }
  updateLastSavedIndicator();
  refreshAutoSaveArmedStatus();
}

export async function saveAutoExportIntervalPref(minutes) {
  _autoExportIntervalMinutes = minutes;
  try {
    await saveAppState('autoExportIntervalMinutes', minutes);
  } catch (e) {
    /* non-critical */
  }
  setupAutoExportTimer();
}

export function setupAutoExportTimer() {
  if (_autoExportTimer) {
    clearInterval(_autoExportTimer);
    _autoExportTimer = null;
  }
  if (!_autoExportIntervalMinutes) return;
  _autoExportTimer = setInterval(async () => {
    if (!_dirtySinceExport) return;
    const savedSilently = await silentAutoExport();
    if (!savedSilently) showAutoExportReminder();
  }, _autoExportIntervalMinutes * 60 * 1000);
}

export function setupLastSavedTicker() {
  if (_lastSavedTickTimer) clearInterval(_lastSavedTickTimer);
  _lastSavedTickTimer = setInterval(updateLastSavedIndicator, 30 * 1000);
}

export function setupFallbackSaveReminder() {
  if (typeof window !== 'undefined' && window.showSaveFilePicker) return;
  if (_fallbackReminderTimer) clearInterval(_fallbackReminderTimer);
  _fallbackReminderTimer = setInterval(() => {
    if (_dirtySinceExport && typeof window.showModal === 'function') {
      window.showModal('fallbackSaveModal');
    }
  }, 15 * 60 * 1000);
}

export async function triggerImportZip() {
  if (typeof window !== 'undefined' && window.showOpenFilePicker) {
    try {
      const [handle] = await window.showOpenFilePicker({
        types: [{ description: 'Probate Guardian case file (.sav)', accept: { 'application/octet-stream': ['.sav', '.zip'] } }],
      });
      const file = await handle.getFile();
      await importSavArchiveOrWard(file, { handle, isBackupFlow: false });
      return;
    } catch (e) {
      if (e && e.name === 'AbortError') return;
      console.warn('showOpenFilePicker failed or cancelled, falling back to input', e);
    }
  }
  if (typeof document !== 'undefined') {
    const inp = document.getElementById('zip-import-input');
    if (inp) {
      inp.value = '';
      inp.click();
    }
  }
}

function sanitizeObjectData(obj) {
  if (typeof window !== 'undefined' && typeof window.sanitizeObjectData === 'function') {
    return window.sanitizeObjectData(obj);
  }
  return obj;
}

export async function importSavArchiveOrWard(file, options = {}) {
  const { handle = null, isBackupFlow = false } = options;
  try {
    const JSZip = getJSZip();
    if (typeof window !== 'undefined' && typeof window.validateImportFile === 'function') {
      const check = await window.validateImportFile(file, 'sav');
      if (!check.ok) {
        alert(check.message);
        return false;
      }
    }
    const securityMode = getSecurityMode();
    let cryptoKey = getCryptoKey();
    if (securityMode === 'encrypted' && !cryptoKey) {
      alert('Please unlock the app before importing a data file.');
      return false;
    }
    const zip = await JSZip.loadAsync(file);
    const manifestEntry = zip.file('manifest.json');
    if (!manifestEntry) throw new Error('Not a Probate Guardian data file (no manifest.json inside).');
    const manifest = JSON.parse(await manifestEntry.async('string'));
    if (manifest.format !== 'probate-guardian-case') throw new Error('Not a Probate Guardian data file.');

    const currentSalt = await loadAppState('cryptoSalt');
    let key = cryptoKey;
    if (manifest.securityMode !== 'none' && manifest.salt !== currentSalt) {
      const pw = prompt('This file came from a different installation.\nEnter the master password that was in use when it was exported:');
      if (!pw) return false;
      key = await deriveKeyFromPassword(pw, manifest.salt);
    }

    let guardianInfo = null;
    if (manifest.guardian) {
      try {
        guardianInfo = await decryptJSONWithKey(manifest.guardian, key);
      } catch (e) {
        throw new Error('Wrong password for this file, or the file has been modified/corrupted.');
      }
    }

    const imported = [];
    for (const entry of Array.isArray(manifest.wards) ? manifest.wards : []) {
      const f = zip.file(entry.file);
      if (!f) {
        console.warn('Case file entry missing:', entry.file);
        continue;
      }
      let ward;
      try {
        ward = migratePlanTriState(sanitizeObjectData(await decryptJSONWithKey(await f.async('string'), key)));
      } catch (err) {
        throw new Error(`The file's data for "${entry.file}" has been modified or corrupted since it was saved — nothing was imported.`);
      }
      if (ward && ward.wardId) imported.push(ward);
    }

    let importedParties = [];
    let importedCases = [];
    const importedPartiesFile = zip.file('parties.enc');
    if (importedPartiesFile) {
      try {
        const p = await decryptJSONWithKey(await importedPartiesFile.async('string'), key);
        if (Array.isArray(p)) importedParties = p;
      } catch (e) {
        console.warn('Could not read parties from imported file', e);
      }
    }
    const importedCasesFile = zip.file('cases.enc');
    if (importedCasesFile) {
      try {
        const c = await decryptJSONWithKey(await importedCasesFile.async('string'), key);
        if (Array.isArray(c)) importedCases = c;
      } catch (e) {
        console.warn('Could not read cases from imported file', e);
      }
    }
    let importedPartyDismissals = [];
    const importedPartyDismissalsFile = zip.file('partyDismissals.enc');
    if (importedPartyDismissalsFile) {
      try {
        const d = await decryptJSONWithKey(await importedPartyDismissalsFile.async('string'), key);
        if (Array.isArray(d)) importedPartyDismissals = d;
      } catch (e) {
        console.warn('Could not read party dismissals from imported file', e);
      }
    }
    if (!imported.length && !guardianInfo) throw new Error('File contained no readable data.');

    const caseFile = getCaseFile();
    const replacing = imported.filter((w) => caseFile.wards.some((x) => x.wardId === w.wardId)).length;
    const adding = imported.length - replacing;
    const promptText = isBackupFlow
      ? caseFile.wards.length === 0
        ? `Open backup containing ${imported.length} ward(s) from "${file.name}"?`
        : `Restore backup containing ${imported.length} ward(s) from "${file.name}"?\n\n• ${adding} new ward(s)\n• ${replacing} existing ward(s) will be updated\n\nDo you want to proceed?`
      : `Import ${imported.length} form(s) from "${file.name}"?\n\n• ${adding} new form(s)\n• ${replacing} will replace existing form(s) with the same ID`;
    if (!confirm(promptText)) return false;

    if (typeof window !== 'undefined' && typeof window.flushPendingSave === 'function') {
      await window.flushPendingSave();
    }

    const nextWards = [...caseFile.wards];
    for (const ward of imported) {
      const idx = nextWards.findIndex((x) => x.wardId === ward.wardId);
      if (idx >= 0) nextWards[idx] = ward;
      else nextWards.push(ward);
    }
    caseFile.wards = nextWards;

    if (!Array.isArray(caseFile.parties)) caseFile.parties = [];
    for (const party of importedParties) {
      if (party && party.id && !caseFile.parties.some((p) => p.id === party.id)) caseFile.parties.push(party);
    }
    if (!Array.isArray(caseFile.cases)) caseFile.cases = [];
    for (const c of importedCases) {
      if (c && c.id && !caseFile.cases.some((x) => x.id === c.id)) caseFile.cases.push(c);
    }
    if (!Array.isArray(caseFile.dismissedPartyPairs)) caseFile.dismissedPartyPairs = [];
    for (const pair of importedPartyDismissals) {
      if (Array.isArray(pair) && !caseFile.dismissedPartyPairs.some((p) => p[0] === pair[0] && p[1] === pair[1])) {
        caseFile.dismissedPartyPairs.push(pair);
      }
    }

    for (const ward of imported) {
      if (typeof window !== 'undefined' && typeof window.saveWardToState === 'function') {
        await window.saveWardToState(ward);
      }
    }
    if (guardianInfo && guardianInfo.guardianName) caseFile.guardianName = guardianInfo.guardianName;
    if (guardianInfo && guardianInfo.guardianEmail) caseFile.guardianEmail = guardianInfo.guardianEmail;

    if (typeof window !== 'undefined' && typeof window.saveData === 'function') {
      await window.saveData();
    }

    if (typeof window !== 'undefined' && typeof window.switchWard === 'function') {
      if (caseFile.activeWardId && caseFile.wards.some((w) => w.wardId === caseFile.activeWardId)) {
        await window.switchWard(caseFile.activeWardId);
      } else if (caseFile.wards.length) {
        await window.switchWard(caseFile.wards[0].wardId);
      } else if (typeof window.updateSidebar === 'function') {
        window.updateSidebar();
      }
    }

    if (handle) {
      await rememberCaseFileHandle(handle);
    }

    const auditMsg = isBackupFlow
      ? `Restored backup containing ${imported.length} ward(s) from "${file.name}"`
      : `Imported ${imported.length} form(s) from "${file.name}"`;
    if (typeof window !== 'undefined' && typeof window.auditLog === 'function') {
      await window.auditLog('DATA_IMPORT', auditMsg, true);
    }

    setDirtySinceExport(false);
    clearSessionRestoreCache();
    hideAutoExportReminder();
    updateLastSavedIndicator();
    if (typeof window !== 'undefined' && typeof window.notifyProbateGuardianTabStateChanged === 'function') {
      window.notifyProbateGuardianTabStateChanged();
    }

    if (isBackupFlow) {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('pg:backup-restored', {
            detail: { fileName: file.name, count: imported.length },
          })
        );
        if (typeof window.navigate === 'function') await window.navigate('/dashboard');
      }
      alert(`Backup restored: ${imported.length} ward(s) loaded.`);
    } else {
      alert(`Import complete: ${imported.length} form(s) loaded.`);
    }
    return true;
  } catch (e) {
    console.error('Import failed', e);
    if (typeof window !== 'undefined' && typeof window.auditLog === 'function') {
      window.auditLog('DATA_IMPORT', String((e && e.message) || e), false);
    }
    alert((isBackupFlow ? 'Could not open backup file: ' : 'Import failed: ') + ((e && e.message) || e));
    return false;
  }
}

export async function importGuardianDataZip(file) {
  return importSavArchiveOrWard(file, { isBackupFlow: false });
}

export async function triggerOpenBackupSav() {
  if (typeof window !== 'undefined' && window.showOpenFilePicker) {
    try {
      const [handle] = await window.showOpenFilePicker({
        types: [{ description: 'Probate Guardian backup file (.sav)', accept: { 'application/octet-stream': ['.sav', '.zip'] } }],
      });
      const file = await handle.getFile();
      await restoreBackupSavFile(file, handle);
      return;
    } catch (e) {
      if (e && e.name === 'AbortError') return;
      console.warn('showOpenFilePicker failed or cancelled, falling back to input', e);
    }
  }
  if (typeof document !== 'undefined') {
    const inp = document.getElementById('backup-import-input');
    if (inp) {
      inp.value = '';
      inp.click();
    }
  }
}

export async function handleBackupImportChange(input) {
  const file = input.files?.[0];
  input.value = '';
  if (!file) return;
  await restoreBackupSavFile(file, null);
}

export async function restoreBackupSavFile(file, handle) {
  return importSavArchiveOrWard(file, { handle, isBackupFlow: true });
}

// Global bridge for legacy scripts and test harnesses
if (typeof window !== 'undefined') {
  window.CASE_FILE_FORMAT_VERSION = CASE_FILE_FORMAT_VERSION;
  window.saveBlobAs = saveBlobAs;
  window.rememberCaseFileHandle = rememberCaseFileHandle;
  window.suggestedCaseFileName = suggestedCaseFileName;
  window.loadCaseFileHandle = loadCaseFileHandle;
  window.forgetCaseFileHandle = forgetCaseFileHandle;
  window.refreshAutoSaveArmedStatus = refreshAutoSaveArmedStatus;
  window.buildCaseFileBlob = buildCaseFileBlob;
  window.buildSingleWardExportBlob = buildSingleWardExportBlob;
  window.exportCaseFileZip = exportCaseFileZip;
  window.exportGuardianDataZip = exportCaseFileZip;
  window.backupAllWardsNow = exportCaseFileZip;
  window.writeCaseToHandle = writeCaseToHandle;
  window.silentAutoExport = silentAutoExport;
  window.getWardFileStem = getWardFileStem;
  window.getWardFileName = getWardFileName;
  window.validateWardBackupOverwrite = validateWardBackupOverwrite;
  window.finishSingleWardExport = finishSingleWardExport;
  window.saveBackupNow = saveBackupNow;
  window.showAutoExportReminder = showAutoExportReminder;
  window.hideAutoExportReminder = hideAutoExportReminder;
  window.loadAutoExportPrefs = loadAutoExportPrefs;
  window.saveAutoExportIntervalPref = saveAutoExportIntervalPref;
  window.setupAutoExportTimer = setupAutoExportTimer;
  window.setupLastSavedTicker = setupLastSavedTicker;
  window.setupFallbackSaveReminder = setupFallbackSaveReminder;
  window.triggerImportZip = triggerImportZip;
  window.importSavArchiveOrWard = importSavArchiveOrWard;
  window.importGuardianDataZip = importGuardianDataZip;
  window.triggerOpenBackupSav = triggerOpenBackupSav;
  window.handleBackupImportChange = handleBackupImportChange;
  window.restoreBackupSavFile = restoreBackupSavFile;
  window.updateLastSavedIndicator = updateLastSavedIndicator;
  window.markDirtySinceExport = markDirtySinceExport;
  window.beginRecordingExport = beginRecordingExport;
}
