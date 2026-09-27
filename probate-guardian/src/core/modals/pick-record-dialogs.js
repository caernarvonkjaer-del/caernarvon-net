// Milestone 70, 70G: the dialogs that link a filing's slot to a shared person
// or case record, or create one. Moved from legacy-app.js's WARD MANAGEMENT.
import { getOrCreateCaseForWard } from '../case-resolver.js';
import { esc } from '../filing/escape-html.js';
import { renderPage } from '../navigation/router.js';
import { createParty, dehydrateIntoParty, hydrateFromParty, readRoleFields, resolveParty, setPartyIdForSlot } from '../party-resolver.js';
import { monolith } from '../runtime/monolith.js';
import { getCaseFile, getD, requestSave } from '../state.js';
import { updateNavDots } from '../status/nav-marks.js';
import { closeModal, ensureFragment, showModal } from '../ui/dialogs.js';
import { saveWardToState } from '../persistence/case-file.js';

// Tracks which identity slot ({role,index}) the Pick Party modal is
// currently open for, set by showPickPartyModal() and read by doPickParty()/
// doCreatePartyFromSlot() when the user confirms.
export let _pickPartySlot=null;

export function partyRoleLabel(role){
  return role==='guardian'?'guardian':role==='attorney'?'attorney':role==='preparer'?'preparer':'ward';
}

// Opens the Pick Party modal for one identity slot on the active filing
// (persistence rewrite Milestone 4). `role`/`index` identify the slot the
// same way syncIdentityField() does -- see src/core/party-resolver.js.
export async function showPickPartyModal(role,index){
  await ensureFragment('common-modals');
  _pickPartySlot={role,index:Number(index)||0};
  const currentName=(readRoleFields(getD(),role,_pickPartySlot.index)||{}).name;
  document.getElementById('pick-party-slot-label').textContent=currentName?`"${esc(currentName)}"`:`this ${partyRoleLabel(role)}`;
  const sel=document.getElementById('pick-party-existing');
  const matches=(getCaseFile().parties||[]).filter(p=>!p.mergedInto&&p.roles.includes(role));
  sel.innerHTML='<option value="">— Select —</option>'
    +matches.map(p=>`<option value="${p.id}">${esc(p.name||'(unnamed)')}</option>`).join('');
  showModal('pickPartyModal');
}

// "Link" — attaches the chosen existing party to the open slot, then
// hydrates that party's current data into the slot, overwriting whatever
// was there (matching today's carry-over overwrite behavior).
export async function doPickParty(){
  const partyId=document.getElementById('pick-party-existing').value;
  if(!partyId||!_pickPartySlot)return;
  const party=resolveParty(partyId);
  if(!party)return;
  const {role,index}=_pickPartySlot;
  closeModal('pickPartyModal');
  setPartyIdForSlot(getD(),role,index,partyId);
  hydrateFromParty(party,getD(),role,index);
  requestSave();
  renderPage(monolith.getCurrentPage());
  updateNavDots();
}

// "+ New Shared Record" — creates a brand-new party seeded from whatever is
// already typed into the slot (dehydrate), then attaches it. Nothing
// already entered is lost.
export async function doCreatePartyFromSlot(){
  if(!_pickPartySlot)return;
  const {role,index}=_pickPartySlot;
  closeModal('pickPartyModal');
  const party=createParty(role);
  setPartyIdForSlot(getD(),role,index,party.id);
  // A brand-new party has no other slot to fan out to, and a closed filing's
  // syncIdentityField() is a no-op -- seed the record directly either way.
  dehydrateIntoParty(getD(),role,index,party);
  requestSave();
  renderPage(monolith.getCurrentPage());
  updateNavDots();
}

// Tracks which ward the Pick Case modal is currently open for, set by
// showPickCaseModal() and read by doPickCase()/doCreateCaseFromWard() when
// the user confirms. Mirrors _pickPartySlot.
export let _pickCaseWardId=null;

// Opens the Pick Case modal for one filing (persistence rewrite Milestone
// 6). Lists every existing Case by number/county plus which ward(s) already
// reference it, so the user can tell them apart.
export async function showPickCaseModal(wardId){
  await ensureFragment('common-modals');
  const ward=getCaseFile().wards.find(w=>w.wardId===wardId);
  if(!ward)return;
  _pickCaseWardId=wardId;
  document.getElementById('pick-case-ward-name').textContent=ward.wardName?`"${esc(ward.wardName)}"`:'this filing';
  const sel=document.getElementById('pick-case-existing');
  const cases=getCaseFile().cases||[];
  sel.innerHTML='<option value="">— Select —</option>'
    +cases.map(c=>{
      const refs=getCaseFile().wards.filter(w=>w.caseId===c.id).map(w=>w.wardName||'(unnamed)');
      const label=[c.caseNumber||'(no case number)',c.county,refs.length?`— ${refs.join(', ')}`:''].filter(Boolean).join(' ');
      return `<option value="${c.id}">${esc(label)}</option>`;
    }).join('');
  showModal('pickCaseModal');
}

// "Link" — attaches the chosen existing Case to this filing.
export async function doPickCase(){
  const caseId=document.getElementById('pick-case-existing').value;
  if(!caseId||!_pickCaseWardId)return;
  const ward=getCaseFile().wards.find(w=>w.wardId===_pickCaseWardId);
  if(!ward)return;
  closeModal('pickCaseModal');
  ward.caseId=caseId;
  await saveWardToState(ward);
  renderPage(monolith.getCurrentPage());
}

// "+ New Case" — creates a brand-new Case seeded from this filing's own
// case number/county, then attaches it.
export async function doCreateCaseFromWard(){
  if(!_pickCaseWardId)return;
  const ward=getCaseFile().wards.find(w=>w.wardId===_pickCaseWardId);
  if(!ward)return;
  closeModal('pickCaseModal');
  const kase=getOrCreateCaseForWard(ward);
  ward.caseId=kase.id;
  await saveWardToState(ward);
  renderPage(monolith.getCurrentPage());
}
