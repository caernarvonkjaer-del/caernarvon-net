// Ward lifecycle management: creation, activation, exclusive locking, switching, and deletion.
// What a new filing carries over from an existing one -- the carry tables and
// builders -- is src/core/filing/carry-over.js's (Milestone 70's 70G moved them
// there); the lifecycle service the UI and tests call is
// src/core/navigation/filing-lifecycle.js. Leaving a filing for the dashboard
// is the router's (./leave-filing.js, since 70K), and opening one draws its
// page through the router rather than beside it.
import { getCaseFile, getD, setActiveFiling, setAppState } from '../state.js';
import { formEngine, initializeEmptyData } from '../filing/filing-registry.js';
import { commitFocusedField } from '../form/form-contract.js';
import { acquireWardLock, showWardLockedModal } from '../ward-lock.js';
import { addToRecentlyOpened } from '../filing/recent-filings.js';
import { updateSidebar } from '../shell/sidebar.js';
import { notifyProbateGuardianTabStateChanged } from './tab-state.js';
import { getLastExportAt, setDirtySinceExport } from '../persistence/export-state.js';
import {
  deleteWardFromState, flushPendingSave, refreshAutoSaveArmedStatus, saveWardToState,
  showAutoExportReminder, updateLastSavedIndicator,
} from '../persistence/case-file.js';
import { features } from '../runtime/features.js';
import { enterDashboardEditingFocus } from './leave-filing.js';
import { closeMobileSidebar, navigate, renderPage, setCurrentPage, setRouteHash } from './router.js';

export { enterDashboardEditingFocus } from './leave-filing.js';

export function createWardId() {
  return 'w_' + Date.now() + '_' + Math.random().toString(36).slice(2, 9);
}

export async function activateWard(ward, opts = {}) {
  if (!ward || !ward.wardId) return false;
  const caseFile = getCaseFile();

  // 1. If ward is already active and lock held, refresh UI and return true
  if (caseFile.activeWardId === ward.wardId && getD() === ward) {
    if (await acquireWardLock(ward.wardId)) {
      updateSidebar();
      await refreshAutoSaveArmedStatus();
      return true;
    }
  }

  // 2. Flush while outgoing ward's lock is still held -- after finalizing a
  // field still focused into it, so the edit is saved with it, once, and its
  // late blur cannot land in the filing opened next.
  commitFocusedField();
  await flushPendingSave();

  // 3. Acquire target ward lock
  const acquired = await acquireWardLock(ward.wardId);

  // 4. On contention: previous lock is still held untouched
  if (!acquired) {
    showWardLockedModal();
    return false;
  }

  // 5. On success, set loaded state
  setActiveFiling(ward);
  addToRecentlyOpened(ward);
  if (formEngine(ward.inventoryType) === 'guardian') {
    // The Initial Inventory's validator is its feature's: loaded before the
    // sidebar asks for completion.
    await features().load('guardian');
  }

  updateSidebar();
  await refreshAutoSaveArmedStatus();
  notifyProbateGuardianTabStateChanged();
  return true;
}

export async function unloadWard() {
  if (await enterDashboardEditingFocus()) await navigate('/dashboard');
}

export async function addWard(wardName, inventoryType) {
  const wardId = createWardId();
  const caseFile = getCaseFile();
  const isFirstWardEver = !caseFile.wards || caseFile.wards.length === 0;

  const emptyData = initializeEmptyData(inventoryType);

  const newWard = {
    wardId,
    inventoryType,
    createdDate: new Date().toISOString().split('T')[0],
    ...emptyData,
    wardName: wardName || '',
  };

  if (!Array.isArray(caseFile.wards)) caseFile.wards = [];
  caseFile.wards.push(newWard);

  await saveWardToState(newWard);

  await activateWard(newWard);

  setDirtySinceExport(true);
  updateLastSavedIndicator();
  if (isFirstWardEver) setAppState('firstLaunchSeen', false);
  await navigate('/');
  if (isFirstWardEver && !getLastExportAt()) showAutoExportReminder(true);
  return wardId;
}

export async function switchWard(wardId) {
  const caseFile = getCaseFile();
  const ward = (caseFile.wards || []).find((w) => w.wardId === wardId);
  if (!ward) return false;

  const ok = await activateWard(ward);
  if (!ok) return false;

  // Its Cover, drawn by the router like any other page (Milestone 70, 70K:
  // this mounted the feature itself, beside the router, and the hash it
  // cleared then drew the Cover a second time).
  setCurrentPage('/');
  setRouteHash('');
  await renderPage('/');
  closeMobileSidebar();
  return true;
}

export async function deleteWard(wardId) {
  const caseFile = getCaseFile();
  if (!Array.isArray(caseFile.wards)) return;
  const idx = caseFile.wards.findIndex((w) => w.wardId === wardId);
  if (idx === -1) return;

  if (caseFile.activeWardId === wardId) {
    await unloadWard();
  }

  caseFile.wards.splice(idx, 1);
  await deleteWardFromState(wardId);
  updateSidebar();
  notifyProbateGuardianTabStateChanged();
  navigate('/dashboard');
}
