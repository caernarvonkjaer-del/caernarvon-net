#!/usr/bin/env node
// Milestone 42C: inventory of what the application puts on `window`.
//
// Until Milestone 70 the classic script src/legacy-app.js and the ES modules
// reached each other through properties on `window`, and nothing declared
// that surface; 70K removed every one of them and 70L deleted the script.
// What is left is the reviewed boundary -- the frozen window.GuardianForms
// namespace (src/core/runtime/browser-api.js) -- and this audit, which
// enumerates the surface from the source itself, is what holds it there:
//
//   assignments  every `window.X = ...` site under src/ (file + name)
//   consumers    every app-defined `window.X` read in a module other than one
//                that assigns X (platform and vendor names are not counted)
//   surface      windowSurfaceNames(): the assignments, each classic script's
//                top-level functions and vars (window properties without any
//                assignment), and Object.defineProperty(window, 'X', ...)
//
// The classic scripts are the ones index.html loads with a plain
// <script src> outside lib/ (scripts/ms70-dependency-audit.mjs's
// classicScriptsFromHtml()): src/prepaint.js since 70L.
//
// tests/unit/window-bridge.spec.js holds the rule that no module assigns to
// window, and that src/core/types/guardian-forms.d.ts declares exactly the
// names this audit finds; tests/unit/removed-window-bridges.spec.js pins the
// whole surface to GuardianForms.
//
// Usage:  node scripts/audit-window-bridge.mjs            (summary)
//         node scripts/audit-window-bridge.mjs --json     (machine-readable)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'acorn';
import { classicScriptsFromHtml } from './ms70-dependency-audit.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// Browser/global names that are not app-defined bridge members (exported for
// tests/unit/ms70-monolith-deleted.spec.js, which holds unit specs to the same line).
export const PLATFORM = new Set(['location', 'document', 'addEventListener', 'removeEventListener', 'matchMedia',
  'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'requestAnimationFrame', 'cancelAnimationFrame',
  'innerWidth', 'innerHeight', 'outerWidth', 'outerHeight', 'crypto', 'navigator', 'open', 'print', 'scrollTo',
  'scrollY', 'scrollX', 'getComputedStyle', 'dispatchEvent', 'CustomEvent', 'Event', 'confirm', 'alert', 'prompt',
  'localStorage', 'sessionStorage', 'indexedDB', 'showSaveFilePicker', 'showOpenFilePicker', 'showDirectoryPicker',
  'URL', 'Blob', 'File', 'FileReader', 'JSZip', 'ExcelJS', 'jspdf', 'jsPDF', 'bootstrap', 'html2pdf', 'pdfjsLib',
  'devicePixelRatio', 'screen', 'history', 'name', 'top', 'parent', 'self', 'onerror', 'onunhandledrejection',
  'onbeforeunload', 'performance', 'origin', 'isSecureContext', 'BroadcastChannel', 'Worker', 'fetch', 'atob',
  'btoa', 'TextEncoder', 'TextDecoder', 'structuredClone', 'queueMicrotask', 'Intl', 'Promise', 'Math', 'JSON',
  'Object', 'Array', 'Date', 'Number', 'String', 'Set', 'Map', 'WeakMap', 'Error', 'console', 'focus', 'blur',
  'close', 'getSelection', 'postMessage', 'HTMLElement', 'Node', 'Element', 'Image', 'ImageData', 'OffscreenCanvas',
  'ResizeObserver', 'MutationObserver', 'IntersectionObserver', 'AbortController', 'DOMParser', 'XMLSerializer',
  'caches', 'ServiceWorkerRegistration', 'PDFLib', 'undefined', 'Uint8Array', 'ArrayBuffer', 'Symbol', 'Reflect',
  'Proxy', 'globalThis', 'window', 'moveTo', 'resizeTo']);

// ── Milestone 53D: the destructure consumer pass ────────────────────────────
//
// The `window.X` scan below is member-access only, so it never saw
// `const { esc, ic } = window` -- which is how every feature excel.js/index.js
// and dashboard/index.js reached legacy functions until Milestone 70's 70K.
// Those consumers were invisible to the audit, and therefore missing from the
// .d.ts it generated then, whose whole job was to let `tsc --noEmit` check
// modules that reached through window.
//
// This is done with a real parser, not a second regex. The first design for
// this pass matched `const\s*\{([^}]*)\}\s*=\s*window\b` and split the capture
// on commas; a review found it would misfire on code already in this repo --
// annual-accounting/index.js and guardian-inventory/index.js both carry a
// multi-line `//` comment INSIDE the destructure braces, one of which spells
// out an identifier (`toggleSsnReveal`) in prose that a comma-split would
// happily record as a consumer. Comments, string contents, aliases, defaults
// (including defaults containing commas), nested patterns and formatting are
// all handled here by construction rather than by accumulating special cases,
// because acorn tokenizes comments and strings out before an AST exists.
//
// TypeScript's compiler API was considered first and is NOT available: this
// repo pins typescript@7 (the native/Go port), whose npm package exports only
// `version` and `versionMajorMinor` -- no createSourceFile, no node type
// guards. acorn is a dedicated devDependency for this one pass.

/**
 * Visit every AST node. acorn ships a parser, not a walker; ESTree nodes are
 * plain nested objects/arrays keyed by `type`, so this short recursion covers
 * every node shape without pulling in acorn-walk as a second dependency.
 */
function walkAst(node, visit) {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) {
    for (const child of node) walkAst(child, visit);
    return;
  }
  if (typeof node.type === 'string') visit(node);
  for (const key in node) {
    if (key === 'type' || key === 'start' || key === 'end') continue;
    const value = node[key];
    if (value && typeof value === 'object') walkAst(value, visit);
  }
}

/**
 * Names destructured directly off `window` in one source file.
 *
 * Returns the PROPERTY read off window, not the local binding: for
 * `const { foo: bar } = window` that is `foo`. Skips `...rest` (not a named
 * single-property consumer) and computed keys (not a static name -- the same
 * limit the member-access scan has).
 *
 * Exported for tests/unit/window-bridge.spec.js's fixture table.
 */
export function findWindowDestructureConsumers(source) {
  let ast;
  try {
    ast = parse(source, { ecmaVersion: 'latest', sourceType: 'module' });
  } catch {
    // A file this cannot parse is not this pass's problem -- the member-access
    // scan still covers it independently, and a genuinely broken file fails
    // the build elsewhere.
    return [];
  }
  const names = new Set();
  walkAst(ast, (node) => {
    if (
      node.type !== 'VariableDeclarator'
      || !node.init || node.init.type !== 'Identifier' || node.init.name !== 'window'
      || !node.id || node.id.type !== 'ObjectPattern'
    ) return;
    for (const prop of node.id.properties) {
      if (prop.type !== 'Property' || prop.computed) continue;
      if (prop.key.type === 'Identifier') names.add(prop.key.name);
      else if (prop.key.type === 'Literal' && typeof prop.key.value === 'string') names.add(prop.key.value);
    }
  });
  return [...names];
}

// Milestone 70, 70K: the member scans below read the parse, as the
// destructure pass above always did. They were regexes over the whole file, so
// a comment naming window.X -- and after Milestone 70 most of those are history
// -- counted as a consumer and kept its name in the generated declaration.
function parseFile(source, classic) {
  try {
    return parse(source, { ecmaVersion: 'latest', sourceType: classic ? 'script' : 'module' });
  } catch {
    return null;
  }
}

const isWindow = (node) => node && node.type === 'Identifier' && node.name === 'window';

/** `window.X = ...` targets and `window.X` reads in one parsed file. */
function windowMembers(ast) {
  const assigned = [];
  const read = [];
  const targets = new Set();
  walkAst(ast, (node) => {
    if (node.type === 'AssignmentExpression' && node.left.type === 'MemberExpression' && !node.left.computed && isWindow(node.left.object)) {
      assigned.push(node.left.property.name);
      targets.add(node.left);
    }
  });
  walkAst(ast, (node) => {
    if (node.type === 'MemberExpression' && !node.computed && isWindow(node.object) && !targets.has(node)) read.push(node.property.name);
  });
  return { assigned, read };
}

/** `Object.defineProperty(window, 'X', ...)` names in one parsed file. */
function windowDefinedProperties(ast) {
  const names = [];
  walkAst(ast, (node) => {
    if (node.type === 'CallExpression' && node.callee.type === 'MemberExpression' && !node.callee.computed
        && node.callee.object.type === 'Identifier' && node.callee.object.name === 'Object'
        && node.callee.property.name === 'defineProperty' && isWindow(node.arguments[0])
        && node.arguments[1]?.type === 'Literal' && typeof node.arguments[1].value === 'string') names.push(node.arguments[1].value);
  });
  return names;
}

/** The classic scripts index.html loads (none in a tree without one). */
export function classicScripts(projectRoot = root) {
  const html = path.join(projectRoot, 'index.html');
  return fs.existsSync(html) ? classicScriptsFromHtml(fs.readFileSync(html, 'utf8')) : [];
}

/**
 * A classic script's top-level function and `var` declarations: each is a
 * property of `window` with no assignment anywhere (let, const and class are
 * not). Until 70L this read src/legacy-app.js's functions with a regex.
 */
function classicGlobals(ast) {
  const names = [];
  for (const st of ast.body) {
    if (st.type === 'FunctionDeclaration' && st.id) names.push(st.id.name);
    if (st.type === 'VariableDeclaration' && st.kind === 'var') {
      for (const d of st.declarations) if (d.id.type === 'Identifier') names.push(d.id.name);
    }
  }
  return names;
}

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p, out);
    else if (entry.name.endsWith('.js')) out.push(p);
  }
  return out;
}

export function auditWindowBridge(projectRoot = root) {
  const files = walk(path.join(projectRoot, 'src')).sort();
  const rel = (f) => path.relative(projectRoot, f).replace(/\\/g, '/');
  const classic = new Set(classicScripts(projectRoot));
  const assignments = [];
  const assignedBy = new Map();
  const consumers = new Map();

  const members = new Map();
  for (const file of files) {
    const name = rel(file);
    const ast = parseFile(fs.readFileSync(file, 'utf8'), classic.has(name));
    const found = ast ? windowMembers(ast) : { assigned: [], read: [] };
    members.set(name, found);
    for (const prop of found.assigned) {
      assignments.push({ file: name, name: prop });
      if (!assignedBy.has(prop)) assignedBy.set(prop, new Set());
      assignedBy.get(prop).add(name);
    }
  }
  const recordConsumer = (prop, name) => {
    if (PLATFORM.has(prop)) return;
    if (assignedBy.get(prop)?.has(name)) return;
    if (!consumers.has(prop)) consumers.set(prop, new Set());
    consumers.get(prop).add(name);
  };
  for (const file of files) {
    const source = fs.readFileSync(file, 'utf8');
    const name = rel(file);
    // Member access: window.X
    for (const prop of members.get(name).read) recordConsumer(prop, name);
    // Destructuring: const { X, Y: z } = window  (Milestone 53D)
    for (const prop of findWindowDestructureConsumers(source)) {
      recordConsumer(prop, name);
    }
  }

  return {
    assignments: assignments.sort((a, b) => a.file.localeCompare(b.file) || a.name.localeCompare(b.name)),
    consumers: [...consumers.entries()].sort((a, b) => b[1].size - a[1].size || a[0].localeCompare(b[0]))
      .map(([prop, set]) => ({ name: prop, files: [...set].sort() })),
  };
}

/**
 * Every name the source tree can put on `window`: `window.X =` assignments,
 * each classic script's top-level functions and vars, and
 * `Object.defineProperty(window, 'X', ...)`. Milestone 70, 70T: browser specs
 * no longer probe the live global surface by name, so a pin that a removed
 * bridge stays removed reads this instead (tests/unit/removed-window-bridges.spec.js).
 */
export function windowSurfaceNames(projectRoot = root) {
  const names = new Set(auditWindowBridge(projectRoot).assignments.map((a) => a.name));
  const classic = new Set(classicScripts(projectRoot));
  for (const file of walk(path.join(projectRoot, 'src'))) {
    const relName = path.relative(projectRoot, file).replace(/\\/g, '/');
    const ast = parseFile(fs.readFileSync(file, 'utf8'), classic.has(relName));
    if (!ast) continue;
    if (classic.has(relName)) for (const n of classicGlobals(ast)) names.add(n);
    for (const n of windowDefinedProperties(ast)) names.add(n);
  }
  return names;
}

/**
 * The declaration of that surface, written by hand since 70L: its
 * `interface Window` names each member this audit finds, typed, and
 * tests/unit/window-bridge.spec.js holds the two to each other. (Until 70L the
 * audit generated src/core/types/window-bridge.d.ts, every name typed `any`.)
 */
export const DECLARATION_PATH = 'src/core/types/guardian-forms.d.ts';

/** The member names of the `interface Window` block in a declaration file. */
export function declaredWindowNames(source) {
  const block = /\binterface Window \{([\s\S]*?)\n\}/.exec(source);
  if (!block) return [];
  return [...block[1].matchAll(/^\s+(?:readonly\s+)?([A-Za-z_$][\w$]*)\??\s*:/gm)].map((m) => m[1]);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = auditWindowBridge();
  if (process.argv.includes('--json')) {
    process.stdout.write(JSON.stringify({ ...result, surface: [...windowSurfaceNames()].sort() }, null, 2) + '\n');
  } else {
    const perFile = new Map();
    for (const a of result.assignments) perFile.set(a.file, (perFile.get(a.file) || 0) + 1);
    console.log(`window.X = assignments: ${result.assignments.length} across ${perFile.size} files`);
    for (const [f, n] of [...perFile].sort((a, b) => b[1] - a[1]).slice(0, 12)) console.log(`  ${String(n).padStart(3)}  ${f}`);
    console.log(`distinct app-defined window.* names read by modules: ${result.consumers.length}`);
    for (const c of result.consumers.slice(0, 12)) console.log(`  ${String(c.files.length).padStart(3)} files  ${c.name}`);
    console.log(`the surface (what the app can put on window): ${[...windowSurfaceNames()].sort().join(', ') || '(none)'}`);
    console.log(`classic scripts (index.html): ${classicScripts().join(', ') || '(none)'}`);
  }
}
