// Milestone 19-3: shared PDF preview/print viewer.
//
// Renders the exact PDF that "Save as PDF" would produce -- via pdf.js,
// canvas + TextLayer, self-hosted -- instead of each feature's separate
// buildPrintHTML() HTML/CSS reconstruction. One renderer (pdf-model.js +
// pdf-engine.js) now drives Save-as-PDF, Preview, and Print for every
// feature.
//
// pdf.js itself is vendored as real files under lib/pdfjs/ (pdf.mjs, the
// worker) and loaded via *relative* import/fetch, not the pdfjs-dist npm
// package's bare specifier -- this app is tested and shipped against four
// "parity targets" (see playwright.config.ts / INDEX-SPLIT-PLAN.md): the
// raw, unbundled index.html served as-is (native browser ESM, zero
// bundler involvement) has to keep working, and a bare `import from
// 'pdfjs-dist/...'` specifier can only resolve through a bundler's
// module resolution, not a browser's native one ("Failed to resolve
// module specifier", confirmed by actually running the raw target).
// Relative imports of real files resolve natively in every target *and*
// bundle correctly under Vite, so that's what's used throughout this file.
// (pdfjs-dist stays a devDependency purely as the upstream source these
// two files are copied from -- see lib/VENDORED-LIBRARIES.md.)
import { generateCourtFormPdf } from './pdf-engine.js';
import { finalizeCourtFormPdf } from './pdf-finalizer.js';
import { ensurePdfjs } from './pdfjs-loader.js';
import { announceStatus } from '../status/live-region.js';

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// One page = one canvas (visual render) + one overlaid .textLayer (real,
// selectable, screen-reader-exposed DOM text built from the same parsed
// PDF content) -- required scope per MILESTONE-19-3-PROPOSAL.md, not an
// optional enhancement, so the preview surface doesn't regress the app's
// own WCAG 2.1 AA standard relative to the old HTML preview it replaces.
// The wrapper is `pdf-page` only, deliberately NOT also `doc-page` -- that
// class's `padding:1in`/`max-width:8.5in` (sized for the old HTML
// reconstruction) clipped and mis-padded the canvas when both classes were
// briefly applied together during development (canvas stayed at its true
// pixel width while its container was capped to 8.5in by the stray class,
// so the canvas visibly overflowed the padded box). legacy-app.js's
// pv-pager (pvPages()/pvShowAll()/pvApply()) was generalized to recognize
// `pdf-page` in its own right, so no compatibility class is needed here.
async function renderPagesInto(container, pdfBytes) {
  const pdfjsLib = await ensurePdfjs();
  const pdf = await pdfjsLib.getDocument({ data: pdfBytes }).promise;
  container.innerHTML = '';
  const scale = 1.5;
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale });

    const pageWrap = document.createElement('div');
    pageWrap.className = 'pdf-page';
    pageWrap.style.width = `${viewport.width}px`;
    pageWrap.style.height = `${viewport.height}px`;

    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    pageWrap.appendChild(canvas);

    const textLayerDiv = document.createElement('div');
    textLayerDiv.className = 'textLayer';
    pageWrap.appendChild(textLayerDiv);

    container.appendChild(pageWrap);

    await page.render({ canvasContext: canvas.getContext('2d'), viewport, canvas }).promise;
    const textContent = await page.getTextContent();
    await new pdfjsLib.TextLayer({ textContentSource: textContent, container: textLayerDiv, viewport }).render();
  }
}

// buildModel(D) must be the exact same model builder doSavePdf() for that
// feature uses, so preview and
// Save-as-PDF can never diverge again by construction (this is also the
// fix for the signature-style-radio/preview divergence
// MILESTONE-19-3-PROPOSAL.md called out).
export async function mountPdfPreview(buildModel, D, containerId = 'print-doc-container') {
  const container = document.getElementById(containerId);
  if (!container) return;
  announceStatus('Generating preview…', { containerId: 'print-preview-status' });
  container.innerHTML = '<p class="pdf-preview-loading no-print" style="padding:2rem;text-align:center;color:var(--ink-3);">Generating preview…</p>';
  try {
    const model = buildModel(D);
    const doc = await generateCourtFormPdf(model);
    await renderPagesInto(container, await finalizeCourtFormPdf(doc));
    announceStatus('Preview ready.', { containerId: 'print-preview-status' });
  } catch (e) {
    console.error('PDF preview render failed', e);
    announceStatus(`Preview failed to render: ${e.message}`, { priority: 'assertive', containerId: 'print-preview-status' });
    container.innerHTML = `<p class="pdf-preview-error no-print" style="padding:2rem;text-align:center;color:var(--danger-text);">Preview failed to render: ${escapeHtml(e.message)}</p>`;
  }
}

// Print: opens the same generated PDF blob and lets the browser/OS PDF
// print dialog handle it, instead of window.print() on the live app DOM.
// A same-origin blob: opened as a top-level navigation (window.open, not
// an <iframe>/<object> embed) needs no CSP change -- object-src 'none' and
// the missing frame-src only govern embedding, not top-level navigation --
// and it structurally can't repeat the .mobile-topbar-overlay bug class,
// since the new tab never contains any app chrome to begin with.
export async function printGeneratedPdf(buildModel, D) {
  try {
    const model = buildModel(D);
    const doc = await generateCourtFormPdf(model);
    const pdfBytes = await finalizeCourtFormPdf(doc);
    const blobUrl = URL.createObjectURL(new Blob([pdfBytes], { type: 'application/pdf' }));
    window.open(blobUrl, '_blank');
  } catch (e) {
    console.error('PDF print failed', e);
    alert(`PDF print failed: ${e.message || e}`);
  }
}
