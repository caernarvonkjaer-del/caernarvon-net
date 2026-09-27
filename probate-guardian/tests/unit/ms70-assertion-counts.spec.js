import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';
import { COUNTS_PATH, countSpec, countAll, compareCounts } from '../../scripts/ms70-assertion-counts.mjs';

// Milestone 70, 70A; decision D9. 70T rewrites most of the browser suite and
// later deliveries convert unit tests, so each spec's assertion count is
// recorded and may not fall without a recorded reason. A tripwire, not proof
// that a converted test still means what it meant.

describe('counting', () => {
  test('counts expect, expect.soft, expect.poll and expect.element calls in TypeScript, and test declarations', async () => {
    const ts = [
      "import { test, expect } from '@playwright/test';",
      'type Row = { a: number };',
      "test('one', async ({ page }) => {",
      '  const r = (await page.evaluate(() => 1)) as unknown as Row;',
      '  expect(r).toBeTruthy();',
      '  expect(r.a).not.toBe(2);',
      '  await expect.soft(page.locator("x")).toBeVisible();',
      '  await expect.poll(() => 1).toBe(1);',
      '  await expect.element?.(null);',
      '});',
      "test.skip('two', () => {});",
      "test.describe('group', () => { it('three', () => {}); });",
    ].join('\n');
    expect(await countSpec('x.spec.ts', ts)).toEqual({ expects: 5, tests: 3 });
  });

  test('ignores the word expect in comments, strings and property names', async () => {
    const js = [
      '// expect(this) is prose',
      "const s = 'expect(1)';",
      'const o = { expect: 1 }; o.expect;',
      '/* expect(2) */',
      'expect(s).toBe(s);',
    ].join('\n');
    expect(await countSpec('y.spec.js', js)).toEqual({ expects: 1, tests: 0 });
  });

  test('comparison: a drop, a vanished file and a new file are reported separately', () => {
    const cmp = compareCounts(
      { 'a.spec.js': { expects: 3, tests: 1 }, 'c.spec.js': { expects: 1, tests: 1 } },
      { 'a.spec.js': { expects: 5, tests: 1 }, 'b.spec.js': { expects: 2, tests: 1 } },
    );
    expect(cmp).toEqual({ drops: [{ file: 'a.spec.js', was: 5, now: 3 }], missing: ['b.spec.js'], added: ['c.spec.js'] });
  });
});

describe('the suite against tests/baseline/ms70-assertion-counts.json', () => {
  test('no spec has fewer assertions than its baseline, none has vanished, and every spec is counted', async () => {
    const baseline = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', COUNTS_PATH), 'utf8'));
    const cmp = compareCounts(await countAll(path.join(__dirname, '..', '..')), baseline.counts);
    expect(cmp.drops, 'a spec lost assertions: explain it with node scripts/ms70-assertion-counts.mjs --write-baseline --reason="..."').toEqual([]);
    expect(cmp.missing, 'a counted spec no longer exists: record why with --write-baseline --reason="..."').toEqual([]);
    expect(cmp.added, 'a new spec is not counted yet: run node scripts/ms70-assertion-counts.mjs --write-baseline').toEqual([]);
  }, 60_000);
});
