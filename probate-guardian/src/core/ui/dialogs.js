// @ts-nocheck -- pulled into tsconfig.json's checked program only
// transitively (case-file.js, an included file, imports alertModal/
// confirmModal/promptModal from here). This file itself was never written
// with JSDoc types and isn't part of the deliberate check:types surface
// (AGENTS.md §1) -- opting out documents that honestly instead of inventing
// types nobody asked for.
//
// Milestone 50G: awaitable replacements for the browser's native confirm()/
// alert()/prompt(), built on this app's existing modal visual system
// (.modal-overlay/.modal-box, fragments/common-modals.html) rather than a
// second one. A native dialog is modal at the *browser* level, not just the
// page level -- confirmed to freeze automated testing tooling for an
// extended period in one observed session -- and looks nothing like every
// other confirmation the app shows.
//
// Deliberately NOT added to fragments/common-modals.html: every modal there
// is a fixed, purpose-built form (Add Ward, Convert Ward, ...) shown/hidden
// by id via showModal()/closeModal(). These three are generic and
// content-driven -- 86 call sites, no two with the same message -- so each
// call builds one throwaway `.modal-overlay` node, appends it to
// `document.body`, and removes it on resolve rather than reusing a static
// element. That element still gets full modal treatment for free: modal-
// events.js's `modalA11yObserver` (a MutationObserver on document.body)
// stamps role="dialog"/aria-modal/aria-labelledby onto any `.modal-box` that
// appears anywhere in the DOM, and its keydown handler Tab-traps whichever
// `.modal-overlay.show` is topmost in DOM order -- which a freshly-appended
// node always is. Milestone 73L: a pop-up now labels itself as it is shown
// and handles its own Escape (onEscape(), below), and pop-ups take turns.
//
// Each function accepts either a bare string (used as the message, with a
// sensible default title) or an options object -- the bare-string form is
// what almost every call site actually needs, so a mechanical
// `alert('X')` -> `await alertModal('X')` conversion covers nearly all of
// them.
import { loadFragment } from '../../fragment-loader.js';

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function normalizeOptions(messageOrOptions, defaults) {
  if (typeof messageOrOptions === 'string') return { ...defaults, message: messageOrOptions };
  return { ...defaults, ...(messageOrOptions || {}) };
}

let _dialogSeq = 0;

// Milestone 73L: one pop-up at a time. Each was its own layer, shown on the
// next animation frame with no queue, so two stacked (the documents reminder
// over "Please confirm"), and a hidden browser tab -- which runs no animation
// frames -- left them waiting unseen. Now a pop-up waits its turn, first in,
// first out, and is shown, labelled and focused as soon as it is built. Only
// these pop-ups queue: Add Form and the eligibility dialog wait on pop-ups
// while they are open, so queuing them behind one would deadlock.
/** @type {Array<{ open: () => void, cancel: () => void }>} */
const waiting = [];
/** The pop-up on screen: how to close it with its own "no" (Cancel, Escape). */
let showing = null;

/**
 * Queues a pop-up. `open()` builds and shows it; `cancel()` settles it, unseen
 * or on screen, with its own "no". `stillWanted()`, if given, is asked when its
 * turn comes: a pop-up no longer wanted (the documents reminder, after the
 * filer has moved to another page or filing) is settled with its "no" unseen.
 */
function enqueue(open, cancel, stillWanted) {
  waiting.push({ open: () => (stillWanted && !stillWanted() ? (cancel(), next()) : open()), cancel });
  if (!showing) next();
}

function next() {
  showing = null;
  const entry = waiting.shift();
  if (entry) entry.open();
}

/**
 * Milestone 73L: locking closes every pop-up -- the one on screen and the ones
 * waiting -- each with its own "no" (Cancel; an alert is simply dismissed), so
 * nothing is left over the lock screen showing names, or acting on data the
 * lock has cleared. Returns how many were closed.
 */
export function closeAllPopups() {
  const pending = waiting.splice(0);
  const current = showing;
  pending.forEach((entry) => entry.cancel());
  current?.cancel();
  return pending.length + (current ? 1 : 0);
}

/** Builds and appends the shared overlay/box shell; returns the elements. Caller fills `box.innerHTML` and shows it. */
function buildShell() {
  const id = `dyn-dialog-${++_dialogSeq}`;
  const overlay = document.createElement('div');
  overlay.id = id;
  overlay.className = 'modal-overlay';
  const box = document.createElement('div');
  box.className = 'modal-box';
  overlay.appendChild(box);
  document.body.appendChild(overlay);
  return { overlay, box };
}

/**
 * Returns a `finish(value)` that resolves `resolve` exactly once no matter
 * which button or Escape calls it (idempotent -- a second call is a no-op),
 * then removes the overlay from the DOM, restores focus to whatever had it
 * when the pop-up was shown -- native dialogs do this implicitly; a DOM node
 * doesn't -- and shows the next pop-up waiting. Does not itself wire Escape:
 * each dialog type below binds its own single Escape listener with the
 * resolve value its own native counterpart uses (false for confirm, null for
 * prompt, void for alert), since a second, generic listener here racing
 * against that one would win arbitrarily by registration order and return
 * the wrong value.
 */
function makeFinisher(overlay, resolve) {
  // Milestone 73L: recorded when the pop-up is shown, not when it was asked
  // for -- one asked for while a page was being drawn recorded a box the
  // drawing then replaced, and answering it left the cursor nowhere.
  const previouslyFocused = document.activeElement;
  // Ends the dialog's own listeners (its Escape key) however it closes.
  const controller = new AbortController();
  let done = false;
  function finish(value) {
    if (done) return;
    done = true;
    controller.abort();
    overlay.classList.remove('show');
    overlay.remove();
    if (previouslyFocused instanceof HTMLElement && document.contains(previouslyFocused)) previouslyFocused.focus();
    resolve(value);
    next();
  }
  finish.signal = controller.signal;
  return finish;
}

/** The dialog on top: the last one shown in the page's order (a pop-up, Add Form, a lock screen). */
function topDialog() {
  const open = document.querySelectorAll('.modal-overlay.show');
  return open[open.length - 1] || null;
}

/**
 * Binds a capture-phase Escape listener that calls `finish(value)`; it ends
 * when the dialog does, however it closes. Milestone 73L: only while this
 * pop-up is the dialog on top, and the key stops here -- it used to carry on
 * to the shared handler (modal-events.js), which then closed the dialog
 * beneath as well: one Escape on "Please enter a ward name" closed Add Form
 * too.
 */
function onEscape(finish, value, overlay) {
  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape' || topDialog() !== overlay) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    finish(value);
  }, { capture: true, signal: finish.signal });
}

/**
 * Shows a built pop-up at once: labelled as a dialog, visible, focused.
 * Milestone 73L: no animation frame -- the frames were for the labels and the
 * focus, neither of which needs one, and a hidden tab never runs them.
 */
function showAndFocus(overlay, focusTarget) {
  const box = overlay.querySelector('.modal-box');
  if (box) {
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-modal', 'true');
    const title = box.querySelector('h1, h2, h3, [role="heading"]');
    if (title) {
      if (!title.id) title.id = `${overlay.id}-title`;
      box.setAttribute('aria-labelledby', title.id);
    }
  }
  overlay.classList.add('show');
  focusTarget?.focus();
}

/**
 * One pop-up, in its turn: `build(box, finish, overlay)` fills the box, wires
 * its buttons and returns what takes the focus; `noValue` is its "no"
 * (Cancel, Escape, a lock, no longer wanted).
 */
function popup(build, noValue, stillWanted) {
  return new Promise((resolve) => {
    let finish = null;
    enqueue(() => {
      const { overlay, box } = buildShell();
      finish = makeFinisher(overlay, resolve);
      showing = { cancel: () => finish(noValue) };
      const focusTarget = build(box, finish, overlay);
      onEscape(finish, noValue, overlay);
      showAndFocus(overlay, focusTarget);
    }, () => (finish ? finish(noValue) : resolve(noValue)), stillWanted);
  });
}

/**
 * Awaitable confirm(). Resolves `true` on Confirm, `false` on Cancel or
 * Escape -- exactly native confirm()'s contract, so `if (!(await
 * confirmModal(...))) return;` is a drop-in replacement for
 * `if (!confirm(...)) return;`.
 */
export function confirmModal(messageOrOptions) {
  const { title, message, confirmLabel, cancelLabel, danger, stillWanted } = normalizeOptions(messageOrOptions, {
    title: 'Please confirm', message: '', confirmLabel: 'OK', cancelLabel: 'Cancel', danger: false,
  });
  // false on Cancel or Escape matches native confirm()'s contract.
  return popup((box, finish) => {
    box.innerHTML = `<h2 class="modal-box-title mb-3">${esc(title)}</h2>
      ${message ? `<div class="modal-box-intro" style="white-space:pre-line">${esc(message)}</div>` : ''}
      <div class="d-flex gap-2 mt-2">
        <button type="button" class="btn ${danger ? 'btn-danger' : 'btn-primary'} flex-fill" data-dyn-action="confirm">${esc(confirmLabel)}</button>
        <button type="button" class="btn btn-outline-secondary flex-fill" data-dyn-action="cancel">${esc(cancelLabel)}</button>
      </div>`;
    const confirmBtn = box.querySelector('[data-dyn-action="confirm"]');
    confirmBtn.addEventListener('click', () => finish(true));
    box.querySelector('[data-dyn-action="cancel"]').addEventListener('click', () => finish(false));
    return confirmBtn;
  }, false, stillWanted);
}

/** Awaitable alert(). Resolves (void) once dismissed -- OK button or Escape. */
export function alertModal(messageOrOptions) {
  const { title, message, okLabel } = normalizeOptions(messageOrOptions, { title: 'Notice', message: '', okLabel: 'OK' });
  return popup((box, finish) => {
    box.innerHTML = `<h2 class="modal-box-title mb-3">${esc(title)}</h2>
      ${message ? `<div class="modal-box-intro" style="white-space:pre-line">${esc(message)}</div>` : ''}
      <div class="d-flex mt-2"><button type="button" class="btn btn-primary flex-fill" data-dyn-action="ok">${esc(okLabel)}</button></div>`;
    const okBtn = box.querySelector('[data-dyn-action="ok"]');
    okBtn.addEventListener('click', () => finish(undefined));
    return okBtn;
  }, undefined);
}

/**
 * Awaitable prompt(). Resolves the trimmed input string on OK (even if
 * empty -- matching native prompt(), which returns "" for a blank
 * confirmed field), or `null` on Cancel or Escape.
 */
export function promptModal(messageOrOptions) {
  const { title, message, defaultValue, okLabel, cancelLabel, inputType } = normalizeOptions(messageOrOptions, {
    title: 'Please enter a value', message: '', defaultValue: '', okLabel: 'OK', cancelLabel: 'Cancel', inputType: 'text',
  });
  // null on Cancel or Escape matches native prompt()'s contract.
  return popup((box, finish, overlay) => {
    const inputId = `${overlay.id}-input`;
    box.innerHTML = `<h2 class="modal-box-title mb-3">${esc(title)}</h2>
      ${message ? `<div class="modal-box-intro" style="white-space:pre-line">${esc(message)}</div>` : ''}
      <div class="mb-3"><label class="form-label visually-hidden" for="${inputId}">${esc(title)}</label>
        <input type="${esc(inputType)}" class="form-control" id="${inputId}" value="${esc(defaultValue)}"></div>
      <div class="d-flex gap-2 mt-2">
        <button type="button" class="btn btn-primary flex-fill" data-dyn-action="ok">${esc(okLabel)}</button>
        <button type="button" class="btn btn-outline-secondary flex-fill" data-dyn-action="cancel">${esc(cancelLabel)}</button>
      </div>`;
    const input = box.querySelector('input');
    const commit = () => finish(input.value.trim());
    box.querySelector('[data-dyn-action="ok"]').addEventListener('click', commit);
    box.querySelector('[data-dyn-action="cancel"]').addEventListener('click', () => finish(null));
    input.addEventListener('keydown', (event) => { if (event.key === 'Enter') { event.preventDefault(); commit(); } });
    return input;
  }, null);
}


/**
 * Milestone 73E part 1: an awaitable confirmation that also asks questions,
 * each answered with one of its options (radio buttons in a fieldset whose
 * legend is the question). The confirm button stays disabled until every
 * question shown has an answer; a question with `onlyIf: { id, value }` is
 * shown only while question `id` holds `value` (a near-name match's
 * shared-record question, asked only if the filer says it is the same
 * person). Resolves `{ [questionId]: value }` for the questions shown, or
 * null on Cancel or Escape. The import transaction's confirmation
 * (src/core/excel/import-confirm.js) is its first caller.
 */
export function choicesModal(options) {
  const { title, message, questions, confirmLabel, cancelLabel } = normalizeOptions(options, {
    title: 'Please confirm', message: '', questions: [], confirmLabel: 'OK', cancelLabel: 'Cancel',
  });
  return popup((box, finish, overlay) => {
    const groupName = (i) => `${overlay.id}-q${i}`;
    box.innerHTML = `<h2 class="modal-box-title mb-3">${esc(title)}</h2>
      ${message ? `<div class="modal-box-intro" style="white-space:pre-line">${esc(message)}</div>` : ''}
      ${questions.map((q, i) => `<fieldset class="mb-3" data-dyn-question="${esc(q.id)}">
        <legend class="form-label fs-6">${esc(q.prompt)}</legend>
        ${q.options.map((o, j) => `<div class="form-check"><input class="form-check-input" type="radio" name="${groupName(i)}" id="${groupName(i)}-${j}" value="${esc(o.value)}"><label class="form-check-label" for="${groupName(i)}-${j}">${esc(o.label)}</label></div>`).join('')}
      </fieldset>`).join('')}
      <div class="d-flex gap-2 mt-2">
        <button type="button" class="btn btn-primary flex-fill" data-dyn-action="confirm">${esc(confirmLabel)}</button>
        <button type="button" class="btn btn-outline-secondary flex-fill" data-dyn-action="cancel">${esc(cancelLabel)}</button>
      </div>`;
    const confirmBtn = box.querySelector('[data-dyn-action="confirm"]');
    const fieldsets = [...box.querySelectorAll('fieldset[data-dyn-question]')];
    const answers = () => Object.fromEntries(questions.map((q, i) => [q.id, box.querySelector(`input[name="${groupName(i)}"]:checked`)?.value]));
    const isShown = (q, given) => !q.onlyIf || given[q.onlyIf.id] === q.onlyIf.value;
    const refresh = () => {
      const given = answers();
      let complete = true;
      questions.forEach((q, i) => {
        const shown = isShown(q, given);
        fieldsets[i].hidden = !shown;
        if (shown && !given[q.id]) complete = false;
      });
      confirmBtn.disabled = !complete;
    };
    box.addEventListener('change', refresh);
    refresh();
    confirmBtn.addEventListener('click', () => {
      const given = answers();
      finish(Object.fromEntries(questions.filter((q) => isShown(q, given) && given[q.id]).map((q) => [q.id, given[q.id]])));
    });
    box.querySelector('[data-dyn-action="cancel"]').addEventListener('click', () => finish(null));
    return box.querySelector('input[type="radio"]') || confirmBtn;
  }, null);
}

// Milestone 70, 70H: the static dialogs -- showing and closing one, and
// loading the fragment that holds it. Moved from legacy-app.js's MODAL
// FUNCTIONS.
export function closeModal(modalId){
  const el=document.getElementById(modalId);
  if(el)el.classList.remove('show');
}

// Every modal showModal() is ever called with lives in the lazy
// 'common-modals' fragment (src/fragment-loader.js) -- the three overlays
// needed on every session (startup-choice, security-choice, unlock) are
// shown via direct classList manipulation elsewhere, never through this
// function. Fetched and appended into #lazy-fragment-host on first use only;
// _fragmentAppended memoizes so a repeat open doesn't re-fetch or re-append.
export const _fragmentAppended={};

export async function ensureFragment(name){
  if(_fragmentAppended[name])return;
  const content=await loadFragment(name);
  document.getElementById('lazy-fragment-host').appendChild(content);
  _fragmentAppended[name]=true;
}

export async function showModal(modalId){
  await ensureFragment('common-modals');
  const el=document.getElementById(modalId);
  if(!el)throw new Error(`Modal element "${modalId}" not found`);
  el.classList.add('show');
}
