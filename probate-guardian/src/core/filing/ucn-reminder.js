// Milestone 73S: the UCN (Uniform Case Number), request R4.
//
// Decided by the requester, 2026-10-04 (73S-1 option 2, 73S-2 option 3,
// 73S-4 option 1; 73S-N1): the UCN is starred on all nine covers as a
// reminder, and Preview's "Review recommended" box reminds the filer when it
// is blank or not in the UCN's shape. It never blocks, never changes a
// sidebar mark, in every county. Recorded as the requester's decision, not a
// rule: Rule 2.245(b)(1) makes the uniform case number the clerk's duty, Rule
// 2.525(f)(1)(A) speaks of "a correct case number", and no Clerk workbook has
// a UCN box -- so applying a reminder everywhere presents no one office's
// practice as a statewide requirement (AGENTS.md section 5).
//
// The shape check: with hyphens and spaces removed, 20 characters. It never
// requires "GA" or "XXGD" (court codes vary), never reformats the stored
// value (Milestone 63E keeps it exactly as typed), and the statewide format
// is not sourced in reference/ -- so it is a reminder to check, never a
// verdict.

/** What the box says beneath the UCN, for a sighted filer and a screen reader alike. */
export const UCN_HINT = 'Starred as a reminder: export never stops for a blank UCN.';

/** The UCN's length once its hyphens and spaces are removed. */
export const UCN_LENGTH = 20;

/**
 * 'blank', 'shape' (not 20 characters once hyphens and spaces are removed),
 * or '' (in the UCN's shape).
 * @param {unknown} value
 */
export function ucnProblem(value) {
  const text = String(value ?? '').trim();
  if (!text) return 'blank';
  return text.replace(/[-\s]/g, '').length === UCN_LENGTH ? '' : 'shape';
}

/**
 * Preview's reminder for a blank or misshapen UCN -- an advisory, never a
 * missing item. On the three forms with a court workbook it also says the
 * workbook has no UCN box (Save as Excel says so too, Milestone 73M).
 *
 * @param {Record<string, any>} filing
 * @param {{ section?: string, excel?: boolean }} [options]
 */
export function ucnAdvisories(filing, { section = 'Cover', excel = false } = {}) {
  if (!filing) return [];
  const problem = ucnProblem(filing.ucn);
  if (!problem) return [];
  const workbook = excel ? " The court's Excel workbook has no UCN box; the UCN prints on the PDF." : '';
  const message = problem === 'blank'
    ? `${section} — The UCN is blank. Enter it from the Clerk's case record.${workbook}`
    : `${section} — The UCN "${String(filing.ucn).trim()}" isn't in the UCN's 20-character shape (hyphens and spaces aside). Check it against the Clerk's case record.${workbook}`;
  return [{ code: `ucn.${problem}`, severity: 'advisory', field: 'ucn', message }];
}
