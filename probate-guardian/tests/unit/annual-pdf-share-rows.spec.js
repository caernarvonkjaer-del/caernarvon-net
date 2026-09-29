// Milestone 71D: one rule for a blank Ward's %, on screen and on paper.
//
// On the Annual, Final and Trust Accountings a blank share counted as 100% in
// pct() -- the on-screen totals and Line 30 -- while the D-1 and D-5 PDF rows
// read it as 0%, and every Ward's % column printed a blank as "100%". A filing
// exported through "Continue despite outstanding requirements" printed a D-1
// column that did not add up to its own total. Decision D3 (the requester,
// under AGENTS.md section 5): a blank or unreadable share counts as 0%, as the
// court's workbook computes it (`=H25*I25` with the share cell empty is 0) and
// as the Initial Inventory always has. One helper, wardShare(); one way to
// print a share, formatShare().
//
// Each row's printed Ward's Amount must equal what that row contributes to
// the printed schedule total, for every schedule and every filing type the
// Annual engine serves -- "one engine" is an assumption a test should hold.
import { describe, expect, test } from 'vitest';
import { buildAnnualAccountingModel } from '../../src/features/annual-accounting/pdf-model.js';
import { calcTotalsAnnual, pct } from '../../src/features/annual-accounting/totals.js';
import { wardShare, formatShare } from '../../src/core/format/money.js';
import { emptyDataAnnual } from '../../src/core/filing/models/annual.js';

const SHARES = ['', 'abc', '1', '50', '100'];
const TYPES = [['annual', 'Annual'], ['finalAccounting', 'Final'], ['trustAccounting', 'Trust']];
const money = (s) => Number(String(s).replace(/[$,]/g, ''));

// Schedule id, the model's collection, the amount field, the columns of the
// printed row holding Ward's % and the ward's own amount, and the total.
const SCHEDULES = [
  ['schD1', 'schD1', 'fullAmount', 6, 7, (t) => t.schD1_total],
  ['schD2', 'schD2', 'fullValue', 5, 7, (t) => t.schD2_ward],
  ['schD3', 'schD3', 'fullAmount', 3, 5, (t) => t.schD3_ward],
  ['schD4', 'schD4', 'fullAmount', 4, 6, (t) => t.schD4_ward],
  ['schD5', 'schD5', 'fullDebt', 5, 6, (t) => t.schD5_total],
];

describe.each(TYPES)('%s: every Schedule D row prints what it adds to the total', (inventoryType, filingType) => {
  test.each(SCHEDULES)('%s', (sectionId, collection, amountField, pctCol, wardCol, totalOf) => {
    const rows = SHARES.map((wardPct, i) => ({ description: `Line ${i + 1}`, [amountField]: 1000, wardPct, carryingValue: 0 }));
    const filing = { ...emptyDataAnnual(), inventoryType, filingType, [collection]: rows };
    const model = buildAnnualAccountingModel(filing);
    const table = model.sections.find((s) => s.id === sectionId).blocks.find((b) => b.type === 'table');
    const printed = table.rows.map((r) => money(r[wardCol]));
    // Blank and unreadable count as 0%; 1, 50 and 100 as themselves.
    expect(printed).toEqual([0, 0, 10, 500, 1000]);
    expect(printed.reduce((a, b) => a + b, 0), 'the column adds up to the schedule total').toBeCloseTo(totalOf(calcTotalsAnnual(filing)), 6);
    // The share column prints what was entered -- never "100%" for a blank.
    expect(table.rows.map((r) => r[pctCol])).toEqual(['—', '—', '1%', '50%', '100%']);
  });

  test('Part VIII prints a blank trust share as "—", not "100%"', () => {
    const filing = { ...emptyDataAnnual(), inventoryType, filingType, trusts: [{ hasTrust: 'Yes', name: 'Family Trust', wardPct: '', wardAmount: 80000 }, { hasTrust: '', name: 'Second Trust', wardPct: '25', wardAmount: 1000 }] };
    const table = buildAnnualAccountingModel(filing).sections.find((s) => s.id === 'part8').blocks.find((b) => b.type === 'table');
    expect(table.rows.map((r) => r[7])).toEqual(['—', '25%']);
  });
});

describe('the one rule', () => {
  test('pct() and wardShare() agree: blank and unreadable are 0%', () => {
    expect(pct('')).toBe(0);
    expect(pct(null)).toBe(0);
    expect(pct('abc')).toBe(0);
    expect(pct('50')).toBe(0.5);
    expect(wardShare(1000, '')).toBe(0);
    expect(wardShare(1000, 'abc')).toBe(0);
    expect(wardShare(1000, 12.5)).toBe(125);
  });

  test('formatShare(): what the filer entered, or "—"', () => {
    expect(formatShare('')).toBe('—');
    expect(formatShare(null)).toBe('—');
    expect(formatShare('abc')).toBe('—');
    expect(formatShare('33.33')).toBe('33.33%');
    expect(formatShare(50)).toBe('50%');
    expect(formatShare(0)).toBe('0%');
  });
});
