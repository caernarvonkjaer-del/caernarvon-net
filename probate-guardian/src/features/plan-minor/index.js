import { renderSummaryPage, navStatus, formatSummaryDate } from '../../core/summary-renderer.js';
import { checkDateOrder } from '../../core/validation/date-rules.js';
import { isTriStateAnswer } from '../../core/form/form-contract.js';
import { checkSignatureState, inferLegacySignatureState } from '../../core/validation/signature-state.js';
import { issueFactory } from '../../core/validation/validation-issue.js';
import { rowStarted } from '../../core/validation/row-started.js';
import { renderSignatureStateControl, mountSignatureStateControls } from '../../core/signature/signature-state-control.js';
import { migratePlanCertificateOfService } from '../../core/filing/plan-certificate-of-service.js';
import { renderPlanCertificateOfServicePage } from '../../core/form/plan-certificate-of-service-page.js';
import { preparerNoteHTML } from '../../core/signature/preparer-note.js';
// Milestone 41-3: Tier 2/1 adoption for Plan Minor. renderReportingPeriodFields()
// already supports overridable from/to labels (built for exactly this kind
// of divergence during 41-2) and fits this page's period fields unchanged.
// Plan Minor has no caseNumber at all -- it uses ucn+ref instead, in a
// page order (wardName, county, ucn, ref) that doesn't match
// case-caption-card.js's/ward-demographics-card.js's fixed field order, so
// those two fields are NOT wrapped in a card here; they were already on
// Tier 1 via inpS()'s Milestone 41-1 delegation regardless. The
// Signatures page's guardian block is a different story -- see the import
// below.
import { renderReportingPeriodFields } from '../../core/form/cards/ward-demographics-card.js';
// renderPartyContactFields() (Plan Simplified's shape: phone+email+one
// mailingAddress field, in that order) does not generalize to this page's
// guardian block: relationship+tin+phone+[date/signature-control]+split
// mailingStreet/mailingCityStateZip+email, a different field set in a
// different order. Only renderPartyNameField() (always-first, same
// required-for-guardian-0 semantics) is reused; the rest convert to
// renderFormField() directly -- genuine Tier 1 adoption without forcing a
// card shape that would need to be configured into meaninglessness to fit
// both types.
import { renderPartyNameField } from '../../core/form/cards/guardian-attorney-card.js';
import { renderFormField } from '../../core/form/form-fields.js';
import { esc } from '../../core/filing/escape-html.js';
import { ic } from '../../core/ui/icons.js';
import { formatDisplayDate } from '../../core/form/date-parser.js';
import { normalizePlanGuardians } from '../../core/filing/models/plan-rows.js';
import { planMinorCompletion } from '../../core/status/completion.js';
import { getD } from '../../core/state.js';
// Annual Plan — Minors — the fifth and last feature extraction (Milestone 6,
// Phases A and B of INDEX-SPLIT-PLAN.md's migration sequence: data/
// validation/pages/nav, and print/PDF export). Dynamically imported by
// legacy-app.js's mountPlanMinorFeature()/mountPlanMinorNav() bridge (built
// on src/core/feature-bridge.js), never statically imported.
//
// legacy-app.js stays a classic (non-module) script (Milestone 1's recorded
// decision), so its top-level function declarations are real `window`
// properties this module can destructure -- but a bare top-level `let`
// (activeInventoryType, currentPage) is not; see src/core/state.js's file
// header for the full explanation. Everything below that isn't defined in
// this file is one of those legacy globals, deliberately left in place
// rather than moved: `planQ`/`planCheckGroup`/`planEmptyRow`/`addPlanRow`/
// `removePlanRow`/`duplicatePlanRow`/`txtP`/`chkP`/`radioP`/`pageNavS`/
// `yesNoCheckboxS` -- this was the last of the four Plan types, so there is
// no remaining not-yet-extracted type to justify keeping them legacy on
// sharing grounds alone; they stay because every already-extracted Plan
// module already reaches them the same way, and moving them into a shared
// core module is a separate restructuring, not required by this milestone
// (see the Milestone 6 plan's "Confirmed facts" and "Design decisions").
// Milestone 51C: `formatName`, `formatPhone` and `toggleSsnReveal` were
// destructured here without ever being called, and are dropped -- the same pass
// plan-annual got in Milestone 41-3 and plan-simplified in 41-2, which
// plan-initial and plan-minor never received. `countyInputS` stays: unlike the
// other three Plan types, this one still calls it directly (see /p1 below).
const {
  inpS, countyInputS, radioP, pageNavS,
  renderScheduleDocsSection, txtP, chkP, planQ, planCheckGroup, yesNoCheckboxS,
} = window;

// print.js is dynamically imported only when the user reaches /print or
// triggers PDF export (Phase B) -- same lazy boundary as the other three
// extracted Plan features. No excel.js: no Plan filing type has Excel
// support (confirmed by grep -- see the Milestone 6 plan's "Confirmed
// facts").
// Milestone 39-C: see plan-annual/index.js's identical comment.
const signatureHandles = new WeakMap();

let _printModule = null;
let _printModulePromise = null;
function ensurePrintModule() {
  if (_printModule) return Promise.resolve();
  if (!_printModulePromise) {
    _printModulePromise = import('./print.js').then((mod) => {
      _printModule = mod;
      // Referenced by name from rendered onclick="..." HTML attributes
      // (doSavePdfPlanMinor), which only ever resolve against the global
      // scope, never a module's own scope, so it must be a real `window`
      // property. (The planReadinessChecksMinor bridge went with Milestone
      // 44C's shared readiness card.)
      window.doSavePdfPlanMinor = () => _printModule.doSavePdf();
    });
  }
  return _printModulePromise;
}

export async function mount(container, page) {
  // Milestone 68C: a plan saved before the Certificate of Service existed
  // gains its fields on load. Idempotent, so every mount may call it.
  if (migratePlanCertificateOfService(getD())) window.autoSave?.();
  let html;
  let isPrint = false;
  if (page === '/print') {
    await ensurePrintModule();
    html = _printModule.pagePrintPlanMinor();
    isPrint = true;
  } else {
    switch (page) {
      case '/':   html = pagePlanMCover(); break;
      case '/summary': html = renderSummaryPage(getSummaryConfigPlanMinor()); break;
      case '/p2': html = pagePlanMResidences(); break;
      case '/p3': html = pagePlanMProviders(); break;
      case '/p4': html = pagePlanMMedical(); break;
      case '/p5': html = pagePlanMEducation(); break;
      case '/p6': html = pagePlanMSignatures(); break;
      case '/p7': html = pagePlanMPreparerAttorney(); break;
      case '/p8': html = pagePlanMCertificate(); break;
      default:    html = pagePlanMCover();
    }
  }
  container.innerHTML = html;
  container.scrollTop = 0;
  signatureHandles.get(container)?.forEach((h) => h.destroy());
  signatureHandles.delete(container);
  if (page === '/p6' || page === '/p7' || page === '/p8') {
    signatureHandles.set(container, mountSignatureStateControls(container, {
      setImage: (imagePath, dataUrl) => window.setPath(getD(), imagePath, dataUrl),
      route: page,
    }));
  }
  if (isPrint) await _printModule.mountPreview();
}

export function dispose(container) {
  signatureHandles.get(container)?.forEach((h) => h.destroy());
  signatureHandles.delete(container);
  container.replaceChildren();
}

export function mountNav(container) {
  buildNavPlanMinor(container);
}

function buildNavPlanMinor(container){
  const item=(route,nav,label)=>`<button class="nav-link-item" data-page="${route}" data-nav="${nav}" data-form-action="navigate" data-route="${route}">${label}</button>`;
  container.innerHTML=`
    <div class="nav-section">
      <div class="nav-section-label">Annual Plan — Minors</div>
      ${item('/','pm-cover','Cover')}
      ${item('/summary','pm-summary','Summary')}
      ${item('/p2','pm-p2','2&nbsp;&nbsp;Prior Residences')}
      ${item('/p3','pm-p3','3&nbsp;&nbsp;Treatment Providers')}
      ${item('/p4','pm-p4','4&nbsp;&nbsp;Medical Services')}
      ${item('/p5','pm-p5','5&nbsp;&nbsp;Education &amp; Social Development')}
      ${item('/p6','pm-p6','Guardian Signatures')}
      ${item('/p7','pm-p7','Preparer &amp; Attorney')}
      ${item('/p8','pm-p8','Certificate of Service')}
    </div>
    <div class="nav-section">
      <div class="nav-section-label">Output</div>
      <button class="nav-link-item" data-page="/print" data-form-action="navigate" data-route="/print"><span class="nav-link-label">${ic('file',15)}&nbsp; Print Preview</span></button>
    </div>
  `;
}

function getSummaryConfigPlanMinor(){
  const d=getD();
  // This filing's own section marks (Milestone 70, 70D: its engine's evaluator,
  // imported; it was window.computeNavChecks()).
  const nav=planMinorCompletion(d);
  return {
    formTitle:'Annual Plan — Minors — Summary',
    infoRows:[
      {label:"Minor's Name",value:esc(d.wardName)},
      {label:'UCN',value:esc(d.ucn)},
      {label:'Case #',value:esc(d.ref)},
      {label:'County',value:esc(d.county)},
      {label:'Period',value:formatSummaryDate(d.periodFrom)+' – '+formatSummaryDate(d.periodTo)},
      {label:'Guardian',value:esc(d.guardianName)},
    ],
    leftCards:[
      {
        heading:'Section Completion',
        lines:[
          {label:'1. Present Residence',route:'/',status:navStatus(nav,'pm-cover')},
          {label:'2. Prior Residences (Past 12 Mos)',route:'/p2',status:navStatus(nav,'pm-p2')},
          {label:'3. Treatment Providers',route:'/p3',status:navStatus(nav,'pm-p3')},
          {label:'4. Medical & Dental Services',route:'/p4',status:navStatus(nav,'pm-p4')},
          {label:'5. Education & Social Development',route:'/p5',status:navStatus(nav,'pm-p5')},
          {label:'Guardian Signatures',route:'/p6',status:navStatus(nav,'pm-p6')},
          {label:'Preparer & Attorney',route:'/p7',status:navStatus(nav,'pm-p7')},
          {label:'Certificate of Service',route:'/p8',status:navStatus(nav,'pm-p8')},
        ],
      },
    ],
    rightCards:[],
    banner:{title:'ANNUAL PLAN — MINORS',value:(d.wardName?esc(d.wardName):"Minor")+' — '+(d.ucn?('UCN '+esc(d.ucn)):'Pending')},
    nextRoute:'/p2',
  };
}

function pagePlanMCover(){
  const d=getD();
  return `<div class="schedule-page">
    <h1>Annual Plan — Minors — Cover</h1>
    <div class="schedule-instructions">This is the Annual Guardianship Plan used when the ward is a <strong>minor</strong>. It has no rights-restoration table or ADL ratings — instead it covers residence, medical care, and the minor's education and social development.</div>
    <div class="row g-3 mb-3 cover-info-row">
      <div class="col-md-6">
        <div class="summary-box">
          <h2 class="subsection-heading">Minor &amp; Case Information</h2>
          <div class="row g-2">
            <div class="col-12">${inpS('wardName',"Minor's Name",d.wardName,true)}</div>
            <div class="col-md-6">${countyInputS('county','County',d.county,true)}</div>
            <div class="col-md-6">${inpS('ucn','UCN',d.ucn)}</div>
            <div class="col-12">${inpS('ref','Case #',d.ref)}</div>
            ${renderReportingPeriodFields({ periodFrom: d.periodFrom, periodTo: d.periodTo, fromLabel: 'For the Period From', toLabel: 'To' })}
            <div class="col-md-6 mt-2">${yesNoCheckboxS('amendedForm','Amended Form?',d.amendedForm,false,'/')}</div>
            <div class="col-md-6 mt-2">${d.amendedForm==='Yes'?radioP('amendedVersion','Version',d.amendedVersion,['1st','2nd','3rd']):''}</div>
          </div>
        </div>
      </div>
      <div class="col-md-6">
        <div class="summary-box">
          <h2 class="subsection-heading">Guardian &amp; Current Residence</h2>
          <div class="row g-2">
            <div class="col-12">${inpS('guardianName','Guardian Name(s)',d.guardianName,true)}</div>
            <div class="col-md-6">${yesNoCheckboxS('professionalGuardian','Professional Guardian?',d.professionalGuardian)}</div>
            <div class="col-md-6">${yesNoCheckboxS('publicGuardian','Public Guardian?',d.publicGuardian)}</div>
            <div class="col-12 mt-2">${inpS('q1ResidenceName','Residence Name',d.q1ResidenceName,true)}</div>
            <div class="col-12">${inpS('q1Street','Street Address',d.q1Street,true)}</div>
            <div class="col-md-5">${inpS('q1City','City',d.q1City)}</div>
            <div class="col-md-3">${inpS('q1State','State',d.q1State)}</div>
            <div class="col-md-4">${inpS('q1Zip','Zip',d.q1Zip)}</div>
            <div class="col-12">${inpS('q1Phone','Phone Number',d.q1Phone)}</div>
          </div>
        </div>
      </div>
    </div>
    ${renderScheduleDocsSection('planMCover')}
    ${pageNavS(null,'/summary')}
  </div>`;
}

function pagePlanMResidences(){
  const d=getD();
  const rows=(d.q2Residences||[]).map((r,i)=>{
    return `<div class="col-12 col-lg-6"><div class="entry-card mb-2">
      <div class="entry-card-header">
        <span>Residence ${i+1}</span>
        <span class="entry-card-actions">
          <button class="btn btn-sm btn-outline-secondary ms-auto" title="Add a copy of this row below" data-form-action="duplicate-plan-row" data-collection="q2Residences" data-index="${i}" data-route="/p2">${ic('copy',13)}</button>
          <button class="btn btn-sm btn-outline-danger" data-form-action="remove-plan-row" data-collection="q2Residences" data-index="${i}" data-route="/p2">✕ Remove</button>
        </span>
      </div>
      <div class="entry-card-body"><div class="row g-2">
        <div class="col-md-6"><label class="form-label">Residence Name</label><input type="text" class="form-control" value="${esc(r.name||'')}" data-form-path="q2Residences.${i}.name"></div>
        <div class="col-md-6"><label class="form-label">Street Address</label><input type="text" class="form-control" value="${esc(r.street||'')}" data-form-path="q2Residences.${i}.street"></div>
        <div class="col-md-5"><label class="form-label">City</label><input type="text" class="form-control" value="${esc(r.city||'')}" data-form-path="q2Residences.${i}.city"></div>
        <div class="col-md-3"><label class="form-label">State</label><input type="text" class="form-control" value="${esc(r.state||'')}" data-form-path="q2Residences.${i}.state"></div>
        <div class="col-md-4"><label class="form-label">Zip</label><input type="text" class="form-control" value="${esc(r.zip||'')}" data-form-path="q2Residences.${i}.zip"></div>
        <div class="col-md-6"><label class="form-label">Phone Number</label><input type="text" class="form-control" value="${esc(r.phone||'')}" data-form-path="q2Residences.${i}.phone" data-form-format="phone"></div>
      </div></div>
    </div></div>`;
  }).join('');
  return `<div class="schedule-page">
    <h1>2. Residences During the Preceding 12 Months</h1>
    <div class="schedule-instructions">List every place the minor resided during the prior 12 months, if different from the current residence on the cover page. Leave blank if the minor has not moved.</div>
    ${rows?`<div class="row g-3 schedule-entry-grid">${rows}</div>`:`<div class="schedule-empty">${ic('folder',17)}<span>No prior residences listed.</span></div>`}
    <button class="btn btn-outline-primary btn-sm mb-2" data-form-action="add-plan-row" data-collection="q2Residences" data-row-type="minorResidence" data-route="/p2">+ Add Residence</button>
    ${renderScheduleDocsSection('planMResidences')}
    ${pageNavS('/summary','/p3')}
  </div>`;
}

function pagePlanMProviders(){
  const d=getD();
  const rows=(d.q3Providers||[]).map((r,i)=>{
    return `<div class="col-12 col-lg-6"><div class="entry-card mb-2">
      <div class="entry-card-header">
        <span>Provider ${i+1}</span>
        <span class="entry-card-actions">
          <button class="btn btn-sm btn-outline-secondary ms-auto" title="Add a copy of this row below" data-form-action="duplicate-plan-row" data-collection="q3Providers" data-index="${i}" data-route="/p3">${ic('copy',13)}</button>
          <button class="btn btn-sm btn-outline-danger" data-form-action="remove-plan-row" data-collection="q3Providers" data-index="${i}" data-route="/p3">✕ Remove</button>
        </span>
      </div>
      <div class="entry-card-body"><div class="row g-2">
        <div class="col-md-4"><label class="form-label">First Name</label><input type="text" class="form-control" value="${esc(r.first||'')}" data-form-path="q3Providers.${i}.first"></div>
        <div class="col-md-2"><label class="form-label">MI</label><input type="text" class="form-control" value="${esc(r.mi||'')}" data-form-path="q3Providers.${i}.mi"></div>
        <div class="col-md-6"><label class="form-label">Last Name<span class="req">*</span></label><input type="text" class="form-control" value="${esc(r.last||'')}" data-form-path="q3Providers.${i}.last"></div>
        <div class="col-md-6"><label class="form-label">Type of Provider</label><input type="text" class="form-control" placeholder="e.g. Primary Care Physician" value="${esc(r.providerType||'')}" data-form-path="q3Providers.${i}.providerType"></div>
        <div class="col-md-6"><label class="form-label">Number of Visits</label><input type="text" class="form-control" value="${esc(r.visits||'')}" data-form-path="q3Providers.${i}.visits"></div>
        <div class="col-md-6"><label class="form-label">Street Address</label><input type="text" class="form-control" value="${esc(r.street||'')}" data-form-path="q3Providers.${i}.street"></div>
        <div class="col-md-3"><label class="form-label">City</label><input type="text" class="form-control" value="${esc(r.city||'')}" data-form-path="q3Providers.${i}.city"></div>
        <div class="col-md-2"><label class="form-label">State</label><input type="text" class="form-control" value="${esc(r.state||'')}" data-form-path="q3Providers.${i}.state"></div>
        <div class="col-md-3"><label class="form-label">Zip</label><input type="text" class="form-control" value="${esc(r.zip||'')}" data-form-path="q3Providers.${i}.zip"></div>
        <div class="col-md-4"><label class="form-label">Phone Number</label><input type="text" class="form-control" value="${esc(r.phone||'')}" data-form-path="q3Providers.${i}.phone" data-form-format="phone"></div>
      </div></div>
    </div></div>`;
  }).join('');
  return `<div class="schedule-page">
    <h1>3. Medical &amp; Mental Health Treatment Providers</h1>
    <div class="schedule-instructions">Every provider who treated the minor during the preceding 12 months.</div>
    ${rows?`<div class="row g-3 schedule-entry-grid">${rows}</div>`:`<div class="schedule-empty">${ic('folder',17)}<span>No providers listed yet.</span></div>`}
    <button class="btn btn-outline-primary btn-sm mb-2" data-form-action="add-plan-row" data-collection="q3Providers" data-row-type="minorProvider" data-route="/p3">+ Add Provider</button>
    ${renderScheduleDocsSection('planMProviders')}
    ${pageNavS('/p2','/p4')}
  </div>`;
}

function pagePlanMMedical(){
  const d=getD();
  const freq=(id,val)=>radioP(id,'Frequency',val,['Weekly','Monthly','Annually']);
  return `<div class="schedule-page">
    <h1>4. Provision of Medical Services</h1>
    <div class="schedule-instructions">For the plan period, the guardian proposes the following as to the provision of medical services for the Minor.</div>
    <div class="plan-check-grid">
      ${chkP('q4Primary','Routine examination by primary care physician',d.q4Primary,'/p4')}
    </div>
    ${d.q4Primary?freq('q4PrimaryFreq',d.q4PrimaryFreq):''}
    <div class="plan-check-grid mt-2">
      ${chkP('q4Dentist','Routine examination by dentist',d.q4Dentist,'/p4')}
    </div>
    ${d.q4Dentist?freq('q4DentistFreq',d.q4DentistFreq):''}
    <div class="plan-check-grid mt-2">
      ${chkP('q4Specialist','Routine examination by specialist',d.q4Specialist,'/p4')}
    </div>
    ${d.q4Specialist?freq('q4SpecialistFreq',d.q4SpecialistFreq):''}
    <div class="plan-check-grid mt-2">
      ${chkP('q4PT','Physical Therapy',d.q4PT)}
      ${chkP('q4ST','Speech Therapy',d.q4ST)}
      ${chkP('q4OT','Occupational Therapy',d.q4OT)}
      ${chkP('q4MinorDecides','The Minor retains the right to make his or her own decision',d.q4MinorDecides)}
      ${chkP('q4Other','Other',d.q4Other,'/p4')}
    </div>
    ${d.q4Other?`<div class="plan-conditional mt-2">${txtP('q4Explain','Explanation (required if "Other" checked)',d.q4Explain,3)}</div>`:''}
    ${renderScheduleDocsSection('planMMedical')}
    ${pageNavS('/p3','/p5')}
  </div>`;
}

function pagePlanMEducation(){
  const d=getD();
  const cb=(id,label,route='')=>chkP(id,label,d[id],route);
  return `<div class="schedule-page">
    <h1>5. Education &amp; Social Development</h1>
    ${txtP('q5SchoolProgress',"A. Summary of the Minor's school progress report",d.q5SchoolProgress,4)}
    ${txtP('q5SocialDevelopment',"B. Description of the social development of the Minor",d.q5SocialDevelopment,4)}
    ${txtP('q5Communicates',"C. Statement of how well the Minor communicates with others",d.q5Communicates,4)}
    ${txtP('q5Interpersonal',"D. Statement of how well the Minor maintains interpersonal relationships",d.q5Interpersonal,4)}
    ${planQ('E','Description of the unmet social needs of the Minor:',
      planCheckGroup('',
        cb('q5NoUnmetNeeds','No Unmet Needs')
        +cb('q5DoesNotCareToSocialize','The Minor does not care to socialize')
        +cb('q5UnmetNeeds','Unmet Needs')
        +cb('q5Other','Other','/p5'),
        'q5Explain',d.q5Explain,d.q5Other))}
    ${renderScheduleDocsSection('planMEducation')}
    ${pageNavS('/p4','/p6')}
  </div>`;
}

function pagePlanMSignatures(){
  const d=getD();
  const cb=(id,label,route='')=>chkP(id,label,d[id],route);
  const g=(i,title)=>{
    const gd=(d.planGuardians||[])[i]||{};
    return `<div class="col-12 col-lg-6"><div class="entry-card mb-0 h-100">
      <div class="entry-card-header d-flex justify-content-between align-items-center gap-2"><span>${title}</span><span class="d-flex gap-2"><button type="button" class="btn btn-outline-secondary btn-sm" data-form-action="link-party" data-role="guardian" data-index="${i}">Link Person</button>${i?`<button type="button" class="btn btn-outline-danger btn-sm" data-form-action="remove-plan-guardian" data-index="${i}" data-route="/p6">Remove</button>`:''}</span></div>
      <div class="entry-card-body">
        <div class="row g-2">
          ${renderPartyNameField({ pathPrefix: `planGuardians.${i}`, name: gd.name, required: i===0, label: 'Name' })}
          <div class="col-12">${renderFormField({ path: `planGuardians.${i}.relationship`, label: 'Relationship to Ward', value: gd.relationship })}</div>
          <div class="col-md-6">${renderFormField({ path: `planGuardians.${i}.tin`, label: 'SSN/EIN #', value: gd.tin })}</div>
          <div class="col-md-6">${renderFormField({ path: `planGuardians.${i}.phone`, label: 'Telephone #', value: gd.phone })}</div>
          <div class="col-12"><label class="form-label" for="plan_guardians_${i}_sigDate">Date Signed</label><input type="text" inputmode="text" class="form-control" id="plan_guardians_${i}_sigDate" placeholder="MM/DD/YYYY" value="${esc(formatDisplayDate(gd.signatureDate||''))}" data-form-path="planGuardians.${i}.signatureDate" data-field-path="planGuardians.${i}.signatureDate" data-field-kind="date" data-field-format-policy="normalize" aria-describedby="plan_guardians_${i}_sigDate_hint"><div id="plan_guardians_${i}_sigDate_hint" class="form-text text-muted" style="font-size:0.75rem;margin-top:0.2rem;">Use MM/DD/YYYY</div></div>
          <div class="col-12">${renderSignatureStateControl({ path: `planGuardians.${i}`, state: inferLegacySignatureState(gd.signatureState, gd.signatureDate), route: '/p6', signatureImage: gd.signatureImage })}</div>
          <div class="col-12">${renderFormField({ path: `planGuardians.${i}.mailingStreet`, label: 'Mailing Address', value: gd.mailingStreet })}</div>
          <div class="col-12">${renderFormField({ path: `planGuardians.${i}.mailingCityStateZip`, label: 'City/State/Zip', value: gd.mailingCityStateZip })}</div>
          <div class="col-12">${renderFormField({ path: `planGuardians.${i}.email`, label: 'Email Address', value: gd.email })}</div>
        </div>
      </div>
    </div></div>`;
  };
  return `<div class="schedule-page">
    <h1>Certification and Signature of Guardian(s)</h1>
  ${preparerNoteHTML()}
    ${planCheckGroup('Check all that apply:',
      cb('certIncapacitated','The Ward was declared totally incapacitated.')
      +cb('certMinor','The Ward is a minor.')
      +cb('certConsulted',"The guardian has consulted with the Ward, to the extent reasonable, has honored the Ward's wishes, and to the maximum extent possible the plan is in accordance with the Ward's wishes or consistent with the rights retained by the Ward.")
      +cb('certNoRestriction',"The plan does not restrict the physical liberty of the Ward except as necessary to protect the Ward and others from serious physical injury, illness, or disease.")
      +cb('certProvidesCare',"The plan provides for the Ward's medical care and mental health treatment.")
      +cb('certPhysicianAttached',"The physician's statement of an examination of the Ward no more than 90 days before the beginning of the plan period is attached."),
      null,null,false)}
    <p class="mt-2 mb-3" style="font-size:.85rem;color:var(--ink-3);">Under penalties of perjury, each signing guardian declares they have read and examined the foregoing plan, and the facts alleged are true, to the best of their knowledge and belief.</p>
    <div class="row g-3 card-grid-2col mb-4">
      ${normalizePlanGuardians(d).map((_,i)=>g(i,i?'Co-Guardian':'Guardian')).join('')}
    </div>
    ${(d.planGuardians||[]).length<2?'<button type="button" class="btn btn-outline-secondary btn-sm mb-3 no-print" data-form-action="add-plan-guardian" data-route="/p6">+ Add Co-Guardian</button>':''}
    ${renderScheduleDocsSection('planMSignatures')}
    ${pageNavS('/p5','/p7')}
  </div>`;
}

function pagePlanMPreparerAttorney(){
  const d=getD();
  return `<div class="schedule-page">
    <h1>Certification of Preparer &amp; Attorney</h1>
  ${preparerNoteHTML()}
    <div class="row g-3 card-grid-2col mb-3">
      <div class="col-12 col-lg-6">
        <div class="entry-card mb-0 h-100">
          <div class="entry-card-header d-flex justify-content-between align-items-center gap-2"><span>Certification and Signature of Preparer</span><button type="button" class="btn btn-outline-secondary btn-sm" data-form-action="link-party" data-role="preparer" data-index="0">Link Person</button></div>
          <div class="entry-card-body">
            <div class="schedule-instructions mb-3">The preparation of this form is based upon the information provided by the guardian(s) and/or attorney with no independent verification. The preparer has not audited or reviewed the guardianship plan or supporting documents.</div>
            <div class="row g-2">
              <div class="col-12">${inpS('preparer_name','Preparer Name',d.preparer_name,true)}</div>
              <div class="col-md-6">${inpS('preparer_tin','SSN/EIN #',d.preparer_tin)}</div>
              <div class="col-md-6">${inpS('preparer_phone','Telephone #',d.preparer_phone)}</div>
              <div class="col-12">${inpS('preparer_signatureDate','Date Signed',d.preparer_signatureDate,false,'date')}</div>
              <div class="col-12">${renderSignatureStateControl({ path: 'preparer', state: inferLegacySignatureState(d.preparer_signatureState, d.preparer_signatureDate), route: '/p7', signatureImage: d.preparer_signatureImage, statePath: 'preparer_signatureState', imagePath: 'preparer_signatureImage' })}</div>
              <div class="col-12">${inpS('preparer_mailingStreet','Mailing Address',d.preparer_mailingStreet)}</div>
              <div class="col-12">${inpS('preparer_cityStateZip','City / State / Zip',d.preparer_cityStateZip)}</div>
              <div class="col-12">${inpS('preparer_email','Email Address',d.preparer_email)}</div>
            </div>
          </div>
        </div>
      </div>
      <div class="col-12 col-lg-6">
        <div class="entry-card mb-0 h-100">
          <div class="entry-card-header d-flex justify-content-between align-items-center gap-2"><span>Certification and Signature of Attorney</span><button type="button" class="btn btn-outline-secondary btn-sm" data-form-action="link-party" data-role="attorney" data-index="0">Link Person</button></div>
          <div class="entry-card-body">
            <div class="schedule-instructions mb-3">The undersigned notifies the Court of the filing of this plan. This is the representation of the guardian; the attorney has not audited the accompanying plan, but represents that they have examined its contents and that it conforms to the requirements of Florida Guardianship Law.</div>
            <div class="row g-2">
              <div class="col-md-7">${inpS('attorney_name','Attorney Name',d.attorney_name,true)}</div>
              <div class="col-md-5">${inpS('attorney_bar','Bar Number',d.attorney_bar)}</div>
              <div class="col-12">${inpS('attorney_street','Mailing Address',d.attorney_street)}</div>
              <div class="col-12">${inpS('attorney_cityStateZip','City / State / Zip',d.attorney_cityStateZip)}</div>
              <div class="col-md-6">${inpS('attorney_phone','Telephone #',d.attorney_phone)}</div>
              <div class="col-md-6">${inpS('attorney_signatureDate','Date Signed',d.attorney_signatureDate,true,'date')}</div>
              <div class="col-12">${renderSignatureStateControl({ path: 'attorney', state: inferLegacySignatureState(d.attorney_signatureState, d.attorney_signatureDate), route: '/p7', signatureImage: d.attorney_signatureImage, statePath: 'attorney_signatureState', imagePath: 'attorney_signatureImage' })}</div>
              <div class="col-12">${inpS('attorney_email',"Primary Email (e-filing)",d.attorney_email)}</div>
              <div class="col-12">${inpS('attorney_secondary_email',"Secondary Email (optional)",d.attorney_secondary_email)}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
    ${renderScheduleDocsSection('planMPreparerAttorney')}
    ${pageNavS('/p6','/p8')}
  </div>`;
}

// Milestone 42F: every issue states its own field path (validation-issue.js).
export function validatePlanMinor(){
  const d=getD();
  const errs=[];
  const T='planMinor';
  const issue=issueFactory(T);
  if(!isTriStateAnswer(d.amendedForm)) errs.push(issue('Cover — Amended Form? must be answered','amendedForm'));
  const req=(v,label,path)=>{if(v===''||v===null||v===undefined||v===false)errs.push(issue(label,path));};
  req(d.wardName,"Cover — Minor's Name is required",'wardName');
  req(d.county,'Cover — County is required','county');
  req(d.periodFrom,'Cover — Reporting Period From is required','periodFrom');
  req(d.periodTo,'Cover — Reporting Period To is required','periodTo');
  errs.push(...checkDateOrder(d.periodFrom,d.periodTo,{
    sectionLabel:'Cover',earlierLabel:'Reporting Period From',laterLabel:'Reporting Period To',allowSameDay:false,
    filingType:T,laterPath:'periodTo',
  }));
  req(d.ucn||d.ref,'Cover — Case Number is required','ucn');
  req(d.guardianName,'Cover — Guardian Name(s) is required','guardianName');
  req(d.q1ResidenceName,'Cover — Current Residence Name is required','q1ResidenceName');
  req(d.q1Street,'Cover — Current Residence Street Address is required','q1Street');
  if(d.amendedForm==='Yes')req(d.amendedVersion,'Cover — Amended Form version is required','amendedVersion');

  const q3provs=(d.q3Providers||[]).filter(r=>r&&r.last);
  if(!q3provs.length)errs.push(issue('3. Treatment Providers — At least one provider must be listed','q3Providers.0.last'));
  (d.q3Providers||[]).forEach((r,i)=>{
    // Milestone 61B: see plan-initial's equivalent -- the old list omitted
    // state, ZIP and visits, so a row carrying only those raised nothing.
    if(rowStarted(r)&&!r.last)
      errs.push(issue(`3. Treatment Providers — Row ${i+1}: Provider last name is required`,`q3Providers.${i}.last`));
  });

  const anyMed=d.q4Primary||d.q4Dentist||d.q4Specialist||d.q4PT||d.q4ST||d.q4OT||d.q4MinorDecides||d.q4Other;
  if(!anyMed)errs.push(issue('4. Medical Services — At least one medical service option is required','q4Primary'));
  if(d.q4Other)req(d.q4Explain,'4. Medical Services — Explanation for "Other" is required','q4Explain');

  req(d.q5SchoolProgress,"5. Education & Social Development — School progress summary is required",'q5SchoolProgress');
  req(d.q5SocialDevelopment,"5. Education & Social Development — Social development description is required",'q5SocialDevelopment');
  req(d.q5Communicates,"5. Education & Social Development — Communication statement is required",'q5Communicates');
  req(d.q5Interpersonal,"5. Education & Social Development — Interpersonal relationships statement is required",'q5Interpersonal');
  const anyUnmet=d.q5NoUnmetNeeds||d.q5DoesNotCareToSocialize||d.q5UnmetNeeds||d.q5Other;
  if(!anyUnmet)errs.push(issue('5. Education & Social Development — Unmet social needs option is required','q5NoUnmetNeeds'));
  if(d.q5Other)req(d.q5Explain,'5. Education & Social Development — Explanation for "Other" unmet needs is required','q5Explain');

  const anyCert=d.certIncapacitated||d.certMinor||d.certConsulted||d.certNoRestriction||d.certProvidesCare||d.certPhysicianAttached;
  if(!anyCert)errs.push(issue('Guardian Signatures — At least one certification statement must be checked','certIncapacitated'));
  const g0=(d.planGuardians||[])[0]||{};
  req(g0.name,'Guardian Signatures — Guardian name is required','planGuardians.0.name');
  // Milestone 39-C: replaces the old unconditional req(g0.signatureDate,...)
  // -- Unsigned, "/s/" Signed, and Signature Stamp all now validate, same
  // rule as 39-B's Guardian pilot on Plan Simplified. name omitted: g0.name
  // is already unconditionally required immediately above.
  errs.push(...checkSignatureState({
    state: inferLegacySignatureState(g0.signatureState, g0.signatureDate),
    date: g0.signatureDate,
    image: g0.signatureImage,
    sectionLabel: 'Guardian Signatures', roleLabel: 'Guardian',
    filingType:T, datePath:'planGuardians.0.signatureDate', imagePath:'planGuardians.0.signatureImage',
  }));
  req(g0.mailingStreet,'Guardian Signatures — Guardian mailing street address is required','planGuardians.0.mailingStreet');
  req(g0.phone,'Guardian Signatures — Guardian phone is required','planGuardians.0.phone');
  req(g0.tin,'Guardian Signatures — Guardian SSN/EIN is required','planGuardians.0.tin');
  // Milestone 68A: no date order between any signature and the reporting
  // period -- a plan is written before the period it plans for (see Plan
  // Annual's note). checkSignatureState() still catches a missing or
  // malformed date; the same applies to the preparer and attorney below.

  // Milestone 35-3: preparer and attorney are optional roles (pro se filers
  // and Guardian Advocates need neither) -- required only once the filer has
  // started entering one, same reasoning as Plan Initial's attorney fields.
  // Milestone 39-C: an explicit "/s/"/Stamp choice also counts as "started"
  // (see Plan Initial's identical comment); an explicit or default Unsigned
  // choice does not, preserving the pro se exemption.
  if(d.preparer_name||d.preparer_signatureDate||(d.preparer_signatureState&&d.preparer_signatureState!=='none')){
    req(d.preparer_name,'Preparer & Attorney — Preparer name is required','preparer_name');
    errs.push(...checkSignatureState({
      state: inferLegacySignatureState(d.preparer_signatureState, d.preparer_signatureDate),
      date: d.preparer_signatureDate,
      image: d.preparer_signatureImage,
      sectionLabel: 'Preparer & Attorney', roleLabel: 'Preparer',
      filingType:T, datePath:'preparer_signatureDate', imagePath:'preparer_signatureImage',
    }));
  }
  if(d.attorney_name||d.attorney_signatureDate||(d.attorney_signatureState&&d.attorney_signatureState!=='none')){
    req(d.attorney_name,'Preparer & Attorney — Attorney name is required','attorney_name');
    errs.push(...checkSignatureState({
      state: inferLegacySignatureState(d.attorney_signatureState, d.attorney_signatureDate),
      date: d.attorney_signatureDate,
      image: d.attorney_signatureImage,
      sectionLabel: 'Preparer & Attorney', roleLabel: 'Attorney',
      filingType:T, datePath:'attorney_signatureDate', imagePath:'attorney_signatureImage',
    }));
  }

  return errs;
}
// Milestone 33, Phase 2.3: see annual-accounting/index.js's identical comment --
// exposing this lets the shared guidance panel itemize Plan Minor's own
// missing fields instead of only showing a generic message.
window.validatePlanMinor = validatePlanMinor;

// ── Certificate of Service (Milestone 68C) ───────────────────────────────
// Shared with the other three Plans; see core/filing/plan-certificate-of-service.js.
const CERT_CFG = { attorneyName: (d) => d.attorney_name || '', planNoun: 'plan' };
function pagePlanMCertificate(){
  return `<div class="schedule-page">
    ${renderPlanCertificateOfServicePage({ filing: getD(), route: '/p8', cfg: CERT_CFG })}
    ${pageNavS('/p7',null)}
  </div>`;
}
