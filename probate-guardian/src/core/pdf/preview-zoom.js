// Milestone 73R part 3 (R3): Print Preview at the size the filer wants --
// "Fit height" (a whole page in the window) or "Full width" (the page across
// the window), beside Prev / Next, remembered on this device (decision 73R-5's
// companion: a UI preference, so localStorage, never the case file -- AGENTS.md
// section 6). Neither pressed is the size the Preview always had (1.5x).
//
// Every page used to be drawn at once, at 1.5x, with no allowance for a
// high-resolution screen. Now (Codex's requirements, the proposal's design):
//   - Lazy: only the pages on screen and one either side are drawn; others
//     are drawn as they scroll into view and released when far away. While
//     no page is on screen yet (a long review list above the Preview), the
//     first page shown and the next are drawn ahead. Every page keeps its
//     box, its text layer and its notes layer, so scrolling, selecting text
//     and the notes are unchanged.
//   - Capped: a page's canvas is drawn at the screen's pixel ratio, lowered
//     first when the canvas would pass its cap -- 16 million pixels at most
//     (below iOS Safari's canvas limit), and a quarter of what drawing every
//     page at 1.5x used to take. At most four pages are drawn at once, so a
//     long filing never holds more canvas than it did.
//   - Cancelled: a size change cancels draws still running before new ones
//     start.
//   - Notes kept (decision 73R-5): the notes layer is re-scaled in place,
//     as pdf.js's own viewer does, so unsaved notes stay and are redrawn at
//     the new size -- nothing is saved or re-read to do it.
const STORE_KEY = 'pg-preview-zoom-v1';
export const BASE_SCALE = 1.5;
export const MAX_CANVAS_PIXELS = 16_000_000;
export const MAX_DRAWN_PAGES = 4;
const MODES = new Set(['actual', 'fit-height', 'full-width']);

/** The remembered size: 'actual' (as always), 'fit-height' or 'full-width'. */
export function storedZoomMode() {
  try {
    const value = localStorage.getItem(STORE_KEY);
    return MODES.has(value) ? value : 'actual';
  } catch {
    return 'actual';
  }
}

function storeZoomMode(mode) {
  try { localStorage.setItem(STORE_KEY, mode); } catch { /* a private window: not remembered */ }
}

/** One page's canvas area at 1.5x, as the Preview drew every page before. */
export function pageAreaAtBase(widthPt, heightPt) {
  return Math.round(widthPt * BASE_SCALE) * Math.round(heightPt * BASE_SCALE);
}

/**
 * The most pixels one canvas may hold: 16 million, and a quarter of what
 * drawing every page at 1.5x took (at most four pages are drawn at once), but
 * never less than four times one page at 1.5x -- one page at 1.5x on a
 * screen of pixel ratio 2 -- so a short filing is still drawn sharp.
 * @param {number} pageCount
 * @param {number} baseArea one page's area at 1.5x
 */
export function canvasCap(pageCount, baseArea) {
  return Math.min(MAX_CANVAS_PIXELS, Math.max(4 * baseArea, (pageCount * baseArea) / MAX_DRAWN_PAGES));
}

/**
 * Pixels per CSS pixel for a canvas of `cssWidth` x `cssHeight`: the screen's
 * ratio, lowered until the canvas fits `cap`; below 1 only when even one
 * pixel per CSS pixel would not fit.
 */
export function canvasRatio(cssWidth, cssHeight, devicePixelRatio, cap) {
  const want = Math.max(1, devicePixelRatio || 1);
  const area = cssWidth * cssHeight;
  if (area * want * want <= cap) return want;
  return Math.sqrt(cap / area);
}

/** The scale for `mode`, for a page `widthPt` x `heightPt` in `container`. */
export function scaleFor(mode, widthPt, heightPt, container) {
  if (mode === 'full-width') {
    const avail = Math.max(200, (container?.clientWidth || 0) - 4);
    return Math.min(8, avail / widthPt);
  }
  if (mode === 'fit-height') {
    // Prev / Next scroll a page to 6.5rem (104px) below the top -- the
    // Preview's scroll margin, which clears the sticky bar -- so a whole page
    // fits between there and 24px above the window's bottom edge.
    const main = typeof document !== 'undefined' ? document.getElementById('main-content') : null;
    const bar = typeof document !== 'undefined' ? document.getElementById('pv-bar') : null;
    const height = main?.clientHeight || (typeof window !== 'undefined' ? window.innerHeight : 800);
    // Anything above the page inside the Preview (the notes toolbar) scrolls with it.
    const page = container?.querySelector('.pdf-page.pv-show') || container?.querySelector('.pdf-page');
    const lead = page && container ? Math.max(0, page.getBoundingClientRect().top - container.getBoundingClientRect().top) : 0;
    const avail = Math.max(200, height - Math.max(104, (bar?.offsetHeight || 0) + 20) - lead - 24);
    return Math.min(8, avail / heightPt);
  }
  return BASE_SCALE;
}

let current = null;

/** The Preview on screen, for the bar's buttons and the tests. */
export function currentPreview() {
  return current;
}

/**
 * The pages of one Preview, drawn lazily at the chosen size.
 * Each entry: { page (pdf.js), wrap, canvas, textLayer }.
 */
export class PreviewPages {
  constructor(container, entries, { mode = storedZoomMode(), scale = BASE_SCALE, annotations = null } = {}) {
    this.container = container;
    this.entries = entries.map((e, index) => ({ ...e, index, task: null, drawing: null, drawnScale: null }));
    this.holdAll = false;
    this.mode = mode;
    this.scale = scale;
    this.annotations = annotations;
    const first = this.entries[0]?.page.getViewport({ scale: 1 });
    this.cap = canvasCap(this.entries.length, first ? pageAreaAtBase(first.width, first.height) : 1);
    this.visible = new Set();
    this.observer = typeof IntersectionObserver === 'function'
      ? new IntersectionObserver((records) => this.#onIntersect(records), { root: null, threshold: 0 })
      : null;
    for (const entry of this.entries) {
      entry.wrap.dataset.pageIndex = String(entry.index);
      this.observer?.observe(entry.wrap);
    }
    this.onResize = () => {
      // The filer left the Preview: nothing on screen to resize.
      if (!this.container.isConnected) { this.destroy(); return; }
      clearTimeout(this.resizeTimer);
      this.resizeTimer = setTimeout(() => { if (this.mode !== 'actual') this.applyMode(this.mode, { remember: false }); }, 150);
    };
    if (typeof window !== 'undefined') window.addEventListener('resize', this.onResize);
    current?.destroy();
    current = this;
    if (!this.observer) this.entries.forEach((e) => this.#draw(e));
  }

  /** Change the size: 'actual', 'fit-height' or 'full-width'. */
  applyMode(mode, { remember = true } = {}) {
    this.mode = MODES.has(mode) ? mode : 'actual';
    if (remember) storeZoomMode(this.mode);
    this.container.classList.toggle('pv-zoom-full-width', this.mode === 'full-width');
    const first = this.entries[0]?.page.getViewport({ scale: 1 });
    if (!first) return;
    this.setScale(scaleFor(this.mode, first.width, first.height, this.container));
  }

  setScale(scale) {
    if (Math.abs(scale - this.scale) < 0.001) { this.refresh(); return; }
    this.scale = scale;
    // Cancel what is still drawing, then size every box (and its text and
    // notes) for the new scale; the canvases redraw as they are needed.
    for (const entry of this.entries) this.#release(entry);
    const viewports = new Map();
    for (const entry of this.entries) {
      const viewport = entry.page.getViewport({ scale });
      viewports.set(entry.index, viewport);
      entry.wrap.style.width = `${viewport.width}px`;
      entry.wrap.style.height = `${viewport.height}px`;
      entry.wrap.style.setProperty('--total-scale-factor', String(scale));
      entry.canvas.style.width = `${viewport.width}px`;
      entry.canvas.style.height = `${viewport.height}px`;
      entry.textLayer?.update({ viewport });
    }
    this.annotations?.rescale(scale, viewports);
    this.refresh();
  }

  /**
   * The pages to draw: those on screen and the one after and before them, at
   * most four -- the next page before the previous one.
   */
  #wanted() {
    const visible = [...this.visible].sort((a, b) => a - b);
    if (!visible.length) {
      // Nothing on screen yet: the page the Preview shows first, and the next.
      const shown = this.entries.findIndex((e) => e.wrap.classList.contains('pv-show'));
      const first = this.container.classList.contains('pv-single') && shown >= 0 ? shown : 0;
      return new Set([first, first + 1].filter((k) => k < this.entries.length));
    }
    const want = new Set(visible.slice(0, MAX_DRAWN_PAGES));
    for (const k of [visible[visible.length - 1] + 1, visible[0] - 1]) {
      if (want.size < MAX_DRAWN_PAGES && k >= 0 && k < this.entries.length) want.add(k);
    }
    return want;
  }

  /** Release what is not wanted, then draw what is. */
  refresh() {
    if (this.holdAll) { this.entries.forEach((e) => { void this.#draw(e); }); return; }
    const want = this.#wanted();
    for (const entry of this.entries) if (!want.has(entry.index)) this.#release(entry);
    for (const index of want) void this.#draw(this.entries[index]);
  }

  #onIntersect(records) {
    for (const record of records) {
      const index = Number(record.target.dataset.pageIndex);
      if (record.isIntersecting) this.visible.add(index);
      else this.visible.delete(index);
    }
    this.refresh();
  }

  #draw(entry) {
    if (entry.drawnScale === this.scale) return Promise.resolve();
    if (entry.drawing) return entry.drawing;
    entry.drawing = this.#drawOnce(entry).finally(() => { entry.drawing = null; });
    return entry.drawing;
  }

  async #drawOnce(entry) {
    const scale = this.scale;
    const viewport = entry.page.getViewport({ scale });
    const ratio = canvasRatio(viewport.width, viewport.height, typeof window !== 'undefined' ? window.devicePixelRatio : 1, this.cap);
    const canvas = entry.canvas;
    canvas.width = Math.floor(viewport.width * ratio);
    canvas.height = Math.floor(viewport.height * ratio);
    canvas.style.width = `${viewport.width}px`;
    canvas.style.height = `${viewport.height}px`;
    const task = entry.page.render({
      canvasContext: canvas.getContext('2d'),
      canvas,
      viewport,
      transform: ratio === 1 ? undefined : [ratio, 0, 0, ratio, 0, 0],
    });
    entry.task = task;
    try {
      await task.promise;
      if (this.scale === scale) {
        entry.drawnScale = scale;
        entry.wrap.dataset.drawnScale = String(scale);
      }
    } catch (e) {
      if (e?.name !== 'RenderingCancelledException') console.error('Preview page draw failed', e);
    } finally {
      if (entry.task === task) entry.task = null;
    }
    // A size change while this drew: draw again at the new size if still wanted.
    if (this.scale !== scale && (this.holdAll || this.#wanted().has(entry.index))) {
      queueMicrotask(() => { void this.#draw(entry); });
    }
  }

  #release(entry) {
    entry.task?.cancel();
    entry.task = null;
    entry.drawnScale = null;
    delete entry.wrap.dataset.drawnScale;
    entry.canvas.width = 0;
    entry.canvas.height = 0;
  }

  /**
   * The browser tests that read ink off every page (the right-margin checks):
   * draw every page at the current size and keep them drawn. A filer's
   * Preview never does this.
   */
  async drawAll() {
    this.holdAll = true;
    await Promise.all(this.entries.map((e) => this.#draw(e)));
  }

  /** What the browser tests check: the size, and whether drawing has caught up. */
  state() {
    return {
      mode: this.mode,
      scale: this.scale,
      cap: this.cap,
      settled: this.settled(),
      pages: this.entries.length,
      drawn: this.entries.filter((e) => e.drawnScale === this.scale).length,
      drawing: this.entries.filter((e) => e.drawing).length,
      onScreen: [...this.visible].sort((x, y) => x - y),
      connected: this.container.isConnected && this.entries.every((e) => e.wrap.isConnected),
    };
  }

  /** Every page that should be drawn now is drawn at the current size. */
  settled() {
    if (this.holdAll) return this.entries.every((e) => e.drawnScale === this.scale);
    const want = this.#wanted();
    return want.size > 0 && [...want].every((i) => this.entries[i].drawnScale === this.scale);
  }

  destroy() {
    this.observer?.disconnect();
    if (typeof window !== 'undefined') window.removeEventListener('resize', this.onResize);
    clearTimeout(this.resizeTimer);
    for (const entry of this.entries) entry.task?.cancel();
    if (current === this) current = null;
  }
}

/** The pager showed another page: draw it (and the next) if nothing is on screen. */
export function refreshPreviewPages() {
  if (current?.container.isConnected) current.refresh();
}

/** The bar's buttons: pressing the chosen size again returns to the usual one. */
export function togglePreviewZoom(mode) {
  if (!current?.container.isConnected) return;
  current.applyMode(current.mode === mode ? 'actual' : mode);
  syncZoomButtons();
}

/** aria-pressed on the bar's two buttons follows the size on screen. */
export function syncZoomButtons() {
  if (typeof document === 'undefined') return;
  const mode = current?.mode || storedZoomMode();
  for (const button of document.querySelectorAll('[data-form-action="preview-zoom"]')) {
    button.setAttribute('aria-pressed', String(button.getAttribute('data-zoom') === mode));
  }
}
