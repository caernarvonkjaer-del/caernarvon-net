// Print/PDF export for the Annual Guardianship Plan (Milestone 4, Phase B).
// Dynamically imported from ./index.js only when the user reaches /print or
// triggers PDF export -- same lazy boundary as the other two extracted
// features.
//
// Statically imports validatePlanAnnual back from ./index.js -- safe
// despite index.js dynamically importing this file, since neither side
// touches the other's export during top-level module evaluation, only
// inside function bodies called later (see
// src/features/simplified-accounting/index.js's comment on the same
// pattern).
import { validatePlanAnnual } from './index.js';
import { buildPlanAnnualModel } from './pdf-model.js';
import { generateCourtFormPdf } from '../../core/pdf/pdf-engine.js';

const {
  circuitCourtCaption, esc, fmtDate,
  highlightErrors, validationPanel, planReadinessPanel,
  renderPage,
  PLAN_RIGHTS, PLAN_RIGHT_STATES, PLAN_ADLS, PLAN_BENEFITS,
} = window;

function docHeaderPlanAnnual(ward,caseNo,section,page){
  return `<div class="doc-header">
    <div class="court-title">${circuitCourtCaption(window.D.county,true)}</div>
    <div class="doc-title">ANNUAL GUARDIANSHIP PLAN</div>
    <div class="doc-meta">
      <span>IN RE: GUARDIANSHIP OF <strong>${ward}</strong></span>
      <span>${section}${page?' — Page '+page:''}</span>
      <span>Case Number: <strong>${caseNo}</strong></span>
    </div>
  </div>`;
}

function buildPrintHTMLPlanAnnual(){
  const d=window.D;
  const ward=esc(d.wardName||'');
  const caseNo=esc(d.caseNumber||'');
  const H=docHeaderPlanAnnual;
  const y=v=>v?'☒':'☐';
  const line=v=>`<div class="doc-answer">${esc(v||'')||'&nbsp;'}</div>`;
  const fld=(label,val)=>`<div class="doc-field-label">${label}</div><div class="doc-signature-line">${esc(val||'')}</div>`;
  // Only render a checkbox row if it is ticked OR nothing in its group is,
  // so the printed document reads as a set of answers rather than a wall of
  // empty boxes — matching how a completed paper form looks.
  const boxes=(items)=>`<div class="doc-checklist">${items.map(([on,label])=>`<div class="doc-check-row">${y(on)} ${esc(label)}</div>`).join('')}</div>`;
  let html='';

  // ── Page 1: cover ─────────────────────────────────────
  html+=`<div class="doc-page">${H(ward,caseNo,'Cover','1')}
  <p style="font-size:.76rem;margin-bottom:.6rem;">Pursuant to F.S. 744.367, this report with original signatures is due within 90 days after the last day of the anniversary month that the letters of guardianship were signed.</p>
  <div class="doc-table-div"><div class="tbl">
    <div class="tr"><div class="td">Social Security Number</div><div class="td">${esc(d.ssn||'')}</div></div>
    <div class="tr"><div class="td">Guardianship Inception Date</div><div class="td">${fmtDate(d.gid)||''}</div></div>
    <div class="tr"><div class="td">For the period</div><div class="td">${fmtDate(d.periodFrom)||''} through ${fmtDate(d.periodTo)||''}</div></div>
    <div class="tr"><div class="td">Guardian Name(s)</div><div class="td">${esc(d.guardian||'')}</div></div>
    <div class="tr"><div class="td">Attorney Name</div><div class="td">${esc(d.attorney||'')}</div></div>
  </div></div>
  <div class="doc-schedule-title">The Ward Is Living</div>
  ${boxes([
    [d.wardLiving==='In a private residence leased or owned by them','In a private residence leased or owned by them (house, condo, apartment).'],
    [d.wardLiving==='In a private residence not leased or owned by them','In a private residence not leased or owned by them (such as a family member).'],
    [d.wardLiving==='In a facility (skilled nursing, assisted living, etc.)','In a facility (skilled nursing, assisted living, etc.).'],
  ])}
  <div class="doc-schedule-title">Address Where Ward Currently Resides</div>
  <div class="doc-table-div"><div class="tbl">
    <div class="tr"><div class="td">Address</div><div class="td">${esc(d.residenceAddress||'')}</div></div>
    <div class="tr"><div class="td">City, State, ZIP</div><div class="td">${esc(d.residenceCityStateZip||'')}</div></div>
    <div class="tr"><div class="td">Phone</div><div class="td">${esc(d.residencePhone||'')}</div></div>
    <div class="tr"><div class="td">Mailing Address (if different)</div><div class="td">${esc(d.mailingAddress||'')}</div></div>
    <div class="tr"><div class="td">Mailing City, State, ZIP</div><div class="td">${esc(d.mailingCityStateZip||'')}</div></div>
  </div></div>
  <p style="font-size:.74rem;margin-top:.6rem;font-style:italic;">Filed separately is the Annual Physician's Report. Together these are the Annual Report of the Guardian of the Person.</p>
  </div>`;

  // ── Page 2: Q1 residences ─────────────────────────────
  const resRows=(d.q1Residences||[]).filter(r=>r&&(r.name||r.street||r.cityStateZip));
  html+=`<div class="doc-page">${H(ward,caseNo,'Question 1','2')}
  <div class="doc-schedule-title">1. Places the Ward Has Resided During the Prior 12 Months</div>
  <table class="doc-table">
    <thead><tr><th style="width:2rem">#</th><th>Facility / Residence</th><th>Type</th><th>From</th><th>To</th></tr></thead>
    <tbody>${resRows.length?resRows.map((r,i)=>`<tr>
      <td>${i+1}</td>
      <td>${esc(r.name||'')}${r.street?'<br>'+esc(r.street):''}${r.cityStateZip?'<br>'+esc(r.cityStateZip):''}${r.phone?'<br>'+esc(r.phone):''}</td>
      <td>${esc(r.facilityType||'')}</td>
      <td>${fmtDate(r.from)||''}</td>
      <td>${fmtDate(r.to)||''}</td></tr>`).join('')
      :'<tr><td colspan="5" style="text-align:center;font-style:italic">No residences listed</td></tr>'}
    </tbody>
  </table>
  </div>`;

  // ── Page 3: Q2 + Q3 ───────────────────────────────────
  html+=`<div class="doc-page">${H(ward,caseNo,'Questions 2–3','3')}
  <div class="doc-schedule-title">2. If the Ward's Address Has Changed Since the Last Plan</div>
  ${boxes([
    [d.q2NoMove,'N/A — the ward has not moved since the last plan was filed.'],
    [d.q2WithinCounty,'The move was within this county and a change of address was provided to the court.'],
    [d.q2WithinCircuit,'The move was within this Circuit and notice was provided to the court within 15 days.'],
    [d.q2OutsideApproved,'The move was not within this Circuit and prior court approval was obtained.'],
    [d.q2OutsideVenuePetition,'The move was not within this Circuit and a petition to change venue is filed with this plan.'],
  ])}
  <div class="doc-schedule-title">3. Plan for the Best Welfare of the Ward</div>
  <p style="font-size:.76rem;font-weight:650;margin:.5rem 0 .2rem;">Residential setting best suited to the ward's needs:</p>
  ${boxes([
    [d.q3SettingALF,'Assisted Living (ALF)'],[d.q3SettingGroupHome,'Group Home'],
    [d.q3SettingIntermediate,'Intermediate'],[d.q3SettingPrivate,'Private Residence'],
    [d.q3SettingSkilled,'Skilled Nursing'],[d.q3SettingSpecialized,'Specialized'],
    [d.q3SettingStateHospital,'State Hospital'],[d.q3SettingOther,'Other'],
  ])}
  ${d.q3SettingExplain?`<p style="font-size:.76rem;"><em>Explanation:</em> ${esc(d.q3SettingExplain)}</p>`:''}
  <p style="font-size:.76rem;font-weight:650;margin:.5rem 0 .2rem;">The guardian will ensure this remains the best setting by:</p>
  ${boxes([
    [d.q3EnsureAssessing,'Periodically assessing needs'],
    [d.q3EnsureWardDecides,'The ward retains the right to decide'],
    [d.q3EnsureNoChange,'No change, unless required by medical condition'],
  ])}
  <p style="font-size:.76rem;font-weight:650;margin:.5rem 0 .2rem;">Provision for medical care services:</p>
  ${boxes([
    [d.q3MedPrimary,'Routine examination by primary care physician'],
    [d.q3MedDentist,'Routine examination by dentist'],
    [d.q3MedOphthalmologist,'Routine examination by ophthalmologist'],
    [d.q3MedSpecialist,'Routine examination by specialist'+(d.q3MedSpecialistArea?' — '+d.q3MedSpecialistArea:'')],
    [d.q3MedPhysicalTherapy,'Physical therapy'],[d.q3MedSpeechTherapy,'Speech therapy'],
    [d.q3MedOccupationalTherapy,'Occupational therapy'],
    [d.q3MedWardDecides,'The ward retains the right to make their own decision'],
    [d.q3MedNone,'None'],[d.q3MedOther,'Other'],
  ])}
  ${d.q3MedExplain?`<p style="font-size:.76rem;"><em>Explanation:</em> ${esc(d.q3MedExplain)}</p>`:''}
  </div>`;

  html+=`<div class="doc-page">${H(ward,caseNo,'Question 3 (cont.)','4')}
  <p style="font-size:.76rem;font-weight:650;margin:.2rem 0 .2rem;">Provision for mental health services:</p>
  ${boxes([
    [d.q3MentalPsych,'Routine examination by psychiatrist / psychologist'],
    [d.q3MentalWardDecides,'Ward retains the right to make own decisions'],
    [d.q3MentalOutpatient,'Ongoing treatment — outpatient'],
    [d.q3MentalInpatient,'Ongoing treatment — inpatient'],
    [d.q3MentalNone,'None'],[d.q3MentalOther,'Other'],
  ])}
  ${d.q3MentalExplain?`<p style="font-size:.76rem;"><em>Explanation:</em> ${esc(d.q3MentalExplain)}</p>`:''}
  <p style="font-size:.76rem;font-weight:650;margin:.5rem 0 .2rem;">Provision for personal care (bathing, grooming, feeding):</p>
  ${boxes([
    [d.q3PersonalFacility,'Care facility'],[d.q3PersonalNurses,'Nurses and aides'],
    [d.q3PersonalFamily,'Family and friends'],[d.q3PersonalWithout,'Ward does without assistance'],
    [d.q3PersonalNone,'None; ward can provide own personal care'],[d.q3PersonalOther,'Other'],
  ])}
  ${d.q3PersonalExplain?`<p style="font-size:.76rem;"><em>Explanation:</em> ${esc(d.q3PersonalExplain)}</p>`:''}
  <p style="font-size:.76rem;font-weight:650;margin:.5rem 0 .2rem;">Provision for socialization and recreational activities:</p>
  ${boxes([
    [d.q3SocialFacility,'Care facility'],[d.q3SocialNurses,'Nurses and aides'],
    [d.q3SocialFamily,'Family and friends'],
    [d.q3SocialWardDecides,'The ward retains the right to make their own decision'],
    [d.q3SocialNone,'None'],[d.q3SocialOther,'Other'],
  ])}
  ${d.q3SocialExplain?`<p style="font-size:.76rem;"><em>Explanation:</em> ${esc(d.q3SocialExplain)}</p>`:''}
  </div>`;

  // ── Page 5: benefits ──────────────────────────────────
  const b=d.benefits||{};
  html+=`<div class="doc-page">${H(ward,caseNo,'Question 3G','5')}
  <div class="doc-schedule-title">3G. Insurance and Benefits</div>
  <p style="font-size:.76rem;margin-bottom:.4rem;">Health and accident insurance and other private or governmental benefits the ward receives toward the cost of medical, mental health or related services.</p>
  <table class="doc-table">
    <thead><tr><th>Benefit</th><th style="width:6rem;text-align:center">Eligible</th><th style="width:7rem;text-align:center">Applied for</th></tr></thead>
    <tbody>${PLAN_BENEFITS.map(([k,label])=>{const v=b[k]||{};
      return `<tr><td>${esc(label)}</td><td style="text-align:center">${y(v.eligible)}</td><td style="text-align:center">${y(v.appliedFor)}</td></tr>`;}).join('')}
    </tbody>
  </table>
  ${boxes([[d.q3BenefitsNone,'None of the above'],[d.q3BenefitsOther,'Other']])}
  ${d.q3BenefitsExplain?`<p style="font-size:.76rem;"><em>Explanation:</em> ${esc(d.q3BenefitsExplain)}</p>`:''}
  </div>`;

  // ── Page 6: Q4 providers ──────────────────────────────
  const provRows=(d.q4Providers||[]).filter(r=>r&&(r.name||r.providerType||r.visits));
  html+=`<div class="doc-page">${H(ward,caseNo,'Question 4','6')}
  <div class="doc-schedule-title">4. Professional Medical Treatment During the Prior 12 Months</div>
  <table class="doc-table">
    <thead><tr><th style="width:2rem">#</th><th>Provider</th><th>Type</th><th style="width:5rem">Visits</th></tr></thead>
    <tbody>${provRows.length?provRows.map((r,i)=>`<tr>
      <td>${i+1}</td>
      <td>${esc(r.name||'')}${r.street?'<br>'+esc(r.street):''}${r.cityStateZip?'<br>'+esc(r.cityStateZip):''}${r.phone?'<br>'+esc(r.phone):''}</td>
      <td>${esc(r.providerType||'')}</td>
      <td>${esc(r.visits||'')}</td></tr>`).join('')
      :'<tr><td colspan="4" style="text-align:center;font-style:italic">No providers listed</td></tr>'}
    </tbody>
  </table>
  </div>`;

  // ── Page 7: Q5–Q7 ─────────────────────────────────────
  const rights=d.rights||{};
  html+=`<div class="doc-page">${H(ward,caseNo,'Questions 5–7','7')}
  <div class="doc-schedule-title">5. Social Skills, Abilities and Activities</div>
  <p style="font-size:.76rem;font-weight:650;margin-bottom:.2rem;">Social skills and abilities of the ward:</p>
  ${line(d.q5SocialSkills)}
  <p style="font-size:.76rem;font-weight:650;margin:.5rem 0 .2rem;">Activities undertaken to increase the ward's capacity, and their effectiveness:</p>
  ${line(d.q5Activities)}
  <div class="doc-schedule-title">6. Rights Assessment</div>
  <table class="doc-table">
    <thead><tr><th>Right</th>${PLAN_RIGHT_STATES.map(s=>`<th style="width:7rem;text-align:center">${esc(s)}</th>`).join('')}</tr></thead>
    <tbody>${PLAN_RIGHTS.map(([k,label])=>`<tr><td>${esc(label)}</td>${PLAN_RIGHT_STATES.map(s=>`<td style="text-align:center">${y(rights[k]===s)}</td>`).join('')}</tr>`).join('')}</tbody>
  </table>
  <div class="doc-schedule-title">7. Disagreement With the Physician's Report</div>
  ${line(d.q7RightsExplain)}
  </div>`;

  // ── Page 8: Q8 ADLs ───────────────────────────────────
  const adls=d.adls||{};
  html+=`<div class="doc-page">${H(ward,caseNo,'Question 8','8')}
  <div class="doc-schedule-title">8. Activities of Daily Living</div>
  <table class="doc-table">
    <thead><tr><th>Activity</th><th style="width:14rem">Rating</th></tr></thead>
    <tbody>${PLAN_ADLS.map(([k,label])=>`<tr><td>${esc(label)}</td><td>${esc(adls[k]||'')}</td></tr>`).join('')}</tbody>
  </table>
  </div>`;

  // ── Page 9: Q9 disabilities ───────────────────────────
  const devRows=(pfx)=>boxes([
    [d[pfx+'Dentures'],'Dentures'],[d[pfx+'HearingAid'],'Hearing aid'],
    [d[pfx+'Wheelchair'],'Wheelchair'],[d[pfx+'Walker'],'Walker / cane'],
    [d[pfx+'Crutches'],'Crutches'],[d[pfx+'Prosthetics'],'Prosthetics'],
    [d[pfx+'Glasses'],'Glasses'],[d[pfx+'None'],'None'],[d[pfx+'Other'],'Other'],
  ]);
  html+=`<div class="doc-page">${H(ward,caseNo,'Question 9','9')}
  <div class="doc-schedule-title">9. Disabilities and Assistive Devices</div>
  <p style="font-size:.76rem;font-weight:650;margin-bottom:.2rem;">Mental disabilities of the ward:</p>
  ${boxes([
    [d.q9MentalDementia,'Dementia'],[d.q9MentalAlzheimers,"Alzheimer's type of dementia"],
    [d.q9MentalAutism,'Autism spectrum disorders'],[d.q9MentalHeadInjury,'Closed head injury'],
    [d.q9MentalDevelopmental,'Developmental disabilities'],[d.q9MentalIntellectual,'Intellectual disability'],
    [d.q9MentalSchizophrenia,'Schizophrenia or related disorders'],[d.q9MentalDepression,'Depression'],
    [d.q9MentalSubstance,'Induced by substance abuse'],
    [d.q9MentalNone,'Ward has no mental disabilities'],[d.q9MentalOther,'Other'],
  ])}
  ${d.q9MentalExplain?`<p style="font-size:.76rem;"><em>Explanation:</em> ${esc(d.q9MentalExplain)}</p>`:''}
  <p style="font-size:.76rem;font-weight:650;margin:.5rem 0 .2rem;">Physical disabilities of the ward:</p>
  ${boxes([
    [d.q9PhysMobility,'Mobility'],[d.q9PhysBlindness,'Blindness'],
    [d.q9PhysDeafness,'Deafness'],[d.q9PhysDiabetic,'Diabetic'],
    [d.q9PhysParkinsons,"Parkinson's disease"],[d.q9PhysArthritis,'Severe arthritis'],
    [d.q9PhysNone,'Ward has no physical disabilities'],[d.q9PhysOther,'Other'],
  ])}
  ${d.q9PhysExplain?`<p style="font-size:.76rem;"><em>Explanation:</em> ${esc(d.q9PhysExplain)}</p>`:''}
  <p style="font-size:.76rem;font-weight:650;margin:.5rem 0 .2rem;">Assistive devices currently used:</p>
  ${devRows('q9Uses')}
  ${d.q9UsesExplain?`<p style="font-size:.76rem;"><em>Explanation:</em> ${esc(d.q9UsesExplain)}</p>`:''}
  <p style="font-size:.76rem;font-weight:650;margin:.5rem 0 .2rem;">Assistive devices needed but not yet obtained:</p>
  ${devRows('q9Needs')}
  ${d.q9NeedsExplain?`<p style="font-size:.76rem;"><em>Explanation:</em> ${esc(d.q9NeedsExplain)}</p>`:''}
  </div>`;

  // ── Page 10: Q10 directives ───────────────────────────
  const dirs=(d.q10Directives||[]).filter(r=>r&&(r.title||r.dateSigned||r.signedBy));
  html+=`<div class="doc-page">${H(ward,caseNo,'Question 10','10')}
  <div class="doc-schedule-title">10. Advance Directives</div>
  ${boxes([[d.q10NoDirectives,'There are NO pre-existing DNR orders or other advance directives.']])}
  ${d.q10NoDirectives?`<p style="font-size:.76rem;font-weight:650;margin:.4rem 0 .2rem;">Steps taken to verify:</p>${boxes([
    [d.q10StepResidence,"Search of ward's prior and current residence"],
    [d.q10StepSafeDeposit,"Inventory of ward's safe deposit box"],
    [d.q10StepInterviewed,'Interviewed family and friends'],
    [d.q10StepMedicalProviders,"Requested documents from the ward's medical providers"],
    [d.q10StepAttorney,"Requested documents from the ward's attorney"],
  ])}`:''}
  ${boxes([[d.q10Executed,'The ward executed the following advance directives:']])}
  ${d.q10Executed?boxes([
    [d.q10ExecDNR,'Order Not to Resuscitate (DNR), F.S. 401.45(3)'],
    [d.q10ExecHealthcare,'Advance Directive for Healthcare (surrogate, living will, anatomical gift)'],
    [d.q10ExecPOA,'Durable Power of Attorney, F.S. Chapter 709'],
    [d.q10ExecOther,'Other'+(d.q10ExecOtherText?' — '+d.q10ExecOtherText:'')],
  ]):''}
  ${dirs.map((r,i)=>`<div class="doc-section-block" style="margin-top:.6rem">
    <p style="font-size:.76rem;font-weight:650;margin-bottom:.2rem;">Directive ${i+1}</p>
    <div class="doc-table-div"><div class="tbl">
      <div class="tr"><div class="td">Title of order or directive</div><div class="td">${esc(r.title||'')}</div></div>
      <div class="tr"><div class="td">Date executed / signed</div><div class="td">${fmtDate(r.dateSigned)||''}</div></div>
      <div class="tr"><div class="td">Name of person who signed</div><div class="td">${esc(r.signedBy||'')}</div></div>
      <div class="tr"><div class="td">Designated agent(s) / surrogate(s)</div><div class="td">${esc(r.agents||'')}</div></div>
      <div class="tr"><div class="td">Alternate agent(s) / surrogate(s)</div><div class="td">${esc(r.alternates||'')}</div></div>
      <div class="tr"><div class="td">Relationship to the ward</div><div class="td">${esc(r.relationship||'')}</div></div>
      <div class="tr"><div class="td">Contact information</div><div class="td">${esc(r.contact||'')}</div></div>
      <div class="tr"><div class="td">Suspended or revoked by a court?</div><div class="td">${esc(r.courtRevoked||'')}${r.orderDate?' — '+fmtDate(r.orderDate):''}${r.orderCounty?', '+esc(r.orderCounty):''}</div></div>
    </div></div>
  </div>`).join('')}
  </div>`;

  // ── Page 11: Q11 remuneration ─────────────────────────
  html+=`<div class="doc-page">${H(ward,caseNo,'Question 11','11')}
  <div class="doc-schedule-title">11. Declaration of Remuneration</div>
  <p style="font-size:.75rem;margin-bottom:.5rem;">Each guardian must declare any remuneration from any source for services rendered to or on behalf of the ward. Remuneration means any payment or other benefit made directly or indirectly, overtly or covertly, or in cash or in kind to the guardian. F.S. 744.367(3)(a).</p>
  ${d.q11NoRemuneration
    ? `<p style="font-size:.8rem;">I, <strong>${esc(d.q11NoRemunerationName||'')}</strong>, declare that I have received NO remuneration from any source for services rendered to or on behalf of the ward.</p>`
    : `<p style="font-size:.8rem;">I, <strong>${esc(d.q11ReceivedName||'')}</strong>, declare that I have received the monies <strong>${esc(d.q11Amount||'')}</strong> from <strong>${esc(d.q11From||'')}</strong> for services rendered on behalf of the ward.</p>
       ${boxes([[d.q11SubmittedToCourt,'All requests for reimbursement or fees have been submitted to the court for review and approval.']])}`}
  </div>`;

  // ── Page 12: certification + guardian signatures ──────
  const g=d.planGuardians||[];
  const sigBlock=(p,label)=>`<div class="doc-signature-block">
    <p style="font-size:.76rem;font-weight:650;margin-bottom:.3rem;">${label}</p>
    <div class="row">
      <div class="col-6">${fld('Signature','')}</div>
      <div class="col-3">${fld('Date Signed',fmtDate(p.signatureDate))}</div>
      <div class="col-3">${fld('Printed Name',p.name)}</div>
    </div>
    <div class="row mt-2">
      <div class="col-4">${fld('SSN / EIN',p.ssn)}</div>
      <div class="col-4">${fld('Phone Number',p.phone)}</div>
      <div class="col-4">${fld('Email Address',p.email)}</div>
    </div>
    <div class="row mt-2">
      <div class="col-6">${fld('Mailing Street Address',p.mailingStreet)}</div>
      <div class="col-6">${fld('Mailing City / State / ZIP',p.mailingCityStateZip)}</div>
    </div>
    <div class="row mt-2">
      <div class="col-6">${fld('Residence or Office Street Address',p.officeStreet)}</div>
      <div class="col-6">${fld('Residence or Office City / State / ZIP',p.officeCityStateZip)}</div>
    </div>
    <div class="row mt-2">
      <div class="col-6">${fld('Relationship to Ward',p.relationship)}</div>
    </div>
  </div>`;
  html+=`<div class="doc-page">${H(ward,caseNo,'Certification','12')}
  <div class="doc-schedule-title">Certification and Signature of Guardian(s)</div>
  ${boxes([
    [d.certIncapacitatedNoCopy,'The ward was declared totally incapacitated and has not been given a copy of this plan.'],
    [d.certMinorNoCopy,'The ward is a minor and has not been given a copy of this plan.'],
    [d.certConsulted,"The guardian has consulted with the ward, to the extent reasonable, has honored the ward's wishes, and to the maximum extent possible the plan is in accordance with them."],
    [d.certNoRestriction,'The plan does not restrict the physical liberty of the ward except as necessary to protect the ward and others from serious physical injury, illness, or disease.'],
    [d.certProvidesMedical,"The plan provides for the ward's medical care and mental health treatment."],
    [d.certPhysicianAttached,"The physician's statement of an examination of the ward no more than 90 days before the beginning of the plan period is attached."],
    [d.certRecognizeRights,'In exercising his or her powers, the guardian shall recognize any rights retained by the ward [F.S. 744.363(6)].'],
  ])}
  ${d.certRightsChangedExplain?`<p style="font-size:.76rem;margin-top:.4rem;"><em>Explanation for no change in rights:</em> ${esc(d.certRightsChangedExplain)}</p>`:''}
  <div class="attestation-text">UNDER PENALTIES OF PERJURY, I declare that I have read and examined the foregoing plan, and the facts alleged are true, to the best of my knowledge and belief.</div>
  ${sigBlock(g[0]||{},'Guardian')}
  </div>`;

  const extras=(g||[]).slice(1).filter(p=>p&&(p.name||p.signatureDate));
  if(extras.length){
    html+=`<div class="doc-page">${H(ward,caseNo,'Certification (cont.)','13')}
    <div class="doc-schedule-title">Additional Guardian Signatures</div>
    ${extras.map((p,i)=>sigBlock(p,`Co-Guardian ${i+2}`)).join('')}
    </div>`;
  }

  // ── Final page: attorney certification ────────────────
  html+=`<div class="doc-page">${H(ward,caseNo,'Attorney Certification',String(extras.length?14:13))}
  <div class="doc-schedule-title">Certification and Signature of Guardian's Attorney</div>
  <p style="font-size:.76rem;">The undersigned hereby notifies the court of the filing of the annual guardianship plan for the period <strong>${fmtDate(d.periodFrom)||''}</strong> through <strong>${fmtDate(d.periodTo)||''}</strong>.</p>
  <p style="font-size:.76rem;">This annual guardianship plan is the representation of the guardian. I have not audited the accompanying annual plan. The undersigned attorney represents that he/she has examined the contents of the annual guardianship plan and that it conforms to the requirements of the Florida Guardianship Law and the standards for plans in ${esc(d.county||'')} County.</p>
  <div class="doc-signature-block">
    <div class="row">
      <div class="col-6">${fld('Attorney Signature','')}</div>
      <div class="col-3">${fld('Date Signed',fmtDate(d.attorney_signatureDate))}</div>
      <div class="col-3">${fld('Attorney Name',d.attorney)}</div>
    </div>
    <div class="row mt-2">
      <div class="col-4">${fld('Bar Number',d.attorney_bar)}</div>
      <div class="col-4">${fld('Phone Number',d.attorney_phone)}</div>
      <div class="col-4">${fld('Street Address',d.attorney_street)}</div>
    </div>
    <div class="row mt-2">
      <div class="col-6">${fld('City / State / ZIP',d.attorney_cityStateZip)}</div>
    </div>
    <p class="mt-3" style="font-size:.76rem;text-align:center;font-weight:700;">(End of Annual Guardianship Plan)</p>
  </div>
  </div>`;

  return html;
}

// planReadinessChecks() -- the shared dispatcher across all four Plan types
// -- stays in legacy-app.js (Problem 3: planInitial/planMinor haven't been
// extracted, so it must keep calling their still-legacy checklist functions
// too) and reaches this export via window.
export function planReadinessChecksAnnual(){
  const d=window.D;
  const has=v=>!!(v!==''&&v!==null&&v!==undefined);
  const g0=(d.planGuardians||[])[0]||{};
  const res=(d.q1Residences||[]).filter(r=>r&&r.name);
  const provs=(d.q4Providers||[]).filter(r=>r&&r.name);
  const rights=d.rights||{}, adls=d.adls||{};
  const auto=[
    {label:'Reporting period is stated',ok:has(d.periodFrom)&&has(d.periodTo)},
    {label:'Ward name, case number and inception date are on the plan',ok:has(d.wardName)&&has(d.caseNumber)&&has(d.gid)},
    {label:'Signed and dated by a guardian',ok:has(g0.name)&&has(g0.signatureDate)},
    {label:'Guardian address, phone and SSN/EIN provided',ok:has(g0.mailingStreet)&&has(g0.phone)&&has(g0.ssn)},
    {label:"Ward's current residence and living arrangement stated",ok:has(d.wardLiving)&&has(d.residenceAddress)},
    {label:`Residences for the year listed (${res.length})`,ok:res.length>0},
    {label:'Question 2 — address change addressed',ok:!!(d.q2NoMove||d.q2WithinCounty||d.q2WithinCircuit||d.q2OutsideApproved||d.q2OutsideVenuePetition)},
    {label:'Question 3 — residential setting and care provisions selected',ok:!!(d.q3SettingALF||d.q3SettingGroupHome||d.q3SettingIntermediate||d.q3SettingPrivate||d.q3SettingSkilled||d.q3SettingSpecialized||d.q3SettingStateHospital||d.q3SettingOther)},
    {label:`Question 4 — professional medical treatment listed (${provs.length})`,ok:provs.length>0},
    {label:'Question 5 — social skills and capacity-building activities described',ok:has(d.q5SocialSkills)&&has(d.q5Activities)},
    {label:'Question 6 — all twelve rights assessed',ok:PLAN_RIGHTS.every(([k])=>has(rights[k]))},
    {label:'Question 8 — all sixteen activities of daily living rated',ok:PLAN_ADLS.every(([k])=>has(adls[k]))},
    {label:'Question 9 — mental and physical disabilities answered',ok:!!((d.q9MentalNone||d.q9MentalDementia||d.q9MentalAlzheimers||d.q9MentalAutism||d.q9MentalHeadInjury||d.q9MentalDevelopmental||d.q9MentalIntellectual||d.q9MentalSchizophrenia||d.q9MentalDepression||d.q9MentalSubstance||d.q9MentalOther)&&(d.q9PhysNone||d.q9PhysMobility||d.q9PhysBlindness||d.q9PhysDeafness||d.q9PhysDiabetic||d.q9PhysParkinsons||d.q9PhysArthritis||d.q9PhysOther))},
    {label:'Question 10 — advance directives answered',ok:!!d.q10NoDirectives!==!!d.q10Executed},
    {label:'Question 11 — remuneration declared',ok:d.q11NoRemuneration?has(d.q11NoRemunerationName):!!(d.q11ReceivedName||d.q11Amount||d.q11From)},
    {label:"Physician's report confirmed attached (certification box)",ok:!!d.certPhysicianAttached},
  ];
  const manual=[
    "File the physician's report separately, at the same time as this plan. The app does not produce it.",
    'File within 90 days after the last day of the anniversary month the Letters were signed (F.S. 744.367).',
    'Serve a copy on all interested persons and file the certificate of service.',
    'If you marked any right as capable of restoration, file the separate petition to restore it — this plan does not restore rights.',
    'If the ward changed residence or a new guardian was appointed, file an updated Disaster Plan (Administrative Order 2019-005).',
    'Attach copies of any advance directives listed in Question 10 unless already filed with the court.',
    'If you are a professional guardian, confirm your OPPG registration is current.',
    'Confirm the guardian address on file with the Clerk matches the address on this plan.',
  ];
  return {auto,manual};
}

export function pagePrintPlanAnnual(){
  const errors=validatePlanAnnual();
  highlightErrors(errors);
  return `<div>
    <h1 class="visually-hidden">Print Preview</h1>
    <div class="print-preview-banner no-print">
      <div><strong>Preview &amp; Export</strong> ${errors.length?`<span style="color:var(--danger-text)"> — ${errors.length} issue(s)</span>`:' — Ready to export'}</div>
      <div class="d-flex gap-2 flex-wrap">
        <button class="btn btn-primary btn-sm" data-form-action="save-pdf-plan-annual" ${errors.length?'disabled':''}>Save as PDF</button>
        <button class="btn btn-outline-secondary btn-sm" data-form-action="print">Print</button>
        <button class="btn btn-outline-secondary btn-sm" data-form-action="open-court-portal" title="Opens the Florida Courts E-Filing Portal in a new tab"><svg class="ic" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M14.2 4.4h5.4v5.4"/><path d="m19.6 4.4-8 8"/><path d="M17.4 13.6v6H4.6V6.8h6"/></svg> Florida E-Filing Portal</button>
      </div>
    </div>
    ${errors.length?validationPanel(errors):''}
    ${planReadinessPanel()}
    <div id="print-doc-container">${buildPrintHTMLPlanAnnual()}</div>
  </div>`;
}

export async function doSavePdf(){
  const errors=validatePlanAnnual();
  if(errors.length){renderPage('/print');alert(`Cannot export — ${errors.length} required field${errors.length===1?'':'s'} missing. See the list on this page.`);return;}
  const ward=(window.D.wardName||'AnnualGuardianshipPlan').replace(/[^a-z0-9]/gi,'_');
  try{
    const model = buildPlanAnnualModel(window.D);
    const doc = await generateCourtFormPdf(model);
    doc.save(`${ward}_AnnualGuardianshipPlan.pdf`);
  }catch(e){
    console.error('PDF export failed',e);
    alert('PDF export failed: '+e.message);
  }
}
