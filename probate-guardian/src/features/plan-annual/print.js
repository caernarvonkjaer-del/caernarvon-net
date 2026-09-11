// Print/PDF export for the Annual Guardianship Plan (Milestone 4, Phase B).
// Dynamically imported from ./index.js only when the user reaches /print or
// triggers PDF export -- same lazy boundary as the other two extracted
// features.
//
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
  PLAN_RIGHTS, PLAN_ADLS,
} = window;

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
  // Milestone 37-3: stable `id` on every item (never rendered --
  // planReadinessPanel() only reads .label/.ok), same pattern as Plan
  // Simplified's pilot. cover.county and cover.guardianName are new: neither
  // had a readiness item before this milestone despite being required by
  // validatePlanAnnual() below. cover.wardResidence's predicate was
  // incomplete (missing residenceCityStateZip) -- extended in place, since
  // it is the validator's own combined Cover-residence check. See
  // tests/unit/plan-annual-parity.spec.js.
  const auto=[
    {id:'cover.period',label:'Reporting period is stated',ok:has(d.periodFrom)&&has(d.periodTo)},
    {id:'cover.wardCaseGid',label:'Ward name, case number and inception date are on the plan',ok:has(d.wardName)&&has(d.caseNumber)&&has(d.gid)},
    {id:'cover.county',label:'County is on the plan',ok:has(d.county)},
    {id:'cover.guardianName',label:'Guardian Name(s) is on the plan',ok:has(d.guardian)},
    {id:'signatures.guardian1.core',label:'Signed and dated by a guardian',ok:has(g0.name)&&has(g0.signatureDate)},
    {id:'signatures.guardian1.contact',label:'Guardian address, phone and SSN/EIN provided',ok:has(g0.mailingStreet)&&has(g0.phone)&&has(g0.ssn)},
    {id:'cover.wardResidence',label:"Ward's current residence and living arrangement, including city/state/ZIP, stated",ok:has(d.wardLiving)&&has(d.residenceAddress)&&has(d.residenceCityStateZip)},
    {id:'plan.q1residences',label:`Residences for the year listed (${res.length})`,ok:res.length>0},
    {id:'plan.q2',label:'Question 2 — address change addressed',ok:!!(d.q2NoMove||d.q2WithinCounty||d.q2WithinCircuit||d.q2OutsideApproved||d.q2OutsideVenuePetition)},
    {id:'plan.q3',label:'Question 3 — residential setting and care provisions selected',ok:!!(d.q3SettingALF||d.q3SettingGroupHome||d.q3SettingIntermediate||d.q3SettingPrivate||d.q3SettingSkilled||d.q3SettingSpecialized||d.q3SettingStateHospital||d.q3SettingOther)},
    {id:'plan.q4providers',label:`Question 4 — professional medical treatment listed (${provs.length})`,ok:provs.length>0},
    {id:'plan.q5',label:'Question 5 — social skills and capacity-building activities described',ok:has(d.q5SocialSkills)&&has(d.q5Activities)},
    {id:'plan.q6rights',label:'Question 6 — all twelve rights assessed',ok:PLAN_RIGHTS.every(([k])=>has(rights[k]))},
    {id:'plan.q8adls',label:'Question 8 — all sixteen activities of daily living rated',ok:PLAN_ADLS.every(([k])=>has(adls[k]))},
    {id:'plan.q9',label:'Question 9 — mental and physical disabilities answered',ok:!!((d.q9MentalNone||d.q9MentalDementia||d.q9MentalAlzheimers||d.q9MentalAutism||d.q9MentalHeadInjury||d.q9MentalDevelopmental||d.q9MentalIntellectual||d.q9MentalSchizophrenia||d.q9MentalDepression||d.q9MentalSubstance||d.q9MentalOther)&&(d.q9PhysNone||d.q9PhysMobility||d.q9PhysBlindness||d.q9PhysDeafness||d.q9PhysDiabetic||d.q9PhysParkinsons||d.q9PhysArthritis||d.q9PhysOther))},
    {id:'plan.q10directives',label:'Question 10 — advance directives answered',ok:!!d.q10NoDirectives!==!!d.q10Executed},
    {id:'plan.q11remuneration',label:'Question 11 — remuneration declared',ok:d.q11NoRemuneration?has(d.q11NoRemunerationName):!!(d.q11ReceivedName||d.q11Amount||d.q11From)},
  ];
  const manual=[
    // Milestone 34-1A, Item 1: this depends on an external, unverifiable-
    // by-software fact (whether the physician's statement is actually
    // attached), same reasoning Plan Minor already applies to its own
    // physician's-statement reminder -- moved out of `auto` so the
    // readiness panel can't imply this is a machine-checked, export-
    // blocking requirement when it never has been.
    "Confirm the physician's statement of an examination within 90 days before the plan period is attached, and check the certification box for it.",
    "File the physician's report separately, at the same time as this plan. The app does not produce it.",
    'File within 90 days after the last day of the anniversary month the Letters were signed (F.S. 744.367).',
    hasSixthCircuitLocalGuidance(d.county)
      ? 'Local Sixth Judicial Circuit requirement: serve a copy on all interested persons and file the certificate of service.'
      : 'Serve a copy on all interested persons.',
    'If you marked any right as capable of restoration, file the separate petition to restore it — this plan does not restore rights.',
    "If the ward relocated: file a Notice of Change of Residence within 15 days for moves to an adjacent county (F.S. 744.1098(2)), and obtain a prior court order for moves to non-adjacent counties or out of state (F.S. 744.1098(1)).",
    'Attach copies of any advance directives listed in Question 10 unless already filed with the court -- advance directives need only be filed once.',
    'If ward is an APD client with a Developmental Services Habilitation Plan (DSHP / Chapter 393), attach the current support plan (F.S. 393.0651).',
    "The $27.50 background investigation fee must be paid by the guardian individually and cannot be paid from the ward's assets.",
    'If you are a professional guardian, confirm your OPPG registration is current.',
    'Confirm the guardian address on file with the Clerk matches the address on this plan.',
  ];
  return {auto,manual};
}

export function pagePrintPlanAnnual(){
  window.queueAllScheduleDocValidations?.();
  const preflight=prepareFilingOutput(window.D,()=>[...validatePlanAnnual(), ...getSupplementalFilingIssues(window.D)]);
  const errors=preflight.messages;
  const supplementalWarning=getSupplementalAccessibilityWarning(window.D);
  highlightErrors(errors);
  return `<div>
    <h1 class="visually-hidden">Print Preview</h1>
    <div class="print-preview-banner no-print">
      <div><strong>Preview &amp; Export</strong> ${errors.length?`<span style="color:var(--danger-text)"> — ${errors.length} issue(s)</span>`:' — Ready to export'}</div>
      <div class="d-flex gap-2 flex-wrap">
        <span id="export-status" style="font-size:.8rem;color:var(--ink-3);"></span>
        <button class="btn btn-outline-primary btn-sm" data-form-action="save-word-plan-annual" ${errors.length?'disabled':''} title="Save editable Word copy (.docx)"><svg class="ic" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M6.4 3.4h7l4.2 4.2v13H6.4Z"/><path d="M13.2 3.4v4.4h4.4"/><path d="M8.8 11.5h6.4M8.8 14.5h6.4M8.8 17.5h4"/></svg> Save as Word</button>
        <button class="btn btn-primary btn-sm" data-form-action="save-pdf-plan-annual" ${errors.length?'disabled':''}>Save as PDF</button>
        <button class="btn btn-outline-secondary btn-sm" data-form-action="print">Print</button>
        <button class="btn btn-outline-secondary btn-sm" data-form-action="open-court-portal" title="Opens the Florida Courts E-Filing Portal in a new tab"><svg class="ic" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M14.2 4.4h5.4v5.4"/><path d="m19.6 4.4-8 8"/><path d="M17.4 13.6v6H4.6V6.8h6"/></svg> Florida E-Filing Portal</button>
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
  const baseIssues = () => [...validatePlanAnnual(), ...getSupplementalFilingIssues(window.D)];
  window.printCurrentFilingPdf = () => printGeneratedPdf(buildPlanAnnualModel, window.D, baseIssues);
  await mountPdfPreview(buildPlanAnnualModel, window.D, baseIssues);
}

export async function doSavePdf(){
  const errors=prepareFilingOutput(window.D,()=>[...validatePlanAnnual(), ...getSupplementalFilingIssues(window.D)]).messages;
  if(errors.length){renderPage('/print');alert(`Cannot export — ${errors.length} required field${errors.length===1?'':'s'} missing. See the list on this page.`);return;}
  const ward=(window.D.wardName||'AnnualGuardianshipPlan').replace(/[^a-z0-9]/gi,'_');
  try{
    const model = buildPlanAnnualModel(window.D);
    const doc = await generateCourtFormPdf(model);
    saveFinalizedPdf(await finalizeCourtFormPdf(doc), `${ward}_AnnualGuardianshipPlan.pdf`);
  }catch(e){
    console.error('PDF export failed',e);
    alert('PDF export failed: '+e.message);
  }
}

export async function doSaveDocx(){
  const errors=prepareFilingOutput(window.D,()=>[...validatePlanAnnual(), ...getSupplementalFilingIssues(window.D)]).messages;
  if(errors.length){renderPage('/print');alert(`Cannot export — ${errors.length} required field${errors.length===1?'':'s'} missing. See the list on this page.`);return;}
  const stat=document.getElementById('export-status');
  if(stat)stat.textContent='Generating Word document…';
  const ward=(window.D.wardName||'AnnualGuardianshipPlan').replace(/[^a-z0-9]/gi,'_');
  try{
    const model = buildPlanAnnualModel(window.D);
    const docxBlob = await generateCourtFormDocx(model);
    saveFinalizedDocx(docxBlob, `${ward}_AnnualGuardianshipPlan.docx`);
  }catch(e){
    console.error('Word export failed',e);
    alert('Word export failed: '+e.message);
  }finally{
    if(stat)stat.textContent='';
  }
}
