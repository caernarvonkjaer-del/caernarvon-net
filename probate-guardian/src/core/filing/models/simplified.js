// Milestone 70, 70C: the Simplified Annual Accounting's blank filing, moved
// from src/core/state.js (where Milestone 2 had put it so it existed before
// the lazily imported feature loads -- still the reason it is its own small
// module). Blank-data factories never default `county` (Milestone 40C-A): see
// src/core/filing/filing-registry.js's initializeEmptyData().
import { emptyRecipient } from '../recipient-shape.js';

// Blank-ward data factory for the Simplified Accounting feature (Milestone 2,
// Phase D). Pure data -- no DOM, no calls to any other function -- kept out
// of the lazily-imported features/simplified-accounting/index.js because it's
// needed at ward-CREATION time (initializeEmptyData(), called from addWard()),
// which can happen before the feature is ever mounted/rendered. Same reasoning
// as calcTotals() being kept out of the lazy feature for the dashboard's sake
// (see the Milestone 2 plan's "Problem 1"; since Milestone 70's 70B it is
// features/simplified-accounting/totals.js, loaded eagerly).

// The blank row "+ Add Co-Guardian" adds on Part IV. Moved here from the
// feature's guardian-compatibility.js by Milestone 73V, unchanged, so the list
// rules (src/core/form/collections.js) can name it; the feature's
// createSimplifiedGuardian() returns it. (The filing's first guardian above
// also carries certifiesService; an added one gains it when it is ticked.)
export function simplifiedGuardianRow() {
  // Milestone 39-C
  return { name: '', ssn: '', phone: '', email: '', mailingStreet: '', mailingCityStateZip: '', residenceStreet: '', residenceCityStateZip: '', signatureDate: '', signatureState: '', signatureImage: '' };
}

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
    guardians:[{name:'',ssn:'',phone:'',email:'',mailingStreet:'',mailingCityStateZip:'',residenceStreet:'',residenceCityStateZip:'',signatureDate:'',signatureState:'',signatureImage:'',certifiesService:false}],
    // Milestone 72B: attorney_secondaryEmail -- Part V has always collected it.
    attorney_barNumber:'', attorney_phone:'', attorney_email:'', attorney_secondaryEmail:'', attorney_street:'', attorney_cityStateZip:'',
    attorney_signatureDate:'',
    // Milestone 39-C
    attorney_signatureState:'', attorney_signatureImage:'',
    certServiceDate:'',
    certAttySignDate:'',
    // Milestone 39-C
    certAttySignatureState:'', certAttySignatureImage:'',
    // Milestone 71B: the guardian's certificate-of-service signature, used when no attorney is started.
    certGuardianSignDate:'', certGuardianSignatureState:'', certGuardianSignatureImage:'',
    // Milestone 72H: no longer entered or printed -- the certificate's
    // attorney is Part V's. They only hold details typed on Part VI before,
    // until the filer discards them; certAttorneyMigrated marks the once-only
    // fill of Part V's blanks from them (certificate-migrations.js).
    certAttyBarNumber:'', certAttyPhone:'', certAttyStreet:'', certAttyCityStateZip:'',
    certAttorneyMigrated:false,
    // Milestone 57B: filer attestation that no one requires service.
    // Tri-state, never coerced (section 4): '' is unanswered, and an
    // empty recipient list must never infer 'Yes'. Asked only when no
    // recipient is listed (D16), and reset to '' by every filing
    // conversion (D7) -- it is this filer's assertion about this filing.
    certNoRecipients:'',
    // Milestone 73O part 2: a name and four address lines (recipient-shape.js).
    certRecipients:[emptyRecipient(),emptyRecipient(),emptyRecipient(),emptyRecipient()],
    // Milestone 72G: certIndicator is the method of service (PDF only);
    // certWardStatus is the workbook's "Indicate if:" (J39), required.
    // certIndicatorMigrated marks the once-only move (certificate-migrations.js).
    certIndicator:'', certWardStatus:'', certIndicatorMigrated:false,
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

// Milestone 73F part 1: moved unchanged from src/features/simplified-accounting/
// guardian-compatibility.js (which re-exports both), so the shared export checks
// can read a guardian's residence/office address conflicts.
const pairs = [['residenceStreet', 'officeStreet'], ['residenceCityStateZip', 'officeCityStateZip']];

export function normalizeSimplifiedGuardianCompatibility(data, { persistedSource = false } = {}) {
  let changed = false;
  const conflicts = [];
  if (!Array.isArray(data?.guardians)) return { changed, conflicts };
  data.guardians.forEach((guardian, rowIndex) => {
    if (!guardian || typeof guardian !== 'object') return;
    pairs.forEach(([canonical, legacy]) => {
      const canonicalValue = guardian[canonical] || '';
      const legacyValue = guardian[legacy] || '';
      if (!canonicalValue && legacyValue) { guardian[canonical] = legacyValue; changed = true; }
      else if (canonicalValue && legacyValue && canonicalValue !== legacyValue) conflicts.push({ rowIndex, field: canonical, legacyField: legacy, canonicalValue, legacyValue });
      else if (persistedSource && canonicalValue && canonicalValue === legacyValue) { delete guardian[legacy]; changed = true; }
    });
  });
  return { changed, conflicts };
}

export function getSimplifiedGuardianAddressConflicts(data) {
  return normalizeSimplifiedGuardianCompatibility(data).conflicts;
}
