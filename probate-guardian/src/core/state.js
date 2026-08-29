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

// Temporary: legacy-app.js stays a classic (non-module) script per
// Milestone 1's recorded decision, so it can't `import` this module
// directly -- initializeEmptyData()'s 'simplified'/'planSimplified' cases
// reach these via window instead, the same pattern src/fragment-loader.js
// uses for loadFragment(). Remove once a real src/main.js bootstrap exists
// to own this wiring explicitly.
window.emptyDataSimplified = emptyDataSimplified;
window.emptyDataPlanSimplified = emptyDataPlanSimplified;
