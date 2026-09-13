// Milestone 38D / 44B: Typed Output Preflight Boundary Unit Tests
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

globalThis.window = globalThis.window || {};
const { prepareFilingOutput } = await import('../../src/core/filing/output-preflight.js');
const { createIssue, createRequiredIssue } = await import('../../src/core/validation/issue-registry.js');
const { validationIssue } = await import('../../src/core/validation/validation-issue.js');

describe('prepareFilingOutput() with typed issues', () => {
  beforeEach(() => {
    globalThis.window = globalThis.window || {};
  });

  afterEach(() => {
    delete globalThis.window.isOutputAcknowledgedFor;
  });

  it('preserves structured issue attributes (code, category, bypassable, capabilities)', () => {
    const issues = [
      createRequiredIssue({ filingType: 'annual', path: 'wardName', section: 'Part I', label: 'Ward Name', message: 'Part I — Ward Name is required' }),
      createIssue('supplemental.not-pdf', { message: 'doc.pdf is not a valid PDF', path: 'scheduleDocs' }),
    ];

    const result = prepareFilingOutput({ inventoryType: 'annual' }, issues);

    expect(result.structuredIssues).toHaveLength(2);
    expect(result.structuredIssues[0]).toMatchObject({
      code: 'annual.wardName.required',
      category: 'validation',
      bypassable: true,
    });
    expect(result.structuredIssues[1]).toMatchObject({
      code: 'supplemental.not-pdf',
      category: 'supplemental',
      bypassable: false,
      capabilities: ['preview', 'print', 'pdf'],
    });
    expect(result.canExport).toBe(false);
  });

  it('clears messages and allows export when ALL issues are bypassable and acknowledged', () => {
    const bypassableIssues = [
      validationIssue('planSimplified', 'Cover — County is required', 'county'),
      validationIssue('planSimplified', 'Part I — Ward Name is required', 'wardName'),
    ];

    // Unacknowledged: canExport is false
    const unackResult = prepareFilingOutput({ inventoryType: 'planSimplified' }, bypassableIssues);
    expect(unackResult.canExport).toBe(false);
    expect(unackResult.messages).toHaveLength(2);

    // Acknowledged: messages cleared, canExport becomes true
    globalThis.window.isOutputAcknowledgedFor = () => true;
    const ackResult = prepareFilingOutput({ inventoryType: 'planSimplified' }, bypassableIssues);
    expect(ackResult.structuredIssues).toHaveLength(2);
    expect(ackResult.messages).toHaveLength(0);
    expect(ackResult.canExport).toBe(true);
  });

  it('keeps canExport false and messages intact when ANY non-bypassable issue exists, even if acknowledged', () => {
    globalThis.window.isOutputAcknowledgedFor = () => true;

    // Mixed: one bypassable validation error, one non-bypassable supplemental PDF issue
    const mixedIssues = [
      validationIssue('simplified', 'Part I — Ward Name is required', 'wardName'),
      createIssue('supplemental.too-large', { message: 'attachment.pdf is too large' }),
    ];

    const result = prepareFilingOutput({ inventoryType: 'simplified' }, mixedIssues);

    expect(result.structuredIssues).toHaveLength(2);
    const suppIssue = result.structuredIssues.find(i => i.code === 'supplemental.too-large');
    expect(suppIssue?.bypassable).toBe(false);

    // Acknowledgement MUST NOT allow output when a non-bypassable issue is present
    expect(result.messages).toHaveLength(2);
    expect(result.canExport).toBe(false);
  });

  it('treats corrupted/unreadable supplemental PDF as strictly non-bypassable', () => {
    globalThis.window.isOutputAcknowledgedFor = () => true;

    const suppCodes = [
      'supplemental.missing-data',
      'supplemental.decode-failed',
      'supplemental.not-pdf',
      'supplemental.too-large',
      'supplemental.checking',
      'supplemental.not-ready',
      'supplemental.page-limit',
      'supplemental.blocked',
      'supplemental.total-bytes',
      'supplemental.total-pages',
    ];

    for (const code of suppCodes) {
      const result = prepareFilingOutput({ inventoryType: 'annual' }, [createIssue(code, { message: `Failure: ${code}` })]);
      expect(result.canExport, `canExport for ${code}`).toBe(false);
      expect(result.messages.length, `messages for ${code}`).toBeGreaterThan(0);
    }
  });

  it('treats filing identity issues as strictly non-bypassable', () => {
    globalThis.window.isOutputAcknowledgedFor = () => true;

    const result = prepareFilingOutput({ inventoryType: 'invalid-type-key' }, []);
    const identityIssue = result.structuredIssues.find(i => i.code === 'filing.identity.unknown');
    expect(identityIssue).toBeDefined();
    expect(identityIssue?.bypassable).toBe(false);
    expect(result.canExport).toBe(false);
  });
});
