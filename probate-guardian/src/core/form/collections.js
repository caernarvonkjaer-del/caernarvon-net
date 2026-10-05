// Milestone 73V: one description per repeating list, found by (filing type,
// list key), and one set of row actions every form uses.
//
// Before this, schedule-definitions.js's SCHEDULE_SCHEMAS (keyed by list name
// alone), plan-row-actions.js, prune-cards.js and each form's own row code
// separately knew the factories, floors, limits, blank tests and link arrays.
// The same list differs between forms -- `guardians` has a different row and
// limit on the Inventory, the Annual family and the Simplified; `planGuardians`
// on each Plan -- so a list is looked up by the filing's type as well, and
// there is no generic fallback (AGENTS.md sections 4 and 6). Lists that are
// genuinely identical share one description, registered under each type.
//
// This delivery keeps every form's add, duplicate, remove and clean-up
// behaviour as it was; the one change is that dropping rows moves their
// shared-record links with them (row-links.js). The policies later
// deliveries switch on -- a confirmation before removing a card (73P), clearing
// "no items" on add (73F part 3), keeping a blank row until the filer leaves
// the page (73C), where the cursor goes after an action (73K part 2) -- are
// named below and inactive.
//
// The actions change the filing's data only: saving, redrawing and the output
// revision stay with each caller, exactly where they were.
import { mk } from '../filing/models/guardian.js';
import { planEmptyRow, planGuardianBlank, planGuardianMax } from '../filing/models/plan-rows.js';
import { simplifiedGuardianRow } from '../filing/models/simplified.js';
import { createBankAccountId } from '../accounting/bank-accounts.js';
import { SCH_B4_ACCOUNT_BLOCKS } from '../excel/b4-register-pages.js';
import { SCHEDULE_SCHEMAS } from './schedule-schemas.js';
import { BLANK_SCHEDULE_ENTRY, isBlankCard, isBlankScheduleEntry } from './blank-rows.js';
import { LINKED_ID_ARRAYS, keepRows } from './row-links.js';

// Named for the deliveries that will use them; nothing reads these yet.
const INACTIVE_POLICIES = Object.freeze({
  confirmRemove: null,      // 73P: ask before removing a card that holds anything
  clearNoItemsOnAdd: null,  // 73F part 3: the "no items" key "+ Add" clears
  keepBlankUntilLeave: false, // 73C: a new blank row survives redraws until the filer leaves the page
  focusAfterAction: null,   // 73K part 2: where the cursor goes after an action
});

/**
 * @typedef {object} ListRules
 * @property {string} label
 * @property {() => Record<string, any>} factory  the blank row "+ Add" adds
 * @property {number} floor  removing stops at this many rows
 * @property {number} max    adding and duplicating stop at this many rows
 * @property {(row: any) => boolean} isBlank  the clean-up's untouched-row test
 * @property {string|null} linkedIds  the parallel shared-record link array, if any
 * @property {Readonly<Record<string, any>>} policies  inactive until their deliveries
 */

/** @type {Map<string, ListRules>} */
const registry = new Map();
const keyOf = (filingType, listKey) => `${filingType}\u0000${listKey}`;

/**
 * @param {string} listKey
 * @param {{label: string, factory: () => Record<string, any>, floor?: number, max?: number}} spec
 * @returns {ListRules}
 */
function describeList(listKey, { label, factory, floor = 0, max = Infinity }) {
  return Object.freeze({
    label,
    factory,
    floor,
    max,
    isBlank: BLANK_SCHEDULE_ENTRY[listKey]
      ? (row) => isBlankScheduleEntry(listKey, row)
      : (row) => isBlankCard(row),
    linkedIds: LINKED_ID_ARRAYS[listKey] || null,
    policies: INACTIVE_POLICIES,
  });
}

/** @param {string[]} filingTypes @param {Record<string, ListRules>} lists */
function register(filingTypes, lists) {
  for (const filingType of filingTypes) {
    for (const [listKey, rules] of Object.entries(lists)) {
      if (registry.has(keyOf(filingType, listKey))) throw new Error(`Row rules registered twice for "${listKey}" on "${filingType}"`);
      registry.set(keyOf(filingType, listKey), rules);
    }
  }
}

// ── The Initial Inventory ──────────────────────────────
const INVENTORY_SCHEDULES = {
  scheduleA1: 'a1', scheduleA2: 'a2', scheduleB1: 'b1', scheduleB2: 'b2', scheduleB3: 'b3',
  scheduleB4: 'b4', scheduleC1: 'c1', scheduleC2: 'c2', scheduleC3: 'c3', scheduleC4: 'c4', scheduleC5: 'c5',
};
register(['guardian'], {
  ...Object.fromEntries(Object.entries(INVENTORY_SCHEDULES).map(([listKey, kind]) =>
    [listKey, describeList(listKey, { label: `Schedule ${kind.toUpperCase()} entry`, factory: mk[kind] })])),
  // D-1 offers "+ Add Co-Guardian" below three and no Remove on the first.
  guardians: describeList('guardians', { label: 'Co-Guardian', factory: mk.guardian, floor: 1, max: 3 }),
  // D-5 offers "+ Add Recipient" below four and Remove only above one.
  serviceRecipients: describeList('serviceRecipients', { label: 'Service Recipient', factory: mk.recipient, floor: 1, max: 4 }),
  // The cover's inventory witnesses.
  witnesses: describeList('witnesses', { label: 'Inventory Witness', factory: () => ({ name: '', address: '', occupation: '' }) }),
});

// ── The Annual, Final and Trust Accountings (one engine) ──
const fromSchema = (listKey) => describeList(listKey, SCHEDULE_SCHEMAS[listKey]);
register(['annual', 'finalAccounting', 'trustAccounting'], {
  guardians: fromSchema('guardians'),
  certRecipients: fromSchema('certRecipients'),
  remuneration: fromSchema('remuneration'),
  ...Object.fromEntries(['schA', 'schB1', 'schB2', 'schB3', 'schB4', 'schC', 'schD1', 'schD2', 'schD3', 'schD4', 'schD5', 'schE', 'schF1', 'schF2']
    .map(listKey => [listKey, fromSchema(listKey)])),
  // Schedule B-4's bank accounts: one per account block in the court's workbook.
  schB4Accounts: describeList('schB4Accounts', {
    label: 'Schedule B-4 Bank Account',
    factory: () => ({ id: createBankAccountId(), bankName: '', accountNumber: '' }),
    max: SCH_B4_ACCOUNT_BLOCKS.length,
  }),
});

// ── The Simplified Accounting ──────────────────────────
register(['simplified'], {
  guardians: describeList('guardians', { ...SCHEDULE_SCHEMAS.guardians, factory: simplifiedGuardianRow }),
  certRecipients: fromSchema('certRecipients'),
  remuneration: fromSchema('remuneration'),
});

// ── The four Plans ─────────────────────────────────────
// Each Plan's guardian row and limit are its own; its tables' rows are the
// ones that Plan's "+ Add" buttons name (data-row-type).
const planGuardians = (filingType) => describeList('planGuardians', {
  label: 'Guardian', factory: () => planGuardianBlank(filingType), floor: 1, max: planGuardianMax(filingType),
});
const planTable = (listKey, kind, label) => describeList(listKey, { label, factory: () => planEmptyRow(kind) });
const planRecipients = planTable('certRecipients', 'certRecipient', 'Service Recipient');
register(['planInitial'], {
  planGuardians: planGuardians('planInitial'),
  certRecipients: planRecipients,
  q9Providers: planTable('q9Providers', 'initialProvider', 'Provider'),
  q11Directives: planTable('q11Directives', 'directive', 'Advance Directive'),
});
register(['planAnnual'], {
  planGuardians: planGuardians('planAnnual'),
  certRecipients: planRecipients,
  q1Residences: planTable('q1Residences', 'residence', 'Residence'),
  q4Providers: planTable('q4Providers', 'provider', 'Provider'),
  q10Directives: planTable('q10Directives', 'directive', 'Advance Directive'),
});
register(['planSimplified'], {
  planGuardians: planGuardians('planSimplified'),
  certRecipients: planRecipients,
});
register(['planMinor'], {
  planGuardians: planGuardians('planMinor'),
  certRecipients: planRecipients,
  q2Residences: planTable('q2Residences', 'minorResidence', 'Residence'),
  q3Providers: planTable('q3Providers', 'minorProvider', 'Provider'),
});

/**
 * The rules for one list on one filing type. Throws, naming the pair, when
 * there are none -- including for a filing that carries no type -- so a list
 * nobody described can't quietly fall back to another form's rules.
 * @param {string} filingType
 * @param {string} listKey
 * @returns {ListRules}
 */
export function getCollection(filingType, listKey) {
  const rules = registry.get(keyOf(filingType, listKey));
  if (!rules) throw new Error(`No row rules for the list "${listKey}" on filing type "${filingType || '(none)'}"`);
  return rules;
}

/** Every registered (filing type, list key) pair, for the inventory test. */
export function registeredCollections() {
  return [...registry.keys()].map(key => key.split('\u0000'));
}

// ── Row identity ───────────────────────────────────────
// A row's identity lives in memory only, keyed by the row object: it is never
// saved, exported, counted by a blank test or copied with a row -- a duplicate
// is a new object, so it gets a new identity. Rows rebuilt from saved data (an
// import, a year switch) get new identities.
const rowIdentities = new WeakMap();
let lastRowIdentity = 0;
/** @param {any} row @returns {number|null} */
export function rowIdentity(row) {
  if (!row || typeof row !== 'object') return null;
  let identity = rowIdentities.get(row);
  if (identity === undefined) {
    identity = ++lastRowIdentity;
    rowIdentities.set(row, identity);
  }
  return identity;
}

// ── Row actions ────────────────────────────────────────
const rulesFor = (data, listKey) => {
  if (!data || typeof data !== 'object') throw new Error(`No filing to change the list "${listKey}" on`);
  return getCollection(data.inventoryType, listKey);
};

/**
 * Adds a row at the end, unless the list is at its limit. A list with links
 * gains an unlinked slot beside it. Returns the new row, or null.
 * @param {Record<string, any>} data
 * @param {string} listKey
 * @param {{factory?: () => Record<string, any>}} [options]
 */
export function appendRow(data, listKey, { factory } = {}) {
  const rules = rulesFor(data, listKey);
  if (!Array.isArray(data[listKey])) data[listKey] = [];
  if (data[listKey].length >= rules.max) return null;
  const row = (factory || rules.factory)();
  data[listKey].push(row);
  if (rules.linkedIds) {
    if (!Array.isArray(data[rules.linkedIds])) data[rules.linkedIds] = [];
    data[rules.linkedIds].push(null);
  }
  return row;
}

/**
 * Copies the row at `index` directly beneath it, unless the list is at its
 * limit. The copy starts unlinked. Returns the copy, or null.
 * @param {Record<string, any>} data
 * @param {string} listKey
 * @param {number} index
 */
export function duplicateRowAt(data, listKey, index) {
  const rules = rulesFor(data, listKey);
  const rows = data[listKey];
  const at = Number(index);
  if (!Array.isArray(rows) || !rows[at]) return null;
  if (rows.length >= rules.max) return null;
  const copy = JSON.parse(JSON.stringify(rows[at]));
  rows.splice(at + 1, 0, copy);
  if (rules.linkedIds) {
    if (!Array.isArray(data[rules.linkedIds])) data[rules.linkedIds] = [];
    data[rules.linkedIds].splice(at + 1, 0, null);
  }
  return copy;
}

/**
 * Removes the row at `index`, unless the list is at its floor, with its link.
 * Returns true when a row was removed.
 * @param {Record<string, any>} data
 * @param {string} listKey
 * @param {number} index
 */
export function removeRowAt(data, listKey, index) {
  const rules = rulesFor(data, listKey);
  const rows = data[listKey];
  const at = Number(index);
  if (!Array.isArray(rows) || !(at >= 0 && at < rows.length)) return false;
  if (rows.length <= rules.floor) return false;
  rows.splice(at, 1);
  if (rules.linkedIds && Array.isArray(data[rules.linkedIds])) data[rules.linkedIds].splice(at, 1);
  return true;
}

/**
 * Keeps the rows at `keepIndexes` and drops the rest, with their links (the
 * clean-up, and a form's own normalizing). Returns true when anything dropped.
 * @param {Record<string, any>} data
 * @param {string} listKey
 * @param {number[]} keepIndexes
 */
export function keepRowsAt(data, listKey, keepIndexes) {
  rulesFor(data, listKey);
  return keepRows(data, listKey, keepIndexes);
}
