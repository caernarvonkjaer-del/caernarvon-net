// Milestone 73J part 2: page parts that keep up with a change.
//
// A page was drawn once, on arrival, and only a typed field's own refreshes
// ran after that -- so a part that summarises other fields (Schedule B-4's
// category totals, the "No attorney is entered" notice, the cover's "Why is
// this guardian filing without an attorney?") stayed as it was drawn until the
// filer left the page and came back. 73J part 1 made every committed change
// announce itself, naming the paths it changed (src/core/model-change.js).
// A live part declares the paths it depends on and how it draws itself; each
// announcement redraws the parts on the page whose paths it touches, and no
// others. (src/core/status/live-region.js is the screen-reader announcer and
// unrelated.)
//
// A part that holds the cursor is not redrawn under the filer: it is marked
// and redrawn when the cursor leaves it.
import { onModelChange, WHOLE_FILING } from '../model-change.js';
import { getD } from '../state.js';

/**
 * @typedef {object} LivePart
 * @property {string[] | ((key: string) => string[])} paths  the filing paths it depends on (a path covers everything beneath it)
 * @property {(filing: any, key: string) => string} render  its inner HTML
 * @property {(element: Element) => void} [afterRender]  what the page does to freshly drawn controls (the Inventory binds them)
 */

/** @type {Map<string, LivePart>} */
const PARTS = new Map();

/** Declares a live part by name. A later declaration of the same name replaces it. @param {string} name @param {LivePart} part */
export function defineLivePart(name, part) {
  PARTS.set(name, part);
}

const attr = (v) => String(v).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

/**
 * A live part's markup: its current HTML inside the marker the refresh finds
 * it by. `key` tells copies apart (a row's index); `className` lets the
 * marker be the grid column itself. The HTML comes from the page's own
 * templates, which escape what the filer typed, as the router's drawing does.
 * @param {string} name
 * @param {{ key?: string | number, tag?: string }} [options]
 */
export function livePartHtml(name, { key = '', tag = 'div', className = '' } = {}) {
  const part = PARTS.get(name);
  if (!part) throw new Error(`No live part named "${name}"`);
  const keyAttr = key === '' ? '' : ` data-live-key="${attr(key)}"`;
  const classAttr = className ? ` class="${attr(className)}"` : '';
  return `<${tag}${classAttr} data-live-part="${attr(name)}"${keyAttr}>${part.render(getD(), String(key))}</${tag}>`;
}

/**
 * Whether a change to `changed` reaches a part that depends on `depends`: the
 * whole filing, the same path, or one beneath the other.
 * @param {ReadonlyArray<string>} depends
 * @param {ReadonlyArray<string>} changed
 */
export function changeTouches(depends, changed) {
  return changed.some((c) => c === WHOLE_FILING
    || depends.some((p) => c === p || c.startsWith(`${p}.`) || p.startsWith(`${c}.`)));
}

/** @param {Element} element @param {LivePart} part */
function redraw(element, part) {
  const el = /** @type {HTMLElement} */ (element);
  delete el.dataset.liveStale;
  el.innerHTML = part.render(getD(), el.dataset.liveKey ?? '');
  part.afterRender?.(el);
}

/**
 * Redraws the live parts under `root` that `change` reaches.
 * @param {{ paths: ReadonlyArray<string> }} change
 * @param {ParentNode} [root]
 * @returns {number} how many were redrawn (a part holding the cursor waits)
 */
export function refreshLiveParts(change, root = document) {
  if (!root || typeof root.querySelectorAll !== 'function' || !getD()) return 0;
  let count = 0;
  root.querySelectorAll('[data-live-part]').forEach((element) => {
    const el = /** @type {HTMLElement} */ (element);
    const part = PARTS.get(el.dataset.livePart || '');
    if (!part) return;
    const depends = typeof part.paths === 'function' ? part.paths(el.dataset.liveKey ?? '') : part.paths;
    if (!changeTouches(depends, change.paths || [WHOLE_FILING])) return;
    const active = typeof document !== 'undefined' ? document.activeElement : null;
    if (active && el.contains(active)) {
      if (el.dataset.liveStale) return;
      el.dataset.liveStale = '1';
      el.addEventListener('focusout', function onLeave(event) {
        const next = /** @type {Node | null} */ (/** @type {FocusEvent} */ (event).relatedTarget);
        if (next && el.contains(next)) return;
        el.removeEventListener('focusout', onLeave);
        // After the leaving field's own write has run.
        setTimeout(() => { if (el.isConnected && el.dataset.liveStale) redraw(el, part); }, 0);
      });
      return;
    }
    redraw(el, part);
    count++;
  });
  return count;
}

/** Installed once at startup: every announced change refreshes the parts it reaches. @param {{ signal?: AbortSignal }} [options] */
export function installLiveParts({ signal } = {}) {
  return onModelChange((change) => refreshLiveParts(change), { signal });
}
