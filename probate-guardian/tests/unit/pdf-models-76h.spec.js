// Milestone 76H items 3, 6, 8, 9, 11, 12, 13 and 14 (decisions 76H-4 to
// 76H-8), read from each form's PDF model -- what the filed PDF says.
//  3. The Annual's attorney statement named the attorney's own county.
//  6. Part XI / Part VII vanished from the PDF when its unanswered declaration
//     was overridden.
//  8. A Schedule B-4 category that netted negative printed "—".
//  9. Part IX's bond table put all five lines in one column but totalled
//     three, under a label citing a statute the workbook doesn't.
// 11. The Plan for Minors' caption had no "Minor".
// 12. The Simplified Plan printed no signature line for an untouched card.
// 13. Plan co-guardians were numbered by position, not by card.
// 14. The Initial Plan printed a revoking order after "No".
import { beforeAll, describe, expect, test, vi } from 'vitest';

const M = {};
beforeAll(async () => {
  vi.stubGlobal('window', globalThis);
  const [features, annualTotals, guardianTotals, simplifiedTotals] = await Promise.all([
    import('../../src/core/runtime/features.js'),
    import('../../src/features/annual-accounting/totals.js'),
    import('../../src/features/guardian-inventory/totals.js'),
    import('../../src/features/simplified-accounting/totals.js'),
  ]);
  features.provideFeatureServices({ totals: { annual: annualTotals.calcTotalsAnnual, guardian: guardianTotals.calcTotalsGuardian, simplified: simplifiedTotals.calcTotals } });
  M.annual = (await import('../../src/features/annual-accounting/pdf-model.js')).buildAnnualAccountingModel;
  M.simplified = (await import('../../src/features/simplified-accounting/pdf-model.js')).buildSimplifiedAccountingModel;
  M.inventory = (await import('../../src/features/guardian-inventory/pdf-model.js')).buildVerifiedInventoryModel;
  M.planAnnual = (await import('../../src/features/plan-annual/pdf-model.js')).buildPlanAnnualModel;
  M.planInitial = (await import('../../src/features/plan-initial/pdf-model.js')).buildPlanInitialModel;
  M.planMinor = (await import('../../src/features/plan-minor/pdf-model.js')).buildPlanMinorModel;
  M.planSimplified = (await import('../../src/features/plan-simplified/pdf-model.js')).buildPlanSimplifiedModel;
  M.caption = (await import('../../src/core/pdf/circuit-lookup.js')).getCaseCaptionTitle;
  const { initializeEmptyData } = await import('../../src/core/filing/filing-registry.js');
  M.blank = (type) => ({ ...JSON.parse(JSON.stringify(initializeEmptyData(type))), inventoryType: type, wardName: 'Ward Doe', caseNumber: '26-000100-GD', county: 'Pinellas' });
});

const section = (model, id) => model.sections.find((s) => s.id === id);
const blocks = (model) => model.sections.flatMap((s) => s.blocks || []);
const sigRoles = (model) => blocks(model).filter((b) => b.type === 'signature-block').map((b) => b.role);

describe('item 3 (decision 76H-8): the attorney statement uses the filing\'s county', () => {
  test("the Annual's statement names the filing's county, not the attorney's", () => {
    const model = M.annual({ ...M.blank('annual'), attorney: 'Ann Lawyer', attorney_county: 'Hillsborough' });
    const text = section(model, 'part5').blocks.find((b) => b.type === 'notice').text;
    expect(text).toContain('Pinellas');
    expect(text).not.toContain('Hillsborough');
  });
});

describe('item 6 (decision 76H-7): Part XI and Part VII always print', () => {
  test('unanswered: the statute and blank lines to complete, never "none received"', () => {
    for (const [build, type, id] of [['annual', 'annual', 'part11'], ['simplified', 'simplified', 'part7']]) {
      const sec = section(M[build]({ ...M.blank(type), remuneration: [] }), id);
      expect(sec, `${type} prints ${id}`).toBeTruthy();
      expect(sec.blocks[0].text).toContain('744.367(3)(a)');
      const table = sec.blocks.find((b) => b.type === 'table');
      expect(table.title).toBe('Declaration of Remuneration (to be completed)');
      expect(table.rows).toHaveLength(5);
      expect(table.rows.every((r) => r.slice(1).every((c) => c === ''))).toBe(true);
      expect(JSON.stringify(sec)).not.toContain('No remuneration reported');
    }
  });
  test('answered "none" and entries print as before', () => {
    const none = section(M.annual({ ...M.blank('annual'), remuneration: [], scheduleNoItems: { remuneration: true } }), 'part11');
    expect(none.blocks[1].text).toBe('No remuneration reported for this period.');
    const listed = section(M.simplified({ ...M.blank('simplified'), remuneration: [{ guardian: 'Ann', type: 'Fee', description: '', amount: 100 }] }), 'part7');
    expect(listed.blocks[1].rows).toEqual([['1', 'Ann', 'Fee', '', '$100.00']]);
  });
});

describe('item 8: a negative B-4 category prints its figure', () => {
  test('a refund nets negative; an empty category shows "—"', () => {
    const model = M.annual({ ...M.blank('annual'), schB4: [
      { payee: 'Pharmacy', datePaid: '2026-02-01', amount: 30, category: 'Medical / Pharmacy' },
      { payee: 'Pharmacy', datePaid: '2026-03-01', amount: -80, category: 'Medical / Pharmacy' },
    ] });
    const summary = blocks(model).find((b) => b.title === 'Schedule B-4: All Other Disbursements — Summary by Category');
    const row = (name) => summary.rows.find((r) => r[1] === name)[2];
    expect(row('Medical / Pharmacy')).toBe('($50.00)');
    expect(row('Rent')).toBe('—');
  });
});

describe('item 9 (decisions 76H-4, 76H-6): the bond tables as the workbooks lay them out', () => {
  test("the Annual's restricted lines stand apart, and the total is the bonded three", () => {
    const model = M.annual({ ...M.blank('annual'),
      schD1: [{ description: 'Checking', fullAmount: 1000, wardPct: 100, restricted: 'Yes', restrictedAmt: 400 }],
      schD3: [{ description: 'Car', fullAmount: 200, wardPct: 100, carryingValue: 200 }] });
    const table = blocks(model).find((b) => b.title === 'Bond Requirement (calculated)');
    expect(table.headers).toEqual(['Schedule', 'Bond Calculation', 'Restricted (not bonded)', 'Liquid (bonded)']);
    expect(table.rows.map((r) => r.slice(0, 2))).toEqual([
      ['Schedule D-1', 'Cash Assets in RESTRICTED Depository'],
      ['Schedule D-4', 'Other Liquid Assets - Intangible Assets RESTRICTED'],
      ['Schedule D-1', 'Cash Assets NOT in a Restricted Depository'],
      ['Schedule D-3', 'Other Liquid Assets - Personal Property Assets'],
      ['Schedule D-4', 'Other Liquid Assets - Intangible Assets'],
    ]);
    expect(table.rows.slice(0, 2).every((r) => r[3] === '—')).toBe(true);
    expect(table.rows.slice(2).every((r) => r[2] === '—')).toBe(true);
    expect(table.totals.label).toBe('Total for BOND REQUIREMENT');
    expect(JSON.stringify(model)).not.toContain('744.351');
  });
  test("the Inventory's total reads as its workbook's Part V", () => {
    const table = blocks(M.inventory(M.blank('guardian'))).find((b) => b.title === 'Surety Bond Requirement (calculated)');
    expect(table.totals.label).toBe('Total for BOND REQUIREMENT');
  });
});

describe('item 11 (decision 76H-5): the Plan for Minors caption', () => {
  test('reads as the court\'s form: "IN RE: The Guardianship of", the name, "Minor"', () => {
    const model = M.planMinor(M.blank('planMinor'));
    expect(model.metadata.wardType).toBe('minor');
    expect(M.caption('Tommy Pickles', model.metadata.wardType)).toBe('IN RE: The Guardianship of\nTOMMY PICKLES\nMinor');
  });
});

describe('item 12: the Simplified Plan always has a signature line', () => {
  test("Guardian 1's untouched card still prints its block", () => {
    const model = M.planSimplified({ ...M.blank('planSimplified'), planGuardians: [{ name: '' }] });
    expect(sigRoles(model)).toContain('Guardian / Guardian Advocate Signature');
    expect(JSON.stringify(model)).not.toContain('No signature entered.');
  });
});

describe('item 13: co-guardians keep their card\'s number', () => {
  test('Annual Plan: card 3 with card 2 blank is "Co-Guardian 3"', () => {
    const model = M.planAnnual({ ...M.blank('planAnnual'), planGuardians: [{ name: 'One' }, { name: '' }, { name: 'Three' }] });
    expect(sigRoles(model)).toContain('Co-Guardian 3');
    expect(sigRoles(model)).not.toContain('Co-Guardian 2');
  });
  test('Initial Plan: card 4 with card 3 blank is "Co-Guardian 4"', () => {
    const model = M.planInitial({ ...M.blank('planInitial'), planGuardians: [{ name: 'One' }, { name: 'Two' }, { name: '' }, { name: 'Four' }] });
    expect(sigRoles(model)).toContain('Co-Guardian 4');
    expect(sigRoles(model)).not.toContain('Co-Guardian 3');
  });
});

describe('item 14: the Initial Plan prints a revoking order only under Yes', () => {
  const directive = (courtRevoked) => ({ ...M.blank('planInitial'), q11Executed: true,
    q11Directives: [{ title: 'Health care surrogate', courtRevoked, orderDate: '2025-05-01', orderCounty: 'Pinellas' }] });
  const orderLine = (model) => blocks(model).filter((b) => b.title === 'Directive 1').flatMap((b) => b.items).find((it) => /order/i.test(it.label) && /entered/.test(String(it.value)));
  test('No: no order', () => expect(orderLine(M.planInitial(directive('No')))).toBeUndefined());
  test('Yes: the order', () => expect(orderLine(M.planInitial(directive('Yes'))).value).toContain('entered Pinellas'));
});
