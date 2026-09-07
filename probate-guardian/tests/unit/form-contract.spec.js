import { describe, it, expect, beforeEach } from 'vitest';
global.window = global;
import {
  sanitizeStoredText,
  formatSafeTitleCase,
  writeDraftValue,
  finalizeFieldValue,
  yesNoText,
} from '../../src/core/form/form-contract.js';

function createMockInput(initial = {}) {
  const classes = new Set(initial.classes || []);
  const attrs = new Map();
  return {
    value: initial.value || '',
    dataset: initial.dataset || {},
    type: initial.type || 'text',
    checked: initial.checked || false,
    classList: {
      add: (c) => classes.add(c),
      remove: (c) => classes.delete(c),
      contains: (c) => classes.has(c),
    },
    setAttribute: (k, v) => attrs.set(k, String(v)),
    removeAttribute: (k) => attrs.delete(k),
    getAttribute: (k) => attrs.get(k) || null,
    hasAttribute: (k) => attrs.has(k),
  };
}

describe('form-contract', () => {
  beforeEach(() => {
    window.D = {};
    window._transientDrafts = {};
    window.setPath = (obj, path, val) => {
      const parts = path.split('.');
      let cur = obj;
      for (let i = 0; i < parts.length - 1; i++) {
        if (!cur[parts[i]]) cur[parts[i]] = {};
        cur = cur[parts[i]];
      }
      cur[parts[parts.length - 1]] = val;
    };
    window.getPath = (obj, path) => {
      return path.split('.').reduce((acc, k) => acc?.[k], obj);
    };
    window.autoSave = () => {};
    window.updateNavDots = () => {};
    window.refreshWardInfoCard = () => {};
  });

  describe('sanitizeStoredText', () => {
    it('preserves legal and account identifier punctuation and characters', () => {
      expect(sanitizeStoredText('SNT-2024-778')).toBe('SNT-2024-778');
      expect(sanitizeStoredText('25-002487-GD')).toBe('25-002487-GD');
      expect(sanitizeStoredText('Acct 123-45 / POD')).toBe('Acct 123-45 / POD');
      expect(sanitizeStoredText('CHK-104A')).toBe('CHK-104A');
      expect(sanitizeStoredText('Trust u/a/d 04/12/2020')).toBe('Trust u/a/d 04/12/2020');
      expect(sanitizeStoredText("Ward's Trust (Special Needs)")).toBe("Ward's Trust (Special Needs)");
    });

    it('removes control characters and trims outer whitespace', () => {
      expect(sanitizeStoredText('  Sample Text\u0000\u0007\u001F  ')).toBe('Sample Text');
      expect(sanitizeStoredText(null)).toBe('');
      expect(sanitizeStoredText(undefined)).toBe('');
    });
  });

  describe('formatSafeTitleCase', () => {
    it('capitalizes purely lowercase words', () => {
      expect(formatSafeTitleCase('john doe')).toBe('John Doe');
      expect(formatSafeTitleCase('main street')).toBe('Main Street');
      expect(formatSafeTitleCase('tampa, fl')).toBe('Tampa, FL');
    });

    it('preserves uppercase acronyms and mixed-case names untouched', () => {
      expect(formatSafeTitleCase('SSI Benefit')).toBe('SSI Benefit');
      expect(formatSafeTitleCase('USAA Federal Savings')).toBe('USAA Federal Savings');
      expect(formatSafeTitleCase('Acme Holdings LLC')).toBe('Acme Holdings LLC');
      expect(formatSafeTitleCase("Jane O'Connor")).toBe("Jane O'Connor");
      expect(formatSafeTitleCase('Robert McLeod')).toBe('Robert McLeod');
    });
  });

  describe('writeDraftValue & finalizeFieldValue two-phase commit', () => {
    it('keeps unparsed date drafts transient during input and canonicalizes on blur', () => {
      const input = createMockInput({
        dataset: { fieldPath: 'periodFrom', fieldKind: 'date' },
        value: 'Feb 14, 2026',
      });

      // 1. writeDraftValue (input event)
      writeDraftValue(input);
      // Model remains empty during typing
      expect(window.D.periodFrom).toBeUndefined();
      expect(window._transientDrafts.periodFrom).toBe('Feb 14, 2026');

      // 2. finalizeFieldValue (blur event)
      finalizeFieldValue(input);
      expect(window.D.periodFrom).toBe('2026-02-14');
      expect(input.value).toBe('02/14/2026');
      expect(input.hasAttribute('aria-invalid')).toBe(false);
      expect(window._transientDrafts.periodFrom).toBeUndefined();
    });

    it('auto-masks unpunctuated 8-digit dates live during input and commits on blur', () => {
      const input = createMockInput({
        dataset: { fieldPath: 'periodTo', fieldKind: 'date' },
        value: '07102027',
      });

      // 1. writeDraftValue (input event with 8 digits)
      writeDraftValue(input);
      // Automatically formatted to display format live
      expect(input.value).toBe('07/10/2027');
      expect(window._transientDrafts.periodTo).toBe('07/10/2027');
      expect(window.D.periodTo).toBeUndefined();

      // 2. finalizeFieldValue (blur event)
      finalizeFieldValue(input);
      expect(window.D.periodTo).toBe('2027-07-10');
      expect(input.value).toBe('07/10/2027');
      expect(input.hasAttribute('aria-invalid')).toBe(false);
      expect(input.classList.contains('is-invalid')).toBe(false);
      expect(window._transientDrafts.periodTo).toBeUndefined();
    });

    it('canonicalizes unpunctuated 8-digit dates on blur even if unmasked', () => {
      const input = createMockInput({
        dataset: { fieldPath: 'gid', fieldKind: 'date' },
        value: '07102026',
      });

      finalizeFieldValue(input);
      expect(window.D.gid).toBe('2026-07-10');
      expect(input.value).toBe('07/10/2026');
      expect(input.hasAttribute('aria-invalid')).toBe(false);
      expect(input.classList.contains('is-invalid')).toBe(false);
    });

    it('sets aria-invalid on blur when date text cannot be parsed', () => {
      const input = createMockInput({
        dataset: { fieldPath: 'periodFrom', fieldKind: 'date' },
        value: '02/30/2026', // invalid date
      });

      finalizeFieldValue(input);
      expect(window.D.periodFrom).toBe('');
      expect(input.value).toBe('02/30/2026'); // stays visible
      expect(input.getAttribute('aria-invalid')).toBe('true');
      expect(input.classList.contains('is-invalid')).toBe(true);
    });

    it('sets aria-invalid on blur when 8-digit unpunctuated date is impossible calendar date', () => {
      const input = createMockInput({
        dataset: { fieldPath: 'periodFrom', fieldKind: 'date' },
        value: '13012026', // invalid month 13
      });

      finalizeFieldValue(input);
      expect(window.D.periodFrom).toBe('');
      expect(input.value).toBe('13012026');
      expect(input.getAttribute('aria-invalid')).toBe('true');
      expect(input.classList.contains('is-invalid')).toBe(true);
    });

    it('writes non-date fields directly on input and cleans on blur', () => {
      const input = createMockInput({
        dataset: { fieldPath: 'caseNumber', fieldKind: 'identifier' },
        value: '25-002487-GD',
      });

      writeDraftValue(input);
      expect(window.D.caseNumber).toBe('25-002487-GD');

      input.value = '  25-002487-GD\u0000  ';
      finalizeFieldValue(input);
      expect(window.D.caseNumber).toBe('25-002487-GD');
      expect(input.value).toBe('25-002487-GD');
    });
  });

  describe('yesNoText (read side of the yes-no contract)', () => {
    it('round-trips the strings the write side actually stores', () => {
      // writeDraftValue()/finalizeFieldValue() store these literals for any
      // control marked data-form-value="yes-no".
      expect(yesNoText('Yes')).toBe('Yes');
      expect(yesNoText('No')).toBe('No');
    });

    it("reports 'No' for a field the filer never answered", () => {
      // The bug this exists to prevent: 'No' is a truthy non-empty string, so
      // `d.amendedForm ? 'Yes' : 'No'` printed "Yes" in all three states.
      expect(yesNoText('')).toBe('No');
      expect(yesNoText(undefined)).toBe('No');
      expect(yesNoText(null)).toBe('No');
    });

    it('accepts real booleans from forms that store them that way', () => {
      expect(yesNoText(true)).toBe('Yes');
      expect(yesNoText(false)).toBe('No');
    });

    it('tolerates casing and stray whitespace from imported files', () => {
      expect(yesNoText('  yes ')).toBe('Yes');
      expect(yesNoText('NO')).toBe('No');
    });

    it('leaves an unanswered field blank when the caller asks for that', () => {
      expect(yesNoText('', '')).toBe('');
      expect(yesNoText('Yes', '')).toBe('Yes');
    });

    it('falls back to the blank value for unrecognized junk', () => {
      expect(yesNoText('maybe')).toBe('No');
      expect(yesNoText(0)).toBe('No');
    });
  });
});
