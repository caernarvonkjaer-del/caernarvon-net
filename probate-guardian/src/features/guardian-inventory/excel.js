// Excel import/export for Guardian Inventory (Milestone 8, Phase B).
// Dynamically imported from ./index.js, together with print.js, at first
// mount -- see that file's ensureLazyModules() comment for why.
//
// Statically imports validateGuardian back from ./index.js -- safe despite
// index.js dynamically importing this file, since neither side needs the
// other's export until a function body actually runs, well after both are
// loaded (see src/features/simplified-accounting/excel.js's comment on the
// same pattern).
import { validateGuardian } from './index.js';
import { authorizeFilingOutput } from '../../core/filing/output-authorization.js';
import { getExcelCapacityIssues } from '../../core/excel/excel-capacity.js';
import { getExcelJS, saveWorkbookFile, setCell } from '../../core/excel/excel-engine.js';
import { readCellText, unwrapCellValue } from '../../core/excel/cell-reader.js';
import { pruneSheets } from '../../core/excel/sheet-pruning.js';
import {
  SCHEDULE_A1_PAGES, SCHEDULE_A2_PAGES, SCHEDULE_B1_PAGES, SCHEDULE_B2_PAGES,
  SCHEDULE_B3_PAGES, SCHEDULE_B4_PAGES, SCHEDULE_C1_PAGES, SCHEDULE_C2_PAGES,
  SCHEDULE_C3_PAGES, SCHEDULE_C4_PAGES, SCHEDULE_C5_PAGES,
  unusedGuardianContinuationSheets,
} from '../../core/excel/guardian-inventory-pages.js';
import { alertModal } from '../../core/ui/dialogs.js';
import { setStatus, scheduleStatusClear } from '../../core/ui/transient-status.js';

const {
  renderPage, ensureTemplate, saveData, navigate,
  getImportProgressEl, validateImportFile, assertWorkbookWithinLimits,
  capitalizeImportedFields,
  sanitizeObjectData, mk,
} = window;

// Milestone 60K: the Excel boundary conversion for percentages, both ways.
//
// The app's model holds a Ward's % / Joint Owner's % as the 0-100 number the
// form's "Ward's % (0-100)" input collects. The court workbook's Ward's %
// cells are formatted 0.00% (styles.xml numFmtId 10) and hold FRACTIONS --
// the template's own worked examples are 0.5, 1 and 0.8 -- and every Ward's
// Value cell multiplies by them (=G17*H17). Until 60K the exporter wrote the
// model's number as-is, so a 50% row landed as 50: the filed workbook showed
// 5000.00% and computed 1000 x 50 = 50,000 where the form intends 1000 x 0.5
// = 500 -- every apportioned value 100 times too large. The PDF path was
// never affected (guardian-inventory/totals.js keeps the 0-100 model
// convention); this is strictly a write/read conversion at the file edge.
//
//   writer: blank stays blank (an empty Ward's % cell reads as 0 in the
//           workbook, same as a blank percentage in the app); otherwise
//           model 0-100 -> fraction 0-1.
//   reader: a cell value <= 1 is a fraction -> 0-100; a value above 1 is a
//           0-100 number a pre-60K export of this app wrote, kept as-is so
//           those files still import. (A genuine fraction of exactly 1 is
//           100%; a legacy "1" meaning 1% would read as 100% -- accepted, and
//           the only ambiguity this rule has.)
const pctCell=(v)=>{
  if(v==null||v==='')return '';
  const num=parseFloat(v);
  return Number.isFinite(num)?num/100:'';
};
export function percentFromWorkbook(raw){
  const num=parseFloat(raw);
  if(!Number.isFinite(num))return 0;
  const scaled=num>1?num:num*100;
  return Math.round(scaled*1e6)/1e6;
}

// Each cap is the total row count across that schedule's template pages
// (e.g. A-1 spans 3 pages holding 4 + 8 + 8). Initial Inventory overflows
// differently from the other two types: its fillScheduleXX() helpers walk
// a fixed list of template pages, and once the slots run out pageIdx runs
// past the end of pages[], so `pages[pageIdx].name` throws. The export
// then dies in its catch block and prints the raw TypeError into a status
// line that clears itself after three seconds — no file, no usable
// explanation. This cap guard turns that into a clear, actionable message.
export const GUARDIAN_EXCEL_CAPS={
  scheduleA1:{cap:20,label:'Schedule A-1 — Real Estate',route:'/a1'},
  scheduleA2:{cap:24,label:'Schedule A-2 — Real Estate Liabilities',route:'/a2'},
  scheduleB1:{cap:36,label:'Schedule B-1 — Cash / Cash Equivalents',route:'/b1'},
  scheduleB2:{cap:39,label:'Schedule B-2 — Personal Property',route:'/b2'},
  scheduleB3:{cap:20,label:'Schedule B-3 — Intangible Assets',route:'/b3'},
  scheduleB4:{cap:33,label:'Schedule B-4 — Personal Property Liabilities',route:'/b4'},
  scheduleC1:{cap:23,label:'Schedule C-1 — Income',route:'/c1'},
  scheduleC2:{cap:13,label:'Schedule C-2 — Lawsuits Against Ward',route:'/c2'},
  scheduleC3:{cap:14,label:'Schedule C-3 — Lawsuits By Ward',route:'/c3'},
  scheduleC4:{cap:16,label:'Schedule C-4 — Trusts',route:'/c4'},
  // 23 = page 1's 7 slots + 8 each on pages 2 and 3, matching the form's own
  // pre-printed Line # 1-23. Was 15 until D10, because the page map stopped at
  // page 2 (see core/excel/guardian-inventory-pages.js).
  scheduleC5:{cap:23,label:'Schedule C-5 — Joint Owners',route:'/c5'},
};

// Milestone 52K: each schedule's page/sheet-name + row-number layout used to
// be hand-typed twice -- once in its fillScheduleXX() writer below, once
// more in parseInitialInventoryWorkbook()'s readRows() calls -- with a
// different key for the same field (`name` on the writer side, `sheet` on
// the reader side). Neither name is read generically; readRows() destructures
// its own `sheet` key locally and the writers read `.name` directly, so
// there is no external consumer to keep in sync -- both sides now share one
// object per schedule and read the same `name` key. A template sheet
// renumbered on one side and not the other used to silently desync export
// and import for that schedule; now there is only one side to edit. The
// sheet-name strings are copied verbatim from the court's Excel template,
// trailing spaces/punctuation quirks included (e.g. 'A-2-REAL ESTATE MTG
// pg 1 ', 'B-3 INTANGIBLE pg 1;') -- these are real worksheet names, not
// typos to fix.
//
// Those shared page objects now live in core/excel/guardian-inventory-pages.js
// alongside the paging rules that read them, so the rules can be unit-tested
// without a browser -- this module reaches for window.* at its top level and
// cannot be imported under Node.

export async function doSaveExcel(){
  const capacityIssues = getExcelCapacityIssues('guardian', window.D, GUARDIAN_EXCEL_CAPS);
  const authorization = authorizeFilingOutput(window.D, () => validateGuardian(), {
    capability: 'excel',
    additionalIssues: capacityIssues,
  });
  if (authorization.status !== 'allowed') {
    if (authorization.status === 'blocked') {
      const capIssues = authorization.issues.filter(i => i.code?.startsWith('excel.capacity.'));
      if (capIssues.length) {
        await alertModal('Cannot export to Excel — these schedules have more entries than the court\'s Excel template can hold:\n\n'
          + capIssues.map(o => `• ${o.message}`).join('\n')
          + '\n\nSave as PDF instead — the PDF includes every entry.');
      } else {
        await alertModal(`Cannot export to Excel: ${authorization.issues.length} blocking issue(s) remain.`);
      }
    }
    renderPage('/print');
    return;
  }
  const stat=document.getElementById('export-status');
  setStatus(stat,'Preparing Excel export…');
  try{
    const inv=window.D;
    const templateB64=await ensureTemplate('guardian');
    if(!templateB64){await alertModal('Template not loaded. Please import the Excel template first.');return;}

    // Milestone 51 follow-up: `instanceof Date` guard. Without it,
    // String(dateObj).substring(0,10) writes a locale/timezone-dependent
    // "Tue May 19" into a filed workbook for a 2026-05-20T00:00:00Z date --
    // wrong format AND a day early. The length>=10 branch is left exactly as
    // it was: its type preservation (a short numeric input stays a number, so
    // setCell writes a numeric cell) is why this is not merged with
    // legacy fmtDate. See tests/unit/date-truncation-helpers.spec.js.
    const fmtD=s=>{const v=s instanceof Date?s.toISOString():s;return (v&&String(v).length>=10)?String(v).substring(0,10):(v||'');};
    // Milestone 51D: this is the canonical tri-state Excel writer for this app,
    // and it stays local deliberately. core/excel/excel-engine.js used to export a
    // yesNo(bool) under the SAME NAME that returned 'No' for '', null and
    // undefined -- which AGENTS.md section 3 forbids ("Never default or coerce an
    // unanswered field to 'No', at any stage"). Consolidating onto that export
    // would have turned every unanswered binary in a filed Initial Inventory into
    // an affirmative 'No', so the dead one was deleted instead. This version is
    // also a superset of the engine's yesNoTristate(), which handled only real
    // booleans, not the 'Yes'/'No' strings these fields actually store.
    const yesNo=v=>(v==='Yes'||v===true)?'Yes':((v==='No'||v===false)?'No':'');
    // Milestone 51D: setCell now comes from core/excel/excel-engine.js. The local
    // closure this replaces was byte-identical in all three feature excel.js files
    // apart from a null-sheet guard, and routed text through the same
    // sanitizeForExcel() the shared version delegates to.

    setStatus(stat,'Loading template…');
    const bin=atob(templateB64);
    const buf=new Uint8Array(bin.length);
    for(let i=0;i<bin.length;i++)buf[i]=bin.charCodeAt(i);

    const ExcelJS = await getExcelJS();
    const workbook=new ExcelJS.Workbook();
    await workbook.xlsx.load(buf.buffer);

    const si=workbook.getWorksheet('SUMMARY I ');
    if(si){
      setCell(si,'C7',inv.wardName||'');
      setCell(si,'H7',inv.caseNumber||'');
      setCell(si,'F7',fmtD(inv.gid));
      setCell(si,'G3',inv.county||'');
      setCell(si,'D23',inv.guardianName||'');
      setCell(si,'D24',inv.attorneyForGuardian||'');
      setCell(si,'D25',inv.typeOfGuardianship||'');
      setCell(si,'D26',yesNo(inv.hasSafeDepositBox));
      setCell(si,'H26',yesNo(inv.safeDepositBoxFiled));
      setCell(si,'I8',yesNo(inv.amendedForm!=null&&inv.amendedForm!==''?inv.amendedForm:inv.isAmended));
    }

    const fillScheduleA1=(entries)=>{
      const sheet=workbook.getWorksheet('A-1-REAL ESTATE pg 1');
      if(!sheet)return;
      let idx=0;
      const pages=SCHEDULE_A1_PAGES;
      for(const e of entries||[]){
        let pageIdx=0,rowIdxInPage=0;
        for(let i=0;i<=idx;i++){if(i>0&&pages[pageIdx].rows.length===rowIdxInPage){pageIdx++;rowIdxInPage=0;}if(i===idx)break;rowIdxInPage++;}
        const pg=workbook.getWorksheet(pages[pageIdx].name);
        if(!pg)continue;
        const r=pages[pageIdx].rows[rowIdxInPage];
        setCell(pg,`C${r}`,e.propertyDescription||'');
        setCell(pg,`C${r+1}`,e.streetAddress||'');
        setCell(pg,`C${r+2}`,e.cityStateZip||'');
        setCell(pg,`C${r+3}`,e.notes||'');
        setCell(pg,`E${r}`,yesNo(e.residence!=null&&e.residence!==''?e.residence:e.isPersonalResidence));
        setCell(pg,`F${r}`,yesNo(e.income!=null&&e.income!==''?e.income:e.isIncomeProperty));
        setCell(pg,`G${r}`,e.fullAssetValue||'');
        setCell(pg,`H${r}`,pctCell(e.wardPercent));
        idx++;
      }
    };

    const fillScheduleA2=(entries)=>{
      const pages=SCHEDULE_A2_PAGES;
      let idx=0;
      for(const e of entries||[]){
        let pageIdx=0,rowIdxInPage=0;
        for(let i=0;i<=idx;i++){if(i>0&&pages[pageIdx].rows.length===rowIdxInPage){pageIdx++;rowIdxInPage=0;}if(i===idx)break;rowIdxInPage++;}
        const pg=workbook.getWorksheet(pages[pageIdx].name);
        if(!pg)continue;
        const r=pages[pageIdx].rows[rowIdxInPage];
        setCell(pg,`C${r}`,e.lenderName||'');
        setCell(pg,`C${r+1}`,e.lenderAddress||'');
        setCell(pg,`C${r+2}`,e.lenderCityStateZip||'');
        setCell(pg,`C${r+3}`,e.accountNumber||'');
        setCell(pg,`E${r}`,e.liabilityType||'Mortgage');
        setCell(pg,`F${r}`,e.fullDebtBalance||'');
        setCell(pg,`G${r}`,pctCell(e.wardPercent));
        idx++;
      }
    };

    const fillScheduleB1=(entries)=>{
      const pages=SCHEDULE_B1_PAGES;
      let idx=0;
      for(const e of entries||[]){
        let pageIdx=0,rowIdxInPage=0;
        for(let i=0;i<=idx;i++){if(i>0&&pages[pageIdx].rows.length===rowIdxInPage){pageIdx++;rowIdxInPage=0;}if(i===idx)break;rowIdxInPage++;}
        const pg=workbook.getWorksheet(pages[pageIdx].name);
        if(!pg)continue;
        const r=pages[pageIdx].rows[rowIdxInPage];
        setCell(pg,`C${r}`,e.institutionName||'');
        setCell(pg,`C${r+1}`,e.accountNumber||'');
        setCell(pg,`C${r+2}`,e.streetAddress||'');
        setCell(pg,`C${r+3}`,e.cityStateZip||'');
        setCell(pg,`E${r}`,yesNo(e.restricted!=null&&e.restricted!==''?e.restricted:e.isRestricted));
        setCell(pg,`F${r}`,e.accountType||'');
        setCell(pg,`G${r}`,e.fullAssetAmount||'');
        setCell(pg,`H${r}`,pctCell(e.wardPercent));
        idx++;
      }
    };

    const fillScheduleB2=(entries)=>{
      const pages=SCHEDULE_B2_PAGES;
      let idx=0;
      for(const e of entries||[]){
        let pageIdx=0,rowIdxInPage=0;
        for(let i=0;i<=idx;i++){if(i>0&&pages[pageIdx].rows.length===rowIdxInPage){pageIdx++;rowIdxInPage=0;}if(i===idx)break;rowIdxInPage++;}
        const pg=workbook.getWorksheet(pages[pageIdx].name);
        if(!pg)continue;
        const r=pages[pageIdx].rows[rowIdxInPage];
        setCell(pg,`C${r}`,e.description||'');
        setCell(pg,`C${r+1}`,e.streetAddress||'');
        setCell(pg,`C${r+2}`,e.cityStateZip||'');
        setCell(pg,`C${r+3}`,e.valuationMethod||'');
        setCell(pg,`E${r}`,e.fullAssetValue||'');
        setCell(pg,`F${r}`,pctCell(e.wardPercent));
        setCell(pg,`H${r}`,yesNo(e.inSafeDepositBox));
        idx++;
      }
    };

    const fillScheduleB3=(entries)=>{
      const pages=SCHEDULE_B3_PAGES;
      let idx=0;
      for(const e of entries||[]){
        let pageIdx=0,rowIdxInPage=0;
        for(let i=0;i<=idx;i++){if(i>0&&pages[pageIdx].rows.length===rowIdxInPage){pageIdx++;rowIdxInPage=0;}if(i===idx)break;rowIdxInPage++;}
        const pg=workbook.getWorksheet(pages[pageIdx].name);
        if(!pg)continue;
        const r=pages[pageIdx].rows[rowIdxInPage];
        setCell(pg,`C${r}`,e.description||'');
        setCell(pg,`C${r+1}`,e.streetAddress||'');
        setCell(pg,`C${r+2}`,e.cityStateZip||'');
        setCell(pg,`E${r}`,yesNo(e.restricted!=null&&e.restricted!==''?e.restricted:e.isRestricted));
        setCell(pg,`F${r}`,e.fullAssetValue||'');
        setCell(pg,`G${r}`,pctCell(e.wardPercent));
        setCell(pg,`J${r}`,yesNo(e.inSafeDepositBox));
        idx++;
      }
    };

    const fillScheduleB4=(entries)=>{
      const pages=SCHEDULE_B4_PAGES;
      let idx=0;
      for(const e of entries||[]){
        let pageIdx=0,rowIdxInPage=0;
        for(let i=0;i<=idx;i++){if(i>0&&pages[pageIdx].rows.length===rowIdxInPage){pageIdx++;rowIdxInPage=0;}if(i===idx)break;rowIdxInPage++;}
        const pg=workbook.getWorksheet(pages[pageIdx].name);
        if(!pg)continue;
        const r=pages[pageIdx].rows[rowIdxInPage];
        setCell(pg,`C${r}`,e.lenderName||'');
        setCell(pg,`C${r+1}`,e.lenderAddress||'');
        setCell(pg,`C${r+2}`,e.relatedProperty||'');
        // Milestone 60K: the account number goes on the FIFTH line of the block,
        // where the form's worked example puts it ("Acct #112358132134" on row
        // 22 of an 18-22 block). It used to land on the fourth. The form's
        // written instructions say "Third line: Account Number" and never
        // describe the address/asset lines the example actually shows, so the
        // template contradicts itself; the example is what a clerk visually
        // matches, and it is what the requester authorized (MS 60K). Line four
        // is left blank on purpose (B-4 has no free-text note field). The
        // importer reads the fifth line and falls back to the fourth for
        // workbooks exported before 60K.
        setCell(pg,`C${r+3}`,'');
        setCell(pg,`C${r+4}`,e.accountNumber||'');
        setCell(pg,`E${r}`,e.liabilityType||'Loan');
        setCell(pg,`F${r}`,e.fullLiabilityBalance||'');
        setCell(pg,`G${r}`,pctCell(e.wardPercent));
        idx++;
      }
    };

    const fillScheduleC1=(entries)=>{
      const pages=SCHEDULE_C1_PAGES;
      let idx=0;
      for(const e of entries||[]){
        let pageIdx=0,rowIdxInPage=0;
        for(let i=0;i<=idx;i++){if(i>0&&pages[pageIdx].rows.length===rowIdxInPage){pageIdx++;rowIdxInPage=0;}if(i===idx)break;rowIdxInPage++;}
        const pg=workbook.getWorksheet(pages[pageIdx].name);
        if(!pg)continue;
        const r=pages[pageIdx].rows[rowIdxInPage];
        setCell(pg,`C${r}`,e.payerName||'');
        setCell(pg,`C${r+1}`,e.payerAddress||'');
        setCell(pg,`C${r+2}`,e.payerCityStateZip||'');
        setCell(pg,`E${r}`,e.typeOfIncome||'');
        setCell(pg,`G${r}`,e.frequencyOfPayment||'Monthly');
        setCell(pg,`E${r+2}`,e.paymentBasis||'');
        setCell(pg,`H${r}`,e.annualIncomeAmount||'');
        setCell(pg,`I${r}`,pctCell(e.wardPercent));
        idx++;
      }
    };

    const fillScheduleC2=(entries)=>{
      const pages=SCHEDULE_C2_PAGES;
      let idx=0;
      for(const e of entries||[]){
        let pageIdx=0,rowIdxInPage=0;
        for(let i=0;i<=idx;i++){if(i>0&&pages[pageIdx].rows.length===rowIdxInPage){pageIdx++;rowIdxInPage=0;}if(i===idx)break;rowIdxInPage++;}
        const pg=workbook.getWorksheet(pages[pageIdx].name);
        if(!pg)continue;
        const r=pages[pageIdx].rows[rowIdxInPage];
        const desc=`${e.lawsuitDescription||''}${e.caseNumber?' / '+e.caseNumber:''}`;
        setCell(pg,`C${r}`,desc);
        setCell(pg,`C${r+1}`,e.courtJurisdiction||'');
        setCell(pg,`C${r+2}`,e.claimantName||'');
        setCell(pg,`C${r+3}`,e.claimantAddress||'');
        // Milestone 60K: the form's fifth C-2 line (worked example row 18: "St Petersburg, FL 33710").
        setCell(pg,`C${r+4}`,e.claimantCityStateZip||'');
        setCell(pg,`E${r}`,fmtD(e.dateFiled));
        setCell(pg,`F${r}`,e.amountOfClaim||'');
        setCell(pg,`G${r}`,pctCell(e.wardPercent));
        idx++;
      }
    };

    const fillScheduleC3=(entries)=>{
      const pages=SCHEDULE_C3_PAGES;
      let idx=0;
      for(const e of entries||[]){
        let pageIdx=0,rowIdxInPage=0;
        for(let i=0;i<=idx;i++){if(i>0&&pages[pageIdx].rows.length===rowIdxInPage){pageIdx++;rowIdxInPage=0;}if(i===idx)break;rowIdxInPage++;}
        const pg=workbook.getWorksheet(pages[pageIdx].name);
        if(!pg)continue;
        const r=pages[pageIdx].rows[rowIdxInPage];
        const desc=`${e.actionDescription||''}${e.caseNumber?' / '+e.caseNumber:''}`;
        setCell(pg,`B${r}`,e.defendantName||'');
        setCell(pg,`C${r}`,desc);
        setCell(pg,`C${r+1}`,e.status||'');
        setCell(pg,`C${r+2}`,e.courtJurisdiction||'');
        setCell(pg,`E${r}`,fmtD(e.actionDate));
        setCell(pg,`F${r}`,e.estimatedSettlement||'');
        setCell(pg,`G${r}`,pctCell(e.wardPercent));
        idx++;
      }
    };

    const fillScheduleC4=(entries)=>{
      const pages=SCHEDULE_C4_PAGES;
      let idx=0;
      for(const e of entries||[]){
        let pageIdx=0,rowIdxInPage=0;
        for(let i=0;i<=idx;i++){if(i>0&&pages[pageIdx].rows.length===rowIdxInPage){pageIdx++;rowIdxInPage=0;}if(i===idx)break;rowIdxInPage++;}
        const pg=workbook.getWorksheet(pages[pageIdx].name);
        if(!pg)continue;
        const r=pages[pageIdx].rows[rowIdxInPage];
        setCell(pg,`C${r}`,e.trustName||'');
        setCell(pg,`C${r+1}`,e.trusteeName||'');
        setCell(pg,`C${r+2}`,e.trusteeAddress||'');
        setCell(pg,`C${r+3}`,e.trusteeCityStateZip||'');
        setCell(pg,`E${r}`,fmtD(e.dateCreated));
        setCell(pg,`F${r}`,e.accountNumber||'');
        setCell(pg,`H${r}`,e.trustType||'Pooled');
        setCell(pg,`I${r}`,e.trustAmount||'');
        setCell(pg,`J${r}`,pctCell(e.wardPercent));
        idx++;
      }
    };

    const fillScheduleC5=(entries)=>{
      const pages=SCHEDULE_C5_PAGES;
      let idx=0;
      for(const e of entries||[]){
        let pageIdx=0,rowIdxInPage=0;
        for(let i=0;i<=idx;i++){if(i>0&&pages[pageIdx].rows.length===rowIdxInPage){pageIdx++;rowIdxInPage=0;}if(i===idx)break;rowIdxInPage++;}
        const pg=workbook.getWorksheet(pages[pageIdx].name);
        if(!pg)continue;
        const r=pages[pageIdx].rows[rowIdxInPage];
        setCell(pg,`C${r}`,e.assetDescription||'');
        setCell(pg,`C${r+1}`,e.ownerAddress||'');
        setCell(pg,`C${r+2}`,e.ownerName||'');
        setCell(pg,`C${r+3}`,e.ownerCityStateZip||'');
        setCell(pg,`E${r}`,e.relationshipToWard||'');
        setCell(pg,`F${r}`,e.totalAssetValue||'');
        setCell(pg,`G${r}`,pctCell(e.jointOwnerPercent));
        idx++;
      }
    };

    fillScheduleA1(inv.scheduleA1);
    fillScheduleA2(inv.scheduleA2);
    fillScheduleB1(inv.scheduleB1);
    fillScheduleB2(inv.scheduleB2);
    fillScheduleB3(inv.scheduleB3);
    fillScheduleB4(inv.scheduleB4);
    fillScheduleC1(inv.scheduleC1);
    fillScheduleC2(inv.scheduleC2);
    fillScheduleC3(inv.scheduleC3);
    fillScheduleC4(inv.scheduleC4);
    fillScheduleC5(inv.scheduleC5);

    const p3=workbook.getWorksheet('PART III');
    if(p3&&inv.guardians.length){
      for(let i=0;i<Math.min(inv.guardians.length,3);i++){
        const b=7+i*6;
        const g=inv.guardians[i];
        setCell(p3,`D${b}`,fmtD(g.signatureDate));
        setCell(p3,`F${b+1}`,g.name||'');
        setCell(p3,`B${b+2}`,g.ssnEin||'');
        setCell(p3,`F${b+2}`,g.streetAddress||'');
        setCell(p3,`B${b+4}`,g.phone||'');
        setCell(p3,`F${b+4}`,g.cityStateZip||'');
      }
    }

    const p4=workbook.getWorksheet('PART IV');
    if(p4){
      // PART IV's signature blocks put each caption in one row and its input
      // box in the row BENEATH it -- "Preparer's Name" is the merged I12:K12,
      // the box for it is I13:K13. Every field here used to be written to the
      // caption row, so a filed inventory had twelve printed labels replaced
      // by values and twelve empty boxes underneath them.
      // Milestone 64A-2, item 2.5. The compilation statement's "as of" date.
      // H8 is the workbook's own "Date " CAPTION and H9 the box beneath it
      // (same caption-above-box shape as the rest of this block, confirmed by
      // reading the real template); B9 next to it is a formula pulling the
      // ward name from SUMMARY I C7 and is left alone.
      setCell(p4,'H9',fmtD(inv.preparer.asOfDate));
      setCell(p4,'G13',fmtD(inv.preparer.signatureDate));
      setCell(p4,'I13',inv.preparer.name||'');
      setCell(p4,'B15',inv.preparer.ssnEin||'');
      setCell(p4,'I15',inv.preparer.streetAddress||'');
      setCell(p4,'B17',inv.preparer.phone||'');
      setCell(p4,'I17',inv.preparer.cityStateZip||'');
      // The attorney block has two different dates on the form: C21 is the
      // "Date:" on the notification line above, G26 the one beside "Attorney
      // Signature". The signature date used to go to the G25 caption and the
      // filing date to G26, so the signature date never appeared at all and
      // never survived a round trip.
      setCell(p4,'C21',fmtD(inv.attorney.filingDate));
      setCell(p4,'G26',fmtD(inv.attorney.signatureDate));
      // I26 is the workbook's own formula pulling the attorney's name from
      // SUMMARY I D24 -- the form links the two -- so the app writes that cell
      // and leaves this one alone (AGENTS.md section 5).
      setCell(p4,'B28',inv.attorney.barNumber||'');
      setCell(p4,'I28',inv.attorney.streetAddress||'');
      setCell(p4,'B30',inv.attorney.phone||'');
      setCell(p4,'I30',inv.attorney.cityStateZip||'');
    }

    const p5=workbook.getWorksheet('PART V');
    if(p5){
      // The bond block's captions are in column B (and D27/F27's "From:" and
      // "To:"); the boxes are to their right. All three of these used to be
      // written onto the captions, so a filed inventory read a bare number
      // where "Bond Amount" belongs, dates where "From:" and "To:" belong, and
      // had all three bond boxes empty -- on the page the court uses to check
      // the surety bond.
      setCell(p5,'G26',inv.bondAmount||'');
      setCell(p5,'E27',fmtD(inv.bondPeriodFrom));
      setCell(p5,'G27',fmtD(inv.bondPeriodTo));
      setCell(p5,'D28',inv.bondingCompany||'');
      setCell(p5,'G15',inv.bondWaivedDate||'');
    }

    const p6=workbook.getWorksheet('PART VI');
    if(p6&&inv.serviceRecipients.length){
      const recs=inv.serviceRecipients;
      if(recs[0]){setCell(p6,'B13',recs[0].name||'');setCell(p6,'B14',recs[0].address||'');setCell(p6,'B15',recs[0].cityStateZip||'');}
      if(recs[1]){setCell(p6,'H13',recs[1].name||'');setCell(p6,'H14',recs[1].address||'');setCell(p6,'H15',recs[1].cityStateZip||'');}
      if(recs[2]){setCell(p6,'B19',recs[2].name||'');setCell(p6,'B20',recs[2].address||'');setCell(p6,'B21',recs[2].cityStateZip||'');}
      if(recs[3]){setCell(p6,'H19',recs[3].name||'');setCell(p6,'H20',recs[3].address||'');setCell(p6,'H21',recs[3].cityStateZip||'');}
      // Same caption-above-box shape as PART IV. The recipient blocks above
      // were already right; the certificate's own fields were not. The bar
      // number was the odd one out -- it went to J29, the street address's
      // box, while the street address went to the J28 caption.
      setCell(p6,'G25',fmtD(inv.serviceDate));
      // Milestone 64A-2, item 2.4. J24 is the workbook's own pre-printed
      // "Indicate if:" caption (confirmed by reading the real cell, not
      // assumed); the answer goes in J25, its own empty box, directly below.
      setCell(p6,'J25',inv.serviceIndicateIf||'');
      setCell(p6,'G27',fmtD(inv.serviceAttorney.signatureDate));
      // J27 is the workbook's formula for the attorney's name, from
      // SUMMARY I D24, exactly as on PART IV.
      setCell(p6,'B29',inv.serviceAttorney.barNumber||'');
      setCell(p6,'J29',inv.serviceAttorney.streetAddress||'');
      setCell(p6,'B31',inv.serviceAttorney.phone||'');
      setCell(p6,'J31',inv.serviceAttorney.cityStateZip||'');
    }

    // The court's workbook ships every printed page of every schedule, and the
    // writer fills only the ones a filing reaches. Without this an inventory
    // listing a house, two bank accounts and a car is filed with 21 blank
    // pages of pre-printed grid; the form's own instructions say to remove
    // them. pruneSheets() rebuilds, in the same operation, every formula that
    // named a removed page -- each schedule's page-1 total reaches into its own
    // continuation pages, so removing one on its own leaves #REF! in a filed
    // financial document. Anything it cannot rebuild safely is kept.
    //
    // Re-import is unaffected: parseInitialInventoryWorkbook()'s readRows()
    // skips a page that is not in the file, so a pruned workbook reads back
    // exactly the entries it was written with.
    pruneSheets(workbook, unusedGuardianContinuationSheets(inv));

    setStatus(stat,'Writing file…');
    const stem=(inv.wardName||'GuardianInventory').trim().replace(/\s+/g,'_');
    await saveWorkbookFile(workbook, `${stem}_InitialInventory.xlsx`);
    setStatus(stat,'✓ Exported!');
  }catch(e){
    console.error(e);
    setStatus(stat,'❌ '+e.message);
  }finally{
    scheduleStatusClear(stat);
  }
}

export async function importExcel(input){
  const file=input.files[0];
  if(!file)return;
  const prog=getImportProgressEl(input);
  try{
    setStatus(prog,'Checking file…');
    const check=await validateImportFile(file,'xlsx');
    if(!check.ok){setStatus(prog,'✗ '+check.message);return;}
    setStatus(prog,'Reading file…');
    const buf=await file.arrayBuffer();
    const ExcelJS=await getExcelJS();
    const workbook=new ExcelJS.Workbook();
    setStatus(prog,'Parsing Excel…');
    await workbook.xlsx.load(buf);
    assertWorkbookWithinLimits(workbook);
    // No template cache write here — see the note above ensureTemplate():
    // an imported file is never retained past this parse, so the app's own
    // bundled blank template is what every later "Export as Excel" uses.
    const importedData=sanitizeObjectData(parseInitialInventoryWorkbook(workbook));
    Object.assign(window.D,importedData);
    saveData();
    window.markFilingRevisionChanged?.('excel-import');
    setStatus(prog,'✓ Import complete!');
    scheduleStatusClear(prog);
    navigate('/');
  }catch(e){
    console.error('Initial Inventory import failed:',e);
    setStatus(prog,'✗ Import failed: '+(e&&e.message?e.message:'the file could not be parsed.'));
  }finally{
    input.value='';
  }
}
// Extracts the Initial Inventory fields from an already-loaded workbook.
// Takes the ExcelJS.Workbook directly (not a base64 string) — the previous
// version round-tripped the whole file through base64 solely to hand it to
// this function and to cache it via saveTemplate; neither is done
// anymore (see importExcel above), so there is no longer a buffer to
// smuggle across, and the raw workbook bytes are not retained past this call.
function parseInitialInventoryWorkbook(wb){
  const ws=name=>wb.getWorksheet(name);
  const rawv=(sheet,addr)=>sheet?unwrapCellValue(sheet.getCell(addr).value):null;
  const txt=(s,a)=>s?readCellText(s.getCell(a)):'';
  const num=(s,a)=>Number(rawv(s,a))||0;
  // Mirrors annual-accounting/excel.js's gcDate(): a date cell may come back
  // as a real Date, an Excel serial number, an ISO string, or US-format text
  // (this app's own fmtD() writes 'MM/DD/YYYY' — see doSaveExcel() above —
  // so re-importing a file this app just exported used to hand back
  // '10/01/2026' verbatim, 10 characters unchanged but not the ISO
  // 'YYYY-MM-DD' every date field elsewhere expects).
  const dt=(s,a)=>{
    const v=rawv(s,a);
    if(v==null||v==='')return null;
    if(v instanceof Date)return v.toISOString().substring(0,10);
    if(typeof v==='number'){const d=new Date((v-25569)*86400*1000);return d.toISOString().substring(0,10);}
    const str=String(v).trim();
    let m=str.match(/^(\d{4})-(\d{2})-(\d{2})/); if(m)return `${m[1]}-${m[2]}-${m[3]}`;
    m=str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/); if(m)return `${m[3]}-${m[1].padStart(2,'0')}-${m[2].padStart(2,'0')}`;
    m=str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2})$/); if(m){const yy=+m[3];return `${yy<50?2000+yy:1900+yy}-${m[1].padStart(2,'0')}-${m[2].padStart(2,'0')}`;}
    return null;
  };
  const bool=(s,a)=>txt(s,a).toLowerCase()==='yes';
  const triState=(s,a)=>{const t=txt(s,a).trim().toLowerCase();if(t==='yes')return 'Yes';if(t==='no')return 'No';return '';};
  // Milestone 60K: fraction -> 0-100, with pre-60K 0-100 files still read (see percentFromWorkbook).
  const pct=(s,a)=>percentFromWorkbook(rawv(s,a));
  const readRows=(pages,reader)=>{const out=[];for(const{name,rows}of pages){const s=ws(name);if(!s)continue;for(const r of rows){const e=reader(s,r);if(e)out.push(e);}}return out;};
  const si=ws('SUMMARY I ');
  const inv={
    wardName:txt(si,'C7'),caseNumber:txt(si,'H7'),gid:dt(si,'F7'),county:txt(si,'G3'),
    guardianName:txt(si,'D23'),attorneyForGuardian:txt(si,'D24'),typeOfGuardianship:txt(si,'D25'),
    hasSafeDepositBox:triState(si,'D26'),safeDepositBoxFiled:triState(si,'H26'),amendedForm:triState(si,'I8'),
    scheduleA1:readRows(SCHEDULE_A1_PAGES,(s,r)=>{const desc=txt(s,`C${r}`),val=num(s,`G${r}`);if(!desc&&!val)return null;return{propertyDescription:desc,streetAddress:txt(s,`C${r+1}`),cityStateZip:txt(s,`C${r+2}`),notes:txt(s,`C${r+3}`),residence:triState(s,`E${r}`),income:triState(s,`F${r}`),fullAssetValue:val,wardPercent:pct(s,`H${r}`)}}),
    scheduleA2:readRows(SCHEDULE_A2_PAGES,(s,r)=>{const name=txt(s,`C${r}`),val=num(s,`F${r}`);if(!name&&!val)return null;return{lenderName:name,lenderAddress:txt(s,`C${r+1}`),lenderCityStateZip:txt(s,`C${r+2}`),accountNumber:txt(s,`C${r+3}`),notes:'',liabilityType:txt(s,`E${r}`)||'Mortgage',fullDebtBalance:val,wardPercent:pct(s,`G${r}`)}}),
    scheduleB1:readRows(SCHEDULE_B1_PAGES,(s,r)=>{const name=txt(s,`C${r}`),val=num(s,`G${r}`);if(!name&&!val)return null;return{institutionName:name,accountNumber:txt(s,`C${r+1}`),streetAddress:txt(s,`C${r+2}`),cityStateZip:txt(s,`C${r+3}`),restricted:triState(s,`E${r}`),accountType:txt(s,`F${r}`),fullAssetAmount:val,wardPercent:pct(s,`H${r}`)}}),
    scheduleB2:readRows(SCHEDULE_B2_PAGES,(s,r)=>{const desc=txt(s,`C${r}`),val=num(s,`E${r}`);if(!desc&&!val)return null;return{description:desc,streetAddress:txt(s,`C${r+1}`),cityStateZip:txt(s,`C${r+2}`),valuationMethod:txt(s,`C${r+3}`),fullAssetValue:val,wardPercent:pct(s,`F${r}`),inSafeDepositBox:triState(s,`H${r}`)}}),
    scheduleB3:readRows(SCHEDULE_B3_PAGES,(s,r)=>{const desc=txt(s,`C${r}`),val=num(s,`F${r}`);if(!desc&&!val)return null;return{description:desc,streetAddress:txt(s,`C${r+1}`),cityStateZip:txt(s,`C${r+2}`),restricted:triState(s,`E${r}`),fullAssetValue:val,wardPercent:pct(s,`G${r}`),inSafeDepositBox:triState(s,`J${r}`)}}),
    scheduleB4:readRows(SCHEDULE_B4_PAGES,(s,r)=>{const name=txt(s,`C${r}`).trim(),val=num(s,`F${r}`);if(!name||val<=0)return null;return{lenderName:name,lenderAddress:txt(s,`C${r+1}`),relatedProperty:txt(s,`C${r+2}`),accountNumber:txt(s,`C${r+4}`)||txt(s,`C${r+3}`),liabilityType:txt(s,`E${r}`)||'Loan',fullLiabilityBalance:val,wardPercent:pct(s,`G${r}`)}}),
    scheduleC1:readRows(SCHEDULE_C1_PAGES,(s,r)=>{const name=txt(s,`C${r}`),val=num(s,`H${r}`);if(!name&&!val)return null;return{payerName:name,payerAddress:txt(s,`C${r+1}`),payerCityStateZip:txt(s,`C${r+2}`),typeOfIncome:txt(s,`E${r}`),frequencyOfPayment:txt(s,`G${r}`)||'Monthly',paymentBasis:txt(s,`E${r+2}`),annualIncomeAmount:val,wardPercent:pct(s,`I${r}`)}}),
    scheduleC2:readRows(SCHEDULE_C2_PAGES,(s,r)=>{const desc=txt(s,`C${r}`),val=num(s,`F${r}`);if(!desc&&!val)return null;const parts=desc.split(' / ');return{lawsuitDescription:parts[0]||desc,caseNumber:parts[1]||'',courtJurisdiction:txt(s,`C${r+1}`),claimantName:txt(s,`C${r+2}`),claimantAddress:txt(s,`C${r+3}`),claimantCityStateZip:txt(s,`C${r+4}`),dateFiled:dt(s,`E${r}`),amountOfClaim:val,wardPercent:pct(s,`G${r}`)}}),
    scheduleC3:readRows(SCHEDULE_C3_PAGES,(s,r)=>{const defendantName=txt(s,`B${r}`),desc=txt(s,`C${r}`),val=num(s,`F${r}`);if(!desc)return null;const parts=desc.split(' / ');return{defendantName,actionDescription:parts[0]||desc,caseNumber:parts[1]||'',status:txt(s,`C${r+1}`),courtJurisdiction:txt(s,`C${r+2}`),actionDate:dt(s,`E${r}`),estimatedSettlement:val,wardPercent:pct(s,`G${r}`)}}),
    scheduleC4:readRows(SCHEDULE_C4_PAGES,(s,r)=>{const name=txt(s,`C${r}`),val=num(s,`I${r}`);if(!name&&!val)return null;return{trustName:name,trusteeName:txt(s,`C${r+1}`),trusteeAddress:txt(s,`C${r+2}`),trusteeCityStateZip:txt(s,`C${r+3}`),dateCreated:dt(s,`E${r}`),accountNumber:txt(s,`F${r}`),trustType:txt(s,`H${r}`)||'Pooled',trustAmount:val,wardPercent:pct(s,`J${r}`)}}),
    scheduleC5:readRows(SCHEDULE_C5_PAGES,(s,r)=>{const desc=txt(s,`C${r}`),val=num(s,`F${r}`);if(!desc&&!val)return null;return{assetDescription:desc,ownerAddress:txt(s,`C${r+1}`),ownerName:txt(s,`C${r+2}`),ownerCityStateZip:txt(s,`C${r+3}`),relationshipToWard:txt(s,`E${r}`),totalAssetValue:val,jointOwnerPercent:pct(s,`G${r}`)}}),
    guardians:(()=>{const p3=ws('PART III');const gs=[];for(let i=0;i<3;i++){const b=7+i*6;const name=txt(p3,`F${b+1}`);if(!name&&i>0)continue;gs.push({signatureDate:dt(p3,`D${b}`),name,ssnEin:txt(p3,`B${b+2}`),streetAddress:txt(p3,`F${b+2}`),phone:txt(p3,`B${b+4}`),cityStateZip:txt(p3,`F${b+4}`)});}return gs.length?gs:[mk.guardian()];})(),
    // The same input-box addresses doSaveExcel() writes. Both sides used to
    // read and write the caption row instead, together, which is why the
    // round trip agreed with itself while the filed form was wrong.
    preparer:(()=>{const p4=ws('PART IV');return{signatureDate:dt(p4,'G13'),asOfDate:dt(p4,'H9'),name:txt(p4,'I13'),ssnEin:txt(p4,'B15'),streetAddress:txt(p4,'I15'),phone:txt(p4,'B17'),cityStateZip:txt(p4,'I17')};})(),
    // name comes from SUMMARY I D24, the cell the form's own I26 formula
    // reads, rather than from a formula cell's cached result.
    attorney:(()=>{const p4=ws('PART IV');return{signatureDate:dt(p4,'G26'),filingDate:dt(p4,'C21'),name:txt(si,'D24'),barNumber:txt(p4,'B28'),streetAddress:txt(p4,'I28'),phone:txt(p4,'B30'),cityStateZip:txt(p4,'I30')};})(),
    // Milestone 64A-1, item 1.1: bondAmount is now stored numeric (matching
    // every other currency field's num() reader), not the display string
    // txt() previously returned.
    bondAmount:num(ws('PART V'),'G26'),bondPeriodFrom:dt(ws('PART V'),'E27'),bondPeriodTo:dt(ws('PART V'),'G27'),bondingCompany:txt(ws('PART V'),'D28'),bondWaivedDate:txt(ws('PART V'),'G15'),
    serviceRecipients:(()=>{const p6=ws('PART VI');const all=[{name:txt(p6,'B13'),address:txt(p6,'B14'),cityStateZip:txt(p6,'B15')},{name:txt(p6,'H13'),address:txt(p6,'H14'),cityStateZip:txt(p6,'H15')},{name:txt(p6,'B19'),address:txt(p6,'B20'),cityStateZip:txt(p6,'B21')},{name:txt(p6,'H19'),address:txt(p6,'H20'),cityStateZip:txt(p6,'H21')}];const filtered=all.filter(r=>r.name||r.address||r.cityStateZip);return filtered.length>0?filtered:[mk.recipient()];})(),
    // Milestone 57B: imported as unanswered, never inferred. A blank PART VI
    // means the workbook carries no recipients; it does NOT mean the filer
    // attested that none are required. That is the section 4 tri-state rule,
    // and the same one-way reasoning dependent-question.js enforces for 57A.
    serviceNoRecipients:'',
    serviceDate:dt(ws('PART VI'),'G25'),
    serviceIndicateIf:txt(ws('PART VI'),'J25'),
    serviceAttorney:(()=>{const p6=ws('PART VI');return{signatureDate:dt(p6,'G27'),name:txt(si,'D24'),barNumber:txt(p6,'B29'),streetAddress:txt(p6,'J29'),phone:txt(p6,'B31'),cityStateZip:txt(p6,'J31')};})()
  };
  capitalizeImportedFields(inv);
  return inv;
}
