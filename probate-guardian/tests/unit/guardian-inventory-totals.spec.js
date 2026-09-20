import { describe, expect, test } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  n, r2, wardShare, isRestrictedAnswer, auditFeeFor, makeGuardianCalc, calcTotalsGuardian,
  GUARDIAN_CALC_METHODS, AUDIT_FEE_THRESHOLD, AUDIT_FEE_OVER_THRESHOLD,
} from '../../src/features/guardian-inventory/totals.js';

// Milestone 60A. The Verified Initial Inventory's arithmetic, checked against
// the court workbook's own formulas (templates/guardian-template.js, read
// 2026-09-20 -- see totals.js's header for the cell citations), never against
// the live UI: the UI now consumes this module, so it can only agree.

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

const empty = () => ({
  scheduleA1: [], scheduleA2: [], scheduleB1: [], scheduleB2: [], scheduleB3: [], scheduleB4: [],
  scheduleC1: [], scheduleC2: [], scheduleC3: [], scheduleC4: [], scheduleC5: [],
});

// Three rows whose ward shares each carry sub-cent residue. Workbook method
// (sum the raw products, round the aggregate): 333.316665 + 1667.116685 +
// 41.66625 = 2042.0996 -> $2,042.10. Legacy method (round each row, then
// sum): 333.32 + 1667.12 + 41.67 = $2,042.11. Reproduced against the shipped
// legacy-app.js source before this module existed: 2042.11.
const ROUNDING_ROWS = [
  { fullAssetValue: '1000.05', wardPercent: '33.33' },
  { fullAssetValue: '2500.55', wardPercent: '66.67' },
  { fullAssetValue: '333.33', wardPercent: '12.5' },
];

describe('wardShare: the workbook\'s bare product', () => {
  test('is full × percent / 100 at full precision -- no rounding', () => {
    expect(wardShare('1000.05', '33.33')).toBeCloseTo(333.316665, 9);
    expect(wardShare(200, 50)).toBe(100);
  });

  test('a blank, null, or unparseable percentage is 0%, as a blank Ward\'s % cell is in the workbook', () => {
    expect(wardShare('1000', '')).toBe(0);
    expect(wardShare('1000', null)).toBe(0);
    expect(wardShare('1000', undefined)).toBe(0);
    expect(wardShare('1000', 'abc')).toBe(0);
  });

  test('a blank or unparseable full value is 0', () => {
    expect(wardShare('', '100')).toBe(0);
    expect(wardShare('n/a', '100')).toBe(0);
    expect(n('12.5')).toBe(12.5);
    expect(n('')).toBe(0);
    expect(n(Infinity)).toBe(0);
  });
});

describe('rounding contract: unrounded rows, unrounded sums, cents only at display', () => {
  test('the schedule total is the rounded aggregate, not the sum of the rounded rows', () => {
    const c = makeGuardianCalc({ ...empty(), scheduleA1: ROUNDING_ROWS });
    const rows = ROUNDING_ROWS.map(c.wardVal);
    // Rows are unrounded ...
    expect(rows[0]).toBeCloseTo(333.316665, 9);
    // ... their displayed (rounded) values sum to one figure ...
    expect(rows.map(r2).reduce((a, b) => a + b, 0)).toBeCloseTo(2042.11, 9);
    // ... and the module's total, rounded for display, is the OTHER figure --
    // the one the workbook prints.
    expect(r2(c.totalA1())).toBe(2042.1);
    expect(r2(calcTotalsGuardian({ ...empty(), scheduleA1: ROUNDING_ROWS }).totalA1)).toBe(2042.1);
  });

  test('every total is returned unrounded so callers can aggregate further before rounding', () => {
    const c = makeGuardianCalc({ ...empty(), scheduleA1: ROUNDING_ROWS });
    expect(c.totalA1()).not.toBe(r2(c.totalA1()));
    expect(c.totalA1()).toBeCloseTo(2042.0996, 9);
  });
});

describe('isRestrictedAnswer', () => {
  test('a current explicit string wins; the legacy boolean only fills a missing answer', () => {
    expect(isRestrictedAnswer({ restricted: 'Yes' })).toBe(true);
    expect(isRestrictedAnswer({ restricted: 'No', isRestricted: true })).toBe(false);
    expect(isRestrictedAnswer({ restricted: '', isRestricted: true })).toBe(true);
    expect(isRestrictedAnswer({ isRestricted: true })).toBe(true);
    expect(isRestrictedAnswer({ restricted: '' })).toBe(false);
    expect(isRestrictedAnswer(undefined)).toBe(false);
  });
});

describe('audit fee: PART V!G8/G9, two tiers only', () => {
  test.each([
    [0, 0], [24999.99, 0], [25000.01, 85], [100000, 85], [100000.01, 85], [500000, 85], [500000.01, 85], [9999999, 85],
  ])('a total of %s is $%s', (total, fee) => {
    expect(auditFeeFor(total)).toBe(fee);
  });

  // Unresolved authority gap (MILESTONE-60-PROPOSAL.md, 60A): the form names
  // "in excess of $25,000" and "below $25,000" and nothing for the boundary.
  // This pins the pre-existing `> 25000` reading so any change is deliberate;
  // it does NOT certify $0 as the court's answer.
  test('exactly $25,000 keeps today\'s $0 (unresolved boundary, pinned not certified)', () => {
    expect(auditFeeFor(25000)).toBe(0);
    expect(AUDIT_FEE_THRESHOLD).toBe(25000);
    expect(AUDIT_FEE_OVER_THRESHOLD).toBe(85);
  });

  test('the comparison is made on the cents-rounded total, so float residue on the boundary cannot flip it', () => {
    expect(auditFeeFor(25000.0000001)).toBe(0);
    expect(auditFeeFor(25000.005)).toBe(85); // rounds to 25000.01
  });

  test('the fee is on the net inventory value (Summary I total), not on Schedule C', () => {
    // SUMMARY I!B39 is =H32+H38 -- Schedules A and B only.
    const c = makeGuardianCalc({ ...empty(), scheduleC1: [{ annualIncomeAmount: '90000', wardPercent: '100' }] });
    expect(c.total()).toBe(0);
    expect(c.auditFee()).toBe(0);
  });
});

describe('schedule totals, summaries and bond lines against the workbook formulas', () => {
  // Hand-computed. Every B-1/B-3 row is 50% so restricted/unrestricted
  // splits are visibly apportioned.
  const D = {
    ...empty(),
    scheduleA1: [{ fullAssetValue: '200000', wardPercent: '50' }],            // 100000
    scheduleA2: [{ fullDebtBalance: '50000', wardPercent: '50' }],            // 25000
    scheduleB1: [
      { fullAssetAmount: '10000', wardPercent: '50', restricted: 'Yes' },    // 5000 restricted
      { fullAssetAmount: '6000', wardPercent: '50', restricted: 'No' },      // 3000 unrestricted
      { fullAssetAmount: '4000', wardPercent: '50', isRestricted: true },    // 2000 restricted (legacy flag)
    ],
    scheduleB2: [{ fullAssetValue: '8000', wardPercent: '50' }],              // 4000
    scheduleB3: [
      { fullAssetValue: '20000', wardPercent: '50', restricted: 'Yes' },     // 10000 restricted
      { fullAssetValue: '2000', wardPercent: '50', restricted: '' },         // 1000 unrestricted
    ],
    scheduleB4: [{ fullLiabilityBalance: '3000', wardPercent: '50' }],        // 1500
    scheduleC1: [{ annualIncomeAmount: '1200', wardPercent: '50' }],          // 600
    scheduleC2: [{ amountOfClaim: '700', wardPercent: '50' }],                // 350
    scheduleC3: [{ estimatedSettlement: '900', wardPercent: '50' }],          // 450
    scheduleC4: [{ trustAmount: '5000', wardPercent: '50' }],                 // 2500
    scheduleC5: [{ totalAssetValue: '3000', jointOwnerPercent: '50' }],       // 1500
  };

  test('Summary I: SUMMARY I!H32 = A-1 - A-2, H38 = B-1 + B-2 + B-3 - B-4, H39 = H32 + H38, none clamped', () => {
    const t = calcTotalsGuardian(D);
    expect(t.totalA1).toBe(100000);
    expect(t.totalA2).toBe(25000);
    expect(t.netA).toBe(75000);
    expect(t.totalB1).toBe(10000);
    expect(t.totalB2).toBe(4000);
    expect(t.totalB3).toBe(11000);
    expect(t.totalB4).toBe(1500);
    expect(t.netB).toBe(23500);
    expect(t.total).toBe(98500);
  });

  test('a net is negative when debts exceed assets -- the workbook prints it, it does not clamp', () => {
    const t = calcTotalsGuardian({ ...empty(), scheduleA1: [{ fullAssetValue: '1000', wardPercent: '100' }], scheduleA2: [{ fullDebtBalance: '5000', wardPercent: '100' }] });
    expect(t.netA).toBe(-4000);
    expect(t.total).toBe(-4000);
  });

  test('Summary II: each Schedule C total is the ward\'s share (C-5 by the joint owner\'s %)', () => {
    const t = calcTotalsGuardian(D);
    expect([t.totalC1, t.totalC2, t.totalC3, t.totalC4, t.totalC5]).toEqual([600, 350, 450, 2500, 1500]);
  });

  test('PART V rows 18-23: restricted/unrestricted splits and the bond requirement = row 20 + row 21 + row 22', () => {
    const t = calcTotalsGuardian(D);
    expect(t.restrictedCash).toBe(7000);        // row 18: 5000 + 2000
    expect(t.restrictedIntang).toBe(10000);     // row 19
    expect(t.unrestrictedCash).toBe(3000);      // row 20: B-1 total 10000 - 7000
    expect(t.totalB2).toBe(4000);               // row 21
    expect(t.unrestrictedIntang).toBe(1000);    // row 22: B-3 total 11000 - 10000
    expect(t.bondRequired).toBe(8000);          // row 23: 3000 + 4000 + 1000
    // Row 20 + row 18 reconciles to the schedule total, as the workbook's subtraction implies.
    expect(t.unrestrictedCash + t.restrictedCash).toBe(t.totalB1);
    expect(t.unrestrictedIntang + t.restrictedIntang).toBe(t.totalB3);
  });

  // Milestone 60K. 'B-2 PER PROP pg 1'!I18 =IF(H18="Yes",G18,0) and
  // 'B-3 INTANGIBLE pg 1;'!K62 =IF(J62="Yes",(IF(E62="Yes",I62,H62)),0) --
  // both resolve to the ward share when the box answer is Yes, else 0. Derived
  // from the answer every time; nothing is stored.
  test('safe-deposit amounts derive from the Yes/No answer and the ward share, and total per schedule', () => {
    const c = makeGuardianCalc({
      ...empty(),
      scheduleB2: [
        { fullAssetValue: '1000', wardPercent: '50', inSafeDepositBox: 'Yes' },
        { fullAssetValue: '2000', wardPercent: '100', inSafeDepositBox: 'No' },
        { fullAssetValue: '400', wardPercent: '100', inSafeDepositBox: '' },
        { fullAssetValue: '300', wardPercent: '100', inSafeDepositBox: true },   // legacy boolean, pre-normalization
      ],
      scheduleB3: [
        { fullAssetValue: '1000', wardPercent: '50', restricted: 'Yes', inSafeDepositBox: 'Yes' },
        { fullAssetValue: '2000', wardPercent: '100', restricted: 'No', inSafeDepositBox: 'No' },
      ],
    });
    expect(c.sdbB2({ fullAssetValue: '1000', wardPercent: '50', inSafeDepositBox: 'Yes' })).toBe(500);
    expect(c.sdbB2({ fullAssetValue: '1000', wardPercent: '50', inSafeDepositBox: 'No' })).toBe(0);
    expect(c.sdbB2({ fullAssetValue: '1000', wardPercent: '50', inSafeDepositBox: 'No', amountInSDB: 999 })).toBe(0);
    expect(c.totalSdbB2()).toBe(800);
    expect(c.sdbB3({ fullAssetValue: '1000', wardPercent: '50', inSafeDepositBox: 'Yes' })).toBe(500);
    expect(c.totalSdbB3()).toBe(500);
    const t = calcTotalsGuardian({ ...empty(), scheduleB2: [{ fullAssetValue: '1000', wardPercent: '50', inSafeDepositBox: 'Yes' }] });
    expect(t.totalSdbB2).toBe(500);
    expect(t.totalSdbB3).toBe(0);
  });

  test('a missing schedule array is an empty schedule, not a crash', () => {
    const t = calcTotalsGuardian({});
    expect(t.total).toBe(0);
    expect(t.bondRequired).toBe(0);
    expect(t.auditFee).toBe(0);
    expect(makeGuardianCalc(undefined).totalA1()).toBe(0);
  });

  test('calcTotalsGuardian() exposes every schedule-level method and nothing per-row', () => {
    const keys = Object.keys(calcTotalsGuardian(D)).sort();
    // Per-row helpers take an entry: the ward shares and the derived
    // safe-deposit amounts (60K). Everything else is a schedule-level figure.
    const scheduleLevel = GUARDIAN_CALC_METHODS.filter((m) => !/^(ward|sdb)/.test(m)).sort();
    expect(keys).toEqual(scheduleLevel);
  });
});

// Completion criterion 3 (MILESTONE-60-PROPOSAL.md): the live UI and the PDF
// must agree because they share one implementation, not because two copies
// happen to match. legacy-app.js is a classic script, so its `calc` adapter
// is sliced out of the shipped source and evaluated here against this module
// -- proving the code that ships forwards to it, and that the adapter's
// figures on the rounding fixture are the workbook's, not the old per-row
// rounding. Same convention as cell-reader.spec.js and
// date-truncation-helpers.spec.js.
describe('legacy-app.js\'s calc adapter forwards to this module', () => {
  const src = fs.readFileSync(path.join(root, 'src', 'legacy-app.js'), 'utf8');
  const start = src.indexOf('const GUARDIAN_CALC_METHODS=');
  const end = src.indexOf('window.calc=calc;', start);
  const body = src.slice(start, end);

  const buildAdapter = (D) => {
    const win = { makeGuardianCalc };
    return new Function('window', 'D', `${body}\nreturn calc;`)(win, D);
  };

  test('the adapter block is present and self-contained', () => {
    expect(start).toBeGreaterThan(0);
    expect(end).toBeGreaterThan(start);
    // The old formulas are gone from the classic script (secondary evidence;
    // the behavioral parity below is the proof).
    expect(body).not.toMatch(/wardPercent\|\|0\)\/100/);
    expect(body).not.toMatch(/r2\(/);
  });

  test('every method name the UI calls exists on both the adapter and the module', () => {
    const adapter = buildAdapter(empty());
    expect(Object.keys(adapter).sort()).toEqual([...GUARDIAN_CALC_METHODS].sort());
  });

  test('parity: adapter figures equal the module\'s for a mixed-percentage filing', () => {
    const D = {
      ...empty(),
      scheduleA1: ROUNDING_ROWS,
      scheduleA2: [{ fullDebtBalance: '1234.56', wardPercent: '33.33' }],
      scheduleB1: [{ fullAssetAmount: '9876.54', wardPercent: '66.67', restricted: 'Yes' }, { fullAssetAmount: '100', wardPercent: '12.5', restricted: 'No' }],
      scheduleB2: [{ fullAssetValue: '777.77', wardPercent: '50' }],
      scheduleB3: [{ fullAssetValue: '5555.55', wardPercent: '25', restricted: 'Yes' }],
      scheduleB4: [{ fullLiabilityBalance: '321', wardPercent: '75' }],
      scheduleC5: [{ totalAssetValue: '4000', jointOwnerPercent: '33.33' }],
    };
    const adapter = buildAdapter(D);
    const t = calcTotalsGuardian(D);
    for (const key of Object.keys(t)) {
      expect(adapter[key](), key).toBe(t[key]);
    }
    expect(adapter.wardVal(D.scheduleA1[0])).toBe(makeGuardianCalc(D).wardVal(D.scheduleA1[0]));
  });

  test('the adapter reads window.D live: the rounding fixture gives the workbook\'s $2,042.10 through it', () => {
    const D = { ...empty(), scheduleA1: ROUNDING_ROWS };
    const adapter = buildAdapter(D);
    expect(r2(adapter.totalA1())).toBe(2042.1);
    // Mutating the filing is seen on the next call -- no snapshot.
    D.scheduleA1 = [{ fullAssetValue: '100', wardPercent: '100' }];
    expect(adapter.totalA1()).toBe(100);
  });

  test('the adapter fails loudly rather than printing $0.00 if the module never loaded', () => {
    const adapter = new Function('window', 'D', `${body}\nreturn calc;`)({}, empty());
    expect(() => adapter.total()).toThrow(/Guardian calculator not loaded/);
  });
});
