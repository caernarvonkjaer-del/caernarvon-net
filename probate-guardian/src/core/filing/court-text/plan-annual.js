// Milestone 73N part 2: the Annual Guardianship Plan's questions, choices and
// certifications as the court's own form words them
// (reference/plan-forms/plan-annual-original.txt), read by both the screen
// and the PDF. Both paraphrased: the "consulted" certification dropped "...or
// consistent with the rights retained by the Ward" (the screen paraphrased
// it differently again), Question 2 dropped the 15-day notice's compelling
// reasons and expected duration, the directives question shortened
// "(including but not limited to: ...)", Question 10 dropped "and I have
// taken the following steps to verify there are none", and the certification
// preamble on changed capacity wasn't printed at all.
// tests/unit/court-text-parity.spec.js compares every entry with the original.
//
// Question 2 names the Sixth Circuit's counties. Decided by the requester,
// 2026-10-09: the names print only on a Pinellas or Pasco filing; any other
// county gets the same sentences without them (AGENTS.md §5).
//
// Where the original has a plain typing error, the text here is corrected and
// the parity test lists each correction (COURT_TEXT_CORRECTIONS).

export const PLAN_ANNUAL_TEXT = Object.freeze({
  due: 'Pursuant to F.S. 744.367, the Report with Original Signatures is due within 90 days after the last day of the anniversary month that the letters of guardianship were signed.',
  wardLiving: 'The Ward is living:',
  livingOwned: 'In a private residence leased or owned by them (house, condo, apartment).',
  livingNotOwned: 'In a private residence not leased or owned by them (such as family member).',
  livingFacility: 'In a facility (Skilled Nursing, Assisted Living, etc)',
  residence: 'Address and Phone Number where Ward is currently residing:',
  mailing: 'Mailing Address for Ward (if different from above):',
  submits: "The guardian(s) submit(s) and propose(s) the following plan. Filed separately is the Annual Physician's Report. Together, these are the Annual Report of the Guardian(s) of the Person.",
  note1: "Note 1: The rights on the physician's report should match the Order Determining Incapacity and/or Order Appointing Guardian (signed when Letters were issued) or the guardian must either file a petition to remove or restore rights as appropriate, or provide an explanation for why no change should be made.",

  q1: 'The places the ward has lived (resided) during the prior 12 months',
  q2: "If the ward's address has changed since the last plan filed (check all that apply):",
  q2NoMove: 'N/A, the ward has not moved since the last plan was filed.',
  q2WithinCounty: 'The move was within this county and a change of address was provided to the court.',

  q3: 'For the best welfare of the ward in a setting best suited for his/her needs, the undersigned guardian plans as follows:',
  q3A: 'A. The guardian states the place and kind of residential setting best suited for the needs of the ward is:',
  q3B: 'B. The guardian will ensure that the above is the best residential setting for the Ward by:',
  q3C: 'C. Provision for medical care services for the ward:',
  q3D: 'D. Provision for mental health services for the ward:',
  q3E: 'E. Provision for the personal care of the ward, such as bathing, grooming and feeding:',
  q3F: 'F. Provision for socialization and/or recreational activities for the ward:',
  q3G: 'G. Description of health and accident insurance and any other private or governmental benefits to which the Ward is receiving to meet any part of the costs of medical, mental health or related services provided to the Ward.',
  checkAll: '(Check all applicable boxes and provide explanation below)',
  explanation: 'Explanation:',

  q4: 'Professional Medical Treatment performed on the Ward during the prior 12 months',
  q5: 'Social Skills, Abilities and Activities of the Ward',
  q5A: 'A. Describe the social skills (abilities) of the Ward (i.e.: the Ward can communicate well; the Ward communicates with gestures; the Ward cannot communicate at all; etc...). In addition, please describe any changes from the previous plan period.',
  q5B: 'B. Describe the activities undertaken in an effort to increase the capacity of the Ward in the prior plan period (i.e.: encouragement; physical or mental therapy, rehabilitative services; etc...) In addition, please explain whether or not these activities were effective.',
  q6: 'Is the Ward now capable of having some or all of the following rights restored?',
  q7: 'If you answered "Yes" to any right in question 6, and the doctor has indicated on the physician\'s report that a right may be restored, you must file a petition to restore the right. If you do not agree with the physician\'s report, please provide an explanation.',
  q8: "Rate the following Activities of Daily Living (ADL's)",
  q9: 'Disabilities:',
  q9A: 'A. Mental disabilities: (Check all applicable boxes and provide explanation below)',
  q9B: 'B. The physical disabilities of the Ward are:',
  q9C: 'C. The assistive devices used by the Ward are (devices currently being used by the ward):',
  q9D: 'D. The assistive devices needed by the Ward are (devices needed but ward does not yet have them):',

  q10NoDirectives: 'There are NO pre-existing orders Not To Resuscitate (a/k/a "DNR") or any other advance directive and I have taken the following steps to verify there are none: (check all that apply)',
  q10Executed: 'The ward executed the following advanced directives:',
  q10ForAny: 'For ANY advanced directive listed above:',

  q11: 'Each guardian must declare any remuneration from any source for services rendered to or on behalf of the ward. Remuneration means any payment or other benefit made directly or indirectly, overtly or covertly, or in cash or in kind to the guardian. F.S. 744.367 (3)(a).',
  q11Attach: '(You are not limited to spaces on this form. Attach additional sheets, as needed.)',
  q11Submitted: 'All requests for reimbursement or fees have been submitted to the court for review and approval.',

  certTitle: 'CERTIFICATION AND SIGNATURE OF GUARDIAN(S)',
  certCheckAll: '(Check all that apply)',
  certPreamble: "If the Ward's ability to exercise rights has changed since the Order Determining Capacity and/or Order Appointing Guardian, the guardian must either file a petition to remove or restore rights as appropriate, or provide an explanation as to why no change should be made.",
  perjury: 'UNDER PENALTIES OF PERJURY, I declare that I have read and examined the foregoing plan, and the facts alleged are true, to the best of my knowledge and belief.',
  attorneyTitle: "CERTIFICATION AND SIGNATURE OF GUARDIAN'S ATTORNEY",
});

/** The choices printed beside each box, by the field that stores the tick. */
export const PLAN_ANNUAL_CHOICES = Object.freeze({
  // 3A
  q3SettingALF: 'Assisted Living (ALF)',
  q3SettingGroupHome: 'Group Home',
  q3SettingIntermediate: 'Intermediate',
  q3SettingPrivate: 'Private Residence',
  q3SettingSkilled: 'Skilled Nursing',
  q3SettingSpecialized: 'Specialized',
  q3SettingStateHospital: 'State Hospital',
  q3SettingOther: 'Other (Please Explain Below)',
  // 3B
  q3EnsureAssessing: 'Periodically Assessing Needs',
  q3EnsureWardDecides: 'The Ward retains the right to decide',
  q3EnsureNoChange: 'No change, unless required by medical condition',
  // 3C
  q3MedPrimary: 'Routine examination by primary care physician',
  q3MedDentist: 'Routine examination by dentist',
  q3MedOphthalmologist: 'Routine examination by Ophthalmologist',
  q3MedSpecialist: 'Routine examination by Specialist - area of specialty',
  q3MedPhysicalTherapy: 'Physical Therapy',
  q3MedSpeechTherapy: 'Speech Therapy',
  q3MedOccupationalTherapy: 'Occupational Therapy',
  q3MedWardDecides: 'The ward retains the right to make their own decision',
  q3MedNone: 'None (Please Explain Below)',
  q3MedOther: 'Other (Please Explain Below)',
  // 3D
  q3MentalPsych: 'Routine examination by Psychiatrist/Psychologist',
  q3MentalWardDecides: 'Ward retains the right to make own decisions',
  q3MentalOutpatient: 'Ongoing Treatment Outpatient',
  q3MentalInpatient: 'Ongoing Treatment Inpatient',
  q3MentalNone: 'None (Please Explain Below)',
  q3MentalOther: 'Other (Please Explain Below)',
  // 3E
  q3PersonalFacility: 'Care Facility',
  q3PersonalNurses: 'Nurses and Aides',
  q3PersonalFamily: 'Family and Friends',
  q3PersonalWithout: 'Ward does without assistance',
  q3PersonalNone: 'None; ward can provide own personal care',
  q3PersonalOther: 'Other (Please Explain Below)',
  // 3F
  q3SocialFacility: 'Care Facility',
  q3SocialNurses: 'Nurses and Aides',
  q3SocialFamily: 'Family and Friends',
  q3SocialWardDecides: 'The ward retains the right to make their own decision',
  q3SocialNone: 'None (Please Explain Below)',
  q3SocialOther: 'Other (Please Explain Below)',
  // 3G
  q3BenefitsNone: 'None (Please Explain Below)',
  q3BenefitsOther: 'Other (Please Explain Below)',
  // 9A
  q9MentalDementia: 'Dementia',
  q9MentalAutism: 'Autism Spectrum Disorders',
  q9MentalHeadInjury: 'Closed Head Injury',
  q9MentalDevelopmental: 'Developmental Disabilities',
  q9MentalSchizophrenia: 'Schizophrenia or related disorders',
  q9MentalDepression: 'Depression',
  q9MentalIntellectual: 'Intellectual Disability',
  q9MentalSubstance: 'Induced by substance abuse',
  q9MentalAlzheimers: "Alzheimer's type of Dementia",
  q9MentalNone: 'Ward has no mental disabilities',
  q9MentalOther: 'Other: (Please Explain Below)',
  // 9B
  q9PhysMobility: 'Mobility',
  q9PhysBlindness: 'Blindness',
  q9PhysDeafness: 'Deafness',
  q9PhysDiabetic: 'Diabetic',
  q9PhysParkinsons: "Parkinson's disease",
  q9PhysArthritis: 'Severe arthritis',
  q9PhysNone: 'Ward has no physical disabilities',
  q9PhysOther: 'Other (Please Explain Below)',
  // 10
  q10StepResidence: "Search of ward's prior and current residence",
  q10StepSafeDeposit: "Inventory of ward's safe deposit box",
  q10StepInterviewed: 'Interviewed family and friends',
  q10StepMedicalProviders: "Requested documents from the ward's medical providers",
  q10StepAttorney: "Requested documents from the ward's attorney",
  q10ExecDNR: 'Order Not to Resuscitate, F.S. 401.45(3) (a/k/a "DNR")',
  q10ExecHealthcare: 'Advanced Directive for Healthcare (including but not limited to: healthcare surrogate, living will or anatomical gift)',
  q10ExecPOA: 'Durable Power of Attorney, F.S., Chapter 709',
  q10ExecOther: 'Other:',
  // Certification
  certIncapacitatedNoCopy: 'The Ward was declared totally incapacitated and has not been given a copy of this plan.',
  certMinorNoCopy: 'The Ward is a minor and has not been given a copy of this plan.',
  certConsulted: "The guardian has consulted with the Ward, to the extent reasonable, has honored the Ward's wishes, and to the maximum extent possible the plan is in accordance with the Ward's wishes or consistent with the rights retained by the Ward.",
  certNoRestriction: 'The plan does not restrict the physical liberty of the Ward except as necessary to protect the Ward and others from serious physical injury, illness, or disease.',
  certProvidesMedical: "The plan provides for the Ward's medical care and mental health treatment.",
  certPhysicianAttached: "The physician's statement of an examination of the Ward no more than 90 days before the beginning of the plan period is attached.",
  certRecognizeRights: 'In exercising his or her powers, the guardian shall recognize any rights retained by the ward [FS 744.363(6)].',
});

/** 9C and 9D share one list of devices, by the suffix after q9Uses / q9Needs. */
export const PLAN_ANNUAL_DEVICES = Object.freeze([
  ['Dentures', 'Dentures'],
  ['HearingAid', 'Hearing Aid'],
  ['Wheelchair', 'Wheelchair'],
  ['Walker', 'Walker/Cane'],
  ['Crutches', 'Crutches'],
  ['Prosthetics', 'Prosthetics'],
  ['Glasses', 'Glasses'],
  ['None', 'None'],
  ['Other', 'Other (Please Explain Below)'],
]);

/** The directive detail lines, by the field each stores. */
export const PLAN_ANNUAL_DIRECTIVE_LABELS = Object.freeze({
  title: 'Title of the order or directive:',
  dateSigned: 'Date executed/signed:',
  signedBy: 'Name of Person who signed:',
  agents: 'Name of Designated Agent(s) or Surrogate(s):',
  alternates: 'Name of any Alternate Agent(s) or Surrogate(s):',
  relationship: 'Relationship of Agent(s) or Surrogate(s) to the Ward:',
  contact: 'Contact information for any Agent(s) or Surrogate(s):',
  courtRevoked: 'Has a Court suspended or revoked the Order/Directive:',
  orderDate: 'Date of Order:',
});

/**
 * Question 2's three moves, with the circuit's counties named only on a
 * Pinellas or Pasco filing (decided 2026-10-09).
 * @param {boolean} sixthCircuit
 */
export function planAnnualMoveChoices(sixthCircuit) {
  return {
    q2WithinCircuit: `The move was within this Circuit${sixthCircuit ? ' (Pinellas to Pasco or Pasco to Pinellas)' : ''} and Notice was provided to the court within 15 days of the move. The notice stated the compelling reasons for, and expected duration of, the move.`,
    q2OutsideApproved: `The move was not within this Circuit${sixthCircuit ? ' (Pasco/Pinellas)' : ''} and prior court approval was obtained.`,
    q2OutsideVenuePetition: `The move was not within this Circuit${sixthCircuit ? ' (Pasco/Pinellas)' : ''} and a petition to change venue is or has been filed with this plan.`,
  };
}

/**
 * Question 11's two sworn sentences, with what the filer entered in the
 * blanks. A blank's caption on the paper form -- "(name of person/company)"
 * under the line -- labels the space and is not part of a filled-in sentence.
 * The second sentence keeps the declaring guardian's name the screen asks for,
 * in the first sentence's "I, ___ declare" form, as the PDF printed it.
 */
export const planAnnualNoRemuneration = (name) => `I, ${name} declare that I have received NO remuneration from any source for services rendered to or on behalf of the ward.`;
export const planAnnualReceived = (name, amount, from) => `I, ${name} declare that I have received the monies of ${amount} from ${from} for services rendered on behalf of the ward.`;

/** The attorney's certification, with the plan's period and county. */
export function planAnnualAttorneyCertification(from, to, county) {
  return `The undersigned hereby notifies the Court of the filing of the annual guardianship plan for the period ${from} through ${to}. The undersigned hereby notifies the Court of the annual guardianship plan of the guardian of the person. This annual guardianship plan is the representation of the guardian. I have not audited the accompanying annual plan. The undersigned attorney represents that he/she has examined the contents of the annual guardianship plan and that it conforms to the requirements of the Florida Guardianship Law and the standards for the plans in ${county} County.`;
}

/** A question as the filed document numbers it. */
export const numbered = (n, text) => `${n}. ${text}`;
