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
import { auditWindowBridge, renderWindowDeclaration, DECLARATION_PATH } from '../../scripts/audit-window-bridge.mjs';

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
});
