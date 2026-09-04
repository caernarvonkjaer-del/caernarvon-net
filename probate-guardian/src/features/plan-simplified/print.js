// Print/PDF export for the Simplified Annual Plan (Milestone 3, Phase C).
// Dynamically imported from ./index.js only when the user reaches /print or
// triggers PDF export -- same lazy boundary as
// src/features/simplified-accounting/print.js.
//
// Statically imports validatePlanSimplified back from ./index.js -- safe
// despite index.js dynamically importing this file, since neither side
// touches the other's export during top-level module evaluation, only
// inside function bodies called later (see
// src/features/simplified-accounting/index.js's comment on the same
// pattern).
import { validatePlanSimplified } from './index.js';
import { buildPlanSimplifiedModel } from './pdf-model.js';
import { generateCourtFormPdf } from '../../core/pdf/pdf-engine.js';

const {
  circuitCourtCaption, esc, tdSig, fmtDate,
  highlightErrors, validationPanel, planReadinessPanel,
  renderPage,
} = window;

function docHeaderPlanSimplified(ward,caseNo,section,page){
  return `<div class="doc-header">
    <div class="court-title">${circuitCourtCaption(window.D.county,true)}</div>
    <div class="doc-title">SIMPLIFIED ANNUAL PLAN</div>
    <div class="doc-meta">
      <span>IN RE: The Guardianship of <strong>${ward}</strong></span>
      <span>${section}${page?' — Page '+page:''}</span>
      <span>Case No.: <strong>${caseNo}</strong></span>
    </div>
  </div>`;
}

function buildPrintHTMLPlanSimplified(){
  const d=window.D;
  const ward=esc(d.wardName);
  const caseNo=esc(d.caseNumber);
  const ans=v=>esc(v||'').replace(/\n/g,'<br>')||'<span style="color:#888">—</span>';
  const yn=v=>v?esc(v):'<span style="color:#888">—</span>';
  const q=(n,text,body)=>`<div class="doc-section-block" style="margin-bottom:.85rem;">
    <div style="font-size:.78rem;font-weight:700;margin-bottom:.3rem;">${n}. ${text}</div>
    <div style="font-size:.76rem;line-height:1.55;padding-left:.9rem;">${body}</div>
  </div>`;
  let html='';

  html+=`<div class="doc-page">${docHeaderPlanSimplified(ward,caseNo,'Plan','1')}
  <div class="attestation-text" style="font-size:.75rem;">The undersigned, as the Guardian Advocate(s) or Guardian(s) of the above-named ward, report(s) to the court as follows:</div>
  <div class="doc-table-div mb-2" style="font-size:.76rem;">
    ${tdSig('For the Period',`From: ${fmtDate(d.periodFrom)}&nbsp;&nbsp;&nbsp;To: ${fmtDate(d.periodTo)}`)}
  </div>
  ${q(1,'The name and address of all places the ward has resided during the preceding year.',ans(d.q1Residences))}
  ${q(2,'Why is this the best placement for the ward?',ans(d.q2BestPlacement))}
  ${q(3,'List all professional medical/mental health treatment the ward has received during the past year.',ans(d.q3MedicalTreatment))}
  ${q(4,"What is/are the ward's current diagnosis and condition(s) which cause(s) him/her to continue to need a guardian advocate/guardian?",ans(d.q4Diagnosis))}
  </div>`;

  const directives=[
    d.q8DNR?'Do Not Resuscitate ("DNR")':null,
    d.q8LivingWill?'Living Will / Anatomical Gift':null,
    d.q8Surrogate?'Healthcare Surrogate Designation':null,
    d.q8POA?'Power of Attorney':null,
    d.q8Other?`Other Advance Directive: ${esc(d.q8OtherText||'')}`:null,
    d.q8None?'NONE':null,
  ].filter(Boolean);

  html+=`<div class="doc-page">${docHeaderPlanSimplified(ward,caseNo,'Plan','2')}
  ${q(5,'What personal and social services were provided for the ward in the past year?',ans(d.q5SocialServices))}
  ${q(6,'In the past year, how has the ward interacted with others, including the guardian advocate(s)/guardian(s) and family members?',ans(d.q6Interaction))}
  ${q(7,'Should any of the rights previously delegated to the guardian advocate(s)/guardian(s) be restored to the ward at this time?',
    `<strong>${yn(d.q7RestoreRights)}</strong>${d.q7RestoreRights==='Yes'?`<div style="margin-top:.25rem;">${ans(d.q7RestoreExplain)}</div>`:''}`)}
  ${q(8,'Since the guardianship was established or the last annual guardianship report, the following was executed by or on behalf of the Ward:',
    directives.length?`<ul style="margin:0;padding-left:1.1rem;">${directives.map(x=>`<li>${x}</li>`).join('')}</ul>`:'<span style="color:#888">—</span>')}
  ${q(9,'As the Guardian Advocate(s)/Guardian(s) have you received any payments, goods, or services for work or care provided on behalf of the ward?',
    `<strong>${yn(d.q9Remuneration)}</strong>${d.q9Remuneration==='Yes'?`<div style="margin-top:.25rem;">${ans(d.q9RemunerationExplain)}</div>`:''}`)}
  </div>`;

  const sig=(g,label)=>{
    if(!g||!(g.name||g.signatureDate||g.email||g.phone||g.mailingAddress))return '';
    return `<div class="doc-signature-block" style="margin-bottom:1.1rem;">
      <div class="attestation-text" style="font-size:.73rem;">Under penalty of perjury, I declare that I have read the foregoing and the facts alleged are true to the best of my knowledge and belief.</div>
      <div class="row">
        <div class="col-6"><div class="doc-field-label">${label} Signature</div><div class="doc-signature-line"></div></div>
        <div class="col-6"><div class="doc-field-label">Dated</div><div class="doc-signature-line">${fmtDate(g.signatureDate)}</div></div>
      </div>
      <div class="row mt-2">
        <div class="col-6"><div class="doc-field-label">Printed Name</div><div class="doc-signature-line">${esc(g.name)}</div></div>
        <div class="col-6"><div class="doc-field-label">Email Address</div><div class="doc-signature-line">${esc(g.email)}</div></div>
      </div>
      <div class="row mt-2">
        <div class="col-6"><div class="doc-field-label">Phone Number</div><div class="doc-signature-line">${esc(g.phone)}</div></div>
        <div class="col-6"><div class="doc-field-label">Mailing Address</div><div class="doc-signature-line">${esc(g.mailingAddress)}</div></div>
      </div>
    </div>`;
  };
  const g=d.planGuardians||[];
  html+=`<div class="doc-page">${docHeaderPlanSimplified(ward,caseNo,'Signatures','3')}
  <div class="doc-schedule-title">CERTIFICATION AND SIGNATURE OF GUARDIAN(S) / GUARDIAN ADVOCATE(S)</div>
  ${sig(g[0],'Guardian / Guardian Advocate')||'<p style="font-size:.76rem;color:#888;">No signature entered.</p>'}
  ${sig(g[1],'Guardian / Guardian Advocate')}
  <p style="font-size:.72rem;margin-top:1rem;line-height:1.5;"><strong>Filing:</strong> For Pinellas County cases, file the original with the Clerk of the Circuit Court, 315 Court Street, Room 106, Clearwater, FL 33756. For Pasco County cases, provide the original to the Clerk &amp; Comptroller, P.O. Box 338, New Port Richey, FL 34656-0338. E-filing instructions are at myflcourtaccess.com.</p>
  </div>`;

  return html;
}

// planReadinessChecks() -- the shared dispatcher across all four Plan types
// -- stays in legacy-app.js (Problem 3: planAnnual/planInitial/planMinor
// haven't been extracted, so it must keep calling their still-legacy
// checklist functions too) and reaches this export via window.
export function planReadinessChecksSimplified(){
  const d=window.D;
  const has=v=>!!(v!==''&&v!==null&&v!==undefined);
  const g0=(d.planGuardians||[])[0]||{};
  const auto=[
    {label:'Reporting period is stated',ok:has(d.periodFrom)&&has(d.periodTo)},
    {label:'Ward name and case number are on the plan',ok:has(d.wardName)&&has(d.caseNumber)},
    {label:'Signed and dated by a guardian',ok:has(g0.name)&&has(g0.signatureDate)},
    {label:'Guardian contact details provided (email, phone, mailing address)',ok:has(g0.email)&&has(g0.phone)&&has(g0.mailingAddress)},
    {label:"Ward's residences for the year are listed",ok:has(d.q1Residences)},
    {label:'Professional medical / mental health treatment is listed',ok:has(d.q3MedicalTreatment)},
    {label:'Current diagnosis and continuing need for a guardian is stated',ok:has(d.q4Diagnosis)},
    {label:'Rights-restoration question answered',ok:has(d.q7RestoreRights)},
    {label:'Advance directives question answered',ok:!!(d.q8DNR||d.q8LivingWill||d.q8Surrogate||d.q8POA||d.q8Other||d.q8None)},
    {label:'Remuneration declared',ok:has(d.q9Remuneration)},
  ];
  const manual=[
    'File within the deadline set by the court for your case.',
    'Serve a copy on all interested persons, and file the certificate of service.',
    'If the ward executed any advance directive listed in Question 8, attach copies unless already filed.',
    'If you are a professional guardian, confirm your registration with the Office of Public & Professional Guardians is current.',
    'Confirm the guardian address on file with the Clerk matches the address on this plan.',
    "File the physician's report separately if the court requires one for this reporting period.",
  ];
  return {auto,manual};
}

export function pagePrintPlanSimplified(){
  const errors=validatePlanSimplified();
  highlightErrors(errors);
  return `<div>
    <h1 class="visually-hidden">Print Preview</h1>
    <div class="print-preview-banner no-print">
      <div><strong>Preview &amp; Export</strong> ${errors.length?`<span style="color:var(--danger-text)"> — ${errors.length} issue(s)</span>`:' — Ready to export'}</div>
      <div class="d-flex gap-2 flex-wrap">
        <button class="btn btn-primary btn-sm" data-plan-simplified-action="save-pdf" ${errors.length?'disabled':''}>Save as PDF</button>
        <button class="btn btn-outline-secondary btn-sm" data-plan-simplified-action="print">Print</button>
        <button class="btn btn-outline-secondary btn-sm" data-plan-simplified-action="open-court-portal" title="Opens the Florida Courts E-Filing Portal in a new tab"><svg class="ic" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M14.2 4.4h5.4v5.4"/><path d="m19.6 4.4-8 8"/><path d="M17.4 13.6v6H4.6V6.8h6"/></svg> Florida E-Filing Portal</button>
      </div>
    </div>
    ${errors.length?validationPanel(errors):''}
    ${planReadinessPanel()}
    <div id="print-doc-container">${buildPrintHTMLPlanSimplified()}</div>
  </div>`;
}

export async function doSavePdf(){
  const errors=validatePlanSimplified();
  if(errors.length){renderPage('/print');alert(`Cannot export — ${errors.length} required field${errors.length===1?'':'s'} missing. See the list on this page.`);return;}
  const ward=(window.D.wardName||'SimplifiedAnnualPlan').replace(/[^a-z0-9]/gi,'_');
  try{
    const model = buildPlanSimplifiedModel(window.D);
    const doc = await generateCourtFormPdf(model);
    doc.save(`${ward}_SimplifiedAnnualPlan.pdf`);
  }catch(e){
    console.error('PDF export failed',e);
    alert('PDF export failed: '+e.message);
  }
}
