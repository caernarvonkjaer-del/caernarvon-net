// Milestone 70, 70G: multi-year accounting -- a filing's years, what a new
// year resets and carries, and switching between them. Moved from
// legacy-app.js's MULTI-YEAR ACCOUNTING.
import { formEngine } from './filing-registry.js';
import { noItemsKeyFor } from '../form/no-items-keys.js';
import { emptyRowAnnual } from './models/annual.js';
import { emptyPlanProvider, emptyPlanResidence } from './models/plan-annual.js';
import { emptyInitialProvider } from './models/plan-initial.js';
import { emptyMinorProvider, emptyMinorResidence } from './models/plan-minor.js';
import { hydrateCountyFromWardParty } from '../navigation/ward-county.js';
import { flushPendingSave, saveWardToState, setDirtySinceExport, updateLastSavedIndicator } from '../persistence/case-file.js';
import { applyCarriedStartingBalance } from './starting-balance-carry.js';
import { getCaseFile } from '../state.js';
import { clearCertificateAnswers } from './service-method.js';
import { notifyProbateGuardianTabStateChanged } from '../navigation/tab-state.js';
import { recordModelChange } from '../model-change.js';
import { nextIsoDay } from '../form/date-parser.js';
import { getPath, setPath } from '../form/paths.js';
import { clearSignaturesForNewYear, keepYearSignaturePolicy } from '../signature/signature-policy.js';
import { latestYearKey, isOlderYearOpen } from './year-links.js';
import { inventoryDocKey, resolveActiveDocPeriod } from './doc-period.js';

// A ward's flat top-level fields (schedules, balances, signatures, etc.)
// always represent whichever year is currently "active" — every existing
// render/print/export/validation function reads and writes through
// window.D exactly as before, with no awareness that years exist at all.
// Prior years are simply snapshotted off those same fields into
// ward.years[] and swapped back in on request. These keys are the only
// ones that are NOT part of a year's data. Milestone 76F (decision 76F-2):
// the case link and the ward link are the filing's, not a year's
// (year-links.js) -- an older year opened lost them.
export const WARD_SYSTEM_KEYS=['wardId','inventoryType','createdDate','lastModified','archived','scheduleDocs','years','activeYearKey','yearCounter','caseId','wardPartyId'];

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
  // Milestone 76F: a year's data never overwrites what is the filing's (an
  // archived year saved before 76F held its own case and ward links).
  const copy=JSON.parse(JSON.stringify(data));
  for(const k of WARD_SYSTEM_KEYS)delete copy[k];
  Object.assign(ward,copy);
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
// A new year clears what describes the year just closed and keeps what
// describes the ward (the requester's rule, 2026-10-17: "basic info that
// doesn't change should be kept ... Name, address etc should carry over,
// expenditures should not"). The "I verify there are no items" tick of a
// list the new year empties declared last year's list, not this one's, so
// it is asked again -- Part XI's and Part VII's remuneration declarations
// among them, which the export checks require answered (section
// 744.367(3)(a)). A list that carries forward keeps its tick with it.
function clearNoItemsTicks(data,type,lists){
  if(!data.scheduleNoItems)return;
  for(const list of lists){
    const tick=noItemsKeyFor(type,list);
    if(tick&&data.scheduleNoItems[tick])data.scheduleNoItems[tick]=false;
  }
}

// What the Start New Year dialog says each form's new year keeps and clears
// (Milestone 73P, D23; the Plans' carries since 2026-10-17), beside the
// reset it describes.
export function newYearNote(type){
  if(type==='guardian')return "The new year opens with a copy of this year's schedules (A-1 through C-5) so you can edit down what's changed, instead of re-entering everything. Signatures and dates are cleared for the new filing.";
  if(type==='simplified')return "The new year opens with Starting Balance pre-filled from this year's Remaining Assets On Hand. Part II's receipts and disbursements, Part VII's remuneration, signatures, and the accounting period are cleared for the new filing, and Part VII's \"I verify there are no items\" answer is asked again.";
  if(formEngine(type)==='annual')return "The new year opens with Starting Balance pre-filled from this year's ending total and Schedule D's holdings carried forward. The income, disbursement, capital-change and transfer schedules, Part XI's remuneration, signatures, and the accounting period are cleared for the new filing, and their \"I verify there are no items\" answers are asked again.";
  const cleared="The plan's other answers, signatures and dates are cleared for the new filing: each describes one year.";
  if(type==='planAnnual')return "The new year keeps the ward's and the guardians' details, where the ward lives, and the answers to Questions 3, 9 and 10 (the care plan, disabilities and advance directives) for you to review. "+cleared;
  // Milestone 76L item 5 (decision 76L-1).
  if(type==='planInitial')return "The new year keeps the ward's and the guardians' details, where the ward lives and the mailing address, and the guardianship's inception date, Letters date and successor answer for you to review. "+cleared;
  if(type==='planSimplified')return "The new year keeps the ward's and the guardians' details and the answers to Questions 2 and 4 (why this is the best placement, and the ward's diagnosis and conditions) for you to review. "+cleared;
  if(type==='planMinor')return "The new year keeps the minor's and the guardians' details, the minor's current residence, and Question 4's proposed medical services for you to review. "+cleared;
  return "The new year keeps the ward's and the guardians' details. The plan's answers, signatures and dates are cleared for the new filing: each describes one year.";
}

// Milestone 76E: Start New Year clears the dates still being typed on exactly
// the fields it resets, and keeps those on fields it carries (the 2026-10-17
// rule). It kept them all: an impossible date on a reset Schedule B-1 line
// went on blocking every output of the new year, its box gone from the page.
// Which fields reset is the reset's own business, form by form, so it is not
// listed twice: the same reset runs first on a copy with a marker in each
// draft's field, and a draft whose marker the reset removed goes.
const DRAFT_PROBE='\u0000draft-field';
const PROBE_SKIP=new Set(['scheduleDocs','printAnnotations']); // large; no draft lives there
function clearDraftsOfResetFields(data,type){
  const drafts=data&&data.__fieldDrafts;
  if(!drafts||typeof drafts!=='object'||!Object.keys(drafts).length)return;
  const probe=JSON.parse(JSON.stringify(data,(k,v)=>(PROBE_SKIP.has(k)?undefined:v)));
  const probed=Object.keys(drafts).filter((path)=>{
    const dot=path.lastIndexOf('.');
    const parent=dot<0?probe:getPath(probe,path.slice(0,dot));
    if(!parent||typeof parent!=='object')return false;
    setPath(probe,path,DRAFT_PROBE);
    return true;
  });
  resetYearlyFields(probe,type);
  for(const path of Object.keys(drafts)){
    if(!probed.includes(path)||getPath(probe,path)!==DRAFT_PROBE)delete drafts[path];
  }
}

export function resetYearlyFieldsForNewYear(data,type){
  clearDraftsOfResetFields(data,type);
  resetYearlyFields(data,type);
}

function resetYearlyFields(data,type){
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
    // Milestone 74J-2: the Final Report's lists describe one final report.
    if(Array.isArray(data.finalReserved))data.finalReserved=[];
    if(Array.isArray(data.finalTurnover))data.finalTurnover=[];
    // (Ticked "none" before any row was added, a Final Report list has a
    // tick and no array: the tick is cleared all the same.)
    clearNoItemsTicks(data,type,['schA','schB1','schB2','schB3','schB4','schC','schE','schF1','schF2','finalReserved','finalTurnover']);
    // An out-of-balance explanation explains that year's figures.
    data.reconcileExplanation='';
  }else if(type==='planSimplified'){
    // An answer that describes the year ("during the preceding year", "in
    // the past year") resets. The ward's identity, the guardians' contact
    // details, and two answers that describe the ward rather than the year
    // carry forward for the guardian to review (the requester, 2026-10-17):
    // Q2, why this is the best placement, and Q4, the current diagnosis and
    // conditions.
    data.periodFrom='';data.periodTo='';
    data.q1Residences='';data.q3MedicalTreatment='';
    // Milestone 76L item 6: the attorney's signature date too, as every other
    // form clears it (it was kept, unprinted, into the new year).
    data.preparer_signatureDate='';data.attorney_signatureDate='';
    data.q5SocialServices='';data.q6Interaction='';
    data.q7RestoreRights='';data.q7RestoreExplain='';
    data.q8DNR=false;data.q8LivingWill=false;data.q8Surrogate=false;data.q8POA=false;
    data.q8Other=false;data.q8OtherText='';data.q8None=false;
    data.q9Remuneration='';data.q9RemunerationExplain='';
    if(Array.isArray(data.planGuardians)){
      data.planGuardians.forEach(g=>{if(g)g.signatureDate='';});
    }
  }else if(type==='planAnnual'){
    // Same reasoning as the Simplified Plan: an answer that describes the
    // reporting year resets. Where the ward lives, Question 3 (the care
    // plan, 3G's insurance and benefits table with it), Question 9
    // (disabilities and assistive devices) and Question 10 (advance
    // directives, their details with them) describe the ward and carry
    // forward for the guardian to review (the requester, 2026-10-17). The
    // two repeating tables reset to a single blank row rather than being
    // emptied, so the page isn't a bare "no entries" state when the
    // guardian opens it.
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
    // filing — nothing here is a carried balance.
    // Milestone 76L item 5 (decision 76L-1, the requester's): the ward's
    // details -- where the ward lives, the residence and its phone, the
    // mailing address and "mailing same as residence" -- and the
    // guardianship's facts (inception date, Letters date, the successor
    // answer) are kept, as the other Plans keep theirs; they were cleared.
    data.periodFrom='';data.periodTo='';
    data.q1PreexistingDirectives='';
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
    // Filed annually like the Annual Guardianship Plan: an answer that
    // describes the reporting year resets. The minor's identity, the
    // guardians' contact details, the minor's current residence (Q1) and
    // Question 4's proposed medical services carry forward for the guardian
    // to review (the requester, 2026-10-17); residences/providers reset to a
    // single blank row.
    data.periodFrom='';data.periodTo='';
    data.amendedForm='';data.amendedVersion='';
    data.q2Residences=[emptyMinorResidence()];
    data.q3Providers=[emptyMinorProvider()];
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
  // Remuneration is a fresh declaration each year, not a running total --
  // its "none" tick included.
  if(Array.isArray(data.remuneration)){
    data.remuneration=data.remuneration.map(()=>formEngine(type)==='annual'?emptyRowAnnual('remun'):({guardian:'',type:'',description:''}));
  }
  clearNoItemsTicks(data,type,['remuneration']);
  // Milestone 72G (decided 2026-10-02): a certificate describes one filing
  // being served, so a new year keeps its recipients for review and starts
  // every answer blank -- date, method, "no recipients are required", the
  // signer choice, every certificate signature and the ward's status -- on
  // all seven forms (service-method.js). It used to keep last year's method,
  // attestation and signatures, and on the Plans even the service date.
  clearCertificateAnswers(data,String(formEngine(type)).startsWith('plan')?'plan':formEngine(type));
  // Milestone 73A: and every signer's choice and stamp image, the new year on
  // signature policy 2 -- the comment above always said signatures were
  // cleared, but only the dates were, so last year's stamp printed on the new
  // year's unsigned filing.
  clearSignaturesForNewYear(data);
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
  // Milestone 73A: a filed year keeps the signature policy it was filed
  // under, so its reprint matches the filed copy (signature-policy.js).
  keepYearSignaturePolicy(ward);
  ward.activeYearKey=target.key;
  await saveWardToState(ward);
  setDirtySinceExport(true);
  updateLastSavedIndicator();
  notifyProbateGuardianTabStateChanged();
  recordModelChange('year-switch');
}

// Archives the current year (carrying forward everything by default) and
// opens a fresh one: ending net total becomes next year's starting balance
// for Annual/Simplified, and Initial Inventory's schedules carry forward
// unchanged so the guardian edits down what's changed instead of
// re-entering the whole asset list.
export async function startNewWardYear(wardId){
  const ward=getCaseFile().wards.find(w=>w.wardId===wardId);
  if(!ward)return;
  // Milestone 76F item 1 (decision 76F-1): a new year follows the latest
  // year, whichever is open. Started with an earlier year open (to fix a
  // typo, say), it repeated a period that already existed and started from
  // that earlier year's ending balance and holdings.
  if(isOlderYearOpen(ward))await switchWardYear(wardId,latestYearKey(ward));
  await flushPendingSave();
  // Milestone 71E: the one carry (starting-balance-carry.js), read from the
  // year being closed before it is archived -- rounded to cents by the
  // workbook's rule, with the provenance record the Starting Balance notes
  // read. A Trust Accounting's new year carries its own ending balance.
  const carried={};
  const carries=(formEngine(ward.inventoryType)==='annual'||ward.inventoryType==='simplified')
    &&!!applyCarriedStartingBalance(carried,ward,ward.inventoryType);
  checkInActiveYear(ward);
  const seed=snapshotCurrentYearData(ward);
  // Milestone 74K (decision 74K-2): the new period starts the day after the
  // last one ended; Period To stays the filer's, since it follows the
  // court's fiscal-year order.
  const nextFrom=nextIsoDay(seed.periodTo);
  resetYearlyFieldsForNewYear(seed,ward.inventoryType);
  if(nextFrom&&'periodFrom' in seed){
    seed.periodFrom=nextFrom;
    // Milestone 76E: a Period From still being typed was last year's typing.
    if(seed.__fieldDrafts)delete seed.__fieldDrafts.periodFrom;
  }
  if(carries){
    seed.startingBalance=carried.startingBalance;
    seed.startingBalanceCarry=carried.startingBalanceCarry;
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
  recordModelChange('new-year');
}

// The period key a given archived year's supporting-document uploads and
// comments were filed under, so deleting the year can clean those up too
// instead of leaving them orphaned. Mirrors scheduleDocPeriodKey(), but
// against an arbitrary snapshot rather than the live active ward.
export function periodKeyForYearData(ward,yearEntry){
  if(ward.inventoryType==='guardian')return inventoryDocKey(yearEntry.key);
  const d=yearEntry.data||{};
  return `${d.periodFrom||''}__${d.periodTo||''}`;
}

/**
 * Milestone 76F item 4 (decision 76F-3): another year of the filing whose
 * documents are kept in the same folder as `yearKey`'s -- two years with the
 * same reporting period (both blank, say) share one -- or null.
 */
export function yearSharingDocuments(ward,yearKey){
  const entry=(ward.years||[]).find(y=>y.key===yearKey);
  if(!entry)return null;
  const key=periodKeyForYearData(ward,entry);
  if(resolveActiveDocPeriod(ward)===key)return {key:ward.activeYearKey,label:describeYearLabel(ward,ward)};
  const other=(ward.years||[]).find(y=>y.key!==yearKey&&periodKeyForYearData(ward,y)===key);
  return other?{key:other.key,label:other.label}:null;
}

export async function deleteWardYear(wardId,yearKey){
  const ward=getCaseFile().wards.find(w=>w.wardId===wardId);
  if(!ward||!ward.years)return;
  const idx=ward.years.findIndex(y=>y.key===yearKey);
  if(idx===-1)return;
  const periodKey=periodKeyForYearData(ward,ward.years[idx]);
  // Decision 76F-3: a folder another year still uses is kept (deleting either
  // year deleted both years' documents).
  if(ward.scheduleDocs&&!yearSharingDocuments(ward,yearKey)){
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
