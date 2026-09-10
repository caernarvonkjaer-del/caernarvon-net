// Print/PDF export for Guardian Inventory (Milestone 8, Phase B). Dynamically
// imported from ./index.js, together with excel.js, at first mount -- see
// that file's ensureLazyModules() comment for why (the Cover page's
// Excel-import control must work immediately).
//
// Print/PDF export for Guardian Inventory (Milestone 8, Phase B). Dynamically
// imported from ./index.js, together with excel.js, at first mount -- see
// that file's ensureLazyModules() comment for why (the Cover page's
// Excel-import control must work immediately).
//
// Statically imports validateGuardian/pageNav back from ./index.js -- safe
// despite index.js dynamically importing this file, since neither side
// touches the other's export during top-level module evaluation, only
// inside function bodies called later (see
// src/features/simplified-accounting/index.js's comment on the same
// pattern).
import { validateGuardian, pageNav } from './index.js';
import { buildVerifiedInventoryModel } from './pdf-model.js';
import { generateVerifiedInventoryPdf } from './pdf-engine.js';
import { finalizeCourtFormPdf, saveFinalizedPdf } from '../../core/pdf/pdf-finalizer.js';
import { generateCourtFormDocx, saveFinalizedDocx } from '../../core/docx/docx-engine.js';
import { mountPdfPreview, printGeneratedPdf } from '../../core/pdf/pdf-preview.js';
import { getSupplementalAccessibilityWarning, getSupplementalFilingIssues } from '../../core/pdf/supplemental-pdf.js';
import { prepareFilingOutput } from '../../core/filing/output-preflight.js';

function buildModelForPreview(D){
  return buildVerifiedInventoryModel(D, {
    printDate: new Date().toISOString().slice(0, 10),
  });
}

const {
  highlightErrors, validationPanel, excelCapacityPanel,
  renderPage,
} = window;

export function pagePrint(capOver){
  window.queueAllScheduleDocValidations?.();
  const errors=prepareFilingOutput(window.D,()=>[...validateGuardian(), ...getSupplementalFilingIssues(window.D)]).messages;
  const supplementalWarning=getSupplementalAccessibilityWarning(window.D);
  highlightErrors(errors);
  const errPanel=errors.length?validationPanel(errors):'';
  const warnPanel=supplementalWarning?`<div class="alert alert-warning no-print" role="status">${supplementalWarning}</div>`:'';
  const canExport=errors.length===0;
  const canExportExcel=canExport&&capOver.length===0;
  return `<div>
  <h1 class="visually-hidden">Print Preview</h1>
  <div class="print-preview-banner no-print">
    <span><svg class="ic" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M6.4 3.4h7l4.2 4.2v13H6.4Z"/><path d="M13.2 3.4v4.4h4.4"/><path d="M9.2 12.6h5.6M9.2 16h5.6"/></svg> Print Preview — use <strong>Save as Word</strong> (editable copy), <strong>Save as PDF</strong>, <strong>Save as Excel</strong>, or <strong>Print</strong>.</span>
    <div class="d-flex gap-2 align-items-center flex-wrap">
      <span id="export-status" style="font-size:.8rem;color:var(--ink-3);"></span>
      <button class="btn btn-outline-primary btn-sm" data-inventory-action="save-word" ${canExport?'':'disabled'} title="Save editable Word copy (.docx)"><svg class="ic" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M6.4 3.4h7l4.2 4.2v13H6.4Z"/><path d="M13.2 3.4v4.4h4.4"/><path d="M8.8 11.5h6.4M8.8 14.5h6.4M8.8 17.5h4"/></svg> Save as Word</button>
      <button class="btn btn-outline-primary btn-sm" data-inventory-action="save-pdf" ${canExport?'':'disabled'}><svg class="ic" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M6.4 3.4h7l4.2 4.2v13H6.4Z"/><path d="M13.2 3.4v4.4h4.4"/><path d="M9.2 12.6h5.6M9.2 16h5.6"/></svg> Save as PDF</button>
      <button class="btn btn-outline-success btn-sm" data-inventory-action="save-excel" ${canExportExcel?'':'disabled'} ${capOver.length?'title="Some schedules have more entries than the Excel template can hold — save as PDF instead"':''}><svg class="ic" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M4.2 20h15.6"/><path d="M7.4 20v-6.4M12 20V5.6M16.6 20v-9.2"/></svg> Save as Excel</button>
      <button class="btn btn-outline-secondary btn-sm" data-form-action="print"><svg class="ic" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M7.2 9.2V3.6h9.6v5.6"/><rect x="4" y="9.2" width="16" height="6.6" rx="1.6"/><path d="M7.2 14.6h9.6v5.8H7.2Z"/></svg> Print</button>
      <button class="btn btn-outline-secondary btn-sm" data-form-action="open-court-portal" title="Opens the Florida Courts E-Filing Portal in a new tab"><svg class="ic" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M14.2 4.4h5.4v5.4"/><path d="m19.6 4.4-8 8"/><path d="M17.4 13.6v6H4.6V6.8h6"/></svg> Florida E-Filing Portal</button>
    </div>
  </div>

  ${errPanel}
  ${warnPanel}
  ${capOver.length?excelCapacityPanel(capOver):''}
  <div id="print-doc-container"></div>
  ${pageNav('/print')}
  </div>`;
}

// Called by index.js's mount() after the print page's HTML is in the DOM --
// renders the actual generated PDF (canvas + selectable text layer) into
// #print-doc-container, replacing the old buildPrintHTML() reconstruction.
export async function mountPreview(){
  const baseIssues = () => [...validateGuardian(), ...getSupplementalFilingIssues(window.D)];
  window.printCurrentFilingPdf = () => printGeneratedPdf(buildModelForPreview, window.D, baseIssues);
  await mountPdfPreview(buildModelForPreview, window.D, baseIssues);
}

export async function doSavePdf(){
  const errors=prepareFilingOutput(window.D,()=>[...validateGuardian(), ...getSupplementalFilingIssues(window.D)]).messages;
  if(errors.length){renderPage('/print');alert(`Cannot export — ${errors.length} required field${errors.length===1?'':'s'} missing. See the list on this page.`);return;}
  const stat=document.getElementById('export-status');
  if(stat)stat.textContent='Generating PDF…';
  const stem=(window.D.wardName||'GuardianInventory').trim().replace(/\s+/g,'_');
  const filename=`${stem}_InitialInventory.pdf`;

  try{
    const model = buildVerifiedInventoryModel(window.D, {
      printDate: new Date().toISOString().slice(0, 10),
    });
    const doc = await generateVerifiedInventoryPdf(model);
    saveFinalizedPdf(await finalizeCourtFormPdf(doc), filename);
  }catch(e){
    console.error('PDF export failed',e);
    alert('PDF export failed: '+e.message);
  }finally{
    if(stat)stat.textContent='';
  }
}

export async function doSaveDocx(){
  const errors=prepareFilingOutput(window.D,()=>[...validateGuardian(), ...getSupplementalFilingIssues(window.D)]).messages;
  if(errors.length){renderPage('/print');alert(`Cannot export — ${errors.length} required field${errors.length===1?'':'s'} missing. See the list on this page.`);return;}
  const stat=document.getElementById('export-status');
  if(stat)stat.textContent='Generating Word document…';
  const stem=(window.D.wardName||'GuardianInventory').trim().replace(/\s+/g,'_');
  const filename=`${stem}_InitialInventory.docx`;

  try{
    const model = buildVerifiedInventoryModel(window.D, {
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
