// Milestone 39-A spike: pdf.js AnnotationEditorLayer integration for Print
// Preview (FreeText + Highlight only). This app vendors only pdf.js's core
// build (lib/pdfjs/pdf.mjs), not pdfjs-dist's web/ viewer layer -- so the
// small collaborators that layer normally supplies (EventBus, an l10n
// service) don't exist here and are reimplemented below at the minimum
// surface AnnotationEditorUIManager/AnnotationEditorLayer actually call,
// confirmed directly against the vendored 6.3.289 source (see
// MILESTONE-39-PROPOSAL.md's 39-A "Technical gaps" and "Persistence design"
// sections for what was verified and why).

// Faithful port of pdf.js's own EventBus (web/pdf_viewer.mjs): on/off with
// AbortSignal-based cleanup, dispatch in registration order. The upstream
// class also fast-paths "internal" listeners ahead of external ones; that
// distinction requires a private symbol only pdf.js's own bundle can
// produce, so it's a listener-ordering nicety this port doesn't attempt --
// not something AnnotationEditorUIManager's own correctness depends on.
export class MiniEventBus {
  #listeners = new Map();
  on(eventName, listener, options = null) {
    let rmAbort = null;
    if (options?.signal instanceof AbortSignal) {
      const { signal } = options;
      if (signal.aborted) return;
      const onAbort = () => this.off(eventName, listener);
      rmAbort = () => signal.removeEventListener('abort', onAbort);
      signal.addEventListener('abort', onAbort);
    }
    if (!this.#listeners.has(eventName)) this.#listeners.set(eventName, new Set());
    this.#listeners.get(eventName).add({ listener, once: options?.once === true, rmAbort });
  }
  off(eventName, listener) {
    const set = this.#listeners.get(eventName);
    const entry = set && [...set].find((e) => e.listener === listener);
    if (entry) {
      entry.rmAbort?.();
      set.delete(entry);
    }
  }
  dispatch(eventName, data) {
    const set = this.#listeners.get(eventName);
    if (!set || set.size === 0) return;
    for (const entry of [...set]) {
      if (entry.once) this.off(eventName, entry.listener);
      entry.listener(data);
    }
  }
}

// Confirmed by grepping the vendored core build: nothing in the
// FreeText/Highlight path calls l10n.get() -- only the alt-text flow does
// (AltText._l10n.get(...)), which this integration never reaches because
// altTextManager is passed null below. This stub exists only so an
// unexpected defensive call doesn't throw.
export const nullL10n = { get: async (key, args, fallback) => fallback ?? '' };

// Drift-detection fingerprint for the "Persistence design" section: hashes
// page count plus every page's extracted text. Deliberately not
// cryptographic -- this only needs to notice that the underlying filing
// content changed since a stored annotation set was captured, not resist
// tampering. Exported standalone (no pdfjsLib/session dependency) so it can
// be unit-tested directly against a fake pdfDocument.
export async function computeContentFingerprint(pdfDocument) {
  let acc = 0x811c9dc5;
  const mix = (str) => {
    for (let i = 0; i < str.length; i++) {
      acc ^= str.charCodeAt(i);
      acc = Math.imul(acc, 0x01000193);
    }
  };
  mix(`pages:${pdfDocument.numPages}`);
  for (let pageNum = 1; pageNum <= pdfDocument.numPages; pageNum++) {
    const page = await pdfDocument.getPage(pageNum);
    const content = await page.getTextContent();
    mix(content.items.map((item) => item.str).join(''));
  }
  return (acc >>> 0).toString(16);
}

// Owns one Print Preview's annotation-editor lifecycle: one UIManager shared
// across every rendered page's own AnnotationEditorLayer, matching how
// pdf.js's own multi-page viewer wires this (confirmed via
// node_modules/pdfjs-dist/web/pdf_viewer.mjs's AnnotationEditorLayerBuilder
// and PDFViewer -- reference source only, not vendored/shipped).
export class AnnotationSession {
  constructor(pdfjsLib, container, pdfDocument) {
    this.pdfjsLib = pdfjsLib;
    this.pdfDocument = pdfDocument;
    this.eventBus = new MiniEventBus();
    // viewerAlert, altTextManager, commentManager, signatureManager,
    // pageColors, highlightColors, mlManager, editorUndoBar are all safe as
    // null -- confirmed directly against the constructor (pdf.mjs:2694):
    // every one of them is only ever dereferenced with optional chaining
    // (`altTextManager?.destroy()`, `mlManager || null`, etc.) or not at all
    // on the FreeText/Highlight path this integration uses.
    this.uiManager = new pdfjsLib.AnnotationEditorUIManager(
      container, container, null, null, null, null,
      this.eventBus, pdfDocument, null, null,
      false, false, false, null, null, false
    );
    this.layers = new Map();
  }

  async addPage(pageIndex, page, viewport, pageWrap) {
    const div = document.createElement('div');
    div.className = 'annotationEditorLayer';
    div.style.width = `${viewport.width}px`;
    div.style.height = `${viewport.height}px`;
    pageWrap.appendChild(div);
    const clonedViewport = viewport.clone({ dontFlip: true });
    const layer = new this.pdfjsLib.AnnotationEditorLayer({
      uiManager: this.uiManager,
      div,
      structTreeLayer: null,
      accessibilityManager: null,
      pageIndex,
      l10n: nullL10n,
      viewport: clonedViewport,
      annotationLayer: null,
      textLayer: null,
      drawLayer: null,
    });
    await layer.render({ viewport: clonedViewport, div, annotations: null, intent: 'display' });
    this.layers.set(pageIndex, { layer, div });
  }

  setMode(mode) {
    this.uiManager.updateMode(mode);
  }

  undo() {
    this.uiManager.undo();
  }

  clearAll() {
    this.uiManager.selectAll();
    this.uiManager.delete();
  }

  isEmpty() {
    return this.pdfDocument.annotationStorage.size === 0;
  }

  async saveAnnotatedBytes() {
    return this.pdfDocument.saveDocument();
  }

  destroy() {
    this.setMode(this.pdfjsLib.AnnotationEditorType.NONE);
    for (const { layer } of this.layers.values()) layer.destroy();
    this.layers.clear();
    this.uiManager.destroy();
  }
}
