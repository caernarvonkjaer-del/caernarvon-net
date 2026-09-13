import { describe, expect, test } from 'vitest';
import {
  collectActiveSupplementalFiles,
  getSupplementalFilingIssues,
  isFilingEligibleSupplement,
  resolveActiveDocPeriod,
  SUPPLEMENTAL_PDF_LIMITS,
} from '../../src/core/pdf/supplemental-pdf.js';

const PDF_DATA_URL = 'data:application/pdf;base64,JVBERi0xLjQK';

function eligibleFile(overrides = {}) {
  return {
    id: 'supplement-test',
    name: 'support.pdf',
    type: 'application/pdf',
    size: 9,
    dataUrl: PDF_DATA_URL,
    contentDigest: 'sha256-test',
    pageCount: 1,
    technicalStatus: 'ready',
    technicalWarnings: [],
    ...overrides,
  };
}

describe('resolveActiveDocPeriod', () => {
  test('resolves activeYearKey when present (multi-year inventory)', () => {
    expect(resolveActiveDocPeriod({ activeYearKey: 'Year 2' })).toBe('Year 2');
  });

  test('resolves periodFrom__periodTo for accounting forms', () => {
    expect(resolveActiveDocPeriod({ periodFrom: '2026-07-10', periodTo: '2027-07-09' })).toBe('2026-07-10__2027-07-09');
  });

  test('falls back to initial when neither is set or input is empty', () => {
    expect(resolveActiveDocPeriod({})).toBe('initial');
    expect(resolveActiveDocPeriod(null)).toBe('initial');
  });
});

describe('supplemental PDF filing eligibility', () => {
  test('accepts a ready PDF record after technical checks pass', () => {
    expect(isFilingEligibleSupplement(eligibleFile()).eligible).toBe(true);
  });

  test('rejects legacy dataUrl-only records until technical checks pass', () => {
    const result = isFilingEligibleSupplement({
      name: 'legacy.pdf',
      type: 'application/pdf',
      size: 9,
      dataUrl: PDF_DATA_URL,
    });

    expect(result).toMatchObject({
      eligible: false,
      code: 'not-ready',
    });
  });

  test('accepts warning-state PDFs with a visible review warning', () => {
    const result = isFilingEligibleSupplement(eligibleFile({
      technicalStatus: 'warning',
      technicalWarnings: ['No extractable text was found.'],
    }));

    expect(result).toMatchObject({
      eligible: true,
      code: 'eligible',
    });
  });

  test('rejects non-PDF bytes even when the file extension is misleading', () => {
    const result = isFilingEligibleSupplement(eligibleFile({
      name: 'fake.pdf',
      dataUrl: 'data:application/pdf;base64,SGVsbG8=',
    }));

    expect(result).toMatchObject({
      eligible: false,
      code: 'not-pdf',
    });
  });

  test('reports aggregate active-period supplemental issues as typed non-bypassable issues', () => {
    const issues = getSupplementalFilingIssues({
      activeYearKey: 'initial',
      scheduleDocs: {
        b1: {
          initial: {
            files: [
              eligibleFile({ id: 'ok' }),
              eligibleFile({
                id: 'too-many-pages',
                name: 'huge.pdf',
                pageCount: SUPPLEMENTAL_PDF_LIMITS.maxFilePages + 1,
              }),
            ],
          },
        },
      },
    });

    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({
      code: 'supplemental.page-limit',
      category: 'supplemental',
      bypassable: false,
      capabilities: ['preview', 'print', 'pdf'],
      message: 'huge.pdf has an invalid or over-limit page count.',
    });
    expect(String(issues[0])).toBe('huge.pdf has an invalid or over-limit page count.');
    expect(issues.map(String)).toEqual(['huge.pdf has an invalid or over-limit page count.']);
  });

  test('reports aggregate over-bytes and over-pages issues', () => {
    const issues = getSupplementalFilingIssues({
      activeYearKey: 'initial',
      scheduleDocs: {
        b1: {
          initial: {
            files: [
              eligibleFile({ id: 'file1', size: 14 * 1024 * 1024 }),
              eligibleFile({ id: 'file2', size: 14 * 1024 * 1024 }),
              eligibleFile({ id: 'file3', size: 14 * 1024 * 1024 }),
            ],
          },
        },
      },
    });

    const bytesIssue = issues.find(i => i.code === 'supplemental.total-bytes');
    expect(bytesIssue).toBeDefined();
    expect(bytesIssue.bypassable).toBe(false);
    expect(bytesIssue.category).toBe('supplemental');
    expect(bytesIssue.capabilities).toEqual(['preview', 'print', 'pdf']);
  });

  test('collects supplemental files keyed by accounting period for Annual/Trust accountings', () => {
    const sourceData = {
      periodFrom: '2026-07-10',
      periodTo: '2027-07-09',
      scheduleDocs: {
        schA: {
          '2026-07-10__2027-07-09': {
            files: [eligibleFile({ id: 'schA-current', name: 'current_period_statement.pdf' })],
          },
          '2025-07-10__2026-07-09': {
            files: [eligibleFile({ id: 'schA-prior', name: 'prior_period_statement.pdf' })],
          },
        },
      },
    };

    const files = collectActiveSupplementalFiles(sourceData);
    expect(files).toHaveLength(1);
    expect(files[0].name).toBe('current_period_statement.pdf');
  });
});
