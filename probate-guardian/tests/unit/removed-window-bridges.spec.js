// Milestone 70, 70T: window.* bridges deleted on purpose stay deleted.
//
// Three browser specs used to prove this by probing the live page
// (`typeof window.addGuardian === 'undefined'`). 70T holds the browser suite
// to one global, GuardianForms, so a spec that names app globals -- even to
// show they are absent -- is exactly what its guard forbids. The pins moved
// here, onto the same source audit the window-bridge allow-list uses
// (scripts/audit-window-bridge.mjs): a name counts as published if src/
// assigns it to window, declares it as a legacy-app.js top-level function
// (a classic script's functions are window properties with no assignment at
// all), or defines it with Object.defineProperty(window, ...).
//
// Each entry's `kept` list is the other half of the same decision: bridges
// the milestone deliberately left in place, which must still be published.
// Since Milestone 70's 70K none is kept -- addEntry, duplicateEntry and
// validateGuardian were the last three -- and the whole surface is one name,
// the reviewed window.GuardianForms namespace.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { windowSurfaceNames } from '../../scripts/audit-window-bridge.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

const REMOVED = [
  {
    // Was tests/e2e/guardian-inventory-collection-controls.spec.ts's last test.
    decision: 'Milestone 51E (4eba207): Initial Inventory Add/Remove controls dispatch through data-inventory-action',
    removed: ['addGuardian', 'removeGuardian', 'addRecipient', 'removeRecipient', 'addWitness', 'removeWitness',
      'syncB2VehicleDescription', 'toggleB2Vehicle', 'setScheduleNoItems', 'removeEntry', 'pageNav'],
    // Kept until Milestone 70's 70K, which exported them for the feature
    // services (GuardianForms.testing reaches them there) and removed the globals.
    kept: [],
  },
  {
    // Was part of tests/e2e/guardian-inventory-mount.spec.ts's first test.
    decision: 'Post-split feature lifecycle clean-up (2ff1ddf): Guardian Inventory print and Excel actions are module-owned',
    removed: ['doSavePdfGuardian', 'doSaveExcelGuardian', 'importExcelGuardian'],
    kept: [],
  },
  {
    // Was part of tests/e2e/plan-readiness.contract.spec.ts's Milestone 44C test.
    decision: 'Milestone 44C (fc574d8): the shared readiness card reads readiness-config.js directly',
    removed: ['planReadinessChecks', 'planReadinessPanel', 'planReadinessChecksAnnual', 'planReadinessChecksInitial',
      'planReadinessChecksMinor', 'planReadinessChecksSimplified'],
    kept: [],
  },
];

describe('window.* bridges removed on purpose stay removed', () => {
  const surface = windowSurfaceNames(root);

  // The scanner, on a small tree with one publication of each kind: this repo
  // has none left to show it on (so an empty "still present" list below
  // still means something).
  it('sees each kind of publication', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ms70-surface-'));
    try {
      fs.mkdirSync(path.join(tmp, 'src'));
      fs.writeFileSync(path.join(tmp, 'src', 'legacy-app.js'), 'function navigate(){}\n');
      fs.writeFileSync(path.join(tmp, 'src', 'a.js'), "export const x = 1;\nwindow.addEntry = () => x;\nObject.defineProperty(window, 'currentPage', { get: () => '/' });\n");
      const seen = windowSurfaceNames(tmp);
      expect(seen.has('addEntry'), 'a window.X = assignment').toBe(true);
      expect(seen.has('navigate'), 'a legacy-app.js top-level function').toBe(true);
      expect(seen.has('currentPage'), 'an Object.defineProperty(window, ...)').toBe(true);
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  // Milestone 70, 70K: "the bridge audit permits only the reviewed
  // GuardianForms namespace" -- every other application global went.
  it('the whole surface is the reviewed namespace, window.GuardianForms', () => {
    expect([...surface].sort()).toEqual(['GuardianForms']);
  });

  it.each(REMOVED)('$decision', ({ removed, kept }) => {
    expect(removed.filter((n) => surface.has(n)), 'deleted bridges must not be back').toEqual([]);
    expect(kept.filter((n) => !surface.has(n)), 'bridges deliberately kept must still be published').toEqual([]);
  });
});
