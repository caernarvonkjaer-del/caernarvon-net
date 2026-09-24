import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';
import {
  DISPOSITIONS_PATH, DISPOSITION_KINDS, DELIVERIES, sectionsOf, declarationsOf,
} from '../../scripts/ms70-declaration-dispositions.mjs';

// Milestone 70, 70A gate: "every legacy declaration has a disposition".
// tests/baseline/ms70-declaration-dispositions.json is a reviewable draft --
// each entry reviewed:false until confirmed -- built from reference evidence
// by scripts/ms70-declaration-dispositions.mjs. This keeps it complete as the
// monolith changes: a new declaration without an entry, or an entry for one
// that no longer exists, fails.

const ROOT = path.join(__dirname, '..', '..');

describe('the evidence the draft is built from', () => {
  test('sections come from the banner rules, and only recognised titles open one', () => {
    const src = ['// ═══════', '// COMMON HELPERS', '// ═══════', 'const a=1;', '// ═══════', '// Just prose after a rule', 'const b=2;'].join('\n');
    expect(sectionsOf(src).map((s) => `${s.title}:${s.delivery}`)).toEqual(['COMMON HELPERS:70B']);
  });

  test('references are resolved through scope: a same-named local or parameter does not keep a declaration alive', () => {
    const src = [
      'function used(){}', 'function shadowed(){}', 'function viaWindow(){}', 'function dead(){}',
      'used();', 'function f(shadowed){ return shadowed; }', 'window.viaWindow();',
    ].join('\n');
    expect(Object.fromEntries(declarationsOf(src).map((d) => [d.name, d.internalRefs]))).toEqual({ used: 1, shadowed: 0, viaWindow: 1, dead: 0, f: 0 });
  });
});

describe('the draft against src/legacy-app.js', () => {
  const draft = JSON.parse(fs.readFileSync(path.join(ROOT, DISPOSITIONS_PATH), 'utf8'));
  const current = declarationsOf(fs.readFileSync(path.join(ROOT, 'src/legacy-app.js'), 'utf8')).map((d) => d.name).sort();
  const listed = draft.declarations.map((d) => d.name).sort();

  test('every declaration has exactly one entry, and no entry names a declaration that is gone', () => {
    expect(listed.filter((n, i) => listed.indexOf(n) !== i), 'duplicate entries').toEqual([]);
    expect(current.filter((n) => !listed.includes(n)), 'new declarations without a disposition: run node scripts/ms70-declaration-dispositions.mjs --write').toEqual([]);
    expect(listed.filter((n) => !current.includes(n)), 'entries for declarations that no longer exist').toEqual([]);
  });

  test('every entry carries an allowed disposition and a delivery', () => {
    const bad = draft.declarations.filter((d) => !DISPOSITION_KINDS.includes(d.disposition) || !DELIVERIES.includes(d.delivery));
    expect(bad.map((d) => d.name)).toEqual([]);
  });
});
