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

// 2026-10-17, the requester's choice after the check across the forms: eight
// more places where an answer the page hides, and keeps, still reached the
// filed document. Each output now leaves out what the page hides.
describe('the PDFs leave out what the page hides', () => {
  const allItems = (model) => model.sections.flatMap((s) => (s.blocks || []).flatMap((b) => b.items || []));
  const labels = (model) => allItems(model).map((i) => i.label);

  test('Annual Part IX: the restricted-depository receipt date prints under a depository, not under a waived bond', async () => {
    const { buildAnnualAccountingModel } = await import('../../src/features/annual-accounting/pdf-model.js');
    const receipt = (state) => allItems(buildAnnualAccountingModel(typed('annual', { bondDepositoryState: state, restrictedDepositoryReceiptDate: '2026-03-01' })))
      .find((i) => i.label === 'Date of Restricted Depository Receipt').value;
    expect(receipt('bond-waived')).toBe('');
    expect(receipt('bond-only')).toBe('');
    expect(receipt('depository-only')).toBe('03/01/2026');
    expect(receipt('bond-and-depository')).toBe('03/01/2026');
  });

  test("the Annual Plan: Question 10's Other text, a directive's revoking order and Question 3's specialty print only under their answer", async () => {
    const { buildPlanAnnualModel } = await import('../../src/features/plan-annual/pdf-model.js');
    const directive = { title: 'Durable Power of Attorney', dateSigned: '2019-05-01', signedBy: 'Ward', agents: '', alternates: '', relationship: '', contact: '', orderDate: '2024-02-02', orderCounty: 'Pinellas' };
    const model = (extra) => buildPlanAnnualModel(typed('planAnnual', { q10Executed: true, q10ExecOtherText: 'Old directive', q3MedSpecialistArea: 'Neurology', ...extra }));
    const hidden = labels(model({ q10ExecOther: false, q3MedSpecialist: false, q10Directives: [{ ...directive, courtRevoked: 'No' }] }));
    expect(hidden.filter((l) => /Old directive|Neurology|Date of Order/.test(String(l)))).toEqual([]);
    const shown = labels(model({ q10ExecOther: true, q3MedSpecialist: true, q10Directives: [{ ...directive, courtRevoked: 'Yes' }] }));
    expect(shown.filter((l) => /Old directive|Neurology|Date of Order/.test(String(l))).length).toBe(3);
  });

  test("the Initial Plan: Question 3's specialty prints only under a ticked Specialist", async () => {
    const { buildPlanInitialModel } = await import('../../src/features/plan-initial/pdf-model.js');
    const specialty = (ticked) => labels(buildPlanInitialModel(typed('planInitial', { q3MedSpecialist: ticked, q3MedSpecialistArea: 'Neurology' })))
      .filter((l) => /Neurology/.test(String(l))).length;
    expect([specialty(false), specialty(true)]).toEqual([0, 1]);
  });

  test("the Plan for Minors: Question 4's frequency prints only beside a ticked examination", async () => {
    const { buildPlanMinorModel } = await import('../../src/features/plan-minor/pdf-model.js');
    const freq = (ticked) => labels(buildPlanMinorModel(typed('planMinor', { q4Primary: ticked, q4PrimaryFreq: 'Monthly', q4Dentist: ticked, q4DentistFreq: 'Annually', q4Specialist: ticked, q4SpecialistFreq: 'Weekly' })))
      .filter((l) => / — (Monthly|Annually|Weekly)$/.test(String(l))).length;
    expect([freq(false), freq(true)]).toEqual([0, 3]);
  });
});

describe("the courts' workbooks leave out what the page hides", () => {
  let write, read;
  beforeAll(async () => {
    const { loadExcelJS, templateWorkbook } = await import('./support/exceljs-node.js');
    const { writeContract } = await import('../../src/core/excel/workbook-contract/engine.js');
    const { ANNUAL_CONTRACT } = await import('../../src/core/excel/workbook-contract/annual.js');
    const { GUARDIAN_CONTRACT } = await import('../../src/core/excel/workbook-contract/guardian.js');
    const { SIMPLIFIED_CONTRACT } = await import('../../src/core/excel/workbook-contract/simplified.js');
    const contracts = { annual: ANNUAL_CONTRACT, guardian: GUARDIAN_CONTRACT, simplified: SIMPLIFIED_CONTRACT };
    const contractIndex = await import('../../src/core/excel/workbook-contract/index.js');
    const written = async (template, d) => {
      const wb = await templateWorkbook(template);
      writeContract(wb, contracts[template], d, {});
      const back = new (loadExcelJS().Workbook)();
      await back.xlsx.load(await wb.xlsx.writeBuffer());
      return back;
    };
    write = async (template, d, sheet, cells) => {
      const ws = (await written(template, d)).getWorksheet(sheet);
      return cells.map((c) => ws.getCell(c).value ?? null);
    };
    read = async (template, d, into) => contractIndex.readWorkbookDraft(await written(template, d), template, { filing: into }).draft;
  }, 240_000);

  const RECIPIENT = { name: 'Jane Heir', line2: '5 Oak Ave', line3: 'Clearwater, FL 33755', line4: '', line5: '' };

  test('the Annual family Part X: under "no one needs to be served", no recipient is written; an import listing recipients asks the question again', async () => {
    expect(await write('annual', typed('annual', { certNoRecipients: 'Yes', certRecipients: [RECIPIENT] }), 'PART X', ['B11'])).toEqual([null]);
    expect(await write('annual', typed('annual', { certNoRecipients: '', certRecipients: [RECIPIENT] }), 'PART X', ['B11'])).toEqual(['Jane Heir']);
    const draft = await read('annual', typed('annual', { certRecipients: [RECIPIENT] }), typed('annual', { certNoRecipients: 'Yes' }));
    expect(draft.certNoRecipients).toBe('');
  }, 240_000);

  test('the Initial Inventory Part VI: under "no one needs to be served", no recipient is written', async () => {
    expect(await write('guardian', typed('guardian', { serviceNoRecipients: 'Yes', serviceRecipients: [RECIPIENT] }), 'PART VI', ['B13'])).toEqual([null]);
    expect(await write('guardian', typed('guardian', { serviceNoRecipients: '', serviceRecipients: [RECIPIENT] }), 'PART VI', ['B13'])).toEqual(['Jane Heir']);
  }, 240_000);

  test("the certificate's attorney signature date is written only while an attorney is entered", async () => {
    const date = '2026-01-15';
    const cell = (v) => (v instanceof Date ? v.toISOString().slice(0, 10) : v);
    const cases = [
      ['annual', 'PART X', 'G25', { certAttySignDate: date }, { attorney: 'Ann Lawyer' }],
      ['guardian', 'PART VI', 'G27', { serviceAttorney: { signatureDate: date } }, { attorney: { name: 'Ann Lawyer' } }],
      ['simplified', 'PARTS V, VI ', 'H41', { certAttySignDate: date }, { attorney: 'Ann Lawyer' }],
    ];
    for (const [type, sheet, addr, dated, attorney] of cases) {
      const base = json(initializeEmptyData(type));
      const merge = (extra) => typed(type, Object.fromEntries(Object.entries(extra).map(([k, v]) => [k, v && typeof v === 'object' && !Array.isArray(v) ? { ...(base[k] || {}), ...v } : v])));
      const [none] = await write(type, merge(dated), sheet, [addr]);
      expect(none, `${type}: no attorney`).toBeNull();
      const [withAttorney] = await write(type, merge({ ...dated, ...attorney }), sheet, [addr]);
      expect(cell(withAttorney), `${type}: an attorney entered`).toBe(date);
    }
  }, 240_000);
});
