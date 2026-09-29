// Milestone 71C: one rule for a share -- a percentage from 0 to 100.
//
// Why, in filer terms. Every Ward's % field in the app was a money field:
// 150 was accepted (the ward "owned" 150% of an asset, inflating every total
// and the bond), and a typed minus sign was silently deleted, so -10 filed as
// 10. The court's workbooks multiply each share into the ward's amount and
// set no range of their own (every <dataValidation> in all three templates was
// read -- none is numeric), so 0-100 is this app's input check, not a workbook
// rule: it changes no formula and no figure for a valid share.
//
// An out-of-range or unreadable share is an ordinary, bypassable validation
// error (decision D7): after "Continue despite outstanding requirements" the
// court output still generates, and the error stays visible. Blank is not this
// module's business -- each form's own required check reports a blank share.

export const PERCENT_MIN = 0;
export const PERCENT_MAX = 100;

/**
 * The problem with a stored share, as the tail of a message ("must be between
 * 0 and 100"), or null when it is blank or in range. Numbers and numeric
 * strings are read as they are; anything else is unreadable.
 * @param {unknown} value
 * @returns {string | null}
 */
export function percentProblem(value) {
  if (value === '' || value === null || value === undefined) return null;
  const n = typeof value === 'number' ? value : Number(String(value).trim());
  if (!Number.isFinite(n)) return 'must be a number from 0 to 100';
  if (n < PERCENT_MIN || n > PERCENT_MAX) return 'must be between 0 and 100';
  return null;
}

/** True when the share is blank or a number from 0 to 100. */
export function isPercentInRange(value) {
  return percentProblem(value) === null;
}
