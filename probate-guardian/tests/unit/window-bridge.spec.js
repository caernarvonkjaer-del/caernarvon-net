// Milestone 42C: the classic-script <-> module bridge is an undeclared API
// of `window.X =` assignments. This spec freezes it: every assignment site
// must be in the checked-in allow-list, so adding a new global is a
// deliberate, reviewed edit to tests/unit/fixtures/window-bridge-allowlist.json
// (add the {file, name} pair by hand, or rebuild `assignments` from
// `node scripts/audit-window-bridge.mjs --json`) rather than something that
// ships unnoticed. Removing a global never
// fails this spec -- that is progress, and the allow-list entry just goes
// stale until someone prunes it.
//
// Same shape as tests/e2e/skip-classification-audit.spec.ts: a generated
// list, policed by a test, updated in the same commit as the change.
import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { auditWindowBridge, renderWindowDeclaration, DECLARATION_PATH, findWindowDestructureConsumers } from '../../scripts/audit-window-bridge.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const allowlist = JSON.parse(fs.readFileSync(path.join(root, 'tests', 'unit', 'fixtures', 'window-bridge-allowlist.json'), 'utf8'));
const key = (a) => `${a.file}::${a.name}`;

describe('window.* bridge inventory', () => {
  const audit = auditWindowBridge(root);

  // Diagnostic only, not a test: a removed global should never fail this
  // spec ("no window.X = assignment outside the allow-list" already covers
  // the direction that matters), so there is no assertion to make here --
  // just a console hint so someone eventually prunes the stale entry. Living
  // outside any it() means it can't masquerade as a passing assertion that
  // verifies nothing.
  beforeAll(() => {
    const live = new Set(audit.assignments.map(key));
    const stale = allowlist.assignments.filter((a) => !live.has(key(a))).map(key);
    if (stale.length) console.info(`window-bridge allow-list has ${stale.length} stale entries (globals since removed):\n  ${stale.join('\n  ')}`);
  });

  it('has no window.X = assignment outside the allow-list', () => {
    const allowed = new Set(allowlist.assignments.map(key));
    const undeclared = audit.assignments.filter((a) => !allowed.has(key(a))).map(key);
    expect(undeclared, 'new window.* assignments -- add them to tests/unit/fixtures/window-bridge-allowlist.json deliberately').toEqual([]);
  });

  it('keeps src/core/types/window-bridge.d.ts in sync with the source', () => {
    const onDisk = fs.readFileSync(path.join(root, DECLARATION_PATH), 'utf8').replace(/\r\n/g, '\n');
    expect(onDisk, `regenerate with: node scripts/audit-window-bridge.mjs --declare`).toBe(renderWindowDeclaration(audit));
  });

  it('never shadows a legacy top-level function from main.js twice', () => {
    // main.js re-publishing a name that ward-lifecycle.js already assigns is
    // a third definition of the same function; 42E resolves the current
    // pair. New ones must not appear.
    const byName = new Map();
    for (const s of audit.shadowed) byName.set(s.name, [...(byName.get(s.name) || []), s.module]);
    const triple = [...byName].filter(([, mods]) => mods.length > 1).map(([n, mods]) => `${n} <- ${mods.join(', ')}`);
    const known = allowlist.knownTripleDefinitions || [];
    expect(triple.filter((t) => !known.includes(t))).toEqual([]);
  });

  it('sees consumers that only ever destructure off window (Milestone 53D)', () => {
    // capitalizeImportedFields is read by all three feature excel.js files and
    // by nothing as `window.capitalizeImportedFields`, so before 53D taught the
    // audit to parse destructuring it was invisible here -- and therefore
    // missing from the generated .d.ts. This assertion was red before D1.
    const entry = audit.consumers.find((c) => c.name === 'capitalizeImportedFields');
    expect(entry, 'capitalizeImportedFields must appear as a consumed bridge name').toBeTruthy();
    expect(entry.files).toEqual(
      expect.arrayContaining([
        'src/features/annual-accounting/excel.js',
        'src/features/guardian-inventory/excel.js',
        'src/features/simplified-accounting/excel.js',
      ]),
    );
  });
});

// Milestone 53D: the destructure pass is AST-based (acorn), not a second
// regex. The first design for it comma-split the text between the braces,
// which would have misfired on code already in this repo -- both
// annual-accounting/index.js and guardian-inventory/index.js carry a multi-line
// comment INSIDE the destructure braces, one of which names an identifier
// (toggleSsnReveal) in prose that a text split would record as a real consumer.
// Each row below is a shape that broke, or would break, a text-based parser.
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

  it('does not invent a consumer from the prose inside a real repo file', () => {
    const source = fs.readFileSync(path.join(root, 'src', 'features', 'guardian-inventory', 'index.js'), 'utf8');
    const names = findWindowDestructureConsumers(source);
    expect(names).toContain('esc');
    // Named only in a comment inside the braces -- Milestone 51C removed the
    // actual binding. A comma-splitting parser records it; a real one cannot.
    expect(names).not.toContain('toggleSsnReveal');
  });
});
