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

//
// Milestone 71B: the Initial Inventory and the Annual, Final, Trust and
// Simplified Accountings required an attorney unconditionally -- five of the
// nine forms, including a Guardian Advocate's filing (Rule 5.030(a) exempts
// them) and every Simplified Accounting (section 744.3679(3) says no attorney
// is needed). They now ask this module the same question the Initial Plan
// does, through isAttorneyStarted() and one field list per engine.

import { inferLegacySignatureState, SIGNATURE_STATES } from './signature-state.js';

const has = (v) => v !== '' && v !== null && v !== undefined && v !== false;
const read = (d, path) => String(path).split('.').reduce((o, k) => (o == null ? undefined : o[k]), d);

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
  return isAttorneyStarted(d, 'planInitial');
}

/**
 * Milestone 71B. Per engine: the fields that identify an attorney, and the
 * [state, date] pair of the attorney's own signature control. The
 * certificate-of-service signer is deliberately NOT here on any engine
 * (Inventory `serviceAttorney.*`, Annual/Simplified `certAtty*`): with no
 * attorney the guardian certifies service, so those fields name whoever
 * signs the certificate, not whether the filing has an attorney.
 *
 * The attorney's "This person prepared this filing" flag counts only when
 * ticked -- `has()` treats `false` as blank.
 */
export const ATTORNEY_ENTRY = Object.freeze({
  planInitial: Object.freeze({
    fields: PLAN_INITIAL_ATTORNEY_FIELDS,
    signature: ['attorney_signatureState', 'attorney_signatureDate'],
  }),
  guardian: Object.freeze({
    fields: Object.freeze([
      'attorneyForGuardian',
      'attorney.name', 'attorney.barNumber', 'attorney.phone', 'attorney.email', 'attorney.secondaryEmail',
      'attorney.streetAddress', 'attorney.cityStateZip', 'attorney.signatureDate', 'attorney.filingDate',
      'attorney.isPreparer',
    ]),
    signature: ['attorney.signatureState', 'attorney.signatureDate'],
  }),
  annual: Object.freeze({
    fields: Object.freeze([
      'attorney', 'attorney_bar', 'attorney_phone', 'attorney_email', 'attorney_secondaryEmail',
      'attorney_street', 'attorney_cityStateZip', 'attorney_signatureDate', 'attorney_isPreparer',
    ]),
    signature: ['attorney_signatureState', 'attorney_signatureDate'],
  }),
  simplified: Object.freeze({
    fields: Object.freeze([
      'attorney', 'attorney_barNumber', 'attorney_phone', 'attorney_email', 'attorney_secondaryEmail',
      'attorney_street', 'attorney_cityStateZip', 'attorney_signatureDate',
    ]),
    signature: ['attorney_signatureState', 'attorney_signatureDate'],
  }),
  // Milestone 72C (decided 2026-10-02): the Annual Plan and the Plan for
  // Minors use the rule the accountings and the Initial Plan already use --
  // any attorney field counts. The Annual Plan used to test only the name, and
  // the Plan for Minors the name, signature date or state, so an attorney with
  // only a Bar number entered counted as "no attorney" there.
  planAnnual: Object.freeze({
    fields: Object.freeze([
      'attorney', 'attorney_bar', 'attorney_phone', 'attorney_email', 'attorney_secondary_email',
      'attorney_street', 'attorney_cityStateZip', 'attorney_signatureDate',
    ]),
    signature: ['attorney_signatureState', 'attorney_signatureDate'],
  }),
  planMinor: Object.freeze({
    fields: Object.freeze([
      'attorney_name', 'attorney_bar', 'attorney_phone', 'attorney_email', 'attorney_secondary_email',
      'attorney_street', 'attorney_cityStateZip', 'attorney_signatureDate',
    ]),
    signature: ['attorney_signatureState', 'attorney_signatureDate'],
  }),
});

/**
 * Milestone 72C (decided 2026-10-02). The Simplified Plan's attorney fields
 * are optional and print nowhere -- the court's Simplified Plan has no
 * attorney section (Milestone 61E) -- so nothing is ever required of them,
 * and this form has no entry in ATTORNEY_ENTRY. Whether the plan has an
 * attorney to serve, which silences the guardian-email warning, needs the
 * attorney's name and primary email both: a phone number alone is not an
 * attorney anyone can serve.
 */
export function isPlanSimplifiedRepresented(d) {
  return !!d && String(d.attorney_name ?? '').trim() !== '' && String(d.attorney_email ?? '').trim() !== '';
}

/**
 * True once the filer has entered anything identifying an attorney on a
 * filing of this engine (`guardian`, `annual` -- which also serves Final and
 * Trust -- `simplified`, `planInitial`, and since Milestone 72C `planAnnual`
 * and `planMinor`; the Simplified Plan uses isPlanSimplifiedRepresented()
 * above). Same contract as
 * isPlanInitialAttorneyStarted() above: pure, and false for a blank block,
 * which is what keeps every attorney requirement off a pro se or Guardian
 * Advocate filing. An unknown engine answers true, so a caller that asks
 * about a form this module does not know keeps its attorney requirements.
 */
/**
 * Milestone 73J part 2: every path isAttorneyStarted() reads for an engine --
 * what a live page part that shows or hides with the attorney depends on.
 * @param {string} engineId
 * @returns {string[]}
 */
export function attorneyEntryPaths(engineId) {
  const entry = ATTORNEY_ENTRY[engineId];
  return entry ? [...new Set([...entry.fields, ...entry.signature])] : [];
}

export function isAttorneyStarted(d, engineId) {
  if (!d) return false;
  const entry = ATTORNEY_ENTRY[engineId];
  if (!entry) return true;
  if (entry.fields.some((path) => has(read(d, path)))) return true;
  const [statePath, datePath] = entry.signature;
  return inferLegacySignatureState(read(d, statePath), read(d, datePath)) !== SIGNATURE_STATES.NONE;
}
