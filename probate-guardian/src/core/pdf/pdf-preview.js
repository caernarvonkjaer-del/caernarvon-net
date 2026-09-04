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

// The worker source needs to end up as an in-memory string one way or
// another, because dist/portable is opened via file:// -- and a file://
// document's fetch()/XHR of a sibling file is blocked outright (confirmed
// empirically: "TypeError: Failed to fetch", opaque 'null' origin). Try a
// plain runtime fetch() first (works for every HTTP-served target --
// the raw index.html, `vite dev`, and dist/web all serve lib/ at a real,
// fetchable URL); only fall back to Vite's build-time `?raw` loader (a
// *dynamic* import, so it's never even reached -- let alone need to
// resolve -- in the raw/unbundled target, where the fetch() above always
// succeeds) when that fetch fails, which in practice means dist/portable.
async function getPdfWorkerSource() {
  if (typeof import.meta.env === 'undefined') {
    // Fully raw/unbundled (the "source" parity target in
    // playwright.config.ts -- today's index.html served as-is, zero Vite
    // processing of any kind, confirmed by import.meta.env simply not
    // existing at runtime): fetch the vendored file at a URL relative to
    // this module's own real served location. Unlike a bundled build,
    // nothing has moved this file from its source-tree position, so this
    // relative offset is exactly right here -- it would NOT be for a
    // bundled chunk, which is why the branch below doesn't reuse it.
    const res = await fetch(new URL('../../../lib/pdfjs/pdf.worker.min.mjs', import.meta.url));
    if (!res.ok) throw new Error(`pdf.js worker fetch failed: HTTP ${res.status}`);
    return await res.text();
  }
  // Vite-processed (its dev server, or a dist/web or dist/portable build):
  // `?raw` is resolved and its content inlined by Vite's own module
  // resolution at the point this import is written, regardless of where
  // the calling chunk itself ends up after bundling -- so it's used
  // directly here rather than only as a fetch() fallback.
  const mod = await import('../../../lib/pdfjs/pdf.worker.min.mjs?raw');
  if (typeof mod.default !== 'string' || !mod.default) throw new Error('pdf.js worker source unavailable');
  return mod.default;
}

// pdf.js's worker script already sets globalThis.pdfjsWorker itself, for
// exactly this kind of classic-script use -- the only thing standing
// between this source and being valid classic-script syntax is the
// trailing ES `export{...}` statement, meaningless to a worker that only
// ever talks over postMessage. Needed because a file:// document (dist/
// portable) can construct a classic Worker from a blob: URL but not a
// {type:'module'} one -- confirmed empirically (Chromium throws a bare,
// detail-free error for a null-origin document constructing a module
// worker from blob:; a classic worker from that same blob: URL works).
// Using a classic worker for every target (not just file://) keeps this
// to one code path instead of a build-mode branch to keep in sync.
function toClassicWorkerSource(source) {
  return source
    .replace(/export\s*\{[^}]*\}\s*;?\s*$/, '')
    // `import.meta` is a hard SyntaxError outside a real ES module -- it
    // fails to parse the *entire* classic script, not just that
    // expression, unlike most runtime issues. The worker bundle's two
    // uses are both inside its WASM JBig2/OpenJPEG image-codec loader
    // shims (irrelevant here -- this app's own generated PDFs never embed
    // JBig2/JPX images), each already wrapped in its own
    // `try{new URL(".",n).href}catch{}`, so substituting the module's own
    // URL equivalent for a worker -- self.location.href -- is both safe
    // and behaviorally right even in the hypothetical case a parsed PDF
    // did use one of those codecs.
    .replace(/import\.meta\.url/g, 'self.location.href');
}

let _pdfjsLib = null;
let _pdfjsLoadPromise = null;
function ensurePdfjs() {
  if (_pdfjsLib) return Promise.resolve(_pdfjsLib);
  if (!_pdfjsLoadPromise) {
    // pdf.mjs, not pdf.min.mjs: pdfjs-dist 6.3.289's prebuilt minified
    // build (pdf.min.mjs) contains a stray invalid-UTF-8 byte sequence that
    // makes Vite's bundler (rolldown) refuse to load it outright ("stream
    // did not contain valid UTF-8"), confirmed via a strict TextDecoder
    // check against both files. The unminified build doesn't have this
    // problem, and Vite minifies everything it bundles for a production
    // build anyway, so this loses nothing. Relative, not a package
    // specifier -- see file header.
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
async function renderPagesInto(container, doc) {
  const pdfjsLib = await ensurePdfjs();
  const pdf = await pdfjsLib.getDocument({ data: doc.output('arraybuffer') }).promise;
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
// feature uses (same options -- signatureStyle included), so preview and
// Save-as-PDF can never diverge again by construction (this is also the
// fix for the signature-style-radio/preview divergence
// MILESTONE-19-3-PROPOSAL.md called out).
export async function mountPdfPreview(buildModel, D, containerId = 'print-doc-container') {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = '<p class="pdf-preview-loading no-print" style="padding:2rem;text-align:center;color:var(--ink-3);">Generating preview…</p>';
  try {
    const model = buildModel(D);
    const doc = await generateCourtFormPdf(model);
    await renderPagesInto(container, doc);
  } catch (e) {
    console.error('PDF preview render failed', e);
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
  const model = buildModel(D);
  const doc = await generateCourtFormPdf(model);
  const blobUrl = doc.output('bloburl');
  window.open(blobUrl, '_blank');
}
