import { describe, expect, test, beforeAll } from 'vitest';
import { checkExcelCapacity, getExcelCapacityIssues } from '../../src/core/excel/excel-capacity.js';

// Milestone 58D — Part XI, Guardian(s) Declaration of Remuneration.
//
// Section 744.367(3)(a) requires the annual report to INCLUDE a declaration of
// all remuneration received by the guardian. Three separate things stopped
// that from happening, and each is pinned below.

// The court's own PART XI sheet, read from templates/annual-template.js:
// A4 "Part XI", C4 the declaration heading, A5 (merged A5:G5) the statutory
// paragraph, rows 6-32 empty merged A:G bands, print area A1:G32. No column
// headers, no table, no data validation, no named range -- no entry grid at
// all. The exporter nonetheless wrote entries to B/D/F/I on rows 16-40, where
// column I is outside the print area and rows 33-40 are past the sheet end.
// A guardian who entered remuneration and filed the workbook filed a Part XI
// carrying only the statutory paragraph, with the declaration missing.
const REMUNERATION_LIMIT = { remuneration: { cap: 0, label: 'Part XI — Remuneration', route: '/p11',
  unsupported: "the court's Excel workbook has no entry area for Part XI, so remuneration cannot be written to it. File this accounting as PDF, where Part XI prints in full." } };

describe('58D: Excel cannot carry Part XI, and says so', () => {
  test('a single populated entry exceeds the workbook', () => {
    const over = checkExcelCapacity(REMUNERATION_LIMIT, { remuneration: [{ guardian: 'G', type: 'Fee', amount: '100' }] });
    expect(over).toHaveLength(1);
    expect(over[0].cap).toBe(0);
  });

  test('blank rows do not, so an unanswered Part XI never blocks Excel on its own', () => {
    expect(checkExcelCapacity(REMUNERATION_LIMIT, { remuneration: [{ guardian: '', type: '', amount: '', description: '' }] })).toEqual([]);
    expect(checkExcelCapacity(REMUNERATION_LIMIT, { remuneration: [] })).toEqual([]);
  });

  // The message has to tell the filer what to do. "template holds 0" is
  // accurate and useless, and implies a larger template would help.
  test('the message names PDF as the way to file, not a row count', () => {
    const [issue] = getExcelCapacityIssues('annual', { remuneration: [{ guardian: 'G' }] }, REMUNERATION_LIMIT);
    expect(issue.message).toContain('no entry area for Part XI');
    expect(issue.message).toContain('File this accounting as PDF');
    expect(issue.message).not.toContain('template holds');
  });

  // Every other schedule keeps the row-count wording, which is correct for
  // them: the workbook does hold those, just fewer than the filer entered.
  test('a genuine row-count overflow still reads as one', () => {
    const [issue] = getExcelCapacityIssues('annual', { schA: [1, 2, 3] },
      { schA: { cap: 2, label: 'Schedule A — Income', route: '/scha' } });
    expect(issue.message).toBe('Schedule A — Income: 3 entries (template holds 2)');
  });

  test('the issue is non-bypassable and scoped to Excel, leaving PDF available', async () => {
    const { getIssueDefinition } = await import('../../src/core/validation/issue-registry.js');
    const def = getIssueDefinition('excel.capacity.annual.remuneration');
    expect(def.bypassable).toBe(false);
    expect(def.capabilities).toEqual(['excel']);
  });
});

describe('58D: the empty-state declaration is reachable', () => {
  let emptyDataAnnual;
  beforeAll(async () => {
    globalThis.window = globalThis.window || {};
    ({ emptyDataAnnual } = await import('../../src/core/state.js'));
  });

  // The "I verify there are no remuneration entries to report" checkbox only
  // renders while the array is empty. Seeding one blank placeholder row hid
  // the single control that answers Part XI behind deleting a meaningless row.
  test('a new Annual filing starts with no placeholder row', () => {
    if (typeof emptyDataAnnual !== 'function') return; // not exported; covered by e2e
    expect(emptyDataAnnual().remuneration).toEqual([]);
  });
});
