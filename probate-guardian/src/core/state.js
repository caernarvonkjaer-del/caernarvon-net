import { normalizeWardData } from './filing/normalize-filing.js';
// The case-state seam (Milestone 70, 70E): every ES module reads and writes
// case state through here, never through window.
//
// Until 70J the state still belongs to the classic monolith, legacy-app.js:
// its top-level `caseFile`, which it keeps on window.caseFile (it replaces the
// case in one place and updates window.caseFile there); the open filing, which
// it keeps on window.D; and its lexical `activeInventoryType`, which it exposes
// as a window accessor. This module reads those live references and keeps no
// copy of its own -- one authority, the monolith's, made explicit
// (MILESTONE-70-PROPOSAL.md, "Canonical case store"). No other module assigns
// window.D or window.caseFile. App state and the template cache were the
// monolith's too; since 70I they are this module's own.
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
};

// The case's app preferences (saved in the .sav's appState section) and the
// embedded workbook templates cached with it: this module's own since
// Milestone 70's 70I, not the monolith's window accessors.
let appState = {};
let templateCache = {};
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

/**
 * Make a filing the open one, or none (null): the case's activeWardId, the
 * open filing (normalized, through setD()) and its type, together. The one
 * place a module changes which filing is open (Milestone 70, 70G: the filing
 * lifecycle's open and close; tests/unit/filing-lifecycle.spec.js holds it).
 */
export function setActiveFiling(ward) {
  getCaseFile().activeWardId = ward ? ward.wardId : null;
  setD(ward || {});
  setActiveInventoryType(ward ? ward.inventoryType : null);
}

/** One app-state value, or null. */
export function getAppState(key) {
  return key in appState ? appState[key] : null;
}

/**
 * The app-state object itself, live, for code that reads and sets several of
 * its keys (the recent-filings list, a case file as it opens).
 */
export function appStateObject() {
  return appState;
}

/**
 * Set one app-state value in memory. Persisting it is launch-preferences.js's
 * saveAppState(); this only assigns.
 */
export function setAppState(key, val) {
  appState[key] = val;
}

// Milestone 51B removed getAllAppState() from here -- zero references,
// including in this module's own spec. Callers that need a single key use
// getAppState(key) above; nothing ever wanted the whole bag.

/** The embedded-template cache: type -> base64 workbook. */
export function getTemplateCache() {
  return templateCache;
}

/** A case file's own templates, as it opens (case-reader.js). */
export function replaceTemplateCache(next) {
  templateCache = next || {};
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
// save is scheduled, and subscribers hear about it. main.js hands them in at
// startup (configureCaseStore()): the revision counter, and case-file.js's
// autoSave() (Milestone 70, 70I; it was the monolith's) -- with the form
// layer's commit of a field still being typed in, which a flush runs first.
// The store sits below both, so neither needs to import the other.
const hooks = { markRevision: null, save: null, commitPending: null };
const subscribers = new Set();

export function configureCaseStore({ markRevision = null, save = null, commitPending = null } = {}) {
  hooks.markRevision = markRevision;
  hooks.save = save;
  hooks.commitPending = commitPending;
}

/**
 * Schedule a save of the case: what a write through transaction() does,
 * without marking a filing revision. How every module asks for one (Milestone
 * 70, 70I) -- a module the save itself depends on could not import it. Does
 * nothing until main.js configures the store (unit tests under Node).
 */
export function requestSave() {
  return hooks.save?.();
}

/**
 * For GuardianForms.testing's countAutoSaves() only: send every save request
 * to `fn` until the returned restore() puts the configured hook back.
 */
export function replaceSaveHook(fn) {
  const previous = hooks.save;
  hooks.save = fn;
  return () => { hooks.save = previous; };
}

/** Commit the form's pending edit -- a field still being typed in -- into the case, before it is saved. */
export function commitPendingEdits() {
  return hooks.commitPending?.();
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
