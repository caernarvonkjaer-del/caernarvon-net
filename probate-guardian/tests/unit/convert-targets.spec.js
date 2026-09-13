// Milestone 42E. convertTargetsFor() had been keyed to CARRY_SOURCE_TYPE
// (what may SEED a new filing -- widened by 36-7 to every type) instead of
// CONVERT_SOURCE_TYPE (what may be CONVERTED): the Accounting types among
// themselves, and each Plan only to/from its own Accounting counterpart.
// The legacy-app.js copy that had it right was dead, shadowed by the module.
// Milestone 42G moved the table itself from convert-ward-modal.js (where
// 42E had put it) into filing-descriptor.js, the shared filing-identity
// registry -- convert-ward-modal.js now just re-exports convertTargetsFor.
import { describe, it, expect } from 'vitest';
import { convertTargetsFor, convertSourcesFor, FILING_TYPE_KEYS } from '../../src/core/filing/filing-descriptor.js';
import { CARRY_SOURCE_TYPE } from '../../src/core/navigation/ward-lifecycle.js';
import { convertTargetsFor as reExported } from '../../src/core/modals/convert-ward-modal.js';

describe('convertTargetsFor()', () => {
  it('offers exactly the table-defined targets per source (in table order)', () => {
    // Guardian Inventory is the one-time initial filing: it converts OUT to
    // the accountings and its own Plan, but nothing converts INTO it except
    // Plan Initial.
    expect(convertTargetsFor('guardian')).toEqual(['planInitial', 'simplified', 'annual', 'finalAccounting', 'trustAccounting']);
    expect(convertTargetsFor('simplified')).toEqual(['planSimplified', 'annual', 'finalAccounting', 'trustAccounting']);
    expect(convertTargetsFor('annual')).toEqual(['planAnnual', 'simplified', 'finalAccounting', 'trustAccounting']);
    // Only the plain Annual Accounting converts to the Annual Plan; Final and
    // Trust are terminal/special accountings with no Plan counterpart.
    expect(convertTargetsFor('finalAccounting')).toEqual(['simplified', 'annual', 'trustAccounting']);
    expect(convertTargetsFor('trustAccounting')).toEqual(['simplified', 'annual', 'finalAccounting']);
  });

  it('pairs each Plan only with its own Accounting counterpart', () => {
    expect(convertTargetsFor('planInitial')).toEqual(['guardian']);
    expect(convertTargetsFor('planSimplified')).toEqual(['simplified']);
    expect(convertTargetsFor('planAnnual')).toEqual(['annual', 'finalAccounting', 'trustAccounting']);
    expect(convertTargetsFor('guardian')).toContain('planInitial');
    expect(convertTargetsFor('guardian')).not.toContain('planAnnual');
    expect(convertTargetsFor('annual')).toContain('planAnnual');
    expect(convertTargetsFor('annual')).not.toContain('planInitial');
    expect(convertTargetsFor('annual')).not.toContain('planSimplified');
  });

  it('never offers planMinor as a target and offers it no targets', () => {
    for (const src of FILING_TYPE_KEYS) expect(convertTargetsFor(src)).not.toContain('planMinor');
    expect(convertTargetsFor('planMinor')).toEqual([]);
  });

  it('is strictly narrower than the creation-time carry table (the bug this pins)', () => {
    const carryTargets = (src) => Object.keys(CARRY_SOURCE_TYPE).filter((t) => t !== src && t !== 'planMinor' && (CARRY_SOURCE_TYPE[t] || []).includes(src));
    for (const src of FILING_TYPE_KEYS) {
      const convert = new Set(convertTargetsFor(src));
      for (const t of convert) expect(carryTargets(src), `${src} -> ${t} must also be a carry target`).toContain(t);
    }
    expect(carryTargets('annual').length).toBeGreaterThan(convertTargetsFor('annual').length);
    expect(convertSourcesFor('nope')).toEqual([]);
  });

  it('the modal module re-exports the same function', () => {
    expect(reExported).toBe(convertTargetsFor);
  });
});
