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
import { describe, it, expect } from 'vitest';
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
    kept: ['addEntry', 'duplicateEntry', 'validateGuardian'],
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

  it('sees each kind of publication (so an empty "still present" list means something)', () => {
    expect(surface.has('addEntry'), 'a window.X = assignment').toBe(true);
    expect(surface.has('navigate'), 'a legacy-app.js top-level function').toBe(true);
    expect(surface.has('currentPage'), 'an Object.defineProperty(window, ...)').toBe(true);
  });

  it.each(REMOVED)('$decision', ({ removed, kept }) => {
    expect(removed.filter((n) => surface.has(n)), 'deleted bridges must not be back').toEqual([]);
    expect(kept.filter((n) => !surface.has(n)), 'bridges deliberately kept must still be published').toEqual([]);
  });
});
