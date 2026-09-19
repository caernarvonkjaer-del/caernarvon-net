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
export const SCHEDULE_C5_PAGES = Object.freeze([
  page('C-5 JOINT OWNERS pg 1 ', [19, 24, 29, 34, 39, 44, 49]),
  page('C-5 JOINT OWNERS pg 2', [7, 12, 17, 22, 27, 32, 37, 42]),
]);

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
 * can never write to them and the importer never reads them.
 *
 * There is exactly one. The court's C-5 runs to three pages; SCHEDULE_C5_PAGES
 * stops at two, and has since the map was written, which is why
 * GUARDIAN_EXCEL_CAPS.scheduleC5 is 15 (7 + 8) rather than the 23 the workbook
 * actually holds. So 'C-5 JOINT OWNERS pg 3' ships blank in every filing
 * regardless of how much the filer enters, and is always prunable.
 *
 * Pruning it is not the same as reaching it. A filing with 16 joint-owned
 * assets is still refused an Excel export it could in principle be given --
 * that is a capacity question for the Clerk, not something to change quietly
 * here (AGENTS.md section 2), and it is recorded in MILESTONE-57-RESCOPE.md.
 *
 * Kept as its own list rather than folded into the maps precisely so that
 * adding page 3 to SCHEDULE_C5_PAGES later is one edit in one place, and the
 * drift guard in tests/unit/guardian-page-map.spec.js catches any other page
 * that falls out of the maps the same way.
 */
export const GUARDIAN_NEVER_WRITTEN_SHEETS = Object.freeze([
  'C-5 JOINT OWNERS pg 3',
]);

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
