import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { SCHEDULE_SCHEMAS } from '../../src/core/form/schedule-schemas.js';

// Milestone 75E (decision 75E-1, the requester 2026-10-10): every Annual
// schedule list's label names its own schedule, pinned to its screen's
// heading so the two can't drift apart. Ten named the wrong schedule or none
// of their heading's words -- B-1 and B-2 swapped, B-3 "Other Professional
// Fee", D-2 to D-5 shifted by one, F-1 "Outstanding Claim", F-2 "Contingent
// Liability", D-1 "Bank Account" (Schedule E's word, not Cash Assets'). The
// screens' headings agree with the Clerk's sheet names and the workbook caps.

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const screens = fs.readFileSync(path.join(ROOT, 'src/features/annual-accounting/index.js'), 'utf8');
const HEADINGS = Object.fromEntries([...screens.matchAll(/<h1>Schedule ([A-F](?:-\d)?) — ([^<]+)<\/h1>/g)].map((m) => [m[1], m[2]]));

const IGNORED = new Set(['and', 'of', 'the', 'during', 'period', 'other', 'all', 'entry', 'asset', 'received']);
/** A heading's or label's meaningful words, singular. */
const words = (text) => new Set(String(text).toLowerCase().split(/[^a-z]+/)
  .filter((w) => w.length > 2 && !IGNORED.has(w))
  .map((w) => w.replace(/ies$/, 'y').replace(/s$/, '')));
const shared = (a, b) => [...a].filter((w) => b.has(w)).length;
const codeOf = (listKey) => listKey.slice(3).replace(/^([A-F])(\d)$/, '$1-$2');

const ANNUAL_LISTS = Object.keys(SCHEDULE_SCHEMAS).filter((key) => /^sch[A-F]\d?$/.test(key));

describe('Milestone 75E: each Annual schedule\'s label names its own schedule', () => {
  it('reads all fourteen schedules\' headings and lists', () => {
    expect(Object.keys(HEADINGS)).toHaveLength(14);
    expect(ANNUAL_LISTS.map(codeOf).sort()).toEqual(Object.keys(HEADINGS).sort());
  });

  for (const listKey of ANNUAL_LISTS) {
    it(`${listKey}: "${SCHEDULE_SCHEMAS[listKey].label}" is Schedule ${codeOf(listKey)}'s`, () => {
      const code = codeOf(listKey);
      const label = SCHEDULE_SCHEMAS[listKey].label;
      expect(label.startsWith(`Schedule ${code} `), 'its code').toBe(true);
      const mine = words(label.slice(`Schedule ${code} `.length));
      const own = shared(mine, words(HEADINGS[code]));
      expect(own, `a word of its heading, "${HEADINGS[code]}"`).toBeGreaterThan(0);
      for (const [other, heading] of Object.entries(HEADINGS)) {
        if (other !== code) expect(shared(mine, words(heading)), `no closer to Schedule ${other}'s "${heading}"`).toBeLessThanOrEqual(own);
      }
    });
  }
});
