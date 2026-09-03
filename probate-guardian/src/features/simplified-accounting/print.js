// Print/PDF for Simplified Accounting. Dynamically imported once, alongside
// excel.js, by index.js's ensureLazyModules() on first mount -- see that
// file's header for why both load together rather than only on /print
// specifically. Statically imports back from index.js, which is safe: this
// module's exports are only ever called from a function body, well after
// both modules have finished loading, never during either module's own
// top-level evaluation, so the circularity (index.js dynamically imports
// this file; this file statically imports index.js) resolves cleanly.
import { fmtS, validateSimplified } from './index.js';
import { buildSimplifiedAccountingModel } from './pdf-model.js';
import { generateCourtFormPdf } from '../../core/pdf/pdf-engine.js';

const {
  esc, fmtDate, circuitCourtCaption, calcTotals, tdSig,
  highlightErrors, validationPanel, excelCapacityPanel,
  renderPage, pvShowAll, html2pdf,
} = window;

function docHeaderSimplified(ward,caseNo,section,page){
  return `<div class="doc-header">
    <div class="court-title">${circuitCourtCaption(window.D.county)}</div>
    <div class="doc-title">SIMPLIFIED ANNUAL ACCOUNTING</div>
    <div class="doc-meta">
      <span>Name of Ward: <strong>${ward}</strong></span>
      <span>${section}${page?' — Page '+page:''}</span>
      <span>Case Number: <strong>${caseNo}</strong></span>
    </div>
  </div>`;
}

function buildPrintHTMLSimplified(){
  const d=window.D;
  const t=calcTotals();
  const ward=esc(d.wardName);
  const caseNo=esc(d.caseNumber);

  let html='';

  // Page 1 – Parts I & II
  html+=`<div class="doc-page">${docHeaderSimplified(ward,caseNo,'Summary','1')}
  <div class="doc-schedule-title">Part I — REQUIRED INFORMATION</div>
  <div class="doc-table-div mb-2" style="font-size:.76rem;">
    ${tdSig('IN RE: GUARDIANSHIP OF',esc(d.wardName))}
    ${tdSig('Social Security Number',esc(d.ssn))}
    ${tdSig('For the Period',`From: ${fmtDate(d.periodFrom)}&nbsp;&nbsp;&nbsp;To: ${fmtDate(d.periodTo)}`)}
    ${tdSig('Case Number',esc(d.caseNumber))}
    ${tdSig('Attorney for Guardian',esc(d.attorney))}
    ${tdSig('Guardian',esc(d.guardian))}
    ${tdSig('Type of Guardianship',esc(d.typeOfGuardianship))}
    ${tdSig('County',esc(d.county))}
    ${tdSig('Amended Form?',esc(d.amendedForm))}
  </div>
  <div class="attestation-text" style="font-size:.74rem;">Eligibility under § 744.3679: all estate property is held in a designated depository under § 69.031 (<strong>${esc(d.eligDepository)||'—'}</strong>); the only account transactions are interest accrual, settlement deposits, and/or financial institution service charges (<strong>${esc(d.eligOnlyTransactions)||'—'}</strong>).</div>
  <div class="doc-schedule-title">Part II — ACCOUNTING SUMMARY AND REMAINING ASSETS ON HAND</div>
  <table class="doc-table">
    <caption class="visually-hidden">Part II — Accounting Summary and Remaining Assets on Hand</caption>
    <thead><tr><th class="visually-hidden">Line</th><th class="visually-hidden">Description</th><th class="right visually-hidden">Amount</th></tr></thead>
    <tbody>
    <tr><td><strong>Line 1</strong></td><td>Starting Balance [Net Assets per the Prior Report]</td><td class="right">${fmtS(d.startingBalance)}</td></tr>
    <tr><td colspan="3" style="font-size:.75rem;color:var(--ink-3);padding:.15rem .38rem;">Income (Only the following receipts qualify)</td></tr>
    <tr><td><strong>Line 2</strong></td><td>Interest Income</td><td class="right">${fmtS(d.interestIncome)}</td></tr>
    <tr><td><strong>Line 3</strong></td><td>Deposits Pursuant to Settlement</td><td class="right">${fmtS(d.depositsSettlement)}</td></tr>
    <tr class="total-row"><td><strong>Line 4</strong></td><td>Total Income</td><td class="right">${fmtS(t.totalIncome)}</td></tr>
    <tr><td colspan="3" style="font-size:.75rem;color:var(--ink-3);padding:.15rem .38rem;">Less Disbursements (Only the following qualify)</td></tr>
    <tr><td><strong>Line 5</strong></td><td>Financial Institution Service Charges</td><td class="right">${fmtS(d.serviceCharges)}</td></tr>
    <tr><td><strong>Line 6</strong></td><td>Federal Income Tax</td><td class="right">${fmtS(d.federalIncomeTax)}</td></tr>
    <tr class="total-row"><td><strong>Line 7</strong></td><td>Total Disbursements</td><td class="right">${fmtS(t.totalDisbursements)}</td></tr>
    <tr class="total-row"><td colspan="2"><strong>Line 8 — Remaining Assets On Hand</strong></td><td class="right">${fmtS(t.remaining)}</td></tr>
    </tbody>
  </table>
  </div>`;

  // Page 2 – Part III & IV (Guardian declarations)
  html+=`<div class="doc-page">${docHeaderSimplified(ward,caseNo,'Part III &amp; IV','2')}
  <div class="doc-schedule-title">Part III — GUARDIAN(S) DECLARATION</div>
  <div class="attestation-text">Under penalties of perjury, I declare that I have read and examined the foregoing return and that, to the best of my knowledge and belief, it constitutes a full and correct account of all the ward's property of which this guardian has control, and is a complete report of all cash and property transactions and of all receipts and disbursements by me from <strong>${fmtDate(d.periodFrom)}</strong> through <strong>${fmtDate(d.periodTo)}</strong>.</div>
  <div class="doc-schedule-title">Part IV — GUARDIAN(S) INFORMATION</div>
  <p style="font-size:.7rem;color:var(--ink-3);margin-bottom:.5rem;">All guardians of the property must sign and provide the most current address, telephone number, and social security number. Only reports with original signatures will be audited by the Clerk of the Court.</p>
  ${d.guardians.filter(g=>g.name).map((g,i)=>{const gLabel=['Guardian #1','Co-Guardian #2','Co-Guardian #3'][i];return `
    <div class="doc-signature-block mb-4">
      <div class="row">
        <div class="col-6"><div class="doc-field-label">${gLabel}'s Signature</div><div class="doc-signature-line"></div></div>
        <div class="col-3"><div class="doc-field-label">Date</div><div class="doc-signature-line">${fmtDate(g.signatureDate)}</div></div>
        <div class="col-3"><div class="doc-field-label">${gLabel}'s Name</div><div class="doc-signature-line">${esc(g.name)}</div></div>
      </div>
      <div class="row mt-2">
        <div class="col-4"><div class="doc-field-label">SSN / EIN</div><div class="doc-signature-line">${esc(g.ssn)}</div></div>
        <div class="col-4"><div class="doc-field-label">Phone Number</div><div class="doc-signature-line">${esc(g.phone)}</div></div>
        <div class="col-4"><div class="doc-field-label">Mailing Street Address</div><div class="doc-signature-line">${esc(g.mailingStreet)}</div></div>
      </div>
      <div class="row mt-2">
        <div class="col-6"><div class="doc-field-label">Email Address</div><div class="doc-signature-line">${esc(g.email)}</div></div>
        <div class="col-6"><div class="doc-field-label">Mailing City / State / Zip</div><div class="doc-signature-line">${esc(g.mailingCityStateZip)}</div></div>
      </div>
      <div class="row mt-2">
        <div class="col-6"><div class="doc-field-label">Residence / Corporate Street Address</div><div class="doc-signature-line">${esc(g.residenceStreet)}</div></div>
        <div class="col-6"><div class="doc-field-label">Residence / Corporate City / State / Zip</div><div class="doc-signature-line">${esc(g.residenceCityStateZip)}</div></div>
      </div>
    </div>`;}).join('')}
  </div>`;

  // Page 3 – Part V & VI (Attorney + Cert of Service)
  html+=`<div class="doc-page">${docHeaderSimplified(ward,caseNo,'Part V &amp; VI','3')}
  <div class="doc-schedule-title">Part V — SIGNATURE OF GUARDIAN ATTORNEY</div>
  <div class="attestation-text">The undersigned Attorney hereby notifies the Court of the filing of the simplified annual accounting of the Guardian <strong>${ward}</strong> for the period <strong>${fmtDate(d.periodFrom)}</strong> through <strong>${fmtDate(d.periodTo)}</strong>. This simplified annual accounting is the representation of the guardian. The undersigned attorney represents that he/she has examined the contents of the accounting and that it conforms to the requirements of the Florida Guardianship Law and the standards for accountings in <strong>${esc(d.county)}</strong> County, Florida.</div>
  <div class="doc-signature-block">
    <div class="row">
      <div class="col-6"><div class="doc-field-label">Attorney Signature &nbsp;/s/</div><div class="doc-signature-line"></div></div>
      <div class="col-3"><div class="doc-field-label">Date</div><div class="doc-signature-line">${fmtDate(d.attorney_signatureDate)||''}</div></div>
      <div class="col-3"><div class="doc-field-label">Attorney's Name</div><div class="doc-signature-line">${esc(d.attorney)}</div></div>
    </div>
    <div class="row mt-2">
      <div class="col-4"><div class="doc-field-label">Bar Number</div><div class="doc-signature-line">${esc(d.attorney_barNumber)}</div></div>
      <div class="col-4"><div class="doc-field-label">Phone</div><div class="doc-signature-line">${esc(d.attorney_phone)}</div></div>
      <div class="col-4"><div class="doc-field-label">Street Address</div><div class="doc-signature-line">${esc(d.attorney_street)}</div></div>
    </div>
    <div class="row mt-2">
      <div class="col-6"><div class="doc-field-label">City / State / Zip</div><div class="doc-signature-line">${esc(d.attorney_cityStateZip)}</div></div>
    </div>
  </div>
  <div class="doc-schedule-title">Part VI — GUARDIAN ATTORNEY CERTIFICATE OF SERVICE</div>
  <p style="font-size:.78rem;margin-bottom:1rem;">Pursuant to Florida Statute 744.362(1), I hereby certify that a copy of this simplified annual accounting has been furnished to:</p>
  <div class="row mb-3">
    ${d.certRecipients.slice(0,2).map((r,i)=>`<div class="col-6 mb-2"><div class="doc-field-label">Recipient ${i+1}</div><div class="doc-signature-line">${esc(r.name)}</div><div class="doc-signature-line">${esc(r.line2)}</div><div class="doc-signature-line">${esc(r.line3)}</div></div>`).join('')}
  </div>
  <div class="row mb-3">
    ${d.certRecipients.slice(2,4).map((r,i)=>`<div class="col-6 mb-2"><div class="doc-field-label">Recipient ${i+3}</div><div class="doc-signature-line">${esc(r.name)}</div><div class="doc-signature-line">${esc(r.line2)}</div><div class="doc-signature-line">${esc(r.line3)}</div></div>`).join('')}
  </div>
  <p style="font-size:.78rem;">on this date: ${fmtDate(d.certServiceDate)||''}${d.certIndicator?` &nbsp;|&nbsp; Indicate if: ${esc(d.certIndicator)}`:''}</p>
  <div class="doc-signature-block">
    <div class="row">
      <div class="col-6"><div class="doc-field-label">Attorney Signature &nbsp;/s/</div><div class="doc-signature-line"></div></div>
      <div class="col-3"><div class="doc-field-label">Date</div><div class="doc-signature-line">${fmtDate(d.certAttySignDate)||''}</div></div>
      <div class="col-3"><div class="doc-field-label">Attorney's Name</div><div class="doc-signature-line">${esc(d.attorney)}</div></div>
    </div>
    <div class="row mt-2">
      <div class="col-4"><div class="doc-field-label">Bar Number</div><div class="doc-signature-line">${esc(d.certAttyBarNumber)}</div></div>
      <div class="col-4"><div class="doc-field-label">Phone</div><div class="doc-signature-line">${esc(d.certAttyPhone)}</div></div>
      <div class="col-4"><div class="doc-field-label">Street Address</div><div class="doc-signature-line">${esc(d.certAttyStreet)}</div></div>
    </div>
    <div class="row mt-2">
      <div class="col-6"><div class="doc-field-label">City / State / Zip</div><div class="doc-signature-line">${esc(d.certAttyCityStateZip)}</div></div>
    </div>
    <p class="mt-3" style="font-size:.76rem;text-align:center;font-weight:700;">(End of Simplified Annual Accounting)</p>
  </div>
  </div>`;

  // Page 4 – Part VII (Remuneration)
  if(d.remuneration.some(r=>r.guardian||r.type||r.description)){
    html+=`<div class="doc-page">${docHeaderSimplified(ward,caseNo,"Summary (Cont'd)",'4')}
    <div class="doc-schedule-title">Part VII — GUARDIAN(S) DECLARATION OF REMUNERATION</div>
    <p style="font-size:.73rem;margin-bottom:.5rem;">Per 744.367(3)(a), the annual guardianship report must include a declaration of all remuneration received by the guardian from any source for services rendered to or on behalf of the ward. As used in this paragraph, the term "remuneration" means any payment or other benefit made directly or indirectly, overtly or covertly, or in cash or in kind to the guardian.</p>
    <table class="doc-table">
      <thead><tr><th>#</th><th>Guardian Name</th><th>Type</th><th>Description</th></tr></thead>
      <tbody>${d.remuneration.filter(r=>r.guardian||r.type||r.description).map((r,i)=>`<tr><td>${i+1}</td><td>${esc(r.guardian)}</td><td>${esc(r.type)}</td><td>${esc(r.description)}</td></tr>`).join('')}</tbody>
    </table>
    </div>`;
  }

  return html;
}

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
    <div id="print-doc-container">${buildPrintHTMLSimplified()}</div>
  </div>`;
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
