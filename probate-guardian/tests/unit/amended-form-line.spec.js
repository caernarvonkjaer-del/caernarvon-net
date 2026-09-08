import { describe, expect, test } from 'vitest';
import { buildAnnualAccountingModel } from '../../src/features/annual-accounting/pdf-model.js';
import { buildSimplifiedAccountingModel } from '../../src/features/simplified-accounting/pdf-model.js';
import { buildVerifiedInventoryModel } from '../../src/features/guardian-inventory/pdf-model.js';

// Regression coverage for the shipped bug that made every Annual and every
// Simplified Accounting PDF print "Amended Form? Yes" -- including on a filing
// nobody had touched. The stored value is the STRING 'No', which is truthy, so
// the old `d.amendedForm ? 'Yes' : 'No'` was wrong in all three states. All
// three renderers now go through yesNoText(); these cases pin that down on the
// finished model rather than on the helper, so a future edit that reintroduces
// an inline ternary at a call site fails here.

function amendedLine(model) {
  for (const section of model.sections) {
    for (const block of section.blocks || []) {
      const found = (block.items || []).find(item => item.label === 'Amended Form?');
      if (found) return found.value;
    }
  }
  return null;
}

const annualBase = {
  wardName: 'Harold Thomas Bennett',
  caseNumber: '26-002487-GD',
  county: 'Pasco',
};

const simplifiedBase = { ...annualBase };

const inventoryBase = {
  ...annualBase,
  scheduleA1: [], scheduleA2: [],
  scheduleB1: [], scheduleB2: [], scheduleB3: [], scheduleB4: [],
  scheduleC1: [], scheduleC2: [], scheduleC3: [], scheduleC4: [], scheduleC5: [],
};

describe('"Amended Form?" prints the filer\'s actual answer', () => {
  const cases = [
    ['Annual Accounting', (v) => buildAnnualAccountingModel({ ...annualBase, amendedForm: v }), ''],
    ['Simplified Accounting', (v) => buildSimplifiedAccountingModel({ ...simplifiedBase, amendedForm: v }), ''],
  ];

  for (const [name, build] of cases) {
    describe(name, () => {
      test('prints No when the filer answered No', () => {
        expect(amendedLine(build('No'))).toBe('No');
      });

      test('prints No on an untouched filing', () => {
        expect(amendedLine(build(''))).toBe('No');
      });

      test('prints Yes only when the filer answered Yes', () => {
        expect(amendedLine(build('Yes'))).toBe('Yes');
      });
    });
  }

  describe('Guardian Inventory (stores a real boolean)', () => {
    test('prints No when unset and Yes when set', () => {
      expect(amendedLine(buildVerifiedInventoryModel({ ...inventoryBase, isAmended: false }))).toBe('No');
      expect(amendedLine(buildVerifiedInventoryModel({ ...inventoryBase }))).toBe('No');
      expect(amendedLine(buildVerifiedInventoryModel({ ...inventoryBase, isAmended: true }))).toBe('Yes');
    });
  });
});

describe('Annual-family filing identity in generated output', () => {
  for (const [inventoryType, filingType, formName, attestationName] of [
    ['finalAccounting', 'Final', 'FINAL GUARDIANSHIP ACCOUNTING', 'Final Accounting'],
    ['trustAccounting', 'Trust', 'TRUST GUARDIANSHIP ACCOUNTING', 'Trust Accounting'],
  ]) {
    test(`${filingType} uses its own headers and signed-attestation language`, () => {
      const model = buildAnnualAccountingModel({
        ...annualBase,
        inventoryType,
        filingType,
        periodFrom: '2026-01-01',
        periodTo: '2026-12-31',
      });
      const preparer = model.sections.find((section) => section.id === 'part4').blocks[0].text;
      const attorney = model.sections.find((section) => section.id === 'part5').blocks[0].text;

      expect(model.metadata.formName).toBe(formName);
      expect(model.metadata.title).toContain(attestationName);
      expect(preparer).toContain(attestationName);
      expect(attorney).toContain(attestationName.toLowerCase());
    });
  }
});
