// Milestone 74J-2 (answered 2026-10-16 as Pinellas Clerk practice; built on
// approval, decision 74J-N1): the Final Accounting's Final Report page --
// Rule 5.680(c)'s amounts reserved for unpaid and anticipated disbursements,
// costs and fees, and the assets to be turned over and to whom. Each list is
// asked like an Annual schedule: rows or "I verify there are none"; unanswered,
// the sidebar asks and export is never blocked; a started row's boxes are
// required, an ordinary error the filer can override. The page, the lists and
// the PDF section are the Final's alone. Before, a Final Accounting had none of
// it. The new module is imported in the tests, so each case fails for its own
// reason while it is missing.
import { afterAll, beforeAll, describe, expect, test, vi } from 'vitest';

vi.mock('../../src/core/navigation/router.js', () => ({ navigate: () => {}, renderPage: () => {}, getCurrentPage: () => '/' }));

let m;
beforeAll(async () => {
  vi.stubGlobal('window', globalThis);
  const [registry, engines, features, guardianTotals, simplifiedTotals, annualTotals, marks, collections] = await Promise.all([
    import('../../src/core/filing/filing-registry.js'),
    import('../../src/core/validation/engines/index.js'),
    import('../../src/core/runtime/features.js'),
    import('../../src/features/guardian-inventory/totals.js'),
    import('../../src/features/simplified-accounting/totals.js'),
    import('../../src/features/annual-accounting/totals.js'),
    import('../../src/core/status/section-marks.js'),
    import('../../src/core/form/collections.js'),
  ]);
  features.provideFeatureServices({ totals: { guardian: guardianTotals.calcTotalsGuardian, simplified: simplifiedTotals.calcTotals, annual: annualTotals.calcTotalsAnnual } });
  m = { registry, engines, marks, collections };
}, 120_000);
afterAll(() => vi.unstubAllGlobals());

const json = (x) => JSON.parse(JSON.stringify(x));
const typed = (type, extra = {}) => ({ ...json(m.registry.initializeEmptyData(type)), inventoryType: type, ...json(extra) });
const RESERVED = [{ description: 'Attorney fees for the discharge', amount: 1500 }, { description: 'Final court costs', amount: 250 }];
const TURNOVER = [{ asset: 'Checking account at First Bank', recipient: 'Jane Heir, daughter' }];

describe('the page and its lists are the Final Accounting\'s alone', () => {
  test('the Final has the Final Report page, after Part XI and before Print Preview; the Annual and the Trust do not', () => {
    const ids = (type) => m.registry.FILING_PAGES[type].map((p) => p.id);
    expect(ids('finalAccounting').slice(-3)).toEqual(['/p11', '/final', '/print']);
    for (const type of ['annual', 'trustAccounting']) expect(ids(type), type).not.toContain('/final');
  });

  test('the two lists are registered on the Final only, with blank rows of their own', () => {
    for (const list of ['finalReserved', 'finalTurnover']) {
      const rules = m.collections.getCollection('finalAccounting', list);
      expect(rules.factory(), list).toEqual(list === 'finalReserved' ? { description: '', amount: '' } : { asset: '', recipient: '' });
      expect(rules.isBlank(rules.factory()), list).toBe(true);
      expect(() => m.collections.getCollection('annual', list), list).toThrow();
    }
  });

  test('the facts module: the route, the lists, the Final test', async () => {
    const f = await import('../../src/core/filing/final-report.js');
    expect([f.FINAL_REPORT_ROUTE, f.FINAL_LISTS.map((l) => l.list)]).toEqual(['/final', ['finalReserved', 'finalTurnover']]);
    expect(['finalAccounting', 'annual', 'trustAccounting'].map(f.isFinalAccountingType)).toEqual([true, false, false]);
    expect([f.finalReportStarted(typed('finalAccounting')), f.finalReportStarted(typed('finalAccounting', { finalTurnover: TURNOVER }))]).toEqual([false, true]);
  });
});

describe('asked like a schedule', () => {
  const judged = (filing) => m.engines.evaluateFiling(filing);
  const prompts = (filing) => judged(filing).prompts.filter((p) => p.route === '/final').map((p) => [p.path, p.label]);
  const blockers = (filing) => judged(filing).blockers.filter((b) => /^final(Reserved|Turnover)\./.test(String(b.path || '')));

  test('unanswered, the sidebar asks for each list -- never an export blocker', () => {
    expect(prompts(typed('finalAccounting'))).toEqual([
      ['scheduleNoItems.finalreserved', 'Final Report — Amounts Reserved: add an entry, or tick "I verify there are no items to report"'],
      ['scheduleNoItems.finalturnover', 'Final Report — Assets to Be Turned Over: add an entry, or tick "I verify there are no items to report"'],
    ]);
    expect(blockers(typed('finalAccounting'))).toEqual([]);
  });

  test('a tick or an entered row answers a list', () => {
    expect(prompts(typed('finalAccounting', { scheduleNoItems: { finalreserved: true }, finalTurnover: TURNOVER }))).toEqual([]);
  });

  test("a started row's empty boxes are named on the Final Report page, and can be overridden", () => {
    const named = blockers(typed('finalAccounting', { finalReserved: [{ description: 'Court costs', amount: '' }], finalTurnover: [{ asset: '', recipient: 'Jane Heir' }] }));
    expect(named.map((b) => [b.message, b.path, b.bypassable])).toEqual([
      ['Final Report — Amounts Reserved — Line 1 — Amount is required', 'finalReserved.0.amount', true],
      ['Final Report — Assets to Be Turned Over — Line 1 — Asset is required', 'finalTurnover.0.asset', true],
    ]);
    expect(blockers(typed('finalAccounting', { finalReserved: RESERVED, finalTurnover: TURNOVER }))).toEqual([]);
  });

  test("the sidebar's mark: Final Report unfinished until both are answered", () => {
    const checks = (filing) => m.marks.sectionMarks(filing).checks;
    expect(checks(typed('finalAccounting'))['a-final']).toBe(false);
    expect(checks(typed('finalAccounting', { finalReserved: RESERVED, scheduleNoItems: { finalturnover: true } }))['a-final']).toBe(true);
    expect('a-final' in checks(typed('annual'))).toBe(false);
  });

  test('an Annual or a Trust Accounting holding the lists (a Filing Type changed) is asked nothing about them', () => {
    for (const type of ['annual', 'trustAccounting']) {
      const d = typed(type, { finalReserved: [{ description: 'x', amount: '' }], finalTurnover: [{ asset: 'y', recipient: '' }] });
      expect(prompts(d), type).toEqual([]);
      expect(blockers(d), type).toEqual([]);
    }
  });

  test('an amount that cannot be read is named on the page, as every amount is', () => {
    const named = judged(typed('finalAccounting', { finalReserved: [{ description: 'Costs', amount: 'about 200' }] })).blockers
      .filter((b) => b.code === 'field.amount.unreadable');
    expect(named.map((b) => [b.path, b.route])).toEqual([['finalReserved.0.amount', '/final']]);
  });
});

describe('the PDF and the workbook', () => {
  test("the PDF prints a Final Report section on the Final only, each list as a table or what was answered", async () => {
    const { buildAnnualAccountingModel } = await import('../../src/features/annual-accounting/pdf-model.js');
    const section = (filing) => buildAnnualAccountingModel(filing).sections.find((s) => s.id === 'finalReport');
    const s = section(typed('finalAccounting', { finalReserved: RESERVED, scheduleNoItems: { finalturnover: true } }));
    expect(s.title).toBe('FINAL REPORT — Rule 5.680(c), Florida Probate Rules');
    const [reserved, turnover] = s.blocks;
    expect([reserved.type, reserved.headers, reserved.rows, reserved.totals]).toEqual(['table', ['#', 'Description', 'Amount'],
      [['1', 'Attorney fees for the discharge', '$1,500.00'], ['2', 'Final court costs', '$250.00']], { label: 'Total Reserved', value: '$1,750.00' }]);
    expect([turnover.type, turnover.text]).toEqual(['notice', 'The guardian verified there are no assets to be turned over to report.']);
    expect(section(typed('finalAccounting')).blocks.map((b) => b.text)).toEqual(['No amounts reserved are listed.', 'No assets to be turned over are listed.']);
    expect(section(typed('finalAccounting', { finalTurnover: TURNOVER })).blocks[1].rows).toEqual([['1', 'Checking account at First Bank', 'Jane Heir, daughter']]);
    for (const type of ['annual', 'trustAccounting']) expect(section(typed(type, { finalReserved: RESERVED })), type).toBeUndefined();
  });

  test('Save as Excel says the workbook has no cells for it, and asks first', async () => {
    const { excelOmissions } = await import('../../src/core/excel/workbook-contract/index.js');
    const item = (filing) => excelOmissions(filing).find((o) => /Final Report/.test(o.text));
    expect(item(typed('finalAccounting', { finalTurnover: TURNOVER }))).toEqual({ text: "the Final Report's amounts reserved and assets to be turned over (Rule 5.680(c))", warn: true });
    expect(item(typed('finalAccounting'))).toBeUndefined();
    expect(item(typed('annual', { finalTurnover: TURNOVER }))).toBeUndefined();
  });
});

// The code review of 74J-2 (2026-10-17, fixed on the requester's choice).
describe('after the code review', () => {
  test("the PDF's Total Reserved rounds by the rule each line prints by", async () => {
    const { buildAnnualAccountingModel } = await import('../../src/features/annual-accounting/pdf-model.js');
    const table = (amount) => buildAnnualAccountingModel(typed('finalAccounting', { finalReserved: [{ description: 'Costs', amount }] }))
      .sections.find((s) => s.id === 'finalReport').blocks[0];
    for (const amount of [1.005, 2.675, 797229.185]) {
      const t = table(amount);
      expect(t.totals.value, String(amount)).toBe(t.rows[0][2]);
    }
  });

  test('a filing known as a Final by its Filing Type alone is checked as a Final, not refused', async () => {
    const { collectAnnualIssues } = await import('../../src/core/validation/engines/annual.js');
    const d = typed('finalAccounting', { finalReserved: [{ description: 'Court costs', amount: '' }] });
    delete d.inventoryType;
    d.filingType = 'Final';
    expect(collectAnnualIssues(d).map((i) => i.path).filter((p) => /^final/.test(String(p)))).toEqual(['finalReserved.0.amount']);
  });
});
