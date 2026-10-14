import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';
import { analyseSpecs, callsNamed, disablingCalls, root, testApiBindings, testApiCalls, toAst } from '../../scripts/test-source-analysis.mjs';
import { temporaryGapProblem } from '../e2e/support/temporary-gap.ts';

// Milestone 31, Phase 0.3: a test that does not run must say why, in one of
// three classified ways (support/target-profile.ts): the capability cannot
// exist on this target, the environment cannot automate it, or the coverage
// is deliberately deferred to a named proposal. Until TEST-REVIEW.md
// Delivery 2 (T6, 2026-10-14) this audit was a regular expression for the
// literal `test.skip(` over the top-level tests/e2e files, so `test.fixme`,
// `test.only`, `test.describe.skip`, a spaced `test .skip`, an import alias
// (`base.skip`) and anything under tests/unit went unseen. It now reads every
// test file's syntax tree (scripts/test-source-analysis.mjs's grammar) and
// three rules apply, each its own:
//   1. no spec disables or isolates a case directly -- skip, only, fixme or
//      todo on test, it or describe, through any name the file binds to them;
//      the only direct test.skip calls allowed are the three helpers' own;
//   2. a call that looks disabling but is outside the grammar (a computed key,
//      an unbound name, a call result) is a review item, never a pass;
//   3. every skipTemporaryGap() names a proposal that exists, an owner and a
//      date not yet past -- the same check the helper makes at run time, so a
//      lapsed gap fails before it can hide anything.
// Playwright's forbidOnly is the runtime backstop for rule 1; it does not
// replace this.

export const TEST_ROOTS = ['tests/unit', 'tests/e2e', 'tests/historical'];
export const HELPERS_FILE = 'tests/e2e/support/target-profile.ts';
export const HELPERS = ['skipExpectedTargetExclusion', 'skipEnvironmentLimitation', 'skipTemporaryGap'];

/** Rule 1 and rule 2 over analysed files: [{ file, bindings, unsupported, calls, review }]. */
export function auditDisabling(analyses) {
  const direct = [];
  const review = [];
  for (const a of analyses) {
    for (const c of disablingCalls(a)) {
      if (a.file === HELPERS_FILE && c.text === 'test.skip(') continue;
      direct.push(`${a.file}:${c.line} ${c.text}`);
    }
    for (const r of a.review) review.push(`${a.file}:${r.line} ${r.text} -- ${r.why}`);
    for (const u of a.unsupported) review.push(`${a.file}:${u.line} ${u.why}`);
  }
  return { direct, review };
}

/** Rule 3 over skipTemporaryGap calls: [{ file, line, args }]. */
export function auditTemporaryGaps(gaps, today, exists) {
  return gaps.flatMap(({ file, line, args }) => {
    const problem = args.length < 3 ? 'takes (condition, { proposal, owner, until }, detail)' : temporaryGapProblem(args[1], today, exists);
    return problem ? [`${file}:${line} ${problem}`] : [];
  });
}

describe('no spec skips, isolates or defers a case except through the classified helpers', () => {
  let analyses;
  const load = async () => {
    // Every .js/.ts under the test roots, support folders included -- the
    // helpers' own bodies are where the allowed test.skip calls live.
    analyses ??= await analyseSpecs(TEST_ROOTS, { skipDirs: ['fixtures'], pattern: /\.(js|ts)$/ });
    return analyses;
  };

  test('the helpers exist under their names, in the one file the audit allows a direct test.skip', async () => {
    const source = fs.readFileSync(path.join(root, HELPERS_FILE), 'utf8');
    for (const h of HELPERS) expect(source, h).toMatch(new RegExp(`export function ${h}\\(`));
    const helpers = (await load()).find((a) => a.file === HELPERS_FILE);
    expect(disablingCalls(helpers).map((c) => c.text)).toEqual(['test.skip(', 'test.skip(', 'test.skip(']);
  }, 120_000);

  test('no spec disables or isolates a case directly', async () => {
    const { direct } = auditDisabling(await load());
    expect(direct, `these files skip, isolate or defer a case directly instead of ${HELPERS.join('/')} from support/target-profile.ts`).toEqual([]);
  }, 120_000);

  test('nothing looks disabling without being in the grammar', async () => {
    const { review } = auditDisabling(await load());
    expect(review, 'these calls look disabling but are outside the audit\'s grammar: write them as test.skip/only/fixme/todo on an imported name, or extend scripts/test-source-analysis.mjs deliberately').toEqual([]);
  }, 120_000);

  test('every temporary gap names a proposal that exists, an owner and a date not yet past', async () => {
    const gaps = [];
    for (const a of await load()) {
      if (a.file === HELPERS_FILE) continue;
      const ast = await toAst(a.file);
      for (const c of callsNamed(ast, ['skipTemporaryGap'])) gaps.push({ file: a.file, line: c.line, args: c.args });
    }
    const today = new Date().toISOString().slice(0, 10);
    expect(auditTemporaryGaps(gaps, today, (p) => fs.existsSync(path.join(root, p))), 'temporary gaps that cannot stand').toEqual([]);
  }, 120_000);
});

describe('the rules on synthetic specs (Delivery 2 faults)', () => {
  const analyse = async (file, source) => {
    const ast = await toAst(file, source);
    const { bindings, unsupported } = testApiBindings(ast);
    return { file, bindings, unsupported, ...testApiCalls(ast, bindings) };
  };

  test('spaced, nested, describe-level, only, fixme, todo and aliased forms are all caught, with their lines', async () => {
    const a = await analyse('tests/e2e/x.spec.ts', [
      "import { test as base, expect } from '@playwright/test';",
      "import { it, describe } from 'vitest';",
      'const test = base.extend({});',
      "test.describe('g', () => {",
      "  test .skip('a', () => {});",
      "  test.describe.skip('h', () => { it.todo('b'); });",
      "  base.fixme('c', () => {});",
      '});',
      "describe.only('i', () => { it.only('d', () => {}); });",
      "test('fine', () => { expect(1).toBe(1); });",
    ].join('\n'));
    expect(auditDisabling([a]).direct).toEqual([
      'tests/e2e/x.spec.ts:5 test.skip(', 'tests/e2e/x.spec.ts:6 test.describe.skip(', 'tests/e2e/x.spec.ts:6 it.todo(',
      'tests/e2e/x.spec.ts:7 base.fixme(', 'tests/e2e/x.spec.ts:9 describe.only(', 'tests/e2e/x.spec.ts:9 it.only(',
    ]);
    expect(auditDisabling([a]).review).toEqual([]);
  });

  test('a computed key, a reassigned name, a call result and a namespace import are review items, not passes', async () => {
    const a = await analyse('tests/unit/y.spec.js', [
      "import * as v from 'vitest';",
      "import { test } from 'vitest';",
      'const t = test;',
      "t.skip('a', () => {});",
      "test['skip']('b', () => {});",
      "test.extend({}).only('c', () => {});",
    ].join('\n'));
    const { direct, review } = auditDisabling([a]);
    expect(direct).toEqual([]);
    expect(review).toEqual([
      'tests/unit/y.spec.js:4 t.skip( -- t is not a test API this grammar binds',
      'tests/unit/y.spec.js:5 ...[skip]( -- a modifier reached through a computed key or a call result is outside the supported grammar',
      'tests/unit/y.spec.js:6 ...[only]( -- a modifier reached through a computed key or a call result is outside the supported grammar',
      'tests/unit/y.spec.js:1 a namespace import of vitest is outside the supported grammar',
    ]);
  });

  test('the helpers file may call test.skip and nothing else', async () => {
    const ok = await analyse(HELPERS_FILE, "import { test } from '@playwright/test';\nexport function skipX(c, d) { test.skip(c, d); }\n");
    expect(auditDisabling([ok]).direct).toEqual([]);
    const bad = await analyse(HELPERS_FILE, "import { test } from '@playwright/test';\ntest.fixme('x', () => {});\n");
    expect(auditDisabling([bad]).direct).toEqual([`${HELPERS_FILE}:2 test.fixme(`]);
  });

  test('a temporary gap with no proposal, an unknown proposal, no owner, a bad date or a lapsed date cannot stand; a current one can', () => {
    const exists = (p) => p === 'MILESTONE-76-PROPOSAL.md';
    const at = (args) => auditTemporaryGaps([{ file: 'tests/e2e/z.spec.ts', line: 9, args }], '2026-10-14', exists);
    expect(at([true, 'MILESTONE-76-PROPOSAL.md', 'why'])).toEqual(['tests/e2e/z.spec.ts:9 the gap must be an object { proposal, owner, until }']);
    expect(at([true, { proposal: 'MILESTONE-99-PROPOSAL.md', owner: 'A', until: '2027-01-01' }, 'why'])).toEqual(['tests/e2e/z.spec.ts:9 MILESTONE-99-PROPOSAL.md is not in the repository']);
    expect(at([true, { proposal: 'MILESTONE-76-PROPOSAL.md', owner: ' ', until: '2027-01-01' }, 'why'])).toEqual(['tests/e2e/z.spec.ts:9 owner must name who closes the gap']);
    expect(at([true, { proposal: 'MILESTONE-76-PROPOSAL.md', owner: 'A', until: 'soon' }, 'why'])).toEqual(['tests/e2e/z.spec.ts:9 until must be a date, YYYY-MM-DD']);
    expect(at([true, { proposal: 'MILESTONE-76-PROPOSAL.md', owner: 'A', until: '2026-10-13' }, 'why'])).toEqual(['tests/e2e/z.spec.ts:9 the gap lapsed on 2026-10-13; un-skip the case or renew the date with a reason']);
    expect(at([true, { proposal: 'MILESTONE-76-PROPOSAL.md', owner: 'A', until: '2026-10-14' }, 'why'])).toEqual([]);
    expect(at([true])).toEqual(['tests/e2e/z.spec.ts:9 takes (condition, { proposal, owner, until }, detail)']);
  });
});
