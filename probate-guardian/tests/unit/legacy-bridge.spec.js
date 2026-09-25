import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { describe, expect, test } from 'vitest';
import { parse } from 'acorn';
import { LEGACY_BRIDGE } from '../../src/legacy-bridge.js';
import { declarationsOf } from '../../scripts/ms70-declaration-dispositions.mjs';

// Milestone 70: src/legacy-bridge.js is how the classic monolith reaches code
// that has moved into ES modules (legacy-app.js cannot import). It is the one
// ratchet exception MILESTONE-70-PROPOSAL.md records for the transition, so the
// rules in its header are held here mechanically rather than by review:
//   - only legacy-app.js reads it, and only inside functions (it loads before
//     any module, so a top-level read would find nothing and throw on every
//     page load);
//   - no module reads it -- modules import;
//   - every member is the module's own implementation, imported, and is here
//     only while a wrapper in legacy-app.js still calls it;
//   - a wrapper is kept only while something still calls it: code in
//     legacy-app.js, or a module that reads it off window, which the dependency
//     ratchet lists and may only shrink (70D's getWardProgress(), which the
//     dashboard still captures, is the delegating dispatcher the plan allows
//     until that read goes);
//   - a wrapper is one line that forwards and nothing else. It may hand the
//     module what the monolith still owns (70D's computeNavChecks() passes
//     window.D and its own activeInventoryType) -- arguments, never logic.

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const BRIDGE = 'GuardianFormsLegacyBridge';
const legacySrc = read('src/legacy-app.js');
const legacyAst = parse(legacySrc, { ecmaVersion: 'latest', sourceType: 'script' });
// Wrappers that hand the module state the monolith still owns (the open
// filing, its own activeInventoryType, callbacks into itself), each named.
const STATE_PASSING = new Set(['computeNavChecks', 'getWardProgress']);

const walkFiles = (dir) => fs.readdirSync(path.join(root, dir), { withFileTypes: true }).flatMap((e) => {
  const rel = `${dir}/${e.name}`;
  if (e.isDirectory()) return walkFiles(rel);
  return /\.(js|mjs|ts)$/.test(e.name) ? [rel] : [];
});

// Every `window.GuardianFormsLegacyBridge` member expression, with whether it
// sits inside any function (declaration, expression or arrow).
function bridgeReads(ast) {
  const found = [];
  const visit = (node, inFunction, parent) => {
    if (!node || typeof node.type !== 'string') return;
    const fn = inFunction || /Function/.test(node.type);
    if (node.type === 'MemberExpression' && !node.computed && node.object.type === 'Identifier'
        && node.object.name === 'window' && node.property.name === BRIDGE) {
      const member = parent && parent.type === 'MemberExpression' && parent.object === node && !parent.computed
        ? parent.property.name : null;
      found.push({ inFunction: fn, member, start: node.start });
    }
    for (const key of Object.keys(node)) {
      const child = node[key];
      if (Array.isArray(child)) child.forEach((c) => visit(c, fn, node));
      else if (child && typeof child.type === 'string') visit(child, fn, node);
    }
  };
  visit(ast, false, null);
  return found;
}

describe('src/legacy-bridge.js: the monolith\'s one door to module code', () => {
  test('is frozen, and every member is a module export -- no logic of its own', async () => {
    expect(Object.isFrozen(LEGACY_BRIDGE)).toBe(true);
    const bridgeSrc = read('src/legacy-bridge.js');
    const imports = parse(bridgeSrc, { ecmaVersion: 'latest', sourceType: 'module' }).body
      .filter((s) => s.type === 'ImportDeclaration');
    const origin = new Map();
    for (const imp of imports) {
      for (const sp of imp.specifiers) origin.set(sp.local.name, { from: imp.source.value, name: sp.imported.name });
    }
    for (const key of Object.keys(LEGACY_BRIDGE)) {
      const o = origin.get(key);
      expect(o, `${key} must be imported into legacy-bridge.js, not defined there`).toBeTruthy();
      const mod = await import(pathToFileURL(path.join(root, 'src', o.from)).href);
      expect(LEGACY_BRIDGE[key], `${key} must be ${o.from}'s own export`).toBe(mod[o.name]);
    }
  });

  test('main.js imports it before initApp() -- the first moment a legacy function runs', () => {
    const main = read('src/main.js');
    const at = main.indexOf("import './legacy-bridge.js';");
    expect(at).toBeGreaterThan(-1);
    expect(at).toBeLessThan(main.indexOf('window.initApp();'));
  });

  test('legacy-app.js reads it only inside functions', () => {
    const reads = bridgeReads(legacyAst);
    expect(reads.length).toBeGreaterThan(0);
    const topLevel = reads.filter((r) => !r.inFunction)
      .map((r) => legacySrc.slice(r.start, legacySrc.indexOf('\n', r.start)));
    expect(topLevel, 'a top-level read runs before main.js has installed the bridge').toEqual([]);
  });

  test('legacy-app.js names only members that exist, and every member still has a caller there', () => {
    const used = new Set(bridgeReads(legacyAst).map((r) => r.member));
    expect(used.has(null), 'the bridge must be read as window.GuardianFormsLegacyBridge.<member>').toBe(false);
    const members = new Set(Object.keys(LEGACY_BRIDGE));
    expect([...used].filter((m) => !members.has(m)), 'read but not on the bridge').toEqual([]);
    expect([...members].filter((m) => !used.has(m)), 'on the bridge but no longer called: remove it').toEqual([]);
  });

  test('a function member is reached only through a one-line wrapper of its own name', () => {
    // A wrapper is a top-level function whose whole body is one return of the
    // bridge call; any other function may read only a data member (the county
    // list), never call through to logic from the middle of its own.
    const users = legacyAst.body.filter((st) => st.type === 'FunctionDeclaration'
      && legacySrc.slice(st.start, st.end).includes(BRIDGE));
    const isWrapper = (fn) => fn.body.body.length === 1 && fn.body.body[0].type === 'ReturnStatement'
      && fn.body.body[0].argument?.type === 'CallExpression'
      && legacySrc.slice(fn.body.body[0].argument.callee.start, fn.body.body[0].argument.callee.end).startsWith(`window.${BRIDGE}.`);
    const wrappers = users.filter(isWrapper);
    expect(wrappers.length).toBeGreaterThan(0);
    for (const fn of wrappers) {
      const text = legacySrc.slice(fn.start, fn.end);
      const call = fn.body.body[0].argument;
      expect(text.includes('\n'), `${fn.id.name} must be one line`).toBe(false);
      expect(call && call.type === 'CallExpression' && call.callee.type === 'MemberExpression'
        && legacySrc.slice(call.callee.start, call.callee.end) === `window.${BRIDGE}.${fn.id.name}`,
      `${fn.id.name} must return the bridge member of its own name, called`).toBe(true);
      // The usual wrapper passes its parameters straight through; a wrapper
      // that hands over monolith state instead is listed here, by name.
      const params = fn.params.map((p) => p.name).join(',');
      const args = legacySrc.slice(call.arguments[0]?.start ?? call.end - 1, call.end - 1);
      if (!STATE_PASSING.has(fn.id.name)) expect(args, `${fn.id.name} passes its own parameters, nothing else`).toBe(params);
    }
    for (const fn of users.filter((f) => !isWrapper(f))) {
      const inside = bridgeReads(fn).map((r) => r.member);
      const called = inside.filter((m) => typeof LEGACY_BRIDGE[m] === 'function');
      expect(called, `${fn.id.name} calls module logic through the bridge; give it a wrapper`).toEqual([]);
    }
    // A top-level constant that forwards keeps the same one-line shape: an
    // arrow wrapper (fmt) or a Proxy onto an object member (calc).
    for (const st of legacyAst.body.filter((s) => s.type === 'VariableDeclaration'
      && legacySrc.slice(s.start, s.end).includes(BRIDGE))) {
      const text = legacySrc.slice(st.start, st.end);
      const { id, init } = st.declarations[0];
      const params = init.type === 'ArrowFunctionExpression' ? init.params.map((p) => p.name).join(',') : null;
      const shapes = [
        `const ${id.name}=(${params})=>window.${BRIDGE}.${id.name}(${params});`,
        `const ${id.name}=new Proxy({},{get:(_,k)=>window.${BRIDGE}.${id.name}[k]});`,
      ];
      expect(shapes, `${id.name} must only forward`).toContain(text);
    }
  });

  test('every wrapper still has a caller -- one with none is deleted, not kept', () => {
    const forwarders = declarationsOf(legacySrc).filter((d) => d.lines === 1
      && legacySrc.split('\n')[d.line - 1].includes(`window.${BRIDGE}.`));
    expect(forwarders.length).toBeGreaterThan(0);
    // Modules that still read a name off window, as the ratchet records them.
    const ratchet = JSON.parse(read('tests/baseline/ms70-dependency-baseline.json'));
    const moduleReads = new Set([...ratchet.windowReads, ...ratchet.evalTimeWindowDestructures]
      .filter((k) => !k.startsWith('src/legacy-app.js::')).map((k) => k.split('::')[1]));
    expect(forwarders.filter((d) => d.internalRefs === 0 && !moduleReads.has(d.name)).map((d) => d.name)).toEqual([]);
  });

  test('no other source file reads or writes it', () => {
    const allowed = new Set(['src/legacy-app.js', 'src/legacy-bridge.js', 'src/core/types/window-bridge.d.ts']);
    const offenders = walkFiles('src').filter((rel) => !allowed.has(rel) && read(rel).includes(BRIDGE));
    expect(offenders, 'modules import the implementation; the bridge is only for the classic script').toEqual([]);
  });
});
