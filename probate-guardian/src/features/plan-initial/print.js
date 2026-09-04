// Print/PDF export for the Initial Guardianship Plan (Milestone 5, Phase B).
// Dynamically imported from ./index.js only when the user reaches /print or
// triggers PDF export -- same lazy boundary as the other two extracted Plan
// features.
//
// Statically imports validatePlanInitial back from ./index.js -- safe
// despite index.js dynamically importing this file, since neither side
// touches the other's export during top-level module evaluation, only
// inside function bodies called later (see
// src/features/simplified-accounting/index.js's comment on the same
// pattern).
import { validatePlanInitial } from './index.js';
import { buildPlanInitialModel } from './pdf-model.js';
import { generateCourtFormPdf } from '../../core/pdf/pdf-engine.js';
import { mountPdfPreview, printGeneratedPdf } from '../../core/pdf/pdf-preview.js';

const {
  circuitCourtCaption, esc, fmtDate,
  highlightErrors, validationPanel, planReadinessPanel,
  renderPage,
  INITIAL_ADLS,
} = window;

function docHeaderPlanInitial(ward,caseNo,section,page){
  return `<div class="doc-header">
    <div class="court-title">${circuitCourtCaption(window.D.county,true)}</div>
    <div class="doc-title">INITIAL GUARDIANSHIP PLAN</div>
    <div class="doc-meta">
      <span>IN RE: GUARDIANSHIP OF <strong>${ward}</strong></span>
      <span>${section}${page?' — Page '+page:''}</span>
      <span>Case Number: <strong>${caseNo}</strong></span>
    </div>
  </div>`;
}

function buildPrintHTMLPlanInitial(){
  const d=window.D;
  const ward=esc(d.wardName||'');
  const caseNo=esc(d.caseNumber||'');
  const H=docHeaderPlanInitial;
  const y=v=>v?'☒':'☐';
  const line=v=>`<div class="doc-answer">${esc(v||'')||'&nbsp;'}</div>`;
  const fld=(label,val)=>`<div class="doc-field-label">${label}</div><div class="doc-signature-line">${esc(val||'')}</div>`;
  const boxes=(items)=>`<div class="doc-checklist">${items.map(([on,label])=>`<div class="doc-check-row">${y(on)} ${esc(label)}</div>`).join('')}</div>`;
  let html='';

  // ── Page 1: cover ─────────────────────────────────────
  html+=`<div class="doc-page">${H(ward,caseNo,'Cover','1')}
  <p style="font-size:.76rem;margin-bottom:.6rem;">Pursuant to F.S. 744.632, this report with original signatures is due within 60 days after the Letters of Guardianship are signed, and remains in effect until amended or replaced by the approval of an Annual Guardianship Plan.</p>
  <div class="doc-table-div"><div class="tbl">
    <div class="tr"><div class="td">Case Number</div><div class="td">${caseNo}</div></div>
    <div class="tr"><div class="td">Successor Guardianship</div><div class="td">${esc(d.successorGuardianship||'')}</div></div>
    <div class="tr"><div class="td">Guardianship Inception Date</div><div class="td">${fmtDate(d.inceptionDate)||''}</div></div>
    <div class="tr"><div class="td">Date Letters Were Signed</div><div class="td">${fmtDate(d.lettersSignedDate)||''}</div></div>
    <div class="tr"><div class="td">For the period</div><div class="td">${fmtDate(d.periodFrom)||''} through ${fmtDate(d.periodTo)||''}</div></div>
    <div class="tr"><div class="td">Guardian Name(s)</div><div class="td">${esc(d.guardianNames||'')}</div></div>
    <div class="tr"><div class="td">Attorney Name</div><div class="td">${esc(d.attorneyName||'')}</div></div>
  </div></div>
  <div class="doc-schedule-title">The Ward Is Living</div>
  ${boxes([
    [d.wardLiving==='In a private residence leased or owned by them (house, condo or apartment)','In a private residence leased or owned by them (house, condo or apartment).'],
    [d.wardLiving==='In a private residence not leased or owned by them (such as family member)','In a private residence not leased or owned by them (such as family member).'],
    [d.wardLiving==='In a facility (Skilled Nursing, Assisted Living, etc.)','In a facility (Skilled Nursing, Assisted Living, etc.).'],
  ])}
  <div class="doc-schedule-title">Address Where Ward Currently Resides</div>
  <div class="doc-table-div"><div class="tbl">
    <div class="tr"><div class="td">Address</div><div class="td">${esc(d.residenceAddress||'')}</div></div>
    <div class="tr"><div class="td">City, State, ZIP</div><div class="td">${esc(d.residenceCityStateZip||'')}</div></div>
    <div class="tr"><div class="td">Phone</div><div class="td">${esc(d.residencePhone||'')}</div></div>
    <div class="tr"><div class="td">Mailing Address (if different)</div><div class="td">${esc(d.mailingAddress||'')}</div></div>
    <div class="tr"><div class="td">Mailing City, State, ZIP</div><div class="td">${esc(d.mailingCityStateZip||'')}</div></div>
  </div></div>
  <div class="doc-schedule-title">Pre-existing Orders Not to Resuscitate / Advance Directives</div>
  ${line(d.q1PreexistingDirectives)}
  </div>`;

  // ── Page 2: Q2–Q5 ──────────────────────────────────────
  html+=`<div class="doc-page">${H(ward,caseNo,'Questions 2–5','2')}
  <div class="doc-schedule-title">2. Residential Setting Best Suited to the Ward's Needs</div>
  ${boxes([
    [d.q2Setting==='Assisted Living (ALF)','Assisted Living (ALF)'],[d.q2Setting==='Group Home','Group Home'],
    [d.q2Setting==='Intermediate','Intermediate'],[d.q2Setting==='Private Residence','Private Residence'],
    [d.q2Setting==='Skilled Nursing','Skilled Nursing'],[d.q2Setting==='Specialized','Specialized'],
    [d.q2Setting==='State Hospital','State Hospital'],[d.q2Setting==='Other','Other'],
  ])}
  ${d.q2Explain?`<p style="font-size:.76rem;"><em>Explanation:</em> ${esc(d.q2Explain)}</p>`:''}
  <div class="doc-schedule-title">3. Provision of Medical Services</div>
  ${boxes([
    [d.q3MedPrimary,'Routine examination by primary care physician'],
    [d.q3MedDentist,'Routine examination by dentist'],
    [d.q3MedOphthalmologist,'Routine examination by Ophthalmologist'],
    [d.q3MedSpecialist,'Routine examination by specialist'+(d.q3MedSpecialistArea?' — '+d.q3MedSpecialistArea:'')],
    [d.q3MedPT,'Physical Therapy'],[d.q3MedST,'Speech Therapy'],[d.q3MedOT,'Occupational Therapy'],
    [d.q3MedWardDecides,'The ward retains the right to make their own decision'],
    [d.q3MedOther,'Other'],
  ])}
  ${d.q3MedExplain?`<p style="font-size:.76rem;"><em>Explanation:</em> ${esc(d.q3MedExplain)}</p>`:''}
  <div class="doc-schedule-title">4. Provision of Mental Health Services</div>
  ${boxes([
    [d.q4Mental==='Routine examination by Psychiatrist/Psychologist','Routine examination by Psychiatrist/Psychologist'],
    [d.q4Mental==='Ongoing Treatment Outpatient','Ongoing Treatment Outpatient'],
    [d.q4Mental==='Ongoing Treatment Inpatient','Ongoing Treatment Inpatient'],
    [d.q4Mental==='None','None'],[d.q4Mental==='Other','Other'],
  ])}
  ${d.q4Explain?`<p style="font-size:.76rem;"><em>Explanation:</em> ${esc(d.q4Explain)}</p>`:''}
  <div class="doc-schedule-title">5. Provision of Personal Care</div>
  ${boxes([
    [d.q5Personal==='Care Facility','Care Facility'],[d.q5Personal==='Nurses and Aides','Nurses and Aides'],
    [d.q5Personal==='Family and Friends','Family and Friends'],[d.q5Personal==='Other','Other'],
  ])}
  ${d.q5Explain?`<p style="font-size:.76rem;"><em>Explanation:</em> ${esc(d.q5Explain)}</p>`:''}
  </div>`;

  // ── Page 3: Q6–Q7 ──────────────────────────────────────
  html+=`<div class="doc-page">${H(ward,caseNo,'Questions 6–7','3')}
  <div class="doc-schedule-title">6. Socialization / Recreational Services</div>
  ${boxes([
    [d.q6CareFacility,'Care Facility'],[d.q6NursesAides,'Nurses and Aides'],
    [d.q6FamilyFriends,'Family and Friends'],[d.q6DayProgram,'Day Program'],
    [d.q6WardDecides,'The Ward retains the right to make their own decision'],[d.q6Other,'Other'],
  ])}
  ${d.q6Explain?`<p style="font-size:.76rem;"><em>Explanation:</em> ${esc(d.q6Explain)}</p>`:''}
  <div class="doc-schedule-title">7. Insurance / Governmental Benefits</div>
  ${boxes([
    [d.q7SocialSecurity,'Social Security'],[d.q7Ssdi,'Social Security Disability Income (SSDI)'],
    [d.q7Hmo,'Health Maintenance Organization (HMO)'],[d.q7Ssi,'Supplemental Security Income (SSI)'],
    [d.q7StateSupplement,'Optional State Supplement'],[d.q7InstitutionalCare,'Institutional Care Program'],
    [d.q7SupplementalIns,'Supplemental Insurance'],[d.q7Pension,'Pension'],
    [d.q7Medicare,'Medicare'],[d.q7Medicaid,'Medicaid'],[d.q7Va,'VA'],
    [d.q7Trusts,'Trusts'],[d.q7PendingBenefits,'Pending Benefits'],[d.q7Other,'Other'],
  ])}
  ${d.q7Explain?`<p style="font-size:.76rem;"><em>Explanation:</em> ${esc(d.q7Explain)}</p>`:''}
  </div>`;

  // ── Page 4: Q9 providers ───────────────────────────────
  const provRows=(d.q9Providers||[]).filter(r=>r&&(r.name||r.providerType||r.examDate));
  html+=`<div class="doc-page">${H(ward,caseNo,'Question 9','4')}
  <div class="doc-schedule-title">9. Examinations to Determine Treatment Needs</div>
  <table class="doc-table">
    <thead><tr><th style="width:2rem">#</th><th>Provider</th><th>Type</th><th style="width:6rem">Exam Date</th></tr></thead>
    <tbody>${provRows.length?provRows.map((r,i)=>`<tr>
      <td>${i+1}</td>
      <td>${esc(r.name||'')}${r.street?'<br>'+esc(r.street):''}${r.cityStateZip?'<br>'+esc(r.cityStateZip):''}${r.phone?'<br>'+esc(r.phone):''}</td>
      <td>${esc(r.providerType||'')}</td>
      <td>${fmtDate(r.examDate)||''}</td></tr>`).join('')
      :'<tr><td colspan="4" style="text-align:center;font-style:italic">No providers listed</td></tr>'}
    </tbody>
  </table>
  </div>`;

  // ── Page 5: Q10A ADLs ──────────────────────────────────
  const adls=d.adls||{};
  html+=`<div class="doc-page">${H(ward,caseNo,'Question 10A','5')}
  <div class="doc-schedule-title">10A. Activities of Daily Living</div>
  <table class="doc-table">
    <thead><tr><th>Activity</th><th style="width:14rem">Rating</th></tr></thead>
    <tbody>${INITIAL_ADLS.map(([k,label])=>`<tr><td>${esc(label)}</td><td>${esc(adls[k]||'')}</td></tr>`).join('')}</tbody>
  </table>
  </div>`;

  // ── Page 6: Q10B–D disabilities & current devices ─────
  html+=`<div class="doc-page">${H(ward,caseNo,'Question 10B–D','6')}
  <div class="doc-schedule-title">B. Mental Disabilities of the Ward</div>
  ${boxes([
    [d.mentalAlzheimers,"Alzheimer's type of dementia"],[d.mentalAutism,'Autism Spectrum Disorders'],
    [d.mentalClosedHeadInjury,'Closed Head Injury'],[d.mentalDementia,'Dementia'],
    [d.mentalDepression,'Depression'],[d.mentalDevelopmental,'Developmental Disabilities'],
    [d.mentalSubstance,'Induced by substance abuse'],[d.mentalSchizophrenia,'Schizophrenia or related disorders'],
    [d.mentalOther,'Other'],
  ])}
  ${d.mentalExplain?`<p style="font-size:.76rem;"><em>Explanation:</em> ${esc(d.mentalExplain)}</p>`:''}
  <div class="doc-schedule-title">C. Physical Disabilities of the Ward</div>
  ${boxes([
    [d.physMobility,'Mobility'],[d.physBlindness,'Blindness'],[d.physDeafness,'Deafness'],
    [d.physDiabetic,'Diabetic'],[d.physParkinsons,"Parkinson's disease"],[d.physArthritis,'Severe arthritis'],
    [d.physOther,'Other'],
  ])}
  ${d.physExplain?`<p style="font-size:.76rem;"><em>Explanation:</em> ${esc(d.physExplain)}</p>`:''}
  <div class="doc-schedule-title">D. Assistive Devices Currently Used</div>
  ${boxes([
    [d.usesDentures,'Dentures'],[d.usesHearingAid,'Hearing Aid'],[d.usesWheelchair,'Wheelchair'],
    [d.usesWalker,'Walker/Cane'],[d.usesCrutches,'Crutches'],[d.usesProsthetics,'Prosthetics'],
    [d.usesGlasses,'Glasses'],[d.usesNone,'None'],[d.usesOther,'Other'],
  ])}
  ${d.usesExplain?`<p style="font-size:.76rem;"><em>Explanation:</em> ${esc(d.usesExplain)}</p>`:''}
  </div>`;

  // ── Page 7: Q11 (no-directives / executed) + Q10E/F ────
  html+=`<div class="doc-page">${H(ward,caseNo,'Question 11 & 10E–F','7')}
  <div class="doc-schedule-title">11. Pre-existing Orders / Advance Directives</div>
  ${boxes([[d.q11NoDirectives,'There are NO pre-existing orders Not To Resuscitate (DNR) or any other advance directive, and I have taken the following steps to verify there are none:']])}
  ${d.q11NoDirectives?boxes([
    [d.q11StepResidence,"Search of ward's prior and current residence"],
    [d.q11StepSafeDeposit,"Inventory of ward's safe deposit box"],
    [d.q11StepInterviewed,'Interviewed family and friends'],
    [d.q11StepMedicalProviders,"Requested documents from the ward's medical providers"],
    [d.q11StepAttorney,"Requested documents from the ward's attorney"],
  ]):''}
  ${boxes([[d.q11Executed,'The ward executed the following advance directives:']])}
  ${d.q11Executed?boxes([
    [d.q11ExecDNR,'Order Not to Resuscitate (DNR), F.S. 401.45(3)'],
    [d.q11ExecHealthcare,'Advance Directive for Healthcare (surrogate, living will, anatomical gift)'],
    [d.q11ExecPOA,'Durable Power of Attorney, F.S. Chapter 709'],
    [d.q11ExecOther,'Other'+(d.q11ExecOtherText?' — '+d.q11ExecOtherText:'')],
  ]):''}
  <div class="doc-schedule-title">E. Assistive Devices Needed But Not Currently Owned</div>
  ${boxes([
    [d.needsDentures,'Dentures'],[d.needsHearingAid,'Hearing Aid'],[d.needsWheelchair,'Wheelchair'],
    [d.needsWalker,'Walker/Cane'],[d.needsCrutches,'Crutches'],[d.needsProsthetics,'Prosthetics'],
    [d.needsGlasses,'Glasses'],[d.needsNone,'None'],[d.needsOther,'Other'],
  ])}
  ${d.needsExplain?`<p style="font-size:.76rem;"><em>Explanation:</em> ${esc(d.needsExplain)}</p>`:''}
  <div class="doc-schedule-title">F. Examining Committee Recommendations Incorporated?</div>
  ${boxes([[d.committeeIncorporated==='Yes','Yes'],[d.committeeIncorporated==='No','No']])}
  ${d.committeeExplain?`<p style="font-size:.76rem;"><em>Explanation:</em> ${esc(d.committeeExplain)}</p>`:''}
  </div>`;

  // ── Page 8: advance directive detail slots ─────────────
  const dirs=(d.q11Directives||[]).filter(r=>r&&(r.title||r.dateSigned||r.signedBy));
  html+=`<div class="doc-page">${H(ward,caseNo,'Advance Directive Detail','8')}
  <div class="doc-schedule-title">Advance Directive Detail (for any directive listed on the prior page)</div>
  ${dirs.length?dirs.map((r,i)=>`<div class="doc-section-block" style="margin-top:.6rem">
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
  </div>`).join(''):'<p style="font-size:.76rem;font-style:italic;">No advance directives on file.</p>'}
  </div>`;

  // ── Page 9: certification + guardian signature ─────────
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
      <div class="col-4">${fld('Relationship to Ward',p.relationship)}</div>
    </div>
    <div class="row mt-2">
      <div class="col-6">${fld('Street Address',p.street)}</div>
      <div class="col-6">${fld('City / State / ZIP',p.cityStateZip)}</div>
    </div>
  </div>`;
  html+=`<div class="doc-page">${H(ward,caseNo,'Certification','9')}
  <div class="doc-schedule-title">Certification and Signature of Guardian(s)</div>
  ${boxes([
    [d.certIncapacitatedNoCopy,'The Ward was declared totally incapacitated and has not been given a copy of this plan.'],
    [d.certMinorNoCopy,'The Ward is a minor under the age of 14 and has not been given a copy of this plan.'],
    [d.certConsulted,"The guardian has consulted with the Ward, to the extent reasonable, has honored the Ward's wishes, and to the maximum extent possible the plan is in accordance with them."],
    [d.certRecognizeRights,'In exercising his or her powers, the guardian shall recognize any rights retained by the ward [F.S. 744.363(6)].'],
    [d.certNoRestriction,'The plan does not restrict the physical liberty of the Ward except as necessary to protect the Ward and others from serious physical injury, illness, or disease.'],
    [d.certProvidesCare,"The plan provides for the Ward's medical care and mental health treatment."],
  ])}
  <div class="attestation-text">UNDER PENALTIES OF PERJURY, I declare that I have read and examined the foregoing plan, and the facts alleged are true, to the best of my knowledge and belief.</div>
  ${sigBlock(g[0]||{},'Guardian')}
  ${sigBlock(g[1]||{},'Co-Guardian')}
  </div>`;

  // ── Page 10: additional co-guardian signatures ─────────
  const extras=(g||[]).slice(2).filter(p=>p&&(p.name||p.signatureDate));
  if(extras.length){
    html+=`<div class="doc-page">${H(ward,caseNo,'Certification (cont.)','10')}
    <div class="doc-schedule-title">Additional Guardian Signatures</div>
    ${extras.map((p,i)=>sigBlock(p,`Co-Guardian ${i+3}`)).join('')}
    <p style="font-size:.74rem;margin-top:.6rem;font-style:italic;">All guardians of person must sign and provide the most current address, telephone number, and SSN. Only reports with original signatures will be audited by the Clerk of the Court.</p>
    </div>`;
  }

  // ── Final page: attorney certification ─────────────────
  html+=`<div class="doc-page">${H(ward,caseNo,'Attorney Certification',String(extras.length?11:10))}
  <div class="doc-schedule-title">Certification and Signature of Guardian's Attorney</div>
  <p style="font-size:.76rem;">The undersigned hereby notifies the court of the filing of the initial guardianship plan for the period <strong>${fmtDate(d.periodFrom)||''}</strong> through <strong>${fmtDate(d.periodTo)||''}</strong>.</p>
  <p style="font-size:.76rem;">This initial guardianship plan is the representation of the guardian. I have not audited the accompanying initial plan. The undersigned attorney represents that he/she has examined the contents of the initial guardianship plan and that it conforms to the requirements of the Florida Guardianship Law and the standards for the plans in ${esc(d.county||'')} County.</p>
  <div class="doc-signature-block">
    <div class="row">
      <div class="col-6">${fld('Attorney Signature','')}</div>
      <div class="col-3">${fld('Date Signed',fmtDate(d.attorney_signatureDate))}</div>
      <div class="col-3">${fld('Attorney Name',d.attorney_name)}</div>
    </div>
    <div class="row mt-2">
      <div class="col-4">${fld('Bar Number',d.attorney_bar)}</div>
      <div class="col-4">${fld('Phone Number',d.attorney_phone)}</div>
      <div class="col-4">${fld('Street Address',d.attorney_street)}</div>
    </div>
    <div class="row mt-2">
      <div class="col-6">${fld('City / State / ZIP',d.attorney_cityStateZip)}</div>
    </div>
    <p class="mt-3" style="font-size:.76rem;text-align:center;font-weight:700;">(End of Initial Guardianship Plan)</p>
  </div>
  </div>`;

  return html;
}

export function planReadinessChecksInitial(){
  const d=window.D;
  const has=v=>!!(v!==''&&v!==null&&v!==undefined);
  const g0=(d.planGuardians||[])[0]||{};
  const provs=(d.q9Providers||[]).filter(r=>r&&r.name);
  const adls=d.adls||{};
  const directives=(d.q11Directives||[]).filter(r=>r&&(r.title||r.dateSigned||r.signedBy));
  const auto=[
    {label:'Ward name, case number and county are on the plan',ok:has(d.wardName)&&has(d.caseNumber)&&has(d.county)},
    {label:'Guardianship Inception Date and date Letters were signed are stated',ok:has(d.inceptionDate)&&has(d.lettersSignedDate)},
    {label:'Signed and dated by a guardian',ok:has(g0.name)&&has(g0.signatureDate)},
    {label:'Guardian address, phone and SSN/EIN provided',ok:has(g0.street)&&has(g0.phone)&&has(g0.ssn)},
    {label:"Ward's current living arrangement and address stated",ok:has(d.wardLiving)&&has(d.residenceAddress)},
    {label:'Question 2 — best-suited residential setting selected',ok:has(d.q2Setting)},
    {label:'Question 3 — medical service provisions selected',ok:!!(d.q3MedPrimary||d.q3MedDentist||d.q3MedOphthalmologist||d.q3MedSpecialist||d.q3MedPT||d.q3MedST||d.q3MedOT||d.q3MedWardDecides||d.q3MedOther)},
    {label:'Question 4 — mental health service provision selected',ok:has(d.q4Mental)},
    {label:'Question 5 — personal care provision selected',ok:has(d.q5Personal)},
    {label:`Question 9 — examining providers listed (${provs.length})`,ok:provs.length>0},
    {label:`Question 10A — all fifteen activities of daily living rated`,ok:INITIAL_ADLS.every(([k])=>has(adls[k]))},
    {label:'Question 10B/C — mental and physical disabilities answered',ok:!!((d.mentalAlzheimers||d.mentalAutism||d.mentalClosedHeadInjury||d.mentalDementia||d.mentalDepression||d.mentalDevelopmental||d.mentalSubstance||d.mentalSchizophrenia||d.mentalOther)&&(d.physMobility||d.physBlindness||d.physDeafness||d.physDiabetic||d.physParkinsons||d.physArthritis||d.physOther))},
    {label:'Question 11 — advance directives answered (none, or executed directives listed)',ok:!!d.q11NoDirectives!==!!d.q11Executed},
    {label:'Question 10F — examining committee recommendation question answered',ok:has(d.committeeIncorporated)},
    {label:'Attorney certification signed and dated',ok:has(d.attorney_name)&&has(d.attorney_signatureDate)},
  ];
  const manual=[
    'File within 60 days after the Letters of Guardianship are signed (F.S. 744.632).',
    'File a separate Disaster Plan alongside this report, per Administrative Order 2019-005.',
    'Serve a copy on all interested persons and file the certificate of service, unless the ward was declared totally incapacitated or is a minor under 14 (see the certification checkboxes).',
    'Attach a copy of any pre-existing advance directive described in the Question 1 narrative.',
    'Confirm the guardian address on file with the Clerk matches the address on this plan.',
    'If you are a professional guardian, confirm your OPPG registration is current.',
    'Only reports with original signatures will be audited by the Clerk of Court.',
  ];
  return {auto,manual};
}

export function pagePrintPlanInitial(){
  const errors=validatePlanInitial();
  highlightErrors(errors);
  return `<div>
    <h1 class="visually-hidden">Print Preview</h1>
    <div class="print-preview-banner no-print">
      <div><strong>Preview &amp; Export</strong> ${errors.length?`<span style="color:var(--danger-text)"> — ${errors.length} issue(s)</span>`:' — Ready to export'}</div>
      <div class="d-flex gap-2 flex-wrap">
        <button class="btn btn-primary btn-sm" data-form-action="save-pdf-plan-initial" ${errors.length?'disabled':''}>Save as PDF</button>
        <button class="btn btn-outline-secondary btn-sm" data-form-action="print">Print</button>
        <button class="btn btn-outline-secondary btn-sm" data-form-action="open-court-portal" title="Opens the Florida Courts E-Filing Portal in a new tab"><svg class="ic" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M14.2 4.4h5.4v5.4"/><path d="m19.6 4.4-8 8"/><path d="M17.4 13.6v6H4.6V6.8h6"/></svg> Florida E-Filing Portal</button>
      </div>
    </div>
    ${errors.length?validationPanel(errors):''}
    ${planReadinessPanel()}
    <div id="print-doc-container"></div>
  </div>`;
}

export async function mountPreview(){
  window.printCurrentFilingPdf = () => printGeneratedPdf(buildPlanInitialModel, window.D);
  await mountPdfPreview(buildPlanInitialModel, window.D);
}

export async function doSavePdf(){
  const errors=validatePlanInitial();
  if(errors.length){renderPage('/print');alert(`Cannot export — ${errors.length} required field${errors.length===1?'':'s'} missing. See the list on this page.`);return;}
  const ward=(window.D.wardName||'InitialGuardianshipPlan').replace(/[^a-z0-9]/gi,'_');
  try{
    const model = buildPlanInitialModel(window.D);
    const doc = await generateCourtFormPdf(model);
    doc.save(`${ward}_InitialGuardianshipPlan.pdf`);
  }catch(e){
    console.error('PDF export failed',e);
    alert('PDF export failed: '+e.message);
  }
}
