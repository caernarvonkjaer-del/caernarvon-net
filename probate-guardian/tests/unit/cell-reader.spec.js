import { describe, it, expect } from 'vitest';
import { readRepoSource, LEGACY_APP } from './support/legacy-source-extract.js';
import * as cellReader from '../../src/core/excel/cell-reader.js';
import { fmtDate, unwrapCellValue, readCellText } from '../../src/core/excel/cell-reader.js';

// Milestone 53A deleted dead fmtDateCard() from legacy-app.js; Milestone 53B
// then moved the whole cell-reader cluster (fmtDate, unwrapCellValue,
// readCellText) out to src/core/excel/cell-reader.js and deleted the
// originals. This scan is the permanent guard against any of the four being
// reintroduced as a classic-script global. legacy-app.js exposes top-level
// function declarations on `window` implicitly, so there is no `window.X =`
// line for the bridge allow-list to catch -- the declaration itself is the
// global, and this scan is the check.
describe('legacy-app.js carries no copy of the cell-reader cluster', () => {
  const NAMES = ['fmtDate', 'fmtDateCard', 'unwrapCellValue', 'readCellText'];

  it.each(NAMES)('does not declare a top-level function %s', (name) => {
    const source = readRepoSource(LEGACY_APP);
    const decl = new RegExp(`^(?:async\\s+)?function\\s+${name}\\s*\\(`, 'm');
    // A boolean, not `expect(source).not.toMatch(decl)`: on failure vitest
    // prints the received value, and the received value here is all of
    // legacy-app.js.
    expect(decl.test(source), `${name} is still declared in ${LEGACY_APP}`).toBe(false);
  });
});

// One implementation, reached one way. A fourth "helpful" export slipping in
// here later is exactly how excel-engine.js accumulated the readers Milestone
// 51D had to delete -- see cell-reader.js's own header.
describe('cell-reader.js exports exactly the three cluster functions', () => {
  it('exports fmtDate, unwrapCellValue and readCellText, and nothing else', () => {
    expect(Object.keys(cellReader).sort()).toEqual(['fmtDate', 'readCellText', 'unwrapCellValue']);
    for (const name of ['fmtDate', 'unwrapCellValue', 'readCellText']) {
      expect(typeof cellReader[name], `${name} must be a function`).toBe('function');
    }
  });
});

// ── Milestone 53B: the shape matrix ────────────────────────────────────────
//
// Every expected value below is a literal, not a computed comparison. Per
// step B1 this matrix was written and run GREEN against the extracted legacy
// bodies (via extractLegacyFunction + new Function) BEFORE the cluster moved,
// which is what proves the literals describe shipped behavior rather than the
// mover's belief about it. Step B7 then swapped the adapter to the real ES
// import below and deleted the extraction, so this spec's final form does not
// depend on legacy-app.js at all. Both B12 fault injections (deleting the
// richText branch; removing the instanceof Date guard) were confirmed to turn
// the relevant rows red.

describe('unwrapCellValue: every branch of the ExcelJS cell-value shapes', () => {
  const SAME_DATE = new Date('2026-05-20T00:00:00Z');

  const CASES = [
    ['null', null, null, 'v==null'],
    ['undefined', undefined, null, 'v==null'],
    ["string 'abc'", 'abc', 'abc', "typeof v!=='object'"],
    ['number 42', 42, 42, "typeof v!=='object'"],
    ['number 0', 0, 0, "typeof v!=='object'"],
    ['true', true, true, "typeof v!=='object'"],
    ['false', false, false, "typeof v!=='object'"],
    ["empty string ''", '', '', "typeof v!=='object'"],
    ['error cell', { error: '#REF!' }, null, "'error' in v"],
    ['formula with result', { formula: 'A1+1', result: 7 }, 7, "'result' in v"],
    [
      'formula whose result is richText',
      { formula: 'A1', result: { richText: [{ text: 'a' }, { text: 'b' }] } },
      'ab',
      'recursion, one level',
    ],
    ['formula with undefined result', { formula: 'A1', result: undefined }, null, 'recursion into undefined'],
    ['sharedFormula with result', { sharedFormula: 'A1', result: 3 }, 3, "'result' in v (no formula key needed)"],
    [
      'richText with a null run',
      { richText: [{ text: 'x' }, null, { text: 'y' }] },
      'xy',
      'richText join, null run tolerated',
    ],
    ['richText that is not an array', { richText: 'not an array' }, null, 'falls through to final return null'],
    ['hyperlink with string text', { text: 'display', hyperlink: 'https://example.test/' }, 'display', 'hyperlink'],
    [
      'hyperlink with richText-array text',
      { text: [{ text: 'a' }, { text: 'b' }], hyperlink: 'https://example.test/' },
      'ab',
      'hyperlink, richText-array text',
    ],
    [
      'hyperlink with undefined text',
      { text: undefined, hyperlink: 'https://example.test/' },
      undefined,
      'SHIPPED BEHAVIOR: returns t as-is, not null',
    ],
    ['unrecognized object', { anything: 'else' }, null, 'final fallthrough'],
    ['empty array', [], null, 'final fallthrough'],
    ['empty object', {}, null, 'final fallthrough'],
  ];

  it.each(CASES)('%s -> %s (%s)', (_label, input, expected) => {
    expect(unwrapCellValue(input)).toBe(expected);
  });

  it('returns the same Date instance, not a copy or a string', () => {
    expect(unwrapCellValue(SAME_DATE)).toBe(SAME_DATE);
  });

  // The undefined-for-{text:undefined,hyperlink} row above is pinned as-is
  // deliberately. It is arguably a wart -- unwrapCellValue's own comment
  // promises it "returns null instead of ever handing back a raw object," and
  // undefined is not null -- but every caller feeds the result through
  // readCellText's `v==null` or a `Number(...)||0`, so it is unobservable
  // today. 53B's job is to move the function, not improve it; see
  // MILESTONE-53-PROPOSAL.md's "Deliberately out of scope."
});

describe('readCellText: text form of an ExcelJS cell', () => {
  const CASES = [
    ['a null cell', null, '', 'cell?cell.value:null then v==null'],
    ['an undefined cell', undefined, '', 'cell?cell.value:null then v==null'],
    ['a cell whose value is null', { value: null }, '', 'v==null'],
    ['a native Date', { value: new Date('2026-05-20T00:00:00Z') }, '2026-05-20', 'Date -> fmtDate(toISOString())'],
    [
      'a Date late in the UTC day',
      { value: new Date('2026-01-01T23:59:59Z') },
      '2026-01-01',
      'the timezone-shift case 656cccf guards',
    ],
    ['a padded string', { value: '  padded  ' }, 'padded', 'String(v).trim()'],
    ['number zero', { value: 0 }, '0', 'zero is not "no value"'],
    ['boolean false', { value: false }, 'false', 'boolean stringifies'],
    [
      'a hyperlink with undefined text',
      { value: { text: undefined, hyperlink: 'https://example.test/' } },
      '',
      "unwrapCellValue's undefined is caught by v==null",
    ],
    ['an error cell', { value: { error: '#DIV/0!' } }, '', "error -> null -> ''"],
    ['a formula with a padded result', { value: { formula: 'A1', result: '  r  ' } }, 'r', 'unwrap then trim'],
  ];

  it.each(CASES)('%s -> %s (%s)', (_label, cell, expected) => {
    expect(readCellText(cell)).toBe(expected);
  });
});

// fmtDate rows reuse the exact cases date-truncation-helpers.spec.js:28-43
// already applies to annual-accounting's fmtD, since the bodies are identical
// token for token (Milestone 51's audit called these two "A1").
describe('fmtDate: the Date guard and the non-Date passthroughs', () => {
  it('normalizes a Date through toISOString(), not Date#toString()', () => {
    expect(fmtDate(new Date('2026-05-20T00:00:00Z'))).toBe('2026-05-20');
    expect(fmtDate(new Date('2026-01-01T23:59:59Z'))).toBe('2026-01-01');
  });

  it('behaves as before for every non-Date input', () => {
    expect(fmtDate('2026-09-15')).toBe('2026-09-15');
    expect(fmtDate('2026-09-15T14:30:00Z')).toBe('2026-09-15');
    expect(fmtDate('')).toBe('');
    expect(fmtDate(null)).toBe('');
    expect(fmtDate(undefined)).toBe('');
    expect(fmtDate(0)).toBe('');
    expect(fmtDate('abc')).toBe('abc');
  });
});
