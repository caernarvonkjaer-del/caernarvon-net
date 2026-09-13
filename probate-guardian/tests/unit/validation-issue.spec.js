// Milestone 42F: the structured issue every validator now emits.
import { describe, it, expect } from 'vitest';

// Some of the modules below reach for window at import time (the same
// reason the parity specs import dynamically) -- give them one first.
globalThis.window = globalThis.window || {};
const { validationIssue, issueFactory, issueMessage, splitIssueMessage } = await import('../../src/core/validation/validation-issue.js');
const { getIssueDefinition } = await import('../../src/core/validation/issue-registry.js');
const { checkDateOrder } = await import('../../src/core/validation/date-rules.js');
const { checkSignatureState } = await import('../../src/core/validation/signature-state.js');
const { adaptValidationErrors } = await import('../../src/core/validation/validation-adapter.js');
const { prepareFilingOutput } = await import('../../src/core/filing/output-preflight.js');
const { validateSimplified } = await import('../../src/features/simplified-accounting/index.js');

describe('validationIssue()', () => {
  it('splits the "Section — detail" convention into section/label and keeps the message', () => {
    const issue = validationIssue('planSimplified', 'Cover — County is required', 'county');
    expect(issue).toMatchObject({ section: 'Cover', label: 'County is required', path: 'county', message: 'Cover — County is required' });
    expect(issue.code).toBe('planSimplified.county.required');
    expect(issue.bypassable).toBe(true);
    expect(splitIssueMessage('no dash here')).toEqual({ section: '', label: 'no dash here' });
  });

  it('stringifies to its message, so legacy consumers and template strings see what they always did', () => {
    const issue = validationIssue('annual', 'Part I — Ward name is required', 'wardName');
    expect(String(issue)).toBe('Part I — Ward name is required');
    expect(`${issue}`).toBe('Part I — Ward name is required');
    expect(Object.keys(issue)).not.toContain('toString');
    expect(issueMessage(issue)).toBe(issue.message);
    expect(issueMessage('bare')).toBe('bare');
  });

  it('canonicalizes row indices in the code but keeps the concrete path', () => {
    const issue = issueFactory('guardian')('A-1 Row 3 — Value is required', 'scheduleA1.2.fullAssetValue');
    expect(issue.code).toBe('guardian.scheduleA1[].fullAssetValue.required');
    expect(issue.path).toBe('scheduleA1.2.fullAssetValue');
  });

  it('passes through adaptValidationErrors() with its own path and a route from its section', () => {
    const [adapted] = adaptValidationErrors([validationIssue('planSimplified', 'The Plan — Question 2 (why this placement) is required', 'q2BestPlacement')], 'planSimplified');
    expect(adapted.path).toBe('q2BestPlacement');
    expect(adapted.route).toBe('/p2');
    expect(adapted.label).toBe('Question 2 (why this placement) is required');
  });

  it('is a first-class, bypassable issue through prepareFilingOutput()', () => {
    globalThis.window = globalThis.window || {};
    const preflight = prepareFilingOutput({ inventoryType: 'planSimplified' }, [validationIssue('planSimplified', 'Cover — County is required', 'county'), 'legacy bare string']);
    expect(preflight.messages).toEqual(['Cover — County is required', 'legacy bare string']);
    expect(preflight.structuredIssues[0]).toMatchObject({ path: 'county', section: 'Cover', bypassable: true });
    expect(preflight.structuredIssues[1].code).toBe('validation.legacy-unmapped');
    expect(preflight.canExport).toBe(false);
  });
});

describe('shared helpers emit structured issues only when asked', () => {
  it('checkDateOrder(): bare strings without filingType, objects routed to laterPath with it', () => {
    const opts = { sectionLabel: 'Cover', earlierLabel: 'From', laterLabel: 'To', allowSameDay: false };
    expect(checkDateOrder('2026-02-01', '2026-01-01', opts)).toEqual(['Cover — To must be on or after From']);
    const [later] = checkDateOrder('2026-02-01', '2026-01-01', { ...opts, filingType: 'planMinor', laterPath: 'periodTo' });
    expect(later).toMatchObject({ path: 'periodTo', section: 'Cover', message: 'Cover — To must be on or after From' });
    const [same] = checkDateOrder('2026-01-01', '2026-01-01', { ...opts, filingType: 'planMinor', laterPath: 'periodTo' });
    expect(same).toMatchObject({ path: 'periodTo', message: 'Cover — From and To cannot be the same day' });
  });

  it('checkSignatureState(): each message carries the path of the field it names', () => {
    const base = { sectionLabel: 'Signatures', roleLabel: 'Guardian 1', filingType: 'planSimplified', namePath: 'planGuardians.0.name', datePath: 'planGuardians.0.signatureDate', imagePath: 'planGuardians.0.signatureImage' };
    const typed = checkSignatureState({ ...base, state: 'typed', name: '', date: '' });
    expect(typed.map((i) => i.path)).toEqual(['planGuardians.0.name', 'planGuardians.0.signatureDate']);
    const stamp = checkSignatureState({ ...base, state: 'stamp', image: '' });
    expect(stamp.map((i) => i.path)).toEqual(['planGuardians.0.signatureImage']);
    expect(checkSignatureState({ sectionLabel: 'S', roleLabel: 'R', state: 'stamp', image: '' })).toEqual(['S — R signature stamp image is required']);
  });

  it('validateSimplified(): emits non-bypassable simplified.guardian.address-conflict code on conflict', () => {
    globalThis.window = globalThis.window || {};
    globalThis.window.D = {
      guardians: [
        {
          name: 'Jane Doe',
          residenceStreet: '100 Main St',
          officeStreet: '200 Office Rd',
          residenceCityStateZip: 'Tampa, FL 33601'
        }
      ]
    };
    const errs = validateSimplified();
    const conflictIssue = errs.find(e => e.code === 'simplified.guardian.address-conflict');
    expect(conflictIssue).toBeDefined();
    expect(conflictIssue).toMatchObject({
      code: 'simplified.guardian.address-conflict',
      section: 'Part IV',
      label: 'Guardian #1 address conflict',
      path: 'guardians.0.residenceStreet',
      route: '/p4',
      category: 'data-integrity',
      bypassable: false
    });
    expect(getIssueDefinition(conflictIssue.code)?.bypassable).toBe(false);
  });
});
