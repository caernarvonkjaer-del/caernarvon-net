// Milestone 73T part 1: each form's workbook contract, and the import adapter
// 73E's transaction takes (src/core/excel/import-transaction.js's
// runImportTransaction()).
//
// 73T parts 2-4 move each form's importer onto it -- the Inventory (part 2),
// then the Annual family, then the Simplified -- which is where a filer sees
// the one confirmation, a Cancel that changes nothing and the notice of what
// was kept. A form's contract carries a `casing` table once its importer has
// moved; until then its text passes are the ones its own importer runs.
import { GUARDIAN_CONTRACT } from './guardian.js';
import { ANNUAL_CONTRACT, WORKBOOK_FILING_TYPE } from './annual.js';
import { SIMPLIFIED_CONTRACT } from './simplified.js';
import { getPath, readContract } from './engine.js';
import { getExcelJS } from '../excel-engine.js';
import { assertWorkbookWithinLimits, sanitizeImportedText, sanitizeObjectDataInPlace } from '../../security/input-hardening.js';
import { capitalizeImportedFields, formatAddress, formatCityStateZip, formatName } from '../../form/form-contract.js';
import { formEngine } from '../../filing/filing-registry.js';
import { descriptorForAccountingFilingType } from '../../filing/filing-descriptor.js';

// By form engine: the Final and Trust Accountings are the Annual's.
const CONTRACTS = Object.freeze({ guardian: GUARDIAN_CONTRACT, annual: ANNUAL_CONTRACT, simplified: SIMPLIFIED_CONTRACT });

/** The workbook contract for a filing type, or null for a type with no court workbook (the Plans). */
export function contractFor(inventoryType) {
  return CONTRACTS[formEngine(inventoryType)] || null;
}

const FORMAT = Object.freeze({ name: formatName, address: formatAddress, zip: formatCityStateZip });

// Each value at a dotted pattern ('guardians.*.name'), in place.
function eachAt(obj, keys, fn) {
  if (obj == null || typeof obj !== 'object') return;
  const [k, ...rest] = keys;
  const targets = k === '*' ? (Array.isArray(obj) ? obj.map((_, i) => i) : []) : [k];
  for (const t of targets) {
    if (!rest.length) { if (typeof obj[t] === 'string' && obj[t]) obj[t] = fn(obj[t]); } else eachAt(obj[t], rest, fn);
  }
}

// Every string in the draft, in place.
function eachString(obj, fn) {
  if (Array.isArray(obj)) obj.forEach((v, i) => { if (typeof v === 'string') obj[i] = fn(v); else eachString(v, fn); });
  else if (obj && typeof obj === 'object') for (const k of Object.keys(obj)) { if (typeof obj[k] === 'string') obj[k] = fn(obj[k]); else eachString(obj[k], fn); }
}

function deletePath(obj, dotted) {
  const keys = String(dotted).split('.');
  const parent = keys.slice(0, -1).reduce((v, k) => (v == null ? undefined : v[k]), obj);
  if (parent && typeof parent === 'object') delete parent[keys[keys.length - 1]];
}

/**
 * Text read from the workbook, as the import keeps it (73T part 2): the
 * quotation mark kept (73T-3, row 11); the apostrophe the export puts before
 * text starting = + - @ to keep Excel from reading it as a formula taken off
 * again (row 17); and the casing typing gives the field, field by field, and
 * no other (row 19).
 */
function importedText(draft, casing) {
  eachString(draft, (s) => sanitizeImportedText(s.replace(/^'(?=[=+\-@\t\r\n])/, '')));
  for (const [kind, patterns] of Object.entries(casing)) {
    for (const pattern of patterns) eachAt(draft, pattern.split('.'), FORMAT[kind]);
  }
}

/**
 * The filing's fields as `workbook` holds them for `inventoryType`, through
 * the import's text passes, with what the draft alone can't say:
 * `rowSources` (the filing row each kept guardian came from) and
 * `dateDrafts` (date cells holding text no reader understands, brought back
 * as dates still being typed). `filing` is the filing the import goes into: a
 * field the contract fills only when blank (the Inventory's D-2 attorney
 * name) is left out of the draft when the filing has one.
 */
export function readWorkbookDraft(workbook, inventoryType, { filing = null, ctx = {} } = {}) {
  const contract = contractFor(inventoryType);
  if (!contract) throw new Error(`No court workbook for ${inventoryType}.`);
  const report = {};
  const draft = readContract(workbook, contract, { ...ctx, filing }, report);
  // The Annual family's filing-type box says what the workbook is marked; it
  // is never a filing field (the filing keeps its own type, 73E-N2).
  const typeBox = draft[WORKBOOK_FILING_TYPE];
  delete draft[WORKBOOK_FILING_TYPE];
  if (contract.casing) {
    for (const entry of contract.entries) {
      if (entry.fillBlankOnly && filing && String(getPath(filing, entry.path) ?? '').trim()) deletePath(draft, entry.path);
    }
    contract.reconcile?.(draft, filing);
    importedText(draft, contract.casing);
  } else {
    // A form whose importer hasn't moved yet: its passes as they are today
    // (73T rows 2, 11, 17 and 19, fixed as each part connects its form).
    capitalizeImportedFields(draft);
    sanitizeObjectDataInPlace(draft);
  }
  return { draft, rowSources: report.rowSources, dateDrafts: report.unreadableDates, workbookType: workbookTypeOf(typeBox, inventoryType) };
}

/** The draft alone (readWorkbookDraft()'s), for callers that need nothing else. */
export function draftFromWorkbook(workbook, inventoryType, ctx = {}) {
  return readWorkbookDraft(workbook, inventoryType, { ctx }).draft;
}

/**
 * The form a workbook says it is. The Annual family's says it in PART I's
 * filing-type box: Annual, Final or Trust is that filing type; the Clerk's
 * "Amended " is an amended filing of this filing's own type (Pinellas Clerk
 * practice, 2026-10-07); a blank or unknown box says nothing ('').
 */
export function workbookTypeOf(filingTypeBox, inventoryType) {
  const contract = contractFor(inventoryType);
  if (contract !== ANNUAL_CONTRACT) return contract?.form || inventoryType;
  const box = String(filingTypeBox ?? '').trim();
  if (/^amended$/i.test(box)) return inventoryType;
  return descriptorForAccountingFilingType(box)?.inventoryType || '';
}

/**
 * The adapter for runImportTransaction(): opens the workbook, reads it into a
 * detached draft by the filing type's contract, and says what it doesn't
 * carry and what comes back changed. `unboxed` names, by role, the details a
 * different person must not inherit (dotted paths for a nested record).
 *
 * @param {{ data: ArrayBuffer | Uint8Array, sourceName?: string, inventoryType: string, filing?: Record<string, any> }} source
 */
export function workbookAdapter({ data, sourceName, inventoryType, filing = null }) {
  return async () => {
    const ExcelJS = await getExcelJS();
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(data);
    assertWorkbookWithinLimits(workbook);
    const contract = contractFor(inventoryType);
    const { draft, rowSources, dateDrafts, workbookType } = readWorkbookDraft(workbook, inventoryType, { filing });
    const unboxed = Object.fromEntries(Object.entries(contract.preserve).filter(([role]) => role !== 'guardian'));
    return {
      draft, sourceName, workbookType,
      notCarried: [...contract.notCarried], importedAs: [...(contract.importedAs || [])], unboxed, rowSources, dateDrafts,
    };
  };
}
