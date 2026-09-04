// Structured intermediate representation for Annual Plan — Minors PDF
// generation (Milestone 19-2). Maps the same window.D fields that
// buildPrintHTMLPlanMinor() (print.js) renders as HTML onto the shared
// tagged/vector PDF engine's block vocabulary, replacing the raster
// html2pdf/html2canvas export with a tagged, accessible, non-raster PDF.

export function buildPlanMinorModel(D) {
  const d = D || {};
  const wardName = (d.wardName || 'Ward').trim();
  const caseNumber = `${d.ucn || ''} ${d.ref || ''}`.trim();
  const county = d.county || 'Pinellas';

  const fmtDate = (iso) => {
    if (!iso) return '';
    const [y, m, day] = String(iso).split('-');
    if (!y || !m || !day) return iso;
    return `${m}/${day}/${y}`;
  };

  const metadata = {
    title: `${wardName} - ${caseNumber} - Annual Plan (Minor)`,
    subject: 'Annual Guardianship Plan — Minor',
    author: 'Probate Guardian',
    creator: 'Probate Guardian',
    formName: 'ANNUAL GUARDIANSHIP PLAN — MINOR',
    formSubtitle: 'Annual Guardianship Plan — Minor',
    keywords: 'Florida, Probate, Guardianship, Annual Plan, Minor',
    lang: 'en-US',
    wardName,
    caseNumber,
    county,
  };

  const sections = [];
  const explainNotice = (text) => (text ? [{ type: 'notice', text: `Explanation: ${text}` }] : []);

  // Page 1: Cover
  sections.push({
    id: 'cover',
    title: 'Annual Guardianship Plan — Minor — Cover',
    bookmarkTitle: 'Cover',
    parentBookmark: null,
    level: 1,
    pageBreakBefore: false,
    blocks: [
      {
        type: 'key-value-grid',
        items: [
          { label: 'UCN', value: d.ucn || '' },
          { label: 'REF #', value: d.ref || '' },
          { label: 'For the period', value: `${fmtDate(d.periodFrom)} to ${fmtDate(d.periodTo)}` },
          { label: 'Guardian Name(s)', value: d.guardianName || '' },
        ],
      },
      {
        type: 'checklist',
        items: [
          { checked: d.amendedForm === 'Yes', label: 'Amended Form' },
          { checked: d.professionalGuardian === 'Yes', label: 'Professional Guardian' },
          { checked: d.publicGuardian === 'Yes', label: 'Public Guardian' },
        ],
      },
      ...(d.amendedForm === 'Yes' && d.amendedVersion ? [{ type: 'notice', text: `Amended version: ${d.amendedVersion}` }] : []),
      {
        type: 'key-value-grid',
        title: '1. Where the Minor Presently Resides',
        items: [
          { label: 'Residence Name', value: d.q1ResidenceName || '' },
          { label: 'Street Address', value: d.q1Street || '' },
          { label: 'City / State / Zip', value: `${d.q1City || ''} ${d.q1State || ''} ${d.q1Zip || ''}`.trim() },
          { label: 'Phone', value: d.q1Phone || '' },
        ],
      },
    ],
  });

  // Page 2: Q2 residences + Q3 providers
  const resRows = (d.q2Residences || []).filter(r => r && (r.name || r.street || r.city));
  const provRows = (d.q3Providers || []).filter(r => r && (r.first || r.last || r.providerType));
  sections.push({
    id: 'q2-q3',
    title: 'Questions 2–3',
    bookmarkTitle: 'Questions 2-3',
    parentBookmark: null,
    level: 1,
    pageBreakBefore: true,
    blocks: [
      resRows.length ? {
        type: 'table',
        title: '2. Residences During the Preceding 12 Months',
        headers: ['#', 'Residence', 'City/State/Zip', 'Phone'],
        colWidths: [8, 42, 30, 20],
        colAlign: ['left', 'left', 'left', 'left'],
        rows: resRows.map((r, i) => [
          String(i + 1),
          r.street ? { main: r.name || '', sub: [{ text: r.street }] } : (r.name || ''),
          `${r.city || ''} ${r.state || ''} ${r.zip || ''}`.trim(),
          r.phone || '',
        ]),
      } : { type: 'notice', title: '2. Residences During the Preceding 12 Months', text: 'No prior residences listed.' },
      provRows.length ? {
        type: 'table',
        title: '3. Medical & Mental Health Treatment Providers',
        headers: ['#', 'Provider', 'Type', 'Visits'],
        colWidths: [8, 47, 25, 20],
        colAlign: ['left', 'left', 'left', 'left'],
        rows: provRows.map((r, i) => {
          const name = [r.first, r.mi, r.last].filter(Boolean).join(' ');
          const sub = [r.street, [r.city, r.state, r.zip].filter(Boolean).join(' '), r.phone].filter(Boolean).map(text => ({ text }));
          return [String(i + 1), sub.length ? { main: name, sub } : name, r.providerType || '', r.visits || ''];
        }),
      } : { type: 'notice', title: '3. Medical & Mental Health Treatment Providers', text: 'No providers listed.' },
    ],
  });

  // Page 3: Q4 medical services
  sections.push({
    id: 'q4',
    title: 'Question 4',
    bookmarkTitle: 'Question 4',
    parentBookmark: null,
    level: 1,
    pageBreakBefore: true,
    blocks: [
      {
        type: 'checklist',
        title: '4. Provision of Medical Services for the Plan Period',
        items: [
          { checked: !!d.q4Primary, label: `Routine examination by primary care physician${d.q4PrimaryFreq ? ' — ' + d.q4PrimaryFreq : ''}` },
          { checked: !!d.q4Dentist, label: `Routine examination by dentist${d.q4DentistFreq ? ' — ' + d.q4DentistFreq : ''}` },
          { checked: !!d.q4Specialist, label: `Routine examination by specialist${d.q4SpecialistFreq ? ' — ' + d.q4SpecialistFreq : ''}` },
          { checked: !!d.q4PT, label: 'Physical Therapy' },
          { checked: !!d.q4ST, label: 'Speech Therapy' },
          { checked: !!d.q4OT, label: 'Occupational Therapy' },
          { checked: !!d.q4MinorDecides, label: 'The Minor retains the right to make his or her own decision' },
          { checked: !!d.q4Other, label: 'Other' },
        ],
      },
      ...explainNotice(d.q4Explain),
    ],
  });

  // Page 4: Q5 education & social development
  sections.push({
    id: 'q5',
    title: 'Question 5',
    bookmarkTitle: 'Question 5',
    parentBookmark: null,
    level: 1,
    pageBreakBefore: true,
    blocks: [
      {
        type: 'key-value-grid',
        title: '5. Education of the Minor',
        items: [
          { label: 'A. School progress report summary', value: d.q5SchoolProgress || '' },
          { label: 'B. Social development', value: d.q5SocialDevelopment || '' },
          { label: 'C. How well the Minor communicates with others', value: d.q5Communicates || '' },
          { label: 'D. How well the Minor maintains interpersonal relationships', value: d.q5Interpersonal || '' },
        ],
      },
      {
        type: 'checklist',
        title: 'E. Unmet social needs of the Minor',
        items: [
          { checked: !!d.q5NoUnmetNeeds, label: 'No Unmet Needs' },
          { checked: !!d.q5DoesNotCareToSocialize, label: 'The Minor does not care to socialize' },
          { checked: !!d.q5UnmetNeeds, label: 'Unmet Needs' },
          { checked: !!d.q5Other, label: 'Other' },
        ],
      },
      ...explainNotice(d.q5Explain),
    ],
  });

  // A wet-ink signature block: signerName has no other place to render in
  // wet-ink mode, so it's included as the first field.
  const wetSigBlock = (role, p, fields) => ({
    type: 'signature-block',
    role,
    signerName: p.name || '',
    wetSignature: true,
    signatureDate: fmtDate(p.signatureDate),
    fields,
  });

  // Page 5: Certification + guardian signatures
  const g = d.planGuardians || [];
  const guardianFields = (p) => [
    [{ label: 'Printed Name', value: p.name || '' }, { label: 'Taxpayer ID #', value: p.tin || '' }, { label: 'Telephone #', value: p.phone || '' }],
    [{ label: 'Relationship to Ward', value: p.relationship || '' }, { label: 'Email Address', value: p.email || '' }],
    [{ label: 'Mailing Address', value: p.mailingStreet || '' }, { label: 'City / State / Zip', value: p.mailingCityStateZip || '' }],
  ];
  sections.push({
    id: 'certification',
    title: 'Certification',
    bookmarkTitle: 'Certification',
    parentBookmark: null,
    level: 1,
    pageBreakBefore: true,
    blocks: [
      {
        type: 'checklist',
        title: 'Certification and Signature of Guardian(s)',
        items: [
          { checked: !!d.certIncapacitated, label: 'The Ward was declared totally incapacitated.' },
          { checked: !!d.certMinor, label: 'The Ward is a minor.' },
          { checked: !!d.certConsulted, label: "The guardian has consulted with the Ward, to the extent reasonable, has honored the Ward's wishes, and to the maximum extent possible the plan is in accordance with the Ward's wishes or consistent with the rights retained by the Ward." },
          { checked: !!d.certNoRestriction, label: 'The plan does not restrict the physical liberty of the Ward except as necessary to protect the Ward and others from serious physical injury, illness, or disease.' },
          { checked: !!d.certProvidesCare, label: "The plan provides for the Ward's medical care and mental health treatment." },
          { checked: !!d.certPhysicianAttached, label: "The physician's statement of an examination of the Ward no more than 90 days before the beginning of the plan period is attached." },
        ],
      },
      {
        type: 'notice',
        text: 'UNDER PENALTIES OF PERJURY, I declare that I have read and examined the foregoing plan, and the facts alleged are true, to the best of my knowledge and belief.',
      },
      wetSigBlock('Guardian', g[0] || {}, guardianFields(g[0] || {})),
      wetSigBlock('Co-Guardian', g[1] || {}, guardianFields(g[1] || {})),
    ],
  });

  // Page 6: Preparer + attorney certification
  sections.push({
    id: 'preparer-attorney',
    title: 'Preparer & Attorney',
    bookmarkTitle: 'Preparer & Attorney',
    parentBookmark: null,
    level: 1,
    pageBreakBefore: true,
    blocks: [
      {
        type: 'notice',
        title: 'Certification and Signature of Preparer',
        text: 'The preparation of this form is based upon the information provided by the guardian(s) and/or attorney with no independent verification of the information contained herein. I have not audited or reviewed the guardianship plan or documents supporting its preparation, and accordingly do not express an opinion or any other form of assurance as to the accuracy of the information contained in the plan.',
      },
      wetSigBlock('Preparer', { name: d.preparer_name, signatureDate: d.preparer_signatureDate }, [
        [{ label: 'Preparer Name', value: d.preparer_name || '' }, { label: 'Taxpayer ID #', value: d.preparer_tin || '' }, { label: 'Telephone #', value: d.preparer_phone || '' }],
        [{ label: 'Email Address', value: d.preparer_email || '' }],
        [{ label: 'Mailing Address', value: d.preparer_mailingStreet || '' }, { label: 'City / State / Zip', value: d.preparer_cityStateZip || '' }],
      ]),
      {
        type: 'notice',
        title: "Certification and Signature of Guardian's Attorney",
        text: "The undersigned hereby notifies the Court of the filing of this Annual Guardianship Plan. This plan is the representation of the guardian. I have not audited the accompanying plan. The undersigned attorney represents that he/she has examined the contents of this plan and that it conforms to the requirements of the Florida Guardianship Law.",
      },
      wetSigBlock("Guardian's Attorney", { name: d.attorney_name, signatureDate: d.attorney_signatureDate }, [
        [{ label: 'Attorney Name', value: d.attorney_name || '' }, { label: 'Bar Number', value: d.attorney_bar || '' }, { label: 'Phone Number', value: d.attorney_phone || '' }],
        [{ label: 'Email Address', value: d.attorney_email || '' }],
        [{ label: 'Mailing Address', value: d.attorney_street || '' }, { label: 'City / State / Zip', value: d.attorney_cityStateZip || '' }],
      ]),
    ],
  });

  return { metadata, sections };
}
