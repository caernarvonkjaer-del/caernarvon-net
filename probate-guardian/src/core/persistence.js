// Thin adapters around legacy-app.js's persistence globals. See
// src/core/state.js for why this indirection exists (classic script vs. ES
// module scope) -- these are all top-level function declarations in
// legacy-app.js, so they're real `window` properties already; this file
// just gives modules an importable surface instead of reaching into
// `window` ad hoc. No logic moves or changes here.

/** Marks the active ward dirty and schedules a debounced save (legacy-app.js:2473). */
export function autoSave() {
  return window.autoSave();
}

/** Cancels any pending debounced save and saves the active ward immediately (legacy-app.js:2484). */
export function flushPendingSave() {
  return window.flushPendingSave();
}

/** Schedules persistence for a ward already live in guardianData (legacy-app.js:2254). */
export function saveWardToState(ward) {
  return window.saveWardToState(ward);
}

/** Updates the hash and re-renders the given page within the active feature (legacy-app.js:4982). */
export function navigate(page) {
  return window.navigate(page);
}
