import { getActiveWard, getCaseFile } from './core/state.js';
import { closeMobileSidebar, navigate, toggleMobileSidebar } from './core/navigation/router.js';
import { hideAutoExportReminder, saveAutoExportIntervalPref, saveBackupNow, saveData } from './core/persistence/case-file.js';
import { filingLifecycle } from './core/navigation/filing-lifecycle.js';
import { confirmDeleteWard } from './core/modals/filing-dialogs.js';
import { toggleHelpPanel } from './core/help/help-panel.js';
import { collapseSaveControls, collapseWardControls, toggleSaveControls, updateSidebar } from './core/shell/sidebar.js';
import { openUserGuide, openUserGuideForCurrentPage } from './core/help/user-guide.js';
import { nextWalkthroughStep, skipWalkthrough, startWalkthrough } from './core/help/walkthrough.js';
import { handleSwitchWardClick, onWardSelectorFocus, onWardSelectorInput, onWardSelectorKeydown } from './core/shell/filing-switcher.js';
import { toggleTheme } from './core/theme-preference.js';
import { initializeEmptyData } from './core/filing/filing-registry.js';
import { confirmModal } from './core/ui/dialogs.js';
import { handleBackupImportChange, triggerOpenBackupSav } from './core/persistence/case-import.js';
import { lockApp } from './core/security/app-lock.js';
// Milestone 70, 70H: this module's document listeners are collected here and
// added by installShellEvents(), once, from main.js -- not as a side effect of
// importing it; its signal removes them.
const listeners = [];
const on = (type, handler, options) => listeners.push([type, handler, options]);
function handleShellClick(event) {
  const actionElement = event.target instanceof Element ? event.target.closest('[data-shell-action]') : null;
  if (!actionElement) return;

  switch (actionElement.dataset.shellAction) {
    case 'activity-log': toggleHelpPanel(); navigate('/activity-log'); break;
    case 'backup-all-wards': collapseSaveControls?.(); saveBackupNow(); break;
    case 'clear-data': collapseSaveControls?.(); clearAllData(); break;
    case 'close-mobile-sidebar': closeMobileSidebar(); break;
    case 'close-ward': collapseWardControls?.(); filingLifecycle.unload(); break;
    case 'dashboard': navigate('/dashboard'); break;
    case 'delete-ward': collapseWardControls?.(); confirmDeleteWard(); break;
    case 'export-help': openUserGuide(); break;
    case 'hide-auto-export-reminder': hideAutoExportReminder(); break;
    case 'lock': collapseSaveControls?.(); lockApp(); break;
    case 'new-form': collapseWardControls?.(); navigate('/inventory-select'); break;
    case 'next-walkthrough': nextWalkthroughStep(); break;
    case 'open-backup-sav': collapseSaveControls?.(); triggerOpenBackupSav?.(); break;
    case 'party-management': toggleHelpPanel(); navigate('/party-management'); break;
    case 'save-backup': collapseSaveControls?.(); saveBackupNow(); break;
    case 'skip-walkthrough': skipWalkthrough(); break;
    case 'start-walkthrough': startWalkthrough(); break;
    case 'switch-ward': handleSwitchWardClick(); break;
    // Milestone 48: on the dashboard (no filing open), "?" still opens the
    // Help panel -- guided tour, activity log, and shared records live only
    // there and aren't needed mid-filing. Inside a filing, "?" skips the
    // panel and jumps straight to the manual page for the current one.
    case 'toggle-help':
      if (getCaseFile()?.activeWardId) openUserGuideForCurrentPage?.();
      else toggleHelpPanel();
      break;
    case 'toggle-mobile-sidebar': toggleMobileSidebar(); break;
    case 'toggle-save-controls': toggleSaveControls(); break;
    case 'toggle-theme': toggleTheme(); break;
  }
}

function handleShellInput(event) {
  if (event.target instanceof HTMLInputElement && event.target.id === 'ward-selector') {
    onWardSelectorInput();
  }
}

function handleShellFocus(event) {
  if (event.target instanceof HTMLInputElement && event.target.id === 'ward-selector') {
    onWardSelectorFocus();
  }
}

function handleShellKeydown(event) {
  if (event.target instanceof HTMLInputElement && event.target.id === 'ward-selector') {
    onWardSelectorKeydown(event);
  }
}

function handleShellChange(event) {
  if (event.target instanceof HTMLSelectElement && event.target.id === 'auto-export-interval-select') {
    collapseSaveControls?.();
    saveAutoExportIntervalPref(Number.parseInt(event.target.value, 10));
  } else if (event.target instanceof HTMLInputElement && event.target.id === 'backup-import-input' && event.target.files?.[0]) {
    handleBackupImportChange?.(event.target);
  }
}

on('click', handleShellClick);
on('input', handleShellInput);
on('focusin', handleShellFocus);
on('keydown', handleShellKeydown);
on('change', handleShellChange);

/** Add this module's listeners; the signal removes them. Called once, by main.js. */
export function installShellEvents({ signal } = {}) {
  for (const [type, handler, options] of listeners) {
    const opts = typeof options === 'object' && options ? options : { capture: !!options };
    document.addEventListener(type, handler, { ...opts, signal });
  }
}

export async function clearAllData(){
  if(!(await confirmModal('Clear all data for current form? This cannot be undone.')))return;
  const ward=getActiveWard();
  if(!ward)return;
  const {wardId,wardName,inventoryType,createdDate}=ward;
  Object.assign(ward,initializeEmptyData(ward.inventoryType));
  Object.assign(ward,{wardId,wardName,inventoryType,createdDate});
  saveData();
  updateSidebar();
  navigate('/');
}
