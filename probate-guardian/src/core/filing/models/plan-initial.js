// Milestone 70, 70C: the Initial Guardianship Plan's filing model -- its
// activities-of-daily-living list and ratings, its provider row and its blank
// filing. Moved from legacy-app.js (list, ratings, row) and src/core/state.js
// (the blank filing). Pure data, loaded eagerly.
import { emptyCertificateOfService } from '../plan-certificate-of-service.js';
import { emptyPlanInitialMultiselect } from '../plan-initial-multiselect.js';

export const INITIAL_ADLS=[
  ['lightHousekeeping','Light Housekeeping'],['medication','Administration of Medication'],
  ['managingMoney','Managing Money'],['bathing','Bathing'],
  ['prepareMeals','Prepare Meals'],['stairs','Climbing Stairs'],
  ['shopping','Shopping'],['laundry','Doing Laundry'],
  ['toileting','Toileting'],['dressing','Dressing'],
  ['transferring','Transferring (from wheelchair to chair/bed)'],['eating','Eating'],
  ['walking','Walking / Mobility'],['grooming','Grooming'],
  ['heavyChores','Heavy Chores'],
];

export const INITIAL_ADL_RATINGS=['','Ward needs no help','Ward needs some assistance','Ward cannot do at all'];

export function emptyInitialProvider(){return {name:'',providerType:'',examDate:'',street:'',cityStateZip:'',phone:''};}

// Blank-ward data factory for the Plan Initial feature (Milestone 5, Phase A).
// Built from the list and row factory above; until Milestone 70's 70C those
// were legacy-app.js globals it reached through window.
export function emptyDataPlanInitial() {
  const adls = {}; INITIAL_ADLS.forEach(([k]) => adls[k] = '');
  return {
    planTriStateSchemaVersion:2,
    // Milestone 68C: the Certificate of Service, on every Plan.
    ...emptyCertificateOfService(),
    // Cover
    wardName:'', caseNumber:'', ucn:'', county:'', periodFrom:'', periodTo:'',
    inceptionDate:'', lettersSignedDate:'', successorGuardianship:'',
    guardianNames:'', attorneyName:'',
    wardLiving:'', residenceAddress:'', residenceCityStateZip:'', residencePhone:'',
    mailingAddress:'', mailingCityStateZip:'',
    q1PreexistingDirectives:'',
    // Q2 — residential setting best suited to the ward
    q2Explain:'',
    // Q3 — medical services
    q3MedPrimary:false, q3MedDentist:false, q3MedOphthalmologist:false,
    q3MedSpecialist:false, q3MedSpecialistArea:'', q3MedPT:false,
    q3MedST:false, q3MedOT:false, q3MedWardDecides:false, q3MedOther:false, q3MedExplain:'',
    // Q4 — mental health services
    // Milestone 68E: questions 2, 4 and 5 as checkbox lists, one boolean per option.
    ...emptyPlanInitialMultiselect(),
    q4Explain:'',
    // Q5 — personal care
    q5Explain:'',
    // Q6 — socialization / recreation
    q6CareFacility:false, q6NursesAides:false, q6FamilyFriends:false, q6DayProgram:false,
    q6WardDecides:false, q6Other:false, q6Explain:'',
    // Q7 — insurance / benefits
    q7SocialSecurity:'', q7Ssdi:'', q7Hmo:'', q7Ssi:'',
    q7StateSupplement:'', q7InstitutionalCare:'', q7SupplementalIns:'',
    q7Pension:'', q7Medicare:'', q7Medicaid:'', q7Va:'',
    q7Trusts:'', q7PendingBenefits:'', q7Other:false, q7Explain:'',
    // Q9 — examining physicians/providers
    q9Providers:[emptyInitialProvider()],
    // Q10A — activities of daily living
    adls,
    // Q10B/C — disabilities
    mentalAlzheimers:false, mentalAutism:false, mentalClosedHeadInjury:false,
    mentalDementia:false, mentalDepression:false, mentalDevelopmental:false,
    mentalSubstance:false, mentalSchizophrenia:false, mentalOther:false, mentalExplain:'',
    physMobility:false, physBlindness:false, physDeafness:false, physDiabetic:false,
    physParkinsons:false, physArthritis:false, physOther:false, physExplain:'',
    // Q10D — assistive devices currently used
    usesDentures:false, usesHearingAid:false, usesWheelchair:false, usesWalker:false,
    usesCrutches:false, usesProsthetics:false, usesGlasses:false, usesNone:false,
    usesOther:false, usesExplain:'',
    // Q10E — assistive devices needed
    needsDentures:false, needsHearingAid:false, needsWheelchair:false, needsWalker:false,
    needsCrutches:false, needsProsthetics:false, needsGlasses:false, needsNone:false,
    needsOther:false, needsExplain:'',
    // Q10F — examining committee recommendations
    committeeIncorporated:'', committeeExplain:'',
    // Q11 — pre-existing DNR / advance directives verification
    q11NoDirectives:false, q11StepResidence:false, q11StepSafeDeposit:false,
    q11StepInterviewed:false, q11StepMedicalProviders:false, q11StepAttorney:false,
    q11Executed:false, q11ExecDNR:false, q11ExecHealthcare:false,
    q11ExecPOA:false, q11ExecOther:false, q11ExecOtherText:'',
    // Milestone 37-4: empty by default -- see q10Directives's identical note
    // above (pagePlanIDirectives() is Initial Plan's equivalent handler).
    q11Directives:[],
    // Certification — six "check all that apply" statements
    certIncapacitatedNoCopy:false, certMinorNoCopy:false, certConsulted:false,
    certRecognizeRights:false, certNoRestriction:false, certProvidesCare:false,
    // Guardians (form provides up to four signature blocks) + attorney
    planGuardians:[{name:'',ssn:'',street:'',phone:'',cityStateZip:'',signatureDate:'',relationship:'',signatureState:'',signatureImage:''}],
    attorney_name:'', attorney_bar:'', attorney_phone:'', attorney_email:'',
    attorney_street:'', attorney_cityStateZip:'', attorney_signatureDate:'',
    // Milestone 39-C
    attorney_signatureState:'', attorney_signatureImage:''
  };
}

// The Initial Guardianship Plan's pages, in sidebar order -- what the router and the sidebar
// accept and list for it. Moved from legacy-app.js's routing section.
export const PAGES_PLAN_INITIAL=[
  {id:'/',        label:'Cover'},
  {id:'/summary', label:'Summary'},
  {id:'/p2',      label:'2–3. Setting & Medical Care'},
  {id:'/p3',   label:'4–5. Mental Health & Personal Care'},
  {id:'/p4',   label:'6–7. Socialization & Benefits'},
  {id:'/p5',   label:'9. Examining Providers'},
  {id:'/p6',   label:'10A. Daily Living'},
  {id:'/p7',   label:'10B–D. Disabilities & Devices'},
  {id:'/p8',   label:'11. Advance Directives'},
  {id:'/p9',   label:'Signatures'},
  {id:'/p10',  label:'Attorney Certification'},
  {id:'/p11',  label:'Certificate of Service'},
  {id:'/print',label:'Print Preview'},
];
