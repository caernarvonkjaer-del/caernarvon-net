// Milestone 70, 70G: the dialogs that link a filing's slot to a shared person
// or case record, or create one. Moved from legacy-app.js's WARD MANAGEMENT.
import { getOrCreateCaseForWard } from '../case-resolver.js';
import { esc } from '../filing/escape-html.js';
import { renderPage } from '../navigation/router.js';
import { onChange } from '../navigation/draw-reason.js';
import { createParty, dehydrateIntoParty, LINK_FIELD_LABELS, linkConflicts, linkSlotToParty, readRoleFields, resolveParty, setPartyIdForSlot } from '../party-resolver.js';
import { getCurrentPage } from '../navigation/route-state.js';
import { getCaseFile, getD } from '../state.js';
import { updateNavDots } from '../status/nav-marks.js';
import { closeModal, confirmModal, ensureFragment, showModal } from '../ui/dialogs.js';
import { saveWardToState } from '../persistence/case-file.js';
import { commitModelChange } from '../model-change.js';

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
  document.getElementById('pick-party-slot-label').textContent=currentName?`"${currentName}"`:`this ${partyRoleLabel(role)}`;
  const sel=document.getElementById('pick-party-existing');
  const matches=(getCaseFile().parties||[]).filter(p=>!p.mergedInto&&p.roles.includes(role));
  sel.innerHTML='<option value="">— Select —</option>'
    +matches.map(p=>`<option value="${p.id}">${esc(p.name||'(unnamed)')}</option>`).join('');
  showModal('pickPartyModal');
}

// An SSN/EIN shown in a question: its last four digits only, as the PDFs print it.
const shownDetail=(key,value)=>key==='taxId'?`***-**-${String(value).replace(/\D/g,'').slice(-4)}`:value;

// "Link" — attaches the chosen existing party to the open slot. Milestone 73E
// part 2 (decision 73E-N3): the shared record fills only what the slot leaves
// blank; where the slot has typed a detail the record holds differently, the
// filer is asked which to keep, before anything changes, and a typed detail
// is never blanked. It used to overwrite every field with the record's,
// blanks included.
export async function doPickParty(){
  const partyId=document.getElementById('pick-party-existing').value;
  if(!partyId||!_pickPartySlot)return;
  const party=resolveParty(partyId);
  if(!party)return;
  const {role,index}=_pickPartySlot;
  closeModal('pickPartyModal');
  const conflicts=linkConflicts(party,getD(),role,index);
  let replace=false;
  if(conflicts.length){
    const lines=conflicts.map(c=>`• ${LINK_FIELD_LABELS[c.key]||c.key}: typed "${shownDetail(c.key,c.typed)}"; shared record "${shownDetail(c.key,c.shared)}"`);
    // Escape or "Keep" changes nothing typed: the link is made and only blanks are filled.
    replace=await confirmModal({
      title:'Typed details differ from the shared record',
      message:`"${party.name||'This record'}" holds different details from what is typed here:\n\n${lines.join('\n')}\n\nUse the shared record's details in this filing, or keep what is typed here? Blank boxes are filled from the shared record either way.`,
      confirmLabel:"Use the shared record's",
      cancelLabel:'Keep what is typed here',
    });
  }
  setPartyIdForSlot(getD(),role,index,partyId);
  linkSlotToParty(party,getD(),role,index,{replace});
  commitModelChange('link-person');
  renderPage(getCurrentPage(),onChange());
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
  commitModelChange('new-shared-record');
  renderPage(getCurrentPage(),onChange());
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
  document.getElementById('pick-case-ward-name').textContent=ward.wardName?`"${ward.wardName}"`:'this filing';
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
  renderPage(getCurrentPage(),onChange());
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
  renderPage(getCurrentPage(),onChange());
}
