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
  for (const file of files) {
    const source = fs.readFileSync(file, 'utf8');
    const name = rel(file);
    for (const m of source.matchAll(/\bwindow\.([A-Za-z_$][\w$]*)/g)) {
      const prop = m[1];
      if (PLATFORM.has(prop)) continue;
      if (assignedBy.get(prop)?.has(name)) continue;
      if (!consumers.has(prop)) consumers.set(prop, new Set());
      consumers.get(prop).add(name);
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
