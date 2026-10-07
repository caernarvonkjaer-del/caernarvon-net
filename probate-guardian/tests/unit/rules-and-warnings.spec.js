// Milestone 73F part 3: the rule changes the requester settled (2026-10-04),
// each on the form it governs -- and the two Preview warnings, which never
// block.
//   73F-1  "Amended Form?" is required wherever the field exists: the Inventory
//          asked it on its Cover and never checked it.
//   73F-4  The Inventory's schedules with no entries and no "none" tick are a
//          prompt, as on the Annual -- they used to block export.
//   73F-7  The Simplified's remuneration Amount is required once a row is
//          entered, as on the Annual's Part XI.
//   73F-6  A trust answered No to "created after the GID?" while its creation
//          date is after the GID: a Preview warning.
//   73F-8  A transaction dated outside the accounting period: a Preview warning.
//   73F-5  Part VIII has no "no trusts" tick any more; nothing clears one.
import { describe, expect, it, vi } from 'vitest';

vi.mock('../../src/core/navigation/router.js', () => ({ navigate: () => {}, renderPage: () => {} }));
globalThis.window = globalThis.window || globalThis;

const { initializeEmptyData } = await import('../../src/core/filing/filing-registry.js');
const { engineChecks, evaluateFiling } = await import('../../src/core/validation/engines/index.js');
const { periodDateAdvisories, trustCreatedAfterGidAdvisories } = await import('../../src/core/filing/date-advisories.js');
const { noItemsKeyFor } = await import('../../src/core/form/no-items-keys.js');
const { getCollection } = await import('../../src/core/form/collections.js');

const json = (x) => JSON.parse(JSON.stringify(x));
const blank = (type) => ({ ...json(initializeEmptyData(type)), inventoryType: type });

describe('the Initial Inventory', () => {
  it('"Amended Form?" is required (73F-1)', () => {
    const d = blank('guardian');
    expect(engineChecks('guardian')(d).map((i) => i.path)).toContain('amendedForm');
    expect(engineChecks('guardian')({ ...d, amendedForm: 'No' }).map((i) => i.path)).not.toContain('amendedForm');
  });

  it('a schedule with no entries and no tick is a prompt, never a blocker (73F-4); an untouched "+ Add" row is no entry', () => {
    const d = blank('guardian');
    const evaluation = evaluateFiling(d);
    expect(evaluation.blockers.filter((i) => String(i.path).startsWith('scheduleNoItems.'))).toEqual([]);
    expect(evaluation.prompts.filter((p) => p.code.startsWith('prompt.guardian.no-items.')).map((p) => [p.path, p.route]))
      .toEqual(['a1', 'a2', 'b1', 'b2', 'b3', 'b4', 'c1', 'c2', 'c3', 'c4', 'c5'].map((k) => [`scheduleNoItems.${k}`, `/${k}`]));
    const ticked = { ...d, scheduleNoItems: { a1: true } };
    expect(evaluateFiling(ticked).prompts.map((p) => p.path)).not.toContain('scheduleNoItems.a1');
    const untouchedRow = evaluateFiling({ ...d, scheduleC4: [getCollection('guardian', 'scheduleC4').factory()] });
    expect(untouchedRow.prompts.map((p) => p.path)).toContain('scheduleNoItems.c4');
  });
});

describe("the Simplified's remuneration Amount (73F-7)", () => {
  it('is required once a row is entered; 0 is an answer', () => {
    const d = { ...blank('simplified'), remuneration: [{ guardian: 'Ann', type: 'Fee', amount: '', description: '' }] };
    expect(engineChecks('simplified')(d).map((i) => i.message)).toContain('Part VII — Line 1 — Amount');
    expect(engineChecks('simplified')({ ...d, remuneration: [{ ...d.remuneration[0], amount: 0 }] }).map((i) => i.path)).not.toContain('remuneration.0.amount');
  });
});

describe('two Preview warnings on the Annual family, never blocking', () => {
  const annual = (over) => ({ ...blank('annual'), gid: '2025-01-01', periodFrom: '2026-01-01', periodTo: '2026-12-31', ...over });

  it('a transaction dated outside the accounting period (73F-8)', () => {
    const d = annual({ schB1: [{ payee: 'Fee', datePaid: '2027-01-05' }], schC: [{ description: 'Adj', date: '2026-06-01' }], schE: [{ bankName: 'B', transferOutDate: '2025-12-31' }] });
    expect(periodDateAdvisories(d).map((a) => [a.field, a.message])).toEqual([
      ['schB1.0.datePaid', 'Schedule B-1 — Line 1 — Date Paid 01/05/2027 is outside the accounting period (01/01/2026 to 12/31/2026).'],
      ['schE.0.transferOutDate', 'Schedule E — Line 1 — Transfer Out Date 12/31/2025 is outside the accounting period (01/01/2026 to 12/31/2026).'],
    ]);
    const evaluation = evaluateFiling(d);
    expect(evaluation.advisories.map((a) => a.code)).toContain('date.outside-period');
    expect(evaluation.blockers.map((i) => i.code)).not.toContain('date.outside-period');
  });

  it('a trust created after the GID but answered No to "created after the GID?" (73F-6)', () => {
    const d = annual({ trusts: [{ hasTrust: 'Yes', name: 'T', dateCreated: '2025-06-01', createdAfterGID: 'No' }, { name: 'U', dateCreated: '2024-06-01', createdAfterGID: 'No' }] });
    expect(trustCreatedAfterGidAdvisories(d).map((a) => a.field)).toEqual(['trusts.0.createdAfterGID']);
    expect(trustCreatedAfterGidAdvisories({ ...d, trusts: [{ ...d.trusts[0], createdAfterGID: 'Yes' }] })).toEqual([]);
    expect(evaluateFiling(d).advisories.map((a) => a.code)).toContain('trust.created-after-gid');
  });
});

describe('Part VIII (73F-5)', () => {
  it('has no "no items" tick: question #1 answers it', () => {
    expect(noItemsKeyFor('annual', 'trusts')).toBe(null);
    expect(noItemsKeyFor('annual', 'schA')).toBe('scha');
  });
});
