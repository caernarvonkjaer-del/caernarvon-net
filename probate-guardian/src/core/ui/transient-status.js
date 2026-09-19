// One owner for the small status lines the export and import actions write
// into -- `#export-status` on the print pages, and each import control's own
// progress element.
//
// What this fixes, in the filer's terms: they export a workbook, the line says
// "✓ Exported!", and a second later it vanishes, leaving no sign the file was
// ever written. It happened whenever two of these actions ran within three
// seconds of each other, because each one ended with
//
//     setTimeout(() => { el.textContent = ''; }, 3000)
//
// and nothing cancelled it. The first action's timer was still armed when the
// second one finished, so it wiped the second one's message. A retry after a
// failed export is exactly that pattern, which is how
// tests/e2e/vendor-loader-retry.spec.ts caught it: the retry downloads a real
// workbook and the confirmation is gone before the filer can read it.
//
// guardian-inventory's excel.js and print.js made it worse by sharing
// `#export-status` with no idea of each other -- print.js cleared the element
// outright in its own `finally`, so saving a PDF wiped the Excel export's
// confirmation immediately.
//
// So writes go through here instead. Any pending clear for an element is
// cancelled the moment anything else writes to it: the only timer that can
// ever fire is the one belonging to the message currently on screen.

/**
 * Pending clear timers, keyed by the element they will clear.
 * WeakMap so a detached element (every route change rebuilds the page) is
 * collectable without anything having to deregister it.
 */
const pendingClears = new WeakMap();

/** Cancels an element's pending clear, if it has one. */
function cancelPendingClear(el) {
  const timer = pendingClears.get(el);
  if (timer !== undefined) {
    clearTimeout(timer);
    pendingClears.delete(el);
  }
}

/**
 * Writes `text` into `el` now, cancelling any clear an earlier call scheduled.
 *
 * Use this for every write, progress messages included: it is the progress
 * message of a *second* action that has to disarm the first action's clear,
 * before the second one has anything to protect.
 *
 * A null element is accepted and ignored -- these status lines only exist on
 * the pages that render them, and every caller already tolerated their absence.
 */
export function setStatus(el, text) {
  if (!el) return;
  cancelPendingClear(el);
  el.textContent = text;
}

/**
 * Clears `el` after `ms`, replacing any clear already scheduled for it.
 *
 * Call it once the action is over, including on the paths that bail out early
 * -- a `finally` is the right home, which is where the original setTimeout
 * calls already were.
 */
export function scheduleStatusClear(el, ms = 3000) {
  if (!el) return;
  cancelPendingClear(el);
  pendingClears.set(el, setTimeout(() => {
    pendingClears.delete(el);
    el.textContent = '';
  }, ms));
}

/** Clears `el` immediately, cancelling any pending clear. */
export function clearStatusNow(el) {
  setStatus(el, '');
}
