// Print/PDF export for Annual Plan — Minors (Milestone 6, Phase B).
// Dynamically imported from ./index.js only when the user reaches /print or
// triggers PDF export -- same lazy boundary as the other three extracted
// Plan features.
//
// Statically imports validatePlanMinor back from ./index.js -- safe despite
// index.js dynamically importing this file, since neither side touches the
// other's export during top-level module evaluation, only inside function
// bodies called later (see src/features/simplified-accounting/index.js's
// comment on the same pattern).
import { validatePlanMinor } from './index.js';
import { buildPlanMinorModel } from './pdf-model.js';
import { generateCourtFormPdf } from '../../core/pdf/pdf-engine.js';

const {
  circuitCourtCaption, esc, fmtDate,
  highlightErrors, validationPanel, planReadinessPanel,
  renderPage,
} = window;

function docHeaderPlanMinor(ward,caseNo,section,page){
  return `<div class="doc-header">
    <div class="court-title">${circuitCourtCaption(window.D.county,true)}</div>
    <div class="doc-title">ANNUAL GUARDIANSHIP PLAN — MINOR</div>
    <div class="doc-meta">
      <span>IN RE: THE GUARDIANSHIP OF <strong>${ward}</strong> (MINOR)</span>
      <span>${section}${page?' — Page '+page:''}</span>
      <span>UCN/REF: <strong>${caseNo}</strong></span>
    </div>
  </div>`;
}

function buildPrintHTMLPlanMinor(){
  const d=window.D;
  const ward=esc(d.wardName||'');
  const caseNo=esc(`${d.ucn||''} ${d.ref||''}`.trim());
  const H=docHeaderPlanMinor;
  const y=v=>v?'☒':'☐';
  const line=v=>`<div class="doc-answer">${esc(v||'')||'&nbsp;'}</div>`;
  const fld=(label,val)=>`<div class="doc-field-label">${label}</div><div class="doc-signature-line">${esc(val||'')}</div>`;
  const boxes=(items)=>`<div class="doc-checklist">${items.map(([on,label])=>`<div class="doc-check-row">${y(on)} ${esc(label)}</div>`).join('')}</div>`;
  let html='';

  // ── Page 1: cover ─────────────────────────────────────
  html+=`<div class="doc-page">${H(ward,caseNo,'Cover','1')}
  <div class="doc-table-div"><div class="tbl">
    <div class="tr"><div class="td">UCN</div><div class="td">${esc(d.ucn||'')}</div></div>
    <div class="tr"><div class="td">REF #</div><div class="td">${esc(d.ref||'')}</div></div>
    <div class="tr"><div class="td">For the period</div><div class="td">${fmtDate(d.periodFrom)||''} to ${fmtDate(d.periodTo)||''}</div></div>
    <div class="tr"><div class="td">Guardian Name(s)</div><div class="td">${esc(d.guardianName||'')}</div></div>
  </div></div>
  ${boxes([[d.amendedForm==='Yes','Amended Form'],[d.professionalGuardian==='Yes','Professional Guardian'],[d.publicGuardian==='Yes','Public Guardian']])}
  ${d.amendedForm==='Yes'&&d.amendedVersion?`<p style="font-size:.76rem;">Amended version: <strong>${esc(d.amendedVersion)}</strong></p>`:''}
  <div class="doc-schedule-title">1. Where the Minor Presently Resides</div>
  <div class="doc-table-div"><div class="tbl">
    <div class="tr"><div class="td">Residence Name</div><div class="td">${esc(d.q1ResidenceName||'')}</div></div>
    <div class="tr"><div class="td">Street Address</div><div class="td">${esc(d.q1Street||'')}</div></div>
    <div class="tr"><div class="td">City / State / Zip</div><div class="td">${esc(d.q1City||'')} ${esc(d.q1State||'')} ${esc(d.q1Zip||'')}</div></div>
    <div class="tr"><div class="td">Phone</div><div class="td">${esc(d.q1Phone||'')}</div></div>
  </div></div>
  </div>`;

  // ── Page 2: Q2 residences + Q3 providers ──────────────
  const resRows=(d.q2Residences||[]).filter(r=>r&&(r.name||r.street||r.city));
  const provRows=(d.q3Providers||[]).filter(r=>r&&(r.first||r.last||r.providerType));
  html+=`<div class="doc-page">${H(ward,caseNo,'Questions 2–3','2')}
  <div class="doc-schedule-title">2. Residences During the Preceding 12 Months</div>
  <table class="doc-table">
    <thead><tr><th style="width:2rem">#</th><th>Residence</th><th>City/State/Zip</th><th>Phone</th></tr></thead>
    <tbody>${resRows.length?resRows.map((r,i)=>`<tr>
      <td>${i+1}</td>
      <td>${esc(r.name||'')}${r.street?'<br>'+esc(r.street):''}</td>
      <td>${esc(r.city||'')} ${esc(r.state||'')} ${esc(r.zip||'')}</td>
      <td>${esc(r.phone||'')}</td></tr>`).join('')
      :'<tr><td colspan="4" style="text-align:center;font-style:italic">No prior residences listed</td></tr>'}
    </tbody>
  </table>
  <div class="doc-schedule-title">3. Medical &amp; Mental Health Treatment Providers</div>
  <table class="doc-table">
    <thead><tr><th style="width:2rem">#</th><th>Provider</th><th>Type</th><th style="width:5rem">Visits</th></tr></thead>
    <tbody>${provRows.length?provRows.map((r,i)=>`<tr>
      <td>${i+1}</td>
      <td>${esc([r.first,r.mi,r.last].filter(Boolean).join(' '))}${r.street?'<br>'+esc(r.street):''}${(r.city||r.state||r.zip)?'<br>'+esc([r.city,r.state,r.zip].filter(Boolean).join(' ')):''}${r.phone?'<br>'+esc(r.phone):''}</td>
      <td>${esc(r.providerType||'')}</td>
      <td>${esc(r.visits||'')}</td></tr>`).join('')
      :'<tr><td colspan="4" style="text-align:center;font-style:italic">No providers listed</td></tr>'}
    </tbody>
  </table>
  </div>`;

  // ── Page 3: Q4 medical services ────────────────────────
  html+=`<div class="doc-page">${H(ward,caseNo,'Question 4','3')}
  <div class="doc-schedule-title">4. Provision of Medical Services for the Plan Period</div>
  ${boxes([[d.q4Primary,'Routine examination by primary care physician'+(d.q4PrimaryFreq?' — '+d.q4PrimaryFreq:'')]])}
  ${boxes([[d.q4Dentist,'Routine examination by dentist'+(d.q4DentistFreq?' — '+d.q4DentistFreq:'')]])}
  ${boxes([[d.q4Specialist,'Routine examination by specialist'+(d.q4SpecialistFreq?' — '+d.q4SpecialistFreq:'')]])}
  ${boxes([
    [d.q4PT,'Physical Therapy'],[d.q4ST,'Speech Therapy'],[d.q4OT,'Occupational Therapy'],
    [d.q4MinorDecides,'The Minor retains the right to make his or her own decision'],
    [d.q4Other,'Other'],
  ])}
  ${d.q4Explain?`<p style="font-size:.76rem;"><em>Explanation:</em> ${esc(d.q4Explain)}</p>`:''}
  </div>`;

  // ── Page 4: Q5 education & social development ─────────
  html+=`<div class="doc-page">${H(ward,caseNo,'Question 5','4')}
  <div class="doc-schedule-title">5. Education of the Minor</div>
  <p style="font-size:.76rem;font-weight:650;margin-bottom:.2rem;">A. School progress report summary:</p>
  ${line(d.q5SchoolProgress)}
  <p style="font-size:.76rem;font-weight:650;margin:.5rem 0 .2rem;">B. Social development:</p>
  ${line(d.q5SocialDevelopment)}
  <p style="font-size:.76rem;font-weight:650;margin:.5rem 0 .2rem;">C. How well the Minor communicates with others:</p>
  ${line(d.q5Communicates)}
  <p style="font-size:.76rem;font-weight:650;margin:.5rem 0 .2rem;">D. How well the Minor maintains interpersonal relationships:</p>
  ${line(d.q5Interpersonal)}
  <p style="font-size:.76rem;font-weight:650;margin:.5rem 0 .2rem;">E. Unmet social needs of the Minor:</p>
  ${boxes([
    [d.q5NoUnmetNeeds,'No Unmet Needs'],
    [d.q5DoesNotCareToSocialize,'The Minor does not care to socialize'],
    [d.q5UnmetNeeds,'Unmet Needs'],
    [d.q5Other,'Other'],
  ])}
  ${d.q5Explain?`<p style="font-size:.76rem;"><em>Explanation:</em> ${esc(d.q5Explain)}</p>`:''}
  </div>`;

  // ── Page 5: certification + guardian signatures ────────
  const g=d.planGuardians||[];
  const sigBlock=(p,label)=>`<div class="doc-signature-block">
    <p style="font-size:.76rem;font-weight:650;margin-bottom:.3rem;">${label}</p>
    <div class="row">
      <div class="col-6">${fld('Signature','')}</div>
      <div class="col-3">${fld('Date Signed',fmtDate(p.signatureDate))}</div>
      <div class="col-3">${fld('Printed Name',p.name)}</div>
    </div>
    <div class="row mt-2">
      <div class="col-4">${fld('Taxpayer ID #',p.tin)}</div>
      <div class="col-4">${fld('Telephone #',p.phone)}</div>
      <div class="col-4">${fld('Relationship to Ward',p.relationship)}</div>
    </div>
    <div class="row mt-2">
      <div class="col-6">${fld('Mailing Address',p.mailingStreet)}</div>
      <div class="col-6">${fld('City / State / Zip',p.mailingCityStateZip)}</div>
    </div>
    <div class="row mt-2">
      <div class="col-6">${fld('Email Address',p.email)}</div>
    </div>
  </div>`;
  html+=`<div class="doc-page">${H(ward,caseNo,'Certification','5')}
  <div class="doc-schedule-title">Certification and Signature of Guardian(s)</div>
  ${boxes([
    [d.certIncapacitated,'The Ward was declared totally incapacitated.'],
    [d.certMinor,'The Ward is a minor.'],
    [d.certConsulted,"The guardian has consulted with the Ward, to the extent reasonable, has honored the Ward's wishes, and to the maximum extent possible the plan is in accordance with the Ward's wishes or consistent with the rights retained by the Ward."],
    [d.certNoRestriction,'The plan does not restrict the physical liberty of the Ward except as necessary to protect the Ward and others from serious physical injury, illness, or disease.'],
    [d.certProvidesCare,"The plan provides for the Ward's medical care and mental health treatment."],
    [d.certPhysicianAttached,"The physician's statement of an examination of the Ward no more than 90 days before the beginning of the plan period is attached."],
  ])}
  <div class="attestation-text">UNDER PENALTIES OF PERJURY, I declare that I have read and examined the foregoing plan, and the facts alleged are true, to the best of my knowledge and belief.</div>
  ${sigBlock(g[0]||{},'Guardian')}
  ${sigBlock(g[1]||{},'Co-Guardian')}
  </div>`;

  // ── Page 6: preparer + attorney certification ──────────
  html+=`<div class="doc-page">${H(ward,caseNo,'Preparer & Attorney',String(6))}
  <div class="doc-schedule-title">Certification and Signature of Preparer</div>
  <p style="font-size:.75rem;margin-bottom:.5rem;">The preparation of this form is based upon the information provided by the guardian(s) and/or attorney with no independent verification of the information contained herein. I have not audited or reviewed the guardianship plan or documents supporting its preparation, and accordingly do not express an opinion or any other form of assurance as to the accuracy of the information contained in the plan.</p>
  <div class="doc-signature-block">
    <div class="row">
      <div class="col-6">${fld('Preparer Signature','')}</div>
      <div class="col-3">${fld('Date Signed',fmtDate(d.preparer_signatureDate))}</div>
      <div class="col-3">${fld('Preparer Name',d.preparer_name)}</div>
    </div>
    <div class="row mt-2">
      <div class="col-4">${fld('Taxpayer ID #',d.preparer_tin)}</div>
      <div class="col-4">${fld('Telephone #',d.preparer_phone)}</div>
      <div class="col-4">${fld('Email Address',d.preparer_email)}</div>
    </div>
    <div class="row mt-2">
      <div class="col-6">${fld('Mailing Address',d.preparer_mailingStreet)}</div>
      <div class="col-6">${fld('City / State / Zip',d.preparer_cityStateZip)}</div>
    </div>
  </div>
  <div class="doc-schedule-title mt-3">Certification and Signature of Guardian's Attorney</div>
  <p style="font-size:.76rem;">The undersigned hereby notifies the Court of the filing of this Annual Guardianship Plan. This plan is the representation of the guardian. I have not audited the accompanying plan. The undersigned attorney represents that he/she has examined the contents of this plan and that it conforms to the requirements of the Florida Guardianship Law.</p>
  <div class="doc-signature-block">
    <div class="row">
      <div class="col-6">${fld('Attorney Signature','')}</div>
      <div class="col-3">${fld('Date Signed',fmtDate(d.attorney_signatureDate))}</div>
      <div class="col-3">${fld('Attorney Name',d.attorney_name)}</div>
    </div>
    <div class="row mt-2">
      <div class="col-4">${fld('Bar Number',d.attorney_bar)}</div>
      <div class="col-4">${fld('Phone Number',d.attorney_phone)}</div>
      <div class="col-4">${fld('Email Address',d.attorney_email)}</div>
    </div>
    <div class="row mt-2">
      <div class="col-6">${fld('Mailing Address',d.attorney_street)}</div>
      <div class="col-6">${fld('City / State / Zip',d.attorney_cityStateZip)}</div>
    </div>
    <p class="mt-3" style="font-size:.76rem;text-align:center;font-weight:700;">(End of Annual Plan — Minors)</p>
  </div>
  </div>`;

  return html;
}

export function planReadinessChecksMinor(){
  const d=window.D;
  const has=v=>!!(v!==''&&v!==null&&v!==undefined);
  const g0=(d.planGuardians||[])[0]||{};
  const provs=(d.q3Providers||[]).filter(r=>r&&r.last);
  const auto=[
    {label:"Minor's name, county, and reporting period are on the plan",ok:has(d.wardName)&&has(d.county)&&has(d.periodFrom)&&has(d.periodTo)},
    {label:'Current residence and address stated',ok:has(d.q1ResidenceName)&&has(d.q1Street)},
    {label:'Signed and dated by a guardian',ok:has(g0.name)&&has(g0.signatureDate)},
    {label:'Guardian address, phone and taxpayer ID provided',ok:has(g0.mailingStreet)&&has(g0.phone)&&has(g0.tin)},
    {label:'Question 4 — provision of medical services selected',ok:!!(d.q4Primary||d.q4Dentist||d.q4Specialist||d.q4PT||d.q4ST||d.q4OT||d.q4MinorDecides||d.q4Other)},
    {label:"Question 5 — school progress, social development, communication, and interpersonal statements completed",ok:has(d.q5SchoolProgress)&&has(d.q5SocialDevelopment)&&has(d.q5Communicates)&&has(d.q5Interpersonal)},
    {label:'Question 5E — unmet social needs answered',ok:!!(d.q5NoUnmetNeeds||d.q5DoesNotCareToSocialize||d.q5UnmetNeeds||d.q5Other)},
    {label:'Preparer certification completed',ok:has(d.preparer_name)&&has(d.preparer_signatureDate)},
    {label:'Attorney certification signed and dated',ok:has(d.attorney_name)&&has(d.attorney_signatureDate)},
    {label:`Treatment providers listed (${provs.length})`,ok:provs.length>0},
  ];
  const manual=[
    "Attach the physician's statement of an examination of the ward no more than 90 days before the beginning of the plan period, if the certification box for it is checked.",
    'Serve a copy on all interested persons and file the certificate of service, unless the ward was declared totally incapacitated or is a minor (see the certification checkboxes).',
    'Confirm the guardian address on file with the Clerk matches the address on this plan.',
    'If you are a professional or public guardian, confirm the corresponding registration is current.',
    'This general checklist is not derived from an official Clerk\'s Review form for this document — confirm current local filing requirements before submitting.',
  ];
  return {auto,manual};
}

export function pagePrintPlanMinor(){
  const errors=validatePlanMinor();
  highlightErrors(errors);
  return `<div>
    <h1 class="visually-hidden">Print Preview</h1>
    <div class="print-preview-banner no-print">
      <div><strong>Preview &amp; Export</strong> ${errors.length?`<span style="color:var(--danger-text)"> — ${errors.length} issue(s)</span>`:' — Ready to export'}</div>
      <div class="d-flex gap-2 flex-wrap">
        <button class="btn btn-primary btn-sm" data-form-action="save-pdf-plan-minor" ${errors.length?'disabled':''}>Save as PDF</button>
        <button class="btn btn-outline-secondary btn-sm" data-form-action="print">Print</button>
        <button class="btn btn-outline-secondary btn-sm" data-form-action="open-court-portal" title="Opens the Florida Courts E-Filing Portal in a new tab"><svg class="ic" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M14.2 4.4h5.4v5.4"/><path d="m19.6 4.4-8 8"/><path d="M17.4 13.6v6H4.6V6.8h6"/></svg> Florida E-Filing Portal</button>
      </div>
    </div>
    ${errors.length?validationPanel(errors):''}
    ${planReadinessPanel()}
    <div id="print-doc-container">${buildPrintHTMLPlanMinor()}</div>
  </div>`;
}

export async function doSavePdf(){
  const errors=validatePlanMinor();
  if(errors.length){renderPage('/print');alert(`Cannot export — ${errors.length} required field${errors.length===1?'':'s'} missing. See the list on this page.`);return;}
  const ward=(window.D.wardName||'AnnualPlanMinors').replace(/[^a-z0-9]/gi,'_');
  try{
    const model = buildPlanMinorModel(window.D);
    const doc = await generateCourtFormPdf(model);
    doc.save(`${ward}_AnnualPlanMinors.pdf`);
  }catch(e){
    console.error('PDF export failed',e);
    alert('PDF export failed: '+e.message);
  }
}
