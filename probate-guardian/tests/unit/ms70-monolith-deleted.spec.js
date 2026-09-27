import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';
import { parse } from 'acorn';
import { PLATFORM } from '../../scripts/audit-window-bridge.mjs';
import { classicScripts } from './support/classic-scripts.js';

// Milestone 70, 70L: completion criteria 1 and 9, held mechanically.
//
//   1. src/legacy-app.js is absent, with no script tag, static-copy rule,
//      service-worker asset, documentation claim, or test path referring to it
//      as live code.
//   9. ... legacy-source-extract.js is gone unless a separately documented
//      non-legacy use justifies a renamed general helper; no unit test carries
//      a hand-copied mirror of application code or stubs `window` to supply
//      application globals.
//
// A documentation claim is prose, which no test can read for meaning; what is
// held here is every place that loads, copies, caches, reads or records the
// file as a path. The comments were swept by hand in 70L (its build record).

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const walk = (dir, re) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory()
  ? (['node_modules', 'baseline', 'fixtures'].includes(e.name) ? [] : walk(path.join(dir, e.name), re))
  : re.test(e.name) ? [path.join(dir, e.name)] : []));
const rel = (f) => path.relative(root, f).split(path.sep).join('/');
const MONOLITH = 'src/legacy-app.js';

describe('criterion 1: the monolith is gone, and nothing loads, copies, caches or records it', () => {
  test('the file is absent, and index.html loads one classic script of its own, the pre-paint theme', () => {
    expect(fs.existsSync(path.join(root, MONOLITH)), MONOLITH).toBe(false);
    expect(read('index.html')).not.toContain('legacy-app');
    expect(classicScripts()).toEqual(['src/prepaint.js']);
  });

  test('neither build copies it, and the service worker does not list it', () => {
    expect(read('vite.config.js')).not.toMatch(/src:\s*'src\/legacy-app\.js'/);
    expect(read('scripts/generate-service-worker.mjs')).not.toContain('legacy-app');
  });

  // The data model's source_file column named it for 244 fields until 70L
  // (scripts/verify-data-model.mjs now checks that every named file exists).
  test('no row of the data model names it as a field\'s source', () => {
    expect(read('probate-guardian-data-model.csv')).not.toContain(MONOLITH);
  });

  // A path literal is how a spec or script reads a file. Two are left, each
  // there to find the file gone: the dispositions script's
  // (ms70-declaration-dispositions.spec.js holds it) and this spec's.
  test('no test or script names it as a path to read', () => {
    const literal = /['"`](?:\.\.\/)*(?:src\/)?legacy-app\.js['"`]/;
    const files = [...walk(path.join(root, 'tests'), /\.(js|ts|mjs)$/), ...walk(path.join(root, 'scripts'), /\.(js|mjs)$/)];
    const found = files.filter((f) => literal.test(fs.readFileSync(f, 'utf8'))).map(rel);
    expect(found.sort()).toEqual(['scripts/ms70-declaration-dispositions.mjs', 'tests/unit/ms70-monolith-deleted.spec.js']);
  });
});

describe('criterion 9: no unit test slices the monolith, mirrors application code, or supplies an application global', () => {
  // Renamed tests/unit/support/source-slice.js, whose header documents its
  // three remaining uses: each reads an ES module.
  test('the legacy slicing helper is gone', () => {
    expect(fs.existsSync(path.join(root, 'tests/unit/support/legacy-source-extract.js'))).toBe(false);
    const specs = walk(path.join(root, 'tests', 'unit'), /\.js$/).filter((f) => !f.endsWith('ms70-monolith-deleted.spec.js'));
    const uses = /from\s+['"][^'"]*legacy-source-extract|\bextractLegacyFunction\s*\(|\bLEGACY_APP\b/;
    expect(specs.filter((f) => uses.test(fs.readFileSync(f, 'utf8'))).map(rel)).toEqual([]);
  });

  // Eleven specs still put the monolith's helpers and the Plans' lists on
  // window at 70K, which nothing read any more; one of them made a test
  // vacuous (validation-issue.spec.js's acknowledgement). An empty `window`,
  // for a module that checks the platform exists, supplies nothing.
  const TRAPS = {
    // Stubbed to prove it is ignored: until 70B setCell() delegated to a
    // window.sanitizeForExcel when one existed.
    'tests/unit/excel-engine.spec.js': ['sanitizeForExcel'],
  };
  const ALLOWED = new Set([...PLATFORM, 'GuardianForms', '__GUARDIAN_FORMS_TEST_MODE__']);
  const isWin = (n) => n && ((n.type === 'Identifier' && n.name === 'window')
    || (n.type === 'MemberExpression' && !n.computed && n.property.name === 'window'
        && n.object.type === 'Identifier' && ['global', 'globalThis'].includes(n.object.name)));
  const keysOf = (obj) => (obj?.type === 'ObjectExpression'
    ? obj.properties.flatMap((p) => (p.type === 'Property' && !p.computed ? [p.key.name ?? p.key.value]
      : p.type === 'SpreadElement' && p.argument.type === 'CallExpression' ? [`...${p.argument.callee.name ?? '(call)'}()`] : []))
    : []);
  function windowNames(source) {
    const names = new Set();
    (function visit(n) {
      if (!n || typeof n.type !== 'string') return;
      if (n.type === 'AssignmentExpression' && n.left.type === 'MemberExpression' && !n.left.computed && isWin(n.left.object)) names.add(n.left.property.name);
      if (n.type === 'AssignmentExpression' && isWin(n.left)) keysOf(n.right).forEach((k) => names.add(k));
      if (n.type === 'CallExpression' && n.callee.type === 'MemberExpression' && !n.callee.computed) {
        if (n.callee.property.name === 'stubGlobal' && n.arguments[0]?.value === 'window') keysOf(n.arguments[1]).forEach((k) => names.add(k));
        if (n.callee.property.name === 'assign' && isWin(n.arguments[0])) keysOf(n.arguments[1]).forEach((k) => names.add(k));
      }
      for (const k of Object.keys(n)) {
        const c = n[k];
        if (Array.isArray(c)) c.forEach(visit); else if (c && typeof c.type === 'string') visit(c);
      }
    })(parse(source, { ecmaVersion: 'latest', sourceType: 'module' }));
    return [...names];
  }

  test('reads each way a spec can put a name on window', () => {
    const src = [
      "window.a = 1; globalThis.window.b = 2;",
      "global.window = { c: 1, ...makeStub(), ...(global.window || {}) };",
      "vi.stubGlobal('window', { d: 1, location: {} });",
      "Object.assign(window, { e: 1 });",
      "const notWindow = { f: 1 }; globalThis.window = globalThis.window || {};",
    ].join('\n');
    expect(windowNames(src).sort()).toEqual(['...makeStub()', 'a', 'b', 'c', 'd', 'e', 'location'].sort());
  });

  test('no unit spec puts an application name on window', () => {
    const found = {};
    for (const f of walk(path.join(root, 'tests', 'unit'), /\.js$/)) {
      const names = windowNames(fs.readFileSync(f, 'utf8')).filter((n) => !ALLOWED.has(n) && !(TRAPS[rel(f)] || []).includes(n));
      if (names.length) found[rel(f)] = names.sort();
    }
    expect(found).toEqual({});
  }, 60_000);
});
