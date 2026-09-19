import { describe, expect, test } from 'vitest';
import {
  isB4RegisterSheetName,
  b4PageNumber,
  planB4PagesToKeep,
  B4_SUMMARY_SHEET,
} from '../../src/core/excel/b4-register-pages.js';

// This module owns only what is specific to Schedule B-4: how its register
// pages group into per-account blocks, and which of them a filing needs. The
// removal itself, and the formula rebuilding it requires, live in
// sheet-pruning.js and are covered by sheet-pruning.spec.js -- nine other
// schedules have the same problem with a different formula shape, so there is
// one mechanism rather than two.

const P = 'SCH B-4 OTHER DISB p';

describe('B-4 register sheet naming', () => {
  test.each([
    [`${P}2`, true, 2],
    [`${P}19`, true, 19],
    [`${P}51`, true, 51],
    [B4_SUMMARY_SHEET, false, NaN],
    ['SCH A INCOME p1', false, NaN],
    [`${P}`, false, NaN],
    [`${P}2a`, false, NaN],
  ])('%s -> register=%s page=%s', (name, isReg, num) => {
    expect(isB4RegisterSheetName(name)).toBe(isReg);
    if (Number.isNaN(num)) expect(b4PageNumber(name)).toBeNaN();
    else expect(b4PageNumber(name)).toBe(num);
  });

  // The summary page shares the prefix and must never be treated as a
  // register page -- removing it would take the category totals with it.
  test('the summary page is not a register page', () => {
    expect(isB4RegisterSheetName(B4_SUMMARY_SHEET)).toBe(false);
  });

  test.each([null, undefined, 42, {}])('non-strings are not register sheets: %s', (v) => {
    expect(isB4RegisterSheetName(v)).toBe(false);
  });
});

describe('planning which pages to keep', () => {
  const blocks = [
    { pages: [2, 3, 4, 5, 6, 7] },
    { pages: [8, 9, 10, 11] },
    { pages: [12, 13, 14, 15] },
    { pages: [16, 17, 18, 19] },
  ];

  test('an empty filing still keeps block 1\'s first page', () => {
    expect(planB4PagesToKeep([], blocks)).toEqual([2]);
  });

  test('a single short account keeps only its first page', () => {
    expect(planB4PagesToKeep([2], blocks)).toEqual([2]);
  });

  test('an account that overflows keeps its continuation pages too', () => {
    expect(planB4PagesToKeep([2, 3, 4], blocks)).toEqual([2, 3, 4]);
  });

  // The block's first page carries the bank name and account number. Keeping
  // rows without it would file those disbursements under no account at all.
  test('a later block keeps its header page even when rows start further in', () => {
    expect(planB4PagesToKeep([9], blocks)).toEqual([2, 8, 9]);
  });

  test('several accounts keep each of their own header pages', () => {
    expect(planB4PagesToKeep([2, 8, 12, 16], blocks)).toEqual([2, 8, 12, 16]);
  });

  test('unused blocks are dropped entirely', () => {
    expect(planB4PagesToKeep([2, 12], blocks)).toEqual([2, 12]);
  });

  // The extended workbook adds blocks 5-12 on the same four-page shape.
  test('scales to the extended twelve-account block map', () => {
    const extended = [
      ...blocks,
      ...Array.from({ length: 8 }, (_, i) => ({
        pages: [20 + i * 4, 21 + i * 4, 22 + i * 4, 23 + i * 4],
      })),
    ];
    expect(planB4PagesToKeep([48, 49], extended)).toEqual([2, 48, 49]);
    expect(planB4PagesToKeep([51], extended)).toEqual([2, 48, 51]);
  });

  test('tolerates junk input without inventing pages', () => {
    expect(planB4PagesToKeep(null, blocks)).toEqual([2]);
    expect(planB4PagesToKeep([NaN, undefined], blocks)).toEqual([2]);
    expect(planB4PagesToKeep([2], null)).toEqual([2]);
    expect(planB4PagesToKeep([], [])).toEqual([]);
  });
});
