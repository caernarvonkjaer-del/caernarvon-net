import { beforeAll, describe, expect, test } from 'vitest';

// Milestone 73B: no answer the filer didn't give.
//
// What a filer saw: a blank Type of Guardianship printed "Plenary" on the
// Inventory, Annual, Final, Trust and Simplified PDFs, and nothing on the
// Annual family asked for one; every new Annual-family filing said
// "Professional Guardian", and a blank one printed "None" -- not one of the
// Clerk's three choices -- as did a blank restricted-depository receipt date;
// "+ Add" on D-1, D-2 and D-4 arrived with "Restricted?", "Personal
// Residence?" and "Income Property?" answered No; every new Inventory row
// started at a 100% share (C-5's joint owner at 50%) with Mortgage, Loan,
// Monthly or Pooled chosen, and the Excel export wrote those four for a blank
// and the import put them back; an unanswered Annual Plan Q11 printed the
// sworn "I have received the monies … from …". None had a recorded reason;
// the Clerk's workbooks pre-fill none of them.
//
// Red-first: against the code before 73B every case below fails, each for
// its finding.

globalThis.window = globalThis.window || globalThis;
const { FILING_REGISTRY, initializeEmptyData } = await import('../../src/core/filing/filing-registry.js');
const { getCollection, registeredCollections } = await import('../../src/core/form/collections.js');
const { isBlankScheduleEntry } = await import('../../src/core/form/blank-rows.js');
const { buildAnnualAccountingModel } = await import('../../src/features/annual-accounting/pdf-model.js');
const { buildVerifiedInventoryModel } = await import('../../src/features/guardian-inventory/pdf-model.js');
const { buildSimplifiedAccountingModel } = await import('../../src/features/simplified-accounting/pdf-model.js');
const { buildPlanAnnualModel } = await import('../../src/features/plan-annual/pdf-model.js');
const { collectAnnualIssues } = await import('../../src/core/validation/engines/annual.js');
const { collectGuardianIssues } = await import('../../src/core/validation/engines/guardian.js');
const { guardianRelationshipAdvisories } = await import('../../src/core/filing/guardian-relationship.js');

const json = (x) => JSON.parse(JSON.stringify(x));
const unanswered = (v) => v === '' || v === null || v === undefined || v === false || v === 0 || (Array.isArray(v) && !v.length);

/** Every leaf of a filing holding something other than "nothing yet", as path=value. */
function presetValues(value, path = '', out = []) {
  if (Array.isArray(value)) value.forEach((v, i) => presetValues(v, `${path}.${i}`, out));
  else if (value && typeof value === 'object') Object.entries(value).forEach(([k, v]) => presetValues(v, path ? `${path}.${k}` : k, out));
  else if (!unanswered(value)) out.push(`${path}=${JSON.stringify(value)}`);
  return out;
}

// The model's bookkeeping, never a filer's answer: the signature rule a new
// filing is on (73A), the Plans' tri-state schema version, and the filing's
// own identity (its type, and the Annual family's "Annual"/"Final"/"Trust").
const BOOKKEEPING = /^(signaturePolicy|planTriStateSchemaVersion|inventoryType|filingType)=/;

/** All the items of a PDF model's blocks, flattened, as {label, value}. */
function modelItems(model) {
  const items = [];
  const visit = (node) => {
    if (Array.isArray(node)) return node.forEach(visit);
    if (!node || typeof node !== 'object') return;
    if ('label' in node && 'value' in node) items.push(node);
    Object.values(node).forEach(visit);
  };
  visit(model);
  return items;
}
const itemValue = (model, label) => modelItems(model).filter((i) => i.label === label).map((i) => i.value);
const modelText = (model) => JSON.stringify(model);

describe('a new filing', () => {
  test('carries no answer on any of the nine forms -- only bookkeeping', () => {
    for (const type of Object.keys(FILING_REGISTRY)) {
      expect(presetValues(json(initializeEmptyData(type))).filter((v) => !BOOKKEEPING.test(v)), type).toEqual([]);
    }
  });

  test('the Annual, Final and Trust Accounting start with no relationship to the ward (it was "Professional Guardian")', () => {
    for (const type of ['annual', 'finalAccounting', 'trustAccounting']) expect(initializeEmptyData(type).guardianRelationship, type).toBe('');
  });
});

describe('every "+ Add" row on every form', () => {
  test('carries no answer -- every field blank, unticked or $0, only an id set', () => {
    const preset = [];
    for (const [type, listKey] of registeredCollections()) {
      const row = getCollection(type, listKey).factory();
      for (const [k, v] of Object.entries(row)) if (k !== 'id' && !unanswered(v)) preset.push(`${type} ${listKey}.${k}=${JSON.stringify(v)}`);
    }
    expect(preset).toEqual([]);
  });

  test('a row saved with the old defaults and nothing else is still untouched, so leaving the page clears it (design step 7)', () => {
    expect(isBlankScheduleEntry('scheduleA2', { lenderName: '', liabilityType: 'Mortgage', fullDebtBalance: 0, wardPercent: 100 })).toBe(true);
    expect(isBlankScheduleEntry('scheduleB4', { lenderName: '', liabilityType: 'Loan', fullLiabilityBalance: 0, wardPercent: 100 })).toBe(true);
    expect(isBlankScheduleEntry('scheduleC1', { payerName: '', frequencyOfPayment: 'Monthly', annualIncomeAmount: 0, wardPercent: 100 })).toBe(true);
    expect(isBlankScheduleEntry('scheduleC4', { trustName: '', trustType: 'Pooled', trustAmount: 0, wardPercent: 100 })).toBe(true);
    expect(isBlankScheduleEntry('scheduleC5', { assetDescription: '', totalAssetValue: 0, jointOwnerPercent: 50 })).toBe(true);
    expect(isBlankScheduleEntry('schD2', { description: '', residence: 'No', income: 'No' })).toBe(true);
    // ...but a row holding anything else is the filer's.
    expect(isBlankScheduleEntry('scheduleA2', { lenderName: 'First Bank', liabilityType: 'Mortgage', wardPercent: 100 })).toBe(false);
    expect(isBlankScheduleEntry('scheduleA2', { lenderName: '', liabilityType: 'Note', wardPercent: '' })).toBe(false);
    expect(isBlankScheduleEntry('scheduleA1', { propertyDescription: '', wardPercent: 50 })).toBe(false);
  });
});

describe('a blank prints blank', () => {
  test('Type of Guardianship on the Inventory, Annual and Simplified PDFs (it printed "Plenary")', () => {
    for (const [name, model] of [
      ['Inventory', buildVerifiedInventoryModel(initializeEmptyData('guardian'))],
      ['Annual', buildAnnualAccountingModel(initializeEmptyData('annual'))],
      ['Simplified', buildSimplifiedAccountingModel(initializeEmptyData('simplified'))],
    ]) {
      expect(itemValue(model, 'Type of Guardianship'), name).toEqual(['']);
    }
  });

  test('Part IX\'s relationship and receipt date (they printed "None")', () => {
    const model = buildAnnualAccountingModel(initializeEmptyData('annual'));
    expect(itemValue(model, "Guardian's Relationship to Ward")).toEqual(['']);
    expect(itemValue(model, 'Date of Restricted Depository Receipt')).toEqual(['']);
    expect(modelText(model)).not.toMatch(/"None"/);
  });

  test('an unanswered Annual Plan Q11 prints neither sworn sentence; each answer prints its own', () => {
    const blank = modelText(buildPlanAnnualModel(initializeEmptyData('planAnnual')));
    expect(blank).not.toContain('declare that I have received the monies');
    expect(blank).not.toContain('declare that I have received NO remuneration');
    const received = modelText(buildPlanAnnualModel({ ...initializeEmptyData('planAnnual'), q11ReceivedName: 'Pat Guardian', q11Amount: '$500', q11From: 'the ward' }));
    // Milestone 73H (design 3): Q11 prints as currency (it printed the stored "$500" as typed).
    // Milestone 73N part 2: the court's "I, ___ declare" and "the monies of $___".
    expect(received).toContain('I, Pat Guardian declare that I have received the monies of $500.00 from the ward');
    const none = modelText(buildPlanAnnualModel({ ...initializeEmptyData('planAnnual'), q11NoRemuneration: true, q11NoRemunerationName: 'Pat Guardian' }));
    expect(none).toContain('I, Pat Guardian declare that I have received NO remuneration');
    expect(none).not.toContain('received the monies');
  });
});

describe('what the filer must still answer', () => {
  const messages = (issues) => issues.map((i) => String(i?.message ?? i));

  test('Type of Guardianship on the Annual, Final and Trust Accounting (73B-1)', () => {
    for (const type of ['annual', 'finalAccounting', 'trustAccounting']) {
      expect(messages(collectAnnualIssues({ ...initializeEmptyData(type) })), type).toContain('Part I — Type of Guardianship');
      expect(messages(collectAnnualIssues({ ...initializeEmptyData(type), typeOfGuardianship: 'Limited' })), type).not.toContain('Part I — Type of Guardianship');
    }
  });

  test("the Inventory's A-2 and B-4 Type, C-1 Frequency and C-4 Type of Trust on a row (73B-N1)", () => {
    const d = initializeEmptyData('guardian');
    const m = (list) => { d[list] = [getCollection('guardian', list).factory()]; };
    ['scheduleA2', 'scheduleB4', 'scheduleC1', 'scheduleC4'].forEach(m);
    const found = messages(collectGuardianIssues(d));
    for (const message of ['A-2 row 1 — Type', 'B-4 row 1 — Type', 'C-1 row 1 — Frequency', 'C-4 row 1 — Type of Trust']) expect(found).toContain(message);
    Object.assign(d.scheduleA2[0], { liabilityType: 'Note' });
    Object.assign(d.scheduleB4[0], { liabilityType: 'Other Debt' });
    Object.assign(d.scheduleC1[0], { frequencyOfPayment: 'Quarterly' });
    Object.assign(d.scheduleC4[0], { trustType: 'Special Needs' });
    const after = messages(collectGuardianIssues(d));
    for (const message of ['A-2 row 1 — Type', 'B-4 row 1 — Type', 'C-1 row 1 — Frequency', 'C-4 row 1 — Type of Trust']) expect(after).not.toContain(message);
  });

  test("an unanswered Part IX relationship is pointed out, never required (73B-2)", () => {
    expect(guardianRelationshipAdvisories({ guardianRelationship: '' }).map((a) => [a.severity, a.field])).toEqual([['advisory', 'guardianRelationship']]);
    expect(guardianRelationshipAdvisories({ guardianRelationship: 'Family/Non-Professional Guardian' })).toEqual([]);
    expect(messages(collectAnnualIssues(initializeEmptyData('annual'))).filter((m) => /Relationship/.test(m))).toEqual([]);
  });
});

// The Inventory's workbook, written with the app's own ExcelJS onto the
// Clerk's template and read back: the four are written and read as they are.
describe("the Inventory's workbook", () => {
  let back, writeContract, GUARDIAN_CONTRACT, contractIndex;
  const row = (list, fields) => ({ ...getCollection('guardian', list).factory(), ...fields });
  const filing = () => ({
    ...initializeEmptyData('guardian'), inventoryType: 'guardian', wardName: 'Ward', caseNumber: '2026-GA-1',
    scheduleA2: [row('scheduleA2', { lenderName: 'First Bank', fullDebtBalance: 100, wardPercent: 100 })],
    scheduleB4: [row('scheduleB4', { lenderName: 'Card Co', fullLiabilityBalance: 50, wardPercent: 100 })],
    scheduleC1: [row('scheduleC1', { payerName: 'SSA', annualIncomeAmount: 1200, wardPercent: 100 })],
    scheduleC4: [row('scheduleC4', { trustName: 'Smith Trust', trustAmount: 5, wardPercent: 100 })],
  });

  beforeAll(async () => {
    const { loadExcelJS, templateWorkbook } = await import('./support/exceljs-node.js');
    ({ writeContract } = await import('../../src/core/excel/workbook-contract/engine.js'));
    ({ GUARDIAN_CONTRACT } = await import('../../src/core/excel/workbook-contract/guardian.js'));
    contractIndex = await import('../../src/core/excel/workbook-contract/index.js');
    const wb = await templateWorkbook('guardian');
    writeContract(wb, GUARDIAN_CONTRACT, filing(), {});
    back = new (loadExcelJS().Workbook)();
    await back.xlsx.load(await wb.xlsx.writeBuffer());
  }, 240_000);

  test('a blank Type, Frequency or Type of Trust is written blank (it was Mortgage, Loan, Monthly, Pooled) and reads back blank', () => {
    const { draft } = contractIndex.readWorkbookDraft(back, 'guardian', { filing: filing() });
    expect([draft.scheduleA2[0].liabilityType, draft.scheduleB4[0].liabilityType, draft.scheduleC1[0].frequencyOfPayment, draft.scheduleC4[0].trustType])
      .toEqual(['', '', '', '']);
    expect(draft.scheduleA2[0].lenderName).toBe('First Bank');
  });
});
