import { normalizeWardData } from './filing/normalize-filing.js';
// Thin adapters around legacy-app.js's global state, for ES modules that
// can't reach a classic script's lexical scope directly. legacy-app.js is a
// classic (non-module) script, so its top-level function declarations and
// explicit `window.X =` assignments become real `window` properties -- but
// a bare top-level `let`/`const` (e.g. `activeInventoryType`) does NOT,
// since module code runs in its own scope and never sees another script's
// lexical bindings. Only `window.D` and `getActiveWard()` (a function
// declaration, real `window` property) are reachable this way; there is no
// separate `window.activeInventoryType` to read.
//
// This file wraps the legacy globals, it does not move or duplicate their
// logic -- see INDEX-SPLIT-PLAN.md step 2 ("adapters wrap the legacy code
// in place; they do not yet move it") and the Milestone 2 plan's Phase B.
// Deliberately minimal: only what the Simplified Accounting extraction
// (Phase D) actually needs, not a speculative full state API.

let _caseFile = {
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
};
let _D = {};
let _appState = {};
let _templateCache = {};
let _auditLogEntries = [];

/** The canonical caseFile object. */
export function getCaseFile() {
  if (typeof window !== 'undefined' && window.caseFile) {
    return window.caseFile;
  }
  return _caseFile;
}

export function setCaseFile(cf) {
  _caseFile = cf;
  if (typeof window !== 'undefined') {
    window.caseFile = cf;
  }
}

/** The full data object for whichever ward is currently active, or {} if none. */
export function getD() {
  if (typeof window !== 'undefined' && window.D) {
    return window.D;
  }
  return _D;
}

export function setD(d) {
  // Every filing that becomes the open one is normalized first (older stored
  // shapes migrated; idempotent). An import since Milestone 70's 70C -- it
  // was legacy-app.js's, reached through window.
  if (d) normalizeWardData(d);
  _D = d;
  if (typeof window !== 'undefined') {
    window.D = d;
  }
}

export function getAppState(key) {
  if (typeof window !== 'undefined' && window._appState) {
    return key in window._appState ? window._appState[key] : null;
  }
  return key in _appState ? _appState[key] : null;
}

export function setAppState(key, val) {
  _appState[key] = val;
  if (typeof window !== 'undefined') {
    if (!window._appState) window._appState = {};
    window._appState[key] = val;
  }
}

// Milestone 51B removed getAllAppState() from here -- zero references,
// including in this module's own spec. Callers that need a single key use
// getAppState(key) above; nothing ever wanted the whole bag.
export function getTemplateCache() {
  if (typeof window !== 'undefined' && window._templateCache) {
    return window._templateCache;
  }
  return _templateCache;
}

export function setTemplateCache(type, b64) {
  _templateCache[type] = b64;
  if (typeof window !== 'undefined') {
    if (!window._templateCache) window._templateCache = {};
    window._templateCache[type] = b64;
  }
}

/** The full ward record from caseFile.wards for the active ward, or null. */
export function getActiveWard() {
  if (typeof window !== 'undefined' && typeof window.getActiveWard === 'function') {
    return window.getActiveWard();
  }
  const cf = getCaseFile();
  if (cf && cf.activeWardId && Array.isArray(cf.wards)) {
    return cf.wards.find((w) => w.wardId === cf.activeWardId) || null;
  }
  return null;
}

// Milestone 51B removed getActiveInventoryType() from here -- zero references,
// spec included. Callers read getD().inventoryType directly, which is the same
// one-line lookup this wrapped.

// The blank-filing factories that lived here (emptyDataSimplified(),
// emptyDataAnnual() and the four Plans') moved to src/core/filing/models/ in
// Milestone 70's 70C, with the registry that dispatches to them
// (src/core/filing/filing-registry.js's initializeEmptyData()).
