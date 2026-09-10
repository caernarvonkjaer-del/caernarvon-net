// Milestone 34-1A: shared date-ordering validation rule.
// Canonical date storage is YYYY-MM-DD (see src/core/form/date-parser.js),
// which is directly string-comparable — no Date object parsing needed.

/**
 * Checks that `laterValue` is on or after `earlierValue` (both canonical
 * YYYY-MM-DD strings). Returns an array of zero or one error message,
 * matching the flat-array-of-strings convention used by this project's
 * validateX() functions.
 *
 * If either value is empty/missing, no ordering error is produced — a
 * required-field check (if any) is a separate concern.
 */
export function checkDateOrder(earlierValue, laterValue, {
  sectionLabel,
  earlierLabel,
  laterLabel,
  allowSameDay = true,
  sameDayMessage,
} = {}) {
  if (!earlierValue || !laterValue) return [];

  if (laterValue < earlierValue) {
    return [`${sectionLabel} — ${laterLabel} must be on or after ${earlierLabel}`];
  }

  if (!allowSameDay && laterValue === earlierValue) {
    return [sameDayMessage || `${sectionLabel} — ${earlierLabel} and ${laterLabel} cannot be the same day`];
  }

  return [];
}
