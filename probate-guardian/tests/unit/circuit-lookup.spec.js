import { describe, expect, test } from 'vitest';
import {
  FL_COUNTY_CIRCUIT,
  CIRCUIT_ORDINALS,
  circuitForCounty,
  getCircuitOrdinal,
  getFloridaCircuitCourtCaption,
  getCaseCaptionTitle,
} from '../../src/core/pdf/circuit-lookup.js';

describe('circuit-lookup helpers', () => {
  test('maps all 67 Florida counties to their valid judicial circuits (1-20)', () => {
    expect(Object.keys(FL_COUNTY_CIRCUIT).length).toBe(67);
    for (const [county, circuit] of Object.entries(FL_COUNTY_CIRCUIT)) {
      expect(circuit).toBeGreaterThanOrEqual(1);
      expect(circuit).toBeLessThanOrEqual(20);
      const res = circuitForCounty(county);
      expect(res).toBe(circuit);
      const ord = getCircuitOrdinal(circuit);
      expect(ord.length).toBeGreaterThan(0);
    }
  });

  test('normalizes county names with spaces, case-insensitivity', () => {
    expect(circuitForCounty('pinellas')).toBe(6);
    expect(circuitForCounty('PINELLAS')).toBe(6);
    expect(circuitForCounty('  Miami-Dade  ')).toBe(11);
    expect(circuitForCounty('Hillsborough')).toBe(13);
    expect(circuitForCounty('Orange')).toBe(9);
    expect(circuitForCounty('Broward')).toBe(17);
    expect(circuitForCounty('Palm Beach')).toBe(15);
    expect(circuitForCounty('Duval')).toBe(4);
    expect(circuitForCounty('Leon')).toBe(2);
    expect(circuitForCounty('Escambia')).toBe(1);
    expect(circuitForCounty('Sarasota')).toBe(12);
  });

  test('falls back gracefully to Sixth Judicial Circuit for unknown or empty counties', () => {
    expect(circuitForCounty('')).toBe(6);
    expect(circuitForCounty(null)).toBe(6);
    expect(circuitForCounty('Atlantis')).toBe(6);
  });

  test('generates formal court caption headers correctly', () => {
    const pinellas = getFloridaCircuitCourtCaption('Pinellas');
    expect(pinellas.line1).toBe('IN THE CIRCUIT COURT OF THE SIXTH JUDICIAL CIRCUIT');
    expect(pinellas.line2).toBe('IN AND FOR PINELLAS COUNTY, FLORIDA');
    expect(pinellas.division).toBe('PROBATE DIVISION');

    const miami = getFloridaCircuitCourtCaption('Miami-Dade');
    expect(miami.line1).toBe('IN THE CIRCUIT COURT OF THE ELEVENTH JUDICIAL CIRCUIT');
    expect(miami.line2).toBe('IN AND FOR MIAMI-DADE COUNTY, FLORIDA');
    expect(miami.division).toBe('PROBATE DIVISION');
  });

  test('formats case caption titles with minor and advocate variants', () => {
    expect(getCaseCaptionTitle('Harold Thomas Bennett', 'guardian')).toBe('IN RE: THE GUARDIANSHIP OF HAROLD THOMAS BENNETT');
    expect(getCaseCaptionTitle('Tommy Pickles', 'minor')).toBe('IN RE: THE GUARDIANSHIP OF TOMMY PICKLES, A MINOR');
    expect(getCaseCaptionTitle('Jane Doe', 'advocate')).toBe('IN RE: THE GUARDIAN ADVOCACY OF JANE DOE');
    expect(getCaseCaptionTitle('John Smith', 'veteran')).toBe('IN RE: THE GUARDIANSHIP OF JOHN SMITH');
  });
});
