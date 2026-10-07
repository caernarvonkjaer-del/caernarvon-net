// Milestone 73T part 1: the Annual, Final and Trust Accounting's workbook
// contract (templates/annual-template.js) -- every field written to the
// Clerk's workbook and read back. Since 73T part 3 the Annual family's
// exporter and importer (src/features/annual-accounting/excel.js) run on it,
// and the import goes through 73E's transaction.
import { codecs } from './codecs.js';
import { writeCell } from './engine.js';
import { remunerationEntered, remunerationLine, splitRemuneration } from './remuneration-line.js';
import { sameName } from '../import-keep.js';
import { readCellText, unwrapCellValue } from '../cell-reader.js';
import { amountForStore } from '../../form/amount-codec.js';
import { numValue, percentValue } from '../excel-engine.js';
import { shareFromWorkbookCell } from '../share-cell.js';
import { hasIdentifiedPreparer } from '../../form/preparer-flag.js';
import { bondAmountCellValue, bondAmountFromCell, inferBondDepositoryState, revealsBond, revealsDepository } from '../../filing/bond-depository.js';
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

// Milestone 73T part 2's rule (row 16), on Part IX: the bond block shows what
// the chosen arrangement shows, as the PDF does -- the receipt date for a
// restricted depository, the bond amount and company for a bond or no answer.
// The filing keeps a hidden value; a blank box on import leaves it alone.
const showsBond = (f) => { const state = inferBondDepositoryState(f); return revealsBond(state) || !state; };
const showsDepository = (f) => revealsDepository(inferBondDepositoryState(f));

// PART I's county box is the form's "Select County" dropdown; a workbook
// exported before Milestone 72A left that prompt and put the county in D23.
const countyBox = Object.freeze({
  kind: 'text',
  write: (v) => text.write(v),
  read: (cell) => { const t = readCellText(cell); return t.trim().toLowerCase() === 'select county' ? '' : t; },
});

// Part VIII's share and amount as a workbook exported before 73T part 3 wrote
// them -- in the locked D cells beside the Clerk's boxes, under the share and
// money formats Milestone 72B gave them; before 72B under the template's date
// format, so ExcelJS hands the number back as a date (read back as the number
// it was). Read only, as the fallback for an empty H box.
const asNumberWritten = (v) => (v instanceof Date ? Math.round((v.getTime() / 86400000 + 25569) * 1e6) / 1e6 : v);
const legacyTrustShare = Object.freeze({
  kind: 'share',
  write: (v) => ({ value: percentValue(v) }),
  read: (cell) => {
    const v = asNumberWritten(unwrapCellValue(cell.value));
    if (v == null || v === '') return '';
    if (typeof v === 'number') return String(cell.numFmt || '').includes('%') ? shareFromWorkbookCell(v) : v;
    const n = parseFloat(String(v).replace(/%$/, ''));
    return Number.isFinite(n) ? n : String(v);
  },
});
const legacyTrustAmount = Object.freeze({
  kind: 'amount',
  write: (v) => ({ value: v === '' || v == null ? '' : numValue(v) }),
  read: (cell) => amountForStore(asNumberWritten(unwrapCellValue(cell.value))),
});

const bondAmount = Object.freeze({
  kind: 'amount',
  write: (v) => ({ value: bondAmountCellValue(v) }),
  read: (cell) => bondAmountFromCell(amount.read(cell)),
});

/** The draft key PART I's filing-type box is read into: never a filing field (index.js removes it). */
export const WORKBOOK_FILING_TYPE = '__workbookFilingType';

// PART II, III: three guardian blocks ten rows apart.
const GUARDIAN_FIELDS = Object.freeze({
  signatureDate: [0, 'D'], name: [0, 'F'], ssn: [2, 'B'], mailingStreet: [2, 'F'], phone: [4, 'B'],
  mailingCityStateZip: [4, 'F'], email: [6, 'B'], officeStreet: [6, 'F'], officeCityStateZip: [8, 'F'],
});
const guardianSlots = [25, 35, 45].map((r) => Object.fromEntries(Object.entries(GUARDIAN_FIELDS).map(([k, [dr, c]]) => [k, `${c}${r + dr}`])));

// PART VIII: the one "any trust?" answer, then three trust blocks.
// Milestone 73T part 3 (row 3): the answer is the Clerk's H8 (with its Yes/No
// list) and each trust's share and amount the H boxes beside their captions
// (H17/H18, H27/H28, H37/H38), unlocked on the protected sheet. They used to go
// to the locked D cells beside them, so a workbook filled in by hand imported
// with all three lost; a workbook exported before part 3 is read from there.
const TRUST_ROWS = [[10, 12, 13, 14, 15, 16, 17, 18], [20, 22, 23, 24, 25, 26, 27, 28], [30, 32, 33, 34, 35, 36, 37, 38]];
const trustSlots = TRUST_ROWS.map(([gid, name, trustee, acct, created, type, pct, amt]) => ({
  hasTrust: 'H8', createdAfterGID: `H${gid}`, name: `D${name}`, trustee: `D${trustee}`, accountNo: `D${acct}`,
  dateCreated: `D${created}`, trustType: `D${type}`, wardPct: `H${pct}`, wardAmount: `H${amt}`,
}));
const OLD_TRUST_CELL = { wardPct: 6, wardAmount: 7 };
const oldTrustCell = (key, codec) => (i) => [{ cell: `D${TRUST_ROWS[i][OLD_TRUST_CELL[key]]}`, codec }];

// PART X: four recipient blocks. Milestone 73T part 3 (row 8): more than four
// stops Save as Excel, as any schedule over the workbook's room does
// (excel-caps.js); the import brings back the recipients the workbook lists.
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
    // The filing type: the open filing's own (ctx.filingTypeValue). Milestone
    // 73T part 3 (row 4): the filing keeps its type on import (decision
    // 73E-N2); the box is read only to say what the workbook is marked
    // (index.js), and "Amended " -- the Clerk's own option -- is an amended
    // filing of the filing's own type (Pinellas Clerk practice, 2026-10-07).
    field('filingType', 'PART I', 'H4', list, { dir: 'export', value: (f, ctx) => ctx.filingTypeValue || f.filingType }),
    field(WORKBOOK_FILING_TYPE, 'PART I', 'H4', list, { dir: 'import' }),
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
      // Milestone 74B: a co-guardian's slot is filled by rowStarted() (a stamp
      // counts) -- so a slot the workbook shows blank still holds the filing's
      // co-guardian when that person's row is started (their stamp).
      exportIf: (row, i) => i === 0 || rowStarted(row || {}),
      keep: (row, i, ctx) => {
        if (i === 0 || rowStarted(row)) return true;
        const had = ctx?.filing?.guardians?.[i];
        return !!had && rowStarted(had) && sameName(had.name, row.name);
      },
    },

    // PART IV -- the outside preparer, filed only while no guardian or the
    // attorney is identified as the preparer (Milestone 67A).
    // A block left blank keeps the filing's preparer (afterRead; row 9).
    ...[['preparer.name', 'J15', text], ['preparer.signatureDate', 'H15', date], ['preparer.ssn', 'B17', text],
      ['preparer.phone', 'B19', text], ['preparer.street', 'J17', text], ['preparer.cityStateZip', 'J19', text]]
      .map(([path, cell, codec]) => field(path, 'PART IV, V', cell, codec, { exportIf: (f) => !hasIdentifiedPreparer(f) })),
    // PART V -- the attorney (the name is Part I's D21).
    field('attorney_signatureDate', 'PART IV, V', 'H31', date),
    field('attorney_bar', 'PART IV, V', 'B33', text),
    field('attorney_phone', 'PART IV, V', 'B35', text),
    field('attorney_street', 'PART IV, V', 'J33', text),
    field('attorney_cityStateZip', 'PART IV, V', 'J35', text),

    // PART VI, VII -- the starting balance; every other box is the form's own
    // formula. Milestone 73T part 3 (row 13): a blank amount, here and on every
    // schedule, is written blank, not as 0 -- the form's totals count it as 0
    // either way, and a re-import no longer turns it into an entered $0.00.
    field('startingBalance', 'PART VI, VII ', 'I8', amount),

    // Schedules A to F.
    {
      kind: 'rows', path: 'schA', pages: [{ sheet: 'SCH A INCOME p1', rows: run(21, 1, 20) }, { sheet: 'SCH A INCOME p2', rows: run(8, 1, 30) }],
      present: present('payer', 'description', 'amount'),
      columns: [col('payer', 'C', text), col('description', 'E', text), col('bank', 'F', text), col('accountNo', 'G', text), col('amount', 'H', amount)],
    },
    ...['schB1', 'schB2'].map((path) => ({
      kind: 'rows', path, alwaysRead: true, pages: [{ sheet: path === 'schB1' ? 'SCH B-1 ATTORNEY FEES' : 'SCH B-2 GUARDIAN FEES', rows: run(10, 1, 24) }],
      // Milestone 73T part 3 (row 7): a row is kept by its amount too -- the
      // test used to read the Date Paid column as the amount, so a row holding
      // only an amount was dropped.
      present: present('bankAcct', 'checkNo', 'payee', 'amount'),
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
    field('trusts.0.hasTrust', 'PART VIII', 'H8', list, { dir: 'export' }),
    {
      kind: 'slots', path: 'trusts', sheet: 'PART VIII', slots: trustSlots,
      fields: {
        hasTrust: { codec: list, dir: 'import', fallback: () => [{ cell: 'D8' }] },
        createdAfterGID: { codec: list }, name: { codec: text }, trustee: { codec: text }, accountNo: { codec: text },
        dateCreated: { codec: date }, trustType: { codec: text },
        wardPct: { codec: share, fallback: oldTrustCell('wardPct', legacyTrustShare) },
        wardAmount: { codec: amount, fallback: oldTrustCell('wardAmount', legacyTrustAmount) },
      },
      exportIf: (row) => row != null,
    },

    // PART IX -- the bond. The Bond Period boxes E21/G21 are the form's own
    // =From_Date/=To_Date (Milestone 67D), never written; the import takes
    // the bond period from the accounting period (afterRead).
    field('guardianRelationship', 'PART IX ', 'G8', text, { keepIfBlank: true }),
    field('restrictedDepositoryReceiptDate', 'PART IX ', 'G9', date, { exportIf: showsDepository, keepIfBlank: true }),
    field('bondAmount', 'PART IX ', 'H20', bondAmount, { exportIf: showsBond, keepIfBlank: true }),
    field('bondingCompany', 'PART IX ', 'D22', text, { exportIf: showsBond, keepIfBlank: true }),

    // PART X -- the certificate of service: up to four recipients.
    {
      kind: 'slots', path: 'certRecipients', sheet: 'PART X', slots: RECIPIENT_SLOTS,
      fields: { name: { codec: text }, line2: { codec: text }, line3: { codec: text }, line4: { codec: text } },
      exportFilter: (r) => rowStarted(r),
      keep: (row) => rowStarted(row),
    },
    field('certDate', 'PART X', 'G23', date),
    indicateIf,
    field('certAttySignDate', 'PART X', 'G25', date),

    // PART XI -- remuneration, one entry per line on A6:A32 (73T-2), as the
    // Simplified does on its PART VII. A workbook with no line (every one
    // exported before part 3) says nothing, so the filing keeps its entries.
    {
      kind: 'rows', path: 'remuneration', pages: [{ sheet: 'PART XI', rows: run(6, 1, 27) }],
      exportFilter: remunerationEntered, keepIfNone: true,
      columns: [],
      combined: [{ col: 'A', fields: ['guardian', 'type', 'amount', 'description'], codec: text, join: remunerationLine, split: splitRemuneration }],
      present: (r) => !!r.__line,
      finish: ({ __line, ...r }) => r,
    },
  ]),

  notCarried: Object.freeze([
    'which guardian or the attorney prepared this filing',
    "the attorney's email addresses and county, and why there is no attorney",
    'the bond and restricted-depository arrangement, any bond detail it hides, and the date of the order waiving bond',
    'the outside preparer, when the workbook leaves that block blank',
    "Part XI's entries, when the workbook has none",
    'the method of service (printed on the PDF only)',
    '"no one requires service"',
    'the explanation of a difference between Lines 20 and 30',
    'the UCN',
  ]),
  // What the workbook holds differently, so an import brings it back changed.
  importedAs: Object.freeze([
    'the bond period comes back as the accounting period (the form fills it from there)',
  ]),
  preserve: Object.freeze({
    guardian: ['signatureState', 'signatureImage', 'certifiesService', 'isPreparer'],
    attorney: ['attorney_email', 'attorney_secondaryEmail', 'attorney_county', 'attorney_signatureState', 'attorney_signatureImage', 'attorney_isPreparer'],
    preparer: ['preparer.signatureState', 'preparer.signatureImage'],
  }),
  // Milestone 73T part 3: what typing formats, field by field -- the fields
  // the Annual's pages label as a name, an address or a city/state/ZIP
  // (form-fields.js's inferFieldKind(), as the page renders them). An import
  // formats these and only these; a signature choice, typed "as entered" text
  // and every other value come back as the workbook holds them (rows 2 and 19).
  // tests/unit/workbook-contract.spec.js checks the table against the pages.
  casing: Object.freeze({
    name: ['wardName', 'guardian', 'attorney', 'relatedCaseNumbers', 'bondingCompany', 'guardians.*.name', 'preparer.name',
      'certRecipients.*.name', 'remuneration.*.guardian', 'schA.*.payer', 'schA.*.bank', 'schB1.*.payee', 'schB2.*.payee',
      'schB3.*.payee', 'schB4.*.payee', 'schB4Accounts.*.bankName', 'schD5.*.description', 'trusts.*.name', 'trusts.*.trustee',
      'trusts.*.trustType'],
    address: ['attorney_street', 'guardians.*.mailingStreet', 'guardians.*.officeStreet', 'preparer.street', 'schD2.*.description',
      'schF1.*.description'],
    zip: ['attorney_cityStateZip', 'guardians.*.mailingCityStateZip', 'guardians.*.officeCityStateZip', 'preparer.cityStateZip'],
  }),

  afterRead(draft, workbook) {
    if (draft.guardians) {
      for (const g of draft.guardians) g.signatureDateLabel = '';
      if (!draft.guardians.length) draft.guardians.push({ name: '', ssn: '', phone: '', email: '', mailingStreet: '', mailingCityStateZip: '', officeStreet: '', officeCityStateZip: '', signatureDate: '', signatureDateLabel: '' });
    }
    // Milestone 73T part 3 (row 9): an outside-preparer block left blank says
    // nothing -- the export leaves it blank while a guardian or the attorney
    // is the preparer -- so the filing keeps its preparer. One that names a
    // preparer clears the guardians' and the attorney's "prepared this
    // filing" (Milestone 67A); each keeps it otherwise, as the same person.
    if (draft.preparer) {
      if (!Object.values(draft.preparer).some((v) => v != null && String(v).trim() !== '')) delete draft.preparer;
      else if (String(draft.preparer.name || '').trim()) {
        for (const g of draft.guardians || []) g.isPreparer = false;
        draft.attorney_isPreparer = false;
      }
    }
    if (draft.certRecipients && !draft.certRecipients.length) draft.certRecipients = [{ name: '', line2: '', line3: '', line4: '' }];
    // "Amended " in the filing-type box: an amended filing of this filing's type.
    if (/^amended$/i.test(String(draft[WORKBOOK_FILING_TYPE] || '').trim())) draft.amendedForm = 'Yes';
    if (workbook.getWorksheet('PART IX ')) {
      draft.bondPeriodFrom = draft.periodFrom || '';
      draft.bondPeriodTo = draft.periodTo || '';
    }
  },
});
