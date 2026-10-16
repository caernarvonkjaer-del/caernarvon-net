// @ts-nocheck -- in tsconfig.json's checked program only transitively (router.js -> nav-marks.js -> section-marks.js -> the
// export checks, Milestone 73F part 2); never written with JSDoc types (AGENTS.md section 2).
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

/**
 * Milestone 74G (decision 74G-1): how far an accounting period runs. `limit`
 * is the last day of the twelfth month after `from`'s month (03/15/2026 gives
 * 03/31/2027): `longerThanAYear` when `to` is after it, `endsAfterToday` when
 * `to` is after `today`. Canonical YYYY-MM-DD strings; null when either date
 * is missing or the period runs backwards, which checkDateOrder() reports.
 */
export function checkPeriodSpan(from, to, { today = '' } = {}) {
  const ISO = /^\d{4}-\d{2}-\d{2}$/;
  if (!ISO.test(from || '') || !ISO.test(to || '') || to < from) return null;
  const [year, month] = from.split('-').map(Number);
  const lastDay = new Date(Date.UTC(year + 1, month, 0)).getUTCDate();
  const limit = `${year + 1}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  return { limit, longerThanAYear: to > limit, endsAfterToday: !!today && to > today };
}
