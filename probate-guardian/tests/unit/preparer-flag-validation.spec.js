// Milestone 67A. The Initial Inventory told a guardian, co-guardian or
// guardian attorney "DO NOT SIGN HERE" on the Preparer block, then required
// all six of its fields and a signature anyway. validateGuardian() now skips
// the block while a guardian or the attorney is identified as the preparer
// (src/core/form/preparer-flag.js) -- and touches nothing else.
//
// validateAnnual() carries the same rule but its module cannot be imported
// under Node (see checklist-export-parity.spec.js); tests/e2e/preparer-
// flag.spec.ts covers it in the browser, alongside this form's UI.
//
// Import technique: guardian-inventory-64a1-validation.spec.js's -- the
// module destructured legacy-app.js globals off `window` at import time
// (until Milestone 70's 70K), so `window` is stubbed before the dynamic import.
import { afterAll, beforeAll, beforeEach, describe, test, expect, vi } from 'vitest';
import { openFiling } from './support/open-filing.js';
import { emptyDataGuardian } from '../../src/core/filing/models/guardian.js';
import { getD } from '../../src/core/state.js';

let validateGuardian;

beforeAll(async () => {
  vi.stubGlobal('window', {});
  ({ validateGuardian } = await import('../../src/features/guardian-inventory/index.js'));
});

afterAll(() => {
  vi.unstubAllGlobals();
});

const guardianRow = (overrides = {}) => ({
  name: '', ssnEin: '', phone: '', streetAddress: '', cityStateZip: '', signatureDate: null, signatureState: '', signatureImage: '', isPreparer: false, ...overrides,
});

// The real blank Initial Inventory (src/core/filing/models/guardian.js), with
// each test's own values over it. Until Milestone 70's 70L this was a literal
// copy of legacy-app.js's emptyDataGuardian(), which could drift from it; the
// tests assert the presence or absence of specific issues, not a zero-error
// filing.
function baseGuardianData(overrides = {}) {
  return { ...emptyDataGuardian(), ...overrides };
}

const messages = () => validateGuardian().map((e) => String(e?.message ?? e));
const startingWith = (prefix) => messages().filter((m) => m.startsWith(prefix));

beforeEach(() => {
  openFiling(baseGuardianData());
});

describe('Milestone 67A: validateGuardian() and the preparer flag', () => {
  test('nobody identified: the preparer block is required -- name, SSN/EIN, phone, address, and the signature', () => {
    const preparer = startingWith('D-2 Preparer');
    expect(preparer.length).toBeGreaterThanOrEqual(5);
    expect(preparer.some((m) => m.includes('Name'))).toBe(true);
    expect(preparer.some((m) => m.includes('SSN/EIN'))).toBe(true);
    expect(preparer.some((m) => m.includes('City/State/Zip'))).toBe(true);
  });

  test('a guardian identified as the preparer: every preparer issue is gone, the attorney block is untouched', () => {
    getD().guardians[0].isPreparer = true;
    expect(startingWith('D-2 Preparer')).toEqual([]);
    expect(startingWith('D-2 Attorney').length, 'the attorney block keeps its own requirements').toBeGreaterThan(0);
    // And the guardian's own requirements still stand.
    expect(startingWith('D-1 Guardian #1').length).toBeGreaterThan(0);
  });

  test('the attorney identified as the preparer: the same', () => {
    getD().attorney.isPreparer = true;
    expect(startingWith('D-2 Preparer')).toEqual([]);
    expect(startingWith('D-2 Attorney').length).toBeGreaterThan(0);
  });

  test('a co-guardian card ticked as the preparer is not a blank card: its name is required', () => {
    // Before the flag, a co-guardian row with nothing else typed was skipped
    // as blank. A ticked box is data, and a nameless preparer would print
    // "Prepared by [name]".
    getD().guardians = [guardianRow({ name: 'Rachel Alvarez' }), guardianRow({ isPreparer: true })];
    expect(startingWith('D-2 Preparer')).toEqual([]);
    expect(startingWith('D-1 Guardian #2').some((m) => m.includes('Name'))).toBe(true);
  });

  test('a legacy row with no isPreparer key at all behaves exactly as before', () => {
    const { isPreparer, ...legacyGuardian } = guardianRow();
    const { isPreparer: _a, ...legacyAttorney } = baseGuardianData().attorney;
    openFiling(baseGuardianData({ guardians: [legacyGuardian], attorney: legacyAttorney }));
    expect(startingWith('D-2 Preparer').length).toBeGreaterThanOrEqual(5);
  });
});
