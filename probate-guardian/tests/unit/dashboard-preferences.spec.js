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

  test('validates role, filter, and onboarding fields only', () => {
    expect(validateDashboardPreferences({
      role: 'assistant',
      supervisingProfessionalFilter: '  Alex   Smith ',
      onboardingDismissed: true,
      wardName: 'Must not persist',
      email: 'must-not-persist@example.test',
    })).toEqual({
      role: 'assistant',
      supervisingProfessionalFilter: 'alex smith',
      onboardingDismissed: true,
    });
  });

  test('falls back safely for malformed preferences', () => {
    expect(validateDashboardPreferences({ role: 'administrator', onboardingDismissed: 'yes' })).toEqual({
      role: 'family',
      supervisingProfessionalFilter: null,
      onboardingDismissed: false,
    });
  });

  test('stores one namespaced browser-local record', () => {
    const storage = memoryStorage();
    const saved = saveDashboardPreferences({ role: 'professional', onboardingDismissed: true }, storage);

    expect(saved.role).toBe('professional');
    expect(JSON.parse(storage.value(DASHBOARD_PREFERENCES_KEY))).toEqual(saved);
    expect(loadDashboardPreferences(storage)).toEqual(saved);
  });

  test('retains session preferences when storage throws', () => {
    const unavailableStorage = {
      getItem() { throw new Error('blocked'); },
      setItem() { throw new Error('blocked'); },
    };

    saveDashboardPreferences({
      role: 'assistant',
      supervisingProfessionalFilter: 'Case Manager',
      onboardingDismissed: true,
    }, unavailableStorage);

    expect(loadDashboardPreferences(unavailableStorage)).toEqual({
      role: 'assistant',
      supervisingProfessionalFilter: 'case manager',
      onboardingDismissed: true,
    });
  });

  test('never mutates unrelated ward input', () => {
    const ward = Object.freeze({ wardId: 'ward-1', wardName: 'Private Ward' });
    const storage = memoryStorage();
    saveDashboardPreferences({ role: 'family', onboardingDismissed: true }, storage);
    expect(ward).toEqual({ wardId: 'ward-1', wardName: 'Private Ward' });
    expect(storage.value(DASHBOARD_PREFERENCES_KEY)).not.toContain('Private Ward');
  });
});