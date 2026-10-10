// @ts-nocheck -- in tsconfig.json's checked program only transitively (the filing lifecycle imports it); 
// moved as text from legacy-app.js in Milestone 70's 70H.
// Milestone 70, 70H: the sidebar -- the open filing's card, the ward and
// guardian names shown, the save controls and their collapse, and the
// copyright line. Moved from legacy-app.js.
import { withMinusCue } from '../form/amount-codec.js';
import { esc } from '../filing/escape-html.js';
import { formDisplayName, formEngine, INVENTORY_TYPE_META, INVENTORY_TYPES, typeIcon } from '../filing/filing-registry.js';
import { formatDashboardCurrency } from '../format/money.js';
import { features } from '../runtime/features.js';
import { FILING_ENGINE_IDS } from '../filing/filing-descriptor.js';
import { getActiveInventoryType, getActiveWard, getCaseFile, getD } from '../state.js';
import { updateNavDots } from '../status/nav-marks.js';
import { onModelChange } from '../model-change.js';

// Populates the sidebar's active-ward info card (icon, type, live headline
// total) from the currently active ward. Shared by updateSidebar() (on load
// / ward switch) and afterChange() (on every Initial Inventory field edit,
// so the headline total there updates live as the user types) — a single
// function so both call sites can't drift into showing different content.
// The "Name of Ward" field on Cover & Summary writes D.wardName directly --
// the same object reference caseFile.wards holds, so the underlying
// data is always correct -- but the sidebar's Active Ward selector only
// gets its displayed text from the last full updateSidebar() render, which
// typing in that field never triggers. A full re-render on every keystroke
// would be a lot of needless DOM work (rebuilds the whole nav list) just to
// keep one text input in sync, so this only touches that one input.
export function syncActiveWardNameDisplay(){
  const inp=document.getElementById('ward-selector');
  if(inp&&getD()){inp.value=getD().wardName||'';describeActiveFiling(inp,getD());}
}

// Milestone 74S (UX-27): a long name is cut off in the box; its tooltip and
// its accessible description give the whole name and the filing type.
function describeActiveFiling(input,filing){
  const full=filing&&filing.inventoryType?`${filing.wardName||'(unnamed)'} — ${formDisplayName(filing.inventoryType)}`:'';
  let desc=document.getElementById('ward-selector-full');
  if(!desc&&typeof document.createElement==='function'){
    desc=document.createElement('span');
    desc.id='ward-selector-full';
    desc.className='visually-hidden';
    input.insertAdjacentElement?.('afterend',desc);
  }
  if(desc)desc.textContent=full;
  if(full){input.title=full;input.setAttribute('aria-describedby','ward-selector-full');}
  else{input.removeAttribute('title');input.removeAttribute('aria-describedby');}
}

// The header's "Guardian: —" line used to show only caseFile.guardianName
// -- the app-level "your name" entered once at setup, never anything about
// the CURRENT form. Every form type's Cover page has its own field for the
// guardian actually identified on THIS filing (named differently per type:
// guardian, guardianName, or guardianNames -- see each emptyDataXxx()), so
// that's tried first, in the order it's most likely to already be filled
// in (the simple Cover-page field, before the more detailed guardians[]
// signature-page array some types also have); the app-level name is still
// the fallback for a form with nothing entered yet, or the rare type
// (Simplified Plan) that never asks for a guardian name at all.
export function getPrimaryGuardianDisplayName(){
  const d=getD();
  if(!d)return getCaseFile().guardianName||'';
  return d.guardian||d.guardianName||d.guardianNames
    ||(Array.isArray(d.guardians)&&d.guardians[0]&&d.guardians[0].name)
    ||getCaseFile().guardianName||'';
}

// Same "sync just this one element" reasoning as syncActiveWardNameDisplay()
// above -- typing in a guardian-name field never triggers a full
// updateSidebar() rebuild, so this is wired into every place one of those
// fields can actually be edited instead.
export function syncGuardianNameDisplay(){
  const el=document.getElementById('guardian-name-display');
  if(el)el.textContent=`Guardian: ${getPrimaryGuardianDisplayName()||'—'}`;
}

/**
 * Milestone 73J part 2: the "Guardian: ..." line and the filing picker's name
 * follow every change, not only a name typed into a field -- an Excel import,
 * Link Person or Sync changes them too, and left them stale until the next
 * full sidebar rebuild. The picker's box is left alone while the filer types
 * in it. Installed once at startup.
 * @param {{ signal?: AbortSignal }} [options]
 */
export function installSidebarFollowsChanges({ signal } = {}){
  return onModelChange(()=>{
    syncGuardianNameDisplay();
    const picker=document.getElementById('ward-selector');
    if(!picker||document.activeElement!==picker)syncActiveWardNameDisplay();
  },{ signal });
}

export function refreshWardInfoCard(){
  const wardInfo=document.getElementById('ward-info-display');
  if(!wardInfo)return;
  const ward=getActiveWard();
  if(!ward){
    wardInfo.style.display='none';
    wardInfo.innerHTML='';
    return;
  }
  const meta=INVENTORY_TYPE_META[ward.inventoryType]||{iconName:'folder',accent:'#525d6e',accentText:'var(--ink-3)',totalLabel:'Total'};
  const headline=features().headlineTotal(ward);
  wardInfo.style.display='block';
  wardInfo.style.borderLeftColor=meta.accent;
  // ?. guard: an unregistered type here would throw and blank the sidebar.
  const typeName=INVENTORY_TYPES[ward.inventoryType]?.name||ward.inventoryType;
  // Non-financial types (Plans) have no total worth showing — the progress
  // bar rendered just below already is the meaningful headline, so the
  // dollar lines are dropped rather than shown as an empty "—".
  const totalHTML=meta.financial===false?''
    :`<div class="ward-info-total-row"><div class="ward-info-total-label">${esc(meta.totalLabel)}</div>
      <div class="ward-info-total">${withMinusCue(formatDashboardCurrency(headline))}</div></div>`;
  wardInfo.innerHTML=`<div class="ward-info-head">
      <span class="ward-info-icon" style="color:${meta.accentText}">${typeIcon(ward.inventoryType,16)}</span>
      <span class="ward-info-type" style="color:${meta.accentText}">${esc(typeName)}</span>
    </div>
    ${totalHTML}
    <div class="ward-progress" id="ward-progress"></div>`;
  updateNavDots(); // populates #ward-progress from the same completion check as the nav ✓/⚠ marks
}

// Ward-management controls (the whole topnav row -- All Wards, theme,
// help -- plus Switch Ward / +New Form / Rename+Delete -- everything tagged
// .ward-collapsible) collapse automatically the first time a form becomes
// active, to give the
// schedule/certification/output list below more room while it's actually
// being filled out. _wardControlsUserToggled latches once the user clicks
// the toggle so their choice sticks for the rest of the session, including
// across switching to a different ward, instead of silently re-collapsing
// under them every time updateSidebar() runs.
// The sidebar's collapsible filing controls (Switch Filing, + New Form,
// Close/Rename/Delete) moved to the dashboard header in Milestone 36-1, and
// the toggle that reclaimed sidebar space for the schedule list went with
// them. collapseWardControls() is kept as a no-op because shell-events.js
// still calls it defensively on close/delete/rename/new-form.
export function collapseWardControls(){}

// Same pattern as the ward controls above, for the backup/auto-save block
// at the bottom of the sidebar: collapses automatically once a form is
// active, leaving just the two status lines (last-saved / auto-save-armed)
// visible, so the schedule list gets the room back at both ends of the
// sidebar rather than just the top. #save-controls-body is one plain div
// toggled as a unit -- see the HTML comment above it for why not per-child.
export let _saveControlsCollapsed=false;

export let _saveControlsUserToggled=false;

export function applySaveControlsCollapsedState(){
  const body=document.getElementById('save-controls-body');
  if(body)body.style.display=_saveControlsCollapsed?'none':'';
  const btn=document.getElementById('save-controls-toggle-btn');
  if(!btn)return;
  btn.textContent=_saveControlsCollapsed?'Show save controls ▾':'Hide save controls ▴';
  btn.setAttribute('aria-expanded',String(!_saveControlsCollapsed));
}

export function collapseSaveControls(){
  _saveControlsCollapsed=true;
  _saveControlsUserToggled=true;
  applySaveControlsCollapsedState();
}

export function toggleSaveControls(){
  _saveControlsCollapsed=!_saveControlsCollapsed;
  _saveControlsUserToggled=true;
  applySaveControlsCollapsedState();
}

export function updateSidebar(){
  const sidebar=document.getElementById('sidebar');
  if(getCaseFile().wards.length===0){
    sidebar.style.display='none';
    return;
  }
  sidebar.style.display='';

  // Update guardian name
  syncGuardianNameDisplay();

  // Update ward selector
  const selector=document.getElementById('ward-selector');
  const activeWardId=getCaseFile().activeWardId;
  const activeWard=getCaseFile().wards.find(w=>w.wardId===activeWardId);
  selector.value=activeWard?activeWard.wardName:'';
  selector.dataset.wardId=activeWardId||'';
  describeActiveFiling(selector,activeWard);

  // Show ward info if active
  refreshWardInfoCard();
  // Close / Rename / Delete now render in the dashboard header, which owns
  // their visibility. The sidebar must not reach for them by id: on a form
  // page they are not in the document at all.

  // Milestone 50I: this line only runs once caseFile.wards.length>0 (the
  // early return at the top of updateSidebar() catches the empty case), so
  // the save controls always apply to some case file -- gating visibility on
  // activeWardId hid the toggle button whenever no filing was active (e.g. a
  // restored case landing on /dashboard), leaving no way to reach it.
  const saveToggleBtn=document.getElementById('save-controls-toggle-btn');
  if(saveToggleBtn)saveToggleBtn.style.display='block';
  // Collapses by default on every page, matching every other page's
  // behavior, unless the user has explicitly toggled it this session.
  // Previously gated on activeInventoryType (a filing page being open),
  // which left it expanded on /dashboard, /party-management, /activity-log
  // and /inventory-select for any session that hadn't yet opened a filing --
  // confirmed live: a restored case with no active filing shows it expanded.
  if(!_saveControlsUserToggled)_saveControlsCollapsed=true;
  applySaveControlsCollapsedState();

  if(!getActiveInventoryType()){
    // No filing is open (e.g. back on the dashboard) -- the context strip and
    // nav checklist below belong to whichever filing was last open and must
    // not linger. Milestone 38C cleared activeWardId/window.D on dashboard
    // entry and called updateSidebar() to reflect that, but this function
    // never actually blanked these two elements for the no-active-filing
    // case -- it only ever populated them, so they silently kept showing the
    // previous filing's context and checklist.
    const staleCtx=document.getElementById('sidebar-context');
    if(staleCtx)staleCtx.style.display='none';
    const staleNav=document.getElementById('nav-sections');
    if(staleNav)staleNav.innerHTML='';
    return;
  }
  // Milestone 73R part 1 (73R-2): the filing type shows once, on the filing
  // card below the Active Filing box; the strip that repeated it under the
  // header stays hidden, giving its height to the section list.
  const ctx=document.getElementById('sidebar-context');
  if(ctx)ctx.style.display='none';
  const navContainer=document.getElementById('nav-sections');

  // The open filing's own sidebar sections, drawn by its feature (Milestone
  // 70, 70K: through the feature services, not the monolith's seven mounts).
  const engine=formEngine(getActiveInventoryType());
  if(FILING_ENGINE_IDS.includes(engine))features().mountNav(engine,navContainer);
}

// Sidebar copyright line -- year computed from the visitor's own clock so it
// keeps incrementing on every Jan 1 with no code change required.
export function renderCopyrightNotice(){
  const el=document.getElementById('sidebar-copyright');
  if(!el)return;
  el.textContent=`© Copyright ${new Date().getFullYear()} Pinellas County Clerk of the Circuit Court and Comptroller`;
  // Milestone 73R part 1 (73R-1): drawn on one line; the whole notice on hover
  // (and to a screen reader, which reads the text whole).
  el.title=el.textContent;
}
