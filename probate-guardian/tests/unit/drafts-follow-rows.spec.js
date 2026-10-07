// Milestone 73F part 3: a date still being typed (an "impossible-date draft",
// commit-coordinator.js, keyed by its full path) moves with its row and goes
// with it. Removing row 1 used to leave row 3's draft on whichever row moved
// into index 2 -- shown in the wrong row -- and a list cut below that index
// left it orphaned: an impossible date nobody could see or clear. With that
// built, an impossible date can't be overridden (decision 73F-3), and judging
// a copy of the filing no longer marks the open filing changed.
import { describe, expect, it, vi } from 'vitest';

vi.mock('../../src/core/navigation/router.js', () => ({ navigate: () => {}, renderPage: () => {} }));
globalThis.window = globalThis.window || globalThis;

const { appendRow, duplicateRowAt, keepRowsAt, removeRowAt } = await import('../../src/core/form/collections.js');
const { commitStoredDateDrafts, getFieldDraftIssues } = await import('../../src/core/form/commit-coordinator.js');
const { setPath } = await import('../../src/core/form/paths.js');
const { getIssueDefinition } = await import('../../src/core/validation/issue-registry.js');
const { evaluateFiling } = await import('../../src/core/validation/engines/index.js');
const { initializeEmptyData } = await import('../../src/core/filing/filing-registry.js');

const draft = (rawValue) => ({ kind: 'date', rawValue, label: 'Date Paid', section: 'Schedule B-1', route: '/schb1' });
const rows = (n) => Array.from({ length: n }, (_, i) => ({ payee: `P${i}`, datePaid: '' }));
const filing = () => ({
  inventoryType: 'annual', schB1: rows(4),
  __fieldDrafts: { 'schB1.1.datePaid': draft('02/30/2026'), 'schB1.3.datePaid': draft('13/45/2026'), periodFrom: draft('99/99/9999') },
});

describe('a date still being typed moves with its row', () => {
  it('Remove: the removed row\'s draft goes; the rows below move up with theirs; other drafts stay', () => {
    const d = filing();
    removeRowAt(d, 'schB1', 1);
    expect(Object.keys(d.__fieldDrafts).sort()).toEqual(['periodFrom', 'schB1.2.datePaid']);
    expect(d.__fieldDrafts['schB1.2.datePaid'].rawValue).toBe('13/45/2026');
  });

  it('Duplicate: the rows below move down with theirs; the copy starts with none', () => {
    const d = filing();
    duplicateRowAt(d, 'schB1', 1);
    expect(Object.keys(d.__fieldDrafts).sort()).toEqual(['periodFrom', 'schB1.1.datePaid', 'schB1.4.datePaid']);
  });

  it('the clean-up (rows kept, the rest dropped): each draft follows its row or goes', () => {
    const d = filing();
    keepRowsAt(d, 'schB1', [0, 3]);
    expect(Object.keys(d.__fieldDrafts).sort()).toEqual(['periodFrom', 'schB1.1.datePaid']);
    expect(d.__fieldDrafts['schB1.1.datePaid'].rawValue).toBe('13/45/2026');
  });

  it('a valid draft whose row is gone is dropped, never written as a new bare row', () => {
    const d = { inventoryType: 'annual', schB1: rows(1), __fieldDrafts: { 'schB1.5.datePaid': draft('01/02/2026') } };
    commitStoredDateDrafts(d, setPath);
    expect(d.schB1).toHaveLength(1);
    expect(d.__fieldDrafts).toEqual({});
  });

  it('its message names the row it is on now, not the row it was typed on', () => {
    const d = { inventoryType: 'annual', schB1: rows(4), guardians: [{}, {}], __fieldDrafts: { 'schB1.3.datePaid': draft('13/45/2026'), 'guardians.1.signatureDate': { ...draft('02/30/2026'), label: 'Signature Date', section: 'Part III' } } };
    const messages = () => getFieldDraftIssues(d).map((i) => i.message).sort();
    expect(messages()).toEqual([
      'Part III — Guardian #2 — Signature Date must be a valid date using a four-digit year.',
      'Schedule B-1 — Line 4 — Date Paid must be a valid date using a four-digit year.',
    ]);
    removeRowAt(d, 'schB1', 0);
    expect(messages()[1]).toBe('Schedule B-1 — Line 3 — Date Paid must be a valid date using a four-digit year.');
  });

  it('"+ Add" moves no draft', () => {
    const d = filing();
    appendRow(d, 'schB1');
    expect(Object.keys(d.__fieldDrafts).sort()).toEqual(['periodFrom', 'schB1.1.datePaid', 'schB1.3.datePaid']);
  });
});

describe("an impossible date can't be overridden (decision 73F-3)", () => {
  it('the issue is not bypassable, and Preview counts it among the blockers', () => {
    expect(getIssueDefinition('field.date.invalid').bypassable).toBe(false);
    const d = { ...JSON.parse(JSON.stringify(initializeEmptyData('annual'))), inventoryType: 'annual', __fieldDrafts: { periodFrom: { kind: 'date', rawValue: '02/30/2026', label: 'Accounting Period From', section: 'Part I', route: '/' } } };
    expect(getFieldDraftIssues(d).map((i) => i.message)).toEqual(['Part I — Accounting Period From must be a valid date using a four-digit year.']);
    const blocker = evaluateFiling(d).blockers.find((i) => i.code === 'field.date.invalid');
    expect(blocker.bypassable).toBe(false);
  });
});
