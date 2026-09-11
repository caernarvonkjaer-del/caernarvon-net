import { describe, expect, it } from 'vitest';
import { maskSSN } from '../../src/core/pdf/ssn-format.js';
import { buildPlanAnnualModel } from '../../src/features/plan-annual/pdf-model.js';
import { buildPlanInitialModel } from '../../src/features/plan-initial/pdf-model.js';
import { buildPlanMinorModel } from '../../src/features/plan-minor/pdf-model.js';
import { buildAnnualAccountingModel } from '../../src/features/annual-accounting/pdf-model.js';
import { buildGuardianInventoryModel } from '../../src/features/guardian-inventory/pdf-model.js';

describe('maskSSN unit tests', () => {
  it('masks standard formatted 9-digit SSN', () => {
    expect(maskSSN('123-45-6789')).toBe('***-**-6789');
  });

  it('masks unformatted 9-digit SSN string', () => {
    expect(maskSSN('123456789')).toBe('***-**-6789');
  });

  it('masks EINs with first 5 digits', () => {
    expect(maskSSN('12-3456789')).toBe('***-**-6789');
  });

  it('handles already masked SSNs gracefully', () => {
    expect(maskSSN('***-**-6789')).toBe('***-**-6789');
  });

  it('returns empty string for empty inputs', () => {
    expect(maskSSN('')).toBe('');
    expect(maskSSN(null)).toBe('');
    expect(maskSSN(undefined)).toBe('');
  });
});

describe('PDF Models SSN/EIN/TIN masking integration', () => {
  it('masks SSN in Annual Plan PDF model', () => {
    const model = buildPlanAnnualModel({
      ssn: '123-45-6789',
      planGuardians: [{ name: 'John Doe', ssn: '987-65-4321', phone: '555-0100' }],
    });

    const coverGrid = model.sections.find(s => s.id === 'cover').blocks.find(b => b.type === 'key-value-grid');
    const ssnItem = coverGrid.items.find(i => i.label === 'Social Security Number');
    expect(ssnItem.value).toBe('***-**-6789');
    expect(ssnItem.value).not.toContain('123-45');

    const certSection = model.sections.find(s => s.id === 'certification');
    const sigBlock = certSection.blocks.find(b => b.type === 'signature-block');
    const ssnField = sigBlock.fields.flat().find(f => f.label === 'SSN / EIN');
    expect(ssnField.value).toBe('***-**-4321');
    expect(ssnField.value).not.toContain('987-65');
  });

  it('masks SSN in Initial Plan PDF model', () => {
    const model = buildPlanInitialModel({
      planGuardians: [{ name: 'Jane Doe', ssn: '123-45-6789', phone: '555-0100' }],
    });

    const certSection = model.sections.find(s => s.id === 'certification');
    const sigBlock = certSection.blocks.find(b => b.type === 'signature-block');
    const ssnField = sigBlock.fields.flat().find(f => f.label === 'SSN / EIN');
    expect(ssnField.value).toBe('***-**-6789');
    expect(ssnField.value).not.toContain('123-45');
  });

  it('masks TIN in Minor Plan PDF model', () => {
    const model = buildPlanMinorModel({
      planGuardians: [{ name: 'Mary Smith', tin: '123-45-6789' }],
      preparer_name: 'Bob Preparer',
      preparer_tin: '987-65-4321',
    });

    const certSection = model.sections.find(s => s.id === 'certification');
    const gSigBlock = certSection.blocks.find(b => b.type === 'signature-block');
    const gTinField = gSigBlock.fields.flat().find(f => f.label === 'Taxpayer ID #');
    expect(gTinField.value).toBe('***-**-6789');

    const prepSection = model.sections.find(s => s.id === 'preparer-attorney');
    const prepSigBlock = prepSection.blocks.find(b => b.type === 'signature-block');
    const prepTinField = prepSigBlock.fields.flat().find(f => f.label === 'Taxpayer ID #');
    expect(prepTinField.value).toBe('***-**-4321');
  });
});
