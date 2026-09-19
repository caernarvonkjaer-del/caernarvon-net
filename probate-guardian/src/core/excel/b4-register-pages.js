// Schedule B-4 register-page pruning for the Annual Accounting workbook.
//
// WHY THIS EXISTS
// The court's workbook ships one check-register page per printed page of the
// form -- p2 through p19 today -- and the app writes only the ones a filing
// actually fills. Every unused page still lands in the exported file, so a
// guardian with three disbursements files a workbook carrying seventeen blank
// register pages. The court's own instructions say "Remove any blank pages",
// so this does that on the filer's behalf.
//
// THE COUPLING THAT MAKES IT DELICATE
// `SCH B-4 OTHER DISB SUMMARY p1` totals each of the eighteen disbursement
// categories by naming every register page's hidden per-category subtotal cell
// one at a time:
//
//   I10 = SUM('SCH B-4 OTHER DISB p2'!AK8 + 'SCH B-4 OTHER DISB p3'!AM8 + ...)
//
// Delete a page without touching that and the formula resolves to #REF! -- the
// category totals, and with them Part II's disbursement line, break. So pages
// are never removed on their own: each of the eighteen formulas is rebuilt
// from the surviving pages in the same operation.
//
// The per-page cell references are NOT hardcoded here. They differ by page
// (p2 uses AK8, continuation pages AM8, block-opening pages AP7, p16 AQ8), and
// hardcoding them would silently rot the moment the template changes. They are
// read back out of the template's own formula instead, which is also what
// keeps this correct if the workbook is ever extended with more pages.
//
// See AGENTS.md section 13: the workbook defines these totals, so the app
// matches what it finds rather than asserting its own arithmetic.

export const B4_SUMMARY_SHEET = 'SCH B-4 OTHER DISB SUMMARY p1';
export const B4_REGISTER_PREFIX = 'SCH B-4 OTHER DISB p';
/** I10..I27 -- one row per disbursement category on the summary page. */
export const B4_CATEGORY_ROWS = Array.from({ length: 18 }, (_, i) => 10 + i);

/** The summary page is not a register page, despite sharing the prefix. */
export function isB4RegisterSheetName(name) {
  return typeof name === 'string'
    && name.startsWith(B4_REGISTER_PREFIX)
    && /^\d+$/.test(name.slice(B4_REGISTER_PREFIX.length));
}

export function b4PageNumber(name) {
  return isB4RegisterSheetName(name)
    ? parseInt(name.slice(B4_REGISTER_PREFIX.length), 10)
    : NaN;
}

/**
 * Split a summary category formula into its per-page reference tokens.
 * Returns [] for anything that is not the expected SUM-of-references shape,
 * which the caller must treat as "leave this formula alone" rather than as an
 * empty result -- rewriting a formula we did not understand is how a total
 * silently becomes wrong.
 */
export function parseB4SummaryFormula(formula) {
  const text = String(formula || '').trim();
  const m = /^SUM\((.*)\)$/is.exec(text);
  if (!m) return [];
  const body = m[1];
  const refs = [];
  const re = /'([^']+)'!(\$?[A-Z]+\$?\d+)/g;
  let hit;
  while ((hit = re.exec(body)) !== null) {
    refs.push({ sheet: hit[1], ref: hit[2] });
  }
  // Every operand must be a sheet-qualified reference joined by '+'. If the
  // formula carries anything else -- a literal, a local cell, a nested call --
  // this is not the shape documented above and must not be rewritten.
  //
  // Compared operand by operand rather than by normalising whitespace across
  // the whole body: these sheet names contain spaces ("SCH B-4 OTHER DISB p2"),
  // so stripping whitespace globally makes a perfectly good formula look
  // unrecognisable and silently disables pruning.
  const operands = body.split('+');
  if (operands.length !== refs.length) return [];
  for (let i = 0; i < operands.length; i++) {
    if (operands[i].trim() !== `'${refs[i].sheet}'!${refs[i].ref}`) return [];
  }
  return refs;
}

/**
 * Rebuild a category formula from only the pages that survive.
 * Returns null when the formula should be left untouched: an unrecognised
 * shape, or a rewrite that would drop every operand (an empty SUM() is not a
 * valid formula, and a schedule with no pages at all is not a thing this
 * should be able to produce).
 */
export function rebuildB4SummaryFormula(formula, keptSheetNames) {
  const refs = parseB4SummaryFormula(formula);
  if (!refs.length) return null;
  const keep = new Set(keptSheetNames);
  const kept = refs.filter(r => keep.has(r.sheet));
  if (!kept.length) return null;
  if (kept.length === refs.length) return null; // nothing to change
  return `SUM(${kept.map(r => `'${r.sheet}'!${r.ref}`).join('+')})`;
}

/**
 * Decide which register pages a filing actually needs.
 *
 * `usedPages` is what the writer filled. Every block that received data also
 * keeps its own first page, because that is where the bank name and account
 * number are printed -- dropping it would file disbursements under no account
 * at all. Block 1's first page is always kept so the schedule exists in the
 * filing even when there is nothing to report.
 *
 * @param {number[]} usedPages page numbers the writer wrote rows to
 * @param {Array<{pages:number[]}>} blocks the template's account blocks
 * @returns {number[]} page numbers to keep, ascending
 */
export function planB4PagesToKeep(usedPages, blocks) {
  const used = new Set((usedPages || []).filter(n => Number.isFinite(n)));
  const keep = new Set();
  const list = Array.isArray(blocks) ? blocks : [];
  if (list.length && list[0].pages?.length) keep.add(list[0].pages[0]);
  for (const block of list) {
    const pages = block?.pages || [];
    if (!pages.some(p => used.has(p))) continue;
    keep.add(pages[0]);
    for (const p of pages) if (used.has(p)) keep.add(p);
  }
  for (const p of used) keep.add(p);
  return [...keep].sort((a, b) => a - b);
}

/**
 * Remove unused Schedule B-4 register pages and rebuild the summary totals so
 * they reference only what is left. Mutates the workbook.
 *
 * Deliberately conservative: if the summary page is missing, or a category
 * formula is not the shape this understands, nothing is removed at all. A
 * workbook with extra blank pages is untidy; one with #REF! in its
 * disbursement totals is a defective filing.
 *
 * @returns {{removed: string[], rewritten: number[], skipped: string|null}}
 */
export function pruneB4RegisterPages(workbook, pagesToKeep) {
  const result = { removed: [], rewritten: [], skipped: null };
  const summary = workbook.getWorksheet(B4_SUMMARY_SHEET);
  if (!summary) {
    result.skipped = 'summary page not found';
    return result;
  }
  const registers = workbook.worksheets.filter(ws => isB4RegisterSheetName(ws.name));
  if (!registers.length) {
    result.skipped = 'no register pages found';
    return result;
  }
  const keep = new Set(pagesToKeep || []);
  const doomed = registers.filter(ws => !keep.has(b4PageNumber(ws.name)));
  if (!doomed.length) return result;

  const keptNames = registers
    .filter(ws => keep.has(b4PageNumber(ws.name)))
    .map(ws => ws.name);
  if (!keptNames.length) {
    result.skipped = 'refusing to remove every register page';
    return result;
  }

  // Rebuild first. If any formula cannot be rebuilt safely, remove nothing --
  // the two halves of this operation are not independently valid.
  const updates = [];
  for (const row of B4_CATEGORY_ROWS) {
    const cell = summary.getCell(`I${row}`);
    const formula = cell?.formula;
    if (!formula) continue;
    const next = rebuildB4SummaryFormula(formula, keptNames);
    if (next === null) {
      if (!parseB4SummaryFormula(formula).length) {
        result.skipped = `summary formula at I${row} has an unexpected shape`;
        return result;
      }
      continue; // nothing to change on this row
    }
    updates.push({ row, cell, formula: next });
  }

  for (const u of updates) {
    // No cached result: calcChain is dropped from the template, so the
    // consumer recalculates on open and a stale value cannot be displayed.
    u.cell.value = { formula: u.formula };
    result.rewritten.push(u.row);
  }
  for (const ws of doomed) {
    result.removed.push(ws.name);
    workbook.removeWorksheet(ws.id);
  }
  return result;
}
