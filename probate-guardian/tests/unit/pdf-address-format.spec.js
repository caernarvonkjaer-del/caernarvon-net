import { describe, expect, test } from 'vitest';
import { composePdfAddress } from '../../src/core/pdf/address-format.js';

describe('composePdfAddress', () => {
  test.each([
    [['42 Galaxy Way', 'Clearwater, FL 33756'], '42 Galaxy Way, Clearwater, FL 33756'],
    [['42 Galaxy Way', ''], '42 Galaxy Way'],
    [['', 'Clearwater, FL 33756'], 'Clearwater, FL 33756'],
    [['42 Galaxy Way,', 'Clearwater,   FL 33756'], '42 Galaxy Way, Clearwater, FL 33756'],
    [['Apartment 4B\n42 Galaxy Way', 'Clearwater, FL 33756'], 'Apartment 4B, 42 Galaxy Way, Clearwater, FL 33756'],
  ])('composes %j without punctuation or whitespace artifacts', (parts, expected) => {
    expect(composePdfAddress(...parts)).toBe(expected);
  });
});
