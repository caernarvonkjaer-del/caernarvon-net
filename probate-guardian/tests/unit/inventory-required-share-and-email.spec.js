// Milestone 72B. Two Initial Inventory requirements the page already marked
// and the export never checked.
//
// A blank share on A-2 to C-5 used to pass. A blank counts as 0% in
// wardShare() and in the Clerk's workbook (full x share), so the asset
// silently dropped out of the ward's totals, the bond and the audit-fee base.
// It is now reported, as the Annual's Schedule D reports one (decided
// 2026-10-01) -- and 0 is an answer, never reported. A-1 keeps its own
// "must be > 0".
//
// D-2's "Primary Email (e-filing)" carried the required marker once an
// attorney is entered, but an Inventory with an attorney exported without
// one. It is now required then, as on the Annual and the Simplified, and a
// filing with no attorney is untouched (AGENTS.md section 4).
//
// Imported dynamically after window exists: see
// guardian-inventory-64a1-validation.spec.js for why.
import { afterAll, beforeAll, beforeEach, describe, test, expect, vi } from 'vitest';
import { openFiling } from './support/open-filing.js';
import { emptyDataGuardian, mk } from '../../src/core/filing/models/guardian.js';
import { getD } from '../../src/core/state.js';
import { sectionMarks } from '../../src/core/status/section-marks.js';

let validateGuardian;

beforeAll(async () => {
  vi.stubGlobal('window', {});
  ({ validateGuardian } = await import('../../src/features/guardian-inventory/index.js'));
});
afterAll(() => vi.unstubAllGlobals());
beforeEach(() => openFiling({ ...emptyDataGuardian() }));

const messages = () => validateGuardian().map((e) => String(e.message ?? e));
const paths = () => validateGuardian().map((e) => e.path);

// Each schedule, its row factory, its share field and its label.
const SHARES = [
  ['scheduleA2', 'A-2', mk.a2, 'wardPercent', "Ward's %"],
  ['scheduleB1', 'B-1', mk.b1, 'wardPercent', "Ward's %"],
  ['scheduleB2', 'B-2', mk.b2, 'wardPercent', "Ward's %"],
  ['scheduleB3', 'B-3', mk.b3, 'wardPercent', "Ward's %"],
  ['scheduleB4', 'B-4', mk.b4, 'wardPercent', "Ward's %"],
  ['scheduleC1', 'C-1', mk.c1, 'wardPercent', "Ward's %"],
  ['scheduleC2', 'C-2', mk.c2, 'wardPercent', "Ward's %"],
  ['scheduleC3', 'C-3', mk.c3, 'wardPercent', "Ward's %"],
  ['scheduleC4', 'C-4', mk.c4, 'wardPercent', "Ward's %"],
  ['scheduleC5', 'C-5', mk.c5, 'jointOwnerPercent', "Joint Owner's %"],
];

describe('a blank share on A-2 to C-5 is required; 0 is an answer', () => {
  for (const [collection, route, make, field, label] of SHARES) {
    test(`${route}: blank is reported by field, 0 and 50 are not`, () => {
      const required = `${route} row 2 — ${label}`;
      const path = `${collection}.1.${field}`;
      for (const [value, reported] of [['', true], [null, true], [undefined, true], [0, false], ['0', false], [50, false]]) {
        getD()[collection] = [make(), { ...make(), [field]: value }];
        expect(messages().includes(required), `${route} share ${JSON.stringify(value)}`).toBe(reported);
        if (reported) expect(paths(), 'Go to field lands on the share').toContain(path);
      }
    });
  }

  test('A-1 is unchanged: blank, 0 and a negative share report "must be > 0", 50 passes', () => {
    for (const [value, reported] of [['', true], [0, true], [-5, true], [50, false]]) {
      getD().scheduleA1 = [{ ...mk.a1(), wardPercent: value }];
      expect(messages().some((m) => m.startsWith('A-1 row 1') && /Ward/.test(m) && /> 0|required/.test(m)), `A-1 ${JSON.stringify(value)}`).toBe(reported);
      expect(messages().includes("A-1 row 1 — Ward's %"), 'A-1 does not get the new message').toBe(false);
    }
  });

  test("the schedule's sidebar mark follows the validator: a complete row with a blank share is unfinished, with 0 it is finished", () => {
    const row = { ...mk.b1(), institutionName: 'First Bank', accountType: 'Checking', streetAddress: '1 Main St', cityStateZip: 'Largo, FL 33770', restricted: 'No', fullAssetAmount: 2500 };
    getD().scheduleB1 = [{ ...row, wardPercent: '' }];
    expect(sectionMarks(getD(), 'guardian').checks.b1).toBe(false);
    getD().scheduleB1 = [{ ...row, wardPercent: 0 }];
    expect(sectionMarks(getD(), 'guardian').checks.b1).toBe(true);
  });
});

describe("D-2: the attorney's primary email once an attorney is entered", () => {
  const ATTORNEY = { name: 'Rachel Lawyer', barNumber: '0123456', phone: '727-555-0100', streetAddress: '1 Court St', cityStateZip: 'Clearwater, FL 33756', filingDate: '2026-03-01', signatureDate: '2026-03-01' };

  test('an attorney with no email is reported, on the email field', () => {
    getD().attorneyForGuardian = 'Rachel Lawyer';
    getD().attorney = { ...getD().attorney, ...ATTORNEY, email: '' };
    expect(messages()).toContain('D-2 Attorney — Primary Email');
    expect(paths()).toContain('attorney.email');
  });

  test('an attorney with an email is not reported', () => {
    getD().attorneyForGuardian = 'Rachel Lawyer';
    getD().attorney = { ...getD().attorney, ...ATTORNEY, email: 'rachel@law.example' };
    expect(messages()).not.toContain('D-2 Attorney — Primary Email');
  });

  test('a filing with no attorney is not asked for one (AGENTS.md section 4)', () => {
    expect(messages()).not.toContain('D-2 Attorney — Primary Email');
  });

  test("D-2's sidebar mark follows", () => {
    getD().attorneyForGuardian = 'Rachel Lawyer';
    getD().attorney = { ...getD().attorney, ...ATTORNEY, email: '' };
    expect(sectionMarks(getD(), 'guardian').checks.d2).toBe(false);
  });

  test('the blank model names both emails, so a new filing has the keys', () => {
    expect(emptyDataGuardian().attorney).toMatchObject({ email: '', secondaryEmail: '' });
  });
});
