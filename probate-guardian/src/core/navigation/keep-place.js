// Milestone 73K part 2: the page stays where the filer was.
//
// Every form's mount scrolled #main-content to the top, whatever the reason it
// was drawn -- so a Yes/No answer that reveals boxes, a signature choice, Add,
// Remove or Duplicate threw the filer back to the top of a long schedule, and
// the cursor fell to the top of the document (after a confirmation it went
// back to a button the redraw had just replaced). Part 1 made every draw say
// why (draw-reason.js) and which field or row the filer was working on; this
// is what reads them:
//
// - A change made on the page, or work that finished on its own: the scroll
//   position is kept, and the cursor goes back to the field or row named --
//   else to the box that held it, found again by its path. After "+ Add" or
//   Duplicate the new entry is brought into view if it is off-screen, and its
//   first box takes the cursor (decision 73K-N1).
// - Arriving at a page, another filing or year, and Preview (it draws in
//   stages): the top, as before.
//
// The cursor is only moved when it was on the page being drawn (or had
// fallen to the document); a filer working in the sidebar or a dialog keeps it.
// When nothing on the new page matches, a cursor that was on the page goes to
// the page itself rather than the top of the document.
import { rowIdentity } from '../form/collections.js';
import { DRAW } from './draw-reason.js';

/**
 * The attributes a box names its filing path by, across the nine forms. The
 * last, data-focus-path, is only for this: a control written by its own
 * handler (the vehicle box, the supporting documents' Upload) names the path
 * its redraw's focus target uses.
 */
export const PATH_ATTRIBUTES = Object.freeze(['data-form-path', 'data-annual-path', 'data-bind', 'data-field-path', 'data-focus-path']);

const CONTROLS = 'input,select,textarea,button,[tabindex]';
const TYPING_INPUTS = new Set(['text', 'search', 'email', 'tel', 'url', 'number', 'password', 'date', 'month', 'week', 'time', 'datetime-local']);

/** @param {string | undefined} reason */
export const keepsPlace = (reason) => reason === DRAW.CHANGE || reason === DRAW.BACKGROUND;

/** @param {Element} el @returns {string} */
export function pathOf(el) {
  for (const name of PATH_ATTRIBUTES) {
    const value = el?.getAttribute?.(name);
    if (value) return value;
  }
  return '';
}

/** Whether the cursor is in a box the filer types in (or a list they're choosing from). @param {Element | null} el */
export function isTypingIn(el) {
  if (!el || /** @type {HTMLElement} */ (el).isContentEditable) return !!el;
  const tag = el.tagName;
  if (tag === 'TEXTAREA' || tag === 'SELECT') return true;
  return tag === 'INPUT' && TYPING_INPUTS.has(String(/** @type {HTMLInputElement} */ (el).type || 'text').toLowerCase());
}

const activeElement = () => (typeof document === 'undefined' ? null : document.activeElement);
const isDocumentLevel = (el) => !el || (typeof document !== 'undefined' && (el === document.body || el === document.documentElement));

/**
 * Where the filer is on the page, taken before it is cleared: its scroll
 * position, and the box holding the cursor (by its path).
 * @param {HTMLElement} container
 */
export function rememberPlace(container) {
  const active = activeElement();
  const inside = !!active && active !== container && container.contains(active);
  return {
    scrollTop: container.scrollTop,
    /** The cursor was on this page, or nowhere: it may be put back. */
    mayFocus: inside || active === container || isDocumentLevel(active),
    /** The cursor was on a box of this page, which the redraw removes. */
    inside,
    path: inside ? pathOf(active) : '',
    value: inside ? /** @type {HTMLInputElement} */ (active).value ?? '' : '',
  };
}

/** @param {Element} el */
function focusable(el) {
  const control = /** @type {HTMLInputElement} */ (el);
  if (control.disabled || control.type === 'hidden') return false;
  if (typeof control.getClientRects === 'function' && control.getClientRects().length === 0) return false;
  return true;
}

/** @param {ParentNode} container */
const controlsOf = (container) => /** @type {HTMLElement[]} */ ([...container.querySelectorAll(CONTROLS)]).filter(focusable);

/**
 * The box a path names: of a Yes/No pair, the answer given (else the one the
 * cursor was on, else the first).
 * @param {ParentNode} container @param {string} path @param {string} [value]
 */
export function boxForPath(container, path, value = '') {
  const boxes = controlsOf(container).filter((el) => pathOf(el) === path);
  if (boxes.length < 2) return boxes[0] || null;
  return boxes.find((el) => /** @type {HTMLInputElement} */ (el).checked)
    || boxes.find((el) => /** @type {HTMLInputElement} */ (el).value === value)
    || boxes[0];
}

/**
 * A row's first box: the first whose path is under "<list>.<index>." -- one
 * the filer types or chooses in before a button carrying the row's path (the
 * Plans' residence and provider rows start with one) -- else the first of the
 * row's own buttons (Duplicate, Remove).
 * @param {ParentNode} container @param {string} list @param {number} index
 */
export function firstBoxOfRow(container, list, index) {
  const controls = controlsOf(container);
  const prefix = `${list}.${index}.`;
  const inRow = controls.filter((el) => pathOf(el).startsWith(prefix));
  return inRow.find((el) => el.tagName !== 'BUTTON') || inRow[0]
    || controls.find((el) => el.dataset?.index === String(index) && (el.dataset.collection === list || el.dataset.list === list))
    || null;
}

/** A list's "+ Add" button, when no row is left to name. @param {ParentNode} container @param {string} list */
export function addButtonOf(container, list) {
  return controlsOf(container).find((el) => (el.dataset?.collection === list || el.dataset?.list === list)
    && Object.entries(el.dataset).some(([key, value]) => key.endsWith('Action') && /^add/.test(String(value)))) || null;
}

/**
 * The element a focus target names on the page just drawn.
 * @param {ParentNode} container
 * @param {import('./draw-reason.js').FocusTarget} target
 * @param {any} data the filing drawn
 * @param {string} [value] the value of the box that held the cursor
 */
export function elementForTarget(container, target, data, value = '') {
  if (!target) return null;
  if (target.path) return boxForPath(container, target.path, value);
  if (!target.list) return null;
  const rows = Array.isArray(data?.[target.list]) ? data[target.list] : [];
  const index = target.row === undefined ? -1 : rows.findIndex((row) => rowIdentity(row) === target.row);
  return (index >= 0 && firstBoxOfRow(container, target.list, index)) || addButtonOf(container, target.list);
}

/** The entry around a row's first box, to bring into view. @param {HTMLElement} box */
const entryAround = (box) => /** @type {HTMLElement} */ (box.closest?.('.entry-card, tr, fieldset') || box);

/**
 * After a draw: the top for arriving at a page, another filing and Preview;
 * otherwise the place remembered, and the cursor back on the target (else the
 * box that held it, else the page itself, so it doesn't fall to the top of the
 * document).
 * @param {HTMLElement} container
 * @param {ReturnType<typeof rememberPlace> | null} place
 * @param {{ reason?: string, focus?: import('./draw-reason.js').FocusTarget | null, data?: any }} draw
 */
export function settlePlace(container, place, { reason, focus = null, data = null } = {}) {
  if (!keepsPlace(reason) || !place) {
    container.scrollTop = 0;
    return null;
  }
  container.scrollTop = place.scrollTop;
  if (!place.mayFocus) return null;
  const target = elementForTarget(container, focus, data, place.value)
    || (place.path ? boxForPath(container, place.path, place.value) : null);
  if (!target) {
    if (place.inside) container.focus?.({ preventScroll: true });
    return null;
  }
  if (focus?.reveal) {
    // As much of the entry as fits, and its first box whatever the entry's
    // height (a co-guardian card can be taller than the window).
    entryAround(target).scrollIntoView?.({ block: 'nearest' });
    target.scrollIntoView?.({ block: 'nearest' });
  }
  target.focus({ preventScroll: true });
  return target;
}
