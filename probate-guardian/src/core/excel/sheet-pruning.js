// Generic worksheet pruning for template-backed Excel exports.
//
// The court's workbooks ship every printed page of every schedule, and the app
// writes only the pages a filing fills. Without pruning, a guardian with one
// income row and three disbursements files a workbook carrying roughly sixteen
// blank continuation pages. The forms' own instructions say "Remove any blank
// pages", so the app does it on the filer's behalf.
//
// WHY THIS CANNOT JUST CALL removeWorksheet()
// Every one of those blank pages is named by a formula somewhere else in the
// workbook -- each continuation page feeds its schedule's own p1 total:
//
//   SCH A INCOME p1 !H42 = H41+'SCH A INCOME p2'!H38
//   SCH D-1 CASH p1!J59  = J58+'SCH D-1 CASH p2'!J56+'...p3'!J56+'...p4'!J56
//   SCH C CAPITAL ADJ p1!G56 = F55+G55+'...p2'!F48+'...p2'!G48+'...p3'!F48+...
//
// Remove a page and leave those alone and the schedule total resolves to
// #REF!, silently, in a filed financial document. So removal and formula
// rebuilding are one operation, and a page whose formulas cannot be rebuilt
// safely is simply kept.
//
// WHAT COUNTS AS SAFE
// Only additive chains: operands joined by '+', each either a local cell
// reference or a single sheet-qualified one, optionally wrapped in SUM().
// Anything else -- subtraction, a literal, a nested call, a range -- is a
// shape this does not understand, and rewriting a formula it does not
// understand could silently change what a court is told. Those sheets stay.
//
// See AGENTS.md section 13: the workbook defines these totals, so the app
// matches what it finds rather than asserting its own arithmetic.

const LOCAL_REF = /^\$?[A-Z]{1,3}\$?\d{1,7}$/;
const QUALIFIED_REF = /^'([^']+)'!(\$?[A-Z]{1,3}\$?\d{1,7})$/;

/**
 * Split an additive formula into its operands.
 * @returns {{wrapped: boolean, operands: Array<{sheet: string|null, text: string}>}|null}
 *          null when the formula is not a shape this module may rewrite.
 */
export function parseAdditiveFormula(formula) {
  let text = String(formula || '').trim();
  if (!text) return null;
  let wrapped = false;
  const sum = /^SUM\((.*)\)$/is.exec(text);
  if (sum) {
    // Only unwrap when the parentheses are the SUM's own, not a nested call.
    if (sum[1].includes('(') || sum[1].includes(')')) return null;
    wrapped = true;
    text = sum[1];
  } else if (text.includes('(') || text.includes(')')) {
    return null;
  }
  if (!text.trim()) return null;
  const operands = [];
  for (const raw of text.split('+')) {
    const piece = raw.trim();
    if (!piece) return null;
    if (LOCAL_REF.test(piece)) {
      operands.push({ sheet: null, text: piece });
      continue;
    }
    const q = QUALIFIED_REF.exec(piece);
    if (q) {
      operands.push({ sheet: q[1], text: piece });
      continue;
    }
    return null; // a literal, a range, a subtraction -- not ours to touch
  }
  return { wrapped, operands };
}

/**
 * Rebuild an additive formula with every operand naming a doomed sheet removed.
 * @returns {string|null} the new formula, or null to leave the cell alone
 *          (unrecognised shape, nothing to change, or nothing would remain).
 */
export function rebuildAdditiveFormula(formula, isDoomedSheet) {
  const parsed = parseAdditiveFormula(formula);
  if (!parsed) return null;
  const kept = parsed.operands.filter(o => !(o.sheet && isDoomedSheet(o.sheet)));
  if (kept.length === parsed.operands.length) return null; // unaffected
  if (!kept.length) return null;                            // would be empty
  const body = kept.map(o => o.text).join('+');
  return parsed.wrapped ? `SUM(${body})` : body;
}

/** Every formula in the workbook, with where it lives. */
export function collectFormulaCells(workbook) {
  const out = [];
  for (const ws of workbook.worksheets) {
    ws.eachRow({ includeEmpty: false }, (row) => {
      row.eachCell({ includeEmpty: false }, (cell) => {
        const f = cell?.formula;
        if (typeof f === 'string' && f) out.push({ ws, cell, formula: f });
      });
    });
  }
  return out;
}

/**
 * Work out which candidate sheets can actually be removed.
 *
 * A candidate is removable only if EVERY formula that names it can be safely
 * rebuilt. Candidates are resolved together rather than one at a time, because
 * one formula commonly names several of them at once -- SCH D-1's total reaches
 * p2, p3 and p4 in a single expression.
 *
 * @returns {{removable: string[], kept: Array<{sheet: string, reason: string}>,
 *            edits: Array<{ws: any, cell: any, formula: string}>}}
 */
export function planSheetPrune(workbook, candidateNames) {
  const present = new Set(workbook.worksheets.map(ws => ws.name));
  let doomed = new Set((candidateNames || []).filter(n => present.has(n)));
  const kept = [];
  if (!doomed.size) return { removable: [], kept, edits: [] };

  const formulaCells = collectFormulaCells(workbook);
  // A formula living ON a doomed sheet is irrelevant -- it leaves with it.
  const relevant = formulaCells.filter(fc => !doomed.has(fc.ws.name));

  // Removing one candidate can make another unsafe only through a shared
  // formula, so iterate until the set stops shrinking.
  for (;;) {
    const offenders = new Map();
    for (const fc of relevant) {
      const named = [...doomed].filter(n => fc.formula.includes(`'${n}'!`));
      if (!named.length) continue;
      if (rebuildAdditiveFormula(fc.formula, (s) => doomed.has(s)) === null) {
        for (const n of named) {
          if (!offenders.has(n)) {
            offenders.set(n, `formula at ${fc.ws.name}!${fc.cell.address} cannot be rebuilt safely`);
          }
        }
      }
    }
    if (!offenders.size) break;
    for (const [name, reason] of offenders) {
      doomed.delete(name);
      kept.push({ sheet: name, reason });
    }
    if (!doomed.size) break;
  }

  const edits = [];
  for (const fc of relevant) {
    const next = rebuildAdditiveFormula(fc.formula, (s) => doomed.has(s));
    if (next !== null) edits.push({ ws: fc.ws, cell: fc.cell, formula: next });
  }
  return { removable: [...doomed], kept, edits };
}

/**
 * Remove the removable candidates and rewrite the formulas that named them.
 * Mutates the workbook. Rewrites happen first: the two halves are not
 * independently valid, and a half-applied prune is a defective filing.
 */
export function pruneSheets(workbook, candidateNames) {
  const plan = planSheetPrune(workbook, candidateNames);
  for (const edit of plan.edits) {
    // No cached result: the consumer recalculates on open, so a stale value
    // cannot be shown against a formula that no longer matches it.
    edit.cell.value = { formula: edit.formula };
  }
  const byName = new Map(workbook.worksheets.map(ws => [ws.name, ws]));
  for (const name of plan.removable) {
    const ws = byName.get(name);
    if (ws) workbook.removeWorksheet(ws.id);
  }
  return {
    removed: plan.removable.slice().sort(),
    kept: plan.kept,
    rewritten: plan.edits.length,
  };
}
