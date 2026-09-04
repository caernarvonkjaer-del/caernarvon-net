// Structured intermediate representation for Initial Guardianship Plan PDF
// generation (Milestone 19-2). Maps the same window.D fields that
// buildPrintHTMLPlanInitial() (print.js) renders as HTML onto the shared
// tagged/vector PDF engine's block vocabulary, replacing the raster
// html2pdf/html2canvas export with a tagged, accessible, non-raster PDF.

export function buildPlanInitialModel(D) {
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
    title: `${wardName} - ${caseNumber} - Initial Guardianship Plan`,
    subject: 'Initial Guardianship Plan',
    author: 'Probate Guardian',
    creator: 'Probate Guardian',
    formName: 'INITIAL GUARDIANSHIP PLAN',
    formSubtitle: 'Initial Guardianship Plan',
    keywords: 'Florida, Probate, Guardianship, Initial Guardianship Plan',
    lang: 'en-US',
    wardName,
    caseNumber,
    county,
  };

  const sections = [];

  // Page 1: Cover
  sections.push({
    id: 'cover',
    title: 'Initial Guardianship Plan — Cover',
    bookmarkTitle: 'Cover',
    parentBookmark: null,
    level: 1,
    pageBreakBefore: false,
    blocks: [
      {
        type: 'notice',
        text: 'Pursuant to F.S. 744.632, this report with original signatures is due within 60 days after the Letters of Guardianship are signed, and remains in effect until amended or replaced by the approval of an Annual Guardianship Plan.',
      },
      {
        type: 'key-value-grid',
        items: [
          { label: 'Case Number', value: caseNumber },
          { label: 'Successor Guardianship', value: d.successorGuardianship || '' },
          { label: 'Guardianship Inception Date', value: fmtDate(d.inceptionDate) },
          { label: 'Date Letters Were Signed', value: fmtDate(d.lettersSignedDate) },
          { label: 'For the period', value: `${fmtDate(d.periodFrom)} through ${fmtDate(d.periodTo)}` },
          { label: 'Guardian Name(s)', value: d.guardianNames || '' },
          { label: 'Attorney Name', value: d.attorneyName || '' },
        ],
      },
      {
        type: 'checklist',
        title: 'The Ward Is Living',
        items: [
          { checked: d.wardLiving === 'In a private residence leased or owned by them (house, condo or apartment)', label: 'In a private residence leased or owned by them (house, condo or apartment).' },
          { checked: d.wardLiving === 'In a private residence not leased or owned by them (such as family member)', label: 'In a private residence not leased or owned by them (such as family member).' },
          { checked: d.wardLiving === 'In a facility (Skilled Nursing, Assisted Living, etc.)', label: 'In a facility (Skilled Nursing, Assisted Living, etc.).' },
        ],
      },
      {
        type: 'key-value-grid',
        title: 'Address Where Ward Currently Resides',
        items: [
          { label: 'Address', value: d.residenceAddress || '' },
          { label: 'City, State, ZIP', value: d.residenceCityStateZip || '' },
          { label: 'Phone', value: d.residencePhone || '' },
          { label: 'Mailing Address (if different)', value: d.mailingAddress || '' },
          { label: 'Mailing City, State, ZIP', value: d.mailingCityStateZip || '' },
        ],
      },
      {
        type: 'key-value-grid',
        items: [
          { label: 'Pre-existing Orders Not to Resuscitate / Advance Directives', value: d.q1PreexistingDirectives || '' },
        ],
      },
    ],
  });

  // Page 2: Q2-Q5
  const explainNotice = (text) => (text ? [{ type: 'notice', text: `Explanation: ${text}` }] : []);
  sections.push({
    id: 'q2-q5',
    title: 'Questions 2–5',
    bookmarkTitle: 'Questions 2-5',
    parentBookmark: null,
    level: 1,
    pageBreakBefore: true,
    blocks: [
      {
        type: 'checklist',
        title: "2. Residential Setting Best Suited to the Ward's Needs",
        items: [
          { checked: d.q2Setting === 'Assisted Living (ALF)', label: 'Assisted Living (ALF)' },
          { checked: d.q2Setting === 'Group Home', label: 'Group Home' },
          { checked: d.q2Setting === 'Intermediate', label: 'Intermediate' },
          { checked: d.q2Setting === 'Private Residence', label: 'Private Residence' },
          { checked: d.q2Setting === 'Skilled Nursing', label: 'Skilled Nursing' },
          { checked: d.q2Setting === 'Specialized', label: 'Specialized' },
          { checked: d.q2Setting === 'State Hospital', label: 'State Hospital' },
          { checked: d.q2Setting === 'Other', label: 'Other' },
        ],
      },
      ...explainNotice(d.q2Explain),
      {
        type: 'checklist',
        title: '3. Provision of Medical Services',
        items: [
          { checked: !!d.q3MedPrimary, label: 'Routine examination by primary care physician' },
          { checked: !!d.q3MedDentist, label: 'Routine examination by dentist' },
          { checked: !!d.q3MedOphthalmologist, label: 'Routine examination by Ophthalmologist' },
          { checked: !!d.q3MedSpecialist, label: `Routine examination by specialist${d.q3MedSpecialistArea ? ' — ' + d.q3MedSpecialistArea : ''}` },
          { checked: !!d.q3MedPT, label: 'Physical Therapy' },
          { checked: !!d.q3MedST, label: 'Speech Therapy' },
          { checked: !!d.q3MedOT, label: 'Occupational Therapy' },
          { checked: !!d.q3MedWardDecides, label: 'The ward retains the right to make their own decision' },
          { checked: !!d.q3MedOther, label: 'Other' },
        ],
      },
      ...explainNotice(d.q3MedExplain),
      {
        type: 'checklist',
        title: '4. Provision of Mental Health Services',
        items: [
          { checked: d.q4Mental === 'Routine examination by Psychiatrist/Psychologist', label: 'Routine examination by Psychiatrist/Psychologist' },
          { checked: d.q4Mental === 'Ongoing Treatment Outpatient', label: 'Ongoing Treatment Outpatient' },
          { checked: d.q4Mental === 'Ongoing Treatment Inpatient', label: 'Ongoing Treatment Inpatient' },
          { checked: d.q4Mental === 'None', label: 'None' },
          { checked: d.q4Mental === 'Other', label: 'Other' },
        ],
      },
      ...explainNotice(d.q4Explain),
      {
        type: 'checklist',
        title: '5. Provision of Personal Care',
        items: [
          { checked: d.q5Personal === 'Care Facility', label: 'Care Facility' },
          { checked: d.q5Personal === 'Nurses and Aides', label: 'Nurses and Aides' },
          { checked: d.q5Personal === 'Family and Friends', label: 'Family and Friends' },
          { checked: d.q5Personal === 'Other', label: 'Other' },
        ],
      },
      ...explainNotice(d.q5Explain),
    ],
  });

  // Page 3: Q6-Q7
  sections.push({
    id: 'q6-q7',
    title: 'Questions 6–7',
    bookmarkTitle: 'Questions 6-7',
    parentBookmark: null,
    level: 1,
    pageBreakBefore: true,
    blocks: [
      {
        type: 'checklist',
        title: '6. Socialization / Recreational Services',
        items: [
          { checked: !!d.q6CareFacility, label: 'Care Facility' },
          { checked: !!d.q6NursesAides, label: 'Nurses and Aides' },
          { checked: !!d.q6FamilyFriends, label: 'Family and Friends' },
          { checked: !!d.q6DayProgram, label: 'Day Program' },
          { checked: !!d.q6WardDecides, label: 'The Ward retains the right to make their own decision' },
          { checked: !!d.q6Other, label: 'Other' },
        ],
      },
      ...explainNotice(d.q6Explain),
      {
        type: 'checklist',
        title: '7. Insurance / Governmental Benefits',
        items: [
          { checked: !!d.q7SocialSecurity, label: 'Social Security' },
          { checked: !!d.q7Ssdi, label: 'Social Security Disability Income (SSDI)' },
          { checked: !!d.q7Hmo, label: 'Health Maintenance Organization (HMO)' },
          { checked: !!d.q7Ssi, label: 'Supplemental Security Income (SSI)' },
          { checked: !!d.q7StateSupplement, label: 'Optional State Supplement' },
          { checked: !!d.q7InstitutionalCare, label: 'Institutional Care Program' },
          { checked: !!d.q7SupplementalIns, label: 'Supplemental Insurance' },
          { checked: !!d.q7Pension, label: 'Pension' },
          { checked: !!d.q7Medicare, label: 'Medicare' },
          { checked: !!d.q7Medicaid, label: 'Medicaid' },
          { checked: !!d.q7Va, label: 'VA' },
          { checked: !!d.q7Trusts, label: 'Trusts' },
          { checked: !!d.q7PendingBenefits, label: 'Pending Benefits' },
          { checked: !!d.q7Other, label: 'Other' },
        ],
      },
      ...explainNotice(d.q7Explain),
    ],
  });

  // Page 4: Q9 examining providers
  const provRows = (d.q9Providers || []).filter(r => r && (r.name || r.providerType || r.examDate));
  sections.push({
    id: 'q9',
    title: 'Question 9',
    bookmarkTitle: 'Question 9',
    parentBookmark: null,
    level: 1,
    pageBreakBefore: true,
    blocks: [
      provRows.length ? {
        type: 'table',
        title: '9. Examinations to Determine Treatment Needs',
        headers: ['#', 'Provider', 'Type', 'Exam Date'],
        colWidths: [8, 47, 25, 20],
        colAlign: ['left', 'left', 'left', 'left'],
        rows: provRows.map((r, i) => {
          const sub = [r.street, r.cityStateZip, r.phone].filter(Boolean).map(text => ({ text }));
          return [
            String(i + 1),
            sub.length ? { main: r.name || '', sub } : (r.name || ''),
            r.providerType || '',
            fmtDate(r.examDate),
          ];
        }),
      } : {
        type: 'notice',
        title: '9. Examinations to Determine Treatment Needs',
        text: 'No providers listed.',
      },
    ],
  });

  // Page 5: Q10A ADLs
  const adls = d.adls || {};
  const initialAdls = typeof window !== 'undefined' && window.INITIAL_ADLS ? window.INITIAL_ADLS : [];
  sections.push({
    id: 'q10a',
    title: 'Question 10A',
    bookmarkTitle: 'Question 10A',
    parentBookmark: null,
    level: 1,
    pageBreakBefore: true,
    blocks: [
      {
        type: 'table',
        title: '10A. Activities of Daily Living',
        headers: ['Activity', 'Rating'],
        colWidths: [70, 30],
        colAlign: ['left', 'left'],
        rows: initialAdls.map(([k, label]) => [label, adls[k] || '']),
      },
    ],
  });

  // Page 6: Q10B-D
  sections.push({
    id: 'q10b-d',
    title: 'Question 10B–D',
    bookmarkTitle: 'Question 10B-D',
    parentBookmark: null,
    level: 1,
    pageBreakBefore: true,
    blocks: [
      {
        type: 'checklist',
        title: 'B. Mental Disabilities of the Ward',
        items: [
          { checked: !!d.mentalAlzheimers, label: "Alzheimer's type of dementia" },
          { checked: !!d.mentalAutism, label: 'Autism Spectrum Disorders' },
          { checked: !!d.mentalClosedHeadInjury, label: 'Closed Head Injury' },
          { checked: !!d.mentalDementia, label: 'Dementia' },
          { checked: !!d.mentalDepression, label: 'Depression' },
          { checked: !!d.mentalDevelopmental, label: 'Developmental Disabilities' },
          { checked: !!d.mentalSubstance, label: 'Induced by substance abuse' },
          { checked: !!d.mentalSchizophrenia, label: 'Schizophrenia or related disorders' },
          { checked: !!d.mentalOther, label: 'Other' },
        ],
      },
      ...explainNotice(d.mentalExplain),
      {
        type: 'checklist',
        title: 'C. Physical Disabilities of the Ward',
        items: [
          { checked: !!d.physMobility, label: 'Mobility' },
          { checked: !!d.physBlindness, label: 'Blindness' },
          { checked: !!d.physDeafness, label: 'Deafness' },
          { checked: !!d.physDiabetic, label: 'Diabetic' },
          { checked: !!d.physParkinsons, label: "Parkinson's disease" },
          { checked: !!d.physArthritis, label: 'Severe arthritis' },
          { checked: !!d.physOther, label: 'Other' },
        ],
      },
      ...explainNotice(d.physExplain),
      {
        type: 'checklist',
        title: 'D. Assistive Devices Currently Used',
        items: [
          { checked: !!d.usesDentures, label: 'Dentures' },
          { checked: !!d.usesHearingAid, label: 'Hearing Aid' },
          { checked: !!d.usesWheelchair, label: 'Wheelchair' },
          { checked: !!d.usesWalker, label: 'Walker/Cane' },
          { checked: !!d.usesCrutches, label: 'Crutches' },
          { checked: !!d.usesProsthetics, label: 'Prosthetics' },
          { checked: !!d.usesGlasses, label: 'Glasses' },
          { checked: !!d.usesNone, label: 'None' },
          { checked: !!d.usesOther, label: 'Other' },
        ],
      },
      ...explainNotice(d.usesExplain),
    ],
  });

  // Page 7: Q11 & Q10E-F
  sections.push({
    id: 'q11-10ef',
    title: 'Question 11 & 10E–F',
    bookmarkTitle: 'Question 11 & 10E-F',
    parentBookmark: null,
    level: 1,
    pageBreakBefore: true,
    blocks: [
      {
        type: 'checklist',
        title: '11. Pre-existing Orders / Advance Directives',
        items: [
          { checked: !!d.q11NoDirectives, label: 'There are NO pre-existing orders Not To Resuscitate (DNR) or any other advance directive, and I have taken the following steps to verify there are none:' },
        ],
      },
      ...(d.q11NoDirectives ? [{
        type: 'checklist',
        items: [
          { checked: !!d.q11StepResidence, label: "Search of ward's prior and current residence" },
          { checked: !!d.q11StepSafeDeposit, label: "Inventory of ward's safe deposit box" },
          { checked: !!d.q11StepInterviewed, label: 'Interviewed family and friends' },
          { checked: !!d.q11StepMedicalProviders, label: "Requested documents from the ward's medical providers" },
          { checked: !!d.q11StepAttorney, label: "Requested documents from the ward's attorney" },
        ],
      }] : []),
      {
        type: 'checklist',
        items: [
          { checked: !!d.q11Executed, label: 'The ward executed the following advance directives:' },
        ],
      },
      ...(d.q11Executed ? [{
        type: 'checklist',
        items: [
          { checked: !!d.q11ExecDNR, label: 'Order Not to Resuscitate (DNR), F.S. 401.45(3)' },
          { checked: !!d.q11ExecHealthcare, label: 'Advance Directive for Healthcare (surrogate, living will, anatomical gift)' },
          { checked: !!d.q11ExecPOA, label: 'Durable Power of Attorney, F.S. Chapter 709' },
          { checked: !!d.q11ExecOther, label: `Other${d.q11ExecOtherText ? ' — ' + d.q11ExecOtherText : ''}` },
        ],
      }] : []),
      {
        type: 'checklist',
        title: 'E. Assistive Devices Needed But Not Currently Owned',
        items: [
          { checked: !!d.needsDentures, label: 'Dentures' },
          { checked: !!d.needsHearingAid, label: 'Hearing Aid' },
          { checked: !!d.needsWheelchair, label: 'Wheelchair' },
          { checked: !!d.needsWalker, label: 'Walker/Cane' },
          { checked: !!d.needsCrutches, label: 'Crutches' },
          { checked: !!d.needsProsthetics, label: 'Prosthetics' },
          { checked: !!d.needsGlasses, label: 'Glasses' },
          { checked: !!d.needsNone, label: 'None' },
          { checked: !!d.needsOther, label: 'Other' },
        ],
      },
      ...explainNotice(d.needsExplain),
      {
        type: 'checklist',
        title: 'F. Examining Committee Recommendations Incorporated?',
        items: [
          { checked: d.committeeIncorporated === 'Yes', label: 'Yes' },
          { checked: d.committeeIncorporated === 'No', label: 'No' },
        ],
      },
      ...explainNotice(d.committeeExplain),
    ],
  });

  // Page 8: Advance directive detail
  const dirs = (d.q11Directives || []).filter(r => r && (r.title || r.dateSigned || r.signedBy));
  sections.push({
    id: 'directive-detail',
    title: 'Advance Directive Detail',
    bookmarkTitle: 'Advance Directive Detail',
    parentBookmark: null,
    level: 1,
    pageBreakBefore: true,
    blocks: dirs.length ? dirs.map((r, i) => ({
      type: 'key-value-grid',
      title: `Directive ${i + 1}`,
      items: [
        { label: 'Title of order or directive', value: r.title || '' },
        { label: 'Date executed / signed', value: fmtDate(r.dateSigned) },
        { label: 'Name of person who signed', value: r.signedBy || '' },
        { label: 'Designated agent(s) / surrogate(s)', value: r.agents || '' },
        { label: 'Alternate agent(s) / surrogate(s)', value: r.alternates || '' },
        { label: 'Relationship to the ward', value: r.relationship || '' },
        { label: 'Contact information', value: r.contact || '' },
        { label: 'Suspended or revoked by a court?', value: `${r.courtRevoked || ''}${r.orderDate ? ' — ' + fmtDate(r.orderDate) : ''}${r.orderCounty ? ', ' + r.orderCounty : ''}` },
      ],
    })) : [{ type: 'notice', text: 'No advance directives on file.' }],
  });

  // A wet-ink signature block: signerName has no other place to render in
  // wet-ink mode (unlike electronic /s/ mode, which draws it on the
  // signature line itself), so it's included as the first field.
  const wetSigBlock = (role, p) => ({
    type: 'signature-block',
    role,
    signerName: p.name || '',
    wetSignature: true,
    signatureDate: fmtDate(p.signatureDate),
    fields: [
      [{ label: 'Printed Name', value: p.name || '' }, { label: 'SSN / EIN', value: p.ssn || '' }, { label: 'Phone Number', value: p.phone || '' }],
      [{ label: 'Relationship to Ward', value: p.relationship || '' }, { label: 'Street Address', value: p.street || '' }, { label: 'City / State / ZIP', value: p.cityStateZip || '' }],
    ],
  });

  // Page 9: Certification + guardian signatures
  const g = d.planGuardians || [];
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
          { checked: !!d.certIncapacitatedNoCopy, label: 'The Ward was declared totally incapacitated and has not been given a copy of this plan.' },
          { checked: !!d.certMinorNoCopy, label: 'The Ward is a minor under the age of 14 and has not been given a copy of this plan.' },
          { checked: !!d.certConsulted, label: "The guardian has consulted with the Ward, to the extent reasonable, has honored the Ward's wishes, and to the maximum extent possible the plan is in accordance with them." },
          { checked: !!d.certRecognizeRights, label: 'In exercising his or her powers, the guardian shall recognize any rights retained by the ward [F.S. 744.363(6)].' },
          { checked: !!d.certNoRestriction, label: 'The plan does not restrict the physical liberty of the Ward except as necessary to protect the Ward and others from serious physical injury, illness, or disease.' },
          { checked: !!d.certProvidesCare, label: "The plan provides for the Ward's medical care and mental health treatment." },
        ],
      },
      {
        type: 'notice',
        text: 'UNDER PENALTIES OF PERJURY, I declare that I have read and examined the foregoing plan, and the facts alleged are true, to the best of my knowledge and belief.',
      },
      wetSigBlock('Guardian', g[0] || {}),
      wetSigBlock('Co-Guardian', g[1] || {}),
    ],
  });

  // Page 10: Additional co-guardian signatures (conditional)
  const extras = (g || []).slice(2).filter(p => p && (p.name || p.signatureDate));
  if (extras.length) {
    sections.push({
      id: 'certification-extra',
      title: 'Certification (cont.)',
      bookmarkTitle: 'Additional Guardian Signatures',
      parentBookmark: null,
      level: 1,
      pageBreakBefore: true,
      blocks: [
        { type: 'notice', title: 'Additional Guardian Signatures', text: 'All guardians of person must sign and provide the most current address, telephone number, and SSN. Only reports with original signatures will be audited by the Clerk of the Court.' },
        ...extras.map((p, i) => wetSigBlock(`Co-Guardian ${i + 3}`, p)),
      ],
    });
  }

  // Final page: attorney certification
  sections.push({
    id: 'attorney-certification',
    title: "Certification and Signature of Guardian's Attorney",
    bookmarkTitle: 'Attorney Certification',
    parentBookmark: null,
    level: 1,
    pageBreakBefore: true,
    blocks: [
      {
        type: 'notice',
        text: `The undersigned hereby notifies the court of the filing of the initial guardianship plan for the period ${fmtDate(d.periodFrom)} through ${fmtDate(d.periodTo)}. This initial guardianship plan is the representation of the guardian. I have not audited the accompanying initial plan. The undersigned attorney represents that he/she has examined the contents of the initial guardianship plan and that it conforms to the requirements of the Florida Guardianship Law and the standards for the plans in ${county} County.`,
      },
      {
        type: 'signature-block',
        role: "Guardian's Attorney",
        signerName: d.attorney_name || '',
        wetSignature: true,
        signatureDate: fmtDate(d.attorney_signatureDate),
        fields: [
          [{ label: 'Attorney Name', value: d.attorney_name || '' }, { label: 'Bar Number', value: d.attorney_bar || '' }, { label: 'Phone Number', value: d.attorney_phone || '' }],
          [{ label: 'Street Address', value: d.attorney_street || '' }, { label: 'City / State / ZIP', value: d.attorney_cityStateZip || '' }],
        ],
      },
    ],
  });

  return { metadata, sections };
}
