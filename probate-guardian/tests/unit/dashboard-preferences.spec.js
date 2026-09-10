import { beforeEach, describe, expect, test } from 'vitest';
import {
  DASHBOARD_PREFERENCES_KEY,
  loadDashboardPreferences,
  resetDashboardPreferenceSession,
  saveDashboardPreferences,
  validateDashboardPreferences,
} from '../../src/features/dashboard/preferences.js';

function memoryStorage() {
  const values = new Map();
  return {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    value: key => values.get(key),
  };
}

describe('dashboard preferences', () => {
  beforeEach(() => resetDashboardPreferenceSession());

  test('normalizes a legacy role while preserving the supervising filter', () => {
    expect(validateDashboardPreferences({
      role: 'assistant',
      supervisingProfessionalFilter: '  Alex   Smith ',
      onboardingDismissed: true,
      wardName: 'Must not persist',
      email: 'must-not-persist@example.test',
    })).toEqual({
      role: 'professional',
      supervisingProfessionalFilter: 'alex smith',
    });

    expect(validateDashboardPreferences({ role: 'family' })).toEqual({
      role: 'professional',
      supervisingProfessionalFilter: null,
    });
  });

  test('falls back safely for malformed preferences', () => {
    expect(validateDashboardPreferences({ role: 'administrator', onboardingDismissed: 'yes' })).toEqual({
      role: 'professional',
      supervisingProfessionalFilter: null,
    });
    expect(validateDashboardPreferences(null)).toEqual({
      role: 'professional',
      supervisingProfessionalFilter: null,
    });
  });

  test('stores one namespaced browser-local record', () => {
    const storage = memoryStorage();
    const saved = saveDashboardPreferences({ role: 'professional' }, storage);

    expect(saved.role).toBe('professional');
    expect(JSON.parse(storage.value(DASHBOARD_PREFERENCES_KEY))).toEqual(saved);
    expect(loadDashboardPreferences(storage)).toEqual(saved);
  });

  test('a stored pre-Milestone-36 payload loads without throwing', () => {
    const storage = memoryStorage();
    storage.setItem(DASHBOARD_PREFERENCES_KEY, JSON.stringify({
      role: 'family',
      supervisingProfessionalFilter: 'case manager',
      onboardingDismissed: true,
    }));

    expect(loadDashboardPreferences(storage)).toEqual({
      role: 'professional',
      supervisingProfessionalFilter: 'case manager',
    });
  });

  test('retains session preferences when storage throws', () => {
    const unavailableStorage = {
      getItem() { throw new Error('blocked'); },
      setItem() { throw new Error('blocked'); },
    };

    saveDashboardPreferences({
      role: 'assistant',
      supervisingProfessionalFilter: 'Case Manager',
    }, unavailableStorage);

    expect(loadDashboardPreferences(unavailableStorage)).toEqual({
      role: 'professional',
      supervisingProfessionalFilter: 'case manager',
    });
  });

  test('never mutates unrelated ward input', () => {
    const ward = Object.freeze({ wardId: 'ward-1', wardName: 'Private Ward' });
    const storage = memoryStorage();
    saveDashboardPreferences({ role: 'family' }, storage);
    expect(ward).toEqual({ wardId: 'ward-1', wardName: 'Private Ward' });
    expect(storage.value(DASHBOARD_PREFERENCES_KEY)).not.toContain('Private Ward');
  });
});
