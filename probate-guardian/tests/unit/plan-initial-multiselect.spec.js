import { describe, expect, test } from 'vitest';
import {
  Q2_OPTIONS, Q4_OPTIONS, Q5_OPTIONS, MULTISELECT_QUESTIONS, emptyPlanInitialMultiselect, anyChecked, migratePlanInitialMultiselect,
} from '../../src/core/filing/plan-initial-multiselect.js';

// Milestone 68E. The Initial Plan's questions 2, 4 and 5 are checkbox lists
// on the court's form and were radio groups storing one string here. The
// rules under test: the option lists match the form's rows; a legacy string
// reads back as the one box it named; free text typed into the old enum
// lands in Other with the text kept as the explanation; blank stays blank;
// the retired scalar is removed; the migration is idempotent.

describe('the option lists are the form\'s rows', () => {
  test('question 2 (residential setting), question 4 (mental health), question 5 (personal care)', () => {
    expect(Q2_OPTIONS.map((o) => o.label)).toEqual(['Assisted Living (ALF)', 'Group Home', 'Intermediate', 'Private Residence', 'Skilled Nursing', 'Specialized', 'State Hospital', 'Other']);
    expect(Q4_OPTIONS.map((o) => o.label)).toEqual(['Routine examination by Psychiatrist/Psychologist', 'Ongoing Treatment Outpatient', 'Ongoing Treatment Inpatient', 'None', 'Other']);
    expect(Q5_OPTIONS.map((o) => o.label)).toEqual(['Care Facility', 'Nurses and Aides', 'Family and Friends', 'Other']);
    expect(MULTISELECT_QUESTIONS.map((q) => q.legacyKey)).toEqual(['q2Setting', 'q4Mental', 'q5Personal']);
    const keys = Object.keys(emptyPlanInitialMultiselect());
    expect(keys).toHaveLength(17);
    expect(new Set(keys).size).toBe(17);
    expect(Object.values(emptyPlanInitialMultiselect()).every((v) => v === false)).toBe(true);
  });
});

describe('reading a filing saved under the old one-string shape', () => {
  test('a stored option ticks that one box, and the retired scalar is gone', () => {
    const f = { q4Mental: 'Ongoing Treatment Inpatient', q5Personal: 'Care Facility', q2Setting: 'Skilled Nursing' };
    expect(migratePlanInitialMultiselect(f)).toBe(true);
    expect(f.q4Inpatient).toBe(true);
    expect(f.q4Psych).toBe(false);
    expect(f.q5CareFacility).toBe(true);
    expect(f.q2SkilledNursing).toBe(true);
    expect('q4Mental' in f).toBe(false);
    expect('q5Personal' in f).toBe(false);
    expect('q2Setting' in f).toBe(false);
    expect(migratePlanInitialMultiselect(f)).toBe(false);
  });

  test('free text typed into the old enum lands in Other, kept as the explanation, and never overwrites an explanation already typed', () => {
    const f = { q4Mental: 'Weekly counseling at the community mental health center', q5Personal: 'Family provides care', q5Explain: 'already typed' };
    migratePlanInitialMultiselect(f);
    expect(f.q4Other).toBe(true);
    expect(f.q4Explain).toBe('Weekly counseling at the community mental health center');
    expect(f.q5Other).toBe(true);
    expect(f.q5Explain).toBe('already typed');
  });

  test('a blank answer stays unanswered -- no box is ticked (section 4)', () => {
    const f = { q2Setting: '', q4Mental: '', q5Personal: '' };
    migratePlanInitialMultiselect(f);
    for (const q of MULTISELECT_QUESTIONS) expect(anyChecked(f, q.options), q.legacyKey).toBe(false);
    expect('q4Mental' in f).toBe(false);
  });

  test('a filing already in the new shape gains only what it lacks', () => {
    const f = { q4Psych: true, q4Outpatient: true };
    expect(migratePlanInitialMultiselect(f)).toBe(true);
    expect(f.q4Psych).toBe(true);
    expect(f.q4Outpatient).toBe(true);
    expect(f.q4None).toBe(false);
    expect(migratePlanInitialMultiselect(f)).toBe(false);
    expect(migratePlanInitialMultiselect(null)).toBe(false);
  });

  test('anyChecked reads the boxes, not the retired scalar', () => {
    expect(anyChecked({ q4Mental: 'None' }, Q4_OPTIONS)).toBe(false);
    expect(anyChecked({ q4None: true }, Q4_OPTIONS)).toBe(true);
    expect(anyChecked(null, Q4_OPTIONS)).toBe(false);
  });
});
