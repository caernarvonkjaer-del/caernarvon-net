// Milestone 70, 70A (MILESTONE-70-PROPOSAL.md, 70A and 70T; decision D9).
// 70T rewrites most of the browser suite onto the GuardianForms.testing
// adapter, and later deliveries convert unit tests from source slicing to
// direct imports. A rewritten test that quietly lost an assertion would go
// green exactly when it matters most. This records how many assertions each
// spec makes, so a drop is visible and has to be explained.
//
// The count is static: every expect(...), expect.soft(...), expect.poll(...)
// and expect.element(...) call in the file's source, found by parsing (the
// TypeScript specs are stripped to JavaScript with Vite's own oxc transform,
// then parsed with acorn). An assertion inside a loop counts once. It is a
// tripwire, not proof that a converted test still means what it meant (D9).
//
// Usage (from probate-guardian/):
//   node scripts/ms70-assertion-counts.mjs                 summary + drops
//   node scripts/ms70-assertion-counts.mjs --write-baseline --reason="..."
//        rewrite tests/baseline/ms70-assertion-counts.json; any file whose
//        count fell is appended to its drop log with the reason given.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'acorn';
import { transformWithOxc } from 'vite';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const COUNTS_PATH = 'tests/baseline/ms70-assertion-counts.json';
const SPEC_DIRS = ['tests/unit', 'tests/e2e'];

function walk(node, visit) {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) { for (const c of node) walk(c, visit); return; }
  if (typeof node.type === 'string') visit(node);
  for (const key in node) {
    if (key === 'type' || key === 'start' || key === 'end' || key === 'loc') continue;
    const v = node[key];
    if (v && typeof v === 'object') walk(v, visit);
  }
}

const EXPECT_MEMBERS = new Set(['soft', 'poll', 'element']);

/** Count assertions and test declarations in one spec's JavaScript source. */
export function countInJs(js) {
  const ast = parse(js, { ecmaVersion: 'latest', sourceType: 'module', allowAwaitOutsideFunction: true, allowHashBang: true });
  let expects = 0;
  let tests = 0;
  walk(ast, (node) => {
    if (node.type !== 'CallExpression') return;
    const c = node.callee;
    if (c.type === 'Identifier' && c.name === 'expect') expects++;
    else if (c.type === 'MemberExpression' && !c.computed && c.object.type === 'Identifier' && c.object.name === 'expect'
      && c.property.type === 'Identifier' && EXPECT_MEMBERS.has(c.property.name)) expects++;
    const isTestName = (n) => n.type === 'Identifier' && (n.name === 'test' || n.name === 'it');
    if (isTestName(c)) tests++;
    else if (c.type === 'MemberExpression' && !c.computed && isTestName(c.object)
      && c.property.type === 'Identifier' && ['only', 'skip', 'fixme', 'fail', 'concurrent'].includes(c.property.name)) tests++;
  });
  return { expects, tests };
}

/** Count one spec file, TypeScript or JavaScript. */
export async function countSpec(file, source) {
  let js = source;
  if (/\.tsx?$/.test(file)) js = (await transformWithOxc(source, file, { lang: 'ts' })).code;
  return countInJs(js);
}

export function listSpecs(root = ROOT) {
  const out = [];
  const visit = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) { if (e.name !== 'fixtures' && e.name !== 'support') visit(p); }
      else if (/\.spec\.(js|ts)$/.test(e.name)) out.push(path.relative(root, p).replace(/\\/g, '/'));
    }
  };
  for (const d of SPEC_DIRS) visit(path.join(root, d));
  return out.sort();
}

export async function countAll(root = ROOT) {
  const counts = {};
  for (const rel of listSpecs(root)) counts[rel] = await countSpec(rel, fs.readFileSync(path.join(root, rel), 'utf8'));
  return counts;
}

/** Files whose assertion count fell below the baseline, and baseline files that no longer exist. */
export function compareCounts(current, baseline) {
  const drops = [];
  const missing = [];
  for (const [file, was] of Object.entries(baseline || {})) {
    const now = current[file];
    if (!now) missing.push(file);
    else if (now.expects < was.expects) drops.push({ file, was: was.expects, now: now.expects });
  }
  const added = Object.keys(current).filter((f) => !(baseline || {})[f]);
  return { drops, missing, added };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const current = await countAll();
  const target = path.join(ROOT, COUNTS_PATH);
  const existing = fs.existsSync(target) ? JSON.parse(fs.readFileSync(target, 'utf8')) : null;
  const cmp = compareCounts(current, existing?.counts);
  const total = Object.values(current).reduce((a, c) => ({ expects: a.expects + c.expects, tests: a.tests + c.tests }), { expects: 0, tests: 0 });
  console.log(`${Object.keys(current).length} spec files; ${total.expects} expect calls; ${total.tests} test declarations`);
  for (const d of cmp.drops) console.log(`  DROP ${d.file}: ${d.was} -> ${d.now}`);
  for (const m of cmp.missing) console.log(`  GONE ${m}`);
  if (process.argv.includes('--write-baseline')) {
    const reason = (process.argv.find((a) => a.startsWith('--reason=')) || '').slice('--reason='.length);
    if ((cmp.drops.length || cmp.missing.length) && !reason) {
      console.error('Counts fell or files disappeared: pass --reason="..." so the drop log says why.');
      process.exit(1);
    }
    const dropLog = [...(existing?.dropLog || [])];
    for (const d of cmp.drops) dropLog.push({ file: d.file, was: d.was, now: d.now, reason, date: new Date().toISOString().slice(0, 10) });
    for (const m of cmp.missing) dropLog.push({ file: m, was: existing.counts[m].expects, now: 0, reason, date: new Date().toISOString().slice(0, 10) });
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, JSON.stringify({
      generatedBy: 'node scripts/ms70-assertion-counts.mjs --write-baseline',
      note: 'Milestone 70 per-spec assertion counts (static expect calls). tests/unit/ms70-assertion-counts.spec.js fails when a spec falls below its count; lowering it requires --reason, recorded in dropLog. A tripwire, not proof of equivalence (decision D9).',
      totals: total,
      counts: current,
      dropLog,
    }, null, 1) + '\n');
    console.log(`wrote ${COUNTS_PATH}`);
  }
}
