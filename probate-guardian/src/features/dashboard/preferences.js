import { normalizeFilterKey } from './view-model.js';

export const DASHBOARD_PREFERENCES_KEY = 'pg-dashboard-preferences-v1';
// Milestone 36-1 collapsed the three-role dashboard to a single professional
// layout. The set is kept so a stored payload can still be validated against a
// known role, and every legacy value normalizes into it.
export const DASHBOARD_ROLES = new Set(['professional']);

const DEFAULT_PREFERENCES = Object.freeze({
  role: 'professional',
  supervisingProfessionalFilter: null,
});

let sessionPreferences = { ...DEFAULT_PREFERENCES };

export function validateDashboardPreferences(value) {
  const input = value && typeof value === 'object' ? value : {};
  const filter = typeof input.supervisingProfessionalFilter === 'string'
    ? normalizeFilterKey(input.supervisingProfessionalFilter).slice(0, 120)
    : '';
  // A stored 'family' or 'assistant' payload from before Milestone 36-1 must
  // migrate rather than throw. Only a role still in DASHBOARD_ROLES survives;
  // every retired or malformed value falls back to the one supported layout.
  // onboardingDismissed is dropped along with the banner that read it.
  return {
    role: DASHBOARD_ROLES.has(input.role) ? input.role : DEFAULT_PREFERENCES.role,
    supervisingProfessionalFilter: filter || null,
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
