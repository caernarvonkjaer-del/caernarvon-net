import { describe, it, expect, beforeAll } from 'vitest';

// Provide browser globals required by legacy feature modules
global.window = {
  esc: (s) => s || '',
  ic: () => '',
  autoSave: () => {},
  navigate: () => {},
  updateNavDots: () => {},
  renderScheduleDocsSection: () => '',
  txtP: () => '',
  chkP: () => '',
  planQ: () => '',
  planCheckGroup: () => '',
  yesNoCheckboxS: () => '',
  radioP: () => '',
  pageNavS: () => '',
  formatName: (s) => s,
  formatPhone: (s) => s,
  formatDisplayDate: (s) => s,
  toggleSsnReveal: () => '',
  INITIAL_ADLS: [],
  INITIAL_ADL_RATINGS: [],
  ANNUAL_ADLS: [],
  ANNUAL_ADL_RATINGS: [],
  calcTotals: () => ({}),
  countyInputS: () => '',
  inpS: () => '',
  ...(global.window || {}),
};

const { validatePlanInitial } = await import('../../src/features/plan-initial/index.js');
const { validatePlanAnnual } = await import('../../src/features/plan-annual/index.js');
const { validatePlanSimplified } = await import('../../src/features/plan-simplified/index.js');
const { validatePlanMinor } = await import('../../src/features/plan-minor/index.js');

describe('checklist vs export validator parity', () => {
  describe('Initial Plan Question 10F / pi-p8', () => {
    it('requires committeeIncorporated in validatePlanInitial', () => {
      window.D = {
        wardName: 'Test Ward',
        caseNumber: '25-001234-GD',
        county: 'Pinellas',
        q11NoDirectives: true,
        needsNone: true,
        committeeIncorporated: '',
      };
      const errors = validatePlanInitial();
      expect(errors.some(e => e.includes('Whether examining-committee recommendations are incorporated is required'))).toBe(true);
    });

    it('requires committeeExplain in validatePlanInitial when committeeIncorporated is No', () => {
      window.D = {
        wardName: 'Test Ward',
        caseNumber: '25-001234-GD',
        county: 'Pinellas',
        q11NoDirectives: true,
        needsNone: true,
        committeeIncorporated: 'No',
        committeeExplain: '',
      };
      const errors = validatePlanInitial();
      expect(errors.some(e => e.includes('Explanation is required when recommendations are not incorporated'))).toBe(true);
    });

    it('passes Question 10F in validatePlanInitial when committeeIncorporated is Yes', () => {
      window.D = {
        wardName: 'Test Ward',
        caseNumber: '25-001234-GD',
        county: 'Pinellas',
        q11NoDirectives: true,
        needsNone: true,
        committeeIncorporated: 'Yes',
      };
      const errors = validatePlanInitial();
      expect(errors.some(e => e.includes('recommendations are incorporated'))).toBe(false);
      expect(errors.some(e => e.includes('Explanation is required'))).toBe(false);
    });

    it('passes Question 10F in validatePlanInitial when committeeIncorporated is No with explanation', () => {
      window.D = {
        wardName: 'Test Ward',
        caseNumber: '25-001234-GD',
        county: 'Pinellas',
        q11NoDirectives: true,
        needsNone: true,
        committeeIncorporated: 'No',
        committeeExplain: 'Recommendations reviewed and deferred pending specialist report',
      };
      const errors = validatePlanInitial();
      expect(errors.some(e => e.includes('recommendations are incorporated'))).toBe(false);
      expect(errors.some(e => e.includes('Explanation is required'))).toBe(false);
    });
  });

  describe('Validation functions exported and callable', () => {
    it('exports validation functions for all four plan types', () => {
      expect(typeof validatePlanInitial).toBe('function');
      expect(typeof validatePlanAnnual).toBe('function');
      expect(typeof validatePlanSimplified).toBe('function');
      expect(typeof validatePlanMinor).toBe('function');
    });
  });
});

// ── Cross-cutting guard (Milestone 36-6 item 13) ─────────────────────────
//
// computeNavChecks() in legacy-app.js and each feature's export validator are
// two hand-maintained rule sets over the same data, with nothing keeping them
// in agreement. When the validator requires a field the section check never
// consults, a filer can turn every sidebar marker green and still be refused
// at Print Preview, with nothing on the page saying what is missing.
//
// Reconciling the two is Milestone 35-4's unfinished work and is deliberately
// not attempted here. This test is the deliverable instead: it converts an
// invisible class of bug into a visible list, and fails the moment a new
// divergence is introduced.
describe('checklist and export validator field parity', () => {
  const fs = require('fs');
  const path = require('path');

  // Fields the export validator requires that the section checks never read.
  // Every entry is a real gap, not an exemption -- shrink this list, never
  // grow it, as 35-4 reconciles each filing type.
  const KNOWN_GAPS = {
    planAnnual: ['attorney_signatureDate'],
    planSimplified: ['attorney_signatureDate', 'preparer_signatureDate'],
    planMinor: ['amendedForm', 'amendedVersion', 'preparer_signatureDate', 'ref', 'ucn'],
    planInitial: [],
    annual: [],
  };

  const BRANCH_MARKERS = {
    simplified: "activeInventoryType==='simplified'",
    annual: "formEngine(activeInventoryType)==='annual'",
    planSimplified: "activeInventoryType==='planSimplified'",
    planAnnual: "activeInventoryType==='planAnnual'",
    planInitial: "activeInventoryType==='planInitial'",
    planMinor: "activeInventoryType==='planMinor'",
  };

  const VALIDATORS = {
    planInitial: ['plan-initial', 'export function validatePlanInitial('],
    planAnnual: ['plan-annual', 'export function validatePlanAnnual('],
    planSimplified: ['plan-simplified', 'export function validatePlanSimplified('],
    planMinor: ['plan-minor', 'export function validatePlanMinor('],
    annual: ['annual-accounting', 'export function validateAnnual('],
  };

  const readSrc = (rel) => fs.readFileSync(path.resolve(__dirname, '../../src', rel), 'utf8');

  // Returns the brace-balanced body that follows `header`.
  function sliceFunction(src, header) {
    const start = src.indexOf(header);
    if (start === -1) return '';
    const open = src.indexOf('{', start);
    let depth = 0;
    for (let i = open; i < src.length; i++) {
      if (src[i] === '{') depth++;
      else if (src[i] === '}') { depth--; if (depth === 0) return src.slice(open, i + 1); }
    }
    return '';
  }

  const modelFields = (text) => new Set([...text.matchAll(/\b[dD]\.([A-Za-z_][A-Za-z0-9_]*)/g)].map((m) => m[1]));

  let navFieldsByType;
  beforeAll(() => {
    const nav = sliceFunction(readSrc('legacy-app.js'), 'function computeNavChecks(');
    expect(nav.length).toBeGreaterThan(0);
    const markers = Object.entries(BRANCH_MARKERS)
      .map(([type, marker]) => ({ type, index: nav.indexOf(marker) }))
      .filter((m) => m.index > -1)
      .sort((a, b) => a.index - b.index);
    navFieldsByType = {};
    markers.forEach((mk, n) => {
      const end = n + 1 < markers.length ? markers[n + 1].index : nav.length;
      navFieldsByType[mk.type] = modelFields(nav.slice(mk.index, end));
    });
  });

  for (const [type, [feature, header]] of Object.entries(VALIDATORS)) {
    it(`${type}: export validator requires nothing the section checks ignore, beyond the known gaps`, () => {
      const body = sliceFunction(readSrc(`features/${feature}/index.js`), header);
      expect(body.length, `${header} not found in features/${feature}/index.js`).toBeGreaterThan(0);

      const checklistFields = navFieldsByType[type] || new Set();
      expect(checklistFields.size, `no computeNavChecks branch found for ${type}`).toBeGreaterThan(0);

      const gaps = [...modelFields(body)].filter((f) => !checklistFields.has(f)).sort();
      expect(gaps).toEqual(KNOWN_GAPS[type].slice().sort());
    });
  }
});
