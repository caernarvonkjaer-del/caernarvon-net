// Milestone 68C. Every Plan told the filer to "serve a copy on all interested
// persons and file the certificate of service" and gave them nowhere to do it;
// the certificate-of-service implementation existed only in the accounting
// family. This is the Plans' certificate, shared by all four so it cannot
// diverge between them: the fields, the migration, who certifies, the one
// rule for "settled" the sidebar uses, what the print preview warns about,
// and the PDF section. The page itself is in
// core/form/plan-certificate-of-service-page.js, kept apart so the state
// factories, the print preflight and the PDF models can import this half
// without pulling the form renderers in.
//
// Decided 2026-09-23/24 (MILESTONE-68-PROPOSAL.md, 68C): recipients in the
// accountings' {name, line2, line3, line4} shape plus the "no recipients are
// required" attestation; a Date of Service and a method, optional; and one
// "Certified by" block signed by whoever serves -- the attorney when the plan
// names one, otherwise the guardian -- because the court's plan forms carry no
// certificate at all and Fla. R. Gen. Prac. & Jud. Admin. 2.516's certificate
// is signed by "the attorney or party". NOTHING here gates export on any
// Plan; the Simplified Plan's certificate is offered as not required (the
// Clerk's own Simplified Plan checklist says so).
import { serviceRecipientIssues } from '../validation/service-recipients.js';
import { inferLegacySignatureState } from '../validation/signature-state.js';

// The same words the three accounting-family pages declare for themselves
// (tests/unit/user-guide-drift-guard.spec.js lists every surface).
export const ATTESTATION_57B = 'No recipients are required for this certificate (filer attestation - app does not determine legal necessity)';
export const CERT_RECIPIENT_STARTED_FIELDS = ['name', 'line2', 'line3', 'line4'];
export const CERT_SIGNER_OPTIONS = [
  { value: 'guardian', label: 'Guardian' },
  { value: 'attorney', label: 'Attorney' },
];

const text = (v) => String(v ?? '').trim();

export const emptyCertRecipient = () => ({ name: '', line2: '', line3: '', line4: '' });

/** The certificate's fields, as every Plan's empty-data factory carries them. */
export function emptyCertificateOfService() {
  return {
    certRecipients: [emptyCertRecipient()],
    certNoRecipients: '',
    certDate: '',
    certIndicator: '',
    certSigner: '',
    certSignatureDate: '',
    certSignatureState: '',
    certSignatureImage: '',
  };
}

/**
 * Brings a Plan saved before this milestone to the current shape: adds the
 * fields it lacks, never touches one it has. Idempotent; returns true when
 * anything was added. Called on every mount, like 67B's bond migration.
 */
export function migratePlanCertificateOfService(filing) {
  if (!filing || typeof filing !== 'object') return false;
  let changed = false;
  for (const [key, value] of Object.entries(emptyCertificateOfService())) {
    if (!(key in filing)) { filing[key] = value; changed = true; }
  }
  if (!Array.isArray(filing.certRecipients) || filing.certRecipients.length === 0) {
    filing.certRecipients = [emptyCertRecipient()];
    changed = true;
  }
  return changed;
}

/**
 * Who certifies service. A stored choice wins; otherwise the attorney when the
 * plan names one, else Guardian 1 -- Rule 2.516's "attorney or party". `cfg`
 * is the form's own config: { attorneyName(filing), planNoun, optional }.
 */
export function resolveCertSigner(filing, cfg = {}) {
  const guardian = text(((filing?.planGuardians || [])[0] || {}).name);
  const attorney = text(typeof cfg.attorneyName === 'function' ? cfg.attorneyName(filing || {}) : '');
  const stored = filing?.certSigner === 'guardian' || filing?.certSigner === 'attorney' ? filing.certSigner : '';
  const role = stored || (attorney ? 'attorney' : 'guardian');
  return { role, name: role === 'attorney' ? attorney : guardian, defaulted: !stored };
}

/** The accountings' recipient rule, applied to this collection. */
export const certificateRecipientIssues = (filing) => serviceRecipientIssues({
  rows: filing.certRecipients,
  attestation: filing.certNoRecipients,
  startedFields: CERT_RECIPIENT_STARTED_FIELDS,
  // A name completes a card; the address lines are optional in the data model.
  missingFields: (r) => (text(r?.name) ? [] : ['Name']),
});

/**
 * The sidebar's rule, and only the sidebar's: Recipient 1 complete (cards 2+
 * finished or cleared), or the attestation answered Yes. The export gate
 * never asks (AGENTS.md section 4: the sidebar asks "have you finished with
 * this page?"; the gate asks "does this satisfy the court?").
 */
export function certificateRecipientsSettled(filing) {
  if (!filing) return false;
  const rec = certificateRecipientIssues(filing);
  return !rec.needsAttestation && rec.firstRowMissing.length === 0 && rec.extraRows.length === 0;
}

/**
 * Whether a filing type's certificate is optional: only the Simplified
 * Plan's, whose certificate the Clerk's own Simplified Plan checklist says is
 * not required. Decided once, here, so the print preview, the page's guidance
 * box and the sidebar cannot disagree. Follow-up, 2026-09-24: until the filer
 * starts an optional certificate, none of the three mentions it -- every
 * Simplified Plan filer who skipped it was being told "Not completed", shown
 * an unfinished page, and kept from the page's Preview & Export button.
 */
export const certificateOptional = (type) => type === 'planSimplified';

/** Anything at all entered on the certificate page. */
export function certificateStarted(filing) {
  if (!filing) return false;
  const rows = Array.isArray(filing.certRecipients) ? filing.certRecipients : [];
  return rows.some((r) => r && CERT_RECIPIENT_STARTED_FIELDS.some((f) => text(r[f])))
    || text(filing.certNoRecipients) !== '' || text(filing.certDate) !== '' || text(filing.certIndicator) !== ''
    || text(filing.certSigner) !== '' || text(filing.certSignatureDate) !== ''
    || (text(filing.certSignatureState) !== '' && filing.certSignatureState !== 'none') || text(filing.certSignatureImage) !== '';
}

/**
 * What the print preview says. Advisory only, never a blocker. An untouched
 * certificate gets one line -- none at all where it is optional; a started
 * one is told what is still blank, optional or not.
 */
export function planCertificateAdvisories(filing, { section = 'Certificate of Service', optional = false } = {}) {
  if (!filing) return [];
  const out = [];
  const advise = (code, field, message) => out.push({ code: `plan-certificate.${code}`, severity: 'advisory', field, message: `${section} — ${message}` });
  if (!certificateStarted(filing)) {
    if (optional) return out;
    advise('not-started', 'certRecipients.0.name', "Not completed. The Clerk's checklist asks whether a certificate of service was filed; list who was served, or state that no recipients are required. The plan can be filed without it.");
    return out;
  }
  const rec = certificateRecipientIssues(filing);
  if (rec.needsAttestation) advise('recipients', 'certRecipients.0.name', 'No recipient is listed and the "no recipients are required" question is unanswered. The plan can be filed without it.');
  rec.firstRowMissing.forEach((f) => advise('recipient-1', 'certRecipients.0.name', `Recipient 1 ${f} is blank. The plan can be filed without it.`));
  rec.extraRows.forEach(({ index, missing }) => missing.forEach((f) => advise(`recipient-${index + 1}`, `certRecipients.${index}.name`, `Recipient ${index + 1} ${f} is blank. The plan can be filed without it.`)));
  if (!text(filing.certDate)) advise('date', 'certDate', 'Date of Service is blank. The plan can be filed without it.');
  const state = inferLegacySignatureState(filing.certSignatureState, filing.certSignatureDate);
  if (!state || state === 'none') advise('signature', 'certSignatureDate', 'The certificate is not signed. The plan can be filed without it.');
  return out;
}

/**
 * The PDF section, appended after each Plan's last section. A Yes attestation
 * suppresses the recipient table rather than printing an empty one (the cards
 * keep their data; the attestation is what the filer is certifying).
 */
export function planCertificateOfServiceSection(filing, cfg = {}, fmtDate = (v) => v || '') {
  const d = filing || {};
  const recipients = (d.certRecipients || []).filter((r) => r && (r.name || r.line2 || r.line3 || r.line4));
  const signer = resolveCertSigner(d, cfg);
  // Heterogeneous PDF blocks (notice, table, signature-block): typed as such
  // so tsc, which reaches this file through state.js, does not infer the
  // element type from the first block alone.
  /** @type {Array<Record<string, any>>} */
  const blocks = [
    { type: 'notice', tag: 'P', text: `I hereby certify that a copy of this ${cfg.planNoun || 'plan'} has been furnished to:` },
  ];
  if (recipients.length > 0 && d.certNoRecipients !== 'Yes') {
    blocks.push({
      type: 'table', tag: 'Table', title: 'Certificate of Service Recipients',
      headers: ['#', 'Recipient Name', 'Address Details'],
      rows: recipients.map((r, i) => [String(i + 1), r.name || '', [r.line2, r.line3, r.line4].filter(Boolean)]),
      colWidths: [6, 44, 50], colAlign: ['center', 'left', 'left'],
    });
  } else {
    blocks.push({ type: 'notice', tag: 'P', text: d.certNoRecipients === 'Yes' ? ATTESTATION_57B : 'No service recipients listed.' });
  }
  blocks.push({ type: 'notice', tag: 'P', text: `on this date: ${fmtDate(d.certDate) || 'the date indicated below'}${d.certIndicator ? ` | ${d.certIndicator}` : ''}` });
  blocks.push({
    type: 'signature-block', tag: 'Part',
    role: `Certified by (${signer.role === 'attorney' ? 'Attorney' : 'Guardian'})`,
    signerName: signer.name,
    signatureDate: fmtDate(d.certSignatureDate),
    signatureState: d.certSignatureState || '',
    signatureImage: d.certSignatureImage || '',
    fields: [[{ label: 'Printed Name', value: signer.name }, { label: 'Date Signed', value: fmtDate(d.certSignatureDate) }]],
  });
  return {
    id: 'certificate-of-service',
    title: 'Certificate of Service',
    bookmarkTitle: 'Certificate of Service',
    parentBookmark: null,
    level: 1,
    pageBreakBefore: true,
    blocks,
  };
}
