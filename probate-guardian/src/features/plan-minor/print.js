// Print/PDF export for Annual Plan — Minors (Milestone 6, Phase B).
// Dynamically imported from ./index.js only when the user reaches /print or
// triggers PDF export -- same lazy boundary as the other three extracted
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
import { finalizeCourtFormPdf, saveFinalizedPdf } from '../../core/pdf/pdf-finalizer.js';
import { generateCourtFormDocx, saveFinalizedDocx } from '../../core/docx/docx-engine.js';
import { mountPdfPreview, printGeneratedPdf } from '../../core/pdf/pdf-preview.js';
import { getSupplementalAccessibilityWarning, getSupplementalFilingIssues } from '../../core/pdf/supplemental-pdf.js';
import { prepareFilingOutput } from '../../core/filing/output-preflight.js';
import { renderOutputAdvisories } from '../../core/filing/output-advisories.js';

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
    {label:'Case number (UCN or Case #) is on the plan',ok:has(d.ucn)||has(d.ref)},
    {label:'Current residence and address stated',ok:has(d.q1ResidenceName)&&has(d.q1Street)},
    {label:'Signed and dated by a guardian',ok:has(g0.name)&&has(g0.signatureDate)},
    {label:'Guardian address, phone and taxpayer ID provided',ok:has(g0.mailingStreet)&&has(g0.phone)&&has(g0.tin)},
    {label:'Question 4 — provision of medical services selected',ok:!!(d.q4Primary||d.q4Dentist||d.q4Specialist||d.q4PT||d.q4ST||d.q4OT||d.q4MinorDecides||d.q4Other)},
    {label:"Question 5 — school progress, social development, communication, and interpersonal statements completed",ok:has(d.q5SchoolProgress)&&has(d.q5SocialDevelopment)&&has(d.q5Communicates)&&has(d.q5Interpersonal)},
    {label:'Question 5E — unmet social needs answered',ok:!!(d.q5NoUnmetNeeds||d.q5DoesNotCareToSocialize||d.q5UnmetNeeds||d.q5Other)},
    {label:'Preparer certification completed (if a preparer is named)',ok:!(d.preparer_name||d.preparer_signatureDate)||(has(d.preparer_name)&&has(d.preparer_signatureDate))},
    {label:'Attorney certification signed and dated (if represented)',ok:!(d.attorney_name||d.attorney_signatureDate)||(has(d.attorney_name)&&has(d.attorney_signatureDate))},
    {label:`Treatment providers listed (${provs.length})`,ok:provs.length>0},
  ];
  const manual=[
    "File within 90 days after the last day of the anniversary month the Letters were signed (F.S. 744.367).",
    "Attach the physician's statement of an examination of the ward no more than 180 days before the beginning of the plan period (F.S. 744.3675), if the certification box for it is checked.",
    'Serve a copy on all interested persons and file the certificate of service, unless the ward was declared totally incapacitated or is a minor (see the certification checkboxes).',
    "If the minor reaches 18 years of age (sui juris) during the reporting period, prepare for final discharge under F.S. 744.527.",
    "If the ward relocated: file a Notice of Change of Residence within 15 days for moves to an adjacent county (F.S. 744.1098(2)), obtain a prior court order for moves to non-adjacent counties or out of state (F.S. 744.1098(1)), and file an updated Disaster Plan (Administrative Order 2024-025).",
    "The $27.50 background investigation fee must be paid by the guardian individually and cannot be paid from the minor's assets.",
    'Confirm the guardian address on file with the Clerk matches the address on this plan.',
    'If you are a professional or public guardian, confirm the corresponding registration is current.',
    'This general checklist is not derived from an official Clerk\'s Review form for this document — confirm current local filing requirements before submitting.',
  ];
  return {auto,manual};
}

export function pagePrintPlanMinor(){
  window.queueAllScheduleDocValidations?.();
  const preflight=prepareFilingOutput(window.D,()=>[...validatePlanMinor(), ...getSupplementalFilingIssues(window.D)]);
  const errors=preflight.messages;
  const supplementalWarning=getSupplementalAccessibilityWarning(window.D);
  highlightErrors(errors);
  return `<div>
    <h1 class="visually-hidden">Print Preview</h1>
    <div class="print-preview-banner no-print">
      <div><strong>Preview &amp; Export</strong> ${errors.length?`<span style="color:var(--danger-text)"> — ${errors.length} issue(s)</span>`:' — Ready to export'}</div>
      <div class="d-flex gap-2 flex-wrap">
        <span id="export-status" style="font-size:.8rem;color:var(--ink-3);"></span>
        <button class="btn btn-outline-primary btn-sm" data-form-action="save-word-plan-minor" ${errors.length?'disabled':''} title="Save editable Word copy (.docx)"><svg class="ic" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M6.4 3.4h7l4.2 4.2v13H6.4Z"/><path d="M13.2 3.4v4.4h4.4"/><path d="M8.8 11.5h6.4M8.8 14.5h6.4M8.8 17.5h4"/></svg> Save as Word</button>
        <button class="btn btn-primary btn-sm" data-form-action="save-pdf-plan-minor" ${errors.length?'disabled':''}>Save as PDF</button>
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
  const baseIssues = () => [...validatePlanMinor(), ...getSupplementalFilingIssues(window.D)];
  window.printCurrentFilingPdf = () => printGeneratedPdf(buildPlanMinorModel, window.D, baseIssues);
  await mountPdfPreview(buildPlanMinorModel, window.D, baseIssues);
}

export async function doSavePdf(){
  const errors=prepareFilingOutput(window.D,()=>[...validatePlanMinor(), ...getSupplementalFilingIssues(window.D)]).messages;
  if(errors.length){renderPage('/print');alert(`Cannot export — ${errors.length} required field${errors.length===1?'':'s'} missing. See the list on this page.`);return;}
  const ward=(window.D.wardName||'AnnualPlanMinors').replace(/[^a-z0-9]/gi,'_');
  try{
    const model = buildPlanMinorModel(window.D);
    const doc = await generateCourtFormPdf(model);
    saveFinalizedPdf(await finalizeCourtFormPdf(doc), `${ward}_AnnualPlanMinors.pdf`);
  }catch(e){
    console.error('PDF export failed',e);
    alert('PDF export failed: '+e.message);
  }
}

export async function doSaveDocx(){
  const errors=prepareFilingOutput(window.D,()=>[...validatePlanMinor(), ...getSupplementalFilingIssues(window.D)]).messages;
  if(errors.length){renderPage('/print');alert(`Cannot export — ${errors.length} required field${errors.length===1?'':'s'} missing. See the list on this page.`);return;}
  const stat=document.getElementById('export-status');
  if(stat)stat.textContent='Generating Word document…';
  const ward=(window.D.wardName||'AnnualPlanMinors').replace(/[^a-z0-9]/gi,'_');
  try{
    const model = buildPlanMinorModel(window.D);
    const docxBlob = await generateCourtFormDocx(model);
    saveFinalizedDocx(docxBlob, `${ward}_AnnualPlanMinors.docx`);
  }catch(e){
    console.error('Word export failed',e);
    alert('Word export failed: '+e.message);
  }finally{
    if(stat)stat.textContent='';
  }
}
