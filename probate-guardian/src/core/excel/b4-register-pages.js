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
// The removal itself, and the formula rebuilding it requires, live in
// ./sheet-pruning.js -- the same problem exists in nine other schedules, whose
// totals use a bare '+' chain rather than this SUM() wrapper, so one mechanism
// handles both. What stays here is only the part that is specific to B-4: how
// its pages group into per-account blocks, and which of them a filing needs.
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
