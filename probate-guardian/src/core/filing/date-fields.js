// Milestone 76E: where each form keeps a date the filer enters, in the
// page's own words, and whether a date another answer can hide is in use.
//
// Two jobs, both for a date still being typed (a "draft": text that isn't a
// date yet, kept beside the filing until it is -- commit-coordinator.js):
//
// 1. Whether it blocks. An impossible date blocks every output (decision
//    73F-3), so that nobody files a date that was never checked. But a box
//    another answer hides can't be corrected where the filer is looking: a
//    bad attorney-waiver order date, then an attorney entered, blocked every
//    output with the box nowhere on the page. A draft now blocks only while
//    its box is in use (design 1 of Milestone 76, the rule chosen for amounts
//    on 2026-10-17): shown by the page, or carried by the court output. A
//    hidden draft is kept, and comes back in its box when the answer shows it
//    again (hiding never deletes, AGENTS.md section 4). The one box hidden yet
//    printed -- the bond period while the bond question is unanswered, on the
//    Inventory and the Annual family -- keeps blocking, and says which answer
//    shows it.
//
// 2. What it is called. A date read from an imported workbook that no
//    reader understands is brought back as a draft (Milestone 73T); it used
//    to be named only "Imported from Excel — Line 1". Each entry gives the
//    page, the section and the label, and a row's words ("Trust 2", the
//    Inventory's "C-2 row 2"), as the form's own checks say them.
//
// Which boxes another answer hides was established by reading each page,
// its PDF and its workbook contract (2026-10-20); the Plans' signature and
// certificate dates, and every schedule row's dates, are never hidden.
// tests/unit/date-fields.spec.js holds the workbook contracts' date fields
// to this list, and tests/e2e/hidden-date-drafts.spec.ts each condition to
// its page.
import { inferBondDepositoryState, revealsBond, revealsDepository, revealsWaiver } from './bond-depository.js';
import { isAttorneyStarted } from '../validation/attorney-block.js';
import { hasIdentifiedPreparer } from '../form/preparer-flag.js';

const bondState = (d) => inferBondDepositoryState(d);
const BOND_PERIOD = {
  shown: (d) => revealsBond(bondState(d)),
  // Printed (and, on the Inventory, written to the workbook) while the
  // question is unanswered too (bond-depository.js, the forms' pdf-model.js).
  printed: (d) => !bondState(d),
  reveal: 'the bond question is answered with a bond',
};
const DEPOSITORY = { shown: (d) => revealsDepository(bondState(d)) };
const WAIVER = { shown: (d) => revealsWaiver(bondState(d)) };
const waiverOrder = (engine) => ({ shown: (d) => !isAttorneyStarted(d, engine) && d?.attorneyWaiverBasis === 'court-order' });
const attorneyEntered = (engine) => ({ shown: (d) => isAttorneyStarted(d, engine) });
const noAttorney = (engine) => ({ shown: (d) => !isAttorneyStarted(d, engine) });
const PREPARER = { shown: (d) => !hasIdentifiedPreparer(d) };

const GUARDIAN = 'Guardian #';

const ANNUAL_FAMILY = [
  { path: 'gid', route: '/', section: 'Part I', label: 'Guardianship Inception Date (GID)' },
  { path: 'periodFrom', route: '/', section: 'Part I', label: 'Period From' },
  { path: 'periodTo', route: '/', section: 'Part I', label: 'Period To' },
  { path: 'attorneyWaiverOrderDate', route: '/', section: 'Part I', label: 'Date of the order', ...waiverOrder('annual') },
  // Shown for a Trust Accounting; its PDF prints them by the filing's type
  // (the two can disagree only on a filing whose type conflicts, which the
  // export checks refuse on their own).
  { path: 'trustInfo.dateCreated', route: '/', section: 'Part I', label: 'Date Trust Created',
    shown: (d) => d?.filingType === 'Trust', printed: (d) => d?.inventoryType === 'trustAccounting', reveal: 'the Filing Type is Trust' },
  { path: 'trustInfo.dateFunded', route: '/', section: 'Part I', label: 'Date the funds were received by the trust',
    shown: (d) => d?.filingType === 'Trust', printed: (d) => d?.inventoryType === 'trustAccounting', reveal: 'the Filing Type is Trust' },
  { list: 'guardians', field: 'signatureDate', route: '/p3', section: 'Part III', row: GUARDIAN, label: 'Signature Date' },
  { path: 'preparer.signatureDate', route: '/p4', section: 'Part IV', label: 'Signature Date', ...PREPARER },
  { path: 'attorney_signatureDate', route: '/p5', section: 'Part V', label: 'Signature Date' },
  ...[['schB1', 'Schedule B-1'], ['schB2', 'Schedule B-2']].flatMap(([list, section]) => [
    { list, field: 'periodFrom', label: 'Period From' },
    { list, field: 'periodTo', label: 'Period To' },
    { list, field: 'datePaid', label: 'Date Paid' },
    { list, field: 'courtOrderDate', label: 'Court Order Date' },
  ].map((e) => ({ ...e, route: `/${list.toLowerCase()}`, section, row: 'Line' }))),
  { list: 'schB3', field: 'datePaid', route: '/schb3', section: 'Schedule B-3', row: 'Line', label: 'Date Paid' },
  { list: 'schB3', field: 'courtOrderDate', route: '/schb3', section: 'Schedule B-3', row: 'Line', label: 'Court Order Date' },
  { list: 'schB4', field: 'datePaid', route: '/schb4', section: 'Schedule B-4', row: 'Line', label: 'Date Paid' },
  { list: 'schC', field: 'date', route: '/schc', section: 'Schedule C', row: 'Line', label: 'Date of Adjustment' },
  { list: 'schE', field: 'transferInDate', route: '/sche', section: 'Schedule E', row: 'Line', label: 'Transfer In Date' },
  { list: 'schE', field: 'transferOutDate', route: '/sche', section: 'Schedule E', row: 'Line', label: 'Transfer Out Date' },
  { list: 'schF1', field: 'courtOrderDate', route: '/schf1', section: 'Schedule F-1', row: 'Line', label: 'Court Order Date' },
  { list: 'schF2', field: 'courtOrderDate', route: '/schf2', section: 'Schedule F-2', row: 'Line', label: 'Court Order Date' },
  { list: 'trusts', field: 'dateCreated', route: '/p8', section: 'Part VIII', row: 'Trust', label: 'Date Trust Created',
    shown: (d) => d?.trusts?.[0]?.hasTrust === 'Yes' },
  { path: 'restrictedDepositoryReceiptDate', route: '/p9', section: 'Part IX', label: 'Date of Most Recent Receipt', ...DEPOSITORY },
  { path: 'bondPeriodFrom', route: '/p9', section: 'Part IX', label: 'Bond Period From', ...BOND_PERIOD },
  { path: 'bondPeriodTo', route: '/p9', section: 'Part IX', label: 'Bond Period To', ...BOND_PERIOD },
  { path: 'bondWaivedDate', route: '/p9', section: 'Part IX', label: 'Date of the order waiving the bond', ...WAIVER },
  { path: 'certDate', route: '/p10', section: 'Part X', label: 'Date of Service' },
  { path: 'certAttySignDate', route: '/p10', section: 'Part X', label: "Attorney's Signature Date", ...attorneyEntered('annual') },
  { path: 'certGuardianSignDate', route: '/p10', section: 'Part X', label: "Guardian's Signature Date", ...noAttorney('annual') },
];

const SIMPLIFIED = [
  { path: 'gid', route: '/', section: 'Part I', label: 'Guardianship Inception Date (GID)' },
  { path: 'periodFrom', route: '/', section: 'Part I', label: 'Period From' },
  { path: 'periodTo', route: '/', section: 'Part I', label: 'Period To' },
  { list: 'guardians', field: 'signatureDate', route: '/p4', section: 'Part IV', row: GUARDIAN, label: 'Signature Date' },
  { path: 'attorney_signatureDate', route: '/p5', section: 'Part V', label: 'Signature Date' },
  { path: 'certServiceDate', route: '/p6', section: 'Part VI', label: 'Date of Service' },
  { path: 'certAttySignDate', route: '/p6', section: 'Part VI', label: "Attorney's Signature Date", ...attorneyEntered('simplified') },
  { path: 'certGuardianSignDate', route: '/p6', section: 'Part VI', label: "Guardian's Signature Date", ...noAttorney('simplified') },
];

// The Inventory's checks name a row "C-2 row 2" (`inline`).
const INVENTORY = [
  { path: 'gid', route: '/', section: 'Cover', label: 'Guardianship Inception Date (GID)' },
  { path: 'attorneyWaiverOrderDate', route: '/', section: 'Cover', label: 'Date of the order', ...waiverOrder('guardian') },
  { list: 'scheduleC2', field: 'dateFiled', inline: true, route: '/c2', section: 'C-2', label: 'Date Filed' },
  { list: 'scheduleC3', field: 'actionDate', inline: true, route: '/c3', section: 'C-3', label: 'Action Date' },
  { list: 'scheduleC4', field: 'dateCreated', inline: true, route: '/c4', section: 'C-4', label: 'Date Created' },
  { list: 'guardians', field: 'signatureDate', route: '/d1', section: 'D-1', row: GUARDIAN, label: 'Signature Date' },
  { path: 'preparer.signatureDate', route: '/d2', section: 'D-2', label: "Preparer's Date", ...PREPARER },
  { path: 'preparer.asOfDate', route: '/d2', section: 'D-2', label: 'Compilation "as of" date', ...PREPARER },
  { path: 'attorney.signatureDate', route: '/d2', section: 'D-2', label: "Attorney's Signature Date" },
  { path: 'attorney.filingDate', route: '/d2', section: 'D-2', label: 'Filing Date (as of)' },
  { path: 'restrictedDepositoryReceiptDate', route: '/d4', section: 'D-4', label: 'Date of most recent restricted depository receipt', ...DEPOSITORY },
  { path: 'bondPeriodFrom', route: '/d4', section: 'D-4', label: 'Bond Period – From', ...BOND_PERIOD },
  { path: 'bondPeriodTo', route: '/d4', section: 'D-4', label: 'Bond Period – To', ...BOND_PERIOD },
  { path: 'bondWaivedDate', route: '/d4', section: 'D-4', label: 'Date of the order waiving the bond', ...WAIVER },
  { path: 'serviceDate', route: '/d5', section: 'D-5', label: 'Service Date' },
  { path: 'serviceAttorney.signatureDate', route: '/d5', section: 'D-5', label: "Attorney's Signature Date", ...attorneyEntered('guardian') },
  { path: 'serviceGuardian.signatureDate', route: '/d5', section: 'D-5', label: "Guardian's Signature Date", ...noAttorney('guardian') },
];

// The Plans' drafts are named by their pages when typed (nothing imports a
// Plan); only the advance-directive dates are behind another answer.
const PLAN_ANNUAL = [
  { list: 'q10Directives', field: 'dateSigned', route: '/p9', section: '10. Advance Directives', row: 'Directive', label: 'Date executed / signed',
    shown: (d) => !!d?.q10Executed },
  { list: 'q10Directives', field: 'orderDate', route: '/p9', section: '10. Advance Directives', row: 'Directive', label: 'Date of order',
    shown: (d, row) => !!d?.q10Executed && row?.courtRevoked === 'Yes' },
];
const PLAN_INITIAL = [
  { list: 'q11Directives', field: 'dateSigned', route: '/p8', section: '11. Advance Directives', row: 'Directive', label: 'Date executed/signed',
    shown: (d) => !!d?.q11Executed },
  // Milestone 76H item 14: shown only under "suspended or revoked? Yes", as the Annual Plan's.
  { list: 'q11Directives', field: 'orderDate', route: '/p8', section: '11. Advance Directives', row: 'Directive', label: 'Date of Order',
    shown: (d, row) => !!d?.q11Executed && row?.courtRevoked === 'Yes' },
];

const BY_TYPE = {
  annual: ANNUAL_FAMILY,
  finalAccounting: ANNUAL_FAMILY,
  trustAccounting: ANNUAL_FAMILY,
  simplified: SIMPLIFIED,
  guardian: INVENTORY,
  planAnnual: PLAN_ANNUAL,
  planInitial: PLAN_INITIAL,
};

/** The date fields this list names for a filing type (empty for a type it names none of). */
export function dateFieldsFor(type) {
  return Object.hasOwn(BY_TYPE, type) ? BY_TYPE[type] : [];
}

/**
 * The entry a draft's path names on a filing type, with its row index for a
 * list ("schB1.1.datePaid" is Schedule B-1's Date Paid, row 1), or null.
 * @param {string} type
 * @param {string} path
 */
export function dateEntryFor(type, path) {
  const m = /^(\w+)\.(\d+)\.(\w+)$/.exec(path || '');
  for (const entry of dateFieldsFor(type)) {
    if (entry.path ? entry.path === path : !!m && entry.list === m[1] && entry.field === m[3]) {
      return { entry, index: entry.path ? undefined : Number(m[2]) };
    }
  }
  return null;
}

/**
 * Whether a date's box is in use on this filing -- shown by the page, or
 * carried by the court output -- and whether it is hidden yet printed.
 * A path this list doesn't name is in use (its box is never hidden).
 * @param {Record<string, any>} d
 * @param {string} path
 * @returns {{ inUse: boolean, hiddenButPrinted: boolean, entry: any, index: number | undefined }}
 */
export function dateUse(d, path) {
  const found = dateEntryFor(d?.inventoryType, path);
  if (!found) return { inUse: true, hiddenButPrinted: false, entry: null, index: undefined };
  const { entry, index } = found;
  const row = index === undefined ? undefined : d?.[entry.list]?.[index];
  const shown = !entry.shown || entry.shown(d, row);
  const printed = !shown && !!entry.printed && entry.printed(d, row);
  return { inUse: shown || printed, hiddenButPrinted: printed, entry, index };
}

/**
 * A row's words, as the form's checks say them: "Line 2", "Trust 2",
 * "Guardian #2"; the Inventory's "C-2 row 2" stands in for the section.
 * @param {any} entry
 * @param {number | undefined} index
 */
export function dateRowWords(entry, index) {
  if (index === undefined) return '';
  const n = index + 1;
  if (entry.inline) return `${entry.section} row ${n}`;
  return entry.row === GUARDIAN ? `${GUARDIAN}${n}` : `${entry.row} ${n}`;
}
