// Centralized prune engine for empty schedule entries, party cards, and plan repeatable rows.

export const BLANK_CARD_COLLECTIONS = {
  guardians: { min: 1, types: ['guardian', 'annual', 'simplified'] },
  serviceRecipients: { min: 1, types: ['guardian'] },
  witnesses: { min: 0, types: ['guardian'] },
  certRecipients: { min: 1, types: ['annual', 'simplified'] },
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
 * Deep-equals a schedule's own template from BLANK_SCHEDULE_ENTRY.
 */
export function isBlankScheduleEntry(key, entry, registry = (typeof window !== 'undefined' ? window.BLANK_SCHEDULE_ENTRY : null)) {
  if (!registry) return false;
  const template = registry[key];
  if (!template || !entry || typeof entry !== 'object') return false;
  const blank = template();
  for (const k of new Set([...Object.keys(blank), ...Object.keys(entry)])) {
    if (entry[k] !== blank[k]) return false;
  }
  return true;
}

/**
 * Drops every card the user left completely untouched across schedules and party cards.
 * Returns the count of removed cards.
 */
export function pruneBlankCards(targetData, targetType) {
  const data = targetData || (typeof window !== 'undefined' ? window.D : null);
  if (!data) return 0;
  const activeType = targetType || (typeof window !== 'undefined' ? window.activeInventoryType : null);
  const engine = (typeof window !== 'undefined' && window.formEngine) ? window.formEngine(activeType) : activeType;
  let removed = 0;

  const scheduleRegistry = typeof window !== 'undefined' ? window.BLANK_SCHEDULE_ENTRY : null;
  if (scheduleRegistry) {
    for (const key of Object.keys(scheduleRegistry)) {
      const arr = data[key];
      if (!Array.isArray(arr) || !arr.length) continue;
      const kept = arr.filter(e => !isBlankScheduleEntry(key, e, scheduleRegistry));
      if (kept.length !== arr.length) {
        removed += arr.length - kept.length;
        data[key] = kept;
      }
    }
  }

  for (const key of Object.keys(BLANK_CARD_COLLECTIONS)) {
    const spec = BLANK_CARD_COLLECTIONS[key];
    if (engine && spec.types && !spec.types.includes(engine)) continue;
    const arr = data[key];
    if (!Array.isArray(arr) || !arr.length) continue;
    const keep = [];
    arr.forEach((card, i) => { if (!isBlankCard(card)) keep.push(i); });
    for (let i = 0; i < arr.length && keep.length < spec.min; i++) {
      if (!keep.includes(i)) keep.push(i);
    }
    keep.sort((a, b) => a - b);
    if (keep.length === arr.length) continue;
    removed += arr.length - keep.length;
    data[key] = keep.map(i => arr[i]);
    if (key === 'guardians' && Array.isArray(data.guardianPartyIds)) {
      const ids = data.guardianPartyIds;
      data.guardianPartyIds = keep.map(i => ids[i] || null);
    }
  }

  if (removed && typeof window !== 'undefined' && window.autoSave) {
    window.autoSave();
  }
  return removed;
}

// Global exposure
if (typeof window !== 'undefined') {
  window.BLANK_CARD_COLLECTIONS = BLANK_CARD_COLLECTIONS;
  window.isBlankCard = isBlankCard;
  window.isBlankScheduleEntry = isBlankScheduleEntry;
  window.pruneBlankCards = pruneBlankCards;
}
