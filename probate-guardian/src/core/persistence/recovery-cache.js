// Crash recovery and session-restore cache stored in IndexedDB (pg-session-cache).
import { encryptJSON, decryptJSONWithKey, deriveAndVerifyKey, getSecurityMode, getCryptoKey, setCryptoKey } from './crypto.js';
import { loadAppState, openIndexedDbStore, saveAppState } from './launch-preferences.js';
import { getCaseFile, setAppState } from '../state.js';
import { formatRelativeTime, decodeWardRecord, encryptCaseFileCore, decryptCaseFileCore } from './case-file.js';
import { alertModal, confirmModal, promptModal } from '../ui/dialogs.js';

export const SESSION_CACHE_DB = 'pg-session-cache';
export const SESSION_CACHE_STORE = 'snapshot';

export function _sessionCacheDb() {
  return openIndexedDbStore(SESSION_CACHE_DB, SESSION_CACHE_STORE);
}

export async function _sessionCacheGet() {
  try {
    const db = await _sessionCacheDb();
    return await new Promise((resolve) => {
      const req = db.transaction(SESSION_CACHE_STORE, 'readonly').objectStore(SESSION_CACHE_STORE).get('current');
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
  } catch (e) {
    return null;
  }
}

export async function _sessionCachePut(val) {
  const db = await _sessionCacheDb();
  await new Promise((resolve, reject) => {
    const tx = db.transaction(SESSION_CACHE_STORE, 'readwrite');
    tx.objectStore(SESSION_CACHE_STORE).put(val, 'current');
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error || new Error('Local resume write failed'));
    tx.onabort = () => reject(tx.error || new Error('Local resume write aborted'));
  });
}

export async function _sessionCacheClear() {
  try {
    const db = await _sessionCacheDb();
    await new Promise((resolve) => {
      const tx = db.transaction(SESSION_CACHE_STORE, 'readwrite');
      tx.objectStore(SESSION_CACHE_STORE).delete('current');
      tx.oncomplete = resolve;
      tx.onerror = resolve;
    });
  } catch (e) {
    /* non-critical */
  }
}

export async function saveSessionRestoreCache() {
  const securityMode = getSecurityMode();
  const cryptoKey = getCryptoKey();
  if (securityMode === 'encrypted' && !cryptoKey) return false;
  const caseFile = getCaseFile();
  if (!caseFile.wards || !caseFile.wards.length) return false; // nothing worth recovering yet

  try {
    const salt = await loadAppState('cryptoSalt');
    const verifier = await loadAppState('cryptoVerifier');
    const wards = [];
    for (const ward of caseFile.wards) {
      wards.push({ wardId: ward.wardId, enc: await encryptJSON(ward) });
    }
    const core = await encryptCaseFileCore({
      guardianInfo: { guardianName: caseFile.guardianName, guardianEmail: caseFile.guardianEmail },
      parties: caseFile.parties,
      cases: caseFile.cases,
      dismissedPartyPairs: caseFile.dismissedPartyPairs,
    });
    await _sessionCachePut({
      savedAt: Date.now(),
      securityMode,
      salt: salt || null,
      verifier: verifier || null,
      guardian: core.guardian,
      wards,
      parties: core.parties,
      cases: core.cases,
      partyDismissals: core.partyDismissals,
    });
    return true;
  } catch (e) {
    console.warn('session-restore cache write failed', e);
    return false;
  }
}

export async function clearSessionRestoreCache() {
  await _sessionCacheClear();
}

export async function checkSessionRestoreCacheAtLaunch({ confirmRestore = true } = {}) {
  let cache;
  try {
    cache = await _sessionCacheGet();
  } catch (e) {
    return false;
  }
  if (!cache || !Array.isArray(cache.wards) || !cache.wards.length) return false;
  if (confirmRestore) {
    const proceed = await confirmModal(
      `This browser has a locally protected filing from ${formatRelativeTime(cache.savedAt)}. Restore it on this device?`
    );
    if (!proceed) return false;
  }
  try {
    let key = null;
    if (cache.securityMode === 'encrypted') {
      const pw = await promptModal('Enter the master password to restore this session:');
      if (!pw) return false; // leave cache in place
      key = await deriveAndVerifyKey(pw, { salt: cache.salt, verifier: cache.verifier, guardian: cache.guardian }, null);
    }
    const restoredWards = [];
    for (const w of cache.wards) {
      const ward = await decodeWardRecord(w.enc, key);
      if (ward && ward.wardId) restoredWards.push(ward);
    }
    if (!restoredWards.length) throw new Error('Archive contained no readable data.');
    const g = await decryptJSONWithKey(cache.guardian, key);
    const { parties, cases, dismissedPartyPairs } = await decryptCaseFileCore(
      { parties: cache.parties, cases: cache.cases, partyDismissals: cache.partyDismissals },
      key,
      { source: 'from session-restore cache' },
    );
    const caseFile = getCaseFile();
    caseFile.wards = restoredWards;
    caseFile.guardianName = (g && g.guardianName) || '';
    caseFile.guardianEmail = (g && g.guardianEmail) || '';
    caseFile.parties = parties;
    caseFile.cases = cases;
    caseFile.dismissedPartyPairs = dismissedPartyPairs;
    // Milestone 54: selectedCircuit deliberately NOT restored here -- it now
    // lives in the appState blob (case-file.js's buildCaseFileBlob()
    // comment), which crash recovery has never carried, same as theme or
    // walkthroughCompleted. caseFile is freshly initialized by getCaseFile()
    // before this runs, so it already holds state.js's default (6).
    caseFile.activeWardId = null;

    setCryptoKey(key);
    setAppState('securityMode', cache.securityMode);
    setAppState('cryptoSalt', cache.salt);
    setAppState('cryptoVerifier', cache.verifier);

    if (typeof window !== 'undefined') {
      window._launchStateResolved = true;
      window._openedFileAtLaunch = true;
      window._dirtySinceExport = true;
      if (typeof window.updateLastSavedIndicator === 'function') window.updateLastSavedIndicator();
      if (typeof window.notifyProbateGuardianTabStateChanged === 'function') window.notifyProbateGuardianTabStateChanged();
    }
    await alertModal(`Restored ${restoredWards.length} form(s) from this device. Keep a separate .sav backup in case browser storage is cleared.`);
    return true;
  } catch (e) {
    console.error('session restore failed', e);
    await alertModal('Could not restore the previous session (wrong password, or the cached data is corrupted). It has been left in place; you can try again next time the app opens.');
    return false;
  }
}

// Global bridge for legacy scripts and test harnesses
if (typeof window !== 'undefined') {
  window.saveSessionRestoreCache = saveSessionRestoreCache;
  window.clearSessionRestoreCache = clearSessionRestoreCache;
  window.checkSessionRestoreCacheAtLaunch = checkSessionRestoreCacheAtLaunch;
}
