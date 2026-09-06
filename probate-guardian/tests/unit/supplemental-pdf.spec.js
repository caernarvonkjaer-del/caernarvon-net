import { describe, expect, test } from 'vitest';
import {
  getSupplementalFilingIssues,
  isFilingEligibleSupplement,
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

  test('reports aggregate active-period supplemental issues', () => {
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

    expect(issues).toEqual(['huge.pdf has an invalid or over-limit page count.']);
  });
});
