import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';
import { discoverSpecs, root } from '../../scripts/test-source-analysis.mjs';

// AGENTS.md section 7: TEST-INDEX.md lists every spec file exactly once, and
// names only files that exist. Milestone 43D compared bare basenames from two
// top-level folders; TEST-REVIEW.md Delivery 2 (T7, 2026-10-14) compares
// repository-relative paths from a recursive discovery of tests/unit,
// tests/e2e and tests/historical (support and fixture folders excepted), so
// a spec in a nested folder, or a TypeScript unit spec, has to be listed too
// -- a row under the folder's own "## tests/..." heading, its first cell the
// path below that folder. The category tables and the lite-subset commands
// are the index's actionable part: every spec they name must exist. Policy
// lives in auditIndex() alone, over plain inputs, so the faults below are
// synthetic; discovery is scripts/test-source-analysis.mjs's.

export const SPEC_ROOTS = ['tests/unit', 'tests/e2e', 'tests/historical'];
const FILE_CELL = /^[\w./-]+\.[\w]+$/;
const SPEC_NAME = /[\w./-]+\.spec\.(?:js|ts)\b/g;
const SPEC_PATH = /tests\/[\w./-]+\.spec\.(?:js|ts)\b/g;

/** What TEST-INDEX.md says, by line: inventory rows resolved to paths, and every spec the selection sections name. */
export function readIndex(indexText) {
  const rows = [];        // { path, line } -- a file named under a "## tests/..." heading
  const selections = [];  // { path, line } -- a spec a category table or lite-subset command names
  let dir = null;         // the folder the current "## tests/..." heading covers
  let selection = null;   // the folder a "### tests/... by category" table covers, or 'commands'
  indexText.split('\n').forEach((raw, i) => {
    const line = i + 1;
    const text = raw.trim();
    if (text.startsWith('## ')) {
      const m = /^## (tests\/[\w/.-]+)/.exec(text);
      dir = m ? m[1] : null;
      selection = /^## Running a lite subset/.test(text) ? 'commands' : null;
      return;
    }
    if (text.startsWith('### ')) {
      const m = /^### (tests\/[\w/.-]+) by category/.exec(text);
      selection = m ? m[1] : selection === 'commands' ? 'commands' : null;
      return;
    }
    if (dir && text.startsWith('|')) {
      const cell = text.split('|')[1].trim();
      if (FILE_CELL.test(cell) && !/^-+$/.test(cell)) rows.push({ path: `${dir}/${cell}`, line });
      return;
    }
    if (selection && selection !== 'commands' && text.startsWith('|')) {
      for (const name of text.match(SPEC_NAME) || []) selections.push({ path: `${selection}/${name}`, line });
      return;
    }
    if (selection === 'commands') {
      for (const p of text.match(SPEC_PATH) || []) selections.push({ path: p, line });
    }
  });
  return { rows, selections };
}

/** The policy: specs with no row, specs with more than one, rows and selections naming files that are not there. */
export function auditIndex(specs, indexText, exists = (p) => fs.existsSync(path.join(root, p))) {
  const { rows, selections } = readIndex(indexText);
  const count = new Map();
  for (const r of rows) count.set(r.path, (count.get(r.path) || 0) + 1);
  const specRows = rows.filter((r) => /\.spec\.(js|ts)$/.test(r.path));
  const known = new Set(specs);
  return {
    missingRows: specs.filter((s) => !count.has(s)),
    duplicateRows: [...count].filter(([, n]) => n > 1).map(([p, n]) => `${p} x${n}`),
    staleRows: rows.filter((r) => (specRows.includes(r) ? !known.has(r.path) : !exists(r.path))).map((r) => `${r.path} (line ${r.line})`),
    staleSelections: selections.filter((s) => !known.has(s.path)).map((s) => `${s.path} (line ${s.line})`),
  };
}

const INDEX = path.join(root, 'TEST-INDEX.md');

describe('TEST-INDEX.md stays in sync with the spec files on disk', () => {
  const specs = discoverSpecs(SPEC_ROOTS);
  const audit = auditIndex(specs, fs.readFileSync(INDEX, 'utf8'));

  test('discovery finds the suite, recursively, by path', () => {
    expect(specs.length).toBeGreaterThan(300);
    expect(specs.every((s) => /^tests\/(unit|e2e|historical)\/.*\.spec\.(js|ts)$/.test(s))).toBe(true);
    expect(specs).toContain('tests/unit/test-index-guard.spec.js');
  });

  test('lists every spec file exactly once', () => {
    expect(audit.missingRows, 'spec files with no TEST-INDEX.md row (a row under the folder\'s "## tests/..." heading, its first cell the path below that folder)').toEqual([]);
    expect(audit.duplicateRows, 'spec files with more than one TEST-INDEX.md row').toEqual([]);
  });

  test('names only files that exist, in its inventory and in its category tables and lite-subset commands', () => {
    expect(audit.staleRows, 'TEST-INDEX.md rows naming files that no longer exist').toEqual([]);
    expect(audit.staleSelections, 'TEST-INDEX.md category tables or lite-subset commands naming specs that no longer exist').toEqual([]);
  });
});

describe('the policy on synthetic inputs (Delivery 2 faults)', () => {
  const index = (body) => ['# Test Index', '', '## tests/unit (vitest)', '', '| File | Covers |', '| --- | --- |', ...body.unit,
    '', '## tests/e2e (Playwright)', '', '| File | Covers |', '| --- | --- |', ...body.e2e,
    '', '## Categories and scope', '', '### tests/e2e by category and scope', '', '| Category | Scope | Files |', '| --- | --- | --- |', ...(body.table || []),
    '', '## Running a lite subset', '', ...(body.commands || [])].join('\n');
  const exists = () => true;

  test('a nested spec and a TypeScript unit spec are found by path and need their own rows; a row below the folder lists them', () => {
    const specs = ['tests/e2e/a.spec.ts', 'tests/e2e/historical-like/nested.spec.ts', 'tests/unit/typed.spec.ts', 'tests/unit/plain.spec.js'];
    const without = auditIndex(specs, index({ unit: ['| plain.spec.js | x |'], e2e: ['| a.spec.ts | x |'] }), exists);
    expect(without.missingRows).toEqual(['tests/e2e/historical-like/nested.spec.ts', 'tests/unit/typed.spec.ts']);
    const withRows = auditIndex(specs, index({ unit: ['| plain.spec.js | x |', '| typed.spec.ts | x |'], e2e: ['| a.spec.ts | x |', '| historical-like/nested.spec.ts | x |'] }), exists);
    expect(withRows).toEqual({ missingRows: [], duplicateRows: [], staleRows: [], staleSelections: [] });
  });

  test('the same basename in two folders is two files, and a row counts only for its own folder', () => {
    const specs = ['tests/unit/ward-lock.spec.js', 'tests/e2e/ward-lock.spec.ts'];
    const audit = auditIndex(specs, index({ unit: ['| ward-lock.spec.js | x |', '| ward-lock.spec.ts | wrong folder |'], e2e: [] }), exists);
    expect(audit.missingRows).toEqual(['tests/e2e/ward-lock.spec.ts']);
    expect(audit.staleRows).toEqual(['tests/unit/ward-lock.spec.ts (line 8)']);
  });

  const lineOf = (text, row) => text.split('\n').indexOf(row) + 1;

  test('a duplicate row and a row naming a deleted spec are reported with their lines', () => {
    const text = index({ unit: [], e2e: ['| a.spec.ts | x |', '| a.spec.ts | again |', '| gone.spec.ts | deleted |'] });
    const audit = auditIndex(['tests/e2e/a.spec.ts'], text, exists);
    expect(audit.duplicateRows).toEqual(['tests/e2e/a.spec.ts x2']);
    expect(audit.staleRows).toEqual([`tests/e2e/gone.spec.ts (line ${lineOf(text, '| gone.spec.ts | deleted |')})`]);
  });

  test('a support row naming a helper that is not there is stale too', () => {
    const text = index({ unit: [], e2e: ['| a.spec.ts | x |'] }) + '\n\n## tests/e2e/support (helpers)\n\n| File | Purpose |\n| --- | --- |\n| target.ts | x |\n| vanished.ts | x |\n';
    const audit = auditIndex(['tests/e2e/a.spec.ts'], text, (p) => p === 'tests/e2e/support/target.ts');
    expect(audit.staleRows).toEqual([`tests/e2e/support/vanished.ts (line ${lineOf(text, '| vanished.ts | x |')})`]);
  });

  test('a category table or a lite-subset command naming a spec that no longer exists is reported', () => {
    const audit = auditIndex(['tests/e2e/a.spec.ts', 'tests/e2e/b.spec.ts'], index({
      unit: [], e2e: ['| a.spec.ts | x |', '| b.spec.ts | x |'],
      table: ['| pdf-export | all forms | a.spec.ts, attestation-layout.spec.ts (Milestone 50), b.spec.ts |'],
      commands: ['```powershell', 'npx playwright test tests/e2e/b.spec.ts tests/e2e/renamed.spec.ts', '```'],
    }), exists);
    expect(audit.staleSelections).toEqual(['tests/e2e/attestation-layout.spec.ts (line 21)', 'tests/e2e/renamed.spec.ts (line 26)']);
  });
});
