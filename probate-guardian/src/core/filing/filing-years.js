// Milestone 70, 70G: multi-year accounting -- a filing's years, what a new
// year resets and carries, and switching between them. Moved from
// legacy-app.js's MULTI-YEAR ACCOUNTING.
import { formEngine } from './filing-registry.js';
import { emptyRowAnnual } from './models/annual.js';
import { emptyPlanProvider, emptyPlanResidence } from './models/plan-annual.js';
import { emptyInitialProvider } from './models/plan-initial.js';
import { emptyMinorProvider, emptyMinorResidence } from './models/plan-minor.js';
import { hydrateCountyFromWardParty } from '../navigation/ward-county.js';
import { flushPendingSave, saveWardToState, setDirtySinceExport, updateLastSavedIndicator } from '../persistence/case-file.js';
import { monolith } from '../runtime/monolith.js';
import { getCaseFile } from '../state.js';
import { notifyProbateGuardianTabStateChanged } from '../navigation/tab-state.js';

// A ward's flat top-level fields (schedules, balances, signatures, etc.)
// always represent whichever year is currently "active" — every existing
// render/print/export/validation function reads and writes through
// window.D exactly as before, with no awareness that years exist at all.
// Prior years are simply snapshotted off those same fields into
// ward.years[] and swapped back in on request. These keys are the only
// ones that are NOT part of a year's data.
export const WARD_SYSTEM_KEYS=['wardId','inventoryType','createdDate','lastModified','archived','scheduleDocs','years','activeYearKey','yearCounter'];

export function snapshotCurrentYearData(ward){
  const data={};
  for(const k in ward){
    if(!WARD_SYSTEM_KEYS.includes(k))data[k]=ward[k];
  }
  return JSON.parse(JSON.stringify(data));
}

export function applyYearData(ward,data){
  for(const k of Object.keys(ward)){
    if(!WARD_SYSTEM_KEYS.includes(k))delete ward[k];
  }
  Object.assign(ward,JSON.parse(JSON.stringify(data)));
}

// Resets the fields that must be blank/empty for a fresh, unsigned filing
// of a new period. Names, addresses, eligibility answers, and (for
// Guardian) the asset schedules all carry forward as-is from the year
// being archived — re-typing mostly-unchanged case information every year
// would be far more work than editing down what actually changed. What
// DOES reset differs by type:
//  - Signatures/dates: always cleared, this is an unsigned new filing.
//  - Annual/Simplified period dates + amended flag: cleared, set on Cover.
//  - Remuneration: a fresh declaration each year, not a running total.
//  - Annual's income/disbursement/capital-adjustment/transfer/sale
//    schedules (schA, schB1-4, schC, schE, schF1-2): these describe
//    transactions THAT happened during one specific period, so they reset
//    empty. Schedule D (assets/liabilities as of period end) is instead
//    carried forward, becoming next period's starting holdings — exactly
//    the schedule-level equivalent of Simplified's starting balance.
//  - Simplified's Interest/Deposits/Service Charges/Federal Tax: reset —
//    each is a specific period's transactions, not a standing balance.
export function resetYearlyFieldsForNewYear(data,type){
  const carriedAssignee=typeof data.dashboardWorkflow?.assigneeName==='string'
    ? data.dashboardWorkflow.assigneeName.trim().replace(/\s+/g,' ').slice(0,120)
    : '';
  if(carriedAssignee)data.dashboardWorkflow={assigneeName:carriedAssignee};
  else delete data.dashboardWorkflow;
  const clearDate=obj=>{if(obj&&('signatureDate' in obj))obj.signatureDate='';};
  if(Array.isArray(data.guardians)){
    data.guardians.forEach(g=>{clearDate(g);if(g&&('signatureDateLabel' in g))g.signatureDateLabel='';});
  }
  if(type==='guardian'){
    clearDate(data.preparer);
    if(data.attorney){data.attorney.signatureDate=null;data.attorney.filingDate=null;}
    data.serviceDate=null;
    data.amendedForm='';
    delete data.isAmended;
  }else if(type==='simplified'){
    data.attorney_signatureDate='';
    data.certServiceDate='';
    data.certAttySignDate='';
    data.periodFrom='';data.periodTo='';
    data.amendedForm='';
    data.interestIncome='';data.depositsSettlement='';data.serviceCharges='';data.federalIncomeTax='';
  }else if(formEngine(type)==='annual'){
    clearDate(data.preparer);
    data.attorney_signatureDate='';
    data.certDate='';
    data.certAttySignDate='';
    data.periodFrom='';data.periodTo='';
    data.amendedForm='';
    data.schA=[];data.schB1=[];data.schB2=[];data.schB3=[];data.schB4=[];
    data.schC=[];data.schE=[];data.schF1=[];data.schF2=[];
  }else if(type==='planSimplified'){
    // Every answer on a Plan describes one specific year ("during the
    // preceding year", "in the past year"), so ALL of them reset — unlike
    // the accountings, nothing here is a carried-forward balance. Only the
    // ward's identity and the guardians' contact details survive.
    data.periodFrom='';data.periodTo='';
    data.q1Residences='';data.q2BestPlacement='';data.q3MedicalTreatment='';data.q4Diagnosis='';
    data.q5SocialServices='';data.q6Interaction='';
    data.q7RestoreRights='';data.q7RestoreExplain='';
    data.q8DNR=false;data.q8LivingWill=false;data.q8Surrogate=false;data.q8POA=false;
    data.q8Other=false;data.q8OtherText='';data.q8None=false;
    data.q9Remuneration='';data.q9RemunerationExplain='';
    if(Array.isArray(data.planGuardians)){
      data.planGuardians.forEach(g=>{if(g)g.signatureDate='';});
    }
  }else if(type==='planAnnual'){
    // Same reasoning as the Simplified Plan: every answer describes one
    // specific reporting year. The two repeating tables reset to a single
    // blank row rather than being emptied, so the page isn't a bare
    // "no entries" state when the guardian opens it.
    data.periodFrom='';data.periodTo='';
    data.q1Residences=[emptyPlanResidence()];
    data.q4Providers=[emptyPlanProvider()];
    data.q2NoMove=false;data.q2WithinCounty=false;data.q2WithinCircuit=false;
    data.q2OutsideApproved=false;data.q2OutsideVenuePetition=false;
    data.q5SocialSkills='';data.q5Activities='';data.q7RightsExplain='';
    // Rights and ADL ratings are a fresh assessment each year — carrying
    // last year's forward would defeat the purpose of the annual review.
    if(data.rights)Object.keys(data.rights).forEach(k=>data.rights[k]='');
    if(data.adls)Object.keys(data.adls).forEach(k=>data.adls[k]='');
    if(data.benefits)Object.values(data.benefits).forEach(benefit=>{
      if(benefit){benefit.eligible='';benefit.appliedFor='';}
    });
    // Milestone 37-4: empty, not pre-seeded -- see state.js's identical note.
    data.q10Directives=[];
    data.q11NoRemuneration=false;data.q11NoRemunerationName='';
    data.q11ReceivedName='';data.q11Amount='';data.q11From='';data.q11SubmittedToCourt=false;
    data.certIncapacitatedNoCopy=false;data.certMinorNoCopy=false;data.certConsulted=false;
    data.certNoRestriction=false;data.certProvidesMedical=false;
    data.certPhysicianAttached=false;data.certRecognizeRights=false;
    data.certRightsChangedExplain='';
    data.attorney_signatureDate='';
    if(Array.isArray(data.planGuardians)){
      data.planGuardians.forEach(g=>{if(g)g.signatureDate='';});
    }
  }else if(type==='planInitial'){
    // The Initial Plan is normally a one-time filing, but if a guardian
    // needs to amend or refile it, every answer describes conditions as of
    // filing — nothing here is a carried balance. Only ward identity and
    // guardian contact details survive.
    data.periodFrom='';data.periodTo='';
    data.inceptionDate='';data.lettersSignedDate='';data.successorGuardianship='';
    data.wardLiving='';data.residenceAddress='';data.residenceCityStateZip='';data.residencePhone='';
    data.mailingAddress='';data.mailingCityStateZip='';data.q1PreexistingDirectives='';
    data.q2ALF=false;data.q2GroupHome=false;data.q2Intermediate=false;data.q2PrivateResidence=false;data.q2SkilledNursing=false;data.q2Specialized=false;data.q2StateHospital=false;data.q2Other=false;data.q2Explain='';
    data.q3MedPrimary=false;data.q3MedDentist=false;data.q3MedOphthalmologist=false;
    data.q3MedSpecialist=false;data.q3MedSpecialistArea='';data.q3MedPT=false;
    data.q3MedST=false;data.q3MedOT=false;data.q3MedWardDecides=false;
    data.q3MedOther=false;data.q3MedExplain='';
    data.q4Psych=false;data.q4Outpatient=false;data.q4Inpatient=false;data.q4None=false;data.q4Other=false;data.q4Explain='';
    data.q5CareFacility=false;data.q5NursesAides=false;data.q5FamilyFriends=false;data.q5Other=false;data.q5Explain='';
    data.q6CareFacility=false;data.q6NursesAides=false;data.q6FamilyFriends=false;
    data.q6DayProgram=false;data.q6WardDecides=false;data.q6Other=false;data.q6Explain='';
    data.q7SocialSecurity='';data.q7Ssdi='';data.q7Hmo='';data.q7Ssi='';
    data.q7StateSupplement='';data.q7InstitutionalCare='';data.q7SupplementalIns='';
    data.q7Pension='';data.q7Medicare='';data.q7Medicaid='';data.q7Va='';
    data.q7Trusts='';data.q7PendingBenefits='';data.q7Other=false;data.q7Explain='';
    data.q9Providers=[emptyInitialProvider()];
    if(data.adls)Object.keys(data.adls).forEach(k=>data.adls[k]='');
    data.mentalAlzheimers=false;data.mentalAutism=false;data.mentalClosedHeadInjury=false;
    data.mentalDementia=false;data.mentalDepression=false;data.mentalDevelopmental=false;
    data.mentalSubstance=false;data.mentalSchizophrenia=false;data.mentalOther=false;data.mentalExplain='';
    data.physMobility=false;data.physBlindness=false;data.physDeafness=false;data.physDiabetic=false;
    data.physParkinsons=false;data.physArthritis=false;data.physOther=false;data.physExplain='';
    data.usesDentures=false;data.usesHearingAid=false;data.usesWheelchair=false;data.usesWalker=false;
    data.usesCrutches=false;data.usesProsthetics=false;data.usesGlasses=false;data.usesNone=false;
    data.usesOther=false;data.usesExplain='';
    data.needsDentures=false;data.needsHearingAid=false;data.needsWheelchair=false;data.needsWalker=false;
    data.needsCrutches=false;data.needsProsthetics=false;data.needsGlasses=false;data.needsNone=false;
    data.needsOther=false;data.needsExplain='';
    data.committeeIncorporated='';data.committeeExplain='';
    data.q11NoDirectives=false;data.q11StepResidence=false;data.q11StepSafeDeposit=false;
    data.q11StepInterviewed=false;data.q11StepMedicalProviders=false;data.q11StepAttorney=false;
    data.q11Executed=false;data.q11ExecDNR=false;data.q11ExecHealthcare=false;
    data.q11ExecPOA=false;data.q11ExecOther=false;data.q11ExecOtherText='';
    // Milestone 37-4: empty, not pre-seeded -- see state.js's identical note.
    data.q11Directives=[];
    data.certIncapacitatedNoCopy=false;data.certMinorNoCopy=false;data.certConsulted=false;
    data.certRecognizeRights=false;data.certNoRestriction=false;data.certProvidesCare=false;
    data.attorney_signatureDate='';
    if(Array.isArray(data.planGuardians)){
      data.planGuardians.forEach(g=>{if(g)g.signatureDate='';});
    }
  }else if(type==='planMinor'){
    // Filed annually like the Annual Guardianship Plan — every answer
    // describes one specific reporting year. Only the minor's identity and
    // guardian contact details survive; residences/providers reset to a
    // single blank row.
    data.periodFrom='';data.periodTo='';
    data.amendedForm='';data.amendedVersion='';
    data.q1ResidenceName='';data.q1Street='';data.q1City='';data.q1State='';data.q1Zip='';data.q1Phone='';
    data.q2Residences=[emptyMinorResidence()];
    data.q3Providers=[emptyMinorProvider()];
    data.q4Primary=false;data.q4PrimaryFreq='';data.q4Dentist=false;data.q4DentistFreq='';
    data.q4Specialist=false;data.q4SpecialistFreq='';
    data.q4PT=false;data.q4ST=false;data.q4OT=false;data.q4MinorDecides=false;
    data.q4Other=false;data.q4Explain='';
    data.q5SchoolProgress='';data.q5SocialDevelopment='';data.q5Communicates='';data.q5Interpersonal='';
    data.q5NoUnmetNeeds=false;data.q5DoesNotCareToSocialize=false;data.q5UnmetNeeds=false;
    data.q5Other=false;data.q5Explain='';
    data.certIncapacitated=false;data.certMinor=false;data.certConsulted=false;
    data.certNoRestriction=false;data.certProvidesCare=false;data.certPhysicianAttached=false;
    data.preparer_signatureDate='';data.attorney_signatureDate='';
    if(Array.isArray(data.planGuardians)){
      data.planGuardians.forEach(g=>{if(g)g.signatureDate='';});
    }
  }
  // Remuneration is a fresh declaration each year, not a running total.
  if(Array.isArray(data.remuneration)){
    data.remuneration=data.remuneration.map(()=>formEngine(type)==='annual'?emptyRowAnnual('remun'):({guardian:'',type:'',description:''}));
  }
}

// Guardianship annual/simplified accounting periods commonly span two
// calendar years (they run from one anniversary of the case to the next,
// not Jan-Dec), so "2025-2026" reads far more like a real filing period
// than an abstract "Year 2" ever would. Falls back to the internal
// key only when no period has been entered yet (e.g. right after
// starting a new year, before its dates are filled in on the Cover page).
export function describeYearLabel(ward,data,archivedAt){
  const key=ward.activeYearKey||'Year 1';
  if(ward.inventoryType!=='guardian'){
    const fromYear=data.periodFrom?String(data.periodFrom).slice(0,4):'';
    const toYear=data.periodTo?String(data.periodTo).slice(0,4):'';
    if(fromYear&&toYear)return fromYear===toYear?fromYear:`${fromYear}-${toYear}`;
    if(fromYear||toYear)return fromYear||toYear;
    return key;
  }
  // Initial Inventory has no accounting period, and its GID never changes
  // across re-inventory years, so it can't distinguish Year 1 from Year 2.
  // Label by the calendar year this particular snapshot was recorded in.
  return String(new Date(archivedAt||Date.now()).getFullYear());
}

// Snapshots whatever is currently loaded on the ward into its slot in
// ward.years[], keyed by the year it's leaving. Shared by switchWardYear
// (moving to an existing year) and startNewWardYear (moving to a new one)
// so a year's data is never lost no matter which direction triggered it.
export function checkInActiveYear(ward){
  ward.years=ward.years||[];
  ward.yearCounter=ward.yearCounter||1;
  ward.activeYearKey=ward.activeYearKey||('Year '+ward.yearCounter);
  const data=snapshotCurrentYearData(ward);
  const archivedAt=new Date().toISOString();
  const label=describeYearLabel(ward,data,archivedAt);
  const existing=ward.years.find(y=>y.key===ward.activeYearKey);
  if(existing){existing.data=data;existing.label=label;existing.archivedAt=archivedAt;}
  else ward.years.push({key:ward.activeYearKey,label,archivedAt,data});
}

export async function switchWardYear(wardId,targetKey){
  const ward=getCaseFile().wards.find(w=>w.wardId===wardId);
  if(!ward)return;
  await flushPendingSave();
  checkInActiveYear(ward);
  const idx=ward.years.findIndex(y=>y.key===targetKey);
  if(idx===-1)return;
  const target=ward.years[idx];
  ward.years.splice(idx,1);
  applyYearData(ward,target.data);
  ward.activeYearKey=target.key;
  await saveWardToState(ward);
  setDirtySinceExport(true);
  updateLastSavedIndicator();
  notifyProbateGuardianTabStateChanged();
}

// Archives the current year (carrying forward everything by default) and
// opens a fresh one: ending net total becomes next year's starting balance
// for Annual/Simplified, and Initial Inventory's schedules carry forward
// unchanged so the guardian edits down what's changed instead of
// re-entering the whole asset list.
export async function startNewWardYear(wardId){
  const ward=getCaseFile().wards.find(w=>w.wardId===wardId);
  if(!ward)return;
  await flushPendingSave();
  const priorTotal=monolith.getWardHeadlineTotal(ward);
  checkInActiveYear(ward);
  const seed=snapshotCurrentYearData(ward);
  resetYearlyFieldsForNewYear(seed,ward.inventoryType);
  if((formEngine(ward.inventoryType)==='annual'||ward.inventoryType==='simplified')&&priorTotal!=null){
    seed.startingBalance=String(priorTotal);
  }
  applyYearData(ward,seed);
  // Milestone 40C-A item 3: a new year is a new filing for the same ward, so it
  // hydrates from the canonical ward Party. The same-ward snapshot carry above
  // usually already supplies it; this fills the case where the prior year had no
  // county but the ward Party does. It never overwrites a county the year
  // already carries -- prior years stay auditable.
  hydrateCountyFromWardParty(ward);
  ward.yearCounter=(ward.yearCounter||1)+1;
  ward.activeYearKey='Year '+ward.yearCounter;
  await saveWardToState(ward);
  setDirtySinceExport(true);
  updateLastSavedIndicator();
  notifyProbateGuardianTabStateChanged();
}

// The period key a given archived year's supporting-document uploads and
// comments were filed under, so deleting the year can clean those up too
// instead of leaving them orphaned. Mirrors scheduleDocPeriodKey(), but
// against an arbitrary snapshot rather than the live active ward.
export function periodKeyForYearData(ward,yearEntry){
  if(ward.inventoryType==='guardian')return yearEntry.key;
  const d=yearEntry.data||{};
  return `${d.periodFrom||''}__${d.periodTo||''}`;
}

export async function deleteWardYear(wardId,yearKey){
  const ward=getCaseFile().wards.find(w=>w.wardId===wardId);
  if(!ward||!ward.years)return;
  const idx=ward.years.findIndex(y=>y.key===yearKey);
  if(idx===-1)return;
  const periodKey=periodKeyForYearData(ward,ward.years[idx]);
  if(ward.scheduleDocs){
    for(const scheduleKey of Object.keys(ward.scheduleDocs)){
      delete ward.scheduleDocs[scheduleKey][periodKey];
    }
  }
  ward.years.splice(idx,1);
  await saveWardToState(ward);
  setDirtySinceExport(true);
  updateLastSavedIndicator();
  notifyProbateGuardianTabStateChanged();
}
