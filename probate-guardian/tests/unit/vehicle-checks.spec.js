// Milestone 74S (decision 74S-1): a vehicle on the Inventory's Schedule B-2.
// A Year must be four digits -- an ordinary error the filer can override; a
// VIN that isn't 17 characters is a "Review recommended" note only, as an
// older vehicle's can be shorter (the Clerk's own example has ten).
import { describe, it, expect } from 'vitest';
import { collectGuardianIssues } from '../../src/core/validation/engines/guardian.js';
import { guardianConsistencyAdvisories } from '../../src/core/filing/consistency-advisories.js';
import { initializeEmptyData } from '../../src/core/filing/filing-registry.js';

const vehicle = (fields) => ({ scheduleB2: [{ isVehicle: true, vehicleMake: 'Toyota', vehicleModel: 'Corolla', odometerMileage: '80,000', ...fields }] });
const yearIssues = (year) => collectGuardianIssues({ ...initializeEmptyData('guardian'), inventoryType: 'guardian', ...vehicle({ vehicleYear: year, vehicleVin: '1HGCM82633A004352' }) })
  .map((e) => String(e.message ?? e)).filter((m) => /Year/.test(m));

describe('74S: vehicle checks', () => {
  it('a Year that is not four digits is named; a four-digit one is not', () => {
    expect(yearIssues('19')).toEqual([expect.stringMatching(/Year must be four digits/)]);
    expect(yearIssues('19x9')).toEqual([expect.stringMatching(/Year must be four digits/)]);
    expect(yearIssues('2019')).toEqual([]);
  });

  it('a blank Year is the existing "required", not the new message', () => {
    const messages = yearIssues('');
    expect(messages).toHaveLength(1);
    expect(messages[0]).not.toMatch(/four digits/);
  });

  it('a VIN that is not 17 characters is a note, pointing at the box; a 17-character one, or a non-vehicle, is not', () => {
    const notes = guardianConsistencyAdvisories(vehicle({ vehicleYear: '1992', vehicleVin: 'J123456789' }));
    expect(notes).toEqual([expect.objectContaining({ code: 'consistency.vin-length', severity: 'advisory', field: 'b2-vehicle-vin-0' })]);
    expect(notes[0].message).toContain('the VIN has 10 characters; most have 17');
    expect(guardianConsistencyAdvisories(vehicle({ vehicleVin: '1HGCM82633A004352' }))).toEqual([]);
    expect(guardianConsistencyAdvisories({ scheduleB2: [{ isVehicle: false, vehicleVin: 'ABC' }] })).toEqual([]);
  });
});
