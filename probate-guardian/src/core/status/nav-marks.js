// @ts-nocheck -- in tsconfig.json's checked program only transitively (router.js imports it); moved
// as text from legacy-app.js in Milestone 70's 70F, never written with JSDoc types.
// Milestone 70, 70F: the sidebar's section marks on the page -- applying the
// completion map (src/core/filing/filing-registry.js's computeCompletion()),
// the section collapse, the progress summary and the Next button a missing
// schedule disables. Moved from legacy-app.js's FORM BINDING ENGINE.
import { esc } from '../filing/escape-html.js';
import { judgeFiling } from './section-marks.js';
import { blocksNext, guidanceAdvice, isSectionIncomplete, sectionCheckKey, sectionKeyPrefix } from './section-guidance-policy.js';
import { SCHEDULE_NAV_KEYS } from '../filing/models/guardian.js';
import { getCurrentPage } from '../navigation/route-state.js';
import { getActiveInventoryType, getCaseFile, getD } from '../state.js';
import { renderLocalSectionGuidance } from './section-status.js';
import { ic } from '../ui/icons.js';

// The open filing's section marks: which sections are complete, the begun
// ones, and each page's own blockers and questions. Milestone 73F part 2: read
// from the export checks themselves (src/core/status/section-marks.js), so a
// ✓ never hides what Print Preview would block; it was legacy-app.js's
// computeNavChecks(), then the per-type rules in completion.js.
export function computeNavChecks(){
  return judgeFiling(getD(),getActiveInventoryType());
}

// One reading per refresh: the marks, Next and the page's list all come from it.
export function updateNavDots(){
  const judged=computeNavChecks();
  if(judged)applyNavChecks(judged.checks,judged.incomplete);
  updateCurrentScheduleNextButton(judged);
}

// Live-patches the current page's own "Next" button (see pageNav())
// without a full re-render -- needed because checking a schedule's "no
// items" checkbox (setScheduleNoItems()) and editing a row's fields both
// go through afterChange()->updateNavDots() rather than renderPage(), so
// the button rendered at page-load time would otherwise go stale until
// the next full navigation.
// Milestone 63A. Three separate questions -- see src/core/status/section-guidance-policy.js --
// that this function used to answer as one, and that the Guardian module answered again
// with a copy of its own (so a fix to one would have shown the explanation on page load
// and wiped it on the first keystroke). All three now come from the shared policy (imported
// since Milestone 70's 70F; the classic script reached it on window):
//   isSectionIncomplete  whether to EXPLAIN what is missing: the sidebar's own map, every type
//   blocksNext           whether to disable Next: a per-type policy (Guardian: schedule pages only)
//   guidanceAdvice       what to say: "tick the none box" only where the page has that box
export function pageCompleteness(route,judged=computeNavChecks()){
  if(!route)return {key:null,incomplete:false,blocked:false};
  const type=getActiveInventoryType();
  const r=judged;
  const key=sectionCheckKey(type,route);
  const incomplete=isSectionIncomplete(r&&r.checks,key);
  const blocked=blocksNext({type,checkKey:key,incomplete,guardianScheduleKeys:SCHEDULE_NAV_KEYS});
  return {key,incomplete,blocked};
}

// Keeps its name and its meaning -- "does incompleteness block Next on this route"
// (it was published on window until Milestone 70's 70K).
export function isScheduleIncomplete(route){
  return pageCompleteness(route).blocked;
}

export function updateCurrentScheduleNextButton(judged=computeNavChecks()){
  const btn=document.getElementById('page-next-btn');
  if(!btn)return;
  const route=(typeof getCurrentPage()==='string'?getCurrentPage():'').split('?')[0];
  const {incomplete,blocked}=pageCompleteness(route,judged);
  // The advice must fit the page: "add an item, or check the box verifying there are none"
  // is right only where such a checkbox exists.
  const advice=guidanceAdvice({hasVerifyNoneBox:!!document.querySelector('#main-content .schedule-empty-check')});
  btn.disabled=blocked;
  btn.title=blocked?advice:'';
  const guidanceContainer=document.getElementById('page-local-guidance');
  if(guidanceContainer){
    const type=getActiveInventoryType()||getD()?.inventoryType;
    // Explain whenever the section is incomplete -- not only when Next is blocked. On the
    // Guardian Cover and D-1..D-5 the page explains but Next stays enabled (D1); clearing the
    // box here whenever Next was not blocked is what would have wiped the explanation on the
    // first edit.
    // Milestone 73F part 2: the list is exactly what holds the mark back -- this page's blockers
    // from the export checks and its unanswered sidebar-only questions (63F's wants, now the
    // checks' prompts) -- so an incomplete page always names what it needs.
    const owed=judged?judged.pageIssues(route):{blockers:[],prompts:[]};
    const wants=owed.prompts.map(p=>({label:p.label,path:p.path}));
    drawGuidance(guidanceContainer,incomplete?renderLocalSectionGuidance(route,owed.blockers,Infinity,{message:advice,wants},type):'');
  }
}

// The list of what the page still needs is redrawn on every change. Pressing one of its
// links moves the cursor out of the box the filer was in, that box's write redraws the
// list, and the link pressed was replaced before the release: the click did nothing (since
// "+ Add" puts the cursor in the new row, the first click on the list after an Add). So the
// list is left as it is when nothing in it changed, and a changed list waits for a press on
// it to finish -- the click's own events run first (as router.js's waitForTyping()).
const drawnGuidance=new WeakMap();
let pressedOn=null;
let guidanceWaiting=false;
if(typeof document!=='undefined'&&typeof document.addEventListener==='function'){
  document.addEventListener('pointerdown',(event)=>{pressedOn=event.target;},{capture:true});
  document.addEventListener('pointerup',()=>{setTimeout(()=>{pressedOn=null;},0);},{capture:true});
}
function drawGuidance(container,html){
  if(drawnGuidance.get(container)===html)return;
  if(pressedOn&&container.contains(pressedOn)){
    if(guidanceWaiting)return;
    guidanceWaiting=true;
    document.addEventListener('pointerup',()=>setTimeout(()=>{guidanceWaiting=false;updateCurrentScheduleNextButton();},0),{capture:true,once:true});
    return;
  }
  container.innerHTML=html;
  drawnGuidance.set(container,html);
}

export function applyNavChecks(checks,incomplete={}){
  // Every tracked item shows a mark by default now -- red − until its own
  // schedule/section is complete, then green ✓ -- rather than staying
  // blank until visited-and-started. `incomplete` is kept as a parameter
  // for callers/back-compat but no longer changes what renders here.
  for(const[k,v] of Object.entries(checks)){
    const el=document.querySelector(`[data-nav="${k}"]`);
    if(!el)continue;
    el.innerHTML=el.innerHTML.replace(/\s*<span class="nav-check.*?<\/span>/,'');
    el.innerHTML+=v?` <span class="nav-check complete">✓</span>`:` <span class="nav-check incomplete">−</span>`;
  }
  applyNavSectionCollapse(checks);
  renderProgressSummary(checks);
}

// Session-only memory of the single sidebar nav section the user explicitly
// opened. If null, the section containing the current page is expanded. The
// key includes the ward id so one ward's sidebar state never leaks onto
// another ward with identically-labeled sections.
export let _navSectionExpandedKey=null;

export function toggleNavSection(key){
  _navSectionExpandedKey=_navSectionExpandedKey===key?null:key;
  updateNavDots();
}

// Leaving a page must forget a manually-opened section, so the section
// containing the new page expands itself again (see the comment above).
// This has to be a function declaration rather than the bare `let` above,
// because only a real window property is reachable from the module that owns
// navigate() now -- src/core/navigation/router.js. The reset used to sit
// inline in this file's own navigate(), but router.js publishing
// window.navigate overwrote that function's global binding, so the reset
// silently stopped running and a manually-opened section stayed stuck open
// across navigations.
export function resetNavSectionExpanded(){_navSectionExpandedKey=null;}

// Turns sidebar nav sections into a single global accordion: opening one
// section collapses every other section. Reads DOM structure only (no
// hardcoded per-form-type section map) -- works for every buildNav*()
// sidebar that follows the existing .nav-section > .nav-section-label +
// .nav-link-item shape. Collapsed completed sections show ✓; collapsed
// incomplete sections show − so hidden child status is not lost.
export function applyNavSectionCollapse(checks){
  const container=document.getElementById('nav-sections');
  if(!container)return;
  const currentKey=getCurrentPageKey();
  const currentPagePath=(getCurrentPage()||'').split('?')[0];
  container.querySelectorAll('.nav-section').forEach(section=>{
    const label=section.querySelector(':scope > .nav-section-label');
    if(!label)return;
    if(label.dataset.origHtml===undefined)label.dataset.origHtml=label.innerHTML;
    const links=[...section.querySelectorAll(':scope > .nav-link-item')];
    const navKeys=[...section.querySelectorAll('[data-nav]')].map(el=>el.dataset.nav).filter(k=>k in checks);
    const hasCurrentLink=links.some(link=>link.dataset.page===currentPagePath||link.dataset.route===currentPagePath);
    const plain=()=>{
      section.classList.remove('collapsed');
      label.classList.remove('nav-section-toggle');
      label.removeAttribute('role');label.removeAttribute('tabindex');label.removeAttribute('aria-expanded');
      label.onclick=null;label.onkeydown=null;
      label.innerHTML=`<span class="nav-section-label-text">${label.dataset.origHtml}</span>`;
    };
    if(!links.length){plain();return;}
    const allComplete=navKeys.length?navKeys.every(k=>checks[k]):null;
    const sectionKey=`${getCaseFile().activeWardId||''}:${label.dataset.origHtml}`;
    const expanded=_navSectionExpandedKey?_navSectionExpandedKey===sectionKey:(navKeys.includes(currentKey)||hasCurrentLink);
    section.classList.toggle('collapsed',!expanded);
    label.classList.add('nav-section-toggle');
    label.setAttribute('role','button');
    label.setAttribute('tabindex','0');
    label.setAttribute('aria-expanded',String(expanded));
    const collapsedMark=allComplete===null?'':`<span class="nav-section-check ${allComplete?'complete':'incomplete'}">${allComplete?'✓':'−'}</span>`;
    label.innerHTML=`<span class="nav-section-chevron">${expanded?'▾':'▸'}</span>`
      +`<span class="nav-section-label-text">${label.dataset.origHtml}</span>`
      +(expanded?'':collapsedMark);
    label.onclick=()=>toggleNavSection(sectionKey);
    label.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();toggleNavSection(sectionKey);}};
  });
}

// Filing-progress summary in the ward-info card. Reuses `checks` — the same
// per-section completion map that just drove the nav ✓ marks above — as the
// single source of truth, so this can't disagree with the sidebar or drift
// out of sync the way a separately-stored "progress" value could.
export function renderProgressSummary(checks){
  const host=document.getElementById('ward-progress');
  if(!host)return;
  const keys=Object.keys(checks);
  const total=keys.length;
  if(!total){host.innerHTML='';return;}
  const complete=keys.filter(k=>checks[k]).length;
  const pct=Math.round(complete/total*100);
  const done=complete===total;
  const nextKey=keys.find(k=>!checks[k]);
  const nextEl=nextKey&&document.querySelector(`[data-nav="${nextKey}"]`);
  const nextRoute=nextEl&&nextEl.dataset.page;
  const jumpLabel=nextEl?nextEl.textContent.replace(/[✓⚠]/g,'').trim():'';
  host.innerHTML=`
    <div class="ward-progress-head">
      <span class="ward-progress-label">Filing Progress</span>
      <span class="ward-progress-pct">${pct}%</span>
    </div>
    <div class="ward-progress-bar" role="progressbar" aria-label="Filing progress: ${complete} of ${total} pages to fill in complete"
         aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100">
      <div class="ward-progress-fill${done?' ward-progress-done':''}" style="width:${pct}%"></div>
    </div>
    <div class="ward-progress-count">${complete} of ${total} pages to fill in complete</div>
    ${nextRoute?`<button type="button" class="ward-progress-jump" data-form-action="navigate" data-route="${esc(nextRoute)}">${ic('external',13)} Jump to ${esc(jumpLabel)}</button>`:''}`;
}

export function getCurrentPageKey(){
  const page=getCurrentPage().split('?')[0];
  if(getActiveInventoryType()==='guardian'){
    // Guardian nav keys are unprefixed and match the page path directly (e.g. '/a1' -> 'a1').
    // '/' and '/summary' both map to 'cover' -- Summary has no required fields
    // of its own (it's a read-only rollup of the other pages), so it isn't
    // separately tracked in computeNavChecks(), but should still count as
    // "inside" the Case Info section for the sidebar's active-page auto-expand.
    if(page==='/'||page==='/summary')return 'cover';
    const guardianPages=['/a1','/a2','/b1','/b2','/b3','/b4','/c1','/c2','/c3','/c4','/c5','/d1','/d2','/d3','/d4','/d5'];
    return guardianPages.includes(page)?page.slice(1):'';
  }
  // Each type needs its OWN prefix. An unrecognised type falling back to ''
  // would produce bare keys like 'cover'/'p2' that collide with the Guardian
  // type's unprefixed nav keys above, silently corrupting its checkmarks.
  // (The prefixes are section-guidance-policy.js's, the same table its
  // sectionCheckKey() uses -- one copy since Milestone 70's 70F.)
  const prefix=sectionKeyPrefix(getActiveInventoryType());
  if(!prefix)return '';
  const pageMap={
    '/':'cover', '/p2':'p2', '/p3':'p3', '/p4':'p4', '/p5':'p5', '/p6':'p6', '/p7':'p7',
    '/p8':'p8', '/p9':'p9', '/p10':'p10', '/p11':'p11',
    '/scha':'scha', '/schb1':'schb1', '/schb2':'schb2', '/schb3':'schb3', '/schb4':'schb4',
    '/schc':'schc', '/schd1':'schd1', '/schd2':'schd2', '/schd3':'schd3', '/schd4':'schd4', '/schd5':'schd5',
    '/sche':'sche', '/schf1':'schf1', '/schf2':'schf2', '/schf3':'schf3', '/schf4':'schf4', '/schf5':'schf5'
  };
  const pageKey=pageMap[page];
  if(!pageKey)return '';
  return prefix+pageKey;
}
