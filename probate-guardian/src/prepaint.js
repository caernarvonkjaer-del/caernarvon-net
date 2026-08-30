try {
  var dark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
} catch (error) {
  // Theme restoration after startup remains the fallback.
}