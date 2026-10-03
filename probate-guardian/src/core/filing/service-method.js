// Milestone 72G: the method of service and the ward's status, kept apart.
//
// Every certificate of service had a free-text box labelled "Indicate if
// (e.g. hand-delivered, mailed)", where filers typed how the copies were
// served. On the Annual and the Simplified that text went into the Clerk's
// workbook box "Indicate if:", which on the Clerk's form is the ward's status
// -- a dropdown: Ward is totally incapacitated / Ward is under 14 years old /
// N/A. So a filed Annual could say "mailed" there, and neither form had
// anywhere for the ward's status. The Inventory kept the two apart but had
// no method at all.
//
// Now (decided by the requester 2026-10-02):
//   - the method is the existing box, relabelled, on all seven certificates
//     (the Inventory gains one); it prints on the PDF only, and a missing
//     method is a Preview & Export warning, never a blocker -- Rule 2.516(f)
//     lists the method among what a certificate includes;
//   - the ward's status is a separate dropdown on the Annual and the
//     Simplified, like the Inventory's; it, not the method, fills the
//     workbook's "Indicate if:" box, and it is required on all three
//     accountings (the requester's decision, recorded as Pinellas Clerk
//     practice -- the workbook having the box does not by itself make
//     answering it required);
//   - a certificate describes one filing being served, so a new year, a
//     conversion or a new filing starts its answers blank (only the
//     recipients, and on a same-period conversion the ward's status, carry).

const text = (v) => String(v ?? '').trim();

/** The Clerk's three "Indicate if Ward is:" values, in the workbook's order. */
export const WARD_STATUS_VALUES = Object.freeze(['Ward is totally incapacitated', 'Ward is under 14 years old', 'N/A']);

/** The method box's label, on every certificate. */
export const SERVICE_METHOD_LABEL = 'How were the copies served? (e.g. U.S. Mail; e-mail to the attorney, mail to the ward)';

/**
 * The method box's field kind: free text, kept exactly as typed. Stated, not
 * inferred -- the label mentions "attorney" and "ward", so the shared
 * renderer would take it for a name and title-case it ("U.S. Mail to Each
 * Recipient"), and would mangle an e-mail address typed into it.
 */
export const SERVICE_METHOD_KIND = 'text';

const squash = (v) => text(v).replace(/\s+/g, ' ').toLowerCase();

/**
 * One of the three ward-status values, if `value` is exactly one of them
 * (case and spacing ignored), in its canonical spelling; '' otherwise.
 * Nothing is guessed from other free text.
 */
export function wardStatusFromText(value) {
  const s = squash(value);
  return WARD_STATUS_VALUES.find((w) => w.toLowerCase() === s) || '';
}

/** The PDF's method line, or '' when no method is entered (the line is then omitted). */
export function methodOfServiceLine(method) {
  return text(method) ? `Method of service: ${text(method)}` : '';
}

/** Each accounting engine's certificate: where its recipients, attestation and method live. */
const CERTIFICATES = Object.freeze({
  guardian: Object.freeze({ section: 'D-5', recipients: 'serviceRecipients', recipientFields: ['name', 'address', 'cityStateZip'], noRecipients: 'serviceNoRecipients', method: 'serviceMethod' }),
  annual: Object.freeze({ section: 'Part X', recipients: 'certRecipients', recipientFields: ['name', 'line2', 'line3', 'line4'], noRecipients: 'certNoRecipients', method: 'certIndicator' }),
  simplified: Object.freeze({ section: 'Part VI', recipients: 'certRecipients', recipientFields: ['name', 'line2', 'line3', 'line4'], noRecipients: 'certNoRecipients', method: 'certIndicator' }),
});

/** The warning's text, shared with the Plans' (plan-certificate-of-service.js). */
export const methodMissingMessage = (section) =>
  `${section} — How the copies were served is not stated. Rule 2.516(f) lists the method of service among what a certificate of service includes.`;

/**
 * Preview & Export: the certificate lists at least one recipient, the filer
 * has not affirmed that none are required, and the method box is empty.
 * Never an export issue, and the sidebar is unaffected.
 */
export function serviceMethodAdvisories(d, engineId) {
  const c = CERTIFICATES[engineId];
  if (!d || !c) return [];
  if (d[c.noRecipients] === 'Yes') return [];
  const listed = (Array.isArray(d[c.recipients]) ? d[c.recipients] : []).some((r) => r && c.recipientFields.some((f) => text(r[f])));
  if (!listed || text(d[c.method])) return [];
  return [{ code: 'certificate.method-missing', severity: 'advisory', field: c.method, message: methodMissingMessage(c.section) }];
}

// ── The certificate's lifecycle (72G step 6) ────────────────────────────────

/** What each engine's certificate answers are, apart from its recipients. */
const ANSWERS = Object.freeze({
  guardian: Object.freeze({ blank: { serviceMethod: '', serviceNoRecipients: '', serviceIndicateIf: '' }, nullDates: ['serviceDate'], signers: ['serviceAttorney', 'serviceGuardian'] }),
  annual: Object.freeze({ blank: { certDate: '', certIndicator: '', certNoRecipients: '', certWardStatus: '', certAttySignDate: '', certAttySignatureState: '', certAttySignatureImage: '', certGuardianSignDate: '', certGuardianSignatureState: '', certGuardianSignatureImage: '' } }),
  simplified: Object.freeze({ blank: { certServiceDate: '', certIndicator: '', certNoRecipients: '', certWardStatus: '', certAttySignDate: '', certAttySignatureState: '', certAttySignatureImage: '', certGuardianSignDate: '', certGuardianSignatureState: '', certGuardianSignatureImage: '' } }),
  plan: Object.freeze({ blank: { certDate: '', certIndicator: '', certNoRecipients: '', certSigner: '', certSignatureDate: '', certSignatureState: '', certSignatureImage: '' } }),
});

/**
 * Clears a certificate's answers -- date, method, "no recipients required",
 * signer choice (the Plans' certSigner, each guardian's certifiesService),
 * every certificate signature and the ward's status -- and keeps its
 * recipients. A certificate describes one filing being served, so the next
 * year's certificate is answered afresh (72G step 6). `engineId` is the form
 * engine; the four Plans share 'plan'.
 */
export function clearCertificateAnswers(data, engineId) {
  const a = ANSWERS[engineId];
  if (!data || !a) return;
  for (const [k, v] of Object.entries(a.blank)) data[k] = v;
  for (const k of a.nullDates || []) data[k] = null;
  for (const k of a.signers || []) {
    if (data[k] && typeof data[k] === 'object') Object.assign(data[k], { signatureDate: null, signatureState: '', signatureImage: '' });
  }
  if (Array.isArray(data.guardians)) data.guardians.forEach((g) => { if (g && 'certifiesService' in g) g.certifiesService = false; });
}
