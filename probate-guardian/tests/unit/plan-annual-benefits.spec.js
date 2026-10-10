import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { PLAN_BENEFITS, emptyDataPlanAnnual } from '../../src/core/filing/models/plan-annual.js';

// Milestone 75C: the Annual Plan's Question 3G lists the benefits the court's
// form lists, in its order -- VA had been left out, between Medicaid and
// Trusts. Read against the court's own form (reference/plan-forms/).

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const form = fs.readFileSync(path.join(ROOT, 'reference/plan-forms/plan-annual-original.txt'), 'utf8');
const q3g = form.slice(form.indexOf('G. Description of health and accident insurance'), form.indexOf('4. Professional Medical Treatment'));

describe('Milestone 75C: the Annual Plan\'s 3G is the court form\'s list', () => {
  it('every benefit the app lists is on the form, in the form\'s order', () => {
    expect(q3g.length).toBeGreaterThan(200);
    const lines = q3g.split(/\r?\n/).map((l) => l.trim());
    const at = PLAN_BENEFITS.map(([, label]) => lines.findIndex((l) => l === label || l.startsWith(`${label} (`)));
    expect(PLAN_BENEFITS.filter((_, i) => at[i] < 0).map(([, label]) => label), 'on the form').toEqual([]);
    expect([...at].sort((a, b) => a - b), 'in its order').toEqual(at);
  });

  it('VA is there, between Medicaid and Trusts', () => {
    expect(q3g.split(/\r?\n/).map((l) => l.trim()), 'the court\'s form lists it').toContain('VA');
    const keys = PLAN_BENEFITS.map(([key]) => key);
    expect(keys.slice(keys.indexOf('medicaid'), keys.indexOf('medicaid') + 3)).toEqual(['medicaid', 'va', 'trusts']);
    expect(PLAN_BENEFITS.find(([key]) => key === 'va')[1]).toBe('VA');
  });

  it('a new plan starts VA unanswered, never No (AGENTS.md section 4)', () => {
    expect(emptyDataPlanAnnual().benefits.va).toEqual({ eligible: '', appliedFor: '' });
  });
});
