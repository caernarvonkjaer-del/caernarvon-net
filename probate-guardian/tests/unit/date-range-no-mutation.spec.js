import { describe, expect, test } from 'vitest';
import { readFile } from 'node:fs/promises';
import { checkDateOrder } from '../../src/core/validation/date-rules.js';
import { adaptValidationErrors } from '../../src/core/validation/validation-adapter.js';

// Milestone 40C-C. Editing one endpoint of a date range must never change the
// other. legacy-app.js used to wire every From/To pair so that a "reversed"
// range overwrote the opposite endpoint -- but it compared the inputs' .value
// strings, and form-fields.js renders every date field as type="text" holding
// the MM/DD/YYYY display form. Comparing those compares the month first and the
// year last, so an ordinary accounting period read as reversed and the To field
// was silently replaced with the From date.
//
// checkDateOrder() is now the single reporter of range order. It reads the
// canonical YYYY-MM-DD stored values, where string order is date order.

describe('Milestone 40C-C: date ranges are validated, never rewritten', () => {
  // The pairs that made the old display-string comparison fire. Documented as
  // data so the reason this bug existed stays legible: every one of these is a
  // legitimate range whose To endpoint used to be destroyed on entry.
  const VALID_RANGES_THE_OLD_SWAP_BROKE = [
    { label: 'annual period starting mid-May', from: '2026-05-10', to: '2027-05-09' },
    { label: 'one-day range across new year', from: '2025-12-31', to: '2026-01-01' },
    { label: 'fiscal year starting in July', from: '2025-07-01', to: '2026-06-30' },
    { label: 'period starting in December', from: '2025-12-01', to: '2026-11-30' },
  ];

  for (const { label, from, to } of VALID_RANGES_THE_OLD_SWAP_BROKE) {
    test(`accepts a valid range: ${label}`, () => {
      expect(checkDateOrder(from, to, {
        sectionLabel: 'Part I', earlierLabel: 'Period From', laterLabel: 'Period To',
      })).toEqual([]);
    });

    test(`the old display-string comparison would have rejected: ${label}`, () => {
      // Proves these fixtures actually exercise the defect rather than being
      // arbitrary dates: MM/DD/YYYY order disagrees with real date order here.
      const display = (iso) => iso.replace(/^(\d{4})-(\d{2})-(\d{2})$/, '$2/$3/$1');
      expect(display(from) > display(to)).toBe(true);
      expect(from > to).toBe(false);
    });
  }

  test('a genuinely reversed range is reported, not silently corrected', () => {
    expect(checkDateOrder('2026-12-31', '2026-01-01', {
      sectionLabel: 'Part I', earlierLabel: 'Period From', laterLabel: 'Period To',
    })).toEqual(['Part I — Period To must be on or after Period From']);
  });

  describe('Guardian Inventory bond period (D-4)', () => {
    // This pair had no order check at all before 40C-C -- Milestone 34-1A
    // excluded Guardian Inventory because it has no accounting period, and the
    // only thing touching the bond period was the swap now removed.
    test('a reversed bond period is reported', () => {
      expect(checkDateOrder('2026-12-31', '2026-01-01', {
        sectionLabel: 'D-4', earlierLabel: 'Bond Period From', laterLabel: 'Bond Period To',
      })).toEqual(['D-4 — Bond Period To must be on or after Bond Period From']);
    });

    test('a valid cross-year bond period is accepted', () => {
      expect(checkDateOrder('2026-05-10', '2027-05-09', {
        sectionLabel: 'D-4', earlierLabel: 'Bond Period From', laterLabel: 'Bond Period To',
      })).toEqual([]);
    });

    // The message names BOTH endpoints, and the adapter's D-4 branch matches on
    // includes(), checking "bond period from" first -- so without an explicit
    // earlier branch this error sends the filer to the field that is not the
    // one to change.
    test('the ordering error focuses Bond Period To, not Bond Period From', () => {
      const [adapted] = adaptValidationErrors(
        ['D-4 — Bond Period To must be on or after Bond Period From'],
        'guardian'
      );
      expect(adapted.path).toBe('bondPeriodTo');
    });

    test('the plain required-field errors still map to their own endpoints', () => {
      const [fromErr] = adaptValidationErrors(['D-4 — Bond Period From is required.'], 'guardian');
      const [toErr] = adaptValidationErrors(['D-4 — Bond Period To is required.'], 'guardian');
      expect(fromErr.path).toBe('bondPeriodFrom');
      expect(toErr.path).toBe('bondPeriodTo');
    });
  });

  // The removal itself is the fix, so assert the mutating code is gone. A
  // source check because these were DOM event handlers in a classic script that
  // a node unit test cannot load.
  test('no From/To input pairing code remains in legacy-app.js', async () => {
    const source = await readFile(new URL('../../src/legacy-app.js', import.meta.url), 'utf8');
    expect(source).not.toMatch(/function\s+wireDateRangePair\s*\(/);
    expect(source).not.toMatch(/function\s+enforceDateRanges\s*\(/);
    // And nothing reintroduced the min/max attribute pairing, which separately
    // broke digit-by-digit typing in Chrome.
    expect(source).not.toMatch(/toInp\.min\s*=/);
    expect(source).not.toMatch(/fromInp\.max\s*=/);
  });
});
