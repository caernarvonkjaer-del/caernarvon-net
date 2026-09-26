import { normalizeWardData } from './filing/normalize-filing.js';
// The case-state seam (Milestone 70, 70E): every ES module reads and writes
// case state through here, never through window.
//
// Until 70J the state still belongs to the classic monolith, legacy-app.js:
// its top-level `caseFile`, which it keeps on window.caseFile (it replaces the
// case in one place and updates window.caseFile there); the open filing, which
// it keeps on window.D; and its lexical `activeInventoryType`, `_appState` and
// `_templateCache`, which it exposes as window accessors. This module reads
// those live references and keeps no copy of its own -- one authority, the
// monolith's, made explicit (MILESTONE-70-PROPOSAL.md, "Canonical case
// store"). No other module assigns window.D or window.caseFile.
//
// Every such access is written as window.X, so the dependency audit sees it
// and the ratchet lists it: this file is the one module allowed it, the
// transition exception 70J removes. Outside a page -- unit tests under Node,
// with no monolith -- the stand-ins below are the only store; with a page
// they are never written.
const standIn = {
  caseFile: {
    activeWardId: null,
    guardianName: '',
    guardianEmail: '',
    // Milestone 54: null, not a default of 6, so the dashboard can tell "never
    // explicitly chosen" (derive a default from the user's filings, per
    // Decision D4's intent) from "the user picked 6" (an override, kept as-is
    // even if their filings later suggest a different circuit). See
    // dashboard/resources.js's deriveDefaultCircuit().
    selectedCircuit: null,
    parties: [],
    cases: [],
    dismissedPartyPairs: [],
    wards: [],
    lastSavedFileName: '',
  },
  D: {},
  activeInventoryType: null,
  _appState: {},
  _templateCache: {},
};
const onPage = () => typeof window !== 'undefined';

/** The case file: the live object, never a copy. */
export function getCaseFile() {
  return (onPage() && window.caseFile) || standIn.caseFile;
}

/**
 * Replace the whole case outside a page (unit tests). In the app the monolith
 * owns the case and replaces it itself, in one place that also updates
 * window.caseFile; 70J moves that here as replaceCaseFile().
 */
export function setCaseFile(cf) {
  if (onPage()) window.caseFile = cf;
  else standIn.caseFile = cf;
}

/** The open filing's data, or {} when no filing is open: the live object. */
export function getD() {
  return (onPage() && window.D) || standIn.D;
}

/** The same, by the name new code uses (the plan's getActiveFiling()). */
export const getActiveFiling = getD;

export function setD(d) {
  // Every filing that becomes the open one is normalized first (older stored
  // shapes migrated; idempotent). An import since Milestone 70's 70C -- it
  // was legacy-app.js's, reached through window.
  if (d) normalizeWardData(d);
  if (onPage()) window.D = d;
  else standIn.D = d;
}

/**
 * The open filing's type -- the monolith's own `activeInventoryType`, read
 * through the accessor it defines on window (70J moves it here). Its raw
 * value: Final and Trust are their own types here, resolved to the Annual
 * engine only where behaviour is chosen (filing-registry.js's formEngine()).
 */
export function getActiveInventoryType() {
  return onPage() ? (window.activeInventoryType ?? null) : standIn.activeInventoryType;
}

export function setActiveInventoryType(type) {
  if (onPage()) window.activeInventoryType = type;
  else standIn.activeInventoryType = type;
}

/** One app-state value (the monolith's `_appState`), or null. */
export function getAppState(key) {
  const state = onPage() ? window._appState : standIn._appState;
  return state && key in state ? state[key] : null;
}

/**
 * Set one app-state value in memory. Persisting it is the monolith's
 * saveAppState(), as before; this only assigns, as the callers did.
 */
export function setAppState(key, val) {
  if (!onPage()) { standIn._appState[key] = val; return; }
  if (!window._appState) window._appState = {};
  window._appState[key] = val;
}

// Milestone 51B removed getAllAppState() from here -- zero references,
// including in this module's own spec. Callers that need a single key use
// getAppState(key) above; nothing ever wanted the whole bag.

/** The embedded-template cache (the monolith's `_templateCache`). */
export function getTemplateCache() {
  return (onPage() && window._templateCache) || standIn._templateCache;
}

/**
 * The open filing's record in caseFile.wards: null when none is open, and
 * whatever find() gives otherwise -- exactly the monolith's getActiveWard(),
 * which since 70E is a one-line wrapper onto this.
 */
export function getActiveWard() {
  const caseFile = getCaseFile();
  if (!caseFile.activeWardId) return null;
  return caseFile.wards.find((ward) => ward.wardId === caseFile.activeWardId);
}

// The blank-filing factories that lived here (emptyDataSimplified(),
// emptyDataAnnual() and the four Plans') moved to src/core/filing/models/ in
// Milestone 70's 70C, with the registry that dispatches to them
// (src/core/filing/filing-registry.js's initializeEmptyData()).

// ---------------------------------------------------------------------------
// The store API (Milestone 70, 70E): how new writes are made, and how a
// module hears about them. Zero-copy and single-writer: select() and the
// getters hand back the live objects, transaction() changes them in place,
// and nothing here keeps a shadow or synchronizes one.
//
// A write's side effects run once each, in this order: the filing's revision
// is marked changed (so an export can no longer claim the old revision), the
// save is scheduled, and subscribers hear about it. main.js hands the first
// two in at startup (configureCaseStore()): the revision counter it imports,
// and the monolith's own autoSave(), which it reaches through
// src/core/runtime/monolith.js until 70I's persistence service owns saving.
const hooks = { markRevision: null, save: null };
const subscribers = new Set();

export function configureCaseStore({ markRevision = null, save = null } = {}) {
  hooks.markRevision = markRevision;
  hooks.save = save;
}

/** Read through a selector: select(({ caseFile, filing }) => filing.wardName). Live values, not copies. */
export function select(selector) {
  return selector({ caseFile: getCaseFile(), filing: getD() });
}

/**
 * Change the open filing (and, if need be, the case) in place, then run the
 * write's side effects once each. Returns what the mutator returned. A
 * mutator that throws keeps what it had changed before throwing, runs no side
 * effect, and the caller sees the error.
 */
export function transaction(reason, mutator) {
  if (typeof reason !== 'string' || !reason) throw new Error('transaction(reason, mutator): a reason is required');
  const result = mutator(getD(), getCaseFile());
  hooks.markRevision?.(reason);
  hooks.save?.();
  notify({ type: 'transaction', reason });
  return result;
}

/**
 * Hear about every transaction; an AbortSignal unsubscribes. Returns an unsubscribe function.
 * @param {(event: { type: string, reason: string }) => void} listener
 * @param {{ signal?: AbortSignal }} [options]
 */
export function subscribe(listener, { signal } = {}) {
  if (signal?.aborted) return () => {};
  subscribers.add(listener);
  const off = () => { subscribers.delete(listener); };
  signal?.addEventListener('abort', off, { once: true });
  return off;
}

function notify(event) {
  for (const listener of [...subscribers]) {
    try { listener(event); } catch (e) { console.error('case-store subscriber failed', e); }
  }
}
