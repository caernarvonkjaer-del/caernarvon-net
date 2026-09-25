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
import { windowSurfaceNames } from './audit-window-bridge.mjs';

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

// Bare globals (Milestone 70, 70T). Inside page.evaluate() a name the spec
// never declares resolves to a window property -- `caseFile.wards` IS
// window.caseFile.wards -- so an app global reached that way is exactly as
// much an app global as `(window as any).caseFile`. The first 70T guard saw
// only window member access and missed these. A name counts as bare when no
// enclosing function or the program declares it (declarations anywhere in a
// function body count for the whole function: block scoping is ignored,
// which can only hide a bare name, never invent one) and src/ can put it on
// window (audit-window-bridge.mjs's windowSurfaceNames()).
const FUNCTIONS = new Set(['FunctionDeclaration', 'FunctionExpression', 'ArrowFunctionExpression']);
const SKIP_KEYS = new Set(['type', 'start', 'end', 'loc', 'range']);

function bindingNames(pattern, out) {
  if (!pattern) return;
  if (pattern.type === 'Identifier') out.add(pattern.name);
  else if (pattern.type === 'ObjectPattern') for (const p of pattern.properties) bindingNames(p.type === 'RestElement' ? p.argument : p.value, out);
  else if (pattern.type === 'ArrayPattern') for (const e of pattern.elements) bindingNames(e, out);
  else if (pattern.type === 'AssignmentPattern') bindingNames(pattern.left, out);
  else if (pattern.type === 'RestElement') bindingNames(pattern.argument, out);
}

/** Every name a function (or the program) declares, nested blocks included, nested functions excluded. */
function declaredIn(scopeNode) {
  const out = new Set();
  for (const p of scopeNode.params || []) bindingNames(p, out);
  if (scopeNode.type === 'FunctionExpression' && scopeNode.id) out.add(scopeNode.id.name);
  const visit = (node) => {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) { for (const c of node) visit(c); return; }
    if (typeof node.type !== 'string') return;
    if (FUNCTIONS.has(node.type)) { if (node.type === 'FunctionDeclaration' && node.id) out.add(node.id.name); return; }
    if (node.type === 'VariableDeclarator') bindingNames(node.id, out);
    if ((node.type === 'ClassDeclaration' || node.type === 'ClassExpression') && node.id) out.add(node.id.name);
    if (node.type === 'CatchClause' && node.param) bindingNames(node.param, out);
    if (/^Import(Default|Namespace)?Specifier$/.test(node.type)) out.add(node.local.name);
    for (const k in node) if (!SKIP_KEYS.has(k) && node[k] && typeof node[k] === 'object') visit(node[k]);
  };
  visit(scopeNode.type === 'Program' ? scopeNode.body : scopeNode.body);
  return out;
}

/** Identifiers read without any declaration in scope: name -> count. */
export function freeIdentifiers(ast) {
  const free = new Map();
  const scopes = [];
  const bound = (name) => scopes.some((s) => s.has(name));
  const isReference = (parent, key) => {
    if (!parent) return true;
    if (parent.type === 'MemberExpression' && key === 'property' && !parent.computed) return false;
    if ((parent.type === 'Property' || parent.type === 'MethodDefinition' || parent.type === 'PropertyDefinition') && key === 'key' && !parent.computed) return false;
    if (/^(Labeled|Break|Continue)Statement$/.test(parent.type) && key === 'label') return false;
    if (/^(Import|Export)(Default|Namespace)?Specifier$/.test(parent.type)) return false;
    if (parent.type === 'MetaProperty') return false;
    return true;
  };
  const visit = (node, parent, key) => {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) { for (const c of node) visit(c, parent, key); return; }
    if (typeof node.type !== 'string') return;
    const opens = node.type === 'Program' || FUNCTIONS.has(node.type);
    if (opens) scopes.push(declaredIn(node));
    if (node.type === 'Identifier' && isReference(parent, key) && !bound(node.name)) free.set(node.name, (free.get(node.name) || 0) + 1);
    for (const k in node) if (!SKIP_KEYS.has(k) && node[k] && typeof node[k] === 'object') visit(node[k], node, k);
    if (opens) scopes.pop();
  };
  visit(ast, null, null);
  return free;
}

// Milestone 70, 70T: a copy held in a variable. `const d =
// t.snapshot().filing; for (const g of d.guardians) g.x = 1; t.save.auto();`
// changes nothing in the app -- the edit went into the copy and the copy
// went nowhere. Within each function, a variable initialised from a
// GuardianForms.testing call is followed through what is derived from it
// (members, for-of items, callback parameters of its array methods); if any
// of them is written, the variable itself must be handed on -- as an
// argument or spread into one: replaceFiling(d), a PDF builder, patchFiling({
// ...d }) -- or the write is reported. Reading a copy is always fine. A
// test that writes a copy on purpose, to prove it is one, marks the declaring
// line `copy-write: deliberate`.
function unreturnedCopyWrites(ast, adapterCall, deliberate = new Set()) {
  const found = [];
  const rootOf = (expr) => {
    let n = expr;
    while (n && (n.type === 'MemberExpression' || n.type === 'ChainExpression' || n.type === 'ParenthesizedExpression' || n.type === 'LogicalExpression'
      || (n.type === 'CallExpression' && n.callee.type === 'MemberExpression' && ['find', 'filter', 'slice', 'at'].includes(n.callee.property.name)))) {
      n = n.type === 'MemberExpression' ? n.object : n.type === 'CallExpression' ? n.callee.object : n.type === 'LogicalExpression' ? n.left : n.expression;
    }
    return n && n.type === 'Identifier' ? n.name : null;
  };
  const visitFunction = (fn) => {
    const origin = new Map(); // variable -> the adapter-initialised variable it came from
    const roots = new Set();
    const writes = [];
    const handedOn = new Set();
    const note = (name, root) => { if (root && origin.has(root)) origin.set(name, origin.get(root)); };
    walk(fn.body, fn, (node, parent) => {
      if (FUNCTIONS.has(node.type) && node !== fn && parent && parent.type === 'CallExpression' && parent.callee.type === 'MemberExpression'
          && ['forEach', 'map', 'filter', 'find', 'some', 'every'].includes(parent.callee.property.name)) {
        const r = rootOf(parent.callee.object);
        if (r && origin.has(r) && node.params[0] && node.params[0].type === 'Identifier') origin.set(node.params[0].name, origin.get(r));
      }
      if (node.type === 'VariableDeclarator' && node.id.type === 'Identifier' && node.init) {
        let init = node.init;
        while (init.type === 'AwaitExpression') init = init.argument;
        if (adapterCall(init) !== null) {
          origin.set(node.id.name, node.id.name); roots.add(node.id.name);
          // A test that writes a copy to prove it is a copy says so on the declaring line.
          if (deliberate.has(node.id.name)) handedOn.add(node.id.name);
        }
        else note(node.id.name, rootOf(init));
      }
      if (node.type === 'ForOfStatement' && node.left.type === 'VariableDeclaration' && node.left.declarations[0].id.type === 'Identifier') {
        note(node.left.declarations[0].id.name, rootOf(node.right));
      }
      const target = node.type === 'AssignmentExpression' ? node.left
        : node.type === 'UnaryExpression' && node.operator === 'delete' ? node.argument
          : node.type === 'UpdateExpression' ? node.argument : null;
      if (target && target.type === 'MemberExpression') {
        const r = rootOf(target);
        if (r && origin.has(r)) writes.push({ root: origin.get(r), line: node.loc.start.line });
      }
      if (node.type === 'CallExpression') {
        const callee = node.callee.type === 'MemberExpression' ? node.callee : null;
        if (callee && callee.object.type === 'Identifier' && callee.object.name === 'Object' && callee.property.name === 'assign' && node.arguments[0]) {
          const r = rootOf(node.arguments[0]);
          if (r && origin.has(r)) writes.push({ root: origin.get(r), line: node.loc.start.line });
        } else if (callee && MUTATORS.has(callee.property.name)) {
          const r = rootOf(callee.object);
          if (r && origin.has(r)) writes.push({ root: origin.get(r), line: node.loc.start.line });
        }
        for (const arg of node.arguments) {
          if (arg.type === 'Identifier' && roots.has(arg.name)) handedOn.add(arg.name);
          if (arg.type === 'ObjectExpression') for (const prop of arg.properties) {
            if (prop.type === 'SpreadElement' && prop.argument.type === 'Identifier') handedOn.add(prop.argument.name);
          }
        }
      }
    });
    for (const w of writes) if (!handedOn.has(w.root)) found.push({ kind: 'copy-write', target: `${w.root} (a copy, written and never handed on)`, line: w.line });
  };
  walk(ast, null, (node) => { if (FUNCTIONS.has(node.type)) visitFunction(node); });
  const seen = new Set();
  return found.filter((f) => { const k = `${f.line}:${f.target}`; if (seen.has(k)) return false; seen.add(k); return true; });
}

let appNamesCache = null;
function appNames() {
  if (!appNamesCache) appNamesCache = windowSurfaceNames(ROOT);
  return appNamesCache;
}

/** Analyze one spec's JavaScript. */
export function inventoryJs(js, { deliberate = new Set() } = {}) {
  const ast = parse(js, { ecmaVersion: 'latest', sourceType: 'module', allowAwaitOutsideFunction: true, locations: true, allowHashBang: true });
  // Aliases of window: `const w = window`, `const win = window`, possibly nested in callbacks.
  const aliases = new Set(['window', 'globalThis']);
  walk(ast, null, (node) => {
    if (node.type === 'VariableDeclarator' && node.id.type === 'Identifier' && node.init
        && node.init.type === 'Identifier' && aliases.has(node.init.name)) aliases.add(node.id.name);
  });
  // Aliases of the testing namespace: `const t = (window as any).GuardianForms.testing`.
  const testingAliases = new Set();
  walk(ast, null, (node) => {
    if (node.type !== 'VariableDeclarator' || node.id.type !== 'Identifier' || !node.init || node.init.type !== 'MemberExpression') return;
    const chain = memberChain(node.init);
    if (chain && aliases.has(chain.root) && chain.props.join('.') === 'GuardianForms.testing') testingAliases.add(node.id.name);
  });
  const names = new Map(); // name -> count
  const writes = [];       // { kind, target, line }
  let computed = 0;
  const onWindow = (chain) => chain && aliases.has(chain.root);
  // Milestone 70, 70T: everything GuardianForms.testing returns is a copy, so
  // writing into one -- Object.assign(t.field('preparer'), ...),
  // t.snapshot().filing.x = ... -- changes nothing in the app, and the test
  // silently arranges data the app never sees. Two converted specs did.
  const adapterCall = (expr) => {
    let n = expr;
    while (n && (n.type === 'MemberExpression' || n.type === 'ChainExpression' || n.type === 'ParenthesizedExpression')) n = n.type === 'MemberExpression' ? n.object : n.expression;
    if (!n || n.type !== 'CallExpression' || n.callee.type !== 'MemberExpression') return null;
    const callee = memberChain(n.callee);
    if (!callee) return null;
    const viaWindow = aliases.has(callee.root) && callee.props[0] === 'GuardianForms' && callee.props[1] === 'testing';
    if (!viaWindow && !testingAliases.has(callee.root)) return null;
    return (viaWindow ? callee.props.slice(2) : callee.props).map((x) => x ?? '[?]').join('.');
  };
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
    if (node.type === 'AssignmentExpression' && node.left.type === 'MemberExpression' && adapterCall(node.left.object)) {
      writes.push({ kind: 'copy-write', target: `${adapterCall(node.left.object)}()`, line: node.loc.start.line });
    }
    if (node.type === 'CallExpression' && node.callee.type === 'MemberExpression') {
      const callee = memberChain(node.callee);
      if (callee && callee.root === 'Object' && callee.props.join('.') === 'assign' && node.arguments[0] && adapterCall(node.arguments[0])) {
        writes.push({ kind: 'copy-write', target: `${adapterCall(node.arguments[0])}()`, line: node.loc.start.line });
      }
      const method = !node.callee.computed && node.callee.property.type === 'Identifier' ? node.callee.property.name : null;
      if (MUTATORS.has(method) && adapterCall(node.callee.object)) {
        writes.push({ kind: 'copy-write', target: `${adapterCall(node.callee.object)}()`, line: node.loc.start.line });
      }
    }
    if (node.type === 'UnaryExpression' && node.operator === 'delete' && node.argument.type === 'MemberExpression' && adapterCall(node.argument.object)) {
      writes.push({ kind: 'copy-write', target: `${adapterCall(node.argument.object)}()`, line: node.loc.start.line });
    }
    if (node.type === 'UnaryExpression' && node.operator === 'delete' && node.argument.type === 'MemberExpression') {
      const chain = memberChain(node.argument);
      if (onWindow(chain) && STATE_ROOTS.has(chain.props[0])) writes.push({ kind: 'delete', target: chain.props.map((p) => p ?? '[?]').join('.'), line: node.loc.start.line });
    }
  });
  writes.push(...unreturnedCopyWrites(ast, adapterCall, deliberate));
  const bare = Object.fromEntries([...freeIdentifiers(ast)].filter(([n]) => appNames().has(n) && !PLATFORM.has(n))
    .sort((a, b) => a[0].localeCompare(b[0])));
  return { names: Object.fromEntries([...names].sort((a, b) => a[0].localeCompare(b[0]))), writes, computed, bare };
}

export async function inventoryFile(file, source) {
  const js = /\.tsx?$/.test(file) ? (await transformWithOxc(source, file, { lang: 'ts' })).code : source;
  // The marker is read from the source: the TypeScript transform drops comments.
  const deliberate = new Set([...source.matchAll(/(?:const|let) (\w+)[^\n]*copy-write: deliberate/g)].map((m) => m[1]));
  return inventoryJs(js, { deliberate });
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
