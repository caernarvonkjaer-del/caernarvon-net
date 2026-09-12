/**
 * UI Starter: Theme Management (Light / Dark Mode)
 *
 * Provides runtime theme switching, button synchronization, and persistence coordination.
 * For pre-paint initialization, use `prepaint.snippet.js` synchronously in `<head>`.
 */

import { ic } from './icons.js';

const STORAGE_KEY = 'app_theme_preference';
const VALID_THEMES = ['light', 'dark'];

/**
 * Validates and normalizes theme value to 'light' or 'dark'.
 * @param {string} theme
 * @returns {'light' | 'dark'}
 */
export function normalizeTheme(theme) {
  return VALID_THEMES.includes(theme) ? theme : 'light';
}

/**
 * Returns the currently active theme on documentElement.
 * @returns {'light' | 'dark'}
 */
export function currentTheme() {
  const active = document.documentElement.getAttribute('data-theme');
  return active === 'dark' ? 'dark' : 'light';
}

/**
 * Applies a theme ('light' | 'dark') to the document and updates toggle buttons.
 *
 * @param {string} theme - 'light' or 'dark'
 * @param {boolean} [persist=false] - Whether to persist the setting
 * @param {Function|null} [persistenceAdapter=null] - Custom persist function (e.g., (theme) => saveAppState('theme', theme))
 */
export function applyTheme(theme, persist = false, persistenceAdapter = null) {
  const nextTheme = normalizeTheme(theme);
  document.documentElement.setAttribute('data-theme', nextTheme);
  document.documentElement.setAttribute('data-bs-theme', nextTheme);

  if (persist) {
    if (typeof persistenceAdapter === 'function') {
      persistenceAdapter(nextTheme);
    } else {
      try {
        localStorage.setItem(STORAGE_KEY, nextTheme);
      } catch (err) {
        // Storage unavailable
      }
    }
  }

  // Update theme toggle buttons in the DOM
  const isDark = nextTheme === 'dark';
  const btns = document.querySelectorAll('#theme-toggle-btn, .topnav-theme, [data-action="toggle-theme"], .theme-toggle');
  btns.forEach((btn) => {
    btn.innerHTML = ic(isDark ? 'sun' : 'moon', 16);
    btn.setAttribute('aria-pressed', String(isDark));
    btn.setAttribute('aria-label', `Switch to ${isDark ? 'light' : 'dark'} theme`);
  });
}

/**
 * Toggles between light and dark mode.
 *
 * @param {Function|null} [persistenceAdapter=null] - Optional persistence callback
 */
export function toggleTheme(persistenceAdapter = null) {
  applyTheme(currentTheme() === 'dark' ? 'light' : 'dark', true, persistenceAdapter);
}
