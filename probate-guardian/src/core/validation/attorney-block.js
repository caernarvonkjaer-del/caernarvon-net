// Milestone 58C: one answer to "has this filer started entering an attorney?"
//
// Why it matters, in filer terms. The Initial Guardianship Plan's attorney
// certification is optional as a whole: a pro se filer, or a Chapter 393
// Guardian Advocate exempt from attorney representation under Fla. Prob. R.
// 5.030, must be able to complete and export without one. So nothing in the
// attorney block may be a blocker on a filing that has no attorney. But once
// the filer HAS started entering an attorney, the certification has to be
// finished -- a half-entered attorney is worse than none, because the court
// receives a certification naming someone with no way to serve them.
//
// The rule is therefore conditional, and the condition has to be computed the
// same way everywhere. Before this module it was written out twice, in
// validatePlanInitial() and in legacy-app.js's sidebar, and both copies
// listed only four of the eight entry fields: name, bar number, signature
// date, and a non-Unsigned signature choice. A filer who typed just the
// attorney's phone number, address, or email had "not started" an attorney
// according to both -- no required marker, no export issue -- while the
// Primary Email field showed a required asterisk with no rule behind it.
//
// Milestone 57 is the cautionary precedent: the Simplified sidebar and its
// export gate each had their own reading of the same signature fields, and
// they disagreed for months. Two rules over the same data drift. This is one.

import { inferLegacySignatureState, SIGNATURE_STATES } from './signature-state.js';

const has = (v) => v !== '' && v !== null && v !== undefined;

/**
 * Every field the attorney block collects. Signature state is deliberately
 * NOT here -- it is a tri-state whose default and explicit "Unsigned" values
 * must not count as entry, so it is evaluated separately below.
 */
export const PLAN_INITIAL_ATTORNEY_FIELDS = Object.freeze([
  'attorney_name',
  'attorney_bar',
  'attorney_email',
  'attorney_secondaryEmail',
  'attorney_street',
  'attorney_cityStateZip',
  'attorney_phone',
  'attorney_signatureDate',
]);

/**
 * True once the filer has entered anything identifying an attorney.
 *
 * Pure: reads `d`, touches nothing. A blank block returns false, which is
 * what preserves the pro se / Guardian Advocate exemption -- callers must
 * raise no issue and show no required marker while this is false.
 *
 * The signature control counts only when it names a real signing method.
 * Opening the tri-state and choosing "/s/ Signed" or Stamp is entry; leaving
 * it at its default, or explicitly choosing Unsigned, is not. That is why
 * this defers to inferLegacySignatureState() rather than testing the raw
 * field: a legacy filing saved before the control existed carries a blank
 * state beside a real signature date, and that inference is already the app's
 * single answer to what such a filing meant.
 */
export function isPlanInitialAttorneyStarted(d) {
  if (!d) return false;
  if (PLAN_INITIAL_ATTORNEY_FIELDS.some((key) => has(d[key]))) return true;
  return inferLegacySignatureState(d.attorney_signatureState, d.attorney_signatureDate)
    !== SIGNATURE_STATES.NONE;
}
