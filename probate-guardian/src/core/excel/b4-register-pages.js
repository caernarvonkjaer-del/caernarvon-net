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
  // A block's pages may be plain numbers or {page, firstRow, rows} records --
  // the writer needs the row geometry, callers here do not.
  const nums = (block) => (block?.pages || []).map(p => (typeof p === 'number' ? p : p?.page))
    .filter(n => Number.isFinite(n));
  if (list.length) {
    const first = nums(list[0]);
    if (first.length) keep.add(first[0]);
  }
  for (const block of list) {
    const pages = nums(block);
    if (!pages.some(p => used.has(p))) continue;
    keep.add(pages[0]);
    for (const p of pages) if (used.has(p)) keep.add(p);
  }
  for (const p of used) keep.add(p);
  return [...keep].sort((a, b) => a - b);
}

// Schedule B-4's account blocks, verified against the embedded template on
// 2026-09-19 by reading where the pre-printed Line # restarts at 1. Each block
// is one bank account; its first page carries the BANK: / ACCOUNT NUMBER #:
// header. Capacities are the count of pre-printed register rows, which is why
// they are uneven -- p2 holds 25 rather than 30 because an instructions block
// pushes its column header from row 7 down to row 15.
// Blocks 5-12 were added to the workbook by scripts/extend-annual-b4-blocks.py
// on 2026-09-19, authorised by Alan as planning and compliance officer for the
// Clerk of the Circuit Court, Pinellas County. They are clones of block 2's
// shape -- a 30-row opening page and three 27-row continuation pages -- so
// every one of them holds 111 rows. Blocks 1 and 4 are the court's own
// irregular ones and are left exactly as the form has them.
//
// This map must agree with the shipped template. b4-block-map.spec.js reads
// the template back and fails if it drifts: a stale entry here would write an
// account's disbursements onto pages that no longer exist, or leave real pages
// unreachable.
// Each page carries where its register starts and how many pre-printed rows it
// has, because the writer needs both and they are not uniform: p2 holds 25
// rows from row 20 (an instructions block pushes its header down), a
// block-opening page holds 30 from row 8, p16 holds 31, and every
// continuation page holds 27 from row 8.
const b4Cont = (page) => ({ page, firstRow: 8, rows: 27 });
const b4Block = (account, firstPage, firstRow, firstRows, contCount) => Object.freeze({
  account,
  pages: Object.freeze([
    { page: firstPage, firstRow, rows: firstRows },
    ...Array.from({ length: contCount }, (_, i) => b4Cont(firstPage + 1 + i)),
  ]),
  get capacity() { return this.pages.reduce((s, p) => s + p.rows, 0); },
});

export const SCH_B4_ACCOUNT_BLOCKS = Object.freeze([
  b4Block(1, 2, 20, 25, 5),    // 160 -- the court's own irregular first block
  b4Block(2, 8, 8, 30, 3),     // 111
  b4Block(3, 12, 8, 30, 3),    // 111
  b4Block(4, 16, 8, 31, 3),    // 112 -- p16 has one extra pre-printed row
  ...Array.from({ length: 8 }, (_, i) => b4Block(5 + i, 20 + i * 4, 8, 30, 3)),
]);

/** Page numbers only, for callers that do not care about row geometry. */
export const b4BlockPages = (block) => block.pages.map(p => p.page);
