function handleModalClick(event) {
  const actionElement = event.target instanceof Element ? event.target.closest('[data-modal-action]') : null;
  if (!actionElement) return;

  switch (actionElement.dataset.modalAction) {
    case 'add-ward': window.doAddWard(); break;
    case 'close': window.closeModal(actionElement.dataset.modalId); break;
    case 'close-ward-locked': window.closeWardLockedModal(); break;
    case 'confirm-simplified-eligibility': window.doConfirmSimplifiedEligibility(); break;
    case 'convert-ward': window.doConvertWard(); break;
    case 'delete-ward': window.doDeleteWard(); break;
    case 'delete-ward-year': window.doDeleteWardYear(); break;
    case 'guardian-setup': window.doGuardianSetup(); break;
    case 'load-ward-info': window.doLoadWardInfo(); break;
    case 'rename-ward': window.doRenameWard(); break;
    case 'save-backup': window.closeModal(actionElement.dataset.modalId); window.saveBackupNow(); break;
    case 'start-new-year': window.confirmStartNewYear(); break;
    case 'switch-ward': window.closeModal('switchWardPickerModal'); window.switchWard(actionElement.dataset.wardId); break;
  }
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
  if (event.key === 'Escape') {
    const lockedModal = document.getElementById('ward-locked-overlay');
    if (lockedModal && lockedModal.classList.contains('show')) {
      event.preventDefault();
      if (window.closeWardLockedModal) window.closeWardLockedModal();
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