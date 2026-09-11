import { describe, expect, test, vi } from 'vitest';
import { withOverrides, autoById } from './support/plan-readiness-parity.js';

// Milestone 37-3 (see MILESTONE-37-PROPOSAL.md): fixture-based proof that
// Plan Minor's readiness checklist agrees with the actual export-blocking
// path, same pattern as the Plan Simplified pilot. Scope note: primary
// required-field fixtures only (see plan-initial-parity.spec.js's identical
// note) -- secondary "explain when Other" conditionals are not repeated here.
// This is the fourth and last Plan type for 37-3's reconciliation.
global.window = {
  esc: (s) => s || '',
  ic: () => '',
  inpS: () => '',
  countyInputS: () => '',
  radioP: () => '',
  pageNavS: () => '',
  renderScheduleDocsSection: () => '',
  txtP: () => '',
  chkP: () => '',
  planQ: () => '',
  planCheckGroup: () => '',
  yesNoCheckboxS: () => '',
  formatName: (s) => s,
  formatPhone: (s) => s,
  formatDisplayDate: (s) => s,
  toggleSsnReveal: () => '',
  highlightErrors: () => {},
  validationPanel: () => '',
  planReadinessPanel: () => '',
  renderPage: () => {},
  ...(global.window || {}),
};

vi.mock('../../src/features/plan-minor/pdf-model.js', () => ({ buildPlanMinorModel: vi.fn() }));
vi.mock('../../src/core/pdf/pdf-engine.js', () => ({ generateCourtFormPdf: vi.fn() }));
vi.mock('../../src/core/pdf/pdf-finalizer.js', () => ({ finalizeCourtFormPdf: vi.fn(), saveFinalizedPdf: vi.fn() }));
vi.mock('../../src/core/docx/docx-engine.js', () => ({ generateCourtFormDocx: vi.fn(), saveFinalizedDocx: vi.fn() }));
vi.mock('../../src/core/pdf/pdf-preview.js', () => ({ mountPdfPreview: vi.fn(), printGeneratedPdf: vi.fn() }));
vi.mock('../../src/core/filing/output-advisories.js', () => ({ renderOutputAdvisories: vi.fn(() => '') }));

const { planReadinessChecksMinor } = await import('../../src/features/plan-minor/print.js');
const { validatePlanMinor } = await import('../../src/features/plan-minor/index.js');
const { prepareFilingOutput } = await import('../../src/core/filing/output-preflight.js');
const { getSupplementalFilingIssues } = await import('../../src/core/pdf/supplemental-pdf.js');

function runPreflight(d) {
  window.D = d;
  return prepareFilingOutput(d, () => [...validatePlanMinor(), ...getSupplementalFilingIssues(d)]);
}

function readiness(d) {
  window.D = d;
  return planReadinessChecksMinor();
}

const BASELINE = Object.freeze({
  inventoryType: 'planMinor',
  amendedForm: 'No',
  wardName: 'Casey Rivera',
  county: 'Orange',
  periodFrom: '2025-01-01',
  periodTo: '2025-12-31',
  ucn: '25-001234-GD',
  guardianName: 'Pat Rivera',
  q1ResidenceName: 'Family home',
  q1Street: '456 Oak Ave',
  q3Providers: [{ last: 'Alvarez', first: 'Dana', providerType: 'Pediatrician' }],
  q4Primary: true,
  q5SchoolProgress: 'On grade level in all subjects this year.',
  q5SocialDevelopment: 'Participates actively in classroom and extracurricular activities.',
  q5Communicates: 'Communicates needs clearly with age-appropriate vocabulary.',
  q5Interpersonal: 'Forms positive relationships with peers and adults.',
  q5NoUnmetNeeds: true,
  certIncapacitated: true,
  planGuardians: [{
    name: 'Pat Rivera', signatureDate: '2026-01-15',
    mailingStreet: '123 Main St', phone: '727-555-0100', tin: '123-45-6789',
  }],
});

const ALL_AUTO_IDS = [
  'cover.amendedForm', 'cover.wardCountyPeriod', 'cover.caseNumber', 'cover.guardianName', 'cover.residence',
  'signatures.guardian1.core', 'signatures.guardian1.contact', 'signatures.certifications', 'plan.q4',
  'plan.q5', 'plan.q5e', 'signatures.preparer', 'signatures.attorney', 'plan.q3providers',
];

describe('Plan Minor readiness baseline', () => {
  test('every auto condition is true and the real export path has zero blocking issues', () => {
    const { auto } = readiness(structuredClone(BASELINE));
    for (const item of auto) expect(item.ok, `${item.id} (${item.label})`).toBe(true);
    expect(auto.map((a) => a.id).sort()).toEqual([...ALL_AUTO_IDS].sort());

    const preflight = runPreflight(structuredClone(BASELINE));
    expect(preflight.messages).toEqual([]);
    expect(preflight.canExport).toBe(true);
  });
});

const CASES = [
  { autoId: 'cover.amendedForm', override: { amendedForm: '' }, message: 'Cover — Amended Form? must be answered' },
  { autoId: 'cover.wardCountyPeriod', override: { wardName: '' }, message: "Cover — Minor's Name is required" },
  { autoId: 'cover.wardCountyPeriod', override: { county: '' }, message: 'Cover — County is required' },
  { autoId: 'cover.wardCountyPeriod', override: { periodFrom: '' }, message: 'Cover — Reporting Period From is required' },
  { autoId: 'cover.wardCountyPeriod', override: { periodTo: '' }, message: 'Cover — Reporting Period To is required' },
  { autoId: 'cover.caseNumber', override: { ucn: '' }, message: 'Cover — Case Number is required' },
  { autoId: 'cover.guardianName', override: { guardianName: '' }, message: 'Cover — Guardian Name(s) is required' },
  { autoId: 'cover.residence', override: { q1ResidenceName: '' }, message: 'Cover — Current Residence Name is required' },
  { autoId: 'cover.residence', override: { q1Street: '' }, message: 'Cover — Current Residence Street Address is required' },
  { autoId: 'signatures.guardian1.core', override: { 'planGuardians.0.name': '' }, message: 'Guardian Signatures — Guardian name is required' },
  { autoId: 'signatures.guardian1.core', override: { 'planGuardians.0.signatureDate': '' }, message: 'Guardian Signatures — Guardian signature date is required' },
  { autoId: 'signatures.guardian1.contact', override: { 'planGuardians.0.mailingStreet': '' }, message: 'Guardian Signatures — Guardian mailing street address is required' },
  { autoId: 'signatures.guardian1.contact', override: { 'planGuardians.0.phone': '' }, message: 'Guardian Signatures — Guardian phone is required' },
  { autoId: 'signatures.guardian1.contact', override: { 'planGuardians.0.tin': '' }, message: 'Guardian Signatures — Guardian taxpayer ID is required' },
  { autoId: 'signatures.certifications', override: { certIncapacitated: false }, message: 'Guardian Signatures — At least one certification statement must be checked' },
  { autoId: 'plan.q4', override: { q4Primary: false }, message: '4. Medical Services — At least one medical service option is required' },
  { autoId: 'plan.q5', override: { q5SchoolProgress: '' }, message: '5. Education & Social Development — School progress summary is required' },
  { autoId: 'plan.q5', override: { q5SocialDevelopment: '' }, message: '5. Education & Social Development — Social development description is required' },
  { autoId: 'plan.q5', override: { q5Communicates: '' }, message: '5. Education & Social Development — Communication statement is required' },
  { autoId: 'plan.q5', override: { q5Interpersonal: '' }, message: '5. Education & Social Development — Interpersonal relationships statement is required' },
  { autoId: 'plan.q5e', override: { q5NoUnmetNeeds: false }, message: '5. Education & Social Development — Unmet social needs option is required' },
  {
    autoId: 'signatures.preparer',
    override: { preparer_name: 'Sam Preparer', preparer_signatureDate: '' },
    message: 'Preparer & Attorney — Preparer signature date is required',
  },
  {
    autoId: 'signatures.attorney',
    override: { attorney_name: 'Sam Attorney', attorney_signatureDate: '' },
    message: 'Preparer & Attorney — Attorney signature date is required',
  },
  { autoId: 'plan.q3providers', override: { q3Providers: [] }, message: '3. Treatment Providers — At least one provider must be listed' },
];

describe('Plan Minor readiness/export parity', () => {
  test.each(CASES)('$autoId: $message', ({ autoId, override, message }) => {
    const fixture = withOverrides(BASELINE, override);

    const { auto } = readiness(fixture);
    expect(autoById(auto, autoId).ok).toBe(false);
    for (const other of auto) {
      if (other.id === autoId) continue;
      expect(other.ok, `unrelated condition ${other.id} should remain true`).toBe(true);
    }

    const preflight = runPreflight(fixture);
    expect(preflight.messages).toContain(message);
    expect(preflight.canExport).toBe(false);
  });
});
