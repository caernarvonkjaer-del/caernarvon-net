// Milestone 72 follow-up (found while building 72H): an Excel import must not
// wipe what the court's workbook has no box for -- a signature's chosen state
// and stamp image, which guardian served the copies, and on the Inventory the
// guardian's and attorney's emails -- and must keep it only for the same
// person. The browser round trip is tests/e2e/import-keeps-signatures.spec.ts.
import { describe, expect, test } from 'vitest';
import { keepUnboxedFields, samePerson, SIGNATURE_FIELDS } from '../../src/core/excel/import-keep.js';

describe('samePerson(): 72A\'s containment test, either way round; a blank matches only a blank', () => {
  test.each([
    ['Robert T. Nguyen', 'Robert T. Nguyen, Esq.', true],
    ['Robert T. Nguyen, Esq.', 'Robert T. Nguyen', true],
    ['Pat Rivera', 'pat  rivera', true],
    ['', '', true],
    ['', 'Pat Rivera', false],
    ['Pat Rivera', '  ', false],
    [null, 'Pat Rivera', false],
    ['Pat Rivera', 'Sam Lee', false],
    ['R. M. Alvarez', 'Rachel Alvarez', false],
  ])('%j vs %j', (a, b, same) => expect(samePerson(a, b)).toBe(same));
});

describe('keepUnboxedFields()', () => {
  const STAMP = { signatureState: 'stamp', signatureImage: 'data:image/png;base64,AA', certifiesService: true };

  test('the same person keeps the fields the workbook cannot carry; the workbook\'s own boxes win', () => {
    const fromWorkbook = { name: 'Pat Rivera', phone: '(727) 555-0100' };
    const before = { name: 'Pat Rivera', phone: '(727) 555-0199', ...STAMP };
    expect(keepUnboxedFields(fromWorkbook, before, [...SIGNATURE_FIELDS, 'certifiesService'])).toEqual({ name: 'Pat Rivera', phone: '(727) 555-0100', ...STAMP });
  });

  test('a different person keeps nothing -- a reordered workbook never hands one guardian another\'s stamp', () => {
    const fromWorkbook = { name: 'Sam Lee' };
    expect(keepUnboxedFields(fromWorkbook, { name: 'Pat Rivera', ...STAMP }, [...SIGNATURE_FIELDS, 'certifiesService'])).toEqual({ name: 'Sam Lee' });
  });

  test('a workbook that drops a co-guardian leaves the empty slot without that guardian\'s stamp or tick', () => {
    expect(keepUnboxedFields({ name: '' }, { name: 'Pat Rivera', ...STAMP }, [...SIGNATURE_FIELDS, 'certifiesService'])).toEqual({ name: '' });
  });

  test('no record before, or a field the filing never had: nothing to keep', () => {
    expect(keepUnboxedFields({ name: 'Pat' }, undefined, SIGNATURE_FIELDS)).toEqual({ name: 'Pat' });
    expect(keepUnboxedFields({ name: 'Pat' }, { name: 'Pat' }, SIGNATURE_FIELDS)).toEqual({ name: 'Pat' });
  });
});
