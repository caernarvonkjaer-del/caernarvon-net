import { markFilingRevisionChanged } from '../../core/filing/output-revision.js';
import { simplifiedGuardianRow } from '../../core/filing/models/simplified.js';
// Milestone 73F part 1: the residence/office address reconciliation moved,
// unchanged, to the core model, where the shared export checks can read it.
export { normalizeSimplifiedGuardianCompatibility, getSimplifiedGuardianAddressConflicts } from '../../core/filing/models/simplified.js';
// Milestone 73V: the row shape lives in the core model, where the list rules
// can name it; this keeps its old name for this feature's callers.
export function createSimplifiedGuardian() {
  return simplifiedGuardianRow();
}

export function resolveSimplifiedGuardianAddressConflict(data, rowIndex, field, choice) {
  if (!['residenceStreet', 'residenceCityStateZip'].includes(field) || !['canonical', 'legacy'].includes(choice)) return false;
  const guardian = data?.guardians?.[rowIndex];
  const legacyField = field === 'residenceStreet' ? 'officeStreet' : 'officeCityStateZip';
  if (!guardian || !guardian[field] || !guardian[legacyField] || guardian[field] === guardian[legacyField]) return false;
  if (choice === 'legacy') guardian[field] = guardian[legacyField];
  delete guardian[legacyField];
  markFilingRevisionChanged('address-conflict-resolved');
  return true;
}
