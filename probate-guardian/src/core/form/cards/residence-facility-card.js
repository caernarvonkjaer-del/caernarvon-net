// Milestone 41-3, Tier 2: Residence & Facility Profile.
//
// The milestone's fourth named card, deferred twice before this on purpose:
// once in 41-2 (Plan Simplified has no residence fields at all, so there
// was nothing to verify it against) and once when Plan Initial landed
// (its residence fields were already on Tier 1 via inpS()/radioP(), so
// extracting a card from a single type's shape would have been an
// abstraction with no second user). Built now because Plan Annual supplies
// that second, real usage -- and the two shapes line up exactly where it
// matters: identical field paths (wardLiving, residenceAddress,
// residenceCityStateZip, residencePhone, mailingAddress,
// mailingCityStateZip), identical order, identical column widths. Only the
// visible text diverges -- four of the labels are worded differently, and
// wardLiving's three option strings differ in wording and capitalization
// between the two types -- which is exactly the kind of divergence
// renderReportingPeriodFields()'s overridable labels already handle
// successfully across three filing types.
//
// The guardian/attorney name fields that sit above this block on both
// Cover pages are deliberately NOT part of this card: their field paths
// genuinely differ by type (guardianNames/attorneyName on Plan Initial vs.
// guardian/attorney on Plan Annual), they're plain free-text fields rather
// than the structured per-guardian rows guardian-attorney-card.js handles,
// and they are already on Tier 1 via inpS()'s Milestone 41-1 delegation.
import { renderFormField, renderRadioGroupField } from '../form-fields.js';

export function renderResidenceFields({
  wardLiving = '',
  wardLivingOptions = [],
  wardLivingLabel = 'The ward is living:',
  wardLivingRequired = true,
  residenceAddress = '',
  residenceAddressLabel = 'Address Where Ward Resides',
  residenceCityStateZip = '',
  residenceCityStateZipLabel = 'City / State / ZIP',
  residencePhone = '',
  residencePhoneLabel = 'Phone',
  mailingAddress = '',
  mailingAddressLabel = 'Mailing Address (if different)',
  mailingCityStateZip = '',
  mailingCityStateZipLabel = 'Mailing City / State / ZIP',
} = {}) {
  return `<div class="col-12 mt-3">
              ${renderRadioGroupField({ path: 'wardLiving', label: wardLivingLabel, value: wardLiving, options: wardLivingOptions, required: wardLivingRequired, hint: '', id: 'wardLiving' })}
            </div>
            <div class="col-12">${renderFormField({ path: 'residenceAddress', label: residenceAddressLabel, value: residenceAddress, required: true, id: 'residenceAddress' })}</div>
            <div class="col-md-7">${renderFormField({ path: 'residenceCityStateZip', label: residenceCityStateZipLabel, value: residenceCityStateZip, required: true, id: 'residenceCityStateZip' })}</div>
            <div class="col-md-5">${renderFormField({ path: 'residencePhone', label: residencePhoneLabel, value: residencePhone, id: 'residencePhone' })}</div>
            <div class="col-12">${renderFormField({ path: 'mailingAddress', label: mailingAddressLabel, value: mailingAddress, id: 'mailingAddress' })}</div>
            <div class="col-12">${renderFormField({ path: 'mailingCityStateZip', label: mailingCityStateZipLabel, value: mailingCityStateZip, id: 'mailingCityStateZip' })}</div>`;
}
