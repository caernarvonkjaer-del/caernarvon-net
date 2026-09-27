// Milestone 70, 70K: leaving the open filing for the dashboard -- the router's
// commit-before-leave. The field still being typed in is committed, blank
// cards pruned, the save flushed and the filing's cross-tab lock released,
// and only then is the filing closed. If the save fails the filing stays open
// and locked, the filer is told, and the page does not move.
//
// Moved from ward-lifecycle.js, which the router now calls into (opening a
// filing mounts its page through the router), so the router could not import
// it back; and it reached the save, the lock and the sidebar through window.
import { getCaseFile, setActiveFiling } from '../state.js';
import { commitFocusedField, commitPendingFieldValues } from '../form/form-contract.js';
import { pruneBlankCards } from '../form/prune-cards.js';
import { flushPendingSave, refreshAutoSaveArmedStatus, showSaveError } from '../persistence/case-file.js';
import { releaseWardLock } from '../ward-lock.js';
import { updateSidebar } from '../shell/sidebar.js';
import { notifyProbateGuardianTabStateChanged } from './tab-state.js';

let dashboardEntryPromise = null;

/**
 * Safely ends editor focus before the dashboard is rendered: true once no
 * filing is open, false if the save failed and the filing stays open. A second
 * call while one is under way joins it.
 */
export async function enterDashboardEditingFocus() {
  if (dashboardEntryPromise) return dashboardEntryPromise;
  dashboardEntryPromise = (async () => {
    if (!getCaseFile().activeWardId) return true;
    try {
      // A field still focused is finalized into this filing before it closes
      // (its late blur would find the filing gone).
      commitFocusedField();
      commitPendingFieldValues();
      pruneBlankCards();
      await flushPendingSave();
      await releaseWardLock();
    } catch (error) {
      console.error('Unable to safely leave editor for dashboard:', error);
      showSaveError();
      return false;
    }
    setActiveFiling(null);
    updateSidebar();
    await refreshAutoSaveArmedStatus();
    notifyProbateGuardianTabStateChanged();
    return true;
  })();
  try { return await dashboardEntryPromise; }
  finally { dashboardEntryPromise = null; }
}
