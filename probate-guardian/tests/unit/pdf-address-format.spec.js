import { describe, expect, test } from 'vitest';
import { composePdfAddressLines } from '../../src/core/pdf/address-format.js';

// One entry per stored field is the whole point: the renderers print an
// address in standard US form (delivery line, any secondary unit, then
// city/state/ZIP) from these lines, rather than re-deriving the breaks from
// punctuation the filer may not have typed.
describe('composePdfAddressLines', () => {
  test.each([
    [['42 Galaxy Way', 'Clearwater, FL 33756'], ['42 Galaxy Way', 'Clearwater, FL 33756']],
    [['42 Galaxy Way', ''], ['42 Galaxy Way']],
    [['', 'Clearwater, FL 33756'], ['Clearwater, FL 33756']],
    [[], []],
    [['', ''], []],
    // Punctuation and whitespace artifacts are still normalized per line.
    [['42 Galaxy Way,', 'Clearwater,   FL 33756'], ['42 Galaxy Way', 'Clearwater, FL 33756']],
    [['42 Galaxy Way', 'Clearwater,,FL 33756'], ['42 Galaxy Way', 'Clearwater, FL 33756']],
    // An embedded newline is a line break the filer typed; it is preserved as
    // its own line, which is how a secondary unit reaches the page.
    [['Apartment 4B\n42 Galaxy Way', 'Clearwater, FL 33756'], ['Apartment 4B', '42 Galaxy Way', 'Clearwater, FL 33756']],
  ])('composes %j into discrete lines', (parts, expected) => {
    expect(composePdfAddressLines(...parts)).toEqual(expected);
  });

  // The regression this shape exists for. The previous composer joined the
  // fields with a comma and the renderer split them back apart on commas, so a
  // filer who wrote no comma between city and state got the street and the
  // city collapsed onto one line.
  test('keeps the street on its own line when the filer omits the city comma', () => {
    expect(composePdfAddressLines('88 Snell Isle Blvd NE', 'St. Petersburg FL 33704'))
      .toEqual(['88 Snell Isle Blvd NE', 'St. Petersburg FL 33704']);
  });

  test('keeps the street on its own line when only a state and ZIP are given', () => {
    expect(composePdfAddressLines('88 Snell Isle Blvd NE', 'FL 33704'))
      .toEqual(['88 Snell Isle Blvd NE', 'FL 33704']);
  });

  test('does not split a single field on its own internal commas', () => {
    expect(composePdfAddressLines('88 Snell Isle Blvd NE, St. Petersburg, FL 33704'))
      .toEqual(['88 Snell Isle Blvd NE, St. Petersburg, FL 33704']);
  });
});
