import { renderSummaryPage, navStatus } from '../../core/summary-renderer.js';
import { formatDisplayDate } from '../../core/form/date-parser.js';
import { renderLocalSectionGuidance } from '../../core/status/section-status.js';
import { checkDateOrder } from '../../core/validation/date-rules.js';
import { filingCopy, resolveFilingDescriptor } from '../../core/filing/filing-descriptor.js';
import { renderFormField, renderSelectField } from '../../core/form/form-fields.js';
import { addCollectionRow, duplicateCollectionRow, removeCollectionRow } from '../../core/form/schedule-definitions.js';
// Annual Accounting — the sixth feature extraction (Milestone 7, Phases A
// and B of INDEX-SPLIT-PLAN.md's migration sequence: data/pages/nav/
// validate, and print/PDF/Excel import/export). Also covers the
// finalAccounting/trustAccounting aliases -- formEngine(type) maps all
// three to 'annual' everywhere the app dispatches on type, so there is no
// separate code path for them anywhere in this module. Dynamically
// imported by legacy-app.js's mountAnnualFeature()/mountAnnualNav() bridge
// (built on src/core/feature-bridge.js), never statically imported.
//
// legacy-app.js stays a classic (non-module) script (Milestone 1's recorded
// decision), so its top-level function declarations are real `window`
// properties this module can destructure -- but a bare top-level `let`
// (activeInventoryType, currentPage) is not; see src/core/state.js's file
// header for the full explanation. `calcTotalsAnnual`/`annualReconcileState`
// stay legacy globals because the dashboard needs `calcTotalsAnnual` for
// every annual-family ward's card total *before* this module is ever
// loaded (getWardHeadlineTotal(), same "Problem 1" pattern as every prior
// milestone), and `annualReconcileState` stays alongside it for simplicity
// even though it isn't strictly forced the same way (Milestone 7 plan's
// "Confirmed facts"). `n`/`pct` (tiny number helpers) stay bundled with
// them since `calcTotalsAnnual` is their only legacy caller. `esc`/`ic`/the
// formatting and validation helpers/`renderScheduleDocsSection`/
// `guardianHasAnyData` etc. stay legacy because they're shared broadly
// across every extracted feature, not specific to Annual.
const {
  esc, ic, autoSave, navigate, updateNavDots, renderScheduleDocsSection,
  pageIntroRow, browserRecommendationNotice, linkAccordions,
  formatName, formatPhone, formatSSN, formatAddress, formatCityStateZip,
  formatAccountNumber, formatBarNumber, formatCaseNumber, formatCheckNumber,
  finalizeCaseNumber, applyZipLimit, validateSecurityInput,
  sanitizeDecimal, sanitizeNonNegativeDecimal,
  toggleSsnReveal, tooltip, countyAutocompleteHTML, yesNoCheckboxD,
  syncActiveWardNameDisplay, syncGuardianNameDisplay,
  calcTotalsAnnual, annualReconcileState, n, pct,
  guardianHasAnyData, checkExcelCapacity,
} = window;

// print.js/excel.js are dynamically imported once, together, the first time
// this feature mounts -- same reasoning as Simplified Accounting's
// ensureLazyModules(): Part I (pagePart1Annual) has its own Excel-import
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
  window.sanitizeNegativeAmounts();
  let html;
  switch (page) {
    case '/':      html = pagePart1Annual(); break;
    case '/summary': html = renderSummaryPage(getSummaryConfigAnnual()); break;
    case '/p2':    html = pagePart2Annual(); break;
    case '/p3':    html = pagePart3Annual(); break;
    case '/p4':    html = pagePart4Annual(); break;
    case '/p5':    html = pagePart5Annual(); break;
    case '/scha':  html = pageSchAAnnual(); break;
    case '/schb1': html = pageSchB1Annual(); break;
    case '/schb2': html = pageSchB2Annual(); break;
    case '/schb3': html = pageSchB3Annual(); break;
    case '/schb4': html = pageSchB4Annual(); break;
    case '/schc':  html = pageSchCAnnual(); break;
    case '/schd1': html = pageSchD1Annual(); break;
    case '/schd2': html = pageSchD2Annual(); break;
    case '/schd3': html = pageSchD3Annual(); break;
    case '/schd4': html = pageSchD4Annual(); break;
    case '/schd5': html = pageSchD5Annual(); break;
    case '/sche':  html = pageSchEAnnual(); break;
    case '/schf1': html = pageSchF1Annual(); break;
    case '/schf2': html = pageSchF2Annual(); break;
    case '/p67':   html = pagePart67Annual(); break;
    case '/p8':    html = pagePart8Annual(); break;
    case '/p9':    html = pagePart9Annual(); break;
    case '/p10':   html = pagePart10Annual(); break;
    case '/p11':   html = pagePart11Annual(); break;
    case '/print': {
      const capOver = checkExcelCapacity(_excelModule.ANNUAL_EXCEL_CAPS);
      html = _printModule.pagePrintAnnual(capOver);
      break;
    }
    default:       html = pagePart1Annual();
  }
  container.innerHTML = html;
  bindEvents(container);
  container.scrollTop = 0;
  if (page === '/' || !page || page === '/p1') linkAccordions('instructionsZoneAnnual', 'importZonePart1');
  if (page === '/print') await _printModule.mountPreview();
}

export function dispose(container) {
  eventControllers.get(container)?.abort();
  eventControllers.delete(container);
  container.replaceChildren();
}

function setterPath(setter) {
  const assignment = setter.split(';', 1)[0];
  const match = /^D((?:\.[A-Za-z_$][\w$]*|\[\d+\])+)=this\.value$/.exec(assignment);
  if (!match) throw new Error(`Unsupported Annual field binding: ${assignment}`);
  return match[1].replace(/^\./, '').replace(/\[(\d+)\]/g, '.$1');
}

/**
 * Recomputes every schedule total currently on screen, so the figures at the
 * bottom of a schedule page track the row the user is typing in instead of
 * going stale until the next re-render.
 *
 * Declarative on purpose -- the same shape as Guardian Inventory's
 * `[data-calcbind]`/updateCalcFields() pair. A total cell opts in by carrying
 * `data-annual-total="<key>"` naming its key in calcTotalsAnnual()'s result,
 * and nothing else has to be registered anywhere. This replaces a hardcoded
 * `document.getElementById('schA_total')` refresh that left every schedule
 * except A stale, and which no one would have thought to extend when adding
 * a schedule.
 *
 * Cells whose displayed figure is an expression over several keys rather than
 * one key (the Part IX bond worksheet's unrestricted-asset subtractions) are
 * deliberately not tagged: they live on pages that have no editable inputs of
 * their own, so they are always freshly rendered on arrival.
 */
function refreshAnnualTotals() {
  const cells = document.querySelectorAll('[data-annual-total]');
  if (!cells.length) return;
  const t = calcTotalsAnnual();
  cells.forEach((cell) => {
    const key = cell.dataset.annualTotal;
    if (key in t) cell.textContent = fmtAnnual(t[key]);
  });
}

function annualDescriptor(data = window.D) {
  return resolveFilingDescriptor(data).descriptor;
}

function persistAnnualControl(control, applyFormat = true) {
  const path = control.dataset.annualPath || control.dataset.fieldPath;
  if (!path) return;
  if (control.dataset.fieldKind === 'date') {
    // Handled by form-events.js on blur to store canonical YYYY-MM-DD
    return;
  }
  let value = control.type === 'checkbox'
    ? (control.dataset.annualValue === 'yes-no' ? (control.checked ? 'Yes' : 'No') : control.checked)
    : control.value;
  const formatters = {
    account: formatAccountNumber,
    address: formatAddress,
    bar: formatBarNumber,
    case: formatCaseNumber,
    check: formatCheckNumber,
    decimal: sanitizeNonNegativeDecimal,
    'signed-decimal': sanitizeDecimal,
    name: formatName,
    phone: formatPhone,
    security: (current) => validateSecurityInput(control.dataset.annualLabel, current),
    ssn: formatSSN,
    zip: (current) => { applyZipLimit(control); return formatCityStateZip(current); },
  };
  const formatter = applyFormat && formatters[control.dataset.annualFormat];
  if (formatter) {
    value = formatter(value);
    control.value = value;
  }
  window.setPath(window.D, path, value);
  autoSave();
  updateNavDots();
  window.refreshWardInfoCard?.();
  if (control.dataset.syncWardName) syncActiveWardNameDisplay();
  if (control.dataset.syncGuardianName) syncGuardianNameDisplay();
  refreshAnnualTotals();
  // Party write-through (persistence-rewrite Milestone 4) -- see the matching
  // comment in src/form-events.js's persistFormControl(). Annual Accounting
  // binds its own inputs via data-annual-path instead of data-form-path, so
  // it needs this same hook wired in separately.
  const identitySlot = window.identitySlotForPath?.(window.D, path);
  if (identitySlot) window.syncIdentityField(window.D, identitySlot.role, identitySlot.index);
}

function bindEvents(container) {
  eventControllers.get(container)?.abort();
  const controller = new AbortController();
  eventControllers.set(container, controller);
  const options = { signal: controller.signal };
  container.addEventListener('input', (event) => {
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) persistAnnualControl(event.target);
  }, options);
  container.addEventListener('change', (event) => {
    const control = event.target;
    if (control instanceof HTMLSelectElement && control.dataset.annualPath === 'filingType') {
      window.setAccountingFilingType?.(control.value);
      return;
    }
    if (control instanceof HTMLInputElement && control.dataset.annualChange === 'schedule-no-items') {
      if (!window.D.scheduleNoItems) window.D.scheduleNoItems = {};
      window.D.scheduleNoItems[control.dataset.schedule] = control.checked;
      autoSave();
      updateNavDots();
      return;
    }
    if (control instanceof HTMLSelectElement || (control instanceof HTMLInputElement && ['checkbox', 'radio'].includes(control.type))) persistAnnualControl(control);
    if (control instanceof HTMLInputElement && control.dataset.annualChange === 'import-excel') _excelModule.importExcel(control);
  }, options);
  container.addEventListener('focusout', (event) => {
    const control = event.target;
    if (!(control instanceof HTMLInputElement) || control.dataset.annualFormat !== 'case') return;
    control.value = finalizeCaseNumber(control.value);
    persistAnnualControl(control, false);
  }, options);
  container.addEventListener('click', (event) => {
    const control = event.target instanceof Element ? event.target.closest('[data-annual-action]') : null;
    if (!control) return;
    event.preventDefault();
    const collection = control.dataset.collection;
    const index = Number.parseInt(control.dataset.index, 10);
    switch (control.dataset.annualAction) {
      case 'add-row': addAnnualRow(collection, control.dataset.route); break;
      case 'duplicate-row': duplicateAnnualRow(collection, index, control.dataset.route); break;
      case 'link-party': window.showPickPartyModal(control.dataset.role, control.dataset.index); break;
      case 'navigate': navigate(control.dataset.route); break;
      case 'remove-row': removeAnnualRow(collection, index, control.dataset.route); break;
      case 'save-excel': _excelModule.doSaveExcel(); break;
      case 'save-word': _printModule.doSaveDocx(); break;
      case 'save-pdf': _printModule.doSavePdf(); break;
    }
  }, options);
}

export function mountNav(container) {
  buildNavAnnual(container);
}

// Same idea as the Plan-family's planEmptyRow-family row CRUD, but for the
function duplicateAnnualRow(arrName, idx, route) {
  if (duplicateCollectionRow(arrName, idx, window.D)) {
    autoSave();
    navigate(route);
  }
}
window.duplicateAnnualRow = duplicateAnnualRow;

function addAnnualRow(collection, route) {
  if (addCollectionRow(collection, window.D)) {
    autoSave();
    navigate(route);
  }
}
function removeAnnualRow(collection, index, route) {
  if (removeCollectionRow(collection, index, window.D)) {
    autoSave();
    navigate(route);
  }
}

function buildNavAnnual(container){
  container.innerHTML=`
    <div class="nav-section">
      <div class="nav-section-label">${esc(formDisplayName(window.D.inventoryType))}</div>
      <button class="nav-link-item" data-page="/" data-nav="a-p1" data-form-action="navigate" data-route="/">Part I — Case Info</button>
      <button class="nav-link-item" data-page="/summary" data-nav="a-summary" data-form-action="navigate" data-route="/summary">Summary</button>
      <button class="nav-link-item" data-page="/p2" data-nav="a-p2" data-form-action="navigate" data-route="/p2">Part II — Accounting</button>
      <button class="nav-link-item" data-page="/p3" data-nav="a-p3" data-form-action="navigate" data-route="/p3">Part III — Guardians</button>
      <button class="nav-link-item" data-page="/p4" data-nav="a-p4" data-form-action="navigate" data-route="/p4">Part IV — Preparer</button>
      <button class="nav-link-item" data-page="/p5" data-nav="a-p5" data-form-action="navigate" data-route="/p5">Part V — Attorney</button>
    </div>
    <div class="nav-section">
      <div class="nav-section-label">Schedules</div>
      <button class="nav-link-item" data-page="/scha" data-nav="a-scha" data-form-action="navigate" data-route="/scha">Sch A — Income</button>
      <button class="nav-link-item" data-page="/schb1" data-nav="a-schb1" data-form-action="navigate" data-route="/schb1">Sch B1 — Disbursements</button>
      <button class="nav-link-item" data-page="/schb2" data-nav="a-schb2" data-form-action="navigate" data-route="/schb2">Sch B2 — Disbursements</button>
      <button class="nav-link-item" data-page="/schb3" data-nav="a-schb3" data-form-action="navigate" data-route="/schb3">Sch B3 — Disbursements</button>
      <button class="nav-link-item" data-page="/schb4" data-nav="a-schb4" data-form-action="navigate" data-route="/schb4">Sch B4 — Disbursements</button>
      <button class="nav-link-item" data-page="/schc" data-nav="a-schc" data-form-action="navigate" data-route="/schc">Sch C — Gains/Losses</button>
      <button class="nav-link-item" data-page="/schd1" data-nav="a-schd1" data-form-action="navigate" data-route="/schd1">Sch D1 — Assets</button>
      <button class="nav-link-item" data-page="/schd2" data-nav="a-schd2" data-form-action="navigate" data-route="/schd2">Sch D2 — Real Property</button>
      <button class="nav-link-item" data-page="/schd3" data-nav="a-schd3" data-form-action="navigate" data-route="/schd3">Sch D3 — Other Assets</button>
      <button class="nav-link-item" data-page="/schd4" data-nav="a-schd4" data-form-action="navigate" data-route="/schd4">Sch D4 — Restricted Assets</button>
      <button class="nav-link-item" data-page="/schd5" data-nav="a-schd5" data-form-action="navigate" data-route="/schd5">Sch D5 — Liabilities</button>
      <button class="nav-link-item" data-page="/sche" data-nav="a-sche" data-form-action="navigate" data-route="/sche">Sch E — Transfers</button>
      <button class="nav-link-item" data-page="/schf1" data-nav="a-schf1" data-form-action="navigate" data-route="/schf1">Sch F1 — Sales</button>
      <button class="nav-link-item" data-page="/schf2" data-nav="a-schf2" data-form-action="navigate" data-route="/schf2">Sch F2 — Sales</button>
    </div>
    <div class="nav-section">
      <div class="nav-section-label">Certification</div>
      <button class="nav-link-item" data-page="/p67" data-nav="a-p67" data-form-action="navigate" data-route="/p67">Parts VI &amp; VII</button>
      <button class="nav-link-item" data-page="/p8" data-nav="a-p8" data-form-action="navigate" data-route="/p8">Part VIII — Trusts</button>
      <button class="nav-link-item" data-page="/p9" data-nav="a-p9" data-form-action="navigate" data-route="/p9">Part IX — Bond</button>
      <button class="nav-link-item" data-page="/p10" data-nav="a-p10" data-form-action="navigate" data-route="/p10">Part X — Cert. of Service</button>
      <button class="nav-link-item" data-page="/p11" data-nav="a-p11" data-form-action="navigate" data-route="/p11">Part XI — Remuneration</button>
    </div>
    <div class="nav-section">
      <div class="nav-section-label">Output</div>
      <button class="nav-link-item" data-page="/print" data-form-action="navigate" data-route="/print"><span class="nav-link-label">${ic('file',15)}&nbsp; Print Preview</span></button>
    </div>
  `;
}
// Exported (not just module-local) because print.js also needs these --
// statically imported back from here rather than duplicated, same
// safe-circularity pattern as validateAnnual.
export function fmtAnnual(v){if(v===''||v===null||v===undefined)return '';const x=parseFloat(v);if(isNaN(x))return '';return x<0?`(${Math.abs(x).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})})`:`${x.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}`;}
export function fmtD(s){return s?String(s).substring(0,10):'';}
function inpD(label,val,setter,req=false,type='text'){
  return renderFormField({
    path: setterPath(setter),
    label,
    value: val,
    type,
    required: req,
  });
}
function selD(label,val,setter,opts){
  return renderSelectField({
    path: setterPath(setter),
    label,
    value: val,
    options: opts,
  });
}
// County-field counterpart to selD() -- same custom-setter-string
// convention, but a filtered-autocomplete text input instead of a <select>.
function countyInputD(label,val,setter){
  const inputId='cty_'+Math.random().toString(36).slice(2,9);
  return `<div class="mb-2"><label class="form-label" for="${inputId}">${label}</label>${countyAutocompleteHTML(inputId,val,setterPath(setter))}</div>`;
}
function inpDWithTooltip(label,tooltipKey,val,setter,req=false,type='text'){
  return renderFormField({
    path: setterPath(setter),
    label,
    value: val,
    type,
    required: req,
    tooltipKey,
  });
}
function pageNavAnnual(prev,next){
  const targetRoute=next||'/print';
  const label=next?'Next →':'Preview & Export →';
  return `<div class="page-nav-wrap no-print">
    <div class="page-nav d-flex justify-content-between align-items-center">
      ${prev?`<button class="btn btn-outline-primary btn-sm" data-form-action="navigate" data-route="${prev}">← Back</button>`:'<span></span>'}
      <button id="page-next-btn" class="btn btn-primary btn-sm" data-form-action="navigate" data-route="${targetRoute}">${label}</button>
    </div>
    <div id="page-local-guidance"></div>
  </div>`;
}
function getSummaryConfigAnnual(){
  const d=window.D;
  const descriptor=annualDescriptor(d);
  const nav=window.computeNavChecks();
  const t=calcTotalsAnnual();
  const f=v=>fmtAnnual(v)||'—';
  const fd=v=>v?String(v).substring(0,10):'—';
  return {
    formTitle:`${descriptor?.displayName||'Annual Accounting'} — Summary`,
    infoRows:[
      {label:'Ward Name',value:esc(d.wardName)},
      {label:'Case Number',value:esc(d.caseNumber)},
      {label:'Period',value:fd(d.periodFrom)+' – '+fd(d.periodTo)},
      {label:'Filing Type',value:esc(d.filingType||'Annual')+(d.amendedForm==='Yes'?' (Amended)':'')},
      {label:'Guardian',value:esc(d.guardian)},
      {label:'Attorney',value:esc(d.attorney)},
      {label:'County',value:esc(d.county)},
    ],
    leftCards:[
      {
        heading:'Financial Quick Summary',
        lines:[
          {label:'Starting Balance',value:f(d.startingBalance)},
          {label:'Sch A — Income',value:f(t.schA)},
          {label:'Total Disbursements (B-1 thru B-4)',value:f(t.totalDisb)},
          {label:'Sch C — Capital Adj. Net',value:f(t.schC_net)},
          {label:'Net Assets at End of Period',value:f(t.netAssets),isTotal:true},
          {label:'Net Assets from Sch D (should match)',value:f(t.netAssetsFromD)},
        ],
      },
      {
        heading:'Section Completion',
        lines:[
          {label:'Part I — Case Info',route:'/',status:navStatus(nav,'a-p1')},
          {label:'Part II — Accounting',route:'/p2',status:navStatus(nav,'a-p2')},
          {label:'Part III — Guardians',route:'/p3',status:navStatus(nav,'a-p3')},
          {label:'Part IV — Preparer',route:'/p4',status:navStatus(nav,'a-p4')},
          {label:'Part V — Attorney',route:'/p5',status:navStatus(nav,'a-p5')},
          {label:'Parts VI &amp; VII',route:'/p67',status:navStatus(nav,'a-p67')},
          {label:'Part VIII — Trusts',route:'/p8',status:navStatus(nav,'a-p8')},
          {label:'Part IX — Bond',route:'/p9',status:navStatus(nav,'a-p9')},
          {label:'Part X — Cert. of Service',route:'/p10',status:navStatus(nav,'a-p10')},
          {label:'Part XI — Remuneration',route:'/p11',status:navStatus(nav,'a-p11')},
        ],
      },
    ],
    rightCards:[{
      heading:'Schedules',
      lines:[
        {label:'Sch A — Income',route:'/scha',status:navStatus(nav,'a-scha')},
        {label:'Sch B1 — Disbursements',route:'/schb1',status:navStatus(nav,'a-schb1')},
        {label:'Sch B2 — Disbursements',route:'/schb2',status:navStatus(nav,'a-schb2')},
        {label:'Sch B3 — Disbursements',route:'/schb3',status:navStatus(nav,'a-schb3')},
        {label:'Sch B4 — Disbursements',route:'/schb4',status:navStatus(nav,'a-schb4')},
        {label:'Sch C — Gains/Losses',route:'/schc',status:navStatus(nav,'a-schc')},
        {label:'Sch D1–D5 — Assets & Liabilities',route:'/schd1',status:navStatus(nav,['a-schd1','a-schd2','a-schd3','a-schd4','a-schd5'])},
        {label:'Sch E — Transfers',route:'/sche',status:navStatus(nav,'a-sche')},
        {label:'Sch F1–F2 — Sales',route:'/schf1',status:navStatus(nav,['a-schf1','a-schf2'])},
      ],
    }],
    banner:{title:'NET ASSETS ON HAND',value:f(t.netAssetsFromD)},
    nextRoute:'/p2',
  };
}
// Exported (not just module-local) because print.js's buildPrintHTMLAnnual()
// also needs it, for the same Schedule B-4 category-total table --
// statically imported back from here, same pattern as fmtAnnual/fmtD above.
export const DISB_CATS=['Accounting','Bank Service Charges','Care Facility','Clothing / Personal Needs','Entertainment / Travel','Food / Meals','Insurance: Automobile / Property','Insurance: Health / Life','Medical / Pharmacy','Mortgage','Nurse / Care Giver / Employer Tax','Other Legal Expenses','Rent','Repairs / Maintenance','Taxes: Income','Taxes: Intangible','Utilities','Other'];
const LIAB_TYPES=['Mortgage','Note','Loan','Other'];
const GUARDIAN_REL=['Professional Guardian','Family/Non-Professional Guardian','Other/Non-Professional Guardian'];

function pagePart1Annual(){
  const d=window.D; const t=calcTotalsAnnual();
  return `<div class="schedule-page">
  <h1>Part I — Required Information</h1>
  <div class="instructions-import-row">
    <div class="accordion mb-0">
      <div class="accordion-item">
        <h2 class="accordion-header">
          <button class="accordion-button collapsed py-2" type="button" data-bs-toggle="collapse" data-bs-target="#instructionsZoneAnnual" aria-expanded="false">
            ${ic('clipboard',15)} General Instructions
          </button>
        </h2>
        <div id="instructionsZoneAnnual" class="accordion-collapse collapse">
          <div class="accordion-body" style="padding:1rem 1.25rem;">
            <ul style="margin:0;padding-left:1.4rem;font-size:.8rem;">
              <li>Fields marked with an asterisk (<span class="req">*</span>) are required before export.</li>
              <li>Ward Name and Case Number auto-populate all schedule headers.</li>
              <li><strong style="color:var(--danger-text);">CAUTION on Ward's % fields:</strong> Enter percentages as plain digits (70, not 0.70).</li>
              <li>Use Print Preview to save as PDF or Excel for filing.</li>
            </ul>
            ${browserRecommendationNotice('margin-top:0.75rem;margin-bottom:0;')}
          </div>
        </div>
      </div>
    </div>
    <div class="accordion mb-0">
      <div class="accordion-item">
        <h2 class="accordion-header">
          <button class="accordion-button collapsed py-2" type="button" data-bs-toggle="collapse" data-bs-target="#importZonePart1" aria-expanded="false">
            <svg class="ic" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M4 13.6 6.2 4.6h11.6L20 13.6v5.8H4Z"/><path d="M4 13.6h4.2l1.2 2.4h5.2l1.2-2.4H20"/></svg> Import Excel File (existing annual accounting template)
          </button>
        </h2>
        <div id="importZonePart1" class="accordion-collapse collapse">
          <div class="accordion-body import-zone-body p-4 text-center">
            <label class="btn btn-outline-primary btn-sm" style="cursor:pointer;">
              <svg class="ic" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M3.4 6.4h5.6l2 2.2h7.6v2.2"/><path d="M3.4 8.6 5.6 19h13.2l2.2-8.2H5.6Z"/></svg> Select File
              <input type="file" accept=".xlsx" class="d-none" data-annual-change="import-excel">
            </label>
            <p class="mt-2 mb-0" style="color:var(--ink-3);font-size:.8rem;">Select the previously exported Annual Accounting Excel file</p>
            <div id="import-progress" class="mt-2" style="font-size:.8rem;"></div>
          </div>
        </div>
      </div>
    </div>
  </div>
  <div class="row g-3 mb-3 cover-info-row">
    <div class="col-md-6">
      <div class="summary-box">
        <h2 class="subsection-heading">Required Information</h2>
        ${inpD('Name of Ward',d.wardName,"D.wardName=this.value",true)}
        <div class="row g-2">
          <div class="col-md-6">${inpDWithTooltip('Case Number','case_number',d.caseNumber,"D.caseNumber=this.value",true)}</div>
          <div class="col-md-6">${inpD('Guardianship Inception Date (GID)',d.gid,"D.gid=this.value",true,'date')}</div>
        </div>
        <div class="row g-2">
          <div class="col-md-6">${inpD('Period From',d.periodFrom,"D.periodFrom=this.value",true,'date')}</div>
          <div class="col-md-6">${inpD('Period To',d.periodTo,"D.periodTo=this.value",true,'date')}</div>
        </div>
        <div class="row g-2">
          <div class="col-md-6">${selD('Filing Type',d.filingType,"D.filingType=this.value",['Annual','Final','Trust'])}</div>
          <div class="col-md-6">${yesNoCheckboxD('Amended Form?',d.amendedForm,'amendedForm')}</div>
        </div>
      </div>
    </div>
    <div class="col-md-6">
      <div class="summary-box">
        <h2 class="subsection-heading">Guardian &amp; Attorney</h2>
        ${inpD('Guardian',d.guardian,"D.guardian=this.value",true)}
        <div class="row g-2">
          <div class="col-md-8">${inpD('Attorney for Guardian',d.attorney,"D.attorney=this.value")}</div>
          <div class="col-md-4">${countyInputD('County',d.county,"D.county=this.value")}</div>
        </div>
        ${inpD('Type of Guardianship',d.typeOfGuardianship,"D.typeOfGuardianship=this.value")}
        ${inpD('Related Case Numbers (siblings/relatives with guardianships)',d.relatedCaseNumbers,"D.relatedCaseNumbers=this.value")}
      </div>
    </div>
  </div>
  <div class="summary-box mt-3">
    <h2 class="subsection-heading">Quick Summary (auto-calculated)</h2>
    <div class="summary-line"><span>Starting Balance</span><span>${fmtAnnual(d.startingBalance)||'—'}</span></div>
    <div class="summary-line"><span>Sch A — Income</span><span>${fmtAnnual(t.schA)}</span></div>
    <div class="summary-line"><span>Total Disbursements (B-1 thru B-4)</span><span>${fmtAnnual(t.totalDisb)}</span></div>
    <div class="summary-line"><span>Sch C — Capital Adj. Net</span><span>${fmtAnnual(t.schC_net)}</span></div>
    <div class="summary-line total"><span>Net Assets at End of Period</span><span>${fmtAnnual(t.netAssets)}</span></div>
    <div class="summary-line" style="margin-top:.35rem;"><span>Net Assets from Sch D (should match above)</span><span>${fmtAnnual(t.netAssetsFromD)}</span></div>
  </div>
  ${pageNavAnnual(null,'/summary')}
  </div>`;
}

// ── Part II ──────────────────────────────────────────────
function pagePart2Annual(){
  const d=window.D; const t=calcTotalsAnnual();
  const fee=t.auditFee;
  return `<div class="schedule-page">
  <h1>Part II — Guardian Certification &amp; Audit Fee</h1>
  <div class="attestation-text">The undersigned guardian certifies that said guardian has obtained a receipt or canceled check for all expenditures and disbursements made on behalf of the ward, which said guardian will preserve along with other substantiating papers for a three (3) year period after discharge and will upon request make available for inspection as the court may order. (As per F.S. 744.3678 (3).)</div>
  <div class="summary-box">
    <h2 class="subsection-heading">Audit Fee Schedule — Annual Accountings per FS 744.3678</h2>
    <div class="summary-line"><span>Estates with value of $25,000 or less</span><span>$20.00</span></div>
    <div class="summary-line"><span>From $25,000.01 up to and including $100,000</span><span>$85.00</span></div>
    <div class="summary-line"><span>From $100,000.01 up to and including $500,000</span><span>$170.00</span></div>
    <div class="summary-line"><span>In excess of $500,000</span><span>$250.00</span></div>
    <div class="summary-line total"><span>Applicable Fee (based on total assets ${fmtAnnual(t.netAssetsFromD)})</span><span><strong>${fee.toFixed(2)}</strong></span></div>
  </div>
  <div class="row g-2">
    <div class="col-md-4">${inpD('Starting Balance (Net Assets per Prior Report)',d.startingBalance,"D.startingBalance=this.value",false,'number')}</div>
  </div>
  ${pageNavAnnual('/summary','/p3')}
  </div>`;
}

// ── Part III ─────────────────────────────────────────────
function pagePart3Annual(){
  const d=window.D;
  const labels=['Guardian #1','Co-Guardian #2','Co-Guardian #3'];
  let cards='';
  d.guardians.forEach((g,i)=>{
    // Guardian #1 is the filer and always stays; only co-guardians can be
    // removed, matching Guardian Inventory's D-1 page.
    const removeBtn=i===0?'':`<button type="button" class="btn btn-outline-danger btn-sm" data-annual-action="remove-row" data-collection="guardians" data-index="${i}" data-route="/p3">\u2715 Remove</button>`;
    cards+=`<div class="col-12 col-lg-6"><div class="entry-card mb-0 h-100">
      <div class="entry-card-header d-flex justify-content-between align-items-center gap-2"><span>${labels[i]}</span><span class="entry-card-actions d-flex gap-2"><button type="button" class="btn btn-outline-secondary btn-sm" data-annual-action="link-party" data-role="guardian" data-index="${i}">Link Person</button>${removeBtn}</span></div>
      <div class="entry-card-body">
        <div class="row g-2">
          <div class="col-md-5">${inpD(`${labels[i]}'s Name`,g.name,`D.guardians[${i}].name=this.value`,true)}</div>
          <div class="col-md-3">${inpDWithTooltip('Signature Date','signature_date',g.signatureDate,`D.guardians[${i}].signatureDate=this.value`,true,'date')}</div>
          <div class="col-md-4">${inpDWithTooltip('SSN / EIN','ssn_ein',g.ssn,`D.guardians[${i}].ssn=this.value`,true)}</div>
          <div class="col-md-4">${inpD('Phone Number',g.phone,`D.guardians[${i}].phone=this.value`,true)}</div>
          <div class="col-md-8">${inpD('Email Address',g.email,`D.guardians[${i}].email=this.value`,true)}</div>
          <div class="col-md-6">${inpD('Mailing Street Address',g.mailingStreet,`D.guardians[${i}].mailingStreet=this.value`,true)}</div>
          <div class="col-md-6">${inpD('Mailing City / State / Zip',g.mailingCityStateZip,`D.guardians[${i}].mailingCityStateZip=this.value`,true)}</div>
          <div class="col-md-6">${inpD('Residence / Office Street Address',g.officeStreet,`D.guardians[${i}].officeStreet=this.value`,true)}</div>
          <div class="col-md-6">${inpD('Residence / Office City / State / Zip',g.officeCityStateZip,`D.guardians[${i}].officeCityStateZip=this.value`,true)}</div>
        </div>
      </div>
    </div></div>`;
  });
  const addCoBtn=d.guardians.length<3?`<button type="button" class="btn btn-outline-secondary btn-sm mb-3 no-print" data-annual-action="add-row" data-collection="guardians" data-route="/p3">+ Add Co-Guardian</button>`:'';
  return `<div class="schedule-page">
  <h1>Part III — Guardian(s) Signature &amp; Declaration</h1>
  <div class="attestation-text">UNDER PENALTIES OF PERJURY, I declare that I have read and examined the foregoing return and that, to the best of my knowledge and belief, it constitutes a full and correct account of all the ward's property of which this guardian has control, and is a complete report of all cash and property transactions and of all receipts and any disbursements by me from <strong>${fmtD(d.periodFrom)||'[from date]'}</strong> through <strong>${fmtD(d.periodTo)||'[to date]'}</strong>.</div>
  <div class="row g-3 card-grid-2col mb-3">${cards}</div>
  ${addCoBtn}
  ${pageNavAnnual('/p2','/p4')}
  </div>`;
}

// ── Part IV ──────────────────────────────────────────────
function pagePart4Annual(){
  const d=window.D; const p=d.preparer;
  const copy=filingCopy(annualDescriptor(d));
  return `<div class="schedule-page">
  <h1>Part IV — Preparer Attestation</h1>
  <div class="attestation-text">${esc(copy.preparerStatement(d.wardName||'[ward]',fmtD(d.periodFrom),fmtD(d.periodTo))).replace(/\n/g,'<br>')}</div>
  <div style="color:var(--brand-text);font-size:.8rem;font-weight:700;margin-bottom:.75rem;">*** If you are the Guardian, Co-Guardian, or Guardian Attorney — DO NOT SIGN HERE. ***</div>
  <div class="row g-3 card-grid-2col">
    <div class="col-12 col-lg-6">
      <div class="entry-card mb-0 h-100">
        <div class="entry-card-header d-flex justify-content-between align-items-center gap-2">
          <span>Preparer Attestation</span>
          <button type="button" class="btn btn-outline-secondary btn-sm" data-annual-action="link-party" data-role="preparer" data-index="0">Link Person</button>
        </div>
        <div class="entry-card-body">
          <div class="row g-2">
            <div class="col-md-5">${inpD("Preparer's Name",p.name,"D.preparer.name=this.value",true)}</div>
            <div class="col-md-3">${inpDWithTooltip("Signature Date",'signature_date',p.signatureDate,"D.preparer.signatureDate=this.value",true,'date')}</div>
            <div class="col-md-4">${inpDWithTooltip("Preparer's SSN / EIN",'ssn_ein',p.ssn,"D.preparer.ssn=this.value",true)}</div>
            <div class="col-md-4">${inpD("Preparer's Phone Number",p.phone,"D.preparer.phone=this.value",true)}</div>
            <div class="col-md-8">${inpD("Preparer's Street Address",p.street,"D.preparer.street=this.value",true)}</div>
            <div class="col-12">${inpD("Preparer's City / State / Zip Code",p.cityStateZip,"D.preparer.cityStateZip=this.value",true)}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
  ${pageNavAnnual('/p3','/p5')}
  </div>`;
}

// ── Part V ───────────────────────────────────────────────
function pagePart5Annual(){
  const d=window.D;
  const copy=filingCopy(annualDescriptor(d));
  return `<div class="schedule-page">
  <h1>Part V — Guardian Attorney Signature</h1>
  <div class="attestation-text">${esc(copy.attorneyStatement(d.wardName||'[ward]',fmtD(d.periodFrom),fmtD(d.periodTo),d.attorney_county||d.county||'[county]'))}</div>
  <div class="row g-3 card-grid-2col">
    <div class="col-12 col-lg-6">
      <div class="entry-card mb-0 h-100">
        <div class="entry-card-header d-flex justify-content-between align-items-center gap-2">
          <span>Guardian Attorney Attestation</span>
          <button type="button" class="btn btn-outline-secondary btn-sm" data-annual-action="link-party" data-role="attorney" data-index="0">Link Person</button>
        </div>
        <div class="entry-card-body">
          <div class="row g-2">
            <div class="col-md-5">${inpD("Attorney Name (linked to Part I)",d.attorney,"D.attorney=this.value")}</div>
            <div class="col-md-3">${inpDWithTooltip("Signature Date",'signature_date',d.attorney_signatureDate,"D.attorney_signatureDate=this.value",true,'date')}</div>
            <div class="col-md-4">${inpD("Bar Number",d.attorney_bar,"D.attorney_bar=this.value",true)}</div>
            <div class="col-md-4">${inpD("Phone Number",d.attorney_phone,"D.attorney_phone=this.value",true)}</div>
            <div class="col-md-4">${inpD("Primary Email (e-filing)",d.attorney_email,"D.attorney_email=this.value",true,'email')}</div>
            <div class="col-md-4">${inpD("Secondary Email (optional)",d.attorney_secondaryEmail,"D.attorney_secondaryEmail=this.value",false,'email')}</div>
            <div class="col-md-8">${inpD("Street Address",d.attorney_street,"D.attorney_street=this.value",true)}</div>
            <div class="col-md-8">${inpD("City / State / Zip Code",d.attorney_cityStateZip,"D.attorney_cityStateZip=this.value",true)}</div>
            <div class="col-md-4">${countyInputD("County",d.attorney_county,"D.attorney_county=this.value")}</div>
          </div>
        </div>
      </div>
    </div>
  ${pageNavAnnual('/p4','/scha')}
  </div>`;
}

function entryCardHeaderAnnual(title, collection, idx, route) {
  return `<div class="entry-card-header">
    <span>${title}</span>
    <span class="entry-card-actions">
      <button class="btn btn-sm btn-outline-secondary" title="Add a copy of this line below" data-annual-action="duplicate-row" data-collection="${collection}" data-index="${idx}" data-route="${route}">${ic('copy',13)} Duplicate</button>
      <button class="btn btn-sm btn-outline-danger" data-annual-action="remove-row" data-collection="${collection}" data-index="${idx}" data-route="${route}">✕ Remove</button>
    </span>
  </div>`;
}

function scheduleEmptyHTMLAnnual(key, noun, collectionKey) {
  const checked = !!(window.D && window.D.scheduleNoItems && window.D.scheduleNoItems[key]);
  return `<div class="schedule-empty">
    <label class="schedule-empty-check">
      <input type="checkbox" ${checked ? 'checked' : ''} data-annual-change="schedule-no-items" data-schedule="${key}" data-collection="${collectionKey}">
      <span>I verify there are no ${noun} to report for this schedule.</span>
    </label>
  </div>`;
}

// ── Schedule A — Income ──────────────────────────────────
function pageSchAAnnual(){
  const d=window.D; const t=calcTotalsAnnual();
  let rows='';
  if(d.schA && d.schA.length>0){
    rows='<div class="row g-3 schedule-entry-grid">'+d.schA.map((r,i)=>`<div class="col-12 col-lg-6"><div class="entry-card mb-2">
      ${entryCardHeaderAnnual(`Line ${i+1}`,'schA',i,'/scha')}
      <div class="entry-card-body"><div class="row g-2">
        <div class="col-md-4">${inpD('Income Source / Payer',r.payer,`D.schA[${i}].payer=this.value`,true)}</div>
        <div class="col-md-4">${inpD('Description',r.description,`D.schA[${i}].description=this.value`,true)}</div>
        <div class="col-md-2">${inpD('Bank Name',r.bank,`D.schA[${i}].bank=this.value`,true)}</div>
        <div class="col-md-2">${inpD('Account #',r.accountNo,`D.schA[${i}].accountNo=this.value`,true)}</div>
        <div class="col-md-3">${inpD("Ward's Income Amount ",r.amount,`D.schA[${i}].amount=this.value`,false,'number')}</div>
      </div></div>
    </div></div>`).join('')+'</div>';
  } else {
    rows=scheduleEmptyHTMLAnnual('scha','income receipts','schA');
  }
  return `<div class="schedule-page">
  <h1>Schedule A — Income Received During Period</h1>
  <div class="schedule-instructions">Include all types of income such as SSI, Retirement, Disability benefits, interest or rental income. Do NOT include receipts from sale/disposal of principal assets (those go in Schedule C).</div>
  ${rows}
  <button class="btn btn-outline-primary btn-sm mb-2" data-annual-action="add-row" data-collection="schA" data-route="/scha">+ Add Income Line</button>
  <div class="schedule-totals"><div class="tbl"><div class="tr"><div class="td">Schedule A Total — Income/Receipts Received During Period</div><div class="td" data-annual-total="schA">${fmtAnnual(t.schA)}</div></div></div></div>
  ${renderScheduleDocsSection('schA')}
  ${pageNavAnnual('/p5','/schb1')}
  </div>`;
}

// ── Schedule B-1 — Attorney Fees ─────────────────────────
function pageSchB1Annual(){
  const d=window.D; const t=calcTotalsAnnual();
  let rows='';
  if(d.schB1 && d.schB1.length>0){
    rows='<div class="row g-3 schedule-entry-grid">'+d.schB1.map((r,i)=>`<div class="col-12 col-lg-6"><div class="entry-card mb-2">
      ${entryCardHeaderAnnual(`Line ${i+1}`,'schB1',i,'/schb1')}
      <div class="entry-card-body"><div class="row g-2">
        <div class="col-md-3">${inpD('Bank Account #',r.bankAcct,`D.schB1[${i}].bankAcct=this.value`,true)}</div>
        <div class="col-md-2">${inpD('Check #',r.checkNo,`D.schB1[${i}].checkNo=this.value`,true)}</div>
        <div class="col-md-2">${inpD('Period From',r.periodFrom,`D.schB1[${i}].periodFrom=this.value`,true,'date')}</div>
        <div class="col-md-2">${inpD('Period To',r.periodTo,`D.schB1[${i}].periodTo=this.value`,true,'date')}</div>
        <div class="col-md-2">${inpD('Date Paid',r.datePaid,`D.schB1[${i}].datePaid=this.value`,true,'date')}</div>
        <div class="col-md-4">${inpD('Payee',r.payee,`D.schB1[${i}].payee=this.value`,true)}</div>
        <div class="col-md-3">${inpD('Court Order Date',r.courtOrderDate,`D.schB1[${i}].courtOrderDate=this.value`,true,'date')}</div>
        <div class="col-md-3">${inpD('Amount',r.amount,`D.schB1[${i}].amount=this.value`,true,'number')}</div>
      </div></div>
    </div></div>`).join('')+'</div>';
  } else {
    rows=scheduleEmptyHTMLAnnual('schb1','attorney fees and costs','schB1');
  }
  return `<div class="schedule-page">
  <h1>Schedule B-1 — Attorney Fees and Costs</h1>
  <div class="schedule-instructions">Bank Account Number = The Financial Institution's Account Number (NOT its Routing Number).</div>
  ${rows}
  <button class="btn btn-outline-primary btn-sm mb-2" data-annual-action="add-row" data-collection="schB1" data-route="/schb1">+ Add Entry</button>
  <div class="schedule-totals"><div class="tbl"><div class="tr"><div class="td">Schedule B-1 Total — Attorney Fees and Costs</div><div class="td" data-annual-total="schB1">${fmtAnnual(t.schB1)}</div></div></div></div>
  ${renderScheduleDocsSection('schB1')}
  ${pageNavAnnual('/scha','/schb2')}
  </div>`;
}

// ── Schedule B-2 — Guardian Fees ─────────────────────────
function pageSchB2Annual(){
  const d=window.D; const t=calcTotalsAnnual();
  let rows='';
  if(d.schB2 && d.schB2.length>0){
    rows='<div class="row g-3 schedule-entry-grid">'+d.schB2.map((r,i)=>`<div class="col-12 col-lg-6"><div class="entry-card mb-2">
      ${entryCardHeaderAnnual(`Line ${i+1}`,'schB2',i,'/schb2')}
      <div class="entry-card-body"><div class="row g-2">
        <div class="col-md-3">${inpD('Bank Account #',r.bankAcct,`D.schB2[${i}].bankAcct=this.value`,true)}</div>
        <div class="col-md-2">${inpD('Check #',r.checkNo,`D.schB2[${i}].checkNo=this.value`,true)}</div>
        <div class="col-md-2">${inpD('Period From',r.periodFrom,`D.schB2[${i}].periodFrom=this.value`,true,'date')}</div>
        <div class="col-md-2">${inpD('Period To',r.periodTo,`D.schB2[${i}].periodTo=this.value`,true,'date')}</div>
        <div class="col-md-2">${inpD('Date Paid',r.datePaid,`D.schB2[${i}].datePaid=this.value`,true,'date')}</div>
        <div class="col-md-4">${inpD('Payee',r.payee,`D.schB2[${i}].payee=this.value`,true)}</div>
        <div class="col-md-3">${inpD('Court Order Date',r.courtOrderDate,`D.schB2[${i}].courtOrderDate=this.value`,true,'date')}</div>
        <div class="col-md-3">${inpD('Amount',r.amount,`D.schB2[${i}].amount=this.value`,true,'number')}</div>
      </div></div>
    </div></div>`).join('')+'</div>';
  } else {
    rows=scheduleEmptyHTMLAnnual('schb2','guardian fees and costs','schB2');
  }
  return `<div class="schedule-page">
  <h1>Schedule B-2 — Guardian Fees and Costs</h1>
  <div class="schedule-instructions">Bank Account Number = The Financial Institution's Account Number (NOT its Routing Number).</div>
  ${rows}
  <button class="btn btn-outline-primary btn-sm mb-2" data-annual-action="add-row" data-collection="schB2" data-route="/schb2">+ Add Entry</button>
  <div class="schedule-totals"><div class="tbl"><div class="tr"><div class="td">Schedule B-2 Total — Guardian Fees and Costs</div><div class="td" data-annual-total="schB2">${fmtAnnual(t.schB2)}</div></div></div></div>
  ${renderScheduleDocsSection('schB2')}
  ${pageNavAnnual('/schb1','/schb3')}
  </div>`;
}

// ── Schedule B-3 — Other Court-Ordered Disbursements ─────
function pageSchB3Annual(){
  const d=window.D; const t=calcTotalsAnnual();
  let rows='';
  if(d.schB3 && d.schB3.length>0){
    rows='<div class="row g-3 schedule-entry-grid">'+d.schB3.map((r,i)=>`<div class="col-12 col-lg-6"><div class="entry-card mb-2">
      ${entryCardHeaderAnnual(`Line ${i+1}`,'schB3',i,'/schb3')}
      <div class="entry-card-body"><div class="row g-2">
        <div class="col-md-3">${inpD('Bank Account #',r.bankAcct,`D.schB3[${i}].bankAcct=this.value`,true)}</div>
        <div class="col-md-2">${inpD('Check #',r.checkNo,`D.schB3[${i}].checkNo=this.value`,true)}</div>
        <div class="col-md-2">${inpD('Date Paid',r.datePaid,`D.schB3[${i}].datePaid=this.value`,true,'date')}</div>
        <div class="col-md-5">${inpD('Payee',r.payee,`D.schB3[${i}].payee=this.value`,true)}</div>
        <div class="col-md-3">${inpD('Court Order Date',r.courtOrderDate,`D.schB3[${i}].courtOrderDate=this.value`,true,'date')}</div>
        <div class="col-md-3">${inpD('Amount',r.amount,`D.schB3[${i}].amount=this.value`,true,'number')}</div>
      </div></div>
    </div></div>`).join('')+'</div>';
  } else {
    rows=scheduleEmptyHTMLAnnual('schb3','court-ordered disbursements','schB3');
  }
  return `<div class="schedule-page">
  <h1>Schedule B-3 — Other Court-Ordered Disbursements</h1>
  <div class="schedule-instructions">Bank Account Number = The Financial Institution's Account Number (NOT its Routing Number).</div>
  ${rows}
  <button class="btn btn-outline-primary btn-sm mb-2" data-annual-action="add-row" data-collection="schB3" data-route="/schb3">+ Add Entry</button>
  <div class="schedule-totals"><div class="tbl"><div class="tr"><div class="td">Schedule B-3 Total — Other Court-Ordered Disbursements</div><div class="td" data-annual-total="schB3">${fmtAnnual(t.schB3)}</div></div></div></div>
  ${renderScheduleDocsSection('schB3')}
  ${pageNavAnnual('/schb2','/schb4')}
  </div>`;
}

// ── Schedule B-4 — Other Disbursements ───────────────────
function pageSchB4Annual(){
  const d=window.D; const t=calcTotalsAnnual();
  // Category summary
  const cats={};
  DISB_CATS.forEach(c=>cats[c]=0);
  d.schB4.forEach(r=>{if(r.category&&cats[r.category]!==undefined)cats[r.category]+=n(r.amount);});
  let rows='';
  if(d.schB4 && d.schB4.length>0){
    rows='<div class="row g-3 schedule-entry-grid">'+d.schB4.map((r,i)=>`<div class="col-12 col-lg-6"><div class="entry-card mb-2">
      ${entryCardHeaderAnnual(`Line ${i+1}`,'schB4',i,'/schb4')}
      <div class="entry-card-body"><div class="row g-2">
        <div class="col-md-2">${inpD('Check #',r.checkNo,`D.schB4[${i}].checkNo=this.value`,true)}</div>
        <div class="col-md-2">${inpD('Date Paid',r.datePaid,`D.schB4[${i}].datePaid=this.value`,true,'date')}</div>
        <div class="col-md-3"><label class="form-label" for="schB4_category_${i}">Category <span class="req">*</span></label><select class="form-select" id="schB4_category_${i}" data-annual-path="schB4.${i}.category"><option value="">— select —</option>${DISB_CATS.map(c=>`<option value="${c}" ${r.category===c?'selected':''}>${c}</option>`).join('')}</select></div>
        <div class="col-md-3">${inpD('Payee',r.payee,`D.schB4[${i}].payee=this.value`,true)}</div>
        <div class="col-md-2">${inpD('Amount',r.amount,`D.schB4[${i}].amount=this.value`,true,'number')}</div>
      </div></div>
    </div></div>`).join('')+'</div>';
  } else {
    rows=scheduleEmptyHTMLAnnual('schb4','other disbursements','schB4');
  }
  let catSummary='<table class="doc-table mt-2"><thead><tr><th>#</th><th>Category</th><th class="right">Amount</th></tr></thead><tbody>';
  let cNum=1;
  DISB_CATS.forEach(c=>{catSummary+=`<tr><td>${cNum++}</td><td>${c}</td><td class="right">${cats[c]>0?fmtAnnual(cats[c]):'—'}</td></tr>`;});
  catSummary+=`</tbody></table>`;
  return `<div class="schedule-page">
  <h1>Schedule B-4 — All Other Disbursements</h1>
  <div class="schedule-instructions">Receipts, checks, and substantiating papers need not be filed with the court but shall be made available for inspection. List disbursements in check number order. If category is "Other," provide details in payee field.</div>
  ${rows}
  <button class="btn btn-outline-primary btn-sm mb-2" data-annual-action="add-row" data-collection="schB4" data-route="/schb4">+ Add Entry</button>
  <div class="schedule-totals mb-2"><div class="tbl"><div class="tr"><div class="td">Schedule B-4 Total — All Other Disbursements</div><div class="td" data-annual-total="schB4">${fmtAnnual(t.schB4)}</div></div></div></div>
  <div class="summary-box"><h2 class="subsection-heading">Category Summary</h2>${catSummary}</div>
  ${renderScheduleDocsSection('schB4')}
  ${pageNavAnnual('/schb3','/schc')}
  </div>`;
}

// ── Schedule C — Capital Adjustments ─────────────────────
function pageSchCAnnual(){
  const d=window.D; const t=calcTotalsAnnual();
  let rows='';
  if(d.schC && d.schC.length>0){
    rows='<div class="row g-3 schedule-entry-grid">'+d.schC.map((r,i)=>`<div class="col-12 col-lg-6"><div class="entry-card mb-2">
      ${entryCardHeaderAnnual(`Line ${i+1}`,'schC',i,'/schc')}
      <div class="entry-card-body"><div class="row g-2">
        <div class="col-md-5">${inpD('Full Description and Identification',r.description,`D.schC[${i}].description=this.value`,true)}</div>
        <div class="col-md-2">${inpD('Date of Adjustment',r.date,`D.schC[${i}].date=this.value`,true,'date')}</div>
        <div class="col-md-2">${inpD('Gain / Addition',r.gain,`D.schC[${i}].gain=this.value`,true,'number')}</div>
        <div class="col-md-3"><label class="form-label">Loss / Reduction <span class="req">*</span> <small>(enter as negative)</small></label><div class="input-group"><span class="input-group-text">$</span><input type="text" inputmode="decimal" class="form-control" value="${esc(sanitizeDecimal(r.loss))}" data-annual-path="schC.${i}.loss" data-annual-format="signed-decimal"></div></div>
      </div></div>
    </div></div>`).join('')+'</div>';
  } else {
    rows=scheduleEmptyHTMLAnnual('schc','capital transactions or adjustments','schC');
  }
  return `<div class="schedule-page">
  <h1>Schedule C — Capital Adjustments During Period</h1>
  <div class="schedule-instructions">Include gains/losses in asset values, newly discovered assets, purchases of real estate/personal/intangible assets. Losses must be entered as negative numbers. Real estate sales should also appear in Schedule F-1.</div>
  ${rows}
  <button class="btn btn-outline-primary btn-sm mb-2" data-annual-action="add-row" data-collection="schC" data-route="/schc">+ Add Entry</button>
  <div class="schedule-totals"><div class="tbl">
    <div class="tr"><div class="td">Total Gains / Additions</div><div class="td" data-annual-total="schC_gains">${fmtAnnual(t.schC_gains)}</div></div>
    <div class="tr"><div class="td">Total Losses / Reductions</div><div class="td" data-annual-total="schC_losses">${fmtAnnual(t.schC_losses)}</div></div>
    <div class="tr"><div class="td"><strong>Net Capital Adjustments</strong></div><div class="td"><strong data-annual-total="schC_net">${fmtAnnual(t.schC_net)}</strong></div></div>
  </div></div>
  ${renderScheduleDocsSection('schC')}
  ${pageNavAnnual('/schb4','/schd1')}
  </div>`;
}

// ── Schedule D-1 — Cash Assets ───────────────────────────
function pageSchD1Annual(){
  const d=window.D; const t=calcTotalsAnnual();
  let rows='';
  if(d.schD1 && d.schD1.length>0){
    rows='<div class="row g-3 schedule-entry-grid">'+d.schD1.map((r,i)=>{
      const wardAmt=n(r.fullAmount)*pct(r.wardPct);
      return `<div class="col-12 col-lg-6"><div class="entry-card mb-2">
        ${entryCardHeaderAnnual(`Line ${i+1} — ${r.description||'(no description)'}`,'schD1',i,'/schd1')}
        <div class="entry-card-body"><div class="row g-2">
          <div class="col-md-4">${inpD('Description (Bank, account type)',r.description,`D.schD1[${i}].description=this.value`,true)}</div>
          <div class="col-md-2">${inpD('Account #',r.accountNo,`D.schD1[${i}].accountNo=this.value`,true)}</div>
          <div class="col-md-2"><label class="form-label" for="schD1_restricted_${i}">Restricted? <span class="req">*</span>${tooltip('restricted')}</label><input class="form-check-input" type="checkbox" id="schD1_restricted_${i}" ${r.restricted==='Yes'?'checked':''} data-annual-path="schD1.${i}.restricted" data-annual-value="yes-no"></div>
          <div class="col-md-2">${inpD('Type (CD, Checking…)',r.type,`D.schD1[${i}].type=this.value`,true)}</div>
          <div class="col-md-2">${inpD('Full Asset Amount',r.fullAmount,`D.schD1[${i}].fullAmount=this.value`,true,'number')}</div>
          <div class="col-md-2">${inpDWithTooltip("Ward's % ",'ward_pct',r.wardPct,`D.schD1[${i}].wardPct=this.value`,false,'number')}</div>
          <div class="col-md-2"><label class="form-label">Ward's Amount</label><input class="form-control" readonly value="${fmtAnnual(wardAmt)}"></div>
        </div></div>
      </div></div>`;
    }).join('')+'</div>';
  } else {
    rows=scheduleEmptyHTMLAnnual('schd1','cash or bank account assets','schD1');
  }
  return `<div class="schedule-page">
  <h1>Schedule D-1 — Cash Assets</h1>
  <div class="schedule-instructions">Include all liquid assets: cash on hand, savings, checking, CDs, money market, attorney trust, patient trust, burial savings. List each account separately. Enter Ward's % as decimal (e.g., 1 for 100%, 0.5 for 50%) or as a percentage (e.g., 100, 50).</div>
  ${rows}
  <button class="btn btn-outline-primary btn-sm mb-2" data-annual-action="add-row" data-collection="schD1" data-route="/schd1">+ Add Account</button>
  <div class="schedule-totals"><div class="tbl">
    <div class="tr"><div class="td">Cash Assets in Restricted Depository</div><div class="td" data-annual-total="schD1_restricted">${fmtAnnual(t.schD1_restricted)}</div></div>
    <div class="tr"><div class="td"><strong>Total Cash Assets (Ward's Amount)</strong></div><div class="td"><strong data-annual-total="schD1_total">${fmtAnnual(t.schD1_total)}</strong></div></div>
  </div></div>
  ${renderScheduleDocsSection('schD1')}
  ${pageNavAnnual('/schc','/schd2')}
  </div>`;
}

// ── Schedule D-2 — Real Estate ───────────────────────────
function pageSchD2Annual(){
  const d=window.D; const t=calcTotalsAnnual();
  let rows='';
  if(d.schD2 && d.schD2.length>0){
    rows='<div class="row g-3 schedule-entry-grid">'+d.schD2.map((r,i)=>{
      const wardVal=n(r.fullValue)*pct(r.wardPct);
      return `<div class="col-12 col-lg-6"><div class="entry-card mb-2">
        ${entryCardHeaderAnnual(`Line ${i+1}`,'schD2',i,'/schd2')}
        <div class="entry-card-body"><div class="row g-2">
          <div class="col-md-6">${inpD('Description / Address / Owners',r.description,`D.schD2[${i}].description=this.value`,true)}</div>
          <div class="col-md-2"><label class="form-label" for="schD2_residence_${i}">Personal Residence? <span class="req">*</span>${tooltip('personal_residence')}</label><input class="form-check-input" type="checkbox" id="schD2_residence_${i}" ${r.residence==='Yes'?'checked':''} data-annual-path="schD2.${i}.residence" data-annual-value="yes-no"></div>
          <div class="col-md-2"><label class="form-label" for="schD2_income_${i}">Income Property? <span class="req">*</span>${tooltip('income_property')}</label><input class="form-check-input" type="checkbox" id="schD2_income_${i}" ${r.income==='Yes'?'checked':''} data-annual-path="schD2.${i}.income" data-annual-value="yes-no"></div>
          <div class="col-md-2">${inpDWithTooltip("Ward's % ",'ward_pct',r.wardPct,`D.schD2[${i}].wardPct=this.value`,false,'number')}</div>
          <div class="col-md-3">${inpD('Full Asset Value',r.fullValue,`D.schD2[${i}].fullValue=this.value`,true,'number')}</div>
          <div class="col-md-3">${inpDWithTooltip('Carrying Value','carrying_value',r.carryingValue,`D.schD2[${i}].carryingValue=this.value`,true,'number')}</div>
          <div class="col-md-3"><label class="form-label">Ward's Value</label><input class="form-control" readonly value="${fmtAnnual(wardVal)}"></div>
        </div></div>
      </div></div>`;
    }).join('')+'</div>';
  } else {
    rows=scheduleEmptyHTMLAnnual('schd2','real estate properties','schD2');
  }
  return `<div class="schedule-page">
  <h1>Schedule D-2 — Real Estate and Real Property Assets</h1>
  <div class="schedule-instructions">Include full description, address, all other owners and their relationship to the ward. Values must be as of Ward's Fiscal Year-End.</div>
  ${rows}
  <button class="btn btn-outline-primary btn-sm mb-2" data-annual-action="add-row" data-collection="schD2" data-route="/schd2">+ Add Property</button>
  <div class="schedule-totals"><div class="tbl">
    <div class="tr"><div class="td">Carrying Value Total</div><div class="td" data-annual-total="schD2_carrying">${fmtAnnual(t.schD2_carrying)}</div></div>
    <div class="tr"><div class="td"><strong>Ward's Value Total</strong></div><div class="td"><strong data-annual-total="schD2_ward">${fmtAnnual(t.schD2_ward)}</strong></div></div>
  </div></div>
  ${renderScheduleDocsSection('schD2')}
  ${pageNavAnnual('/schd1','/schd3')}
  </div>`;
}

// ── Schedule D-3 — Personal Property ─────────────────────
function pageSchD3Annual(){
  const d=window.D; const t=calcTotalsAnnual();
  let rows='';
  if(d.schD3 && d.schD3.length>0){
    rows='<div class="row g-3 schedule-entry-grid">'+d.schD3.map((r,i)=>{
      const wardAmt=n(r.fullAmount)*pct(r.wardPct);
      return `<div class="col-12 col-lg-6"><div class="entry-card mb-2">
        ${entryCardHeaderAnnual(`Line ${i+1}`,'schD3',i,'/schd3')}
        <div class="entry-card-body"><div class="row g-2">
          <div class="col-md-6">${inpD('Description / Location / Owners',r.description,`D.schD3[${i}].description=this.value`,true)}</div>
          <div class="col-md-2">${inpD('Full Asset Amount',r.fullAmount,`D.schD3[${i}].fullAmount=this.value`,true,'number')}</div>
          <div class="col-md-2">${inpDWithTooltip("Ward's % ",'ward_pct',r.wardPct,`D.schD3[${i}].wardPct=this.value`,false,'number')}</div>
          <div class="col-md-2">${inpDWithTooltip('Carrying Value','carrying_value',r.carryingValue,`D.schD3[${i}].carryingValue=this.value`,true,'number')}</div>
          <div class="col-md-2"><label class="form-label">Ward's Amount</label><input class="form-control" readonly value="${fmtAnnual(wardAmt)}"></div>
        </div></div>
      </div></div>`;
    }).join('')+'</div>';
  } else {
    rows=scheduleEmptyHTMLAnnual('schd3','personal property assets','schD3');
  }
  return `<div class="schedule-page">
  <h1>Schedule D-3 — Personal Property Assets</h1>
  <div class="schedule-instructions">Include vehicles, clothing, furniture, electronics, jewelry, burial/cemetery plot. All values must be Fair Market Value as of end of Reporting Period. If no personal property, attach explanation.</div>
  ${rows}
  <button class="btn btn-outline-primary btn-sm mb-2" data-annual-action="add-row" data-collection="schD3" data-route="/schd3">+ Add Property</button>
  <div class="schedule-totals"><div class="tbl">
    <div class="tr"><div class="td">Carrying Value Total</div><div class="td" data-annual-total="schD3_carrying">${fmtAnnual(t.schD3_carrying)}</div></div>
    <div class="tr"><div class="td"><strong>Ward's Amount Total</strong></div><div class="td"><strong data-annual-total="schD3_ward">${fmtAnnual(t.schD3_ward)}</strong></div></div>
  </div></div>
  ${renderScheduleDocsSection('schD3')}
  ${pageNavAnnual('/schd2','/schd4')}
  </div>`;
}

// ── Schedule D-4 — Intangible Assets ─────────────────────
function pageSchD4Annual(){
  const d=window.D; const t=calcTotalsAnnual();
  let rows='';
  if(d.schD4 && d.schD4.length>0){
    rows='<div class="row g-3 schedule-entry-grid">'+d.schD4.map((r,i)=>{
      const wardVal=n(r.fullAmount)*pct(r.wardPct);
      return `<div class="col-12 col-lg-6"><div class="entry-card mb-2">
        ${entryCardHeaderAnnual(`Line ${i+1}`,'schD4',i,'/schd4')}
        <div class="entry-card-body"><div class="row g-2">
          <div class="col-md-5">${inpD('Description (stocks, annuities, policies, notes…)',r.description,`D.schD4[${i}].description=this.value`,true)}</div>
          <div class="col-md-2"><label class="form-label" for="schD4_restricted_${i}">Restricted? <span class="req">*</span>${tooltip('restricted')}</label><input class="form-check-input" type="checkbox" id="schD4_restricted_${i}" ${r.restricted==='Yes'?'checked':''} data-annual-path="schD4.${i}.restricted" data-annual-value="yes-no"></div>
          <div class="col-md-2">${inpD('Full Asset Amount',r.fullAmount,`D.schD4[${i}].fullAmount=this.value`,true,'number')}</div>
          <div class="col-md-2">${inpDWithTooltip("Ward's % ",'ward_pct',r.wardPct,`D.schD4[${i}].wardPct=this.value`,false,'number')}</div>
          <div class="col-md-2">${inpDWithTooltip('Carrying Value','carrying_value',r.carryingValue,`D.schD4[${i}].carryingValue=this.value`,true,'number')}</div>
          <div class="col-md-2"><label class="form-label">Ward's Value</label><input class="form-control" readonly value="${fmtAnnual(wardVal)}"></div>
        </div></div>
      </div></div>`;
    }).join('')+'</div>';
  } else {
    rows=scheduleEmptyHTMLAnnual('schd4','intangible assets','schD4');
  }
  return `<div class="schedule-page">
  <h1>Schedule D-4 — Intangible Assets</h1>
  <div class="schedule-instructions">Intangibles are assets not physical and not liquid without a Court Order: brokerage accounts, stocks, annuities, prepaid funeral contracts, insurance policies that add value, promissory notes owed to the ward. Attach copies of all statements.</div>
  ${rows}
  <button class="btn btn-outline-primary btn-sm mb-2" data-annual-action="add-row" data-collection="schD4" data-route="/schd4">+ Add Asset</button>
  <div class="schedule-totals"><div class="tbl">
    <div class="tr"><div class="td">Restricted Intangible Assets</div><div class="td" data-annual-total="schD4_restricted">${fmtAnnual(t.schD4_restricted)}</div></div>
    <div class="tr"><div class="td">Carrying Value Total</div><div class="td" data-annual-total="schD4_carrying">${fmtAnnual(t.schD4_carrying)}</div></div>
    <div class="tr"><div class="td"><strong>Ward's Value Total</strong></div><div class="td"><strong data-annual-total="schD4_ward">${fmtAnnual(t.schD4_ward)}</strong></div></div>
  </div></div>
  ${renderScheduleDocsSection('schD4')}
  ${pageNavAnnual('/schd3','/schd5')}
  </div>`;
}

// ── Schedule D-5 — Liabilities ───────────────────────────
function pageSchD5Annual(){
  const d=window.D; const t=calcTotalsAnnual();
  let rows='';
  if(d.schD5 && d.schD5.length>0){
    rows='<div class="row g-3 schedule-entry-grid">'+d.schD5.map((r,i)=>{
      const wardBal=n(r.fullDebt)*pct(r.wardPct);
      return `<div class="col-12 col-lg-6"><div class="entry-card mb-2">
        ${entryCardHeaderAnnual(`Line ${i+1}`,'schD5',i,'/schd5')}
        <div class="entry-card-body"><div class="row g-2">
          <div class="col-md-4">${inpD('Description / Lender / Related Asset',r.description,`D.schD5[${i}].description=this.value`,true)}</div>
          <div class="col-md-2">${inpD('Loan / Account #',r.loanNo,`D.schD5[${i}].loanNo=this.value`,true)}</div>
          <div class="col-md-2"><label class="form-label" for="schD5_loanType_${i}">Type (M/N/L/O) <span class="req">*</span></label><select class="form-select" id="schD5_loanType_${i}" data-annual-path="schD5.${i}.loanType"><option value="">—</option>${LIAB_TYPES.map(lt=>`<option value="${lt}" ${r.loanType===lt?'selected':''}>${lt}</option>`).join('')}</select></div>
          <div class="col-md-2">${inpDWithTooltip('Full Debt Amount','full_debt',r.fullDebt,`D.schD5[${i}].fullDebt=this.value`,true,'number')}</div>
          <div class="col-md-2">${inpDWithTooltip("Ward's %",'ward_pct',r.wardPct,`D.schD5[${i}].wardPct=this.value`,true,'number')}</div>
          <div class="col-md-2"><label class="form-label">Ward's Balance Due</label><input class="form-control" readonly value="${fmtAnnual(wardBal)}"></div>
        </div></div>
      </div></div>`;
    }).join('')+'</div>';
  } else {
    rows=scheduleEmptyHTMLAnnual('schd5','liabilities or debts','schD5');
  }
  return `<div class="schedule-page">
  <h1>Schedule D-5 — Mortgages / Loans / Notes / Other Liabilities</h1>
  <div class="schedule-instructions">Include mortgages, second mortgages, judgment liens, tax liens, credit cards, vehicle loans, unpaid medical/facility bills, promissory notes. Type: M=Mortgage, N=Note, L=Loan, O=Other.</div>
  ${rows}
  <button class="btn btn-outline-primary btn-sm mb-2" data-annual-action="add-row" data-collection="schD5" data-route="/schd5">+ Add Liability</button>
  <div class="schedule-totals"><div class="tbl"><div class="tr"><div class="td"><strong>Schedule D-5 Total — Ward's Balance Due</strong></div><div class="td"><strong data-annual-total="schD5_total">${fmtAnnual(t.schD5_total)}</strong></div></div></div></div>
  ${renderScheduleDocsSection('schD5')}
  ${pageNavAnnual('/schd4','/sche')}
  </div>`;
}

// ── Schedule E — Bank Transfers ──────────────────────────
function pageSchEAnnual(){
  const d=window.D;
  const totalIn=(d.schE||[]).reduce((s,r)=>s+n(r.transferInAmt),0);
  const totalOut=(d.schE||[]).reduce((s,r)=>s+n(r.transferOutAmt),0);
  let rows='';
  if(d.schE && d.schE.length>0){
    rows='<div class="row g-3 schedule-entry-grid">'+d.schE.map((r,i)=>`<div class="col-12 col-lg-6"><div class="entry-card mb-2">
      ${entryCardHeaderAnnual(`Line ${i+1}`,'schE',i,'/sche')}
      <div class="entry-card-body"><div class="row g-2">
        <div class="col-md-4">${inpD('Bank Name / Account #',r.bankName,`D.schE[${i}].bankName=this.value`,true)}</div>
        <div class="col-md-2">${inpD('Transfer In Date',r.transferInDate,`D.schE[${i}].transferInDate=this.value`,true,'date')}</div>
        <div class="col-md-2">${inpD('Transfer In Amount',r.transferInAmt,`D.schE[${i}].transferInAmt=this.value`,true,'number')}</div>
        <div class="col-md-2">${inpD('Transfer Out Date',r.transferOutDate,`D.schE[${i}].transferOutDate=this.value`,true,'date')}</div>
        <div class="col-md-2"><label class="form-label">Transfer Out Amt (negative)</label><div class="input-group"><span class="input-group-text">$</span><input type="text" inputmode="decimal" class="form-control" value="${esc(sanitizeDecimal(r.transferOutAmt))}" data-annual-path="schE.${i}.transferOutAmt" data-annual-format="signed-decimal"></div></div>
      </div></div>
    </div></div>`).join('')+'</div>';
  } else {
    rows=scheduleEmptyHTMLAnnual('sche','inter-account transfers','schE');
  }
  return `<div class="schedule-page">
  <h1>Schedule E — Bank Transfers During Period</h1>
  <div class="schedule-instructions">Each transfer should be listed twice — once going out and again going into another account. Transfers out should be entered as negative numbers.</div>
  ${rows}
  <button class="btn btn-outline-primary btn-sm mb-2" data-annual-action="add-row" data-collection="schE" data-route="/sche">+ Add Transfer</button>
  <div class="schedule-totals"><div class="tbl">
    <div class="tr"><div class="td">Total Transfers In</div><div class="td">${fmtAnnual(totalIn)}</div></div>
    <div class="tr"><div class="td">Total Transfers Out</div><div class="td">${fmtAnnual(totalOut)}</div></div>
  </div></div>
  ${renderScheduleDocsSection('schE')}
  ${pageNavAnnual('/schd5','/schf1')}
  </div>`;
}

// ── Schedule F-1 — Sales of Real Property ────────────────
function pageSchF1Annual(){
  const d=window.D;
  const total=(d.schF1||[]).reduce((s,r)=>s+n(r.salePrice),0);
  let rows='';
  if(d.schF1 && d.schF1.length>0){
    rows='<div class="row g-3 schedule-entry-grid">'+d.schF1.map((r,i)=>`<div class="col-12 col-lg-6"><div class="entry-card mb-2">
      ${entryCardHeaderAnnual(`Sale ${i+1}`,'schF1',i,'/schf1')}
      <div class="entry-card-body"><div class="row g-2">
        <div class="col-md-5">${inpD('Description of Sale / Address / Parties',r.description,`D.schF1[${i}].description=this.value`,true)}</div>
        <div class="col-md-2">${inpD('Bank',r.bank,`D.schF1[${i}].bank=this.value`,true)}</div>
        <div class="col-md-2">${inpD('Account #',r.accountNo,`D.schF1[${i}].accountNo=this.value`,true)}</div>
        <div class="col-md-2">${inpD('Court Order Date',r.courtOrderDate,`D.schF1[${i}].courtOrderDate=this.value`,true,'date')}</div>
        <div class="col-md-2">${inpD('Sale Price',r.salePrice,`D.schF1[${i}].salePrice=this.value`,true,'number')}</div>
      </div></div>
    </div></div>`).join('')+'</div>';
  } else {
    rows=scheduleEmptyHTMLAnnual('schf1','real property sales','schF1');
  }
  return `<div class="schedule-page">
  <h1>Schedule F-1 — Sales of Real Property During Period</h1>
  <div class="schedule-instructions">Attach a copy of the closing statement. Gains or losses from the sale should also be noted in Schedule C. Provide the court order date approving the sale.</div>
  ${rows}
  <button class="btn btn-outline-primary btn-sm mb-2" data-annual-action="add-row" data-collection="schF1" data-route="/schf1">+ Add Sale</button>
  <div class="schedule-totals"><div class="tbl"><div class="tr"><div class="td">Schedule F-1 Total — Sales of Real Property</div><div class="td">${fmtAnnual(total)}</div></div></div></div>
  ${renderScheduleDocsSection('schF1')}
  ${pageNavAnnual('/sche','/schf2')}
  </div>`;
}

// ── Schedule F-2 — Sales of Personal Property ────────────
function pageSchF2Annual(){
  const d=window.D;
  const total=(d.schF2||[]).reduce((s,r)=>s+n(r.salePrice),0);
  let rows='';
  if(d.schF2 && d.schF2.length>0){
    rows='<div class="row g-3 schedule-entry-grid">'+d.schF2.map((r,i)=>`<div class="col-12 col-lg-6"><div class="entry-card mb-2">
      ${entryCardHeaderAnnual(`Sale ${i+1}`,'schF2',i,'/schf2')}
      <div class="entry-card-body"><div class="row g-2">
        <div class="col-md-5">${inpD('Description of Sale / Purchaser / Agent',r.description,`D.schF2[${i}].description=this.value`,true)}</div>
        <div class="col-md-2">${inpD('Bank',r.bank,`D.schF2[${i}].bank=this.value`,true)}</div>
        <div class="col-md-2">${inpD('Account #',r.accountNo,`D.schF2[${i}].accountNo=this.value`,true)}</div>
        <div class="col-md-2">${inpD('Court Order Date',r.courtOrderDate,`D.schF2[${i}].courtOrderDate=this.value`,true,'date')}</div>
        <div class="col-md-2">${inpD('Sale Price',r.salePrice,`D.schF2[${i}].salePrice=this.value`,true,'number')}</div>
      </div></div>
    </div></div>`).join('')+'</div>';
  } else {
    rows=scheduleEmptyHTMLAnnual('schf2','personal property sales','schF2');
  }
  return `<div class="schedule-page">
  <h1>Schedule F-2 — Sales of Personal Property During Period</h1>
  <div class="schedule-instructions">Gains or losses from the sale of personal property should also be noted in Schedule C. Attach proof of proceeds deposited.</div>
  ${rows}
  <button class="btn btn-outline-primary btn-sm mb-2" data-annual-action="add-row" data-collection="schF2" data-route="/schf2">+ Add Sale</button>
  <div class="schedule-totals"><div class="tbl"><div class="tr"><div class="td">Schedule F-2 Total — Sales of Personal Property</div><div class="td">${fmtAnnual(total)}</div></div></div></div>
  ${renderScheduleDocsSection('schF2')}
  ${pageNavAnnual('/schf1','/p67')}
  </div>`;
}

// ── Parts VI & VII — Summary ──────────────────────────────
function pagePart67Annual(){
  const d=window.D; const t=calcTotalsAnnual();
  return `<div class="schedule-page">
  <h1>Parts VI &amp; VII — Summary</h1>
  <div class="schedule-instructions">This page is auto-calculated from all schedules. Net Assets from Changes (Part VI, below) should equal Net Assets from Balances (Part VII, below). If they differ, verify individual schedules.</div>
  <div class="summary-box">
    <h2 class="subsection-heading">Part VI — Changes in Net Assets</h2>
    <div class="summary-line"><span>Starting Balance (Net Assets per Prior Report)</span><span>${fmtAnnual(d.startingBalance)}</span></div>
    <div class="summary-line"><span><a href="#" data-annual-action="navigate" data-route="/scha">Schedule A — Income/Receipts</a></span><span>${fmtAnnual(t.schA)}</span></div>
    <div style="padding:.1rem 0;font-size:.7rem;color:var(--ink-3);font-style:italic;">Disbursements:</div>
    <div class="summary-line"><span><a href="#" data-annual-action="navigate" data-route="/schb1">Schedule B-1 — Attorney Fees</a></span><span>(${fmtAnnual(t.schB1)})</span></div>
    <div class="summary-line"><span><a href="#" data-annual-action="navigate" data-route="/schb2">Schedule B-2 — Guardian Fees</a></span><span>(${fmtAnnual(t.schB2)})</span></div>
    <div class="summary-line"><span><a href="#" data-annual-action="navigate" data-route="/schb3">Schedule B-3 — Court-Ordered Disb.</a></span><span>(${fmtAnnual(t.schB3)})</span></div>
    <div class="summary-line"><span><a href="#" data-annual-action="navigate" data-route="/schb4">Schedule B-4 — All Other Disb.</a></span><span>(${fmtAnnual(t.schB4)})</span></div>
    <div class="summary-line total"><span>Total Disbursements</span><span>(${fmtAnnual(t.totalDisb)})</span></div>
    <div class="summary-line"><span><a href="#" data-annual-action="navigate" data-route="/schc">Schedule C — Capital Adj. Net</a></span><span>${fmtAnnual(t.schC_net)}</span></div>
    <div class="summary-line grand"><span>Line 20 — Net Assets at End of Period</span><span>${fmtAnnual(t.netAssets)}</span></div>
  </div>
  <div class="summary-box">
    <h2 class="subsection-heading">Part VII — Assets &amp; Liabilities at End of Period</h2>
    <div class="summary-line"><span><a href="#" data-annual-action="navigate" data-route="/schd1">Schedule D-1 — Cash Assets</a></span><span>${fmtAnnual(t.schD1_total)}</span></div>
    <div class="summary-line"><span><a href="#" data-annual-action="navigate" data-route="/schd2">Schedule D-2 — Real Estate (Ward's Value)</a></span><span>${fmtAnnual(t.schD2_ward)}</span></div>
    <div class="summary-line"><span><a href="#" data-annual-action="navigate" data-route="/schd3">Schedule D-3 — Personal Property (Ward's Amount)</a></span><span>${fmtAnnual(t.schD3_ward)}</span></div>
    <div class="summary-line"><span><a href="#" data-annual-action="navigate" data-route="/schd4">Schedule D-4 — Intangibles (Ward's Value)</a></span><span>${fmtAnnual(t.schD4_ward)}</span></div>
    <div class="summary-line"><span><a href="#" data-annual-action="navigate" data-route="/schd5">Schedule D-5 — Liabilities (Ward's Balance)</a></span><span>(${fmtAnnual(t.schD5_total)})</span></div>
    <div class="summary-line grand"><span>Line 30 — Net Assets at End of Period</span><span>${fmtAnnual(t.netAssetsFromD)}</span></div>
  </div>
  ${reconcileBlockAnnual(t)}
  ${pageNavAnnual('/schf2','/p8')}
  </div>`;
}

// The reconciliation panel on Parts VI & VII. When the two lines agree it
// simply confirms that. When they don't, it states the difference and
// requires a written explanation — that text is carried onto the exported
// document, so the discrepancy is disclosed rather than hidden.
function reconcileBlockAnnual(t){
  const st=annualReconcileState(t);
  if(!st.outOfBalance){
    return `<div class="alert alert-success mt-2" style="font-size:.8rem;">&#10003; Net Assets from Changes (${fmtAnnual(t.netAssets)}) equals Net Assets from Balances (${fmtAnnual(t.netAssetsFromD)}) — the accounting balances.</div>`;
  }
  return `<div class="alert alert-warning mt-2" style="font-size:.8rem;">
    &#9888; <strong>Net Assets from Changes (${fmtAnnual(t.netAssets)}) does not equal Net Assets from Balances (${fmtAnnual(t.netAssetsFromD)}).</strong>
    Difference: ${fmtAnnual(st.diff)}.
    Check your schedules first — most differences are a missing or mistyped entry.
    If the difference is correct as filed, explain it below; an explanation is required before you can export.
  </div>
  <div class="summary-box">
    <h2 class="subsection-heading">Explanation of Difference<span class="req">*</span></h2>
    <textarea class="form-control" rows="4" id="reconcile-explanation"
      placeholder="Explain why Net Assets from Changes and Net Assets from Balances differ (for example: a correcting entry from a prior period, or an asset discovered after the period closed)."
      data-annual-path="reconcileExplanation"
      >${esc(st.explanation)}</textarea>
    <div style="font-size:.78rem;color:var(--ink-3);margin-top:.35rem;">This explanation is included on the exported document.</div>
  </div>`;
}

// ── Part VIII — Trusts ────────────────────────────────────
function pagePart8Annual(){
  const d=window.D;
  const hasTrusts=d.trusts && d.trusts[0] && d.trusts[0].hasTrust==='Yes';
  let cards='';
  if(hasTrusts){
    ['Trust 1','Trust 2','Trust 3'].forEach((label,i)=>{
      const t=d.trusts[i] || {};
      cards+=`<div class="col-12 col-lg-6"><div class="entry-card mb-0 h-100">
        <div class="entry-card-header"><span>${label}</span></div>
        <div class="entry-card-body">
          <div class="row g-2">
            <div class="col-md-4">${yesNoCheckboxD(`Was ${label} created after the GID?`,t.createdAfterGID,`trusts.${i}.createdAfterGID`)}</div>
            <div class="col-md-4">${inpD('Name of the Trust',t.name,`D.trusts[${i}].name=this.value`,true)}</div>
            <div class="col-md-4">${inpD('Name of the Trustee',t.trustee,`D.trusts[${i}].trustee=this.value`,true)}</div>
            <div class="col-md-4">${inpD('Trustee Account Number',t.accountNo,`D.trusts[${i}].accountNo=this.value`,true)}</div>
            <div class="col-md-4">${inpD('Date Trust Created',t.dateCreated,`D.trusts[${i}].dateCreated=this.value`,true,'date')}</div>
            <div class="col-md-4">${inpD('Type of Trust',t.trustType,`D.trusts[${i}].trustType=this.value`,true)}</div>
            <div class="col-md-4">${inpDWithTooltip("Ward's %",'ward_pct',t.wardPct,`D.trusts[${i}].wardPct=this.value`,false,'number')}</div>
            <div class="col-md-8">${inpD('Amount (Ward\'s Interest)',t.wardAmount,`D.trusts[${i}].wardAmount=this.value`,false,'number')}</div>
          </div>
        </div>
      </div></div>`;
    });
  }
  return `<div class="schedule-page">
  <h1>Part VIII — Trust Information</h1>
  <div class="schedule-instructions">If a trust was created after the Guardianship Inception Date, you MUST file a separate trust accounting for that trust.</div>
  <div class="row g-2 mb-3">
    <div class="col-md-6">${yesNoCheckboxD('#1. Does the Ward have one or more Trusts?',d.trusts&&d.trusts[0]&&d.trusts[0].hasTrust||'No','trusts.0.hasTrust','/p8')}</div>
  </div>
  ${hasTrusts ? `<div class="row g-3 schedule-entry-grid">${cards}</div>` : `<div class="schedule-empty"><p class="text-muted mb-0">No trusts indicated. Check the box above if the ward has one or more trusts.</p></div>`}
  ${pageNavAnnual('/p67','/p9')}
  </div>`;
}

// ── Part IX — Other Info / Bond ───────────────────────────
function pagePart9Annual(){
  const d=window.D; const t=calcTotalsAnnual();
  return `<div class="schedule-page">
  <h1>Part IX — Other Information &amp; Bond Calculation</h1>
  <div class="row g-3">
    <div class="col-12 col-lg-6">
      <div class="summary-box h-100 mb-0">
        <h2 class="subsection-heading">Bond Calculation (auto-calculated)</h2>
        <div class="summary-line"><span>Sch D-1 — Cash Assets in Restricted Depository</span><span>${fmtAnnual(t.schD1_restricted)}</span></div>
        <div class="summary-line"><span>Sch D-4 — Intangible Assets RESTRICTED</span><span>${fmtAnnual(t.schD4_restricted)}</span></div>
        <div class="summary-line"><span>Sch D-1 — Cash Assets NOT in Restricted Depository</span><span>${fmtAnnual(t.schD1_total-t.schD1_restricted)}</span></div>
        <div class="summary-line"><span>Sch D-3 — Personal Property Assets</span><span>${fmtAnnual(t.schD3_ward)}</span></div>
        <div class="summary-line"><span>Sch D-4 — Intangible Assets (Unrestricted)</span><span>${fmtAnnual(t.schD4_ward-t.schD4_restricted)}</span></div>
        <div class="summary-line total"><span>Total for BOND REQUIREMENT</span><span>${fmtAnnual(t.bondReq)}</span></div>
      </div>
    </div>
    <div class="col-12 col-lg-6">
      <div class="summary-box h-100 mb-0">
        <h2 class="subsection-heading">Surety Bond &amp; Guardian Info</h2>
        <div class="row g-2 mb-2">
          <div class="col-md-6">${selD("Guardian's Relationship to Ward",d.guardianRelationship,"D.guardianRelationship=this.value",GUARDIAN_REL)}</div>
          <div class="col-md-6">${inpD('Restricted Depository Receipt Date',d.restrictedDepositoryReceiptDate,"D.restrictedDepositoryReceiptDate=this.value",false,'date')}</div>
        </div>
        <div class="row g-2">
          <div class="col-md-6">${inpD('Bond Amount',d.bondAmount,"D.bondAmount=this.value",false,'number')}</div>
          <div class="col-md-6">${inpD('Name of Bonding Company',d.bondingCompany,"D.bondingCompany=this.value")}</div>
          <div class="col-md-6">${inpD('Bond Period From',d.bondPeriodFrom,"D.bondPeriodFrom=this.value",false,'date')}</div>
          <div class="col-md-6">${inpD('Bond Period To',d.bondPeriodTo,"D.bondPeriodTo=this.value",false,'date')}</div>
        </div>
      </div>
    </div>
  </div>
  ${pageNavAnnual('/p8','/p10')}
  </div>`;
}

// ── Part X — Certificate of Service ──────────────────────
function pagePart10Annual(){
  const d=window.D;
  const cards=(d.certRecipients||[]).map((r,i)=>{
    const removeBtn=i===0?'':`<button type="button" class="btn btn-outline-danger btn-sm" data-annual-action="remove-row" data-collection="certRecipients" data-index="${i}" data-route="/p10">\u2715 Remove</button>`;
    return `<div class="col-12 col-lg-6"><div class="entry-card mb-0 h-100">
      <div class="entry-card-header d-flex justify-content-between align-items-center gap-2"><span>Recipient ${i+1}</span><span class="entry-card-actions">${removeBtn}</span></div>
      <div class="entry-card-body"><div class="row g-2">
        <div class="col-12">${inpD('Name',r.name,`D.certRecipients[${i}].name=this.value`,i===0)}</div>
        <div class="col-12">${inpD('Line 2',r.line2,`D.certRecipients[${i}].line2=this.value`,false)}</div>
        <div class="col-12">${inpD('Line 3',r.line3,`D.certRecipients[${i}].line3=this.value`,false)}</div>
        <div class="col-12">${inpD('Line 4',r.line4,`D.certRecipients[${i}].line4=this.value`,false)}</div>
      </div></div>
    </div></div>`;
  }).join('');
  return `<div class="schedule-page">
  <h1>Part X — Guardian Attorney Certificate of Service</h1>
  <div class="schedule-instructions">Pursuant to Florida Statute 744.367(4), I hereby certify that a copy of this accounting has been furnished to the recipients listed below.</div>
  <div class="row g-2 mb-3">
    <div class="col-md-4">${inpD('Date of Service',d.certDate,"D.certDate=this.value",false,'date')}</div>
    <div class="col-md-6">${inpD('Indicate if (e.g. hand-delivered, mailed)',d.certIndicator,"D.certIndicator=this.value")}</div>
    <div class="col-12"><div style="color:var(--danger-text);font-size:.75rem;font-weight:600;margin-top:.25rem;">* Recipient 1 name is required</div></div>
  </div>
  <h2 style="color:var(--ink);margin:.75rem 0 .4rem;font-size:.95rem;">Recipients</h2>
  <div class="row g-3 card-grid-2col mb-3">
    ${cards}
  </div>
  <button type="button" class="btn btn-outline-secondary btn-sm mb-4 no-print" data-annual-action="add-row" data-collection="certRecipients" data-route="/p10">+ Add Recipient</button>
  <h2 style="color:var(--ink);margin:.75rem 0 .4rem;font-size:.95rem;">Attorney Signature</h2>
  <div class="row g-3 card-grid-2col">
    <div class="col-12 col-lg-6">
      <div class="entry-card mb-0 h-100">
        <div class="entry-card-header">Attorney Certification</div>
        <div class="entry-card-body">
          <div class="row g-2">
            <div class="col-md-5">${inpD('Attorney Name',d.attorney,"D.attorney=this.value")}</div>
            <div class="col-md-3">${inpDWithTooltip('Signature Date','signature_date',d.certAttySignDate,"D.certAttySignDate=this.value",false,'date')}</div>
            <div class="col-md-4">${inpD('Bar Number',d.attorney_bar,"D.attorney_bar=this.value")}</div>
            <div class="col-md-4">${inpD('Phone Number',d.attorney_phone,"D.attorney_phone=this.value")}</div>
            <div class="col-md-8">${inpD('Street Address',d.attorney_street,"D.attorney_street=this.value")}</div>
            <div class="col-12">${inpD('City / State / Zip Code',d.attorney_cityStateZip,"D.attorney_cityStateZip=this.value")}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
  ${pageNavAnnual('/p9','/p11')}
  </div>`;
}

// ── Part XI — Remuneration ────────────────────────────────
function pagePart11Annual(){
  const d=window.D;
  let rows='';
  if(d.remuneration && d.remuneration.length>0){
    rows='<div class="row g-3 schedule-entry-grid">'+d.remuneration.map((r,i)=>`<div class="col-12 col-lg-6"><div class="entry-card mb-0 h-100">
      <div class="entry-card-header">
        <span>Entry ${i+1}</span>
        <span class="entry-card-actions">
          <button class="btn btn-sm btn-outline-danger ms-auto" data-annual-action="remove-row" data-collection="remuneration" data-index="${i}" data-route="/p11">✕ Remove</button>
        </span>
      </div>
      <div class="entry-card-body"><div class="row g-2">
        <div class="col-md-4">${inpD('Guardian Name',r.guardian,`D.remuneration[${i}].guardian=this.value`,true)}</div>
        <div class="col-md-4">${inpD('Type',r.type,`D.remuneration[${i}].type=this.value`,true)}</div>
        <div class="col-md-4">${inpD('Amount',r.amount,`D.remuneration[${i}].amount=this.value`,true,'number')}</div>
        <div class="col-12">${inpD('Description',r.description,`D.remuneration[${i}].description=this.value`,true)}</div>
      </div></div>
    </div></div>`).join('')+'</div>';
  } else {
    rows=scheduleEmptyHTMLAnnual('remuneration','remuneration entries','remuneration');
  }
  return `<div class="schedule-page">
  <h1>Part XI — Guardian(s) Declaration of Remuneration</h1>
  <div class="schedule-instructions">Per 744.367(3)(a), the annual guardianship report must include a declaration of all remuneration received by the guardian from any source for services rendered to or on behalf of the ward. "Remuneration" means any payment or other benefit made directly or indirectly, overtly or covertly, or in cash or in kind to the guardian.</div>
  ${rows}
  <button class="btn btn-outline-primary btn-sm mb-3 mt-3" data-annual-action="add-row" data-collection="remuneration" data-route="/p11">+ Add Entry</button>
  ${pageNavAnnual('/p10','/print')}
  </div>`;
}
export function validateAnnual(){
  const d=window.D; const errs=[];
  const req=(v,label)=>{if(!v||!String(v).trim())errs.push(label);};
  req(d.wardName,'Part I — Ward Name');
  req(d.caseNumber,'Part I — Case Number');
  req(d.guardian,'Part I — Guardian');
  req(d.periodFrom,'Part I — Accounting Period From');
  req(d.periodTo,'Part I — Accounting Period To');
  req(d.gid,'Part I — Guardianship Inception Date (GID)');
  req(d.county,'Part I — County');
  req(d.filingType,'Part I — Filing Type');
  req(d.startingBalance,'Part II — Starting Balance');
  errs.push(...checkDateOrder(d.periodFrom,d.periodTo,{
    sectionLabel:'Part I',earlierLabel:'Accounting Period From',laterLabel:'Accounting Period To',allowSameDay:false,
  }));
  errs.push(...checkDateOrder(d.gid,d.periodFrom,{
    sectionLabel:'Part I',earlierLabel:'Guardianship Inception Date (GID)',laterLabel:'Accounting Period From',allowSameDay:true,
  }));
  d.guardians.forEach((g,i)=>{
    if(i>0&&!guardianHasAnyData(g))return;
    const p=`Part III — Guardian #${i+1}`;
    req(g.name,`${p} — Name`);
    req(g.signatureDate,`${p} — Signature Date`);
    req(g.ssn,`${p} — SSN/EIN`);
    req(g.phone,`${p} — Phone`);
    req(g.mailingStreet,`${p} — Mailing Street`);
    req(g.mailingCityStateZip,`${p} — Mailing City/State/Zip`);
    errs.push(...checkDateOrder(d.periodTo,g.signatureDate,{
      sectionLabel:p,earlierLabel:'Accounting Period To',laterLabel:'Signature Date',allowSameDay:true,
    }));
  });
  req(d.preparer.name,'Part IV — Preparer Name');
  req(d.preparer.signatureDate,'Part IV — Preparer Signature Date');
  req(d.preparer.ssn,'Part IV — Preparer SSN/EIN');
  req(d.preparer.phone,'Part IV — Preparer Phone');
  req(d.preparer.street,'Part IV — Preparer Street');
  req(d.preparer.cityStateZip,'Part IV — Preparer City/State/Zip');
  errs.push(...checkDateOrder(d.periodTo,d.preparer.signatureDate,{
    sectionLabel:'Part IV',earlierLabel:'Accounting Period To',laterLabel:'Preparer Signature Date',allowSameDay:true,
  }));
  req(d.attorney_bar,'Part V — Attorney Bar Number');
  req(d.attorney_phone,'Part V — Attorney Phone');
  req(d.attorney_street,'Part V — Attorney Street');
  req(d.attorney_cityStateZip,'Part V — Attorney City/State/Zip');
  req(d.attorney_signatureDate,'Part V — Attorney Signature Date');
  errs.push(...checkDateOrder(d.periodTo,d.attorney_signatureDate,{
    sectionLabel:'Part V',earlierLabel:'Accounting Period To',laterLabel:'Attorney Signature Date',allowSameDay:true,
  }));
  req(d.bondAmount,'Part IX — Bond Amount');
  req(d.bondingCompany,'Part IX — Bonding Company');
  req(d.certDate,'Part X — Certificate of Service Date');
  errs.push(...checkDateOrder(d.periodTo,d.certDate,{
    sectionLabel:'Part X',earlierLabel:'Accounting Period To',laterLabel:'Certificate of Service Date',allowSameDay:true,
  }));
  req(d.certRecipients?.[0]?.name,'Part X — Recipient 1 Name');

  const rowHasAnyData=r=>Object.values(r).some(v=>v!==''&&v!=null);
  const checkRows=(rows,fields,schedLabel)=>{
    (rows||[]).forEach((r,i)=>{
      if(!rowHasAnyData(r))return;
      fields.forEach(([key,label])=>{
        if(r[key]===''||r[key]==null)errs.push(`${schedLabel} — Line ${i+1} — ${label} is required`);
      });
    });
  };
  checkRows(d.schA,[['payer','Income Source / Payer'],['description','Description'],['bank','Bank Name'],['accountNo','Account #'],['amount','Amount']],'Schedule A');
  checkRows(d.schB1,[['bankAcct','Bank Account #'],['checkNo','Check #'],['datePaid','Date Paid'],['payee','Payee'],['amount','Amount']],'Schedule B-1');
  checkRows(d.schB2,[['bankAcct','Bank Account #'],['checkNo','Check #'],['datePaid','Date Paid'],['payee','Payee'],['amount','Amount']],'Schedule B-2');
  checkRows(d.schB3,[['bankAcct','Bank Account #'],['checkNo','Check #'],['datePaid','Date Paid'],['payee','Payee'],['amount','Amount']],'Schedule B-3');
  checkRows(d.schB4,[['checkNo','Check #'],['datePaid','Date Paid'],['category','Category'],['payee','Payee'],['amount','Amount']],'Schedule B-4');
  checkRows(d.schC,[['description','Description'],['date','Date of Adjustment']],'Schedule C');
  (d.schC||[]).forEach((r,i)=>{
    if(!rowHasAnyData(r))return;
    if((r.gain===''||r.gain==null)&&(r.loss===''||r.loss==null))errs.push(`Schedule C — Line ${i+1} — Gain or Loss amount is required`);
  });
  checkRows(d.schD1,[['description','Description'],['accountNo','Account #'],['restricted','Restricted?'],['type','Type'],['fullAmount','Full Asset Amount'],['wardPct',"Ward's %"]],'Schedule D-1');
  checkRows(d.schD2,[['description','Description'],['residence','Personal Residence?'],['income','Income Property?'],['fullValue','Full Value'],['wardPct',"Ward's %"],['carryingValue','Carrying Value']],'Schedule D-2');
  checkRows(d.schD3,[['description','Description'],['fullAmount','Full Amount'],['wardPct',"Ward's %"],['carryingValue','Carrying Value']],'Schedule D-3');
  checkRows(d.schD4,[['description','Description'],['restricted','Restricted?'],['fullAmount','Full Amount'],['wardPct',"Ward's %"],['carryingValue','Carrying Value']],'Schedule D-4');
  checkRows(d.schD5,[['description','Description'],['loanNo','Loan #'],['loanType','Loan Type'],['fullDebt','Full Debt'],['wardPct',"Ward's %"]],'Schedule D-5');
  checkRows(d.schE,[['bankName','Bank Name']],'Schedule E');
  (d.schE||[]).forEach((r,i)=>{
    if(!rowHasAnyData(r))return;
    const hasIn=r.transferInDate!==''&&r.transferInDate!=null&&r.transferInAmt!==''&&r.transferInAmt!=null;
    const hasOut=r.transferOutDate!==''&&r.transferOutDate!=null&&r.transferOutAmt!==''&&r.transferOutAmt!=null;
    if(!hasIn&&!hasOut)errs.push(`Schedule E — Line ${i+1} — Transfer In (date+amount) or Transfer Out (date+amount) is required`);
  });
  checkRows(d.schF1,[['description','Description'],['bank','Bank'],['accountNo','Account #'],['courtOrderDate','Court Order Date'],['salePrice','Sale Price']],'Schedule F-1');
  checkRows(d.schF2,[['description','Description'],['bank','Bank'],['accountNo','Account #'],['courtOrderDate','Court Order Date'],['salePrice','Sale Price']],'Schedule F-2');

  // Reconciliation. Net assets are derived two independent ways: Line 20
  // (starting balance + income − disbursements ± gains/losses) and Line 30
  // (the sum of the Schedule D asset/liability listings). They must agree —
  // that equality IS the accounting, and it's the first thing the Clerk's
  // audit checks. Previously this was only a soft banner on Parts VI & VII,
  // so an accounting that didn't balance could still be exported and filed.
  // Only raised once the guardian has actually entered figures; an untouched
  // form trivially balances at 0 = 0 and shouldn't be flagged as an error.
  // Line 20 must equal Line 30. A difference no longer blocks export
  // outright — sometimes one is genuinely correct as filed — but it must be
  // explained in writing, and that explanation goes onto the document.
  // Kept short: these render as chips in the missing-fields panel, and the
  // Parts VI & VII page itself shows the full detail.
  const _rec=annualReconcileState();
  if(_rec.outOfBalance&&!_rec.explained){
    errs.push('Parts VI & VII — Net Assets from Changes and Net Assets from Balances don\'t match (off by '
      +fmtAnnual(_rec.diff)+'): correct the schedules or explain the difference');
  }

  return errs;
}
// Milestone 33, Phase 2.3: legacy-app.js's shared updateCurrentScheduleNextButton()
// only itemizes the disabled-Next guidance panel when window.validate<Type> is a
// function (see its dispatch table) -- guardian-inventory/index.js already does
// this for validateGuardian; this file's own errors were computed but never
// exposed, so finalAccounting/trustAccounting (formEngine()==='annual') fell back
// to a single generic message with no per-field jump links.
window.validateAnnual = validateAnnual;
