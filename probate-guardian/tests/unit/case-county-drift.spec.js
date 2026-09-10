import { describe, expect, test, vi } from 'vitest';

vi.mock('../../src/core/case-resolver.js', () => ({ resolveCase: vi.fn() }));
import { resolveCase } from '../../src/core/case-resolver.js';
import { countyDriftWarnings } from '../../src/core/case-county-drift.js';

describe('countyDriftWarnings', () => {
  test('uses the case county as authority and never emits a blocker', () => {
    resolveCase.mockReturnValue({ county: 'Pinellas' });
    expect(countyDriftWarnings({ caseId: 'case-1', county: 'Pasco', attorney_county: 'Hillsborough' })).toEqual([
      expect.objectContaining({ code: 'county-drift.filing', severity: 'advisory', authoritative: 'Pinellas' }),
      expect.objectContaining({ code: 'county-drift.attorney', severity: 'advisory', authoritative: 'Pinellas' }),
    ]);
  });
  test('accepts matching values and ignores a case without a county', () => {
    resolveCase.mockReturnValue({ county: 'Pinellas' });
    expect(countyDriftWarnings({ caseId: 'case-1', county: ' pinellas ', attorney_county: 'PINELLAS' })).toEqual([]);
    resolveCase.mockReturnValue({ county: '' });
    expect(countyDriftWarnings({ caseId: 'case-1', county: 'Pasco' })).toEqual([]);
  });
});
