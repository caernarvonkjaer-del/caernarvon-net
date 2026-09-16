import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import {
  inferFieldKind,
  renderFormField,
  renderSelectField,
  renderTextareaField,
  renderYesNoField,
  renderRadioGroupField,
  renderCheckboxField,
} from '../../src/core/form/form-fields.js';

describe('inferFieldKind', () => {
  it('identifies date fields from type or label', () => {
    expect(inferFieldKind('Signature Date', 'text')).toBe('date');
    expect(inferFieldKind('Date of Inception', 'text')).toBe('date');
    expect(inferFieldKind('Period From', 'date')).toBe('date');
  });

  it('identifies money fields from type="number"', () => {
    expect(inferFieldKind('Amount Paid', 'number')).toBe('money');
    expect(inferFieldKind('Starting Balance', 'number')).toBe('money');
  });

  it('identifies SSN and Taxpayer ID', () => {
    expect(inferFieldKind('Social Security Number', 'text')).toBe('ssn');
    expect(inferFieldKind('SSN / EIN', 'text')).toBe('ssn');
    expect(inferFieldKind('Taxpayer ID # (TIN)', 'text')).toBe('ssn');
  });

  it('identifies phone numbers', () => {
    expect(inferFieldKind('Primary Phone Number', 'text')).toBe('phone');
  });

  it('identifies case, bar, and check numbers', () => {
    expect(inferFieldKind('Court Case Number', 'text')).toBe('caseNumber');
    expect(inferFieldKind('Florida Bar Number', 'text')).toBe('barNumber');
    expect(inferFieldKind('Check #', 'text')).toBe('checkNumber');
  });

  it('identifies names while avoiding combined bank account fields', () => {
    expect(inferFieldKind('Guardian Name', 'text')).toBe('name');
    expect(inferFieldKind('Payer', 'text')).toBe('name');
    expect(inferFieldKind('Bank Name / Account #', 'text')).toBe('text');
  });

  it('identifies addresses and zip codes', () => {
    expect(inferFieldKind('Mailing Street Address', 'text')).toBe('address');
    expect(inferFieldKind('City / State / Zip', 'text')).toBe('zip');
  });
});

describe('renderFormField', () => {
  it('renders standard text input with both canonical and legacy data attributes', () => {
    const html = renderFormField({
      path: 'wardName',
      label: 'Name of Ward',
      value: 'John Doe',
      required: true,
    });

    expect(html).toContain('data-field-path="wardName"');
    expect(html).toContain('data-form-path="wardName"');
    expect(html).toContain('data-annual-path="wardName"');
    expect(html).toContain('data-field-kind="name"');
    expect(html).toContain('data-field-required="true"');
    expect(html).toContain('data-sync-ward-name="true"');
    expect(html).toContain('value="John Doe"');
    expect(html).toContain('<span class="req">*</span>');
  });

  it('renders date inputs with hint and aria-describedby', () => {
    const html = renderFormField({
      path: 'periodFrom',
      label: 'Period From',
      value: '2027-01-01',
      type: 'date',
    });

    expect(html).toContain('placeholder="MM/DD/YYYY"');
    expect(html).toContain('data-field-kind="date"');
    expect(html).toContain('data-field-format-policy="normalize"');
    expect(html).toContain('aria-describedby=');
    expect(html).toContain('Use MM/DD/YYYY');
    expect(html).not.toContain('YYYY-MM-DD');
  });

  it('renders money input wrapped with dollar sign input-group', () => {
    const html = renderFormField({
      path: 'startingBalance',
      label: 'Starting Balance',
      value: '1250.50',
      type: 'number',
    });

    expect(html).toContain('<div class="input-group">');
    expect(html).toContain('<span class="input-group-text">$</span>');
    expect(html).toContain('inputmode="decimal"');
    expect(html).toContain('data-field-kind="money"');
  });

  it('renders percent input wrapped with percent sign input-group', () => {
    const html = renderFormField({
      path: 'guardianFeePercent',
      label: 'Guardian Fee Percent (%)',
      value: '5',
      type: 'number',
    });

    expect(html).toContain('<div class="input-group">');
    expect(html).toContain('<span class="input-group-text">%</span>');
  });

  it('renders SSN input wrapped with ssn-mask-wrap and reveal button', () => {
    const html = renderFormField({
      path: 'guardians.0.ssn',
      label: 'SSN / EIN',
      value: '123-45-6789',
      required: true,
    });

    expect(html).toContain('class="form-control ssn-masked"');
    expect(html).toContain('<div class="ssn-mask-wrap">');
    expect(html).toContain('data-form-action="toggle-ssn"');
    expect(html).toContain('data-field-kind="ssn"');
    expect(html).toContain('data-field-format-policy="preserve"');
  });

  // Annual Accounting's inpD() opts its plain free-text fields into the
  // legacy security sanitizer on blur; nothing else does, and the flag must
  // not leak onto typed fields (the sanitizer would mangle an email).
  it('stamps data-field-sanitize="security" only when asked, and only on plain text fields', () => {
    const optedIn = renderFormField({ path: 'schC.0.description', label: 'Full Description and Identification', securitySanitize: true });
    expect(optedIn).toContain('data-field-sanitize="security"');
    expect(optedIn).toContain('data-annual-format="security"');

    const email = renderFormField({ path: 'attorney_email', label: 'Primary Email (e-filing)', type: 'email', securitySanitize: true });
    expect(email).not.toContain('data-field-sanitize');
    const amount = renderFormField({ path: 'schA.0.amount', label: 'Amount', type: 'number', securitySanitize: true });
    expect(amount).not.toContain('data-field-sanitize');

    const byDefault = renderFormField({ path: 'notes', label: 'Notes' });
    expect(byDefault).toContain('data-annual-format="security"');
    expect(byDefault).not.toContain('data-field-sanitize');
  });
});

describe('renderSelectField and renderTextareaField', () => {
  it('renders select dropdown with options and attributes', () => {
    const html = renderSelectField({
      path: 'typeOfGuardianship',
      label: 'Type of Guardianship',
      value: 'Plenary',
      options: ['Plenary', 'Limited'],
    });

    expect(html).toContain('<select class="form-select"');
    expect(html).toContain('data-field-path="typeOfGuardianship"');
    expect(html).toContain('selected>Plenary</option>');
  });

  it('renders textarea with rows, hint, and character preservation', () => {
    const html = renderTextareaField({
      path: 'planNotes',
      label: 'Annual Narrative Notes',
      value: 'All medical needs met.\nNo issues.',
      rows: 5,
      hint: 'Include major events in the ward\'s life',
    });

    expect(html).toContain('<textarea class="form-control"');
    expect(html).toContain('rows="5"');
    expect(html).toContain('class="plan-field-hint"');
    expect(html).toContain('All medical needs met.');
  });
});

// Milestone 41-1: three new Tier 1 primitives, ported from legacy-app.js's
// yesNoRadioHTML()/radioP()/chkP() -- an audit of chkP()/yesNoCheckboxS()/
// yesNoCheckboxD() (the milestone proposal's own flagged open question)
// found the latter two are not checkboxes at all: both already delegate to
// yesNoRadioHTML() directly, identically to yesNoRadioAnnualHTML(). So
// exactly two new shapes exist -- a tri-state Yes/No radio pair, and a
// standalone boolean checkbox -- plus a third, generic N-option radio group
// primitive for radioP()'s non-binary call sites (e.g. Plan Minor's 3-way
// visit-frequency question).
describe('renderYesNoField', () => {
  it('renders a fieldset/legend-wrapped Yes/No radio pair with the form binding by default', () => {
    const html = renderYesNoField({
      path: 'q9DNR',
      label: 'Does the ward have a DNR order?',
      value: 'Yes',
      required: true,
    });

    expect(html).toContain('<fieldset class="plan-yes-no mb-2" data-yes-no-group="q9DNR">');
    expect(html).toContain('<legend class="form-label mb-1">Does the ward have a DNR order?');
    expect(html).toContain('<span class="req">*</span>');
    expect(html).toContain('data-form-path="q9DNR"');
    expect(html).not.toContain('data-annual-path');
    expect(html).toMatch(/value="Yes" checked/);
    expect(html).not.toMatch(/value="No" checked/);
  });

  it('switches to data-annual-path when binding is "annual"', () => {
    const html = renderYesNoField({
      path: 'schD1.0.restricted',
      label: 'Restricted?',
      value: 'No',
      binding: 'annual',
    });

    expect(html).toContain('data-annual-path="schD1.0.restricted"');
    expect(html).not.toContain('data-form-path=');
    expect(html).toMatch(/value="No" checked/);
  });

  it('renders neither radio checked when unanswered', () => {
    const html = renderYesNoField({ path: 'q9LivingWill', label: 'Living Will?', value: '' });
    expect(html).not.toMatch(/checked/);
  });
});

describe('renderRadioGroupField', () => {
  it('renders a fieldset/legend-wrapped radio group for a non-binary option set', () => {
    const html = renderRadioGroupField({
      path: 'visitFrequency',
      label: 'Frequency',
      value: 'Monthly',
      options: ['Weekly', 'Monthly', 'Annually'],
    });

    expect(html).toContain('<fieldset class="mb-3">');
    expect(html).toContain('<legend class="form-label">Frequency</legend>');
    expect(html).toContain('data-form-path="visitFrequency"');
    expect(html).toMatch(/value="Monthly" checked/);
    expect(html).not.toMatch(/value="Weekly" checked/);
    expect(html).not.toMatch(/value="Annually" checked/);
  });

  it('defaults to a plain Yes/No option set', () => {
    const html = renderRadioGroupField({ path: 'wardLiving', label: 'Living situation', value: 'No' });
    expect(html).toContain('value="Yes"');
    expect(html).toContain('value="No"');
  });
});

describe('renderCheckboxField', () => {
  it('renders a standalone boolean checkbox, not a radio pair', () => {
    const html = renderCheckboxField({
      path: 'q11NoRemuneration',
      label: 'I have received NO remuneration',
      checked: true,
    });

    expect(html).toContain('<div class="form-check plan-check">');
    expect(html).toContain('type="checkbox"');
    expect(html).toContain('checked');
    expect(html).toContain('data-form-path="q11NoRemuneration"');
    expect(html).toContain('data-form-value="boolean"');
  });

  it('renders unchecked when checked is false', () => {
    const html = renderCheckboxField({ path: 'q9DNR', label: 'DNR', checked: false });
    expect(html).not.toContain('checked>');
  });
});

// Milestone 51C2. legacy-app.js's yesNoCheckboxD(label, val, setter, ...) used
// to accept `setter` in two shapes: a plain dot path ('trusts.0.hasTrust'), or
// an inline assignment string ("D.trusts[0].hasTrust=this.value;navigate('/p8')")
// that it reverse-engineered a path and a route out of with two regexes. Every
// live call site passes the plain path, so both regexes were unreachable and
// were deleted.
//
// This guard pins the precondition that made that safe. It must hold both
// before and after the simplification: a new call site written in the old
// inline-assignment shape would now silently produce an empty path -- a binary
// field on a filed accounting that stops recording the filer's answer, with no
// error. That is quiet enough to ship, so it is worth a test.
describe('yesNoCheckboxD call sites pass a plain path, never an inline setter (Milestone 51C)', () => {
  // Extracts each call's argument text, quote- and paren-aware, so HTML
  // attributes surrounding the call (class="col-md-6") cannot be mistaken for
  // an assignment inside it.
  function callArgumentLists(source, fnName) {
    const lists = [];
    const needle = `${fnName}(`;
    for (let idx = source.indexOf(needle); idx !== -1; idx = source.indexOf(needle, idx + 1)) {
      const before = source.slice(source.lastIndexOf('\n', idx) + 1, idx);
      // Skip the declaration itself and any prose mention in a comment.
      if (/function\s*$/.test(before) || before.includes('//') || before.trimStart().startsWith('*')) continue;
      let depth = 0;
      let quote = null;
      let i = idx + needle.length - 1;
      const start = idx + needle.length;
      for (; i < source.length; i++) {
        const ch = source[i];
        if (quote) {
          if (ch === '\\') i++;
          else if (ch === quote) quote = null;
          continue;
        }
        if (ch === "'" || ch === '"' || ch === '`') quote = ch;
        else if (ch === '(') depth++;
        else if (ch === ')' && --depth === 0) break;
      }
      lists.push(source.slice(start, i));
    }
    return lists;
  }

  function topLevelArgs(argText) {
    const args = [];
    let depth = 0;
    let quote = null;
    let current = '';
    for (let i = 0; i < argText.length; i++) {
      const ch = argText[i];
      if (quote) {
        current += ch;
        if (ch === '\\') { current += argText[++i] ?? ''; }
        else if (ch === quote) quote = null;
        continue;
      }
      if (ch === "'" || ch === '"' || ch === '`') { quote = ch; current += ch; continue; }
      if (ch === '(' || ch === '[' || ch === '{') depth++;
      if (ch === ')' || ch === ']' || ch === '}') depth--;
      if (ch === ',' && depth === 0) { args.push(current.trim()); current = ''; continue; }
      current += ch;
    }
    if (current.trim()) args.push(current.trim());
    return args;
  }

  const srcDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../src');
  const featuresDir = path.join(srcDir, 'features');
  const sourceFiles = fs.readdirSync(featuresDir, { recursive: true })
    .filter(name => String(name).endsWith('.js'))
    .map(name => path.join(featuresDir, String(name)))
    .concat([path.join(srcDir, 'legacy-app.js')]);

  const callSites = sourceFiles.flatMap(file => {
    const source = fs.readFileSync(file, 'utf8');
    return callArgumentLists(source, 'yesNoCheckboxD')
      .map(argText => ({ file: path.relative(srcDir, file), args: topLevelArgs(argText) }));
  });

  it('finds the known call sites, so a silent zero-match does not pass vacuously', () => {
    expect(callSites.length).toBeGreaterThanOrEqual(3);
  });

  it('every call passes a plain dot path as the setter argument', () => {
    const offenders = callSites
      .map(site => ({ ...site, setter: site.args[2] ?? '' }))
      .filter(site => site.setter.includes('=') || site.setter.includes('navigate('));
    expect(
      offenders,
      'yesNoCheckboxD() no longer parses an inline "D.x=this.value;navigate(...)" setter -- '
      + 'pass the dot path as the 3rd argument and the route as the 4th:\n'
      + offenders.map(o => `  ${o.file}: ${o.setter}`).join('\n'),
    ).toEqual([]);
  });

  it('the route argument, when given, is a plain route string and not a parsed one', () => {
    for (const site of callSites) {
      const route = site.args[3];
      if (route === undefined) continue;
      expect(route, `${site.file} route argument`).toMatch(/^(?:'\/[^']*'|"\/[^"]*"|`\/[^`]*`|true|false)$/);
    }
  });
});
