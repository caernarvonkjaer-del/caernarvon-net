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
import { validateSecurityInput } from '../security/input-hardening.js';

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

export const CITY_STATE_ZIP_WARNING = "Couldn't separate city, state, and ZIP — please check this entry.";

/**
 * Milestone 50C: flags a city/state/zip entry that glues a state/zip run
 * directly onto letters with no separating space (e.g.
 * "St.Petersburg,FL33704"). formatCityStateZip()'s per-word regex has no
 * boundary to work with in that shape, so it leaves the token untouched
 * rather than guess -- title-casing and state-uppercasing silently never
 * apply. Deliberately narrow (a letter immediately followed by 4+ digits):
 * broader "the regex didn't match" detection would also catch legitimate
 * punctuation-only words like "O'Brien" or "Winter-Haven", which the
 * formatter already leaves alone on purpose.
 */
export function isMalformedCityStateZip(s) {
  return /[A-Za-z]\d{4,}/.test(String(s || ''));
}

/**
 * Toggles the Bootstrap is-invalid/invalid-feedback pair that flags a
 * malformed city/state/zip entry, per Milestone 50C's decision: flag the
 * filer, don't silently repair (too risky against the interior-capital
 * guard above) and don't stay silent (the original, superseded behavior).
 * Reuses is-invalid the same way the date branch below already does; unlike
 * that branch, this one also renders a message, since a border-color-only
 * cue was judged too easy to miss for a court-filing accuracy issue.
 * Bootstrap's own `.is-invalid ~ .invalid-feedback` rule (lib/bootstrap.min.css)
 * shows/hides the message with no new stylesheet. The DOM-insertion half is
 * guarded off in the unit-test harness (a plain mock object, no `document`),
 * where the is-invalid/aria-invalid signal alone still applies.
 */
export function setCityStateZipFeedback(control, show) {
  if (!control) return;
  if (show) {
    control.classList.add('is-invalid');
    control.setAttribute('aria-invalid', 'true');
  } else {
    control.classList.remove('is-invalid');
    control.removeAttribute('aria-invalid');
  }
  if (typeof control.insertAdjacentElement !== 'function') return;
  let feedback = control.nextElementSibling;
  if (!(feedback && feedback.dataset && feedback.dataset.cszFeedback === 'true')) feedback = null;
  if (show) {
    if (!feedback) {
      feedback = document.createElement('div');
      feedback.className = 'invalid-feedback';
      feedback.dataset.cszFeedback = 'true';
      feedback.textContent = CITY_STATE_ZIP_WARNING;
      control.insertAdjacentElement('afterend', feedback);
    }
    if (!feedback.id) feedback.id = `csz_feedback_${Math.random().toString(36).slice(2, 9)}`;
    control.setAttribute('aria-describedby', feedback.id);
  } else if (feedback) {
    if (control.getAttribute('aria-describedby') === feedback.id) control.removeAttribute('aria-describedby');
    feedback.remove();
  }
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
  // Milestone 58A: the fourth argument is what stops one edit from promoting
  // its stale neighbours into the shared Party record.
  if (identitySlot && window.syncIdentityField) window.syncIdentityField(window.D, identitySlot.role, identitySlot.index, identitySlot.fieldKeys);
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
    const filter = kind === 'signed-money' ? sanitizeDecimal : sanitizeNonNegativeDecimal;
    const filtered = filter(rawValue);
    if (control.value !== filtered) control.value = filtered;
    rawValue = filtered;
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
    const formatted = finalizeCaseNumber(rawValue);
    control.value = formatted;
    if (window.setPath) window.setPath(window.D, path, formatted);
  } else if (kind === 'barNumber' || control.dataset?.formFormat === 'bar-number' || control.dataset?.annualFormat === 'bar') {
    const formatted = formatBarNumber(rawValue);
    control.value = formatted;
    if (window.setPath) window.setPath(window.D, path, formatted);
  } else if (kind === 'zip' || control.dataset?.formFormat === 'city-state-zip' || control.dataset?.annualFormat === 'zip') {
    // applyZipLimit() caps the field at nine digits (ZIP+4) in place before
    // formatting -- both legacy write paths did; this one had skipped it.
    applyZipLimit(control);
    rawValue = control.value;
    const formatted = formatCityStateZip(rawValue);
    control.value = formatted;
    if (window.setPath) window.setPath(window.D, path, formatted);
    setCityStateZipFeedback(control, isMalformedCityStateZip(formatted));
  } else if (kind === 'phone') {
    const formatted = formatPhone(rawValue);
    control.value = formatted;
    if (window.setPath) window.setPath(window.D, path, formatted);
  } else if (kind === 'ssn') {
    // Above the generic preserve branch on purpose: renderFormField() stamps
    // SSN/EIN fields data-field-format-policy="preserve" (identifier-like,
    // so sanitizeStoredText() semantics), which used to catch them first and
    // left this branch unreachable for every renderer-built SSN field -- a
    // value typed as 123456789 stayed that way until the next render, where
    // the same renderer already applies formatSSN(). Blur now matches
    // render, and Annual/Final/Trust keep the dash insertion their retired
    // persistAnnualControl() gave them (there per keystroke; here on blur,
    // the two-phase contract's rule for caret-moving formatters).
    const formatted = formatSSN(rawValue);
    control.value = formatted;
    if (window.setPath) window.setPath(window.D, path, formatted);
  } else if (policy === 'preserve') {
    // data-field-sanitize="security" (renderFormField()'s securitySanitize
    // option -- Annual Accounting's inpD() is its only caller) runs
    // validateSecurityInput() (src/core/security/input-hardening.js) first: exactly what the
    // accounting family's own focusout handler did before it was retired,
    // and only for those fields -- no other filing type's free text was ever
    // sanitized this way, and still isn't. It used to also blank a field
    // outright on a bare SQL-keyword match ("Update to appraisal value"
    // silently wiped on blur) -- that check was removed at the source
    // (the monolith's detectSQLInjection()) since this app has no SQL
    // backend for it to ever protect; only real XSS/path-traversal patterns
    // can still trigger a block here.
    const secured = control.dataset?.fieldSanitize === 'security'
      ? validateSecurityInput(control.dataset.fieldLabel || control.dataset.annualLabel || path, rawValue)
      : rawValue;
    const cleaned = sanitizeStoredText(secured);
    if (window.setPath) window.setPath(window.D, path, cleaned);
    control.value = cleaned;
  } else if (kind === 'name' || kind === 'address' || policy === 'display-only') {
    const formatted = formatSafeTitleCase(rawValue);
    control.value = formatted;
    if (window.setPath) window.setPath(window.D, path, formatted);
  } else if (kind === 'money') {
    const cleaned = sanitizeNonNegativeDecimal(rawValue);
    control.value = cleaned;
    if (window.setPath) window.setPath(window.D, path, parseFloat(cleaned) || 0);
  } else if (kind === 'signed-money') {
    // "Enter as negative" amounts (Annual Schedule C losses, Schedule E
    // transfers out): the one money kind that keeps a leading minus.
    const cleaned = sanitizeDecimal(rawValue);
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
// ── Field formatters and filters ─────────────────────────────
// Moved from src/legacy-app.js by Milestone 70's 70B: the typing- and
// blur-time formatting every field kind gets, beside the stored-text rules
// above that they build on. validateSecurityInput() lives with the other
// injection checks in src/core/security/input-hardening.js.

// Strip everything except digits and a single decimal point — used for
// amount/percent fields instead of type="number" so we fully own character
// filtering (native number inputs allow '-' inconsistently across WebView
// versions, and their spinner buttons don't fire keydown so keydown-based
// minus-blocking can't catch them).
export function sanitizeNonNegativeDecimal(s){
  let v=String(s||'').replace(/[^0-9.]/g,'');
  const firstDot=v.indexOf('.');
  if(firstDot!==-1){
    v=v.slice(0,firstDot+1)+v.slice(firstDot+1).replace(/\./g,'');
  }
  return v;
}

// Same as sanitizeNonNegativeDecimal but keeps a single leading '-' -- for
// the couple of fields (Annual Schedule C's Loss/Reduction, Schedule E's
// Transfer Out Amt) that are explicitly entered as negative. Those used to
// be native type="number" instead, which is exactly the pattern the
// comment above sanitizeNonNegativeDecimal explains this app moved away
// from app-wide (inconsistent '-' handling and no keydown events from the
// spinner buttons across WebView versions) -- these two were simply never
// migrated when the rest of the app was.
export function sanitizeDecimal(s){
  const str=String(s||'');
  const neg=str.trim().startsWith('-');
  const digits=sanitizeNonNegativeDecimal(str);
  // Keep a lone '-' even before any digits are typed (a valid, if
  // incomplete, intermediate state) -- requiring digits first would wipe
  // the sign the instant it's typed, before the digits that are supposed
  // to follow it exist yet.
  return neg?'-'+digits:digits;
}

// Format phone as (123) 456-7890 — accepts only digits, pads/truncates to 10
export function formatPhone(s){
  const digits=String(s||'').replace(/\D/g,'').slice(0,10);
  if(digits.length===0)return '';
  if(digits.length<=3)return `(${digits}`;
  if(digits.length<=6)return `(${digits.slice(0,3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0,3)}) ${digits.slice(3,6)}-${digits.slice(6)}`;
}

// Format SSN/EIN as XXX-XX-XXXX — accepts only digits, pads/truncates to 9
export function formatSSN(s){
  const digits=String(s||'').replace(/\D/g,'').slice(0,9);
  if(digits.length===0)return '';
  if(digits.length<=3)return digits;
  if(digits.length<=5)return `${digits.slice(0,3)}-${digits.slice(3)}`;
  return `${digits.slice(0,3)}-${digits.slice(3,5)}-${digits.slice(5)}`;
}

// Case Number format is YY-######-GD: a 2-digit year, a sequentially
// issued 6-digit case number, and "GD" for Guardianship -- the only case
// type this app produces, so it's never something the guardian types
// themselves. Typing-time only inserts the dash after the year and caps
// input at 8 digits (2 + 6); it deliberately does NOT pad the sequence or
// append "-GD" here, so the field doesn't jump to "12-000000-GD" while
// the guardian is still in the middle of typing the sequence. That
// happens once in finalizeCaseNumber() below, on blur.
export function formatCaseNumber(s){
  if(!s)return '';
  const raw=String(s).trim();
  const suffixMatch=raw.match(/[-_\s]?([A-Za-z]{1,4})$/);
  const suffix=suffixMatch?suffixMatch[1]:'';
  const withoutSuffix=suffixMatch?raw.slice(0,suffixMatch.index):raw;
  let digits=withoutSuffix.replace(/\D/g,'');
  if(digits.length>=8&&digits.startsWith('20')){
    digits=digits.slice(2);
  }
  digits=digits.slice(0,8);
  if(digits.length<=2){
    return suffix ? `${digits}-${suffix}` : digits;
  }
  const formattedDigits=`${digits.slice(0,2)}-${digits.slice(2)}`;
  return suffix ? `${formattedDigits}-${suffix}` : formattedDigits;
}

// Blur-time finalization: left-pads the sequence to 6 digits and appends
// the fixed "-GD" suffix, so "3-14-GD" from a guardian who typed "3145"
// becomes the properly formed "03-000145-GD". Only a bare year (0-2
// digits, nothing typed for the sequence yet) is left alone -- forcing a
// dangling "03--GD" onto a case number with no sequence at all would be
// worse than just leaving it incomplete for the required-field check to
// catch.
export function finalizeCaseNumber(s){
  if(!s)return '';
  const raw=String(s).trim();
  if(!raw)return '';
  const suffixMatch=raw.match(/[-_\s]?([A-Za-z]{2,4})$/);
  const suffix=suffixMatch?suffixMatch[1].toUpperCase():'GD';
  const withoutSuffix=suffixMatch?raw.slice(0,suffixMatch.index):raw;
  let digits=withoutSuffix.replace(/\D/g,'');
  if(!digits)return raw;
  if(digits.length>=8&&digits.startsWith('20')){
    digits=digits.slice(2);
  }
  if(digits.length<=2)return digits;
  const year=digits.slice(0,2);
  const seq=digits.slice(2,8).padStart(6,'0');
  return `${year}-${seq}-${suffix}`;
}

// Format Florida Bar Number — a fixed-width, digits-only identifier. Bar numbers
// are sequential; retain all eight significant positions and normalize shorter
// values with leading zeroes when editing finishes.
export function formatBarNumber(s){
  const digits=String(s??'').replace(/\D/g,'').slice(0,8);
  return digits?digits.padStart(8,'0'):'';
}

// Format bank account number — preserved identifier (may contain letters/dashes/slashes)
export function formatAccountNumber(s){
  return sanitizeStoredText(s);
}

// Format check number — preserved identifier (may contain letters/dashes, e.g. CHK-104A)
export function formatCheckNumber(s){
  return sanitizeStoredText(s);
}

// Format Name & Address — safe title case on blur, preserving acronyms and mixed case
export function formatName(s){
  return formatSafeTitleCase(s);
}

// Same as formatName for addresses/streets
export function formatAddress(s){
  return formatName(s);
}

// Excel imports can carry all-lowercase (or all-caps) text. Walk the parsed
// data and apply the exact same per-field capitalization that manual typing
// already gets (see inpD/inpS/bindForms), keyed off the field name instead
// of a form label, so imported values match what typing them would produce.
export function capitalizeImportedFields(obj){
  if(Array.isArray(obj)){
    obj.forEach(capitalizeImportedFields);
    return obj;
  }
  if(obj&&typeof obj==='object'){
    for(const k of Object.keys(obj)){
      const v=obj[k];
      if(typeof v!=='string'||!v){continue;}
      const kl=k.toLowerCase();
      if(kl.includes('email')){
        // leave as-is
      }else if(kl.includes('citystatezip')){
        obj[k]=formatCityStateZip(v);
      }else if(kl.includes('street')||(kl.includes('address'))){
        obj[k]=formatAddress(v);
      }else if(['name','payer','payee','lender','creditor','institution','guardian','attorney','trustee','claimant','description','bonding','company','trust'].some(w=>kl.includes(w))){
        obj[k]=formatName(v);
      }
    }
    for(const k of Object.keys(obj)){
      if(obj[k]&&typeof obj[k]==='object')capitalizeImportedFields(obj[k]);
    }
  }
  return obj;
}

// Limit digits in a City/State/Zip field to 9 (a 5-digit ZIP, or a full
// ZIP+4) -- was capped at 5, which silently mangled any ZIP+4 entry
// ("33756-4321" loses its last 4 digits mid-keystroke instead of just
// rejecting the extra ones cleanly).
export function applyZipLimit(el){
  const digitCount=(el.value.match(/\d/g)||[]).length;
  if(digitCount>9){
    const arr=el.value.split('');
    let removed=0;
    for(let i=arr.length-1;i>=0&&removed<digitCount-9;i--){
      if(/\d/.test(arr[i])){arr.splice(i,1);removed++;}
    }
    el.value=arr.join('');
  }
}

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
