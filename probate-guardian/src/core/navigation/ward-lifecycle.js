// Ward lifecycle management: creation, activation, exclusive locking, switching, and deletion.
// What a new filing carries over from an existing one -- the carry tables and
// builders -- is src/core/filing/carry-over.js's (Milestone 70's 70G moved them
// there); the lifecycle service the UI and tests call is
// src/core/navigation/filing-lifecycle.js.
import { getCaseFile, getD, setActiveFiling, setAppState } from '../state.js';
import { FILING_ENGINE_IDS, mountFeatureFnName } from '../filing/filing-descriptor.js';
import { formEngine, initializeEmptyData } from '../filing/filing-registry.js';
import { pruneBlankCards } from '../form/prune-cards.js';
import { linkLabelsToInputs } from '../form/form-runtime.js';
import { commitFocusedField } from '../form/form-contract.js';
import { updateNavDots } from '../status/nav-marks.js';
import { addToRecentlyOpened } from '../filing/recent-filings.js';

export function createWardId() {
  return 'w_' + Date.now() + '_' + Math.random().toString(36).slice(2, 9);
}

let dashboardEntryPromise = null;

/** Safely ends editor focus before the dashboard is rendered. */
export async function enterDashboardEditingFocus() {
  if (dashboardEntryPromise) return dashboardEntryPromise;
  dashboardEntryPromise = (async () => {
    const caseFile = getCaseFile();
    if (!caseFile.activeWardId) return true;
    try {
      // A field still focused is finalized into this filing before it closes
      // (its late blur would find the filing gone).
      commitFocusedField();
      window.commitPendingFieldValues?.();
      pruneBlankCards();
      if (typeof window.flushPendingSave === 'function') await window.flushPendingSave({ requireRecovery: true });
      if (typeof window.releaseWardLock === 'function') await window.releaseWardLock();
    } catch (error) {
      console.error('Unable to safely leave editor for dashboard:', error);
      window.showSaveError?.(error);
      return false;
    }
    setActiveFiling(null);
    window.updateSidebar?.();
    await window.refreshAutoSaveArmedStatus?.();
    window.notifyProbateGuardianTabStateChanged?.();
    return true;
  })();
  try { return await dashboardEntryPromise; }
  finally { dashboardEntryPromise = null; }
}

export async function activateWard(ward, opts = {}) {
  if (!ward || !ward.wardId) return false;
  const caseFile = getCaseFile();

  // 1. If ward is already active and lock held, refresh UI and return true
  if (caseFile.activeWardId === ward.wardId && getD() === ward) {
    if (typeof window !== 'undefined' && window.acquireWardLock) {
      const alreadyHeld = await window.acquireWardLock(ward.wardId);
      if (alreadyHeld) {
        if (typeof window.updateSidebar === 'function') window.updateSidebar();
        if (typeof window.refreshAutoSaveArmedStatus === 'function') await window.refreshAutoSaveArmedStatus();
        return true;
      }
    } else {
      if (typeof window !== 'undefined' && typeof window.updateSidebar === 'function') window.updateSidebar();
      if (typeof window !== 'undefined' && typeof window.refreshAutoSaveArmedStatus === 'function') await window.refreshAutoSaveArmedStatus();
      return true;
    }
  }

  // 2. Flush while outgoing ward's lock is still held -- after finalizing a
  // field still focused into it, so the edit is saved with it, once, and its
  // late blur cannot land in the filing opened next.
  commitFocusedField();
  if (typeof window !== 'undefined' && typeof window.flushPendingSave === 'function') {
    await window.flushPendingSave();
  }

  // 3. Acquire target ward lock
  let acquired = true;
  if (typeof window !== 'undefined' && window.acquireWardLock) {
    acquired = await window.acquireWardLock(ward.wardId);
  }

  // 4. On contention: previous lock is still held untouched
  if (!acquired) {
    if (typeof window !== 'undefined' && typeof window.showWardLockedModal === 'function') {
      window.showWardLockedModal();
    }
    return false;
  }

  // 5. On success, set loaded state
  setActiveFiling(ward);
  if (typeof window !== 'undefined') {
    addToRecentlyOpened(ward);
    if (formEngine(ward.inventoryType) === 'guardian') {
      if (typeof window.ensureGuardianFeatureReady === 'function') {
        await window.ensureGuardianFeatureReady();
      }
    }
  }

  if (typeof window !== 'undefined') {
    if (typeof window.updateSidebar === 'function') window.updateSidebar();
    if (typeof window.refreshAutoSaveArmedStatus === 'function') await window.refreshAutoSaveArmedStatus();
    if (typeof window.notifyProbateGuardianTabStateChanged === 'function') window.notifyProbateGuardianTabStateChanged();
  }
  return true;
}

export async function unloadWard() {
  if (await enterDashboardEditingFocus() && typeof window !== 'undefined' && typeof window.navigate === 'function') window.navigate('/dashboard');
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

  if (typeof window !== 'undefined' && typeof window.saveWardToState === 'function') {
    await window.saveWardToState(newWard);
  }

  await activateWard(newWard);

  if (typeof window !== 'undefined') {
    window._dirtySinceExport = true;
    if (typeof window.updateLastSavedIndicator === 'function') window.updateLastSavedIndicator();
    if (isFirstWardEver) setAppState('firstLaunchSeen', false);
    if (typeof window.navigate === 'function') {
      await window.navigate('/');
    }
    if (isFirstWardEver && !window._lastExportAt && typeof window.showAutoExportReminder === 'function') {
      window.showAutoExportReminder(true);
    }
  }
  return wardId;
}

export async function switchWard(wardId) {
  const caseFile = getCaseFile();
  const ward = (caseFile.wards || []).find((w) => w.wardId === wardId);
  if (!ward) return false;

  const ok = await activateWard(ward);
  if (!ok) return false;

  if (typeof window !== 'undefined') {
    window.currentPage = '/';
    window.location.hash = '';
    const engine = formEngine(ward.inventoryType);
    if (FILING_ENGINE_IDS.includes(engine)) {
      const mount = window[mountFeatureFnName(engine)];
      if (typeof mount === 'function') await mount('/');
    }
    linkLabelsToInputs();
    updateNavDots();
    if (typeof window.updateHelpContext === 'function') window.updateHelpContext();
    if (typeof window.closeMobileSidebar === 'function') window.closeMobileSidebar();
  }
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
  if (typeof window !== 'undefined') {
    if (typeof window.deleteWardFromState === 'function') {
      await window.deleteWardFromState(wardId);
    }
    if (typeof window.updateSidebar === 'function') window.updateSidebar();
    if (typeof window.notifyProbateGuardianTabStateChanged === 'function') window.notifyProbateGuardianTabStateChanged();
    if (typeof window.navigate === 'function') window.navigate('/dashboard');
  }
}

// Global bridge for legacy scripts and test harnesses
if (typeof window !== 'undefined') {
  window.activateWard = activateWard;
  window.enterDashboardEditingFocus = enterDashboardEditingFocus;
  window.unloadWard = unloadWard;
  window.switchWard = switchWard;
}
