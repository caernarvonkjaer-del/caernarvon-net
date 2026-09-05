import { renderSummaryPage } from '../../core/summary-renderer.js';
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
const {
  esc, ic, inpS, countyInputS, radioP, pageNavS,
  renderScheduleDocsSection, txtP, chkP, planQ, planCheckGroup, yesNoCheckboxS,
  formatName, formatPhone, toggleSsnReveal,
} = window;

// print.js is dynamically imported only when the user reaches /print or
// triggers PDF export (Phase B) -- same lazy boundary as the other three
// extracted Plan features. No excel.js: no Plan filing type has Excel
// support (confirmed by grep -- see the Milestone 6 plan's "Confirmed
// facts").
let _printModule = null;
let _printModulePromise = null;
function ensurePrintModule() {
  if (_printModule) return Promise.resolve();
  if (!_printModulePromise) {
    _printModulePromise = import('./print.js').then((mod) => {
      _printModule = mod;
      // Referenced by name from rendered onclick="..." HTML attributes
      // (doSavePdfPlanMinor) or from legacy-app.js's shared
      // planReadinessChecks() dispatcher (planReadinessChecksMinor) -- both
      // only ever resolve against the global scope, never a module's own
      // scope, so both must be real `window` properties.
      window.doSavePdfPlanMinor = () => _printModule.doSavePdf();
      window.planReadinessChecksMinor = () => _printModule.planReadinessChecksMinor();
    });
  }
  return _printModulePromise;
}

export async function mount(container, page) {
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
      default:    html = pagePlanMCover();
    }
  }
  container.innerHTML = html;
  container.scrollTop = 0;
  if (isPrint) await _printModule.mountPreview();
}

export function dispose(container) {
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
    </div>
    <div class="nav-section">
      <div class="nav-section-label">Output</div>
      <button class="nav-link-item" data-page="/print" data-form-action="navigate" data-route="/print"><span class="nav-link-label">${ic('file',15)}&nbsp; Print Preview</span></button>
    </div>
  `;
}

function getSummaryConfigPlanMinor(){
  const d=window.D;
  const fd=v=>v?String(v).substring(0,10):'—';
  const hasResidences=(d.q2Residences||[]).length>0;
  const hasProviders=(d.q3Providers||[]).length>0;
  const hasSignatures=!!(d.guardianSigDate||d.coGuardianSigDate);
  const s=v=>v?'complete':'not-started';
  return {
    formTitle:'Annual Plan — Minors — Summary',
    infoRows:[
      {label:"Minor's Name",value:esc(d.wardName)},
      {label:'UCN',value:esc(d.ucn)},
      {label:'REF #',value:esc(d.ref)},
      {label:'County',value:esc(d.county)},
      {label:'Period',value:fd(d.periodFrom)+' – '+fd(d.periodTo)},
      {label:'Guardian',value:esc(d.guardianName)},
    ],
    leftCards:[
      {
        heading:'Section Completion',
        lines:[
          {label:'1. Present Residence',route:'/',status:s(d.q1ResidenceName||d.q1Street)},
          {label:'2. Prior Residences (Past 12 Mos)',route:'/p2',status:s(hasResidences)},
          {label:'3. Treatment Providers',route:'/p3',status:s(hasProviders)},
          {label:'4. Medical & Dental Services',route:'/p4',status:s(d.q4ExamDate||d.q4DentalExamDate)},
          {label:'5. Education & Social Development',route:'/p5',status:s(d.q5SchoolName||d.q5Social)},
          {label:'Guardian Signatures',route:'/p6',status:s(hasSignatures)},
          {label:'Preparer & Attorney',route:'/p7',status:s(d.preparerName||d.attorneyName)},
        ],
      },
    ],
    rightCards:[],
    banner:{title:'ANNUAL PLAN — MINORS',value:(d.wardName?esc(d.wardName):"Minor")+' — '+(d.ucn?('UCN '+esc(d.ucn)):'Pending')},
    nextRoute:'/p2',
  };
}

function pagePlanMCover(){
  const d=window.D;
  return `<div class="schedule-page">
    <h1>Annual Plan — Minors — Cover</h1>
    <div class="schedule-instructions">This is the Annual Guardianship Plan used when the ward is a <strong>minor</strong>. It has no rights-restoration table or ADL ratings — instead it covers residence, medical care, and the minor's education and social development.</div>
    <div class="row g-3">
      <div class="col-md-8">${inpS('wardName',"Minor's Name",d.wardName,true)}</div>
      <div class="col-md-4">${countyInputS('county','County',d.county,true)}</div>
      <div class="col-md-6">${inpS('ucn','UCN',d.ucn)}</div>
      <div class="col-md-6">${inpS('ref','REF #',d.ref)}</div>
      <div class="col-md-6">${inpS('periodFrom','For the Period From',d.periodFrom,true,'date')}</div>
      <div class="col-md-6">${inpS('periodTo','To',d.periodTo,true,'date')}</div>
      <div class="col-md-6">${inpS('guardianName','Guardian Name(s)',d.guardianName,true)}</div>
    </div>
    <div class="row g-3 mt-1">
      <div class="col-md-4">${yesNoCheckboxS('amendedForm','Amended Form?',d.amendedForm)}</div>
      <div class="col-md-4">${d.amendedForm==='Yes'?radioP('amendedVersion','Version',d.amendedVersion,['1st','2nd','3rd']):''}</div>
    </div>
    <div class="row g-3">
      <div class="col-md-6">${yesNoCheckboxS('professionalGuardian','Professional Guardian?',d.professionalGuardian)}</div>
      <div class="col-md-6">${yesNoCheckboxS('publicGuardian','Public Guardian?',d.publicGuardian)}</div>
    </div>
    <h2 class="subsection-heading mt-4">1. Where the Minor Presently Resides</h2>
    <div class="row g-3">
      <div class="col-md-6">${inpS('q1ResidenceName','Residence Name',d.q1ResidenceName,true)}</div>
      <div class="col-md-6">${inpS('q1Street','Street Address',d.q1Street,true)}</div>
      <div class="col-md-5">${inpS('q1City','City',d.q1City)}</div>
      <div class="col-md-3">${inpS('q1State','State',d.q1State)}</div>
      <div class="col-md-4">${inpS('q1Zip','Zip',d.q1Zip)}</div>
      <div class="col-md-6">${inpS('q1Phone','Phone Number',d.q1Phone)}</div>
    </div>
    ${renderScheduleDocsSection('planMCover')}
    ${pageNavS(null,'/summary')}
  </div>`;
}

function pagePlanMResidences(){
  const d=window.D;
  const rows=(d.q2Residences||[]).map((r,i)=>{
    const set=f=>`D.q2Residences[${i}].${f}=this.value;autoSave();updateNavDots()`;
    return `<div class="entry-card mb-2">
      <div class="entry-card-header">Residence ${i+1}
        <button class="btn btn-sm btn-outline-secondary ms-auto" title="Add a copy of this row below" data-form-action="duplicate-plan-row" data-collection="q2Residences" data-index="${i}" data-route="/p2">${ic('copy',13)}</button>
        <button class="btn btn-sm btn-outline-danger" data-form-action="remove-plan-row" data-collection="q2Residences" data-index="${i}" data-route="/p2">×</button>
      </div>
      <div class="entry-card-body"><div class="row g-2">
        <div class="col-md-6"><label class="form-label">Residence Name</label><input type="text" class="form-control" value="${esc(r.name||'')}" data-form-path="q2Residences.${i}.name"></div>
        <div class="col-md-6"><label class="form-label">Street Address</label><input type="text" class="form-control" value="${esc(r.street||'')}" data-form-path="q2Residences.${i}.street"></div>
        <div class="col-md-5"><label class="form-label">City</label><input type="text" class="form-control" value="${esc(r.city||'')}" data-form-path="q2Residences.${i}.city"></div>
        <div class="col-md-3"><label class="form-label">State</label><input type="text" class="form-control" value="${esc(r.state||'')}" data-form-path="q2Residences.${i}.state"></div>
        <div class="col-md-4"><label class="form-label">Zip</label><input type="text" class="form-control" value="${esc(r.zip||'')}" data-form-path="q2Residences.${i}.zip"></div>
        <div class="col-md-6"><label class="form-label">Phone Number</label><input type="text" class="form-control" value="${esc(r.phone||'')}" data-form-path="q2Residences.${i}.phone" data-form-format="phone"></div>
      </div></div>
    </div>`;
  }).join('');
  return `<div class="schedule-page">
    <h1>2. Residences During the Preceding 12 Months</h1>
    <div class="schedule-instructions">List every place the minor resided during the prior 12 months, if different from the current residence on the cover page. Leave blank if the minor has not moved.</div>
    ${rows||`<div class="schedule-empty">${ic('folder',17)}<span>No prior residences listed.</span></div>`}
    <button class="btn btn-outline-primary btn-sm mb-2" data-form-action="add-plan-row" data-collection="q2Residences" data-row-type="minorResidence" data-route="/p2">+ Add Residence</button>
    ${renderScheduleDocsSection('planMResidences')}
    ${pageNavS('/summary','/p3')}
  </div>`;
}

function pagePlanMProviders(){
  const d=window.D;
  const rows=(d.q3Providers||[]).map((r,i)=>{
    const set=f=>`D.q3Providers[${i}].${f}=this.value;autoSave();updateNavDots()`;
    return `<div class="entry-card mb-2">
      <div class="entry-card-header">Provider ${i+1}
        <button class="btn btn-sm btn-outline-secondary ms-auto" title="Add a copy of this row below" data-form-action="duplicate-plan-row" data-collection="q3Providers" data-index="${i}" data-route="/p3">${ic('copy',13)}</button>
        <button class="btn btn-sm btn-outline-danger" data-form-action="remove-plan-row" data-collection="q3Providers" data-index="${i}" data-route="/p3">×</button>
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
    </div>`;
  }).join('');
  return `<div class="schedule-page">
    <h1>3. Medical &amp; Mental Health Treatment Providers</h1>
    <div class="schedule-instructions">Every provider who treated the minor during the preceding 12 months.</div>
    ${rows||`<div class="schedule-empty">${ic('folder',17)}<span>No providers listed yet.</span></div>`}
    <button class="btn btn-outline-primary btn-sm mb-2" data-form-action="add-plan-row" data-collection="q3Providers" data-row-type="minorProvider" data-route="/p3">+ Add Provider</button>
    ${renderScheduleDocsSection('planMProviders')}
    ${pageNavS('/p2','/p4')}
  </div>`;
}

function pagePlanMMedical(){
  const d=window.D;
  const freq=(id,val)=>radioP(id,'Frequency',val,['Weekly','Monthly','Annually']);
  return `<div class="schedule-page">
    <h1>4. Provision of Medical Services</h1>
    <div class="schedule-instructions">For the plan period, the guardian proposes the following as to the provision of medical services for the Minor.</div>
    <div class="plan-check-grid">
      ${chkP('q4Primary','Routine examination by primary care physician',d.q4Primary)}
    </div>
    ${d.q4Primary?freq('q4PrimaryFreq',d.q4PrimaryFreq):''}
    <div class="plan-check-grid mt-2">
      ${chkP('q4Dentist','Routine examination by dentist',d.q4Dentist)}
    </div>
    ${d.q4Dentist?freq('q4DentistFreq',d.q4DentistFreq):''}
    <div class="plan-check-grid mt-2">
      ${chkP('q4Specialist','Routine examination by specialist',d.q4Specialist)}
    </div>
    ${d.q4Specialist?freq('q4SpecialistFreq',d.q4SpecialistFreq):''}
    <div class="plan-check-grid mt-2">
      ${chkP('q4PT','Physical Therapy',d.q4PT)}
      ${chkP('q4ST','Speech Therapy',d.q4ST)}
      ${chkP('q4OT','Occupational Therapy',d.q4OT)}
      ${chkP('q4MinorDecides','The Minor retains the right to make his or her own decision',d.q4MinorDecides)}
      ${chkP('q4Other','Other',d.q4Other)}
    </div>
    ${d.q4Other?`<div class="plan-conditional mt-2">${txtP('q4Explain','Explanation (required if "Other" checked)',d.q4Explain,3)}</div>`:''}
    ${renderScheduleDocsSection('planMMedical')}
    ${pageNavS('/p3','/p5')}
  </div>`;
}

function pagePlanMEducation(){
  const d=window.D;
  const cb=(id,label)=>chkP(id,label,d[id]);
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
        +cb('q5Other','Other'),
        'q5Explain',d.q5Explain,d.q5Other))}
    ${renderScheduleDocsSection('planMEducation')}
    ${pageNavS('/p4','/p6')}
  </div>`;
}

function pagePlanMSignatures(){
  const d=window.D;
  const cb=(id,label)=>chkP(id,label,d[id]);
  const g=(i,title)=>{
    const gd=(d.planGuardians||[])[i]||{};
    const slashSChecked = gd.useSlashS !== false ? 'checked' : '';
    return `<div class="plan-sig-block">
      <div class="d-flex justify-content-between align-items-center mb-2">
        <h3 class="m-0">${title}</h3>
        <label class="form-check form-switch m-0 d-flex align-items-center gap-2" style="font-size:0.85rem;cursor:pointer;">
          <input class="form-check-input" type="checkbox" role="switch" ${slashSChecked} data-form-path="planGuardians.${i}.useSlashS" style="cursor:pointer;">
          <span>Use /s/ format</span>
        </label>
      </div>
      <div class="row g-2">
        <div class="col-md-6"><label class="form-label">Name</label><input type="text" class="form-control" value="${esc(gd.name||'')}" data-form-path="planGuardians.${i}.name" data-form-format="name"></div>
        <div class="col-md-6"><label class="form-label">Relationship to Ward</label><input type="text" class="form-control" value="${esc(gd.relationship||'')}" data-form-path="planGuardians.${i}.relationship"></div>
        <div class="col-md-4"><label class="form-label">Taxpayer ID #</label><div class="ssn-mask-wrap"><input type="password" autocomplete="off" class="form-control" value="${esc(gd.tin||'')}" data-form-path="planGuardians.${i}.tin" data-form-format="ssn"><button type="button" class="ssn-reveal-btn" aria-label="Show Taxpayer ID" data-form-action="toggle-ssn">${ic('lock',14)}</button></div></div>
        <div class="col-md-4"><label class="form-label">Telephone #</label><input type="text" class="form-control" value="${esc(gd.phone||'')}" data-form-path="planGuardians.${i}.phone" data-form-format="phone"></div>
        <div class="col-md-4"><label class="form-label">Date Signed</label><input type="date" class="form-control" value="${esc(gd.signatureDate||'')}" data-form-path="planGuardians.${i}.signatureDate"></div>
        <div class="col-md-6"><label class="form-label">Mailing Address</label><input type="text" class="form-control" value="${esc(gd.mailingStreet||'')}" data-form-path="planGuardians.${i}.mailingStreet"></div>
        <div class="col-md-6"><label class="form-label">City/State/Zip</label><input type="text" class="form-control" value="${esc(gd.mailingCityStateZip||'')}" data-form-path="planGuardians.${i}.mailingCityStateZip"></div>
        <div class="col-md-6"><label class="form-label">Email Address</label><input type="email" class="form-control" value="${esc(gd.email||'')}" data-form-path="planGuardians.${i}.email"></div>
      </div>
    </div>`;
  };
  return `<div class="schedule-page">
    <h1>Certification and Signature of Guardian(s)</h1>
    ${planCheckGroup('Check all that apply:',
      cb('certIncapacitated','The Ward was declared totally incapacitated.')
      +cb('certMinor','The Ward is a minor.')
      +cb('certConsulted',"The guardian has consulted with the Ward, to the extent reasonable, has honored the Ward's wishes, and to the maximum extent possible the plan is in accordance with the Ward's wishes or consistent with the rights retained by the Ward.")
      +cb('certNoRestriction',"The plan does not restrict the physical liberty of the Ward except as necessary to protect the Ward and others from serious physical injury, illness, or disease.")
      +cb('certProvidesCare',"The plan provides for the Ward's medical care and mental health treatment.")
      +cb('certPhysicianAttached',"The physician's statement of an examination of the Ward no more than 90 days before the beginning of the plan period is attached."),
      null,null,false)}
    <p style="font-size:.85rem;color:var(--ink-3);margin:.5rem 0 1rem;">Under penalties of perjury, each signing guardian declares they have read and examined the foregoing plan, and the facts alleged are true, to the best of their knowledge and belief.</p>
    ${g(0,'Guardian')}
    ${g(1,'Co-Guardian')}
    ${renderScheduleDocsSection('planMSignatures')}
    ${pageNavS('/p5','/p7')}
  </div>`;
}

function pagePlanMPreparerAttorney(){
  const d=window.D;
  const prepSlashSChecked = d.preparer_useSlashS !== false ? 'checked' : '';
  const attySlashSChecked = d.attorney_useSlashS !== false ? 'checked' : '';
  return `<div class="schedule-page">
    <h1>Certification of Preparer &amp; Attorney</h1>
    <div class="d-flex justify-content-between align-items-center mt-3 mb-1">
      <h2 class="subsection-heading m-0">Certification and Signature of Preparer</h2>
      <label class="form-check form-switch m-0 d-flex align-items-center gap-2" style="font-size:0.85rem;cursor:pointer;">
        <input class="form-check-input" type="checkbox" role="switch" ${prepSlashSChecked} data-form-path="preparer_useSlashS" style="cursor:pointer;">
        <span>Use /s/ format</span>
      </label>
    </div>
    <div class="schedule-instructions">The preparation of this form is based upon the information provided by the guardian(s) and/or attorney with no independent verification. The preparer has not audited or reviewed the guardianship plan or supporting documents.</div>
    <div class="row g-3">
      <div class="col-md-6">${inpS('preparer_name','Preparer Name',d.preparer_name,true)}</div>
      <div class="col-md-6">${inpS('preparer_tin','Preparer Taxpayer ID #',d.preparer_tin)}</div>
      <div class="col-md-6">${inpS('preparer_phone','Preparer Telephone #',d.preparer_phone)}</div>
      <div class="col-md-6">${inpS('preparer_signatureDate','Date Signed',d.preparer_signatureDate,false,'date')}</div>
      <div class="col-12">${inpS('preparer_mailingStreet','Preparer Mailing Address',d.preparer_mailingStreet)}</div>
      <div class="col-md-8">${inpS('preparer_cityStateZip','Preparer City / State / Zip',d.preparer_cityStateZip)}</div>
      <div class="col-md-4">${inpS('preparer_email','Preparer Email Address',d.preparer_email)}</div>
    </div>
    <div class="d-flex justify-content-between align-items-center mt-4 mb-1">
      <h2 class="subsection-heading m-0">Certification and Signature of Guardian's Attorney</h2>
      <label class="form-check form-switch m-0 d-flex align-items-center gap-2" style="font-size:0.85rem;cursor:pointer;">
        <input class="form-check-input" type="checkbox" role="switch" ${attySlashSChecked} data-form-path="attorney_useSlashS" style="cursor:pointer;">
        <span>Use /s/ format</span>
      </label>
    </div>
    <div class="schedule-instructions">The undersigned notifies the Court of the filing of this plan. This is the representation of the guardian; the attorney has not audited the accompanying plan, but represents that they have examined its contents and that it conforms to the requirements of Florida Guardianship Law.</div>
    <div class="row g-3">
      <div class="col-md-6">${inpS('attorney_name','Attorney Name',d.attorney_name,true)}</div>
      <div class="col-md-6">${inpS('attorney_bar','Attorney Florida Bar Number',d.attorney_bar)}</div>
      <div class="col-12">${inpS('attorney_street','Attorney Mailing Address',d.attorney_street)}</div>
      <div class="col-md-6">${inpS('attorney_cityStateZip','Attorney City / State / Zip',d.attorney_cityStateZip)}</div>
      <div class="col-md-3">${inpS('attorney_phone','Attorney Telephone #',d.attorney_phone)}</div>
      <div class="col-md-3">${inpS('attorney_signatureDate','Date Signed',d.attorney_signatureDate,true,'date')}</div>
      <div class="col-md-6">${inpS('attorney_email',"Primary Email (required for e-filing)",d.attorney_email)}</div>
      <div class="col-md-6">${inpS('attorney_secondary_email',"Secondary Email (optional)",d.attorney_secondary_email)}</div>
    </div>
    ${renderScheduleDocsSection('planMPreparerAttorney')}
    ${pageNavS('/p6','/print')}
  </div>`;
}

export function validatePlanMinor(){
  const d=window.D;
  const errs=[];
  const req=(v,label)=>{if(v===''||v===null||v===undefined||v===false)errs.push(label);};
  req(d.wardName,"Cover — Minor's Name is required");
  req(d.county,'Cover — County is required');
  req(d.periodFrom,'Cover — Reporting Period From is required');
  req(d.periodTo,'Cover — Reporting Period To is required');
  req(d.guardianName,'Cover — Guardian Name(s) is required');
  req(d.q1ResidenceName,'Cover — Current Residence Name is required');
  req(d.q1Street,'Cover — Current Residence Street Address is required');
  if(d.amendedForm==='Yes')req(d.amendedVersion,'Cover — Amended Form version is required');

  (d.q3Providers||[]).forEach((r,i)=>{
    if(r&&(r.first||r.providerType||r.street||r.city||r.phone)&&!r.last)
      errs.push(`3. Treatment Providers — Row ${i+1}: Provider last name is required`);
  });

  const anyMed=d.q4Primary||d.q4Dentist||d.q4Specialist||d.q4PT||d.q4ST||d.q4OT||d.q4MinorDecides||d.q4Other;
  if(!anyMed)errs.push('4. Medical Services — At least one medical service option is required');
  if(d.q4Other)req(d.q4Explain,'4. Medical Services — Explanation for "Other" is required');

  req(d.q5SchoolProgress,"5. Education & Social Development — School progress summary is required");
  req(d.q5SocialDevelopment,"5. Education & Social Development — Social development description is required");
  req(d.q5Communicates,"5. Education & Social Development — Communication statement is required");
  req(d.q5Interpersonal,"5. Education & Social Development — Interpersonal relationships statement is required");
  const anyUnmet=d.q5NoUnmetNeeds||d.q5DoesNotCareToSocialize||d.q5UnmetNeeds||d.q5Other;
  if(!anyUnmet)errs.push('5. Education & Social Development — Unmet social needs option is required');
  if(d.q5Other)req(d.q5Explain,'5. Education & Social Development — Explanation for "Other" unmet needs is required');

  const anyCert=d.certIncapacitated||d.certMinor||d.certConsulted||d.certNoRestriction||d.certProvidesCare||d.certPhysicianAttached;
  if(!anyCert)errs.push('Guardian Signatures — At least one certification statement must be checked');
  const g0=(d.planGuardians||[])[0]||{};
  req(g0.name,'Guardian Signatures — Guardian name is required');
  req(g0.signatureDate,'Guardian Signatures — Guardian signature date is required');

  req(d.preparer_name,'Preparer & Attorney — Preparer name is required');
  req(d.attorney_name,'Preparer & Attorney — Attorney name is required');
  req(d.attorney_signatureDate,'Preparer & Attorney — Attorney signature date is required');

  return errs;
}
