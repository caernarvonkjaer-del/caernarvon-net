import { afterAll, beforeAll, describe, expect, test, vi } from 'vitest';

// Milestone 76J: the export checks. Each case below is what a filer saw:
//  2. a check firing on a box another answer hides (a Part VIII share under
//     No; the Inventory's bond period under a waived bond; the Plans' "Other"
//     directive with directives unticked) -- design 1, the rule chosen for
//     amounts and dates;
//  3. a supporting document that can't be used named on Part I, not the
//     page it is attached on;
//  4. the Annual Plan's residences and providers numbered among the filled
//     rows, so "row 1" pointed at a blank card;
//  6. the certificate attorney's signature date never checked against the
//     period, as every other signature date is (34-1A).
// (Item 1 is in output-authorization.spec.js, item 5 in
// service-recipients.spec.js.)

let m;
beforeAll(async () => {
  vi.stubGlobal('window', globalThis);
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-05T12:00:00'));
  const [registry, fixtures, engines, supplemental] = await Promise.all([
    import('../../src/core/filing/filing-registry.js'),
    import('../e2e/support/fixtures.ts'),
    import('../../src/core/validation/engines/index.js'),
    import('../../src/core/pdf/supplemental-checks.js'),
  ]);
  m = { registry, fixtures, engines, supplemental };
}, 120_000);
afterAll(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

const json = (x) => JSON.parse(JSON.stringify(x));
const filing = (type, fixture, patch = {}) => ({
  ...json(m.registry.initializeEmptyData(type)),
  ...json(m.fixtures[fixture] || {}),
  inventoryType: type,
  ...json(patch),
});
const messages = (d) => [...m.engines.evaluateFiling(d).blockers, ...(m.engines.evaluateFiling(d).advisories || [])].map((i) => i.message);
const has = (d, text) => messages(d).some((msg) => msg.includes(text));

describe('item 2: a check runs only while its box is in use', () => {
  test("Part VIII's Ward's % under No or unanswered raises nothing; under Yes it does", () => {
    const trusts = (hasTrust) => [{ hasTrust, name: 'T', createdAfterGID: 'No', wardPct: 150 }, {}, {}];
    expect(has(filing('annual', 'MINIMAL_VALID_ANNUAL', { trusts: trusts('No') }), "Trust 1 — Ward's %")).toBe(false);
    expect(has(filing('annual', 'MINIMAL_VALID_ANNUAL', { trusts: trusts('') }), "Trust 1 — Ward's %")).toBe(false);
    expect(has(filing('annual', 'MINIMAL_VALID_ANNUAL', { trusts: trusts('Yes') }), "Trust 1 — Ward's %")).toBe(true);
  });

  test("the Inventory's bond period is checked under a bond or unanswered, not under a waived bond or a depository alone", () => {
    const reversed = { bondPeriodFrom: '2026-12-31', bondPeriodTo: '2026-01-01' };
    const order = (state) => has(filing('guardian', 'MINIMAL_VALID_GUARDIAN', { ...reversed, bondDepositoryState: state }), 'Bond Period To');
    expect(order('bond-only')).toBe(true);
    expect(order('')).toBe(true);
    expect(order('bond-waived')).toBe(false);
    expect(order('depository-only')).toBe(false);
  });

  test("the Plans' \"Other\" directive needs its description only while directives are ticked as executed", () => {
    expect(has(filing('planAnnual', 'MINIMAL_VALID_PLAN_ANNUAL', { q10Executed: false, q10ExecOther: true, q10ExecOtherText: '' }), 'describe the "Other" directive')).toBe(false);
    expect(has(filing('planAnnual', 'MINIMAL_VALID_PLAN_ANNUAL', { q10NoDirectives: false, q10Executed: true, q10ExecOther: true, q10ExecOtherText: '' }), 'describe the "Other" directive')).toBe(true);
    expect(has(filing('planInitial', 'MINIMAL_VALID_PLAN_INITIAL', { q11Executed: false, q11ExecOther: true, q11ExecOtherText: '' }), 'Description of "Other" advance directive')).toBe(false);
  });
});

describe('item 3: a supporting document that can\'t be used is named on its own page', () => {
  test('the issue carries the page the document is attached on, on every kind of form', () => {
    const broken = { name: 'statement.pdf', dataUrl: 'data:text/plain;base64,aGVsbG8=', validation: { status: 'invalid', code: 'not-pdf', message: 'Not a PDF' } };
    const docs = (key) => ({ [key]: { '2026-01-01__2026-12-31': { comment: '', files: [broken] }, initial: { comment: '', files: [broken] } } });
    const routeOf = (type, key, extra = {}) => {
      const issues = m.supplemental.getSupplementalFilingIssues({ inventoryType: type, periodFrom: '2026-01-01', periodTo: '2026-12-31', scheduleDocs: docs(key), ...extra });
      return issues.map((i) => [i.route, i.path]);
    };
    expect(routeOf('annual', 'schB1')).toEqual([['/schb1', 'scheduleDocs.schB1']]);
    expect(routeOf('guardian', 'a1')).toEqual([['/a1', 'scheduleDocs.a1']]);
    expect(routeOf('simplified', 'p2')).toEqual([['/p2', 'scheduleDocs.p2']]);
    expect(routeOf('planAnnual', 'planADirectives')).toEqual([['/p9', 'scheduleDocs.planADirectives']]);
  });
});

describe('item 4: the Annual Plan names a row by its own number', () => {
  test('a blank card 1 above a residence with no name: "row 2", pointing at row 2', () => {
    const d = filing('planAnnual', 'MINIMAL_VALID_PLAN_ANNUAL', { q1Residences: [{}, { from: '2026-01-01', address: '1 Main St' }] });
    const issue = m.engines.evaluateFiling(d).blockers.find((i) => i.message.startsWith('1. Residences — row'));
    expect(issue.message).toBe('1. Residences — row 2 needs a facility or owner name');
    expect(issue.path).toBe('q1Residences.1.name');
  });
});

describe("item 6: the certificate attorney's signature date follows the period rule", () => {
  test('before Period To it is named, and can be overridden; on or after it, nothing', () => {
    for (const [type, fixture, section] of [['annual', 'MINIMAL_VALID_ANNUAL', 'Part X'], ['simplified', 'MINIMAL_VALID_SIMPLIFIED', 'Part VI']]) {
      const early = filing(type, fixture, { periodFrom: '2026-01-01', periodTo: '2026-12-31', certAttySignDate: '2026-06-01' });
      const issue = m.engines.evaluateFiling(early).blockers.find((i) => i.path === 'certAttySignDate' && /Period To/.test(i.message));
      expect(issue, `${type}: named`).toBeTruthy();
      expect(issue.message.startsWith(section)).toBe(true);
      expect(issue.bypassable).not.toBe(false);
      const later = filing(type, fixture, { periodFrom: '2026-01-01', periodTo: '2026-12-31', certAttySignDate: '2027-01-05' });
      expect(m.engines.evaluateFiling(later).blockers.some((i) => i.path === 'certAttySignDate' && /Period To/.test(i.message))).toBe(false);
    }
  });
});
