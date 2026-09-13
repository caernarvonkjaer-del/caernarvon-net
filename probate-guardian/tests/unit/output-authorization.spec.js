// Milestone 38D / 44B: Shared Output Authorization and Revision Tracking Unit Tests
import { describe, it, expect, beforeEach } from 'vitest';

globalThis.window = globalThis.window || {};
const {
  getOutputRevision,
  clearOutputAcknowledgement,
  markFilingRevisionChanged,
  beginFreshPreview,
  isOutputAcknowledgedFor,
  acknowledgeOutstandingRequirements,
  authorizeFilingOutput,
} = await import('../../src/core/filing/output-authorization.js');
const { createIssue, createRequiredIssue } = await import('../../src/core/validation/issue-registry.js');

describe('output-authorization revision management', () => {
  beforeEach(() => {
    clearOutputAcknowledgement();
  });

  it('maintains a monotonic integer revision counter', () => {
    const rev1 = getOutputRevision();
    const rev2 = markFilingRevisionChanged();
    expect(rev2).toBe(rev1 + 1);
    const rev3 = markFilingRevisionChanged();
    expect(rev3).toBe(rev2 + 1);
  });

  it('clears acknowledgement on markFilingRevisionChanged() and beginFreshPreview()', () => {
    const data = { wardId: 'ward-1', inventoryType: 'annual' };
    const baseIssues = () => [createRequiredIssue({ filingType: 'annual', path: 'wardName', message: 'Missing wardName' })];

    expect(acknowledgeOutstandingRequirements(data, baseIssues)).toBe(true);
    expect(isOutputAcknowledgedFor(data, { inventoryType: 'annual' })).toBe(true);

    // markFilingRevisionChanged invalidates
    markFilingRevisionChanged();
    expect(isOutputAcknowledgedFor(data, { inventoryType: 'annual' })).toBe(false);

    // re-acknowledge, then beginFreshPreview invalidates
    expect(acknowledgeOutstandingRequirements(data, baseIssues)).toBe(true);
    expect(isOutputAcknowledgedFor(data, { inventoryType: 'annual' })).toBe(true);
    beginFreshPreview();
    expect(isOutputAcknowledgedFor(data, { inventoryType: 'annual' })).toBe(false);
  });
});

describe('acknowledgeOutstandingRequirements()', () => {
  beforeEach(() => {
    clearOutputAcknowledgement();
  });

  it('records acknowledgement when all issues are bypassable', () => {
    const data = { wardId: 'ward-2', inventoryType: 'simplified' };
    const baseIssues = () => [
      createRequiredIssue({ filingType: 'simplified', path: 'wardName', message: 'Ward name required' }),
      createIssue('field.date.invalid', { message: 'Date invalid' }),
    ];

    const result = acknowledgeOutstandingRequirements(data, baseIssues);
    expect(result).toBe(true);
    expect(isOutputAcknowledgedFor(data, { inventoryType: 'simplified' })).toBe(true);
  });

  it('refuses acknowledgement when any non-bypassable issue exists', () => {
    const data = { wardId: 'ward-3', inventoryType: 'simplified' };
    const baseIssues = () => [
      createRequiredIssue({ filingType: 'simplified', path: 'wardName', message: 'Ward name required' }),
      createIssue('simplified.guardian.address-conflict', { message: 'Address conflict' }),
    ];

    const result = acknowledgeOutstandingRequirements(data, baseIssues);
    expect(result).toBe(false);
    expect(isOutputAcknowledgedFor(data, { inventoryType: 'simplified' })).toBe(false);
  });

  it('refuses acknowledgement when a corrupt/invalid supplemental PDF exists', () => {
    const data = { wardId: 'ward-4', inventoryType: 'annual' };
    const baseIssues = () => [
      createIssue('supplemental.not-pdf', { message: 'Corrupt supplement' }),
    ];

    const result = acknowledgeOutstandingRequirements(data, baseIssues);
    expect(result).toBe(false);
    expect(isOutputAcknowledgedFor(data, { inventoryType: 'annual' })).toBe(false);
  });
});

describe('authorizeFilingOutput()', () => {
  beforeEach(() => {
    clearOutputAcknowledgement();
  });

  it('returns status: allowed when there are no issues', () => {
    const data = { wardId: 'ward-10', inventoryType: 'annual' };
    const auth = authorizeFilingOutput(data, () => [], { capability: 'pdf' });
    expect(auth.status).toBe('allowed');
    expect(auth.issues).toHaveLength(0);
  });

  it('returns status: acknowledgement-required when issues are bypassable and unacknowledged', () => {
    const data = { wardId: 'ward-11', inventoryType: 'guardian' };
    const base = () => [createRequiredIssue({ filingType: 'guardian', path: 'wardName' })];

    const auth = authorizeFilingOutput(data, base, { capability: 'preview' });
    expect(auth.status).toBe('acknowledgement-required');
    expect(auth.issues).toHaveLength(1);
  });

  it('returns status: allowed for bypassable issues once acknowledged', () => {
    const data = { wardId: 'ward-12', inventoryType: 'guardian' };
    const base = () => [createRequiredIssue({ filingType: 'guardian', path: 'wardName' })];

    acknowledgeOutstandingRequirements(data, base);
    const auth = authorizeFilingOutput(data, base, { capability: 'pdf' });
    expect(auth.status).toBe('allowed');
  });

  it('returns status: blocked when non-bypassable issue affects the requested capability', () => {
    const data = { wardId: 'ward-13', inventoryType: 'annual' };
    const base = () => [
      createRequiredIssue({ filingType: 'annual', path: 'wardName' }),
      createIssue('supplemental.too-large', { message: 'File too large' }),
    ];

    // Attempting preview with supplemental issue -> blocked
    const authPreview = authorizeFilingOutput(data, base, { capability: 'preview' });
    expect(authPreview.status).toBe('blocked');

    // Attempting pdf with supplemental issue -> blocked
    const authPdf = authorizeFilingOutput(data, base, { capability: 'pdf' });
    expect(authPdf.status).toBe('blocked');
  });

  it('filters issues by requested capability: format-specific issues do not block other formats', () => {
    const data = { wardId: 'ward-14', inventoryType: 'annual' };
    const base = () => [createRequiredIssue({ filingType: 'annual', path: 'wardName' })];
    const excelCapIssue = createIssue('excel.capacity.annual.schA', { message: 'Schedule A overflow' });

    // Acknowledge the base validation issue
    acknowledgeOutstandingRequirements(data, base);

    // Excel capability check: blocked by Excel capacity
    const authExcel = authorizeFilingOutput(data, base, {
      capability: 'excel',
      additionalIssues: [excelCapIssue],
    });
    expect(authExcel.status).toBe('blocked');
    expect(authExcel.issues.some(i => i.code === 'excel.capacity.annual.schA')).toBe(true);

    // PDF capability check: Excel capacity issue is ignored (capability: ['excel']), so PDF is allowed!
    const authPdf = authorizeFilingOutput(data, base, {
      capability: 'pdf',
      additionalIssues: [excelCapIssue],
    });
    expect(authPdf.status).toBe('allowed');
    expect(authPdf.issues.some(i => i.code === 'excel.capacity.annual.schA')).toBe(false);
  });
});
