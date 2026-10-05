// Milestone 73D: when each Plan "Explanation" box is shown -- one rule per
// box, read by the page (which hides the box otherwise) and by the PDF (which
// files the box's text only while it is shown).
//
// The page hid a box once its Other or None answer was unticked, but the PDF
// printed any Explanation that held text, so a filer who ticked Other, typed
// an explanation and then ticked something else instead filed both the new
// answer and "Explanation: ...". Hidden text is kept, never deleted (AGENTS.md
// section 4): it returns, and files again, when the box is shown again.
//
// Each Plan's rules are written out here from that page's own conditions;
// the Simplified Plan has no such boxes. Explanations a page always shows
// (the Annual Plan's Q7 and certification explanations) are not listed.
import { isAffirmative } from '../form/form-contract.js';

/** @typedef {Readonly<Record<string, (d: Record<string, any>) => boolean>>} ExplanationRules */

/** @type {ExplanationRules} */
export const PLAN_INITIAL_EXPLANATIONS = Object.freeze({
  q2Explain: (d) => !!d.q2Other,
  q3MedExplain: (d) => !!d.q3MedOther,
  q4Explain: (d) => !!(d.q4Other || d.q4None),
  q5Explain: (d) => !!d.q5Other,
  q6Explain: (d) => !!d.q6Other,
  // Milestone 40C-H: the same predicate validatePlanInitial() and
  // computeNavChecks() use for this box.
  q7Explain: (d) => isAffirmative(d.q7Trusts) || isAffirmative(d.q7PendingBenefits) || !!d.q7Other,
  mentalExplain: (d) => !!d.mentalOther,
  physExplain: (d) => !!d.physOther,
  usesExplain: (d) => !!d.usesOther,
  needsExplain: (d) => !!d.needsOther,
  // The "Other" advance directive's description.
  q11ExecOtherText: (d) => !!d.q11ExecOther,
  committeeExplain: (d) => d.committeeIncorporated === 'No',
});

/** @type {ExplanationRules} */
export const PLAN_ANNUAL_EXPLANATIONS = Object.freeze({
  q3SettingExplain: (d) => !!d.q3SettingOther,
  q3MedExplain: (d) => !!(d.q3MedOther || d.q3MedNone),
  q3MentalExplain: (d) => !!(d.q3MentalOther || d.q3MentalNone),
  q3PersonalExplain: (d) => !!(d.q3PersonalOther || d.q3PersonalNone),
  q3SocialExplain: (d) => !!(d.q3SocialOther || d.q3SocialNone),
  q3BenefitsExplain: (d) => !!(d.q3BenefitsOther || d.q3BenefitsNone),
  q9MentalExplain: (d) => !!d.q9MentalOther,
  q9PhysExplain: (d) => !!d.q9PhysOther,
  q9UsesExplain: (d) => !!d.q9UsesOther,
  q9NeedsExplain: (d) => !!d.q9NeedsOther,
});

/** @type {ExplanationRules} */
export const PLAN_MINOR_EXPLANATIONS = Object.freeze({
  q4Explain: (d) => !!d.q4Other,
  q5Explain: (d) => !!d.q5Other,
});

/**
 * Whether the box for `id` is shown. Throws for a box with no rule, so a new
 * Explanation can't be filed without one.
 * @param {ExplanationRules} rules
 * @param {Record<string, any>} d
 * @param {string} id
 */
export function explanationShown(rules, d, id) {
  const shown = rules[id];
  if (!shown) throw new Error(`No rule for when the Plan explanation "${id}" is shown`);
  return !!(d && shown(d));
}

/** The box's text while it is shown, else ''. */
export function shownExplanation(rules, d, id) {
  return explanationShown(rules, d, id) ? (d[id] || '') : '';
}
