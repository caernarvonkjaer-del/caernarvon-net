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
//
// Milestone 73T part 3: which box of the court's workbook each field goes in,
// and how it comes back, is the Annual family's workbook contract
// (src/core/excel/workbook-contract/annual.js) -- the export writes it and the
// import reads it -- and the import is one transaction
// (src/core/excel/import-transaction.js): one confirmation before anything
// changes, a Cancel that changes nothing, a notice of what was kept. The
// filing keeps its own type (Annual, Final or Trust) whatever the workbook is
// marked. The cell addresses and the reasons behind them live with the
// contract now.
import { validateAnnual } from './index.js';
import { authorizeFilingOutput } from '../../core/filing/output-authorization.js';
import { getExcelCapacityIssues } from '../../core/excel/excel-capacity.js';
import { createIssue } from '../../core/validation/issue-registry.js';
import { resolveFilingDescriptor } from '../../core/filing/filing-descriptor.js';
import { getExcelJS, saveWorkbookFile, setCell, setDateCell } from '../../core/excel/excel-engine.js';
import { migrateBondDepository } from '../../core/filing/bond-depository.js';
import { planB4PagesToKeep, isB4RegisterSheetName, b4PageNumber, SCH_B4_ACCOUNT_BLOCKS } from '../../core/excel/b4-register-pages.js';
import { pruneSheets } from '../../core/excel/sheet-pruning.js';
import { planSchB4Export } from '../../core/excel/b4-export-plan.js';
import { writeContract } from '../../core/excel/workbook-contract/engine.js';
import { ANNUAL_CONTRACT } from '../../core/excel/workbook-contract/annual.js';
import { workbookAdapter } from '../../core/excel/workbook-contract/index.js';
import { runImportTransaction } from '../../core/excel/import-transaction.js';
import { confirmImport } from '../../core/excel/import-confirm.js';
import { recordDateDraft } from '../../core/form/commit-coordinator.js';
import { alertModal } from '../../core/ui/dialogs.js';
import { setStatus, scheduleStatusClear } from '../../core/ui/transient-status.js';
import { beginExport } from '../../core/ui/export-guard.js';
import { getImportProgressEl, validateImportFile } from '../../core/security/input-hardening.js';
import { formDisplayName } from '../../core/filing/filing-registry.js';
import { getD } from '../../core/state.js';
import { ensureTemplate } from '../../core/persistence/templates.js';
import { getCurrentPage, renderPage } from '../../core/navigation/router.js';
// Milestone 73F part 1: the capacity limits live in core (excel-caps.js) so the
// shared export checks can say what the workbook can't hold.
import { ANNUAL_EXCEL_CAPS } from '../../core/excel/excel-caps.js';
export { ANNUAL_EXCEL_CAPS };

// Continuation pages of the other schedules. Sheet names are exact, including
// the fact that some carry a trailing space in the court's file -- they are
// looked up by name, so a tidied-up spelling silently matches nothing.
//
// Every one of these is a page the contract never targets: the schedules all
// address their p1 only. The single exception is SCH A INCOME p2, which takes
// income rows 21-50, so it is prunable exactly when income has not overflowed
// p1's twenty rows. A schedule that later learns to spill onto p2 must be
// removed from this list or it will be pruned out from under its own data --
// which is why the e2e coverage asserts the written rows survive, not just
// that pages disappeared.
const ANNUAL_NEVER_WRITTEN_CONTINUATION_SHEETS = Object.freeze([
  'SCH C CAPITAL ADJ p2', 'SCH C CAPITAL ADJ p3', 'SCH C CAPITAL ADJ p4',
  'SCH D-1 CASH p2', 'SCH D-1 CASH p3', 'SCH D-1 CASH p4',
  'SCH D-2 REAL ESTATE p2',
  'SCH D-3 PERSONAL PROP p2',
  'SCH D-4 INTANGIBLE p2',
  'SCH D-5 MORTGAGES p2',
  'SCH E BANK TRANS p2', 'SCH E BANK TRANS p3', 'SCH E BANK TRANS p4',
  'SCH F-1 SALES REAL PROP p2',
  'SCH F-2 SALES PERSONAL PROP p2',
]);

/** Schedule A spills onto p2 from its twenty-first income row. */
export const SCH_A_PAGE_1_ROWS = 20;

export function unusedAnnualContinuationSheets(inv) {
  const out = ANNUAL_NEVER_WRITTEN_CONTINUATION_SHEETS.slice();
  if (((inv?.schA || []).length) <= SCH_A_PAGE_1_ROWS) out.push('SCH A INCOME p2');
  return out;
}

export async function doSaveExcel(){
  const filingDescriptor = resolveFilingDescriptor(getD()).descriptor;
  const type = filingDescriptor?.inventoryType || 'annual';
  // Schedule B-4's own limits are not a simple row cap: they depend on how
  // many bank accounts a filing has and how its disbursements divide between
  // them, so ANNUAL_EXCEL_CAPS cannot express them. planSchB4Export() works
  // that out and each refusal becomes a blocking issue here, phrased for the
  // filer. The PDF is unaffected and carries every row regardless, which is
  // what makes withholding the workbook the safe answer rather than a dead end.
  //
  // The code shape is load bearing. issue-registry.js recognises
  // `excel.capacity.<filingType>.<suffix>` and only then marks it
  // `bypassable: false`; anything else falls through to
  // validation.legacy-unmapped, which IS bypassable -- so a mis-shaped code
  // here would quietly offer the filer a "continue anyway" button that
  // produces a workbook attributing money to the wrong bank account.
  const b4Issues = planSchB4Export(getD()?.schB4, getD()?.schB4Accounts, SCH_B4_ACCOUNT_BLOCKS)
    .problems.map(p => createIssue(`excel.capacity.${type}.schB4-${p.code}`, {
      message: p.message,
      label: 'Schedule B-4 — All Other Disbursements',
      section: 'Schedule B-4 — All Other Disbursements',
      route: '/schb4',
    }));
  const capacityIssues = [
    ...getExcelCapacityIssues(type, getD(), ANNUAL_EXCEL_CAPS),
    ...b4Issues,
  ];
  const authorization = authorizeFilingOutput(getD(), () => validateAnnual(), {
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
  // Milestone 67: disables the button for the export's duration, so a second
  // click while it's still generating can't fire a second download and get
  // both blocked by the browser as "multiple files."
  const btn = beginExport('[data-annual-action="save-excel"]');
  if (!btn) return;
  try{
    const inv=getD();
    const templateB64=await ensureTemplate('annual');
    if(!templateB64){await alertModal('Template not loaded. Please import the Excel template first.');return;}

    // One plan for Schedule B-4, built before anything is written: the writer
    // and the pruner must agree on exactly which pages are in use.
    const b4Plan = planSchB4Export(inv.schB4, inv.schB4Accounts, SCH_B4_ACCOUNT_BLOCKS);

    const bin=atob(templateB64);
    const buf=new Uint8Array(bin.length);
    for(let i=0;i<bin.length;i++)buf[i]=bin.charCodeAt(i);
    const ExcelJS = await getExcelJS();
    const workbook=new ExcelJS.Workbook();
    await workbook.xlsx.load(buf.buffer);

    // Every field into its box, by the contract. setCell() keeps the
    // formula-injection guard and records each write for the export guard
    // (tests/e2e/excel-form-field-placement.spec.ts).
    writeContract(workbook, ANNUAL_CONTRACT, inv, { filingTypeValue: filingDescriptor?.filingTypeValue, b4Plan }, { setCell, setDateCell });

    // The court's workbook ships every printed page of every schedule, and the
    // writer fills only the ones a filing needs. Without this a guardian with
    // one income row and three disbursements files a workbook carrying about
    // thirty blank pages; the form's own instructions say "Remove any blank
    // pages". pruneSheets() rebuilds, in the same operation, every formula
    // that named a removed page -- each schedule's p1 total reaches into its
    // own continuation pages, so removing one on its own leaves #REF! in a
    // filed financial document. Anything it cannot rebuild safely is kept.
    const b4Keep = new Set(planB4PagesToKeep(b4Plan.usedPages, SCH_B4_ACCOUNT_BLOCKS));
    const b4Doomed = workbook.worksheets
      .map(ws => ws.name)
      .filter(n => isB4RegisterSheetName(n) && !b4Keep.has(b4PageNumber(n)));
    pruneSheets(workbook, [...b4Doomed, ...unusedAnnualContinuationSheets(inv)]);

    const wardFile=(inv.wardName||'Accounting').replace(/[^a-z0-9]/gi,'_');
    const formSlug=formDisplayName(inv.inventoryType).replace(/[^a-z0-9]/gi,'');
    await saveWorkbookFile(workbook, `${wardFile}_${formSlug}.xlsx`);
  }catch(err){
    console.error('Excel export failed:',err);
    await alertModal('Excel export failed: '+err.message);
  }finally{
    btn.disabled = false;
  }
}

export async function importExcel(input){
  const file=input.files[0]; if(!file)return;
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
        // Milestone 67B: the workbook has no cell for the bond / restricted
        // depository arrangement, so the answer this filing already had
        // stands. A blank one is read from what the workbook did carry (the
        // G9 receipt date, the bond details) -- otherwise the page would show
        // the answer those imply while the sidebar kept asking for it.
        migrateBondDepository(f);
      },
    });
    if(!result.committed){setStatus(prog,'Import cancelled — nothing was changed.');scheduleStatusClear(prog);}
  }catch(err){
    console.error('Annual Accounting import failed:',err);
    setStatus(prog,'✗ Import failed: '+(err&&err.message?err.message:'the file could not be parsed.'));
  }finally{
    input.value='';
  }
}
