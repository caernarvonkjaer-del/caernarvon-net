import { renderSummaryPage } from '../../core/summary-renderer.js';
// Guardian Inventory -- Milestone 8A page/nav/validation extraction, plus
// Milestone 8B (print/PDF/Excel import/export). Dynamically imported by
// legacy-app.js's mountGuardianFeature()/mountGuardianNav() bridge, using
// the same window.createFeatureBridge() pattern as Simplified, Plan, and
// Annual features.
const {
  esc, ic, fmt, autoSave, navigate, renderPage, getCurrentPage, bindForms, afterChange,
  sanitizeNegativeAmounts, linkLabelsToInputs, enforceDateRanges, setupAmountFieldValidation,
  updateNavDots, initPrintPager, computeNavChecks, linkAccordions,
  browserRecommendationNotice, toggleSsnReveal, loadWardInfoBanner, renderScheduleDocsSection,
  formatName, formatAddress, formatPhone, formatSSN, formatCaseNumber, formatBarNumber,
  formatAccountNumber, formatCheckNumber, formatCityStateZip, finalizeCaseNumber, applyZipLimit,
  sanitizeNonNegativeDecimal, calc, mk, PAGES_GUARDIAN, SCHEDULE_NAV_KEYS,
  checkExcelCapacity,
} = window;

const D = new Proxy({}, {
  get: (_target, prop) => window.D && window.D[prop],
  set: (_target, prop, value) => { if (window.D) window.D[prop] = value; return true; },
});

// print.js/excel.js are dynamically imported once, together, the first time
// this feature mounts -- same reasoning as Simplified/Annual's
// ensureLazyModules(): the Cover page (pageHome()) has its own Excel-import
// dropzone that must work immediately, so deferring excel.js further would
// mean a second, separate lazy-load path for just that one control.
let _printModule = null;
let _excelModule = null;
let _lazyModulesPromise = null;
const eventControllers = new WeakMap();
function ensureLazyModules() {
  if (_printModule && _excelModule) return Promise.resolve();
  if (!_lazyModulesPromise) {
    _lazyModulesPromise = Promise.all([import('./print.js'), import('./excel.js')]).then(([print, excel]) => {
      _printModule = print;
      _excelModule = excel;
    });
  }
  return _lazyModulesPromise;
}

export async function mount(container, page) {
  await ensureLazyModules();
  sanitizeNegativeAmounts();
  let html;
  switch(page){
    case '/':     html=pageHome();break;
    case '/summary':html=pageSummary();break;
    case '/a1':   html=pageScheduleA1();break;
    case '/a2':   html=pageScheduleA2();break;
    case '/b1':   html=pageScheduleB1();break;
    case '/b2':   html=pageScheduleB2();break;
    case '/b3':   html=pageScheduleB3();break;
    case '/b4':   html=pageScheduleB4();break;
    case '/c1':   html=pageScheduleC1();break;
    case '/c2':   html=pageScheduleC2();break;
    case '/c3':   html=pageScheduleC3();break;
    case '/c4':   html=pageScheduleC4();break;
    case '/c5':   html=pageScheduleC5();break;
    case '/d1':   html=pageD1();break;
    case '/d2':   html=pageD2();break;
    case '/d3':   html=pageD3();break;
    case '/d4':   html=pageD4();break;
    case '/d5':   html=pageD5();break;
    case '/print': {
      const capOver = checkExcelCapacity(_excelModule.GUARDIAN_EXCEL_CAPS);
      html = _printModule.pagePrint(capOver);
      break;
    }
    default:      html='<p>Page not found</p>';
  }
  container.innerHTML = html;
  bindEvents(container);
  bindForms();
  afterChange('');
  container.scrollTop = 0;
  if(page==='/')linkAccordions('instructionsZone','importZone');
  linkLabelsToInputs();
  enforceDateRanges();
  setupAmountFieldValidation();
  updateNavDots();
  // The pv-pager needs the real .pdf-page elements in the DOM before it can
  // count/label them, so it must run after the async preview render, not
  // before it (Milestone 19-3).
  if (page === '/print') await _printModule.mountPreview();
  initPrintPager();
}

export function dispose(container) {
  eventControllers.get(container)?.abort();
  eventControllers.delete(container);
  container.replaceChildren();
}

function bindEvents(container) {
  eventControllers.get(container)?.abort();
  const controller = new AbortController();
  eventControllers.set(container, controller);
  const options = { signal: controller.signal };

  container.addEventListener('click', (event) => {
    const control = event.target instanceof Element ? event.target.closest('[data-inventory-action]') : null;
    if (!control) return;
    event.preventDefault();
    const index = Number.parseInt(control.dataset.index, 10);
    switch (control.dataset.inventoryAction) {
      case 'add-entry': addEntry(control.dataset.schedule); break;
      case 'add-guardian': addGuardian(); break;
      case 'add-recipient': addRecipient(); break;
      case 'add-witness': addWitness(); break;
      case 'duplicate-entry': duplicateEntry(control.dataset.schedule, index); break;
      case 'navigate': navigate(control.dataset.route); break;
      case 'remove-entry': removeEntry(control.dataset.schedule, index); break;
      case 'remove-guardian': removeGuardian(index); break;
      case 'remove-recipient': removeRecipient(index); break;
      case 'remove-witness': removeWitness(index); break;
      case 'save-excel': _excelModule.doSaveExcel(); break;
      case 'save-pdf': _printModule.doSavePdf(); break;
    }
  }, options);

  container.addEventListener('change', (event) => {
    const control = event.target;
    if (!(control instanceof HTMLInputElement)) return;
    if (control.dataset.inventoryChange === 'import-excel') _excelModule.importExcel(control);
    if (control.dataset.inventoryChange === 'schedule-no-items') setScheduleNoItems(control.dataset.schedule, control.checked);
    if (control.dataset.inventoryChange === 'toggle-vehicle') toggleB2Vehicle(Number.parseInt(control.dataset.index, 10), control.checked);
    if (control.dataset.inventoryChange === 'set-sdb') {
      const val = control.value === 'true';
      D.hasSafeDepositBox = val;
      if (!val) D.safeDepositBoxFiled = null;
      autoSave();
      updateNavDots();
      window.navigate('/d3');
    }
    if (control.dataset.inventoryChange === 'set-sig-style') {
      D.signatureStyle = control.value;
      autoSave();
      window.navigate('/print');
    }
    if (control.dataset.inventoryChange === 'set-sdb-filed') {
      D.safeDepositBoxFiled = control.value === 'true';
      autoSave();
      updateNavDots();
    }
  }, options);

  container.addEventListener('input', (event) => {
    const control = event.target;
    if (!(control instanceof HTMLInputElement) || control.dataset.inventoryInput !== 'vehicle') return;
    if (control.dataset.inventoryFormat === 'year') control.value = control.value.replace(/[^0-9]/g, '').slice(0, 4);
    if (control.dataset.inventoryFormat === 'vin') control.value = control.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 17);
    if (control.dataset.inventoryFormat === 'mileage') control.value = control.value.replace(/[^0-9,]/g, '');
    const index = Number.parseInt(control.dataset.index, 10);
    D.scheduleB2[index][control.dataset.field] = control.value;
    syncB2VehicleDescription(index);
    autoSave();
  }, options);
}

export function mountNav(container) {
  buildNavGuardian(container);
}

function buildNavGuardian(container){
  container.innerHTML=`
    <div class="nav-section">
      <div class="nav-section-label">Case Info</div>
      <button class="nav-link-item" data-page="/" data-nav="cover" data-form-action="navigate" data-route="/">Cover</button>
      <button class="nav-link-item" data-page="/summary" data-nav="summary" data-form-action="navigate" data-route="/summary">Summary</button>
    </div>
    <div class="nav-section">
      <div class="nav-section-label">Schedule A — Real Estate</div>
      <button class="nav-link-item" data-page="/a1" data-nav="a1" data-form-action="navigate" data-route="/a1">A-1&nbsp;&nbsp;Real Estate Assets</button>
      <button class="nav-link-item" data-page="/a2" data-nav="a2" data-form-action="navigate" data-route="/a2">A-2&nbsp;&nbsp;Real Estate Liabilities</button>
    </div>
    <div class="nav-section">
      <div class="nav-section-label">Schedule B — Personal &amp; Cash</div>
      <button class="nav-link-item" data-page="/b1" data-nav="b1" data-form-action="navigate" data-route="/b1">B-1&nbsp;&nbsp;Cash / Cash Equivalents</button>
      <button class="nav-link-item" data-page="/b2" data-nav="b2" data-form-action="navigate" data-route="/b2">B-2&nbsp;&nbsp;Personal Property</button>
      <button class="nav-link-item" data-page="/b3" data-nav="b3" data-form-action="navigate" data-route="/b3">B-3&nbsp;&nbsp;Intangible Assets</button>
      <button class="nav-link-item" data-page="/b4" data-nav="b4" data-form-action="navigate" data-route="/b4">B-4&nbsp;&nbsp;Pers. Prop. Liabilities</button>
    </div>
    <div class="nav-section">
      <div class="nav-section-label">Schedule C — Other Info</div>
      <button class="nav-link-item" data-page="/c1" data-nav="c1" data-form-action="navigate" data-route="/c1">C-1&nbsp;&nbsp;Income (Annualized)</button>
      <button class="nav-link-item" data-page="/c2" data-nav="c2" data-form-action="navigate" data-route="/c2">C-2&nbsp;&nbsp;Lawsuits Against Ward</button>
      <button class="nav-link-item" data-page="/c3" data-nav="c3" data-form-action="navigate" data-route="/c3">C-3&nbsp;&nbsp;Lawsuits by Ward</button>
      <button class="nav-link-item" data-page="/c4" data-nav="c4" data-form-action="navigate" data-route="/c4">C-4&nbsp;&nbsp;Trusts</button>
      <button class="nav-link-item" data-page="/c5" data-nav="c5" data-form-action="navigate" data-route="/c5">C-5&nbsp;&nbsp;Joint Owners</button>
    </div>
    <div class="nav-section">
      <div class="nav-section-label">Attestations &amp; Filings</div>
      <button class="nav-link-item" data-page="/d1" data-nav="d1" data-form-action="navigate" data-route="/d1">D-1&nbsp;&nbsp;Guardian Attestation</button>
      <button class="nav-link-item" data-page="/d2" data-nav="d2" data-form-action="navigate" data-route="/d2">D-2&nbsp;&nbsp;Preparer &amp; Attorney</button>
      <button class="nav-link-item" data-page="/d3" data-nav="d3" data-form-action="navigate" data-route="/d3">D-3&nbsp;&nbsp;Audit Fee &amp; Safe Deposit</button>
      <button class="nav-link-item" data-page="/d4" data-nav="d4" data-form-action="navigate" data-route="/d4">D-4&nbsp;&nbsp;Bond &amp; Surety Info</button>
      <button class="nav-link-item" data-page="/d5" data-nav="d5" data-form-action="navigate" data-route="/d5">D-5&nbsp;&nbsp;Certificate of Service</button>
    </div>
    <div class="nav-section">
      <div class="nav-section-label">Output</div>
      <button class="nav-link-item" data-page="/print" data-form-action="navigate" data-route="/print"><span class="nav-link-label">${ic('file',15)}&nbsp; Print Preview</span></button>
    </div>
  `;
}

// A schedule's own "Next" button is disabled until computeNavChecks()
// says that schedule is complete (a real row, or the "no items" checkbox
// -- see scheduleComplete() there). Only gates the 11 schedule pages;
// Cover, Summary, D-1..D-5, and Print are never gated this way.
function isScheduleIncomplete(route){
  const key=route.startsWith('/')?route.slice(1):route;
  if(!SCHEDULE_NAV_KEYS.includes(key))return false;
  const r=computeNavChecks();
  return !!(r&&!r.checks[key]);
}
export function pageNav(current){
  const PAGES=PAGES_GUARDIAN;
  const idx=PAGES.findIndex(p=>p.id===current);
  const prev=idx>0?PAGES[idx-1]:null;
  const next=idx<PAGES.length-1?PAGES[idx+1]:null;
  const nextDisabled=isScheduleIncomplete(current);
  return `<div class="page-nav no-print d-flex justify-content-between align-items-center">
    <div>${prev?`<button class="btn btn-outline-primary btn-sm" data-form-action="navigate" data-route="${prev.id}">← Previous: ${prev.label}</button>`:'&nbsp;'}</div>
    <small style="color:var(--ink-3);">Page ${idx+1} of ${PAGES.length}</small>
    <div>${next?`<button id="page-next-btn" class="btn btn-primary btn-sm" ${nextDisabled?'disabled title="Add at least one item, or check the box verifying there are none, before continuing."':''} data-form-action="navigate" data-route="${next.id}">Next: ${next.label} →</button>`:'&nbsp;'}</div>
  </div>`;
}


function reqLabel(text){return `<label class="form-label"><strong>${text}</strong><span class="req">*</span></label>`;}
function optLabel(text){return `<label class="form-label">${text}</label>`;}
function formRow(...cols){
  return `<div class="row g-2 mb-1">${cols.join('')}</div>`;
}
function col(n,html){return `<div class="col-md-${n}">${html}</div>`;}
function textInput(bind,placeholder='',type=''){
  const inputId='txt_'+Math.random().toString(36).slice(2,9);
  const dataType=type?` data-input-type="${type}"`:' data-input-type="text"';
  // SSN/EIN is real PII -- masked by default (type="password" only hides
  // the rendering; .value, oninput/data-bind, and formatSSN()'s live
  // dash-insertion all keep working exactly as for a text input) with a
  // lock/unlock toggle button to reveal it on demand. See toggleSsnReveal().
  if(type==='ssn'){
    return `<div class="ssn-mask-wrap"><input class="form-control" id="${inputId}" type="password" autocomplete="off" data-bind="${bind}" placeholder="${placeholder}"${dataType}>`
      +`<button type="button" class="ssn-reveal-btn" aria-label="Show SSN/EIN" data-form-action="toggle-ssn">${ic('lock',14)}</button></div>`;
  }
  return `<input class="form-control" id="${inputId}" data-bind="${bind}" placeholder="${placeholder}"${dataType}>`;
}


function numInput(bind){
  const isPercent=/Percent$/i.test(bind);
  const inputHtml=`<input type="text" inputmode="decimal" class="form-control" data-bind="${bind}" data-input-type="decimal">`;
  return isPercent?`<div class="input-group">${inputHtml}<span class="input-group-text">%</span></div>`:`<div class="input-group"><span class="input-group-text">$</span>${inputHtml}</div>`;
}
function dateInput(bind){
  return `<input type="date" class="form-control" data-bind="${bind}">`;
}
function calcInput(calcbind){
  return `<input class="form-control" readonly data-calcbind="${calcbind}" style="background:var(--accent-050);font-weight:600;">`;
}
// currentVal is optional -- pass the field's live D value when the option
// list is a fixed/curated set (as opposed to grown organically from user
// entries) so a .sav file saved before that list existed, or before a
// free-text field was converted to this dropdown, doesn't silently show a
// blank/wrong selection: bindForms() sets select.value=String(cur), and a
// value with no matching <option> leaves the control showing nothing
// selected even though the real data is still intact underneath. Injecting
// the stored value as its own selected option keeps the display honest
// until the user actively picks one of the real choices.
function selectInput(bind,opts,currentVal){
  let list=opts;
  if(currentVal!==undefined&&currentVal!==null&&currentVal!==''&&!opts.some(([v])=>v===currentVal)){
    list=[[currentVal,currentVal],...opts];
  }
  const options=list.map(([v,t])=>`<option value="${esc(v)}">${esc(t)}</option>`).join('');
  return `<select class="custom-select form-select" data-bind="${bind}">${options}</select>`;
}
// Checkbox counterpart to selectInput() for a true/false field -- the
// Guardian form's own schedule flags (isPersonalResidence, isRestricted,
// inSafeDepositBox, etc.) already store a real JS boolean, never a 'Yes'/
// 'No' string, so bindForms()'s existing native checkbox handling
// (el.type==='checkbox' -> setPath(...,e.target.checked)) is already the
// exact right fit -- this only needed the HTML, not a new bindForms branch.
// Every call site already has its own reqLabel()/optLabel() heading right
// above it (the Guardian form's grid puts a label over every field, checkbox
// or not), so this renders a bare checkbox -- `label` becomes an aria-label
// for accessibility, not a second visible label repeating the same text.
function checkboxInput(bind,label){
  const inputId='chk_'+Math.random().toString(36).slice(2,9);
  // <label>, not <div>, wrapping the input as a descendant -- clicking
  // anywhere in its padded area (see .form-check's min-height/touch
  // padding) toggles the checkbox even though there's no visible text,
  // not just the tiny native checkbox square itself. Standard technique
  // for meeting the 44x44 touch-target minimum without visually
  // enlarging the checkbox.
  return `<label class="form-check"><input class="form-check-input" type="checkbox" id="${inputId}" data-bind="${bind}" aria-label="${esc(label)}"></label>`;
}
// County-field counterpart to selectInput() -- data-bind driven like every
// other Guardian-form field (bindForms() below wires the actual read/write
// via data-input-type="county"), but a filtered-autocomplete text input
// instead of a <select>. No initial value or write-expr here: bindForms()
// sets the starting value itself from window.D, same as every other bound
// field, and dispatching 'input' on selectCountyOption() reaches its
// listener exactly like typing would.
function countyInputBind(bind){
  const inputId='cty_'+Math.random().toString(36).slice(2,9);
  return `<div class="ward-combobox-wrap county-combobox-wrap">
    <input type="text" class="form-control" id="${inputId}" data-bind="${bind}" data-input-type="county" data-form-control="county" autocomplete="off">
    <div class="county-combobox-dropdown" id="${inputId}-dropdown"></div>
  </div>`;
}
function entryCard(title,idx,schedule,bodyHtml,footerHtml=''){
  return `<div class="entry-card mb-2">
    <div class="entry-card-header">
      <span>${title}</span>
      <span class="entry-card-actions">
        <button class="btn btn-sm btn-outline-secondary no-print" title="Add a copy of this entry below" data-inventory-action="duplicate-entry" data-schedule="${schedule}" data-index="${idx}">${ic('copy',14)} Duplicate</button>
        <button class="btn btn-sm btn-outline-danger no-print" data-inventory-action="remove-entry" data-schedule="${schedule}" data-index="${idx}">✕ Remove</button>
      </span>
    </div>
    <div class="entry-card-body">${bodyHtml}</div>
    ${footerHtml?`<div class="entry-card-footer">${footerHtml}</div>`:''}
  </div>`;
}
function addBtn(schedule,label){
  return `<button class="btn btn-primary btn-sm mb-3 no-print" data-inventory-action="add-entry" data-schedule="${schedule}">+ Add ${label}</button>`;
}
function totalsBox(rows){
  const trs=rows.map(([label,id])=>`<div class="tr"><div class="td">${label}</div><div class="td" id="${id}">${fmt(0)}</div></div>`).join('');
  return `<div class="schedule-totals"><div class="tbl">${trs}</div></div>`;
}

// ── Entry add/remove ───────────────────────────────────
function addEntry(schedule){
  const map={
    a1:'scheduleA1',a2:'scheduleA2',b1:'scheduleB1',b2:'scheduleB2',b3:'scheduleB3',
    b4:'scheduleB4',c1:'scheduleC1',c2:'scheduleC2',c3:'scheduleC3',c4:'scheduleC4',c5:'scheduleC5'
  };
  const key=map[schedule];
  window.D[key].push(mk[schedule]());
  renderPage(getCurrentPage());
}
function removeEntry(schedule,idx){
  const map={
    a1:'scheduleA1',a2:'scheduleA2',b1:'scheduleB1',b2:'scheduleB2',b3:'scheduleB3',
    b4:'scheduleB4',c1:'scheduleC1',c2:'scheduleC2',c3:'scheduleC3',c4:'scheduleC4',c5:'scheduleC5'
  };
  const key=map[schedule];
  window.D[key].splice(idx,1);
  autoSave();
  renderPage(getCurrentPage());
}
// Empty-state for a schedule with zero rows: a checkbox the filer checks
// to affirmatively state there's nothing to report, replacing the old
// folder-icon placeholder. Checking it satisfies computeNavChecks()'s
// scheduleComplete() the same as adding a real row would (see there),
// which is what ungates that schedule's own "Next" button and turns its
// sidebar/section checkmark green -- and prints a verification sentence
// in place of the schedule's table on the final printout (printEmptyRow()).
function scheduleEmptyHTML(key,noun){
  const checked=!!(D.scheduleNoItems&&D.scheduleNoItems[key]);
  return `<div class="schedule-empty">
    <label class="schedule-empty-check">
      <input type="checkbox" ${checked?'checked':''} data-inventory-change="schedule-no-items" data-schedule="${key}">
      <span>I verify there are no ${noun} to report for this schedule.</span>
    </label>
  </div>`;
}
function setScheduleNoItems(key,val){
  if(!D.scheduleNoItems)D.scheduleNoItems={};
  D.scheduleNoItems[key]=val;
  autoSave();
  afterChange(`scheduleNoItems.${key}`);
}
// Copies an entry and inserts the copy directly beneath the original.
// Real filings are full of near-identical rows — twelve monthly
// disbursements to the same payee differing only in date and check number —
// and re-entering the shared fields by hand for each was the single most
// repetitive part of preparing an accounting.
// Deliberately a full copy including amounts: the guardian edits down what
// differs, which is less work than re-typing what doesn't. Values are plain
// strings/numbers, so a JSON round-trip is a safe deep copy and can't leave
// the copy sharing a reference with the original.
function duplicateEntry(schedule,idx){
  const map={
    a1:'scheduleA1',a2:'scheduleA2',b1:'scheduleB1',b2:'scheduleB2',b3:'scheduleB3',
    b4:'scheduleB4',c1:'scheduleC1',c2:'scheduleC2',c3:'scheduleC3',c4:'scheduleC4',c5:'scheduleC5'
  };
  const key=map[schedule];
  const list=window.D[key];
  if(!list||!list[idx])return;
  list.splice(idx+1,0,JSON.parse(JSON.stringify(list[idx])));
  autoSave();
  renderPage(getCurrentPage());
}
// Same idea for the Annual Accounting schedules, which store their rows in
// D.schA / D.schB1 / … and are rendered inline rather than through

function addGuardian(){D.guardians.push(mk.guardian());renderPage('/d1');}
function removeGuardian(i){D.guardians.splice(i,1);autoSave();renderPage('/d1');}
function addRecipient(){D.serviceRecipients.push(mk.recipient());renderPage('/d5');}
function removeRecipient(i){D.serviceRecipients.splice(i,1);autoSave();renderPage('/d5');}

// Witnesses present during the physical inventory of the ward's personal
// effects (Cover page reminder). Kept separate from the entryCard()/
// addEntry()/removeEntry() machinery used by the 11 numbered schedules --
// witnesses aren't a "schedule" in that sense (no dollar total, not part
// of the schedule/route map those helpers key off of).
function mkWitness(){return {name:'',address:'',occupation:''};}
function addWitness(){D.witnesses=D.witnesses||[];D.witnesses.push(mkWitness());autoSave();renderPage('/');}
function removeWitness(i){if(!D.witnesses)return;D.witnesses.splice(i,1);autoSave();renderPage('/');}
function witnessCardsHTML(){
  const list=D.witnesses||[];
  return list.map((w,i)=>`<div class="entry-card mb-2">
    <div class="entry-card-header">
      <span>Inventory Witness ${i+1}</span>
      <span class="entry-card-actions">
        <button class="btn btn-sm btn-outline-danger no-print" data-inventory-action="remove-witness" data-index="${i}">✕ Remove</button>
      </span>
    </div>
    <div class="entry-card-body">
      ${formRow(
        col(5,reqLabel('Name')+textInput(`witnesses.${i}.name`,'','name')),
        col(4,reqLabel('Address')+textInput(`witnesses.${i}.address`,'','address')),
        col(3,reqLabel('Occupation')+textInput(`witnesses.${i}.occupation`))
      )}
    </div>
  </div>`).join('');
}

// ═══════════════════════════════════════════════════════
// PAGE: HOME / COVER
// ═══════════════════════════════════════════════════════
function pageHome(){
  return `<div class="schedule-page">
  <h1>Verified Initial Inventory — Case Information</h1>
  ${browserRecommendationNotice()}
  <div class="instructions-import-row">
    <div class="accordion mb-0">
      <div class="accordion-item">
        <h2 class="accordion-header">
          <button class="accordion-button collapsed py-2" type="button" data-bs-toggle="collapse" data-bs-target="#instructionsZone" aria-expanded="false">
            ${ic('clipboard',15)} General Instructions
          </button>
        </h2>
        <div id="instructionsZone" class="accordion-collapse collapse">
          <div class="accordion-body" style="padding:1rem 1.25rem;">
            <ul style="margin:0;padding-left:1.4rem;font-size:.8rem;">
              <li>All values must be as of the <strong>Guardianship Inception Date (GID)</strong>.</li>
              <li><strong style="color:var(--danger-text);">CAUTION on Ward's % fields:</strong> Enter percentages as plain digits (70, not 0.70).</li>
              <li>Complete all Required Information fields (Ward Name, Case Number, GID, Guardian, Attorney, County).</li>
              <li>Work through Schedules A-1 through C-5, then complete Parts III–VI (Attestations &amp; Filings).</li>
              <li>Use Print Preview to save as PDF or Excel for filing.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
    <div class="accordion mb-0">
      <div class="accordion-item">
        <h2 class="accordion-header">
          <button class="accordion-button collapsed py-2" type="button" data-bs-toggle="collapse" data-bs-target="#importZone" aria-expanded="false">
            <svg class="ic" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M4 13.6 6.2 4.6h11.6L20 13.6v5.8H4Z"/><path d="M4 13.6h4.2l1.2 2.4h5.2l1.2-2.4H20"/></svg> Import Excel File (existing guardian inventory template)
          </button>
        </h2>
        <div id="importZone" class="accordion-collapse collapse">
          <div class="accordion-body" style="border:2px dashed var(--brand);border-top:none;border-radius:0 0 8px 8px;background:var(--surface-2);text-align:center;padding:1.5rem;">
            <label class="btn btn-outline-primary btn-sm" style="cursor:pointer;">
              <svg class="ic" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M3.4 6.4h5.6l2 2.2h7.6v2.2"/><path d="M3.4 8.6 5.6 19h13.2l2.2-8.2H5.6Z"/></svg> Select File
              <input type="file" accept=".xlsx" style="display:none" data-inventory-change="import-excel">
            </label>
            <p style="color:var(--ink-3);font-size:.8rem;margin:.5rem 0 0;">Select the court-issued Initial Inventory Excel template</p>
            <div id="import-progress" style="margin-top:.5rem;font-size:.8rem;"></div>
          </div>
        </div>
      </div>
    </div>
  </div>
  ${loadWardInfoBanner()}
  <div class="row g-3 mb-3 cover-info-row">
    <div class="col-md-6">
      <div class="summary-box">
        <h2 class="subsection-heading">Required Information</h2>
        ${formRow(col(12,reqLabel('Name of Ward')+textInput('wardName','Full legal name of ward','name')))}
        ${formRow(col(12,reqLabel('Case Number')+textInput('caseNumber','','caseNumber')))}
        ${formRow(col(12,reqLabel('Guardianship Inception Date (GID)')+dateInput('gid')))}
        ${formRow(col(6,reqLabel('County')+countyInputBind('county')))}
      </div>
    </div>
    <div class="col-md-6">
      <div class="summary-box">
        <h2 class="subsection-heading">Guardian &amp; Attorney</h2>
        ${formRow(col(12,reqLabel('Guardian Name(s)')+textInput('guardianName','','name')))}
        ${formRow(col(12,reqLabel('Attorney for Guardian')+textInput('attorneyForGuardian','','name')))}
        ${formRow(col(12,reqLabel('Type of Guardianship')+selectInput('typeOfGuardianship',[['Plenary','Plenary'],['Limited','Limited'],['Voluntary','Voluntary'],['Minor - Person','Minor - Person'],['Minor - Property','Minor - Property'],['Minor - Person - Property','Minor - Person - Property']],D.typeOfGuardianship)))}
        ${formRow(col(12,optLabel('Amended Form?')+checkboxInput('isAmended','Amended Form?')))}
      </div>
    </div>
  </div>
  <div class="summary-box mb-3">
    <h2 class="subsection-heading">Inventory Witnesses</h2>
    <div class="schedule-instructions">A personal property inventory must include the names, addresses, and occupations of witnesses present during the physical inventory of the ward's personal effects.</div>
    ${witnessCardsHTML()}
    <button class="btn btn-outline-primary btn-sm no-print" data-inventory-action="add-witness">+ Add Witness</button>
  </div>
  <div class="mb-3">
    ${pageNav('/')}
  </div>
</div>`;
}

// ═══════════════════════════════════════════════════════
// PAGE: SUMMARY
// ═══════════════════════════════════════════════════════
function getSummaryConfigGuardian(){
  const hasAttest=D.guardians.some(g=>g.name);
  const hasPreparer=!!(D.preparer.name||D.attorney.name);
  const hasBond=!!(D.bondAmount||D.bondWaivedDate);
  const hasService=D.serviceRecipients.some(r=>r.name);
  const s=v=>v?'complete':'not-started';
  return {
    formTitle:'Verified Initial Inventory — Summary',
    infoRows:[
      {label:'Ward Name',value:esc(D.wardName)},
      {label:'Case Number',value:esc(D.caseNumber)},
      {label:'GID',value:esc(D.gid)},
      {label:'County',value:esc(D.county)},
    ],
    leftCards:[
      {
        heading:'Summary I — Schedule A: Real Estate',
        lines:[
          {label:'Schedule A-1 — Real Estate Assets',route:'/a1',value:fmt(calc.totalA1()),id:'totalA1'},
          {label:'Schedule A-2 — Real Estate Liabilities',route:'/a2',value:fmt(calc.totalA2()),id:'totalA2'},
          {label:'Real Estate, Net of Liabilities',value:fmt(calc.netA()),id:'netA',isTotal:true},
        ],
      },
      {
        heading:'Summary I — Schedule B: Cash / Personal Property',
        lines:[
          {label:'Schedule B-1 — Cash &amp; Cash Equivalents',route:'/b1',value:fmt(calc.totalB1()),id:'totalB1'},
          {label:'Schedule B-2 — Personal Property Assets',route:'/b2',value:fmt(calc.totalB2()),id:'totalB2'},
          {label:'Schedule B-3 — Intangible Assets',route:'/b3',value:fmt(calc.totalB3()),id:'totalB3'},
          {label:'Schedule B-4 — Personal Property Liabilities',route:'/b4',value:fmt(calc.totalB4()),id:'totalB4'},
          {label:'Cash / Pers. Property, Net of Liabilities',value:fmt(calc.netB()),id:'netB',isTotal:true},
        ],
      },
      {
        heading:'Summary II — Schedule C: Other Financial Information',
        lines:[
          {label:'Schedule C-1 — Income (Annualized)',route:'/c1',value:fmt(calc.totalC1()),id:'totalC1'},
          {label:'Schedule C-2 — Lawsuits Against Ward',route:'/c2',value:fmt(calc.totalC2()),id:'totalC2'},
          {label:'Schedule C-3 — Lawsuits by Ward',route:'/c3',value:fmt(calc.totalC3()),id:'totalC3'},
          {label:'Schedule C-4 — Trusts',route:'/c4',value:fmt(calc.totalC4()),id:'totalC4'},
          {label:'Schedule C-5 — Joint Owners',route:'/c5',value:fmt(calc.totalC5()),id:'totalC5'},
        ],
      },
    ],
    rightCards:[
      {
        heading:'Part V — Audit Fee &amp; Bond Calculation',
        lines:[
          {label:'Audit Fee (inventory &gt; $25,000)',value:fmt(calc.auditFee()),id:'auditFee'},
          {label:'Restricted Cash (B-1)',value:fmt(calc.restrictedCash()),id:'restrictedCash'},
          {label:'Restricted Intangibles (B-3)',value:fmt(calc.restrictedIntang()),id:'restrictedIntang'},
          {label:'Unrestricted Cash (B-1)',value:fmt(calc.unrestrictedCash()),id:'unrestrictedCash'},
          {label:'Personal Property (B-2)',value:''},
          {label:'Unrestricted Intangibles (B-3)',value:fmt(calc.unrestrictedIntang()),id:'unrestrictedIntang'},
          {label:'Bond Requirement (liquid, unrestricted)',value:fmt(calc.bondRequired()),id:'bondRequired',isTotal:true},
        ],
        footerAction:{label:'Complete Bond &amp; Surety Info (D-4)',route:'/d4'},
      },
      {
        heading:'Attestations &amp; Filings Completion',
        lines:[
          {label:'D-1 — Guardian Attestation',route:'/d1',status:s(hasAttest)},
          {label:'D-2 — Preparer &amp; Attorney',route:'/d2',status:s(hasPreparer)},
          {label:'D-3 — Audit Fee &amp; Safe Deposit',route:'/d3',status:s(D.hasSafeDepositBox===false || (D.hasSafeDepositBox===true && (D.safeDepositBoxFiled===true || D.safeDepositBoxFiled===false)))},
          {label:'D-4 — Bond &amp; Surety Info',route:'/d4',status:s(hasBond)},
          {label:'D-5 — Certificate of Service',route:'/d5',status:s(hasService)},
        ],
      },
    ],
    banner:{title:'VERIFIED INITIAL INVENTORY TOTAL',value:fmt(calc.total()),id:'totalInventory'},
    nextRoute:'/a1',
  };
}
function pageSummary(){ return renderSummaryPage(getSummaryConfigGuardian()); }

// ═══════════════════════════════════════════════════════
// SCHEDULE PAGES
// ═══════════════════════════════════════════════════════
function pageScheduleA1(){
  const entries=D.scheduleA1.map((e,i)=>entryCard(`Property ${i+1}`,i,'a1',`
    ${formRow(col(6,reqLabel('Property Description')+textInput(`scheduleA1.${i}.propertyDescription`,'e.g., Single Family Home','name')),col(3,optLabel('Personal Residence?')+checkboxInput(`scheduleA1.${i}.isPersonalResidence`,'Personal Residence?')),col(3,optLabel('Income Property?')+checkboxInput(`scheduleA1.${i}.isIncomeProperty`,'Income Property?')))}
    ${formRow(col(12,reqLabel('Street Address')+textInput(`scheduleA1.${i}.streetAddress`,'','address')))}
    ${formRow(col(6,reqLabel('City / State / Zip')+textInput(`scheduleA1.${i}.cityStateZip`,'','zip')),col(6,optLabel('Notes (joint ownership, etc.)')+textInput(`scheduleA1.${i}.notes`)))}
    ${formRow(col(4,reqLabel('Full Asset Value as of GID ($)')+numInput(`scheduleA1.${i}.fullAssetValue`)),col(4,reqLabel("Ward's Ownership % (0-100)")+numInput(`scheduleA1.${i}.wardPercent`)),col(4,optLabel("Ward's Value (calculated)")+calcInput(`scheduleA1.${i}.wardValue`)))}
  `)).join('');
  return `<div class="schedule-page">
  <h1>Schedule A-1: Real Estate / Real Property</h1>
  <div class="schedule-instructions">List all real property owned by the ward as of the GID. Attach Property Appraiser records. Ward's Value = Full Asset Value × Ward's % / 100.</div>
  ${addBtn('a1','Property')}${entries||scheduleEmptyHTML('a1','real estate properties')}
  ${totalsBox([["Schedule A-1 Total (Ward's Value)",'totalA1']])}
  ${renderScheduleDocsSection('a1')}
  ${pageNav('/a1')}</div>`;
}

function pageScheduleA2(){
  const entries=D.scheduleA2.map((e,i)=>entryCard(`Liability ${i+1}`,i,'a2',`
    ${formRow(col(6,reqLabel('Lending Institution / Private Lender')+textInput(`scheduleA2.${i}.lenderName`,'','name')),col(3,reqLabel('Type')+selectInput(`scheduleA2.${i}.liabilityType`,[['Mortgage','Mortgage'],['Note','Note'],['Loan','Loan'],['Other Debt','Other Debt']])),col(3,optLabel('Account Number')+textInput(`scheduleA2.${i}.accountNumber`,'','accountNumber')))}
    ${formRow(col(6,reqLabel('Lender Street Address')+textInput(`scheduleA2.${i}.lenderAddress`,'','address')),col(6,reqLabel('Lender City / State / Zip')+textInput(`scheduleA2.${i}.lenderCityStateZip`,'','zip')))}
    ${formRow(col(6,optLabel('Notes (related property, etc.)')+textInput(`scheduleA2.${i}.notes`)))}
    ${formRow(col(4,reqLabel('Full Debt Balance as of GID ($)')+numInput(`scheduleA2.${i}.fullDebtBalance`)),col(4,reqLabel("Ward's % (0-100)")+numInput(`scheduleA2.${i}.wardPercent`)),col(4,optLabel("Ward's Debt Balance (calculated)")+calcInput(`scheduleA2.${i}.wardDebt`)))}
  `)).join('');
  return `<div class="schedule-page">
  <h1>Schedule A-2: Real Estate Liabilities (Mortgages / Notes / Loans)</h1>
  <div class="schedule-instructions">List in the same order as Schedule A-1. Attach mortgage statement or deed for each.</div>
  ${addBtn('a2','Liability')}${entries||scheduleEmptyHTML('a2','real estate liabilities')}
  ${totalsBox([["Schedule A-2 Total (Ward's Debt)",'totalA2']])}
  ${renderScheduleDocsSection('a2')}
  ${pageNav('/a2')}</div>`;
}

function pageScheduleB1(){
  const entries=D.scheduleB1.map((e,i)=>entryCard(`Account ${i+1}`,i,'b1',`
    ${formRow(col(5,reqLabel('Financial Institution / Description')+textInput(`scheduleB1.${i}.institutionName`,'','name')),col(3,reqLabel('Account Type')+textInput(`scheduleB1.${i}.accountType`,'Checking, Savings, CD…','name')),col(2,optLabel('Restricted?')+checkboxInput(`scheduleB1.${i}.isRestricted`,'Restricted')),col(2,optLabel('Account #')+textInput(`scheduleB1.${i}.accountNumber`,'','accountNumber')))}
    ${formRow(col(6,reqLabel('Street Address of Institution')+textInput(`scheduleB1.${i}.streetAddress`,'','address')),col(6,reqLabel('City / State / Zip')+textInput(`scheduleB1.${i}.cityStateZip`,'','zip')))}
    ${formRow(col(4,reqLabel('Full Asset Amount ($)')+numInput(`scheduleB1.${i}.fullAssetAmount`)),col(4,reqLabel("Ward's % (0-100)")+numInput(`scheduleB1.${i}.wardPercent`)),col(4,optLabel("Ward's Amount (calculated)")+calcInput(`scheduleB1.${i}.wardAmt`)))}
  `)).join('');
  return `<div class="schedule-page">
  <h1>Schedule B-1: Cash Assets / Cash Equivalent Assets</h1>
  <div class="schedule-instructions">Mark Restricted if funds are in a court-supervised restricted depository. This affects the bond calculation.</div>
  ${addBtn('b1','Account')}${entries||scheduleEmptyHTML('b1','cash accounts')}
  ${totalsBox([["Schedule B-1 Total (Ward's Amount)",'totalB1'],['— of which Restricted','restrictedCash'],['— of which Unrestricted','unrestrictedCash']])}
  ${renderScheduleDocsSection('b1')}
  ${pageNav('/b1')}</div>`;
}

// Recomposes the free-text `description` field (still the field every
// other consumer of B-2 -- validate(), the print document, the Excel
// export -- reads) from the structured vehicle fields, so splitting Year/
// Make/Model/VIN into their own inputs didn't require touching any of
// those downstream readers.
function syncB2VehicleDescription(i){
  const e=D.scheduleB2[i];
  if(!e)return;
  const parts=[e.vehicleYear,e.vehicleMake,e.vehicleModel].filter(Boolean).join(' ');
  let desc=parts+(e.vehicleVin?(parts?' — VIN: ':'VIN: ')+e.vehicleVin:'');
  if(e.odometerMileage)desc+=(desc?' — ':'')+'Odometer: '+e.odometerMileage+' mi';
  e.description=desc;
}
// Bespoke handler (not data-bind) because checking this box must trigger a
// full re-render to swap the free-text Description field for the Year/
// Make/Model/VIN fields -- bindForms()'s generic checkbox wiring only
// calls afterChange(), which never re-renders the page.
// Deliberately does NOT call syncB2VehicleDescription() here: on an
// existing row the vehicle fields start blank, so syncing immediately
// would overwrite (and silently lose) whatever free-text description was
// already there before any Year/Make/Model/VIN has been typed. Syncing
// only on those fields' own oninput (see pageScheduleB2()) means
// description is only touched once the guardian has actually entered
// replacement data -- unchecking the box before then leaves the original
// description untouched.
function renderB2Fields(e, i){
  if(e.isVehicle){
    return `
    ${formRow(
      col(3,reqLabel('Year')+`<input class="form-control" id="b2-vehicle-year-${i}" inputmode="numeric" maxlength="4" value="${esc(e.vehicleYear)}" data-inventory-input="vehicle" data-inventory-format="year" data-index="${i}" data-field="vehicleYear">`),
      col(3,reqLabel('Make')+`<input class="form-control" id="b2-vehicle-make-${i}" value="${esc(e.vehicleMake)}" data-inventory-input="vehicle" data-index="${i}" data-field="vehicleMake">`),
      col(3,reqLabel('Model')+`<input class="form-control" id="b2-vehicle-model-${i}" value="${esc(e.vehicleModel)}" data-inventory-input="vehicle" data-index="${i}" data-field="vehicleModel">`),
      col(3,reqLabel('VIN')+`<input class="form-control" id="b2-vehicle-vin-${i}" maxlength="17" style="text-transform:uppercase;" value="${esc(e.vehicleVin)}" data-inventory-input="vehicle" data-inventory-format="vin" data-index="${i}" data-field="vehicleVin">`)
    )}
    ${formRow(col(4,reqLabel('Odometer Mileage')+`<input class="form-control" id="b2-vehicle-mileage-${i}" inputmode="numeric" value="${esc(e.odometerMileage)}" data-inventory-input="vehicle" data-inventory-format="mileage" data-index="${i}" data-field="odometerMileage">`))}
    <div class="vehicle-value-links">Look up a value at <a href="https://www.kbb.com/" target="_blank" rel="noopener noreferrer">Kelley Blue Book</a> or <a href="https://www.carfax.com/" target="_blank" rel="noopener noreferrer">Carfax</a> — both are non-affiliated commercial sites, offered only as a convenience; either generally provides an acceptable value. Print or save the page showing the final value you used and upload it below under Supporting Documents.</div>
    `;
  }
  return `
  ${formRow(col(12,reqLabel('Description (include model/serial number for non-vehicle items)')+`<input class="form-control" id="b2-description-${i}" value="${esc(e.description)}" data-bind="scheduleB2.${i}.description" data-input-type="name">`))}
  `;
}

function toggleB2Vehicle(i,checked){
  const e=D.scheduleB2[i];
  if(!e)return;
  e.isVehicle=checked;
  if(checked){
    syncB2VehicleDescription(i);
  }
  autoSave();
  const container=document.getElementById(`b2-fields-${i}`);
  if(container){
    container.innerHTML=renderB2Fields(e, i);
    bindForms();
  }else{
    renderPage(getCurrentPage());
  }
}
function pageScheduleB2(){
  const entries=D.scheduleB2.map((e,i)=>{
    return entryCard(`Item ${i+1}`,i,'b2',`
    ${formRow(col(12,`<label class="form-check"><input class="form-check-input" type="checkbox" ${e.isVehicle?'checked':''} aria-label="This item is a vehicle" data-inventory-change="toggle-vehicle" data-index="${i}"><span class="form-check-label">This item is a vehicle (car, truck, motorcycle, boat, RV, etc.)</span></label>`))}
    <div id="b2-fields-${i}">
      ${renderB2Fields(e, i)}
    </div>
    ${formRow(col(6,reqLabel('Location – Street Address')+textInput(`scheduleB2.${i}.streetAddress`,'','address')),col(6,reqLabel('City / State / Zip')+textInput(`scheduleB2.${i}.cityStateZip`,'','zip')))}
    ${formRow(col(6,reqLabel('Valuation Method &amp; Condition')+textInput(`scheduleB2.${i}.valuationMethod`,'e.g., Kelly Blue Book — fair condition')))}
    ${formRow(col(3,reqLabel('Full Asset Value ($)')+numInput(`scheduleB2.${i}.fullAssetValue`)),col(3,reqLabel("Ward's % (0-100)")+numInput(`scheduleB2.${i}.wardPercent`)),col(3,optLabel("Ward's Value (calculated)")+calcInput(`scheduleB2.${i}.wardB2`)),col(3,optLabel('In Safe Deposit Box?')+checkboxInput(`scheduleB2.${i}.inSafeDepositBox`,'In Safe Deposit Box?')))}
  `);
  }).join('');
  return `<div class="schedule-page">
  <h1>Schedule B-2: Personal Property Assets</h1>
  <div class="schedule-instructions">List household goods, vehicles, jewelry, etc. Include items in safe deposit boxes (also list separately on SDB inventory).</div>
  ${addBtn('b2','Item')}${entries||scheduleEmptyHTML('b2','personal property items')}
  ${totalsBox([["Schedule B-2 Total (Ward's Value)",'totalB2']])}
  ${renderScheduleDocsSection('b2')}
  ${pageNav('/b2')}</div>`;
}

function pageScheduleB3(){
  const entries=D.scheduleB3.map((e,i)=>entryCard(`Asset ${i+1}`,i,'b3',`
    ${formRow(col(12,reqLabel('Description (include account, policy, or certificate number)')+`<input class="form-control" data-bind="scheduleB3.${i}.description" data-input-type="name">`))}
    ${formRow(col(6,reqLabel('Street Address / Custodian Address')+textInput(`scheduleB3.${i}.streetAddress`,'','address')),col(6,reqLabel('City / State / Zip')+textInput(`scheduleB3.${i}.cityStateZip`,'','zip')))}
    ${formRow(col(3,optLabel('Restricted?')+checkboxInput(`scheduleB3.${i}.isRestricted`,'Restricted')),col(3,optLabel('In Safe Deposit Box?')+checkboxInput(`scheduleB3.${i}.inSafeDepositBox`,'In Safe Deposit Box?')))}
    ${formRow(col(4,reqLabel('Full Asset Value ($)')+numInput(`scheduleB3.${i}.fullAssetValue`)),col(4,reqLabel("Ward's % (0-100)")+numInput(`scheduleB3.${i}.wardPercent`)),col(4,optLabel("Ward's Value (calculated)")+calcInput(`scheduleB3.${i}.wardB3`)))}
  `)).join('');
  return `<div class="schedule-page">
  <h1>Schedule B-3: Intangible Assets</h1>
  <div class="schedule-instructions">List stocks, bonds, IRAs, insurance policies, etc. Mark Restricted if in a court-supervised account.</div>
  ${addBtn('b3','Asset')}${entries||scheduleEmptyHTML('b3','intangible assets')}
  ${totalsBox([["Schedule B-3 Total (Ward's Value)",'totalB3'],['— of which Restricted','restrictedIntang'],['— of which Unrestricted','unrestrictedIntang']])}
  ${renderScheduleDocsSection('b3')}
  ${pageNav('/b3')}</div>`;
}

function pageScheduleB4(){
  const entries=D.scheduleB4.map((e,i)=>entryCard(`Liability ${i+1}`,i,'b4',`
    ${formRow(col(5,reqLabel('Lending Institution / Creditor')+textInput(`scheduleB4.${i}.lenderName`,'','name')),col(3,reqLabel('Type')+selectInput(`scheduleB4.${i}.liabilityType`,[['Loan','Loan'],['Note','Note'],['Other Debt','Other Debt']])),col(4,optLabel('Account Number')+textInput(`scheduleB4.${i}.accountNumber`,'','accountNumber')))}
    ${formRow(col(12,reqLabel('Related Personal Property Asset (if secured)')+textInput(`scheduleB4.${i}.relatedProperty`,'e.g., 1992 Toyota Corolla (B-2, Item 2)')))}
    ${formRow(col(12,reqLabel('Lender Street Address / City / State / Zip')+textInput(`scheduleB4.${i}.lenderAddress`,'','address')))}
    ${formRow(col(4,reqLabel('Full Liability Balance ($)')+numInput(`scheduleB4.${i}.fullLiabilityBalance`)),col(4,reqLabel("Ward's % (0-100)")+numInput(`scheduleB4.${i}.wardPercent`)),col(4,optLabel("Ward's Liability Balance (calculated)")+calcInput(`scheduleB4.${i}.wardB4`)))}
  `)).join('');
  return `<div class="schedule-page">
  <h1>Schedule B-4: Liabilities / Secured and Unsecured Debts / Notes / Loans</h1>
  <div class="schedule-instructions">List personal property liabilities only. Real estate liabilities go on Schedule A-2.</div>
  ${addBtn('b4','Liability')}${entries||scheduleEmptyHTML('b4','personal property liabilities')}
  ${totalsBox([["Schedule B-4 Total (Ward's Liability)",'totalB4']])}
  ${renderScheduleDocsSection('b4')}
  ${pageNav('/b4')}</div>`;
}

function pageScheduleC1(){
  const entries=D.scheduleC1.map((e,i)=>entryCard(`Income Source ${i+1}`,i,'c1',`
    ${formRow(col(5,reqLabel('Payer Name')+textInput(`scheduleC1.${i}.payerName`,'e.g., Social Security Administration','name')),col(3,reqLabel('Type of Income')+textInput(`scheduleC1.${i}.typeOfIncome`,'SSI, SSD, Pension…')),col(4,reqLabel('Frequency')+selectInput(`scheduleC1.${i}.frequencyOfPayment`,[['Monthly','Monthly'],['Quarterly','Quarterly'],['Semi-Annually','Semi-Annually'],['Annually','Annually'],['Other','Other']])))}
    ${formRow(col(6,reqLabel('Payer Street Address')+textInput(`scheduleC1.${i}.payerAddress`,'','address')),col(6,reqLabel('Payer City / State / Zip')+textInput(`scheduleC1.${i}.payerCityStateZip`,'','zip')))}
    ${formRow(col(4,reqLabel('Basis for Payment')+textInput(`scheduleC1.${i}.paymentBasis`,'e.g., $600/month')))}
    ${formRow(col(3,reqLabel('Annual Income Amount ($)')+numInput(`scheduleC1.${i}.annualIncomeAmount`)),col(3,reqLabel("Ward's % (0-100)")+numInput(`scheduleC1.${i}.wardPercent`)),col(3,optLabel("Ward's Annual Income (calculated)")+calcInput(`scheduleC1.${i}.wardC1`)))}
  `)).join('');
  return `<div class="schedule-page">
  <h1>Schedule C-1: Income (Annualized)</h1>
  <div class="schedule-instructions">Annualize all amounts. Example: $600/month × 12 = $7,200/year.</div>
  ${addBtn('c1','Income Source')}${entries||scheduleEmptyHTML('c1','income sources')}
  ${totalsBox([["Schedule C-1 Total Annualized Income (Ward's Share)",'totalC1']])}
  ${renderScheduleDocsSection('c1')}
  ${pageNav('/c1')}</div>`;
}

function pageScheduleC2(){
  const entries=D.scheduleC2.map((e,i)=>entryCard(`Lawsuit ${i+1}`,i,'c2',`
    ${formRow(col(6,reqLabel('Claimant / Petitioner Name')+textInput(`scheduleC2.${i}.claimantName`,'','name')),col(6,reqLabel('Type of Lawsuit / Description')+textInput(`scheduleC2.${i}.lawsuitDescription`,'e.g., Mortgage Foreclosure','name')))}
    ${formRow(col(6,reqLabel('Court / Jurisdiction')+textInput(`scheduleC2.${i}.courtJurisdiction`,'e.g., 6th Judicial / Pinellas')),col(6,reqLabel('Case Number')+textInput(`scheduleC2.${i}.caseNumber`)))}
    ${formRow(col(12,reqLabel('Claimant / Attorney Address')+textInput(`scheduleC2.${i}.claimantAddress`,'','address')))}
    ${formRow(col(3,reqLabel('Date Filed')+dateInput(`scheduleC2.${i}.dateFiled`)),col(3,reqLabel('Amount of Claim ($)')+numInput(`scheduleC2.${i}.amountOfClaim`)),col(3,reqLabel("Ward's % (0-100)")+numInput(`scheduleC2.${i}.wardPercent`)),col(3,optLabel("Ward's Share (calculated)")+calcInput(`scheduleC2.${i}.wardC2`)))}
  `)).join('');
  return `<div class="schedule-page">
  <h1>Schedule C-2: Lawsuits Pending Against the Ward</h1>
  ${addBtn('c2','Lawsuit')}${entries||scheduleEmptyHTML('c2','lawsuits pending against the ward')}
  ${totalsBox([["Schedule C-2 Total (Ward's Share of Claims)",'totalC2']])}
  ${renderScheduleDocsSection('c2')}
  ${pageNav('/c2')}</div>`;
}

function pageScheduleC3(){
  const entries=D.scheduleC3.map((e,i)=>entryCard(`Action ${i+1}`,i,'c3',`
    ${formRow(col(6,reqLabel('Defendant / Entity Name')+textInput(`scheduleC3.${i}.defendantName`,'','name')),col(6,reqLabel('Type of Pending Legal Action')+textInput(`scheduleC3.${i}.actionDescription`,'e.g., Negligence, Personal Injury','name')))}
    ${formRow(col(12,reqLabel('Status of Action')+textInput(`scheduleC3.${i}.status`,'e.g., Mediation scheduled for…')))}
    ${formRow(col(6,reqLabel('Court / Jurisdiction / Attorney of Record')+textInput(`scheduleC3.${i}.courtJurisdiction`)),col(6,reqLabel('Case Number')+textInput(`scheduleC3.${i}.caseNumber`)))}
    ${formRow(col(3,reqLabel('Action Date')+dateInput(`scheduleC3.${i}.actionDate`)),col(3,reqLabel('Estimated Settlement ($)')+numInput(`scheduleC3.${i}.estimatedSettlement`)),col(3,reqLabel("Ward's % (0-100)")+numInput(`scheduleC3.${i}.wardPercent`)),col(3,optLabel("Ward's Share (calculated)")+calcInput(`scheduleC3.${i}.wardC3`)))}
  `)).join('');
  return `<div class="schedule-page">
  <h1>Schedule C-3: Lawsuits Pending by the Ward</h1>
  ${addBtn('c3','Action')}${entries||scheduleEmptyHTML('c3','lawsuits pending by the ward')}
  ${totalsBox([["Schedule C-3 Total (Ward's Estimated Share)",'totalC3']])}
  ${renderScheduleDocsSection('c3')}
  ${pageNav('/c3')}</div>`;
}

function pageScheduleC4(){
  const entries=D.scheduleC4.map((e,i)=>entryCard(`Trust ${i+1}`,i,'c4',`
    ${formRow(col(5,reqLabel('Trust Name')+textInput(`scheduleC4.${i}.trustName`)),col(4,reqLabel('Trustee Name')+textInput(`scheduleC4.${i}.trusteeName`)),col(3,reqLabel('Type of Trust')+textInput(`scheduleC4.${i}.trustType`,'Pooled, Special Needs, Living…')))}
    ${formRow(col(6,reqLabel('Trustee Street Address')+textInput(`scheduleC4.${i}.trusteeAddress`,'','address')),col(6,reqLabel('Trustee City / State / Zip')+textInput(`scheduleC4.${i}.trusteeCityStateZip`,'','zip')))}
    ${formRow(col(3,reqLabel('Date Created')+dateInput(`scheduleC4.${i}.dateCreated`)),col(3,optLabel('Account Number')+textInput(`scheduleC4.${i}.accountNumber`,'','accountNumber')))}
    ${formRow(col(3,reqLabel('Trust Amount ($)')+numInput(`scheduleC4.${i}.trustAmount`)),col(3,reqLabel("Ward's % (0-100)")+numInput(`scheduleC4.${i}.wardPercent`)),col(3,optLabel("Ward's Share (calculated)")+calcInput(`scheduleC4.${i}.wardC4`)))}
  `)).join('');
  return `<div class="schedule-page">
  <h1>Schedule C-4: Value of Trusts for the Ward</h1>
  ${addBtn('c4','Trust')}${entries||scheduleEmptyHTML('c4','trusts')}
  ${totalsBox([["Schedule C-4 Total (Ward's Share of Trusts)",'totalC4']])}
  ${renderScheduleDocsSection('c4')}
  ${pageNav('/c4')}</div>`;
}

function pageScheduleC5(){
  const entries=D.scheduleC5.map((e,i)=>entryCard(`Joint Owner ${i+1}`,i,'c5',`
    ${formRow(col(12,reqLabel('Asset Description (cross-ref schedule + item)')+textInput(`scheduleC5.${i}.assetDescription`,'e.g., Single Family Home — Schedule A-1, Item 1','name')))}
    ${formRow(col(6,reqLabel("Joint Owner's Name")+textInput(`scheduleC5.${i}.ownerName`)),col(6,reqLabel('Relationship to Ward')+textInput(`scheduleC5.${i}.relationshipToWard`,'e.g., Spouse, Child')))}
    ${formRow(col(6,reqLabel("Joint Owner's Street Address")+textInput(`scheduleC5.${i}.ownerAddress`,'','address')),col(6,reqLabel("Joint Owner's City / State / Zip")+textInput(`scheduleC5.${i}.ownerCityStateZip`,'','zip')))}
    ${formRow(col(3,reqLabel('Total Asset Value ($)')+numInput(`scheduleC5.${i}.totalAssetValue`)),col(3,reqLabel("Joint Owner's % (0-100)")+numInput(`scheduleC5.${i}.jointOwnerPercent`)),col(3,optLabel("Joint Owner's Value (calculated)")+calcInput(`scheduleC5.${i}.wardC5`)))}
  `)).join('');
  return `<div class="schedule-page">
  <h1>Schedule C-5: Joint Owners of Ward's Assets</h1>
  <div class="schedule-instructions">Cross-reference each asset to the schedule and item number where it appears.</div>
  ${addBtn('c5','Joint Owner')}${entries||scheduleEmptyHTML('c5','joint ownership entries')}
  ${totalsBox([["Schedule C-5 Total (Joint Owners' Combined Value)",'totalC5']])}
  ${renderScheduleDocsSection('c5')}
  ${pageNav('/c5')}</div>`;
}

// ═══════════════════════════════════════════════════════
// ATTESTATION & FILING PAGES (D1–D5)
// ═══════════════════════════════════════════════════════
function pageD1(){
  const cards=D.guardians.map((g,i)=>{
    const isFirst=i===0;
    const title=isFirst?'Guardian #1':`Co-Guardian #${i+1}`;
    const removeBtn=isFirst?'':`<button class="btn btn-sm btn-outline-danger no-print" data-inventory-action="remove-guardian" data-index="${i}">✕ Remove</button>`;
    return `<div class="entry-card mb-3">
      <div class="entry-card-header"><span>${title}</span>${removeBtn}</div>
      <div class="entry-card-body">
        ${formRow(col(5,reqLabel("Guardian's Full Name")+textInput(`guardians.${i}.name`,'','name')),col(3,reqLabel('Signature Date')+dateInput(`guardians.${i}.signatureDate`)),col(4,reqLabel('SSN / EIN')+textInput(`guardians.${i}.ssnEin`,'','ssn')))}
        ${formRow(col(4,reqLabel('Phone Number')+textInput(`guardians.${i}.phone`,'','phone')),col(8,reqLabel('Street Address')+textInput(`guardians.${i}.streetAddress`,'','address')))}
        ${formRow(col(6,reqLabel('City / State / Zip')+textInput(`guardians.${i}.cityStateZip`,'','zip')))}
      </div>
    </div>`;
  }).join('');
  const addCoBtn=D.guardians.length<3?`<button class="btn btn-outline-secondary btn-sm mb-3 no-print" data-inventory-action="add-guardian">+ Add Co-Guardian</button>`:'';
  return `<div class="schedule-page">
  <h1>Part III: Guardian(s) Attestation</h1>
  <div class="schedule-instructions">
    UNDER PENALTIES OF PERJURY, I declare that I have read the foregoing, and the facts alleged are true, to the best of my knowledge and belief.
  </div>
  ${cards}${addCoBtn}
  ${pageNav('/d1')}</div>`;
}

function pageD2(){
  return `<div class="schedule-page">
  <h1>Part IV: Preparer &amp; Guardian Attorney Attestations</h1>
  <h2 style="color:var(--ink);margin:.75rem 0 .4rem;font-size:.95rem;">Preparer Signature</h2>
  <p style="font-size:.78rem;font-style:italic;color:var(--ink-3);">
    If you are the Guardian, Co-Guardian, or Guardian Attorney — DO NOT SIGN HERE.
  </p>
  <div class="entry-card mb-4">
    <div class="entry-card-body">
      ${formRow(col(5,reqLabel("Preparer's Name")+textInput('preparer.name','','name')),col(3,reqLabel('Date')+dateInput('preparer.signatureDate')),col(4,reqLabel('SSN / EIN')+textInput('preparer.ssnEin','','ssn')))}
      ${formRow(col(4,reqLabel('Phone Number')+textInput('preparer.phone','','phone')),col(8,reqLabel('Street Address')+textInput('preparer.streetAddress','','address')))}
      ${formRow(col(6,reqLabel('City / State / Zip')+textInput('preparer.cityStateZip','','zip')))}
    </div>
  </div>
  <h2 style="color:var(--ink);margin:.75rem 0 .4rem;font-size:.95rem;">Guardian Attorney Signature</h2>
  <p style="font-size:.78rem;font-style:italic;color:var(--ink-3);">The attorney may use an electronic signature "/s/".</p>
  <div class="entry-card">
    <div class="entry-card-body">
      ${formRow(col(5,reqLabel("Attorney's Name")+textInput('attorney.name','','name')),col(3,reqLabel('Signature Date')+dateInput('attorney.signatureDate')),col(4,reqLabel('Filing Date (as of)')+dateInput('attorney.filingDate')))}
      ${formRow(col(4,reqLabel('Florida Bar Number')+textInput('attorney.barNumber','','barNumber')),col(4,reqLabel('Phone Number')+textInput('attorney.phone','','phone')))}
      ${formRow(col(8,reqLabel('Street Address')+textInput('attorney.streetAddress','','address')),col(6,reqLabel('City / State / Zip')+textInput('attorney.cityStateZip','','zip')))}
    </div>
  </div>
  ${pageNav('/d2')}</div>`;
}

function pageD3(){
  return `<div class="schedule-page">
  <h1>Part V: Audit Fee &amp; Safe Deposit Box</h1>
  <div class="summary-box mb-3">
    <h2 class="subsection-heading">Audit Fee Schedule (Initial Inventories Only)</h2>
    <p style="font-size:.83rem;margin-bottom:.5rem;">
      Inventories with total property value exceeding $25,000: <strong>$85.00</strong><br>
      Inventories with total property value at or below $25,000: <strong>$0.00</strong>
    </p>
    <div class="summary-line total">
      <span>Calculated Audit Fee (based on total inventory of <strong id="auditFeeBase">${fmt(calc.total())}</strong>)</span>
      <span id="auditFee">${fmt(calc.auditFee())}</span>
    </div>
  </div>
  <div class="summary-box mb-3">
    <h2 class="subsection-heading">Safe Deposit Box</h2>
    <p style="font-size:.83rem;margin:0 0 .5rem;">Does the ward have a safe deposit box or the right to enter a box registered in joint names or in another's name? (FS 744.365(4)) <span class="req">*</span></p>
    <div class="d-flex gap-4 mb-3">
      <div class="form-check">
        <input class="form-check-input" type="radio" name="hasSafeDepositBox" id="sdb-yes" value="true" ${D.hasSafeDepositBox===true?'checked':''} data-inventory-change="set-sdb">
        <label class="form-check-label" for="sdb-yes">Yes</label>
      </div>
      <div class="form-check">
        <input class="form-check-input" type="radio" name="hasSafeDepositBox" id="sdb-no" value="false" ${D.hasSafeDepositBox===false?'checked':''} data-inventory-change="set-sdb">
        <label class="form-check-label" for="sdb-no">No</label>
      </div>
    </div>
    <div id="sdb-filed-row" style="${D.hasSafeDepositBox===true?'':'display:none;'}">
      <label class="form-label d-block mb-1">Safe Deposit Box Inventory Filed with Court? <span class="req">*</span></label>
      <div class="d-flex gap-4 mb-2">
        <div class="form-check">
          <input class="form-check-input" type="radio" name="safeDepositBoxFiled" id="sdb-filed-yes" value="true" ${D.safeDepositBoxFiled===true?'checked':''} data-inventory-change="set-sdb-filed">
          <label class="form-check-label" for="sdb-filed-yes">Yes</label>
        </div>
        <div class="form-check">
          <input class="form-check-input" type="radio" name="safeDepositBoxFiled" id="sdb-filed-no" value="false" ${D.safeDepositBoxFiled===false?'checked':''} data-inventory-change="set-sdb-filed">
          <label class="form-check-label" for="sdb-filed-no">No</label>
        </div>
      </div>
    </div>
  </div>
  ${pageNav('/d3')}</div>`;
}

function pageD4(){
  return `<div class="schedule-page">
  <h1>Part V: Surety Bond &amp; Bond Calculation</h1>
  <div class="summary-box mb-3">
    <h2 class="subsection-heading">Bond Calculation</h2>
    <p style="font-size:.8rem;margin-bottom:.6rem;">Bond amount = all liquid assets less those in a restricted depository. Only real property is excluded.</p>
    <div class="summary-line"><span>B-1 — Cash in Restricted Depository</span><span id="restrictedCash">${fmt(calc.restrictedCash())}</span></div>
    <div class="summary-line"><span>B-3 — Intangible Assets (Restricted)</span><span id="restrictedIntang">${fmt(calc.restrictedIntang())}</span></div>
    <div class="summary-line"><span>B-1 — Cash NOT in Restricted Depository</span><span id="unrestrictedCash">${fmt(calc.unrestrictedCash())}</span></div>
    <div class="summary-line"><span>B-2 — Personal Property Assets</span><span id="totalB2">${fmt(calc.totalB2())}</span></div>
    <div class="summary-line"><span>B-3 — Intangible Assets (Unrestricted)</span><span id="unrestrictedIntang">${fmt(calc.unrestrictedIntang())}</span></div>
    <div class="summary-line total"><span>Total for Bond Requirement (calculated)</span><span id="bondRequired">${fmt(calc.bondRequired())}</span></div>
  </div>
  <div class="summary-box">
    <h2 class="subsection-heading">Surety Bond Details</h2>
    ${formRow(col(4,reqLabel('Bond Amount')+textInput('bondAmount','e.g., $50,000')),col(3,reqLabel('Bond Period – From')+dateInput('bondPeriodFrom')),col(3,reqLabel('Bond Period – To')+dateInput('bondPeriodTo')))}
    ${formRow(col(6,reqLabel('Name of Bonding Company')+textInput('bondingCompany','','name')),col(6,optLabel('If bond waived – date of order')+textInput('bondWaivedDate')))}
  </div>
  ${pageNav('/d4')}</div>`;
}

function pageD5(){
  const cards=D.serviceRecipients.map((r,i)=>{
    const removeBtn=D.serviceRecipients.length>1?`<button class="btn btn-sm btn-outline-danger no-print" data-inventory-action="remove-recipient" data-index="${i}">✕ Remove</button>`:'';
    return `<div class="entry-card mb-2">
      <div class="entry-card-header"><span>Recipient ${i+1}</span>${removeBtn}</div>
      <div class="entry-card-body">
        ${formRow(col(5,reqLabel('Name')+textInput(`serviceRecipients.${i}.name`,'','name')),col(4,reqLabel('Street Address')+textInput(`serviceRecipients.${i}.address`,'','address')),col(3,reqLabel('City / State / Zip')+textInput(`serviceRecipients.${i}.cityStateZip`,'','zip')))}
      </div>
    </div>`;
  }).join('');
  const addBtn2=D.serviceRecipients.length<4?`<button class="btn btn-outline-secondary btn-sm mb-4 no-print" data-inventory-action="add-recipient">+ Add Recipient</button>`:'';
  return `<div class="schedule-page">
  <h1>Part VI: Certificate of Service</h1>
  <h2 style="color:var(--ink);margin:.75rem 0 .4rem;font-size:.95rem;">Recipients</h2>
  ${cards}${addBtn2}
  <h2 style="color:var(--ink);margin:.75rem 0 .4rem;font-size:.95rem;">Attorney Certification</h2>
  <div class="entry-card">
    <div class="entry-card-body">
      ${formRow(col(4,reqLabel('Service Date (on this date)')+dateInput('serviceDate')))}
      ${formRow(col(5,reqLabel("Attorney's Name")+textInput('serviceAttorney.name','','name')),col(3,reqLabel('Signature Date')+dateInput('serviceAttorney.signatureDate')),col(4,reqLabel('Florida Bar Number')+textInput('serviceAttorney.barNumber','','barNumber')))}
      ${formRow(col(4,reqLabel('Phone')+textInput('serviceAttorney.phone','','phone')),col(8,reqLabel('Street Address')+textInput('serviceAttorney.streetAddress','','address')))}
      ${formRow(col(6,reqLabel('City / State / Zip')+textInput('serviceAttorney.cityStateZip','','zip')))}
    </div>
  </div>
  ${pageNav('/d5')}</div>`;
}

// ═══════════════════════════════════════════════════════
// VALIDATION
// ═══════════════════════════════════════════════════════
export function validateGuardian(){
  const errors=[];
  const d=window.D;
  function req(v,label){if(!v||!String(v).trim())errors.push(label);}
  req(d.wardName,'Cover — Name of Ward is required.');
  req(d.caseNumber,'Cover — Case Number is required.');
  if(!d.gid)errors.push('Cover — Guardianship Inception Date (GID) is required.');
  req(d.county,'Cover — County is required.');
  req(d.guardianName,'Cover — Guardian Name(s) is required.');
  req(d.attorneyForGuardian,'Cover — Attorney for Guardian is required.');
  req(d.typeOfGuardianship,'Cover — Type of Guardianship is required.');
  // A schedule left totally untouched -- no rows, and the "I verify there
  // are no X to report" checkbox (scheduleEmptyHTML()/setScheduleNoItems())
  // never checked -- produced NO validate() errors before this, since every
  // per-row check below is inside a .forEach() that simply never runs on an
  // empty array. That's what let a schedule sit blank-and-unconfirmed while
  // still showing 100% complete in the sidebar (computeNavChecks() derives
  // its checks from these same errors) and passing Print Preview's export
  // gate. Mirrors the same "row or checkbox" rule the schedule's own Next
  // button already enforces (isScheduleIncomplete()), so there's exactly
  // one definition of "done" for a schedule, not two that can disagree.
  SCHEDULE_NAV_KEYS.forEach(key=>{
    const dataKey='schedule'+key[0].toUpperCase()+key.slice(1);
    if((d[dataKey]||[]).length===0&&!(d.scheduleNoItems&&d.scheduleNoItems[key])){
      const route=key[0].toUpperCase()+'-'+key.slice(1);
      errors.push(`${route} — Add at least one entry, or check the box verifying there are none, before this schedule counts as complete.`);
    }
  });
  d.scheduleA1.forEach((e,i)=>{const p=`A-1 row ${i+1}`;req(e.propertyDescription,`${p} — Property Description`);req(e.streetAddress,`${p} — Street Address`);req(e.cityStateZip,`${p} — City/State/Zip`);if(e.fullAssetValue<=0)errors.push(`${p} — Full Asset Value must be > 0.`);if(e.wardPercent<=0)errors.push(`${p} — Ward's % must be > 0.`);});
  d.scheduleA2.forEach((e,i)=>{const p=`A-2 row ${i+1}`;req(e.lenderName,`${p} — Lender Name`);req(e.lenderAddress,`${p} — Lender Address`);req(e.lenderCityStateZip,`${p} — Lender City/State/Zip`);if(e.fullDebtBalance<=0)errors.push(`${p} — Full Debt Balance must be > 0.`);});
  d.scheduleB1.forEach((e,i)=>{const p=`B-1 row ${i+1}`;req(e.institutionName,`${p} — Institution Name`);req(e.accountType,`${p} — Account Type`);req(e.streetAddress,`${p} — Street Address`);req(e.cityStateZip,`${p} — City/State/Zip`);if(e.fullAssetAmount<=0)errors.push(`${p} — Full Asset Amount must be > 0.`);});
  d.scheduleB2.forEach((e,i)=>{const p=`B-2 row ${i+1}`;
    if(e.isVehicle){
      req(e.vehicleYear,`${p} — Year`);req(e.vehicleMake,`${p} — Make`);req(e.vehicleModel,`${p} — Model`);req(e.vehicleVin,`${p} — VIN`);req(e.odometerMileage,`${p} — Odometer Mileage`);
    }else{
      req(e.description,`${p} — Description`);
    }
    req(e.streetAddress,`${p} — Street Address`);req(e.cityStateZip,`${p} — City/State/Zip`);req(e.valuationMethod,`${p} — Valuation Method`);if(e.fullAssetValue<=0)errors.push(`${p} — Full Asset Value must be > 0.`);});
  d.scheduleB3.forEach((e,i)=>{const p=`B-3 row ${i+1}`;req(e.description,`${p} — Description`);req(e.streetAddress,`${p} — Street Address`);req(e.cityStateZip,`${p} — City/State/Zip`);if(e.fullAssetValue<=0)errors.push(`${p} — Full Asset Value must be > 0.`);});
  d.scheduleB4.forEach((e,i)=>{const p=`B-4 row ${i+1}`;req(e.lenderName,`${p} — Lender Name`);req(e.relatedProperty,`${p} — Related Property`);req(e.lenderAddress,`${p} — Lender Address`);if(e.fullLiabilityBalance<=0)errors.push(`${p} — Full Liability Balance must be > 0.`);});
  d.scheduleC1.forEach((e,i)=>{const p=`C-1 row ${i+1}`;req(e.payerName,`${p} — Payer Name`);req(e.typeOfIncome,`${p} — Type of Income`);req(e.payerAddress,`${p} — Payer Address`);req(e.paymentBasis,`${p} — Basis for Payment`);if(e.annualIncomeAmount<=0)errors.push(`${p} — Annual Income Amount must be > 0.`);});
  d.scheduleC2.forEach((e,i)=>{const p=`C-2 row ${i+1}`;req(e.claimantName,`${p} — Claimant Name`);req(e.lawsuitDescription,`${p} — Lawsuit Description`);req(e.courtJurisdiction,`${p} — Court/Jurisdiction`);req(e.caseNumber,`${p} — Case Number`);if(!e.dateFiled)errors.push(`${p} — Date Filed is required.`);if(e.amountOfClaim<=0)errors.push(`${p} — Amount of Claim must be > 0.`);});
  d.scheduleC3.forEach((e,i)=>{const p=`C-3 row ${i+1}`;req(e.defendantName,`${p} — Defendant Name`);req(e.actionDescription,`${p} — Action Description`);req(e.status,`${p} — Status`);req(e.courtJurisdiction,`${p} — Court/Jurisdiction`);if(!e.actionDate)errors.push(`${p} — Action Date is required.`);if(e.estimatedSettlement<=0)errors.push(`${p} — Estimated Settlement must be > 0.`);});
  d.scheduleC4.forEach((e,i)=>{const p=`C-4 row ${i+1}`;req(e.trustName,`${p} — Trust Name`);req(e.trusteeName,`${p} — Trustee Name`);req(e.trusteeAddress,`${p} — Trustee Address`);req(e.trusteeCityStateZip,`${p} — Trustee City/State/Zip`);if(!e.dateCreated)errors.push(`${p} — Date Created is required.`);if(e.trustAmount<=0)errors.push(`${p} — Trust Amount must be > 0.`);});
  d.scheduleC5.forEach((e,i)=>{const p=`C-5 row ${i+1}`;req(e.assetDescription,`${p} — Asset Description`);req(e.ownerName,`${p} — Owner Name`);req(e.ownerAddress,`${p} — Owner Address`);req(e.ownerCityStateZip,`${p} — Owner City/State/Zip`);req(e.relationshipToWard,`${p} — Relationship to Ward`);if(e.totalAssetValue<=0)errors.push(`${p} — Total Asset Value must be > 0.`);});
  d.guardians.forEach((g,i)=>{const p=`D-1 Guardian #${i+1}`;req(g.name,`${p} — Name`);if(!g.signatureDate)errors.push(`${p} — Signature Date is required.`);req(g.ssnEin,`${p} — SSN/EIN`);req(g.phone,`${p} — Phone`);req(g.streetAddress,`${p} — Street Address`);req(g.cityStateZip,`${p} — City/State/Zip`);});
  req(d.preparer.name,'D-2 Preparer — Name');if(!d.preparer.signatureDate)errors.push('D-2 Preparer — Date is required.');req(d.preparer.ssnEin,'D-2 Preparer — SSN/EIN');req(d.preparer.phone,'D-2 Preparer — Phone');req(d.preparer.streetAddress,'D-2 Preparer — Street Address');req(d.preparer.cityStateZip,'D-2 Preparer — City/State/Zip');
  req(d.attorney.name,'D-2 Attorney — Name');if(!d.attorney.signatureDate)errors.push('D-2 Attorney — Signature Date is required.');if(!d.attorney.filingDate)errors.push('D-2 Attorney — Filing Date is required.');req(d.attorney.barNumber,'D-2 Attorney — Bar Number');req(d.attorney.phone,'D-2 Attorney — Phone');req(d.attorney.streetAddress,'D-2 Attorney — Street Address');req(d.attorney.cityStateZip,'D-2 Attorney — City/State/Zip');
  if (d.hasSafeDepositBox === null || d.hasSafeDepositBox === undefined) {
    errors.push('D-3 — Safe Deposit Box question must be answered (Yes or No).');
  } else if (d.hasSafeDepositBox === true && (d.safeDepositBoxFiled === null || d.safeDepositBoxFiled === undefined)) {
    errors.push('D-3 — Please indicate whether the Safe Deposit Box inventory has been filed (Yes or No).');
  }
  req(d.bondAmount,'D-4 — Bond Amount');if(!d.bondPeriodFrom)errors.push('D-4 — Bond Period From is required.');if(!d.bondPeriodTo)errors.push('D-4 — Bond Period To is required.');req(d.bondingCompany,'D-4 — Bonding Company');
  d.serviceRecipients.forEach((r,i)=>{const p=`D-5 Recipient ${i+1}`;req(r.name,`${p} — Name`);req(r.address,`${p} — Address`);req(r.cityStateZip,`${p} — City/State/Zip`);});
  if(!d.serviceDate)errors.push('D-5 — Service Date is required.');
  req(d.serviceAttorney.name,'D-5 Attorney — Name');if(!d.serviceAttorney.signatureDate)errors.push('D-5 Attorney — Signature Date is required.');req(d.serviceAttorney.barNumber,'D-5 Attorney — Bar Number');req(d.serviceAttorney.phone,'D-5 Attorney — Phone');req(d.serviceAttorney.streetAddress,'D-5 Attorney — Street Address');req(d.serviceAttorney.cityStateZip,'D-5 Attorney — City/State/Zip');
  return errors;
}

// ═══════════════════════════════════════════════════════
// PRINT VIEW
window.addEntry = addEntry;
window.removeEntry = removeEntry;
window.setScheduleNoItems = setScheduleNoItems;
window.duplicateEntry = duplicateEntry;
window.addGuardian = addGuardian;
window.removeGuardian = removeGuardian;
window.addRecipient = addRecipient;
window.removeRecipient = removeRecipient;
window.addWitness = addWitness;
window.removeWitness = removeWitness;
window.syncB2VehicleDescription = syncB2VehicleDescription;
window.toggleB2Vehicle = toggleB2Vehicle;
window.pageNav = pageNav;
window.validateGuardian = validateGuardian;