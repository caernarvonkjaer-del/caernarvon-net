// Milestone 76H item 7 (decision 76H-3, the requester's -- a calculation
// change accepted by name, AGENTS.md section 5): an amount or a share the app
// can't read counts as 0 everywhere -- screen, PDF and every total -- and
// prints as typed with "(not counted: can't be read)". It was read with
// parseFloat(): "1.500,00" printed and totalled $1.50, "approx 900" printed
// $0.00, and a share of "50%" was figured at 50% while it printed "—".
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
  Object.assign(M, {
    money: await import('../../src/core/format/money.js'),
    codec: await import('../../src/core/form/amount-codec.js'),
    annualTotals: annualTotals.calcTotalsAnnual,
    guardianTotals: guardianTotals.calcTotalsGuardian,
    simplifiedTotals: simplifiedTotals.calcTotals,
    annualPdf: (await import('../../src/features/annual-accounting/pdf-model.js')).buildAnnualAccountingModel,
    simplifiedPdf: (await import('../../src/features/simplified-accounting/pdf-model.js')).buildSimplifiedAccountingModel,
    inventoryPdf: (await import('../../src/features/guardian-inventory/pdf-model.js')).buildVerifiedInventoryModel,
    scheduleD: (await import('../../src/core/filing/schedule-d-figure.js')).hasScheduleDFigure,
  });
  const { initializeEmptyData } = await import('../../src/core/filing/filing-registry.js');
  M.blank = (type) => ({ ...JSON.parse(JSON.stringify(initializeEmptyData(type))), inventoryType: type, wardName: 'Ward Doe', caseNumber: '26-000100-GD', county: 'Pinellas' });
});

const NOTE = "(not counted: can't be read)";
const blocks = (model) => model.sections.flatMap((s) => s.blocks || []);

describe('the one reader and the one presenter', () => {
  test('text that can\'t be read is 0; readable text is read as typed', () => {
    const { n, wardShare } = M.money;
    expect([n('1.500,00'), n('approx 900'), n('50%')]).toEqual([0, 0, 0]);
    expect([n('(50)'), n('$1,234.56'), n(' 12.5 '), n(7), n(''), n(null)]).toEqual([-50, 1234.56, 12.5, 7, 0, 0]);
    expect(wardShare(1000, '50%')).toBe(0);
    expect(wardShare(1000, '50')).toBe(500);
  });
  test('it prints as typed, saying it isn\'t counted; a number prints as before', () => {
    expect(M.codec.presentAmount('1.500,00')).toBe(`1.500,00 ${NOTE}`);
    expect(M.money.fmt('approx 900')).toBe(`approx 900 ${NOTE}`);
    expect(M.codec.presentAmount(-50)).toBe('($50.00)');
    expect(M.codec.presentAmount('(50)')).toBe('($50.00)');
  });
});

describe('every form counts it as 0, and its PDF prints it as typed', () => {
  test('Annual: Schedule A', () => {
    const d = { ...M.blank('annual'), schA: [{ payer: 'Bank', amount: '1.500,00' }, { payer: 'SSA', amount: 100 }] };
    expect(M.annualTotals(d).schA).toBe(100);
    const table = blocks(M.annualPdf(d)).find((b) => b.title === 'Schedule A: Income Received During Period');
    expect(table.rows.map((r) => r[5])).toEqual([`1.500,00 ${NOTE}`, '$100.00']);
    expect(table.totals.value).toBe('$100.00');
  });
  test('Simplified: Part II', () => {
    const d = { ...M.blank('simplified'), startingBalance: 1000, interestIncome: 'ten dollars', depositsSettlement: '1.500,00' };
    expect(M.simplifiedTotals(d).totalIncome).toBe(0);
    expect(JSON.stringify(M.simplifiedPdf(d))).toContain(`ten dollars ${NOTE}`);
    expect(JSON.stringify(M.simplifiedPdf(d))).not.toContain('$1.50');
  });
  test('Initial Inventory: a share typed as "50%" is 0%, and prints "—"', () => {
    const d = { ...M.blank('guardian'), scheduleA1: [{ propertyDescription: 'Home', fullAssetValue: 200000, wardPercent: '50%' }] };
    expect(M.guardianTotals(d).totalA1).toBe(0);
    const row = blocks(M.inventoryPdf(d)).find((b) => b.type === 'table' && b.rows?.some((r) => JSON.stringify(r).includes('Home'))).rows[0];
    expect(row[3]).toBe('—');
  });
  test('a Schedule D whose only figure can\'t be read has no figure', () => {
    expect(M.scheduleD({ schD1: [{ fullAmount: '1.500,00' }] })).toBe(false);
    expect(M.scheduleD({ schD1: [{ fullAmount: '1,500.00' }] })).toBe(true);
  });
});
