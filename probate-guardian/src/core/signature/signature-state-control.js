// Milestone 39-B: the three-state Unsigned / "/s/" Signed / Signature Stamp
// control every signature card gets, and the mount-point wiring for the
// capture widget that only appears in the Stamp state. Written once here so
// 39-C's rollout to every other role/filing type reuses this exact markup
// and JS wiring instead of each card hand-rolling its own copy.
import { SIGNATURE_STATES } from '../validation/signature-state.js';
import { mountSignaturePad } from './signature-pad.js';

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/**
 * `path` is the data-form-path prefix for this signature (e.g.
 * `planGuardians.0` or `attorney`, per that role's own field-shape --
 * MILESTONE-39-PROPOSAL.md 39-C's inventory decides the exact prefix per
 * role/type; this renderer only needs `${path}.signatureState` to be a
 * real, writable model path). `route` re-renders the current page on
 * change so the capture widget mounts/unmounts with the new state, the
 * same pattern this app already uses for other conditionally-rendered
 * sections (e.g. legacy-app.js's directive-execution checkboxes).
 */
export function renderSignatureStateControl({ path, state, route, signatureImage }) {
  const groupName = `sigstate_${path.replace(/[^A-Za-z0-9]/g, '_')}`;
  const options = [
    { value: SIGNATURE_STATES.NONE, label: 'Unsigned' },
    { value: SIGNATURE_STATES.TYPED, label: '"/s/" Signed' },
    { value: SIGNATURE_STATES.STAMP, label: 'Signature Stamp' },
  ];
  const current = state || SIGNATURE_STATES.NONE;
  const radios = options.map((opt) => `<div class="form-check form-check-inline">
    <input class="form-check-input" type="radio" name="${groupName}" id="${groupName}_${opt.value}" value="${opt.value}" ${current === opt.value ? 'checked' : ''} data-form-path="${esc(path)}.signatureState" data-field-path="${esc(path)}.signatureState" data-form-route="${esc(route)}">
    <label class="form-check-label" for="${groupName}_${opt.value}">${opt.label}</label>
  </div>`).join('');

  const preview = current === SIGNATURE_STATES.STAMP && signatureImage
    ? `<div class="signature-stamp-preview"><img src="${esc(signatureImage)}" alt="Applied signature stamp" style="max-width:248pt;max-height:80px;"></div>`
    : '';

  // The mount point always renders; mountSignatureStateControls() below
  // only populates it with the live capture widget when state === 'stamp',
  // so it takes zero layout space in the other two states (39-B's UI
  // decision) without a separate conditional render pass.
  return `<fieldset class="signature-state-control mb-2" data-signature-state-group="${esc(path)}">
    <legend class="form-label mb-1">Signature</legend>
    <div class="plan-radio-row">${radios}</div>
    ${preview}
    <div data-signature-pad-mount="${esc(path)}"></div>
  </fieldset>`;
}

/**
 * Call after the page's HTML is in the DOM (mirrors this app's other
 * post-render mount steps, e.g. plan-simplified/index.js's
 * mountPreview()). For every rendered signature-state control currently in
 * Stamp state, mounts the capture widget into its placeholder; applying a
 * signature writes `${path}.signatureImage`, triggers this app's normal
 * save path, and re-renders the current route so the applied preview shows
 * immediately. `getRecord(path)`/`setImage(path, dataUrl)` let each role's
 * own field shape (scalar prefix, nested object, or collection row) plug in
 * without this module knowing which one it is.
 */
export function mountSignatureStateControls(container, { setImage, route }) {
  const mounts = container.querySelectorAll('[data-signature-pad-mount]');
  const handles = [];
  mounts.forEach((mountEl) => {
    const path = mountEl.dataset.signaturePadMount;
    const group = container.querySelector(`[data-signature-state-group="${CSS.escape(path)}"]`);
    const checkedRadio = group?.querySelector('input[type="radio"]:checked');
    if (checkedRadio?.value !== 'stamp') return;
    const handle = mountSignaturePad(mountEl, {
      onApply: (dataUrl) => {
        setImage(path, dataUrl);
        window.markDirtySinceExport?.();
        window.autoSave?.();
        if (route && window.renderPage) window.renderPage(route);
      },
      onCancel: () => {
        mountEl.innerHTML = '';
      },
    });
    handles.push(handle);
  });
  return handles;
}
