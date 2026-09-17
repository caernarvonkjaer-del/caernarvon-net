// Milestone 39-B: plain HTML5 canvas signature capture. Deliberately not
// pdf.js's SignatureEditor -- see MILESTONE-39-PROPOSAL.md's "Capture
// mechanism" section for why (mounting risk: that widget is built as part
// of pdf.js's rendered-page machinery, with no equivalent for a bare form
// card). This produces the same base64 PNG output via
// canvas.toDataURL('image/png') with none of that dependency, and is meant
// to be reused verbatim by every future role/card 39-C adds -- nothing here
// is Guardian- or Plan-Simplified-specific.
import { readPngDimensions, base64ToBytes } from '../images/png-dimensions.js';

export { readPngDimensions };

// "Maximum width, measured, not guessed" (MILESTONE-39-PROPOSAL.md 39-B):
// pdf-engine.js's real signature line is margin+2 to margin+250 (248pt,
// 3.44in). At 300 DPI that's ~1,030px; 1024 is this capture widget's cap.
export const MAX_SIGNATURE_WIDTH_PX = 1024;
export const MAX_SIGNATURE_HEIGHT_PX = 341; // 1024px / 3, the narrow end of the doc's "roughly 3:1 to 4:1" aspect-ratio guidance
export const MAX_SIGNATURE_FILE_SIZE_BYTES = 100 * 1024; // "tens of KB is more than sufficient for a compressed PNG at that size"

const PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

/**
 * A blank canvas (nothing drawn, nothing typed, Clear was pressed, or a
 * genuine pointer-event failure produced zero strokes) still encodes to a
 * normal-looking, well-formed, multi-KB transparent PNG -- format, size, and
 * width checks (validateSignatureImage(), above) all pass it regardless.
 * Pure and DOM-free like removeLightBackground() above, so it is
 * unit-testable directly against plain arrays; canvasHasVisibleContent()
 * below is the thin canvas-reading wrapper an apply handler actually calls.
 * Returns true on the first non-transparent pixel found, so a large canvas
 * with any real ink still exits fast.
 */
export function hasVisibleContent(pixels) {
  for (let i = 3; i < pixels.length; i += 4) {
    if (pixels[i] !== 0) return true;
  }
  return false;
}

/** Scans the live canvas's alpha channel directly, rather than re-decoding
 * the exported PNG bytes, since the caller already holds the canvas at the
 * moment "Apply" is clicked. */
export function canvasHasVisibleContent(canvas) {
  const ctx = canvas.getContext('2d');
  return hasVisibleContent(ctx.getImageData(0, 0, canvas.width, canvas.height).data);
}

/**
 * Content validation for a captured/uploaded signature image (Milestone
 * 39-B "Data safety: image limits"): real PNG magic bytes, not just a
 * `.png` extension or a declared MIME type; a maximum pixel width; a
 * maximum file size. Returns `{ valid, error }` -- never throws, since this
 * runs on a value about to be shown back to the filer as a validation
 * message, not logged for a developer.
 */
export function validateSignatureImage(dataUrl) {
  if (typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image/png;base64,')) {
    return { valid: false, error: 'Signature image must be a PNG.' };
  }
  const base64 = dataUrl.slice('data:image/png;base64,'.length);
  let bytes;
  try {
    bytes = base64ToBytes(base64);
  } catch {
    return { valid: false, error: 'Signature image data is corrupt.' };
  }
  if (bytes.length > MAX_SIGNATURE_FILE_SIZE_BYTES) {
    return { valid: false, error: `Signature image is too large (${Math.round(bytes.length / 1024)}KB; maximum ${Math.round(MAX_SIGNATURE_FILE_SIZE_BYTES / 1024)}KB).` };
  }
  if (!PNG_MAGIC.every((b, i) => bytes[i] === b)) {
    return { valid: false, error: 'Signature image is not a valid PNG (failed content check).' };
  }
  const dims = readPngDimensions(bytes);
  if (!dims) return { valid: false, error: 'Signature image is corrupt (missing PNG header).' };
  if (dims.width > MAX_SIGNATURE_WIDTH_PX) {
    return { valid: false, error: `Signature image is too wide (${dims.width}px; maximum ${MAX_SIGNATURE_WIDTH_PX}px).` };
  }
  return { valid: true, error: null, width: dims.width, height: dims.height };
}

// Milestone 39-C: "Upload background-transparency gate" -- resolved as a
// bounded, client-side luminance-threshold heuristic (MILESTONE-39-PROPOSAL.md
// "Upload background-transparency gate"). Any pixel at or above the
// threshold is treated as background and dropped to alpha 0; anything
// darker (the actual ink) is left untouched. This is deliberately a
// heuristic, not real segmentation, and has known, accepted limits: a
// colored or textured background, low-contrast ink close to the threshold,
// or a shadow gradient across the page can all produce a partially-removed
// or partially-kept background. See tests/unit/signature-capture.spec.js
// for the exact scenarios this was tuned and verified against.
export const DEFAULT_BACKGROUND_LUMINANCE_THRESHOLD = 200;

/**
 * Mutates `pixels` (an RGBA byte sequence, e.g. ImageData.data) in place:
 * any pixel whose perceptual luminance (ITU-R BT.601 weights) is at or
 * above `threshold` has its alpha channel set to 0. Returns `pixels` for
 * convenience. Pure and DOM-free so it can be unit-tested directly against
 * plain arrays, without a real canvas.
 */
export function removeLightBackground(pixels, threshold = DEFAULT_BACKGROUND_LUMINANCE_THRESHOLD) {
  for (let i = 0; i < pixels.length; i += 4) {
    const luminance = 0.299 * pixels[i] + 0.587 * pixels[i + 1] + 0.114 * pixels[i + 2];
    if (luminance >= threshold) pixels[i + 3] = 0;
  }
  return pixels;
}

/**
 * Draws `source` (an HTMLImageElement) onto a fresh canvas, scaled down to
 * fit MAX_SIGNATURE_WIDTH_PX/MAX_SIGNATURE_HEIGHT_PX if needed, and returns
 * a base64 PNG. This is also where an uploaded photo's EXIF metadata is
 * actually stripped -- not by a separate step, but as an unavoidable side
 * effect of canvas re-encoding: canvas pixel data carries no EXIF concept,
 * so redrawing and re-exporting via toDataURL() cannot carry it forward.
 *
 * `stripBackground` runs the luminance-threshold pass above before export
 * -- Upload mode only (the Draw canvas is transparent by construction,
 * never filled before drawing, so it needs no such pass; see
 * `removeLightBackground()`'s own doc comment for this heuristic's limits).
 */
function drawToCanvas(source, naturalWidth, naturalHeight, { stripBackground = false } = {}) {
  const scale = Math.min(1, MAX_SIGNATURE_WIDTH_PX / naturalWidth, MAX_SIGNATURE_HEIGHT_PX / naturalHeight);
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(naturalHeight * scale));
  const ctx = canvas.getContext('2d');
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  if (stripBackground) {
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    removeLightBackground(imageData.data);
    ctx.putImageData(imageData, 0, 0);
  }
  return canvas.toDataURL('image/png');
}

const CANVAS_W = 600;
const CANVAS_H = 180; // 600x180 = ~3.3:1, within the doc's 3:1-4:1 guidance and well under the size caps by construction

function attachDrawing(canvas) {
  const ctx = canvas.getContext('2d');
  ctx.lineWidth = 2.5;
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#0b1a33';
  let drawing = false;
  let last = null;
  const pos = (event) => {
    const rect = canvas.getBoundingClientRect();
    return { x: (event.clientX - rect.left) * (canvas.width / rect.width), y: (event.clientY - rect.top) * (canvas.height / rect.height) };
  };
  const start = (event) => { drawing = true; last = pos(event); canvas.setPointerCapture(event.pointerId); };
  const move = (event) => {
    if (!drawing) return;
    const p = pos(event);
    ctx.beginPath();
    ctx.moveTo(last.x, last.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    last = p;
  };
  const end = () => { drawing = false; last = null; };
  canvas.addEventListener('pointerdown', start);
  canvas.addEventListener('pointermove', move);
  canvas.addEventListener('pointerup', end);
  canvas.addEventListener('pointerleave', end);
}

/**
 * Mounts the capture UI (Draw / Upload tabs + Apply/Clear) into `container`.
 * Milestone 55C: the "Type" tab (type a name, rendered onto the stamp canvas
 * in a cursive font) was removed globally -- this is the one shared
 * implementation every signature-capable role in every filing type mounts
 * through (see `signature-state-control.js`'s `mountSignatureStateControls()`,
 * its only caller), so the removal applies everywhere at once. `onApply(dataUrl)`
 * fires once with a validated base64 PNG;
 * `onCancel()` fires if the filer dismisses without applying. Returns a
 * `{ destroy() }` handle for the caller's own mount/unmount lifecycle
 * (mirrors this app's other dynamically-mounted widgets, e.g.
 * src/core/pdf/pdf-annotate.js's AnnotationSession).
 */
export function mountSignaturePad(container, { onApply, onCancel } = {}) {
  const controller = new AbortController();
  const { signal } = controller;

  container.innerHTML = `
    <div class="signature-pad" role="group" aria-label="Signature stamp capture">
      <div class="signature-pad-tabs" role="tablist">
        <button type="button" class="btn btn-sm btn-outline-secondary" role="tab" aria-selected="true" data-sig-tab="draw">Draw</button>
        <button type="button" class="btn btn-sm btn-outline-secondary" role="tab" aria-selected="false" data-sig-tab="upload">Upload</button>
      </div>
      <div class="signature-pad-panel" data-sig-panel="draw">
        <canvas width="${CANVAS_W}" height="${CANVAS_H}" class="signature-pad-canvas" aria-label="Draw your signature"></canvas>
        <div class="signature-pad-actions"><button type="button" class="btn btn-sm btn-outline-secondary" data-sig-action="clear-draw">Clear</button></div>
      </div>
      <div class="signature-pad-panel" data-sig-panel="upload" hidden>
        <input type="file" accept="image/png,image/jpeg" class="form-control" data-sig-upload>
        <canvas width="${CANVAS_W}" height="${CANVAS_H}" class="signature-pad-canvas signature-pad-canvas-preview" aria-hidden="true"></canvas>
        <div class="signature-pad-actions"><button type="button" class="btn btn-sm btn-outline-secondary" data-sig-action="clear-upload">Clear selected file</button></div>
      </div>
      <p class="signature-pad-error text-danger" role="alert" hidden></p>
      <div class="signature-pad-footer">
        <button type="button" class="btn btn-sm btn-primary" data-sig-action="apply">Apply Signature</button>
        <button type="button" class="btn btn-sm btn-outline-secondary" data-sig-action="cancel">Cancel</button>
      </div>
    </div>`;

  const drawCanvas = container.querySelector('[data-sig-panel="draw"] canvas');
  attachDrawing(drawCanvas);
  const uploadInput = container.querySelector('[data-sig-upload]');
  const uploadPreview = container.querySelector('[data-sig-panel="upload"] canvas');
  const errorEl = container.querySelector('.signature-pad-error');
  let activeTab = 'draw';
  let uploadedDataUrl = null;

  const showError = (msg) => { errorEl.textContent = msg; errorEl.hidden = !msg; };

  uploadInput.addEventListener('change', () => {
    const file = uploadInput.files?.[0];
    uploadedDataUrl = null;
    if (!file) return;
    const img = new Image();
    img.onload = () => {
      uploadedDataUrl = drawToCanvas(img, img.naturalWidth, img.naturalHeight, { stripBackground: true });
      const ctx = uploadPreview.getContext('2d');
      ctx.clearRect(0, 0, uploadPreview.width, uploadPreview.height);
      ctx.drawImage(img, 0, 0, uploadPreview.width, uploadPreview.height);
      URL.revokeObjectURL(img.src);
    };
    img.onerror = () => { showError('Could not read that image file.'); URL.revokeObjectURL(img.src); };
    img.src = URL.createObjectURL(file);
  }, { signal });

  container.querySelectorAll('[data-sig-tab]').forEach((tab) => {
    tab.addEventListener('click', () => {
      activeTab = tab.dataset.sigTab;
      container.querySelectorAll('[data-sig-tab]').forEach((t) => t.setAttribute('aria-selected', String(t === tab)));
      container.querySelectorAll('[data-sig-panel]').forEach((p) => { p.hidden = p.dataset.sigPanel !== activeTab; });
      showError('');
    }, { signal });
  });

  container.querySelector('[data-sig-action="clear-draw"]').addEventListener('click', () => {
    const ctx = drawCanvas.getContext('2d');
    ctx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);
  }, { signal });

  container.querySelector('[data-sig-action="clear-upload"]').addEventListener('click', () => {
    uploadedDataUrl = null;
    uploadInput.value = '';
    const ctx = uploadPreview.getContext('2d');
    ctx.clearRect(0, 0, uploadPreview.width, uploadPreview.height);
    showError('');
  }, { signal });

  container.querySelector('[data-sig-action="cancel"]').addEventListener('click', () => {
    onCancel?.();
  }, { signal });

  container.querySelector('[data-sig-action="apply"]').addEventListener('click', () => {
    let dataUrl, sourceCanvas;
    if (activeTab === 'draw') { sourceCanvas = drawCanvas; dataUrl = drawCanvas.toDataURL('image/png'); }
    else { sourceCanvas = uploadPreview; dataUrl = uploadedDataUrl; }
    if (!dataUrl) { showError('Add a signature before applying.'); return; }
    // A blank canvas (nothing drawn/typed, or Clear was just pressed) still
    // produces a valid, plausible-sized PNG -- validateSignatureImage()
    // below has no way to see that it's empty. Check the pixels directly,
    // before the format/size checks, so the filer gets one clear message
    // rather than "successfully" signing with an invisible image.
    if (sourceCanvas && !canvasHasVisibleContent(sourceCanvas)) {
      const emptyMessage = activeTab === 'draw' ? 'Draw a signature before applying -- the canvas is blank.'
        : 'The uploaded image appears blank.';
      showError(emptyMessage);
      return;
    }
    const result = validateSignatureImage(dataUrl);
    if (!result.valid) { showError(result.error); return; }
    showError('');
    onApply?.(dataUrl);
  }, { signal });

  return { destroy: () => controller.abort() };
}
