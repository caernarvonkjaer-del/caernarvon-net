// Milestone 73T part 1: the Initial Inventory's workbook contract
// (templates/guardian-template.js) -- every field the Inventory writes to the
// Clerk's workbook and reads back. Since 73T part 2 the Inventory's exporter
// and importer (src/features/guardian-inventory/excel.js) run on it, and the
// import goes through 73E's transaction (src/core/excel/import-transaction.js).
import { codecs } from './codecs.js';
import { readCellText, unwrapCellValue } from '../cell-reader.js';
import { hasIdentifiedPreparer } from '../../form/preparer-flag.js';
import { bondAmountFromCell, inferBondDepositoryState, revealsBond, revealsWaiver } from '../../filing/bond-depository.js';
import { rowStarted } from '../../validation/row-started.js';
import { sameName } from '../import-keep.js';
import { compareImportedCertificate } from '../../filing/certificate-migrations.js';
import { b2ItemDescription, mk } from '../../filing/models/guardian.js';
import {
  SCHEDULE_A1_PAGES, SCHEDULE_A2_PAGES, SCHEDULE_B1_PAGES, SCHEDULE_B2_PAGES,
  SCHEDULE_B3_PAGES, SCHEDULE_B4_PAGES, SCHEDULE_C1_PAGES, SCHEDULE_C2_PAGES,
  SCHEDULE_C3_PAGES, SCHEDULE_C4_PAGES, SCHEDULE_C5_PAGES,
  partIIIGuardianCells, isPrintedCaption,
} from '../guardian-inventory-pages.js';
import { RECIPIENT_FIELDS, recipientListed, recipientSlots } from '../../filing/recipient-shape.js';

const { text, date, amountRaw, share, yesNo } = codecs;
const SI = 'SUMMARY I ';
const pages = (list) => list.map((p) => ({ sheet: p.name, rows: p.rows }));
const field = (path, sheet, cell, codec, more = {}) => ({ kind: 'field', path, sheet, cell, codec, ...more });
const col = (field, c, codec, more = {}) => ({ field, col: c, codec, ...more });
const lineCol = (field, c, line, codec, more = {}) => ({ field, col: c, line, codec, ...more });
/** A legacy boolean alias read when the tri-state answer is blank (AGENTS.md section 4). */
const alias = (key, legacy) => (r) => (r[key] != null && r[key] !== '' ? r[key] : r[legacy]);
const present = (...keys) => (r) => keys.some((k) => !!r[k]);

const bondAmount = Object.freeze({ kind: 'amount', write: (v) => amountRaw.write(v), read: (cell) => bondAmountFromCell(amountRaw.read(cell)) });
const dateOrBlank = Object.freeze({ kind: 'date', write: (v) => date.write(v), read: (cell) => date.read(cell) || '' });
const isYes = (v) => v === 'Yes' || v === true;
const filled = (v) => String(v ?? '').trim() !== '';

// Milestone 73T part 2 (row 16): the bond block shows what the chosen
// arrangement shows, as the PDF does -- the bond details for "bond only",
// "bond and depository" or an unanswered arrangement, the waiver order's
// date for "bond waived". The filing keeps a hidden value, and a blank box
// on import leaves it alone (keepIfBlank): the workbook doesn't say it went.
const showsBond = (f) => { const state = inferBondDepositoryState(f); return revealsBond(state) || !state; };
const showsWaiver = (f) => revealsWaiver(inferBondDepositoryState(f));

// Milestone 73T part 2 (row 12, the requester's choice 2026-10-07): a line
// holding "description / case number" is split at the last " / ", and only
// when what follows it has a digit, as a case number does -- so "Foreclosure /
// Lien" returns whole.
function splitCaseNumber(line) {
  const cut = line.lastIndexOf(' / ');
  const tail = cut < 0 ? '' : line.slice(cut + 3);
  return /\d/.test(tail) ? { description: line.slice(0, cut), caseNumber: tail } : { description: line, caseNumber: '' };
}

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
// Milestone 73O part 2: each box's five lines -- the name and four address lines
// (B13:G17, H13:L17, B19:G23, H19:L23); a workbook from before 73O holds the
// street address and city/state/ZIP on the first two, so it reads the same.
const RECIPIENT_SLOTS = recipientSlots([['B', 13], ['H', 13], ['B', 19], ['H', 19]]);

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
    // Milestone 73T part 2 (row 15): the app's D-3 asks the safe-deposit
    // question in Part V's words, so the answer goes to Part V's own box H12
    // too (read from there when the Cover's is blank); "Inventory filed?" is
    // written only when the ward has a box -- the Clerk's form pre-fills it
    // "Yes", which used to stand for a ward with none.
    field('hasSafeDepositBox', SI, 'D26', yesNo, { fallback: [{ sheet: 'PART V', cell: 'H12' }] }),
    field('safeDepositBoxFiled', SI, 'H26', yesNo, { value: (f) => (isYes(f.hasSafeDepositBox) ? f.safeDepositBoxFiled : '') }),
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
    // workbook has no box for D-2's own name. Milestone 73T part 2 (row 6): a
    // D-2 with a name keeps it; a blank one takes the Cover's (fillBlankOnly).
    field('attorney.filingDate', 'PART IV', 'C21', date),
    field('attorney.signatureDate', 'PART IV', 'G26', date),
    field('attorney.name', SI, 'D24', text, { dir: 'import', fillBlankOnly: true }),
    field('attorney.barNumber', 'PART IV', 'B28', text),
    field('attorney.streetAddress', 'PART IV', 'I28', text),
    field('attorney.phone', 'PART IV', 'B30', text),
    field('attorney.cityStateZip', 'PART IV', 'I30', text),

    // PART V -- the safe-deposit question, the bond and the waiver order.
    field('hasSafeDepositBox', 'PART V', 'H12', yesNo, { dir: 'export' }),
    field('bondAmount', 'PART V', 'G26', bondAmount, { exportIf: showsBond, keepIfBlank: true }),
    field('bondPeriodFrom', 'PART V', 'E27', date, { exportIf: showsBond, keepIfBlank: true }),
    field('bondPeriodTo', 'PART V', 'G27', date, { exportIf: showsBond, keepIfBlank: true }),
    field('bondingCompany', 'PART V', 'D28', text, { exportIf: showsBond, keepIfBlank: true }),
    field('bondWaivedDate', 'PART V', 'G15', dateOrBlank, { exportIf: showsWaiver, keepIfBlank: true }),

    // PART VI -- the certificate of service.
    {
      kind: 'slots', path: 'serviceRecipients', sheet: 'PART VI', slots: RECIPIENT_SLOTS,
      fields: Object.fromEntries(RECIPIENT_FIELDS.map((k) => [k, { codec: text }])),
      exportIf: (row) => row != null,
      keep: (row) => recipientListed(row),
    },
    // "No recipients are required" has no box: kept, unless the workbook lists
    // recipients (afterRead). Milestone 73T part 2 (row 14).
    field('serviceDate', 'PART VI', 'G25', date),
    field('serviceIndicateIf', 'PART VI', 'J25', text),
    field('serviceAttorney.signatureDate', 'PART VI', 'G27', date),
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
        col('liabilityType', 'E', text), col('fullDebtBalance', 'F', amountRaw), col('wardPercent', 'G', share)],
      // Milestone 73M (73M-1): A-2's Notes have no box; the import keeps them (reconcile).
      // Milestone 73B: Type is written and read as it is -- a blank stays blank
      // (it used to be written, and read back, as "Mortgage"); likewise B-4's
      // Type, C-1's Frequency and C-4's Type of Trust below.
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
      // Milestone 73T part 2 (row 7): a creditor is kept by its lender or its
      // balance, as every other schedule's row is -- one with a $0 or blank
      // balance, or no lender, used to be dropped.
      kind: 'rows', path: 'scheduleB4', pages: pages(SCHEDULE_B4_PAGES), present: present('lenderName', 'fullLiabilityBalance'),
      columns: [col('lenderName', 'C', text), lineCol('lenderAddress', 'C', 1, text), lineCol('relatedProperty', 'C', 2, text),
        lineCol('accountNumber', 'C', 4, text, { fallback: [{ line: 3 }] }),
        col('liabilityType', 'E', text), col('fullLiabilityBalance', 'F', amountRaw), col('wardPercent', 'G', share)],
      blankLines: [{ col: 'C', line: 3, why: 'fourth line, blank by decision (60K)' }],
    },
    {
      kind: 'rows', path: 'scheduleC1', pages: pages(SCHEDULE_C1_PAGES), present: present('payerName', 'annualIncomeAmount'),
      columns: [col('payerName', 'C', text), lineCol('payerAddress', 'C', 1, text), lineCol('payerCityStateZip', 'C', 2, text),
        col('typeOfIncome', 'E', text), col('frequencyOfPayment', 'G', text), lineCol('paymentBasis', 'E', 2, text),
        col('annualIncomeAmount', 'H', amountRaw), col('wardPercent', 'I', share)],
    },
    {
      kind: 'rows', path: 'scheduleC2', pages: pages(SCHEDULE_C2_PAGES),
      present: (r) => !!(r.__line1 || r.amountOfClaim),
      columns: [lineCol('courtJurisdiction', 'C', 1, text), lineCol('claimantAddress', 'C', 3, text), lineCol('claimantCityStateZip', 'C', 4, text),
        col('dateFiled', 'E', date), col('amountOfClaim', 'F', amountRaw), col('wardPercent', 'G', share)],
      combined: [
        { col: 'C', fields: ['lawsuitDescription', 'caseNumber'], codec: text,
          join: (r) => `${r.lawsuitDescription || ''}${r.caseNumber ? ' / ' + r.caseNumber : ''}`,
          split: (s) => { const { description, caseNumber } = splitCaseNumber(s); return { __line1: s, lawsuitDescription: description, caseNumber }; } },
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
            const { description, caseNumber } = splitCaseNumber(first);
            return { __line1: first, defendantName: readCellText(sheet.getCell(`B${row}`)), actionDescription: description, caseNumber };
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
        col('dateCreated', 'E', date), col('accountNumber', 'F', text), col('trustType', 'H', text),
        col('trustAmount', 'I', amountRaw), col('wardPercent', 'J', share)],
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
    'which guardian or the attorney prepared this filing',
    'the bond and restricted-depository arrangement, and any bond detail it hides',
    'the outside preparer, when the workbook leaves that block blank',
    '"No recipients are required" (a "Yes" goes back to unanswered when the workbook lists recipients)',
    "A-2's Notes, for the same lender in the same place",
    'the method of service (printed on the PDF only)',
    'the UCN',
  ]),
  // What the workbook holds differently, so an import brings it back changed.
  importedAs: Object.freeze([
    'a vehicle on B-2 comes back as an ordinary item with its description (the workbook has no year, make, model, VIN or odometer)',
    'on C-2 the claimant and their attorney come back as one claimant name (the form gives them one line)',
  ]),
  // Milestone 73M: what this filing holds that the workbook has no box for.
  excelOmits(f) {
    const out = [];
    if ((f.scheduleA2 || []).some((r) => filled(r?.notes))) out.push({ text: "A-2's Notes", warn: true });
    if (filled(f.serviceMethod)) out.push({ text: 'the method of service' });
    if (filled(f.ucn)) out.push({ text: 'the UCN' });
    return out;
  },
  // Fields kept from the filing for the same person, by role (73E's
  // transaction clears them for a different person).
  preserve: Object.freeze({
    guardian: ['email', 'signatureState', 'signatureImage', 'certifiesService', 'isPreparer'],
    attorney: ['attorney.email', 'attorney.secondaryEmail', 'attorney.signatureState', 'attorney.signatureImage', 'attorney.isPreparer',
      'serviceAttorney.signatureState', 'serviceAttorney.signatureImage'],
    preparer: ['preparer.signatureState', 'preparer.signatureImage'],
  }),
  // Milestone 73T part 2 (row 19): what typing formats, field by field -- the
  // fields the Inventory's pages give a name, address or city/state/ZIP box
  // (guardian-inventory/index.js). An import formats these and only these;
  // everything else comes back as the workbook holds it, as typing keeps it
  // (C-4's trust and trustee names, C-5's owner, used to be re-cased).
  casing: Object.freeze({
    name: ['wardName', 'guardianName', 'attorneyForGuardian', 'bondingCompany', 'guardians.*.name', 'preparer.name', 'attorney.name',
      'serviceRecipients.*.name', 'scheduleA1.*.propertyDescription', 'scheduleA2.*.lenderName', 'scheduleB1.*.institutionName',
      'scheduleB1.*.accountType', 'scheduleB2.*.description', 'scheduleB3.*.description', 'scheduleB4.*.lenderName',
      'scheduleC1.*.payerName', 'scheduleC2.*.claimantName', 'scheduleC2.*.claimantAttorney', 'scheduleC2.*.lawsuitDescription',
      'scheduleC3.*.defendantName', 'scheduleC3.*.actionDescription', 'scheduleC5.*.assetDescription'],
    address: ['attorney.streetAddress', 'preparer.streetAddress', 'guardians.*.streetAddress',
      'serviceRecipients.*.line2', 'serviceRecipients.*.line3', 'serviceRecipients.*.line4', 'serviceRecipients.*.line5',
      'scheduleA1.*.streetAddress', 'scheduleA2.*.lenderAddress', 'scheduleB1.*.streetAddress', 'scheduleB2.*.streetAddress',
      'scheduleB3.*.streetAddress', 'scheduleB4.*.lenderAddress', 'scheduleC1.*.payerAddress', 'scheduleC2.*.claimantAddress',
      'scheduleC4.*.trusteeAddress', 'scheduleC5.*.ownerAddress'],
    zip: ['attorney.cityStateZip', 'preparer.cityStateZip', 'guardians.*.cityStateZip',
      'scheduleA1.*.cityStateZip', 'scheduleA2.*.lenderCityStateZip', 'scheduleB1.*.cityStateZip', 'scheduleB2.*.cityStateZip',
      'scheduleB3.*.cityStateZip', 'scheduleC1.*.payerCityStateZip', 'scheduleC2.*.claimantCityStateZip',
      'scheduleC4.*.trusteeCityStateZip', 'scheduleC5.*.ownerCityStateZip'],
  }),

  // Against the filing the import goes into (workbook-contract/index.js).
  // Milestone 73T part 2 (row 14): "no recipients are required" has no box,
  // so the filing keeps its answer -- except a "Yes" the workbook contradicts
  // by listing recipients, which goes back to unanswered.
  reconcile(draft, filing) {
    if (filing?.serviceNoRecipients === 'Yes' && (draft.serviceRecipients || []).some((r) => rowStarted(r))) draft.serviceNoRecipients = '';
    // Milestone 73M (73M-1): A-2's Notes have no box in the workbook, so the
    // import keeps each row's Notes for the same lender in the same place, as
    // people are matched (it used to erase them). The place is counted among
    // the rows the workbook carries: the export writes every row, and the
    // import skips one with no lender and no balance.
    const carried = (filing?.scheduleA2 || []).filter((r) => r && (filled(r.lenderName) || (filled(r.fullDebtBalance) && Number(r.fullDebtBalance) !== 0)));
    (draft.scheduleA2 || []).forEach((row, i) => {
      const had = carried[i];
      row.notes = had && sameName(had.lenderName, row.lenderName) ? (had.notes || '') : '';
    });
  },

  afterRead(draft) {
    if (!draft.guardians || !draft.guardians.length) draft.guardians = [mk.guardian()];
    if (!draft.serviceRecipients || !draft.serviceRecipients.length) draft.serviceRecipients = [mk.recipient()];
    // Milestone 73T part 2 (row 9): an outside-preparer block left blank says
    // nothing -- the export leaves it blank while a guardian or the attorney is
    // the preparer -- so the filing keeps the preparer it has. One that names a
    // preparer is the stronger statement and clears the guardians' and the
    // attorney's "prepared this filing" (Milestone 67A); each keeps it
    // otherwise, as the same person (73E's transaction).
    if (draft.preparer) {
      if (!Object.values(draft.preparer).some((v) => v != null && String(v).trim() !== '')) delete draft.preparer;
      else if (String(draft.preparer.name || '').trim()) {
        for (const g of draft.guardians) g.isPreparer = false;
        if (draft.attorney) draft.attorney.isPreparer = false;
      }
    }
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
