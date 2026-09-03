function handleShellClick(event) {
  const actionElement = event.target instanceof Element ? event.target.closest('[data-shell-action]') : null;
  if (!actionElement) return;

  switch (actionElement.dataset.shellAction) {
    case 'activity-log': window.toggleHelpPanel(); window.navigate('/activity-log'); break;
    case 'clear-data': window.collapseSaveControls?.(); window.clearAllData(); break;
    case 'close-mobile-sidebar': window.closeMobileSidebar(); break;
    case 'close-ward': window.collapseWardControls?.(); if (window.unloadWard) window.unloadWard(); break;
    case 'dashboard': window.navigate('/dashboard'); break;
    case 'delete-ward': window.collapseWardControls?.(); window.confirmDeleteWard(); break;
    case 'export-data':
      window.collapseSaveControls?.();
      if (typeof window.getActiveWard === 'function' && window.getActiveWard()) {
        window.saveBackupNow();
      } else if (typeof window.exportGuardianDataZip === 'function') {
        window.exportGuardianDataZip();
      }
      break;
    case 'hide-auto-export-reminder': window.hideAutoExportReminder(); break;
    case 'import-data': window.collapseSaveControls?.(); window.triggerImportZip(); break;
    case 'lock': window.collapseSaveControls?.(); window.lockApp(); break;
    case 'new-form': window.collapseWardControls?.(); window.navigate('/inventory-select'); break;
    case 'next-walkthrough': window.nextWalkthroughStep(); break;
    case 'rename-ward': window.collapseWardControls?.(); window.showRenameWardModal(); break;
    case 'save-backup': window.collapseSaveControls?.(); window.saveBackupNow(); break;
    case 'skip-walkthrough': window.skipWalkthrough(); break;
    case 'start-walkthrough': window.startWalkthrough(); break;
    case 'switch-ward': window.handleSwitchWardClick(); break;
    case 'toggle-help': window.toggleHelpPanel(); break;
    case 'toggle-mobile-sidebar': window.toggleMobileSidebar(); break;
    case 'toggle-save-controls': window.toggleSaveControls(); break;
    case 'toggle-theme': window.toggleTheme(); break;
    case 'toggle-ward-controls': window.toggleWardControls(); break;
  }
}

function handleShellInput(event) {
  if (event.target instanceof HTMLInputElement && event.target.id === 'ward-selector') {
    window.onWardSelectorInput();
  }
}

function handleShellFocus(event) {
  if (event.target instanceof HTMLInputElement && event.target.id === 'ward-selector') {
    window.onWardSelectorFocus();
  }
}

function handleShellKeydown(event) {
  if (event.target instanceof HTMLInputElement && event.target.id === 'ward-selector') {
    window.onWardSelectorKeydown(event);
  }
}

function handleShellChange(event) {
  if (event.target instanceof HTMLSelectElement && event.target.id === 'auto-export-interval-select') {
    window.collapseSaveControls?.();
    window.saveAutoExportIntervalPref(Number.parseInt(event.target.value, 10));
  } else if (event.target instanceof HTMLInputElement && event.target.id === 'zip-import-input' && event.target.files?.[0]) {
    window.importGuardianDataZip(event.target.files[0]);
  }
}

document.addEventListener('click', handleShellClick);
document.addEventListener('input', handleShellInput);
document.addEventListener('focusin', handleShellFocus);
document.addEventListener('keydown', handleShellKeydown);
document.addEventListener('change', handleShellChange);