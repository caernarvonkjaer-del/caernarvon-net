// Milestone 64A-1, item 1.1. Before this milestone, D-4's Bond Amount was
// free text (e.g. "$25,000"); on the printed filing, page 5 read that string
// through pdf-model.js's fmt(), which does parseFloat(v) -- parseFloat stops
// at the first non-digit character, so "$25,000" parsed to NaN and printed
// as $0.00 no matter what the filer typed. numInput() now stores a plain
// number instead (like every other currency field on this form), and
// normalizeBondAmountValue() migrates an old .sav's string on load so a
// filing saved before this fix reads the same after it.
//
// guardian-inventory/index.js transitively imports src/core/party-resolver.js,
// which does `window.resolveParty = resolveParty` etc. at module scope, and
// its own top level does `const { ..., SCHEDULE_NAV_KEYS } = window` -- both
// executed at import time, before any ordinary statement in this file (ES
// import specifiers are hoisted ahead of a plain `global.window = global`).
// See guardian-inventory-64a1-validation.spec.js for the same recipe.
import { afterAll, beforeAll, describe, test, expect, vi } from 'vitest';

let normalizeBondAmountValue;

beforeAll(async () => {
  vi.stubGlobal('window', { SCHEDULE_NAV_KEYS: ['a1', 'a2', 'b1', 'b2', 'b3', 'b4', 'c1', 'c2', 'c3', 'c4', 'c5'] });
  ({ normalizeBondAmountValue } = await import('../../src/features/guardian-inventory/index.js'));
});

afterAll(() => {
  vi.unstubAllGlobals();
});

describe('Milestone 64A-1, item 1.1: bond amount load normalization', () => {
  test('a dollar-formatted string parses to the same number a filer typed', () => {
    expect(normalizeBondAmountValue('$25,000')).toBe(25000);
  });

  test('a comma-only string parses the same way', () => {
    expect(normalizeBondAmountValue('25,000')).toBe(25000);
  });

  test('a plain decimal string parses with its cents intact', () => {
    expect(normalizeBondAmountValue('25000.50')).toBe(25000.5);
  });

  test('a blank string stays blank -- never coerced to 0', () => {
    expect(normalizeBondAmountValue('')).toBe('');
  });

  test('a value that is already a number (a filing saved after this fix) passes through unchanged', () => {
    expect(normalizeBondAmountValue(25000)).toBe(25000);
  });

  test('undefined (a .sav from before bondAmount existed at all) passes through unchanged', () => {
    expect(normalizeBondAmountValue(undefined)).toBe(undefined);
  });
});
