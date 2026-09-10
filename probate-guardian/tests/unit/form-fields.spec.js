import { describe, it, expect } from 'vitest';
import { inferFieldKind, renderFormField, renderSelectField, renderTextareaField } from '../../src/core/form/form-fields.js';

describe('inferFieldKind', () => {
  it('identifies date fields from type or label', () => {
    expect(inferFieldKind('Signature Date', 'text')).toBe('date');
    expect(inferFieldKind('Date of Inception', 'text')).toBe('date');
    expect(inferFieldKind('Period From', 'date')).toBe('date');
  });

  it('identifies money fields from type="number"', () => {
    expect(inferFieldKind('Amount Paid', 'number')).toBe('money');
    expect(inferFieldKind('Starting Balance', 'number')).toBe('money');
  });

  it('identifies SSN and Taxpayer ID', () => {
    expect(inferFieldKind('Social Security Number', 'text')).toBe('ssn');
    expect(inferFieldKind('SSN / EIN', 'text')).toBe('ssn');
    expect(inferFieldKind('Taxpayer ID # (TIN)', 'text')).toBe('ssn');
  });

  it('identifies phone numbers', () => {
    expect(inferFieldKind('Primary Phone Number', 'text')).toBe('phone');
  });

  it('identifies case, bar, and check numbers', () => {
    expect(inferFieldKind('Court Case Number', 'text')).toBe('caseNumber');
    expect(inferFieldKind('Florida Bar Number', 'text')).toBe('barNumber');
    expect(inferFieldKind('Check #', 'text')).toBe('checkNumber');
  });

  it('identifies names while avoiding combined bank account fields', () => {
    expect(inferFieldKind('Guardian Name', 'text')).toBe('name');
    expect(inferFieldKind('Payer', 'text')).toBe('name');
    expect(inferFieldKind('Bank Name / Account #', 'text')).toBe('text');
  });

  it('identifies addresses and zip codes', () => {
    expect(inferFieldKind('Mailing Street Address', 'text')).toBe('address');
    expect(inferFieldKind('City / State / Zip', 'text')).toBe('zip');
  });
});

describe('renderFormField', () => {
  it('renders standard text input with both canonical and legacy data attributes', () => {
    const html = renderFormField({
      path: 'wardName',
      label: 'Name of Ward',
      value: 'John Doe',
      required: true,
    });

    expect(html).toContain('data-field-path="wardName"');
    expect(html).toContain('data-form-path="wardName"');
    expect(html).toContain('data-annual-path="wardName"');
    expect(html).toContain('data-field-kind="name"');
    expect(html).toContain('data-field-required="true"');
    expect(html).toContain('data-sync-ward-name="true"');
    expect(html).toContain('value="John Doe"');
    expect(html).toContain('<span class="req">*</span>');
  });

  it('renders date inputs with hint and aria-describedby', () => {
    const html = renderFormField({
      path: 'periodFrom',
      label: 'Period From',
      value: '2027-01-01',
      type: 'date',
    });

    expect(html).toContain('placeholder="MM/DD/YYYY"');
    expect(html).toContain('data-field-kind="date"');
    expect(html).toContain('data-field-format-policy="normalize"');
    expect(html).toContain('aria-describedby=');
    expect(html).toContain('Use MM/DD/YYYY');
    expect(html).not.toContain('YYYY-MM-DD');
  });

  it('renders money input wrapped with dollar sign input-group', () => {
    const html = renderFormField({
      path: 'startingBalance',
      label: 'Starting Balance',
      value: '1250.50',
      type: 'number',
    });

    expect(html).toContain('<div class="input-group">');
    expect(html).toContain('<span class="input-group-text">$</span>');
    expect(html).toContain('inputmode="decimal"');
    expect(html).toContain('data-field-kind="money"');
  });

  it('renders percent input wrapped with percent sign input-group', () => {
    const html = renderFormField({
      path: 'guardianFeePercent',
      label: 'Guardian Fee Percent (%)',
      value: '5',
      type: 'number',
    });

    expect(html).toContain('<div class="input-group">');
    expect(html).toContain('<span class="input-group-text">%</span>');
  });

  it('renders SSN input wrapped with ssn-mask-wrap and reveal button', () => {
    const html = renderFormField({
      path: 'guardians.0.ssn',
      label: 'SSN / EIN',
      value: '123-45-6789',
      required: true,
    });

    expect(html).toContain('class="form-control ssn-masked"');
    expect(html).toContain('<div class="ssn-mask-wrap">');
    expect(html).toContain('data-form-action="toggle-ssn"');
    expect(html).toContain('data-field-kind="ssn"');
    expect(html).toContain('data-field-format-policy="preserve"');
  });
});

describe('renderSelectField and renderTextareaField', () => {
  it('renders select dropdown with options and attributes', () => {
    const html = renderSelectField({
      path: 'typeOfGuardianship',
      label: 'Type of Guardianship',
      value: 'Plenary',
      options: ['Plenary', 'Limited'],
    });

    expect(html).toContain('<select class="form-select"');
    expect(html).toContain('data-field-path="typeOfGuardianship"');
    expect(html).toContain('selected>Plenary</option>');
  });

  it('renders textarea with rows, hint, and character preservation', () => {
    const html = renderTextareaField({
      path: 'planNotes',
      label: 'Annual Narrative Notes',
      value: 'All medical needs met.\nNo issues.',
      rows: 5,
      hint: 'Include major events in the ward\'s life',
    });

    expect(html).toContain('<textarea class="form-control"');
    expect(html).toContain('rows="5"');
    expect(html).toContain('class="plan-field-hint"');
    expect(html).toContain('All medical needs met.');
  });
});
