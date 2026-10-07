// Milestone 73T part 1: the Initial Inventory's workbook contract
// (templates/guardian-template.js) -- every field the Inventory's exporter
// writes and its importer reads, as src/features/guardian-inventory/excel.js
// does today. 73T part 2 moves that exporter and importer onto this contract
// and fixes the entries marked `defect`.
import { codecs } from './codecs.js';
import { readCellText, unwrapCellValue } from '../cell-reader.js';
import { hasIdentifiedPreparer } from '../../form/preparer-flag.js';
import { bondAmountFromCell } from '../../filing/bond-depository.js';
import { compareImportedCertificate } from '../../filing/certificate-migrations.js';
import { b2ItemDescription, mk } from '../../filing/models/guardian.js';
import {
  SCHEDULE_A1_PAGES, SCHEDULE_A2_PAGES, SCHEDULE_B1_PAGES, SCHEDULE_B2_PAGES,
  SCHEDULE_B3_PAGES, SCHEDULE_B4_PAGES, SCHEDULE_C1_PAGES, SCHEDULE_C2_PAGES,
  SCHEDULE_C3_PAGES, SCHEDULE_C4_PAGES, SCHEDULE_C5_PAGES,
  partIIIGuardianCells, isPrintedCaption,
} from '../guardian-inventory-pages.js';

const { text, date, amountRaw, share, yesNo } = codecs;
const SI = 'SUMMARY I ';
const pages = (list) => list.map((p) => ({ sheet: p.name, rows: p.rows }));
const field = (path, sheet, cell, codec, more = {}) => ({ kind: 'field', path, sheet, cell, codec, ...more });
const col = (field, c, codec, more = {}) => ({ field, col: c, codec, ...more });
const lineCol = (field, c, line, codec, more = {}) => ({ field, col: c, line, codec, ...more });
/** A legacy boolean alias read when the tri-state answer is blank (AGENTS.md section 4). */
const alias = (key, legacy) => (r) => (r[key] != null && r[key] !== '' ? r[key] : r[legacy]);
const withDefault = (key, fallback) => (r) => r[key] || fallback;
const present = (...keys) => (r) => keys.some((k) => !!r[k]);

const bondAmount = Object.freeze({ kind: 'amount', write: (v) => amountRaw.write(v), read: (cell) => bondAmountFromCell(amountRaw.read(cell)) });
const dateOrBlank = Object.freeze({ kind: 'date', write: (v) => date.write(v), read: (cell) => date.read(cell) || '' });

// C-2's first and third lines (Milestone 64A-2): the description with the case
// number after " / ", and "Atty X for Y". Neither is split exactly on import.
const c2ClaimantLine = (e) => {
  const claimant = (e.claimantName || '').trim();
  const atty = (e.claimantAttorney || '').trim();
  if (!atty) return claimant;
  return claimant ? `Atty ${atty} for ${claimant}` : `Atty ${atty}`;
};

// PART III: each guardian block's boxes, with the caption row above each box
// read as a fallback for a workbook exported before 72A.
const PART_III_FIELDS = ['signatureDate', 'name', 'ssnEin', 'streetAddress', 'phone', 'cityStateZip'];
const guardianSlots = [0, 1, 2].map((i) => Object.fromEntries(partIIIGuardianCells(i).map((f) => [f.key, f.box])));
const captionFallback = (key) => (i) => {
  const f = partIIIGuardianCells(i).find((x) => x.key === key);
  if (!f.caption) return [];
  return [{ cell: f.caption, unless: (cell) => { const shown = readCellText(cell); return !shown || isPrintedCaption(shown, f.text); } }];
};

// PART VI: the four recipient blocks.
const RECIPIENT_SLOTS = [['B', 13], ['H', 13], ['B', 19], ['H', 19]].map(([c, r]) => ({ name: `${c}${r}`, address: `${c}${r + 1}`, cityStateZip: `${c}${r + 2}` }));

export const GUARDIAN_CONTRACT = Object.freeze({
  form: 'guardian',
  template: 'guardian',
  entries: Object.freeze([
    // SUMMARY I -- the cover.
    field('wardName', SI, 'C7', text),
    field('caseNumber', SI, 'H7', text),
    field('gid', SI, 'F7', date),
    field('county', SI, 'G3', text),
    field('guardianName', SI, 'D23', text),
    field('attorneyForGuardian', SI, 'D24', text),
    field('typeOfGuardianship', SI, 'D25', text),
    field('hasSafeDepositBox', SI, 'D26', yesNo),
    field('safeDepositBoxFiled', SI, 'H26', yesNo, { defect: { row: 15, part: 2, note: 'written even when the ward has no box' } }),
    field('amendedForm', SI, 'I8', yesNo, { value: alias('amendedForm', 'isAmended') }),

    // PART III -- up to three guardians. Guardian #1's name box F8 is the
    // form's own link to the Cover (='SUMMARY I '!D23), written over by
    // decision (2026-10-01, as the Annual's F25 on 2026-09-19), with an
    // advisory when the two differ (form-derived-fields.js).
    {
      kind: 'slots', path: 'guardians', sheet: 'PART III', slots: guardianSlots,
      fields: Object.fromEntries(PART_III_FIELDS.map((k) => [k, {
        codec: k === 'signatureDate' ? date : text,
        fallback: captionFallback(k),
        formula: k === 'name' ? (i) => (i === 0 ? 'Guardian #1 name over the Cover link (2026-10-01)' : undefined) : undefined,
      }])),
      exportIf: (row, i) => row != null && i < 3,
      keep: (row, i) => i === 0 || !!row.name,
    },

    // PART IV -- the outside preparer, filed only while no guardian or the
    // attorney is identified as the preparer (Milestone 67A).
    ...[['preparer.asOfDate', 'H9', date], ['preparer.signatureDate', 'G13', date], ['preparer.name', 'I13', text],
      ['preparer.ssnEin', 'B15', text], ['preparer.streetAddress', 'I15', text], ['preparer.phone', 'B17', text],
      ['preparer.cityStateZip', 'I17', text]].map(([path, cell, codec]) => field(path, 'PART IV', cell, codec, { exportIf: (f) => !hasIdentifiedPreparer(f) })),
    // The attorney. I26 is the workbook's own link to the Cover's D24, so the
    // attorney's name comes from there.
    field('attorney.filingDate', 'PART IV', 'C21', date),
    field('attorney.signatureDate', 'PART IV', 'G26', date),
    field('attorney.name', SI, 'D24', text, { dir: 'import', defect: { row: 6, part: 2, note: "D-2's own name is replaced by the Cover's Attorney for Guardian" } }),
    field('attorney.barNumber', 'PART IV', 'B28', text),
    field('attorney.streetAddress', 'PART IV', 'I28', text),
    field('attorney.phone', 'PART IV', 'B30', text),
    field('attorney.cityStateZip', 'PART IV', 'I30', text),

    // PART V -- the bond and the waiver order.
    field('bondAmount', 'PART V', 'G26', bondAmount, { defect: { row: 16, part: 2, note: 'bond fields hidden by the chosen arrangement are written' } }),
    field('bondPeriodFrom', 'PART V', 'E27', date),
    field('bondPeriodTo', 'PART V', 'G27', date),
    field('bondingCompany', 'PART V', 'D28', text),
    field('bondWaivedDate', 'PART V', 'G15', dateOrBlank),

    // PART VI -- the certificate of service.
    {
      kind: 'slots', path: 'serviceRecipients', sheet: 'PART VI', slots: RECIPIENT_SLOTS,
      fields: { name: { codec: text }, address: { codec: text }, cityStateZip: { codec: text } },
      exportIf: (row) => row != null,
      keep: (row) => !!(row.name || row.address || row.cityStateZip),
    },
    { kind: 'constant', path: 'serviceNoRecipients', value: '', defect: { row: 14, part: 2, note: '"no recipients are required" is cleared by import' } },
    field('serviceDate', 'PART VI', 'G25', date),
    field('serviceIndicateIf', 'PART VI', 'J25', text),
    field('serviceAttorney.signatureDate', 'PART VI', 'G27', date),
    { kind: 'constant', path: 'serviceAttorney.name', value: '' },
    // Milestone 72H: the certificate's attorney is D-2's; its boxes repeat
    // PART IV's, and an older workbook's differing details are compared on
    // import (afterRead below).
    ...[['barNumber', 'B29'], ['streetAddress', 'J29'], ['phone', 'B31'], ['cityStateZip', 'J31']]
      .map(([k, cell]) => field(`serviceAttorney.${k}`, 'PART VI', cell, text, { value: (f) => f.attorney?.[k] })),

    // Schedules A-1 to C-5.
    {
      kind: 'rows', path: 'scheduleA1', pages: pages(SCHEDULE_A1_PAGES), present: present('propertyDescription', 'fullAssetValue'),
      columns: [col('propertyDescription', 'C', text), lineCol('streetAddress', 'C', 1, text), lineCol('cityStateZip', 'C', 2, text), lineCol('notes', 'C', 3, text),
        col('residence', 'E', yesNo, { value: alias('residence', 'isPersonalResidence') }), col('income', 'F', yesNo, { value: alias('income', 'isIncomeProperty') }),
        col('fullAssetValue', 'G', amountRaw), col('wardPercent', 'H', share)],
    },
    {
      kind: 'rows', path: 'scheduleA2', pages: pages(SCHEDULE_A2_PAGES), present: present('lenderName', 'fullDebtBalance'),
      columns: [col('lenderName', 'C', text), lineCol('lenderAddress', 'C', 1, text), lineCol('lenderCityStateZip', 'C', 2, text), lineCol('accountNumber', 'C', 3, text),
        col('liabilityType', 'E', text, { value: withDefault('liabilityType', 'Mortgage') }), col('fullDebtBalance', 'F', amountRaw), col('wardPercent', 'G', share)],
      finish: (r) => ({ ...r, notes: '', liabilityType: r.liabilityType || 'Mortgage' }),
    },
    {
      kind: 'rows', path: 'scheduleB1', pages: pages(SCHEDULE_B1_PAGES), present: present('institutionName', 'fullAssetAmount'),
      columns: [col('institutionName', 'C', text), lineCol('accountNumber', 'C', 1, text), lineCol('streetAddress', 'C', 2, text), lineCol('cityStateZip', 'C', 3, text),
        col('restricted', 'E', yesNo, { value: alias('restricted', 'isRestricted') }), col('accountType', 'F', text), col('fullAssetAmount', 'G', amountRaw), col('wardPercent', 'H', share)],
    },
    {
      // Milestone 73D: a vehicle files its built description and no
      // safe-deposit answer.
      kind: 'rows', path: 'scheduleB2', pages: pages(SCHEDULE_B2_PAGES), present: present('description', 'fullAssetValue'),
      columns: [col('description', 'C', text, { value: (r) => b2ItemDescription(r) }), lineCol('streetAddress', 'C', 1, text), lineCol('cityStateZip', 'C', 2, text),
        lineCol('valuationMethod', 'C', 3, text), col('fullAssetValue', 'E', amountRaw), col('wardPercent', 'F', share),
        col('inSafeDepositBox', 'H', yesNo, { value: (r) => (r.isVehicle ? '' : r.inSafeDepositBox) })],
    },
    {
      kind: 'rows', path: 'scheduleB3', pages: pages(SCHEDULE_B3_PAGES), present: present('description', 'fullAssetValue'),
      columns: [col('description', 'C', text), lineCol('streetAddress', 'C', 1, text), lineCol('cityStateZip', 'C', 2, text),
        col('restricted', 'E', yesNo, { value: alias('restricted', 'isRestricted') }), col('fullAssetValue', 'F', amountRaw), col('wardPercent', 'G', share),
        col('inSafeDepositBox', 'J', yesNo)],
    },
    {
      // Milestone 60K: the account number on the fifth line, the fourth left
      // blank; an older workbook's fourth line is read as a fallback.
      kind: 'rows', path: 'scheduleB4', pages: pages(SCHEDULE_B4_PAGES),
      present: (r) => !!String(r.lenderName || '').trim() && !!r.fullLiabilityBalance,
      presentDefect: { row: 7, part: 2, note: 'a creditor with a $0 or blank balance, or no lender, is dropped' },
      columns: [col('lenderName', 'C', text), lineCol('lenderAddress', 'C', 1, text), lineCol('relatedProperty', 'C', 2, text),
        lineCol('accountNumber', 'C', 4, text, { fallback: [{ line: 3 }] }),
        col('liabilityType', 'E', text, { value: withDefault('liabilityType', 'Loan') }), col('fullLiabilityBalance', 'F', amountRaw), col('wardPercent', 'G', share)],
      blankLines: [{ col: 'C', line: 3, why: 'fourth line, blank by decision (60K)' }],
      finish: (r) => ({ ...r, liabilityType: r.liabilityType || 'Loan' }),
    },
    {
      kind: 'rows', path: 'scheduleC1', pages: pages(SCHEDULE_C1_PAGES), present: present('payerName', 'annualIncomeAmount'),
      columns: [col('payerName', 'C', text), lineCol('payerAddress', 'C', 1, text), lineCol('payerCityStateZip', 'C', 2, text),
        col('typeOfIncome', 'E', text), col('frequencyOfPayment', 'G', text, { value: withDefault('frequencyOfPayment', 'Monthly') }), lineCol('paymentBasis', 'E', 2, text),
        col('annualIncomeAmount', 'H', amountRaw), col('wardPercent', 'I', share)],
      finish: (r) => ({ ...r, frequencyOfPayment: r.frequencyOfPayment || 'Monthly' }),
    },
    {
      kind: 'rows', path: 'scheduleC2', pages: pages(SCHEDULE_C2_PAGES),
      present: (r) => !!(r.__line1 || r.amountOfClaim),
      columns: [lineCol('courtJurisdiction', 'C', 1, text), lineCol('claimantAddress', 'C', 3, text), lineCol('claimantCityStateZip', 'C', 4, text),
        col('dateFiled', 'E', date), col('amountOfClaim', 'F', amountRaw), col('wardPercent', 'G', share)],
      combined: [
        { col: 'C', fields: ['lawsuitDescription', 'caseNumber'], codec: text,
          join: (r) => `${r.lawsuitDescription || ''}${r.caseNumber ? ' / ' + r.caseNumber : ''}`,
          split: (s) => { const parts = s.split(' / '); return { __line1: s, lawsuitDescription: parts[0] || s, caseNumber: parts[1] || '' }; },
          defect: { row: 12, part: 2, note: 'text containing " / " splits back wrongly' } },
        // The claimant and their attorney share one line, by the form's own
        // example; it is deliberately not split (decided 2026-09-22).
        { col: 'C', line: 2, fields: ['claimantName', 'claimantAttorney'], codec: text, join: c2ClaimantLine, split: (s) => ({ claimantName: s }) },
      ],
      finish: ({ __line1, ...r }) => r,
    },
    {
      // Milestone 72A: "defendant / type of action", the status, the court, the
      // case number. A workbook exported before 72A wrote the defendant over
      // column B's printed Line # and the case number after the description;
      // that layout is read too.
      kind: 'rows', path: 'scheduleC3', pages: pages(SCHEDULE_C3_PAGES),
      present: (r) => !!r.__line1,
      columns: [lineCol('status', 'C', 1, text), lineCol('courtJurisdiction', 'C', 2, text), lineCol('caseNumber', 'C', 3, text),
        col('actionDate', 'E', date), col('estimatedSettlement', 'F', amountRaw), col('wardPercent', 'G', share)],
      combined: [{
        col: 'C', fields: ['defendantName', 'actionDescription'], codec: text,
        join: (r) => [r.defendantName, r.actionDescription].map((s) => String(s || '').trim()).filter(Boolean).join(' / '),
        split: (first, { sheet, row }) => {
          const lineNo = unwrapCellValue(sheet.getCell(`B${row}`).value);
          if (!(typeof lineNo === 'number' || /^\d+$/.test(String(lineNo ?? '').trim()))) {
            const parts = first.split(' / ');
            return { __line1: first, defendantName: readCellText(sheet.getCell(`B${row}`)), actionDescription: parts[0] || first, caseNumber: parts[1] || '' };
          }
          const cut = first.indexOf(' / ');
          return { __line1: first, defendantName: cut < 0 ? first : first.slice(0, cut), actionDescription: cut < 0 ? '' : first.slice(cut + 3) };
        },
      }],
      finish: ({ __line1, ...r }) => r,
    },
    {
      kind: 'rows', path: 'scheduleC4', pages: pages(SCHEDULE_C4_PAGES), present: present('trustName', 'trustAmount'),
      columns: [col('trustName', 'C', text), lineCol('trusteeName', 'C', 1, text), lineCol('trusteeAddress', 'C', 2, text), lineCol('trusteeCityStateZip', 'C', 3, text),
        col('dateCreated', 'E', date), col('accountNumber', 'F', text), col('trustType', 'H', text, { value: withDefault('trustType', 'Pooled') }),
        col('trustAmount', 'I', amountRaw), col('wardPercent', 'J', share)],
      finish: (r) => ({ ...r, trustType: r.trustType || 'Pooled' }),
    },
    {
      kind: 'rows', path: 'scheduleC5', pages: pages(SCHEDULE_C5_PAGES), present: present('assetDescription', 'totalAssetValue'),
      columns: [col('assetDescription', 'C', text), lineCol('ownerName', 'C', 1, text), lineCol('ownerAddress', 'C', 2, text), lineCol('ownerCityStateZip', 'C', 3, text),
        col('relationshipToWard', 'E', text), col('totalAssetValue', 'F', amountRaw), col('jointOwnerPercent', 'G', share)],
    },
  ]),

  // What the workbook has no cell for: kept from the filing, never read as a
  // blank (73E's transaction and 73M's notices read this list).
  notCarried: Object.freeze([
    'the guardians\' and the attorney\'s email addresses',
    'the signature choices and stamps',
    'which guardian or the attorney prepared this filing',
    'the bond and restricted-depository arrangement',
    'a vehicle\'s year, make, model, VIN and odometer reading (B-2 files its description)',
    'the claimant\'s attorney on Schedule C-2 (the form gives them one line with the claimant)',
  ]),
  // Fields kept from the filing for the same person, by role (73E's
  // transaction clears them for a different person).
  preserve: Object.freeze({
    guardian: ['email', 'signatureState', 'signatureImage', 'certifiesService', 'isPreparer'],
    attorney: ['attorney.email', 'attorney.secondaryEmail', 'attorney.signatureState', 'attorney.signatureImage', 'attorney.isPreparer'],
    preparer: ['preparer.signatureState', 'preparer.signatureImage'],
  }),

  afterRead(draft) {
    if (!draft.guardians || !draft.guardians.length) draft.guardians = [mk.guardian()];
    if (!draft.serviceRecipients || !draft.serviceRecipients.length) draft.serviceRecipients = [mk.recipient()];
    // Milestone 72H, step 8: a blank D-2 box is filled from the
    // certificate's; a certificate detail that differs is kept as an old
    // detail, shown on D-5 with "Discard old details".
    if (draft.attorney && draft.serviceAttorney) {
      const keys = ['barNumber', 'streetAddress', 'phone', 'cityStateZip'];
      const pick = (o) => Object.fromEntries(keys.map((k) => [k, o[k] || '']));
      const cmp = compareImportedCertificate(pick(draft.attorney), pick(draft.serviceAttorney));
      Object.assign(draft.attorney, cmp.attorney);
      Object.assign(draft.serviceAttorney, cmp.old);
    }
  },
});
