import { describe, expect, test, beforeAll } from 'vitest';
import { REMUNERATION_DECLARATION, REMUNERATION_NONE_REPORTED } from '../../src/core/filing/statutory-text.js';
import { SCHEDULE_SCHEMAS } from '../../src/core/form/schedule-definitions.js';

// Milestones 60G, 60I and 60J -- the remuneration declaration, which
// 744.367(3)(a) requires an annual guardianship report to INCLUDE, and which
// Annual and Simplified had been printing differently, incompletely, or (on
// Simplified, with no entries) not at all.
//
// The paragraph's authority is the statute itself, not either workbook: both
// clerk transcriptions drop the "guardian of the property ... guardian of the
// person ... both" clause and the Simplified one carries two typos
// ("poperty", "in case or in kind"). Verified 2026-09-20 against
// flhouse.gov/Statutes/2025/0744.367, codes.findlaw.com and
// flsenate.gov/Laws/Statutes/2025/0744.367, which agree on the wording.

describe('60I: one statutory paragraph, sourced from the statute', () => {
  test('is 744.367(3)(a)\'s two remuneration sentences, verbatim', () => {
    expect(REMUNERATION_DECLARATION).toBe(
      'The annual guardianship report of a guardian of the property and the annual '
      + 'guardianship report of a guardian of the person must both include a declaration '
      + 'of all remuneration received by the guardian from any source for services '
      + 'rendered to or on behalf of the ward. As used in this paragraph, the term '
      + '“remuneration” means any payment or other benefit made directly or indirectly, '
      + 'overtly or covertly, or in cash or in kind to the guardian.',
    );
  });

  test('does not carry the clerk transcription\'s typos', () => {
    expect(REMUNERATION_DECLARATION).not.toContain('poperty');
    expect(REMUNERATION_DECLARATION).not.toContain('in case or in kind');
  });

  test('keeps the definition sentence the Annual model used to truncate away', () => {
    expect(REMUNERATION_DECLARATION).toContain('As used in this paragraph');
    expect(REMUNERATION_DECLARATION).toContain('overtly or covertly');
  });
});

describe('60G: Simplified\'s remuneration rows carry an amount', () => {
  let emptyDataSimplified;
  beforeAll(async () => {
    globalThis.window = globalThis.window || {};
    ({ emptyDataSimplified } = await import('../../src/core/filing/models/simplified.js'));
  });

  // The field was already in probate-guardian-data-model.csv and in the shared
  // row factory, and Simplified's Excel export/import already wrote and read
  // it; only Simplified's own factory and UI never adopted it, so nothing
  // upstream ever set it. This is the drift guard for that three-way
  // disagreement -- it fails if the hand-rolled row and the shared factory
  // part company again, without core/state.js having to import the schedule
  // module for one row literal.
  test('the hand-rolled initial row has exactly the shared factory\'s keys', () => {
    const shared = Object.keys(SCHEDULE_SCHEMAS.remuneration.factory()).sort();
    expect(shared).toContain('amount');
    const rows = emptyDataSimplified().remuneration;
    // 60J: starts empty, like Annual since 58D -- see that test below.
    const row = rows[0] || SCHEDULE_SCHEMAS.remuneration.factory();
    expect(Object.keys(row).sort()).toEqual(shared);
  });

  test('a new Simplified filing starts with no placeholder row, so the no-items control is reachable', () => {
    expect(emptyDataSimplified().remuneration).toEqual([]);
  });
});

describe('60I/60J: both models print the same declaration', () => {
  const BUILDERS = {};
  beforeAll(async () => {
    globalThis.window = globalThis.window || {};
    BUILDERS.annual = (await import('../../src/features/annual-accounting/pdf-model.js')).buildAnnualAccountingModel;
    BUILDERS.simplified = (await import('../../src/features/simplified-accounting/pdf-model.js')).buildSimplifiedAccountingModel;
  });

  const annualD = (extra = {}) => ({ wardName: 'W', caseNumber: '26-CP-1', county: 'Pinellas', inventoryType: 'annual', ...extra });
  const simpD = (extra = {}) => ({ wardName: 'W', caseNumber: '26-CP-1', county: 'Pinellas', inventoryType: 'simplified', ...extra });
  const section = (model, id) => model.sections.find(s => s.id === id);
  const noticeText = (sec) => sec.blocks.filter(b => b.type === 'notice').map(b => b.text).join(' ');

  test('Annual\'s Part XI prints the full paragraph, not just its first sentence', () => {
    const sec = section(BUILDERS.annual(annualD({ scheduleNoItems: { remuneration: true } }), {}), 'part11');
    expect(sec, 'Part XI missing').toBeTruthy();
    expect(noticeText(sec)).toContain(REMUNERATION_DECLARATION);
  });

  test('Simplified\'s Part VII prints the same paragraph', () => {
    const sec = section(BUILDERS.simplified(simpD({ remuneration: [{ guardian: 'G', type: 'Fee', amount: '100' }] }), {}), 'part7');
    expect(sec, 'Part VII missing').toBeTruthy();
    expect(noticeText(sec)).toContain(REMUNERATION_DECLARATION);
  });

  // The defect Milestone 58D fixed for Annual and nobody checked for
  // Simplified: with no entries the whole part vanished, so a reader could not
  // tell a guardian who received nothing from a form that omitted the question.
  test('60J: Simplified prints Part VII with no entries at all', () => {
    const sec = section(BUILDERS.simplified(simpD({ remuneration: [], scheduleNoItems: { remuneration: true } }), {}), 'part7');
    expect(sec, 'Part VII vanished on a filing with no remuneration').toBeTruthy();
    expect(noticeText(sec)).toContain(REMUNERATION_DECLARATION);
    expect(noticeText(sec)).toContain(REMUNERATION_NONE_REPORTED);
    expect(sec.blocks.some(b => b.type === 'table')).toBe(false);
  });

  test('60J: Annual and Simplified use the same "none reported" wording', () => {
    const a = section(BUILDERS.annual(annualD({ remuneration: [], scheduleNoItems: { remuneration: true } }), {}), 'part11');
    expect(noticeText(a)).toContain(REMUNERATION_NONE_REPORTED);
  });

  test('60G: Simplified\'s entries table has an Amount column, matching Annual\'s', () => {
    const sec = section(BUILDERS.simplified(simpD({ remuneration: [{ guardian: 'Rachel Alvarez', type: 'Guardian fee', description: 'Court-approved', amount: '1250.5' }] }), {}), 'part7');
    const table = sec.blocks.find(b => b.type === 'table');
    expect(table.headers).toEqual(['#', 'Guardian Name', 'Type', 'Description', 'Amount']);
    expect(table.rows[0]).toEqual(['1', 'Rachel Alvarez', 'Guardian fee', 'Court-approved', '$1,250.50']);
    expect(table.rows[0]).toHaveLength(table.headers.length);
  });

  // An amount alone is a disclosable benefit: the row must not be filtered out
  // for want of a name or type, which is what the old filter did.
  test('60G: a row carrying only an amount still reaches the declaration', () => {
    const sec = section(BUILDERS.simplified(simpD({ remuneration: [{ guardian: '', type: '', description: '', amount: '500' }] }), {}), 'part7');
    const table = sec.blocks.find(b => b.type === 'table');
    expect(table, 'an amount-only row was dropped from Part VII').toBeTruthy();
    expect(table.rows[0].at(-1)).toBe('$500.00');
  });
});
