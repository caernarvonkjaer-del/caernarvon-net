// Shared pdf.js loader for preview rendering and inline supporting-document
// rendering. Kept separate from pdf-preview.js so pdf-engine.js can render
// uploaded PDFs without creating an import cycle.

async function getPdfWorkerSource() {
  if (typeof import.meta.env === 'undefined') {
    const res = await fetch(new URL('../../../lib/pdfjs/pdf.worker.min.mjs', import.meta.url));
    if (!res.ok) throw new Error(`pdf.js worker fetch failed: HTTP ${res.status}`);
    return await res.text();
  }
  const mod = await import('../../../lib/pdfjs/pdf.worker.min.mjs?raw');
  if (typeof mod.default !== 'string' || !mod.default) throw new Error('pdf.js worker source unavailable');
  return mod.default;
}

function toClassicWorkerSource(source) {
  return source
    .replace(/export\s*\{[^}]*\}\s*;?\s*$/, '')
    .replace(/import\.meta\.url/g, 'self.location.href');
}

let _pdfjsLib = null;
let _pdfjsLoadPromise = null;

export function ensurePdfjs() {
  if (_pdfjsLib) return Promise.resolve(_pdfjsLib);
  if (!_pdfjsLoadPromise) {
    _pdfjsLoadPromise = Promise.all([
      import('../../../lib/pdfjs/pdf.mjs'),
      getPdfWorkerSource(),
    ]).then(([pdfjsLib, workerSource]) => {
      const workerBlobUrl = URL.createObjectURL(
        new Blob([toClassicWorkerSource(workerSource)], { type: 'text/javascript' })
      );
      pdfjsLib.GlobalWorkerOptions.workerPort = new Worker(workerBlobUrl);
      _pdfjsLib = pdfjsLib;
      return pdfjsLib;
    });
  }
  return _pdfjsLoadPromise;
}
