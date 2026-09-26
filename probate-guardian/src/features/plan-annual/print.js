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
import { mountPdfPreview, printGeneratedPdf } from '../../core/pdf/pdf-preview.js';
import { getSupplementalAccessibilityWarning, getSupplementalFilingIssues } from '../../core/pdf/supplemental-pdf.js';
import { prepareFilingOutput } from '../../core/filing/output-preflight.js';
import { authorizeFilingOutput } from '../../core/filing/output-authorization.js';
import { renderOutputAdvisories } from '../../core/filing/output-advisories.js';
import { renderReadinessCard } from '../../core/filing/readiness-card.js';
import { alertModal } from '../../core/ui/dialogs.js';
import { beginExport } from '../../core/ui/export-guard.js';
import { getD } from '../../core/state.js';

const {
  highlightErrors, validationPanel,
  renderPage,
} = window;

// Milestone 44C: this Plan's readiness predicates live in
// src/core/filing/readiness-config.js (getFilingReadiness('planAnnual')),
// rendered by the shared readiness card below.
export function pagePrintPlanAnnual(){
  window.queueAllScheduleDocValidations?.();
  const baseIssues=()=>[...validatePlanAnnual(), ...getSupplementalFilingIssues(getD())];
  const preflight=prepareFilingOutput(getD(),baseIssues);
  const errors=preflight.messages;
  // Milestone 38D/44B: Save as PDF's disabled state reflects only what
  // actually blocks the pdf capability, via authorizeFilingOutput() -- the
  // banner/panel below stays driven by the full, capability-agnostic
  // preflight so every outstanding requirement is still visible.
  const pdfBlocked=authorizeFilingOutput(getD(),baseIssues,{capability:'pdf'}).status!=='allowed';
  const supplementalWarning=getSupplementalAccessibilityWarning(getD());
  highlightErrors(errors);
  return `<div>
    <h1 class="visually-hidden">Print Preview</h1>
    <div class="print-preview-banner no-print">
      <div><strong>Preview &amp; Export</strong> ${errors.length?`<span style="color:var(--danger-text)"> — ${errors.length} issue(s)</span>`:' — Ready to export'}</div>
      <div class="d-flex gap-2 flex-wrap">
        <span id="export-status" style="font-size:.8rem;color:var(--ink-3);"></span>
        <button class="btn btn-primary btn-sm" data-form-action="save-pdf-plan-annual" ${pdfBlocked?'disabled':''}>Save as PDF</button>
        <button class="btn btn-outline-secondary btn-sm" data-form-action="print">Print</button>
        <button class="btn btn-outline-secondary btn-sm" data-form-action="open-court-portal" title="Opens the Florida Courts E-Filing Portal in a new tab"><svg class="ic" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M14.2 4.4h5.4v5.4"/><path d="m19.6 4.4-8 8"/><path d="M17.4 13.6v6H4.6V6.8h6"/></svg> Florida E-Filing Portal</button><span data-preview-shell-actions></span>
      </div>
    </div>
    ${errors.length?validationPanel(errors):''}
    ${renderOutputAdvisories(preflight.advisories)}
    ${supplementalWarning?`<div class="alert alert-warning no-print" role="status">${supplementalWarning}</div>`:''}
    ${renderReadinessCard({ filingType: preflight.descriptor?.inventoryType, data: getD(), validationIssues: preflight.structuredIssues })}
    <div id="print-doc-container"></div>
  </div>`;
}

export async function mountPreview(){
  const baseIssues = () => [...validatePlanAnnual(), ...getSupplementalFilingIssues(getD())];
  window.printCurrentFilingPdf = () => printGeneratedPdf(buildPlanAnnualModel, getD(), baseIssues);
  await mountPdfPreview(buildPlanAnnualModel, getD(), baseIssues, undefined, { annotate: true });
}

export async function doSavePdf(){
  const baseIssues = () => [...validatePlanAnnual(), ...getSupplementalFilingIssues(getD())];
  const authorization = authorizeFilingOutput(getD(), baseIssues, { capability: 'pdf' });
  if (authorization.status !== 'allowed') {
    renderPage('/print');
    await alertModal(`Cannot export — ${authorization.issues.length} required field${authorization.issues.length === 1 ? '' : 's'} missing. See the list on this page.`);
    return;
  }
  // Milestone 67: disables the button for the export's duration, so a second
  // click while it's still generating can't fire a second download and get
  // both blocked by the browser as "multiple files."
  const btn = beginExport('[data-form-action="save-pdf-plan-annual"]');
  if (!btn) return;
  const ward=(getD().wardName||'AnnualGuardianshipPlan').replace(/[^a-z0-9]/gi,'_');
  try{
    const model = buildPlanAnnualModel(getD());
    const doc = await generateCourtFormPdf(model);
    await saveFinalizedPdf(await finalizeCourtFormPdf(doc), `${ward}_AnnualGuardianshipPlan.pdf`);
  }catch(e){
    console.error('PDF export failed',e);
    await alertModal('PDF export failed: '+e.message);
  }finally{
    btn.disabled = false;
  }
}

