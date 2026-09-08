// Milestone 26: Canonical Form Field Rendering Engine
// Consolidates inpD, inpS, dateInput, and shared input generators across all 9 Florida probate form types.

import { formatDisplayDate } from './date-parser.js';

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

  const isPercentField = isAmountField && (label.includes('%') || label.toLowerCase().includes('percent'));
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

  const inputHtml = `<input type="${inputType}" class="${classes.join(' ')}" id="${inputId}" autocomplete="off"${inputMode}${actualPlaceholder} value="${esc(cleanedValue)}" data-field-path="${esc(path)}" data-form-path="${esc(path)}" data-annual-path="${esc(path)}" data-field-label="${esc(label)}" data-annual-label="${esc(label)}" data-field-kind="${fieldKind}" data-field-format-policy="${resolvedPolicy}"${required ? ' data-field-required="true"' : ''}${format ? ` data-annual-format="${format}" data-form-format="${format}"` : ''}${isWardField ? ' data-sync-ward-name="true"' : ''}${isGuardField ? ' data-sync-guardian-name="true"' : ''}${ariaDesc}>`;

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

  const hintText = hint || (isDate ? 'Use MM/DD/YYYY or YYYY-MM-DD' : '');
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

if (typeof window !== 'undefined') {
  window.renderFormField = renderFormField;
  window.renderSelectField = renderSelectField;
  window.renderTextareaField = renderTextareaField;
}
