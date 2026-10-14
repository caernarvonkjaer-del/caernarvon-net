// Milestone 70, 70A (MILESTONE-70-PROPOSAL.md, 70A and 70T; decision D9).
// 70T rewrites most of the browser suite onto the GuardianForms.testing
// adapter, and later deliveries convert unit tests from source slicing to
// direct imports. A rewritten test that quietly lost an assertion would go
// green exactly when it matters most. This records how many assertions and
// how many test declarations each spec makes, so a drop in either is visible
// and has to be explained.
//
// The counts are static: every expect(...), expect.soft(...), expect.poll(...)
// and expect.element(...) call, and every test(...)/it(...) declaration (with
// or without a modifier such as .skip or .only), found in the file's syntax
// tree (scripts/test-source-analysis.mjs: the TypeScript specs are stripped
// to JavaScript with Vite's own oxc transform, then parsed with acorn). A
// call inside a loop counts once however many cases the loop makes, so a
// matrix that shrinks with its counts unchanged is caught by other evidence
// (membership checks, review, fault tests), not here. It is a tripwire, not
// proof that a converted test still means what it meant (D9).
//
// TEST-REVIEW.md Delivery 2 (T9, 2026-10-14): test declarations are compared
// as well as assertions, and a drop in either, or a vanished file, needs a
// reason. A refactor that folds several declarations into one loop lowers
// the declaration count legitimately -- record why, and keep the before and
// after selection and the assertion evidence in the commit.
//
// Usage (from probate-guardian/):
//   node scripts/ms70-assertion-counts.mjs                 summary + drops
//   node scripts/ms70-assertion-counts.mjs --write-baseline --reason="..."
//        rewrite tests/baseline/ms70-assertion-counts.json; any file whose
//        count fell is appended to its drop log with the reason given.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { countCalls, discoverSpecs, testApiBindings, testApiCalls, toAst } from './test-source-analysis.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const COUNTS_PATH = 'tests/baseline/ms70-assertion-counts.json';
export const SPEC_DIRS = ['tests/unit', 'tests/e2e', 'tests/historical'];

/** Count one spec file, TypeScript or JavaScript: { expects, tests }. */
export async function countSpec(file, source) {
  const ast = await toAst(file, source);
  return countCalls(testApiCalls(ast, testApiBindings(ast).bindings));
}

export function listSpecs(root = ROOT) {
  return discoverSpecs(SPEC_DIRS, { rootDir: root });
}

export async function countAll(root = ROOT) {
  const counts = {};
  for (const rel of listSpecs(root)) counts[rel] = await countSpec(rel, fs.readFileSync(path.join(root, rel), 'utf8'));
  return counts;
}

/** Files whose assertion or declaration count fell below the baseline, baseline files that no longer exist, and files not yet counted. */
export function compareCounts(current, baseline) {
  const drops = [];
  const missing = [];
  for (const [file, was] of Object.entries(baseline || {})) {
    const now = current[file];
    if (!now) { missing.push(file); continue; }
    if (now.expects < was.expects) drops.push({ file, kind: 'expects', was: was.expects, now: now.expects });
    if (now.tests < (was.tests ?? 0)) drops.push({ file, kind: 'tests', was: was.tests, now: now.tests });
  }
  const added = Object.keys(current).filter((f) => !(baseline || {})[f]);
  return { drops, missing, added };
}

/** The next baseline: the counts as they are, the drop log extended with every drop and vanished file under `reason`. */
export function nextBaseline(existing, current, reason, date = new Date().toISOString().slice(0, 10)) {
  const cmp = compareCounts(current, existing?.counts);
  if ((cmp.drops.length || cmp.missing.length) && !reason) {
    throw new Error('Counts fell or files disappeared: pass --reason="..." so the drop log says why.');
  }
  const dropLog = [...(existing?.dropLog || [])];
  for (const d of cmp.drops) dropLog.push({ file: d.file, kind: d.kind, was: d.was, now: d.now, reason, date });
  for (const m of cmp.missing) dropLog.push({ file: m, kind: 'file', was: existing.counts[m].expects, now: 0, reason, date });
  const totals = Object.values(current).reduce((a, c) => ({ expects: a.expects + c.expects, tests: a.tests + c.tests }), { expects: 0, tests: 0 });
  return {
    generatedBy: 'node scripts/ms70-assertion-counts.mjs --write-baseline',
    note: 'Milestone 70 per-spec static counts of expect calls and test declarations. tests/unit/ms70-assertion-counts.spec.js fails when a spec falls below either count; lowering one requires --reason, recorded in dropLog (kind: expects, tests or file). A tripwire, not proof of equivalence (decision D9); a loop counts once (TEST-REVIEW.md Delivery 2, T9).',
    totals,
    counts: current,
    dropLog,
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const current = await countAll();
  const target = path.join(ROOT, COUNTS_PATH);
  const existing = fs.existsSync(target) ? JSON.parse(fs.readFileSync(target, 'utf8')) : null;
  const cmp = compareCounts(current, existing?.counts);
  const total = Object.values(current).reduce((a, c) => ({ expects: a.expects + c.expects, tests: a.tests + c.tests }), { expects: 0, tests: 0 });
  console.log(`${Object.keys(current).length} spec files; ${total.expects} expect calls; ${total.tests} test declarations`);
  for (const d of cmp.drops) console.log(`  DROP ${d.file} (${d.kind}): ${d.was} -> ${d.now}`);
  for (const m of cmp.missing) console.log(`  GONE ${m}`);
  for (const a of cmp.added) console.log(`  NEW  ${a}`);
  if (process.argv.includes('--write-baseline')) {
    const reason = (process.argv.find((a) => a.startsWith('--reason=')) || '').slice('--reason='.length);
    let next;
    try { next = nextBaseline(existing, current, reason); } catch (error) { console.error(error.message); process.exit(1); }
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, JSON.stringify(next, null, 1) + '\n');
    console.log(`wrote ${COUNTS_PATH}`);
  }
}
