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
//   - fmtDate here truncated only when length >= 10; the surviving fmtDate
//     (now cell-reader.js's, moved there by 53B) truncates unconditionally.
//     They differ on short strings.
//   - yesNo(bool) returned 'No' for '', null and undefined -- which AGENTS.md
//     section 3 forbids outright ("Never default or coerce an unanswered field
//     to 'No', at any stage"). guardian-inventory/excel.js has a correct
//     tri-state local under the SAME NAME. Consolidating those mechanically
//     would have turned every unanswered binary in a filed Initial Inventory
//     into an affirmative 'No'. The dead one is gone; the correct local one is
//     the canonical tri-state Excel writer.
//   - the readCellText that used to live here was a passthrough delegating to
//     the legacy global of the same name. All three features called that global
//     directly, so the wrapper had no caller once the readers above went.
//     Keeping an unused wrapper "for later" is exactly how this module got into
//     its previous state, so it was deleted rather than kept.
//
// THE IMPORT-DIRECTION READERS NOW LIVE IN ./cell-reader.js (Milestone 53B).
// The block that used to sit here explained why the cluster could not move --
// readCellText's body calls unwrapCellValue and fmtDate, both of which were
// classic-script globals, so moving readCellText alone would have left a core
// function reaching back through `window` for two helpers. It ended: "it is a
// cluster move or nothing."
//
// 53B was the cluster move. fmtDate, unwrapCellValue and readCellText are now
// three exports of ./cell-reader.js, bodies unchanged, and the classic-script
// originals are deleted -- so this module's writers and that module's readers
// are the two directions of one boundary, each reached by `import` only.
// See MILESTONE-53-PROPOSAL.md for the gate that proved the move
// behavior-neutral, and cell-reader.js's own header before adding anything to
// it (the 0-vs-'' divergence recorded above is the reason a readCellNumber
// does not belong there either).

import { getExcelJS } from './exceljs-loader.js';

export { getExcelJS };

/**
 * Sanitizes cell text to prevent formula injection in spreadsheet software.
 *
 * Delegates to legacy-app.js's sanitizeForExcel() when present, which is the
 * implementation that actually runs in the browser; the fallback below covers the
 * Node/test case.
 *
 * Both now guard OWASP's complete CSV-injection set -- = + - @ TAB(0x09)
 * CR(0x0D) LF(0x0A) -- and tests/unit/excel-engine.spec.js pins them as EQUAL
 * rather than merely one-directional. Before Milestone 51 they disagreed: the
 * production rule was /^[=+\-@]/ and this fallback /^[=+\-@\t\r]/, so NEITHER
 * matched OWASP (both missed LF) and the stricter of the two ran only in the one
 * place it could not matter. See legacy-app.js's sanitizeForExcel() for why
 * widening it is hardening rather than a fix.
 * @param {string} str
 * @returns {string}
 */
export function sanitizeCellValue(str) {
  if (typeof window !== 'undefined' && typeof window.sanitizeForExcel === 'function') {
    return window.sanitizeForExcel(str);
  }
  const s = String(str ?? '');
  if (/^[=+\-@\t\r\n]/.test(s)) {
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
  // The court's workbooks propagate their headers by defined name, not by
  // cell reference: 'SCH A INCOME p1'!D2 is literally `=Name_of_Ward`. In the
  // Annual template Name_of_Ward is named by 88 formulas, Case_Number by 86
  // and Filing_Type by 86 -- roughly 270 cells across the workbook -- and the
  // Guardian template's county and Yes/No dropdowns list their options by
  // name too.
  //
  // This used to wipe every defined name before writing, so every one of those
  // formulas resolved to #NAME? in the filed workbook and both dropdowns lost
  // their lists. The strip had been here since the function was written, with
  // no recorded reason; the likely motive was the template's `.wvu.` custom-
  // view names, three of which point at #REF!. ExcelJS discards those on load
  // anyway -- they never reach this model -- and writing with the remaining
  // names produces a file ExcelJS reads back cleanly.
  //
  // So only the custom-view leftovers go. They are Excel's per-user saved-view
  // metadata, meaningless in a filed form, and the only entries here that have
  // ever been suspected of breaking the write.
  //
  // Print areas are NOT in this model -- ExcelJS keeps them on
  // worksheet.pageSetup.printArea -- so they were never affected either way.
  //
  // Milestone 67C: a name whose target lives in ANOTHER workbook goes too.
  // The Annual template defines yesORno as [1]DropDownData!$A$6:$A$8 -- a
  // range in an external file, resolvable only through the template's
  // externalLink parts, which ExcelJS does not write. Keeping the name while
  // dropping the parts it needs made Excel open every Annual, Final and Trust
  // export with "We found a problem with some content" and, on repair, remove
  // the name itself (Excel's own repair log is quoted in
  // MILESTONE-67-PROPOSAL.md, Appendix A). Nothing in the Annual workbook
  // reads it -- it has no DropDownData sheet at all; the name was inherited
  // when the Clerk authored this workbook from the Guardian one.
  //
  // The test is on the TARGET, not the name. Guardian's yesORno is the same
  // name pointing inside its own workbook, and a live dropdown reads it.
  const refersOutsideWorkbook = (entry) => {
    const ranges = Array.isArray(entry?.ranges) ? entry.ranges : [entry?.ranges ?? ''];
    return ranges.some((range) => /\[\d+\]/.test(String(range ?? '')));
  };
  try {
    const names = workbook.definedNames;
    if (names && Array.isArray(names.model)) {
      names.model = names.model.filter((entry) =>
        !String(entry?.name || '').includes('.wvu.') && !refersOutsideWorkbook(entry));
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

// Milestone 51E deleted an `ExcelEngine` bridge (`window` held it as
// `{ ...16 helpers }`) from here. It was assigned and never read -- the only
// other references were its generated typing and its allowlist entry. Every
// consumer of this module reaches it by ES import instead, which is the
// direction 42C/42E moved the codebase.
