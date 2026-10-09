// Milestone 73N part 2: the Initial Guardianship Plan's questions, choices and
// certifications as the court's own form words them
// (reference/plan-forms/plan-initial-original.txt), read by both the screen
// and the PDF. Both paraphrased: the "consulted" certification dropped "...or
// consistent with the rights retained by the Ward", the directives question
// shortened "(including but not limited to: ...)", the certification preamble
// wasn't printed, and the PDF printed Question 11 between 10D and 10E. The
// form has no Question 8; its numbering is kept. Directive and device wording
// is the Annual Plan's, word for word, and is shared with it.
// tests/unit/court-text-parity.spec.js compares every entry with the original.

import { PLAN_ANNUAL_CHOICES as A, PLAN_ANNUAL_DEVICES, PLAN_ANNUAL_DIRECTIVE_LABELS, PLAN_ANNUAL_TEXT } from './plan-annual.js';

export const PLAN_INITIAL_TEXT = Object.freeze({
  wardLiving: 'The ward is living:',
  livingOwned: 'In a private residence leased or owned by them (house, condo or apartment).',
  livingNotOwned: 'In a private residence not leased or owned by them (such as family member).',
  livingFacility: 'In a facility (Skilled Nursing, Assisted Living, etc).',
  residence: 'Address and Phone Number where Ward is currently residing:',
  submits: 'The guardian(s) submit(s) and propose(s) the following initial plan.',

  q1: 'List any preexisting orders not to resuscitate executed under s. 401.45(3) or preexisting advance directives, as defined in s. 765.101, the date an order or directive was signed, whether such order or directive has been suspended by the court, and a description of the steps taken to identify and locate the preexisting order not to resuscitate or advance directive. Attach a copy of any directives to the plan. Attach additional pages to the end of the plan, if needed.',
  q2: 'The guardian states the place and kind of residential setting best suited for the needs of the Ward is:',
  q3: 'For the plan period, the guardian proposes the following as to the provision of medical services for the Ward:',
  q4: 'For the plan period, the guardian proposes the following as to the provision of mental health services for the Ward:',
  q5: 'For the plan period, the guardian proposes the following as to the provision of personal care of the ward, such as bathing, grooming and feeding:',
  q6: 'For the plan period, the guardian proposes the following to provide for socialization and/or recreational services for the Ward for the plan period. (i.e.: arranging friends and family to visit, encourage participation in facility or day program activities, etc.):',
  q7: 'The Ward has the following health insurance, accident insurance, private benefits, or governmental benefits to which the Ward is receiving to meet any part of the costs of medical, mental health or related services:',
  q9: "The guardian will secure or has secured the following physical and/or mental examinations to determine the Ward's medical and mental health treatment needs:",
  q10: 'To assist the Court with review of the initial plan to determine if it is in the best interest of the Ward, please provide the following information:',
  q10A: "A. Please rate the ability of the Ward to engage in activities of daily living or instrumental activities of daily living (ADL's):",
  q10B: 'B. The mental disabilities of the Ward are:',
  q10C: 'C. The physical disabilities of the Ward are:',
  q10D: 'D. The assistive devices used by the Ward are (devices currently being used by the ward):',
  q10E: 'E. The assistive devices needed by the Ward are (devices needed but ward does not have them):',
  q10F: 'F. Are the recommendations of the examining committee incorporated into this plan?',
  explanation: 'Explanation:',

  q11NoDirectives: PLAN_ANNUAL_TEXT.q10NoDirectives,
  q11Executed: PLAN_ANNUAL_TEXT.q10Executed,
  q11ForAny: PLAN_ANNUAL_TEXT.q10ForAny,

  certTitle: 'CERTIFICATION AND SIGNATURE OF GUARDIAN(S)',
  certCheckAll: '(Check all that apply)',
  certPreamble: "If the Ward's ability to exercise rights has changed since the Order Determining Capacity and Appointing Guardian, the guardian must file a Petition to Remove or Petition to Restore Rights (as appropriate.)",
  perjury: PLAN_ANNUAL_TEXT.perjury,
  attorneyTitle: "CERTIFICATION AND SIGNATURE OF GUARDIAN'S ATTORNEY",
});

/** The choices printed beside each box, by the field that stores the tick. */
export const PLAN_INITIAL_CHOICES = Object.freeze({
  // 2
  q2ALF: A.q3SettingALF,
  q2GroupHome: A.q3SettingGroupHome,
  q2Intermediate: A.q3SettingIntermediate,
  q2PrivateResidence: A.q3SettingPrivate,
  q2SkilledNursing: A.q3SettingSkilled,
  q2Specialized: A.q3SettingSpecialized,
  q2StateHospital: A.q3SettingStateHospital,
  q2Other: 'Other (Please Explain Below)',
  // 3
  q3MedPrimary: A.q3MedPrimary,
  q3MedDentist: A.q3MedDentist,
  q3MedOphthalmologist: A.q3MedOphthalmologist,
  q3MedSpecialist: 'Routine examination by Specialist - area of specialty:',
  q3MedPT: A.q3MedPhysicalTherapy,
  q3MedST: A.q3MedSpeechTherapy,
  q3MedOT: A.q3MedOccupationalTherapy,
  q3MedWardDecides: A.q3MedWardDecides,
  q3MedOther: 'Other: (Please Explain Below)',
  // 4
  q4Psych: A.q3MentalPsych,
  q4Outpatient: A.q3MentalOutpatient,
  q4Inpatient: A.q3MentalInpatient,
  q4None: 'None (Please Explain Below)',
  q4Other: 'Other (Please Explain Below)',
  // 5
  q5CareFacility: 'Care Facility',
  q5NursesAides: 'Nurses and Aides',
  q5FamilyFriends: 'Family and Friends',
  q5Other: 'Other (Please Explain Below)',
  // 6
  q6CareFacility: 'Care Facility',
  q6NursesAides: 'Nurses and Aides',
  q6FamilyFriends: 'Family and Friends',
  q6DayProgram: 'Day Program',
  q6WardDecides: 'The Ward retains the right to make their own decision',
  q6Other: 'Other (Please Explain Below)',
  // 7 (the last of its list; the rest are the benefits table)
  q7Other: 'Other (Please Explain Below)',
  // 10B
  mentalAlzheimers: "Alzheimer's type of dementia",
  mentalAutism: 'Autism Spectrum Disorders',
  mentalClosedHeadInjury: 'Closed Head Injury',
  mentalDementia: 'Dementia',
  mentalDepression: 'Depression',
  mentalDevelopmental: 'Developmental Disabilities',
  mentalSubstance: 'Induced by substance abuse',
  mentalSchizophrenia: 'Schizophrenia or related disorders',
  mentalOther: 'Other (Please Explain Below)',
  // 10C
  physMobility: 'Mobility',
  physBlindness: 'Blindness',
  physDeafness: 'Deafness',
  physDiabetic: 'Diabetic',
  physParkinsons: "Parkinson's disease",
  physArthritis: 'Severe arthritis',
  physOther: 'Other (Please Explain Below)',
  // 11
  q11StepResidence: A.q10StepResidence,
  q11StepSafeDeposit: A.q10StepSafeDeposit,
  q11StepInterviewed: A.q10StepInterviewed,
  q11StepMedicalProviders: A.q10StepMedicalProviders,
  q11StepAttorney: A.q10StepAttorney,
  q11ExecDNR: A.q10ExecDNR,
  q11ExecHealthcare: A.q10ExecHealthcare,
  q11ExecPOA: A.q10ExecPOA,
  q11ExecOther: A.q10ExecOther,
  // Certification
  certIncapacitatedNoCopy: 'The Ward was declared totally incapacitated and has not been given a copy of this plan.',
  certMinorNoCopy: 'The Ward is a minor under the age of 14 and has not been given a copy of this plan.',
  certConsulted: "The guardian has consulted with the Ward, to the extent reasonable, has honored the Ward's wishes, and to the maximum extent possible the plan is in accordance with the Ward's wishes or consistent with the rights retained by the Ward.",
  certRecognizeRights: 'In exercising his or her powers, the guardian shall recognize any rights retained by the ward [FS 744.363(6)]',
  certNoRestriction: 'The plan does not restrict the physical liberty of the Ward except as necessary to protect the Ward and others from serious physical injury, illness, or disease.',
  certProvidesCare: "The plan provides for the Ward's medical care and mental health treatment.",
});

/** The benefits of Question 7, by the field that stores each answer. */
export const PLAN_INITIAL_BENEFITS = Object.freeze([
  ['q7SocialSecurity', 'Social Security'],
  ['q7Ssdi', 'Social Security Disability Income (SSDI)'],
  ['q7Hmo', 'Health Maintenance Organization (HMO)'],
  ['q7Ssi', 'Supplemental Security Income (SSI)'],
  ['q7StateSupplement', 'Optional State Supplement'],
  ['q7InstitutionalCare', 'Institutional Care Program'],
  ['q7SupplementalIns', 'Supplemental Insurance'],
  ['q7Pension', 'Pension'],
  ['q7Medicare', 'Medicare'],
  ['q7Medicaid', 'Medicaid'],
  ['q7Va', 'VA'],
  ['q7Trusts', 'Trusts (Please explain the type of Trust and how it covers costs below)'],
  ['q7PendingBenefits', 'Pending Benefits (Please explain why ward is not yet receiving or provide date applied for below)'],
]);

/** 10D and 10E share the Annual Plan's list of devices. */
export const PLAN_INITIAL_DEVICES = PLAN_ANNUAL_DEVICES;
export const PLAN_INITIAL_DIRECTIVE_LABELS = PLAN_ANNUAL_DIRECTIVE_LABELS;

/** The attorney's certification, with the plan's period and county. */
export function planInitialAttorneyCertification(from, to, county) {
  return `The undersigned hereby notifies the Court of the filing of the initial guardianship plan for the period ${from} through ${to}. The undersigned hereby notifies the Court of the initial guardianship plan of the guardian of the person. This initial guardianship plan is the representation of the guardian. I have not audited the accompanying initial plan. The undersigned attorney represents that he/she has examined the contents of the initial guardianship plan and that it conforms to the requirements of the Florida Guardianship Law and the standards for the plans in ${county} County.`;
}

/** A question as the filed document numbers it. */
export const numbered = (n, text) => `${n}. ${text}`;
