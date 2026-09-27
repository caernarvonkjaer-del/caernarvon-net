// Milestone 70, 70C: the Simplified Annual Accounting's blank filing, moved
// from src/core/state.js (where Milestone 2 had put it so it existed before
// the lazily imported feature loads -- still the reason it is its own small
// module). Blank-data factories never default `county` (Milestone 40C-A): see
// src/core/filing/filing-registry.js's initializeEmptyData().

// Blank-ward data factory for the Simplified Accounting feature (Milestone 2,
// Phase D). Pure data -- no DOM, no calls to any other function -- kept out
// of the lazily-imported features/simplified-accounting/index.js because it's
// needed at ward-CREATION time (initializeEmptyData(), called from addWard()),
// which can happen before the feature is ever mounted/rendered. Same reasoning
// as calcTotals() being kept out of the lazy feature for the dashboard's sake
// (see the Milestone 2 plan's "Problem 1"; since Milestone 70's 70B it is
// features/simplified-accounting/totals.js, loaded eagerly).
export function emptyDataSimplified() {
  return {
    wardName:'', ssn:'', caseNumber:'', ucn:'', periodFrom:'', periodTo:'',
    attorney:'', guardian:'', typeOfGuardianship:'', county:'',
    amendedForm:'', gid:'',
    eligDepository:'', eligOnlyTransactions:'',
    startingBalance:'',
    interestIncome:'',
    depositsSettlement:'',
    serviceCharges:'',
    federalIncomeTax:'',
    guardians:[{name:'',ssn:'',phone:'',email:'',mailingStreet:'',mailingCityStateZip:'',residenceStreet:'',residenceCityStateZip:'',signatureDate:'',signatureState:'',signatureImage:''}],
    attorney_barNumber:'', attorney_phone:'', attorney_email:'', attorney_street:'', attorney_cityStateZip:'',
    attorney_signatureDate:'',
    // Milestone 39-C
    attorney_signatureState:'', attorney_signatureImage:'',
    certServiceDate:'',
    certAttySignDate:'',
    // Milestone 39-C
    certAttySignatureState:'', certAttySignatureImage:'',
    certAttyBarNumber:'', certAttyPhone:'', certAttyStreet:'', certAttyCityStateZip:'',
    // Milestone 57B: filer attestation that no one requires service.
    // Tri-state, never coerced (section 4): '' is unanswered, and an
    // empty recipient list must never infer 'Yes'. Asked only when no
    // recipient is listed (D16), and reset to '' by every filing
    // conversion (D7) -- it is this filer's assertion about this filing.
    certNoRecipients:'',
    certRecipients:[
      {name:'',line2:'',line3:''},
      {name:'',line2:'',line3:''},
      {name:'',line2:'',line3:''},
      {name:'',line2:'',line3:''}
    ],
    certIndicator:'',
    // Part VII — Remuneration.
    //
    // Milestone 60J: starts EMPTY, not with two blank placeholder rows, for
    // the reason emptyDataAnnual() starts empty (Milestone 58D) -- the "I
    // verify there is no remuneration to report" declaration only renders
    // while this array is empty, so seeding placeholders hid the one control
    // that answers Part VII behind deleting two meaningless rows.
    //
    // Milestone 60G: rows carry `amount`, which the data model, the shared
    // SCHEDULE_SCHEMAS.remuneration factory and this form's own Excel
    // export/import always had -- only this factory and the UI never adopted
    // it, so nothing upstream ever set it. Written out rather than imported
    // from schedule-definitions.js: pulling that module into core state for
    // one row literal is an initialization coupling nobody needs, and
    // tests/unit/remuneration-declaration.spec.js guards the two against
    // drifting apart again.
    remuneration:[]
  };
}

// The Simplified Annual Accounting's pages, in sidebar order -- what the router and the sidebar
// accept and list for it. Moved from legacy-app.js's routing section.
export const PAGES_SIMPLIFIED=[
  {id:'/',        label:'Cover & Part I'},
  {id:'/summary', label:'Summary'},
  {id:'/p2',      label:'Part II'},
  {id:'/p3',   label:'Part III'},
  {id:'/p4',   label:'Part IV'},
  {id:'/p5',   label:'Part V'},
  {id:'/p6',   label:'Part VI'},
  {id:'/p7',   label:'Part VII'},
  {id:'/print',label:'Print Preview'},
];
