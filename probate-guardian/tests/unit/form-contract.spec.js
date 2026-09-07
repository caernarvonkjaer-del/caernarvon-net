import { describe, it, expect, beforeEach } from 'vitest';
global.window = global;
import {
  sanitizeStoredText,
  formatSafeTitleCase,
  writeDraftValue,
  finalizeFieldValue,
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
});
