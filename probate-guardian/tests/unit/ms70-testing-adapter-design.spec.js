import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';
import { DESIGN_PATH, DESTINATION_KINDS, SCHEMA_REVIEW, buildDesign, destinationFor } from '../../scripts/ms70-testing-adapter-design.mjs';

// Milestone 70, 70A: the proposed window.GuardianForms schema -- production
// members, each with a named consumer, and GuardianForms.testing designed
// from what the browser suite actually reaches (tests/baseline/
// ms70-e2e-globals.json). This keeps the design in step with that inventory,
// so 70T starts from a complete map: a name the suite starts reaching without
// a destination fails here.

const ROOT = path.join(__dirname, '..', '..');
const design = JSON.parse(fs.readFileSync(path.join(ROOT, DESIGN_PATH), 'utf8'));
const inventory = JSON.parse(fs.readFileSync(path.join(ROOT, 'tests/baseline/ms70-e2e-globals.json'), 'utf8'));

describe('the GuardianForms design', () => {
  test('every application name the browser suite reaches has exactly one destination, and no destination is for a name it no longer reaches', () => {
    const designed = design.names.map((n) => n.name).sort();
    const reached = Object.keys(inventory.byName).sort();
    expect(designed).toEqual(reached);
  });

  test('every destination is an allowed kind, and commands and queries name their member', () => {
    for (const n of design.names) {
      const [kind, member] = n.destination.split(':');
      expect(DESTINATION_KINDS, n.name).toContain(kind);
      if (kind === 'command' || kind === 'query') expect(member, n.name).toBeTruthy();
    }
  });

  test('production members each have a named consumer; testing is enabled only before boot', () => {
    for (const [name, member] of Object.entries(design.production)) expect(member.consumer, name).toBeTruthy();
    expect(Object.keys(design.production)).not.toContain('testing');
    expect(design.testing.enabled).toMatch(/pre-boot flag/);
  });

  test("every member is confirmed by the owner's schema review with its kind, and no query has a side effect the review found", () => {
    const members = buildDesign(ROOT).testing.members;
    expect(Object.entries(members).filter(([, m]) => !m.reviewed).map(([k, m]) => `${k} (${m.kind})`),
      'unreviewed member: confirm it in SCHEMA_REVIEW.members').toEqual([]);
    expect(Object.keys(SCHEMA_REVIEW.members).filter((k) => !(k in members)), 'reviewed members that no longer exist').toEqual([]);
    for (const name of ['updateNavDots', 'updateSidebar', 'auditLog', 'saveBlobAs', 'exportGuardianDataZip', 'finishSingleWardExport', 'doSavePdfGuardian']) {
      expect(destinationFor(name), `${name} changes something, so it is not a query`).toMatch(/^command:/);
    }
  });

  test('the rules place the suite\'s commonest reaches where 70T expects them', () => {
    expect(destinationFor('navigate')).toBe('command:navigate');
    expect(destinationFor('D')).toBe('query:snapshot');
    expect(destinationFor('flushPendingSave')).toBe('command:save');
    expect(destinationFor('validatePlanAnnual')).toBe('query:validate');
    expect(destinationFor('__pgBuildFixture')).toBe('harness');
    expect(destinationFor('showAddWardModal')).toBe('real-ui');
    expect(destinationFor('mergeParties')).toBe('command:updateSharedRecords');
    expect(destinationFor('circuitForCounty')).toBe('unit-import');
  });
});
