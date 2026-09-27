import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';
import { parse } from 'acorn';

// Milestone 70, 70H gate: "The dashboard, picker, activity log, Manage Shared
// Records, Help, tours, feedback, theme, and dialogs work without a production
// call through a legacy global." And the work: "Make each controller's
// listener/observer lifecycle explicit and disposable."
//
// A function still in the monolith is reached as monolith.X
// (src/core/runtime/monolith.js, the recorded transition door), never off
// window; what window still gives these surfaces is the browser's own.

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const rel = (f) => path.relative(root, f).split(path.sep).join('/');
const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(dir, e.name))
  : /\.js$/.test(e.name) ? [path.join(dir, e.name)] : []));
const read = (r) => fs.readFileSync(path.join(root, r), 'utf8');
const parseModule = (r) => parse(read(r), { ecmaVersion: 'latest', sourceType: 'module', locations: true });
function visit(node, fn, parent = null) {
  if (!node || typeof node.type !== 'string') return;
  fn(node, parent);
  for (const k of Object.keys(node)) {
    const c = node[k];
    if (Array.isArray(c)) c.forEach((x) => visit(x, fn, node)); else if (c && typeof c.type === 'string') visit(c, fn, node);
  }
}

const SURFACES = [
  ...['src/features/dashboard', 'src/core/shell', 'src/core/activity', 'src/core/parties', 'src/core/help', 'src/core/feedback', 'src/core/modals']
    .flatMap((d) => walk(path.join(root, d)).map(rel)),
  'src/core/theme-preference.js', 'src/core/ui/dialogs.js', 'src/core/ui/combobox.js', 'src/core/ward-lock.js',
  'src/shell-events.js', 'src/modal-events.js',
].sort();
// The browser's own, as these surfaces use it.
const PLATFORM = new Set(['innerHeight', 'innerWidth', 'location', 'matchMedia', 'moveTo', 'open', 'resizeTo', 'screen',
  'navigator', 'localStorage', 'sessionStorage', 'setTimeout', 'clearTimeout', 'requestAnimationFrame', 'getComputedStyle',
  'scrollTo', 'scrollX', 'scrollY', 'print', 'crypto', 'history', 'addEventListener', 'removeEventListener', 'dispatchEvent',
  'devicePixelRatio', 'visualViewport', 'isSecureContext', 'showSaveFilePicker', 'showOpenFilePicker']);
// Each controller's install function, and main.js calls each once.
const INSTALLS = {
  installFeedbackModal: 'src/core/feedback/feedback-modal.js',
  installShellEvents: 'src/shell-events.js',
  installModalEvents: 'src/modal-events.js',
  installFormEvents: 'src/form-events.js',
  installHelpPanelKeys: 'src/core/help/help-panel.js',
  installFilingSwitcherDismiss: 'src/core/shell/filing-switcher.js',
  installConvertSourceDismiss: 'src/core/modals/convert-ward-modal.js',
  installWardNameComboboxDismiss: 'src/core/modals/filing-dialogs.js',
};

describe("the shell's surfaces", () => {
  test('read nothing but the browser from window -- no legacy global, by member or by destructure', () => {
    expect(SURFACES.length).toBeGreaterThan(25);
    const offenders = [];
    for (const r of SURFACES) {
      visit(parseModule(r), (n, parent) => {
        if (n.type === 'MemberExpression' && !n.computed && n.object.type === 'Identifier' && n.object.name === 'window'
            && !(parent && parent.type === 'AssignmentExpression' && parent.left === n) && !PLATFORM.has(n.property.name)) {
          offenders.push(`${r}:${n.loc.start.line} window.${n.property.name}`);
        }
        if (n.type === 'MemberExpression' && n.computed && n.object.type === 'Identifier' && n.object.name === 'window') {
          offenders.push(`${r}:${n.loc.start.line} window[...]`);
        }
        if (n.type === 'VariableDeclarator' && n.init?.type === 'Identifier' && n.init.name === 'window' && n.id.type === 'ObjectPattern') {
          offenders.push(`${r}:${n.loc.start.line} { ... } = window`);
        }
      });
    }
    expect(offenders, 'import it, or call a monolith function as monolith.X').toEqual([]);
  }, 60_000);

  test('add no document or window listener when imported, and pass a signal to every one they add', () => {
    const atLoad = [];
    const unsignalled = [];
    for (const r of [...SURFACES, 'src/form-events.js']) {
      const ast = parseModule(r);
      for (const st of ast.body) {
        visit(st, (n) => {
          if (n.type !== 'CallExpression' || n.callee.type !== 'MemberExpression' || n.callee.computed) return;
          const target = n.callee.object.type === 'Identifier' ? n.callee.object.name : null;
          if (!['document', 'window'].includes(target) || n.callee.property.name !== 'addEventListener') return;
          const inFunction = !(st.type === 'ExpressionStatement' && st.expression === n);
          if (!inFunction) atLoad.push(`${r}:${n.loc.start.line}`);
          const opts = n.arguments[2];
          const hasSignal = opts && opts.type === 'ObjectExpression' && opts.properties.some((p) => (p.type === 'Property' && p.key.name === 'signal')
            || (p.type === 'SpreadElement'));
          if (!hasSignal) unsignalled.push(`${r}:${n.loc.start.line} ${target}.addEventListener('${n.arguments[0]?.value}')`);
        });
      }
    }
    expect(atLoad, 'installed by an install function main.js calls, not by importing the module').toEqual([]);
    expect(unsignalled, 'every document or window listener takes the install signal, so it can be removed').toEqual([]);
  }, 60_000);

  test('main.js installs each controller once', () => {
    const main = read('src/main.js');
    for (const [fn, file] of Object.entries(INSTALLS)) {
      expect(read(file), `${file} exports ${fn}`).toMatch(new RegExp(`export function ${fn}\\(\\{ signal \\} = \\{\\}\\)`));
      expect((main.match(new RegExp(`\\b${fn}\\(\\)`, 'g')) || []).length, `main.js calls ${fn}() once`).toBe(1);
    }
  });
});
