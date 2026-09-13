// TEST-INDEX.md is kept in sync by hand (AGENTS.md section 7). This spec is
// the guard: every spec file has exactly one row, and every row names a
// file that exists. Same self-auditing shape as
// tests/e2e/skip-classification-audit.spec.ts.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

function specFilesOnDisk() {
  const unit = fs.readdirSync(path.join(root, 'tests', 'unit')).filter((f) => f.endsWith('.spec.js'));
  const e2e = fs.readdirSync(path.join(root, 'tests', 'e2e')).filter((f) => f.endsWith('.spec.ts'));
  return [...unit, ...e2e].sort();
}

function specFilesInIndex() {
  const text = fs.readFileSync(path.join(root, 'TEST-INDEX.md'), 'utf8');
  const names = [];
  for (const line of text.split(/\r?\n/)) {
    if (!line.startsWith('|')) continue;
    const firstCell = line.split('|')[1]?.trim() ?? '';
    if (/\.spec\.(js|ts)$/.test(firstCell)) names.push(firstCell);
  }
  return names;
}

describe('TEST-INDEX.md stays in sync with the spec files on disk', () => {
  const onDisk = specFilesOnDisk();
  const inIndex = specFilesInIndex();

  it('lists every spec file exactly once', () => {
    const counts = new Map();
    for (const n of inIndex) counts.set(n, (counts.get(n) || 0) + 1);
    const missing = onDisk.filter((f) => !counts.has(f));
    const duplicated = [...counts].filter(([, c]) => c > 1).map(([n, c]) => `${n} x${c}`);
    expect(missing, 'spec files with no TEST-INDEX.md row').toEqual([]);
    expect(duplicated, 'spec files with more than one TEST-INDEX.md row').toEqual([]);
  });

  it('names only files that exist', () => {
    const disk = new Set(onDisk);
    const stale = [...new Set(inIndex)].filter((n) => !disk.has(n));
    expect(stale, 'TEST-INDEX.md rows naming files that no longer exist').toEqual([]);
  });
});
