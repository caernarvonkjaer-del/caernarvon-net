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
import { NO_RECIPIENTS_QUESTION, noRecipientsLine, serviceRecipientIssues } from '../validation/service-recipients.js';
import { inferLegacySignatureState, signaturePolicyOf, SIGNATURE_POLICIES } from '../validation/signature-state.js';
import { methodOfServiceLine, methodMissingMessage } from './service-method.js';
import { RECIPIENT_FIELDS, emptyRecipient, recipientAddressLines, recipientListed } from './recipient-shape.js';

// Milestone 74F: the certificate's question is the one constant on all seven
// certificates (service-recipients.js); this name is kept for its importers.
export const ATTESTATION_57B = NO_RECIPIENTS_QUESTION;
// Milestone 73O part 2: every field of the one recipient shape (recipient-shape.js).
export const CERT_RECIPIENT_STARTED_FIELDS = RECIPIENT_FIELDS;
export const CERT_SIGNER_OPTIONS = [
  { value: 'guardian', label: 'Guardian' },
  { value: 'attorney', label: 'Attorney' },
];

const text = (v) => String(v ?? '').trim();

export const emptyCertRecipient = emptyRecipient;

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
/**
 * Milestone 73A: the attorney's name on each Plan, for resolveCertSigner()
 * where no Plan's CERT_CFG is at hand (the advisories, the signature policy).
 * The Annual Plan keeps it in `attorney`; the other three in `attorney_name`.
 */
export const planCertAttorneyName = (d) => (d?.inventoryType === 'planAnnual' ? d.attorney : d.attorney_name) || '';

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
  // Milestone 72G: the same method warning as the accountings' -- someone is
  // listed, "no recipients are required" is not affirmed, and the method box
  // is empty (service-method.js).
  const listed = (filing.certRecipients || []).some((r) => r && CERT_RECIPIENT_STARTED_FIELDS.some((f) => text(r[f])));
  if (listed && filing.certNoRecipients !== 'Yes' && !text(filing.certIndicator)) {
    out.push({ code: 'plan-certificate.method', severity: 'advisory', field: 'certIndicator', message: methodMissingMessage(section) });
  }
  // Milestone 73A: judged from whoever certifies now (a later change of "Who
  // is certifying service" can't slip a guardian's "/s/" through), under the
  // year's signature policy. A guardian signs by hand or with a stamp, so an
  // Unsigned certificate is not "not signed" -- it is to be signed by hand.
  const signer = resolveCertSigner(filing, { attorneyName: planCertAttorneyName });
  const policy = signaturePolicyOf(filing);
  const state = inferLegacySignatureState(filing.certSignatureState, filing.certSignatureDate, { role: signer.role, policy });
  if (signer.role === 'guardian' && policy === SIGNATURE_POLICIES.BY_HAND_OR_STAMP && state === 'typed') {
    advise('signature', 'certSignatureState', 'Choose how the guardian signs it: Unsigned (signed by hand) or Signature Stamp; a guardian no longer signs with "/s/". The plan can be filed without it.');
  } else if (state === 'stamp' && !text(filing.certSignatureImage)) {
    advise('signature', 'certSignatureImage', 'The Signature Stamp has not been applied, so it prints a blank line to be signed by hand. The plan can be filed without it.');
  } else if (!state || state === 'none') {
    advise('signature', 'certSignatureDate', 'It prints with a blank line, to be signed by hand before it is filed. The plan can be filed without it.');
  }
  return out;
}

/**
 * The PDF section, appended after each Plan's last section. A Yes attestation
 * suppresses the recipient table rather than printing an empty one (the cards
 * keep their data; the attestation is what the filer is certifying).
 */
export function planCertificateOfServiceSection(filing, cfg = {}, fmtDate = (v) => v || '') {
  const d = filing || {};
  const recipients = (d.certRecipients || []).filter(recipientListed);
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
      // Milestone 73N part 1 (73O-6): the title stays with the table.
      keepTitleWithTable: true,
      headers: ['#', 'Recipient Name', 'Address Details'],
      rows: recipients.map((r, i) => [String(i + 1), r.name || '', recipientAddressLines(r)]),
      colWidths: [6, 44, 50], colAlign: ['center', 'left', 'left'],
    });
  } else {
    // Milestone 74F: the one line, never the question (it printed the
    // question and its disclaimer when the filer answered Yes).
    blocks.push({ type: 'notice', tag: 'P', text: noRecipientsLine(d.certNoRecipients) });
  }
  // Milestone 72G: the method on its own line, omitted when none is entered.
  blocks.push({ type: 'notice', tag: 'P', text: `on this date: ${fmtDate(d.certDate) || 'the date indicated below'}` });
  if (methodOfServiceLine(d.certIndicator)) blocks.push({ type: 'notice', tag: 'P', text: methodOfServiceLine(d.certIndicator) });
  blocks.push({
    type: 'signature-block', tag: 'Part',
    role: `Certified by (${signer.role === 'attorney' ? 'Attorney' : 'Guardian'})`,
    signerRole: signer.role,
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
