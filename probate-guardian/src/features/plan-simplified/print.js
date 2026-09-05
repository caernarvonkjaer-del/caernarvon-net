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
import { mountPdfPreview, printGeneratedPdf } from '../../core/pdf/pdf-preview.js';

const {
  highlightErrors, validationPanel, planReadinessPanel,
  renderPage,
} = window;

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
    <div id="print-doc-container"></div>
  </div>`;
}

export async function mountPreview(){
  window.printCurrentFilingPdf = () => printGeneratedPdf(buildPlanSimplifiedModel, window.D);
  await mountPdfPreview(buildPlanSimplifiedModel, window.D);
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
