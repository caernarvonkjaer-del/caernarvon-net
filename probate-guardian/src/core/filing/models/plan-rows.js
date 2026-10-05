// Milestone 70, 70C: the rows the four Plans share -- the guardian signature
// block (its blank shape and how many a Plan allows), keeping a Plan's
// guardian list well formed, and the blank row for each repeating Plan table.
// Moved from legacy-app.js.
import { getD } from '../../state.js';
import { remapLinkedIds } from '../../form/row-links.js';
import { emptyPlanResidence, emptyPlanProvider, emptyPlanDirective } from './plan-annual.js';
import { emptyInitialProvider } from './plan-initial.js';
import { emptyMinorResidence, emptyMinorProvider, emptyMinorGuardianSig } from './plan-minor.js';

export function planGuardianBlank(type){
  // Milestone 39-C: every Plan type's guardian row now carries signatureState/
  // signatureImage (39-B piloted planSimplified's only).
  // Milestone 72C: the Initial Plan's guardian gains an email, as the other three Plans' have.
  if(type==='planInitial')return {name:'',ssn:'',street:'',phone:'',email:'',cityStateZip:'',signatureDate:'',relationship:'',signatureState:'',signatureImage:''};
  if(type==='planAnnual')return {name:'',ssn:'',phone:'',email:'',signatureDate:'',mailingStreet:'',mailingCityStateZip:'',officeStreet:'',officeCityStateZip:'',relationship:'',signatureState:'',signatureImage:''};
  if(type==='planMinor')return emptyMinorGuardianSig();
  return {name:'',signatureDate:'',email:'',phone:'',mailingAddress:'',signatureState:'',signatureImage:''};
}

export function planGuardianHasAnyData(g){return !!(g&&Object.values(g).some(v=>v!==''&&v!==null&&v!==undefined&&v!==false));}

export function planGuardianMax(type){return type==='planInitial'?4:type==='planAnnual'?3:2;}

// Milestone 73C: the first guardian's block always, and every co-guardian
// block -- an empty one included -- up to the Plan's limit. This used to drop
// each empty co-guardian block on every draw of the Signatures page, so
// "+ Add Co-Guardian" added one and the redraw it asked for took it away again.
// An untouched block now goes when the filer leaves the page (the clean-up,
// prune-cards.js, which keeps the first block). Over the limit -- only older
// data can be -- empty co-guardian blocks go first, from the end.
export function normalizePlanGuardians(data=getD()){
  const rows=Array.isArray(data?.planGuardians)?data.planGuardians:[];
  const primary=rows[0]||planGuardianBlank(data?.inventoryType);
  const max=planGuardianMax(data?.inventoryType);
  // Milestone 73V: which of the rows as they were survive, so their
  // shared-record links (D.guardianPartyIds) move with them. Dropping a blank
  // co-guardian between two others used to leave the next guardian linked to
  // the dropped one's record.
  // A co-guardian slot that isn't a row at all (damaged data) still goes.
  const keepIndexes=rows.length?rows.map((_,i)=>i).filter(i=>i===0||(rows[i]&&typeof rows[i]==='object')):[0];
  for(let at=keepIndexes.length-1;keepIndexes.length>max&&at>0;at--){
    if(!planGuardianHasAnyData(rows[keepIndexes[at]]))keepIndexes.splice(at,1);
  }
  keepIndexes.length=Math.min(keepIndexes.length,max);
  const kept=keepIndexes.map(i=>i===0?primary:rows[i]);
  if(data){
    if(rows.length&&keepIndexes.length!==rows.length)remapLinkedIds(data,'planGuardians',keepIndexes);
    data.planGuardians=kept;
  }
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
