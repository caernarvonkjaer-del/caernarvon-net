// Milestone 70, 70C: the rows the four Plans share -- the guardian signature
// block (its blank shape and how many a Plan allows), keeping a Plan's
// guardian list well formed, and the blank row for each repeating Plan table.
// Moved from legacy-app.js.
import { getD } from '../../state.js';
import { emptyPlanResidence, emptyPlanProvider, emptyPlanDirective } from './plan-annual.js';
import { emptyInitialProvider } from './plan-initial.js';
import { emptyMinorResidence, emptyMinorProvider, emptyMinorGuardianSig } from './plan-minor.js';

export function planGuardianBlank(type){
  // Milestone 39-C: every Plan type's guardian row now carries signatureState/
  // signatureImage (39-B piloted planSimplified's only).
  if(type==='planInitial')return {name:'',ssn:'',street:'',phone:'',cityStateZip:'',signatureDate:'',relationship:'',signatureState:'',signatureImage:''};
  if(type==='planAnnual')return {name:'',ssn:'',phone:'',email:'',signatureDate:'',mailingStreet:'',mailingCityStateZip:'',officeStreet:'',officeCityStateZip:'',relationship:'',signatureState:'',signatureImage:''};
  if(type==='planMinor')return emptyMinorGuardianSig();
  return {name:'',signatureDate:'',email:'',phone:'',mailingAddress:'',signatureState:'',signatureImage:''};
}

export function planGuardianHasAnyData(g){return !!(g&&Object.values(g).some(v=>v!==''&&v!==null&&v!==undefined&&v!==false));}

export function planGuardianMax(type){return type==='planInitial'?4:type==='planAnnual'?3:2;}

export function normalizePlanGuardians(data=getD()){
  const rows=Array.isArray(data?.planGuardians)?data.planGuardians:[];
  const primary=rows[0]||planGuardianBlank(data?.inventoryType);
  const kept=[primary,...rows.slice(1).filter(planGuardianHasAnyData)].slice(0,planGuardianMax(data?.inventoryType));
  if(data) data.planGuardians=kept;
  return kept;
}

// The blank row for each of the Plans' repeating tables, by kind. (The
// add/remove actions that push these stay with the form runtime.)
export function planEmptyRow(kind){
  if(kind==='residence')return emptyPlanResidence();
  if(kind==='provider')return emptyPlanProvider();
  if(kind==='directive')return emptyPlanDirective();
  if(kind==='initialProvider')return emptyInitialProvider();
  if(kind==='minorResidence')return emptyMinorResidence();
  if(kind==='minorProvider')return emptyMinorProvider();
  // Milestone 68C: the Plans' Certificate of Service recipient card.
  if(kind==='certRecipient')return {name:'',line2:'',line3:'',line4:''};
  return {};
}
