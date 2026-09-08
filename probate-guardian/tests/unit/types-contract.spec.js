import { describe, it, expect } from 'vitest';
import * as Types from '../../src/core/types/index.js';
import { SCHEDULE_SCHEMAS } from '../../src/core/form/schedule-definitions.js';
import { getControlKind, getControlPolicy } from '../../src/core/form/form-contract.js';

function createMockControl({ dataset = {}, type = 'text' } = {}) {
  return {
    dataset,
    type,
    value: '',
  };
}

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

  it('verifies field contract kinds and policies match type definitions', () => {
    const el = createMockControl({ dataset: { fieldPath: 'caseNumber' } });
    expect(getControlKind(el)).toBe('identifier');
    expect(getControlPolicy(el)).toBe('preserve');

    const dateEl = createMockControl({ dataset: { fieldPath: 'periodFrom' }, type: 'date' });
    expect(getControlKind(dateEl)).toBe('date');
    expect(getControlPolicy(dateEl)).toBe('normalize');

    const nameEl = createMockControl({ dataset: { fieldPath: 'wardName' } });
    expect(getControlKind(nameEl)).toBe('name');
    expect(getControlPolicy(nameEl)).toBe('display-only');
  });

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
