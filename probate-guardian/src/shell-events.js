import { getCaseFile } from './core/state.js';
import { closeMobileSidebar, navigate, toggleMobileSidebar } from './core/navigation/router.js';
import { handleBackupImportChange, hideAutoExportReminder, saveAutoExportIntervalPref, saveBackupNow, triggerOpenBackupSav } from './core/persistence/case-file.js';
import { filingLifecycle } from './core/navigation/filing-lifecycle.js';
import { confirmDeleteWard } from './core/modals/filing-dialogs.js';
function handleShellClick(event) {
  const actionElement = event.target instanceof Element ? event.target.closest('[data-shell-action]') : null;
  if (!actionElement) return;

  switch (actionElement.dataset.shellAction) {
    case 'activity-log': window.toggleHelpPanel(); navigate('/activity-log'); break;
    case 'backup-all-wards': window.collapseSaveControls?.(); saveBackupNow(); break;
    case 'clear-data': window.collapseSaveControls?.(); window.clearAllData(); break;
    case 'close-mobile-sidebar': closeMobileSidebar(); break;
    case 'close-ward': window.collapseWardControls?.(); filingLifecycle.unload(); break;
    case 'dashboard': navigate('/dashboard'); break;
    case 'delete-ward': window.collapseWardControls?.(); confirmDeleteWard(); break;
    case 'export-help': window.openUserGuide(); break;
    case 'hide-auto-export-reminder': hideAutoExportReminder(); break;
    case 'lock': window.collapseSaveControls?.(); window.lockApp(); break;
    case 'new-form': window.collapseWardControls?.(); navigate('/inventory-select'); break;
    case 'next-walkthrough': window.nextWalkthroughStep(); break;
    case 'open-backup-sav': window.collapseSaveControls?.(); triggerOpenBackupSav?.(); break;
    case 'party-management': window.toggleHelpPanel(); navigate('/party-management'); break;
    case 'save-backup': window.collapseSaveControls?.(); saveBackupNow(); break;
    case 'skip-walkthrough': window.skipWalkthrough(); break;
    case 'start-walkthrough': window.startWalkthrough(); break;
    case 'switch-ward': window.handleSwitchWardClick(); break;
    // Milestone 48: on the dashboard (no filing open), "?" still opens the
    // Help panel -- guided tour, activity log, and shared records live only
    // there and aren't needed mid-filing. Inside a filing, "?" skips the
    // panel and jumps straight to the manual page for the current one.
    case 'toggle-help':
      if (getCaseFile()?.activeWardId) window.openUserGuideForCurrentPage?.();
      else window.toggleHelpPanel();
      break;
    case 'toggle-mobile-sidebar': toggleMobileSidebar(); break;
    case 'toggle-save-controls': window.toggleSaveControls(); break;
    case 'toggle-theme': window.toggleTheme(); break;
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
    saveAutoExportIntervalPref(Number.parseInt(event.target.value, 10));
  } else if (event.target instanceof HTMLInputElement && event.target.id === 'backup-import-input' && event.target.files?.[0]) {
    handleBackupImportChange?.(event.target);
  }
}

document.addEventListener('click', handleShellClick);
document.addEventListener('input', handleShellInput);
document.addEventListener('focusin', handleShellFocus);
document.addEventListener('keydown', handleShellKeydown);
document.addEventListener('change', handleShellChange);