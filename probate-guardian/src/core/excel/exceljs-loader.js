/**
 * On-demand loader for ExcelJS.
 *
 * ExcelJS (~941 KB) is heavy and only needed when the user explicitly triggers
 * an Excel spreadsheet export or import. This loader lazily injects lib/exceljs.min.js
 * when first requested, caching the load Promise across multiple calls.
 */

let excelJsPromise = null;

export async function getExcelJS() {
  if (typeof window !== 'undefined' && window.ExcelJS) {
    return window.ExcelJS;
  }
  if (typeof globalThis !== 'undefined' && globalThis.ExcelJS) {
    return globalThis.ExcelJS;
  }

  if (!excelJsPromise) {
    excelJsPromise = new Promise((resolve, reject) => {
      if (typeof window === 'undefined') {
        // Node / test environment fallback
        try {
          if (globalThis.ExcelJS) {
            resolve(globalThis.ExcelJS);
            return;
          }
          reject(new Error('ExcelJS not available in headless/node environment without polyfill.'));
        } catch (err) {
          reject(err);
        }
        return;
      }

      if (window.ExcelJS) {
        resolve(window.ExcelJS);
        return;
      }

      const script = document.createElement('script');
      // Relative path works in both standard web hosting and file:// distribution
      script.src = 'lib/exceljs.min.js';
      script.addEventListener('load', () => {
        if (window.ExcelJS) {
          resolve(window.ExcelJS);
        } else {
          excelJsPromise = null;
          reject(new Error('ExcelJS failed to initialize after script load.'));
        }
      });
      script.addEventListener('error', (err) => {
        excelJsPromise = null;
        reject(new Error('Failed to load lib/exceljs.min.js: ' + (err?.message || 'Network/file error')));
      });
      document.head.appendChild(script);
    });
  }

  return excelJsPromise;
}

if (typeof window !== 'undefined') {
  window.getExcelJS = getExcelJS;
}
