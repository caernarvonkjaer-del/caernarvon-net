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

/** The full data object for whichever ward is currently active, or {} if none. */
export function getD() {
  return window.D;
}

/** The full ward record from guardianData.wards for the active ward, or null. */
export function getActiveWard() {
  return window.getActiveWard ? window.getActiveWard() : null;
}

/**
 * The active ward's inventoryType key (e.g. 'simplified'), or null if no
 * ward is active. Reads window.D.inventoryType rather than legacy-app.js's
 * separate `activeInventoryType` variable (unreachable from a module, see
 * file header) -- the two are kept in sync by every legacy code path that
 * sets either (addWard/switchWard/convertExistingWard), so this is
 * equivalent for read purposes.
 */
export function getActiveInventoryType() {
  return window.D && window.D.inventoryType ? window.D.inventoryType : null;
}
