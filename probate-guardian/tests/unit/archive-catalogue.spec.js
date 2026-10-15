import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';
import { CAPTURE_POINT, HISTORICAL, README_PATH, REFERENCE_PATH, derive, git, readme } from '../../scripts/archive-catalogue.mjs';
import { discoverSpecs, root } from '../../scripts/test-source-analysis.mjs';

// TEST-REVIEW.md Delivery 7 (2026-10-15): archive/testing is a catalogue of
// references, never a copy, and it stays true -- what the files say is what
// git and tests/baseline/ say now, every retired path is gone, every commit
// cited exists and holds the file it is said to, every historical path and
// baseline exists, and nothing catalogued as retired is reachable from the
// suite's active discovery.

const reference = JSON.parse(fs.readFileSync(path.join(root, REFERENCE_PATH), 'utf8'));

describe('archive/testing stays a true catalogue', () => {
  test('the files say what the generator derives now (run node scripts/archive-catalogue.mjs --write after a deletion or a new baseline)', () => {
    const now = derive();
    expect(reference.retired, 'retired files').toEqual(now.retired);
    expect(reference.baselines.map((b) => b.file), 'baselines').toEqual(now.baselines.map((b) => b.file));
    expect(reference.historicalComparisons, 'historical comparisons').toEqual(HISTORICAL);
    expect(reference.capturePoint, 'capture point').toEqual(CAPTURE_POINT);
    expect(fs.readFileSync(path.join(root, README_PATH), 'utf8')).toBe(readme(reference));
  }, 60_000);

  test('the capture point exists, its short form resolves to it, every path it names resolves at it, and the README links it', () => {
    expect(() => git('cat-file', '-e', `${CAPTURE_POINT.sha}^{commit}`)).not.toThrow();
    expect(git('rev-parse', CAPTURE_POINT.short).trim()).toBe(CAPTURE_POINT.sha);
    for (const p of CAPTURE_POINT.paths) expect(git('ls-tree', CAPTURE_POINT.sha, '--', p).trim(), `${p} at ${CAPTURE_POINT.short}`).not.toBe('');
    expect(git('ls-tree', '-r', '--name-only', CAPTURE_POINT.sha, '--', 'probate-guardian/tests').split('\n').filter(Boolean).length).toBeGreaterThan(100);
    expect(CAPTURE_POINT.browse).toContain(CAPTURE_POINT.sha);
    expect(CAPTURE_POINT.download).toContain(CAPTURE_POINT.sha);
    const text = fs.readFileSync(path.join(root, README_PATH), 'utf8');
    expect(text).toContain(CAPTURE_POINT.browse);
    expect(text).toContain(CAPTURE_POINT.download);
  }, 60_000);

  test('the catalogue does not depend on how long git abbreviates a hash (this workstation had grown to eight characters while the Linux runner gave seven)', () => {
    const saved = { count: process.env.GIT_CONFIG_COUNT, key: process.env.GIT_CONFIG_KEY_0, value: process.env.GIT_CONFIG_VALUE_0 };
    Object.assign(process.env, { GIT_CONFIG_COUNT: '1', GIT_CONFIG_KEY_0: 'core.abbrev', GIT_CONFIG_VALUE_0: '11' });
    try {
      expect(derive().retired, 'retired files with git abbreviating to 11').toEqual(reference.retired);
    } finally {
      for (const [k, v] of [['GIT_CONFIG_COUNT', saved.count], ['GIT_CONFIG_KEY_0', saved.key], ['GIT_CONFIG_VALUE_0', saved.value]]) {
        if (v === undefined) delete process.env[k]; else process.env[k] = v;
      }
    }
  }, 60_000);

  test('every retired path is gone, and its cited commit exists and held it', () => {
    expect(reference.retired.length).toBeGreaterThan(5);
    for (const r of reference.retired) {
      expect(fs.existsSync(path.join(root, r.path)), `${r.path} still exists`).toBe(false);
      expect(() => git('cat-file', '-e', r.lastVersion), `${r.lastVersion} is not in git`).not.toThrow();
    }
    // One read back in full, the latest retirement: the command the README gives works.
    const latest = reference.retired[0];
    expect(git('show', latest.lastVersion).length, latest.readBack).toBeGreaterThan(100);
  }, 60_000);

  test('every historical path and every listed baseline exists, and the retired ones sit outside active discovery', () => {
    for (const h of reference.historicalComparisons) for (const p of h.paths) expect(fs.existsSync(path.join(root, p)), p).toBe(true);
    for (const b of reference.baselines) expect(fs.existsSync(path.join(root, b.file)), b.file).toBe(true);
    const active = new Set(discoverSpecs(['tests/unit', 'tests/e2e', 'tests/historical']));
    expect(reference.retired.filter((r) => active.has(r.path))).toEqual([]);
  });
});
