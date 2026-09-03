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

const {
  renderPage, ensureTemplate, sanitizeForExcel, saveData, navigate,
  getImportProgressEl, validateImportFile, assertWorkbookWithinLimits,
  readCellText, unwrapCellValue, capitalizeImportedFields,
  sanitizeObjectData, checkExcelCapacity, mk,
  ExcelJS,
} = window;

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
  scheduleC5:{cap:15,label:'Schedule C-5 — Joint Owners',route:'/c5'},
};

export async function doSaveExcel(){
  const errors=validateGuardian();
  if(errors.length){renderPage('/print');return;}
  // Without this the overflow surfaces as a raw TypeError in the status
  // line below, which then clears itself after three seconds.
  const capOver=checkExcelCapacity(GUARDIAN_EXCEL_CAPS);
  if(capOver.length){
    alert('Cannot export to Excel — these schedules have more entries than the court\'s Excel template can hold:\n\n'
      +capOver.map(o=>`• ${o.label}: ${o.count} entries (template holds ${o.cap})`).join('\n')
      +'\n\nSave as PDF instead — the PDF includes every entry.');
    renderPage('/print');
    return;
  }
  const stat=document.getElementById('export-status');
  if(stat)stat.textContent='Preparing Excel export…';
  try{
    const inv=window.D;
    const templateB64=await ensureTemplate('guardian');
    if(!templateB64){alert('Template not loaded. Please import the Excel template first.');return;}

    const fmtD=s=>(s&&String(s).length>=10)?String(s).substring(0,10):(s||'');
    const yesNo=b=>b?'Yes':'No';
    const setCell=(sheet,addr,v)=>{const c=sheet.getCell(addr);if(v==null||v===''){c.value=null;}else if(typeof v==='number'){c.value=v;}else{c.value=sanitizeForExcel(String(v));}};

    if(stat)stat.textContent='Loading template…';
    const bin=atob(templateB64);
    const buf=new Uint8Array(bin.length);
    for(let i=0;i<bin.length;i++)buf[i]=bin.charCodeAt(i);

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
      const yesNoTristate = v => v === true ? 'Yes' : v === false ? 'No' : '';
      setCell(si,'D26',yesNoTristate(inv.hasSafeDepositBox));
      setCell(si,'H26',yesNoTristate(inv.safeDepositBoxFiled));
      setCell(si,'I8',yesNo(inv.isAmended));
    }

    const fillScheduleA1=(entries)=>{
      const sheet=workbook.getWorksheet('A-1-REAL ESTATE pg 1');
      if(!sheet)return;
      let idx=0;
      for(const e of entries||[]){
        const pages=[{name:'A-1-REAL ESTATE pg 1',rows:[27,32,37,42]},{name:'A-1-REAL ESTATE pg 2',rows:[7,12,17,22,27,32,37,42]},{name:'A-1-REAL ESTATE pg 3',rows:[7,12,17,22,27,32,37,42]}];
        let pageIdx=0,rowIdxInPage=0;
        for(let i=0;i<=idx;i++){if(i>0&&pages[pageIdx].rows.length===rowIdxInPage){pageIdx++;rowIdxInPage=0;}if(i===idx)break;rowIdxInPage++;}
        const pg=workbook.getWorksheet(pages[pageIdx].name);
        if(!pg)continue;
        const r=pages[pageIdx].rows[rowIdxInPage];
        setCell(pg,`C${r}`,e.propertyDescription||'');
        setCell(pg,`C${r+1}`,e.streetAddress||'');
        setCell(pg,`C${r+2}`,e.cityStateZip||'');
        setCell(pg,`C${r+3}`,e.notes||'');
        setCell(pg,`E${r}`,yesNo(e.isPersonalResidence));
        setCell(pg,`F${r}`,yesNo(e.isIncomeProperty));
        setCell(pg,`G${r}`,e.fullAssetValue||'');
        setCell(pg,`H${r}`,e.wardPercent||'');
        idx++;
      }
    };

    const fillScheduleA2=(entries)=>{
      const pages=[{name:'A-2-REAL ESTATE MTG pg 1 ',rows:[30,35,40,45,50]},{name:'A-2-REAL ESTATE MTG pg 2',rows:[7,12,17,22,27,32,37,42,47]},{name:'A-2-REAL ESTATE MTG pg 3',rows:[7,12,17,22,27,32,37,42,47,52]}];
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
        setCell(pg,`G${r}`,e.wardPercent||'');
        idx++;
      }
    };

    const fillScheduleB1=(entries)=>{
      const pages=[{name:'B-1 CASH pg 1',rows:[25,30,35,40,45,50]},{name:'B-1 CASH pg 2',rows:[7,12,17,22,27,32,37,42,47,52]},{name:'B-1 CASH pg 3',rows:[7,12,17,22,27,32,37,42,47,52]},{name:'B-1 CASH pg 4',rows:[7,12,17,22,27,32,37,42,47,52]}];
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
        setCell(pg,`E${r}`,yesNo(e.isRestricted));
        setCell(pg,`F${r}`,e.accountType||'');
        setCell(pg,`G${r}`,e.fullAssetAmount||'');
        setCell(pg,`H${r}`,e.wardPercent||'');
        idx++;
      }
    };

    const fillScheduleB2=(entries)=>{
      const pages=[{name:'B-2 PER PROP pg 1',rows:[33,38,43,48,53,58]},{name:'B-2 PER PROP pg 2',rows:[7,12,17,22,27,32,37,42,47,52,57]},{name:'B-2 PER PROP pg 3',rows:[7,12,17,22,27,32,37,42,47,52,57]},{name:'B-2 PER PROP pg 4',rows:[7,12,17,22,27,32,37,42,47,52,57]}];
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
        setCell(pg,`F${r}`,e.wardPercent||'');
        setCell(pg,`H${r}`,yesNo(e.inSafeDepositBox));
        idx++;
      }
    };

    const fillScheduleB3=(entries)=>{
      const pages=[{name:'B-3 INTANGIBLE pg 1;',rows:[22,27,32,37,42,47,52,57,62]},{name:'B-3 INTANGIBLE pg 2',rows:[7,12,17,22,27,32,37,42,47,52,57]}];
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
        setCell(pg,`E${r}`,yesNo(e.isRestricted));
        setCell(pg,`F${r}`,e.fullAssetValue||'');
        setCell(pg,`G${r}`,e.wardPercent||'');
        setCell(pg,`J${r}`,yesNo(e.inSafeDepositBox));
        idx++;
      }
    };

    const fillScheduleB4=(entries)=>{
      const pages=[{name:'B-4 PERS PROP LIAB pg 1',rows:[23,28,33,38,43,48]},{name:'B-4 PERS PROP LIAB pg 2',rows:[8,13,18,23,28,33,38,43,48]},{name:'B-4 PERS PROP LIAB pg 3',rows:[8,13,18,23,28,33,38,43,48]},{name:'B-4 PERS PROP LIAB pg 4',rows:[8,13,18,23,28,33,38,43,48]}];
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
        setCell(pg,`C${r+3}`,e.accountNumber||'');
        setCell(pg,`E${r}`,e.liabilityType||'Loan');
        setCell(pg,`F${r}`,e.fullLiabilityBalance||'');
        setCell(pg,`G${r}`,e.wardPercent||'');
        idx++;
      }
    };

    const fillScheduleC1=(entries)=>{
      const pages=[{name:'C-1 INCOME pg 1',rows:[29,34,39,44,49]},{name:'C-1 INCOME pg 2',rows:[7,12,17,22,27,32,37,42,47]},{name:'C-1 INCOME pg 3',rows:[7,12,17,22,27,32,37,42,47]}];
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
        setCell(pg,`I${r}`,e.wardPercent||'');
        idx++;
      }
    };

    const fillScheduleC2=(entries)=>{
      const pages=[{name:'C-2 LAWSUIT AGAINST 1',rows:[19,24,29,34,39,44]},{name:'C-2 LAWSUIT AGAINST pg 2',rows:[7,12,17,22,27,32,37]}];
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
        setCell(pg,`E${r}`,fmtD(e.dateFiled));
        setCell(pg,`F${r}`,e.amountOfClaim||'');
        setCell(pg,`G${r}`,e.wardPercent||'');
        idx++;
      }
    };

    const fillScheduleC3=(entries)=>{
      const pages=[{name:'C-3 LAWSUIT BY WARD pg 1',rows:[20,25,30,35,40,45]},{name:'C-3 LAWSUIT BY WARD pg 2',rows:[7,12,17,22,27,32,37,42]}];
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
        setCell(pg,`G${r}`,e.wardPercent||'');
        idx++;
      }
    };

    const fillScheduleC4=(entries)=>{
      const pages=[{name:'C-4 TRUSTS pg 1',rows:[23,28,33,38,43,48,53]},{name:'C-4 TRUSTS pg 2',rows:[7,12,17,22,27,32,37,42,47]}];
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
        setCell(pg,`J${r}`,e.wardPercent||'');
        idx++;
      }
    };

    const fillScheduleC5=(entries)=>{
      const pages=[{name:'C-5 JOINT OWNERS pg 1 ',rows:[19,24,29,34,39,44,49]},{name:'C-5 JOINT OWNERS pg 2',rows:[7,12,17,22,27,32,37,42]}];
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
        setCell(pg,`G${r}`,e.jointOwnerPercent||'');
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
      setCell(p4,'G12',fmtD(inv.preparer.signatureDate));
      setCell(p4,'I12',inv.preparer.name||'');
      setCell(p4,'B14',inv.preparer.ssnEin||'');
      setCell(p4,'I14',inv.preparer.streetAddress||'');
      setCell(p4,'B16',inv.preparer.phone||'');
      setCell(p4,'I16',inv.preparer.cityStateZip||'');
      setCell(p4,'G25',fmtD(inv.attorney.signatureDate));
      setCell(p4,'G26',fmtD(inv.attorney.filingDate));
      setCell(p4,'I25',inv.attorney.name||'');
      setCell(p4,'B27',inv.attorney.barNumber||'');
      setCell(p4,'I27',inv.attorney.streetAddress||'');
      setCell(p4,'B29',inv.attorney.phone||'');
      setCell(p4,'I29',inv.attorney.cityStateZip||'');
    }

    const p5=workbook.getWorksheet('PART V');
    if(p5){
      setCell(p5,'B26',inv.bondAmount||'');
      setCell(p5,'D27',fmtD(inv.bondPeriodFrom));
      setCell(p5,'F27',fmtD(inv.bondPeriodTo));
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
      setCell(p6,'G24',fmtD(inv.serviceDate));
      setCell(p6,'G26',fmtD(inv.serviceAttorney.signatureDate));
      setCell(p6,'J27',inv.serviceAttorney.name||'');
      setCell(p6,'J29',inv.serviceAttorney.barNumber||'');
      setCell(p6,'J28',inv.serviceAttorney.streetAddress||'');
      setCell(p6,'B30',inv.serviceAttorney.phone||'');
      setCell(p6,'J30',inv.serviceAttorney.cityStateZip||'');
    }

    if(stat)stat.textContent='Writing file…';
    const stem=(inv.wardName||'GuardianInventory').trim().replace(/\s+/g,'_');
    try{workbook.definedNames.model=[];}catch(e){}
    const xlsx=await workbook.xlsx.writeBuffer();
    const blob=new Blob([xlsx],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');
    a.href=url;
    a.download=`${stem}_InitialInventory.xlsx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    if(stat)stat.textContent='✓ Exported!';
  }catch(e){
    console.error(e);
    if(stat)stat.textContent='❌ '+e.message;
  }finally{
    setTimeout(()=>{if(stat)stat.textContent='';},3000);
  }
}

export async function importExcel(input){
  const file=input.files[0];
  if(!file)return;
  const prog=getImportProgressEl(input);
  try{
    if(prog)prog.textContent='Checking file…';
    const check=await validateImportFile(file,'xlsx');
    if(!check.ok){if(prog)prog.textContent='✗ '+check.message;return;}
    if(prog)prog.textContent='Reading file…';
    const buf=await file.arrayBuffer();
    const workbook=new ExcelJS.Workbook();
    if(prog)prog.textContent='Parsing Excel…';
    await workbook.xlsx.load(buf);
    assertWorkbookWithinLimits(workbook);
    // No template cache write here — see the note above ensureTemplate():
    // an imported file is never retained past this parse, so the app's own
    // bundled blank template is what every later "Export as Excel" uses.
    const importedData=sanitizeObjectData(parseInitialInventoryWorkbook(workbook));
    Object.assign(window.D,importedData);
    saveData();
    if(prog)prog.textContent='✓ Import complete!';
    setTimeout(()=>{if(prog)prog.textContent='';},3000);
    navigate('/');
  }catch(e){
    console.error('Initial Inventory import failed:',e);
    if(prog)prog.textContent='✗ Import failed: '+(e&&e.message?e.message:'the file could not be parsed.');
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
  const dt=(s,a)=>{const v=rawv(s,a);if(!v)return null;if(v instanceof Date)return v.toISOString().substring(0,10);if(typeof v==='number'){const d=new Date((v-25569)*86400*1000);return d.toISOString().substring(0,10);}return typeof v==='string'?v.substring(0,10):null;};
  const bool=(s,a)=>txt(s,a).toLowerCase()==='yes';
  const tristateBool=(s,a)=>{const t=txt(s,a).trim().toLowerCase();if(t==='yes')return true;if(t==='no')return false;return null;};
  const pct=(s,a)=>Math.round(num(s,a)*100*1e6)/1e6;
  const readRows=(pages,reader)=>{const out=[];for(const{sheet:name,rows}of pages){const s=ws(name);if(!s)continue;for(const r of rows){const e=reader(s,r);if(e)out.push(e);}}return out;};
  const si=ws('SUMMARY I ');
  const inv={
    wardName:txt(si,'C7'),caseNumber:txt(si,'H7'),gid:dt(si,'F7'),county:txt(si,'G3'),
    guardianName:txt(si,'D23'),attorneyForGuardian:txt(si,'D24'),typeOfGuardianship:txt(si,'D25'),
    hasSafeDepositBox:tristateBool(si,'D26'),safeDepositBoxFiled:tristateBool(si,'H26'),isAmended:bool(si,'I8'),
    scheduleA1:readRows([{sheet:'A-1-REAL ESTATE pg 1',rows:[27,32,37,42]},{sheet:'A-1-REAL ESTATE pg 2',rows:[7,12,17,22,27,32,37,42]},{sheet:'A-1-REAL ESTATE pg 3',rows:[7,12,17,22,27,32,37,42]}],(s,r)=>{const desc=txt(s,`C${r}`),val=num(s,`G${r}`);if(!desc&&!val)return null;return{propertyDescription:desc,streetAddress:txt(s,`C${r+1}`),cityStateZip:txt(s,`C${r+2}`),notes:txt(s,`C${r+3}`),isPersonalResidence:bool(s,`E${r}`),isIncomeProperty:bool(s,`F${r}`),fullAssetValue:val,wardPercent:pct(s,`H${r}`)}}),
    scheduleA2:readRows([{sheet:'A-2-REAL ESTATE MTG pg 1 ',rows:[30,35,40,45,50]},{sheet:'A-2-REAL ESTATE MTG pg 2',rows:[7,12,17,22,27,32,37,42,47]},{sheet:'A-2-REAL ESTATE MTG pg 3',rows:[7,12,17,22,27,32,37,42,47,52]}],(s,r)=>{const name=txt(s,`C${r}`),val=num(s,`F${r}`);if(!name&&!val)return null;return{lenderName:name,lenderAddress:txt(s,`C${r+1}`),lenderCityStateZip:txt(s,`C${r+2}`),accountNumber:txt(s,`C${r+3}`),notes:'',liabilityType:txt(s,`E${r}`)||'Mortgage',fullDebtBalance:val,wardPercent:pct(s,`G${r}`)}}),
    scheduleB1:readRows([{sheet:'B-1 CASH pg 1',rows:[25,30,35,40,45,50]},{sheet:'B-1 CASH pg 2',rows:[7,12,17,22,27,32,37,42,47,52]},{sheet:'B-1 CASH pg 3',rows:[7,12,17,22,27,32,37,42,47,52]},{sheet:'B-1 CASH pg 4',rows:[7,12,17,22,27,32,37,42,47,52]}],(s,r)=>{const name=txt(s,`C${r}`),val=num(s,`G${r}`);if(!name&&!val)return null;return{institutionName:name,accountNumber:txt(s,`C${r+1}`),streetAddress:txt(s,`C${r+2}`),cityStateZip:txt(s,`C${r+3}`),isRestricted:bool(s,`E${r}`),accountType:txt(s,`F${r}`),fullAssetAmount:val,wardPercent:pct(s,`H${r}`)}}),
    scheduleB2:readRows([{sheet:'B-2 PER PROP pg 1',rows:[33,38,43,48,53,58]},{sheet:'B-2 PER PROP pg 2',rows:[7,12,17,22,27,32,37,42,47,52,57]},{sheet:'B-2 PER PROP pg 3',rows:[7,12,17,22,27,32,37,42,47,52,57]},{sheet:'B-2 PER PROP pg 4',rows:[7,12,17,22,27,32,37,42,47,52,57]}],(s,r)=>{const desc=txt(s,`C${r}`),val=num(s,`E${r}`);if(!desc&&!val)return null;return{description:desc,streetAddress:txt(s,`C${r+1}`),cityStateZip:txt(s,`C${r+2}`),valuationMethod:txt(s,`C${r+3}`),fullAssetValue:val,wardPercent:pct(s,`F${r}`),inSafeDepositBox:bool(s,`H${r}`),amountInSDB:0}}),
    scheduleB3:readRows([{sheet:'B-3 INTANGIBLE pg 1;',rows:[22,27,32,37,42,47,52,57,62]},{sheet:'B-3 INTANGIBLE pg 2',rows:[7,12,17,22,27,32,37,42,47,52,57]}],(s,r)=>{const desc=txt(s,`C${r}`),val=num(s,`F${r}`);if(!desc&&!val)return null;return{description:desc,streetAddress:txt(s,`C${r+1}`),cityStateZip:txt(s,`C${r+2}`),isRestricted:bool(s,`E${r}`),fullAssetValue:val,wardPercent:pct(s,`G${r}`),inSafeDepositBox:bool(s,`J${r}`),amountInSDB:0}}),
    scheduleB4:readRows([{sheet:'B-4 PERS PROP LIAB pg 1',rows:[23,28,33,38,43,48]},{sheet:'B-4 PERS PROP LIAB pg 2',rows:[8,13,18,23,28,33,38,43,48]},{sheet:'B-4 PERS PROP LIAB pg 3',rows:[8,13,18,23,28,33,38,43,48]},{sheet:'B-4 PERS PROP LIAB pg 4',rows:[8,13,18,23,28,33,38,43,48]}],(s,r)=>{const name=txt(s,`C${r}`).trim(),val=num(s,`F${r}`);if(!name||val<=0)return null;return{lenderName:name,lenderAddress:txt(s,`C${r+1}`),relatedProperty:txt(s,`C${r+2}`),accountNumber:txt(s,`C${r+3}`),liabilityType:txt(s,`E${r}`)||'Loan',fullLiabilityBalance:val,wardPercent:pct(s,`G${r}`)}}),
    scheduleC1:readRows([{sheet:'C-1 INCOME pg 1',rows:[29,34,39,44,49]},{sheet:'C-1 INCOME pg 2',rows:[7,12,17,22,27,32,37,42,47]},{sheet:'C-1 INCOME pg 3',rows:[7,12,17,22,27,32,37,42,47]}],(s,r)=>{const name=txt(s,`C${r}`),val=num(s,`H${r}`);if(!name&&!val)return null;return{payerName:name,payerAddress:txt(s,`C${r+1}`),payerCityStateZip:txt(s,`C${r+2}`),typeOfIncome:txt(s,`E${r}`),frequencyOfPayment:txt(s,`G${r}`)||'Monthly',paymentBasis:txt(s,`E${r+2}`),annualIncomeAmount:val,wardPercent:pct(s,`I${r}`)}}),
    scheduleC2:readRows([{sheet:'C-2 LAWSUIT AGAINST 1',rows:[19,24,29,34,39,44]},{sheet:'C-2 LAWSUIT AGAINST pg 2',rows:[7,12,17,22,27,32,37]}],(s,r)=>{const desc=txt(s,`C${r}`),val=num(s,`F${r}`);if(!desc&&!val)return null;const parts=desc.split(' / ');return{lawsuitDescription:parts[0]||desc,caseNumber:parts[1]||'',courtJurisdiction:txt(s,`C${r+1}`),claimantName:txt(s,`C${r+2}`),claimantAddress:txt(s,`C${r+3}`),dateFiled:dt(s,`E${r}`),amountOfClaim:val,wardPercent:pct(s,`G${r}`)}}),
    scheduleC3:readRows([{sheet:'C-3 LAWSUIT BY WARD pg 1',rows:[20,25,30,35,40,45]},{sheet:'C-3 LAWSUIT BY WARD pg 2',rows:[7,12,17,22,27,32,37,42]}],(s,r)=>{const defendantName=txt(s,`B${r}`),desc=txt(s,`C${r}`),val=num(s,`F${r}`);if(!desc)return null;const parts=desc.split(' / ');return{defendantName,actionDescription:parts[0]||desc,caseNumber:parts[1]||'',status:txt(s,`C${r+1}`),courtJurisdiction:txt(s,`C${r+2}`),actionDate:dt(s,`E${r}`),estimatedSettlement:val,wardPercent:pct(s,`G${r}`)}}),
    scheduleC4:readRows([{sheet:'C-4 TRUSTS pg 1',rows:[23,28,33,38,43,48,53]},{sheet:'C-4 TRUSTS pg 2',rows:[7,12,17,22,27,32,37,42,47]}],(s,r)=>{const name=txt(s,`C${r}`),val=num(s,`I${r}`);if(!name&&!val)return null;return{trustName:name,trusteeName:txt(s,`C${r+1}`),trusteeAddress:txt(s,`C${r+2}`),trusteeCityStateZip:txt(s,`C${r+3}`),dateCreated:dt(s,`E${r}`),accountNumber:txt(s,`F${r}`),trustType:txt(s,`H${r}`)||'Pooled',trustAmount:val,wardPercent:pct(s,`J${r}`)}}),
    scheduleC5:readRows([{sheet:'C-5 JOINT OWNERS pg 1 ',rows:[19,24,29,34,39,44,49]},{sheet:'C-5 JOINT OWNERS pg 2',rows:[7,12,17,22,27,32,37,42]}],(s,r)=>{const desc=txt(s,`C${r}`),val=num(s,`F${r}`);if(!desc&&!val)return null;return{assetDescription:desc,ownerAddress:txt(s,`C${r+1}`),ownerName:txt(s,`C${r+2}`),ownerCityStateZip:txt(s,`C${r+3}`),relationshipToWard:txt(s,`E${r}`),totalAssetValue:val,jointOwnerPercent:pct(s,`G${r}`)}}),
    guardians:(()=>{const p3=ws('PART III');const gs=[];for(let i=0;i<3;i++){const b=7+i*6;const name=txt(p3,`F${b+1}`);if(!name&&i>0)continue;gs.push({signatureDate:dt(p3,`D${b}`),name,ssnEin:txt(p3,`B${b+2}`),streetAddress:txt(p3,`F${b+2}`),phone:txt(p3,`B${b+4}`),cityStateZip:txt(p3,`F${b+4}`)});}return gs.length?gs:[mk.guardian()];})(),
    preparer:(()=>{const p4=ws('PART IV');return{signatureDate:dt(p4,'G12'),name:txt(p4,'I12'),ssnEin:txt(p4,'B14'),streetAddress:txt(p4,'I14'),phone:txt(p4,'B16'),cityStateZip:txt(p4,'I16')};})(),
    attorney:(()=>{const p4=ws('PART IV');return{signatureDate:dt(p4,'G25'),filingDate:dt(p4,'G26'),name:txt(p4,'I25'),barNumber:txt(p4,'B27'),streetAddress:txt(p4,'I27'),phone:txt(p4,'B29'),cityStateZip:txt(p4,'I29')};})(),
    bondAmount:txt(ws('PART V'),'B26'),bondPeriodFrom:dt(ws('PART V'),'D27'),bondPeriodTo:dt(ws('PART V'),'F27'),bondingCompany:txt(ws('PART V'),'D28'),bondWaivedDate:txt(ws('PART V'),'G15'),
    serviceRecipients:(()=>{const p6=ws('PART VI');const all=[{name:txt(p6,'B13'),address:txt(p6,'B14'),cityStateZip:txt(p6,'B15')},{name:txt(p6,'H13'),address:txt(p6,'H14'),cityStateZip:txt(p6,'H15')},{name:txt(p6,'B19'),address:txt(p6,'B20'),cityStateZip:txt(p6,'B21')},{name:txt(p6,'H19'),address:txt(p6,'H20'),cityStateZip:txt(p6,'H21')}];const filtered=all.filter(r=>r.name||r.address||r.cityStateZip);return filtered.length>0?filtered:[mk.recipient()];})(),
    serviceDate:dt(ws('PART VI'),'G24'),
    serviceAttorney:(()=>{const p6=ws('PART VI');return{signatureDate:dt(p6,'G26'),name:txt(p6,'J27'),barNumber:txt(p6,'J29'),streetAddress:txt(p6,'J28'),phone:txt(p6,'B30'),cityStateZip:txt(p6,'J30')};})()
  };
  capitalizeImportedFields(inv);
  return inv;
}
