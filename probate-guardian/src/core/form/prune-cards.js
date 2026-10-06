// Centralized prune engine for empty schedule entries, party cards, and plan repeatable rows.
//
// A card the filer added and never touched disappears when they leave the page
// (the router and the dashboard entry run pruneBlankCards()). Milestone 70's
// 70C gave this module the schedule table it used to read off window
// (BLANK_SCHEDULE_ENTRY, moved from legacy-app.js) and made its callers import
// it: before that, on this branch nothing loaded the module, so the clean-up
// never ran -- the defect master fixed in b28bf25, carried here.
import { formEngine } from '../filing/filing-registry.js';
import { getD } from '../state.js';
import { BLANK_CARD_COLLECTIONS, BLANK_SCHEDULE_ENTRY, isBlankCard, isBlankScheduleEntry } from './blank-rows.js';
import { getCollection } from './collections.js';
import { keepRows } from './row-links.js';
import { commitModelChange } from '../model-change.js';

// Milestone 73V: the blank tests and the two tables moved, unchanged, to
// blank-rows.js (so the list rules can read them without an import cycle).
// They keep their names here for this module's callers and tests.
export { BLANK_CARD_COLLECTIONS, BLANK_SCHEDULE_ENTRY, isBlankCard, isBlankScheduleEntry };

/**
 * Drops every card the user left completely untouched across schedules and party cards.
 * Returns the count of removed cards.
 */
export function pruneBlankCards(targetData, targetType) {
  const data = targetData || (typeof window !== 'undefined' ? getD() : null);
  if (!data) return 0;
  // The filing's own type. (This read window.activeInventoryType until
  // Milestone 70's 70C -- the same value for the open filing, which is the one
  // the callers prune.)
  const activeType = targetType || data.inventoryType;
  const engine = formEngine(activeType);
  let removed = 0;
  const changed = [];

  for (const key of Object.keys(BLANK_SCHEDULE_ENTRY)) {
    const arr = data[key];
    if (!Array.isArray(arr) || !arr.length) continue;
    const kept = arr.filter(e => !isBlankScheduleEntry(key, e, BLANK_SCHEDULE_ENTRY));
    if (kept.length !== arr.length) {
      removed += arr.length - kept.length;
      data[key] = kept;
      changed.push(key);
    }
  }

  for (const key of Object.keys(BLANK_CARD_COLLECTIONS)) {
    const spec = BLANK_CARD_COLLECTIONS[key];
    if (engine && spec.types && !spec.types.includes(engine)) continue;
    const arr = data[key];
    if (!Array.isArray(arr) || !arr.length) continue;
    // Milestone 73V: a typed filing's list must have rules (collections.js).
    // Milestone 73C: and the rules say what an untouched card is on that form
    // -- on the Inventory's D-1, a card with none of the fields D-1 counts as
    // entered. A list may keep its first card whatever it holds (keepFirst).
    const isBlank = activeType ? getCollection(activeType, key).isBlank : isBlankCard;
    const keep = [];
    arr.forEach((card, i) => { if ((spec.keepFirst && i === 0) || !isBlank(card)) keep.push(i); });
    for (let i = 0; i < arr.length && keep.length < spec.min; i++) {
      if (!keep.includes(i)) keep.push(i);
    }
    keep.sort((a, b) => a - b);
    if (keep.length === arr.length) continue;
    removed += arr.length - keep.length;
    changed.push(key);
    // Milestone 73V: every list's shared-record links move with its rows --
    // the same re-indexing this did for `guardians` alone.
    keepRows(data, key, keep);
  }

  // Milestone 73J part 1: the lists it emptied of untouched rows.
  if (removed) commitModelChange('clean-up', changed);
  return removed;
}
