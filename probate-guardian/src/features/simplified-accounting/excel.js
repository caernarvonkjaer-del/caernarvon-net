// Excel import/export for Simplified Accounting. Dynamically imported once,
// alongside print.js, by index.js's ensureLazyModules() -- see that file's
// header. Statically imports back from index.js; see print.js's header for
// why that circularity is safe.
import { validateSimplified } from './index.js';

const {
  renderPage, ensureTemplate, sanitizeForExcel, calcTotals, guardianHasAnyData,
  getImportProgressEl, validateImportFile, assertWorkbookWithinLimits,
  readCellText, capitalizeImportedFields, sanitizeObjectDataInPlace, autoSave,
  getCurrentPage, checkExcelCapacity, ExcelJS,
} = window;

export const SIMPLIFIED_EXCEL_CAPS={
  remuneration:{cap:27,label:'Part VII — Remuneration',route:'/p7'},
};

export async function doSaveExcel(){
  const errors=validateSimplified();
  if(errors.length){renderPage('/print');return;}
  const capOver=checkExcelCapacity(SIMPLIFIED_EXCEL_CAPS);
  if(capOver.length){
    alert('Cannot export to Excel — these sections have more entries than the court\'s Excel template can hold:\n\n'
      +capOver.map(o=>`• ${o.label}: ${o.count} entries (template holds ${o.cap})`).join('\n')
      +'\n\nSave as PDF instead — the PDF includes every entry.');
    renderPage('/print');
    return;
  }
  try{
    const inv=window.D;
    const templateB64=await ensureTemplate('simplified');
    if(!templateB64){alert('Template not loaded. Please import the Excel template first.');return;}

    const fmtD=s=>(s&&String(s).length>=10)?String(s).substring(0,10):(s||'');
    const setCell=(sheet,addr,v)=>{const c=sheet.getCell(addr);if(v==null||v===''){c.value=null;}else if(typeof v==='number'){c.value=v;}else{c.value=sanitizeForExcel(String(v));}};
    const n=v=>parseFloat(v)||0;

    const bin=atob(templateB64);
    const buf=new Uint8Array(bin.length);
    for(let i=0;i<bin.length;i++)buf[i]=bin.charCodeAt(i);

    const workbook=new ExcelJS.Workbook();
    await workbook.xlsx.load(buf.buffer);

    const p1=workbook.getWorksheet('PARTS I, II ');
    if(p1){
      setCell(p1,'C4',inv.wardName||'');
      setCell(p1,'H4',inv.caseNumber||'');
      setCell(p1,'D13',inv.ssn||'');
      setCell(p1,'E14',fmtD(inv.periodFrom));
      setCell(p1,'H14',fmtD(inv.periodTo));
      setCell(p1,'D15',inv.caseNumber||'');
      setCell(p1,'D16',inv.attorney||'');
      setCell(p1,'D17',inv.guardian||'');
      setCell(p1,'D18',inv.typeOfGuardianship||'');
      setCell(p1,'F4',fmtD(inv.gid));
      setCell(p1,'G2',inv.county||'');
      setCell(p1,'I5',inv.amendedForm||'No');
      const t=calcTotals();
      setCell(p1,'H20',n(inv.startingBalance));
      setCell(p1,'G23',n(inv.interestIncome));
      setCell(p1,'G24',n(inv.depositsSettlement));
      setCell(p1,'G28',n(inv.serviceCharges));
      setCell(p1,'G29',n(inv.federalIncomeTax));
    }

    const p34=workbook.getWorksheet('PARTS III, IV');
    if(p34){
      setCell(p34,'C10',fmtD(inv.periodFrom));
      setCell(p34,'F10',fmtD(inv.periodTo));
      const g1=inv.guardians[0]||{};
      setCell(p34,'D15',fmtD(g1.signatureDate));
      setCell(p34,'F15',g1.name||'');
      setCell(p34,'B17',g1.ssn||'');
      setCell(p34,'B19',g1.phone||'');
      setCell(p34,'B21',g1.email||'');
      setCell(p34,'F17',g1.mailingStreet||'');
      setCell(p34,'F19',g1.mailingCityStateZip||'');
      setCell(p34,'F21',g1.residenceStreet||'');
      setCell(p34,'F23',g1.residenceCityStateZip||'');
      const g2=inv.guardians[1]||{};
      if(guardianHasAnyData(g2)){
        setCell(p34,'D25',fmtD(g2.signatureDate));
        setCell(p34,'F25',g2.name||'');
        setCell(p34,'B27',g2.ssn||'');
        setCell(p34,'B29',g2.phone||'');
        setCell(p34,'B31',g2.email||'');
        setCell(p34,'F27',g2.mailingStreet||'');
        setCell(p34,'F29',g2.mailingCityStateZip||'');
        setCell(p34,'F31',g2.residenceStreet||'');
        setCell(p34,'F33',g2.residenceCityStateZip||'');
      }
      const g3=inv.guardians[2]||{};
      if(guardianHasAnyData(g3)){
        setCell(p34,'D35',fmtD(g3.signatureDate));
        setCell(p34,'F35',g3.name||'');
        setCell(p34,'B37',g3.ssn||'');
        setCell(p34,'B39',g3.phone||'');
        setCell(p34,'B41',g3.email||'');
        setCell(p34,'F37',g3.mailingStreet||'');
        setCell(p34,'F39',g3.mailingCityStateZip||'');
        setCell(p34,'F41',g3.residenceStreet||'');
        setCell(p34,'F43',g3.residenceCityStateZip||'');
      }
    }

    const p56=workbook.getWorksheet('PARTS V, VI ');
    if(p56){
      setCell(p56,'C12',fmtD(inv.periodFrom));
      setCell(p56,'J12',fmtD(inv.periodTo));
      setCell(p56,'B17','/s/');
      setCell(p56,'J17',inv.attorney||'');
      setCell(p56,'B19',inv.attorney_barNumber||'');
      setCell(p56,'B21',inv.attorney_phone||'');
      setCell(p56,'J19',inv.attorney_street||'');
      setCell(p56,'J21',inv.attorney_cityStateZip||'');
      setCell(p56,'H39',fmtD(inv.certServiceDate));
      setCell(p56,'J39',inv.certIndicator||'');
      const r=inv.certRecipients;
      [[27,28,29,30],[27,28,29,30]].forEach((_,side)=>{
        const ri=r[side]||{};
        const col=side===0?'B':'J';
        setCell(p56,`${col}27`,ri.name||'');
        setCell(p56,`${col}28`,ri.line2||'');
        setCell(p56,`${col}29`,ri.line3||'');
      });
      [[33,34,35,36],[33,34,35,36]].forEach((_,side)=>{
        const ri=r[side+2]||{};
        const col=side===0?'B':'J';
        setCell(p56,`${col}33`,ri.name||'');
        setCell(p56,`${col}34`,ri.line2||'');
        setCell(p56,`${col}35`,ri.line3||'');
      });
      setCell(p56,'B41','/s/');
      setCell(p56,'J41',inv.attorney||'');
      setCell(p56,'H41',fmtD(inv.certAttySignDate||inv.attorney_signatureDate));
      setCell(p56,'B43',inv.certAttyBarNumber||inv.attorney_barNumber||'');
      setCell(p56,'B45',inv.certAttyPhone||inv.attorney_phone||'');
      setCell(p56,'J43',inv.certAttyStreet||inv.attorney_street||'');
      setCell(p56,'J45',inv.certAttyCityStateZip||inv.attorney_cityStateZip||'');
    }

    const p7=workbook.getWorksheet('PART VII');
    if(p7){
      const entries=(inv.remuneration||[]).filter(r=>r.guardian||r.type||r.description||r.amount);
      entries.forEach((r,i)=>{
        const row=6+i;
        if(row>32)return;
        // The court's template gives this part a single free-text column, so
        // the fields are packed into one cell. Amount goes in as a segment
        // after the type (it's disclosable remuneration — it belongs in the
        // filed document, not just the round-trip). Empty segments are
        // omitted rather than left blank, so the filed line never reads
        // "—    —"; the importer tells the layouts apart by segment count
        // plus whether the third segment is shaped like a currency figure.
        const amt=(r.amount===''||r.amount==null)?'':`$${(parseFloat(r.amount)||0).toFixed(2)}`;
        const parts=[r.guardian||'',r.type||''];
        if(amt)parts.push(amt);
        if(r.description)parts.push(r.description);
        setCell(p7,`A${row}`,parts.join('  —  '));
      });
    }

    const ward2=(inv.wardName||'SimplifiedAccounting').replace(/[^a-z0-9]/gi,'_');
    try{workbook.definedNames.model=[];}catch(e){}
    const outBuf=await workbook.xlsx.writeBuffer();
    const blob=new Blob([outBuf],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');
    a.href=url;a.download=`${ward2}_SimplifiedAccounting.xlsx`;a.click();
    URL.revokeObjectURL(url);
  }catch(err){
    console.error('Excel export failed:',err);
    alert('Excel export failed: '+err.message);
  }
}

export async function importExcel(input){
  const file=input.files[0];
  if(!file)return;
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
      const p1=workbook.getWorksheet('PARTS I, II ');
      if(p1){
        const gc=addr=>readCellText(p1.getCell(addr));
        window.D.wardName=gc('C4');
        window.D.caseNumber=gc('H4');
        window.D.ssn=gc('D13');
        window.D.periodFrom=gc('E14').substring(0,10);
        window.D.periodTo=gc('H14').substring(0,10);
        window.D.attorney=gc('D16');
        window.D.guardian=gc('D17');
        window.D.typeOfGuardianship=gc('D18');
        window.D.gid=gc('F4').substring(0,10);
        window.D.county=gc('G2')||'Pinellas';
        window.D.amendedForm=gc('I5')||'No';
        window.D.startingBalance=gc('H20');
        window.D.interestIncome=gc('G23');
        window.D.depositsSettlement=gc('G24');
        window.D.serviceCharges=gc('G28');
        window.D.federalIncomeTax=gc('G29');
      }

      // PARTS III, IV — Guardians
      const p34=workbook.getWorksheet('PARTS III, IV');
      if(p34){
        const gc34=(addr)=>readCellText(p34.getCell(addr));
        const g1=window.D.guardians[0]||{};
        g1.signatureDate=gc34('D15').substring(0,10);
        g1.name=gc34('F15');
        g1.ssn=gc34('B17');
        g1.phone=gc34('B19');
        g1.email=gc34('B21');
        g1.mailingStreet=gc34('F17');
        g1.mailingCityStateZip=gc34('F19');
        g1.residenceStreet=gc34('F21');
        g1.residenceCityStateZip=gc34('F23');
        if(!window.D.guardians[0])window.D.guardians[0]=g1;

        const g2Data=gc34('F25');
        if(g2Data){
          const g2=window.D.guardians[1]||{};
          g2.signatureDate=gc34('D25').substring(0,10);
          g2.name=g2Data;
          g2.ssn=gc34('B27');
          g2.phone=gc34('B29');
          g2.email=gc34('B31');
          g2.mailingStreet=gc34('F27');
          g2.mailingCityStateZip=gc34('F29');
          g2.residenceStreet=gc34('F31');
          g2.residenceCityStateZip=gc34('F33');
          if(!window.D.guardians[1])window.D.guardians[1]=g2;
        }

        const g3Data=gc34('F35');
        if(g3Data){
          const g3=window.D.guardians[2]||{};
          g3.signatureDate=gc34('D35').substring(0,10);
          g3.name=g3Data;
          g3.ssn=gc34('B37');
          g3.phone=gc34('B39');
          g3.email=gc34('B41');
          g3.mailingStreet=gc34('F37');
          g3.mailingCityStateZip=gc34('F39');
          g3.residenceStreet=gc34('F41');
          g3.residenceCityStateZip=gc34('F43');
          if(!window.D.guardians[2])window.D.guardians[2]=g3;
        }
      }

      // PARTS V, VI — Attorney and Certificate of Service
      const p56=workbook.getWorksheet('PARTS V, VI ');
      if(p56){
        const gc56=(addr)=>readCellText(p56.getCell(addr));
        // Part V (the attorney's own signature block) lives at B19/B21/J19/
        // J21; Part VI (certificate of service) repeats the attorney at
        // B43/B45/J43/J45. These are separate blocks and can legitimately
        // differ, so each is read from its own cells — falling back to the
        // Part VI copy only when Part V is blank, which is how hand-filled
        // forms and pre-fix exports tend to arrive.
        window.D.attorney_barNumber=gc56('B19')||gc56('B43');
        window.D.attorney_phone=gc56('B21')||gc56('B45');
        window.D.attorney_street=gc56('J19')||gc56('J43');
        window.D.attorney_cityStateZip=gc56('J21')||gc56('J45');
        window.D.certServiceDate=gc56('H39').substring(0,10);
        window.D.certIndicator=gc56('J39');
        const attySignDate=gc56('H41').substring(0,10);
        window.D.certAttySignDate=attySignDate;
        // The template exposes only one attorney signature-date cell (H41),
        // which the export fills from certAttySignDate falling back to
        // attorney_signatureDate. Mirroring it back into both keeps the value
        // from being dropped entirely on a round-trip.
        window.D.attorney_signatureDate=attySignDate;
        window.D.certAttyBarNumber=gc56('B43');
        window.D.certAttyPhone=gc56('B45');
        window.D.certAttyStreet=gc56('J43');
        window.D.certAttyCityStateZip=gc56('J45');

        // Certificate recipients
        const r=window.D.certRecipients||[];
        r[0]=r[0]||{};
        r[0].name=gc56('B27');
        r[0].line2=gc56('B28');
        r[0].line3=gc56('B29');
        r[1]=r[1]||{};
        r[1].name=gc56('J27');
        r[1].line2=gc56('J28');
        r[1].line3=gc56('J29');
        r[2]=r[2]||{};
        r[2].name=gc56('B33');
        r[2].line2=gc56('B34');
        r[2].line3=gc56('B35');
        r[3]=r[3]||{};
        r[3].name=gc56('J33');
        r[3].line2=gc56('J34');
        r[3].line3=gc56('J35');
        window.D.certRecipients=r;
      }

      // PART VII — Remuneration
      const p7=workbook.getWorksheet('PART VII');
      if(p7){
        const gc7=(addr)=>readCellText(p7.getCell(addr));
        window.D.remuneration=[];
        for(let row=6;row<=32;row++){
          const val=gc7(`A${row}`);
          if(val){
            // Parse the combined "guardian — type — amount — description"
            // cell. Files exported before the amount was included carry the
            // description in position 2 instead, so detect which layout this
            // is by shape — that keeps older backups importing correctly.
            const parts=val.split('  —  ');
            const looksLikeAmount=s=>/^\$?\s*[\d,]+(\.\d{1,2})?$/.test(String(s||'').trim());
            const money=s=>String(s).replace(/[^0-9.]/g,'');
            let amount='',description='';
            if(parts.length>=4){
              // guardian — type — amount — description
              if(looksLikeAmount(parts[2]))amount=money(parts[2]);
              description=parts[3]||'';
            }else if(parts.length===3){
              // Third segment is either the amount (description omitted) or
              // the description (no amount, or a pre-fix 3-segment file).
              if(looksLikeAmount(parts[2]))amount=money(parts[2]);
              else description=parts[2];
            }
            window.D.remuneration.push({
              guardian:parts[0]||'',
              type:parts[1]||'',
              amount,
              description
            });
          }
        }
      }

      capitalizeImportedFields(window.D);
      // capitalizeImportedFields only reformats fields whose name looks like
      // a name/address (see its own keyword list) — it happens to strip
      // <>"'` from those via formatName/formatAddress, but fields outside
      // that list (caseNumber, county, amendedForm, ssn, remuneration…)
      // never went through any of that. This is the same stripping
      // importExcelFile already applies to every field via sanitizeObjectData;
      // in-place because window.D is the live object saveData() persists.
      sanitizeObjectDataInPlace(window.D);
      autoSave();
      if(prog)prog.textContent='✓ Template loaded and data imported successfully.';
      setTimeout(()=>{if(prog)prog.textContent='';},3000);
      renderPage(getCurrentPage());
    }catch(err){
      console.error('Simplified Accounting import failed:',err);
      if(prog)prog.textContent='✗ Import failed: '+(err&&err.message?err.message:'the file could not be parsed.');
    }finally{
      input.value='';
    }
  };
  reader.readAsArrayBuffer(file);
}
