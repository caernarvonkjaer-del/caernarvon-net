// Milestone 73V: a repeating list's rows and the shared-record links that run
// beside them. Several lists keep a parallel array of party ids, one per row
// (D.guardianPartyIds beside D.guardians or D.planGuardians). Code that drops
// rows without moving that array in step leaves the next person linked to the
// removed person's shared record, and a later edit or Sync then copies one
// person's details onto another (AGENTS.md section 6). Every place that keeps
// some rows and drops the rest goes through here, so the links move with them.
//
// Deliberately dependency-free: the row models, the clean-up and the list
// rules all import it, and it imports none of them.

// The parallel link array each list carries, by list key. The same array name
// serves every form that has the list, so this is keyed by list alone.
export const LINKED_ID_ARRAYS = Object.freeze({
  guardians: 'guardianPartyIds',
  planGuardians: 'guardianPartyIds',
});

/**
 * Re-points a list's link array after the rows at `keepIndexes` (positions in
 * the list as it was) were kept and every other row dropped. A link missing
 * from a short array reads as unlinked (null), as it always has. Leaves the
 * array alone when the list has none, or when the filing has never had one.
 * @param {Record<string, any>} data
 * @param {string} listKey
 * @param {number[]} keepIndexes
 */
export function remapLinkedIds(data, listKey, keepIndexes) {
  const linkedKey = LINKED_ID_ARRAYS[listKey];
  if (!linkedKey || !data || !Array.isArray(data[linkedKey])) return;
  const ids = data[linkedKey];
  data[linkedKey] = keepIndexes.map(i => ids[i] || null);
}

/**
 * Milestone 73F part 3: a date still being typed is kept as a draft keyed by
 * its full path (commit-coordinator.js's `__fieldDrafts`, "schB1.2.datePaid"),
 * so it must move with its row too. Removing row 1 used to leave row 3's
 * draft on whichever row moved into index 2 -- its text shown in the wrong
 * row -- and a list cut below that index left the draft orphaned: an
 * impossible date nobody could see or clear. `newIndexFor(old)` gives each
 * row's new index, or -1 for a row that went (its drafts go with it).
 * @param {Record<string, any>} data
 * @param {string} listKey
 * @param {(oldIndex: number) => number} newIndexFor
 */
export function remapFieldDrafts(data, listKey, newIndexFor) {
  const drafts = data?.__fieldDrafts;
  if (!drafts || typeof drafts !== 'object') return;
  const prefix = `${listKey}.`;
  const moved = {};
  for (const path of Object.keys(drafts)) {
    if (!path.startsWith(prefix)) continue;
    const m = /^(\d+)(\..*)?$/.exec(path.slice(prefix.length));
    if (!m) continue;
    const record = drafts[path];
    delete drafts[path];
    const to = newIndexFor(Number(m[1]));
    if (to >= 0) moved[`${prefix}${to}${m[2] || ''}`] = record;
  }
  Object.assign(drafts, moved);
}

/**
 * Keeps the rows at `keepIndexes` (in that order) and drops the rest, moving
 * the list's links -- and its dates still being typed -- with them. Returns
 * true when anything was dropped.
 * @param {Record<string, any>} data
 * @param {string} listKey
 * @param {number[]} keepIndexes
 */
export function keepRows(data, listKey, keepIndexes) {
  const rows = Array.isArray(data?.[listKey]) ? data[listKey] : [];
  const unchanged = keepIndexes.length === rows.length && keepIndexes.every((index, position) => index === position);
  if (unchanged) return false;
  data[listKey] = keepIndexes.map(i => rows[i]);
  remapLinkedIds(data, listKey, keepIndexes);
  remapFieldDrafts(data, listKey, (old) => keepIndexes.indexOf(old));
  return true;
}
