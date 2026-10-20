// Milestone 76I items 3 and 4 (design 3; decisions 76I-2 and 76I-3, the
// requester's): what the court's workbook cannot file faithfully blocks Save
// as Excel, and only Save as Excel -- never the PDF, which the filer can
// still produce after "Continue despite outstanding requirements" (Milestone
// 38D: a format-specific problem blocks only that format). They can't be
// overridden for the workbook: overriding produced a filed workbook that
// disagreed with itself or with the PDF.
//
//  - A Schedule B-4 row the workbook can't total: started, with no category
//    or one outside its 18 (b4-categories.js). The PDF counted it; the
//    workbook's category totals, which Part VI reads, did not -- a $500 row
//    with no category made the PDF's Line 20 $400 and the workbook's $900.
//  - An amount the workbook would write that can't be read as one ("1.234,56",
//    "about 200"), in a box in use: the Inventory wrote the text, turning its
//    formulas into #VALUE! up to Summary I; the Annual and Simplified wrote
//    parseFloat()'s guess ("1.234,56" filed as 1.234, "about 200" as 0).
//    Only amounts the workbook writes (read from its contract) and that are
//    in use (amount-fields.js's inUse). A knowing, partial reversal of 73G
//    part 1 for the workbook only.
import { createIssue } from '../validation/issue-registry.js';
import { isB4Category, B4_CATEGORIES } from '../accounting/b4-categories.js';
import { isBlankScheduleEntry } from '../form/blank-rows.js';
import { isUnreadableAmount } from '../form/amount-codec.js';
import { amountInUse, storedAmounts } from '../filing/amount-fields.js';
import { formEngine } from '../filing/filing-registry.js';
import { contractTargets } from './workbook-contract/engine.js';
import { ANNUAL_CONTRACT } from './workbook-contract/annual.js';
import { GUARDIAN_CONTRACT } from './workbook-contract/guardian.js';
import { SIMPLIFIED_CONTRACT } from './workbook-contract/simplified.js';

const CONTRACTS = { annual: ANNUAL_CONTRACT, guardian: GUARDIAN_CONTRACT, simplified: SIMPLIFIED_CONTRACT };
const written = new Map();

/** The amount fields a form's workbook writes, as `path` or `list.N.field`. */
function writtenAmountPaths(engine) {
  if (!written.has(engine)) {
    const contract = CONTRACTS[engine];
    const paths = new Set();
    if (contract) {
      for (const t of contractTargets(contract, {})) {
        if (t.dir === 'import' || t.fallback || !/amount/i.test(String(t.kind || ''))) continue;
        paths.add(String(t.path).replace(/\.\d+\./g, '.N.'));
      }
    }
    written.set(engine, paths);
  }
  return written.get(engine);
}

const startedB4Row = (row) => !!row && !isBlankScheduleEntry('schB4', { ...row, bankAccountId: '' });

/**
 * The Excel-only problems a filing has, as issues the export checks and each
 * form's Save as Excel add to the workbook's own.
 * @param {Record<string, any>} d
 */
export function workbookBlockIssues(d) {
  if (!d || typeof d !== 'object') return [];
  const engine = formEngine(d.inventoryType);
  if (!CONTRACTS[engine]) return [];
  const issues = [];
  if (engine === 'annual') {
    (d.schB4 || []).forEach((row, i) => {
      if (!startedB4Row(row) || isB4Category(row.category)) return;
      const which = String(row.category ?? '').trim() ? `"${String(row.category).trim()}" is not one of the court's ${B4_CATEGORIES.length} categories` : 'no category is chosen';
      issues.push(createIssue('excel.workbook.b4-category', {
        message: `Schedule B-4 — Line ${i + 1} — the court's Excel workbook totals disbursements by category, and ${which}. Choose one before saving the workbook (the PDF can still be saved).`,
        section: 'Schedule B-4', label: `Line ${i + 1} — Category`, path: `schB4.${i}.category`, route: '/schb4',
      }));
    });
  }
  const paths = writtenAmountPaths(engine);
  for (const { entry, path, value, index } of storedAmounts(d)) {
    if (!isUnreadableAmount(value) || !amountInUse(entry, d)) continue;
    if (!paths.has(path.replace(/\.\d+\./g, '.N.'))) continue;
    const where = index === undefined ? '' : (entry.inline ? ` row ${index + 1}` : ` — ${entry.row} ${index + 1}`);
    issues.push(createIssue('excel.workbook.amount-unreadable', {
      message: `${entry.section}${where} — ${entry.label}: the court's Excel workbook can't file "${String(value).trim()}" as an amount. Correct it before saving the workbook (the PDF can still be saved).`,
      section: `${entry.section}${where}`, label: entry.label, path, route: entry.route,
    }));
  }
  return issues;
}
