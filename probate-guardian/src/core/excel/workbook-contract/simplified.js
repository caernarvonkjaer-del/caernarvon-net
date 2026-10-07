// Milestone 73T part 1: the Simplified Accounting's workbook contract
// (templates/simplified-template.js) -- every field written to the Clerk's
// workbook and read back. Since 73T part 4 the Simplified's exporter and
// importer (src/features/simplified-accounting/excel.js) run on it, and the
// import goes through 73E's transaction.
import { codecs } from './codecs.js';
import { writeCell } from './engine.js';
import { readCellText } from '../cell-reader.js';
import { remunerationEntered, remunerationLine, splitRemuneration } from './remuneration-line.js';
import { compareImportedCertificate, readIndicateIfBox } from '../../filing/certificate-migrations.js';
import { rowStarted } from '../../validation/row-started.js';
import { sameName } from '../import-keep.js';

// Dates: Milestone 73T part 4 -- read as the Inventory reads them (the
// requester's choice, 2026-10-07); they used to be the cell's text cut to ten
// characters, so a date typed into the Clerk's workbook as text stayed text.
const { text, dateOrBlankAny: date, amountNumberText: amount, listText: list } = codecs;
const P12 = 'PARTS I, II ';
const P34 = 'PARTS III, IV';
const P56 = 'PARTS V, VI ';
const field = (path, sheet, cell, codec, more = {}) => ({ kind: 'field', path, sheet, cell, codec, ...more });

// PARTS III, IV: three guardian blocks ten rows apart. Guardian #1's name box
// F15 is the form's own link to Part I's guardian (D16), never written.
// Milestone 73T part 4 (row 1): read from F15 when Excel has computed it,
// else from D16 -- a re-import of the app's own workbook used to blank the
// name (F15 holds no value until Excel calculates it), and with it the
// guardian's signature choice, stamp and "served the copies"; a filing that
// names its Guardian #1 keeps that name (fillBlankOnly).
const GUARDIAN_FIELDS = Object.freeze({
  signatureDate: [0, 'D'], name: [0, 'F'], ssn: [2, 'B'], mailingStreet: [2, 'F'], phone: [4, 'B'],
  mailingCityStateZip: [4, 'F'], email: [6, 'B'], residenceStreet: [6, 'F'], residenceCityStateZip: [8, 'F'],
});
const guardianSlots = [15, 25, 35].map((r) => Object.fromEntries(Object.entries(GUARDIAN_FIELDS).map(([k, [dr, c]]) => [k, `${c}${r + dr}`])));

// PART VI: four recipient blocks of three lines. The right-hand boxes are the
// merges I27:L27, I28:L28 ...; I is each box's own cell (Milestone 72A).
const RECIPIENT_SLOTS = [['B', 27], ['I', 27], ['B', 33], ['I', 33]].map(([c, r]) => ({ name: `${c}${r}`, line2: `${c}${r + 1}`, line3: `${c}${r + 2}` }));

// PART VII: one free-text line per remuneration entry (remuneration-line.js).

// The Indicate if box (Milestone 72G): the ward's status; a workbook exported
// before 72G holds the method there, read by what it holds.
const indicateIf = Object.freeze({
  kind: 'custom', path: 'certWardStatus',
  write(workbook, filing, io) { writeCell(workbook, io, P56, 'J39', list, filing.certWardStatus, filing); },
  read(workbook, draft) {
    const ws = workbook.getWorksheet(P56);
    if (!ws) return;
    const box = readIndicateIfBox(readCellText(ws.getCell('J39')));
    if ('wardStatus' in box) draft.certWardStatus = box.wardStatus;
    if (box.method) draft.certIndicator = box.method;
  },
  targets: () => [{ sheet: P56, cell: 'J39', path: 'certWardStatus', kind: 'list' }],
});

// The certificate's attorney (Milestone 72H) is Part V's: its boxes repeat
// B19/B21/J19/J21, and an older workbook's differing details are compared on
// import (afterRead).
const CERT_ATTORNEY = Object.freeze([['bar', 'attorney_barNumber', 'certAttyBarNumber', 'B43'], ['phone', 'attorney_phone', 'certAttyPhone', 'B45'],
  ['street', 'attorney_street', 'certAttyStreet', 'J43'], ['csz', 'attorney_cityStateZip', 'certAttyCityStateZip', 'J45']]);

export const SIMPLIFIED_CONTRACT = Object.freeze({
  form: 'simplified',
  template: 'simplified',
  entries: Object.freeze([
    // PARTS I, II -- the cover. D12 (=C4) and D14 (=H4) are the form's own.
    field('wardName', P12, 'C4', text),
    field('caseNumber', P12, 'H4', text),
    field('periodFrom', P12, 'E13', date),
    field('periodTo', P12, 'H13', date),
    field('attorney', P12, 'D15', text),
    field('guardian', P12, 'D16', text),
    field('typeOfGuardianship', P12, 'D17', text),
    field('gid', P12, 'F4', date),
    field('county', P12, 'G2', text),
    field('amendedForm', P12, 'I5', list),
    // Part II's five inputs; the form's own SUMs add them. Milestone 73T part 4
    // (row 13, the requester's choice 2026-10-07): a blank is written blank,
    // not 0 -- the SUMs count it as 0 either way, and a re-import no longer
    // turns it into an entered $0.00.
    ...[['startingBalance', 'H19'], ['interestIncome', 'G22'], ['depositsSettlement', 'G23'], ['serviceCharges', 'G27'], ['federalIncomeTax', 'G28']]
      .map(([path, cell]) => field(path, P12, cell, amount)),

    // PARTS III, IV -- three guardian slots.
    {
      kind: 'slots', path: 'guardians', sheet: P34, slots: guardianSlots,
      fields: Object.fromEntries(Object.keys(GUARDIAN_FIELDS).map((k) => [k, k === 'name'
        ? { codec: text, dir: (i) => (i === 0 ? 'import' : 'both'), fallback: (i) => (i === 0 ? [{ sheet: P12, cell: 'D16' }] : []) }
        : { codec: k === 'signatureDate' ? date : text }])),
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

    // PARTS V, VI -- the attorney (the name is Part I's D15; the '/s/' marks
    // and the period are the form's own).
    field('attorney_barNumber', P56, 'B19', text),
    field('attorney_phone', P56, 'B21', text),
    field('attorney_street', P56, 'J19', text),
    field('attorney_cityStateZip', P56, 'J21', text),
    // Milestone 73T part 4 (row 10): Part V's own date box H17 gets the
    // attorney's date, and the certificate's H41 the certificate's, as the PDF
    // prints them. H41 used to carry the certificate's date or else Part V's,
    // with H17 never written, and an import copied H41 into both. A blank H17
    // -- every workbook exported before -- keeps the filing's date.
    field('attorney_signatureDate', P56, 'H17', date, { keepIfBlank: true }),
    // The certificate.
    field('certServiceDate', P56, 'H39', date),
    indicateIf,
    // Milestone 73T part 4: rows 8 and 14 -- the started recipients, in order,
    // at most four (more stops Save as Excel, excel-caps.js), and none while
    // "no recipients are required" is answered Yes, as the PDF prints none.
    {
      kind: 'slots', path: 'certRecipients', sheet: P56, slots: RECIPIENT_SLOTS,
      fields: { name: { codec: text }, line2: { codec: text }, line3: { codec: text } },
      exportFilter: (r) => rowStarted(r),
      exportIf: (row, i, f) => f.certNoRecipients !== 'Yes',
      keep: (row) => rowStarted(row),
    },
    field('certAttySignDate', P56, 'H41', date),
    // The certificate's attorney boxes repeat Part V's (Milestone 72H).
    ...CERT_ATTORNEY.map(([, attorneyKey, certKey, cell]) => field(certKey, P56, cell, text, { value: (f) => f[attorneyKey] })),

    // PART VII -- remuneration, one line per entry.
    {
      kind: 'rows', path: 'remuneration', pages: [{ sheet: 'PART VII', rows: Array.from({ length: 27 }, (_, i) => 6 + i) }],
      exportFilter: remunerationEntered,
      columns: [],
      combined: [{ col: 'A', fields: ['guardian', 'type', 'amount', 'description'], codec: text, join: remunerationLine, split: splitRemuneration }],
      present: (r) => !!r.__line,
      finish: ({ __line, ...r }) => r,
    },
  ]),

  notCarried: Object.freeze([
    "the guardians' and the attorney's email addresses, and why there is no attorney",
    "Guardian #1's name, when the filing has one (the form fills it from Part I)",
    'the method of service (printed on the PDF only)',
    '"No recipients are required" (a "Yes" goes back to unanswered when the workbook lists recipients)',
    "the attorney's Part V date, when the workbook leaves it blank",
    "old certificate details not yet discarded, unless the workbook's differ",
    'guardians after the third',
  ]),
  importedAs: Object.freeze([]),
  // Fields a filing keeps when it has them (73T part 4, row 1).
  fillBlankOnly: Object.freeze(['guardians.0.name']),
  preserve: Object.freeze({
    guardian: ['signatureState', 'signatureImage', 'certifiesService'],
    attorney: ['attorney_email', 'attorney_secondaryEmail', 'attorney_signatureState', 'attorney_signatureImage',
      'certAttySignatureState', 'certAttySignatureImage'],
  }),
  // Milestone 73T part 4: what typing formats, field by field -- the fields
  // the Simplified's pages give a name, address or city/state/ZIP box (their
  // labels' inferFieldKind(), or their own data-form-format). An import
  // formats these and only these (rows 2 and 19's rule); a signature choice
  // and every other value come back as the workbook holds them.
  // tests/unit/workbook-contract.spec.js checks the table against the pages.
  casing: Object.freeze({
    name: ['wardName', 'guardian', 'attorney', 'guardians.*.name', 'certRecipients.*.name', 'remuneration.*.guardian', 'remuneration.*.type'],
    address: ['attorney_street', 'guardians.*.mailingStreet', 'guardians.*.residenceStreet', 'certRecipients.*.line2', 'certRecipients.*.line3'],
    zip: ['attorney_cityStateZip', 'guardians.*.mailingCityStateZip', 'guardians.*.residenceCityStateZip'],
  }),

  // Against the filing the import goes into (workbook-contract/index.js).
  reconcile(draft, filing, report) {
    // Row 14: "no recipients are required" has no box, so the filing keeps
    // its answer -- except a "Yes" the workbook contradicts by listing
    // recipients, which goes back to unanswered.
    if (filing?.certNoRecipients === 'Yes' && (draft.certRecipients || []).some((r) => rowStarted(r))) draft.certNoRecipients = '';
    // The workbook holds three guardians; the filing's guardians after the
    // third stay where they are (they can't be exported, excel-caps.js).
    const extra = (filing?.guardians || []).slice(3);
    if (draft.guardians && extra.length) {
      const kept = report?.rowSources?.guardians || draft.guardians.map((_, i) => i);
      draft.guardians.push(...JSON.parse(JSON.stringify(extra)));
      if (report) report.rowSources = { ...(report.rowSources || {}), guardians: [...kept, ...extra.map((_, i) => 3 + i)] };
    }
  },

  afterRead(draft) {
    // Milestone 72H: a blank Part V box is filled from the certificate's; a
    // certificate detail that differs is kept as an old detail. Milestone
    // 73T part 4 (row 18): a certificate detail that doesn't differ leaves the
    // filing's old details alone -- an import used to clear them, though the
    // filer never discarded them.
    if (CERT_ATTORNEY.some(([, a]) => a in draft)) {
      const cmp = compareImportedCertificate(
        Object.fromEntries(CERT_ATTORNEY.map(([k, a]) => [k, draft[a] || ''])),
        Object.fromEntries(CERT_ATTORNEY.map(([k, , c]) => [k, draft[c] || ''])));
      for (const [k, a, c] of CERT_ATTORNEY) {
        draft[a] = cmp.attorney[k];
        if (cmp.old[k]) draft[c] = cmp.old[k]; else delete draft[c];
      }
    }
    if (draft.certRecipients && !draft.certRecipients.length) draft.certRecipients = [{ name: '', line2: '', line3: '' }];
  },
});
