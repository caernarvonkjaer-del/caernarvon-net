// Milestone 71C: every share is a real percent field, 0-100.
//
// Before this milestone every Ward's % field was a money field: 150 was
// accepted (the ward "owned" 150% of an asset and every total inflated), a
// typed minus sign was silently deleted (-10 filed as 10), and a percent kind
// was declared in the form contract but implemented nowhere. Seventeen share
// fields on four forms.
//
// The "validators" describe is the regression proof (red-first: on the pre-71C
// validators an out-of-range share raises no issue). The rest pins the pieces
// that implement the kind: the range rule, how a share is drawn and stored,
// the renderer, the mount clamp that no longer erases a minus, and the import
// reader (decision D10).
import { afterAll, beforeAll, describe, expect, test, vi } from 'vitest';
import { openFiling } from './support/open-filing.js';
import { emptyDataGuardian, mk } from '../../src/core/filing/models/guardian.js';
import { emptyDataAnnual } from '../../src/core/filing/models/annual.js';
import { getD } from '../../src/core/state.js';

let validateGuardian;
let validateAnnual;

beforeAll(async () => {
  vi.stubGlobal('window', globalThis);
  ({ validateGuardian } = await import('../../src/features/guardian-inventory/index.js'));
  ({ validateAnnual } = await import('../../src/features/annual-accounting/index.js'));
});

afterAll(() => {
  vi.unstubAllGlobals();
});

const messagesOf = (issues) => issues.map((e) => String(e?.message ?? e));
const d1Row = (wardPct) => ({ description: 'Checking', accountNo: '1', restricted: 'No', type: 'Checking', fullAmount: 1000, wardPct, restrictedAmt: '' });

describe('validators: a share outside 0-100 is an ordinary, bypassable issue', () => {
  test.each([
    [150, "Schedule D-1 — Line 1 — Ward's % must be between 0 and 100"],
    [-10, "Schedule D-1 — Line 1 — Ward's % must be between 0 and 100"],
    [100.01, "Schedule D-1 — Line 1 — Ward's % must be between 0 and 100"],
    ['abc', "Schedule D-1 — Line 1 — Ward's % must be a number from 0 to 100"],
  ])('Annual D-1 share %s', (wardPct, message) => {
    openFiling({ ...emptyDataAnnual(), inventoryType: 'annual', schD1: [d1Row(wardPct)] });
    const issues = validateAnnual();
    const hit = issues.find((e) => String(e.message) === message);
    expect(hit, message).toBeTruthy();
    expect(hit.path).toBe('schD1.0.wardPct');
    expect(hit.bypassable).not.toBe(false);
  });

  test.each([0, 0.5, 1, 50, 100])('Annual D-1 share %s is in range: no range issue', (wardPct) => {
    openFiling({ ...emptyDataAnnual(), inventoryType: 'annual', schD1: [d1Row(wardPct)] });
    expect(messagesOf(validateAnnual()).filter((m) => m.includes("Ward's % must"))).toEqual([]);
  });

  test('every Annual D schedule and Part VIII check the range', () => {
    openFiling({
      ...emptyDataAnnual(),
      inventoryType: 'annual',
      schD5: [{ description: 'Loan', loanNo: '1', loanType: 'Auto', fullDebt: 100, wardPct: 150 }],
      trusts: [{ ...emptyDataAnnual().trusts?.[0], hasTrust: 'Yes', name: 'Family Trust', wardPct: 150 }],
    });
    const m = messagesOf(validateAnnual());
    expect(m).toContain("Schedule D-5 — Line 1 — Ward's % must be between 0 and 100");
    expect(m).toContain("Part VIII — Trust 1 — Ward's % must be between 0 and 100");
  });

  test('Inventory: every schedule, and C-5 under its own name', () => {
    const d = { ...emptyDataGuardian(), inventoryType: 'guardian' };
    d.scheduleB1 = [{ ...mk.b1(), institutionName: 'Bank', wardPercent: 150 }];
    d.scheduleC5 = [{ ...mk.c5(), assetDescription: 'Boat', jointOwnerPercent: 150 }];
    d.scheduleA1 = [{ ...mk.a1(), propertyDescription: 'Home', wardPercent: 'abc' }];
    openFiling(d);
    const m = messagesOf(validateGuardian());
    expect(m).toContain("B-1 row 1 — Ward's % must be between 0 and 100.");
    expect(m).toContain("C-5 row 1 — Joint Owner's % must be between 0 and 100.");
    expect(m).toContain("A-1 row 1 — Ward's % must be a number from 0 to 100.");
  });

  test('Inventory A-1: a negative share keeps its one existing message, not two', () => {
    const d = { ...emptyDataGuardian(), inventoryType: 'guardian' };
    d.scheduleA1 = [{ ...mk.a1(), propertyDescription: 'Home', wardPercent: -10 }];
    openFiling(d);
    const m = messagesOf(validateGuardian()).filter((s) => s.startsWith('A-1 row 1 — Ward'));
    expect(m).toEqual(["A-1 row 1 — Ward's % must be > 0."]);
  });
});

describe('the range rule', () => {
  test.each([
    ['', null], [null, null], [undefined, null],
    [0, null], [0.5, null], [1, null], [50, null], [100, null], ['50', null], [-0, null],
    [100.01, 'must be between 0 and 100'], [150, 'must be between 0 and 100'], [-10, 'must be between 0 and 100'],
    ['abc', 'must be a number from 0 to 100'], ['12abc', 'must be a number from 0 to 100'],
  ])('%j -> %j', async (value, problem) => {
    const { percentProblem } = await import('../../src/core/validation/percent-range.js');
    expect(percentProblem(value)).toBe(problem);
  });
});

describe('how a share is drawn, typed and stored', () => {
  test('a real 0 draws as "0", a minus stays, blank stays blank', async () => {
    const { displayDecimal } = await import('../../src/core/form/form-contract.js');
    expect(displayDecimal(0)).toBe('0');
    expect(displayDecimal(-10)).toBe('-10');
    expect(displayDecimal('')).toBe('');
    expect(displayDecimal(null)).toBe('');
    expect(displayDecimal('-10abc')).toBe('-10');
    expect(displayDecimal(12.5)).toBe('12.5');
  });

  test('an empty box stores blank, never 0; an unfinished entry stores blank until it is a number', async () => {
    const { parseStoredDecimal } = await import('../../src/core/form/form-contract.js');
    expect(parseStoredDecimal('')).toBe('');
    expect(parseStoredDecimal('-')).toBe('');
    expect(parseStoredDecimal('.')).toBe('');
    expect(parseStoredDecimal('0')).toBe(0);
    expect(parseStoredDecimal('-10')).toBe(-10);
    expect(parseStoredDecimal('50.5')).toBe(50.5);
  });

  test('a control stamped percent is the percent kind', async () => {
    const { getControlKind } = await import('../../src/core/form/form-contract.js');
    expect(getControlKind({ dataset: { formFormat: 'percent' }, type: 'text', getAttribute: () => null })).toBe('percent');
    expect(getControlKind({ dataset: { fieldKind: 'percent' }, type: 'text' })).toBe('percent');
  });

  test('the renderer draws a percent field as one: its own format, its minus, blank kept', async () => {
    const { renderFormField } = await import('../../src/core/form/form-fields.js');
    const html = renderFormField({ path: 'schD1.0.wardPct', label: "Ward's %", value: -10, type: 'number', kind: 'percent' });
    expect(html).toContain('data-form-format="percent"');
    expect(html).toContain('data-field-kind="percent"');
    expect(html).toContain('value="-10"');
    expect(html).toContain('data-field-blank="keep"');
    expect(html).toContain('type="text"');
    // Before 71C a passed kind changed nothing: `type: 'number'` made it money.
    const money = renderFormField({ path: 'schD1.0.fullAmount', label: 'Full Amount', value: 5, type: 'number' });
    expect(money).toContain('data-form-format="decimal"');
    expect(money).not.toContain('data-field-blank');
  });

  // Milestone 73G part 1: the clamp that ran on every page drawn
  // (sanitizeNegativeAmounts()) is retired; what opening a filing does to
  // its amounts is normalizeWardData()'s lossless reading.
  test('opening a filing no longer clamps a negative share to 0 (D-1 and D-5), nor a negative amount', async () => {
    const { normalizeWardData } = await import('../../src/core/filing/normalize-filing.js');
    const d = normalizeWardData({ ...emptyDataAnnual(), inventoryType: 'annual', schD1: [{ ...d1Row(-10), fullAmount: -200 }], schD5: [{ description: 'Loan', fullDebt: 100, wardPct: -5 }] });
    expect(d.schD1[0].wardPct).toBe(-10);
    expect(d.schD5[0].wardPct).toBe(-5);
    expect(d.schD1[0].fullAmount).toBe(-200);
  });
});

describe('an imported share cell is read the way the Clerk\'s workbook reads it (D10)', () => {
  test.each([
    [0.5, 50], [1, 100], [0, 0], [1.5, 150], [-0.1, -10],
    // A 0-100 figure written by a pre-60K export: read as the workbook reads it, then flagged.
    [50, 5000],
    // Text, as Excel's arithmetic reads it.
    ['50%', 50], ['0.5', 50], [' 25 % ', 25],
    // Blank stays blank -- not 0.
    [null, ''], ['', ''],
    // Unreadable text is kept as imported, for the range check to report.
    ['abc', 'abc'],
  ])('%j -> %j', async (cell, share) => {
    const { shareFromWorkbookCell } = await import('../../src/core/excel/share-cell.js');
    expect(shareFromWorkbookCell(cell)).toBe(share);
  });
});
