import { describe, expect, test, vi } from 'vitest';
import { withOverrides, autoById } from './support/plan-readiness-parity.js';

// Milestone 37-3 (see MILESTONE-37-PROPOSAL.md): fixture-based proof that
// Plan Simplified's readiness checklist (planReadinessChecksSimplified()'s
// `auto` collection) agrees with the actual export-blocking path -- the same
// validator + prepareFilingOutput() call pagePrintPlanSimplified() uses, not
// an isolated validator call. Pilot for the four-Plan-type reconciliation;
// Initial/Annual/Minor follow the same pattern once this one is reviewed.
//
// Only the PDF/DOCX generation and preview modules are stubbed -- they are
// never invoked by planReadinessChecksSimplified() or the validation path
// under test. validatePlanSimplified(), prepareFilingOutput(),
// getSupplementalFilingIssues(), and county-guidance.js all run for real.
global.window = {
  esc: (s) => s || '',
  ic: () => '',
  inpS: () => '',
  countyInputS: () => '',
  pageNavS: () => '',
  renderScheduleDocsSection: () => '',
  txtP: () => '',
  chkP: () => '',
  yesNoCheckboxS: () => '',
  formatName: (s) => s,
  formatPhone: (s) => s,
  formatAddress: (s) => s,
  formatDisplayDate: (s) => s,
  highlightErrors: () => {},
  validationPanel: () => '',
  planReadinessPanel: () => '',
  renderPage: () => {},
  ...(global.window || {}),
};

vi.mock('../../src/features/plan-simplified/pdf-model.js', () => ({ buildPlanSimplifiedModel: vi.fn() }));
vi.mock('../../src/core/pdf/pdf-engine.js', () => ({ generateCourtFormPdf: vi.fn() }));
vi.mock('../../src/core/pdf/pdf-finalizer.js', () => ({ finalizeCourtFormPdf: vi.fn(), saveFinalizedPdf: vi.fn() }));
vi.mock('../../src/core/docx/docx-engine.js', () => ({ generateCourtFormDocx: vi.fn(), saveFinalizedDocx: vi.fn() }));
vi.mock('../../src/core/pdf/pdf-preview.js', () => ({ mountPdfPreview: vi.fn(), printGeneratedPdf: vi.fn() }));
vi.mock('../../src/core/filing/output-advisories.js', () => ({ renderOutputAdvisories: vi.fn(() => '') }));

const { planReadinessChecksSimplified } = await import('../../src/features/plan-simplified/print.js');
const { validatePlanSimplified } = await import('../../src/features/plan-simplified/index.js');
const { prepareFilingOutput } = await import('../../src/core/filing/output-preflight.js');
const { getSupplementalFilingIssues } = await import('../../src/core/pdf/supplemental-pdf.js');

// Mirrors pagePrintPlanSimplified()'s own preflight call exactly (print.js),
// so this suite proves the real export-blocking path, not a stand-in for it.
function runPreflight(d) {
  window.D = d;
  return prepareFilingOutput(d, () => [...validatePlanSimplified(), ...getSupplementalFilingIssues(d)]);
}

function readiness(d) {
  window.D = d;
  return planReadinessChecksSimplified();
}

const BASELINE = Object.freeze({
  inventoryType: 'planSimplified',
  wardName: 'Jordan Rivera',
  caseNumber: '25-001234-GD',
  county: 'Orange',
  periodFrom: '2025-01-01',
  periodTo: '2025-12-31',
  q1Residences: 'Resided at the family home in Orlando throughout the reporting period.',
  q2BestPlacement: 'The home setting best supports independence with family involvement nearby.',
  q3MedicalTreatment: 'Saw Dr. Alvarez for a check-up in March and a follow-up in September.',
  q4Diagnosis: 'Diagnosed with moderate intellectual disability; continuing need for a guardian.',
  q5SocialServices: 'Attends a weekly community day program and receives in-home support services.',
  q6Interaction: 'Interacts warmly with family and program peers; communicates needs clearly.',
  q7RestoreRights: 'No',
  q8None: true,
  q9Remuneration: 'No',
  planGuardians: [{
    name: 'Pat Rivera',
    signatureDate: '2026-01-15',
    email: 'pat.rivera@example.com',
    phone: '727-555-0100',
    mailingAddress: '123 Main St, Clearwater, FL 33755',
  }],
});

const ALL_AUTO_IDS = [
  'cover.period', 'cover.wardCaseCounty', 'signatures.guardian1.core', 'signatures.guardian1.contact',
  'plan.q1', 'plan.q2', 'plan.q3', 'plan.q4', 'plan.q5', 'plan.q6', 'plan.q7', 'plan.q8', 'plan.q9',
];

describe('Plan Simplified readiness baseline', () => {
  test('every auto condition is true and the real export path has zero blocking issues', () => {
    const { auto } = readiness(structuredClone(BASELINE));
    for (const item of auto) expect(item.ok, `${item.id} (${item.label})`).toBe(true);
    expect(auto.map((a) => a.id).sort()).toEqual([...ALL_AUTO_IDS].sort());

    const preflight = runPreflight(structuredClone(BASELINE));
    expect(preflight.messages).toEqual([]);
    expect(preflight.canExport).toBe(true);
  });
});

// One entry per readiness condition's constituent validator-required field:
// blanking that field alone must flip exactly that auto id false and produce
// exactly the mapped export-validation message, with every other auto
// condition still true. `autoStaysTrue` marks the four conditional-subfield
// cases (Milestone 35-4's contract point 3 nuance): the primary question has
// an answer, so its auto item is correctly still true, but a dependent
// explanation/consistency field the validator also requires is missing --
// these are not separate readiness rows because they are a secondary
// property of an already-represented question, not an unmapped one like
// county/Q2/Q5/Q6 were.
const CASES = [
  { autoId: 'cover.period', override: { periodFrom: '' }, message: 'Cover — Reporting Period From is required' },
  { autoId: 'cover.period', override: { periodTo: '' }, message: 'Cover — Reporting Period To is required' },
  { autoId: 'cover.wardCaseCounty', override: { wardName: '' }, message: 'Cover — Name of Ward is required' },
  { autoId: 'cover.wardCaseCounty', override: { caseNumber: '' }, message: 'Cover — Case Number is required' },
  { autoId: 'cover.wardCaseCounty', override: { county: '' }, message: 'Cover — County is required' },
  { autoId: 'signatures.guardian1.core', override: { 'planGuardians.0.name': '' }, message: 'Signatures — Guardian 1 printed name is required' },
  // Milestone 39-B: blanking signatureDate alone no longer blocks by
  // itself -- with no explicit signatureState, inferLegacySignatureState()
  // reads a blank date as Unsigned (a fully valid choice). Explicitly
  // selecting "/s/" Signed is what makes a blank date a real blocker now;
  // see the dedicated tri-state tests below for the Unsigned-passes case.
  {
    autoId: 'signatures.guardian1.core',
    override: { 'planGuardians.0.signatureState': 'typed', 'planGuardians.0.signatureDate': '' },
    message: 'Signatures — Guardian 1 date signed is required to apply "/s/" Signed',
  },
  { autoId: 'signatures.guardian1.contact', override: { 'planGuardians.0.email': '' }, message: 'Signatures — Guardian 1 email is required' },
  { autoId: 'signatures.guardian1.contact', override: { 'planGuardians.0.phone': '' }, message: 'Signatures — Guardian 1 phone is required' },
  { autoId: 'signatures.guardian1.contact', override: { 'planGuardians.0.mailingAddress': '' }, message: 'Signatures — Guardian 1 mailing address is required' },
  { autoId: 'plan.q1', override: { q1Residences: '' }, message: 'The Plan — Question 1 (places resided) is required' },
  { autoId: 'plan.q2', override: { q2BestPlacement: '' }, message: 'The Plan — Question 2 (why this placement) is required' },
  { autoId: 'plan.q3', override: { q3MedicalTreatment: '' }, message: 'The Plan — Question 3 (medical treatment) is required' },
  { autoId: 'plan.q4', override: { q4Diagnosis: '' }, message: 'The Plan — Question 4 (diagnosis and conditions) is required' },
  { autoId: 'plan.q5', override: { q5SocialServices: '' }, message: 'The Plan — Question 5 (personal and social services) is required' },
  { autoId: 'plan.q6', override: { q6Interaction: '' }, message: 'The Plan — Question 6 (interaction with others) is required' },
  { autoId: 'plan.q7', override: { q7RestoreRights: '' }, message: 'The Plan — Question 7 (restore rights) must be answered' },
  { autoId: 'plan.q8', override: { q8None: false }, message: 'The Plan — Question 8 (advance directives) must have at least one box checked, or NONE' },
  { autoId: 'plan.q9', override: { q9Remuneration: '' }, message: 'The Plan — Question 9 (remuneration) must be answered' },

  {
    autoId: 'plan.q7', autoStaysTrue: true,
    override: { q7RestoreRights: 'Yes', q7RestoreExplain: '' },
    message: 'The Plan — Question 7 explanation is required when rights should be restored',
  },
  {
    autoId: 'plan.q8', autoStaysTrue: true,
    override: { q8None: false, q8Other: true, q8OtherText: '' },
    message: 'The Plan — Question 8 requires a description when "Other Advance Directive" is checked',
  },
  {
    autoId: 'plan.q8', autoStaysTrue: true,
    override: { q8None: true, q8DNR: true },
    message: 'The Plan — Question 8 cannot be NONE and also list directives',
  },
  {
    autoId: 'plan.q9', autoStaysTrue: true,
    override: { q9Remuneration: 'Yes', q9RemunerationExplain: '' },
    message: 'The Plan — Question 9 explanation is required when payment was received',
  },
];

describe('Plan Simplified readiness/export parity', () => {
  test.each(CASES)('$autoId: $message', ({ autoId, override, message, autoStaysTrue }) => {
    const fixture = withOverrides(BASELINE, override);

    const { auto } = readiness(fixture);
    expect(autoById(auto, autoId).ok).toBe(!!autoStaysTrue);
    for (const other of auto) {
      if (other.id === autoId) continue;
      expect(other.ok, `unrelated condition ${other.id} should remain true`).toBe(true);
    }

    const preflight = runPreflight(fixture);
    expect(preflight.messages).toEqual([message]);
    expect(preflight.canExport).toBe(false);
  });
});

// Milestone 39-B: the three-state signature control's own dedicated parity
// coverage -- readiness and the real export path must agree here too, the
// same discipline as every other condition in this suite.
describe('Plan Simplified: Milestone 39-B tri-state signature parity', () => {
  test('Guardian explicitly Unsigned validates and exports cleanly, with no signature fields filled', () => {
    const fixture = withOverrides(BASELINE, {
      'planGuardians.0.signatureState': 'none',
      'planGuardians.0.signatureDate': '',
    });
    const { auto } = readiness(fixture);
    expect(autoById(auto, 'signatures.guardian1.core').ok).toBe(true);

    const preflight = runPreflight(fixture);
    expect(preflight.messages).toEqual([]);
    expect(preflight.canExport).toBe(true);
  });

  test('Guardian with Signature Stamp selected but no image blocks with a distinct message', () => {
    const fixture = withOverrides(BASELINE, {
      'planGuardians.0.signatureState': 'stamp',
      'planGuardians.0.signatureDate': '',
      'planGuardians.0.signatureImage': '',
    });
    const { auto } = readiness(fixture);
    expect(autoById(auto, 'signatures.guardian1.core').ok).toBe(false);

    const preflight = runPreflight(fixture);
    expect(preflight.messages).toEqual(['Signatures — Guardian 1 signature stamp image is required']);
    expect(preflight.canExport).toBe(false);
  });

  test('Guardian with Signature Stamp applied (image present) validates and exports cleanly', () => {
    const fixture = withOverrides(BASELINE, {
      'planGuardians.0.signatureState': 'stamp',
      'planGuardians.0.signatureDate': '',
      'planGuardians.0.signatureImage': 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
    });
    const { auto } = readiness(fixture);
    expect(autoById(auto, 'signatures.guardian1.core').ok).toBe(true);

    const preflight = runPreflight(fixture);
    expect(preflight.messages).toEqual([]);
    expect(preflight.canExport).toBe(true);
  });
});
