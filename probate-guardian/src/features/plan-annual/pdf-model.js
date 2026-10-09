// Structured intermediate representation for Annual Guardianship Plan PDF
// generation (Milestone 19-2). Maps the same window.D fields that
// buildPrintHTMLPlanAnnual() (print.js) renders as HTML onto the shared
// tagged/vector PDF engine's block vocabulary, replacing the raster
// html2pdf/html2canvas export with a tagged, accessible, non-raster PDF.

import { BLANK_DATE_LINE, dateOrLine, displayDate } from '../../core/form/date-parser.js';
import { amountForStore, presentAmount } from '../../core/form/amount-codec.js';
import { resolveDescriptorForInventoryType } from '../../core/filing/filing-descriptor.js';
import { planCertificateOfServiceSection } from '../../core/filing/plan-certificate-of-service.js';
import { maskSSN } from '../../core/pdf/ssn-format.js';
import { startedRows } from '../../core/validation/row-started.js';
import { PLAN_ADLS, PLAN_BENEFITS, PLAN_RIGHTS, planRightLabel } from '../../core/filing/models/plan-annual.js';
import { PLAN_ANNUAL_EXPLANATIONS, shownExplanation } from '../../core/filing/plan-explanations.js';
import { resolveSignatureModes } from '../../core/pdf/signature-modes.js';
import { withSameAddresses } from '../../core/form/same-address.js';
import { hasSixthCircuitLocalGuidance } from '../../core/filing/county-guidance.js';
import {
  PLAN_ANNUAL_CHOICES as C, PLAN_ANNUAL_DEVICES, PLAN_ANNUAL_DIRECTIVE_LABELS as DL, PLAN_ANNUAL_TEXT as T,
  numbered, planAnnualAttorneyCertification, planAnnualMoveChoices, planAnnualNoRemuneration, planAnnualReceived,
} from '../../core/filing/court-text/plan-annual.js';

export function buildPlanAnnualModel(D) {
  // Milestone 74P: a ticked "same as" files the first address in the second.
  const d = withSameAddresses(D || {});
  const wardName = (d.wardName || 'Ward').trim();
  const caseNumber = (d.caseNumber || '').trim();
  // Milestone 40C-A item 6: output must never invent a county. A blank one
  // yields no court caption at all (see core/pdf/circuit-lookup.js); export is
  // already blocked by this form's County validation.
  const county = d.county || '';
  const attorneySecondaryEmail = d.attorney_secondary_email || d.attorney_secondaryEmail || '';
  const descriptor = resolveDescriptorForInventoryType('planAnnual');

  // Milestone 73H: a date as every screen and PDF shows it (displayDate());
  // in a sentence or a labelled field a blank date prints a line to write it
  // on (dateOrLine(), decision 73H-2). A table cell and a signature block's
  // date stay blank (73H-N2).
  const fmtDate = displayDate;

  const metadata = {
    title: `${wardName} - ${caseNumber} - Annual Guardianship Plan`,
    subject: 'Annual Guardianship Plan',
    author: 'Guardian Forms',
    creator: 'Guardian Forms',
    formName: 'ANNUAL GUARDIANSHIP PLAN',
    formSubtitle: 'Annual Guardianship Plan',
    keywords: 'Florida, Probate, Guardianship, Annual Guardianship Plan',
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
  // Milestone 73N part 2: Question 2 names the Sixth Circuit's counties only
  // on a Pinellas or Pasco filing (decided 2026-10-09).
  const moves = planAnnualMoveChoices(hasSixthCircuitLocalGuidance(county));
  // Milestone 73D: an Explanation is filed only while the page shows its box
  // (plan-explanations.js); hidden text is kept, not filed.
  const explainNotice = (id) => {
    const text = shownExplanation(PLAN_ANNUAL_EXPLANATIONS, d, id);
    return text ? [{ type: 'notice', text: `Explanation: ${text}` }] : [];
  };

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
        text: T.due,
      },
      {
        type: 'key-value-grid',
        items: [
          { label: 'Social Security Number', value: maskSSN(d.ssn || '') },
          { label: 'Guardianship Inception Date', value: dateOrLine(d.gid) },
          { label: 'For the period', value: `${dateOrLine(d.periodFrom)} through ${dateOrLine(d.periodTo)}` },
          { label: 'Guardian Name(s)', value: d.guardian || '' },
          { label: 'Attorney Name', value: d.attorney || '' },
        ],
      },
      {
        type: 'checklist',
        title: T.wardLiving,
        items: [
          { checked: d.wardLiving === 'In a private residence leased or owned by them', label: T.livingOwned },
          { checked: d.wardLiving === 'In a private residence not leased or owned by them', label: T.livingNotOwned },
          { checked: d.wardLiving === 'In a facility (skilled nursing, assisted living, etc.)', label: T.livingFacility },
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
      {
        type: 'notice',
        text: T.submits,
      },
      // Milestone 61D. "Note 1" on the court's own form
      // (reference/plan-forms/plan-annual-original.txt:46-49), which this
      // model had never carried. Its companion on that page -- the Disaster
      // Plan note -- stays out deliberately: that one is a Sixth Circuit
      // local requirement, delivered county-gated through Help, and
      // tests/unit/content-corrections.spec.js keeps circuit-specific
      // Administrative Orders out of generated documents entirely.
      {
        type: 'notice',
        text: T.note1,
      },
    ],
  });

  // Page 2: Q1 residences
  // Milestone 61B: any entered field puts the row on the filed plan. The old
  // name/street/cityStateZip test dropped a residence the filer had given a
  // phone number or dates but not yet named.
  const resRows = startedRows(d.q1Residences);
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
        title: numbered(1, T.q1),
        headers: ['#', 'Facility / Residence', 'Type', 'From', 'To'],
        colWidths: [6, 44, 20, 15, 15],
        colAlign: ['left', 'left', 'left', 'left', 'left'],
        rows: resRows.map((r, i) => {
          const sub = [r.street, r.cityStateZip, r.phone].filter(Boolean).map(text => ({ text }));
          return [String(i + 1), sub.length ? { main: r.name || '', sub } : (r.name || ''), r.facilityType || '', fmtDate(r.from), fmtDate(r.to)];
        }),
      } : { type: 'notice', title: numbered(1, T.q1), text: 'No residences listed.' },
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
        title: numbered(2, T.q2),
        items: [
          { checked: !!d.q2NoMove, label: T.q2NoMove },
          { checked: !!d.q2WithinCounty, label: T.q2WithinCounty },
          { checked: !!d.q2WithinCircuit, label: moves.q2WithinCircuit },
          { checked: !!d.q2OutsideApproved, label: moves.q2OutsideApproved },
          { checked: !!d.q2OutsideVenuePetition, label: moves.q2OutsideVenuePetition },
        ],
      },
      { type: 'notice', title: numbered(3, T.q3), text: '' },
      {
        type: 'checklist',
        title: T.q3A,
        items: [
          { checked: !!d.q3SettingALF, label: C.q3SettingALF },
          { checked: !!d.q3SettingGroupHome, label: C.q3SettingGroupHome },
          { checked: !!d.q3SettingIntermediate, label: C.q3SettingIntermediate },
          { checked: !!d.q3SettingPrivate, label: C.q3SettingPrivate },
          { checked: !!d.q3SettingSkilled, label: C.q3SettingSkilled },
          { checked: !!d.q3SettingSpecialized, label: C.q3SettingSpecialized },
          { checked: !!d.q3SettingStateHospital, label: C.q3SettingStateHospital },
          { checked: !!d.q3SettingOther, label: C.q3SettingOther },
        ],
      },
      ...explainNotice('q3SettingExplain'),
      {
        type: 'checklist',
        title: T.q3B,
        items: [
          { checked: !!d.q3EnsureAssessing, label: C.q3EnsureAssessing },
          { checked: !!d.q3EnsureWardDecides, label: C.q3EnsureWardDecides },
          { checked: !!d.q3EnsureNoChange, label: C.q3EnsureNoChange },
        ],
      },
      {
        type: 'checklist',
        title: `${T.q3C} ${T.checkAll}`,
        items: [
          { checked: !!d.q3MedPrimary, label: C.q3MedPrimary },
          { checked: !!d.q3MedDentist, label: C.q3MedDentist },
          { checked: !!d.q3MedOphthalmologist, label: C.q3MedOphthalmologist },
          { checked: !!d.q3MedSpecialist, label: `${C.q3MedSpecialist}${d.q3MedSpecialistArea ? ': ' + d.q3MedSpecialistArea : ''}` },
          { checked: !!d.q3MedPhysicalTherapy, label: C.q3MedPhysicalTherapy },
          { checked: !!d.q3MedSpeechTherapy, label: C.q3MedSpeechTherapy },
          { checked: !!d.q3MedOccupationalTherapy, label: C.q3MedOccupationalTherapy },
          { checked: !!d.q3MedWardDecides, label: C.q3MedWardDecides },
          { checked: !!d.q3MedNone, label: C.q3MedNone },
          { checked: !!d.q3MedOther, label: C.q3MedOther },
        ],
      },
      ...explainNotice('q3MedExplain'),
      {
        type: 'checklist',
        title: `${T.q3D} ${T.checkAll}`,
        items: [
          { checked: !!d.q3MentalPsych, label: C.q3MentalPsych },
          { checked: !!d.q3MentalWardDecides, label: C.q3MentalWardDecides },
          { checked: !!d.q3MentalOutpatient, label: C.q3MentalOutpatient },
          { checked: !!d.q3MentalInpatient, label: C.q3MentalInpatient },
          { checked: !!d.q3MentalNone, label: C.q3MentalNone },
          { checked: !!d.q3MentalOther, label: C.q3MentalOther },
        ],
      },
      ...explainNotice('q3MentalExplain'),
      {
        type: 'checklist',
        title: `${T.q3E} ${T.checkAll}`,
        items: [
          { checked: !!d.q3PersonalFacility, label: C.q3PersonalFacility },
          { checked: !!d.q3PersonalNurses, label: C.q3PersonalNurses },
          { checked: !!d.q3PersonalFamily, label: C.q3PersonalFamily },
          { checked: !!d.q3PersonalWithout, label: C.q3PersonalWithout },
          { checked: !!d.q3PersonalNone, label: C.q3PersonalNone },
          { checked: !!d.q3PersonalOther, label: C.q3PersonalOther },
        ],
      },
      ...explainNotice('q3PersonalExplain'),
      {
        type: 'checklist',
        title: `${T.q3F} ${T.checkAll}`,
        items: [
          { checked: !!d.q3SocialFacility, label: C.q3SocialFacility },
          { checked: !!d.q3SocialNurses, label: C.q3SocialNurses },
          { checked: !!d.q3SocialFamily, label: C.q3SocialFamily },
          { checked: !!d.q3SocialWardDecides, label: C.q3SocialWardDecides },
          { checked: !!d.q3SocialNone, label: C.q3SocialNone },
          { checked: !!d.q3SocialOther, label: C.q3SocialOther },
        ],
      },
      ...explainNotice('q3SocialExplain'),
    ],
  });

  // Page 5: Q3G benefits
  const b = d.benefits || {};
  const planBenefits = PLAN_BENEFITS;
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
        title: T.q3G,
        text: T.checkAll,
      },
      {
        type: 'table',
        headers: ['Benefit', 'Eligible', 'Applied For'],
        colWidths: [60, 20, 20],
        colAlign: ['left', 'center', 'center'],
        rows: planBenefits.map(([k, label]) => {
          const v = b[k] || {};
          const fmtTri = val => (val === 'Yes' || val === true) ? 'Yes' : ((val === 'No' || val === false) ? 'No' : '—');
          return [label, fmtTri(v.eligible), fmtTri(v.appliedFor)];
        }),
      },
      {
        type: 'checklist',
        items: [
          { checked: !!d.q3BenefitsNone, label: C.q3BenefitsNone },
          { checked: !!d.q3BenefitsOther, label: C.q3BenefitsOther },
        ],
      },
      ...explainNotice('q3BenefitsExplain'),
    ],
  });

  // Page 6: Q4 providers
  // Milestone 61B: see the Q1 note above -- an address- or phone-only
  // provider row is entered data and prints.
  const provRows = startedRows(d.q4Providers);
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
        title: numbered(4, T.q4),
        headers: ['#', 'Provider', 'Type', 'Visits'],
        colWidths: [8, 47, 25, 20],
        colAlign: ['left', 'left', 'left', 'left'],
        rows: provRows.map((r, i) => {
          const sub = [r.street, r.cityStateZip, r.phone].filter(Boolean).map(text => ({ text }));
          return [String(i + 1), sub.length ? { main: r.name || '', sub } : (r.name || ''), r.providerType || '', r.visits || ''];
        }),
      } : { type: 'notice', title: numbered(4, T.q4), text: 'No providers listed.' },
    ],
  });

  // Page 7: Q5-Q7
  const rights = d.rights || {};
  const planRights = PLAN_RIGHTS;
  sections.push({
    id: 'q5-q7',
    title: 'Questions 5–7',
    bookmarkTitle: 'Questions 5-7',
    parentBookmark: null,
    level: 1,
    pageBreakBefore: true,
    blocks: [
      { type: 'notice', title: numbered(5, T.q5), text: '' },
      { type: 'question', question: T.q5A, answer: d.q5SocialSkills || '' },
      { type: 'question', question: T.q5B, answer: d.q5Activities || '' },
      {
        type: 'table',
        title: numbered(6, T.q6),
        headers: ['Right', 'Status'],
        colWidths: [65, 35],
        colAlign: ['left', 'left'],
        // Milestone 68G: the form's word for the stored value ("Yes" for
        // 'Capable of restoration'): planRightLabel() from the Plan model.
        rows: planRights.map(([k, label]) => [label, planRightLabel(rights[k])]),
      },
      { type: 'question', question: numbered(7, T.q7), answer: d.q7RightsExplain || '' },
    ],
  });

  // Page 8: Q8 ADLs
  const adls = d.adls || {};
  const planAdls = PLAN_ADLS;
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
        title: numbered(8, T.q8),
        headers: ['Activity', 'Rating'],
        colWidths: [70, 30],
        colAlign: ['left', 'left'],
        rows: planAdls.map(([k, label]) => [label, adls[k] || '']),
      },
    ],
  });

  // Page 9: Q9 disabilities & assistive devices
  const deviceItems = (pfx) => PLAN_ANNUAL_DEVICES.map(([suffix, label]) => ({ checked: !!d[pfx + suffix], label }));
  sections.push({
    id: 'q9',
    title: 'Question 9',
    bookmarkTitle: 'Question 9',
    parentBookmark: null,
    level: 1,
    pageBreakBefore: true,
    blocks: [
      { type: 'notice', title: numbered(9, T.q9), text: '' },
      {
        type: 'checklist',
        title: T.q9A,
        items: [
          { checked: !!d.q9MentalDementia, label: C.q9MentalDementia },
          { checked: !!d.q9MentalAlzheimers, label: C.q9MentalAlzheimers },
          { checked: !!d.q9MentalAutism, label: C.q9MentalAutism },
          { checked: !!d.q9MentalHeadInjury, label: C.q9MentalHeadInjury },
          { checked: !!d.q9MentalDevelopmental, label: C.q9MentalDevelopmental },
          { checked: !!d.q9MentalIntellectual, label: C.q9MentalIntellectual },
          { checked: !!d.q9MentalSchizophrenia, label: C.q9MentalSchizophrenia },
          { checked: !!d.q9MentalDepression, label: C.q9MentalDepression },
          { checked: !!d.q9MentalSubstance, label: C.q9MentalSubstance },
          { checked: !!d.q9MentalNone, label: C.q9MentalNone },
          { checked: !!d.q9MentalOther, label: C.q9MentalOther },
        ],
      },
      ...explainNotice('q9MentalExplain'),
      {
        type: 'checklist',
        title: `${T.q9B} ${T.checkAll}`,
        items: [
          { checked: !!d.q9PhysMobility, label: C.q9PhysMobility },
          { checked: !!d.q9PhysBlindness, label: C.q9PhysBlindness },
          { checked: !!d.q9PhysDeafness, label: C.q9PhysDeafness },
          { checked: !!d.q9PhysDiabetic, label: C.q9PhysDiabetic },
          { checked: !!d.q9PhysParkinsons, label: C.q9PhysParkinsons },
          { checked: !!d.q9PhysArthritis, label: C.q9PhysArthritis },
          { checked: !!d.q9PhysNone, label: C.q9PhysNone },
          { checked: !!d.q9PhysOther, label: C.q9PhysOther },
        ],
      },
      ...explainNotice('q9PhysExplain'),
      { type: 'checklist', title: `${T.q9C} ${T.checkAll}`, items: deviceItems('q9Uses') },
      ...explainNotice('q9UsesExplain'),
      { type: 'checklist', title: `${T.q9D} ${T.checkAll}`, items: deviceItems('q9Needs') },
      ...explainNotice('q9NeedsExplain'),
    ],
  });

  // Page 10: Q10 directives. Milestone 37-4: gated on q10Executed, not just
  // on populated rows -- see plan-initial/pdf-model.js's identical note.
  // Milestone 61B: the gate on q10Executed stays (37-4); only the
  // row test widens -- agents, alternates, relationship and contact are
  // entered data too, and the old title/date/signer test dropped them.
  const dirs = d.q10Executed ? startedRows(d.q10Directives) : [];
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
        items: [{ checked: !!d.q10NoDirectives, label: numbered(10, T.q10NoDirectives) }],
      },
      ...(d.q10NoDirectives ? [{
        type: 'checklist',
        items: [
          { checked: !!d.q10StepResidence, label: C.q10StepResidence },
          { checked: !!d.q10StepSafeDeposit, label: C.q10StepSafeDeposit },
          { checked: !!d.q10StepInterviewed, label: C.q10StepInterviewed },
          { checked: !!d.q10StepMedicalProviders, label: C.q10StepMedicalProviders },
          { checked: !!d.q10StepAttorney, label: C.q10StepAttorney },
        ],
      }] : []),
      {
        type: 'checklist',
        items: [{ checked: !!d.q10Executed, label: T.q10Executed }],
      },
      ...(d.q10Executed ? [{
        type: 'checklist',
        items: [
          { checked: !!d.q10ExecDNR, label: C.q10ExecDNR },
          { checked: !!d.q10ExecHealthcare, label: C.q10ExecHealthcare },
          { checked: !!d.q10ExecPOA, label: C.q10ExecPOA },
          { checked: !!d.q10ExecOther, label: `${C.q10ExecOther}${d.q10ExecOtherText ? ' ' + d.q10ExecOtherText : ''}` },
        ],
      }] : []),
      ...(dirs.length ? [{ type: 'notice', title: T.q10ForAny, text: '' }] : []),
      ...(dirs.length ? dirs.map((r, i) => ({
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
      })) : []),
    ],
  });

  // Page 11: Q11 remuneration
  const q11Received = !!(d.q11ReceivedName || d.q11Amount || d.q11From);
  // Milestone 73H (design 3): the amount received prints as currency, as
  // the original form's "monies of $___" asks; it printed as stored
  // ("1259.59"). Blank, a line to write it on; text that can't be read,
  // as typed (the export checks name it).
  const q11Money = (v) => {
    const amount = amountForStore(v, { blank: '' });
    return typeof amount === 'number' ? presentAmount(amount) : (amount || BLANK_DATE_LINE);
  };
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
        title: numbered(11, T.q11),
        text: '',
      },
      // Milestone 73B (73B-N2): an unanswered question prints neither sworn
      // sentence -- it used to print "I have received the monies … from …"
      // whenever "no remuneration" wasn't ticked.
      ...(d.q11NoRemuneration
        ? [{ type: 'notice', text: planAnnualNoRemuneration(d.q11NoRemunerationName || '') }]
        : q11Received
          ? [{ type: 'notice', text: planAnnualReceived(d.q11ReceivedName || '', q11Money(d.q11Amount), d.q11From || '') }]
          : []),
      ...(!d.q11NoRemuneration && (q11Received || d.q11SubmittedToCourt) ? [{
        type: 'checklist',
        items: [{ checked: !!d.q11SubmittedToCourt, label: T.q11Submitted }],
      }] : []),
    ],
  });

  const makeSigBlock = (role, p) => ({
    type: 'signature-block',
    role,
    signerRole: 'guardian',
    signerName: p.name || '',
    signatureDate: fmtDate(p.signatureDate),
    // Milestone 39-C
    signatureState: p.signatureState || '',
    signatureImage: p.signatureImage || '',
    fields: [
      [{ label: 'Printed Name', value: p.name || '' }, { label: 'SSN / EIN', value: maskSSN(p.ssn || '') }, { label: 'Phone Number', value: p.phone || '' }],
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
      // Milestone 73N part 2: the form's preamble on changed capacity prints
      // above the statements, as the original has it.
      { type: 'notice', title: T.certTitle, text: T.certPreamble },
      {
        type: 'checklist',
        title: T.certCheckAll,
        items: [
          { checked: !!d.certIncapacitatedNoCopy, label: C.certIncapacitatedNoCopy },
          { checked: !!d.certMinorNoCopy, label: C.certMinorNoCopy },
          { checked: !!d.certConsulted, label: C.certConsulted },
          { checked: !!d.certNoRestriction, label: C.certNoRestriction },
          { checked: !!d.certProvidesMedical, label: C.certProvidesMedical },
          { checked: !!d.certPhysicianAttached, label: C.certPhysicianAttached },
          { checked: !!d.certRecognizeRights, label: C.certRecognizeRights },
        ],
      },
      ...(d.certRightsChangedExplain ? [{ type: 'notice', text: `Explanation for no change in rights: ${d.certRightsChangedExplain}` }] : []),
      {
        type: 'notice',
        text: T.perjury,
      },
      makeSigBlock('Guardian', g[0] || {}),
    ],
  });

  // Page 13: Additional co-guardian signatures (conditional)
  // Milestone 61C: a co-guardian given an SSN, phone or address but not
  // yet a name is a started signer, not an empty placeholder.
  const extras = startedRows((g || []).slice(1));
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
        text: planAnnualAttorneyCertification(dateOrLine(d.periodFrom), dateOrLine(d.periodTo), county),
      },
      {
        type: 'signature-block',
        role: "Guardian's Attorney",
        signerRole: 'attorney',
        signerName: d.attorney || '',
        signatureDate: fmtDate(d.attorney_signatureDate),
        // Milestone 39-C
        signatureState: d.attorney_signatureState || '',
        signatureImage: d.attorney_signatureImage || '',
        fields: [
          [{ label: 'Attorney Name', value: d.attorney || '' }, { label: 'Florida Bar Number', value: d.attorney_bar || '' }, { label: 'Telephone', value: d.attorney_phone || '' }],
          [{ label: 'Primary Email', value: d.attorney_email || '' }, { label: 'Secondary Email', value: attorneySecondaryEmail }],
          [{ label: 'Street Address', value: d.attorney_street || '' }, { label: 'City / State / ZIP', value: d.attorney_cityStateZip || '' }],
        ],
      },
    ],
  });

  // Milestone 68C: the Certificate of Service, last, on every Plan.
  sections.push(planCertificateOfServiceSection(d, { attorneyName: (f) => f.attorney || '', planNoun: 'plan' }, fmtDate));

  // Milestone 73A: each signature block's print mode, from its signer's role
  // and the year's signature policy (src/core/pdf/signature-modes.js).
  return resolveSignatureModes({ metadata, sections }, d);
}
