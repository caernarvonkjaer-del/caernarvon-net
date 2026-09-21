// Structured intermediate representation for Simplified Annual Plan PDF
// generation (Milestone 19-2). Maps the same window.D fields that
// buildPrintHTMLPlanSimplified() (print.js) renders as HTML onto the
// shared tagged/vector PDF engine's block vocabulary, replacing the
// raster html2pdf/html2canvas export with a tagged, accessible,
// non-raster PDF.

import { resolveDescriptorForInventoryType } from '../../core/filing/filing-descriptor.js';
import { triStateText } from '../../core/form/form-contract.js';

export function buildPlanSimplifiedModel(D) {
  const d = D || {};
  const wardName = (d.wardName || 'Ward').trim();
  const caseNumber = (d.caseNumber || '').trim();
  // Milestone 40C-A item 6: output must never invent a county. A blank one
  // yields no court caption at all (see core/pdf/circuit-lookup.js); export is
  // already blocked by this form's County validation.
  const county = d.county || '';
  const descriptor = resolveDescriptorForInventoryType('planSimplified');

  const fmtDate = (iso) => {
    if (!iso) return '';
    const [y, m, day] = String(iso).split('-');
    if (!y || !m || !day) return iso;
    return `${m}/${day}/${y}`;
  };

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
        text: 'The undersigned, as the Guardian Advocate(s) or Guardian(s) of the above-named ward, report(s) to the court as follows:',
      },
      {
        type: 'key-value-grid',
        items: [
          { label: 'For the Period', value: `From: ${fmtDate(d.periodFrom)}   To: ${fmtDate(d.periodTo)}` },
        ],
      },
      { type: 'key-value-grid', items: [{ label: '1. The name and address of all places the ward has resided during the preceding year.', value: d.q1Residences || '' }] },
      { type: 'key-value-grid', items: [{ label: '2. Why is this the best placement for the ward?', value: d.q2BestPlacement || '' }] },
      { type: 'key-value-grid', items: [{ label: '3. List all professional medical/mental health treatment the ward has received during the past year.', value: d.q3MedicalTreatment || '' }] },
      { type: 'key-value-grid', items: [{ label: "4. What is/are the ward's current diagnosis and condition(s) which cause(s) him/her to continue to need a guardian advocate/guardian?", value: d.q4Diagnosis || '' }] },
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
      { type: 'key-value-grid', items: [{ label: '5. What personal and social services were provided for the ward in the past year?', value: d.q5SocialServices || '' }] },
      { type: 'key-value-grid', items: [{ label: '6. In the past year, how has the ward interacted with others, including the guardian advocate(s)/guardian(s) and family members?', value: d.q6Interaction || '' }] },
      {
        type: 'key-value-grid',
        items: [
          { label: 'Q7. Should any of the rights previously delegated to the guardian advocate(s)/guardian(s) be restored to the ward at this time?', value: triStateText(d.q7RestoreRights) },
          ...(d.q7RestoreRights === 'Yes' ? [{ label: 'Explanation', value: d.q7RestoreExplain || '' }] : []),
        ],
      },
      directives.length
        ? { type: 'checklist', title: 'Q8. Since the guardianship was established or the last annual guardianship report, the following was executed by or on behalf of the Ward', items: directives.map(label => ({ checked: true, label })) }
        : { type: 'key-value-grid', items: [{ label: 'Q8. Since the guardianship was established or the last annual guardianship report, the following was executed by or on behalf of the Ward', value: '' }] },
      {
        type: 'key-value-grid',
        items: [
          { label: 'Q9. As the Guardian Advocate(s)/Guardian(s) have you received any payments, goods, or services for work or care provided on behalf of the ward?', value: triStateText(d.q9Remuneration) },
          ...(d.q9Remuneration === 'Yes' ? [{ label: 'Explanation', value: d.q9RemunerationExplain || '' }] : []),
        ],
      },
    ],
  });

  // Page 3: Signatures
  // Milestone 39-B: a co-guardian who only applied a signature choice (a
  // real "/s/" or stamp, not the unsigned default) has real data too, even
  // if every other field is blank.
  const hasSigData = (g) => !!(g && (g.name || g.signatureDate || g.email || g.phone || g.mailingAddress
    || (g.signatureState && g.signatureState !== 'none') || g.signatureImage));
  const makeSigBlock = (label, g) => ({
    type: 'signature-block',
    role: `${label} Signature`,
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
        text: 'Under penalty of perjury, I declare that I have read the foregoing and the facts alleged are true to the best of my knowledge and belief.',
      },
      ...(hasSigData(g[0]) ? [makeSigBlock('Guardian / Guardian Advocate', g[0])] : [{ type: 'notice', text: 'No signature entered.' }]),
      ...(hasSigData(g[1]) ? [makeSigBlock('Guardian / Guardian Advocate', g[1])] : []),
      {
        type: 'notice',
        text: 'Filing: File the original with the Clerk of the Circuit Court in the county of jurisdiction. E-filing instructions are at myflcourtaccess.com.',
      },
    ],
  });

  return { metadata, sections };
}
