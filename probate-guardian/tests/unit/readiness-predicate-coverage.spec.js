import { describe, it, expect, beforeEach } from 'vitest';
import { createPlanTestWindowStub } from './support/plan-readiness-parity.js';

// Milestone 38D Phase 2: the predicate -> validator-issue mapping in
// readiness-config.js is what lets the readiness card suppress precisely --
// hiding only the issues a currently-pending predicate row already accounts
// for, instead of 44C's blanket "any predicate pending hides all of this
// filing's own issues". That mapping is hand-written against four validators,
// so it can drift the moment a validator adds a required field or a predicate
// row is renamed. These tests are the ratchet against that.
//
// The mapping's own correctness (which predicate a given field belongs under)
// is proven separately and fixture-by-fixture in tests/unit/plan-*-parity.spec.js;
// this file proves the mapping is COMPLETE, that its predicate ids are REAL,
// and that the suppression it drives behaves as intended.

global.window = { ...createPlanTestWindowStub(), ...(global.window || {}) };

const { getFilingReadiness, PLAN_PREDICATE_ISSUE_PATHS, predicateIdsCoveringIssue } =
  await import('../../src/core/filing/readiness-config.js');
const { createIssue, createRequiredIssue } = await import('../../src/core/validation/issue-registry.js');
const { validatePlanSimplified } = await import('../../src/features/plan-simplified/index.js');
const { validatePlanAnnual } = await import('../../src/features/plan-annual/index.js');
const { validatePlanInitial } = await import('../../src/features/plan-initial/index.js');
const { validatePlanMinor } = await import('../../src/features/plan-minor/index.js');

const VALIDATORS = {
  planSimplified: validatePlanSimplified,
  planAnnual: validatePlanAnnual,
  planInitial: validatePlanInitial,
  planMinor: validatePlanMinor,
};
const PLAN_KEYS = Object.keys(VALIDATORS);

// Audited 2026-09-15: every validator path deliberately left out of the
// mapping, with the reason it is not a predicate row. Each is a *dependent*
// requirement of a question whose own answer already has a predicate (the
// conditional "explain when you said Yes" rules the parity suites record as
// `autoStaysTrue`), or a cross-field rule with no question of its own. These
// surface immediately rather than waiting for unrelated predicates, which is
// the behavior change this milestone is for.
const DELIBERATELY_UNCOVERED = {
  planSimplified: [
    'q7RestoreExplain',      // explanation required only when rights should be restored
    'q8OtherText',           // description required only when "Other" directive is checked
    'q8None',                // NONE-and-also-listed consistency rule
    'preparer_signatureDate', // date-order only; Plan Simplified has no preparer predicate row
    'attorney_signatureDate', // date-order only; no attorney predicate row on this Plan
  ],
  planAnnual: [
    'q3SettingExplain',      // explain the "Other" residential setting
    'q3MedSpecialistArea',   // specialty area, only when a specialist is checked
    'q9MentalExplain',       // explain the "Other" mental disability
    'q9PhysExplain',         // explain the "Other" physical disability
    'q10ExecOtherText',      // describe the "Other" directive
  ],
  planInitial: [
    'q2Explain', 'q3MedSpecialistArea', 'q3MedExplain', 'q4Explain', 'q5Explain', 'q6Explain',
    'mentalExplain', 'physExplain', 'usesExplain', 'needsExplain', 'q11ExecOtherText',
    'committeeExplain',      // explanation when committee recommendations are NOT incorporated
  ],
  planMinor: [
    'amendedVersion',        // version required only when Amended Form? is Yes
    'q4Explain', 'q5Explain',
  ],
};

function predicateIdsFor(key) {
  window.D = {};
  return new Set(getFilingReadiness(key, {}, []).automatic.map((row) => row.id));
}

// Every issue code a validator really emits for the given data.
function codesFrom(key, data) {
  window.D = data;
  return VALIDATORS[key]().map((issue) => issue.code).filter(Boolean);
}

describe('38D Phase 2: Plan predicate -> validator issue coverage', () => {
  beforeEach(() => { window.D = {}; });

  it('covers exactly the four Plan types, and no accounting/inventory filing', () => {
    expect(Object.keys(PLAN_PREDICATE_ISSUE_PATHS).sort()).toEqual([...PLAN_KEYS].sort());
    // A non-Plan filing has no predicate rows at all, so nothing to map.
    expect(predicateIdsCoveringIssue('annual', 'annual.caseNumber.required')).toEqual([]);
  });

  for (const key of PLAN_KEYS) {
    it(`${key}: every mapped predicate id is a real predicate row on that filing`, () => {
      const real = predicateIdsFor(key);
      for (const predicateId of Object.keys(PLAN_PREDICATE_ISSUE_PATHS[key])) {
        expect(real.has(predicateId), `${key}: mapped predicate id "${predicateId}" is not a predicate row (have: ${[...real].join(', ')})`).toBe(true);
      }
    });

    it(`${key}: every unconditionally-required field the real validator emits is covered by a predicate`, () => {
      // Empty data fires exactly the unconditional requirements -- the ones a
      // predicate row is supposed to represent. A new required field added to
      // the validator without a mapping entry fails here.
      const uncovered = [...new Set(codesFrom(key, {}))]
        .filter((code) => predicateIdsCoveringIssue(key, code).length === 0);
      expect(uncovered, `${key}: validator emits these with no predicate covering them`).toEqual([]);
    });

    it(`${key}: the deliberately-uncovered list is honest -- none of it is secretly mapped`, () => {
      for (const path of DELIBERATELY_UNCOVERED[key]) {
        const code = `${key}.${path}.required`;
        expect(predicateIdsCoveringIssue(key, code), `${key}: "${path}" is documented as uncovered but the mapping covers it`).toEqual([]);
      }
    });

    it(`${key}: a pending predicate hides only its own issues, never an unrelated uncovered one`, () => {
      const covered = createRequiredIssue({
        filingType: key, path: Object.values(PLAN_PREDICATE_ISSUE_PATHS[key])[0][0],
        section: 'Cover', message: 'a covered requirement',
      });
      const uncovered = createRequiredIssue({
        filingType: key, path: DELIBERATELY_UNCOVERED[key][0],
        section: 'The Plan', message: 'an uncovered dependent requirement',
      });
      // Empty data leaves every predicate pending, which is precisely when
      // 44C's blanket rule used to hide both of these.
      const rows = getFilingReadiness(key, {}, [covered, uncovered]).automatic;
      expect(rows.some((row) => row.id === covered.code), `${key}: covered issue should be represented by its predicate row`).toBe(false);
      expect(rows.some((row) => row.id === uncovered.code), `${key}: uncovered issue should be listed immediately`).toBe(true);
    });

  }

  it('an issue is listed as soon as its own covering predicate passes, even with other predicates still pending', () => {
    // The case that motivates the whole change, and the reason matching on the
    // issue CODE rather than the check is safe: `cover.period` only asserts both
    // dates are present, so two present-but-reversed dates leave it passing
    // while the validator's date-ORDER issue (same `periodTo` path, therefore
    // the same code) is real. Every other predicate is still pending here, so
    // 44C's blanket rule hid it; now it shows.
    const reversed = { periodFrom: '2025-12-31', periodTo: '2025-01-01' };
    window.D = reversed;
    const order = createRequiredIssue({
      filingType: 'planSimplified', path: 'periodTo', section: 'Cover',
      message: 'Cover — Reporting Period To must be on or after Reporting Period From',
    });
    const rows = getFilingReadiness('planSimplified', reversed, [order]).automatic;

    const periodRow = rows.find((row) => row.id === 'cover.period');
    expect(periodRow.ok, 'both dates are present, so the presence predicate passes').toBe(true);
    expect(rows.some((row) => row.ok !== true && row.id.startsWith('cover.wardCaseCounty')), 'other predicates are still pending').toBe(true);
    expect(rows.some((row) => row.id === order.code), 'the date-order issue must be listed, not hidden by the other pending predicates').toBe(true);
  });

  it('wildcard paths match every key beneath them (per-right and per-ADL issues)', () => {
    expect(predicateIdsCoveringIssue('planAnnual', 'planAnnual.rights.marry.required')).toEqual(['plan.q6rights']);
    expect(predicateIdsCoveringIssue('planAnnual', 'planAnnual.rights.vote.required')).toEqual(['plan.q6rights']);
    expect(predicateIdsCoveringIssue('planAnnual', 'planAnnual.adls.eating.required')).toEqual(['plan.q8adls']);
    expect(predicateIdsCoveringIssue('planInitial', 'planInitial.adls.grooming.required')).toEqual(['plan.q10a.adls']);
    // Not a right/ADL key, so the wildcard must not swallow it.
    expect(predicateIdsCoveringIssue('planAnnual', 'planAnnual.rightsSomethingElse.required')).toEqual([]);
  });

  it('a plain-string issue keeps the blanket rule, since it carries no path to match on', () => {
    const plain = createIssue('validation.legacy-unmapped', { message: 'Cover — Name of Ward is required' });
    const pending = getFilingReadiness('planSimplified', {}, [plain]).automatic;
    expect(pending.some((row) => row.label === 'Cover — Name of Ward is required')).toBe(false);

    // With every predicate passing there is nothing to represent it, so it shows.
    const ready = {
      wardName: 'Jordan Rivera', caseNumber: '25-001234-GD', county: 'Orange',
      periodFrom: '2025-01-01', periodTo: '2025-12-31',
      q1Residences: 'home', q2BestPlacement: 'x', q3MedicalTreatment: 'x', q4Diagnosis: 'x',
      q5SocialServices: 'x', q6Interaction: 'x', q7RestoreRights: 'No', q8None: true, q9Remuneration: 'No',
      planGuardians: [{ name: 'Pat', signatureDate: '2026-01-15', email: 'p@x.org', phone: '727-555-0100', mailingAddress: '1 Main St' }],
    };
    window.D = ready;
    const rows = getFilingReadiness('planSimplified', ready, [plain]).automatic;
    expect(rows.filter((row) => row.ok !== true).map((row) => row.label)).toEqual(['Cover — Name of Ward is required']);
  });
});
