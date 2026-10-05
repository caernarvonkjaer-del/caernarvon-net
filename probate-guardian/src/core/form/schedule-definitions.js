// Milestone 26: Declarative Schedule & Repeatable Group Definitions
// Centralizes row factories, constraints, party ID lockstep sync, and calculation hooks.
//
// Milestone 73V: the rules now live in collections.js, found by the filing's
// type and the list (the same list differs between forms). These three
// functions keep their signatures for their callers -- the Annual family's and
// the Simplified's row actions -- and still mark the output revision, as
// before. A filing with no type, or a list with no rules, now fails loudly
// instead of quietly doing nothing. SCHEDULE_SCHEMAS stays exported, holding
// exactly what it held, for the code and tests that read it; it is deprecated
// as a lookup.
import { getD } from '../state.js';
import { markFilingRevisionChanged } from '../filing/output-revision.js';
import { appendRow, duplicateRowAt, removeRowAt } from './collections.js';

export { SCHEDULE_SCHEMAS } from './schedule-schemas.js';

/**
 * Adds a new clean row to a collection, respecting max constraint and party synchronization.
 */
export function addCollectionRow(collectionKey, data = (typeof window !== 'undefined' ? getD() : null), factoryOverride = null) {
  if (!data) return false;
  if (!appendRow(data, collectionKey, factoryOverride ? { factory: factoryOverride } : {})) return false;
  markFilingRevisionChanged('collection-add');
  return true;
}

/**
 * Duplicates a row at index, respecting max constraint and party synchronization.
 * Duplicated rows start with a unlinked (null) party ID to prevent accidental alias collisions.
 */
export function duplicateCollectionRow(collectionKey, index, data = (typeof window !== 'undefined' ? getD() : null)) {
  if (!data) return false;
  if (!duplicateRowAt(data, collectionKey, index)) return false;
  markFilingRevisionChanged('collection-duplicate');
  return true;
}

/**
 * Removes a row at index, respecting floor constraint and party synchronization.
 */
export function removeCollectionRow(collectionKey, index, data = (typeof window !== 'undefined' ? getD() : null)) {
  if (!data) return false;
  if (!removeRowAt(data, collectionKey, index)) return false;
  markFilingRevisionChanged('collection-remove');
  return true;
}
