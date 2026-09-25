// Milestone 70, 70C: the Simplified Annual Plan's blank filing, moved from
// src/core/state.js. Pure data, loaded eagerly.
import { emptyCertificateOfService } from '../plan-certificate-of-service.js';

// Blank-ward data factory for the Plan Simplified feature (Milestone 3,
// Phase B). Same reasoning as emptyDataSimplified above -- pure data, needed
// synchronously at ward-creation time, before the lazily-imported
// features/plan-simplified/index.js is ever loaded (Milestone 3 plan's
// "Confirmed facts" / recurring Problem 1).
export function emptyDataPlanSimplified() {
  return {
    planTriStateSchemaVersion:2,
    // Milestone 68C: the Certificate of Service, on every Plan.
    ...emptyCertificateOfService(),
    wardName:'', caseNumber:'', ucn:'', periodFrom:'', periodTo:'', county:'',
    q1Residences:'', q2BestPlacement:'', q3MedicalTreatment:'', q4Diagnosis:'',
    q5SocialServices:'', q6Interaction:'',
    q7RestoreRights:'', q7RestoreExplain:'',
    q8DNR:false, q8LivingWill:false, q8Surrogate:false, q8POA:false,
    q8Other:false, q8OtherText:'', q8None:false,
    q9Remuneration:'', q9RemunerationExplain:'',
    planGuardians:[{name:'',signatureDate:'',email:'',phone:'',mailingAddress:''}],
    // Milestone 61A. Captured by this form's UI (features/plan-simplified/
    // index.js) but deliberately absent from its filed PDF -- the Simplified
    // Annual Plan's court original ends at the guardian signatures, with no
    // preparer or attorney certification page (61E). Without these keys a
    // value typed into a new filing was dropped on reload. Deliberately NOT
    // mirroring emptyDataPlanMinor()'s preparer_tin or per-role
    // signature-stamp state: nothing in this form reads them.
    preparer_name:'', preparer_phone:'', preparer_email:'',
    preparer_mailingStreet:'', preparer_cityStateZip:'', preparer_signatureDate:'',
    attorney_name:'', attorney_bar:'', attorney_phone:'', attorney_signatureDate:'',
    attorney_email:'', attorney_secondary_email:'', attorney_street:'',
    attorney_cityStateZip:''
  };
}

// The Simplified Annual Plan's pages, in sidebar order -- what the router and the sidebar
// accept and list for it. Moved from legacy-app.js's routing section.
export const PAGES_PLAN_SIMPLIFIED=[
  {id:'/',        label:'Cover'},
  {id:'/summary', label:'Summary'},
  {id:'/p2',      label:'The Plan'},
  {id:'/p3',   label:'Signatures'},
  {id:'/p4',   label:'Certificate of Service'},
  {id:'/print',label:'Print Preview'},
];
