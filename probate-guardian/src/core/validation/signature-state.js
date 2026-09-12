// Milestone 39-B: three-state signature validation, shared across every
// role/filing type 39-C will eventually extend this to. Shape-agnostic by
// design -- the caller extracts state/name/date/image from whatever record
// shape that role actually uses (top-level scalar prefix, nested object, or
// collection row) and hands the raw values here rather than this module
// knowing anything about any one filing type's data layout.

export const SIGNATURE_STATES = Object.freeze({ NONE: 'none', TYPED: 'typed', STAMP: 'stamp' });

const has = (v) => v !== '' && v !== null && v !== undefined;

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
 */
export function checkSignatureState({ state, name, date, image, sectionLabel, roleLabel }) {
  const errs = [];
  const normalized = has(state) ? state : SIGNATURE_STATES.NONE;
  if (normalized === SIGNATURE_STATES.NONE) return errs;
  if (normalized === SIGNATURE_STATES.TYPED) {
    if (name !== undefined && !has(name)) errs.push(`${sectionLabel} — ${roleLabel} printed name is required to apply "/s/" Signed`);
    if (!has(date)) errs.push(`${sectionLabel} — ${roleLabel} date signed is required to apply "/s/" Signed`);
    return errs;
  }
  if (normalized === SIGNATURE_STATES.STAMP) {
    if (!has(image)) errs.push(`${sectionLabel} — ${roleLabel} signature stamp image is required`);
    return errs;
  }
  // An unrecognized value (corrupt data, a future state this code doesn't
  // know about yet) is treated as incomplete, never a silent pass.
  errs.push(`${sectionLabel} — ${roleLabel} signature selection is invalid`);
  return errs;
}

/**
 * Legacy-migration inference (Milestone 39-B "Data safety"): every existing
 * `.sav` file predates `signatureState`. A missing field must never
 * silently resolve to a value less complete than what already existed --
 * a filing already signed the old way (has a real `date`) infers `'typed'`,
 * never `'none'`. Only a filing with neither field resolves to `'none'`.
 */
export function inferLegacySignatureState(state, date) {
  if (has(state)) return state;
  return has(date) ? SIGNATURE_STATES.TYPED : SIGNATURE_STATES.NONE;
}
