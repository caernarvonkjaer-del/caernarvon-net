// Milestone 70, 70F: the Plans' Add / Remove / Duplicate row and guardian
// actions. Moved from legacy-app.js.
//
// Milestone 73V: the rows themselves change through the shared row actions
// (collections.js), which find each Plan's own rules by its type and move the
// guardians' shared-record links with them. What each action checks, asks,
// saves and redraws is unchanged.
import { normalizePlanGuardians, planGuardianHasAnyData } from '../filing/models/plan-rows.js';
import { navigate } from '../navigation/router.js';
import { getD } from '../state.js';
import { confirmModal } from '../ui/dialogs.js';
import { appendRow, duplicateRowAt, removeRowAt } from './collections.js';
import { commitModelChange } from '../model-change.js';

export function addPlanGuardian(route){
  const d=getD(); normalizePlanGuardians(d);
  if(!appendRow(d,'planGuardians'))return false;
  commitModelChange('collection-add', ['planGuardians']); navigate(route); return true;
}

export async function removePlanGuardian(index,route){
  const d=getD(); const rows=normalizePlanGuardians(d);
  if(index<=0||index>=rows.length)return false;
  const row=rows[index];
  if(planGuardianHasAnyData(row)&&!(await confirmModal(`Remove co-guardian ${row.name||`#${index+1}`}? This will delete the entered signature information.`)))return false;
  removeRowAt(d,'planGuardians',index);
  commitModelChange('collection-remove', ['planGuardians']); navigate(route); return true;
}

// Row add/remove/duplicate for the Plan's repeating tables. Generic over the
// array name so residences, providers and directives all share it. The row an
// array gets is the one its Plan's rules name -- the same `planEmptyRow(kind)`
// the button's data-row-type asks for (tests/unit/collection-descriptors.spec.js
// checks every button against it); `kind` stays in the signature for the
// buttons that pass it.
export function addPlanRow(arrName,kind,route){
  appendRow(getD(),arrName);
  commitModelChange('collection-add', [arrName]);navigate(route);
}

export function removePlanRow(arrName,idx,route){
  const list=getD()[arrName];
  if(!list||!list[idx])return;
  removeRowAt(getD(),arrName,idx);
  commitModelChange('collection-remove', [arrName]);navigate(route);
}

export function duplicatePlanRow(arrName,idx,route){
  const list=getD()[arrName];
  if(!list||!list[idx])return;
  duplicateRowAt(getD(),arrName,idx);
  commitModelChange('collection-duplicate', [arrName]);navigate(route);
}
