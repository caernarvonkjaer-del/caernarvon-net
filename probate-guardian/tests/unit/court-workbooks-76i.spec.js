// Milestone 76I, part 1: the court workbooks. Read from real workbooks (the
// court's embedded templates, written and saved by the app's own contract),
// never a re-import standing in for the file (AGENTS.md sections 5 and 10).
//  1. The import refused more than 60 sheets -- the app's own Annual workbook
//     has 90, so a filing keeping nine or more full bank accounts exported a
//     workbook its own import refused.
//  2. Another form's workbook, or any spreadsheet, was imported anyway and
//     emptied every schedule it lacks (decisions 76I-1, 76I-5).
//  6. An untouched Schedule B-4 row blocked Save as Excel as "not assigned to
//     a bank account" once accounts existed.
//  8. Re-import wrote the mailing address over a typed office address while
//     "same as mailing" was ticked, and dropped an Inventory C-3 row whose
//     first line was blank.
//  9. The audit fee took the $85 tier for a Line 30 that prints $25,000.00.
import { describe, expect, test, vi } from 'vitest';

vi.mock('../../src/core/navigation/router.js', () => ({ navigate: () => {}, renderPage: () => {}, getCurrentPage: () => '/' }));
globalThis.window = globalThis.window || globalThis;

const { loadExcelJS, templateBytes, templateWorkbook } = await import('./support/exceljs-node.js');
vi.mock('../../src/core/excel/exceljs-loader.js', async () => {
  const { loadExcelJS: load } = await import('./support/exceljs-node.js');
  return { getExcelJS: async () => load() };
});
const { workbookAdapter, readWorkbookDraft, workbookFormOf } = await import('../../src/core/excel/workbook-contract/index.js');
const { writeContract } = await import('../../src/core/excel/workbook-contract/engine.js');
const { ANNUAL_CONTRACT } = await import('../../src/core/excel/workbook-contract/annual.js');
const { GUARDIAN_CONTRACT } = await import('../../src/core/excel/workbook-contract/guardian.js');
const { initializeEmptyData } = await import('../../src/core/filing/filing-registry.js');
const { planSchB4Export } = await import('../../src/core/excel/b4-export-plan.js');
const { SCH_B4_ACCOUNT_BLOCKS } = await import('../../src/core/excel/b4-register-pages.js');
const { calcTotalsAnnual } = await import('../../src/core/accounting/annual-totals.js');
const { BLANK_SCHEDULE_ENTRY } = await import('../../src/core/form/blank-rows.js');

const json = (x) => JSON.parse(JSON.stringify(x));
async function saved(workbook) {
  const ExcelJS = loadExcelJS();
  const again = new ExcelJS.Workbook();
  await again.xlsx.load(await workbook.xlsx.writeBuffer());
  return again;
}

describe('items 1 and 2: which workbooks import', () => {
  test('every court workbook the app carries imports into its own form -- the 90-sheet Annual included', async () => {
    for (const [name, type] of [['annual', 'annual'], ['annual', 'trustAccounting'], ['guardian', 'guardian'], ['simplified', 'simplified']]) {
      const read = await workbookAdapter({ data: templateBytes(name), inventoryType: type })();
      expect(read.draft, `${name} into ${type}`).toBeTruthy();
    }
  }, 240_000);

  test("another form's workbook is refused, naming both forms; nothing is read", async () => {
    await expect(workbookAdapter({ data: templateBytes('guardian'), inventoryType: 'annual' })())
      .rejects.toThrow("This is the court's workbook for an Initial Inventory, and this filing is an Annual, Final or Trust Accounting. Nothing in the filing was changed");
    await expect(workbookAdapter({ data: templateBytes('simplified'), inventoryType: 'guardian' })())
      .rejects.toThrow(/workbook for a Simplified Annual Accounting/);
  }, 240_000);

  test('a spreadsheet that is no court workbook is refused', async () => {
    const ExcelJS = loadExcelJS();
    const wb = new ExcelJS.Workbook();
    wb.addWorksheet('Sheet1').getCell('A1').value = 'Budget';
    const bytes = await wb.xlsx.writeBuffer();
    expect(workbookFormOf(wb)).toBe(null);
    await expect(workbookAdapter({ data: bytes, inventoryType: 'annual' })()).rejects.toThrow("This isn't a court workbook this app can read.");
  });
});

describe('item 6: an untouched Schedule B-4 row is no row', () => {
  test('with bank accounts, a row "+ Add" left untouched is not an unassigned disbursement', () => {
    const accounts = [{ id: 'a1', bankName: 'First Bank', accountNumber: '1' }];
    const rows = [{ ...BLANK_SCHEDULE_ENTRY.schB4(), bankAccountId: 'a1', payee: 'Pharmacy', category: 'Medical / Pharmacy', amount: 20 }, BLANK_SCHEDULE_ENTRY.schB4()];
    const plan = planSchB4Export(rows, accounts, SCH_B4_ACCOUNT_BLOCKS);
    expect(plan.problems.map((p) => p.code)).toEqual([]);
    expect(plan.groups[0].pages.flatMap((p) => p.rows)).toHaveLength(1);
  });

  test('with no accounts, an untouched row files no blank numbered line', () => {
    const plan = planSchB4Export([BLANK_SCHEDULE_ENTRY.schB4()], [], SCH_B4_ACCOUNT_BLOCKS);
    expect(plan.groups[0].pages.flatMap((p) => p.rows)).toEqual([]);
  });
});

describe('item 8: re-import keeps what the workbook does not carry', () => {
  test('a typed office address survives while "same as mailing" is ticked', async () => {
    const filing = {
      ...json(initializeEmptyData('annual')), inventoryType: 'annual',
      guardians: [{ name: 'Ann Guardian', mailingStreet: '1 Main St', mailingCityStateZip: 'Clearwater, FL 33755', officeSameAsMailing: true, officeStreet: '9 Office Rd', officeCityStateZip: 'Tampa, FL 33601' }],
    };
    const wb = await templateWorkbook('annual');
    writeContract(wb, ANNUAL_CONTRACT, filing, {});
    const { draft } = readWorkbookDraft(await saved(wb), 'annual', { filing });
    expect(draft.guardians[0]).toMatchObject({ mailingStreet: '1 Main St', officeStreet: '9 Office Rd', officeCityStateZip: 'Tampa, FL 33601' });
  }, 240_000);

  test('an Inventory C-3 row with no defendant but a status, court, case number and amount comes back', async () => {
    const filing = {
      ...json(initializeEmptyData('guardian')), inventoryType: 'guardian',
      scheduleC3: [{ defendantName: '', actionDescription: '', status: 'Pending', courtJurisdiction: 'Pinellas Circuit', caseNumber: '24-CA-1', estimatedSettlement: 5000, wardPercent: 100 }],
    };
    const wb = await templateWorkbook('guardian');
    writeContract(wb, GUARDIAN_CONTRACT, filing, {});
    const { draft } = readWorkbookDraft(await saved(wb), 'guardian', { filing });
    expect(draft.scheduleC3).toHaveLength(1);
    expect(draft.scheduleC3[0]).toMatchObject({ status: 'Pending', courtJurisdiction: 'Pinellas Circuit', caseNumber: '24-CA-1', estimatedSettlement: 5000 });
  }, 240_000);
});

describe('item 9: the audit fee tier is read from Line 30 as it prints', () => {
  test('three D-1 rows whose sum floats to 25000.000000000004 take the $20 tier, as "$25,000 or less"', () => {
    const t = calcTotalsAnnual({ schD1: [9551.87, 8157.5, 7290.63].map((fullAmount) => ({ fullAmount, wardPct: 100 })) });
    expect(t.netAssetsFromD).toBeGreaterThan(25000);
    expect(t.auditFee).toBe(20);
    expect(calcTotalsAnnual({ schD1: [{ fullAmount: 25000.01, wardPct: 100 }] }).auditFee).toBe(85);
  });
});
