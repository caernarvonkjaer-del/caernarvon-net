// Milestone 73T part 1: the Simplified Accounting's workbook contract
// (templates/simplified-template.js) -- every field the Simplified's exporter
// writes and its importer reads, as src/features/simplified-accounting/
// excel.js does today. 73T part 4 moves that exporter and importer onto this
// contract and fixes the entries marked `defect`.
import { codecs } from './codecs.js';
import { writeCell } from './engine.js';
import { readCellText } from '../cell-reader.js';
import { amountForStore, parseAmount } from '../../form/amount-codec.js';
import { formatMoney } from '../../format/money.js';
import { compareImportedCertificate, readIndicateIfBox } from '../../filing/certificate-migrations.js';
import { rowStarted } from '../../validation/row-started.js';

const { text, dateText: date, amountNumberText: amount, listText: list } = codecs;
const P12 = 'PARTS I, II ';
const P34 = 'PARTS III, IV';
const P56 = 'PARTS V, VI ';
const field = (path, sheet, cell, codec, more = {}) => ({ kind: 'field', path, sheet, cell, codec, ...more });

// PARTS III, IV: three guardian blocks ten rows apart. Guardian #1's name box
// F15 is the form's own link to Part I's guardian (D16), never written.
const GUARDIAN_FIELDS = Object.freeze({
  signatureDate: [0, 'D'], name: [0, 'F'], ssn: [2, 'B'], mailingStreet: [2, 'F'], phone: [4, 'B'],
  mailingCityStateZip: [4, 'F'], email: [6, 'B'], residenceStreet: [6, 'F'], residenceCityStateZip: [8, 'F'],
});
const guardianSlots = [15, 25, 35].map((r) => Object.fromEntries(Object.entries(GUARDIAN_FIELDS).map(([k, [dr, c]]) => [k, `${c}${r + dr}`])));

// PART VI: four recipient blocks of three lines. The right-hand boxes are the
// merges I27:L27, I28:L28 ...; I is each box's own cell (Milestone 72A).
const RECIPIENT_SLOTS = [['B', 27], ['I', 27], ['B', 33], ['I', 33]].map(([c, r]) => ({ name: `${c}${r}`, line2: `${c}${r + 1}`, line3: `${c}${r + 2}` }));

// PART VII: one free-text line per remuneration entry, "guardian — type —
// $amount — description", empty segments left out. The importer tells the
// layouts apart by segment count and whether the third looks like an amount
// (files exported before the amount was included carry the description there).
const SEP = '  —  ';
const remunerationLine = (r) => {
  const amt = r.amount === '' || r.amount == null ? '' : `$${formatMoney(r.amount, { grouping: false })}`;
  const parts = [r.guardian || '', r.type || ''];
  if (amt) parts.push(amt);
  if (r.description) parts.push(r.description);
  return parts.join(SEP);
};
const looksLikeAmount = (s) => { const r = parseAmount(String(s || '')); return 'value' in r && !('blank' in r); };
const splitRemuneration = (val) => {
  if (!val) return { __line: '' };
  const parts = val.split(SEP);
  let amt = '', description = '';
  if (parts.length >= 4) {
    if (looksLikeAmount(parts[2])) amt = amountForStore(String(parts[2]));
    description = parts[3] || '';
  } else if (parts.length === 3) {
    if (looksLikeAmount(parts[2])) amt = amountForStore(String(parts[2]));
    else description = parts[2];
  }
  return { __line: val, guardian: parts[0] || '', type: parts[1] || '', amount: amt, description };
};

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
    // Part II's five inputs; the form's own SUMs add them. A blank is written
    // as 0 -- 73T row 13, extended to the Simplified for part 4 by the
    // requester (2026-10-07).
    ...[['startingBalance', 'H19'], ['interestIncome', 'G22'], ['depositsSettlement', 'G23'], ['serviceCharges', 'G27'], ['federalIncomeTax', 'G28']]
      .map(([path, cell]) => field(path, P12, cell, amount, { defect: { row: 13, part: 4, note: 'a blank is written as 0' } })),

    // PARTS III, IV -- three guardian slots, every one read back.
    {
      kind: 'slots', path: 'guardians', sheet: P34, slots: guardianSlots,
      fields: Object.fromEntries(Object.keys(GUARDIAN_FIELDS).map((k) => [k, k === 'name'
        ? { codec: text, dir: (i) => (i === 0 ? 'import' : 'both'),
          defect: (i) => (i === 0 ? { row: 1, part: 4, note: "re-importing the app's own workbook blanks Guardian #1's name (F15 has no value until Excel calculates it)" } : undefined) }
        : { codec: k === 'signatureDate' ? date : text }])),
      // Milestone 74B: a co-guardian's slot is filled by rowStarted() (a stamp counts).
      exportIf: (row, i) => i === 0 || rowStarted(row || {}),
    },

    // PARTS V, VI -- the attorney (the name is Part I's D15; the '/s/' marks
    // and the period are the form's own).
    field('attorney_barNumber', P56, 'B19', text),
    field('attorney_phone', P56, 'B21', text),
    field('attorney_street', P56, 'J19', text),
    field('attorney_cityStateZip', P56, 'J21', text),
    // The certificate.
    field('certServiceDate', P56, 'H39', date),
    indicateIf,
    {
      kind: 'slots', path: 'certRecipients', sheet: P56, slots: RECIPIENT_SLOTS,
      fields: { name: { codec: text }, line2: { codec: text }, line3: { codec: text } },
      defect: { row: 8, part: 4, note: 'recipients after the fourth are not exported, with no warning; written even when "no recipients are required" (row 14)' },
    },
    // One attorney date box, H41: the certificate's date, else Part V's; read into both.
    field('certAttySignDate', P56, 'H41', date, {
      value: (f) => f.certAttySignDate || f.attorney_signatureDate,
      defect: { row: 10, part: 4, note: "Part V's own date box H17 is never written" },
    }),
    field('attorney_signatureDate', P56, 'H41', date, { dir: 'import', defect: { row: 10, part: 4, note: 'read from the certificate\'s box' } }),
    ...CERT_ATTORNEY.map(([, attorneyKey, certKey, cell]) => field(certKey, P56, cell, text, {
      value: (f) => f[attorneyKey],
      defect: { row: 18, part: 4, note: 'import clears old certificate details never discarded' },
    })),

    // PART VII -- remuneration, one line per entry.
    {
      kind: 'rows', path: 'remuneration', pages: [{ sheet: 'PART VII', rows: Array.from({ length: 27 }, (_, i) => 6 + i) }],
      exportFilter: (r) => r.guardian || r.type || r.description || r.amount,
      columns: [],
      combined: [{ col: 'A', fields: ['guardian', 'type', 'amount', 'description'], codec: text, join: remunerationLine, split: splitRemuneration }],
      present: (r) => !!r.__line,
      finish: ({ __line, ...r }) => r,
    },
  ]),

  notCarried: Object.freeze([
    'the signature choices and stamps, and which guardian served the copies',
    "the guardians' and the attorney's email addresses, and why there is no attorney",
    'the method of service (printed on the PDF only)',
    '"no one requires service"',
    "each recipient's fourth line, and recipients after the fourth",
    'guardians after the third',
  ]),
  preserve: Object.freeze({
    guardian: ['signatureState', 'signatureImage', 'certifiesService'],
    attorney: ['attorney_email', 'attorney_secondaryEmail', 'attorney_signatureState', 'attorney_signatureImage'],
  }),

  afterRead(draft) {
    // Milestone 72H: a blank Part V box is filled from the certificate's; a
    // certificate detail that differs is kept as an old detail.
    if (CERT_ATTORNEY.some(([, a]) => a in draft)) {
      const cmp = compareImportedCertificate(
        Object.fromEntries(CERT_ATTORNEY.map(([k, a]) => [k, draft[a] || ''])),
        Object.fromEntries(CERT_ATTORNEY.map(([k, , c]) => [k, draft[c] || ''])));
      for (const [k, a, c] of CERT_ATTORNEY) { draft[a] = cmp.attorney[k]; draft[c] = cmp.old[k]; }
    }
  },
});
