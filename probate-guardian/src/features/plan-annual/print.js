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
import { mountPdfPreview, printGeneratedPdf } from '../../core/pdf/pdf-preview.js';

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
    <div id="print-doc-container"></div>
  </div>`;
}

export async function mountPreview(){
  window.printCurrentFilingPdf = () => printGeneratedPdf(buildPlanAnnualModel, window.D);
  await mountPdfPreview(buildPlanAnnualModel, window.D);
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
