/**
 * Centralized Excel Engine for Probate Guardian.
 *
 * Cell writing with formula-injection sanitization, numeric/percentage
 * coercion, and safe workbook downloading with object URL cleanup.
 */

// ── Milestone 51D: what this module is, and what it deliberately no longer is ──
//
// Before 51D, only two of this module's fourteen exports had a production
// caller (getExcelJS, saveWorkbookFile). The rest were dead, and several were
// dead *next to* a hand-rolled local twin in the feature excel.js files, which
// is the worst of both: two implementations of one rule, with the shared one
// rotting because nothing exercised it.
//
// 51D resolved that by direction rather than uniformly:
//
//   ADOPTED (the local twin was logically identical, so the swap is provably
//   behavior-neutral): setCell -- duplicated identically in all three feature
//   excel.js files; numValue and percentValue -- annual-accounting/excel.js's
//   `nv` and `pv` closures.
//
//   DELETED as never-wired capability, NOT as a judgment about the feature:
//   protectSheet and autoFitColumns. Nothing in this app has ever protected a
//   worksheet or set a column width. "Wiring them up" would have changed what a
//   clerk receives -- a protected sheet may need to be edited by the court, and
//   column widths are visible formatting -- so that is a new feature with its own
//   review, not a cleanup side effect. Recoverable from git history.
//
//   DELETED as dead, with the divergence recorded below so a future
//   consolidation starts from known semantics instead of rediscovering them:
//   readCellNumber, readCellDate, fmtDate, yesNo, yesNoTristate, readCellText,
//   createWorkbook, loadWorkbookFromBuffer.
//
// THE READERS ARE NOT INTERCHANGEABLE WITH THE FEATURES' LOCAL ONES. This is the
// part worth reading before any future attempt to "finish" the consolidation:
//
//   - readCellNumber returned 0 for an unparseable cell. The features' local
//     gcNum (annual-accounting/excel.js) returns ''. In an accounting schedule
//     that is not cosmetic: 0 is a stated zero the court reads as an assertion,
//     '' is a blank the readiness card flags as missing. Swapping them would
//     write false zeros into filings on Excel import.
//   - The feature readers route cell values through unwrapCellValue (formula
//     cells, richText); the core readers did not.
//   - fmtDate here truncated only when length >= 10; legacy-app.js:961's
//     fmtDate truncates unconditionally. They differ on short strings.
//   - yesNo(bool) returned 'No' for '', null and undefined -- which AGENTS.md
//     section 3 forbids outright ("Never default or coerce an unanswered field
//     to 'No', at any stage"). guardian-inventory/excel.js has a correct
//     tri-state local under the SAME NAME. Consolidating those mechanically
//     would have turned every unanswered binary in a filed Initial Inventory
//     into an affirmative 'No'. The dead one is gone; the correct local one is
//     the canonical tri-state Excel writer.
//   - readCellText here was a passthrough that delegated to window.readCellText
//     when present. All three features call that legacy global (legacy-app.js:1190)
//     directly, so the wrapper had no caller once the readers above went.
//     Unwinding the features onto an ES import is a separate item -- see
//     MILESTONE-51-PROPOSAL.md's out-of-scope list -- but keeping an unused
//     wrapper "for later" is exactly how this module got into its previous state,
//     so it was deleted rather than kept.

import { getExcelJS } from './exceljs-loader.js';

export { getExcelJS };

/**
 * Sanitizes cell text to prevent formula injection in spreadsheet software.
 *
 * Delegates to legacy-app.js's sanitizeForExcel() when present, which is the
 * implementation that actually runs in the browser. NOTE the fallback below is
 * deliberately STRICTER than that one: it also guards a leading tab or carriage
 * return, which legacy-app.js:985 does not. The two are pinned against each
 * other in tests/unit/excel-engine.spec.js; the stricter set is a superset, so
 * adopting this wrapper can never sanitize less than calling the global directly.
 * @param {string} str
 * @returns {string}
 */
export function sanitizeCellValue(str) {
  if (typeof window !== 'undefined' && typeof window.sanitizeForExcel === 'function') {
    return window.sanitizeForExcel(str);
  }
  const s = String(str ?? '');
  if (/^[=+\-@\t\r]/.test(s)) {
    return "'" + s;
  }
  return s;
}

/**
 * Safely sets a worksheet cell's value, handling nulls, numbers, and sanitized text.
 * @param {any} sheet
 * @param {string} addr
 * @param {any} value
 * @returns {any} The cell
 */
export function setCell(sheet, addr, value) {
  if (!sheet) return null;
  const cell = sheet.getCell(addr);
  if (value == null || value === '') {
    cell.value = null;
  } else if (typeof value === 'number') {
    cell.value = value;
  } else {
    cell.value = sanitizeCellValue(String(value));
  }
  return cell;
}

/**
 * Converts a value to numeric, defaulting to 0.
 * @param {any} val
 * @returns {number}
 */
export function numValue(val) {
  return parseFloat(val) || 0;
}

/**
 * Converts percentage string/number to decimal (e.g. 50 -> 0.5 or 0.5 -> 0.5).
 * @param {any} val
 * @returns {number}
 */
export function percentValue(val) {
  const p = parseFloat(val);
  return isNaN(p) ? 0 : p > 1 ? p / 100 : p;
}

/**
 * Writes an ExcelJS workbook to a binary buffer and initiates download in the browser,
 * guaranteeing object URL revocation to prevent memory leaks.
 * @param {any} workbook
 * @param {string} filename
 * @returns {Promise<void>}
 */
export async function saveWorkbookFile(workbook, filename) {
  try {
    if (workbook.definedNames) {
      workbook.definedNames.model = [];
    }
  } catch (e) {}

  const outBuf = await workbook.xlsx.writeBuffer();
  const blob = new Blob([outBuf], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

  if (typeof window === 'undefined' || !document?.body) {
    return;
  }

  const url = URL.createObjectURL(blob);
  try {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  } finally {
    setTimeout(() => {
      try {
        URL.revokeObjectURL(url);
      } catch (e) {}
    }, 1500);
  }
}

// Milestone 51E deleted a `window.ExcelEngine = { ...16 helpers }` bridge from
// here. It was assigned and never read -- the only other references were its
// generated typing and its allowlist entry. Every consumer of this module reaches
// it by ES import instead, which is the direction 42C/42E moved the codebase.
