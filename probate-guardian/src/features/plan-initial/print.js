// Print/PDF export for the Initial Guardianship Plan (Milestone 5, Phase B).
// Dynamically imported from ./index.js only when the user reaches /print or
// triggers PDF export -- same lazy boundary as the other two extracted Plan
// features.
//
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
import { finalizeCourtFormPdf, saveFinalizedPdf } from '../../core/pdf/pdf-finalizer.js';
import { generateCourtFormDocx, saveFinalizedDocx } from '../../core/docx/docx-engine.js';
import { mountPdfPreview, printGeneratedPdf } from '../../core/pdf/pdf-preview.js';
import { getSupplementalAccessibilityWarning, getSupplementalFilingIssues } from '../../core/pdf/supplemental-pdf.js';
import { prepareFilingOutput } from '../../core/filing/output-preflight.js';
import { renderOutputAdvisories } from '../../core/filing/output-advisories.js';
import { hasSixthCircuitLocalGuidance } from '../../core/filing/county-guidance.js';
import { checkSignatureState, inferLegacySignatureState } from '../../core/validation/signature-state.js';

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
  // Milestone 37-3: stable `id` on every item (never rendered --
  // planReadinessPanel() only reads .label/.ok), same as Plan Simplified's
  // pilot (tests/unit/plan-simplified-parity.spec.js). cover.guardianNames,
  // plan.q6q7, plan.q11needs, and signatures.certifications are new: none
  // had any readiness item before this milestone despite being required by
  // validatePlanInitial() below. cover.wardResidence and plan.q10bcd are
  // existing items whose predicate was incomplete (missing
  // residenceCityStateZip and the "assistive devices currently used"
  // question respectively) -- extended in place rather than split, since
  // each is already the validator's own combined section (residence; "10B-D.
  // Disabilities & Devices"). See tests/unit/plan-initial-parity.spec.js.
  const auto=[
    {id:'cover.wardCaseCounty',label:'Ward name, case number and county are on the plan',ok:has(d.wardName)&&has(d.caseNumber)&&has(d.county)},
    {id:'cover.dates',label:'Guardianship Inception Date and date Letters were signed are stated',ok:has(d.inceptionDate)&&has(d.lettersSignedDate)},
    {id:'cover.guardianNames',label:"Guardian name(s) are on the plan",ok:has(d.guardianNames)},
    // Milestone 39-C: reuses checkSignatureState() directly (not a
    // hand-derived boolean) so these readiness items can never drift from
    // what validatePlanInitial() actually blocks on -- AGENTS.md Section 4's
    // Parity Invariant, same as Plan Simplified's 39-B pilot.
    {id:'signatures.guardian1.core',label:'Signed and dated by a guardian',ok:has(g0.name)&&checkSignatureState({
      state: inferLegacySignatureState(g0.signatureState, g0.signatureDate),
      date: g0.signatureDate,
      image: g0.signatureImage,
      sectionLabel: 'Signatures', roleLabel: 'Guardian',
    }).length===0},
    {id:'signatures.guardian1.contact',label:'Guardian address, phone and SSN/EIN provided',ok:has(g0.street)&&has(g0.phone)&&has(g0.ssn)},
    {id:'cover.wardResidence',label:"Ward's current living arrangement and address, including city/state/ZIP, are stated",ok:has(d.wardLiving)&&has(d.residenceAddress)&&has(d.residenceCityStateZip)},
    {id:'plan.q2',label:'Question 2 — best-suited residential setting selected',ok:has(d.q2Setting)},
    {id:'plan.q3',label:'Question 3 — medical service provisions selected',ok:!!(d.q3MedPrimary||d.q3MedDentist||d.q3MedOphthalmologist||d.q3MedSpecialist||d.q3MedPT||d.q3MedST||d.q3MedOT||d.q3MedWardDecides||d.q3MedOther)},
    {id:'plan.q4',label:'Question 4 — mental health service provision selected',ok:has(d.q4Mental)},
    {id:'plan.q5',label:'Question 5 — personal care provision selected',ok:has(d.q5Personal)},
    {id:'plan.q6q7',label:'Question 6 — socialization/recreation option selected',ok:!!(d.q6CareFacility||d.q6NursesAides||d.q6FamilyFriends||d.q6DayProgram||d.q6WardDecides||d.q6Other)},
    {id:'plan.q9providers',label:`Question 9 — examining providers listed (${provs.length})`,ok:provs.length>0},
    {id:'plan.q10a.adls',label:`Question 10A — all fifteen activities of daily living rated`,ok:INITIAL_ADLS.every(([k])=>has(adls[k]))},
    {id:'plan.q10bcd',label:'Question 10B–D — mental disabilities, physical disabilities, and assistive devices currently used are answered',ok:!!((d.mentalAlzheimers||d.mentalAutism||d.mentalClosedHeadInjury||d.mentalDementia||d.mentalDepression||d.mentalDevelopmental||d.mentalSubstance||d.mentalSchizophrenia||d.mentalOther)&&(d.physMobility||d.physBlindness||d.physDeafness||d.physDiabetic||d.physParkinsons||d.physArthritis||d.physOther)&&(d.usesDentures||d.usesHearingAid||d.usesWheelchair||d.usesWalker||d.usesCrutches||d.usesProsthetics||d.usesGlasses||d.usesNone||d.usesOther))},
    {id:'plan.q11needs',label:'Question 11 — assistive devices needed selected',ok:!!(d.needsDentures||d.needsHearingAid||d.needsWheelchair||d.needsWalker||d.needsCrutches||d.needsProsthetics||d.needsGlasses||d.needsNone||d.needsOther)},
    {id:'plan.q11directives',label:'Question 11 — advance directives answered (none, or executed directives listed)',ok:!!d.q11NoDirectives!==!!d.q11Executed},
    {id:'plan.q10f.committee',label:'Question 10F — examining committee recommendation question answered',ok:has(d.committeeIncorporated)},
    {id:'signatures.certifications',label:'At least one certification statement is checked',ok:!!(d.certIncapacitatedNoCopy||d.certMinorNoCopy||d.certConsulted||d.certRecognizeRights||d.certNoRestriction||d.certProvidesCare)},
    {id:'signatures.attorney',label:'Attorney certification signed and dated (if represented)',ok:!(d.attorney_name||d.attorney_bar||d.attorney_signatureDate||(d.attorney_signatureState&&d.attorney_signatureState!=='none'))||(has(d.attorney_name)&&checkSignatureState({
      state: inferLegacySignatureState(d.attorney_signatureState, d.attorney_signatureDate),
      date: d.attorney_signatureDate,
      image: d.attorney_signatureImage,
      sectionLabel: 'Attorney Certification', roleLabel: 'Attorney',
    }).length===0)},
  ];
  const manual=[
    'File within 60 days after the Letters of Guardianship are signed (F.S. 744.362(1)).',
    "If the ward relocated: file a Notice of Change of Residence within 15 days for moves to an adjacent county (F.S. 744.1098(2)), and obtain a prior court order for moves to non-adjacent counties or out of state (F.S. 744.1098(1)).",
    hasSixthCircuitLocalGuidance(d.county)
      ? 'Local Sixth Judicial Circuit requirement: serve a copy on all interested persons and file the certificate of service, unless the ward was declared totally incapacitated or is a minor under 14 (see the certification checkboxes).'
      : 'Serve a copy on all interested persons, unless the ward was declared totally incapacitated or is a minor under 14 (see the certification checkboxes).',
    'Attach a copy of any pre-existing advance directive described in the Question 1 narrative unless already filed with the court -- advance directives need only be filed once.',
    'Non-professional guardians must complete the 8-hour education course and file proof within 4 months after appointment (F.S. 744.3145(2), (4)).',
    "The $27.50 background investigation fee must be paid by the guardian individually and cannot be paid from the ward's assets.",
    'Confirm the guardian address on file with the Clerk matches the address on this plan.',
    'If you are a professional guardian, confirm your OPPG registration is current.',
    'Only reports with original signatures will be audited by the Clerk of Court.',
  ];
  return {auto,manual};
}

export function pagePrintPlanInitial(){
  window.queueAllScheduleDocValidations?.();
  const preflight=prepareFilingOutput(window.D,()=>[...validatePlanInitial(), ...getSupplementalFilingIssues(window.D)]);
  const errors=preflight.messages;
  const supplementalWarning=getSupplementalAccessibilityWarning(window.D);
  highlightErrors(errors);
  return `<div>
    <h1 class="visually-hidden">Print Preview</h1>
    <div class="print-preview-banner no-print">
      <div><strong>Preview &amp; Export</strong> ${errors.length?`<span style="color:var(--danger-text)"> — ${errors.length} issue(s)</span>`:' — Ready to export'}</div>
      <div class="d-flex gap-2 flex-wrap">
        <span id="export-status" style="font-size:.8rem;color:var(--ink-3);"></span>
        <button class="btn btn-outline-primary btn-sm" data-form-action="save-word-plan-initial" ${errors.length?'disabled':''} title="Save editable Word copy (.docx)"><svg class="ic" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M6.4 3.4h7l4.2 4.2v13H6.4Z"/><path d="M13.2 3.4v4.4h4.4"/><path d="M8.8 11.5h6.4M8.8 14.5h6.4M8.8 17.5h4"/></svg> Save as Word</button>
        <button class="btn btn-primary btn-sm" data-form-action="save-pdf-plan-initial" ${errors.length?'disabled':''}>Save as PDF</button>
        <button class="btn btn-outline-secondary btn-sm" data-form-action="print">Print</button>
        <button class="btn btn-outline-secondary btn-sm" data-form-action="open-court-portal" title="Opens the Florida Courts E-Filing Portal in a new tab"><svg class="ic" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M14.2 4.4h5.4v5.4"/><path d="m19.6 4.4-8 8"/><path d="M17.4 13.6v6H4.6V6.8h6"/></svg> Florida E-Filing Portal</button><span data-preview-shell-actions></span>
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
  const baseIssues = () => [...validatePlanInitial(), ...getSupplementalFilingIssues(window.D)];
  window.printCurrentFilingPdf = () => printGeneratedPdf(buildPlanInitialModel, window.D, baseIssues);
  await mountPdfPreview(buildPlanInitialModel, window.D, baseIssues);
}

export async function doSavePdf(){
  const errors=prepareFilingOutput(window.D,()=>[...validatePlanInitial(), ...getSupplementalFilingIssues(window.D)]).messages;
  if(errors.length){renderPage('/print');alert(`Cannot export — ${errors.length} required field${errors.length===1?'':'s'} missing. See the list on this page.`);return;}
  const ward=(window.D.wardName||'InitialGuardianshipPlan').replace(/[^a-z0-9]/gi,'_');
  try{
    const model = buildPlanInitialModel(window.D);
    const doc = await generateCourtFormPdf(model);
    saveFinalizedPdf(await finalizeCourtFormPdf(doc), `${ward}_InitialGuardianshipPlan.pdf`);
  }catch(e){
    console.error('PDF export failed',e);
    alert('PDF export failed: '+e.message);
  }
}

export async function doSaveDocx(){
  const errors=prepareFilingOutput(window.D,()=>[...validatePlanInitial(), ...getSupplementalFilingIssues(window.D)]).messages;
  if(errors.length){renderPage('/print');alert(`Cannot export — ${errors.length} required field${errors.length===1?'':'s'} missing. See the list on this page.`);return;}
  const stat=document.getElementById('export-status');
  if(stat)stat.textContent='Generating Word document…';
  const ward=(window.D.wardName||'InitialGuardianshipPlan').replace(/[^a-z0-9]/gi,'_');
  try{
    const model = buildPlanInitialModel(window.D);
    const docxBlob = await generateCourtFormDocx(model);
    saveFinalizedDocx(docxBlob, `${ward}_InitialGuardianshipPlan.docx`);
  }catch(e){
    console.error('Word export failed',e);
    alert('Word export failed: '+e.message);
  }finally{
    if(stat)stat.textContent='';
  }
}
