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
import { mountPdfPreview, printGeneratedPdf } from '../../core/pdf/pdf-preview.js';

const {
  highlightErrors, validationPanel, planReadinessPanel,
  renderPage,
} = window;

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
    <div id="print-doc-container"></div>
  </div>`;
}

export async function mountPreview(){
  window.printCurrentFilingPdf = () => printGeneratedPdf(buildPlanMinorModel, window.D);
  await mountPdfPreview(buildPlanMinorModel, window.D);
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
