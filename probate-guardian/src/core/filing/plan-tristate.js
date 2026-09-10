// Schema-aware normalization for the small set of Plan controls that mean
// exactly Yes or No. Check-all-that-apply groups intentionally remain boolean
// collections: their explicit None option distinguishes a negative answer.

export const PLAN_TRISTATE_SCHEMA_VERSION = 1;

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

  for (const field of FIELDS_BY_TYPE[ward.inventoryType]) {
    // Earlier saves represented an explicit No as false. A missing value is
    // deliberately left empty so validators can report it as unanswered.
    if (ward[field] === false) ward[field] = 'No';
    else if (ward[field] === true) ward[field] = 'Yes';
  }
  ward.planTriStateSchemaVersion = PLAN_TRISTATE_SCHEMA_VERSION;
  return ward;
}

export function migratePlanTriStateCollection(wards) {
  return (wards || []).map(migratePlanTriState);
}
