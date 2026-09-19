import { describe, it, expect } from 'vitest';
import { SCHEDULE_SCHEMAS } from '../../src/core/form/schedule-definitions.js';

describe('Milestone 29: Type Contracts & Static Validation', () => {
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
});
