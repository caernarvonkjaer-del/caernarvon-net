// Thin adapters around legacy-app.js's global state, for ES modules that
// can't reach a classic script's lexical scope directly. legacy-app.js is a
// classic (non-module) script, so its top-level function declarations and
// explicit `window.X =` assignments become real `window` properties -- but
// a bare top-level `let`/`const` (e.g. `activeInventoryType`) does NOT,
// since module code runs in its own scope and never sees another script's
// lexical bindings. Only `window.D` and `getActiveWard()` (a function
// declaration, real `window` property) are reachable this way; there is no
// separate `window.activeInventoryType` to read.
//
// This file wraps the legacy globals, it does not move or duplicate their
// logic -- see INDEX-SPLIT-PLAN.md step 2 ("adapters wrap the legacy code
// in place; they do not yet move it") and the Milestone 2 plan's Phase B.
// Deliberately minimal: only what the Simplified Accounting extraction
// (Phase D) actually needs, not a speculative full state API.

/** The full data object for whichever ward is currently active, or {} if none. */
export function getD() {
  return window.D;
}

/** The full ward record from guardianData.wards for the active ward, or null. */
export function getActiveWard() {
  return window.getActiveWard ? window.getActiveWard() : null;
}

/**
 * The active ward's inventoryType key (e.g. 'simplified'), or null if no
 * ward is active. Reads window.D.inventoryType rather than legacy-app.js's
 * separate `activeInventoryType` variable (unreachable from a module, see
 * file header) -- the two are kept in sync by every legacy code path that
 * sets either (addWard/switchWard/convertExistingWard), so this is
 * equivalent for read purposes.
 */
export function getActiveInventoryType() {
  return window.D && window.D.inventoryType ? window.D.inventoryType : null;
}

// Blank-ward data factory for the Simplified Accounting feature (Milestone 2,
// Phase D). This is pure data -- no DOM, no calls to any other function --
// moved here rather than into the lazily-imported features/simplified-
// accounting/index.js because it's needed at ward-CREATION time
// (initializeEmptyData() in legacy-app.js, called from addWard()), which can
// happen before the feature is ever mounted/rendered. Same reasoning as
// calcTotals() staying a legacy global for the dashboard's sake (see the
// Milestone 2 plan's "Problem 1").
export function emptyDataSimplified() {
  return {
    wardName:'', ssn:'', caseNumber:'', periodFrom:'', periodTo:'',
    attorney:'', guardian:'', typeOfGuardianship:'', county:'Pinellas',
    amendedForm:'No', gid:'',
    eligDepository:'', eligOnlyTransactions:'',
    startingBalance:'',
    interestIncome:'',
    depositsSettlement:'',
    serviceCharges:'',
    federalIncomeTax:'',
    guardians:[
      {name:'',ssn:'',phone:'',email:'',mailingStreet:'',mailingCityStateZip:'',residenceStreet:'',residenceCityStateZip:'',signatureDate:''},
      {name:'',ssn:'',phone:'',email:'',mailingStreet:'',mailingCityStateZip:'',residenceStreet:'',residenceCityStateZip:'',signatureDate:''},
      {name:'',ssn:'',phone:'',email:'',mailingStreet:'',mailingCityStateZip:'',residenceStreet:'',residenceCityStateZip:'',signatureDate:''}
    ],
    attorney_barNumber:'', attorney_phone:'', attorney_street:'', attorney_cityStateZip:'',
    attorney_signatureDate:'',
    certServiceDate:'',
    certAttySignDate:'',
    certAttyBarNumber:'', certAttyPhone:'', certAttyStreet:'', certAttyCityStateZip:'',
    certRecipients:[
      {name:'',line2:'',line3:''},
      {name:'',line2:'',line3:''},
      {name:'',line2:'',line3:''},
      {name:'',line2:'',line3:''}
    ],
    certIndicator:'',
    remuneration:[
      {guardian:'',type:'',description:''},
      {guardian:'',type:'',description:''}
    ]
  };
}

// Blank-ward data factory for the Plan Simplified feature (Milestone 3,
// Phase B). Same reasoning as emptyDataSimplified above -- pure data, needed
// synchronously at ward-creation time, before the lazily-imported
// features/plan-simplified/index.js is ever loaded (Milestone 3 plan's
// "Confirmed facts" / recurring Problem 1).
export function emptyDataPlanSimplified() {
  return {
    wardName:'', caseNumber:'', periodFrom:'', periodTo:'', county:'Pinellas',
    q1Residences:'', q2BestPlacement:'', q3MedicalTreatment:'', q4Diagnosis:'',
    q5SocialServices:'', q6Interaction:'',
    q7RestoreRights:'', q7RestoreExplain:'',
    q8DNR:false, q8LivingWill:false, q8Surrogate:false, q8POA:false,
    q8Other:false, q8OtherText:'', q8None:false,
    q9Remuneration:'', q9RemunerationExplain:'',
    planGuardians:[
      {name:'',signatureDate:'',email:'',phone:'',mailingAddress:''},
      {name:'',signatureDate:'',email:'',phone:'',mailingAddress:''}
    ]
  };
}

// Blank-ward data factory for the Plan Annual feature (Milestone 4, Phase A).
// Needed synchronously at ward-creation time, same reasoning as the two
// factories above -- but unlike those, this one is NOT pure data: it reaches
// back into window.PLAN_RIGHTS/PLAN_ADLS/PLAN_BENEFITS and
// window.emptyPlanResidence/emptyPlanProvider/emptyPlanDirective, all of
// which stay legacy globals in legacy-app.js rather than moving here. Two
// independent reasons force that: computeNavChecks()'s planAnnual branch and
// resetYearlyFieldsForNewYear()'s planAnnual branch (both dashboard/ward-
// management code that must stay eagerly available, same as calcTotals() in
// Milestone 2) read PLAN_RIGHTS/PLAN_ADLS/PLAN_BENEFITS and the three
// factories directly; and emptyPlanDirective() is separately reused by
// emptyDataPlanInitial() below (Milestone 4 plan's "Design decisions").
export function emptyDataPlanAnnual() {
  const rights = {}; window.PLAN_RIGHTS.forEach(([k]) => rights[k] = '');
  const adls = {}; window.PLAN_ADLS.forEach(([k]) => adls[k] = '');
  const benefits = {}; window.PLAN_BENEFITS.forEach(([k]) => benefits[k] = { eligible: false, appliedFor: false });
  return {
    // Cover
    wardName:'', caseNumber:'', ssn:'', county:'Pinellas',
    periodFrom:'', periodTo:'', gid:'', guardian:'', attorney:'',
    wardLiving:'', residenceAddress:'', residenceCityStateZip:'', residencePhone:'',
    mailingAddress:'', mailingCityStateZip:'',
    // Q1 — places resided in the prior 12 months
    q1Residences:[window.emptyPlanResidence()],
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
    q4Providers:[window.emptyPlanProvider()],
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
    q10Directives:[window.emptyPlanDirective()],
    // Q11 — remuneration
    q11NoRemuneration:false, q11NoRemunerationName:'',
    q11ReceivedName:'', q11Amount:'', q11From:'', q11SubmittedToCourt:false,
    // Certification — the seven "check all that apply" statements
    certIncapacitatedNoCopy:false, certMinorNoCopy:false, certConsulted:false,
    certNoRestriction:false, certProvidesMedical:false, certPhysicianAttached:false,
    certRecognizeRights:false, certRightsChangedExplain:'',
    // Guardians (form provides three signature blocks) + attorney
    planGuardians:[
      {name:'',ssn:'',phone:'',email:'',signatureDate:'',mailingStreet:'',mailingCityStateZip:'',officeStreet:'',officeCityStateZip:'',relationship:''},
      {name:'',ssn:'',phone:'',email:'',signatureDate:'',mailingStreet:'',mailingCityStateZip:'',officeStreet:'',officeCityStateZip:'',relationship:''},
      {name:'',ssn:'',phone:'',email:'',signatureDate:'',mailingStreet:'',mailingCityStateZip:'',officeStreet:'',officeCityStateZip:'',relationship:''}
    ],
    attorney_signatureDate:'', attorney_bar:'', attorney_phone:'',
    attorney_street:'', attorney_cityStateZip:''
  };
}

// Blank-ward data factory for the Plan Initial feature (Milestone 5, Phase A).
// Same non-pure-data shape as emptyDataPlanAnnual above: reaches back into
// window.INITIAL_ADLS and window.emptyInitialProvider/emptyPlanDirective,
// which stay legacy globals in legacy-app.js because
// computeNavChecks()'s planInitial branch reads INITIAL_ADLS directly, and
// emptyPlanDirective() is also used by emptyDataPlanAnnual() above (Milestone
// 5 plan's "Confirmed facts" / "Design decisions").
export function emptyDataPlanInitial() {
  const adls = {}; window.INITIAL_ADLS.forEach(([k]) => adls[k] = '');
  return {
    // Cover
    wardName:'', caseNumber:'', county:'Pinellas', periodFrom:'', periodTo:'',
    inceptionDate:'', lettersSignedDate:'', successorGuardianship:'',
    guardianNames:'', attorneyName:'',
    wardLiving:'', residenceAddress:'', residenceCityStateZip:'', residencePhone:'',
    mailingAddress:'', mailingCityStateZip:'',
    q1PreexistingDirectives:'',
    // Q2 — residential setting best suited to the ward
    q2Setting:'', q2Explain:'',
    // Q3 — medical services
    q3MedPrimary:false, q3MedDentist:false, q3MedOphthalmologist:false,
    q3MedSpecialist:false, q3MedSpecialistArea:'', q3MedPT:false,
    q3MedST:false, q3MedOT:false, q3MedWardDecides:false, q3MedOther:false, q3MedExplain:'',
    // Q4 — mental health services
    q4Mental:'', q4Explain:'',
    // Q5 — personal care
    q5Personal:'', q5Explain:'',
    // Q6 — socialization / recreation
    q6CareFacility:false, q6NursesAides:false, q6FamilyFriends:false, q6DayProgram:false,
    q6WardDecides:false, q6Other:false, q6Explain:'',
    // Q7 — insurance / benefits
    q7SocialSecurity:false, q7Ssdi:false, q7Hmo:false, q7Ssi:false,
    q7StateSupplement:false, q7InstitutionalCare:false, q7SupplementalIns:false,
    q7Pension:false, q7Medicare:false, q7Medicaid:false, q7Va:false,
    q7Trusts:false, q7PendingBenefits:false, q7Other:false, q7Explain:'',
    // Q9 — examining physicians/providers
    q9Providers:[window.emptyInitialProvider()],
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
    q11Directives:[window.emptyPlanDirective(),window.emptyPlanDirective()],
    // Certification — six "check all that apply" statements
    certIncapacitatedNoCopy:false, certMinorNoCopy:false, certConsulted:false,
    certRecognizeRights:false, certNoRestriction:false, certProvidesCare:false,
    // Guardians (form provides up to four signature blocks) + attorney
    planGuardians:[
      {name:'',ssn:'',street:'',phone:'',cityStateZip:'',signatureDate:'',relationship:''},
      {name:'',ssn:'',street:'',phone:'',cityStateZip:'',signatureDate:'',relationship:''},
      {name:'',ssn:'',street:'',phone:'',cityStateZip:'',signatureDate:'',relationship:''},
      {name:'',ssn:'',street:'',phone:'',cityStateZip:'',signatureDate:'',relationship:''}
    ],
    attorney_name:'', attorney_bar:'', attorney_phone:'',
    attorney_street:'', attorney_cityStateZip:'', attorney_signatureDate:''
  };
}

// Blank-ward data factory for the Plan Minor feature (Milestone 6, Phase A).
// Needed synchronously at ward-creation time, same reasoning as the three
// factories above -- but this one is genuinely pure data, unlike
// emptyDataPlanAnnual()/emptyDataPlanInitial(): it only calls
// window.emptyMinorResidence()/emptyMinorProvider()/emptyMinorGuardianSig()
// (plain factory functions), never a bare top-level const, because Plan
// Minor's computeNavChecks() branch has no rights/ADLs-style rating array to
// read directly (Milestone 6 plan's "Confirmed facts").
export function emptyDataPlanMinor() {
  return {
    // Cover
    wardName:'', county:'Pinellas', ucn:'', ref:'', periodFrom:'', periodTo:'',
    amendedForm:'', amendedVersion:'', professionalGuardian:'', publicGuardian:'',
    guardianName:'',
    // Q1 — current residence
    q1ResidenceName:'', q1Street:'', q1City:'', q1State:'', q1Zip:'', q1Phone:'',
    // Q2 — residences during the preceding 12 months
    q2Residences:[window.emptyMinorResidence()],
    // Q3 — medical/mental health treatment providers
    q3Providers:[window.emptyMinorProvider()],
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
    planGuardians:[window.emptyMinorGuardianSig(),window.emptyMinorGuardianSig()],
    // Preparer certification
    preparer_name:'', preparer_tin:'', preparer_phone:'',
    preparer_mailingStreet:'', preparer_cityStateZip:'', preparer_email:'', preparer_signatureDate:'',
    // Attorney certification
    attorney_name:'', attorney_bar:'', attorney_phone:'',
    attorney_street:'', attorney_cityStateZip:'', attorney_email:'', attorney_signatureDate:''
  };
}

// Temporary: legacy-app.js stays a classic (non-module) script per
// Milestone 1's recorded decision, so it can't `import` this module
// directly -- initializeEmptyData()'s 'simplified'/'planSimplified'/
// 'planAnnual'/'planInitial'/'planMinor' cases reach these via window
// instead, the same pattern src/fragment-loader.js uses for loadFragment().
// Remove once a real src/main.js bootstrap exists to own this wiring
// explicitly.
window.emptyDataSimplified = emptyDataSimplified;
window.emptyDataPlanSimplified = emptyDataPlanSimplified;
window.emptyDataPlanAnnual = emptyDataPlanAnnual;
window.emptyDataPlanInitial = emptyDataPlanInitial;
window.emptyDataPlanMinor = emptyDataPlanMinor;
