// Milestone 70, 70E: the machine-checked list of the classic scripts' own
// reads and writes of case state -- a bare `D` (the open filing, window.D), a
// lexical `caseFile` or `activeInventoryType`, and window.D / window.caseFile
// as members. The classic monolith, src/legacy-app.js, held all of it: the
// list only shrank from 70E, 70J emptied it when the module store became the
// case's owner, and 70L deleted the monolith. It reads every classic script
// index.html loads (src/prepaint.js since 70L) and stays empty
// (tests/unit/ms70-state-seam.spec.js).
//
// Each entry is `<file>::<enclosing top-level declaration>::<name>::<read|write>`
// with a count, so a new bare access in any classic script fails.
//
// Usage (from probate-guardian/):
//   node scripts/ms70-classic-state.mjs                  summary
//   node scripts/ms70-classic-state.mjs --write-baseline tests/baseline/ms70-classic-state.json
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'acorn';
import { analyze, classicScriptsFromHtml } from './ms70-dependency-audit.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const CLASSIC_STATE_PATH = 'tests/baseline/ms70-classic-state.json';
export const STATE_NAMES = ['D', 'caseFile', 'activeInventoryType'];

export function classicStateAccesses(source) {
  const ast = parse(source, { ecmaVersion: 'latest', sourceType: 'script', locations: true });
  const ownerOf = (pos) => {
    const st = ast.body.find((x) => x.start <= pos && pos < x.end);
    if (!st) return '(top level)';
    if (st.type === 'FunctionDeclaration' || st.type === 'ClassDeclaration') return st.id.name;
    if (st.type === 'VariableDeclaration' && st.declarations[0].id.type === 'Identifier') return st.declarations[0].id.name;
    return '(top level)';
  };
  const writes = new Set();
  (function collect(node, parent) {
    if (!node || typeof node.type !== 'string') return;
    if (node.type === 'AssignmentExpression' && node.left.type === 'Identifier') writes.add(node.left.start);
    if (node.type === 'UpdateExpression' && node.argument.type === 'Identifier') writes.add(node.argument.start);
    for (const k of Object.keys(node)) {
      const c = node[k];
      if (Array.isArray(c)) c.forEach((x) => collect(x, node)); else if (c && typeof c.type === 'string') collect(c, node);
    }
  })(ast, null);
  const counts = {};
  const bump = (key) => { counts[key] = (counts[key] || 0) + 1; };
  analyze(ast, {
    onRef(id, scope) {
      if (!STATE_NAMES.includes(id.name)) return;
      const binding = scope.lookup(id.name);
      let root = scope; while (root.parent) root = root.parent;
      if (binding && binding !== root) return; // a local of the same name
      bump(`${ownerOf(id.start)}::${id.name}::${writes.has(id.start) ? 'write' : 'read'}`);
    },
  });
  // window.D = ... / window.caseFile = ... (member writes; the monolith's reads
  // of window.D are the same authority as its bare D and are counted too).
  // From the parse, not the text (Milestone 70, 70J): a comment naming
  // window.D is not an access, and the list is empty since 70J.
  const windowState = (n) => n && n.type === 'MemberExpression' && !n.computed && n.object.type === 'Identifier'
    && n.object.name === 'window' && (n.property.name === 'D' || n.property.name === 'caseFile') ? n.property.name : null;
  (function members(node) {
    if (!node || typeof node.type !== 'string') return;
    if (node.type === 'AssignmentExpression' && windowState(node.left)) {
      bump(`${ownerOf(node.start)}::window.${windowState(node.left)}::write`);
      members(node.right);
      return;
    }
    if (windowState(node)) bump(`${ownerOf(node.start)}::window.${windowState(node)}::read`);
    for (const k of Object.keys(node)) {
      const c = node[k];
      if (Array.isArray(c)) c.forEach(members); else if (c && typeof c.type === 'string') members(c);
    }
  })(ast);
  return Object.fromEntries(Object.entries(counts).sort(([a], [b]) => a.localeCompare(b)));
}

/** The accesses of every classic script index.html loads, keyed by file. */
export function classicStateInApp(root = ROOT) {
  const out = {};
  for (const file of classicScriptsFromHtml(fs.readFileSync(path.join(root, 'index.html'), 'utf8'))) {
    for (const [key, n] of Object.entries(classicStateAccesses(fs.readFileSync(path.join(root, file), 'utf8')))) out[`${file}::${key}`] = n;
  }
  return out;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const counts = classicStateInApp();
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const byName = {};
  for (const [k, n] of Object.entries(counts)) { const [, , name, kind] = k.split('::'); byName[`${name} ${kind}`] = (byName[`${name} ${kind}`] || 0) + n; }
  console.log(`${Object.keys(counts).length} (declaration, name, access) entries, ${total} accesses:`, JSON.stringify(byName));
  if (process.argv.includes('--write-baseline')) {
    fs.writeFileSync(path.join(ROOT, CLASSIC_STATE_PATH), JSON.stringify({
      generatedBy: 'node scripts/ms70-classic-state.mjs --write-baseline',
      note: "Milestone 70: every read and write of case state by a classic script index.html loads (bare D, a lexical caseFile or activeInventoryType, window.D and window.caseFile), by file and enclosing top-level declaration. The classic monolith, src/legacy-app.js, held it all: only shrank from 70E; empty since 70J, when src/core/state.js became the case's owner; the monolith deleted in 70L. It stays empty.",
      counts,
    }, null, 1) + '\n');
    console.log(`wrote ${CLASSIC_STATE_PATH}`);
  }
}
