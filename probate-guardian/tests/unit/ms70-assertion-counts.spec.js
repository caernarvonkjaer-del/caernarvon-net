import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';
import { COUNTS_PATH, countSpec, countAll, compareCounts, nextBaseline } from '../../scripts/ms70-assertion-counts.mjs';

// Milestone 70, 70A; decision D9. 70T rewrites most of the browser suite and
// later deliveries convert unit tests, so each spec's assertion count is
// recorded and may not fall without a recorded reason. A tripwire, not proof
// that a converted test still means what it meant. TEST-REVIEW.md Delivery 2
// (T9, 2026-10-14): the test-declaration count is held to the same rule, so
// a declaration removed while a helper's assertions stay is seen; both are
// static call sites, so a loop that makes fewer cases is not.

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

  test('a declaration through an import alias and test.each count; describe does not', async () => {
    const js = "import { test as base, describe } from 'vitest';\nconst test = base.extend({});\ndescribe('g', () => { base.fixme('a', () => {}); test.each([1, 2])('b %s', () => {}); test('c', () => {}); });\n";
    expect(await countSpec('z.spec.js', js)).toEqual({ expects: 0, tests: 3 });
  });

  test('a loop counts once however many cases it makes: a matrix that shrinks keeps both counts', async () => {
    const loop = (n) => `import { test, expect } from 'vitest';\nfor (const t of [${Array.from({ length: n }, (_, i) => i).join(', ')}]) test(\`case \${t}\`, () => { expect(t).toBeDefined(); });\n`;
    expect(await countSpec('nine.spec.js', loop(9))).toEqual(await countSpec('two.spec.js', loop(2)));
  });
});

describe('comparison', () => {
  test('a drop in assertions, a drop in declarations, a vanished file and a new file are reported separately', () => {
    const cmp = compareCounts(
      { 'a.spec.js': { expects: 3, tests: 1 }, 'c.spec.js': { expects: 1, tests: 1 }, 'd.spec.js': { expects: 4, tests: 2 } },
      { 'a.spec.js': { expects: 5, tests: 1 }, 'b.spec.js': { expects: 2, tests: 1 }, 'd.spec.js': { expects: 4, tests: 3 } },
    );
    expect(cmp).toEqual({
      drops: [{ file: 'a.spec.js', kind: 'expects', was: 5, now: 3 }, { file: 'd.spec.js', kind: 'tests', was: 3, now: 2 }],
      missing: ['b.spec.js'],
      added: ['c.spec.js'],
    });
  });

  test('a declaration removed while the helper assertions stay is a drop (T9)', async () => {
    const before = await countSpec('r.spec.js', "import { test, expect } from 'vitest';\nconst check = () => { expect(1).toBe(1); expect(2).toBe(2); };\ntest('a', check);\ntest('b', check);\n");
    const after = await countSpec('r.spec.js', "import { test, expect } from 'vitest';\nconst check = () => { expect(1).toBe(1); expect(2).toBe(2); };\ntest('a', check);\n");
    expect([before, after]).toEqual([{ expects: 2, tests: 2 }, { expects: 2, tests: 1 }]);
    expect(compareCounts({ 'r.spec.js': after }, { 'r.spec.js': before }).drops).toEqual([{ file: 'r.spec.js', kind: 'tests', was: 2, now: 1 }]);
  });

  test('a refactor of several declarations into one loop lowers the declaration count: the next baseline records why, and refuses without a reason', async () => {
    const before = await countSpec('l.spec.js', "import { test, expect } from 'vitest';\ntest('a', () => expect(1).toBe(1));\ntest('b', () => expect(2).toBe(2));\ntest('c', () => expect(3).toBe(3));\n");
    const after = await countSpec('l.spec.js', "import { test, expect } from 'vitest';\nfor (const n of [1, 2, 3]) test(`n ${n}`, () => expect(n).toBe(n));\n");
    const existing = { counts: { 'l.spec.js': before, 'gone.spec.js': { expects: 1, tests: 1 } }, dropLog: [] };
    expect(() => nextBaseline(existing, { 'l.spec.js': after }, '')).toThrow(/pass --reason/);
    const next = nextBaseline(existing, { 'l.spec.js': after }, 'three cases folded into one loop; the selection and assertions are unchanged', '2026-10-14');
    expect(next.counts).toEqual({ 'l.spec.js': { expects: 1, tests: 1 } });
    expect(next.totals).toEqual({ expects: 1, tests: 1 });
    expect(next.dropLog).toEqual([
      { file: 'l.spec.js', kind: 'expects', was: 3, now: 1, reason: 'three cases folded into one loop; the selection and assertions are unchanged', date: '2026-10-14' },
      { file: 'l.spec.js', kind: 'tests', was: 3, now: 1, reason: 'three cases folded into one loop; the selection and assertions are unchanged', date: '2026-10-14' },
      { file: 'gone.spec.js', kind: 'file', was: 1, now: 0, reason: 'three cases folded into one loop; the selection and assertions are unchanged', date: '2026-10-14' },
    ]);
  });
});

describe('the suite against tests/baseline/ms70-assertion-counts.json', () => {
  test('no spec has fewer assertions or declarations than its baseline, none has vanished, and every spec is counted', async () => {
    const baseline = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', COUNTS_PATH), 'utf8'));
    const cmp = compareCounts(await countAll(path.join(__dirname, '..', '..')), baseline.counts);
    expect(cmp.drops, 'a spec lost assertions or test declarations: explain it with node scripts/ms70-assertion-counts.mjs --write-baseline --reason="..."').toEqual([]);
    expect(cmp.missing, 'a counted spec no longer exists: record why with --write-baseline --reason="..."').toEqual([]);
    expect(cmp.added, 'a new spec is not counted yet: run node scripts/ms70-assertion-counts.mjs --write-baseline').toEqual([]);
  }, 60_000);
});
