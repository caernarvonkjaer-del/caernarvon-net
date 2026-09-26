// Milestone 63B. The Certificate of Service asks "No recipients are required for
// this certificate (filer attestation ...)" only when it applies -- when
// Recipient 1 is blank, or when 'Yes' is selected. attestationRelevant()
// (core/validation/service-recipients.js) decides; this module is the page half,
// shared by the three certificate pages -- Initial Inventory D-5, Annual Part X,
// Simplified Part VI -- so they cannot diverge.
//
// The question is always rendered and hidden with `d-none`, the same
// dependent-row pattern the Initial Inventory's D-4 uses for its bond-waived
// date, rather than left out of the markup: it has to be there for the toggle to
// bring it back without re-rendering the page under a filer who is typing.
//
// Everything the live toggle needs rides on the row's own data attributes, so no
// page has to bind anything and nothing outlives a page: one document-level
// subscription, added once, that does nothing when the row is absent.
import { attestationRelevant } from '../validation/service-recipients.js';
import { getD } from '../state.js';

const ROW_SELECTOR = '[data-service-attestation]';

const attr = (value) => String(value).replace(/&/g, '&amp;').replace(/"/g, '&quot;');

/**
 * Wraps the page's existing Yes/No control in the toggleable row.
 *
 * @param {object}   args
 * @param {string}   args.html            The attestation control, as the page already renders it.
 * @param {any[]}    args.rows            The recipient collection.
 * @param {string}   args.attestation     The tri-state: '' | 'Yes' | 'No'.
 * @param {string[]} args.startedFields   Fields that make a recipient row "started".
 * @param {string}   args.recipientsPath  Top-level key of the recipient collection on D.
 * @param {string}   args.attestationPath Top-level key of the attestation on D.
 */
export function renderServiceAttestationRow({ html, rows, attestation, startedFields, recipientsPath, attestationPath }) {
  const shown = attestationRelevant({ rows, attestation, startedFields });
  return `<div class="row g-3 mb-3${shown ? '' : ' d-none'}" data-service-attestation`
    + ` data-recipients-path="${attr(recipientsPath)}" data-attestation-path="${attr(attestationPath)}"`
    + ` data-started-fields="${attr(startedFields.join(','))}">`
    + `<div class="col-12">${html}</div></div>`;
}

/** Re-evaluates the row in place, from the live model. A no-op when the page has none. */
export function syncServiceAttestationVisibility() {
  if (typeof document === 'undefined') return;
  const row = document.querySelector(ROW_SELECTOR);
  if (!row) return;
  const data = (typeof window !== 'undefined' && getD()) || {};
  const { recipientsPath, attestationPath, startedFields } = row.dataset;
  const shown = attestationRelevant({
    rows: data[recipientsPath],
    attestation: data[attestationPath],
    startedFields: (startedFields || '').split(',').filter(Boolean),
  });
  row.classList.toggle('d-none', !shown);
}

// form-contract.js's post-write tail dispatches `pg:field-written` after every
// field write (on change/blur, so the question never jumps while the filer is
// still typing). Subscribed once: an ES module is evaluated once, so no flag on
// `window` is needed (and none is added to the window-bridge surface).
if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
  window.addEventListener('pg:field-written', () => syncServiceAttestationVisibility());
}
