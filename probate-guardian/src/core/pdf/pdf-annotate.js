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
  constructor(pdfjsLib, container, pdfDocument, scale) {
    this.pdfjsLib = pdfjsLib;
    this.pdfDocument = pdfDocument;
    this.eventBus = new MiniEventBus();
    // viewerAlert, altTextManager, commentManager, signatureManager,
    // pageColors, mlManager, editorUndoBar are all safe as null --
    // confirmed directly against the constructor (pdf.mjs:2694): every one
    // of them is only ever dereferenced with optional chaining
    // (`altTextManager?.destroy()`, `mlManager || null`, etc.) or not at all
    // on the FreeText/Highlight path this integration uses.
    //
    // highlightColors is NOT one of those -- this was wrongly grouped in
    // with them and passed null, confirmed live to throw. It isn't a Map;
    // the _highlightColors getter (pdf.mjs:2803) parses it as a
    // "name=color,name=color" STRING. getNonHCMColorName() (pdf.mjs:2841),
    // called from every new Highlight editor's telemetryInitialData getter
    // via add() (pdf.mjs:27159), has no null guard the way its neighbor
    // getNonHCMColor() does -- a null here means this.highlightColorNames
    // is null, and .get() on null threw "Cannot read properties of null
    // (reading 'get')" for every highlight, uncaught, right after it was
    // otherwise successfully created. Real pdf.js's own default palette
    // (AppOptions.highlightEditorColors, web/pdf_viewer.mjs), unchanged --
    // no color-picker UI exists here to justify a different one.
    const highlightColors = 'yellow=#FFFF98,green=#53FFBC,blue=#80EBFF,pink=#FFCBE6,red=#FF4F5F,'
      + 'yellow_HCM=#FFFFCC,green_HCM=#53FFBC,blue_HCM=#80EBFF,pink_HCM=#F6B8FF,red_HCM=#C50043';
    this.uiManager = new pdfjsLib.AnnotationEditorUIManager(
      container, container, null, null, null, null,
      this.eventBus, pdfDocument, null, highlightColors,
      false, false, false, null, null, false
    );
    // The constructor defaults viewParameters.realScale to
    // PixelsPerInch.PDF_TO_CSS_UNITS (96/72 ~= 1.333, pdf.mjs:2742) and only
    // ever updates it from a "scalechanging" event (pdf.mjs:3001) that a full
    // PDFViewer dispatches on every zoom -- this integration has no such
    // viewer and never fired one, so it stayed stuck at that default forever
    // regardless of the scale actually used to render the page (1.5, passed
    // in from renderPagesInto()). AnnotationEditor's own constructor divides
    // a new editor's raw click coordinates by parentDimensions
    // (pageWidth-in-points * realScale, pdf.mjs:5564-5569) to normalize them
    // into the [0,1] fraction fixAndSetPosition() later renders as a CSS
    // left/top percentage of the *actual* (1.5-scaled) layer div -- so every
    // stuck-at-1.333 normalization was denominated in a canvas ~12% smaller
    // than the real one, throwing off every placement by that fixed ratio
    // compounded with whatever the click position was, visible as new notes
    // and highlights landing away from the click instead of at it. Setting
    // this directly (rather than reverse-solving a fake "scalechanging"
    // payload through the *1.333 the handler itself applies) keeps the one
    // real rendering scale as the single source of truth.
    this.uiManager.viewParameters.realScale = scale;
    this.layers = new Map();
  }

  async addPage(pageIndex, page, viewport, pageWrap, textLayerDiv) {
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
      // AnnotationEditorLayer only ever reads textLayer.div (enableTextSelection()/
      // #textLayerPointerDown(), pdf.mjs:27050-27082) -- not a pdfjsLib.TextLayer
      // instance, which doesn't even expose one (it keeps its container in a
      // private #container field). A plain { div } wrapper around the real
      // text layer div renderPagesInto() already built is all it looks at.
      // This was hardcoded null before, which made enableTextSelection() a
      // silent no-op: no pointerdown listener was ever attached anywhere, so
      // Highlight mode had no way to start a selection-driven highlight at all.
      textLayer: textLayerDiv ? { div: textLayerDiv } : null,
      // A real DrawLayer, not null. HighlightEditor extends DrawingEditor,
      // whose _addOutlines() unconditionally calls parent.drawLayer.draw(...)
      // (pdf.mjs:21965/21973) to render the highlight as an SVG path -- with
      // drawLayer null this threw "Cannot read properties of null (reading
      // 'draw')" for every single highlight, inside pdf.js's own
      // highlightSelection(), uncaught and silent to the filer (no visible
      // error, just no highlight). Confirmed live: fixing textLayer alone
      // (above) makes a real text selection reach highlightSelection() at
      // all, but this is what lets it finish without throwing. Constructed
      // and wired exactly like web/draw_layer_builder.js's
      // DrawLayerBuilder.render()+setParent(canvasWrapper) (reference only,
      // not vendored): setParent's target is the page wrapper, not this
      // narrower annotationEditorLayer div, because DrawLayer.destroy() only
      // removes the SVG roots it created and never removes itself.
      drawLayer: (() => {
        const dl = new this.pdfjsLib.DrawLayer({ pageIndex, textLayer: textLayerDiv || null });
        dl.setParent(pageWrap);
        return dl;
      })(),
    });
    await layer.render({ viewport: clonedViewport, div, annotations: null, intent: 'display' });
    this.layers.set(pageIndex, { layer, div, drawLayer: layer.drawLayer });
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
    for (const { layer, drawLayer } of this.layers.values()) {
      layer.destroy();
      drawLayer?.destroy();
    }
    this.layers.clear();
    this.uiManager.destroy();
  }
}
