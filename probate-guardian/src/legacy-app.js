// ═══════════════════════════════════════════════════════
// ICON SET
// Emoji were replaced with these because they render as a different
// picture on every OS, sit at inconsistent weights beside text, and read
// as informal in a document a court receives. These are one stroke
// weight, inherit currentColor, and align to the same 24px grid.
// Inlined as literal <svg> (never <use>) so they survive html2canvas,
// which is what rasterises the app for print preview.
// ═══════════════════════════════════════════════════════
const ICONS={
  home:'<path d="M3.2 10.6 12 3.6l8.8 7"/><path d="M5.7 9.3v11.1h12.6V9.3"/>',
  pencil:'<path d="M4 20h4.2L19.4 8.8a2 2 0 0 0 0-2.8l-1.4-1.4a2 2 0 0 0-2.8 0L4 15.8Z"/><path d="M14.5 5.9 18.1 9.5"/>',
  trash:'<path d="M4.5 6.8h15"/><path d="M9.3 6.8V4.4h5.4v2.4"/><path d="M6.6 6.8 7.7 20h8.6l1.1-13.2"/>',
  download:'<path d="M12 3.6v10.8"/><path d="m8.2 10.8 3.8 3.8 3.8-3.8"/><path d="M4.4 19.9h15.2"/>',
  upload:'<path d="M12 14.4V3.6"/><path d="m8.2 7.4 3.8-3.8 3.8 3.8"/><path d="M4.4 19.9h15.2"/>',
  lock:'<rect x="4.6" y="10.4" width="14.8" height="9.6" rx="1.8"/><path d="M8.2 10.4V7.8a3.8 3.8 0 0 1 7.6 0v2.6"/>',
  unlock:'<rect x="4.6" y="10.4" width="14.8" height="9.6" rx="1.8"/><path d="M8.2 10.4V7.8a3.8 3.8 0 0 1 6.9-2.2"/>',
  file:'<path d="M6.4 3.4h7l4.2 4.2v13H6.4Z"/><path d="M13.2 3.4v4.4h4.4"/><path d="M9.2 12.6h5.6M9.2 16h5.6"/>',
  chart:'<path d="M4.2 20h15.6"/><path d="M7.4 20v-6.4M12 20V5.6M16.6 20v-9.2"/>',
  trending:'<path d="m4.2 15.8 5-5 3 3 6.4-6.4"/><path d="M14.6 7.4h4.6V12"/>',
  printer:'<path d="M7.2 9.2V3.6h9.6v5.6"/><rect x="4" y="9.2" width="16" height="6.6" rx="1.6"/><path d="M7.2 14.6h9.6v5.8H7.2Z"/>',
  search:'<circle cx="10.8" cy="10.8" r="6.2"/><path d="m19.6 19.6-4.4-4.4"/>',
  swap:'<path d="M4.4 8.6h13.2"/><path d="m14.4 5.4 3.2 3.2-3.2 3.2"/><path d="M19.6 15.4H6.4"/><path d="m9.6 12.2-3.2 3.2 3.2 3.2"/>',
  folder:'<path d="M3.4 6.4h5.6l2 2.2h9.6V19H3.4Z"/>',
  folderOpen:'<path d="M3.4 6.4h5.6l2 2.2h7.6v2.2"/><path d="M3.4 8.6 5.6 19h13.2l2.2-8.2H5.6Z"/>',
  list:'<path d="M4.4 7h15.2M4.4 12h15.2M4.4 17h15.2"/>',
  grid:'<rect x="4.2" y="4.2" width="6.4" height="6.4" rx="1.2"/><rect x="13.4" y="4.2" width="6.4" height="6.4" rx="1.2"/><rect x="4.2" y="13.4" width="6.4" height="6.4" rx="1.2"/><rect x="13.4" y="13.4" width="6.4" height="6.4" rx="1.2"/>',
  archive:'<rect x="3.6" y="4.2" width="16.8" height="4.4" rx="1.2"/><path d="M5.4 8.6V19h13.2V8.6"/><path d="M10 12.4h4"/>',
  undo:'<path d="M4.4 9.4h10a5.2 5.2 0 1 1 0 10.4H7.6"/><path d="m8 5.4-3.6 4 3.6 4"/>',
  clipboard:'<path d="M9 4.6H7.2a1.6 1.6 0 0 0-1.6 1.6V19a1.6 1.6 0 0 0 1.6 1.6h9.6A1.6 1.6 0 0 0 18.4 19V6.2a1.6 1.6 0 0 0-1.6-1.6H15"/><rect x="9" y="3" width="6" height="3.4" rx="1.1"/>',
  copy:'<rect x="8.6" y="8.6" width="11.4" height="11.4" rx="1.8"/><path d="M15.4 5.4H5.8a1.8 1.8 0 0 0-1.8 1.8v9.6"/>',
  receipt:'<path d="M6 3.6h12v17l-3-1.8-3 1.8-3-1.8-3 1.8Z"/><path d="M9.2 8.4h5.6M9.2 12.4h5.6"/>',
  inbox:'<path d="M4 13.6 6.2 4.6h11.6L20 13.6v5.8H4Z"/><path d="M4 13.6h4.2l1.2 2.4h5.2l1.2-2.4H20"/>',
  alert:'<path d="M12 4.2 21 19.8H3Z"/><path d="M12 10v4.2"/><circle cx="12" cy="17.4" r=".9" fill="currentColor" stroke="none"/>',
  external:'<path d="M14.2 4.4h5.4v5.4"/><path d="m19.6 4.4-8 8"/><path d="M17.4 13.6v6H4.6V6.8h6"/>',
  check:'<path d="m4.8 12.4 4.8 4.8L19.2 7.6"/>',
  plus:'<path d="M12 5v14M5 12h14"/>',
  close:'<path d="m6 6 12 12M18 6 6 18"/>',
  shield:'<path d="M12 3.2 20 6v6.1c0 4.6-3.3 7.5-8 8.7-4.7-1.2-8-4.1-8-8.7V6Z"/>',
  sun:'<circle cx="12" cy="12" r="4.2"/><path d="M12 2.8v2.6M12 18.6v2.6M4.2 12H1.6M22.4 12h-2.6M5.6 5.6l1.8 1.8M16.6 16.6l1.8 1.8M18.4 5.6l-1.8 1.8M7.4 16.6l-1.8 1.8"/>',
  moon:'<path d="M20.2 14.3A8.3 8.3 0 0 1 9.7 3.8a8.3 8.3 0 1 0 10.5 10.5Z"/>',
  bug:'<path d="M9 9.2h6a3.8 3.8 0 0 1 3.8 3.8v2.4A3.8 3.8 0 0 1 15 19.2H9a3.8 3.8 0 0 1-3.8-3.8V13A3.8 3.8 0 0 1 9 9.2Z"/><path d="M8.2 5.8 6.6 4.2M12 5.6V3.4M15.8 5.8l1.6-1.6M5.2 12H3.4M20.6 12h-1.8M9.4 14.2h.1M14.5 14.2h.1"/>',
  message:'<path d="M4.2 5.2h15.6v11.2H9l-4.8 4v-4H4.2Z"/><path d="M8 9.2h8M8 12.4h5.4"/>',
};
function ic(n,size){
  return '<svg class="ic" width="'+(size||16)+'" height="'+(size||16)+'" viewBox="0 0 24 24" '
    +'fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" '
    +'stroke-linejoin="round" aria-hidden="true" focusable="false">'+(ICONS[n]||'')+'</svg>';
}
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
const INVENTORY_TYPES = {
  guardian: {
    name: 'Initial Inventory',
    label: 'Verified Initial Inventory',
    description: 'Initial inventory of assets as of Guardianship Inception Date'
  },
  simplified: {
    name: 'Simplified Annual Accounting',
    label: 'Simplified Annual Accounting',
    description: 'Simplified annual accounting for guardianship'
  },
  annual: {
    name: 'Annual Accounting',
    label: 'Annual Accounting',
    description: 'Full annual accounting with detailed schedules'
  },
  // Final and Trust accountings use the SAME form, schedules, totals and
  // validation as the Annual Accounting — they differ only in what the
  // filing is called on screen and on the finished document. See
  // ANNUAL_FORM_ALIASES / formEngine() below: every behavioural lookup
  // resolves these back to 'annual', so there is one implementation to
  // maintain rather than three copies that could drift apart.
  finalAccounting: {
    name: 'Final Accounting',
    label: 'Final Accounting',
    description: 'Closing accounting filed when the guardianship ends, using the full annual schedules'
  },
  trustAccounting: {
    name: 'Trust Accounting',
    label: 'Trust Accounting',
    description: 'Accounting for a trust, using the full annual schedules'
  },
  // Plans report on the ward's PERSON (where they live, their care, their
  // rights) — a separate court filing from the Inventory/Accountings above,
  // which report on their PROPERTY. A guardian of both person and property
  // files one of each.
  planSimplified: {
    name: 'Simplified Annual Plan',
    label: 'Simplified Annual Plan',
    description: "Short annual report on the ward's residence, care, and wellbeing"
  },
  planAnnual: {
    name: 'Annual Guardianship Plan',
    label: 'Annual Guardianship Plan',
    description: "Full annual report on the ward's residence, care, rights, and abilities"
  },
  planInitial: {
    name: 'Initial Guardianship Plan',
    label: 'Initial Guardianship Plan',
    description: "The first plan filed after Letters of Guardianship are signed, due within 60 days"
  },
  planMinor: {
    name: 'Annual Plan — Minors',
    label: 'Annual Plan — Minors',
    description: "Annual report for a minor ward, covering residence, care, education, and social development"
  }
};
window.INVENTORY_TYPES=INVENTORY_TYPES;

// Ward types that are the Annual Accounting form under a different filing
// name. Kept as their own inventoryType so the dashboard, the ward picker
// and the finished document all say the right thing, but resolved through
// formEngine() wherever behaviour is chosen — pages, nav, empty data,
// totals, validation, export — so they cannot drift from Annual.
const ANNUAL_FORM_ALIASES = ['finalAccounting','trustAccounting'];

// ANNUAL_P67_CELLS moved to src/features/annual-accounting/excel.js
// (Milestone 7, Phase B) -- Annual Excel export is its only consumer.

// Maps a ward's inventoryType to the form engine that drives it. Use this
// for behaviour; use the raw inventoryType for naming/identity.
function formEngine(type){
  return ANNUAL_FORM_ALIASES.includes(type) ? 'annual' : type;
}

// The filing's display name, e.g. "Final Accounting" — used in headings and
// on the exported document so an alias never shows as "Annual Accounting".
function formDisplayName(type){
  return window.resolveDescriptorForInventoryType?.(type)?.displayName
    || (INVENTORY_TYPES[type] && INVENTORY_TYPES[type].name)
    || 'Accounting';
}

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
  {element:'#help-toggle-btn',title:'1. Help Button',text:'Click the "?" button anytime for in-app help, tips, a downloadable user guide, and an Activity Log of every unlock and backup on this device.',position:'left'},
  {element:'.ward-picker-select',title:'2. Your Active Ward',text:'This dropdown shows your current ward. You can switch between multiple guardianship cases here, and each one saves independently.',position:'right'},
  {element:'#theme-toggle-btn',title:'3. Light & Dark Mode',text:'Switch between light and dark appearance here. Your choice is remembered, and the app opens in light mode until you choose otherwise.',position:'left'},
  {element:'.ward-progress',title:'4. Filing Progress',text:'Tracks how many sections of this ward\'s filing are complete, computed live from what you\'ve actually entered. Use "Jump to…" to go straight to the next incomplete section.',position:'right'},
  {element:'[data-page="/"]',title:'5. Cover Page',text:'Start here. This is where you enter basic case information: Ward name, Case Number, Guardianship Inception Date, County, and Guardian details. The Summary page next to it totals every schedule once you\'ve filled them in.',position:'bottom'},
  {element:'[data-nav="a1"]',title:'6. Schedule A-1: Real Estate Assets',text:'List all real estate owned by or with the ward\'s interest. Include properties, residences, and land. Enter the ward\'s percentage ownership.',position:'right'},
  {element:'[data-nav="a2"]',title:'7. Schedule A-2: Real Estate Liabilities',text:'List mortgages, liens, and debts against real estate. The app calculates net real estate value automatically.',position:'right'},
  {element:'[data-nav="b1"]',title:'8. Schedule B-1: Cash Assets',text:'List all bank accounts, savings, checking, CDs, money market accounts. Include each account separately with the ward\'s percentage. If several accounts are nearly identical, use the "Duplicate" button on an entry instead of re-typing it.',position:'right'},
  {element:'[data-nav="b2"]',title:'9. Schedule B-2: Personal Property',text:'Vehicles, jewelry, furniture, art, collections. Everything of value that isn\'t real estate or cash. Provide carrying value (depreciated worth).',position:'right'},
  {element:'[data-nav="b3"]',title:'10. Schedule B-3: Intangible Assets',text:'Stocks, bonds, mutual funds, business interests, patents, copyrights. List each security or intangible asset with current value.',position:'right'},
  {element:'[data-nav="b4"]',title:'11. Schedule B-4: Personal Property Liabilities',text:'Debts against personal property: car loans, credit card debt, personal loans. These reduce your total asset value.',position:'right'},
  {element:'[data-nav="c1"]',title:'12. Schedule C-1: Income',text:'Annual income to the ward: interest, dividends, rental income, Social Security. Enter annualized amounts.',position:'right'},
  {element:'[data-nav="c2"]',title:'13. Schedule C-2: Lawsuits Against Ward',text:'Any pending lawsuits where the ward is being sued. Include case number and claimed damages.',position:'right'},
  {element:'[data-nav="c3"]',title:'14. Schedule C-3: Lawsuits by Ward',text:'Any lawsuits where the ward is suing someone else. Include case number and claimed recovery amount.',position:'right'},
  {element:'[data-nav="c4"]',title:'15. Schedule C-4: Trusts',text:'Any trusts where the ward is a beneficiary. List trustee, trust property, and the ward\'s interest percentage.',position:'right'},
  {element:'[data-nav="c5"]',title:'16. Schedule C-5: Joint Owners',text:'Properties or accounts owned jointly with others. List the co-owner and the ward\'s percentage of the total.',position:'right'},
  {element:'[data-nav="d1"]',title:'17. Part III: Guardian Attestation',text:'Guardian signs and dates here under oath that the inventory is true and complete. One guardian must sign.',position:'bottom'},
  {element:'[data-nav="d2"]',title:'18. Part IV: Preparer Information',text:'If someone else prepared this form (paralegal, accountant), their contact info and signature goes here.',position:'bottom'},
  {element:'[data-nav="d3"]',title:'19. Part V: Attorney & Audit Fee',text:'Your attorney signs and dates here. Audit fee is calculated based on total estate value per state law.',position:'bottom'},
  {element:'[data-nav="d4"]',title:'20. Part VI: Bond & Surety Info',text:'Information about your guardianship bond. This section may not apply to all guardianships.',position:'bottom'},
  {element:'[data-nav="d5"]',title:'21. Part VII: Certificate of Service',text:'Proof that you served copies of the inventory on required parties: attorney, beneficiaries, etc.',position:'bottom'},
  {element:'[data-page="/print"]',title:'22. Print Preview & Export',text:'When complete, click here to review your entire form and export as PDF (best for courts) or Excel for filing. Anything still missing is listed here, grouped by section, with a link straight to it.',position:'left'},
];

const WALKTHROUGH_SIMPLIFIED=[
  {element:'#help-toggle-btn',title:'1. Help Resources',text:'Stuck? Click "?" anytime for explanations, tips, downloadable guides designed specifically for Simplified Accounting, and an Activity Log of every unlock and backup on this device.',position:'left'},
  {element:'.ward-picker-select',title:'2. Your Ward',text:'Switch between wards here. Each guardianship case is tracked separately, with its own income/expense summary.',position:'right'},
  {element:'#theme-toggle-btn',title:'3. Light & Dark Mode',text:'Switch between light and dark appearance here. Your choice is remembered, and the app opens in light mode until you choose otherwise.',position:'left'},
  {element:'.ward-progress',title:'4. Filing Progress',text:'Tracks how many sections of this ward\'s filing are complete, computed live from what you\'ve actually entered. Use "Jump to…" to go straight to the next incomplete section.',position:'right'},
  {element:'[data-page="/"]',title:'5. Cover Page',text:'Enter basic case information: Ward name, Case Number, dates, and county. This auto-populates all schedule headers.',position:'bottom'},
  {element:'[data-page="/p2"]',title:'6. Accounting Summary',text:'This is the heart of Simplified Accounting. You only report: Starting Balance, Income (interest/settlements/taxes), Expenses, and Remaining Balance.',position:'bottom'},
  {element:'[data-page="/p3"]',title:'7. Guardian Signature',text:'Sign and date here, certifying under oath that this accounting is true and complete. This is your sworn statement.',position:'bottom'},
  {element:'[data-page="/print"]',title:'8. Export & File',text:'Click Print Preview to review your complete form. Simplified Accounting is much shorter—perfect for courts that accept it. Anything still missing is listed here, with a link straight to it.',position:'left'},
];

// Rewritten — every selector below was previously wrong (missing the "a-"
// prefix buildNavAnnual() actually uses on data-nav, e.g. "a-scha" not
// "scha"), so 8 of the original 12 steps silently failed to resolve and the
// tour skipped straight from Part III to Print Preview. The schedule
// descriptions were also inaccurate: Annual Accounting has no "beginning of
// year" / "end of year" asset schedules — it's Income (A), Disbursements
// (B1-B4), Capital Adjustments (C), Assets & Liabilities (D1-D5), Transfers
// (E), and Sales (F1-F2). Text below is drawn from each schedule's own
// on-page instructions, not reconstructed from memory.
const WALKTHROUGH_ANNUAL=[
  {element:'#help-toggle-btn',title:'1. Get Help Anytime',text:'Click "?" for help, contextual tips, a downloadable guide for Annual Accounting, and an Activity Log of every unlock and backup on this device.',position:'left'},
  {element:'.ward-picker-select',title:'2. Select Your Ward',text:'Use this dropdown to switch between guardianship cases. Each has its own annual accounting records.',position:'right'},
  {element:'#theme-toggle-btn',title:'3. Light & Dark Mode',text:'Switch between light and dark appearance here. Your choice is remembered, and the app opens in light mode until you choose otherwise.',position:'left'},
  {element:'.ward-progress',title:'4. Filing Progress',text:'Tracks how many sections of this accounting are complete, computed live from what you\'ve actually entered. Use "Jump to…" to go straight to the next incomplete section.',position:'right'},
  {element:'[data-page="/p2"]',title:'5. Part II: Guardian Certification',text:'Guardian certifies they have receipts for all spending and will keep records for 3 years. Read this carefully—it\'s a legal requirement.',position:'bottom'},
  {element:'[data-page="/p3"]',title:'6. Part III: Guardian Signatures',text:'Guardian signs here under oath that this accounting is correct. Can have multiple guardians sign.',position:'bottom'},
  {element:'[data-nav="a-scha"]',title:'7. Schedule A: Income',text:'All income received during the period: SSI, retirement, disability benefits, interest, or rental income. Don\'t include proceeds from selling an asset — those belong in Schedule C.',position:'right'},
  {element:'[data-nav="a-schb4"]',title:'8. Schedule B-4: All Other Disbursements',text:'The catch-all disbursement schedule most guardians use most — list payments in check-number order. Schedules B-1 through B-3 have their own pages for attorney fees, guardian fees, and other court-ordered payments. If several disbursements are nearly identical, use "Duplicate" on an entry instead of re-typing it.',position:'right'},
  {element:'[data-nav="a-schc"]',title:'9. Schedule C: Capital Adjustments',text:'Gains or losses in asset values, newly discovered assets, and purchases during the period. Enter losses as negative numbers.',position:'right'},
  {element:'[data-nav="a-schd1"]',title:'10. Schedule D-1: Cash Assets',text:'Every liquid account as of the end of the period — checking, savings, CDs, money market, trust accounts. List each one separately. Schedules D-2 through D-5 cover real estate, personal property, intangible assets, and liabilities.',position:'right'},
  {element:'[data-nav="a-p67"]',title:'11. Parts VI & VII: Reconciliation',text:'The app checks that net assets computed from the accounting activity (income, disbursements, gains/losses) match net assets computed from the Schedule D asset/liability listings. These must agree. If they don\'t, correct the schedules — or, if the difference is right as filed, write an explanation on that page; it is required before export and is printed on the finished document.',position:'bottom'},
  {element:'[data-page="/print"]',title:'12. Print Preview & Export',text:'Review your complete annual accounting and export as PDF (recommended) or Excel. Anything still missing — including an unbalanced accounting — is listed here, grouped by section, with a link straight to it.',position:'left'},
];

const WALKTHROUGH_PLAN_SIMPLIFIED=[
  {element:'#help-toggle-btn',title:'1. Get Help Anytime',text:'Click "?" for guidance on this form, plus an Activity Log of every unlock and backup on this device.',position:'left'},
  {element:'.ward-picker-select',title:'2. Select Your Ward',text:'Switch between cases here. A Plan reports on the ward as a person; an Accounting reports on their money. If you file both, give each record the same case number and the dashboard will group them together.',position:'right'},
  {element:'.ward-progress',title:'3. Filing Progress',text:'Tracks how much of this plan is complete, computed live from what you\'ve actually written. Use "Jump to…" to go straight to the next unanswered section.',position:'right'},
  {element:'[data-page="/"]',title:'4. Cover',text:'Case number, ward name, and the reporting period this plan covers.',position:'bottom'},
  {element:'[data-page="/p2"]',title:'5. The Plan',text:'The heart of the form — nine questions about the past year: where the ward lived, their medical care, their diagnosis, social activities, how they interact with others, whether any rights should be restored, advance directives, and any payment you received.',position:'bottom'},
  {element:'[data-page="/p3"]',title:'6. Signatures',text:'Each guardian or guardian advocate signs under penalty of perjury, with their contact details. At least one signature is required.',position:'bottom'},
  {element:'[data-page="/print"]',title:'7. Review & File',text:'Print Preview lists anything still missing, and adds a readiness check mirroring what the Clerk of Court looks for — including reminders for steps the app can\'t verify, like serving copies. Export as PDF when ready; this form has no Excel version.',position:'left'},
];

const WALKTHROUGH_PLAN_ANNUAL=[
  {element:'#help-toggle-btn',title:'1. Get Help Anytime',text:'Click "?" for guidance on this form, plus an Activity Log of every unlock and backup on this device.',position:'left'},
  {element:'.ward-picker-select',title:'2. Select Your Ward',text:'Switch between cases here. A Plan reports on the ward as a person; an Accounting reports on their money. If you file both, give each record the same case number and the dashboard will group them together.',position:'right'},
  {element:'.ward-progress',title:'3. Filing Progress',text:'Tracks how much of this plan is complete, computed live from what you\'ve actually entered. Use "Jump to…" to go straight to the next unfinished section.',position:'right'},
  {element:'[data-page="/"]',title:'4. Cover',text:'Case number, ward name, reporting period, and where the ward currently lives.',position:'bottom'},
  {element:'[data-page="/p2"]',title:'5. Residences',text:'Every place the ward lived during the past 12 months. Add a row for each — the court checks this against the address on file.',position:'right'},
  {element:'[data-page="/p3"]',title:'6. Residence & Care Plan',text:'Whether the ward moved, the residential setting best suited to them, and how you plan to provide medical, mental-health, personal, and social care.',position:'right'},
  {element:'[data-page="/p5"]',title:'7. Medical Treatment',text:'Each provider who treated the ward during the year, with their address and how many visits. Add a row per provider.',position:'right'},
  {element:'[data-page="/p6"]',title:'8. Skills & Rights',text:'The ward\'s social abilities, what you did to build their capacity, and — importantly — whether any removed rights could now be restored. Saying a right could be restored means filing a separate petition.',position:'right'},
  {element:'[data-page="/p7"]',title:'9. Daily Living',text:'Rate the ward on sixteen activities of daily living. These ratings tell the court how the ward\'s independence is changing year to year.',position:'right'},
  {element:'[data-page="/p11"]',title:'10. Signatures',text:'Each guardian signs under penalty of perjury with full contact details, then the attorney certifies the filing.',position:'right'},
  {element:'[data-page="/print"]',title:'11. Review & File',text:'Print Preview lists anything still missing and adds a readiness check mirroring what the Clerk of Court reviews — including the separately-filed physician\'s report. Export as PDF; this form has no Excel version.',position:'left'},
];

const WALKTHROUGH_PLAN_INITIAL=[
  {element:'#help-toggle-btn',title:'1. Get Help Anytime',text:'Click "?" for guidance on this form, plus an Activity Log of every unlock and backup on this device.',position:'left'},
  {element:'.ward-picker-select',title:'2. Select Your Ward',text:'Switch between cases here. A Plan reports on the ward as a person; an Accounting reports on their money. If you file both, give each record the same case number and the dashboard will group them together.',position:'right'},
  {element:'.ward-progress',title:'3. Filing Progress',text:'Tracks how much of this plan is complete, computed live from what you\'ve actually entered. Use "Jump to…" to go straight to the next unfinished section.',position:'right'},
  {element:'[data-page="/"]',title:'4. Cover',text:'Case number, ward name, Guardianship Inception Date, the date Letters were signed, and where the ward currently lives. This report is due within 60 days after the Letters of Guardianship are signed.',position:'bottom'},
  {element:'[data-page="/p2"]',title:'5. Residential Setting & Medical Care',text:'The residential setting best suited to the ward, and the medical services you propose providing during the plan period.',position:'right'},
  {element:'[data-page="/p5"]',title:'6. Examining Providers',text:'Every physical or mental examination you\'ve secured or plan to secure, with each provider\'s address and the approximate exam date. Add a row per provider.',position:'right'},
  {element:'[data-page="/p6"]',title:'7. Daily Living',text:'Rate the ward on fifteen activities of daily living — this tells the court how much support the ward needs.',position:'right'},
  {element:'[data-page="/p8"]',title:'8. Advance Directives',text:'Either confirm there are no pre-existing advance directives (and how you verified that), or record the ones the ward executed, including whether a court has suspended or revoked them.',position:'right'},
  {element:'[data-page="/p9"]',title:'9. Signatures',text:'Each guardian signs under penalty of perjury, certifying the plan reflects the ward\'s wishes and rights. Up to four guardians can sign.',position:'right'},
  {element:'[data-page="/print"]',title:'10. Review & File',text:'Print Preview lists anything still missing and adds a readiness check. Export as PDF; this form has no Excel version.',position:'left'},
];

const WALKTHROUGH_PLAN_MINOR=[
  {element:'#help-toggle-btn',title:'1. Get Help Anytime',text:'Click "?" for guidance on this form, plus an Activity Log of every unlock and backup on this device.',position:'left'},
  {element:'.ward-picker-select',title:'2. Select Your Ward',text:'Switch between cases here. A Plan reports on the ward as a person; an Accounting reports on their money. If you file both, give each record the same case number and the dashboard will group them together.',position:'right'},
  {element:'.ward-progress',title:'3. Filing Progress',text:'Tracks how much of this plan is complete, computed live from what you\'ve actually entered. Use "Jump to…" to go straight to the next unfinished section.',position:'right'},
  {element:'[data-page="/"]',title:'4. Cover',text:'UCN, Case #, reporting period, and whether this filing is amended, professional, or public guardianship. This is the annual plan used specifically when the ward is a minor.',position:'bottom'},
  {element:'[data-page="/p3"]',title:'5. Treatment Providers',text:'Every medical or mental-health provider who treated the minor during the past year, with their address and number of visits.',position:'right'},
  {element:'[data-page="/p5"]',title:'6. Education & Social Development',text:'A summary of the minor\'s school progress, social development, how they communicate, their interpersonal relationships, and any unmet social needs.',position:'right'},
  {element:'[data-page="/p6"]',title:'7. Guardian Signatures',text:'Each guardian signs under penalty of perjury, certifying the plan reflects the minor\'s wishes and rights.',position:'right'},
  {element:'[data-page="/p7"]',title:'8. Preparer & Attorney',text:'This form has its own Preparer certification, separate from the attorney certification — fill in whoever actually prepared the filing.',position:'right'},
  {element:'[data-page="/print"]',title:'9. Review & File',text:'Print Preview lists anything still missing and adds a readiness check. Export as PDF; this form has no Excel version.',position:'left'},
];

const WALKTHROUGH_DASHBOARD=[
  {element:'#help-toggle-btn',title:'1. Help & Guidance',text:'Click "?" anytime for in-app help, the standalone User Guide, an Activity Log of unlocks and backups, and shared party records.',position:'left'},
  {element:'#new-ward-btn, [data-dashboard-action="add-ward"]',title:'2. Create New Filing',text:'Start here to add a new ward or filing. Choose between Initial Inventory, Annual Accounting, Simplified Accounting, or one of four Guardianship Plans.',position:'bottom'},
  {element:'.dashboard-summary-strip',title:'3. Status Overview',text:'Tracks urgent action items and approaching deadlines across all active wards.',position:'bottom'},
  {element:'#dashboard-search',title:'4. Search & Filter',text:'Quickly locate any filing by ward name, case number, or contact details.',position:'bottom'},
  {element:'#theme-toggle-btn',title:'5. Light & Dark Appearance',text:'Switch between light and dark mode here. Your preference is remembered across sessions on this device.',position:'left'},
  {element:'.dashboard-triage-queue, .dashboard-empty',title:'6. All Filings Queue',text:'Manage all active and closed guardianship cases. Click "Continue" or "Edit" to resume working on a filing, or "+ Add Your First Ward" to begin.',position:'top'},
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
let _visitedPages = new Set(); // Track which pages user has visited
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
const r2=(v)=>Math.round(v*100)/100;
const fmt=(v)=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(v||0);
window.fmt=fmt;
function esc(s){return String(s||'').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/'/g,'&#39;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}

// Neutralizes formula/CSV injection: a cell value starting with =, +, -, or @
// would otherwise be interpreted as a formula by Excel/Sheets when the
// exported file is opened. Only applied at export time — never affects the
// live in-app values stored in window.D or how they render on screen.
// Formula-injection guard for spreadsheet output. The character set is OWASP's
// complete CSV-injection list: = + - @ TAB(0x09) CR(0x0D) LF(0x0A).
//
// Milestone 51 widened this from /^[=+\-@]/ after researching the gap. Three
// findings worth recording, because the change is HARDENING rather than a fix
// and the distinction matters if anyone revisits it:
//
//  1. Not exploitable through this app's own output today. The app writes only
//     .xlsx (via ExcelJS into a court template) and never CSV, and it never
//     writes a {formula:...} cell -- every value goes through setCell() as a
//     string or a number, which ExcelJS stores as a typed string/number that
//     Excel does not evaluate. An unsanitized "=cmd" lands in the workbook as
//     inert text.
//  2. So the real vector is secondary: a clerk re-saving the .xlsx as CSV, or
//     copying cells into another sheet, where the literal text is re-parsed.
//     That is what this guard defends, and it is why it is worth keeping
//     complete rather than partial.
//  3. sanitizeStoredText()'s .trim() already strips leading tab/CR/LF from any
//     value that passes through it, so the three characters added here are very
//     nearly unreachable. Added anyway: a half-correct guard invites someone to
//     re-derive all of the above later, and the previous state had TWO
//     incomplete versions of this rule disagreeing with each other.
//
// Deliberately NOT included: the full-width variants (＝ ＋ － ＠) OWASP also
// mentions for some locales. Not a plausible threat model for Florida probate
// filings, and adding them would risk mangling legitimate content.
function sanitizeForExcel(s){
  return /^[=+\-@\t\r\n]/.test(s) ? "'"+s : s;
}

// A co-guardian slot counts as "in use" if any field is filled, not just Name —
// otherwise partially-filled co-guardian rows silently vanish from export/validation/checkmarks.
// Annual Accounting binds officeStreet/officeCityStateZip where Simplified
// binds residenceStreet/residenceCityStateZip, so both pairs have to be
// checked here. Missing the office pair meant an Annual co-guardian with
// only an office address read as "no data": skipped by validate() and
// dropped from the exported court document.
function guardianHasAnyData(g){
  return !!(g&&(g.name||g.ssn||g.phone||g.email||g.mailingStreet||g.mailingCityStateZip
    ||g.residenceStreet||g.residenceCityStateZip||g.officeStreet||g.officeCityStateZip
    ||g.signatureDate));
}

// ── SECURITY VALIDATION ──────────────────────────────
// A SQL-injection keyword/pattern detector used to sit here (bare
// \bupdate\b/\bdelete\b/\binsert\b/\bdrop\b/\bexec\b/-- matches) and ran on
// every plain free-text field in Annual/Final/Trust Accounting on blur
// (validateSecurityInput() below). This app has no SQL backend anywhere --
// nothing it ever produces is a database query built from user input -- so
// the check protected against a vector that doesn't exist here, while
// blanking real filer text on a false-positive keyword match: a Schedule C
// description reading "Update to appraisal value" or "Sale of lot -- see
// attached" was silently wiped to empty on blur, with only a console.warn
// no filer would ever see. Removed rather than narrowed: there is no SQL
// query context downstream for any narrower pattern to legitimately guard.
// detectXSSPayload() and detectPathTraversal() stay -- both match tag/URI
// syntax unlikely to appear in ordinary legal narrative, not bare English
// words, so they carry a much lower false-positive cost for whatever benefit
// they still provide.

// Detect and block XSS/HTML injection
function detectXSSPayload(s){
  const xssPatterns=[/<script[^>]*>|javascript:|on\w+\s*=|<iframe|<object|<embed|<img[^>]+onerror|<svg[^>]+on|<body[^>]+on|eval\(|expression\(|vbscript:/i];
  return xssPatterns.some(p=>p.test(String(s||'')));
}

// Detect and block path traversal attempts
function detectPathTraversal(s){
  const pathPatterns=[/\.\.\//,/\.\.\\/,/^\/etc\//,/\/etc\//i,/^[a-z]:\\/i];
  return pathPatterns.some(p=>p.test(String(s||'')));
}

// Sanitize input: remove dangerous characters but preserve legitimate data
// Milestone 40H-G: dropped the straight apostrophe from the stripped set --
// it turned "ward's" into "wards" in ordinary narrative text. Only the
// actual HTML/script-injection vectors stay stripped (<, >, ", and `);
// detectXSSPayload() above matches on tag syntax, not quote characters, so
// narrowing this doesn't reopen it.
function sanitizeInput(s){
  if(!s)return s;
  let cleaned=String(s);
  cleaned=cleaned.replace(/[<>"`]/g,'');
  cleaned=cleaned.replace(/javascript:/gi,'');
  cleaned=cleaned.replace(/on\w+=/gi,'');
  return cleaned;
}

// Strip everything except digits and a single decimal point — used for
// amount/percent fields instead of type="number" so we fully own character
// filtering (native number inputs allow '-' inconsistently across WebView
// versions, and their spinner buttons don't fire keydown so keydown-based
// minus-blocking can't catch them).
function sanitizeNonNegativeDecimal(s){
  let v=String(s||'').replace(/[^0-9.]/g,'');
  const firstDot=v.indexOf('.');
  if(firstDot!==-1){
    v=v.slice(0,firstDot+1)+v.slice(firstDot+1).replace(/\./g,'');
  }
  return v;
}
// Same as sanitizeNonNegativeDecimal but keeps a single leading '-' -- for
// the couple of fields (Annual Schedule C's Loss/Reduction, Schedule E's
// Transfer Out Amt) that are explicitly entered as negative. Those used to
// be native type="number" instead, which is exactly the pattern the
// comment above sanitizeNonNegativeDecimal explains this app moved away
// from app-wide (inconsistent '-' handling and no keydown events from the
// spinner buttons across WebView versions) -- these two were simply never
// migrated when the rest of the app was.
function sanitizeDecimal(s){
  const str=String(s||'');
  const neg=str.trim().startsWith('-');
  const digits=sanitizeNonNegativeDecimal(str);
  // Keep a lone '-' even before any digits are typed (a valid, if
  // incomplete, intermediate state) -- requiring digits first would wipe
  // the sign the instant it's typed, before the digits that are supposed
  // to follow it exist yet.
  return neg?'-'+digits:digits;
}

// Validate field value for security and format
function validateSecurityInput(fieldName,value){
  const v=String(value||'');
  if(detectXSSPayload(v)||detectPathTraversal(v)){
    console.warn(`Security: Blocked dangerous input in ${fieldName}`);
    return '';
  }
  return sanitizeInput(v);
}

// ── IMPORTED FILE HARDENING ──────────────────────────
// Every import entry point (the three Excel importers, their drag-and-drop
// equivalent, and the .sav/.zip picker) hands this module a file chosen by
// whoever is sitting at the browser — including a guardian who was emailed
// a "fixed" template by someone else. Nothing here assumes the extension
// matches the content, or that the content is well-formed.
const IMPORT_SIZE_LIMITS={
  xlsx:10*1024*1024,  // court templates run well under 1MB; 10MB is generous headroom
  sav:50*1024*1024    // a .sav can bundle many wards plus attachments (15MB cap each, see SCHEDULE_DOC_MAX_FILE_BYTES)
};
const ZIP_MAGIC=[0x50,0x4B,0x03,0x04]; // local-file-header signature 'PK\x03\x04' — every .xlsx and .sav is a ZIP container

// Rejects a file before it ever reaches ExcelJS/JSZip: empty, over the size
// ceiling for its kind, or not actually a ZIP (accept=".xlsx" is only a
// filename hint — the browser does not enforce it, and a court-issued
// template you were emailed could be anything with that extension slapped
// on). Checking the first 4 bytes rather than trusting file.name/file.type
// means a renamed non-ZIP file fails fast with a clear message instead of
// reaching the parser at all.
async function validateImportFile(file,kind){
  if(!file)return{ok:false,message:'No file was selected.'};
  if(file.size===0)return{ok:false,message:'That file is empty.'};
  const limit=IMPORT_SIZE_LIMITS[kind]||IMPORT_SIZE_LIMITS.xlsx;
  if(file.size>limit){
    return{ok:false,message:`That file is ${(file.size/1024/1024).toFixed(1)} MB, which is over the ${(limit/1024/1024)|0} MB limit for this kind of import.`};
  }
  let head;
  try{
    head=new Uint8Array(await file.slice(0,4).arrayBuffer());
  }catch(e){
    return{ok:false,message:'That file could not be read.'};
  }
  if(head.length<4||!ZIP_MAGIC.every((b,i)=>head[i]===b)){
    return{ok:false,message:'That file is not a valid Excel/.sav file (its contents do not match a ZIP archive, regardless of its name).'};
  }
  return{ok:true};
}

// Several pages embed their own copy of an import zone, each with its own
// #import-progress(-simplified|-annual) div sitting next to the file input
// (see pageCover/pageSimplified/pageAnnual) — walk up from the input that
// actually fired rather than assuming a single global id, or status text
// meant for one copy of the zone can silently land in a different one (or
// nowhere, if this page happens not to render the first id at all).
function getImportProgressEl(input){
  const scope=input&&input.closest?input.closest('.accordion-body'):null;
  return (scope&&scope.querySelector('[id^="import-progress"]'))||document.getElementById('import-progress');
}

// Defense-in-depth after a workbook otherwise passes the size/magic-byte
// gate above: a small ZIP can still decompress into a workbook with an
// enormous used range (a "sheet with a huge used range" — the case this
// guards against). This app's own readers only ever touch a fixed, known
// set of cell addresses per template — they were never the unbounded
// `sheet.rowCount`/`eachRow` loops that would normally need capping here —
// so the real risk is ExcelJS itself materializing that whole range during
// .load(). This can't stop that first pass (see the accompanying report for
// why: it would need the parse moved into a Worker), but it does stop this
// app from doing anything further with a workbook shaped nothing like a
// Clerk of Court template, with a plain-language reason instead of it just
// silently working through something enormous.
const EXCEL_IMPORT_LIMITS={maxSheets:60,maxRowsPerSheet:5000};
function assertWorkbookWithinLimits(workbook){
  const sheets=workbook.worksheets||[];
  if(sheets.length>EXCEL_IMPORT_LIMITS.maxSheets){
    throw new Error(`This file has ${sheets.length} sheets — far more than a Clerk of Court template ever has. It was not imported.`);
  }
  for(const ws of sheets){
    const n=ws.actualRowCount||ws.rowCount||0;
    if(n>EXCEL_IMPORT_LIMITS.maxRowsPerSheet){
      throw new Error(`Sheet "${ws.name}" has ${n} rows — far more than a Clerk of Court template ever has. It was not imported.`);
    }
  }
}

// Recursively sanitize all string fields in an object (for loaded data)
function sanitizeObjectData(obj){
  if(!obj||typeof obj!=='object')return obj;
  if(Array.isArray(obj))return obj.map(sanitizeObjectData);
  const sanitized={};
  for(const key in obj){
    const val=obj[key];
    if(typeof val==='string'){
      sanitized[key]=sanitizeInput(val);
    }else if(typeof val==='object'){
      sanitized[key]=sanitizeObjectData(val);
    }else{
      sanitized[key]=val;
    }
  }
  return sanitized;
}

// In-place counterpart to sanitizeObjectData, for a caller holding a live
// reference that must keep its identity — window.D during an Excel import
// is literally the object sitting in caseFile.wards, and sanitizeObjectData
// returning a NEW object would silently detach window.D from that array
// entry, so the next saveData() would persist the OLD, un-sanitized ward.
// importExcelFile builds a fresh object and can use sanitizeObjectData
// before ever touching window.D; the extracted Simplified and Annual importers
// write straight onto window.D field-by-field, so this mutates it afterward.
function sanitizeObjectDataInPlace(obj){
  if(!obj||typeof obj!=='object')return obj;
  if(Array.isArray(obj)){
    for(let i=0;i<obj.length;i++){
      if(typeof obj[i]==='string')obj[i]=sanitizeInput(obj[i]);
      else if(obj[i]&&typeof obj[i]==='object')sanitizeObjectDataInPlace(obj[i]);
    }
    return obj;
  }
  for(const key of Object.keys(obj)){
    const val=obj[key];
    if(typeof val==='string')obj[key]=sanitizeInput(val);
    else if(val&&typeof val==='object')sanitizeObjectDataInPlace(val);
  }
  return obj;
}

// Format phone as (123) 456-7890 — accepts only digits, pads/truncates to 10
function formatPhone(s){
  const digits=String(s||'').replace(/\D/g,'').slice(0,10);
  if(digits.length===0)return '';
  if(digits.length<=3)return `(${digits}`;
  if(digits.length<=6)return `(${digits.slice(0,3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0,3)}) ${digits.slice(3,6)}-${digits.slice(6)}`;
}

// Format SSN/EIN as XXX-XX-XXXX — accepts only digits, pads/truncates to 9
function formatSSN(s){
  const digits=String(s||'').replace(/\D/g,'').slice(0,9);
  if(digits.length===0)return '';
  if(digits.length<=3)return digits;
  if(digits.length<=5)return `${digits.slice(0,3)}-${digits.slice(3)}`;
  return `${digits.slice(0,3)}-${digits.slice(3,5)}-${digits.slice(5)}`;
}

// Case Number format is YY-######-GD: a 2-digit year, a sequentially
// issued 6-digit case number, and "GD" for Guardianship -- the only case
// type this app produces, so it's never something the guardian types
// themselves. Typing-time only inserts the dash after the year and caps
// input at 8 digits (2 + 6); it deliberately does NOT pad the sequence or
// append "-GD" here, so the field doesn't jump to "12-000000-GD" while
// the guardian is still in the middle of typing the sequence. That
// happens once in finalizeCaseNumber() below, on blur.
function formatCaseNumber(s){
  if(!s)return '';
  const raw=String(s).trim();
  const suffixMatch=raw.match(/[-_\s]?([A-Za-z]{1,4})$/);
  const suffix=suffixMatch?suffixMatch[1]:'';
  const withoutSuffix=suffixMatch?raw.slice(0,suffixMatch.index):raw;
  let digits=withoutSuffix.replace(/\D/g,'');
  if(digits.length>=8&&digits.startsWith('20')){
    digits=digits.slice(2);
  }
  digits=digits.slice(0,8);
  if(digits.length<=2){
    return suffix ? `${digits}-${suffix}` : digits;
  }
  const formattedDigits=`${digits.slice(0,2)}-${digits.slice(2)}`;
  return suffix ? `${formattedDigits}-${suffix}` : formattedDigits;
}

// Blur-time finalization: left-pads the sequence to 6 digits and appends
// the fixed "-GD" suffix, so "3-14-GD" from a guardian who typed "3145"
// becomes the properly formed "03-000145-GD". Only a bare year (0-2
// digits, nothing typed for the sequence yet) is left alone -- forcing a
// dangling "03--GD" onto a case number with no sequence at all would be
// worse than just leaving it incomplete for the required-field check to
// catch.
function finalizeCaseNumber(s){
  if(!s)return '';
  const raw=String(s).trim();
  if(!raw)return '';
  const suffixMatch=raw.match(/[-_\s]?([A-Za-z]{2,4})$/);
  const suffix=suffixMatch?suffixMatch[1].toUpperCase():'GD';
  const withoutSuffix=suffixMatch?raw.slice(0,suffixMatch.index):raw;
  let digits=withoutSuffix.replace(/\D/g,'');
  if(!digits)return raw;
  if(digits.length>=8&&digits.startsWith('20')){
    digits=digits.slice(2);
  }
  if(digits.length<=2)return digits;
  const year=digits.slice(0,2);
  const seq=digits.slice(2,8).padStart(6,'0');
  return `${year}-${seq}-${suffix}`;
}

// ═══════════════════════════════════════════════════════
// COUNTY AUTOCOMPLETE — every County field, previously a <select> hardcoded
// to just Pinellas/Pasco, is now a free-text input with a filtered dropdown
// of Florida's 67 counties (never more than 4 shown, narrowing as the
// guardian types), so the app isn't limited to those two counties anymore.
// Deliberately permissive rather than a locked-down <select>, matching the
// sidebar's own "type or select a ward" combobox elsewhere in the app: a
// suggestion list, not a hard constraint, since a guardian who knows their
// county correctly (the overwhelmingly common case) shouldn't be blocked
// by an autocomplete that doesn't yet match what they've typed so far.
// ═══════════════════════════════════════════════════════
const FL_COUNTIES=['Alachua','Baker','Bay','Bradford','Brevard','Broward','Calhoun','Charlotte','Citrus','Clay','Collier','Columbia','DeSoto','Dixie','Duval','Escambia','Flagler','Franklin','Gadsden','Gilchrist','Glades','Gulf','Hamilton','Hardee','Hendry','Hernando','Highlands','Hillsborough','Holmes','Indian River','Jackson','Jefferson','Lafayette','Lake','Lee','Leon','Levy','Liberty','Madison','Manatee','Marion','Martin','Miami-Dade','Monroe','Nassau','Okaloosa','Okeechobee','Orange','Osceola','Palm Beach','Pasco','Pinellas','Polk','Putnam','St. Johns','St. Lucie','Santa Rosa','Sarasota','Seminole','Sumter','Suwannee','Taylor','Union','Volusia','Wakulla','Walton','Washington'];

// ═══════════════════════════════════════════════════════
// COUNTY → CIRCUIT — every printed court caption used to hardcode "SIXTH
// JUDICIAL CIRCUIT" (and, on several form types, omitted the county
// entirely), which was accurate only while the app was scoped to
// Pinellas/Pasco -- both Sixth Circuit. Once the County field above was
// opened up to all 67 counties, that stopped being true: a case filed for,
// say, Orange County would print a caption naming the wrong circuit court
// altogether. This maps each county to its real Florida judicial circuit
// (1-20, per the official circuit map) so every doc-header function below
// can print the caption that actually matches whatever county was chosen.
// ═══════════════════════════════════════════════════════
const FL_COUNTY_CIRCUIT={
  Escambia:1,Okaloosa:1,'Santa Rosa':1,Walton:1,
  Franklin:2,Gadsden:2,Jefferson:2,Leon:2,Liberty:2,Wakulla:2,
  Columbia:3,Dixie:3,Hamilton:3,Lafayette:3,Madison:3,Suwannee:3,Taylor:3,
  Clay:4,Duval:4,Nassau:4,
  Citrus:5,Hernando:5,Lake:5,Marion:5,Sumter:5,
  Pasco:6,Pinellas:6,
  Flagler:7,Putnam:7,'St. Johns':7,Volusia:7,
  Alachua:8,Baker:8,Bradford:8,Gilchrist:8,Levy:8,Union:8,
  Orange:9,Osceola:9,
  Hardee:10,Highlands:10,Polk:10,
  'Miami-Dade':11,
  DeSoto:12,Manatee:12,Sarasota:12,
  Hillsborough:13,
  Bay:14,Calhoun:14,Gulf:14,Holmes:14,Jackson:14,Washington:14,
  'Palm Beach':15,
  Monroe:16,
  Broward:17,
  Brevard:18,Seminole:18,
  'Indian River':19,Martin:19,Okeechobee:19,'St. Lucie':19,
  Charlotte:20,Collier:20,Glades:20,Hendry:20,Lee:20
};
const CIRCUIT_ORDINALS=['','First','Second','Third','Fourth','Fifth','Sixth','Seventh','Eighth','Ninth','Tenth','Eleventh','Twelfth','Thirteenth','Fourteenth','Fifteenth','Sixteenth','Seventeenth','Eighteenth','Nineteenth','Twentieth'];
// Milestone 40C-A item 7: returns null for a blank or unrecognized county.
// This used to fall back to Sixth (Pinellas/Pasco), this app's original
// two-county scope, so an unfinished Cover still printed a real circuit name --
// which meant a filing with no county named a court confidently and wrongly.
// Mirrors src/core/pdf/circuit-lookup.js's circuitForCounty(); this classic
// script cannot import that ES module, which is why the duplicate exists.
function circuitForCounty(county){
  return FL_COUNTY_CIRCUIT[(county||'').trim()]||null;
}
// The shared court-caption line every doc-header function below prints,
// e.g. "IN THE CIRCUIT COURT OF THE NINTH JUDICIAL CIRCUIT<br>IN AND FOR
// ORANGE COUNTY, FLORIDA". `probateDivision` appends ", PROBATE DIVISION"
// for the form types whose caption already included it. Written already
// upper-cased (matching every other literal caption string in this file)
// rather than relying on .court-title's CSS text-transform, since this
// same markup is also rasterized by html2canvas for PDF export.
// Milestone 40C-A item 7: both of this function's own Pinellas/Sixth fallbacks
// are gone -- it defaulted the county NAME before the lookup ran, and then the
// ORDINAL after it, so removing either alone still printed a Pinellas caption.
// A filing with no county now renders a visible gap. Only an unfinished draft
// reaches this, since County validation blocks export.
const MISSING_COUNTY_CAPTION_HTML='COUNTY NOT SELECTED — COURT CAPTION INCOMPLETE';
function circuitCourtCaption(county,probateDivision){
  const c=(county||'').trim();
  const ord=c?(CIRCUIT_ORDINALS[circuitForCounty(c)]||'').toUpperCase():'';
  if(!c||!ord)return MISSING_COUNTY_CAPTION_HTML;
  return `IN THE CIRCUIT COURT OF THE ${ord} JUDICIAL CIRCUIT<br>IN AND FOR ${esc(c.toUpperCase())} COUNTY, FLORIDA${probateDivision?', PROBATE DIVISION':''}`;
}
// Local duplicate of core/filing/county-guidance.js's hasSixthCircuitLocalGuidance()
// -- this classic script can't import that ES module (same reason
// circuitForCounty above duplicates circuit-lookup.js rather than importing
// it). Deliberately NOT circuitForCounty()===6, and still deliberate after
// Milestone 40C-A item 7 removed that lookup's Sixth-Circuit fallback: this is
// an exact Pinellas/Pasco gate on the county name, not a circuit-number test,
// so a future change to the circuit map cannot widen a two-county local
// requirement. 40C-A explicitly retains this gating as-is.
function hasSixthCircuitLocalGuidance(county){
  const normalized=(county||'').trim().toLowerCase();
  return normalized==='pinellas'||normalized==='pasco';
}

// Shared markup: a plain text input plus an initially-empty dropdown right
// after it, both wrapped so the dropdown can be absolutely positioned
// against the input (see .ward-combobox-wrap, reused as-is here — the
// positioning rule was never ward-specific). `writeExpr` is whatever this
// particular field's own data-write convention is (D['field']=this.value,
// a custom setter string, or nothing at all for data-bind fields, which
// wire their own listener in bindForms() instead) — this function only
// ever concerns itself with the dropdown, never how the value gets saved.
function countyAutocompleteHTML(id,val,path){
  const binding=path?` data-form-path="${esc(path)}" data-annual-path="${esc(path)}"`:'';
  // Milestone 50H: a real WAI-ARIA combobox contract -- aria-controls names
  // the listbox, aria-expanded/aria-activedescendant are kept in sync by
  // filterCountyDropdown()/hideCountyDropdown()/onCountyKeydown() below,
  // and the listbox+options below carry the matching roles. Previously the
  // dropdown was mousedown-only with no keyboard route to it at all.
  return `<div class="ward-combobox-wrap county-combobox-wrap">
    <input type="text" class="form-control" id="${id}" autocomplete="off" value="${esc(val||'')}"
      role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="${id}-dropdown"
      data-form-control="county"${binding}>
    <div class="county-combobox-dropdown" id="${id}-dropdown" role="listbox"></div>
  </div>`;
}
// Up to 4 counties whose name starts with what's typed so far (case-
// insensitive); with nothing typed yet, the first 4 alphabetically, so
// focusing an empty field isn't just a dead dropdown.
function filterCountyDropdown(inp){
  const dd=document.getElementById(inp.id+'-dropdown');
  if(!dd)return;
  const q=inp.value.trim().toLowerCase();
  const matches=(q?FL_COUNTIES.filter(c=>c.toLowerCase().startsWith(q)):FL_COUNTIES).slice(0,4);
  inp.dataset.comboIndex='';
  inp.removeAttribute('aria-activedescendant');
  if(!matches.length){dd.classList.remove('show');dd.innerHTML='';inp.setAttribute('aria-expanded','false');return;}
  dd.innerHTML=matches.map((c,i)=>`<button type="button" class="county-combobox-item" id="${esc(inp.id)}-option-${i}" role="option" data-form-mousedown="select-county" data-input-id="${esc(inp.id)}" data-county="${esc(c)}">${esc(c)}</button>`).join('');
  dd.classList.add('show');
  inp.setAttribute('aria-expanded','true');
}
function hideCountyDropdown(id){
  const dd=document.getElementById(id+'-dropdown');
  if(dd)dd.classList.remove('show');
  const inp=document.getElementById(id);
  if(inp){inp.setAttribute('aria-expanded','false');inp.removeAttribute('aria-activedescendant');inp.dataset.comboIndex='';}
}
// onmousedown/onclick (below) on each item stops the input's blur from
// firing before the selection registers, the standard combobox trick —
// dispatching a real 'input' event here re-runs whatever write-expr this
// field was wired with in countyAutocompleteHTML() rather than duplicating
// that logic, and also re-triggers filterCountyDropdown(), which
// hideCountyDropdown() right after this correctly closes back up.
function selectCountyOption(id,county){
  const inp=document.getElementById(id);
  if(!inp)return;
  inp.value=county;
  inp.dispatchEvent(new Event('input',{bubbles:true}));
  hideCountyDropdown(id);
}
// Milestone 50H. Modelled on onWardSelectorKeydown() (this file, the sidebar
// Active Filing picker's own combobox): ArrowDown/ArrowUp move a highlighted
// option, Home/End jump, Escape closes, Enter commits. `inp` is whichever
// county field the keydown fired on -- unlike the ward selector this isn't
// a singleton, countyAutocompleteHTML() is reused for the ward's own county
// and (elsewhere) an attorney's, each with its own id/dropdown.
function onCountyKeydown(inp,e){
  const dd=document.getElementById(inp.id+'-dropdown');
  if(!dd)return;
  const options=[...dd.querySelectorAll('[role="option"]')];
  if(e.key==='Escape'){
    hideCountyDropdown(inp.id);
  }else if(e.key==='ArrowDown'||e.key==='ArrowUp'){
    e.preventDefault();
    if(!options.length)return;
    const current=Number.parseInt(inp.dataset.comboIndex,10);
    const next=Number.isInteger(current)
      ? (e.key==='ArrowDown' ? Math.min(current+1,options.length-1) : Math.max(current-1,0))
      : (e.key==='ArrowDown' ? 0 : options.length-1);
    inp.dataset.comboIndex=String(next);
    inp.setAttribute('aria-activedescendant',options[next].id);
  }else if(e.key==='Home'||e.key==='End'){
    e.preventDefault();
    if(!options.length)return;
    const next=e.key==='Home'?0:options.length-1;
    inp.dataset.comboIndex=String(next);
    inp.setAttribute('aria-activedescendant',options[next].id);
  }else if(e.key==='Enter'){
    const current=Number.parseInt(inp.dataset.comboIndex,10);
    if(Number.isInteger(current)&&options[current]){
      e.preventDefault();
      // Commits through the exact same path a real click does -- see the
      // "trap to avoid" note above selectCountyOption(): a real click's
      // mousedown listener is what actually calls it, so dispatching one
      // here (rather than calling selectCountyOption() directly) guarantees
      // the keyboard path can never diverge from the mouse path, including
      // the maybeCommitCoverCounty()/commitCoverCounty() chain that
      // establishes the canonical ward-Party county.
      options[current].dispatchEvent(new MouseEvent('mousedown',{bubbles:true}));
    }
    // No highlighted option: leave Enter's default behavior alone rather
    // than guessing a selection -- matches the WAI-ARIA combobox contract.
  }
}

// Format Florida Bar Number — a fixed-width, digits-only identifier. Bar numbers
// are sequential; retain all eight significant positions and normalize shorter
// values with leading zeroes when editing finishes.
function formatBarNumber(s){
  const digits=String(s??'').replace(/\D/g,'').slice(0,8);
  return digits?digits.padStart(8,'0'):'';
}

// Format bank account number — preserved identifier (may contain letters/dashes/slashes)
function formatAccountNumber(s){
  return (window.sanitizeStoredText ? window.sanitizeStoredText(s) : String(s||'').trim());
}

// Format check number — preserved identifier (may contain letters/dashes, e.g. CHK-104A)
function formatCheckNumber(s){
  return (window.sanitizeStoredText ? window.sanitizeStoredText(s) : String(s||'').trim());
}

// Format Name & Address — safe title case on blur, preserving acronyms and mixed case
function formatName(s){
  return (window.formatSafeTitleCase ? window.formatSafeTitleCase(s) : String(s||'').trim());
}

// Same as formatName for addresses/streets
function formatAddress(s){
  return formatName(s);
}


// Excel imports can carry all-lowercase (or all-caps) text. Walk the parsed
// data and apply the exact same per-field capitalization that manual typing
// already gets (see inpD/inpS/bindForms), keyed off the field name instead
// of a form label, so imported values match what typing them would produce.
function capitalizeImportedFields(obj){
  if(Array.isArray(obj)){
    obj.forEach(capitalizeImportedFields);
    return obj;
  }
  if(obj&&typeof obj==='object'){
    for(const k of Object.keys(obj)){
      const v=obj[k];
      if(typeof v!=='string'||!v){continue;}
      const kl=k.toLowerCase();
      if(kl.includes('email')){
        // leave as-is
      }else if(kl.includes('citystatezip')){
        obj[k]=formatCityStateZip(v);
      }else if(kl.includes('street')||(kl.includes('address'))){
        obj[k]=formatAddress(v);
      }else if(['name','payer','payee','lender','creditor','institution','guardian','attorney','trustee','claimant','description','bonding','company','trust'].some(w=>kl.includes(w))){
        obj[k]=formatName(v);
      }
    }
    for(const k of Object.keys(obj)){
      if(obj[k]&&typeof obj[k]==='object')capitalizeImportedFields(obj[k]);
    }
  }
  return obj;
}

// Limit digits in a City/State/Zip field to 9 (a 5-digit ZIP, or a full
// ZIP+4) -- was capped at 5, which silently mangled any ZIP+4 entry
// ("33756-4321" loses its last 4 digits mid-keystroke instead of just
// rejecting the extra ones cleanly).
function applyZipLimit(el){
  const digitCount=(el.value.match(/\d/g)||[]).length;
  if(digitCount>9){
    const arr=el.value.split('');
    let removed=0;
    for(let i=arr.length-1;i>=0&&removed<digitCount-9;i--){
      if(/\d/.test(arr[i])){arr.splice(i,1);removed++;}
    }
    el.value=arr.join('');
  }
}

// Update an input field with formatted phone, keeping user experience smooth
// Highlight form fields that have validation errors with red borders
// ═══════════════════════════════════════════════════════
// VALIDATION SUMMARY
// Every message from validate() reads "<Section> — <Field>", so it can be
// grouped instead of listed flat. Section prefixes map to wizard routes
// ("Cover"→/, "B-1 row 3"→/b1, "Part IV"→/p4, "Sch D2"→/schd2), which is
// what lets each group offer a jump link.
// ═══════════════════════════════════════════════════════
const PLAN_SECTION_ROUTES = {
  planInitial: {
    'cover': '/',
    '2-3. setting & medical care': '/p2',
    'setting & medical care': '/p2',
    '4-5. mental health & personal care': '/p3',
    'mental health & personal care': '/p3',
    '6-7. socialization & benefits': '/p4',
    'socialization & benefits': '/p4',
    '9. examining providers': '/p5',
    'examining providers': '/p5',
    '10a. daily living': '/p6',
    '10a': '/p6',
    'daily living': '/p6',
    '10b-d. disabilities & devices': '/p7',
    '10b-d': '/p7',
    'disabilities & devices': '/p7',
    '11. advance directives': '/p8',
    'advance directives': '/p8',
    'signatures': '/p9',
    'attorney certification': '/p10',
  },
  planAnnual: {
    'cover': '/',
    '1. residences': '/p2',
    'residences': '/p2',
    '2-3. residence & care': '/p3',
    'residence & care': '/p3',
    '3g. insurance & benefits': '/p4',
    'insurance & benefits': '/p4',
    '4. medical treatment': '/p5',
    'medical treatment': '/p5',
    '5-7. skills & rights': '/p6',
    'skills & rights': '/p6',
    '8. daily living': '/p7',
    'daily living': '/p7',
    '9. disabilities & devices': '/p8',
    'disabilities & devices': '/p8',
    '10. advance directives': '/p9',
    'advance directives': '/p9',
    '11. remuneration': '/p10',
    'remuneration': '/p10',
    'signatures': '/p11',
  },
  planMinor: {
    'cover': '/',
    '2. prior residences': '/p2',
    'prior residences': '/p2',
    '3. treatment providers': '/p3',
    'treatment providers': '/p3',
    '4. medical services': '/p4',
    'medical services': '/p4',
    '5. education & social development': '/p5',
    'education & social development': '/p5',
    'guardian signatures': '/p6',
    'preparer & attorney': '/p7',
  },
  planSimplified: {
    'cover': '/',
    'the plan': '/p2',
    'plan': '/p2',
    'signatures': '/p3',
  },
};

function errorRoute(section, filingType){
  const s=(section||'').trim();
  if(!s)return '/';
  if(/^Cover/i.test(s))return '/';
  const type = filingType || (typeof activeInventoryType !== 'undefined' ? activeInventoryType : null);
  const norm = str => String(str||'').toLowerCase().replace(/[\u2013\u2014]/g, '-').replace(/\s+/g, ' ').trim();
  const sNorm = norm(s);

  if(type && PLAN_SECTION_ROUTES[type]){
    const hit = PLAN_SECTION_ROUTES[type][sNorm];
    if(hit) return hit;
    for(const [prefix, route] of Object.entries(PLAN_SECTION_ROUTES[type])){
      if(sNorm === prefix || sNorm.startsWith(prefix) || prefix.startsWith(sNorm)) return route;
    }
  }

  let m=s.match(/^Sch(?:edule)?\s*([A-Za-z])[-\s]?(\d*)/i);
  if(m)return '/sch'+m[1].toLowerCase()+(m[2]||'');
  m=s.match(/^([A-Za-z])-(\d+)/);
  if(m)return '/'+m[1].toLowerCase()+m[2];
  const R={I:1,II:2,III:3,IV:4,V:5,VI:6,VII:7,VIII:8,IX:9,X:10,XI:11};
  // Combined-part pages, e.g. Annual's "Parts VI & VII" -> /p67. Must be
  // tried before the single-part pattern, which would otherwise not match
  // at all ("Parts" breaks /^Part\s/).
  m=s.match(/^Parts?\s+([IVXLC]+)\s*(?:&|and)\s*([IVXLC]+)/i);
  if(m){
    const a=R[m[1].toUpperCase()],b=R[m[2].toUpperCase()];
    if(a&&b)return '/p'+a+b;
  }
  m=s.match(/^Part\s+([IVXLC]+)/i);
  if(m){
    const n=R[m[1].toUpperCase()];
    if(n)return n===1?'/':'/p'+n;
  }

  for(const planType of Object.keys(PLAN_SECTION_ROUTES)){
    const map = PLAN_SECTION_ROUTES[planType];
    const hit = map[sNorm];
    if(hit) return hit;
    for(const [prefix, route] of Object.entries(map)){
      if(sNorm === prefix || sNorm.startsWith(prefix) || prefix.startsWith(sNorm)) return route;
    }
  }

  return null;
}
function validationPanel(errors,opts){
  opts=opts||{};
  const groups=new Map();
  errors.forEach(e=>{
    // Milestone 42F: issues may be objects with .message; see validation-issue.js.
    const str=e&&typeof e==='object'?String(e.message??e):String(e);
    const i=str.indexOf(' — ');
    const section=i>-1?str.slice(0,i).trim():'Other';
    let field=i>-1?str.slice(i+3).trim():str;
    field=field.replace(/\s+is required\.?$/i,'').replace(/\.$/,'');
    if(!groups.has(section))groups.set(section,[]);
    groups.get(section).push(field);
  });
  // Only offer a jump link when the route is a real page in this wizard.
  const valid=new Set((PAGES[activeInventoryType]||PAGES_GUARDIAN||[]).map(p=>p.id));
  const rows=[...groups.entries()].map(([section,fields])=>{
    const route=errorRoute(section, activeInventoryType);
    const go=(route&&valid.has(route))
      ? `<button type="button" class="validation-go" data-form-action="navigate" data-route="${esc(route)}">Go to section ${ic('external',13)}</button>`
      : '';
    return `<div class="validation-group">
      <div class="validation-group-head">
        <span class="validation-group-name">${esc(section)}</span>
        <span class="validation-count">${fields.length}</span>
        ${go}
      </div>
      <div class="validation-fields">${fields.map(f=>`<span class="validation-field">${esc(f)}</span>`).join('')}</div>
    </div>`;
  }).join('');
  const n=errors.length;
  return `<div class="validation-panel no-print">
    <summary class="validation-head">
      ${ic('alert',17)}
      <div>
        <div class="validation-title">${n} required field${n===1?'':'s'} still missing</div>
        <div class="validation-sub">${opts.subtitle||`Across ${groups.size} section${groups.size===1?'':'s'}, listed below. These must be completed before this ward can be exported.`}</div>
      </div>
    </div>
    <div class="validation-groups">${rows}</div>
  </div>`;
}

// ═══════════════════════════════════════════════════════
// PRINT-PREVIEW PAGER
// Shows one filing page at a time instead of a continuous scroll of all of
// them. Purely a viewing filter: exports and printing always operate on the
// complete set (see the !important rules under @media print and
// .pdf-export-mode, plus pvShowAll() called before every export).
// Labels are read back out of each page's own court header, so this works
// for all three inventory types without touching the three builders.
// ═══════════════════════════════════════════════════════
let _pvSelection='1'; // '1'-based page number, or 'all'

function pvPages(){
  const cont=document.getElementById('print-doc-container');
  if(!cont)return [];
  return [...cont.children].filter(el=>el.classList&&el.classList.contains('pdf-page'));
}
function pvLabelFor(page,i){
  // docHeader() puts "<Schedule> — Page <n>" in the middle cell of .doc-meta.
  const meta=page.querySelector('.doc-meta');
  if(meta){
    const spans=meta.querySelectorAll('span');
    if(spans.length>=2){
      const t=spans[1].textContent.replace(/\s+/g,' ').trim();
      if(t)return t;
    }
  }
  const title=page.querySelector('.doc-schedule-title');
  if(title){
    const t=title.textContent.replace(/\s+/g,' ').trim();
    if(t)return t;
  }
  return 'Page '+(i+1);
}
// Drop the viewing filter so every page is in the layout. Called before any
// export or print, and by the "All pages" option.
function pvShowAll(){
  const cont=document.getElementById('print-doc-container');
  if(!cont)return;
  cont.classList.remove('pv-single');
  pvPages().forEach(p=>p.classList.remove('pv-show'));
}
function pvApply(){
  const cont=document.getElementById('print-doc-container');
  if(!cont)return;
  const pages=pvPages();
  if(_pvSelection==='all'||pages.length<2){pvShowAll();}
  else{
    let idx=parseInt(_pvSelection,10)-1;
    if(!(idx>=0&&idx<pages.length))idx=0;
    cont.classList.add('pv-single');
    pages.forEach((p,i)=>p.classList.toggle('pv-show',i===idx));
  }
  const sel=document.getElementById('pv-select');
  if(sel&&sel.value!==_pvSelection)sel.value=_pvSelection;
  const count=document.getElementById('pv-count');
  if(count){
    count.textContent=_pvSelection==='all'
      ? `All ${pages.length} pages`
      : `Page ${parseInt(_pvSelection,10)} of ${pages.length}`;
  }
  const prev=document.getElementById('pv-prev'),next=document.getElementById('pv-next');
  const n=parseInt(_pvSelection,10);
  if(prev)prev.disabled=(_pvSelection==='all'||n<=1);
  if(next)next.disabled=(_pvSelection==='all'||n>=pages.length);
}
function pvSelect(v){
  _pvSelection=v;
  pvApply();
  // .pv-bar is sticky (position:sticky;top), so it never has to be scrolled
  // into view — it's pinned at a fixed screen position no matter how tall
  // the page below it is, which is what makes Next/Prev clickable repeatedly
  // without moving the mouse. This just scrolls the new page's own content
  // to the top; #print-doc-container's scroll-margin-top keeps that top
  // edge from landing underneath the sticky bar.
  const cont=document.getElementById('print-doc-container');
  if(cont&&cont.scrollIntoView)cont.scrollIntoView({block:'start',behavior:'smooth'});
}
function pvStep(delta){
  const pages=pvPages();
  if(_pvSelection==='all')return;
  let n=parseInt(_pvSelection,10)+delta;
  n=Math.max(1,Math.min(pages.length,n));
  pvSelect(String(n));
}
function initPrintPager(options={}){
  const cont=document.getElementById('print-doc-container');
  if(!cont)return;
  const pages=pvPages();
  // The filing-level shell actions belong to the Preview & Export banner,
  // regardless of whether the generated filing needs a multi-page pager.
  // This must run before the single-page early return below; otherwise those
  // previews lose All Filings, theme, and Help entirely.
  const destination=document.querySelector('[data-preview-shell-actions]');
  const headerActions=document.querySelector('.schedule-page > h1 .form-header-actions, .schedule-page h1 .form-header-actions');
  if(headerActions&&destination&&!destination.querySelector('.pv-shell-actions')){
    headerActions.classList.remove('form-header-actions');
    headerActions.classList.add('pv-shell-actions');
    destination.appendChild(headerActions);
  }else if(destination&&!destination.querySelector('.pv-shell-actions')){
    const isDark=document.documentElement.getAttribute('data-theme')==='dark';
    const helpOpen=typeof window.isHelpPanelOpen==='function'&&window.isHelpPanelOpen();
    const shellActions=document.createElement('div');
    shellActions.className='pv-shell-actions';
    shellActions.innerHTML=`<button type="button" class="topnav-btn" data-shell-action="dashboard">${ic('home',16)} All Filings</button><button type="button" class="topnav-btn topnav-theme" id="theme-toggle-btn" data-shell-action="toggle-theme" title="Switch theme" aria-label="Switch to ${isDark?'light':'dark'} theme" aria-pressed="${isDark}">${ic(isDark?'sun':'moon',16)}</button><button type="button" class="topnav-btn topnav-help" id="help-toggle-btn" data-shell-action="toggle-help" title="Help" aria-label="Help" aria-haspopup="true" aria-expanded="${helpOpen}" aria-controls="help-panel">?</button>`;
    destination.appendChild(shellActions);
  }
  if(pages.length<2)return;                       // nothing to page through
  const existing=document.getElementById('pv-bar');
  if(existing){
    if(!options.refresh)return;
    const existingActions=existing.querySelector('.pv-shell-actions');
    const destination=document.querySelector('[data-preview-shell-actions]');
    if(existingActions&&destination)destination.replaceChildren(existingActions);
    existing.remove();
  }
  if(!(_pvSelection==='all'||(parseInt(_pvSelection,10)>=1&&parseInt(_pvSelection,10)<=pages.length))){
    _pvSelection='1';
  }
  const opts=pages.map((p,i)=>
    `<option value="${i+1}">${i+1}. ${esc(pvLabelFor(p,i))}</option>`).join('');
  const bar=document.createElement('div');
  bar.id='pv-bar';
  bar.className='pv-bar no-print';
  bar.innerHTML=`
    <span class="pv-viewing"><span class="pv-label">Viewing</span>
      <select id="pv-select" class="form-select form-select-sm pv-select"
              aria-label="Choose which page of the filing to preview"
              data-form-change="preview-page">
        ${opts}
        <option value="all">All pages (continuous)</option>
      </select>
    </span>
    <span class="pv-navigation"><span class="pv-count" id="pv-count"></span>
      <span class="pv-nav">
        <button type="button" class="btn btn-sm btn-outline-secondary" id="pv-prev" data-form-action="preview-step" data-step="-1">← Prev</button>
        <button type="button" class="btn btn-sm btn-outline-secondary" id="pv-next" data-form-action="preview-step" data-step="1">Next →</button>
      </span>
    </span>`;
  cont.parentNode.insertBefore(bar,cont);
  pvApply();
}

function highlightErrors(errorMessages){
  // First, clear all previous error highlights
  document.querySelectorAll('.validation-error-field').forEach(el=>{
    el.classList.remove('validation-error-field');
  });

  // Then highlight fields matching each error message
  errorMessages.forEach(err=>{
    // Extract field name from error message (e.g., "Ward Name" from "Ward Name is required")
    const match=err.match(/^([^(]+?)\s+(?:is required|must be|cannot)/i);
    if(!match)return;
    const fieldName=match[1].toLowerCase().trim();

    // Find all labels and inputs that mention this field
    document.querySelectorAll('label, input, select, textarea').forEach(el=>{
      const text=el.textContent||el.placeholder||el.id||'';
      if(text.toLowerCase().includes(fieldName)){
        let target=el;
        if(el.tagName==='LABEL'){
          // Find the input associated with this label
          const labelFor=el.getAttribute('for');
          if(labelFor){
            target=document.getElementById(labelFor);
          }else{
            target=el.querySelector('input, select, textarea')||el.parentElement.querySelector('input, select, textarea');
          }
        }
        if(target&&['INPUT','SELECT','TEXTAREA'].includes(target.tagName)){
          target.classList.add('validation-error-field');
        }
      }
    });
  });
}

// Prevent negative values in number inputs (amount fields)
function enforceNonNegative(input) {
  if (input.type === 'number') {
    let val = input.value;
    // Remove any minus signs
    val = val.replace(/^-/, '');
    input.value = val;
  }
}

// Apply no-negative enforcement to all amount inputs
function setupAmountFieldValidation() {
  document.querySelectorAll('input[type="number"]').forEach(input => {
    const id = input.id || '';
    const name = input.name || '';
    const isAmountField = id.includes('amount') || id.includes('balance') || id.includes('price') ||
                          id.includes('starting') || id.includes('income') || id.includes('charge') ||
                          id.includes('tax') || id.includes('settlement') ||
                          name.includes('amount') || name.includes('balance') || name.includes('price');

    if (isAmountField) {
      input.min = '0';
      // Real-time validation as user types
      input.addEventListener('input', function() { enforceNonNegative(this); });
      input.addEventListener('change', function() { enforceNonNegative(this); });
      input.addEventListener('blur', function() { enforceNonNegative(this); });
    }
  });
}

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
const PARTY_FIELD_ROWS=[
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
const SLOT_FIELD_LABELS={name:'Name',taxId:'SSN/EIN/TIN',barNumber:'Bar Number',phone:'Phone',email:'Email',secondaryEmail:'Secondary Email',street:'Street Address',cityStateZip:'City/State/Zip',officeStreet:'Office Street',officeCityStateZip:'Office City/State/Zip',mailingStreet:'Mailing Street',mailingCityStateZip:'Mailing City/State/Zip'};
function partyFieldValue(party,path){
  return path.split('.').reduce((v,k)=>v&&v[k],party)||'';
}
function partyRoleBadgesHTML(party){
  return (party.roles||[]).map(r=>`<span class="badge bg-secondary">${esc(r)}</span>`).join(' ');
}
function filingLabel(filing){
  return `${filing.wardName||'(unnamed)'} — ${INVENTORY_TYPES[filing.inventoryType]?.name||filing.inventoryType}${filing.archived?' (closed)':''}`;
}
function slotLabel(role,index){
  return role==='guardian'?`Guardian ${index+1}`:role.charAt(0).toUpperCase()+role.slice(1);
}
// The filings a record is linked into, one line per slot -- for a ward the
// most useful clue to whether two records are the same person.
function partyReferenceLinesHTML(partyId){
  const lines=[];
  for(const filing of caseFile.wards||[]){
    for(const slot of window.slotsReferencing(filing,partyId))lines.push(`${filingLabel(filing)} · ${slotLabel(slot.role,slot.index)}`);
  }
  if(!lines.length)return '<div style="font-size:.8rem;color:var(--ink-3);">Not linked to any filing</div>';
  return `<div style="font-size:.8rem;color:var(--ink-3);">Used by:</div><ul class="mb-0 ps-3" style="font-size:.8rem;">${lines.map(l=>`<li>${esc(l)}</li>`).join('')}</ul>`;
}
// Screen-local selection state, never persisted: the (at most two) directory
// rows ticked to compare, and the sub rows ticked to unmerge. Reset each
// time the page is opened.
let _partyCompareIds=[];
let _partyUnmergeIds=[];
function pagePartyManagement(){
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
function renderPartyManagementBody(){
  renderPartyDedupeQueue();
  renderPartyDirectoryRows();
}
// Recomputed fresh on every call (page open, or after any merge/dismiss) --
// candidates are cheap to derive and never cached, so the queue can never
// go stale relative to caseFile.parties.
function renderPartyDedupeQueue(){
  const host=document.getElementById('party-dedupe-queue');
  if(!host)return;
  const manual=manualCompareCandidate();
  const cards=[...(manual?[manual]:[]),...window.findDuplicateCandidates()];
  if(!cards.length){host.innerHTML='<div class="dashboard-empty-inline">No likely duplicates found. Tick <b>Compare</b> on any two records below to review them here.</div>';return;}
  host.innerHTML=cards.map(partyDedupeCardHTML).join('');
}
function manualCompareCandidate(){
  if(_partyCompareIds.length!==2)return null;
  const [partyA,partyB]=_partyCompareIds.map(id=>(caseFile.parties||[]).find(p=>p.id===id&&!p.mergedInto));
  if(!partyA||!partyB)return null;
  return {partyA,partyB,strongMatch:false,matchKind:'manual'};
}
function partyMatchBadge({matchKind,strongMatch}){
  if(matchKind==='manual')return ['Selected by you','bg-primary'];
  if(matchKind==='near')return strongMatch?['Similar name and same contact info','bg-danger']:['Possible match: similar name','bg-warning text-dark'];
  return strongMatch?['Same name and contact info','bg-danger']:['Same name only','bg-secondary'];
}
function partyDedupeCardHTML(candidate){
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
function renderPartyDirectoryRows(){
  const host=document.getElementById('party-directory-rows');
  if(!host)return;
  const q=(document.getElementById('party-directory-search')?.value||'').trim().toLowerCase();
  const parties=(caseFile.parties||[]).filter(p=>!p.mergedInto&&(!q||String(p.name||'').toLowerCase().includes(q)));
  const toolbar=_partyUnmergeIds.length?`<div class="mb-2"><button type="button" class="btn btn-sm btn-outline-primary" data-form-action="party-unmerge-selected">Unmerge Selected (${_partyUnmergeIds.length})</button></div>`:'';
  if(!parties.length){host.innerHTML=toolbar+'<div class="dashboard-empty-inline">No shared records yet.</div>';return;}
  const compareFull=_partyCompareIds.length>=2;
  host.innerHTML=toolbar+parties.map(p=>{
    const count=window.referenceCountForParty(p.id);
    const checked=_partyCompareIds.includes(p.id);
    return `<div class="entry-card mb-2">
    <div class="d-flex justify-content-between align-items-center gap-2">
      <div class="form-check mb-0">
        <input class="form-check-input" type="checkbox" id="party-compare-${esc(p.id)}" title="Compare" data-form-action="party-compare-toggle" data-party-id="${esc(p.id)}"${checked?' checked':''}${!checked&&compareFull?' disabled':''}>
        <label class="form-check-label" for="party-compare-${esc(p.id)}"><strong>${esc(p.name)||'(unnamed)'}</strong> ${partyRoleBadgesHTML(p)}</label>
      </div>
      <span style="font-size:.8rem;color:var(--ink-3);white-space:nowrap;">${count} reference${count===1?'':'s'}</span>
    </div>
    ${window.subPartiesOf(p.id).map(partySubRowHTML).join('')}
    ${partyClosedDriftHTML(p.id)}
  </div>`;
  }).join('');
}
// Closed filings whose copy of this record has fallen behind it, each with
// its own Sync with Current button (see party-resolver.js's closed-filing
// section for why they don't just stay in sync).
function partyClosedDriftHTML(partyId){
  const drift=window.closedFilingDrift(partyId);
  if(!drift.length)return '';
  const rows=drift.map(d=>`<div class="d-flex justify-content-between align-items-center gap-2 mt-1">
    <span style="font-size:.85rem;">Closed filing <b>${esc(filingLabel(d.filing).replace(' (closed)',''))}</b> · ${esc(slotLabel(d.role,d.index))} differs: ${esc(d.differences.map(x=>SLOT_FIELD_LABELS[x.key]||x.key).join(', '))}</span>
    <button type="button" class="btn btn-sm btn-outline-primary text-nowrap" data-form-action="party-sync-closed" data-ward-id="${esc(d.filing.wardId)}" data-role="${esc(d.role)}" data-index="${d.index}">Sync with Current</button>
  </div>`).join('');
  const all=drift.length>1?`<div class="mt-2"><button type="button" class="btn btn-sm btn-primary" data-form-action="party-sync-closed-all" data-party-id="${esc(partyId)}">Sync All (${drift.length})</button></div>`:'';
  return `<div class="ms-3 ps-3 mt-2 border-start">${rows}${all}</div>`;
}
async function doPartySyncClosed(wardId,role,index){
  const filing=(caseFile.wards||[]).find(w=>w.wardId===wardId);
  if(!filing)return;
  if(window.syncFilingSlotWithParty(filing,role,Number(index)||0)){
    await auditLog('PARTY_SYNC',`Synced ${slotLabel(role,Number(index)||0)} on closed filing "${filing.wardName}" with its shared record`,true,wardId);
    autoSave();
  }
  renderPartyManagementBody();
}
async function doPartySyncClosedAll(partyId){
  for(const d of window.closedFilingDrift(partyId)){
    if(window.syncFilingSlotWithParty(d.filing,d.role,d.index))await auditLog('PARTY_SYNC',`Synced ${slotLabel(d.role,d.index)} on closed filing "${d.filing.wardName}" with its shared record`,true,d.filing.wardId);
  }
  autoSave();
  renderPartyManagementBody();
}
// The Cover of a closed filing: which linked records have moved on since it
// was closed, with a Sync with Current button per slot. Rendered by the
// router after the feature mounts its Cover, only for closed filings.
function renderClosedFilingSyncNotice(container,filing){
  if(!container||!filing||!filing.archived)return;
  container.querySelector('[data-closed-filing-sync]')?.remove();
  const drift=window.filingDriftFromParties(filing);
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
async function doFilingSyncClosed(role,index){
  const filing=window.D;
  if(!filing)return;
  const slots=role?[{role,index:Number(index)||0}]:window.filingDriftFromParties(filing).map(d=>({role:d.role,index:d.index}));
  for(const s of slots){
    if(window.syncFilingSlotWithParty(filing,s.role,s.index))await auditLog('PARTY_SYNC',`Synced ${slotLabel(s.role,s.index)} on closed filing "${filing.wardName}" with its shared record`,true,filing.wardId);
  }
  autoSave();
  renderPage(currentPage);
}
function partySubRowHTML(sub){
  const checked=_partyUnmergeIds.includes(sub.id);
  const mergedAt=sub.mergeRecord?.mergedAt?new Date(sub.mergeRecord.mergedAt).toLocaleDateString():'';
  return `<div class="ms-3 ps-3 mt-2 border-start"><div class="form-check mb-0">
    <input class="form-check-input" type="checkbox" id="party-unmerge-${esc(sub.id)}" title="Select to unmerge" data-form-action="party-unmerge-toggle" data-party-id="${esc(sub.id)}"${checked?' checked':''}>
    <label class="form-check-label" for="party-unmerge-${esc(sub.id)}" style="font-size:.85rem;">${esc(sub.name)||'(unnamed)'} ${partyRoleBadgesHTML(sub)} <span style="font-size:.78rem;color:var(--ink-3);">merged into this record${mergedAt?' on '+esc(mergedAt):''}</span></label>
  </div></div>`;
}
function togglePartyCompareSelection(partyId,checked){
  _partyCompareIds=_partyCompareIds.filter(id=>id!==partyId);
  if(checked&&_partyCompareIds.length<2)_partyCompareIds.push(partyId);
  renderPartyManagementBody();
}
function clearPartyCompareSelection(){
  _partyCompareIds=[];
  renderPartyManagementBody();
}
function togglePartyUnmergeSelection(partyId,checked){
  _partyUnmergeIds=_partyUnmergeIds.filter(id=>id!==partyId);
  if(checked)_partyUnmergeIds.push(partyId);
  renderPartyManagementBody();
}
// The confirmModal() message doubles as the "prompt per-field" step the
// persistence-rewrite plan calls for: it lists every field that would be
// backfilled onto the primary record from the sub (blank-on-primary,
// present-on-sub) so nothing is adopted silently. Cancelling aborts the
// whole merge -- there's no partial-adopt state to manage.
async function doPartyMergeKeep(keepId,discardId){
  const keep=window.resolveParty(keepId),discard=window.resolveParty(discardId);
  if(!keep||!discard)return;
  const conflict=typeof window.wardCountyMergeConflict==='function'?window.wardCountyMergeConflict(keepId,discardId):null;
  const adoptable=PARTY_FIELD_ROWS.filter(([path])=>!partyFieldValue(keep,path)&&partyFieldValue(discard,path));
  let message=`Make "${keep.name}" the primary record and merge "${discard.name}" into it?\n\nEvery filing and case referencing "${discard.name}" will be updated to reference "${keep.name}" instead. "${discard.name}" will be listed beneath "${keep.name}" in All Shared Records, where it can be unmerged later.`;
  if(conflict){
    message+=`\n\nWarning: Conflicting ward counties detected ("${conflict.keepCounty}" vs "${conflict.discardCounty}"). Merging will retain "${conflict.keepCounty}" on "${keep.name}".`;
  }
  if(adoptable.length){
    message+=`\n\nAlso fill in these currently-blank fields on "${keep.name}" from "${discard.name}":\n`+adoptable.map(([path,label])=>`• ${label}: ${partyFieldValue(discard,path)}`).join('\n');
  }
  if(!(await window.confirmModal(message)))return;
  window.mergeParties(keepId,discardId,{adoptBlankFields:adoptable.length>0});
  await auditLog('PARTY_MERGE',`Merged "${discard.name}" into "${keep.name}"`,true);
  _partyCompareIds=[];
  autoSave();
  renderPartyManagementBody();
}
async function doPartyDismissPair(idA,idB){
  window.dismissPartyPair(idA,idB);
  autoSave();
  renderPartyManagementBody();
}
async function doPartyUnmergeSelected(){
  const subs=_partyUnmergeIds.map(id=>(caseFile.parties||[]).find(p=>p.id===id)).filter(p=>p&&p.mergedInto&&p.mergeRecord);
  if(!subs.length)return;
  const lines=subs.map(s=>`• "${s.name}" (merged into "${window.resolveParty(s.mergedInto)?.name}")`);
  const message=`Unmerge ${subs.length===1?'this record':'these records'}?\n\n${lines.join('\n')}\n\nEach becomes its own shared record again. Filings and cases that referenced it before the merge will reference it again, and any fields the primary record filled in from it will be cleared -- unless you have changed them since.`;
  if(!(await window.confirmModal(message)))return;
  for(const sub of subs){
    const primaryName=window.resolveParty(sub.mergedInto)?.name;
    if(window.unmergeParty(sub.id))await auditLog('PARTY_UNMERGE',`Unmerged "${sub.name}" from "${primaryName}"`,true);
  }
  _partyUnmergeIds=[];
  autoSave();
  renderPartyManagementBody();
}

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
    window.commitStoredDateDrafts?.(activeWard,window.setPath);
    activeWard.lastModified=new Date().toISOString();
  }
  // Best-effort local resume snapshot, used only by lockApp() when the app
  // auto-locks before any .sav has ever been saved (see recovery-cache.js's
  // file header); a successful .sav write clears it. Awaited so callers
  // that depend on it having landed before acting further (lockApp() wiping
  // memory, beforeunload) aren't racing an in-flight IndexedDB write.
  if(_dirtySinceExport){
    const cached=await saveSessionRestoreCache();
    if(!cached)showSaveError();
    else hideSaveError();
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

function getActiveWard(){
  if(!caseFile.activeWardId)return null;
  return caseFile.wards.find(w=>w.wardId===caseFile.activeWardId);
}

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

// caseFile is a top-level `let`, reassigned wholesale in several places
// (lock/reset/load-from-.sav) -- a one-time `window.caseFile=caseFile`
// bridge would go stale after any of those. This accessor always returns the
// current object; src/features/dashboard/index.js reads through it live via
// a Proxy rather than caching a reference (see that file's own comment).
function getCaseFile(){ return caseFile; }
window.getCaseFile=getCaseFile;

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

// Pairs each Guardianship Plan type with the Accounting type a guardian
// typically files alongside it for the same person — guardian<->planInitial,
// simplified<->planSimplified, annual<->planAnnual — so ward identity and
// guardian contact info can be carried over in EITHER direction instead of
// retyped, whichever filing gets created first. Symmetric on purpose: a
// single lookup (by whichever type you're about to create) tells you what
// to carry from. Annual Plan — Minors has no natural Accounting counterpart
// (a minor's plan isn't paired with a specific accounting type) so it's
// intentionally left out of both directions.
// Every ward type that can populate a NEW ward of the given type, most
// closely-related first (the picker lists them in this order).
//
// Two kinds of relationship are represented:
//   * Accounting <-> its matching Plan — the original pairing, symmetric.
//   * Accounting <- an earlier Accounting for the same ward. An Annual is
//     normally prepared from the Initial Inventory or from the previous
//     period's filing, so those are offered as sources too; this is what
//     lets an Initial Inventory feed a new Annual Accounting.
// Final/Trust Accounting share the Annual form, so they accept and are
// accepted by the same set.
const ACCOUNTING_FORM_TYPES=['guardian','simplified','annual','finalAccounting','trustAccounting'];
const PRIOR_ACCOUNTING_SOURCES=['guardian','simplified','annual','finalAccounting','trustAccounting'];
// Which existing filings may seed a new one at creation time. Every filing for
// the same ward carries the same identity and contact block, so any type is a
// valid source for any other; the picker used to list one counterpart only and
// silently omitted the ward's other filings (Milestone 36-7 item 17).
const CARRY_SOURCE_TYPE={
  planInitial:['guardian','annual','simplified','finalAccounting','trustAccounting','planInitial','planAnnual','planSimplified','planMinor'],
  planSimplified:['simplified','guardian','annual','finalAccounting','trustAccounting','planSimplified','planInitial','planAnnual','planMinor'],
  planAnnual:['annual','guardian','simplified','finalAccounting','trustAccounting','planAnnual','planInitial','planSimplified','planMinor'],
  planMinor:['guardian','annual','simplified','finalAccounting','trustAccounting','planMinor','planInitial','planAnnual','planSimplified'],
  guardian:['planInitial','annual','simplified','finalAccounting','trustAccounting','planAnnual','planSimplified','planMinor'],
  simplified:['planSimplified',...PRIOR_ACCOUNTING_SOURCES.filter(t=>t!=='simplified'),'planInitial','planAnnual','planMinor'],
  annual:['planAnnual',...PRIOR_ACCOUNTING_SOURCES.filter(t=>t!=='annual'),'planInitial','planSimplified','planMinor'],
  finalAccounting:['planAnnual',...PRIOR_ACCOUNTING_SOURCES.filter(t=>t!=='finalAccounting'),'planInitial','planSimplified','planMinor'],
  trustAccounting:['planAnnual',...PRIOR_ACCOUNTING_SOURCES.filter(t=>t!=='trustAccounting'),'planInitial','planSimplified','planMinor']
};





// Accounting -> Accounting carry (e.g. Initial Inventory into a new Annual
// Accounting, or last period's Annual into this one). Only identity and
// contact details move; schedules, period dates, signatures and balances are
// deliberately left blank because they belong to the new filing period.
// Guardian rows use different field names per form, so each is read with a
// fallback across both conventions.
function carryOverAccountingToAccounting(src,targetType){
  const gs=src.guardians||[];
  const engine=formEngine(targetType);
  const base={
    wardName:src.wardName||'',
    caseNumber:src.caseNumber||'',
    // Milestone 63E: the UCN is its own number and carries as the UCN (never into the Case #).
    ucn:src.ucn||'',
    // Milestone 40C-A item 3: blank here; carryOverFields() below supplies it
    // from the canonical ward Party. Unlike the two builders above this one,
    // THIS function is live (the others are shadowed by
    // core/navigation/ward-lifecycle.js's module versions), so this is the
    // legacy site that actually mattered.
    county:'',
    typeOfGuardianship:src.typeOfGuardianship||''
  };
  // Whoever the guardian/attorney are is stored under different keys on the
  // Initial Inventory than on the accountings.
  //
  // Milestone 40C-F item 2, third instance of the same defect (fixed the
  // same way as the other two, core/navigation/ward-lifecycle.js's
  // carryOverFieldsForPlan/carryOverFieldsForAccounting -- see that file's
  // extractCarryIdentity() for the full history): a Guardian Inventory
  // keeps attorney details NESTED at src.attorney.{name,...}, and Guardian
  // Inventory is in ACCOUNTING_FORM_TYPES, so this accounting-to-accounting
  // path handles guardian -> annual/simplified and used to hit the object
  // directly -- `src.attorneyForGuardian||src.attorney` assigned the whole
  // nested OBJECT into the destination's flat `attorney` string field
  // whenever attorneyForGuardian was blank. Caught by
  // carryover-workflow.spec.ts.
  //
  // Milestone 52F Decision 6: this function's own attorneyName order
  // (attorneyForGuardian||srcAttyFlat||srcAtty.name, and it never checked
  // the flat attorney_name/attorneyName fields at all) was a FOURTH order,
  // not a copy of either ward-lifecycle.js function's -- confirmed while
  // investigating whether this function could share extractCarryIdentity()
  // at all. It can, for the guardian-name and attorney fields: gName's
  // chain there is a strict superset of this function's own bare
  // `src.guardianName||src.guardian` (more fallbacks, never fewer), and
  // attyName now gets Decision 6's resolved authoritative-field-wins order
  // like the other two carry-over directions. caseNumber above is left as
  // its own simple src.caseNumber||'' -- extractCarryIdentity()'s caseNum
  // adds ucn/ref fallbacks that matter for Plan Minor sources, which never
  // reach this accounting-to-accounting-only function.
  const { gName: guardianName, attyName: attorneyName, attyBar, attyPhone, attyEmail, attyStreet, attyCityStateZip } = extractCarryIdentity(src);

  if(engine==='guardian'){
    return {...base, gid:src.gid||'', guardianName, attorneyForGuardian:attorneyName,
      // Guardian Inventory's own shape is nested (see emptyDataGuardian()).
      attorney:{name:attorneyName,barNumber:attyBar,phone:attyPhone,
        streetAddress:attyStreet,cityStateZip:attyCityStateZip,
        signatureDate:null,filingDate:null,signatureState:'',signatureImage:''},
      guardians:gs.slice(0,1).map(g=>({
        name:g.name||'', ssnEin:g.ssnEin||g.ssn||'', phone:g.phone||'',
        streetAddress:g.streetAddress||g.mailingStreet||'',
        cityStateZip:g.cityStateZip||g.mailingCityStateZip||'', signatureDate:null
      }))};
  }
  if(engine==='simplified'){
    return {...base, gid:src.gid||'', guardian:guardianName, attorney:attorneyName,
      attorney_barNumber:attyBar, attorney_phone:attyPhone,
      attorney_street:attyStreet, attorney_cityStateZip:attyCityStateZip,
      guardians:[0,1,2].map(i=>{
        const g=gs[i]||{};
        return {name:g.name||'', ssn:g.ssn||g.ssnEin||'', phone:g.phone||'', email:g.email||'',
          mailingStreet:g.mailingStreet||g.streetAddress||'',
          mailingCityStateZip:g.mailingCityStateZip||g.cityStateZip||'',
          residenceStreet:'', residenceCityStateZip:'', signatureDate:''};
      })};
  }
  // annual family (annual / finalAccounting / trustAccounting)
  //
  // Milestone 40H-I: guardian->annual and simplified->annual sources already
  // get startingBalance/certRecipients from their own dedicated financial
  // mappers (convertGuardianSchedulesToAnnual()/convertSimplifiedToAnnual(),
  // which run after this identity carry and would just overwrite anything
  // set here). The gap was specifically an annual-family source (e.g. Annual
  // -> Final/Trust) converting to another annual-family target: no financial
  // mapper exists for that pair at all, so neither field ever carried --
  // starting balance should equal the prior filing's ending net assets (the
  // actual statutory continuity), and certificate-of-service recipients are
  // typically the same interested parties across a ward's filings. Guarded
  // to that one source/target combination so it can't shadow or race the
  // two dedicated mappers' own values for the other two paths.
  const carryingFinancials = formEngine(src.inventoryType)==='annual';
  return {...base, gid:src.gid||'', guardian:guardianName, attorney:attorneyName,
    attorney_bar:attyBar, attorney_phone:attyPhone,
    attorney_street:attyStreet, attorney_cityStateZip:attyCityStateZip,
    ...(carryingFinancials ? {
      startingBalance:String(calcTotalsAnnual(src).netAssetsFromD),
      certRecipients:(src.certRecipients||[]).map(r=>({...r})),
    } : {}),
    guardians:[0,1,2].map(i=>{
      const g=gs[i]||{};
      return {name:g.name||'', ssn:g.ssn||g.ssnEin||'', phone:g.phone||'', email:g.email||'',
        mailingStreet:g.mailingStreet||g.streetAddress||'',
        mailingCityStateZip:g.mailingCityStateZip||g.cityStateZip||'',
        officeStreet:g.officeStreet||'', officeCityStateZip:g.officeCityStateZip||'',
        signatureDate:'', signatureDateLabel:''};
    })};
}

// Single entry point used by every carry-over surface (Add Ward, Convert
// Ward, in-place Load Ward Info) — picks the right-direction mapper based on
// the source AND target types, so callers don't need to know which direction
// they're going.
function carryOverFields(sourceWard,targetType){
  const srcIsAccounting=ACCOUNTING_FORM_TYPES.includes(sourceWard.inventoryType);
  const targetIsAccounting=ACCOUNTING_FORM_TYPES.includes(targetType);
  const fields=targetIsAccounting
    ? (srcIsAccounting
        ? carryOverAccountingToAccounting(sourceWard,targetType)
        : carryOverFieldsForAccounting(sourceWard,formEngine(targetType)))
    : carryOverFieldsForPlan(sourceWard,targetType);
  // Milestone 40C-A item 3 / 40C-F item 3. Every builder above now leaves
  // `county` blank; this is the one place that fills it, and it takes the value
  // from the source's canonical ward PARTY rather than from the source filing's
  // own snapshot. The distinction matters: a source filing is a historical
  // record that may name a county the ward has since moved away from, and the
  // decision forbids obtaining county from an arbitrary source filing.
  //
  // Linking the destination to the same ward Party is what makes this ward's
  // later filings hydrate without re-asking. `wardPartyId` rides along in the
  // returned fields, so it lands on the destination wherever the caller merges
  // them (Add Ward, Convert Ward, and in-place Load Ward Info all route here).
  const wardPartyId=sourceWard&&sourceWard.wardPartyId;
  fields.county='';
  if(wardPartyId){
    fields.wardPartyId=wardPartyId;
    // Milestone 49B: the ward's identity (residence, SSN, ...) comes from the
    // Party -- the current record -- with the source's copy filling any gap.
    // The destination doesn't exist yet, so reconcile a filing-shaped probe
    // and carry its fields along.
    const probe={...fields,inventoryType:targetType};
    if(window.reconcileSlotWithParty(probe,'ward',0)){
      for(const k of Object.keys(probe))if(k!=='inventoryType')fields[k]=probe[k];
    }
    const party=typeof window.resolveParty==='function'?window.resolveParty(wardPartyId):null;
    const canonical=typeof window.normalizeCountyName==='function'
      ?window.normalizeCountyName(party&&party.county)
      :'';
    if(canonical)fields.county=canonical;
  }
  return fields;
}

// Populates the "Load Ward Info From" picker in the Add Ward modal based on
// the currently-selected Inventory Type, showing it only when that type has
// a carry-over source AND at least one matching ward already exists.
// Populates a "Load Ward Info From" <select> with existing wards eligible to
// pre-fill a new form of `type`. When the typed name exactly matches a name
// already on file, the list narrows to just that person's other filings —
// the usual case, pulling forward the SAME ward's earlier form — and
// auto-selects when there's exactly one such match, so picking an existing
// name is enough to auto-fill the new form without a second, separate pick.
// Every eligible source stays available (via "Start Blank" being the only
// other default) whenever the name doesn't narrow things down, so the user
// can still choose from any previously filled-out form manually.
function refreshCarrySourceSelect(sel,wrap,type,name,autonoteEl){
  const allMatches=carryWardsFor(type);
  // Always shown, even with nothing to offer yet. Hiding it entirely made
  // the feature look like it didn't exist on a fresh install; a disabled
  // control that says why is discoverable instead.
  wrap.style.display='block';
  if(!allMatches.length){
    sel.innerHTML='<option value="">— No other forms yet to pull from —</option>';
    sel.disabled=true;
    if(autonoteEl)autonoteEl.style.display='none';
    return;
  }
  const q=(name||'').trim().toLowerCase();
  const namedMatches=q?allMatches.filter(w=>(w.wardName||'').trim().toLowerCase()===q):[];
  const list=namedMatches.length?namedMatches:allMatches;
  sel.disabled=false;
  sel.innerHTML='<option value="">— Start Blank —</option>'
    +list.map(w=>`<option value="${w.wardId}">${esc(w.wardName)}${w.caseNumber?' — '+esc(w.caseNumber):''} (${esc(INVENTORY_TYPES[w.inventoryType]?.name||w.inventoryType)})</option>`).join('');
  if(namedMatches.length===1){
    sel.value=namedMatches[0].wardId;
    if(autonoteEl){
      autonoteEl.textContent=`Auto-filling from ${namedMatches[0].wardName}'s ${INVENTORY_TYPES[namedMatches[0].inventoryType]?.name||namedMatches[0].inventoryType} — change the picker above to use a different form instead.`;
      autonoteEl.style.display='block';
    }
  }else{
    sel.value='';
    if(autonoteEl)autonoteEl.style.display='none';
  }
}

function updateCarrySourcePicker(){
  const type=document.getElementById('new-ward-type').value;
  const name=document.getElementById('new-ward-name').value;
  refreshCarrySourceSelect(document.getElementById('carry-source-ward'),document.getElementById('carry-source-wrap'),type,name,document.getElementById('carry-source-autonote'));
}

// Auto-fills the ward-name field to match the selected source ward, without
// overriding a name the user has already started typing differently.
function onCarrySourceChange(){
  const sourceId=document.getElementById('carry-source-ward').value;
  if(!sourceId)return;
  const src=caseFile.wards.find(w=>w.wardId===sourceId);
  if(!src)return;
  const nameEl=document.getElementById('new-ward-name');
  if(!nameEl.value.trim())nameEl.value=src.wardName||'';
}

// Tracks which identity slot ({role,index}) the Pick Party modal is
// currently open for, set by showPickPartyModal() and read by doPickParty()/
// doCreatePartyFromSlot() when the user confirms.
let _pickPartySlot=null;

function partyRoleLabel(role){
  return role==='guardian'?'guardian':role==='attorney'?'attorney':role==='preparer'?'preparer':'ward';
}

// Opens the Pick Party modal for one identity slot on the active filing
// (persistence rewrite Milestone 4). `role`/`index` identify the slot the
// same way syncIdentityField() does -- see src/core/party-resolver.js.
async function showPickPartyModal(role,index){
  await ensureFragment('common-modals');
  _pickPartySlot={role,index:Number(index)||0};
  const currentName=(window.readRoleFields(window.D,role,_pickPartySlot.index)||{}).name;
  document.getElementById('pick-party-slot-label').textContent=currentName?`"${esc(currentName)}"`:`this ${partyRoleLabel(role)}`;
  const sel=document.getElementById('pick-party-existing');
  const matches=(caseFile.parties||[]).filter(p=>!p.mergedInto&&p.roles.includes(role));
  sel.innerHTML='<option value="">— Select —</option>'
    +matches.map(p=>`<option value="${p.id}">${esc(p.name||'(unnamed)')}</option>`).join('');
  showModal('pickPartyModal');
}

// "Link" — attaches the chosen existing party to the open slot, then
// hydrates that party's current data into the slot, overwriting whatever
// was there (matching today's carry-over overwrite behavior).
async function doPickParty(){
  const partyId=document.getElementById('pick-party-existing').value;
  if(!partyId||!_pickPartySlot)return;
  const party=window.resolveParty(partyId);
  if(!party)return;
  const {role,index}=_pickPartySlot;
  closeModal('pickPartyModal');
  window.setPartyIdForSlot(window.D,role,index,partyId);
  window.hydrateFromParty(party,window.D,role,index);
  autoSave();
  renderPage(currentPage);
  updateNavDots();
}

// "+ New Shared Record" — creates a brand-new party seeded from whatever is
// already typed into the slot (dehydrate), then attaches it. Nothing
// already entered is lost.
async function doCreatePartyFromSlot(){
  if(!_pickPartySlot)return;
  const {role,index}=_pickPartySlot;
  closeModal('pickPartyModal');
  const party=window.createParty(role);
  window.setPartyIdForSlot(window.D,role,index,party.id);
  // A brand-new party has no other slot to fan out to, and a closed filing's
  // syncIdentityField() is a no-op -- seed the record directly either way.
  window.dehydrateIntoParty(window.D,role,index,party);
  autoSave();
  renderPage(currentPage);
  updateNavDots();
}

// Tracks which ward the Pick Case modal is currently open for, set by
// showPickCaseModal() and read by doPickCase()/doCreateCaseFromWard() when
// the user confirms. Mirrors _pickPartySlot.
let _pickCaseWardId=null;

// Opens the Pick Case modal for one filing (persistence rewrite Milestone
// 6). Lists every existing Case by number/county plus which ward(s) already
// reference it, so the user can tell them apart.
async function showPickCaseModal(wardId){
  await ensureFragment('common-modals');
  const ward=caseFile.wards.find(w=>w.wardId===wardId);
  if(!ward)return;
  _pickCaseWardId=wardId;
  document.getElementById('pick-case-ward-name').textContent=ward.wardName?`"${esc(ward.wardName)}"`:'this filing';
  const sel=document.getElementById('pick-case-existing');
  const cases=caseFile.cases||[];
  sel.innerHTML='<option value="">— Select —</option>'
    +cases.map(c=>{
      const refs=caseFile.wards.filter(w=>w.caseId===c.id).map(w=>w.wardName||'(unnamed)');
      const label=[c.caseNumber||'(no case number)',c.county,refs.length?`— ${refs.join(', ')}`:''].filter(Boolean).join(' ');
      return `<option value="${c.id}">${esc(label)}</option>`;
    }).join('');
  showModal('pickCaseModal');
}

// "Link" — attaches the chosen existing Case to this filing.
async function doPickCase(){
  const caseId=document.getElementById('pick-case-existing').value;
  if(!caseId||!_pickCaseWardId)return;
  const ward=caseFile.wards.find(w=>w.wardId===_pickCaseWardId);
  if(!ward)return;
  closeModal('pickCaseModal');
  ward.caseId=caseId;
  await saveWardToState(ward);
  renderPage(currentPage);
}

// "+ New Case" — creates a brand-new Case seeded from this filing's own
// case number/county, then attaches it.
async function doCreateCaseFromWard(){
  if(!_pickCaseWardId)return;
  const ward=caseFile.wards.find(w=>w.wardId===_pickCaseWardId);
  if(!ward)return;
  closeModal('pickCaseModal');
  const kase=window.getOrCreateCaseForWard(ward);
  ward.caseId=kase.id;
  await saveWardToState(ward);
  renderPage(currentPage);
}

// Small banner shown at the top of a Cover page (Plan or Accounting), only
// when a matching ward of the other type exists to load from — kept out of
// Wraps a Cover page's "Import Excel" accordion. Used to also pair it with
// the "Load Ward Info" banner in a two-column layout; that banner (and the
// one-time carry-over UI generally) was retired in the persistence-rewrite's
// Case-entity milestone -- every filing type now has its own Party/Case
// picker instead, kept continuously in sync rather than copied once.
function pageIntroRow(accordionHTML){
  return `<div class="dashboard-top-row single-col" style="margin-bottom:1.25rem;">${accordionHTML}</div>`;
}

// Most-recently-used ward list stored in the .sav file's appState section.
const RECENT_WARDS_MAX=5;

function loadRecentlyOpenedWards(){
  const list=_appState.recentWards;
  return Array.isArray(list)?list:[];
}

function saveRecentlyOpenedWards(list){
  _appState.recentWards=list;
  saveAppState('recentWards',list);
}

function addToRecentlyOpened(ward){
  if(!ward)return;
  const list=loadRecentlyOpenedWards().filter(r=>r.wardId!==ward.wardId);
  list.unshift({wardId:ward.wardId,wardName:ward.wardName,inventoryType:ward.inventoryType,timestamp:Date.now()});
  saveRecentlyOpenedWards(list.slice(0,RECENT_WARDS_MAX));
}
window.addToRecentlyOpened=addToRecentlyOpened;

// Re-derives name/type from the live ward record (in case it was renamed
// or converted since being logged) and drops entries for wards that no
// longer exist, rather than trusting the stale snapshot in appState.
function getRecentlyOpenedWards(){
  return loadRecentlyOpenedWards()
    .map(r=>{
      const ward=caseFile.wards.find(w=>w.wardId===r.wardId);
      return ward?{wardId:ward.wardId,wardName:ward.wardName,inventoryType:ward.inventoryType,timestamp:r.timestamp,archived:!!ward.archived}:null;
    })
    .filter(Boolean);
}
window.getRecentlyOpenedWards=getRecentlyOpenedWards;

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
    sub:INVENTORY_TYPES[w.inventoryType]?.name||w.inventoryType
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
      const typeLabel=INVENTORY_TYPES[w.inventoryType]?.name||w.inventoryType;
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
// INVENTORY TYPE MANAGEMENT
// ═══════════════════════════════════════════════════════

function emptyRowAnnual(type){
  switch(type){
    case 'schA': return {payer:'',description:'',bank:'',accountNo:'',amount:''};
    case 'schB1': return {bankAcct:'',checkNo:'',periodFrom:'',periodTo:'',datePaid:'',payee:'',courtOrderDate:'',amount:''};
    case 'schB2': return {bankAcct:'',checkNo:'',periodFrom:'',periodTo:'',datePaid:'',payee:'',courtOrderDate:'',amount:''};
    case 'schB3': return {bankAcct:'',checkNo:'',datePaid:'',payee:'',courtOrderDate:'',amount:''};
    case 'schB4': return {bankAccountId:'',checkNo:'',datePaid:'',category:'',payee:'',amount:''};
    case 'schC':  return {description:'',date:'',gain:'',loss:''};
    case 'schD1': return {description:'',accountNo:'',restricted:'',type:'',fullAmount:'',wardPct:'',restrictedAmt:''};
    case 'schD2': return {description:'',residence:'',income:'',fullValue:'',wardPct:'',carryingValue:'',wardValue:''};
    case 'schD3': return {description:'',fullAmount:'',wardPct:'',carryingValue:'',wardAmount:''};
    case 'schD4': return {description:'',restricted:'',fullAmount:'',wardPct:'',carryingValue:'',wardValue:'',restrictedAmt:''};
    case 'schD5': return {description:'',loanNo:'',loanType:'',fullDebt:'',wardPct:'',wardBalance:''};
    case 'schE':  return {bankName:'',transferInDate:'',transferInAmt:'',transferOutDate:'',transferOutAmt:''};
    case 'schF1': return {description:'',bank:'',accountNo:'',courtOrderDate:'',salePrice:''};
    case 'schF2': return {description:'',bank:'',accountNo:'',courtOrderDate:'',salePrice:''};
    case 'trust': return {hasTrust:'',createdAfterGID:'',name:'',trustee:'',accountNo:'',dateCreated:'',trustType:'',wardPct:'',wardAmount:''};
    case 'remun': return {guardian:'',type:'',amount:'',description:''};
    default: return {};
  }
}
window.emptyRowAnnual = emptyRowAnnual;


// Simplified Annual Plan — the person-side counterpart to the accountings.
// emptyDataPlanSimplified() moved to src/core/state.js (Milestone 3, Phase
// B), reached via window.emptyDataPlanSimplified() from
// initializeEmptyData() below -- pure data, needed synchronously at
// ward-creation time, before the lazily-imported feature module loads.

// ── Annual Guardianship Plan ─────────────────────────────
// The court form's 11 numbered questions, in its own order. Two of them
// are repeating tables (residences, medical providers) and are modelled as
// arrays exactly like the Annual Accounting schedules; the rest are
// checkbox groups, narrative text, or fixed-length rating grids.
//
// The rights and ADL lists are declared once as constants and reused by
// the page renderer, the validator, and the print builder, so the three
// can't drift out of order — the printed court document has to list them
// in exactly the sequence the form does.
const PLAN_RIGHTS=[
  ['marry','Right to marry'],
  ['vote','Right to vote'],
  ['govBenefits','Right to personally apply for government benefits'],
  ['driver',"Right to have a driver's license"],
  ['travel','Right to travel'],
  ['employment','Right to seek or retain employment'],
  ['contract','Right to contract'],
  ['sue','Right to sue and be sued'],
  ['property','Right to manage property or to make any gift or disposition'],
  ['residence','Right to determine residence'],
  ['medical','Right to consent to medical treatment'],
  ['social','Right to make decisions about social environment or other aspects of social life'],
];
const PLAN_RIGHT_STATES=['Not removed','Needs to be restored','Capable of restoration'];
const PLAN_ADLS=[
  ['eating','Eating'],['prepareMeals','Prepare meals'],
  ['heavyChores','Heavy chores (e.g. vacuuming)'],['lightHousekeeping','Light housekeeping'],
  ['managingMoney','Managing money'],['dressing','Dressing'],
  ['transportation','Transportation ability'],['walking','Walking / mobility'],
  ['toileting','Toileting'],['stairs','Climbing stairs'],
  ['transferring','Transferring (wheelchair to chair/bed)'],['laundry','Doing laundry'],
  ['shopping','Shopping'],['bathing','Bathing'],
  ['grooming','Grooming'],['medication','Administration of medication'],
];
const PLAN_ADL_RATINGS=['','Ward needs no help','Ward needs assistance','Ward cannot do at all'];
const PLAN_BENEFITS=[
  ['socialSecurity','Social Security'],['ssdi','Social Security Disability Income (SSDI)'],
  ['hmo','Health Maintenance Organization (HMO)'],['ssi','Supplemental Security Income (SSI)'],
  ['stateSupplement','Optional State Supplement'],['institutionalCare','Institutional Care Program'],
  ['supplementalIns','Supplemental Insurance'],['pension','Pension'],
  ['medicare','Medicare'],['medicaid','Medicaid'],['trusts','Trusts'],['other','Other'],
];

// Explicit window assignments: these are bare top-level `const`s, which
// (unlike function declarations) do NOT become `window` properties on their
// own -- see src/core/state.js's file header for the full explanation. Both
// src/core/state.js's emptyDataPlanAnnual() and
// src/features/plan-annual/index.js read these via window, so they need to
// be real window properties (Milestone 4, Phase A).
window.PLAN_RIGHTS=PLAN_RIGHTS;
window.PLAN_RIGHT_STATES=PLAN_RIGHT_STATES;
window.PLAN_ADLS=PLAN_ADLS;
window.PLAN_ADL_RATINGS=PLAN_ADL_RATINGS;
window.PLAN_BENEFITS=PLAN_BENEFITS;

function emptyPlanResidence(){return {name:'',street:'',cityStateZip:'',phone:'',facilityType:'',from:'',to:''};}
function emptyPlanProvider(){return {name:'',street:'',cityStateZip:'',phone:'',providerType:'',visits:''};}
function emptyPlanDirective(){return {title:'',dateSigned:'',signedBy:'',agents:'',alternates:'',relationship:'',contact:'',courtRevoked:'',orderDate:'',orderCounty:''};}

// emptyDataPlanAnnual() and emptyDataPlanInitial() moved to
// src/core/state.js (Milestones 4 and 5, both Phase A), reached via
// window.emptyDataPlanAnnual()/window.emptyDataPlanInitial() from
// initializeEmptyData() below -- needed synchronously at ward-creation time,
// before the lazily-imported feature module loads. Both reach back into
// legacy globals here (PLAN_RIGHTS/PLAN_ADLS/PLAN_BENEFITS/
// emptyPlanResidence/emptyPlanProvider/emptyPlanDirective for the former,
// INITIAL_ADLS/emptyInitialProvider/emptyPlanDirective for the latter) that
// stay in this file because computeNavChecks()/resetYearlyFieldsForNewYear()
// need them directly.

const INITIAL_ADLS=[
  ['lightHousekeeping','Light Housekeeping'],['medication','Administration of Medication'],
  ['managingMoney','Managing Money'],['bathing','Bathing'],
  ['prepareMeals','Prepare Meals'],['stairs','Climbing Stairs'],
  ['shopping','Shopping'],['laundry','Doing Laundry'],
  ['toileting','Toileting'],['dressing','Dressing'],
  ['transferring','Transferring (from wheelchair to chair/bed)'],['eating','Eating'],
  ['walking','Walking / Mobility'],['grooming','Grooming'],
  ['heavyChores','Heavy Chores'],
];
const INITIAL_ADL_RATINGS=['','Ward needs no help','Ward needs some assistance','Ward cannot do at all'];
// Bare top-level consts are not real `window` properties on their own (see
// core/state.js's file header) -- computeNavChecks()'s planInitial branch
// reads these via the plain identifier since it's the same classic script,
// but the lazily-imported features/plan-initial/ module can only reach them
// through window, so both need an explicit assignment here.
window.INITIAL_ADLS=INITIAL_ADLS;
window.INITIAL_ADL_RATINGS=INITIAL_ADL_RATINGS;

function emptyInitialProvider(){return {name:'',providerType:'',examDate:'',street:'',cityStateZip:'',phone:''};}

function emptyMinorResidence(){return {name:'',street:'',city:'',state:'',zip:'',phone:''};}
function emptyMinorProvider(){return {first:'',mi:'',last:'',street:'',city:'',state:'',zip:'',phone:'',providerType:'',visits:''};}
function emptyMinorGuardianSig(){return {name:'',tin:'',phone:'',mailingStreet:'',mailingCityStateZip:'',relationship:'',email:'',signatureDate:'',signatureState:'',signatureImage:''};}

// emptyDataPlanMinor() moved to src/core/state.js (Milestone 6, Phase A),
// reached via window.emptyDataPlanMinor() from initializeEmptyData() below
// -- needed synchronously at ward-creation time, before the lazily-imported
// feature module loads. Unlike emptyDataPlanAnnual()/emptyDataPlanInitial(),
// this one is genuinely pure data: it only calls the three factory
// functions above (window.emptyMinorResidence/emptyMinorProvider/
// emptyMinorGuardianSig), not any bare top-level const -- computeNavChecks()'s
// planMinor branch never reads a rights/ADLs-style array directly, so there's
// nothing here that has to stay an eager legacy global purely for that
// reason (Milestone 6 plan's "Confirmed facts").

// emptyDataAnnual() moved to src/core/state.js (Milestone 7, Phase A),
// reached via window.emptyDataAnnual() from initializeEmptyData() below --
// needed synchronously at ward-creation time, before the lazily-imported
// feature module loads. Not pure data: reaches back into
// window.emptyRowAnnual('trust'/'remun'), which stays a legacy global here
// because convertGuardianSchedulesToAnnual() and
// resetYearlyFieldsForNewYear()'s annual branch call it directly.

function initializeEmptyData(type){
  const data=(()=>{
    switch(formEngine(type)){
      case 'guardian': return emptyDataGuardian();
      // emptyDataSimplified() moved to src/core/state.js (an ES module) --
      // pure data, needed at ward-creation time, before this ward's feature
      // module is ever mounted. window.emptyDataSimplified is assigned there
      // (loaded via a <script type="module"> tag in index.html) the same way
      // fragment-loader.js exposes loadFragment; see that file's own comment
      // for why this bridge is temporary/necessary.
      case 'simplified': return window.emptyDataSimplified();
      case 'annual': return window.emptyDataAnnual();
      case 'planSimplified': return window.emptyDataPlanSimplified();
      case 'planAnnual': return window.emptyDataPlanAnnual();
      case 'planInitial': return window.emptyDataPlanInitial();
      case 'planMinor': return window.emptyDataPlanMinor();
      default: return emptyDataGuardian();
    }
  })();
  // Party-record references -- unwired so far (see the persistence-rewrite
  // plan's later phases: hydration/dehydration, write-through, the party
  // picker). Added here, once, rather than in each emptyData*() factory
  // above, so every filing type gets the exact same shape regardless of
  // which factory built it, and so the phases that actually consume these
  // have one consistent place to look. guardianPartyIds starts empty and
  // grows to match however many guardian rows a given type carries (1 for
  // guardian/D-5, up to 4 for planInitial, etc.) once something populates it.
  data.wardPartyId=null;
  data.guardianPartyIds=[];
  data.attorneyPartyId=null;
  data.preparerPartyId=null;
  // Case FK (Milestone 6) -- null until explicitly linked, same convention.
  data.caseId=null;
  if(formEngine(type)==='annual'){
    data.inventoryType=type;
    data.filingType=type==='finalAccounting'?'Final':type==='trustAccounting'?'Trust':'Annual';
  }
  return data;
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

async function showAddWardModal(){
  await ensureFragment('common-modals');
  document.getElementById('new-ward-name').value='';
  populateWardNameSuggestions('ward-name-suggestions');
  initWardNameCombobox('new-ward-name','new-ward-name-dropdown',()=>updateCarrySourcePicker());
  document.getElementById('new-ward-type').value='guardian';
  updateCarrySourcePicker();
  showModal('addWardModal');
}

async function doAddWard(){
  const name=document.getElementById('new-ward-name').value.trim();
  const type=document.getElementById('new-ward-type').value;
  const carrySourceId=document.getElementById('carry-source-ward').value;
  console.log('doAddWard - name:',name,'type:',type,'carrySourceId:',carrySourceId);
  if(!name){await window.alertModal('Please enter a ward name');return;}
  if(type==='planMinor'){
    const candidateSource=carrySourceId?caseFile.wards.find(w=>w.wardId===carrySourceId):null;
    const sameNameWard=caseFile.wards.find(w=>
      (w.wardName||'').trim().toLowerCase()===name.toLowerCase()&&(w.inventoryType!=='planMinor'||w.gid||w.inceptionDate)
    );
    const adultIndicator=candidateSource||sameNameWard;
    if(adultIndicator&&(adultIndicator.inventoryType!=='planMinor'||adultIndicator.gid||adultIndicator.inceptionDate)){
      const proceed=await window.confirmModal(`Annual Plan (Minors) is typically used for minor wards, but existing records for "${name}" indicate an adult filing or adult guardianship inception date. Do you want to continue creating this minor plan?`);
      if(!proceed)return;
    }
  }
  if(type==='simplified'){
    closeModal('addWardModal');
    showSimplifiedEligibilityModal(name,carrySourceId);
    return;
  }
  try{
    const wardId=await addWard(name,type);
    if(carrySourceId){
      const src=caseFile.wards.find(w=>w.wardId===carrySourceId);
      const ward=caseFile.wards.find(w=>w.wardId===wardId);
      if(src&&ward){
        Object.assign(ward,carryOverFields(src,type));
        if(ward.wardName!==name)ward.wardName=name;
        // Picking a carry-source is an explicit "this belongs with that one"
        // gesture -- join the new filing to the source's Case (creating one
        // for the source first if it doesn't have one yet), not just
        // copying case-number text that could later drift apart. See
        // src/core/case-resolver.js.
        const kase=window.getOrCreateCaseForWard(src);
        ward.caseId=kase.id;
        await saveWardToState(ward);
        renderPage('/');
        updateSidebar();
      }
    }
    closeModal('addWardModal');
  }catch(e){
    console.error('Failed to add ward',e);
    await window.alertModal('Failed to add form. Check console.');
  }
}

// carrySourceId lets doAddWard() hand off a carry-source selection already
// made in the main Add Ward modal; the picker inside this modal covers the
// other entry point, where the "Simplified Accounting" card skips that
// modal entirely and lands here directly.
function refreshEligCarrySource(){
  const name=document.getElementById('elig-ward-name').value;
  refreshCarrySourceSelect(document.getElementById('elig-carry-source-ward'),document.getElementById('elig-carry-source-wrap'),'simplified',name,document.getElementById('elig-carry-source-autonote'));
}

async function showSimplifiedEligibilityModal(name,carrySourceId){
  await ensureFragment('common-modals');
  document.getElementById('elig-ward-name').value=name||'';
  populateWardNameSuggestions('elig-ward-name-suggestions');
  initWardNameCombobox('elig-ward-name','elig-ward-name-dropdown',()=>refreshEligCarrySource());
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
  showModal('simplifiedEligibilityModal');
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
function carryOverSummaryNote(src,dest){
  if(!src)return '';
  const srcLabel=formDisplayName(src.inventoryType);
  const county=(typeof window.normalizeCountyName==='function')
    ?window.normalizeCountyName(dest&&dest.county)
    :String((dest&&dest.county)||'').trim();
  const countySentence=county
    ? `County (${county}) was restored from this ward's record.`
    : 'County still needs to be selected on this filing’s Cover — this ward has no county on record yet.';
  return `Details were carried over from the selected ${srcLabel}. ${countySentence}`;
}

async function doConfirmSimplifiedEligibility(){
  const name=document.getElementById('elig-ward-name').value.trim();
  const dep=document.getElementById('elig-depository').value;
  const txn=document.getElementById('elig-only-transactions').value;
  const carrySourceId=document.getElementById('elig-carry-source-ward').value;
  if(!name){await window.alertModal('Please enter a ward name');return;}
  if(!dep||!txn){await window.alertModal('Please answer both eligibility questions');return;}
  const qualifies=dep==='Yes'&&txn==='Yes';
  try{
    if(qualifies){
      const wardId=await addWard(name,'simplified');
      window.D.eligDepository='Yes';
      window.D.eligOnlyTransactions='Yes';
      let carryNote='';
      if(carrySourceId){
        const src=caseFile.wards.find(w=>w.wardId===carrySourceId);
        if(src){
          Object.assign(window.D,carryOverFields(src,'simplified'));
          if(window.D.wardName!==name)window.D.wardName=name;
          window.D.caseId=window.getOrCreateCaseForWard(src).id;
          carryNote=carryOverSummaryNote(src,window.D);
        }else{
          // Milestone 40C-F item 1: the selected source could not be resolved,
          // so say so rather than reporting a carryover that did not happen.
          await window.alertModal('The selected source filing could not be found, so nothing was carried over. The new filing was created blank.');
        }
      }
      await saveWardToState(window.D);
      // Milestone 50B: addWard() already rendered the Cover from a blank
      // filing before the Object.assign() above mutated window.D -- nothing
      // repaints on its own, so without this the filer sees blank fields
      // while carryNote (below) claims details were carried over. Mirrors
      // doAddWard()'s own render tail after its carry-over Object.assign().
      renderPage('/');
      updateSidebar();
      if(carryNote)await window.alertModal(carryNote);
    }else{
      await addWard(name,'annual');
      // Carry over to the Annual too — the guardian picked a source ward
      // before answering the eligibility questions, and that choice still
      // applies to the form they actually end up with.
      let carryNote='';
      if(carrySourceId){
        const src=caseFile.wards.find(w=>w.wardId===carrySourceId);
        if(src){
          Object.assign(window.D,carryOverFields(src,'annual'));
          if(window.D.wardName!==name)window.D.wardName=name;
          window.D.caseId=window.getOrCreateCaseForWard(src).id;
          await saveWardToState(window.D);
          carryNote=carryOverSummaryNote(src,window.D);
        }
      }
      // Milestone 50B: same re-render this branch's own carry-over mutation
      // needs -- see the comment on the qualifying branch above.
      renderPage('/');
      updateSidebar();
      // Milestone 40C-F item 4: one message, and it names what actually
      // happened to the carryover and the county rather than leaving the filer
      // to guess after the redirect.
      await window.alertModal('This guardianship does not qualify for the simplified form under § 744.3679, so a standard Annual Accounting was created instead.'
        +(carryNote?`\n\n${carryNote}`:''));
    }
    closeModal('simplifiedEligibilityModal');
  }catch(e){
    console.error('Failed to add ward',e);
    await window.alertModal('Failed to add form. Check console.');
  }
}

async function showRenameWardModal(){
  const ward=getActiveWard();
  if(!ward)return;
  await ensureFragment('common-modals');
  document.getElementById('rename-ward-input').value=ward.wardName;
  showModal('renameWardModal');
}

async function doRenameWard(){
  const newName=document.getElementById('rename-ward-input').value.trim();
  if(!newName){await window.alertModal('Please enter a ward name');return;}
  try{
    await renameWard(caseFile.activeWardId,newName);
    closeModal('renameWardModal');
  }catch(e){
    console.error('Failed to rename ward',e);
    await window.alertModal('Failed to rename ward. Check console.');
  }
}

let _pendingDeleteWardId=null;

// wardId is optional so the existing sidebar "Delete" button (which only
// ever acts on the currently active ward) keeps working unchanged, while
// the dashboard card's own Delete button can target any ward regardless
// of which one is currently active.
async function confirmDeleteWard(wardId){
  const ward=wardId?caseFile.wards.find(w=>w.wardId===wardId):getActiveWard();
  if(!ward)return;
  await ensureFragment('common-modals');
  _pendingDeleteWardId=ward.wardId;
  // Milestone 58E: the message names the FILING, not just the ward. A ward
  // commonly has several open at once, and every Delete button used to raise
  // the same sentence. The fallback keeps the old wording if the bridge is
  // somehow missing -- a vaguer prompt is survivable, a missing one is not,
  // and this must never change WHICH filing _pendingDeleteWardId points at.
  const msg=typeof window.deleteFilingConfirmation==='function'
    ? window.deleteFilingConfirmation(ward)
    : `Are you sure you want to delete "${ward.wardName}"? This action cannot be undone.`;
  document.getElementById('delete-ward-msg').textContent=msg;
  showModal('deleteWardModal');
}

async function doDeleteWard(){
  const wardId=_pendingDeleteWardId||caseFile.activeWardId;
  const wasOnDashboard=currentPage==='/dashboard';
  try{
    await deleteWard(wardId);
    closeModal('deleteWardModal');
    if(wasOnDashboard)navigate('/dashboard');
  }catch(e){
    console.error('Failed to delete ward',e);
    await window.alertModal('Failed to delete form. Check console.');
  }
}

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

// accent is a fixed hex — used for the ward-card stripe / left-border,
// where it's a decorative fill and doesn't need to react to theme.
// accentText is the SAME colour family but as a var() reference, used
// everywhere this accent sits on top of a surface as plain text — those
// three raw hex values read fine on white (light mode) but fail badly as
// text on a dark surface (as low as 1.9:1), same problem --brand/--accent/
// --ok had, same fix: route through the *-text token instead.
// financial:false marks a document that reports on the ward's PERSON (care,
// residence, medical treatment) rather than their property. Those have no
// money total at all, so anywhere a dollar headline would normally render,
// the filing-progress percentage is shown instead — a "$0.00" or a bare "—"
// under a "Total" label reads as a real figure and is actively misleading.
const INVENTORY_TYPE_META={
  guardian:   {iconName:'clipboard', accent:'#1e5799', accentText:'var(--accent-text)', totalLabel:'Total Value',  financial:true},
  simplified: {iconName:'receipt',   accent:'#1f7a3d', accentText:'var(--ok-text)',     totalLabel:'Ending Balance', financial:true},
  annual:     {iconName:'chart',     accent:'#820024', accentText:'var(--brand-text)',  totalLabel:'Net Assets',     financial:true},
  finalAccounting: {iconName:'chart', accent:'#820024', accentText:'var(--brand-text)', totalLabel:'Net Assets',     financial:true},
  trustAccounting: {iconName:'chart', accent:'#820024', accentText:'var(--brand-text)', totalLabel:'Net Assets',     financial:true},
  planSimplified:{iconName:'shield', accent:'#6b3fa0', accentText:'var(--accent-text)', totalLabel:'Filing Progress', financial:false},
  planAnnual:{iconName:'shield',     accent:'#4a3f9e', accentText:'var(--accent-text)', totalLabel:'Filing Progress', financial:false},
  planInitial:{iconName:'shield',    accent:'#2f6e8c', accentText:'var(--accent-text)', totalLabel:'Filing Progress', financial:false},
  planMinor:  {iconName:'shield',    accent:'#8a5a1e', accentText:'var(--accent-text)', totalLabel:'Filing Progress', financial:false},
};
window.INVENTORY_TYPE_META=INVENTORY_TYPE_META;
function typeIcon(type,size){
  return ic((INVENTORY_TYPE_META[type]||{}).iconName||'folder',size||16);
}

function formatDashboardCurrency(v){
  if(v===null||v===undefined)return '—';
  const abs=Math.abs(v);
  const str=abs.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
  return v<0?`($${str})`:`$${str}`;
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
  const meta=INVENTORY_TYPE_META[ward.inventoryType]||{iconName:'folder',accent:'#525d6e',accentText:'var(--ink-3)',totalLabel:'Total'};
  const headline=getWardHeadlineTotal(ward);
  wardInfo.style.display='block';
  wardInfo.style.borderLeftColor=meta.accent;
  // ?. guard: an unregistered type here would throw and blank the sidebar.
  const typeName=INVENTORY_TYPES[ward.inventoryType]?.name||ward.inventoryType;
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
  const typeConfig=INVENTORY_TYPES[activeInventoryType];
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

function convertSourceShowDropdown(query){
  const input=document.getElementById('convert-source-ward');
  const dropdown=document.getElementById('convert-source-ward-dropdown');
  comboboxRenderDropdown(dropdown,comboboxFilterItems(convertSourceItems(),query),item=>{
    input.value=item.label;
    input.dataset.wardId=item.wardId;
    input.dataset.comboIndex='';
    input.removeAttribute('aria-activedescendant');
    input.setAttribute('aria-expanded','false');
    comboboxHide(dropdown);
    updateConvertTargetOptions();
  });
  comboboxAssignOptionIds(dropdown);
  input.dataset.comboIndex='';
  input.setAttribute('aria-expanded','true');
}
function onConvertSourceInput(){
  document.getElementById('convert-source-ward').dataset.wardId='';
  convertSourceShowDropdown(document.getElementById('convert-source-ward').value);
}
function onConvertSourceFocus(){
  // Focusing (rather than typing) shows every ward, even though the field
  // may already be pre-filled with a ward's name.
  convertSourceShowDropdown('');
}
// Milestone 52J Decision 4: was Escape (dead in practice -- see below) and a
// bare preventDefault() on Enter. Now gains full Up/Down/Home/End/Enter via
// the shared handler. modal-events.js's handleModalKeydown() intercepts
// Escape for any open modal before this ever runs (closes the whole modal,
// not just the dropdown) -- true before this change too, so the shared
// handler's own Escape branch is reachable here in form only; not a
// regression, since Escape's dropdown-only behavior was already
// unreachable through this combobox specifically.
function onConvertSourceKeydown(e){
  const input=document.getElementById('convert-source-ward');
  const dropdown=document.getElementById('convert-source-ward-dropdown');
  bindComboboxKeyboardNav(input,dropdown)(e);
}
document.addEventListener('click',e=>{
  const wrap=document.getElementById('convert-source-ward-wrap');
  if(wrap&&!wrap.contains(e.target)){
    comboboxHide(document.getElementById('convert-source-ward-dropdown'));
    document.getElementById('convert-source-ward')?.setAttribute('aria-expanded','false');
  }
});





function updateConvertNotePreview(srcType,destType){
  const noteEl=document.getElementById('convert-note');
  noteEl.textContent=describeConversion(srcType,destType);
}

// One human-readable description per source→target pair, shown before
// converting and reused in the confirmation alert afterward — so the
// explanation of what will/won't carry over is never out of sync with what
// the code actually does below.
function describeConversion(srcType,destType){
  if(srcType==='guardian'&&formEngine(destType)==='annual'){
    return 'Real estate, cash accounts, personal property, intangible assets, debts, income sources, and trusts are carried into the matching schedules, along with the attorney block and certificate of service. Review each schedule afterward — carrying values and this year\'s actual activity still need to be confirmed.';
  }
  if(srcType==='guardian'&&destType==='simplified'){
    return 'The Initial Inventory\'s total Ward\'s Value becomes the Starting Balance, and the attorney block and certificate of service recipients are carried over too. Simplified Accounting has no asset schedules, so itemised assets collapse into that single figure rather than transferring line by line.';
  }
  if(formEngine(srcType)==='annual'&&destType==='simplified'){
    return 'The Annual Accounting\'s net asset total becomes the Starting Balance, and the reporting period, attorney block, certificate of service and any remuneration are carried over too. Simplified Accounting has no asset schedules, so itemised schedule data collapses into that single figure rather than transferring line by line.';
  }
  if(srcType==='simplified'&&formEngine(destType)==='annual'){
    return 'The Simplified Accounting\'s Ending Balance becomes the Starting Balance, and the reporting period, attorney block, certificate of service and any remuneration are carried over too. Since Simplified Accounting doesn\'t track itemized assets, the new Annual Accounting\'s schedules start blank for you to complete.';
  }
  // Milestone 40H-I: same-family accounting-to-accounting (e.g. Annual ->
  // Final/Trust) -- checked ahead of the generic fallback below, which would
  // otherwise claim county carries "exactly as entered" (it's restored from
  // the ward's Party record, which can in principle differ from this
  // filing's own snapshot) and that "everything specific to this new filing
  // ... starts blank," which stopped being true for starting balance and
  // cert recipients once carryOverAccountingToAccounting() started carrying
  // them for this exact pair.
  if(formEngine(srcType)==='annual'&&formEngine(destType)==='annual'&&srcType!==destType){
    return `The ward's name, case number, guardian, and attorney details are carried over. Starting Balance is set to this filing's ending net assets, and certificate-of-service recipients are carried too. County is restored from this ward's case record rather than copied from this filing. The accounting period and every schedule start blank for you to complete.`;
  }
  if(carrySourcesFor(destType).includes(srcType)){
    return `This creates a new ${INVENTORY_TYPES[destType].name} for the same ward. The ward's name, case number, county, and guardian contact details are carried over exactly as entered — nothing is renamed. Everything specific to this new filing (residence and care details, schedules, signatures, etc.) starts blank for you to complete.`;
  }
  return 'Only case, guardian, and attorney information will be carried over. An Initial Inventory is a point-in-time snapshot of assets as of the Guardianship Inception Date, which can\'t be derived from an accounting period record — asset schedules will need to be completed manually.';
}

// Header fields exist on all three types but under different names in a few
// spots (e.g. guardianName vs guardian) — this copies whichever fields the
// source and target actually have in common.
function mapConvertedHeaderFields(src,srcType,dest,destType){
  dest.wardName=src.wardName?`${src.wardName} (Converted)`:dest.wardName;
  dest.caseNumber=src.caseNumber||dest.caseNumber;
  // Milestone 63E: the UCN carries as the UCN on every conversion path.
  if('ucn' in dest)dest.ucn=src.ucn||dest.ucn;
  if('gid' in dest)dest.gid=src.gid||dest.gid;
  dest.county=src.county||dest.county;
  dest.typeOfGuardianship=src.typeOfGuardianship||dest.typeOfGuardianship;

  const srcGuardianName=srcType==='guardian'?src.guardianName:src.guardian;
  const srcAttorneyName=srcType==='guardian'?src.attorneyForGuardian:src.attorney;
  if(formEngine(destType)==='guardian'){
    dest.guardianName=srcGuardianName||dest.guardianName;
    dest.attorneyForGuardian=srcAttorneyName||dest.attorneyForGuardian;
  }else{
    dest.guardian=srcGuardianName||dest.guardian;
    dest.attorney=srcAttorneyName||dest.attorney;
  }
}

// Initial Inventory → Annual Accounting: maps each schedule to its closest
// real-world equivalent. Carrying value defaults to full value (the normal
// starting assumption before any market change is recorded), and this
// year's actual income/activity is left for the user to confirm rather than
// silently assumed from the inventory's projected figures.
function convertGuardianSchedulesToAnnual(src,dest){
  // Milestone 57B (D7): the attestation never survives a conversion. It is
  // THIS filer's assertion about THIS filing -- that nobody required service
  // on it -- and a new filing has its own recipients and its own answer. It
  // is reset to '' (unanswered, never 'No'), and serviceNoRecipients never
  // maps to certNoRecipients or the reverse.
  //
  // Inside each mapper on purpose, not in the dispatcher: a caller-side
  // reset is the shape that earned the first attempt's "incomplete/unsafe"
  // verdict, because a fifth conversion path added later would inherit
  // nothing. Recipient address cards keep migrating exactly as before -- it
  // is the assertion that is dropped, never the data.
  dest.certNoRecipients='';
  dest.serviceNoRecipients='';
  // Canonical tri-state fields are preferred, with a fallback for callers
  // holding pre-normalization legacy booleans. Normal setD() loading migrates
  // those aliases to canonical values and clears the old keys first.
  dest.schD1=(src.scheduleB1||[]).map(r=>({
    description:[r.institutionName,r.accountType].filter(Boolean).join(' — '),
    accountNo:r.accountNumber||'', restricted:(r.restricted==='Yes'||r.isRestricted===true)?'Yes':'No', type:r.accountType||'',
    fullAmount:r.fullAssetAmount||'', wardPct:r.wardPercent||'', restrictedAmt:''
  }));
  dest.schD2=(src.scheduleA1||[]).map(r=>({
    description:r.propertyDescription||'', residence:(r.residence==='Yes'||r.isPersonalResidence===true)?'Yes':'No', income:(r.income==='Yes'||r.isIncomeProperty===true)?'Yes':'No',
    fullValue:r.fullAssetValue||'', wardPct:r.wardPercent||'', carryingValue:r.fullAssetValue||'', wardValue:''
  }));
  dest.schD3=(src.scheduleB2||[]).map(r=>({
    description:r.description||'', fullAmount:r.fullAssetValue||'', wardPct:r.wardPercent||'', carryingValue:r.fullAssetValue||'', wardAmount:''
  }));
  dest.schD4=(src.scheduleB3||[]).map(r=>({
    description:r.description||'', restricted:(r.restricted==='Yes'||r.isRestricted===true)?'Yes':'No', fullAmount:r.fullAssetValue||'',
    wardPct:r.wardPercent||'', carryingValue:r.fullAssetValue||'', wardValue:'', restrictedAmt:''
  }));
  dest.schD5=[
    ...(src.scheduleA2||[]).map(r=>({description:r.lenderName||'',loanNo:r.accountNumber||'',loanType:r.liabilityType||'',fullDebt:r.fullDebtBalance||'',wardPct:r.wardPercent||'',wardBalance:''})),
    ...(src.scheduleB4||[]).map(r=>({description:r.lenderName||'',loanNo:r.accountNumber||'',loanType:r.liabilityType||'',fullDebt:r.fullLiabilityBalance||'',wardPct:r.wardPercent||'',wardBalance:''}))
  ];
  dest.schA=(src.scheduleC1||[]).map(r=>({payer:r.payerName||'',description:r.typeOfIncome||'',bank:'',accountNo:'',amount:r.annualIncomeAmount||''}));
  const trustRows=(src.scheduleC4||[]).map(r=>({
    hasTrust:'Yes', createdAfterGID:'No', name:r.trustName||'', trustee:r.trusteeName||'',
    accountNo:r.accountNumber||'', dateCreated:r.dateCreated||'', trustType:r.trustType||'',
    wardPct:r.wardPercent||'', wardAmount:''
  }));
  while(trustRows.length<3)trustRows.push(emptyRowAnnual('trust'));
  dest.trusts=trustRows.slice(0,3);
}

// Non-schedule fields that move from an Initial Inventory into an Annual
// (or Final/Trust) Accounting: the attorney block and the certificate of
// service. Signature dates are never carried — the new filing is signed and
// served on its own date.
function convertGuardianExtrasToAnnual(src,dest){
  // Milestone 57B (D7): the attestation never survives a conversion. It is
  // THIS filer's assertion about THIS filing -- that nobody required service
  // on it -- and a new filing has its own recipients and its own answer. It
  // is reset to '' (unanswered, never 'No'), and serviceNoRecipients never
  // maps to certNoRecipients or the reverse.
  //
  // Inside each mapper on purpose, not in the dispatcher: a caller-side
  // reset is the shape that earned the first attempt's "incomplete/unsafe"
  // verdict, because a fifth conversion path added later would inherit
  // nothing. Recipient address cards keep migrating exactly as before -- it
  // is the assertion that is dropped, never the data.
  dest.certNoRecipients='';
  dest.serviceNoRecipients='';
  const a=src.attorney||{}, sa=src.serviceAttorney||{};
  dest.attorney_bar=a.barNumber||'';
  dest.attorney_phone=a.phone||'';
  dest.attorney_street=a.streetAddress||'';
  dest.attorney_cityStateZip=a.cityStateZip||'';
  // Milestone 40C-A item 3: attorney_county is a SEPARATE field from the
  // filing's county and must never be populated from the ward's county, nor
  // silently defaulted to Pinellas. It carries over only an existing
  // attorney_county, and otherwise stays blank for the filer to supply.
  dest.attorney_county=dest.attorney_county||src.attorney_county||'';
  // Initial Inventory recipients are name / address / cityStateZip; the
  // Annual form gives each recipient four lines, so they map straight over
  // with the fourth left free.
  (src.serviceRecipients||[]).slice(0,4).forEach((r,i)=>{
    if(!dest.certRecipients[i])dest.certRecipients[i]={name:'',line2:'',line3:'',line4:''};
    dest.certRecipients[i]={name:r.name||'',line2:r.address||'',line3:r.cityStateZip||'',line4:''};
  });
  if(sa.barNumber&&!dest.attorney_bar)dest.attorney_bar=sa.barNumber;
}

// Everything that has a genuine counterpart on the Simplified Accounting.
// The Simplified form carries no itemised asset schedules, so the assets
// themselves collapse into the Starting Balance; what else can move is the
// attorney block, the certificate of service, the reporting period, and any
// remuneration disclosure.
function convertToSimplified(src,srcType,dest){
  // Milestone 57B (D7): the attestation never survives a conversion. It is
  // THIS filer's assertion about THIS filing -- that nobody required service
  // on it -- and a new filing has its own recipients and its own answer. It
  // is reset to '' (unanswered, never 'No'), and serviceNoRecipients never
  // maps to certNoRecipients or the reverse.
  //
  // Inside each mapper on purpose, not in the dispatcher: a caller-side
  // reset is the shape that earned the first attempt's "incomplete/unsafe"
  // verdict, because a fifth conversion path added later would inherit
  // nothing. Recipient address cards keep migrating exactly as before -- it
  // is the assertion that is dropped, never the data.
  dest.certNoRecipients='';
  dest.serviceNoRecipients='';
  const total=getWardHeadlineTotal(src);
  dest.startingBalance=total!=null?String(total):'';

  if(srcType==='guardian'){
    const a=src.attorney||{}, sa=src.serviceAttorney||{};
    dest.attorney_barNumber=a.barNumber||'';
    dest.attorney_phone=a.phone||'';
    dest.attorney_street=a.streetAddress||'';
    dest.attorney_cityStateZip=a.cityStateZip||'';
    dest.certAttyBarNumber=sa.barNumber||a.barNumber||'';
    dest.certAttyPhone=sa.phone||a.phone||'';
    dest.certAttyStreet=sa.streetAddress||a.streetAddress||'';
    dest.certAttyCityStateZip=sa.cityStateZip||a.cityStateZip||'';
    dest.certServiceDate=src.serviceDate||'';
    (src.serviceRecipients||[]).slice(0,4).forEach((r,i)=>{
      dest.certRecipients[i]={name:r.name||'',line2:r.address||'',line3:r.cityStateZip||''};
    });
    return;
  }

  // Annual family -> Simplified. Same ward, same period, smaller form.
  dest.periodFrom=src.periodFrom||'';
  dest.periodTo=src.periodTo||'';
  dest.amendedForm=src.amendedForm||'';
  dest.attorney_barNumber=src.attorney_bar||'';
  dest.attorney_phone=src.attorney_phone||'';
  dest.attorney_street=src.attorney_street||'';
  dest.attorney_cityStateZip=src.attorney_cityStateZip||'';
  dest.attorney_signatureDate=src.attorney_signatureDate||'';
  dest.certServiceDate=src.certDate||'';
  dest.certIndicator=src.certIndicator||'';
  dest.certAttySignDate=src.certAttySignDate||'';
  dest.certAttyBarNumber=src.attorney_bar||'';
  dest.certAttyPhone=src.attorney_phone||'';
  dest.certAttyStreet=src.attorney_street||'';
  dest.certAttyCityStateZip=src.attorney_cityStateZip||'';
  // The Annual gives each recipient a 4th line the Simplified form lacks —
  // fold it onto line 3 rather than silently dropping an address line.
  (src.certRecipients||[]).slice(0,4).forEach((r,i)=>{
    dest.certRecipients[i]={
      name:r.name||'', line2:r.line2||'',
      line3:[r.line3,r.line4].filter(Boolean).join(', ')
    };
  });
  const rem=(src.remuneration||[]).filter(r=>r.guardian||r.type||r.description||r.amount);
  if(rem.length){
    dest.remuneration=rem.map(r=>({guardian:r.guardian||'',type:r.type||'',
      amount:r.amount||'',description:r.description||''}));
  }
}

// Simplified -> Annual family: the mirror of convertToSimplified()'s second
// half. The Simplified form has no schedules to expand, so its ending
// balance becomes the new Starting Balance and the schedules start blank.
function convertSimplifiedToAnnual(src,dest){
  // Milestone 57B (D7): the attestation never survives a conversion. It is
  // THIS filer's assertion about THIS filing -- that nobody required service
  // on it -- and a new filing has its own recipients and its own answer. It
  // is reset to '' (unanswered, never 'No'), and serviceNoRecipients never
  // maps to certNoRecipients or the reverse.
  //
  // Inside each mapper on purpose, not in the dispatcher: a caller-side
  // reset is the shape that earned the first attempt's "incomplete/unsafe"
  // verdict, because a fifth conversion path added later would inherit
  // nothing. Recipient address cards keep migrating exactly as before -- it
  // is the assertion that is dropped, never the data.
  dest.certNoRecipients='';
  dest.serviceNoRecipients='';
  const total=getWardHeadlineTotal(src);
  dest.startingBalance=total!=null?String(total):'';
  dest.periodFrom=src.periodFrom||'';
  dest.periodTo=src.periodTo||'';
  dest.amendedForm=src.amendedForm||'';
  dest.attorney_bar=src.attorney_barNumber||'';
  dest.attorney_phone=src.attorney_phone||'';
  dest.attorney_street=src.attorney_street||'';
  dest.attorney_cityStateZip=src.attorney_cityStateZip||'';
  dest.attorney_signatureDate=src.attorney_signatureDate||'';
  // Milestone 40C-A item 3: attorney_county is a SEPARATE field from the
  // filing's county and must never be populated from the ward's county, nor
  // silently defaulted to Pinellas. It carries over only an existing
  // attorney_county, and otherwise stays blank for the filer to supply.
  dest.attorney_county=dest.attorney_county||src.attorney_county||'';
  dest.certDate=src.certServiceDate||'';
  dest.certIndicator=src.certIndicator||'';
  dest.certAttySignDate=src.certAttySignDate||'';
  (src.certRecipients||[]).slice(0,4).forEach((r,i)=>{
    dest.certRecipients[i]={name:r.name||'',line2:r.line2||'',line3:r.line3||'',line4:''};
  });
  const rem=(src.remuneration||[]).filter(r=>r.guardian||r.type||r.description||r.amount);
  if(rem.length){
    dest.remuneration=rem.map(r=>({guardian:r.guardian||'',type:r.type||'',
      amount:r.amount||'',description:r.description||''}));
  }
}

async function convertExistingWard(sourceWardId,targetType){
  const sourceWard=caseFile.wards.find(w=>w.wardId===sourceWardId);
  if(!sourceWard)return;
  const srcType=sourceWard.inventoryType;
  if(srcType===targetType){await window.alertModal('Please choose a different inventory type to convert to.');return;}

  const wardId=createWardId();
  const newWard={
    wardId,
    inventoryType:targetType,
    createdDate:new Date().toISOString().split('T')[0],
    ...initializeEmptyData(targetType)
  };
  // Identity and contact details first, whichever direction this is.
  if(carrySourcesFor(targetType).includes(srcType)){
    Object.assign(newWard,carryOverFields(sourceWard,targetType));
  }else{
    mapConvertedHeaderFields(sourceWard,srcType,newWard,targetType);
  }

  // Then the financial mapping, for the pairs whose schedules genuinely
  // correspond. This MUST run after the identity carry above: that carry
  // returns blank schedules by design, so running it second would wipe
  // everything mapped here. (Regression guard — that is exactly what
  // happened once the Initial Inventory became a valid carry source.)
  if(srcType==='guardian'&&formEngine(targetType)==='annual'){
    convertGuardianSchedulesToAnnual(sourceWard,newWard);
    convertGuardianExtrasToAnnual(sourceWard,newWard);
  }else if(targetType==='simplified'){
    convertToSimplified(sourceWard,srcType,newWard);
  }else if(srcType==='simplified'&&formEngine(targetType)==='annual'){
    convertSimplifiedToAnnual(sourceWard,newWard);
  }
  // annual->guardian and simplified->guardian: header fields only (mapped
  // above) — an Initial Inventory has no accounting-period equivalent to
  // derive asset schedules from, so those stay blank for manual entry.

  // Same explicit "this belongs with that one" reasoning as Add Ward's
  // carry-source picker -- see src/core/case-resolver.js.
  newWard.caseId=window.getOrCreateCaseForWard(sourceWard).id;

  caseFile.wards.push(newWard);
  await saveWardToState(newWard);

  await activateWard(newWard);
  _dirtySinceExport=true;
  updateLastSavedIndicator();
  navigate('/');
  await window.alertModal(`Converted "${sourceWard.wardName}" into a new ${INVENTORY_TYPES[targetType].name} form.\n\n${describeConversion(srcType,targetType)}`);
}

async function doConvertWard(){
  const sourceWardId=document.getElementById('convert-source-ward').dataset.wardId||'';
  const targetType=document.getElementById('convert-target-type').value;
  if(!sourceWardId||!targetType)return;
  closeModal('convertWardModal');
  await convertExistingWard(sourceWardId,targetType);
}

// ═══════════════════════════════════════════════════════
// MULTI-YEAR ACCOUNTING (save / switch / edit by year)
// ═══════════════════════════════════════════════════════
// A ward's flat top-level fields (schedules, balances, signatures, etc.)
// always represent whichever year is currently "active" — every existing
// render/print/export/validation function reads and writes through
// window.D exactly as before, with no awareness that years exist at all.
// Prior years are simply snapshotted off those same fields into
// ward.years[] and swapped back in on request. These keys are the only
// ones that are NOT part of a year's data.
const WARD_SYSTEM_KEYS=['wardId','inventoryType','createdDate','lastModified','archived','scheduleDocs','years','activeYearKey','yearCounter'];

function snapshotCurrentYearData(ward){
  const data={};
  for(const k in ward){
    if(!WARD_SYSTEM_KEYS.includes(k))data[k]=ward[k];
  }
  return JSON.parse(JSON.stringify(data));
}

function applyYearData(ward,data){
  for(const k of Object.keys(ward)){
    if(!WARD_SYSTEM_KEYS.includes(k))delete ward[k];
  }
  Object.assign(ward,JSON.parse(JSON.stringify(data)));
}

// Resets the fields that must be blank/empty for a fresh, unsigned filing
// of a new period. Names, addresses, eligibility answers, and (for
// Guardian) the asset schedules all carry forward as-is from the year
// being archived — re-typing mostly-unchanged case information every year
// would be far more work than editing down what actually changed. What
// DOES reset differs by type:
//  - Signatures/dates: always cleared, this is an unsigned new filing.
//  - Annual/Simplified period dates + amended flag: cleared, set on Cover.
//  - Remuneration: a fresh declaration each year, not a running total.
//  - Annual's income/disbursement/capital-adjustment/transfer/sale
//    schedules (schA, schB1-4, schC, schE, schF1-2): these describe
//    transactions THAT happened during one specific period, so they reset
//    empty. Schedule D (assets/liabilities as of period end) is instead
//    carried forward, becoming next period's starting holdings — exactly
//    the schedule-level equivalent of Simplified's starting balance.
//  - Simplified's Interest/Deposits/Service Charges/Federal Tax: reset —
//    each is a specific period's transactions, not a standing balance.
function resetYearlyFieldsForNewYear(data,type){
  const carriedAssignee=typeof data.dashboardWorkflow?.assigneeName==='string'
    ? data.dashboardWorkflow.assigneeName.trim().replace(/\s+/g,' ').slice(0,120)
    : '';
  if(carriedAssignee)data.dashboardWorkflow={assigneeName:carriedAssignee};
  else delete data.dashboardWorkflow;
  const clearDate=obj=>{if(obj&&('signatureDate' in obj))obj.signatureDate='';};
  if(Array.isArray(data.guardians)){
    data.guardians.forEach(g=>{clearDate(g);if(g&&('signatureDateLabel' in g))g.signatureDateLabel='';});
  }
  if(type==='guardian'){
    clearDate(data.preparer);
    if(data.attorney){data.attorney.signatureDate=null;data.attorney.filingDate=null;}
    data.serviceDate=null;
    data.amendedForm='';
    delete data.isAmended;
  }else if(type==='simplified'){
    data.attorney_signatureDate='';
    data.certServiceDate='';
    data.certAttySignDate='';
    data.periodFrom='';data.periodTo='';
    data.amendedForm='';
    data.interestIncome='';data.depositsSettlement='';data.serviceCharges='';data.federalIncomeTax='';
  }else if(formEngine(type)==='annual'){
    clearDate(data.preparer);
    data.attorney_signatureDate='';
    data.certDate='';
    data.certAttySignDate='';
    data.periodFrom='';data.periodTo='';
    data.amendedForm='';
    data.schA=[];data.schB1=[];data.schB2=[];data.schB3=[];data.schB4=[];
    data.schC=[];data.schE=[];data.schF1=[];data.schF2=[];
  }else if(type==='planSimplified'){
    // Every answer on a Plan describes one specific year ("during the
    // preceding year", "in the past year"), so ALL of them reset — unlike
    // the accountings, nothing here is a carried-forward balance. Only the
    // ward's identity and the guardians' contact details survive.
    data.periodFrom='';data.periodTo='';
    data.q1Residences='';data.q2BestPlacement='';data.q3MedicalTreatment='';data.q4Diagnosis='';
    data.q5SocialServices='';data.q6Interaction='';
    data.q7RestoreRights='';data.q7RestoreExplain='';
    data.q8DNR=false;data.q8LivingWill=false;data.q8Surrogate=false;data.q8POA=false;
    data.q8Other=false;data.q8OtherText='';data.q8None=false;
    data.q9Remuneration='';data.q9RemunerationExplain='';
    if(Array.isArray(data.planGuardians)){
      data.planGuardians.forEach(g=>{if(g)g.signatureDate='';});
    }
  }else if(type==='planAnnual'){
    // Same reasoning as the Simplified Plan: every answer describes one
    // specific reporting year. The two repeating tables reset to a single
    // blank row rather than being emptied, so the page isn't a bare
    // "no entries" state when the guardian opens it.
    data.periodFrom='';data.periodTo='';
    data.q1Residences=[emptyPlanResidence()];
    data.q4Providers=[emptyPlanProvider()];
    data.q2NoMove=false;data.q2WithinCounty=false;data.q2WithinCircuit=false;
    data.q2OutsideApproved=false;data.q2OutsideVenuePetition=false;
    data.q5SocialSkills='';data.q5Activities='';data.q7RightsExplain='';
    // Rights and ADL ratings are a fresh assessment each year — carrying
    // last year's forward would defeat the purpose of the annual review.
    if(data.rights)Object.keys(data.rights).forEach(k=>data.rights[k]='');
    if(data.adls)Object.keys(data.adls).forEach(k=>data.adls[k]='');
    if(data.benefits)Object.values(data.benefits).forEach(benefit=>{
      if(benefit){benefit.eligible='';benefit.appliedFor='';}
    });
    // Milestone 37-4: empty, not pre-seeded -- see state.js's identical note.
    data.q10Directives=[];
    data.q11NoRemuneration=false;data.q11NoRemunerationName='';
    data.q11ReceivedName='';data.q11Amount='';data.q11From='';data.q11SubmittedToCourt=false;
    data.certIncapacitatedNoCopy=false;data.certMinorNoCopy=false;data.certConsulted=false;
    data.certNoRestriction=false;data.certProvidesMedical=false;
    data.certPhysicianAttached=false;data.certRecognizeRights=false;
    data.certRightsChangedExplain='';
    data.attorney_signatureDate='';
    if(Array.isArray(data.planGuardians)){
      data.planGuardians.forEach(g=>{if(g)g.signatureDate='';});
    }
  }else if(type==='planInitial'){
    // The Initial Plan is normally a one-time filing, but if a guardian
    // needs to amend or refile it, every answer describes conditions as of
    // filing — nothing here is a carried balance. Only ward identity and
    // guardian contact details survive.
    data.periodFrom='';data.periodTo='';
    data.inceptionDate='';data.lettersSignedDate='';data.successorGuardianship='';
    data.wardLiving='';data.residenceAddress='';data.residenceCityStateZip='';data.residencePhone='';
    data.mailingAddress='';data.mailingCityStateZip='';data.q1PreexistingDirectives='';
    data.q2Setting='';data.q2Explain='';
    data.q3MedPrimary=false;data.q3MedDentist=false;data.q3MedOphthalmologist=false;
    data.q3MedSpecialist=false;data.q3MedSpecialistArea='';data.q3MedPT=false;
    data.q3MedST=false;data.q3MedOT=false;data.q3MedWardDecides=false;
    data.q3MedOther=false;data.q3MedExplain='';
    data.q4Mental='';data.q4Explain='';
    data.q5Personal='';data.q5Explain='';
    data.q6CareFacility=false;data.q6NursesAides=false;data.q6FamilyFriends=false;
    data.q6DayProgram=false;data.q6WardDecides=false;data.q6Other=false;data.q6Explain='';
    data.q7SocialSecurity='';data.q7Ssdi='';data.q7Hmo='';data.q7Ssi='';
    data.q7StateSupplement='';data.q7InstitutionalCare='';data.q7SupplementalIns='';
    data.q7Pension='';data.q7Medicare='';data.q7Medicaid='';data.q7Va='';
    data.q7Trusts='';data.q7PendingBenefits='';data.q7Other=false;data.q7Explain='';
    data.q9Providers=[emptyInitialProvider()];
    if(data.adls)Object.keys(data.adls).forEach(k=>data.adls[k]='');
    data.mentalAlzheimers=false;data.mentalAutism=false;data.mentalClosedHeadInjury=false;
    data.mentalDementia=false;data.mentalDepression=false;data.mentalDevelopmental=false;
    data.mentalSubstance=false;data.mentalSchizophrenia=false;data.mentalOther=false;data.mentalExplain='';
    data.physMobility=false;data.physBlindness=false;data.physDeafness=false;data.physDiabetic=false;
    data.physParkinsons=false;data.physArthritis=false;data.physOther=false;data.physExplain='';
    data.usesDentures=false;data.usesHearingAid=false;data.usesWheelchair=false;data.usesWalker=false;
    data.usesCrutches=false;data.usesProsthetics=false;data.usesGlasses=false;data.usesNone=false;
    data.usesOther=false;data.usesExplain='';
    data.needsDentures=false;data.needsHearingAid=false;data.needsWheelchair=false;data.needsWalker=false;
    data.needsCrutches=false;data.needsProsthetics=false;data.needsGlasses=false;data.needsNone=false;
    data.needsOther=false;data.needsExplain='';
    data.committeeIncorporated='';data.committeeExplain='';
    data.q11NoDirectives=false;data.q11StepResidence=false;data.q11StepSafeDeposit=false;
    data.q11StepInterviewed=false;data.q11StepMedicalProviders=false;data.q11StepAttorney=false;
    data.q11Executed=false;data.q11ExecDNR=false;data.q11ExecHealthcare=false;
    data.q11ExecPOA=false;data.q11ExecOther=false;data.q11ExecOtherText='';
    // Milestone 37-4: empty, not pre-seeded -- see state.js's identical note.
    data.q11Directives=[];
    data.certIncapacitatedNoCopy=false;data.certMinorNoCopy=false;data.certConsulted=false;
    data.certRecognizeRights=false;data.certNoRestriction=false;data.certProvidesCare=false;
    data.attorney_signatureDate='';
    if(Array.isArray(data.planGuardians)){
      data.planGuardians.forEach(g=>{if(g)g.signatureDate='';});
    }
  }else if(type==='planMinor'){
    // Filed annually like the Annual Guardianship Plan — every answer
    // describes one specific reporting year. Only the minor's identity and
    // guardian contact details survive; residences/providers reset to a
    // single blank row.
    data.periodFrom='';data.periodTo='';
    data.amendedForm='';data.amendedVersion='';
    data.q1ResidenceName='';data.q1Street='';data.q1City='';data.q1State='';data.q1Zip='';data.q1Phone='';
    data.q2Residences=[emptyMinorResidence()];
    data.q3Providers=[emptyMinorProvider()];
    data.q4Primary=false;data.q4PrimaryFreq='';data.q4Dentist=false;data.q4DentistFreq='';
    data.q4Specialist=false;data.q4SpecialistFreq='';
    data.q4PT=false;data.q4ST=false;data.q4OT=false;data.q4MinorDecides=false;
    data.q4Other=false;data.q4Explain='';
    data.q5SchoolProgress='';data.q5SocialDevelopment='';data.q5Communicates='';data.q5Interpersonal='';
    data.q5NoUnmetNeeds=false;data.q5DoesNotCareToSocialize=false;data.q5UnmetNeeds=false;
    data.q5Other=false;data.q5Explain='';
    data.certIncapacitated=false;data.certMinor=false;data.certConsulted=false;
    data.certNoRestriction=false;data.certProvidesCare=false;data.certPhysicianAttached=false;
    data.preparer_signatureDate='';data.attorney_signatureDate='';
    if(Array.isArray(data.planGuardians)){
      data.planGuardians.forEach(g=>{if(g)g.signatureDate='';});
    }
  }
  // Remuneration is a fresh declaration each year, not a running total.
  if(Array.isArray(data.remuneration)){
    data.remuneration=data.remuneration.map(()=>formEngine(type)==='annual'?emptyRowAnnual('remun'):({guardian:'',type:'',description:''}));
  }
}

// Guardianship annual/simplified accounting periods commonly span two
// calendar years (they run from one anniversary of the case to the next,
// not Jan-Dec), so "2025-2026" reads far more like a real filing period
// than an abstract "Year 2" ever would. Falls back to the internal
// key only when no period has been entered yet (e.g. right after
// starting a new year, before its dates are filled in on the Cover page).
function describeYearLabel(ward,data,archivedAt){
  const key=ward.activeYearKey||'Year 1';
  if(ward.inventoryType!=='guardian'){
    const fromYear=data.periodFrom?String(data.periodFrom).slice(0,4):'';
    const toYear=data.periodTo?String(data.periodTo).slice(0,4):'';
    if(fromYear&&toYear)return fromYear===toYear?fromYear:`${fromYear}-${toYear}`;
    if(fromYear||toYear)return fromYear||toYear;
    return key;
  }
  // Initial Inventory has no accounting period, and its GID never changes
  // across re-inventory years, so it can't distinguish Year 1 from Year 2.
  // Label by the calendar year this particular snapshot was recorded in.
  return String(new Date(archivedAt||Date.now()).getFullYear());
}

// Snapshots whatever is currently loaded on the ward into its slot in
// ward.years[], keyed by the year it's leaving. Shared by switchWardYear
// (moving to an existing year) and startNewWardYear (moving to a new one)
// so a year's data is never lost no matter which direction triggered it.
function checkInActiveYear(ward){
  ward.years=ward.years||[];
  ward.yearCounter=ward.yearCounter||1;
  ward.activeYearKey=ward.activeYearKey||('Year '+ward.yearCounter);
  const data=snapshotCurrentYearData(ward);
  const archivedAt=new Date().toISOString();
  const label=describeYearLabel(ward,data,archivedAt);
  const existing=ward.years.find(y=>y.key===ward.activeYearKey);
  if(existing){existing.data=data;existing.label=label;existing.archivedAt=archivedAt;}
  else ward.years.push({key:ward.activeYearKey,label,archivedAt,data});
}

async function switchWardYear(wardId,targetKey){
  const ward=caseFile.wards.find(w=>w.wardId===wardId);
  if(!ward)return;
  await flushPendingSave();
  checkInActiveYear(ward);
  const idx=ward.years.findIndex(y=>y.key===targetKey);
  if(idx===-1)return;
  const target=ward.years[idx];
  ward.years.splice(idx,1);
  applyYearData(ward,target.data);
  ward.activeYearKey=target.key;
  await saveWardToState(ward);
  _dirtySinceExport=true;
  updateLastSavedIndicator();
  notifyProbateGuardianTabStateChanged();
}

// Archives the current year (carrying forward everything by default) and
// opens a fresh one: ending net total becomes next year's starting balance
// for Annual/Simplified, and Initial Inventory's schedules carry forward
// unchanged so the guardian edits down what's changed instead of
// re-entering the whole asset list.
async function startNewWardYear(wardId){
  const ward=caseFile.wards.find(w=>w.wardId===wardId);
  if(!ward)return;
  await flushPendingSave();
  const priorTotal=getWardHeadlineTotal(ward);
  checkInActiveYear(ward);
  const seed=snapshotCurrentYearData(ward);
  resetYearlyFieldsForNewYear(seed,ward.inventoryType);
  if((formEngine(ward.inventoryType)==='annual'||ward.inventoryType==='simplified')&&priorTotal!=null){
    seed.startingBalance=String(priorTotal);
  }
  applyYearData(ward,seed);
  // Milestone 40C-A item 3: a new year is a new filing for the same ward, so it
  // hydrates from the canonical ward Party. The same-ward snapshot carry above
  // usually already supplies it; this fills the case where the prior year had no
  // county but the ward Party does. It never overwrites a county the year
  // already carries -- prior years stay auditable.
  if(typeof window.hydrateCountyFromWardParty==='function')window.hydrateCountyFromWardParty(ward);
  ward.yearCounter=(ward.yearCounter||1)+1;
  ward.activeYearKey='Year '+ward.yearCounter;
  await saveWardToState(ward);
  _dirtySinceExport=true;
  updateLastSavedIndicator();
  notifyProbateGuardianTabStateChanged();
}

let _yearModalWardId=null;

async function showStartNewYearModal(wardId){
  const ward=caseFile.wards.find(w=>w.wardId===wardId);
  if(!ward)return;
  await ensureFragment('common-modals');
  _yearModalWardId=wardId;
  const note=ward.inventoryType==='guardian'
    ?"The new year opens with a copy of this year's schedules (A-1 through C-5) so you can edit down what's changed, instead of re-entering everything. Signatures and dates are cleared for the new filing."
    :"The new year opens with Starting Balance pre-filled from this year's ending total. Schedule entries, signatures, and the accounting period are cleared for the new filing.";
  document.getElementById('new-year-ward-name').textContent=ward.wardName||'(unnamed ward)';
  document.getElementById('new-year-note').textContent=note;
  showModal('startNewYearModal');
}

async function confirmStartNewYear(){
  const wardId=_yearModalWardId;
  if(!wardId)return;
  closeModal('startNewYearModal');
  await switchWard(wardId);
  await startNewWardYear(wardId);
  navigate('/');
}

function renderPriorYearsList(ward){
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

async function showPriorYearsModal(wardId){
  const ward=caseFile.wards.find(w=>w.wardId===wardId);
  if(!ward)return;
  await ensureFragment('common-modals');
  _yearModalWardId=wardId;
  document.getElementById('prior-years-ward-name').textContent=ward.wardName||'(unnamed ward)';
  renderPriorYearsList(ward);
  showModal('priorYearsModal');
}

async function editPriorYear(wardId,key){
  closeModal('priorYearsModal');
  await switchWard(wardId);
  await switchWardYear(wardId,key);
  navigate('/');
}

// The period key a given archived year's supporting-document uploads and
// comments were filed under, so deleting the year can clean those up too
// instead of leaving them orphaned. Mirrors scheduleDocPeriodKey(), but
// against an arbitrary snapshot rather than the live active ward.
function periodKeyForYearData(ward,yearEntry){
  if(ward.inventoryType==='guardian')return yearEntry.key;
  const d=yearEntry.data||{};
  return `${d.periodFrom||''}__${d.periodTo||''}`;
}

async function deleteWardYear(wardId,yearKey){
  const ward=caseFile.wards.find(w=>w.wardId===wardId);
  if(!ward||!ward.years)return;
  const idx=ward.years.findIndex(y=>y.key===yearKey);
  if(idx===-1)return;
  const periodKey=periodKeyForYearData(ward,ward.years[idx]);
  if(ward.scheduleDocs){
    for(const scheduleKey of Object.keys(ward.scheduleDocs)){
      delete ward.scheduleDocs[scheduleKey][periodKey];
    }
  }
  ward.years.splice(idx,1);
  await saveWardToState(ward);
  _dirtySinceExport=true;
  updateLastSavedIndicator();
  notifyProbateGuardianTabStateChanged();
}

let _pendingDeleteYear=null;

async function confirmDeleteWardYear(wardId,yearKey){
  const ward=caseFile.wards.find(w=>w.wardId===wardId);
  const entry=ward&&ward.years&&ward.years.find(y=>y.key===yearKey);
  if(!ward||!entry)return;
  await ensureFragment('common-modals');
  _pendingDeleteYear={wardId,yearKey};
  document.getElementById('delete-year-msg').textContent=`Are you sure you want to delete the ${entry.label} accounting for "${ward.wardName}"? Any supporting documents or comments uploaded for that year will be deleted too. This action cannot be undone.`;
  showModal('deleteYearModal');
}

async function doDeleteWardYear(){
  if(!_pendingDeleteYear)return;
  const {wardId,yearKey}=_pendingDeleteYear;
  try{
    await deleteWardYear(wardId,yearKey);
    closeModal('deleteYearModal');
    const ward=caseFile.wards.find(w=>w.wardId===wardId);
    if(ward)renderPriorYearsList(ward);
    if(currentPage==='/dashboard')renderDashboardGrid();
  }catch(e){
    console.error('Failed to delete year',e);
    await window.alertModal('Failed to delete year. Check console.');
  }
}

// ═══════════════════════════════════════════════════════
// INVENTORY TYPE SELECTOR PAGE
// ═══════════════════════════════════════════════════════
function pageInventorySelector(){
  return `<div style="max-width:900px;margin:0 auto;">
  <h1 style="font-size:1.8rem;color:var(--ink);margin-bottom:2rem;text-align:center;">Start New Form</h1>
  <p style="text-align:center;color:var(--ink-3);margin-bottom:2rem;font-size:.95rem;">Select the form type for a ward. You can manage multiple wards of different types.</p>
  <div class="feedback-entry-actions" aria-label="Beta feedback">
    <button type="button" class="topnav-btn" data-feedback-open="bug">${ic('bug',16)} Report a Bug</button>
    <a class="topnav-btn" href="https://pinellascountyfl.govqa.us/WEBAPP/_rs/(S(ymqkyi4ihgwnngmluraqqkeh))/RequestOpen.aspx?sSessionID=&rqst=23" target="_blank" rel="noopener noreferrer">${ic('message',16)} Comment Card<span class="visually-hidden"> (opens in a new tab)</span></a>
  </div>
  <div class="inventory-selector">
    <div class="inventory-card" data-form-action="add-ward-type" data-inventory-type="guardian" role="button" tabindex="0" aria-label="Create Initial Inventory ward">
      <h2><svg class="ic" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M9 4.6H7.2a1.6 1.6 0 0 0-1.6 1.6V19a1.6 1.6 0 0 0 1.6 1.6h9.6A1.6 1.6 0 0 0 18.4 19V6.2a1.6 1.6 0 0 0-1.6-1.6H15"/><rect x="9" y="3" width="6" height="3.4" rx="1.1"/></svg> Initial Inventory</h2>
      <p>${INVENTORY_TYPES.guardian.description}</p>
      <span class="btn btn-primary btn-sm" aria-hidden="true">Create Form for a Ward</span>
    </div>
    <div class="inventory-card" data-form-action="add-ward-type" data-inventory-type="simplified" role="button" tabindex="0" aria-label="Create Simplified Accounting ward">
      <h2><svg class="ic" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M6 3.6h12v17l-3-1.8-3 1.8-3-1.8-3 1.8Z"/><path d="M9.2 8.4h5.6M9.2 12.4h5.6"/></svg> Simplified Accounting</h2>
      <p>${INVENTORY_TYPES.simplified.description}</p>
      <span class="btn btn-primary btn-sm" aria-hidden="true">Create Form for a Ward</span>
    </div>
    <div class="inventory-card" data-form-action="add-ward-type" data-inventory-type="annual" role="button" tabindex="0" aria-label="Create Annual Accounting ward">
      <h2><svg class="ic" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M4.2 20h15.6"/><path d="M7.4 20v-6.4M12 20V5.6M16.6 20v-9.2"/></svg> Annual Accounting</h2>
      <p>${INVENTORY_TYPES.annual.description}</p>
      <span class="btn btn-primary btn-sm" aria-hidden="true">Create Form for a Ward</span>
    </div>
    <div class="inventory-card" data-form-action="add-ward-type" data-inventory-type="finalAccounting" role="button" tabindex="0" aria-label="Create Final Accounting ward">
      <h2><svg class="ic" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M4.2 20h15.6"/><path d="M7.4 20v-6.4M12 20V5.6M16.6 20v-9.2"/><path d="m15.8 4.4 1.7 1.7 3.1-3.2"/></svg> Final Accounting</h2>
      <p>${INVENTORY_TYPES.finalAccounting.description}</p>
      <span class="btn btn-primary btn-sm" aria-hidden="true">Create Form for a Ward</span>
    </div>
    <div class="inventory-card" data-form-action="add-ward-type" data-inventory-type="trustAccounting" role="button" tabindex="0" aria-label="Create Trust Accounting ward">
      <h2><svg class="ic" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M4.6 9.4 12 4.2l7.4 5.2"/><path d="M6.6 10.8v7.4M11 10.8v7.4M15.4 10.8v7.4M19.8 10.8v7.4"/><path d="M4.2 20.2h15.6"/></svg> Trust Accounting</h2>
      <p>${INVENTORY_TYPES.trustAccounting.description}</p>
      <span class="btn btn-primary btn-sm" aria-hidden="true">Create Form for a Ward</span>
    </div>
    <div class="inventory-card" data-form-action="add-ward-type" data-inventory-type="planInitial" role="button" tabindex="0" aria-label="Create Initial Guardianship Plan ward">
      <h2><svg class="ic" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M12 3.4 5.2 6.1v5.3c0 4.2 2.9 8.1 6.8 9.2 3.9-1.1 6.8-5 6.8-9.2V6.1Z"/><path d="M12 8v5.4M12 16.4v.1"/></svg> Initial Guardianship Plan</h2>
      <p>${INVENTORY_TYPES.planInitial.description}</p>
      <span class="btn btn-primary btn-sm" aria-hidden="true">Create Form for a Ward</span>
    </div>
    <div class="inventory-card" data-form-action="add-ward-type" data-inventory-type="planSimplified" role="button" tabindex="0" aria-label="Create Simplified Annual Plan ward">
      <h2><svg class="ic" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M12 3.4 5.2 6.1v5.3c0 4.2 2.9 8.1 6.8 9.2 3.9-1.1 6.8-5 6.8-9.2V6.1Z"/><path d="m9.4 12.1 1.9 1.9 3.4-3.6"/></svg> Simplified Annual Plan</h2>
      <p>${INVENTORY_TYPES.planSimplified.description}</p>
      <span class="btn btn-primary btn-sm" aria-hidden="true">Create Form for a Ward</span>
    </div>
    <div class="inventory-card" data-form-action="add-ward-type" data-inventory-type="planAnnual" role="button" tabindex="0" aria-label="Create Annual Guardianship Plan ward">
      <h2><svg class="ic" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M12 3.4 5.2 6.1v5.3c0 4.2 2.9 8.1 6.8 9.2 3.9-1.1 6.8-5 6.8-9.2V6.1Z"/><path d="M9.2 10.6h5.6M9.2 13.6h5.6"/></svg> Annual Guardianship Plan</h2>
      <p>${INVENTORY_TYPES.planAnnual.description}</p>
      <span class="btn btn-primary btn-sm" aria-hidden="true">Create Form for a Ward</span>
    </div>
    <div class="inventory-card" data-form-action="add-ward-type" data-inventory-type="planMinor" role="button" tabindex="0" aria-label="Create Annual Plan — Minors ward">
      <h2><svg class="ic" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M12 3.4 5.2 6.1v5.3c0 4.2 2.9 8.1 6.8 9.2 3.9-1.1 6.8-5 6.8-9.2V6.1Z"/><circle cx="12" cy="9.8" r="1.6"/><path d="M9.4 15.2c0-1.6 1.2-2.6 2.6-2.6s2.6 1 2.6 2.6"/></svg> Annual Plan — Minors</h2>
      <p>${INVENTORY_TYPES.planMinor.description}</p>
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

function emptyDataGuardian(){
  return {
    wardName:'',caseNumber:'',ucn:'',gid:null,county:'',guardianName:'',
    attorneyForGuardian:'',typeOfGuardianship:'',hasSafeDepositBox:'',
    safeDepositBoxFiled:'',amendedForm:'',
    scheduleA1:[],scheduleA2:[],scheduleB1:[],scheduleB2:[],scheduleB3:[],
    scheduleB4:[],scheduleC1:[],scheduleC2:[],scheduleC3:[],scheduleC4:[],scheduleC5:[],
    // Per-schedule "I verify there are no items of this type" checkbox --
    // missing keys read as false, so a .sav saved before this existed just
    // treats every schedule as unconfirmed (matches its actual pre-existing
    // state: not yet reviewed), never as falsely confirmed empty.
    scheduleNoItems:{},
    guardians:[{name:'',ssnEin:'',phone:'',streetAddress:'',cityStateZip:'',signatureDate:null,signatureState:'',signatureImage:''}],
    preparer:{name:'',ssnEin:'',phone:'',streetAddress:'',cityStateZip:'',signatureDate:null,signatureState:'',signatureImage:''},
    attorney:{name:'',barNumber:'',phone:'',streetAddress:'',cityStateZip:'',signatureDate:null,filingDate:null,signatureState:'',signatureImage:''},
    // bondWaived is the tri-state ('', 'Yes', 'No') behind bondWaivedDate.
    // A blank date alone could not distinguish "waived, date not entered"
    // from "not waived" -- see core/validation/dependent-question.js.
    bondAmount:'',bondPeriodFrom:null,bondPeriodTo:null,bondingCompany:'',bondWaived:'',bondWaivedDate:'',
    // Milestone 57B: filer attestation that no one requires service.
    // Tri-state, never coerced (section 4): '' is unanswered, and an
    // empty recipient list must never infer 'Yes'. Asked only when no
    // recipient is listed (D16), and reset to '' by every filing
    // conversion (D7) -- it is this filer's assertion about this filing.
    serviceNoRecipients:'',
    serviceRecipients:[{name:'',address:'',cityStateZip:''},{name:'',address:'',cityStateZip:''}],
    serviceDate:null,serviceAttorney:{name:'',barNumber:'',phone:'',streetAddress:'',cityStateZip:'',signatureState:'',signatureImage:''},
    // Witnesses present during the physical inventory of the ward's personal
    // effects. Optional (not export-blocking) -- the Cover page reminder
    // states the requirement, but not every inventory necessarily has a
    // witness present, and the app shouldn't second-guess that on its own.
    witnesses:[]
  };
}

const PAGES_GUARDIAN=[
  {id:'/',    label:'Cover'},
  {id:'/summary', label:'Summary'},
  {id:'/a1',  label:'Schedule A-1: Real Estate'},
  {id:'/a2',  label:'Schedule A-2: RE Liabilities'},
  {id:'/b1',  label:'Schedule B-1: Cash'},
  {id:'/b2',  label:'Schedule B-2: Personal Property'},
  {id:'/b3',  label:'Schedule B-3: Intangibles'},
  {id:'/b4',  label:'Schedule B-4: PP Liabilities'},
  {id:'/c1',  label:'Schedule C-1: Income'},
  {id:'/c2',  label:'Schedule C-2: Lawsuits Against'},
  {id:'/c3',  label:'Schedule C-3: Lawsuits By Ward'},
  {id:'/c4',  label:'Schedule C-4: Trusts'},
  {id:'/c5',  label:'Schedule C-5: Joint Owners'},
  {id:'/d1',  label:'D-1: Guardian Attestation'},
  {id:'/d2',  label:'D-2: Preparer & Attorney'},
  {id:'/d3',  label:'D-3: Audit Fee & Safe Deposit'},
  {id:'/d4',  label:'D-4: Bond & Surety Info'},
  {id:'/d5',  label:'D-5: Certificate of Service'},
  {id:'/print',label:'Print Preview'},
];
window.PAGES_GUARDIAN=PAGES_GUARDIAN;

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
// 9). Ward-management CRUD (addWard, switchWard, deleteWard, renameWard,
// convertWard, all modals, year management) stays legacy: it's called from
// the topnav on every page, not just the dashboard, so gating it behind
// this feature's lazy load would break "Switch Ward"/"+ New Form" on every
// other page. getWardHeadlineTotal(), typeIcon(), INVENTORY_TYPE_META, and
// formatDashboardCurrency() also stay legacy for the same reason --
// refreshWardInfoCard() and the ward-selector dropdown need them on every
// page too.
let _dashboardFeatureBridge=null;
function getDashboardFeatureBridge(){
  return _dashboardFeatureBridge??=window.createFeatureBridge(()=>window.loadDashboardFeature());
}
async function mountDashboardFeature(page){
  await getDashboardFeatureBridge().mountPage(document.getElementById('main-content'),page);
}

function formatDisplayDate(canonicalStr){
  if(!canonicalStr)return '';
  const match=String(canonicalStr).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if(match){
    return `${match[2]}/${match[3]}/${match[1]}`;
  }
  return canonicalStr;
}
window.formatDisplayDate = formatDisplayDate;

function inpS(id,label,val,req=false,type='text'){
  return window.renderFormField({
    path: id,
    label,
    value: val,
    type,
    required: req,
    id,
  });
}
// Filtered-autocomplete text input for county fields, using the same
// D['id']=this.value write convention as the other Simplified/Plan field helpers.
function countyInputS(id,label,val,req=false){
  return `<div class="mb-2"><label class="form-label" for="${id}">${label}${req?'<span class="req">*</span>':''}</label>${countyAutocompleteHTML(id,val,id)}</div>`;
}
// ── Plan form controls ───────────────────────────────────
// The Guardianship Plans are narrative documents — long free-text answers,
// checkbox lists, and Yes/No questions — where the accountings are grids of
// numbers. Nothing in the app covered those controls (the only textarea was
// the schedule-comments box; the only checkbox was the unlock dialog), so
// these three are the shared foundation for all four Plan types.
//
// They follow the same convention as inpS above: write straight to
// D['id'] inline, then autoSave() and refresh the completion checkmarks.
// Values are escaped on the way out; free text is deliberately NOT run
// through formatName/formatAddress the way inpS guesses by label, because
// these are sentences and paragraphs, not names or addresses.
function txtP(id,label,val,rows=4,req=false,hint=''){
  return window.renderTextareaField({ path: id, label, value: val, rows, required: req, hint, id });
}

function chkP(id,label,checked){
  return window.renderCheckboxField({ path: id, label, checked, id });
}
// Explicit binary answers retain the literal 'Yes'/'No' string contract used
// by validators and every output format. Unlike the former checkbox, a radio
// pair has a real unanswered state: neither option is selected and the model
// remains ''. `binding` permits Annual Accounting's isolated event contract
// without teaching its schedule controls to use the general form listener.
function yesNoRadioHTML(id,label,val,path,req=false,route='',binding='form',tooltipKey=''){
  return window.renderYesNoField({ path, label, value: val, id, required: req, route, binding, tooltipKey });
}

function planGuardianBlank(type){
  // Milestone 39-C: every Plan type's guardian row now carries signatureState/
  // signatureImage (39-B piloted planSimplified's only).
  if(type==='planInitial')return {name:'',ssn:'',street:'',phone:'',cityStateZip:'',signatureDate:'',relationship:'',signatureState:'',signatureImage:''};
  if(type==='planAnnual')return {name:'',ssn:'',phone:'',email:'',signatureDate:'',mailingStreet:'',mailingCityStateZip:'',officeStreet:'',officeCityStateZip:'',relationship:'',signatureState:'',signatureImage:''};
  if(type==='planMinor')return window.emptyMinorGuardianSig();
  return {name:'',signatureDate:'',email:'',phone:'',mailingAddress:'',signatureState:'',signatureImage:''};
}
function planGuardianHasAnyData(g){return !!(g&&Object.values(g).some(v=>v!==''&&v!==null&&v!==undefined&&v!==false));}
function planGuardianMax(type){return type==='planInitial'?4:type==='planAnnual'?3:2;}
function normalizePlanGuardians(data=window.D){
  const rows=Array.isArray(data?.planGuardians)?data.planGuardians:[];
  const primary=rows[0]||planGuardianBlank(data?.inventoryType);
  const kept=[primary,...rows.slice(1).filter(planGuardianHasAnyData)].slice(0,planGuardianMax(data?.inventoryType));
  if(data) data.planGuardians=kept;
  return kept;
}
function addPlanGuardian(route){
  const d=window.D; const rows=normalizePlanGuardians(d);
  if(rows.length>=planGuardianMax(d.inventoryType))return false;
  rows.push(planGuardianBlank(d.inventoryType)); d.planGuardians=rows; autoSave(); navigate(route); return true;
}
async function removePlanGuardian(index,route){
  const d=window.D; const rows=normalizePlanGuardians(d);
  if(index<=0||index>=rows.length)return false;
  const row=rows[index];
  if(planGuardianHasAnyData(row)&&!(await window.confirmModal(`Remove co-guardian ${row.name||`#${index+1}`}? This will delete the entered signature information.`)))return false;
  rows.splice(index,1); d.planGuardians=rows;
  if(Array.isArray(d.guardianPartyIds))d.guardianPartyIds.splice(index,1);
  autoSave(); navigate(route); return true;
}
window.normalizePlanGuardians=normalizePlanGuardians;
window.addPlanGuardian=addPlanGuardian;
window.removePlanGuardian=removePlanGuardian;
function yesNoCheckboxS(id,label,val,req=false,route=''){
  return yesNoRadioHTML(id,label,val,id,req,route);
}
// Milestone 51C: `setter` used to accept a second shape -- an inline assignment
// string like "D.trusts[0].hasTrust=this.value;navigate('/p8')" -- which this
// function reverse-engineered a path and a route out of with two regexes. Every
// call site passes a plain dot path and the route as the 4th argument, so both
// regexes (and the 5th `explicitRoute` parameter, which nothing ever passed)
// were unreachable and are gone. tests/unit/form-fields.spec.js fails if a new
// call site reintroduces the inline shape, which would otherwise yield an empty
// path and silently stop recording the filer's answer.
function yesNoCheckboxD(label,val,setter,reqOrRoute=false){
  const path=setter||'';
  const route=typeof reqOrRoute==='string'&&reqOrRoute.startsWith('/')?reqOrRoute:'';
  const req=typeof reqOrRoute==='boolean'?reqOrRoute:false;
  return yesNoRadioHTML(path||label,label,val,path,req,route);
}
function yesNoRadioAnnualHTML(id,label,val,path,req=false,tooltipKey=''){
  return yesNoRadioHTML(id,label,val,path,req,'','annual',tooltipKey);
}

// Inline radio group. Also used later for the Annual/Initial plans' 3-way
// ADL ratings ("no help" / "some assistance" / "cannot do at all"), which is
// why the options are a parameter rather than hardcoded Yes/No.
function radioP(id,label,val,options=['Yes','No'],req=false,hint=''){
  return window.renderRadioGroupField({ path: id, label, value: val, options, required: req, hint, id });
}

function pageNavS(prev,next){
  const targetRoute=next||'/print';
  const label=next?'Next →':'Preview & Export →';
  return `<div class="page-nav-wrap no-print">
    <div class="page-nav d-flex justify-content-between align-items-center">
      ${prev?`<button class="btn btn-outline-primary btn-sm" data-form-action="navigate" data-route="${esc(prev)}">← Back</button>`:'<span></span>'}
      <button id="page-next-btn" class="btn btn-primary btn-sm" data-form-action="navigate" data-route="${esc(targetRoute)}">${label}</button>
    </div>
    <div id="page-local-guidance"></div>
  </div>`;
}

function calcTotals(){
  const d=window.D;
  const n=v=>parseFloat(v)||0;
  const starting=n(d.startingBalance);
  const interest=n(d.interestIncome);
  const deposits=n(d.depositsSettlement);
  const totalIncome=interest+deposits;
  const serviceCharges=n(d.serviceCharges);
  const fedTax=n(d.federalIncomeTax);
  const totalDisbursements=serviceCharges+fedTax;
  const remaining=starting+totalIncome-totalDisbursements;
  return {starting,interest,deposits,totalIncome,serviceCharges,fedTax,totalDisbursements,remaining};
}

// Used by src/features/plan-simplified/print.js (via window.tdSig) --
// stays here rather than moving into that lazily-imported module. Despite
// an earlier comment's claim, Plan Annual's print builder never actually
// called this: it uses its own local y()/line()/fld()/boxes() helpers
// instead (confirmed by a fresh read while extracting it, Milestone 4).
function tdSig(label,val){return td(label,val);}


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

// Shared section wrapper, mirroring the Simplified Plan's q() helper.
function planQ(num,title,body,intro){
  return `<div class="plan-question">
    <div class="plan-question-num">Question ${num}</div>
    <h2 style="font-size:.95rem;font-weight:650;color:var(--ink);margin-bottom:.7rem;line-height:1.45;">${title}</h2>
    ${intro?`<div class="plan-field-hint" style="margin-bottom:.7rem;">${intro}</div>`:''}
    ${body}
  </div>`;
}
// "Check all that apply" group with an optional free-text explanation that
// only appears once a box requiring one is ticked.
function planCheckGroup(label,boxes,explainId,explainVal,explainWhen,hint){
  return `<div class="mb-3">
    <label class="form-label">${label}</label>
    ${hint?`<div class="plan-field-hint">${hint}</div>`:''}
    <div class="plan-check-grid">${boxes}</div>
    ${explainWhen?`<div class="plan-conditional mt-2">${txtP(explainId,'Explanation',explainVal,3)}</div>`:''}
  </div>`;
}

// pagePlanACover()..pagePlanASignatures() moved to
// src/features/plan-annual/index.js (Milestone 4, Phase A).

// Row add/remove/duplicate for the Plan's repeating tables. Generic over the
// array name so residences, providers and directives all share it.
function planEmptyRow(kind){
  if(kind==='residence')return emptyPlanResidence();
  if(kind==='provider')return emptyPlanProvider();
  if(kind==='directive')return emptyPlanDirective();
  if(kind==='initialProvider')return emptyInitialProvider();
  if(kind==='minorResidence')return emptyMinorResidence();
  if(kind==='minorProvider')return emptyMinorProvider();
  return {};
}
function addPlanRow(arrName,kind,route){
  window.D[arrName]=window.D[arrName]||[];
  window.D[arrName].push(planEmptyRow(kind));
  autoSave();navigate(route);
}
function removePlanRow(arrName,idx,route){
  const list=window.D[arrName];
  if(!list||!list[idx])return;
  list.splice(idx,1);
  autoSave();navigate(route);
}
function duplicatePlanRow(arrName,idx,route){
  const list=window.D[arrName];
  if(!list||!list[idx])return;
  list.splice(idx+1,0,JSON.parse(JSON.stringify(list[idx])));
  autoSave();navigate(route);
}

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

function sanitizeNegativeAmounts(){
  const amountFields=['fullAmount','wardPct','restrictedAmt','fullValue','carryingValue','wardPercent','wardB2','wardB3','fullAssetValue','fullDebtBalance','fullAssetAmount','wardValue','wardAmt','income','charge','tax','balance','price'];
  const cleanValue=v=>{const n=parseFloat(v);return isNaN(n)?v:Math.max(0,n)};
  if(window.D){
    if(Array.isArray(window.D.schD1)){window.D.schD1.forEach(r=>{amountFields.forEach(f=>{if(f in r)r[f]=cleanValue(r[f])});})}
    if(Array.isArray(window.D.schD2)){window.D.schD2.forEach(r=>{amountFields.forEach(f=>{if(f in r)r[f]=cleanValue(r[f])});})}
    if(Array.isArray(window.D.schD3)){window.D.schD3.forEach(r=>{amountFields.forEach(f=>{if(f in r)r[f]=cleanValue(r[f])});})}
    if(Array.isArray(window.D.schD4)){window.D.schD4.forEach(r=>{amountFields.forEach(f=>{if(f in r)r[f]=cleanValue(r[f])});})}
    ['startingBalance','interestIncome','depositsSettlement','serviceCharges','federalIncomeTax'].forEach(f=>{if(f in window.D)window.D[f]=cleanValue(window.D[f])});
    // Simplified's remuneration rows no longer have an amount field, but Annual's still do.
    if(Array.isArray(window.D.remuneration)){window.D.remuneration.forEach(r=>{if('amount' in r)r.amount=cleanValue(r.amount);})}
  }
}
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

function excelCapacityPanel(over){
  const rows=over.map(o=>`<div class="validation-group">
      <div class="validation-group-head">
        <span class="validation-group-name">${esc(o.label)}</span>
        <span class="validation-count">${o.count} of ${o.cap}</span>
        <button type="button" class="validation-go" data-form-action="navigate" data-route="${esc(o.route)}">Go to section ${ic('external',13)}</button>
      </div>
      <div class="validation-fields"><span class="validation-field">${o.count-o.cap} entr${o.count-o.cap===1?'y':'ies'} would be left out of the Excel file</span></div>
    </div>`).join('');
  return `<div class="validation-panel excel-cap-panel no-print">
    <div class="validation-head">
      ${ic('alert',17)}
      <div>
        <div class="validation-title">Too many entries for the Excel template</div>
        <div class="validation-sub">The court's Excel form has a fixed number of rows per schedule, and these have more entries than will fit. <strong>Save as PDF instead</strong> — the PDF includes every entry. To use Excel, reduce these schedules or file the extras on a continuation sheet.</div>
      </div>
    </div>
    ${rows}
  </div>`;
}


// pagePrintAnnual()/doSavePdfAnnual() moved to
// src/features/annual-accounting/print.js (Milestone 7, Phase B).



// doSaveExcelAnnual()/importExcelAnnual() moved to
// src/features/annual-accounting/excel.js (Milestone 7, Phase B).


// ═══════════════════════════════════════════════════════
// WIZARD: GUARDIAN INVENTORY - FULL IMPLEMENTATION
// ═══════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════
// DATA MODEL
// ═══════════════════════════════════════════════════════
const mk = {
  guardian:()=>({name:'',ssnEin:'',phone:'',streetAddress:'',cityStateZip:'',signatureDate:null,signatureState:'',signatureImage:''}),
  preparer:()=>({name:'',ssnEin:'',phone:'',streetAddress:'',cityStateZip:'',signatureDate:null,signatureState:'',signatureImage:''}),
  attorney:()=>({name:'',barNumber:'',phone:'',streetAddress:'',cityStateZip:'',signatureDate:null,filingDate:null,signatureState:'',signatureImage:''}),
  recipient:()=>({name:'',address:'',cityStateZip:''}),
  a1:()=>({propertyDescription:'',streetAddress:'',cityStateZip:'',notes:'',residence:'',income:'',fullAssetValue:0,wardPercent:100}),
  a2:()=>({lenderName:'',lenderAddress:'',lenderCityStateZip:'',accountNumber:'',notes:'',liabilityType:'Mortgage',fullDebtBalance:0,wardPercent:100}),
  b1:()=>({institutionName:'',restricted:'',accountType:'',accountNumber:'',streetAddress:'',cityStateZip:'',fullAssetAmount:0,wardPercent:100}),
  // Milestone 60K: no stored amountInSDB -- the workbook derives it from the
  // Yes/No answer and the ward share, and so does guardian-inventory/totals.js.
  b2:()=>({description:'',streetAddress:'',cityStateZip:'',valuationMethod:'',fullAssetValue:0,wardPercent:100,inSafeDepositBox:'',isVehicle:false,vehicleYear:'',vehicleMake:'',vehicleModel:'',vehicleVin:'',odometerMileage:''}),
  b3:()=>({description:'',streetAddress:'',cityStateZip:'',restricted:'',fullAssetValue:0,wardPercent:100,inSafeDepositBox:''}),
  b4:()=>({lenderName:'',relatedProperty:'',accountNumber:'',lenderAddress:'',liabilityType:'Loan',fullLiabilityBalance:0,wardPercent:100}),
  c1:()=>({payerName:'',payerAddress:'',payerCityStateZip:'',typeOfIncome:'',frequencyOfPayment:'Monthly',paymentBasis:'',annualIncomeAmount:0,wardPercent:100}),
  c2:()=>({claimantName:'',lawsuitDescription:'',courtJurisdiction:'',caseNumber:'',claimantAddress:'',claimantCityStateZip:'',dateFiled:null,amountOfClaim:0,wardPercent:100}),
  c3:()=>({defendantName:'',actionDescription:'',status:'',courtJurisdiction:'',caseNumber:'',actionDate:null,estimatedSettlement:0,wardPercent:100}),
  c4:()=>({trustName:'',trusteeName:'',trusteeAddress:'',trusteeCityStateZip:'',dateCreated:null,accountNumber:'',trustType:'Pooled',trustAmount:0,wardPercent:100}),
  c5:()=>({assetDescription:'',ownerName:'',ownerAddress:'',ownerCityStateZip:'',relationshipToWard:'',totalAssetValue:0,jointOwnerPercent:50}),
};
window.mk=mk;

// Financial line-item schedules covered by pruneBlankCards() (see
// navigate()), keyed by their property on D, each mapped to the exact blank
// object its own +Add button pushes. These need a deep compare against that
// template rather than a generic emptiness test, because several of their
// fields default to something other than '' -- Guardian's wardPercent
// starts at 100, Annual's Yes/No fields start at 'No' -- and a generic test
// would never recognize those as untouched. Party and plan cards, whose
// fields are all seeded empty, use BLANK_CARD_COLLECTIONS below instead.
const BLANK_SCHEDULE_ENTRY = {
  // Guardian form (Initial Inventory) -- same factory addEntry() already uses.
  scheduleA1:mk.a1, scheduleA2:mk.a2, scheduleB1:mk.b1, scheduleB2:mk.b2, scheduleB3:mk.b3,
  scheduleB4:mk.b4, scheduleC1:mk.c1, scheduleC2:mk.c2, scheduleC3:mk.c3, scheduleC4:mk.c4, scheduleC5:mk.c5,
  // Annual Accounting -- copied verbatim from each schedule's own +Add button.
  schA:()=>({payer:'',description:'',bank:'',accountNo:'',amount:''}),
  schB1:()=>({bankAcct:'',checkNo:'',periodFrom:'',periodTo:'',datePaid:'',payee:'',courtOrderDate:'',amount:''}),
  schB2:()=>({bankAcct:'',checkNo:'',periodFrom:'',periodTo:'',datePaid:'',payee:'',courtOrderDate:'',amount:''}),
  schB3:()=>({bankAcct:'',checkNo:'',datePaid:'',payee:'',courtOrderDate:'',amount:''}),
  schB4:()=>({bankAccountId:'',checkNo:'',datePaid:'',category:'',payee:'',amount:''}),
  schC:()=>({description:'',date:'',gain:'',loss:''}),
  schD1:()=>({description:'',accountNo:'',restricted:'',type:'',fullAmount:'',wardPct:'',restrictedAmt:''}),
  schD2:()=>({description:'',residence:'',income:'',fullValue:'',wardPct:'',carryingValue:'',wardValue:''}),
  schD3:()=>({description:'',fullAmount:'',wardPct:'',carryingValue:'',wardAmount:''}),
  schD4:()=>({description:'',restricted:'',fullAmount:'',wardPct:'',carryingValue:'',wardValue:'',restrictedAmt:''}),
  schD5:()=>({description:'',loanNo:'',loanType:'',fullDebt:'',wardPct:'',wardBalance:''}),
  schE:()=>({bankName:'',transferInDate:'',transferInAmt:'',transferOutDate:'',transferOutAmt:''}),
  schF1:()=>({description:'',bank:'',accountNo:'',courtOrderDate:'',salePrice:''}),
  schF2:()=>({description:'',bank:'',accountNo:'',courtOrderDate:'',salePrice:''}),
};

// The other card family: party cards (guardians, certificate-of-service
// recipients, witnesses) and the Plan forms' repeatable rows. Unlike the
// schedules above these seed every field to '' or null, so blankness is a
// generic emptiness test -- listing their fields here would just create one
// more registry to drift out of sync with the form, which is the failure
// mode this whole area keeps hitting.
//
// Many of these are seeded in bulk at filing creation rather than by an
// +Add button: an Annual Accounting starts life with three blank guardian
// cards and four blank cert-of-service recipients, which is why a filing
// nobody has touched shows a wall of empty "Co-Guardian" cards.
//
// `min` is the floor a group may not prune below, so the user always has a
// card to type into. `types` lists the form engines the group is pruned on
// -- a group is listed for a type ONLY once that form has a real +Add
// affordance for it, because pruning cards the user has no way to recreate
// would lock them out of the form entirely.
//
// Milestone 37-4 note: this const and pruneBlankCards() below are shadowed
// at runtime by src/core/form/prune-cards.js, which does `window.
// BLANK_CARD_COLLECTIONS = ...` / `window.pruneBlankCards = ...` on module
// load -- a classic-script function declaration IS a window property (see
// this file's other such comments), so the later module-script assignment
// wins and every bare `pruneBlankCards()` call in this file actually runs
// that module's version. Edit core/form/prune-cards.js's copy, not this one.
const BLANK_CARD_COLLECTIONS = {
  guardians:{min:1,types:['guardian','annual','simplified']},
  serviceRecipients:{min:1,types:['guardian']},
  witnesses:{min:0,types:['guardian']},
  certRecipients:{min:1,types:['annual','simplified']},
  remuneration:{min:0,types:['annual','simplified']},
  // Plan-family repeatable rows, each already served by +Add/Remove.
  q1Residences:{min:0,types:['planAnnual']},
  q4Providers:{min:0,types:['planAnnual']},
  q10Directives:{min:0,types:['planAnnual']},
  q9Providers:{min:0,types:['planInitial']},
  q2Residences:{min:0,types:['planMinor']},
  q3Providers:{min:0,types:['planMinor']},
};




// ═══════════════════════════════════════════════════════
// CALCULATIONS
// ═══════════════════════════════════════════════════════
// Milestone 60A: the Guardian Inventory arithmetic lives in
// src/features/guardian-inventory/totals.js (eagerly imported by
// features-loader.js, like Annual's calcTotalsAnnual). This object keeps the
// classic-script call shape the live UI uses -- calc.totalA1(),
// calc.wardVal(entry), ... -- and forwards every call to the module bound to
// the CURRENT window.D, so the sidebar, the calculated fields, the summary
// page and the court-filed PDF all read one implementation. The formulas
// that used to sit here rounded every row before summing, which the court
// workbook does not do; see totals.js's header for the rounding contract.
//
// Method list is fixed by name rather than proxied so a typo at a call site
// still throws "calc.foo is not a function" instead of returning a function
// that silently computes nothing.
const GUARDIAN_CALC_METHODS=['wardVal','wardDebt','wardAmt','wardB2','wardB3','wardB4','wardC1','wardC2','wardC3','wardC4','wardC5','sdbB2','sdbB3',
  'totalA1','totalA2','netA','totalB1','totalB2','totalB3','totalB4','netB','total','totalC1','totalC2','totalC3','totalC4','totalC5','totalSdbB2','totalSdbB3',
  'restrictedCash','unrestrictedCash','restrictedIntang','unrestrictedIntang','bondRequired','auditFee'];
const calc={};
for(const name of GUARDIAN_CALC_METHODS){
  calc[name]=(...args)=>{
    // Not optional-chained on purpose: a missing bridge here would print
    // $0.00 everywhere and should fail loudly instead.
    if(typeof window.makeGuardianCalc!=='function')throw new Error('Guardian calculator not loaded -- features-loader.js must import guardian-inventory/totals.js');
    return window.makeGuardianCalc(()=>D)[name](...args);
  };
}
window.calc=calc;

function normalizeWardData(d){
  if(!d||typeof d!=='object'||Object.keys(d).length===0)return d;
  // Milestone 57C-R: give every loaded ward a well-formed scheduleDocsAck.
  // A .sav written before 57C-R has none at all; an unexpected shape must not
  // read as "already acknowledged", since that would silently retire a prompt
  // the filer never saw.
  try{ window.normalizeScheduleDocsAck?.(d); }catch(e){}
  // Milestone 58D: reconcile Part XI's two ways of saying "nothing to report".
  //
  // A .sav written before 58D carries the seeded blank placeholder row, which
  // hides the no-items declaration behind deleting it. Normalising an array
  // whose rows are ALL blank to [] exposes that control without touching a
  // filing that has real entries. Nothing is ever deleted here: a row with any
  // content survives untouched.
  //
  // And if a stale `no items` flag sits beside real rows -- ticked, then rows
  // added later by another path -- the rows win and the flag is cleared. The
  // entered data is the stronger statement of intent, and leaving both set
  // would file a declaration contradicting the schedule printed beside it.
  try{
    if(Array.isArray(d.remuneration)){
      const populated=d.remuneration.filter(r=>r&&(r.guardian||r.type||r.amount||r.description));
      if(populated.length===0&&d.remuneration.length>0)d.remuneration=[];
      if(populated.length>0&&d.scheduleNoItems&&d.scheduleNoItems.remuneration)d.scheduleNoItems.remuneration=false;
    }
  }catch(e){}
  const migrateBoolean=(obj,field,legacyField=null)=>{
    if(!obj||typeof obj!=='object')return;
    const current=obj[field];
    if(current===true)obj[field]='Yes';
    else if(current===false)obj[field]='No';
    else if(current==null||current===''){
      if(legacyField&&obj[legacyField]===true)obj[field]='Yes';
      else if(legacyField&&obj[legacyField]===false)obj[field]='No';
      else obj[field]='';
    }
    if(legacyField)delete obj[legacyField];
  };
  (d.scheduleA1||[]).forEach(r=>{
    migrateBoolean(r,'residence','isPersonalResidence');
    migrateBoolean(r,'income','isIncomeProperty');
  });
  (d.scheduleB1||[]).forEach(r=>migrateBoolean(r,'restricted','isRestricted'));
  // Milestone 60K: a .sav written before 60K carries amountInSDB on B-2/B-3
  // rows -- a stored copy of a figure the workbook derives, always 0 from the
  // importer and never maintained by the UI. Drop it so nothing can ever read
  // a stale value; the PDF and totals derive it from inSafeDepositBox.
  (d.scheduleB2||[]).forEach(r=>{migrateBoolean(r,'inSafeDepositBox');if(r&&typeof r==='object')delete r.amountInSDB;});
  (d.scheduleB3||[]).forEach(r=>{
    migrateBoolean(r,'restricted','isRestricted');
    migrateBoolean(r,'inSafeDepositBox');
    if(r&&typeof r==='object')delete r.amountInSDB;
  });
  migrateBoolean(d,'hasSafeDepositBox');
  migrateBoolean(d,'safeDepositBoxFiled');
  migrateBoolean(d,'amendedForm','isAmended');
  if(d.benefits&&typeof d.benefits==='object'){
    Object.keys(d.benefits).forEach(k=>{
      const b=d.benefits[k];
      if(b&&typeof b==='object'){
        migrateBoolean(b,'eligible');
        migrateBoolean(b,'appliedFor');
      }
    });
  }
  const q7Keys=['q7SocialSecurity','q7Ssdi','q7Hmo','q7Ssi','q7StateSupplement','q7InstitutionalCare','q7SupplementalIns','q7Pension','q7Medicare','q7Medicaid','q7Va','q7Trusts','q7PendingBenefits'];
  q7Keys.forEach(k=>migrateBoolean(d,k));
  return d;
}
window.normalizeWardData=normalizeWardData;

// ═══════════════════════════════════════════════════════
// Page navigation helper moved to src/features/guardian-inventory/index.js
// (Milestone 8, Phase A), but legacy validation-derived nav checks still
// use this shared schedule key list synchronously.
const SCHEDULE_NAV_KEYS=['a1','a2','b1','b2','b3','b4','c1','c2','c3','c4','c5'];
window.SCHEDULE_NAV_KEYS=SCHEDULE_NAV_KEYS;
// A schedule's own "Next" button is disabled until computeNavChecks()
// says that schedule is complete (a real row, or the "no items" checkbox).
// afterChange() stays legacy in Milestone 8A and still needs this helper.
// ═══════════════════════════════════════════════════════
// FORM BINDING ENGINE
// ═══════════════════════════════════════════════════════
function toggleSsnReveal(btn){
  const input=btn.previousElementSibling;
  const revealing=input.dataset.revealed!=='true';
  input.dataset.revealed=String(revealing);
  input.classList.toggle('ssn-revealed',revealing);
  btn.setAttribute('aria-label',revealing?'Hide SSN/EIN':'Show SSN/EIN');
  btn.innerHTML=ic(revealing?'unlock':'lock',14);
}
function getPath(obj,path){
  return path.split('.').reduce((o,k)=>o==null?undefined:o[k],obj);
}
function setPath(obj,path,val){
  const keys=path.split('.');
  let cur=obj;
  for(let i=0;i<keys.length-1;i++){
    if(cur[keys[i]]==null)cur[keys[i]]={};
    cur=cur[keys[i]];
  }
  cur[keys[keys.length-1]]=val;
}

function bindForms(){
  document.querySelectorAll('[data-bind]:not([data-bound])').forEach(el=>{
    el.setAttribute('data-bound','1');
    const path=el.dataset.bind;
    const cur=getPath(window.D,path);
    // Captured so a blur firing after a ward switch (see the caseNumber and
    // name/address blur listeners below) can tell its window.D has moved on
    // to a different ward entirely, not just been edited in place.
    const boundD=window.D;

    if(el.type==='checkbox'){
      el.checked=!!cur;
      el.addEventListener('change',e=>{setPath(window.D,path,e.target.checked);afterChange(path);});
    } else if(el.type==='date'){
      if(cur){
        const s=typeof cur==='string'?cur:new Date(cur).toISOString();
        el.value=s.substring(0,10);
      }
      el.addEventListener('change',e=>{setPath(window.D,path,e.target.value||null);afterChange(path);});
    } else if(el.type==='number'){
      el.value=Math.max(0,parseFloat(cur)||0);
      el.addEventListener('keydown',e=>{if(e.key==='-'||e.key==='Subtract'){e.preventDefault();}});
      el.addEventListener('input',e=>{
        e.target.value=e.target.value.replace(/-/g,'');
        const v=Math.max(0,parseFloat(e.target.value)||0);
        setPath(window.D,path,v);afterChange(path);
      });
    } else if(el.tagName==='SELECT'){
      el.value=cur!=null?String(cur):'';
      el.addEventListener('change',e=>{
        let v=e.target.value;
        if(v==='true')v=true; else if(v==='false')v=false;
        setPath(window.D,path,v);afterChange(path);
      });
    } else {
      const inputType=el.dataset.inputType||'text';
      if(inputType==='date'||el.dataset.fieldKind==='date'){
        el.value=window.getFieldDraftDisplay?.(path,formatDisplayDate(cur||''))||formatDisplayDate(cur||'');
      }else if(inputType==='phone'){
        el.value=formatPhone(cur||'');
      }else if(inputType==='name'){
        el.value=formatName(cur||'');
      }else if(inputType==='address'){
        el.value=formatAddress(cur||'');
      }else if(inputType==='ssn'){
        el.value=formatSSN(cur||'');
      }else if(inputType==='caseNumber'){
        el.value=formatCaseNumber(cur||'');
      }else if(inputType==='barNumber'){
        el.value=formatBarNumber(cur||'');
      }else if(inputType==='accountNumber'){
        el.value=formatAccountNumber(cur||'');
      }else if(inputType==='checkNumber'){
        el.value=formatCheckNumber(cur||'');
      }else if(inputType==='zip'){
        el.value=formatCityStateZip(cur||'');
      }else if(inputType==='decimal'){
        el.value=sanitizeNonNegativeDecimal(cur||'');
      }else{
        el.value=cur||'';
      }
      el.addEventListener('input',e=>{
        if(el.dataset.fieldKind==='date'||inputType==='date'){
          // Date formatting is handled by form-events.js (writeDraftValue on input / finalizeFieldValue on blur).
          // Do not write raw unparsed text here to avoid non-canonical values in window.D.
          return;
        }
        let val=e.target.value;
        if(inputType==='decimal'){
          val=sanitizeNonNegativeDecimal(val);
          e.target.value=val;
          setPath(window.D,path,parseFloat(val)||0);
          afterChange(path);
          return;
        }else if(inputType==='phone'){
          val=formatPhone(val);
          e.target.value=val;
        }else if(inputType==='ssn'){
          val=formatSSN(val);
          e.target.value=val;
        }else if(inputType==='caseNumber'){
          val=formatCaseNumber(val);
          e.target.value=val;
        }else if(inputType==='barNumber'){
          // Padding while a person is still typing would turn the first digit
          // into 0000000N and make the next digit land in the wrong place.
          // Keep only digits live; apply the fixed-width representation on blur.
          val=String(val??'').replace(/\D/g,'').slice(0,8);
          e.target.value=val;
        }else if(inputType==='accountNumber'){
          val=formatAccountNumber(val);
          e.target.value=val;
        }else if(inputType==='checkNumber'){
          val=formatCheckNumber(val);
          e.target.value=val;
        }else if(inputType==='zip'){
          // Digit-count limiting stays live (same as maxlength), but title
          // casing is finalize-only -- see the name/address blur listener
          // below for why: formatCityStateZip() has the same bare-2-letter-
          // word-reads-as-a-state-abbreviation defect as formatSafeTitleCase,
          // so typing "ph" toward "Philadelphia" would get force-uppercased
          // to "PH" before the city name is even finished.
          applyZipLimit(e.target);
          val=e.target.value;
        }else if(inputType==='county'){
          filterCountyDropdown(e.target);
        }
        // Prevent negative values in number inputs
        if(el.type==='number'){
          val=val.replace(/^-/,'');
          e.target.value=val;
        }
        setPath(window.D,path,val);afterChange(path);
      });
      // Case Number only fully resolves to YY-######-GD (padded sequence,
      // fixed GD suffix) on blur -- see finalizeCaseNumber()'s own comment
      // for why that can't happen on every keystroke like the other
      // inputType formatters above do.
      if(inputType==='caseNumber'){
        el.addEventListener('blur',()=>{
          // A ward switch (see switchWard()) reassigns window.D to a
          // different ward's object -- synchronously, well before that
          // ward's page actually finishes mounting -- so a blur that fires
          // late (mount is async; nothing here awaits it) can land after
          // window.D has already moved on. isConnected can't catch this: the
          // old page can still be sitting in the DOM at that moment. Compare
          // against the exact object this listener was bound to instead. The
          // raw value was already saved to the correct ward by the 'input'
          // listener above; skipping the format-only step below when the
          // ward has moved on costs nothing since re-mounting it re-binds
          // this field fresh from its own (already-correct) stored value.
          if(window.D!==boundD)return;
          el.value=finalizeCaseNumber(el.value);
          setPath(window.D,path,el.value);afterChange(path);
        });
      }
      if(inputType==='barNumber'){
        el.addEventListener('blur',()=>{
          if(window.D!==boundD)return;
          el.value=formatBarNumber(el.value);
          setPath(window.D,path,el.value);afterChange(path);
        });
      }
      // Name/address formatting is finalize-only, same reasoning as modal-events.js's
      // handleModalBlur: formatName()/formatAddress() title-case a complete value and
      // trim it, which reads a live "ga" mid-word as the state abbreviation "GA" and
      // eats a just-typed trailing space. Fields that also carry data-field-path
      // already get this once on blur from form-events.js's finalizeFieldValue; this
      // covers the few remaining data-bind-only fields (schedule description cells).
      if((inputType==='name'||inputType==='address')&&!el.dataset.fieldPath){
        el.addEventListener('blur',()=>{
          // See the caseNumber blur listener just above for why this checks
          // object identity rather than el.isConnected.
          if(window.D!==boundD)return;
          el.value=inputType==='name'?formatName(el.value):formatAddress(el.value);
          setPath(window.D,path,el.value);afterChange(path);
        });
      }
    }
  });
}

// Splits cleanly in two: computeNavChecks() is pure (reads window.D, returns
// the per-section completion map) and updateNavDots() applies it to the DOM.
// The split exists so the dashboard can compute a ward's filing progress
// WITHOUT that ward being the active one — see getWardProgress().
function computeNavChecks(){
    // Milestone 57B: the same rule the validators use, reached through the
    // bridge rather than restated here. A second reading of the same data is
    // exactly how Milestone 57's Simplified signature gap and 58C's attorney
    // predicate drifted from their validators.
    const recipientsSettled=(rows,attestation)=>{
      if(typeof window.serviceRecipientIssues!=='function')return filled(rows?.[0]?.name);
      const rec=window.serviceRecipientIssues({
        rows,attestation,
        startedFields:['name','line2','line3','line4'],
        missingFields:(r)=>((r.name||'').trim()?[]:['Name']),
      });
      return !rec.needsAttestation&&rec.firstRowMissing.length===0&&rec.extraRows.length===0;
    };
  // Milestone 55B: mirrors checkDateOrder()'s own tolerance (src/core/
  // validation/date-rules.js) -- a blank date on either side is the
  // presence check's problem, not this one's, so it reports "in order"
  // rather than manufacturing a second, redundant failure. That
  // blank-tolerance is also what makes it safe to attach to a key that
  // does not otherwise track the specific date's presence at all (see the
  // "Borrowed" sites below): a role with no data yet never flips this false.
  const datesOrdered=(earlier,later,allowSameDay=true)=>
    !earlier||!later||(allowSameDay?later>=earlier:later>earlier);
  if(activeInventoryType==='guardian'){
    // Milestone 40H-A: window.validateGuardian is assigned only once the
    // Guardian Inventory feature bundle lazy-loads, so this branch can run
    // before it exists -- on the very first dashboard paint of a session
    // with a guardian-type ward and no prior guardian-feature navigation.
    // validate() used to call window.validateGuardian() unguarded, throwing
    // a TypeError getWardProgress()'s try/catch silently swallowed into a
    // console.warn on every such render. Returning null here (rather than
    // an empty error array) matters: an empty array would leave every
    // trackedKeys entry at its initialized `true`, reporting 100% complete
    // to a ward nothing has actually validated -- a false "Ready to file"
    // reading, worse than the crash it would replace. null propagates
    // through getWardProgress() exactly like the old caught exception did,
    // so the dashboard's displayed progress keeps meaning "actually
    // computed," never a fabricated pass.
    if(typeof window.validateGuardian!=='function')return null;
    // Single source of truth: every section's ✓/− here comes from the SAME
    // errors validate() produces and Print Preview's export gate checks --
    // not a second, separately-maintained set of looser rules. That older
    // approach let a schedule row with e.g. $0 for a required dollar amount,
    // or a D-2/D-4/D-5 page with only some of its required fields filled,
    // show a green ✓ in the sidebar while validate() still listed it as
    // missing on Print Preview, with no way to know the two disagreed until
    // export was blocked there. errorRoute() already turns each error's
    // "<Section> — <field>" prefix into a route ("A-1 row 2"->"/a1", "D-2
    // Preparer"->"/d2", "Cover"->"/") for the validation panel's own "Go to
    // section" links -- reused here to bucket every error onto the same key
    // the sidebar and Next-button gating use, so the two can't drift apart.
    const trackedKeys=['cover',...SCHEDULE_NAV_KEYS,'d1','d2','d3','d4','d5'];
    const checks={};
    trackedKeys.forEach(k=>checks[k]=true);
    validate().forEach(e=>{
      // Milestone 42F: issues are objects with .message (and a toString()
      // that returns it); read the message explicitly rather than rely on it.
      const str=e&&typeof e==='object'?String(e.message??e):String(e);
      const i=str.indexOf(' — ');
      const section=i>-1?str.slice(0,i).trim():'';
      const route=errorRoute(section);
      const key=route==='/'?'cover':route?route.slice(1):null;
      if(key&&key in checks)checks[key]=false;
    });
    return {checks,incomplete:{}};
  } else if(activeInventoryType==='simplified'){
    const filled=v=>v!==''&&v!==null&&v!==undefined;
    const hasAny=(...vals)=>vals.some(v=>filled(v));
    const rowHasAnyData=r=>Object.entries(r||{}).some(([key,v])=>key!=='id'&&v!==''&&v!=null);
    const guardianComplete=g=>filled(g.name)&&filled(g.signatureDate)&&filled(g.ssn)&&filled(g.phone)&&filled(g.email)&&filled(g.mailingStreet)&&filled(g.mailingCityStateZip)&&filled(g.residenceStreet)&&filled(g.residenceCityStateZip);
    // Milestone 57, Simplified parity gap. The same rule validateSimplified()
    // applies, not a second reading of it: a boolean reimplementation of the
    // signature states is how the sidebar and the export gate drifted apart
    // here in the first place. Neither call passes a name, matching the
    // validator -- the attorney's printed name is required at Cover, and
    // duplicating it here would report the same blank field twice.
    //
    // A missing bridge resolves to INCOMPLETE, never complete. The same
    // reasoning as the guardian branch's `return null` above: a fabricated
    // pass would tell a filer they are ready to file when nothing has
    // actually been checked, which is worse than a section that reads red.
    const sigComplete=(state,date,image)=>typeof window.isSignatureComplete==='function'
      &&window.isSignatureComplete({state,date,image});
    const checks={
      's-cover':D.eligDepository==='Yes'&&D.eligOnlyTransactions==='Yes'&&filled(D.wardName)&&filled(D.caseNumber)&&filled(D.ssn)&&filled(D.gid)&&filled(D.periodFrom)&&filled(D.periodTo)&&filled(D.guardian)&&filled(D.attorney)&&filled(D.typeOfGuardianship)&&filled(D.county)&&filled(D.amendedForm)
        &&datesOrdered(D.periodFrom,D.periodTo,false)&&datesOrdered(D.gid,D.periodFrom,true),
      's-p2':filled(D.startingBalance)&&filled(D.interestIncome)&&filled(D.depositsSettlement)&&filled(D.serviceCharges)&&filled(D.federalIncomeTax),
      's-p3':filled(D.periodFrom)&&filled(D.periodTo)
        &&datesOrdered(D.periodFrom,D.periodTo,false)&&datesOrdered(D.gid,D.periodFrom,true),
      's-p4':guardianComplete(D.guardians[0]||{})&&D.guardians.every((g,i)=>i===0||!guardianHasAnyData(g)||guardianComplete(g))
        &&D.guardians.every(g=>datesOrdered(D.periodTo,g.signatureDate,true)),
      's-p5':filled(D.attorney_barNumber)&&filled(D.attorney_phone)&&filled(D.attorney_email)&&filled(D.attorney_street)&&filled(D.attorney_cityStateZip)
        &&datesOrdered(D.periodTo,D.attorney_signatureDate,true)
        &&sigComplete(D.attorney_signatureState,D.attorney_signatureDate,D.attorney_signatureImage),
      's-p6':filled(D.certServiceDate)&&filled(D.certIndicator)&&recipientsSettled(D.certRecipients,D.certNoRecipients)
        &&datesOrdered(D.periodTo,D.certServiceDate,true)
        &&sigComplete(D.certAttySignatureState,D.certAttySignDate,D.certAttySignatureImage),
      // Milestone 60J: Part VII is complete when every populated row is
      // complete AND the part has been answered -- entries, or the "none to
      // report" declaration. Matches Annual's 'a-p11' and validateSimplified().
      's-p7':(!!(D.scheduleNoItems&&D.scheduleNoItems.remuneration)||(D.remuneration||[]).some(r=>hasAny(r.guardian,r.type,r.amount,r.description)))
        &&(D.remuneration||[]).every(r=>!rowHasAnyData(r)||(filled(r.guardian)&&filled(r.type))),
    };
    const incomplete={
      's-cover':!checks['s-cover']&&hasAny(D.wardName,D.caseNumber,D.ssn,D.gid,D.periodFrom,D.periodTo,D.guardian,D.attorney,D.typeOfGuardianship,D.county),
      's-p2':!checks['s-p2']&&hasAny(D.startingBalance,D.interestIncome,D.depositsSettlement,D.serviceCharges,D.federalIncomeTax),
      's-p3':!checks['s-p3']&&hasAny(D.periodFrom,D.periodTo),
      's-p4':!checks['s-p4']&&(D.guardians.length>0||guardianHasAnyData(D.guardians[0]||{})),
      's-p5':!checks['s-p5']&&hasAny(D.attorney_barNumber,D.attorney_phone,D.attorney_street,D.attorney_cityStateZip),
      's-p6':!checks['s-p6']&&hasAny(D.certServiceDate,D.certIndicator,D.certRecipients?.[0]?.name),
      's-p7':!checks['s-p7']&&D.remuneration.some(r=>hasAny(r.guardian,r.type)),
    };
    return {checks,incomplete};
  } else if(formEngine(activeInventoryType)==='annual'){
    const filled=v=>v!==''&&v!==null&&v!==undefined;
    const hasAny=(...vals)=>vals.some(v=>filled(v));
    const guardianComplete=g=>filled(g.name)&&filled(g.signatureDate)&&filled(g.ssn)&&filled(g.phone)&&filled(g.mailingStreet)&&filled(g.mailingCityStateZip);
    const rowHasAnyData=r=>Object.entries(r||{}).some(([key,v])=>key!=='id'&&v!==''&&v!=null);
    // "I verify there are no X to report" (scheduleEmptyHTMLAnnual()) is an
    // affirmative answer, not a blank -- an empty schedule the guardian has
    // explicitly confirmed is complete, exactly as it already is for
    // Guardian Inventory (whose validate() skips its empty-schedule error
    // for a confirmed key). Without this, checking the box wrote state
    // nothing read: the section could never go green and the filing could
    // never reach 100%, with no way for the user to tell why.
    const verifiedEmpty=k=>!!(D.scheduleNoItems&&D.scheduleNoItems[k]);
    const rowsComplete=(rows,fields,noItemsKey)=>verifiedEmpty(noItemsKey)||((rows||[]).length>0&&(rows||[]).every(r=>rowHasAnyData(r)&&fields.every(f=>filled(r[f]))));
    const rowsStarted=(rows,fields)=>(rows||[]).some(r=>rowHasAnyData(r));
    const t=calcTotalsAnnual();
    const checks={
      'a-p1':filled(D.wardName)&&filled(D.caseNumber)&&filled(D.periodFrom)&&filled(D.periodTo)&&filled(D.gid)&&filled(D.guardian)&&filled(D.county)&&filled(D.filingType)
        &&datesOrdered(D.periodFrom,D.periodTo,false)&&datesOrdered(D.gid,D.periodFrom,true),
      'a-p2':filled(D.startingBalance),
      'a-p3':guardianComplete(D.guardians[0]||{})&&D.guardians.every((g,i)=>i===0||!guardianHasAnyData(g)||guardianComplete(g))
        &&D.guardians.every(g=>datesOrdered(D.periodTo,g.signatureDate,true)),
      'a-p4':filled(D.preparer.name)&&filled(D.preparer.signatureDate)&&filled(D.preparer.ssn)&&filled(D.preparer.phone)&&filled(D.preparer.street)&&filled(D.preparer.cityStateZip)
        &&datesOrdered(D.periodTo,D.preparer.signatureDate,true),
      'a-p5':filled(D.attorney_bar)&&filled(D.attorney_phone)&&filled(D.attorney_email)&&filled(D.attorney_street)&&filled(D.attorney_cityStateZip)&&filled(D.attorney_signatureDate)
        &&datesOrdered(D.periodTo,D.attorney_signatureDate,true),
      // Complete when the two lines agree, or the difference is explained.
      'a-p67':(()=>{const r=annualReconcileState(t);return !r.outOfBalance||r.explained;})(),
      // Part VIII is satisfied either by naming a trust or by certifying there
      // are none, matching the verifiedEmpty pattern the other Annual checks use.
      'a-p8':verifiedEmpty('a-p8')||verifiedEmpty('p8')||(D.trusts||[]).some(t=>t.name),
      // Milestone 57A: the restricted-depository question counts toward Part
      // IX being complete, so the sidebar and the export validator agree on
      // what this page still owes. tests/unit/checklist-export-parity.spec.js
      // fails if they drift -- which is the discipline the reverted attempt
      // broke. Answered means Yes or No; a legacy filing with a receipt date
      // and no answer reads as Yes (core/validation/dependent-question.js).
      'a-p9':filled(D.bondAmount)&&filled(D.bondingCompany)
        &&(D.restrictedDepository==='Yes'||D.restrictedDepository==='No'||filled(D.restrictedDepositoryReceiptDate))
        &&(D.restrictedDepository==='No'||filled(D.restrictedDepositoryReceiptDate)),
      'a-p10':filled(D.certDate)&&recipientsSettled(D.certRecipients,D.certNoRecipients)
        &&datesOrdered(D.periodTo,D.certDate,true),
      // Milestone 58D: Part XI is complete once it is ANSWERED -- either the
      // no-items declaration is ticked, or there is at least one populated row
      // and every populated row is complete. Previously an untouched Part XI
      // counted as complete, so the sidebar reported a filing ready that the
      // statute says is missing its remuneration declaration. Matches
      // validateAnnual()'s rule exactly; both changed together.
      'a-p11':verifiedEmpty('remuneration')
        ||((D.remuneration||[]).some(r=>rowHasAnyData(r))
           &&(D.remuneration||[]).every(r=>!rowHasAnyData(r)||(filled(r.guardian)&&filled(r.type)&&filled(r.amount)))),
      'a-scha':rowsComplete(D.schA,['payer','description','bank','accountNo','amount'],'scha'),
      'a-schb1':rowsComplete(D.schB1,['bankAcct','checkNo','datePaid','payee','amount'],'schb1'),
      'a-schb2':rowsComplete(D.schB2,['bankAcct','checkNo','datePaid','payee','amount'],'schb2'),
      'a-schb3':rowsComplete(D.schB3,['bankAcct','checkNo','datePaid','payee','amount'],'schb3'),
      'a-schb4':rowsComplete(D.schB4,['checkNo','datePaid','category','payee','amount'],'schb4'),
      'a-schc':verifiedEmpty('schc')||((D.schC||[]).length>0&&(D.schC||[]).every(r=>rowHasAnyData(r)&&filled(r.description)&&filled(r.date)&&(filled(r.gain)||filled(r.loss)))),
      'a-schd1':rowsComplete(D.schD1,['description','accountNo','restricted','type','fullAmount','wardPct'],'schd1'),
      'a-schd2':rowsComplete(D.schD2,['description','residence','income','fullValue','wardPct','carryingValue'],'schd2'),
      'a-schd3':rowsComplete(D.schD3,['description','fullAmount','wardPct','carryingValue'],'schd3'),
      'a-schd4':rowsComplete(D.schD4,['description','restricted','fullAmount','wardPct','carryingValue'],'schd4'),
      'a-schd5':rowsComplete(D.schD5,['description','loanNo','loanType','fullDebt','wardPct'],'schd5'),
      'a-sche':verifiedEmpty('sche')||((D.schE||[]).length>0&&(D.schE||[]).every(r=>rowHasAnyData(r)&&filled(r.bankName)&&((filled(r.transferInDate)&&filled(r.transferInAmt))||(filled(r.transferOutDate)&&filled(r.transferOutAmt))))),
      'a-schf1':rowsComplete(D.schF1,['description','bank','accountNo','courtOrderDate','salePrice'],'schf1'),
      'a-schf2':rowsComplete(D.schF2,['description','bank','accountNo','courtOrderDate','salePrice'],'schf2'),
    };
    const incomplete={
      'a-p1':!checks['a-p1'],
      'a-p2':!checks['a-p2']&&filled(D.startingBalance),
      'a-p3':!checks['a-p3']&&(D.guardians.length>0||guardianHasAnyData(D.guardians[0]||{})),
      'a-p4':!checks['a-p4'],
      'a-p5':!checks['a-p5'],
      'a-scha':!checks['a-scha']&&rowsStarted(D.schA,['payer','description','bank','accountNo','amount']),
      'a-schb1':!checks['a-schb1']&&rowsStarted(D.schB1,['bankAcct','checkNo','datePaid','payee','amount']),
      'a-schb2':!checks['a-schb2']&&rowsStarted(D.schB2,['bankAcct','checkNo','datePaid','payee','amount']),
      'a-schb3':!checks['a-schb3']&&rowsStarted(D.schB3,['bankAcct','checkNo','datePaid','payee','amount']),
      'a-schb4':!checks['a-schb4']&&rowsStarted(D.schB4,['checkNo','datePaid','category','payee','amount']),
      'a-schc':!checks['a-schc']&&(D.schC||[]).length>0,
      'a-schd1':!checks['a-schd1']&&rowsStarted(D.schD1,['description','accountNo','restricted','type','fullAmount','wardPct']),
      'a-schd2':!checks['a-schd2']&&rowsStarted(D.schD2,['description','residence','income','fullValue','wardPct','carryingValue']),
      'a-schd3':!checks['a-schd3']&&rowsStarted(D.schD3,['description','fullAmount','wardPct','carryingValue']),
      'a-schd4':!checks['a-schd4']&&rowsStarted(D.schD4,['description','restricted','fullAmount','wardPct','carryingValue']),
      'a-schd5':!checks['a-schd5']&&rowsStarted(D.schD5,['description','loanNo','loanType','fullDebt','wardPct']),
      'a-sche':!checks['a-sche']&&(D.schE||[]).length>0,
      'a-schf1':!checks['a-schf1']&&rowsStarted(D.schF1,['description','bank','accountNo','courtOrderDate','salePrice']),
      'a-schf2':!checks['a-schf2']&&rowsStarted(D.schF2,['description','bank','accountNo','courtOrderDate','salePrice']),
    };
    return {checks,incomplete};
  } else if(activeInventoryType==='planSimplified'){
    const filled=v=>v!==''&&v!==null&&v!==undefined&&v!==false;
    const hasAny=(...vals)=>vals.some(v=>filled(v));
    const g0=(D.planGuardians||[])[0]||{};
    // Q8 is answered once ANY box is ticked (NONE is itself a box), so a
    // boolean-or is the completion test rather than a filled() on each.
    const q8Answered=!!(D.q8DNR||D.q8LivingWill||D.q8Surrogate||D.q8POA||D.q8Other||D.q8None)
      &&(!D.q8Other||filled(D.q8OtherText))
      &&!(D.q8None&&(D.q8DNR||D.q8LivingWill||D.q8Surrogate||D.q8POA||D.q8Other));
    const checks={
      'ps-cover':filled(D.wardName)&&filled(D.caseNumber)&&filled(D.county)&&filled(D.periodFrom)&&filled(D.periodTo)
        &&datesOrdered(D.periodFrom,D.periodTo,false),
      'ps-p2':filled(D.q1Residences)&&filled(D.q2BestPlacement)&&filled(D.q3MedicalTreatment)&&filled(D.q4Diagnosis)
        &&filled(D.q5SocialServices)&&filled(D.q6Interaction)
        &&filled(D.q7RestoreRights)&&(D.q7RestoreRights!=='Yes'||filled(D.q7RestoreExplain))
        &&q8Answered
        &&filled(D.q9Remuneration)&&(D.q9Remuneration!=='Yes'||filled(D.q9RemunerationExplain)),
      // Milestone 55B: the guardian date-order check here is an exact fit --
      // this key already labels the guardian's own signature. Preparer and
      // attorney are "Borrowed": neither role has its own key in this filing
      // type, so their date-order checks attach here too rather than being
      // silently left unresolved (see MILESTONE-55-PROPOSAL.md's 55B section
      // for the labeling trade-off this accepts).
      'ps-p3':filled(g0.name)&&filled(g0.signatureDate)
        &&datesOrdered(D.periodTo,g0.signatureDate,true)
        &&datesOrdered(D.periodTo,D.preparer_signatureDate,true)
        &&datesOrdered(D.periodTo,D.attorney_signatureDate,true),
    };
    const incomplete={
      'ps-cover':!checks['ps-cover']&&hasAny(D.wardName,D.caseNumber,D.periodFrom,D.periodTo),
      'ps-p2':!checks['ps-p2']&&hasAny(D.q1Residences,D.q2BestPlacement,D.q3MedicalTreatment,D.q4Diagnosis,D.q5SocialServices,D.q6Interaction,D.q7RestoreRights,D.q9Remuneration,D.q8DNR,D.q8LivingWill,D.q8Surrogate,D.q8POA,D.q8Other,D.q8None),
      'ps-p3':!checks['ps-p3']&&hasAny(g0.name,g0.signatureDate,g0.email,g0.phone,g0.mailingAddress),
    };
    return {checks,incomplete};
  } else if(activeInventoryType==='planAnnual'){
    const filled=v=>v!==''&&v!==null&&v!==undefined&&v!==false;
    const hasAny=(...vals)=>vals.some(v=>filled(v));
    const anyOf=(...vals)=>vals.some(v=>!!v);
    const g0=(D.planGuardians||[])[0]||{};
    // Milestone 61B: the same started-row rule the PDF model and the export
    // validator use (core/validation/row-started.js, bridged by main.js).
    // These three lists used to be a fourth hand-written copy that disagreed
    // with both, so a phone-only residence was invisible on every surface.
    const res=window.startedRows(D.q1Residences);
    const provs=window.startedRows(D.q4Providers);
    const rights=D.rights||{}, adls=D.adls||{};
    const b=D.benefits||{};
    const anyBenefit=PLAN_BENEFITS.some(([k])=>(b[k]||{}).eligible||(b[k]||{}).appliedFor);
    const checks={
      'pa-cover':filled(D.wardName)&&filled(D.caseNumber)&&filled(D.county)&&filled(D.gid)
        &&filled(D.periodFrom)&&filled(D.periodTo)&&filled(D.guardian)&&filled(D.wardLiving)
        &&filled(D.residenceAddress)&&filled(D.residenceCityStateZip)
        &&datesOrdered(D.periodFrom,D.periodTo,false)&&datesOrdered(D.gid,D.periodFrom,true),
      'pa-p2':res.length>0&&res.every(r=>filled(r.name)),
      'pa-p3':anyOf(D.q2NoMove,D.q2WithinCounty,D.q2WithinCircuit,D.q2OutsideApproved,D.q2OutsideVenuePetition)
        &&anyOf(D.q3SettingALF,D.q3SettingGroupHome,D.q3SettingIntermediate,D.q3SettingPrivate,
                D.q3SettingSkilled,D.q3SettingSpecialized,D.q3SettingStateHospital,D.q3SettingOther)
        &&(!D.q3SettingOther||filled(D.q3SettingExplain))
        &&(!D.q3MedSpecialist||filled(D.q3MedSpecialistArea)),
      // Benefits is "check all that apply" — answered once any benefit row
      // is ticked, or the explicit None box is.
      'pa-p4':anyBenefit||!!D.q3BenefitsNone||!!D.q3BenefitsOther,
      // Milestone 40C-E: was `provs.every(...)` alone, which .every() makes
      // TRUE for an empty table -- so the sidebar called this section complete
      // while validatePlanAnnual() blocked export with "at least one provider
      // must be listed" (plan-annual/index.js:676), and the readiness panel
      // agreed with the validator. The comment here used to assert that an
      // empty table was a valid answer, which contradicted both. All three now
      // require at least one row, matching pi-p5's Initial Plan rule.
      'pa-p5':provs.length>0&&provs.every(r=>filled(r.name)),
      'pa-p6':filled(D.q5SocialSkills)&&filled(D.q5Activities)
        &&PLAN_RIGHTS.every(([k])=>filled(rights[k])),
      'pa-p7':PLAN_ADLS.every(([k])=>filled(adls[k])),
      'pa-p8':anyOf(D.q9MentalNone,D.q9MentalDementia,D.q9MentalAlzheimers,D.q9MentalAutism,D.q9MentalHeadInjury,
                    D.q9MentalDevelopmental,D.q9MentalIntellectual,D.q9MentalSchizophrenia,D.q9MentalDepression,
                    D.q9MentalSubstance,D.q9MentalOther)
        &&anyOf(D.q9PhysNone,D.q9PhysMobility,D.q9PhysBlindness,D.q9PhysDeafness,D.q9PhysDiabetic,
                D.q9PhysParkinsons,D.q9PhysArthritis,D.q9PhysOther)
        &&(!D.q9MentalOther||filled(D.q9MentalExplain))
        &&(!D.q9PhysOther||filled(D.q9PhysExplain)),
      'pa-p9':(!!D.q10NoDirectives!==!!D.q10Executed)&&(!D.q10ExecOther||filled(D.q10ExecOtherText)),
      'pa-p10':D.q11NoRemuneration?filled(D.q11NoRemunerationName)
                                  :hasAny(D.q11ReceivedName,D.q11Amount,D.q11From),
      // Milestone 55B: guardian date-order is an exact fit (this key already
      // labels the guardian's signature); attorney is "Borrowed" -- no
      // attorney-specific key exists in this filing type, so its date-order
      // check attaches here rather than being silently left unresolved (see
      // MILESTONE-55-PROPOSAL.md's 55B section for the labeling trade-off).
      // This is also the reported defect: the screenshot's "Signatures —
      // Guardian date signed must be on or after Reporting Period To" issue.
      // Milestone 55D: attorney email requiredness is gated on the same
      // bare `D.attorney` truthiness the validator uses -- a blank
      // attorney card is unaffected, matching validatePlanAnnual()'s
      // `if(d.attorney)req(d.attorney_email,...)`.
      'pa-p11':filled(g0.name)&&filled(g0.signatureDate)
        &&datesOrdered(D.periodTo,g0.signatureDate,true)
        &&datesOrdered(D.periodTo,D.attorney_signatureDate,true)
        &&(!D.attorney||filled(D.attorney_email)),
    };
    const incomplete={
      'pa-cover':!checks['pa-cover']&&hasAny(D.wardName,D.caseNumber,D.gid,D.periodFrom,D.periodTo,D.guardian,D.wardLiving,D.residenceAddress),
      'pa-p2':!checks['pa-p2']&&(D.q1Residences||[]).some(r=>r&&hasAny(r.name,r.street,r.cityStateZip,r.phone,r.facilityType,r.from,r.to)),
      'pa-p3':!checks['pa-p3']&&anyOf(D.q2NoMove,D.q2WithinCounty,D.q2WithinCircuit,D.q2OutsideApproved,D.q2OutsideVenuePetition,
              D.q3SettingALF,D.q3SettingGroupHome,D.q3SettingIntermediate,D.q3SettingPrivate,D.q3SettingSkilled,
              D.q3SettingSpecialized,D.q3SettingStateHospital,D.q3SettingOther,D.q3MedPrimary,D.q3MentalPsych,D.q3PersonalFacility,D.q3SocialFacility),
      'pa-p4':!checks['pa-p4']&&false,
      'pa-p5':!checks['pa-p5']&&(D.q4Providers||[]).some(r=>r&&hasAny(r.name,r.providerType,r.visits,r.street,r.cityStateZip,r.phone)),
      'pa-p6':!checks['pa-p6']&&(hasAny(D.q5SocialSkills,D.q5Activities)||PLAN_RIGHTS.some(([k])=>filled(rights[k]))),
      'pa-p7':!checks['pa-p7']&&PLAN_ADLS.some(([k])=>filled(adls[k])),
      'pa-p8':!checks['pa-p8']&&anyOf(D.q9MentalDementia,D.q9MentalAlzheimers,D.q9PhysMobility,D.q9UsesGlasses,D.q9NeedsGlasses,D.q9MentalNone,D.q9PhysNone),
      'pa-p9':!checks['pa-p9']&&anyOf(D.q10NoDirectives,D.q10Executed),
      'pa-p10':!checks['pa-p10']&&anyOf(D.q11NoRemuneration,D.q11ReceivedName,D.q11Amount,D.q11From),
      'pa-p11':!checks['pa-p11']&&hasAny(g0.name,g0.signatureDate,g0.phone,g0.email,g0.ssn),
    };
    return {checks,incomplete};
  } else if(activeInventoryType==='planInitial'){
    const filled=v=>v!==''&&v!==null&&v!==undefined&&v!==false;
    const hasAny=(...vals)=>vals.some(v=>filled(v));
    const anyOf=(...vals)=>vals.some(v=>!!v);
    // Milestone 40C-H: Q7's Trusts/Pending Benefits are tri-state ('', 'Yes',
    // 'No') on new wards and legacy booleans on old ones, so a bare truthiness
    // test counts the string 'No' as a yes. Mirrors window.isAffirmative from
    // core/form/form-contract.js; kept local because this classic script has no
    // module imports, and it must agree with validatePlanInitial() exactly or
    // the sidebar and the export blocker disagree about the same question.
    const isYes=v=>v===true||String(v??'').trim().toLowerCase()==='yes';
    const g0=(D.planGuardians||[])[0]||{};
    // Milestone 61B: shared started-row rule -- see the Plan Annual note.
    const provs=window.startedRows(D.q9Providers);
    const adls=D.adls||{};
    const directives=window.startedRows(D.q11Directives);
    const checks={
      'pi-cover':filled(D.wardName)&&filled(D.caseNumber)&&filled(D.county)&&filled(D.inceptionDate)
        &&filled(D.lettersSignedDate)&&filled(D.guardianNames)&&filled(D.wardLiving)
        &&filled(D.residenceAddress)&&filled(D.residenceCityStateZip),
      'pi-p2':filled(D.q2Setting)&&(D.q2Setting!=='Other'||filled(D.q2Explain))
        &&anyOf(D.q3MedPrimary,D.q3MedDentist,D.q3MedOphthalmologist,D.q3MedSpecialist,D.q3MedPT,
                D.q3MedST,D.q3MedOT,D.q3MedWardDecides,D.q3MedOther)
        &&(!D.q3MedSpecialist||filled(D.q3MedSpecialistArea))
        &&(!D.q3MedOther||filled(D.q3MedExplain)),
      'pi-p3':filled(D.q4Mental)&&(D.q4Mental!=='Other'&&D.q4Mental!=='None'||filled(D.q4Explain))
        &&filled(D.q5Personal)&&(D.q5Personal!=='Other'||filled(D.q5Explain)),
      'pi-p4':anyOf(D.q6CareFacility,D.q6NursesAides,D.q6FamilyFriends,D.q6DayProgram,D.q6WardDecides,D.q6Other)
        &&(!D.q6Other||filled(D.q6Explain))
        &&(anyOf(D.q7SocialSecurity,D.q7Ssdi,D.q7Hmo,D.q7Ssi,D.q7StateSupplement,D.q7InstitutionalCare,
                 D.q7SupplementalIns,D.q7Pension,D.q7Medicare,D.q7Medicaid,D.q7Va,D.q7Trusts,
                 D.q7PendingBenefits,D.q7Other)||filled(D.q7Explain))
        // Milestone 40C-H: this used to require the explanation for q7Other
        // only, while validatePlanInitial() required it for Trusts and Pending
        // Benefits as well -- so export could block on a section the sidebar
        // called complete. Both now read the same three conditions.
        &&(!(isYes(D.q7Trusts)||isYes(D.q7PendingBenefits)||D.q7Other)||filled(D.q7Explain)),
      // Unlike pa-p5's Annual Plan (see its comment), the Initial Plan's
      // Examining Providers exists because an examination already happened
      // to establish the guardianship -- an empty table isn't a valid
      // answer here, and a brand-new ward starts with exactly one blank row
      // (see emptyInitialProvider()), which .every() on its own would call
      // complete before anything is filled in.
      'pi-p5':provs.length>0&&provs.every(r=>filled(r.name)),
      'pi-p6':INITIAL_ADLS.every(([k])=>filled(adls[k])),
      'pi-p7':anyOf(D.mentalAlzheimers,D.mentalAutism,D.mentalClosedHeadInjury,D.mentalDementia,
                    D.mentalDepression,D.mentalDevelopmental,D.mentalSubstance,D.mentalSchizophrenia,D.mentalOther)
        &&anyOf(D.physMobility,D.physBlindness,D.physDeafness,D.physDiabetic,D.physParkinsons,D.physArthritis,D.physOther)
        &&anyOf(D.usesDentures,D.usesHearingAid,D.usesWheelchair,D.usesWalker,D.usesCrutches,
                D.usesProsthetics,D.usesGlasses,D.usesNone,D.usesOther)
        &&(!D.mentalOther||filled(D.mentalExplain))
        &&(!D.physOther||filled(D.physExplain))
        &&(!D.usesOther||filled(D.usesExplain)),
      'pi-p8':(!!D.q11NoDirectives!==!!D.q11Executed)
        &&(!D.q11ExecOther||filled(D.q11ExecOtherText))
        &&anyOf(D.needsDentures,D.needsHearingAid,D.needsWheelchair,D.needsWalker,D.needsCrutches,
                D.needsProsthetics,D.needsGlasses,D.needsNone,D.needsOther)
        &&(!D.needsOther||filled(D.needsExplain))
        &&filled(D.committeeIncorporated)&&(D.committeeIncorporated!=='No'||filled(D.committeeExplain)),
      'pi-p9':anyOf(D.certIncapacitatedNoCopy,D.certMinorNoCopy,D.certConsulted,D.certRecognizeRights,D.certNoRestriction,D.certProvidesCare)
        &&filled(g0.name)&&filled(g0.signatureDate),
      // Milestone 55D (Error 4): this key was unconditional -- a completely
      // blank attorney card (the pro se/Guardian Advocate exemption
      // Milestone 35-3 protects) already showed incomplete here, directly
      // contradicting validatePlanInitial(), which requires nothing until
      // its own "started" predicate trips. Replaced outright, not merely
      // extended with an email condition, which would have kept the
      // pre-existing bug: gated on the identical "started" predicate the
      // validator uses (attorney_bar alone, no name, already counts), with
      // name, the new email requirement, and a signature date all inside
      // that one gate -- matching the same presence-only approximation of
      // signature completeness every other nav-check key in this file
      // uses (full tri-state completeness is the validator's job via
      // checkSignatureState(), not this sidebar's).
      // Milestone 58C: "has an attorney been started?" is one shared rule now
      // (core/validation/attorney-block.js), not a copy of the validator's
      // four-field list. If the bridge is somehow absent the expression falls
      // back to "not started", which is the pro se-safe answer: no attorney
      // requirement is asserted against a filing that may not have one.
      'pi-p10':!(typeof window.isPlanInitialAttorneyStarted==='function'&&window.isPlanInitialAttorneyStarted(D))
        ||(filled(D.attorney_name)&&filled(D.attorney_email)&&filled(D.attorney_signatureDate)),
    };
    const incomplete={
      'pi-cover':!checks['pi-cover']&&hasAny(D.wardName,D.caseNumber,D.inceptionDate,D.lettersSignedDate,D.guardianNames,D.wardLiving,D.residenceAddress),
      'pi-p2':!checks['pi-p2']&&hasAny(D.q2Setting,D.q3MedPrimary,D.q3MedDentist,D.q3MedOphthalmologist,D.q3MedSpecialist,D.q3MedPT,D.q3MedST,D.q3MedOT,D.q3MedWardDecides,D.q3MedOther),
      'pi-p3':!checks['pi-p3']&&hasAny(D.q4Mental,D.q5Personal),
      'pi-p4':!checks['pi-p4']&&anyOf(D.q6CareFacility,D.q6NursesAides,D.q6FamilyFriends,D.q6DayProgram,D.q6WardDecides,D.q6Other,
              D.q7SocialSecurity,D.q7Ssdi,D.q7Hmo,D.q7Ssi,D.q7Medicare,D.q7Medicaid,D.q7Va,D.q7Trusts),
      'pi-p5':!checks['pi-p5']&&(D.q9Providers||[]).some(r=>r&&hasAny(r.name,r.providerType,r.examDate,r.street,r.cityStateZip,r.phone)),
      'pi-p6':!checks['pi-p6']&&INITIAL_ADLS.some(([k])=>filled(adls[k])),
      'pi-p7':!checks['pi-p7']&&anyOf(D.mentalAlzheimers,D.physMobility,D.usesGlasses,D.mentalNone,D.physNone),
      'pi-p8':!checks['pi-p8']&&anyOf(D.q11NoDirectives,D.q11Executed,D.committeeIncorporated,D.needsGlasses,D.needsNone),
      'pi-p9':!checks['pi-p9']&&hasAny(g0.name,g0.signatureDate,g0.phone,g0.ssn),
      // Milestone 58C: same predicate as the check above, not a third list.
      'pi-p10':!checks['pi-p10']&&typeof window.isPlanInitialAttorneyStarted==='function'&&window.isPlanInitialAttorneyStarted(D),
    };
    return {checks,incomplete};
  } else if(activeInventoryType==='planMinor'){
    const filled=v=>v!==''&&v!==null&&v!==undefined&&v!==false;
    const hasAny=(...vals)=>vals.some(v=>filled(v));
    const anyOf=(...vals)=>vals.some(v=>!!v);
    // Milestone 40C-E: "answered" for a tri-state question means an explicit
    // Yes or No -- blank is unanswered, and no value is ever coerced to No.
    // Mirrors isTriStateAnswer() in core/form/form-contract.js.
    const isAnswered=v=>{
      if(v===true||v===false)return true;
      const s=String(v??'').trim().toLowerCase();
      return s==='yes'||s==='no';
    };
    const g0=(D.planGuardians||[])[0]||{};
    // Milestone 61B: shared started-row rule -- see the Plan Annual note.
    const provs=window.startedRows(D.q3Providers);
    const checks={
      // Milestone 40C-E: two of validatePlanMinor()'s own Cover requirements
      // were missing here, so the sidebar could call the Cover complete while
      // export blocked on it. Case identity is `ucn || ref` (:423 -- either
      // satisfies it, this form has both fields), and "Amended Form?" must be
      // ANSWERED (:414), which means Yes or No, not merely non-blank; when it
      // is Yes the version is required too (:427). isAnswered mirrors
      // isTriStateAnswer() from core/form/form-contract.js, inlined because
      // this classic script has no module imports.
      'pm-cover':filled(D.wardName)&&filled(D.county)&&filled(D.periodFrom)&&filled(D.periodTo)
        &&filled(D.guardianName)&&filled(D.q1ResidenceName)&&filled(D.q1Street)
        &&(filled(D.ucn)||filled(D.ref))
        &&isAnswered(D.amendedForm)
        &&(String(D.amendedForm??'').trim().toLowerCase()!=='yes'||filled(D.amendedVersion))
        &&datesOrdered(D.periodFrom,D.periodTo,false),
      'pm-p2':true,
      // Same fix as pi-p5 above: an empty table shouldn't read as complete
      // before any provider has actually been entered.
      'pm-p3':provs.length>0&&provs.every(r=>filled(r.last)),
      'pm-p4':anyOf(D.q4Primary,D.q4Dentist,D.q4Specialist,D.q4PT,D.q4ST,D.q4OT,D.q4MinorDecides,D.q4Other)
        &&(!D.q4Other||filled(D.q4Explain)),
      'pm-p5':filled(D.q5SchoolProgress)&&filled(D.q5SocialDevelopment)&&filled(D.q5Communicates)&&filled(D.q5Interpersonal)
        &&anyOf(D.q5NoUnmetNeeds,D.q5DoesNotCareToSocialize,D.q5UnmetNeeds,D.q5Other)
        &&(!D.q5Other||filled(D.q5Explain)),
      'pm-p6':anyOf(D.certIncapacitated,D.certMinor,D.certConsulted,D.certNoRestriction,D.certProvidesCare,D.certPhysicianAttached)
        &&filled(g0.name)&&filled(g0.signatureDate)
        &&datesOrdered(D.periodTo,g0.signatureDate,true),
      // Milestone 55B: pm-p7 already labels "Preparer & Attorney" combined
      // (its validator sectionLabel), so both date-order checks are exact
      // fits here -- not a labeling trade-off the way Plan Simplified's and
      // Plan Annual's Borrowed sites are.
      'pm-p7':filled(D.preparer_name)&&filled(D.attorney_name)&&filled(D.attorney_signatureDate)
        &&datesOrdered(D.periodTo,D.preparer_signatureDate,true)
        &&datesOrdered(D.periodTo,D.attorney_signatureDate,true),
    };
    const incomplete={
      'pm-cover':!checks['pm-cover']&&hasAny(D.wardName,D.county,D.periodFrom,D.periodTo,D.guardianName,D.q1ResidenceName),
      'pm-p2':false,
      'pm-p3':!checks['pm-p3']&&(D.q3Providers||[]).some(r=>r&&hasAny(r.first,r.last,r.providerType,r.street,r.cityStateZip,r.phone)),
      'pm-p4':!checks['pm-p4']&&anyOf(D.q4Primary,D.q4Dentist,D.q4Specialist,D.q4PT,D.q4ST,D.q4OT),
      'pm-p5':!checks['pm-p5']&&hasAny(D.q5SchoolProgress,D.q5SocialDevelopment,D.q5Communicates,D.q5Interpersonal),
      'pm-p6':!checks['pm-p6']&&hasAny(g0.name,g0.signatureDate,g0.phone,g0.tin),
      'pm-p7':!checks['pm-p7']&&hasAny(D.preparer_name,D.attorney_name,D.attorney_signatureDate),
    };
    return {checks,incomplete};
  }
}

function updateNavDots(){
  const r=computeNavChecks();
  if(r)applyNavChecks(r.checks,r.incomplete);
  updateCurrentScheduleNextButton();
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
// and wiped it on the first keystroke). All three now come from the shared policy, bridged
// on window.sectionGuidancePolicy:
//   isSectionIncomplete  whether to EXPLAIN what is missing: the sidebar's own map, every type
//   blocksNext           whether to disable Next: a per-type policy (Guardian: schedule pages only)
//   guidanceAdvice       what to say: "tick the none box" only where the page has that box
function pageCompleteness(route){
  const policy=window.sectionGuidancePolicy;
  if(!policy||!route)return {key:null,incomplete:false,blocked:false};
  const type=activeInventoryType;
  const r=computeNavChecks();
  const key=policy.sectionCheckKey(type,route);
  const incomplete=policy.isSectionIncomplete(r&&r.checks,key);
  const blocked=policy.blocksNext({type,checkKey:key,incomplete,guardianScheduleKeys:SCHEDULE_NAV_KEYS});
  return {key,incomplete,blocked};
}
// Keeps its name and its meaning -- "does incompleteness block Next on this route" --
// because it is published on window.
function isScheduleIncomplete(route){
  return pageCompleteness(route).blocked;
}
window.isScheduleIncomplete=isScheduleIncomplete;

function updateCurrentScheduleNextButton(){
  const btn=document.getElementById('page-next-btn');
  if(!btn)return;
  const route=(typeof currentPage==='string'?currentPage:'').split('?')[0];
  const {incomplete,blocked}=pageCompleteness(route);
  const policy=window.sectionGuidancePolicy;
  // The advice must fit the page: "add an item, or check the box verifying there are none"
  // is right only where such a checkbox exists.
  const advice=policy?policy.guidanceAdvice({hasVerifyNoneBox:!!document.querySelector('#main-content .schedule-empty-check')}):'';
  btn.disabled=blocked;
  btn.title=blocked?advice:'';
  const guidanceContainer=document.getElementById('page-local-guidance');
  if(guidanceContainer&&typeof window.renderLocalSectionGuidance==='function'){
    let rawErrors=[];
    const type=activeInventoryType||window.D?.inventoryType;
    try {
      if(type==='guardian'&&typeof window.validateGuardian==='function')rawErrors=window.validateGuardian(window.D);
      else if((type==='annual'||type==='finalAccounting'||type==='trustAccounting')&&typeof window.validateAnnual==='function')rawErrors=window.validateAnnual(window.D);
      else if(type==='simplified'&&typeof window.validateSimplified==='function')rawErrors=window.validateSimplified(window.D);
      else if(type==='planAnnual'&&typeof window.validatePlanAnnual==='function')rawErrors=window.validatePlanAnnual(window.D);
      else if(type==='planInitial'&&typeof window.validatePlanInitial==='function')rawErrors=window.validatePlanInitial(window.D);
      else if(type==='planMinor'&&typeof window.validatePlanMinor==='function')rawErrors=window.validatePlanMinor(window.D);
      else if(type==='planSimplified'&&typeof window.validatePlanSimplified==='function')rawErrors=window.validatePlanSimplified(window.D);
    } catch(e) {}
    // Explain whenever the section is incomplete -- not only when Next is blocked. On the
    // Guardian Cover and D-1..D-5 the page explains but Next stays enabled (D1); clearing the
    // box here whenever Next was not blocked is what would have wiped the explanation on the
    // first edit.
    guidanceContainer.innerHTML=incomplete?window.renderLocalSectionGuidance(route,rawErrors,Infinity,{message:advice},type):'';
  }
}

// Filing progress for ANY ward, active or not. Same window.D swap trick
// getWardHeadlineTotal() uses: synchronous, with no awaits in between, so
// nothing can observe D pointing at the wrong ward mid-computation.
function getWardProgress(ward){
  const prevD=window.D, prevType=activeInventoryType;
  window.D=ward; activeInventoryType=ward.inventoryType;
  let res=null;
  try{
    const r=computeNavChecks();
    if(r){
      const keys=Object.keys(r.checks);
      const complete=keys.filter(k=>r.checks[k]).length;
      res={complete,total:keys.length,pct:keys.length?Math.round(complete/keys.length*100):0};
    }
  }catch(e){console.warn('progress calc failed for ward',ward.wardId,e);}
  finally{window.D=prevD;activeInventoryType=prevType;}
  return res;
}

function applyNavChecks(checks,incomplete={}){
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
let _navSectionExpandedKey=null;
function toggleNavSection(key){
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
function resetNavSectionExpanded(){_navSectionExpandedKey=null;}
// Turns sidebar nav sections into a single global accordion: opening one
// section collapses every other section. Reads DOM structure only (no
// hardcoded per-form-type section map) -- works for every buildNav*()
// sidebar that follows the existing .nav-section > .nav-section-label +
// .nav-link-item shape. Collapsed completed sections show ✓; collapsed
// incomplete sections show − so hidden child status is not lost.
function applyNavSectionCollapse(checks){
  const container=document.getElementById('nav-sections');
  if(!container)return;
  const currentKey=getCurrentPageKey();
  const currentPagePath=(currentPage||'').split('?')[0];
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
    const sectionKey=`${caseFile.activeWardId||''}:${label.dataset.origHtml}`;
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
function renderProgressSummary(checks){
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
    <div class="ward-progress-bar" role="progressbar" aria-label="Filing progress: ${complete} of ${total} sections complete"
         aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100">
      <div class="ward-progress-fill${done?' ward-progress-done':''}" style="width:${pct}%"></div>
    </div>
    <div class="ward-progress-count">${complete} of ${total} sections complete</div>
    ${nextRoute?`<button type="button" class="ward-progress-jump" data-form-action="navigate" data-route="${esc(nextRoute)}">${ic('external',13)} Jump to ${esc(jumpLabel)}</button>`:''}`;
}

function getCurrentPageKey(){
  const page=currentPage.split('?')[0];
  if(activeInventoryType==='guardian'){
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
  const prefix=activeInventoryType==='simplified'?'s-'
    :formEngine(activeInventoryType)==='annual'?'a-'
    :activeInventoryType==='planSimplified'?'ps-'
    :activeInventoryType==='planAnnual'?'pa-'
    :activeInventoryType==='planInitial'?'pi-'
    :activeInventoryType==='planMinor'?'pm-'
    :'';
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

function afterChange(path){
  // Guardian Inventory binds via bindForms()/data-bind rather than
  // data-form-path, so it never reaches form-contract.js's own write
  // functions; this is its single choke point and it calls the same shared
  // post-write tail the other eight filing types use (Milestone 42D:
  // county commit, Party write-through, autosave, nav dots, ward card, name
  // sync). Not optional-chained on purpose -- a missing bridge here would
  // silently stop autosaving, and should fail loudly instead.
  updateCalcFields();
  window.runFieldWriteSideEffects(path);
  // Update live summary displays
  const els={
    'totalA1':calc.totalA1(),'totalA2':calc.totalA2(),'netA':calc.netA(),
    'totalB1':calc.totalB1(),'totalB2':calc.totalB2(),'totalB3':calc.totalB3(),
    'totalB4':calc.totalB4(),'netB':calc.netB(),'totalInventory':calc.total(),
    'totalC1':calc.totalC1(),'totalC2':calc.totalC2(),'totalC3':calc.totalC3(),
    'totalC4':calc.totalC4(),'totalC5':calc.totalC5(),
    'restrictedCash':calc.restrictedCash(),'unrestrictedCash':calc.unrestrictedCash(),
    'restrictedIntang':calc.restrictedIntang(),'unrestrictedIntang':calc.unrestrictedIntang(),
    'bondRequired':calc.bondRequired(),'auditFee':calc.auditFee(),
  };
  for(const[id,val] of Object.entries(els)){
    const el=document.getElementById(id);
    if(el)el.textContent=fmt(val);
  }
  // Conditional SDB field
  const sdbContainer=document.getElementById('sdb-filed-row');
  if(sdbContainer)sdbContainer.style.display=(D.hasSafeDepositBox==='Yes'||D.hasSafeDepositBox===true)?'':'none';
  // Conditional bond-waiver date (Milestone 57A). Hidden, never cleared: a
  // filer who answers Yes, types the order date, then switches to No must get
  // the date back intact when they switch to Yes again.
  const waivedContainer=document.getElementById('bond-waived-row');
  if(waivedContainer)waivedContainer.style.display=(D.bondWaived==='Yes'||D.bondWaived===true||(!D.bondWaived&&String(D.bondWaivedDate||'').trim()))?'':'none';
}

function updateCalcFields(){
  // Update all readonly calculated fields in visible entry cards
  document.querySelectorAll('[data-calcbind]').forEach(el=>{
    const path=el.dataset.calcbind; // e.g. "scheduleA1.0.wardValue"
    const parts=path.split('.');
    const schedule=parts[0], idx=parseInt(parts[1]), field=parts[2];
    const entry=window.D[schedule]?.[idx];
    if(!entry)return;
    let val=0;
    if(field==='wardValue')val=calc.wardVal(entry);
    else if(field==='wardDebt')val=calc.wardDebt(entry);
    else if(field==='wardAmt')val=calc.wardAmt(entry);
    else if(field==='wardB2')val=calc.wardB2(entry);
    else if(field==='wardB3')val=calc.wardB3(entry);
    else if(field==='wardB4')val=calc.wardB4(entry);
    else if(field==='wardC1')val=calc.wardC1(entry);
    else if(field==='wardC2')val=calc.wardC2(entry);
    else if(field==='wardC3')val=calc.wardC3(entry);
    else if(field==='wardC4')val=calc.wardC4(entry);
    else if(field==='wardC5')val=calc.wardC5(entry);
    el.value=fmt(val);
  });
}

// Guardian page renderers moved to src/features/guardian-inventory/index.js
// (Milestone 8, Phase A). linkAccordions() stays shared because the
// extracted Cover page still calls it after mounting.
function linkAccordions(idA,idB){
  const elA=document.getElementById(idA),elB=document.getElementById(idB);
  if(!elA||!elB||elA.dataset.linked)return;
  elA.dataset.linked='1';elB.dataset.linked='1';
  let syncing=false;
  const mirror=(target,open)=>{
    if(syncing)return;
    syncing=true;
    try{
      const inst=bootstrap.Collapse.getOrCreateInstance(target,{toggle:false});
      if(open)inst.show();else inst.hide();
    }finally{syncing=false;}
  };
  elA.addEventListener('show.bs.collapse',()=>mirror(elB,true));
  elA.addEventListener('hide.bs.collapse',()=>mirror(elB,false));
  elB.addEventListener('show.bs.collapse',()=>mirror(elA,true));
  elB.addEventListener('hide.bs.collapse',()=>mirror(elA,false));
}

// ── helpers ────────────────────────────────────────────
// Chrome and Edge support writable file handles for background .sav updates.
// Other browsers require deliberate exports, so show this notice on every
// form's Case Info or Cover page.
function browserRecommendationNotice(style = 'margin-bottom:1rem;'){
  return `<div class="schedule-instructions" style="${style}">${ic('alert',15)} <strong>Chrome or Microsoft Edge is recommended</strong> for the best experience — only those browsers support automatically saving your work in the background as you go. Firefox and Safari work fine too, but you'll need to save a backup file (.sav) manually and more often.</div>`;
}
// ═══════════════════════════════════════════════════════
// SCHEDULE SUPPORTING DOCUMENTS & COMMENTS
// ═══════════════════════════════════════════════════════
// Every schedule (across all three inventory types) can carry uploaded
// supporting documents and a free-text comment. Guardianships are re-filed
// annually, so uploads/comments are kept in a dict keyed by the ward's
// current accounting period (periodFrom/periodTo) rather than flattened
// onto the schedule itself — starting next year's accounting (by changing
// those dates on the Cover page) leaves last year's uploads/comments
// archived under the old period key and opens a fresh, empty slot for the
// new one. The one-time Initial Inventory has no period, so it uses a
// single constant key instead.
const SCHEDULE_DOC_MAX_FILE_BYTES=15*1024*1024; // 15MB/file — base64 inflates ~33% in storage and the .sav backup

async function getSupplementalPdfTools(){
  if(window.PGSupplementalPdf)return window.PGSupplementalPdf;
  return import('./src/core/pdf/supplemental-pdf.js');
}

function scheduleDocPeriodKey(){
  // Guardian wards have no periodFrom/periodTo, so each year is
  // distinguished by activeYearKey instead (falls back to 'initial' for
  // wards saved before multi-year support existed, preserving their
  // existing uploads under the same bucket they were already using).
  if(activeInventoryType==='guardian')return (window.D&&window.D.activeYearKey)||'initial';
  const from=(window.D&&window.D.periodFrom)||'';
  const to=(window.D&&window.D.periodTo)||'';
  return `${from}__${to}`;
}

function getScheduleDocSlot(scheduleKey){
  const d=window.D;
  if(!d)return {comment:'',files:[]};
  d.scheduleDocs=d.scheduleDocs||{};
  d.scheduleDocs[scheduleKey]=d.scheduleDocs[scheduleKey]||{};
  const period=scheduleDocPeriodKey();
  d.scheduleDocs[scheduleKey][period]=d.scheduleDocs[scheduleKey][period]||{comment:'',files:[]};
  return d.scheduleDocs[scheduleKey][period];
}

function fmtFileSize(bytes){
  if(bytes==null)return '';
  if(bytes<1024)return bytes+' B';
  if(bytes<1024*1024)return (bytes/1024).toFixed(1)+' KB';
  return (bytes/(1024*1024)).toFixed(1)+' MB';
}

async function handleScheduleDocUpload(scheduleKey,fileList){
  const slot=getScheduleDocSlot(scheduleKey);
  const files=Array.from(fileList||[]);
  const rejected=[];
  const added=[];
  const tools=await getSupplementalPdfTools();
  const readers=files.map(f=>new Promise(resolve=>{
    if(!tools.isPdfLikeFile(f)){rejected.push(`${f.name} (PDF files only)`);resolve(null);return;}
    if(f.size>SCHEDULE_DOC_MAX_FILE_BYTES){rejected.push(`${f.name} (${tools.formatSupplementalPdfLimit()} limit)`);resolve(null);return;}
    const reader=new FileReader();
    reader.onload=async()=>{
      try{
        const dataUrl=String(reader.result||'');
        const bytes=tools.dataUrlToBytes(dataUrl);
        if(!tools.isPdfBytes(bytes)){rejected.push(`${f.name} (not a readable PDF)`);resolve(null);return;}
        const digest=await tools.digestBytes(bytes);
        resolve({
          id:tools.createSupplementalFileId(),
          name:f.name,
          type:'application/pdf',
          size:bytes.length||f.size,
          dataUrl:dataUrl.startsWith('data:application/pdf')?dataUrl:dataUrl.replace(/^data:[^;]+;/,'data:application/pdf;'),
          contentDigest:digest,
          uploadedAt:new Date().toISOString(),
          pageCount:0,
          validationAttempt:1,
          technicalStatus:'checking',
          technicalWarnings:[]
        });
      }catch(e){
        rejected.push(`${f.name} (${e.message||'could not read file'})`);
        resolve(null);
      }
    };
    reader.onerror=()=>{rejected.push(f.name);resolve(null);};
    reader.readAsDataURL(f);
  }));
  const results=await Promise.all(readers);
  results.filter(Boolean).forEach(r=>{slot.files.push(r);added.push(r);});
  if(rejected.length)await window.alertModal(`Some supporting documents were not attached: ${rejected.join(', ')}`);
  if(!added.length){renderPage(currentPage);return;}
  autoSave();
  renderPage(currentPage);

  for(const record of added){
    const currentSlot=getScheduleDocSlot(scheduleKey);
    const current=currentSlot.files.find(f=>f&&f.id===record.id);
    if(!current||current.contentDigest!==record.contentDigest||current.validationAttempt!==record.validationAttempt)continue;
    try{
      const validation=await tools.validateSupplementalPdfRecord(current);
      const latest=currentSlot.files.find(f=>f&&f.id===record.id);
      if(!latest||latest.contentDigest!==record.contentDigest||latest.validationAttempt!==record.validationAttempt)continue;
      Object.assign(latest,validation);
    }catch(e){
      const latest=currentSlot.files.find(f=>f&&f.id===record.id);
      if(latest&&latest.contentDigest===record.contentDigest&&latest.validationAttempt===record.validationAttempt){
        Object.assign(latest,{
          technicalStatus:'blocked',
          technicalWarnings:[e.message||'The PDF could not be checked.'],
          pageCount:0,
          corrupt:true
        });
      }
    }
    autoSave();
    renderPage(currentPage);
  }
}

function removeScheduleDoc(scheduleKey,idx){
  const slot=getScheduleDocSlot(scheduleKey);
  slot.files.splice(idx,1);
  autoSave();
  renderPage(currentPage);
}

async function prepareScheduleDocForValidation(file,tools){
  if(!file||!file.dataUrl)return false;
  const bytes=tools.dataUrlToBytes(file.dataUrl);
  if(!tools.isPdfBytes(bytes)){
    Object.assign(file,{
      technicalStatus:'blocked',
      technicalWarnings:['The selected file is not a readable PDF.'],
      pageCount:0,
      corrupt:true
    });
    return false;
  }
  const digest=await tools.digestBytes(bytes);
  let changed=false;
  if(!file.id){file.id=tools.createSupplementalFileId();changed=true;}
  if(file.type!=='application/pdf'){file.type='application/pdf';changed=true;}
  if(file.size!==bytes.length){file.size=bytes.length;changed=true;}
  if(!String(file.dataUrl).startsWith('data:application/pdf')){
    file.dataUrl=String(file.dataUrl).replace(/^data:[^;]+;/,'data:application/pdf;');
    changed=true;
  }
  if(file.contentDigest!==digest){
    file.contentDigest=digest;
    changed=true;
  }
  if(!file.validationAttempt)file.validationAttempt=0;
  if(!['checking','ready','warning','blocked'].includes(file.technicalStatus)){
    file.technicalStatus='checking';
    changed=true;
  }
  if(file.technicalStatus==='checking'){
    file.validationAttempt+=1;
    file.technicalWarnings=[];
    changed=true;
  }
  return changed;
}

function queueScheduleDocValidation(scheduleKey,slot){
  (slot.files||[]).forEach(file=>{
    if(!file||file.__validationQueued)return;
    const needsValidation=file.technicalStatus==='checking'||!file.technicalStatus||!file.contentDigest||!file.id||!file.pageCount;
    if(!needsValidation)return;
    file.__validationQueued=true;
    setTimeout(async()=>{
      try{
        const tools=await getSupplementalPdfTools();
        const prepared=await prepareScheduleDocForValidation(file,tools);
        if(prepared){autoSave();renderPage(currentPage);}
        if(file.technicalStatus==='blocked'){file.__validationQueued=false;return;}
        const attempt=file.validationAttempt||1;
        const digest=file.contentDigest;
        const validation=await tools.validateSupplementalPdfRecord(file);
        const currentSlot=getScheduleDocSlot(scheduleKey);
        const latest=currentSlot.files.find(f=>f&&f.id===file.id);
        if(!latest||latest.contentDigest!==digest||(latest.validationAttempt||1)!==attempt)return;
        Object.assign(latest,validation);
        latest.__validationQueued=false;
        autoSave();
        renderPage(currentPage);
      }catch(e){
        file.__validationQueued=false;
      }
    },0);
  });
}

function queueAllScheduleDocValidations(){
  const docs=window.D&&window.D.scheduleDocs;
  if(!docs||typeof docs!=='object')return;
  const period=scheduleDocPeriodKey();
  Object.entries(docs).forEach(([scheduleKey,value])=>{
    if(!value||typeof value!=='object')return;
    const slot=Array.isArray(value.files)||value.comment
      ? value
      : value[period]||value.initial;
    if(slot&&Array.isArray(slot.files))queueScheduleDocValidation(scheduleKey,slot);
  });
}

window.queueAllScheduleDocValidations=queueAllScheduleDocValidations;

function updateScheduleComment(scheduleKey,value){
  getScheduleDocSlot(scheduleKey).comment=value;
  autoSave();
}

function renderScheduleDocsSection(scheduleKey){
  const slot=getScheduleDocSlot(scheduleKey);
  queueScheduleDocValidation(scheduleKey,slot);
  const period=scheduleDocPeriodKey();
  const [pf,pt]=period.split('__');
  const fmtPf=pf?formatDisplayDate(pf)||pf:'';
  const fmtPt=pt?formatDisplayDate(pt)||pt:'';
  const periodNote=activeInventoryType==='guardian'?''
    :(fmtPf||fmtPt?` — accounting period ${fmtPf||'?'} to ${fmtPt||'?'}`:' — set the accounting period on the Cover page to file these by year');
  const filesHtml=slot.files.length?slot.files.map((f,i)=>{
    const status=f.technicalStatus||'pending';
    const warnings=Array.isArray(f.technicalWarnings)?f.technicalWarnings:[];
    const statusLabel=status==='checking'?'Checking'
      :status==='ready'?'Ready'
      :status==='warning'?'Warning - review recommended'
      :status==='blocked'?'Blocked':'Pending review';
    const statusColor=status==='blocked'?'var(--danger-text)':status==='warning'?'var(--warn-text)':status==='ready'?'var(--ok-text)':'var(--ink-3)';
    return `
    <div class="sched-doc-row">
      <span class="sched-doc-name">${ic('file',14)} ${esc(f.name)}</span>
      <span class="sched-doc-meta">${fmtFileSize(f.size)}${f.pageCount?` - ${f.pageCount} page${f.pageCount===1?'':'s'}`:''}</span>
      <span class="sched-doc-meta" style="color:${statusColor};">${esc(statusLabel)}</span>
      ${warnings.length?`<span class="sched-doc-meta" style="color:var(--warn-text);">${esc(warnings.join(' '))}</span>`:''}
      <a href="${f.dataUrl}" download="${esc(f.name)}" class="btn btn-sm btn-outline-secondary">Download</a>
      <button type="button" class="btn btn-sm btn-outline-danger" aria-label="Remove supporting document ${esc(f.name)}" data-form-action="remove-schedule-doc" data-schedule-key="${esc(scheduleKey)}" data-document-index="${i}">×</button>
    </div>`;}).join(''):`<div class="sched-doc-empty">No supporting documents uploaded${activeInventoryType==='guardian'?'':' for this period'}.</div>`;
  const inputId=`sched-doc-input-${scheduleKey}`;
  return `<div class="schedule-docs-section no-print">
    <h2>Supporting Documents${periodNote}</h2>
    <p class="schedule-docs-hint">Upload PDF supplemental documents only. Supplemental PDFs are inserted as uploaded; Guardian Forms does not certify or remediate uploaded documents for accessibility. Stored on this device only, encrypted with the rest of this ward's data.</p>
    <input type="file" id="${inputId}" multiple accept="application/pdf,.pdf" aria-label="Upload PDF supporting documents for ${esc(scheduleKey)}" class="d-none" data-form-change="schedule-doc-upload" data-schedule-key="${esc(scheduleKey)}">
    <button type="button" class="btn btn-outline-primary btn-sm mb-2" data-form-action="choose-schedule-docs" data-input-id="${esc(inputId)}">+ Upload PDF(s)</button>
    <div class="sched-doc-list">${filesHtml}</div>
    <h2 class="mt">Comments</h2>
    <textarea class="form-control" rows="3" aria-label="Comments about ${esc(scheduleKey)}" placeholder="Notes about this schedule…" data-form-input="schedule-comment" data-schedule-key="${esc(scheduleKey)}">${esc(slot.comment)}</textarea>
  </div>`;
}

// ═══════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════
// td()/tdR() emit display:table-row divs (not real <table> markup) — used only
// for the key-value "layout" blocks (Required Info, schedule totals, audit
// fee, etc). display:table-row/table-cell renders pixel-identical to a real
// table, but isn't flagged by accessibility tools as a misused layout table.
function td(...cols){return `<div class="tr">${cols.map(c=>`<div class="td">${c||''}</div>`).join('')}</div>`;}
function tdR(...cols){// last col right-aligned
  const all=cols.map((c,i)=>i===cols.length-1?`<div class="td right">${c||''}</div>`:`<div class="td">${c||''}</div>`);
  return `<div class="tr">${all.join('')}</div>`;
}
// th()/totRow()/printEmptyRow()/docHeader() moved to
// src/features/guardian-inventory/print.js (Milestone 8, Phase B) --
// Guardian-only, unlike td()/tdR() above which stay legacy/shared with
// Annual's print.js.

function validate(){
  return window.validateGuardian();
}

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

// Hash-based routing
// Page routes for current wizard (dynamically set based on activeInventoryType)
const PAGES_SIMPLIFIED=[
  {id:'/',        label:'Cover & Part I'},
  {id:'/summary', label:'Summary'},
  {id:'/p2',      label:'Part II'},
  {id:'/p3',   label:'Part III'},
  {id:'/p4',   label:'Part IV'},
  {id:'/p5',   label:'Part V'},
  {id:'/p6',   label:'Part VI'},
  {id:'/p7',   label:'Part VII'},
  {id:'/print',label:'Print Preview'},
];
const PAGES_ANNUAL=[
  {id:'/',        label:'Part I'},
  {id:'/summary', label:'Summary'},
  {id:'/p2',      label:'Part II'},
  {id:'/p3',   label:'Part III'},
  {id:'/p4',   label:'Part IV'},
  {id:'/p5',   label:'Part V'},
  {id:'/scha', label:'Sch A'},
  {id:'/schb1',label:'Sch B1'},
  {id:'/schb2',label:'Sch B2'},
  {id:'/schb3',label:'Sch B3'},
  {id:'/schb4',label:'Sch B4'},
  {id:'/schc', label:'Sch C'},
  {id:'/schd1',label:'Sch D1'},
  {id:'/schd2',label:'Sch D2'},
  {id:'/schd3',label:'Sch D3'},
  {id:'/schd4',label:'Sch D4'},
  {id:'/schd5',label:'Sch D5'},
  {id:'/sche', label:'Sch E'},
  {id:'/schf1',label:'Sch F1'},
  {id:'/schf2',label:'Sch F2'},
  {id:'/p67',  label:'Parts VI & VII'},
  {id:'/p8',   label:'Part VIII'},
  {id:'/p9',   label:'Part IX'},
  {id:'/p10',  label:'Part X'},
  {id:'/p11',  label:'Part XI'},
  {id:'/print',label:'Print Preview'},
];
const PAGES_PLAN_SIMPLIFIED=[
  {id:'/',        label:'Cover'},
  {id:'/summary', label:'Summary'},
  {id:'/p2',      label:'The Plan'},
  {id:'/p3',   label:'Signatures'},
  {id:'/print',label:'Print Preview'},
];
const PAGES_PLAN_ANNUAL=[
  {id:'/',        label:'Cover'},
  {id:'/summary', label:'Summary'},
  {id:'/p2',      label:'1. Residences'},
  {id:'/p3',   label:'2–3. Residence & Care'},
  {id:'/p4',   label:'3G. Insurance & Benefits'},
  {id:'/p5',   label:'4. Medical Treatment'},
  {id:'/p6',   label:'5–7. Skills & Rights'},
  {id:'/p7',   label:'8. Daily Living'},
  {id:'/p8',   label:'9. Disabilities & Devices'},
  {id:'/p9',   label:'10. Advance Directives'},
  {id:'/p10',  label:'11. Remuneration'},
  {id:'/p11',  label:'Signatures'},
  {id:'/print',label:'Print Preview'},
];
const PAGES_PLAN_INITIAL=[
  {id:'/',        label:'Cover'},
  {id:'/summary', label:'Summary'},
  {id:'/p2',      label:'2–3. Setting & Medical Care'},
  {id:'/p3',   label:'4–5. Mental Health & Personal Care'},
  {id:'/p4',   label:'6–7. Socialization & Benefits'},
  {id:'/p5',   label:'9. Examining Providers'},
  {id:'/p6',   label:'10A. Daily Living'},
  {id:'/p7',   label:'10B–D. Disabilities & Devices'},
  {id:'/p8',   label:'11. Advance Directives'},
  {id:'/p9',   label:'Signatures'},
  {id:'/p10',  label:'Attorney Certification'},
  {id:'/print',label:'Print Preview'},
];
const PAGES_PLAN_MINOR=[
  {id:'/',        label:'Cover'},
  {id:'/summary', label:'Summary'},
  {id:'/p2',      label:'2. Prior Residences'},
  {id:'/p3',   label:'3. Treatment Providers'},
  {id:'/p4',   label:'4. Medical Services'},
  {id:'/p5',   label:'5. Education & Social Development'},
  {id:'/p6',   label:'Guardian Signatures'},
  {id:'/p7',   label:'Preparer & Attorney'},
  {id:'/print',label:'Print Preview'},
];
const PAGES={
  guardian: PAGES_GUARDIAN,
  finalAccounting: PAGES_ANNUAL,
  trustAccounting: PAGES_ANNUAL,
  simplified: PAGES_SIMPLIFIED,
  annual: PAGES_ANNUAL,
  planSimplified: PAGES_PLAN_SIMPLIFIED,
  planAnnual: PAGES_PLAN_ANNUAL,
  planInitial: PAGES_PLAN_INITIAL,
  planMinor: PAGES_PLAN_MINOR,
};

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
  const wizardPages=PAGES[activeInventoryType]||PAGES_GUARDIAN;
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

async function initApp(){
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

// Accessibility: Link labels to inputs that have IDs but no for attribute
function linkLabelsToInputs(){
  // First: ensure every input/select/textarea has an id BEFORE trying to
  // link labels to them — otherwise the linking pass below finds a blank
  // .id on fields like dateInput() and silently gives up on that label.
  document.querySelectorAll('input:not([id]), select:not([id]), textarea:not([id])').forEach(inp=>{
    inp.id='auto_'+Math.random().toString(36).slice(2,9);
  });

  // Then: link adjacent labels/inputs in the same parent
  document.querySelectorAll('label:not([for])').forEach(label=>{
    if(label.querySelector('input, select, textarea'))return;
    // Try next sibling
    let next=label.nextElementSibling;
    if(next&&(next.tagName==='INPUT'||next.tagName==='SELECT'||next.tagName==='TEXTAREA')&&next.id){
      label.setAttribute('for',next.id);
      return;
    }
    // Try next element after a div wrapper
    if(next&&next.tagName==='DIV'){
      const input=next.querySelector('input, select, textarea');
      if(input&&input.id){
        label.setAttribute('for',input.id);
        return;
      }
    }
    // Try parent div's siblings
    const parent=label.parentElement;
    if(parent){
      const input=parent.querySelector('input, select, textarea');
      if(input&&input.id){
        label.setAttribute('for',input.id);
        return;
      }
    }
  });

  // Give any remaining visible form control a usable accessible name. This
  // covers dynamic fields whose visible label cannot be linked structurally.
  document.querySelectorAll('input, select, textarea').forEach(control=>{
    if(control.type==='hidden' || control.type==='file' || control.hasAttribute('aria-label') || control.hasAttribute('aria-labelledby'))return;
    const hasAssociatedLabel=control.id&&[...document.querySelectorAll('label[for]')].some(label=>label.htmlFor===control.id);
    if(hasAssociatedLabel || control.closest('label'))return;
    const labelText=control.closest('.mb-2, .col-12, .col-md-2, .col-md-3, .col-md-4, .col-md-5, .col-md-6, .col-md-8, .col-md-12')?.querySelector('label')?.textContent
      || control.getAttribute('placeholder')
      || control.getAttribute('title')
      || control.dataset.annualLabel
      || control.dataset.formPath
      || control.dataset.bind
      || control.id;
    if(labelText)control.setAttribute('aria-label',labelText.replace(/\s+/g,' ').trim());
  });
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

// Start
setTimeout(()=>{
  linkLabelsToInputs();
},0);
// initApp() is NOT called here. This file is a classic, parser-blocking
// script, so it runs before any `<script type="module">` has evaluated --
// which meant startup reached code depending on module-provided globals
// (window.createFeatureBridge, and the case-file.js persistence functions)
// before those globals existed. src/main.js calls window.initApp() as its
// last statement instead, after every module import has evaluated, so the
// whole boot path has one explicit ordering guarantee rather than racing
// deferred module evaluation. See MILESTONE-40G-PROPOSAL.md.
