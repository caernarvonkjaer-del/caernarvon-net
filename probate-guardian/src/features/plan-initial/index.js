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
const {
  esc, ic, loadWardInfoBanner, inpS, countyInputS, radioP, pageNavS,
  renderScheduleDocsSection, txtP, chkP, planQ, planCheckGroup, yesNoCheckboxS,
  formatName, formatPhone, toggleSsnReveal,
  INITIAL_ADLS, INITIAL_ADL_RATINGS,
} = window;

let _printModule = null;
let _printModulePromise = null;
function ensurePrintModule() {
  if (_printModule) return Promise.resolve();
  if (!_printModulePromise) {
    _printModulePromise = import('./print.js').then((mod) => {
      _printModule = mod;
      // Referenced by name from rendered onclick="..." HTML attributes
      // (doSavePdfPlanInitial) or from legacy-app.js's shared
      // planReadinessChecks() dispatcher (planReadinessChecksInitial, still
      // called for the one remaining not-yet-extracted Plan type too) --
      // both only ever resolve against the global scope, never a module's
      // own scope, so both must be real `window` properties.
      window.doSavePdfPlanInitial = () => _printModule.doSavePdf();
      window.planReadinessChecksInitial = () => _printModule.planReadinessChecksInitial();
    });
  }
  return _printModulePromise;
}

export async function mount(container, page) {
  let html;
  if (page === '/print') {
    await ensurePrintModule();
    html = _printModule.pagePrintPlanInitial();
  } else {
    switch (page) {
      case '/':    html = pagePlanICover(); break;
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
}

export function dispose(container) {
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

function pagePlanICover(){
  const d=window.D;
  return `<div class="schedule-page">
    <h1>Initial Guardianship Plan — Cover</h1>
    <div class="schedule-instructions">This report, with original signatures, is due within <strong>60 days</strong> after the Letters of Guardianship are signed, and remains in effect until amended or replaced by the approval of an Annual Guardianship Plan. Per Administrative Order 2019-005, a separate Disaster Plan must also be filed — the app does not produce that document.</div>
    ${loadWardInfoBanner()}
    <div class="row g-3">
      <div class="col-md-8">${inpS('wardName','Name of Ward',d.wardName,true)}</div>
      <div class="col-md-4">${countyInputS('county','County',d.county,true)}</div>
      <div class="col-md-6">${inpS('caseNumber','Case Number',d.caseNumber,true)}</div>
      <div class="col-md-6">${inpS('successorGuardianship','Successor Guardianship? (if applicable)',d.successorGuardianship)}</div>
      <div class="col-md-6">${inpS('inceptionDate','Guardianship Inception Date',d.inceptionDate,true,'date')}</div>
      <div class="col-md-6">${inpS('lettersSignedDate','Date Letters Were Signed',d.lettersSignedDate,true,'date')}</div>
      <div class="col-md-6">${inpS('periodFrom','For the Period From',d.periodFrom,false,'date')}</div>
      <div class="col-md-6">${inpS('periodTo','Through',d.periodTo,false,'date')}</div>
      <div class="col-md-6">${inpS('guardianNames','Guardian Name(s)',d.guardianNames,true)}</div>
      <div class="col-md-6">${inpS('attorneyName','Attorney Name',d.attorneyName)}</div>
    </div>
    <h2 class="subsection-heading mt-4">Where the Ward Currently Lives</h2>
    ${radioP('wardLiving','The ward is living:',d.wardLiving,[
      'In a private residence leased or owned by them (house, condo or apartment)',
      'In a private residence not leased or owned by them (such as family member)',
      'In a facility (Skilled Nursing, Assisted Living, etc.)'],true)}
    <div class="row g-3">
      <div class="col-12">${inpS('residenceAddress','Address Where Ward Is Currently Residing',d.residenceAddress,true)}</div>
      <div class="col-md-8">${inpS('residenceCityStateZip','City / State / ZIP',d.residenceCityStateZip,true)}</div>
      <div class="col-md-4">${inpS('residencePhone','Phone',d.residencePhone)}</div>
      <div class="col-12">${inpS('mailingAddress','Mailing Address for Ward (if different from above)',d.mailingAddress)}</div>
      <div class="col-md-8">${inpS('mailingCityStateZip','Mailing City / State / ZIP',d.mailingCityStateZip)}</div>
    </div>
    ${txtP('q1PreexistingDirectives','List any preexisting orders not to resuscitate or preexisting advance directives, the date signed, whether suspended by the court, and the steps taken to identify and locate them. Attach a copy of any directives to the plan.',d.q1PreexistingDirectives,5)}
    ${renderScheduleDocsSection('planICover')}
    ${pageNavS(null,'/p2')}
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
    ${pageNavS('/','/p3')}
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
        cb('q7SocialSecurity','Social Security')
        +cb('q7Ssdi','Social Security Disability Income (SSDI)')
        +cb('q7Hmo','Health Maintenance Organization (HMO)')
        +cb('q7Ssi','Supplemental Security Income (SSI)')
        +cb('q7StateSupplement','Optional State Supplement')
        +cb('q7InstitutionalCare','Institutional Care Program')
        +cb('q7SupplementalIns','Supplemental Insurance')
        +cb('q7Pension','Pension')
        +cb('q7Medicare','Medicare')
        +cb('q7Medicaid','Medicaid')
        +cb('q7Va','VA')
        +cb('q7Trusts','Trusts (explain type and how it covers costs below)')
        +cb('q7PendingBenefits','Pending Benefits (explain why not yet receiving, or date applied, below)')
        +cb('q7Other','Other'),
        'q7Explain',d.q7Explain,d.q7Trusts||d.q7PendingBenefits||d.q7Other,
        'If Trusts or Pending Benefits is checked, explain below.'))}
    ${renderScheduleDocsSection('planISocialBenefits')}
    ${pageNavS('/p3','/p5')}
  </div>`;
}

function pagePlanIProviders(){
  const d=window.D;
  const rows=(d.q9Providers||[]).map((r,i)=>{
    const set=f=>`D.q9Providers[${i}].${f}=this.value;autoSave();updateNavDots()`;
    return `<div class="entry-card mb-2">
      <div class="entry-card-header">Provider ${i+1}
        <button class="btn btn-sm btn-outline-secondary ms-auto" title="Add a copy of this row below" data-form-action="duplicate-plan-row" data-collection="q9Providers" data-index="${i}" data-route="/p5">${ic('copy',13)}</button>
        <button class="btn btn-sm btn-outline-danger" data-form-action="remove-plan-row" data-collection="q9Providers" data-index="${i}" data-route="/p5">×</button>
      </div>
      <div class="entry-card-body"><div class="row g-2">
        <div class="col-md-6"><label class="form-label">Provider's first name, last name, and middle initial<span class="req">*</span></label><input type="text" class="form-control" value="${esc(r.name||'')}" data-form-path="q9Providers.${i}.name"></div>
        <div class="col-md-3"><label class="form-label">Type of Provider</label><input type="text" class="form-control" value="${esc(r.providerType||'')}" data-form-path="q9Providers.${i}.providerType"></div>
        <div class="col-md-3"><label class="form-label">Approximate Date of Exam</label><input type="date" class="form-control" value="${esc(r.examDate||'')}" data-form-path="q9Providers.${i}.examDate"></div>
        <div class="col-md-6"><label class="form-label">Street Address</label><input type="text" class="form-control" value="${esc(r.street||'')}" data-form-path="q9Providers.${i}.street"></div>
        <div class="col-md-6"><label class="form-label">City, State and Zip Code</label><input type="text" class="form-control" value="${esc(r.cityStateZip||'')}" data-form-path="q9Providers.${i}.cityStateZip"></div>
        <div class="col-md-4"><label class="form-label">Phone Number</label><input type="text" class="form-control" value="${esc(r.phone||'')}" data-form-path="q9Providers.${i}.phone" data-form-format="phone"></div>
      </div></div>
    </div>`;
  }).join('');
  return `<div class="schedule-page">
    <h1>9. Examinations to Determine Treatment Needs</h1>
    <div class="schedule-instructions">List every physical and/or mental examination the guardian will secure or has secured to determine the Ward's medical and mental health treatment needs.</div>
    ${rows||`<div class="schedule-empty">${ic('folder',17)}<span>No providers listed yet.</span></div>`}
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
    const set=f=>`D.q11Directives[${i}].${f}=this.value;autoSave();updateNavDots()`;
    return `<div class="entry-card mb-2">
      <div class="entry-card-header">Advance Directive ${i+1}</div>
      <div class="entry-card-body"><div class="row g-2">
        <div class="col-md-6"><label class="form-label">Title of the order or directive</label><input type="text" class="form-control" value="${esc(r.title||'')}" data-form-path="q11Directives.${i}.title"></div>
        <div class="col-md-6"><label class="form-label">Date executed/signed</label><input type="date" class="form-control" value="${esc(r.dateSigned||'')}" data-form-path="q11Directives.${i}.dateSigned"></div>
        <div class="col-md-6"><label class="form-label">Name of person who signed</label><input type="text" class="form-control" value="${esc(r.signedBy||'')}" data-form-path="q11Directives.${i}.signedBy"></div>
        <div class="col-md-6"><label class="form-label">Relationship of Agent(s)/Surrogate(s) to the Ward</label><input type="text" class="form-control" value="${esc(r.relationship||'')}" data-form-path="q11Directives.${i}.relationship"></div>
        <div class="col-md-6"><label class="form-label">Name of Designated Agent(s) or Surrogate(s)</label><input type="text" class="form-control" value="${esc(r.agents||'')}" data-form-path="q11Directives.${i}.agents"></div>
        <div class="col-md-6"><label class="form-label">Name of any Alternate Agent(s) or Surrogate(s)</label><input type="text" class="form-control" value="${esc(r.alternates||'')}" data-form-path="q11Directives.${i}.alternates"></div>
        <div class="col-md-6"><label class="form-label">Contact information for Agent(s)/Surrogate(s)</label><input type="text" class="form-control" value="${esc(r.contact||'')}" data-form-path="q11Directives.${i}.contact"></div>
        <div class="col-md-6"><label class="form-label" for="q11dir_${i}_revoked">Has a Court suspended or revoked the Order/Directive?</label>
          <div class="form-check"><input class="form-check-input" type="checkbox" id="q11dir_${i}_revoked" ${r.courtRevoked==='Yes'?'checked':''} data-form-path="q11Directives.${i}.courtRevoked" data-form-value="yes-no"></div>
        </div>
        <div class="col-md-6"><label class="form-label">Date of Order</label><input type="date" class="form-control" value="${esc(r.orderDate||'')}" data-form-path="q11Directives.${i}.orderDate"></div>
        <div class="col-md-6"><label class="form-label">County/State entered</label><input type="text" class="form-control" value="${esc(r.orderCounty||'')}" data-form-path="q11Directives.${i}.orderCounty"></div>
      </div></div>
    </div>`;
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
      chkP('q11Executed','The ward executed advance directives (complete below)',d.q11Executed)
      +planCheckGroup('',
        cb('q11ExecDNR','Order Not to Resuscitate, F.S. 401.45(3) ("DNR")')
        +cb('q11ExecHealthcare','Advance Directive for Healthcare (healthcare surrogate, living will, or anatomical gift)')
        +cb('q11ExecPOA','Durable Power of Attorney, F.S. Chapter 709')
        +cb('q11ExecOther','Other'),
        'q11ExecOtherText',d.q11ExecOtherText,d.q11ExecOther,'Describe the "Other" directive.')
      +dirs)}
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
      yesNoCheckboxS('committeeIncorporated','',d.committeeIncorporated)
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
    const set=f=>`D.planGuardians[${i}].${f}=this.value;autoSave();updateNavDots()`;
    return `<div class="plan-sig-block">
      <h3>${title}</h3>
      <div class="row g-2">
        <div class="col-md-6"><label class="form-label">Name</label><input type="text" class="form-control" value="${esc(gd.name||'')}" data-form-path="planGuardians.${i}.name" data-form-format="name"></div>
        <div class="col-md-6"><label class="form-label">Relationship to Ward</label><input type="text" class="form-control" value="${esc(gd.relationship||'')}" data-form-path="planGuardians.${i}.relationship"></div>
        <div class="col-md-4"><label class="form-label">SSN/EIN</label><div class="ssn-mask-wrap"><input type="password" autocomplete="off" class="form-control" value="${esc(gd.ssn||'')}" data-form-path="planGuardians.${i}.ssn" data-form-format="ssn"><button type="button" class="ssn-reveal-btn" aria-label="Show SSN/EIN" data-form-action="toggle-ssn">${ic('lock',14)}</button></div></div>
        <div class="col-md-4"><label class="form-label">Phone Number</label><input type="text" class="form-control" value="${esc(gd.phone||'')}" data-form-path="planGuardians.${i}.phone" data-form-format="phone"></div>
        <div class="col-md-4"><label class="form-label">Date Signed</label><input type="date" class="form-control" value="${esc(gd.signatureDate||'')}" data-form-path="planGuardians.${i}.signatureDate"></div>
        <div class="col-md-6"><label class="form-label">Street Address</label><input type="text" class="form-control" value="${esc(gd.street||'')}" data-form-path="planGuardians.${i}.street"></div>
        <div class="col-md-6"><label class="form-label">City/State/Zip</label><input type="text" class="form-control" value="${esc(gd.cityStateZip||'')}" data-form-path="planGuardians.${i}.cityStateZip"></div>
      </div>
    </div>`;
  };
  return `<div class="schedule-page">
    <h1>Certification and Signature of Guardian(s)</h1>
    <div class="schedule-instructions">If the Ward's ability to exercise rights has changed since the Order Determining Capacity and Appointing Guardian, the guardian must file a Petition to Remove or Petition to Restore Rights, as appropriate.</div>
    ${planCheckGroup('Check all that apply:',
      cb('certIncapacitatedNoCopy','The Ward was declared totally incapacitated and has not been given a copy of this plan')
      +cb('certMinorNoCopy','The Ward is a minor under the age of 14 and has not been given a copy of this plan')
      +cb('certConsulted',"The guardian has consulted with the Ward, to the extent reasonable, has honored the Ward's wishes, and to the maximum extent possible the plan is in accordance with the Ward's wishes or consistent with the rights retained by the Ward")
      +cb('certRecognizeRights','In exercising his or her powers, the guardian shall recognize any rights retained by the ward (F.S. 744.363(6))')
      +cb('certNoRestriction','The plan does not restrict the physical liberty of the Ward except as necessary to protect the Ward and others from serious physical injury, illness, or disease')
      +cb('certProvidesCare',"The plan provides for the Ward's medical care and mental health treatment"),
      null,null,false)}
    <p style="font-size:.85rem;color:var(--ink-3);margin:.5rem 0 1rem;">Under penalties of perjury, each signing guardian declares they have read and examined the foregoing plan, and the facts alleged are true, to the best of their knowledge and belief.</p>
    ${g(0,'Guardian')}
    ${g(1,'Co-Guardian')}
    ${g(2,'Co-Guardian')}
    ${g(3,'Co-Guardian')}
    <div class="schedule-instructions mt-2">All guardians of the person must sign and provide their most current address, telephone number, and SSN. Only reports with original signatures will be audited by the Clerk of the Court.</div>
    ${renderScheduleDocsSection('planISignatures')}
    ${pageNavS('/p8','/p10')}
  </div>`;
}

function pagePlanIAttorney(){
  const d=window.D;
  return `<div class="schedule-page">
    <h1>Certification and Signature of Guardian's Attorney</h1>
    <div class="schedule-instructions">The undersigned notifies the Court of the filing of the initial guardianship plan for the stated period. This is the representation of the guardian; the attorney has not audited the accompanying plan, but represents that they have examined its contents and that it conforms to the requirements of Florida Guardianship Law and the standards for plans in the selected county.</div>
    <div class="row g-3">
      <div class="col-md-6">${inpS('attorney_name','Attorney Name',d.attorney_name)}</div>
      <div class="col-md-6">${inpS('attorney_bar','Attorney Bar Number',d.attorney_bar)}</div>
      <div class="col-12">${inpS('attorney_street','Attorney Address',d.attorney_street)}</div>
      <div class="col-md-8">${inpS('attorney_cityStateZip','Attorney City/State/Zip',d.attorney_cityStateZip)}</div>
      <div class="col-md-4">${inpS('attorney_phone','Attorney Phone Number',d.attorney_phone)}</div>
      <div class="col-md-6">${inpS('attorney_signatureDate','Date Signed',d.attorney_signatureDate,false,'date')}</div>
    </div>
    ${renderScheduleDocsSection('planIAttorney')}
    ${pageNavS('/p9','/print')}
  </div>`;
}

export function validatePlanInitial(){
  const d=window.D;
  const errs=[];
  const req=(v,label)=>{if(v===''||v===null||v===undefined||v===false)errs.push(label);};
  req(d.wardName,'Cover — Name of Ward is required');
  req(d.caseNumber,'Cover — Case Number is required');
  req(d.county,'Cover — County is required');
  req(d.inceptionDate,'Cover — Guardianship Inception Date is required');
  req(d.lettersSignedDate,'Cover — Date Letters Were Signed is required');
  req(d.guardianNames,'Cover — Guardian Name(s) is required');
  req(d.wardLiving,'Cover — Where the ward is living is required');
  req(d.residenceAddress,'Cover — Address where ward resides is required');
  req(d.residenceCityStateZip,'Cover — City/State/ZIP is required');

  req(d.q2Setting,'2–3. Setting & Medical Care — Best-suited residential setting is required');
  if(d.q2Setting==='Other')req(d.q2Explain,'2–3. Setting & Medical Care — Explanation for "Other" residential setting is required');
  const anyMed=d.q3MedPrimary||d.q3MedDentist||d.q3MedOphthalmologist||d.q3MedSpecialist||d.q3MedPT||d.q3MedST||d.q3MedOT||d.q3MedWardDecides||d.q3MedOther;
  if(!anyMed)errs.push('2–3. Setting & Medical Care — At least one medical service option is required');
  if(d.q3MedSpecialist)req(d.q3MedSpecialistArea,'2–3. Setting & Medical Care — Specialist area of specialty is required');
  if(d.q3MedOther)req(d.q3MedExplain,'2–3. Setting & Medical Care — Explanation for "Other" medical service is required');

  req(d.q4Mental,'4–5. Mental Health & Personal Care — Mental health service provision is required');
  if(d.q4Mental==='Other'||d.q4Mental==='None')req(d.q4Explain,'4–5. Mental Health & Personal Care — Explanation is required');
  req(d.q5Personal,'4–5. Mental Health & Personal Care — Personal care provision is required');
  if(d.q5Personal==='Other')req(d.q5Explain,'4–5. Mental Health & Personal Care — Explanation for "Other" personal care is required');

  const anySocial=d.q6CareFacility||d.q6NursesAides||d.q6FamilyFriends||d.q6DayProgram||d.q6WardDecides||d.q6Other;
  if(!anySocial)errs.push('6–7. Socialization & Benefits — At least one socialization/recreation option is required');
  if(d.q6Other)req(d.q6Explain,'6–7. Socialization & Benefits — Explanation for "Other" socialization is required');
  if(d.q7Trusts||d.q7PendingBenefits||d.q7Other)req(d.q7Explain,'6–7. Socialization & Benefits — Explanation is required for Trusts, Pending Benefits, or Other');

  (d.q9Providers||[]).forEach((r,i)=>{
    if(r&&(r.providerType||r.examDate||r.street||r.cityStateZip||r.phone)&&!r.name)
      errs.push(`9. Examining Providers — Row ${i+1}: Provider name is required`);
  });

  const missingAdls=INITIAL_ADLS.filter(([k])=>!d.adls||!d.adls[k]).length;
  if(missingAdls>0)errs.push(`10A. Daily Living — ${missingAdls} of ${INITIAL_ADLS.length} activities not yet rated`);

  const anyMental=d.mentalAlzheimers||d.mentalAutism||d.mentalClosedHeadInjury||d.mentalDementia||d.mentalDepression||d.mentalDevelopmental||d.mentalSubstance||d.mentalSchizophrenia||d.mentalOther;
  if(!anyMental)errs.push('10B–D. Disabilities & Devices — At least one mental disability option is required (or note none apply)');
  if(d.mentalOther)req(d.mentalExplain,'10B–D. Disabilities & Devices — Explanation for "Other" mental disability is required');
  const anyPhys=d.physMobility||d.physBlindness||d.physDeafness||d.physDiabetic||d.physParkinsons||d.physArthritis||d.physOther;
  if(!anyPhys)errs.push('10B–D. Disabilities & Devices — At least one physical disability option is required (or note none apply)');
  if(d.physOther)req(d.physExplain,'10B–D. Disabilities & Devices — Explanation for "Other" physical disability is required');
  const anyUses=d.usesDentures||d.usesHearingAid||d.usesWheelchair||d.usesWalker||d.usesCrutches||d.usesProsthetics||d.usesGlasses||d.usesNone||d.usesOther;
  if(!anyUses)errs.push('10B–D. Disabilities & Devices — Assistive devices currently used is required (or select None)');
  if(d.usesOther)req(d.usesExplain,'10B–D. Disabilities & Devices — Explanation for "Other" device currently used is required');

  if(!!d.q11NoDirectives===!!d.q11Executed)errs.push('11. Advance Directives — Select exactly one: no pre-existing directives, or directives were executed');
  if(d.q11ExecOther)req(d.q11ExecOtherText,'11. Advance Directives — Description of "Other" advance directive is required');
  const anyNeeds=d.needsDentures||d.needsHearingAid||d.needsWheelchair||d.needsWalker||d.needsCrutches||d.needsProsthetics||d.needsGlasses||d.needsNone||d.needsOther;
  if(!anyNeeds)errs.push('11. Advance Directives — Assistive devices needed is required (or select None)');
  if(d.needsOther)req(d.needsExplain,'11. Advance Directives — Explanation for "Other" device needed is required');
  req(d.committeeIncorporated,'11. Advance Directives — Whether examining-committee recommendations are incorporated is required');
  if(d.committeeIncorporated==='No')req(d.committeeExplain,'11. Advance Directives — Explanation is required when recommendations are not incorporated');

  const anyCert=d.certIncapacitatedNoCopy||d.certMinorNoCopy||d.certConsulted||d.certRecognizeRights||d.certNoRestriction||d.certProvidesCare;
  if(!anyCert)errs.push('Signatures — At least one certification statement must be checked');
  const g0=(d.planGuardians||[])[0]||{};
  req(g0.name,'Signatures — Guardian name is required');
  req(g0.signatureDate,'Signatures — Guardian signature date is required');

  req(d.attorney_name,'Attorney Certification — Attorney name is required');
  req(d.attorney_signatureDate,'Attorney Certification — Attorney signature date is required');

  return errs;
}
