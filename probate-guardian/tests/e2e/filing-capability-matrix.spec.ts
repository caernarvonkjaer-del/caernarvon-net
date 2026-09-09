import { test, expect } from '@playwright/test';
import { FILING_MATRIX, type FilingType } from './support/filing-matrix';

// Milestone 31, Phase 1.3: audits the matrix's own completeness. This does
// not test the product's real output behavior -- that is Milestone 33's
// job, once its contract groups exist to consume this matrix.

const EXPECTED_IDS: readonly FilingType[] = [
  'guardian', 'simplified', 'annual', 'finalAccounting', 'trustAccounting',
  'planSimplified', 'planAnnual', 'planInitial', 'planMinor',
];

test.describe('Filing capability matrix audit', () => {
  test('all nine filing types are present exactly once', () => {
    const ids = FILING_MATRIX.map((entry) => entry.id);
    expect(new Set(ids).size, 'duplicate id in FILING_MATRIX').toBe(ids.length);
    expect([...ids].sort()).toEqual([...EXPECTED_IDS].sort());
  });

  for (const entry of FILING_MATRIX) {
    test(`${entry.id} declares a route set, one smoke route, and boolean output capabilities`, () => {
      expect(entry.routeSet.length, `${entry.id} must declare at least one route`).toBeGreaterThan(0);
      expect(entry.routeSet, `${entry.id} must include a smoke route ('/')`).toContain('/');

      for (const [format, supported] of Object.entries(entry.exports)) {
        expect(typeof supported, `${entry.id}.exports.${format} must be a boolean, not absent/undefined`).toBe('boolean');
      }
      expect(typeof entry.preview, `${entry.id}.preview must be a boolean`).toBe('boolean');
      expect(typeof entry.supplementalDocuments, `${entry.id}.supplementalDocuments must be a boolean`).toBe('boolean');
      expect(typeof entry.needsDistinctLegalCopy, `${entry.id}.needsDistinctLegalCopy must be a boolean`).toBe('boolean');
    });
  }

  test('Final and Trust are declared distinct from Annual, not implicit aliases', () => {
    const annual = FILING_MATRIX.find((entry) => entry.id === 'annual')!;
    const final = FILING_MATRIX.find((entry) => entry.id === 'finalAccounting')!;
    const trust = FILING_MATRIX.find((entry) => entry.id === 'trustAccounting')!;

    expect(annual.needsDistinctLegalCopy).toBe(false);
    expect(final.needsDistinctLegalCopy).toBe(true);
    expect(trust.needsDistinctLegalCopy).toBe(true);
    expect(final.displayName).not.toBe(annual.displayName);
    expect(trust.displayName).not.toBe(annual.displayName);
  });

  test('XLSX is declared only for the accounting/inventory family, matching which modules actually have excel.js', () => {
    for (const entry of FILING_MATRIX) {
      const expectedXlsx = entry.family !== 'plan';
      expect(entry.exports.xlsx, `${entry.id}.exports.xlsx`).toBe(expectedXlsx);
    }
  });
});
