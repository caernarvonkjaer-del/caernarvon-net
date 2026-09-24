// Milestone 70, 70A (MILESTONE-70-PROPOSAL.md, "70A -- Baseline, contracts,
// and ratchets"). scripts/audit-window-bridge.mjs finds `window.X = ...` with
// a regular expression and cannot see the ways the classic monolith and the
// ES modules actually depend on each other: a classic script's top-level
// `function f` or `var v` is a window property with no `window.` anywhere; its
// top-level `let`/`const` is a global binding that is NOT a window property
// but that every module can still name bare; and a module can capture
// application functions off `window` at evaluation time. MS 70 cannot retire
// the monolith against an inventory that misses those edges.
//
// This audit parses every application script with acorn and resolves every
// identifier through real JavaScript scoping (hoisting, block scope, params,
// catch clauses, imports), so "free" means free. It reports:
//   - classic top-level declarations (implicit globals), per classic script;
//   - window.X / globalThis.X assignments and reads, marked evaluation-time
//     when they run as the module loads rather than inside a function;
//   - destructures off window (`const { a } = window`), likewise marked;
//   - bare cross-boundary references: a module naming a classic global, or a
//     classic script naming a global only a module publishes;
//   - window reads with no provider in the application (unowned), and reads
//     of names a classic script declares only with let/const/class, which are
//     not window properties at all;
//   - the static import graph, its cycles (strongly connected components)
//     and layer violations (core importing features/bootstrap; one filing
//     feature importing another's).
//
// It changes nothing. The ratchet (tests/unit/ms70-dependency-ratchet.spec.js)
// compares the sets that must never grow against
// tests/baseline/ms70-dependency-baseline.json.
//
// Usage (from probate-guardian/):
//   node scripts/ms70-dependency-audit.mjs                 summary
//   node scripts/ms70-dependency-audit.mjs --json          full result
//   node scripts/ms70-dependency-audit.mjs --write-baseline
//        rewrite the ratchet baseline and the dependency inventory -- only
//        when the change is deliberate: a delivery removed entries, or an
//        exception is recorded in MILESTONE-70-PROPOSAL.md.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'acorn';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const BASELINE_PATH = 'tests/baseline/ms70-dependency-baseline.json';
export const INVENTORY_PATH = 'tests/baseline/ms70-dependency-inventory.json';

// ── Scope analysis ─────────────────────────────────────────────────────────

class Scope {
  constructor(parent, kind) {
    this.parent = parent;
    this.kind = kind; // 'program' | 'function' | 'block'
    this.names = new Set();
  }
  functionScope() {
    let s = this;
    while (s.kind === 'block') s = s.parent;
    return s;
  }
  resolves(name) {
    for (let s = this; s; s = s.parent) if (s.names.has(name)) return true;
    return false;
  }
}

function patternNames(pattern, out = []) {
  if (!pattern) return out;
  switch (pattern.type) {
    case 'Identifier': out.push(pattern.name); break;
    case 'ObjectPattern':
      for (const p of pattern.properties) patternNames(p.type === 'RestElement' ? p.argument : p.value, out);
      break;
    case 'ArrayPattern': for (const e of pattern.elements) patternNames(e, out); break;
    case 'RestElement': patternNames(pattern.argument, out); break;
    case 'AssignmentPattern': patternNames(pattern.left, out); break;
    default: break;
  }
  return out;
}

const isFunction = (n) => n && (n.type === 'FunctionDeclaration' || n.type === 'FunctionExpression' || n.type === 'ArrowFunctionExpression');

/** var declarations and nested-block function declarations hoisted to a function/program body. */
function hoistInto(scope, node) {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) { for (const c of node) hoistInto(scope, c); return; }
  if (isFunction(node) || node.type === 'ClassDeclaration' || node.type === 'ClassExpression') {
    if (node.type === 'FunctionDeclaration' && node.id) scope.names.add(node.id.name); // Annex B: sloppy block functions are var-like
    return;
  }
  if (node.type === 'VariableDeclaration' && node.kind === 'var') {
    for (const d of node.declarations) for (const n of patternNames(d.id)) scope.names.add(n);
  }
  for (const key in node) {
    if (key === 'type' || key === 'start' || key === 'end' || key === 'loc') continue;
    const v = node[key];
    if (v && typeof v === 'object') hoistInto(scope, v);
  }
}

/** let/const/class/function declared directly in a statement list. */
function declareLexical(scope, statements) {
  for (const st of statements || []) {
    const decl = st && (st.type === 'ExportNamedDeclaration' || st.type === 'ExportDefaultDeclaration') ? st.declaration : st;
    if (!decl) continue;
    if (decl.type === 'VariableDeclaration' && decl.kind !== 'var') {
      for (const d of decl.declarations) for (const n of patternNames(d.id)) scope.names.add(n);
    } else if ((decl.type === 'FunctionDeclaration' || decl.type === 'ClassDeclaration') && decl.id) {
      scope.names.add(decl.id.name);
    }
  }
}

/**
 * Walk one parsed file, calling `onRef(identifierNode, scope, ctx)` for every
 * identifier in reference position (reads and writes) and `onNode(node, ctx)`
 * for every node. ctx.fnDepth is 0 while code runs at evaluation time.
 */
function analyze(ast, { onRef, onNode }) {
  const program = new Scope(null, 'program');
  hoistInto(program, ast.body);
  declareLexical(program, ast.body);
  for (const st of ast.body) {
    if (st.type === 'ImportDeclaration') for (const s of st.specifiers) program.names.add(s.local.name);
  }

  const visitFunction = (node, scope, ctx) => {
    const fn = new Scope(scope, 'function');
    if (node.type === 'FunctionExpression' && node.id) fn.names.add(node.id.name);
    for (const p of node.params) for (const n of patternNames(p)) fn.names.add(n);
    if (node.type !== 'ArrowFunctionExpression') fn.names.add('arguments');
    const inner = { ...ctx, fnDepth: ctx.fnDepth + 1 };
    for (const p of node.params) visitPattern(p, fn, inner);
    if (node.body.type === 'BlockStatement') {
      hoistInto(fn, node.body.body);
      declareLexical(fn, node.body.body);
      for (const st of node.body.body) visit(st, fn, inner);
    } else {
      visit(node.body, fn, inner);
    }
  };

  // Declaration patterns: identifiers are bindings; defaults and computed keys are expressions.
  function visitPattern(p, scope, ctx) {
    if (!p) return;
    switch (p.type) {
      case 'Identifier': return;
      case 'AssignmentPattern': visitPattern(p.left, scope, ctx); visit(p.right, scope, ctx); return;
      case 'ObjectPattern':
        for (const prop of p.properties) {
          if (prop.type === 'RestElement') visitPattern(prop.argument, scope, ctx);
          else { if (prop.computed) visit(prop.key, scope, ctx); visitPattern(prop.value, scope, ctx); }
        }
        return;
      case 'ArrayPattern': for (const e of p.elements) visitPattern(e, scope, ctx); return;
      case 'RestElement': visitPattern(p.argument, scope, ctx); return;
      default: visit(p, scope, ctx); // e.g. a MemberExpression target
    }
  }

  // Assignment targets: identifiers here are references (writes).
  function visitTarget(t, scope, ctx) {
    if (!t) return;
    switch (t.type) {
      case 'Identifier': onRef(t, scope, { ...ctx, write: true }); return;
      case 'AssignmentPattern': visitTarget(t.left, scope, ctx); visit(t.right, scope, ctx); return;
      case 'ObjectPattern':
        for (const prop of t.properties) {
          if (prop.type === 'RestElement') visitTarget(prop.argument, scope, ctx);
          else { if (prop.computed) visit(prop.key, scope, ctx); visitTarget(prop.value, scope, ctx); }
        }
        return;
      case 'ArrayPattern': for (const e of t.elements) visitTarget(e, scope, ctx); return;
      case 'RestElement': visitTarget(t.argument, scope, ctx); return;
      default: visit(t, scope, ctx);
    }
  }

  function visit(node, scope, ctx) {
    if (!node || typeof node.type !== 'string') return;
    onNode(node, ctx, scope);
    switch (node.type) {
      case 'Identifier': onRef(node, scope, ctx); return;
      case 'FunctionDeclaration': case 'FunctionExpression': case 'ArrowFunctionExpression':
        visitFunction(node, scope, ctx); return;
      case 'ClassDeclaration': case 'ClassExpression': {
        const cls = new Scope(scope, 'block');
        if (node.id) cls.names.add(node.id.name);
        visit(node.superClass, scope, ctx);
        for (const el of node.body.body) {
          if (el.computed) visit(el.key, cls, ctx);
          if (el.type === 'StaticBlock') {
            const blk = new Scope(cls, 'function');
            hoistInto(blk, el.body); declareLexical(blk, el.body);
            for (const st of el.body) visit(st, blk, { ...ctx, fnDepth: ctx.fnDepth + 1 });
          } else if (el.value) {
            visit(el.value, cls, el.type === 'PropertyDefinition' ? { ...ctx, fnDepth: ctx.fnDepth + 1 } : ctx);
          }
        }
        return;
      }
      case 'BlockStatement': {
        const blk = new Scope(scope, 'block');
        declareLexical(blk, node.body);
        for (const st of node.body) visit(st, blk, ctx);
        return;
      }
      case 'StaticBlock': return;
      case 'ForStatement': case 'ForInStatement': case 'ForOfStatement': {
        const head = new Scope(scope, 'block');
        const init = node.type === 'ForStatement' ? node.init : node.left;
        if (init && init.type === 'VariableDeclaration' && init.kind !== 'var') {
          for (const d of init.declarations) for (const n of patternNames(d.id)) head.names.add(n);
        }
        if (node.type === 'ForStatement') { visit(node.init, head, ctx); visit(node.test, head, ctx); visit(node.update, head, ctx); }
        else {
          if (node.left.type === 'VariableDeclaration') visit(node.left, head, ctx); else visitTarget(node.left, head, ctx);
          visit(node.right, head, ctx);
        }
        visit(node.body, head, ctx);
        return;
      }
      case 'CatchClause': {
        const c = new Scope(scope, 'block');
        for (const n of patternNames(node.param)) c.names.add(n);
        visitPattern(node.param, c, ctx);
        visit(node.body, c, ctx);
        return;
      }
      case 'SwitchStatement': {
        visit(node.discriminant, scope, ctx);
        const sw = new Scope(scope, 'block');
        for (const cs of node.cases) declareLexical(sw, cs.consequent);
        for (const cs of node.cases) { visit(cs.test, sw, ctx); for (const st of cs.consequent) visit(st, sw, ctx); }
        return;
      }
      case 'VariableDeclaration': for (const d of node.declarations) visit(d, scope, ctx); return;
      case 'VariableDeclarator': visitPattern(node.id, scope, ctx); visit(node.init, scope, ctx); return;
      case 'AssignmentExpression': visitTarget(node.left, scope, ctx); visit(node.right, scope, ctx); return;
      case 'UpdateExpression':
        if (node.argument.type === 'Identifier') onRef(node.argument, scope, { ...ctx, write: true });
        else visit(node.argument, scope, ctx);
        return;
      case 'MemberExpression': visit(node.object, scope, ctx); if (node.computed) visit(node.property, scope, ctx); return;
      case 'Property': if (node.computed) visit(node.key, scope, ctx); visit(node.value, scope, ctx); return;
      case 'MethodDefinition': case 'PropertyDefinition': if (node.computed) visit(node.key, scope, ctx); visit(node.value, scope, ctx); return;
      case 'LabeledStatement': visit(node.body, scope, ctx); return;
      case 'BreakStatement': case 'ContinueStatement': case 'MetaProperty':
      case 'ImportDeclaration': case 'ExportAllDeclaration': return;
      case 'ExportNamedDeclaration': visit(node.declaration, scope, ctx); return;
      case 'ExportDefaultDeclaration': visit(node.declaration, scope, ctx); return;
      default:
        for (const key in node) {
          if (key === 'type' || key === 'start' || key === 'end' || key === 'loc') continue;
          const v = node[key];
          if (Array.isArray(v)) { for (const c of v) if (c && typeof c.type === 'string') visit(c, scope, ctx); }
          else if (v && typeof v.type === 'string') visit(v, scope, ctx);
        }
    }
  }

  for (const st of ast.body) visit(st, program, { fnDepth: 0 });
  return program;
}

// ── One file ───────────────────────────────────────────────────────────────

const GLOBAL_OBJECTS = new Set(['window', 'globalThis']);

function staticPropName(member) {
  if (!member.computed && member.property.type === 'Identifier') return member.property.name;
  if (member.computed && member.property.type === 'Literal' && typeof member.property.value === 'string') return member.property.value;
  return null;
}

/**
 * Parse one application file. `classic` files are sloppy scripts whose
 * top-level declarations are globals; everything else is an ES module.
 */
export function analyzeFile(rel, source, { classic = false } = {}) {
  const ast = parse(source, { ecmaVersion: 'latest', sourceType: classic ? 'script' : 'module', locations: true, allowHashBang: true });
  const out = {
    file: rel, classic,
    declarations: [], // classic only: { name, kind, line }
    windowWrites: [], windowReads: [], windowDestructures: [],
    freeRefs: new Map(), // name -> { line, evalTime, write }
    imports: [],         // { source, kind: 'static' | 'dynamic', line }
  };
  if (classic) {
    for (const st of ast.body) {
      if (st.type === 'FunctionDeclaration') out.declarations.push({ name: st.id.name, kind: 'function', line: st.loc.start.line });
      else if (st.type === 'ClassDeclaration') out.declarations.push({ name: st.id.name, kind: 'class', line: st.loc.start.line });
      else if (st.type === 'VariableDeclaration') {
        for (const d of st.declarations) for (const n of patternNames(d.id)) out.declarations.push({ name: n, kind: st.kind, line: st.loc.start.line });
      }
    }
  }
  const writeTargets = new WeakSet();
  analyze(ast, {
    onNode(node, ctx) {
      const evalTime = ctx.fnDepth === 0;
      if (node.type === 'AssignmentExpression' && node.left.type === 'MemberExpression'
          && node.left.object.type === 'Identifier' && GLOBAL_OBJECTS.has(node.left.object.name)) {
        const name = staticPropName(node.left);
        if (name) { out.windowWrites.push({ name, line: node.loc.start.line, evalTime }); writeTargets.add(node.left); }
      }
      // Object.defineProperty(window, 'x', ...) / Reflect.defineProperty(...) and
      // Object.defineProperties(window, { x: ... }) publish globals too: the
      // monolith and main.js publish currentPage, D and a dozen state mirrors
      // this way, with no assignment syntax at all.
      if (node.type === 'CallExpression' && node.callee.type === 'MemberExpression'
          && node.callee.object.type === 'Identifier' && ['Object', 'Reflect'].includes(node.callee.object.name)
          && node.arguments[0] && node.arguments[0].type === 'Identifier' && GLOBAL_OBJECTS.has(node.arguments[0].name)) {
        const method = staticPropName(node.callee);
        const target = node.arguments[1];
        if (method === 'defineProperty' && target && target.type === 'Literal' && typeof target.value === 'string') {
          out.windowWrites.push({ name: target.value, line: node.loc.start.line, evalTime, via: 'defineProperty' });
        } else if (method === 'defineProperties' && target && target.type === 'ObjectExpression') {
          for (const prop of target.properties) {
            if (prop.type !== 'Property' || prop.computed) continue;
            const name = prop.key.type === 'Identifier' ? prop.key.name : (typeof prop.key.value === 'string' ? prop.key.value : null);
            if (name) out.windowWrites.push({ name, line: node.loc.start.line, evalTime, via: 'defineProperties' });
          }
        }
      }
      if (node.type === 'MemberExpression' && !writeTargets.has(node)
          && node.object.type === 'Identifier' && GLOBAL_OBJECTS.has(node.object.name)) {
        const name = staticPropName(node);
        if (name) out.windowReads.push({ name, line: node.loc.start.line, evalTime });
      }
      if (node.type === 'VariableDeclarator' && node.init && node.init.type === 'Identifier'
          && GLOBAL_OBJECTS.has(node.init.name) && node.id.type === 'ObjectPattern') {
        for (const p of node.id.properties) {
          if (p.type !== 'Property' || p.computed) continue;
          const name = p.key.type === 'Identifier' ? p.key.name : (typeof p.key.value === 'string' ? p.key.value : null);
          if (name) out.windowDestructures.push({ name, line: node.loc.start.line, evalTime });
        }
      }
      if (node.type === 'ImportDeclaration' || ((node.type === 'ExportNamedDeclaration' || node.type === 'ExportAllDeclaration') && node.source)) {
        out.imports.push({ source: node.source.value, kind: 'static', line: node.loc.start.line });
      }
      if (node.type === 'ImportExpression') {
        const src = node.source.type === 'Literal' ? node.source.value
          : (node.source.type === 'TemplateLiteral' && node.source.expressions.length === 0 ? node.source.quasis[0].value.cooked : null);
        out.imports.push({ source: src, kind: 'dynamic', line: node.loc.start.line });
      }
    },
    onRef(id, scope, ctx) {
      if (scope.resolves(id.name)) return;
      const prev = out.freeRefs.get(id.name);
      if (!prev) out.freeRefs.set(id.name, { line: id.loc.start.line, evalTime: ctx.fnDepth === 0, write: !!ctx.write });
      else { prev.evalTime ||= ctx.fnDepth === 0; prev.write ||= !!ctx.write; }
    },
  });
  return out;
}

// ── The application ────────────────────────────────────────────────────────

function walkJs(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walkJs(p, out);
    else if (/\.(m?js)$/.test(entry.name)) out.push(p);
  }
  return out;
}

/** Application classic scripts: index.html's <script src> tags without type="module", outside lib/. */
export function classicScriptsFromHtml(html) {
  const out = [];
  for (const m of html.matchAll(/<script\b([^>]*)>/g)) {
    const attrs = m[1];
    const src = /\bsrc\s*=\s*"([^"]+)"/.exec(attrs)?.[1];
    if (!src || /\btype\s*=\s*"module"/.test(attrs)) continue;
    const rel = src.replace(/^\.\//, '');
    if (!rel.startsWith('lib/')) out.push(rel);
  }
  return out;
}

function resolveImport(fromRel, spec, known) {
  if (!spec || !(spec.startsWith('./') || spec.startsWith('../') || spec.startsWith('/'))) return null;
  const clean = spec.replace(/[?#].*$/, '');
  const target = path.posix.normalize(path.posix.join(path.posix.dirname(fromRel), clean));
  if (known.has(target)) return target;
  for (const ext of ['.js', '.mjs', '/index.js']) if (known.has(target + ext)) return target + ext;
  return target; // outside the scanned set (e.g. templates/*.js, fragments/*.html?raw)
}

/** Strongly connected components with more than one member, or a self-import. */
export function findCycles(graph) {
  let index = 0;
  const stack = [], onStack = new Set(), idx = new Map(), low = new Map(), sccs = [];
  const strong = (v) => {
    idx.set(v, index); low.set(v, index); index++;
    stack.push(v); onStack.add(v);
    for (const w of graph.get(v) || []) {
      if (!idx.has(w)) { strong(w); low.set(v, Math.min(low.get(v), low.get(w))); }
      else if (onStack.has(w)) low.set(v, Math.min(low.get(v), idx.get(w)));
    }
    if (low.get(v) === idx.get(v)) {
      const comp = [];
      let w;
      do { w = stack.pop(); onStack.delete(w); comp.push(w); } while (w !== v);
      if (comp.length > 1 || (graph.get(v) || new Set()).has(v)) sccs.push(comp.sort());
    }
  };
  for (const v of [...graph.keys()].sort()) if (!idx.has(v)) strong(v);
  return sccs.sort((a, b) => a[0].localeCompare(b[0]));
}

/**
 * Layer rules (MILESTONE-70-PROPOSAL.md, "Composition and dependency rules"),
 * the mechanically checkable part: src/core may not import a filing feature,
 * the composition root, or the feature loader; one filing feature may not
 * import another's modules.
 */
export function layerViolation(from, to) {
  if (!to.startsWith('src/')) return null;
  const feature = (p) => /^src\/features\/([^/]+)\//.exec(p)?.[1] || null;
  if (from.startsWith('src/core/')
      && (to.startsWith('src/features/') || to === 'src/main.js' || to === 'src/features-loader.js')) return 'core-imports-feature-or-bootstrap';
  const a = feature(from), b = feature(to);
  if (a && b && a !== b) return 'feature-imports-other-feature';
  return null;
}

/**
 * Run the audit over an in-memory application: `files` maps a repo-relative
 * path to its source, `classic` lists the classic-script paths. Exported so
 * the ratchet's fault-injection tests can audit a synthetic application.
 */
export function auditSources(files, classic) {
  const classicSet = new Set(classic);
  const results = [...files.keys()].sort().map((rel) => analyzeFile(rel, files.get(rel), { classic: classicSet.has(rel) }));
  const known = new Set(files.keys());

  // Providers.
  const classicDecl = new Map(); // name -> [{ file, kind }]
  for (const r of results) for (const d of r.declarations) {
    if (!classicDecl.has(d.name)) classicDecl.set(d.name, []);
    classicDecl.get(d.name).push({ file: r.file, kind: d.kind });
  }
  const windowProvider = new Map(); // name -> Set(files) that make it a window property
  const addProvider = (name, file) => { if (!windowProvider.has(name)) windowProvider.set(name, new Set()); windowProvider.get(name).add(file); };
  for (const r of results) for (const w of r.windowWrites) addProvider(w.name, r.file);
  for (const [name, decls] of classicDecl) for (const d of decls) if (d.kind === 'function' || d.kind === 'var') addProvider(name, d.file);

  const edges = [];
  const bareCrossBoundary = [];
  const unownedWindowReads = new Map();
  const lexicalOnlyWindowReads = [];
  for (const r of results) {
    for (const read of [...r.windowReads, ...r.windowDestructures]) {
      const providers = [...(windowProvider.get(read.name) || [])].filter((f) => f !== r.file);
      if (windowProvider.has(read.name)) {
        for (const to of providers) edges.push({ from: r.file, to, kind: 'window', name: read.name, evalTime: read.evalTime });
      } else if (classicDecl.has(read.name)) {
        lexicalOnlyWindowReads.push({ file: r.file, name: read.name, line: read.line });
      } else {
        if (!unownedWindowReads.has(read.name)) unownedWindowReads.set(read.name, new Set());
        unownedWindowReads.get(read.name).add(r.file);
      }
    }
    for (const [name, ref] of r.freeRefs) {
      if (r.classic) {
        // A classic script naming a global that only a module publishes.
        const decl = classicDecl.get(name);
        const providers = [...(windowProvider.get(name) || [])].filter((f) => !classicSet.has(f));
        if (!decl && providers.length) {
          bareCrossBoundary.push({ file: r.file, name, providers: providers.sort(), line: ref.line });
          for (const to of providers) edges.push({ from: r.file, to, kind: 'bare', name, evalTime: ref.evalTime });
        }
      } else {
        // A module naming a classic script's global, or one another module published on window.
        const providers = [...new Set([...(classicDecl.get(name) || []).map((d) => d.file), ...(windowProvider.get(name) || [])])].filter((f) => f !== r.file);
        if (providers.length) {
          bareCrossBoundary.push({ file: r.file, name, providers: providers.sort(), line: ref.line });
          for (const to of providers) edges.push({ from: r.file, to, kind: 'bare', name, evalTime: ref.evalTime });
        }
      }
    }
  }

  // Import graph.
  const graph = new Map();
  const layerViolations = [];
  for (const r of results) {
    graph.set(r.file, graph.get(r.file) || new Set());
    for (const imp of r.imports) {
      const to = resolveImport(r.file, imp.source, known);
      edges.push({ from: r.file, to: to || `external:${imp.source}`, kind: `import-${imp.kind}`, name: null, evalTime: null });
      if (!to) continue;
      if (imp.kind === 'static' && known.has(to)) graph.get(r.file).add(to);
      const layer = layerViolation(r.file, to);
      if (layer) layerViolations.push({ from: r.file, to, rule: layer, kind: imp.kind });
    }
  }

  return {
    files: results.map((r) => r.file),
    classic: [...classicSet].sort(),
    classicDeclarations: results.flatMap((r) => r.declarations.map((d) => ({ file: r.file, ...d }))),
    windowWrites: results.flatMap((r) => r.windowWrites.map((w) => ({ file: r.file, ...w }))),
    windowReads: results.flatMap((r) => r.windowReads.map((w) => ({ file: r.file, ...w }))),
    windowDestructures: results.flatMap((r) => r.windowDestructures.map((w) => ({ file: r.file, ...w }))),
    bareCrossBoundary,
    unownedWindowReads: [...unownedWindowReads].map(([name, set]) => ({ name, files: [...set].sort() })).sort((a, b) => a.name.localeCompare(b.name)),
    lexicalOnlyWindowReads,
    cycles: findCycles(graph),
    layerViolations,
    edges,
  };
}

// Names that are platform or vendor globals, not application members, when
// read off window with no application provider.
const PLATFORM_READS = new Set(['location', 'document', 'navigator', 'history', 'localStorage', 'sessionStorage',
  'indexedDB', 'crypto', 'performance', 'screen', 'matchMedia', 'getComputedStyle', 'addEventListener',
  'removeEventListener', 'dispatchEvent', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval',
  'requestAnimationFrame', 'cancelAnimationFrame', 'requestIdleCallback', 'cancelIdleCallback', 'open', 'close',
  'print', 'focus', 'blur', 'scrollTo', 'scrollBy', 'scrollX', 'scrollY', 'pageXOffset', 'pageYOffset',
  'innerWidth', 'innerHeight', 'outerWidth', 'outerHeight', 'devicePixelRatio', 'isSecureContext', 'origin',
  'name', 'top', 'parent', 'self', 'opener', 'frames', 'confirm', 'alert', 'prompt', 'getSelection', 'postMessage',
  'showSaveFilePicker', 'showOpenFilePicker', 'showDirectoryPicker', 'caches', 'fetch', 'atob', 'btoa',
  'structuredClone', 'queueMicrotask', 'visualViewport', 'onerror', 'onunhandledrejection', 'onbeforeunload',
  'event', 'URL', 'Blob', 'File', 'FileReader', 'CustomEvent', 'Event', 'BroadcastChannel', 'Worker',
  'ResizeObserver', 'MutationObserver', 'IntersectionObserver', 'AbortController', 'DOMParser', 'XMLSerializer',
  'TextEncoder', 'TextDecoder', 'Intl', 'Promise', 'Math', 'JSON', 'Object', 'Array', 'Date', 'Number', 'String',
  'Symbol', 'Reflect', 'Proxy', 'Map', 'Set', 'WeakMap', 'WeakSet', 'Error', 'console', 'HTMLElement', 'Node',
  'Element', 'Image', 'OffscreenCanvas', 'Uint8Array', 'ArrayBuffer', 'globalThis', 'window', 'undefined',
  'speechSynthesis', 'SpeechSynthesisUtterance', 'CSS', 'getEventListeners', 'webkitURL', 'ServiceWorkerRegistration',
  'moveTo', 'moveBy', 'resizeTo', 'resizeBy', 'stop', 'find',
  // Vendor globals (index.html's lib/ classic scripts and bundled libraries).
  'JSZip', 'ExcelJS', 'bootstrap', 'html2pdf', 'jspdf', 'jsPDF', 'PDFLib', 'pdfjsLib']);

/** The sets that must never grow, as sorted string keys. */
export function ratchetSets(result) {
  const uniq = (xs) => [...new Set(xs)].sort();
  return {
    classicDeclarations: uniq(result.classicDeclarations.map((d) => `${d.file}::${d.name}`)),
    windowWrites: uniq(result.windowWrites.map((w) => `${w.file}::${w.name}`)),
    windowReads: uniq([...result.windowReads, ...result.windowDestructures].filter((r) => !PLATFORM_READS.has(r.name)).map((r) => `${r.file}::${r.name}`)),
    evalTimeWindowDestructures: uniq(result.windowDestructures.filter((d) => d.evalTime).map((d) => `${d.file}::${d.name}`)),
    bareCrossBoundary: uniq(result.bareCrossBoundary.map((b) => `${b.file}::${b.name}`)),
    unownedWindowReads: uniq(result.unownedWindowReads.filter((u) => !PLATFORM_READS.has(u.name)).map((u) => u.name)),
    lexicalOnlyWindowReads: uniq(result.lexicalOnlyWindowReads.map((r) => `${r.file}::${r.name}`)),
    cycles: uniq(result.cycles.map((c) => c.join(' <-> '))),
    layerViolations: uniq(result.layerViolations.map((v) => `${v.from} -> ${v.to} (${v.rule})`)),
  };
}

/**
 * Compare the current ratchet sets with a baseline. `grown` entries are new
 * and forbidden; `stale` entries are in the baseline but gone from the code,
 * so the baseline must be regenerated to lock the shrink in (otherwise the
 * set could silently grow back to its old size).
 */
export function compareRatchet(current, baseline) {
  const out = {};
  for (const key of Object.keys(current)) {
    const now = new Set(current[key]);
    const was = new Set(Array.isArray(baseline?.[key]) ? baseline[key] : []);
    out[key] = { grown: [...now].filter((x) => !was.has(x)), stale: [...was].filter((x) => !now.has(x)) };
  }
  return out;
}

/** Audit the real application under `projectRoot`. */
export function auditApplication(projectRoot = ROOT) {
  const classic = classicScriptsFromHtml(fs.readFileSync(path.join(projectRoot, 'index.html'), 'utf8'));
  const files = new Map();
  for (const abs of walkJs(path.join(projectRoot, 'src')).sort()) {
    files.set(path.relative(projectRoot, abs).replace(/\\/g, '/'), fs.readFileSync(abs, 'utf8'));
  }
  return auditSources(files, classic);
}

function summarize(result, sets) {
  const count = (k) => sets[k].length;
  const lines = [
    `files: ${result.files.length} (${result.classic.length} classic: ${result.classic.join(', ')})`,
    `classic top-level declarations (implicit globals): ${count('classicDeclarations')}`,
    ...result.classic.map((c) => `  ${c}: ${result.classicDeclarations.filter((d) => d.file === c).length}`),
    `window/globalThis writes: ${result.windowWrites.length} sites, ${count('windowWrites')} file::name pairs, ${result.windowWrites.filter((w) => w.evalTime).length} at evaluation time`,
    `window reads of application names: ${count('windowReads')} file::name pairs`,
    `destructures off window at evaluation time: ${count('evalTimeWindowDestructures')} pairs in ${new Set(sets.evalTimeWindowDestructures.map((k) => k.split('::')[0])).size} files`,
    `bare cross-boundary references: ${count('bareCrossBoundary')}`,
    `window reads with no application provider (non-platform): ${count('unownedWindowReads')}`,
    `window reads of names declared only with let/const/class (not window properties): ${count('lexicalOnlyWindowReads')}`,
    `static import cycles: ${count('cycles')}`,
    `layer violations: ${count('layerViolations')}`,
    `dependency edges: ${result.edges.length}`,
  ];
  return lines.join('\n');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = auditApplication();
  const sets = ratchetSets(result);
  if (process.argv.includes('--json')) {
    process.stdout.write(JSON.stringify({ ...result, ratchet: sets }, null, 2) + '\n');
  } else if (process.argv.includes('--write-baseline')) {
    const header = {
      generatedBy: 'node scripts/ms70-dependency-audit.mjs --write-baseline',
      note: 'Milestone 70 ratchet baseline. Every set may only shrink; tests/unit/ms70-dependency-ratchet.spec.js fails on growth and on stale entries. Regenerate only when a delivery removed entries or MILESTONE-70-PROPOSAL.md records an exception.',
    };
    fs.mkdirSync(path.join(ROOT, 'tests/baseline'), { recursive: true });
    fs.writeFileSync(path.join(ROOT, BASELINE_PATH), JSON.stringify({ ...header, ...sets }, null, 2) + '\n');
    const inventory = {
      generatedBy: 'node scripts/ms70-dependency-audit.mjs --write-baseline',
      note: 'Milestone 70 dependency inventory: every edge between application files (import, window property, bare global), with direction. Informational; regenerated with the baseline.',
      classic: result.classic,
      classicDeclarations: result.classicDeclarations,
      edges: result.edges,
      cycles: result.cycles,
      layerViolations: result.layerViolations,
      unownedWindowReads: result.unownedWindowReads,
      lexicalOnlyWindowReads: result.lexicalOnlyWindowReads,
    };
    fs.writeFileSync(path.join(ROOT, INVENTORY_PATH), JSON.stringify(inventory, null, 1) + '\n');
    console.log(`wrote ${BASELINE_PATH} and ${INVENTORY_PATH}`);
    console.log(summarize(result, sets));
  } else {
    console.log(summarize(result, sets));
  }
}
