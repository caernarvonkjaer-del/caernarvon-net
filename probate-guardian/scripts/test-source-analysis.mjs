// TEST-REVIEW.md Delivery 2 (T6, T7, T9; section 4.5): the one place that
// finds test source files and reads them as syntax trees. Mechanics only --
// recursive discovery from explicit roots, the TypeScript transform, parsing,
// walking, and the small grammar of test-API calls the guards share. Each
// guard (tests/unit/test-index-guard.spec.js, skip-classification-audit.spec.js,
// scripts/ms70-assertion-counts.mjs) keeps its own policy and its own
// failure messages, and none of them depends on another's rule.
//
// The grammar, deliberately small (Delivery 2's parser boundary):
//   - A test API is reached by its conventional local name -- test, it,
//     describe, expect -- or by a name an import binds to one of them
//     (`import { test as base } from '@playwright/test'`). Playwright's and
//     Vitest's modules are the only sources an alias is read from.
//   - A modifier is a plain property chain on such a name: test.skip,
//     test.only, test.fixme, test.describe.skip, describe.only, it.todo.
//   - Anything that looks like a disabling call but is not in that grammar --
//     a computed property (`test['skip']`), a chain on a name nothing here
//     binds (`t.skip` after `const t = test`), a chain on a call result
//     (`test.extend({}).skip`) -- is reported for review, never guessed at.
//     Assignment tracking, re-exports through local modules, wrappers and
//     dynamically built APIs are out of scope by decision.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'acorn';
import { transformWithOxc } from 'vite';

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export const toPosix = (p) => p.split(path.sep).join('/');

/**
 * Every file under `dir`, recursively, as forward-slash paths relative to
 * `rootDir`, sorted. `dir` may be relative to `rootDir` or absolute.
 * Directories named in `skipDirs` are not entered, at any depth. A missing
 * `dir` yields nothing.
 */
export function listFiles(dir, { skipDirs = [], rootDir = root } = {}) {
  const base = path.isAbsolute(dir) ? dir : path.join(rootDir, dir);
  const out = [];
  const visit = (current) => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) { if (!skipDirs.includes(entry.name)) visit(full); }
      else out.push(toPosix(path.relative(rootDir, full)));
    }
  };
  if (fs.existsSync(base) && fs.statSync(base).isDirectory()) visit(base);
  return out.sort();
}

/** What a spec file is called: .spec.js or .spec.ts (the capture scripts are *.capture.ts and are not specs). */
export const SPEC_PATTERN = /\.spec\.(js|ts)$/;

/** The spec files under the given roots, recursively, repo-relative and sorted; support and fixture folders are not entered. */
export function discoverSpecs(roots, { skipDirs = ['support', 'fixtures'], pattern = SPEC_PATTERN, rootDir = root } = {}) {
  return roots.flatMap((dir) => listFiles(dir, { skipDirs, rootDir })).filter((f) => pattern.test(f)).sort();
}

/**
 * One file as an ESTree AST with locations in the file's own lines and
 * columns. TypeScript goes through Vite's OXC transform first, which
 * re-prints the code and drops comments (read those from `source` if a
 * guard needs them); its source map is applied back to every node's `loc`,
 * so a diagnostic names the line a reader can open. `file` is repo-relative
 * unless `source` is given.
 */
export async function toAst(file, source) {
  const text = source ?? fs.readFileSync(path.join(root, file), 'utf8');
  if (!/\.tsx?$/.test(file)) {
    return parse(text, { ecmaVersion: 'latest', sourceType: 'module', allowAwaitOutsideFunction: true, allowHashBang: true, locations: true });
  }
  const { code, map } = await transformWithOxc(text, file, { lang: 'ts' });
  const ast = parse(code, { ecmaVersion: 'latest', sourceType: 'module', allowAwaitOutsideFunction: true, allowHashBang: true, locations: true });
  const locate = sourceLocator(map);
  walk(ast, (node) => { if (node.loc) node.loc = { start: locate(node.loc.start), end: locate(node.loc.end) }; });
  return ast;
}

const VLQ = Object.fromEntries([...'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'].map((c, i) => [c, i]));

/** The "mappings" string of a version-3 source map, decoded: one array per generated line of [generatedColumn, sourceLine, sourceColumn] (0-based). */
export function decodeMappings(mappings) {
  const lines = [];
  let sourceLine = 0;
  let sourceColumn = 0;
  for (const line of mappings.split(';')) {
    const segments = [];
    let generatedColumn = 0;
    for (const segment of line.split(',').filter(Boolean)) {
      const fields = [];
      let value = 0;
      let shift = 0;
      for (const char of segment) {
        const digit = VLQ[char];
        value += (digit & 31) << shift;
        if (digit & 32) { shift += 5; continue; }
        fields.push(value & 1 ? -(value >> 1) : value >> 1);
        value = 0;
        shift = 0;
      }
      generatedColumn += fields[0];
      if (fields.length >= 4) {
        sourceLine += fields[2];
        sourceColumn += fields[3];
        segments.push([generatedColumn, sourceLine, sourceColumn]);
      }
    }
    lines.push(segments);
  }
  return lines;
}

/** A function from a generated { line, column } (acorn's: 1-based line, 0-based column) to the source's, by the nearest mapping at or before it on that line. */
export function sourceLocator(map) {
  const lines = decodeMappings(map.mappings);
  return ({ line, column }) => {
    const segments = lines[line - 1] || [];
    let best = null;
    for (const s of segments) { if (s[0] <= column) best = s; else break; }
    if (!best) return { line, column };
    return { line: best[1] + 1, column: best[2] + (column - best[0]) };
  };
}

/** Depth-first visit of every node; `visit(node, parent)`. */
export function walk(node, visit, parent = null) {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) { for (const child of node) walk(child, visit, parent); return; }
  if (typeof node.type === 'string') visit(node, parent);
  for (const key in node) {
    if (key === 'type' || key === 'start' || key === 'end' || key === 'loc') continue;
    const value = node[key];
    if (value && typeof value === 'object') walk(value, visit, typeof node.type === 'string' ? node : parent);
  }
}

/**
 * A callee as a dotted chain: `test.describe.skip` gives
 * { root: 'test', props: ['describe', 'skip'] }. Null when the chain is not
 * plain identifiers and non-computed properties all the way down (a call
 * result, `this`, a computed key, a literal).
 */
export function memberChain(node) {
  const props = [];
  let current = node;
  while (current && current.type === 'MemberExpression') {
    if (current.computed || current.property.type !== 'Identifier') return null;
    props.unshift(current.property.name);
    current = current.object;
  }
  if (!current || current.type !== 'Identifier') return null;
  return { root: current.name, props };
}

export const TEST_API_MODULES = ['@playwright/test', 'vitest'];
export const TEST_API_NAMES = ['test', 'it', 'describe', 'expect'];

/**
 * The local names a file uses for the test APIs: the conventional names,
 * plus whatever an import from a test-API module binds to one of them
 * (`test as base` makes `base` a `test`). Returns a Map of local name to
 * API name, and the imports it could not read (a namespace import of a
 * test-API module, a default import) for the caller to report.
 */
export function testApiBindings(ast, { modules = TEST_API_MODULES, names = TEST_API_NAMES } = {}) {
  const bindings = new Map(names.map((n) => [n, n]));
  const unsupported = [];
  for (const node of ast.body) {
    if (node.type !== 'ImportDeclaration' || !modules.includes(node.source.value)) continue;
    for (const spec of node.specifiers) {
      if (spec.type === 'ImportSpecifier') {
        const imported = spec.imported.type === 'Identifier' ? spec.imported.name : String(spec.imported.value);
        if (names.includes(imported)) bindings.set(spec.local.name, imported);
      } else {
        unsupported.push({ line: spec.loc.start.line, why: `${spec.type === 'ImportNamespaceSpecifier' ? 'a namespace' : 'a default'} import of ${node.source.value} is outside the supported grammar` });
      }
    }
  }
  return { bindings, unsupported };
}

/** Property names that disable or isolate a test or a group. */
export const DISABLING_MODIFIERS = ['skip', 'only', 'fixme', 'todo'];
/** Properties that keep a call a test declaration (test.only(...) still declares a test). */
export const DECLARATION_MODIFIERS = ['only', 'skip', 'fixme', 'fail', 'concurrent', 'todo', 'sequential', 'serial', 'each', 'for'];
/** expect's own helpers that are still one assertion. */
export const EXPECT_MEMBERS = ['soft', 'poll', 'element'];

/**
 * Every call on a test API in the file, by the grammar above:
 *   calls:  { api, local, props, line, column } -- api is test/it/describe/expect,
 *           props the chain after the name (['describe', 'skip'] for test.describe.skip)
 *   review: { line, column, text, why } -- a call that looks disabling but
 *           is outside the grammar (computed key, unbound root, call result)
 */
export function testApiCalls(ast, bindings) {
  const calls = [];
  const review = [];
  walk(ast, (node) => {
    if (node.type !== 'CallExpression') return;
    const callee = node.callee;
    const chain = memberChain(callee);
    const loc = callee.loc.start;
    if (chain) {
      const api = bindings.get(chain.root);
      if (api) { calls.push({ api, local: chain.root, props: chain.props, line: loc.line, column: loc.column + 1 }); return; }
      const last = chain.props[chain.props.length - 1];
      if (last && DISABLING_MODIFIERS.includes(last)) {
        review.push({ line: loc.line, column: loc.column + 1, text: `${chain.root}.${chain.props.join('.')}(`, why: `${chain.root} is not a test API this grammar binds` });
      }
      return;
    }
    // Not a plain chain: a computed key, or a call result, somewhere in it.
    // Worth a look only when it names a modifier (`test['skip']`,
    // `test.extend({}).only`) or when a test API is reached through a key
    // nothing can read statically (`test[mode](...)`); `engine[type](d)` is
    // an ordinary call.
    if (callee.type !== 'MemberExpression') return;
    const prop = callee.computed ? (callee.property.type === 'Literal' ? String(callee.property.value) : null) : callee.property.name;
    if (prop && DISABLING_MODIFIERS.includes(prop)) {
      review.push({ line: loc.line, column: loc.column + 1, text: `...[${prop}](`, why: 'a modifier reached through a computed key or a call result is outside the supported grammar' });
    } else if (prop === null) {
      const object = memberChain(callee.object);
      if (object && bindings.get(object.root)) review.push({ line: loc.line, column: loc.column + 1, text: `${object.root}${object.props.map((p) => '.' + p).join('')}[...](`, why: 'a computed property on a test API is outside the supported grammar' });
    }
  });
  return { calls, review };
}

/** Static counts of one file: test declarations (test/it, with a declaration modifier) and assertions (expect, expect.soft/poll/element). A loop counts once. */
export function countCalls({ calls }) {
  let tests = 0;
  let expects = 0;
  for (const c of calls) {
    if ((c.api === 'test' || c.api === 'it') && (c.props.length === 0 || (c.props.length === 1 && DECLARATION_MODIFIERS.includes(c.props[0])))) tests++;
    else if (c.api === 'expect' && (c.props.length === 0 || (c.props.length === 1 && EXPECT_MEMBERS.includes(c.props[0])))) expects++;
  }
  return { tests, expects };
}

/** The disabling calls among `calls`: a test, it or describe reached with skip/only/fixme/todo anywhere in its chain (test.describe.skip, describe.only, it.todo). */
export function disablingCalls({ calls }) {
  return calls.filter((c) => c.api !== 'expect' && c.props.some((p) => DISABLING_MODIFIERS.includes(p)))
    .map((c) => ({ ...c, modifier: c.props.find((p) => DISABLING_MODIFIERS.includes(p)), text: `${c.local}${c.props.map((p) => '.' + p).join('')}(` }));
}

/** A literal argument's value: a string, number or boolean, a template with no expressions, or an object literal of such values; null for anything else. */
export function literalValue(node) {
  if (!node) return null;
  if (node.type === 'Literal') return node.value;
  if (node.type === 'TemplateLiteral' && node.expressions.length === 0) return node.quasis[0].value.cooked;
  if (node.type === 'ObjectExpression') {
    const out = {};
    for (const p of node.properties) {
      if (p.type !== 'Property' || p.computed || (p.key.type !== 'Identifier' && p.key.type !== 'Literal')) return null;
      const value = literalValue(p.value);
      if (value === null) return null;
      out[p.key.type === 'Identifier' ? p.key.name : String(p.key.value)] = value;
    }
    return out;
  }
  return null;
}

/**
 * Calls of the given plain function names, with each argument as its literal
 * value (see literalValue) or null when it is not a literal.
 */
export function callsNamed(ast, names) {
  const out = [];
  walk(ast, (node) => {
    if (node.type !== 'CallExpression' || node.callee.type !== 'Identifier' || !names.includes(node.callee.name)) return;
    out.push({ name: node.callee.name, line: node.callee.loc.start.line, args: node.arguments.map(literalValue) });
  });
  return out;
}

/** Discover, parse and analyse every spec under the roots: [{ file, bindings, unsupported, calls, review }]. */
export async function analyseSpecs(roots, options = {}) {
  const out = [];
  for (const file of discoverSpecs(roots, options)) {
    const ast = await toAst(file);
    const { bindings, unsupported } = testApiBindings(ast);
    out.push({ file, bindings, unsupported, ...testApiCalls(ast, bindings) });
  }
  return out;
}
