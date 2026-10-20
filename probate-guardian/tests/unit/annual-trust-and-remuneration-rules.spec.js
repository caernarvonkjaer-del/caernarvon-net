import { afterAll, beforeAll, describe, expect, test, vi } from 'vitest';

// TEST-REVIEW.md Delivery 1M (2026-10-13). Two Annual rules that only the
// browser suite pinned -- navigation-status.contract.spec.ts's Milestone
// 57E-1 and 58D blocks drove the page to ask the engine a question the
// engine decides on its own. Judged here directly: the shared export checks
// (evaluateFiling, what Preview & Export runs) and the sidebar's marks
// (judgeFiling, what the section list shows), on the minimal-valid Annual
// fixture, plus the two load-time normalizations 58D added.

let m;
beforeAll(async () => {
  vi.stubGlobal('window', globalThis);
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-05T12:00:00'));
  const [registry, fixtures, engines, marks, policy, normalize] = await Promise.all([
    import('../../src/core/filing/filing-registry.js'),
    import('../e2e/support/fixtures.ts'),
    import('../../src/core/validation/engines/index.js'),
    import('../../src/core/status/section-marks.js'),
    import('../../src/core/status/section-guidance-policy.js'),
    import('../../src/core/filing/normalize-filing.js'),
  ]);
  m = { registry, fixtures, engines, marks, policy, normalize };
}, 120_000);
afterAll(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

const json = (x) => JSON.parse(JSON.stringify(x));
const annual = (patch = {}) => ({
  ...json(m.registry.initializeEmptyData('annual')),
  ...json(m.fixtures.MINIMAL_VALID_ANNUAL),
  inventoryType: 'annual',
  ...json(patch),
});
const blockers = (d) => m.engines.evaluateFiling(d).blockers;
const messages = (d, part) => blockers(d).filter((i) => i.message.includes(part)).map((i) => i.message);
const sidebarComplete = (d, route) => m.marks.judgeFiling(d, 'annual').checks[m.policy.sectionCheckKey('annual', route)];

describe('57E-1: an affirmative trust answer must name a trust (Part VIII, /p8)', () => {
  const NAME = 'Part VIII — Trust 1 — Name';

  test('Yes with every trust card blank raises the issue, bypassable, and the sidebar agrees', () => {
    const d = annual({ trusts: [{ hasTrust: 'Yes' }, {}, {}] });
    expect(messages(d, 'Part VIII')).toContain(NAME);
    const issue = blockers(d).find((i) => i.message === NAME);
    // D9: an acknowledgement at output, never a hard block.
    expect(issue.bypassable).not.toBe(false);
    expect(sidebarComplete(d, '/p8')).toBe(false);
  });

  test('one described trust satisfies it', () => {
    const d = annual({ trusts: [{ hasTrust: 'Yes', name: 'Ashford Family Trust', createdAfterGID: 'No' }, {}, {}] });
    expect(messages(d, 'Part VIII')).not.toContain(NAME);
    expect(sidebarComplete(d, '/p8')).toBe(true);
  });

  test('No does not raise it, and the unanswered state is not asked twice', () => {
    expect(messages(annual({ trusts: [{ hasTrust: 'No' }, {}, {}] }), 'Part VIII')).not.toContain(NAME);
    const blank = annual({ trusts: [{ hasTrust: '' }, {}, {}] });
    expect(messages(blank, 'Part VIII')).not.toContain(NAME);
    expect(messages(blank, 'Part VIII')).toContain('Part VIII — Does the Ward have one or more Trusts?');
  });
});

// Milestone 76H item 2: a trust described but not named passed export (only
// an all-blank Part VIII asked for a name) and dropped out of the PDF; and
// the cards were numbered among the described ones, so a blank card 1 and a
// filled card 2 were reported as "Trust 1", pointing at the blank card.
describe('76H item 2: each described trust is asked its name, by its own card number', () => {
  const card2 = { name: '', trustee: 'First Bank Trust Co', accountNo: '***4321', trustType: 'Special Needs', wardPct: 100, wardAmount: 50000 };

  test('a described card with no name raises its own, bypassable issue (D9)', () => {
    const d = annual({ trusts: [{ hasTrust: 'Yes' }, card2, {}] });
    const part8 = messages(d, 'Part VIII');
    expect(part8).toContain('Part VIII — Trust 2 — Name');
    expect(part8).toContain('Part VIII — Trust 2 — Was created after the GID?');
    expect(part8).not.toContain('Part VIII — Trust 1 — Name');
    expect(part8).not.toContain('Part VIII — Trust 1 — Was created after the GID?');
    const issue = blockers(d).find((i) => i.message === 'Part VIII — Trust 2 — Name');
    expect(issue.path).toBe('trusts.1.name');
    expect(issue.bypassable).not.toBe(false);
  });

  test('named, it is satisfied', () => {
    const d = annual({ trusts: [{ hasTrust: 'Yes' }, { ...card2, name: 'Special Needs Trust', createdAfterGID: 'No' }, {}] });
    expect(messages(d, 'Part VIII')).toEqual([]);
  });
});

describe('58D: Part XI must be answered before export (/p11)', () => {
  const noItems = (flag) => ({ ...(m.fixtures.MINIMAL_VALID_ANNUAL.scheduleNoItems || {}), remuneration: flag });

  test('unanswered: the export gate blocks on the declaration and the sidebar agrees', () => {
    const d = annual({ remuneration: [], scheduleNoItems: noItems(false) });
    const issues = blockers(d).filter((i) => i.message.includes('Part XI'));
    expect(issues.map((i) => i.path)).toContain('scheduleNoItems.remuneration');
    expect(sidebarComplete(d, '/p11')).toBe(false);
  });

  test('declaring none answers it', () => {
    const d = annual({ remuneration: [], scheduleNoItems: noItems(true) });
    expect(messages(d, 'Part XI')).toEqual([]);
    expect(sidebarComplete(d, '/p11')).toBe(true);
  });

  test('a complete entry answers it; a half-entered row does not', () => {
    const complete = annual({ scheduleNoItems: noItems(false), remuneration: [{ guardian: 'Rachel Alvarez', type: 'Guardian Fee', amount: '1200', description: '' }] });
    expect(messages(complete, 'Part XI')).toEqual([]);
    expect(sidebarComplete(complete, '/p11')).toBe(true);
    // Description stays optional (the data model records it so).
    const partial = annual({ scheduleNoItems: noItems(false), remuneration: [{ guardian: 'Rachel Alvarez', type: '', amount: '', description: '' }] });
    expect(messages(partial, 'Part XI').length).toBeGreaterThan(0);
    expect(sidebarComplete(partial, '/p11')).toBe(false);
  });

  test('on load, entered rows win over a stale no-items flag, and the rows are kept', () => {
    const d = annual({ scheduleNoItems: noItems(true), remuneration: [{ guardian: 'G', type: 'Fee', amount: '50', description: '' }] });
    m.normalize.normalizeWardData(d);
    expect(d.scheduleNoItems.remuneration, 'the contradicted declaration is withdrawn').toBe(false);
    expect(d.remuneration, 'entered data is never discarded to resolve the contradiction').toHaveLength(1);
  });

  test('on load, a legacy filing of only blank rows is cleared so the declaration is reachable', () => {
    const d = annual({ remuneration: [{ guardian: '', type: '', amount: '', description: '' }] });
    m.normalize.normalizeWardData(d);
    expect(d.remuneration).toEqual([]);
  });
});
