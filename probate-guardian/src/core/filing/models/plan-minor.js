// Milestone 70, 70C: the Annual Plan -- Minors' filing model -- its residence,
// provider and guardian-signature rows and its blank filing. Moved from
// legacy-app.js (the rows) and src/core/state.js (the blank filing). Pure
// data, loaded eagerly.
import { emptyCertificateOfService } from '../plan-certificate-of-service.js';

export function emptyMinorResidence(){return {name:'',street:'',city:'',state:'',zip:'',phone:''};}

export function emptyMinorProvider(){return {first:'',mi:'',last:'',street:'',city:'',state:'',zip:'',phone:'',providerType:'',visits:''};}

export function emptyMinorGuardianSig(){return {name:'',tin:'',phone:'',mailingStreet:'',mailingCityStateZip:'',relationship:'',email:'',signatureDate:'',signatureState:'',signatureImage:''};}

// Blank-ward data factory for the Plan Minor feature (Milestone 6, Phase A).
// Needed synchronously at ward-creation time, before the lazily-imported
// feature loads. Built from the three row factories above (legacy-app.js
// globals reached through window until Milestone 70's 70C).
export function emptyDataPlanMinor() {
  return {
    planTriStateSchemaVersion:2,
    // Milestone 68C: the Certificate of Service, on every Plan.
    ...emptyCertificateOfService(),
    // Cover
    wardName:'', county:'', ucn:'', ref:'', periodFrom:'', periodTo:'',
    amendedForm:'', amendedVersion:'', professionalGuardian:'', publicGuardian:'',
    guardianName:'',
    // Q1 — current residence
    q1ResidenceName:'', q1Street:'', q1City:'', q1State:'', q1Zip:'', q1Phone:'',
    // Q2 — residences during the preceding 12 months
    q2Residences:[emptyMinorResidence()],
    // Q3 — medical/mental health treatment providers
    q3Providers:[emptyMinorProvider()],
    // Q4 — provision of medical services for the plan period
    q4Primary:false, q4PrimaryFreq:'', q4Dentist:false, q4DentistFreq:'',
    q4Specialist:false, q4SpecialistFreq:'',
    q4PT:false, q4ST:false, q4OT:false, q4MinorDecides:false, q4Other:false, q4Explain:'',
    // Q5 — education and social development
    q5SchoolProgress:'', q5SocialDevelopment:'', q5Communicates:'', q5Interpersonal:'',
    q5NoUnmetNeeds:false, q5DoesNotCareToSocialize:false, q5UnmetNeeds:false, q5Other:false, q5Explain:'',
    // Certification — six "check all that apply" statements
    certIncapacitated:false, certMinor:false, certConsulted:false,
    certNoRestriction:false, certProvidesCare:false, certPhysicianAttached:false,
    // Guardian + Co-Guardian signature blocks
    planGuardians:[emptyMinorGuardianSig()],
    // Preparer certification
    preparer_name:'', preparer_tin:'', preparer_phone:'',
    preparer_mailingStreet:'', preparer_cityStateZip:'', preparer_email:'', preparer_signatureDate:'',
    // Milestone 39-C
    preparer_signatureState:'', preparer_signatureImage:'',
    // Attorney certification
    attorney_name:'', attorney_bar:'', attorney_phone:'',
    attorney_street:'', attorney_cityStateZip:'', attorney_email:'', attorney_signatureDate:'',
    // Milestone 39-C
    attorney_signatureState:'', attorney_signatureImage:''
  };
}

// The Annual Plan -- Minors's pages, in sidebar order -- what the router and the sidebar
// accept and list for it. Moved from legacy-app.js's routing section.
export const PAGES_PLAN_MINOR=[
  {id:'/',        label:'Cover'},
  {id:'/summary', label:'Summary'},
  {id:'/p2',      label:'2. Prior Residences'},
  {id:'/p3',   label:'3. Treatment Providers'},
  {id:'/p4',   label:'4. Medical Services'},
  {id:'/p5',   label:'5. Education & Social Development'},
  {id:'/p6',   label:'Guardian Signatures'},
  {id:'/p7',   label:'Preparer & Attorney'},
  {id:'/p8',   label:'Certificate of Service'},
  {id:'/print',label:'Print Preview'},
];
