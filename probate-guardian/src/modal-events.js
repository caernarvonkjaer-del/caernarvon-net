import { formatName } from './core/form/form-contract.js';
import { saveBackupNow } from './core/persistence/case-file.js';
import { filingLifecycle } from './core/navigation/filing-lifecycle.js';
import { doAddWard, doConfirmSimplifiedEligibility, doDeleteWard } from './core/modals/filing-dialogs.js';
import { doCreateCaseFromWard, doCreatePartyFromSlot, doPickCase, doPickParty } from './core/modals/pick-record-dialogs.js';
import { confirmStartNewYear, doDeleteWardYear } from './core/modals/year-dialogs.js';
import { doConvertWard, onConvertSourceFocus, onConvertSourceInput, onConvertSourceKeydown } from './core/modals/convert-ward-modal.js';
import { onCarrySourceChange, updateCarrySourcePicker } from './core/filing/carry-over.js';
import { closeModal } from './core/ui/dialogs.js';
import { doGuardianSetup } from './core/modals/guardian-setup.js';
import { closeWardLockedModal } from './core/ward-lock.js';
// Milestone 70, 70H: this module's document listeners are collected here and
// added by installModalEvents(), once, from main.js -- not as a side effect of
// importing it; its signal removes them.
const listeners = [];
const on = (type, handler, options) => listeners.push([type, handler, options]);
async function handleModalClick(event) {
  const actionElement = event.target instanceof Element ? event.target.closest('[data-modal-action]') : null;
  if (!actionElement) return;

  switch (actionElement.dataset.modalAction) {
    case 'add-ward': doAddWard(); break;
    case 'close': closeModal(actionElement.dataset.modalId); break;
    case 'close-ward-locked': closeWardLockedModal(); break;
    case 'confirm-simplified-eligibility': doConfirmSimplifiedEligibility(); break;
    case 'convert-ward': doConvertWard(); break;
    case 'create-case-from-ward': doCreateCaseFromWard(); break;
    case 'create-party-from-slot': doCreatePartyFromSlot(); break;
    case 'delete-ward': doDeleteWard(); break;
    case 'delete-ward-year': doDeleteWardYear(); break;
    case 'guardian-setup': doGuardianSetup(); break;
    case 'pick-case': doPickCase(); break;
    case 'pick-party': doPickParty(); break;
    case 'save-backup': closeModal(actionElement.dataset.modalId); saveBackupNow(); break;
    case 'start-new-year': confirmStartNewYear(); break;
    case 'switch-ward': closeModal('switchWardPickerModal'); await filingLifecycle.switchTo(actionElement.dataset.wardId); break;
  }
}

function prepareModalAccessibility(modal) {
  const box = modal?.querySelector('.modal-box');
  if (!box) return;
  box.setAttribute('role', 'dialog');
  box.setAttribute('aria-modal', 'true');
  const title = box.querySelector('h1, h2, h3, [role="heading"]');
  if (title) {
    if (!title.id) title.id = `modal-title-${Math.random().toString(36).slice(2, 9)}`;
    box.setAttribute('aria-labelledby', title.id);
  }
}

function getModalFocusables(modal) {
  return [...modal.querySelectorAll('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])')]
    .filter(element => element.getClientRects().length > 0);
}

function handleModalInput(event) {
  if (!(event.target instanceof HTMLInputElement)) return;
  // format-name fields are intentionally NOT reformatted here on every
  // keystroke: formatName()/formatSafeTitleCase() is a *finalize* formatter
  // (it trims trailing whitespace, and treats a bare 2-letter word as a
  // state abbreviation to uppercase) meant to run once on a complete value.
  // Applied live it fights normal typing -- typing "ga" toward "Garrett"
  // gets read as the abbreviation "GA" and uppercased, and a trailing space
  // gets trimmed the instant it's typed, making the space key look broken.
  // See handleModalBlur for the one-time formatting on blur instead.
  if (event.target.dataset.modalInput === 'convert-source') {
    onConvertSourceInput();
  }
}

function handleModalBlur(event) {
  if (!(event.target instanceof HTMLInputElement)) return;
  if (event.target.dataset.modalInput === 'format-name') {
    event.target.value = formatName(event.target.value);
  }
}

function handleModalFocus(event) {
  if (event.target instanceof HTMLInputElement && event.target.dataset.modalInput === 'convert-source') {
    onConvertSourceFocus();
  }
}

function handleModalKeydown(event) {
  const openModals = [...document.querySelectorAll('.modal-overlay.show')];
  const activeModal = openModals[openModals.length - 1];
  if (activeModal) {
    prepareModalAccessibility(activeModal);
    if (event.key === 'Escape') {
      event.preventDefault();
      if (activeModal.id === 'ward-locked-overlay') closeWardLockedModal();
      else closeModal?.(activeModal.id);
      return;
    }
    if (event.key === 'Tab') {
      const focusables = getModalFocusables(activeModal);
      if (focusables.length > 0) {
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (event.shiftKey && (document.activeElement === first || !activeModal.contains(document.activeElement))) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && (document.activeElement === last || !activeModal.contains(document.activeElement))) {
          event.preventDefault();
          first.focus();
        }
      } else {
        event.preventDefault();
      }
      return;
    }
  }
  if (event.target instanceof HTMLInputElement && event.target.dataset.modalInput === 'convert-source') {
    onConvertSourceKeydown(event);
  }
}

function handleModalChange(event) {
  if (!(event.target instanceof HTMLSelectElement)) return;
  if (event.target.dataset.modalChange === 'ward-type') {
    updateCarrySourcePicker();
  } else if (event.target.dataset.modalChange === 'carry-source') {
    onCarrySourceChange();
  }
}

on('click', handleModalClick);
on('input', handleModalInput);
on('focusin', handleModalFocus);
on('focusout', handleModalBlur);
on('keydown', handleModalKeydown);
on('change', handleModalChange);

/** Add this module's listeners, and the observer that prepares each dialog added to the page; the signal removes them. Called once, by main.js. */
export function installModalEvents({ signal } = {}) {
  for (const [type, handler, options] of listeners) {
    const opts = typeof options === 'object' && options ? options : { capture: !!options };
    document.addEventListener(type, handler, { ...opts, signal });
  }
  const modalA11yObserver = new MutationObserver(() => {
    document.querySelectorAll('.modal-overlay').forEach(prepareModalAccessibility);
  });
  modalA11yObserver.observe(document.body, { childList: true, subtree: true });
  signal?.addEventListener('abort', () => modalA11yObserver.disconnect(), { once: true });
}
