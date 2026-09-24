// Milestone 70, 70A: the inventory GuardianForms.testing is designed from
// (MILESTONE-70-PROPOSAL.md, 70A and 70T). Browser specs reach into the app
// through window inside page.evaluate(); 70T moves every one of them onto a
// namespaced adapter before any production code moves. The adapter's
// commands and queries have to cover what the suite actually does, so this
// lists it: every application name the specs read off window, and every place
// they write into live case state in place (assignment, Object.assign, or an
// array mutator on a chain rooted at window.D or window.caseFile).
//
// Parsed, not grepped: each spec and support file is stripped to JavaScript
// with Vite's oxc transform and parsed with acorn. Aliases are followed --
// `const w = window as any` makes `w.D` a window access -- so the counts
// replace the text-search estimates in the plan's baseline.
//
// Usage (from probate-guardian/):
//   node scripts/ms70-e2e-global-inventory.mjs            summary
//   node scripts/ms70-e2e-global-inventory.mjs --write    tests/baseline/ms70-e2e-globals.json
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'acorn';
import { transformWithOxc } from 'vite';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const INVENTORY_PATH = 'tests/baseline/ms70-e2e-globals.json';
const STATE_ROOTS = new Set(['D', 'caseFile']);
const MUTATORS = new Set(['push', 'pop', 'shift', 'unshift', 'splice', 'sort', 'reverse', 'fill', 'copyWithin']);
// Platform members reached through window in specs; not application API.
const PLATFORM = new Set(['location', 'document', 'navigator', 'localStorage', 'sessionStorage', 'indexedDB',
  'getComputedStyle', 'matchMedia', 'scrollY', 'scrollX', 'scrollTo', 'innerWidth', 'innerHeight', 'print',
  'open', 'close', 'addEventListener', 'removeEventListener', 'dispatchEvent', 'history', 'crypto', 'performance',
  'setTimeout', 'clearTimeout', 'requestAnimationFrame', 'getSelection', 'isSecureContext', 'showSaveFilePicker',
  'showOpenFilePicker', 'caches', 'devicePixelRatio', 'screen', 'visualViewport', 'origin', 'name', 'focus', 'blur',
  'JSZip', 'ExcelJS', 'pdfjsLib', 'PDFLib', 'bootstrap', 'confirm', 'alert', 'prompt', 'fetch', 'URL', 'Blob']);

function walk(node, parent, visit) {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) { for (const c of node) walk(c, parent, visit); return; }
  if (typeof node.type === 'string') visit(node, parent);
  for (const key in node) {
    if (key === 'type' || key === 'start' || key === 'end' || key === 'loc') continue;
    const v = node[key];
    if (v && typeof v === 'object') walk(v, typeof node.type === 'string' ? node : parent, visit);
  }
}

/** The chain of a member expression from its root: w.D.x[0].y -> { root: 'w', props: ['D','x',null,'y'] }. */
function memberChain(node) {
  const props = [];
  let n = node;
  while (n && n.type === 'MemberExpression') {
    props.unshift(!n.computed && n.property.type === 'Identifier' ? n.property.name
      : (n.computed && n.property.type === 'Literal' ? String(n.property.value) : null));
    n = n.object;
  }
  while (n && (n.type === 'TSAsExpression' || n.type === 'ParenthesizedExpression')) n = n.expression;
  return n && n.type === 'Identifier' ? { root: n.name, props } : null;
}

/** Analyze one spec's JavaScript. */
export function inventoryJs(js) {
  const ast = parse(js, { ecmaVersion: 'latest', sourceType: 'module', allowAwaitOutsideFunction: true, locations: true, allowHashBang: true });
  // Aliases of window: `const w = window`, `const win = window`, possibly nested in callbacks.
  const aliases = new Set(['window', 'globalThis']);
  walk(ast, null, (node) => {
    if (node.type === 'VariableDeclarator' && node.id.type === 'Identifier' && node.init
        && node.init.type === 'Identifier' && aliases.has(node.init.name)) aliases.add(node.id.name);
  });
  const names = new Map(); // name -> count
  const writes = [];       // { kind, target, line }
  let computed = 0;
  const onWindow = (chain) => chain && aliases.has(chain.root);
  walk(ast, null, (node, parent) => {
    if (node.type === 'MemberExpression') {
      // Only the outermost-to-window first hop: the node whose object is the alias itself.
      const obj = node.object;
      if (obj.type === 'Identifier' && aliases.has(obj.name)) {
        if (node.computed && node.property.type !== 'Literal') computed++;
        else {
          const name = node.computed ? String(node.property.value) : node.property.name;
          if (!PLATFORM.has(name)) names.set(name, (names.get(name) || 0) + 1);
        }
      }
    }
    if (node.type === 'AssignmentExpression' && node.left.type === 'MemberExpression') {
      const chain = memberChain(node.left);
      if (onWindow(chain) && STATE_ROOTS.has(chain.props[0]) && chain.props.length >= 1) {
        writes.push({ kind: chain.props.length === 1 ? 'replace-root' : 'assign', target: `${chain.props[0]}.${chain.props.slice(1).map((p) => p ?? '[?]').join('.')}`.replace(/\.$/, ''), line: node.loc.start.line });
      }
    }
    if (node.type === 'CallExpression' && node.callee.type === 'MemberExpression') {
      const callee = memberChain(node.callee);
      if (callee && callee.root === 'Object' && callee.props.join('.') === 'assign' && node.arguments[0]) {
        const chain = node.arguments[0].type === 'MemberExpression' ? memberChain(node.arguments[0]) : null;
        if (onWindow(chain) && STATE_ROOTS.has(chain.props[0])) {
          writes.push({ kind: 'object-assign', target: chain.props.map((p) => p ?? '[?]').join('.'), line: node.loc.start.line });
        }
      }
      if (onWindow(callee) && STATE_ROOTS.has(callee.props[0]) && MUTATORS.has(callee.props[callee.props.length - 1])) {
        writes.push({ kind: 'mutator', target: callee.props.map((p) => p ?? '[?]').join('.'), line: node.loc.start.line });
      }
    }
    if (node.type === 'UnaryExpression' && node.operator === 'delete' && node.argument.type === 'MemberExpression') {
      const chain = memberChain(node.argument);
      if (onWindow(chain) && STATE_ROOTS.has(chain.props[0])) writes.push({ kind: 'delete', target: chain.props.map((p) => p ?? '[?]').join('.'), line: node.loc.start.line });
    }
  });
  return { names: Object.fromEntries([...names].sort((a, b) => a[0].localeCompare(b[0]))), writes, computed };
}

export async function inventoryFile(file, source) {
  const js = /\.tsx?$/.test(file) ? (await transformWithOxc(source, file, { lang: 'ts' })).code : source;
  return inventoryJs(js);
}

function listFiles(root) {
  const out = [];
  const visit = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) visit(p);
      else if (/\.(ts|js)$/.test(e.name)) out.push(path.relative(root, p).replace(/\\/g, '/'));
    }
  };
  visit(path.join(root, 'tests/e2e'));
  return out.sort();
}

export async function inventoryAll(root = ROOT) {
  const files = {};
  for (const rel of listFiles(root)) {
    const r = await inventoryFile(rel, fs.readFileSync(path.join(root, rel), 'utf8'));
    if (Object.keys(r.names).length || r.writes.length || r.computed) files[rel] = r;
  }
  const byName = {};
  for (const [file, r] of Object.entries(files)) for (const [name, n] of Object.entries(r.names)) {
    byName[name] ||= { files: 0, uses: 0 };
    byName[name].files++; byName[name].uses += n;
  }
  const specs = listFiles(root).filter((f) => f.endsWith('.spec.ts'));
  const specsTouching = Object.keys(files).filter((f) => f.endsWith('.spec.ts'));
  const writeFiles = Object.entries(files).filter(([, r]) => r.writes.length).map(([f]) => f);
  const writeKinds = {};
  for (const r of Object.values(files)) for (const w of r.writes) writeKinds[w.kind] = (writeKinds[w.kind] || 0) + 1;
  return {
    summary: {
      specFiles: specs.length,
      specFilesTouchingAppGlobals: specsTouching.length,
      supportFilesTouchingAppGlobals: Object.keys(files).filter((f) => !f.endsWith('.spec.ts')).length,
      distinctAppNames: Object.keys(byName).length,
      inPlaceStateWriteSites: Object.values(files).reduce((a, r) => a + r.writes.length, 0),
      filesWithInPlaceStateWrites: writeFiles.length,
      writeKinds,
      computedWindowAccesses: Object.values(files).reduce((a, r) => a + r.computed, 0),
    },
    byName: Object.fromEntries(Object.entries(byName).sort((a, b) => b[1].files - a[1].files || a[0].localeCompare(b[0]))),
    files,
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const inv = await inventoryAll();
  console.log(JSON.stringify(inv.summary, null, 1));
  console.log('most-used names:', Object.entries(inv.byName).slice(0, 25).map(([n, v]) => `${n}(${v.files})`).join(' '));
  if (process.argv.includes('--write')) {
    fs.writeFileSync(path.join(ROOT, INVENTORY_PATH), JSON.stringify({
      generatedBy: 'node scripts/ms70-e2e-global-inventory.mjs --write',
      note: 'Milestone 70, 70A: application names the browser suite reaches through window, and its in-place writes to live case state. GuardianForms.testing (70T) is designed from this. Informational.',
      ...inv,
    }, null, 1) + '\n');
    console.log(`wrote ${INVENTORY_PATH}`);
  }
}
