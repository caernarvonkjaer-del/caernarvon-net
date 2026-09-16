// Launch preferences and persistent file handles stored in IndexedDB (pg-launch-pref).
import { getAppState, setAppState } from '../state.js';

export const LAUNCH_PREF_DB = 'pg-launch-pref';
export const LAUNCH_PREF_STORE = 'flags';
export const LAUNCH_PREF_KEY_OPENED = 'hasOpenedBefore';
export const LAUNCH_PREF_KEY_HANDLE = 'zipFileHandle';
export const REMEMBERED_FILE_TIMEOUT_MS = 10000;

let _rememberedFileUnavailable = false;

export function isRememberedFileUnavailable() {
  return _rememberedFileUnavailable;
}

export function setRememberedFileUnavailable(val) {
  _rememberedFileUnavailable = val;
}

// Milestone 52C: the one IndexedDB open-with-one-object-store routine, shared
// with recovery-cache.js's _sessionCacheDb(). It lives here because this is
// the lower-level of the two modules -- recovery-cache.js already imports from
// it, not the reverse.
//
// Deliberately the opener ONLY. The two modules' get/put/delete wrappers look
// similar but encode different, load-bearing error contracts: this file's take
// an explicit key and let a failure reject (its callers handle that), while
// recovery-cache.js's hardcode the 'current' key and swallow every failure,
// because a broken crash-recovery cache must never block the app from
// loading. Merging those is a behavior change, not a deduplication.
export function openIndexedDbStore(dbName, storeName) {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      return reject(new Error('IndexedDB not supported'));
    }
    const req = indexedDB.open(dbName, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(storeName);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export function _launchPrefDb() {
  return openIndexedDbStore(LAUNCH_PREF_DB, LAUNCH_PREF_STORE);
}

export async function _launchPrefGet(key) {
  const db = await _launchPrefDb();
  return new Promise((resolve) => {
    const req = db.transaction(LAUNCH_PREF_STORE, 'readonly').objectStore(LAUNCH_PREF_STORE).get(key);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => resolve(undefined);
  });
}

export async function _launchPrefPut(key, value) {
  const db = await _launchPrefDb();
  return new Promise((resolve) => {
    const tx = db.transaction(LAUNCH_PREF_STORE, 'readwrite');
    tx.objectStore(LAUNCH_PREF_STORE).put(value, key);
    tx.oncomplete = resolve;
    tx.onerror = resolve;
  });
}

export async function _launchPrefDelete(key) {
  const db = await _launchPrefDb();
  return new Promise((resolve) => {
    const tx = db.transaction(LAUNCH_PREF_STORE, 'readwrite');
    tx.objectStore(LAUNCH_PREF_STORE).delete(key);
    tx.oncomplete = resolve;
    tx.onerror = resolve;
  });
}

export async function hasOpenedCaseBefore() {
  try {
    return (await _launchPrefGet(LAUNCH_PREF_KEY_OPENED)) === true;
  } catch (e) {
    return false;
  }
}

export async function markCaseOpenedBefore() {
  try {
    await _launchPrefPut(LAUNCH_PREF_KEY_OPENED, true);
  } catch (e) {
    /* non-critical */
  }
}

export async function savePersistedCaseFileHandle(handle) {
  if (!handle) return;
  try {
    await _launchPrefPut(LAUNCH_PREF_KEY_HANDLE, handle);
  } catch (e) {
    /* non-critical */
  }
}

export async function loadPersistedCaseFileHandle() {
  try {
    return (await _launchPrefGet(LAUNCH_PREF_KEY_HANDLE)) || null;
  } catch (e) {
    return null;
  }
}

export async function forgetPersistedCaseFileHandle() {
  try {
    await _launchPrefDelete(LAUNCH_PREF_KEY_HANDLE);
  } catch (e) {
    /* non-critical */
  }
}

export async function runRememberedHandleOperation(operation, timeoutMs = REMEMBERED_FILE_TIMEOUT_MS) {
  let timeout;
  try {
    return await Promise.race([
      Promise.resolve().then(operation),
      new Promise((resolve, reject) => {
        timeout = setTimeout(
          () => reject(new DOMException('The remembered case file did not respond.', 'TimeoutError')),
          timeoutMs
        );
      }),
    ]);
  } finally {
    clearTimeout(timeout);
  }
}

export function readRememberedFile(handle, timeoutMs = REMEMBERED_FILE_TIMEOUT_MS) {
  return runRememberedHandleOperation(()=>handle.getFile(), timeoutMs);
}

export async function handleRememberedFileFailure(handle, error) {
  _rememberedFileUnavailable = true;
  await forgetPersistedCaseFileHandle();
  console.warn('Remembered case file is unavailable; it must be selected again', error);
}

export async function saveAppState(key, value) {
  setAppState(key, value);
  if (typeof window !== 'undefined' && typeof window.autoSave === 'function') {
    window.autoSave();
  }
  return true;
}

export async function loadAppState(key) {
  return getAppState(key);
}

// Global bridge for legacy scripts and test harnesses
if (typeof window !== 'undefined') {
  window.hasOpenedCaseBefore = hasOpenedCaseBefore;
  window.markCaseOpenedBefore = markCaseOpenedBefore;
  window.savePersistedCaseFileHandle = savePersistedCaseFileHandle;
  window.loadPersistedCaseFileHandle = loadPersistedCaseFileHandle;
  window.forgetPersistedCaseFileHandle = forgetPersistedCaseFileHandle;
  window.runRememberedHandleOperation = runRememberedHandleOperation;
  window.readRememberedFile = readRememberedFile;
  window.handleRememberedFileFailure = handleRememberedFileFailure;
  window.saveAppState = saveAppState;
  window.loadAppState = loadAppState;
}
