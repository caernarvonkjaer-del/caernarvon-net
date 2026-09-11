// Crash recovery and session-restore cache stored in IndexedDB (pg-session-cache).
import { encryptJSON, decryptJSONWithKey, deriveAndVerifyKey, getSecurityMode, getCryptoKey, setCryptoKey } from './crypto.js';
import { loadAppState, saveAppState } from './launch-preferences.js';
import { getCaseFile, setAppState } from '../state.js';
import { migratePlanTriState } from '../filing/plan-tristate.js';

export const SESSION_CACHE_DB = 'pg-session-cache';
export const SESSION_CACHE_STORE = 'snapshot';

export function _sessionCacheDb() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      return reject(new Error('IndexedDB not supported'));
    }
    const req = indexedDB.open(SESSION_CACHE_DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(SESSION_CACHE_STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
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
  try {
    const db = await _sessionCacheDb();
    await new Promise((resolve) => {
      const tx = db.transaction(SESSION_CACHE_STORE, 'readwrite');
      tx.objectStore(SESSION_CACHE_STORE).put(val, 'current');
      tx.oncomplete = resolve;
      tx.onerror = resolve;
    });
  } catch (e) {
    /* non-critical */
  }
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
  if (securityMode === 'encrypted' && !cryptoKey) return;
  const caseFile = getCaseFile();
  if (!caseFile.wards || !caseFile.wards.length) return; // nothing worth recovering yet

  try {
    const salt = await loadAppState('cryptoSalt');
    const verifier = await loadAppState('cryptoVerifier');
    const wards = [];
    for (const ward of caseFile.wards) {
      wards.push({ wardId: ward.wardId, enc: await encryptJSON(ward) });
    }
    const guardian = await encryptJSON({
      guardianName: caseFile.guardianName,
      guardianEmail: caseFile.guardianEmail,
    });
    const parties = await encryptJSON(caseFile.parties || []);
    const cases = await encryptJSON(caseFile.cases || []);
    const partyDismissals = await encryptJSON(caseFile.dismissedPartyPairs || []);
    await _sessionCachePut({
      savedAt: Date.now(),
      securityMode,
      salt: salt || null,
      verifier: verifier || null,
      guardian,
      wards,
      parties,
      cases,
      partyDismissals,
    });
  } catch (e) {
    console.warn('session-restore cache write failed', e);
  }
}

export async function clearSessionRestoreCache() {
  await _sessionCacheClear();
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

function sanitizeObjectData(obj) {
  if (typeof window !== 'undefined' && typeof window.sanitizeObjectData === 'function') {
    return window.sanitizeObjectData(obj);
  }
  return obj;
}

export async function checkSessionRestoreCacheAtLaunch() {
  let cache;
  try {
    cache = await _sessionCacheGet();
  } catch (e) {
    return false;
  }
  if (!cache || !Array.isArray(cache.wards) || !cache.wards.length) return false;
  const proceed = confirm(
    `This browser has unsaved work from a previous session (last changed ${formatRelativeTime(cache.savedAt)}) that was never saved to a .sav file — most likely because the tab was closed or crashed before a backup was made.\n\n` +
      'Click OK to restore that work now, or Cancel to discard it and start fresh.'
  );
  if (!proceed) {
    await clearSessionRestoreCache();
    return false;
  }
  try {
    let key = null;
    if (cache.securityMode === 'encrypted') {
      const pw = prompt('Enter the master password to restore this session:');
      if (!pw) return false; // leave cache in place
      key = await deriveAndVerifyKey(pw, { salt: cache.salt, verifier: cache.verifier, guardian: cache.guardian }, null);
    }
    const restoredWards = [];
    for (const w of cache.wards) {
      const ward = migratePlanTriState(sanitizeObjectData(await decryptJSONWithKey(w.enc, key)));
      if (ward && ward.wardId) restoredWards.push(ward);
    }
    if (!restoredWards.length) throw new Error('Archive contained no readable data.');
    const g = await decryptJSONWithKey(cache.guardian, key);
    const caseFile = getCaseFile();
    caseFile.wards = restoredWards;
    caseFile.guardianName = (g && g.guardianName) || '';
    caseFile.guardianEmail = (g && g.guardianEmail) || '';
    caseFile.parties = cache.parties ? (await decryptJSONWithKey(cache.parties, key)) || [] : [];
    caseFile.cases = cache.cases ? (await decryptJSONWithKey(cache.cases, key)) || [] : [];
    caseFile.dismissedPartyPairs = cache.partyDismissals ? (await decryptJSONWithKey(cache.partyDismissals, key)) || [] : [];
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
    alert(`Restored ${restoredWards.length} form(s) from your last unsaved session. Please save a backup file now.`);
    return true;
  } catch (e) {
    console.error('session restore failed', e);
    alert('Could not restore the previous session (wrong password, or the cached data is corrupted). It has been left in place; you can try again next time the app opens.');
    return false;
  }
}

// Global bridge for legacy scripts and test harnesses
if (typeof window !== 'undefined') {
  window.saveSessionRestoreCache = saveSessionRestoreCache;
  window.clearSessionRestoreCache = clearSessionRestoreCache;
  window.checkSessionRestoreCacheAtLaunch = checkSessionRestoreCacheAtLaunch;
}
