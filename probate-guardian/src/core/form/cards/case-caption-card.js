// Milestone 41-2, Tier 2: Case Caption & Court Identity.
//
// Deliberately returns a bare field-group fragment, not a wrapped card with
// its own heading/box -- Plan Simplified's current Cover page bundles this
// card's fields (Case Number, County) together with Ward Demographics'
// wardName field inside ONE "Ward & Case Information" box, under one
// heading the page itself owns. Splitting that into two separately-boxed
// cards would be a real visual change, not the "0 visual diff" this
// milestone requires. So Tier 2 cards compose at the field-group level;
// Tier 3 pages keep the box/heading markup exactly as before and place
// card fragments inside it.
//
// County has no Tier 1 primitive (it's a specialized autocomplete widget,
// out of Milestone 41-1's stated scope) -- reused here via the existing
// countyInputS() (src/core/form/field-html.js), as every other filing type
// does, rather than inventing a new Tier 1 shape for it.
import { renderFormField } from '../form-fields.js';
import { countyInputS } from '../field-html.js';
import { UCN_HINT } from '../../filing/ucn-reminder.js';

export function renderCaseCaptionFields({
  caseNumber = '',
  county = '',
  // Milestone 63E: pass the ward's UCN (even '') to show the optional UCN field beneath
  // Case Number and County. Left undefined, the card renders exactly as it always did.
  ucn,
  caseNumberRequired = true,
  countyRequired = true,
} = {}) {
  return `<div class="col-md-6">${renderFormField({ path: 'caseNumber', label: 'Case Number', value: caseNumber, required: caseNumberRequired, id: 'caseNumber' })}</div>
    <div class="col-md-6">${countyInputS('county', 'County', county, countyRequired)}</div>${ucn === undefined ? '' : `
    <div class="col-md-6">${renderUcnField(ucn, { id: 'ucn' })}</div>`}`;
}

/**
 * Milestone 73S: the UCN box on every one of the nine covers -- starred as a
 * reminder (73S-N1: no "required" for a screen reader, which hears the hint
 * instead), kept exactly as typed (Milestone 63E: text, never the Case
 * Number formatter). Preview's reminder is src/core/filing/ucn-reminder.js.
 * `options` passes the cover's own binding through (the Inventory's data-bind,
 * the Annual's security sanitizing).
 *
 * @param {unknown} value
 * @param {Record<string, any>} [options] renderFormField() options
 */
export function renderUcnField(value, options = {}) {
  return renderFormField({ path: 'ucn', label: 'UCN', value: value ?? '', kind: 'text', policy: 'preserve', reminderStar: true, hint: UCN_HINT, ...options });
}
