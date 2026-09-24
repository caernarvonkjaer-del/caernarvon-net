import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';
import {
  BASELINE_PATH, auditSources, auditApplication, ratchetSets, compareRatchet, classicScriptsFromHtml, moduleEntriesFromHtml, layerViolation,
} from '../../scripts/ms70-dependency-audit.mjs';

// Milestone 70, 70A. The ratchet that keeps the migration honest: while the
// classic monolith is taken apart, nothing may add an implicit global, a
// window write or read, a capture off window at load, a bare reference across
// the classic/module boundary, an import cycle or a layer violation. Every
// set in tests/baseline/ms70-dependency-baseline.json may only shrink.
//
// The 70A gate says the audit must catch a deliberately injected implicit
// global, a bare cross-boundary reference and an injected cycle before it is
// trusted; the first describe injects each into a small synthetic
// application, where the answer is known.

const app = (entries, classic = ['src/legacy.js']) => auditSources(new Map(Object.entries(entries)), classic);
const keys = (list) => list.map((x) => `${x.file}::${x.name}`);

describe('fault injection: the audit sees what it must (the 70A gate)', () => {
  test('an implicit global: every top-level declaration of a classic script, whatever its kind', () => {
    const r = app({ 'src/legacy.js': 'function extra() {}\nvar v = 1;\nlet lexical = 2;\nconst k = 3;\nclass C {}\n(function () { function notTopLevel() {} })();' });
    expect(r.classicDeclarations.map((d) => `${d.name}:${d.kind}`)).toEqual(['extra:function', 'v:var', 'lexical:let', 'k:const', 'C:class']);
  });

  test('a bare cross-boundary reference from a module to a classic global -- and not a name the module binds itself', () => {
    const r = app({
      'src/legacy.js': 'function extra() {}\nfunction shadowed() {}\nfunction param() {}\nfunction imported() {}',
      'src/mod.js': [
        "import { imported } from './other.js';",
        'export function f(param) { const shadowed = 1; return extra() + shadowed + param + imported; }',
        'try { x(); } catch (extra2) { extra2; }',
      ].join('\n'),
      'src/other.js': 'export const imported = 1;',
    });
    expect(keys(r.bareCrossBoundary)).toEqual(['src/mod.js::extra']);
  });

  test('a bare reference from the classic script to a global only a module publishes', () => {
    const r = app({
      'src/legacy.js': 'function useIt() { return published(); }\nfunction own() {} own();',
      'src/mod.js': 'window.published = () => 1;',
    });
    expect(keys(r.bareCrossBoundary)).toEqual(['src/legacy.js::published']);
  });

  test('hoisting and block scope resolve like JavaScript: a later declaration binds, a sibling block does not', () => {
    const r = app({
      'src/legacy.js': 'function extra() {}\nfunction leaked() {}',
      'src/mod.js': [
        'export function f() { return later(); }',
        'function later() { return 1; }',
        'if (true) { const leaked = 1; }',
        'export const g = () => leaked;',
      ].join('\n'),
    });
    expect(keys(r.bareCrossBoundary)).toEqual(['src/mod.js::leaked']);
  });

  test('an import cycle is found; a dynamic import does not make one', () => {
    const r = app({
      'src/a.js': "import './b.js';",
      'src/b.js': "import './a.js';",
      'src/c.js': "export const load = () => import('./d.js');",
      'src/d.js': "import './c.js';",
    }, []);
    expect(r.cycles).toEqual([['src/a.js', 'src/b.js']]);
  });

  test('window writes, including defineProperty, and captures off window at load versus inside a function', () => {
    const r = app({
      'src/legacy.js': '',
      'src/mod.js': [
        'window.a = 1;',
        "Object.defineProperty(window, 'b', { get() { return 1; } });",
        'const { c } = window;',
        'export function later() { const { d } = window; return window.e; }',
      ].join('\n'),
    });
    expect(r.windowWrites.map((w) => w.name)).toEqual(['a', 'b']);
    expect(r.windowDestructures.map((d) => `${d.name}:${d.evalTime}`)).toEqual(['c:true', 'd:false']);
    expect(r.unownedWindowReads.map((u) => u.name)).toEqual(['c', 'd', 'e']);
  });

  test('a window read of a classic let/const, which is not a window property, is reported', () => {
    const r = app({ 'src/legacy.js': 'const K = 1;\nfunction F() {}', 'src/mod.js': 'export const x = window.K + window.F();' });
    expect(keys(r.lexicalOnlyWindowReads)).toEqual(['src/mod.js::K']);
  });

  test('layer rules: core may not import a feature or the bootstrap; one feature may not import another', () => {
    expect(layerViolation('src/core/x.js', 'src/features/a/y.js')).toBe('core-imports-feature-or-bootstrap');
    expect(layerViolation('src/core/x.js', 'src/main.js')).toBe('core-imports-feature-or-bootstrap');
    expect(layerViolation('src/features/a/x.js', 'src/features/b/y.js')).toBe('feature-imports-other-feature');
    expect(layerViolation('src/features/a/x.js', 'src/features/a/y.js')).toBeNull();
    expect(layerViolation('src/features/a/x.js', 'src/core/y.js')).toBeNull();
  });

  test('a module nothing loads publishes nothing: its window.X does not count, and it is listed', () => {
    // Milestone 42E deleted legacy-app.js's pruneBlankCards() as a twin of
    // prune-cards.js's -- but nothing imported prune-cards.js, so pruning
    // silently stopped. Reachability is what would have caught it.
    const r = auditSources(new Map(Object.entries({
      'src/legacy.js': '',
      'src/main.js': ["import './a.js';", "export const lazy = () => import('./lazy.js');"].join('\n'),
      'src/a.js': 'export const run = () => window.orphaned() + window.lazyPublished();',
      'src/lazy.js': 'window.lazyPublished = () => 1;',
      'src/orphan.js': 'window.orphaned = () => 1;',
    })), ['src/legacy.js'], ['src/main.js']);
    expect(r.unreachableModules).toEqual(['src/orphan.js']);
    expect(r.unownedWindowReads.map((u) => u.name)).toEqual(['orphaned']);
  });

  test('computed window lookups: known name builders resolve to their names; every other one is recorded', () => {
    // router.js and ward-lifecycle.js mount filings with
    // window[mountFeatureFnName(engine)]; missing it made the first
    // dispositions pass call all seven mount functions dead.
    const r = auditSources(new Map(Object.entries({
      'src/legacy.js': ['function mountAnnualFeature(){}', 'const TABLE=[];', 'window.TABLE=TABLE;'].join('\n'),
      'src/core/filing/filing-descriptor.js': "export const D = { a: { engineId: 'annual' } };",
      'src/router.js': [
        "import './core/filing/filing-descriptor.js';",
        'const mountFeatureFnName = (e) => e;',
        'const legacyGlobal = (n) => window[n];',
        "export const go = (engine) => window[mountFeatureFnName(engine)]() + legacyGlobal('TABLE').length;",
      ].join('\n'),
    })), ['src/legacy.js']);
    const reads = r.windowReads.filter((w) => w.file === 'src/router.js').map((w) => `${w.name}:${w.via}`);
    expect(reads).toEqual(expect.arrayContaining(['mountAnnualFeature:mountFeatureFnName', 'TABLE:legacyGlobal']));
    expect(r.computedWindowReads.filter((c) => !c.resolved).map((c) => c.text)).toEqual(['n']);
  });

  test('the comparison reports growth and staleness separately', () => {
    const cmp = compareRatchet({ s: ['kept', 'new'] }, { s: ['kept', 'gone'] });
    expect(cmp.s).toEqual({ grown: ['new'], stale: ['gone'] });
  });

  test('classic scripts come from index.html, excluding vendored lib/ and module scripts', () => {
    expect(classicScriptsFromHtml('<script src="./src/prepaint.js"></script><script src="lib/jszip.min.js"></script><script type="module" src="./src/main.js"></script><script src="./src/legacy-app.js"></script>'))
      .toEqual(['src/prepaint.js', 'src/legacy-app.js']);
    expect(moduleEntriesFromHtml('<script src="./src/legacy-app.js"></script><script type="module" src="./src/main.js"></script>')).toEqual(['src/main.js']);
  });
});

describe('the application against the MS 70 baseline', () => {
  const baseline = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', BASELINE_PATH), 'utf8'));
  const cmp = compareRatchet(ratchetSets(auditApplication(path.join(__dirname, '..', '..'))), baseline);

  for (const key of Object.keys(cmp)) {
    test(`${key}: nothing new (the ratchet), and nothing stale (a shrink is locked in)`, () => {
      expect(cmp[key].grown, `new ${key} -- forbidden during MS 70 unless MILESTONE-70-PROPOSAL.md records an exception`).toEqual([]);
      expect(cmp[key].stale, `${key} shrank -- confirm it was deliberate, then run node scripts/ms70-dependency-audit.mjs --write-baseline`).toEqual([]);
    });
  }
});
