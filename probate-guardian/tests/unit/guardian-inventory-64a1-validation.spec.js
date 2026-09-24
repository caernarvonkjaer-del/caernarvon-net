// Milestone 64A-1: validateGuardian() (Verified Initial Inventory) was
// stricter than the Sixth Circuit's own form on three points. Each test
// below is red-first per AGENTS.md section 2 -- see the commit that adds
// it for the stash/rerun evidence.
//
// guardian-inventory/index.js transitively imports src/core/party-resolver.js,
// which does `window.resolveParty = resolveParty` etc. at module scope --
// executed at import time, before any statement in this file's own body can
// run (ES import specifiers are hoisted ahead of ordinary statements,
// including a plain `global.window = global` at the top of the file). window
// must exist as an object before the import resolves, so the module is
// imported dynamically inside beforeAll(), after vi.stubGlobal('window', ...).
//
// index.js's own top level also does `const { ..., SCHEDULE_NAV_KEYS } =
// window` -- a one-time destructure of legacy-app.js's classic-script
// globals, copied at import time, not a live reference. validateGuardian()
// itself only ever reads SCHEDULE_NAV_KEYS from that list (verified by
// reading the whole function, index.js:1207-1310), so that's the only one
// this stub needs a real value for; the rest can stay undefined.
import { afterAll, beforeAll, beforeEach, describe, test, expect, vi } from 'vitest';

let validateGuardian;

beforeAll(async () => {
  // Mirrors legacy-app.js:6487's SCHEDULE_NAV_KEYS literal.
  vi.stubGlobal('window', { SCHEDULE_NAV_KEYS: ['a1', 'a2', 'b1', 'b2', 'b3', 'b4', 'c1', 'c2', 'c3', 'c4', 'c5'] });
  ({ validateGuardian } = await import('../../src/features/guardian-inventory/index.js'));
});

afterAll(() => {
  vi.unstubAllGlobals();
});

// Mirrors legacy-app.js's emptyDataGuardian() shape (read 2026-09-22), not a
// copy that can drift silently on its own -- only the fields
// validateGuardian() actually reads are populated per test, since this file
// asserts the presence/absence of specific issues, not a zero-error filing.
function baseGuardianData(overrides = {}) {
  return {
    wardName: '', caseNumber: '', ucn: '', gid: null, county: '', guardianName: '',
    attorneyForGuardian: '', typeOfGuardianship: '', hasSafeDepositBox: '',
    safeDepositBoxFiled: '', amendedForm: '',
    scheduleA1: [], scheduleA2: [], scheduleB1: [], scheduleB2: [], scheduleB3: [],
    scheduleB4: [], scheduleC1: [], scheduleC2: [], scheduleC3: [], scheduleC4: [], scheduleC5: [],
    scheduleNoItems: {},
    guardians: [{ name: '', ssnEin: '', phone: '', streetAddress: '', cityStateZip: '', signatureDate: null, signatureState: '', signatureImage: '' }],
    preparer: { name: '', ssnEin: '', phone: '', streetAddress: '', cityStateZip: '', signatureDate: null, signatureState: '', signatureImage: '' },
    attorney: { name: '', barNumber: '', phone: '', streetAddress: '', cityStateZip: '', signatureDate: null, filingDate: null, signatureState: '', signatureImage: '' },
    bondAmount: '', bondPeriodFrom: null, bondPeriodTo: null, bondingCompany: '', bondWaived: '', bondWaivedDate: '',
    serviceNoRecipients: '', serviceIndicateIf: '',
    serviceRecipients: [{ name: '', address: '', cityStateZip: '' }, { name: '', address: '', cityStateZip: '' }],
    serviceDate: null, serviceAttorney: { name: '', barNumber: '', phone: '', streetAddress: '', cityStateZip: '', signatureState: '', signatureImage: '' },
    witnesses: [],
    ...overrides,
  };
}

beforeEach(() => {
  window.D = baseGuardianData();
});

describe('Milestone 64A-1, item 3.2: Schedule B-4 "Related Personal Property Asset (if secured)"', () => {
  // Form B-4 (C6/C7) lists unsecured debts -- credit cards, medical and
  // facility bills, notes, tax and judgment liens -- and secured ones
  // separately; the form never requires every B-4 entry to name a related
  // asset. Requiring it here blocked a filer with a genuinely unsecured
  // debt from ever completing B-4.
  test('a B-4 row with no related property no longer raises a Related Property error', () => {
    window.D.scheduleB4 = [{
      lenderName: 'Capital One', lenderAddress: '123 Main St, Largo FL 33770',
      liabilityType: 'Credit Card', fullLiabilityBalance: 1000, wardPercent: 100,
      // relatedProperty intentionally omitted -- this is the unsecured case.
    }];
    const errors = validateGuardian();
    const relatedPropertyIssue = errors.find(e => e.path === 'scheduleB4.0.relatedProperty');
    expect(relatedPropertyIssue).toBeUndefined();
  });

  test('a B-4 row still requires Lender Name, Lender Address, and a positive balance', () => {
    window.D.scheduleB4 = [{ fullLiabilityBalance: 0, wardPercent: 100 }];
    const errors = validateGuardian();
    expect(errors.some(e => e.path === 'scheduleB4.0.lenderName')).toBe(true);
    expect(errors.some(e => e.path === 'scheduleB4.0.lenderAddress')).toBe(true);
    expect(errors.some(e => e.path === 'scheduleB4.0.fullLiabilityBalance')).toBe(true);
  });
});

describe('Milestone 64A-1, item 3.1: Schedule C-3 Action Date and Case Number', () => {
  // Form C-3: C6 "Include those lawsuits that are intended to be brought,
  // even if not yet filed"; C8 "If an Action has been filed by the Ward,
  // indicate the Date"; C11 "Case number, if filed." A lawsuit the ward
  // intends to bring but hasn't filed yet has neither a date nor a case
  // number by definition -- requiring them blocked the exact case the form
  // itself describes.
  test('a C-3 row with no Action Date no longer raises an Action Date error', () => {
    window.D.scheduleC3 = [{
      defendantName: 'John Smith', actionDescription: 'Negligence',
      status: 'Pre-suit investigation', courtJurisdiction: 'Pinellas County Circuit Court',
      estimatedSettlement: 5000, wardPercent: 100,
      // actionDate intentionally omitted -- not yet filed.
    }];
    const errors = validateGuardian();
    expect(errors.some(e => e.path === 'scheduleC3.0.actionDate')).toBe(false);
  });

  test('a C-3 row still requires Defendant, Action Description, Status, Court/Jurisdiction, and a positive Estimated Settlement', () => {
    window.D.scheduleC3 = [{ estimatedSettlement: 0, wardPercent: 100 }];
    const errors = validateGuardian();
    expect(errors.some(e => e.path === 'scheduleC3.0.defendantName')).toBe(true);
    expect(errors.some(e => e.path === 'scheduleC3.0.actionDescription')).toBe(true);
    expect(errors.some(e => e.path === 'scheduleC3.0.status')).toBe(true);
    expect(errors.some(e => e.path === 'scheduleC3.0.courtJurisdiction')).toBe(true);
    expect(errors.some(e => e.path === 'scheduleC3.0.estimatedSettlement')).toBe(true);
  });
});

// Milestone 64A-1's D16 relaxed the four bond fields only when the bond was
// on record as waived. Milestone 67B (decided 2026-09-23) went the rest of
// the way: nothing in the D-4 bond block gates export at all -- the court's
// form asks for the bond details where they apply, which is not the court
// refusing a filing without them, and the requester's rule is that blocking
// should be rare. The print preview warns instead (bond-depository.spec.js).
describe('Milestone 67B: nothing in the D-4 bond block gates export', () => {
  const BOND_PATHS = ['bondAmount', 'bondPeriodFrom', 'bondPeriodTo', 'bondingCompany', 'bondWaivedDate', 'restrictedDepositoryReceiptDate', 'bondDepositoryState'];
  const bondIssues = () => validateGuardian().filter(e => BOND_PATHS.includes(e.path) || /^D-4/.test(String(e.message ?? e)));

  test.each([
    ['unanswered', ''],
    ['restricted depository only', 'depository-only'],
    ['bond and restricted depository', 'bond-and-depository'],
    ['bond only', 'bond-only'],
    ['bond waived by court order', 'bond-waived'],
  ])('%s with every bond field blank raises no D-4 issue', (_label, state) => {
    Object.assign(window.D, {
      bondDepositoryState: state,
      bondAmount: '', bondPeriodFrom: null, bondPeriodTo: null, bondingCompany: '', bondWaivedDate: '', restrictedDepositoryReceiptDate: '',
    });
    expect(bondIssues()).toEqual([]);
  });

  test('a bond period entered backwards is still reported -- that is an ordering check, not a requirement', () => {
    Object.assign(window.D, { bondDepositoryState: 'bond-only', bondPeriodFrom: '2026-12-31', bondPeriodTo: '2026-01-01' });
    expect(validateGuardian().some(e => e.path === 'bondPeriodTo')).toBe(true);
  });

  test('the retired bondWaived tri-state is not consulted -- a legacy Yes with no date blocks nothing', () => {
    Object.assign(window.D, { bondWaived: 'Yes', bondWaivedDate: '', bondDepositoryState: '' });
    expect(bondIssues()).toEqual([]);
    expect(validateGuardian().some(e => e.code === 'filing.bond-waiver.incomplete')).toBe(false);
  });
});

describe('Milestone 64A-2, item 2.4: D-5 "Indicate if:" is required', () => {
  // Form PART VI J24 "Indicate if:" with list (J25): Ward is totally
  // incapacitated / Ward is under 14 years old / N/A. No such field existed
  // before; D-5 never asked, and never validated on it.
  test('unanswered serviceIndicateIf blocks D-5', () => {
    window.D.serviceIndicateIf = '';
    const errors = validateGuardian();
    expect(errors.some(e => e.path === 'serviceIndicateIf')).toBe(true);
  });

  test('"N/A" is a real, complete answer -- not treated as unanswered', () => {
    window.D.serviceIndicateIf = 'N/A';
    const errors = validateGuardian();
    expect(errors.some(e => e.path === 'serviceIndicateIf')).toBe(false);
  });

  test('either of the two substantive answers satisfies it', () => {
    window.D.serviceIndicateIf = 'Ward is totally incapacitated';
    expect(validateGuardian().some(e => e.path === 'serviceIndicateIf')).toBe(false);
    window.D.serviceIndicateIf = 'Ward is under 14 years old';
    expect(validateGuardian().some(e => e.path === 'serviceIndicateIf')).toBe(false);
  });
});
