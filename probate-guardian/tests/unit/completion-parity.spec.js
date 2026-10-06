import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, test, vi } from 'vitest';
import { getD, withFilingInView } from '../../src/core/state.js';
import { openFiling } from './support/open-filing.js';
import { filingsFor as variantsFor } from './support/filing-variants.js';

// Milestone 70, 70D gate: "Old and new completion maps and percentages match
// across all fixture factories, edge cases, and filing identities before the
// old dispatcher is removed."
//
// 70D moved legacy-app.js's computeNavChecks() and getWardProgress() into
// src/core/status/completion.js as text, and this spec proved the move changed
// nothing by evaluating a frozen copy of the old functions beside the new ones
// on every fixture below. 70L (completion criterion 9: no unit test evaluates
// legacy application code) replaced the copy with what it returned, recorded
// from it for the same fixtures and variants: tests/baseline/
// ms70-completion-golden.json. NEW is the registry's computeCompletion() and
// filingProgress() over the evaluators, called with the filing and its
// dependencies explicitly. The filings: each identity's blank filing, the
// browser suite's minimal valid overlays (tests/e2e/support/fixtures.ts), and
// variants that set or clear one field or row at a time -- the edge cases
// each branch's `filled`, `hasAny`, verified-empty and started-row rules turn
// on.
//
// A deliberate change to completion regenerates the record
// (PG_UPDATE_GOLDEN=1 npx vitest run tests/unit/completion-parity.spec.js) and
// says why in its note.

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const GOLDEN = path.join(root, 'tests/baseline/ms70-completion-golden.json');
const UPDATE = process.env.PG_UPDATE_GOLDEN === '1';
// One line per result and per variant, so a regeneration changes only the
// lines whose outcome changed.
function writeGolden(record) {
  const line = (x) => JSON.stringify(x);
  const types = Object.entries(record.types)
    .map(([type, rows]) => `  ${line(type)}: [\n${rows.map((r) => `   ${line(r)}`).join(',\n')}\n  ]`);
  fs.writeFileSync(GOLDEN, `{\n "note": ${line(record.note)},\n "results": [\n${record.results.map((r) => `  ${line(r)}`).join(',\n')}\n ],\n "types": {\n${types.join(',\n')}\n }\n}\n`);
}

let m; // modules, loaded once window exists
beforeAll(async () => {
  // Some of these touch `window` at import time; nothing is put on it.
  vi.stubGlobal('window', globalThis);
  const [registry, guardianModel, totals, guardianFeature, fixtures] = await Promise.all([
    import('../../src/core/filing/filing-registry.js'),
    import('../../src/core/filing/models/guardian.js'),
    import('../../src/features/annual-accounting/totals.js'),
    import('../../src/features/guardian-inventory/index.js'),
    import('../e2e/support/fixtures.ts'),
  ]);
  m = { registry, guardianModel, totals, guardianFeature, fixtures };
});
afterAll(() => vi.unstubAllGlobals());

const json = (x) => JSON.parse(JSON.stringify(x));

// NEW: the module, handed the filing and what it cannot import.
const newDeps = (type) => ({
  validateGuardian: m.guardianFeature.validateGuardian,
  calcTotalsAnnual: m.totals.calcTotalsAnnual, annualReconcileState: m.totals.annualReconcileState,
});
function newChecks(D, type) {
  // validateGuardian() reads the open filing when not handed one: this one,
  // put in the case store's view (Milestone 70, 70J; window.D was pointed at it).
  return withFilingInView(D, () => m.registry.computeCompletion(D, type, newDeps(type)));
}
// A filing that is not the open one: nothing is in view.
function newProgress(D) {
  return m.registry.filingProgress(D, newDeps(D.inventoryType));
}

// Filings to compare. Each is built fresh (the evaluators must not mutate,
// and old and new each get their own copy). The variants are
// tests/unit/support/filing-variants.js's (moved there unchanged by Milestone
// 73F part 1, which records the validators over the same ones).
const filingsFor = (type) => variantsFor(type, m);

describe('completion maps and progress on every filing identity', () => {
  test('all nine identities, every fixture and variant, return what the pre-move functions did', () => {
    const golden = JSON.parse(fs.readFileSync(GOLDEN, 'utf8'));
    const record = { note: golden.note, results: [], types: {} };
    const seen = new Map();
    const counts = {};
    for (const type of m.registry.FILING_TYPE_KEYS ?? Object.keys(m.registry.FILING_REGISTRY)) {
      const expected = golden.types[type] || [];
      const rows = [];
      let n = 0;
      for (const [label, filing] of filingsFor(type)) {
        const b = json(filing);
        const outcome = [json(newChecks(b, type) ?? null), json(newProgress(json(filing)) ?? null)];
        expect(b, `${type} -- ${label}: the evaluator changed nothing`).toStrictEqual(json(filing));
        if (UPDATE) {
          const k = JSON.stringify(outcome);
          if (!seen.has(k)) { seen.set(k, record.results.length); record.results.push(outcome); }
          rows.push([label, seen.get(k)]);
        } else {
          expect(label, `${type}: variant ${n}`).toBe(expected[n]?.[0]);
          expect(outcome, `${type} -- ${label}`).toStrictEqual(golden.results[expected[n][1]]);
        }
        n++;
      }
      if (UPDATE) record.types[type] = rows;
      else expect(n, `${type}: every recorded variant was built`).toBe(expected.length);
      counts[type] = n;
    }
    if (UPDATE) writeGolden(record);
    // Enough variants that every branch's rules were exercised.
    for (const [type, n] of Object.entries(counts)) expect(n, type).toBeGreaterThan(40);
  }, 120_000);

  test('progress is the share of complete sections, for a filing that is not the open one', () => {
    const deps = { calcTotalsAnnual: m.totals.calcTotalsAnnual, annualReconcileState: m.totals.annualReconcileState };
    const open = openFiling(json(m.registry.initializeEmptyData('planMinor')));
    const other = json(m.registry.initializeEmptyData('annual'));
    const r = m.registry.computeCompletion(other, 'annual', deps);
    const keys = Object.keys(r.checks);
    expect(m.registry.filingProgress(other, deps)).toEqual({
      complete: keys.filter((k) => r.checks[k]).length, total: keys.length,
      pct: Math.round(keys.filter((k) => r.checks[k]).length / keys.length * 100),
    });
    expect(getD(), 'the open filing is never swapped out').toBe(open);
  });

  test('a filing type with no evaluator, and the Inventory before its validator loads, read as not computed', () => {
    expect(m.registry.computeCompletion({}, 'nonsense', {})).toBeUndefined();
    expect(m.registry.computeCompletion({}, 'constructor', {})).toBeUndefined();
    expect(m.registry.computeCompletion(json(m.registry.initializeEmptyData('guardian')), 'guardian', {})).toBeNull();
    expect(m.registry.filingProgress(json(m.registry.initializeEmptyData('guardian')), {})).toBeNull();
  });
});
