// Milestone 73T part 1: each form's workbook contract, and the import adapter
// 73E's transaction takes (src/core/excel/import-transaction.js's
// runImportTransaction()).
//
// Nothing calls workbookAdapter() yet. 73T parts 2-4 move each form's
// importer onto it -- the Inventory, then the Annual family, then the
// Simplified -- which is where a filer first sees the one confirmation, a
// Cancel that changes nothing and the notice of what was kept. Until then the
// feature excel.js importers are what a filer's import does.
import { GUARDIAN_CONTRACT } from './guardian.js';
import { ANNUAL_CONTRACT } from './annual.js';
import { SIMPLIFIED_CONTRACT } from './simplified.js';
import { readContract } from './engine.js';
import { getExcelJS } from '../excel-engine.js';
import { assertWorkbookWithinLimits, sanitizeObjectDataInPlace } from '../../security/input-hardening.js';
import { capitalizeImportedFields } from '../../form/form-contract.js';
import { formEngine } from '../../filing/filing-registry.js';
import { descriptorForAccountingFilingType } from '../../filing/filing-descriptor.js';

// By form engine: the Final and Trust Accountings are the Annual's.
const CONTRACTS = Object.freeze({ guardian: GUARDIAN_CONTRACT, annual: ANNUAL_CONTRACT, simplified: SIMPLIFIED_CONTRACT });

/** The workbook contract for a filing type, or null for a type with no court workbook (the Plans). */
export function contractFor(inventoryType) {
  return CONTRACTS[formEngine(inventoryType)] || null;
}

/**
 * The filing's fields as `workbook` holds them for `inventoryType`, through
 * the import's text passes as they are today -- the name casing and the
 * character filter (73T rows 2, 11, 17 and 19; each part changes them for
 * its form, and 73T-3 keeps `"`).
 */
export function draftFromWorkbook(workbook, inventoryType, ctx = {}) {
  const contract = contractFor(inventoryType);
  if (!contract) throw new Error(`No court workbook for ${inventoryType}.`);
  const draft = readContract(workbook, contract, ctx);
  capitalizeImportedFields(draft);
  sanitizeObjectDataInPlace(draft);
  return draft;
}

/**
 * The form a workbook says it is: the Annual family's by its PART I filing
 * type box, a blank or unknown one as an Annual (73T row 4: "Amended " isn't
 * recognised yet; part 3 recognises it).
 */
export function workbookTypeOf(draft, inventoryType) {
  const contract = contractFor(inventoryType);
  if (contract !== ANNUAL_CONTRACT) return contract?.form || inventoryType;
  return descriptorForAccountingFilingType(draft.filingType)?.inventoryType || 'annual';
}

/**
 * The adapter for runImportTransaction(): opens the workbook, reads it into a
 * detached draft by the filing type's contract, and says what it doesn't
 * carry. `unboxed` names, by role, the details a different person must not
 * inherit; the Inventory's and the preparer's are nested paths, which the
 * transaction learns to clear in part 2.
 *
 * @param {{ data: ArrayBuffer | Uint8Array, sourceName?: string, inventoryType: string }} source
 */
export function workbookAdapter({ data, sourceName, inventoryType }) {
  return async () => {
    const ExcelJS = await getExcelJS();
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(data);
    assertWorkbookWithinLimits(workbook);
    const contract = contractFor(inventoryType);
    const draft = draftFromWorkbook(workbook, inventoryType);
    const unboxed = Object.fromEntries(Object.entries(contract.preserve).filter(([role]) => role !== 'guardian'));
    return { draft, sourceName, workbookType: workbookTypeOf(draft, inventoryType), notCarried: [...contract.notCarried], unboxed };
  };
}
