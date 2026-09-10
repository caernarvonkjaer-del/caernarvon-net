import { describe, expect, test } from 'vitest';
import {
  GUARDIANSHIP_LIFECYCLE_OPTIONS,
  GUARDIANSHIP_TYPE_OPTIONS,
  optionsWithLegacyValue,
  optionsWithLegacyValuePairs,
} from '../../src/core/form/guardianship-options.js';

describe('guardianship option lists', () => {
  test('include GD workslip guardianship type values', () => {
    expect(GUARDIANSHIP_TYPE_OPTIONS).toEqual([
      'Plenary',
      'Limited',
      'Guardian Advocate',
      'Voluntary',
      'Minor - Person',
      'Minor - Property',
      'Minor - Person - Property',
    ]);
  });

  test('include appointment lifecycle values for existing successor field', () => {
    expect(GUARDIANSHIP_LIFECYCLE_OPTIONS).toContain('Successor');
    expect(GUARDIANSHIP_LIFECYCLE_OPTIONS).toContain('Standby');
    expect(GUARDIANSHIP_LIFECYCLE_OPTIONS).toContain('Surrogate');
    expect(GUARDIANSHIP_LIFECYCLE_OPTIONS).toContain('Emergency Temporary Guardianship');
  });

  test('preserves non-canonical legacy values as visible options', () => {
    const options = optionsWithLegacyValue(GUARDIANSHIP_TYPE_OPTIONS, 'Old Local Label');

    expect(options[0]).toEqual({ value: 'Old Local Label', label: 'Old Local Label' });
    expect(options).toContainEqual({ value: 'Plenary', label: 'Plenary' });
  });

  test('does not duplicate canonical values', () => {
    const options = optionsWithLegacyValue(GUARDIANSHIP_TYPE_OPTIONS, 'Limited');

    expect(options.filter((option) => option.value === 'Limited')).toHaveLength(1);
  });

  test('supports legacy pair-based select helpers', () => {
    expect(optionsWithLegacyValuePairs(['A', 'B'], 'Legacy')).toEqual([
      ['Legacy', 'Legacy'],
      ['A', 'A'],
      ['B', 'B'],
    ]);
  });
});
