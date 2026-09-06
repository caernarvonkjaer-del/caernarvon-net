// Print/PDF for Simplified Accounting. Dynamically imported once, alongside
// excel.js, by index.js's ensureLazyModules() on first mount -- see that
// file's header for why both load together rather than only on /print
// specifically. Statically imports back from index.js, which is safe: this
// module's exports are only ever called from a function body, well after
// both modules have finished loading, never during either module's own
// top-level evaluation, so the circularity (index.js dynamically imports
// this file; this file statically imports index.js) resolves cleanly.
import { validateSimplified } from './index.js';
import { buildSimplifiedAccountingModel } from './pdf-model.js';
import { generateCourtFormPdf } from '../../core/pdf/pdf-engine.js';
import { finalizeCourtFormPdf, saveFinalizedPdf } from '../../core/pdf/pdf-finalizer.js';
import { mountPdfPreview, printGeneratedPdf } from '../../core/pdf/pdf-preview.js';

function buildModelForPreview(D){
  return buildSimplifiedAccountingModel(D, { printDate: new Date().toISOString().slice(0, 10) });
}

const {
  highlightErrors, validationPanel, excelCapacityPanel,
  renderPage,
} = window;

export function pagePrintSimplified(capOver){
  const errors=validateSimplified();
  highlightErrors(errors);
  return `<div>
    <h1 class="visually-hidden">Print Preview</h1>
    <div class="print-preview-banner no-print">
      <div><strong>Preview &amp; Export</strong>${errors.length?` — <span style="color:var(--danger-text)">${errors.length} issue(s)</span>`:capOver.length?` — <span style="color:var(--danger-text)">too many entries for Excel; use PDF</span>`:' — Ready to export'}</div>
      <div class="d-flex gap-2 flex-wrap">
        <button class="btn btn-outline-primary btn-sm" data-simplified-action="save-pdf" ${errors.length?'disabled':''}>Save as PDF</button>
        <button class="btn btn-primary btn-sm" data-simplified-action="save-excel" ${errors.length||capOver.length?'disabled':''} ${capOver.length?'title="More remuneration entries than the Excel template can hold — save as PDF instead"':''}>Save as Excel</button>
        <button class="btn btn-outline-secondary btn-sm" data-simplified-action="open-court-portal" title="Opens the Florida Courts E-Filing Portal in a new tab"><svg class="ic" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M14.2 4.4h5.4v5.4"/><path d="m19.6 4.4-8 8"/><path d="M17.4 13.6v6H4.6V6.8h6"/></svg> Florida E-Filing Portal</button>
      </div>
    </div>
    <div class="accordion mb-3 no-print">
      <div class="accordion-item">
        <h2 class="accordion-header">
          <button class="accordion-button collapsed py-2" type="button" data-bs-toggle="collapse" data-bs-target="#importZoneSimplified">
            <svg class="ic" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M4 13.6 6.2 4.6h11.6L20 13.6v5.8H4Z"/><path d="M4 13.6h4.2l1.2 2.4h5.2l1.2-2.4H20"/></svg> Import Excel File (existing simplified accounting template)
          </button>
        </h2>
        <div id="importZoneSimplified" class="accordion-collapse collapse">
          <div class="accordion-body import-zone-body p-4 text-center">
            <label class="btn btn-outline-primary btn-sm" style="cursor:pointer;">
              <svg class="ic" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M3.4 6.4h5.6l2 2.2h7.6v2.2"/><path d="M3.4 8.6 5.6 19h13.2l2.2-8.2H5.6Z"/></svg> Select File
              <input type="file" accept=".xlsx" class="d-none" data-simplified-change="import-excel">
            </label>
            <p class="mt-2 mb-0" style="color:var(--ink-3);font-size:.8rem;">Select the previously exported Simplified Accounting Excel file</p>
            <div id="import-progress-simplified" class="mt-2" style="font-size:.8rem;"></div>
          </div>
        </div>
      </div>
    </div>
    ${errors.length?validationPanel(errors):''}
    ${capOver.length?excelCapacityPanel(capOver):''}
    <div id="print-doc-container"></div>
  </div>`;
}

export async function mountPreview(){
  window.printCurrentFilingPdf = () => printGeneratedPdf(buildModelForPreview, window.D);
  await mountPdfPreview(buildModelForPreview, window.D);
}

export async function doSavePdf(){
  const errors=validateSimplified();
  if(errors.length){renderPage('/print');alert(`Cannot export — ${errors.length} required field${errors.length===1?'':'s'} missing. See the list on this page.`);return;}
  const ward=(window.D.wardName||'SimplifiedAccounting').trim().replace(/[^a-z0-9]/gi,'_');
  const filename=`${ward}_SimplifiedAccounting.pdf`;

  try{
    const model = buildSimplifiedAccountingModel(window.D, {
      printDate: new Date().toISOString().slice(0, 10),
    });
    const doc = await generateCourtFormPdf(model);
    saveFinalizedPdf(await finalizeCourtFormPdf(doc), filename);
  }catch(e){
    console.error('PDF export failed',e);
    alert('PDF export failed: '+e.message);
  }
}
