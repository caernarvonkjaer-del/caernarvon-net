import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import {
  callsNamed, countCalls, decodeMappings, disablingCalls, discoverSpecs, listFiles, literalValue, memberChain,
  testApiBindings, testApiCalls, toAst,
} from '../../scripts/test-source-analysis.mjs';

// TEST-REVIEW.md Delivery 2 (section 4.5): the mechanics the three guards
// share -- discovery, the TypeScript transform with its source map applied
// back, the walk, and the grammar of test-API calls -- proven on their own,
// so each guard's spec can be about its policy. Discovery runs on a
// throwaway tree so the faults (a nested spec, a TypeScript unit spec, a
// support folder) are real files, not stubs.

let tmp;
beforeAll(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pg-source-analysis-'));
  const put = (rel, text = '') => { fs.mkdirSync(path.dirname(path.join(tmp, rel)), { recursive: true }); fs.writeFileSync(path.join(tmp, rel), text); };
  put('tests/unit/plain.spec.js');
  put('tests/unit/typed.spec.ts');
  put('tests/unit/support/helper.js');
  put('tests/e2e/top.spec.ts');
  put('tests/e2e/nested/deep/inner.spec.ts');
  put('tests/e2e/support/target.ts');
  put('tests/e2e/fixtures/not-a-spec.spec.ts');
  put('tests/e2e/notes.md');
});
afterAll(() => fs.rmSync(tmp, { recursive: true, force: true }));

describe('discovery', () => {
  test('finds spec files recursively under explicit roots, repository-relative, sorted, not entering support or fixture folders', () => {
    expect(discoverSpecs(['tests/unit', 'tests/e2e'], { rootDir: tmp })).toEqual([
      'tests/e2e/nested/deep/inner.spec.ts', 'tests/e2e/top.spec.ts', 'tests/unit/plain.spec.js', 'tests/unit/typed.spec.ts',
    ]);
  });

  test('a missing root yields nothing; every file is listed when asked, with skips honoured at any depth', () => {
    expect(discoverSpecs(['tests/historical'], { rootDir: tmp })).toEqual([]);
    expect(listFiles('tests/e2e', { rootDir: tmp, skipDirs: ['deep'] })).toEqual([
      'tests/e2e/fixtures/not-a-spec.spec.ts', 'tests/e2e/notes.md', 'tests/e2e/support/target.ts', 'tests/e2e/top.spec.ts',
    ]);
  });
});

describe('parsing', () => {
  const ts = [
    "import { test as base, expect } from '@playwright/test';",
    'type Row = { a: number };',
    'const test = base.extend({});',
    "test.describe('g', () => {",
    "  test('a', async ({ page }) => { const r = (await page.evaluate(() => 1)) as unknown as Row; expect(r).toBeTruthy(); await expect.soft(page).toBeTruthy(); });",
    "  test .skip('b', () => {});",
    "  base.fixme('c', () => {});",
    '});',
    "const t = test; t.skip('d', () => {}); test['only']('e', () => {}); test.extend({}).skip('f', () => {});",
    "helper(true, { proposal: 'MILESTONE-1-PROPOSAL.md', owner: 'A', until: '2027-01-01' }, `why`, [1]);",
  ].join('\n');

  test('a TypeScript file parses, and every node reports the line and column of the source, not of the transformed code', async () => {
    const ast = await toAst('x.spec.ts', ts);
    const { bindings } = testApiBindings(ast);
    const { calls } = testApiCalls(ast, bindings);
    const at = (local, props) => calls.find((c) => c.local === local && c.props.join('.') === props);
    expect(at('test', 'describe').line).toBe(4);
    expect(at('test', 'skip')).toMatchObject({ line: 6, column: 3 });
    expect(at('base', 'fixme')).toMatchObject({ line: 7, column: 3 });
    expect(at('expect', 'soft').line).toBe(5);
  });

  test('a JavaScript file keeps its own lines; the source map decoder reads a version-3 mapping', async () => {
    const ast = await toAst('y.spec.js', "import { it } from 'vitest';\n\nit('x', () => {});\n");
    expect(testApiCalls(ast, testApiBindings(ast).bindings).calls[0].line).toBe(3);
    // Two generated lines; the second maps its column 0 to source line 1, column 0.
    expect(decodeMappings('AAAA,MAAM;AACN')).toEqual([[[0, 0, 0], [6, 0, 6]], [[0, 1, 0]]]);
  });

  test('bindings: the conventional names, plus what an import of a test-API module renames; a namespace or default import is reported', async () => {
    const ast = await toAst('z.spec.js', "import * as v from 'vitest';\nimport pw, { test as base, describe as group } from '@playwright/test';\nimport { test as local } from './support/fixtures';\n");
    const { bindings, unsupported } = testApiBindings(ast);
    expect([...bindings]).toEqual([['test', 'test'], ['it', 'it'], ['describe', 'describe'], ['expect', 'expect'], ['base', 'test'], ['group', 'describe']]);
    expect(unsupported.map((u) => u.why)).toEqual(['a namespace import of vitest is outside the supported grammar', 'a default import of @playwright/test is outside the supported grammar']);
  });

  test('calls, counts, disabling calls and review items follow the grammar', async () => {
    const ast = await toAst('x.spec.ts', ts);
    const result = testApiCalls(ast, testApiBindings(ast).bindings);
    expect(countCalls(result)).toEqual({ tests: 3, expects: 2 });
    expect(disablingCalls(result).map((c) => `${c.text}${c.line}:${c.modifier}`)).toEqual(['test.skip(6:skip', 'base.fixme(7:fixme']);
    expect(result.review.map((r) => `${r.line} ${r.text} ${r.why}`)).toEqual([
      "9 t.skip( t is not a test API this grammar binds",
      '9 ...[only]( a modifier reached through a computed key or a call result is outside the supported grammar',
      '9 ...[skip]( a modifier reached through a computed key or a call result is outside the supported grammar',
    ]);
  });

  test('an ordinary computed call is not a review item; a test API behind a computed key is', async () => {
    const ast = await toAst('w.spec.js', "import { test } from 'vitest';\nconst engine = {}; const type = 'a';\nengine[type](1);\ntest[type]('x', () => {});\n");
    const { review } = testApiCalls(ast, testApiBindings(ast).bindings);
    expect(review).toEqual([{ line: 4, column: 1, text: 'test[...](', why: 'a computed property on a test API is outside the supported grammar' }]);
  });

  test('memberChain reads plain chains only; literalValue reads strings, numbers, booleans, plain templates and literal objects', async () => {
    const ast = await toAst('x.spec.ts', ts);
    const helper = callsNamed(ast, ['helper'])[0];
    expect(helper).toEqual({ name: 'helper', line: 10, args: [true, { proposal: 'MILESTONE-1-PROPOSAL.md', owner: 'A', until: '2027-01-01' }, 'why', null] });
    expect(literalValue({ type: 'Identifier', name: 'x' })).toBeNull();
    expect(memberChain({ type: 'MemberExpression', computed: false, object: { type: 'Identifier', name: 'test' }, property: { type: 'Identifier', name: 'skip' } })).toEqual({ root: 'test', props: ['skip'] });
    expect(memberChain({ type: 'MemberExpression', computed: true, object: { type: 'Identifier', name: 'test' }, property: { type: 'Identifier', name: 'k' } })).toBeNull();
  });
});
