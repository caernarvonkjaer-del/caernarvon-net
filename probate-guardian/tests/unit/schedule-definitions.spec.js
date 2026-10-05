import { describe, it, expect } from 'vitest';
import {
  SCHEDULE_SCHEMAS,
  addCollectionRow,
  duplicateCollectionRow,
  removeCollectionRow,
} from '../../src/core/form/schedule-definitions.js';

// Milestone 73V: the three helpers find a list's rules by the filing's type
// and the list (src/core/form/collections.js), so each sample filing names its
// type; the assertions are unchanged.
describe('SCHEDULE_SCHEMAS and collection helpers', () => {
  it('adds a guardian row and extends parallel guardianPartyIds with null', () => {
    const data = {
      inventoryType: 'annual',
      guardians: [
        { name: 'Primary Guardian', phone: '555-1234' },
      ],
      guardianPartyIds: ['party_1'],
    };

    const added = addCollectionRow('guardians', data);
    expect(added).toBe(true);
    expect(data.guardians.length).toBe(2);
    expect(data.guardians[1].name).toBe('');
    expect(data.guardianPartyIds).toEqual(['party_1', null]);
  });

  it('enforces maximum row constraint on co-guardians (max: 3)', () => {
    const data = {
      inventoryType: 'annual',
      guardians: [
        { name: 'G1' },
        { name: 'G2' },
        { name: 'G3' },
      ],
      guardianPartyIds: ['p1', 'p2', 'p3'],
    };

    const added = addCollectionRow('guardians', data);
    expect(added).toBe(false);
    expect(data.guardians.length).toBe(3);
  });

  it('duplicates a row and inserts null party slot in lockstep', () => {
    const data = {
      inventoryType: 'annual',
      guardians: [
        { name: 'G1', phone: '555-0001' },
        { name: 'G2', phone: '555-0002' },
      ],
      guardianPartyIds: ['p1', 'p2'],
    };

    const duped = duplicateCollectionRow('guardians', 0, data);
    expect(duped).toBe(true);
    expect(data.guardians.length).toBe(3);
    expect(data.guardians[1].name).toBe('G1');
    expect(data.guardianPartyIds).toEqual(['p1', null, 'p2']);
  });

  it('removes a row and splices guardianPartyIds in lockstep while respecting floor', () => {
    const data = {
      inventoryType: 'annual',
      guardians: [
        { name: 'G1' },
        { name: 'G2' },
      ],
      guardianPartyIds: ['p1', 'p2'],
    };

    const removed = removeCollectionRow('guardians', 0, data);
    expect(removed).toBe(true);
    expect(data.guardians.length).toBe(1);
    expect(data.guardians[0].name).toBe('G2');
    expect(data.guardianPartyIds).toEqual(['p2']);

    // Attempt to remove below floor (floor: 1)
    const removedFloor = removeCollectionRow('guardians', 0, data);
    expect(removedFloor).toBe(false);
    expect(data.guardians.length).toBe(1);
    expect(data.guardianPartyIds).toEqual(['p2']);
  });

  it('handles general schedule rows without party sync', () => {
    const data = {
      inventoryType: 'annual',
      schA: [
        { payer: 'Social Security', amount: 1500 },
      ],
    };

    addCollectionRow('schA', data);
    expect(data.schA.length).toBe(2);
    expect(data.schA[1].payer).toBe('');

    removeCollectionRow('schA', 1, data);
    expect(data.schA.length).toBe(1);

    // Schedule A floor is 0, so it can be emptied
    removeCollectionRow('schA', 0, data);
    expect(data.schA.length).toBe(0);
  });

  it('fails loudly for a filing with no type, or a list its form does not have (73V)', () => {
    expect(() => addCollectionRow('guardians', { guardians: [] })).toThrow('No row rules for the list "guardians" on filing type "(none)"');
    expect(() => addCollectionRow('schA', { inventoryType: 'simplified', schA: [] })).toThrow('No row rules for the list "schA" on filing type "simplified"');
  });
});
