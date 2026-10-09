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
import { renderCheckboxField, renderFormField } from '../../core/form/form-fields.js';
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
import { hasSixthCircuitLocalGuidance } from '../../core/filing/county-guidance.js';
import { PLAN_ANNUAL_CHOICES as C, PLAN_ANNUAL_DEVICES, PLAN_ANNUAL_TEXT as T, numbered, planAnnualAttorneyCertification, planAnnualMoveChoices, planAnnualNoRemuneration } from '../../core/filing/court-text/plan-annual.js';
import { displayDate } from '../../core/form/date-parser.js';
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
              mailingSameAsResidence: d.mailingSameAsResidence === true,
              sameAsRoute: '/',
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
    <h1>${numbered(1,T.q1)}</h1>
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
  // Milestone 73N part 2: the counties only on a Pinellas or Pasco filing.
  const moves=planAnnualMoveChoices(hasSixthCircuitLocalGuidance(d.county));
  return `<div class="schedule-page">
    <h1>2–3. Residence Change &amp; Care Plan</h1>
    ${planQ(2,T.q2+REQ_MARK,
      `<div class="plan-check-grid">
        ${cb('q2NoMove',T.q2NoMove)}
        ${cb('q2WithinCounty',T.q2WithinCounty)}
        ${cb('q2WithinCircuit',moves.q2WithinCircuit)}
        ${cb('q2OutsideApproved',moves.q2OutsideApproved)}
        ${cb('q2OutsideVenuePetition',moves.q2OutsideVenuePetition)}
      </div>`)}
    ${planQ(3,T.q3,
      planCheckGroup(T.q3A+REQ_MARK,
        [cb('q3SettingALF',C.q3SettingALF),cb('q3SettingGroupHome',C.q3SettingGroupHome),
         cb('q3SettingIntermediate',C.q3SettingIntermediate),cb('q3SettingPrivate',C.q3SettingPrivate),
         cb('q3SettingSkilled',C.q3SettingSkilled),cb('q3SettingSpecialized',C.q3SettingSpecialized),
         cb('q3SettingStateHospital',C.q3SettingStateHospital),cb('q3SettingOther',C.q3SettingOther,'/p3')].join(''),
        'q3SettingExplain',d.q3SettingExplain,explanationShown(PLAN_ANNUAL_EXPLANATIONS,d,'q3SettingExplain'))
      +planCheckGroup(T.q3B,
        [cb('q3EnsureAssessing',C.q3EnsureAssessing),
         cb('q3EnsureWardDecides',C.q3EnsureWardDecides),
         cb('q3EnsureNoChange',C.q3EnsureNoChange)].join(''),'','',false)
      +planCheckGroup(`${T.q3C} ${T.checkAll}`,
        [cb('q3MedPrimary',C.q3MedPrimary),
         cb('q3MedDentist',C.q3MedDentist),
         cb('q3MedOphthalmologist',C.q3MedOphthalmologist),
         cb('q3MedSpecialist',C.q3MedSpecialist,'/p3'),
         cb('q3MedPhysicalTherapy',C.q3MedPhysicalTherapy),cb('q3MedSpeechTherapy',C.q3MedSpeechTherapy),
         cb('q3MedOccupationalTherapy',C.q3MedOccupationalTherapy),
         cb('q3MedWardDecides',C.q3MedWardDecides),
         cb('q3MedNone',C.q3MedNone,'/p3'),cb('q3MedOther',C.q3MedOther,'/p3')].join(''),
        'q3MedExplain',d.q3MedExplain,explanationShown(PLAN_ANNUAL_EXPLANATIONS,d,'q3MedExplain'))
      +(d.q3MedSpecialist?`<div class="plan-conditional mb-3">${inpS('q3MedSpecialistArea','Area of specialty',d.q3MedSpecialistArea,true)}</div>`:'')
      +planCheckGroup(`${T.q3D} ${T.checkAll}`,
        [cb('q3MentalPsych',C.q3MentalPsych),
         cb('q3MentalWardDecides',C.q3MentalWardDecides),
         cb('q3MentalOutpatient',C.q3MentalOutpatient),
         cb('q3MentalInpatient',C.q3MentalInpatient),
         cb('q3MentalNone',C.q3MentalNone,'/p3'),cb('q3MentalOther',C.q3MentalOther,'/p3')].join(''),
        'q3MentalExplain',d.q3MentalExplain,explanationShown(PLAN_ANNUAL_EXPLANATIONS,d,'q3MentalExplain'))
      +planCheckGroup(`${T.q3E} ${T.checkAll}`,
        [cb('q3PersonalFacility',C.q3PersonalFacility),cb('q3PersonalNurses',C.q3PersonalNurses),
         cb('q3PersonalFamily',C.q3PersonalFamily),cb('q3PersonalWithout',C.q3PersonalWithout),
         cb('q3PersonalNone',C.q3PersonalNone,'/p3'),cb('q3PersonalOther',C.q3PersonalOther,'/p3')].join(''),
        'q3PersonalExplain',d.q3PersonalExplain,explanationShown(PLAN_ANNUAL_EXPLANATIONS,d,'q3PersonalExplain'))
      +planCheckGroup(`${T.q3F} ${T.checkAll}`,
        [cb('q3SocialFacility',C.q3SocialFacility),cb('q3SocialNurses',C.q3SocialNurses),
         cb('q3SocialFamily',C.q3SocialFamily),
         cb('q3SocialWardDecides',C.q3SocialWardDecides),
         cb('q3SocialNone',C.q3SocialNone,'/p3'),cb('q3SocialOther',C.q3SocialOther,'/p3')].join(''),
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
    <h2 class="plan-question-text">${T.q3G}</h2>
    <div class="schedule-instructions">Health and accident insurance, and any private or governmental benefits the ward receives toward the cost of medical, mental health or related services. Mark whether the ward is <strong>eligible</strong> for each, and whether you have <strong>applied</strong> for it.</div>
    <table class="table plan-benefits-table">
      <thead><tr><th>Benefit</th><th class="text-center">Eligible</th><th class="text-center">Applied for</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="plan-check-grid mt-3">
      ${chkP('q3BenefitsNone',C.q3BenefitsNone,d.q3BenefitsNone,'/p4')}
      ${chkP('q3BenefitsOther',C.q3BenefitsOther,d.q3BenefitsOther,'/p4')}
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
    <h1>${numbered(4,T.q4)}</h1>
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
    ${planQ(5,T.q5,
      txtP('q5SocialSkills',T.q5A,d.q5SocialSkills,4,true)
      +txtP('q5Activities',T.q5B,d.q5Activities,4,true))}
    ${planQ(6,T.q6+REQ_MARK,
      `<table class="table plan-rights-table">
        <thead><tr><th>Right</th>${PLAN_RIGHT_STATES.map(s=>`<th class="text-center" style="width:9rem">${esc(s.label)}</th>`).join('')}</tr></thead>
        <tbody>${rows}</tbody>
      </table>`,
      'Mark each right with its current status, in the court form\'s four columns. <strong>"Yes" (capable of restoration) is a formal statement</strong> — if the physician\'s report agrees, you must file a separate petition to restore that right. This plan does not restore anything on its own.')}
    ${planQ(7,T.q7,
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
  const devices=(prefix)=>PLAN_ANNUAL_DEVICES.map(([suffix,label])=>cb(prefix+suffix,label,suffix==='Other'?'/p8':'')).join('');
  return `<div class="schedule-page">
    <h1>9. Disabilities &amp; Assistive Devices</h1>
    ${planQ(9,T.q9,
      planCheckGroup(T.q9A+REQ_MARK,
        [cb('q9MentalDementia',C.q9MentalDementia),cb('q9MentalAlzheimers',C.q9MentalAlzheimers),
         cb('q9MentalAutism',C.q9MentalAutism),cb('q9MentalHeadInjury',C.q9MentalHeadInjury),
         cb('q9MentalDevelopmental',C.q9MentalDevelopmental),cb('q9MentalIntellectual',C.q9MentalIntellectual),
         cb('q9MentalSchizophrenia',C.q9MentalSchizophrenia),cb('q9MentalDepression',C.q9MentalDepression),
         cb('q9MentalSubstance',C.q9MentalSubstance),
         cb('q9MentalNone',C.q9MentalNone),cb('q9MentalOther',C.q9MentalOther,'/p8')].join(''),
        'q9MentalExplain',d.q9MentalExplain,explanationShown(PLAN_ANNUAL_EXPLANATIONS,d,'q9MentalExplain'))
      +planCheckGroup(`${T.q9B} ${T.checkAll}`+REQ_MARK,
        [cb('q9PhysMobility',C.q9PhysMobility),cb('q9PhysBlindness',C.q9PhysBlindness),
         cb('q9PhysDeafness',C.q9PhysDeafness),cb('q9PhysDiabetic',C.q9PhysDiabetic),
         cb('q9PhysParkinsons',C.q9PhysParkinsons),cb('q9PhysArthritis',C.q9PhysArthritis),
         cb('q9PhysNone',C.q9PhysNone),cb('q9PhysOther',C.q9PhysOther,'/p8')].join(''),
        'q9PhysExplain',d.q9PhysExplain,explanationShown(PLAN_ANNUAL_EXPLANATIONS,d,'q9PhysExplain'))
      +planCheckGroup(`${T.q9C} ${T.checkAll}`,devices('q9Uses'),
        'q9UsesExplain',d.q9UsesExplain,explanationShown(PLAN_ANNUAL_EXPLANATIONS,d,'q9UsesExplain'))
      +planCheckGroup(`${T.q9D} ${T.checkAll}`,devices('q9Needs'),
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
    <label class="form-check-label" for="q10Executed">${T.q10Executed}</label>
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
    ${planQ(10,'Advance directives',
      `<div class="plan-check-grid">${cb('q10NoDirectives',T.q10NoDirectives,'/p9')}</div>
      ${d.q10NoDirectives?`<div class="plan-conditional mt-2 mb-3">
        <div class="plan-check-grid">
          ${cb('q10StepResidence',C.q10StepResidence)}
          ${cb('q10StepSafeDeposit',C.q10StepSafeDeposit)}
          ${cb('q10StepInterviewed',C.q10StepInterviewed)}
          ${cb('q10StepMedicalProviders',C.q10StepMedicalProviders)}
          ${cb('q10StepAttorney',C.q10StepAttorney)}
        </div></div>`:''}
      <div class="plan-check-grid mt-2">${q10ExecutedCb}</div>
      ${d.q10Executed?`<div class="plan-conditional mt-2">
        <div class="plan-check-grid">
          ${cb('q10ExecDNR',C.q10ExecDNR)}
          ${cb('q10ExecHealthcare',C.q10ExecHealthcare)}
          ${cb('q10ExecPOA',C.q10ExecPOA)}
          ${cb('q10ExecOther',C.q10ExecOther,'/p9')}
        </div>
        ${d.q10ExecOther?`<div class="mt-2">${inpS('q10ExecOtherText','Describe the other directive',d.q10ExecOtherText,true)}</div>`:''}
        <h3 style="font-size:.85rem;font-weight:650;margin:1rem 0 .5rem;">${T.q10ForAny}</h3>
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
    ${planQ(11,T.q11+REQ_MARK,
      `<div class="plan-check-grid">${chkP('q11NoRemuneration',planAnnualNoRemuneration('____________'),d.q11NoRemuneration,'/p10')}</div>
      ${d.q11NoRemuneration
        ? `<div class="plan-conditional mt-2">${inpS('q11NoRemunerationName',"Declaring guardian's name",d.q11NoRemunerationName,true)}</div>`
        : `<div class="plan-conditional mt-2">
            <div class="row g-2">
              <div class="col-md-4">${inpS('q11ReceivedName',"Declaring guardian's name",d.q11ReceivedName)}</div>
              <div class="col-md-4">${inpS('q11Amount','Amount received',d.q11Amount,false,'number')}</div>
              <div class="col-md-4">${inpS('q11From','Received from (person or company)',d.q11From)}</div>
            </div>
            <div class="plan-check-grid mt-2">${chkP('q11SubmittedToCourt',T.q11Submitted,d.q11SubmittedToCourt)}</div>
          </div>`}`,
      'If you received nothing, check the box; otherwise fill in the details below it.')}
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
          <div class="col-12">${renderCheckboxField({ path: `planGuardians.${i}.officeSameAsMailing`, id: `planGuardians_${i}_officeSameAsMailing`, label: 'Residence or office address same as mailing address', checked: p.officeSameAsMailing === true, route: '/p11' })}</div>
          ${p.officeSameAsMailing === true ? '' : `<div class="col-12">${renderFormField({ path: `planGuardians.${i}.officeStreet`, label: 'Residence or Office Street Address', value: p.officeStreet })}</div>
          <div class="col-12">${renderFormField({ path: `planGuardians.${i}.officeCityStateZip`, label: 'Residence or Office City / State / ZIP', value: p.officeCityStateZip })}</div>`}
          <div class="col-12">${renderFormField({ path: `planGuardians.${i}.relationship`, label: 'Relationship to Ward', value: p.relationship })}</div>
        </div>
      </div>
    </div></div>`;
  };
  return `<div class="schedule-page">
    <h1>Signatures</h1>
  ${preparerNoteHTML()}
    <h2 class="subsection-heading">${T.certTitle}</h2>
    <div class="schedule-instructions">${T.certCheckAll} ${T.certPreamble}</div>
    <div class="plan-check-grid mb-3">
      ${cb('certIncapacitatedNoCopy',C.certIncapacitatedNoCopy)}
      ${cb('certMinorNoCopy',C.certMinorNoCopy)}
      ${cb('certConsulted',C.certConsulted)}
      ${cb('certNoRestriction',C.certNoRestriction)}
      ${cb('certProvidesMedical',C.certProvidesMedical)}
      ${cb('certPhysicianAttached',C.certPhysicianAttached)}
      ${cb('certRecognizeRights',C.certRecognizeRights)}
    </div>
    ${txtP('certRightsChangedExplain','If rights have changed and no petition is being filed, explain why',d.certRightsChangedExplain,3)}
    <div class="attestation-text mb-3">${T.perjury}</div>
    <div class="row g-3 card-grid-2col mb-4">
      ${g.map((_,i)=>block(i,i?'Co-Guardian':'Guardian')).join('')}
    </div>
    ${g.length<3?'<button type="button" class="btn btn-outline-secondary btn-sm mb-3 no-print" data-form-action="add-plan-guardian" data-route="/p11">+ Add Co-Guardian</button>':''}
    <h2 class="subsection-heading mt-4">${T.attorneyTitle}</h2>
    <div class="schedule-instructions">Leave blank if no attorney is involved.</div>
    <div class="attestation-text mb-3">${esc(planAnnualAttorneyCertification(displayDate(d.periodFrom)||'—',displayDate(d.periodTo)||'—',d.county||'—'))}</div>
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
