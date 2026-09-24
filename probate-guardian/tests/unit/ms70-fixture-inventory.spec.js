import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';
import { FIXTURE_INVENTORY_PATH, buildFixtureInventory, exportsOf } from '../../scripts/ms70-fixture-inventory.mjs';

// Milestone 70, 70A: the browser test support layer's exports and fixture
// factories, which 70C's factory moves must update in the same commit
// (AGENTS.md section 8.3). This keeps tests/baseline/
// ms70-fixture-inventory.json in step with the support layer.

const ROOT = path.join(__dirname, '..', '..');

describe('the fixture inventory', () => {
  test('reads exports from TypeScript support modules', async () => {
    const ts = 'export function fillMinimalValidXWard(page: any): void {}\nexport const MINIMAL_VALID_X: Record<string, unknown> = {};\nexport { a as b } from "./c";';
    expect(await exportsOf('x.ts', ts)).toEqual([
      { name: 'fillMinimalValidXWard', kind: 'function' },
      { name: 'MINIMAL_VALID_X', kind: 'value' },
      { name: 'b', kind: 're-export' },
    ]);
  });

  test('the recorded inventory matches the support layer today, and lists every fillMinimalValid*Ward factory', async () => {
    const recorded = JSON.parse(fs.readFileSync(path.join(ROOT, FIXTURE_INVENTORY_PATH), 'utf8'));
    const current = await buildFixtureInventory(ROOT);
    const key = (h) => `${h.module}::${h.name}`;
    expect(recorded.helpers.map(key).sort(), 'regenerate with node scripts/ms70-fixture-inventory.mjs --write').toEqual(current.helpers.map(key).sort());
    const fills = current.helpers.filter((h) => /^fillMinimalValid\w*Ward$/.test(h.name));
    expect(fills.length).toBeGreaterThanOrEqual(7);
    expect(fills.every((h) => h.factory)).toBe(true);
  }, 60_000);
});
