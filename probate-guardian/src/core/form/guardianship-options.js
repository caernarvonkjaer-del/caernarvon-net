export const GUARDIANSHIP_TYPE_OPTIONS = [
  'Plenary',
  'Limited',
  'Guardian Advocate',
  'Voluntary',
  'Minor - Person',
  'Minor - Property',
  'Minor - Person - Property',
];

export const GUARDIANSHIP_LIFECYCLE_OPTIONS = [
  'Successor',
  'Standby',
  'Surrogate',
  'Emergency Temporary Guardianship',
  'None',
];

// Milestone 51B removed GUARDIAN_CLASSIFICATION_OPTIONS from here
// (Professional/Public/Family/Non-professional). Nothing imported it, and
// unlike the two lists above it was not even referenced by this module's own
// spec. No filing collects a guardian classification today; if one ever does,
// add the list back next to the field that needs it rather than speculatively.
export function optionsWithLegacyValue(options, currentValue) {
  const value = currentValue === null || currentValue === undefined ? '' : String(currentValue);
  const base = options.map((option) => ({ value: option, label: option }));
  if (!value || base.some((option) => option.value === value)) return base;
  return [{ value, label: value }, ...base];
}

export function optionsWithLegacyValuePairs(options, currentValue) {
  return optionsWithLegacyValue(options, currentValue).map((option) => [option.value, option.label]);
}
