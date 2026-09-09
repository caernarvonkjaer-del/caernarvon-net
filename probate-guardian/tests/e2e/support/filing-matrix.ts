// Milestone 31, Phase 1: a single, test-owned declaration of what each of
// the app's nine filing types actually supports. This is test metadata, not
// a second product filing descriptor -- it exists so a missing test can be
// told apart from an intentionally unsupported capability. Every field below
// was verified directly against the current codebase (route lists from each
// feature module's own page switch statement; export capabilities from
// which modules actually have excel.js / wire up doSaveDocx*), not assumed.
export type FilingType =
  | 'guardian'
  | 'simplified'
  | 'annual'
  | 'finalAccounting'
  | 'trustAccounting'
  | 'planSimplified'
  | 'planAnnual'
  | 'planInitial'
  | 'planMinor';

export type FilingCapabilities = {
  id: FilingType;
  family: 'inventory' | 'accounting' | 'plan';
  /** Matches INVENTORY_TYPES[id].label in src/legacy-app.js. */
  displayName: string;
  /**
   * The authoritative document title this filing type's output should
   * carry -- verified byte-for-byte against
   * src/core/filing/filing-descriptor.js's DESCRIPTORS[id].documentTitle
   * (the actual PDF/DOCX metadata.title/formName source), not derived from
   * displayName. Milestone 25 (commit 32626d3, landed before this matrix
   * was corrected) is what makes finalAccounting/trustAccounting emit their
   * own distinct title instead of Annual's; Milestone 33's filing-identity
   * contract proves it against the real generated artifact.
   */
  documentTitle: string;
  /** Every route this filing type's feature module mounts, verified against
   * its page switch statement, in the order declared there. */
  routeSet: readonly string[];
  exports: { pdf: boolean; docx: boolean; xlsx: boolean };
  preview: boolean;
  supplementalDocuments: boolean;
  /** True only for filing types that share Annual's form code but require
   * their own distinct legal wording/output identity (Final, Trust). */
  needsDistinctLegalCopy: boolean;
};

const GUARDIAN_ROUTES = [
  '/', '/summary',
  '/a1', '/a2',
  '/b1', '/b2', '/b3', '/b4',
  '/c1', '/c2', '/c3', '/c4', '/c5',
  '/d1', '/d2', '/d3', '/d4', '/d5',
  '/print',
] as const;

const ANNUAL_ROUTES = [
  '/', '/summary', '/p2', '/p3', '/p4', '/p5',
  '/scha', '/schb1', '/schb2', '/schb3', '/schb4', '/schc',
  '/schd1', '/schd2', '/schd3', '/schd4', '/schd5', '/sche',
  '/schf1', '/schf2', '/p67', '/p8', '/p9', '/p10', '/p11',
  '/print',
] as const;

const SIMPLIFIED_ROUTES = ['/', '/summary', '/p2', '/p3', '/p4', '/p5', '/p6', '/p7', '/print'] as const;
const PLAN_SIMPLIFIED_ROUTES = ['/', '/summary', '/p2', '/p3', '/print'] as const;
const PLAN_ANNUAL_ROUTES = ['/', '/summary', '/p2', '/p3', '/p4', '/p5', '/p6', '/p7', '/p8', '/p9', '/p10', '/p11', '/print'] as const;
const PLAN_INITIAL_ROUTES = ['/', '/summary', '/p2', '/p3', '/p4', '/p5', '/p6', '/p7', '/p8', '/p9', '/p10', '/print'] as const;
const PLAN_MINOR_ROUTES = ['/', '/summary', '/p2', '/p3', '/p4', '/p5', '/p6', '/p7', '/print'] as const;

// PDF and DOCX are wired for all nine (docx via the shared
// src/core/docx/docx-engine.js, present in every feature's index.js). XLSX
// (excel.js) exists only for guardian/annual/simplified -- Final and Trust
// inherit it from annual-accounting's shared module since they run the same
// code; the four Plan types have no excel.js at all. Supplemental-document
// bundling (src/core/pdf/supplemental-pdf.js) is referenced by every
// feature's print.js -- universal, confirmed by direct inspection.
export const FILING_MATRIX: readonly FilingCapabilities[] = [
  {
    id: 'guardian', family: 'inventory',
    displayName: 'Verified Initial Inventory', documentTitle: 'VERIFIED INITIAL INVENTORY',
    routeSet: GUARDIAN_ROUTES, exports: { pdf: true, docx: true, xlsx: true },
    preview: true, supplementalDocuments: true, needsDistinctLegalCopy: false,
  },
  {
    id: 'simplified', family: 'accounting',
    displayName: 'Simplified Annual Accounting', documentTitle: 'SIMPLIFIED ANNUAL ACCOUNTING',
    routeSet: SIMPLIFIED_ROUTES, exports: { pdf: true, docx: true, xlsx: true },
    preview: true, supplementalDocuments: true, needsDistinctLegalCopy: false,
  },
  {
    id: 'annual', family: 'accounting',
    displayName: 'Annual Accounting', documentTitle: 'ANNUAL GUARDIANSHIP ACCOUNTING',
    routeSet: ANNUAL_ROUTES, exports: { pdf: true, docx: true, xlsx: true },
    preview: true, supplementalDocuments: true, needsDistinctLegalCopy: false,
  },
  {
    id: 'finalAccounting', family: 'accounting',
    displayName: 'Final Accounting', documentTitle: 'FINAL GUARDIANSHIP ACCOUNTING',
    routeSet: ANNUAL_ROUTES, exports: { pdf: true, docx: true, xlsx: true },
    preview: true, supplementalDocuments: true, needsDistinctLegalCopy: true,
  },
  {
    id: 'trustAccounting', family: 'accounting',
    displayName: 'Trust Accounting', documentTitle: 'TRUST GUARDIANSHIP ACCOUNTING',
    routeSet: ANNUAL_ROUTES, exports: { pdf: true, docx: true, xlsx: true },
    preview: true, supplementalDocuments: true, needsDistinctLegalCopy: true,
  },
  {
    id: 'planSimplified', family: 'plan',
    displayName: 'Simplified Annual Plan', documentTitle: 'SIMPLIFIED ANNUAL PLAN',
    routeSet: PLAN_SIMPLIFIED_ROUTES, exports: { pdf: true, docx: true, xlsx: false },
    preview: true, supplementalDocuments: true, needsDistinctLegalCopy: false,
  },
  {
    id: 'planAnnual', family: 'plan',
    displayName: 'Annual Guardianship Plan', documentTitle: 'ANNUAL GUARDIANSHIP PLAN',
    routeSet: PLAN_ANNUAL_ROUTES, exports: { pdf: true, docx: true, xlsx: false },
    preview: true, supplementalDocuments: true, needsDistinctLegalCopy: false,
  },
  {
    id: 'planInitial', family: 'plan',
    displayName: 'Initial Guardianship Plan', documentTitle: 'INITIAL GUARDIANSHIP PLAN',
    routeSet: PLAN_INITIAL_ROUTES, exports: { pdf: true, docx: true, xlsx: false },
    preview: true, supplementalDocuments: true, needsDistinctLegalCopy: false,
  },
  {
    id: 'planMinor', family: 'plan',
    displayName: 'Annual Plan — Minors', documentTitle: 'ANNUAL GUARDIANSHIP PLAN - MINOR',
    routeSet: PLAN_MINOR_ROUTES, exports: { pdf: true, docx: true, xlsx: false },
    preview: true, supplementalDocuments: true, needsDistinctLegalCopy: false,
  },
];

export function filingCapabilities(id: FilingType): FilingCapabilities {
  const entry = FILING_MATRIX.find((f) => f.id === id);
  if (!entry) throw new Error(`No filing-matrix entry for ${id}`);
  return entry;
}

/**
 * Milestone 33, Phase 3.3: Authoritative expected PDF Info metadata.title string
 * constructed from descriptor properties, eliminating duplicated literals.
 */
export function expectedPdfMetadataTitle(
  id: FilingType,
  wardName: string,
  caseNumber: string,
  printDate?: string
): string {
  const cap = filingCapabilities(id);
  if (cap.family === 'plan') {
    return `${wardName} - ${caseNumber} - ${cap.displayName}`;
  }
  const dateStr = printDate || '2026-09-03';
  // Guardian uses outputName "Verified Initial Inventory", which matches its displayName
  return `${wardName} - ${caseNumber} - ${cap.displayName} - Printed ${dateStr}`;
}

export type ExpectedLegalCopy = {
  requiredHeadings: string[];
  requiredStatements: string[];
  prohibitedStatements?: string[];
};

/**
 * Milestone 33, Phase 3.2: Authoritative legal attestation and heading expectations
 * asserting document meaning across PDF and DOCX outputs.
 */
export function expectedLegalCopy(id: FilingType): ExpectedLegalCopy {
  switch (id) {
    case 'annual':
      return {
        requiredHeadings: ['Part III', 'Part IV', 'Part V'],
        requiredStatements: [
          'accompanying Annual Accounting of assets and liabilities',
          'filing of the annual accounting of the Guardian',
          "it constitutes a full and correct account of all the ward's property",
        ],
      };
    case 'finalAccounting':
      return {
        requiredHeadings: ['Part III', 'Part IV', 'Part V'],
        requiredStatements: [
          'accompanying Final Accounting of assets and liabilities',
          'filing of the final accounting of the Guardian',
          "it constitutes a full and correct account of all the ward's property",
        ],
        prohibitedStatements: [
          'accompanying Annual Accounting of assets and liabilities',
          'filing of the annual accounting of the Guardian',
        ],
      };
    case 'trustAccounting':
      return {
        requiredHeadings: ['Part III', 'Part IV', 'Part V'],
        requiredStatements: [
          'accompanying Trust Accounting of assets and liabilities',
          'filing of the trust accounting of the Guardian',
          "it constitutes a full and correct account of all the ward's property",
        ],
        prohibitedStatements: [
          'accompanying Annual Accounting of assets and liabilities',
          'filing of the annual accounting of the Guardian',
        ],
      };
    case 'simplified':
      return {
        requiredHeadings: ['Part III', 'Part IV'],
        requiredStatements: [
          "it constitutes a full and correct account of all the ward's property of which this guardian has control",
        ],
      };
    case 'guardian':
      return {
        requiredHeadings: ['ATTESTATIONS & OATHS OF GUARDIAN & PREPARER', 'ATTORNEY ATTESTATION'],
        requiredStatements: [
          'Under penalties of perjury, I declare that I have read the foregoing Verified Initial Inventory',
        ],
      };
    case 'planAnnual':
      return {
        requiredHeadings: ['Annual Guardianship Plan'],
        requiredStatements: [
          'UNDER PENALTIES OF PERJURY, I declare that I have read and examined the foregoing plan',
        ],
      };
    case 'planInitial':
      return {
        requiredHeadings: ['Initial Guardianship Plan'],
        requiredStatements: [
          'UNDER PENALTIES OF PERJURY, I declare that I have read and examined the foregoing plan',
        ],
      };
    case 'planMinor':
      return {
        requiredHeadings: ['Annual Guardianship Plan', 'Minor'],
        requiredStatements: [
          'UNDER PENALTIES OF PERJURY, I declare that I have read and examined the foregoing plan',
        ],
      };
    case 'planSimplified':
      return {
        requiredHeadings: ['Simplified Annual Plan'],
        requiredStatements: [
          'Under penalty of perjury, I declare that I have read the foregoing and the facts alleged are true',
        ],
      };
  }
}
