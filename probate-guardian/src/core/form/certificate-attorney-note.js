// Milestone 72H: the certificate of service's attorney is the filing's
// attorney (certificate-migrations.js). What the certificate page shows in
// place of the inputs it used to repeat: who signs and where their details
// come from, and -- until the filer discards them or makes them match -- any
// details typed on the old certificate that differ from the filing
// attorney's, with a "Discard old details" button (an explicit deletion,
// AGENTS.md section 4). Shared by the Inventory's D-5 and the Simplified's
// Part VI; the button goes through each page's own action attribute.
import { esc } from '../filing/escape-html.js';
import { CERT_ATTORNEY_SOURCE, oldCertificateDetails } from '../filing/certificate-migrations.js';

/** "Signed by NAME, Florida Bar # … — name and contact details come from D-2." */
export function certificateAttorneyLineHTML({ name, barNumber, engineId }) {
  const who = name ? `<strong>${esc(name)}</strong>` : '<strong>the attorney</strong> (name not entered yet)';
  const bar = barNumber ? `, Florida Bar # ${esc(barNumber)}` : '';
  return `<p class="mb-2" data-certificate-attorney-line>Signed by ${who}${bar} — name and contact details come from ${esc(CERT_ATTORNEY_SOURCE[engineId] || '')}.</p>`;
}

/**
 * The old certificate details that still differ, or '' when none do.
 * @param {Record<string, any>} d the filing
 * @param {string} engineId 'guardian' or 'simplified'
 * @param {{ actionAttr: string }} opts the page's action attribute, e.g. 'data-inventory-action'
 */
export function oldCertificateDetailsHTML(d, engineId, { actionAttr }) {
  const diffs = oldCertificateDetails(d, engineId);
  if (!diffs.length) return '';
  const source = esc(CERT_ATTORNEY_SOURCE[engineId] || '');
  const items = diffs.map((x) => `<li>${esc(x.label)}: ${esc(x.old)}. The certificate now prints ${source}'s (${x.current ? esc(x.current) : 'blank'}).</li>`).join('');
  return `<div class="alert alert-warning" role="status" data-old-certificate-details>
    <p class="mb-1"><strong>Entered on this certificate before</strong> (no longer printed):</p>
    <ul class="mb-2">${items}</ul>
    <p class="mb-2">The certificate now uses the attorney entered on ${source}. Correct ${source} if one of these is right, then discard them.</p>
    <button type="button" class="btn btn-outline-secondary btn-sm no-print" ${actionAttr}="discard-old-certificate-details">Discard old details</button>
  </div>`;
}
