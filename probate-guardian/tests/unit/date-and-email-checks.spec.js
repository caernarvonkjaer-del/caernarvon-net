// Milestone 74G: dates, periods and e-mail addresses that can't be right are
// caught (decisions 74G-1 to 74G-5, the requester, 2026-10-06; QA report
// BUG-13, BUG-17). Before, all of these were accepted without a word:
//   - errors the filer can override: a Schedule B-1 or B-2 line whose own
//     period runs backwards, Letters signed before the guardianship began,
//     an Annual Plan residence whose "to" is before its "from", and an e-mail
//     box holding text that isn't an address ("rnguyen@") on every form;
//   - warnings, never blocking: an accounting period longer than a year or
//     ending after today, a fee paid before the court order behind it, and
//     residences that overlap or are listed in no date order.
// A blank e-mail box is judged as before. The new modules are imported in
// the tests, so each case fails for its own reason when they are missing.
import { afterAll, beforeAll, describe, expect, test, vi } from 'vitest';
import { readFileSync } from 'node:fs';

let m;
beforeAll(async () => {
  vi.stubGlobal('window', globalThis);
  const [registry, engines, features, guardianTotals, simplifiedTotals, issues] = await Promise.all([
    import('../../src/core/filing/filing-registry.js'),
    import('../../src/core/validation/engines/index.js'),
    import('../../src/core/runtime/features.js'),
    import('../../src/features/guardian-inventory/totals.js'),
    import('../../src/features/simplified-accounting/totals.js'),
    import('../../src/core/validation/issue-registry.js'),
  ]);
  // The totals the composition root hands core (src/features-loader.js).
  features.provideFeatureServices({ totals: { guardian: guardianTotals.calcTotalsGuardian, simplified: simplifiedTotals.calcTotals } });
  m = { registry, engines, issues };
}, 120_000);
afterAll(() => vi.unstubAllGlobals());

const json = (x) => JSON.parse(JSON.stringify(x));
const typed = (type, extra = {}) => ({ ...json(m.registry.initializeEmptyData(type)), inventoryType: type, ...json(extra) });
const judged = (filing) => m.engines.evaluateFiling(filing);
const messages = (list) => list.map((i) => i.message);
const codes = (list) => list.map((i) => i.code);
const ANNUAL_FAMILY = ['annual', 'finalAccounting', 'trustAccounting'];

describe('a date range that runs backwards: an error the filer can override (74G-2)', () => {
  test.each(ANNUAL_FAMILY)('%s: a B-1 or B-2 line whose period ends before it starts', (type) => {
    const row = { bankAcct: '1', checkNo: '1', datePaid: '2026-05-01', payee: 'Payee', amount: 10 };
    const { blockers } = judged(typed(type, {
      schB1: [{ ...row, periodFrom: '2026-06-01', periodTo: '2026-04-30' }],
      schB2: [{ ...row, periodFrom: '2026-01-01', periodTo: '2026-01-31' }, { ...row, periodFrom: '2026-03-01', periodTo: '2026-02-01' }],
    }));
    const named = blockers.filter((b) => /Period To must be on or after Period From/.test(b.message));
    expect(named.map((b) => [b.message, b.path])).toEqual([
      ['Schedule B-1 — Line 1 — Period To must be on or after Period From', 'schB1.0.periodTo'],
      ['Schedule B-2 — Line 2 — Period To must be on or after Period From', 'schB2.1.periodTo'],
    ]);
    expect(named.every((b) => b.bypassable === true)).toBe(true);
  });

  test('the Initial Plan: Letters signed before the guardianship began; the same day passes', () => {
    const before = judged(typed('planInitial', { inceptionDate: '2026-03-15', lettersSignedDate: '2026-03-01' })).blockers;
    expect(messages(before)).toContain('Cover — Date Letters Were Signed must be on or after Guardianship Inception Date');
    expect(before.find((b) => b.path === 'lettersSignedDate' && /must be on or after/.test(b.message)).bypassable).toBe(true);
    const same = judged(typed('planInitial', { inceptionDate: '2026-03-15', lettersSignedDate: '2026-03-15' })).blockers;
    expect(messages(same).some((x) => /Letters Were Signed must be/.test(x))).toBe(false);
  });

  test('the Annual Plan: a residence whose "to" is before its "from"', () => {
    const { blockers } = judged(typed('planAnnual', { q1Residences: [
      { name: 'Home', from: '2026-01-01', to: '2026-03-31' },
      { name: 'Sunrise', from: '2026-06-01', to: '2026-04-30' },
    ] }));
    expect(blockers.filter((b) => /Resided to must be/.test(b.message)).map((b) => [b.message, b.path]))
      .toEqual([['1. Residences — row 2 — Resided to must be on or after Resided from', 'q1Residences.1.to']]);
  });
});

describe('warnings, never blocking', () => {
  // The clock the validator golden uses (2026-10-05, noon).
  beforeAll(() => { vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(new Date(2026, 9, 5, 12)); });
  afterAll(() => vi.useRealTimers());

  const warned = (filing) => {
    const { advisories, blockers } = judged(filing);
    expect(blockers.some((b) => String(b.code).startsWith('date.')), 'no warning is a blocker').toBe(false);
    return advisories;
  };

  test.each([...ANNUAL_FAMILY, 'simplified'])('%s: a period longer than a year; the GID-to-anniversary period passes (74G-1)', (type) => {
    const section = type === 'simplified' ? 'Cover' : 'Part I';
    const long = warned(typed(type, { gid: '2026-03-15', periodFrom: '2026-03-15', periodTo: '2027-09-14' }))
      .filter((a) => a.code === 'date.period-longer-than-a-year');
    expect(long.map((a) => [a.message, a.field, a.severity])).toEqual([[
      `${section} — The accounting period, 03/15/2026 to 09/14/2027, runs past 03/31/2027, the end of the twelfth month after it starts. Review the period before filing.`,
      'periodTo', 'advisory',
    ]]);
    expect(codes(warned(typed(type, { gid: '2026-03-15', periodFrom: '2026-03-15', periodTo: '2027-03-31' })))).not.toContain('date.period-longer-than-a-year');
  });

  test.each([...ANNUAL_FAMILY, 'simplified'])('%s: a period ending after today', (type) => {
    const section = type === 'simplified' ? 'Cover' : 'Part I';
    expect(messages(warned(typed(type, { periodFrom: '2026-01-01', periodTo: '2026-12-31' })).filter((a) => a.code === 'date.period-ends-after-today')))
      .toEqual([`${section} — Accounting Period To, 12/31/2026, is after today. Review the period before filing.`]);
    expect(codes(warned(typed(type, { periodFrom: '2025-10-01', periodTo: '2026-09-30' })))).not.toContain('date.period-ends-after-today');
  });

  test('the Plans and the Inventory get no period warning', () => {
    for (const type of ['planInitial', 'planAnnual', 'planMinor', 'planSimplified', 'guardian']) {
      expect(codes(warned(typed(type, { periodFrom: '2026-03-15', periodTo: '2027-09-14' }))).filter((c) => c.startsWith('date.period')), type).toEqual([]);
    }
  });

  test.each(ANNUAL_FAMILY)('%s: a fee paid before its court order, both dates named (74G-3)', (type) => {
    const row = (paid, order) => ({ bankAcct: '1', checkNo: '1', payee: 'Payee', amount: 10, datePaid: paid, courtOrderDate: order });
    const notes = warned(typed(type, {
      periodFrom: '2026-01-01', periodTo: '2026-09-30',
      schB1: [row('2026-07-05', '2026-07-20')],
      schB2: [row('2026-07-20', '2026-07-20'), row('2026-08-01', '2026-07-20')],
      schB3: [row('2026-02-01', ''), row('2026-02-01', '2026-03-01')],
    })).filter((a) => a.code === 'date.paid-before-order');
    expect(notes.map((a) => [a.message, a.field])).toEqual([
      ['Schedule B-1 — Line 1 — Date Paid 07/05/2026 is before the Court Order Date 07/20/2026. Review both before filing.', 'schB1.0.datePaid'],
      ['Schedule B-3 — Line 2 — Date Paid 02/01/2026 is before the Court Order Date 03/01/2026. Review both before filing.', 'schB3.1.datePaid'],
    ]);
  });

  test('the Annual Plan: residences that overlap, or are in no date order (74G-4)', () => {
    const res = (...rows) => warned(typed('planAnnual', { q1Residences: rows.map(([from, to], i) => ({ name: `R${i + 1}`, from, to })) }))
      .filter((a) => a.code.startsWith('date.residences'));
    expect(res(['2026-01-01', '2026-06-30'], ['2026-06-01', '2026-12-31']).map((a) => a.message)).toEqual([
      '1. Residences — Rows 1 and 2 overlap: 01/01/2026 to 06/30/2026, and 06/01/2026 to 12/31/2026. Review the dates before filing.',
    ]);
    // Moving out and in on the same day is no overlap; oldest or newest first are both orders.
    expect(res(['2026-01-01', '2026-06-30'], ['2026-06-30', '2026-12-31'])).toEqual([]);
    expect(res(['2026-06-30', '2026-12-31'], ['2026-01-01', '2026-06-30'])).toEqual([]);
    expect(res(['2026-03-01', '2026-03-31'], ['2026-01-01', '2026-01-31'], ['2026-06-01', '2026-06-30']).map((a) => a.message)).toEqual([
      '1. Residences — The residences are not listed in date order. Review the order before filing.',
    ]);
  });
});

describe('the period-span rule (date-rules.js)', () => {
  test('the end of the twelfth month after the first month; after today', async () => {
    const { checkPeriodSpan } = await import('../../src/core/validation/date-rules.js');
    expect(checkPeriodSpan('2026-03-15', '2027-03-31')).toEqual({ limit: '2027-03-31', longerThanAYear: false, endsAfterToday: false });
    expect(checkPeriodSpan('2026-03-15', '2027-04-01').longerThanAYear).toBe(true);
    expect(checkPeriodSpan('2024-02-10', '2025-02-28').limit).toBe('2025-02-28');
    expect(checkPeriodSpan('2026-01-01', '2026-12-31', { today: '2026-10-05' }).endsAfterToday).toBe(true);
    expect(checkPeriodSpan('2026-01-01', '2026-10-05', { today: '2026-10-05' }).endsAfterToday).toBe(false);
    expect([checkPeriodSpan('', '2026-12-31'), checkPeriodSpan('2026-12-31', '2026-01-01')]).toEqual([null, null]);
  });
});

describe('an e-mail address that is not one: an error the filer can override (74G-5)', () => {
  const SCOPES = {
    annual_accounting: ANNUAL_FAMILY, simplified_accounting: ['simplified'], guardian_inventory: ['guardian'],
    plan_initial: ['planInitial'], plan_annual: ['planAnnual'], plan_minor: ['planMinor'], plan_simplified: ['planSimplified'],
  };
  // Each filing's e-mail rows in the data model, as dotted paths ("guardians.0.email").
  const rows = readFileSync('probate-guardian-data-model.csv', 'utf8').split(/\r?\n/).map((l) => l.split(','))
    .filter((c) => c[1] === 'D' && SCOPES[c[0]] && /e-?mail$/i.test(c[2].split('.').pop()));
  const emailPaths = (type) => rows.filter((c) => SCOPES[c[0]].includes(type)).map((c) => c[2].replace('[]', '.0'));
  const setAt = (d, path, value) => {
    const keys = path.split('.');
    let o = d;
    for (const [n, k] of keys.slice(0, -1).entries()) {
      if (o[k] == null) o[k] = /^\d+$/.test(keys[n + 1]) ? [] : {};
      o = o[k];
    }
    o[keys[keys.length - 1]] = value;
    return d;
  };
  const malformed = (filing) => judged(filing).blockers.filter((b) => b.code === 'field.email.malformed');

  test('the data model lists 24 of them across the nine filing types', () => {
    expect(rows.length).toBe(24);
  });

  test.each(Object.values(SCOPES).flat())('%s: "rnguyen@" in every e-mail box is named, on its own path', (type) => {
    const paths = emailPaths(type);
    expect(paths.length).toBeGreaterThan(0);
    for (const path of paths) {
      const named = malformed(setAt(typed(type), path, 'rnguyen@'));
      expect(named.map((b) => b.path), `${type} ${path}`).toEqual([path]);
      expect(named[0].message, path).toMatch(/: "rnguyen@" is not a complete e-mail address\. Enter a complete e-mail address, such as name@example\.com\.$/);
      expect(named[0].route, path).toMatch(/^\//);
    }
  });

  test.each(Object.values(SCOPES).flat())('%s: a blank box and a complete address add nothing', (type) => {
    expect(malformed(typed(type)), 'blank').toEqual([]);
    for (const path of emailPaths(type)) expect(malformed(setAt(typed(type), path, 'rnguyen@firm.com')), path).toEqual([]);
  });

  test('the check can be overridden', () => {
    expect(m.issues.getIssueDefinition('field.email.malformed')).toMatchObject({ bypassable: true, showInReadiness: true });
  });

  test("the list matches the data model's e-mail rows, form by form", async () => {
    const { emailFieldsFor } = await import('../../src/core/filing/email-fields.js');
    for (const type of Object.values(SCOPES).flat()) {
      const listed = emailFieldsFor(type).map((e) => (e.path ? e.path : `${e.list}.0.${e.field}`)).sort();
      expect(listed, type).toEqual(emailPaths(type).sort());
    }
  });

  test("the address's shape: a name, an @ and a domain with a dot", async () => {
    const { emailProblem, isEmailPath } = await import('../../src/core/validation/email-format.js');
    for (const bad of ['rnguyen@', 'rnguyen@firm', '@firm.com', 'r nguyen@firm.com']) expect(emailProblem(bad), bad).toBe('Enter a complete e-mail address, such as name@example.com');
    for (const good of ['rnguyen@firm.com', ' rnguyen@firm.co.uk ', '', null]) expect(emailProblem(good), String(good)).toBe('');
    expect(['attorney.email', 'attorney_secondary_email', 'guardians.0.email', 'preparer_email'].every(isEmailPath)).toBe(true);
    expect(isEmailPath('emailSent')).toBe(false);
  });
});
