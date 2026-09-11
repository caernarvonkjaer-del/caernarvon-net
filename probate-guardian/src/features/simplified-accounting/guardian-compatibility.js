export function createSimplifiedGuardian() {
  return { name: '', ssn: '', phone: '', email: '', mailingStreet: '', mailingCityStateZip: '', residenceStreet: '', residenceCityStateZip: '', signatureDate: '' };
}

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

export function resolveSimplifiedGuardianAddressConflict(data, rowIndex, field, choice) {
  if (!['residenceStreet', 'residenceCityStateZip'].includes(field) || !['canonical', 'legacy'].includes(choice)) return false;
  const guardian = data?.guardians?.[rowIndex];
  const legacyField = field === 'residenceStreet' ? 'officeStreet' : 'officeCityStateZip';
  if (!guardian || !guardian[field] || !guardian[legacyField] || guardian[field] === guardian[legacyField]) return false;
  if (choice === 'legacy') guardian[field] = guardian[legacyField];
  delete guardian[legacyField];
  return true;
}
