// Milestone 73K part 1: why a page is drawn, and what should hold the cursor
// once it is.
//
// renderPage() used to be told only which page to draw. The current page is
// set before it runs, so it could not tell arriving at a page from the same
// page drawn again after an Add, a Remove or a Yes/No answer -- and every
// form's mount() scrolled to the top either way, which is what 73K part 2
// fixes. Part 1 makes every caller say why, and which field or row the filer
// was working on; on its own it changes nothing a filer sees.
//
// A focus target names a field by its path, or a row by 73V's in-memory row
// identity (collections.js's rowIdentity()) -- never by an index, which a
// Remove or a Duplicate shifts.
import { rowIdentity } from '../form/collections.js';

/** The reasons a page is drawn. */
export const DRAW = Object.freeze({
  /** Arriving at a page: the sidebar, Next/Previous, a link, the address bar, startup. */
  NAVIGATION: 'navigation',
  /** The page shown, drawn again after a change made on it: Add, Remove, Duplicate, an answer that reveals or hides boxes. */
  CHANGE: 'change',
  /** Another filing or year opened, a new one made, a conversion, an import that replaced the filing's data. */
  SWITCH: 'switch',
  /** Work that finished on its own while the filer was on the page (a supporting-document check). */
  BACKGROUND: 'background',
  /** Preview & Export drawn again by its own buttons (after an export it stopped). */
  PREVIEW: 'preview',
});

/** @typedef {'navigation'|'change'|'switch'|'background'|'preview'} DrawReason */
/**
 * @typedef {{ path?: string, list?: string, row?: number, reveal?: boolean }} FocusTarget
 * `path`: a field, as its data-form-path / data-annual-path / data-bind names it.
 * `list` + `row`: a row of that list, by its row identity. `list` alone: the
 * list itself (its Add button), when no row is left to name. `reveal`: a new
 * entry (Add, Duplicate), brought into view if it is off-screen (73K part 2).
 */
/** @typedef {{ reason?: DrawReason, focus?: FocusTarget | null }} DrawOptions */

/** @type {Set<string>} */
const REASONS = new Set(Object.values(DRAW));

/** @param {unknown} reason @returns {reason is DrawReason} */
export function isDrawReason(reason) {
  return typeof reason === 'string' && REASONS.has(reason);
}

/** A field, by its path. @param {string} path @returns {FocusTarget} */
export function fieldTarget(path) {
  return { path };
}

/**
 * A row of a list, by its identity; the list alone when there is no row.
 * @param {string} list
 * @param {unknown} row
 * @returns {FocusTarget}
 */
export function rowTarget(list, row) {
  const identity = rowIdentity(row);
  return identity === null ? { list } : { list, row: identity };
}

/** @param {any} data @param {string} list @returns {any[]} */
const rowsOf = (data, list) => (Array.isArray(data?.[list]) ? data[list] : []);

/** After an Add: the new row, the list's last, to bring into view. @param {any} data @param {string} list */
export function afterAdd(data, list) {
  const rows = rowsOf(data, list);
  return { ...rowTarget(list, rows[rows.length - 1]), reveal: true };
}

/** After a Duplicate of row `index`: the copy, just below it, to bring into view. @param {any} data @param {string} list @param {number|string} index */
export function afterDuplicate(data, list, index) {
  return { ...rowTarget(list, rowsOf(data, list)[Number(index) + 1]), reveal: true };
}

/**
 * After a Remove of row `index`: the row that took its place, else the one
 * above it, else the list (its Add button).
 * @param {any} data @param {string} list @param {number|string} index
 */
export function afterRemove(data, list, index) {
  const rows = rowsOf(data, list);
  const at = Number(index);
  return rowTarget(list, rows[at] ?? rows[at - 1]);
}

/**
 * The options for a change made on the page shown.
 * @param {FocusTarget | null} [focus]
 * @returns {DrawOptions}
 */
export function onChange(focus = null) {
  return { reason: DRAW.CHANGE, focus };
}
