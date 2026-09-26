// @ts-nocheck -- in tsconfig.json's checked program only transitively (router.js imports it); moved
// as text from legacy-app.js in Milestone 70's 70G, never written with JSDoc types.
// Milestone 70, 70G: the People page -- the shared-record directory, the
// possible-duplicate queue, merging and unmerging, and the closed-filing
// sync notices. Moved from legacy-app.js's PARTY MANAGEMENT.
import { esc } from '../filing/escape-html.js';
import { INVENTORY_TYPES } from '../filing/filing-registry.js';
import { wardCountyMergeConflict } from '../navigation/ward-county.js';
import { closedFilingDrift, dismissPartyPair, filingDriftFromParties, findDuplicateCandidates, mergeParties, referenceCountForParty, resolveParty, slotsReferencing, subPartiesOf, syncFilingSlotWithParty, unmergeParty } from '../party-resolver.js';
import { monolith } from '../runtime/monolith.js';
import { getCaseFile, getD } from '../state.js';
import { confirmModal } from '../ui/dialogs.js';

export const PARTY_FIELD_ROWS=[
  ['name','Name'],
  ['phone','Phone'],
  ['email','Email'],
  ['secondaryEmail','Secondary Email'],
  ['identifiers.taxId','SSN/EIN/TIN'],
  ['identifiers.barNumber','Bar Number'],
  ['county','County'],
  ['address.street','Street Address'],
  ['address.cityStateZip','City/State/Zip'],
  ['mailingAddress.street','Mailing Street'],
  ['mailingAddress.cityStateZip','Mailing City/State/Zip'],
  ['officeAddress.street','Office Street'],
  ['officeAddress.cityStateZip','Office City/State/Zip'],
  ['notes','Notes'],
];

// Labels for the flat slot shape readRoleFields() returns (party-resolver.js).
export const SLOT_FIELD_LABELS={name:'Name',taxId:'SSN/EIN/TIN',barNumber:'Bar Number',phone:'Phone',email:'Email',secondaryEmail:'Secondary Email',street:'Street Address',cityStateZip:'City/State/Zip',officeStreet:'Office Street',officeCityStateZip:'Office City/State/Zip',mailingStreet:'Mailing Street',mailingCityStateZip:'Mailing City/State/Zip'};

export function partyFieldValue(party,path){
  return path.split('.').reduce((v,k)=>v&&v[k],party)||'';
}

export function partyRoleBadgesHTML(party){
  return (party.roles||[]).map(r=>`<span class="badge bg-secondary">${esc(r)}</span>`).join(' ');
}

export function filingLabel(filing){
  return `${filing.wardName||'(unnamed)'} — ${INVENTORY_TYPES[filing.inventoryType]?.name||filing.inventoryType}${filing.archived?' (closed)':''}`;
}

export function slotLabel(role,index){
  return role==='guardian'?`Guardian ${index+1}`:role.charAt(0).toUpperCase()+role.slice(1);
}

// The filings a record is linked into, one line per slot -- for a ward the
// most useful clue to whether two records are the same person.
export function partyReferenceLinesHTML(partyId){
  const lines=[];
  for(const filing of getCaseFile().wards||[]){
    for(const slot of slotsReferencing(filing,partyId))lines.push(`${filingLabel(filing)} · ${slotLabel(slot.role,slot.index)}`);
  }
  if(!lines.length)return '<div style="font-size:.8rem;color:var(--ink-3);">Not linked to any filing</div>';
  return `<div style="font-size:.8rem;color:var(--ink-3);">Used by:</div><ul class="mb-0 ps-3" style="font-size:.8rem;">${lines.map(l=>`<li>${esc(l)}</li>`).join('')}</ul>`;
}

// Screen-local selection state, never persisted: the (at most two) directory
// rows ticked to compare, and the sub rows ticked to unmerge. Reset each
// time the page is opened.
export let _partyCompareIds=[];

export let _partyUnmergeIds=[];

export function pagePartyManagement(){
  _partyCompareIds=[];
  _partyUnmergeIds=[];
  return `<div class="schedule-page">
    <h1>Manage Shared Records</h1>
    <div class="schedule-instructions">Shared records (parties) hold one person's contact info for guardians, attorneys, and preparers, so it stays the same everywhere it's used. This screen surfaces records that look like the same person entered twice, lets you pick any two records yourself to compare and merge, and lets you search everything on file. A merged record stays listed beneath its primary and can be unmerged later.</div>
    <div id="party-dedupe-queue"></div>
    <h2 class="subsection-heading" style="margin-top:1.5rem;">All Shared Records</h2>
    <div class="schedule-instructions">Tick <b>Compare</b> on any two records to review them as a merge candidate above. Records already merged are listed beneath their primary; tick one and choose <b>Unmerge Selected</b> to make it a separate record again.</div>
    <div class="mb-3"><label class="visually-hidden" for="party-directory-search">Search shared records by name</label><input type="text" id="party-directory-search" class="form-control form-control-sm" placeholder="Search by name…" autocomplete="off" data-form-input="party-directory"></div>
    <div id="party-directory-rows"></div>
  </div>`;
}

export function renderPartyManagementBody(){
  renderPartyDedupeQueue();
  renderPartyDirectoryRows();
}

// Recomputed fresh on every call (page open, or after any merge/dismiss) --
// candidates are cheap to derive and never cached, so the queue can never
// go stale relative to caseFile.parties.
export function renderPartyDedupeQueue(){
  const host=document.getElementById('party-dedupe-queue');
  if(!host)return;
  const manual=manualCompareCandidate();
  const cards=[...(manual?[manual]:[]),...findDuplicateCandidates()];
  if(!cards.length){host.innerHTML='<div class="dashboard-empty-inline">No likely duplicates found. Tick <b>Compare</b> on any two records below to review them here.</div>';return;}
  host.innerHTML=cards.map(partyDedupeCardHTML).join('');
}

export function manualCompareCandidate(){
  if(_partyCompareIds.length!==2)return null;
  const [partyA,partyB]=_partyCompareIds.map(id=>(getCaseFile().parties||[]).find(p=>p.id===id&&!p.mergedInto));
  if(!partyA||!partyB)return null;
  return {partyA,partyB,strongMatch:false,matchKind:'manual'};
}

export function partyMatchBadge({matchKind,strongMatch}){
  if(matchKind==='manual')return ['Selected by you','bg-primary'];
  if(matchKind==='near')return strongMatch?['Similar name and same contact info','bg-danger']:['Possible match: similar name','bg-warning text-dark'];
  return strongMatch?['Same name and contact info','bg-danger']:['Same name only','bg-secondary'];
}

export function partyDedupeCardHTML(candidate){
  const {partyA,partyB,matchKind}=candidate;
  const [badge,badgeClass]=partyMatchBadge(candidate);
  const column=(party,other)=>`<div class="col-12 col-md-6"><div class="entry-card mb-0 h-100">
    <div class="entry-card-header">${esc(party.name)||'(unnamed)'}</div>
    <div class="entry-card-body">
      <div class="mb-2">${partyRoleBadgesHTML(party)}</div>
      ${PARTY_FIELD_ROWS.map(([path,label])=>{
        const val=partyFieldValue(party,path);
        const otherVal=partyFieldValue(other,path);
        const differs=val!==otherVal;
        return `<div class="row g-1 mb-1"><div class="col-5" style="font-size:.78rem;color:var(--ink-3);">${esc(label)}</div><div class="col-7" style="font-size:.85rem;${differs?'font-weight:700;color:var(--danger-text);':''}">${esc(val)||'—'}</div></div>`;
      }).join('')}
      <div class="mt-2">${partyReferenceLinesHTML(party.id)}</div>
      <button type="button" class="btn btn-sm btn-primary mt-2 w-100" data-form-action="party-merge-keep" data-keep-id="${esc(party.id)}" data-discard-id="${esc(other.id)}">This One is Primary</button>
    </div>
  </div></div>`;
  const dismiss=matchKind==='manual'
    ?`<button type="button" class="btn btn-sm btn-outline-secondary" data-form-action="party-clear-compare">Clear Selection</button>`
    :`<button type="button" class="btn btn-sm btn-outline-secondary" data-form-action="party-dismiss-pair" data-party-a="${esc(partyA.id)}" data-party-b="${esc(partyB.id)}">Not the Same Person</button>`;
  return `<div class="entry-card mb-3">
    <div class="d-flex justify-content-between align-items-center mb-2">
      <span class="badge ${badgeClass}">${esc(badge)}</span>
      ${dismiss}
    </div>
    <div class="row g-3">${column(partyA,partyB)}${column(partyB,partyA)}</div>
  </div>`;
}

export function renderPartyDirectoryRows(){
  const host=document.getElementById('party-directory-rows');
  if(!host)return;
  const q=(document.getElementById('party-directory-search')?.value||'').trim().toLowerCase();
  const parties=(getCaseFile().parties||[]).filter(p=>!p.mergedInto&&(!q||String(p.name||'').toLowerCase().includes(q)));
  const toolbar=_partyUnmergeIds.length?`<div class="mb-2"><button type="button" class="btn btn-sm btn-outline-primary" data-form-action="party-unmerge-selected">Unmerge Selected (${_partyUnmergeIds.length})</button></div>`:'';
  if(!parties.length){host.innerHTML=toolbar+'<div class="dashboard-empty-inline">No shared records yet.</div>';return;}
  const compareFull=_partyCompareIds.length>=2;
  host.innerHTML=toolbar+parties.map(p=>{
    const count=referenceCountForParty(p.id);
    const checked=_partyCompareIds.includes(p.id);
    return `<div class="entry-card mb-2">
    <div class="d-flex justify-content-between align-items-center gap-2">
      <div class="form-check mb-0">
        <input class="form-check-input" type="checkbox" id="party-compare-${esc(p.id)}" title="Compare" data-form-action="party-compare-toggle" data-party-id="${esc(p.id)}"${checked?' checked':''}${!checked&&compareFull?' disabled':''}>
        <label class="form-check-label" for="party-compare-${esc(p.id)}"><strong>${esc(p.name)||'(unnamed)'}</strong> ${partyRoleBadgesHTML(p)}</label>
      </div>
      <span style="font-size:.8rem;color:var(--ink-3);white-space:nowrap;">${count} reference${count===1?'':'s'}</span>
    </div>
    ${subPartiesOf(p.id).map(partySubRowHTML).join('')}
    ${partyClosedDriftHTML(p.id)}
  </div>`;
  }).join('');
}

// Closed filings whose copy of this record has fallen behind it, each with
// its own Sync with Current button (see party-resolver.js's closed-filing
// section for why they don't just stay in sync).
export function partyClosedDriftHTML(partyId){
  const drift=closedFilingDrift(partyId);
  if(!drift.length)return '';
  const rows=drift.map(d=>`<div class="d-flex justify-content-between align-items-center gap-2 mt-1">
    <span style="font-size:.85rem;">Closed filing <b>${esc(filingLabel(d.filing).replace(' (closed)',''))}</b> · ${esc(slotLabel(d.role,d.index))} differs: ${esc(d.differences.map(x=>SLOT_FIELD_LABELS[x.key]||x.key).join(', '))}</span>
    <button type="button" class="btn btn-sm btn-outline-primary text-nowrap" data-form-action="party-sync-closed" data-ward-id="${esc(d.filing.wardId)}" data-role="${esc(d.role)}" data-index="${d.index}">Sync with Current</button>
  </div>`).join('');
  const all=drift.length>1?`<div class="mt-2"><button type="button" class="btn btn-sm btn-primary" data-form-action="party-sync-closed-all" data-party-id="${esc(partyId)}">Sync All (${drift.length})</button></div>`:'';
  return `<div class="ms-3 ps-3 mt-2 border-start">${rows}${all}</div>`;
}

export async function doPartySyncClosed(wardId,role,index){
  const filing=(getCaseFile().wards||[]).find(w=>w.wardId===wardId);
  if(!filing)return;
  if(syncFilingSlotWithParty(filing,role,Number(index)||0)){
    await monolith.auditLog('PARTY_SYNC',`Synced ${slotLabel(role,Number(index)||0)} on closed filing "${filing.wardName}" with its shared record`,true,wardId);
    monolith.autoSave();
  }
  renderPartyManagementBody();
}

export async function doPartySyncClosedAll(partyId){
  for(const d of closedFilingDrift(partyId)){
    if(syncFilingSlotWithParty(d.filing,d.role,d.index))await monolith.auditLog('PARTY_SYNC',`Synced ${slotLabel(d.role,d.index)} on closed filing "${d.filing.wardName}" with its shared record`,true,d.filing.wardId);
  }
  monolith.autoSave();
  renderPartyManagementBody();
}

// The Cover of a closed filing: which linked records have moved on since it
// was closed, with a Sync with Current button per slot. Rendered by the
// router after the feature mounts its Cover, only for closed filings.
export function renderClosedFilingSyncNotice(container,filing){
  if(!container||!filing||!filing.archived)return;
  container.querySelector('[data-closed-filing-sync]')?.remove();
  const drift=filingDriftFromParties(filing);
  if(!drift.length)return;
  const rows=drift.map(d=>`<li class="d-flex justify-content-between align-items-center gap-2 mb-1">
    <span><b>${esc(slotLabel(d.role,d.index))}</b> "${esc(d.party.name||'(unnamed)')}": ${esc(d.differences.map(x=>SLOT_FIELD_LABELS[x.key]||x.key).join(', '))}</span>
    <button type="button" class="btn btn-sm btn-outline-primary text-nowrap" data-form-action="filing-sync-closed" data-role="${esc(d.role)}" data-index="${d.index}">Sync with Current</button>
  </li>`).join('');
  const notice=document.createElement('div');
  notice.className='alert alert-warning mb-3';
  notice.setAttribute('data-closed-filing-sync','');
  notice.innerHTML=`<div class="mb-1"><b>This filing is closed.</b> Its shared records have changed since it was closed; it keeps what was filed until you sync it.</div>
    <ul class="list-unstyled mb-0">${rows}</ul>
    ${drift.length>1?`<button type="button" class="btn btn-sm btn-primary mt-2" data-form-action="filing-sync-closed-all">Sync All (${drift.length})</button>`:''}`;
  const h1=container.querySelector('.schedule-page > h1, .schedule-page h1');
  if(h1)h1.insertAdjacentElement('afterend',notice);else container.prepend(notice);
}

export async function doFilingSyncClosed(role,index){
  const filing=getD();
  if(!filing)return;
  const slots=role?[{role,index:Number(index)||0}]:filingDriftFromParties(filing).map(d=>({role:d.role,index:d.index}));
  for(const s of slots){
    if(syncFilingSlotWithParty(filing,s.role,s.index))await monolith.auditLog('PARTY_SYNC',`Synced ${slotLabel(s.role,s.index)} on closed filing "${filing.wardName}" with its shared record`,true,filing.wardId);
  }
  monolith.autoSave();
  window.renderPage(monolith.getCurrentPage());
}

export function partySubRowHTML(sub){
  const checked=_partyUnmergeIds.includes(sub.id);
  const mergedAt=sub.mergeRecord?.mergedAt?new Date(sub.mergeRecord.mergedAt).toLocaleDateString():'';
  return `<div class="ms-3 ps-3 mt-2 border-start"><div class="form-check mb-0">
    <input class="form-check-input" type="checkbox" id="party-unmerge-${esc(sub.id)}" title="Select to unmerge" data-form-action="party-unmerge-toggle" data-party-id="${esc(sub.id)}"${checked?' checked':''}>
    <label class="form-check-label" for="party-unmerge-${esc(sub.id)}" style="font-size:.85rem;">${esc(sub.name)||'(unnamed)'} ${partyRoleBadgesHTML(sub)} <span style="font-size:.78rem;color:var(--ink-3);">merged into this record${mergedAt?' on '+esc(mergedAt):''}</span></label>
  </div></div>`;
}

export function togglePartyCompareSelection(partyId,checked){
  _partyCompareIds=_partyCompareIds.filter(id=>id!==partyId);
  if(checked&&_partyCompareIds.length<2)_partyCompareIds.push(partyId);
  renderPartyManagementBody();
}

export function clearPartyCompareSelection(){
  _partyCompareIds=[];
  renderPartyManagementBody();
}

export function togglePartyUnmergeSelection(partyId,checked){
  _partyUnmergeIds=_partyUnmergeIds.filter(id=>id!==partyId);
  if(checked)_partyUnmergeIds.push(partyId);
  renderPartyManagementBody();
}

// The confirmModal() message doubles as the "prompt per-field" step the
// persistence-rewrite plan calls for: it lists every field that would be
// backfilled onto the primary record from the sub (blank-on-primary,
// present-on-sub) so nothing is adopted silently. Cancelling aborts the
// whole merge -- there's no partial-adopt state to manage.
export async function doPartyMergeKeep(keepId,discardId){
  const keep=resolveParty(keepId),discard=resolveParty(discardId);
  if(!keep||!discard)return;
  const conflict=wardCountyMergeConflict(keepId,discardId);
  const adoptable=PARTY_FIELD_ROWS.filter(([path])=>!partyFieldValue(keep,path)&&partyFieldValue(discard,path));
  let message=`Make "${keep.name}" the primary record and merge "${discard.name}" into it?\n\nEvery filing and case referencing "${discard.name}" will be updated to reference "${keep.name}" instead. "${discard.name}" will be listed beneath "${keep.name}" in All Shared Records, where it can be unmerged later.`;
  if(conflict){
    message+=`\n\nWarning: Conflicting ward counties detected ("${conflict.keepCounty}" vs "${conflict.discardCounty}"). Merging will retain "${conflict.keepCounty}" on "${keep.name}".`;
  }
  if(adoptable.length){
    message+=`\n\nAlso fill in these currently-blank fields on "${keep.name}" from "${discard.name}":\n`+adoptable.map(([path,label])=>`• ${label}: ${partyFieldValue(discard,path)}`).join('\n');
  }
  if(!(await confirmModal(message)))return;
  mergeParties(keepId,discardId,{adoptBlankFields:adoptable.length>0});
  await monolith.auditLog('PARTY_MERGE',`Merged "${discard.name}" into "${keep.name}"`,true);
  _partyCompareIds=[];
  monolith.autoSave();
  renderPartyManagementBody();
}

export async function doPartyDismissPair(idA,idB){
  dismissPartyPair(idA,idB);
  monolith.autoSave();
  renderPartyManagementBody();
}

export async function doPartyUnmergeSelected(){
  const subs=_partyUnmergeIds.map(id=>(getCaseFile().parties||[]).find(p=>p.id===id)).filter(p=>p&&p.mergedInto&&p.mergeRecord);
  if(!subs.length)return;
  const lines=subs.map(s=>`• "${s.name}" (merged into "${resolveParty(s.mergedInto)?.name}")`);
  const message=`Unmerge ${subs.length===1?'this record':'these records'}?\n\n${lines.join('\n')}\n\nEach becomes its own shared record again. Filings and cases that referenced it before the merge will reference it again, and any fields the primary record filled in from it will be cleared -- unless you have changed them since.`;
  if(!(await confirmModal(message)))return;
  for(const sub of subs){
    const primaryName=resolveParty(sub.mergedInto)?.name;
    if(unmergeParty(sub.id))await monolith.auditLog('PARTY_UNMERGE',`Unmerged "${sub.name}" from "${primaryName}"`,true);
  }
  _partyUnmergeIds=[];
  monolith.autoSave();
  renderPartyManagementBody();
}
