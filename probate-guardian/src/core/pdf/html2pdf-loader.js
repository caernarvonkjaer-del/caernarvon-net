/**
 * On-demand loader for html2pdf.bundle.min.js.
 *
 * html2pdf (~945 KB) is heavy and only needed when generating PDFs via
 * jsPDF / html2pdf. Milestone 52H: script injection and promise caching
 * moved to the shared loadGlobalScript() -- this file now only supplies the
 * URL and the "is it already loaded" check.
 */
import { loadGlobalScript } from '../vendor-loader.js';

export async function getHtml2Pdf() {
  return loadGlobalScript('lib/html2pdf.bundle.min.js', {
    check: () =>
      (typeof window !== 'undefined' && (window.html2pdf || window.jspdf?.jsPDF || window.jsPDF)) ||
      (typeof globalThis !== 'undefined' && (globalThis.html2pdf || globalThis.jspdf?.jsPDF || globalThis.jsPDF)),
  });
}

if (typeof window !== 'undefined') {
  window.getHtml2Pdf = getHtml2Pdf;
}
