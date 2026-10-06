// Milestone 73F part 2: the Yes/No helpers, moved unchanged from
// src/core/form/form-contract.js (which re-exports them) so the export
// checks can use them without importing the field-write path: the checks
// now feed the sidebar, which that path refreshes, and importing it back
// made a cycle. Pure functions; they import nothing.

/**
 * Read-side counterpart to the yes-no write contract below (writeDraftValue()/
 * finalizeFieldValue(), which store the literal STRINGS 'Yes'/'No' for any
 * control marked data-form-value="yes-no").
 *
 * Every such field is tri-state -- '' (never answered), 'Yes', or 'No' -- so
 * a plain truthiness test is always wrong: 'No' is a non-empty string and
 * therefore truthy. That exact mistake shipped in two PDF renderers
 * (`d.amendedForm ? 'Yes' : 'No'`), which made every Annual and Simplified
 * Accounting PDF print "Amended Form? Yes" in all three states, including
 * the default. Render these fields through this helper rather than testing
 * them directly.
 *
 * `blank` is what an unanswered field prints as; pass '' for a truly empty
 * cell, or keep the 'No' default where the form treats "not answered" and
 * "No" the same way on paper.
 */
export function yesNoText(value, blank = 'No') {
  if (value === true) return 'Yes';
  if (value === false) return 'No';
  const normalized = String(value ?? '').trim().toLowerCase();
  if (normalized === 'yes') return 'Yes';
  if (normalized === 'no') return 'No';
  return blank;
}

// Use for plan questions where the court form requires an explicit answer.
// Legacy false values remain "No"; only absent/null values remain unanswered.
export function triStateText(value) {
  return yesNoText(value, '');
}

// Milestone 40C-H: "did the filer actually answer Yes?" -- the one predicate
// for gating a conditional requirement on a Yes/No question.
//
// Needed because these values are not booleans. Tri-state questions store the
// canonical strings 'Yes'/'No' (Milestone 37-5) while legacy wards still hold
// real booleans, and a plain truthiness test on the non-empty string 'No' is
// TRUE. That is exactly how Plan Initial's Question 7 came to demand an
// explanation from a filer who had answered No to everything, blocking an
// otherwise complete filing. Unanswered stays unanswered -- this never coerces
// a blank to No.
export function isAffirmative(value) {
  return yesNoText(value, '') === 'Yes';
}

export function isTriStateAnswer(value) {
  return triStateText(value) !== '';
}
