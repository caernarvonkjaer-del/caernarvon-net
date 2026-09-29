// Milestone 71E: every money figure rounds to cents the way the Clerk's own
// workbook displays it.
//
// The app printed money three ways that disagreed on exactly the values that
// matter: the QA filing printed Line 20 $797,229.19 beside Line 30 $797,229.18
// and said they were equal. Milestone 71A measured what Microsoft Excel itself
// displays (MILESTONE-71-PROPOSAL.md, Appendix B) and recorded it in
// tests/fixtures/excel-rounding/ms71a-excel-display.json: 3,480 controlled
// values in the Clerk's money format and in #,##0.00, and every visible money
// cell of three workbooks the app exported. This spec holds formatMoney() and
// roundCents() to Excel's own text for every one of them -- not to a
// reimplementation of the rule.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';
import { formatMoney, roundCents, r2, fmt, formatDashboardCurrency } from '../../src/core/format/money.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const MEASURED = JSON.parse(fs.readFileSync(path.join(root, 'tests/fixtures/excel-rounding/ms71a-excel-display.json'), 'utf8'));

describe("formatMoney() prints what Excel displays", () => {
  test('the fixture is the 71A measurement, whole', () => {
    expect(MEASURED.cases.length).toBe(3480);
    expect(MEASURED.realExport.length).toBe(322);
    expect(MEASURED.generatedFrom).toContain('Microsoft Excel 16.0.19127.20752');
  });

  test('every controlled case, in the Clerk\'s money format and in #,##0.00', () => {
    const wrong = [];
    for (const [group, value, clerk, comma] of MEASURED.cases) {
      const x = Number(value);
      const gotClerk = formatMoney(x, { style: 'dollarParens' });
      const gotComma = formatMoney(x, { style: 'plain' });
      if (gotClerk !== clerk || gotComma !== comma) wrong.push({ group, value, clerk, gotClerk, comma, gotComma });
    }
    expect(wrong.slice(0, 10), `${wrong.length} of ${MEASURED.cases.length} differ from Excel`).toEqual([]);
  });

  test('every visible money cell of three real exports', () => {
    const digits = (s) => s.replace(/[$,\s]/g, '').replace(/^\((.*)\)$/, '-$1');
    const wrong = MEASURED.realExport.filter(([, , value, text]) => formatMoney(Number(value), { grouping: false }) !== digits(text));
    expect(wrong.slice(0, 10)).toEqual([]);
  });

  test.each([
    // The QA report's own figure, and the values the three old methods got wrong.
    [797229.1849999999, '797,229.19'],
    [-797229.1849999999, '-797,229.19'],
    [1.005, '1.01'],
    [-1.005, '-1.01'],
    [2.675, '2.68'],
    [-0.005, '-0.01'],
    [1233.5549999999998, '1,233.56'],
    [999999999.995, '1,000,000,000.00'],
    // Beyond 15 significant digits, and past the point where toFixed() itself
    // answers in exponent form: printed, never an exception on the page.
    [1234567890123456789, '1,234,567,890,123,460,000.00'],
    [-1e21, '-1,000,000,000,000,000,000,000.00'],
    [1e-7, '0.00'],
    // A figure that rounds to zero is never negative.
    [-0.004, '0.00'],
    [-1e-9, '0.00'],
    ['', '0.00'],
    [null, '0.00'],
  ])('%j -> %s', (v, text) => {
    expect(formatMoney(v)).toBe(text);
  });
});

describe('roundCents(), and the formatters built on it', () => {
  test('roundCents() is the number the formatter prints; r2() is roundCents() under its old name', () => {
    expect(roundCents(797229.1849999999)).toBe(797229.19);
    expect(roundCents(1.005)).toBe(1.01);
    expect(roundCents(-1.005)).toBe(-1.01);
    expect(roundCents(-0.004)).toBe(0);
    expect(Object.is(roundCents(-0.004), -0)).toBe(false);
    expect(r2(1.005)).toBe(1.01);
  });

  test('each surface keeps its own look', () => {
    expect(formatMoney(-1234.5, { style: 'dollar' })).toBe('$-1,234.50');
    expect(formatMoney(-1234.5, { style: 'parens' })).toBe('(1,234.50)');
    expect(formatMoney(-1234.5, { style: 'dollarParens' })).toBe('($1,234.50)');
    expect(formatMoney(-1234.5, { style: 'signFirst' })).toBe('-$1,234.50');
    expect(formatMoney(1234.5, { grouping: false })).toBe('1234.50');
    expect(fmt(1.005)).toBe('$1.01');
    expect(fmt('')).toBe('$0.00');
    expect(formatDashboardCurrency(-797229.1849999999)).toBe('($797,229.19)');
    expect(formatDashboardCurrency(null)).toBe('—');
  });
});
