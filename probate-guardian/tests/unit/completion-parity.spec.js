import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, test, vi } from 'vitest';
import { parse } from 'acorn';

// Milestone 70, 70D gate: "Old and new completion maps and percentages match
// across all fixture factories, edge cases, and filing identities before the
// old dispatcher is removed."
//
// OLD is legacy-app.js's computeNavChecks() and getWardProgress() exactly as
// they stood before 70D moved them (tests/baseline/ms70-70D-nav-checks-before.js.txt,
// sliced by scripts at the move), evaluated against the same window.D and
// active type they read, with every global they reached handed the app's real
// implementation. NEW is the registry's computeCompletion() and
// filingProgress() over src/core/status/completion.js's evaluators, called
// with the filing and its dependencies explicitly. Both see the same filings: each
// identity's blank filing, the browser suite's minimal valid overlays
// (tests/e2e/support/fixtures.ts), and variants that set or clear one field
// or row at a time -- the edge cases each branch's `filled`, `hasAny`,
// verified-empty and started-row rules turn on.
//
// This spec pins behavior that existed before 70D, so it is deleted (with the
// frozen copy) the first time a deliberate change to completion lands --
// until then it is the proof the move changed nothing.

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const FROZEN = fs.readFileSync(path.join(root, 'tests/baseline/ms70-70D-nav-checks-before.js.txt'), 'utf8');
const legacySrc = fs.readFileSync(path.join(root, 'src/legacy-app.js'), 'utf8');

// errorRoute() and its table are still the monolith's (70F moves them).
function sliceDecl(name) {
  const ast = parse(legacySrc, { ecmaVersion: 'latest', sourceType: 'script' });
  const st = ast.body.find((s) => (s.type === 'FunctionDeclaration' && s.id.name === name)
    || (s.type === 'VariableDeclaration' && s.declarations[0].id.name === name));
  if (!st) throw new Error(`${name} not in legacy-app.js`);
  return legacySrc.slice(st.start, st.end);
}
const ERROR_ROUTE_SRC = `${sliceDecl('PLAN_SECTION_ROUTES')}\n${sliceDecl('errorRoute')}\nreturn errorRoute;`;

let m; // modules, loaded once window exists
beforeAll(async () => {
  vi.stubGlobal('window', globalThis);
  const [completion, registry, guardianModel, planAnnual, planInitial, rowStarted, recipients, signature, attorney, preparer,
    certificate, totals, guardianFeature, fixtures] = await Promise.all([
    import('../../src/core/status/completion.js'),
    import('../../src/core/filing/filing-registry.js'),
    import('../../src/core/filing/models/guardian.js'),
    import('../../src/core/filing/models/plan-annual.js'),
    import('../../src/core/filing/models/plan-initial.js'),
    import('../../src/core/validation/row-started.js'),
    import('../../src/core/validation/service-recipients.js'),
    import('../../src/core/validation/signature-state.js'),
    import('../../src/core/validation/attorney-block.js'),
    import('../../src/core/form/preparer-flag.js'),
    import('../../src/core/filing/plan-certificate-of-service.js'),
    import('../../src/features/annual-accounting/totals.js'),
    import('../../src/features/guardian-inventory/index.js'),
    import('../e2e/support/fixtures.ts'),
  ]);
  m = { completion, registry, guardianModel, planAnnual, planInitial, rowStarted, recipients, signature, attorney, preparer,
    certificate, totals, guardianFeature, fixtures };
});
afterAll(() => vi.unstubAllGlobals());

const json = (x) => JSON.parse(JSON.stringify(x));

// OLD: the frozen functions, with window.D and the monolith's own
// activeInventoryType pointed at the filing, as getWardProgress() did.
function oldRun(D, type, call) {
  const bridge = {
    PLAN_BENEFITS: m.planAnnual.PLAN_BENEFITS, PLAN_RIGHTS: m.planAnnual.PLAN_RIGHTS, PLAN_ADLS: m.planAnnual.PLAN_ADLS,
    INITIAL_ADLS: m.planInitial.INITIAL_ADLS,
  };
  const win = {
    GuardianFormsLegacyBridge: bridge, D,
    validateGuardian: () => m.guardianFeature.validateGuardian(),
    serviceRecipientIssues: m.recipients.serviceRecipientIssues,
    isSignatureComplete: m.signature.isSignatureComplete,
    resolvePreparer: m.preparer.resolvePreparer,
    startedRows: m.rowStarted.startedRows,
    planCertificateStarted: m.certificate.certificateStarted,
    isPlanInitialAttorneyStarted: m.attorney.isPlanInitialAttorneyStarted,
  };
  const errorRoute = new Function('activeInventoryType', ERROR_ROUTE_SRC)(type);
  // eslint-disable-next-line no-new-func
  const run = new Function('D', 'activeInventoryType', 'window', 'validate', 'errorRoute', 'SCHEDULE_NAV_KEYS', 'guardianHasAnyData',
    'formEngine', 'calcTotalsAnnual', 'annualReconcileState', 'PLAN_BENEFITS', 'PLAN_RIGHTS', 'PLAN_ADLS', 'INITIAL_ADLS',
    `${FROZEN}\nreturn ${call};`);
  globalThis.D = D;
  return run(D, type, win, () => m.guardianFeature.validateGuardian(), errorRoute, m.guardianModel.SCHEDULE_NAV_KEYS,
    m.rowStarted.guardianHasAnyData, m.registry.formEngine, () => m.totals.calcTotalsAnnual(D), m.totals.annualReconcileState,
    bridge.PLAN_BENEFITS, bridge.PLAN_RIGHTS, bridge.PLAN_ADLS, bridge.INITIAL_ADLS);
}
const oldChecks = (D, type) => oldRun(D, type, 'computeNavChecks()');
// getWardProgress() swaps the frozen function's window.D and active type to
// the filing's own, and back.
const oldProgress = (D) => oldRun(D, D.inventoryType, 'getWardProgress(D)');

// NEW: the module, handed the filing and what it cannot import.
const newDeps = (type) => ({
  validateGuardian: m.guardianFeature.validateGuardian,
  errorRoute: new Function('activeInventoryType', ERROR_ROUTE_SRC)(type),
  calcTotalsAnnual: m.totals.calcTotalsAnnual, annualReconcileState: m.totals.annualReconcileState,
});
function newChecks(D, type) {
  globalThis.D = D; // validateGuardian() reads window.D when not handed a filing
  return m.registry.computeCompletion(D, type, newDeps(type));
}
// A filing that is not the open one: window.D stays on another filing.
function newProgress(D) {
  globalThis.D = {};
  return m.registry.filingProgress(D, newDeps(D.inventoryType));
}

// Filings to compare. Each is built fresh (the evaluators must not mutate,
// and old and new each get their own copy).
const SAMPLE = { string: 'x', number: 5, boolean: true };
function* filingsFor(type) {
  const blank = () => json(m.registry.initializeEmptyData(type));
  const normalized = () => json(m.registry.normalizeWardData(blank()));
  const overlay = m.fixtures.MINIMAL_VALID[type];
  const valid = overlay ? () => {
    const d = normalized();
    for (const [k, v] of Object.entries(json(overlay))) {
      d[k] = Array.isArray(v) && Array.isArray(d[k]) ? v.map((row, i) => (row && typeof row === 'object' ? { ...(d[k][i] || {}), ...row } : row))
        : (v && typeof v === 'object' && !Array.isArray(v) && d[k] && typeof d[k] === 'object') ? { ...d[k], ...v } : v;
    }
    return d;
  } : null;
  // Every blank answer answered: 'Yes' satisfies presence, the tri-state
  // checks and (compared with itself) date order, so from here clearing one
  // field at a time isolates each requirement -- the forms without an overlay
  // above get their "complete filing" this way.
  const saturate = (x) => {
    if (Array.isArray(x)) return x.map(saturate);
    if (x && typeof x === 'object') return Object.fromEntries(Object.entries(x).map(([k, v]) => [k, saturate(v)]));
    return x === '' || x === null || x === undefined ? 'Yes' : x;
  };
  const saturated = () => saturate(valid ? valid() : normalized());
  yield ['blank', blank()];
  yield ['normalized', normalized()];
  if (valid) yield ['minimal valid', valid()];
  yield ['saturated', saturated()];
  // From the saturated filing, clear each answer in turn, nested ones included.
  const leaves = (x, at = []) => (Array.isArray(x) || (x && typeof x === 'object')
    ? Object.entries(x).flatMap(([k, v]) => leaves(v, [...at, k])) : [at]);
  for (const at of leaves(saturated())) {
    const d = saturated();
    let o = d; for (const k of at.slice(0, -1)) o = o[k];
    const last = at[at.length - 1];
    o[last] = typeof o[last] === 'boolean' ? !o[last] : '';
    yield [`saturated: ${at.join('.')} cleared`, d];
  }
  for (const [label, base] of [['blank', normalized], ...(valid ? [['valid', valid]] : []), ['saturated', saturated]]) {
    const keys = Object.keys(base());
    for (const k of keys) {
      const v = base()[k];
      if (Array.isArray(v)) {
        const empty = base(); empty[k] = []; yield [`${label}: ${k} emptied`, empty];
        const row = v[0] && typeof v[0] === 'object' ? v[0] : { name: '' };
        for (const f of Object.keys(row)) {
          const one = base(); one[k] = [{ ...Object.fromEntries(Object.keys(row).map((x) => [x, ''])), [f]: SAMPLE.string }];
          yield [`${label}: ${k}[0] only ${f}`, one];
        }
        const full = base(); full[k] = [Object.fromEntries(Object.keys(row).map((x) => [x, SAMPLE.string])), { ...row }];
        yield [`${label}: ${k} one full row and one as seeded`, full];
      } else if (v && typeof v === 'object') {
        for (const f of Object.keys(v)) {
          const one = base(); one[k] = { ...v, [f]: typeof v[f] === 'boolean' ? !v[f] : (v[f] ? '' : SAMPLE.string) };
          yield [`${label}: ${k}.${f} toggled`, one];
        }
      } else {
        const set = base(); set[k] = typeof v === 'boolean' ? !v : (v === '' || v == null ? (typeof v === 'number' ? 1 : 'Yes') : '');
        yield [`${label}: ${k} ${v === '' || v == null ? 'answered' : 'cleared'}`, set];
      }
    }
    // The verified-empty declarations every Annual schedule and Part XI take.
    const ticked = base(); ticked.scheduleNoItems = Object.fromEntries(
      ['scha', 'schb1', 'schb2', 'schb3', 'schb4', 'schc', 'schd1', 'schd2', 'schd3', 'schd4', 'schd5', 'sche', 'schf1', 'schf2',
        'remuneration', 'p8', 'a-p8', ...(m.guardianModel.SCHEDULE_NAV_KEYS || [])].map((x) => [x, true]));
    yield [`${label}: every "no items" box ticked`, ticked];
  }
}

describe('old and new completion maps are equal on every filing identity', () => {
  test('all nine identities, every fixture and variant', () => {
    const counts = {};
    for (const type of m.registry.FILING_TYPE_KEYS ?? Object.keys(m.registry.FILING_REGISTRY)) {
      let n = 0;
      for (const [label, filing] of filingsFor(type)) {
        const a = json(filing); const b = json(filing);
        const before = oldChecks(a, type);
        const after = newChecks(b, type);
        expect(json(after ?? null), `${type} -- ${label}`).toStrictEqual(json(before ?? null));
        expect(b, `${type} -- ${label}: the new evaluator changed nothing`).toStrictEqual(a);
        const c = json(filing); const d = json(filing);
        expect(newProgress(d), `${type} -- ${label}: progress`).toStrictEqual(oldProgress(c));
        n++;
      }
      counts[type] = n;
    }
    // Enough variants that every branch's rules were exercised.
    for (const [type, n] of Object.entries(counts)) expect(n, type).toBeGreaterThan(40);
  }, 120_000);

  test('progress is the share of complete sections, for a filing that is not the open one', () => {
    const deps = { calcTotalsAnnual: m.totals.calcTotalsAnnual, annualReconcileState: m.totals.annualReconcileState };
    const open = json(m.registry.initializeEmptyData('planMinor'));
    globalThis.D = open;
    const other = json(m.registry.initializeEmptyData('annual'));
    const r = m.registry.computeCompletion(other, 'annual', deps);
    const keys = Object.keys(r.checks);
    expect(m.registry.filingProgress(other, deps)).toEqual({
      complete: keys.filter((k) => r.checks[k]).length, total: keys.length,
      pct: Math.round(keys.filter((k) => r.checks[k]).length / keys.length * 100),
    });
    expect(globalThis.D, 'the open filing is never swapped out').toBe(open);
  });

  test('a filing type with no evaluator, and the Inventory before its validator loads, read as not computed', () => {
    expect(m.registry.computeCompletion({}, 'nonsense', {})).toBeUndefined();
    expect(m.registry.computeCompletion({}, 'constructor', {})).toBeUndefined();
    expect(m.registry.computeCompletion(json(m.registry.initializeEmptyData('guardian')), 'guardian', {})).toBeNull();
    expect(m.registry.filingProgress(json(m.registry.initializeEmptyData('guardian')), {})).toBeNull();
  });
});
