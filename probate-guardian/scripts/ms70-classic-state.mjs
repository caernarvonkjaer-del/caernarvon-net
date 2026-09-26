// Milestone 70, 70E: the machine-checked list of the classic monolith's own
// reads and writes of the case state it still owns -- the bare `D` (the open
// filing, window.D), its lexical `let caseFile` and `let activeInventoryType`,
// and window.D / window.caseFile written as members. 70J moves ownership to
// the module store only once this list is empty; until then it may only
// shrink (tests/unit/ms70-classic-state.spec.js).
//
// Each entry is `<enclosing top-level declaration>::<name>::<read|write>`
// with a count, so a delivery that moves a function out removes its entries
// and a new bare access anywhere fails.
//
// Usage (from probate-guardian/):
//   node scripts/ms70-classic-state.mjs                  summary
//   node scripts/ms70-classic-state.mjs --write-baseline tests/baseline/ms70-classic-state.json
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'acorn';
import { analyze } from './ms70-dependency-audit.mjs';

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
  for (const m of source.matchAll(/\bwindow\.(D|caseFile)\b(\s*=(?!=))?/g)) {
    bump(`${ownerOf(m.index)}::window.${m[1]}::${m[2] ? 'write' : 'read'}`);
  }
  return Object.fromEntries(Object.entries(counts).sort(([a], [b]) => a.localeCompare(b)));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const counts = classicStateAccesses(fs.readFileSync(path.join(ROOT, 'src/legacy-app.js'), 'utf8'));
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const byName = {};
  for (const [k, n] of Object.entries(counts)) { const [, name, kind] = k.split('::'); byName[`${name} ${kind}`] = (byName[`${name} ${kind}`] || 0) + n; }
  console.log(`${Object.keys(counts).length} (declaration, name, access) entries, ${total} accesses:`, JSON.stringify(byName));
  if (process.argv.includes('--write-baseline')) {
    fs.writeFileSync(path.join(ROOT, CLASSIC_STATE_PATH), JSON.stringify({
      generatedBy: 'node scripts/ms70-classic-state.mjs --write-baseline',
      note: "Milestone 70, 70E: every read and write of the case state the classic monolith still owns (bare D, its lexical caseFile and activeInventoryType, window.D and window.caseFile), by enclosing top-level declaration. May only shrink; 70J needs it empty before the module store becomes the owner.",
      counts,
    }, null, 1) + '\n');
    console.log(`wrote ${CLASSIC_STATE_PATH}`);
  }
}
