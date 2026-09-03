import { renderSummaryPage } from '../../core/summary-renderer.js';
// Simplified Annual Plan — the second feature extraction (Milestone 3,
// Phase B/C of INDEX-SPLIT-PLAN.md's migration sequence). Dynamically
// imported by legacy-app.js's mountPlanSimplifiedFeature()/
// mountPlanSimplifiedNav() bridges (built on src/core/feature-bridge.js),
// never statically imported.
//
// legacy-app.js stays a classic (non-module) script (Milestone 1's recorded
// decision), so its top-level function declarations are real `window`
// properties this module can destructure -- but a bare top-level `let`
// (activeInventoryType, currentPage) is not; see src/core/state.js's file
// header for the full explanation. Everything below that isn't defined in
// this file is one of those legacy globals, deliberately left in place
// rather than moved or wrapped: txtP/chkP/yesNoCheckboxS are still shared
// with the three not-yet-extracted Plan types, and the rest (inpS,
// countyInputS, pageNavS, renderScheduleDocsSection, esc, formatName,
// formatPhone, formatAddress, loadWardInfoBanner) are shared across all 9
// ward types (see the Milestone 3 plan's "Problem 3").
const {
  esc, ic, loadWardInfoBanner, inpS, countyInputS, pageNavS,
  renderScheduleDocsSection, txtP, chkP, yesNoCheckboxS,
  formatName, formatPhone, formatAddress,
} = window;

// print.js is dynamically imported only when the user reaches /print or
// triggers PDF export (Milestone 3, Phase C) -- same lazy boundary as
// src/features/simplified-accounting/print.js. There is no excel.js for
// this type: no Plan filing has Excel support (confirmed by grep and by
// the app's own help copy -- see the Milestone 3 plan's "Confirmed facts").
let _printModule = null;
let _printModulePromise = null;
const eventControllers = new WeakMap();

function bindEvents(container) {
  eventControllers.get(container)?.abort();
  const controller = new AbortController();
  eventControllers.set(container, controller);
  container.addEventListener('click', (event) => {
    const actionElement = event.target instanceof Element ? event.target.closest('[data-plan-simplified-action]') : null;
    if (!actionElement) return;
    switch (actionElement.dataset.planSimplifiedAction) {
      case 'open-court-portal': window.openFloridaCourtPortal(); break;
      case 'print': window.pvShowAll(); window.print(); break;
      case 'save-pdf': _printModule.doSavePdf(); break;
    }
  }, { signal: controller.signal });
}
function ensurePrintModule() {
  if (_printModule) return Promise.resolve();
  if (!_printModulePromise) {
    _printModulePromise = import('./print.js').then((mod) => {
      _printModule = mod;
      // The shared legacy readiness dispatcher still resolves this by name.
      window.planReadinessChecksSimplified = () => _printModule.planReadinessChecksSimplified();
    });
  }
  return _printModulePromise;
}

export async function mount(container, page) {
  let html;
  if (page === '/print') {
    await ensurePrintModule();
    html = _printModule.pagePrintPlanSimplified();
  } else {
    switch (page) {
      case '/':         html = pagePlanSCover(); break;
      case '/summary':   html = renderSummaryPage(getSummaryConfigPlanSimplified()); break;
      case '/p2':        html = pagePlanSQuestions(); break;
      case '/p3': html = pagePlanSSignatures(); break;
      default:    html = pagePlanSCover();
    }
  }
  container.innerHTML = html;
  bindEvents(container);
  container.scrollTop = 0;
}

export function dispose(container) {
  eventControllers.get(container)?.abort();
  eventControllers.delete(container);
  container.replaceChildren();
}

export function mountNav(container) {
  buildNavPlanSimplified(container);
}

function buildNavPlanSimplified(container){
  container.innerHTML=`
    <div class="nav-section">
      <div class="nav-section-label">Simplified Annual Plan</div>
      <button class="nav-link-item" data-page="/" data-nav="ps-cover" data-form-action="navigate" data-route="/">Cover</button>
      <button class="nav-link-item" data-page="/summary" data-nav="ps-summary" data-form-action="navigate" data-route="/summary">Summary</button>
      <button class="nav-link-item" data-page="/p2" data-nav="ps-p2" data-form-action="navigate" data-route="/p2">The Plan — Questions 1–9</button>
      <button class="nav-link-item" data-page="/p3" data-nav="ps-p3" data-form-action="navigate" data-route="/p3">Signatures</button>
    </div>
    <div class="nav-section">
      <div class="nav-section-label">Output</div>
      <button class="nav-link-item" data-page="/print" data-form-action="navigate" data-route="/print"><span class="nav-link-label">${ic('file',15)}&nbsp; Print Preview</span></button>
    </div>
  `;
}

function getSummaryConfigPlanSimplified(){
  const d=window.D;
  const fd=v=>v?String(v).substring(0,10):'—';
  const q9total=[
    d.q1Residences,d.q2BestPlacement,d.q3MedicalTreatment,
    d.q4Diagnosis,d.q5SocialServices,d.q6Interaction,
    d.q7RestoreRights,d.q8DNR||d.q8LivingWill||d.q8Surrogate||d.q8POA||d.q8Other||d.q8None,
    d.q9Remuneration,
  ].filter(Boolean).length;
  const g=(d.planGuardians||[])[0]||{};
  return {
    formTitle:'Simplified Annual Plan — Summary',
    infoRows:[
      {label:'Ward Name',value:esc(d.wardName)},
      {label:'Case Number',value:esc(d.caseNumber)},
      {label:'County',value:esc(d.county)},
      {label:'Period',value:fd(d.periodFrom)+' – '+fd(d.periodTo)},
    ],
    leftCards:[{
      heading:'Plan Progress',
      lines:[
        {label:'Q1 — Residences',route:'/p2',status:d.q1Residences?'complete':'not-started'},
        {label:'Q2 — Why This Placement',route:'/p2',status:d.q2BestPlacement?'complete':'not-started'},
        {label:'Q3 — Medical Treatment',route:'/p2',status:d.q3MedicalTreatment?'complete':'not-started'},
        {label:'Q4 — Diagnosis &amp; Conditions',route:'/p2',status:d.q4Diagnosis?'complete':'not-started'},
        {label:'Q5 — Personal &amp; Social Services',route:'/p2',status:d.q5SocialServices?'complete':'not-started'},
        {label:'Q6 — Interaction with Others',route:'/p2',status:d.q6Interaction?'complete':'not-started'},
        {label:'Q7 — Rights Restoration',route:'/p2',status:d.q7RestoreRights?'complete':'not-started'},
        {label:'Q8 — Advance Directives',route:'/p2',status:(d.q8DNR||d.q8LivingWill||d.q8Surrogate||d.q8POA||d.q8Other||d.q8None)?'complete':'not-started'},
        {label:'Q9 — Remuneration',route:'/p2',status:d.q9Remuneration?'complete':'not-started'},
        {label:'Signatures',route:'/p3',status:g.name&&g.signatureDate?'complete':'not-started'},
      ],
    }],
    rightCards:[],
    banner:{title:'SIMPLIFIED ANNUAL PLAN PROGRESS',value:q9total+' of 9 questions answered'},
    nextRoute:'/p2',
  };
}

function pagePlanSCover(){
  const d=window.D;
  return `<div class="schedule-page">
    <h1>Simplified Annual Plan — Cover</h1>
    <div class="schedule-instructions">This plan reports on the ward as a person: where they have lived, the care they received, and how they are doing. It is a separate filing from any accounting, which reports on their money and property.</div>
    ${loadWardInfoBanner()}
    <div class="row g-3">
      <div class="col-md-6">${inpS('wardName','Name of Ward',d.wardName,true)}</div>
      <div class="col-md-6">${inpS('caseNumber','Case Number',d.caseNumber,true)}</div>
      <div class="col-md-4">${countyInputS('county','County',d.county,true)}</div>
      <div class="col-md-4">${inpS('periodFrom','Reporting Period From',d.periodFrom,true,'date')}</div>
      <div class="col-md-4">${inpS('periodTo','Reporting Period To',d.periodTo,true,'date')}</div>
    </div>
    ${renderScheduleDocsSection('planCover')}
    ${pageNavS(null,'/summary')}
  </div>`;
}

function pagePlanSQuestions(){
  const d=window.D;
  const q=(n,title,body)=>`<div class="plan-question"><div class="plan-question-num">Question ${n}</div><h3 style="font-size:.95rem;font-weight:650;color:var(--ink);margin-bottom:.7rem;line-height:1.45;">${title}</h3>${body}</div>`;
  return `<div class="schedule-page">
    <h1>The Plan — Questions 1–9</h1>
    <div class="schedule-instructions">Answer in plain, specific language. "Saw Dr. Alvarez for a check-up in March and a follow-up in September" tells the court far more than "routine care."</div>

    ${q(1,'The name and address of all places the ward has resided during the preceding year.',
      txtP('q1Residences','Places resided',d.q1Residences,4,true,'List each residence with its address. Include the dates if the ward moved during the year.'))}

    ${q(2,'Why is this the best placement for the ward?',
      txtP('q2BestPlacement','Why this placement',d.q2BestPlacement,4,true))}

    ${q(3,'List all professional medical / mental health treatment the ward has received during the past year.',
      txtP('q3MedicalTreatment','Medical and mental health treatment',d.q3MedicalTreatment,5,true,'Did the ward see a doctor, dentist, or mental health professional — and if so, when?'))}

    ${q(4,"What is the ward's current diagnosis and the conditions which cause them to continue to need a guardian advocate / guardian?",
      txtP('q4Diagnosis','Current diagnosis and conditions',d.q4Diagnosis,5,true))}

    ${q(5,'What personal and social services were provided for the ward in the past year?',
      txtP('q5SocialServices','Personal and social services',d.q5SocialServices,4,true,'Programs attended, vacations, in-home and out-of-home activities, and what the ward likes to do for entertainment or in their free time.'))}

    ${q(6,'In the past year, how has the ward interacted with others, including the guardian(s) and family members?',
      txtP('q6Interaction','Interaction with others',d.q6Interaction,4,true,'If the ward is not able to interact, state why.'))}

    ${q(7,'Should any of the rights previously delegated to the guardian advocate(s) / guardian(s) be restored to the ward at this time?',
      yesNoCheckboxS('q7RestoreRights','Restore any rights?',d.q7RestoreRights,true)
      +(d.q7RestoreRights==='Yes'?`<div class="plan-conditional">${txtP('q7RestoreExplain','Identify the specific right(s) and explain why they should be restored',d.q7RestoreExplain,4,true,'For example: to consent to medical treatment, to determine residence, to manage property.')}</div>`:''))}

    ${q(8,'Since the guardianship was established or the last annual report, the following was executed by or on behalf of the ward:',
      `<div class="plan-field-hint">Attach and file copies of any documents referenced below if not previously filed with the Court.</div>`
      +chkP('q8DNR','Do Not Resuscitate ("DNR")',d.q8DNR)
      +chkP('q8LivingWill','Living Will / Anatomical Gift',d.q8LivingWill)
      +chkP('q8Surrogate','Healthcare Surrogate Designation',d.q8Surrogate)
      +chkP('q8POA','Power of Attorney',d.q8POA)
      +chkP('q8Other','Other Advance Directive',d.q8Other)
      +(d.q8Other?`<div class="plan-conditional mt-2">${inpS('q8OtherText','Describe the other advance directive',d.q8OtherText,true)}</div>`:'')
      +chkP('q8None','NONE',d.q8None))}

    ${q(9,'As the guardian advocate(s) / guardian(s), have you received any payments, goods, or services for work or care provided on behalf of the ward?',
      `<div class="plan-field-hint">This does <strong>not</strong> include payments, goods, or services received from a government benefits program such as Social Security, Medicaid, Medicare, or the Agency for Persons with Disabilities.</div>`
      +yesNoCheckboxS('q9Remuneration','Received any payments, goods, or services?',d.q9Remuneration,true)
      +(d.q9Remuneration==='Yes'?`<div class="plan-conditional">${txtP('q9RemunerationExplain','Please explain',d.q9RemunerationExplain,3,true)}</div>`:''))}

    ${renderScheduleDocsSection('planQuestions')}
    ${pageNavS('/summary','/p3')}
  </div>`;
}

function pagePlanSSignatures(){
  const d=window.D;
  const g=d.planGuardians||[];
  const block=(i,label)=>{
    const p=g[i]||{};
    return `<div class="plan-sig-block">
      <h3>${label}</h3>
      <div class="row g-2">
        <div class="col-md-6"><label class="form-label">Printed Name${i===0?'<span class="req">*</span>':''}</label><input type="text" class="form-control" value="${esc(formatName(p.name||''))}" data-form-path="planGuardians.${i}.name" data-form-format="name"></div>
        <div class="col-md-6"><label class="form-label">Date Signed${i===0?'<span class="req">*</span>':''}</label><input type="date" class="form-control" value="${esc(p.signatureDate||'')}" data-form-path="planGuardians.${i}.signatureDate"></div>
        <div class="col-md-6"><label class="form-label">Email Address</label><input type="text" class="form-control" value="${esc(p.email||'')}" data-form-path="planGuardians.${i}.email"></div>
        <div class="col-md-6"><label class="form-label">Phone Number</label><input type="text" class="form-control" value="${esc(formatPhone(p.phone||''))}" data-form-path="planGuardians.${i}.phone" data-form-format="phone"></div>
        <div class="col-12"><label class="form-label">Mailing Address</label><input type="text" class="form-control" value="${esc(formatAddress(p.mailingAddress||''))}" data-form-path="planGuardians.${i}.mailingAddress" data-form-format="address"></div>
      </div>
    </div>`;
  };
  return `<div class="schedule-page">
    <h1>Signatures</h1>
    <div class="attestation-text">Under penalty of perjury, I declare that I have read the foregoing and the facts alleged are true to the best of my knowledge and belief.</div>
    <div class="schedule-instructions">The form provides space for two guardians or guardian advocates. Fill in the second block only if there is a co-guardian.</div>
    ${block(0,'Guardian / Guardian Advocate 1')}
    ${block(1,'Guardian / Guardian Advocate 2 (if any)')}
    ${renderScheduleDocsSection('planSignatures')}
    ${pageNavS('/p2',null)}
  </div>`;
}

export function validatePlanSimplified(){
  const d=window.D;
  const errs=[];
  const req=(v,label)=>{if(v===''||v===null||v===undefined)errs.push(label);};
  req(d.wardName,'Cover — Name of Ward is required');
  req(d.caseNumber,'Cover — Case Number is required');
  req(d.county,'Cover — County is required');
  req(d.periodFrom,'Cover — Reporting Period From is required');
  req(d.periodTo,'Cover — Reporting Period To is required');
  req(d.q1Residences,'The Plan — Question 1 (places resided) is required');
  req(d.q2BestPlacement,'The Plan — Question 2 (why this placement) is required');
  req(d.q3MedicalTreatment,'The Plan — Question 3 (medical treatment) is required');
  req(d.q4Diagnosis,'The Plan — Question 4 (diagnosis and conditions) is required');
  req(d.q5SocialServices,'The Plan — Question 5 (personal and social services) is required');
  req(d.q6Interaction,'The Plan — Question 6 (interaction with others) is required');
  req(d.q7RestoreRights,'The Plan — Question 7 (restore rights) must be answered');
  if(d.q7RestoreRights==='Yes')req(d.q7RestoreExplain,'The Plan — Question 7 explanation is required when rights should be restored');
  // Q8 is a "check all that apply" list, but leaving every box blank means the
  // question was skipped rather than answered "none" — NONE is its own box.
  if(!(d.q8DNR||d.q8LivingWill||d.q8Surrogate||d.q8POA||d.q8Other||d.q8None)){
    errs.push('The Plan — Question 8 (advance directives) must have at least one box checked, or NONE');
  }
  if(d.q8Other)req(d.q8OtherText,'The Plan — Question 8 requires a description when "Other Advance Directive" is checked');
  if(d.q8None&&(d.q8DNR||d.q8LivingWill||d.q8Surrogate||d.q8POA||d.q8Other)){
    errs.push('The Plan — Question 8 cannot be NONE and also list directives');
  }
  req(d.q9Remuneration,'The Plan — Question 9 (remuneration) must be answered');
  if(d.q9Remuneration==='Yes')req(d.q9RemunerationExplain,'The Plan — Question 9 explanation is required when payment was received');
  const g=(d.planGuardians||[])[0]||{};
  req(g.name,'Signatures — Guardian 1 printed name is required');
  req(g.signatureDate,'Signatures — Guardian 1 date signed is required');
  return errs;
}
