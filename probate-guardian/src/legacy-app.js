// ═══════════════════════════════════════════════════════
// THEME (light / dark)
// The synchronous head script sets the OS preference before first paint.
// This block handles runtime changes and restores the saved .sav setting.
// Court-document and PDF styles remain hardcoded for light output.
// ═══════════════════════════════════════════════════════
function currentTheme(){
  return document.documentElement.getAttribute('data-theme')==='dark' ? 'dark' : 'light';
}
function applyTheme(theme,persist){
  document.documentElement.setAttribute('data-theme',theme);
  // Milestone 40D: prepaint.js sets BOTH attributes before first paint, but this
  // function only ever set data-theme -- so toggling left data-bs-theme on
  // whatever was painted at load and Bootstrap's own components stayed on the
  // old palette. Setting both here is part of making the two agree.
  document.documentElement.setAttribute('data-bs-theme',theme);
  if(persist){
    // Milestone 40D: theme is a per-device display preference in localStorage,
    // not case data in the .sav. This used to call saveAppState('theme',theme),
    // which landed in the file's appState section -- readable only after the
    // .sav loaded (and after the password, for an encrypted file), which is what
    // made the theme flash on every reload.
    if(typeof window.writeStoredTheme==='function')window.writeStoredTheme(theme);
  }
  const btns=document.querySelectorAll('#theme-toggle-btn, .topnav-theme');
  btns.forEach(btn=>{
    const isDark=theme==='dark';
    btn.innerHTML=ic(isDark?'sun':'moon',16);
    btn.setAttribute('aria-pressed',String(isDark));
    btn.setAttribute('aria-label','Switch to '+(isDark?'light':'dark')+' theme');
  });
}
function toggleTheme(){
  applyTheme(currentTheme()==='dark' ? 'light' : 'dark', true);
}
// The pre-paint script in <head> already set data-theme on <html> before
// first render (so there's no flash of the wrong theme) — this just brings
// the toggle button's icon/aria state into agreement with that decision.
// The button is static markup, already in the DOM by the time this
// (inline, non-deferred) script runs.
applyTheme(currentTheme(),false);
// ═══════════════════════════════════════════════════════
// GLOBAL STATE & CONFIG
// ═══════════════════════════════════════════════════════


// ANNUAL_P67_CELLS moved to src/features/annual-accounting/excel.js
// (Milestone 7, Phase B) -- Annual Excel export is its only consumer.


// Final and Trust accountings use the Annual engine, but they are distinct
// legal filings. Keep their stored type and Part I selection atomic so every
// later consumer resolves the same descriptor.
function setAccountingFilingType(filingType){
  window.markFilingRevisionChanged?.('filing-type-change');
  const result=window.applyAccountingFilingType
    ? window.applyAccountingFilingType(window.D,filingType)
    : null;
  if(result?.descriptor){
    activeInventoryType=result.descriptor.inventoryType;
  }else{
    const fallback={Annual:'annual',Final:'finalAccounting',Trust:'trustAccounting'}[filingType];
    if(!fallback)return result;
    window.D.inventoryType=fallback;
    window.D.filingType=filingType;
    activeInventoryType=fallback;
  }
  updateSidebar();
  autoSave();
  return result;
}
window.setAccountingFilingType=setAccountingFilingType;

// Case-level data structure. `parties` is the shared party-record model
// (src/core/party-resolver.js); `cases` groups filings by real-world matter
// (src/core/case-resolver.js); `dismissedPartyPairs` remembers "not the same
// person" decisions from the de-dup screen (pagePartyManagement()) so they
// don't resurface every time it's opened.
let caseFile = {
  guardianName: '',
  guardianEmail: '',
  wards: [],
  parties: [],
  cases: [],
  dismissedPartyPairs: [],
  activeWardId: null
};
window.caseFile = caseFile;

// ═══════════════════════════════════════════════════════
// HELP SYSTEM
// ═══════════════════════════════════════════════════════
let helpPanelOpen = false;
let currentHelpContext = 'dashboard';

// Milestone 48: HELP_CONTENT extracted to src/features/help/help-content.js
// for clean separation of help HTML from application logic.
const HELP_CONTENT = new Proxy({}, {
  get(target, prop) {
    return (typeof window !== 'undefined' && window.HELP_CONTENT) ? window.HELP_CONTENT[prop] : target[prop];
  },
  has(target, prop) {
    return (typeof window !== 'undefined' && window.HELP_CONTENT) ? (prop in window.HELP_CONTENT) : (prop in target);
  }
});

function toggleHelpPanel(){
  helpPanelOpen=!helpPanelOpen;
  const panel=document.getElementById('help-panel');
  const btns=document.querySelectorAll('#help-toggle-btn, .topnav-help');
  panel.style.display=helpPanelOpen?'flex':'none';
  btns.forEach(btn=>btn.setAttribute('aria-expanded',String(helpPanelOpen)));
  if(helpPanelOpen){
    updateHelpContext();
    showContextualHelp();
    // Move focus into the panel so a keyboard/screen-reader user lands
    // somewhere meaningful, not stranded on a now off-screen-adjacent button.
    const closeBtn=document.querySelector('.help-panel-close');
    if(closeBtn)closeBtn.focus();
  }else if(btns.length){
    // Closing (via the close button, Escape, or toggling the "?" again)
    // returns focus to the control that opened it, so keyboard users don't
    // lose their place in the page.
    btns[0].focus();
  }
}
// Escape closes the help panel from anywhere inside it, and returns focus
// to the toggle button — the standard behavior for a disclosure panel.
document.addEventListener('keydown',(e)=>{
  if(e.key==='Escape'&&helpPanelOpen&&document.getElementById('help-panel')?.contains(document.activeElement)){
    toggleHelpPanel();
  }
});

function showContextualHelp(){
  const content=HELP_CONTENT[currentHelpContext]||HELP_CONTENT['default'];
  if(!content)return;
  const body=typeof content.content==='function'?content.content():content.content;
  const panel=document.getElementById('help-panel-content');
  panel.innerHTML=`<h3>${content.title}</h3>${body}`;
  panel.scrollTop=0;
}

function updateHelpContext(){
  // Auto-detect the correct help context based on current state
  if(!caseFile.activeWardId){
    // At dashboard or no ward yet
    currentHelpContext='default';
  }else if(activeInventoryType==='guardian'){
    currentHelpContext='guardian-inventory';
  }else if(activeInventoryType==='simplified'){
    currentHelpContext='simplified-accounting';
  }else if(formEngine(activeInventoryType)==='annual'){
    currentHelpContext='annual-accounting';
  }else if(activeInventoryType==='planSimplified'){
    currentHelpContext='plan-simplified';
  }else if(activeInventoryType==='planAnnual'){
    currentHelpContext='plan-annual';
  }else if(activeInventoryType==='planInitial'){
    currentHelpContext='plan-initial';
  }else if(activeInventoryType==='planMinor'){
    currentHelpContext='plan-minor';
  }else{
    currentHelpContext='default';
  }
  if(helpPanelOpen)showContextualHelp();
}

// The standalone help page, deep-linked
// from the "?" button (in a filing) and the Help panel's "View User Guide"
// button (on the dashboard). Anchors below match the id attributes actually
// present in that file -- see its own h2/h3 headings. Guardian Inventory,
// Simplified Accounting and Annual/Final/Trust Accounting have per-schedule-
// group h3 anchors (the finest granularity the manual's own prose supports,
// since it's written per schedule group, not per exact page); the four Plan
// types have no h3 breakdown at all, so every one of their pages maps to the
// same h2 section -- there simply isn't finer content to jump to yet.
const USER_GUIDE_URL='help/';
const USER_GUIDE_ANCHORS={
  guardian:{
    '/':'inventory-cover', '/summary':'inventory-summary',
    '/a1':'inventory-a', '/a2':'inventory-a',
    '/b1':'inventory-b', '/b2':'inventory-b', '/b3':'inventory-b', '/b4':'inventory-b',
    '/c1':'inventory-c', '/c2':'inventory-c', '/c3':'inventory-c', '/c4':'inventory-c', '/c5':'inventory-c',
    '/d1':'inventory-d', '/d2':'inventory-d', '/d3':'inventory-d', '/d4':'inventory-d', '/d5':'inventory-d',
    '/print':'preview',
  },
  simplified:{
    '/':'simplified-accounting-p1', '/summary':'simplified-accounting-p2', '/p2':'simplified-accounting-p2',
    '/p3':'simplified-accounting-p3-7', '/p4':'simplified-accounting-p3-7', '/p5':'simplified-accounting-p3-7',
    '/p6':'simplified-accounting-p3-7', '/p7':'simplified-accounting-p3-7',
    '/print':'preview',
  },
  annual:{
    '/':'annual-accounting-p1', '/summary':'annual-accounting-p67', '/p2':'annual-accounting-p2',
    '/p3':'annual-accounting-p345', '/p4':'annual-accounting-p345', '/p5':'annual-accounting-p345',
    '/scha':'annual-accounting-schedules', '/schb1':'annual-accounting-schedules', '/schb2':'annual-accounting-schedules',
    '/schb3':'annual-accounting-schedules', '/schb4':'annual-accounting-schedules', '/schc':'annual-accounting-schedules',
    '/schd1':'annual-accounting-schedules', '/schd2':'annual-accounting-schedules', '/schd3':'annual-accounting-schedules',
    '/schd4':'annual-accounting-schedules', '/schd5':'annual-accounting-schedules', '/sche':'annual-accounting-schedules',
    '/schf1':'annual-accounting-schedules', '/schf2':'annual-accounting-schedules',
    '/p67':'annual-accounting-p67',
    '/p8':'annual-accounting-p8-11', '/p9':'annual-accounting-p8-11', '/p10':'annual-accounting-p8-11', '/p11':'annual-accounting-p8-11',
    '/print':'preview',
  },
  planSimplified:{default:'simplified-plan', '/print':'preview'},
  planAnnual:{default:'annual-plan', '/print':'preview'},
  planInitial:{default:'initial-plan', '/print':'preview'},
  planMinor:{default:'minor-plan', '/print':'preview'},
};

function userGuideAnchorFor(inventoryType,route){
  let key=inventoryType;
  if(key==='finalAccounting'||key==='trustAccounting')key='annual';
  const map=USER_GUIDE_ANCHORS[key];
  if(!map)return null;
  return map[route]||map.default||null;
}

/** Opens the standalone user manual in a new tab, optionally to one anchor. */
function openUserGuide(anchor){
  const url=anchor?`${USER_GUIDE_URL}#${anchor}`:USER_GUIDE_URL;
  window.open(url,'_blank','noopener');
}
window.openUserGuide=openUserGuide;

/** "?" while a filing is open: skip the Help panel, jump straight to the
 * manual page for wherever the filer actually is. */
function openUserGuideForCurrentPage(){
  const route=window.location.hash.replace('#','')||currentPage||'/';
  openUserGuide(userGuideAnchorFor(activeInventoryType,route));
}
window.openUserGuideForCurrentPage=openUserGuideForCurrentPage;

// ═══════════════════════════════════════════════════════
// TOOLTIP SYSTEM
// ═══════════════════════════════════════════════════════
const TOOLTIPS = {
  // Milestone 51C removed a 'ward_percent' key here. It was never read -- all six
  // call sites pass 'ward_pct' (see below) -- and it carried slightly different
  // wording, including a worked example the live key lacks. Deleted as-is on
  // purpose: improving 'ward_pct's wording is a user-facing content change, not
  // a cleanup, and belongs in its own commit with the text reviewed.
  'restricted': "Assets that cannot be used without court permission, such as real estate that must be sold through a court approval process.",
  'carrying_value': "The depreciated value of an asset for accounting purposes. This may differ from current market value.",
  'personal_residence': "The primary home where the ward currently lives. This is reported separately from investment properties.",
  'income_property': "A property that generates rental income or other returns. Mark this if the property is held for income purposes.",
  'depository': "A bank or financial institution where the ward's money is held. For simplified accounting, ALL estate property must be in a designated depository.",
  'ssn_ein': "SSN: Social Security Number (for individuals). EIN: Employer Identification Number (for businesses, trusts, or entities).",
  'signature_date': "The date this document was signed. Must be within the accounting period or filing timeframe.",
  'inception_date': "The date when the guardianship was officially established by court order.",
  // Milestone 51C deleted an unused 'ward_percent' key whose wording carried a
  // worked example this one lacked. Per Alan, that fuller wording is adopted here
  // -- the example shows the expected format to a pro se filer who has never
  // entered a percentage on a court form. This is the key all six call sites
  // actually pass (annual-accounting/index.js, Schedules D-1..D-5 and Part VIII).
  'ward_pct': "The percentage of this asset that belongs to the ward. For example, if the ward owns 50% of a property, enter 50.",
  'case_number': "The case number from the court order appointing you as guardian. Found on the letters of guardianship.",
  'full_amount': "The total value of this asset before accounting for the ward's percentage.",
  'full_debt': "The total amount owed on this liability.",
  'full_value': "The current market value of this property.",
  'annualized_income': "If income is not for the full year, annualize it. For example, 6 months of $100/month = $200 annualized."
};

function tooltip(key){
  const text=TOOLTIPS[key]||'';
  if(!text)return '';
  return `<span class="tooltip-icon" title="${esc(text)}">?<div class="tooltip-popup">${esc(text)}</div></span>`;
}

// ═══════════════════════════════════════════════════════
// WALKTHROUGH SYSTEM (Phase 4) - Type-Specific Tours
// ═══════════════════════════════════════════════════════
const WALKTHROUGH_GUARDIAN=[
  {element:'#help-toggle-btn',title:'1. Help',text:'Open Help for field guidance, the User Guide, backup controls, shared records, the Activity Log, and the guided tour.',position:'left'},
  {element:'.ward-picker-select',title:'2. Active Filing',text:'Switch between filings here. Each filing is stored in the case file and keeps its own progress.',position:'right'},
  {element:'#theme-toggle-btn',title:'3. Appearance',text:'Use the sun/moon button to switch light or dark mode. This display preference is remembered on this device.',position:'left'},
  {element:'.ward-progress',title:'4. Filing Progress',text:'The progress indicator updates as you work. Use “Jump to…” to open an incomplete section; review the readiness panel before exporting.',position:'right'},
  {element:'[data-page="/"]',title:'5. Cover',text:'Enter the case and guardian information shown on the filing. The sidebar then takes you through the inventory schedules, preparer and attorney sections, bond information, and Certificate of Service.',position:'bottom'},
  {element:'[data-nav="b1"]',title:'6. Inventory schedules',text:'Complete the schedules that apply to this filing. Add rows when needed, and review the calculated totals after entering values.',position:'right'},
  {element:'[data-nav="d5"]',title:'7. Certificate of Service',text:'Review the recipients and attestation in the Certificate of Service section. The app can check entered fields, but it cannot determine whom you must serve.',position:'bottom'},
  {element:'[data-page="/print"]',title:'8. Print Preview',text:'Print Preview lists missing items and readiness reminders. Review the filing, then export the available PDF or Excel output; save a .sav backup separately.',position:'left'},
];

const WALKTHROUGH_SIMPLIFIED=[
  {element:'#help-toggle-btn',title:'1. Help',text:'Open Help for Simplified Annual Accounting guidance, backups, the Activity Log, and the User Guide.',position:'left'},
  {element:'.ward-picker-select',title:'2. Active Filing',text:'Switch between filings here. Your case file keeps each filing separate.',position:'right'},
  {element:'#theme-toggle-btn',title:'3. Appearance',text:'Switch light or dark mode with the sun/moon button; the preference stays on this device.',position:'left'},
  {element:'.ward-progress',title:'4. Filing Progress',text:'Use the progress indicator and “Jump to…” to find incomplete sections, then check Print Preview readiness.',position:'right'},
  {element:'[data-page="/"]',title:'5. Cover',text:'Enter the case information for this accounting period.',position:'bottom'},
  {element:'[data-page="/p2"]',title:'6. Accounting Summary',text:'Enter the balances, income, expenses, and other fields shown on this page. Review the calculated result before signing.',position:'bottom'},
  {element:'[data-page="/p3"]',title:'7. Signatures',text:'Complete the signature section for the people shown in the filing. Do not treat the tour as legal advice.',position:'bottom'},
  {element:'[data-page="/print"]',title:'8. Print Preview',text:'Review missing items and readiness reminders, then export the PDF. Simplified Annual Accounting does not offer Excel output.',position:'left'},
];

// Annual, Final, and Trust Accounting share the same schedule workspace.
const WALKTHROUGH_ANNUAL=[
  {element:'#help-toggle-btn',title:'1. Help',text:'Open Help for Annual, Final, or Trust Accounting guidance, backups, the Activity Log, and the User Guide.',position:'left'},
  {element:'.ward-picker-select',title:'2. Active Filing',text:'Switch between filings here. Annual, Final, and Trust Accounting use the same accounting workspace with their own filing record.',position:'right'},
  {element:'#theme-toggle-btn',title:'3. Appearance',text:'Switch light or dark mode with the sun/moon button; the preference stays on this device.',position:'left'},
  {element:'.ward-progress',title:'4. Filing Progress',text:'Use the progress indicator and “Jump to…” to find incomplete sections. A schedule prompt is a navigation aid; Print Preview is where export readiness is checked.',position:'right'},
  {element:'[data-page="/"]',title:'5. Cover',text:'Enter the case and accounting-period information shown on this filing.',position:'bottom'},
  {element:'[data-page="/p2"]',title:'6. Certification',text:'Review the certification information shown on this page before continuing.',position:'bottom'},
  {element:'[data-nav="a-scha"]',title:'7. Accounting schedules',text:'Work through the schedules in the sidebar: income, disbursements, capital adjustments, assets and liabilities, transfers, and sales. The exact fields depend on the filing.',position:'right'},
  {element:'[data-page="/p3"]',title:'8. Signatures',text:'Complete the signature section and review the Certificate of Service fields in the filing. The app records entered information; it does not determine service obligations.',position:'bottom'},
  {element:'[data-page="/print"]',title:'9. Print Preview',text:'Review missing items, readiness reminders, totals, and the rendered filing, then export the available PDF or Excel output.',position:'left'},
];

const WALKTHROUGH_PLAN_SIMPLIFIED=[
  {element:'#help-toggle-btn',title:'1. Help',text:'Open Help for this plan, backups, the Activity Log, and the User Guide.',position:'left'},
  {element:'.ward-picker-select',title:'2. Active Filing',text:'Switch between filings here. A Plan records information about the ward as a person; an Accounting records money and property.',position:'right'},
  {element:'#theme-toggle-btn',title:'3. Appearance',text:'Switch light or dark mode with the sun/moon button; the preference stays on this device.',position:'left'},
  {element:'.ward-progress',title:'4. Filing Progress',text:'Use the progress indicator and “Jump to…” to find unanswered sections.',position:'right'},
  {element:'[data-page="/"]',title:'5. Cover',text:'Enter the case and reporting-period information shown on this plan.',position:'bottom'},
  {element:'[data-page="/p2"]',title:'6. Plan pages',text:'Complete the questions and records presented by this plan. Add rows where the page provides an Add control.',position:'bottom'},
  {element:'[data-page="/p3"]',title:'7. Signatures',text:'Review the signature and contact fields shown on the filing.',position:'bottom'},
  {element:'[data-page="/print"]',title:'8. Print Preview',text:'Review missing items and readiness reminders, then export the PDF. This plan has no Excel output.',position:'left'},
];

const WALKTHROUGH_PLAN_ANNUAL=[
  {element:'#help-toggle-btn',title:'1. Help',text:'Open Help for this plan, backups, the Activity Log, and the User Guide.',position:'left'},
  {element:'.ward-picker-select',title:'2. Active Filing',text:'Switch between filings here. A Plan records the ward\'s residence, care, and wellbeing.',position:'right'},
  {element:'#theme-toggle-btn',title:'3. Appearance',text:'Switch light or dark mode with the sun/moon button; the preference stays on this device.',position:'left'},
  {element:'.ward-progress',title:'4. Filing Progress',text:'Use the progress indicator and “Jump to…” to find unfinished sections.',position:'right'},
  {element:'[data-page="/"]',title:'5. Cover',text:'Enter the case, reporting-period, and current-residence information shown on this plan.',position:'bottom'},
  {element:'[data-page="/p2"]',title:'6. Residence and care',text:'Complete the residence, care, treatment, skills, rights, and daily-living pages presented by the plan.',position:'right'},
  {element:'[data-page="/p11"]',title:'7. Signatures',text:'Review the guardian and attorney fields shown on the filing.',position:'right'},
  {element:'[data-page="/print"]',title:'8. Print Preview',text:'Review missing items and readiness reminders, then export the PDF. This plan has no Excel output.',position:'left'},
];

const WALKTHROUGH_PLAN_INITIAL=[
  {element:'#help-toggle-btn',title:'1. Help',text:'Open Help for this plan, backups, the Activity Log, and the User Guide.',position:'left'},
  {element:'.ward-picker-select',title:'2. Active Filing',text:'Switch between filings here. Each filing remains separate in the case file.',position:'right'},
  {element:'#theme-toggle-btn',title:'3. Appearance',text:'Switch light or dark mode with the sun/moon button; the preference stays on this device.',position:'left'},
  {element:'.ward-progress',title:'4. Filing Progress',text:'Use the progress indicator and “Jump to…” to find unfinished sections.',position:'right'},
  {element:'[data-page="/"]',title:'5. Cover',text:'Enter the case and guardianship information shown on this initial plan.',position:'bottom'},
  {element:'[data-page="/p2"]',title:'6. Plan pages',text:'Complete the residential setting, care, provider, daily-living, and advance-directive pages presented by the plan.',position:'right'},
  {element:'[data-page="/p9"]',title:'7. Signatures',text:'Review the guardian signature and contact fields shown on the filing.',position:'right'},
  {element:'[data-page="/print"]',title:'8. Print Preview',text:'Review missing items and readiness reminders, then export the PDF. This plan has no Excel output.',position:'left'},
];

const WALKTHROUGH_PLAN_MINOR=[
  {element:'#help-toggle-btn',title:'1. Help',text:'Open Help for this plan, backups, the Activity Log, and the User Guide.',position:'left'},
  {element:'.ward-picker-select',title:'2. Active Filing',text:'Switch between filings here. Each filing remains separate in the case file.',position:'right'},
  {element:'#theme-toggle-btn',title:'3. Appearance',text:'Switch light or dark mode with the sun/moon button; the preference stays on this device.',position:'left'},
  {element:'.ward-progress',title:'4. Filing Progress',text:'Use the progress indicator and “Jump to…” to find unfinished sections.',position:'right'},
  {element:'[data-page="/"]',title:'5. Cover',text:'Enter the UCN, case number, reporting period, and other fields shown on this minor filing.',position:'bottom'},
  {element:'[data-page="/p3"]',title:'6. Treatment providers',text:'Complete the provider records presented by the plan, adding rows where needed.',position:'right'},
  {element:'[data-page="/p6"]',title:'7. Signatures',text:'Review the guardian signature fields shown on the filing.',position:'right'},
  {element:'[data-page="/p7"]',title:'8. Preparer and attorney',text:'Complete the preparer and attorney fields shown on this filing.',position:'right'},
  {element:'[data-page="/print"]',title:'9. Print Preview',text:'Review missing items and readiness reminders, then export the PDF. This plan has no Excel output.',position:'left'},
];

const WALKTHROUGH_DASHBOARD=[
  {element:'#help-toggle-btn',title:'1. Help & Guidance',text:'Click "?" for in-app help, the User Guide, Activity Log, shared party records, backup controls, and the guided tour.',position:'left'},
  {element:'#new-ward-btn, [data-dashboard-action="add-ward"]',title:'2. Create New Filing',text:'Choose a current filing type: Initial Inventory, Simplified Annual Accounting, Annual Accounting, Final Accounting, Trust Accounting, Simplified Annual Plan, Annual Guardianship Plan, Initial Guardianship Plan, or Annual Plan — Minors. Starting a new case also asks how to protect the case data.',position:'bottom'},
  {element:'.dashboard-summary-strip',title:'3. Status Overview',text:'Tracks urgent action items and approaching deadlines across all active wards.',position:'bottom'},
  {element:'#dashboard-search',title:'4. Search & Filter',text:'Quickly locate any filing by ward name, case number, or contact details.',position:'bottom'},
  {element:'#theme-toggle-btn',title:'5. Light & Dark Appearance',text:'Switch between light and dark mode here. Your preference is remembered across sessions on this device.',position:'left'},
  {element:'.dashboard-triage-queue, .dashboard-empty',title:'6. All Filings Queue',text:'Resume, edit, close, or find filings from one place. The case file is a local .sav file: use Save Backup (.sav) and Open Backup (.sav) to move or restore it. Automatic saving depends on the browser and an authorized file; keep manual backups.',position:'top'},
];

let WALKTHROUGH_STEPS=[];
let currentWalkthroughStep=0;
let walkthroughActive=false;
let _walkthroughAutoTriggered=false;

function startWalkthrough(){
  if(helpPanelOpen)toggleHelpPanel();
  walkthroughActive=true;
  currentWalkthroughStep=0;
  if(activeInventoryType==='guardian')WALKTHROUGH_STEPS=WALKTHROUGH_GUARDIAN;
  else if(activeInventoryType==='simplified')WALKTHROUGH_STEPS=WALKTHROUGH_SIMPLIFIED;
  else if(formEngine(activeInventoryType)==='annual')WALKTHROUGH_STEPS=WALKTHROUGH_ANNUAL;
  else if(activeInventoryType==='planSimplified')WALKTHROUGH_STEPS=WALKTHROUGH_PLAN_SIMPLIFIED;
  else if(activeInventoryType==='planAnnual')WALKTHROUGH_STEPS=WALKTHROUGH_PLAN_ANNUAL;
  else if(activeInventoryType==='planInitial')WALKTHROUGH_STEPS=WALKTHROUGH_PLAN_INITIAL;
  else if(activeInventoryType==='planMinor')WALKTHROUGH_STEPS=WALKTHROUGH_PLAN_MINOR;
  else WALKTHROUGH_STEPS=WALKTHROUGH_DASHBOARD;
  document.getElementById('walkthrough-overlay').classList.add('active');
  showWalkthroughStep();
}

function showWalkthroughStep(){
  if(currentWalkthroughStep>=WALKTHROUGH_STEPS.length){
    endWalkthrough();
    return;
  }
  const step=WALKTHROUGH_STEPS[currentWalkthroughStep];
  const sidebarTarget=step.element.startsWith('[data-page')||step.element.startsWith('[data-nav');
  const el=document.querySelector(sidebarTarget?`#sidebar ${step.element}`:step.element);
  if(!el){currentWalkthroughStep++;showWalkthroughStep();return;}

  // Scroll element into view, centered
  el.scrollIntoView({behavior:'smooth',block:'center'});

  // Re-get rect after scroll
  setTimeout(()=>{
    const rect=el.getBoundingClientRect();
    const tooltip=document.getElementById('walkthrough-tooltip');
    const overlay=document.getElementById('walkthrough-overlay');
    if(!overlay.querySelector('.walkthrough-highlight')){
      const highlight=document.createElement('div');
      highlight.className='walkthrough-highlight';
      overlay.appendChild(highlight);
    }
    const highlight=overlay.querySelector('.walkthrough-highlight');
    highlight.style.left=(rect.left-6)+'px';
    highlight.style.top=(rect.top-6)+'px';
    highlight.style.width=(rect.width+12)+'px';
    highlight.style.height=(rect.height+12)+'px';

    // Update progress
    const progress=currentWalkthroughStep+1;
    const total=WALKTHROUGH_STEPS.length;
    const progressPct=(progress/total)*100;
    document.getElementById('walkthrough-title').textContent=step.title;
    document.getElementById('walkthrough-text').textContent=step.text;
    document.getElementById('walkthrough-progress').textContent=`${progress}/${total}`;
    const progressBar=document.querySelector('#walkthrough-progress-bar div');
    if(progressBar)progressBar.style.width=progressPct+'%';

    tooltip.style.display='block';
    // Shrinks on narrow screens so the tooltip never exceeds the viewport —
    // matches the CSS max-width:calc(100vw - 32px) on .walkthrough-tooltip.
    const tooltipW=Math.min(360,window.innerWidth-2*20), tooltipH=200, pad=20, gap=25;
    // Only reserve room for the sidebar where it's actually taking up
    // screen space. Below the mobile breakpoint the sidebar is an
    // off-canvas drawer (closed by default) reporting itself off-screen, so
    // this naturally collapses to 0 there instead of forcing the tooltip
    // past the right edge of a narrow viewport.
    const sidebarRectNow=document.getElementById('sidebar').getBoundingClientRect();
    const sidebarW=Math.max(0,Math.min(sidebarRectNow.right,window.innerWidth-tooltipW-pad));

    // Prefer right positioning (away from sidebar), then bottom, top, left
    const positions=[
      {name:'right',top:rect.top-tooltipH/2+rect.height/2,left:rect.right+gap},
      {name:'bottom',top:rect.bottom+gap,left:rect.left-tooltipW/2+rect.width/2},
      {name:'top',top:rect.top-tooltipH-gap,left:rect.left-tooltipW/2+rect.width/2},
      {name:'left',top:rect.top-tooltipH/2+rect.height/2,left:rect.left-tooltipW-gap}
    ];

    let best=positions[0];
    for(const pos of positions){
      const clampedLeft=Math.max(pad, Math.min(pos.left, window.innerWidth-tooltipW-pad));
      const clampedTop=Math.max(pad, Math.min(pos.top, window.innerHeight-tooltipH-pad));

      // Check if tooltip would overlap with sidebar or highlighted element
      const tooltipRect={left:clampedLeft,top:clampedTop,right:clampedLeft+tooltipW,bottom:clampedTop+tooltipH};
      const elemRect={left:rect.left,top:rect.top,right:rect.right,bottom:rect.bottom};
      const sidebarRect={left:0,top:0,right:sidebarW,bottom:window.innerHeight};

      // Check collision with element and sidebar
      const overlapElement=!(tooltipRect.right<elemRect.left||tooltipRect.left>elemRect.right||tooltipRect.bottom<elemRect.top||tooltipRect.top>elemRect.bottom);
      const overlapSidebar=!(tooltipRect.right<sidebarRect.left||tooltipRect.left>sidebarRect.right||tooltipRect.bottom<sidebarRect.top||tooltipRect.top>sidebarRect.bottom);

      if(!overlapElement && !overlapSidebar){
        best=pos;
        break;
      }
    }

    let top=Math.max(pad, Math.min(best.top, window.innerHeight-tooltipH-pad));
    // minLeft is capped at the same maxLeft used below so the two can never
    // cross — on a screen too narrow to both clear the sidebar AND fit the
    // tooltip, fitting inside the viewport wins over clearing the sidebar.
    const maxLeft=window.innerWidth-tooltipW-pad;
    const minLeft=Math.min(sidebarW+pad,maxLeft);
    let left=Math.max(minLeft, Math.min(best.left, maxLeft));
    tooltip.style.top=top+'px';
    tooltip.style.left=left+'px';
  },300);
}

function nextWalkthroughStep(){currentWalkthroughStep++;showWalkthroughStep();}
function skipWalkthrough(){endWalkthrough();}
function endWalkthrough(){
  walkthroughActive=false;
  document.getElementById('walkthrough-overlay').classList.remove('active');
  document.getElementById('walkthrough-tooltip').style.display='none';
  if(_walkthroughAutoTriggered)saveAppState('walkthroughCompleted','true');
}

let activeInventoryType = null;
window.D = {}; // Current active ward's data
let _saveTimer = null;
let currentPage = '/';
try {
  Object.defineProperty(window, '_saveTimer', {
    get: () => _saveTimer,
    set: (v) => { _saveTimer = v; },
    configurable: true
  });
  Object.defineProperty(window, 'activeInventoryType', {
    get: () => activeInventoryType,
    set: (v) => { activeInventoryType = v; },
    configurable: true
  });
  Object.defineProperty(window, 'currentPage', {
    get: () => currentPage,
    set: (v) => { currentPage = v; },
    configurable: true
  });
} catch (_) {}
// A bare top-level `let`, like activeInventoryType above, isn't reachable
// from an ES module (see src/core/state.js's file header) -- this tiny
// accessor (a function declaration, so it's a real window property) is
// what the Simplified Accounting feature module reaches for after an Excel
// import, to re-render whichever page was already open.
function getCurrentPage(){return currentPage;}
let _dirtySinceExport = false; // true once data changes after the last .sav export
// These two are NOT leftover duplicates of case-file.js's module state: they
// are the window-backed shared store that case-file.js reads and writes
// through (window._autoExportIntervalMinutes, window._lastExportAt, via the
// accessors below), and loadCaseFileFromZip() below still writes them when a
// .sav is opened. The timers that used to live here alongside them are gone
// with the duplicate implementations that owned them.
let _autoExportIntervalMinutes = 10; // 0 means Off; loaded from/saved to appState
let _lastExportAt = null; // ms epoch of last successful export, or null if never
try {
  Object.defineProperty(window, '_dirtySinceExport', {
    get: () => _dirtySinceExport,
    set: (v) => { _dirtySinceExport = v; },
    configurable: true
  });
  Object.defineProperty(window, '_lastExportAt', {
    get: () => _lastExportAt,
    set: (v) => { _lastExportAt = v; },
    configurable: true
  });
  Object.defineProperty(window, '_autoExportIntervalMinutes', {
    get: () => _autoExportIntervalMinutes,
    set: (v) => { _autoExportIntervalMinutes = v; },
    configurable: true
  });
} catch (_) {}
window.PG_APP_VERSION = '1.5.30';

// ═══════════════════════════════════════════════════════
// STORAGE STRATEGY — canonical .sav file plus temporary recovery
// ═══════════════════════════════════════════════════════
//
// Live case data is held in caseFile and the containers below. A .sav
// file is the authoritative durable record and receives full-state writes.
//
// Browser storage has two current, limited uses:
//   - pg-session-cache holds a temporary full-state recovery snapshot while
//     changes are unsaved. It uses the case's encrypted-or-plain mode and is
//     cleared after a successful .sav save.
//   - pg-launch-pref holds a has-opened flag and, where supported, the last
//     FileSystemFileHandle. It never stores the file's contents.
//
// The Tauri build also maintains an encrypted best-effort file backup.
// ═══════════════════════════════════════════════════════

let _appState = {};        // key -> value; replaces the old `appState` IDB store
let _templateCache = {};   // type -> base64; replaces the old `templates` IDB store
let _auditLogEntries = []; // {id, timestamp, eventType, details, success}; replaces `auditLog`
let _auditLogNextId = 1;
try {
  Object.defineProperty(window, '_appState', {
    get: () => _appState,
    set: (v) => { _appState = v; },
    configurable: true
  });
  Object.defineProperty(window, '_templateCache', {
    get: () => _templateCache,
    set: (v) => { _templateCache = v; },
    configurable: true
  });
  Object.defineProperty(window, '_auditLogEntries', {
    get: () => _auditLogEntries,
    set: (v) => { _auditLogEntries = v; },
    configurable: true
  });
} catch (_) {}

// ═══════════════════════════════════════════════════════
// COMMON HELPERS
// ═══════════════════════════════════════════════════════
// Milestone 70, 70B: the pure helpers that used to be defined here live in ES
// modules now -- icons in src/core/ui/icons.js; esc() in
// src/core/filing/escape-html.js; fmt() and formatDashboardCurrency() in
// src/core/format/money.js; field formatting and filters in
// src/core/form/form-contract.js; injection checks and import hardening in
// src/core/security/input-hardening.js; guardianHasAnyData() in
// src/core/validation/row-started.js; FL_COUNTIES in src/core/pdf/circuit-lookup.js;
// formatDisplayDate() in src/core/form/date-parser.js; calcTotals() in
// src/features/simplified-accounting/totals.js. Those this script still calls
// keep a one-line wrapper that delegates through src/legacy-bridge.js
// (a classic script cannot import). A wrapper goes when its last caller here
// moves out; never put logic back in one.
function ic(n,size){return window.GuardianFormsLegacyBridge.ic(n,size);}
function esc(s){return window.GuardianFormsLegacyBridge.esc(s);}
function validateImportFile(file,kind){return window.GuardianFormsLegacyBridge.validateImportFile(file,kind);}
function sanitizeObjectData(obj){return window.GuardianFormsLegacyBridge.sanitizeObjectData(obj);}
function formatDashboardCurrency(v){return window.GuardianFormsLegacyBridge.formatDashboardCurrency(v);}
function calcTotals(){return window.GuardianFormsLegacyBridge.calcTotals();}
// Milestone 70, 70C: the filing registry and per-engine models -- names,
// engines, blank filings and rows, the page lists and the normalizer -- live in
// src/core/filing/filing-registry.js and src/core/filing/models/ now; the lists
// this script still reads are bridge reads where it reads them.
function formEngine(type){return window.GuardianFormsLegacyBridge.formEngine(type);}
function initializeEmptyData(type){return window.GuardianFormsLegacyBridge.initializeEmptyData(type);}
function typeIcon(type,size){return window.GuardianFormsLegacyBridge.typeIcon(type,size);}




// Update an input field with formatted phone, keeping user experience smooth
// Highlight form fields that have validation errors with red borders
// ═══════════════════════════════════════════════════════
// VALIDATION SUMMARY
// Every message from validate() reads "<Section> — <Field>", so it can be
// grouped instead of listed flat. Section prefixes map to wizard routes
// ("Cover"→/, "B-1 row 3"→/b1, "Part IV"→/p4, "Sch D2"→/schd2), which is
// what lets each group offer a jump link.
// ═══════════════════════════════════════════════════════


// ═══════════════════════════════════════════════════════
// PRINT-PREVIEW PAGER
// Shows one filing page at a time instead of a continuous scroll of all of
// them. Purely a viewing filter: exports and printing always operate on the
// complete set (see the !important rules under @media print and
// .pdf-export-mode, plus pvShowAll() called before every export).
// Labels are read back out of each page's own court header, so this works
// for all three inventory types without touching the three builders.
// ═══════════════════════════════════════════════════════
 // '1'-based page number, or 'all'





// ═══════════════════════════════════════════════════════
// SECURITY: VALIDATION AND AUDIT LOGGING
// ═══════════════════════════════════════════════════════

async function auditLog(eventType, details, success = true, wardId = null) {
  // Recorded in the in-memory _auditLogEntries used for .sav packaging and the
  // in-app activity viewer. This used to try a Tauri `audit_log` command first
  // and fall back to here; that branch could never run in either shipped build.
  try {
    const entry = {timestamp: new Date().toISOString(), eventType, details, success};
    if (wardId) entry.wardId = wardId;
    await appendAuditLogEntry(entry);
  } catch (e) {
    console.warn('Audit log fallback failed:', e);
  }
}
window.auditLog = auditLog;

// Strict input validation rules — rejects invalid inputs before save
// Validate date range: ensure from <= to
// ═══════════════════════════════════════════════════════
// ENCRYPTION AT REST (AES-256-GCM via the Web Crypto API)
// ═══════════════════════════════════════════════════════
// Every ward, and the guardian's own name/email, are encrypted before they
// touch disk — the .sav file only ever sees ciphertext. The AES key is derived from a user-chosen master
// password via PBKDF2 and lives ONLY in memory for the session (`_cryptoKey`
// below); it is never written anywhere by default. Closing the app or
// clicking "Lock" forgets it, so the password must be re-entered next time.
//
// There is no recovery path if the password is lost — that is the deliberate
// design. (An opt-in OS-credential-store escape hatch existed here for a
// Tauri desktop build that was never part of this repo; it is gone.)
const PBKDF2_ITERATIONS=210000;
const CRYPTO_VERIFIER_PLAINTEXT='PG_VERIFIER_V1';
let _cryptoKey=null; // CryptoKey, set after unlock/create, cleared on lock
try {
  Object.defineProperty(window, '_cryptoKey', {
    get: () => _cryptoKey,
    set: (v) => { _cryptoKey = v; },
    configurable: true
  });
} catch (_) {}


// Whether this install encrypts data at all — chosen once, at first setup,
// via promptChooseSecurityMode(). 'encrypted' (default/recommended) uses
// AES-256-GCM as below; 'none' stores plain JSON with no password gate.
// Loaded from appState at startup; see ensureUnlocked().
let _securityMode='encrypted'; // 'encrypted' | 'none'
try {
  Object.defineProperty(window, '_securityMode', {
    get: () => _securityMode,
    set: (v) => { _securityMode = v; },
    configurable: true
  });
} catch (_) {}
const PLAIN_MODE_PREFIX='PLAIN:'; // self-describing tag, never produced by the
// iv:ciphertext base64 format below, so decrypt can tell the two apart
// unambiguously even if an archive mixes entries from both modes.


// Decides whether the user needs to create a master password (fresh install,
// or an existing pre-encryption install with plaintext wards) or unlock with
// one that's already set up, then blocks until a valid key is in memory.
async function ensureUnlocked(){
  if(!window.crypto||!window.crypto.subtle){
    document.getElementById('main-content').innerHTML=
      '<div style="max-width:520px;margin:3rem auto;text-align:center;color:var(--danger-text);">'
      +'<h2>Secure context required</h2>'
      +'<p>Encryption requires a secure context. Open this file directly (double-click '
      +'<code>index.html</code>) in Chrome or Edge, or serve it via <code>localhost</code> '
      +'(not a LAN IP) — a network address like <code>192.168.x.x</code> does not qualify.</p></div>';
    document.getElementById('sidebar').style.display='none';
    throw new Error('window.crypto.subtle unavailable (insecure context)');
  }
  // promptOpenOrStartAtLaunch() already ran by this point. If the user
  // opened an existing case file, loadCaseFileAtLaunch() already asked for
  // (and verified) its password — _launchStateResolved says so, and this
  // is skipped entirely rather than asking a second time. If they started
  // a new case instead, nothing was resolved and this proceeds exactly as
  // it always has for a fresh install.
  if(_launchStateResolved){
    _launchStateResolved=false; // consume once — a later lockApp() must go through the normal flow below
    updateLockButtonVisibility();
    resetAutoLockTimer();
    return;
  }
  const storedMode=await loadAppState('securityMode');
  const salt=await loadAppState('cryptoSalt');
  const verifier=await loadAppState('cryptoVerifier');

  if(!storedMode&&!(salt&&verifier)){
    // No mode has been selected. A ward can already be present only when an
    // older .sav file omitted securityMode; otherwise this is a new case.
    _securityMode=await promptChooseSecurityMode();
    await saveAppState('securityMode',_securityMode); // stored in the
    // clear, like cryptoSalt — must be readable before any password exists
    if(_securityMode==='none'){
      updateLockButtonVisibility();
      return; // no password, no encryption key, nothing further to do
    }
    await promptCreatePassword(caseFile.wards.length>0);
    updateLockButtonVisibility();
    return;
  }

  // Mode already chosen previously — or this is a pre-existing encrypted
  // install from before this feature existed (salt+verifier present with no
  // explicit mode saved yet): treat that case as 'encrypted' for backward
  // compatibility rather than re-asking.
  _securityMode=storedMode||(salt&&verifier?'encrypted':'none');
  updateLockButtonVisibility();

  if(_securityMode==='none')return; // no password gate at all

  if(salt&&verifier){
    // A silent auto-unlock path used to sit here, reading the master password
    // back from the OS credential store through Tauri. No Tauri shell exists
    // in this repo, so it could never fire; the password is always entered.
    await promptUnlock(salt,verifier);
    return;
  }
  await promptCreatePassword(caseFile.wards.length>0);
}

let _securityChoiceResolve=null;
function promptChooseSecurityMode(){
  return new Promise((resolve)=>{
    _securityChoiceResolve=resolve;
    document.getElementById('security-choice-overlay').classList.add('show');
  });
}
function selectSecurityMode(mode){
  document.getElementById('security-choice-overlay').classList.remove('show');
  const resolve=_securityChoiceResolve;_securityChoiceResolve=null;
  if(resolve)resolve(mode);
}

// The Lock button is meaningless with no password to re-enter — hide it in
// 'none' mode so users can't confuse themselves clicking it.
function updateLockButtonVisibility(){
  const btn=document.getElementById('lock-app-btn');
  if(btn)btn.style.display=_securityMode==='none'?'none':'';
}

let _unlockResolve=null;
let _unlockMode=null; // 'create' | 'unlock'

async function promptUnlock(saltB64,verifierPacked){
  return new Promise((resolve)=>{
    _unlockMode='unlock';
    _unlockResolve=resolve;
    const overlay=document.getElementById('unlock-overlay');
    document.getElementById('unlock-title').textContent='Unlock Guardian Forms';
    document.getElementById('unlock-subtitle').textContent='Enter your master password to decrypt your case data.';
    document.getElementById('unlock-confirm-row').style.display='none';
    document.getElementById('unlock-password').value='';
    document.getElementById('unlock-error').style.display='none';
    overlay.dataset.salt=saltB64;
    overlay.dataset.verifier=verifierPacked;
    overlay.classList.add('show');
    document.getElementById('unlock-password').focus();
  });
}

// Same overlay, a different question: not "unlock THIS device's data" but
// "what's the password for the file you just picked". Kept separate from
// promptUnlock() rather than reusing its verifier-equality check, because a
// version-1 .sav file has no dedicated verifier field to compare
// against — see deriveAndVerifyKey(), which this delegates the actual
// check to via the 'openFile' branch of submitUnlockForm(): this password
// belongs to the file, not necessarily to this device's own install.
let _pendingOpenManifest=null,_pendingOpenZip=null;
function promptPasswordForFile(manifest,zip){
  return new Promise((resolve)=>{
    _unlockMode='openFile';
    _unlockResolve=resolve;
    _pendingOpenManifest=manifest;
    _pendingOpenZip=zip;
    // This can fire while #startup-choice-overlay is still up (its own
    // z-index is higher, since it's normally hidden by the time any later
    // overlay shows) -- opening a file is the one path where that hasn't
    // happened yet, since _resolveStartupChoice() only runs once
    // loadCaseFileAtLaunch() fully succeeds, i.e. after this password is
    // entered. Left showing, it would sit on top and silently swallow every
    // click meant for the password field below. Hiding it here is safe: this
    // flow has no "go back" from an in-progress file open.
    document.getElementById('startup-choice-overlay').classList.remove('show');
    const overlay=document.getElementById('unlock-overlay');
    document.getElementById('unlock-title').textContent='Enter Password';
    document.getElementById('unlock-subtitle').textContent='This case file is encrypted. Enter the master password it was saved under.';
    document.getElementById('unlock-confirm-row').style.display='none';
    document.getElementById('unlock-password').value='';
    document.getElementById('unlock-error').style.display='none';
    overlay.dataset.salt=manifest.salt||'';
    overlay.classList.add('show');
    document.getElementById('unlock-password').focus();
  });
}

function promptCreatePassword(hasExistingData){
  return new Promise((resolve)=>{
    _unlockMode='create';
    _unlockResolve=resolve;
    const overlay=document.getElementById('unlock-overlay');
    document.getElementById('unlock-title').textContent=hasExistingData?'Secure Your Existing Data':'Create a Master Password';
    document.getElementById('unlock-subtitle').textContent=hasExistingData
      ?'This app now encrypts case data at rest. Choose a master password — your existing wards will be encrypted with it.'
      :'Choose a master password to encrypt all case data stored on this device.';
    document.getElementById('unlock-confirm-row').style.display='block';
    document.getElementById('unlock-password').value='';
    document.getElementById('unlock-password-confirm').value='';
    document.getElementById('unlock-error').style.display='none';
    overlay.classList.add('show');
    document.getElementById('unlock-password').focus();
  });
}

function showUnlockError(msg){
  const el=document.getElementById('unlock-error');
  el.textContent=msg;
  el.style.display='block';
}

// Rate-limits guesses at the unlock screen itself. This doesn't stop an
// offline attacker who copies the encrypted files and brute-forces them
// outside the app (PBKDF2's 210k iterations is the only defense against
// that) — it stops someone with physical access to a locked screen from
// just sitting there trying passwords one after another through the UI.
// The counter lives in _appState and is included in the next .sav write or
// temporary recovery snapshot.
const UNLOCK_FAIL_THRESHOLD=5;
const UNLOCK_LOCKOUT_BASE_MS=30*1000;
const UNLOCK_LOCKOUT_MAX_MS=5*60*1000;

async function getUnlockFailState(){
  const state=await loadAppState('unlockFailState');
  return state||{count:0,lockoutUntil:0};
}
async function saveUnlockFailState(state){
  await saveAppState('unlockFailState',state);
}
function formatLockoutRemaining(ms){
  const s=Math.ceil(ms/1000);
  return s>=60?`${Math.ceil(s/60)} minute${s>=120?'s':''}`:`${s} second${s===1?'':'s'}`;
}

async function submitUnlockForm(){
  const btn=document.getElementById('unlock-submit-btn');
  const pw=document.getElementById('unlock-password').value;
  btn.disabled=true;
  try{
    if(_unlockMode==='create'){
      const confirmPw=document.getElementById('unlock-password-confirm').value;
      if(!pw||pw.length<8){showUnlockError('Password must be at least 8 characters.');return;}
      if(pw!==confirmPw){showUnlockError('Passwords do not match.');return;}
      const saltB64=generateSaltB64();
      _cryptoKey=await deriveKeyFromPassword(pw,saltB64);
      const verifier=await encryptJSON(CRYPTO_VERIFIER_PLAINTEXT);
      await saveAppState('cryptoSalt',saltB64);
      await saveAppState('cryptoVerifier',verifier);
      await auditLog('PASSWORD_CREATED', 'Master password created', true);
      resetAutoLockTimer();
      document.getElementById('unlock-overlay').classList.remove('show');
      const resolve=_unlockResolve;_unlockResolve=null;
      resolve();
    }else if(_unlockMode==='unlock'){
      const overlay=document.getElementById('unlock-overlay');
      const saltB64=overlay.dataset.salt;
      const verifierPacked=overlay.dataset.verifier;
      if(!pw){showUnlockError('Please enter your password.');return;}

      const failState=await getUnlockFailState();
      const now=Date.now();
      if(failState.lockoutUntil>now){
        showUnlockError(`Too many incorrect attempts. Try again in ${formatLockoutRemaining(failState.lockoutUntil-now)}.`);
        return;
      }

      try{
        _cryptoKey=await deriveKeyFromPassword(pw,saltB64);
        const decoded=await decryptJSON(verifierPacked);
        if(decoded!==CRYPTO_VERIFIER_PLAINTEXT)throw new Error('verifier mismatch');
      }catch(e){
        _cryptoKey=null;
        const newCount=failState.count+1;
        let lockoutUntil=0;
        await auditLog('UNLOCK_FAILED', `Incorrect password attempt ${newCount}`, false);
        if(newCount>=UNLOCK_FAIL_THRESHOLD){
          const backoffMs=Math.min(UNLOCK_LOCKOUT_BASE_MS*Math.pow(2,newCount-UNLOCK_FAIL_THRESHOLD),UNLOCK_LOCKOUT_MAX_MS);
          lockoutUntil=now+backoffMs;
          await saveUnlockFailState({count:newCount,lockoutUntil});
          await auditLog('UNLOCK_LOCKOUT', `Account locked after ${newCount} failed attempts`, false);
          showUnlockError(`Incorrect password. Too many attempts — try again in ${formatLockoutRemaining(backoffMs)}.`);
        }else{
          await saveUnlockFailState({count:newCount,lockoutUntil:0});
          showUnlockError('Incorrect password. Please try again.');
        }
        return;
      }

      await saveUnlockFailState({count:0,lockoutUntil:0});
      await auditLog('UNLOCK_SUCCESS', 'User successfully unlocked the application', true);
      resetAutoLockTimer();
      document.getElementById('unlock-overlay').classList.remove('show');
      const resolve=_unlockResolve;_unlockResolve=null;
      resolve();
    }else if(_unlockMode==='openFile'){
      if(!pw){showUnlockError('Please enter your password.');return;}
      try{
        _cryptoKey=await deriveAndVerifyKey(pw,_pendingOpenManifest,_pendingOpenZip);
      }catch(e){
        _cryptoKey=null;
        showUnlockError('Incorrect password for this file.');
        return;
      }
      _pendingOpenManifest=null;_pendingOpenZip=null;
      document.getElementById('unlock-overlay').classList.remove('show');
      const resolve=_unlockResolve;_unlockResolve=null;
      resolve();
    }
  }finally{
    btn.disabled=false;
  }
}

document.addEventListener('keydown',(e)=>{
  if(e.key==='Enter'&&document.getElementById('unlock-overlay')?.classList.contains('show')){
    e.preventDefault();
    submitUnlockForm();
  }
});

// Flushes pending work, clears the key and decrypted case data from memory,
// then requires the password again. After unlock, this flow reloads from the
// open .sav handle; with no handle yet, it falls back to the temporary
// session-recovery cache flushPendingSave() just wrote (same password means
// same derived key, so it decrypts with the key ensureUnlocked() produces).
async function lockApp(){
  if(_autoLockTimer){clearTimeout(_autoLockTimer);_autoLockTimer=null;}
  await flushPendingSave();
  if (window.releaseWardLock) await window.releaseWardLock();
  const handleToReload=await loadCaseFileHandle();
  _cryptoKey=null;
  caseFile={guardianName:'',guardianEmail:'',wards:[],parties:[],cases:[],dismissedPartyPairs:[],activeWardId:null};
  window.caseFile=caseFile;
  window.D={};
  activeInventoryType=null;
  document.getElementById('sidebar').style.display='none';
  document.getElementById('main-content').innerHTML='<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--ink-3);">Locked</div>';
  await ensureUnlocked();
  if(handleToReload){
    // Rebuild memory from the open .sav file now that the key is available.
    try{
      const handleFile=await handleToReload.getFile();
      const zip=await JSZip.loadAsync(handleFile);
      const manifestEntry=zip.file('manifest.json');
      if(manifestEntry){
        const manifest=JSON.parse(await manifestEntry.async('string'));
        await loadCaseFileFromZip(zip,manifest,_cryptoKey);
      }
    }catch(e){console.error('Could not reload case data after unlocking',e);}
  }else{
    // No .sav has ever been saved for this case, so the only place this
    // data can come from is the recovery cache saved just above.
    try{
      const cache=await _sessionCacheGet();
      if(cache&&Array.isArray(cache.wards)&&cache.wards.length){
        const restoredWards=[];
        for(const w of cache.wards){
          const ward=sanitizeObjectData(await decryptJSONWithKey(w.enc,_cryptoKey));
          if(ward&&ward.wardId)restoredWards.push(ward);
        }
        if(restoredWards.length){
          const g=await decryptJSONWithKey(cache.guardian,_cryptoKey);
          caseFile.wards=restoredWards;
          caseFile.guardianName=(g&&g.guardianName)||'';
          caseFile.guardianEmail=(g&&g.guardianEmail)||'';
          caseFile.activeWardId=null;
        }
      }
    }catch(e){console.error('Could not reload case data from the recovery cache after unlocking',e);}
  }
  await loadGuardianData();
  const activeWard=getActiveWard();
  if(activeWard){
    const ok = await activateWard(activeWard);
    if (!ok) {
      window.location.hash = '/dashboard';
    }
  }
  updateSidebar();
  handleHash();
}

// Auto-lock after inactivity: an unattended-but-unlocked app is the
// weakest point in encryption-at-rest, since "remember password" now makes
// it easy to leave the app open indefinitely. Any of the listed activity
// events pushes the timeout back out; if none occur for AUTO_LOCK_MS while
// unlocked, the app locks itself exactly as if the user clicked Lock.
const AUTO_LOCK_MS=15*60*1000;
let _autoLockTimer=null;
function resetAutoLockTimer(){
  if(_autoLockTimer)clearTimeout(_autoLockTimer);
  if(!_cryptoKey)return;
  _autoLockTimer=setTimeout(()=>{if(_cryptoKey)lockApp();},AUTO_LOCK_MS);
}
['mousemove','mousedown','keydown','scroll','touchstart'].forEach(evt=>{
  document.addEventListener(evt,resetAutoLockTimer,{passive:true});
});

// ═══════════════════════════════════════════════════════
// IN-MEMORY STATE OPERATIONS
// Compatibility facade for the former IndexedDB store API. Wards, settings,
// templates, and audit entries remain in memory here; saveData() writes the
// authoritative .sav file and manages the separate recovery snapshot.
// ═══════════════════════════════════════════════════════

async function saveWardToState(ward){
  if(!ward)return false;
  ward.lastModified=new Date().toISOString();
  // The ward is already live in caseFile; schedule persistence. Under the
  // unified single-file model, one autoSave() covers every ward regardless
  // of which one was actually edited -- there's no per-ward file to track.
  autoSave();
  return true;
}

async function deleteWardFromState(wardId){
  // deleteWard() already updates the live array; schedule persistence.
  autoSave();
  return true;
}


async function saveTemplate(type,b64){
  _templateCache[type]=b64;
  autoSave();
  return true;
}

async function loadTemplate(type){
  return _templateCache[type]||null;
}

// In memory, entries are kept unencrypted, on purpose, the same way the old
// IDB store held them: a failed-unlock attempt has to be logged before any
// password has been verified, so no encryption key can be assumed to exist
// yet. That's only true of memory, though — by the time any of this reaches
// a .sav file, a real save is happening, which (see saveData()'s own guard)
// cannot happen at all in 'encrypted' mode without _cryptoKey already set.
// buildCaseFileBlob() encrypts the whole log at that point, same as
// appState, rather than leaving ward names and other case details sitting
// in plaintext inside a file this app actively encourages emailing and
// copying around. Deliberately does NOT call autoSave() itself:
// writeCaseToHandle() logs its own DATA_EXPORT entry as part of every
// manual save (automatic saves are not logged -- Milestone 62), and having
// that schedule another save would loop forever, one save always
// triggering the next. An entry logged for any other reason rides
// along in whatever save happens next instead — exactly as independent of
// the ward-edit debounce as the old IDB store's own audit log always was.
async function appendAuditLogEntry(entry){
  entry.id=_auditLogNextId++;
  // Tag with the active ward so a single-ward export (buildSingleWardExportBlob)
  // can include only that ward's own entries. Entries created before this
  // tagging, or app-level events with no active ward, will have wardId
  // undefined/null and are excluded from single-ward exports (but preserved
  // in the main case file and the activity log).
  if(caseFile.activeWardId)entry.wardId=caseFile.activeWardId;
  _auditLogEntries.push(entry);
  return true;
}

async function loadAuditLogEntries(){
  return _auditLogEntries;
}

// ═══════════════════════════════════════════════════════
// ACTIVITY LOG — VIEWER
// auditLog()/appendAuditLogEntry() have recorded every unlock, backup, and
// restore since the app's earliest versions, but nothing ever displayed the
// result — it was write-only. This is the read side: a page a guardian can
// open to answer "did my backup actually save?" or to show a record of
// diligence if their recordkeeping is ever questioned.
// ═══════════════════════════════════════════════════════
const ACTIVITY_EVENT_META={
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
let _activityLogEntries=[]; // newest-first, loaded once per page visit
const ACTIVITY_LOG_RENDER_CAP=300; // safety cap on DOM rows, not on what's exported

async function loadAndRenderActivityLog(){
  const raw=await loadAuditLogEntries();
  // Sort by the in-memory monotonic id; timestamps can collide within one
  // millisecond and are therefore not a reliable ordering key.
  _activityLogEntries=raw.slice().sort((a,b)=>(b.id||0)-(a.id||0));
  renderActivityLogList();
  renderStorageReadout();
}

// Reports the authoritative .sav file and last-save status. Temporary
// recovery storage is intentionally not presented as a durable backup.
async function renderStorageReadout(){
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
  const lastExportAt=typeof window.getLastExportAt==='function'?window.getLastExportAt():window._lastExportAt;
  const armed=typeof window.isAutoSaveArmed==='function'?window.isAutoSaveArmed():false;
  const savedNote=lastExportAt
    ? `last saved ${formatRelativeTime(lastExportAt)}`
    : 'not saved yet this session';
  host.innerHTML=`${ic('chart',14)} <strong>${esc(fileName)}</strong> (case file) — ${armed?'auto-save is on':'auto-save needs one manual save to re-arm'}, ${esc(savedNote)}.`;
}

function activityLogFiltered(){
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

function renderActivityLogList(){
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

function formatActivityTimestamp(iso){
  const d=new Date(iso);
  if(isNaN(d))return iso||'';
  return d.toLocaleString('en-US',{dateStyle:'medium',timeStyle:'short'});
}

// Exports whatever the current filter shows, not always the full log — the
// file's own header states the filter that was applied, so a partial export
// can't be mistaken for the complete record.
async function exportActivityLog(){
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
    await window.alertModal('Export failed: '+(e&&e.message||e));
  }
}

function pageActivityLog(){
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

// ═══════════════════════════════════════════════════════
// PARTY MANAGEMENT / DE-DUPLICATION (persistence rewrite Milestone 7)
// Follows pageActivityLog()'s own pattern immediately above: a static shell
// rendered once by renderPage(), a body-refresh function called after every
// action, and the existing global data-form-action/data-form-input dispatch
// (src/form-events.js) -- no new event-dispatch convention needed. The
// underlying logic (candidate detection, merge, dismissal) lives in
// src/core/party-resolver.js, bridged onto window the same way
// case-resolver.js's Case functions are.
// ═══════════════════════════════════════════════════════

async function autoSave(){
  _dirtySinceExport=true;
  updateLastSavedIndicator();
  notifyProbateGuardianTabStateChanged();
  if(_saveTimer)clearTimeout(_saveTimer);
  _saveTimer=setTimeout(()=>{_saveTimer=null;saveData();},1000);
}

// Cancels any pending debounced save and saves the CURRENTLY active ward
// immediately. Must be called before reassigning activeWardId/window.D —
// otherwise a save scheduled for the old ward fires after the switch and
// silently writes the new ward's data instead, losing the old edit.
async function flushPendingSave(){
  if(_saveTimer){
    clearTimeout(_saveTimer);
    _saveTimer=null;
  }
  window.commitPendingFieldValues?.();
  await saveData();
}

function showSaveError(){
  const el=document.getElementById('save-error-banner');
  if(el)el.style.display='block';
}
function hideSaveError(){
  const el=document.getElementById('save-error-banner');
  if(el)el.style.display='none';
}

// The consecutive-failure counter that gated the banner above now lives in
// case-file.js's writeCaseToHandle(), which is the one place every write
// passes through; these two functions stay here because they are pure DOM
// toggles and case-file.js calls them via window, the same way it already
// calls window.auditLog.

// Captures dirty state in the temporary recovery cache, then rewrites the
// complete case file when a writable handle is available. No open handle
// is a normal pre-save state, not an error. Under the unified single-file
// model this is deliberately simple: there is exactly one handle and one
// write, covering every ward -- the old version had to separately track
// which non-active wards were dirtied off the active-ward path (dashboard
// archive toggle, workflow edits) because each ward could have its OWN
// file; that distinction no longer exists, so there is nothing left to
// track beyond the single _dirtySinceExport flag.
async function saveData(){
  // Nothing should be persisted while the app is locked — there's no
  // encryption key to write with. This isn't a failure (e.g. autoSave()
  // debounced from an edit made right before auto-lock kicked in), so it
  // must not trip the save-error banner the way an actual write problem would.
  if(_securityMode==='encrypted'&&!_cryptoKey)return;
  const activeWard=getActiveWard();
  if(activeWard){
    window.commitStoredDateDrafts?.(activeWard,setPath);
    activeWard.lastModified=new Date().toISOString();
  }
  // Best-effort local resume snapshot, used only by lockApp() when the app
  // auto-locks before any .sav has ever been saved (see recovery-cache.js's
  // file header); a successful .sav write clears it. Awaited so callers
  // that depend on it having landed before acting further (lockApp() wiping
  // memory, beforeunload) aren't racing an in-flight IndexedDB write.
  if(_dirtySinceExport){
    // This is only a best-effort crash-recovery snapshot. It is not the
    // durable .sav case file, so an IndexedDB/cache failure must not look
    // like a failed case-file save (and must not clear a real write error).
    await saveSessionRestoreCache();
  }
  // No "last saved" stamp here: at this point no handle has been checked,
  // no permission verified, and no write attempted. writeCaseToHandle()
  // records the save once it has actually written one.
  const handle=await loadCaseFileHandle();
  if(!handle)return;
  try{
    const perm=await handle.queryPermission({mode:'readwrite'});
    if(perm!=='granted'){
      await refreshAutoSaveArmedStatus();
      return;
    }
    // Failure counting and the error banner live in writeCaseToHandle() so
    // every caller reports a failed write identically.
    await writeCaseToHandle(handle,true);
  }catch(e){
    console.error('save failed',e);
  }
}

// State is already populated by .sav load, session recovery, or new-case
// defaults. Retained as an async compatibility check for initApp().
async function loadGuardianData(){
  return caseFile.wards.length>0||!!caseFile.guardianName;
}

// The open filing's record: src/core/state.js's, since Milestone 70's 70E.
function getActiveWard(){return window.GuardianFormsLegacyBridge.getActiveWard();}

function getProbateGuardianTabState(){
  const activeWard=getActiveWard();
  return {
    hasActiveCase: !!activeWard,
    activeCase: activeWard?{
      wardId: activeWard.wardId||'',
      wardName: activeWard.wardName||'',
      caseNumber: activeWard.caseNumber||'',
      inventoryType: activeWard.inventoryType||''
    }:null,
    dirty: _dirtySinceExport,
    appVersion: window.PG_APP_VERSION||''
  };
}
window.getProbateGuardianTabState=getProbateGuardianTabState;
function notifyProbateGuardianTabStateChanged(){
  document.dispatchEvent(new CustomEvent('probate-guardian-state-change',{detail:getProbateGuardianTabState()}));
}
window.pgHasUnsavedChanges=function(){return _dirtySinceExport;};

// getCaseFile() and its window.getCaseFile publication went in Milestone
// 70's 70E: modules read the case through src/core/state.js, which reads
// window.caseFile -- kept on the same object as this script's `caseFile`,
// which it reassigns in one place (lockApp()) and republishes there.

// _appState has the same reassign-wholesale problem as caseFile above.
// Dashboard only ever needs this one flag, so a pair of small accessors is
// simpler than exposing the whole mutable object.
function isContinuePromptShown(){ return !!_appState.continuePromptShown; }
window.isContinuePromptShown=isContinuePromptShown;
function markContinuePromptShown(){
  _appState.continuePromptShown=true;
  saveAppState('continuePromptShown',true);
}
window.markContinuePromptShown=markContinuePromptShown;


// ═══════════════════════════════════════════════════════
// EXPORT / IMPORT — guardianshipwarddata.sav
// One portable archive holding the guardian info plus every ward. The file
// is actually a ZIP under the hood (same trick as .docx/.xlsx), just saved
// with a .sav extension instead of .zip.
// The ZIP container itself is NOT password-protected (ZipCrypto is weak);
// instead each entry is AES-256-GCM ciphertext, so opening the zip in any
// tool shows only unreadable .enc entries, and GCM's auth tag makes any
// outside edit (accidental or otherwise) fail loudly on import instead of
// loading corrupted data.
// ═══════════════════════════════════════════════════════


// Save As dialog where supported (Chrome/Edge); plain Downloads-folder
// download elsewhere (Firefox/Safari have no showSaveFilePicker).
// Returns the FileSystemFileHandle used (so it can be remembered for silent
// re-writes later), or null when falling back to a plain Downloads-folder
// download (no handle exists in that path).


// The case-file handle, the armed-status flag and the format version all
// moved to src/core/persistence/case-file.js with the functions that owned
// them. case-file.js keeps window._caseFileHandle in sync itself, so nothing
// here needs a local copy.


// Builds a small standalone case-file-shaped ZIP containing just one ward --
// for sharing a copy with a co-guardian or attorney without exposing the
// rest of the case. Shaped exactly like buildCaseFileBlob()'s output (same
// manifest format/version), just filtered to one ward, so it imports the
// same way any case file does -- there's no separate "single ward" format.


// _lastAutoSavedAt used to be consulted here as a second "last saved" clock.
// It was never declared in this file, so the fallback arm of that ternary
// threw a ReferenceError on every page load -- window._lastAutoSavedAt is
// undefined until the first saveData(), which made the guard evaluate the
// bare identifier. The throw aborted initApp() partway, silently skipping
// the periodic save timer, the last-saved ticker, the fallback save
// reminder, drag-and-drop import, and the beforeunload unsaved-changes
// warning. One clock (_lastExportAt), written only on a confirmed save.


// Records this save's timestamp and audit entry BEFORE the save itself
// happens, so the file this save produces contains its own record of
// itself — not only the previous save's. Recording afterward (as this used
// to) meant a session that saved once and then closed had recorded that
// save nowhere at all: the in-memory update happened, but the file already
// written a moment earlier never got it, and there was no session left to
// write it in a later save. Returns a rollback closure, used if the write
// that follows fails, so a failed save is never recorded as having succeeded.


// Manual "Save Backup Now" / "Export All" action: builds the whole case file
// and writes it via Save-As, remembering the resulting handle so future
// changes can auto-save to it silently. One case, one file, one handle --
// there is no longer a separate "single ward" vs "whole archive" choice to
// make here the way there used to be.

// exportGuardianDataZip/backupAllWardsNow used to be two different exports
// (a "wards + guardian" archive vs a "full case" backup); under the unified
// model they're the same operation. Kept as aliases so existing UI markup
// and fragments calling either name keep working unchanged.

// Writes the whole case to an already-authorized handle. Used by auto-save,
// the periodic background timer, and the Save Backup button.


// Tries to silently re-write the remembered case-file handle — no dialog,
// no user gesture needed, as long as the browser still grants write
// permission.


// Filename helpers retained for the single-ward "share a copy" export below
// (dashboard's exportSingleWardZip) -- the primary save file no longer has
// a per-ward name to compute, but a one-off exported copy of just one ward
// still benefits from a name derived from that ward rather than a generic one.


// Guards a single-ward "share a copy" export from accidentally overwriting
// the real multi-ward case file -- a single-ward export is shaped exactly
// like a (one-ward) case file now, so picking the same location as the
// real case file and confirming the browser's native overwrite prompt would
// otherwise silently drop every other ward.


// Finishes a single-ward "share a copy" export. Deliberately does NOT touch
// the case file's own handle/dirty state -- exporting a copy of one ward
// for someone else has nothing to do with where THIS app instance's own
// autosave writes to, unlike the old per-ward-file model where the two were
// the same thing.


// The banner's Save Backup Now button. Runs inside a click, so a user
// gesture is available: re-authorizes the case file's handle with one small
// prompt, or falls back to a full Save As.


// Tries showOpenFilePicker() first so opening a case file this way arms a
// writable save handle (same as triggerOpenBackupSav()) -- without this,
// autoSave() has nothing to write to, and the first edit after opening
// forces an unexpected manual "Save As" with a freshly-generated filename
// instead of the file that was actually opened.


// ═══════════════════════════════════════════════════════
// SESSION-RESTORE CACHE (crash recovery)
// ═══════════════════════════════════════════════════════
// Stores a temporary full-case snapshot in pg-session-cache while changes
// are not yet in a .sav file. Encrypted mode uses AES-256-GCM; none mode uses
// the PLAIN format. A successful .sav save clears the snapshot, and startup
// offers any remaining snapshot before the normal Open/Start flow.
const SESSION_CACHE_DB='pg-session-cache', SESSION_CACHE_STORE='snapshot';
function _sessionCacheDb(){
  return new Promise((resolve,reject)=>{
    const req=indexedDB.open(SESSION_CACHE_DB,1);
    req.onupgradeneeded=()=>req.result.createObjectStore(SESSION_CACHE_STORE);
    req.onsuccess=()=>resolve(req.result);
    req.onerror=()=>reject(req.error);
  });
}
async function _sessionCacheGet(){
  try{
    const db=await _sessionCacheDb();
    return await new Promise(resolve=>{
      const req=db.transaction(SESSION_CACHE_STORE,'readonly').objectStore(SESSION_CACHE_STORE).get('current');
      req.onsuccess=()=>resolve(req.result||null);
      req.onerror=()=>resolve(null);
    });
  }catch(e){return null;}
}
async function _sessionCachePut(val){
  try{
    const db=await _sessionCacheDb();
    await new Promise(resolve=>{
      const tx=db.transaction(SESSION_CACHE_STORE,'readwrite');
      tx.objectStore(SESSION_CACHE_STORE).put(val,'current');
      tx.oncomplete=resolve;tx.onerror=resolve;
    });
  }catch(e){/* non-critical -- see saveSessionRestoreCache()'s own catch */}
}
async function _sessionCacheClear(){
  try{
    const db=await _sessionCacheDb();
    await new Promise(resolve=>{
      const tx=db.transaction(SESSION_CACHE_STORE,'readwrite');
      tx.objectStore(SESSION_CACHE_STORE).delete('current');
      tx.oncomplete=resolve;tx.onerror=resolve;
    });
  }catch(e){/* non-critical */}
}


// ═══════════════════════════════════════════════════════
// OPEN / START AT LAUNCH
// After session recovery is checked, try the remembered handle or ask the
// user to open a .sav file or start a new case. Opening a file hydrates state
// and resolves its security mode before ensureUnlocked().
// ═══════════════════════════════════════════════════════

// pg-launch-pref stores a has-opened flag and the last FileSystemFileHandle.
// A valid remembered grant permits silent reopen; an expired grant needs a
// user click, and a missing or stale handle falls back to the file picker.
const LAUNCH_PREF_DB='pg-launch-pref', LAUNCH_PREF_STORE='flags';
const LAUNCH_PREF_KEY_OPENED='hasOpenedBefore', LAUNCH_PREF_KEY_HANDLE='zipFileHandle';
const REMEMBERED_FILE_TIMEOUT_MS=10000;
let _rememberedFileUnavailable=false;
function _launchPrefDb(){
  return new Promise((resolve,reject)=>{
    const req=indexedDB.open(LAUNCH_PREF_DB,1);
    req.onupgradeneeded=()=>req.result.createObjectStore(LAUNCH_PREF_STORE);
    req.onsuccess=()=>resolve(req.result);
    req.onerror=()=>reject(req.error);
  });
}
async function _launchPrefGet(key){
  const db=await _launchPrefDb();
  return new Promise((resolve)=>{
    const req=db.transaction(LAUNCH_PREF_STORE,'readonly').objectStore(LAUNCH_PREF_STORE).get(key);
    req.onsuccess=()=>resolve(req.result);
    req.onerror=()=>resolve(undefined);
  });
}
async function _launchPrefPut(key,value){
  const db=await _launchPrefDb();
  return new Promise((resolve)=>{
    const tx=db.transaction(LAUNCH_PREF_STORE,'readwrite');
    tx.objectStore(LAUNCH_PREF_STORE).put(value,key);
    tx.oncomplete=resolve;
    tx.onerror=resolve; // non-critical either way — next launch just falls back
  });
}
async function _launchPrefDelete(key){
  const db=await _launchPrefDb();
  return new Promise((resolve)=>{
    const tx=db.transaction(LAUNCH_PREF_STORE,'readwrite');
    tx.objectStore(LAUNCH_PREF_STORE).delete(key);
    tx.oncomplete=resolve;
    tx.onerror=resolve;
  });
}

// Case 1 above: a remembered handle whose read permission the browser
// still honors with no prompt at all. Runs before the startup screen even
// shows, so this is the only path that can be truly zero-click; everywhere
// else still needs the gesture openCaseFileAtLaunch() provides.
async function trySilentReopen(){
  let handle=null;
  try{
    handle=await loadPersistedCaseFileHandle();
    if(!handle||!handle.queryPermission)return false;
    if((await runRememberedHandleOperation(()=>handle.queryPermission({mode:'read'})))!=='granted')return false;
    const file=await readRememberedFile(handle);
    const res=await loadCaseFileAtLaunch(file);
    if(res&&res.ok){
      await rememberCaseFileHandle(handle);
      return true;
    }
    return false;
  }catch(e){
    await handleRememberedFileFailure(handle,e);
    return false;
  }
}

let _launchStateResolved=false;
let _openedFileAtLaunch=false; // set by loadCaseFileAtLaunch() on success; initApp() lands on the dashboard instead of the default page when this is true
let _startupChoiceResolve=null;
async function promptOpenOrStartAtLaunch(){
  if(await trySilentReopen())return;
  document.getElementById('startup-newcase-btn').style.display='';
  const linkEl=document.getElementById('startup-newcase-link');
  if(linkEl)linkEl.style.display='none';
  const fileStatus=document.getElementById('startup-file-status');
  fileStatus.style.display=_rememberedFileUnavailable?'block':'none';
  return new Promise((resolve)=>{
    _startupChoiceResolve=resolve;
    document.getElementById('startup-choice-overlay').classList.add('show');
  });
}
function _resolveStartupChoice(){
  document.getElementById('startup-choice-overlay').classList.remove('show');
  const resolve=_startupChoiceResolve;_startupChoiceResolve=null;
  if(resolve)resolve();
}
async function startNewWardAtLaunch(){
  _resolveStartupChoice();
  try{ await forgetPersistedCaseFileHandle(); }catch(e){}
  try{ window.clearLastPosition?.(); }catch(e){}
}
const startNewCaseAtLaunch = startNewWardAtLaunch;
window.startNewWardAtLaunch = startNewWardAtLaunch;
window.startNewCaseAtLaunch = startNewCaseAtLaunch;

// Chrome/Edge: showOpenFilePicker() returns a handle that supports
// createWritable(), so opening a file arms silent auto-save immediately.
// Firefox/Safari implement neither picker — fall back to a plain
// <input type=file>, which can only ever hand back a read-only File.
// Those browsers can open a case file but can never auto-save it (see
// refreshAutoSaveArmedStatus()); that is stated on screen once the file is
// open, not hidden.
//
// trySilentReopen() already tried the fully-silent path with no prompt at
// all before this screen ever showed; reaching here means that either
// failed or was never possible (this is a first visit, a different
// browser, or the earlier grant lapsed). This click is still a real user
// gesture, so it can re-request permission on that SAME remembered
// handle — a small native "Allow?" prompt, not the full picker — before
// falling back to showOpenFilePicker() itself.
async function openWardFileAtLaunch(){
  const remembered=await loadPersistedCaseFileHandle();
  if(remembered&&remembered.requestPermission){
    try{
      if((await runRememberedHandleOperation(()=>remembered.requestPermission({mode:'read'})))==='granted'){
        const file=await readRememberedFile(remembered);
        const res=await loadCaseFileAtLaunch(file);
        if(res&&res.ok){
          await rememberCaseFileHandle(remembered);
          _resolveStartupChoice();
          return;
        }
      }
    }catch(e){
      await handleRememberedFileFailure(remembered,e);
      const statusEl=document.getElementById('startup-file-status');
      if(statusEl){
        statusEl.textContent='Your previously opened file could not be found or was moved. Click "Open Case File (.sav)" below to select your file.';
        statusEl.style.display='block';
      }
      return; // Return so user can click with a fresh gesture
    }
  }
  if(window.showOpenFilePicker){
    try{
      const [handle]=await window.showOpenFilePicker({
        types:[{description:'Guardian Forms data file',accept:{'application/octet-stream':['.sav']}}]
      });
      const file=await handle.getFile();
      const res=await loadCaseFileAtLaunch(file);
      if(res&&res.ok){
        await rememberCaseFileHandle(handle);
        _resolveStartupChoice();
      }
    }catch(e){
      if(e&&e.name==='AbortError')return; // user cancelled the picker — leave the choice screen up
      if(e&&(String(e.message).includes('user gesture')||String(e).includes('user gesture'))){
        const statusEl=document.getElementById('startup-file-status');
        if(statusEl){
          statusEl.textContent='Click "Open Case File (.sav)" to select a file.';
          statusEl.style.display='block';
        }
        return;
      }
      console.error('Open case file failed',e);
      await window.alertModal('Could not open that file: '+(e&&e.message||e));
    }
    return;
  }
  document.getElementById('startup-open-input').click();
}
const openCaseFileAtLaunch = openWardFileAtLaunch;
window.openWardFileAtLaunch = openWardFileAtLaunch;
window.openCaseFileAtLaunch = openCaseFileAtLaunch;

async function handleStartupOpenInputChange(input){
  const file=input.files[0];
  input.value='';
  if(!file)return;
  // No handle to remember here — a plain <input> never yields a writable
  // one. loadCaseFileAtLaunch() -> refreshAutoSaveArmedStatus() already
  // says so on screen once this resolves.
  const ok=await loadCaseFileAtLaunch(file);
  if(ok)_resolveStartupChoice();
}
window.handleStartupOpenInputChange = handleStartupOpenInputChange;

// Shared by both pickers above: validate, parse, ask for a password if the
// file is encrypted, then hand off to loadCaseFileFromZip(). Returns true
// on success (state is now populated and _cryptoKey is set if needed) or
// false (already reported to the user; the startup choice screen stays up
// so they can try again or start a new case instead).
async function loadCaseFileAtLaunch(file){
  try{
    const check=await validateImportFile(file,'sav');
    if(!check.ok){await window.alertModal(check.message);return false;}
    if(typeof JSZip==='undefined'){await window.alertModal('ZIP library failed to load — cannot open this file.');return false;}
    const zip=await JSZip.loadAsync(file);
    const manifestEntry=zip.file('manifest.json');
    if(!manifestEntry){await window.alertModal('Not a Guardian Forms data file (no manifest.json inside).');return false;}
    const manifest=JSON.parse(await manifestEntry.async('string'));
    if(manifest.format!=='probate-guardian-case'){await window.alertModal('Not a Guardian Forms data file.');return false;}
    _securityMode=manifest.securityMode||(manifest.salt?'encrypted':'none');
    if(_securityMode==='encrypted'){
      await promptPasswordForFile(manifest,zip); // sets _cryptoKey; only resolves on a verified password
    }else{
      _cryptoKey=null;
    }
    // Hydrate _appState directly (not via saveAppState()) so ensureUnlocked()
    // finds securityMode/cryptoSalt/cryptoVerifier already in place without
    // this counting as an edit that needs writing straight back out.
    _appState.securityMode=_securityMode;
    _appState.cryptoSalt=manifest.salt||null;
    _appState.cryptoVerifier=manifest.verifier||null;
    await loadCaseFileFromZip(zip,manifest,_cryptoKey);
    // Milestone 40D: this line used to be `if(_appState.theme)applyTheme(...)`,
    // re-applying the FILE's theme once the .sav finished loading. That was the
    // flash this delivery removes, and it also meant opening someone else's file
    // changed your appearance. A loaded file no longer overrides what already
    // painted; the one-time seed below (in loadCaseFileFromZip) is what carries
    // an upgrading user's legacy choice across, exactly once.
    //
    // applyTheme() is still called, with the theme prepaint.js already painted,
    // purely to bring the toggle button's icon/aria state into agreement -- not
    // to change the theme.
    applyTheme(currentTheme(),false);
    _launchStateResolved=true;
    _openedFileAtLaunch=true;
    markCaseOpenedBefore();
    refreshAutoSaveArmedStatus(); // covers the plain-<input> path too, where no handle was ever remembered
    return { ok: true, wardId: (caseFile.wards[0] && caseFile.wards[0].wardId) || null };
  }catch(e){
    console.error('Failed to open case file',e);
    await window.alertModal('Could not open that file: '+(e&&e.message||e));
    return false;
  }
}

// The counterpart to buildCaseFileBlob(): reads wards, guardian info,
// appState, cached templates, and the audit log out of an already-parsed
// .sav zip into memory. `key` may be null in 'none' mode — decryptJSONWithKey
// checks for the PLAIN: prefix before ever touching it. A file with no
// appState section at all (buildSingleWardExportBlob's single-ward exports
// never include one) defaults activeWardId to whichever ward the file
// contains, rather than failing.
async function loadCaseFileFromZip(zip,manifest,key){
  caseFile.wards=[];
  caseFile.parties=[];
  caseFile.cases=[];
  caseFile.dismissedPartyPairs=[];
  const partiesFile=zip.file('parties.enc');
  if(partiesFile){
    try{
      const parties=await decryptJSONWithKey(await partiesFile.async('string'),key);
      if(Array.isArray(parties))caseFile.parties=parties;
    }catch(e){console.warn('Could not read parties from .sav file',e);}
  }
  const casesFile=zip.file('cases.enc');
  if(casesFile){
    try{
      const cases=await decryptJSONWithKey(await casesFile.async('string'),key);
      if(Array.isArray(cases))caseFile.cases=cases;
    }catch(e){console.warn('Could not read cases from .sav file',e);}
  }
  const partyDismissalsFile=zip.file('partyDismissals.enc');
  if(partyDismissalsFile){
    try{
      const dismissals=await decryptJSONWithKey(await partyDismissalsFile.async('string'),key);
      if(Array.isArray(dismissals))caseFile.dismissedPartyPairs=dismissals;
    }catch(e){console.warn('Could not read party dismissals from .sav file',e);}
  }
  for(const entry of (Array.isArray(manifest.wards)?manifest.wards:[])){
    const f=zip.file(entry.file);
    if(!f){console.warn('Case file entry missing:',entry.file);continue;}
    try{
      const ward=sanitizeObjectData(await decryptJSONWithKey(await f.async('string'),key));
      if(ward&&ward.wardId)caseFile.wards.push(ward);
    }catch(e){console.warn('Skipping unreadable ward in .sav file',entry.file,e);}
  }
  caseFile.guardianName='';
  caseFile.guardianEmail='';
  caseFile.lastSavedFileName=null; // stamped fresh by rememberCaseFileHandle() once this file gets a handle
  if(manifest.guardian){
    try{
      const g=await decryptJSONWithKey(manifest.guardian,key);
      caseFile.guardianName=g.guardianName||'';
      caseFile.guardianEmail=g.guardianEmail||'';
    }catch(e){console.warn('Could not read guardian info from .sav file',e);}
  }
  _appState.activeWardId=null;
  _autoExportIntervalMinutes=10;
  _lastExportAt=null;
  if(manifest.appState){
    try{
      const a=await decryptJSONWithKey(manifest.appState,key);
      // Milestone 38C: a legacy archive's activeWardId is resume HISTORY, not
      // an instruction to reopen an editor. Focus is forced null below, for
      // every archive shape.
      const legacyActiveWardId=a.activeWardId||null;
      // Milestone 40D: theme is no longer read back out of app state to drive
      // appearance, but this is where a legacy value arrives from the file, so it
      // is the natural hook for the one-time seed. seedStoredThemeFromLegacy()
      // writes to localStorage ONLY when nothing is stored there yet -- so an
      // upgrading user keeps the theme they had, and opening any later file can
      // never overwrite the per-device choice they have since made.
      _appState.theme=a.theme;
      if(typeof window.seedStoredThemeFromLegacy==='function'){
        if(window.seedStoredThemeFromLegacy(a.theme)){
          // Seeded: bring the live document in line, since nothing had painted
          // this value yet.
          applyTheme(a.theme,false);
        }
      }
      _appState.walkthroughCompleted=a.walkthroughCompleted;
      _appState.firstLaunchSeen=a.firstLaunchSeen;
      _appState.continuePromptShown=a.continuePromptShown;
      _appState.recentWards=a.recentWards;
      // Consume the legacy value exactly once, as recent history: prepend it
      // if it names a ward this archive actually contains and is not already
      // listed. It then shows up under Continue Editing, which the user opts
      // into, instead of opening itself.
      if(legacyActiveWardId){
        const legacyWard=caseFile.wards.find(w=>w.wardId===legacyActiveWardId);
        const already=loadRecentlyOpenedWards().some(r=>r&&r.wardId===legacyActiveWardId);
        if(legacyWard&&!already)addToRecentlyOpened(legacyWard);
      }
      _appState.unlockFailState=a.unlockFailState;
      _autoExportIntervalMinutes=(a.autoExportIntervalMinutes==null)?10:Number(a.autoExportIntervalMinutes);
      _lastExportAt=a.lastExportAt||null;
      // Milestone 54: caseFile-scoped, not app-launch-scoped, but carried in
      // this blob rather than its own zip entry -- see buildCaseFileBlob()'s
      // comment on why. A full .sav open is the one path that should adopt
      // the archive's circuit selection; merge-import and crash recovery
      // deliberately do not (case-file.js, recovery-cache.js).
      const sc=Number(a.selectedCircuit);
      caseFile.selectedCircuit=(sc>=1&&sc<=20)?sc:6;
    }catch(e){console.warn('Could not read app preferences from .sav file',e);}
  }
  // Milestone 38C, same rule as above and deliberately outside the appState
  // branch: a single-ward export carries no appState section at all, and this
  // used to fall back to opening wards[0] "solely because data was imported",
  // which 38C's storage table prohibits. Focus stays null for every archive
  // shape; the user chooses Edit from the dashboard.
  caseFile.activeWardId=null;
  // Milestone 40C-A legacy migration rule. Existing nonblank filing and attorney
  // counties are left exactly as stored. For a ward Party with no county, infer
  // one only when every linked filing that HAS a county agrees on the same
  // normalized Florida county, and persist that unanimous value. Conflicting or
  // absent counties leave it blank for the user to resolve on a Cover -- picking
  // silently between two real counties would mis-caption a filing. Never
  // inferred from attorney county, another ward's filing, or the old Pinellas
  // fallback. Runs here so an opened .sav is migrated before anything reads it.
  //
  // Also covers single-ward import, which carries no Party records: the
  // reconstructed ward Party is seeded from that exported filing's own explicit
  // county by the same unanimity rule (a single filing is trivially unanimous).
  if(typeof window.backfillWardPartyCounties==='function'){
    try{window.backfillWardPartyCounties();}
    catch(e){console.warn('Could not backfill ward-party counties',e);}
  }
  _templateCache={};
  for(const type of (Array.isArray(manifest.templates)?manifest.templates:[])){
    const f=zip.file(`templates/${type}.b64`);
    if(f)_templateCache[type]=await f.async('string');
  }
  _auditLogEntries=[];
  _auditLogNextId=1;
  const auditFile=zip.file('auditLog.enc');
  if(auditFile){
    try{
      const entries=await decryptJSONWithKey(await auditFile.async('string'),key);
      if(Array.isArray(entries)){
        _auditLogEntries=entries;
        _auditLogNextId=entries.reduce((m,e)=>Math.max(m,(e&&e.id)||0),0)+1;
      }
    }catch(e){console.warn('Could not read audit log from .sav file',e);}
  }
}


// Lets a user drag a .zip data file straight onto the app window instead of
// clicking through the file picker. dragCounter (rather than a boolean)
// correctly tracks enter/leave across child elements — dragenter/dragleave
// fire once per element boundary crossed, not just once for the window.
function setupDragAndDropImport(){
  let dragCounter=0;
  // #dropzone-overlay lives in the lazy 'common-modals' fragment, not yet
  // in the DOM when this runs at startup -- a reference captured once here
  // would stay null forever. Look it up fresh each time instead, after
  // ensureFragment() (idempotent) confirms it exists.
  const isFileDrag=e=>Array.from(e.dataTransfer?.types||[]).includes('Files');
  window.addEventListener('dragenter',async e=>{
    if(!isFileDrag(e))return;
    e.preventDefault();
    dragCounter++;
    await ensureFragment('common-modals');
    const overlay=document.getElementById('dropzone-overlay');
    if(overlay)overlay.style.display='flex';
  });
  window.addEventListener('dragover',e=>{
    if(!isFileDrag(e))return;
    e.preventDefault();
  });
  window.addEventListener('dragleave',e=>{
    if(!isFileDrag(e))return;
    e.preventDefault();
    dragCounter=Math.max(0,dragCounter-1);
    const overlay=document.getElementById('dropzone-overlay');
    if(dragCounter===0&&overlay)overlay.style.display='none';
  });
  window.addEventListener('drop',async e=>{
    if(!isFileDrag(e)){return;}
    e.preventDefault();
    dragCounter=0;
    const overlay=document.getElementById('dropzone-overlay');
    if(overlay)overlay.style.display='none';
    const files=Array.from(e.dataTransfer.files||[]);
    const zipFile=files.find(f=>{const n=f.name.toLowerCase();return n.endsWith('.sav')||n.endsWith('.zip');});
    if(!zipFile){
      if(files.length)await window.alertModal('Please drop a Guardian Forms .sav case data file.');
      return;
    }
    await importGuardianDataZip(zipFile);
  });
}

async function clearAllData(){
  if(!(await window.confirmModal('Clear all data for current form? This cannot be undone.')))return;
  const ward=getActiveWard();
  if(!ward)return;
  const {wardId,wardName,inventoryType,createdDate}=ward;
  Object.assign(ward,initializeEmptyData(ward.inventoryType));
  Object.assign(ward,{wardId,wardName,inventoryType,createdDate});
  saveData();
  updateSidebar();
  navigate('/');
}

// ═══════════════════════════════════════════════════════
// WARD MANAGEMENT
// ═══════════════════════════════════════════════════════

// The carry tables -- ACCOUNTING_FORM_TYPES, PRIOR_ACCOUNTING_SOURCES and
// CARRY_SOURCE_TYPE, which filings may seed a new one -- are
// src/core/navigation/ward-lifecycle.js's; this script's copies, identical
// and the last one unused, went in Milestone 70's 70G.





// updateCarrySourcePicker: src/core/filing/carry-over.js (Milestone 70, 70G).
function updateCarrySourcePicker(){return window.GuardianFormsLegacyBridge.updateCarrySourcePicker();}













// loadRecentlyOpenedWards: src/core/filing/recent-filings.js (Milestone 70, 70G).
function loadRecentlyOpenedWards(){return window.GuardianFormsLegacyBridge.loadRecentlyOpenedWards();}


// addToRecentlyOpened: src/core/filing/recent-filings.js (Milestone 70, 70G).
function addToRecentlyOpened(ward){return window.GuardianFormsLegacyBridge.addToRecentlyOpened(ward);}


// ═══════════════════════════════════════════════════════
// WARD ACTIVATION / UNLOAD (Single Chokepoint)
// ═══════════════════════════════════════════════════════


// The sidebar's "Switch Ward" button acts on whatever the dropdown is
// currently set to. If that's already the active ward, switchWard() would
// be a no-op with zero visible feedback — clicking the button would just
// silently do nothing, which reads as broken. Offer a picker instead.
// Generic searchable combobox: renders `items` ({label, sub?, ...}) into
// `dropdownEl`, filtered against `query` by case-insensitive substring match
// on label, calling `onPick(item)` when one is clicked.
function comboboxFilterItems(items,query){
  const q=(query||'').trim().toLowerCase();
  if(!q)return items;
  return items.filter(it=>it.label.toLowerCase().includes(q));
}
function comboboxRenderDropdown(dropdownEl,items,onPick){
  if(!dropdownEl)return;
  if(!items.length){
    dropdownEl.innerHTML='<div class="ward-combobox-empty">No matches</div>';
  }else{
    dropdownEl.innerHTML=items.map((it,i)=>`<div class="ward-combobox-item" data-idx="${i}" role="option">
        <span class="ward-combobox-item-name">${esc(it.label)}</span>
        ${it.sub?`<span class="ward-combobox-item-type">${esc(it.sub)}</span>`:''}
      </div>`).join('');
    [...dropdownEl.children].forEach((el,i)=>{
      if(el.classList.contains('ward-combobox-item'))el.addEventListener('mousedown',ev=>{ev.preventDefault();onPick(items[i]);});
    });
  }
  dropdownEl.style.display='block';
}
function comboboxHide(dropdownEl){
  if(dropdownEl)dropdownEl.style.display='none';
}
// Gives each rendered option a stable id, scoped by the dropdown's own id so
// multiple comboboxes on the page never collide -- aria-activedescendant
// needs a real id to point at, and comboboxRenderDropdown() itself doesn't
// assign one (Milestone 52J: previously only the ward selector did this,
// inline, for itself alone).
function comboboxAssignOptionIds(dropdownEl){
  [...dropdownEl.querySelectorAll('[role="option"]')].forEach((option,index)=>{
    option.id=`${dropdownEl.id}-option-${index}`;
  });
}
// Milestone 52J Decision 4: shared keyboard handler for the ward-selector /
// ward-name / convert-source combobox family (comboboxRenderDropdown()'s
// <div role="option"> items, each with a direct per-option mousedown
// listener). Extracted from onWardSelectorKeydown()'s complete
// implementation -- the only one of the four comboboxes with full
// Up/Down/Home/End/Enter support before this delivery; ward-name and
// convert-source had Escape only (plus a bare preventDefault on Enter for
// convert-source), a real capability gap for a keyboard-only or
// screen-reader user, which this closes.
//
// The county combobox (:1502 onCountyKeydown, near :1448
// countyAutocompleteHTML) is deliberately NOT switched to this, despite
// very similar logic (same comboIndex/aria-activedescendant bookkeeping,
// same Enter-dispatches-a-mousedown commit trick): it renders <button>
// options through its own filterCountyDropdown()/data-form-mousedown
// delegation, not comboboxRenderDropdown(), and hides via a CSS class
// toggle (hideCountyDropdown()), not this function's inline
// style.display. Wiring county to a hide callback hardcoded to
// comboboxHide() would set an inline style that filterCountyDropdown()
// never clears on reopen, permanently hiding the dropdown after the first
// Escape -- confirmed by reading both hide paths, not assumed. County
// already has full keyboard nav (Milestone 50H), so there is no
// capability gap to close there, only a code-shape win not worth that
// risk. See MILESTONE-52-PROPOSAL.md's 52J section.
function bindComboboxKeyboardNav(input,dropdown,{onEnterWithNoSelection,hide=comboboxHide}={}){
  return function comboboxKeydownHandler(e){
    const options=[...dropdown.querySelectorAll('[role="option"]')];
    if(e.key==='Escape'){
      hide(dropdown);
      input.dataset.comboIndex='';
      input.removeAttribute('aria-activedescendant');
      input.setAttribute('aria-expanded','false');
    }
    else if(e.key==='ArrowDown'||e.key==='ArrowUp'){
      e.preventDefault();
      if(!options.length)return;
      const current=Number.parseInt(input.dataset.comboIndex,10);
      const next=Number.isInteger(current)
        ? (e.key==='ArrowDown' ? Math.min(current+1,options.length-1) : Math.max(current-1,0))
        : (e.key==='ArrowDown' ? 0 : options.length-1);
      input.dataset.comboIndex=String(next);
      input.setAttribute('aria-activedescendant',options[next].id);
      options.forEach((option,index)=>option.setAttribute('aria-selected',String(index===next)));
    }
    else if(e.key==='Home'||e.key==='End'){
      e.preventDefault();
      if(!options.length)return;
      const next=e.key==='Home'?0:options.length-1;
      input.dataset.comboIndex=String(next);
      input.setAttribute('aria-activedescendant',options[next].id);
      options.forEach((option,index)=>option.setAttribute('aria-selected',String(index===next)));
    }
    else if(e.key==='Enter'){
      e.preventDefault();
      const current=Number.parseInt(input.dataset.comboIndex,10);
      if(Number.isInteger(current)&&options[current]){
        options[current].dispatchEvent(new MouseEvent('mousedown',{bubbles:true}));
      }else{
        hide(dropdown);
        input.setAttribute('aria-expanded','false');
        if(onEnterWithNoSelection)onEnterWithNoSelection();
      }
    }
  };
}

// Active Ward combobox: lets you type a ward's name to filter/select it, or
// click into the field to see every ward as a dropdown — same as the plain
// picker before it, just also typeable.
function wardSelectorItems(){
  return caseFile.wards.map(w=>({
    wardId:w.wardId,
    label:w.wardName||'(unnamed)',
    sub:window.GuardianFormsLegacyBridge.INVENTORY_TYPES[w.inventoryType]?.name||w.inventoryType
  }));
}
function wardSelectorShowDropdown(query){
  const input=document.getElementById('ward-selector');
  const dropdown=document.getElementById('ward-selector-dropdown');
  const items=comboboxFilterItems(wardSelectorItems(),query);
  comboboxRenderDropdown(dropdown,items,item=>{
    input.value=item.label;
    input.dataset.wardId=item.wardId;
    input.dataset.comboIndex='';
    input.removeAttribute('aria-activedescendant');
    input.setAttribute('aria-expanded','false');
    comboboxHide(dropdown);
    // Picking an option switches the filing outright. It used to only stage a
    // choice that the separate Switch Filing button consumed, so selecting an
    // entry by mouse or by ArrowDown+Enter left the active filing unchanged.
    if(item.wardId)switchWard(item.wardId);
  });
  [...dropdown.querySelectorAll('[role="option"]')].forEach((option,index)=>{
    option.id=`ward-selector-option-${index}`;
  });
  input.dataset.comboIndex='';
  input.setAttribute('aria-expanded','true');
}
function onWardSelectorInput(){
  const input=document.getElementById('ward-selector');
  input.dataset.wardId='';
  input.removeAttribute('aria-activedescendant');
  wardSelectorShowDropdown(document.getElementById('ward-selector').value);
}
function onWardSelectorFocus(){
  // Focusing (rather than typing) shows every ward, even though the field
  // is pre-filled with the current ward's name — that text isn't a filter
  // yet, it's just what's active.
  wardSelectorShowDropdown('');
}
// Milestone 52J: thin wrapper kept under this exact name -- shell-events.js
// calls window.onWardSelectorKeydown(event) by name via its own delegated
// listener, so the id lookups stay here (fresh each call, matching every
// other handler in this file) rather than baking input/dropdown into a
// closure created once at script-parse time.
function onWardSelectorKeydown(e){
  const input=document.getElementById('ward-selector');
  const dropdown=document.getElementById('ward-selector-dropdown');
  bindComboboxKeyboardNav(input,dropdown,{onEnterWithNoSelection:handleSwitchWardClick})(e);
}
document.addEventListener('click',e=>{
  const wrap=document.getElementById('ward-selector-wrap');
  if(wrap&&!wrap.contains(e.target)){
    comboboxHide(document.getElementById('ward-selector-dropdown'));
    document.getElementById('ward-selector')?.setAttribute('aria-expanded','false');
  }
});

async function handleSwitchWardClick(){
  const input=document.getElementById('ward-selector');
  if(!input)return;
  let wardId=input.dataset.wardId||'';
  if(!wardId&&input.value.trim()){
    // Typed a name without picking from the dropdown — resolve it directly
    // if exactly one ward matches; otherwise show the dropdown to disambiguate.
    const q=input.value.trim().toLowerCase();
    const matches=caseFile.wards.filter(w=>(w.wardName||'').trim().toLowerCase()===q);
    if(matches.length===1){
      wardId=matches[0].wardId;
    }else{
      wardSelectorShowDropdown(input.value);
      return;
    }
  }
  if(!wardId)return;
  if(wardId===caseFile.activeWardId){
    showSwitchWardPickerModal();
    return;
  }
  await switchWard(wardId);
}

async function showSwitchWardPickerModal(){
  await ensureFragment('common-modals');
  const current=caseFile.wards.find(w=>w.wardId===caseFile.activeWardId);
  const nameEl=document.getElementById('switch-ward-picker-current-name');
  if(nameEl)nameEl.textContent=current&&current.wardName?`"${current.wardName}"`:'This ward';
  const listEl=document.getElementById('switch-ward-picker-list');
  const others=caseFile.wards.filter(w=>w.wardId!==caseFile.activeWardId);
  if(!others.length){
    listEl.innerHTML='<div class="dashboard-empty-inline">You only have one ward — nothing to switch to yet.</div>';
  }else{
    listEl.innerHTML=others.map(w=>{
      const typeLabel=window.GuardianFormsLegacyBridge.INVENTORY_TYPES[w.inventoryType]?.name||w.inventoryType;
      return `<button type="button" class="recent-ward-item" data-modal-action="switch-ward" data-ward-id="${esc(w.wardId)}">
        <span class="recent-ward-icon">${typeIcon(w.inventoryType,16)}</span>
        <span class="recent-ward-info">
          <span class="recent-ward-name">${esc(w.wardName||'(unnamed)')}${w.archived?' <span class="badge bg-secondary ward-card-badge">Closed</span>':''}</span>
          <span class="recent-ward-type">${esc(typeLabel)}</span>
        </span>
      </button>`;
    }).join('');
  }
  showModal('switchWardPickerModal');
}


// ═══════════════════════════════════════════════════════
// MODAL FUNCTIONS
// ═══════════════════════════════════════════════════════
function closeModal(modalId){
  const el=document.getElementById(modalId);
  if(el)el.classList.remove('show');
}

// Every modal showModal() is ever called with lives in the lazy
// 'common-modals' fragment (src/fragment-loader.js) -- the three overlays
// needed on every session (startup-choice, security-choice, unlock) are
// shown via direct classList manipulation elsewhere, never through this
// function. Fetched and appended into #lazy-fragment-host on first use only;
// _fragmentAppended memoizes so a repeat open doesn't re-fetch or re-append.
const _fragmentAppended={};
async function ensureFragment(name){
  if(_fragmentAppended[name])return;
  const content=await window.loadFragment(name);
  document.getElementById('lazy-fragment-host').appendChild(content);
  _fragmentAppended[name]=true;
}

async function showModal(modalId){
  await ensureFragment('common-modals');
  const el=document.getElementById(modalId);
  if(!el)throw new Error(`Modal element "${modalId}" not found`);
  el.classList.add('show');
}

// Fills a ward-name <datalist> with the distinct names already on file, so
// typing offers them as autocomplete. A ward routinely has several forms
// (Inventory, Annual, Plan...) under one name, hence the de-duplication —
// and matching an existing name exactly is what groups the filings together
// on the dashboard, so suggesting them guards against near-miss typos.
function populateWardNameSuggestions(datalistId){
  const dl=document.getElementById(datalistId);
  if(!dl)return;
  const names=[...new Set(caseFile.wards.map(w=>(w.wardName||'').trim()).filter(Boolean))]
    .sort((a,b)=>a.localeCompare(b));
  dl.innerHTML=names.map(n=>`<option value="${esc(n)}"></option>`).join('');
}

// Ward-name combobox for "Add Ward" / eligibility name fields: typing filters
// the existing ward names, and focusing the (still-empty) field shows all of
// them as a dropdown — picking one, rather than retyping, is what makes a new
// form group with an existing ward on the dashboard.
function wardNameComboItems(){
  const names=[...new Set(caseFile.wards.map(w=>(w.wardName||'').trim()).filter(Boolean))]
    .sort((a,b)=>a.localeCompare(b));
  return names.map(n=>({label:n}));
}
// onPick(name) fires after every change to the field's value — a click on a
// dropdown item, or a keystroke — so a caller can keep something else (e.g.
// the "Load Ward Info From" picker) in sync with whatever name is now typed.
function initWardNameCombobox(inputId,dropdownId,onPick){
  const input=document.getElementById(inputId);
  const dropdown=document.getElementById(dropdownId);
  if(!input||!dropdown||input.dataset.comboInit)return;
  input.dataset.comboInit='1';
  const show=()=>{
    comboboxRenderDropdown(dropdown,comboboxFilterItems(wardNameComboItems(),input.value),item=>{
      input.value=item.label;
      input.dataset.comboIndex='';
      input.removeAttribute('aria-activedescendant');
      input.setAttribute('aria-expanded','false');
      comboboxHide(dropdown);
      if(onPick)onPick(input.value);
    });
    // Milestone 52J: option ids scoped by this combobox's own dropdown id,
    // so aria-activedescendant has something real to point at -- ward-
    // selector keeps its own historical ward-selector-option-N scheme
    // (routes.spec.ts asserts that literal pattern); this one and
    // convert-source's use the shared helper since nothing depends on
    // their exact id strings.
    comboboxAssignOptionIds(dropdown);
    input.dataset.comboIndex='';
    input.setAttribute('aria-expanded','true');
  };
  input.addEventListener('focus',show);
  input.addEventListener('input',()=>{show();if(onPick)onPick(input.value);});
  // Milestone 52J Decision 4: was Escape-only. Now gains full Up/Down/
  // Home/End/Enter via the shared handler, matching the ward selector.
  input.addEventListener('keydown',bindComboboxKeyboardNav(input,dropdown));
  document.addEventListener('click',e=>{
    if(!input.contains(e.target)&&!dropdown.contains(e.target)){
      comboboxHide(dropdown);
      input.setAttribute('aria-expanded','false');
    }
  });
}




// showSimplifiedEligibilityModal: src/core/modals/filing-dialogs.js (Milestone 70, 70G).
function showSimplifiedEligibilityModal(name,carrySourceId){return window.GuardianFormsLegacyBridge.showSimplifiedEligibilityModal(name,carrySourceId);}






async function doGuardianSetup(){
  const name=document.getElementById('setup-guardian-name').value.trim();
  if(!name){await window.alertModal('Please enter your name');return;}
  caseFile.guardianName=name;
  caseFile.guardianEmail=document.getElementById('setup-guardian-email').value.trim();
  await saveData();
  updateSidebar();
  closeModal('guardianSetupModal');
}

// ═══════════════════════════════════════════════════════
// ROUTER — see src/core/navigation/router.js
// ═══════════════════════════════════════════════════════
// navigate(), renderPage() and the off-canvas sidebar drawer pair
// (toggleMobileSidebar/closeMobileSidebar) used to be declared here. They now
// live in src/core/navigation/router.js, which publishes all four on window.
// Bare calls to them elsewhere in this file resolve to those, because a
// top-level `function` here only ever created the same global property that
// router.js then assigned over.

// Computes each ward's headline "total" using its own inventory type's
// existing, already-correct totals logic — by briefly pointing window.D at
// that ward, reading the result, then restoring the real active ward.
// Safe because this all runs synchronously with no awaits in between, so no
// other code can observe window.D pointing at the wrong ward mid-computation.
function getWardHeadlineTotal(ward){
  if(!ward)return null;
  const previousD=window.D;
  window.D=ward;
  let total=null;
  try{
    if(ward.inventoryType==='guardian')total=calc.total();
    else if(ward.inventoryType==='simplified')total=calcTotals().remaining;
    else if(formEngine(ward.inventoryType)==='annual'){
      const t=calcTotalsAnnual(ward);
      total=(t.netAssetsFromD!==0 || (t.schD1_total||t.schD2_ward||t.schD3_ward||t.schD4_ward||t.schD5_total)) ? t.netAssetsFromD : (t.netAssets||0);
    }
  }catch(e){console.warn('Dashboard: could not compute total for ward',ward.wardId,e);}
  finally{window.D=previousD;}
  return total;
}


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
function syncActiveWardNameDisplay(){
  const inp=document.getElementById('ward-selector');
  if(inp&&window.D)inp.value=window.D.wardName||'';
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
function getPrimaryGuardianDisplayName(){
  const d=window.D;
  if(!d)return caseFile.guardianName||'';
  return d.guardian||d.guardianName||d.guardianNames
    ||(Array.isArray(d.guardians)&&d.guardians[0]&&d.guardians[0].name)
    ||caseFile.guardianName||'';
}
// Same "sync just this one element" reasoning as syncActiveWardNameDisplay()
// above -- typing in a guardian-name field never triggers a full
// updateSidebar() rebuild, so this is wired into every place one of those
// fields can actually be edited instead.
function syncGuardianNameDisplay(){
  const el=document.getElementById('guardian-name-display');
  if(el)el.textContent=`Guardian: ${getPrimaryGuardianDisplayName()||'—'}`;
}

function refreshWardInfoCard(){
  const wardInfo=document.getElementById('ward-info-display');
  if(!wardInfo)return;
  const ward=getActiveWard();
  if(!ward){
    wardInfo.style.display='none';
    wardInfo.innerHTML='';
    return;
  }
  const meta=window.GuardianFormsLegacyBridge.INVENTORY_TYPE_META[ward.inventoryType]||{iconName:'folder',accent:'#525d6e',accentText:'var(--ink-3)',totalLabel:'Total'};
  const headline=getWardHeadlineTotal(ward);
  wardInfo.style.display='block';
  wardInfo.style.borderLeftColor=meta.accent;
  // ?. guard: an unregistered type here would throw and blank the sidebar.
  const typeName=window.GuardianFormsLegacyBridge.INVENTORY_TYPES[ward.inventoryType]?.name||ward.inventoryType;
  // Non-financial types (Plans) have no total worth showing — the progress
  // bar rendered just below already is the meaningful headline, so the
  // dollar lines are dropped rather than shown as an empty "—".
  const totalHTML=meta.financial===false?''
    :`<div class="ward-info-total-label">${esc(meta.totalLabel)}</div>
      <div class="ward-info-total">${formatDashboardCurrency(headline)}</div>`;
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
function collapseWardControls(){}
window.collapseWardControls=collapseWardControls;

// Same pattern as the ward controls above, for the backup/auto-save block
// at the bottom of the sidebar: collapses automatically once a form is
// active, leaving just the two status lines (last-saved / auto-save-armed)
// visible, so the schedule list gets the room back at both ends of the
// sidebar rather than just the top. #save-controls-body is one plain div
// toggled as a unit -- see the HTML comment above it for why not per-child.
let _saveControlsCollapsed=false;
let _saveControlsUserToggled=false;
function applySaveControlsCollapsedState(){
  const body=document.getElementById('save-controls-body');
  if(body)body.style.display=_saveControlsCollapsed?'none':'';
  const btn=document.getElementById('save-controls-toggle-btn');
  if(!btn)return;
  btn.textContent=_saveControlsCollapsed?'Show save controls ▾':'Hide save controls ▴';
  btn.setAttribute('aria-expanded',String(!_saveControlsCollapsed));
}
function collapseSaveControls(){
  _saveControlsCollapsed=true;
  _saveControlsUserToggled=true;
  applySaveControlsCollapsedState();
}
function toggleSaveControls(){
  _saveControlsCollapsed=!_saveControlsCollapsed;
  _saveControlsUserToggled=true;
  applySaveControlsCollapsedState();
}
window.collapseSaveControls=collapseSaveControls;

function updateSidebar(){
  const sidebar=document.getElementById('sidebar');
  if(caseFile.wards.length===0){
    sidebar.style.display='none';
    return;
  }
  sidebar.style.display='';

  // Update guardian name
  syncGuardianNameDisplay();

  // Update ward selector
  const selector=document.getElementById('ward-selector');
  const activeWardId=caseFile.activeWardId;
  const activeWard=caseFile.wards.find(w=>w.wardId===activeWardId);
  selector.value=activeWard?activeWard.wardName:'';
  selector.dataset.wardId=activeWardId||'';

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

  if(!activeInventoryType){
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
  const typeConfig=window.GuardianFormsLegacyBridge.INVENTORY_TYPES[activeInventoryType];
  // The header keeps the product name; the active form type gets its own
  // strip beneath it so the app is always identifiable.
  const ctx=document.getElementById('sidebar-context');
  if(ctx){
    ctx.style.display='flex';
    document.getElementById('sidebar-context-icon').innerHTML=
      typeIcon(activeInventoryType,13);
    document.getElementById('sidebar-context-label').textContent=typeConfig.name;
  }
  const navContainer=document.getElementById('nav-sections');

  switch(formEngine(activeInventoryType)){
    case 'guardian': mountGuardianNav(navContainer);break;
    case 'simplified': mountSimplifiedNav(navContainer);break;
    case 'annual': mountAnnualNav(navContainer);break;
    case 'planSimplified': mountPlanSimplifiedNav(navContainer);break;
    case 'planAnnual': mountPlanAnnualNav(navContainer);break;
    case 'planInitial': mountPlanInitialNav(navContainer);break;
    case 'planMinor': mountPlanMinorNav(navContainer);break;
  }
}

// ═══════════════════════════════════════════════════════
// CONVERT EXISTING WARD — creates a new ward of a different inventory type,
// carrying over header info always, and schedule/asset data wherever the
// source and target types have a genuine real-world equivalent. See the
// per-pair functions below for exactly what maps where and why.
// ═══════════════════════════════════════════════════════

document.addEventListener('click',e=>{
  const wrap=document.getElementById('convert-source-ward-wrap');
  if(wrap&&!wrap.contains(e.target)){
    comboboxHide(document.getElementById('convert-source-ward-dropdown'));
    document.getElementById('convert-source-ward')?.setAttribute('aria-expanded','false');
  }
});











// ═══════════════════════════════════════════════════════
// MULTI-YEAR ACCOUNTING (save / switch / edit by year)
// ═══════════════════════════════════════════════════════



















// ═══════════════════════════════════════════════════════
// INVENTORY TYPE SELECTOR PAGE
// ═══════════════════════════════════════════════════════
// Milestone 62 hid the Comment Card link on the dashboard toolbar for the
// initial test rollout (#820024), intending to reinstate it later. This page
// carries the identical link (same URL, same label) and was left rendering
// unconditionally -- a gap Milestone 65D closes by putting both surfaces
// behind one shared flag, set once here, so a future reinstate is one flip
// instead of two. The markup (and the GovQA URL user-guide-drift-guard.spec.js
// once scanned for, before help/index.html stopped mentioning the hidden
// control) stays in source either way.
const SHOW_COMMENT_CARD_LINK = false;
window.SHOW_COMMENT_CARD_LINK = SHOW_COMMENT_CARD_LINK;

function pageInventorySelector(){
  const commentCardLink = SHOW_COMMENT_CARD_LINK
    ? `<a class="topnav-btn" href="https://pinellascountyfl.govqa.us/WEBAPP/_rs/(S(ymqkyi4ihgwnngmluraqqkeh))/RequestOpen.aspx?sSessionID=&rqst=23" target="_blank" rel="noopener noreferrer">${ic('message',16)} Comment Card<span class="visually-hidden"> (opens in a new tab)</span></a>`
    : '';
  return `<div style="max-width:900px;margin:0 auto;">
  <h1 style="font-size:1.8rem;color:var(--ink);margin-bottom:2rem;text-align:center;">Start New Form</h1>
  <p style="text-align:center;color:var(--ink-3);margin-bottom:2rem;font-size:.95rem;">Select the form type for a ward. You can manage multiple wards of different types.</p>
  <div class="feedback-entry-actions" aria-label="Beta feedback">
    <button type="button" class="topnav-btn" data-feedback-open="bug">${ic('bug',16)} Report a Bug</button>
    ${commentCardLink}
  </div>
  <div class="inventory-selector">
    <div class="inventory-card" data-form-action="add-ward-type" data-inventory-type="guardian" role="button" tabindex="0" aria-label="Create Initial Inventory ward">
      <h2><svg class="ic" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M9 4.6H7.2a1.6 1.6 0 0 0-1.6 1.6V19a1.6 1.6 0 0 0 1.6 1.6h9.6A1.6 1.6 0 0 0 18.4 19V6.2a1.6 1.6 0 0 0-1.6-1.6H15"/><rect x="9" y="3" width="6" height="3.4" rx="1.1"/></svg> Initial Inventory</h2>
      <p>${window.GuardianFormsLegacyBridge.INVENTORY_TYPES.guardian.description}</p>
      <span class="btn btn-primary btn-sm" aria-hidden="true">Create Form for a Ward</span>
    </div>
    <div class="inventory-card" data-form-action="add-ward-type" data-inventory-type="simplified" role="button" tabindex="0" aria-label="Create Simplified Accounting ward">
      <h2><svg class="ic" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M6 3.6h12v17l-3-1.8-3 1.8-3-1.8-3 1.8Z"/><path d="M9.2 8.4h5.6M9.2 12.4h5.6"/></svg> Simplified Accounting</h2>
      <p>${window.GuardianFormsLegacyBridge.INVENTORY_TYPES.simplified.description}</p>
      <span class="btn btn-primary btn-sm" aria-hidden="true">Create Form for a Ward</span>
    </div>
    <div class="inventory-card" data-form-action="add-ward-type" data-inventory-type="annual" role="button" tabindex="0" aria-label="Create Annual Accounting ward">
      <h2><svg class="ic" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M4.2 20h15.6"/><path d="M7.4 20v-6.4M12 20V5.6M16.6 20v-9.2"/></svg> Annual Accounting</h2>
      <p>${window.GuardianFormsLegacyBridge.INVENTORY_TYPES.annual.description}</p>
      <span class="btn btn-primary btn-sm" aria-hidden="true">Create Form for a Ward</span>
    </div>
    <div class="inventory-card" data-form-action="add-ward-type" data-inventory-type="finalAccounting" role="button" tabindex="0" aria-label="Create Final Accounting ward">
      <h2><svg class="ic" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M4.2 20h15.6"/><path d="M7.4 20v-6.4M12 20V5.6M16.6 20v-9.2"/><path d="m15.8 4.4 1.7 1.7 3.1-3.2"/></svg> Final Accounting</h2>
      <p>${window.GuardianFormsLegacyBridge.INVENTORY_TYPES.finalAccounting.description}</p>
      <span class="btn btn-primary btn-sm" aria-hidden="true">Create Form for a Ward</span>
    </div>
    <div class="inventory-card" data-form-action="add-ward-type" data-inventory-type="trustAccounting" role="button" tabindex="0" aria-label="Create Trust Accounting ward">
      <h2><svg class="ic" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M4.6 9.4 12 4.2l7.4 5.2"/><path d="M6.6 10.8v7.4M11 10.8v7.4M15.4 10.8v7.4M19.8 10.8v7.4"/><path d="M4.2 20.2h15.6"/></svg> Trust Accounting</h2>
      <p>${window.GuardianFormsLegacyBridge.INVENTORY_TYPES.trustAccounting.description}</p>
      <span class="btn btn-primary btn-sm" aria-hidden="true">Create Form for a Ward</span>
    </div>
    <div class="inventory-card" data-form-action="add-ward-type" data-inventory-type="planInitial" role="button" tabindex="0" aria-label="Create Initial Guardianship Plan ward">
      <h2><svg class="ic" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M12 3.4 5.2 6.1v5.3c0 4.2 2.9 8.1 6.8 9.2 3.9-1.1 6.8-5 6.8-9.2V6.1Z"/><path d="M12 8v5.4M12 16.4v.1"/></svg> Initial Guardianship Plan</h2>
      <p>${window.GuardianFormsLegacyBridge.INVENTORY_TYPES.planInitial.description}</p>
      <span class="btn btn-primary btn-sm" aria-hidden="true">Create Form for a Ward</span>
    </div>
    <div class="inventory-card" data-form-action="add-ward-type" data-inventory-type="planSimplified" role="button" tabindex="0" aria-label="Create Simplified Annual Plan ward">
      <h2><svg class="ic" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M12 3.4 5.2 6.1v5.3c0 4.2 2.9 8.1 6.8 9.2 3.9-1.1 6.8-5 6.8-9.2V6.1Z"/><path d="m9.4 12.1 1.9 1.9 3.4-3.6"/></svg> Simplified Annual Plan</h2>
      <p>${window.GuardianFormsLegacyBridge.INVENTORY_TYPES.planSimplified.description}</p>
      <span class="btn btn-primary btn-sm" aria-hidden="true">Create Form for a Ward</span>
    </div>
    <div class="inventory-card" data-form-action="add-ward-type" data-inventory-type="planAnnual" role="button" tabindex="0" aria-label="Create Annual Guardianship Plan ward">
      <h2><svg class="ic" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M12 3.4 5.2 6.1v5.3c0 4.2 2.9 8.1 6.8 9.2 3.9-1.1 6.8-5 6.8-9.2V6.1Z"/><path d="M9.2 10.6h5.6M9.2 13.6h5.6"/></svg> Annual Guardianship Plan</h2>
      <p>${window.GuardianFormsLegacyBridge.INVENTORY_TYPES.planAnnual.description}</p>
      <span class="btn btn-primary btn-sm" aria-hidden="true">Create Form for a Ward</span>
    </div>
    <div class="inventory-card" data-form-action="add-ward-type" data-inventory-type="planMinor" role="button" tabindex="0" aria-label="Create Annual Plan — Minors ward">
      <h2><svg class="ic" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M12 3.4 5.2 6.1v5.3c0 4.2 2.9 8.1 6.8 9.2 3.9-1.1 6.8-5 6.8-9.2V6.1Z"/><circle cx="12" cy="9.8" r="1.6"/><path d="M9.4 15.2c0-1.6 1.2-2.6 2.6-2.6s2.6 1 2.6 2.6"/></svg> Annual Plan — Minors</h2>
      <p>${window.GuardianFormsLegacyBridge.INVENTORY_TYPES.planMinor.description}</p>
      <span class="btn btn-primary btn-sm" aria-hidden="true">Create Form for a Ward</span>
    </div>
  </div>

  <div class="summary-box mt-4">
    <h2 class="subsection-heading">About Guardian Forms</h2>
    <p style="font-size:.88rem;color:var(--ink-2);line-height:1.5;">Guardian Forms helps guardians — and the attorneys who assist them — prepare the court-required filings for Florida guardianship cases. It walks you through each required field, calculates totals automatically, and produces a filing-ready PDF or the official Clerk of Court Excel template.</p>

    <h2 class="subsection-heading mt-3">Who Should Use This</h2>
    <p style="font-size:.88rem;color:var(--ink-2);line-height:1.5;">Guardians of the <strong>property</strong>, who file an <strong>Initial Inventory</strong>, a <strong>Simplified Annual Accounting</strong>, or a full <strong>Annual Accounting</strong> — and guardians of the <strong>person</strong>, who file a <strong>Plan</strong> reporting on the ward's residence, care, and wellbeing. If you are guardian of both, you file one of each; create a separate form for each filing and give them the same case number, and the dashboard will keep them together.</p>

    <h2 class="subsection-heading mt-3">Which Type Do I Need?</h2>
    <ul style="font-size:.88rem;color:var(--ink-2);line-height:1.6;padding-left:1.2rem;">
      <li><strong>Initial Inventory</strong> — the initial inventory of the ward's assets, filed as of the Guardianship Inception Date. Every new guardianship of property starts here.</li>
      <li><strong>Simplified Annual Accounting</strong> — a short-form yearly accounting, but only when <strong>all</strong> estate property is held in a designated depository under Fla. Stat. § 69.031 and the <strong>only</strong> account activity is interest accrual, settlement deposits, or service charges. The app asks two qualifying questions when you create this type of form and will route you to a standard Annual Accounting automatically if the guardianship doesn't qualify.</li>
      <li><strong>Annual Accounting</strong> — the full yearly accounting with detailed schedules, required whenever the simplified form doesn't apply.</li>
      <li><strong>Simplified Annual Plan</strong> — the short yearly report on the ward as a person: where they have lived, the medical care they received, their diagnosis, social activities, and whether any rights should be restored. This is a <em>separate filing</em> from the accountings above and reports on care rather than money.</li>
    </ul>

    <h2 class="subsection-heading mt-3">Getting Started</h2>
    <ol style="font-size:.88rem;color:var(--ink-2);line-height:1.6;padding-left:1.2rem;">
      <li>Click <strong>Create Form for a Ward</strong> above and choose the correct type for what you're filing.</li>
      <li>Work through each section using the sidebar — required fields are marked with a red <span class="req">*</span> and a checkmark appears next to each section once it's complete.</li>
      <li>Use <strong>Preview &amp; Export</strong> to review the filing-ready document, then save it as a PDF or Excel file.</li>
      <li>You can manage multiple wards at once and switch between them from the sidebar at any time.</li>
    </ol>

    <p style="font-size:.8rem;color:var(--ink-3);margin-top:1rem;margin-bottom:0;">Your work is saved automatically on this device as you go. Nothing is uploaded to a server.</p>
  </div>
  </div>`;
}

async function showAddWardModalForType(type){
  if(type==='simplified'){
    showSimplifiedEligibilityModal('');
    return;
  }
  await ensureFragment('common-modals');
  document.getElementById('new-ward-name').value='';
  populateWardNameSuggestions('ward-name-suggestions');
  initWardNameCombobox('new-ward-name','new-ward-name-dropdown',()=>updateCarrySourcePicker());
  document.getElementById('new-ward-type').value=type;
  updateCarrySourcePicker();
  document.getElementById('new-ward-name').focus();
  showModal('addWardModal');
}

// ═══════════════════════════════════════════════════════
// WIZARD: GUARDIAN INVENTORY
// ═══════════════════════════════════════════════════════


// Simplified Accounting is extracted into src/features/simplified-accounting/
// (Milestone 2, Phase D) -- these two bridges dynamically import it, cache
// the module, and delegate. See src/features/simplified-accounting/index.js
// for the module itself; see the Milestone 2 plan's "Problem 2" (and the
// Milestone 3 plan's "Problem 2", which generalized this into
// window.createFeatureBridge once a second feature proved the shape was
// genuinely duplicated) for why this hand-rolled bridge exists instead of
// INDEX-SPLIT-PLAN.md's full staging-host router (that router arbitrates
// between several *concurrently competing* lazy features -- this app never
// mounts two features racing for the same container, since switchWard()
// always fully changes the active ward before any render happens).
//
// Routed through window.loadSimplifiedFeature (src/features-loader.js)
// rather than a direct import() here -- this file is an opaque classic-
// script static passthrough Vite never processes, so a dynamic import()
// written directly in this file would be invisible to Vite's build and the
// target files would simply be missing from dist/web and dist/portable. See
// features-loader.js's own comment for the full reasoning, including why
// dist/portable specifically needs this.
//
// window.createFeatureBridge() itself must NOT be called at this file's top
// level: legacy-app.js is a classic, parser-blocking <script src> that runs
// synchronously as the parser reaches it, while `<script type="module">`
// tags (core/feature-bridge.js included) are implicitly deferred and don't
// execute until after the whole document has finished parsing -- strictly
// AFTER this file's top-level code runs, even though they appear earlier in
// index.html. window.createFeatureBridge is not yet a function at that
// point. Constructing the bridge lazily, on first actual call, sidesteps
// that -- the same safe pattern window.loadFragment/window.emptyDataSimplified
// already use.
//
// Milestone 40G correction: this comment used to claim the first call
// "only happens later, in response to user navigation, long after the
// deferred module scripts have run." That was false for any feature mounted
// during startup. The dashboard is the landing page, so its bridge was
// constructed inside initApp()'s first renderPage() and threw
// "window.createFeatureBridge is not a function" on every load. Laziness
// cannot help a feature that is mounted immediately. Startup is now driven
// from src/main.js after module evaluation, which is what actually
// guarantees the ordering -- do not reintroduce a top-level initApp() call
// here, and do not assume a lazy bridge is safe merely because it is lazy.
let _simplifiedFeatureBridge=null;
function getSimplifiedFeatureBridge(){
  return _simplifiedFeatureBridge??=window.createFeatureBridge(()=>window.loadSimplifiedFeature());
}
async function mountSimplifiedFeature(page){
  await getSimplifiedFeatureBridge().mountPage(document.getElementById('main-content'),page);
}
async function mountSimplifiedNav(container){
  await getSimplifiedFeatureBridge().mountNav(container);
}

// ═══════════════════════════════════════════════════════
// Annual Accounting is extracted into src/features/annual-accounting/
// (Milestone 7, Phase A -- data/pages/nav/validate; print/PDF/Excel export
// stay here as legacy until Phase B). Also covers the finalAccounting/
// trustAccounting aliases -- formEngine() maps all three to 'annual'
// everywhere the app dispatches on type, so this one bridge serves all
// three ward types with no per-alias branching anywhere.
//
// window.createFeatureBridge() is constructed lazily, not at this file's
// top level -- see getSimplifiedFeatureBridge()'s comment (above) for why.
let _annualFeatureBridge=null;
function getAnnualFeatureBridge(){
  return _annualFeatureBridge??=window.createFeatureBridge(()=>window.loadAnnualFeature());
}
async function mountAnnualFeature(page){
  await getAnnualFeatureBridge().mountPage(document.getElementById('main-content'),page);
}
async function mountAnnualNav(container){
  await getAnnualFeatureBridge().mountNav(container);
}

// buildNavAnnual()..pagePart11Annual()/validateAnnual() moved to
// src/features/annual-accounting/index.js (Milestone 7, Phase A).

// Guardian Inventory's page/nav/validation/row UI moved to
// src/features/guardian-inventory/index.js (Milestone 8, Phases A and B --
// print/PDF/Excel import-export now live in that feature's print.js/
// excel.js too). Shared Excel helpers (excelCapacityPanel(), ensureTemplate()
// -- checkExcelCapacity() moved to core in Milestone 51F),
// openFloridaCourtPortal(), and dashboard calc/mk stay legacy -- shared
// with Annual/Simplified or needed synchronously before this feature loads.
let _guardianFeatureBridge=null;
function getGuardianFeatureBridge(){
  return _guardianFeatureBridge??=window.createFeatureBridge(()=>window.loadGuardianFeature());
}
async function mountGuardianFeature(page){
  await getGuardianFeatureBridge().mountPage(document.getElementById('main-content'),page);
}
async function mountGuardianNav(container){
  await getGuardianFeatureBridge().mountNav(container);
}
async function ensureGuardianFeatureReady(){
  if(typeof window.loadGuardianFeature!=='function'){
    await new Promise(resolve=>document.addEventListener('features-loader-ready',resolve,{once:true}));
  }
  await window.loadGuardianFeature();
}

// Dashboard's own rendering (pageDashboard()..toggleWardArchived(),
// getWardProgress()) moved to src/features/dashboard/index.js (Milestone
// 9). Ward-management CRUD (addWard, switchWard, deleteWard, convertWard,
// all modals, year management) stays legacy: it's called from the topnav on
// every page, not just the dashboard, so gating it behind this feature's lazy
// load would break "Switch Ward"/"+ New Form" on every other page.
// getWardHeadlineTotal(), typeIcon() and INVENTORY_TYPE_META also stay legacy
// for the same reason -- refreshWardInfoCard() and the ward-selector dropdown
// need them on every page too. (formatDashboardCurrency() was in that list
// until Milestone 70's 70B moved it to src/core/format/money.js, which loads
// eagerly; renameWard and its dialog went in 70B too, unreachable since the
// Milestone 36 dashboard consolidation, e5fb9cf, removed the button.)
let _dashboardFeatureBridge=null;
function getDashboardFeatureBridge(){
  return _dashboardFeatureBridge??=window.createFeatureBridge(()=>window.loadDashboardFeature());
}
async function mountDashboardFeature(page){
  await getDashboardFeatureBridge().mountPage(document.getElementById('main-content'),page);
}


// ── Plan form controls ───────────────────────────────────








// ═══════════════════════════════════════════════════════
// Simplified Annual Plan is extracted into src/features/plan-simplified/
// (Milestone 3, Phases B and C -- data/validation/pages, and print/PDF
// export). See src/features/simplified-accounting/index.js's header
// comment and the Milestone 3 plan for the pattern and reasoning. txtP/
// chkP/yesNoCheckboxS/radioP/pageNavS above stay here as legacy globals,
// reached via window by every extracted Plan module (Problem 3) -- with
// planMinor extracted in Milestone 6, all four Plan types now share them
// this way, and moving them into a shared core module is a separate
// restructuring not required by this milestone.
// ═══════════════════════════════════════════════════════
// window.createFeatureBridge() is constructed lazily, not at this file's
// top level -- see getSimplifiedFeatureBridge()'s comment above for why
// (module <script> tags are deferred and run after this classic script's
// top-level code, so window.createFeatureBridge isn't a function yet then).
let _planSimplifiedFeatureBridge=null;
function getPlanSimplifiedFeatureBridge(){
  return _planSimplifiedFeatureBridge??=window.createFeatureBridge(()=>window.loadPlanSimplifiedFeature());
}
async function mountPlanSimplifiedFeature(page){
  await getPlanSimplifiedFeatureBridge().mountPage(document.getElementById('main-content'),page);
}
async function mountPlanSimplifiedNav(container){
  await getPlanSimplifiedFeatureBridge().mountNav(container);
}

// ═══════════════════════════════════════════════════════
// Annual Guardianship Plan is extracted into src/features/plan-annual/
// (Milestone 4, Phases A and B -- data/validation/pages, and print/PDF
// export). See src/features/plan-simplified/index.js's header comment and
// the Milestone 4 plan for the pattern and reasoning. planQ/planCheckGroup
// immediately below, and planEmptyRow/addPlanRow/removePlanRow/
// duplicatePlanRow further down, stay here as legacy globals -- despite
// sitting in what reads as "this section," they are not planAnnual-
// exclusive (Milestone 4 plan's "Design decisions"), and with planMinor
// extracted in Milestone 6 all four Plan types now reach them via window.
//
// window.createFeatureBridge() is constructed lazily, not at this file's
// top level -- see getSimplifiedFeatureBridge()'s comment (above, in the
// Simplified Accounting section) for why.
let _planAnnualFeatureBridge=null;
function getPlanAnnualFeatureBridge(){
  return _planAnnualFeatureBridge??=window.createFeatureBridge(()=>window.loadPlanAnnualFeature());
}
async function mountPlanAnnualFeature(page){
  await getPlanAnnualFeatureBridge().mountPage(document.getElementById('main-content'),page);
}
async function mountPlanAnnualNav(container){
  await getPlanAnnualFeatureBridge().mountNav(container);
}


// pagePlanACover()..pagePlanASignatures() moved to
// src/features/plan-annual/index.js (Milestone 4, Phase A).


// validatePlanAnnual() moved to src/features/plan-annual/index.js
// (Milestone 4, Phase A).

// docHeaderPlanSimplified()/buildPrintHTMLPlanSimplified() moved to
// src/features/plan-simplified/print.js (Milestone 3, Phase C).

// ── Pre-filing readiness check ───────────────────────────
// planReadinessChecks()/planReadinessPanel() -- the four Plan types' hand-
// maintained checklist dispatcher and always-expanded panel -- were replaced
// by the shared readiness card in Milestone 44C: predicates live in
// src/core/filing/readiness-config.js, rendering in readiness-card.js.

// pagePrintPlanSimplified()/doSavePdfPlanSimplified() moved to
// src/features/plan-simplified/print.js (Milestone 3, Phase C).

// docHeaderPlanAnnual()/buildPrintHTMLPlanAnnual()/pagePrintPlanAnnual()/
// doSavePdfPlanAnnual() moved to src/features/plan-annual/print.js
// (Milestone 4, Phase B). The lazy module bridge in that feature's index.js
// exposes doSavePdfPlanAnnual on window so the print page's
// onclick="doSavePdfPlanAnnual()" still resolves.

// ═══════════════════════════════════════════════════════
// Initial Guardianship Plan is extracted into src/features/plan-initial/
// (Milestone 5, Phase A -- data/validation/pages; print/PDF export stays
// here as legacy until Phase B). See src/features/plan-simplified/index.js's
// header comment and the Milestone 5 plan for the pattern and reasoning.
// planQ/planCheckGroup (defined above, in the Plan Annual section) and
// planEmptyRow/addPlanRow/removePlanRow/duplicatePlanRow (further below)
// stay legacy globals, reached via window (see the Plan Minor section
// below for why this no longer depends on any type being "not yet
// extracted"). INITIAL_ADLS/INITIAL_ADL_RATINGS/emptyInitialProvider stay
// legacy because computeNavChecks()'s planInitial branch reads them
// directly.
//
// window.createFeatureBridge() is constructed lazily, not at this file's
// top level -- see getSimplifiedFeatureBridge()'s comment (above, in the
// Simplified Accounting section) for why.
let _planInitialFeatureBridge=null;
function getPlanInitialFeatureBridge(){
  return _planInitialFeatureBridge??=window.createFeatureBridge(()=>window.loadPlanInitialFeature());
}
async function mountPlanInitialFeature(page){
  await getPlanInitialFeatureBridge().mountPage(document.getElementById('main-content'),page);
}
async function mountPlanInitialNav(container){
  await getPlanInitialFeatureBridge().mountNav(container);
}

// buildNavPlanInitial()..pagePlanIAttorney()/validatePlanInitial() moved to
// src/features/plan-initial/index.js (Milestone 5, Phase A).

// ═══════════════════════════════════════════════════════
// Annual Plan -- Minors is extracted into src/features/plan-minor/
// (Milestone 6, Phases A and B -- data/validation/pages, and print/PDF
// export). See src/features/plan-simplified/index.js's header comment and
// the Milestone 6 plan for the pattern and reasoning. This was the fourth
// and last Plan-family type, so planQ/planCheckGroup (defined above, in the
// Plan Annual section) and planEmptyRow/addPlanRow/removePlanRow/
// duplicatePlanRow (further below) now have no not-yet-extracted Plan type
// left to be shared with -- they stay legacy globals regardless, since
// every extracted Plan module already reaches them via window, and moving
// them into a shared core module is a separate restructuring not required
// by this milestone (see the Milestone 4/5 plans' deferred
// features/plans/ restructuring note).
//
// window.createFeatureBridge() is constructed lazily, not at this file's
// top level -- see getSimplifiedFeatureBridge()'s comment (above, in the
// Simplified Accounting section) for why.
let _planMinorFeatureBridge=null;
function getPlanMinorFeatureBridge(){
  return _planMinorFeatureBridge??=window.createFeatureBridge(()=>window.loadPlanMinorFeature());
}
async function mountPlanMinorFeature(page){
  await getPlanMinorFeatureBridge().mountPage(document.getElementById('main-content'),page);
}
async function mountPlanMinorNav(container){
  await getPlanMinorFeatureBridge().mountNav(container);
}

// buildNavPlanMinor()..pagePlanMPreparerAttorney()/validatePlanMinor() moved
// to src/features/plan-minor/index.js (Milestone 6, Phase A).

function n(v){return parseFloat(v)||0;}
function pct(v){if(v===''||v===null||v===undefined)return 1;const p=parseFloat(v);return isNaN(p)?1:p>1?p/100:p;}

// calcTotalsAnnual() and annualReconcileState() moved to src/features/annual-accounting/totals.js (Milestone 19E).
// Eagerly loaded via src/features-loader.js to serve as the single source of truth across
// the dashboard, forms, preview, Excel export, and accessible PDF generation.


// fmtD()/fmtAnnual()/DISB_CATS/docHdr()/sl()/slR()/buildPrintHTMLAnnual()
// moved to src/features/annual-accounting/print.js (Milestone 7, Phase B).

// ═══════════════════════════════════════════════════════
// EXCEL TEMPLATE CAPACITY
// ═══════════════════════════════════════════════════════
// The official court .xlsx templates have a FIXED number of pre-formatted
// rows per schedule, and the export writes into those rows by position.
// Anything beyond the last row has nowhere to go — the export code simply
// skips it (`if(i<20){…}` with no else), which previously meant entries
// could vanish silently from a document filed with the court.
//
// These numbers mirror the guards in doSaveExcelAnnual()/…Simplified()
// exactly; if a template is ever swapped for one with more rows, update
// BOTH the export guard and the matching number here.
//
// Note this is an Excel-only limit: the PDF/print path renders every entry
// no matter how many there are, so overflow blocks the Excel button only
// and deliberately leaves PDF export available.
// Initial Inventory (feature-owned GUARDIAN_EXCEL_CAPS, in
// src/features/guardian-inventory/excel.js) overflows differently from the
// other two types: its fillScheduleXX() helpers walk a fixed list of
// template pages, and once the slots run out pageIdx runs past the end of
// pages[], so `pages[pageIdx].name` throws. The export then dies in its
// catch block and prints the raw TypeError into a status line that clears
// itself after three seconds — no file, no usable explanation. Same guard
// as the other types turns that into a clear, actionable message.

// Milestone 51F deleted this file's checkExcelCapacity() twin. It duplicated
// src/core/excel/excel-capacity.js's implementation of the same rule verbatim --
// the remuneration-filtering comment above was present, word for word, in both --
// and the two ran on different paths: the three feature index.js files
// destructured THIS one off `window` for the print-page capacity panel, while
// their sibling excel.js files reached the core one through
// getExcelCapacityIssues() for the export gate. A capacity rule that can
// disagree between the readiness panel and the export gate is exactly the class
// of defect AGENTS.md section 4's parity invariant exists to prevent, and nothing
// kept the two copies in step.
//
// The three index.js files now import the core version directly and pass
// window.D explicitly. It is a strict superset: it takes the data as an argument
// instead of reading the global implicitly, guards a null/non-object caps entry,
// and adds a `key` field to each overflow record. excelCapacityPanel() below
// reads only label/route/cap/count, so the extra field is inert, and every cap
// entry in all three CAPS tables defines a label, so core's `info.label || key`
// fallback can never differ from this version's plain info.label.



// pagePrintAnnual()/doSavePdfAnnual() moved to
// src/features/annual-accounting/print.js (Milestone 7, Phase B).


// doSaveExcelAnnual()/importExcelAnnual() moved to
// src/features/annual-accounting/excel.js (Milestone 7, Phase B).


// ═══════════════════════════════════════════════════════
// CALCULATIONS
// ═══════════════════════════════════════════════════════
// Guardian Inventory's calc.totalA1(), calc.wardVal(entry), ... live in
// src/features/guardian-inventory/totals.js since Milestone 70's 70B; this is
// the one-line wrapper this script's callers use (see COMMON HELPERS above).
const calc=new Proxy({},{get:(_,k)=>window.GuardianFormsLegacyBridge.calc[k]});


// ═══════════════════════════════════════════════════════
// SCHEDULE_NAV_KEYS, the Initial Inventory's schedule route keys, moved to
// src/core/filing/models/guardian.js with the completion evaluators (Milestone
// 70, 70D); this script reads it off the bridge where it uses it.
// A schedule's own "Next" button is disabled until computeNavChecks()
// says that schedule is complete (a real row, or the "no items" checkbox).
// afterChange() stays legacy in Milestone 8A and still needs this helper.
// ═══════════════════════════════════════════════════════
// FORM BINDING ENGINE
// ═══════════════════════════════════════════════════════
// setPath: src/core/form/paths.js (Milestone 70, 70F).
function setPath(obj,path,val){return window.GuardianFormsLegacyBridge.setPath(obj,path,val);}


// The sidebar's section marks for the open filing. Milestone 70's 70D moved
// the rules to src/core/status/completion.js -- one pure evaluator per engine,
// handed the filing explicitly -- and the registry dispatches to them; this
// hands them the open filing, this script's own activeInventoryType, and what
// they cannot import: the Initial Inventory's validator (its marks are
// bucketed from the export validator's own issues; it exists once that
// feature has loaded) and the Annual totals. getWardProgress() below hands the same. updateNavDots()
// applies the map to the page.
function computeNavChecks(){return window.GuardianFormsLegacyBridge.computeNavChecks(window.D,activeInventoryType,{validateGuardian:window.validateGuardian,calcTotalsAnnual,annualReconcileState});}

// updateNavDots: src/core/status/nav-marks.js (Milestone 70, 70F).
function updateNavDots(){return window.GuardianFormsLegacyBridge.updateNavDots();}


// Filing progress for any filing, open or not (the dashboard's cards). Since
// Milestone 70's 70D the evaluator takes the filing explicitly; this used to
// point window.D and activeInventoryType at the filing, reuse the sidebar's
// logic, and put them back.
function getWardProgress(ward){return window.GuardianFormsLegacyBridge.getWardProgress(ward,{validateGuardian:window.validateGuardian,calcTotalsAnnual,annualReconcileState});}








// ── helpers ────────────────────────────────────────────
// ═══════════════════════════════════════════════════════
// SCHEDULE SUPPORTING DOCUMENTS & COMMENTS
// ═══════════════════════════════════════════════════════
 // 15MB/file — base64 inflates ~33% in storage and the .sav backup













// th()/totRow()/printEmptyRow()/docHeader() moved to
// src/features/guardian-inventory/print.js (Milestone 8, Phase B), being
// Guardian-only; td(), which Annual's print.js shares, is
// src/core/form/field-html.js's since Milestone 70's 70F, and the unused
// tdR() went then.

// pagePrint()/buildPrintHTML() moved to
// src/features/guardian-inventory/print.js (Milestone 8, Phase B).

// Opens the Florida e-filing portal as a separate window sized and
// positioned to the right half of the screen, and best-effort snaps this
// app's own window to the left half — giving a side-by-side layout without
// embedding the portal in an iframe (their site's own security headers,
// X-Frame-Options: SAMEORIGIN and CSP frame-ancestors 'self', block that
// outright — verified directly against their server, not a guess).
// noopener/noreferrer: the portal window can't reach back into this one via
// window.opener (standard hardening for any window.open to an outside site).
function openFloridaCourtPortal(){
  const availW=screen.availWidth||window.innerWidth||1920;
  const availH=screen.availHeight||window.innerHeight||1080;
  const halfW=Math.floor(availW/2);

  window.open(
    'https://www.myflcourtaccess.com/default.aspx',
    '_blank',
    `left=${availW-halfW},top=0,width=${halfW},height=${availH},noopener,noreferrer`
  );

  // Repositioning THIS window only works in browsers that allow moveTo/
  // resizeTo on a window not opened via script — many block it as a
  // security measure. Wrapped so an unsupported browser just leaves this
  // window where it was, rather than erroring.
  try{
    window.moveTo(0,0);
    window.resizeTo(halfW,availH);
  }catch(e){/* not supported here — user can snap manually (Win+Left) */}
}

// pagePrint()/buildPrintHTML()/doSavePdf()/doSaveExcel()/importExcelFile()/
// parseInitialInventoryWorkbook()/GUARDIAN_EXCEL_CAPS moved to
// src/features/guardian-inventory/print.js and excel.js (Milestone 8, Phase B).

// ═══════════════════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════════════════
document.querySelectorAll('.nav-link-item[data-page]').forEach(btn=>{
  btn.addEventListener('click',()=>navigate(btn.dataset.page));
});

// Hash-based routing. Each filing type's page list is FILING_PAGES in
// src/core/filing/filing-registry.js (moved there by Milestone 70's 70C).

function updateNavActive(page){
  document.querySelectorAll('.nav-link-item[data-page]').forEach(btn=>{
    const isActive=btn.dataset.page===page;
    btn.classList.toggle('active',isActive);
    // aria-current, not aria-selected — these are navigation links to
    // different pages/sections, not tabs or options within one control.
    if(isActive)btn.setAttribute('aria-current','page');
    else btn.removeAttribute('aria-current');
  });
}

const SPECIAL_PAGES=['/dashboard','/inventory-select','/activity-log','/party-management']; // valid regardless of activeInventoryType
async function handleHash(){
  const h=window.location.hash.replace('#','');
  if(SPECIAL_PAGES.includes(h)){
    // router.js's navigate() sets window.location.hash itself, then renders
    // directly -- but assigning the hash also queues this same listener via
    // the browser's native 'hashchange' event, which fires asynchronously
    // afterward and re-renders a second time for no reason. Harmless for a
    // plain re-render, but showContinuePromptIfNeeded() is a one-shot: its
    // first run draws the banner and marks itself shown, so the redundant
    // second run immediately wipes what the first just drew. currentPage
    // already equals h whenever navigate() (or renderPage()'s own redirect)
    // already handled this exact hash, which is the only case this skips.
    if(currentPage===h)return;
    currentPage=h;
    renderPage(h);
    // renderPage() may have redirected (e.g. /dashboard with no wards yet
    // lands on /inventory-select instead) and updated currentPage itself —
    // reflect wherever it actually landed, not the hash this call started
    // with, or the nav highlight points at a page nothing rendered.
    updateNavActive(currentPage);
    return;
  }
  const wizardPages=window.GuardianFormsLegacyBridge.FILING_PAGES[activeInventoryType]||window.GuardianFormsLegacyBridge.PAGES_GUARDIAN;
  const valid=wizardPages.map(p=>p.id);
  const page=valid.includes(h)?h:'/';
  currentPage=page;
  renderPage(page);
  updateNavActive(currentPage);
}

window.addEventListener('hashchange',handleHash);
window.addEventListener('beforeunload',flushPendingSave);
document.addEventListener('visibilitychange',()=>{
  if(document.hidden)flushPendingSave();
  else updateLastSavedIndicator(); // background tabs throttle the 30s ticker, so the "X minutes ago" text can go stale while hidden
});

// beforeunload cannot reliably await either file or IndexedDB writes. The
// recovery snapshot is best-effort, so retain the native dirty-state warning.
// initApp() arms it only after startup completes.
function warnBeforeUnloadIfDirty(e){
  if(!_dirtySinceExport)return;
  e.preventDefault();
  e.returnValue=''; // required for Chrome to show its native confirmation
}

const TEMPLATE_FILES={
  simplified:'SimplifiedAccounting.xlsx',
  annual:'Annual Accounting 080123.xlsx',
  guardian:'a_InitialInventory (3).xlsx',
};

function isValidXlsxB64(b64) {
  return typeof b64 === 'string' && (b64.startsWith('UEsDB') || b64.startsWith('UEsBA'));
}

async function fetchAndCacheTemplate(type,filename){
  if(location.protocol==='file:')return null;
  try{
    console.log(`Fetching ${filename}...`);
    const resp=await fetch(filename);
    if(!resp.ok){console.warn(`Template fetch failed for ${type}, status:`,resp.status);return null;}
    const blob=await resp.blob();
    console.log(`Converting ${type} to base64...`);
    return await new Promise((resolve)=>{
      const reader=new FileReader();
      reader.onload=async(e)=>{
        try{
          const b64=e.target.result.split(',')[1];
          if(!isValidXlsxB64(b64)){
            console.warn(`Fetched template for ${type} is not a valid XLSX zip file. Skipping cache.`);
            resolve(null);
            return;
          }
          console.log(`Caching ${type} template...`);
          await saveTemplate(type,b64);
          console.log(`${type} template auto-loaded successfully`);
          resolve(b64);
        }catch(err){console.warn(`Failed to save ${type}:`,err);resolve(null);}
      };
      reader.onerror=()=>{console.warn(`FileReader error for ${type}`);resolve(null);};
      reader.readAsDataURL(blob);
    });
  }catch(e){console.warn(`Failed to auto-load ${type} template:`,e);return null;}
}


// Imported spreadsheets are parsed and discarded. Only bundled blank
// templates enter the in-memory template cache and subsequent .sav writes.
async function ensureTemplate(type){
  const bundled=embeddedTemplate(type);
  if(bundled&&isValidXlsxB64(bundled))return bundled;

  const existing=await loadTemplate(type);
  if(existing&&isValidXlsxB64(existing))return existing;

  const fetched=await fetchAndCacheTemplate(type,TEMPLATE_FILES[type]);
  if(fetched&&isValidXlsxB64(fetched))return fetched;

  return (bundled&&typeof bundled==='string')?bundled:null;
}

async function autoLoadTemplates(){
  if(location.protocol==='file:'){console.log('Skipping auto-load on file:// protocol');return;}
  for(const type of Object.keys(TEMPLATE_FILES)){
    console.log(`Checking for existing ${type} template...`);
    const existing=await loadTemplate(type);
    if(existing){console.log(`${type} template already exists`);continue;}
    if(embeddedTemplate(type)){
      // Bundled with the app — no fetch needed. ensureTemplate() will pick
      // it up and cache it on first export.
      console.log(`${type} template is bundled with the app`);
      continue;
    }
    await fetchAndCacheTemplate(type,TEMPLATE_FILES[type]);
  }
}

// Sidebar copyright line -- year computed from the visitor's own clock so it
// keeps incrementing on every Jan 1 with no code change required.
function renderCopyrightNotice(){
  const el=document.getElementById('sidebar-copyright');
  if(!el)return;
  el.textContent=`© Copyright ${new Date().getFullYear()} Pinellas County Clerk of the Circuit Court and Comptroller`;
}

// The door from this script into src/core/runtime/monolith.js (Milestone 70,
// 70E): it hands the moved code the functions here that it calls back. The
// second transition exception MILESTONE-70-PROPOSAL.md records; goes in 70L.
function provideMonolithServices(fns){return window.GuardianFormsLegacyBridge.provideMonolithServices(fns);}

async function initApp(){
  // Milestone 70's 70E: hand the moved code the functions of this script it
  // calls (src/core/runtime/monolith.js), before anything can call back.
  provideMonolithServices({auditLog,autoSave,bindComboboxKeyboardNav,closeModal,comboboxAssignOptionIds,comboboxFilterItems,comboboxHide,comboboxRenderDropdown,computeNavChecks,ensureFragment,flushPendingSave,getCurrentPage,getWardHeadlineTotal,initWardNameCombobox,notifyProbateGuardianTabStateChanged,populateWardNameSuggestions,saveWardToState,showModal,updateSidebar});
  renderCopyrightNotice();
  // Resolve file selection before the unlock flow.
  await promptOpenOrStartAtLaunch();
  await ensureUnlocked(); // blocks until a valid master-password key is in memory
  await loadGuardianData();
  await autoLoadTemplates();

  // pg-last-position (recovery-cache.js) carries no case data, just the
  // route/ward the filer was last on -- so it is only meaningful once an
  // existing case has actually been loaded (_openedFileAtLaunch), and only
  // if that ward still exists in it.
  const lastPosition=_openedFileAtLaunch?window.loadLastPosition?.():null;
  let positionApplies=false;
  if(lastPosition&&lastPosition.route){
    if(lastPosition.wardId){
      if(caseFile.wards.some(w=>w.wardId===lastPosition.wardId)){
        caseFile.activeWardId=lastPosition.wardId;
        positionApplies=true;
      }
    }else{
      positionApplies=true;
    }
  }

  const activeWard=getActiveWard();
  if(activeWard){
    const ok = await activateWard(activeWard);
    if (!ok) {
      window.location.hash = '/dashboard';
      positionApplies=false;
    }
  }

  updateSidebar();
  if(positionApplies){
    window.location.hash=lastPosition.route;
  }else if(_openedFileAtLaunch || !caseFile.activeWardId){
    window.location.hash='/dashboard'; // opened an existing case with no remembered position — land on All Wards
  }
  handleHash();
  await loadAutoExportPrefs();
  setupAutoExportTimer();
  setupLastSavedTicker();
  setupFallbackSaveReminder();
  setupDragAndDropImport();
  notifyProbateGuardianTabStateChanged();
  window.addEventListener('beforeunload',warnBeforeUnloadIfDirty);
}


// Keep paired "From"/"To" date fields consistent: never let From be after To
// or To be before From. Pairs are detected by finding two date inputs that
// share a .row container with labels containing the words "From" and "To"
// (e.g. "Period From" / "Period To", "Bond Period – From" / "– To").
// Milestone 40C-C: enforceDateRanges() and wireDateRangePair() were removed
// from here, and nothing replaces them. Editing one endpoint of a date range
// must never change the other; checkDateOrder() (src/core/validation/
// date-rules.js), called from each filing type's validator, is now the single
// place an end-before-start range is reported.
//
// They were actively destroying valid data. The pair swapped endpoints
// whenever `fromInp.value > toInp.value`, but these are NOT native
// <input type="date"> controls -- form-fields.js renders every date field as
// `type="text"` holding the display form, so `.value` is MM/DD/YYYY, not
// YYYY-MM-DD. Comparing those strings compares the MONTH first and the year
// last, so an ordinary accounting period like 05/10/2026 -> 05/09/2027 read
// as reversed ("05/1" > "05/0") and the To field was silently overwritten
// with the From date. Any period not starting on January 1 could lose its end
// date this way, which is why a 01/01/2025 -> 12/31/2025 spot check saw
// nothing: a January start is the one shape the comparison gets right.
//
// An earlier revision of this code also set min/max on each input, which is
// the known cause of Chrome refusing digit-by-digit typing into a date field
// (reported against Part I's Period To). That is gone too and must not come
// back; the validator, not the input, is where range order belongs.

// Guards against a native <input type="date"> committing an implausible
// year (e.g. "0002-05-10" left behind by a stray keystroke) -- HTML5 date
// inputs treat any 1-4 digit year as a "complete", non-empty value, so
// nothing else in the app ever sees this as invalid or unanswered. One
// delegated listener on `document`, registered once here rather than per
// input, so it covers every date field regardless of which of the app's
// several wiring conventions that field uses -- catching this everywhere
// without touching each of the ~50 individual date inputs.
// MUST be 'focusout', not 'change': Chrome fires 'change' on a date input
// the instant the year segment LOOKS complete, including every transient
// state while the user is still typing it digit-by-digit (typing "2026"
// passes through "0002", "0020", "0202" first). Hooking 'change' here
// blanked the field mid-keystroke on that transient "0002", which the
// browser's date control then treated as a fresh, empty field and
// restarted segment focus from the month -- so the rest of what the user
// was typing landed in the wrong segments (reported: typing "05102026"
// kept "0510" but the year ended up "0026" with month/day scrambled).
// 'focusout' only fires once the user actually leaves the control -- HTML5
// date inputs keep focus on the whole control while moving between their
// internal month/day/year segments, so this never fires mid-entry, only
// once a real (if implausible) value has actually been committed.
// Bubbles on its own (unlike 'blur'), so no capture flag is needed.
// Re-dispatches 'change' after clearing so bindForms()'s own listener
// (and anything else watching 'change') sees the correction and doesn't
// leave the blanked-out DOM value out of sync with window.D.
document.addEventListener('focusout',e=>{
  const el=e.target;
  if(!el||el.tagName!=='INPUT'||el.type!=='date'||!el.value)return;
  const m=el.value.match(/^(\d{4})-\d{2}-\d{2}$/);
  if(m&&(+m[1]<1900||+m[1]>new Date().getFullYear()+30)){
    el.value='';
    el.dispatchEvent(new Event('change',{bubbles:true}));
  }
});

// Milestone 16: Modal helpers
let _wardLockedPreviousFocus = null;

window.showWardLockedModal = function() {
  const el = document.getElementById('ward-locked-overlay');
  if (el) {
    _wardLockedPreviousFocus = document.activeElement;
    el.classList.add('show');
    const btn = document.getElementById('close-ward-locked');
    if (btn) btn.focus();
  }
};
window.closeWardLockedModal = function() {
  const el = document.getElementById('ward-locked-overlay');
  if (el) {
    el.classList.remove('show');
    if (_wardLockedPreviousFocus && typeof _wardLockedPreviousFocus.focus === 'function') {
      try { _wardLockedPreviousFocus.focus(); } catch (e) {}
      _wardLockedPreviousFocus = null;
    }
  }
};

// The startup label linking that used to be queued here (setTimeout(..., 0))
// is main.js's since Milestone 70's 70F: linkLabelsToInputs() is a module's
// now, and a timer queued by this classic script can fire before main.js --
// a deferred module -- has put the bridge on window.
// initApp() is NOT called here. This file is a classic, parser-blocking
// script, so it runs before any `<script type="module">` has evaluated --
// which meant startup reached code depending on module-provided globals
// (window.createFeatureBridge, and the case-file.js persistence functions)
// before those globals existed. src/main.js calls window.initApp() as its
// last statement instead, after every module import has evaluated, so the
// whole boot path has one explicit ordering guarantee rather than racing
// deferred module evaluation. See MILESTONE-40G-PROPOSAL.md.
