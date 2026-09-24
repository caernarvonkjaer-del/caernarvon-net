// Milestone 26: Canonical Form Field Rendering Engine
// Consolidates inpD, inpS, dateInput, and shared input generators across all 9 Florida probate form types.

import { formatDisplayDate } from './date-parser.js';

// Escapes &<>" but deliberately NOT the apostrophe, unlike
// core/filing/escape-html.js. Milestone 52E looked at merging the two and
// left this one alone on purpose: every one of its ~25 call sites is inside
// this file, building Tier 1 field-primitive HTML in which every attribute is
// double-quoted, so an unescaped apostrophe is not a syntactic hazard here.
// It is a real inconsistency in the abstract, not one causing any
// cross-module divergence today -- recorded so it stops reading as an
// oversight. Anything that starts single-quoting attributes, or any new
// external caller, must revisit this.
export function esc(s) {
  if (s === null || s === undefined) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const DEFAULT_LOCK_ICON = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>';

/**
 * Infers semantic field kind and format from label and input type.
 */
export function inferFieldKind(label = '', type = 'text') {
  const lbl = String(label || '').toLowerCase();
  const isEmail = lbl.includes('email');
  if (isEmail) return 'text';

  if (type === 'date' || /\bdate\b/i.test(lbl)) return 'date';
  if (lbl.includes('phone')) return 'phone';
  if (lbl.includes('ssn') || lbl.includes('ein') || lbl.includes('social security') || lbl.includes('taxpayer id') || /\btin\b/i.test(lbl)) return 'ssn';
  if (lbl.includes('case number') && !lbl.includes('related')) return 'caseNumber';
  if (lbl.includes('bar number')) return 'barNumber';
  if (lbl.includes('check #')) return 'checkNumber';
  if (!lbl.includes('bank name') && !lbl.includes('loan') && (lbl.includes('account number') || lbl.includes('account #') || lbl.includes('bank account'))) return 'accountNumber';
  if (lbl.includes('zip')) return 'zip';
  if (lbl.includes('street') || lbl.includes('address') || lbl.includes('city')) return 'address';
  if (!lbl.includes('account') && (
    lbl.includes('name') || lbl.includes('payer') || lbl.includes('payee') || lbl.includes('lender') ||
    lbl.includes('creditor') || lbl.includes('institution') || lbl.includes('guardian') || lbl.includes('attorney') ||
    lbl.includes('trustee') || lbl.includes('claimant') || lbl.includes('bonding') || lbl.includes('company') ||
    lbl.includes('trust')
  )) return 'name';
  if (type === 'number') return 'money';

  return 'text';
}

/**
 * Canonical form field renderer for text, date, amount, SSN, phone, address, etc.
 */
export function renderFormField({
  path = '',
  label = '',
  value = '',
  type = 'text',
  kind = null,
  policy = null,
  required = false,
  tooltipKey = null,
  className = 'form-control',
  hint = null,
  syncWardName = false,
  syncGuardianName = false,
  id = null,
  wrapperClass = 'mb-2',
  placeholder = null,
  // Milestone 41-3 (Guardian Inventory step): which write path this field
  // belongs to. Default 'form' keeps the existing behavior for all eight
  // other filing types -- data-form-path plus the data-annual-path alias.
  //
  // 'bind' emits `data-bind` INSTEAD, and deliberately suppresses both
  // data-form-path and data-annual-path. That suppression is the whole
  // point, not a detail: Guardian Inventory writes through bindForms()'s
  // own listeners, whose tail (afterChange) additionally repaints the live
  // inventory totals. A field carrying both attributes would be claimed by
  // bindForms() AND by form-events.js's document-level data-form-path
  // listener at once, double-writing on every keystroke. Direct precedent
  // for a per-caller binding switch: renderYesNoField()'s `binding`.
  binding = 'form',
  // Guardian Inventory's bindForms() switches on `data-input-type` for both
  // initial value formatting and on-input formatting, so a delegated field
  // must carry it verbatim or all of its formatting silently changes.
  inputType: bindInputType = null,
  // Milestone 41-3 (Guardian Inventory numeric fields): data-field-path is
  // what makes form-events.js's document-level listener notice a field at
  // all, independent of `binding` -- it is stamped unconditionally below.
  // For most 'bind' kinds that's a harmless no-op second write (bindForms()
  // and the shared writeDraftValue() both land on the same string), which is
  // exactly what textInput()'s 85 sites already ship. It is NOT harmless for
  // a money/decimal field: bindForms() stores a parsed Number
  // (setPath(...,parseFloat(val)||0)), while writeDraftValue() would compare
  // that Number against control.value, a String, with strict !== -- always
  // true -- and overwrite the correct Number with a String on every
  // keystroke. bindForms() only defers its own 'input' handling to the
  // shared listener for date-kind fields (its own dataset.fieldKind==='date'
  // check); every other kind, decimal included, writes directly and expects
  // to be the field's only writer. Set this false to omit data-field-path so
  // a 'bind' field of such a kind stays claimed by exactly one listener, as
  // it was before delegating to this renderer. focusFieldByPath()'s own
  // selector already tries data-bind as a fallback, so jump-to-field
  // navigation is unaffected.
  claimSharedWriteListener = true,
  // Annual Accounting only (its inpD() passes it): stamps
  // data-field-sanitize="security" on a plain free-text field so
  // finalizeFieldValue() runs legacy-app.js's validateSecurityInput() on
  // blur -- what that family's own retired focusout handler did with the
  // data-annual-format="security" this renderer stamps on every plain text
  // field of every filing type. An opt-in rather than keyed off that format
  // attribute, so the other eight filing types keep never running it.
  securitySanitize = false,
} = {}) {
  const inputId = id || `inp_${(path || 'field').replace(/[^a-zA-Z0-9_]/g, '_')}_${Math.random().toString(36).slice(2, 7)}`;
  const fieldKind = kind || inferFieldKind(label, type);

  const isPreserve = ['text', 'caseNumber', 'accountNumber', 'checkNumber', 'barNumber', 'ssn'].includes(fieldKind);
  const resolvedPolicy = policy || (isPreserve ? 'preserve' : (fieldKind === 'name' || fieldKind === 'address') ? 'display-only' : 'normalize');

  const isAmountField = type === 'number' || fieldKind === 'money';
  const isDate = fieldKind === 'date';
  const isSSN = fieldKind === 'ssn';
  const isPhone = fieldKind === 'phone';
  const isName = fieldKind === 'name';
  const isZip = fieldKind === 'zip';
  const isAddress = fieldKind === 'address';
  const isCaseNumber = fieldKind === 'caseNumber';
  const isBarNumber = fieldKind === 'barNumber';
  const isAccountNumber = fieldKind === 'accountNumber';
  const isCheckNumber = fieldKind === 'checkNumber';

  const format = isSSN ? 'ssn'
    : isCaseNumber ? 'case'
    : isBarNumber ? 'bar'
    : isAccountNumber ? 'account'
    : isCheckNumber ? 'check'
    : isAmountField ? 'decimal'
    : isPhone ? 'phone'
    : isName ? 'name'
    : isZip ? 'zip'
    : isAddress ? 'address'
    : type === 'text' ? 'security' : '';

  const isWardField = syncWardName || path === 'wardName';
  const isGuardField = syncGuardianName || /^guardian(Name|Names)?$/.test(path) || path === 'guardians.0.name' || path === 'guardian';

  let formatted = value ?? '';
  if (typeof window !== 'undefined') {
    if (isDate) {
      formatted = (window.getFieldDraftDisplay?.(path, formatDisplayDate(value)) || formatDisplayDate(value));
    } else if (isSSN && window.formatSSN) {
      formatted = window.formatSSN(value);
    } else if (isCaseNumber && window.formatCaseNumber) {
      formatted = window.formatCaseNumber(value);
    } else if (isBarNumber && window.formatBarNumber) {
      formatted = window.formatBarNumber(value);
    } else if (isAccountNumber && window.formatAccountNumber) {
      formatted = window.formatAccountNumber(value);
    } else if (isCheckNumber && window.formatCheckNumber) {
      formatted = window.formatCheckNumber(value);
    } else if (isPhone && window.formatPhone) {
      formatted = window.formatPhone(value);
    } else if (isName && window.formatName) {
      formatted = window.formatName(value);
    } else if (isZip && window.formatCityStateZip) {
      formatted = window.formatCityStateZip(value);
    } else if (isAddress && window.formatAddress) {
      formatted = window.formatAddress(value);
    }
  } else if (isDate) {
    formatted = formatDisplayDate(value) || value;
  }

  const cleanedValue = (isAmountField && typeof window !== 'undefined' && window.sanitizeNonNegativeDecimal)
    ? window.sanitizeNonNegativeDecimal(formatted)
    : formatted;

  // Guardian Inventory's numInput() has no label of its own (a separate
  // reqLabel()/optLabel() call renders it) -- it named a field's dollar-vs-
  // percent wrapping from its bind path's own "...Percent" suffix instead.
  // Checked here too so delegating it to this renderer doesn't lose that.
  const isPercentField = isAmountField && (label.includes('%') || label.toLowerCase().includes('percent') || /Percent$/i.test(path));
  const isDollarField = isAmountField && !isPercentField;

  const inputType = isAmountField ? 'text' : (isDate ? 'text' : type);
  const inputMode = isAmountField ? ' inputmode="decimal"' : (isDate ? ' inputmode="text"' : '');
  const actualPlaceholder = placeholder !== null
    ? ` placeholder="${esc(placeholder)}"`
    : (isDate ? ' placeholder="MM/DD/YYYY"' : '');

  const hintId = `${inputId}_hint`;
  const ariaDesc = (isDate || hint) ? ` aria-describedby="${hintId}"` : '';

  const classes = [className];
  if (isSSN) classes.push('ssn-masked');

  // See the `binding` option's own comment: 'bind' must emit data-bind and
  // suppress data-form-path/data-annual-path, or the field would be written
  // twice per keystroke by two different listeners.
  const isBindBinding = binding === 'bind';
  const bindingAttrs = isBindBinding
    ? ` data-bind="${esc(path)}"`
    : ` data-form-path="${esc(path)}" data-annual-path="${esc(path)}"`;
  const inputTypeAttr = bindInputType ? ` data-input-type="${esc(bindInputType)}"` : '';
  const sanitizeAttr = (securitySanitize && format === 'security') ? ' data-field-sanitize="security"' : '';

  const fieldPathAttr = claimSharedWriteListener ? ` data-field-path="${esc(path)}"` : '';
  const inputHtml = `<input type="${inputType}" class="${classes.join(' ')}" id="${inputId}" autocomplete="off"${inputMode}${actualPlaceholder} value="${esc(cleanedValue)}"${fieldPathAttr}${bindingAttrs} data-field-label="${esc(label)}" data-annual-label="${esc(label)}" data-field-kind="${fieldKind}" data-field-format-policy="${resolvedPolicy}"${required ? ' data-field-required="true"' : ''}${format ? ` data-annual-format="${format}" data-form-format="${format}"` : ''}${isWardField ? ' data-sync-ward-name="true"' : ''}${isGuardField ? ' data-sync-guardian-name="true"' : ''}${inputTypeAttr}${sanitizeAttr}${ariaDesc}>`;

  let lockIcon = DEFAULT_LOCK_ICON;
  if (typeof window !== 'undefined' && typeof window.ic === 'function') {
    lockIcon = window.ic('lock', 14);
  }

  const wrappedInput = isDollarField
    ? `<div class="input-group"><span class="input-group-text">$</span>${inputHtml}</div>`
    : isPercentField
      ? `<div class="input-group">${inputHtml}<span class="input-group-text">%</span></div>`
      : isSSN
        ? `<div class="ssn-mask-wrap">${inputHtml}<button type="button" class="ssn-reveal-btn" aria-label="Show ${esc(label)}" data-form-action="toggle-ssn">${lockIcon}</button></div>`
        : inputHtml;

  const hintText = hint || (isDate ? 'Use MM/DD/YYYY' : '');
  const hintHtml = hintText
    ? `<div id="${hintId}" class="form-text text-muted" style="font-size:0.75rem;margin-top:0.2rem;">${esc(hintText)}</div>`
    : '';

  const tooltipHtml = (tooltipKey && typeof window !== 'undefined' && typeof window.tooltip === 'function')
    ? window.tooltip(tooltipKey)
    : '';

  const reqMark = required ? '<span class="req">*</span>' : '';
  const labelHtml = label ? `<label class="form-label" for="${inputId}">${esc(label)}${tooltipHtml}${reqMark}</label>` : '';

  return `<div class="${wrapperClass}">${labelHtml}${wrappedInput}${hintHtml}</div>`;
}

/**
 * Standard select dropdown renderer.
 */
export function renderSelectField({
  path = '',
  label = '',
  value = '',
  options = [],
  required = false,
  id = null,
  wrapperClass = 'mb-2',
  className = 'form-select',
  placeholder = '— select —',
} = {}) {
  const selectId = id || `sel_${(path || 'select').replace(/[^a-zA-Z0-9_]/g, '_')}_${Math.random().toString(36).slice(2, 7)}`;
  const reqMark = required ? '<span class="req">*</span>' : '';
  const labelHtml = label ? `<label class="form-label" for="${selectId}">${esc(label)}${reqMark}</label>` : '';

  const optionsHtml = options.map((opt) => {
    const optVal = typeof opt === 'object' ? opt.value : opt;
    const optLabel = typeof opt === 'object' ? opt.label : opt;
    const selected = String(value) === String(optVal) ? ' selected' : '';
    return `<option value="${esc(optVal)}"${selected}>${esc(optLabel)}</option>`;
  }).join('');

  return `<div class="${wrapperClass}">${labelHtml}<select class="${className}" id="${selectId}" data-field-path="${esc(path)}" data-form-path="${esc(path)}" data-annual-path="${esc(path)}"${required ? ' data-field-required="true"' : ''}><option value="">${esc(placeholder)}</option>${optionsHtml}</select></div>`;
}

/**
 * Standard textarea renderer.
 */
export function renderTextareaField({
  path = '',
  label = '',
  value = '',
  rows = 4,
  required = false,
  id = null,
  hint = '',
  wrapperClass = 'mb-3',
  className = 'form-control',
} = {}) {
  const textareaId = id || `txt_${(path || 'text').replace(/[^a-zA-Z0-9_]/g, '_')}_${Math.random().toString(36).slice(2, 7)}`;
  const reqMark = required ? '<span class="req">*</span>' : '';
  const labelHtml = label ? `<label class="form-label" for="${textareaId}">${esc(label)}${reqMark}</label>` : '';
  const hintHtml = hint ? `<div class="plan-field-hint">${esc(hint)}</div>` : '';

  return `<div class="${wrapperClass}">
    ${labelHtml}
    ${hintHtml}
    <textarea class="${className}" id="${textareaId}" rows="${rows}" data-field-path="${esc(path)}" data-form-path="${esc(path)}" data-annual-path="${esc(path)}" data-field-kind="text" data-field-format-policy="preserve" data-field-label="${esc(label)}"${required ? ' data-field-required="true"' : ''}>${esc(value || '')}</textarea>
  </div>`;
}

/**
 * Tri-state Yes/No radio pair, wrapped in a semantic fieldset/legend.
 * Milestone 41-1: ported verbatim from legacy-app.js's yesNoRadioHTML() --
 * the canonical binary-answer control, already fieldset/legend-compliant
 * and already supporting both the `data-form-path` and `data-annual-path`
 * binding conventions via `binding`. yesNoRadioHTML() itself now delegates
 * here (mirroring inpS()'s proven delegation to renderFormField()), so its
 * three thin wrappers -- yesNoCheckboxS(), yesNoCheckboxD(), and
 * yesNoRadioAnnualHTML() -- gain Tier 1 rendering for free without their
 * own edits: an audit of their bodies found neither yesNoCheckboxS() nor
 * yesNoCheckboxD() is actually a checkbox despite the name -- both already
 * call yesNoRadioHTML() directly, identically to yesNoRadioAnnualHTML().
 */
export function renderYesNoField({
  path = '',
  label = '',
  value = '',
  id = null,
  required = false,
  route = '',
  binding = 'form',
  tooltipKey = '',
} = {}) {
  const safeId = String(id || path || 'yes_no').replace(/[^A-Za-z0-9_-]/g, '_');
  const groupId = `yesno_${safeId}`;
  const pathAttr = binding === 'annual' ? 'data-annual-path' : 'data-form-path';
  const routeAttr = route ? ` data-form-route="${esc(route)}"` : '';
  const tooltipHtml = (tooltipKey && typeof window !== 'undefined' && typeof window.tooltip === 'function')
    ? window.tooltip(tooltipKey)
    : '';
  const reqMark = required ? '<span class="req">*</span>' : '';
  return `<fieldset class="plan-yes-no mb-2" data-yes-no-group="${esc(path)}">
    <legend class="form-label mb-1">${esc(label)}${tooltipHtml}${reqMark}</legend>
    <div class="plan-radio-row">
      <div class="form-check form-check-inline"><input class="form-check-input" type="radio" name="${groupId}" id="${groupId}_yes" value="Yes" ${value === 'Yes' ? 'checked' : ''} ${pathAttr}="${esc(path)}" data-form-value="yes-no"${routeAttr}><label class="form-check-label" for="${groupId}_yes">Yes</label></div>
      <div class="form-check form-check-inline"><input class="form-check-input" type="radio" name="${groupId}" id="${groupId}_no" value="No" ${value === 'No' ? 'checked' : ''} ${pathAttr}="${esc(path)}" data-form-value="yes-no"${routeAttr}><label class="form-check-label" for="${groupId}_no">No</label></div>
    </div>
  </fieldset>`;
}

/**
 * Generic N-option radio group, wrapped in a semantic fieldset/legend.
 * Milestone 41-1: ported from legacy-app.js's radioP(), which had no
 * fieldset/legend at all (AGENTS.md's radio-pair rule was true for
 * yesNoRadioHTML() but false for radioP()'s 7 call sites) -- this closes
 * that gap as a side effect of the delegation, not a separate task. Used
 * for the plain Yes/No case and for non-binary option sets (e.g. Plan
 * Minor's 3-way visit-frequency question), which is why options is a
 * parameter rather than hardcoded.
 */
export function renderRadioGroupField({
  path = '',
  label = '',
  value = '',
  options = ['Yes', 'No'],
  required = false,
  hint = '',
  id = null,
  route = '',
} = {}) {
  const groupId = id || path;
  const name = `radio_${groupId}`;
  const reqMark = required ? '<span class="req">*</span>' : '';
  const hintHtml = hint ? `<div class="plan-field-hint">${hint}</div>` : '';
  // Milestone 67F: a radio whose answer reveals another field (Initial Plan
  // Q2/Q4/Q5's "Other" explanation boxes) needs the page re-rendered on
  // change, and src/form-events.js re-renders only when the control carries
  // data-form-route -- the same attribute renderYesNoField() already emits.
  // Left empty, nothing changes: a route costs the filer their scroll
  // position, so only reveal-gating call sites pass one.
  const routeAttr = route ? ` data-form-route="${esc(route)}"` : '';
  // Milestone 67B: an option may be a plain string (stored as shown) or a
  // { value, label } pair, for a question whose stored value is a code
  // ('bond-waived') and whose label is the sentence the filer reads.
  const btns = options.map((o, i) => {
    const optValue = o && typeof o === 'object' ? o.value : o;
    const optLabel = o && typeof o === 'object' ? o.label : o;
    return `
    <div class="form-check form-check-inline">
      <input class="form-check-input" type="radio" name="${name}" id="${groupId}_${i}" value="${esc(optValue)}" ${value === optValue ? 'checked' : ''} data-form-path="${esc(path)}"${routeAttr}>
      <label class="form-check-label" for="${groupId}_${i}">${esc(optLabel)}</label>
    </div>`;
  }).join('');
  return `<fieldset class="mb-3">
    <legend class="form-label">${label}${reqMark}</legend>
    ${hintHtml}
    <div class="plan-radio-row">${btns}</div>
  </fieldset>`;
}

/**
 * Standalone boolean checkbox (not a tri-state Yes/No radio pair).
 * Milestone 41-1: ported verbatim from legacy-app.js's chkP() -- the audit
 * above confirmed this is the only genuine checkbox among the three
 * candidates named in the milestone proposal (yesNoCheckboxS()/
 * yesNoCheckboxD() are both yesNoRadioHTML() wrappers, not checkboxes).
 */
export function renderCheckboxField({
  path = '',
  label = '',
  checked = false,
  id = null,
  route = '',
  exclusiveGroup = '',
  exclusiveRole = '',
} = {}) {
  const checkboxId = id || path;
  // Milestone 67F: same contract as renderRadioGroupField() above. Before
  // this, a checkbox that gates a reveal (Annual Plan Q11's "NO
  // remuneration", every "Other (explain)" box) could not ask for one, so
  // the field it revealed appeared only after the filer left the page and
  // came back -- and on Q11 the name they typed meanwhile landed in the
  // other branch's box.
  const routeAttr = route ? ` data-form-route="${esc(route)}"` : '';
  // Milestone 68E: a list whose options include "None" marks every box with
  // its group and the None box with role "none"; form-events.js keeps them
  // mutually exclusive on the click (core/form/exclusive-none.js).
  const exclusiveAttrs = exclusiveGroup ? ` data-exclusive-group="${esc(exclusiveGroup)}" data-exclusive-role="${esc(exclusiveRole || 'member')}"` : '';
  return `<div class="form-check plan-check">
    <input class="form-check-input" type="checkbox" id="${checkboxId}" ${checked ? 'checked' : ''} data-form-path="${esc(path)}" data-form-value="boolean"${routeAttr}${exclusiveAttrs}>
    <label class="form-check-label" for="${checkboxId}">${label}</label>
  </div>`;
}

if (typeof window !== 'undefined') {
  window.renderFormField = renderFormField;
  window.renderSelectField = renderSelectField;
  window.renderTextareaField = renderTextareaField;
  window.renderYesNoField = renderYesNoField;
  window.renderRadioGroupField = renderRadioGroupField;
  window.renderCheckboxField = renderCheckboxField;
}
