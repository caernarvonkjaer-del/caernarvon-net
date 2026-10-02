// The printed page geometry of the court's Initial Inventory workbook.
//
// Each of the eleven schedules spans a fixed list of pre-printed pages, and
// each page has its own fixed list of row positions -- a schedule's first page
// holds fewer entries than its continuations because it carries the form's
// heading and instructions. The exporter fills these slots in order and the
// importer reads them back out of the same ones, so this is the single place
// that knows how an inventory maps onto paper.
//
// The workbook is the authority for every number here (AGENTS.md section 13);
// tests/unit/guardian-page-map.spec.js checks these literals against the
// shipped template rather than trusting them.
//
// It lives in core/excel/ rather than beside the exporter so that the paging
// rules can be tested directly: features/guardian-inventory/excel.js reaches
// for window.* at module scope and cannot be imported under Node. The same
// reason b4-register-pages.js sits here.

const page = (name, rows) => Object.freeze({ name, rows: Object.freeze(rows) });

export const SCHEDULE_A1_PAGES = Object.freeze([
  page('A-1-REAL ESTATE pg 1', [27, 32, 37, 42]),
  page('A-1-REAL ESTATE pg 2', [7, 12, 17, 22, 27, 32, 37, 42]),
  page('A-1-REAL ESTATE pg 3', [7, 12, 17, 22, 27, 32, 37, 42]),
]);
export const SCHEDULE_A2_PAGES = Object.freeze([
  page('A-2-REAL ESTATE MTG pg 1 ', [30, 35, 40, 45, 50]),
  page('A-2-REAL ESTATE MTG pg 2', [7, 12, 17, 22, 27, 32, 37, 42, 47]),
  page('A-2-REAL ESTATE MTG pg 3', [7, 12, 17, 22, 27, 32, 37, 42, 47, 52]),
]);
export const SCHEDULE_B1_PAGES = Object.freeze([
  page('B-1 CASH pg 1', [25, 30, 35, 40, 45, 50]),
  page('B-1 CASH pg 2', [7, 12, 17, 22, 27, 32, 37, 42, 47, 52]),
  page('B-1 CASH pg 3', [7, 12, 17, 22, 27, 32, 37, 42, 47, 52]),
  page('B-1 CASH pg 4', [7, 12, 17, 22, 27, 32, 37, 42, 47, 52]),
]);
export const SCHEDULE_B2_PAGES = Object.freeze([
  page('B-2 PER PROP pg 1', [33, 38, 43, 48, 53, 58]),
  page('B-2 PER PROP pg 2', [7, 12, 17, 22, 27, 32, 37, 42, 47, 52, 57]),
  page('B-2 PER PROP pg 3', [7, 12, 17, 22, 27, 32, 37, 42, 47, 52, 57]),
  page('B-2 PER PROP pg 4', [7, 12, 17, 22, 27, 32, 37, 42, 47, 52, 57]),
]);
// The trailing ';' in page 1's name is the court's own typo. Sheets are looked
// up by exact name, so a tidied-up spelling silently matches nothing.
export const SCHEDULE_B3_PAGES = Object.freeze([
  page('B-3 INTANGIBLE pg 1;', [22, 27, 32, 37, 42, 47, 52, 57, 62]),
  page('B-3 INTANGIBLE pg 2', [7, 12, 17, 22, 27, 32, 37, 42, 47, 52, 57]),
]);
export const SCHEDULE_B4_PAGES = Object.freeze([
  page('B-4 PERS PROP LIAB pg 1', [23, 28, 33, 38, 43, 48]),
  page('B-4 PERS PROP LIAB pg 2', [8, 13, 18, 23, 28, 33, 38, 43, 48]),
  page('B-4 PERS PROP LIAB pg 3', [8, 13, 18, 23, 28, 33, 38, 43, 48]),
  page('B-4 PERS PROP LIAB pg 4', [8, 13, 18, 23, 28, 33, 38, 43, 48]),
]);
export const SCHEDULE_C1_PAGES = Object.freeze([
  page('C-1 INCOME pg 1', [29, 34, 39, 44, 49]),
  page('C-1 INCOME pg 2', [7, 12, 17, 22, 27, 32, 37, 42, 47]),
  page('C-1 INCOME pg 3', [7, 12, 17, 22, 27, 32, 37, 42, 47]),
]);
// Likewise 'C-2 LAWSUIT AGAINST 1' -- the court's first page is missing the
// 'pg' its continuation has.
export const SCHEDULE_C2_PAGES = Object.freeze([
  page('C-2 LAWSUIT AGAINST 1', [19, 24, 29, 34, 39, 44]),
  page('C-2 LAWSUIT AGAINST pg 2', [7, 12, 17, 22, 27, 32, 37]),
]);
export const SCHEDULE_C3_PAGES = Object.freeze([
  page('C-3 LAWSUIT BY WARD pg 1', [20, 25, 30, 35, 40, 45]),
  page('C-3 LAWSUIT BY WARD pg 2', [7, 12, 17, 22, 27, 32, 37, 42]),
]);
export const SCHEDULE_C4_PAGES = Object.freeze([
  page('C-4 TRUSTS pg 1', [23, 28, 33, 38, 43, 48, 53]),
  page('C-4 TRUSTS pg 2', [7, 12, 17, 22, 27, 32, 37, 42, 47]),
]);
// Page 3 was missing from this map until 2026-09-19, so the app reached 15 of
// the form's 23 joint-owner slots and refused an Excel export it could have
// given. The page is structurally identical to page 2 -- eight slots at the
// same rows, pre-printed Line # 16-23, its own page total at H47 -- and the
// schedule total on page 1 already summed it. Extending to it was authorized
// by Alan (D10).
export const SCHEDULE_C5_PAGES = Object.freeze([
  page('C-5 JOINT OWNERS pg 1 ', [19, 24, 29, 34, 39, 44, 49]),
  page('C-5 JOINT OWNERS pg 2', [7, 12, 17, 22, 27, 32, 37, 42]),
  page('C-5 JOINT OWNERS pg 3', [7, 12, 17, 22, 27, 32, 37, 42]),
]);

// Milestone 72A. PART III signs up to three guardians, in blocks starting on
// rows 7, 13 and 19. Each block prints its captions on one row and the box on
// the row beneath -- "Date" over D8, "Guardian #1's SSN / EIN" over B10 -- so
// a field's box is never its caption's cell. The exporter used to write every
// field but the name onto the caption row, and the importer read the same
// cells back, so the round trip agreed with a form whose fifteen captions had
// been replaced. The captions are the workbook's own text, read with a parser;
// tests/unit/guardian-page-map.spec.js checks each against the template.
const PART_III_SIGNER = Object.freeze(['Guardian #1', 'Co-Guardian #2', 'Co-Guardian #3']);
export const PART_III_BLOCK_ROWS = Object.freeze([7, 13, 19]);

/**
 * The cells of guardian block `i` (0-2): for each field, its box and, where
 * the form prints one, the caption cell above it and the caption's text.
 * The name has no caption to fall back to: it has always been written to its
 * box (F8 is the form's own link to the Cover, overwritten by decision).
 */
export function partIIIGuardianCells(i) {
  const b = PART_III_BLOCK_ROWS[i];
  const who = PART_III_SIGNER[i];
  return Object.freeze([
    Object.freeze({ key: 'signatureDate', box: `D${b + 1}`, caption: `D${b}`, text: 'Date', date: true }),
    Object.freeze({ key: 'name', box: `F${b + 1}`, caption: null, text: null, date: false }),
    Object.freeze({ key: 'ssnEin', box: `B${b + 3}`, caption: `B${b + 2}`, text: `${who}'s SSN / EIN`, date: false }),
    Object.freeze({ key: 'streetAddress', box: `F${b + 3}`, caption: `F${b + 2}`, text: `${who}'s Street Address`, date: false }),
    Object.freeze({ key: 'phone', box: `B${b + 5}`, caption: `B${b + 4}`, text: `${who}'s Phone Number`, date: false }),
    Object.freeze({ key: 'cityStateZip', box: `F${b + 5}`, caption: `F${b + 4}`, text: `${who}'s City / State / Zip Code`, date: false }),
  ]);
}

const captionForm = (s) => String(s ?? '').replace(/[‘’]/g, "'").replace(/\s+/g, ' ').trim().toLowerCase();

/**
 * Whether a cell's text is the form's own printed caption. Compared loosely
 * (spaces, letter case, curly or straight apostrophe), so a caption another
 * program saved slightly differently is still recognized as the caption --
 * never read in as a guardian's SSN or address.
 */
export const isPrintedCaption = (cellText, caption) => captionForm(cellText) !== '' && captionForm(cellText) === captionForm(caption);

/** Every paged schedule, keyed by the inventory field that fills it. */
export const GUARDIAN_PAGED_SCHEDULES = Object.freeze([
  Object.freeze({ key: 'scheduleA1', pages: SCHEDULE_A1_PAGES }),
  Object.freeze({ key: 'scheduleA2', pages: SCHEDULE_A2_PAGES }),
  Object.freeze({ key: 'scheduleB1', pages: SCHEDULE_B1_PAGES }),
  Object.freeze({ key: 'scheduleB2', pages: SCHEDULE_B2_PAGES }),
  Object.freeze({ key: 'scheduleB3', pages: SCHEDULE_B3_PAGES }),
  Object.freeze({ key: 'scheduleB4', pages: SCHEDULE_B4_PAGES }),
  Object.freeze({ key: 'scheduleC1', pages: SCHEDULE_C1_PAGES }),
  Object.freeze({ key: 'scheduleC2', pages: SCHEDULE_C2_PAGES }),
  Object.freeze({ key: 'scheduleC3', pages: SCHEDULE_C3_PAGES }),
  Object.freeze({ key: 'scheduleC4', pages: SCHEDULE_C4_PAGES }),
  Object.freeze({ key: 'scheduleC5', pages: SCHEDULE_C5_PAGES }),
]);

/**
 * Pages the workbook ships that no schedule's page map covers, so the exporter
 * can never write to them and the importer never reads them. Such a page is
 * blank in every filing and is always pruned.
 *
 * Empty, deliberately. It held 'C-5 JOINT OWNERS pg 3' until D10 extended
 * SCHEDULE_C5_PAGES to reach it; the right answer to an unreachable page is
 * usually to reach it, not to prune it forever. The escape hatch stays because
 * the drift guard in tests/unit/guardian-page-map.spec.js requires every
 * schedule page in the workbook to be either mapped or listed here -- so a
 * page the court adds that genuinely has no data behind it has somewhere to be
 * declared, in one place, rather than being silently dropped.
 */
export const GUARDIAN_NEVER_WRITTEN_SHEETS = Object.freeze([]);

/**
 * How many of a schedule's pages a given number of entries actually reaches.
 *
 * Mirrors the exporter's own paging: entries fill each page's pre-printed
 * slots in order before spilling onto the next. Never returns fewer than one
 * -- a schedule with no entries still prints its first page, so the filing
 * shows the schedule was considered and reported empty rather than appearing
 * to have been left out of the inventory altogether.
 */
export function guardianPagesUsed(pages, entryCount) {
  let remaining = Number.isFinite(entryCount) ? Math.max(0, Math.trunc(entryCount)) : 0;
  let used = 0;
  for (const p of pages) {
    if (remaining <= 0) break;
    used++;
    remaining -= p.rows.length;
  }
  return Math.max(used, 1);
}

/**
 * The continuation pages this filing never writes to.
 *
 * The court's Initial Inventory ships 21 continuation pages across its eleven
 * schedules, and the form's own instructions say to remove any blank ones. An
 * inventory with a house, two bank accounts and a car reaches the first page of
 * each schedule and none of the rest, so without this the filer hands the clerk
 * 21 pages of empty pre-printed grid.
 *
 * Every one of those pages is named by its schedule's page-1 total formula, so
 * the caller must remove them through pruneSheets(), which rebuilds those
 * formulas in the same operation. Removing them any other way leaves the
 * schedule totals reading #REF! in a filed financial document.
 */
export function unusedGuardianContinuationSheets(inv) {
  const out = [...GUARDIAN_NEVER_WRITTEN_SHEETS];
  for (const { key, pages } of GUARDIAN_PAGED_SCHEDULES) {
    const entries = Array.isArray(inv?.[key]) ? inv[key].length : 0;
    for (const p of pages.slice(guardianPagesUsed(pages, entries))) out.push(p.name);
  }
  return out;
}
