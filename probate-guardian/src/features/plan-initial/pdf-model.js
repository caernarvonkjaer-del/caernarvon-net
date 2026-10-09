// Structured intermediate representation for Initial Guardianship Plan PDF
// generation (Milestone 19-2). Maps the same window.D fields that
// buildPrintHTMLPlanInitial() (print.js) renders as HTML onto the shared
// tagged/vector PDF engine's block vocabulary, replacing the raster
// html2pdf/html2canvas export with a tagged, accessible, non-raster PDF.

import { BLANK_DATE_LINE, dateOrLine, displayDate } from '../../core/form/date-parser.js';
import { resolveDescriptorForInventoryType } from '../../core/filing/filing-descriptor.js';
import { planCertificateOfServiceSection } from '../../core/filing/plan-certificate-of-service.js';
import { triStateText } from '../../core/form/form-contract.js';
import { maskSSN } from '../../core/pdf/ssn-format.js';
import { rowStarted, startedRows } from '../../core/validation/row-started.js';
import { INITIAL_ADLS } from '../../core/filing/models/plan-initial.js';
import { PLAN_INITIAL_EXPLANATIONS, shownExplanation } from '../../core/filing/plan-explanations.js';
import { resolveSignatureModes } from '../../core/pdf/signature-modes.js';
import { withSameAddresses } from '../../core/form/same-address.js';
import {
  PLAN_INITIAL_BENEFITS, PLAN_INITIAL_CHOICES as C, PLAN_INITIAL_DEVICES, PLAN_INITIAL_DIRECTIVE_LABELS as DL, PLAN_INITIAL_TEXT as T,
  numbered, planInitialAttorneyCertification,
} from '../../core/filing/court-text/plan-initial.js';

export function buildPlanInitialModel(D, options) {
  // Milestone 74P: a ticked "same as" files the first address in the second.
  const d = withSameAddresses(D || {});
  const signatureStyle = (options && options.signatureStyle) || d.signatureStyle || 'typed';
  const wardName = (d.wardName || 'Ward').trim();
  const caseNumber = (d.caseNumber || '').trim();
  // Milestone 40C-A item 6: output must never invent a county. A blank one
  // yields no court caption at all (see core/pdf/circuit-lookup.js); export is
  // already blocked by this form's County validation.
  const county = d.county || '';
  const descriptor = resolveDescriptorForInventoryType('planInitial');

  // Milestone 73H: a date as every screen and PDF shows it (displayDate());
  // in a sentence or a labelled field a blank date prints a line to write it
  // on (dateOrLine(), decision 73H-2). A table cell and a signature block's
  // date stay blank (73H-N2).
  const fmtDate = displayDate;

  const metadata = {
    title: `${wardName} - ${caseNumber} - Initial Guardianship Plan`,
    subject: 'Initial Guardianship Plan',
    author: 'Guardian Forms',
    creator: 'Guardian Forms',
    formName: 'INITIAL GUARDIANSHIP PLAN',
    formSubtitle: 'Initial Guardianship Plan',
    keywords: 'Florida, Probate, Guardianship, Initial Guardianship Plan',
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
        text: 'Pursuant to F.S. 744.362(1), this report with original signatures is due within 60 days after the Letters of Guardianship are signed, and remains in effect until amended or replaced by the approval of an Annual Guardianship Plan.',
      },
      {
        type: 'key-value-grid',
        items: [
          { label: 'Case Number', value: caseNumber },
          { label: 'Successor Guardianship', value: d.successorGuardianship || '' },
          { label: 'Guardianship Inception Date', value: dateOrLine(d.inceptionDate) },
          { label: 'Date Letters Were Signed', value: dateOrLine(d.lettersSignedDate) },
          { label: 'For the period', value: `${dateOrLine(d.periodFrom)} through ${dateOrLine(d.periodTo)}` },
          { label: 'Guardian Name(s)', value: d.guardianNames || '' },
          { label: 'Attorney Name', value: d.attorneyName || '' },
        ],
      },
      {
        type: 'checklist',
        title: T.wardLiving,
        items: [
          { checked: d.wardLiving === 'In a private residence leased or owned by them (house, condo or apartment)', label: T.livingOwned },
          { checked: d.wardLiving === 'In a private residence not leased or owned by them (such as family member)', label: T.livingNotOwned },
          { checked: d.wardLiving === 'In a facility (Skilled Nursing, Assisted Living, etc.)', label: T.livingFacility },
        ],
      },
      {
        type: 'key-value-grid',
        title: T.residence,
        items: [
          { label: 'Address', value: d.residenceAddress || '' },
          { label: 'City, State, ZIP', value: d.residenceCityStateZip || '' },
          { label: 'Phone', value: d.residencePhone || '' },
          { label: 'Mailing Address (if different)', value: d.mailingAddress || '' },
          { label: 'Mailing City, State, ZIP', value: d.mailingCityStateZip || '' },
        ],
      },
      { type: 'notice', text: T.submits },
      // Milestone 73N part 2: Question 1 in full, across the page.
      { type: 'question', question: numbered(1, T.q1), answer: d.q1PreexistingDirectives || '' },
    ],
  });

  // Page 2: Q2-Q5
  // Milestone 73D: an Explanation is filed only while the page shows its box
  // (plan-explanations.js); hidden text is kept, not filed.
  const explainNotice = (id) => {
    const text = shownExplanation(PLAN_INITIAL_EXPLANATIONS, d, id);
    return text ? [{ type: 'notice', text: `Explanation: ${text}` }] : [];
  };
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
        title: numbered(2, T.q2),
        items: [
          { checked: !!d.q2ALF, label: C.q2ALF },
          { checked: !!d.q2GroupHome, label: C.q2GroupHome },
          { checked: !!d.q2Intermediate, label: C.q2Intermediate },
          { checked: !!d.q2PrivateResidence, label: C.q2PrivateResidence },
          { checked: !!d.q2SkilledNursing, label: C.q2SkilledNursing },
          { checked: !!d.q2Specialized, label: C.q2Specialized },
          { checked: !!d.q2StateHospital, label: C.q2StateHospital },
          { checked: !!d.q2Other, label: C.q2Other },
        ],
      },
      ...explainNotice('q2Explain'),
      {
        type: 'checklist',
        title: numbered(3, T.q3),
        items: [
          { checked: !!d.q3MedPrimary, label: C.q3MedPrimary },
          { checked: !!d.q3MedDentist, label: C.q3MedDentist },
          { checked: !!d.q3MedOphthalmologist, label: C.q3MedOphthalmologist },
          { checked: !!d.q3MedSpecialist, label: `${C.q3MedSpecialist}${d.q3MedSpecialistArea ? ' ' + d.q3MedSpecialistArea : ''}` },
          { checked: !!d.q3MedPT, label: C.q3MedPT },
          { checked: !!d.q3MedST, label: C.q3MedST },
          { checked: !!d.q3MedOT, label: C.q3MedOT },
          { checked: !!d.q3MedWardDecides, label: C.q3MedWardDecides },
          { checked: !!d.q3MedOther, label: C.q3MedOther },
        ],
      },
      ...explainNotice('q3MedExplain'),
      {
        type: 'checklist',
        title: numbered(4, T.q4),
        items: [
          { checked: !!d.q4Psych, label: C.q4Psych },
          { checked: !!d.q4Outpatient, label: C.q4Outpatient },
          { checked: !!d.q4Inpatient, label: C.q4Inpatient },
          { checked: !!d.q4None, label: C.q4None },
          { checked: !!d.q4Other, label: C.q4Other },
        ],
      },
      ...explainNotice('q4Explain'),
      {
        type: 'checklist',
        title: numbered(5, T.q5),
        items: [
          { checked: !!d.q5CareFacility, label: C.q5CareFacility },
          { checked: !!d.q5NursesAides, label: C.q5NursesAides },
          { checked: !!d.q5FamilyFriends, label: C.q5FamilyFriends },
          { checked: !!d.q5Other, label: C.q5Other },
        ],
      },
      ...explainNotice('q5Explain'),
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
        title: numbered(6, T.q6),
        items: [
          { checked: !!d.q6CareFacility, label: C.q6CareFacility },
          { checked: !!d.q6NursesAides, label: C.q6NursesAides },
          { checked: !!d.q6FamilyFriends, label: C.q6FamilyFriends },
          { checked: !!d.q6DayProgram, label: C.q6DayProgram },
          { checked: !!d.q6WardDecides, label: C.q6WardDecides },
          { checked: !!d.q6Other, label: C.q6Other },
        ],
      },
      ...explainNotice('q6Explain'),
      {
        type: 'table',
        title: numbered(7, T.q7),
        headers: ['Benefit', 'Status'],
        colWidths: [78, 22],
        colAlign: ['left', 'center'],
        rows: PLAN_INITIAL_BENEFITS.map(([key, label]) => [label, triStateText(d[key]) || '—']),
      },
      { type: 'checklist', items: [{ checked: !!d.q7Other, label: C.q7Other }] },
      ...explainNotice('q7Explain'),
    ],
  });

  // Page 4: Q9 examining providers
  // Milestone 61B: an address- or phone-only provider row prints.
  const provRows = startedRows(d.q9Providers);
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
        title: numbered(9, T.q9),
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
        title: numbered(9, T.q9),
        text: 'No providers listed.',
      },
    ],
  });

  // Page 5: Q10A ADLs
  const adls = d.adls || {};
  const initialAdls = INITIAL_ADLS;
  sections.push({
    id: 'q10a',
    title: 'Question 10A',
    bookmarkTitle: 'Question 10A',
    parentBookmark: null,
    level: 1,
    pageBreakBefore: true,
    blocks: [
      { type: 'notice', title: numbered(10, T.q10), text: '' },
      {
        type: 'table',
        title: T.q10A,
        headers: ['Activity', 'Rating'],
        colWidths: [70, 30],
        colAlign: ['left', 'left'],
        rows: initialAdls.map(([k, label]) => [label, adls[k] || '']),
      },
    ],
  });

  // Page 6: Q10B-F
  const devices = (prefix) => PLAN_INITIAL_DEVICES.map(([suffix, label]) => ({ checked: !!d[prefix + suffix], label }));
  sections.push({
    id: 'q10b-d',
    title: 'Question 10B–F',
    bookmarkTitle: 'Question 10B-F',
    parentBookmark: null,
    level: 1,
    pageBreakBefore: true,
    blocks: [
      {
        type: 'checklist',
        title: T.q10B,
        items: [
          { checked: !!d.mentalAlzheimers, label: C.mentalAlzheimers },
          { checked: !!d.mentalAutism, label: C.mentalAutism },
          { checked: !!d.mentalClosedHeadInjury, label: C.mentalClosedHeadInjury },
          { checked: !!d.mentalDementia, label: C.mentalDementia },
          { checked: !!d.mentalDepression, label: C.mentalDepression },
          { checked: !!d.mentalDevelopmental, label: C.mentalDevelopmental },
          { checked: !!d.mentalSubstance, label: C.mentalSubstance },
          { checked: !!d.mentalSchizophrenia, label: C.mentalSchizophrenia },
          { checked: !!d.mentalOther, label: C.mentalOther },
        ],
      },
      ...explainNotice('mentalExplain'),
      {
        type: 'checklist',
        title: T.q10C,
        items: [
          { checked: !!d.physMobility, label: C.physMobility },
          { checked: !!d.physBlindness, label: C.physBlindness },
          { checked: !!d.physDeafness, label: C.physDeafness },
          { checked: !!d.physDiabetic, label: C.physDiabetic },
          { checked: !!d.physParkinsons, label: C.physParkinsons },
          { checked: !!d.physArthritis, label: C.physArthritis },
          { checked: !!d.physOther, label: C.physOther },
        ],
      },
      ...explainNotice('physExplain'),
      { type: 'checklist', title: T.q10D, items: devices('uses') },
      ...explainNotice('usesExplain'),
      // Milestone 73N part 2: 10E and 10F follow 10D, as the form has them;
      // they printed after Question 11.
      { type: 'checklist', title: T.q10E, items: devices('needs') },
      ...explainNotice('needsExplain'),
      {
        type: 'checklist',
        title: T.q10F,
        items: [
          { checked: triStateText(d.committeeIncorporated) === 'Yes', label: 'Yes' },
          { checked: triStateText(d.committeeIncorporated) === 'No', label: 'No' },
        ],
      },
      ...explainNotice('committeeExplain'),
    ],
  });

  // Page 7: Q11 (the id is the one supporting documents are filed under)
  sections.push({
    id: 'q11-10ef',
    title: 'Question 11',
    bookmarkTitle: 'Question 11',
    parentBookmark: null,
    level: 1,
    pageBreakBefore: true,
    blocks: [
      {
        type: 'checklist',
        items: [
          { checked: !!d.q11NoDirectives, label: numbered(11, T.q11NoDirectives) },
        ],
      },
      ...(d.q11NoDirectives ? [{
        type: 'checklist',
        items: [
          { checked: !!d.q11StepResidence, label: C.q11StepResidence },
          { checked: !!d.q11StepSafeDeposit, label: C.q11StepSafeDeposit },
          { checked: !!d.q11StepInterviewed, label: C.q11StepInterviewed },
          { checked: !!d.q11StepMedicalProviders, label: C.q11StepMedicalProviders },
          { checked: !!d.q11StepAttorney, label: C.q11StepAttorney },
        ],
      }] : []),
      {
        type: 'checklist',
        items: [
          { checked: !!d.q11Executed, label: T.q11Executed },
        ],
      },
      ...(d.q11Executed ? [{
        type: 'checklist',
        items: [
          { checked: !!d.q11ExecDNR, label: C.q11ExecDNR },
          { checked: !!d.q11ExecHealthcare, label: C.q11ExecHealthcare },
          { checked: !!d.q11ExecPOA, label: C.q11ExecPOA },
          { checked: !!d.q11ExecOther, label: `${C.q11ExecOther}${shownExplanation(PLAN_INITIAL_EXPLANATIONS, d, 'q11ExecOtherText') ? ' ' + d.q11ExecOtherText : ''}` },
        ],
      }] : []),
    ],
  });

  // Page 8: Advance directive detail. Milestone 37-4: gated on q11Executed,
  // not just on populated rows -- legacy/imported data can carry directive
  // records while execution is unchecked (hidden in the UI), and the output
  // must agree with what the filer currently sees, not with leftover data.
  // Milestone 61B: gate on q11Executed unchanged (37-4); row test widened.
  const dirs = d.q11Executed ? startedRows(d.q11Directives) : [];
  sections.push({
    id: 'directive-detail',
    title: 'Advance Directive Detail',
    bookmarkTitle: 'Advance Directive Detail',
    parentBookmark: null,
    level: 1,
    pageBreakBefore: true,
    blocks: dirs.length ? [{ type: 'notice', title: T.q11ForAny, text: '' }, ...dirs.map((r, i) => ({
      type: 'key-value-grid',
      title: `Directive ${i + 1}`,
      items: [
        { label: DL.title, value: r.title || '' },
        { label: DL.dateSigned, value: dateOrLine(r.dateSigned) },
        { label: DL.signedBy, value: r.signedBy || '' },
        { label: DL.agents, value: r.agents || '' },
        { label: DL.alternates, value: r.alternates || '' },
        { label: DL.relationship, value: r.relationship || '' },
        { label: DL.contact, value: r.contact || '' },
        { label: DL.courtRevoked, value: r.courtRevoked || '' },
        ...(r.orderDate || r.orderCounty ? [{ label: DL.orderDate, value: `${r.orderDate ? fmtDate(r.orderDate) : BLANK_DATE_LINE}${r.orderCounty ? ' entered ' + r.orderCounty : ''}` }] : []),
      ],
    }))] : [{ type: 'notice', text: 'No advance directives on file.' }],
  });

  const makeSigBlock = (role, p) => {
    return {
      type: 'signature-block',
      role,
      signerRole: 'guardian',
      signerName: p.name || '',
      signatureDate: fmtDate(p.signatureDate),
      signatureStyle,
      // Milestone 39-C
      signatureState: p.signatureState || '',
      signatureImage: p.signatureImage || '',
      fields: [
        [{ label: 'Printed Name', value: p.name || '' }, { label: 'SSN / EIN', value: maskSSN(p.ssn || '') }, { label: 'Phone Number', value: p.phone || '' }],
        [{ label: 'Relationship to Ward', value: p.relationship || '' }, { label: 'Street Address', value: p.street || '' }, { label: 'City / State / ZIP', value: p.cityStateZip || '' }],
        // Milestone 72C: the signer's email for service (Rule 2.515(c)), as the other Plans print it.
        [{ label: 'Email Address', value: p.email || '' }],
      ],
    };
  };

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
      // Milestone 73N part 2: the form's preamble prints above the statements.
      { type: 'notice', title: T.certTitle, text: T.certPreamble },
      {
        type: 'checklist',
        title: T.certCheckAll,
        items: [
          { checked: !!d.certIncapacitatedNoCopy, label: C.certIncapacitatedNoCopy },
          { checked: !!d.certMinorNoCopy, label: C.certMinorNoCopy },
          { checked: !!d.certConsulted, label: C.certConsulted },
          { checked: !!d.certRecognizeRights, label: C.certRecognizeRights },
          { checked: !!d.certNoRestriction, label: C.certNoRestriction },
          { checked: !!d.certProvidesCare, label: C.certProvidesCare },
        ],
      },
      {
        type: 'notice',
        text: T.perjury,
      },
      makeSigBlock('Guardian', g[0] || {}),
      // Optional co-guardian placeholders are editor affordances, not signed
      // filing content. Render only a meaningfully populated second signer.
      // Milestone 61C: was a six-field list that omitted `relationship`,
      // so a co-guardian identified only by their relationship to the
      // ward disappeared. Asks the row instead of naming fields.
      ...(rowStarted(g[1]) ? [makeSigBlock('Co-Guardian', g[1])] : []),
    ],
  });

  // Page 10: Additional co-guardian signatures (conditional)
  // Milestone 61C: see the Co-Guardian note above.
  const extras = startedRows((g || []).slice(2));
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
        ...extras.map((p, i) => makeSigBlock(`Co-Guardian ${i + 3}`, p)),
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
        text: planInitialAttorneyCertification(dateOrLine(d.periodFrom), dateOrLine(d.periodTo), county),
      },
      {
        type: 'signature-block',
        role: "Guardian's Attorney",
        signerRole: 'attorney',
        signerName: d.attorney_name || '',
        signatureDate: fmtDate(d.attorney_signatureDate),
        signatureStyle,
        // Milestone 39-C
        signatureState: d.attorney_signatureState || '',
        signatureImage: d.attorney_signatureImage || '',
        fields: [
          [{ label: 'Attorney Name', value: d.attorney_name || '' }, { label: 'Bar Number', value: d.attorney_bar || '' }, { label: 'Phone Number', value: d.attorney_phone || '' }],
          [{ label: 'Primary Email', value: d.attorney_email || '' }, ...(d.attorney_secondaryEmail ? [{ label: 'Secondary Email', value: d.attorney_secondaryEmail }] : [])],
          [{ label: 'Street Address', value: d.attorney_street || '' }, { label: 'City / State / ZIP', value: d.attorney_cityStateZip || '' }],
        ],
      },
    ],
  });

  // Milestone 68C: the Certificate of Service, last, on every Plan.
  sections.push(planCertificateOfServiceSection(d, { attorneyName: (f) => f.attorney_name || '', planNoun: 'plan' }, fmtDate));

  // Milestone 73A: each signature block's print mode, from its signer's role
  // and the year's signature policy (src/core/pdf/signature-modes.js).
  return resolveSignatureModes({ metadata, sections }, d);
}
