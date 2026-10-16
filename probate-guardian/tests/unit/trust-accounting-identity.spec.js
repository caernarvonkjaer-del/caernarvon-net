// Milestone 74N: a Trust Accounting names the trust it reports on (decisions
// 74N-1 and 74N-3, the requester, 2026-10-06; QA report BUG-08). A "This
// accounting reports on" block -- name, trustee, whether the trustee is the
// guardian, date created, date funds were received, account number -- on the
// Trust Accounting's Cover and under its PDF caption; one trust each; made
// from an Annual, the chosen Part VIII trust fills it. Its name is required
// (an ordinary error the filer can override). The workbook has no cell for it:
// the export says so, and an import keeps the filing's block. Before, nothing
// on the filing said which trust it was. The new module is imported in the
// tests, so each case fails for its own reason while it is missing.
import { afterAll, beforeAll, describe, expect, test, vi } from 'vitest';

vi.mock('../../src/core/navigation/router.js', () => ({ navigate: () => {}, renderPage: () => {}, getCurrentPage: () => '/' }));

let m;
beforeAll(async () => {
  vi.stubGlobal('window', globalThis);
  const [registry, engines, features, guardianTotals, simplifiedTotals, annualTotals] = await Promise.all([
    import('../../src/core/filing/filing-registry.js'),
    import('../../src/core/validation/engines/index.js'),
    import('../../src/core/runtime/features.js'),
    import('../../src/features/guardian-inventory/totals.js'),
    import('../../src/features/simplified-accounting/totals.js'),
    import('../../src/features/annual-accounting/totals.js'),
  ]);
  features.provideFeatureServices({ totals: { guardian: guardianTotals.calcTotalsGuardian, simplified: simplifiedTotals.calcTotals, annual: annualTotals.calcTotalsAnnual } });
  m = { registry, engines };
}, 120_000);
afterAll(() => vi.unstubAllGlobals());

const json = (x) => JSON.parse(JSON.stringify(x));
const typed = (type, extra = {}) => ({ ...json(m.registry.initializeEmptyData(type)), inventoryType: type, ...json(extra) });
const BLOCK = { name: '', trustee: '', trusteeIsGuardian: '', dateCreated: '', dateFunded: '', accountNo: '' };
const PEMBERTON = { name: 'Pemberton Special Needs Trust', trustee: 'First Trust Co.', trusteeIsGuardian: 'No', dateCreated: '2026-03-01', dateFunded: '2026-03-15', accountNo: '5510' };
const partVIII = [
  { hasTrust: 'Yes', createdAfterGID: 'No', name: 'Old Family Trust', trustee: 'Uncle', accountNo: '1', dateCreated: '2019-01-01' },
  { hasTrust: '', createdAfterGID: 'Yes', name: 'Pemberton Special Needs Trust', trustee: 'First Trust Co.', accountNo: '5510', dateCreated: '2026-03-01' },
  { hasTrust: '', createdAfterGID: 'Yes', name: 'Gulf Pooled Trust', trustee: 'Gulf Trust Services', accountNo: '7720', dateCreated: '2026-04-15' },
];

describe('the block', () => {
  test('every Annual-family filing starts with a blank block', () => {
    for (const type of ['annual', 'finalAccounting', 'trustAccounting']) expect(typed(type).trustInfo, type).toEqual(BLOCK);
  });

  test("Part VIII's trusts created after the GID qualify; made from one, its details fill the block", async () => {
    const { qualifyingTrusts, trustInfoFrom } = await import('../../src/core/filing/trust-identity.js');
    const annual = typed('annual', { trusts: partVIII });
    expect(qualifyingTrusts(annual).map((q) => [q.index, q.trust.name])).toEqual([[1, 'Pemberton Special Needs Trust'], [2, 'Gulf Pooled Trust']]);
    expect(trustInfoFrom(annual, 2)).toEqual({ ...BLOCK, name: 'Gulf Pooled Trust', trustee: 'Gulf Trust Services', dateCreated: '2026-04-15', accountNo: '7720' });
    // A trust that doesn't qualify, no choice, or no trust at all: blank.
    for (const index of [0, 5, '', null]) expect(trustInfoFrom(annual, index), String(index)).toEqual(BLOCK);
    expect(qualifyingTrusts(typed('annual', { trusts: partVIII.map((t, i) => (i === 0 ? { ...t, hasTrust: 'No' } : t)) }))).toEqual([]);
  });
});

describe('the Trust Accounting asks for the trust\'s name', () => {
  const named = (filing) => m.engines.evaluateFiling(filing).blockers.filter((b) => String(b.path || '').startsWith('trustInfo.'));
  test('a blank name is named, on its path, and can be overridden', () => {
    const [issue, ...rest] = named(typed('trustAccounting'));
    expect(rest).toEqual([]);
    expect([issue?.message, issue?.path, issue?.bypassable]).toEqual(['Part I — Name of the Trust', 'trustInfo.name', true]);
  });

  test('a named trust passes; the Annual and the Final are not asked', () => {
    expect(named(typed('trustAccounting', { trustInfo: PEMBERTON }))).toEqual([]);
    for (const type of ['annual', 'finalAccounting']) expect(named(typed(type)), type).toEqual([]);
  });
});

describe('the PDF and the workbook', () => {
  test('the PDF prints the block in Part I, under the case caption, on a Trust Accounting only', async () => {
    const { buildAnnualAccountingModel } = await import('../../src/features/annual-accounting/pdf-model.js');
    const block = (filing) => buildAnnualAccountingModel(filing).sections.find((s) => s.id === 'part1').blocks.find((b) => b.title === 'This Accounting Reports On');
    expect(block(typed('trustAccounting', { trustInfo: PEMBERTON })).items).toEqual([
      { label: 'Name of the Trust', value: 'Pemberton Special Needs Trust' },
      { label: 'Name of the Trustee', value: 'First Trust Co.' },
      { label: 'Is the Trustee the Guardian?', value: 'No' },
      { label: 'Date Trust Created', value: '03/01/2026' },
      { label: 'Date the Funds Were Received by the Trust', value: '03/15/2026' },
      { label: 'Trustee Account Number', value: '5510' },
    ]);
    expect(block(typed('annual', { trustInfo: PEMBERTON }))).toBeUndefined();
  });

  test('the export says the workbook has no cell for it; an import keeps the filing\'s block', async () => {
    const contractIndex = await import('../../src/core/excel/workbook-contract/index.js');
    expect(contractIndex.excelOmissions(typed('trustAccounting', { trustInfo: PEMBERTON }))).toContainEqual({ text: 'which trust this accounting reports on' });
    expect(contractIndex.excelOmissions(typed('trustAccounting')).map((o) => o.text)).not.toContain('which trust this accounting reports on');
    expect(contractIndex.excelOmissions(typed('annual', { trustInfo: PEMBERTON })).map((o) => o.text)).not.toContain('which trust this accounting reports on');

    const { loadExcelJS, templateWorkbook } = await import('./support/exceljs-node.js');
    const { writeContract } = await import('../../src/core/excel/workbook-contract/engine.js');
    const { ANNUAL_CONTRACT } = await import('../../src/core/excel/workbook-contract/annual.js');
    const filing = typed('trustAccounting', { trustInfo: PEMBERTON, wardName: 'Ward', caseNumber: '26-000123-GD' });
    const wb = await templateWorkbook('annual');
    writeContract(wb, ANNUAL_CONTRACT, filing, { filingTypeValue: 'Trust' });
    const back = new (loadExcelJS().Workbook)();
    await back.xlsx.load(await wb.xlsx.writeBuffer());
    const { draft } = contractIndex.readWorkbookDraft(back, 'trustAccounting', { filing, ctx: { filingTypeValue: 'Trust' } });
    expect('trustInfo' in draft).toBe(false);
    expect(draft.wardName).toBe('Ward');
  }, 300_000);
});
