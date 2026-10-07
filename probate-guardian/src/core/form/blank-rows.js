// What counts as an untouched row, for the clean-up that drops one when the
// filer leaves the page (prune-cards.js) and for the list rules
// (collections.js). Moved out of prune-cards.js by Milestone 73V, unchanged, so
// the list rules can read these tests without an import cycle; prune-cards.js
// re-exports them under their old names.
import { mk } from '../filing/models/guardian.js';
import { SCHEDULE_SCHEMAS } from './schedule-schemas.js';

// Financial line-item schedules covered by pruneBlankCards() (the router runs
// it on leaving a page), keyed by their property on D, each mapped to the exact blank
// object its own +Add button pushes. These need a deep compare against that
// template rather than a generic emptiness test, because several of their
// fields default to something other than '' -- Guardian's wardPercent
// starts at 100, Annual's Yes/No fields start at 'No' -- and a generic test
// would never recognize those as untouched. Party and plan cards, whose
// fields are all seeded empty, use BLANK_CARD_COLLECTIONS below instead.
export const BLANK_SCHEDULE_ENTRY = {
  // Guardian form (Initial Inventory) -- same factory addEntry() already uses.
  scheduleA1:mk.a1, scheduleA2:mk.a2, scheduleB1:mk.b1, scheduleB2:mk.b2, scheduleB3:mk.b3,
  scheduleB4:mk.b4, scheduleC1:mk.c1, scheduleC2:mk.c2, scheduleC3:mk.c3, scheduleC4:mk.c4, scheduleC5:mk.c5,
  // Annual Accounting -- since Milestone 73F part 3, the rows "+ Add" itself
  // adds (SCHEDULE_SCHEMAS, which collections.js's factories are). These were
  // hand copies, and five had drifted from what "+ Add" pushes (B-3's period,
  // B-4's account, D-1/D-2/D-4's "No" defaults), so an untouched row on those
  // schedules was never cleaned up and counted as an entry.
  ...Object.fromEntries(['schA', 'schB1', 'schB2', 'schB3', 'schB4', 'schC', 'schD1', 'schD2', 'schD3', 'schD4', 'schD5', 'schE', 'schF1', 'schF2']
    .map((key) => [key, SCHEDULE_SCHEMAS[key].factory])),
};

export const BLANK_CARD_COLLECTIONS = {
  // Milestone 74A: Guardian #1's card always stays (keepFirst), whatever it
  // holds. With only `min: 1`, an empty first card and a filled co-guardian
  // lost the empty card here, and the co-guardian moved into Guardian #1
  // without a word -- though the pages offer no Remove on the first card, the
  // three Excel imports keep its slot, and the Plans keep theirs (below).
  guardians: { min: 1, keepFirst: true, types: ['guardian', 'annual', 'simplified'] },
  serviceRecipients: { min: 1, types: ['guardian'] },
  witnesses: { min: 0, types: ['guardian'] },
  // Milestone 68C: the four Plans carry the accountings' recipient shape.
  certRecipients: { min: 1, types: ['annual', 'simplified', 'planAnnual', 'planSimplified', 'planInitial', 'planMinor'] },
  remuneration: { min: 0, types: ['annual', 'simplified'] },
  // Plan-family repeatable rows, each already served by +Add/Remove.
  q1Residences: { min: 0, types: ['planAnnual'] },
  q4Providers: { min: 0, types: ['planAnnual'] },
  q10Directives: { min: 0, types: ['planAnnual'] },
  // Milestone 37-4: Initial Plan gained a real +Add/Remove affordance for
  // this collection (see pagePlanIDirectives()); excluded before that
  // existed, per this table's own rule above.
  q11Directives: { min: 0, types: ['planInitial'] },
  q9Providers: { min: 0, types: ['planInitial'] },
  q2Residences: { min: 0, types: ['planMinor'] },
  q3Providers: { min: 0, types: ['planMinor'] },
  // Milestone 73C: the Plans' guardian blocks. Drawing the Signatures page used
  // to drop an empty co-guardian block, so "+ Add Co-Guardian" did nothing; an
  // untouched one goes here instead. The first block always stays (keepFirst),
  // as it did when the page dropped them: a co-guardian never moves into it.
  planGuardians: { min: 1, keepFirst: true, types: ['planInitial', 'planAnnual', 'planSimplified', 'planMinor'] },
};

/**
 * Checks if a card is completely blank (all fields are null, undefined, '', false, or empty array).
 * Note: 0 is treated as a valid non-empty number.
 */
export function isBlankCard(card) {
  if (!card || typeof card !== 'object') return false;
  const values = Object.values(card);
  if (!values.length) return false;
  return values.every(v => v === null || v === undefined || v === '' || v === false || (Array.isArray(v) && !v.length));
}

/**
 * Whether a schedule row is untouched: every field still blank, or still at
 * the default its "+ Add" row starts with (BLANK_SCHEDULE_ENTRY). Milestone
 * 73F part 3: a blank field counts as untouched whatever the template holds,
 * so a row saved under an older template shape (no "No" defaults) is
 * recognised too, and "a blank row counts as no row" everywhere it is asked.
 */
export function isBlankScheduleEntry(key, entry, registry = BLANK_SCHEDULE_ENTRY) {
  if (!registry) return false;
  const template = registry[key];
  if (!template || !entry || typeof entry !== 'object') return false;
  const blank = template();
  const isEmpty = (v) => v === '' || v === null || v === undefined;
  for (const k of new Set([...Object.keys(blank), ...Object.keys(entry)])) {
    if (entry[k] !== blank[k] && !isEmpty(entry[k])) return false;
  }
  return true;
}
