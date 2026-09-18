import { resolveDescriptorForInventoryType } from './filing-descriptor.js';
import { resolveActiveDocPeriod } from '../pdf/supplemental-pdf.js';

// Milestone 57C-R: the supplemental-documentation acknowledgement.
//
// A filer who has entered rows into a financial schedule owes the court
// supporting documentation for them, and the app does not collect it for them.
// This module answers the three questions that decides: is this schedule one
// that carries the obligation, does it currently have rows, and has the filer
// already acknowledged it for the period being reported.
//
// WHAT THIS DELIBERATELY IS NOT. It raises no validation issue and touches no
// navigation check. Milestone 57's first attempt did both -- it pushed the same
// condition into validateGuardian()/validateAnnual() AND computeNavChecks() --
// which meant no filing was ever "clean", the Preview blocked-panel appeared on
// filings that should have exported, and the sidebar reported sections
// incomplete. That cost 46 e2e failures across 16 specs and the milestone was
// reverted (ecabe69). Nothing here participates in whether a filing can be
// exported. If a future change makes it do so, that is a policy decision, not
// a refactor.
//
// Route keys are the schedule identifiers the feature mount() functions already
// switch on ('/a1' -> 'a1', '/scha' -> 'schA'), mapped here to the collection
// that actually holds the rows. Verified against src/legacy-app.js:5614
// (Guardian) and src/core/state.js:434 (Annual family).

export const FINANCIAL_SCHEDULE_COLLECTIONS = Object.freeze({
  guardian: Object.freeze({
    a1: 'scheduleA1', a2: 'scheduleA2', b1: 'scheduleB1', b2: 'scheduleB2',
    b3: 'scheduleB3', b4: 'scheduleB4', c1: 'scheduleC1', c2: 'scheduleC2',
    c3: 'scheduleC3', c4: 'scheduleC4', c5: 'scheduleC5',
  }),
  annual: Object.freeze({
    schA: 'schA', schB1: 'schB1', schB2: 'schB2', schB3: 'schB3',
    schB4: 'schB4', schC: 'schC', schD1: 'schD1', schD2: 'schD2',
    schD3: 'schD3', schD4: 'schD4', schD5: 'schD5', schE: 'schE',
    schF1: 'schF1', schF2: 'schF2',
  }),
});

/**
 * Which schedule family a filing type uses, derived from the canonical
 * descriptor registry rather than hand-listed.
 *
 * Milestone 57's first attempt enumerated 'annual', 'finalAccounting' and
 * 'trustAccounting' by hand here, and filing-type-enumeration-guard.spec.js
 * caught it -- that guard exists precisely because a hand list drifts the
 * moment a filing type is added. The three accounting types already share
 * engineId 'annual' in filing-descriptor.js, so asking the registry is both
 * shorter and correct by construction.
 *
 * Returns '' for every family with no entry-collection-plus-upload schedules,
 * which is the Plan family (narrative pages) and Simplified Annual Accounting.
 * Simplified's exclusion is deliberate and checkable rather than an oversight:
 * it ships no Supporting Documents sections at all (zero matches in
 * src/features/simplified-accounting/index.js), so there is nowhere to attach
 * the documentation this acknowledgement refers to. If that ever changes,
 * adding 'simplified' here is the whole change.
 */
export function scheduleAckFamily(inventoryType) {
  const engineId = resolveDescriptorForInventoryType(inventoryType)?.engineId || '';
  return Object.prototype.hasOwnProperty.call(FINANCIAL_SCHEDULE_COLLECTIONS, engineId) ? engineId : '';
}

/** Case-insensitive, because route strings and collection keys differ in case. */
function canonicalKey(family, scheduleKey) {
  const map = FINANCIAL_SCHEDULE_COLLECTIONS[family];
  if (!map) return '';
  const wanted = String(scheduleKey || '').toLowerCase();
  return Object.keys(map).find((key) => key.toLowerCase() === wanted) || '';
}

/** '/a1' -> 'a1', '/scha' -> 'schA'; '' when the route is not a financial schedule. */
export function scheduleKeyForRoute(inventoryType, route) {
  const family = scheduleAckFamily(inventoryType);
  if (!family) return '';
  return canonicalKey(family, String(route || '').replace(/^\//, ''));
}

export function isFinancialSchedule(inventoryType, scheduleKey) {
  return Boolean(canonicalKey(scheduleAckFamily(inventoryType), scheduleKey));
}

export function isSchedulePopulated(data, inventoryType, scheduleKey) {
  const family = scheduleAckFamily(inventoryType);
  const key = canonicalKey(family, scheduleKey);
  if (!key) return false;
  const rows = data?.[FINANCIAL_SCHEDULE_COLLECTIONS[family][key]];
  return Array.isArray(rows) && rows.length > 0;
}

// The acknowledgement is nested by period and then by schedule:
//   D.scheduleDocsAck = { [periodKey]: { a1: true, schB1: true } }
//
// Period-nested because the obligation recurs: a new reporting period is a new
// set of receipts and bank statements, so the filer is asked again. The key
// MUST come from resolveActiveDocPeriod(), the same resolver scheduleDocs uses
// for the uploads themselves -- deriving it any other way lets an
// acknowledgement drift out of alignment with the documents it refers to, and
// that stays invisible until a filer is re-asked for a period they already
// confirmed, or not asked for one they had not.
export function scheduleAckPeriod(data) {
  return resolveActiveDocPeriod(data);
}

export function isScheduleAcknowledged(data, inventoryType, scheduleKey) {
  const family = scheduleAckFamily(inventoryType);
  const key = canonicalKey(family, scheduleKey);
  if (!key) return false;
  return data?.scheduleDocsAck?.[scheduleAckPeriod(data)]?.[key] === true;
}

/** Records a yes. Returns false when the schedule is not one this applies to. */
export function recordScheduleAck(data, inventoryType, scheduleKey) {
  const family = scheduleAckFamily(inventoryType);
  const key = canonicalKey(family, scheduleKey);
  if (!key || !data || typeof data !== 'object') return false;
  const period = scheduleAckPeriod(data);
  if (!data.scheduleDocsAck || typeof data.scheduleDocsAck !== 'object') data.scheduleDocsAck = {};
  if (!data.scheduleDocsAck[period] || typeof data.scheduleDocsAck[period] !== 'object') {
    data.scheduleDocsAck[period] = {};
  }
  data.scheduleDocsAck[period][key] = true;
  return true;
}

/**
 * The single question the mount() hook asks: should the filer be shown the
 * acknowledgement for this route right now?
 *
 * Guarded on `populated` so a fresh filing does not greet the filer with a
 * dialog on every schedule page -- the modal fires on navigation, so an
 * unguarded version would produce 25 of them.
 */
export function needsScheduleAck(data, inventoryType, route) {
  const key = scheduleKeyForRoute(inventoryType, route);
  if (!key) return false;
  return isSchedulePopulated(data, inventoryType, key)
    && !isScheduleAcknowledged(data, inventoryType, key);
}

/**
 * The mount() hook, shared so the two feature modules cannot drift apart.
 *
 * Fires at most one modal per navigation, only for a populated schedule the
 * filer has not yet acknowledged for this period. A non-yes records nothing
 * and blocks nothing -- the page has already rendered and stays usable, and
 * the question returns on the next visit. `confirmModal` resolves false on
 * Escape as well as Cancel, which is exactly why a refusal must not discard
 * anything: a stray keypress would otherwise silently undo a deliberate act
 * with nothing on screen to explain it.
 *
 * @param {object} data active ward data (`window.D`)
 * @param {string} inventoryType
 * @param {string} route the page just mounted, e.g. '/a1'
 * @param {(opts: object) => Promise<boolean>} confirmFn injected for testing
 * @returns {Promise<boolean>} whether an acknowledgement was recorded
 */
let promptInFlight = false;

export async function promptScheduleAckIfNeeded(data, inventoryType, route, confirmFn) {
  // Re-entrancy guard. The caller does not await this (see the feature
  // modules' notes on why awaiting it wedges the router), and a single filer
  // action can re-render a page more than once -- addEntry() ends with
  // renderPage(), and mount() itself triggers further work. Without this, two
  // mounts in quick succession stack two dialogs on top of each other, which
  // schedule-doc-ack.spec.ts caught as a strict-mode violation resolving to
  // two overlays. One question at a time; a mount that arrives while a prompt
  // is open simply does nothing, and the next navigation asks again if the
  // schedule is still unacknowledged.
  if (promptInFlight) return false;
  if (!needsScheduleAck(data, inventoryType, route)) return false;
  const key = scheduleKeyForRoute(inventoryType, route);
  const label = String(key).replace(/^sch/i, '').toUpperCase();
  promptInFlight = true;
  let confirmed = false;
  try {
    confirmed = await confirmFn({
      title: 'Supporting documentation',
      message: `You have entered items on Schedule ${label}.\n\n`
        + 'The court expects supporting documentation for these entries — statements, receipts, '
        + 'invoices or similar records. Probate Guardian does not collect or file that for you.\n\n'
        + "You can attach PDFs in this schedule's Supporting Documents section, or keep them and "
        + 'file them separately, whichever your circuit requires.',
      confirmLabel: 'I understand',
      cancelLabel: 'Not now',
    });
  } finally {
    promptInFlight = false;
  }
  if (!confirmed) return false;
  recordScheduleAck(data, inventoryType, key);
  return true;
}

/** Test seam: clears the in-flight guard between cases. */
export function __resetScheduleAckPrompt() { promptInFlight = false; }

/**
 * Legacy `.sav` migration. A case file written before 57C-R has no
 * scheduleDocsAck at all; one written by a future build might have a
 * non-object there. Either way the filer has acknowledged nothing, which is
 * the safe reading -- they get asked, rather than silently treated as having
 * confirmed an obligation they never saw.
 */
export function normalizeScheduleDocsAck(data) {
  if (!data || typeof data !== 'object') return;
  const existing = data.scheduleDocsAck;
  if (!existing || typeof existing !== 'object' || Array.isArray(existing)) {
    data.scheduleDocsAck = {};
    return;
  }
  for (const [period, value] of Object.entries(existing)) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) delete existing[period];
  }
}
