// Deciding where each Schedule B-4 disbursement goes in the court's workbook.
//
// The form gives each bank account its own block of check-register pages, with
// the bank name and account number printed on the block's first page. So a
// filing with three accounts is not "one list split three ways" -- each
// account's disbursements must land inside its own block, under its own
// header, or the filing tells the court that money left an account it did not
// leave.
//
// This module only plans. It touches no workbook, so the rules below are
// testable without ExcelJS and without a browser.
//
// WHAT IT REFUSES TO DO
// The one thing worse than an Excel export the filer cannot produce is one
// that is quietly wrong. So rather than truncate, re-order or guess, it
// reports a reason the caller can show and withhold on:
//
//   - more accounts than the workbook has blocks;
//   - an account with more disbursements than its own block can hold;
//   - disbursements not assigned to any account, once accounts exist.
//
// The last is the subtle one. Filing an unassigned disbursement under whatever
// account happens to be first attributes real money to the wrong bank, which
// is exactly the mislabelling MILESTONE-57-PROPOSAL's 57D forbids. The PDF has
// no such constraint and carries every row regardless, so nothing is lost by
// withholding the workbook.

import { b4AccountLabel } from '../accounting/bank-accounts.js';

/** @typedef {{page:number, firstRow:number, rows:number}} B4Page */
/** @typedef {{account:number, pages:B4Page[], capacity:number}} B4Block */

export const B4_PLAN_TOO_MANY_ACCOUNTS = 'too-many-accounts';
export const B4_PLAN_ACCOUNT_OVER_CAPACITY = 'account-over-capacity';
export const B4_PLAN_UNASSIGNED_ROWS = 'unassigned-rows';

/**
 * Spread one account's rows across its block's pages, respecting each page's
 * own pre-printed row count -- they are not uniform (25, 27, 30, 31).
 */
function layoutRowsOverPages(rows, block) {
  const out = [];
  let i = 0;
  for (const page of block.pages) {
    if (i >= rows.length) break;
    const slice = rows.slice(i, i + page.rows);
    out.push({ page: page.page, firstRow: page.firstRow, rows: slice });
    i += slice.length;
  }
  return out;
}

/**
 * Plan a Schedule B-4 export.
 *
 * @param {Array<object>} schB4 disbursement rows
 * @param {Array<object>} accounts `schB4Accounts` in filer order
 * @param {B4Block[]} blocks the workbook's account blocks
 * @returns {{
 *   ok: boolean,
 *   groups: Array<{account: object|null, label: string, block: B4Block, pages: Array<{page:number, firstRow:number, rows:object[]}>}>,
 *   usedPages: number[],
 *   problems: Array<{code: string, message: string}>
 * }}
 */
export function planSchB4Export(schB4, accounts, blocks) {
  const rows = Array.isArray(schB4) ? schB4.filter(Boolean) : [];
  const accts = Array.isArray(accounts) ? accounts.filter(Boolean) : [];
  const blockList = Array.isArray(blocks) ? blocks : [];
  const problems = [];

  // No accounts defined: the long-standing shape. One unlabelled group in
  // block 1, which is what the app did before accounts existed and what a
  // single-account filing still looks like.
  if (!accts.length) {
    const block = blockList[0];
    if (!block) return { ok: false, groups: [], usedPages: [], problems: [] };
    if (rows.length > block.capacity) {
      problems.push({
        code: B4_PLAN_ACCOUNT_OVER_CAPACITY,
        message: `Schedule B-4 has ${rows.length} disbursements; the court's workbook holds ${block.capacity} without a second bank account.`,
      });
      return { ok: false, groups: [], usedPages: [], problems };
    }
    const pages = layoutRowsOverPages(rows, block);
    return {
      ok: true,
      groups: [{ account: null, label: '', block, pages }],
      usedPages: pages.map(p => p.page),
      problems,
    };
  }

  if (accts.length > blockList.length) {
    problems.push({
      code: B4_PLAN_TOO_MANY_ACCOUNTS,
      message: `This filing has ${accts.length} bank accounts; the court's workbook holds ${blockList.length}. `
        + `These cannot be written: ${accts.slice(blockList.length).map((a, i) => b4AccountLabel(a, blockList.length + i)).join(', ')}.`,
    });
  }

  const byId = new Map(accts.map((a, i) => [String(a.id ?? ''), { account: a, index: i, rows: [] }]));
  const unassigned = [];
  for (const row of rows) {
    const id = String(row?.bankAccountId ?? '');
    const group = id && byId.get(id);
    if (group) group.rows.push(row);
    else unassigned.push(row);
  }
  if (unassigned.length) {
    problems.push({
      code: B4_PLAN_UNASSIGNED_ROWS,
      message: `${unassigned.length} Schedule B-4 disbursement${unassigned.length === 1 ? ' is' : 's are'} not assigned to a bank account. `
        + `Assign them before exporting to Excel, or the workbook would attribute them to the wrong account.`,
    });
  }

  const groups = [];
  const usedPages = [];
  for (const [, group] of byId) {
    const block = blockList[group.index];
    if (!block) continue; // already reported by the too-many-accounts problem
    if (group.rows.length > block.capacity) {
      problems.push({
        code: B4_PLAN_ACCOUNT_OVER_CAPACITY,
        message: `${b4AccountLabel(group.account, group.index)} has ${group.rows.length} disbursements; `
          + `its section of the court's workbook holds ${block.capacity}.`,
      });
      continue;
    }
    const pages = layoutRowsOverPages(group.rows, block);
    groups.push({ account: group.account, label: b4AccountLabel(group.account, group.index), block, pages });
    for (const p of pages) usedPages.push(p.page);
    // An account with no disbursements still keeps its header page, so the
    // filing shows the account was accounted for rather than omitted.
    if (!pages.length) usedPages.push(block.pages[0].page);
  }

  return { ok: problems.length === 0, groups, usedPages: [...new Set(usedPages)].sort((a, b) => a - b), problems };
}
