// Milestone 73T part 1: the Annual, Final and Trust Accounting's workbook
// contract (templates/annual-template.js) -- every field the Annual's
// exporter writes and its importer reads, as src/features/annual-accounting/
// excel.js does today. 73T part 3 moves that exporter and importer onto this
// contract and fixes the entries marked `defect`.
import { codecs } from './codecs.js';
import { writeCell } from './engine.js';
import { readCellText, unwrapCellValue } from '../cell-reader.js';
import { amountForStore } from '../../form/amount-codec.js';
import { numValue, percentValue } from '../excel-engine.js';
import { shareFromWorkbookCell } from '../share-cell.js';
import { hasIdentifiedPreparer } from '../../form/preparer-flag.js';
import { bondAmountCellValue, bondAmountFromCell } from '../../filing/bond-depository.js';
import { readIndicateIfBox } from '../../filing/certificate-migrations.js';
import { rowStarted } from '../../validation/row-started.js';
import { createBankAccountId } from '../../accounting/bank-accounts.js';
import { planSchB4Export } from '../b4-export-plan.js';
import { SCH_B4_ACCOUNT_BLOCKS, B4_REGISTER_PREFIX } from '../b4-register-pages.js';

const { text, dateOrBlank: date, amountNumber: amount, share, listText: list } = codecs;
const field = (path, sheet, cell, codec, more = {}) => ({ kind: 'field', path, sheet, cell, codec, ...more });
const col = (field, c, codec, more = {}) => ({ field, col: c, codec, ...more });
const run = (first, step, count) => Array.from({ length: count }, (_, i) => first + i * step);
/** The importer's "has data" test: any value that isn't blank (0 counts). */
const hasData = (...vals) => vals.some((v) => v != null && String(v).trim() !== '');
const present = (...keys) => (r) => hasData(...keys.map((k) => r[k]));
const blankKeys = (...keys) => (r) => ({ ...r, ...Object.fromEntries(keys.map((k) => [k, ''])) });

// The Clerk's workbook's own formats for a share and an amount (Milestone 72B):
// the same strings as annual-accounting/excel.js's WORKBOOK_SHARE_FORMAT and
// WORKBOOK_MONEY_FORMAT, which 73T part 3 points at these.
export const WORKBOOK_SHARE_FORMAT = '0.00%';
export const WORKBOOK_MONEY_FORMAT = '"$"#,##0.00_);\\("$"#,##0.00\\)';

// PART I's county box is the form's "Select County" dropdown; a workbook
// exported before Milestone 72A left that prompt and put the county in D23.
const countyBox = Object.freeze({
  kind: 'text',
  write: (v) => text.write(v),
  read: (cell) => { const t = readCellText(cell); return t.trim().toLowerCase() === 'select county' ? '' : t; },
});

// Part VIII's share and amount (Milestone 72B): written under the workbook's
// share and money formats. A workbook exported before 72B kept the template's
// date format on both, so ExcelJS hands the number back as a date -- read back
// as the number it was.
const asNumberWritten = (v) => (v instanceof Date ? Math.round((v.getTime() / 86400000 + 25569) * 1e6) / 1e6 : v);
const trustShare = Object.freeze({
  kind: 'share',
  write: (v) => ({ value: percentValue(v), numFmt: WORKBOOK_SHARE_FORMAT }),
  read: (cell) => {
    const v = asNumberWritten(unwrapCellValue(cell.value));
    if (v == null || v === '') return '';
    if (typeof v === 'number') return String(cell.numFmt || '').includes('%') ? shareFromWorkbookCell(v) : v;
    const n = parseFloat(String(v).replace(/%$/, ''));
    return Number.isFinite(n) ? n : String(v);
  },
});
const trustAmount = Object.freeze({
  kind: 'amount',
  write: (v) => ({ value: v === '' || v == null ? '' : numValue(v), numFmt: WORKBOOK_MONEY_FORMAT }),
  read: (cell) => amountForStore(asNumberWritten(unwrapCellValue(cell.value))),
});

const bondAmount = Object.freeze({
  kind: 'amount',
  write: (v) => ({ value: bondAmountCellValue(v) }),
  read: (cell) => bondAmountFromCell(amount.read(cell)),
});

// PART II, III: three guardian blocks ten rows apart.
const GUARDIAN_FIELDS = Object.freeze({
  signatureDate: [0, 'D'], name: [0, 'F'], ssn: [2, 'B'], mailingStreet: [2, 'F'], phone: [4, 'B'],
  mailingCityStateZip: [4, 'F'], email: [6, 'B'], officeStreet: [6, 'F'], officeCityStateZip: [8, 'F'],
});
const guardianSlots = [25, 35, 45].map((r) => Object.fromEntries(Object.entries(GUARDIAN_FIELDS).map(([k, [dr, c]]) => [k, `${c}${r + dr}`])));

// PART VIII: the one "any trust?" answer, then three trust blocks.
const TRUST_ROWS = [[10, 12, 13, 14, 15, 16, 17, 18], [20, 22, 23, 24, 25, 26, 27, 28], [30, 32, 33, 34, 35, 36, 37, 38]];
const trustSlots = TRUST_ROWS.map(([gid, name, trustee, acct, created, type, pct, amt]) => ({
  hasTrust: 'D8', createdAfterGID: `H${gid}`, name: `D${name}`, trustee: `D${trustee}`, accountNo: `D${acct}`,
  dateCreated: `D${created}`, trustType: `D${type}`, wardPct: `D${pct}`, wardAmount: `D${amt}`,
}));
const PART_VIII_BOX = (box) => ({ row: 3, part: 3, note: `written beside the Clerk's box ${box}`, box });

// PART X: four recipient blocks.
const RECIPIENT_SLOTS = [['B', 11], ['I', 11], ['B', 17], ['I', 17]].map(([c, r]) => ({ name: `${c}${r}`, line2: `${c}${r + 1}`, line3: `${c}${r + 2}`, line4: `${c}${r + 3}` }));

// Schedule B-4: one bank account per block of register pages, its bank and
// account number at the top of the block's first page (D6, H6).
export const b4SheetName = (page) => `${B4_REGISTER_PREFIX}${page}`;
const B4_COLUMNS = Object.freeze([['C', 'checkNo', text], ['D', 'datePaid', date], ['E', 'category', text], ['G', 'payee', text], ['I', 'amount', amount]]);
const scheduleB4 = Object.freeze({
  kind: 'custom', path: 'schB4',
  // ctx.b4Plan is the export's one plan, shared with the page pruning.
  write(workbook, filing, io, ctx = {}) {
    const plan = ctx.b4Plan || planSchB4Export(filing.schB4, filing.schB4Accounts, SCH_B4_ACCOUNT_BLOCKS);
    for (const group of plan.groups) {
      const head = b4SheetName(group.block.pages[0].page);
      if (workbook.getWorksheet(head) && group.account) {
        writeCell(workbook, io, head, 'D6', text, group.account.bankName, filing);
        writeCell(workbook, io, head, 'H6', text, group.account.accountNumber, filing);
      }
      for (const pageRows of group.pages) {
        if (!workbook.getWorksheet(b4SheetName(pageRows.page))) continue;
        pageRows.rows.forEach((r, i) => {
          for (const [c, key, codec] of B4_COLUMNS) writeCell(workbook, io, b4SheetName(pageRows.page), `${c}${pageRows.firstRow + i}`, codec, r[key], filing);
        });
      }
    }
  },
  // A block becomes an account only when its header names one; a block whose
  // pages were pruned isn't there.
  read(workbook, draft) {
    draft.schB4 = [];
    draft.schB4Accounts = [];
    for (const block of SCH_B4_ACCOUNT_BLOCKS) {
      const head = workbook.getWorksheet(b4SheetName(block.pages[0].page));
      if (!head) continue;
      const bankName = text.read(head.getCell('D6')), accountNumber = text.read(head.getCell('H6'));
      let bankAccountId = '';
      if (bankName || accountNumber) {
        bankAccountId = createBankAccountId();
        draft.schB4Accounts.push({ id: bankAccountId, bankName, accountNumber });
      }
      for (const page of block.pages) {
        const ws = workbook.getWorksheet(b4SheetName(page.page));
        if (!ws) continue;
        for (let r = page.firstRow; r < page.firstRow + page.rows; r++) {
          const row = { bankAccountId };
          for (const [c, key, codec] of B4_COLUMNS) row[key] = codec.read(ws.getCell(`${c}${r}`));
          if (hasData(row.checkNo, row.payee, row.amount)) draft.schB4.push(row);
        }
      }
    }
  },
  targets() {
    const out = [];
    let index = 0;
    SCH_B4_ACCOUNT_BLOCKS.forEach((block, b) => {
      const head = b4SheetName(block.pages[0].page);
      out.push({ sheet: head, cell: 'D6', path: `schB4Accounts.${b}.bankName`, kind: 'text' }, { sheet: head, cell: 'H6', path: `schB4Accounts.${b}.accountNumber`, kind: 'text' });
      for (const page of block.pages) {
        for (let r = page.firstRow; r < page.firstRow + page.rows; r++, index++) {
          for (const [c, key, codec] of B4_COLUMNS) out.push({ sheet: b4SheetName(page.page), cell: `${c}${r}`, path: `schB4.${index}.${key}`, kind: codec.kind });
        }
      }
    });
    return out;
  },
});

// The Indicate if box (Milestone 72G): the ward's status; a workbook exported
// before 72G holds the method there, read by what it holds.
const indicateIf = Object.freeze({
  kind: 'custom', path: 'certWardStatus',
  write(workbook, filing, io) { writeCell(workbook, io, 'PART X', 'K23', list, filing.certWardStatus, filing); },
  read(workbook, draft) {
    const ws = workbook.getWorksheet('PART X');
    if (!ws) return;
    const box = readIndicateIfBox(readCellText(ws.getCell('K23')));
    if ('wardStatus' in box) draft.certWardStatus = box.wardStatus;
    if (box.method) draft.certIndicator = box.method;
  },
  targets: () => [{ sheet: 'PART X', cell: 'K23', path: 'certWardStatus', kind: 'list' }],
});

export const ANNUAL_CONTRACT = Object.freeze({
  form: 'annual',
  template: 'annual',
  entries: Object.freeze([
    // PART I -- the cover.
    field('wardName', 'PART I', 'C5', text),
    field('caseNumber', 'PART I', 'I5', text),
    field('gid', 'PART I', 'F5', date),
    field('periodFrom', 'PART I', 'E18', date),
    field('periodTo', 'PART I', 'H18', date),
    field('guardian', 'PART I', 'D20', text),
    field('attorney', 'PART I', 'D21', text),
    field('typeOfGuardianship', 'PART I', 'D22', text),
    field('amendedForm', 'PART I', 'J6', list),
    // The filing type: the open filing's own (ctx.filingTypeValue); a
    // workbook with none reads as an Annual.
    field('filingType', 'PART I', 'H4', list, {
      value: (f, ctx) => ctx.filingTypeValue || f.filingType, readAs: (v) => v || 'Annual',
      defect: { row: 4, part: 3, note: 'a Trust or Final filled from the blank workbook reads as an Annual; "Amended " is not recognised' },
    }),
    field('relatedCaseNumbers', 'PART I', 'I13', text),
    // A blank county leaves the form's own "Select County" prompt.
    field('county', 'PART I', 'H2', countyBox, { exportIf: (f) => !!String(f.county || '').trim(), fallback: [{ cell: 'D23', codec: text }] }),

    // PART II, III -- up to three guardians. Guardian #1's name box F25 is the
    // form's link to Part I's guardian, written over by decision (2026-09-19).
    {
      kind: 'slots', path: 'guardians', sheet: 'PART II, III', slots: guardianSlots,
      fields: Object.fromEntries(Object.keys(GUARDIAN_FIELDS).map((k) => [k, {
        codec: k === 'signatureDate' ? date : text,
        formula: k === 'name' ? (i) => (i === 0 ? 'Guardian #1 name over the Part I link (2026-09-19)' : undefined) : undefined,
      }])),
      // Milestone 74B: a co-guardian's slot is filled by rowStarted() (a stamp counts).
      exportIf: (row, i) => i === 0 || rowStarted(row || {}),
      keep: (row, i) => i === 0 || rowStarted(row),
    },

    // PART IV -- the outside preparer, filed only while no guardian or the
    // attorney is identified as the preparer (Milestone 67A).
    ...[['preparer.name', 'J15', text], ['preparer.signatureDate', 'H15', date], ['preparer.ssn', 'B17', text],
      ['preparer.phone', 'B19', text], ['preparer.street', 'J17', text], ['preparer.cityStateZip', 'J19', text]]
      .map(([path, cell, codec]) => field(path, 'PART IV, V', cell, codec, {
        exportIf: (f) => !hasIdentifiedPreparer(f),
        defect: { row: 9, part: 3, note: 'a hidden outside-preparer block is erased by import while a guardian or the attorney is the preparer' },
      })),
    // PART V -- the attorney (the name is Part I's D21).
    field('attorney_signatureDate', 'PART IV, V', 'H31', date),
    field('attorney_bar', 'PART IV, V', 'B33', text),
    field('attorney_phone', 'PART IV, V', 'B35', text),
    field('attorney_street', 'PART IV, V', 'J33', text),
    field('attorney_cityStateZip', 'PART IV, V', 'J35', text),

    // PART VI, VII -- the starting balance; every other box is the form's own formula.
    field('startingBalance', 'PART VI, VII ', 'I8', amount, { defect: { row: 13, part: 3, note: 'a blank is written as 0' } }),

    // Schedules A to F. Amounts are written as numbers, a blank as 0 (73T row 13).
    {
      kind: 'rows', path: 'schA', pages: [{ sheet: 'SCH A INCOME p1', rows: run(21, 1, 20) }, { sheet: 'SCH A INCOME p2', rows: run(8, 1, 30) }],
      present: present('payer', 'description', 'amount'),
      columns: [col('payer', 'C', text), col('description', 'E', text), col('bank', 'F', text), col('accountNo', 'G', text), col('amount', 'H', amount)],
    },
    ...['schB1', 'schB2'].map((path) => ({
      kind: 'rows', path, alwaysRead: true, pages: [{ sheet: path === 'schB1' ? 'SCH B-1 ATTORNEY FEES' : 'SCH B-2 GUARDIAN FEES', rows: run(10, 1, 24) }],
      // The importer's "has data" test reads the Date Paid column as the amount.
      present: (r, { sheet, row }) => hasData(r.bankAcct, r.checkNo, r.payee, amount.read(sheet.getCell(`H${row}`))),
      presentDefect: { row: 7, part: 3, note: 'a row with only an amount is dropped' },
      columns: [col('bankAcct', 'C', text), col('checkNo', 'E', text), col('periodFrom', 'F', date), col('periodTo', 'G', date), col('datePaid', 'H', date),
        col('payee', 'I', text), col('courtOrderDate', 'J', date), col('amount', 'K', amount)],
    })),
    {
      kind: 'rows', path: 'schB3', alwaysRead: true, pages: [{ sheet: 'SCH B-3 OTHER CO DISB', rows: run(10, 1, 24) }],
      present: present('bankAcct', 'checkNo', 'payee', 'amount'),
      columns: [col('bankAcct', 'C', text), col('checkNo', 'E', text), col('datePaid', 'F', date), col('payee', 'G', text), col('courtOrderDate', 'H', date), col('amount', 'I', amount)],
    },
    scheduleB4,
    {
      kind: 'rows', path: 'schC', alwaysRead: true, pages: [{ sheet: 'SCH C CAPITAL ADJ p1', rows: run(31, 4, 6) }],
      present: present('description', 'gain', 'loss'),
      columns: [col('description', 'C', text), col('date', 'E', date), col('gain', 'F', amount), col('loss', 'G', amount)],
    },
    {
      kind: 'rows', path: 'schD1', alwaysRead: true, pages: [{ sheet: 'SCH D-1 CASH p1', rows: run(25, 3, 11) }],
      present: present('description', 'fullAmount'), finish: blankKeys('restrictedAmt'),
      columns: [col('description', 'C', text), col('accountNo', 'E', text), col('restricted', 'F', list), col('type', 'G', text), col('fullAmount', 'H', amount), col('wardPct', 'I', share)],
    },
    {
      kind: 'rows', path: 'schD2', alwaysRead: true, pages: [{ sheet: 'SCH D-2 REAL ESTATE p1', rows: run(20, 4, 8) }],
      present: present('description', 'fullValue'), finish: blankKeys('wardValue'),
      columns: [col('description', 'C', text), col('residence', 'E', list), col('income', 'F', list), col('fullValue', 'G', amount), col('wardPct', 'H', share), col('carryingValue', 'I', amount)],
    },
    {
      kind: 'rows', path: 'schD3', alwaysRead: true, pages: [{ sheet: 'SCH D-3 PERSONAL PROP p1', rows: run(31, 4, 4) }],
      present: present('description', 'fullAmount'), finish: blankKeys('wardAmount'),
      columns: [col('description', 'C', text), col('fullAmount', 'F', amount), col('wardPct', 'G', share), col('carryingValue', 'H', amount)],
    },
    {
      kind: 'rows', path: 'schD4', alwaysRead: true, pages: [{ sheet: 'SCH D-4 INTANGIBLE p1 ', rows: run(18, 4, 9) }],
      present: present('description', 'fullAmount'), finish: blankKeys('wardValue', 'restrictedAmt'),
      columns: [col('description', 'C', text), col('restricted', 'F', list), col('fullAmount', 'G', amount), col('wardPct', 'H', share), col('carryingValue', 'I', amount)],
    },
    {
      kind: 'rows', path: 'schD5', alwaysRead: true, pages: [{ sheet: 'SCH D-5 MORTGAGES p1', rows: run(23, 4, 7) }],
      present: present('description', 'fullDebt'), finish: blankKeys('wardBalance'),
      columns: [col('description', 'C', text), col('loanNo', 'E', text), col('loanType', 'F', text), col('fullDebt', 'G', amount), col('wardPct', 'H', share)],
    },
    {
      kind: 'rows', path: 'schE', alwaysRead: true, pages: [{ sheet: 'SCH E BANK TRANS p1', rows: run(14, 1, 27) }],
      present: present('bankName', 'transferInAmt', 'transferOutAmt'),
      columns: [col('bankName', 'C', text), col('transferInDate', 'E', date), col('transferInAmt', 'F', amount), col('transferOutDate', 'G', date), col('transferOutAmt', 'H', amount)],
    },
    ...[['schF1', 'SCH F-1 SALES REAL PROP p1', run(19, 5, 8)], ['schF2', 'SCH F-2 SALES PERSONAL PROP p1', run(17, 4, 11)]].map(([path, sheet, rows]) => ({
      kind: 'rows', path, alwaysRead: true, pages: [{ sheet, rows }],
      present: present('description', 'salePrice'),
      columns: [col('description', 'C', text), col('bank', 'F', text), col('accountNo', 'G', text), col('courtOrderDate', 'H', date), col('salePrice', 'I', amount)],
    })),

    // PART VIII -- trusts. "Any trust?" is one answer, written from the first
    // trust and read into all three.
    field('trusts.0.hasTrust', 'PART VIII', 'D8', list, { dir: 'export', defect: PART_VIII_BOX('H8') }),
    {
      kind: 'slots', path: 'trusts', sheet: 'PART VIII', slots: trustSlots,
      fields: {
        hasTrust: { codec: list, dir: 'import' },
        createdAfterGID: { codec: list }, name: { codec: text }, trustee: { codec: text }, accountNo: { codec: text },
        dateCreated: { codec: date }, trustType: { codec: text },
        wardPct: { codec: trustShare, defect: PART_VIII_BOX('H17, H27, H37') },
        wardAmount: { codec: trustAmount, defect: PART_VIII_BOX('H18, H28, H38') },
      },
      exportIf: (row) => row != null,
    },

    // PART IX -- the bond. The Bond Period boxes E21/G21 are the form's own
    // =From_Date/=To_Date (Milestone 67D), never written; the import takes
    // the bond period from the accounting period (afterRead).
    field('guardianRelationship', 'PART IX ', 'G8', text, { keepIfBlank: true }),
    field('restrictedDepositoryReceiptDate', 'PART IX ', 'G9', date),
    field('bondAmount', 'PART IX ', 'H20', bondAmount, { defect: { row: 16, part: 3, note: 'bond fields hidden by the chosen arrangement are written' } }),
    field('bondingCompany', 'PART IX ', 'D22', text),

    // PART X -- the certificate of service: exactly four recipients.
    {
      kind: 'slots', path: 'certRecipients', sheet: 'PART X', slots: RECIPIENT_SLOTS,
      fields: { name: { codec: text }, line2: { codec: text }, line3: { codec: text }, line4: { codec: text } },
      defect: { row: 8, part: 3, note: 'recipients after the fourth are not exported, with no warning' },
    },
    field('certDate', 'PART X', 'G23', date),
    indicateIf,
    field('certAttySignDate', 'PART X', 'G25', date),
    // PART XI -- remuneration is not written; Save as Excel stops while there
    // is any (Milestone 58D, until 73T part 3 writes it one entry per line).
  ]),

  notCarried: Object.freeze([
    'the signature choices and stamps, and which guardian served the copies',
    'which guardian or the attorney prepared this filing',
    "the attorney's email addresses and county, and why there is no attorney",
    'the bond and restricted-depository arrangement, and the date of the order waiving bond',
    'the method of service (printed on the PDF only)',
    '"no one requires service"',
    'the explanation of a difference between Lines 20 and 30',
    "Part XI's remuneration entries",
    'the UCN',
  ]),
  preserve: Object.freeze({
    guardian: ['signatureState', 'signatureImage', 'certifiesService', 'isPreparer'],
    attorney: ['attorney_email', 'attorney_secondaryEmail', 'attorney_county', 'attorney_signatureState', 'attorney_signatureImage', 'attorney_isPreparer'],
    preparer: ['preparer.signatureState', 'preparer.signatureImage'],
  }),

  afterRead(draft, workbook) {
    if (draft.guardians) {
      for (const g of draft.guardians) g.signatureDateLabel = '';
      if (!draft.guardians.length) draft.guardians.push({ name: '', ssn: '', phone: '', email: '', mailingStreet: '', mailingCityStateZip: '', officeStreet: '', officeCityStateZip: '', signatureDate: '', signatureDateLabel: '' });
    }
    // Milestone 67A: a workbook naming an outside preparer clears the
    // guardians' and the attorney's "prepared this filing"; one naming none
    // leaves them as the filing has them.
    if (draft.preparer && String(draft.preparer.name || '').trim()) {
      for (const g of draft.guardians || []) g.isPreparer = false;
      draft.attorney_isPreparer = false;
    }
    if (workbook.getWorksheet('PART IX ')) {
      draft.bondPeriodFrom = draft.periodFrom || '';
      draft.bondPeriodTo = draft.periodTo || '';
    }
  },
});
