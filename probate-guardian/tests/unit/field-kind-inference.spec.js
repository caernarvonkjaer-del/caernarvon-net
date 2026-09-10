import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { getControlKind, getControlPolicy } from '../../src/core/form/form-contract.js';

// ── Cross-cutting guard (Milestone 36-6 item 12) ─────────────────────────
//
// getControlKind() used to classify a control by searching its lowercased path
// for bare substrings. The path `committeeIncorporated` contains "ein" at
// "committ(ein)corporated", so a yes/no checkbox was classified as an SSN
// field; finalizeFieldValue() then ran formatSSN('Yes'), which strips every
// non-digit, and wrote the empty string over the answer the same event had
// just recorded.
//
// The classifier now matches whole words. These tests fail on the next path
// that would collide, not just on the one that did.

const SRC = path.resolve(__dirname, '../../src');

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (/\.js$/.test(entry.name)) out.push(full);
  }
  return out;
}

// A path argument may be a plain quoted string or a template literal carrying
// row-index interpolation, e.g. `scheduleC2.${i}.claimantName`. Interpolations
// normalize to `0` so the surrounding field name still classifies.
const SEGMENT = '(?:[A-Za-z0-9_.]|\\$\\{[^}]*\\})+';
const HELPERS = [
  'textInput', 'dateInput', 'numInput', 'calcInput', 'yesNoCheckboxS', 'yesNoCheckbox',
  'txtP', 'selInput', 'selectInput', 'triStateS', 'moneyInput', 'checkboxS', 'pctInput',
];

function collectControlPaths() {
  const paths = new Set();
  for (const file of walk(SRC)) {
    const src = fs.readFileSync(file, 'utf8');
    for (const m of src.matchAll(new RegExp('data-(?:form|field|annual)-path="(' + SEGMENT + ')"', 'g'))) {
      paths.add(m[1].replace(/\$\{[^}]*\}/g, '0'));
    }
    for (const helper of HELPERS) {
      const re = new RegExp('\\b' + helper + '\\(\\s*[\'"`](' + SEGMENT + ')[\'"`]', 'g');
      for (const m of src.matchAll(re)) paths.add(m[1].replace(/\$\{[^}]*\}/g, '0'));
    }
  }
  return [...paths].sort();
}

// The pre-Milestone-36 classifier, kept verbatim as the comparison baseline.
function substringKind(rawPath) {
  const p = rawPath.toLowerCase();
  if (p.includes('casenumber')) return 'identifier';
  if (p.includes('account')) return 'identifier';
  if (p.includes('check')) return 'identifier';
  if (p.includes('barnumber') || p.includes('bar_')) return 'identifier';
  if (p.includes('name')) return 'name';
  if (p.includes('citystatezip') || p.includes('zip')) return 'zip';
  if (p.includes('address') || p.includes('street')) return 'address';
  if (p.includes('phone')) return 'phone';
  if (p.includes('ssn') || p.includes('ein')) return 'ssn';
  if (p.includes('date')) return 'date';
  return 'text';
}

const textControl = (formPath) => ({ type: 'text', dataset: { formPath } });

describe('field-kind inference', () => {
  const controlPaths = collectControlPaths();

  it('finds the shipped control paths to check', () => {
    expect(controlPaths.length).toBeGreaterThan(200);
  });

  it('no shipped control path infers its kind by an accidental mid-word match', () => {
    // Word matching and substring matching may disagree on exactly one path:
    // `committeeIncorporated`, the defect this guard exists for. Any new entry
    // here is a newly added field whose name collides with a needle -- read the
    // reported path and decide which classification is correct before touching
    // this list.
    const divergent = controlPaths
      .filter((p) => substringKind(p) !== getControlKind(textControl(p)))
      .map((p) => `${p}: substring=${substringKind(p)} word=${getControlKind(textControl(p))}`);

    expect(divergent).toEqual(['committeeIncorporated: substring=ssn word=text']);
  });

  it('classifies genuine identifier fields by whole word', () => {
    expect(getControlKind(textControl('preparer.ssnEin'))).toBe('ssn');
    expect(getControlKind(textControl('guardian.ein'))).toBe('ssn');
    expect(getControlKind(textControl('ssn_ein'))).toBe('ssn');
    expect(getControlKind(textControl('caseNumber'))).toBe('identifier');
    expect(getControlKind(textControl('attorney_bar_number'))).toBe('identifier');
    // Plural tolerated, so guardianNames stays a name field.
    expect(getControlKind(textControl('guardianNames'))).toBe('name');
    expect(getControlKind(textControl('wardName'))).toBe('name');
    expect(getControlKind(textControl('mailingCityStateZip'))).toBe('zip');
    expect(getControlKind(textControl('mailingStreet'))).toBe('address');
    expect(getControlKind(textControl('certServiceDate'))).toBe('date');
  });

  it('does not classify a mid-word needle as a match', () => {
    expect(getControlKind(textControl('committeeIncorporated'))).toBe('text');
  });

  it('never applies a text formatter to a checkbox or radio', () => {
    for (const type of ['checkbox', 'radio']) {
      // Paths chosen to hit every path-derived kind the classifier can return.
      for (const formPath of ['committeeIncorporated', 'wardName', 'preparer.ssnEin', 'mailingStreet', 'caseNumber', 'certServiceDate']) {
        const control = { type, dataset: { formPath } };
        expect(getControlKind(control), `${type} ${formPath}`).toBe('boolean');
        expect(getControlPolicy(control), `${type} ${formPath}`).toBe('preserve');
      }
    }
  });

  it('honours an explicit data-field-kind over any path inference', () => {
    expect(getControlKind({ type: 'text', dataset: { formPath: 'wardName', fieldKind: 'text' } })).toBe('text');
  });
});
