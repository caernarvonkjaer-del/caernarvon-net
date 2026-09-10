// Print/PDF export for Annual Accounting (Milestone 7, Phase B). Dynamically
// imported from ./index.js, together with excel.js, at first mount -- see
// that file's ensureLazyModules() comment for why (the Cover-equivalent
// page's Excel-import control must work immediately). Also covers the
// finalAccounting/trustAccounting aliases (formEngine() routing, no
// separate code path here).
//
// Statically imports validateAnnual back from ./index.js -- safe despite
// index.js dynamically importing this file, since neither side touches the
// other's export during top-level module evaluation, only inside function
// bodies called later (see src/features/simplified-accounting/index.js's
// comment on the same pattern).
import { validateAnnual } from './index.js';
import { buildAnnualAccountingModel } from './pdf-model.js';
import { generateCourtFormPdf } from '../../core/pdf/pdf-engine.js';
import { finalizeCourtFormPdf, saveFinalizedPdf } from '../../core/pdf/pdf-finalizer.js';
import { generateCourtFormDocx, saveFinalizedDocx } from '../../core/docx/docx-engine.js';
import { mountPdfPreview, printGeneratedPdf } from '../../core/pdf/pdf-preview.js';
import { getSupplementalAccessibilityWarning, getSupplementalFilingIssues } from '../../core/pdf/supplemental-pdf.js';
import { prepareFilingOutput } from '../../core/filing/output-preflight.js';
import { renderOutputAdvisories } from '../../core/filing/output-advisories.js';

function buildModelForPreview(D){
  return buildAnnualAccountingModel(D, { printDate: new Date().toISOString().slice(0, 10) });
}

const {
  formDisplayName,
  excelCapacityPanel, highlightErrors, validationPanel,
  renderPage,
} = window;

export function pagePrintAnnual(capOver){
  window.queueAllScheduleDocValidations?.();
  const preflight=prepareFilingOutput(window.D,()=>[...validateAnnual(), ...getSupplementalFilingIssues(window.D)]);
  const errors=preflight.messages;
  const supplementalWarning=getSupplementalAccessibilityWarning(window.D);
  highlightErrors(errors);
  return `<div>
    <h1 class="visually-hidden">Print Preview</h1>
    <div class="print-preview-banner no-print">
      <div><strong>Preview &amp; Export</strong> ${errors.length?`<span style="color:var(--danger-text)"> — ${errors.length} issue(s)</span>`:capOver.length?`<span style="color:var(--danger-text)"> — too many entries for Excel; use PDF</span>`:' — Ready to export'}</div>
      <div class="d-flex gap-2 flex-wrap">
        <span id="export-status" style="font-size:.8rem;color:var(--ink-3);"></span>
        <button class="btn btn-outline-primary btn-sm" data-annual-action="save-word" ${errors.length?'disabled':''} title="Save editable Word copy (.docx)"><svg class="ic" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M6.4 3.4h7l4.2 4.2v13H6.4Z"/><path d="M13.2 3.4v4.4h4.4"/><path d="M8.8 11.5h6.4M8.8 14.5h6.4M8.8 17.5h4"/></svg> Save as Word</button>
        <button class="btn btn-outline-primary btn-sm" data-annual-action="save-pdf" ${errors.length?'disabled':''}>Save as PDF</button>
        <button class="btn btn-primary btn-sm" data-annual-action="save-excel" ${errors.length||capOver.length?'disabled':''} ${capOver.length?'title="Some schedules have more entries than the Excel template can hold — save as PDF instead"':''}>Save as Excel</button>
        <button class="btn btn-outline-secondary btn-sm" data-form-action="open-court-portal" title="Opens the Florida Courts E-Filing Portal in a new tab"><svg class="ic" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M14.2 4.4h5.4v5.4"/><path d="m19.6 4.4-8 8"/><path d="M17.4 13.6v6H4.6V6.8h6"/></svg> Florida E-Filing Portal</button>
      </div>
    </div>
    <div class="accordion mb-3 no-print">
      <div class="accordion-item">
        <h2 class="accordion-header">
          <button class="accordion-button collapsed py-2" type="button" data-bs-toggle="collapse" data-bs-target="#importZoneAnnual">
            <svg class="ic" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M4 13.6 6.2 4.6h11.6L20 13.6v5.8H4Z"/><path d="M4 13.6h4.2l1.2 2.4h5.2l1.2-2.4H20"/></svg> Import Excel File (existing annual accounting template)
          </button>
        </h2>
        <div id="importZoneAnnual" class="accordion-collapse collapse">
          <div class="accordion-body import-zone-body p-4 text-center">
            <label class="btn btn-outline-primary btn-sm" style="cursor:pointer;">
              <svg class="ic" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M3.4 6.4h5.6l2 2.2h7.6v2.2"/><path d="M3.4 8.6 5.6 19h13.2l2.2-8.2H5.6Z"/></svg> Select File
              <input type="file" accept=".xlsx" class="d-none" data-annual-change="import-excel">
            </label>
            <p class="mt-2 mb-0" style="color:var(--ink-3);font-size:.8rem;">Select the previously exported Annual Accounting Excel file</p>
            <div id="import-progress-annual" class="mt-2" style="font-size:.8rem;"></div>
          </div>
        </div>
      </div>
    </div>
    ${errors.length?validationPanel(errors):''}
    ${renderOutputAdvisories(preflight.advisories)}
    ${supplementalWarning?`<div class="alert alert-warning no-print" role="status">${supplementalWarning}</div>`:''}
    ${capOver.length?excelCapacityPanel(capOver):''}
    <div id="print-doc-container"></div>
  </div>`;
}

export async function mountPreview(){
  const baseIssues = () => [...validateAnnual(), ...getSupplementalFilingIssues(window.D)];
  window.printCurrentFilingPdf = () => printGeneratedPdf(buildModelForPreview, window.D, baseIssues);
  await mountPdfPreview(buildModelForPreview, window.D, baseIssues);
}

export async function doSavePdf(){
  const preflight=prepareFilingOutput(window.D,()=>[...validateAnnual(), ...getSupplementalFilingIssues(window.D)]);
  const errors=preflight.messages;
  if(errors.length){renderPage('/print');alert(`Cannot export — ${errors.length} required field${errors.length===1?'':'s'} missing. See the list on this page.`);return;}
  const ward=(window.D.wardName||'AnnualAccounting').trim().replace(/[^a-z0-9]/gi,'_');
  const formSlug=(preflight.descriptor?.displayName||formDisplayName(window.D.inventoryType)).replace(/[^a-z0-9]/gi,'');
  const filename=`${ward}_${formSlug}.pdf`;

  try{
    const model = buildAnnualAccountingModel(window.D, {
      printDate: new Date().toISOString().slice(0, 10),
    });
    const doc = await generateCourtFormPdf(model);
    saveFinalizedPdf(await finalizeCourtFormPdf(doc), filename);
  }catch(e){
    console.error('PDF export failed',e);
    alert('PDF export failed: '+e.message);
  }
}

export async function doSaveDocx(){
  const preflight=prepareFilingOutput(window.D,()=>[...validateAnnual(), ...getSupplementalFilingIssues(window.D)]);
  const errors=preflight.messages;
  if(errors.length){renderPage('/print');alert(`Cannot export — ${errors.length} required field${errors.length===1?'':'s'} missing. See the list on this page.`);return;}
  const stat=document.getElementById('export-status');
  if(stat)stat.textContent='Generating Word document…';
  const ward=(window.D.wardName||'AnnualAccounting').trim().replace(/[^a-z0-9]/gi,'_');
  const formSlug=(preflight.descriptor?.displayName||formDisplayName(window.D.inventoryType)).replace(/[^a-z0-9]/gi,'');
  const filename=`${ward}_${formSlug}.docx`;

  try{
    const model = buildAnnualAccountingModel(window.D, {
      printDate: new Date().toISOString().slice(0, 10),
    });
    const docxBlob = await generateCourtFormDocx(model);
    saveFinalizedDocx(docxBlob, filename);
  }catch(e){
    console.error('Word export failed',e);
    alert('Word export failed: '+e.message);
  }finally{
    if(stat)stat.textContent='';
  }
}
