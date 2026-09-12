import { renderSummaryPage, navStatus } from '../../core/summary-renderer.js';
import { renderFormField, renderSelectField } from '../../core/form/form-fields.js';
import { GUARDIANSHIP_TYPE_OPTIONS, optionsWithLegacyValue } from '../../core/form/guardianship-options.js';
import { checkDateOrder } from '../../core/validation/date-rules.js';
import { addCollectionRow, removeCollectionRow } from '../../core/form/schedule-definitions.js';
import { createSimplifiedGuardian, getSimplifiedGuardianAddressConflicts, normalizeSimplifiedGuardianCompatibility, resolveSimplifiedGuardianAddressConflict } from './guardian-compatibility.js';
import { checkSignatureState, inferLegacySignatureState } from '../../core/validation/signature-state.js';
import { renderSignatureStateControl, mountSignatureStateControls } from '../../core/signature/signature-state-control.js';
// Simplified Accounting — the pilot feature extraction (Milestone 2, Phase
// D of INDEX-SPLIT-PLAN.md's migration sequence). Dynamically imported by
// legacy-app.js's mountSimplifiedFeature()/mountSimplifiedNav() bridges,
// never statically imported, so this module's ~700 lines and its own
// print.js/excel.js children genuinely aren't fetched/evaluated until a
// user actually opens or creates a Simplified Accounting ward.
//
// legacy-app.js stays a classic (non-module) script (Milestone 1's recorded
// decision), so its top-level function declarations are real `window`
// properties this module can destructure -- but a bare top-level `let`
// (activeInventoryType, currentPage) is not; see src/core/state.js's file
// header for the full explanation. Everything below that isn't defined in
// this file is one of those legacy globals, deliberately left in place
// rather than moved or wrapped: some (inpS, countyInputS, pageNavS, tdSig)
// are still shared with the four not-yet-extracted Plan types, and calcTotals
// stays legacy because the dashboard needs it for every Simplified ward's
// card total *before* this module is ever loaded (see the Milestone 2 plan's
// "Problem 1" and "Problem 3").
const {
  esc, ic, tooltip, autoSave, navigate,
  formatName, formatSSN, formatPhone, formatAddress, formatCityStateZip,
  formatDisplayDate,
  sanitizeNonNegativeDecimal, sanitizeNegativeAmounts,
  renderScheduleDocsSection, browserRecommendationNotice, pageIntroRow,
  linkAccordions,
  yesNoCheckboxS, inpS, countyInputS, pageNavS, calcTotals,
  guardianHasAnyData, checkExcelCapacity,
} = window;

// print.js/excel.js are dynamically imported once, together, the first time
// this feature mounts (not deferred further to an actual /print visit or
// export click) -- the Cover page's own "Import Excel File" dropzone needs
// excel.js before the user ever navigates to /print, so deferring it past
// first mount would mean wiring a second, separate lazy-load path for just
// that one control. This still gets the real win:
// nothing here loads until a Simplified ward is actually opened or created.
let _printModule = null;
let _excelModule = null;
let _lazyModulesPromise = null;
const eventControllers = new WeakMap();
// Milestone 39-C: see plan-annual/index.js's identical comment.
const signatureHandles = new WeakMap();

function bindEvents(container) {
  eventControllers.get(container)?.abort();
  const controller = new AbortController();
  eventControllers.set(container, controller);
  const options = { signal: controller.signal };

  container.addEventListener('click', (event) => {
    const actionElement = event.target instanceof Element ? event.target.closest('[data-simplified-action]') : null;
    if (!actionElement) return;
    const index = Number.parseInt(actionElement.dataset.index, 10);
    switch (actionElement.dataset.simplifiedAction) {
      case 'add-guardian': {
        if (addCollectionRow('guardians', window.D, createSimplifiedGuardian)) {
          autoSave();
          navigate('/p4');
        }
        break;
      }
      case 'remove-guardian': {
        if (index > 0 && guardianHasAnyData(window.D.guardians?.[index]) && !window.confirm(`Remove co-guardian ${window.D.guardians[index].name || `#${index + 1}`}? This will delete the entered signature information.`)) break;
        if (removeCollectionRow('guardians', index, window.D)) {
          autoSave();
          navigate('/p4');
        }
        break;
      }
      case 'add-recipient': {
        if (addCollectionRow('certRecipients', window.D)) {
          autoSave();
          navigate('/p6');
        }
        break;
      }
      case 'remove-recipient': {
        if (removeCollectionRow('certRecipients', index, window.D)) {
          autoSave();
          navigate('/p6');
        }
        break;
      }
      case 'add-remuneration': {
        if (addCollectionRow('remuneration', window.D)) {
          autoSave();
          navigate('/p7');
        }
        break;
      }
      case 'choose-excel': actionElement.parentElement.querySelector('input[type="file"]')?.click(); break;
      case 'open-court-portal': window.openFloridaCourtPortal(); break;
      case 'remove-remuneration': {
        if (removeCollectionRow('remuneration', index, window.D)) {
          autoSave();
          navigate('/p7');
        }
        break;
      }
      case 'save-excel': _excelModule.doSaveExcel(); break;
      case 'save-word': _printModule.doSaveDocx(); break;
      case 'save-pdf': _printModule.doSavePdf(); break;
      case 'resolve-guardian-address-conflict': {
        if (resolveSimplifiedGuardianAddressConflict(window.D, index, actionElement.dataset.field, actionElement.dataset.choice)) {
          autoSave();
          navigate('/p4');
        }
        break;
      }
    }
  }, options);
  container.addEventListener('change', (event) => {
    const input = event.target;
    if (input instanceof HTMLInputElement && input.dataset.simplifiedChange === 'import-excel') _excelModule.importExcel(input);
  }, options);
  container.addEventListener('input', (event) => {
    if (event.target instanceof HTMLElement && event.target.dataset.simplifiedRefresh === 'part2') queueMicrotask(refreshPart2);
  }, options);
}

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
  normalizeSimplifiedGuardianCompatibility(window.D, { persistedSource: true });
  sanitizeNegativeAmounts();
  let html;
  switch (page) {
    case '/':      html = pageCover(); break;
    case '/summary': html = renderSummaryPage(getSummaryConfigSimplified()); break;
    case '/p2':    html = pagePart2(); break;
    case '/p3':    html = pagePart3(); break;
    case '/p4':    html = pagePart4(); break;
    case '/p5':    html = pagePart5(); break;
    case '/p6':    html = pagePart6(); break;
    case '/p7':    html = pagePart7(); break;
    case '/print': {
      const capOver = checkExcelCapacity(_excelModule.SIMPLIFIED_EXCEL_CAPS);
      html = _printModule.pagePrintSimplified(capOver);
      break;
    }
    default: html = pageCover();
  }
  container.innerHTML = html;
  bindEvents(container);
  container.scrollTop = 0;
  if (page === '/' || !page) linkAccordions('instructionsZoneSimplified', 'importZoneCover');
  signatureHandles.get(container)?.forEach((h) => h.destroy());
  signatureHandles.delete(container);
  if (page === '/p4' || page === '/p5' || page === '/p6') {
    signatureHandles.set(container, mountSignatureStateControls(container, {
      setImage: (imagePath, dataUrl) => window.setPath(window.D, imagePath, dataUrl),
      route: page,
    }));
  }
  if (page === '/print') await _printModule.mountPreview();
}

export function dispose(container) {
  eventControllers.get(container)?.abort();
  eventControllers.delete(container);
  signatureHandles.get(container)?.forEach((h) => h.destroy());
  signatureHandles.delete(container);
  container.replaceChildren();
}

export function mountNav(container) {
  buildNavSimplified(container);
}

// fmtS and validateSimplified are also used by print.js/excel.js (which
// import them back from here via a static `import` -- safe despite this
// module dynamically importing them, since neither side needs the other's
// export until a function body actually runs, well after both are loaded).
export function fmtS(n){if(n===''||n===null||n===undefined)return '';const v=parseFloat(n);if(isNaN(v))return '';return v<0?`($${Math.abs(v).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})})`:`$${v.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}`;}

function inpSWithTooltip(id,label,tooltipKey,val,req=false,type='text'){
  const html=inpS(id,label,val,req,type);
  const tooltipHtml=tooltip(tooltipKey);
  if(!tooltipHtml)return html;
  const escapedLabel=label.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  return html.replace(new RegExp(`(>)(${escapedLabel})(<span class="req">\\*</span>)?(<\/label>)`),`$1$2${tooltipHtml}$3$4`);
}

function buildNavSimplified(container){
  container.innerHTML=`
    <div class="nav-section">
      <div class="nav-section-label">Simplified Annual Accounting</div>
      <button class="nav-link-item" data-page="/" data-nav="s-cover" data-form-action="navigate" data-route="/">Cover &amp; Part I</button>
      <button class="nav-link-item" data-page="/summary" data-nav="s-summary" data-form-action="navigate" data-route="/summary">Summary</button>
      <button class="nav-link-item" data-page="/p2" data-nav="s-p2" data-form-action="navigate" data-route="/p2">Part II — Accounting</button>
      <button class="nav-link-item" data-page="/p3" data-nav="s-p3" data-form-action="navigate" data-route="/p3">Part III — Declaration</button>
      <button class="nav-link-item" data-page="/p4" data-nav="s-p4" data-form-action="navigate" data-route="/p4">Part IV — Guardians</button>
      <button class="nav-link-item" data-page="/p5" data-nav="s-p5" data-form-action="navigate" data-route="/p5">Part V — Atty Signature</button>
      <button class="nav-link-item" data-page="/p6" data-nav="s-p6" data-form-action="navigate" data-route="/p6">Part VI — Cert. of Service</button>
      <button class="nav-link-item" data-page="/p7" data-nav="s-p7" data-form-action="navigate" data-route="/p7">Part VII — Remuneration</button>
    </div>
    <div class="nav-section">
      <div class="nav-section-label">Output</div>
      <button class="nav-link-item" data-page="/print" data-form-action="navigate" data-route="/print"><span class="nav-link-label">${ic('file',15)}&nbsp; Print Preview</span></button>
    </div>
  `;
}

function getSummaryConfigSimplified(){
  const d=window.D;
  const nav=window.computeNavChecks();
  const t=calcTotals();
  const f=v=>fmtS(v)||'—';
  const fd=v=>v?String(v).substring(0,10):'—';
  return {
    formTitle:'Simplified Annual Accounting — Summary',
    infoRows:[
      {label:'Ward Name',value:esc(d.wardName)},
      {label:'Case Number',value:esc(d.caseNumber)},
      {label:'Period',value:fd(d.periodFrom)+' – '+fd(d.periodTo)},
      {label:'Guardian',value:esc(d.guardian)},
      {label:'Attorney',value:esc(d.attorney)},
      {label:'County',value:esc(d.county)},
      {label:'Type of Guardianship',value:esc(d.typeOfGuardianship)},
    ],
    leftCards:[{
      heading:'Accounting Summary',
      lines:[
        {label:'Line 1 — Starting Balance',value:f(d.startingBalance)},
        {label:'Line 2 — Interest Income',value:f(d.interestIncome)},
        {label:'Line 3 — Deposits from Settlement',value:f(d.depositsSettlement)},
        {label:'Line 4 — Total Income',value:f(t.totalIncome)},
        {label:'Line 5 — Service Charges',value:f(d.serviceCharges)},
        {label:'Line 6 — Federal Income Tax',value:f(d.federalIncomeTax)},
        {label:'Line 7 — Total Disbursements',value:f(t.totalDisbursements)},
        {label:'Line 8 — Remaining Assets On Hand',value:f(t.remaining),isTotal:true},
      ],
    }],
    rightCards:[{
      heading:'Section Completion',
      lines:[
        {label:'Cover &amp; Part I',route:'/',status:navStatus(nav,'s-cover')},
        {label:'Part II — Accounting',route:'/p2',status:navStatus(nav,'s-p2')},
        {label:'Part III — Declaration',route:'/p3',status:navStatus(nav,'s-p3')},
        {label:'Part IV — Guardians',route:'/p4',status:navStatus(nav,'s-p4')},
        {label:'Part V — Atty Signature',route:'/p5',status:navStatus(nav,'s-p5')},
        {label:'Part VI — Cert. of Service',route:'/p6',status:navStatus(nav,'s-p6')},
        {label:'Part VII — Remuneration',route:'/p7',status:navStatus(nav,'s-p7')},
      ],
    }],
    banner:{title:'SIMPLIFIED ACCOUNTING — YEAR-ENDING ASSETS',value:f(t.remaining)},
    nextRoute:'/p2',
  };
}

// ── Cover / Part I ──────────────────────────────────────
function pageCover(){
  const d=window.D;
  const t=calcTotals();
  return `<div class="schedule-page">
    <h1>Cover &amp; Part I — Required Information</h1>
    <div class="instructions-import-row">
      <div class="accordion mb-0">
        <div class="accordion-item">
          <h2 class="accordion-header">
            <button class="accordion-button collapsed py-2" type="button" data-bs-toggle="collapse" data-bs-target="#instructionsZoneSimplified" aria-expanded="false">
              ${ic('clipboard',15)} General Instructions
            </button>
          </h2>
          <div id="instructionsZoneSimplified" class="accordion-collapse collapse">
            <div class="accordion-body" style="padding:1rem 1.25rem;">
              <ul style="margin:0;padding-left:1.4rem;font-size:.8rem;">
                <li>Fields marked with an asterisk (<span class="req">*</span>) are required before export.</li>
                <li>Ward Name and Case Number auto-populate all form pages.</li>
                <li>Verify that this guardianship meets the designated depository criteria under Fla. Stat. § 744.3679.</li>
                <li>Complete Parts I through VII, including guardian signatures and attorney certification.</li>
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
            <button class="accordion-button collapsed py-2" type="button" data-bs-toggle="collapse" data-bs-target="#importZoneCover" aria-expanded="false">
              <svg class="ic" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M4 13.6 6.2 4.6h11.6L20 13.6v5.8H4Z"/><path d="M4 13.6h4.2l1.2 2.4h5.2l1.2-2.4H20"/></svg> Import Excel File (existing simplified accounting template)
            </button>
          </h2>
          <div id="importZoneCover" class="accordion-collapse collapse">
            <div class="accordion-body import-zone-body p-4 text-center">
              <label class="btn btn-outline-primary btn-sm" style="cursor:pointer;">
                <svg class="ic" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M3.4 6.4h5.6l2 2.2h7.6v2.2"/><path d="M3.4 8.6 5.6 19h13.2l2.2-8.2H5.6Z"/></svg> Select File
                <input type="file" accept=".xlsx" class="d-none" data-simplified-change="import-excel">
              </label>
              <p class="mt-2 mb-0" style="color:var(--ink-3);font-size:.8rem;">Select the previously exported Simplified Accounting Excel file</p>
              <div id="import-progress" class="mt-2" style="font-size:.8rem;"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div class="summary-box mb-3">
      <h2 class="subsection-heading">Eligibility — Fla. Stat. § 744.3679</h2>
      <div class="schedule-instructions" style="margin-bottom:.75rem;">The simplified form may only be used when <strong>all</strong> property of the estate is held in a designated depository under § 69.031, and the <strong>only</strong> transactions in that account are interest accrual, deposits from a settlement, or financial institution service charges. If either answer below is "No," use the standard Annual Accounting instead.</div>
      <div class="row g-3">
        <div class="col-md-6">${yesNoCheckboxS('eligDepository','All estate property is held in a designated depository under § 69.031',d.eligDepository,true)}</div>
        <div class="col-md-6">${yesNoCheckboxS('eligOnlyTransactions','The only account transactions are interest accrual, settlement deposits, and/or service charges',d.eligOnlyTransactions,true)}</div>
      </div>
      ${(d.eligDepository==='No'||d.eligOnlyTransactions==='No')?'<div class="mt-2" style="color:var(--danger-text);font-weight:600;font-size:.85rem;">⚠ This guardianship does not appear to qualify for the simplified form. Please use the standard Annual Accounting.</div>':''}
    </div>
    <div class="row g-3 mb-3 cover-info-row">
      <div class="col-md-6">
        <div class="summary-box">
          <h2 class="subsection-heading">Required Information</h2>
          ${inpS('wardName','Name of Ward',d.wardName,true)}
          <div class="row g-2">
            <div class="col-md-6">${inpSWithTooltip('caseNumber','Case Number','case_number',d.caseNumber,true)}</div>
            <div class="col-md-6">${inpS('ssn','Social Security Number',d.ssn,true)}</div>
          </div>
          <div class="row g-2">
            <div class="col-md-6">${inpS('gid','Guardianship Inception Date (GID)',d.gid,true,'date')}</div>
            <div class="col-md-6">${yesNoCheckboxS('amendedForm','Amended Form?',d.amendedForm,true)}</div>
          </div>
          <div class="row g-2">
            <div class="col-md-6">${inpS('periodFrom','Accounting Period From',d.periodFrom,true,'date')}</div>
            <div class="col-md-6">${inpS('periodTo','Accounting Period To',d.periodTo,true,'date')}</div>
          </div>
        </div>
      </div>
      <div class="col-md-6">
        <div class="summary-box">
          <h2 class="subsection-heading">Guardian &amp; Attorney</h2>
          ${inpS('guardian','Guardian',d.guardian,true)}
          <div class="row g-2">
            <div class="col-md-8">${inpS('attorney','Attorney for Guardian',d.attorney,true)}</div>
            <div class="col-md-4">${countyInputS('county','County',d.county,true)}</div>
          </div>
          ${renderSelectField({path:'typeOfGuardianship',label:'Type of Guardianship',value:d.typeOfGuardianship,options:optionsWithLegacyValue(GUARDIANSHIP_TYPE_OPTIONS,d.typeOfGuardianship),required:true})}
        </div>
      </div>
    </div>
    <div style="position:relative;min-height:200px;">
      <div class="summary-box mt-3">
        <h2 class="subsection-heading">Part II — Accounting Summary</h2>
        <div class="summary-line"><span>Starting Balance (Line 1)</span><span>${fmtS(d.startingBalance)||'—'}</span></div>
      <div class="summary-line"><span>Interest Income (Line 2)</span><span>${fmtS(d.interestIncome)||'—'}</span></div>
      <div class="summary-line"><span>Deposits from Settlement (Line 3)</span><span>${fmtS(d.depositsSettlement)||'—'}</span></div>
      <div class="summary-line"><span>Total Income (Line 4)</span><span>${fmtS(t.totalIncome)}</span></div>
      <div class="summary-line"><span>Service Charges (Line 5)</span><span>${fmtS(d.serviceCharges)||'—'}</span></div>
      <div class="summary-line"><span>Federal Income Tax (Line 6)</span><span>${fmtS(d.federalIncomeTax)||'—'}</span></div>
      <div class="summary-line"><span>Total Disbursements (Line 7)</span><span>${fmtS(t.totalDisbursements)}</span></div>
      <div class="summary-line total"><span>Remaining Assets On Hand (Line 8)</span><span>${fmtS(t.remaining)}</span></div>
    </div>
    </div>
    ${pageNavS(null,'/summary')}
  </div>`;
}

// ── Part II – Accounting ────────────────────────────────
function pagePart2(){
  const d=window.D;
  const t=calcTotals();
  return `<div class="schedule-page">
    <h1>Part II — Accounting Summary &amp; Remaining Assets On Hand</h1>
    <div class="schedule-instructions">Only interest income, deposits from settlement, financial institution service charges, and payment of federal income tax qualify for this simplified form.</div>
    <div class="entry-card">
      <div class="entry-card-header">Assets On Hand</div>
      <div class="entry-card-body">
        <div class="line-row">
          <span class="line-tag">Line 1</span>
          <span class="line-label">Starting Balance — Net Assets per Prior Report<span class="req">*</span></span>
          <div class="line-input"><div class="input-group"><span class="input-group-text">$</span><input type="text" inputmode="decimal" class="form-control" id="startingBalance" value="${esc(sanitizeNonNegativeDecimal(d.startingBalance))}" data-form-path="startingBalance" data-form-format="decimal" data-simplified-refresh="part2"></div></div>
        </div>
      </div>
    </div>
    <div class="entry-card">
      <div class="entry-card-header">Income — Only the following receipts qualify</div>
      <div class="entry-card-body">
        <div class="line-row">
          <span class="line-tag">Line 2</span>
          <span class="line-label">Interest Income<span class="req">*</span></span>
          <div class="line-input"><div class="input-group"><span class="input-group-text">$</span><input type="text" inputmode="decimal" class="form-control" id="interestIncome" value="${esc(sanitizeNonNegativeDecimal(d.interestIncome))}" data-form-path="interestIncome" data-form-format="decimal" data-simplified-refresh="part2"></div></div>
        </div>
        <div class="line-row">
          <span class="line-tag">Line 3</span>
          <span class="line-label">Deposits Pursuant to Settlement<span class="req">*</span></span>
          <div class="line-input"><div class="input-group"><span class="input-group-text">$</span><input type="text" inputmode="decimal" class="form-control" id="depositsSettlement" value="${esc(sanitizeNonNegativeDecimal(d.depositsSettlement))}" data-form-path="depositsSettlement" data-form-format="decimal" data-simplified-refresh="part2"></div></div>
        </div>
        <div class="line-row total-line">
          <span class="line-tag">Line 4</span>
          <span class="line-label">Total Income</span>
          <span class="line-val" id="line4">${fmtS(t.totalIncome)}</span>
        </div>
      </div>
    </div>
    <div class="entry-card">
      <div class="entry-card-header">Disbursements — Only the following qualify</div>
      <div class="entry-card-body">
        <div class="line-row">
          <span class="line-tag">Line 5</span>
          <span class="line-label">Financial Institution Service Charges<span class="req">*</span></span>
          <div class="line-input"><div class="input-group"><span class="input-group-text">$</span><input type="text" inputmode="decimal" class="form-control" id="serviceCharges" value="${esc(sanitizeNonNegativeDecimal(d.serviceCharges))}" data-form-path="serviceCharges" data-form-format="decimal" data-simplified-refresh="part2"></div></div>
        </div>
        <div class="line-row">
          <span class="line-tag">Line 6</span>
          <span class="line-label">Federal Income Tax<span class="req">*</span></span>
          <div class="line-input"><div class="input-group"><span class="input-group-text">$</span><input type="text" inputmode="decimal" class="form-control" id="federalIncomeTax" value="${esc(sanitizeNonNegativeDecimal(d.federalIncomeTax))}" data-form-path="federalIncomeTax" data-form-format="decimal" data-simplified-refresh="part2"></div></div>
        </div>
        <div class="line-row total-line">
          <span class="line-tag">Line 7</span>
          <span class="line-label">Total Disbursements</span>
          <span class="line-val" id="line7">${fmtS(t.totalDisbursements)}</span>
        </div>
      </div>
    </div>
    <div class="schedule-totals">
      <div class="tbl"><div class="tr"><div class="td"><strong>Line 8 — Remaining Assets On Hand</strong></div><div class="td" id="line8">${fmtS(t.remaining)}</div></div></div>
    </div>
    ${renderScheduleDocsSection('p2')}
    ${pageNavS('/summary','/p3')}
  </div>`;
}

function refreshPart2(){
  const t=calcTotals();
  const l4=document.getElementById('line4');
  const l7=document.getElementById('line7');
  const l8=document.getElementById('line8');
  if(l4)l4.textContent=fmtS(t.totalIncome);
  if(l7)l7.textContent=fmtS(t.totalDisbursements);
  if(l8)l8.textContent=fmtS(t.remaining);
}

// ── Part III – Declaration ──────────────────────────────
function pagePart3(){
  const d=window.D;
  return `<div class="schedule-page">
    <h1>Part III — Guardian(s) Declaration</h1>
    <div class="attestation-text">Under penalties of perjury, I declare that I have read and examined the foregoing return and that, to the best of my knowledge and belief, it constitutes a full and correct account of all the ward's property of which this guardian has control, and is a complete report of all cash and property transactions and of all receipts and disbursements.</div>
    <div class="schedule-instructions">These dates should match the accounting period on the Cover page. They will appear in the printed Part III declaration.</div>
    <div class="row g-3">
      <div class="col-md-6">${inpS('periodFrom','Period From',d.periodFrom,true,'date')}</div>
      <div class="col-md-6">${inpS('periodTo','Period To',d.periodTo,true,'date')}</div>
    </div>
    ${renderScheduleDocsSection('p3')}
    ${pageNavS('/p2','/p4')}
  </div>`;
}

// ── Part IV – Guardians ─────────────────────────────────
function pagePart4(){
  const d=window.D;
  const conflicts=getSimplifiedGuardianAddressConflicts(d);
  const labels=['Guardian #1','Co-Guardian #2','Co-Guardian #3'];
  const cards=(d.guardians||[]).map((g,i)=>{
    const removeBtn=i===0?'':`<button type="button" class="btn btn-outline-danger btn-sm" data-simplified-action="remove-guardian" data-index="${i}">✕ Remove</button>`;
    return `<div class="col-12 col-lg-6"><div class="entry-card mb-0 h-100">
      <div class="entry-card-header d-flex justify-content-between align-items-center gap-2"><span>${labels[i]||`Co-Guardian #${i+1}`}</span><span class="entry-card-actions d-flex gap-2"><button type="button" class="btn btn-outline-secondary btn-sm" data-form-action="link-party" data-role="guardian" data-index="${i}">Link Person</button>${removeBtn}</span></div>
      <div class="entry-card-body">
        <div class="row g-2">
          <div class="col-md-6">${renderFormField({ path: `guardians.${i}.name`, label: `${labels[i]||`Co-Guardian #${i+1}`}'s Name`, value: g.name, required: true })}</div>
          <div class="col-md-3">${renderFormField({ path: `guardians.${i}.signatureDate`, label: 'Signature Date', value: g.signatureDate, type: 'date', required: true, id: `guardians_${i}_sigDate` })}</div>
          <div class="col-12">${renderSignatureStateControl({ path: `guardians.${i}`, state: inferLegacySignatureState(g.signatureState, g.signatureDate), route: '/p4', signatureImage: g.signatureImage })}</div>
          <div class="col-md-3">${renderFormField({ path: `guardians.${i}.ssn`, label: 'SSN / EIN', value: g.ssn, required: true })}</div>
          <div class="col-md-4">${renderFormField({ path: `guardians.${i}.phone`, label: 'Phone Number', value: g.phone, required: true })}</div>
          <div class="col-md-8">${renderFormField({ path: `guardians.${i}.email`, label: 'Email Address', value: g.email, type: 'email', required: true })}</div>
          <div class="col-md-6">${renderFormField({ path: `guardians.${i}.mailingStreet`, label: 'Mailing Street Address', value: g.mailingStreet, required: true })}</div>
          <div class="col-md-6">${renderFormField({ path: `guardians.${i}.mailingCityStateZip`, label: 'Mailing City / State / Zip', value: g.mailingCityStateZip, required: true })}</div>
          <div class="col-md-6">${renderFormField({ path: `guardians.${i}.residenceStreet`, label: 'Residence / Corporate Street Address', value: g.residenceStreet, required: true })}</div>
          <div class="col-md-6">${renderFormField({ path: `guardians.${i}.residenceCityStateZip`, label: 'Residence / Corporate City / State / Zip', value: g.residenceCityStateZip, required: true })}</div>
        </div>
      </div>
    </div></div>`;
  }).join('');
  const addCoBtn=(d.guardians||[]).length<3?`<button type="button" class="btn btn-outline-secondary btn-sm mb-3 no-print" data-simplified-action="add-guardian">+ Add Co-Guardian</button>`:'';
  const conflictControls=conflicts.map(conflict=>`<div class="validation-panel mb-3"><div class="validation-title">Guardian address needs your decision</div><div class="validation-sub">Guardian #${conflict.rowIndex+1}: the saved residence value and recovered legacy value differ.</div><div class="d-flex gap-2 mt-2"><button type="button" class="btn btn-outline-secondary btn-sm" data-simplified-action="resolve-guardian-address-conflict" data-index="${conflict.rowIndex}" data-field="${conflict.field}" data-choice="canonical">Keep residence value</button><button type="button" class="btn btn-outline-primary btn-sm" data-simplified-action="resolve-guardian-address-conflict" data-index="${conflict.rowIndex}" data-field="${conflict.field}" data-choice="legacy">Use recovered legacy value</button></div></div>`).join('');
  return `<div class="schedule-page"><h1>Part IV — Guardian(s) Information</h1>
  <div class="schedule-instructions">All guardians of the property must sign and provide the most current address, telephone number, and social security number. Only reports with original signatures will be audited by the Clerk of the Court.</div>
  ${conflictControls}
  <div class="row g-3 card-grid-2col mb-3">${cards}</div>
  ${addCoBtn}
  ${renderScheduleDocsSection('p4')}${pageNavS('/p3','/p5')}</div>`;
}

// ── Part V – Attorney Signature ─────────────────────────
function pagePart5(){
  const d=window.D;
  return `<div class="schedule-page">
    <h1>Part V — Guardian Attorney Signature</h1>
    <div class="attestation-text">The undersigned Attorney hereby notifies the Court of the filing of the simplified annual accounting of the Guardian. This simplified annual accounting is the representation of the guardian. The undersigned attorney represents that he/she has examined the contents of the accounting and that it conforms to the requirements of the Florida Guardianship Law.</div>
    <div class="row g-3 card-grid-2col">
      <div class="col-12 col-lg-6">
        <div class="entry-card mb-0 h-100">
          <div class="entry-card-header d-flex justify-content-between align-items-center gap-2"><span>Guardian Attorney Attestation</span><button type="button" class="btn btn-outline-secondary btn-sm" data-form-action="link-party" data-role="attorney" data-index="0">Link Person</button></div>
          <div class="entry-card-body">
            <div class="row g-2">
              <div class="col-md-6">${inpS('attorney','Attorney Name (linked to Part I)',d.attorney)}</div>
              <div class="col-md-3">${inpSWithTooltip('attorney_signatureDate','Signature Date','signature_date',d.attorney_signatureDate,'','date')}</div>
              <div class="col-12">${renderSignatureStateControl({ path: 'attorney', state: inferLegacySignatureState(d.attorney_signatureState, d.attorney_signatureDate), route: '/p5', signatureImage: d.attorney_signatureImage, statePath: 'attorney_signatureState', imagePath: 'attorney_signatureImage' })}</div>
              <div class="col-md-3">${inpS('attorney_barNumber','Bar Number',d.attorney_barNumber,true)}</div>
              <div class="col-md-4">${inpS('attorney_phone','Phone Number',d.attorney_phone,true)}</div>
              <div class="col-md-4">${inpS('attorney_email','Primary Email (e-filing)',d.attorney_email,true,'email')}</div>
              <div class="col-md-4">${inpS('attorney_secondaryEmail','Secondary Email (optional)',d.attorney_secondaryEmail,false,'email')}</div>
              <div class="col-md-8">${inpS('attorney_street','Street Address',d.attorney_street,true)}</div>
              <div class="col-md-4">${inpS('attorney_cityStateZip','City / State / Zip Code',d.attorney_cityStateZip,true)}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
    ${renderScheduleDocsSection('p5')}
    ${pageNavS('/p4','/p6')}
  </div>`;
}

function pagePart6(){
  const d=window.D;
  const cards=(d.certRecipients||[]).map((r,i)=>{
    const req=(i===0||i===2)?'<span class="req">*</span>':'';
    const removeBtn=i===0?'':`<button type="button" class="btn btn-outline-danger btn-sm" data-simplified-action="remove-recipient" data-index="${i}">✕ Remove</button>`;
    return `<div class="col-12 col-lg-6"><div class="entry-card mb-0 h-100">
      <div class="entry-card-header d-flex justify-content-between align-items-center gap-2"><span>Recipient ${i+1}</span><span class="entry-card-actions">${removeBtn}</span></div>
      <div class="entry-card-body">
        <div class="row g-2">
          <div class="col-12"><label class="form-label">Name and Address Line 1${req}</label><input type="text" class="form-control" value="${esc(formatName(r.name||''))}" data-form-path="certRecipients.${i}.name" data-form-format="name"></div>
          <div class="col-12"><label class="form-label">Line 2</label><input type="text" class="form-control" value="${esc(formatAddress(r.line2||''))}" data-form-path="certRecipients.${i}.line2" data-form-format="address"></div>
          <div class="col-12"><label class="form-label">Line 3</label><input type="text" class="form-control" value="${esc(formatAddress(r.line3||''))}" data-form-path="certRecipients.${i}.line3" data-form-format="address"></div>
        </div>
      </div>
    </div></div>`;
  }).join('');
  return `<div class="schedule-page">
    <h1>Part VI (Part X) — Guardian Attorney Certificate of Service</h1>
    <div class="schedule-instructions">Pursuant to Florida Statute 744.362(1), I hereby certify that a copy of this simplified annual accounting has been furnished to the recipients below.</div>
    <div class="row g-3 mb-3">
      <div class="col-md-4">${inpS('certServiceDate','Date of Service',d.certServiceDate,true,'date')}</div>
      <div class="col-md-8">${inpS('certIndicator','Indicate if (e.g. hand-delivered, mailed)',d.certIndicator,true)}</div>
    </div>
    <h2 style="color:var(--ink);margin:.75rem 0 .4rem;font-size:.95rem;">Recipients</h2>
    <div class="row g-3 card-grid-2col mb-3">
      ${cards}
    </div>
    <button type="button" class="btn btn-outline-secondary btn-sm mb-4 no-print" data-simplified-action="add-recipient">+ Add Recipient</button>
    <h2 style="color:var(--ink);margin:.75rem 0 .4rem;font-size:.95rem;">Attorney Signature</h2>
    <div class="schedule-instructions">Leave these blank to reuse the Bar Number, Phone, Street Address, and City/State/Zip entered on the Part V — Atty Signature page; only fill them in if this signature uses different contact information.</div>
    <div class="row g-3 card-grid-2col">
      <div class="col-12 col-lg-6">
        <div class="entry-card mb-0 h-100">
          <div class="entry-card-header">Attorney Certification</div>
          <div class="entry-card-body">
            <div class="row g-2">
              <div class="col-md-6"><label class="form-label">Attorney Name (linked)</label><input type="text" class="form-control" value="${esc(formatName(d.attorney||''))}" data-form-path="attorney" data-form-format="name"></div>
              <div class="col-md-3">${inpSWithTooltip('certAttySignDate','Signature Date','signature_date',d.certAttySignDate,'','date')}</div>
              <div class="col-12">${renderSignatureStateControl({ path: 'certAttorney', state: inferLegacySignatureState(d.certAttySignatureState, d.certAttySignDate), route: '/p6', signatureImage: d.certAttySignatureImage, statePath: 'certAttySignatureState', imagePath: 'certAttySignatureImage' })}</div>
              <div class="col-md-3">${inpS('certAttyBarNumber','Bar Number',d.certAttyBarNumber)}</div>
              <div class="col-md-4">${inpS('certAttyPhone','Phone Number',d.certAttyPhone)}</div>
              <div class="col-md-8">${inpS('certAttyStreet','Street Address',d.certAttyStreet)}</div>
              <div class="col-md-12">${inpS('certAttyCityStateZip','City / State / Zip Code',d.certAttyCityStateZip)}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
    ${renderScheduleDocsSection('p6')}
    ${pageNavS('/p5','/p7')}
  </div>`;
}

// ── Part VII – Remuneration ─────────────────────────────
function pagePart7(){
  const d=window.D;
  let rows='';
  if (d.remuneration && d.remuneration.length > 0) {
    rows='<div class="row g-3 schedule-entry-grid">'+d.remuneration.map((r,i)=>`<div class="col-12 col-lg-6"><div class="entry-card mb-0 h-100">
      <div class="entry-card-header">
        <span>Remuneration Entry ${i+1}</span>
        <span class="entry-card-actions">
          <button class="btn btn-sm btn-outline-danger ms-auto" data-simplified-action="remove-remuneration" data-index="${i}">✕ Remove</button>
        </span>
      </div>
      <div class="entry-card-body">
        <div class="row g-2">
          <div class="col-md-6"><label class="form-label">Guardian Name <span class="req">*</span></label><input type="text" class="form-control" value="${esc(formatName(r.guardian||''))}" data-form-path="remuneration.${i}.guardian" data-form-format="name"></div>
          <div class="col-md-6"><label class="form-label">Type <span class="req">*</span></label><input type="text" class="form-control" value="${esc(formatName(r.type||''))}" data-form-path="remuneration.${i}.type" data-form-format="name"></div>
          <div class="col-12"><label class="form-label">Description</label><input type="text" class="form-control" value="${esc(r.description||'')}" data-form-path="remuneration.${i}.description"></div>
        </div>
      </div>
    </div></div>`).join('')+'</div>';
  } else {
    rows=`<div class="schedule-empty"><p class="text-muted mb-0">No remuneration entries added yet.</p></div>`;
  }
  return `<div class="schedule-page">
    <h1>Part VII — Guardian(s) Declaration of Remuneration</h1>
    <div class="schedule-instructions">Per 744.367(3)(a), the annual guardianship report must include a declaration of all remuneration received by the guardian from any source for services rendered to or on behalf of the ward.</div>
    ${rows}
    <button class="btn btn-outline-primary btn-sm mb-3 mt-3" data-simplified-action="add-remuneration">+ Add Entry</button>
    ${renderScheduleDocsSection('p7')}
    ${pageNavS('/p6','/print')}
  </div>`;
}

export function validateSimplified(){
  const d=window.D;
  const errs=[];
  getSimplifiedGuardianAddressConflicts(d).forEach(conflict=>errs.push(`Part IV — Guardian #${conflict.rowIndex+1} — resolve conflicting residence address before export`));
  const req=(v,label)=>{if(v===''||v===null||v===undefined)errs.push(label);};
  const reqYes=(v,label)=>{if(v!=='Yes')errs.push(label);};
  reqYes(d.eligDepository,'Cover — Eligibility: all estate property must be held in a designated depository under § 69.031 — otherwise use the standard Annual Accounting');
  reqYes(d.eligOnlyTransactions,'Cover — Eligibility: only interest accrual, settlement deposits, and financial institution service charges may occur in the account — otherwise use the standard Annual Accounting');
  req(d.wardName,'Cover — Name of Ward');
  req(d.caseNumber,'Cover — Case Number');
  req(d.ssn,'Cover — Social Security Number');
  req(d.gid,'Cover — Guardianship Inception Date (GID)');
  req(d.periodFrom,'Cover — Accounting Period From');
  req(d.periodTo,'Cover — Accounting Period To');
  req(d.guardian,'Cover — Guardian');
  req(d.attorney,'Cover — Attorney for Guardian');
  req(d.typeOfGuardianship,'Cover — Type of Guardianship');
  req(d.county,'Cover — County');
  req(d.amendedForm,'Cover — Amended Form?');
  errs.push(...checkDateOrder(d.periodFrom,d.periodTo,{
    sectionLabel:'Cover',earlierLabel:'Accounting Period From',laterLabel:'Accounting Period To',allowSameDay:false,
  }));
  errs.push(...checkDateOrder(d.gid,d.periodFrom,{
    sectionLabel:'Cover',earlierLabel:'Guardianship Inception Date (GID)',laterLabel:'Accounting Period From',allowSameDay:true,
  }));
  req(d.startingBalance,'Part II — Starting Balance (Line 1)');
  req(d.interestIncome,'Part II — Interest Income (Line 2)');
  req(d.depositsSettlement,'Part II — Deposits Pursuant to Settlement (Line 3)');
  req(d.serviceCharges,'Part II — Financial Institution Service Charges (Line 5)');
  req(d.federalIncomeTax,'Part II — Federal Income Tax (Line 6)');
  const gLabel=['Guardian #1','Co-Guardian #2','Co-Guardian #3'];
  d.guardians.forEach((g,i)=>{
    if(i>0&&!guardianHasAnyData(g))return;
    const p=gLabel[i];
    req(g.name,`Part IV — ${p} — Name`);
    // Milestone 39-C: replaces the old unconditional req(g.signatureDate,...)
    // -- Unsigned, "/s/" Signed, and Signature Stamp all now validate, same
    // rule as 39-B's Guardian pilot. name omitted: g.name is already
    // unconditionally required immediately above.
    errs.push(...checkSignatureState({
      state: inferLegacySignatureState(g.signatureState, g.signatureDate),
      date: g.signatureDate,
      image: g.signatureImage,
      sectionLabel: 'Part IV', roleLabel: p,
    }));
    req(g.ssn,`Part IV — ${p} — SSN/EIN`);
    req(g.phone,`Part IV — ${p} — Phone Number`);
    req(g.email,`Part IV — ${p} — Email Address`);
    req(g.mailingStreet,`Part IV — ${p} — Mailing Street Address`);
    req(g.mailingCityStateZip,`Part IV — ${p} — Mailing City/State/Zip`);
    req(g.residenceStreet,`Part IV — ${p} — Residence Street Address`);
    req(g.residenceCityStateZip,`Part IV — ${p} — Residence City/State/Zip`);
    errs.push(...checkDateOrder(d.periodTo,g.signatureDate,{
      sectionLabel:`Part IV — ${p}`,earlierLabel:'Accounting Period To',laterLabel:'Signature Date',allowSameDay:true,
    }));
  });
  req(d.attorney_barNumber,'Part V — Attorney Bar Number');
  req(d.attorney_phone,'Part V — Attorney Phone Number');
  req(d.attorney_street,'Part V — Attorney Street Address');
  req(d.attorney_cityStateZip,'Part V — Attorney City/State/Zip');
  errs.push(...checkDateOrder(d.periodTo,d.attorney_signatureDate,{
    sectionLabel:'Part V',earlierLabel:'Accounting Period To',laterLabel:'Signature Date',allowSameDay:true,
  }));
  // Milestone 39-C: attorney_name (d.attorney) is already independently,
  // unconditionally required at Cover ("Cover — Attorney for Guardian"
  // above) -- name omitted here to avoid a duplicate message for the same
  // blank field.
  errs.push(...checkSignatureState({
    state: inferLegacySignatureState(d.attorney_signatureState, d.attorney_signatureDate),
    date: d.attorney_signatureDate,
    image: d.attorney_signatureImage,
    sectionLabel: 'Part V', roleLabel: 'Attorney',
  }));
  req(d.certServiceDate,'Part VI — Date of Service');
  errs.push(...checkDateOrder(d.periodTo,d.certServiceDate,{
    sectionLabel:'Part VI',earlierLabel:'Accounting Period To',laterLabel:'Date of Service',allowSameDay:true,
  }));
  req(d.certIndicator,'Part VI — "Indicate if"');
  req(d.certRecipients?.[0]?.name,'Part VI — Recipient 1 — Name and Address');
  // Milestone 39-C: certAttySignDate had no requiredness of any kind before
  // this -- not even order-check-only (confirmed during the 39-C inventory
  // audit). The attorney name here is the same shared `d.attorney` field
  // Part V uses (already required at Cover), so name is omitted for the
  // same reason as Part V's own check above.
  errs.push(...checkSignatureState({
    state: inferLegacySignatureState(d.certAttySignatureState, d.certAttySignDate),
    date: d.certAttySignDate,
    image: d.certAttySignatureImage,
    sectionLabel: 'Part VI', roleLabel: 'Attorney',
  }));
  return errs;
}
// Milestone 33, Phase 2.3: see annual-accounting/index.js's identical comment --
// exposing this lets the shared guidance panel itemize Simplified's own missing
// fields instead of only showing a generic message.
window.validateSimplified = validateSimplified;
