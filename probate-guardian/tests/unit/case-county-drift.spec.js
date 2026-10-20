import { describe, expect, test, vi } from 'vitest';

vi.mock('../../src/core/case-resolver.js', () => ({ resolveCase: vi.fn() }));
import { resolveCase } from '../../src/core/case-resolver.js';
import { countyDriftWarnings } from '../../src/core/case-county-drift.js';

describe('countyDriftWarnings', () => {
  test('compares against the case county and never emits a blocker', () => {
    resolveCase.mockReturnValue({ county: 'Pinellas' });
    expect(countyDriftWarnings({ caseId: 'case-1', county: 'Pasco', attorney_county: 'Hillsborough' })).toEqual([
      expect.objectContaining({ code: 'county-drift.filing', severity: 'advisory', caseCounty: 'Pinellas' }),
    ]);
  });

  // Milestone 40C-A item 4. This advisory used to describe the case-registry
  // county as "authoritative". Under 40C-A it is not: the canonical
  // forward-looking value is the ward PARTY's county, the case record is a
  // passive comparison reference updated only by an explicit Cover edit, and each
  // filing's county is an auditable snapshot. A ward can legitimately move
  // counties, so an older sibling filing's different county is correct history.
  describe('wording no longer claims the case registry wins', () => {
    test('the message frames a mismatch without naming a winner, and says nothing is rewritten', () => {
      resolveCase.mockReturnValue({ county: 'Pinellas' });
      const [filingWarning] = countyDriftWarnings({ caseId: 'case-1', county: 'Pasco' });
      expect(filingWarning.message).toContain('linked case record');
      expect(filingWarning.message).toContain('Both are kept as-is');
      expect(filingWarning.message).not.toMatch(/authoritative/i);
      expect(filingWarning.message).not.toMatch(/\bmust\b/i);
    });

    // Milestone 76H item 3 (decision 76H-8): the attorney's county is shown and
    // printed nowhere, so a mismatch with it is not reported.
    test("the attorney's own county raises nothing", () => {
      resolveCase.mockReturnValue({ county: 'Pinellas' });
      expect(countyDriftWarnings({ caseId: 'case-1', attorney_county: 'Hillsborough' })).toEqual([]);
    });

    test('both values are reported unchanged -- the advisory rewrites nothing', () => {
      resolveCase.mockReturnValue({ county: 'Pinellas' });
      const filing = { caseId: 'case-1', county: 'Pasco', attorney_county: 'Hillsborough' };
      const warnings = countyDriftWarnings(filing);
      expect(warnings.map((w) => w.value)).toEqual(['Pasco']);
      expect(filing.county).toBe('Pasco');
      expect(filing.attorney_county).toBe('Hillsborough');
    });

    test('still exposes `authoritative` for existing callers, as the case value being compared', () => {
      resolveCase.mockReturnValue({ county: 'Pinellas' });
      const [warning] = countyDriftWarnings({ caseId: 'case-1', county: 'Pasco' });
      expect(warning.authoritative).toBe('Pinellas');
      expect(warning.authoritative).toBe(warning.caseCounty);
    });
  });
  test('accepts matching values and ignores a case without a county', () => {
    resolveCase.mockReturnValue({ county: 'Pinellas' });
    expect(countyDriftWarnings({ caseId: 'case-1', county: ' pinellas ', attorney_county: 'PINELLAS' })).toEqual([]);
    resolveCase.mockReturnValue({ county: '' });
    expect(countyDriftWarnings({ caseId: 'case-1', county: 'Pasco' })).toEqual([]);
  });
});
