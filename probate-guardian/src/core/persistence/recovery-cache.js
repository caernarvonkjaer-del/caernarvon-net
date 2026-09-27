// Two unrelated "where was I" mechanisms live in this file:
//
// 1. The IndexedDB snapshot (pg-session-cache), written on every dirty
//    autosave. Its only remaining job is same-tab auto-lock recovery: when
//    lockApp() wipes decrypted state from memory and the case has never
//    been saved to a .sav file yet (so there is no file to reload from),
//    lockApp() (src/core/security/app-lock.js) reads this cache back after
//    the password is re-entered. A successful .sav write makes it redundant --
//    the file is now the source of truth -- so callers clear it once one
//    lands. It must never be offered as a cross-session restore: that was
//    Milestone 57H's "durable encrypted session restore", which kept a full
//    plaintext-or-encrypted copy of the case sitting in browser storage
//    indefinitely (nothing cleared it after a successful save, and
//    declining the restore offer no longer discarded it either). Reverted --
//    see the Milestone 57 review for why.
//
// 2. The localStorage position marker (pg-last-position): which route and
//    ward the filer was last on. No case data, just two identifiers -- so
//    unlike the cache above, it is fine for it to survive indefinitely and
//    across sessions. Reopening a case (silent handle reconnect or a plain
//    "Open Case File") already reloads real data from the actual .sav file;
//    this marker only decides where initApp() lands the filer afterward,
//    instead of always dropping them on the dashboard.
import { encryptJSON, getSecurityMode, getCryptoKey } from './crypto.js';
import { openIndexedDbStore } from './launch-preferences.js';
import { getCaseFile } from '../state.js';

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

// Stores what lockApp() reads back (see the file header): each filing; the
// guardian's name and email, with the circuit chosen for the case; and the
// shared records -- people, cases and "not the same person" decisions. Until
// Milestone 70's 70I the snapshot held only the filings and the guardian, so
// locking a case never saved to a file lost its shared records and circuit
// (the filings came back; the People page came back empty). A snapshot
// written before then restores as it always did. Salt and verifier are not
// stored: the same password derives the same key.
// When this page last wrote the snapshot (its savedAt), or null. The store has
// one slot, shared by every tab of this origin and left behind by a session
// that closed unsaved; a lock restores only the snapshot this page wrote
// (Milestone 70, 70I). Before, a lock could restore a snapshot another tab,
// or an earlier session, had written -- another case's filings.
let ownSnapshotSavedAt = null;

export async function saveSessionRestoreCache() {
  const securityMode = getSecurityMode();
  const cryptoKey = getCryptoKey();
  if (securityMode === 'encrypted' && !cryptoKey) return false;
  const caseFile = getCaseFile();
  if (!caseFile.wards || !caseFile.wards.length) return false; // nothing worth recovering yet

  try {
    const wards = [];
    for (const ward of caseFile.wards) {
      wards.push({ wardId: ward.wardId, enc: await encryptJSON(ward) });
    }
    const guardian = await encryptJSON({
      guardianName: caseFile.guardianName,
      guardianEmail: caseFile.guardianEmail,
      selectedCircuit: caseFile.selectedCircuit ?? null,
    });
    const parties = await encryptJSON(caseFile.parties || []);
    const cases = await encryptJSON(caseFile.cases || []);
    const partyDismissals = await encryptJSON(caseFile.dismissedPartyPairs || []);
    const savedAt = Date.now();
    await _sessionCachePut({ savedAt, securityMode, guardian, wards, parties, cases, partyDismissals });
    ownSnapshotSavedAt = savedAt;
    return true;
  } catch (e) {
    console.warn('session-restore cache write failed', e);
    return false;
  }
}

export async function clearSessionRestoreCache() {
  ownSnapshotSavedAt = null;
  await _sessionCacheClear();
}

/** The snapshot this page wrote last, or null: what a lock restores (app-lock.js). */
export async function readOwnSessionRestoreCache() {
  if (ownSnapshotSavedAt === null) return null;
  const cache = await _sessionCacheGet();
  return cache && cache.savedAt === ownSnapshotSavedAt ? cache : null;
}

export const LAST_POSITION_KEY = 'pg-last-position';

// No case content, just a route and a ward id -- see the file header.
export function saveLastPosition(route, wardId) {
  try {
    if (typeof localStorage === 'undefined' || !route) return;
    localStorage.setItem(LAST_POSITION_KEY, JSON.stringify({ route, wardId: wardId || '', savedAt: Date.now() }));
  } catch (e) {
    /* non-critical */
  }
}

export function loadLastPosition() {
  try {
    if (typeof localStorage === 'undefined') return null;
    const raw = localStorage.getItem(LAST_POSITION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

export function clearLastPosition() {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.removeItem(LAST_POSITION_KEY);
  } catch (e) {
    /* non-critical */
  }
}

// Global bridge for legacy scripts and test harnesses
if (typeof window !== 'undefined') {
  window.saveSessionRestoreCache = saveSessionRestoreCache;
  window.clearSessionRestoreCache = clearSessionRestoreCache;
}
