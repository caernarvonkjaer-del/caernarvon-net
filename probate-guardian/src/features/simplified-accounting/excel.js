// Excel import/export for Simplified Accounting. Dynamically imported once,
// alongside print.js, by index.js's ensureLazyModules() -- see that file's
// header. Statically imports back from index.js; see print.js's header for
// why that circularity is safe.
import { validateSimplified } from './index.js';
import { authorizeFilingOutput } from '../../core/filing/output-authorization.js';
import { getExcelCapacityIssues } from '../../core/excel/excel-capacity.js';
import { getExcelJS, saveWorkbookFile, setCell, setDateCell } from '../../core/excel/excel-engine.js';
import { readCellText } from '../../core/excel/cell-reader.js';
import { alertModal, confirmModal } from '../../core/ui/dialogs.js';
import { setStatus, scheduleStatusClear } from '../../core/ui/transient-status.js';
import { beginExport } from '../../core/ui/export-guard.js';

const {
  renderPage, ensureTemplate, calcTotals, guardianHasAnyData,
  getImportProgressEl, validateImportFile, assertWorkbookWithinLimits,
  capitalizeImportedFields, sanitizeObjectDataInPlace, autoSave,
  getCurrentPage,
} = window;

export const SIMPLIFIED_EXCEL_CAPS={
  guardians:{cap:3,label:'Part IV - Guardians',route:'/p4',isPopulated:guardianHasAnyData},
  remuneration:{cap:27,label:'Part VII — Remuneration',route:'/p7'},
};

function guardianSlotsFromWorkbook(sheet) {
  const text = (address) => readCellText(sheet.getCell(address));
  const slot = (signatureDate, name, ssn, phone, email, mailingStreet, mailingCityStateZip, residenceStreet, residenceCityStateZip) => ({
    name: text(name), signatureDate: text(signatureDate).substring(0, 10), ssn: text(ssn), phone: text(phone), email: text(email),
    mailingStreet: text(mailingStreet), mailingCityStateZip: text(mailingCityStateZip), residenceStreet: text(residenceStreet), residenceCityStateZip: text(residenceCityStateZip),
  });
  return [slot('D15','F15','B17','B19','B21','F17','F19','F21','F23'), slot('D25','F25','B27','B29','B31','F27','F29','F31','F33'), slot('D35','F35','B37','B39','B41','F37','F39','F41','F43')];
}

export async function doSaveExcel(){
  const capacityIssues = getExcelCapacityIssues('simplified', window.D, SIMPLIFIED_EXCEL_CAPS);
  const authorization = authorizeFilingOutput(window.D, () => validateSimplified(), {
    capability: 'excel',
    additionalIssues: capacityIssues,
  });
  if (authorization.status !== 'allowed') {
    if (authorization.status === 'blocked') {
      const capIssues = authorization.issues.filter(i => i.code?.startsWith('excel.capacity.'));
      if (capIssues.length) {
        await alertModal('Cannot export to Excel — these sections have more entries than the court\'s Excel template can hold:\n\n'
          + capIssues.map(o => `• ${o.message}`).join('\n')
          + '\n\nSave as PDF instead — the PDF includes every entry.');
      } else {
        await alertModal(`Cannot export to Excel: ${authorization.issues.length} blocking issue(s) remain.`);
      }
    }
    renderPage('/print');
    return;
  }
  // Milestone 67: disables the button for the export's duration, so a second
  // click while it's still generating can't fire a second download and get
  // both blocked by the browser as "multiple files."
  const btn = beginExport('[data-simplified-action="save-excel"]');
  if (!btn) return;
  try{
    const inv=window.D;
    const templateB64=await ensureTemplate('simplified');
    if(!templateB64){await alertModal('Template not loaded. Please import the Excel template first.');return;}

    // Dates are written through setDateCell() (Milestone 67E) -- a real Excel
    // date, not ISO text; the local string formatter that lived here is gone.
    // Milestone 51D: setCell now comes from core/excel/excel-engine.js. The local
    // closure this replaces was byte-identical in all three feature excel.js files
    // apart from a null-sheet guard, and routed text through the same
    // sanitizeForExcel() the shared version delegates to.
    const n=v=>parseFloat(v)||0;

    const bin=atob(templateB64);
    const buf=new Uint8Array(bin.length);
    for(let i=0;i<bin.length;i++)buf[i]=bin.charCodeAt(i);

    const ExcelJS=await getExcelJS();
    const workbook=new ExcelJS.Workbook();
    await workbook.xlsx.load(buf.buffer);

    const p1=workbook.getWorksheet('PARTS I, II ');
    if(p1){
      // Part I's identity block. Every label sits in column B and its value in
      // the merged D<row>:I<row> beside it. These addresses were read back out
      // of the shipped workbook with an XML parser (AGENTS.md section 10);
      // every one of them used to be written one row too low, so the ward's
      // SSN printed over the "From" label, the case number under "Attorney for
      // Guardian", the attorney under "Guardian", the guardian under "Type of
      // Guardianship", and the type of guardianship over the "Part II" heading.
      //
      // Nothing caught it because importExcel() below read the same wrong
      // cells, so the app round-tripped its own output perfectly while
      // disagreeing with the court's form on every field (AGENTS.md
      // section 13).
      setCell(p1,'C4',inv.wardName||'');
      setCell(p1,'H4',inv.caseNumber||'');
      // The period cells are r13's own merges, NOT r14's. Writing them to
      // E14/H14 put them inside the D14:I14 merge, and ExcelJS redirects a
      // write on a merged member to the merge master -- so both landed on D14
      // and destroyed the =H4 formula the workbook fills the Case Number box
      // with, leaving the period end date in its place there and on the COVER
      // page, which reads D14. The period boxes themselves printed blank.
      setDateCell(p1,'E13',inv.periodFrom);
      setDateCell(p1,'H13',inv.periodTo);
      // D12 (=C4) and D14 (=H4) are the workbook's own formulas: the ward name
      // and case number reach Part I from the header cells written above. The
      // app writes the inputs and leaves the formulas alone -- AGENTS.md
      // section 13, "never write into a formula cell".
      setCell(p1,'D15',inv.attorney||'');
      setCell(p1,'D16',inv.guardian||'');
      setCell(p1,'D17',inv.typeOfGuardianship||'');
      // The ward's SSN is deliberately not written. The court's Simplified
      // workbook has no ward-SSN field -- its only SSN cells are the
      // guardians' SSN/EIN on PARTS III, IV, which are written below. It used
      // to go to D13, which is the printed "From" label, so a required and
      // sensitive field was both destroying a label and appearing unmasked on
      // a form that never asked for it (the PDF prints it through maskSSN).
      setDateCell(p1,'F4',inv.gid);
      setCell(p1,'G2',inv.county||'');
      setCell(p1,'I5',inv.amendedForm||'');
      const t=calcTotals();
      // Part II's accounting summary. Each Line's figure goes in that Line's
      // own row, and the workbook adds them up itself:
      //
      //   Line 1  Starting Balance          H19
      //   Line 2  Interest Income           G22 -.
      //   Line 3  Deposits per Settlement   G23 -+-> H24 =SUM(G22:G23)
      //   Line 5  Service Charges           G27 -.
      //   Line 6  Federal Income Tax        G28 -+-> H29 =SUM(G27:G28)
      //   Line 8  Remaining Assets              H31 =H19+H24-H29
      //
      // Every one of these used to be written one row low, which did far more
      // than misplace them. Line 1 never reached the form at all (the balance
      // landed on the "Income" banner), Line 3 received Line 2's figure, and
      // the two figures that fell on the total rows -- deposits and federal
      // income tax -- overwrote the "Total Income" and "Total Disbursements"
      // labels AND never entered the sums, because the workbook's own SUM
      // ranges stop at G23 and G28. A filing reporting 100,000 opening,
      // 2,200 in deposits and 4,400 in tax was filed with a blank Line 1,
      // Total Income of 11, Total Disbursements of 33, and Remaining Assets
      // On Hand of -22 instead of 97,778.
      //
      // The SUM ranges are the authority for these addresses (AGENTS.md
      // section 13), and the totals stay formula-driven -- the app writes the
      // five inputs and nothing else.
      setCell(p1,'H19',n(inv.startingBalance));
      setCell(p1,'G22',n(inv.interestIncome));
      setCell(p1,'G23',n(inv.depositsSettlement));
      setCell(p1,'G27',n(inv.serviceCharges));
      setCell(p1,'G28',n(inv.federalIncomeTax));
    }

    const p34=workbook.getWorksheet('PARTS III, IV');
    if(p34){
      // The period and the guardian's name are NOT written here. C10, F10 and
      // F15 already hold the workbook's own formulas pulling them from
      // PARTS I, II (E13, H13 and D16 -- the cells written above), so writing
      // literals over them replaced live propagation with a snapshot and, on
      // C10/F10, destroyed it for every later edit. AGENTS.md section 5.
      const g1=inv.guardians[0]||{};
      setDateCell(p34,'D15',g1.signatureDate);
      setCell(p34,'B17',g1.ssn||'');
      setCell(p34,'B19',g1.phone||'');
      setCell(p34,'B21',g1.email||'');
      setCell(p34,'F17',g1.mailingStreet||'');
      setCell(p34,'F19',g1.mailingCityStateZip||'');
      setCell(p34,'F21',g1.residenceStreet||'');
      setCell(p34,'F23',g1.residenceCityStateZip||'');
      const g2=inv.guardians[1]||{};
      if(guardianHasAnyData(g2)){
        setDateCell(p34,'D25',g2.signatureDate);
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
        setDateCell(p34,'D35',g3.signatureDate);
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
      // The period, the attorney's name and the '/s/' marks are the
      // workbook's own. D12/J12 and J17/J41 carry formulas pulling from
      // PARTS I, II -- the form even labels them "[linked to Part I]" -- and
      // B17/B41 ship with '/s/' already in them. Writing the period to C12 was
      // worse than redundant: C12 sits inside the merged B11:C12, so ExcelJS
      // redirected it to B11 and it landed on the printed "from" label.
      setCell(p56,'B19',inv.attorney_barNumber||'');
      setCell(p56,'B21',inv.attorney_phone||'');
      setCell(p56,'J19',inv.attorney_street||'');
      setCell(p56,'J21',inv.attorney_cityStateZip||'');
      setDateCell(p56,'H39',inv.certServiceDate);
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
      // B41 already reads '/s/' and J41 is the "[linked to Part I]" formula --
      // see the note above the Part V signature block.
      setDateCell(p56,'H41',inv.certAttySignDate||inv.attorney_signatureDate);
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
    await saveWorkbookFile(workbook, `${ward2}_SimplifiedAccounting.xlsx`);
  }catch(err){
    console.error('Excel export failed:',err);
    await alertModal('Excel export failed: '+err.message);
  }finally{
    btn.disabled = false;
  }
}

export async function importExcel(input){
  const file=input.files[0];
  if(!file)return;
  const prog=getImportProgressEl(input);
  setStatus(prog,'Checking file…');
  const check=await validateImportFile(file,'xlsx');
  if(!check.ok){
    setStatus(prog,'✗ '+check.message);
    input.value='';
    return;
  }
  const reader=new FileReader();
  reader.onerror=()=>{
    setStatus(prog,'✗ That file could not be read.');
    input.value='';
  };
  reader.onload=async(e)=>{
    setStatus(prog,'Parsing Excel…');
    try{
      // No template-cache write here — an imported file is extracted and
      // discarded, never retained (see the note above ensureTemplate()).
      const ExcelJS=await getExcelJS();
      const workbook=new ExcelJS.Workbook();
      await workbook.xlsx.load(e.target.result);
      assertWorkbookWithinLimits(workbook);
      const p1=workbook.getWorksheet('PARTS I, II ');
      if(p1){
        const gc=addr=>readCellText(p1.getCell(addr));
        // The same addresses doSaveExcel() writes -- see the note there. Both
        // sides used to be one row low together, which is exactly why the
        // round trip looked clean.
        window.D.wardName=gc('C4');
        window.D.caseNumber=gc('H4');
        window.D.periodFrom=gc('E13').substring(0,10);
        window.D.periodTo=gc('H13').substring(0,10);
        window.D.attorney=gc('D15');
        window.D.guardian=gc('D16');
        window.D.typeOfGuardianship=gc('D17');
        // No ward SSN: the workbook has no field for it, so an import leaves
        // whatever the filing already holds rather than blanking a required
        // field the file simply has nothing to say about. Reading E14/H14 for
        // the period used to return the same value twice -- both sit inside
        // the D14:I14 merge, so both resolved to that one master cell.
        window.D.gid=gc('F4').substring(0,10);
        // Milestone 40C-A item 5: see annual-accounting/excel.js -- an imported
        // workbook with no county leaves the filing blank.
        window.D.county=gc('G2')||'';
        window.D.amendedForm=gc('I5');
        // Part II's five inputs, at the addresses the workbook's own SUM
        // ranges define -- see the note beside the writer. Both sides read one
        // row low together, which is why the round trip looked clean while
        // every figure on the filed accounting was wrong.
        window.D.startingBalance=gc('H19');
        window.D.interestIncome=gc('G22');
        window.D.depositsSettlement=gc('G23');
        window.D.serviceCharges=gc('G27');
        window.D.federalIncomeTax=gc('G28');
      }

      // PARTS III, IV — Guardians
      const p34=workbook.getWorksheet('PARTS III, IV');
      if(p34){
        const gc34=(addr)=>readCellText(p34.getCell(addr));
        const g1=window.D.guardians[0]||{};
        g1.signatureDate=gc34('D15').substring(0,10);
        // F15 is the workbook's own formula pulling Guardian #1's name from
        // PARTS I, II D16 -- the court's form treats the two as one name and
        // the exporter no longer writes over it, so this takes the value from
        // the cell that actually backs it rather than from a cached result.
        g1.name=window.D.guardian||'';
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
      if(p34){
        if(!(await confirmModal('Replace the first three guardian slots with the values from this workbook? Any additional saved guardians will be kept.'))) return;
        const overflowRows=(window.D.guardians||[]).slice(3);
        const overflowPartyIds=(window.D.guardianPartyIds||[]).slice(3);
        window.D.guardians=[...guardianSlotsFromWorkbook(p34),...overflowRows];
        window.D.guardianPartyIds=[null,null,null,...overflowPartyIds];
      }

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
      window.markFilingRevisionChanged?.('excel-import');
      setStatus(prog,'✓ Template loaded and data imported successfully.');
      scheduleStatusClear(prog);
      renderPage(getCurrentPage());
    }catch(err){
      console.error('Simplified Accounting import failed:',err);
      setStatus(prog,'✗ Import failed: '+(err&&err.message?err.message:'the file could not be parsed.'));
    }finally{
      input.value='';
    }
  };
  reader.readAsArrayBuffer(file);
}
