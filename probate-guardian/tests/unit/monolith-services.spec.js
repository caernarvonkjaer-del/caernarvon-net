import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, test, vi } from 'vitest';
import { parse } from 'acorn';

// Milestone 70: src/core/runtime/monolith.js, the door from the classic
// monolith into moved code the other way round -- the functions of
// legacy-app.js that modules call back, handed in once when initApp() starts.
// The second transition exception MILESTONE-70-PROPOSAL.md records (70E); it
// goes with the monolith in 70L. Its rules, held here mechanically:
//   - legacy-app.js provides, once, from the start of initApp(), through its
//     one-line bridge wrapper, and only functions it declares;
//   - modules call a service only inside a function, as monolith.<name>();
//   - every provided name is called by some module, and every called name is
//     provided -- a service goes when its last caller moves or it does.

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const walk = (dir) => fs.readdirSync(path.join(root, dir), { withFileTypes: true }).flatMap((e) => {
  const rel = `${dir}/${e.name}`;
  return e.isDirectory() ? walk(rel) : /\.js$/.test(e.name) ? [rel] : [];
});
const visit = (node, fn, inFunction = false) => {
  if (!node || typeof node.type !== 'string') return;
  const fnNow = inFunction || /Function/.test(node.type);
  fn(node, inFunction);
  for (const k of Object.keys(node)) {
    const c = node[k];
    if (Array.isArray(c)) c.forEach((x) => visit(x, fn, fnNow)); else if (c && typeof c.type === 'string') visit(c, fn, fnNow);
  }
};

const legacySrc = read('src/legacy-app.js');
const legacyAst = parse(legacySrc, { ecmaVersion: 'latest', sourceType: 'script' });
const declared = new Set(legacyAst.body.flatMap((s) => (s.type === 'FunctionDeclaration' ? [s.id.name]
  : s.type === 'VariableDeclaration' ? s.declarations.filter((d) => d.id.type === 'Identifier').map((d) => d.id.name) : [])));

// What legacy-app.js hands in: the object literal of every provideMonolithServices() call.
function provisions() {
  const calls = [];
  const initApp = legacyAst.body.find((s) => s.type === 'FunctionDeclaration' && s.id.name === 'initApp');
  visit(legacyAst, (node) => {
    if (node.type === 'CallExpression' && node.callee.type === 'Identifier' && node.callee.name === 'provideMonolithServices') {
      calls.push({
        inInitApp: node.start > initApp.start && node.end < initApp.end,
        names: node.arguments[0].properties.map((p) => p.key.name),
        shorthandOnly: node.arguments[0].properties.every((p) => p.shorthand),
      });
    }
  });
  return calls;
}

// Every `monolith.<name>` in a module, with whether it sits inside a function.
function moduleCalls() {
  const found = [];
  for (const rel of walk('src').filter((f) => f !== 'src/legacy-app.js' && f !== 'src/prepaint.js')) {
    const src = read(rel);
    if (!src.includes('monolith')) continue;
    visit(parse(src, { ecmaVersion: 'latest', sourceType: 'module' }), (node, inFunction) => {
      if (node.type === 'MemberExpression' && !node.computed && node.object.type === 'Identifier' && node.object.name === 'monolith') {
        found.push({ rel, name: node.property.name, inFunction });
      }
    });
  }
  return found;
}

describe('src/core/runtime/monolith.js: the monolith\'s functions, handed in once', () => {
  test('legacy-app.js provides once, from the start of initApp(), only functions it declares', () => {
    const calls = provisions();
    expect(calls).toHaveLength(1);
    expect(calls[0].inInitApp).toBe(true);
    expect(calls[0].shorthandOnly, 'hand in the function itself ({ autoSave }), nothing computed').toBe(true);
    expect(calls[0].names.filter((n) => !declared.has(n))).toEqual([]);
    const wrapper = legacySrc.split('\n').find((l) => l.startsWith('function provideMonolithServices('));
    expect(wrapper).toBe('function provideMonolithServices(fns){return window.GuardianFormsLegacyBridge.provideMonolithServices(fns);}');
  });

  test('modules call a service only inside a function, and every provided name is called, every called name provided', () => {
    const calls = moduleCalls();
    expect(calls.filter((c) => !c.inFunction).map((c) => `${c.rel} monolith.${c.name}`), 'nothing is provided while modules evaluate').toEqual([]);
    const called = [...new Set(calls.map((c) => c.name))].sort();
    const provided = [...provisions()[0].names].sort();
    expect(called, 'called but never provided').toEqual(called.filter((n) => provided.includes(n)));
    expect(provided, 'provided but no module calls it -- remove it').toEqual(provided.filter((n) => called.includes(n)));
  }, 60_000);

  test('a service is the function handed in; one never handed in throws instead of doing nothing', async () => {
    vi.resetModules();
    const m = await import('../../src/core/runtime/monolith.js');
    const autoSave = () => 'saved';
    m.provideMonolithServices({ autoSave });
    expect(m.monolith.autoSave).toBe(autoSave);
    expect(m.monolith.autoSave()).toBe('saved');
    expect(m.providedMonolithServiceNames()).toEqual(['autoSave']);
    expect(() => m.monolith.updateNavDots()).toThrow('was not provided');
    expect(() => m.provideMonolithServices({ autoSave: 'not a function' })).toThrow('is not a function');
  });
});
