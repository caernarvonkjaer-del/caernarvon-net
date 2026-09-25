import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';
import {
  DISPOSITIONS_PATH, REVIEW_PATH, DISPOSITION_KINDS, DELIVERIES, sectionsOf, declarationsOf,
} from '../../scripts/ms70-declaration-dispositions.mjs';

// Milestone 70, 70A gate: "every legacy declaration has a disposition".
// tests/baseline/ms70-declaration-dispositions.json is built from reference
// evidence by scripts/ms70-declaration-dispositions.mjs and corrected by the
// owner's review (tests/baseline/ms70-declaration-review.json). This keeps it
// complete and reviewed as the monolith changes: a new declaration without an
// entry, an entry for one that no longer exists, or an entry whose placement
// no longer matches what the review confirmed, fails.

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

  test('every window export is listed with the consumers that read it and an allowed reason', () => {
    const reasons = ['no-consumer', 'tests-only', 'monolith-only', 'modules-only', 'monolith-and-modules', 'publisher-never-loaded'];
    expect(draft.windowExports.length).toBeGreaterThan(0);
    expect(draft.windowExports.filter((x) => !reasons.includes(x.reason)).map((x) => `${x.file}::${x.name}`)).toEqual([]);
    // A publisher nothing loads was the Milestone 42E failure: its exports
    // reached no one. prune-cards.js was that publisher until Milestone 70's
    // 70C carried master's b28bf25 -- the router imports it now, and it
    // publishes nothing -- so no export may come from a module nothing loads.
    expect(draft.windowExports.filter((x) => x.reason === 'publisher-never-loaded').map((x) => `${x.file}::${x.name}`))
      .toEqual([]);
  });

  test('every entry carries an allowed disposition and a delivery', () => {
    const bad = draft.declarations.filter((d) => !DISPOSITION_KINDS.includes(d.disposition) || !DELIVERIES.includes(d.delivery));
    expect(bad.map((d) => d.name)).toEqual([]);
  });

  test("every entry is reviewed: its placement still matches the owner's review, and every correction says why", () => {
    const review = JSON.parse(fs.readFileSync(path.join(ROOT, REVIEW_PATH), 'utf8'));
    expect(draft.declarations.filter((d) => !d.reviewed).map((d) => `${d.name} (${d.disposition} ${d.delivery})`),
      'unreviewed: review it and record it in tests/baseline/ms70-declaration-review.json').toEqual([]);
    expect(Object.entries(review.overrides).filter(([, o]) => !review.why[o.why]).map(([n]) => n), 'an override without a reason').toEqual([]);
    expect(Object.keys(review.overrides).filter((n) => n in review.confirmed), 'both overridden and confirmed').toEqual([]);
  });
});
