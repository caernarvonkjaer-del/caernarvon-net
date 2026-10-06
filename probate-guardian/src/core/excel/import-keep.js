// Milestone 72 follow-up: what an Excel import must not wipe.
//
// The court's workbooks have no box for a signature's chosen state ("/s/" or
// a stamp), the stamp image, or which guardian served the copies (71B), and on
// the Inventory none for a guardian's or the attorney's email. The importers
// rebuild each guardian -- and the preparer, and the Inventory's attorney --
// from the workbook's boxes alone, so an import silently reset a stamped
// signature to the default and cleared the flag. They now keep this filing's
// values for those fields, but only for the same person, matched by name (72A's
// containment test, either way round: "Robert T. Nguyen" is "Robert T. Nguyen,
// Esq."), so a workbook whose guardians are in another order never hands one
// person another's stamp. Found while building Milestone 72H (the Inventory),
// then fixed the same way on the Annual family and the Simplified.
import { nameAmong } from '../filing/form-derived-fields.js';

/**
 * The same person, by name: either name among the other's words. Two blanks
 * count (nothing changes hands); a blank against a name does not -- nameAmong
 * alone treats a blank as matching anyone, which would let a workbook that
 * drops a co-guardian leave that guardian's stamp and tick on the empty slot.
 */
export const samePerson = (a, b) => {
  const blankA = !String(a ?? '').trim();
  const blankB = !String(b ?? '').trim();
  if (blankA || blankB) return blankA && blankB;
  return nameAmong(a, b) || nameAmong(b, a);
};

/**
 * Milestone 73E part 1: the same person for the import transaction -- the
 * same name ignoring case, spaces and punctuation (the requester's decision,
 * 2026-10-05). Two blanks are the same; nothing changes hands. A near match
 * (samePerson() above among them) is not the same person by this rule: the
 * transaction lists it for the filer to decide. The importers keep
 * samePerson() until each moves onto the transaction (73T parts 2-4).
 */
export function sameName(a, b) {
  const canon = (s) => String(s ?? '').toLowerCase().replace(/[\s\p{P}\p{S}]+/gu, '');
  return canon(a) === canon(b);
}

/** Signature fields no workbook carries. */
export const SIGNATURE_FIELDS = Object.freeze(['signatureState', 'signatureImage']);

/**
 * Copies `keys` from `before` (the filing's record) onto `fromWorkbook` (the
 * record rebuilt from the workbook) when both are the same person. Returns
 * `fromWorkbook`.
 */
export function keepUnboxedFields(fromWorkbook, before, keys) {
  if (!fromWorkbook || !before || typeof before !== 'object') return fromWorkbook;
  if (!samePerson(fromWorkbook.name, before.name)) return fromWorkbook;
  for (const k of keys) if (before[k] !== undefined) fromWorkbook[k] = before[k];
  return fromWorkbook;
}
