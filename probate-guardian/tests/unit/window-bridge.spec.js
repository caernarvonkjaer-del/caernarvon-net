// Milestone 42C froze the classic-script <-> module bridge -- an undeclared
// API of `window.X =` assignments -- with a checked-in allow-list and a
// generated declaration of every name (src/core/types/window-bridge.d.ts, all
// `any`). Milestone 70 took the bridge apart: 70K removed the last assignment
// and 70L deleted the classic monolith, the empty allow-list and the generated
// declaration. What is left on window is the reviewed namespace,
// window.GuardianForms, and the test runner's pre-boot flag, declared by hand
// in src/core/types/guardian-forms.d.ts.
//
// This spec holds the rule -- no module puts anything on window -- and holds
// the declaration to the audit (scripts/audit-window-bridge.mjs), in both
// directions: a window member the source reads or defines that the declaration
// does not name fails, and so does a declared one nothing reads or defines.
// (tests/unit/removed-window-bridges.spec.js pins the surface itself to
// GuardianForms; testing-adapter.spec.js the namespace's members.)
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  auditWindowBridge, windowSurfaceNames, DECLARATION_PATH, declaredWindowNames, findWindowDestructureConsumers,
} from '../../scripts/audit-window-bridge.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

// A small source tree for the audit's passes: this repo has no example of each
// shape left to show them on (Milestone 70's 70K removed the last).
function auditTree(files) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ms70-bridge-'));
  try {
    fs.mkdirSync(path.join(tmp, 'src'));
    for (const [name, text] of Object.entries(files)) fs.writeFileSync(path.join(tmp, 'src', name), text);
    return auditWindowBridge(tmp);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

describe('what the application puts on window', () => {
  const audit = auditWindowBridge(root);

  // Milestone 70, 70K: "the bridge audit permits only the reviewed
  // GuardianForms namespace" -- no module assigns to window at all.
  it('no module assigns an application global to window', () => {
    expect(audit.assignments).toEqual([]);
  });

  // Milestone 70, 70L: the declaration is written by hand, so it is held to
  // the source instead of regenerated from it.
  it('src/core/types/guardian-forms.d.ts declares exactly the window members the source reads or defines', () => {
    const declared = declaredWindowNames(fs.readFileSync(path.join(root, DECLARATION_PATH), 'utf8')).sort();
    const found = [...new Set([...audit.consumers.map((c) => c.name), ...windowSurfaceNames(root)])].sort();
    expect(declared, 'the declaration reads as the namespace and the flag').toEqual(['GuardianForms', '__GUARDIAN_FORMS_TEST_MODE__']);
    expect(found.filter((n) => !declared.includes(n)), `read or defined on window but not declared in ${DECLARATION_PATH}`).toEqual([]);
    expect(declared.filter((n) => !found.includes(n)), `declared in ${DECLARATION_PATH} but nothing reads or defines it`).toEqual([]);
  });

  it('reads the declaration\'s members, whatever their modifiers', () => {
    const d = 'interface Other {\n  nope: any;\n}\ninterface Window {\n  /** a */\n  readonly A?: X;\n  b: Y;\n  c?: Z;\n}\n';
    expect(declaredWindowNames(d)).toEqual(['A', 'b', 'c']);
  });

  it('sees consumers that only ever destructure off window (Milestone 53D)', () => {
    // A name read only by a load-time destructure, never as `window.X`, was
    // invisible to the audit before 53D taught it to parse destructuring --
    // and so missing from the declaration it generated then. This assertion
    // was red before D1, written against capitalizeImportedFields; then
    // ensureTemplate; then annual-accounting/index.js's n(), until Milestone
    // 70's 70K turned the last feature destructure into imports. It runs on a
    // synthetic tree now.
    const tree = auditTree({ 'a.js': 'const { n } = window;\nexport const one = n(1);\n' });
    const entry = tree.consumers.find((c) => c.name === 'n');
    expect(entry, 'n must appear as a consumed bridge name').toBeTruthy();
    expect(entry.files).toEqual(['src/a.js']);
  });

  // Milestone 70, 70K: the member scans read the parse. They matched the
  // text, so a comment telling the history -- "it read window.caseFile" --
  // kept a name nothing uses in the generated declaration.
  it('reads code, not comments: a comment naming window.X is neither a consumer nor a publication', () => {
    const tree = auditTree({
      'a.js': '// until 70J this read window.caseFile, and set window.D = {}\nexport const x = window.location.hash;\n',
      'b.js': 'window.published = 1;\nexport const y = window.readHere;\n',
    });
    expect(tree.consumers.map((c) => c.name).sort()).toEqual(['readHere']);
    expect(tree.assignments).toEqual([{ file: 'src/b.js', name: 'published' }]);
  });
});

// Milestone 53D: the destructure pass is AST-based (acorn), not a second
// regex. The first design for it comma-split the text between the braces,
// which would have misfired on code already in this repo -- both
// annual-accounting/index.js and guardian-inventory/index.js carried a
// multi-line comment INSIDE the destructure braces, one of which named an
// identifier (toggleSsnReveal) in prose that a text split would record as a
// real consumer. Each row below is a shape that broke, or would break, a
// text-based parser.
describe('findWindowDestructureConsumers: the parser, case by case', () => {
  const CASES = [
    ['a simple destructure', 'const { esc, ic } = window;', ['esc', 'ic']],
    [
      'a multi-line destructure with a trailing comment',
      'const {\n  esc,\n  // just a note\n  ic,\n} = window;',
      ['esc', 'ic'],
    ],
    [
      'the real shape: a comment inside the braces naming an identifier in prose',
      'const {\n  esc,\n  // Milestone 51C dropped `toggleSsnReveal` from this list --\n  // destructured but never called here.\n  ic,\n} = window;',
      ['esc', 'ic'],
    ],
    ['an alias', 'const { foo: bar } = window;', ['foo']],
    ['a default', 'const { foo = 1 } = window;', ['foo']],
    ['a default expression containing commas', 'const { foo = fn(1, 2, 3) } = window;', ['foo']],
    ['nested destructuring', 'const { foo: { bar } } = window;', ['foo']],
    ['a let declaration', 'let { foo } = window;', ['foo']],
    ['a var declaration', 'var { foo } = window;', ['foo']],
    ['a string literal that merely looks like one', 'const s = "const { fake } = window";', []],
    ['a rest element', 'const { ...rest } = window;', []],
    ['a computed key', 'const k = "x"; const { [k]: v } = window;', []],
    ['a destructure of something other than window', 'const { foo } = notWindow;', []],
    ['a quoted property name', 'const { "foo": bar } = window;', ['foo']],
    ['a destructure inside a function body', 'function f(){ const { foo } = window; return foo; }', ['foo']],
    ['unparseable source', 'const { = = = ;', []],
  ];

  it.each(CASES)('%s', (_label, source, expected) => {
    expect(findWindowDestructureConsumers(source).sort()).toEqual([...expected].sort());
  });

  // The shape these rows were written against was guardian-inventory/index.js's
  // own destructure (its comment naming toggleSsnReveal is the "real shape" row
  // above); since Milestone 70's 70K no module destructures off window at all.
  it('no module in the repo destructures off window', () => {
    const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(dir, e.name)) : e.name.endsWith('.js') ? [path.join(dir, e.name)] : []));
    const found = walk(path.join(root, 'src')).flatMap((f) => findWindowDestructureConsumers(fs.readFileSync(f, 'utf8')).map((n) => `${path.relative(root, f)}: ${n}`));
    expect(found).toEqual([]);
  });
});
