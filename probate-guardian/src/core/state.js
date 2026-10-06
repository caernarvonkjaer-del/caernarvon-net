import { normalizeWardData } from './filing/normalize-filing.js';
import { applySignaturePolicyOnOpen } from './signature/signature-policy.js';
// The case store (Milestone 70: the seam since 70E, the owner since 70J).
// Every module reads and writes case state through here, never through window.
//
// One case object, held here and nowhere else: getCaseFile() is the live
// object, and replaceCaseFile() is the one way to replace it whole (a lock
// forgets the case; a unit test starts one). The open filing is not held at
// all -- it is derived from the case's activeWardId, each time it is asked
// for, so it can never disagree with it: getD() and getActiveWard() are that
// filing, getActiveInventoryType() its type. setActiveFiling() is the one way
// to change which filing is open (the filing lifecycle's open and close,
// tests/unit/filing-lifecycle.spec.js).
//
// Until 70J the case belonged to the classic monolith, legacy-app.js, which
// kept it on window.caseFile, the open filing on window.D and its type behind
// a window accessor; this module read those. None of the three is on window
// now.

/** A case with nothing in it: what the app starts with, and what a lock leaves. */
export function blankCaseFile() {
  return {
    guardianName: '',
    guardianEmail: '',
    wards: [],
    parties: [],
    cases: [],
    dismissedPartyPairs: [],
    activeWardId: null,
  };
}

let caseFile = blankCaseFile();
// What getD() gives while no filing is open: a scratch object nothing keeps,
// fresh each time a filing closes or the case is replaced (as window.D = {}
// was).
let noFiling = {};
// A filing a query judges without opening it -- GuardianForms.testing's
// validate queries only (withFilingInView(), below).
let filingInView = null;

// The case's app preferences (saved in the .sav's appState section) and the
// embedded workbook templates cached with it: this module's own since
// Milestone 70's 70I, not the monolith's window accessors.
let appState = {};
let templateCache = {};

/** The case file: the live object, never a copy. */
export function getCaseFile() {
  return caseFile;
}

/**
 * Replace the whole case: the one way to (a lock's new, empty case; a unit
 * test's). No filing is open afterwards unless the new case names one.
 */
export function replaceCaseFile(next) {
  caseFile = next || blankCaseFile();
  noFiling = {};
}

/**
 * The open filing's record in the case: undefined when the case names one it
 * does not hold, null when none is open (as the monolith's getActiveWard()
 * always answered).
 */
export function getActiveWard() {
  if (!caseFile.activeWardId) return null;
  return caseFile.wards.find((ward) => ward.wardId === caseFile.activeWardId);
}

/** The open filing's data, or a scratch {} when no filing is open: the live object. */
export function getD() {
  return filingInView || getActiveWard() || noFiling;
}

/** The same, by the name new code uses (the plan's getActiveFiling()). */
export const getActiveFiling = getD;

/**
 * The open filing's type, or null. Its raw value: Final and Trust are their
 * own types here, resolved to the Annual engine only where behaviour is
 * chosen (filing-registry.js's formEngine()).
 */
export function getActiveInventoryType() {
  const ward = getActiveWard();
  return ward ? (ward.inventoryType ?? null) : null;
}

/**
 * Make a filing the open one, or none (null). The filing is normalized first
 * (older stored shapes migrated; idempotent), then the case's activeWardId
 * names it -- and the open filing and its type follow from that. The one place
 * a module changes which filing is open (Milestone 70, 70G: the filing
 * lifecycle's open and close; tests/unit/filing-lifecycle.spec.js holds it).
 */
export function setActiveFiling(ward) {
  if (ward) {
    normalizeWardData(ward);
    // Milestone 73A: a filing being prepared moves to signature policy 2
    // when opened (guardians sign by hand or stamp; a saved guardian "/s/"
    // is asked again); a closed filing keeps what it was filed with.
    applySignaturePolicyOnOpen(ward);
  }
  caseFile.activeWardId = ward ? ward.wardId : null;
  if (!ward) noFiling = {};
}

/**
 * For GuardianForms.testing's validate queries only: run `fn` with `filing` as
 * the filing the validators read, without opening it -- no lock, no save, no
 * change to the case -- and put things back however `fn` ends. Synchronous, so
 * nothing else can run in between. (The validators read the open filing
 * rather than take one; the adapter used to point window.D at its copy.)
 */
export function withFilingInView(filing, fn) {
  const previous = filingInView;
  filingInView = filing;
  try {
    return fn();
  } finally {
    filingInView = previous;
  }
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
