import { describe, expect, it } from 'vitest';
import {
  applyAccountingFilingType,
  filingCopy,
  resolveFilingDescriptor,
} from '../../src/core/filing/filing-descriptor.js';

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
