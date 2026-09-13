// Milestone 38D / 44B: Canonical Validation Issue Registry Unit Tests
import { describe, it, expect } from 'vitest';
import {
  ALL_CAPABILITIES,
  PDF_CAPABILITIES,
  EXCEL_CAPABILITIES,
  getIssueDefinition,
  createIssue,
  createRequiredIssue,
  assertRegisteredIssues,
} from '../../src/core/validation/issue-registry.js';

describe('issue-registry definitions', () => {
  it('defines core validation and data-integrity definitions', () => {
    const legacy = getIssueDefinition('validation.legacy-unmapped');
    expect(legacy).toEqual({
      category: 'validation',
      bypassable: true,
      capabilities: ALL_CAPABILITIES,
      showInReadiness: true,
    });

    const dateInvalid = getIssueDefinition('field.date.invalid');
    expect(dateInvalid).toEqual({
      category: 'validation',
      bypassable: true,
      capabilities: ALL_CAPABILITIES,
      showInReadiness: true,
    });

    const unknownIdentity = getIssueDefinition('filing.identity.unknown');
    expect(unknownIdentity).toEqual({
      category: 'data-integrity',
      bypassable: false,
      capabilities: ALL_CAPABILITIES,
      showInReadiness: false,
    });

    const conflictIdentity = getIssueDefinition('filing.identity.conflict');
    expect(conflictIdentity).toEqual({
      category: 'data-integrity',
      bypassable: false,
      capabilities: ALL_CAPABILITIES,
      showInReadiness: false,
    });

    const addressConflict = getIssueDefinition('simplified.guardian.address-conflict');
    expect(addressConflict).toEqual({
      category: 'data-integrity',
      bypassable: false,
      capabilities: ALL_CAPABILITIES,
      showInReadiness: true,
    });
  });

  it('defines all 10 supplemental.* issue codes with non-bypassable and PDF/preview capabilities', () => {
    const codes = [
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

    for (const code of codes) {
      const def = getIssueDefinition(code);
      expect(def, `Definition for ${code}`).toBeDefined();
      expect(def).toEqual({
        category: 'supplemental',
        bypassable: false,
        capabilities: PDF_CAPABILITIES,
        showInReadiness: false,
      });
    }
  });

  it('defines excel.capacity.* issues with non-bypassable and excel-only capabilities', () => {
    const sampleCodes = [
      'excel.capacity.guardian.scheduleA1',
      'excel.capacity.simplified.remuneration',
      'excel.capacity.annual.scheduleB',
      'excel.capacity.finalAccounting.scheduleA',
      'excel.capacity.trustAccounting.scheduleC',
    ];

    for (const code of sampleCodes) {
      const def = getIssueDefinition(code);
      expect(def, `Definition for ${code}`).toEqual({
        category: 'capacity',
        bypassable: false,
        capabilities: EXCEL_CAPABILITIES,
        showInReadiness: false,
      });
    }
  });

  it('defines output.* technical and security issues', () => {
    const technicalCodes = [
      'output.template.missing',
      'output.resource.unavailable',
      'output.generation.failed',
      'output.capability.unsupported',
    ];

    for (const code of technicalCodes) {
      const def = getIssueDefinition(code);
      expect(def, `Definition for ${code}`).toEqual({
        category: 'technical',
        bypassable: false,
        capabilities: ALL_CAPABILITIES,
        showInReadiness: false,
      });
    }

    const securityDef = getIssueDefinition('output.security.denied');
    expect(securityDef).toEqual({
      category: 'security',
      bypassable: false,
      capabilities: ALL_CAPABILITIES,
      showInReadiness: false,
    });
  });

  it('resolves filing-specific validation issue codes to legacy-unmapped fallback', () => {
    const types = [
      'guardian', 'simplified', 'annual', 'finalAccounting',
      'trustAccounting', 'planSimplified', 'planAnnual', 'planInitial', 'planMinor',
    ];

    for (const type of types) {
      const def = getIssueDefinition(`${type}.wardName.required`);
      expect(def, `Fallback for ${type}`).toEqual({
        category: 'validation',
        bypassable: true,
        capabilities: ALL_CAPABILITIES,
        showInReadiness: true,
      });
    }
  });

  it('returns null for completely unregistered codes', () => {
    expect(getIssueDefinition('completely.unknown.code')).toBeNull();
    expect(getIssueDefinition('')).toBeNull();
    expect(getIssueDefinition('random-string')).toBeNull();
  });
});

describe('createIssue() and createRequiredIssue()', () => {
  it('creates an issue with definition properties and detail payload', () => {
    const issue = createIssue('supplemental.not-pdf', {
      message: 'Not a PDF',
      path: 'scheduleDocs.0',
      section: 'Supporting documents',
      label: 'Attachment 1',
    });

    expect(issue).toEqual({
      code: 'supplemental.not-pdf',
      message: 'Not a PDF',
      section: 'Supporting documents',
      label: 'Attachment 1',
      path: 'scheduleDocs.0',
      route: '',
      category: 'supplemental',
      bypassable: false,
      capabilities: PDF_CAPABILITIES,
      showInReadiness: false,
    });
  });

  it('prevents callers from overriding bypassable or category via detail', () => {
    const issue = createIssue('supplemental.not-pdf', {
      message: 'Attempt override',
      bypassable: true, // Should be ignored
      category: 'validation', // Should be ignored
    });

    expect(issue.bypassable).toBe(false);
    expect(issue.category).toBe('supplemental');
  });

  it('allows caller-supplied valid capabilities for output.* issues', () => {
    const issue = createIssue('output.template.missing', {
      message: 'Excel template missing',
      capabilities: ['excel'],
    });

    expect(issue.capabilities).toEqual(['excel']);
    expect(issue.bypassable).toBe(false);
    expect(issue.category).toBe('technical');
  });

  it('createRequiredIssue() normalizes array indexes in path to [] in code', () => {
    const issue = createRequiredIssue({
      filingType: 'annual',
      path: 'guardians.0.name',
      section: 'Part III',
      label: 'Guardian Name',
      route: '/p3',
      message: 'Part III — Guardian Name is required',
    });

    expect(issue.code).toBe('annual.guardians[].name.required');
    expect(issue.path).toBe('guardians.0.name');
    expect(issue.section).toBe('Part III');
    expect(issue.bypassable).toBe(true);
  });
});

describe('assertRegisteredIssues()', () => {
  it('returns true when all issues are valid registered issues', () => {
    const issues = [
      createIssue('validation.legacy-unmapped'),
      createIssue('field.date.invalid'),
      createIssue('supplemental.not-pdf'),
      createIssue('excel.capacity.simplified.remuneration'),
      createRequiredIssue({ filingType: 'guardian', path: 'wardName' }),
    ];

    expect(assertRegisteredIssues(issues)).toBe(true);
  });

  it('returns false if any issue is unregistered or malformed', () => {
    expect(assertRegisteredIssues([{ code: 'unregistered.bad.code' }])).toBe(false);
    expect(assertRegisteredIssues([null])).toBe(false);
    expect(assertRegisteredIssues([{ noCode: true }])).toBe(false);
  });
});
