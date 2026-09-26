// Milestone 39-B: the three-state Unsigned / "/s/" Signed / Signature Stamp
// control every signature card gets, and the mount-point wiring for the
// capture widget that only appears in the Stamp state. Written once here so
// 39-C's rollout to every other role/filing type reuses this exact markup
// and JS wiring instead of each card hand-rolling its own copy.
import { SIGNATURE_STATES } from '../validation/signature-state.js';
import { mountSignaturePad } from './signature-pad.js';
// Milestone 46B: reusable per-party stamps. See mountSavedStampAffordance()
// below for why applying one copies bytes rather than storing a reference.
import { partyForSignaturePath, getActiveSignatureImage, addSignatureImage } from '../party-resolver.js';
import { confirmModal } from '../ui/dialogs.js';
import { getD } from '../state.js';

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/**
 * `path` is a stable identifier for this card (e.g. `planGuardians.0` or
 * `attorney`) -- it groups this control's DOM together and, by default, is
 * also the data-form-path prefix (`${path}.signatureState`/`.signatureImage`),
 * which is correct for 39-B/39-C's nested-object and collection-row field
 * shapes (`d.preparer.signatureDate`, `d.guardians[i].signatureDate`).
 *
 * Milestone 39-C: a third field shape exists -- flat, underscore-prefixed
 * scalars (`d.attorney_signatureDate`, not `d.attorney.signatureDate`) --
 * that the default `${path}.signatureState` concatenation cannot address,
 * since `window.setPath`/`getPath` split strictly on ".". Pass explicit
 * `statePath`/`imagePath` (e.g. `attorney_signatureState`) to override the
 * default for that shape; `path` still only needs to be a unique card
 * identifier in that case, not a real model path itself.
 *
 * `route` re-renders the current page on change so the capture widget
 * mounts/unmounts with the new state, the same pattern this app already
 * uses for other conditionally-rendered sections (e.g. legacy-app.js's
 * directive-execution checkboxes).
 */
export function renderSignatureStateControl({ path, state, route, signatureImage, statePath, imagePath }) {
  const resolvedStatePath = statePath || `${path}.signatureState`;
  const resolvedImagePath = imagePath || `${path}.signatureImage`;
  const groupName = `sigstate_${path.replace(/[^A-Za-z0-9]/g, '_')}`;
  const options = [
    { value: SIGNATURE_STATES.NONE, label: 'Unsigned' },
    { value: SIGNATURE_STATES.TYPED, label: '"/s/" Signed' },
    { value: SIGNATURE_STATES.STAMP, label: 'Signature Stamp' },
  ];
  const current = state || SIGNATURE_STATES.NONE;
  const radios = options.map((opt) => `<div class="form-check form-check-inline">
    <input class="form-check-input" type="radio" name="${groupName}" id="${groupName}_${opt.value}" value="${opt.value}" ${current === opt.value ? 'checked' : ''} data-form-path="${esc(resolvedStatePath)}" data-field-path="${esc(resolvedStatePath)}" data-form-route="${esc(route)}">
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
    <div data-signature-pad-mount="${esc(path)}" data-signature-image-path="${esc(resolvedImagePath)}"></div>
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
    const imagePath = mountEl.dataset.signatureImagePath || `${path}.signatureImage`;
    const group = container.querySelector(`[data-signature-state-group="${CSS.escape(path)}"]`);
    const checkedRadio = group?.querySelector('input[type="radio"]:checked');
    if (checkedRadio?.value !== 'stamp') return;

    const commitImage = (dataUrl) => {
      setImage(imagePath, dataUrl);
      window.markDirtySinceExport?.();
      window.autoSave?.();
      if (route && window.renderPage) window.renderPage(route);
    };

    mountSavedStampAffordance(mountEl, path, commitImage);

    const handle = mountSignaturePad(mountEl, {
      onApply: (dataUrl) => {
        // Milestone 46B: a freshly captured mark also becomes this party's
        // reusable stamp, which is what makes 46A's history worth keeping --
        // otherwise nothing would ever populate it. Appending is best-effort
        // and never blocks signing: a filing whose slot isn't linked to a
        // party yet still signs normally, it just has nothing to reuse later.
        try {
          const party = partyForSignaturePath(getD(), path);
          if (party) addSignatureImage(party, dataUrl);
        } catch (e) {
          console.warn('Could not record reusable signature stamp', e);
        }
        commitImage(dataUrl);
      },
      onCancel: () => {
        mountEl.innerHTML = '';
      },
    });
    handles.push(handle);
  });
  return handles;
}

/**
 * Milestone 46B: offers this party's active saved stamp for reuse, if there
 * is one. Applying **copies the image bytes onto the filing**, rather than
 * storing a { partyId, imageId } reference.
 *
 * That is a deliberate correction to 39-D's original design, made after its
 * own stated justification didn't survive scrutiny: it argued for a
 * reference "not a copy, so a later change to the party's active stamp never
 * retroactively alters an already-signed filing" -- but a copy is immutable
 * too, so that reasoning doesn't actually separate the two. The genuine
 * tradeoff is storage dedup versus portability, and a reference loses badly
 * there: `buildSingleWardExportBlob()` packages only the ward, so an exported
 * filing would carry a permanently dangling reference into any other case
 * file. Copying keeps single-ward export working untouched and removed the
 * entire export/import sub-delivery (39-D's 46C) from this milestone.
 *
 * The confirmation is required on every apply, per 46A's sensitivity
 * classification: a reusable mark could otherwise be attached to a document
 * its owner never saw.
 */
function mountSavedStampAffordance(mountEl, path, commitImage) {
  let party = null;
  try {
    party = partyForSignaturePath(getD(), path);
  } catch { /* an unlinked slot simply has nothing to offer */ }
  const active = party ? getActiveSignatureImage(party) : null;
  if (!active || !active.imageData) return;

  const wrap = document.createElement('div');
  wrap.className = 'saved-stamp-offer mb-2';
  const who = party.name ? ` for ${party.name}` : '';
  wrap.innerHTML = `<button type="button" class="btn btn-outline-secondary btn-sm" data-signature-action="use-saved-stamp">Use my saved signature${esc(who)}</button>`;
  // Inserted as a sibling *before* the pad's mount point, not inside it:
  // mountSignaturePad() assigns innerHTML on that element, which would wipe
  // this button out from under us.
  mountEl.parentNode.insertBefore(wrap, mountEl);

  wrap.querySelector('[data-signature-action="use-saved-stamp"]').addEventListener('click', async () => {
    const ok = await confirmModal('Apply your saved signature to this filing?');
    if (!ok) return;
    commitImage(active.imageData);
  });
}
