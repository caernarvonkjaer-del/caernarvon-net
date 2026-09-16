// Milestone 52H: shared <script>-tag loader for a heavy vendor bundle
// (html2pdf, ExcelJS), previously duplicated identically in
// src/core/pdf/html2pdf-loader.js and src/core/excel/exceljs-loader.js.
// Lives here rather than under pdf/ or excel/ since neither of those should
// own a utility the other imports from.
//
// Caches one Promise per script `src`, keyed internally, so callers don't
// need their own module-level cache variable. On a failed load (network
// error, or the script loaded but `check()` still finds nothing) the cache
// entry is deleted before rejecting, so the next call retries instead of
// replaying the same rejection forever.
const _scriptPromises = new Map();

/**
 * @param {string} src - script URL to inject if the global isn't already present
 * @param {{ check: () => any }} options - check() returns the already-loaded
 *   global (any truthy value) or a falsy value if it isn't loaded yet
 * @returns {Promise<any>} resolves to check()'s result
 */
export function loadGlobalScript(src, { check }) {
  const already = check();
  if (already) return Promise.resolve(already);

  if (typeof window === 'undefined') {
    return Promise.reject(new Error(`${src} not available in headless/node environment.`));
  }

  const cached = _scriptPromises.get(src);
  if (cached) return cached;

  const promise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.addEventListener('load', () => {
      const result = check();
      if (result) {
        resolve(result);
      } else {
        _scriptPromises.delete(src);
        reject(new Error(`${src} failed to initialize after script load.`));
      }
    });
    script.addEventListener('error', (err) => {
      _scriptPromises.delete(src);
      reject(new Error(`Failed to load ${src}: ${err?.message || 'Network/file error'}`));
    });
    document.head.appendChild(script);
  });
  _scriptPromises.set(src, promise);
  return promise;
}
