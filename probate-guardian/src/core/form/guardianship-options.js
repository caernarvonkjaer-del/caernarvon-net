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

export const GUARDIAN_CLASSIFICATION_OPTIONS = [
  'Professional',
  'Public',
  'Family',
  'Non-professional',
];

export function optionsWithLegacyValue(options, currentValue) {
  const value = currentValue === null || currentValue === undefined ? '' : String(currentValue);
  const base = options.map((option) => ({ value: option, label: option }));
  if (!value || base.some((option) => option.value === value)) return base;
  return [{ value, label: value }, ...base];
}

export function optionsWithLegacyValuePairs(options, currentValue) {
  return optionsWithLegacyValue(options, currentValue).map((option) => [option.value, option.label]);
}
