// Milestone 70, 70G: the Start New Year and Prior Years dialogs. Moved from
// legacy-app.js's MULTI-YEAR ACCOUNTING.
import { esc } from '../filing/escape-html.js';
import { describeYearLabel } from '../filing/filing-years.js';
import { navigate, renderPage } from '../navigation/router.js';
import { DRAW, onChange } from '../navigation/draw-reason.js';
import { filingLifecycle } from '../navigation/filing-lifecycle.js';
import { getCurrentPage } from '../navigation/route-state.js';
import { getCaseFile } from '../state.js';
import { alertModal, closeModal, ensureFragment, showModal } from '../ui/dialogs.js';
import { ic } from '../ui/icons.js';
import { formDisplayName, formEngine } from '../filing/filing-registry.js';
import { auditLog } from '../activity/audit-log.js';

export let _yearModalWardId=null;

// Milestone 73P (D23): what each type's new year starts from
// (filing-years.js's resetYearlyFieldsForNewYear()). The Plans were told of a
// Starting Balance they don't have.
function newYearNote(type){
  if(type==='guardian')return "The new year opens with a copy of this year's schedules (A-1 through C-5) so you can edit down what's changed, instead of re-entering everything. Signatures and dates are cleared for the new filing.";
  if(type==='simplified')return "The new year opens with Starting Balance pre-filled from this year's Remaining Assets On Hand. Part II's receipts and disbursements, signatures, and the accounting period are cleared for the new filing.";
  if(formEngine(type)==='annual')return "The new year opens with Starting Balance pre-filled from this year's ending total and Schedule D's holdings carried forward. The income, disbursement, capital-change and transfer schedules, signatures, and the accounting period are cleared for the new filing.";
  return "The new year keeps the ward's and the guardians' details. The plan's answers, signatures and dates are cleared for the new filing: each describes one year.";
}

export async function showStartNewYearModal(wardId){
  const ward=getCaseFile().wards.find(w=>w.wardId===wardId);
  if(!ward)return;
  await ensureFragment('common-modals');
  _yearModalWardId=wardId;
  const note=newYearNote(ward.inventoryType);
  document.getElementById('new-year-ward-name').textContent=ward.wardName||'(unnamed ward)';
  document.getElementById('new-year-note').textContent=note;
  showModal('startNewYearModal');
}

export async function confirmStartNewYear(){
  const wardId=_yearModalWardId;
  if(!wardId)return;
  closeModal('startNewYearModal');
  await filingLifecycle.switchTo(wardId);
  await filingLifecycle.newYear(wardId);
  navigate('/',{reason:DRAW.SWITCH});
}

export function renderPriorYearsList(ward){
  const activeLabel=describeYearLabel(ward,ward);
  const rows=[`<div class="prior-year-row prior-year-current"><span>${esc(activeLabel)} — currently open</span></div>`]
    .concat((ward.years||[]).slice().reverse().map(y=>`
      <div class="prior-year-row">
        <span>${esc(y.label)}</span>
        <div class="d-flex gap-2">
          <button type="button" class="btn btn-sm btn-outline-primary" data-form-action="edit-prior-year" data-ward-id="${esc(ward.wardId)}" data-year-key="${esc(y.key)}">Edit this year</button>
          <button type="button" class="btn btn-sm btn-outline-danger" data-form-action="confirm-delete-ward-year" data-ward-id="${esc(ward.wardId)}" data-year-key="${esc(y.key)}" title="Permanently delete this year">${ic('trash',13)}</button>
        </div>
      </div>`));
  document.getElementById('prior-years-list').innerHTML=rows.join('');
}

export async function showPriorYearsModal(wardId){
  const ward=getCaseFile().wards.find(w=>w.wardId===wardId);
  if(!ward)return;
  await ensureFragment('common-modals');
  _yearModalWardId=wardId;
  document.getElementById('prior-years-ward-name').textContent=ward.wardName||'(unnamed ward)';
  renderPriorYearsList(ward);
  showModal('priorYearsModal');
}

export async function editPriorYear(wardId,key){
  closeModal('priorYearsModal');
  await filingLifecycle.switchTo(wardId);
  await filingLifecycle.switchYear(wardId,key);
  navigate('/',{reason:DRAW.SWITCH});
}

export let _pendingDeleteYear=null;

export async function confirmDeleteWardYear(wardId,yearKey){
  const ward=getCaseFile().wards.find(w=>w.wardId===wardId);
  const entry=ward&&ward.years&&ward.years.find(y=>y.key===yearKey);
  if(!ward||!entry)return;
  await ensureFragment('common-modals');
  _pendingDeleteYear={wardId,yearKey};
  document.getElementById('delete-year-msg').textContent=`Are you sure you want to delete the ${entry.label} accounting for "${ward.wardName}"? Any supporting documents or comments uploaded for that year will be deleted too. This action cannot be undone.`;
  showModal('deleteYearModal');
}

export async function doDeleteWardYear(){
  if(!_pendingDeleteYear)return;
  const {wardId,yearKey}=_pendingDeleteYear;
  try{
    await filingLifecycle.removeYear(wardId,yearKey);
    // Milestone 74S (74S-4): recorded, naming the filing and the year.
    const named=getCaseFile().wards.find(w=>w.wardId===wardId);
    await auditLog('YEAR_DELETED',`Deleted ${yearKey} of the ${formDisplayName(named?.inventoryType)} for ${named?.wardName||'(unnamed)'}`,true,wardId);
    closeModal('deleteYearModal');
    const ward=getCaseFile().wards.find(w=>w.wardId===wardId);
    if(ward)renderPriorYearsList(ward);
    // The dashboard's own grid is not reachable from here; re-rendering the
    // page redraws it. renderDashboardGrid() was never a global, so this line
    // threw after every deletion made from the dashboard, and the filer was
    // told the year had not been deleted when it had (Milestone 70, 70I).
    if(getCurrentPage()==='/dashboard')renderPage('/dashboard',onChange());
  }catch(e){
    console.error('Failed to delete year',e);
    await alertModal('Failed to delete year. Check console.');
  }
}
