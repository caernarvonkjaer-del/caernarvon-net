// Milestone 34-1A: shared date-ordering validation rule.
// Canonical date storage is YYYY-MM-DD (see src/core/form/date-parser.js),
// which is directly string-comparable — no Date object parsing needed.

import { validationIssue } from './validation-issue.js';

/**
 * Checks that `laterValue` is on or after `earlierValue` (both canonical
 * YYYY-MM-DD strings). Returns an array of zero or one issue.
 *
 * Milestone 42F: pass `filingType` and `laterPath` (the field the filer
 * should change -- both messages route there, matching the pre-42F
 * adapter's own choice) to get a structured issue with an explicit field
 * path. Without `filingType` the pre-42F bare-string form is returned, so
 * callers that have not converted keep their exact behavior.
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
  filingType,
  laterPath = '',
} = {}) {
  if (!earlierValue || !laterValue) return [];
  const issue = (message) => (filingType ? validationIssue(filingType, message, laterPath) : message);

  if (laterValue < earlierValue) {
    return [issue(`${sectionLabel} — ${laterLabel} must be on or after ${earlierLabel}`)];
  }

  if (!allowSameDay && laterValue === earlierValue) {
    return [issue(sameDayMessage || `${sectionLabel} — ${earlierLabel} and ${laterLabel} cannot be the same day`)];
  }

  return [];
}
