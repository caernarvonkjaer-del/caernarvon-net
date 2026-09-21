import { renderSummaryPage, navStatus, formatSummaryDate } from '../../core/summary-renderer.js';
import { renderSelectField } from '../../core/form/form-fields.js';
import { GUARDIANSHIP_LIFECYCLE_OPTIONS, optionsWithLegacyValue } from '../../core/form/guardianship-options.js';
import { checkSignatureState, inferLegacySignatureState } from '../../core/validation/signature-state.js';
import { isPlanInitialAttorneyStarted } from '../../core/validation/attorney-block.js';
import { issueFactory } from '../../core/validation/validation-issue.js';
import { rowStarted } from '../../core/validation/row-started.js';
import { isAffirmative } from '../../core/form/form-contract.js';
import { renderSignatureStateControl, mountSignatureStateControls } from '../../core/signature/signature-state-control.js';
import { preparerNoteHTML } from '../../core/signature/preparer-note.js';
// Milestone 41-3: Cover page's "Ward & Case Information" box has the exact
// same field order as Plan Simplified's (wardName, caseNumber, county) --
// both cards reuse unchanged, no card-level changes needed, confirming
// they genuinely generalize. inceptionDate/lettersSignedDate/successorGuardianship
// stay as direct inpS()/renderSelectField() calls: already on Tier 1 via
// Milestone 41-1's delegation, and inceptionDate+lettersSignedDate (two
// required dates) don't fit renderReportingPeriodFields()'s optional
// inceptionDate slot (built for one required-alongside-period date, not
// two independently-required ones) -- only periodFrom/periodTo (not
// required on this page, unlike Plan Simplified/Minor) are wired below.
// The "Guardian, Attorney & Residence" box's own fields (guardianNames,
// attorneyName, wardLiving, residence/mailing address) are ALL already on
// Tier 1 via inpS()/radioP() too -- there is no adoption gap here to
// justify building the milestone's fourth named card (Residence & Facility
// Profile) yet. Building it now, with only this one type's shape in hand,
// would repeat the same premature-abstraction mistake already avoided
// twice this session (43E Decision 1, 43G Decision 3, and 41-2's own
// deferral of this exact card) -- deferred again to whichever step
// confirms Plan Annual's real shape next.
import { renderCaseCaptionFields } from '../../core/form/cards/case-caption-card.js';
import { renderWardIdentityFields, renderReportingPeriodFields } from '../../core/form/cards/ward-demographics-card.js';
// Milestone 41-3 (Plan Annual step): the Residence & Facility Profile card
// deferred above was built once Plan Annual supplied a second real usage,
// and this page was retro-fitted onto it in the same commit -- two real
// users is what justified extracting it. This page passes its own wording
// for the two labels that differ from Plan Annual's.
import { renderResidenceFields } from '../../core/form/cards/residence-facility-card.js';
import { renderPartyNameField } from '../../core/form/cards/guardian-attorney-card.js';
import { renderFormField } from '../../core/form/form-fields.js';
// Initial Guardianship Plan — the fourth feature extraction (Milestone 5,
// Phases A and B of INDEX-SPLIT-PLAN.md's migration sequence: data/
// validation/pages/nav, and print/PDF export). Dynamically imported by
// legacy-app.js's mountPlanInitialFeature()/mountPlanInitialNav() bridge
// (built on src/core/feature-bridge.js), never statically imported.
//
// legacy-app.js stays a classic (non-module) script (Milestone 1's recorded
// decision), so its top-level function declarations are real `window`
// properties this module can destructure -- but a bare top-level `let`
// (activeInventoryType, currentPage) is not; see src/core/state.js's file
// header for the full explanation. Everything below that isn't defined in
// this file is one of those legacy globals, deliberately left in place
// rather than moved: `planQ`/`planCheckGroup`/`planEmptyRow`/`addPlanRow`/
// `removePlanRow`/`duplicatePlanRow`/`txtP`/`chkP`/`radioP`/`pageNavS`/
// `yesNoCheckboxS` are still shared with the one remaining not-yet-extracted
// Plan type (planMinor); `INITIAL_ADLS`/`INITIAL_ADL_RATINGS` stay legacy
// because computeNavChecks()'s planInitial branch reads them directly (see
// the Milestone 5 plan's "Confirmed facts" and "Design decisions").
//
// print.js is dynamically imported only when the user reaches /print or
// triggers PDF export (Phase B) -- same lazy boundary as the other two
// extracted Plan features. No excel.js: no Plan filing type has Excel
// support (confirmed by grep -- see the Milestone 5 plan's "Confirmed
// facts").
// Milestone 51C: `countyInputS`, `formatName`, `formatPhone` and
// `toggleSsnReveal` were all destructured here without ever being called, and
// are dropped. plan-annual got the formatter half of this cleanup in Milestone
// 41-3 and plan-simplified in 41-2 (each left a note saying so); plan-initial
// and plan-minor never got that pass, which is why they still carried them.
// See plan-annual/index.js's Milestone 51C note for why toggleSsnReveal is
// never needed in a feature module's scope.
const {
  esc, ic, inpS, radioP, pageNavS,
  renderScheduleDocsSection, txtP, chkP, planQ, planCheckGroup, yesNoCheckboxS,
  formatDisplayDate,
  INITIAL_ADLS, INITIAL_ADL_RATINGS,
} = window;

// Milestone 39-C: see plan-annual/index.js's identical comment.
const signatureHandles = new WeakMap();

// Milestone 58C: /p10's live required-marker subscription, one per mounted
// container, ended by the same dispose() that tears down the signature pads.
const attorneyMarkerAborts = new WeakMap();

/**
 * Milestone 58C. Primary Email is required only once an attorney has been
 * started, and "started" changes while the filer types -- entering a phone
 * number alone is enough. So the marker cannot be decided once at render.
 *
 * Attributes are toggled on the existing nodes rather than re-rendering the
 * page: /p10 is where the filer is typing, and rebuilding the field under
 * them would move the caret and drop focus mid-word.
 */
function syncAttorneyEmailRequired(container) {
  const d = window.D;
  if (!container || !d) return;
  const required = isPlanInitialAttorneyStarted(d);
  // `input[...]`, not a bare attribute match: once this section reports
  // incomplete, the local-guidance panel renders a "jump to field" BUTTON
  // carrying the same data-field-path, and it appears above the card in DOM
  // order. Matching it would toggle aria-required on a link.
  const input = container.querySelector('input[data-field-path="attorney_email"]');
  if (input) {
    if (required) {
      input.setAttribute('data-field-required', 'true');
      input.setAttribute('aria-required', 'true');
    } else {
      input.removeAttribute('data-field-required');
      input.removeAttribute('aria-required');
    }
  }
  const label = container.querySelector('label[for="attorney_email"]');
  if (!label) return;
  const mark = label.querySelector('.req');
  if (required && !mark) {
    const span = document.createElement('span');
    span.className = 'req';
    span.textContent = '*';
    label.appendChild(span);
  } else if (!required && mark) {
    mark.remove();
  }
}

let _printModule = null;
let _printModulePromise = null;
function ensurePrintModule() {
  if (_printModule) return Promise.resolve();
  if (!_printModulePromise) {
    _printModulePromise = import('./print.js').then((mod) => {
      _printModule = mod;
      // Referenced by name from rendered onclick="..." HTML attributes
      // (doSavePdfPlanInitial), which only ever resolve against the global
      // scope, never a module's own scope, so it must be a real `window`
      // property. (The planReadinessChecksInitial bridge went with Milestone
      // 44C's shared readiness card.)
      window.doSavePdfPlanInitial = () => _printModule.doSavePdf();
    });
  }
  return _printModulePromise;
}

export async function mount(container, page) {
  let html;
  let isPrint = false;
  if (page === '/print') {
    await ensurePrintModule();
    html = _printModule.pagePrintPlanInitial();
    isPrint = true;
  } else {
    switch (page) {
      case '/':    html = pagePlanICover(); break;
      case '/summary': html = renderSummaryPage(getSummaryConfigPlanInitial()); break;
      case '/p2':  html = pagePlanISettingMedical(); break;
      case '/p3':  html = pagePlanIMentalPersonal(); break;
      case '/p4':  html = pagePlanISocialBenefits(); break;
      case '/p5':  html = pagePlanIProviders(); break;
      case '/p6':  html = pagePlanIADLs(); break;
      case '/p7':  html = pagePlanIDisabilities(); break;
      case '/p8':  html = pagePlanIDirectives(); break;
      case '/p9':  html = pagePlanISignatures(); break;
      case '/p10': html = pagePlanIAttorney(); break;
      default:     html = pagePlanICover();
    }
  }
  container.innerHTML = html;
  container.scrollTop = 0;
  signatureHandles.get(container)?.forEach((h) => h.destroy());
  signatureHandles.delete(container);
  if (page === '/p9' || page === '/p10') {
    signatureHandles.set(container, mountSignatureStateControls(container, {
      setImage: (imagePath, dataUrl) => window.setPath(window.D, imagePath, dataUrl),
      route: page,
    }));
  }
  attorneyMarkerAborts.get(container)?.abort();
  attorneyMarkerAborts.delete(container);
  if (page === '/p10') {
    // Milestone 58C: keep Primary Email's required marker in step with the
    // attorney block as it is filled in. The AbortController ends with the
    // page, so nothing dangles after dispose() -- the 40F/40H-A/43G bug class.
    const controller = new AbortController();
    attorneyMarkerAborts.set(container, controller);
    window.addEventListener('pg:field-written', (event) => {
      const path = event?.detail?.path;
      if (typeof path === 'string' && path.startsWith('attorney_')) syncAttorneyEmailRequired(container);
    }, { signal: controller.signal });
    syncAttorneyEmailRequired(container);
  }
  if (isPrint) await _printModule.mountPreview();
}

export function dispose(container) {
  signatureHandles.get(container)?.forEach((h) => h.destroy());
  signatureHandles.delete(container);
  attorneyMarkerAborts.get(container)?.abort();
  attorneyMarkerAborts.delete(container);
  container.replaceChildren();
}

export function mountNav(container) {
  buildNavPlanInitial(container);
}

function buildNavPlanInitial(container){
  const item=(route,nav,label)=>`<button class="nav-link-item" data-page="${route}" data-nav="${nav}" data-form-action="navigate" data-route="${route}">${label}</button>`;
  container.innerHTML=`
    <div class="nav-section">
      <div class="nav-section-label">Initial Guardianship Plan</div>
      ${item('/','pi-cover','Cover')}
      ${item('/summary','pi-summary','Summary')}
      ${item('/p2','pi-p2','2–3&nbsp;&nbsp;Setting &amp; Medical Care')}
      ${item('/p3','pi-p3','4–5&nbsp;&nbsp;Mental Health &amp; Personal Care')}
      ${item('/p4','pi-p4','6–7&nbsp;&nbsp;Socialization &amp; Benefits')}
      ${item('/p5','pi-p5','9&nbsp;&nbsp;Examining Providers')}
      ${item('/p6','pi-p6','10A&nbsp;&nbsp;Daily Living')}
      ${item('/p7','pi-p7','10B–D&nbsp;&nbsp;Disabilities &amp; Devices')}
      ${item('/p8','pi-p8','11&nbsp;&nbsp;Advance Directives')}
      ${item('/p9','pi-p9','Signatures')}
      ${item('/p10','pi-p10','Attorney Certification')}
    </div>
    <div class="nav-section">
      <div class="nav-section-label">Output</div>
      <button class="nav-link-item" data-page="/print" data-form-action="navigate" data-route="/print"><span class="nav-link-label">${ic('file',15)}&nbsp; Print Preview</span></button>
    </div>
  `;
}

function getSummaryConfigPlanInitial(){
  const d=window.D;
  const nav=window.computeNavChecks();
  return {
    formTitle:'Initial Guardianship Plan — Summary',
    infoRows:[
      {label:'Ward Name',value:esc(d.wardName)},
      {label:'Case Number',value:esc(d.caseNumber)},
      {label:'County',value:esc(d.county)},
      {label:'Inception Date',value:formatSummaryDate(d.inceptionDate)},
      {label:'Period',value:formatSummaryDate(d.periodFrom)+' – '+formatSummaryDate(d.periodTo)},
      {label:'Guardian',value:esc(d.guardianNames)},
      {label:'Attorney',value:esc(d.attorneyName)},
    ],
    leftCards:[
      {
        heading:'Section Completion',
        lines:[
          {label:'Cover',route:'/',status:navStatus(nav,'pi-cover')},
          {label:'2–3. Setting & Medical Care',route:'/p2',status:navStatus(nav,'pi-p2')},
          {label:'4–5. Mental Health & Personal Care',route:'/p3',status:navStatus(nav,'pi-p3')},
          {label:'6–7. Socialization & Benefits',route:'/p4',status:navStatus(nav,'pi-p4')},
          {label:'9. Examining Providers',route:'/p5',status:navStatus(nav,'pi-p5')},
        ],
      },
      {
        heading:'Assessments & Signatures',
        lines:[
          {label:'10A. Daily Living',route:'/p6',status:navStatus(nav,'pi-p6')},
          {label:'10B–D. Disabilities & Devices',route:'/p7',status:navStatus(nav,'pi-p7')},
          {label:'11. Advance Directives',route:'/p8',status:navStatus(nav,'pi-p8')},
          {label:'Signatures',route:'/p9',status:navStatus(nav,'pi-p9')},
          {label:'Attorney Certification',route:'/p10',status:navStatus(nav,'pi-p10')},
        ],
      },
    ],
    rightCards:[],
    banner:{title:'INITIAL GUARDIANSHIP PLAN',value:(d.wardName?esc(d.wardName):'Ward')+' — Case # '+(d.caseNumber?esc(d.caseNumber):'Pending')},
    nextRoute:'/p2',
  };
}

function pagePlanICover(){
  const d=window.D;
  return `<div class="schedule-page">
    <h1>Initial Guardianship Plan — Cover</h1>
    <div class="schedule-instructions">This report, with original signatures, is due within <strong>60 days</strong> after the Letters of Guardianship are signed, and remains in effect until amended or replaced by the approval of an Annual Guardianship Plan.</div>
    <div class="row g-3 mb-3 cover-info-row">
      <div class="col-md-6">
        <div class="summary-box">
          <h2 class="subsection-heading">Ward &amp; Case Information</h2>
          <div class="row g-2">
            ${renderWardIdentityFields({ wardName: d.wardName, wardNameRequired: true })}
            ${renderCaseCaptionFields({ caseNumber: d.caseNumber, county: d.county })}
            <div class="col-12">${renderSelectField({path:'successorGuardianship',label:'Successor Guardianship? (if applicable)',value:d.successorGuardianship,options:optionsWithLegacyValue(GUARDIANSHIP_LIFECYCLE_OPTIONS,d.successorGuardianship)})}</div>
            <div class="col-md-6">${inpS('inceptionDate','Guardianship Inception Date',d.inceptionDate,true,'date')}</div>
            <div class="col-md-6">${inpS('lettersSignedDate','Date Letters Were Signed',d.lettersSignedDate,true,'date')}</div>
            ${renderReportingPeriodFields({ periodFrom: d.periodFrom, periodTo: d.periodTo, fromLabel: 'For the Period From', toLabel: 'Through', required: false })}
          </div>
        </div>
      </div>
      <div class="col-md-6">
        <div class="summary-box">
          <h2 class="subsection-heading">Guardian, Attorney &amp; Residence</h2>
          <div class="row g-2">
            <div class="col-12">${inpS('guardianNames','Guardian Name(s)',d.guardianNames,true)}</div>
            <div class="col-12">${inpS('attorneyName','Attorney Name',d.attorneyName)}</div>
            ${renderResidenceFields({
              wardLiving: d.wardLiving,
              wardLivingOptions: [
                'In a private residence leased or owned by them (house, condo or apartment)',
                'In a private residence not leased or owned by them (such as family member)',
                'In a facility (Skilled Nursing, Assisted Living, etc.)'],
              residenceAddress: d.residenceAddress,
              residenceAddressLabel: 'Address Where Ward Is Currently Residing',
              residenceCityStateZip: d.residenceCityStateZip,
              residencePhone: d.residencePhone,
              mailingAddress: d.mailingAddress,
              mailingAddressLabel: 'Mailing Address for Ward (if different from above)',
              mailingCityStateZip: d.mailingCityStateZip,
            })}
          </div>
        </div>
      </div>
    </div>
    ${txtP('q1PreexistingDirectives','List any preexisting orders not to resuscitate or preexisting advance directives, the date signed, whether suspended by the court, and the steps taken to identify and locate them. Attach a copy of any directives to the plan.',d.q1PreexistingDirectives,5)}
    ${renderScheduleDocsSection('planICover')}
    ${pageNavS(null,'/summary')}
  </div>`;
}

function pagePlanISettingMedical(){
  const d=window.D;
  const cb=(id,label)=>chkP(id,label,d[id]);
  return `<div class="schedule-page">
    <h1>2–3. Residential Setting &amp; Medical Services</h1>
    ${planQ('2','The guardian states the place and kind of residential setting best suited for the needs of the Ward is:',
      radioP('q2Setting','',d.q2Setting,['Assisted Living (ALF)','Group Home','Intermediate','Private Residence','Skilled Nursing','Specialized','State Hospital','Other'])
      +(d.q2Setting==='Other'?`<div class="plan-conditional mt-2">${txtP('q2Explain','Explanation',d.q2Explain,3)}</div>`:''))}
    ${planQ('3','For the plan period, the guardian proposes the following as to the provision of medical services for the Ward:',
      planCheckGroup('',
        cb('q3MedPrimary','Routine examination by primary care physician')
        +cb('q3MedDentist','Routine examination by dentist')
        +cb('q3MedOphthalmologist','Routine examination by Ophthalmologist')
        +cb('q3MedSpecialist','Routine examination by Specialist')
        +cb('q3MedPT','Physical Therapy')
        +cb('q3MedST','Speech Therapy')
        +cb('q3MedOT','Occupational Therapy')
        +cb('q3MedWardDecides','The ward retains the right to make their own decision')
        +cb('q3MedOther','Other'),
        'q3MedExplain',d.q3MedExplain,d.q3MedOther)
      +(d.q3MedSpecialist?`<div class="plan-conditional mt-2">${inpS('q3MedSpecialistArea','Specialist — area of specialty',d.q3MedSpecialistArea)}</div>`:''))}
    ${renderScheduleDocsSection('planISettingMedical')}
    ${pageNavS('/summary','/p3')}
  </div>`;
}

function pagePlanIMentalPersonal(){
  const d=window.D;
  return `<div class="schedule-page">
    <h1>4–5. Mental Health &amp; Personal Care</h1>
    ${planQ('4','For the plan period, the guardian proposes the following as to the provision of mental health services for the Ward:',
      radioP('q4Mental','',d.q4Mental,['Routine examination by Psychiatrist/Psychologist','Ongoing Treatment Outpatient','Ongoing Treatment Inpatient','None','Other'])
      +((d.q4Mental==='Other'||d.q4Mental==='None')?`<div class="plan-conditional mt-2">${txtP('q4Explain','Explanation',d.q4Explain,3)}</div>`:''))}
    ${planQ('5','For the plan period, the guardian proposes the following as to the provision of personal care of the ward, such as bathing, grooming and feeding:',
      radioP('q5Personal','',d.q5Personal,['Care Facility','Nurses and Aides','Family and Friends','Other'])
      +(d.q5Personal==='Other'?`<div class="plan-conditional mt-2">${txtP('q5Explain','Explanation',d.q5Explain,3)}</div>`:''))}
    ${renderScheduleDocsSection('planIMentalPersonal')}
    ${pageNavS('/p2','/p4')}
  </div>`;
}

function pagePlanISocialBenefits(){
  const d=window.D;
  const cb=(id,label)=>chkP(id,label,d[id]);
  return `<div class="schedule-page">
    <h1>6–7. Socialization &amp; Benefits</h1>
    ${planQ('6','For the plan period, the guardian proposes the following to provide for socialization and/or recreational services for the Ward (e.g.: arranging friends and family to visit, encourage participation in facility or day program activities):',
      planCheckGroup('',
        cb('q6CareFacility','Care Facility')
        +cb('q6NursesAides','Nurses and Aides')
        +cb('q6FamilyFriends','Family and Friends')
        +cb('q6DayProgram','Day Program')
        +cb('q6WardDecides','The Ward retains the right to make their own decision')
        +cb('q6Other','Other'),
        'q6Explain',d.q6Explain,d.q6Other))}
    ${planQ('7','The Ward has the following health insurance, accident insurance, private benefits, or governmental benefits received to meet any part of the costs of medical, mental health or related services:',
      planCheckGroup('',
        yesNoCheckboxS('q7SocialSecurity','Social Security',d.q7SocialSecurity)
        +yesNoCheckboxS('q7Ssdi','Social Security Disability Income (SSDI)',d.q7Ssdi)
        +yesNoCheckboxS('q7Hmo','Health Maintenance Organization (HMO)',d.q7Hmo)
        +yesNoCheckboxS('q7Ssi','Supplemental Security Income (SSI)',d.q7Ssi)
        +yesNoCheckboxS('q7StateSupplement','Optional State Supplement',d.q7StateSupplement)
        +yesNoCheckboxS('q7InstitutionalCare','Institutional Care Program',d.q7InstitutionalCare)
        +yesNoCheckboxS('q7SupplementalIns','Supplemental Insurance',d.q7SupplementalIns)
        +yesNoCheckboxS('q7Pension','Pension',d.q7Pension)
        +yesNoCheckboxS('q7Medicare','Medicare',d.q7Medicare)
        +yesNoCheckboxS('q7Medicaid','Medicaid',d.q7Medicaid)
        +yesNoCheckboxS('q7Va','VA',d.q7Va)
        +yesNoCheckboxS('q7Trusts','Trusts (explain type and how it covers costs below)',d.q7Trusts)
        +yesNoCheckboxS('q7PendingBenefits','Pending Benefits (explain why not yet receiving, or date applied, below)',d.q7PendingBenefits)
        +cb('q7Other','Other'),
        // Milestone 40C-H: same predicate as validatePlanInitial() and
        // computeNavChecks() so all three agree. This one was already correct;
        // it is the reference the other two were brought in line with.
        'q7Explain',d.q7Explain,(isAffirmative(d.q7Trusts)||isAffirmative(d.q7PendingBenefits)||!!d.q7Other),
        'If Trusts or Pending Benefits is Yes, explain below.'))}
    ${renderScheduleDocsSection('planISocialBenefits')}
    ${pageNavS('/p3','/p5')}
  </div>`;
}

function pagePlanIProviders(){
  const d=window.D;
  const rows=(d.q9Providers||[]).map((r,i)=>{
    return `<div class="col-12 col-lg-6"><div class="entry-card mb-2">
      <div class="entry-card-header">
        <span>Provider ${i+1}</span>
        <span class="entry-card-actions">
          <button class="btn btn-sm btn-outline-secondary ms-auto" title="Add a copy of this row below" data-form-action="duplicate-plan-row" data-collection="q9Providers" data-index="${i}" data-route="/p5">${ic('copy',13)}</button>
          <button class="btn btn-sm btn-outline-danger" data-form-action="remove-plan-row" data-collection="q9Providers" data-index="${i}" data-route="/p5">✕ Remove</button>
        </span>
      </div>
      <div class="entry-card-body"><div class="row g-2">
        <div class="col-md-6"><label class="form-label">Provider's first name, last name, and middle initial<span class="req">*</span></label><input type="text" class="form-control" value="${esc(r.name||'')}" data-form-path="q9Providers.${i}.name" data-field-path="q9Providers.${i}.name"></div>
        <div class="col-md-3"><label class="form-label">Type of Provider</label><input type="text" class="form-control" value="${esc(r.providerType||'')}" data-form-path="q9Providers.${i}.providerType" data-field-path="q9Providers.${i}.providerType"></div>
        <div class="col-md-3"><label class="form-label" for="q9_prov_${i}_date">Approximate Date of Exam</label><input type="text" inputmode="text" class="form-control" id="q9_prov_${i}_date" placeholder="MM/DD/YYYY" value="${esc(formatDisplayDate(r.examDate||''))}" data-form-path="q9Providers.${i}.examDate" data-field-path="q9Providers.${i}.examDate" data-field-kind="date" data-field-format-policy="normalize" aria-describedby="q9_prov_${i}_date_hint"><div id="q9_prov_${i}_date_hint" class="form-text text-muted" style="font-size:0.75rem;margin-top:0.2rem;">Use MM/DD/YYYY</div></div>
        <div class="col-md-6"><label class="form-label">Street Address</label><input type="text" class="form-control" value="${esc(r.street||'')}" data-form-path="q9Providers.${i}.street" data-field-path="q9Providers.${i}.street"></div>
        <div class="col-md-6"><label class="form-label">City, State and Zip Code</label><input type="text" class="form-control" value="${esc(r.cityStateZip||'')}" data-form-path="q9Providers.${i}.cityStateZip" data-field-path="q9Providers.${i}.cityStateZip"></div>
        <div class="col-md-4"><label class="form-label">Phone Number</label><input type="text" class="form-control" value="${esc(r.phone||'')}" data-form-path="q9Providers.${i}.phone" data-field-path="q9Providers.${i}.phone" data-form-format="phone"></div>
      </div></div>
    </div></div>`;
  }).join('');
  return `<div class="schedule-page">
    <h1>9. Examinations to Determine Treatment Needs</h1>
    <div class="schedule-instructions">List every physical and/or mental examination the guardian will secure or has secured to determine the Ward's medical and mental health treatment needs.</div>
    ${rows?`<div class="row g-3 schedule-entry-grid">${rows}</div>`:`<div class="schedule-empty">${ic('folder',17)}<span>No providers listed yet.</span></div>`}
    <button class="btn btn-outline-primary btn-sm mb-2" data-form-action="add-plan-row" data-collection="q9Providers" data-row-type="initialProvider" data-route="/p5">+ Add Provider</button>
    ${renderScheduleDocsSection('planIProviders')}
    ${pageNavS('/p4','/p6')}
  </div>`;
}

function pagePlanIADLs(){
  const d=window.D;
  const adls=d.adls||{};
  const ratings=INITIAL_ADL_RATINGS.slice(1);
  const rows=INITIAL_ADLS.map(([k,label])=>{
    const btns=ratings.map((o,i)=>`
      <div class="form-check form-check-inline">
        <input class="form-check-input" type="radio" name="radio_adl_${k}" id="adl_${k}_${i}" value="${esc(o)}" ${adls[k]===o?'checked':''} data-form-path="adls.${k}">
        <label class="form-check-label" for="adl_${k}_${i}">${esc(o)}</label>
      </div>`).join('');
    return `<tr><td>${esc(label)}</td><td><div class="plan-radio-row">${btns}</div></td></tr>`;
  }).join('');
  return `<div class="schedule-page">
    <h1>10A. Activities of Daily Living</h1>
    <div class="schedule-instructions">To assist the Court with review of the initial plan, rate the ability of the Ward to engage in each activity of daily living honestly — these ratings become the baseline that future Annual Plans are compared against.</div>
    <div class="table-responsive"><table class="table plan-adl-table"><thead><tr><th style="width:45%;">Activity</th><th>Rating</th></tr></thead><tbody>${rows}</tbody></table></div>
    ${renderScheduleDocsSection('planIADLs')}
    ${pageNavS('/p5','/p7')}
  </div>`;
}

function pagePlanIDisabilities(){
  const d=window.D;
  const cb=(id,label)=>chkP(id,label,d[id]);
  return `<div class="schedule-page">
    <h1>10B–D. Disabilities &amp; Assistive Devices</h1>
    ${planQ('B','The mental disabilities of the Ward are:',
      planCheckGroup('',
        cb('mentalAlzheimers',"Alzheimer's type of dementia")
        +cb('mentalAutism','Autism Spectrum Disorders')
        +cb('mentalClosedHeadInjury','Closed Head Injury')
        +cb('mentalDementia','Dementia')
        +cb('mentalDepression','Depression')
        +cb('mentalDevelopmental','Developmental Disabilities')
        +cb('mentalSubstance','Induced by substance abuse')
        +cb('mentalSchizophrenia','Schizophrenia or related disorders')
        +cb('mentalOther','Other'),
        'mentalExplain',d.mentalExplain,d.mentalOther))}
    ${planQ('C','The physical disabilities of the Ward are:',
      planCheckGroup('',
        cb('physMobility','Mobility')
        +cb('physBlindness','Blindness')
        +cb('physDeafness','Deafness')
        +cb('physDiabetic','Diabetic')
        +cb('physParkinsons',"Parkinson's disease")
        +cb('physArthritis','Severe arthritis')
        +cb('physOther','Other'),
        'physExplain',d.physExplain,d.physOther))}
    ${planQ('D','The assistive devices currently used by the Ward are:',
      planCheckGroup('',
        cb('usesDentures','Dentures')
        +cb('usesHearingAid','Hearing Aid')
        +cb('usesWheelchair','Wheelchair')
        +cb('usesWalker','Walker/Cane')
        +cb('usesCrutches','Crutches')
        +cb('usesProsthetics','Prosthetics')
        +cb('usesGlasses','Glasses')
        +cb('usesNone','None')
        +cb('usesOther','Other'),
        'usesExplain',d.usesExplain,d.usesOther))}
    ${renderScheduleDocsSection('planIDisabilities')}
    ${pageNavS('/p6','/p8')}
  </div>`;
}

function pagePlanIDirectives(){
  const d=window.D;
  const cb=(id,label)=>chkP(id,label,d[id]);
  const dirs=(d.q11Directives||[]).map((r,i)=>{
    return `<div class="col-12"><div class="entry-card mb-2">
      <div class="entry-card-header">
        <span>Advance Directive ${i+1}</span>
        <span class="entry-card-actions">
          <button class="btn btn-sm btn-outline-danger ms-auto" data-form-action="remove-plan-row" data-collection="q11Directives" data-index="${i}" data-route="/p8">✕ Remove</button>
        </span>
      </div>
      <div class="entry-card-body"><div class="row g-2">
        <div class="col-md-6"><label class="form-label">Title of the order or directive</label><input type="text" class="form-control" value="${esc(r.title||'')}" data-form-path="q11Directives.${i}.title" data-field-path="q11Directives.${i}.title"></div>
        <div class="col-md-6"><label class="form-label" for="q11_dir_${i}_dateSigned">Date executed/signed</label><input type="text" inputmode="text" class="form-control" id="q11_dir_${i}_dateSigned" placeholder="MM/DD/YYYY" value="${esc(formatDisplayDate(r.dateSigned||''))}" data-form-path="q11Directives.${i}.dateSigned" data-field-path="q11Directives.${i}.dateSigned" data-field-kind="date" data-field-format-policy="normalize" aria-describedby="q11_dir_${i}_dateSigned_hint"><div id="q11_dir_${i}_dateSigned_hint" class="form-text text-muted" style="font-size:0.75rem;margin-top:0.2rem;">Use MM/DD/YYYY</div></div>
        <div class="col-md-6"><label class="form-label label-2line-reserve">Name of person who signed</label><input type="text" class="form-control" value="${esc(r.signedBy||'')}" data-form-path="q11Directives.${i}.signedBy" data-field-path="q11Directives.${i}.signedBy"></div>
        <div class="col-md-6"><label class="form-label label-2line-reserve">Relationship of Agent(s)/Surrogate(s) to the Ward</label><input type="text" class="form-control" value="${esc(r.relationship||'')}" data-form-path="q11Directives.${i}.relationship" data-field-path="q11Directives.${i}.relationship"></div>
        <div class="col-md-6"><label class="form-label">Name of Designated Agent(s) or Surrogate(s)</label><input type="text" class="form-control" value="${esc(r.agents||'')}" data-form-path="q11Directives.${i}.agents" data-field-path="q11Directives.${i}.agents"></div>
        <div class="col-md-6"><label class="form-label">Name of any Alternate Agent(s) or Surrogate(s)</label><input type="text" class="form-control" value="${esc(r.alternates||'')}" data-form-path="q11Directives.${i}.alternates" data-field-path="q11Directives.${i}.alternates"></div>
        <div class="col-md-6"><label class="form-label">Contact information for Agent(s)/Surrogate(s)</label><input type="text" class="form-control" value="${esc(r.contact||'')}" data-form-path="q11Directives.${i}.contact" data-field-path="q11Directives.${i}.contact"></div>
        <div class="col-md-6">${yesNoCheckboxS(`q11dir_${i}_revoked`,'Has a Court suspended or revoked the Order/Directive?',r.courtRevoked,false,'/p8')}</div>
        <div class="col-md-6"><label class="form-label" for="q11_dir_${i}_orderDate">Date of Order</label><input type="text" inputmode="text" class="form-control" id="q11_dir_${i}_orderDate" placeholder="MM/DD/YYYY" value="${esc(formatDisplayDate(r.orderDate||''))}" data-form-path="q11Directives.${i}.orderDate" data-field-path="q11Directives.${i}.orderDate" data-field-kind="date" data-field-format-policy="normalize" aria-describedby="q11_dir_${i}_orderDate_hint"><div id="q11_dir_${i}_orderDate_hint" class="form-text text-muted" style="font-size:0.75rem;margin-top:0.2rem;">Use MM/DD/YYYY</div></div>
        <div class="col-md-6"><label class="form-label">County/State entered</label><input type="text" class="form-control" value="${esc(r.orderCounty||'')}" data-form-path="q11Directives.${i}.orderCounty" data-field-path="q11Directives.${i}.orderCounty"></div>
      </div></div>
    </div></div>`;
  }).join('');
  return `<div class="schedule-page">
    <h1>11. Advance Directives</h1>
    ${planQ('11a','There are NO pre-existing orders Not To Resuscitate ("DNR") or any other advance directive, and I have taken the following steps to verify there are none:',
      chkP('q11NoDirectives','There are no pre-existing orders or advance directives',d.q11NoDirectives)
      +planCheckGroup('',
        cb('q11StepResidence',"Search of ward's prior and current residence")
        +cb('q11StepSafeDeposit',"Inventory of ward's safe deposit box")
        +cb('q11StepInterviewed','Interviewed family and friends')
        +cb('q11StepMedicalProviders',"Requested documents from the ward's medical providers")
        +cb('q11StepAttorney',"Requested documents from the ward's attorney"),
        null,null,false))}
    ${planQ('11b','The ward executed the following advance directives:',
      // Milestone 37-4: a plain chkP() checkbox doesn't re-render this page
      // on change (no data-form-route), which is fine for most checkboxes
      // here but not this one -- the type controls, cards, and Add Directive
      // button below only exist in the DOM once q11Executed is true, so
      // checking it must force a fresh render to reveal them. data-form-
      // change="ensure-directive-row" also gives an empty collection exactly
      // one blank card immediately (src/form-events.js), matching the UX
      // before this collection stopped being pre-seeded.
      `<div class="form-check plan-check">
        <input class="form-check-input" type="checkbox" id="q11Executed" ${d.q11Executed?'checked':''} data-form-path="q11Executed" data-form-value="boolean" data-form-route="/p8" data-form-change="ensure-directive-row" data-collection="q11Directives">
        <label class="form-check-label" for="q11Executed">The ward executed advance directives (complete below)</label>
      </div>`
      +(d.q11Executed?planCheckGroup('',
        cb('q11ExecDNR','Order Not to Resuscitate, F.S. 401.45(3) ("DNR")')
        +cb('q11ExecHealthcare','Advance Directive for Healthcare (healthcare surrogate, living will, or anatomical gift)')
        +cb('q11ExecPOA','Durable Power of Attorney, F.S. Chapter 709')
        +cb('q11ExecOther','Other'),
        'q11ExecOtherText',d.q11ExecOtherText,d.q11ExecOther,'Describe the "Other" directive.')
      +(dirs?`<div class="row g-3 schedule-entry-grid">${dirs}</div>`:'')
      +`<button class="btn btn-outline-primary btn-sm mt-2" data-form-action="add-plan-row" data-collection="q11Directives" data-row-type="directive" data-route="/p8">+ Add Directive</button>`
      :''))}
    ${planQ('E','The assistive devices needed by the Ward (devices needed but not currently owned) are:',
      planCheckGroup('',
        cb('needsDentures','Dentures')
        +cb('needsHearingAid','Hearing Aid')
        +cb('needsWheelchair','Wheelchair')
        +cb('needsWalker','Walker/Cane')
        +cb('needsCrutches','Crutches')
        +cb('needsProsthetics','Prosthetics')
        +cb('needsGlasses','Glasses')
        +cb('needsNone','None')
        +cb('needsOther','Other'),
        'needsExplain',d.needsExplain,d.needsOther))}
    ${planQ('F','Are the recommendations of the examining committee incorporated into this plan?',
      yesNoCheckboxS('committeeIncorporated','Recommendations of the examining committee are incorporated into this plan',d.committeeIncorporated,false,'/p8')
      +(d.committeeIncorporated==='No'?`<div class="plan-conditional mt-2">${txtP('committeeExplain','Explanation',d.committeeExplain,3)}</div>`:''))}
    ${renderScheduleDocsSection('planIDirectives')}
    ${pageNavS('/p7','/p9')}
  </div>`;
}

function pagePlanISignatures(){
  const d=window.D;
  const cb=(id,label)=>chkP(id,label,d[id]);
  const g=(i,title)=>{
    const gd=(d.planGuardians||[])[i]||{};
    return `<div class="col-12 col-lg-6"><div class="entry-card mb-0 h-100">
      <div class="entry-card-header d-flex justify-content-between align-items-center gap-2">
        <span>${title}</span>
        <span class="d-flex gap-2"><button type="button" class="btn btn-outline-secondary btn-sm" data-form-action="link-party" data-role="guardian" data-index="${i}">Link Person</button>${i?`<button type="button" class="btn btn-outline-danger btn-sm" data-form-action="remove-plan-guardian" data-index="${i}" data-route="/p9">Remove</button>`:''}</span>
      </div>
      <div class="entry-card-body">
        <div class="row g-2">
          ${renderPartyNameField({ pathPrefix: `planGuardians.${i}`, name: gd.name, required: i===0, label: 'Name' })}
          <div class="col-12">${renderFormField({ path: `planGuardians.${i}.relationship`, label: 'Relationship to Ward', value: gd.relationship })}</div>
          <div class="col-md-6">${renderFormField({ path: `planGuardians.${i}.ssn`, label: 'SSN/EIN', value: gd.ssn })}</div>
          <div class="col-md-6">${renderFormField({ path: `planGuardians.${i}.phone`, label: 'Phone Number', value: gd.phone })}</div>
          <div class="col-12"><label class="form-label" for="plan_guardians_${i}_sigDate">Date Signed</label><input type="text" inputmode="text" class="form-control" id="plan_guardians_${i}_sigDate" placeholder="MM/DD/YYYY" value="${esc(formatDisplayDate(gd.signatureDate||''))}" data-form-path="planGuardians.${i}.signatureDate" data-field-path="planGuardians.${i}.signatureDate" data-field-kind="date" data-field-format-policy="normalize" aria-describedby="plan_guardians_${i}_sigDate_hint"><div id="plan_guardians_${i}_sigDate_hint" class="form-text text-muted" style="font-size:0.75rem;margin-top:0.2rem;">Use MM/DD/YYYY</div></div>
          <div class="col-12">${renderSignatureStateControl({ path: `planGuardians.${i}`, state: inferLegacySignatureState(gd.signatureState, gd.signatureDate), route: '/p9', signatureImage: gd.signatureImage })}</div>
          <div class="col-12">${renderFormField({ path: `planGuardians.${i}.street`, label: 'Street Address', value: gd.street })}</div>
          <div class="col-12">${renderFormField({ path: `planGuardians.${i}.cityStateZip`, label: 'City/State/Zip', value: gd.cityStateZip })}</div>
        </div>
      </div>
    </div></div>`;
  };
  return `<div class="schedule-page">
    <h1>Certification and Signature of Guardian(s)</h1>
  ${preparerNoteHTML()}
    <div class="schedule-instructions">If the Ward's ability to exercise rights has changed since the Order Determining Capacity and Appointing Guardian, the guardian must file a Petition to Remove or Petition to Restore Rights, as appropriate.</div>
    ${planCheckGroup('Check all that apply:',
      cb('certIncapacitatedNoCopy','The Ward was declared totally incapacitated and has not been given a copy of this plan')
      +cb('certMinorNoCopy','The Ward is a minor under the age of 14 and has not been given a copy of this plan')
      +cb('certConsulted',"The guardian has consulted with the Ward, to the extent reasonable, has honored the Ward's wishes, and to the maximum extent possible the plan is in accordance with the Ward's wishes or consistent with the rights retained by the Ward")
      +cb('certRecognizeRights','In exercising his or her powers, the guardian shall recognize any rights retained by the ward (F.S. 744.363(6))')
      +cb('certNoRestriction','The plan does not restrict the physical liberty of the Ward except as necessary to protect the Ward and others from serious physical injury, illness, or disease')
      +cb('certProvidesCare',"The plan provides for the Ward's medical care and mental health treatment"),
      null,null,false)}
    <p class="mt-2 mb-3" style="font-size:.85rem;color:var(--ink-3);">Under penalties of perjury, each signing guardian declares they have read and examined the foregoing plan, and the facts alleged are true, to the best of their knowledge and belief.</p>
    <div class="row g-3 card-grid-2col mb-4">
      ${window.normalizePlanGuardians(d).map((_,i)=>g(i,i?'Co-Guardian':'Guardian')).join('')}
    </div>
    ${(d.planGuardians||[]).length<4?'<button type="button" class="btn btn-outline-secondary btn-sm mb-3 no-print" data-form-action="add-plan-guardian" data-route="/p9">+ Add Co-Guardian</button>':''}
    <div class="schedule-instructions mt-2">All guardians of the person must sign and provide their most current address, telephone number, and SSN. Only reports with original signatures will be audited by the Clerk of the Court.</div>
    ${renderScheduleDocsSection('planISignatures')}
    ${pageNavS('/p8','/p10')}
  </div>`;
}

function pagePlanIAttorney(){
  const d=window.D;
  return `<div class="schedule-page">
    <h1>Certification and Signature of Guardian's Attorney</h1>
  ${preparerNoteHTML()}
    <div class="schedule-instructions">The undersigned notifies the Court of the filing of the initial guardianship plan for the stated period. This is the representation of the guardian; the attorney has not audited the accompanying plan, but represents that they have examined its contents and that it conforms to the requirements of Florida Guardianship Law and the standards for plans in the selected county.</div>
    <div class="row g-3 card-grid-2col mb-3">
      <div class="col-12 col-lg-6">
        <div class="entry-card mb-0 h-100">
          <div class="entry-card-header">Attorney Certification</div>
          <div class="entry-card-body">
            <div class="row g-2">
              <div class="col-md-7">${inpS('attorney_name','Attorney Name',d.attorney_name)}</div>
              <div class="col-md-5">${inpS('attorney_bar','Attorney Bar Number',d.attorney_bar)}</div>
              <div class="col-12">${inpS('attorney_email','Primary Email (e-filing)',d.attorney_email,isPlanInitialAttorneyStarted(d),'email')}</div>
              <div class="col-12">${inpS('attorney_secondaryEmail','Secondary Email (optional)',d.attorney_secondaryEmail,false,'email')}</div>
              <div class="col-12">${inpS('attorney_street','Attorney Address',d.attorney_street)}</div>
              <div class="col-12">${inpS('attorney_cityStateZip','Attorney City/State/Zip',d.attorney_cityStateZip)}</div>
              <div class="col-md-6">${inpS('attorney_phone','Attorney Phone Number',d.attorney_phone)}</div>
              <div class="col-md-6">${inpS('attorney_signatureDate','Date Signed',d.attorney_signatureDate,false,'date')}</div>
              <div class="col-12">${renderSignatureStateControl({ path: 'attorney', state: inferLegacySignatureState(d.attorney_signatureState, d.attorney_signatureDate), route: '/p10', signatureImage: d.attorney_signatureImage, statePath: 'attorney_signatureState', imagePath: 'attorney_signatureImage' })}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
    ${renderScheduleDocsSection('planIAttorney')}
    ${pageNavS('/p9','/print')}
  </div>`;
}

// Milestone 42F: every issue states its own field path (validation-issue.js).
export function validatePlanInitial(){
  const d=window.D;
  const errs=[];
  const T='planInitial';
  const issue=issueFactory(T);
  const req=(v,label,path)=>{if(v===''||v===null||v===undefined)errs.push(issue(label,path));};
  req(d.wardName,'Cover — Name of Ward is required','wardName');
  req(d.caseNumber,'Cover — Case Number is required','caseNumber');
  req(d.county,'Cover — County is required','county');
  req(d.inceptionDate,'Cover — Guardianship Inception Date is required','inceptionDate');
  req(d.lettersSignedDate,'Cover — Date Letters Were Signed is required','lettersSignedDate');
  req(d.guardianNames,'Cover — Guardian Name(s) is required','guardianNames');
  req(d.wardLiving,'Cover — Where the ward is living is required','wardLiving');
  req(d.residenceAddress,'Cover — Address where ward resides is required','residenceAddress');
  req(d.residenceCityStateZip,'Cover — City/State/ZIP is required','residenceCityStateZip');

  req(d.q2Setting,'2–3. Setting & Medical Care — Best-suited residential setting is required','q2Setting');
  if(d.q2Setting==='Other')req(d.q2Explain,'2–3. Setting & Medical Care — Explanation for "Other" residential setting is required','q2Explain');
  const anyMed=d.q3MedPrimary||d.q3MedDentist||d.q3MedOphthalmologist||d.q3MedSpecialist||d.q3MedPT||d.q3MedST||d.q3MedOT||d.q3MedWardDecides||d.q3MedOther;
  if(!anyMed)errs.push(issue('2–3. Setting & Medical Care — At least one medical service option is required','q3MedPrimary'));
  if(d.q3MedSpecialist)req(d.q3MedSpecialistArea,'2–3. Setting & Medical Care — Specialist area of specialty is required','q3MedSpecialistArea');
  if(d.q3MedOther)req(d.q3MedExplain,'2–3. Setting & Medical Care — Explanation for "Other" medical service is required','q3MedExplain');

  req(d.q4Mental,'4–5. Mental Health & Personal Care — Mental health service provision is required','q4Mental');
  if(d.q4Mental==='Other'||d.q4Mental==='None')req(d.q4Explain,'4–5. Mental Health & Personal Care — Explanation is required','q4Explain');
  req(d.q5Personal,'4–5. Mental Health & Personal Care — Personal care provision is required','q5Personal');
  if(d.q5Personal==='Other')req(d.q5Explain,'4–5. Mental Health & Personal Care — Explanation for "Other" personal care is required','q5Explain');

  const anySocial=d.q6CareFacility||d.q6NursesAides||d.q6FamilyFriends||d.q6DayProgram||d.q6WardDecides||d.q6Other;
  if(!anySocial)errs.push(issue('6–7. Socialization & Benefits — At least one socialization/recreation option is required','q6CareFacility'));
  if(d.q6Other)req(d.q6Explain,'6–7. Socialization & Benefits — Explanation for "Other" socialization is required','q6Explain');
  // Milestone 40C-H: was `if(d.q7Trusts||d.q7PendingBenefits||d.q7Other)`.
  // Those first two are tri-state ('', 'Yes', 'No'), so the non-empty string
  // 'No' is truthy -- a filer who answered No to both was still required to
  // explain, blocking an otherwise complete filing. Unanswered stays
  // unanswered; this never treats a blank as No.
  if(isAffirmative(d.q7Trusts)||isAffirmative(d.q7PendingBenefits)||d.q7Other)req(d.q7Explain,'6–7. Socialization & Benefits — Explanation is required for Trusts, Pending Benefits, or Other','q7Explain');

  const q9provs=(d.q9Providers||[]).filter(r=>r&&r.name);
  if(!q9provs.length)errs.push(issue('9. Examining Providers — At least one provider must be listed','q9Providers.0.name'));
  (d.q9Providers||[]).forEach((r,i)=>{
    // Milestone 61B: was a hand-written field list that the next field
    // added to this row would not have been added to. The q9provs check
    // above still asks for one *named* provider; this asks whether the
    // filer started a row at all.
    if(rowStarted(r)&&!r.name)
      errs.push(issue(`9. Examining Providers — Row ${i+1}: Provider name is required`,`q9Providers.${i}.name`));
  });

  const missingAdlKeys=INITIAL_ADLS.filter(([k])=>!d.adls||!d.adls[k]).map(([k])=>k);
  if(missingAdlKeys.length>0)errs.push(issue(`10A. Daily Living — ${missingAdlKeys.length} of ${INITIAL_ADLS.length} activities not yet rated`,`adls.${missingAdlKeys[0]}`));

  const anyMental=d.mentalAlzheimers||d.mentalAutism||d.mentalClosedHeadInjury||d.mentalDementia||d.mentalDepression||d.mentalDevelopmental||d.mentalSubstance||d.mentalSchizophrenia||d.mentalOther;
  if(!anyMental)errs.push(issue('10B–D. Disabilities & Devices — At least one mental disability option is required (or note none apply)','mentalAlzheimers'));
  if(d.mentalOther)req(d.mentalExplain,'10B–D. Disabilities & Devices — Explanation for "Other" mental disability is required','mentalExplain');
  const anyPhys=d.physMobility||d.physBlindness||d.physDeafness||d.physDiabetic||d.physParkinsons||d.physArthritis||d.physOther;
  if(!anyPhys)errs.push(issue('10B–D. Disabilities & Devices — At least one physical disability option is required (or note none apply)','physMobility'));
  if(d.physOther)req(d.physExplain,'10B–D. Disabilities & Devices — Explanation for "Other" physical disability is required','physExplain');
  const anyUses=d.usesDentures||d.usesHearingAid||d.usesWheelchair||d.usesWalker||d.usesCrutches||d.usesProsthetics||d.usesGlasses||d.usesNone||d.usesOther;
  if(!anyUses)errs.push(issue('10B–D. Disabilities & Devices — Assistive devices currently used is required (or select None)','usesDentures'));
  if(d.usesOther)req(d.usesExplain,'10B–D. Disabilities & Devices — Explanation for "Other" device currently used is required','usesExplain');

  if(!!d.q11NoDirectives===!!d.q11Executed)errs.push(issue('11. Advance Directives — Select exactly one: no pre-existing directives, or directives were executed','q11NoDirectives'));
  if(d.q11ExecOther)req(d.q11ExecOtherText,'11. Advance Directives — Description of "Other" advance directive is required','q11ExecOtherText');
  const anyNeeds=d.needsDentures||d.needsHearingAid||d.needsWheelchair||d.needsWalker||d.needsCrutches||d.needsProsthetics||d.needsGlasses||d.needsNone||d.needsOther;
  if(!anyNeeds)errs.push(issue('11. Advance Directives — Assistive devices needed is required (or select None)','needsDentures'));
  if(d.needsOther)req(d.needsExplain,'11. Advance Directives — Explanation for "Other" device needed is required','needsExplain');
  req(d.committeeIncorporated,'11. Advance Directives — Whether examining-committee recommendations are incorporated is required','committeeIncorporated');
  if(d.committeeIncorporated==='No')req(d.committeeExplain,'11. Advance Directives — Explanation is required when recommendations are not incorporated','committeeExplain');

  const anyCert=d.certIncapacitatedNoCopy||d.certMinorNoCopy||d.certConsulted||d.certRecognizeRights||d.certNoRestriction||d.certProvidesCare;
  if(!anyCert)errs.push(issue('Signatures — At least one certification statement must be checked','certIncapacitatedNoCopy'));
  const g0=(d.planGuardians||[])[0]||{};
  req(g0.name,'Signatures — Guardian name is required','planGuardians.0.name');
  // Milestone 39-C: replaces the old unconditional req(g0.signatureDate,...)
  // -- Unsigned, "/s/" Signed, and Signature Stamp all now validate, same
  // rule as 39-B's Guardian pilot on Plan Simplified. name omitted: g0.name
  // is already unconditionally required immediately above.
  errs.push(...checkSignatureState({
    state: inferLegacySignatureState(g0.signatureState, g0.signatureDate),
    date: g0.signatureDate,
    image: g0.signatureImage,
    sectionLabel: 'Signatures', roleLabel: 'Guardian',
    filingType:T, datePath:'planGuardians.0.signatureDate', imagePath:'planGuardians.0.signatureImage',
  }));
  req(g0.street,'Signatures — Guardian street address is required','planGuardians.0.street');
  req(g0.phone,'Signatures — Guardian phone is required','planGuardians.0.phone');
  req(g0.ssn,'Signatures — Guardian SSN/EIN is required','planGuardians.0.ssn');

  // Milestone 35-3: pro se filers and Guardian Advocates (Ch. 393, exempt from
  // attorney representation under Fla. Prob. R. 5.030) must be able to export
  // without an attorney. Attorney fields are required only once the filer has
  // started entering one -- matching validatePlanAnnual/validatePlanSimplified's
  // existing non-blocking handling of the same fields. Milestone 39-C: an
  // explicit "/s/"/Stamp choice also counts as "started" (a filer who opens
  // the tri-state control and picks a real signature method has started,
  // even with every other attorney field still blank); an explicit or
  // default Unsigned choice does not, by itself, count as "started" --
  // preserving the pro se exemption.
  //
  // Milestone 58C: the condition moved to core/validation/attorney-block.js
  // and widened. It used to list only name, bar, signature date and a
  // non-Unsigned signature choice, so entering just the attorney's phone,
  // address, or email started nothing -- while Primary Email still showed a
  // required asterisk. The sidebar carried an identical copy of the same
  // narrow list; both now call the one predicate.
  if(isPlanInitialAttorneyStarted(d)){
    req(d.attorney_name,'Attorney Certification — Attorney name is required','attorney_name');
    // Milestone 55D: attorney_email already rendered a required asterisk
    // (inpS(...,true,'email')) with no matching rule anywhere -- confirmed
    // by grep. Added inside this same "started" gate, not a new,
    // separately-evaluated condition: attorney_bar alone (no name) already
    // trips this block, so keying email on a different test than name/date/
    // image would drift the moment either changes, and could narrow the
    // pro se/Guardian Advocate exemption above by accident.
    req(d.attorney_email,'Attorney Certification — Attorney email is required','attorney_email');
    errs.push(...checkSignatureState({
      state: inferLegacySignatureState(d.attorney_signatureState, d.attorney_signatureDate),
      date: d.attorney_signatureDate,
      image: d.attorney_signatureImage,
      sectionLabel: 'Attorney Certification', roleLabel: 'Attorney',
      filingType:T, datePath:'attorney_signatureDate', imagePath:'attorney_signatureImage',
    }));
  }

  return errs;
}
// Milestone 33, Phase 2.3: see annual-accounting/index.js's identical comment --
// exposing this lets the shared guidance panel itemize Plan Initial's own
// missing fields instead of only showing a generic message.
window.validatePlanInitial = validatePlanInitial;
