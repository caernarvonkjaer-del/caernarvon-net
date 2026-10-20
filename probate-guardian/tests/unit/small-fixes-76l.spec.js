// Milestone 76L items 4, 5 and 6.
//  4. The C-1 yearly-total helper rounded the retired way (Math.round of the
//     float): a payment of $1.005 a year proposed $1.00, where every figure the
//     app prints rounds it to $1.01 (Milestone 71's rule).
//  5. (decision 76L-1) The Initial Plan's new year cleared where the ward
//     lives, the mailing address and the guardianship's facts.
//  6. The Simplified Plan's new year kept last year's attorney signature date.
import { describe, expect, test, vi } from 'vitest';

vi.mock('../../src/core/navigation/router.js', () => ({ navigate: () => {}, renderPage: () => {} }));
globalThis.window = globalThis.window || globalThis;

const { initializeEmptyData } = await import('../../src/core/filing/filing-registry.js');
const years = await import('../../src/core/filing/filing-years.js');
const { yearlyTotal } = await import('../../src/core/form/entry-helpers.js');

const json = (x) => JSON.parse(JSON.stringify(x));
const newYear = (type, extra) => {
  const d = { ...json(initializeEmptyData(type)), inventoryType: type, ...json(extra) };
  years.resetYearlyFieldsForNewYear(d, type);
  return d;
};

describe('item 4: the yearly total rounds as every figure the app prints', () => {
  test('a sub-cent payment', () => {
    expect(yearlyTotal('1.005', 'Annually')).toBe(1.01);
    expect(yearlyTotal('$1,850', 'Monthly')).toBe(22200);
    expect(yearlyTotal('about 5', 'Monthly')).toBe(null);
  });
});

describe('item 5 (decision 76L-1): the Initial Plan\'s new year keeps the ward\'s details', () => {
  test('residence, mailing address and the guardianship\'s facts carry; the year\'s answers clear', () => {
    const kept = {
      wardLiving: 'In a facility (Skilled Nursing, Assisted Living, etc).',
      residenceAddress: '14 Palm Court', residenceCityStateZip: 'Clearwater, FL 33755', residencePhone: '727-555-0101',
      mailingAddress: 'PO Box 9', mailingCityStateZip: 'Clearwater, FL 33757', mailingSameAsResidence: true,
      inceptionDate: '2026-01-10', lettersSignedDate: '2026-01-12', successorGuardianship: 'No',
    };
    const d = newYear('planInitial', { ...kept, periodFrom: '2026-01-12', periodTo: '2026-03-12', q1PreexistingDirectives: 'None', q2ALF: true });
    expect(d).toMatchObject(kept);
    expect(d).toMatchObject({ periodFrom: '', periodTo: '', q1PreexistingDirectives: '', q2ALF: false });
    expect(years.newYearNote('planInitial')).toContain('where the ward lives');
  });
});

describe('item 6: the Simplified Plan\'s new year clears the attorney\'s signature date', () => {
  test('as every other form does', () => {
    expect(newYear('planSimplified', { attorney_signatureDate: '2025-12-01', preparer_signatureDate: '2025-12-01' }))
      .toMatchObject({ attorney_signatureDate: '', preparer_signatureDate: '' });
  });
});
