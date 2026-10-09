// Milestone 39-B: the three-state Unsigned / "/s/" Signed / Signature Stamp
// control every signature card gets, and the mount-point wiring for the
// capture widget that only appears in the Stamp state. Written once here so
// 39-C's rollout to every other role/filing type reuses this exact markup
// and JS wiring instead of each card hand-rolling its own copy.
import { SIGNATURE_STATES, SIGNATURE_POLICIES, SIGNER_ROLES, inferLegacySignatureState, signaturePolicyOf } from '../validation/signature-state.js';
import { mountSignaturePad } from './signature-pad.js';
// Milestone 46B: reusable per-party stamps. See mountSavedStampAffordance()
// below for why applying one copies bytes rather than storing a reference.
import { partyForSignaturePath, getActiveSignatureImage, addSignatureImage } from '../party-resolver.js';
import { confirmModal } from '../ui/dialogs.js';
import { getD } from '../state.js';
import { markDirtySinceExport } from '../persistence/case-file.js';
import { renderPage } from '../navigation/router.js';
import { fieldTarget, onChange } from '../navigation/draw-reason.js';
import { commitModelChange } from '../model-change.js';

/**
 * Milestone 73A: whose signature a control's card holds, from its path -- the
 * paths every form uses (party-resolver.js's partySlotForSignaturePath() lists
 * the same). Null for a card whose signer varies (the Plans' `cert`), which
 * passes its role.
 * @param {string} path
 */
export function signerRoleForPath(path) {
  if (/^(?:plan)?[Gg]uardians\.\d+$/.test(path) || path === 'certGuardian' || path === 'serviceGuardian') return SIGNER_ROLES.GUARDIAN;
  if (path === 'attorney' || path === 'certAttorney' || path === 'serviceAttorney') return SIGNER_ROLES.ATTORNEY;
  if (path === 'preparer') return SIGNER_ROLES.PREPARER;
  return null;
}

/**
 * Milestone 73F part 3: whether a signature block's date is required -- the
 * asterisk on its label. Only under "/s/" Signed (checkSignatureState()); a
 * guardian's "/s/" saved before the guardian rule is asked again, and what it
 * asks for is the choice, not the date. Choosing redraws the page (the
 * control's `route`), so a label reading this follows the choice.
 * @param {{ path: string, state?: string, role?: string, policy?: number }} block
 */
export function signatureDateRequired({ path, state, role: givenRole, policy: givenPolicy }) {
  if (state !== SIGNATURE_STATES.TYPED) return false;
  const role = givenRole || signerRoleForPath(path);
  const policy = givenPolicy ?? signaturePolicyOf(getD());
  return !(role === SIGNER_ROLES.GUARDIAN && policy === SIGNATURE_POLICIES.BY_HAND_OR_STAMP);
}

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
 * uses for other conditionally-rendered sections (e.g. the Plans'
 * directive-execution checkboxes, legacy-app.js's when this was written).
 */
export function renderSignatureStateControl({ path, state, date, route, signatureImage, statePath, imagePath, role: givenRole, policy: givenPolicy }) {
  const resolvedStatePath = statePath || `${path}.signatureState`;
  const resolvedImagePath = imagePath || `${path}.signatureImage`;
  const groupName = `sigstate_${path.replace(/[^A-Za-z0-9]/g, '_')}`;
  // Milestone 73A: who signs this block decides its choices -- a guardian
  // signs by hand (Unsigned) or with a stamp, never "/s/", under the year's
  // signature policy 2. `state` is the stored choice and `date` the stored
  // date; the control reads them itself (a guardian's blank choice is
  // Unsigned, date or no date). The role comes from the card's path, except
  // where the signer varies (the Plans' certificate passes it).
  const role = givenRole || signerRoleForPath(path);
  if (!role) throw new Error(`No signer role for the signature control "${path}"`);
  const policy = givenPolicy ?? signaturePolicyOf(getD());
  const current = inferLegacySignatureState(state, date, { role, policy });
  const guardian = role === SIGNER_ROLES.GUARDIAN;
  // A guardian's "/s/" under policy 2 -- one saved before the guardian rule --
  // is shown as not chosen and asked again; under policy 1 (a closed filing,
  // a filed year) it still shows as chosen, but is never offered anew.
  const askedAgain = guardian && policy === SIGNATURE_POLICIES.BY_HAND_OR_STAMP && current === SIGNATURE_STATES.TYPED;
  const offerTyped = !guardian || (policy === SIGNATURE_POLICIES.LEGACY && current === SIGNATURE_STATES.TYPED);
  const options = [
    { value: SIGNATURE_STATES.NONE, label: 'Unsigned' },
    ...(offerTyped ? [{ value: SIGNATURE_STATES.TYPED, label: '"/s/" Signed' }] : []),
    { value: SIGNATURE_STATES.STAMP, label: 'Signature Stamp' },
  ];
  const radios = options.map((opt) => `<div class="form-check form-check-inline">
    <input class="form-check-input" type="radio" name="${groupName}" id="${groupName}_${opt.value}" value="${opt.value}" ${!askedAgain && current === opt.value ? 'checked' : ''} data-form-path="${esc(resolvedStatePath)}" data-field-path="${esc(resolvedStatePath)}" data-form-route="${esc(route)}">
    <label class="form-check-label" for="${groupName}_${opt.value}">${opt.label}</label>
  </div>`).join('');
  const askNote = askedAgain
    ? `<div class="form-text signature-ask-again" role="note">Choose how this guardian signs: Unsigned (signed by hand) or Signature Stamp. A guardian no longer signs with "/s/".</div>`
    : '';

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
    ${askNote}
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
      markDirtySinceExport();
      commitModelChange('signature-image', [imagePath]);
      // Milestone 73K part 2: the cursor goes back to this signature's choice.
      if (route) renderPage(route, onChange(fieldTarget(checkedRadio.dataset.formPath || path)));
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
