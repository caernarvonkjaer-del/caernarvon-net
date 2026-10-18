// Hiding an answer keeps it (AGENTS.md section 4), so an old value can sit
// behind a question answered the other way. Found by the code review of
// 74J-2 and 74O-5 and the check across the forms that followed (the
// requester's choices, 2026-10-17):
// - the checks that name an amount (one that can't be read; an unexpected
//   sign) named boxes the page hides and the court output leaves out -- a
//   Part VIII trust card after "Does the Ward have one or more Trusts?" is
//   answered No, the bond amount under a waived bond or a restricted
//   depository, the Annual Plan's amount received under "no remuneration",
//   and the Final Report's amounts on an Annual or Trust Accounting after a
//   Filing Type change (a page they don't have). The filer was asked to
//   override a problem in a box they couldn't find. Now each is checked
//   only while the page shows it or the output carries it;
// - Part VIII's trusts reached the filed PDF and the court's workbook after
//   a No: "Does the Ward have one or more Trusts? No", then the trust
//   listed with its amount. Now they print and are written only under a Yes.
import { beforeAll, describe, expect, test, vi } from 'vitest';

vi.mock('../../src/core/navigation/router.js', () => ({ navigate: () => {}, renderPage: () => {}, getCurrentPage: () => '/' }));
globalThis.window = globalThis.window || globalThis;

const { initializeEmptyData } = await import('../../src/core/filing/filing-registry.js');
const { amountFieldIssues } = await import('../../src/core/filing/amount-fields.js');
const { signAdvisories } = await import('../../src/core/filing/sign-advisories.js');

const json = (x) => JSON.parse(JSON.stringify(x));
const typed = (type, extra = {}) => ({ ...json(initializeEmptyData(type)), inventoryType: type, ...json(extra) });
const unreadable = (d) => amountFieldIssues(d).map((i) => [i.path, i.route]);
const signs = (d) => signAdvisories(d).map((a) => a.field);
const trust = (hasTrust, wardAmount) => ({ trusts: [{ hasTrust, name: 'Old Family Trust', trustee: 'First Bank', wardAmount }] });

describe('the amount checks name only a box in use', () => {
  test('Part VIII: a trust card behind a No is not checked; under a Yes it is', () => {
    expect(unreadable(typed('annual', trust('No', 'about 200')))).toEqual([]);
    expect(signs(typed('annual', trust('No', -500)))).toEqual([]);
    expect(unreadable(typed('annual', trust('Yes', 'about 200')))).toEqual([['trusts.0.wardAmount', '/p8']]);
    expect(signs(typed('annual', trust('Yes', -500)))).toEqual(['trusts.0.wardAmount']);
  });

  test('the bond amount: not under a waived bond or a restricted depository; checked under a bond, and while unanswered (it prints then)', () => {
    for (const type of ['annual', 'guardian']) {
      const route = type === 'annual' ? '/p9' : '/d4';
      expect(unreadable(typed(type, { bondDepositoryState: 'bond-waived', bondAmount: 'about 200' })), type).toEqual([]);
      expect(unreadable(typed(type, { bondDepositoryState: 'depository-only', bondAmount: 'about 200' })), type).toEqual([]);
      expect(signs(typed(type, { bondDepositoryState: 'bond-waived', bondAmount: -500 })), type).toEqual([]);
      expect(unreadable(typed(type, { bondDepositoryState: 'bond-only', bondAmount: 'about 200' })), type).toEqual([['bondAmount', route]]);
      expect(unreadable(typed(type, { bondAmount: 'about 200' })), type).toEqual([['bondAmount', route]]);
    }
  });

  test("the Annual Plan's amount received: not under \"no remuneration\"; checked otherwise", () => {
    expect(unreadable(typed('planAnnual', { q11NoRemuneration: true, q11Amount: 'about 200' }))).toEqual([]);
    expect(unreadable(typed('planAnnual', { q11NoRemuneration: false, q11Amount: 'about 200' }))).toEqual([['q11Amount', '/p10']]);
  });

  test("the Final Report's amounts: read on a Final Accounting, never on an Annual or Trust holding the rows", () => {
    const rows = { finalReserved: [{ description: 'Costs', amount: 'about 200' }] };
    expect(unreadable(typed('finalAccounting', rows))).toEqual([['finalReserved.0.amount', '/final']]);
    for (const type of ['annual', 'trustAccounting']) {
      expect(unreadable(typed(type, rows)), type).toEqual([]);
      expect(signs(typed(type, { finalReserved: [{ description: 'Costs', amount: -5 }] })), type).toEqual([]);
    }
  });
});

describe("Part VIII's trusts reach the court output only under a Yes", () => {
  test('the PDF: answered No, the disclosure says No and lists no trust; answered Yes, the trust is listed', async () => {
    const { buildAnnualAccountingModel } = await import('../../src/features/annual-accounting/pdf-model.js');
    const titles = (d) => buildAnnualAccountingModel(d).sections.find((s) => s.id === 'part8').blocks.map((b) => b.title);
    expect(titles(typed('annual', trust('No', 5000)))).toEqual(['Trust Disclosure']);
    expect(titles(typed('annual', trust('Yes', 5000)))).toEqual(['Trust Disclosure', 'Trust Accounts Details']);
  });

  describe("the court's workbook", () => {
    let write;
    beforeAll(async () => {
      const { loadExcelJS, templateWorkbook } = await import('./support/exceljs-node.js');
      const { writeContract } = await import('../../src/core/excel/workbook-contract/engine.js');
      const { ANNUAL_CONTRACT } = await import('../../src/core/excel/workbook-contract/annual.js');
      write = async (d) => {
        const wb = await templateWorkbook('annual');
        writeContract(wb, ANNUAL_CONTRACT, d, {});
        const back = new (loadExcelJS().Workbook)();
        await back.xlsx.load(await wb.xlsx.writeBuffer());
        const sheet = back.getWorksheet('PART VIII');
        return [sheet.getCell('D12').value, sheet.getCell('H18').value];
      };
    }, 240_000);

    test("answered No, trust 1's boxes stay empty; answered Yes, they hold the trust", async () => {
      const [noName, noAmount] = await write(typed('annual', trust('No', 5000)));
      expect([noName ?? null, noAmount ?? null]).toEqual([null, null]);
      const [yesName, yesAmount] = await write(typed('annual', trust('Yes', 5000)));
      expect([yesName, yesAmount]).toEqual(['Old Family Trust', 5000]);
    }, 240_000);
  });
});
