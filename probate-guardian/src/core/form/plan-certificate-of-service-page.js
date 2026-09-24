// Milestone 68C. The Plans' Certificate of Service page -- the body every
// Plan wraps in its own schedule-page and page nav. The rules it renders
// (fields, who certifies, the attestation) live in
// core/filing/plan-certificate-of-service.js; this file is only markup, so
// the state factories, the print preflight and the PDF models never import
// the form renderers through it.
//
// Recipient rows ride the Plans' existing +Add/Remove row path
// (data-form-action="add-plan-row"/"remove-plan-row", row type
// "certRecipient" in legacy-app.js's planEmptyRow()); the attestation row is
// the accountings' shared toggle, so it hides when a recipient is listed and
// the cards hide -- never clear -- when it is answered Yes.
import {
  ATTESTATION_57B, CERT_RECIPIENT_STARTED_FIELDS, CERT_SIGNER_OPTIONS, resolveCertSigner,
} from '../filing/plan-certificate-of-service.js';
import { renderServiceAttestationRow } from './service-attestation-visibility.js';
import { renderFormField, renderYesNoField, renderRadioGroupField, esc } from './form-fields.js';
import { renderSignatureStateControl } from '../signature/signature-state-control.js';
import { inferLegacySignatureState } from '../validation/signature-state.js';

export function renderPlanCertificateOfServicePage({ filing, route, cfg = {} }) {
  const d = filing || {};
  const signer = resolveCertSigner(d, cfg);
  const hidden = d.certNoRecipients === 'Yes';
  const cards = (d.certRecipients || []).map((r, i) => `<div class="col-12 col-lg-6"><div class="entry-card mb-2">
      <div class="entry-card-header"><span>Recipient ${i + 1}</span><span class="entry-card-actions">${i === 0 ? '' : `<button type="button" class="btn btn-sm btn-outline-danger" data-form-action="remove-plan-row" data-collection="certRecipients" data-index="${i}" data-route="${esc(route)}">✕ Remove</button>`}</span></div>
      <div class="entry-card-body"><div class="row g-2">
        <div class="col-12">${renderFormField({ path: `certRecipients.${i}.name`, label: 'Name', value: r?.name || '', id: `certRecipients_${i}_name` })}</div>
        <div class="col-12">${renderFormField({ path: `certRecipients.${i}.line2`, label: 'Line 2', value: r?.line2 || '', id: `certRecipients_${i}_line2` })}</div>
        <div class="col-12">${renderFormField({ path: `certRecipients.${i}.line3`, label: 'Line 3', value: r?.line3 || '', id: `certRecipients_${i}_line3` })}</div>
        <div class="col-12">${renderFormField({ path: `certRecipients.${i}.line4`, label: 'Line 4', value: r?.line4 || '', id: `certRecipients_${i}_line4` })}</div>
      </div></div>
    </div></div>`).join('');
  const lead = cfg.optional
    ? "The Clerk's checklist does not require a certificate of service for this plan; if you serve copies, record who was served here."
    : "The Clerk's checklist asks whether a certificate of service was filed.";
  return `<h1>Certificate of Service</h1>
    <div class="schedule-instructions">${lead} I hereby certify that a copy of this ${esc(cfg.planNoun || 'plan')} has been furnished to the recipients listed below. Nothing on this page is required to file; the print preview notes what is still blank.</div>
    <div class="row g-2 mb-3">
      <div class="col-md-4">${renderFormField({ path: 'certDate', label: 'Date of Service', value: d.certDate || '', type: 'date', id: 'certDate' })}</div>
      <div class="col-md-6">${renderFormField({ path: 'certIndicator', label: 'Indicate if (e.g. hand-delivered, mailed)', value: d.certIndicator || '', id: 'certIndicator' })}</div>
    </div>
    <h2 class="subsection-heading">Recipients</h2>
    ${renderServiceAttestationRow({
      html: renderYesNoField({ path: 'certNoRecipients', label: ATTESTATION_57B, value: d.certNoRecipients || '', id: 'certNoRecipients', route }),
      rows: d.certRecipients, attestation: d.certNoRecipients, startedFields: CERT_RECIPIENT_STARTED_FIELDS,
      recipientsPath: 'certRecipients', attestationPath: 'certNoRecipients',
    })}
    ${hidden ? '' : `<div class="row g-3 schedule-entry-grid mb-2">${cards}</div>
    <button type="button" class="btn btn-outline-primary btn-sm mb-3" data-form-action="add-plan-row" data-collection="certRecipients" data-row-type="certRecipient" data-route="${esc(route)}">+ Add Recipient</button>`}
    <h2 class="subsection-heading">Certified by</h2>
    <div class="row g-2">
      <div class="col-12">${renderRadioGroupField({ path: 'certSigner', id: 'certSigner', label: 'Who is certifying service', value: signer.role, options: CERT_SIGNER_OPTIONS, hint: signer.name ? `Printed name, from the plan: ${esc(signer.name)}` : 'The printed name is carried from the plan once it is entered there.', route })}</div>
      <div class="col-md-4">${renderFormField({ path: 'certSignatureDate', label: 'Date Signed', value: d.certSignatureDate || '', type: 'date', id: 'certSignatureDate' })}</div>
      <div class="col-12">${renderSignatureStateControl({ path: 'cert', state: inferLegacySignatureState(d.certSignatureState, d.certSignatureDate), route, signatureImage: d.certSignatureImage, statePath: 'certSignatureState', imagePath: 'certSignatureImage' })}</div>
    </div>`;
}
