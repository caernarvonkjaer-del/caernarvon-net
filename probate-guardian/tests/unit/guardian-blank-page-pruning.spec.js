import { describe, expect, test } from 'vitest';
import {
  guardianPagesUsed,
  unusedGuardianContinuationSheets,
} from '../../src/core/excel/guardian-inventory-pages.js';

// Which Initial Inventory pages a filing never reaches.
//
// The court's workbook ships every printed page of all eleven schedules -- 21
// continuation pages beyond each schedule's first. A real inventory listing a
// house, two bank accounts and a car reaches the first page of each schedule
// and none of the rest, so without pruning the clerk receives 21 pages of empty
// pre-printed grid. The form's own instructions say to remove them.
//
// The failure that matters is the opposite one: pruning a page a filing DID
// write to would delete listed assets out of a court inventory silently. So
// what these pin is the boundary -- the exact entry count at which a page
// starts being needed -- and that the page counts here agree with the page
// maps the writer itself fills from.
//
// AGENTS.md section 13: the workbook is the authority for the page geometry.
// tests/unit/guardian-page-map.spec.js checks that geometry against the
// shipped template; this file checks what is done with it.

const pages = (n) => Array.from({ length: n }, (_, i) => ({
  name: `pg ${i + 1}`,
  rows: [1, 2, 3],
}));

describe('guardianPagesUsed', () => {
  // A schedule with nothing in it still prints its first page. Dropping it
  // would leave the inventory looking as though the schedule had never been
  // considered, rather than considered and reported empty.
  test.each([
    ['no entries still keeps page 1', 0, 1],
    ['one entry needs page 1', 1, 1],
    ['a full page 1 needs only page 1', 3, 1],
    ['one past page 1 reaches page 2', 4, 2],
    ['a full page 2 needs two pages', 6, 2],
    ['one past page 2 reaches page 3', 7, 3],
  ])('%s', (_label, entries, expected) => {
    expect(guardianPagesUsed(pages(4), entries)).toBe(expected);
  });

  test('treats junk entry counts as empty rather than throwing', () => {
    for (const bad of [-5, NaN, undefined, null]) {
      expect(guardianPagesUsed(pages(3), bad)).toBe(1);
    }
  });

  // The pages are not uniform: a schedule's first page carries the form's
  // heading and instructions, so it holds fewer rows than its continuations.
  test('respects each page\'s own row count rather than assuming they match', () => {
    const uneven = [{ name: 'pg 1', rows: [1, 2] }, { name: 'pg 2', rows: [1, 2, 3, 4, 5] }];
    expect(guardianPagesUsed(uneven, 2)).toBe(1);
    expect(guardianPagesUsed(uneven, 3)).toBe(2);
    expect(guardianPagesUsed(uneven, 7)).toBe(2);
  });
});

describe('unusedGuardianContinuationSheets', () => {
  const ALL_CONTINUATIONS = [
    'A-1-REAL ESTATE pg 2', 'A-1-REAL ESTATE pg 3',
    'A-2-REAL ESTATE MTG pg 2', 'A-2-REAL ESTATE MTG pg 3',
    'B-1 CASH pg 2', 'B-1 CASH pg 3', 'B-1 CASH pg 4',
    'B-2 PER PROP pg 2', 'B-2 PER PROP pg 3', 'B-2 PER PROP pg 4',
    'B-3 INTANGIBLE pg 2',
    'B-4 PERS PROP LIAB pg 2', 'B-4 PERS PROP LIAB pg 3', 'B-4 PERS PROP LIAB pg 4',
    'C-1 INCOME pg 2', 'C-1 INCOME pg 3',
    'C-2 LAWSUIT AGAINST pg 2',
    'C-3 LAWSUIT BY WARD pg 2',
    'C-4 TRUSTS pg 2',
    'C-5 JOINT OWNERS pg 2',
    // Not a continuation page the exporter can reach: SCHEDULE_C5_PAGES stops
    // at page 2, so page 3 ships blank in every filing and always goes.
    'C-5 JOINT OWNERS pg 3',
  ];

  test('an empty inventory gives up every continuation page and no first page', () => {
    const unused = unusedGuardianContinuationSheets({});
    expect(new Set(unused)).toEqual(new Set(ALL_CONTINUATIONS));
    expect(unused).toHaveLength(21);
    // Never a 'pg 1'. Every schedule keeps its first page.
    expect(unused.filter((n) => /pg 1|AGAINST 1/.test(n))).toEqual([]);
  });

  test('a missing or malformed inventory is treated as empty, not as an error', () => {
    for (const bad of [null, undefined, { scheduleB1: null }, { scheduleB1: 'nope' }]) {
      expect(unusedGuardianContinuationSheets(bad)).toHaveLength(21);
    }
  });

  // The realistic filing: a house, two accounts, a car. Everything fits on the
  // first page of its schedule, so all 21 continuations go.
  test('a small real inventory still gives up all 21', () => {
    const unused = unusedGuardianContinuationSheets({
      scheduleA1: [{}],
      scheduleB1: [{}, {}],
      scheduleB2: [{}],
      scheduleC1: [{}],
    });
    expect(unused).toHaveLength(21);
  });

  // The failure this exists to prevent: a page holding real listed assets must
  // never be in the doomed set. B-1 CASH page 1 holds six accounts.
  test('a schedule that overflows keeps exactly the pages it reached', () => {
    const seven = { scheduleB1: Array.from({ length: 7 }, () => ({})) };
    const unused = unusedGuardianContinuationSheets(seven);
    expect(unused, 'page 2 holds the seventh account').not.toContain('B-1 CASH pg 2');
    expect(unused).toContain('B-1 CASH pg 3');
    expect(unused).toContain('B-1 CASH pg 4');
    // The other ten schedules are untouched by B-1 overflowing.
    expect(unused).toHaveLength(20);
  });

  // C-5 page 3 exists in the workbook but in no page map, so nothing can ever
  // write to it. It goes even from a filing large enough to fill everything
  // else -- which is also the signal that its rows are unreachable.
  test('always drops the C-5 page the exporter cannot reach', () => {
    const full = {};
    for (const { key } of [{ key: 'scheduleC5' }]) full[key] = Array.from({ length: 500 }, () => ({}));
    expect(unusedGuardianContinuationSheets(full)).toContain('C-5 JOINT OWNERS pg 3');
  });

  test('the boundary is exact -- six cash accounts fit page 1, seven do not', () => {
    const at = unusedGuardianContinuationSheets({ scheduleB1: Array.from({ length: 6 }, () => ({})) });
    expect(at).toContain('B-1 CASH pg 2');
    const over = unusedGuardianContinuationSheets({ scheduleB1: Array.from({ length: 7 }, () => ({})) });
    expect(over).not.toContain('B-1 CASH pg 2');
  });

  test('a filing large enough to reach every page gives up nothing', () => {
    const full = {};
    for (const key of ['scheduleA1', 'scheduleA2', 'scheduleB1', 'scheduleB2', 'scheduleB3',
      'scheduleB4', 'scheduleC1', 'scheduleC2', 'scheduleC3', 'scheduleC4', 'scheduleC5']) {
      full[key] = Array.from({ length: 200 }, () => ({}));
    }
    expect(unusedGuardianContinuationSheets(full)).toEqual(['C-5 JOINT OWNERS pg 3']);
  });

  test('each schedule is decided on its own entries, not on the others', () => {
    const unused = unusedGuardianContinuationSheets({
      scheduleC1: Array.from({ length: 6 }, () => ({})), // spills to C-1 pg 2
    });
    expect(unused).not.toContain('C-1 INCOME pg 2');
    expect(unused).toContain('C-1 INCOME pg 3');
    expect(unused).toContain('B-1 CASH pg 2');
  });
});
