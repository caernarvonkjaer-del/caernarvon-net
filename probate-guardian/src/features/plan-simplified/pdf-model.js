// Structured intermediate representation for Simplified Annual Plan PDF
// generation (Milestone 19-2). Maps the same window.D fields that
// buildPrintHTMLPlanSimplified() (print.js) renders as HTML onto the
// shared tagged/vector PDF engine's block vocabulary, replacing the
// raster html2pdf/html2canvas export with a tagged, accessible,
// non-raster PDF.

export function buildPlanSimplifiedModel(D) {
  const d = D || {};
  const wardName = (d.wardName || 'Ward').trim();
  const caseNumber = (d.caseNumber || '').trim();
  const county = d.county || 'Pinellas';

  const fmtDate = (iso) => {
    if (!iso) return '';
    const [y, m, day] = String(iso).split('-');
    if (!y || !m || !day) return iso;
    return `${m}/${day}/${y}`;
  };

  const metadata = {
    title: `${wardName} - ${caseNumber} - Simplified Annual Plan`,
    subject: 'Simplified Annual Plan',
    author: 'Probate Guardian',
    creator: 'Probate Guardian',
    formName: 'SIMPLIFIED ANNUAL PLAN',
    formSubtitle: 'Simplified Annual Plan',
    keywords: 'Florida, Probate, Guardianship, Simplified Annual Plan',
    lang: 'en-US',
    wardName,
    caseNumber,
    county,
  };

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
          { label: 'Q7. Should any of the rights previously delegated to the guardian advocate(s)/guardian(s) be restored to the ward at this time?', value: d.q7RestoreRights || '' },
          ...(d.q7RestoreRights === 'Yes' ? [{ label: 'Explanation', value: d.q7RestoreExplain || '' }] : []),
        ],
      },
      directives.length
        ? { type: 'checklist', title: 'Q8. Since the guardianship was established or the last annual guardianship report, the following was executed by or on behalf of the Ward', items: directives.map(label => ({ checked: true, label })) }
        : { type: 'key-value-grid', items: [{ label: 'Q8. Since the guardianship was established or the last annual guardianship report, the following was executed by or on behalf of the Ward', value: '' }] },
      {
        type: 'key-value-grid',
        items: [
          { label: 'Q9. As the Guardian Advocate(s)/Guardian(s) have you received any payments, goods, or services for work or care provided on behalf of the ward?', value: d.q9Remuneration || '' },
          ...(d.q9Remuneration === 'Yes' ? [{ label: 'Explanation', value: d.q9RemunerationExplain || '' }] : []),
        ],
      },
    ],
  });

  // Page 3: Signatures
  const hasSigData = (g) => !!(g && (g.name || g.signatureDate || g.email || g.phone || g.mailingAddress));
  const makeSigBlock = (label, g) => ({
    type: 'signature-block',
    role: `${label} Signature`,
    signerName: g.name || '',
    useSlashS: g.useSlashS !== false,
    wetSignature: g.useSlashS === false,
    signatureDate: fmtDate(g.signatureDate),
    fields: [
      [{ label: 'Printed Name', value: g.name || '' }, { label: 'Email Address', value: g.email || '' }],
      [{ label: 'Phone Number', value: g.phone || '' }, { label: 'Mailing Address', value: g.mailingAddress || '' }],
    ],
  });
  const g = d.planGuardians || [];

  // Preparer block
  const prep = d.preparer_name ? {
    type: 'signature-block',
    role: 'Preparer Signature',
    signerName: d.preparer_name || '',
    useSlashS: d.preparer_useSlashS !== false,
    wetSignature: d.preparer_useSlashS === false,
    signatureDate: fmtDate(d.preparer_signatureDate),
    fields: [
      [{ label: 'Preparer Name', value: d.preparer_name || '' }, { label: 'Telephone', value: d.preparer_phone || '' }],
      [{ label: 'Email Address', value: d.preparer_email || '' }],
      [{ label: 'Mailing Address', value: [d.preparer_mailingStreet, d.preparer_cityStateZip].filter(Boolean).join(', ') }],
    ],
  } : null;

  // Attorney block
  const atty = d.attorney_name ? {
    type: 'signature-block',
    role: 'Attorney Signature',
    signerName: d.attorney_name || '',
    useSlashS: d.attorney_useSlashS !== false,
    wetSignature: d.attorney_useSlashS === false,
    signatureDate: fmtDate(d.attorney_signatureDate),
    fields: [
      [{ label: 'Attorney Name', value: d.attorney_name || '' }, { label: 'Florida Bar No.', value: d.attorney_bar || '' }],
      [{ label: 'Telephone', value: d.attorney_phone || '' }],
      [{ label: 'Address', value: [d.attorney_street, d.attorney_cityStateZip].filter(Boolean).join(', ') }],
      [{ label: 'Primary Email', value: d.attorney_email || '' },
        ...(d.attorney_secondary_email ? [{ label: 'Secondary Email', value: d.attorney_secondary_email }] : [])],
    ],
  } : null;

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
      ...(prep ? [{
        type: 'notice',
        title: 'CERTIFICATION AND SIGNATURE OF PREPARER',
        text: 'The preparation of this form is based upon information provided by the guardian(s). The preparer has not audited or reviewed the plan or supporting documents.',
      }, prep] : []),
      ...(atty ? [{
        type: 'notice',
        title: 'CERTIFICATION AND SIGNATURE OF GUARDIAN\'S ATTORNEY',
        text: 'The undersigned notifies the Court of the filing of this plan and represents that it conforms to the requirements of Florida Guardianship Law.',
      }, atty] : []),
      {
        type: 'notice',
        text: 'Filing: For Pinellas County cases, file the original with the Clerk of the Circuit Court, 315 Court Street, Room 106, Clearwater, FL 33756. For Pasco County cases, provide the original to the Clerk & Comptroller, P.O. Box 338, New Port Richey, FL 34656-0338. E-filing instructions are at myflcourtaccess.com.',
      },
    ],
  });

  return { metadata, sections };
}
