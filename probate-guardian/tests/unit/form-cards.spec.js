import { describe, it, expect, beforeEach } from 'vitest';
import { renderCaseCaptionFields } from '../../src/core/form/cards/case-caption-card.js';
import { renderWardIdentityFields, renderReportingPeriodFields } from '../../src/core/form/cards/ward-demographics-card.js';
import { renderPartyNameField, renderPartyContactFields } from '../../src/core/form/cards/guardian-attorney-card.js';

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
