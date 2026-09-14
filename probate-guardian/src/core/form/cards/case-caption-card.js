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
// window.countyInputS() global, same as every other filing type already
// does, rather than inventing a new Tier 1 shape for it.
import { renderFormField } from '../form-fields.js';

export function renderCaseCaptionFields({
  caseNumber = '',
  county = '',
  caseNumberRequired = true,
  countyRequired = true,
} = {}) {
  const countyInputS = typeof window !== 'undefined' ? window.countyInputS : null;
  return `<div class="col-md-6">${renderFormField({ path: 'caseNumber', label: 'Case Number', value: caseNumber, required: caseNumberRequired, id: 'caseNumber' })}</div>
    <div class="col-md-6">${countyInputS('county', 'County', county, countyRequired)}</div>`;
}
