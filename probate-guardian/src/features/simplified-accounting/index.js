import { renderSummaryPage } from '../../core/summary-renderer.js';
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
  sanitizeNonNegativeDecimal, sanitizeNegativeAmounts,
  renderScheduleDocsSection, browserRecommendationNotice, pageIntroRow,
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
      case 'add-remuneration': window.D.remuneration.push({ guardian: '', type: '', description: '' }); autoSave(); navigate('/p7'); break;
      case 'choose-excel': actionElement.parentElement.querySelector('input[type="file"]')?.click(); break;
      case 'open-court-portal': window.openFloridaCourtPortal(); break;
      case 'remove-remuneration': window.D.remuneration.splice(index, 1); autoSave(); navigate('/p7'); break;
      case 'save-excel': _excelModule.doSaveExcel(); break;
      case 'save-pdf': _printModule.doSavePdf(); break;
    }
  }, options);
  container.addEventListener('change', (event) => {
    const input = event.target;
    if (input instanceof HTMLInputElement && input.dataset.simplifiedChange === 'import-excel') _excelModule.importExcel(input);
    if (input instanceof HTMLInputElement && input.dataset.simplifiedChange === 'set-sig-style') {
      window.D.signatureStyle = input.value;
      autoSave();
      navigate('/print');
    }
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
  if (page === '/print') await _printModule.mountPreview();
}

export function dispose(container) {
  eventControllers.get(container)?.abort();
  eventControllers.delete(container);
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
    rightCards:[],
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
    ${browserRecommendationNotice()}
    <div class="schedule-instructions">Fields marked <span class="req">*</span> are required before export.</div>
    ${pageIntroRow(`<div class="accordion mb-0">
      <div class="accordion-item">
        <h2 class="accordion-header">
          <button class="accordion-button py-2" type="button" data-bs-toggle="collapse" data-bs-target="#importZoneCover" aria-expanded="true">
            <svg class="ic" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M4 13.6 6.2 4.6h11.6L20 13.6v5.8H4Z"/><path d="M4 13.6h4.2l1.2 2.4h5.2l1.2-2.4H20"/></svg> Import Excel File (existing simplified accounting template)
          </button>
        </h2>
        <div id="importZoneCover" class="accordion-collapse collapse show">
          <div class="accordion-body" style="border:2px dashed var(--brand);border-top:none;border-radius:0 0 8px 8px;background:var(--surface-2);text-align:center;padding:1.5rem;">
            <label class="btn btn-outline-primary btn-sm" style="cursor:pointer;">
              <svg class="ic" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M3.4 6.4h5.6l2 2.2h7.6v2.2"/><path d="M3.4 8.6 5.6 19h13.2l2.2-8.2H5.6Z"/></svg> Select File
              <input type="file" accept=".xlsx" style="display:none" data-simplified-change="import-excel">
            </label>
            <p style="color:var(--ink-3);font-size:.8rem;margin:.5rem 0 0;">Select the previously exported Simplified Accounting Excel file</p>
            <div id="import-progress" style="margin-top:.5rem;font-size:.8rem;"></div>
          </div>
        </div>
      </div>
    </div>`)}
    <div class="summary-box mb-3">
      <h2 class="subsection-heading">Eligibility — Fla. Stat. § 744.3679</h2>
      <div class="schedule-instructions" style="margin-bottom:.75rem;">The simplified form may only be used when <strong>all</strong> property of the estate is held in a designated depository under § 69.031, and the <strong>only</strong> transactions in that account are interest accrual, deposits from a settlement, or financial institution service charges. If either answer below is "No," use the standard Annual Accounting instead.</div>
      <div class="row g-3">
        <div class="col-md-6">${yesNoCheckboxS('eligDepository','All estate property is held in a designated depository under § 69.031',d.eligDepository,true)}</div>
        <div class="col-md-6">${yesNoCheckboxS('eligOnlyTransactions','The only account transactions are interest accrual, settlement deposits, and/or service charges',d.eligOnlyTransactions,true)}</div>
      </div>
      ${(d.eligDepository==='No'||d.eligOnlyTransactions==='No')?'<div class="mt-2" style="color:var(--danger-text);font-weight:600;font-size:.85rem;">⚠ This guardianship does not appear to qualify for the simplified form. Please use the standard Annual Accounting.</div>':''}
    </div>
    <div class="row g-3">
      <div class="col-md-6">${inpS('wardName','Name of Ward',d.wardName,true)}</div>
      <div class="col-md-6">${inpSWithTooltip('caseNumber','Case Number','case_number',d.caseNumber,true)}</div>
      <div class="col-md-6">${inpS('ssn','Social Security Number',d.ssn,true)}</div>
      <div class="col-md-6">${inpS('gid','Guardianship Inception Date (GID)',d.gid,true,'date')}</div>
      <div class="col-md-6">${inpS('periodFrom','Accounting Period From',d.periodFrom,true,'date')}</div>
      <div class="col-md-6">${inpS('periodTo','Accounting Period To',d.periodTo,true,'date')}</div>
      <div class="col-md-6">${inpS('guardian','Guardian',d.guardian,true)}</div>
      <div class="col-md-6">${inpS('attorney','Attorney for Guardian',d.attorney,true)}</div>
      <div class="col-md-6">${inpS('typeOfGuardianship','Type of Guardianship',d.typeOfGuardianship,true)}</div>
      <div class="col-md-3">${countyInputS('county','County',d.county,true)}</div>
      <div class="col-md-3">${yesNoCheckboxS('amendedForm','Amended Form?',d.amendedForm,true)}</div>
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
  let html=`<div class="schedule-page"><h1>Part IV — Guardian(s) Information</h1>
  <div class="schedule-instructions">All guardians of the property must sign and provide the most current address, telephone number, and social security number. Only reports with original signatures will be audited by the Clerk of the Court.</div>`;
  const labels=['Guardian #1','Co-Guardian #2','Co-Guardian #3'];
  d.guardians.forEach((g,i)=>{
    const useSlashS = g.useSlashS !== false;
    const slashSlider = `<div class="form-check form-switch ms-auto d-inline-block"><input class="form-check-input" type="checkbox" role="switch" id="simp_g_slashs_${i}" ${useSlashS?'checked':''} data-form-path="guardians.${i}.useSlashS"><label class="form-check-label" for="simp_g_slashs_${i}">Use /s/ format</label></div>`;
    html+=`<div class="entry-card mb-3">
      <div class="entry-card-header d-flex justify-content-between align-items-center"><span>${labels[i]}</span>${slashSlider}</div>
      <div class="entry-card-body">
        <div class="row g-2">
          <div class="col-md-6"><label class="form-label">${labels[i]}'s Name <span class="req">*</span></label><input type="text" class="form-control" value="${esc(formatName(g.name||''))}" data-form-path="guardians.${i}.name" data-form-format="name"></div>
          <div class="col-md-3"><label class="form-label">Signature Date<span class="req">*</span></label><input type="date" class="form-control" value="${esc(g.signatureDate)}" data-form-path="guardians.${i}.signatureDate"></div>
          <div class="col-md-3"><label class="form-label">SSN / EIN<span class="req">*</span></label><div class="ssn-mask-wrap"><input type="password" autocomplete="off" class="form-control" value="${esc(formatSSN(g.ssn||''))}" data-form-path="guardians.${i}.ssn" data-form-format="ssn"><button type="button" class="ssn-reveal-btn" aria-label="Show SSN/EIN" data-form-action="toggle-ssn">${ic('lock',14)}</button></div></div>
          <div class="col-md-4"><label class="form-label">Phone Number<span class="req">*</span></label><input type="text" class="form-control" value="${esc(formatPhone(g.phone||''))}" data-form-path="guardians.${i}.phone" data-form-format="phone"></div>
          <div class="col-md-8"><label class="form-label">Email Address<span class="req">*</span></label><input type="text" class="form-control" value="${esc(g.email)}" data-form-path="guardians.${i}.email"></div>
          <div class="col-md-6"><label class="form-label">Mailing Street Address<span class="req">*</span></label><input type="text" class="form-control" value="${esc(formatAddress(g.mailingStreet||''))}" data-form-path="guardians.${i}.mailingStreet" data-form-format="address"></div>
          <div class="col-md-6"><label class="form-label">Mailing City / State / Zip<span class="req">*</span></label><input type="text" class="form-control" value="${esc(formatCityStateZip(g.mailingCityStateZip||''))}" data-form-path="guardians.${i}.mailingCityStateZip" data-form-format="city-state-zip"></div>
          <div class="col-md-6"><label class="form-label">Residence / Corporate Street Address<span class="req">*</span></label><input type="text" class="form-control" value="${esc(formatAddress(g.residenceStreet||''))}" data-form-path="guardians.${i}.residenceStreet" data-form-format="address"></div>
          <div class="col-md-6"><label class="form-label">Residence / Corporate City / State / Zip<span class="req">*</span></label><input type="text" class="form-control" value="${esc(formatCityStateZip(g.residenceCityStateZip||''))}" data-form-path="guardians.${i}.residenceCityStateZip" data-form-format="city-state-zip"></div>
        </div>
      </div>
    </div>`;
  });
  html+=`${renderScheduleDocsSection('p4')}${pageNavS('/p3','/p5')}</div>`;
  return html;
}

// ── Part V – Attorney Signature ─────────────────────────
function pagePart5(){
  const d=window.D;
  const attySlashS = d.attorney_useSlashS !== false;
  const slashSlider = `<div class="form-check form-switch ms-auto d-inline-block"><input class="form-check-input" type="checkbox" role="switch" id="simp_atty_slashs" ${attySlashS?'checked':''} data-form-path="attorney_useSlashS"><label class="form-check-label" for="simp_atty_slashs">Use /s/ format</label></div>`;
  return `<div class="schedule-page">
    <div class="d-flex justify-content-between align-items-center">
      <h1>Part V — Guardian Attorney Signature</h1>
      ${slashSlider}
    </div>
    <div class="attestation-text">The undersigned Attorney hereby notifies the Court of the filing of the simplified annual accounting of the Guardian. This simplified annual accounting is the representation of the guardian. The undersigned attorney represents that he/she has examined the contents of the accounting and that it conforms to the requirements of the Florida Guardianship Law.</div>
    <div class="row g-3">
      <div class="col-md-6">${inpS('attorney','Attorney Name (linked to Part I)',d.attorney)}</div>
      <div class="col-md-3">${inpSWithTooltip('attorney_signatureDate','Signature Date','signature_date',d.attorney_signatureDate,'','date')}</div>
      <div class="col-md-3">${inpS('attorney_barNumber','Bar Number',d.attorney_barNumber,true)}</div>
      <div class="col-md-4">${inpS('attorney_phone','Phone Number',d.attorney_phone,true)}</div>
      <div class="col-md-4">${inpS('attorney_email','Primary Email (e-filing)',d.attorney_email,true,'email')}</div>
      <div class="col-md-4">${inpS('attorney_secondaryEmail','Secondary Email (optional)',d.attorney_secondaryEmail,false,'email')}</div>
      <div class="col-md-8">${inpS('attorney_street','Street Address',d.attorney_street,true)}</div>
      <div class="col-md-4">${inpS('attorney_cityStateZip','City / State / Zip Code',d.attorney_cityStateZip,true)}</div>
    </div>
    ${renderScheduleDocsSection('p5')}
    ${pageNavS('/p4','/p6')}
  </div>`;
}

function pagePart6(){
  const d=window.D;
  function recipCard(i){
    const r=d.certRecipients[i];
    const req=(i===0||i===2)?'<span class="req">*</span>':'';
    return `<div class="entry-card mb-2">
      <div class="entry-card-header">Recipient ${i+1}</div>
      <div class="entry-card-body">
        <div class="row g-2">
          <div class="col-12"><label class="form-label">Name and Address Line 1${req}</label><input type="text" class="form-control" value="${esc(formatName(r.name||''))}" data-form-path="certRecipients.${i}.name" data-form-format="name"></div>
          <div class="col-12"><label class="form-label">Line 2</label><input type="text" class="form-control" value="${esc(formatAddress(r.line2||''))}" data-form-path="certRecipients.${i}.line2" data-form-format="address"></div>
          <div class="col-12"><label class="form-label">Line 3</label><input type="text" class="form-control" value="${esc(formatAddress(r.line3||''))}" data-form-path="certRecipients.${i}.line3" data-form-format="address"></div>
        </div>
      </div>
    </div>`;
  }
  return `<div class="schedule-page">
    <h1>Part VI (Part X) — Guardian Attorney Certificate of Service</h1>
    <div class="schedule-instructions">Pursuant to Florida Statute 744.362(1), I hereby certify that a copy of this simplified annual accounting has been furnished to the recipients below.</div>
    <div class="row g-3 mb-3">
      <div class="col-md-4">${inpS('certServiceDate','Date of Service',d.certServiceDate,true,'date')}</div>
      <div class="col-md-8">${inpS('certIndicator','Indicate if (e.g. hand-delivered, mailed)',d.certIndicator,true)}</div>
    </div>
    <div class="row g-3">
      <div class="col-md-6">${recipCard(0)}</div>
      <div class="col-md-6">${recipCard(1)}</div>
      <div class="col-md-6">${recipCard(2)}</div>
      <div class="col-md-6">${recipCard(3)}</div>
    </div>
    <h2 class="mt-3" style="font-size:.8rem;font-weight:700;">Attorney Signature</h2>
    <div class="schedule-instructions">Leave these blank to reuse the Bar Number, Phone, Street Address, and City/State/Zip entered on the Part V — Atty Signature page; only fill them in if this signature uses different contact information.</div>
    <div class="row g-3">
      <div class="col-md-6"><label class="form-label">Attorney Name (linked)</label><input type="text" class="form-control" value="${esc(formatName(d.attorney||''))}" data-form-path="attorney" data-form-format="name"></div>
      <div class="col-md-3">${inpSWithTooltip('certAttySignDate','Signature Date','signature_date',d.certAttySignDate,'','date')}</div>
      <div class="col-md-3">${inpS('certAttyBarNumber','Bar Number',d.certAttyBarNumber)}</div>
      <div class="col-md-4">${inpS('certAttyPhone','Phone Number',d.certAttyPhone)}</div>
      <div class="col-md-8">${inpS('certAttyStreet','Street Address',d.certAttyStreet)}</div>
      <div class="col-md-12">${inpS('certAttyCityStateZip','City / State / Zip Code',d.certAttyCityStateZip)}</div>
    </div>
    ${renderScheduleDocsSection('p6')}
    ${pageNavS('/p5','/p7')}
  </div>`;
}

// ── Part VII – Remuneration ─────────────────────────────
function pagePart7(){
  const d=window.D;
  let rows='';
  d.remuneration.forEach((r,i)=>{
    rows+=`<div class="entry-card mb-2">
      <div class="entry-card-header">Remuneration Entry ${i+1} <button class="btn btn-sm btn-outline-danger" data-simplified-action="remove-remuneration" data-index="${i}">Remove</button></div>
      <div class="entry-card-body">
        <div class="row g-2">
          <div class="col-md-6"><label class="form-label">Guardian Name <span class="req">*</span></label><input type="text" class="form-control" value="${esc(formatName(r.guardian||''))}" data-form-path="remuneration.${i}.guardian" data-form-format="name"></div>
          <div class="col-md-6"><label class="form-label">Type <span class="req">*</span></label><input type="text" class="form-control" value="${esc(formatName(r.type||''))}" data-form-path="remuneration.${i}.type" data-form-format="name"></div>
          <div class="col-12"><label class="form-label">Description</label><input type="text" class="form-control" value="${esc(formatName(r.description||''))}" data-form-path="remuneration.${i}.description" data-form-format="name"></div>
        </div>
      </div>
    </div>`;
  });
  return `<div class="schedule-page">
    <h1>Part VII — Guardian(s) Declaration of Remuneration</h1>
    <div class="schedule-instructions">Per 744.367(3)(a), the annual guardianship report must include a declaration of all remuneration received by the guardian from any source for services rendered to or on behalf of the ward.</div>
    ${rows}
    <button class="btn btn-outline-primary btn-sm mb-3" data-simplified-action="add-remuneration">+ Add Entry</button>
    ${renderScheduleDocsSection('p7')}
    ${pageNavS('/p6','/print')}
  </div>`;
}

export function validateSimplified(){
  const d=window.D;
  const errs=[];
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
    req(g.signatureDate,`Part IV — ${p} — Signature Date`);
    req(g.ssn,`Part IV — ${p} — SSN/EIN`);
    req(g.phone,`Part IV — ${p} — Phone Number`);
    req(g.email,`Part IV — ${p} — Email Address`);
    req(g.mailingStreet,`Part IV — ${p} — Mailing Street Address`);
    req(g.mailingCityStateZip,`Part IV — ${p} — Mailing City/State/Zip`);
    req(g.residenceStreet,`Part IV — ${p} — Residence Street Address`);
    req(g.residenceCityStateZip,`Part IV — ${p} — Residence City/State/Zip`);
  });
  req(d.attorney_barNumber,'Part V — Attorney Bar Number');
  req(d.attorney_phone,'Part V — Attorney Phone Number');
  req(d.attorney_street,'Part V — Attorney Street Address');
  req(d.attorney_cityStateZip,'Part V — Attorney City/State/Zip');
  req(d.certServiceDate,'Part VI — Date of Service');
  req(d.certIndicator,'Part VI — "Indicate if"');
  req(d.certRecipients[0].name,'Part VI — Recipient 1 — Name and Address');
  req(d.certRecipients[2].name,'Part VI — Recipient 3 — Name and Address');
  return errs;
}
