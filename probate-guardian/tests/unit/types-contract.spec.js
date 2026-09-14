import { describe, it, expect } from 'vitest';
import * as Types from '../../src/core/types/index.js';
import { SCHEDULE_SCHEMAS } from '../../src/core/form/schedule-definitions.js';

describe('Milestone 29: Type Contracts & Static Validation', () => {
  it('exports types module cleanly without runtime errors', () => {
    expect(Types).toBeDefined();
  });

  it('verifies SCHEDULE_SCHEMAS produce valid schedule item instances', () => {
    expect(SCHEDULE_SCHEMAS.schA).toBeDefined();
    const schA = SCHEDULE_SCHEMAS.schA.factory();
    expect(schA).toHaveProperty('payer');
    expect(schA).toHaveProperty('amount');

    expect(SCHEDULE_SCHEMAS.schB1).toBeDefined();
    const schB1 = SCHEDULE_SCHEMAS.schB1.factory();
    expect(schB1).toHaveProperty('bankAcct');
    expect(schB1).toHaveProperty('amount');

    expect(SCHEDULE_SCHEMAS.schC).toBeDefined();
    const schC = SCHEDULE_SCHEMAS.schC.factory();
    expect(schC).toHaveProperty('gain');
    expect(schC).toHaveProperty('loss');

    expect(SCHEDULE_SCHEMAS.schD1).toBeDefined();
    const schD1 = SCHEDULE_SCHEMAS.schD1.factory();
    expect(schD1).toHaveProperty('accountNo');
    expect(schD1).toHaveProperty('restricted');
  });

  // Milestone 43C: getControlKind()/getControlPolicy() coverage consolidated
  // into form-contract.spec.js (that module's own name), which is where
  // these three path/kind/policy pairs now live.

  it('validates canonical CaseFile shape structure', () => {
    /** @type {import('../../src/core/types/case-file.js').CaseFile} */
    const caseFile = {
      activeWardId: 'ward-123',
      guardianName: 'Jane Doe',
      guardianEmail: 'jane@example.com',
      parties: [],
      cases: [],
      dismissedPartyPairs: [],
      wards: [
        {
          wardId: 'ward-123',
          wardName: 'John Doe',
          inventoryType: 'annual',
          years: ['2025'],
          activeYear: '2025',
          data: {},
        },
      ],
    };

    expect(caseFile.activeWardId).toBe('ward-123');
    expect(caseFile.wards).toHaveLength(1);
    expect(caseFile.wards[0].wardName).toBe('John Doe');
  });
});
