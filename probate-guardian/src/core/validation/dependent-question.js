// A Yes/No question whose "Yes" branch has a detail the court needs.
//
// Two of these exist: "has the surety bond been waived?" (Initial Inventory,
// detail = the date of the order) and "does a restricted depository apply?"
// (Annual family, detail = the date of the most recent receipt). Both used to
// be inferred from the detail alone, which cannot tell these apart:
//
//   - waived, and the filer has not entered the order date yet
//   - not waived, so there is no order date to enter
//
// A blank date meant both, so the filing went out either way and the court had
// no way to know which it was looking at.
//
// WHAT THE FORMS DO AND DO NOT ASK
// Neither court form carries the question. Initial Inventory PART V asks only
// "If the surety bond has been waived, note the date of the order"; Annual
// PART IX asks only "Date of most recent Receipt of Cash Assets". Verified
// against both templates on 2026-09-19 with an XML parser.
//
// So these answers are an app-side gate and are deliberately NOT written to
// the workbook -- there is no cell for them, and inventing one would put text
// on a court form the Clerk did not design (AGENTS.md sections 13 and 2). What
// reaches the workbook is what always did: the date, when there is one.
//
// LEGACY FILINGS
// The answer is inferred where it is read rather than migrated on load. A
// stored filing that predates the question has a date but no answer, and a
// date can only have been entered because the thing happened -- so a non-empty
// detail reads as "Yes". The reverse is not true: an absent detail stays
// UNANSWERED and never becomes "No", which AGENTS.md section 3 forbids.

export const YES = 'Yes';
export const NO = 'No';

/** True for an explicit Yes, tolerating the legacy boolean form. */
export function isYes(value) {
  return value === true || value === YES;
}

/** True for an explicit No, tolerating the legacy boolean form. */
export function isNo(value) {
  return value === false || value === NO;
}

/** True only for an explicit answer. '' , null and undefined are unanswered. */
export function isAnswered(value) {
  return isYes(value) || isNo(value);
}

/**
 * The effective answer, inferring Yes from a legacy filing that has the detail
 * but no answer. Never infers No -- an absent detail is simply unanswered.
 *
 * @param {*} answer the stored tri-state
 * @param {*} detail the dependent value (a date, in both current uses)
 */
export function effectiveAnswer(answer, detail) {
  if (isAnswered(answer)) return isYes(answer) ? YES : NO;
  return String(detail ?? '').trim() ? YES : '';
}

/**
 * What a filing owes on this question, as a state the caller turns into an
 * issue. Implements Decision 6: an unanswered question is worth an
 * acknowledgement, a half-finished Yes is a blocker, and No is complete.
 *
 * @returns {'unanswered'|'missing-detail'|'complete'}
 */
export function dependentQuestionState(answer, detail) {
  const effective = effectiveAnswer(answer, detail);
  if (!effective) return 'unanswered';
  if (effective === YES && !String(detail ?? '').trim()) return 'missing-detail';
  return 'complete';
}
