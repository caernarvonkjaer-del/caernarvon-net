/**
 * On-demand loader for ExcelJS.
 *
 * ExcelJS (~941 KB) is heavy and only needed when the user explicitly triggers
 * an Excel spreadsheet export or import. Milestone 52H: script injection and
 * promise caching moved to the shared loadGlobalScript() -- this file now
 * only supplies the URL and the "is it already loaded" check.
 */
import { loadGlobalScript } from '../vendor-loader.js';

export async function getExcelJS() {
  return loadGlobalScript('lib/exceljs.min.js', {
    check: () =>
      (typeof window !== 'undefined' && window.ExcelJS) ||
      (typeof globalThis !== 'undefined' && globalThis.ExcelJS),
  });
}

// Milestone 51E deleted the `getExcelJS` window-global assignment from here.
// The ES export above is live -- all three feature excel.js files import it --
// but no code ever read the global.
