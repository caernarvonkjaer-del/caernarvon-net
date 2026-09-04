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
import { mountPdfPreview, printGeneratedPdf } from '../../core/pdf/pdf-preview.js';

// Milestone 19-3: preview and Save-as-PDF must build the model with the
// identical options, so they can never diverge again (this is also what
// fixes the pre-19-3 signature-style-radio/preview mismatch).
function buildModelForPreview(D){
  return buildVerifiedInventoryModel(D, {
    signatureStyle: D.signatureStyle || 'typed',
    printDate: new Date().toISOString().slice(0, 10),
  });
}

const {
  esc, fmt, fmtDate, circuitCourtCaption, calc, td, tdR,
  highlightErrors, validationPanel, excelCapacityPanel,
  renderPage,
} = window;

function docHeader(ward,caseNo,schedule,page){
  return `<div class="doc-header">
    <div class="court-title">${circuitCourtCaption(window.D.county)}</div>
    <div class="doc-title">VERIFIED INITIAL INVENTORY</div>
    <div class="doc-meta">
      <span>Name of Ward: <strong>${ward}</strong></span>
      <span>${schedule} — Page ${page}</span>
      <span>Case Number: <strong>${caseNo}</strong></span>
    </div>
  </div>`;
}
function th(...cols){return `<tr>${cols.map(c=>`<th>${c}</th>`).join('')}</tr>`;}
function totRow(label,val,span){return `<tr class="total-row"><td colspan="${span}">${label}</td><td class="right">${fmt(val)}</td></tr>`;}
// Print-time counterpart to the Cover-page checkbox verifying a schedule
// has no items (see scheduleEmptyHTML()) -- an empty schedule the filer
// has confirmed prints a plain-language verification statement instead of
// the bare "No entries" placeholder, so the filed document itself reflects
// that the blank schedule was reviewed, not just skipped.
function printEmptyRow(key,colspan,noun){
  const confirmed=window.D.scheduleNoItems&&window.D.scheduleNoItems[key];
  const text=confirmed?`The filer verifies there are no ${noun} to report for this schedule.`:'No entries';
  return `<tr class="doc-empty-row"><td colspan="${colspan}">${text}</td></tr>`;
}

function formatSig(name){
  const n=(name||'').trim();
  if(!n)return '';
  return n.startsWith('/s/')||n.startsWith('s/')||n.startsWith('/s')?n:`/s/ ${n}`;
}

function buildPrintHTML(){
  const d=window.D;
  const ward=esc(d.wardName);
  const caseNo=esc(d.caseNumber);
  const county=esc(d.county);
  const sigStyle=d.signatureStyle||'typed';
  const sigClass=sigStyle==='script'?'script-signature':'typed-signature';
  const c=calc;
  let html='';

  // SECTION 1: Summary I & II
  html+=`<div class="schedule-page doc-page">${docHeader(ward,caseNo,'Summary','1')}
  <div class="doc-schedule-title">Part I — REQUIRED INFORMATION</div>
  <div class="doc-table-div mb-2" style="font-size:.76rem;">
    ${td('Name of Ward',`<strong>${ward}</strong>`)}
    ${td('Case Number',`<strong>${caseNo}</strong>`)}
    ${td('Guardianship Inception Date (GID)',fmtDate(d.gid))}
    ${td('County',county)}
    ${td('Guardian',esc(d.guardianName))}
    ${td('Attorney for Guardian',esc(d.attorneyForGuardian))}
    ${td('Type of Guardianship',esc(d.typeOfGuardianship))}
    ${td('Safe Deposit Box?',d.hasSafeDepositBox===true?'Yes — Inventory Filed: '+(d.safeDepositBoxFiled===true?'Yes':d.safeDepositBoxFiled===false?'No':'Not Stated'):d.hasSafeDepositBox===false?'No':'Not Answered')}
    ${td('Amended Form?',d.isAmended?'Yes':'No')}
  </div>
  ${(d.witnesses||[]).length?`<div class="doc-schedule-title">Inventory Witnesses</div>
  <table class="doc-table">
    <caption class="visually-hidden">Inventory Witnesses</caption>
    <thead>${th('#','Name','Address','Occupation')}</thead>
    <tbody>${d.witnesses.map((w,i)=>`<tr><td>${i+1}</td><td>${esc(w.name)}</td><td>${esc(w.address)}</td><td>${esc(w.occupation)}</td></tr>`).join('')}</tbody>
  </table>`:''}
  <div class="doc-schedule-title mt-2">Part II — SUMMARY I</div>
  <div class="doc-schedule-title">SCHEDULE A: Real Estate Assets / Liabilities</div>
  <div class="doc-table-div mb-2">
    ${tdR('Schedule A-1 — Real Estate / Real Property',fmt(c.totalA1()))}
    ${tdR('Schedule A-2 — Real Estate Liabilities','('+fmt(c.totalA2())+')')}
    <div class="tr total-row"><div class="td">Real Estate Assets, Net of Liabilities</div><div class="td right">${fmt(c.netA())}</div></div>
  </div>
  <div class="doc-schedule-title">SCHEDULE B: Cash / Personal Property / Intangible Assets / Liabilities</div>
  <div class="doc-table-div mb-2">
    ${tdR('Schedule B-1 — Cash Assets / Cash Equivalent Assets',fmt(c.totalB1()))}
    ${tdR('Schedule B-2 — Personal Property Assets',fmt(c.totalB2()))}
    ${tdR('Schedule B-3 — Intangible Assets',fmt(c.totalB3()))}
    ${tdR('Schedule B-4 — Liabilities / Secured and Unsecured<br>Debt / Notes / Loans','('+fmt(c.totalB4())+')')}
    <div class="tr total-row"><div class="td">Cash / Personal Property / Intangible Assets, Net of Liabilities</div><div class="td right">${fmt(c.netB())}</div></div>
  </div>
  <div class="doc-table-div">
    <div class="tr total-row"><div class="td"><strong>VERIFIED INITIAL INVENTORY OF GUARDIAN</strong></div><div class="td right"><strong>${fmt(c.total())}</strong></div></div>
  </div>
  </div>`;

  // Page 2 – Summary II
  html+=`<div class="schedule-page doc-page">${docHeader(ward,caseNo,'Summary (Cont\'d)','2')}
  <div class="doc-schedule-title">SUMMARY II — SCHEDULE C: Other Financial Information</div>
  <div class="doc-table-div mb-3">
    ${tdR('Schedule C-1 — Income (Annualized)',fmt(c.totalC1()))}
    ${tdR('Schedule C-2 — Lawsuits Pending Against the Ward',fmt(c.totalC2()))}
    ${tdR('Schedule C-3 — Lawsuits Pending by the Ward',fmt(c.totalC3()))}
    ${tdR('Schedule C-4 — Value of Trusts for the Ward',fmt(c.totalC4()))}
    ${tdR("Schedule C-5 — Joint Owners of Ward's Assets",fmt(c.totalC5()))}
  </div>
  </div>`;

  // SECTION 2: Schedules A (A-1 and A-2 together)
  html+=`<div class="schedule-page doc-page">${docHeader(ward,caseNo,'Schedule A-1','1')}
  <div class="doc-schedule-title">SCHEDULE A-1: Real Estate / Real Property</div>
  <table class="doc-table">
    <caption class="visually-hidden">Schedule A-1: Real Estate / Real Property</caption>
    <thead>${th('#','Description / Address / Notes','Residence?','Income?','Full Value','Ward %',"Ward's Value")}</thead>
    <tbody>
    ${d.scheduleA1.length?d.scheduleA1.map((e,i)=>`<tr><td>${i+1}</td><td>${esc(e.propertyDescription)}<br><small>${esc(e.streetAddress)} ${esc(e.cityStateZip)}</small>${e.notes?`<br><small><em>${esc(e.notes)}</em></small>`:''}</td><td>${e.isPersonalResidence?'Yes':'No'}</td><td>${e.isIncomeProperty?'Yes':'No'}</td><td class="right">${fmt(e.fullAssetValue)}</td><td class="right">${e.wardPercent}%</td><td class="right">${fmt(calc.wardVal(e))}</td></tr>`).join(''):printEmptyRow('a1',7,'real estate assets')}
    ${totRow("Schedule A-1 Total",c.totalA1(),6)}
    </tbody>
  </table>
  <div class="doc-schedule-title mt-3">SCHEDULE A-2: Real Estate Liabilities (Mortgages / Notes / Loans)</div>
  <table class="doc-table">
    <caption class="visually-hidden">Schedule A-2: Real Estate Liabilities (Mortgages / Notes / Loans)</caption>
    <thead>${th('#','Lender / Description / Account','Type','Full Balance','Ward %',"Ward's Balance")}</thead>
    <tbody>
    ${d.scheduleA2.length?d.scheduleA2.map((e,i)=>`<tr><td>${i+1}</td><td>${esc(e.lenderName)}<br><small>${esc(e.lenderAddress)} ${esc(e.lenderCityStateZip)}</small>${e.accountNumber?`<br><small>Acct: ${esc(e.accountNumber)}</small>`:''}</td><td>${esc(e.liabilityType)}</td><td class="right">${fmt(e.fullDebtBalance)}</td><td class="right">${e.wardPercent}%</td><td class="right">${fmt(calc.wardDebt(e))}</td></tr>`).join(''):printEmptyRow('a2',6,'real estate liabilities')}
    ${totRow("Schedule A-2 Total",c.totalA2(),5)}
    </tbody>
  </table>`;

  // SECTION 3: Schedules B (B-1, B-2, B-3, B-4 together)
  html+=`</div><div class="schedule-page doc-page">${docHeader(ward,caseNo,'Schedule B-1','1')}
  <div class="doc-schedule-title">SCHEDULE B-1: Cash Assets / Cash Equivalent Assets</div>
  <table class="doc-table">
    <caption class="visually-hidden">Schedule B-1: Cash Assets / Cash Equivalent Assets</caption>
    <thead>${th('#','Institution / Account / Address','Type','Restricted?','Full Amount','Ward %',"Ward's Amount","Restricted Amt")}</thead>
    <tbody>
    ${d.scheduleB1.length?d.scheduleB1.map((e,i)=>`<tr><td>${i+1}</td><td>${esc(e.institutionName)}${e.accountNumber?`<br><small>Acct: ${esc(e.accountNumber)}</small>`:''}<br><small>${esc(e.streetAddress)} ${esc(e.cityStateZip)}</small></td><td>${esc(e.accountType)}</td><td>${e.isRestricted?'Yes':'No'}</td><td class="right">${fmt(e.fullAssetAmount)}</td><td class="right">${e.wardPercent}%</td><td class="right">${fmt(calc.wardAmt(e))}</td><td class="right">${e.isRestricted?fmt(calc.wardAmt(e)):'—'}</td></tr>`).join(''):printEmptyRow('b1',8,'cash assets')}
    <tr class="total-row"><td colspan="6">Schedule B-1 Total</td><td class="right">${fmt(c.totalB1())}</td><td class="right">${fmt(c.restrictedCash())}</td></tr>
    </tbody>
  </table>
  <div class="doc-schedule-title mt-3">SCHEDULE B-2: Personal Property Assets</div>
  <table class="doc-table">
    <caption class="visually-hidden">Schedule B-2: Personal Property Assets</caption>
    <thead>${th('#','Description / Location / Valuation','Full Value','Ward %',"Ward's Value",'In SDB?','SDB Amt')}</thead>
    <tbody>
    ${d.scheduleB2.length?d.scheduleB2.map((e,i)=>`<tr><td>${i+1}</td><td>${esc(e.description)}<br><small>${esc(e.streetAddress)} ${esc(e.cityStateZip)}</small>${e.valuationMethod?`<br><small><em>${esc(e.valuationMethod)}</em></small>`:''}</td><td class="right">${fmt(e.fullAssetValue)}</td><td class="right">${e.wardPercent}%</td><td class="right">${fmt(calc.wardB2(e))}</td><td>${e.inSafeDepositBox?'Yes':'No'}</td><td class="right">${e.inSafeDepositBox?fmt(e.amountInSDB):'—'}</td></tr>`).join(''):printEmptyRow('b2',7,'personal property assets')}
    <tr class="total-row"><td colspan="4">Schedule B-2 Total</td><td class="right">${fmt(c.totalB2())}</td><td colspan="2"></td></tr>
    </tbody>
  </table>
  <div class="doc-schedule-title mt-3">SCHEDULE B-3: Intangible Assets</div>
  <table class="doc-table">
    <caption class="visually-hidden">Schedule B-3: Intangible Assets</caption>
    <thead>${th('#','Description / Location','Restricted?','Full Value','Ward %',"Ward's Value","Restricted Amt",'In SDB?')}</thead>
    <tbody>
    ${d.scheduleB3.length?d.scheduleB3.map((e,i)=>`<tr><td>${i+1}</td><td>${esc(e.description)}<br><small>${esc(e.streetAddress)} ${esc(e.cityStateZip)}</small></td><td>${e.isRestricted?'Yes':'No'}</td><td class="right">${fmt(e.fullAssetValue)}</td><td class="right">${e.wardPercent}%</td><td class="right">${fmt(calc.wardB3(e))}</td><td class="right">${e.isRestricted?fmt(calc.wardB3(e)):'—'}</td><td>${e.inSafeDepositBox?'Yes':'No'}</td></tr>`).join(''):printEmptyRow('b3',8,'intangible assets')}
    <tr class="total-row"><td colspan="5">Schedule B-3 Total</td><td class="right">${fmt(c.totalB3())}</td><td class="right">${fmt(c.restrictedIntang())}</td><td></td></tr>
    </tbody>
  </table>
  <div class="doc-schedule-title mt-3">SCHEDULE B-4: Liabilities / Secured and Unsecured Debts / Notes / Loans</div>
  <table class="doc-table">
    <caption class="visually-hidden">Schedule B-4: Liabilities / Secured and Unsecured Debts / Notes / Loans</caption>
    <thead>${th('#','Creditor / Related Property / Account','Type','Full Balance','Ward %',"Ward's Balance")}</thead>
    <tbody>
    ${d.scheduleB4.length?d.scheduleB4.map((e,i)=>`<tr><td>${i+1}</td><td>${esc(e.lenderName)}${e.relatedProperty?`<br><small>Re: ${esc(e.relatedProperty)}</small>`:''} ${e.accountNumber?`<br><small>Acct: ${esc(e.accountNumber)}</small>`:''}${e.lenderAddress?`<br><small>${esc(e.lenderAddress)}</small>`:''}</td><td>${esc(e.liabilityType)}</td><td class="right">${fmt(e.fullLiabilityBalance)}</td><td class="right">${e.wardPercent}%</td><td class="right">${fmt(calc.wardB4(e))}</td></tr>`).join(''):printEmptyRow('b4',6,'personal property liabilities')}
    ${totRow("Schedule B-4 Total",c.totalB4(),5)}
    </tbody>
  </table>
  </div>`;

  // SECTION 4: Schedules C (C-1, C-2, C-3, C-4, C-5 together)
  html+=`<div class="schedule-page doc-page">${docHeader(ward,caseNo,'Schedule C-1','1')}
  <div class="doc-schedule-title">SCHEDULE C-1: Income (Annualized)</div>
  <table class="doc-table">
    <caption class="visually-hidden">Schedule C-1: Income (Annualized)</caption>
    <thead>${th('#','Payer / Address','Type','Frequency','Basis','Annual Amount','Ward %',"Ward's Income")}</thead>
    <tbody>
    ${d.scheduleC1.length?d.scheduleC1.map((e,i)=>`<tr><td>${i+1}</td><td>${esc(e.payerName)}<br><small>${esc(e.payerAddress)} ${esc(e.payerCityStateZip)}</small></td><td>${esc(e.typeOfIncome)}</td><td>${esc(e.frequencyOfPayment)}</td><td>${esc(e.paymentBasis)}</td><td class="right">${fmt(e.annualIncomeAmount)}</td><td class="right">${e.wardPercent}%</td><td class="right">${fmt(calc.wardC1(e))}</td></tr>`).join(''):printEmptyRow('c1',8,'income sources')}
    ${totRow("Schedule C-1 Total (Annualized)",c.totalC1(),7)}
    </tbody>
  </table>
  <div class="doc-schedule-title mt-3">SCHEDULE C-2: Lawsuits Pending Against the Ward</div>
  <table class="doc-table">
    <caption class="visually-hidden">Schedule C-2: Lawsuits Pending Against the Ward</caption>
    <thead>${th('#','Claimant / Court / Case #','Date Filed','Claim Amount','Ward %',"Ward's Share")}</thead>
    <tbody>
    ${d.scheduleC2.length?d.scheduleC2.map((e,i)=>`<tr><td>${i+1}</td><td>${esc(e.claimantName)} — ${esc(e.lawsuitDescription)}<br><small>${esc(e.courtJurisdiction)}</small>${e.caseNumber?`<br><small>Case #: ${esc(e.caseNumber)}</small>`:''}${e.claimantAddress?`<br><small>${esc(e.claimantAddress)}</small>`:''}</td><td>${fmtDate(e.dateFiled)}</td><td class="right">${fmt(e.amountOfClaim)}</td><td class="right">${e.wardPercent}%</td><td class="right">${fmt(calc.wardC2(e))}</td></tr>`).join(''):printEmptyRow('c2',6,'lawsuits pending against the ward')}
    ${totRow("Schedule C-2 Total",c.totalC2(),5)}
    </tbody>
  </table>
  <div class="doc-schedule-title mt-3">SCHEDULE C-3: Lawsuits Pending by the Ward</div>
  <table class="doc-table">
    <caption class="visually-hidden">Schedule C-3: Lawsuits Pending by the Ward</caption>
    <thead>${th('#','Defendant / Description / Status','Action Date','Est. Settlement','Ward %',"Ward's Share")}</thead>
    <tbody>
    ${d.scheduleC3.length?d.scheduleC3.map((e,i)=>`<tr><td>${i+1}</td><td>${esc(e.defendantName)} — ${esc(e.actionDescription)}<br><small>${esc(e.status)}</small><br><small>${esc(e.courtJurisdiction)}${e.caseNumber?' | Case #: '+esc(e.caseNumber):''}</small></td><td>${fmtDate(e.actionDate)}</td><td class="right">${fmt(e.estimatedSettlement)}</td><td class="right">${e.wardPercent}%</td><td class="right">${fmt(calc.wardC3(e))}</td></tr>`).join(''):printEmptyRow('c3',6,'lawsuits pending by the ward')}
    ${totRow("Schedule C-3 Total",c.totalC3(),5)}
    </tbody>
  </table>
  <div class="doc-schedule-title mt-3">SCHEDULE C-4: Value of Trusts for the Ward</div>
  <table class="doc-table">
    <caption class="visually-hidden">Schedule C-4: Value of Trusts for the Ward</caption>
    <thead>${th('#','Trust Name / Trustee / Address','Type','Date Created','Acct #','Trust Amount','Ward %',"Ward's Share")}</thead>
    <tbody>
    ${d.scheduleC4.length?d.scheduleC4.map((e,i)=>`<tr><td>${i+1}</td><td>${esc(e.trustName)}<br><small>${esc(e.trusteeName)}</small><br><small>${esc(e.trusteeAddress)} ${esc(e.trusteeCityStateZip)}</small></td><td>${esc(e.trustType)}</td><td>${fmtDate(e.dateCreated)}</td><td>${esc(e.accountNumber)}</td><td class="right">${fmt(e.trustAmount)}</td><td class="right">${e.wardPercent}%</td><td class="right">${fmt(calc.wardC4(e))}</td></tr>`).join(''):printEmptyRow('c4',8,'trusts')}
    ${totRow("Schedule C-4 Total",c.totalC4(),7)}
    </tbody>
  </table>
  <div class="doc-schedule-title mt-3">SCHEDULE C-5: Joint Owners of Ward's Assets</div>
  <table class="doc-table">
    <caption class="visually-hidden">Schedule C-5: Joint Owners of Ward's Assets</caption>
    <thead>${th('#','Asset / Owner / Address','Relationship','Total Asset Value',"Owner %","Owner's Value")}</thead>
    <tbody>
    ${d.scheduleC5.length?d.scheduleC5.map((e,i)=>`<tr><td>${i+1}</td><td>${esc(e.assetDescription)}<br><small>${esc(e.ownerName)}</small><br><small>${esc(e.ownerAddress)} ${esc(e.ownerCityStateZip)}</small></td><td>${esc(e.relationshipToWard)}</td><td class="right">${fmt(e.totalAssetValue)}</td><td class="right">${e.jointOwnerPercent}%</td><td class="right">${fmt(calc.wardC5(e))}</td></tr>`).join(''):printEmptyRow('c5',6,'joint ownership entries')}
    ${totRow("Schedule C-5 Total",c.totalC5(),5)}
    </tbody>
  </table>
  </div>`;

  // SECTION 5: Part III & IV – Guardian Attestation + Preparer & Attorney (combined so the
  // page isn't left mostly blank when there's only one short guardian block)
  const pr=d.preparer, at=d.attorney;
  html+=`<div class="schedule-page doc-page">${docHeader(ward,caseNo,'Part III &amp; IV','3')}
  <div class="doc-schedule-title">Part III — GUARDIAN(S) ATTESTATION(S)</div>
  <div class="attestation-text">UNDER PENALTIES OF PERJURY, I declare that I have read the foregoing, and the facts alleged are true, to the best of my knowledge and belief.</div>
  ${d.guardians.map((g,i)=>`
  <div class="doc-signature-block mb-3">
    <div class="doc-field-label">Guardian #${i+1} Oath</div>
    <div class="row"><div class="col-6"><div class="doc-field-label">Signature &nbsp;/s/</div><div class="doc-signature-line ${sigClass}">${formatSig(g.name)}</div></div><div class="col-3"><div class="doc-field-label">Date</div><div class="doc-signature-line">${fmtDate(g.signatureDate)}</div></div><div class="col-3"><div class="doc-field-label">Guardian's Name</div><div class="doc-signature-line">${esc(g.name)}</div></div></div>
    <div class="row mt-2"><div class="col-4"><div class="doc-field-label">SSN / EIN</div><div class="doc-signature-line">${esc(g.ssnEin)}</div></div><div class="col-4"><div class="doc-field-label">Phone</div><div class="doc-signature-line">${esc(g.phone)}</div></div><div class="col-4"><div class="doc-field-label">Street Address</div><div class="doc-signature-line">${esc(g.streetAddress)}</div></div></div>
    <div class="row mt-2"><div class="col-6"><div class="doc-field-label">City / State / Zip</div><div class="doc-signature-line">${esc(g.cityStateZip)}</div></div></div>
  </div>`).join('')}
  <div class="doc-signature-block mb-3">
    <div class="doc-field-label">Preparer's Oath (if different from guardian)</div>
    <div class="row"><div class="col-6"><div class="doc-field-label">Preparer's Signature &nbsp;/s/</div><div class="doc-signature-line ${sigClass}">${formatSig(pr.name)}</div></div><div class="col-3"><div class="doc-field-label">Date</div><div class="doc-signature-line">${fmtDate(pr.signatureDate)}</div></div><div class="col-3"><div class="doc-field-label">Preparer's Name</div><div class="doc-signature-line">${esc(pr.name)}</div></div></div>
    <div class="row mt-2"><div class="col-4"><div class="doc-field-label">SSN / EIN</div><div class="doc-signature-line">${esc(pr.ssnEin)}</div></div><div class="col-4"><div class="doc-field-label">Phone</div><div class="doc-signature-line">${esc(pr.phone)}</div></div><div class="col-4"><div class="doc-field-label">Street Address</div><div class="doc-signature-line">${esc(pr.streetAddress)}</div></div></div>
    <div class="row mt-2"><div class="col-6"><div class="doc-field-label">City / State / Zip</div><div class="doc-signature-line">${esc(pr.cityStateZip)}</div></div></div>
  </div>
  <div class="doc-schedule-title">GUARDIAN ATTORNEY SIGNATURE</div>
  <p style="font-size:.76rem;font-style:italic;margin-bottom:.6rem;">The undersigned Attorney hereby notifies the Court of the filing of the Verified Initial Inventory as of ${fmtDate(at.filingDate)}, ${county} County, Florida. This Verified Initial Inventory is the representation of the Guardian. The undersigned Attorney represents that he/she has examined the contents of the Inventory and that it conforms to the requirements of the Florida Guardianship Law.</p>
  <div class="doc-signature-block">
    <div class="row"><div class="col-6"><div class="doc-field-label">Attorney Signature &nbsp;/s/</div><div class="doc-signature-line ${sigClass}">${formatSig(at.name)}</div></div><div class="col-3"><div class="doc-field-label">Date</div><div class="doc-signature-line">${fmtDate(at.signatureDate)}</div></div><div class="col-3"><div class="doc-field-label">Attorney's Name</div><div class="doc-signature-line">${esc(at.name)}</div></div></div>
    <div class="row mt-2"><div class="col-4"><div class="doc-field-label">Bar Number</div><div class="doc-signature-line">${esc(at.barNumber)}</div></div><div class="col-4"><div class="doc-field-label">Phone</div><div class="doc-signature-line">${esc(at.phone)}</div></div><div class="col-4"><div class="doc-field-label">Street Address</div><div class="doc-signature-line">${esc(at.streetAddress)}</div></div></div>
    <div class="row mt-2"><div class="col-6"><div class="doc-field-label">City / State / Zip</div><div class="doc-signature-line">${esc(at.cityStateZip)}</div></div></div>
  </div>
  </div>`;

  // D-3, D-4 & Part VI – Audit Fee, Safe Deposit Box, Bond Calculation
  const sa=d.serviceAttorney;
  html+=`<div class="schedule-page doc-page">${docHeader(ward,caseNo,'Audit Fee, Bond &amp; Service','6')}
  <div class="doc-schedule-title">AUDIT FEE SCHEDULE</div>
  <div class="doc-table-div mb-3">
    ${tdR('Initial Verified Inventory Property Value in Excess of $25,000','$85.00')}
    ${tdR('Initial Verified Inventory Property Value at or below $25,000','$0.00')}
    <div class="tr total-row"><div class="td">Applicable Audit Fee (total inventory: ${fmt(c.total())})</div><div class="td right">${fmt(c.auditFee())}</div></div>
  </div>
  <div class="doc-schedule-title">SAFE DEPOSIT BOX</div>
  <div class="doc-table-div mb-3" style="font-size:.76rem;">
    ${td('Does the ward have a safe deposit box?',d.hasSafeDepositBox===true?'Yes':d.hasSafeDepositBox===false?'No':'Not Answered')}
    ${d.hasSafeDepositBox===true?td('SDB Inventory Filed?',d.safeDepositBoxFiled===true?'Yes':d.safeDepositBoxFiled===false?'No':'Not Stated'):''}
  </div>
  <div class="doc-schedule-title">SURETY BOND REQUIREMENT — Bond Calculation</div>
  <div class="doc-table-div mb-3">
    ${tdR('Schedule B-1 — Cash Assets in RESTRICTED Depository',fmt(c.restrictedCash()))}
    ${tdR('Schedule B-3 — Intangible Assets RESTRICTED',fmt(c.restrictedIntang()))}
    ${tdR('Schedule B-1 — Cash Assets NOT in a Restricted Depository',fmt(c.unrestrictedCash()))}
    ${tdR('Schedule B-2 — Personal Property Assets',fmt(c.totalB2()))}
    ${tdR('Schedule B-3 — Intangible Assets NOT RESTRICTED',fmt(c.unrestrictedIntang()))}
    <div class="tr total-row"><div class="td">Total for BOND REQUIREMENT</div><div class="td right">${fmt(c.bondRequired())}</div></div>
  </div>
  <div class="doc-schedule-title">SURETY BOND DETAILS</div>
  <div class="doc-table-div mb-3" style="font-size:.76rem;">
    ${td('Bond Amount',esc(d.bondAmount))}
    ${td('Bond Period','From: '+fmtDate(d.bondPeriodFrom)+'&nbsp;&nbsp;To: '+fmtDate(d.bondPeriodTo))}
    ${td('Name of Bonding Company',esc(d.bondingCompany))}
    ${d.bondWaivedDate?td('Bond Waived — Order Date',esc(d.bondWaivedDate)):''}
  </div>
  </div>`;

  // Part VI: Certificate of Service
  html+=`<div class="schedule-page doc-page">${docHeader(ward,caseNo,'Certificate of Service','7')}
  <div class="doc-schedule-title">Part VI — GUARDIAN ATTORNEY — CERTIFICATE OF SERVICE</div>
  <p style="font-size:.78rem;margin-bottom:1rem;">Pursuant to Florida Statute 744.362(1), I hereby certify that a copy of this inventory has been furnished to:</p>
  <div class="row mb-3">
    ${d.serviceRecipients.map((r,i)=>`<div class="col-6 mb-2"><div class="doc-field-label">Name and Address of Recipient ${i+1}</div><div class="doc-signature-line ${sigClass}">${formatSig(r.name)}</div></div><div class="col-3"><div class="doc-field-label">Date</div><div class="doc-signature-line">${fmtDate(r.dateServed||d.serviceDate)}</div></div><div class="doc-signature-line">${esc(r.address)}</div><div class="doc-signature-line">${esc(r.cityStateZip)}</div></div>`).join('')}
  </div>
  <p style="font-size:.78rem;">on this date: ${fmtDate(d.serviceDate)}</p>
  <div class="doc-signature-block">
    <div class="row"><div class="col-6"><div class="doc-field-label">Attorney Signature &nbsp;/s/</div><div class="doc-signature-line ${sigClass}">${formatSig(sa.name)}</div></div><div class="col-3"><div class="doc-field-label">Date</div><div class="doc-signature-line">${fmtDate(sa.signatureDate)}</div></div><div class="col-3"><div class="doc-field-label">Attorney's Name</div><div class="doc-signature-line">${esc(sa.name)}</div></div></div>
    <div class="row mt-2"><div class="col-4"><div class="doc-field-label">Bar Number</div><div class="doc-signature-line">${esc(sa.barNumber)}</div></div><div class="col-4"><div class="doc-field-label">Phone</div><div class="doc-signature-line">${esc(sa.phone)}</div></div><div class="col-4"><div class="doc-field-label">Street Address</div><div class="doc-signature-line">${esc(sa.streetAddress)}</div></div></div>
    <div class="row mt-2"><div class="col-6"><div class="doc-field-label">City / State / Zip</div><div class="doc-signature-line">${esc(sa.cityStateZip)}</div></div></div>
    <p class="mt-3" style="font-size:.76rem;text-align:center;font-weight:700;">(End of Verified Initial Inventory)</p>
  </div>
  </div>`;

  return html;
}

export function pagePrint(capOver){
  const errors=validateGuardian();
  highlightErrors(errors);
  const errPanel=errors.length?validationPanel(errors):'';
  const canExport=errors.length===0;
  const canExportExcel=canExport&&capOver.length===0;
  const sigStyle=window.D.signatureStyle||'typed';

  return `<div>
  <h1 class="visually-hidden">Print Preview</h1>
  <div class="print-preview-banner no-print">
    <span><svg class="ic" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M6.4 3.4h7l4.2 4.2v13H6.4Z"/><path d="M13.2 3.4v4.4h4.4"/><path d="M9.2 12.6h5.6M9.2 16h5.6"/></svg> Print Preview — use <strong>Save as PDF</strong> or <strong>Save as Excel</strong>, or <strong>Print</strong>.</span>
    <div class="d-flex gap-2 align-items-center flex-wrap">
      <span id="export-status" style="font-size:.8rem;color:var(--ink-3);"></span>
      <button class="btn btn-outline-primary btn-sm" data-inventory-action="save-pdf" ${canExport?'':'disabled'}><svg class="ic" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M6.4 3.4h7l4.2 4.2v13H6.4Z"/><path d="M13.2 3.4v4.4h4.4"/><path d="M9.2 12.6h5.6M9.2 16h5.6"/></svg> Save as PDF</button>
      <button class="btn btn-outline-success btn-sm" data-inventory-action="save-excel" ${canExportExcel?'':'disabled'} ${capOver.length?'title="Some schedules have more entries than the Excel template can hold — save as PDF instead"':''}><svg class="ic" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M4.2 20h15.6"/><path d="M7.4 20v-6.4M12 20V5.6M16.6 20v-9.2"/></svg> Save as Excel</button>
      <button class="btn btn-outline-secondary btn-sm" data-form-action="print"><svg class="ic" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M7.2 9.2V3.6h9.6v5.6"/><rect x="4" y="9.2" width="16" height="6.6" rx="1.6"/><path d="M7.2 14.6h9.6v5.8H7.2Z"/></svg> Print</button>
      <button class="btn btn-outline-secondary btn-sm" data-form-action="open-court-portal" title="Opens the Florida Courts E-Filing Portal in a new tab"><svg class="ic" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M14.2 4.4h5.4v5.4"/><path d="m19.6 4.4-8 8"/><path d="M17.4 13.6v6H4.6V6.8h6"/></svg> Florida E-Filing Portal</button>
    </div>
  </div>

  <div class="summary-box mb-3 no-print" style="background:var(--surface);border:1px solid var(--line);border-radius:8px;padding:.75rem 1rem;">
    <div style="font-weight:600;font-size:.85rem;color:var(--ink);margin-bottom:.25rem;">Electronic Signature Format (Fla. R. Gen. Prac. &amp; Jud. Admin. 2.515)</div>
    <div style="font-size:.78rem;color:var(--ink-3);margin-bottom:.5rem;">Electronic signature format for generated PDFs. Confirm current filing requirements before filing.</div>
    <div class="d-flex gap-4">
      <label class="form-check" style="cursor:pointer;margin-bottom:0;">
        <input class="form-check-input" type="radio" name="signatureStyle" value="typed" ${sigStyle==='typed'?'checked':''} data-inventory-change="set-sig-style">
        <span class="form-check-label" style="font-size:.85rem;"><strong>Typed /s/ signature</strong> (Default — Standard Document Font)</span>
      </label>
      <label class="form-check" style="cursor:pointer;margin-bottom:0;">
        <input class="form-check-input" type="radio" name="signatureStyle" value="script" ${sigStyle==='script'?'checked':''} data-inventory-change="set-sig-style">
        <span class="form-check-label" style="font-size:.85rem;"><strong>Script-style /s/ signature</strong> (Optional — Cursive Presentation)</span>
      </label>
    </div>
  </div>

  ${errPanel}
  ${capOver.length?excelCapacityPanel(capOver):''}
  <div id="print-doc-container"></div>
  ${pageNav('/print')}
  </div>`;
}

// Called by index.js's mount() after the print page's HTML is in the DOM --
// renders the actual generated PDF (canvas + selectable text layer) into
// #print-doc-container, replacing the old buildPrintHTML() reconstruction.
export async function mountPreview(){
  window.printCurrentFilingPdf = () => printGeneratedPdf(buildModelForPreview, window.D);
  await mountPdfPreview(buildModelForPreview, window.D);
}

export async function doSavePdf(){
  const errors=validateGuardian();
  if(errors.length){renderPage('/print');alert(`Cannot export — ${errors.length} required field${errors.length===1?'':'s'} missing. See the list on this page.`);return;}
  const stat=document.getElementById('export-status');
  if(stat)stat.textContent='Generating PDF…';
  const stem=(window.D.wardName||'GuardianInventory').trim().replace(/\s+/g,'_');
  const filename=`${stem}_InitialInventory.pdf`;

  try{
    const model = buildVerifiedInventoryModel(window.D, {
      signatureStyle: window.D.signatureStyle || 'typed',
      printDate: new Date().toISOString().slice(0, 10),
    });
    const doc = await generateVerifiedInventoryPdf(model);
    doc.save(filename);
  }catch(e){
    console.error('PDF export failed',e);
    alert('PDF export failed: '+e.message);
  }finally{
    if(stat)stat.textContent='';
  }
}
