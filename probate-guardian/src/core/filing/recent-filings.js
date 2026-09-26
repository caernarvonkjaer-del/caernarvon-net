// Milestone 70, 70G: the dashboard's recently opened filings. Moved from
// legacy-app.js's WARD MANAGEMENT.
import { saveAppState } from '../persistence/launch-preferences.js';
import { appStateObject, getCaseFile } from '../state.js';

// Most-recently-used ward list stored in the .sav file's appState section.
export const RECENT_WARDS_MAX=5;

export function loadRecentlyOpenedWards(){
  const list=appStateObject().recentWards;
  return Array.isArray(list)?list:[];
}

export function saveRecentlyOpenedWards(list){
  appStateObject().recentWards=list;
  saveAppState('recentWards',list);
}

export function addToRecentlyOpened(ward){
  if(!ward)return;
  const list=loadRecentlyOpenedWards().filter(r=>r.wardId!==ward.wardId);
  list.unshift({wardId:ward.wardId,wardName:ward.wardName,inventoryType:ward.inventoryType,timestamp:Date.now()});
  saveRecentlyOpenedWards(list.slice(0,RECENT_WARDS_MAX));
}

// Re-derives name/type from the live ward record (in case it was renamed
// or converted since being logged) and drops entries for wards that no
// longer exist, rather than trusting the stale snapshot in appState.
export function getRecentlyOpenedWards(){
  return loadRecentlyOpenedWards()
    .map(r=>{
      const ward=getCaseFile().wards.find(w=>w.wardId===r.wardId);
      return ward?{wardId:ward.wardId,wardName:ward.wardName,inventoryType:ward.inventoryType,timestamp:r.timestamp,archived:!!ward.archived}:null;
    })
    .filter(Boolean);
}
