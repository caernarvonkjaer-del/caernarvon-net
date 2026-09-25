import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';
import { inventoryFile } from '../../scripts/ms70-e2e-global-inventory.mjs';

// Milestone 70, 70T: "a browser spec may reference no app global other than
// GuardianForms. Converted files join the guard as they land until it covers
// the whole suite." tests/baseline/ms70-70T-progress.json lists them; the
// parser is the 70A inventory's (scripts/ms70-e2e-global-inventory.mjs), so
// aliases like `const w = window as any` are followed.

const ROOT = path.join(__dirname, '..', '..');
const progress = JSON.parse(fs.readFileSync(path.join(ROOT, 'tests/baseline/ms70-70T-progress.json'), 'utf8'));
// Runner-owned names (T3) and the harness's own globals start with "__".
const allowed = (name) => name === 'GuardianForms' || name.startsWith('__');

describe('converted browser specs reach the app only through GuardianForms.testing', () => {
  test('the list names real spec files, once each', () => {
    const files = progress.converted;
    expect(files.filter((f, i) => files.indexOf(f) !== i), 'listed twice').toEqual([]);
    expect(files.filter((f) => !fs.existsSync(path.join(ROOT, f))), 'no such file').toEqual([]);
  });

  // A file that must name globals other than GuardianForms -- today only the
  // driver for a pre-70 build, which has no GuardianForms -- is exempt by
  // name, with the reason, and is never also listed as converted.
  test('every exemption names a real file, says why, and is not also listed as converted', () => {
    const exempt = progress.exempt || [];
    expect(exempt.filter((e) => !e.file || !e.why), 'file and why').toEqual([]);
    expect(exempt.filter((e) => !fs.existsSync(path.join(ROOT, e.file))), 'no such file').toEqual([]);
    expect(exempt.filter((e) => progress.converted.includes(e.file)), 'both exempt and converted').toEqual([]);
  });

  test('an exempt file is imported by the specs its entry names, and by nothing else', () => {
    const e2e = path.join(ROOT, 'tests', 'e2e');
    const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => (d.isDirectory() ? walk(path.join(dir, d.name))
      : /\.ts$/.test(d.name) ? [path.join(dir, d.name)] : []));
    const rel = (f) => path.relative(ROOT, f).replace(/\\/g, '/');
    for (const e of progress.exempt || []) {
      const stem = path.basename(e.file).replace(/\.ts$/, '');
      const importers = walk(e2e).filter((f) => rel(f) !== e.file
        && new RegExp(`from '[./]*(?:support/)?${stem}'`).test(fs.readFileSync(f, 'utf8'))).map(rel).sort();
      expect(importers, e.file).toEqual([...(e.usedBy || [])].sort());
    }
  });

  test('no converted spec names another application global -- through window or bare -- writes live case state in place, or looks one up by a computed name', async () => {
    const offenders = [];
    for (const file of progress.converted) {
      const r = await inventoryFile(file, fs.readFileSync(path.join(ROOT, file), 'utf8'));
      const names = Object.keys(r.names).filter((n) => !allowed(n));
      const bare = Object.keys(r.bare);
      if (names.length || bare.length || r.writes.length || r.computed) offenders.push({ file, names, bare, writes: r.writes.length, computed: r.computed });
    }
    expect(offenders).toEqual([]);
    // Parses every converted browser spec (135 files): a few seconds alone,
    // more than vitest's 5 s default while the whole unit suite runs beside it.
  }, 60_000);

  // 70T's gate: "Converted files join the guard as they land until it covers
  // the whole suite." Every browser spec and support file is now one or the
  // other, so a new one must be born converted (or exempt, with its reason).
  test('the guard covers the whole browser suite: every spec and support file is converted or exempt', () => {
    const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => (d.isDirectory() ? walk(path.join(dir, d.name))
      : /\.ts$/.test(d.name) ? [path.relative(ROOT, path.join(dir, d.name)).split(path.sep).join('/')] : []));
    const covered = new Set([...progress.converted, ...(progress.exempt || []).map((e) => e.file)]);
    expect(walk(path.join(ROOT, 'tests', 'e2e')).filter((f) => !covered.has(f)).sort(), 'neither converted nor exempt').toEqual([]);
  });

  test('every finding says what converting the spec exposed and how it was resolved', () => {
    expect(progress.findings.filter((f) => !f.file || !f.what || !f.resolution)).toEqual([]);
  });
});
