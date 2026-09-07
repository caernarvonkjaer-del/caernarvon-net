import { describe, it, expect } from 'vitest';
import { parseFlexibleDate, formatDisplayDate, isLeapYear, getDaysInMonth } from '../../src/core/form/date-parser.js';

describe('date-parser', () => {
  it('identifies leap years correctly', () => {
    expect(isLeapYear(2024)).toBe(true);
    expect(isLeapYear(2000)).toBe(true);
    expect(isLeapYear(1900)).toBe(false);
    expect(isLeapYear(2026)).toBe(false);
  });

  it('calculates days in month correctly including February leap years', () => {
    expect(getDaysInMonth(2024, 2)).toBe(29);
    expect(getDaysInMonth(2026, 2)).toBe(28);
    expect(getDaysInMonth(2026, 4)).toBe(30);
    expect(getDaysInMonth(2026, 12)).toBe(31);
    expect(getDaysInMonth(2026, 13)).toBe(0);
  });

  it('parses canonical ISO dates (YYYY-MM-DD)', () => {
    expect(parseFlexibleDate('2026-02-14')).toBe('2026-02-14');
    expect(parseFlexibleDate('2024-02-29')).toBe('2024-02-29');
    expect(parseFlexibleDate(' 2026-05-01 ')).toBe('2026-05-01');
  });

  it('parses standard US slash and dash formats (MM/DD/YYYY, M/D/YYYY)', () => {
    expect(parseFlexibleDate('02/14/2026')).toBe('2026-02-14');
    expect(parseFlexibleDate('2/14/2026')).toBe('2026-02-14');
    expect(parseFlexibleDate('12/01/2025')).toBe('2025-12-01');
    expect(parseFlexibleDate('5-9-2026')).toBe('2026-05-09');
  });

  it('parses textual month formats (Feb 14, 2026, February 14 2026, 14 Feb 2026)', () => {
    expect(parseFlexibleDate('Feb 14, 2026')).toBe('2026-02-14');
    expect(parseFlexibleDate('February 14, 2026')).toBe('2026-02-14');
    expect(parseFlexibleDate('Feb. 14th, 2026')).toBe('2026-02-14');
    expect(parseFlexibleDate('14 Feb 2026')).toBe('2026-02-14');
    expect(parseFlexibleDate('1st January 2026')).toBe('2026-01-01');
  });

  it('strictly rejects 2-digit years to prevent legal ambiguity', () => {
    expect(parseFlexibleDate('02/14/26')).toBeNull();
    expect(parseFlexibleDate('2/14/26')).toBeNull();
    expect(parseFlexibleDate('Feb 14, 26')).toBeNull();
  });

  it('rejects impossible calendar dates', () => {
    expect(parseFlexibleDate('02/30/2026')).toBeNull();
    expect(parseFlexibleDate('02/29/2026')).toBeNull(); // 2026 not leap year
    expect(parseFlexibleDate('04/31/2026')).toBeNull();
    expect(parseFlexibleDate('13/01/2026')).toBeNull();
    expect(parseFlexibleDate('invalid-text')).toBeNull();
  });

  it('handles empty input cleanly', () => {
    expect(parseFlexibleDate('')).toBe('');
    expect(parseFlexibleDate('   ')).toBe('');
    expect(parseFlexibleDate(null)).toBe('');
    expect(parseFlexibleDate(undefined)).toBe('');
  });

  it('formats display date from canonical YYYY-MM-DD to MM/DD/YYYY', () => {
    expect(formatDisplayDate('2026-02-14')).toBe('02/14/2026');
    expect(formatDisplayDate('2024-12-31')).toBe('12/31/2024');
    expect(formatDisplayDate('')).toBe('');
  });
});
