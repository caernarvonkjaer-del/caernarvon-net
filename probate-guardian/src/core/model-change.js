// Milestone 73J part 1: one event for every committed change to a filing.
//
// Before this only a typed field announced itself (form-contract.js's
// `pg:field-written`), so a part of a page that shows data changed any other
// way -- "+ Add", Remove, Duplicate, the clean-up when the filer leaves a
// page, an Excel import, Link Person, Sync, Merge, a signature stamp, New Year,
// a conversion, a switch to another year -- had no way to know it was stale
// (73J part 2 uses this). Each of those now announces itself once, when the
// action is complete, naming the paths it changed ('*' for the whole filing).
// No visible change on its own.
//
// Announce at the end of an action, never inside a helper it calls: Link
// Person sets the link and then fills the fields, and an event in between
// would let a listener redraw the half-filled slot. The helpers keep marking
// the output revision as they always did (marking twice is harmless).
//
// tests/unit/model-change-event.spec.js holds the list of saves that announce
// nothing, each with its reason; any other requestSave() must be one of these.
import { requestSave } from './state.js';
import { markFilingRevisionChanged } from './filing/output-revision.js';

export const MODEL_CHANGE_EVENT = 'pg:model-changed';
/** The path a change names when it may have touched anything in the filing. */
export const WHOLE_FILING = '*';

/**
 * @typedef {object} ModelChange
 * @property {string} reason  what kind of change ('field-write', 'collection-add', 'excel-import', …)
 * @property {ReadonlyArray<string>} paths  the changed paths, or ['*']
 */

/**
 * @param {string|string[]|undefined} paths
 * @returns {string[]}
 */
function pathList(paths) {
  const list = (Array.isArray(paths) ? paths : [paths]).filter((p) => typeof p === 'string' && p);
  return list.length ? [...new Set(list)] : [WHOLE_FILING];
}

/**
 * Announces a change that has been made, marked and saved by its own means
 * (the field write, which marks first and refreshes the page before this).
 * @param {string} reason
 * @param {string|string[]} [paths]
 * @returns {ModelChange}
 */
export function announceModelChange(reason, paths) {
  /** @type {ModelChange} */
  const detail = Object.freeze({ reason: String(reason || ''), paths: Object.freeze(pathList(paths)) });
  if (typeof window !== 'undefined' && typeof CustomEvent === 'function') {
    window.dispatchEvent?.(new CustomEvent(MODEL_CHANGE_EVENT, { detail }));
  }
  return detail;
}

/**
 * Marks the output revision and announces: for an action that saves by its
 * own means (saveData(), a lifecycle step).
 * @param {string} reason
 * @param {string|string[]} [paths]
 * @returns {ModelChange}
 */
export function recordModelChange(reason, paths) {
  markFilingRevisionChanged(reason);
  return announceModelChange(reason, paths);
}

/**
 * Marks the output revision, queues the save and announces: what an action
 * that changes a filing calls in place of requestSave().
 * @param {string} reason
 * @param {string|string[]} [paths]
 * @returns {ModelChange}
 */
export function commitModelChange(reason, paths) {
  markFilingRevisionChanged(reason);
  requestSave();
  return announceModelChange(reason, paths);
}

/**
 * Calls `listener` with each change until `signal` aborts or the returned
 * function is called.
 * @param {(change: ModelChange) => void} listener
 * @param {{signal?: AbortSignal}} [options]
 * @returns {() => void}
 */
export function onModelChange(listener, { signal } = {}) {
  if (typeof window === 'undefined' || !window.addEventListener) return () => {};
  /** @param {Event} event */
  const handler = (event) => listener(/** @type {CustomEvent<ModelChange>} */ (event).detail);
  window.addEventListener(MODEL_CHANGE_EVENT, handler, signal ? { signal } : undefined);
  return () => window.removeEventListener(MODEL_CHANGE_EVENT, handler);
}
