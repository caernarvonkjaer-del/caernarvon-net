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
import { mountPdfPreview, printGeneratedPdf } from '../../core/pdf/pdf-preview.js';

// Milestone 19-3: preview and Save-as-PDF must build the model with the
// identical options, so they can never diverge again.
function buildModelForPreview(D){
  return buildSimplifiedAccountingModel(D, {
    signatureStyle: D.signatureStyle || 'typed',
    printDate: new Date().toISOString().slice(0, 10),
  });
}

const {
  highlightErrors, validationPanel, excelCapacityPanel,
  renderPage,
} = window;

export function pagePrintSimplified(capOver){
  const errors=validateSimplified();
  highlightErrors(errors);
  const sigStyle = window.D.signatureStyle || 'typed';
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
    <div class="summary-box mb-3 no-print" style="background:var(--surface);border:1px solid var(--line);border-radius:8px;padding:.75rem 1rem;">
      <div style="font-weight:600;font-size:.85rem;color:var(--ink);margin-bottom:.25rem;">Electronic Signature Format (Fla. R. Gen. Prac. &amp; Jud. Admin. 2.515)</div>
      <div style="font-size:.78rem;color:var(--ink-3);margin-bottom:.5rem;">Electronic signature format for generated PDFs. Confirm current filing requirements before filing.</div>
      <div class="d-flex gap-4">
        <label class="form-check" style="cursor:pointer;margin-bottom:0;">
          <input class="form-check-input" type="radio" name="signatureStyleSimplified" value="typed" ${sigStyle==='typed'?'checked':''} data-simplified-change="set-sig-style">
          <span class="form-check-label" style="font-size:.85rem;"><strong>Typed /s/ signature</strong> (Default — Standard Document Font)</span>
        </label>
        <label class="form-check" style="cursor:pointer;margin-bottom:0;">
          <input class="form-check-input" type="radio" name="signatureStyleSimplified" value="script" ${sigStyle==='script'?'checked':''} data-simplified-change="set-sig-style">
          <span class="form-check-label" style="font-size:.85rem;"><strong>Script-style /s/ signature</strong> (Optional — Cursive Presentation)</span>
        </label>
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
          <div class="accordion-body" style="border:2px dashed var(--brand);border-top:none;border-radius:0 0 8px 8px;background:var(--surface-2);text-align:center;padding:1.5rem;">
            <label class="btn btn-outline-primary btn-sm" style="cursor:pointer;">
              <svg class="ic" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M3.4 6.4h5.6l2 2.2h7.6v2.2"/><path d="M3.4 8.6 5.6 19h13.2l2.2-8.2H5.6Z"/></svg> Select File
              <input type="file" accept=".xlsx" style="display:none" data-simplified-change="import-excel">
            </label>
            <p style="color:var(--ink-3);font-size:.8rem;margin:.5rem 0 0;">Select the previously exported Simplified Accounting Excel file</p>
            <div id="import-progress-simplified" style="margin-top:.5rem;font-size:.8rem;"></div>
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
      signatureStyle: window.D.signatureStyle || 'typed',
      printDate: new Date().toISOString().slice(0, 10),
    });
    const doc = await generateCourtFormPdf(model);
    doc.save(filename);
  }catch(e){
    console.error('PDF export failed',e);
    alert('PDF export failed: '+e.message);
  }
}
