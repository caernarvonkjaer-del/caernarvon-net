// Structured intermediate representation for Annual Guardianship Plan PDF
// generation (Milestone 19-2). Maps the same window.D fields that
// buildPrintHTMLPlanAnnual() (print.js) renders as HTML onto the shared
// tagged/vector PDF engine's block vocabulary, replacing the raster
// html2pdf/html2canvas export with a tagged, accessible, non-raster PDF.

export function buildPlanAnnualModel(D) {
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
    title: `${wardName} - ${caseNumber} - Annual Guardianship Plan`,
    subject: 'Annual Guardianship Plan',
    author: 'Probate Guardian',
    creator: 'Probate Guardian',
    formName: 'ANNUAL GUARDIANSHIP PLAN',
    formSubtitle: 'Annual Guardianship Plan',
    keywords: 'Florida, Probate, Guardianship, Annual Guardianship Plan',
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
    title: 'Annual Guardianship Plan — Cover',
    bookmarkTitle: 'Cover',
    parentBookmark: null,
    level: 1,
    pageBreakBefore: false,
    blocks: [
      {
        type: 'notice',
        text: 'Pursuant to F.S. 744.367, this report with original signatures is due within 90 days after the last day of the anniversary month that the letters of guardianship were signed.',
      },
      {
        type: 'key-value-grid',
        items: [
          { label: 'Social Security Number', value: d.ssn || '' },
          { label: 'Guardianship Inception Date', value: fmtDate(d.gid) },
          { label: 'For the period', value: `${fmtDate(d.periodFrom)} through ${fmtDate(d.periodTo)}` },
          { label: 'Guardian Name(s)', value: d.guardian || '' },
          { label: 'Attorney Name', value: d.attorney || '' },
        ],
      },
      {
        type: 'checklist',
        title: 'The Ward Is Living',
        items: [
          { checked: d.wardLiving === 'In a private residence leased or owned by them', label: 'In a private residence leased or owned by them (house, condo, apartment).' },
          { checked: d.wardLiving === 'In a private residence not leased or owned by them', label: 'In a private residence not leased or owned by them (such as a family member).' },
          { checked: d.wardLiving === 'In a facility (skilled nursing, assisted living, etc.)', label: 'In a facility (skilled nursing, assisted living, etc.).' },
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
        type: 'notice',
        text: "Filed separately is the Annual Physician's Report. Together these are the Annual Report of the Guardian of the Person.",
      },
    ],
  });

  // Page 2: Q1 residences
  const resRows = (d.q1Residences || []).filter(r => r && (r.name || r.street || r.cityStateZip));
  sections.push({
    id: 'q1',
    title: 'Question 1',
    bookmarkTitle: 'Question 1',
    parentBookmark: null,
    level: 1,
    pageBreakBefore: true,
    blocks: [
      resRows.length ? {
        type: 'table',
        title: '1. Places the Ward Has Resided During the Prior 12 Months',
        headers: ['#', 'Facility / Residence', 'Type', 'From', 'To'],
        colWidths: [6, 44, 20, 15, 15],
        colAlign: ['left', 'left', 'left', 'left', 'left'],
        rows: resRows.map((r, i) => {
          const sub = [r.street, r.cityStateZip, r.phone].filter(Boolean).map(text => ({ text }));
          return [String(i + 1), sub.length ? { main: r.name || '', sub } : (r.name || ''), r.facilityType || '', fmtDate(r.from), fmtDate(r.to)];
        }),
      } : { type: 'notice', title: '1. Places the Ward Has Resided During the Prior 12 Months', text: 'No residences listed.' },
    ],
  });

  // Page 3-4: Q2-Q3
  sections.push({
    id: 'q2-q3',
    title: 'Questions 2–3',
    bookmarkTitle: 'Questions 2-3',
    parentBookmark: null,
    level: 1,
    pageBreakBefore: true,
    blocks: [
      {
        type: 'checklist',
        title: "2. If the Ward's Address Has Changed Since the Last Plan",
        items: [
          { checked: !!d.q2NoMove, label: 'N/A — the ward has not moved since the last plan was filed.' },
          { checked: !!d.q2WithinCounty, label: 'The move was within this county and a change of address was provided to the court.' },
          { checked: !!d.q2WithinCircuit, label: 'The move was within this Circuit and notice was provided to the court within 15 days.' },
          { checked: !!d.q2OutsideApproved, label: 'The move was not within this Circuit and prior court approval was obtained.' },
          { checked: !!d.q2OutsideVenuePetition, label: 'The move was not within this Circuit and a petition to change venue is filed with this plan.' },
        ],
      },
      {
        type: 'checklist',
        title: "3. Plan for the Best Welfare of the Ward — Residential setting best suited to the ward's needs",
        items: [
          { checked: !!d.q3SettingALF, label: 'Assisted Living (ALF)' },
          { checked: !!d.q3SettingGroupHome, label: 'Group Home' },
          { checked: !!d.q3SettingIntermediate, label: 'Intermediate' },
          { checked: !!d.q3SettingPrivate, label: 'Private Residence' },
          { checked: !!d.q3SettingSkilled, label: 'Skilled Nursing' },
          { checked: !!d.q3SettingSpecialized, label: 'Specialized' },
          { checked: !!d.q3SettingStateHospital, label: 'State Hospital' },
          { checked: !!d.q3SettingOther, label: 'Other' },
        ],
      },
      ...explainNotice(d.q3SettingExplain),
      {
        type: 'checklist',
        title: 'The guardian will ensure this remains the best setting by',
        items: [
          { checked: !!d.q3EnsureAssessing, label: 'Periodically assessing needs' },
          { checked: !!d.q3EnsureWardDecides, label: 'The ward retains the right to decide' },
          { checked: !!d.q3EnsureNoChange, label: 'No change, unless required by medical condition' },
        ],
      },
      {
        type: 'checklist',
        title: 'Provision for medical care services',
        items: [
          { checked: !!d.q3MedPrimary, label: 'Routine examination by primary care physician' },
          { checked: !!d.q3MedDentist, label: 'Routine examination by dentist' },
          { checked: !!d.q3MedOphthalmologist, label: 'Routine examination by ophthalmologist' },
          { checked: !!d.q3MedSpecialist, label: `Routine examination by specialist${d.q3MedSpecialistArea ? ' — ' + d.q3MedSpecialistArea : ''}` },
          { checked: !!d.q3MedPhysicalTherapy, label: 'Physical therapy' },
          { checked: !!d.q3MedSpeechTherapy, label: 'Speech therapy' },
          { checked: !!d.q3MedOccupationalTherapy, label: 'Occupational therapy' },
          { checked: !!d.q3MedWardDecides, label: 'The ward retains the right to make their own decision' },
          { checked: !!d.q3MedNone, label: 'None' },
          { checked: !!d.q3MedOther, label: 'Other' },
        ],
      },
      ...explainNotice(d.q3MedExplain),
      {
        type: 'checklist',
        title: 'Provision for mental health services',
        items: [
          { checked: !!d.q3MentalPsych, label: 'Routine examination by psychiatrist / psychologist' },
          { checked: !!d.q3MentalWardDecides, label: 'Ward retains the right to make own decisions' },
          { checked: !!d.q3MentalOutpatient, label: 'Ongoing treatment — outpatient' },
          { checked: !!d.q3MentalInpatient, label: 'Ongoing treatment — inpatient' },
          { checked: !!d.q3MentalNone, label: 'None' },
          { checked: !!d.q3MentalOther, label: 'Other' },
        ],
      },
      ...explainNotice(d.q3MentalExplain),
      {
        type: 'checklist',
        title: 'Provision for personal care (bathing, grooming, feeding)',
        items: [
          { checked: !!d.q3PersonalFacility, label: 'Care facility' },
          { checked: !!d.q3PersonalNurses, label: 'Nurses and aides' },
          { checked: !!d.q3PersonalFamily, label: 'Family and friends' },
          { checked: !!d.q3PersonalWithout, label: 'Ward does without assistance' },
          { checked: !!d.q3PersonalNone, label: 'None; ward can provide own personal care' },
          { checked: !!d.q3PersonalOther, label: 'Other' },
        ],
      },
      ...explainNotice(d.q3PersonalExplain),
      {
        type: 'checklist',
        title: 'Provision for socialization and recreational activities',
        items: [
          { checked: !!d.q3SocialFacility, label: 'Care facility' },
          { checked: !!d.q3SocialNurses, label: 'Nurses and aides' },
          { checked: !!d.q3SocialFamily, label: 'Family and friends' },
          { checked: !!d.q3SocialWardDecides, label: 'The ward retains the right to make their own decision' },
          { checked: !!d.q3SocialNone, label: 'None' },
          { checked: !!d.q3SocialOther, label: 'Other' },
        ],
      },
      ...explainNotice(d.q3SocialExplain),
    ],
  });

  // Page 5: Q3G benefits
  const b = d.benefits || {};
  const planBenefits = typeof window !== 'undefined' && window.PLAN_BENEFITS ? window.PLAN_BENEFITS : [];
  sections.push({
    id: 'q3g',
    title: 'Question 3G',
    bookmarkTitle: 'Question 3G',
    parentBookmark: null,
    level: 1,
    pageBreakBefore: true,
    blocks: [
      {
        type: 'notice',
        title: '3G. Insurance and Benefits',
        text: 'Health and accident insurance and other private or governmental benefits the ward receives toward the cost of medical, mental health or related services.',
      },
      {
        type: 'table',
        headers: ['Benefit', 'Eligible', 'Applied For'],
        colWidths: [60, 20, 20],
        colAlign: ['left', 'center', 'center'],
        rows: planBenefits.map(([k, label]) => {
          const v = b[k] || {};
          return [label, v.eligible ? 'Yes' : 'No', v.appliedFor ? 'Yes' : 'No'];
        }),
      },
      {
        type: 'checklist',
        items: [
          { checked: !!d.q3BenefitsNone, label: 'None of the above' },
          { checked: !!d.q3BenefitsOther, label: 'Other' },
        ],
      },
      ...explainNotice(d.q3BenefitsExplain),
    ],
  });

  // Page 6: Q4 providers
  const provRows = (d.q4Providers || []).filter(r => r && (r.name || r.providerType || r.visits));
  sections.push({
    id: 'q4',
    title: 'Question 4',
    bookmarkTitle: 'Question 4',
    parentBookmark: null,
    level: 1,
    pageBreakBefore: true,
    blocks: [
      provRows.length ? {
        type: 'table',
        title: '4. Professional Medical Treatment During the Prior 12 Months',
        headers: ['#', 'Provider', 'Type', 'Visits'],
        colWidths: [8, 47, 25, 20],
        colAlign: ['left', 'left', 'left', 'left'],
        rows: provRows.map((r, i) => {
          const sub = [r.street, r.cityStateZip, r.phone].filter(Boolean).map(text => ({ text }));
          return [String(i + 1), sub.length ? { main: r.name || '', sub } : (r.name || ''), r.providerType || '', r.visits || ''];
        }),
      } : { type: 'notice', title: '4. Professional Medical Treatment During the Prior 12 Months', text: 'No providers listed.' },
    ],
  });

  // Page 7: Q5-Q7
  const rights = d.rights || {};
  const planRights = typeof window !== 'undefined' && window.PLAN_RIGHTS ? window.PLAN_RIGHTS : [];
  sections.push({
    id: 'q5-q7',
    title: 'Questions 5–7',
    bookmarkTitle: 'Questions 5-7',
    parentBookmark: null,
    level: 1,
    pageBreakBefore: true,
    blocks: [
      {
        type: 'key-value-grid',
        title: '5. Social Skills, Abilities and Activities',
        items: [
          { label: 'Social skills and abilities of the ward', value: d.q5SocialSkills || '' },
          { label: "Activities to increase the ward's capacity, and their effectiveness", value: d.q5Activities || '' },
        ],
      },
      {
        type: 'table',
        title: '6. Rights Assessment',
        headers: ['Right', 'Status'],
        colWidths: [65, 35],
        colAlign: ['left', 'left'],
        rows: planRights.map(([k, label]) => [label, rights[k] || '']),
      },
      {
        type: 'key-value-grid',
        title: "7. Disagreement With the Physician's Report",
        items: [
          { label: 'Explanation', value: d.q7RightsExplain || '' },
        ],
      },
    ],
  });

  // Page 8: Q8 ADLs
  const adls = d.adls || {};
  const planAdls = typeof window !== 'undefined' && window.PLAN_ADLS ? window.PLAN_ADLS : [];
  sections.push({
    id: 'q8',
    title: 'Question 8',
    bookmarkTitle: 'Question 8',
    parentBookmark: null,
    level: 1,
    pageBreakBefore: true,
    blocks: [
      {
        type: 'table',
        title: '8. Activities of Daily Living',
        headers: ['Activity', 'Rating'],
        colWidths: [70, 30],
        colAlign: ['left', 'left'],
        rows: planAdls.map(([k, label]) => [label, adls[k] || '']),
      },
    ],
  });

  // Page 9: Q9 disabilities & assistive devices
  const deviceItems = (pfx) => ([
    { checked: !!d[pfx + 'Dentures'], label: 'Dentures' },
    { checked: !!d[pfx + 'HearingAid'], label: 'Hearing aid' },
    { checked: !!d[pfx + 'Wheelchair'], label: 'Wheelchair' },
    { checked: !!d[pfx + 'Walker'], label: 'Walker / cane' },
    { checked: !!d[pfx + 'Crutches'], label: 'Crutches' },
    { checked: !!d[pfx + 'Prosthetics'], label: 'Prosthetics' },
    { checked: !!d[pfx + 'Glasses'], label: 'Glasses' },
    { checked: !!d[pfx + 'None'], label: 'None' },
    { checked: !!d[pfx + 'Other'], label: 'Other' },
  ]);
  sections.push({
    id: 'q9',
    title: 'Question 9',
    bookmarkTitle: 'Question 9',
    parentBookmark: null,
    level: 1,
    pageBreakBefore: true,
    blocks: [
      {
        type: 'checklist',
        title: '9. Disabilities and Assistive Devices — Mental disabilities of the ward',
        items: [
          { checked: !!d.q9MentalDementia, label: 'Dementia' },
          { checked: !!d.q9MentalAlzheimers, label: "Alzheimer's type of dementia" },
          { checked: !!d.q9MentalAutism, label: 'Autism spectrum disorders' },
          { checked: !!d.q9MentalHeadInjury, label: 'Closed head injury' },
          { checked: !!d.q9MentalDevelopmental, label: 'Developmental disabilities' },
          { checked: !!d.q9MentalIntellectual, label: 'Intellectual disability' },
          { checked: !!d.q9MentalSchizophrenia, label: 'Schizophrenia or related disorders' },
          { checked: !!d.q9MentalDepression, label: 'Depression' },
          { checked: !!d.q9MentalSubstance, label: 'Induced by substance abuse' },
          { checked: !!d.q9MentalNone, label: 'Ward has no mental disabilities' },
          { checked: !!d.q9MentalOther, label: 'Other' },
        ],
      },
      ...explainNotice(d.q9MentalExplain),
      {
        type: 'checklist',
        title: 'Physical disabilities of the ward',
        items: [
          { checked: !!d.q9PhysMobility, label: 'Mobility' },
          { checked: !!d.q9PhysBlindness, label: 'Blindness' },
          { checked: !!d.q9PhysDeafness, label: 'Deafness' },
          { checked: !!d.q9PhysDiabetic, label: 'Diabetic' },
          { checked: !!d.q9PhysParkinsons, label: "Parkinson's disease" },
          { checked: !!d.q9PhysArthritis, label: 'Severe arthritis' },
          { checked: !!d.q9PhysNone, label: 'Ward has no physical disabilities' },
          { checked: !!d.q9PhysOther, label: 'Other' },
        ],
      },
      ...explainNotice(d.q9PhysExplain),
      { type: 'checklist', title: 'Assistive devices currently used', items: deviceItems('q9Uses') },
      ...explainNotice(d.q9UsesExplain),
      { type: 'checklist', title: 'Assistive devices needed but not yet obtained', items: deviceItems('q9Needs') },
      ...explainNotice(d.q9NeedsExplain),
    ],
  });

  // Page 10: Q10 directives
  const dirs = (d.q10Directives || []).filter(r => r && (r.title || r.dateSigned || r.signedBy));
  sections.push({
    id: 'q10',
    title: 'Question 10',
    bookmarkTitle: 'Question 10',
    parentBookmark: null,
    level: 1,
    pageBreakBefore: true,
    blocks: [
      {
        type: 'checklist',
        title: '10. Advance Directives',
        items: [{ checked: !!d.q10NoDirectives, label: 'There are NO pre-existing DNR orders or other advance directives.' }],
      },
      ...(d.q10NoDirectives ? [{
        type: 'checklist',
        title: 'Steps taken to verify',
        items: [
          { checked: !!d.q10StepResidence, label: "Search of ward's prior and current residence" },
          { checked: !!d.q10StepSafeDeposit, label: "Inventory of ward's safe deposit box" },
          { checked: !!d.q10StepInterviewed, label: 'Interviewed family and friends' },
          { checked: !!d.q10StepMedicalProviders, label: "Requested documents from the ward's medical providers" },
          { checked: !!d.q10StepAttorney, label: "Requested documents from the ward's attorney" },
        ],
      }] : []),
      {
        type: 'checklist',
        items: [{ checked: !!d.q10Executed, label: 'The ward executed the following advance directives:' }],
      },
      ...(d.q10Executed ? [{
        type: 'checklist',
        items: [
          { checked: !!d.q10ExecDNR, label: 'Order Not to Resuscitate (DNR), F.S. 401.45(3)' },
          { checked: !!d.q10ExecHealthcare, label: 'Advance Directive for Healthcare (surrogate, living will, anatomical gift)' },
          { checked: !!d.q10ExecPOA, label: 'Durable Power of Attorney, F.S. Chapter 709' },
          { checked: !!d.q10ExecOther, label: `Other${d.q10ExecOtherText ? ' — ' + d.q10ExecOtherText : ''}` },
        ],
      }] : []),
      ...(dirs.length ? dirs.map((r, i) => ({
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
      })) : []),
    ],
  });

  // Page 11: Q11 remuneration
  sections.push({
    id: 'q11',
    title: 'Question 11',
    bookmarkTitle: 'Question 11',
    parentBookmark: null,
    level: 1,
    pageBreakBefore: true,
    blocks: [
      {
        type: 'notice',
        title: '11. Declaration of Remuneration',
        text: 'Each guardian must declare any remuneration from any source for services rendered to or on behalf of the ward. Remuneration means any payment or other benefit made directly or indirectly, overtly or covertly, or in cash or in kind to the guardian. F.S. 744.367(3)(a).',
      },
      d.q11NoRemuneration
        ? { type: 'notice', text: `I, ${d.q11NoRemunerationName || ''}, declare that I have received NO remuneration from any source for services rendered to or on behalf of the ward.` }
        : { type: 'notice', text: `I, ${d.q11ReceivedName || ''}, declare that I have received the monies ${d.q11Amount || ''} from ${d.q11From || ''} for services rendered on behalf of the ward.` },
      ...(!d.q11NoRemuneration ? [{
        type: 'checklist',
        items: [{ checked: !!d.q11SubmittedToCourt, label: 'All requests for reimbursement or fees have been submitted to the court for review and approval.' }],
      }] : []),
    ],
  });

  // A signature block respecting useSlashS slider state
  const makeSigBlock = (role, p) => ({
    type: 'signature-block',
    role,
    signerName: p.name || '',
    useSlashS: p.useSlashS !== false,
    wetSignature: p.useSlashS === false,
    signatureDate: fmtDate(p.signatureDate),
    fields: [
      [{ label: 'Printed Name', value: p.name || '' }, { label: 'SSN / EIN', value: p.ssn || '' }, { label: 'Phone Number', value: p.phone || '' }],
      [{ label: 'Email Address', value: p.email || '' }, { label: 'Relationship to Ward', value: p.relationship || '' }],
      [{ label: 'Mailing Street Address', value: p.mailingStreet || '' }, { label: 'Mailing City / State / ZIP', value: p.mailingCityStateZip || '' }],
      [{ label: 'Residence or Office Street Address', value: p.officeStreet || '' }, { label: 'Residence or Office City / State / ZIP', value: p.officeCityStateZip || '' }],
    ],
  });

  // Page 12: Certification + guardian signatures
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
          { checked: !!d.certIncapacitatedNoCopy, label: 'The ward was declared totally incapacitated and has not been given a copy of this plan.' },
          { checked: !!d.certMinorNoCopy, label: 'The ward is a minor and has not been given a copy of this plan.' },
          { checked: !!d.certConsulted, label: "The guardian has consulted with the ward, to the extent reasonable, has honored the ward's wishes, and to the maximum extent possible the plan is in accordance with them." },
          { checked: !!d.certNoRestriction, label: 'The plan does not restrict the physical liberty of the ward except as necessary to protect the ward and others from serious physical injury, illness, or disease.' },
          { checked: !!d.certProvidesMedical, label: "The plan provides for the ward's medical care and mental health treatment." },
          { checked: !!d.certPhysicianAttached, label: "The physician's statement of an examination of the ward no more than 90 days before the beginning of the plan period is attached." },
          { checked: !!d.certRecognizeRights, label: 'In exercising his or her powers, the guardian shall recognize any rights retained by the ward [F.S. 744.363(6)].' },
        ],
      },
      ...(d.certRightsChangedExplain ? [{ type: 'notice', text: `Explanation for no change in rights: ${d.certRightsChangedExplain}` }] : []),
      {
        type: 'notice',
        text: 'UNDER PENALTIES OF PERJURY, I declare that I have read and examined the foregoing plan, and the facts alleged are true, to the best of my knowledge and belief.',
      },
      makeSigBlock('Guardian', g[0] || {}),
    ],
  });

  // Page 13: Additional co-guardian signatures (conditional)
  const extras = (g || []).slice(1).filter(p => p && (p.name || p.signatureDate));
  if (extras.length) {
    sections.push({
      id: 'certification-extra',
      title: 'Certification (cont.)',
      bookmarkTitle: 'Additional Guardian Signatures',
      parentBookmark: null,
      level: 1,
      pageBreakBefore: true,
      blocks: [
        { type: 'notice', title: 'Additional Guardian Signatures', text: '' },
        ...extras.map((p, i) => makeSigBlock(`Co-Guardian ${i + 2}`, p)),
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
        text: `The undersigned hereby notifies the court of the filing of the annual guardianship plan for the period ${fmtDate(d.periodFrom)} through ${fmtDate(d.periodTo)}. This annual guardianship plan is the representation of the guardian. I have not audited the accompanying annual plan. The undersigned attorney represents that he/she has examined the contents of the annual guardianship plan and that it conforms to the requirements of the Florida Guardianship Law and the standards for plans in ${county} County.`,
      },
      {
        type: 'signature-block',
        role: "Guardian's Attorney",
        signerName: d.attorney || '',
        useSlashS: d.attorney_useSlashS !== false,
        wetSignature: d.attorney_useSlashS === false,
        signatureDate: fmtDate(d.attorney_signatureDate),
        fields: [
          [{ label: 'Attorney Name', value: d.attorney || '' }, { label: 'Florida Bar Number', value: d.attorney_bar || '' }, { label: 'Telephone', value: d.attorney_phone || '' }],
          [{ label: 'Primary Email', value: d.attorney_email || '' }, { label: 'Secondary Email', value: d.attorney_secondary_email || '' }],
          [{ label: 'Street Address', value: d.attorney_street || '' }, { label: 'City / State / ZIP', value: d.attorney_cityStateZip || '' }],
        ],
      },
    ],
  });

  return { metadata, sections };
}
