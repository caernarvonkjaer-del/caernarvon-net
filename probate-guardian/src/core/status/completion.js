// Milestone 70, 70D: section completion -- the sidebar's check marks and the
// dashboard's filing progress -- as one pure evaluator per form engine.
//
// Milestone 73F part 2: the marks themselves are no longer decided here. Six
// hand-written rule sets used to decide "is this section complete?" beside the
// export checks, and they disagreed: a section showed ✓ and Print Preview then
// blocked it, or stayed − while export passed. Every mark now comes from the
// export checks' own answer (src/core/status/section-marks.js, over
// src/core/validation/engines/'s evaluateFiling()), so the sidebar, the page
// checklist, the dashboard and Preview cannot disagree.
//
// What stays here is the one thing those checks don't answer: whether the
// filer has started a section at all. Each Summary page shows an unfinished
// section the filer has begun as "in progress" and an untouched one as "not
// started" (src/core/summary-renderer.js's navStatus()). These are the old
// evaluators' `incomplete` maps, unchanged except that "and not complete" is
// now decided by the shared checks: a section reads begun only while it is
// incomplete (section-marks.js). The Initial Inventory never marked a section
// begun, and still doesn't.
import { PLAN_RIGHTS, PLAN_ADLS } from '../filing/models/plan-annual.js';
import { INITIAL_ADLS } from '../filing/models/plan-initial.js';
import { guardianHasAnyData } from '../validation/row-started.js';
import { isPlanInitialAttorneyStarted, isAttorneyStarted } from '../validation/attorney-block.js';
import { certificateStarted as planCertificateStarted } from '../filing/plan-certificate-of-service.js';

const filledText = (v) => v !== '' && v !== null && v !== undefined;
const filledPlan = (v) => v !== '' && v !== null && v !== undefined && v !== false;
const anyOf = (...vals) => vals.some((v) => !!v);

/** guardian engine: no section ever read as begun. */
export function guardianStarted() {
  return {};
}

/** simplified engine. */
export function simplifiedStarted(D) {
  const hasAny = (...vals) => vals.some((v) => filledText(v));
  const guardians = D.guardians || [];
  return {
    's-cover': hasAny(D.wardName, D.caseNumber, D.ssn, D.gid, D.periodFrom, D.periodTo, D.guardian, D.attorney, D.typeOfGuardianship, D.county),
    's-p2': hasAny(D.startingBalance, D.interestIncome, D.depositsSettlement, D.serviceCharges, D.federalIncomeTax),
    's-p3': hasAny(D.periodFrom, D.periodTo),
    's-p4': guardians.length > 0 || guardianHasAnyData(guardians[0] || {}),
    's-p5': hasAny(D.attorney_barNumber, D.attorney_phone, D.attorney_street, D.attorney_cityStateZip),
    's-p6': hasAny(D.certServiceDate, D.certIndicator, D.certWardStatus, D.certRecipients?.[0]?.name),
    's-p7': (D.remuneration || []).some((r) => hasAny(r.guardian, r.type)),
  };
}

/** annual engine (Final and Trust take the Annual one). */
export function annualStarted(D) {
  const rowHasAnyData = (r) => Object.entries(r || {}).some(([key, v]) => key !== 'id' && v !== '' && v != null);
  const rowsStarted = (rows) => (rows || []).some((r) => rowHasAnyData(r));
  const guardians = D.guardians || [];
  return {
    'a-p1': true,
    'a-p2': filledText(D.startingBalance),
    'a-p3': guardians.length > 0 || guardianHasAnyData(guardians[0] || {}),
    'a-p4': true,
    'a-p5': true,
    'a-scha': rowsStarted(D.schA),
    'a-schb1': rowsStarted(D.schB1),
    'a-schb2': rowsStarted(D.schB2),
    'a-schb3': rowsStarted(D.schB3),
    'a-schb4': rowsStarted(D.schB4),
    'a-schc': (D.schC || []).length > 0,
    'a-schd1': rowsStarted(D.schD1),
    'a-schd2': rowsStarted(D.schD2),
    'a-schd3': rowsStarted(D.schD3),
    'a-schd4': rowsStarted(D.schD4),
    'a-schd5': rowsStarted(D.schD5),
    'a-sche': (D.schE || []).length > 0,
    'a-schf1': rowsStarted(D.schF1),
    'a-schf2': rowsStarted(D.schF2),
  };
}

/** planSimplified engine. */
export function planSimplifiedStarted(D) {
  const hasAny = (...vals) => vals.some((v) => filledPlan(v));
  const g0 = (D.planGuardians || [])[0] || {};
  return {
    'ps-cover': hasAny(D.wardName, D.caseNumber, D.periodFrom, D.periodTo),
    'ps-p2': hasAny(D.q1Residences, D.q2BestPlacement, D.q3MedicalTreatment, D.q4Diagnosis, D.q5SocialServices, D.q6Interaction, D.q7RestoreRights, D.q9Remuneration, D.q8DNR, D.q8LivingWill, D.q8Surrogate, D.q8POA, D.q8Other, D.q8None),
    'ps-p3': hasAny(g0.name, g0.signatureDate, g0.email, g0.phone, g0.mailingAddress),
    'ps-p4': planCertificateStarted(D),
  };
}

/** planAnnual engine. */
export function planAnnualStarted(D) {
  const hasAny = (...vals) => vals.some((v) => filledPlan(v));
  const g0 = (D.planGuardians || [])[0] || {};
  const rights = D.rights || {};
  const adls = D.adls || {};
  return {
    'pa-cover': hasAny(D.wardName, D.caseNumber, D.gid, D.periodFrom, D.periodTo, D.guardian, D.wardLiving, D.residenceAddress),
    'pa-p2': (D.q1Residences || []).some((r) => r && hasAny(r.name, r.street, r.cityStateZip, r.phone, r.facilityType, r.from, r.to)),
    'pa-p3': anyOf(D.q2NoMove, D.q2WithinCounty, D.q2WithinCircuit, D.q2OutsideApproved, D.q2OutsideVenuePetition,
      D.q3SettingALF, D.q3SettingGroupHome, D.q3SettingIntermediate, D.q3SettingPrivate, D.q3SettingSkilled,
      D.q3SettingSpecialized, D.q3SettingStateHospital, D.q3SettingOther, D.q3MedPrimary, D.q3MentalPsych, D.q3PersonalFacility, D.q3SocialFacility),
    'pa-p4': false,
    'pa-p5': (D.q4Providers || []).some((r) => r && hasAny(r.name, r.providerType, r.visits, r.street, r.cityStateZip, r.phone)),
    'pa-p6': hasAny(D.q5SocialSkills, D.q5Activities) || PLAN_RIGHTS.some(([k]) => filledPlan(rights[k])),
    'pa-p7': PLAN_ADLS.some(([k]) => filledPlan(adls[k])),
    'pa-p8': anyOf(D.q9MentalDementia, D.q9MentalAlzheimers, D.q9PhysMobility, D.q9UsesGlasses, D.q9NeedsGlasses, D.q9MentalNone, D.q9PhysNone),
    'pa-p9': anyOf(D.q10NoDirectives, D.q10Executed),
    'pa-p10': anyOf(D.q11NoRemuneration, D.q11ReceivedName, D.q11Amount, D.q11From),
    // Milestone 72C: an attorney started on its own also marks the page begun.
    'pa-p11': hasAny(g0.name, g0.signatureDate, g0.phone, g0.email, g0.ssn) || isAttorneyStarted(D, 'planAnnual'),
    'pa-p12': (D.certRecipients || []).some((r) => r && hasAny(r.name, r.line2, r.line3, r.line4)) || filledPlan(D.certNoRecipients) || filledPlan(D.certDate),
  };
}

/** planInitial engine. */
export function planInitialStarted(D) {
  const hasAny = (...vals) => vals.some((v) => filledPlan(v));
  const g0 = (D.planGuardians || [])[0] || {};
  const adls = D.adls || {};
  return {
    'pi-cover': hasAny(D.wardName, D.caseNumber, D.inceptionDate, D.lettersSignedDate, D.periodFrom, D.periodTo, D.guardianNames, D.wardLiving, D.residenceAddress),
    'pi-p2': hasAny(D.q2ALF, D.q2GroupHome, D.q2Intermediate, D.q2PrivateResidence, D.q2SkilledNursing, D.q2Specialized, D.q2StateHospital, D.q2Other, D.q3MedPrimary, D.q3MedDentist, D.q3MedOphthalmologist, D.q3MedSpecialist, D.q3MedPT, D.q3MedST, D.q3MedOT, D.q3MedWardDecides, D.q3MedOther),
    'pi-p3': hasAny(D.q4Psych, D.q4Outpatient, D.q4Inpatient, D.q4None, D.q4Other, D.q5CareFacility, D.q5NursesAides, D.q5FamilyFriends, D.q5Other),
    'pi-p4': anyOf(D.q6CareFacility, D.q6NursesAides, D.q6FamilyFriends, D.q6DayProgram, D.q6WardDecides, D.q6Other,
      D.q7SocialSecurity, D.q7Ssdi, D.q7Hmo, D.q7Ssi, D.q7Medicare, D.q7Medicaid, D.q7Va, D.q7Trusts),
    'pi-p5': (D.q9Providers || []).some((r) => r && hasAny(r.name, r.providerType, r.examDate, r.street, r.cityStateZip, r.phone)),
    'pi-p6': INITIAL_ADLS.some(([k]) => filledPlan(adls[k])),
    'pi-p7': anyOf(D.mentalAlzheimers, D.physMobility, D.usesGlasses, D.mentalNone, D.physNone),
    'pi-p8': anyOf(D.q11NoDirectives, D.q11Executed, D.committeeIncorporated, D.needsGlasses, D.needsNone),
    'pi-p9': hasAny(g0.name, g0.signatureDate, g0.phone, g0.ssn),
    // Milestone 58C: the shared attorney-started predicate, not a third list.
    'pi-p10': isPlanInitialAttorneyStarted(D),
    'pi-p11': (D.certRecipients || []).some((r) => r && hasAny(r.name, r.line2, r.line3, r.line4)) || filledPlan(D.certNoRecipients) || filledPlan(D.certDate),
  };
}

/** planMinor engine. */
export function planMinorStarted(D) {
  const hasAny = (...vals) => vals.some((v) => filledPlan(v));
  const g0 = (D.planGuardians || [])[0] || {};
  return {
    'pm-cover': hasAny(D.wardName, D.county, D.periodFrom, D.periodTo, D.guardianName, D.q1ResidenceName),
    'pm-p2': false,
    'pm-p3': (D.q3Providers || []).some((r) => r && hasAny(r.first, r.last, r.providerType, r.street, r.cityStateZip, r.phone)),
    'pm-p4': anyOf(D.q4Primary, D.q4Dentist, D.q4Specialist, D.q4PT, D.q4ST, D.q4OT),
    'pm-p5': hasAny(D.q5SchoolProgress, D.q5SocialDevelopment, D.q5Communicates, D.q5Interpersonal),
    'pm-p6': hasAny(g0.name, g0.signatureDate, g0.phone, g0.tin),
    // Milestone 72C: any attorney field begins the page, as it begins the attorney.
    'pm-p7': hasAny(D.preparer_name) || isAttorneyStarted(D, 'planMinor'),
    'pm-p8': (D.certRecipients || []).some((r) => r && hasAny(r.name, r.line2, r.line3, r.line4)) || filledPlan(D.certNoRecipients) || filledPlan(D.certDate),
  };
}

/** Each engine's "has the filer begun this section?" map (Final and Trust take the Annual one). */
export const STARTED_BY_ENGINE = Object.freeze({
  guardian: guardianStarted,
  simplified: simplifiedStarted,
  annual: annualStarted,
  planSimplified: planSimplifiedStarted,
  planAnnual: planAnnualStarted,
  planInitial: planInitialStarted,
  planMinor: planMinorStarted,
});
