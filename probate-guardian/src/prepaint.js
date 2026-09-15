// Synchronous pre-paint theme resolution. Runs from an inline <script> in
// <head> before any stylesheet or body markup, so the correct theme is on <html>
// before the first paint and there is no flash of the wrong one.
//
// Milestone 40D: this now prefers the user's stored per-device choice over the OS
// preference. Previously it sampled prefers-color-scheme only, and the saved
// theme was restored later from the .sav file's app state -- which for an
// encrypted save meant after the master password was entered. That late restore
// WAS the flash.
//
// The storage key is duplicated from src/core/theme-preference.js's
// THEME_STORAGE_KEY on purpose: this file must not import anything, because it
// runs as a classic inline script before any module graph exists.
// tests/unit/theme-persistence.spec.js asserts the two literals still agree, so
// the duplication cannot drift silently.
try {
  // Like the theme, acknowledgement is a device-only preference that must be
  // readable before first paint. The module that owns the dialog repeats this
  // exact key/version and performs all interaction after the DOM exists.
  try {
    if (localStorage.getItem('pg.termsAccepted') === '2026-09-15') {
      document.documentElement.setAttribute('data-terms-accepted', 'true');
    }
  } catch (storageError) {
    // If storage is unavailable, require acknowledgement for this visit.
  }
  var stored = null;
  try {
    var raw = localStorage.getItem('pg-theme-v1');
    if (raw === 'light' || raw === 'dark') stored = raw;
  } catch (storageError) {
    // localStorage throws outright in some privacy modes rather than returning
    // null; fall back to the OS preference.
  }
  var dark = stored
    ? stored === 'dark'
    : !!(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
  var theme = dark ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', theme);
  document.documentElement.setAttribute('data-bs-theme', theme);
} catch (error) {
  // Leaves the document on its default light palette; applyTheme() will still
  // bring the toggle button's state into agreement once scripts run.
}
