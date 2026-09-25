// Milestone 61B/61C: one rule for "has the filer started this row?", shared by
// the four Plan forms' PDF models, export validators and sidebar checks.
//
// Each of those three surfaces used to carry its own hand-written list of
// which fields make a row count. The lists disagreed, and all of them were
// shorter than the UI. On the Annual Plan a residence row with a phone number
// but no name was invisible to every one of them: it did not print on the
// filed plan, it raised no validation error, and the sidebar never mentioned
// it. The filer typed something, saw it saved, and filed a document that did
// not contain it.
//
// The fix is not a longer list -- a longer list is the same bug with a later
// expiry date, since the next field added to a row is not added to it. This
// asks the row itself.
//
// WHICH ROWS, NOT WHICH FIELDS. Like service-recipients.js (Milestone 57B),
// this module decides only whether a row is in play. What a *complete* row
// needs stays with each form, where the data model owns requiredness --
// promoting a field to required is a schema change this does not make.

// `id`, where a collection carries one, is bookkeeping rather than filer
// input: legacy-app.js's own row checks have always skipped it.
const ALWAYS_IGNORED = ['id'];

/**
 * True if any field on the row carries filer-entered content.
 *
 * Empty string, null and undefined are "not entered". So is `false`: an
 * unchecked box is the untouched default, not an answer. So is a
 * `signatureState` of 'none' -- the signature control initializes to
 * "Unsigned", so treating it as content would make every seeded blank
 * signature row look started (Milestone 39-B established this reading; see
 * plan-simplified/pdf-model.js's hasSigData, which this generalizes).
 *
 * @param {object|null|undefined} row
 * @param {{ignore?: string[]}} [options] Extra keys to skip.
 * @returns {boolean}
 */
export function rowStarted(row, options) {
  if (!row || typeof row !== 'object') return false;
  const skip = new Set([...ALWAYS_IGNORED, ...((options && options.ignore) || [])]);

  return Object.entries(row).some(([key, value]) => {
    if (skip.has(key)) return false;
    if (value === '' || value === null || value === undefined || value === false) return false;
    if (key === 'signatureState' && value === 'none') return false;
    return true;
  });
}

/**
 * The started rows of a collection, in order. Convenience for the common
 * `(d.someCollection || []).filter(...)` shape at every call site.
 *
 * @param {any[]|null|undefined} rows
 * @param {{ignore?: string[]}} [options]
 * @returns {any[]}
 */
export function startedRows(rows, options) {
  return (Array.isArray(rows) ? rows : []).filter((row) => rowStarted(row, options));
}

// Moved from legacy-app.js by Milestone 70's 70B.
// A co-guardian slot counts as "in use" if any field is filled, not just Name —
// otherwise partially-filled co-guardian rows silently vanish from export/validation/checkmarks.
// Annual Accounting binds officeStreet/officeCityStateZip where Simplified
// binds residenceStreet/residenceCityStateZip, so both pairs have to be
// checked here. Missing the office pair meant an Annual co-guardian with
// only an office address read as "no data": skipped by validate() and
// dropped from the exported court document.
export function guardianHasAnyData(g){
  // isPreparer (Milestone 67A): a card the filer has ticked as the preparer
  // is not a blank card, and a flagged row must then supply its name.
  return !!(g&&(g.name||g.ssn||g.phone||g.email||g.mailingStreet||g.mailingCityStateZip
    ||g.residenceStreet||g.residenceCityStateZip||g.officeStreet||g.officeCityStateZip
    ||g.signatureDate||g.isPreparer));
}
