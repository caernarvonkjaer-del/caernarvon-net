import { normalizeFilterKey } from './view-model.js';

export const DASHBOARD_PREFERENCES_KEY = 'pg-dashboard-preferences-v1';
export const DASHBOARD_ROLES = new Set(['family', 'professional', 'assistant']);

const DEFAULT_PREFERENCES = Object.freeze({
  role: 'family',
  supervisingProfessionalFilter: null,
  onboardingDismissed: false,
});

let sessionPreferences = { ...DEFAULT_PREFERENCES };

export function validateDashboardPreferences(value) {
  const input = value && typeof value === 'object' ? value : {};
  const filter = typeof input.supervisingProfessionalFilter === 'string'
    ? normalizeFilterKey(input.supervisingProfessionalFilter).slice(0, 120)
    : '';
  return {
    role: DASHBOARD_ROLES.has(input.role) ? input.role : DEFAULT_PREFERENCES.role,
    supervisingProfessionalFilter: filter || null,
    onboardingDismissed: input.onboardingDismissed === true,
  };
}

function browserStorage() {
  try {
    return globalThis.localStorage;
  } catch {
    return null;
  }
}

export function loadDashboardPreferences(storage = browserStorage()) {
  if (!storage) return { ...sessionPreferences };
  try {
    const raw = storage.getItem(DASHBOARD_PREFERENCES_KEY);
    if (!raw) return { ...sessionPreferences };
    sessionPreferences = validateDashboardPreferences(JSON.parse(raw));
  } catch {
    return { ...sessionPreferences };
  }
  return { ...sessionPreferences };
}

export function saveDashboardPreferences(nextPreferences, storage = browserStorage()) {
  sessionPreferences = validateDashboardPreferences(nextPreferences);
  if (storage) {
    try {
      storage.setItem(DASHBOARD_PREFERENCES_KEY, JSON.stringify(sessionPreferences));
    } catch {
      // Session memory remains authoritative when browser storage is unavailable.
    }
  }
  return { ...sessionPreferences };
}

export function resetDashboardPreferenceSession() {
  sessionPreferences = { ...DEFAULT_PREFERENCES };
}