import { describe, it, expect, beforeEach } from 'vitest';
import { renderCaseCaptionFields } from '../../src/core/form/cards/case-caption-card.js';
import { renderWardIdentityFields, renderReportingPeriodFields } from '../../src/core/form/cards/ward-demographics-card.js';

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
