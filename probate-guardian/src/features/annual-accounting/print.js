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
import { mountPdfPreview, printGeneratedPdf } from '../../core/pdf/pdf-preview.js';

// Milestone 19-3: preview and Save-as-PDF must build the model with the
// identical options, so they can never diverge again.
function buildModelForPreview(D){
  return buildAnnualAccountingModel(D, {
    signatureStyle: D.signatureStyle || 'typed',
    printDate: new Date().toISOString().slice(0, 10),
  });
}

const {
  formDisplayName,
  excelCapacityPanel, highlightErrors, validationPanel,
  renderPage,
} = window;

export function pagePrintAnnual(capOver){
  const errors=validateAnnual();
  highlightErrors(errors);
  return `<div>
    <h1 class="visually-hidden">Print Preview</h1>
    <div class="print-preview-banner no-print">
      <div><strong>Preview &amp; Export</strong> ${errors.length?`<span style="color:var(--danger-text)"> — ${errors.length} issue(s)</span>`:capOver.length?`<span style="color:var(--danger-text)"> — too many entries for Excel; use PDF</span>`:' — Ready to export'}</div>
      <div class="d-flex gap-2 flex-wrap">
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
          <div class="accordion-body" style="border:2px dashed var(--brand);border-top:none;border-radius:0 0 8px 8px;background:var(--surface-2);text-align:center;padding:1.5rem;">
            <label class="btn btn-outline-primary btn-sm" style="cursor:pointer;">
              <svg class="ic" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M3.4 6.4h5.6l2 2.2h7.6v2.2"/><path d="M3.4 8.6 5.6 19h13.2l2.2-8.2H5.6Z"/></svg> Select File
              <input type="file" accept=".xlsx" style="display:none" data-annual-change="import-excel">
            </label>
            <p style="color:var(--ink-3);font-size:.8rem;margin:.5rem 0 0;">Select the previously exported Annual Accounting Excel file</p>
            <div id="import-progress-annual" style="margin-top:.5rem;font-size:.8rem;"></div>
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
  const errors=validateAnnual();
  if(errors.length){renderPage('/print');alert(`Cannot export — ${errors.length} required field${errors.length===1?'':'s'} missing. See the list on this page.`);return;}
  const ward=(window.D.wardName||'AnnualAccounting').trim().replace(/[^a-z0-9]/gi,'_');
  const formSlug=formDisplayName(window.D.inventoryType).replace(/[^a-z0-9]/gi,'');
  const filename=`${ward}_${formSlug}.pdf`;

  try{
    const model = buildAnnualAccountingModel(window.D, {
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
