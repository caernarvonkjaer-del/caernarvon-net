import { describe, expect, test } from 'vitest';
import { buildAnnualAccountingModel } from '../../src/features/annual-accounting/pdf-model.js';
import { buildSimplifiedAccountingModel } from '../../src/features/simplified-accounting/pdf-model.js';

// Milestone 40E. A Certificate of Service recipient's address lives in discrete
// fields (line2/line3/line4). Both models used to flatten them into one string
// before handing the cell to the table renderer, which then had no idea where
// the real line breaks were and wrapped the run generically -- overflowing the
// right page margin on a live Annual Accounting export.
//
// The cell is now the array of components, which pdf-engine.js's measureCell()
// forces onto one line each (and still wraps each to the column). These tests
// assert the model's side of that contract, which is also where the second bug
// lived: Simplified dropped line4 in two separate places.

const findCertTable = (model, sectionId) => {
  const section = model.sections.find((s) => s.id === sectionId);
  expect(section, `section ${sectionId} should exist`).toBeDefined();
  const table = section.blocks.find((b) => b.type === 'table');
  expect(table, `section ${sectionId} should carry a table block`).toBeDefined();
  return table;
};

// The address is the third column in both models: ['#', name, address].
const addressCell = (table, rowIdx = 0) => table.rows[rowIdx][2];

describe('Milestone 40E: certificate-of-service address cells are discrete lines', () => {
  describe('Annual Accounting (Part X)', () => {
    const build = (certRecipients) =>
      findCertTable(buildAnnualAccountingModel({ inventoryType: 'annual', certRecipients }), 'part10');

    test('a three-part address becomes three separate lines, not a joined string', () => {
      const table = build([
        { name: 'Clerk of Court', line2: '315 Court St', line3: 'Clearwater, FL 33756', line4: 'Room 100' },
      ]);
      expect(addressCell(table)).toEqual(['315 Court St', 'Clearwater, FL 33756', 'Room 100']);
    });

    test('the cell is an array, so the renderer is never handed a comma-joined run', () => {
      const table = build([
        { name: 'Clerk of Court', line2: '315 Court St', line3: 'Clearwater, FL 33756', line4: 'Room 100' },
      ]);
      const cell = addressCell(table);
      expect(Array.isArray(cell)).toBe(true);
      expect(typeof cell).not.toBe('string');
    });

    test('a single address line still renders as one line', () => {
      const table = build([{ name: 'Sole Line Recipient', line2: '100 Only Street' }]);
      expect(addressCell(table)).toEqual(['100 Only Street']);
    });

    test('blank and missing components are dropped rather than left as empty lines', () => {
      const table = build([
        { name: 'Gappy Recipient', line2: '', line3: 'Clearwater, FL 33756', line4: undefined },
      ]);
      expect(addressCell(table)).toEqual(['Clearwater, FL 33756']);
    });
  });

  describe('Simplified Accounting (Part VI)', () => {
    const build = (certRecipients) =>
      findCertTable(buildSimplifiedAccountingModel({ inventoryType: 'simplified', certRecipients }), 'part6');

    test('a three-part address becomes three separate lines, including line4', () => {
      const table = build([
        { name: 'Clerk of Court', line2: '315 Court St', line3: 'Clearwater, FL 33756', line4: 'Room 100' },
      ]);
      expect(addressCell(table)).toEqual(['315 Court St', 'Clearwater, FL 33756', 'Room 100']);
    });

    // The regression guard for the data-loss half of this fix. The old
    // `${line2} ${line3}` join omitted line4 outright, so a recipient needing a
    // fourth address line had it silently missing from the filed document.
    // Overflow is obvious on sight; a missing address line is not.
    test('line4 is no longer silently dropped from the rendered address', () => {
      const table = build([
        { name: 'Clerk of Court', line2: '315 Court St', line3: 'Clearwater, FL 33756', line4: 'Room 100' },
      ]);
      expect(addressCell(table)).toContain('Room 100');
    });

    // The second, separate line4 omission: the recipient *filter* also ignored
    // it, so a recipient whose only populated field was line4 was dropped from
    // the certificate of service entirely -- no row at all. Annual's equivalent
    // filter already counted line4.
    test('a recipient whose only populated field is line4 still appears at all', () => {
      const table = build([{ line4: 'Care of the Probate Division' }]);
      expect(table.rows).toHaveLength(1);
      expect(addressCell(table)).toEqual(['Care of the Probate Division']);
    });

    test('a single address line still renders as one line', () => {
      const table = build([{ name: 'Sole Line Recipient', line2: '100 Only Street' }]);
      expect(addressCell(table)).toEqual(['100 Only Street']);
    });
  });

  test('both models agree on the address cell shape for identical input', () => {
    const recipients = [
      { name: 'Clerk of Court', line2: '315 Court St', line3: 'Clearwater, FL 33756', line4: 'Room 100' },
    ];
    const annual = addressCell(
      findCertTable(buildAnnualAccountingModel({ inventoryType: 'annual', certRecipients: recipients }), 'part10')
    );
    const simplified = addressCell(
      findCertTable(buildSimplifiedAccountingModel({ inventoryType: 'simplified', certRecipients: recipients }), 'part6')
    );
    expect(simplified).toEqual(annual);
  });
});
