#!/usr/bin/env node
// Milestone 42C: inventory of the classic-script <-> ES-module bridge.
//
// legacy-app.js is a classic script; modules and legacy code reach each other
// only through properties on `window`. Nothing declares that surface, so this
// script enumerates it from the source itself:
//
//   assignments  every `window.X = ...` site under src/ (file + name)
//   consumers    every app-defined `window.X` read/call in a module other
//                than one that assigns X
//   shadowed     a `window.X =` in a module where legacy-app.js also declares
//                a top-level `function X(){}` -- the module version wins at
//                runtime and the legacy body is dead (see 40F, 42E)
//
// tests/unit/window-bridge.spec.js compares `assignments` against a checked-in
// allow-list so an undeclared new global fails a test instead of shipping.
//
// The same inventory is also the type declaration: src/core/types/window-bridge.d.ts
// augments `interface Window` with every assigned-or-consumed name (typed
// `any` until someone tightens one), which is what lets `tsc --noEmit`
// check modules that reach through window without 450 "property does not
// exist on Window" errors. window-bridge.spec.js fails if that file is out
// of date with the source.
//
// Usage:  node scripts/audit-window-bridge.mjs            (summary)
//         node scripts/audit-window-bridge.mjs --json     (machine-readable)
//         node scripts/audit-window-bridge.mjs --declare  (rewrite window-bridge.d.ts)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'acorn';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// Browser/global names that are not app-defined bridge members.
const PLATFORM = new Set(['location', 'document', 'addEventListener', 'removeEventListener', 'matchMedia',
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
  'Proxy', 'globalThis', 'window']);

// ── Milestone 53D: the destructure consumer pass ────────────────────────────
//
// The `window.X` scan below is member-access only, so it never saw
// `const { esc, ic } = window` -- which is how every feature excel.js/index.js
// and dashboard/index.js actually reach legacy functions. Those consumers were
// invisible to the audit, and therefore missing from the generated .d.ts whose
// whole job is to let `tsc --noEmit` check modules that reach through window.
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
  const assignments = [];
  const assignedBy = new Map();
  const consumers = new Map();
  const legacyPath = path.join(projectRoot, 'src', 'legacy-app.js');
  const legacy = fs.readFileSync(legacyPath, 'utf8');
  const legacyTopLevel = new Set([...legacy.matchAll(/^(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(/gm)].map((m) => m[1]));

  for (const file of files) {
    const source = fs.readFileSync(file, 'utf8');
    const name = rel(file);
    for (const m of source.matchAll(/^\s*window\.([A-Za-z_$][\w$]*)\s*=(?!=)/gm)) {
      assignments.push({ file: name, name: m[1] });
      if (!assignedBy.has(m[1])) assignedBy.set(m[1], new Set());
      assignedBy.get(m[1]).add(name);
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
    for (const m of source.matchAll(/\bwindow\.([A-Za-z_$][\w$]*)/g)) {
      recordConsumer(m[1], name);
    }
    // Destructuring: const { X, Y: z } = window  (Milestone 53D)
    for (const prop of findWindowDestructureConsumers(source)) {
      recordConsumer(prop, name);
    }
  }
  const shadowed = assignments
    .filter((a) => a.file !== 'src/legacy-app.js' && legacyTopLevel.has(a.name))
    .map((a) => ({ name: a.name, module: a.file }));

  return {
    assignments: assignments.sort((a, b) => a.file.localeCompare(b.file) || a.name.localeCompare(b.name)),
    consumers: [...consumers.entries()].sort((a, b) => b[1].size - a[1].size || a[0].localeCompare(b[0]))
      .map(([prop, set]) => ({ name: prop, files: [...set].sort() })),
    shadowed: shadowed.sort((a, b) => a.module.localeCompare(b.module) || a.name.localeCompare(b.name)),
  };
}

export const DECLARATION_PATH = 'src/core/types/window-bridge.d.ts';

/** The `interface Window` augmentation text for the current source tree. */
export function renderWindowDeclaration(result) {
  const names = new Set();
  for (const a of result.assignments) names.add(a.name);
  for (const c of result.consumers) names.add(c.name);
  const sorted = [...names].sort((a, b) => a.localeCompare(b));
  return [
    '// GENERATED by scripts/audit-window-bridge.mjs --declare. Do not edit by hand.',
    '//',
    '// Milestone 42C: the classic-script <-> ES-module bridge, declared. Every',
    '// name a module assigns to or reads from `window` is listed here so that',
    '// `tsc --noEmit` can check those modules at all. Everything is `any` until',
    '// someone tightens a specific name; tests/unit/window-bridge.spec.js fails',
    '// when this file is out of date with the source.',
    '',
    'interface Window {',
    ...sorted.map((n) => `  ${/^[A-Za-z_$][\w$]*$/.test(n) ? n : JSON.stringify(n)}: any;`),
    '}',
    '',
  ].join('\n');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = auditWindowBridge();
  if (process.argv.includes('--declare')) {
    const target = path.join(root, DECLARATION_PATH);
    fs.writeFileSync(target, renderWindowDeclaration(result));
    console.log(`wrote ${DECLARATION_PATH} (${new Set([...result.assignments.map((a) => a.name), ...result.consumers.map((c) => c.name)]).size} names)`);
  } else if (process.argv.includes('--json')) {
    process.stdout.write(JSON.stringify(result, null, 2) + '\n');
  } else {
    const perFile = new Map();
    for (const a of result.assignments) perFile.set(a.file, (perFile.get(a.file) || 0) + 1);
    console.log(`window.X = assignments: ${result.assignments.length} across ${perFile.size} files`);
    for (const [f, n] of [...perFile].sort((a, b) => b[1] - a[1]).slice(0, 12)) console.log(`  ${String(n).padStart(3)}  ${f}`);
    console.log(`distinct app-defined window.* names consumed by other modules: ${result.consumers.length}`);
    for (const c of result.consumers.slice(0, 12)) console.log(`  ${String(c.files.length).padStart(3)} files  ${c.name}`);
    console.log(`shadowed legacy twins (module window.X = over a legacy top-level function X): ${result.shadowed.length}`);
    for (const s of result.shadowed) console.log(`  ${s.name}  <- ${s.module}`);
  }
}
