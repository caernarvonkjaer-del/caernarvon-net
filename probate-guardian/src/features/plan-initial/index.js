import { renderSummaryPage, navStatus, formatSummaryDate } from '../../core/summary-renderer.js';
import { renderSelectField } from '../../core/form/form-fields.js';
import { GUARDIANSHIP_LIFECYCLE_OPTIONS, optionsWithLegacyValue } from '../../core/form/guardianship-options.js';
import { checkSignatureState, inferLegacySignatureState } from '../../core/validation/signature-state.js';
import { checkDateOrder } from '../../core/validation/date-rules.js';
import { isPlanInitialAttorneyStarted } from '../../core/validation/attorney-block.js';
import { issueFactory } from '../../core/validation/validation-issue.js';
import { rowStarted } from '../../core/validation/row-started.js';
import { isAffirmative } from '../../core/form/form-contract.js';
import { renderSignatureStateControl, mountSignatureStateControls, signatureDateRequired } from '../../core/signature/signature-state-control.js';
import { migratePlanCertificateOfService } from '../../core/filing/plan-certificate-of-service.js';
import { renderPlanCertificateOfServicePage } from '../../core/form/plan-certificate-of-service-page.js';
import { migratePlanInitialMultiselect, Q2_OPTIONS, Q4_OPTIONS, Q5_OPTIONS, anyChecked } from '../../core/filing/plan-initial-multiselect.js';
import { renderCheckboxField } from '../../core/form/form-fields.js';

// Milestone 68F: a checkbox in a list whose "None" must stay exclusive with
// the other boxes (10D devices used, 10E devices needed) -- the boxes carry
// their group and role and form-events.js applies the rule on the click
// (core/form/exclusive-none.js, built for question 4 in 68E).
const exclusiveBox = (d, id, label, group, role = 'member', route = '') =>
  renderCheckboxField({ path: id, label, checked: !!d[id], id, route, exclusiveGroup: group, exclusiveRole: role });
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
import { esc } from '../../core/filing/escape-html.js';
import { ic } from '../../core/ui/icons.js';
import { formatDisplayDate } from '../../core/form/date-parser.js';
import { INITIAL_ADLS, INITIAL_ADL_RATINGS } from '../../core/filing/models/plan-initial.js';
import { normalizePlanGuardians } from '../../core/filing/models/plan-rows.js';
import { sectionMarks } from '../../core/status/section-marks.js';
import { getD, requestSave } from '../../core/state.js';
import { REQ_MARK, chkP, inpS, pageNavS, planCheckGroup, planQ, radioP, txtP, yesNoCheckboxS } from '../../core/form/field-html.js';
import { renderScheduleDocsSection } from '../../core/filing/schedule-docs.js';
import { setPath } from '../../core/form/paths.js';
import { PLAN_INITIAL_EXPLANATIONS, explanationShown } from '../../core/filing/plan-explanations.js';
import { collectPlanInitialIssues } from '../../core/validation/engines/plan-initial.js';
import { PLAN_INITIAL_BENEFITS, PLAN_INITIAL_CHOICES as C, PLAN_INITIAL_DEVICES, PLAN_INITIAL_TEXT as T, numbered, planInitialAttorneyCertification } from '../../core/filing/court-text/plan-initial.js';
import { displayDate } from '../../core/form/date-parser.js';
// Milestone 73N part 2: the court's wording, by field, for the boxes built from shared lists.
const DEVICE=Object.fromEntries(PLAN_INITIAL_DEVICES);
const BENEFIT=Object.fromEntries(PLAN_INITIAL_BENEFITS);
/** A lettered sub-question without its letter: the screen shows "Question B" above it. */
const unlettered=(text)=>text.replace(/^[A-F]\. /,'');
// Initial Guardianship Plan — the fourth feature extraction (Milestone 5,
// Phases A and B of INDEX-SPLIT-PLAN.md's migration sequence: data/
// validation/pages/nav, and print/PDF export). Loaded only when one of its pages
// is shown, through src/features-loader.js's feature services
// (src/core/feature-bridge.js mounts it), never statically imported.
//
// Until Milestone 70 this module destructured the classic monolith's globals
// off window -- the shared Plan field helpers and lists -- and this comment
// recorded which, and why each stayed in the monolith (Milestones 3-6, 41 and
// 51C). Milestone 70 moved every one into a module this file imports; 70K
// removed the last window read, and 70L deleted the monolith.

// print.js is dynamically imported only when the user reaches /print or
// triggers PDF export (Phase B) -- same lazy boundary as the other two
// extracted Plan features. No excel.js: no Plan filing type has Excel
// support (confirmed by grep -- see the Milestone 5 plan's "Confirmed
// facts").

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
// Milestone 73F part 3: the attorney's name too -- once an attorney is started
// both are required (the export checks ask for each), and only the email was
// starred.
function syncAttorneyEmailRequired(container) {
  const d = getD();
  if (!container || !d) return;
  const required = isPlanInitialAttorneyStarted(d);
  for (const path of ['attorney_email', 'attorney_name']) {
    // `input[...]`, not a bare attribute match: once this section reports
    // incomplete, the local-guidance panel renders a "jump to field" BUTTON
    // carrying the same data-field-path, and it appears above the card in DOM
    // order. Matching it would toggle aria-required on a link.
    const input = container.querySelector(`input[data-field-path="${path}"]`);
    if (input) {
      if (required) {
        input.setAttribute('data-field-required', 'true');
        input.setAttribute('aria-required', 'true');
      } else {
        input.removeAttribute('data-field-required');
        input.removeAttribute('aria-required');
      }
    }
    const label = container.querySelector(`label[for="${path}"]`);
    if (!label) continue;
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
}

let _printModule = null;
let _printModulePromise = null;
// The Preview page's Save as PDF (data-form-action="save-pdf-plan-initial"),
// and GuardianForms.testing's saveOutput, through the feature services
// (Milestone 70, 70K: a window global this module set once print.js loaded).
export function doSavePdfPlanInitial() {
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
  // Milestone 68E: questions 2, 4 and 5 saved as one string read back as
  // their boxes. Idempotent, so every mount may call it.
  if (migratePlanInitialMultiselect(getD())) requestSave();
  let html;
  let isPrint = false;
  if (page === '/print') {
    await ensurePrintModule();
    // Superseded while its print module loaded (Milestone 70, 70K).
    if (signal?.aborted) return;
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
      case '/p11': html = pagePlanICertificate(); break;
      default:     html = pagePlanICover();
    }
  }
  container.innerHTML = html;
  signatureHandles.get(container)?.forEach((h) => h.destroy());
  signatureHandles.delete(container);
  if (page === '/p9' || page === '/p10' || page === '/p11') {
    signatureHandles.set(container, mountSignatureStateControls(container, {
      setImage: (imagePath, dataUrl) => setPath(getD(), imagePath, dataUrl),
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
      ${item('/p11','pi-p11','Certificate of Service')}
    </div>
    <div class="nav-section">
      <div class="nav-section-label">Output</div>
      <button class="nav-link-item" data-page="/print" data-form-action="navigate" data-route="/print"><span class="nav-link-label">${ic('file',15)}&nbsp; Print Preview</span></button>
    </div>
  `;
}

function getSummaryConfigPlanInitial(){
  const d=getD();
  // This filing's own section marks (Milestone 73F part 2: from the export
  // checks, src/core/status/section-marks.js; 70D's per-type evaluator before).
  const nav=sectionMarks(d);
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
          {label:'Certificate of Service',route:'/p11',status:navStatus(nav,'pi-p11')},
        ],
      },
    ],
    rightCards:[],
    banner:{title:'INITIAL GUARDIANSHIP PLAN',value:(d.wardName?esc(d.wardName):'Ward')+' — Case # '+(d.caseNumber?esc(d.caseNumber):'Pending')},
    nextRoute:'/p2',
  };
}

function pagePlanICover(){
  const d=getD();
  return `<div class="schedule-page">
    <h1>Initial Guardianship Plan — Cover</h1>
    <div class="schedule-instructions">This report, with original signatures, is due within <strong>60 days</strong> after the Letters of Guardianship are signed, and remains in effect until amended or replaced by the approval of an Annual Guardianship Plan.</div>
    <div class="row g-3 mb-3 cover-info-row">
      <div class="col-md-6">
        <div class="summary-box">
          <h2 class="subsection-heading">Ward &amp; Case Information</h2>
          <div class="row g-2">
            ${renderWardIdentityFields({ wardName: d.wardName, wardNameRequired: true })}
            ${renderCaseCaptionFields({ caseNumber: d.caseNumber, county: d.county, ucn: d.ucn ?? '' })}
            <div class="col-12">${renderSelectField({path:'successorGuardianship',label:'Successor Guardianship? (if applicable)',value:d.successorGuardianship,options:optionsWithLegacyValue(GUARDIANSHIP_LIFECYCLE_OPTIONS,d.successorGuardianship)})}</div>
            <!-- Milestone 68I: the court's form asks for both dates, and they differ
                 for a successor guardian; each hint says how. -->
            <div class="col-md-6">${renderFormField({ path:'inceptionDate', id:'inceptionDate', label:'Guardianship Inception Date', value:d.inceptionDate, type:'date', required:true, hint:"Use MM/DD/YYYY. When this guardianship began. For an original guardian this is usually the same day the letters were signed." })}</div>
            <div class="col-md-6">${renderFormField({ path:'lettersSignedDate', id:'lettersSignedDate', label:'Date Letters Were Signed', value:d.lettersSignedDate, type:'date', required:true, hint:"Use MM/DD/YYYY. When this guardian's letters were signed. For a successor guardian this is later than the inception date, and the 60-day deadline for this plan runs from it (F.S. 744.362(1))." })}</div>
            ${renderReportingPeriodFields({ periodFrom: d.periodFrom, periodTo: d.periodTo, fromLabel: 'For the Period From', toLabel: 'Through' })}
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
              mailingSameAsResidence: d.mailingSameAsResidence === true,
              sameAsRoute: '/',
            })}
          </div>
        </div>
      </div>
    </div>
    ${txtP('q1PreexistingDirectives',numbered(1,T.q1),d.q1PreexistingDirectives,5)}
    ${renderScheduleDocsSection('planICover')}
    ${pageNavS(null,'/summary')}
  </div>`;
}

function pagePlanISettingMedical(){
  const d=getD();
  const cb=(id,label,route='')=>chkP(id,label,d[id],route);
  return `<div class="schedule-page">
    <h1>2–3. Residential Setting &amp; Medical Services</h1>
    ${planQ('2',T.q2+REQ_MARK,
      // Milestone 68E: a checkbox list, as on the court's form (page 2); Other
      // reveals its explanation on the click (67F).
      planCheckGroup('',
        Q2_OPTIONS.map((o)=>renderCheckboxField({ path:o.key, label:C[o.key], checked:!!d[o.key], id:o.key, route:o.key==='q2Other'?'/p2':'' })).join(''),
        'q2Explain',d.q2Explain,explanationShown(PLAN_INITIAL_EXPLANATIONS,d,'q2Explain')))}
    ${planQ('3',T.q3+REQ_MARK,
      planCheckGroup('',
        cb('q3MedPrimary',C.q3MedPrimary)
        +cb('q3MedDentist',C.q3MedDentist)
        +cb('q3MedOphthalmologist',C.q3MedOphthalmologist)
        +cb('q3MedSpecialist',C.q3MedSpecialist,'/p2')
        +cb('q3MedPT',C.q3MedPT)
        +cb('q3MedST',C.q3MedST)
        +cb('q3MedOT',C.q3MedOT)
        +cb('q3MedWardDecides',C.q3MedWardDecides)
        +cb('q3MedOther',C.q3MedOther,'/p2'),
        'q3MedExplain',d.q3MedExplain,explanationShown(PLAN_INITIAL_EXPLANATIONS,d,'q3MedExplain'))
      +(d.q3MedSpecialist?`<div class="plan-conditional mt-2">${inpS('q3MedSpecialistArea','Specialist — area of specialty',d.q3MedSpecialistArea)}</div>`:''))}
    ${renderScheduleDocsSection('planISettingMedical')}
    ${pageNavS('/summary','/p3')}
  </div>`;
}

function pagePlanIMentalPersonal(){
  const d=getD();
  return `<div class="schedule-page">
    <h1>4–5. Mental Health &amp; Personal Care</h1>
    ${planQ('4',T.q4+REQ_MARK,
      // Milestone 68E: a checkbox list, as on the court's form; None is
      // exclusive with the other boxes and, like Other, reveals the explanation.
      planCheckGroup('',
        Q4_OPTIONS.map((o)=>renderCheckboxField({ path:o.key, label:C[o.key], checked:!!d[o.key], id:o.key, route:(o.key==='q4Other'||o.key==='q4None')?'/p3':'', exclusiveGroup:'q4', exclusiveRole:o.key==='q4None'?'none':'member' })).join(''),
        'q4Explain',d.q4Explain,explanationShown(PLAN_INITIAL_EXPLANATIONS,d,'q4Explain')))}
    ${planQ('5',T.q5+REQ_MARK,
      planCheckGroup('',
        Q5_OPTIONS.map((o)=>renderCheckboxField({ path:o.key, label:C[o.key], checked:!!d[o.key], id:o.key, route:o.key==='q5Other'?'/p3':'' })).join(''),
        'q5Explain',d.q5Explain,explanationShown(PLAN_INITIAL_EXPLANATIONS,d,'q5Explain')))}
    ${renderScheduleDocsSection('planIMentalPersonal')}
    ${pageNavS('/p2','/p4')}
  </div>`;
}

function pagePlanISocialBenefits(){
  const d=getD();
  const cb=(id,label,route='')=>chkP(id,label,d[id],route);
  return `<div class="schedule-page">
    <h1>6–7. Socialization &amp; Benefits</h1>
    ${planQ('6',T.q6+REQ_MARK,
      planCheckGroup('',
        cb('q6CareFacility',C.q6CareFacility)
        +cb('q6NursesAides',C.q6NursesAides)
        +cb('q6FamilyFriends',C.q6FamilyFriends)
        +cb('q6DayProgram',C.q6DayProgram)
        +cb('q6WardDecides',C.q6WardDecides)
        +cb('q6Other',C.q6Other,'/p4'),
        'q6Explain',d.q6Explain,explanationShown(PLAN_INITIAL_EXPLANATIONS,d,'q6Explain')))}
    ${planQ('7',T.q7,
      planCheckGroup('',
        yesNoCheckboxS('q7SocialSecurity',BENEFIT.q7SocialSecurity,d.q7SocialSecurity)
        +yesNoCheckboxS('q7Ssdi',BENEFIT.q7Ssdi,d.q7Ssdi)
        +yesNoCheckboxS('q7Hmo',BENEFIT.q7Hmo,d.q7Hmo)
        +yesNoCheckboxS('q7Ssi',BENEFIT.q7Ssi,d.q7Ssi)
        +yesNoCheckboxS('q7StateSupplement',BENEFIT.q7StateSupplement,d.q7StateSupplement)
        +yesNoCheckboxS('q7InstitutionalCare',BENEFIT.q7InstitutionalCare,d.q7InstitutionalCare)
        +yesNoCheckboxS('q7SupplementalIns',BENEFIT.q7SupplementalIns,d.q7SupplementalIns)
        +yesNoCheckboxS('q7Pension',BENEFIT.q7Pension,d.q7Pension)
        +yesNoCheckboxS('q7Medicare',BENEFIT.q7Medicare,d.q7Medicare)
        +yesNoCheckboxS('q7Medicaid',BENEFIT.q7Medicaid,d.q7Medicaid)
        +yesNoCheckboxS('q7Va',BENEFIT.q7Va,d.q7Va)
        +yesNoCheckboxS('q7Trusts',BENEFIT.q7Trusts,d.q7Trusts,false,'/p4')
        +yesNoCheckboxS('q7PendingBenefits',BENEFIT.q7PendingBenefits,d.q7PendingBenefits,false,'/p4')
        +cb('q7Other',C.q7Other,'/p4'),
        // Milestone 40C-H: same predicate as validatePlanInitial() and
        // computeNavChecks() so all three agree. Milestone 73D moved it to
        // plan-explanations.js, which the PDF also reads.
        'q7Explain',d.q7Explain,explanationShown(PLAN_INITIAL_EXPLANATIONS,d,'q7Explain'),
        'If Trusts or Pending Benefits is Yes, explain below.'))}
    ${renderScheduleDocsSection('planISocialBenefits')}
    ${pageNavS('/p3','/p5')}
  </div>`;
}

function pagePlanIProviders(){
  const d=getD();
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
    <h1>${numbered(9,T.q9)}</h1>
    <div class="schedule-instructions">List every physical and/or mental examination the guardian will secure or has secured to determine the Ward's medical and mental health treatment needs.</div>
    ${rows?`<div class="row g-3 schedule-entry-grid">${rows}</div>`:`<div class="schedule-empty">${ic('folder',17)}<span>No providers listed yet.</span></div>`}
    <button class="btn btn-outline-primary btn-sm mb-2" data-form-action="add-plan-row" data-collection="q9Providers" data-row-type="initialProvider" data-route="/p5">+ Add Provider</button>
    ${renderScheduleDocsSection('planIProviders')}
    ${pageNavS('/p4','/p6')}
  </div>`;
}

function pagePlanIADLs(){
  const d=getD();
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
    <h2 class="plan-question-text">${numbered(10,T.q10)} ${T.q10A}</h2>
    <div class="schedule-instructions">To assist the Court with review of the initial plan, rate the ability of the Ward to engage in each activity of daily living honestly — these ratings become the baseline that future Annual Plans are compared against.</div>
    <div class="table-responsive"><table class="table plan-adl-table"><caption>Rate every activity${REQ_MARK}</caption><thead><tr><th style="width:45%;">Activity</th><th>Rating</th></tr></thead><tbody>${rows}</tbody></table></div>
    ${renderScheduleDocsSection('planIADLs')}
    ${pageNavS('/p5','/p7')}
  </div>`;
}

function pagePlanIDisabilities(){
  const d=getD();
  const cb=(id,label,route='')=>chkP(id,label,d[id],route);
  return `<div class="schedule-page">
    <h1>10B–D. Disabilities &amp; Assistive Devices</h1>
    ${planQ('B',unlettered(T.q10B),
      planCheckGroup('',
        cb('mentalAlzheimers',C.mentalAlzheimers)
        +cb('mentalAutism',C.mentalAutism)
        +cb('mentalClosedHeadInjury',C.mentalClosedHeadInjury)
        +cb('mentalDementia',C.mentalDementia)
        +cb('mentalDepression',C.mentalDepression)
        +cb('mentalDevelopmental',C.mentalDevelopmental)
        +cb('mentalSubstance',C.mentalSubstance)
        +cb('mentalSchizophrenia',C.mentalSchizophrenia)
        +cb('mentalOther',C.mentalOther,'/p7'),
        'mentalExplain',d.mentalExplain,explanationShown(PLAN_INITIAL_EXPLANATIONS,d,'mentalExplain')))}
    ${planQ('C',unlettered(T.q10C)+REQ_MARK,
      planCheckGroup('',
        cb('physMobility',C.physMobility)
        +cb('physBlindness',C.physBlindness)
        +cb('physDeafness',C.physDeafness)
        +cb('physDiabetic',C.physDiabetic)
        +cb('physParkinsons',C.physParkinsons)
        +cb('physArthritis',C.physArthritis)
        +cb('physOther',C.physOther,'/p7'),
        'physExplain',d.physExplain,explanationShown(PLAN_INITIAL_EXPLANATIONS,d,'physExplain')))}
    ${planQ('D',unlettered(T.q10D),
      planCheckGroup('',
        // Milestone 68F: "None" clears the devices and a device clears "None".
        exclusiveBox(d,'usesDentures',DEVICE.Dentures,'uses')
        +exclusiveBox(d,'usesHearingAid',DEVICE.HearingAid,'uses')
        +exclusiveBox(d,'usesWheelchair',DEVICE.Wheelchair,'uses')
        +exclusiveBox(d,'usesWalker',DEVICE.Walker,'uses')
        +exclusiveBox(d,'usesCrutches',DEVICE.Crutches,'uses')
        +exclusiveBox(d,'usesProsthetics',DEVICE.Prosthetics,'uses')
        +exclusiveBox(d,'usesGlasses',DEVICE.Glasses,'uses')
        +exclusiveBox(d,'usesNone',DEVICE.None,'uses','none')
        +exclusiveBox(d,'usesOther',DEVICE.Other,'uses','member','/p7'),
        'usesExplain',d.usesExplain,explanationShown(PLAN_INITIAL_EXPLANATIONS,d,'usesExplain')))}
    ${renderScheduleDocsSection('planIDisabilities')}
    ${pageNavS('/p6','/p8')}
  </div>`;
}

function pagePlanIDirectives(){
  const d=getD();
  const cb=(id,label,route='')=>chkP(id,label,d[id],route);
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
    ${planQ('11a',T.q11NoDirectives,
      chkP('q11NoDirectives','There are no pre-existing orders or advance directives',d.q11NoDirectives)
      +planCheckGroup('',
        cb('q11StepResidence',C.q11StepResidence)
        +cb('q11StepSafeDeposit',C.q11StepSafeDeposit)
        +cb('q11StepInterviewed',C.q11StepInterviewed)
        +cb('q11StepMedicalProviders',C.q11StepMedicalProviders)
        +cb('q11StepAttorney',C.q11StepAttorney),
        null,null,false))}
    ${planQ('11b',T.q11Executed,
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
        cb('q11ExecDNR',C.q11ExecDNR)
        +cb('q11ExecHealthcare',C.q11ExecHealthcare)
        +cb('q11ExecPOA',C.q11ExecPOA)
        +cb('q11ExecOther',C.q11ExecOther,'/p8'),
        'q11ExecOtherText',d.q11ExecOtherText,explanationShown(PLAN_INITIAL_EXPLANATIONS,d,'q11ExecOtherText'),'Describe the "Other" directive.')
      +(dirs?`<div class="row g-3 schedule-entry-grid">${dirs}</div>`:'')
      +`<button class="btn btn-outline-primary btn-sm mt-2" data-form-action="add-plan-row" data-collection="q11Directives" data-row-type="directive" data-route="/p8">+ Add Directive</button>`
      :''))}
    ${planQ('E',unlettered(T.q10E),
      planCheckGroup('',
        // Milestone 68F: "None" clears the devices and a device clears "None".
        exclusiveBox(d,'needsDentures',DEVICE.Dentures,'needs')
        +exclusiveBox(d,'needsHearingAid',DEVICE.HearingAid,'needs')
        +exclusiveBox(d,'needsWheelchair',DEVICE.Wheelchair,'needs')
        +exclusiveBox(d,'needsWalker',DEVICE.Walker,'needs')
        +exclusiveBox(d,'needsCrutches',DEVICE.Crutches,'needs')
        +exclusiveBox(d,'needsProsthetics',DEVICE.Prosthetics,'needs')
        +exclusiveBox(d,'needsGlasses',DEVICE.Glasses,'needs')
        +exclusiveBox(d,'needsNone',DEVICE.None,'needs','none')
        +exclusiveBox(d,'needsOther',DEVICE.Other,'needs','member','/p8'),
        'needsExplain',d.needsExplain,explanationShown(PLAN_INITIAL_EXPLANATIONS,d,'needsExplain')))}
    ${planQ('F',unlettered(T.q10F),
      yesNoCheckboxS('committeeIncorporated','Recommendations of the examining committee are incorporated into this plan',d.committeeIncorporated,true,'/p8')
      +(explanationShown(PLAN_INITIAL_EXPLANATIONS,d,'committeeExplain')?`<div class="plan-conditional mt-2">${txtP('committeeExplain','Explanation',d.committeeExplain,3)}</div>`:''))}
    ${renderScheduleDocsSection('planIDirectives')}
    ${pageNavS('/p7','/p9')}
  </div>`;
}

function pagePlanISignatures(){
  const d=getD();
  const cb=(id,label,route='')=>chkP(id,label,d[id],route);
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
          <div class="col-md-6">${renderFormField({ path: `planGuardians.${i}.ssn`, label: 'SSN/EIN', value: gd.ssn, required: true })}</div>
          <div class="col-md-6">${renderFormField({ path: `planGuardians.${i}.phone`, label: 'Phone Number', value: gd.phone, required: true })}</div>
          <div class="col-12">${renderFormField({ path: `planGuardians.${i}.email`, label: 'Email Address', value: gd.email, type: 'email' })}</div>
          <div class="col-12"><label class="form-label" for="plan_guardians_${i}_sigDate">Date Signed${signatureDateRequired({ path: `planGuardians.${i}`, state: gd.signatureState })?REQ_MARK:''}</label><input type="text" inputmode="text" class="form-control" id="plan_guardians_${i}_sigDate" placeholder="MM/DD/YYYY" value="${esc(formatDisplayDate(gd.signatureDate||''))}" data-form-path="planGuardians.${i}.signatureDate" data-field-path="planGuardians.${i}.signatureDate" data-field-kind="date" data-field-format-policy="normalize" aria-describedby="plan_guardians_${i}_sigDate_hint"><div id="plan_guardians_${i}_sigDate_hint" class="form-text text-muted" style="font-size:0.75rem;margin-top:0.2rem;">Use MM/DD/YYYY</div></div>
          <div class="col-12">${renderSignatureStateControl({ path: `planGuardians.${i}`, state: gd.signatureState, date: gd.signatureDate, route: '/p9', signatureImage: gd.signatureImage })}</div>
          <div class="col-12">${renderFormField({ path: `planGuardians.${i}.street`, label: 'Street Address', value: gd.street, required: true })}</div>
          <div class="col-12">${renderFormField({ path: `planGuardians.${i}.cityStateZip`, label: 'City/State/Zip', value: gd.cityStateZip })}</div>
        </div>
      </div>
    </div></div>`;
  };
  return `<div class="schedule-page">
    <h1>${T.certTitle}</h1>
  ${preparerNoteHTML()}
    <div class="schedule-instructions">${T.certPreamble}</div>
    ${planCheckGroup(T.certCheckAll,
      cb('certIncapacitatedNoCopy',C.certIncapacitatedNoCopy)
      +cb('certMinorNoCopy',C.certMinorNoCopy)
      +cb('certConsulted',C.certConsulted)
      +cb('certRecognizeRights',C.certRecognizeRights)
      +cb('certNoRestriction',C.certNoRestriction)
      +cb('certProvidesCare',C.certProvidesCare),
      null,null,false)}
    <div class="attestation-text mt-2 mb-3">${T.perjury}</div>
    <div class="row g-3 card-grid-2col mb-4">
      ${normalizePlanGuardians(d).map((_,i)=>g(i,i?'Co-Guardian':'Guardian')).join('')}
    </div>
    ${(d.planGuardians||[]).length<4?'<button type="button" class="btn btn-outline-secondary btn-sm mb-3 no-print" data-form-action="add-plan-guardian" data-route="/p9">+ Add Co-Guardian</button>':''}
    <div class="schedule-instructions mt-2">All guardians of the person must sign and provide their most current address, telephone number, and SSN. Only reports with original signatures will be audited by the Clerk of the Court.</div>
    ${renderScheduleDocsSection('planISignatures')}
    ${pageNavS('/p8','/p10')}
  </div>`;
}

function pagePlanIAttorney(){
  const d=getD();
  return `<div class="schedule-page">
    <h1>${T.attorneyTitle}</h1>
  ${preparerNoteHTML()}
    <div class="attestation-text mb-3">${esc(planInitialAttorneyCertification(displayDate(d.periodFrom)||'—',displayDate(d.periodTo)||'—',d.county||'—'))}</div>
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
              <div class="col-md-6">${inpS('attorney_signatureDate','Date Signed',d.attorney_signatureDate,signatureDateRequired({ path: 'attorney', state: d.attorney_signatureState }),'date')}</div>
              <div class="col-12">${renderSignatureStateControl({ path: 'attorney', state: d.attorney_signatureState, date: d.attorney_signatureDate, route: '/p10', signatureImage: d.attorney_signatureImage, statePath: 'attorney_signatureState', imagePath: 'attorney_signatureImage' })}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
    ${renderScheduleDocsSection('planIAttorney')}
    ${pageNavS('/p9','/p11')}
  </div>`;
}

// Milestone 42F: every issue states its own field path (validation-issue.js).
// Milestone 73F part 1: the checks are src/core/validation/engines/plan-initial.js's.
export function validatePlanInitial(){ return collectPlanInitialIssues(getD()); }
// Milestone 33, Phase 2.3: see annual-accounting/index.js's identical comment --
// exposing this lets the shared guidance panel itemize Plan Initial's own
// missing fields instead of only showing a generic message.

// ── Certificate of Service (Milestone 68C) ───────────────────────────────
// Shared with the other three Plans; see core/filing/plan-certificate-of-service.js.
const CERT_CFG = { attorneyName: (d) => d.attorney_name || '', planNoun: 'plan' };
function pagePlanICertificate(){
  return `<div class="schedule-page">
    ${renderPlanCertificateOfServicePage({ filing: getD(), route: '/p11', cfg: CERT_CFG })}
    ${pageNavS('/p10',null)}
  </div>`;
}
