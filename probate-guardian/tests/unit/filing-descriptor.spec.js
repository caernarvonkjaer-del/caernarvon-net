import { describe, expect, it, test } from 'vitest';
import {
  applyAccountingFilingType,
  filingCopy,
  resolveFilingDescriptor,
} from '../../src/core/filing/filing-descriptor.js';
import { buildAnnualAccountingModel } from '../../src/features/annual-accounting/pdf-model.js';

describe('filing descriptor', () => {
  it('atomically maps Final and Trust selections to their annual-engine identities', () => {
    const finalData = { inventoryType: 'annual', filingType: 'Annual' };
    const trustData = { inventoryType: 'annual', filingType: 'Annual' };

    expect(applyAccountingFilingType(finalData, 'Final').descriptor.id).toBe('final-accounting');
    expect(finalData).toMatchObject({ inventoryType: 'finalAccounting', filingType: 'Final' });
    expect(applyAccountingFilingType(trustData, 'Trust').descriptor.id).toBe('trust-accounting');
    expect(trustData).toMatchObject({ inventoryType: 'trustAccounting', filingType: 'Trust' });
  });

  it('reports a blocking conflict instead of silently emitting Annual output', () => {
    const result = resolveFilingDescriptor({ inventoryType: 'finalAccounting', filingType: 'Annual' });
    expect(result.descriptor.id).toBe('final-accounting');
    expect(result.issues).toHaveLength(1);
    expect(result.issues[0].code).toBe('filing.identity.conflict');
  });

  it('builds Final and Trust attestation copy from the descriptor', () => {
    const finalDescriptor = resolveFilingDescriptor({ inventoryType: 'finalAccounting', filingType: 'Final' }).descriptor;
    const trustDescriptor = resolveFilingDescriptor({ inventoryType: 'trustAccounting', filingType: 'Trust' }).descriptor;

    expect(filingCopy(finalDescriptor).preparerStatement('Ward', '01/01/2026', '12/31/2026')).toContain('Final Accounting');
    expect(filingCopy(trustDescriptor).attorneyStatement('Ward', '01/01/2026', '12/31/2026', 'Pasco')).toContain('trust accounting');
  });

  it('keeps the Initial Inventory UI name separate from its formal output name', () => {
    const descriptor = resolveFilingDescriptor({ inventoryType: 'guardian' }).descriptor;
    expect(descriptor.displayName).toBe('Initial Inventory');
    expect(descriptor.outputName).toBe('Verified Initial Inventory');
  });
});

// Milestone 43D: moved from amended-form-line.spec.js, whose own focus is
// the "Amended Form?" tri-state print line -- this block is Annual-family
// filing-identity output, this file's own concern.
const annualBase = {
  wardName: 'Harold Thomas Bennett',
  caseNumber: '26-002487-GD',
  county: 'Pasco',
};

describe('Annual-family filing identity in generated output', () => {
  for (const [inventoryType, filingType, formName, attestationName] of [
    ['finalAccounting', 'Final', 'FINAL GUARDIANSHIP ACCOUNTING', 'Final Accounting'],
    ['trustAccounting', 'Trust', 'TRUST GUARDIANSHIP ACCOUNTING', 'Trust Accounting'],
  ]) {
    test(`${filingType} uses its own headers and signed-attestation language`, () => {
      const model = buildAnnualAccountingModel({
        ...annualBase,
        inventoryType,
        filingType,
        periodFrom: '2026-01-01',
        periodTo: '2026-12-31',
      });
      const preparer = model.sections.find((section) => section.id === 'part4').blocks[0].text;
      const attorney = model.sections.find((section) => section.id === 'part5').blocks[0].text;

      expect(model.metadata.formName).toBe(formName);
      expect(model.metadata.title).toContain(attestationName);
      expect(preparer).toContain(attestationName);
      expect(attorney).toContain(attestationName.toLowerCase());
    });
  }

  test('footer subtitle contains the filing descriptor but never embeds the ward name', () => {
    for (const [inventoryType, filingType, subtitle] of [
      ['annual', 'Annual', 'Annual Accounting'],
      ['finalAccounting', 'Final', 'Final Accounting'],
      ['trustAccounting', 'Trust', 'Trust Accounting'],
    ]) {
      const model = buildAnnualAccountingModel({ ...annualBase, inventoryType, filingType });
      expect(model.metadata.formSubtitle).toBe(subtitle);
      expect(model.metadata.formSubtitle).not.toContain(annualBase.wardName);
    }
  });
});
