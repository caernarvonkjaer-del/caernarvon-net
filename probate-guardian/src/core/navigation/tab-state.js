// Milestone 70, 70H: what this tab has open, for the other tabs and the
// installed app. Moved from legacy-app.js.
import { APP_VERSION } from '../feedback/feedback-config.js';
import { isDirtySinceExport } from '../persistence/export-state.js';
import { getActiveWard } from '../state.js';

export function getProbateGuardianTabState(){
  const activeWard=getActiveWard();
  return {
    hasActiveCase: !!activeWard,
    activeCase: activeWard?{
      wardId: activeWard.wardId||'',
      wardName: activeWard.wardName||'',
      caseNumber: activeWard.caseNumber||'',
      inventoryType: activeWard.inventoryType||''
    }:null,
    dirty: isDirtySinceExport(),
    appVersion: APP_VERSION
  };
}

export function notifyProbateGuardianTabStateChanged(){
  document.dispatchEvent(new CustomEvent('probate-guardian-state-change',{detail:getProbateGuardianTabState()}));
}
