// Milestone 24: Shared Form Contract & Two-Phase Field Commit API
// Governs storage sanitization, identifier preservation, date normalization, and blur formatting.

import { parseFlexibleDate, formatDisplayDate } from './date-parser.js';
import {
  clearFieldDraft,
  commitStoredDateDrafts,
  formatDraftIssues,
  getFieldDraft,
  getFieldDraftIssues,
  recordDateDraft,
} from './commit-coordinator.js';

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

// Use for plan questions where the court form requires an explicit answer.
// Legacy false values remain "No"; only absent/null values remain unanswered.
export function triStateText(value) {
  return yesNoText(value, '');
}

export function isTriStateAnswer(value) {
  return triStateText(value) !== '';
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
 * Safe title-casing formatter for Names and Street Addresses.
 * Converts only purely lowercase words to title-case.
 * Leaves all-caps acronyms (e.g. "SSI", "USAA", "LLC") and mixed-case names (e.g. "McLeod", "O'Connor") 100% untouched.
 * Does NOT uppercase 2-letter words (e.g. "Dr." stays "Dr.", "St." stays "St.", "Ed" stays "Ed").
 */
export function formatSafeTitleCase(s) {
  if (!s) return '';
  const cleaned = sanitizeStoredText(s);
  return cleaned.split(/(\s+)/).map((word) => {
    if (word.match(/\s/) || word === '') return word;
    const match = word.match(/^([a-zA-Z]+)([^a-zA-Z]*)$/);
    if (match) {
      const [, alpha, trailingPunct] = match;
      // Purely lowercase word capitalizes
      if (/^[a-z]+$/.test(alpha)) {
        return alpha.charAt(0).toUpperCase() + alpha.slice(1) + trailingPunct;
      }
    }
    return word;
  }).join('');
}

export const US_POSTAL_STATES = new Set([
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY',
  'DC', 'PR', 'VI', 'GU', 'AS', 'MP',
]);

export const TITLE_CASE_CITY_PREFIXES = new Set(['St', 'Mt', 'Ft']);

/**
 * Combined "City, State Zip" formatter:
 * - Capitalizes city words (e.g. "tampa" -> "Tampa")
 * - Preserves title-case for city abbreviations (e.g. "st. petersburg" -> "St. Petersburg", "mt. dora" -> "Mt. Dora")
 * - Uppercases valid 2-letter US postal state abbreviations (e.g. "fl" -> "FL", "ny" -> "NY")
 * - Leaves numeric zip codes untouched (e.g. "33602", "33602-1234")
 */
export function formatCityStateZip(s) {
  if (!s) return '';
  const cleaned = sanitizeStoredText(s);
  return cleaned.split(/(\s+)/).map((word) => {
    if (word.match(/\s/) || word === '') return word;
    if (/^\d+(-\d+)?$/.test(word)) return word;
    const match = word.match(/^([a-zA-Z]+)([^a-zA-Z]*)$/);
    if (match) {
      const [, alpha, trailingPunct] = match;
      const upper = alpha.toUpperCase();
      const title = alpha.charAt(0).toUpperCase() + alpha.slice(1).toLowerCase();
      if (TITLE_CASE_CITY_PREFIXES.has(title)) {
        return title + trailingPunct;
      }
      if (US_POSTAL_STATES.has(upper)) {
        return upper + trailingPunct;
      }
      if (/^[a-z]+$/.test(alpha)) {
        return title + trailingPunct;
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
/**
 * Splits a model path into lowercase word tokens across dot, underscore,
 * hyphen, digit and camelCase boundaries. `preparer.ssnEin` becomes
 * "preparer ssn ein".
 *
 * Kind inference used bare substring matching until Milestone 36-6, so the
 * path `committeeIncorporated` matched the needle 'ein' inside
 * "committ(ein)corporated" and a yes/no checkbox was classified as an SSN
 * field. finalizeFieldValue() then ran formatSSN('Yes'), which strips every
 * non-digit, and wrote the empty string back over the answer the same event
 * had just recorded. Matching whole words ends that class of collision
 * instead of patching the one needle that happened to collide.
 */
function pathTokens(rawPath) {
  return String(rawPath || '')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[^A-Za-z0-9]+/g, ' ')
    .toLowerCase()
    .trim();
}

/**
 * True when `needle` appears in `tokens` as a whole word. A trailing plural
 * 's' is tolerated so `guardianNames` still classifies as a name field.
 */
function hasPathWord(tokens, needle) {
  return new RegExp(`(?:^| )${needle}s?(?: |$)`).test(tokens);
}

export function getControlKind(control) {
  if (!control) return 'text';
  if (control.dataset?.fieldKind) return control.dataset.fieldKind;
  // A checkbox or radio carries a state, not text. Classifying it by path
  // could route it to a text formatter that has nothing meaningful to format.
  if (control.type === 'checkbox' || control.type === 'radio') return 'boolean';
  const tokens = pathTokens(getControlPath(control));
  const has = needle => hasPathWord(tokens, needle);
  const format = control.dataset?.formFormat || control.dataset?.annualFormat || '';
  if (format === 'case-number' || has('case number')) return 'identifier';
  if (format === 'account' || format === 'account-number' || has('account')) return 'identifier';
  if (format === 'check' || format === 'check-number' || has('check')) return 'identifier';
  if (format === 'bar-number' || has('bar number') || has('bar')) return 'identifier';
  if (format === 'name' || has('name')) return 'name';
  if (format === 'city-state-zip' || format === 'zip' || has('city state zip') || has('zip')) return 'zip';
  if (format === 'address' || has('address') || has('street')) return 'address';
  if (format === 'phone' || has('phone')) return 'phone';
  if (format === 'ssn' || has('ssn') || has('ein')) return 'ssn';
  if (format === 'decimal' || control.type === 'number') return 'money';
  if (control.type === 'date' || has('date')) return 'date';
  return 'text';
}

/**
 * Retrieves the formatter policy: 'preserve' | 'normalize' | 'display-only'.
 */
export function getControlPolicy(control) {
  if (control.dataset?.fieldFormatPolicy) return control.dataset.fieldFormatPolicy;
  const kind = getControlKind(control);
  if (kind === 'identifier' || kind === 'text' || kind === 'boolean') return 'preserve';
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
    // Only auto-format a complete eight-digit value. Seven digits can be a
    // legitimate in-progress paste/entry, so formatting it moves the caret
    // and used to make rapid entry unreliable.
    if (/^\d{8}$/.test(rawValue)) {
      const parsed = parseFlexibleDate(rawValue);
      if (parsed) {
        control.value = formatDisplayDate(parsed);
      }
    }
    // Keep a durable draft outside the canonical date field. This survives a
    // debounced save, navigation, and assistive-technology event timing
    // without allowing invalid text into generated artifacts.
    recordDateDraft({
      data: window.D,
      path,
      rawValue: control.value,
      label: control.dataset?.fieldLabel || '',
      section: control.dataset?.fieldSection || '',
      route: window.getCurrentPage?.() || window.location?.hash || '/',
    });
    if (window.autoSave) window.autoSave();
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
  const isRadio = control?.type === 'radio';
  let rawValue = isCheckbox
    ? (control.dataset?.formValue === 'yes-no' ? (control.checked ? 'Yes' : 'No') : control.checked)
    : (isRadio ? (control.checked ? control.value : (window.getPath ? window.getPath(window.D, path) : '')) : control.value);

  // A state control is written through untouched. No text formatter may run
  // against a checkbox or radio whatever kind the path happened to infer.
  if (isCheckbox || isRadio || kind === 'boolean') {
    if (window.setPath) window.setPath(window.D, path, rawValue);
  } else if (kind === 'date') {
    const parsed = parseFlexibleDate(rawValue);
    if (parsed === '') {
      // Empty date
      control.removeAttribute('aria-invalid');
      control.classList.remove('is-invalid');
      clearFieldDraft(path, window.D);
      if (window.setPath) window.setPath(window.D, path, '');
    } else if (parsed === null) {
      // Invalid date text: retain both the visible draft and the previously
      // committed canonical value. Clearing the model here caused a blurred
      // or rapidly-entered date to disappear before export.
      control.setAttribute('aria-invalid', 'true');
      control.classList.add('is-invalid');
      recordDateDraft({
        data: window.D,
        path,
        rawValue,
        label: control.dataset?.fieldLabel || '',
        section: control.dataset?.fieldSection || '',
        route: window.getCurrentPage?.() || window.location?.hash || '/',
      });
    } else {
      // Valid canonical date: update display & model
      control.removeAttribute('aria-invalid');
      control.classList.remove('is-invalid');
      control.value = formatDisplayDate(parsed);
      clearFieldDraft(path, window.D);
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
    const formatted = formatCityStateZip(rawValue);
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

/**
 * Commits every valid date draft currently mounted in the document. Invalid
 * drafts remain visible and become explicit export blockers; they never erase
 * a prior valid model value.
 */
export function commitPendingFieldValues(root = document) {
  root.querySelectorAll?.('[data-field-kind="date"]').forEach((control) => {
    // A programmatic state update can happen while an older rendered page is
    // still connected (imports and recovery do this). Only finalize controls
    // that actually received a user draft; otherwise a stale blank DOM value
    // could overwrite the newer canonical model value at navigation time.
    if (getFieldDraft(getControlPath(control), window.D)) finalizeFieldValue(control);
  });
  const committed = commitStoredDateDrafts(window.D, window.setPath);
  return { committed, issues: getFieldDraftIssues(window.D) };
}

export function getFieldDraftIssueMessages(data = window.D) {
  return formatDraftIssues(getFieldDraftIssues(data));
}

// Global exposure for legacy interop
if (typeof window !== 'undefined') {
  window.sanitizeStoredText = sanitizeStoredText;
  window.formatSafeTitleCase = formatSafeTitleCase;
  window.formatCityStateZip = formatCityStateZip;
  window.writeDraftValue = writeDraftValue;
  window.finalizeFieldValue = finalizeFieldValue;
  window.commitPendingFieldValues = commitPendingFieldValues;
  window.getFieldDraftIssueMessages = getFieldDraftIssueMessages;
}
