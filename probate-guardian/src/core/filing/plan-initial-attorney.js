// Milestone 73O part 1 (decision 73O-2): the Initial Guardianship Plan keeps
// one attorney name, as the Annual Plan does. It kept two -- the cover's
// `attorneyName` and the certification's `attorney_name` -- typed separately,
// printed in different places, and free to name different people.
//
// A filing saved with both is folded into `attorney_name` wherever nothing
// can be lost: the cover's name when the certification's is blank, the
// certification's when the two name the same person (nameAmong() either way
// round, so "Robert T. Nguyen" and "Robert T. Nguyen, Esq." are one). Two
// different people are never chosen between silently: both are kept until the
// filer picks one (planInitialAttorneyConflict(), asked on the plan's pages).
//
// Visible side effect, accepted in the design: a filing whose cover alone
// named an attorney now has a started attorney, so the attorney's
// certification -- Bar number, signature, email -- is required.

import { nameAmong } from './form-derived-fields.js';

const text = (value) => String(value ?? '').trim();
const samePerson = (a, b) => nameAmong(a, b) || nameAmong(b, a);

/**
 * Folds the retired cover field into `attorney_name` where nothing can be
 * lost. Idempotent; returns true when it changed the filing.
 */
export function migratePlanInitialAttorney(filing) {
  if (!filing || typeof filing !== 'object' || !('attorneyName' in filing)) return false;
  const cover = text(filing.attorneyName);
  const certification = text(filing.attorney_name);
  if (cover && certification && !samePerson(cover, certification)) return false;
  if (cover && !certification) filing.attorney_name = filing.attorneyName;
  delete filing.attorneyName;
  return true;
}

/** The two names a filing still holds, when they are two people: until the filer chooses. */
export function planInitialAttorneyConflict(filing) {
  if (!filing || typeof filing !== 'object' || !('attorneyName' in filing)) return null;
  const cover = text(filing.attorneyName);
  const certification = text(filing.attorney_name);
  if (!cover || !certification || samePerson(cover, certification)) return null;
  return { cover, certification };
}

/** The filer's choice: 'cover' or 'certification'; the other name is let go. */
export function keepPlanInitialAttorney(filing, which) {
  if (!filing || !('attorneyName' in filing)) return false;
  if (which === 'cover') filing.attorney_name = filing.attorneyName;
  else if (which !== 'certification') return false;
  delete filing.attorneyName;
  return true;
}
