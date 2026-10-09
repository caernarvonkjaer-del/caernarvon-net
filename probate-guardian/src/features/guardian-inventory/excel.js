// Excel import/export for Guardian Inventory (Milestone 8, Phase B).
// Dynamically imported from ./index.js, together with print.js, at first
// mount -- see that file's ensureLazyModules() comment for why.
//
// Statically imports validateGuardian back from ./index.js -- safe despite
// index.js dynamically importing this file, since neither side needs the
// other's export until a function body actually runs, well after both are
// loaded (see src/features/simplified-accounting/excel.js's comment on the
// same pattern).
//
// Milestone 73T part 2: which box of the court's workbook each field goes in,
// and how it comes back, is the Inventory's workbook contract
// (src/core/excel/workbook-contract/guardian.js) -- the export writes it and
// the import reads it, and the import is one transaction
// (src/core/excel/import-transaction.js): one confirmation before anything
// changes, a Cancel that changes nothing, and a notice of what was kept. The
// page tables, the captions above PART III's boxes, the share conversion and
// the reasons behind each address live with the contract now.
import { validateGuardian } from './index.js';
import { authorizeFilingOutput } from '../../core/filing/output-authorization.js';
import { getExcelCapacityIssues } from '../../core/excel/excel-capacity.js';
import { getExcelJS, saveWorkbookFile, setCell, setDateCell } from '../../core/excel/excel-engine.js';
import { bondStateFromWorkbook, normalizeBondDepositoryState } from '../../core/filing/bond-depository.js';
import { pruneSheets } from '../../core/excel/sheet-pruning.js';
import { unusedGuardianContinuationSheets } from '../../core/excel/guardian-inventory-pages.js';
import { writeContract } from '../../core/excel/workbook-contract/engine.js';
import { GUARDIAN_CONTRACT } from '../../core/excel/workbook-contract/guardian.js';
import { excelOmissions, workbookAdapter } from '../../core/excel/workbook-contract/index.js';
import { excelOmissionsQuestion, outputRefusal } from '../../core/filing/output-reasons.js';
import { runImportTransaction } from '../../core/excel/import-transaction.js';
import { confirmImport } from '../../core/excel/import-confirm.js';
import { recordDateDraft } from '../../core/form/commit-coordinator.js';
import { alertModal, confirmModal } from '../../core/ui/dialogs.js';
import { setStatus, scheduleStatusClear } from '../../core/ui/transient-status.js';
import { beginExport } from '../../core/ui/export-guard.js';
import { getImportProgressEl, validateImportFile } from '../../core/security/input-hardening.js';
import { getD } from '../../core/state.js';
import { ensureTemplate } from '../../core/persistence/templates.js';
import { navigate, renderPage } from '../../core/navigation/router.js';
import { DRAW } from '../../core/navigation/draw-reason.js';
// Milestone 73F part 1: the capacity limits live in core (excel-caps.js) so the
// shared export checks can say what the workbook can't hold.
import { GUARDIAN_EXCEL_CAPS } from '../../core/excel/excel-caps.js';
export { GUARDIAN_EXCEL_CAPS };

export async function doSaveExcel(){
  const capacityIssues = getExcelCapacityIssues('guardian', getD(), GUARDIAN_EXCEL_CAPS);
  const authorization = authorizeFilingOutput(getD(), () => validateGuardian(), {
    capability: 'excel',
    additionalIssues: capacityIssues,
  });
  if (authorization.status !== 'allowed') {
    // Milestone 73M step 5 / 74C: Save as Excel stays clickable and the click
    // says why it can't go on -- a capacity limit, or requirements still
    // outstanding (it used to redraw Preview and say nothing).
    const capIssues = authorization.issues.filter(i => i.code?.startsWith('excel.capacity.'));
    if (capIssues.length) {
      await alertModal('Cannot export to Excel — these schedules have more entries than the court\'s Excel template can hold:\n\n'
        + capIssues.map(o => `• ${o.message}`).join('\n')
        + '\n\nSave as PDF instead — the PDF includes every entry.');
    } else {
      await alertModal(outputRefusal(authorization, 'Excel'));
    }
    renderPage('/print', { reason: DRAW.PREVIEW });
    return;
  }
  // Milestone 73M (decisions 73M-1 and 73M-2): what the filer must file
  // another way -- A-2's Notes, the Lines 20/30 explanation -- is asked about
  // here; the rest of what the workbook has no box for is said on the page.
  const fileElsewhere = excelOmissions(getD()).filter((o) => o.warn);
  if (fileElsewhere.length && !(await confirmModal({ title: 'Not in the Excel workbook', message: excelOmissionsQuestion(fileElsewhere), confirmLabel: 'Save the workbook' }))) return;
  // Milestone 67: disables the button for the export's duration, so a second
  // click while it's still generating can't fire a second download and get
  // both blocked by the browser as "multiple files."
  const btn = beginExport('[data-inventory-action="save-excel"]');
  if (!btn) return;
  const stat=document.getElementById('export-status');
  setStatus(stat,'Preparing Excel export…');
  try{
    const inv=getD();
    const templateB64=await ensureTemplate('guardian');
    if(!templateB64){await alertModal('Template not loaded. Please import the Excel template first.');return;}

    setStatus(stat,'Loading template…');
    const bin=atob(templateB64);
    const buf=new Uint8Array(bin.length);
    for(let i=0;i<bin.length;i++)buf[i]=bin.charCodeAt(i);

    const ExcelJS = await getExcelJS();
    const workbook=new ExcelJS.Workbook();
    await workbook.xlsx.load(buf.buffer);

    // Every field into its box, by the contract. setCell() keeps the
    // formula-injection guard and records each write for the export guard
    // (tests/e2e/excel-form-field-placement.spec.ts).
    writeContract(workbook, GUARDIAN_CONTRACT, inv, {}, { setCell, setDateCell });

    // The court's workbook ships every printed page of every schedule, and the
    // writer fills only the ones a filing reaches. Without this an inventory
    // listing a house, two bank accounts and a car is filed with 21 blank
    // pages of pre-printed grid; the form's own instructions say to remove
    // them. pruneSheets() rebuilds, in the same operation, every formula that
    // named a removed page -- each schedule's page-1 total reaches into its own
    // continuation pages, so removing one on its own leaves #REF! in a filed
    // financial document. Anything it cannot rebuild safely is kept.
    //
    // Re-import is unaffected: the contract's reader skips a page that is not
    // in the file, so a pruned workbook reads back exactly the entries it was
    // written with.
    pruneSheets(workbook, unusedGuardianContinuationSheets(inv));

    setStatus(stat,'Writing file…');
    const stem=(inv.wardName||'GuardianInventory').trim().replace(/\s+/g,'_');
    await saveWorkbookFile(workbook, `${stem}_InitialInventory.xlsx`);
    setStatus(stat,'✓ Exported!');
  }catch(e){
    console.error(e);
    setStatus(stat,'❌ '+e.message);
  }finally{
    btn.disabled = false;
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
    const data=await file.arrayBuffer();
    const filing=getD();
    const adapter=workbookAdapter({ data, sourceName: file.name, inventoryType: filing.inventoryType, filing });
    let read=null;
    // No template cache write here — see the note above ensureTemplate(): an
    // imported file is never retained past this parse, so the app's own
    // bundled blank template is what every later "Export as Excel" uses.
    const result=await runImportTransaction({
      filing,
      adapter: async () => (read = await adapter()),
      confirmChoices: (plan) => { setStatus(prog,''); return confirmImport(plan, { sourceName: file.name }); },
      redraw: () => navigate('/', { reason: DRAW.SWITCH }),
      notify: (notice) => alertModal({ title: 'Import complete', message: notice }),
      afterCommit: (f) => {
        // Milestone 73T part 2 (row 19): a date cell holding text no reader
        // understands (a free-text date from before Milestone 67B) comes back
        // as a date still being typed -- shown in its box and named at
        // Preview -- not as a blank.
        for (const d of read?.dateDrafts || []) recordDateDraft({ data: f, path: d.path, rawValue: d.text, section: 'Imported from Excel' });
        // Milestone 67B: the workbook has no cell for the bond / restricted
        // depository arrangement, so an answer this filing already had stands.
        // Milestone 73M: a blank one is read from what the workbook carried
        // (the G15 waiver date) only where one arrangement alone could
        // have produced it; otherwise it stays blank for the filer to choose
        // (it used to be guessed -- an Inventory with a bond and a restricted
        // depository came back as "Bond only").
        if (!normalizeBondDepositoryState(f.bondDepositoryState)) f.bondDepositoryState = bondStateFromWorkbook(read?.draft, 'guardian');
      },
    });
    if(!result.committed){setStatus(prog,'Import cancelled — nothing was changed.');scheduleStatusClear(prog);}
  }catch(e){
    console.error('Initial Inventory import failed:',e);
    setStatus(prog,'✗ Import failed: '+(e&&e.message?e.message:'the file could not be parsed.'));
  }finally{
    input.value='';
  }
}
