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

// Milestone 40C-H: "did the filer actually answer Yes?" -- the one predicate
// for gating a conditional requirement on a Yes/No question.
//
// Needed because these values are not booleans. Tri-state questions store the
// canonical strings 'Yes'/'No' (Milestone 37-5) while legacy wards still hold
// real booleans, and a plain truthiness test on the non-empty string 'No' is
// TRUE. That is exactly how Plan Initial's Question 7 came to demand an
// explanation from a filer who had answered No to everything, blocking an
// otherwise complete filing. Unanswered stays unanswered -- this never coerces
// a blank to No.
export function isAffirmative(value) {
  return yesNoText(value, '') === 'Yes';
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

// Milestone 40H-G: standard title-case convention -- these stay lowercase
// mid-phrase (but still capitalize as the first word, since a sentence/name
// never opens on a connective). Without this list, formatSafeTitleCase()
// capitalized every purely-lowercase word with no exception, turning
// "Sunrise Assisted Living of Clearwater" into "...Living Of Clearwater" --
// contradicting this function's own docstring promise to leave names
// untouched, which it kept for surnames but never extended to connecting
// words in longer phrases.
const TITLE_CASE_STOP_WORDS = new Set(['of', 'and', 'the', 'a', 'an', 'for', 'in', 'on', 'at', 'to', 'by']);

/**
 * Safe title-casing formatter for Names and Street Addresses.
 * Converts only purely lowercase words to title-case.
 * Leaves all-caps acronyms (e.g. "SSI", "USAA", "LLC") and mixed-case names (e.g. "McLeod", "O'Connor") 100% untouched.
 * Does NOT uppercase 2-letter words (e.g. "Dr." stays "Dr.", "St." stays "St.", "Ed" stays "Ed").
 * Minor connecting words (of/and/the/...) stay lowercase mid-phrase, standard title-case style, but still
 * capitalize as the first word.
 */
export function formatSafeTitleCase(s) {
  if (!s) return '';
  const cleaned = sanitizeStoredText(s);
  let sawFirstWord = false;
  return cleaned.split(/(\s+)/).map((word) => {
    if (word.match(/\s/) || word === '') return word;
    const isFirstWord = !sawFirstWord;
    sawFirstWord = true;
    const match = word.match(/^([a-zA-Z]+)([^a-zA-Z]*)$/);
    if (match) {
      const [, alpha, trailingPunct] = match;
      // Purely lowercase word capitalizes, unless it's a minor connecting
      // word appearing after the first word.
      if (/^[a-z]+$/.test(alpha)) {
        if (!isFirstWord && TITLE_CASE_STOP_WORDS.has(alpha)) return word;
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
  if (format === 'signed-decimal') return 'signed-money';
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
  if (kind === 'date' || kind === 'money' || kind === 'signed-money' || kind === 'phone' || kind === 'ssn' || kind === 'percent') return 'normalize';
  if (kind === 'name' || kind === 'address') return 'display-only';
  return 'preserve';
}

/**
 * Milestone 42D: the one post-write tail for every filing type.
 *
 * Two write paths remain. data-form-path and data-annual-path both arrive
 * here through writeDraftValue()/finalizeFieldValue() -- Simplified
 * Accounting, the four Plans, and, since Annual/Final/Trust's own
 * persistAnnualControl() was retired, the accounting family too (that
 * retirement is why getControlKind()/finalizeFieldValue() below know the
 * signed-decimal, security-sanitize and ZIP-limit formats that path had
 * kept to itself). data-bind still writes via legacy-app.js's
 * bindForms()/afterChange() (Guardian Inventory). What every path had in
 * common was this exact list of side effects, once copied three times and
 * drifting (40C-A had to add maybeCommitCoverCounty() to each one
 * separately). Every path calls this instead, so a new post-write hook is
 * added once.
 *
 * Order: the ward-county and Party write-throughs mutate the model, so they
 * run before autoSave() queues the snapshot; the display refreshes follow.
 * County goes through commitCoverCounty(), never syncIdentityField()'s
 * fan-out -- that would rewrite sibling filings correctly filed elsewhere.
 * Name sync honours the control's data-sync-* flags (form-fields.js) and,
 * for the flag-less legacy data-bind path, the path itself.
 *
 * The closing `pg:field-written` event is how a mounted feature adds its own
 * per-write refresh without this file naming it: Annual Accounting's
 * refreshAnnualTotals() subscribes in its bindEvents() (AbortController-
 * scoped, so it cannot outlive the page), where persistAnnualControl() used
 * to call it directly. That function is never published as a global, so
 * nothing dangles after dispose -- the bug class 40F/40H-A/43G kept finding.
 */
export function runFieldWriteSideEffects(path, control = null) {
  if (!path) return;
  window.markFilingRevisionChanged?.('field-write');
  window.maybeCommitCoverCounty?.(path);
  const identitySlot = window.identitySlotForPath?.(window.D, path);
  if (identitySlot && window.syncIdentityField) window.syncIdentityField(window.D, identitySlot.role, identitySlot.index);
  window.autoSave?.();
  window.updateNavDots?.();
  window.refreshWardInfoCard?.();
  const dataset = control?.dataset || {};
  if (dataset.syncWardName || path === 'wardName') window.syncActiveWardNameDisplay?.();
  if (dataset.syncGuardianName || path === 'guardianName' || path === 'guardians.0.name') window.syncGuardianNameDisplay?.();
  if (typeof CustomEvent === 'function') window.dispatchEvent?.(new CustomEvent('pg:field-written', { detail: { path } }));
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
  let rawValue = isCheckbox
    ? (control.dataset?.formValue === 'yes-no' ? (control.checked ? 'Yes' : 'No') : control.checked)
    : control.value;

  if ((kind === 'money' || kind === 'signed-money') && !isCheckbox) {
    // Live character filtering only -- the caret-safe kind of formatting (a
    // rejected keystroke, like maxlength), never a rewrite. Both legacy write
    // paths did this for amounts, and the live schedule totals read the model
    // on every keystroke, so a typed "1,000" must not sit there as 1 until
    // blur. Phone/SSN stay blur-only: those formatters insert punctuation and
    // move the caret, which Milestone 24 ruled out here on purpose.
    const filter = kind === 'signed-money' ? window.sanitizeDecimal : window.sanitizeNonNegativeDecimal;
    if (filter) {
      const filtered = filter(rawValue);
      if (control.value !== filtered) control.value = filtered;
      rawValue = filtered;
    }
  }

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
    runFieldWriteSideEffects(path, control);
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
    // applyZipLimit() caps the field at nine digits (ZIP+4) in place before
    // formatting -- both legacy write paths did; this one had skipped it.
    if (window.applyZipLimit) {
      window.applyZipLimit(control);
      rawValue = control.value;
    }
    const formatted = formatCityStateZip(rawValue);
    control.value = formatted;
    if (window.setPath) window.setPath(window.D, path, formatted);
  } else if (kind === 'phone' && window.formatPhone) {
    const formatted = window.formatPhone(rawValue);
    control.value = formatted;
    if (window.setPath) window.setPath(window.D, path, formatted);
  } else if (kind === 'ssn' && window.formatSSN) {
    // Above the generic preserve branch on purpose: renderFormField() stamps
    // SSN/EIN fields data-field-format-policy="preserve" (identifier-like,
    // so sanitizeStoredText() semantics), which used to catch them first and
    // left this branch unreachable for every renderer-built SSN field -- a
    // value typed as 123456789 stayed that way until the next render, where
    // the same renderer already applies formatSSN(). Blur now matches
    // render, and Annual/Final/Trust keep the dash insertion their retired
    // persistAnnualControl() gave them (there per keystroke; here on blur,
    // the two-phase contract's rule for caret-moving formatters).
    const formatted = window.formatSSN(rawValue);
    control.value = formatted;
    if (window.setPath) window.setPath(window.D, path, formatted);
  } else if (policy === 'preserve') {
    // data-field-sanitize="security" (renderFormField()'s securitySanitize
    // option -- Annual Accounting's inpD() is its only caller) runs
    // legacy-app.js's validateSecurityInput() first: exactly what the
    // accounting family's own focusout handler did before it was retired,
    // and only for those fields -- no other filing type's free text was ever
    // sanitized this way, and still isn't. Note it blanks a field outright
    // on a heuristic match (a description beginning "Update ..." trips its
    // SQL-keyword check); carried over unchanged, not endorsed.
    const secured = (control.dataset?.fieldSanitize === 'security' && window.validateSecurityInput)
      ? window.validateSecurityInput(control.dataset.fieldLabel || control.dataset.annualLabel || path, rawValue)
      : rawValue;
    const cleaned = sanitizeStoredText(secured);
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
  } else if (kind === 'signed-money' && window.sanitizeDecimal) {
    // "Enter as negative" amounts (Annual Schedule C losses, Schedule E
    // transfers out): the one money kind that keeps a leading minus.
    const cleaned = window.sanitizeDecimal(rawValue);
    control.value = cleaned;
    if (window.setPath) window.setPath(window.D, path, parseFloat(cleaned) || 0);
  }

  runFieldWriteSideEffects(path, control);
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
  window.runFieldWriteSideEffects = runFieldWriteSideEffects;
  window.commitPendingFieldValues = commitPendingFieldValues;
  window.getFieldDraftIssueMessages = getFieldDraftIssueMessages;
}
