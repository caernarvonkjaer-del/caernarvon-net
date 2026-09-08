// Type definitions for form controls, field kinds, format policies, and validation results.

/**
 * @typedef {'text' | 'identifier' | 'name' | 'address' | 'phone' | 'ssn' | 'money' | 'date' | 'percent'} FieldKind
 */

/**
 * @typedef {'preserve' | 'normalize' | 'display-only'} FormatPolicy
 */

/**
 * @typedef {Object} FieldDescriptor
 * @property {string} path - Dot-separated object path in filing model (e.g. 'attorney_barNumber').
 * @property {FieldKind} kind - Field kind classification.
 * @property {FormatPolicy} policy - Formatter policy behavior.
 * @property {string} [label] - Human-readable field label.
 * @property {string} [section] - Section or part heading.
 * @property {string} [route] - Hash navigation route (e.g. '/p1', '/d2').
 * @property {string} [defaultValue] - Default field value.
 */

/**
 * @typedef {'required' | 'warning' | 'blocking' | 'info'} ValidationSeverity
 */

/**
 * @typedef {Object} ValidationResult
 * @property {string} [code] - Structured error code (e.g. 'required.empty', 'filing.identity.conflict').
 * @property {string} [section] - Form section name.
 * @property {string} [path] - Target model path.
 * @property {string} [label] - Field or issue label.
 * @property {string} [route] - Router path to jump to.
 * @property {ValidationSeverity} [severity] - Error severity level.
 * @property {string} message - Human-readable error description.
 */

export {};
