// Annual Guardianship Plan — the third feature extraction (Milestone 4,
// Phases A and B of INDEX-SPLIT-PLAN.md's migration sequence). Dynamically
// imported by legacy-app.js's mountPlanAnnualFeature()/mountPlanAnnualNav()
// bridge (built on src/core/feature-bridge.js), never statically imported.
//
// legacy-app.js stays a classic (non-module) script (Milestone 1's recorded
// decision), so its top-level function declarations are real `window`
// properties this module can destructure -- but a bare top-level `let`
// (activeInventoryType, currentPage) is not; see src/core/state.js's file
// header for the full explanation. Everything below that isn't defined in
// this file is one of those legacy globals, deliberately left in place
// rather than moved: `planQ`/`planCheckGroup`/`planEmptyRow`/`addPlanRow`/
// `removePlanRow`/`duplicatePlanRow`/`txtP`/`chkP`/`radioP`/`pageNavS` are
// still shared with the two not-yet-extracted Plan types (planInitial,
// planMinor); `PLAN_RIGHTS`/`PLAN_RIGHT_STATES`/`PLAN_ADLS`/
// `PLAN_ADL_RATINGS`/`PLAN_BENEFITS` stay legacy because
// computeNavChecks()'s planAnnual branch reads them directly (see the
// Milestone 4 plan's "Confirmed facts" and "Design decisions").
const {
  esc, ic, loadWardInfoBanner, inpS, countyInputS, radioP, pageNavS,
  renderScheduleDocsSection, txtP, chkP, planQ, planCheckGroup,
  formatName, formatPhone, formatSSN, formatAddress, toggleSsnReveal,
  PLAN_RIGHTS, PLAN_RIGHT_STATES, PLAN_ADLS, PLAN_ADL_RATINGS, PLAN_BENEFITS,
} = window;

// print.js is dynamically imported only when the user reaches /print or
// triggers PDF export (Milestone 4, Phase B) -- same lazy boundary as the
// other two extracted features. No excel.js: no Plan filing type has Excel
// support (confirmed by grep -- see the Milestone 4 plan's "Confirmed
// facts").
let _printModule = null;
let _printModulePromise = null;
function ensurePrintModule() {
  if (_printModule) return Promise.resolve();
  if (!_printModulePromise) {
    _printModulePromise = import('./print.js').then((mod) => {
      _printModule = mod;
      // Referenced by name from rendered onclick="..." HTML attributes
      // (doSavePdfPlanAnnual) or from legacy-app.js's shared
      // planReadinessChecks() dispatcher (planReadinessChecksAnnual, still
      // called for the two not-yet-extracted Plan types too) -- both only
      // ever resolve against the global scope, never a module's own scope,
      // so both must be real `window` properties.
      window.doSavePdfPlanAnnual = () => _printModule.doSavePdf();
      window.planReadinessChecksAnnual = () => _printModule.planReadinessChecksAnnual();
    });
  }
  return _printModulePromise;
}

export async function mount(container, page) {
  let html;
  if (page === '/print') {
    await ensurePrintModule();
    html = _printModule.pagePrintPlanAnnual();
  } else {
    switch (page) {
      case '/':    html = pagePlanACover(); break;
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
      default:     html = pagePlanACover();
    }
  }
  container.innerHTML = html;
  container.scrollTop = 0;
}

export function dispose(container) {
  // All pagePlanA*() renderers return HTML strings with inline onclick=/
  // oninput= attributes, not addEventListener-bound listeners -- clearing
  // the container is genuinely sufficient cleanup. See INDEX-SPLIT-PLAN.md's
  // module contract, the renderTrustedHtml() accommodation for migrated
  // string-returning renderers.
  container.replaceChildren();
}

export function mountNav(container) {
  buildNavPlanAnnual(container);
}

function buildNavPlanAnnual(container){
  const item=(route,nav,label)=>`<button class="nav-link-item" data-page="${route}" data-nav="${nav}" onclick="navigate('${route}')">${label}</button>`;
  container.innerHTML=`
    <div class="nav-section">
      <div class="nav-section-label">Annual Guardianship Plan</div>
      ${item('/','pa-cover','Cover')}
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
    </div>
    <div class="nav-section">
      <div class="nav-section-label">Output</div>
      <button class="nav-link-item" data-page="/print" onclick="navigate('/print')"><span class="nav-link-label">${ic('file',15)}&nbsp; Print Preview</span></button>
    </div>
  `;
}

function pagePlanACover(){
  const d=window.D;
  return `<div class="schedule-page">
    <h1>Annual Guardianship Plan — Cover</h1>
    <div class="schedule-instructions">This plan reports on the ward as a person: where they live, the care they receive, their abilities and their rights. It is a separate filing from any accounting, which reports on their money and property. <strong>A physician's report must be filed separately at the same time</strong> — the app does not produce it.</div>
    ${loadWardInfoBanner()}
    <div class="row g-3">
      <div class="col-md-6">${inpS('wardName','Name of Ward',d.wardName,true)}</div>
      <div class="col-md-6">${inpS('caseNumber','Case Number',d.caseNumber,true)}</div>
      <div class="col-md-4">${inpS('ssn','Social Security Number',d.ssn)}</div>
      <div class="col-md-4">${countyInputS('county','County',d.county,true)}</div>
      <div class="col-md-4">${inpS('gid','Guardianship Inception Date',d.gid,true,'date')}</div>
      <div class="col-md-6">${inpS('periodFrom','Reporting Period From',d.periodFrom,true,'date')}</div>
      <div class="col-md-6">${inpS('periodTo','Reporting Period To',d.periodTo,true,'date')}</div>
      <div class="col-md-6">${inpS('guardian','Guardian Name(s)',d.guardian,true)}</div>
      <div class="col-md-6">${inpS('attorney','Attorney Name',d.attorney)}</div>
    </div>
    <h2 class="subsection-heading mt-4">Where the Ward Currently Lives</h2>
    ${radioP('wardLiving','The ward is living:',d.wardLiving,[
      'In a private residence leased or owned by them',
      'In a private residence not leased or owned by them',
      'In a facility (skilled nursing, assisted living, etc.)'],true)}
    <div class="row g-3">
      <div class="col-12">${inpS('residenceAddress','Address Where Ward Resides',d.residenceAddress,true)}</div>
      <div class="col-md-8">${inpS('residenceCityStateZip','City / State / ZIP',d.residenceCityStateZip,true)}</div>
      <div class="col-md-4">${inpS('residencePhone','Phone',d.residencePhone)}</div>
      <div class="col-12">${inpS('mailingAddress','Mailing Address (if different)',d.mailingAddress)}</div>
      <div class="col-md-8">${inpS('mailingCityStateZip','Mailing City / State / ZIP',d.mailingCityStateZip)}</div>
    </div>
    ${renderScheduleDocsSection('planACover')}
    ${pageNavS(null,'/p2')}
  </div>`;
}

function pagePlanAResidences(){
  const d=window.D;
  const rows=(d.q1Residences||[]).map((r,i)=>{
    const set=f=>`D.q1Residences[${i}].${f}=this.value;autoSave();updateNavDots()`;
    return `<div class="entry-card mb-2">
      <div class="entry-card-header">Residence ${i+1}
        <button class="btn btn-sm btn-outline-secondary ms-auto" title="Add a copy of this row below" onclick="duplicatePlanRow('q1Residences',${i},'/p2')">${ic('copy',13)}</button>
        <button class="btn btn-sm btn-outline-danger" onclick="removePlanRow('q1Residences',${i},'/p2')">×</button>
      </div>
      <div class="entry-card-body"><div class="row g-2">
        <div class="col-md-6"><label class="form-label">Facility name, or owner of the private residence<span class="req">*</span></label><input type="text" class="form-control" value="${esc(r.name||'')}" oninput="${set('name')}"></div>
        <div class="col-md-6"><label class="form-label">Type of facility</label><input type="text" class="form-control" placeholder="e.g. Assisted Living, Private Residence" value="${esc(r.facilityType||'')}" oninput="${set('facilityType')}"></div>
        <div class="col-md-6"><label class="form-label">Street address</label><input type="text" class="form-control" value="${esc(r.street||'')}" oninput="${set('street')}"></div>
        <div class="col-md-6"><label class="form-label">City, State and ZIP</label><input type="text" class="form-control" value="${esc(r.cityStateZip||'')}" oninput="${set('cityStateZip')}"></div>
        <div class="col-md-4"><label class="form-label">Phone number</label><input type="text" class="form-control" value="${esc(r.phone||'')}" oninput="this.value=formatPhone(this.value);${set('phone')}"></div>
        <div class="col-md-4"><label class="form-label">Resided from</label><input type="date" class="form-control" value="${esc(r.from||'')}" oninput="${set('from')}"></div>
        <div class="col-md-4"><label class="form-label">Resided to</label><input type="date" class="form-control" value="${esc(r.to||'')}" oninput="${set('to')}"></div>
      </div></div>
    </div>`;
  }).join('');
  return `<div class="schedule-page">
    <h1>1. Places the Ward Has Lived</h1>
    <div class="schedule-instructions">List every place the ward resided during the prior 12 months, earliest first. The court checks this against the address on file — if the ward moved, question 2 on the next page asks how that move was handled.</div>
    ${rows||`<div class="schedule-empty">${ic('folder',17)}<span>No residences listed yet.</span></div>`}
    <button class="btn btn-outline-primary btn-sm mb-2" onclick="addPlanRow('q1Residences','residence','/p2')">+ Add Residence</button>
    ${renderScheduleDocsSection('planAResidences')}
    ${pageNavS('/','/p3')}
  </div>`;
}

function pagePlanACarePlan(){
  const d=window.D;
  const cb=(id,label)=>chkP(id,label,d[id]);
  return `<div class="schedule-page">
    <h1>2–3. Residence Change &amp; Care Plan</h1>
    ${planQ(2,"If the ward's address has changed since the last plan was filed",
      `<div class="plan-check-grid">
        ${cb('q2NoMove','N/A — the ward has not moved since the last plan was filed')}
        ${cb('q2WithinCounty','The move was within this county and a change of address was provided to the court')}
        ${cb('q2WithinCircuit','The move was within this Circuit and notice was provided to the court within 15 days')}
        ${cb('q2OutsideApproved','The move was outside this Circuit and prior court approval was obtained')}
        ${cb('q2OutsideVenuePetition','The move was outside this Circuit and a petition to change venue is filed with this plan')}
      </div>`,'Check all that apply.')}
    ${planQ(3,'For the best welfare of the ward, the guardian plans as follows',
      planCheckGroup("The residential setting best suited to the ward's needs is:",
        [cb('q3SettingALF','Assisted Living (ALF)'),cb('q3SettingGroupHome','Group Home'),
         cb('q3SettingIntermediate','Intermediate'),cb('q3SettingPrivate','Private Residence'),
         cb('q3SettingSkilled','Skilled Nursing'),cb('q3SettingSpecialized','Specialized'),
         cb('q3SettingStateHospital','State Hospital'),cb('q3SettingOther','Other')].join(''),
        'q3SettingExplain',d.q3SettingExplain,d.q3SettingOther)
      +planCheckGroup('The guardian will ensure this remains the best setting by:',
        [cb('q3EnsureAssessing','Periodically assessing needs'),
         cb('q3EnsureWardDecides','The ward retains the right to decide'),
         cb('q3EnsureNoChange','No change, unless required by medical condition')].join(''),'','',false)
      +planCheckGroup('Provision for medical care services:',
        [cb('q3MedPrimary','Routine examination by primary care physician'),
         cb('q3MedDentist','Routine examination by dentist'),
         cb('q3MedOphthalmologist','Routine examination by ophthalmologist'),
         cb('q3MedSpecialist','Routine examination by specialist'),
         cb('q3MedPhysicalTherapy','Physical therapy'),cb('q3MedSpeechTherapy','Speech therapy'),
         cb('q3MedOccupationalTherapy','Occupational therapy'),
         cb('q3MedWardDecides','The ward retains the right to make their own decision'),
         cb('q3MedNone','None'),cb('q3MedOther','Other')].join(''),
        'q3MedExplain',d.q3MedExplain,d.q3MedOther||d.q3MedNone)
      +(d.q3MedSpecialist?`<div class="plan-conditional mb-3">${inpS('q3MedSpecialistArea','Area of specialty',d.q3MedSpecialistArea,true)}</div>`:'')
      +planCheckGroup('Provision for mental health services:',
        [cb('q3MentalPsych','Routine examination by psychiatrist / psychologist'),
         cb('q3MentalWardDecides','Ward retains the right to make own decisions'),
         cb('q3MentalOutpatient','Ongoing treatment — outpatient'),
         cb('q3MentalInpatient','Ongoing treatment — inpatient'),
         cb('q3MentalNone','None'),cb('q3MentalOther','Other')].join(''),
        'q3MentalExplain',d.q3MentalExplain,d.q3MentalOther||d.q3MentalNone)
      +planCheckGroup('Provision for personal care (bathing, grooming, feeding):',
        [cb('q3PersonalFacility','Care facility'),cb('q3PersonalNurses','Nurses and aides'),
         cb('q3PersonalFamily','Family and friends'),cb('q3PersonalWithout','Ward does without assistance'),
         cb('q3PersonalNone','None; ward can provide own personal care'),cb('q3PersonalOther','Other')].join(''),
        'q3PersonalExplain',d.q3PersonalExplain,d.q3PersonalOther||d.q3PersonalNone)
      +planCheckGroup('Provision for socialization and recreational activities:',
        [cb('q3SocialFacility','Care facility'),cb('q3SocialNurses','Nurses and aides'),
         cb('q3SocialFamily','Family and friends'),
         cb('q3SocialWardDecides','The ward retains the right to make their own decision'),
         cb('q3SocialNone','None'),cb('q3SocialOther','Other')].join(''),
        'q3SocialExplain',d.q3SocialExplain,d.q3SocialOther||d.q3SocialNone))}
    ${renderScheduleDocsSection('planACarePlan')}
    ${pageNavS('/p2','/p4')}
  </div>`;
}

function pagePlanABenefits(){
  const d=window.D;
  const b=d.benefits||{};
  const rows=PLAN_BENEFITS.map(([k,label])=>{
    const v=b[k]||{};
    const set=f=>`D.benefits['${k}'].${f}=this.checked;autoSave();updateNavDots()`;
    return `<tr>
      <td>${label}</td>
      <td class="text-center"><input class="form-check-input" type="checkbox" ${v.eligible?'checked':''} onchange="${set('eligible')}" aria-label="${esc(label)} — eligible"></td>
      <td class="text-center"><input class="form-check-input" type="checkbox" ${v.appliedFor?'checked':''} onchange="${set('appliedFor')}" aria-label="${esc(label)} — applied for"></td>
    </tr>`;
  }).join('');
  return `<div class="schedule-page">
    <h1>3G. Insurance &amp; Benefits</h1>
    <div class="schedule-instructions">Health and accident insurance, and any private or governmental benefits the ward receives toward the cost of medical, mental health or related services. Mark whether the ward is <strong>eligible</strong> for each, and whether you have <strong>applied</strong> for it.</div>
    <table class="table plan-benefits-table">
      <thead><tr><th>Benefit</th><th class="text-center" style="width:7rem">Eligible</th><th class="text-center" style="width:7rem">Applied for</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="plan-check-grid mt-3">
      ${chkP('q3BenefitsNone','None of the above',d.q3BenefitsNone)}
      ${chkP('q3BenefitsOther','Other (explain below)',d.q3BenefitsOther)}
    </div>
    ${(d.q3BenefitsOther||d.q3BenefitsNone)?`<div class="plan-conditional mt-2">${txtP('q3BenefitsExplain','Explanation',d.q3BenefitsExplain,3)}</div>`:''}
    ${renderScheduleDocsSection('planABenefits')}
    ${pageNavS('/p3','/p5')}
  </div>`;
}

function pagePlanAProviders(){
  const d=window.D;
  const rows=(d.q4Providers||[]).map((r,i)=>{
    const set=f=>`D.q4Providers[${i}].${f}=this.value;autoSave();updateNavDots()`;
    return `<div class="entry-card mb-2">
      <div class="entry-card-header">Provider ${i+1}
        <button class="btn btn-sm btn-outline-secondary ms-auto" title="Add a copy of this row below" onclick="duplicatePlanRow('q4Providers',${i},'/p5')">${ic('copy',13)}</button>
        <button class="btn btn-sm btn-outline-danger" onclick="removePlanRow('q4Providers',${i},'/p5')">×</button>
      </div>
      <div class="entry-card-body"><div class="row g-2">
        <div class="col-md-6"><label class="form-label">Provider's first name, last name, middle initial<span class="req">*</span></label><input type="text" class="form-control" value="${esc(r.name||'')}" oninput="${set('name')}"></div>
        <div class="col-md-3"><label class="form-label">Type of provider</label><input type="text" class="form-control" placeholder="e.g. Primary Care Physician" value="${esc(r.providerType||'')}" oninput="${set('providerType')}"></div>
        <div class="col-md-3"><label class="form-label">Number of visits</label><input type="text" class="form-control" value="${esc(r.visits||'')}" oninput="${set('visits')}"></div>
        <div class="col-md-6"><label class="form-label">Street address</label><input type="text" class="form-control" value="${esc(r.street||'')}" oninput="${set('street')}"></div>
        <div class="col-md-4"><label class="form-label">City, State and ZIP</label><input type="text" class="form-control" value="${esc(r.cityStateZip||'')}" oninput="${set('cityStateZip')}"></div>
        <div class="col-md-2"><label class="form-label">Phone</label><input type="text" class="form-control" value="${esc(r.phone||'')}" oninput="this.value=formatPhone(this.value);${set('phone')}"></div>
      </div></div>
    </div>`;
  }).join('');
  return `<div class="schedule-page">
    <h1>4. Professional Medical Treatment</h1>
    <div class="schedule-instructions">Every professional who treated the ward during the prior 12 months — physicians, dentists, therapists, mental health providers. Include how many visits there were; the court uses this to see whether the ward is actually receiving the care the plan promises.</div>
    ${rows||`<div class="schedule-empty">${ic('folder',17)}<span>No providers listed yet.</span></div>`}
    <button class="btn btn-outline-primary btn-sm mb-2" onclick="addPlanRow('q4Providers','provider','/p5')">+ Add Provider</button>
    ${renderScheduleDocsSection('planAProviders')}
    ${pageNavS('/p4','/p6')}
  </div>`;
}

function pagePlanARights(){
  const d=window.D;
  const r=d.rights||{};
  const rows=PLAN_RIGHTS.map(([k,label])=>{
    const cells=PLAN_RIGHT_STATES.map(s=>
      `<td class="text-center"><input class="form-check-input" type="radio" name="right_${k}" ${r[k]===s?'checked':''} onchange="D.rights['${k}']='${s}';autoSave();updateNavDots()" aria-label="${esc(label)} — ${esc(s)}"></td>`).join('');
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
    ${planQ(6,'Is the ward now capable of having any of these rights restored?',
      `<table class="table plan-rights-table">
        <thead><tr><th>Right</th>${PLAN_RIGHT_STATES.map(s=>`<th class="text-center" style="width:9rem">${s}</th>`).join('')}</tr></thead>
        <tbody>${rows}</tbody>
      </table>`,
      'Mark each right with its current status. <strong>"Capable of restoration" is a formal statement</strong> — if the physician\'s report agrees, you must file a separate petition to restore that right. This plan does not restore anything on its own.')}
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
  const d=window.D;
  const a=d.adls||{};
  const rows=PLAN_ADLS.map(([k,label])=>
    `<tr><td>${label}</td><td style="width:16rem">
      <select class="form-select form-select-sm" onchange="D.adls['${k}']=this.value;autoSave();updateNavDots()" aria-label="${esc(label)}">
        ${PLAN_ADL_RATINGS.map(o=>`<option value="${esc(o)}" ${a[k]===o?'selected':''}>${o||'— select —'}</option>`).join('')}
      </select></td></tr>`).join('');
  return `<div class="schedule-page">
    <h1>8. Activities of Daily Living</h1>
    <div class="schedule-instructions">Rate all sixteen honestly, including the ones that haven't changed. The court compares these year over year to see whether the ward's independence is improving or declining, so a blank row is a gap in the record rather than a neutral answer.</div>
    <table class="table plan-adl-table">
      <thead><tr><th>Activity</th><th>Rating</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    ${renderScheduleDocsSection('planAADLs')}
    ${pageNavS('/p6','/p8')}
  </div>`;
}

function pagePlanADisabilities(){
  const d=window.D;
  const cb=(id,label)=>chkP(id,label,d[id]);
  const devices=(prefix)=>[
    cb(prefix+'Dentures','Dentures'),cb(prefix+'HearingAid','Hearing aid'),
    cb(prefix+'Wheelchair','Wheelchair'),cb(prefix+'Walker','Walker / cane'),
    cb(prefix+'Crutches','Crutches'),cb(prefix+'Prosthetics','Prosthetics'),
    cb(prefix+'Glasses','Glasses'),cb(prefix+'None','None'),cb(prefix+'Other','Other')].join('');
  return `<div class="schedule-page">
    <h1>9. Disabilities &amp; Assistive Devices</h1>
    ${planQ(9,'Disabilities and assistive devices',
      planCheckGroup('The mental disabilities of the ward are:',
        [cb('q9MentalDementia','Dementia'),cb('q9MentalAlzheimers',"Alzheimer's type of dementia"),
         cb('q9MentalAutism','Autism spectrum disorders'),cb('q9MentalHeadInjury','Closed head injury'),
         cb('q9MentalDevelopmental','Developmental disabilities'),cb('q9MentalIntellectual','Intellectual disability'),
         cb('q9MentalSchizophrenia','Schizophrenia or related disorders'),cb('q9MentalDepression','Depression'),
         cb('q9MentalSubstance','Induced by substance abuse'),
         cb('q9MentalNone','Ward has no mental disabilities'),cb('q9MentalOther','Other')].join(''),
        'q9MentalExplain',d.q9MentalExplain,d.q9MentalOther)
      +planCheckGroup('The physical disabilities of the ward are:',
        [cb('q9PhysMobility','Mobility'),cb('q9PhysBlindness','Blindness'),
         cb('q9PhysDeafness','Deafness'),cb('q9PhysDiabetic','Diabetic'),
         cb('q9PhysParkinsons',"Parkinson's disease"),cb('q9PhysArthritis','Severe arthritis'),
         cb('q9PhysNone','Ward has no physical disabilities'),cb('q9PhysOther','Other')].join(''),
        'q9PhysExplain',d.q9PhysExplain,d.q9PhysOther)
      +planCheckGroup('Assistive devices the ward currently uses:',devices('q9Uses'),
        'q9UsesExplain',d.q9UsesExplain,d.q9UsesOther)
      +planCheckGroup('Assistive devices the ward needs but does not yet have:',devices('q9Needs'),
        'q9NeedsExplain',d.q9NeedsExplain,d.q9NeedsOther))}
    ${renderScheduleDocsSection('planADisabilities')}
    ${pageNavS('/p7','/p9')}
  </div>`;
}

function pagePlanADirectives(){
  const d=window.D;
  const cb=(id,label)=>chkP(id,label,d[id]);
  const blocks=(d.q10Directives||[]).map((r,i)=>{
    const set=f=>`D.q10Directives[${i}].${f}=this.value;autoSave();updateNavDots()`;
    return `<div class="entry-card mb-2">
      <div class="entry-card-header">Directive ${i+1}
        <button class="btn btn-sm btn-outline-danger ms-auto" onclick="removePlanRow('q10Directives',${i},'/p9')">×</button>
      </div>
      <div class="entry-card-body"><div class="row g-2">
        <div class="col-md-6"><label class="form-label">Title of the order or directive</label><input type="text" class="form-control" value="${esc(r.title||'')}" oninput="${set('title')}"></div>
        <div class="col-md-3"><label class="form-label">Date executed / signed</label><input type="date" class="form-control" value="${esc(r.dateSigned||'')}" oninput="${set('dateSigned')}"></div>
        <div class="col-md-3"><label class="form-label">Name of person who signed</label><input type="text" class="form-control" value="${esc(r.signedBy||'')}" oninput="${set('signedBy')}"></div>
        <div class="col-md-6"><label class="form-label">Designated agent(s) or surrogate(s)</label><input type="text" class="form-control" value="${esc(r.agents||'')}" oninput="${set('agents')}"></div>
        <div class="col-md-6"><label class="form-label">Alternate agent(s) or surrogate(s)</label><input type="text" class="form-control" value="${esc(r.alternates||'')}" oninput="${set('alternates')}"></div>
        <div class="col-md-6"><label class="form-label">Relationship of agent(s) to the ward</label><input type="text" class="form-control" value="${esc(r.relationship||'')}" oninput="${set('relationship')}"></div>
        <div class="col-md-6"><label class="form-label">Contact information for agent(s)</label><input type="text" class="form-control" value="${esc(r.contact||'')}" oninput="${set('contact')}"></div>
        <div class="col-md-4"><label class="form-label">Has a court suspended or revoked it?</label>
          <select class="form-select" onchange="${set('courtRevoked')}">
            <option value="" ${!r.courtRevoked?'selected':''}>— select —</option>
            <option value="No" ${r.courtRevoked==='No'?'selected':''}>No</option>
            <option value="Yes" ${r.courtRevoked==='Yes'?'selected':''}>Yes</option>
          </select></div>
        ${r.courtRevoked==='Yes'?`
        <div class="col-md-4"><label class="form-label">Date of order</label><input type="date" class="form-control" value="${esc(r.orderDate||'')}" oninput="${set('orderDate')}"></div>
        <div class="col-md-4"><label class="form-label">Entered in (county / state)</label><input type="text" class="form-control" value="${esc(r.orderCounty||'')}" oninput="${set('orderCounty')}"></div>`:''}
      </div></div>
    </div>`;
  }).join('');
  return `<div class="schedule-page">
    <h1>10. Advance Directives</h1>
    ${planQ(10,'Pre-existing orders and advance directives',
      `<div class="plan-check-grid">${cb('q10NoDirectives','There are NO pre-existing DNR orders or other advance directives')}</div>
      ${d.q10NoDirectives?`<div class="plan-conditional mt-2 mb-3">
        <label class="form-label">Steps taken to verify there are none:</label>
        <div class="plan-check-grid">
          ${cb('q10StepResidence',"Search of ward's prior and current residence")}
          ${cb('q10StepSafeDeposit',"Inventory of ward's safe deposit box")}
          ${cb('q10StepInterviewed','Interviewed family and friends')}
          ${cb('q10StepMedicalProviders',"Requested documents from the ward's medical providers")}
          ${cb('q10StepAttorney',"Requested documents from the ward's attorney")}
        </div></div>`:''}
      <div class="plan-check-grid mt-2">${cb('q10Executed','The ward executed the following advance directives')}</div>
      ${d.q10Executed?`<div class="plan-conditional mt-2">
        <div class="plan-check-grid">
          ${cb('q10ExecDNR','Order Not to Resuscitate (DNR), F.S. 401.45(3)')}
          ${cb('q10ExecHealthcare','Advance Directive for Healthcare (surrogate, living will, anatomical gift)')}
          ${cb('q10ExecPOA','Durable Power of Attorney, F.S. Chapter 709')}
          ${cb('q10ExecOther','Other')}
        </div>
        ${d.q10ExecOther?`<div class="mt-2">${inpS('q10ExecOtherText','Describe the other directive',d.q10ExecOtherText,true)}</div>`:''}
        <h3 style="font-size:.85rem;font-weight:650;margin:1rem 0 .5rem;">Details for each directive</h3>
        ${blocks}
        <button class="btn btn-outline-primary btn-sm" onclick="addPlanRow('q10Directives','directive','/p9')">+ Add Directive</button>
      </div>`:''}`,
      'If there are no directives, check the first box and record the steps you took to verify that. If the ward did execute directives, check the second box and describe each one.')}
    ${renderScheduleDocsSection('planADirectives')}
    ${pageNavS('/p8','/p10')}
  </div>`;
}

function pagePlanARemuneration(){
  const d=window.D;
  return `<div class="schedule-page">
    <h1>11. Remuneration</h1>
    ${planQ(11,'Declaration of remuneration',
      `<div class="plan-check-grid">${chkP('q11NoRemuneration','I have received NO remuneration from any source for services rendered to or on behalf of the ward',d.q11NoRemuneration)}</div>
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
  const d=window.D;
  const g=d.planGuardians||[];
  const cb=(id,label)=>chkP(id,label,d[id]);
  const block=(i,label)=>{
    const p=g[i]||{};
    const set=f=>`D.planGuardians[${i}].${f}=this.value;autoSave();updateNavDots()`;
    const reqMark=i===0?'<span class="req">*</span>':'';
    return `<div class="plan-sig-block">
      <h3>${label}</h3>
      <div class="row g-2">
        <div class="col-md-6"><label class="form-label">Printed Name${reqMark}</label><input type="text" class="form-control" value="${esc(formatName(p.name||''))}" oninput="this.value=formatName(this.value);${set('name')}"></div>
        <div class="col-md-3"><label class="form-label">Date Signed${reqMark}</label><input type="date" class="form-control" value="${esc(p.signatureDate||'')}" oninput="${set('signatureDate')}"></div>
        <div class="col-md-3"><label class="form-label">SSN / EIN</label><div class="ssn-mask-wrap"><input type="password" autocomplete="off" class="form-control" value="${esc(formatSSN(p.ssn||''))}" oninput="this.value=formatSSN(this.value);${set('ssn')}"><button type="button" class="ssn-reveal-btn" aria-label="Show SSN/EIN" onclick="toggleSsnReveal(this)">${ic('lock',14)}</button></div></div>
        <div class="col-md-4"><label class="form-label">Phone Number</label><input type="text" class="form-control" value="${esc(formatPhone(p.phone||''))}" oninput="this.value=formatPhone(this.value);${set('phone')}"></div>
        <div class="col-md-8"><label class="form-label">Email Address</label><input type="text" class="form-control" value="${esc(p.email||'')}" oninput="${set('email')}"></div>
        <div class="col-md-6"><label class="form-label">Mailing Street Address</label><input type="text" class="form-control" value="${esc(formatAddress(p.mailingStreet||''))}" oninput="this.value=formatAddress(this.value);${set('mailingStreet')}"></div>
        <div class="col-md-6"><label class="form-label">Mailing City / State / ZIP</label><input type="text" class="form-control" value="${esc(p.mailingCityStateZip||'')}" oninput="${set('mailingCityStateZip')}"></div>
        <div class="col-md-6"><label class="form-label">Residence or Office Street Address</label><input type="text" class="form-control" value="${esc(formatAddress(p.officeStreet||''))}" oninput="this.value=formatAddress(this.value);${set('officeStreet')}"></div>
        <div class="col-md-6"><label class="form-label">Residence or Office City / State / ZIP</label><input type="text" class="form-control" value="${esc(p.officeCityStateZip||'')}" oninput="${set('officeCityStateZip')}"></div>
        <div class="col-md-6"><label class="form-label">Relationship to Ward</label><input type="text" class="form-control" value="${esc(p.relationship||'')}" oninput="${set('relationship')}"></div>
      </div>
    </div>`;
  };
  return `<div class="schedule-page">
    <h1>Signatures</h1>
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
    <div class="attestation-text">Under penalties of perjury, I declare that I have read and examined the foregoing plan, and the facts alleged are true, to the best of my knowledge and belief.</div>
    ${block(0,'Guardian')}
    ${block(1,'Co-Guardian (if any)')}
    ${block(2,'Co-Guardian (if any)')}
    <h2 class="subsection-heading mt-4">Certification of Guardian's Attorney</h2>
    <div class="schedule-instructions">The attorney notifies the court of this filing and represents that the plan conforms to Florida Guardianship Law. Leave blank if no attorney is involved.</div>
    <div class="row g-2">
      <div class="col-md-6">${inpS('attorney','Attorney Name',d.attorney)}</div>
      <div class="col-md-3">${inpS('attorney_signatureDate','Date Signed',d.attorney_signatureDate,false,'date')}</div>
      <div class="col-md-3">${inpS('attorney_bar','Bar Number',d.attorney_bar)}</div>
      <div class="col-md-4">${inpS('attorney_phone','Phone Number',d.attorney_phone)}</div>
      <div class="col-md-8">${inpS('attorney_street','Street Address',d.attorney_street)}</div>
      <div class="col-md-12">${inpS('attorney_cityStateZip','City / State / ZIP',d.attorney_cityStateZip)}</div>
    </div>
    ${renderScheduleDocsSection('planASignatures')}
    ${pageNavS('/p10',null)}
  </div>`;
}

export function validatePlanAnnual(){
  const d=window.D;
  const errs=[];
  const req=(v,label)=>{if(v===''||v===null||v===undefined)errs.push(label);};
  req(d.wardName,'Cover — Name of Ward is required');
  req(d.caseNumber,'Cover — Case Number is required');
  req(d.county,'Cover — County is required');
  req(d.gid,'Cover — Guardianship Inception Date is required');
  req(d.periodFrom,'Cover — Reporting Period From is required');
  req(d.periodTo,'Cover — Reporting Period To is required');
  req(d.guardian,'Cover — Guardian Name(s) is required');
  req(d.wardLiving,'Cover — where the ward is living must be answered');
  req(d.residenceAddress,'Cover — address where the ward resides is required');
  req(d.residenceCityStateZip,'Cover — city/state/ZIP where the ward resides is required');

  const res=(d.q1Residences||[]).filter(r=>r&&(r.name||r.street||r.cityStateZip));
  if(!res.length)errs.push('1. Residences — at least one residence must be listed');
  res.forEach((r,i)=>{if(!r.name)errs.push(`1. Residences — row ${i+1} needs a facility or owner name`);});

  if(!(d.q2NoMove||d.q2WithinCounty||d.q2WithinCircuit||d.q2OutsideApproved||d.q2OutsideVenuePetition)){
    errs.push('2–3. Residence & Care — question 2 (address change) must have at least one box checked');
  }
  if(!(d.q3SettingALF||d.q3SettingGroupHome||d.q3SettingIntermediate||d.q3SettingPrivate
     ||d.q3SettingSkilled||d.q3SettingSpecialized||d.q3SettingStateHospital||d.q3SettingOther)){
    errs.push('2–3. Residence & Care — a best-suited residential setting must be selected');
  }
  if(d.q3SettingOther)req(d.q3SettingExplain,'2–3. Residence & Care — explain the "Other" residential setting');
  if(d.q3MedSpecialist)req(d.q3MedSpecialistArea,'2–3. Residence & Care — area of specialty is required');

  const provs=(d.q4Providers||[]).filter(r=>r&&(r.name||r.providerType||r.visits));
  provs.forEach((r,i)=>{if(!r.name)errs.push(`4. Medical Treatment — row ${i+1} needs a provider name`);});

  req(d.q5SocialSkills,'5–7. Skills & Rights — question 5 (social skills) is required');
  req(d.q5Activities,'5–7. Skills & Rights — question 5 (capacity-building activities) is required');
  const rights=d.rights||{};
  const unanswered=PLAN_RIGHTS.filter(([k])=>!rights[k]);
  if(unanswered.length){
    errs.push(`5–7. Skills & Rights — ${unanswered.length} right${unanswered.length===1?'':'s'} still unanswered in question 6`);
  }
  const adls=d.adls||{};
  const unrated=PLAN_ADLS.filter(([k])=>!adls[k]);
  if(unrated.length){
    errs.push(`8. Daily Living — ${unrated.length} activit${unrated.length===1?'y is':'ies are'} still unrated`);
  }

  if(!(d.q9MentalNone||d.q9MentalDementia||d.q9MentalAlzheimers||d.q9MentalAutism||d.q9MentalHeadInjury
     ||d.q9MentalDevelopmental||d.q9MentalIntellectual||d.q9MentalSchizophrenia||d.q9MentalDepression
     ||d.q9MentalSubstance||d.q9MentalOther)){
    errs.push('9. Disabilities & Devices — mental disabilities must be answered, or "no mental disabilities" checked');
  }
  if(!(d.q9PhysNone||d.q9PhysMobility||d.q9PhysBlindness||d.q9PhysDeafness||d.q9PhysDiabetic
     ||d.q9PhysParkinsons||d.q9PhysArthritis||d.q9PhysOther)){
    errs.push('9. Disabilities & Devices — physical disabilities must be answered, or "no physical disabilities" checked');
  }
  if(d.q9MentalOther)req(d.q9MentalExplain,'9. Disabilities & Devices — explain the "Other" mental disability');
  if(d.q9PhysOther)req(d.q9PhysExplain,'9. Disabilities & Devices — explain the "Other" physical disability');

  if(!(d.q10NoDirectives||d.q10Executed)){
    errs.push('10. Advance Directives — answer whether directives exist');
  }
  if(d.q10NoDirectives&&d.q10Executed){
    errs.push('10. Advance Directives — cannot both have no directives and list executed directives');
  }
  if(d.q10ExecOther)req(d.q10ExecOtherText,'10. Advance Directives — describe the "Other" directive');

  if(d.q11NoRemuneration)req(d.q11NoRemunerationName,"11. Remuneration — declaring guardian's name is required");
  else if(!(d.q11ReceivedName||d.q11Amount||d.q11From)){
    errs.push('11. Remuneration — either declare no remuneration, or record what was received');
  }

  const g0=(d.planGuardians||[])[0]||{};
  req(g0.name,'Signatures — Guardian printed name is required');
  req(g0.signatureDate,'Signatures — Guardian date signed is required');
  return errs;
}
