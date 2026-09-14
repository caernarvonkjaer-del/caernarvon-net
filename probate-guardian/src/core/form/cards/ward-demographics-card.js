// Milestone 41-2, Tier 2: Ward Demographics & Inception.
//
// Named as one card in the milestone proposal, but implemented as two
// independently-callable field-groups: Plan Simplified's current Cover
// page renders the ward's name in the same box as Case Caption's fields
// (see case-caption-card.js's header comment) and the reporting period in
// a wholly separate "Reporting Period" box -- there is no single visual
// box these two groups share today. SSN and inception date are included
// as optional fields for later filing types (Plan Initial has an
// inception/letters-signed date; none of the four Plan types collect a
// ward SSN on their own Cover page, confirmed by reading all four
// pdf-model.js builders' Cover fields, but the proposal names it and
// Guardian Inventory/Annual Accounting's own Cover pages do) -- omitted
// when not passed, per this file's own filing type's actual fields.
import { renderFormField } from '../form-fields.js';

export function renderWardIdentityFields({
  wardName = '',
  wardNameRequired = true,
  ssn = null,
  ssnRequired = false,
} = {}) {
  const nameField = `<div class="col-12">${renderFormField({ path: 'wardName', label: 'Name of Ward', value: wardName, required: wardNameRequired, id: 'wardName' })}</div>`;
  const ssnField = ssn === null ? '' : `<div class="col-md-6">${renderFormField({ path: 'ssn', label: 'Ward SSN', value: ssn, required: ssnRequired, id: 'ssn' })}</div>`;
  return `${nameField}${ssnField}`;
}

export function renderReportingPeriodFields({
  periodFrom = '',
  periodTo = '',
  fromLabel = 'Reporting Period From',
  toLabel = 'Reporting Period To',
  required = true,
  inceptionDate = null,
  inceptionLabel = 'Inception Date',
} = {}) {
  const inceptionField = inceptionDate === null ? '' : `<div class="col-md-6">${renderFormField({ path: 'inceptionDate', label: inceptionLabel, value: inceptionDate, required, id: 'inceptionDate', type: 'date' })}</div>`;
  return `${inceptionField}<div class="col-md-6">${renderFormField({ path: 'periodFrom', label: fromLabel, value: periodFrom, required, id: 'periodFrom', type: 'date' })}</div>
    <div class="col-md-6">${renderFormField({ path: 'periodTo', label: toLabel, value: periodTo, required, id: 'periodTo', type: 'date' })}</div>`;
}
