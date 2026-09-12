// Print/PDF export for the Simplified Annual Plan (Milestone 3, Phase C).
// Dynamically imported from ./index.js only when the user reaches /print or
// triggers PDF export -- same lazy boundary as
// src/features/simplified-accounting/print.js.
//
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
import { finalizeCourtFormPdf, saveFinalizedPdf } from '../../core/pdf/pdf-finalizer.js';
import { generateCourtFormDocx, saveFinalizedDocx } from '../../core/docx/docx-engine.js';
import { mountPdfPreview, printGeneratedPdf } from '../../core/pdf/pdf-preview.js';
import { getSupplementalAccessibilityWarning, getSupplementalFilingIssues } from '../../core/pdf/supplemental-pdf.js';
import { prepareFilingOutput } from '../../core/filing/output-preflight.js';
import { renderOutputAdvisories } from '../../core/filing/output-advisories.js';
import { hasSixthCircuitLocalGuidance } from '../../core/filing/county-guidance.js';

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
  // Milestone 37-3: every item below carries a stable `id` -- never shown in
  // the UI (planReadinessPanel() only reads .label/.ok) -- so the fixture-
  // based parity suite (tests/unit/plan-simplified-readiness-parity.spec.js)
  // can assert against a condition identifier instead of fragile label text.
  // cover.wardCaseCounty, plan.q2, plan.q5, and plan.q6 are new: county,
  // Question 2 (why this placement), Question 5 (personal/social services),
  // and Question 6 (interaction with others) are all required by
  // validatePlanSimplified() below but had no readiness item at all before
  // this milestone -- a filer could see every check pass here and still be
  // blocked at Print Preview by one of these four. See that parity suite for
  // the full auto/validator mapping and the fixtures proving it.
  const auto=[
    {id:'cover.period',label:'Reporting period is stated',ok:has(d.periodFrom)&&has(d.periodTo)},
    {id:'cover.wardCaseCounty',label:'Ward name, case number, and county are on the plan',ok:has(d.wardName)&&has(d.caseNumber)&&has(d.county)},
    {id:'signatures.guardian1.core',label:'Signed and dated by a guardian',ok:has(g0.name)&&has(g0.signatureDate)},
    {id:'signatures.guardian1.contact',label:'Guardian contact details provided (email, phone, mailing address)',ok:has(g0.email)&&has(g0.phone)&&has(g0.mailingAddress)},
    {id:'plan.q1',label:"Ward's residences for the year are listed",ok:has(d.q1Residences)},
    {id:'plan.q2',label:'Question 2 — reason this placement best suits the ward is stated',ok:has(d.q2BestPlacement)},
    {id:'plan.q3',label:'Professional medical / mental health treatment is listed',ok:has(d.q3MedicalTreatment)},
    {id:'plan.q4',label:'Current diagnosis and continuing need for a guardian is stated',ok:has(d.q4Diagnosis)},
    {id:'plan.q5',label:'Question 5 — personal and social services described',ok:has(d.q5SocialServices)},
    {id:'plan.q6',label:'Question 6 — interaction with others described',ok:has(d.q6Interaction)},
    {id:'plan.q7',label:'Rights-restoration question answered',ok:has(d.q7RestoreRights)},
    {id:'plan.q8',label:'Advance directives question answered',ok:!!(d.q8DNR||d.q8LivingWill||d.q8Surrogate||d.q8POA||d.q8Other||d.q8None)},
    {id:'plan.q9',label:'Remuneration declared',ok:has(d.q9Remuneration)},
  ];
  const manual=[
    'File within the deadline set by the court for your case.',
    hasSixthCircuitLocalGuidance(d.county)
      ? 'Local Sixth Judicial Circuit requirement: serve a copy on all interested persons, and file the certificate of service.'
      : "Serve a copy of this plan on the ward -- unless the ward is a minor or was declared totally incapacitated -- and on the ward's attorney, if any. Provide additional copies to anyone else the court directs (F.S. 744.367(3)(b)).",
    "If the ward relocated: file a Notice of Change of Residence within 15 days for moves to an adjacent county (F.S. 744.1098(2)), and obtain a prior court order for moves to non-adjacent counties or out of state (F.S. 744.1098(1)).",
    'If the ward executed any advance directive listed in Question 8, attach copies unless already filed -- advance directives need only be filed once.',
    'Attach the Annual Financial Statement / Affidavit if required for this case (mandatory if the guardian has property delegation and annual accountings were waived).',
    "The $27.50 background investigation fee must be paid by the guardian individually and cannot be paid from the ward's assets.",
    'If you are a professional guardian, confirm your registration with the Office of Public & Professional Guardians is current.',
    'Confirm the guardian address on file with the Clerk matches the address on this plan.',
    "File the physician's report separately if the court requires one for this reporting period.",
  ];
  return {auto,manual};
}

export function pagePrintPlanSimplified(){
  window.queueAllScheduleDocValidations?.();
  const preflight=prepareFilingOutput(window.D,()=>[...validatePlanSimplified(), ...getSupplementalFilingIssues(window.D)]);
  const errors=preflight.messages;
  const supplementalWarning=getSupplementalAccessibilityWarning(window.D);
  highlightErrors(errors);
  return `<div>
    <h1 class="visually-hidden">Print Preview</h1>
    <div class="print-preview-banner no-print">
      <div><strong>Preview &amp; Export</strong> ${errors.length?`<span style="color:var(--danger-text)"> — ${errors.length} issue(s)</span>`:' — Ready to export'}</div>
      <div class="d-flex gap-2 flex-wrap">
        <span id="export-status" style="font-size:.8rem;color:var(--ink-3);"></span>
        <button class="btn btn-outline-primary btn-sm" data-plan-simplified-action="save-word" ${errors.length?'disabled':''} title="Save editable Word copy (.docx)"><svg class="ic" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M6.4 3.4h7l4.2 4.2v13H6.4Z"/><path d="M13.2 3.4v4.4h4.4"/><path d="M8.8 11.5h6.4M8.8 14.5h6.4M8.8 17.5h4"/></svg> Save as Word</button>
        <button class="btn btn-primary btn-sm" data-plan-simplified-action="save-pdf" ${errors.length?'disabled':''}>Save as PDF</button>
        <button class="btn btn-outline-secondary btn-sm" data-plan-simplified-action="print">Print</button>
        <button class="btn btn-outline-secondary btn-sm" data-plan-simplified-action="open-court-portal" title="Opens the Florida Courts E-Filing Portal in a new tab"><svg class="ic" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M14.2 4.4h5.4v5.4"/><path d="m19.6 4.4-8 8"/><path d="M17.4 13.6v6H4.6V6.8h6"/></svg> Florida E-Filing Portal</button><span data-preview-shell-actions></span>
      </div>
    </div>
    ${errors.length?validationPanel(errors):''}
    ${renderOutputAdvisories(preflight.advisories)}
    ${supplementalWarning?`<div class="alert alert-warning no-print" role="status">${supplementalWarning}</div>`:''}
    ${planReadinessPanel()}
    <div id="print-doc-container"></div>
  </div>`;
}

export async function mountPreview(){
  const baseIssues = () => [...validatePlanSimplified(), ...getSupplementalFilingIssues(window.D)];
  window.printCurrentFilingPdf = () => printGeneratedPdf(buildPlanSimplifiedModel, window.D, baseIssues);
  // Milestone 39-A pilot: Simplified Annual Plan is the only filing type
  // gated into the annotation editor for this spike (MILESTONE-39-PROPOSAL.md
  // 39-A, "Recommended Decisions" #2).
  await mountPdfPreview(buildPlanSimplifiedModel, window.D, baseIssues, undefined, { annotate: true });
}

export async function doSavePdf(){
  const errors=prepareFilingOutput(window.D,()=>[...validatePlanSimplified(), ...getSupplementalFilingIssues(window.D)]).messages;
  if(errors.length){renderPage('/print');alert(`Cannot export — ${errors.length} required field${errors.length===1?'':'s'} missing. See the list on this page.`);return;}
  const ward=(window.D.wardName||'SimplifiedAnnualPlan').replace(/[^a-z0-9]/gi,'_');
  try{
    const model = buildPlanSimplifiedModel(window.D);
    const doc = await generateCourtFormPdf(model);
    saveFinalizedPdf(await finalizeCourtFormPdf(doc), `${ward}_SimplifiedAnnualPlan.pdf`);
  }catch(e){
    console.error('PDF export failed',e);
    alert('PDF export failed: '+e.message);
  }
}

export async function doSaveDocx(){
  const errors=prepareFilingOutput(window.D,()=>[...validatePlanSimplified(), ...getSupplementalFilingIssues(window.D)]).messages;
  if(errors.length){renderPage('/print');alert(`Cannot export — ${errors.length} required field${errors.length===1?'':'s'} missing. See the list on this page.`);return;}
  const stat=document.getElementById('export-status');
  if(stat)stat.textContent='Generating Word document…';
  const ward=(window.D.wardName||'SimplifiedAnnualPlan').replace(/[^a-z0-9]/gi,'_');
  try{
    const model = buildPlanSimplifiedModel(window.D);
    const docxBlob = await generateCourtFormDocx(model);
    saveFinalizedDocx(docxBlob, `${ward}_SimplifiedAnnualPlan.docx`);
  }catch(e){
    console.error('Word export failed',e);
    alert('Word export failed: '+e.message);
  }finally{
    if(stat)stat.textContent='';
  }
}
