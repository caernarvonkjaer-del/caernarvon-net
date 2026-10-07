import { renderSummaryPage, navStatus, formatSummaryDate } from '../../core/summary-renderer.js';
import { checkDateOrder } from '../../core/validation/date-rules.js';
import { checkSignatureState, inferLegacySignatureState } from '../../core/validation/signature-state.js';
import { issueFactory } from '../../core/validation/validation-issue.js';
import { startedRows } from '../../core/validation/row-started.js';
import { isAttorneyStarted } from '../../core/validation/attorney-block.js';
import { watchAttorneyRequiredMarkers } from '../../core/form/attorney-required-markers.js';
import { renderSignatureStateControl, mountSignatureStateControls, signatureDateRequired } from '../../core/signature/signature-state-control.js';
import { migratePlanCertificateOfService } from '../../core/filing/plan-certificate-of-service.js';
import { renderPlanCertificateOfServicePage } from '../../core/form/plan-certificate-of-service-page.js';
import { preparerNoteHTML } from '../../core/signature/preparer-note.js';
// Milestone 41-3: Tier 2 cards. This page's periodFrom/periodTo labels are
// renderReportingPeriodFields()'s own defaults, so it reuses with zero
// overrides. ssn and gid stay on inpS() (already Tier 1): this type's
// inception field is `gid`, not `inceptionDate`, and its ward-SSN field
// sits after county rather than adjacent to wardName, so neither fits the
// optional slots in ward-demographics-card.js -- the second candidate to
// confirm those two speculative slots don't generalize. The Residence &
// Facility Profile card is built and first used here; see its own header
// comment for why Plan Annual is what finally justified it.
import { renderCaseCaptionFields } from '../../core/form/cards/case-caption-card.js';
import { renderWardIdentityFields, renderReportingPeriodFields } from '../../core/form/cards/ward-demographics-card.js';
import { renderResidenceFields } from '../../core/form/cards/residence-facility-card.js';
// renderPartyNameField() is deliberately NOT imported here: it hardcodes a
// col-12 wrapper, and this page's Printed Name field is col-md-7 (paired
// with a col-md-5 Date Signed on the same row). A colClass parameter would
// reduce that card to a configurable div around one renderFormField() call,
// which is no abstraction at all -- so this page's guardian fields go
// straight to Tier 1 instead. Confirmed fit: 3 of 4 Plan types for that
// card, not 4 of 4.
import { renderFormField } from '../../core/form/form-fields.js';
import { esc } from '../../core/filing/escape-html.js';
import { ic } from '../../core/ui/icons.js';
import { formatDisplayDate } from '../../core/form/date-parser.js';
import { PLAN_ADLS, PLAN_ADL_RATINGS, PLAN_BENEFITS, PLAN_RIGHTS, PLAN_RIGHT_STATES } from '../../core/filing/models/plan-annual.js';
import { normalizePlanGuardians } from '../../core/filing/models/plan-rows.js';
import { sectionMarks } from '../../core/status/section-marks.js';
import { getD, requestSave } from '../../core/state.js';
import { REQ_MARK, chkP, inpS, pageNavS, planCheckGroup, planQ, txtP, yesNoCheckboxS, yesNoRadioHTML } from '../../core/form/field-html.js';
import { renderScheduleDocsSection } from '../../core/filing/schedule-docs.js';
import { setPath } from '../../core/form/paths.js';
import { PLAN_ANNUAL_EXPLANATIONS, explanationShown } from '../../core/filing/plan-explanations.js';
import { collectPlanAnnualIssues } from '../../core/validation/engines/plan-annual.js';
// Annual Guardianship Plan — the third feature extraction (Milestone 4,
// Phases A and B of INDEX-SPLIT-PLAN.md's migration sequence). Loaded only when one of its pages
// is shown, through src/features-loader.js's feature services
// (src/core/feature-bridge.js mounts it), never statically imported.
//
// Until Milestone 70 this module destructured the classic monolith's globals
// off window -- the shared Plan field helpers and lists -- and this comment
// recorded which, and why each stayed in the monolith (Milestones 3-6, 41 and
// 51C). Milestone 70 moved every one into a module this file imports; 70K
// removed the last window read, and 70L deleted the monolith.

// print.js is dynamically imported only when the user reaches /print or
// triggers PDF export (Milestone 4, Phase B) -- same lazy boundary as the
// other two extracted features. No excel.js: no Plan filing type has Excel
// support (confirmed by grep -- see the Milestone 4 plan's "Confirmed
// facts").
// Milestone 39-C: tracks the capture-widget handles mountSignatureStateControls()
// returns, per rendered container, so mount() can tear them down (canvas
// listeners, drag state) before the next render replaces the DOM -- same
// pattern as Plan Simplified's own pilot (39-B).
const signatureHandles = new WeakMap();

let _printModule = null;
let _printModulePromise = null;
// The Preview page's Save as PDF (data-form-action="save-pdf-plan-annual"),
// and GuardianForms.testing's saveOutput, through the feature services
// (Milestone 70, 70K: a window global this module set once print.js loaded).
export function doSavePdfPlanAnnual() {
  // At once when the print module is loaded (it is, once Preview shows): the
  // save disables its button before its first await (Milestone 67).
  if (_printModule) return _printModule.doSavePdf();
  return ensurePrintModule().then(() => _printModule.doSavePdf());
}

function ensurePrintModule() {
  if (_printModule) return Promise.resolve();
  if (!_printModulePromise) {
    _printModulePromise = import('./print.js').then((mod) => {
      _printModule = mod;
    });
  }
  return _printModulePromise;
}

export async function mount(container, page, { signal } = {}) {
  // Milestone 68C: a plan saved before the Certificate of Service existed
  // gains its fields on load. Idempotent, so every mount may call it.
  if (migratePlanCertificateOfService(getD())) requestSave();
  let html;
  let isPrint = false;
  if (page === '/print') {
    await ensurePrintModule();
    // Superseded while its print module loaded (Milestone 70, 70K).
    if (signal?.aborted) return;
    html = _printModule.pagePrintPlanAnnual();
    isPrint = true;
  } else {
    switch (page) {
      case '/':    html = pagePlanACover(); break;
      case '/summary': html = renderSummaryPage(getSummaryConfigPlanAnnual()); break;
      case '/p2':  html = pagePlanAResidences(); break;
      case '/p3':  html = pagePlanACarePlan(); break;
      case '/p4':  html = pagePlanABenefits(); break;
      case '/p5':  html = pagePlanAProviders(); break;
      case '/p6':  html = pagePlanARights(); break;
      case '/p7':  html = pagePlanAADLs(); break;
      case '/p8':  html = pagePlanADisabilities(); break;
      case '/p9':  html = pagePlanADirectives(); break;
      case '/p10': html = pagePlanARemuneration(); break;
      case '/p11': html = pagePlanASignatures(); break;
      case '/p12': html = pagePlanACertificate(); break;
      default:     html = pagePlanACover();
    }
  }
  container.innerHTML = html;
  container.scrollTop = 0;
  signatureHandles.get(container)?.forEach((h) => h.destroy());
  signatureHandles.delete(container);
  if (page === '/p11' || page === '/p12') {
    signatureHandles.set(container, mountSignatureStateControls(container, {
      setImage: (imagePath, dataUrl) => setPath(getD(), imagePath, dataUrl),
      route: page,
    }));
  }
  // Milestone 72C: the attorney's name and email are marked required exactly
  // while an attorney is started, following the filer's typing, as the
  // accountings' attorney blocks do (71B).
  attorneyMarkerAborts.get(container)?.abort();
  attorneyMarkerAborts.delete(container);
  if (page === '/p11') {
    attorneyMarkerAborts.set(container, watchAttorneyRequiredMarkers(container, {
      engineId: 'planAnnual', paths: ['attorney', 'attorney_email'],
      triggerPaths: ['attorney', 'attorney_bar', 'attorney_phone', 'attorney_email', 'attorney_secondary_email', 'attorney_street', 'attorney_cityStateZip', 'attorney_signatureDate', 'attorney_signatureState'],
    }));
  }
  if (isPrint) await _printModule.mountPreview();
}

const attorneyMarkerAborts = new WeakMap();

export function dispose(container) {
  signatureHandles.get(container)?.forEach((h) => h.destroy());
  signatureHandles.delete(container);
  attorneyMarkerAborts.get(container)?.abort();
  attorneyMarkerAborts.delete(container);
  container.replaceChildren();
}

export function mountNav(container) {
  buildNavPlanAnnual(container);
}

function buildNavPlanAnnual(container){
  const item=(route,nav,label)=>`<button class="nav-link-item" data-page="${route}" data-nav="${nav}" data-form-action="navigate" data-route="${route}">${label}</button>`;
  container.innerHTML=`
    <div class="nav-section">
      <div class="nav-section-label">Annual Guardianship Plan</div>
      ${item('/','pa-cover','Cover')}
      ${item('/summary','pa-summary','Summary')}
      ${item('/p2','pa-p2','1&nbsp;&nbsp;Residences')}
      ${item('/p3','pa-p3','2–3&nbsp;&nbsp;Residence &amp; Care')}
      ${item('/p4','pa-p4','3G&nbsp;&nbsp;Insurance &amp; Benefits')}
      ${item('/p5','pa-p5','4&nbsp;&nbsp;Medical Treatment')}
      ${item('/p6','pa-p6','5–7&nbsp;&nbsp;Skills &amp; Rights')}
      ${item('/p7','pa-p7','8&nbsp;&nbsp;Daily Living')}
      ${item('/p8','pa-p8','9&nbsp;&nbsp;Disabilities &amp; Devices')}
      ${item('/p9','pa-p9','10&nbsp;&nbsp;Advance Directives')}
      ${item('/p10','pa-p10','11&nbsp;&nbsp;Remuneration')}
      ${item('/p11','pa-p11','Signatures')}
      ${item('/p12','pa-p12','Certificate of Service')}
    </div>
    <div class="nav-section">
      <div class="nav-section-label">Output</div>
      <button class="nav-link-item" data-page="/print" data-form-action="navigate" data-route="/print"><span class="nav-link-label">${ic('file',15)}&nbsp; Print Preview</span></button>
    </div>
  `;
}

function getSummaryConfigPlanAnnual(){
  const d=getD();
  // This filing's own section marks (Milestone 73F part 2: from the export
  // checks, src/core/status/section-marks.js; 70D's per-type evaluator before).
  const nav=sectionMarks(d);
  return {
    formTitle:'Annual Guardianship Plan — Summary',
    infoRows:[
      {label:'Ward Name',value:esc(d.wardName)},
      {label:'Case Number',value:esc(d.caseNumber)},
      {label:'County',value:esc(d.county)},
      {label:'Period',value:formatSummaryDate(d.periodFrom)+' – '+formatSummaryDate(d.periodTo)},
      {label:'Guardian',value:esc(d.guardian)},
      {label:'Attorney',value:esc(d.attorney)},
    ],
    leftCards:[
      {
        heading:'Section Completion',
        lines:[
          {label:'Cover',route:'/',status:navStatus(nav,'pa-cover')},
          {label:'1. Places Ward Has Lived',route:'/p2',status:navStatus(nav,'pa-p2')},
          {label:'2–3. Residence & Care',route:'/p3',status:navStatus(nav,'pa-p3')},
          {label:'3G. Insurance & Benefits',route:'/p4',status:navStatus(nav,'pa-p4')},
          {label:'4. Medical Treatment',route:'/p5',status:navStatus(nav,'pa-p5')},
          {label:'5–7. Skills & Rights',route:'/p6',status:navStatus(nav,'pa-p6')},
        ],
      },
      {
        heading:'Assessments & Signatures',
        lines:[
          {label:'8. Daily Living',route:'/p7',status:navStatus(nav,'pa-p7')},
          {label:'9. Disabilities & Devices',route:'/p8',status:navStatus(nav,'pa-p8')},
          {label:'10. Advance Directives',route:'/p9',status:navStatus(nav,'pa-p9')},
          {label:'11. Remuneration',route:'/p10',status:navStatus(nav,'pa-p10')},
          {label:'Signatures',route:'/p11',status:navStatus(nav,'pa-p11')},
          {label:'Certificate of Service',route:'/p12',status:navStatus(nav,'pa-p12')},
        ],
      },
    ],
    rightCards:[],
    banner:{title:'ANNUAL GUARDIANSHIP PLAN',value:(d.wardName?esc(d.wardName):'Ward')+' — Case # '+(d.caseNumber?esc(d.caseNumber):'Pending')},
    nextRoute:'/p2',
  };
}

function pagePlanACover(){
  const d=getD();
  return `<div class="schedule-page">
    <h1>Annual Guardianship Plan — Cover</h1>
    <div class="schedule-instructions">This plan reports on the ward as a person: where they live, the care they receive, their abilities and their rights. It is a separate filing from any accounting, which reports on their money and property. <strong>A physician's report must be filed separately at the same time</strong> — the app does not produce it.</div>
    <div class="row g-3 mb-3 cover-info-row">
      <div class="col-md-6">
        <div class="summary-box">
          <h2 class="subsection-heading">Ward &amp; Case Information</h2>
          <div class="row g-2">
            ${renderWardIdentityFields({ wardName: d.wardName, wardNameRequired: true })}
            ${renderCaseCaptionFields({ caseNumber: d.caseNumber, county: d.county, ucn: d.ucn ?? '' })}
            <div class="col-md-6">${inpS('ssn','Social Security Number',d.ssn)}</div>
            <div class="col-md-6">${inpS('gid','Guardianship Inception Date',d.gid,true,'date')}</div>
            ${renderReportingPeriodFields({ periodFrom: d.periodFrom, periodTo: d.periodTo })}
            <!-- Milestone 73I (73I-N3): the plan covers the coming year. --><div class="col-12"><div class="plan-field-hint" data-plan-year-hint>Enter the coming plan year: it begins the day after the anniversary month of the Letters of Guardianship ends, and ends on the last day of that month a year later (F.S. 744.367(1)). For calendar-year filing, January 1 to December 31.</div></div>
          </div>
        </div>
      </div>
      <div class="col-md-6">
        <div class="summary-box">
          <h2 class="subsection-heading">Guardian, Attorney &amp; Residence</h2>
          <div class="row g-2">
            <div class="col-12">${inpS('guardian','Guardian Name(s)',d.guardian,true)}</div>
            <div class="col-12">${inpS('attorney','Attorney Name',d.attorney)}</div>
            ${renderResidenceFields({
              wardLiving: d.wardLiving,
              wardLivingOptions: [
                'In a private residence leased or owned by them',
                'In a private residence not leased or owned by them',
                'In a facility (skilled nursing, assisted living, etc.)'],
              residenceAddress: d.residenceAddress,
              residenceCityStateZip: d.residenceCityStateZip,
              residencePhone: d.residencePhone,
              mailingAddress: d.mailingAddress,
              mailingCityStateZip: d.mailingCityStateZip,
            })}
          </div>
        </div>
      </div>
    </div>
    ${renderScheduleDocsSection('planACover')}
    ${pageNavS(null,'/summary')}
  </div>`;
}

function pagePlanAResidences(){
  const d=getD();
  const rows=(d.q1Residences||[]).map((r,i)=>{
    return `<div class="col-12 col-lg-6"><div class="entry-card mb-2">
      <div class="entry-card-header">
        <span>Residence ${i+1}</span>
        <span class="entry-card-actions">
          <button class="btn btn-sm btn-outline-secondary ms-auto" title="Add a copy of this row below" data-form-action="duplicate-plan-row" data-collection="q1Residences" data-index="${i}" data-route="/p2">${ic('copy',13)}</button>
          <button class="btn btn-sm btn-outline-danger" data-form-action="remove-plan-row" data-collection="q1Residences" data-index="${i}" data-route="/p2">✕ Remove</button>
        </span>
      </div>
      <div class="entry-card-body"><div class="row g-2">
        <div class="col-md-6"><label class="form-label">Facility name, or owner of the private residence<span class="req">*</span></label><input type="text" class="form-control" value="${esc(r.name||'')}" data-form-path="q1Residences.${i}.name"></div>
        <div class="col-md-6"><label class="form-label">Type of facility</label><input type="text" class="form-control" placeholder="e.g. Assisted Living, Private Residence" value="${esc(r.facilityType||'')}" data-form-path="q1Residences.${i}.facilityType"></div>
        <div class="col-md-6"><label class="form-label">Street address</label><input type="text" class="form-control" value="${esc(r.street||'')}" data-form-path="q1Residences.${i}.street"></div>
        <div class="col-md-6"><label class="form-label">City, State and ZIP</label><input type="text" class="form-control" value="${esc(r.cityStateZip||'')}" data-form-path="q1Residences.${i}.cityStateZip"></div>
        <div class="col-md-4"><label class="form-label">Phone number</label><input type="text" class="form-control" value="${esc(r.phone||'')}" data-form-path="q1Residences.${i}.phone" data-field-path="q1Residences.${i}.phone" data-form-format="phone"></div>
        <div class="col-md-4"><label class="form-label" for="q1_res_${i}_from">Resided from</label><input type="text" inputmode="text" class="form-control" id="q1_res_${i}_from" placeholder="MM/DD/YYYY" value="${esc(formatDisplayDate(r.from||''))}" data-form-path="q1Residences.${i}.from" data-field-path="q1Residences.${i}.from" data-field-kind="date" data-field-format-policy="normalize" aria-describedby="q1_res_${i}_from_hint"><div id="q1_res_${i}_from_hint" class="form-text text-muted" style="font-size:0.75rem;margin-top:0.2rem;">Use MM/DD/YYYY</div></div>
        <div class="col-md-4"><label class="form-label" for="q1_res_${i}_to">Resided to</label><input type="text" inputmode="text" class="form-control" id="q1_res_${i}_to" placeholder="MM/DD/YYYY" value="${esc(formatDisplayDate(r.to||''))}" data-form-path="q1Residences.${i}.to" data-field-path="q1Residences.${i}.to" data-field-kind="date" data-field-format-policy="normalize" aria-describedby="q1_res_${i}_to_hint"><div id="q1_res_${i}_to_hint" class="form-text text-muted" style="font-size:0.75rem;margin-top:0.2rem;">Use MM/DD/YYYY</div></div>
      </div></div>
    </div></div>`;
  }).join('');
  return `<div class="schedule-page">
    <h1>1. Places the Ward Has Lived</h1>
    <div class="schedule-instructions">List every place the ward resided during the prior 12 months, earliest first. The court checks this against the address on file — if the ward moved, question 2 on the next page asks how that move was handled.</div>
    ${rows?`<div class="row g-3 schedule-entry-grid">${rows}</div>`:`<div class="schedule-empty">${ic('folder',17)}<span>No residences listed yet.</span></div>`}
    <button class="btn btn-outline-primary btn-sm mb-2" data-form-action="add-plan-row" data-collection="q1Residences" data-row-type="residence" data-route="/p2">+ Add Residence</button>
    ${renderScheduleDocsSection('planAResidences')}
    ${pageNavS('/summary','/p3')}
  </div>`;
}

function pagePlanACarePlan(){
  const d=getD();
  const cb=(id,label,route='')=>chkP(id,label,d[id],route);
  return `<div class="schedule-page">
    <h1>2–3. Residence Change &amp; Care Plan</h1>
    ${planQ(2,"If the ward's address has changed since the last plan was filed"+REQ_MARK,
      `<div class="plan-check-grid">
        ${cb('q2NoMove','N/A — the ward has not moved since the last plan was filed')}
        ${cb('q2WithinCounty','The move was within this county and a change of address was provided to the court')}
        ${cb('q2WithinCircuit','The move was within this Circuit and notice was provided to the court within 15 days')}
        ${cb('q2OutsideApproved','The move was outside this Circuit and prior court approval was obtained')}
        ${cb('q2OutsideVenuePetition','The move was outside this Circuit and a petition to change venue is filed with this plan')}
      </div>`,'Check all that apply.')}
    ${planQ(3,'For the best welfare of the ward, the guardian plans as follows',
      planCheckGroup("The residential setting best suited to the ward's needs is:"+REQ_MARK,
        [cb('q3SettingALF','Assisted Living (ALF)'),cb('q3SettingGroupHome','Group Home'),
         cb('q3SettingIntermediate','Intermediate'),cb('q3SettingPrivate','Private Residence'),
         cb('q3SettingSkilled','Skilled Nursing'),cb('q3SettingSpecialized','Specialized'),
         cb('q3SettingStateHospital','State Hospital'),cb('q3SettingOther','Other','/p3')].join(''),
        'q3SettingExplain',d.q3SettingExplain,explanationShown(PLAN_ANNUAL_EXPLANATIONS,d,'q3SettingExplain'))
      +planCheckGroup('The guardian will ensure this remains the best setting by:',
        [cb('q3EnsureAssessing','Periodically assessing needs'),
         cb('q3EnsureWardDecides','The ward retains the right to decide'),
         cb('q3EnsureNoChange','No change, unless required by medical condition')].join(''),'','',false)
      +planCheckGroup('Provision for medical care services:',
        [cb('q3MedPrimary','Routine examination by primary care physician'),
         cb('q3MedDentist','Routine examination by dentist'),
         cb('q3MedOphthalmologist','Routine examination by ophthalmologist'),
         cb('q3MedSpecialist','Routine examination by specialist','/p3'),
         cb('q3MedPhysicalTherapy','Physical therapy'),cb('q3MedSpeechTherapy','Speech therapy'),
         cb('q3MedOccupationalTherapy','Occupational therapy'),
         cb('q3MedWardDecides','The ward retains the right to make their own decision'),
         cb('q3MedNone','None','/p3'),cb('q3MedOther','Other','/p3')].join(''),
        'q3MedExplain',d.q3MedExplain,explanationShown(PLAN_ANNUAL_EXPLANATIONS,d,'q3MedExplain'))
      +(d.q3MedSpecialist?`<div class="plan-conditional mb-3">${inpS('q3MedSpecialistArea','Area of specialty',d.q3MedSpecialistArea,true)}</div>`:'')
      +planCheckGroup('Provision for mental health services:',
        [cb('q3MentalPsych','Routine examination by psychiatrist / psychologist'),
         cb('q3MentalWardDecides','Ward retains the right to make own decisions'),
         cb('q3MentalOutpatient','Ongoing treatment — outpatient'),
         cb('q3MentalInpatient','Ongoing treatment — inpatient'),
         cb('q3MentalNone','None','/p3'),cb('q3MentalOther','Other','/p3')].join(''),
        'q3MentalExplain',d.q3MentalExplain,explanationShown(PLAN_ANNUAL_EXPLANATIONS,d,'q3MentalExplain'))
      +planCheckGroup('Provision for personal care (bathing, grooming, feeding):',
        [cb('q3PersonalFacility','Care facility'),cb('q3PersonalNurses','Nurses and aides'),
         cb('q3PersonalFamily','Family and friends'),cb('q3PersonalWithout','Ward does without assistance'),
         cb('q3PersonalNone','None; ward can provide own personal care','/p3'),cb('q3PersonalOther','Other','/p3')].join(''),
        'q3PersonalExplain',d.q3PersonalExplain,explanationShown(PLAN_ANNUAL_EXPLANATIONS,d,'q3PersonalExplain'))
      +planCheckGroup('Provision for socialization and recreational activities:',
        [cb('q3SocialFacility','Care facility'),cb('q3SocialNurses','Nurses and aides'),
         cb('q3SocialFamily','Family and friends'),
         cb('q3SocialWardDecides','The ward retains the right to make their own decision'),
         cb('q3SocialNone','None','/p3'),cb('q3SocialOther','Other','/p3')].join(''),
        'q3SocialExplain',d.q3SocialExplain,explanationShown(PLAN_ANNUAL_EXPLANATIONS,d,'q3SocialExplain')))}
    ${renderScheduleDocsSection('planACarePlan')}
    ${pageNavS('/p2','/p4')}
  </div>`;
}

function pagePlanABenefits(){
  const d=getD();
  const b=d.benefits||{};
  const rows=PLAN_BENEFITS.map(([k,label])=>{
    const v=b[k]||{};
    return `<tr>
      <th scope="row">${label}</th>
      <td>${yesNoRadioHTML(`annual-benefit-${k}-eligible`,'Eligible?',v.eligible,`benefits.${k}.eligible`)}</td>
      <td>${yesNoRadioHTML(`annual-benefit-${k}-applied`,'Applied for?',v.appliedFor,`benefits.${k}.appliedFor`)}</td>
    </tr>`;
  }).join('');
  return `<div class="schedule-page">
    <h1>3G. Insurance &amp; Benefits</h1>
    <div class="schedule-instructions">Health and accident insurance, and any private or governmental benefits the ward receives toward the cost of medical, mental health or related services. Mark whether the ward is <strong>eligible</strong> for each, and whether you have <strong>applied</strong> for it.</div>
    <table class="table plan-benefits-table">
      <thead><tr><th>Benefit</th><th class="text-center">Eligible</th><th class="text-center">Applied for</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="plan-check-grid mt-3">
      ${chkP('q3BenefitsNone','None of the above',d.q3BenefitsNone,'/p4')}
      ${chkP('q3BenefitsOther','Other (explain below)',d.q3BenefitsOther,'/p4')}
    </div>
    ${explanationShown(PLAN_ANNUAL_EXPLANATIONS,d,'q3BenefitsExplain')?`<div class="plan-conditional mt-2">${txtP('q3BenefitsExplain','Explanation',d.q3BenefitsExplain,3)}</div>`:''}
    ${renderScheduleDocsSection('planABenefits')}
    ${pageNavS('/p3','/p5')}
  </div>`;
}

function pagePlanAProviders(){
  const d=getD();
  const rows=(d.q4Providers||[]).map((r,i)=>{
    return `<div class="col-12 col-lg-6"><div class="entry-card mb-2">
      <div class="entry-card-header">
        <span>Provider ${i+1}</span>
        <span class="entry-card-actions">
          <button class="btn btn-sm btn-outline-secondary ms-auto" title="Add a copy of this row below" data-form-action="duplicate-plan-row" data-collection="q4Providers" data-index="${i}" data-route="/p5">${ic('copy',13)}</button>
          <button class="btn btn-sm btn-outline-danger" data-form-action="remove-plan-row" data-collection="q4Providers" data-index="${i}" data-route="/p5">✕ Remove</button>
        </span>
      </div>
      <div class="entry-card-body"><div class="row g-2">
        <div class="col-md-6"><label class="form-label">Provider's first name, last name, middle initial<span class="req">*</span></label><input type="text" class="form-control" value="${esc(r.name||'')}" data-form-path="q4Providers.${i}.name"></div>
        <div class="col-md-3"><label class="form-label">Type of provider</label><input type="text" class="form-control" placeholder="e.g. Primary Care Physician" value="${esc(r.providerType||'')}" data-form-path="q4Providers.${i}.providerType"></div>
        <div class="col-md-3"><label class="form-label">Number of visits</label><input type="text" class="form-control" value="${esc(r.visits||'')}" data-form-path="q4Providers.${i}.visits"></div>
        <div class="col-md-6"><label class="form-label">Street address</label><input type="text" class="form-control" value="${esc(r.street||'')}" data-form-path="q4Providers.${i}.street"></div>
        <div class="col-md-4"><label class="form-label">City, State and ZIP</label><input type="text" class="form-control" value="${esc(r.cityStateZip||'')}" data-form-path="q4Providers.${i}.cityStateZip"></div>
        <div class="col-md-2"><label class="form-label">Phone</label><input type="text" class="form-control" value="${esc(r.phone||'')}" data-form-path="q4Providers.${i}.phone" data-form-format="phone"></div>
      </div></div>
    </div></div>`;
  }).join('');
  return `<div class="schedule-page">
    <h1>4. Professional Medical Treatment</h1>
    <div class="schedule-instructions">Every professional who treated the ward during the prior 12 months — physicians, dentists, therapists, mental health providers. Include how many visits there were; the court uses this to see whether the ward is actually receiving the care the plan promises.</div>
    ${rows?`<div class="row g-3 schedule-entry-grid">${rows}</div>`:`<div class="schedule-empty">${ic('folder',17)}<span>No providers listed yet.</span></div>`}
    <button class="btn btn-outline-primary btn-sm mb-2" data-form-action="add-plan-row" data-collection="q4Providers" data-row-type="provider" data-route="/p5">+ Add Provider</button>
    ${renderScheduleDocsSection('planAProviders')}
    ${pageNavS('/p4','/p6')}
  </div>`;
}

function pagePlanARights(){
  const d=getD();
  const r=d.rights||{};
  const rows=PLAN_RIGHTS.map(([k,label])=>{
    // Milestone 68G: four columns, the court form's -- the stored value is
    // the radio's value, the form's word is what the filer sees.
    const cells=PLAN_RIGHT_STATES.map(s=>
      `<td class="text-center"><input class="form-check-input" type="radio" name="right_${k}" value="${esc(s.value)}" ${r[k]===s.value?'checked':''} data-form-path="rights.${k}" aria-label="${esc(label)} — ${esc(s.label)}"></td>`).join('');
    return `<tr><td>${label}</td>${cells}</tr>`;
  }).join('');
  const anyRestorable=PLAN_RIGHTS.some(([k])=>r[k]==='Capable of restoration');
  return `<div class="schedule-page">
    <h1>5–7. Social Skills &amp; Rights</h1>
    ${planQ(5,'Social skills, abilities and activities of the ward',
      txtP('q5SocialSkills',"Describe the ward's social skills and abilities",d.q5SocialSkills,4,true,
        'For example: the ward communicates well; communicates with gestures; cannot communicate at all. Also describe any change from the previous plan period.')
      +txtP('q5Activities',"Activities undertaken to increase the ward's capacity",d.q5Activities,4,true,
        'For example: encouragement, physical or mental therapy, rehabilitative services. Say whether these activities were effective.'))}
    ${planQ(6,'Is the ward now capable of having any of these rights restored?'+REQ_MARK,
      `<table class="table plan-rights-table">
        <thead><tr><th>Right</th>${PLAN_RIGHT_STATES.map(s=>`<th class="text-center" style="width:9rem">${esc(s.label)}</th>`).join('')}</tr></thead>
        <tbody>${rows}</tbody>
      </table>`,
      'Mark each right with its current status, in the court form\'s four columns. <strong>"Yes" (capable of restoration) is a formal statement</strong> — if the physician\'s report agrees, you must file a separate petition to restore that right. This plan does not restore anything on its own.')}
    ${planQ(7,"Disagreement with the physician's report",
      txtP('q7RightsExplain','Explanation',d.q7RightsExplain,4,false,
        "Required only if you marked a right as capable of restoration but disagree with what the physician's report says about it."),
      anyRestorable?"You marked at least one right as capable of restoration. If the physician's report does not agree, explain here."
                   :"Leave blank unless you disagree with the physician's report.")}
    ${renderScheduleDocsSection('planARights')}
    ${pageNavS('/p5','/p7')}
  </div>`;
}

function pagePlanAADLs(){
  const d=getD();
  const a=d.adls||{};
  const rows=PLAN_ADLS.map(([k,label])=>
    `<tr><td>${label}</td><td style="width:16rem">
      <select class="form-select form-select-sm" data-form-path="adls.${k}" aria-label="${esc(label)}">
        ${PLAN_ADL_RATINGS.map(o=>`<option value="${esc(o)}" ${a[k]===o?'selected':''}>${o||'— select —'}</option>`).join('')}
      </select></td></tr>`).join('');
  return `<div class="schedule-page">
    <h1>8. Activities of Daily Living</h1>
    <div class="schedule-instructions">Rate all sixteen honestly, including the ones that haven't changed. The court compares these year over year to see whether the ward's independence is improving or declining, so a blank row is a gap in the record rather than a neutral answer.</div>
    <table class="table plan-adl-table">
      <caption>Rate every activity${REQ_MARK}</caption>
      <thead><tr><th>Activity</th><th>Rating</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    ${renderScheduleDocsSection('planAADLs')}
    ${pageNavS('/p6','/p8')}
  </div>`;
}

function pagePlanADisabilities(){
  const d=getD();
  const cb=(id,label,route='')=>chkP(id,label,d[id],route);
  const devices=(prefix)=>[
    cb(prefix+'Dentures','Dentures'),cb(prefix+'HearingAid','Hearing aid'),
    cb(prefix+'Wheelchair','Wheelchair'),cb(prefix+'Walker','Walker / cane'),
    cb(prefix+'Crutches','Crutches'),cb(prefix+'Prosthetics','Prosthetics'),
    cb(prefix+'Glasses','Glasses'),cb(prefix+'None','None'),cb(prefix+'Other','Other','/p8')].join('');
  return `<div class="schedule-page">
    <h1>9. Disabilities &amp; Assistive Devices</h1>
    ${planQ(9,'Disabilities and assistive devices',
      planCheckGroup('The mental disabilities of the ward are:'+REQ_MARK,
        [cb('q9MentalDementia','Dementia'),cb('q9MentalAlzheimers',"Alzheimer's type of dementia"),
         cb('q9MentalAutism','Autism spectrum disorders'),cb('q9MentalHeadInjury','Closed head injury'),
         cb('q9MentalDevelopmental','Developmental disabilities'),cb('q9MentalIntellectual','Intellectual disability'),
         cb('q9MentalSchizophrenia','Schizophrenia or related disorders'),cb('q9MentalDepression','Depression'),
         cb('q9MentalSubstance','Induced by substance abuse'),
         cb('q9MentalNone','Ward has no mental disabilities'),cb('q9MentalOther','Other','/p8')].join(''),
        'q9MentalExplain',d.q9MentalExplain,explanationShown(PLAN_ANNUAL_EXPLANATIONS,d,'q9MentalExplain'))
      +planCheckGroup('The physical disabilities of the ward are:'+REQ_MARK,
        [cb('q9PhysMobility','Mobility'),cb('q9PhysBlindness','Blindness'),
         cb('q9PhysDeafness','Deafness'),cb('q9PhysDiabetic','Diabetic'),
         cb('q9PhysParkinsons',"Parkinson's disease"),cb('q9PhysArthritis','Severe arthritis'),
         cb('q9PhysNone','Ward has no physical disabilities'),cb('q9PhysOther','Other','/p8')].join(''),
        'q9PhysExplain',d.q9PhysExplain,explanationShown(PLAN_ANNUAL_EXPLANATIONS,d,'q9PhysExplain'))
      +planCheckGroup('Assistive devices the ward currently uses:',devices('q9Uses'),
        'q9UsesExplain',d.q9UsesExplain,explanationShown(PLAN_ANNUAL_EXPLANATIONS,d,'q9UsesExplain'))
      +planCheckGroup('Assistive devices the ward needs but does not yet have:',devices('q9Needs'),
        'q9NeedsExplain',d.q9NeedsExplain,explanationShown(PLAN_ANNUAL_EXPLANATIONS,d,'q9NeedsExplain')))}
    ${renderScheduleDocsSection('planADisabilities')}
    ${pageNavS('/p7','/p9')}
  </div>`;
}

function pagePlanADirectives(){
  const d=getD();
  const cb=(id,label,route='')=>chkP(id,label,d[id],route);
  // Milestone 37-4: a plain chkP() checkbox doesn't re-render this page on
  // change (no data-form-route), which is fine for most checkboxes here but
  // not this one -- the type controls, cards, and Add Directive button below
  // only exist in the DOM once q10Executed is true, so checking it must
  // force a fresh render to reveal them. data-form-change="ensure-directive-
  // row" also gives an empty collection exactly one blank card immediately
  // (src/form-events.js), matching the UX before this collection stopped
  // being pre-seeded.
  const q10ExecutedCb=`<div class="form-check plan-check">
    <input class="form-check-input" type="checkbox" id="q10Executed" ${d.q10Executed?'checked':''} data-form-path="q10Executed" data-form-value="boolean" data-form-route="/p9" data-form-change="ensure-directive-row" data-collection="q10Directives">
    <label class="form-check-label" for="q10Executed">The ward executed the following advance directives</label>
  </div>`;
  const blocks=(d.q10Directives||[]).map((r,i)=>{
    return `<div class="col-12"><div class="entry-card mb-2">
      <div class="entry-card-header">
        <span>Directive ${i+1}</span>
        <span class="entry-card-actions">
          <button class="btn btn-sm btn-outline-danger ms-auto" data-form-action="remove-plan-row" data-collection="q10Directives" data-index="${i}" data-route="/p9">✕ Remove</button>
        </span>
      </div>
      <div class="entry-card-body"><div class="row g-2">
        <div class="col-md-6"><label class="form-label">Title of the order or directive</label><input type="text" class="form-control" value="${esc(r.title||'')}" data-form-path="q10Directives.${i}.title" data-field-path="q10Directives.${i}.title"></div>
        <div class="col-md-3"><label class="form-label" for="q10_dir_${i}_dateSigned">Date executed / signed</label><input type="text" inputmode="text" class="form-control" id="q10_dir_${i}_dateSigned" placeholder="MM/DD/YYYY" value="${esc(formatDisplayDate(r.dateSigned||''))}" data-form-path="q10Directives.${i}.dateSigned" data-field-path="q10Directives.${i}.dateSigned" data-field-kind="date" data-field-format-policy="normalize" aria-describedby="q10_dir_${i}_dateSigned_hint"><div id="q10_dir_${i}_dateSigned_hint" class="form-text text-muted" style="font-size:0.75rem;margin-top:0.2rem;">Use MM/DD/YYYY</div></div>
        <div class="col-md-3"><label class="form-label">Name of person who signed</label><input type="text" class="form-control" value="${esc(r.signedBy||'')}" data-form-path="q10Directives.${i}.signedBy" data-field-path="q10Directives.${i}.signedBy"></div>
        <div class="col-md-6"><label class="form-label">Designated agent(s) or surrogate(s)</label><input type="text" class="form-control" value="${esc(r.agents||'')}" data-form-path="q10Directives.${i}.agents" data-field-path="q10Directives.${i}.agents"></div>
        <div class="col-md-6"><label class="form-label">Alternate agent(s) or surrogate(s)</label><input type="text" class="form-control" value="${esc(r.alternates||'')}" data-form-path="q10Directives.${i}.alternates" data-field-path="q10Directives.${i}.alternates"></div>
        <div class="col-md-6"><label class="form-label">Relationship of agent(s) to the ward</label><input type="text" class="form-control" value="${esc(r.relationship||'')}" data-form-path="q10Directives.${i}.relationship" data-field-path="q10Directives.${i}.relationship"></div>
        <div class="col-md-6"><label class="form-label">Contact information for agent(s)</label><input type="text" class="form-control" value="${esc(r.contact||'')}" data-form-path="q10Directives.${i}.contact" data-field-path="q10Directives.${i}.contact"></div>
        <div class="col-md-4">${yesNoCheckboxS(`q10dir_${i}_revoked`,'Has a court suspended or revoked it?',r.courtRevoked,false,'/p9')}</div>
        ${r.courtRevoked==='Yes'?`
        <div class="col-md-4"><label class="form-label" for="q10_dir_${i}_orderDate">Date of order</label><input type="text" inputmode="text" class="form-control" id="q10_dir_${i}_orderDate" placeholder="MM/DD/YYYY" value="${esc(formatDisplayDate(r.orderDate||''))}" data-form-path="q10Directives.${i}.orderDate" data-field-path="q10Directives.${i}.orderDate" data-field-kind="date" data-field-format-policy="normalize" aria-describedby="q10_dir_${i}_orderDate_hint"><div id="q10_dir_${i}_orderDate_hint" class="form-text text-muted" style="font-size:0.75rem;margin-top:0.2rem;">Use MM/DD/YYYY</div></div>
        <div class="col-md-4"><label class="form-label">Entered in (county / state)</label><input type="text" class="form-control" value="${esc(r.orderCounty||'')}" data-form-path="q10Directives.${i}.orderCounty" data-field-path="q10Directives.${i}.orderCounty"></div>`:''}
      </div></div>
    </div></div>`;
  }).join('');
  return `<div class="schedule-page">
    <h1>10. Advance Directives</h1>
    ${planQ(10,'Pre-existing orders and advance directives',
      `<div class="plan-check-grid">${cb('q10NoDirectives','There are NO pre-existing DNR orders or other advance directives','/p9')}</div>
      ${d.q10NoDirectives?`<div class="plan-conditional mt-2 mb-3">
        <label class="form-label">Steps taken to verify there are none:</label>
        <div class="plan-check-grid">
          ${cb('q10StepResidence',"Search of ward's prior and current residence")}
          ${cb('q10StepSafeDeposit',"Inventory of ward's safe deposit box")}
          ${cb('q10StepInterviewed','Interviewed family and friends')}
          ${cb('q10StepMedicalProviders',"Requested documents from the ward's medical providers")}
          ${cb('q10StepAttorney',"Requested documents from the ward's attorney")}
        </div></div>`:''}
      <div class="plan-check-grid mt-2">${q10ExecutedCb}</div>
      ${d.q10Executed?`<div class="plan-conditional mt-2">
        <div class="plan-check-grid">
          ${cb('q10ExecDNR','Order Not to Resuscitate (DNR), F.S. 401.45(3)')}
          ${cb('q10ExecHealthcare','Advance Directive for Healthcare (surrogate, living will, anatomical gift)')}
          ${cb('q10ExecPOA','Durable Power of Attorney, F.S. Chapter 709')}
          ${cb('q10ExecOther','Other','/p9')}
        </div>
        ${d.q10ExecOther?`<div class="mt-2">${inpS('q10ExecOtherText','Describe the other directive',d.q10ExecOtherText,true)}</div>`:''}
        <h3 style="font-size:.85rem;font-weight:650;margin:1rem 0 .5rem;">Details for each directive</h3>
        ${blocks?`<div class="row g-3 schedule-entry-grid">${blocks}</div>`:''}
        <button class="btn btn-outline-primary btn-sm" data-form-action="add-plan-row" data-collection="q10Directives" data-row-type="directive" data-route="/p9">+ Add Directive</button>
      </div>`:''}`,
      'If there are no directives, check the first box and record the steps you took to verify that. If the ward did execute directives, check the second box and describe each one.')}
    ${renderScheduleDocsSection('planADirectives')}
    ${pageNavS('/p8','/p10')}
  </div>`;
}

function pagePlanARemuneration(){
  const d=getD();
  return `<div class="schedule-page">
    <h1>11. Remuneration</h1>
    ${planQ(11,'Declaration of remuneration'+REQ_MARK,
      `<div class="plan-check-grid">${chkP('q11NoRemuneration','I have received NO remuneration from any source for services rendered to or on behalf of the ward',d.q11NoRemuneration,'/p10')}</div>
      ${d.q11NoRemuneration
        ? `<div class="plan-conditional mt-2">${inpS('q11NoRemunerationName',"Declaring guardian's name",d.q11NoRemunerationName,true)}</div>`
        : `<div class="plan-conditional mt-2">
            <div class="row g-2">
              <div class="col-md-4">${inpS('q11ReceivedName',"Declaring guardian's name",d.q11ReceivedName)}</div>
              <div class="col-md-4">${inpS('q11Amount','Amount received',d.q11Amount,false,'number')}</div>
              <div class="col-md-4">${inpS('q11From','Received from (person or company)',d.q11From)}</div>
            </div>
            <div class="plan-check-grid mt-2">${chkP('q11SubmittedToCourt','All requests for reimbursement or fees have been submitted to the court for review and approval',d.q11SubmittedToCourt)}</div>
          </div>`}`,
      'Remuneration means any payment or benefit made directly or indirectly, overtly or covertly, in cash or in kind, to the guardian — F.S. 744.367(3)(a). If you received nothing, check the box; otherwise fill in the details below it.')}
    ${renderScheduleDocsSection('planARemuneration')}
    ${pageNavS('/p9','/p11')}
  </div>`;
}

function pagePlanASignatures(){
  const d=getD();
  const g=normalizePlanGuardians(d);
  const cb=(id,label,route='')=>chkP(id,label,d[id],route);
  const block=(i,label)=>{
    const p=g[i]||{};
    return `<div class="col-12 col-lg-6"><div class="entry-card mb-0 h-100">
      <div class="entry-card-header d-flex justify-content-between align-items-center gap-2"><span>${label}</span><span class="d-flex gap-2"><button type="button" class="btn btn-outline-secondary btn-sm" data-form-action="link-party" data-role="guardian" data-index="${i}">Link Person</button>${i?`<button type="button" class="btn btn-outline-danger btn-sm" data-form-action="remove-plan-guardian" data-index="${i}" data-route="/p11">Remove</button>`:''}</span></div>
      <div class="entry-card-body">
        <div class="row g-2">
          <div class="col-md-7">${renderFormField({ path: `planGuardians.${i}.name`, label: 'Printed Name', value: p.name, required: i===0 })}</div>
          <div class="col-md-5"><label class="form-label" for="plan_guardians_${i}_sigDate">Date Signed${signatureDateRequired({ path: `planGuardians.${i}`, state: p.signatureState })?REQ_MARK:''}</label><input type="text" inputmode="text" class="form-control" id="plan_guardians_${i}_sigDate" placeholder="MM/DD/YYYY" value="${esc(formatDisplayDate(p.signatureDate||''))}" data-form-path="planGuardians.${i}.signatureDate" data-field-path="planGuardians.${i}.signatureDate" data-field-kind="date" data-field-format-policy="normalize" aria-describedby="plan_guardians_${i}_sigDate_hint"><div id="plan_guardians_${i}_sigDate_hint" class="form-text text-muted" style="font-size:0.75rem;margin-top:0.2rem;">Use MM/DD/YYYY</div></div>
          <div class="col-12">${renderSignatureStateControl({ path: `planGuardians.${i}`, state: p.signatureState, date: p.signatureDate, route: '/p11', signatureImage: p.signatureImage })}</div>
          <div class="col-md-5">${renderFormField({ path: `planGuardians.${i}.ssn`, label: 'SSN / EIN', value: p.ssn, required: true })}</div>
          <div class="col-md-7">${renderFormField({ path: `planGuardians.${i}.phone`, label: 'Phone Number', value: p.phone, required: true })}</div>
          <div class="col-12">${renderFormField({ path: `planGuardians.${i}.email`, label: 'Email Address', value: p.email })}</div>
          <div class="col-12">${renderFormField({ path: `planGuardians.${i}.mailingStreet`, label: 'Mailing Street Address', value: p.mailingStreet, required: true })}</div>
          <div class="col-12">${renderFormField({ path: `planGuardians.${i}.mailingCityStateZip`, label: 'Mailing City / State / ZIP', value: p.mailingCityStateZip })}</div>
          <div class="col-12">${renderFormField({ path: `planGuardians.${i}.officeStreet`, label: 'Residence or Office Street Address', value: p.officeStreet })}</div>
          <div class="col-12">${renderFormField({ path: `planGuardians.${i}.officeCityStateZip`, label: 'Residence or Office City / State / ZIP', value: p.officeCityStateZip })}</div>
          <div class="col-12">${renderFormField({ path: `planGuardians.${i}.relationship`, label: 'Relationship to Ward', value: p.relationship })}</div>
        </div>
      </div>
    </div></div>`;
  };
  return `<div class="schedule-page">
    <h1>Signatures</h1>
  ${preparerNoteHTML()}
    <h2 class="subsection-heading">Certification of Guardian(s)</h2>
    <div class="schedule-instructions">Check each statement that applies. If the ward's ability to exercise rights has changed since the order appointing you, you must either file a petition to remove or restore rights, or explain below why no change should be made.</div>
    <div class="plan-check-grid mb-3">
      ${cb('certIncapacitatedNoCopy','The ward was declared totally incapacitated and has not been given a copy of this plan')}
      ${cb('certMinorNoCopy','The ward is a minor and has not been given a copy of this plan')}
      ${cb('certConsulted',"The guardian has consulted with the ward, honored their wishes, and the plan accords with them to the maximum extent possible")}
      ${cb('certNoRestriction',"The plan does not restrict the ward's physical liberty except as necessary to prevent serious injury, illness or disease")}
      ${cb('certProvidesMedical',"The plan provides for the ward's medical care and mental health treatment")}
      ${cb('certPhysicianAttached',"The physician's statement of an examination within 90 days before the plan period is attached")}
      ${cb('certRecognizeRights','In exercising their powers, the guardian recognizes any rights retained by the ward (F.S. 744.363(6))')}
    </div>
    ${txtP('certRightsChangedExplain','If rights have changed and no petition is being filed, explain why',d.certRightsChangedExplain,3)}
    <div class="attestation-text mb-3">Under penalties of perjury, I declare that I have read and examined the foregoing plan, and the facts alleged are true, to the best of my knowledge and belief.</div>
    <div class="row g-3 card-grid-2col mb-4">
      ${g.map((_,i)=>block(i,i?'Co-Guardian':'Guardian')).join('')}
    </div>
    ${g.length<3?'<button type="button" class="btn btn-outline-secondary btn-sm mb-3 no-print" data-form-action="add-plan-guardian" data-route="/p11">+ Add Co-Guardian</button>':''}
    <h2 class="subsection-heading mt-4">Certification of Guardian's Attorney</h2>
    <div class="schedule-instructions">The attorney notifies the court of this filing and represents that the plan conforms to Florida Guardianship Law. Leave blank if no attorney is involved.</div>
    <div class="row g-3 card-grid-2col mb-3">
      <div class="col-12 col-lg-6">
        <div class="entry-card mb-0 h-100">
          <div class="entry-card-header d-flex justify-content-between align-items-center gap-2"><span>Attorney Certification</span><button type="button" class="btn btn-outline-secondary btn-sm" data-form-action="link-party" data-role="attorney" data-index="0">Link Person</button></div>
          <div class="entry-card-body">
            <div class="row g-2">
              <div class="col-md-7">${inpS('attorney','Attorney Name',d.attorney,isAttorneyStarted(d,'planAnnual'))}</div>
              <div class="col-md-5">${inpS('attorney_signatureDate','Date Signed',d.attorney_signatureDate,signatureDateRequired({ path: 'attorney', state: d.attorney_signatureState }),'date')}</div>
              <div class="col-12">${renderSignatureStateControl({ path: 'attorney', state: d.attorney_signatureState, date: d.attorney_signatureDate, route: '/p11', signatureImage: d.attorney_signatureImage, statePath: 'attorney_signatureState', imagePath: 'attorney_signatureImage' })}</div>
              <div class="col-md-6">${inpS('attorney_bar','Bar Number',d.attorney_bar)}</div>
              <div class="col-md-6">${inpS('attorney_phone','Phone Number',d.attorney_phone)}</div>
              <div class="col-12">${inpS('attorney_email','Primary Email (e-filing)',d.attorney_email,isAttorneyStarted(d,'planAnnual'),'email')}</div>
              <div class="col-12">${inpS('attorney_secondary_email','Secondary Email (optional)',d.attorney_secondary_email || d.attorney_secondaryEmail,false,'email')}</div>
              <div class="col-12">${inpS('attorney_street','Street Address',d.attorney_street)}</div>
              <div class="col-12">${inpS('attorney_cityStateZip','City / State / ZIP',d.attorney_cityStateZip)}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
    ${renderScheduleDocsSection('planASignatures')}
    ${pageNavS('/p10','/p12')}
  </div>`;
}

// Milestone 42F: every issue states its own field path (validation-issue.js).
// Milestone 73F part 1: the checks are src/core/validation/engines/plan-annual.js's.
export function validatePlanAnnual(){ return collectPlanAnnualIssues(getD()); }
// Milestone 33, Phase 2.3: see annual-accounting/index.js's identical comment --
// exposing this lets the shared guidance panel itemize Plan Annual's own
// missing fields instead of only showing a generic message.

// ── Certificate of Service (Milestone 68C) ───────────────────────────────
// Shared with the other three Plans; see core/filing/plan-certificate-of-service.js.
const CERT_CFG = { attorneyName: (d) => d.attorney || '', planNoun: 'plan' };
function pagePlanACertificate(){
  return `<div class="schedule-page">
    ${renderPlanCertificateOfServicePage({ filing: getD(), route: '/p12', cfg: CERT_CFG })}
    ${pageNavS('/p11',null)}
  </div>`;
}
