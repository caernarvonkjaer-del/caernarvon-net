import { describe, it, expect } from 'vitest';
import { formatBarNumber } from '../../src/core/form/form-contract.js';

// Florida Bar member numbers are sequential identifiers. Normalize them to the
// current eight-digit representation so leading zeroes are retained consistently.
//
// formatBarNumber() moved out of legacy-app.js into
// src/core/form/form-contract.js in Milestone 70's 70B; this spec used to
// slice it out of the monolith's source and evaluate it on its own.
describe('formatBarNumber', () => {
  it('pads a shorter bar number with leading zeroes', () => {
    expect(formatBarNumber('008921')).toBe('00008921');
    expect(formatBarNumber('89214')).toBe('00089214');
  });

  it('keeps an eight-digit bar number intact', () => {
    expect(formatBarNumber('00089214')).toBe('00089214');
    expect(formatBarNumber('12345678')).toBe('12345678');
  });

  it('strips non-digits before normalizing the identifier', () => {
    expect(formatBarNumber('008-9214')).toBe('00089214');
    expect(formatBarNumber(' 12 34 567 ')).toBe('01234567');
  });

  it('limits input to eight digits', () => {
    expect(formatBarNumber('123456789')).toBe('12345678');
  });

  it('handles empty and nullish input', () => {
    expect(formatBarNumber('')).toBe('');
    expect(formatBarNumber(null)).toBe('');
    expect(formatBarNumber(undefined)).toBe('');
  });
});
