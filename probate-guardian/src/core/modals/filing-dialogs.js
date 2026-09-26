// Milestone 70, 70G: the Add Form, Simplified Accounting eligibility and
// Delete Form dialogs -- creating a filing (with what it carries over and the
// case it joins), the eligibility questions that decide between Simplified and
// Annual, and deleting one. Moved from legacy-app.js's MODAL FUNCTIONS; the
// modal plumbing they open through (showModal(), closeModal(), the ward-name
// combobox) stays there until 70H.
import { getOrCreateCaseForWard } from '../case-resolver.js';
import { refreshCarrySourceSelect, updateCarrySourcePicker } from '../filing/carry-over.js';
import { deleteFilingConfirmation } from '../filing/delete-confirmation.js';
import { formDisplayName } from '../filing/filing-registry.js';
import { navigate, renderPage } from '../navigation/router.js';
import { normalizeCountyName } from '../navigation/ward-county.js';
import { filingLifecycle } from '../navigation/filing-lifecycle.js';
import { monolith } from '../runtime/monolith.js';
import { getActiveWard, getCaseFile, getD } from '../state.js';
import { alertModal, confirmModal } from '../ui/dialogs.js';

export async function showAddWardModal(){
  await monolith.ensureFragment('common-modals');
  document.getElementById('new-ward-name').value='';
  monolith.populateWardNameSuggestions('ward-name-suggestions');
  monolith.initWardNameCombobox('new-ward-name','new-ward-name-dropdown',()=>updateCarrySourcePicker());
  document.getElementById('new-ward-type').value='guardian';
  updateCarrySourcePicker();
  monolith.showModal('addWardModal');
}

export async function doAddWard(){
  const name=document.getElementById('new-ward-name').value.trim();
  const type=document.getElementById('new-ward-type').value;
  const carrySourceId=document.getElementById('carry-source-ward').value;
  console.log('doAddWard - name:',name,'type:',type,'carrySourceId:',carrySourceId);
  if(!name){await alertModal('Please enter a ward name');return;}
  if(type==='planMinor'){
    const candidateSource=carrySourceId?getCaseFile().wards.find(w=>w.wardId===carrySourceId):null;
    const sameNameWard=getCaseFile().wards.find(w=>
      (w.wardName||'').trim().toLowerCase()===name.toLowerCase()&&(w.inventoryType!=='planMinor'||w.gid||w.inceptionDate)
    );
    const adultIndicator=candidateSource||sameNameWard;
    if(adultIndicator&&(adultIndicator.inventoryType!=='planMinor'||adultIndicator.gid||adultIndicator.inceptionDate)){
      const proceed=await confirmModal(`Annual Plan (Minors) is typically used for minor wards, but existing records for "${name}" indicate an adult filing or adult guardianship inception date. Do you want to continue creating this minor plan?`);
      if(!proceed)return;
    }
  }
  if(type==='simplified'){
    monolith.closeModal('addWardModal');
    showSimplifiedEligibilityModal(name,carrySourceId);
    return;
  }
  try{
    const wardId=await filingLifecycle.create(name,type);
    if(carrySourceId){
      const src=getCaseFile().wards.find(w=>w.wardId===carrySourceId);
      const ward=getCaseFile().wards.find(w=>w.wardId===wardId);
      if(src&&ward){
        Object.assign(ward,filingLifecycle.carry(src,type));
        if(ward.wardName!==name)ward.wardName=name;
        // Picking a carry-source is an explicit "this belongs with that one"
        // gesture -- join the new filing to the source's Case (creating one
        // for the source first if it doesn't have one yet), not just
        // copying case-number text that could later drift apart. See
        // src/core/case-resolver.js.
        const kase=getOrCreateCaseForWard(src);
        ward.caseId=kase.id;
        await monolith.saveWardToState(ward);
        renderPage('/');
        monolith.updateSidebar();
      }
    }
    monolith.closeModal('addWardModal');
  }catch(e){
    console.error('Failed to add ward',e);
    await alertModal('Failed to add form. Check console.');
  }
}

// carrySourceId lets doAddWard() hand off a carry-source selection already
// made in the main Add Ward modal; the picker inside this modal covers the
// other entry point, where the "Simplified Accounting" card skips that
// modal entirely and lands here directly.
export function refreshEligCarrySource(){
  const name=document.getElementById('elig-ward-name').value;
  refreshCarrySourceSelect(document.getElementById('elig-carry-source-ward'),document.getElementById('elig-carry-source-wrap'),'simplified',name,document.getElementById('elig-carry-source-autonote'));
}

export async function showSimplifiedEligibilityModal(name,carrySourceId){
  await monolith.ensureFragment('common-modals');
  document.getElementById('elig-ward-name').value=name||'';
  monolith.populateWardNameSuggestions('elig-ward-name-suggestions');
  monolith.initWardNameCombobox('elig-ward-name','elig-ward-name-dropdown',()=>refreshEligCarrySource());
  document.getElementById('elig-depository').value='';
  document.getElementById('elig-only-transactions').value='';
  // Same source list the Add Ward picker uses — the matching Plan plus any
  // earlier accounting for this ward (Initial Inventory, a prior Annual,
  // etc). Previously hardcoded to planSimplified only, which meant an
  // Initial Inventory could never populate a Simplified Accounting.
  refreshEligCarrySource();
  // Explicit hand-off from the main Add Ward modal (the "Simplified
  // Accounting" card skips that modal and lands here directly) wins over
  // whatever refreshEligCarrySource() auto-selected from the name alone.
  if(carrySourceId)document.getElementById('elig-carry-source-ward').value=carrySourceId;
  monolith.showModal('simplifiedEligibilityModal');
  document.getElementById('elig-ward-name').focus();
}

// Milestone 40C-F item 4 / 40C-G2: describes what carryover actually did,
// naming the real selected source type instead of the hardcoded "existing
// Simplified Annual Plan" this modal used to claim regardless of what the user
// picked -- an Initial Inventory or a prior Annual are both valid sources here.
//
// It also states plainly whether County came back from the ward record or still
// has to be chosen, because under Milestone 40C-A a new filing legitimately
// starts blank and a filer who isn't told that will assume it carried over.
export function carryOverSummaryNote(src,dest){
  if(!src)return '';
  const srcLabel=formDisplayName(src.inventoryType);
  const county=normalizeCountyName(dest&&dest.county);
  const countySentence=county
    ? `County (${county}) was restored from this ward's record.`
    : 'County still needs to be selected on this filing’s Cover — this ward has no county on record yet.';
  return `Details were carried over from the selected ${srcLabel}. ${countySentence}`;
}

export async function doConfirmSimplifiedEligibility(){
  const name=document.getElementById('elig-ward-name').value.trim();
  const dep=document.getElementById('elig-depository').value;
  const txn=document.getElementById('elig-only-transactions').value;
  const carrySourceId=document.getElementById('elig-carry-source-ward').value;
  if(!name){await alertModal('Please enter a ward name');return;}
  if(!dep||!txn){await alertModal('Please answer both eligibility questions');return;}
  const qualifies=dep==='Yes'&&txn==='Yes';
  try{
    if(qualifies){
      const wardId=await filingLifecycle.create(name,'simplified');
      getD().eligDepository='Yes';
      getD().eligOnlyTransactions='Yes';
      let carryNote='';
      if(carrySourceId){
        const src=getCaseFile().wards.find(w=>w.wardId===carrySourceId);
        if(src){
          Object.assign(getD(),filingLifecycle.carry(src,'simplified'));
          if(getD().wardName!==name)getD().wardName=name;
          getD().caseId=getOrCreateCaseForWard(src).id;
          carryNote=carryOverSummaryNote(src,getD());
        }else{
          // Milestone 40C-F item 1: the selected source could not be resolved,
          // so say so rather than reporting a carryover that did not happen.
          await alertModal('The selected source filing could not be found, so nothing was carried over. The new filing was created blank.');
        }
      }
      await monolith.saveWardToState(getD());
      // Milestone 50B: addWard() already rendered the Cover from a blank
      // filing before the Object.assign() above mutated window.D -- nothing
      // repaints on its own, so without this the filer sees blank fields
      // while carryNote (below) claims details were carried over. Mirrors
      // doAddWard()'s own render tail after its carry-over Object.assign().
      renderPage('/');
      monolith.updateSidebar();
      if(carryNote)await alertModal(carryNote);
    }else{
      await filingLifecycle.create(name,'annual');
      // Carry over to the Annual too — the guardian picked a source ward
      // before answering the eligibility questions, and that choice still
      // applies to the form they actually end up with.
      let carryNote='';
      if(carrySourceId){
        const src=getCaseFile().wards.find(w=>w.wardId===carrySourceId);
        if(src){
          Object.assign(getD(),filingLifecycle.carry(src,'annual'));
          if(getD().wardName!==name)getD().wardName=name;
          getD().caseId=getOrCreateCaseForWard(src).id;
          await monolith.saveWardToState(getD());
          carryNote=carryOverSummaryNote(src,getD());
        }
      }
      // Milestone 50B: same re-render this branch's own carry-over mutation
      // needs -- see the comment on the qualifying branch above.
      renderPage('/');
      monolith.updateSidebar();
      // Milestone 40C-F item 4: one message, and it names what actually
      // happened to the carryover and the county rather than leaving the filer
      // to guess after the redirect.
      await alertModal('This guardianship does not qualify for the simplified form under § 744.3679, so a standard Annual Accounting was created instead.'
        +(carryNote?`\n\n${carryNote}`:''));
    }
    monolith.closeModal('simplifiedEligibilityModal');
  }catch(e){
    console.error('Failed to add ward',e);
    await alertModal('Failed to add form. Check console.');
  }
}

export let _pendingDeleteWardId=null;

// wardId is optional so the existing sidebar "Delete" button (which only
// ever acts on the currently active ward) keeps working unchanged, while
// the dashboard card's own Delete button can target any ward regardless
// of which one is currently active.
export async function confirmDeleteWard(wardId){
  const ward=wardId?getCaseFile().wards.find(w=>w.wardId===wardId):getActiveWard();
  if(!ward)return;
  await monolith.ensureFragment('common-modals');
  _pendingDeleteWardId=ward.wardId;
  // Milestone 58E: the message names the FILING, not just the ward. A ward
  // commonly has several open at once, and every Delete button used to raise
  // the same sentence. The fallback keeps the old wording if the bridge is
  // somehow missing -- a vaguer prompt is survivable, a missing one is not,
  // and this must never change WHICH filing _pendingDeleteWardId points at.
  const msg=deleteFilingConfirmation(ward);
  document.getElementById('delete-ward-msg').textContent=msg;
  monolith.showModal('deleteWardModal');
}

export async function doDeleteWard(){
  const wardId=_pendingDeleteWardId||getCaseFile().activeWardId;
  const wasOnDashboard=monolith.getCurrentPage()==='/dashboard';
  try{
    await filingLifecycle.remove(wardId);
    monolith.closeModal('deleteWardModal');
    if(wasOnDashboard)navigate('/dashboard');
  }catch(e){
    console.error('Failed to delete ward',e);
    await alertModal('Failed to delete form. Check console.');
  }
}
