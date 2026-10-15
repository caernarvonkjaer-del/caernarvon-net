import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';
import { discoverSpecs, root, toAst, walk } from '../../scripts/test-source-analysis.mjs';
import { CROSS_BROWSER_SMOKE_SPECS, MANIFEST_PATH, PROFILES, profileSpecs, readManifest } from '../../scripts/run-e2e-profile.mjs';

// TEST-REVIEW.md Delivery 4 prototype (4P, 2026-10-14): the governance check
// over tests/profile-manifest.json, the one place the release's curated spec
// lists live. Two rules, and a boundary:
//   1. every path the manifest names is a spec that exists;
//   2. a spec that branches on a built target -- `currentTarget === 'web'`,
//      `target !== 'portable'` through a `const target = currentTarget`
//      alias, `currentTarget === 'portable-http'` -- is a member of that
//      target's list, so the branch runs somewhere (a web-only case left out
//      of the web profile would never run, and nothing would say so);
//   3. the source profile is the whole suite and lists nothing: an ordinary
//      spec needs no registration, and this check never asks for one.
// The branch grammar is the test-source-analysis helper's: a plain comparison
// of `currentTarget` (or a const assigned from it) with a string literal.

export const TARGETS = ['web', 'portable', 'portable-http'];

/** The built targets a spec compares the current target with. */
export function declaredTargets(ast) {
  const aliases = new Set(['currentTarget']);
  walk(ast, (node) => {
    if (node.type === 'VariableDeclarator' && node.id.type === 'Identifier' && node.init?.type === 'Identifier' && aliases.has(node.init.name)) aliases.add(node.id.name);
  });
  const targets = new Set();
  walk(ast, (node) => {
    if (node.type !== 'BinaryExpression' || !['===', '!==', '==', '!='].includes(node.operator)) return;
    const sides = [node.left, node.right];
    const name = sides.find((s) => s.type === 'Identifier' && aliases.has(s.name));
    const literal = sides.find((s) => s.type === 'Literal' && typeof s.value === 'string');
    if (name && literal && TARGETS.includes(literal.value)) targets.add(literal.value);
  });
  return [...targets].sort();
}

/** Rule 1 as a function: paths that do not exist, and paths listed twice in one list. */
export function manifestProblems(manifest, exists) {
  const problems = [];
  for (const [name, p] of Object.entries(manifest.profiles)) {
    for (const s of p.specs) {
      if (!exists(s)) problems.push(`${name}: ${s} is not a spec that exists`);
      if (p.specs.indexOf(s) !== p.specs.lastIndexOf(s) && p.specs.indexOf(s) === p.specs.indexOf(s)) { /* reported once below */ }
    }
    for (const dup of [...new Set(p.specs.filter((s, i) => p.specs.indexOf(s) !== i))]) problems.push(`${name}: ${dup} is listed twice`);
  }
  return problems;
}

/** Rule 2 over analysed specs: [{ file, targets }] against the manifest's lists. */
export function membershipProblems(declared, manifest) {
  const problems = [];
  for (const { file, targets } of declared) {
    for (const t of targets) {
      if (!profileSpecs(manifest, t).includes(file)) problems.push(`${file} branches on the ${t} target but is not in the ${t} profile's list (${MANIFEST_PATH})`);
    }
  }
  return problems;
}

describe('tests/profile-manifest.json', () => {
  const manifest = readManifest();

  test('names only specs that exist, once each per list, and the runner reads it', () => {
    const specs = new Set(discoverSpecs(['tests/e2e']));
    expect(manifestProblems(manifest, (p) => specs.has(p))).toEqual([]);
    expect(PROFILES.web.specs).toEqual(profileSpecs(manifest, 'web'));
    expect(PROFILES['portable-http'].specs).toEqual(profileSpecs(manifest, 'portable-http'));
    expect(PROFILES.quick.specs).toEqual(manifest.profiles.quick.specs);
    expect(CROSS_BROWSER_SMOKE_SPECS).toEqual(manifest.profiles['cross-browser'].specs);
  });

  test('a stale path and a duplicate path are reported by name (Delivery 4 faults)', () => {
    const out = { profiles: { web: { specs: ['tests/e2e/a.spec.ts', 'tests/e2e/gone.spec.ts', 'tests/e2e/a.spec.ts'] } } };
    expect(manifestProblems(out, (p) => p === 'tests/e2e/a.spec.ts')).toEqual(['web: tests/e2e/gone.spec.ts is not a spec that exists', 'web: tests/e2e/a.spec.ts is listed twice']);
  });

  test('a spec that branches on two targets and sits in neither list is reported for each (excluded in every declared profile)', () => {
    const out = { profiles: { web: { target: 'web', specs: [] }, portable: { target: 'portable', specs: [] }, 'portable-http': { target: 'portable-http', extends: 'portable', specs: [] } } };
    expect(membershipProblems([{ file: 'tests/e2e/x.spec.ts', targets: ['portable', 'web'] }], out).length).toBe(2);
  });

  test('every spec that branches on a built target is a member of that target\'s profile', async () => {
    const declared = [];
    for (const file of discoverSpecs(['tests/e2e'])) {
      const targets = declaredTargets(await toAst(file));
      if (targets.length) declared.push({ file, targets });
    }
    expect(declared.length, 'specs that branch on a target').toBeGreaterThan(3);
    expect(membershipProblems(declared, manifest)).toEqual([]);
  }, 120_000);

  test('the source profile lists nothing: an ordinary spec is run without registration', () => {
    expect(PROFILES.source.specs).toBeNull();
    const everyWebOrPortable = new Set(TARGETS.flatMap((t) => profileSpecs(manifest, t)));
    const unregistered = discoverSpecs(['tests/e2e']).filter((f) => !everyWebOrPortable.has(f));
    expect(unregistered.length, 'ordinary specs outside every curated list').toBeGreaterThan(100);
  });
});

describe('the rules on synthetic inputs (4P faults)', () => {
  test('a web-only spec left out of the web list is reported; registered, it is not', async () => {
    const ast = await toAst('x.spec.ts', "import { currentTarget } from './support/target-profile';\nconst webTarget = currentTarget === 'web';\ntest('x', () => {});\n");
    expect(declaredTargets(ast)).toEqual(['web']);
    const out = { profiles: { web: { target: 'web', specs: [] }, portable: { target: 'portable', specs: [] }, 'portable-http': { target: 'portable-http', extends: 'portable', specs: [] } } };
    expect(membershipProblems([{ file: 'tests/e2e/x.spec.ts', targets: ['web'] }], out)).toEqual([`tests/e2e/x.spec.ts branches on the web target but is not in the web profile's list (${MANIFEST_PATH})`]);
    out.profiles.web.specs.push('tests/e2e/x.spec.ts');
    expect(membershipProblems([{ file: 'tests/e2e/x.spec.ts', targets: ['web'] }], out)).toEqual([]);
  });

  test('an aliased comparison and a portable-http one are read; a capability check and a source comparison are not memberships', async () => {
    const ast = await toAst('y.spec.ts', "import { currentTarget, currentTargetProfile } from './support/target-profile';\nconst target = currentTarget;\nif (target !== 'portable') {}\nif (currentTarget === 'portable-http') {}\nif (currentTarget === 'source') {}\nif (!currentTargetProfile?.supportsServiceWorker) {}\n");
    expect(declaredTargets(ast)).toEqual(['portable', 'portable-http']);
  });

  test('a spec a portable-http list inherits from portable counts as a member', () => {
    const out = { profiles: { portable: { target: 'portable', specs: ['tests/e2e/a.spec.ts'] }, 'portable-http': { target: 'portable-http', extends: 'portable', specs: [] }, web: { target: 'web', specs: [] } } };
    expect(profileSpecs(out, 'portable-http')).toEqual(['tests/e2e/a.spec.ts']);
    expect(membershipProblems([{ file: 'tests/e2e/a.spec.ts', targets: ['portable-http'] }], out)).toEqual([]);
  });
});
