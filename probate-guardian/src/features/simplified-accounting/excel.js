// Excel import/export for Simplified Accounting. Dynamically imported once,
// alongside print.js, by index.js's ensureLazyModules() -- see that file's
// header. Statically imports back from index.js; see print.js's header for
// why that circularity is safe.
//
// Milestone 73T part 4: which box of the court's workbook each field goes in,
// and how it comes back, is the Simplified's workbook contract
// (src/core/excel/workbook-contract/simplified.js) -- the export writes it and
// the import reads it -- and the import is one transaction
// (src/core/excel/import-transaction.js): one confirmation before anything
// changes, a Cancel that changes nothing, a notice of what was kept. (The
// import used to write the cover and Part II before asking "Replace the first
// three guardian slots…?", and its Cancel left all of that in the filing.) The
// cell addresses and the reasons behind them live with the contract now.
import { validateSimplified } from './index.js';
import { authorizeFilingOutput } from '../../core/filing/output-authorization.js';
import { getExcelCapacityIssues } from '../../core/excel/excel-capacity.js';
import { getExcelJS, saveWorkbookFile, setCell, setDateCell } from '../../core/excel/excel-engine.js';
import { writeContract } from '../../core/excel/workbook-contract/engine.js';
import { SIMPLIFIED_CONTRACT } from '../../core/excel/workbook-contract/simplified.js';
import { workbookAdapter } from '../../core/excel/workbook-contract/index.js';
import { runImportTransaction } from '../../core/excel/import-transaction.js';
import { confirmImport } from '../../core/excel/import-confirm.js';
import { recordDateDraft } from '../../core/form/commit-coordinator.js';
import { alertModal } from '../../core/ui/dialogs.js';
import { setStatus, scheduleStatusClear } from '../../core/ui/transient-status.js';
import { beginExport } from '../../core/ui/export-guard.js';
import { getImportProgressEl, validateImportFile } from '../../core/security/input-hardening.js';
import { getD } from '../../core/state.js';
import { ensureTemplate } from '../../core/persistence/templates.js';
import { getCurrentPage, renderPage } from '../../core/navigation/router.js';
// Milestone 73F part 1: the capacity limits live in core (excel-caps.js) so the
// shared export checks can say what the workbook can't hold.
import { SIMPLIFIED_EXCEL_CAPS } from '../../core/excel/excel-caps.js';
export { SIMPLIFIED_EXCEL_CAPS };

export async function doSaveExcel(){
  const capacityIssues = getExcelCapacityIssues('simplified', getD(), SIMPLIFIED_EXCEL_CAPS);
  const authorization = authorizeFilingOutput(getD(), () => validateSimplified(), {
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
    const inv=getD();
    const templateB64=await ensureTemplate('simplified');
    if(!templateB64){await alertModal('Template not loaded. Please import the Excel template first.');return;}

    const bin=atob(templateB64);
    const buf=new Uint8Array(bin.length);
    for(let i=0;i<bin.length;i++)buf[i]=bin.charCodeAt(i);
    const ExcelJS=await getExcelJS();
    const workbook=new ExcelJS.Workbook();
    await workbook.xlsx.load(buf.buffer);

    // Every field into its box, by the contract. setCell() keeps the
    // formula-injection guard and records each write for the export guard
    // (tests/e2e/excel-form-field-placement.spec.ts).
    writeContract(workbook, SIMPLIFIED_CONTRACT, inv, {}, { setCell, setDateCell });

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
  try{
    setStatus(prog,'Checking file…');
    const check=await validateImportFile(file,'xlsx');
    if(!check.ok){setStatus(prog,'✗ '+check.message);return;}
    setStatus(prog,'Reading file…');
    const data=await file.arrayBuffer();
    const filing=getD();
    const adapter=workbookAdapter({ data, sourceName: file.name, inventoryType: filing.inventoryType, filing });
    let read=null;
    // No template-cache write here — an imported file is extracted and
    // discarded, never retained (see the note above ensureTemplate()).
    const result=await runImportTransaction({
      filing,
      adapter: async () => (read = await adapter()),
      confirmChoices: (plan) => { setStatus(prog,''); return confirmImport(plan, { sourceName: file.name }); },
      redraw: () => renderPage(getCurrentPage()),
      notify: (notice) => alertModal({ title: 'Import complete', message: notice }),
      afterCommit: (f) => {
        // Milestone 73T: a date cell holding text no reader understands comes
        // back as a date still being typed -- shown in its box and named at
        // Preview -- not as a blank.
        for (const d of read?.dateDrafts || []) recordDateDraft({ data: f, path: d.path, rawValue: d.text, section: 'Imported from Excel' });
      },
    });
    if(!result.committed){setStatus(prog,'Import cancelled — nothing was changed.');scheduleStatusClear(prog);}
  }catch(err){
    console.error('Simplified Accounting import failed:',err);
    setStatus(prog,'✗ Import failed: '+(err&&err.message?err.message:'the file could not be parsed.'));
  }finally{
    input.value='';
  }
}
