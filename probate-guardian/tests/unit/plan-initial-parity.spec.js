import { describe, expect, test, vi } from 'vitest';
import { withOverrides, autoById } from './support/plan-readiness-parity.js';

// Milestone 37-3 (see MILESTONE-37-PROPOSAL.md): fixture-based proof that
// Plan Initial's readiness checklist agrees with the actual export-blocking
// path, same pattern as the Plan Simplified pilot
// (plan-simplified-parity.spec.js). Scope note: this suite covers every
// mapped auto condition's primary required-field failure (the contract's
// core: auto.ok===false iff its mapped validator predicate fails), but
// skips the secondary "explain when Other/Yes/No" conditional fixtures the
// Simplified pilot demonstrated a sample of -- 19 conditions here already
// means 30 primary fixtures; adding every conditional sub-case would roughly
// double that for marginal proof value beyond what the pilot established.
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
  INITIAL_ADLS: [
    ['lightHousekeeping', 'Light Housekeeping'], ['medication', 'Administration of Medication'],
    ['managingMoney', 'Managing Money'], ['bathing', 'Bathing'],
    ['prepareMeals', 'Prepare Meals'], ['stairs', 'Climbing Stairs'],
    ['shopping', 'Shopping'], ['laundry', 'Doing Laundry'],
    ['toileting', 'Toileting'], ['dressing', 'Dressing'],
    ['transferring', 'Transferring (from wheelchair to chair/bed)'], ['eating', 'Eating'],
    ['walking', 'Walking / Mobility'], ['grooming', 'Grooming'],
    ['heavyChores', 'Heavy Chores'],
  ],
  highlightErrors: () => {},
  validationPanel: () => '',
  planReadinessPanel: () => '',
  renderPage: () => {},
  ...(global.window || {}),
};

vi.mock('../../src/features/plan-initial/pdf-model.js', () => ({ buildPlanInitialModel: vi.fn() }));
vi.mock('../../src/core/pdf/pdf-engine.js', () => ({ generateCourtFormPdf: vi.fn() }));
vi.mock('../../src/core/pdf/pdf-finalizer.js', () => ({ finalizeCourtFormPdf: vi.fn(), saveFinalizedPdf: vi.fn() }));
vi.mock('../../src/core/docx/docx-engine.js', () => ({ generateCourtFormDocx: vi.fn(), saveFinalizedDocx: vi.fn() }));
vi.mock('../../src/core/pdf/pdf-preview.js', () => ({ mountPdfPreview: vi.fn(), printGeneratedPdf: vi.fn() }));
vi.mock('../../src/core/filing/output-advisories.js', () => ({ renderOutputAdvisories: vi.fn(() => '') }));

const { planReadinessChecksInitial } = await import('../../src/features/plan-initial/print.js');
const { validatePlanInitial } = await import('../../src/features/plan-initial/index.js');
const { prepareFilingOutput } = await import('../../src/core/filing/output-preflight.js');
const { getSupplementalFilingIssues } = await import('../../src/core/pdf/supplemental-pdf.js');

function runPreflight(d) {
  window.D = d;
  return prepareFilingOutput(d, () => [...validatePlanInitial(), ...getSupplementalFilingIssues(d)]);
}

function readiness(d) {
  window.D = d;
  return planReadinessChecksInitial();
}

const ADL_KEYS = [
  'lightHousekeeping', 'medication', 'managingMoney', 'bathing', 'prepareMeals', 'stairs',
  'shopping', 'laundry', 'toileting', 'dressing', 'transferring', 'eating', 'walking', 'grooming', 'heavyChores',
];

const BASELINE = Object.freeze({
  inventoryType: 'planInitial',
  wardName: 'Jordan Rivera',
  caseNumber: '25-001234-GD',
  county: 'Orange',
  inceptionDate: '2025-06-01',
  lettersSignedDate: '2025-06-01',
  guardianNames: 'Pat Rivera',
  wardLiving: 'Private residence',
  residenceAddress: '456 Oak Ave',
  residenceCityStateZip: 'Orlando, FL 32801',
  q2Setting: 'Family Home',
  q3MedPrimary: true,
  q4Mental: 'Weekly counseling provided by community mental health center',
  q5Personal: 'Family provides personal care assistance',
  q6CareFacility: true,
  q9Providers: [{ name: 'Dr. Alvarez', providerType: 'Primary Care' }],
  adls: Object.fromEntries(ADL_KEYS.map((k) => [k, 'Ward needs no help'])),
  mentalDementia: true,
  physMobility: true,
  usesNone: true,
  needsNone: true,
  q11NoDirectives: true,
  q11Executed: false,
  committeeIncorporated: 'Yes',
  certIncapacitatedNoCopy: true,
  planGuardians: [{
    name: 'Pat Rivera', signatureDate: '2025-06-10',
    street: '123 Main St', phone: '727-555-0100', ssn: '123-45-6789',
  }],
});

const ALL_AUTO_IDS = [
  'cover.wardCaseCounty', 'cover.dates', 'cover.guardianNames', 'signatures.guardian1.core',
  'signatures.guardian1.contact', 'cover.wardResidence', 'plan.q2', 'plan.q3', 'plan.q4', 'plan.q5',
  'plan.q6q7', 'plan.q9providers', 'plan.q10a.adls', 'plan.q10bcd', 'plan.q11needs',
  'plan.q11directives', 'plan.q10f.committee', 'signatures.certifications', 'signatures.attorney',
];

describe('Plan Initial readiness baseline', () => {
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
  { autoId: 'cover.wardCaseCounty', override: { wardName: '' }, message: 'Cover — Name of Ward is required' },
  { autoId: 'cover.wardCaseCounty', override: { caseNumber: '' }, message: 'Cover — Case Number is required' },
  { autoId: 'cover.wardCaseCounty', override: { county: '' }, message: 'Cover — County is required' },
  { autoId: 'cover.dates', override: { inceptionDate: '' }, message: 'Cover — Guardianship Inception Date is required' },
  { autoId: 'cover.dates', override: { lettersSignedDate: '' }, message: 'Cover — Date Letters Were Signed is required' },
  { autoId: 'cover.guardianNames', override: { guardianNames: '' }, message: 'Cover — Guardian Name(s) is required' },
  { autoId: 'signatures.guardian1.core', override: { 'planGuardians.0.name': '' }, message: 'Signatures — Guardian name is required' },
  // Milestone 39-C: blanking signatureDate alone no longer blocks by itself
  // -- see plan-annual-parity.spec.js's identical note.
  {
    autoId: 'signatures.guardian1.core',
    override: { 'planGuardians.0.signatureState': 'typed', 'planGuardians.0.signatureDate': '' },
    message: 'Signatures — Guardian date signed is required to apply "/s/" Signed',
  },
  { autoId: 'signatures.guardian1.contact', override: { 'planGuardians.0.street': '' }, message: 'Signatures — Guardian street address is required' },
  { autoId: 'signatures.guardian1.contact', override: { 'planGuardians.0.phone': '' }, message: 'Signatures — Guardian phone is required' },
  { autoId: 'signatures.guardian1.contact', override: { 'planGuardians.0.ssn': '' }, message: 'Signatures — Guardian SSN/EIN is required' },
  { autoId: 'cover.wardResidence', override: { wardLiving: '' }, message: 'Cover — Where the ward is living is required' },
  { autoId: 'cover.wardResidence', override: { residenceAddress: '' }, message: 'Cover — Address where ward resides is required' },
  { autoId: 'cover.wardResidence', override: { residenceCityStateZip: '' }, message: 'Cover — City/State/ZIP is required' },
  { autoId: 'plan.q2', override: { q2Setting: '' }, message: '2–3. Setting & Medical Care — Best-suited residential setting is required' },
  { autoId: 'plan.q3', override: { q3MedPrimary: false }, message: '2–3. Setting & Medical Care — At least one medical service option is required' },
  { autoId: 'plan.q4', override: { q4Mental: '' }, message: '4–5. Mental Health & Personal Care — Mental health service provision is required' },
  { autoId: 'plan.q5', override: { q5Personal: '' }, message: '4–5. Mental Health & Personal Care — Personal care provision is required' },
  { autoId: 'plan.q6q7', override: { q6CareFacility: false }, message: '6–7. Socialization & Benefits — At least one socialization/recreation option is required' },
  { autoId: 'plan.q9providers', override: { q9Providers: [] }, message: '9. Examining Providers — At least one provider must be listed' },
  { autoId: 'plan.q10a.adls', override: { 'adls.eating': '' }, message: '10A. Daily Living — 1 of 15 activities not yet rated' },
  { autoId: 'plan.q10bcd', override: { mentalDementia: false }, message: '10B–D. Disabilities & Devices — At least one mental disability option is required (or note none apply)' },
  { autoId: 'plan.q10bcd', override: { physMobility: false }, message: '10B–D. Disabilities & Devices — At least one physical disability option is required (or note none apply)' },
  { autoId: 'plan.q10bcd', override: { usesNone: false }, message: '10B–D. Disabilities & Devices — Assistive devices currently used is required (or select None)' },
  { autoId: 'plan.q11needs', override: { needsNone: false }, message: '11. Advance Directives — Assistive devices needed is required (or select None)' },
  { autoId: 'plan.q11directives', override: { q11NoDirectives: false, q11Executed: false }, message: '11. Advance Directives — Select exactly one: no pre-existing directives, or directives were executed' },
  { autoId: 'plan.q10f.committee', override: { committeeIncorporated: '' }, message: '11. Advance Directives — Whether examining-committee recommendations are incorporated is required' },
  { autoId: 'signatures.certifications', override: { certIncapacitatedNoCopy: false }, message: 'Signatures — At least one certification statement must be checked' },
  // Milestone 39-C: typing just a name (no tri-state choice, no date) is no
  // longer "started but incomplete" by itself -- the default/inferred state
  // is Unsigned (name alone doesn't imply a signature method was chosen).
  // Explicitly choosing "/s/" is what makes a blank date a real blocker now.
  {
    autoId: 'signatures.attorney',
    override: { attorney_name: 'Sam Attorney', attorney_signatureState: 'typed', attorney_signatureDate: '' },
    message: 'Attorney Certification — Attorney date signed is required to apply "/s/" Signed',
  },
];

describe('Plan Initial readiness/export parity', () => {
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

// Milestone 39-C: the three-state signature control's own dedicated parity
// coverage on Plan Initial's Guardian and Attorney cards -- same discipline
// as plan-simplified-parity.spec.js's 39-B pilot coverage.
describe('Plan Initial: Milestone 39-C tri-state signature parity', () => {
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
    });
    const { auto } = readiness(fixture);
    expect(autoById(auto, 'signatures.guardian1.core').ok).toBe(false);

    const preflight = runPreflight(fixture);
    expect(preflight.messages).toContain('Signatures — Guardian signature stamp image is required');
    expect(preflight.canExport).toBe(false);
  });

  // Milestone 35-3's pro se/Guardian Advocate exemption must survive the
  // tri-state rollout: a fully blank attorney card still does not block.
  test('Attorney left entirely blank does not block (pro se / Guardian Advocate exemption)', () => {
    const fixture = withOverrides(BASELINE, {});
    const { auto } = readiness(fixture);
    expect(autoById(auto, 'signatures.attorney').ok).toBe(true);

    const preflight = runPreflight(fixture);
    expect(preflight.canExport).toBe(true);
  });

  // Selecting a real signature method with nothing else filled in also
  // counts as "started," even though typing nothing else would not.
  test('Attorney with Signature Stamp selected (no name, no image yet) counts as started and blocks', () => {
    const fixture = withOverrides(BASELINE, {
      attorney_signatureState: 'stamp',
    });
    const { auto } = readiness(fixture);
    expect(autoById(auto, 'signatures.attorney').ok).toBe(false);

    const preflight = runPreflight(fixture);
    expect(preflight.messages).toContain('Attorney Certification — Attorney name is required');
    expect(preflight.messages).toContain('Attorney Certification — Attorney signature stamp image is required');
    expect(preflight.canExport).toBe(false);
  });

  test('Attorney with Signature Stamp applied (name and image present) validates and exports cleanly', () => {
    const fixture = withOverrides(BASELINE, {
      attorney_name: 'Sam Attorney',
      attorney_signatureState: 'stamp',
      attorney_signatureImage: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
    });
    const { auto } = readiness(fixture);
    expect(autoById(auto, 'signatures.attorney').ok).toBe(true);

    const preflight = runPreflight(fixture);
    expect(preflight.canExport).toBe(true);
  });
});
