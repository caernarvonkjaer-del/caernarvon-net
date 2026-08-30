// Print/PDF export for Annual Accounting (Milestone 7, Phase B). Dynamically
// imported from ./index.js, together with excel.js, at first mount -- see
// that file's ensureLazyModules() comment for why (the Cover-equivalent
// page's Excel-import control must work immediately). Also covers the
// finalAccounting/trustAccounting aliases (formEngine() routing, no
// separate code path here).
//
// Statically imports validateAnnual/fmtAnnual/fmtD/DISB_CATS back from
// ./index.js -- safe despite index.js dynamically importing this file,
// since neither side touches the other's export during top-level module
// evaluation, only inside function bodies called later (see
// src/features/simplified-accounting/index.js's comment on the same
// pattern).
import { validateAnnual, fmtAnnual, fmtD, DISB_CATS } from './index.js';

const {
  annualReconcileState, calcTotalsAnnual, circuitCourtCaption, esc,
  formDisplayName, n, pct, td, tdR,
  excelCapacityPanel, highlightErrors, validationPanel,
  groupScheduleBlocksForPdf, html2pdf, pvShowAll, renderPage,
} = window;

function docHdr(ward,caseNo,section,page){
  return `<div class="doc-header">
    <div class="court-title">${circuitCourtCaption(window.D.county)}</div>
    <div class="doc-title">${esc(formDisplayName(window.D.inventoryType).toUpperCase())}</div>
    <div class="doc-meta">
      <span>Name of Ward: <strong>${esc(ward)}</strong></span>
      <span>${section}${page?' — Page '+page:''}</span>
      <span>Case Number: <strong>${esc(caseNo)}</strong></span>
    </div>
  </div>`;
}
function sl(label,val){return td(label,val);}
function slR(label,val){return tdR(label,val);}

function buildPrintHTMLAnnual(){
  const d=window.D; const t=calcTotalsAnnual();
  const W=esc(d.wardName); const CN=esc(d.caseNumber);
  let html='';

  // ── Page 1: Parts I & II ──────────────────────────────
  html+=`<div class="schedule-page doc-page">${docHdr(W,CN,'Summary','1')}
  <div class="doc-schedule-title">Part I — REQUIRED INFORMATION</div>
  <div class="doc-table-div mb-2">
    ${sl('IN RE: GUARDIANSHIP OF',esc(d.wardName))} ${sl('Case Number',esc(d.caseNumber))}
    ${sl('For the Period',`From: ${fmtD(d.periodFrom)} &nbsp;&nbsp; To: ${fmtD(d.periodTo)}`)}
    ${sl('Guardian',esc(d.guardian))} ${sl('Attorney for Guardian',esc(d.attorney))}
    ${sl('Type of Guardianship',esc(d.typeOfGuardianship))} ${sl('County',esc(d.county))}
    ${sl('Filing Type',esc(d.filingType))} ${sl('Amended Form?',esc(d.amendedForm))}
    ${d.relatedCaseNumbers?sl('Related Case Numbers',esc(d.relatedCaseNumbers)):''}
  </div>
  <div class="doc-schedule-title">Part II — GUARDIAN CERTIFICATION &amp; AUDIT FEE</div>
  <p style="font-size:.75rem;font-style:italic;margin-bottom:.4rem">The undersigned guardian certifies that said guardian has obtained a receipt or canceled check for all expenditures and disbursements made on behalf of the ward, which said guardian will preserve along with other substantiating papers for a three (3) year period after discharge.</p>
  <div class="doc-table-div mb-2">
    ${slR('Annual Accounting Estates with value of $25,000 or less','$20.00')}
    ${slR('From $25,000.01 up to and including $100,000','$85.00')}
    ${slR('From $100,000.01 up to and including $500,000','$170.00')}
    ${slR('In excess of $500,000','$250.00')}
    <div class="tr total-row"><div class="td">Applicable Audit Fee (total assets: ${fmtAnnual(t.netAssetsFromD)})</div><div class="td right"><strong>${t.auditFee.toFixed(2)}</strong></div></div>
  </div>
  </div>`;

  // ── Page 2: Parts VI & VII Summary ───────────────────
  html+=`<div class="schedule-page doc-page">${docHdr(W,CN,'Summary','2')}
  <div class="doc-schedule-title">Part VI — Changes in Net Assets</div>
  <div class="doc-table-div mb-2">
    ${slR('Starting Balance [Net Assets per Prior Report]',fmtAnnual(d.startingBalance))}
    ${slR('Schedule A — Income/Receipts',fmtAnnual(t.schA))}
    ${slR('Schedule B-1 — Attorney Fees and Costs',`(${fmtAnnual(t.schB1)})`)}
    ${slR('Schedule B-2 — Guardian Fees and Costs',`(${fmtAnnual(t.schB2)})`)}
    ${slR('Schedule B-3 — Other Court-Ordered Disbursements',`(${fmtAnnual(t.schB3)})`)}
    ${slR('Schedule B-4 — All Other Disbursements',`(${fmtAnnual(t.schB4)})`)}
    <div class="tr total-row"><div class="td">Total Disbursements</div><div class="td right">(${fmtAnnual(t.totalDisb)})</div></div>
    ${slR('Schedule C — Capital Adjustments Net',fmtAnnual(t.schC_net))}
    <div class="tr total-row"><div class="td">Line 20 — Net Assets at End of Accounting Period</div><div class="td right">${fmtAnnual(t.netAssets)}</div></div>
  </div>
  <div class="doc-schedule-title">Part VII — Assets &amp; Liabilities at End of Period</div>
  <div class="doc-table-div">
    ${slR('Schedule D-1 — Cash Assets',fmtAnnual(t.schD1_total))}
    ${slR('Schedule D-2 — Real Estate (Carrying / Ward Value)',`${fmtAnnual(t.schD2_carrying)} / ${fmtAnnual(t.schD2_ward)}`)}
    ${slR('Schedule D-3 — Personal Property (Carrying / Ward Amt)',`${fmtAnnual(t.schD3_carrying)} / ${fmtAnnual(t.schD3_ward)}`)}
    ${slR('Schedule D-4 — Intangible Assets (Carrying / Ward Value)',`${fmtAnnual(t.schD4_carrying)} / ${fmtAnnual(t.schD4_ward)}`)}
    ${slR('Schedule D-5 — Mortgages / Liabilities',`(${fmtAnnual(t.schD5_total)})`)}
    <div class="tr total-row"><div class="td">Line 30 — Net Assets at End of Accounting Period</div><div class="td right">${fmtAnnual(t.netAssetsFromD)}</div></div>
  </div>
  ${(()=>{const r=annualReconcileState(t);
    if(!r.outOfBalance)return '';
    // Disclose the difference on the filed document rather than printing two
    // totals that silently disagree.
    return `<div class="doc-section-block" style="margin-top:.5rem;">
      <div class="doc-schedule-title">Explanation of Difference Between Line 20 and Line 30</div>
      <div style="font-size:.75rem;">Difference: ${fmtAnnual(r.diff)}</div>
      <div style="font-size:.75rem;white-space:pre-wrap;margin-top:.2rem;">${esc(r.explanation)}</div>
    </div>`;})()}
  </div>`;

  // ── Page 3: Part III — Guardian Declarations ──────────
  html+=`<div class="schedule-page doc-page">${docHdr(W,CN,'Part III','3')}
  <div class="doc-schedule-title">Part III — GUARDIAN(S) SIGNATURE &amp; DECLARATION</div>
  <div class="attestation-text">UNDER PENALTIES OF PERJURY, I declare that I have read and examined the foregoing return and that, to the best of my knowledge and belief, it constitutes a full and correct account of all the ward's property of which this guardian has control, and is a complete report of all cash and property transactions and of all receipts and any disbursements by me from <strong>${fmtD(d.periodFrom)}</strong> through <strong>${fmtD(d.periodTo)}</strong>.</div>
  ${d.guardians.filter(g=>g.name).map((g,i)=>{const gLabel=['Guardian #1','Co-Guardian #2','Co-Guardian #3'][i];return `
    <div class="doc-signature-block mb-4">
      <div class="row">
        <div class="col-6"><div class="doc-field-label">${gLabel}'s Signature</div><div class="doc-signature-line"></div></div>
        <div class="col-3"><div class="doc-field-label">Date</div><div class="doc-signature-line">${fmtD(g.signatureDate)}</div></div>
        <div class="col-3"><div class="doc-field-label">${gLabel}'s Name</div><div class="doc-signature-line">${esc(g.name)}</div></div>
      </div>
      <div class="row mt-2">
        <div class="col-4"><div class="doc-field-label">SSN / EIN</div><div class="doc-signature-line">${esc(g.ssn)}</div></div>
        <div class="col-4"><div class="doc-field-label">Phone</div><div class="doc-signature-line">${esc(g.phone)}</div></div>
        <div class="col-4"><div class="doc-field-label">Mailing Street</div><div class="doc-signature-line">${esc(g.mailingStreet)}</div></div>
      </div>
      <div class="row mt-2">
        <div class="col-6"><div class="doc-field-label">Email</div><div class="doc-signature-line">${esc(g.email)}</div></div>
        <div class="col-6"><div class="doc-field-label">Mailing City / State / Zip</div><div class="doc-signature-line">${esc(g.mailingCityStateZip)}</div></div>
      </div>
      <div class="row mt-2">
        <div class="col-6"><div class="doc-field-label">Residence / Office Street</div><div class="doc-signature-line">${esc(g.officeStreet)}</div></div>
        <div class="col-6"><div class="doc-field-label">Residence / Office City / State / Zip</div><div class="doc-signature-line">${esc(g.officeCityStateZip)}</div></div>
      </div>
    </div>`;}).join('')}
  </div>`;

  // ── Page 4: Parts IV & V ──────────────────────────────
  const p=d.preparer;
  html+=`<div class="schedule-page doc-page">${docHdr(W,CN,'Part IV','4')}
  <div class="doc-schedule-title">Part IV — PREPARER ATTESTATION</div>
  <div class="attestation-text">I have compiled the accompanying Annual Accounting of assets and liabilities arising from cash transactions, current market valuation, and current estimated market valuation of the guardianship of <strong>${W}</strong> for the period <strong>${fmtD(d.periodFrom)}</strong> through <strong>${fmtD(d.periodTo)}</strong>. This compilation is limited to presenting information in the form of an Annual Accounting and is the representation of the guardian. I have not audited or reviewed the accompanying guardianship accounting and, accordingly, do not express an opinion or any other form of assurance on it.</div>
  <p style="font-size:.76rem;color:var(--danger-text);font-weight:700;margin-bottom:.75rem;">If you are the Guardian, Co-Guardian, or Guardian Attorney — DO NOT SIGN HERE.</p>
  <div class="doc-signature-block mb-4">
    <div class="row">
      <div class="col-6"><div class="doc-field-label">Preparer's Signature</div><div class="doc-signature-line"></div></div>
      <div class="col-3"><div class="doc-field-label">Date</div><div class="doc-signature-line">${fmtD(p.signatureDate)}</div></div>
      <div class="col-3"><div class="doc-field-label">Preparer's Name</div><div class="doc-signature-line">${esc(p.name)}</div></div>
    </div>
    <div class="row mt-2">
      <div class="col-4"><div class="doc-field-label">SSN / EIN</div><div class="doc-signature-line">${esc(p.ssn)}</div></div>
      <div class="col-4"><div class="doc-field-label">Phone</div><div class="doc-signature-line">${esc(p.phone)}</div></div>
      <div class="col-4"><div class="doc-field-label">Street Address</div><div class="doc-signature-line">${esc(p.street)}</div></div>
    </div>
    <div class="row mt-2">
      <div class="col-6"><div class="doc-field-label">City / State / Zip</div><div class="doc-signature-line">${esc(p.cityStateZip)}</div></div>
    </div>
  </div>
  <div class="doc-schedule-title">Part V — GUARDIAN ATTORNEY SIGNATURE</div>
  <div class="attestation-text">The undersigned Attorney hereby notifies the Court of the filing of the annual guardianship accounting of the Guardian <strong>${W}</strong> for the period <strong>${fmtD(d.periodFrom)}</strong> through <strong>${fmtD(d.periodTo)}</strong>. This annual accounting is the representation of the guardian. The undersigned attorney represents that he/she has examined the contents of the accounting and that it conforms to the requirements of the Florida Guardianship Law and the standards for accountings in <strong>${esc(d.attorney_county||d.county)}</strong> County, Florida.</div>
  <div class="doc-signature-block">
    <div class="row">
      <div class="col-6"><div class="doc-field-label">Attorney Signature &nbsp;/s/</div><div class="doc-signature-line"></div></div>
      <div class="col-3"><div class="doc-field-label">Date</div><div class="doc-signature-line">${fmtD(d.attorney_signatureDate)}</div></div>
      <div class="col-3"><div class="doc-field-label">Attorney's Name</div><div class="doc-signature-line">${esc(d.attorney)}</div></div>
    </div>
    <div class="row mt-2">
      <div class="col-4"><div class="doc-field-label">Bar Number</div><div class="doc-signature-line">${esc(d.attorney_bar)}</div></div>
      <div class="col-4"><div class="doc-field-label">Phone</div><div class="doc-signature-line">${esc(d.attorney_phone)}</div></div>
      <div class="col-4"><div class="doc-field-label">Street Address</div><div class="doc-signature-line">${esc(d.attorney_street)}</div></div>
    </div>
    <div class="row mt-2">
      <div class="col-6"><div class="doc-field-label">City / State / Zip</div><div class="doc-signature-line">${esc(d.attorney_cityStateZip)}</div></div>
    </div>
  </div>
  </div>`;

  // ── Schedule A ────────────────────────────────────────
  html+=`<div class="schedule-page doc-page">${docHdr(W,CN,'Schedule A','1')}
  <div class="doc-schedule-title">SCHEDULE A: Income Received During Period</div>
  <table class="doc-table">
    <caption class="visually-hidden">Schedule A: Income Received During Period</caption>
    <thead><tr><th>#</th><th>Income Source / Payer</th><th>Description</th><th>Bank</th><th>Account #</th><th class="right">Ward's Income Amount</th></tr></thead>
    <tbody>${d.schA.length?d.schA.map((r,i)=>`<tr><td>${i+1}</td><td>${esc(r.payer)}</td><td>${esc(r.description)}</td><td>${esc(r.bank)}</td><td>${esc(r.accountNo)}</td><td class="right">${fmtAnnual(r.amount)}</td></tr>`).join(''):'<tr><td colspan="6" style="text-align:center;color:var(--ink-3);font-style:italic">No income entries</td></tr>'}
    <tr class="total-row"><td colspan="5">Schedule A Total — Income/Receipts Received During Period</td><td class="right">${fmtAnnual(t.schA)}</td></tr>
    </tbody>
  </table>
  </div>`;

  // ── Schedule B-1 ──────────────────────────────────────
  html+=`<div class="schedule-page doc-page">${docHdr(W,CN,'Schedule B-1','1')}
  <div class="doc-schedule-title">SCHEDULE B-1: Attorney Fees and Costs During Period</div>
  <table class="doc-table">
    <caption class="visually-hidden">Schedule B-1: Attorney Fees and Costs During Period</caption>
    <thead><tr><th>#</th><th>Bank Acct #</th><th>Check #</th><th>Period From</th><th>Period To</th><th>Date Paid</th><th>Payee</th><th>Court Order</th><th class="right">Amount</th></tr></thead>
    <tbody>${d.schB1.length?d.schB1.map((r,i)=>`<tr><td>${i+1}</td><td>${esc(r.bankAcct)}</td><td>${esc(r.checkNo)}</td><td>${fmtD(r.periodFrom)}</td><td>${fmtD(r.periodTo)}</td><td>${fmtD(r.datePaid)}</td><td>${esc(r.payee)}</td><td>${fmtD(r.courtOrderDate)}</td><td class="right">${fmtAnnual(r.amount)}</td></tr>`).join(''):'<tr><td colspan="9" style="text-align:center;color:var(--ink-3);font-style:italic">No entries</td></tr>'}
    <tr class="total-row"><td colspan="8">Schedule B-1 Total</td><td class="right">${fmtAnnual(t.schB1)}</td></tr>
    </tbody>
  </table>
  <div class="doc-schedule-title mt-3">SCHEDULE B-2: Guardian Fees and Costs During Period</div>
  <table class="doc-table">
    <caption class="visually-hidden">Schedule B-2: Guardian Fees and Costs During Period</caption>
    <thead><tr><th>#</th><th>Bank Acct #</th><th>Check #</th><th>Period From</th><th>Period To</th><th>Date Paid</th><th>Payee</th><th>Court Order</th><th class="right">Amount</th></tr></thead>
    <tbody>${d.schB2.length?d.schB2.map((r,i)=>`<tr><td>${i+1}</td><td>${esc(r.bankAcct)}</td><td>${esc(r.checkNo)}</td><td>${fmtD(r.periodFrom)}</td><td>${fmtD(r.periodTo)}</td><td>${fmtD(r.datePaid)}</td><td>${esc(r.payee)}</td><td>${fmtD(r.courtOrderDate)}</td><td class="right">${fmtAnnual(r.amount)}</td></tr>`).join(''):'<tr><td colspan="9" style="text-align:center;color:var(--ink-3);font-style:italic">No entries</td></tr>'}
    <tr class="total-row"><td colspan="8">Schedule B-2 Total</td><td class="right">${fmtAnnual(t.schB2)}</td></tr>
    </tbody>
  </table>
  <div class="doc-schedule-title mt-3">SCHEDULE B-3: Other Court-Ordered Disbursements During Period</div>
  <table class="doc-table">
    <caption class="visually-hidden">Schedule B-3: Other Court-Ordered Disbursements During Period</caption>
    <thead><tr><th>#</th><th>Bank Acct #</th><th>Check #</th><th>Date Paid</th><th>Payee</th><th>Court Order Date</th><th class="right">Amount</th></tr></thead>
    <tbody>${d.schB3.length?d.schB3.map((r,i)=>`<tr><td>${i+1}</td><td>${esc(r.bankAcct)}</td><td>${esc(r.checkNo)}</td><td>${fmtD(r.datePaid)}</td><td>${esc(r.payee)}</td><td>${fmtD(r.courtOrderDate)}</td><td class="right">${fmtAnnual(r.amount)}</td></tr>`).join(''):'<tr><td colspan="7" style="text-align:center;color:var(--ink-3);font-style:italic">No entries</td></tr>'}
    <tr class="total-row"><td colspan="6">Schedule B-3 Total</td><td class="right">${fmtAnnual(t.schB3)}</td></tr>
    </tbody>
  </table>
  ${(()=>{const cats={};DISB_CATS.forEach(c=>cats[c]=0);d.schB4.forEach(r=>{if(r.category&&cats[r.category]!==undefined)cats[r.category]+=n(r.amount);});window._b4cats=cats;return'';})()}
  <div class="doc-schedule-title mt-3">SCHEDULE B-4: All Other Disbursements — Summary by Category</div>
  <table class="doc-table mb-2">
    <caption class="visually-hidden">Schedule B-4: All Other Disbursements — Summary by Category</caption>
    <thead><tr><th>#</th><th>Category</th><th class="right">Amount</th></tr></thead>
    <tbody>${DISB_CATS.map((c,i)=>`<tr><td>${i+1}</td><td>${c}</td><td class="right">${window._b4cats[c]>0?fmtAnnual(window._b4cats[c]):'—'}</td></tr>`).join('')}
    <tr class="total-row"><td colspan="2">All Other Disbursements Total</td><td class="right">${fmtAnnual(t.schB4)}</td></tr>
    </tbody>
  </table>
  </div>`;

  // ── Schedule B-4 Detail ───────────────────────────────
  if(d.schB4.length>0){
    html+=`<div class="schedule-page doc-page">${docHdr(W,CN,'Schedule B-4','2')}
    <div class="doc-schedule-title">SCHEDULE B-4: All Other Disbursements — Check Register</div>
    <table class="doc-table">
      <caption class="visually-hidden">Schedule B-4: All Other Disbursements — Check Register</caption>
      <thead><tr><th>#</th><th>Check #</th><th>Date Paid</th><th>Category</th><th>Payee</th><th class="right">Amount</th></tr></thead>
      <tbody>${d.schB4.map((r,i)=>`<tr><td>${i+1}</td><td>${esc(r.checkNo)}</td><td>${fmtD(r.datePaid)}</td><td>${esc(r.category)}</td><td>${esc(r.payee)}</td><td class="right">${fmtAnnual(r.amount)}</td></tr>`).join('')}
      <tr class="total-row"><td colspan="5">Schedule B-4 Total</td><td class="right">${fmtAnnual(t.schB4)}</td></tr>
      </tbody>
    </table>
    </div>`;
  }

  // ── Schedule C ────────────────────────────────────────
  html+=`<div class="schedule-page doc-page">${docHdr(W,CN,'Schedule C','1')}
  <div class="doc-schedule-title">SCHEDULE C: Capital Adjustments During Period</div>
  <table class="doc-table">
    <caption class="visually-hidden">Schedule C: Capital Adjustments During Period</caption>
    <thead><tr><th>#</th><th>Description</th><th>Date</th><th class="right">Gain / Addition</th><th class="right">Loss / Reduction</th></tr></thead>
    <tbody>${d.schC.length?d.schC.map((r,i)=>`<tr><td>${i+1}</td><td>${esc(r.description)}</td><td>${fmtD(r.date)}</td><td class="right">${r.gain?fmtAnnual(r.gain):'—'}</td><td class="right" style="color:${n(r.loss)<0?'var(--danger-text)':''}">${r.loss?fmtAnnual(r.loss):'—'}</td></tr>`).join(''):'<tr><td colspan="5" style="text-align:center;color:var(--ink-3);font-style:italic">No entries</td></tr>'}
    <tr class="total-row"><td colspan="3">Capital Adjustments Net (Gains + Losses)</td><td class="right">${fmtAnnual(t.schC_gains)}</td><td class="right" style="color:${t.schC_losses<0?'var(--danger-text)':''}">${fmtAnnual(t.schC_losses)}</td></tr>
    </tbody>
  </table>
  </div>`;

  // ── Schedule D-1 ──────────────────────────────────────
  html+=`<div class="schedule-page doc-page">${docHdr(W,CN,'Schedule D-1','1')}
  <div class="doc-schedule-title">SCHEDULE D-1: Cash Assets</div>
  <table class="doc-table">
    <caption class="visually-hidden">Schedule D-1: Cash Assets</caption>
    <thead><tr><th>#</th><th>Description</th><th>Account #</th><th>Restricted?</th><th>Type</th><th class="right">Full Amount</th><th class="right">Ward's %</th><th class="right">Ward's Amount</th></tr></thead>
    <tbody>${d.schD1.length?d.schD1.map((r,i)=>{const wa=n(r.fullAmount)*pct(r.wardPct);return`<tr><td>${i+1}</td><td>${esc(r.description)}</td><td>${esc(r.accountNo)}</td><td>${esc(r.restricted)}</td><td>${esc(r.type)}</td><td class="right">${fmtAnnual(r.fullAmount)}</td><td class="right">${r.wardPct}</td><td class="right">${fmtAnnual(wa)}</td></tr>`;}).join(''):'<tr><td colspan="8" style="text-align:center;color:var(--ink-3);font-style:italic">No entries</td></tr>'}
    <tr class="total-row"><td colspan="6">Cash Assets — Restricted Depository</td><td colspan="2" style="text-align:right">${fmtAnnual(t.schD1_restricted)}</td></tr>
    <tr class="total-row"><td colspan="6">Cash Assets Total (Ward's Amount)</td><td colspan="2" style="text-align:right">${fmtAnnual(t.schD1_total)}</td></tr>
    </tbody>
  </table>
  <div class="doc-schedule-title mt-3">SCHEDULE D-2: Real Estate and Real Property Assets</div>
  <table class="doc-table">
    <caption class="visually-hidden">Schedule D-2: Real Estate and Real Property Assets</caption>
    <thead><tr><th>#</th><th>Description / Address</th><th>Residence?</th><th>Income?</th><th class="right">Full Value</th><th class="right">Ward's %</th><th class="right">Carrying Value</th><th class="right">Ward's Value</th></tr></thead>
    <tbody>${d.schD2.length?d.schD2.map((r,i)=>{const wv=n(r.fullValue)*pct(r.wardPct);const cv=n(r.carryingValue)*pct(r.wardPct);return`<tr><td>${i+1}</td><td>${esc(r.description)}</td><td>${esc(r.residence)}</td><td>${esc(r.income)}</td><td class="right">${fmtAnnual(r.fullValue)}</td><td class="right">${r.wardPct}</td><td class="right">${fmtAnnual(cv)}</td><td class="right">${fmtAnnual(wv)}</td></tr>`;}).join(''):'<tr><td colspan="8" style="text-align:center;color:var(--ink-3);font-style:italic">No entries</td></tr>'}
    <tr class="total-row"><td colspan="6">Totals</td><td class="right">${fmtAnnual(t.schD2_carrying)}</td><td class="right">${fmtAnnual(t.schD2_ward)}</td></tr>
    </tbody>
  </table>
  <div class="doc-schedule-title mt-3">SCHEDULE D-3: Personal Property Assets</div>
  <table class="doc-table">
    <caption class="visually-hidden">Schedule D-3: Personal Property Assets</caption>
    <thead><tr><th>#</th><th>Description / Location</th><th class="right">Full Amount</th><th class="right">Ward's %</th><th class="right">Carrying Value</th><th class="right">Ward's Amount</th></tr></thead>
    <tbody>${d.schD3.length?d.schD3.map((r,i)=>{const wa=n(r.fullAmount)*pct(r.wardPct);const cv=n(r.carryingValue)*pct(r.wardPct);return`<tr><td>${i+1}</td><td>${esc(r.description)}</td><td class="right">${fmtAnnual(r.fullAmount)}</td><td class="right">${r.wardPct}</td><td class="right">${fmtAnnual(cv)}</td><td class="right">${fmtAnnual(wa)}</td></tr>`;}).join(''):'<tr><td colspan="6" style="text-align:center;color:var(--ink-3);font-style:italic">No entries</td></tr>'}
    <tr class="total-row"><td colspan="4">Totals</td><td class="right">${fmtAnnual(t.schD3_carrying)}</td><td class="right">${fmtAnnual(t.schD3_ward)}</td></tr>
    </tbody>
  </table>
  <div class="doc-schedule-title mt-3">SCHEDULE D-4: Intangible Assets</div>
  <table class="doc-table">
    <caption class="visually-hidden">Schedule D-4: Intangible Assets</caption>
    <thead><tr><th>#</th><th>Description</th><th>Restricted?</th><th class="right">Full Amount</th><th class="right">Ward's %</th><th class="right">Carrying Value</th><th class="right">Ward's Value</th><th class="right">Restricted Amt</th></tr></thead>
    <tbody>${d.schD4.length?d.schD4.map((r,i)=>{const wv=n(r.fullAmount)*pct(r.wardPct);const cv=n(r.carryingValue)*pct(r.wardPct);const ra=r.restricted==='Yes'?cv:0;return`<tr><td>${i+1}</td><td>${esc(r.description)}</td><td>${esc(r.restricted)}</td><td class="right">${fmtAnnual(r.fullAmount)}</td><td class="right">${r.wardPct}</td><td class="right">${fmtAnnual(cv)}</td><td class="right">${fmtAnnual(wv)}</td><td class="right">${ra>0?fmtAnnual(ra):'—'}</td></tr>`;}).join(''):'<tr><td colspan="8" style="text-align:center;color:var(--ink-3);font-style:italic">No entries</td></tr>'}
    <tr class="total-row"><td colspan="5">Totals</td><td class="right">${fmtAnnual(t.schD4_carrying)}</td><td class="right">${fmtAnnual(t.schD4_ward)}</td><td class="right">${fmtAnnual(t.schD4_restricted)}</td></tr>
    </tbody>
  </table>
  <div class="doc-schedule-title mt-3">SCHEDULE D-5: Mortgages / Loans / Notes / Other Liabilities</div>
  <table class="doc-table">
    <caption class="visually-hidden">Schedule D-5: Mortgages / Loans / Notes / Other Liabilities</caption>
    <thead><tr><th>#</th><th>Description / Lender</th><th>Loan/Acct #</th><th>Type</th><th class="right">Full Debt</th><th class="right">Ward's %</th><th class="right">Ward's Balance</th></tr></thead>
    <tbody>${d.schD5.length?d.schD5.map((r,i)=>{const wb=n(r.fullDebt)*pct(r.wardPct);return`<tr><td>${i+1}</td><td>${esc(r.description)}</td><td>${esc(r.loanNo)}</td><td>${esc(r.loanType)}</td><td class="right">${fmtAnnual(r.fullDebt)}</td><td class="right">${r.wardPct}</td><td class="right">${fmtAnnual(wb)}</td></tr>`;}).join(''):'<tr><td colspan="7" style="text-align:center;color:var(--ink-3);font-style:italic">No entries</td></tr>'}
    <tr class="total-row"><td colspan="6">Schedule D-5 Total — Ward's Balance Due</td><td class="right">${fmtAnnual(t.schD5_total)}</td></tr>
    </tbody>
  </table>
  </div>`;

  // ── Schedule E ────────────────────────────────────────
  if(d.schE.length>0){
    html+=`<div class="schedule-page doc-page">${docHdr(W,CN,'Schedule E','1')}
    <div class="doc-schedule-title">SCHEDULE E: Bank Transfers During Period</div>
    <table class="doc-table">
      <caption class="visually-hidden">Schedule E: Bank Transfers During Period</caption>
      <thead><tr><th>#</th><th>Bank Name / Account #</th><th>Transfer In Date</th><th class="right">Transfer In Amt</th><th>Transfer Out Date</th><th class="right">Transfer Out Amt</th></tr></thead>
      <tbody>${d.schE.map((r,i)=>`<tr><td>${i+1}</td><td>${esc(r.bankName)}</td><td>${fmtD(r.transferInDate)}</td><td class="right">${r.transferInAmt?fmtAnnual(r.transferInAmt):'—'}</td><td>${fmtD(r.transferOutDate)}</td><td class="right">${r.transferOutAmt?fmtAnnual(r.transferOutAmt):'—'}</td></tr>`).join('')}
      </tbody>
    </table>
    </div>`;
  }

  // ── Schedule F-1 ──────────────────────────────────────
  if(d.schF1.length>0){
    html+=`<div class="schedule-page doc-page">${docHdr(W,CN,'Schedule F-1','1')}
    <div class="doc-schedule-title">SCHEDULE F-1: Sales of Real Property During Period</div>
    <table class="doc-table">
      <caption class="visually-hidden">Schedule F-1: Sales of Real Property During Period</caption>
      <thead><tr><th>#</th><th>Description</th><th>Bank</th><th>Account #</th><th>Court Order Date</th><th class="right">Sale Price</th></tr></thead>
      <tbody>${d.schF1.map((r,i)=>`<tr><td>${i+1}</td><td>${esc(r.description)}</td><td>${esc(r.bank)}</td><td>${esc(r.accountNo)}</td><td>${fmtD(r.courtOrderDate)}</td><td class="right">${fmtAnnual(r.salePrice)}</td></tr>`).join('')}
      <tr class="total-row"><td colspan="5">Schedule F-1 Total</td><td class="right">${fmtAnnual(d.schF1.reduce((s,r)=>s+n(r.salePrice),0))}</td></tr>
      </tbody>
    </table>
    </div>`;
  }

  // ── Schedule F-2 ──────────────────────────────────────
  if(d.schF2.length>0){
    html+=`<div class="schedule-page doc-page">${docHdr(W,CN,'Schedule F-2','1')}
    <div class="doc-schedule-title">SCHEDULE F-2: Sales of Personal Property During Period</div>
    <table class="doc-table">
      <caption class="visually-hidden">Schedule F-2: Sales of Personal Property During Period</caption>
      <thead><tr><th>#</th><th>Description</th><th>Bank</th><th>Account #</th><th>Court Order Date</th><th class="right">Sale Price</th></tr></thead>
      <tbody>${d.schF2.map((r,i)=>`<tr><td>${i+1}</td><td>${esc(r.description)}</td><td>${esc(r.bank)}</td><td>${esc(r.accountNo)}</td><td>${fmtD(r.courtOrderDate)}</td><td class="right">${fmtAnnual(r.salePrice)}</td></tr>`).join('')}
      <tr class="total-row"><td colspan="5">Schedule F-2 Total</td><td class="right">${fmtAnnual(d.schF2.reduce((s,r)=>s+n(r.salePrice),0))}</td></tr>
      </tbody>
    </table>
    </div>`;
  }

  // ── Parts VIII, IX ────────────────────────────────────
  html+=`<div class="schedule-page doc-page">${docHdr(W,CN,'Part VIII','5')}
  <div class="doc-schedule-title">Part VIII — TRUST INFORMATION</div>
  <div class="doc-table-div mb-2">
    ${sl('#1. Does the Ward have one or more Trusts?',d.trusts[0]&&d.trusts[0].hasTrust||'No')}
  </div>
  ${d.trusts.filter(t=>t.name).map((t,i)=>`
  <div class="doc-schedule-title" style="font-size:.76rem">Trust ${i+1}</div>
  <div class="doc-table-div mb-2">
    ${sl('#2. Created after GID?',esc(t.createdAfterGID))} ${sl('Name of Trust',esc(t.name))} ${sl('Trustee',esc(t.trustee))}
    ${sl('Account Number',esc(t.accountNo))} ${sl('Date Created',fmtD(t.dateCreated))} ${sl('Type',esc(t.trustType))}
    ${sl("Ward's % Interest",esc(t.wardPct))} ${sl("Amount (Ward's Interest)",fmtAnnual(t.wardAmount))}
  </div>`).join('')}
  <div class="doc-schedule-title mt-2">Part IX — OTHER INFORMATION &amp; BOND CALCULATION</div>
  <div class="doc-table-div mb-1">
    ${sl("Guardian's Relationship to Ward",d.guardianRelationship)}
    ${sl('Date of Most Recent Restricted Depository Receipt',fmtD(d.restrictedDepositoryReceiptDate))}
  </div>
  <div class="doc-schedule-title" style="font-size:.76rem">Bond Calculation</div>
  <div class="doc-table-div mb-1">
    ${slR('Sch D-1 — Cash Assets in RESTRICTED Depository',fmtAnnual(t.schD1_restricted))}
    ${slR('Sch D-4 — Intangible Assets RESTRICTED',fmtAnnual(t.schD4_restricted))}
    ${slR('Sch D-1 — Cash Assets NOT in Restricted Depository',fmtAnnual(t.schD1_total-t.schD1_restricted))}
    ${slR('Sch D-3 — Personal Property Assets',fmtAnnual(t.schD3_ward))}
    ${slR('Sch D-4 — Intangible Assets (Unrestricted)',fmtAnnual(t.schD4_ward-t.schD4_restricted))}
    <div class="tr total-row"><div class="td">Total for BOND REQUIREMENT</div><div class="td right">${fmtAnnual(t.bondReq)}</div></div>
  </div>
  <div class="doc-table-div">
    ${sl('Bond Amount',fmtAnnual(d.bondAmount))}
    ${sl('Bond Period',`From: ${fmtD(d.bondPeriodFrom)} &nbsp;&nbsp; To: ${fmtD(d.bondPeriodTo)}`)}
    ${sl('Name of Bonding Company',d.bondingCompany)}
  </div>
  </div>`;

  // ── Part X — Certificate of Service ───────────────────
  html+=`<div class="schedule-page doc-page">${docHdr(W,CN,'Part X','6')}
  <div class="doc-schedule-title">Part X — GUARDIAN ATTORNEY CERTIFICATE OF SERVICE</div>
  <p style="font-size:.75rem;margin-bottom:.5rem">Pursuant to Florida Statute 744.367(4), I hereby certify that a copy of this accounting has been furnished to:</p>
  <div class="row mb-3">
    ${d.certRecipients.slice(0,2).map((r,i)=>`<div class="col-6 mb-2"><div class="doc-field-label">Recipient ${i+1}</div><div class="doc-signature-line">${esc(r.name)}</div><div class="doc-signature-line">${esc(r.line2)}</div><div class="doc-signature-line">${esc(r.line3)}</div><div class="doc-signature-line">${esc(r.line4)}</div></div>`).join('')}
  </div>
  <div class="row mb-3">
    ${d.certRecipients.slice(2,4).map((r,i)=>`<div class="col-6 mb-2"><div class="doc-field-label">Recipient ${i+3}</div><div class="doc-signature-line">${esc(r.name)}</div><div class="doc-signature-line">${esc(r.line2)}</div><div class="doc-signature-line">${esc(r.line3)}</div><div class="doc-signature-line">${esc(r.line4)}</div></div>`).join('')}
  </div>
  <p style="font-size:.78rem;">on this date: ${fmtD(d.certDate)}${d.certIndicator?` &nbsp;|&nbsp; ${esc(d.certIndicator)}`:''}</p>
  <div class="doc-signature-block">
    <div class="row">
      <div class="col-6"><div class="doc-field-label">Attorney Signature &nbsp;/s/</div><div class="doc-signature-line"></div></div>
      <div class="col-3"><div class="doc-field-label">Date</div><div class="doc-signature-line">${fmtD(d.certAttySignDate)}</div></div>
      <div class="col-3"><div class="doc-field-label">Attorney's Name</div><div class="doc-signature-line">${esc(d.attorney)}</div></div>
    </div>
    <div class="row mt-2">
      <div class="col-4"><div class="doc-field-label">Bar Number</div><div class="doc-signature-line">${esc(d.attorney_bar)}</div></div>
      <div class="col-4"><div class="doc-field-label">Phone</div><div class="doc-signature-line">${esc(d.attorney_phone)}</div></div>
      <div class="col-4"><div class="doc-field-label">Street Address</div><div class="doc-signature-line">${esc(d.attorney_street)}</div></div>
    </div>
    <div class="row mt-2">
      <div class="col-6"><div class="doc-field-label">City / State / Zip</div><div class="doc-signature-line">${esc(d.attorney_cityStateZip)}</div></div>
    </div>
    <p class="mt-3" style="font-size:.76rem;text-align:center;font-weight:700;">(End of Annual Accounting)</p>
  </div>
  </div>`;

  // ── Part XI — Remuneration ────────────────────────────
  if(d.remuneration.some(r=>r.amount||r.guardian)){
    html+=`<div class="doc-page">${docHdr(W,CN,"Summary (Cont'd)",'7')}
    <div class="doc-schedule-title">Part XI — GUARDIAN(S) DECLARATION OF REMUNERATION</div>
    <p style="font-size:.75rem;margin-bottom:.4rem">Per 744.367(3)(a), the annual guardianship report must include a declaration of all remuneration received by the guardian from any source for services rendered to or on behalf of the ward.</p>
    <table class="doc-table">
      <caption class="visually-hidden">Part XI — Guardian(s) Declaration of Remuneration</caption>
      <thead><tr><th>#</th><th>Guardian Name</th><th>Type</th><th>Description</th><th class="right">Amount</th></tr></thead>
      <tbody>${d.remuneration.filter(r=>r.amount||r.guardian).map((r,i)=>`<tr><td>${i+1}</td><td>${esc(r.guardian)}</td><td>${esc(r.type)}</td><td>${esc(r.description)}</td><td class="right">${fmtAnnual(r.amount)}</td></tr>`).join('')}
      </tbody>
    </table>
    </div>`;
  }

  return html;
}
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
    </div>
    ${errors.length?validationPanel(errors):''}
    ${capOver.length?excelCapacityPanel(capOver):''}
    <div id="print-doc-container">${buildPrintHTMLAnnual()}</div>
  </div>`;
}
export async function doSavePdf(){
  const errors=validateAnnual();
  if(errors.length){renderPage('/print');alert(`Cannot export — ${errors.length} required field${errors.length===1?'':'s'} missing. See the list on this page.`);return;}
  pvShowAll(); // never export a filtered preview
  document.body.classList.add('pdf-export-mode');
  const container=document.getElementById('print-doc-container');
  const ward=(window.D.wardName||'Accounting').replace(/[^a-z0-9]/gi,'_');
  const formSlug=formDisplayName(window.D.inventoryType).replace(/[^a-z0-9]/gi,'');
  const ungroup=groupScheduleBlocksForPdf(container);
  try{
    await html2pdf().set({
      margin:0, filename:`${ward}_${formSlug}.pdf`,
      image:{type:'jpeg',quality:0.98},
      html2canvas:{scale:2,useCORS:true,logging:false},
      jsPDF:{unit:'in',format:'letter',orientation:'portrait'},
      // Not 'avoid-all': that makes every element a break candidate, table
      // internals included, which is what wrecked the Schedule B-4 header.
      // The elements that may carry a break are the ones the .pdf-export-mode
      // stylesheet marks page-break-inside:avoid, all of them block-level.
      pagebreak:{mode:['css','legacy'],before:'.schedule-page:not(:first-of-type)'}
    }).from(container).save();
  }catch(e){
    console.error('PDF export failed',e);
    alert('PDF export failed: '+e.message);
  }finally{ungroup();document.body.classList.remove('pdf-export-mode');}
}
