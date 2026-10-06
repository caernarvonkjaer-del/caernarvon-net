// Milestone 39-B: three-state signature validation, shared across every
// role/filing type 39-C will eventually extend this to. Shape-agnostic by
// design -- the caller extracts state/name/date/image from whatever record
// shape that role actually uses (top-level scalar prefix, nested object, or
// collection row) and hands the raw values here rather than this module
// knowing anything about any one filing type's data layout.

import { validationIssue } from './validation-issue.js';

export const SIGNATURE_STATES = Object.freeze({ NONE: 'none', TYPED: 'typed', STAMP: 'stamp' });

const has = (v) => v !== '' && v !== null && v !== undefined;

// Milestone 73A: who signs a block, and the signature policy of the year's
// data it sits in. Guardians no longer sign with "/s/" (the requester,
// 2026-10-04, as Pinellas Clerk practice resting on the court workbook's "Only
// the guardian's signature must be original" -- flagged for a qualified
// person): they sign by hand (Unsigned prints a blank line) or with a stamp.
// Attorneys and outside preparers keep all three choices.
export const SIGNER_ROLES = Object.freeze({ GUARDIAN: 'guardian', ATTORNEY: 'attorney', PREPARER: 'preparer' });
// Each year's data carries `signaturePolicy`: absent or 1 is the legacy rule
// (a guardian's "/s/" honoured, as filed); 2 means guardians sign by hand or
// stamp. New filings and New Year write 2; an open filing prepared before is
// upgraded when opened (src/core/signature/signature-policy.js).
export const SIGNATURE_POLICIES = Object.freeze({ LEGACY: 1, BY_HAND_OR_STAMP: 2 });
/** @param {Record<string, any>|null|undefined} data */
export const signaturePolicyOf = (data) => (data && data.signaturePolicy === SIGNATURE_POLICIES.BY_HAND_OR_STAMP
  ? SIGNATURE_POLICIES.BY_HAND_OR_STAMP : SIGNATURE_POLICIES.LEGACY);
/** A guardian's block under policy 2: "/s/" is not a choice it has. */
const byHandOrStamp = (ctx) => !!ctx && ctx.role === SIGNER_ROLES.GUARDIAN && ctx.policy === SIGNATURE_POLICIES.BY_HAND_OR_STAMP;

/**
 * Milestone 39-B's validation decision: all three states pass, for every
 * role -- this is not a legal-requirement loosening (the app never enforced
 * one), it's making the app's own completeness model honest about a filer's
 * real options. Returns an array of "<section> — <detail>" error strings,
 * matching this app's existing validator message shape, or [] if the
 * card's signature choice is complete.
 *
 * - Unsigned (`state` is '' or 'none'): always passes.
 * - "/s/" Signed (`state === 'typed'`): passes only once a date is present.
 *   `name` is optional -- pass it only when this role has no independent,
 *   unconditional "printed name" requirement of its own elsewhere (a role
 *   that already requires printed name regardless of signature choice, like
 *   39-B's Guardian pilot, should omit it here to avoid a duplicate error
 *   for the same blank field).
 * - Signature Stamp (`state === 'stamp'`): passes only once an image is
 *   present.
 *
 * Milestone 42F: pass `filingType` plus `namePath`/`datePath`/`imagePath`
 * (and `statePath` for the invalid-selection case) to get structured issues
 * with explicit field paths; without `filingType` the pre-42F bare strings
 * are returned unchanged.
 */
export function checkSignatureState({ state, name, date, image, sectionLabel, roleLabel, filingType, namePath = '', datePath = '', imagePath = '', statePath = '', role, policy }) {
  const errs = [];
  const issue = (message, path) => (filingType ? validationIssue(filingType, message, path) : message);
  // Guardian Inventory's own convention already embeds the role/ordinal in
  // sectionLabel itself ("D-1 Guardian #2", "D-2 Preparer") rather than
  // this shared function's usual sectionLabel/roleLabel split ("Part III"/
  // "Guardian #2") -- passing roleLabel: '' in that case must not leave a
  // stray double space in the message.
  const rolePrefix = roleLabel ? `${roleLabel} ` : '';
  // Milestone 73A: a guardian's block (role 'guardian') under policy 2 reads
  // its stored choice itself -- a blank choice is Unsigned whatever the date,
  // and a "/s/" (one saved before the guardian rule, asked again) is not a
  // choice it has. Every other block keeps the caller's reading.
  const ctx = { role, policy };
  const normalized = role ? inferLegacySignatureState(state, date, ctx) : (has(state) ? state : SIGNATURE_STATES.NONE);
  if (normalized === SIGNATURE_STATES.NONE) return errs;
  if (byHandOrStamp(ctx) && normalized === SIGNATURE_STATES.TYPED) {
    errs.push(issue(`${sectionLabel} — ${rolePrefix}signature: choose Unsigned (to sign by hand) or Signature Stamp; a guardian no longer signs with "/s/"`, statePath || datePath));
    return errs;
  }
  if (normalized === SIGNATURE_STATES.TYPED) {
    if (name !== undefined && !has(name)) errs.push(issue(`${sectionLabel} — ${rolePrefix}printed name is required to apply "/s/" Signed`, namePath));
    if (!has(date)) errs.push(issue(`${sectionLabel} — ${rolePrefix}date signed is required to apply "/s/" Signed`, datePath));
    return errs;
  }
  if (normalized === SIGNATURE_STATES.STAMP) {
    if (!has(image)) errs.push(issue(`${sectionLabel} — ${rolePrefix}signature stamp image is required`, imagePath));
    return errs;
  }
  // An unrecognized value (corrupt data, a future state this code doesn't
  // know about yet) is treated as incomplete, never a silent pass.
  errs.push(issue(`${sectionLabel} — ${rolePrefix}signature selection is invalid`, statePath || datePath));
  return errs;
}

/**
 * Legacy-migration inference (Milestone 39-B "Data safety"): every existing
 * `.sav` file predates `signatureState`. A missing field must never
 * silently resolve to a value less complete than what already existed --
 * a filing already signed the old way (has a real `date`) infers `'typed'`,
 * never `'none'`. Only a filing with neither field resolves to `'none'`.
 */
export function inferLegacySignatureState(state, date, ctx) {
  if (has(state)) return state;
  // Milestone 73A: under policy 2 a guardian's blank choice is Unsigned, date
  // or no date -- typing the date no longer turns it into "/s/" (the QA
  // finding: it pre-selected "/s/" on screen). A legacy filing's blank choice
  // with a date, which meant "/s/", is made explicit when the filing is
  // upgraded to policy 2, so that block is asked again
  // (src/core/signature/signature-policy.js).
  if (byHandOrStamp(ctx)) return SIGNATURE_STATES.NONE;
  return has(date) ? SIGNATURE_STATES.TYPED : SIGNATURE_STATES.NONE;
}

/**
 * The same rule as `checkSignatureState()`, answered as a boolean.
 *
 * Milestone 57, Simplified parity gap. `computeNavChecks()`'s sidebar rules
 * used to test signature fields by presence -- `s-p5` reached
 * `attorney_signatureDate` only through the deliberately blank-tolerant
 * `datesOrdered()`, and `s-p6` never looked at the certificate attorney's
 * signature at all. So a filer could select "/s/ Signed", leave the date
 * blank, watch Part V and Part VI turn green, and be refused at Print
 * Preview. The sidebar and the export gate disagreed because they were two
 * rules over the same data.
 *
 * This is deliberately `checkSignatureState(...).length === 0` rather than a
 * second reading of the same states: a boolean reimplementation is exactly
 * how the two drifted apart in the first place. Whatever the validator
 * accepts, this accepts.
 *
 * `state` may be raw or already inferred -- `inferLegacySignatureState()` is
 * idempotent on a value it has already resolved, so the caller does not have
 * to know which it holds. Pass `name` only where the validator passes it;
 * omitting it skips the printed-name check exactly as the validator's own
 * `name !== undefined` guard does.
 *
 * Milestone 73A: pass `role` and `policy` as the validator does, with the raw
 * stored state -- a guardian's blank choice under policy 2 is Unsigned, date
 * or no date, which a state already inferred without them would lose.
 */
/**
 * @param {{ state?: any, name?: any, date?: any, image?: any, role?: string, policy?: number }} [args]
 * @returns {boolean}
 */
export function isSignatureComplete({ state, name, date, image, role, policy } = {}) {
  return checkSignatureState({
    state: inferLegacySignatureState(state, date, { role, policy }),
    name,
    date,
    image,
    sectionLabel: '',
    roleLabel: '',
    // Explicitly undefined rather than omitted: checkSignatureState() reads
    // filingType to decide between structured issues and the pre-42F bare
    // strings, and this caller wants neither -- it counts them.
    filingType: undefined,
    role,
    policy,
  }).length === 0;
}

/**
 * Milestone 73A: how a signature block prints, resolved from its signer's
 * role and the year's policy -- the PDF engine draws exactly this and infers
 * nothing:
 *   'blank' -- a blank line with "Signature of <name>" beneath, for signing by
 *              hand (Unsigned; a Stamp chosen but never applied; a guardian's
 *              "/s/" under policy 2; any block with no name);
 *   'typed' -- "/s/ Name" with the Rule 2.515 electronic-signature caption;
 *   'stamp' -- the applied stamp image.
 * Attorneys and preparers keep today's reading: a blank choice with a date is
 * "/s/".
 * @param {{ state?: any, date?: any, image?: any, name?: any, role?: string, policy?: number }} args
 * @returns {'blank'|'typed'|'stamp'}
 */
export function signaturePrintMode({ state, date, image, name, role, policy } = {}) {
  if (!has(name) || !String(name).trim()) return 'blank';
  const ctx = { role, policy };
  const effective = inferLegacySignatureState(state, date, ctx);
  if (effective === SIGNATURE_STATES.STAMP) return has(image) ? 'stamp' : 'blank';
  if (effective === SIGNATURE_STATES.TYPED) return byHandOrStamp(ctx) ? 'blank' : 'typed';
  return 'blank';
}
