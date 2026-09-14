// Milestone 41-2, Tier 2: Ward Demographics & Inception.
//
// Named as one card in the milestone proposal, but implemented as two
// independently-callable field-groups: Plan Simplified's current Cover
// page renders the ward's name in the same box as Case Caption's fields
// (see case-caption-card.js's header comment) and the reporting period in
// a wholly separate "Reporting Period" box -- there is no single visual
// box these two groups share today.
//
// Milestone 41-3 cleanup: both exports previously carried a speculative
// optional field -- an `ssn` slot here and an `inceptionDate` slot on the
// period group -- added in 41-2 for "a later filing type that has one,"
// before any second caller existed. Both were then ruled out by the first
// real candidate that appeared, and neither was ever passed by any page:
//
//   - Plan Initial has TWO inception-like dates (Guardianship Inception
//     Date and Date Letters Were Signed) and both are required while its
//     period fields are not, so one optional date sharing the period's
//     `required` flag could not express it.
//   - Plan Annual does collect a ward SSN, but it sits after county rather
//     than adjacent to the ward name, and is labelled "Social Security
//     Number" -- the slot assumed adjacency.
//
// They are deleted rather than left in place because unit tests made them
// look proven while no page exercised them, which invites the next caller
// to build on a shape that never survived contact with a real form. Cheap
// to reintroduce if a genuine second case ever turns up -- this time with
// that case in hand.
import { renderFormField } from '../form-fields.js';

export function renderWardIdentityFields({
  wardName = '',
  wardNameRequired = true,
} = {}) {
  return `<div class="col-12">${renderFormField({ path: 'wardName', label: 'Name of Ward', value: wardName, required: wardNameRequired, id: 'wardName' })}</div>`;
}

export function renderReportingPeriodFields({
  periodFrom = '',
  periodTo = '',
  fromLabel = 'Reporting Period From',
  toLabel = 'Reporting Period To',
  required = true,
} = {}) {
  return `<div class="col-md-6">${renderFormField({ path: 'periodFrom', label: fromLabel, value: periodFrom, required, id: 'periodFrom', type: 'date' })}</div>
    <div class="col-md-6">${renderFormField({ path: 'periodTo', label: toLabel, value: periodTo, required, id: 'periodTo', type: 'date' })}</div>`;
}
