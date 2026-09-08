/**
 * On-demand loader for html2pdf.bundle.min.js.
 *
 * html2pdf (~945 KB) is heavy and only needed when generating PDFs via
 * jsPDF / html2pdf. This loader injects lib/html2pdf.bundle.min.js lazily.
 */

let html2pdfPromise = null;

export async function getHtml2Pdf() {
  if (typeof window !== 'undefined' && (window.html2pdf || window.jspdf || window.jsPDF)) {
    return window.html2pdf || window.jspdf?.jsPDF || window.jsPDF;
  }
  if (typeof globalThis !== 'undefined' && (globalThis.html2pdf || globalThis.jspdf || globalThis.jsPDF)) {
    return globalThis.html2pdf || globalThis.jspdf?.jsPDF || globalThis.jsPDF;
  }

  if (!html2pdfPromise) {
    html2pdfPromise = new Promise((resolve, reject) => {
      if (typeof window === 'undefined') {
        reject(new Error('html2pdf not available in headless/node environment.'));
        return;
      }

      if (window.html2pdf || window.jspdf || window.jsPDF) {
        resolve(window.html2pdf || window.jspdf?.jsPDF || window.jsPDF);
        return;
      }

      const script = document.createElement('script');
      script.src = 'lib/html2pdf.bundle.min.js';
      script.addEventListener('load', () => {
        if (window.html2pdf || window.jspdf || window.jsPDF) {
          resolve(window.html2pdf || window.jspdf?.jsPDF || window.jsPDF);
        } else {
          html2pdfPromise = null;
          reject(new Error('html2pdf failed to initialize after script load.'));
        }
      });
      script.addEventListener('error', (err) => {
        html2pdfPromise = null;
        reject(new Error('Failed to load lib/html2pdf.bundle.min.js: ' + (err?.message || 'Network/file error')));
      });
      document.head.appendChild(script);
    });
  }

  return html2pdfPromise;
}

if (typeof window !== 'undefined') {
  window.getHtml2Pdf = getHtml2Pdf;
}
