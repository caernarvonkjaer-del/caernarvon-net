// Milestone 73G part 1: where each form keeps an amount the filer enters,
// and the two things done with that list -- converting amounts saved as text
// when a filing opens, and naming any amount that can't be read.
//
// The list is probate-guardian-data-model.csv's currency fields entered by
// the filer (tests/unit/amount-fields.spec.js holds the two in step), with
// the page each is on and the words its form's own checks use, so an issue
// sits on the right page beside them.
//
// Why both: amounts used to reach the filing as text from several places --
// the Simplified's remuneration box, its workbook import, older saves -- and
// a page drawn later turned some of that text into numbers by cutting it at
// the first comma or zeroing it ("1,234.56" became 1, "-200" became 0). Now
// readable text becomes its number once, when the filing opens, and text
// that is not an amount is kept as it was and named before anything is
// filed, as an impossible date is.
import { amountForStore, isUnreadableAmount, UNREADABLE_AMOUNT_HINT } from '../form/amount-codec.js';

// One entry per amount: `path` for a single field, `list` + `field` for a
// column of a repeating list (`row` names a row the way the form's checks do;
// `inline` for the Inventory's "A-1 row 2").
const ANNUAL_FAMILY = [
  { path: 'startingBalance', route: '/p2', section: 'Part II', label: 'Starting Balance' },
  { list: 'schA', field: 'amount', route: '/scha', section: 'Schedule A', row: 'Line', label: 'Amount' },
  { list: 'schB1', field: 'amount', route: '/schb1', section: 'Schedule B-1', row: 'Line', label: 'Amount' },
  { list: 'schB2', field: 'amount', route: '/schb2', section: 'Schedule B-2', row: 'Line', label: 'Amount' },
  { list: 'schB3', field: 'amount', route: '/schb3', section: 'Schedule B-3', row: 'Line', label: 'Amount' },
  { list: 'schB4', field: 'amount', route: '/schb4', section: 'Schedule B-4', row: 'Line', label: 'Amount' },
  { list: 'schC', field: 'gain', route: '/schc', section: 'Schedule C', row: 'Line', label: 'Gain / Addition' },
  { list: 'schC', field: 'loss', route: '/schc', section: 'Schedule C', row: 'Line', label: 'Loss / Reduction' },
  { list: 'schD1', field: 'fullAmount', route: '/schd1', section: 'Schedule D-1', row: 'Line', label: 'Full Asset Amount' },
  { list: 'schD1', field: 'restrictedAmt', route: '/schd1', section: 'Schedule D-1', row: 'Line', label: 'Restricted Amount' },
  { list: 'schD2', field: 'fullValue', route: '/schd2', section: 'Schedule D-2', row: 'Line', label: 'Full Asset Value' },
  { list: 'schD2', field: 'carryingValue', route: '/schd2', section: 'Schedule D-2', row: 'Line', label: 'Carrying Value' },
  { list: 'schD2', field: 'wardValue', route: '/schd2', section: 'Schedule D-2', row: 'Line', label: "Ward's Value" },
  { list: 'schD3', field: 'fullAmount', route: '/schd3', section: 'Schedule D-3', row: 'Line', label: 'Full Asset Amount' },
  { list: 'schD3', field: 'carryingValue', route: '/schd3', section: 'Schedule D-3', row: 'Line', label: 'Carrying Value' },
  { list: 'schD3', field: 'wardAmount', route: '/schd3', section: 'Schedule D-3', row: 'Line', label: "Ward's Amount" },
  { list: 'schD4', field: 'fullAmount', route: '/schd4', section: 'Schedule D-4', row: 'Line', label: 'Full Asset Amount' },
  { list: 'schD4', field: 'carryingValue', route: '/schd4', section: 'Schedule D-4', row: 'Line', label: 'Carrying Value' },
  { list: 'schD4', field: 'wardValue', route: '/schd4', section: 'Schedule D-4', row: 'Line', label: "Ward's Value" },
  { list: 'schD4', field: 'restrictedAmt', route: '/schd4', section: 'Schedule D-4', row: 'Line', label: 'Restricted Amount' },
  { list: 'schD5', field: 'fullDebt', route: '/schd5', section: 'Schedule D-5', row: 'Line', label: 'Full Debt Amount' },
  { list: 'schD5', field: 'wardBalance', route: '/schd5', section: 'Schedule D-5', row: 'Line', label: "Ward's Balance" },
  { list: 'schE', field: 'transferInAmt', route: '/sche', section: 'Schedule E', row: 'Line', label: 'Transfer In Amount' },
  { list: 'schE', field: 'transferOutAmt', route: '/sche', section: 'Schedule E', row: 'Line', label: 'Transfer Out Amount' },
  { list: 'schF1', field: 'salePrice', route: '/schf1', section: 'Schedule F-1', row: 'Line', label: 'Sale Price' },
  { list: 'schF2', field: 'salePrice', route: '/schf2', section: 'Schedule F-2', row: 'Line', label: 'Sale Price' },
  { list: 'trusts', field: 'wardAmount', route: '/p8', section: 'Part VIII', row: 'Trust', label: "Amount (Ward's Interest)" },
  { path: 'bondAmount', route: '/p9', section: 'Part IX', label: 'Bond Amount' },
  { list: 'remuneration', field: 'amount', route: '/p11', section: 'Part XI', row: 'Line', label: 'Amount' },
];

const SIMPLIFIED = [
  { path: 'startingBalance', route: '/p2', section: 'Part II', label: 'Starting Balance' },
  { path: 'interestIncome', route: '/p2', section: 'Part II', label: 'Interest Income' },
  { path: 'depositsSettlement', route: '/p2', section: 'Part II', label: 'Deposits Pursuant to Settlement' },
  { path: 'serviceCharges', route: '/p2', section: 'Part II', label: 'Financial Institution Service Charges' },
  { path: 'federalIncomeTax', route: '/p2', section: 'Part II', label: 'Federal Income Tax' },
  { list: 'remuneration', field: 'amount', route: '/p7', section: 'Part VII', row: 'Remuneration', label: 'Amount' },
];

const INVENTORY = [
  { list: 'scheduleA1', field: 'fullAssetValue', inline: true, route: '/a1', section: 'A-1', label: 'Full Asset Value' },
  { list: 'scheduleA2', field: 'fullDebtBalance', inline: true, route: '/a2', section: 'A-2', label: 'Full Debt Balance' },
  { list: 'scheduleB1', field: 'fullAssetAmount', inline: true, route: '/b1', section: 'B-1', label: 'Full Asset Amount' },
  { list: 'scheduleB2', field: 'fullAssetValue', inline: true, route: '/b2', section: 'B-2', label: 'Full Asset Value' },
  { list: 'scheduleB3', field: 'fullAssetValue', inline: true, route: '/b3', section: 'B-3', label: 'Full Asset Value' },
  { list: 'scheduleB4', field: 'fullLiabilityBalance', inline: true, route: '/b4', section: 'B-4', label: 'Full Liability Balance' },
  { list: 'scheduleC1', field: 'annualIncomeAmount', inline: true, route: '/c1', section: 'C-1', label: 'Annual Income Amount' },
  { list: 'scheduleC2', field: 'amountOfClaim', inline: true, route: '/c2', section: 'C-2', label: 'Amount of Claim' },
  { list: 'scheduleC3', field: 'estimatedSettlement', inline: true, route: '/c3', section: 'C-3', label: 'Estimated Settlement' },
  { list: 'scheduleC4', field: 'trustAmount', inline: true, route: '/c4', section: 'C-4', label: 'Trust Amount' },
  { list: 'scheduleC5', field: 'totalAssetValue', inline: true, route: '/c5', section: 'C-5', label: 'Total Asset Value' },
  { path: 'bondAmount', inline: true, route: '/d4', section: 'D-4', label: 'Bond Amount' },
];

const PLAN_ANNUAL = [
  { path: 'q11Amount', route: '/p10', section: '11. Remuneration', label: 'Amount received' },
];

// By filing type; the other Plans keep no amount.
const BY_TYPE = {
  annual: ANNUAL_FAMILY,
  finalAccounting: ANNUAL_FAMILY,
  trustAccounting: ANNUAL_FAMILY,
  simplified: SIMPLIFIED,
  guardian: INVENTORY,
  planAnnual: PLAN_ANNUAL,
};

/** The amount fields a filing type keeps (empty for a type that keeps none). */
export function amountFieldsFor(type) {
  return Object.hasOwn(BY_TYPE, type) ? BY_TYPE[type] : [];
}

// Every stored amount of a filing, as { entry, path, value, index, holder, key }.
// (Milestone 73G part 2: sign-advisories.js reads it too.)
export function* storedAmounts(d) {
  if (!d || typeof d !== 'object') return;
  for (const entry of amountFieldsFor(d.inventoryType)) {
    if (entry.path) {
      yield { entry, path: entry.path, value: d[entry.path], holder: d, key: entry.path };
      continue;
    }
    const rows = d[entry.list];
    if (!Array.isArray(rows)) continue;
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (!row || typeof row !== 'object' || !(entry.field in row)) continue;
      yield { entry, path: `${entry.list}.${i}.${entry.field}`, value: row[entry.field], index: i, holder: row, key: entry.field };
    }
  }
}

/**
 * Milestone 73G part 2: the amount entry a box's path names on a filing type
 * ("schC.0.loss" on an Annual is Schedule C's Loss / Reduction), or null.
 * @param {string} type
 * @param {string} path
 */
export function amountEntryFor(type, path) {
  const m = /^(\w+)\.\d+\.(\w+)$/.exec(path || '');
  return amountFieldsFor(type).find((entry) => (entry.path ? entry.path === path : !!m && entry.list === m[1] && entry.field === m[2])) || null;
}

/**
 * When a filing opens: every amount saved as readable text becomes its
 * number ("$1,234.56" becomes 1234.56, "(1000)" -1000); text that is not an
 * amount stays exactly as it was, for amountFieldIssues() to name; numbers
 * and blanks are untouched. Idempotent. (Decision 73G-N2 for the
 * Simplified's remuneration Amount; every other amount the same way, in
 * place of the clamp that used to run on every page drawn.)
 *
 * @param {Record<string, any>} d
 */
export function normalizeAmountFields(d) {
  for (const { holder, key, value } of storedAmounts(d)) {
    if (typeof value !== 'string') continue;
    holder[key] = amountForStore(value);
  }
}

/**
 * An export-check issue for each stored amount that can't be read, on its
 * own page and in its form's words -- bypassable, like an impossible date.
 *
 * @param {Record<string, any>} d
 * @returns {Array<Record<string, any>>}
 */
export function amountFieldIssues(d) {
  const issues = [];
  for (const { entry, path, value, index } of storedAmounts(d)) {
    if (!isUnreadableAmount(value)) continue;
    // The Inventory's checks say "A-1 row 2"; the others "Schedule A — Line 2".
    const where = index === undefined ? '' : (entry.inline ? ` row ${index + 1}` : ` — ${entry.row} ${index + 1}`);
    const label = `${entry.label}: "${String(value).trim()}" can't be read as an amount. ${UNREADABLE_AMOUNT_HINT}`;
    issues.push({
      code: 'field.amount.unreadable', severity: 'blocking',
      section: `${entry.section}${where}`, label, path, route: entry.route,
      message: `${entry.section}${where} — ${label}`,
    });
  }
  return issues;
}
