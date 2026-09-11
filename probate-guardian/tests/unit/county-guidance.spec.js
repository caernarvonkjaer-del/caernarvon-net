import { describe, expect, test } from 'vitest';
import { hasSixthCircuitLocalGuidance } from '../../src/core/filing/county-guidance.js';

describe('hasSixthCircuitLocalGuidance', () => {
  test('is true for Pinellas and Pasco, case-insensitively and with surrounding whitespace', () => {
    expect(hasSixthCircuitLocalGuidance('Pinellas')).toBe(true);
    expect(hasSixthCircuitLocalGuidance('pinellas')).toBe(true);
    expect(hasSixthCircuitLocalGuidance('PINELLAS')).toBe(true);
    expect(hasSixthCircuitLocalGuidance('  Pinellas  ')).toBe(true);
    expect(hasSixthCircuitLocalGuidance('Pasco')).toBe(true);
    expect(hasSixthCircuitLocalGuidance('pasco')).toBe(true);
    expect(hasSixthCircuitLocalGuidance('  PASCO ')).toBe(true);
  });

  test('is false for every other Florida county', () => {
    expect(hasSixthCircuitLocalGuidance('Orange')).toBe(false);
    expect(hasSixthCircuitLocalGuidance('Hillsborough')).toBe(false);
    expect(hasSixthCircuitLocalGuidance('Miami-Dade')).toBe(false);
    expect(hasSixthCircuitLocalGuidance('Polk')).toBe(false);
  });

  test('is false for blank or unrecognized input -- it does not default to Sixth Circuit', () => {
    expect(hasSixthCircuitLocalGuidance('')).toBe(false);
    expect(hasSixthCircuitLocalGuidance(null)).toBe(false);
    expect(hasSixthCircuitLocalGuidance(undefined)).toBe(false);
    expect(hasSixthCircuitLocalGuidance('   ')).toBe(false);
    expect(hasSixthCircuitLocalGuidance('Atlantis')).toBe(false);
  });
});
