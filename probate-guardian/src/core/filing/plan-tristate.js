// Schema-aware normalization for the small set of Plan controls that mean
// exactly Yes or No. Check-all-that-apply groups intentionally remain boolean
// collections: their explicit None option distinguishes a negative answer.

export const PLAN_TRISTATE_SCHEMA_VERSION = 2;

const FIELDS_BY_TYPE = {
  planSimplified: ['q7RestoreRights', 'q9Remuneration'],
  planInitial: ['committeeIncorporated'],
  planMinor: ['amendedForm', 'professionalGuardian', 'publicGuardian'],
  planAnnual: [],
};

export function migratePlanTriState(ward) {
  if (!ward || !FIELDS_BY_TYPE[ward.inventoryType]) return ward;
  const currentVersion = Number(ward.planTriStateSchemaVersion || 0);
  if (currentVersion >= PLAN_TRISTATE_SCHEMA_VERSION) return ward;

  if (currentVersion < 1) {
    for (const field of FIELDS_BY_TYPE[ward.inventoryType]) {
      // Earlier saves represented an explicit No as false. A missing value is
      // deliberately left empty so validators can report it as unanswered.
      if (ward[field] === false) ward[field] = 'No';
      else if (ward[field] === true) ward[field] = 'Yes';
    }
  }
  if (currentVersion < 2 && (ward.inventoryType === 'planInitial' || ward.inventoryType === 'planAnnual')) {
    const key = ward.inventoryType === 'planInitial' ? 'q11Directives' : 'q10Directives';
    for (const directive of ward[key] || []) {
      if (directive?.courtRevoked === false) directive.courtRevoked = 'No';
      else if (directive?.courtRevoked === true) directive.courtRevoked = 'Yes';
    }
  }
  ward.planTriStateSchemaVersion = PLAN_TRISTATE_SCHEMA_VERSION;
  return ward;
}

export function migratePlanTriStateCollection(wards) {
  return (wards || []).map(migratePlanTriState);
}
