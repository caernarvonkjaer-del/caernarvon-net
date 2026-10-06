// Milestone 73G part 1: where each form keeps an amount
// (src/core/filing/amount-fields.js) -- the data model's entered currency
// fields -- and what is done with them: amounts saved as text become their
// numbers when a filing opens (the Simplified's remuneration Amount, decision
// 73G-N2, and every other amount the same way, in place of the clamp that
// zeroed negatives and cut "1,234.56" to 1 on every page drawn), and an
// amount holding text that is not an amount is named on its own page, as an
// impossible date is.
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../../src/core/navigation/router.js', () => ({ navigate: () => {}, renderPage: () => {} }));
globalThis.window = globalThis.window || globalThis;

const { amountFieldsFor, amountFieldIssues, normalizeAmountFields } = await import('../../src/core/filing/amount-fields.js');
const { normalizeWardData } = await import('../../src/core/filing/normalize-filing.js');
const { initializeEmptyData } = await import('../../src/core/filing/filing-registry.js');
const { evaluateFiling } = await import('../../src/core/validation/engines/index.js');
const { judgeFiling } = await import('../../src/core/status/section-marks.js');

const root = path.join(__dirname, '..', '..');
const json = (x) => JSON.parse(JSON.stringify(x));

// probate-guardian-data-model.csv, read with a quoted-field split (its notes carry commas).
function csvRows() {
  const text = fs.readFileSync(path.join(root, 'probate-guardian-data-model.csv'), 'utf8');
  const parse = (line) => {
    const out = []; let cur = ''; let q = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (q) { if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; } else if (c === '"') q = false; else cur += c; }
      else if (c === '"') q = true; else if (c === ',') { out.push(cur); cur = ''; } else cur += c;
    }
    out.push(cur);
    return out;
  };
  const [head, ...lines] = text.split(/\r?\n/).filter(Boolean);
  const cols = parse(head);
  return lines.map((l) => Object.fromEntries(parse(l).map((v, i) => [cols[i], v])));
}

const SCOPE_TYPE = { annual_accounting: 'annual', simplified_accounting: 'simplified', guardian_inventory: 'guardian', plan_annual: 'planAnnual' };

describe('the list of amounts is the data model\'s', () => {
  it('every entered currency field in probate-guardian-data-model.csv, and nothing else, for each form', () => {
    const fromCsv = {};
    for (const row of csvRows()) {
      if (row.format !== 'currency' || row.derived_or_input !== 'input' || row.storage_root !== 'D') continue;
      const type = SCOPE_TYPE[row.scope];
      expect(type, `a currency field on a form this list doesn't cover: ${row.scope} ${row.field_path}`).toBeTruthy();
      (fromCsv[type] ||= []).push(row.field_path);
    }
    for (const type of Object.values(SCOPE_TYPE)) {
      const listed = amountFieldsFor(type).map((e) => (e.path ? e.path : `${e.list}[].${e.field}`));
      expect([...listed].sort(), type).toEqual([...(fromCsv[type] || [])].sort());
    }
    expect(amountFieldsFor('finalAccounting')).toBe(amountFieldsFor('annual'));
    expect(amountFieldsFor('trustAccounting')).toBe(amountFieldsFor('annual'));
    expect(amountFieldsFor('planMinor')).toEqual([]);
  });
});

describe('opening a filing reads amounts saved as text, losslessly', () => {
  it("the Simplified's remuneration Amount and Part II: readable text becomes its number, the rest is kept", () => {
    const d = { ...json(initializeEmptyData('simplified')), inventoryType: 'simplified',
      interestIncome: '1,234.56', serviceCharges: '-25', federalIncomeTax: 'see attached',
      remuneration: [{ guardian: 'Ann', type: 'Fee', amount: '$1,234.56', description: '' }, { guardian: 'Bo', type: 'Fee', amount: '(50.00)', description: '' }] };
    normalizeWardData(d);
    expect(d.interestIncome).toBe(1234.56);
    expect(d.serviceCharges).toBe(-25);
    expect(d.federalIncomeTax).toBe('see attached');
    expect(d.remuneration.map((r) => r.amount)).toEqual([1234.56, -50]);
    const again = json(d);
    normalizeAmountFields(again);
    expect(again).toEqual(json(d));
  });

  it('a negative is kept on every form (nothing is zeroed any more)', () => {
    const annual = { ...json(initializeEmptyData('annual')), inventoryType: 'annual', schD1: [{ fullAmount: -200, wardPct: 100 }], remuneration: [{ guardian: 'G', type: 'T', amount: -10 }] };
    normalizeWardData(annual);
    expect(annual.schD1[0].fullAmount).toBe(-200);
    expect(annual.remuneration[0].amount).toBe(-10);
    const inventory = { ...json(initializeEmptyData('guardian')), inventoryType: 'guardian', bondAmount: '$-25,000', scheduleB1: [{ fullAssetAmount: '(1,000.00)' }] };
    normalizeWardData(inventory);
    expect(inventory.bondAmount).toBe(-25000);
    expect(inventory.scheduleB1[0].fullAssetAmount).toBe(-1000);
  });
});

describe('an amount that cannot be read is named, on its own page', () => {
  it('in the form\'s words, with the path to jump to, bypassable like an impossible date', () => {
    const d = { inventoryType: 'annual', schA: [{ amount: 5 }, { amount: '1.000,50' }], bondAmount: 'N/A' };
    const issues = amountFieldIssues(d);
    expect(issues.map((i) => [i.path, i.route, i.code])).toEqual([
      ['schA.1.amount', '/scha', 'field.amount.unreadable'],
      ['bondAmount', '/p9', 'field.amount.unreadable'],
    ]);
    expect(issues[0].message).toMatch(/^Schedule A — Line 2 — Amount: "1\.000,50" can't be read as an amount\./);
    expect(amountFieldIssues({ inventoryType: 'guardian', scheduleA1: [{ fullAssetValue: 'abc' }] })[0].message).toMatch(/^A-1 row 1 — Full Asset Value: "abc"/);
    expect(amountFieldIssues({ inventoryType: 'annual', schA: [{ amount: -5 }, { amount: '' }] })).toEqual([]);
  });

  it('Print Preview lists it and the sidebar holds its page back, as for any export check', () => {
    const d = { ...json(initializeEmptyData('simplified')), inventoryType: 'simplified', remuneration: [{ guardian: 'Ann', type: 'Fee', amount: '1.000,50', description: '' }] };
    const evaluation = evaluateFiling(json(d));
    const named = evaluation.blockers.filter((i) => i.code === 'field.amount.unreadable');
    expect(named.map((i) => i.path)).toEqual(['remuneration.0.amount']);
    expect(named[0].bypassable).toBe(true);
    expect(judgeFiling(json(d), 'simplified').pageIssues('/p7').blockers.map((i) => i.path)).toContain('remuneration.0.amount');
  });
});
