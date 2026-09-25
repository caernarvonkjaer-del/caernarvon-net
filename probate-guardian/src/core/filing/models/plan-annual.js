// Milestone 70, 70C: the Annual Guardianship Plan's filing model -- the
// court form's rights, activities-of-daily-living and benefits lists (one
// declaration each, shared by the page, the validator, the readiness panel
// and the PDF, so none can drift out of the form's order), its row factories,
// and its blank filing. Moved from legacy-app.js (the lists and rows) and
// src/core/state.js (the blank filing). Pure data, loaded eagerly.
import { emptyCertificateOfService } from '../plan-certificate-of-service.js';

// ── Annual Guardianship Plan ─────────────────────────────
// The court form's 11 numbered questions, in its own order. Two of them
// are repeating tables (residences, medical providers) and are modelled as
// arrays exactly like the Annual Accounting schedules; the rest are
// checkbox groups, narrative text, or fixed-length rating grids.
//
// The rights and ADL lists are declared once as constants and reused by
// the page renderer, the validator, and the print builder, so the three
// can't drift out of order — the printed court document has to list them
// in exactly the sequence the form does.
export const PLAN_RIGHTS=[
  ['marry','Right to marry'],
  ['vote','Right to vote'],
  ['govBenefits','Right to personally apply for government benefits'],
  ['driver',"Right to have a driver's license"],
  ['travel','Right to travel'],
  ['employment','Right to seek or retain employment'],
  ['contract','Right to contract'],
  ['sue','Right to sue and be sued'],
  ['property','Right to manage property or to make any gift or disposition'],
  ['residence','Right to determine residence'],
  ['medical','Right to consent to medical treatment'],
  ['social','Right to make decisions about social environment or other aspects of social life'],
];

// Milestone 68G: the court's Annual Plan question 6 has FOUR columns -- Yes /
// No / Not Removed / Needs to be Restored (plan-annual-original.pdf, page 6)
// -- and the app had dropped "No", so a right that was removed and is not
// capable of restoration had no honest answer (744.3675(3)(b) requires a
// statement of whether rights can be restored). Each entry is the STORED value
// and the LABEL the form uses; the three existing values are unchanged so no
// saved answer changes meaning, and "Capable of restoration" is shown as the
// form's "Yes". Order is the form's column order.
export const PLAN_RIGHT_STATES=[
  {value:'Capable of restoration',label:'Yes'},
  {value:'No',label:'No'},
  {value:'Not removed',label:'Not Removed'},
  {value:'Needs to be restored',label:'Needs to be Restored'},
];

export const planRightLabel=(value)=>{const s=PLAN_RIGHT_STATES.find(x=>x.value===value);return s?s.label:(value||'');};

export const PLAN_ADLS=[
  ['eating','Eating'],['prepareMeals','Prepare meals'],
  ['heavyChores','Heavy chores (e.g. vacuuming)'],['lightHousekeeping','Light housekeeping'],
  ['managingMoney','Managing money'],['dressing','Dressing'],
  ['transportation','Transportation ability'],['walking','Walking / mobility'],
  ['toileting','Toileting'],['stairs','Climbing stairs'],
  ['transferring','Transferring (wheelchair to chair/bed)'],['laundry','Doing laundry'],
  ['shopping','Shopping'],['bathing','Bathing'],
  ['grooming','Grooming'],['medication','Administration of medication'],
];

export const PLAN_ADL_RATINGS=['','Ward needs no help','Ward needs assistance','Ward cannot do at all'];

export const PLAN_BENEFITS=[
  ['socialSecurity','Social Security'],['ssdi','Social Security Disability Income (SSDI)'],
  ['hmo','Health Maintenance Organization (HMO)'],['ssi','Supplemental Security Income (SSI)'],
  ['stateSupplement','Optional State Supplement'],['institutionalCare','Institutional Care Program'],
  ['supplementalIns','Supplemental Insurance'],['pension','Pension'],
  ['medicare','Medicare'],['medicaid','Medicaid'],['trusts','Trusts'],['other','Other'],
];

export function emptyPlanResidence(){return {name:'',street:'',cityStateZip:'',phone:'',facilityType:'',from:'',to:''};}

export function emptyPlanProvider(){return {name:'',street:'',cityStateZip:'',phone:'',providerType:'',visits:''};}

export function emptyPlanDirective(){return {title:'',dateSigned:'',signedBy:'',agents:'',alternates:'',relationship:'',contact:'',courtRevoked:'',orderDate:'',orderCounty:''};}

// Blank-ward data factory for the Plan Annual feature (Milestone 4, Phase A).
// Needed synchronously at ward-creation time, before the lazily-imported
// feature loads. Built from the lists and row factories above; until Milestone
// 70's 70C those were legacy-app.js globals it reached through window.
export function emptyDataPlanAnnual() {
  const rights = {}; PLAN_RIGHTS.forEach(([k]) => rights[k] = '');
  const adls = {}; PLAN_ADLS.forEach(([k]) => adls[k] = '');
  const benefits = {}; PLAN_BENEFITS.forEach(([k]) => benefits[k] = { eligible: '', appliedFor: '' });
  return {
    planTriStateSchemaVersion:2,
    // Milestone 68C: the Certificate of Service, on every Plan.
    ...emptyCertificateOfService(),
    // Cover
    wardName:'', caseNumber:'', ucn:'', ssn:'', county:'',
    periodFrom:'', periodTo:'', gid:'', guardian:'', attorney:'',
    wardLiving:'', residenceAddress:'', residenceCityStateZip:'', residencePhone:'',
    mailingAddress:'', mailingCityStateZip:'',
    // Q1 — places resided in the prior 12 months
    q1Residences:[emptyPlanResidence()],
    // Q2 — address change since last plan
    q2NoMove:false, q2WithinCounty:false, q2WithinCircuit:false,
    q2OutsideApproved:false, q2OutsideVenuePetition:false,
    // Q3 — residential setting + care provisions
    q3SettingALF:false, q3SettingGroupHome:false, q3SettingIntermediate:false,
    q3SettingPrivate:false, q3SettingSkilled:false, q3SettingSpecialized:false,
    q3SettingStateHospital:false, q3SettingOther:false, q3SettingExplain:'',
    q3EnsureAssessing:false, q3EnsureWardDecides:false, q3EnsureNoChange:false,
    q3MedPrimary:false, q3MedDentist:false, q3MedOphthalmologist:false,
    q3MedSpecialist:false, q3MedSpecialistArea:'', q3MedPhysicalTherapy:false,
    q3MedSpeechTherapy:false, q3MedOccupationalTherapy:false,
    q3MedWardDecides:false, q3MedNone:false, q3MedOther:false, q3MedExplain:'',
    q3MentalPsych:false, q3MentalWardDecides:false, q3MentalOutpatient:false,
    q3MentalInpatient:false, q3MentalNone:false, q3MentalOther:false, q3MentalExplain:'',
    q3PersonalFacility:false, q3PersonalNurses:false, q3PersonalFamily:false,
    q3PersonalWithout:false, q3PersonalNone:false, q3PersonalOther:false, q3PersonalExplain:'',
    q3SocialFacility:false, q3SocialNurses:false, q3SocialFamily:false,
    q3SocialWardDecides:false, q3SocialNone:false, q3SocialOther:false, q3SocialExplain:'',
    // Q3G — insurance and benefits
    benefits, q3BenefitsNone:false, q3BenefitsOther:false, q3BenefitsExplain:'',
    // Q4 — professional medical treatment during the period
    q4Providers:[emptyPlanProvider()],
    // Q5 — social skills and capacity-building activities
    q5SocialSkills:'', q5Activities:'',
    // Q6/Q7 — rights
    rights, q7RightsExplain:'',
    // Q8 — activities of daily living
    adls,
    // Q9 — disabilities and assistive devices
    q9MentalDementia:false, q9MentalAutism:false, q9MentalHeadInjury:false,
    q9MentalDevelopmental:false, q9MentalSchizophrenia:false, q9MentalDepression:false,
    q9MentalIntellectual:false, q9MentalSubstance:false, q9MentalAlzheimers:false,
    q9MentalNone:false, q9MentalOther:false, q9MentalExplain:'',
    q9PhysMobility:false, q9PhysBlindness:false, q9PhysDeafness:false,
    q9PhysDiabetic:false, q9PhysParkinsons:false, q9PhysArthritis:false,
    q9PhysNone:false, q9PhysOther:false, q9PhysExplain:'',
    q9UsesDentures:false, q9UsesHearingAid:false, q9UsesWheelchair:false,
    q9UsesWalker:false, q9UsesCrutches:false, q9UsesProsthetics:false,
    q9UsesGlasses:false, q9UsesNone:false, q9UsesOther:false, q9UsesExplain:'',
    q9NeedsDentures:false, q9NeedsHearingAid:false, q9NeedsWheelchair:false,
    q9NeedsWalker:false, q9NeedsCrutches:false, q9NeedsProsthetics:false,
    q9NeedsGlasses:false, q9NeedsNone:false, q9NeedsOther:false, q9NeedsExplain:'',
    // Q10 — advance directives
    q10NoDirectives:false, q10StepResidence:false, q10StepSafeDeposit:false,
    q10StepInterviewed:false, q10StepMedicalProviders:false, q10StepAttorney:false,
    q10Executed:false, q10ExecDNR:false, q10ExecHealthcare:false,
    q10ExecPOA:false, q10ExecOther:false, q10ExecOtherText:'',
    // Milestone 37-4: empty by default -- a directive card is created only
    // once q10Executed is checked (see pagePlanADirectives()'s "ensure-
    // directive-row" handler) or the user presses Add Directive, not seeded
    // up front regardless of whether the ward executed anything.
    q10Directives:[],
    // Q11 — remuneration
    q11NoRemuneration:false, q11NoRemunerationName:'',
    q11ReceivedName:'', q11Amount:'', q11From:'', q11SubmittedToCourt:false,
    // Certification — the seven "check all that apply" statements
    certIncapacitatedNoCopy:false, certMinorNoCopy:false, certConsulted:false,
    certNoRestriction:false, certProvidesMedical:false, certPhysicianAttached:false,
    certRecognizeRights:false, certRightsChangedExplain:'',
    // Guardians (form provides three signature blocks) + attorney
    planGuardians:[{name:'',ssn:'',phone:'',email:'',signatureDate:'',mailingStreet:'',mailingCityStateZip:'',officeStreet:'',officeCityStateZip:'',relationship:'',signatureState:'',signatureImage:''}],
    attorney_signatureDate:'', attorney_bar:'', attorney_phone:'', attorney_email:'',
    attorney_street:'', attorney_cityStateZip:'',
    // Milestone 39-C
    attorney_signatureState:'', attorney_signatureImage:''
  };
}

// The Annual Guardianship Plan's pages, in sidebar order -- what the router and the sidebar
// accept and list for it. Moved from legacy-app.js's routing section.
export const PAGES_PLAN_ANNUAL=[
  {id:'/',        label:'Cover'},
  {id:'/summary', label:'Summary'},
  {id:'/p2',      label:'1. Residences'},
  {id:'/p3',   label:'2–3. Residence & Care'},
  {id:'/p4',   label:'3G. Insurance & Benefits'},
  {id:'/p5',   label:'4. Medical Treatment'},
  {id:'/p6',   label:'5–7. Skills & Rights'},
  {id:'/p7',   label:'8. Daily Living'},
  {id:'/p8',   label:'9. Disabilities & Devices'},
  {id:'/p9',   label:'10. Advance Directives'},
  {id:'/p10',  label:'11. Remuneration'},
  {id:'/p11',  label:'Signatures'},
  {id:'/p12',  label:'Certificate of Service'},
  {id:'/print',label:'Print Preview'},
];
