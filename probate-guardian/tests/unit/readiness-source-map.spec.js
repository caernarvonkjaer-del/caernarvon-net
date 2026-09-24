import { describe, it, expect } from 'vitest';
import {
  getFilingReadiness, READINESS_FILING_KEYS, READINESS_CONFIG, OUT_OF_CARD_CATEGORIES,
} from '../../src/core/filing/readiness-config.js';
import { createIssue, createRequiredIssue, getIssueDefinition } from '../../src/core/validation/issue-registry.js';
import { FILING_TYPE_KEYS } from '../../src/core/filing/filing-descriptor.js';

// Milestone 38B / 44C: MILESTONE-38B-SOURCE-INVENTORY.md's "Completeness
// Test Contract" -- the nine filing keys, their automatic/manual/unsupported
// dispositions, bidirectional mapping of blocking issues into the card, the
// explicit out-of-card allow-list, and the DSHP non-filing decision.

const NINE = ['guardian', 'simplified', 'annual', 'finalAccounting', 'trustAccounting', 'planSimplified', 'planAnnual', 'planInitial', 'planMinor'];
const PLAN_KEYS = NINE.filter((k) => k.startsWith('plan'));
// Predicate-row counts per Plan, matching each parity spec's ALL_AUTO_IDS
// (Plan Initial's 20th, plan.q7explain, was added by Milestone 40C-H; its
// 21st, cover.period, by Milestone 68B when the reporting period became
// required there as on the other Plans).
const PLAN_PREDICATE_COUNTS = { planSimplified: 13, planAnnual: 18, planInitial: 21, planMinor: 14 };

// What prepareFilingOutput() makes of a Plan validator's plain-string issue.
const legacyString = (message) => createIssue('validation.legacy-unmapped', { message });

const blank = (key) => ({ wardId: 'w1', inventoryType: key, county: 'Orange', planGuardians: [{}] });

describe('1. exactly nine filing keys, each with an automatic family and a manual or unsupported disposition', () => {
  it('enumerates the nine descriptor inventoryType keys and nothing else, derived from the filing registry', () => {
    expect([...READINESS_FILING_KEYS].sort()).toEqual([...NINE].sort());
    expect([...FILING_TYPE_KEYS].sort()).toEqual([...NINE].sort());
    expect(Object.keys(READINESS_CONFIG).sort()).toEqual([...NINE].sort());
  });

  for (const key of NINE) {
    it(`${key}: automatic family declared; manual rows and an unsupported family present`, () => {
      expect(READINESS_CONFIG[key].automaticFamilies.length).toBeGreaterThan(0);
      const r = getFilingReadiness(key, blank(key), []);
      expect(r.key).toBe(key);
      expect(r.manual.length).toBeGreaterThan(0);
      expect(r.unsupportedCount).toBe(1);
      for (const row of [...r.automatic, ...r.manual]) {
        expect(typeof row.id, `${key} row id`).toBe('string');
        expect(row.id.length).toBeGreaterThan(0);
        expect(row.label.length).toBeGreaterThan(0);
        expect(['automatic', 'manual']).toContain(row.classification);
        expect(typeof row.blocking).toBe('boolean');
        expect(typeof row.route).toBe('string');
      }
      const ids = [...r.automatic, ...r.manual].map((row) => row.id);
      expect(new Set(ids).size, `${key} has duplicate row ids`).toBe(ids.length);
    });
  }

  for (const key of PLAN_KEYS) {
    it(`${key}: carries its ${PLAN_PREDICATE_COUNTS[key]} preserved readiness-only predicate rows`, () => {
      const rows = getFilingReadiness(key, blank(key), []).automatic;
      expect(rows.length).toBe(PLAN_PREDICATE_COUNTS[key]);
      for (const row of rows) {
        expect(row.id).toMatch(/^(cover|plan|signatures)\./);
        expect(row.blocking).toBe(true);
      }
    });
  }
});

describe('2. every issue-derived automatic row references a canonical registry id', () => {
  for (const key of NINE) {
    it(key, () => {
      const issues = [
        createRequiredIssue({ filingType: key, path: 'wardName', message: 'Cover — Name of Ward is required' }),
        createIssue('field.date.invalid', { message: 'Cover — Reporting Period From is not a valid date', path: 'periodFrom' }),
        createIssue('simplified.guardian.address-conflict', { message: 'Guardian address conflicts', path: 'guardians.0' }),
      ];
      const predicateIds = new Set(getFilingReadiness(key, blank(key), []).automatic.map((r) => r.id));
      const issueRows = getFilingReadiness(key, blank(key), issues).automatic.filter((r) => !predicateIds.has(r.id));
      expect(issueRows.length).toBeGreaterThan(0);
      for (const row of issueRows) expect(getIssueDefinition(row.id), `${row.id} is not a registered issue code`).not.toBeNull();
    });
  }
});

describe('3. every bypassable validation issue appears exactly once in the card, or is in the explicit out-of-card allow-list', () => {
  const outOfCard = [
    createIssue('supplemental.missing-data', { message: 'supplemental' }),
    createIssue('supplemental.total-pages', { message: 'supplemental pages' }),
    createIssue('excel.capacity.annual.scheduleA', { message: 'capacity' }),
    createIssue('output.template.missing', { message: 'technical' }),
    createIssue('output.generation.failed', { message: 'technical 2' }),
    createIssue('output.security.denied', { message: 'security' }),
  ];

  it('the allow-list is limited to technical/security/output-capability categories', () => {
    expect([...OUT_OF_CARD_CATEGORIES].sort()).toEqual(['capacity', 'security', 'supplemental', 'technical']);
    for (const issue of outOfCard) expect(OUT_OF_CARD_CATEGORIES).toContain(issue.category);
  });

  for (const key of NINE.filter((k) => !k.startsWith('plan'))) {
    it(`${key}: plain-string and typed validator issues each map to exactly one row; out-of-card categories map to none`, () => {
      const plain = legacyString('Cover — Name of Ward is required');
      const typed = createRequiredIssue({ filingType: key, path: 'caseNumber', message: 'Cover — Case Number is required' });
      expect(plain.bypassable).toBe(true);
      expect(typed.bypassable).toBe(true);
      const rows = getFilingReadiness(key, blank(key), [plain, typed, ...outOfCard]).automatic;
      expect(rows.filter((r) => r.label === 'Cover — Name of Ward is required').length).toBe(1);
      expect(rows.filter((r) => r.id === typed.code).length).toBe(1);
      expect(rows.filter((r) => /supplemental|capacity|technical|security/.test(r.label)).length).toBe(0);
    });
  }

  // Milestone 38D Phase 2: suppression is now matched per issue code against
  // the predicate that covers it, so this fixture has to use each Plan's REAL
  // case-number path -- Plan Minor's validator emits `ucn` (its cover asks for
  // a UCN or Case #), never `caseNumber`. Under 44C's blanket rule any path at
  // all was suppressed here, which is exactly why a synthetic one went
  // unnoticed; the test now exercises a code the validator can really produce.
  const CASE_NUMBER_PATH = { planSimplified: 'caseNumber', planAnnual: 'caseNumber', planInitial: 'caseNumber', planMinor: 'ucn' };

  for (const key of PLAN_KEYS) {
    it(`${key}: while a predicate is pending, the validator's own issues (typed or plain) are represented by the predicate rows, never listed twice`, () => {
      const plain = legacyString('Cover — Name of Ward is required');
      const typed = createRequiredIssue({ filingType: key, path: CASE_NUMBER_PATH[key], message: 'Cover — Case Number is required' });
      const rows = getFilingReadiness(key, blank(key), [plain, typed, ...outOfCard]).automatic;
      expect(rows.filter((r) => r.label === 'Cover — Name of Ward is required').length).toBe(0);
      expect(rows.filter((r) => r.id === typed.code).length).toBe(0);
      expect(rows.length).toBe(PLAN_PREDICATE_COUNTS[key]);
      // The predicate row the parity suites map "Name of Ward" onto is pending on blank data.
      const wardRow = rows.find((r) => /wardCase|wardCountyPeriod/.test(r.id));
      expect(wardRow, `${key} has no ward-name predicate row`).toBeTruthy();
      expect(wardRow.ok).toBe(false);
    });

    it(`${key}: typed data-integrity and date-draft issues still add their own row`, () => {
      const typed = [
        createIssue('field.date.invalid', { message: 'Cover — Reporting Period From is not a valid date', path: 'periodFrom' }),
        createIssue('simplified.guardian.address-conflict', { message: 'Guardian address conflicts' }),
      ];
      const rows = getFilingReadiness(key, blank(key), typed).automatic;
      expect(rows.length).toBe(PLAN_PREDICATE_COUNTS[key] + 2);
      expect(rows.filter((r) => r.id === 'field.date.invalid' && r.path === 'periodFrom').length).toBe(1);
    });
  }

  // A complete Plan Simplified filing (every predicate passes) -- the parity
  // suite's own baseline shape.
  const READY_PLAN_SIMPLIFIED = Object.freeze({
    wardId: 'w1', inventoryType: 'planSimplified',
    wardName: 'Jordan Rivera', caseNumber: '25-001234-GD', county: 'Orange',
    periodFrom: '2025-01-01', periodTo: '2025-12-31',
    q1Residences: 'home', q2BestPlacement: 'x', q3MedicalTreatment: 'x', q4Diagnosis: 'x',
    q5SocialServices: 'x', q6Interaction: 'x', q7RestoreRights: 'Yes', q8None: true, q9Remuneration: 'No',
    planGuardians: [{ name: 'Pat', signatureDate: '2026-01-15', email: 'p@x.org', phone: '727-555-0100', mailingAddress: '1 Main St' }],
  });

  it('planSimplified: once every predicate passes, a validator issue no predicate covers is listed itself, routed, so the card cannot report "passed" while export is blocked', () => {
    // The parity suite's autoStaysTrue case: q7RestoreRights = Yes with no explanation.
    const uncovered = createRequiredIssue({
      filingType: 'planSimplified', path: 'q7RestoreExplain', section: 'The Plan',
      message: 'The Plan — Question 7 explanation is required when rights should be restored',
    });
    const r = getFilingReadiness('planSimplified', READY_PLAN_SIMPLIFIED, [uncovered]);
    expect(r.automatic.filter((row) => row.ok !== true).map((row) => row.id)).toEqual([uncovered.code]);
    const row = r.automatic.find((row) => row.id === uncovered.code);
    expect(row.path).toBe('q7RestoreExplain');
    expect(row.route).toBe('/p2');
  });

  it('non-bypassable identity issues flagged showInReadiness:false stay out of the card even though they block export', () => {
    const hidden = createIssue('filing.identity.conflict', { message: 'identity' });
    expect(hidden.bypassable).toBe(false);
    for (const key of NINE) {
      expect(getFilingReadiness(key, blank(key), [hidden]).automatic.some((r) => r.id === 'filing.identity.conflict')).toBe(false);
    }
  });
});

describe('4. no unsupported group is ever rendered as a row, checked or otherwise', () => {
  for (const key of NINE) {
    it(key, () => {
      const r = getFilingReadiness(key, blank(key), []);
      expect(READINESS_CONFIG[key].unsupported).toMatch(/\.unsupported\./);
      expect([...r.automatic, ...r.manual].some((row) => row.classification === 'unsupported' || /\.unsupported\./.test(row.id))).toBe(false);
      for (const row of r.manual) {
        expect(row.blocking).toBe(false);
        expect(row.ok).toBeUndefined();
      }
    });
  }
});

describe('5. the DSHP overlay is not a tenth filing and adds no automatic row', () => {
  it('no DSHP key or automatic row exists; Annual Plan keeps only its manual support-plan reminder', () => {
    expect(READINESS_FILING_KEYS.some((k) => /dshp/i.test(k))).toBe(false);
    expect(getFilingReadiness('planAnnualDshp', blank('planAnnual'), []).automatic).toEqual([]);
    const annual = getFilingReadiness('planAnnual', blank('planAnnual'), []);
    expect(annual.automatic.some((r) => /dshp|393/i.test(r.id + r.label))).toBe(false);
    const reminder = annual.manual.filter((r) => /DSHP/.test(r.label));
    expect(reminder.length).toBe(1);
    expect(reminder[0].classification).toBe('manual');
  });
});
