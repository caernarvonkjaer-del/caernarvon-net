// @ts-nocheck -- in tsconfig.json's checked program only transitively (the router imports it); 
// moved as text from legacy-app.js in Milestone 70's 70H.
// Milestone 70, 70H: the Activity Log page -- listing, filtering and
// exporting the case's activity, and the storage readout beside it. Moved
// from legacy-app.js's ACTIVITY LOG VIEWER.
import { esc } from '../filing/escape-html.js';
import { formatRelativeTime, getLastExportAt, isAutoSaveArmed, loadCaseFileHandle, saveBlobAs } from '../persistence/case-file.js';
import { monolith } from '../runtime/monolith.js';
import { alertModal } from '../ui/dialogs.js';
import { ic } from '../ui/icons.js';

export const ACTIVITY_EVENT_META={
  PASSWORD_CREATED: {label:'Master password created', iconName:'shield'},
  UNLOCK_SUCCESS:   {label:'Unlocked',                 iconName:'unlock'},
  UNLOCK_FAILED:    {label:'Failed unlock attempt',    iconName:'lock'},
  UNLOCK_LOCKOUT:   {label:'Locked out after repeated failures', iconName:'lock'},
  DATA_EXPORT:      {label:'Backup saved',             iconName:'download'},
  DATA_IMPORT:      {label:'Backup restored',          iconName:'upload'},
  PARTY_MERGE:      {label:'Shared record merged',     iconName:'swap'},
  PARTY_UNMERGE:    {label:'Shared record unmerged',   iconName:'swap'},
  PARTY_SYNC:       {label:'Closed filing synced with shared record', iconName:'swap'},
};

export let _activityLogEntries=[];

export const ACTIVITY_LOG_RENDER_CAP=300;

export async function loadAndRenderActivityLog(){
  const raw=await monolith.loadAuditLogEntries();
  // Sort by the in-memory monotonic id; timestamps can collide within one
  // millisecond and are therefore not a reliable ordering key.
  _activityLogEntries=raw.slice().sort((a,b)=>(b.id||0)-(a.id||0));
  renderActivityLogList();
  renderStorageReadout();
}

// Reports the authoritative .sav file and last-save status. Temporary
// recovery storage is intentionally not presented as a durable backup.
export async function renderStorageReadout(){
  const host=document.getElementById('storage-usage-readout');
  if(!host)return;
  const handle=await loadCaseFileHandle();
  if(!handle){
    host.textContent='No case file is open for auto-save this session. Use "Open Case File (.sav)" to resume auto-save, or "Save Backup" to start one.';
    return;
  }
  const fileName=handle.name||'your case file';
  // Read the live values, not this file's own private copies. Those are only
  // written by this file's shadowed duplicates of beginRecordingExport()/
  // refreshAutoSaveArmedStatus(), which the module versions replace at
  // runtime -- so they stayed frozen at their initial null/false and this
  // readout claimed "not saved yet this session" and "needs one manual save
  // to re-arm" indefinitely, even while auto-save was working.
  const lastExportAt=getLastExportAt();
  const armed=isAutoSaveArmed();
  const savedNote=lastExportAt
    ? `last saved ${formatRelativeTime(lastExportAt)}`
    : 'not saved yet this session';
  host.innerHTML=`${ic('chart',14)} <strong>${esc(fileName)}</strong> (case file) — ${armed?'auto-save is on':'auto-save needs one manual save to re-arm'}, ${esc(savedNote)}.`;
}

export function activityLogFiltered(){
  const q=(document.getElementById('activity-log-search')?.value||'').trim().toLowerCase();
  const status=document.getElementById('activity-log-status')?.value||'all';
  const type=document.getElementById('activity-log-type')?.value||'all';
  return _activityLogEntries.filter(e=>{
    if(status==='success'&&!e.success)return false;
    if(status==='failed'&&e.success)return false;
    if(type!=='all'&&e.eventType!==type)return false;
    if(q&&!(String(e.details||'').toLowerCase().includes(q)||String(e.eventType||'').toLowerCase().includes(q)))return false;
    return true;
  });
}

export function renderActivityLogList(){
  const host=document.getElementById('activity-log-rows');
  const countEl=document.getElementById('activity-log-count');
  if(!host)return;
  const filtered=activityLogFiltered();
  if(countEl){
    countEl.textContent=filtered.length===_activityLogEntries.length
      ? `${_activityLogEntries.length} event${_activityLogEntries.length===1?'':'s'}`
      : `${filtered.length} of ${_activityLogEntries.length} events`;
  }
  if(!filtered.length){
    host.innerHTML=`<div class="dashboard-empty-inline">${_activityLogEntries.length?'No events match this filter.':'No activity recorded yet.'}</div>`;
    return;
  }
  const shown=filtered.slice(0,ACTIVITY_LOG_RENDER_CAP);
  host.innerHTML=shown.map(e=>{
    const meta=ACTIVITY_EVENT_META[e.eventType]||{label:e.eventType||'Event',iconName:'file'};
    const when=formatActivityTimestamp(e.timestamp);
    return `<div class="activity-row${e.success?'':' activity-row-failed'}">
      <span class="activity-row-icon">${ic(meta.iconName,16)}</span>
      <div class="activity-row-body">
        <div class="activity-row-head">
          <span class="activity-row-label">${esc(meta.label)}</span>
          <span class="activity-row-time">${esc(when)}</span>
        </div>
        <div class="activity-row-details">${esc(e.details||'')}</div>
      </div>
    </div>`;
  }).join('');
  if(filtered.length>ACTIVITY_LOG_RENDER_CAP){
    host.innerHTML+=`<div class="activity-log-truncated">Showing the most recent ${ACTIVITY_LOG_RENDER_CAP} of ${filtered.length} matching events. Narrow the filter above, or use "Save as text file" to export all of them.</div>`;
  }
}

export function formatActivityTimestamp(iso){
  const d=new Date(iso);
  if(isNaN(d))return iso||'';
  return d.toLocaleString('en-US',{dateStyle:'medium',timeStyle:'short'});
}

// Exports whatever the current filter shows, not always the full log — the
// file's own header states the filter that was applied, so a partial export
// can't be mistaken for the complete record.
export async function exportActivityLog(){
  const filtered=activityLogFiltered();
  const status=document.getElementById('activity-log-status')?.value||'all';
  const type=document.getElementById('activity-log-type')?.value||'all';
  const q=(document.getElementById('activity-log-search')?.value||'').trim();
  const filterParts=[];
  if(status!=='all')filterParts.push('status='+status);
  if(type!=='all')filterParts.push('event='+type);
  if(q)filterParts.push('search="'+q+'"');
  const lines=[
    'Guardian Forms — Activity Log',
    'Exported: '+new Date().toLocaleString('en-US',{dateStyle:'medium',timeStyle:'short'}),
    'Filter: '+(filterParts.length?filterParts.join(', '):'none (all events)'),
    'Events: '+filtered.length,
    '',
  ];
  filtered.forEach(e=>{
    const meta=ACTIVITY_EVENT_META[e.eventType]||{label:e.eventType||'Event'};
    lines.push(`[${formatActivityTimestamp(e.timestamp)}] ${e.success?'OK':'FAILED'} — ${meta.label} — ${e.details||''}`);
  });
  const blob=new Blob([lines.join('\n')],{type:'text/plain'});
  try{
    await saveBlobAs(blob,'ProbateGuardian_ActivityLog_'+new Date().toISOString().slice(0,10)+'.txt');
  }catch(e){
    if(e&&e.name==='AbortError')return;
    console.error('Activity log export failed',e);
    await alertModal('Export failed: '+(e&&e.message||e));
  }
}

export function pageActivityLog(){
  const typeOptions=Object.keys(ACTIVITY_EVENT_META).map(k=>
    `<option value="${k}">${esc(ACTIVITY_EVENT_META[k].label)}</option>`).join('');
  return `<div class="schedule-page">
    <h1>Activity Log</h1>
    <div class="schedule-instructions">A record of security-relevant events on this device — unlocks, failed password attempts, and every backup you save manually or restore. Automatic saves are not logged. Nothing here is transmitted anywhere; it's stored the same way your case data is, on this device only.</div>
    <div id="storage-usage-readout" class="storage-readout">Checking storage…</div>
    <div class="activity-log-toolbar">
      <span class="dashboard-search-wrap activity-log-search-wrap">${ic('search',15)}<label class="visually-hidden" for="activity-log-search">Search activity log details</label><input type="text" id="activity-log-search" class="form-control form-control-sm dashboard-search-input" placeholder="Search details…" data-form-input="activity-log"></span>
      <label class="visually-hidden" for="activity-log-status">Filter activity log by result</label>
      <select id="activity-log-status" class="form-select form-select-sm activity-log-select" data-form-change="activity-log">
        <option value="all">All results</option>
        <option value="success">Successful only</option>
        <option value="failed">Failed only</option>
      </select>
      <label class="visually-hidden" for="activity-log-type">Filter activity log by event type</label>
      <select id="activity-log-type" class="form-select form-select-sm activity-log-select" data-form-change="activity-log">
        <option value="all">All event types</option>
        ${typeOptions}
      </select>
      <button class="btn btn-sm btn-outline-primary" data-form-action="export-activity-log">${ic('download',14)} Save as text file</button>
    </div>
    <div class="activity-log-count" id="activity-log-count"></div>
    <div id="activity-log-rows" class="activity-log-rows"><div class="dashboard-empty-inline">Loading…</div></div>
  </div>`;
}
