// Milestone 38B / 44C: the single readiness configuration source for the
// nine descriptor `inventoryType` keys. Consumed by readiness-card.js; never
// by any court-output builder.
//
// Automatic blocking rows come straight from the typed validation issues
// (registry category `validation` or `data-integrity`, `showInReadiness`
// true) -- their predicates are never recomputed here. The four Plan types
// additionally carry the readiness-only predicate rows that used to live in
// each plan-*/print.js planReadinessChecksX(): every id, label and predicate
// is preserved verbatim (only `window.D` became the `data` parameter), and
// tests/unit/plan-*-parity.spec.js keep proving each one agrees with what its
// validator actually blocks on. A Plan validator's own issues (typed
// `planX.*` or plain strings) are therefore represented by those predicate
// rows while any predicate is pending, not listed a second time; once every
// predicate passes, any validator issue still outstanding (the conditional
// "explanation required when…" rules the parity suites record as
// autoStaysTrue) is listed itself, so the card never reports automated
// checks passed while export is blocked. See OUT_OF_CARD_CATEGORIES and the
// source-map spec.
//
// Manual rows are the concise filer reminders MILESTONE-38B-SOURCE-INVENTORY.md
// names for each filing; unsupported families are counted, never rendered.

import { Q2_OPTIONS, Q4_OPTIONS, Q5_OPTIONS, anyChecked } from './plan-initial-multiselect.js';
import { FILING_TYPE_KEYS, resolveDescriptorForInventoryType } from './filing-descriptor.js';
import { hasSixthCircuitLocalGuidance } from './county-guidance.js';
import { resolveRouteFromSection } from '../validation/validation-adapter.js';
import { checkSignatureState, inferLegacySignatureState } from '../validation/signature-state.js';
import { isAffirmative, isTriStateAnswer } from '../form/form-contract.js';

// The registry owns the key list (Milestone 42G); READINESS_CONFIG below
// must cover every one of them -- tests/unit/readiness-source-map.spec.js
// asserts that.
export const READINESS_FILING_KEYS = FILING_TYPE_KEYS;

// Registry categories that are gated elsewhere (supplemental PDF boundary,
// Excel capacity, technical/security output errors) and are therefore
// deliberately outside the card, per the source inventory's completeness
// contract point 3.
export const OUT_OF_CARD_CATEGORIES = Object.freeze(['supplemental', 'capacity', 'technical', 'security']);
const IN_CARD_CATEGORIES = new Set(['validation', 'data-integrity']);

const has = v => !!(v !== '' && v !== null && v !== undefined);
const legacyGlobal = (name) => (typeof window !== 'undefined' && Array.isArray(window[name])) ? window[name] : [];

// Milestone 52G: the shape all eight Plan signature checks below repeat --
// derive the legacy tri-state from the stored state/date pair, run the shared
// validator, and pass only if it reports nothing. Callers keep handing over
// raw values for whatever record shape their role actually uses (a nested
// guardian row, or flat `attorney_*`/`preparer_*` keys on the form data),
// which is checkSignatureState()'s own shape-agnostic contract.
//
// `fields` is spread through verbatim rather than enumerated, so each call
// site keeps passing exactly what its own role needs. That matters for
// `name`: checkSignatureState() branches on `name !== undefined` to decide
// whether a missing printed name is its error to report, and only one of the
// eight call sites (Plan Initial's attorney) supplies one. The other seven
// omit it deliberately -- their roles already require a printed name
// unconditionally elsewhere, so reporting it here too would duplicate the
// error for one blank field. Enumerating a fixed field list in this helper
// would keep working only by accident; spreading keeps the decision where it
// belongs, at the call site.
//
// The `has(g0.name)` guard four of the guardian call sites also apply stays
// at the call site: it is about a different field, not part of the
// signature-state shape.
function signedAndDated(fields) {
  return checkSignatureState({
    ...fields,
    state: inferLegacySignatureState(fields.state, fields.date),
  }).length === 0;
}

function serviceReminder(local, localText, otherText) {
  return local ? localText : otherText;
}

// ---------------------------------------------------------------------------
// Plan Simplified (Milestone 37-3 pilot ids; Milestone 39-B signature parity)
// ---------------------------------------------------------------------------
function planSimplifiedAutomatic(d) {
  const g0 = (d.planGuardians || [])[0] || {};
  return [
    { id: 'cover.period', label: 'Reporting period is stated', ok: has(d.periodFrom) && has(d.periodTo) },
    { id: 'cover.wardCaseCounty', label: 'Ward name, case number, and county are on the plan', ok: has(d.wardName) && has(d.caseNumber) && has(d.county) },
    { id: 'signatures.guardian1.core', label: 'Signed and dated by a guardian', ok: has(g0.name) && signedAndDated({
      state: g0.signatureState,
      date: g0.signatureDate,
      image: g0.signatureImage,
      sectionLabel: 'Signatures', roleLabel: 'Guardian 1',
    }) },
    { id: 'signatures.guardian1.contact', label: 'Guardian contact details provided (email, phone, mailing address)', ok: has(g0.email) && has(g0.phone) && has(g0.mailingAddress) },
    { id: 'plan.q1', label: "Ward's residences for the year are listed", ok: has(d.q1Residences) },
    { id: 'plan.q2', label: 'Question 2 — reason this placement best suits the ward is stated', ok: has(d.q2BestPlacement) },
    { id: 'plan.q3', label: 'Professional medical / mental health treatment is listed', ok: has(d.q3MedicalTreatment) },
    { id: 'plan.q4', label: 'Current diagnosis and continuing need for a guardian is stated', ok: has(d.q4Diagnosis) },
    { id: 'plan.q5', label: 'Question 5 — personal and social services described', ok: has(d.q5SocialServices) },
    { id: 'plan.q6', label: 'Question 6 — interaction with others described', ok: has(d.q6Interaction) },
    { id: 'plan.q7', label: 'Rights-restoration question answered', ok: has(d.q7RestoreRights) },
    { id: 'plan.q8', label: 'Advance directives question answered', ok: !!(d.q8DNR || d.q8LivingWill || d.q8Surrogate || d.q8POA || d.q8Other || d.q8None) },
    { id: 'plan.q9', label: 'Remuneration declared', ok: has(d.q9Remuneration) },
  ];
}

function planSimplifiedManual(d, local) {
  const f = 'planSimplified.readiness.attachments-and-service';
  return [
    { id: `${f}.deadline`, label: 'File within the deadline set by the court for your case.' },
    // Milestone 68C: this used to call the certificate a "Local Sixth
    // Judicial Circuit requirement". The Clerk's own Simplified Plan review
    // checklist says a certificate of service is NOT required for this form
    // (reference/legal/workslips/GD ANN Work Slip Review Simplified Plan.docx),
    // so the local text now says so; the statutory service duty stands.
    { id: `${f}.service`, label: serviceReminder(local,
      "Serve a copy of this plan on the ward -- unless the ward is a minor or was declared totally incapacitated -- and on the ward's attorney, if any (F.S. 744.367(3)(b)). The Clerk's Simplified Plan checklist does not require a certificate of service; if you serve copies, the Certificate of Service page records who was served and prints with the plan.",
      "Serve a copy of this plan on the ward -- unless the ward is a minor or was declared totally incapacitated -- and on the ward's attorney, if any. Provide additional copies to anyone else the court directs (F.S. 744.367(3)(b))."),
    },
    { id: `${f}.relocation`, label: "If the ward relocated: file a Notice of Change of Residence within 15 days for moves to an adjacent county (F.S. 744.1098(2)), and obtain a prior court order for moves to non-adjacent counties or out of state (F.S. 744.1098(1))." },
    { id: `${f}.directives`, label: 'If the ward executed any advance directive listed in Question 8, attach copies unless already filed -- advance directives need only be filed once.' },
    { id: `${f}.financial-statement`, label: 'Attach the Annual Financial Statement / Affidavit if required for this case (mandatory if the guardian has property delegation and annual accountings were waived).' },
    { id: `${f}.background-fee`, label: "The $27.50 background investigation fee must be paid by the guardian individually and cannot be paid from the ward's assets." },
    { id: `${f}.registration`, label: 'If you are a professional guardian, confirm your registration with the Office of Public & Professional Guardians is current.' },
    { id: `${f}.address-on-file`, label: 'Confirm the guardian address on file with the Clerk matches the address on this plan.' },
    { id: `${f}.physician-report`, label: "File the physician's report separately if the court requires one for this reporting period." },
  ];
}

// ---------------------------------------------------------------------------
// Plan Annual (Milestone 37-3 ids; 34-1A physician DECISION; 39-C signatures)
// ---------------------------------------------------------------------------
function planAnnualAutomatic(d) {
  const g0 = (d.planGuardians || [])[0] || {};
  const res = (d.q1Residences || []).filter(r => r && r.name);
  const provs = (d.q4Providers || []).filter(r => r && r.name);
  const rights = d.rights || {}, adls = d.adls || {};
  const PLAN_RIGHTS = legacyGlobal('PLAN_RIGHTS');
  const PLAN_ADLS = legacyGlobal('PLAN_ADLS');
  return [
    { id: 'cover.period', label: 'Reporting period is stated', ok: has(d.periodFrom) && has(d.periodTo) },
    { id: 'cover.wardCaseGid', label: 'Ward name, case number and inception date are on the plan', ok: has(d.wardName) && has(d.caseNumber) && has(d.gid) },
    { id: 'cover.county', label: 'County is on the plan', ok: has(d.county) },
    { id: 'cover.guardianName', label: 'Guardian Name(s) is on the plan', ok: has(d.guardian) },
    { id: 'signatures.guardian1.core', label: 'Signed and dated by a guardian', ok: has(g0.name) && signedAndDated({
      state: g0.signatureState,
      date: g0.signatureDate,
      image: g0.signatureImage,
      sectionLabel: 'Signatures', roleLabel: 'Guardian',
    }) },
    { id: 'signatures.guardian1.contact', label: 'Guardian address, phone and SSN/EIN provided', ok: has(g0.mailingStreet) && has(g0.phone) && has(g0.ssn) },
    { id: 'signatures.attorney', label: 'Attorney certification signature complete (if attorney included)', ok: signedAndDated({
      state: d.attorney_signatureState,
      name: d.attorney,
      date: d.attorney_signatureDate,
      image: d.attorney_signatureImage,
      sectionLabel: 'Signatures', roleLabel: 'Attorney',
    }) },
    { id: 'cover.wardResidence', label: "Ward's current residence and living arrangement, including city/state/ZIP, stated", ok: has(d.wardLiving) && has(d.residenceAddress) && has(d.residenceCityStateZip) },
    { id: 'plan.q1residences', label: `Residences for the year listed (${res.length})`, ok: res.length > 0 },
    { id: 'plan.q2', label: 'Question 2 — address change addressed', ok: !!(d.q2NoMove || d.q2WithinCounty || d.q2WithinCircuit || d.q2OutsideApproved || d.q2OutsideVenuePetition) },
    { id: 'plan.q3', label: 'Question 3 — residential setting and care provisions selected', ok: !!(d.q3SettingALF || d.q3SettingGroupHome || d.q3SettingIntermediate || d.q3SettingPrivate || d.q3SettingSkilled || d.q3SettingSpecialized || d.q3SettingStateHospital || d.q3SettingOther) },
    { id: 'plan.q4providers', label: `Question 4 — professional medical treatment listed (${provs.length})`, ok: provs.length > 0 },
    { id: 'plan.q5', label: 'Question 5 — social skills and capacity-building activities described', ok: has(d.q5SocialSkills) && has(d.q5Activities) },
    { id: 'plan.q6rights', label: 'Question 6 — all twelve rights assessed', ok: PLAN_RIGHTS.every(([k]) => has(rights[k])) },
    { id: 'plan.q8adls', label: 'Question 8 — all sixteen activities of daily living rated', ok: PLAN_ADLS.every(([k]) => has(adls[k])) },
    { id: 'plan.q9', label: 'Question 9 — mental and physical disabilities answered', ok: !!((d.q9MentalNone || d.q9MentalDementia || d.q9MentalAlzheimers || d.q9MentalAutism || d.q9MentalHeadInjury || d.q9MentalDevelopmental || d.q9MentalIntellectual || d.q9MentalSchizophrenia || d.q9MentalDepression || d.q9MentalSubstance || d.q9MentalOther) && (d.q9PhysNone || d.q9PhysMobility || d.q9PhysBlindness || d.q9PhysDeafness || d.q9PhysDiabetic || d.q9PhysParkinsons || d.q9PhysArthritis || d.q9PhysOther)) },
    { id: 'plan.q10directives', label: 'Question 10 — advance directives answered', ok: !!d.q10NoDirectives !== !!d.q10Executed },
    { id: 'plan.q11remuneration', label: 'Question 11 — remuneration declared', ok: d.q11NoRemuneration ? has(d.q11NoRemunerationName) : !!(d.q11ReceivedName || d.q11Amount || d.q11From) },
  ];
}

function planAnnualManual(d, local) {
  const f = 'planAnnual.readiness.attachments-and-service';
  return [
    // Milestone 34-1A, Item 1: an external, unverifiable-by-software fact --
    // a manual reminder, never a machine-checked, export-blocking requirement.
    { id: `${f}.physician-statement`, label: "Confirm the physician's statement of an examination within 90 days before the plan period is attached, and check the certification box for it." },
    { id: `${f}.physician-report`, label: "File the physician's report separately, at the same time as this plan. The app does not produce it." },
    { id: `${f}.deadline`, label: 'File within 90 days after the last day of the anniversary month the Letters were signed (F.S. 744.367).' },
    { id: `${f}.service`, label: serviceReminder(local,
      'Local Sixth Judicial Circuit requirement: serve a copy on all interested persons and file the certificate of service.',
      'Serve a copy on all interested persons.'),
    },
    { id: `${f}.restore-rights`, label: 'If you marked any right as capable of restoration, file the separate petition to restore it — this plan does not restore rights.' },
    { id: `${f}.relocation`, label: "If the ward relocated: file a Notice of Change of Residence within 15 days for moves to an adjacent county (F.S. 744.1098(2)), and obtain a prior court order for moves to non-adjacent counties or out of state (F.S. 744.1098(1))." },
    { id: `${f}.directives`, label: 'Attach copies of any advance directives listed in Question 10 unless already filed with the court -- advance directives need only be filed once.' },
    { id: `${f}.dshp-support-plan`, label: 'If ward is an APD client with a Developmental Services Habilitation Plan (DSHP / Chapter 393), attach the current support plan (F.S. 393.0651).' },
    { id: `${f}.background-fee`, label: "The $27.50 background investigation fee must be paid by the guardian individually and cannot be paid from the ward's assets." },
    { id: `${f}.registration`, label: 'If you are a professional guardian, confirm your OPPG registration is current.' },
    { id: `${f}.address-on-file`, label: 'Confirm the guardian address on file with the Clerk matches the address on this plan.' },
  ];
}

// ---------------------------------------------------------------------------
// Plan Initial (Milestone 37-3 ids; 40C-H plan.q7explain; 39-C signatures)
// ---------------------------------------------------------------------------
function planInitialAutomatic(d) {
  const g0 = (d.planGuardians || [])[0] || {};
  const provs = (d.q9Providers || []).filter(r => r && r.name);
  const adls = d.adls || {};
  const INITIAL_ADLS = legacyGlobal('INITIAL_ADLS');
  return [
    { id: 'cover.wardCaseCounty', label: 'Ward name, case number and county are on the plan', ok: has(d.wardName) && has(d.caseNumber) && has(d.county) },
    { id: 'cover.dates', label: 'Guardianship Inception Date and date Letters were signed are stated', ok: has(d.inceptionDate) && has(d.lettersSignedDate) },
    // Milestone 68B: required now, as on the other Plans; there was no item.
    { id: 'cover.period', label: 'Reporting period is stated', ok: has(d.periodFrom) && has(d.periodTo) },
    { id: 'cover.guardianNames', label: "Guardian name(s) are on the plan", ok: has(d.guardianNames) },
    { id: 'signatures.guardian1.core', label: 'Signed and dated by a guardian', ok: has(g0.name) && signedAndDated({
      state: g0.signatureState,
      date: g0.signatureDate,
      image: g0.signatureImage,
      sectionLabel: 'Signatures', roleLabel: 'Guardian',
    }) },
    { id: 'signatures.guardian1.contact', label: 'Guardian address, phone and SSN/EIN provided', ok: has(g0.street) && has(g0.phone) && has(g0.ssn) },
    { id: 'cover.wardResidence', label: "Ward's current living arrangement and address, including city/state/ZIP, are stated", ok: has(d.wardLiving) && has(d.residenceAddress) && has(d.residenceCityStateZip) },
    // Milestone 68E: checkbox lists now -- any box ticked.
    { id: 'plan.q2', label: 'Question 2 — best-suited residential setting selected', ok: anyChecked(d, Q2_OPTIONS) },
    { id: 'plan.q3', label: 'Question 3 — medical service provisions selected', ok: !!(d.q3MedPrimary || d.q3MedDentist || d.q3MedOphthalmologist || d.q3MedSpecialist || d.q3MedPT || d.q3MedST || d.q3MedOT || d.q3MedWardDecides || d.q3MedOther) },
    { id: 'plan.q4', label: 'Question 4 — mental health service provision selected', ok: anyChecked(d, Q4_OPTIONS) },
    { id: 'plan.q5', label: 'Question 5 — personal care provision selected', ok: anyChecked(d, Q5_OPTIONS) },
    { id: 'plan.q6q7', label: 'Question 6 — socialization/recreation option selected', ok: !!(d.q6CareFacility || d.q6NursesAides || d.q6FamilyFriends || d.q6DayProgram || d.q6WardDecides || d.q6Other) },
    // Milestone 40C-H: same isAffirmative() predicate as the validator, so
    // 'No' cannot be mistaken for a yes.
    { id: 'plan.q7explain', label: 'Question 7 — explanation given for Trusts, Pending Benefits or Other when selected', ok: !(isAffirmative(d.q7Trusts) || isAffirmative(d.q7PendingBenefits) || d.q7Other) || has(d.q7Explain) },
    { id: 'plan.q9providers', label: `Question 9 — examining providers listed (${provs.length})`, ok: provs.length > 0 },
    { id: 'plan.q10a.adls', label: `Question 10A — all fifteen activities of daily living rated`, ok: INITIAL_ADLS.every(([k]) => has(adls[k])) },
    { id: 'plan.q10bcd', label: 'Question 10B–D — mental disabilities, physical disabilities, and assistive devices currently used are answered', ok: !!((d.mentalAlzheimers || d.mentalAutism || d.mentalClosedHeadInjury || d.mentalDementia || d.mentalDepression || d.mentalDevelopmental || d.mentalSubstance || d.mentalSchizophrenia || d.mentalOther) && (d.physMobility || d.physBlindness || d.physDeafness || d.physDiabetic || d.physParkinsons || d.physArthritis || d.physOther) && (d.usesDentures || d.usesHearingAid || d.usesWheelchair || d.usesWalker || d.usesCrutches || d.usesProsthetics || d.usesGlasses || d.usesNone || d.usesOther)) },
    { id: 'plan.q11needs', label: 'Question 11 — assistive devices needed selected', ok: !!(d.needsDentures || d.needsHearingAid || d.needsWheelchair || d.needsWalker || d.needsCrutches || d.needsProsthetics || d.needsGlasses || d.needsNone || d.needsOther) },
    { id: 'plan.q11directives', label: 'Question 11 — advance directives answered (none, or executed directives listed)', ok: !!d.q11NoDirectives !== !!d.q11Executed },
    { id: 'plan.q10f.committee', label: 'Question 10F — examining committee recommendation question answered', ok: has(d.committeeIncorporated) },
    { id: 'signatures.certifications', label: 'At least one certification statement is checked', ok: !!(d.certIncapacitatedNoCopy || d.certMinorNoCopy || d.certConsulted || d.certRecognizeRights || d.certNoRestriction || d.certProvidesCare) },
    { id: 'signatures.attorney', label: 'Attorney certification signed and dated (if represented)', ok: !(d.attorney_name || d.attorney_bar || d.attorney_signatureDate || (d.attorney_signatureState && d.attorney_signatureState !== 'none')) || (has(d.attorney_name) && signedAndDated({
      state: d.attorney_signatureState,
      date: d.attorney_signatureDate,
      image: d.attorney_signatureImage,
      sectionLabel: 'Attorney Certification', roleLabel: 'Attorney',
    })) },
  ];
}

function planInitialManual(d, local) {
  const f = 'planInitial.readiness.external-steps';
  return [
    { id: `${f}.deadline`, label: 'File within 60 days after the Letters of Guardianship are signed (F.S. 744.362(1)).' },
    { id: `${f}.relocation`, label: "If the ward relocated: file a Notice of Change of Residence within 15 days for moves to an adjacent county (F.S. 744.1098(2)), and obtain a prior court order for moves to non-adjacent counties or out of state (F.S. 744.1098(1))." },
    { id: `${f}.service`, label: serviceReminder(local,
      'Local Sixth Judicial Circuit requirement: serve a copy on all interested persons and file the certificate of service, unless the ward was declared totally incapacitated or is a minor under 14 (see the certification checkboxes).',
      'Serve a copy on all interested persons, unless the ward was declared totally incapacitated or is a minor under 14 (see the certification checkboxes).'),
    },
    { id: `${f}.directives`, label: 'Attach a copy of any pre-existing advance directive described in the Question 1 narrative unless already filed with the court -- advance directives need only be filed once.' },
    { id: `${f}.education`, label: 'Non-professional guardians must complete the 8-hour education course and file proof within 4 months after appointment (F.S. 744.3145(2), (4)).' },
    { id: `${f}.background-fee`, label: "The $27.50 background investigation fee must be paid by the guardian individually and cannot be paid from the ward's assets." },
    { id: `${f}.address-on-file`, label: 'Confirm the guardian address on file with the Clerk matches the address on this plan.' },
    { id: `${f}.registration`, label: 'If you are a professional guardian, confirm your OPPG registration is current.' },
    { id: `${f}.original-signatures`, label: 'Only reports with original signatures will be audited by the Clerk of Court.' },
  ];
}

// ---------------------------------------------------------------------------
// Plan Minor (Milestone 37-3 ids; 39-C signatures)
// ---------------------------------------------------------------------------
function planMinorAutomatic(d) {
  const g0 = (d.planGuardians || [])[0] || {};
  const provs = (d.q3Providers || []).filter(r => r && r.last);
  return [
    { id: 'cover.amendedForm', label: 'Amended Form? is answered', ok: isTriStateAnswer(d.amendedForm) },
    { id: 'cover.wardCountyPeriod', label: "Minor's name, county, and reporting period are on the plan", ok: has(d.wardName) && has(d.county) && has(d.periodFrom) && has(d.periodTo) },
    { id: 'cover.caseNumber', label: 'Case number (UCN or Case #) is on the plan', ok: has(d.ucn) || has(d.ref) },
    { id: 'cover.guardianName', label: 'Guardian Name is on the plan', ok: has(d.guardianName) },
    { id: 'cover.residence', label: 'Current residence and address stated', ok: has(d.q1ResidenceName) && has(d.q1Street) },
    { id: 'signatures.guardian1.core', label: 'Signed and dated by a guardian', ok: has(g0.name) && signedAndDated({
      state: g0.signatureState,
      date: g0.signatureDate,
      image: g0.signatureImage,
      sectionLabel: 'Guardian Signatures', roleLabel: 'Guardian',
    }) },
    { id: 'signatures.guardian1.contact', label: 'Guardian address, phone and SSN/EIN provided', ok: has(g0.mailingStreet) && has(g0.phone) && has(g0.tin) },
    { id: 'signatures.certifications', label: 'At least one certification statement is checked', ok: !!(d.certIncapacitated || d.certMinor || d.certConsulted || d.certNoRestriction || d.certProvidesCare || d.certPhysicianAttached) },
    { id: 'plan.q4', label: 'Question 4 — provision of medical services selected', ok: !!(d.q4Primary || d.q4Dentist || d.q4Specialist || d.q4PT || d.q4ST || d.q4OT || d.q4MinorDecides || d.q4Other) },
    { id: 'plan.q5', label: "Question 5 — school progress, social development, communication, and interpersonal statements completed", ok: has(d.q5SchoolProgress) && has(d.q5SocialDevelopment) && has(d.q5Communicates) && has(d.q5Interpersonal) },
    { id: 'plan.q5e', label: 'Question 5E — unmet social needs answered', ok: !!(d.q5NoUnmetNeeds || d.q5DoesNotCareToSocialize || d.q5UnmetNeeds || d.q5Other) },
    { id: 'signatures.preparer', label: 'Preparer certification completed (if a preparer is named)', ok: !(d.preparer_name || d.preparer_signatureDate || (d.preparer_signatureState && d.preparer_signatureState !== 'none')) || (has(d.preparer_name) && signedAndDated({
      state: d.preparer_signatureState,
      date: d.preparer_signatureDate,
      image: d.preparer_signatureImage,
      sectionLabel: 'Preparer & Attorney', roleLabel: 'Preparer',
    })) },
    { id: 'signatures.attorney', label: 'Attorney certification signed and dated (if represented)', ok: !(d.attorney_name || d.attorney_signatureDate || (d.attorney_signatureState && d.attorney_signatureState !== 'none')) || (has(d.attorney_name) && signedAndDated({
      state: d.attorney_signatureState,
      date: d.attorney_signatureDate,
      image: d.attorney_signatureImage,
      sectionLabel: 'Preparer & Attorney', roleLabel: 'Attorney',
    })) },
    { id: 'plan.q3providers', label: `Treatment providers listed (${provs.length})`, ok: provs.length > 0 },
  ];
}

function planMinorManual(d, local) {
  const f = 'planMinor.readiness.external-steps';
  return [
    { id: `${f}.deadline`, label: "File within 90 days after the last day of the anniversary month the Letters were signed (F.S. 744.367)." },
    { id: `${f}.physician-statement`, label: "Attach the physician's statement of an examination of the ward no more than 180 days before the beginning of the plan period (F.S. 744.3675), if the certification box for it is checked." },
    { id: `${f}.service`, label: serviceReminder(local,
      'Local Sixth Judicial Circuit requirement: serve a copy on all interested persons and file the certificate of service, unless the ward was declared totally incapacitated or is a minor (see the certification checkboxes).',
      'Serve a copy on all interested persons, unless the ward was declared totally incapacitated or is a minor (see the certification checkboxes).'),
    },
    { id: `${f}.majority-discharge`, label: "If the minor reaches 18 years of age (sui juris) during the reporting period, prepare for final discharge under F.S. 744.527." },
    { id: `${f}.relocation`, label: "If the ward relocated: file a Notice of Change of Residence within 15 days for moves to an adjacent county (F.S. 744.1098(2)), and obtain a prior court order for moves to non-adjacent counties or out of state (F.S. 744.1098(1))." },
    { id: `${f}.background-fee`, label: "The $27.50 background investigation fee must be paid by the guardian individually and cannot be paid from the minor's assets." },
    { id: `${f}.address-on-file`, label: 'Confirm the guardian address on file with the Clerk matches the address on this plan.' },
    { id: `${f}.registration`, label: 'If you are a professional or public guardian, confirm the corresponding registration is current.' },
    { id: `${f}.unofficial-checklist`, label: 'This general checklist is not derived from an official Clerk\'s Review form for this document — confirm current local filing requirements before submitting.' },
  ];
}

// ---------------------------------------------------------------------------
// The five accounting/inventory filings: automatic rows come only from the
// typed validator issues; manual rows are the source inventory's grouped
// reminders, verbatim.
// ---------------------------------------------------------------------------
const nonPlanManual = {
  guardian: [
    { id: 'guardian.readiness.supporting-records', label: 'Confirm required statements, appraisals, and supporting records are filed or retained as directed by the court.' },
    { id: 'guardian.readiness.service-and-deadline', label: 'Confirm the inventory was filed on time and that any required notice or service is complete.' },
  ],
  simplified: [
    { id: 'simplified.readiness.supporting-records', label: 'Confirm statements, receipts, and explanations required for this accounting are available or filed.' },
    { id: 'simplified.readiness.filing-steps', label: 'Confirm filing deadline, service, fees, and any separate plan or financial statement required for this case.' },
  ],
  annual: [
    { id: 'annual.readiness.supporting-records', label: 'Confirm required statements and supporting records reconcile to the accounting and are filed or retained as directed.' },
    { id: 'annual.readiness.external-approvals', label: 'Confirm required service, approvals, fee petitions, and other case-specific filing steps are complete.' },
  ],
  finalAccounting: [
    { id: 'finalAccounting.readiness.petition-notice', label: 'Confirm the petition for discharge, required notice/service, objection period, and closing papers are complete.' },
    { id: 'finalAccounting.readiness.distribution', label: 'Confirm final distributions, receipts or releases, and any fee/cost approvals required by the court.' },
  ],
  trustAccounting: [
    { id: 'trustAccounting.readiness.trust-records', label: 'Confirm the trust instrument and required statements and transaction support are available or filed.' },
    { id: 'trustAccounting.readiness.external-approvals', label: 'Confirm required service, compensation or fee approval, distributions, and other court-directed steps.' },
  ],
};

// These five forms share issue-derived export validation rather than the
// Plan family's hand-written predicates. Keep that single validation source
// authoritative, but surface its major filing sections even when every field
// has passed so filers receive the same detailed review view as Plan filers.
// A failed overview row is informational; the exact validator issue below it
// remains the one export-blocking, routed readiness row.
const issueText = issue => `${issue?.section || ''} ${issue?.message || ''}`.toLowerCase();
const matchesSection = (issues, pattern) => !(issues || []).some(issue => pattern.test(issueText(issue)));
const detailRow = (id, label, issues, pattern) => ({ id, label, ok: matchesSection(issues, pattern) });

// Guardian and Simplified each need a structurally distinct detail-row
// breakdown; every other non-Plan type (annual/finalAccounting/
// trustAccounting) shares one generic shape below. Keyed by the registry's
// own inventoryType strings as bare (unquoted) object properties rather than
// compared as string literals -- tests/unit/filing-type-enumeration-guard.spec.js
// flags a 4th+ quoted repeat of a filing-type key outside filing-descriptor.js
// on sight, and a `type === 'guardian'` style comparison is exactly that.
const NON_PLAN_DETAIL_BUILDERS = {
  guardian: (prefix, common, issues) => [
    ...common.slice(0, 1),
    detailRow(`${prefix}.real-property`, 'Schedule A \u2014 real property and secured debt entries are complete or verified empty', issues, /\ba-1\b|\ba-2\b/),
    detailRow(`${prefix}.personal-property`, 'Schedule B \u2014 financial accounts, personal property, and liabilities are complete or verified empty', issues, /\bb-1\b|\bb-2\b|\bb-3\b|\bb-4\b/),
    detailRow(`${prefix}.income-claims`, 'Schedule C \u2014 income, claims, actions, trusts, and other assets are complete or verified empty', issues, /\bc-1\b|\bc-2\b|\bc-3\b|\bc-4\b|\bc-5\b/),
    ...common.slice(1),
    detailRow(`${prefix}.bond-service`, 'Bond and certificate-of-service information is complete', issues, /\bd-3\b|\bd-4\b|\bd-5\b/),
  ],
  simplified: (prefix, common, issues) => [
    detailRow(`${prefix}.eligibility`, 'Simplified-accounting eligibility is confirmed', issues, /eligibility/),
    ...common.slice(0, 1),
    detailRow(`${prefix}.activity`, 'Part II financial activity and Part III reconciliation are complete', issues, /part ii|part iii/),
    ...common.slice(1),
    detailRow(`${prefix}.bond-service`, 'Bond and certificate-of-service information is complete', issues, /part ix|part x|certificate of service/),
  ],
};

function nonPlanDetails(type, issues) {
  const prefix = `${type}.review`;
  const common = [
    detailRow(`${prefix}.cover`, 'Cover information, filing identity, and reporting dates are complete', issues, /\bcover\b/),
    detailRow(`${prefix}.signatures`, 'Guardian, preparer, attorney, and certification information is complete where required', issues, /guardian|preparer|attorney|certificate of service|certification/),
  ];
  const builder = NON_PLAN_DETAIL_BUILDERS[type];
  if (builder) return builder(prefix, common, issues);

  // annual/finalAccounting/trustAccounting share this shape; only the trusts
  // row's display label differs, and that already exists once, canonically,
  // as filing-descriptor.js's own displayName -- no second copy needed.
  const filingLabel = resolveDescriptorForInventoryType(type)?.displayName || 'Accounting';
  return [
    ...common.slice(0, 1),
    detailRow(`${prefix}.activity`, 'Accounting activity, totals, and reconciliation are complete', issues, /part ii|part iii|part iv|part v|part vi|part vii|reconcile|net assets/),
    detailRow(`${prefix}.schedules`, 'Schedules A through F are complete for every entered line', issues, /schedule [a-f]/),
    detailRow(`${prefix}.trusts`, `${filingLabel} trust disclosures are complete`, issues, /part viii|trust/),
    ...common.slice(1),
    detailRow(`${prefix}.bond-service`, 'Bond and certificate-of-service information is complete', issues, /part ix|part x|certificate of service/),
  ];
}

// The five non-Plan keys, derived from the registry (never hand-listed) so
// a tenth non-Plan filing type is picked up automatically rather than
// needing a sixth line here that could drift, per Milestone 42G/44C.
const NON_PLAN_TYPE_KEYS = FILING_TYPE_KEYS.filter((k) => resolveDescriptorForInventoryType(k)?.family !== 'plan');

// `unsupported`'s clerk/court-record family doesn't align with `family`
// (finalAccounting is 'accounting' but reads as case-record, not
// audit-record, same as guardian/simplified) -- real per-type data with no
// existing canonical source, kept here as bare (unquoted) keys rather than
// quoted literals for the same reason NON_PLAN_DETAIL_BUILDERS above is.
const NON_PLAN_UNSUPPORTED_SUFFIX = {
  guardian: 'case-record',
  simplified: 'case-record',
  annual: 'audit-record',
  finalAccounting: 'case-record',
  trustAccounting: 'audit-record',
};

const nonPlanConfig = Object.fromEntries(NON_PLAN_TYPE_KEYS.map((type) => [type, {
  automaticFamilies: [`${type}.*`],
  predicates: null,
  details: (_, issues) => nonPlanDetails(type, issues),
  manual: () => nonPlanManual[type],
  unsupported: `${type}.unsupported.${NON_PLAN_UNSUPPORTED_SUFFIX[type]}`,
}]));

// One row per filing. `automaticFamilies` documents where each filing's
// blocking automatic rows come from (registry issue-code prefixes and, for
// Plans, the readiness-only predicate table); `unsupported` names the source
// inventory's clerk/court-record family that is counted but never rendered.
export const READINESS_CONFIG = Object.freeze({
  ...nonPlanConfig,
  planSimplified: { automaticFamilies: ['planSimplified.*', 'cover.*', 'plan.*', 'signatures.*'], predicates: planSimplifiedAutomatic, manual: planSimplifiedManual, unsupported: 'planSimplified.unsupported.case-record' },
  planAnnual: { automaticFamilies: ['planAnnual.*', 'cover.*', 'plan.*', 'signatures.*'], predicates: planAnnualAutomatic, manual: planAnnualManual, unsupported: 'planAnnual.unsupported.case-record' },
  planInitial: { automaticFamilies: ['planInitial.*', 'cover.*', 'plan.*', 'signatures.*'], predicates: planInitialAutomatic, manual: planInitialManual, unsupported: 'planInitial.unsupported.case-record' },
  planMinor: { automaticFamilies: ['planMinor.*', 'cover.*', 'plan.*', 'signatures.*'], predicates: planMinorAutomatic, manual: planMinorManual, unsupported: 'planMinor.unsupported.case-record' },
});

// ---------------------------------------------------------------------------
// Milestone 38D Phase 2: which validator issue each Plan predicate row covers.
//
// 38B assumed 38D Phase 1 would give every Plan predicate a canonical issue id.
// It didn't -- validators emit `planX.<path>.required` codes with nothing
// linking them to a predicate id -- so 44C shipped a blanket rule instead:
// while ANY predicate is pending, suppress EVERY one of that filing's own
// validator issues. That over-reaches. An issue no predicate checks at all
// (the conditional "explanation required when…" rules) stayed hidden until
// every unrelated predicate passed, so a filer met their blockers one at a
// time instead of seeing them together.
//
// This table is that missing link, expressed the way tests/unit/plan-*-parity.spec.js
// already prove it (one predicate id per constituent required field). Keys are
// predicate row ids; values are the validator's own `path` arguments,
// canonicalised the way createRequiredIssue() does it (`.0.` becomes `[]`).
// A trailing `.*` matches every key beneath that prefix -- the per-right and
// per-ADL issues name whichever entry is still unanswered.
//
// A path absent from this table is DELIBERATELY uncovered and surfaces
// immediately; tests/unit/readiness-predicate-coverage.spec.js audits that list
// and pins why each entry is not a predicate row. "Unmapped means show" is also
// the right default for a future validator check nobody maps here: a duplicated
// row is cosmetic, a wrongly-hidden export blocker is not.
const PLAN_PREDICATE_ISSUE_PATHS = Object.freeze({
  planSimplified: {
    'cover.period': ['periodFrom', 'periodTo'],
    'cover.wardCaseCounty': ['wardName', 'caseNumber', 'county'],
    'signatures.guardian1.core': ['planGuardians[].name', 'planGuardians[].signatureDate', 'planGuardians[].signatureImage'],
    'signatures.guardian1.contact': ['planGuardians[].email', 'planGuardians[].phone', 'planGuardians[].mailingAddress'],
    'plan.q1': ['q1Residences'],
    'plan.q2': ['q2BestPlacement'],
    'plan.q3': ['q3MedicalTreatment'],
    'plan.q4': ['q4Diagnosis'],
    'plan.q5': ['q5SocialServices'],
    'plan.q6': ['q6Interaction'],
    'plan.q7': ['q7RestoreRights'],
    'plan.q8': ['q8DNR'],
    'plan.q9': ['q9Remuneration'],
  },
  planAnnual: {
    'cover.period': ['periodFrom', 'periodTo'],
    'cover.wardCaseGid': ['wardName', 'caseNumber', 'gid'],
    'cover.county': ['county'],
    'cover.guardianName': ['guardian'],
    'cover.wardResidence': ['wardLiving', 'residenceAddress', 'residenceCityStateZip'],
    'plan.q1residences': ['q1Residences[].name'],
    'plan.q2': ['q2NoMove'],
    'plan.q3': ['q3SettingALF'],
    'plan.q4providers': ['q4Providers[].name'],
    'plan.q5': ['q5SocialSkills', 'q5Activities'],
    'plan.q6rights': ['rights.*'],
    'plan.q8adls': ['adls.*'],
    'plan.q9': ['q9MentalNone', 'q9PhysNone'],
    'plan.q10directives': ['q10NoDirectives'],
    'plan.q11remuneration': ['q11NoRemuneration', 'q11NoRemunerationName'],
    'signatures.guardian1.core': ['planGuardians[].name', 'planGuardians[].signatureDate', 'planGuardians[].signatureImage'],
    'signatures.guardian1.contact': ['planGuardians[].mailingStreet', 'planGuardians[].phone', 'planGuardians[].ssn'],
    'signatures.attorney': ['attorney', 'attorney_signatureDate', 'attorney_signatureImage'],
  },
  planInitial: {
    'cover.wardCaseCounty': ['wardName', 'caseNumber', 'county'],
    'cover.dates': ['inceptionDate', 'lettersSignedDate'],
    'cover.period': ['periodFrom', 'periodTo'],
    'cover.guardianNames': ['guardianNames'],
    'cover.wardResidence': ['wardLiving', 'residenceAddress', 'residenceCityStateZip'],
    'plan.q2': Q2_OPTIONS.map((o) => o.key),
    'plan.q3': ['q3MedPrimary'],
    'plan.q4': Q4_OPTIONS.map((o) => o.key),
    'plan.q5': Q5_OPTIONS.map((o) => o.key),
    'plan.q6q7': ['q6CareFacility'],
    'plan.q7explain': ['q7Explain'],
    'plan.q9providers': ['q9Providers[].name'],
    'plan.q10a.adls': ['adls.*'],
    'plan.q10bcd': ['mentalAlzheimers', 'physMobility', 'usesDentures'],
    'plan.q11needs': ['needsDentures'],
    'plan.q11directives': ['q11NoDirectives'],
    'plan.q10f.committee': ['committeeIncorporated'],
    'signatures.certifications': ['certIncapacitatedNoCopy'],
    'signatures.guardian1.core': ['planGuardians[].name', 'planGuardians[].signatureDate', 'planGuardians[].signatureImage'],
    'signatures.guardian1.contact': ['planGuardians[].street', 'planGuardians[].phone', 'planGuardians[].ssn'],
    'signatures.attorney': ['attorney_name', 'attorney_signatureDate', 'attorney_signatureImage', 'attorney_email'],
  },
  planMinor: {
    'cover.amendedForm': ['amendedForm'],
    'cover.wardCountyPeriod': ['wardName', 'county', 'periodFrom', 'periodTo'],
    'cover.caseNumber': ['ucn'],
    'cover.guardianName': ['guardianName'],
    'cover.residence': ['q1ResidenceName', 'q1Street'],
    'plan.q3providers': ['q3Providers[].last'],
    'plan.q4': ['q4Primary'],
    'plan.q5': ['q5SchoolProgress', 'q5SocialDevelopment', 'q5Communicates', 'q5Interpersonal'],
    'plan.q5e': ['q5NoUnmetNeeds'],
    'signatures.certifications': ['certIncapacitated'],
    'signatures.guardian1.core': ['planGuardians[].name', 'planGuardians[].signatureDate', 'planGuardians[].signatureImage'],
    'signatures.guardian1.contact': ['planGuardians[].mailingStreet', 'planGuardians[].phone', 'planGuardians[].tin'],
    'signatures.preparer': ['preparer_name', 'preparer_signatureDate', 'preparer_signatureImage'],
    'signatures.attorney': ['attorney_name', 'attorney_signatureDate', 'attorney_signatureImage'],
  },
});

const PLAN_ISSUE_COVERAGE = (() => {
  const byType = {};
  for (const [type, rows] of Object.entries(PLAN_PREDICATE_ISSUE_PATHS)) {
    const exact = new Map();
    const prefixes = [];
    for (const [predicateId, paths] of Object.entries(rows)) {
      for (const path of paths) {
        if (path.endsWith('.*')) {
          prefixes.push({ prefix: `${type}.${path.slice(0, -1)}`, predicateId });
        } else {
          const code = `${type}.${path}.required`;
          if (!exact.has(code)) exact.set(code, []);
          exact.get(code).push(predicateId);
        }
      }
    }
    byType[type] = { exact, prefixes };
  }
  return byType;
})();

/** Predicate row ids whose own check already accounts for this issue code. */
export function predicateIdsCoveringIssue(inventoryType, code) {
  const index = PLAN_ISSUE_COVERAGE[inventoryType];
  if (!index) return [];
  const key = String(code || '');
  const exact = index.exact.get(key);
  if (exact) return exact;
  return index.prefixes.filter(entry => key.startsWith(entry.prefix)).map(entry => entry.predicateId);
}

export { PLAN_PREDICATE_ISSUE_PATHS };

export const PLAN_PREDICATE_ROUTES = Object.freeze({
  planSimplified: {
    'cover.period': { route: '/', path: 'periodFrom' },
    'cover.wardCaseCounty': { route: '/', path: 'wardName' },
    'signatures.guardian1.core': { route: '/p3', path: 'planGuardians.0.name' },
    'signatures.guardian1.contact': { route: '/p3', path: 'planGuardians.0.email' },
    'plan.q1': { route: '/p2', path: 'q1Residences' },
    'plan.q2': { route: '/p2', path: 'q2BestPlacement' },
    'plan.q3': { route: '/p2', path: 'q3MedicalTreatment' },
    'plan.q4': { route: '/p2', path: 'q4Diagnosis' },
    'plan.q5': { route: '/p2', path: 'q5SocialServices' },
    'plan.q6': { route: '/p2', path: 'q6Interaction' },
    'plan.q7': { route: '/p2', path: 'q7RestoreRights' },
    'plan.q8': { route: '/p2', path: 'q8DNR' },
    'plan.q9': { route: '/p2', path: 'q9Remuneration' },
  },
  planAnnual: {
    'cover.period': { route: '/', path: 'periodFrom' },
    'cover.wardCaseGid': { route: '/', path: 'wardName' },
    'cover.county': { route: '/', path: 'county' },
    'cover.guardianName': { route: '/', path: 'guardian' },
    'cover.wardResidence': { route: '/', path: 'wardLiving' },
    'plan.q1residences': { route: '/p2', path: 'q1Residences.0.name' },
    'plan.q2': { route: '/p3', path: 'q2NoMove' },
    'plan.q3': { route: '/p3', path: 'q3SettingALF' },
    'plan.q4providers': { route: '/p5', path: 'q4Providers.0.name' },
    'plan.q5': { route: '/p6', path: 'q5SocialSkills' },
    'plan.q6rights': { route: '/p6', path: 'rights' },
    'plan.q8adls': { route: '/p7', path: 'adls' },
    'plan.q9': { route: '/p8', path: 'q9MentalNone' },
    'plan.q10directives': { route: '/p9', path: 'q10NoDirectives' },
    'plan.q11remuneration': { route: '/p10', path: 'q11NoRemuneration' },
    'signatures.guardian1.core': { route: '/p11', path: 'planGuardians.0.name' },
    'signatures.guardian1.contact': { route: '/p11', path: 'planGuardians.0.mailingStreet' },
    'signatures.attorney': { route: '/p11', path: 'attorney' },
  },
  planInitial: {
    'cover.wardCaseCounty': { route: '/', path: 'wardName' },
    'cover.dates': { route: '/', path: 'inceptionDate' },
    'cover.period': { route: '/', path: 'periodFrom' },
    'cover.guardianNames': { route: '/', path: 'guardianNames' },
    'cover.wardResidence': { route: '/', path: 'wardLiving' },
    'plan.q2': { route: '/p2', path: 'q2ALF' },
    'plan.q3': { route: '/p2', path: 'q3MedPrimary' },
    'plan.q4': { route: '/p3', path: 'q4Psych' },
    'plan.q5': { route: '/p3', path: 'q5CareFacility' },
    'plan.q6q7': { route: '/p4', path: 'q6CareFacility' },
    'plan.q7explain': { route: '/p4', path: 'q7Explain' },
    'plan.q9providers': { route: '/p5', path: 'q9Providers.0.name' },
    'plan.q10a.adls': { route: '/p6', path: 'adls.dressing' },
    'plan.q10bcd': { route: '/p7', path: 'mentalAlzheimers' },
    'plan.q11needs': { route: '/p8', path: 'needsDentures' },
    'plan.q11directives': { route: '/p8', path: 'q11NoDirectives' },
    'plan.q10f.committee': { route: '/p8', path: 'committeeIncorporated' },
    'signatures.certifications': { route: '/p9', path: 'certIncapacitatedNoCopy' },
    'signatures.guardian1.core': { route: '/p9', path: 'planGuardians.0.name' },
    'signatures.guardian1.contact': { route: '/p9', path: 'planGuardians.0.street' },
    'signatures.attorney': { route: '/p10', path: 'attorney_name' },
  },
  planMinor: {
    'cover.amendedForm': { route: '/', path: 'amendedForm' },
    'cover.wardCountyPeriod': { route: '/', path: 'wardName' },
    'cover.caseNumber': { route: '/', path: 'ucn' },
    'cover.guardianName': { route: '/', path: 'guardianName' },
    'cover.residence': { route: '/', path: 'q1ResidenceName' },
    'plan.q3providers': { route: '/p3', path: 'q3Providers.0.last' },
    'plan.q4': { route: '/p4', path: 'q4Primary' },
    'plan.q5': { route: '/p5', path: 'q5SchoolProgress' },
    'plan.q5e': { route: '/p5', path: 'q5NoUnmetNeeds' },
    'signatures.certifications': { route: '/p6', path: 'certIncapacitated' },
    'signatures.guardian1.core': { route: '/p6', path: 'planGuardians.0.name' },
    'signatures.guardian1.contact': { route: '/p6', path: 'planGuardians.0.mailingStreet' },
    'signatures.preparer': { route: '/p7', path: 'preparer_name' },
    'signatures.attorney': { route: '/p7', path: 'attorney_name' },
  },
});

function isCardIssue(issue) {
  return !!issue && issue.showInReadiness === true && IN_CARD_CATEGORIES.has(issue.category);
}

export function getFilingReadiness(inventoryType, data, validationIssues = []) {
  const d = data || {};
  const config = READINESS_CONFIG[inventoryType];
  if (!config) return { key: inventoryType, automatic: [], manual: [], unsupportedCount: 0 };
  const local = hasSixthCircuitLocalGuidance(d.county);

  const predicateRows = typeof config.predicates === 'function'
    ? config.predicates(d).map(row => {
        const info = PLAN_PREDICATE_ROUTES[inventoryType]?.[row.id] || {};
        return {
          ...row,
          route: row.route || info.route || '',
          path: row.path || info.path || '',
          classification: 'automatic',
          blocking: true,
        };
      })
    : [];
  const pendingPredicateIds = new Set(predicateRows.filter(row => row.ok !== true).map(row => row.id));
  // Milestone 38D Phase 2: match each typed issue against the predicate row
  // that actually covers it (PLAN_PREDICATE_ISSUE_PATHS above) instead of 44C's
  // blanket "any predicate pending hides all of this filing's issues" rule, so
  // an issue no pending predicate accounts for is listed right away rather than
  // waiting for every unrelated predicate to pass first.
  //
  // A plain-string validator issue is the one case that cannot be attributed:
  // prepareFilingOutput() wraps it as `validation.legacy-unmapped` with no
  // path, so there is nothing to match on and it keeps 44C's blanket rule.
  const coveredByPendingPredicate = (issue) => {
    if (issue.code === 'validation.legacy-unmapped') return pendingPredicateIds.size > 0;
    return predicateIdsCoveringIssue(inventoryType, issue.code).some(id => pendingPredicateIds.has(id));
  };

  const issueRows = (validationIssues || [])
    .filter(isCardIssue)
    .filter(issue => !coveredByPendingPredicate(issue))
    .map(issue => ({
      id: issue.code,
      label: issue.message || issue.code,
      // Validators state a path and a section; the route comes from the same
      // resolver the Print Preview jump links use.
      route: issue.route || (issue.path ? resolveRouteFromSection(issue.section, inventoryType) : ''),
      path: issue.path || '',
      classification: 'automatic',
      blocking: true,
      ok: false,
    }));

  const manual = config.manual(d, local).map(row => ({ ...row, route: '', classification: 'manual', blocking: false }));
  const details = typeof config.details === 'function'
    ? config.details(d, validationIssues).map(row => ({ ...row, classification: 'overview', blocking: false }))
    : [];

  return {
    key: inventoryType,
    automatic: [...predicateRows, ...issueRows],
    details,
    manual,
    unsupportedCount: config.unsupported ? 1 : 0,
  };
}
