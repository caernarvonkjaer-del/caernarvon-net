import { describe, expect, test } from 'vitest';
import { wardShareAdvisories } from '../../src/core/filing/ward-share-advisories.js';

// With the Annual Accounting reading Ward's % as a percentage everywhere
// (tests/unit/annual-ward-percentage.spec.js), a filer who typed a fraction --
// 0.5 meaning half -- now gets 0.5%. Preview & Export says so for every
// Schedule D share of 1 or less, without blocking anything.

const row = (wardPct) => ({ description: 'x', fullAmount: 1000, wardPct });

describe('ward-share notes on Preview & Export', () => {
  test('a Schedule D share above 0 and at most 1 gets a note naming its schedule and line', () => {
    const notes = wardShareAdvisories({ schD1: [row('50'), row('1')], schD3: [row('0.5')], schD5: [row(0.25)] });
    expect(notes.map((n) => n.field)).toEqual(['schD1.1.wardPct', 'schD3.0.wardPct', 'schD5.0.wardPct']);
    expect(notes[0]).toMatchObject({ code: 'ward-share.small', severity: 'advisory' });
    expect(notes[0].message).toBe("Schedule D-1 — Line 2 — Ward's % reads as 1%. If the ward's share is the whole amount, enter 100.");
    expect(notes[1].message).toContain('Schedule D-3 — Line 1');
    expect(notes[1].message).toContain('reads as 0.5%');
  });

  test('no note for ordinary shares, a zero share, a blank one, or anything outside Schedule D', () => {
    expect(wardShareAdvisories({
      schD1: [row('50'), row('100'), row(''), row('0'), row(null)],
      schD2: [row(75)], schD4: [row('1.5')],
      schA: [row('1')],
    })).toEqual([]);
    expect(wardShareAdvisories(null)).toEqual([]);
    expect(wardShareAdvisories({})).toEqual([]);
  });
});
