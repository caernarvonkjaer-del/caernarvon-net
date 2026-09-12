// UI Starter: Classic Synchronous Pre-Paint Script
// Place this inside an inline <script> tag in <head> BEFORE any stylesheets or body markup
// to ensure zero flash of unstyled content (FOUC).
(function() {
  try {
    var saved = localStorage.getItem('app_theme_preference');
    var dark = saved ? (saved === 'dark') : (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
    var theme = dark ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.setAttribute('data-bs-theme', theme);
  } catch (e) {
    // Fallback gracefully if storage or matchMedia is restricted
  }
})();
