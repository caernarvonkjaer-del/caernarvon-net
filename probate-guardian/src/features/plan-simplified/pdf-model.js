// Structured intermediate representation for Simplified Annual Plan PDF
// generation (Milestone 19-2). Maps the same window.D fields that
// buildPrintHTMLPlanSimplified() (print.js) renders as HTML onto the
// shared tagged/vector PDF engine's block vocabulary, replacing the
// raster html2pdf/html2canvas export with a tagged, accessible,
// non-raster PDF.

import { dateOrLine, displayDate } from '../../core/form/date-parser.js';
import { resolveDescriptorForInventoryType } from '../../core/filing/filing-descriptor.js';
import { planCertificateOfServiceSection } from '../../core/filing/plan-certificate-of-service.js';
import { triStateText } from '../../core/form/form-contract.js';
import { resolveSignatureModes } from '../../core/pdf/signature-modes.js';
import { rowStarted } from '../../core/validation/row-started.js';
import { PLAN_SIMPLIFIED_TEXT as T, numbered } from '../../core/filing/court-text/plan-simplified.js';

export function buildPlanSimplifiedModel(D) {
  const d = D || {};
  const wardName = (d.wardName || 'Ward').trim();
  const caseNumber = (d.caseNumber || '').trim();
  // Milestone 40C-A item 6: output must never invent a county. A blank one
  // yields no court caption at all (see core/pdf/circuit-lookup.js); export is
  // already blocked by this form's County validation.
  const county = d.county || '';
  const descriptor = resolveDescriptorForInventoryType('planSimplified');

  // Milestone 73H: a date as every screen and PDF shows it (displayDate());
  // in a sentence or a labelled field a blank date prints a line to write it
  // on (dateOrLine(), decision 73H-2). A table cell and a signature block's
  // date stay blank (73H-N2).
  const fmtDate = displayDate;

  const metadata = {
    title: `${wardName} - ${caseNumber} - Simplified Annual Plan`,
    subject: 'Simplified Annual Plan',
    author: 'Guardian Forms',
    creator: 'Guardian Forms',
    formName: 'SIMPLIFIED ANNUAL PLAN',
    formSubtitle: 'Simplified Annual Plan',
    keywords: 'Florida, Probate, Guardianship, Simplified Annual Plan',
    lang: 'en-US',
    wardName,
    caseNumber,
    ucn: (d.ucn || '').trim(),
    county,
  };
  metadata.title = `${wardName} - ${caseNumber} - ${descriptor.displayName}`;
  metadata.subject = descriptor.displayName;
  metadata.formName = descriptor.documentTitle;
  metadata.formSubtitle = descriptor.displayName;
  metadata.keywords = `Florida, Probate, Guardianship, ${descriptor.displayName}`;
  metadata.filingId = descriptor.id;

  const sections = [];

  // Page 1: Q1-Q4
  sections.push({
    id: 'plan-1',
    title: 'Simplified Annual Plan',
    bookmarkTitle: 'Plan (Q1-Q4)',
    parentBookmark: null,
    level: 1,
    pageBreakBefore: false,
    blocks: [
      {
        type: 'notice',
        text: T.intro,
      },
      {
        type: 'key-value-grid',
        items: [
          { label: 'For the Period', value: `From: ${dateOrLine(d.periodFrom)}   To: ${dateOrLine(d.periodTo)}` },
        ],
      },
      // Milestone 73N part 2: each question as the court's form words and
      // lays it out -- in full, across the page, the answer beneath.
      { type: 'question', question: numbered(1, T.q1), answer: d.q1Residences || '' },
      { type: 'question', question: numbered(2, T.q2), answer: d.q2BestPlacement || '' },
      { type: 'question', question: numbered(3, T.q3), answer: d.q3MedicalTreatment || '' },
      { type: 'question', question: numbered(4, T.q4), answer: d.q4Diagnosis || '' },
    ],
  });

  // Page 2: Q5-Q9
  const directives = [
    d.q8DNR ? 'Do Not Resuscitate ("DNR")' : null,
    d.q8LivingWill ? 'Living Will / Anatomical Gift' : null,
    d.q8Surrogate ? 'Healthcare Surrogate Designation' : null,
    d.q8POA ? 'Power of Attorney' : null,
    d.q8Other ? `Other Advance Directive: ${d.q8OtherText || ''}` : null,
    d.q8None ? 'NONE' : null,
  ].filter(Boolean);

  sections.push({
    id: 'plan-2',
    title: 'Simplified Annual Plan (cont.)',
    bookmarkTitle: 'Plan (Q5-Q9)',
    parentBookmark: null,
    level: 1,
    pageBreakBefore: true,
    blocks: [
      { type: 'question', question: numbered(5, T.q5), answer: d.q5SocialServices || '' },
      { type: 'question', question: numbered(6, T.q6), answer: d.q6Interaction || '' },
      // Milestone 73N part 3: numbered 7, 8, 9 as the original is ("Q7." ...).
      { type: 'question', question: numbered(7, T.q7), answer: triStateText(d.q7RestoreRights) },
      ...(d.q7RestoreRights === 'Yes' ? [{ type: 'question', question: T.q7Yes, answer: d.q7RestoreExplain || '' }] : []),
      directives.length
        ? { type: 'checklist', title: numbered(8, T.q8), items: directives.map(label => ({ checked: true, label })) }
        : { type: 'question', question: numbered(8, T.q8), answer: '' },
      { type: 'question', question: numbered(9, T.q9), answer: triStateText(d.q9Remuneration) },
      ...(d.q9Remuneration === 'Yes' ? [{ type: 'question', question: T.q9Yes, answer: d.q9RemunerationExplain || '' }] : []),
    ],
  });

  // Page 3: Signatures
  // Milestone 39-B: a co-guardian who only applied a signature choice (a
  // real "/s/" or stamp, not the unsigned default) has real data too, even
  // if every other field is blank.
  // Milestone 74B: a guardian block is started by the one rule every form uses.
  const hasSigData = (g) => rowStarted(g);
  const makeSigBlock = (label, g) => ({
    type: 'signature-block',
    role: `${label} Signature`,
    signerRole: 'guardian',
    signerName: g.name || '',
    signatureDate: fmtDate(g.signatureDate),
    // Milestone 39-B pilot: only the Guardian role carries these yet.
    signatureState: g.signatureState || '',
    signatureImage: g.signatureImage || '',
    fields: [
      [{ label: 'Printed Name', value: g.name || '' }, { label: 'Email Address', value: g.email || '' }],
      [{ label: 'Phone Number', value: g.phone || '' }, { label: 'Mailing Address', value: g.mailingAddress || '' }],
    ],
  });
  const g = d.planGuardians || [];

  // Milestone 61E: this form's court original ends after the guardian /
  // guardian-advocate signatures and the filing instructions -- it has no
  // preparer or attorney certification at all (see reference/plan-forms/
  // plan-simplified-original.txt:97-137). The blocks that used to be built
  // here were an addition of this app's own, and are gone.
  //
  // The UI still collects preparer_* and attorney_* (index.js) and
  // emptyDataPlanSimplified() still persists them (Milestone 61A), so the
  // app records who prepared and reviewed the filing; that record simply
  // does not appear on the document filed with the court. Captured, not
  // filed -- probate-guardian-data-model.csv says so on each of those rows.

  sections.push({
    id: 'signatures',
    title: 'Signatures',
    bookmarkTitle: 'Signatures',
    parentBookmark: null,
    level: 1,
    pageBreakBefore: true,
    blocks: [
      {
        type: 'notice',
        title: 'CERTIFICATION AND SIGNATURE OF GUARDIAN(S) / GUARDIAN ADVOCATE(S)',
        text: T.declaration,
      },
      ...(hasSigData(g[0]) ? [makeSigBlock('Guardian / Guardian Advocate', g[0])] : [{ type: 'notice', text: 'No signature entered.' }]),
      ...(hasSigData(g[1]) ? [makeSigBlock('Guardian / Guardian Advocate', g[1])] : []),
      {
        type: 'notice',
        text: 'Filing: File the original with the Clerk of the Circuit Court in the county of jurisdiction. E-filing instructions are at myflcourtaccess.com.',
      },
    ],
  });

  // Milestone 68C: the Certificate of Service, last, on every Plan (offered
  // as not required on this one).
  // Milestone 72C: `attorney_name`, as the page reads it (index.js's CERT_CFG).
  sections.push(planCertificateOfServiceSection(d, { attorneyName: (f) => f.attorney_name || '', planNoun: 'plan', optional: true }, fmtDate));

  // Milestone 73A: each signature block's print mode, from its signer's role
  // and the year's signature policy (src/core/pdf/signature-modes.js).
  return resolveSignatureModes({ metadata, sections }, d);
}
