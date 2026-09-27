// Milestone 70, 70F: the Plans' Add / Remove / Duplicate row and guardian
// actions. Moved from legacy-app.js.
import { normalizePlanGuardians, planEmptyRow, planGuardianBlank, planGuardianHasAnyData, planGuardianMax } from '../filing/models/plan-rows.js';
import { navigate } from '../navigation/router.js';
import { getD, requestSave } from '../state.js';
import { confirmModal } from '../ui/dialogs.js';

export function addPlanGuardian(route){
  const d=getD(); const rows=normalizePlanGuardians(d);
  if(rows.length>=planGuardianMax(d.inventoryType))return false;
  rows.push(planGuardianBlank(d.inventoryType)); d.planGuardians=rows; requestSave(); navigate(route); return true;
}

export async function removePlanGuardian(index,route){
  const d=getD(); const rows=normalizePlanGuardians(d);
  if(index<=0||index>=rows.length)return false;
  const row=rows[index];
  if(planGuardianHasAnyData(row)&&!(await confirmModal(`Remove co-guardian ${row.name||`#${index+1}`}? This will delete the entered signature information.`)))return false;
  rows.splice(index,1); d.planGuardians=rows;
  if(Array.isArray(d.guardianPartyIds))d.guardianPartyIds.splice(index,1);
  requestSave(); navigate(route); return true;
}

// Row add/remove/duplicate for the Plan's repeating tables. Generic over the
// array name so residences, providers and directives all share it.
export function addPlanRow(arrName,kind,route){
  getD()[arrName]=getD()[arrName]||[];
  getD()[arrName].push(planEmptyRow(kind));
  requestSave();navigate(route);
}

export function removePlanRow(arrName,idx,route){
  const list=getD()[arrName];
  if(!list||!list[idx])return;
  list.splice(idx,1);
  requestSave();navigate(route);
}

export function duplicatePlanRow(arrName,idx,route){
  const list=getD()[arrName];
  if(!list||!list[idx])return;
  list.splice(idx+1,0,JSON.parse(JSON.stringify(list[idx])));
  requestSave();navigate(route);
}
