function handleModalClick(event) {
  const actionElement = event.target instanceof Element ? event.target.closest('[data-modal-action]') : null;
  if (!actionElement) return;

  switch (actionElement.dataset.modalAction) {
    case 'add-ward': window.doAddWard(); break;
    case 'close': window.closeModal(actionElement.dataset.modalId); break;
    case 'close-ward-locked': window.closeWardLockedModal(); break;
    case 'confirm-simplified-eligibility': window.doConfirmSimplifiedEligibility(); break;
    case 'convert-ward': window.doConvertWard(); break;
    case 'create-case-from-ward': window.doCreateCaseFromWard(); break;
    case 'create-party-from-slot': window.doCreatePartyFromSlot(); break;
    case 'delete-ward': window.doDeleteWard(); break;
    case 'delete-ward-year': window.doDeleteWardYear(); break;
    case 'guardian-setup': window.doGuardianSetup(); break;
    case 'pick-case': window.doPickCase(); break;
    case 'pick-party': window.doPickParty(); break;
    case 'rename-ward': window.doRenameWard(); break;
    case 'save-backup': window.closeModal(actionElement.dataset.modalId); window.saveBackupNow(); break;
    case 'start-new-year': window.confirmStartNewYear(); break;
    case 'switch-ward': window.closeModal('switchWardPickerModal'); window.switchWard(actionElement.dataset.wardId); break;
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
  if (event.target.dataset.modalInput === 'format-name') {
    event.target.value = window.formatName(event.target.value);
  } else if (event.target.dataset.modalInput === 'convert-source') {
    window.onConvertSourceInput();
  }
}

function handleModalFocus(event) {
  if (event.target instanceof HTMLInputElement && event.target.dataset.modalInput === 'convert-source') {
    window.onConvertSourceFocus();
  }
}

function handleModalKeydown(event) {
  const openModals = [...document.querySelectorAll('.modal-overlay.show')];
  const activeModal = openModals[openModals.length - 1];
  if (activeModal) {
    prepareModalAccessibility(activeModal);
    if (event.key === 'Escape') {
      event.preventDefault();
      if (activeModal.id === 'ward-locked-overlay' && window.closeWardLockedModal) window.closeWardLockedModal();
      else window.closeModal?.(activeModal.id);
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
    window.onConvertSourceKeydown(event);
  }
}

function handleModalChange(event) {
  if (!(event.target instanceof HTMLSelectElement)) return;
  if (event.target.dataset.modalChange === 'ward-type') {
    window.updateCarrySourcePicker();
  } else if (event.target.dataset.modalChange === 'carry-source') {
    window.onCarrySourceChange();
  }
}

document.addEventListener('click', handleModalClick);
document.addEventListener('input', handleModalInput);
document.addEventListener('focusin', handleModalFocus);
document.addEventListener('keydown', handleModalKeydown);
document.addEventListener('change', handleModalChange);

const modalA11yObserver = new MutationObserver(() => {
  document.querySelectorAll('.modal-overlay').forEach(prepareModalAccessibility);
});
modalA11yObserver.observe(document.body, { childList: true, subtree: true });