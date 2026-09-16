// Milestone 38D / 44B: Canonical Validation Issue Registry Unit Tests
import fs from 'node:fs';
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

// Milestone 51C1. getIssueDefinition() resolves a literal key first
// (`if (definitions[code]) return definitions[code]`), so any later branch that
// can ONLY match codes already present as literal keys is unreachable -- which
// is exactly how three dead branches accumulated here (the supplemental.*
// alternation, the output.* alternation, and the `code === 'output.security.denied'`
// equality check all enumerated codes that were already literal keys).
//
// This guard reads the source rather than probing behavior on purpose: a dead
// branch and a live one are indistinguishable from the outside, because both
// return the same definition. Only the source says which one answered.
describe('issue-registry: no unreachable fallback branches (Milestone 51C)', () => {
  const source = fs.readFileSync(
    new URL('../../src/core/validation/issue-registry.js', import.meta.url),
    'utf8',
  );

  const literalKeys = (() => {
    const block = source.match(/const definitions = Object\.freeze\(\{([\s\S]*?)\n\}\);/);
    expect(block, 'definitions object literal must be findable in source').toBeTruthy();
    return new Set([...block[1].matchAll(/^\s*'([^']+)'\s*:/gm)].map(m => m[1]));
  })();

  const resolverBody = (() => {
    const fn = source.match(/export function getIssueDefinition\(code\) \{([\s\S]*?)\n\}/);
    expect(fn, 'getIssueDefinition() must be findable in source').toBeTruthy();
    return fn[1];
  })();

  // Expands a fully-literal anchored pattern such as
  // `^output\.(a\.b|c)$` into ['output.a.b', 'output.c']. Returns null for any
  // pattern carrying real regex machinery (wildcards, quantifiers, classes) or
  // lacking both anchors -- those can match codes that are not literal keys, so
  // they are legitimately reachable and this guard must not judge them.
  function expandLiteralPattern(pattern) {
    if (!pattern.startsWith('^') || !pattern.endsWith('$')) return null;
    const body = pattern.slice(1, -1);
    if (/[.*+?\[\]{}]/.test(body.replace(/\\\./g, ''))) return null;
    let codes = [''];
    for (const token of body.match(/\([^()]*\)|[^()]+/g) || []) {
      const alternatives = token.startsWith('(')
        ? token.slice(1, -1).split('|')
        : [token];
      codes = codes.flatMap(prefix => alternatives.map(alt => prefix + alt));
    }
    return codes.map(c => c.replace(/\\\./g, '.'));
  }

  it('every fully-enumerated regex branch can match at least one code that is not already a literal key', () => {
    const dead = [];
    for (const [, pattern] of resolverBody.matchAll(/\/(\^[^/]+\$)\/\.test\(code\)/g)) {
      const codes = expandLiteralPattern(pattern);
      if (!codes) continue; // prefix/wildcard pattern -- reachable by construction
      if (codes.every(code => literalKeys.has(code))) {
        dead.push({ pattern, codes });
      }
    }
    expect(
      dead,
      `Unreachable branch(es) in getIssueDefinition(): every code these patterns match is `
      + `already a literal key in definitions, so the line-34 lookup always answers first. `
      + `Delete the branch, or give the pattern a code that is not a literal key.\n`
      + dead.map(d => `  /${d.pattern}/ -> ${d.codes.join(', ')}`).join('\n'),
    ).toEqual([]);
  });

  it('no equality branch tests for a code that is already a literal key', () => {
    const dead = [...resolverBody.matchAll(/code === '([^']+)'/g)]
      .map(m => m[1])
      .filter(code => literalKeys.has(code));
    expect(
      dead,
      `Unreachable equality branch(es) in getIssueDefinition(): these codes are already `
      + `literal keys in definitions, so the line-34 lookup always answers first: ${dead.join(', ')}`,
    ).toEqual([]);
  });

  it('the surviving prefix patterns are still recognised as reachable, not silently skipped', () => {
    // Guards the guard: if expandLiteralPattern() ever started returning a code
    // list for these, the test above would begin judging genuinely-live
    // branches, and a real one could be deleted on its say-so.
    expect(expandLiteralPattern('^excel\\.capacity\\.(guardian|simplified)\\.')).toBeNull();
    expect(expandLiteralPattern('^(guardian|planMinor)\\.')).toBeNull();
    // ...and that it does still expand the shape it is meant to catch.
    expect(expandLiteralPattern('^output\\.(a\\.b|c)$')).toEqual(['output.a.b', 'output.c']);
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
