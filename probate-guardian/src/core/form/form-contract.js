// Milestone 24: Shared Form Contract & Two-Phase Field Commit API
// Governs storage sanitization, identifier preservation, date normalization, and blur formatting.

import { parseFlexibleDate, formatDisplayDate } from './date-parser.js';

if (typeof window !== 'undefined') {
  window._transientDrafts = window._transientDrafts || {};
}

/**
 * Read-side counterpart to the yes-no write contract below (writeDraftValue()/
 * finalizeFieldValue(), which store the literal STRINGS 'Yes'/'No' for any
 * control marked data-form-value="yes-no").
 *
 * Every such field is tri-state -- '' (never answered), 'Yes', or 'No' -- so
 * a plain truthiness test is always wrong: 'No' is a non-empty string and
 * therefore truthy. That exact mistake shipped in two PDF renderers
 * (`d.amendedForm ? 'Yes' : 'No'`), which made every Annual and Simplified
 * Accounting PDF print "Amended Form? Yes" in all three states, including
 * the default. Render these fields through this helper rather than testing
 * them directly.
 *
 * `blank` is what an unanswered field prints as; pass '' for a truly empty
 * cell, or keep the 'No' default where the form treats "not answered" and
 * "No" the same way on paper.
 */
export function yesNoText(value, blank = 'No') {
  if (value === true) return 'Yes';
  if (value === false) return 'No';
  const normalized = String(value ?? '').trim().toLowerCase();
  if (normalized === 'yes') return 'Yes';
  if (normalized === 'no') return 'No';
  return blank;
}

/**
 * Non-destructive storage sanitizer for identifier-like and free-form text.
 * Strips only unsafe control characters and trims leading/trailing whitespace.
 * Preserves quotes, apostrophes, dashes, slashes, uppercase/lowercase letters, and numbers.
 */
export function sanitizeStoredText(value) {
  return String(value ?? '')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .trim();
}

/**
 * Safe title-casing formatter.
 * Converts only purely lowercase words to title-case.
 * Leaves all-caps acronyms (e.g. "SSI", "USAA", "LLC") and mixed-case names (e.g. "McLeod", "O'Connor") 100% untouched.
 */
export function formatSafeTitleCase(s) {
  if (!s) return '';
  const cleaned = sanitizeStoredText(s);
  return cleaned.split(/(\s+)/).map((word) => {
    if (word.match(/\s/) || word === '') return word;
    const match = word.match(/^([a-zA-Z]+)([^a-zA-Z]*)$/);
    if (match) {
      const [, alpha, trailingPunct] = match;
      // 2-letter state abbreviations uppercase (e.g. FL, NY, CA)
      if (/^[a-zA-Z]{2}$/.test(alpha)) {
        return alpha.toUpperCase() + trailingPunct;
      }
      // Purely lowercase word capitalizes
      if (/^[a-z]+$/.test(alpha)) {
        return alpha.charAt(0).toUpperCase() + alpha.slice(1) + trailingPunct;
      }
    }
    return word;
  }).join('');
}

/**
 * Reads the canonical model path from any recognized attribute on the control.
 */
export function getControlPath(control) {
  if (!control) return '';
  return control.dataset?.fieldPath || control.dataset?.formPath || control.dataset?.annualPath || '';
}

/**
 * Retrieves the field kind classification.
 */
export function getControlKind(control) {
  if (!control) return 'text';
  if (control.dataset?.fieldKind) return control.dataset.fieldKind;
  const path = getControlPath(control).toLowerCase();
  const format = control.dataset?.formFormat || control.dataset?.annualFormat || '';
  if (format === 'case-number' || path.includes('casenumber')) return 'identifier';
  if (format === 'account' || format === 'account-number' || path.includes('account')) return 'identifier';
  if (format === 'check' || format === 'check-number' || path.includes('check')) return 'identifier';
  if (format === 'bar-number' || path.includes('barnumber') || path.includes('bar_')) return 'identifier';
  if (format === 'name' || path.includes('name')) return 'name';
  if (format === 'address' || format === 'city-state-zip' || path.includes('address') || path.includes('street')) return 'address';
  if (format === 'phone' || path.includes('phone')) return 'phone';
  if (format === 'ssn' || path.includes('ssn') || path.includes('ein')) return 'ssn';
  if (format === 'decimal' || control.type === 'number') return 'money';
  if (control.type === 'date' || path.includes('date')) return 'date';
  return 'text';
}

/**
 * Retrieves the formatter policy: 'preserve' | 'normalize' | 'display-only'.
 */
export function getControlPolicy(control) {
  if (control.dataset?.fieldFormatPolicy) return control.dataset.fieldFormatPolicy;
  const kind = getControlKind(control);
  if (kind === 'identifier' || kind === 'text') return 'preserve';
  if (kind === 'date' || kind === 'money' || kind === 'phone' || kind === 'ssn' || kind === 'percent') return 'normalize';
  if (kind === 'name' || kind === 'address') return 'display-only';
  return 'preserve';
}

/**
 * Phase 1: writeDraftValue (runs on input and compositionend).
 * Writes raw user input to the model for non-date fields without destructive reformats or moving the caret.
 * For date fields, keeps unparsed text in transient draft only so invalid/partial dates never leak into model/export.
 */
export function writeDraftValue(control, options = {}) {
  const path = getControlPath(control);
  if (!path) return;
  if (options.event) options.event._pgHandled = true;

  const kind = getControlKind(control);
  const isCheckbox = control?.type === 'checkbox';
  const rawValue = isCheckbox
    ? (control.dataset?.formValue === 'yes-no' ? (control.checked ? 'Yes' : 'No') : control.checked)
    : control.value;

  if (kind === 'date') {
    // Keep draft in DOM / transient store during active typing; do not leak unparsed text into window.D
    window._transientDrafts[path] = rawValue;
    return;
  }

  const currentVal = window.getPath ? window.getPath(window.D, path) : undefined;
  if (currentVal !== rawValue) {
    if (window.setPath) window.setPath(window.D, path, rawValue);
    if (window.autoSave) window.autoSave();
    if (window.updateNavDots) window.updateNavDots();
    if (window.refreshWardInfoCard) window.refreshWardInfoCard();
    if (control.dataset.syncWardName && window.syncActiveWardNameDisplay) window.syncActiveWardNameDisplay();
    if (control.dataset.syncGuardianName && window.syncGuardianNameDisplay) window.syncGuardianNameDisplay();

    // Party write-through
    const identitySlot = window.identitySlotForPath?.(window.D, path);
    if (identitySlot && window.syncIdentityField) window.syncIdentityField(window.D, identitySlot.role, identitySlot.index);
  }
}

/**
 * Phase 2: finalizeFieldValue (runs on blur / focusout).
 * Applies date canonicalization, amount normalization, and title-casing.
 */
export function finalizeFieldValue(control, options = {}) {
  const path = getControlPath(control);
  if (!path) return;
  if (options.event) options.event._pgHandled = true;

  const kind = getControlKind(control);
  const policy = getControlPolicy(control);
  const isCheckbox = control?.type === 'checkbox';
  let rawValue = isCheckbox
    ? (control.dataset?.formValue === 'yes-no' ? (control.checked ? 'Yes' : 'No') : control.checked)
    : control.value;

  if (kind === 'date') {
    const parsed = parseFlexibleDate(rawValue);
    if (parsed === '') {
      // Empty date
      control.removeAttribute('aria-invalid');
      control.classList.remove('is-invalid');
      delete window._transientDrafts[path];
      if (window.setPath) window.setPath(window.D, path, '');
    } else if (parsed === null) {
      // Invalid date text: retain typed text visibly, mark aria-invalid, leave model uncommitted
      control.setAttribute('aria-invalid', 'true');
      control.classList.add('is-invalid');
      if (window.setPath) window.setPath(window.D, path, '');
    } else {
      // Valid canonical date: update display & model
      control.removeAttribute('aria-invalid');
      control.classList.remove('is-invalid');
      control.value = formatDisplayDate(parsed);
      delete window._transientDrafts[path];
      if (window.setPath) window.setPath(window.D, path, parsed);
    }
  } else if (kind === 'caseNumber' || control.dataset?.formFormat === 'case-number' || control.dataset?.annualFormat === 'case') {
    const formatted = window.finalizeCaseNumber ? window.finalizeCaseNumber(rawValue) : sanitizeStoredText(rawValue);
    control.value = formatted;
    if (window.setPath) window.setPath(window.D, path, formatted);
  } else if (kind === 'barNumber' || control.dataset?.formFormat === 'bar-number' || control.dataset?.annualFormat === 'bar') {
    const formatted = window.formatBarNumber ? window.formatBarNumber(rawValue) : sanitizeStoredText(rawValue);
    control.value = formatted;
    if (window.setPath) window.setPath(window.D, path, formatted);
  } else if (kind === 'zip' || control.dataset?.formFormat === 'city-state-zip' || control.dataset?.annualFormat === 'zip') {
    const formatted = window.formatCityStateZip ? window.formatCityStateZip(rawValue) : rawValue;
    control.value = formatted;
    if (window.setPath) window.setPath(window.D, path, formatted);
  } else if (policy === 'preserve') {
    const cleaned = sanitizeStoredText(rawValue);
    if (window.setPath) window.setPath(window.D, path, cleaned);
    control.value = cleaned;
  } else if (kind === 'name' || kind === 'address' || policy === 'display-only') {
    const formatted = formatSafeTitleCase(rawValue);
    control.value = formatted;
    if (window.setPath) window.setPath(window.D, path, formatted);
  } else if (kind === 'money' && window.sanitizeNonNegativeDecimal) {
    const cleaned = window.sanitizeNonNegativeDecimal(rawValue);
    control.value = cleaned;
    if (window.setPath) window.setPath(window.D, path, parseFloat(cleaned) || 0);
  } else if (kind === 'phone' && window.formatPhone) {
    const formatted = window.formatPhone(rawValue);
    control.value = formatted;
    if (window.setPath) window.setPath(window.D, path, formatted);
  } else if (kind === 'ssn' && window.formatSSN) {
    const formatted = window.formatSSN(rawValue);
    control.value = formatted;
    if (window.setPath) window.setPath(window.D, path, formatted);
  }

  if (window.autoSave) window.autoSave();
  if (window.updateNavDots) window.updateNavDots();
  if (window.refreshWardInfoCard) window.refreshWardInfoCard();

  const identitySlot = window.identitySlotForPath?.(window.D, path);
  if (identitySlot && window.syncIdentityField) window.syncIdentityField(window.D, identitySlot.role, identitySlot.index);
}

// Global exposure for legacy interop
if (typeof window !== 'undefined') {
  window.sanitizeStoredText = sanitizeStoredText;
  window.formatSafeTitleCase = formatSafeTitleCase;
  window.writeDraftValue = writeDraftValue;
  window.finalizeFieldValue = finalizeFieldValue;
}
