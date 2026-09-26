// Milestone 70, 70H: the field tooltips -- their text and markup. Moved from
// legacy-app.js's TOOLTIP SYSTEM.
import { esc } from '../filing/escape-html.js';

export const TOOLTIPS = {
  // Milestone 51C removed a 'ward_percent' key here. It was never read -- all six
  // call sites pass 'ward_pct' (see below) -- and it carried slightly different
  // wording, including a worked example the live key lacks. Deleted as-is on
  // purpose: improving 'ward_pct's wording is a user-facing content change, not
  // a cleanup, and belongs in its own commit with the text reviewed.
  'restricted': "Assets that cannot be used without court permission, such as real estate that must be sold through a court approval process.",
  'carrying_value': "The depreciated value of an asset for accounting purposes. This may differ from current market value.",
  'personal_residence': "The primary home where the ward currently lives. This is reported separately from investment properties.",
  'income_property': "A property that generates rental income or other returns. Mark this if the property is held for income purposes.",
  'depository': "A bank or financial institution where the ward's money is held. For simplified accounting, ALL estate property must be in a designated depository.",
  'ssn_ein': "SSN: Social Security Number (for individuals). EIN: Employer Identification Number (for businesses, trusts, or entities).",
  'signature_date': "The date this document was signed. Must be within the accounting period or filing timeframe.",
  'inception_date': "The date when the guardianship was officially established by court order.",
  // Milestone 51C deleted an unused 'ward_percent' key whose wording carried a
  // worked example this one lacked. Per Alan, that fuller wording is adopted here
  // -- the example shows the expected format to a pro se filer who has never
  // entered a percentage on a court form. This is the key all six call sites
  // actually pass (annual-accounting/index.js, Schedules D-1..D-5 and Part VIII).
  'ward_pct': "The percentage of this asset that belongs to the ward. For example, if the ward owns 50% of a property, enter 50.",
  'case_number': "The case number from the court order appointing you as guardian. Found on the letters of guardianship.",
  'full_amount': "The total value of this asset before accounting for the ward's percentage.",
  'full_debt': "The total amount owed on this liability.",
  'full_value': "The current market value of this property.",
  'annualized_income': "If income is not for the full year, annualize it. For example, 6 months of $100/month = $200 annualized."
};

export function tooltip(key){
  const text=TOOLTIPS[key]||'';
  if(!text)return '';
  return `<span class="tooltip-icon" title="${esc(text)}">?<div class="tooltip-popup">${esc(text)}</div></span>`;
}
