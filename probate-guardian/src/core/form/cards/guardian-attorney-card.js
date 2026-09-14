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
// Split into two exports, not one, because the real page interleaves them
// with the signature-date field and the signature-state control widget
// (name first, then date+signature control, then contact fields) --
// preserving that exact field order matters for the 0-visual-diff proof,
// since extractFormContentSnapshot() captures control values in DOM order.
import { renderFormField } from '../form-fields.js';

export function renderPartyNameField({ pathPrefix, name = '', required = false, label = 'Printed Name' } = {}) {
  return `<div class="col-12">${renderFormField({ path: `${pathPrefix}.name`, label, value: name, required })}</div>`;
}

export function renderPartyContactFields({ pathPrefix, phone = '', email = '', mailingAddress = '' } = {}) {
  return `<div class="col-md-6">${renderFormField({ path: `${pathPrefix}.phone`, label: 'Phone Number', value: phone })}</div>
    <div class="col-12">${renderFormField({ path: `${pathPrefix}.email`, label: 'Email Address', value: email })}</div>
    <div class="col-12">${renderFormField({ path: `${pathPrefix}.mailingAddress`, label: 'Mailing Address', value: mailingAddress })}</div>`;
}
