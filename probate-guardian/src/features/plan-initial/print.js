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
  highlightErrors, validationPanel, planReadinessPanel,
  renderPage,
  INITIAL_ADLS,
} = window;

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
