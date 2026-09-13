// Milestone 40D: theme is a per-DEVICE display preference, stored in
// localStorage — not per-case data stored inside the .sav file.
//
// Why localStorage specifically, and not the existing
// core/persistence/launch-preferences.js IndexedDB store that already holds
// pre-case state: an inline <head> script has to resolve the theme
// SYNCHRONOUSLY, before first paint. IndexedDB is async and the .sav needs
// decryption (for an encrypted file, a password), so neither can be read at that
// point. localStorage is the only browser storage that can, which is why the
// portfolio ui-starter kit uses it and why this migration follows suit.
//
// The behavioural change this makes is real and intentional: theme used to
// travel inside the .sav, so opening a colleague's file could change your
// appearance, and a file moved between machines carried its theme. It is now
// per-device and identical across every case opened in that browser. A user who
// deliberately themed one case differently loses that. Acceptable — theme is a
// display preference, not case data — but stated rather than left to be
// discovered.

export const THEME_STORAGE_KEY = 'pg-theme-v1';
export const THEMES = ['light', 'dark'];

/** Validates against the explicit enum. Anything else is treated as unset. */
export function isValidTheme(value) {
  return THEMES.includes(value);
}

/**
 * The stored per-device choice, or null when none is stored or storage is
 * unavailable. Every access is guarded: localStorage throws outright in some
 * privacy modes rather than returning null.
 */
export function readStoredTheme() {
  try {
    if (typeof localStorage === 'undefined') return null;
    const raw = localStorage.getItem(THEME_STORAGE_KEY);
    return isValidTheme(raw) ? raw : null;
  } catch (error) {
    return null;
  }
}

/** Persists an explicit choice. Returns false if invalid or storage refused. */
export function writeStoredTheme(theme) {
  if (!isValidTheme(theme)) return false;
  try {
    if (typeof localStorage === 'undefined') return false;
    localStorage.setItem(THEME_STORAGE_KEY, theme);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * One-time migration for users upgrading from a .sav that still carries
 * `appState.theme`. Seeds localStorage from that legacy value ONLY when nothing
 * is stored yet, so an existing per-device choice is never overwritten by a file
 * and a returning user's theme does not silently revert to the OS default.
 *
 * Returns true only when it actually seeded.
 */
export function seedStoredThemeFromLegacy(legacyTheme) {
  if (!isValidTheme(legacyTheme)) return false;
  if (readStoredTheme()) return false;
  return writeStoredTheme(legacyTheme);
}

/**
 * The theme that should be painted: the stored choice if there is one, otherwise
 * the OS preference. This is the same rule src/prepaint.js applies inline before
 * first paint — see the note there about why that one line is duplicated.
 */
export function resolvePaintTheme() {
  const stored = readStoredTheme();
  if (stored) return stored;
  try {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
  } catch (error) { /* fall through to light */ }
  return 'light';
}

// Global bridge for legacy-app.js, a classic script that cannot import modules.
if (typeof window !== 'undefined') {
  window.THEME_STORAGE_KEY = THEME_STORAGE_KEY;
  window.readStoredTheme = readStoredTheme;
  window.writeStoredTheme = writeStoredTheme;
  window.seedStoredThemeFromLegacy = seedStoredThemeFromLegacy;
  window.resolvePaintTheme = resolvePaintTheme;
}
