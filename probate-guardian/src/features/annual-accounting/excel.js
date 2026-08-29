// Excel import/export for Annual Accounting (Milestone 7, Phase B).
// Dynamically imported from ./index.js, together with print.js, at first
// mount -- see that file's ensureLazyModules() comment for why. Also covers
// the finalAccounting/trustAccounting aliases (formEngine() routing, no
// separate code path here).
//
// Statically imports validateAnnual back from ./index.js -- safe despite
// index.js dynamically importing this file, since neither side needs the
// other's export until a function body actually runs, well after both are
// loaded (see src/features/simplified-accounting/excel.js's comment on the
// same pattern).
import { validateAnnual } from './index.js';

const {
  renderPage, ensureTemplate, sanitizeForExcel, calcTotalsAnnual,
  annualReconcileState, guardianHasAnyData, formDisplayName,
  getImportProgressEl, validateImportFile, assertWorkbookWithinLimits,
  readCellText, unwrapCellValue, capitalizeImportedFields,
  sanitizeObjectDataInPlace, autoSave, getCurrentPage, checkExcelCapacity,
  ExcelJS, r2,
} = window;

// Line 20 (net assets computed from the accounting) and Line 30 (net assets
// from the Schedule D listings) -- moved here from legacy-app.js's top
// level (near formEngine()) since this is the only caller.
const ANNUAL_P67_CELLS = {
  line20: null,      // e.g. 'I20' — net assets computed from the accounting
  line30: null,      // e.g. 'I30' — net assets from the Schedule D listings
  explanation: null  // cell for the written explanation of a difference
};

export const ANNUAL_EXCEL_CAPS={
  schA:{cap:50,label:'Schedule A — Income',route:'/scha'}, // 20 on p1 + 30 on p2 (SCH A INCOME p2)
  schB1:{cap:24,label:'Schedule B-1 — Attorney Fees',route:'/schb1'},
  schB2:{cap:24,label:'Schedule B-2 — Guardian Fees',route:'/schb2'},
  schB3:{cap:24,label:'Schedule B-3 — Other Court-Ordered Disbursements',route:'/schb3'},
  schB4:{cap:25,label:'Schedule B-4 — All Other Disbursements',route:'/schb4'},
  schC:{cap:6,label:'Schedule C — Capital Adjustments',route:'/schc'},
  schD1:{cap:11,label:'Schedule D-1 — Cash Assets',route:'/schd1'},
  schD2:{cap:8,label:'Schedule D-2 — Real Estate',route:'/schd2'},
  schD3:{cap:4,label:'Schedule D-3 — Personal Property',route:'/schd3'},
  schD4:{cap:9,label:'Schedule D-4 — Intangible Assets',route:'/schd4'},
  schD5:{cap:7,label:'Schedule D-5 — Mortgages / Loans / Liabilities',route:'/schd5'},
  schE:{cap:27,label:'Schedule E — Bank Transfers',route:'/sche'},
  schF1:{cap:8,label:'Schedule F-1 — Sales of Real Property',route:'/schf1'},
  schF2:{cap:11,label:'Schedule F-2 — Sales of Personal Property',route:'/schf2'},
  remuneration:{cap:25,label:'Part XI — Remuneration',route:'/p11'},
};
export async function doSaveExcel(){
  const errors=validateAnnual(); if(errors.length){renderPage('/print');return;}
  // Backstop for the disabled Save-as-Excel button: silently dropping
  // entries from a court filing is bad enough that it's worth refusing
  // here too, in case this is ever reached by another path.
  const capOver=checkExcelCapacity(ANNUAL_EXCEL_CAPS);
  if(capOver.length){
    alert('Cannot export to Excel — these schedules have more entries than the court\'s Excel template can hold:\n\n'
      +capOver.map(o=>`• ${o.label}: ${o.count} entries (template holds ${o.cap})`).join('\n')
      +'\n\nSave as PDF instead — the PDF includes every entry.');
    renderPage('/print');
    return;
  }
  try{
    const inv=window.D;
    const templateB64=await ensureTemplate('annual');
    if(!templateB64){alert('Template not loaded. Please import the Excel template first.');return;}

    const setCell=(sheet,addr,v)=>{const c=sheet.getCell(addr);if(v==null||v===''){c.value=null;}else if(typeof v==='number'){c.value=v;}else{c.value=sanitizeForExcel(String(v));}};
    const fD=s=>(s&&String(s).length>=10)?String(s).substring(0,10):(s||'');
    const nv=v=>parseFloat(v)||0;
    const pv=v=>{const p=parseFloat(v);return isNaN(p)?0:p>1?p/100:p;};

    const bin=atob(templateB64);
    const buf=new Uint8Array(bin.length);
    for(let i=0;i<bin.length;i++)buf[i]=bin.charCodeAt(i);
    const workbook=new ExcelJS.Workbook();
    await workbook.xlsx.load(buf.buffer);

    // PART I
    const p1=workbook.getWorksheet('PART I');
    if(p1){
      setCell(p1,'C5',inv.wardName); setCell(p1,'I5',inv.caseNumber);
      setCell(p1,'F5',fD(inv.gid));
      setCell(p1,'E18',fD(inv.periodFrom)); setCell(p1,'H18',fD(inv.periodTo));
      setCell(p1,'D20',inv.guardian); setCell(p1,'D21',inv.attorney);
      setCell(p1,'D22',inv.typeOfGuardianship);
      setCell(p1,'J6',inv.amendedForm); setCell(p1,'H4',inv.filingType);
      setCell(p1,'I12',inv.relatedCaseNumbers);
      setCell(p1,'D23',inv.county||'');
    }

    // PART II, III
    const p23=workbook.getWorksheet('PART II, III');
    if(p23){
      // Starting balance goes in Part VI/VII but Part II doesn't have a cell for it in the template
      const g1=inv.guardians[0]||{};
      const g2=inv.guardians[1]||{};
      const g3=inv.guardians[2]||{};
      setCell(p23,'C22',fD(inv.periodFrom)); setCell(p23,'F22',fD(inv.periodTo));
      // Guardian 1
      setCell(p23,'D25',fD(g1.signatureDate)); setCell(p23,'F25',g1.name||'');
      setCell(p23,'B27',g1.ssn||''); setCell(p23,'B29',g1.phone||''); setCell(p23,'B31',g1.email||'');
      setCell(p23,'F27',g1.mailingStreet||''); setCell(p23,'F29',g1.mailingCityStateZip||'');
      setCell(p23,'F31',g1.officeStreet||''); setCell(p23,'F33',g1.officeCityStateZip||'');
      // Guardian 2
      if(guardianHasAnyData(g2)){
        setCell(p23,'D35',fD(g2.signatureDate)); setCell(p23,'F35',g2.name||'');
        setCell(p23,'B37',g2.ssn||''); setCell(p23,'B39',g2.phone||''); setCell(p23,'B41',g2.email||'');
        setCell(p23,'F37',g2.mailingStreet||''); setCell(p23,'F39',g2.mailingCityStateZip||'');
        setCell(p23,'F41',g2.officeStreet||''); setCell(p23,'F43',g2.officeCityStateZip||'');
      }
      // Guardian 3
      if(guardianHasAnyData(g3)){
        setCell(p23,'D45',fD(g3.signatureDate)); setCell(p23,'F45',g3.name||'');
        setCell(p23,'B47',g3.ssn||''); setCell(p23,'B49',g3.phone||''); setCell(p23,'B51',g3.email||'');
        setCell(p23,'F47',g3.mailingStreet||''); setCell(p23,'F49',g3.mailingCityStateZip||'');
        setCell(p23,'F51',g3.officeStreet||''); setCell(p23,'F53',g3.officeCityStateZip||'');
      }
    }

    // PART IV, V
    const p45=workbook.getWorksheet('PART IV, V');
    if(p45){
      const p=inv.preparer;
      setCell(p45,'D11',fD(inv.periodFrom)); setCell(p45,'J11',fD(inv.periodTo));
      // Signature date columns: D is inside the merged "Preparer's/Attorney
      // Signature" label cell (B:G); the real Date value lives at H.
      setCell(p45,'J15',p.name||''); setCell(p45,'H15',fD(p.signatureDate));
      setCell(p45,'B17',p.ssn||''); setCell(p45,'B19',p.phone||'');
      setCell(p45,'J17',p.street||''); setCell(p45,'J19',p.cityStateZip||'');
      setCell(p45,'D26',fD(inv.periodFrom)); setCell(p45,'J26',fD(inv.periodTo));
      setCell(p45,'H31',fD(inv.attorney_signatureDate));
      setCell(p45,'B33',inv.attorney_bar||''); setCell(p45,'B35',inv.attorney_phone||'');
      setCell(p45,'J33',inv.attorney_street||''); setCell(p45,'J35',inv.attorney_cityStateZip||'');
    }

    // PART VI, VII — Starting balance
    const p67=workbook.getWorksheet('PART VI, VII ');
    if(p67){
      setCell(p67,'I8',nv(inv.startingBalance));
      // Line 20 / Line 30 are computed by this app but the court's own
      // template also has cells for them, and they must agree. Addresses
      // live in ANNUAL_P67_CELLS so they can be set from the real template
      // rather than guessed; any left null is simply skipped, so an unknown
      // address can never write a total into the wrong cell of a filing.
      const t67=calcTotalsAnnual();
      if(ANNUAL_P67_CELLS.line20) setCell(p67,ANNUAL_P67_CELLS.line20,nv(t67.netAssets));
      if(ANNUAL_P67_CELLS.line30) setCell(p67,ANNUAL_P67_CELLS.line30,nv(t67.netAssetsFromD));
      const rec67=annualReconcileState(t67);
      if(ANNUAL_P67_CELLS.explanation&&rec67.outOfBalance){
        setCell(p67,ANNUAL_P67_CELLS.explanation,rec67.explanation);
      }
    }

    // Schedule A — income rows
    // Real template header (SCH A INCOME p1, row17): C/D=Income Source
    // (Payer) [merged], E=Description, F=Bank Deposited, G=Account #,
    // H=Ward's Income Amount. description/bank/accountNo were previously
    // one column left of where they belong (description landed in the
    // merged payer cell D; bank/account# were swapped into E/F).
    const schA=workbook.getWorksheet('SCH A INCOME p1');
    if(schA){
      inv.schA.forEach((r,i)=>{
        if(i<20){const row=21+i; setCell(schA,`C${row}`,r.payer||''); setCell(schA,`E${row}`,r.description||''); setCell(schA,`F${row}`,r.bank||''); setCell(schA,`G${row}`,r.accountNo||''); setCell(schA,`H${row}`,nv(r.amount));}
      });
    }
    const schA2=workbook.getWorksheet('SCH A INCOME p2');
    if(schA2){
      inv.schA.forEach((r,i)=>{
        if(i>=20&&i<50){const row=8+(i-20); setCell(schA2,`C${row}`,r.payer||''); setCell(schA2,`E${row}`,r.description||''); setCell(schA2,`F${row}`,r.bank||''); setCell(schA2,`G${row}`,r.accountNo||''); setCell(schA2,`H${row}`,nv(r.amount));}
      });
    }

    // Schedule B-1 — attorney fees. Real header (row8): C/D=Bank Account #
    // [merged], E=Check #, F=Period From, G=Period To, H=Date Paid,
    // I=Payee, J=Court Order Date, K=Amount. Every field from checkNo
    // onward was previously one column left of where it belongs.
    const sb1=workbook.getWorksheet('SCH B-1 ATTORNEY FEES');
    if(sb1){
      inv.schB1.forEach((r,i)=>{
        if(i<24){const row=10+i; setCell(sb1,`C${row}`,r.bankAcct||''); setCell(sb1,`E${row}`,r.checkNo||''); setCell(sb1,`F${row}`,fD(r.periodFrom)); setCell(sb1,`G${row}`,fD(r.periodTo)); setCell(sb1,`H${row}`,fD(r.datePaid)); setCell(sb1,`I${row}`,r.payee||''); setCell(sb1,`J${row}`,fD(r.courtOrderDate)); setCell(sb1,`K${row}`,nv(r.amount));}
      });
    }

    // Schedule B-2 — guardian fees (same layout as B-1)
    const sb2=workbook.getWorksheet('SCH B-2 GUARDIAN FEES');
    if(sb2){
      inv.schB2.forEach((r,i)=>{
        if(i<24){const row=10+i; setCell(sb2,`C${row}`,r.bankAcct||''); setCell(sb2,`E${row}`,r.checkNo||''); setCell(sb2,`F${row}`,fD(r.periodFrom)); setCell(sb2,`G${row}`,fD(r.periodTo)); setCell(sb2,`H${row}`,fD(r.datePaid)); setCell(sb2,`I${row}`,r.payee||''); setCell(sb2,`J${row}`,fD(r.courtOrderDate)); setCell(sb2,`K${row}`,nv(r.amount));}
      });
    }

    // Schedule B-3 — court-ordered. Real header: C/D=Bank Account # [merged],
    // E=Check #, F=Date Paid, G=Payee, H=Court Order Date, I=Amount.
    const sb3=workbook.getWorksheet('SCH B-3 OTHER CO DISB');
    if(sb3){
      inv.schB3.forEach((r,i)=>{
        if(i<24){const row=10+i; setCell(sb3,`C${row}`,r.bankAcct||''); setCell(sb3,`E${row}`,r.checkNo||''); setCell(sb3,`F${row}`,fD(r.datePaid)); setCell(sb3,`G${row}`,r.payee||''); setCell(sb3,`H${row}`,fD(r.courtOrderDate)); setCell(sb3,`I${row}`,nv(r.amount));}
      });
    }

    // Schedule B-4 — other disbursements (write to pages p2-p3 only)
    const sb4p2=workbook.getWorksheet('SCH B-4 OTHER DISB p2');
    if(sb4p2){
      inv.schB4.forEach((r,i)=>{
        if(i<25){const row=20+i; setCell(sb4p2,`C${row}`,r.checkNo||''); setCell(sb4p2,`D${row}`,fD(r.datePaid)); setCell(sb4p2,`E${row}`,r.category||''); setCell(sb4p2,`G${row}`,r.payee||''); setCell(sb4p2,`I${row}`,nv(r.amount));}
      });
    }

    // Schedule C — capital adjustments
    const scC=workbook.getWorksheet('SCH C CAPITAL ADJ p1');
    if(scC){
      inv.schC.forEach((r,i)=>{
        if(i<6){const row=31+(i*4); setCell(scC,`C${row}`,r.description||''); setCell(scC,`E${row}`,fD(r.date)); setCell(scC,`F${row}`,nv(r.gain)); setCell(scC,`G${row}`,nv(r.loss));}
      });
    }

    // Schedule D-1 — cash assets. Real header: C/D=Asset Description
    // [merged], E=Account #, F=Restricted?, G=Type?, H=Full Asset Amount,
    // I=Ward's %. accountNo previously landed in D, inside the merged
    // description cell, so it was never actually visible in the export.
    const sd1=workbook.getWorksheet('SCH D-1 CASH p1');
    if(sd1){
      inv.schD1.forEach((r,i)=>{
        if(i<11){const row=25+(i*3); setCell(sd1,`C${row}`,r.description||''); setCell(sd1,`E${row}`,r.accountNo||''); setCell(sd1,`F${row}`,r.restricted||'No'); setCell(sd1,`G${row}`,r.type||''); setCell(sd1,`H${row}`,nv(r.fullAmount)); setCell(sd1,`I${row}`,pv(r.wardPct));}
      });
    }

    // Schedule D-2 — real estate
    const sd2=workbook.getWorksheet('SCH D-2 REAL ESTATE p1');
    if(sd2){
      inv.schD2.forEach((r,i)=>{
        if(i<8){const row=20+(i*4); setCell(sd2,`C${row}`,r.description||''); setCell(sd2,`E${row}`,r.residence||'No'); setCell(sd2,`F${row}`,r.income||'No'); setCell(sd2,`G${row}`,nv(r.fullValue)); setCell(sd2,`H${row}`,pv(r.wardPct)); setCell(sd2,`I${row}`,nv(r.carryingValue));}
      });
    }

    // Schedule D-3 — personal property
    const sd3=workbook.getWorksheet('SCH D-3 PERSONAL PROP p1');
    if(sd3){
      inv.schD3.forEach((r,i)=>{
        if(i<4){const row=31+(i*4); setCell(sd3,`C${row}`,r.description||''); setCell(sd3,`F${row}`,nv(r.fullAmount)); setCell(sd3,`G${row}`,pv(r.wardPct)); setCell(sd3,`H${row}`,nv(r.carryingValue));}
      });
    }

    // Schedule D-4 — intangibles
    const sd4=workbook.getWorksheet('SCH D-4 INTANGIBLE p1 ');
    if(sd4){
      inv.schD4.forEach((r,i)=>{
        if(i<9){const row=18+(i*4); setCell(sd4,`C${row}`,r.description||''); setCell(sd4,`F${row}`,r.restricted||'No'); setCell(sd4,`G${row}`,nv(r.fullAmount)); setCell(sd4,`H${row}`,pv(r.wardPct)); setCell(sd4,`I${row}`,nv(r.carryingValue));}
      });
    }

    // Schedule D-5 — liabilities. Real header: C/D=Description [merged],
    // E=Loan or Account #, F=Type?, G=Full Debt Amount, H=Ward's %.
    const sd5=workbook.getWorksheet('SCH D-5 MORTGAGES p1');
    if(sd5){
      inv.schD5.forEach((r,i)=>{
        if(i<7){const row=23+(i*4); setCell(sd5,`C${row}`,r.description||''); setCell(sd5,`E${row}`,r.loanNo||''); setCell(sd5,`F${row}`,r.loanType||''); setCell(sd5,`G${row}`,nv(r.fullDebt)); setCell(sd5,`H${row}`,pv(r.wardPct));}
      });
    }

    // Schedule E — bank transfers. Real header: C/D=Bank Name/Account #
    // [merged], E=Transfer In Date, F=Transfer In Amount, G=Transfer Out
    // Date, H=Transfer Out Amount. transferInDate previously landed in D,
    // inside the merged bank-name cell, so it never actually appeared.
    const seE=workbook.getWorksheet('SCH E BANK TRANS p1');
    if(seE){
      inv.schE.forEach((r,i)=>{
        if(i<27){const row=14+i; setCell(seE,`C${row}`,r.bankName||''); setCell(seE,`E${row}`,fD(r.transferInDate)); setCell(seE,`F${row}`,nv(r.transferInAmt)); setCell(seE,`G${row}`,fD(r.transferOutDate)); setCell(seE,`H${row}`,nv(r.transferOutAmt));}
      });
    }

    // Schedule F-1 — sales real property. Real header: C/D/E=Description of
    // Sale [merged], F=Bank, G=Account #, H=Court Order Date, I=Sale Price.
    // bank/accountNo/courtOrderDate were previously each one column left
    // (bank landed inside the merged description cell E).
    const sf1=workbook.getWorksheet('SCH F-1 SALES REAL PROP p1');
    if(sf1){
      inv.schF1.forEach((r,i)=>{
        if(i<8){const row=19+(i*5); setCell(sf1,`C${row}`,r.description||''); setCell(sf1,`F${row}`,r.bank||''); setCell(sf1,`G${row}`,r.accountNo||''); setCell(sf1,`H${row}`,fD(r.courtOrderDate)); setCell(sf1,`I${row}`,nv(r.salePrice));}
      });
    }

    // Schedule F-2 — sales personal property (same layout as F-1)
    const sf2=workbook.getWorksheet('SCH F-2 SALES PERSONAL PROP p1');
    if(sf2){
      inv.schF2.forEach((r,i)=>{
        if(i<11){const row=17+(i*4); setCell(sf2,`C${row}`,r.description||''); setCell(sf2,`F${row}`,r.bank||''); setCell(sf2,`G${row}`,r.accountNo||''); setCell(sf2,`H${row}`,fD(r.courtOrderDate)); setCell(sf2,`I${row}`,nv(r.salePrice));}
      });
    }

    // Part VIII — trusts. Real layout (confirmed via the template's own
    // merge ranges): "does the ward have any trust" is a single GLOBAL
    // question at D8 (merged D:G) — not one cell per trust. Each trust's
    // own fields (name/trustee/account/date/type/%/amount) are merged
    // D:H (or D:G) ranges, so the value belongs at the D anchor, not H —
    // writing to H previously landed inside the merged cell and never
    // showed. createdAfterGID is the one field that really does live at H
    // (confirmed via its Yes/No data-validation list attached to H10/20/30).
    const p8=workbook.getWorksheet('PART VIII');
    if(p8){
      setCell(p8,'D8',(inv.trusts.some(t=>t.hasTrust==='Yes'))?'Yes':'No');
      const trustRows=[[10,12,13,14,15,16,17,18],[20,22,23,24,25,26,27,28],[30,32,33,34,35,36,37,38]];
      inv.trusts.forEach((t,i)=>{
        const rows=trustRows[i];
        setCell(p8,`H${rows[0]}`,t.createdAfterGID||'No');
        setCell(p8,`D${rows[1]}`,t.name||'');
        setCell(p8,`D${rows[2]}`,t.trustee||'');
        setCell(p8,`D${rows[3]}`,t.accountNo||'');
        setCell(p8,`D${rows[4]}`,fD(t.dateCreated));
        setCell(p8,`D${rows[5]}`,t.trustType||'');
        setCell(p8,`D${rows[6]}`,t.wardPct||'');
        setCell(p8,`D${rows[7]}`,nv(t.wardAmount));
      });
    }

    // Part IX — bond. Real header merges: G8:H8 (Guardian's Relationship
    // value, anchor G), G9:H9 (Restricted Depository Receipt Date, anchor
    // G), B20:G20 label / H20 value (Bond Amount, already correct),
    // "From:"/E21 value / "To:"/G21 value (Bond Period), D22:H22
    // (Bonding Company, anchor D).
    const p9=workbook.getWorksheet('PART IX ');
    if(p9){
      setCell(p9,'G8',inv.guardianRelationship||'');
      setCell(p9,'G9',fD(inv.restrictedDepositoryReceiptDate));
      setCell(p9,'H20',nv(inv.bondAmount));
      setCell(p9,'E21',fD(inv.bondPeriodFrom));
      setCell(p9,'G21',fD(inv.bondPeriodTo));
      setCell(p9,'D22',inv.bondingCompany||'');
    }

    // Part X — cert of service. Recipients (B/I column anchors, rows
    // 11-14/17-20) were already correctly mapped. certDate/certIndicator/
    // certAttySignDate were not: the "Date"/"Indicate if:" labels sit one
    // row ABOVE their merged value cells (G23:I23 and K23:L23 respectively,
    // confirmed via the template's merge ranges), and certAttySignDate's
    // real value cell is G25 (anchor of G25:I25), not H25.
    const p10=workbook.getWorksheet('PART X');
    if(p10){
      const r=inv.certRecipients;
      setCell(p10,'B11',r[0]&&r[0].name||''); setCell(p10,'B12',r[0]&&r[0].line2||''); setCell(p10,'B13',r[0]&&r[0].line3||''); setCell(p10,'B14',r[0]&&r[0].line4||'');
      setCell(p10,'I11',r[1]&&r[1].name||''); setCell(p10,'I12',r[1]&&r[1].line2||''); setCell(p10,'I13',r[1]&&r[1].line3||''); setCell(p10,'I14',r[1]&&r[1].line4||'');
      setCell(p10,'B17',r[2]&&r[2].name||''); setCell(p10,'B18',r[2]&&r[2].line2||''); setCell(p10,'B19',r[2]&&r[2].line3||''); setCell(p10,'B20',r[2]&&r[2].line4||'');
      setCell(p10,'I17',r[3]&&r[3].name||''); setCell(p10,'I18',r[3]&&r[3].line2||''); setCell(p10,'I19',r[3]&&r[3].line3||''); setCell(p10,'I20',r[3]&&r[3].line4||'');
      setCell(p10,'G23',fD(inv.certDate));
      setCell(p10,'K23',inv.certIndicator||'');
      setCell(p10,'G25',fD(inv.certAttySignDate));
    }

    // Part XI — remuneration
    const p11=workbook.getWorksheet('PART XI');
    if(p11){
      const entries=(inv.remuneration||[]).filter(r=>r.guardian||r.type||r.amount||r.description);
      entries.forEach((r,i)=>{
        const row=16+i;
        if(row>40)return;
        setCell(p11,`B${row}`,r.guardian||'');
        setCell(p11,`D${row}`,r.type||'');
        setCell(p11,`F${row}`,r.description||'');
        setCell(p11,`I${row}`,nv(r.amount));
      });
    }

    const wardFile=(inv.wardName||'Accounting').replace(/[^a-z0-9]/gi,'_');
    const formSlug=formDisplayName(inv.inventoryType).replace(/[^a-z0-9]/gi,'');
    try{workbook.definedNames.model=[];}catch(e){}
    const outBuf=await workbook.xlsx.writeBuffer();
    const blob=new Blob([outBuf],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');
    a.href=url;a.download=`${wardFile}_${formSlug}.xlsx`;a.click();
    URL.revokeObjectURL(url);
  }catch(err){
    console.error('Excel export failed:',err);
    alert('Excel export failed: '+err.message);
  }
}
export async function importExcel(input){
  const file=input.files[0]; if(!file)return;
  const prog=getImportProgressEl(input);
  if(prog)prog.textContent='Checking file…';
  const check=await validateImportFile(file,'xlsx');
  if(!check.ok){
    if(prog)prog.textContent='✗ '+check.message;
    input.value='';
    return;
  }
  const reader=new FileReader();
  reader.onerror=()=>{
    if(prog)prog.textContent='✗ That file could not be read.';
    input.value='';
  };
  reader.onload=async(e)=>{
    if(prog)prog.textContent='Parsing Excel…';
    try{
      // No template-cache write here — an imported file is extracted and
      // discarded, never retained (see the note above ensureTemplate()).
      const workbook=new ExcelJS.Workbook();
      await workbook.xlsx.load(e.target.result);
      assertWorkbookWithinLimits(workbook);

      // Cell readers. Court templates aren't all filled the same way —
      // a date cell may come back as a real Date (typed into Excel
      // natively), an ISO string, or US-format text (a form typed by
      // hand, or copied between templates) — so dates are normalized to
      // this app's internal YYYY-MM-DD rather than assumed to be one
      // format. Plain gcv()/gcStr() intentionally do NOT do this
      // normalization: only fields the app treats as dates should have
      // it applied. gcv resolves formula/richtext/hyperlink/error shapes
      // via unwrapCellValue (see IMPORTED FILE HARDENING above) rather
      // than only unwrapping {formula,result} the way this used to.
      const gcv=(ws,addr)=>ws?unwrapCellValue(ws.getCell(addr).value):null;
      const gcStr=(ws,addr)=>ws?readCellText(ws.getCell(addr)):'';
      const gcDate=(ws,addr)=>{
        const v=gcv(ws,addr);
        if(v==null||v==='')return '';
        if(v instanceof Date)return v.toISOString().slice(0,10);
        const s=String(v).trim();
        let m=s.match(/^(\d{4})-(\d{2})-(\d{2})/); if(m)return `${m[1]}-${m[2]}-${m[3]}`;
        m=s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/); if(m)return `${m[3]}-${m[1].padStart(2,'0')}-${m[2].padStart(2,'0')}`;
        m=s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2})$/); if(m){const yy=+m[3];return `${yy<50?2000+yy:1900+yy}-${m[1].padStart(2,'0')}-${m[2].padStart(2,'0')}`;}
        return '';
      };
      const gcNum=(ws,addr)=>{const v=gcv(ws,addr);if(v==null||v==='')return '';const n=typeof v==='number'?v:parseFloat(v);return isNaN(n)?'':n;};
      // Inverse of the export's pv(): a percentage cell holds a decimal
      // fraction (1 = 100%) when typed as a real Excel percentage, so
      // values <=1 are scaled back up to match this app's convention of
      // storing wardPct as a plain number (50, not 0.5).
      const gcPct=(ws,addr)=>{const v=gcv(ws,addr);if(v==null||v==='')return '';const n=typeof v==='number'?v:parseFloat(v);if(isNaN(n))return '';return n<=1?String(r2(n*100)):String(n);};
      const rowHasData=(...vals)=>vals.some(v=>v!=null&&String(v).trim()!=='');

      const D=window.D;

      // PART I — cover
      const p1=workbook.getWorksheet('PART I');
      if(p1){
        D.wardName=gcStr(p1,'C5');
        D.caseNumber=gcStr(p1,'I5');
        D.gid=gcDate(p1,'F5');
        D.periodFrom=gcDate(p1,'E18');
        D.periodTo=gcDate(p1,'H18');
        D.guardian=gcStr(p1,'D20');
        D.attorney=gcStr(p1,'D21');
        D.typeOfGuardianship=gcStr(p1,'D22');
        D.amendedForm=gcStr(p1,'J6')||'No';
        D.filingType=gcStr(p1,'H4')||'Annual';
        D.county=gcStr(p1,'D23')||'Pinellas';
        D.relatedCaseNumbers=gcStr(p1,'I12');
      }

      // PART II, III — starting balance carries no cell of its own here
      // (it's on Part VI/VII), but the up-to-3 guardians do.
      const p23=workbook.getWorksheet('PART II, III');
      if(p23){
        const guardianRows=[[25,27,29,31,33],[35,37,39,41,43],[45,47,49,51,53]];
        D.guardians=guardianRows.map(rows=>{
          const [sigRow,ssnRow,phoneRow,emailRow,streetRow]=rows;
          return {
            name:gcStr(p23,`F${sigRow}`), signatureDate:gcDate(p23,`D${sigRow}`),
            ssn:gcStr(p23,`B${ssnRow}`), mailingStreet:gcStr(p23,`F${ssnRow}`),
            phone:gcStr(p23,`B${phoneRow}`), mailingCityStateZip:gcStr(p23,`F${phoneRow}`),
            email:gcStr(p23,`B${emailRow}`), officeStreet:gcStr(p23,`F${emailRow}`),
            officeCityStateZip:gcStr(p23,`F${streetRow}`), signatureDateLabel:''
          };
        }).filter((g,i)=>i===0||guardianHasAnyData(g));
        while(D.guardians.length<1)D.guardians.push({name:'',ssn:'',phone:'',email:'',mailingStreet:'',mailingCityStateZip:'',officeStreet:'',officeCityStateZip:'',signatureDate:'',signatureDateLabel:''});
      }

      // PART IV, V — preparer and attorney
      const p45=workbook.getWorksheet('PART IV, V');
      if(p45){
        D.preparer={
          name:gcStr(p45,'J15'), signatureDate:gcDate(p45,'H15'),
          ssn:gcStr(p45,'B17'), phone:gcStr(p45,'B19'),
          street:gcStr(p45,'J17'), cityStateZip:gcStr(p45,'J19')
        };
        D.attorney_signatureDate=gcDate(p45,'H31');
        D.attorney_bar=gcStr(p45,'B33'); D.attorney_phone=gcStr(p45,'B35');
        D.attorney_street=gcStr(p45,'J33'); D.attorney_cityStateZip=gcStr(p45,'J35');
      }

      // PART VI, VII — only the starting balance is a real input; every
      // other cell on this sheet is a formula computed FROM the schedules.
      const p67=workbook.getWorksheet('PART VI, VII ');
      if(p67) D.startingBalance=gcNum(p67,'I8');

      // Schedule A — income (p1: rows 21-40, p2: rows 8-37)
      const schA=workbook.getWorksheet('SCH A INCOME p1');
      const schA2=workbook.getWorksheet('SCH A INCOME p2');
      if(schA){
        D.schA=[];
        for(let row=21;row<=40;row++){
          const payer=gcStr(schA,`C${row}`),desc=gcStr(schA,`E${row}`),bank=gcStr(schA,`F${row}`),acct=gcStr(schA,`G${row}`),amt=gcNum(schA,`H${row}`);
          if(rowHasData(payer,desc,amt))D.schA.push({payer,description:desc,bank,accountNo:acct,amount:amt});
        }
        if(schA2)for(let row=8;row<=37;row++){
          const payer=gcStr(schA2,`C${row}`),desc=gcStr(schA2,`E${row}`),bank=gcStr(schA2,`F${row}`),acct=gcStr(schA2,`G${row}`),amt=gcNum(schA2,`H${row}`);
          if(rowHasData(payer,desc,amt))D.schA.push({payer,description:desc,bank,accountNo:acct,amount:amt});
        }
      }

      // Schedule B-1 / B-2 — attorney/guardian fees (same layout)
      const importFeeSchedule=(ws)=>{
        const rows=[];
        if(!ws)return rows;
        for(let row=10;row<=33;row++){
          const bankAcct=gcStr(ws,`C${row}`),checkNo=gcStr(ws,`E${row}`),payee=gcStr(ws,`I${row}`),amt=gcNum(ws,`H${row}`);
          if(rowHasData(bankAcct,checkNo,payee,amt))rows.push({
            bankAcct,checkNo,periodFrom:gcDate(ws,`F${row}`),periodTo:gcDate(ws,`G${row}`),
            datePaid:gcDate(ws,`H${row}`),payee,courtOrderDate:gcDate(ws,`J${row}`),amount:gcNum(ws,`K${row}`)
          });
        }
        return rows;
      };
      D.schB1=importFeeSchedule(workbook.getWorksheet('SCH B-1 ATTORNEY FEES'));
      D.schB2=importFeeSchedule(workbook.getWorksheet('SCH B-2 GUARDIAN FEES'));

      // Schedule B-3 — other court-ordered disbursements
      const sb3=workbook.getWorksheet('SCH B-3 OTHER CO DISB');
      D.schB3=[];
      if(sb3)for(let row=10;row<=33;row++){
        const bankAcct=gcStr(sb3,`C${row}`),checkNo=gcStr(sb3,`E${row}`),payee=gcStr(sb3,`G${row}`),amt=gcNum(sb3,`I${row}`);
        if(rowHasData(bankAcct,checkNo,payee,amt))D.schB3.push({bankAcct,checkNo,datePaid:gcDate(sb3,`F${row}`),payee,courtOrderDate:gcDate(sb3,`H${row}`),amount:amt});
      }

      // Schedule B-4 — the check-register page (p2) is this app's only
      // input surface for it; pages 3+ exist in the real template for
      // overflow beyond 25 entries, matching ANNUAL_EXCEL_CAPS.schB4.
      const sb4=workbook.getWorksheet('SCH B-4 OTHER DISB p2');
      D.schB4=[];
      if(sb4)for(let row=20;row<=44;row++){
        const checkNo=gcStr(sb4,`C${row}`),payee=gcStr(sb4,`G${row}`),amt=gcNum(sb4,`I${row}`);
        if(rowHasData(checkNo,payee,amt))D.schB4.push({checkNo,datePaid:gcDate(sb4,`D${row}`),category:gcStr(sb4,`E${row}`),payee,amount:amt});
      }

      // Schedule C — capital adjustments
      const scC=workbook.getWorksheet('SCH C CAPITAL ADJ p1');
      D.schC=[];
      if(scC)for(let i=0;i<6;i++){
        const row=31+(i*4);
        const desc=gcStr(scC,`C${row}`),gain=gcNum(scC,`F${row}`),loss=gcNum(scC,`G${row}`);
        if(rowHasData(desc,gain,loss))D.schC.push({description:desc,date:gcDate(scC,`E${row}`),gain,loss});
      }

      // Schedule D-1 — cash assets
      const sd1=workbook.getWorksheet('SCH D-1 CASH p1');
      D.schD1=[];
      if(sd1)for(let i=0;i<11;i++){
        const row=25+(i*3);
        const desc=gcStr(sd1,`C${row}`),amt=gcNum(sd1,`H${row}`);
        if(rowHasData(desc,amt))D.schD1.push({description:desc,accountNo:gcStr(sd1,`E${row}`),restricted:gcStr(sd1,`F${row}`)||'No',type:gcStr(sd1,`G${row}`),fullAmount:amt,wardPct:gcPct(sd1,`I${row}`),restrictedAmt:''});
      }

      // Schedule D-2 — real estate
      const sd2=workbook.getWorksheet('SCH D-2 REAL ESTATE p1');
      D.schD2=[];
      if(sd2)for(let i=0;i<8;i++){
        const row=20+(i*4);
        const desc=gcStr(sd2,`C${row}`),val=gcNum(sd2,`G${row}`);
        if(rowHasData(desc,val))D.schD2.push({description:desc,residence:gcStr(sd2,`E${row}`)||'No',income:gcStr(sd2,`F${row}`)||'No',fullValue:val,wardPct:gcPct(sd2,`H${row}`),carryingValue:gcNum(sd2,`I${row}`),wardValue:''});
      }

      // Schedule D-3 — personal property
      const sd3=workbook.getWorksheet('SCH D-3 PERSONAL PROP p1');
      D.schD3=[];
      if(sd3)for(let i=0;i<4;i++){
        const row=31+(i*4);
        const desc=gcStr(sd3,`C${row}`),amt=gcNum(sd3,`F${row}`);
        if(rowHasData(desc,amt))D.schD3.push({description:desc,fullAmount:amt,wardPct:gcPct(sd3,`G${row}`),carryingValue:gcNum(sd3,`H${row}`),wardAmount:''});
      }

      // Schedule D-4 — intangibles
      const sd4=workbook.getWorksheet('SCH D-4 INTANGIBLE p1 ');
      D.schD4=[];
      if(sd4)for(let i=0;i<9;i++){
        const row=18+(i*4);
        const desc=gcStr(sd4,`C${row}`),amt=gcNum(sd4,`G${row}`);
        if(rowHasData(desc,amt))D.schD4.push({description:desc,restricted:gcStr(sd4,`F${row}`)||'No',fullAmount:amt,wardPct:gcPct(sd4,`H${row}`),carryingValue:gcNum(sd4,`I${row}`),wardValue:'',restrictedAmt:''});
      }

      // Schedule D-5 — mortgages / liabilities
      const sd5=workbook.getWorksheet('SCH D-5 MORTGAGES p1');
      D.schD5=[];
      if(sd5)for(let i=0;i<7;i++){
        const row=23+(i*4);
        const desc=gcStr(sd5,`C${row}`),debt=gcNum(sd5,`G${row}`);
        if(rowHasData(desc,debt))D.schD5.push({description:desc,loanNo:gcStr(sd5,`E${row}`),loanType:gcStr(sd5,`F${row}`),fullDebt:debt,wardPct:gcPct(sd5,`H${row}`),wardBalance:''});
      }

      // Schedule E — bank transfers
      const seE=workbook.getWorksheet('SCH E BANK TRANS p1');
      D.schE=[];
      if(seE)for(let row=14;row<=40;row++){
        const bankName=gcStr(seE,`C${row}`),inAmt=gcNum(seE,`F${row}`),outAmt=gcNum(seE,`H${row}`);
        if(rowHasData(bankName,inAmt,outAmt))D.schE.push({bankName,transferInDate:gcDate(seE,`E${row}`),transferInAmt:inAmt,transferOutDate:gcDate(seE,`G${row}`),transferOutAmt:outAmt});
      }

      // Schedule F-1 / F-2 — sales (same layout)
      const importSalesSchedule=(ws,startRow,step,maxCount)=>{
        const rows=[];
        if(!ws)return rows;
        for(let i=0;i<maxCount;i++){
          const row=startRow+(i*step);
          const desc=gcStr(ws,`C${row}`),price=gcNum(ws,`I${row}`);
          if(rowHasData(desc,price))rows.push({description:desc,bank:gcStr(ws,`F${row}`),accountNo:gcStr(ws,`G${row}`),courtOrderDate:gcDate(ws,`H${row}`),salePrice:price});
        }
        return rows;
      };
      D.schF1=importSalesSchedule(workbook.getWorksheet('SCH F-1 SALES REAL PROP p1'),19,5,8);
      D.schF2=importSalesSchedule(workbook.getWorksheet('SCH F-2 SALES PERSONAL PROP p1'),17,4,11);

      // Part VIII — trusts. "Has any trust" is a single global answer;
      // per-trust fields live at the D-anchor of each merged range.
      const p8=workbook.getWorksheet('PART VIII');
      if(p8){
        const trustRows=[[10,12,13,14,15,16,17,18],[20,22,23,24,25,26,27,28],[30,32,33,34,35,36,37,38]];
        const hasAnyTrust=gcStr(p8,'D8')==='Yes';
        D.trusts=trustRows.map(rows=>{
          const [gidRow,nameRow,trusteeRow,acctRow,dateRow,typeRow,pctRow,amtRow]=rows;
          return {
            hasTrust:hasAnyTrust?'Yes':'No', createdAfterGID:gcStr(p8,`H${gidRow}`)||'No',
            name:gcStr(p8,`D${nameRow}`), trustee:gcStr(p8,`D${trusteeRow}`),
            accountNo:gcStr(p8,`D${acctRow}`), dateCreated:gcDate(p8,`D${dateRow}`),
            trustType:gcStr(p8,`D${typeRow}`), wardPct:gcStr(p8,`D${pctRow}`), wardAmount:gcNum(p8,`D${amtRow}`)
          };
        });
      }

      // Part IX — bond
      const p9=workbook.getWorksheet('PART IX ');
      if(p9){
        D.guardianRelationship=gcStr(p9,'G8')||D.guardianRelationship;
        D.restrictedDepositoryReceiptDate=gcDate(p9,'G9');
        D.bondAmount=gcNum(p9,'H20');
        D.bondPeriodFrom=gcDate(p9,'E21');
        D.bondPeriodTo=gcDate(p9,'G21');
        D.bondingCompany=gcStr(p9,'D22');
      }

      // Part X — certificate of service
      const p10=workbook.getWorksheet('PART X');
      if(p10){
        D.certRecipients=[
          {name:gcStr(p10,'B11'),line2:gcStr(p10,'B12'),line3:gcStr(p10,'B13'),line4:gcStr(p10,'B14')},
          {name:gcStr(p10,'I11'),line2:gcStr(p10,'I12'),line3:gcStr(p10,'I13'),line4:gcStr(p10,'I14')},
          {name:gcStr(p10,'B17'),line2:gcStr(p10,'B18'),line3:gcStr(p10,'B19'),line4:gcStr(p10,'B20')},
          {name:gcStr(p10,'I17'),line2:gcStr(p10,'I18'),line3:gcStr(p10,'I19'),line4:gcStr(p10,'I20')}
        ];
        D.certDate=gcDate(p10,'G23');
        D.certIndicator=gcStr(p10,'K23');
        D.certAttySignDate=gcDate(p10,'G25');
      }

      // Part XI — remuneration is deliberately NOT imported. Both the
      // guardian-filled file and the blank 2022 official template show
      // this sheet holding only the declaratory paragraph (single A:G
      // merges) with no actual entry grid anywhere in it — there is no
      // reliable cell range to read entries back from.

      capitalizeImportedFields(D);
      // See the matching note in importExcelSimplified: capitalizeImportedFields
      // only reaches name/address-shaped fields, so this closes the gap for
      // caseNumber, county, filingType, amendedForm, the trust fields, and
      // the D-1/D-2/D-4 restricted/residence/income columns — none of which
      // that keyword list matches. In-place because D is window.D itself.
      sanitizeObjectDataInPlace(D);
      autoSave();
      if(prog)prog.textContent='✓ Template loaded and data imported successfully.';
      setTimeout(()=>{if(prog)prog.textContent='';},3000);
      renderPage(getCurrentPage());
    }catch(err){
      console.error('Annual Accounting import failed:',err);
      if(prog)prog.textContent='✗ Import failed: '+(err&&err.message?err.message:'the file could not be parsed.');
    }finally{
      input.value='';
    }
  };
  reader.readAsArrayBuffer(file);
}
