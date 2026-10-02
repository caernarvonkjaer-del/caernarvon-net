import { describe, expect, test } from 'vitest';
import { formDerivedOverwriteWarnings } from '../../src/core/filing/form-derived-fields.js';

// Three cells in the annual template are formulas the court's form computes
// for itself -- 'PART IX '!E21/G21 (the bond period, = From_Date / = To_Date)
// and 'PART II, III'!F25 (Guardian #1, linked to PART I's Guardian). The app
// keeps its own field for each.
//
// Decided 2026-09-19: the writes stay, because dropping them would silently
// discard something the filer typed, but the divergence is reported. Before
// this, a filing could go to the clerk with a bond period that disagreed with
// its own accounting period, or two different names for the same guardian,
// and nothing anywhere said so.
//
// Milestone 67D (decided 2026-09-23) reversed the bond-period half: the bond
// period IS the accounting period, the app no longer writes E21/G21, and the
// form's formulas fill them. The advisory survives with new words: a typed
// bond period that differs still reaches the PDF, but the filed Excel will
// show the accounting period, and the filer is told so before filing.
//
// These are advisories, never blocks: the app has no standing to overrule a
// bond written for a term other than the accounting year.

const annual = (extra = {}) => ({
  inventoryType: 'annual',
  periodFrom: '2026-01-01',
  periodTo: '2026-12-31',
  guardian: 'Rachel Alvarez',
  guardians: [{ name: 'Rachel Alvarez' }],
  bondPeriodFrom: '2026-01-01',
  bondPeriodTo: '2026-12-31',
  ...extra,
});

const codes = (filing, descriptor) => formDerivedOverwriteWarnings(filing, descriptor).map((w) => w.code);

describe('form-derived cells the filing overwrites', () => {
  test('a filing that agrees with the form raises nothing', () => {
    expect(formDerivedOverwriteWarnings(annual())).toEqual([]);
  });

  test('a bond period that disagrees with the accounting period is reported, per edge', () => {
    expect(codes(annual({ bondPeriodFrom: '2025-07-01' }))).toEqual(['form-derived.bond-period.from']);
    expect(codes(annual({ bondPeriodTo: '2027-06-30' }))).toEqual(['form-derived.bond-period.to']);
    expect(codes(annual({ bondPeriodFrom: '2025-07-01', bondPeriodTo: '2027-06-30' })))
      .toEqual(['form-derived.bond-period.from', 'form-derived.bond-period.to']);
  });

  // Milestone 67D: the wording was approved by the requester on 2026-09-23 and
  // is what ships -- both sentences, verbatim -- followed by the two values so
  // the filer can see which is which.
  test('the message says, in the approved words, that the Excel will show the accounting period, and names both values', () => {
    const [w] = formDerivedOverwriteWarnings(annual({ bondPeriodFrom: '2025-07-01' }));
    expect(w.message).toContain('The bond period entered differs from the accounting period. The filed Excel will show the accounting period.');
    expect(w.message).toContain('2025-07-01');
    expect(w.message).toContain('2026-01-01');
    expect(w.severity).toBe('advisory');
  });

  test("Guardian #1 differing from Part I's Guardian is reported", () => {
    const w = formDerivedOverwriteWarnings(annual({ guardians: [{ name: 'R. M. Alvarez' }] }));
    expect(w.map((x) => x.code)).toEqual(['form-derived.guardian-name']);
    expect(w[0].message).toContain('R. M. Alvarez');
    expect(w[0].message).toContain('Rachel Alvarez');
  });

  // Whitespace and letter case are not disagreements -- reporting them would
  // train the filer to ignore the panel.
  test('formatting differences are not disagreements', () => {
    expect(codes(annual({ guardians: [{ name: '  Rachel   Alvarez ' }] }))).toEqual([]);
    expect(codes(annual({ bondPeriodFrom: '2026-01-01T00:00:00.000Z' }))).toEqual([]);
    expect(codes(annual({ bondPeriodFrom: new Date('2026-01-01T00:00:00Z') }))).toEqual([]);
  });

  // An unset field is not an overwrite. Warning here would push the filer to
  // fill in something the form would have derived for them.
  test('a blank app field raises nothing', () => {
    expect(codes(annual({ bondPeriodFrom: '', bondPeriodTo: '' }))).toEqual([]);
    expect(codes(annual({ guardians: [{ name: '' }] }))).toEqual([]);
    expect(codes(annual({ guardians: [] }))).toEqual([]);
    expect(codes(annual({ guardians: undefined }))).toEqual([]);
  });

  // Equally, nothing to compare against.
  test('a blank derived field raises nothing', () => {
    expect(codes(annual({ periodFrom: '', periodTo: '' }))).toEqual([]);
    expect(codes(annual({ guardian: '', guardians: [{ name: 'Someone Else' }] }))).toEqual([]);
  });

  test('the whole annual family is covered, and only the Inventory beside it', () => {
    const divergent = { bondPeriodFrom: '2025-07-01', guardians: [{ name: 'Someone Else' }] };
    for (const type of ['annual', 'finalAccounting', 'trustAccounting']) {
      expect(codes(annual({ ...divergent, inventoryType: type })), type).toHaveLength(2);
    }
    // The Initial Inventory's bond cells are real input boxes in its own
    // template, so there is no derived value to disagree with; its Guardian #1
    // rule reads the Cover's Guardian Name(s), not Part I's Guardian (below).
    for (const type of ['guardian', 'simplified', 'planAnnual', 'planInitial', 'planMinor', 'planSimplified']) {
      expect(codes(annual({ ...divergent, inventoryType: type })), type).toEqual([]);
    }
  });

  // Milestone 72A: listing co-guardians in Part I is not a disagreement. The
  // rule used to demand identical names, so it warned here.
  test("a Part I Guardian naming co-guardians includes Guardian #1, so it raises nothing", () => {
    expect(codes(annual({ guardian: 'Rachel Alvarez and Tom Alvarez' }))).toEqual([]);
    expect(codes(annual({ guardian: 'Tom Alvarez; Rachel Alvarez' }))).toEqual([]);
  });

  test('the resolved descriptor wins over a filing that does not name its type', () => {
    const filing = annual({ inventoryType: '', bondPeriodFrom: '2025-07-01' });
    expect(codes(filing)).toEqual([]);
    expect(codes(filing, { inventoryType: 'trustAccounting' })).toEqual(['form-derived.bond-period.from']);
  });

  test('a missing filing does not throw', () => {
    expect(formDerivedOverwriteWarnings(null)).toEqual([]);
    expect(formDerivedOverwriteWarnings(undefined, null)).toEqual([]);
  });
});

// Milestone 72A. The Inventory's 'PART III'!F8 is the form's link to the
// Cover's Guardian Name(s); the app writes Guardian #1's name over it, by the
// 2026-09-19 Annual decision applied to the Inventory (2026-10-01), and warns
// when that name is not among the Cover's.
describe("the Inventory's Guardian #1 against the Cover's Guardian Name(s)", () => {
  const inventory = (cover, first) => ({ inventoryType: 'guardian', guardianName: cover, guardians: [{ name: first }] });
  const warns = (cover, first) => codes(inventory(cover, first)).includes('form-derived.guardian-name');

  test('the same name raises nothing', () => {
    expect(warns('Jane Doe', 'Jane Doe')).toBe(false);
  });

  test('a co-guardian Cover includes Guardian #1', () => {
    expect(warns('Jane Doe and John Doe', 'Jane Doe')).toBe(false);
    expect(warns('Jane Doe and John Doe', 'John Doe')).toBe(false);
  });

  // The Cover is never split at commas, so a name holding one matches itself.
  test('a name with a comma in it matches itself', () => {
    expect(warns('John Smith, Jr.', 'John Smith, Jr.')).toBe(false);
    expect(warns('Acme Trust Co., Inc.', 'Acme Trust Co., Inc.')).toBe(false);
    expect(warns('Acme Trust Co., Inc. and Jane Doe', 'Acme Trust Co., Inc.')).toBe(false);
  });

  test('a name containing "and" matches itself', () => {
    expect(warns('Rand Anderson', 'Rand Anderson')).toBe(false);
    expect(warns('Smith and Wesson Trust Company', 'Smith and Wesson Trust Company')).toBe(false);
  });

  test('extra spaces, letter case and punctuation are not disagreements', () => {
    expect(warns('  JANE   DOE ', 'jane doe')).toBe(false);
    expect(warns('Robert T. Nguyen', 'Robert T Nguyen')).toBe(false);
  });

  test('a real mismatch warns, names both, and says which name the export carries', () => {
    expect(warns('Jane Doe', 'Mary Roe')).toBe(true);
    // Whole words only: "Ann" is not "Anne".
    expect(warns('Anne Smith', 'Ann Smith')).toBe(true);
    const [w] = formDerivedOverwriteWarnings(inventory('Jane Doe', 'Mary Roe'));
    expect(w).toMatchObject({ severity: 'advisory', field: 'guardians.0.name', entered: 'Mary Roe', derived: 'Jane Doe' });
    expect(w.message).toContain('D-1 — Guardian #1 (Mary Roe) is not among the Guardian Name(s) on the Cover (Jane Doe).');
    expect(w.message).toContain("this filing will be exported with Guardian #1's name as entered");
  });

  test('a blank on either side raises nothing', () => {
    expect(warns('', 'Mary Roe')).toBe(false);
    expect(warns('Jane Doe', '')).toBe(false);
    expect(codes({ inventoryType: 'guardian', guardianName: 'Jane Doe' })).toEqual([]);
  });

});
