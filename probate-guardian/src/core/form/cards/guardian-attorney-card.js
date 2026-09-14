// Milestone 41-2, Tier 2: Guardian & Attorney Details.
//
// Scoped down from the milestone's own named boundary after reading Plan
// Simplified's actual Signatures page in full: Guardian, Preparer, and
// Attorney each have a genuinely different field shape (Guardian: a single
// mailingAddress field plus a signature-state control; Preparer/Attorney:
// split street + cityStateZip fields, no signature-state control; Attorney
// alone: a bar-number field and two email fields) -- unifying all three
// into one configurable card would either lose fidelity or need config
// complexity disproportionate to a single pilot page. Preparer and
// Attorney's blocks already call inpS(), which already delegates to Tier 1
// as of Milestone 41-1 -- they don't need a card to be "on Tier 1." The
// Guardian block's name/phone/email/mailingAddress fields were the one
// real gap: entirely hand-rolled raw <input> markup with no id/for label
// association at all, never routed through inpS() or renderFormField().
// This card closes exactly that gap. The signature-date field and the
// signature-state control widget itself stay in the page's own
// composition -- they're tightly coupled to Milestone 39's signature-state
// lifecycle, not a plain identity field.
// Milestone 41-3 cleanup: this file briefly exported a second function,
// renderPartyContactFields() (phone + email + one combined mailingAddress),
// built for Plan Simplified's guardian block. It never gained a second
// caller, and by the end of 41-3's rollout it was clear it never would --
// every other filing type's guardian block is a genuinely different shape:
// Plan Minor adds relationship and taxpayer ID and splits the address into
// street + city/state/zip; Plan Initial has no email field at all; Plan
// Annual adds a residence-or-office address on top. It has been inlined
// back into its one caller. A shared helper with a single user is not an
// abstraction, and a general name on it invites the next filing type to
// bend its own page to fit rather than render what it actually has.
//
// renderPartyNameField() below is kept because it genuinely generalized:
// three of the four Plan types use it. The fourth (Plan Annual) does not,
// since its Printed Name field is col-md-7 rather than the col-12 this
// hardcodes -- recorded rather than papered over with a colClass option,
// which would reduce this to a configurable <div> around one call.
import { renderFormField } from '../form-fields.js';

export function renderPartyNameField({ pathPrefix, name = '', required = false, label = 'Printed Name' } = {}) {
  return `<div class="col-12">${renderFormField({ path: `${pathPrefix}.name`, label, value: name, required })}</div>`;
}
