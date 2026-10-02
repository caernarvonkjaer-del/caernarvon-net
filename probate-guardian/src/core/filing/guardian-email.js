// Milestone 72C. The guardian's email, one rule on every form.
//
// Fla. R. Gen. Prac. & Jud. Admin. 2.515(c) (July 1, 2026): a signed document
// carries a signature block with each signer's "e-mail address for service of
// court documents (if the document is filed or served electronically)". The
// seven forms disagreed: the Simplified Accounting and the Simplified Plan
// blocked export without Guardian #1's email; the Annual family, the Annual
// Plan and the Plan for Minors collected it and never checked it; the Initial
// Inventory and the Initial Plan had no field at all.
//
// Decided by the requester (2026-10-01, extended 2026-10-02), and recorded as
// Pinellas Clerk practice, not as a reading of the rule: a missing guardian
// email warns -- never blocks -- and only when no attorney is entered. With an
// attorney, the attorney's own email is the address for service.
//
// "No attorney entered" is each form's one shared definition
// (attorney-block.js): isAttorneyStarted() for the accountings, the Initial
// Plan, the Annual Plan and the Plan for Minors. The Simplified Plan, whose
// attorney fields are optional and print nowhere (Milestone 61E), counts an
// attorney only once the name and primary email are both entered
// (isPlanSimplifiedRepresented(), decided 2026-10-02).

import { isAttorneyStarted, isPlanSimplifiedRepresented } from '../validation/attorney-block.js';
import { rowStarted } from '../validation/row-started.js';

/** Where each form keeps its guardians and what its page is called. */
const FORMS = Object.freeze({
  guardian: { rows: 'guardians', section: 'D-1' },
  annual: { rows: 'guardians', section: 'Part III' },
  simplified: { rows: 'guardians', section: 'Part IV' },
  planInitial: { rows: 'planGuardians', section: 'Signatures' },
  planAnnual: { rows: 'planGuardians', section: 'Signatures' },
  planMinor: { rows: 'planGuardians', section: 'Guardian Signatures' },
  planSimplified: { rows: 'planGuardians', section: 'Signatures' },
});

const blank = (v) => !String(v ?? '').trim();

/** True when the filing names an attorney, by its form's own definition. */
export function hasAttorneyForService(d, engineId) {
  if (engineId === 'planSimplified') return isPlanSimplifiedRepresented(d);
  return isAttorneyStarted(d, engineId);
}

/**
 * Preview & Export warnings: each guardian in play (Guardian #1 always; a
 * co-guardian once anything is entered on the card) with no email, when no
 * attorney is entered. Never an export issue.
 * @param {Record<string, any>} d
 * @param {string} engineId the form engine ('annual' serves Final and Trust)
 */
export function guardianEmailAdvisories(d, engineId) {
  const form = FORMS[engineId];
  if (!d || !form || hasAttorneyForService(d, engineId)) return [];
  const rows = Array.isArray(d[form.rows]) ? d[form.rows] : [];
  const out = [];
  rows.forEach((g, i) => {
    if (i > 0 && !rowStarted(g, { ignore: ['certifiesService', 'signatureDateLabel', 'isPreparer'] })) return;
    if (!blank(g?.email)) return;
    out.push({
      code: 'guardian.email-for-service',
      severity: 'advisory',
      field: `${form.rows}.${i}.email`,
      message: `${form.section} — Guardian #${i + 1} has no email address. With no attorney, the court's rules expect each signer's e-mail address for service in the signature block when a document is filed electronically (Fla. R. Gen. Prac. & Jud. Admin. 2.515(c)).`,
    });
  });
  return out;
}
