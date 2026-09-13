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

  // Milestone 40C-A item 7 inverted this. It used to assert that a blank or
  // unrecognized county "falls back gracefully to Sixth Judicial Circuit" --
  // which is exactly the behaviour that made a filing with no county print a
  // confident Pinellas caption on a real court document.
  //
  // The three fallbacks were LAYERED, so each is asserted separately: removing
  // any one or two of them still produced a Sixth Circuit caption through
  // whichever remained, and a future partial revert must fail here rather than
  // quietly restoring the default through the untested one.
  describe('an unresolvable county yields an explicitly unknown result, never Sixth Circuit', () => {
    test('circuitForCounty() returns null for blank, nullish and unrecognized', () => {
      expect(circuitForCounty('')).toBeNull();
      expect(circuitForCounty('   ')).toBeNull();
      expect(circuitForCounty(null)).toBeNull();
      expect(circuitForCounty(undefined)).toBeNull();
      expect(circuitForCounty('Atlantis')).toBeNull();
    });

    test('getCircuitOrdinal() returns empty string, not "SIXTH"', () => {
      expect(getCircuitOrdinal('')).toBe('');
      expect(getCircuitOrdinal(null)).toBe('');
      expect(getCircuitOrdinal('Atlantis')).toBe('');
      // Also for a circuit NUMBER that resolves to nothing -- getCircuitOrdinal
      // accepts either a number or a county name, and the numeric path had its
      // own `|| 'Sixth'`.
      expect(getCircuitOrdinal(0)).toBe('');
      expect(getCircuitOrdinal(99)).toBe('');
      expect(getCircuitOrdinal(null)).toBe('');
    });

    test('getFloridaCircuitCourtCaption() returns null rather than a caption object', () => {
      expect(getFloridaCircuitCourtCaption('')).toBeNull();
      expect(getFloridaCircuitCourtCaption('   ')).toBeNull();
      expect(getFloridaCircuitCourtCaption(null)).toBeNull();
      expect(getFloridaCircuitCourtCaption(undefined)).toBeNull();
      expect(getFloridaCircuitCourtCaption('Atlantis')).toBeNull();
    });

    test('no unresolvable input produces any Pinellas or Sixth text anywhere', () => {
      for (const bad of ['', '   ', null, undefined, 'Atlantis', 'Nowhere County']) {
        const caption = getFloridaCircuitCourtCaption(bad);
        expect(caption, `caption for ${JSON.stringify(bad)}`).toBeNull();
        expect(getCircuitOrdinal(bad)).not.toMatch(/SIXTH/i);
        expect(String(circuitForCounty(bad))).not.toBe('6');
      }
    });
  });

  // Removing a fallback must not disturb the 67 genuine mappings.
  test('the real Sixth Circuit counties still resolve normally', () => {
    expect(circuitForCounty('Pinellas')).toBe(6);
    expect(circuitForCounty('Pasco')).toBe(6);
    expect(getCircuitOrdinal('Pinellas')).toBe('SIXTH');
    const caption = getFloridaCircuitCourtCaption('Pinellas');
    expect(caption).not.toBeNull();
    expect(caption.line1).toBe('IN THE CIRCUIT COURT OF THE SIXTH JUDICIAL CIRCUIT');
    expect(caption.line2).toBe('IN AND FOR PINELLAS COUNTY, FLORIDA');
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
