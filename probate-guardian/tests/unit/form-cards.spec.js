import { describe, it, expect, beforeEach } from 'vitest';
import { renderCaseCaptionFields } from '../../src/core/form/cards/case-caption-card.js';
import { renderWardIdentityFields, renderReportingPeriodFields } from '../../src/core/form/cards/ward-demographics-card.js';
import { renderPartyNameField, renderPartyContactFields } from '../../src/core/form/cards/guardian-attorney-card.js';
import { renderResidenceFields } from '../../src/core/form/cards/residence-facility-card.js';

// Milestone 41-2: Tier 2 cards each bind correctly to data-form-path and
// render their required elements. Cards return bare field-group fragments
// (no box/heading of their own) so a Tier 3 page can compose more than one
// card inside a single visual box unchanged -- see case-caption-card.js's
// header comment for why Plan Simplified's Cover page needs exactly that.
describe('renderCaseCaptionFields', () => {
  beforeEach(() => {
    global.window = { countyInputS: (id, label, val, req) => `<div class="mb-2"><label class="form-label" for="${id}">${label}${req ? '<span class="req">*</span>' : ''}</label><input id="${id}" value="${val}"></div>` };
  });

  it('binds Case Number to data-form-path via the Tier 1 primitive', () => {
    const html = renderCaseCaptionFields({ caseNumber: '2026-CP-000123', county: 'Pinellas' });
    expect(html).toContain('data-form-path="caseNumber"');
    expect(html).toContain('value="2026-CP-000123"');
  });

  it('renders County via the reused countyInputS() widget, not a Tier 1 primitive', () => {
    const html = renderCaseCaptionFields({ caseNumber: '', county: 'Pasco' });
    expect(html).toContain('for="county"');
    expect(html).toContain('value="Pasco"');
  });

  it('honors required flags independently for each field', () => {
    const html = renderCaseCaptionFields({ caseNumberRequired: false, countyRequired: true });
    expect(html).not.toMatch(/Case Number<span class="req">/);
    expect(html).toContain('County<span class="req">*</span>');
  });
});

describe('renderWardIdentityFields', () => {
  it('renders the ward name field bound to data-form-path="wardName"', () => {
    const html = renderWardIdentityFields({ wardName: 'Harold Thomas Bennett' });
    expect(html).toContain('data-form-path="wardName"');
    expect(html).toContain('value="Harold Thomas Bennett"');
  });

  it('omits the SSN field entirely when not passed (Plan Simplified has none)', () => {
    const html = renderWardIdentityFields({ wardName: 'Ward' });
    expect(html).not.toContain('data-form-path="ssn"');
  });

  it('renders the SSN field when explicitly passed (a later filing type that has one)', () => {
    const html = renderWardIdentityFields({ wardName: 'Ward', ssn: '123-45-6789' });
    expect(html).toContain('data-form-path="ssn"');
  });
});

describe('renderReportingPeriodFields', () => {
  it('renders both period fields bound to their canonical paths', () => {
    const html = renderReportingPeriodFields({ periodFrom: '2026-01-01', periodTo: '2026-12-31' });
    expect(html).toContain('data-form-path="periodFrom"');
    expect(html).toContain('data-form-path="periodTo"');
    expect(html).toContain('data-field-kind="date"');
    expect(html).toContain('placeholder="MM/DD/YYYY"');
  });

  it('omits the inception date field entirely when not passed', () => {
    const html = renderReportingPeriodFields({ periodFrom: '', periodTo: '' });
    expect(html).not.toContain('data-form-path="inceptionDate"');
  });

  it('renders the inception date field when explicitly passed, with a custom label', () => {
    const html = renderReportingPeriodFields({ periodFrom: '', periodTo: '', inceptionDate: '2025-06-01', inceptionLabel: 'Guardianship Inception Date (GID)' });
    expect(html).toContain('data-form-path="inceptionDate"');
    expect(html).toContain('Guardianship Inception Date (GID)');
  });

  it('accepts custom from/to labels for filing types that phrase the period differently', () => {
    const html = renderReportingPeriodFields({ periodFrom: '', periodTo: '', fromLabel: 'Accounting Period From', toLabel: 'Accounting Period To' });
    expect(html).toContain('Accounting Period From');
    expect(html).toContain('Accounting Period To');
  });
});

// Milestone 41-2: split into two exports (not one "Guardian & Attorney"
// card as originally named) after reading Plan Simplified's real
// Signatures page -- Guardian, Preparer, and Attorney each have a
// genuinely different field shape (see guardian-attorney-card.js's header
// comment), so only the Guardian block's own name/phone/email/
// mailingAddress fields (its one real gap: entirely hand-rolled, never on
// Tier 1) were built as a card. Preparer/Attorney already delegate to
// Tier 1 via inpS() as of Milestone 41-1.
describe('renderPartyNameField', () => {
  it('binds the name field to <pathPrefix>.name', () => {
    const html = renderPartyNameField({ pathPrefix: 'planGuardians.0', name: 'Jordan Alvarez', required: true });
    expect(html).toContain('data-form-path="planGuardians.0.name"');
    expect(html).toContain('value="Jordan Alvarez"');
    expect(html).toContain('data-field-required="true"');
  });

  it('omits the required marker for a co-guardian slot', () => {
    const html = renderPartyNameField({ pathPrefix: 'planGuardians.1', name: '', required: false });
    expect(html).not.toContain('data-field-required="true"');
  });

  it('defaults to "Printed Name" but accepts a label override (Milestone 41-3: Plan Minor uses plain "Name")', () => {
    const defaultLabel = renderPartyNameField({ pathPrefix: 'planGuardians.0', name: '' });
    expect(defaultLabel).toContain('Printed Name');
    const overridden = renderPartyNameField({ pathPrefix: 'planGuardians.0', name: '', label: 'Name' });
    expect(overridden).not.toContain('Printed Name');
    expect(overridden).toContain('>Name<');
  });
});

describe('renderPartyContactFields', () => {
  it('binds phone, email, and mailing address to <pathPrefix>.<field>', () => {
    const html = renderPartyContactFields({
      pathPrefix: 'planGuardians.0', phone: '727-555-0102', email: 'guardian@example.com', mailingAddress: '10 Bay St, Clearwater, FL 33755',
    });
    expect(html).toContain('data-form-path="planGuardians.0.phone"');
    expect(html).toContain('data-form-path="planGuardians.0.email"');
    expect(html).toContain('data-form-path="planGuardians.0.mailingAddress"');
    expect(html).toContain('value="727-555-0102"');
    expect(html).toContain('value="guardian@example.com"');
  });
});

// Milestone 41-3: the milestone's fourth named card, deferred twice before
// this and built only once Plan Annual supplied a second real usage. Both
// Plan Initial and Plan Annual share its field paths, order, and column
// widths exactly; only label text and the wardLiving option strings differ,
// which is what the overridable labels are for.
describe('renderResidenceFields', () => {
  it('binds every residence and mailing field to its canonical path', () => {
    const html = renderResidenceFields({
      wardLiving: 'In a facility (skilled nursing, assisted living, etc.)',
      wardLivingOptions: ['In a private residence leased or owned by them', 'In a facility (skilled nursing, assisted living, etc.)'],
      residenceAddress: '123 Main St',
      residenceCityStateZip: 'Clearwater, FL 33755',
      residencePhone: '727-555-0101',
      mailingAddress: 'PO Box 4',
      mailingCityStateZip: 'Largo, FL 33770',
    });
    expect(html).toContain('data-form-path="wardLiving"');
    expect(html).toContain('data-form-path="residenceAddress"');
    expect(html).toContain('data-form-path="residenceCityStateZip"');
    expect(html).toContain('data-form-path="residencePhone"');
    expect(html).toContain('data-form-path="mailingAddress"');
    expect(html).toContain('data-form-path="mailingCityStateZip"');
  });

  it('renders wardLiving as a fieldset-wrapped radio group with the caller-supplied options', () => {
    const html = renderResidenceFields({
      wardLiving: 'In a facility',
      wardLivingOptions: ['At home', 'In a facility'],
    });
    expect(html).toContain('<fieldset class="mb-3">');
    expect(html).toContain('<legend class="form-label">The ward is living:');
    expect(html).toContain('value="At home"');
    expect(html).toMatch(/value="In a facility" checked/);
  });

  it('accepts per-type label overrides for the two labels that differ between Plan Initial and Plan Annual', () => {
    const html = renderResidenceFields({
      wardLivingOptions: [],
      residenceAddressLabel: 'Address Where Ward Is Currently Residing',
      mailingAddressLabel: 'Mailing Address for Ward (if different from above)',
    });
    expect(html).toContain('Address Where Ward Is Currently Residing');
    expect(html).toContain('Mailing Address for Ward (if different from above)');
    expect(html).not.toContain('Address Where Ward Resides');
  });

  it('marks residence address and city/state/zip required, and leaves phone and mailing optional', () => {
    const html = renderResidenceFields({ wardLivingOptions: [] });
    // Exactly two data-field-required attributes: residenceAddress and
    // residenceCityStateZip. wardLiving is required too, but
    // renderRadioGroupField only renders the visual asterisk in its legend
    // and emits no data-field-required attribute -- a faithful port of
    // radioP()'s original behavior, confirmed rather than assumed.
    expect((html.match(/data-field-required="true"/g) || []).length).toBe(2);
    expect(html).toContain('The ward is living:<span class="req">*</span>');
    expect(html).not.toMatch(/Phone<span class="req">/);
    expect(html).not.toMatch(/Mailing City \/ State \/ ZIP<span class="req">/);
  });
});
