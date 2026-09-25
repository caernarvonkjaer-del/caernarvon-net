import { describe, expect, test } from 'vitest';
import { pct, calcTotalsAnnual } from '../../src/features/annual-accounting/totals.js';
import { percentValue } from '../../src/core/excel/excel-engine.js';

// The Annual Accounting's Ward's % field says "if the ward owns 50% of a
// property, enter 50" (and "Enter 0-100" since the app's first version),
// but pct() -- the canonical calculation behind the screen totals, the PDF
// and the workbook -- and the exporter's percentValue() both read any value
// of 1 or less as already a fraction: a share typed as 1% counted as 100%,
// 0.5% as 50%. The court's Annual workbook formats each Schedule D ward's-%
// cell as a percentage (0.00%) and multiplies it into the ward's share
// (D-1: K25 = H25 * I25), so a 1% share of a $10,000 account was filed as
// $10,000. The Guardian Inventory has always read the number as a
// percentage. Fixed with the requester's approval (AGENTS.md section 5), on
// 2026-09-24: the typed number is always a percentage. A blank share is
// unchanged -- pct('') is still 1 (the whole asset) for the in-progress
// totals, and validation requires Ward's % on every populated line before
// export, so a blank share never reaches the workbook.

describe('pct(): the Annual Accounting\'s ward-share calculation', () => {
  test('the typed number is always a percentage', () => {
    expect(pct('50')).toBe(0.5);
    expect(pct('100')).toBe(1);
    expect(pct('1')).toBe(0.01);
    expect(pct('0.5')).toBe(0.005);
    expect(pct('12.5')).toBe(0.125);
    expect(pct(33.33)).toBeCloseTo(0.3333, 10);
  });

  test('a blank or unreadable share still counts as the whole asset, as before', () => {
    expect(pct('')).toBe(1);
    expect(pct(null)).toBe(1);
    expect(pct(undefined)).toBe(1);
    expect(pct('not a number')).toBe(1);
  });

  test('Schedule D totals follow: a 1% share of $10,000 is $100, not $10,000', () => {
    const row = (wardPct) => ({ description: 'x', fullAmount: 10000, wardPct });
    const t = calcTotalsAnnual({ schD1: [row('1'), row('50'), row('0.5'), row('100')] });
    expect(t.schD1_total).toBe(100 + 5000 + 50 + 10000);
  });
});

describe('percentValue(): what the exporter writes into the workbook\'s percentage cells', () => {
  test('always the percentage divided by 100: 1% is written as 0.01, not 1 (100%)', () => {
    expect(percentValue('50')).toBe(0.5);
    expect(percentValue(100)).toBe(1);
    expect(percentValue('1')).toBe(0.01);
    expect(percentValue(0.5)).toBe(0.005);
    expect(percentValue('12.5')).toBe(0.125);
  });

  test('an empty or unreadable value writes 0, as before', () => {
    expect(percentValue('')).toBe(0);
    expect(percentValue('invalid')).toBe(0);
  });
});
