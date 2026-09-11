import { describe, expect, test, vi } from 'vitest';
import { withOverrides, autoById } from './support/plan-readiness-parity.js';

// Milestone 37-3 (see MILESTONE-37-PROPOSAL.md): fixture-based proof that
// Plan Annual's readiness checklist agrees with the actual export-blocking
// path, same pattern as the Plan Simplified pilot. Scope note: primary
// required-field fixtures only (see plan-initial-parity.spec.js's identical
// note) -- secondary "explain when Other" conditionals are not repeated here.
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
  formatName: (s) => s,
  formatPhone: (s) => s,
  formatSSN: (s) => s,
  formatAddress: (s) => s,
  toggleSsnReveal: () => '',
  formatDisplayDate: (s) => s,
  PLAN_RIGHTS: [
    ['marry', 'Right to marry'], ['vote', 'Right to vote'],
    ['govBenefits', 'Right to personally apply for government benefits'], ['driver', "Right to have a driver's license"],
    ['travel', 'Right to travel'], ['employment', 'Right to seek or retain employment'],
    ['contract', 'Right to contract'], ['sue', 'Right to sue and be sued'],
    ['property', 'Right to manage property or to make any gift or disposition'], ['residence', 'Right to determine residence'],
    ['medical', 'Right to consent to medical treatment'], ['social', 'Right to make decisions about social environment or other aspects of social life'],
  ],
  PLAN_ADLS: [
    ['eating', 'Eating'], ['prepareMeals', 'Prepare meals'],
    ['heavyChores', 'Heavy chores (e.g. vacuuming)'], ['lightHousekeeping', 'Light housekeeping'],
    ['managingMoney', 'Managing money'], ['dressing', 'Dressing'],
    ['transportation', 'Transportation ability'], ['walking', 'Walking / mobility'],
    ['toileting', 'Toileting'], ['stairs', 'Climbing stairs'],
    ['transferring', 'Transferring (wheelchair to chair/bed)'], ['laundry', 'Doing laundry'],
    ['shopping', 'Shopping'], ['bathing', 'Bathing'],
    ['grooming', 'Grooming'], ['medication', 'Administration of medication'],
  ],
  highlightErrors: () => {},
  validationPanel: () => '',
  planReadinessPanel: () => '',
  renderPage: () => {},
  ...(global.window || {}),
};

vi.mock('../../src/features/plan-annual/pdf-model.js', () => ({ buildPlanAnnualModel: vi.fn() }));
vi.mock('../../src/core/pdf/pdf-engine.js', () => ({ generateCourtFormPdf: vi.fn() }));
vi.mock('../../src/core/pdf/pdf-finalizer.js', () => ({ finalizeCourtFormPdf: vi.fn(), saveFinalizedPdf: vi.fn() }));
vi.mock('../../src/core/docx/docx-engine.js', () => ({ generateCourtFormDocx: vi.fn(), saveFinalizedDocx: vi.fn() }));
vi.mock('../../src/core/pdf/pdf-preview.js', () => ({ mountPdfPreview: vi.fn(), printGeneratedPdf: vi.fn() }));
vi.mock('../../src/core/filing/output-advisories.js', () => ({ renderOutputAdvisories: vi.fn(() => '') }));

const { planReadinessChecksAnnual } = await import('../../src/features/plan-annual/print.js');
const { validatePlanAnnual } = await import('../../src/features/plan-annual/index.js');
const { prepareFilingOutput } = await import('../../src/core/filing/output-preflight.js');
const { getSupplementalFilingIssues } = await import('../../src/core/pdf/supplemental-pdf.js');

function runPreflight(d) {
  window.D = d;
  return prepareFilingOutput(d, () => [...validatePlanAnnual(), ...getSupplementalFilingIssues(d)]);
}

function readiness(d) {
  window.D = d;
  return planReadinessChecksAnnual();
}

const RIGHT_KEYS = ['marry', 'vote', 'govBenefits', 'driver', 'travel', 'employment', 'contract', 'sue', 'property', 'residence', 'medical', 'social'];
const ADL_KEYS = ['eating', 'prepareMeals', 'heavyChores', 'lightHousekeeping', 'managingMoney', 'dressing', 'transportation', 'walking', 'toileting', 'stairs', 'transferring', 'laundry', 'shopping', 'bathing', 'grooming', 'medication'];

const BASELINE = Object.freeze({
  inventoryType: 'planAnnual',
  wardName: 'Jordan Rivera',
  caseNumber: '25-001234-GD',
  county: 'Orange',
  gid: '2024-01-01',
  guardian: 'Pat Rivera',
  periodFrom: '2025-01-01',
  periodTo: '2025-12-31',
  wardLiving: 'Private residence',
  residenceAddress: '456 Oak Ave',
  residenceCityStateZip: 'Orlando, FL 32801',
  q1Residences: [{ name: 'Family home', street: '456 Oak Ave', cityStateZip: 'Orlando, FL 32801' }],
  q2NoMove: true,
  q3SettingALF: true,
  q4Providers: [{ name: 'Dr. Alvarez', providerType: 'Primary Care' }],
  q5SocialSkills: 'Participates in weekly community activities',
  q5Activities: 'Attends a day program with capacity-building goals',
  rights: Object.fromEntries(RIGHT_KEYS.map((k) => [k, 'Not removed'])),
  adls: Object.fromEntries(ADL_KEYS.map((k) => [k, 'Ward needs no help'])),
  q9MentalNone: true,
  q9PhysNone: true,
  q10NoDirectives: true,
  q10Executed: false,
  q11NoRemuneration: true,
  q11NoRemunerationName: 'Pat Rivera',
  planGuardians: [{
    name: 'Pat Rivera', signatureDate: '2026-01-15',
    mailingStreet: '123 Main St', phone: '727-555-0100', ssn: '123-45-6789',
  }],
});

const ALL_AUTO_IDS = [
  'cover.period', 'cover.wardCaseGid', 'cover.county', 'cover.guardianName', 'signatures.guardian1.core',
  'signatures.guardian1.contact', 'cover.wardResidence', 'plan.q1residences', 'plan.q2', 'plan.q3',
  'plan.q4providers', 'plan.q5', 'plan.q6rights', 'plan.q8adls', 'plan.q9', 'plan.q10directives', 'plan.q11remuneration',
];

describe('Plan Annual readiness baseline', () => {
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
  { autoId: 'cover.period', override: { periodFrom: '' }, message: 'Cover — Reporting Period From is required' },
  { autoId: 'cover.period', override: { periodTo: '' }, message: 'Cover — Reporting Period To is required' },
  { autoId: 'cover.wardCaseGid', override: { wardName: '' }, message: 'Cover — Name of Ward is required' },
  { autoId: 'cover.wardCaseGid', override: { caseNumber: '' }, message: 'Cover — Case Number is required' },
  { autoId: 'cover.wardCaseGid', override: { gid: '' }, message: 'Cover — Guardianship Inception Date is required' },
  { autoId: 'cover.county', override: { county: '' }, message: 'Cover — County is required' },
  { autoId: 'cover.guardianName', override: { guardian: '' }, message: 'Cover — Guardian Name(s) is required' },
  { autoId: 'signatures.guardian1.core', override: { 'planGuardians.0.name': '' }, message: 'Signatures — Guardian printed name is required' },
  { autoId: 'signatures.guardian1.core', override: { 'planGuardians.0.signatureDate': '' }, message: 'Signatures — Guardian date signed is required' },
  { autoId: 'signatures.guardian1.contact', override: { 'planGuardians.0.mailingStreet': '' }, message: 'Signatures — Guardian mailing street address is required' },
  { autoId: 'signatures.guardian1.contact', override: { 'planGuardians.0.phone': '' }, message: 'Signatures — Guardian phone number is required' },
  { autoId: 'signatures.guardian1.contact', override: { 'planGuardians.0.ssn': '' }, message: 'Signatures — Guardian SSN/EIN is required' },
  { autoId: 'cover.wardResidence', override: { wardLiving: '' }, message: 'Cover — where the ward is living must be answered' },
  { autoId: 'cover.wardResidence', override: { residenceAddress: '' }, message: 'Cover — address where the ward resides is required' },
  { autoId: 'cover.wardResidence', override: { residenceCityStateZip: '' }, message: 'Cover — city/state/ZIP where the ward resides is required' },
  { autoId: 'plan.q1residences', override: { q1Residences: [] }, message: '1. Residences — at least one residence must be listed' },
  { autoId: 'plan.q2', override: { q2NoMove: false }, message: '2–3. Residence & Care — question 2 (address change) must have at least one box checked' },
  { autoId: 'plan.q3', override: { q3SettingALF: false }, message: '2–3. Residence & Care — a best-suited residential setting must be selected' },
  { autoId: 'plan.q4providers', override: { q4Providers: [] }, message: '4. Medical Treatment — at least one provider must be listed' },
  { autoId: 'plan.q5', override: { q5SocialSkills: '' }, message: '5–7. Skills & Rights — question 5 (social skills) is required' },
  { autoId: 'plan.q5', override: { q5Activities: '' }, message: '5–7. Skills & Rights — question 5 (capacity-building activities) is required' },
  { autoId: 'plan.q6rights', override: { 'rights.marry': '' }, message: '5–7. Skills & Rights — 1 right still unanswered in question 6' },
  { autoId: 'plan.q8adls', override: { 'adls.eating': '' }, message: '8. Daily Living — 1 activity is still unrated' },
  { autoId: 'plan.q9', override: { q9MentalNone: false }, message: '9. Disabilities & Devices — mental disabilities must be answered, or "no mental disabilities" checked' },
  { autoId: 'plan.q9', override: { q9PhysNone: false }, message: '9. Disabilities & Devices — physical disabilities must be answered, or "no physical disabilities" checked' },
  { autoId: 'plan.q10directives', override: { q10NoDirectives: false, q10Executed: false }, message: '10. Advance Directives — answer whether directives exist' },
  { autoId: 'plan.q11remuneration', override: { q11NoRemuneration: false }, message: '11. Remuneration — either declare no remuneration, or record what was received' },
];

describe('Plan Annual readiness/export parity', () => {
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
