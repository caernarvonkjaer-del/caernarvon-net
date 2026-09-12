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
import { finalizeCourtFormPdf, saveFinalizedPdf } from './pdf-finalizer.js';
import { ensurePdfjs } from './pdfjs-loader.js';
import { AnnotationSession, computeContentFingerprint } from './pdf-annotate.js';
import { announceStatus } from '../status/live-region.js';
import { prepareFilingOutput } from '../filing/output-preflight.js';
import { acknowledgeOutstandingRequirements, authorizeFilingOutput, beginFreshPreview } from '../filing/output-authorization.js';

// Milestone 39-A: base64 round-trip for a persisted annotated PDF
// (D.printAnnotations.pdfBytes). Chunked to avoid a call-stack overflow from
// spreading a large Uint8Array into String.fromCharCode at once.
function bytesToBase64(bytes) {
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}
function base64ToBytes(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

// One annotation session per mounted preview, torn down and rebuilt on every
// re-render (MILESTONE-39-PROPOSAL.md 39-A: "the spike must add a place to
// hold that reference for the preview's lifetime and clear it on every
// re-render" -- renderPagesInto()'s own pdf/page locals still go out of
// scope on every call, this is the place that survives it).
let _annotationSession = null;
function destroyAnnotationSession() {
  if (_annotationSession) {
    _annotationSession.destroy();
    _annotationSession = null;
  }
}

function mountAnnotateToolbar(container, session, pdfjsLib, D, fingerprint) {
  const toolbar = document.createElement('div');
  toolbar.className = 'pdf-annotate-toolbar no-print';
  toolbar.setAttribute('role', 'toolbar');
  toolbar.setAttribute('aria-label', 'Annotate PDF');
  toolbar.innerHTML = `
    <button type="button" class="btn btn-outline-secondary btn-sm" data-annotate-action="toggle" aria-pressed="false">Annotate PDF</button>
    <button type="button" class="btn btn-outline-secondary btn-sm" data-annotate-action="note" aria-pressed="false" hidden>Add Note</button>
    <button type="button" class="btn btn-outline-secondary btn-sm" data-annotate-action="highlight" aria-pressed="false" hidden>Highlight</button>
    <button type="button" class="btn btn-outline-secondary btn-sm" data-annotate-action="undo" hidden>Undo</button>
    <button type="button" class="btn btn-outline-secondary btn-sm" data-annotate-action="clear" hidden>Clear Annotations</button>
    <button type="button" class="btn btn-outline-primary btn-sm" data-annotate-action="save" hidden>Save Annotated PDF</button>
    <span class="pdf-annotate-status" role="status" aria-live="polite"></span>
  `;
  container.insertBefore(toolbar, container.firstChild);

  const toggleBtn = toolbar.querySelector('[data-annotate-action="toggle"]');
  const noteBtn = toolbar.querySelector('[data-annotate-action="note"]');
  const highlightBtn = toolbar.querySelector('[data-annotate-action="highlight"]');
  const undoBtn = toolbar.querySelector('[data-annotate-action="undo"]');
  const clearBtn = toolbar.querySelector('[data-annotate-action="clear"]');
  const saveBtn = toolbar.querySelector('[data-annotate-action="save"]');
  const statusEl = toolbar.querySelector('.pdf-annotate-status');
  const subButtons = [noteBtn, highlightBtn, undoBtn, clearBtn, saveBtn];
  const { NONE, FREETEXT, HIGHLIGHT } = pdfjsLib.AnnotationEditorType;

  function setActiveTool(mode) {
    noteBtn.setAttribute('aria-pressed', String(mode === FREETEXT));
    highlightBtn.setAttribute('aria-pressed', String(mode === HIGHLIGHT));
    session.setMode(mode);
  }

  toggleBtn.addEventListener('click', () => {
    const nowOn = toggleBtn.getAttribute('aria-pressed') !== 'true';
    toggleBtn.setAttribute('aria-pressed', String(nowOn));
    subButtons.forEach((btn) => { btn.hidden = !nowOn; });
    if (!nowOn) setActiveTool(NONE);
  });
  noteBtn.addEventListener('click', () => {
    setActiveTool(noteBtn.getAttribute('aria-pressed') === 'true' ? NONE : FREETEXT);
  });
  highlightBtn.addEventListener('click', () => {
    setActiveTool(highlightBtn.getAttribute('aria-pressed') === 'true' ? NONE : HIGHLIGHT);
  });
  undoBtn.addEventListener('click', () => session.undo());
  clearBtn.addEventListener('click', () => {
    if (session.isEmpty()) return;
    if (!window.confirm('Remove all annotations from this preview?')) return;
    session.clearAll();
  });
  saveBtn.addEventListener('click', async () => {
    try {
      const bytes = await session.saveAnnotatedBytes();
      const ward = (D.wardName || 'Preview').replace(/[^a-z0-9]/gi, '_');
      saveFinalizedPdf(bytes, `${ward}_Annotated.pdf`);
      // Persisted per 39-A's "Persistence design": the filing's own
      // regenerated (unannotated) content fingerprint at capture time, not
      // the annotated bytes' own content -- drift is measured against the
      // underlying form data, which is what can silently change later.
      D.printAnnotations = { pdfBytes: bytesToBase64(bytes), contentFingerprint: fingerprint, capturedAt: new Date().toISOString() };
      window.markDirtySinceExport?.();
      window.autoSave?.();
      if (statusEl) statusEl.textContent = 'Annotations saved with this filing.';
    } catch (e) {
      console.error('Save Annotated PDF failed', e);
      if (statusEl) statusEl.textContent = `Save Annotated PDF failed: ${e.message || e}`;
    }
  });
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
// Returns the live pdfjsLib/PDFDocumentProxy/per-page render info alongside
// the DOM side effect -- Milestone 39-A needs all three kept alive for the
// preview's lifetime (annotation editing and Save Annotated PDF both act on
// this same parsed document), where every prior caller only needed the DOM
// result and let pdf/page go out of scope on return.
async function renderPagesInto(container, pdfBytes) {
  const pdfjsLib = await ensurePdfjs();
  const pdfDocument = await pdfjsLib.getDocument({ data: pdfBytes }).promise;
  container.innerHTML = '';
  const scale = 1.5;
  const pages = [];
  for (let pageNum = 1; pageNum <= pdfDocument.numPages; pageNum++) {
    const page = await pdfDocument.getPage(pageNum);
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
    pages.push({ pageIndex: pageNum - 1, page, viewport, pageWrap });
  }
  return { pdfjsLib, pdfDocument, pages };
}

function refreshPreviewPager() {
  // The router attempts pager initialization before the asynchronous PDF is
  // available. Refresh only after pdf.js has rendered the finalized bytes so
  // its page count is the same count the user will save or print.
  if (typeof window.initPrintPager === 'function') window.initPrintPager({ refresh: true });
}

// buildModel(D) must be the exact same model builder doSavePdf() for that
// feature uses, so preview and
// Save-as-PDF can never diverge again by construction (this is also the
// fix for the signature-style-radio/preview divergence
// MILESTONE-19-3-PROPOSAL.md called out).
//
// baseIssues must be the same validateX()+getSupplementalFilingIssues()
// combination each feature's own doSavePdf()/doSaveDocx() already passes to
// prepareFilingOutput() (Milestone 34-1A, Item 1) -- omitting it here used
// to mean the embedded preview could render a filing clean while the print
// page's own banner blocked export for the exact same missing fields, since
// prepareFilingOutput()'s `structuredIssues` never carries the caller's
// baseIssues at all (only draft/identity issues do); checking `canExport`
// (which does fold baseIssues in, via `messages`) is what actually wires
// this argument in, not just adding it.
// A blocked filing can carry fifty-odd messages, and printing them as one
// run-on paragraph is what the banner used to do. Every message is shaped
// "<section> — <detail>", so the section is the natural grouping key, and the
// leading token of it collapses "D-2 Preparer" and "D-2 Attorney" onto the one
// schedule the filer would actually navigate to.
function groupPreflightMessages(messages) {
  const groups = new Map();
  for (const raw of messages) {
    const text = String(raw).trim();
    const dash = text.indexOf('—');
    const section = dash > 0 ? text.slice(0, dash).trim() : '';
    const detail = dash > 0 ? text.slice(dash + 1).trim() : text;
    const key = section ? section.split(/\s+/)[0] : 'General';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(section && section !== key ? `${section.slice(key.length).trim()} — ${detail}` : detail);
  }
  return groups;
}

function blockedPanelHTML(messages) {
  const groups = groupPreflightMessages(messages);
  const total = messages.length;
  // A section with one item reads better on the section's own line than as a
  // one-entry nested list -- and most of a blank filing's sections are exactly
  // that, one schedule needing an entry or the verified-empty box.
  const items = [...groups.entries()].map(([section, details]) => `<li class="pdf-preview-blocked-group">
    <span class="pdf-preview-blocked-section">${escapeHtml(section)}</span>
    <span class="pdf-preview-blocked-count">${details.length}</span>
    ${details.length === 1
      ? `<span class="pdf-preview-blocked-single">${escapeHtml(details[0])}</span>`
      : `<ul>${details.map((d) => `<li>${escapeHtml(d)}</li>`).join('')}</ul>`}
  </li>`).join('');
  return `<div class="pdf-preview-blocked no-print">
    <p class="pdf-preview-blocked-title">Preview blocked</p>
    <p class="pdf-preview-blocked-summary">${total} required item${total === 1 ? '' : 's'} still missing, across ${groups.size} section${groups.size === 1 ? '' : 's'}.</p>
    <div class="pdf-preview-blocked-actions">
      <button type="button" class="btn btn-sm btn-outline-secondary" data-preview-action="override">Continue despite outstanding requirements</button>
    </div>
    <details class="pdf-preview-blocked-details">
      <summary>Show what is missing</summary>
      <ul class="pdf-preview-blocked-list">${items}</ul>
    </details>
  </div>`;
}

async function renderPreviewInto(container, buildModel, D, options = {}) {
  announceStatus('Generating preview…', { containerId: 'print-preview-status' });
  container.innerHTML = '<p class="pdf-preview-loading no-print" style="padding:2rem;text-align:center;color:var(--ink-3);">Generating preview…</p>';
  destroyAnnotationSession();
  try {
    const model = buildModel(D);
    const doc = await generateCourtFormPdf(model);
    const finalizedBytes = await finalizeCourtFormPdf(doc);

    // Milestone 39-A "Persistence design": fingerprint the fresh,
    // *unannotated* regenerated content -- this is what drift is measured
    // against, since that's what can silently change between sessions. A
    // lightweight parse (no canvas render) just for the fingerprint, kept
    // separate from the real render below so a fingerprint mismatch never
    // costs a second full page-render pass.
    let bytesToRender = finalizedBytes;
    let fingerprint = null;
    if (options.annotate) {
      const pdfjsLib = await ensurePdfjs();
      // No .destroy() here: PDFDocumentProxy doesn't have one (it lives on
      // the loading task getDocument() returns, which this discards along
      // with its .promise) -- matching renderPagesInto()'s own existing
      // pattern of never destroying a parsed document, just letting it go
      // out of scope. getDocument({data}) transfers the buffer to the
      // worker (detaching it) rather than copying it -- confirmed the hard
      // way, this must run against a copy of finalizedBytes, never the
      // original, since renderPagesInto() below still needs an intact
      // buffer when bytesToRender ends up being finalizedBytes itself.
      const freshDoc = await pdfjsLib.getDocument({ data: finalizedBytes.slice() }).promise;
      fingerprint = await computeContentFingerprint(freshDoc);
      const stored = D.printAnnotations;
      if (stored && stored.contentFingerprint === fingerprint && stored.pdfBytes) {
        bytesToRender = base64ToBytes(stored.pdfBytes);
      } else if (stored) {
        delete D.printAnnotations;
        window.markDirtySinceExport?.();
        window.autoSave?.();
        announceStatus('This filing changed since your saved annotations were made, so they were discarded.', { priority: 'assertive', containerId: 'print-preview-status' });
      }
    }

    const { pdfjsLib, pdfDocument, pages } = await renderPagesInto(container, bytesToRender);

    if (options.annotate) {
      const session = new AnnotationSession(pdfjsLib, container, pdfDocument);
      for (const { pageIndex, page, viewport, pageWrap } of pages) {
        await session.addPage(pageIndex, page, viewport, pageWrap);
      }
      _annotationSession = session;
      mountAnnotateToolbar(container, session, pdfjsLib, D, fingerprint);
    }

    refreshPreviewPager();
    announceStatus('Preview ready.', { containerId: 'print-preview-status' });
  } catch (e) {
    destroyAnnotationSession();
    console.error('PDF preview render failed', e);
    const isChunkError = /dynamically imported module|Failed to fetch|central directory/i.test(e?.message || '');
    const userMsg = isChunkError
      ? 'A new version of Probate Guardian was deployed. Please reload the page to load updated assets.'
      : `Preview failed to render: ${escapeHtml(e.message)}`;
    const actionBtn = isChunkError
      ? `<br/><button type="button" class="btn btn-sm btn-primary mt-3" onclick="window.location.reload()">Reload Page</button>`
      : '';
    announceStatus(userMsg, { priority: 'assertive', containerId: 'print-preview-status' });
    container.innerHTML = `<div class="pdf-preview-error no-print" style="padding:2rem;text-align:center;color:var(--danger-text);"><p>${userMsg}</p>${actionBtn}</div>`;
  }
}

// options.annotate: Milestone 39-A's per-filing-type gate -- opt-in only,
// so the shared preview stays a fork-free single module while only the
// pilot (Simplified Annual Plan) mounts the annotation editor.
export async function mountPdfPreview(buildModel, D, baseIssues = [], containerId = 'print-doc-container', options = {}) {
  const container = document.getElementById(containerId);
  if (!container) return;
  beginFreshPreview();
  destroyAnnotationSession();
  const authorization = authorizeFilingOutput(D, baseIssues, { capability: 'preview' });
  if (authorization.status !== 'allowed') {
    // Announce the count, not the list -- an assertive region reading fifty
    // items aloud is worse than useless. The list is on the page to be read.
    announceStatus(`Preview is blocked. ${authorization.issues.length} required items are still missing.`, { priority: 'assertive', containerId: 'print-preview-status' });
    container.innerHTML = blockedPanelHTML(authorization.issues.map(issue => issue.message));
    container.querySelector('[data-preview-action="override"]')
      ?.addEventListener('click', () => {
        if (authorization.status === 'blocked') return;
        if (!window.confirm('Requirements remain outstanding. Continue with ordinary preview and output?')) return;
        if (acknowledgeOutstandingRequirements(D, baseIssues)) {
          document.querySelectorAll('[data-form-action*="save"], [data-simplified-action^="save"], [data-annual-action^="save"], [data-inventory-action^="save"]').forEach((control) => {
            // Format-capacity controls carry their own explicit explanation and
            // remain unavailable because their output would omit data.
            if (!String(control.title || '').toLowerCase().includes('template can hold')) control.disabled = false;
          });
          void renderPreviewInto(container, buildModel, D, options);
        }
      });
    return;
  }
  await renderPreviewInto(container, buildModel, D, options);
}

// Print: opens the same generated PDF blob and lets the browser/OS PDF
// print dialog handle it, instead of window.print() on the live app DOM.
// A same-origin blob: opened as a top-level navigation (window.open, not
// an <iframe>/<object> embed) needs no CSP change -- object-src 'none' and
// the missing frame-src only govern embedding, not top-level navigation --
// and it structurally can't repeat the .mobile-topbar-overlay bug class,
// since the new tab never contains any app chrome to begin with.
export async function printGeneratedPdf(buildModel, D, baseIssues = []) {
  try {
    const preflight = prepareFilingOutput(D, baseIssues);
    if (!preflight.canExport) {
      // The full list belongs on the Print Preview panel, which groups it and
      // can be read at leisure. An alert box holding fifty sentences cannot.
      const count = preflight.messages.length;
      alert(`Cannot print: ${count} required item${count === 1 ? '' : 's'} still missing. Open Print Preview to see what they are.`);
      return;
    }
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
