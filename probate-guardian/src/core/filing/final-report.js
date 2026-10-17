// Milestone 74J-2 (answered 2026-10-16 by the requester as Pinellas Clerk
// practice; built on approval the same day, decision 74J-N1): a Final
// Accounting shows Rule 5.680(c)'s items beyond the Clerk's Annual workbook --
// "amounts reserved for unpaid and anticipated disbursements, costs, and
// fees" and "a list of the assets to be turned over to the person entitled to
// them". One Final-only page, two lists, each asked like an Annual schedule:
// rows, or "I verify there are none"; unanswered, the sidebar asks, and export
// is never blocked; a started row's boxes are required, an ordinary error the
// filer can override. The workbook has no cells for either; the PDF prints
// both. The lists exist only once the filer adds a row (as the "no items"
// ticks do), so no other filing's shape changes.
//
// No imports: every module that needs these facts can read them without a
// cycle, and none has to name a filing type of its own.

/** The page. */
export const FINAL_REPORT_ROUTE = '/final';
/** The section the page's issues name, which routes them to it. */
export const FINAL_REPORT_SECTION = 'Final Report';

/**
 * The two lists: their keys, "no items" ticks, the words Rule 5.680(c) uses,
 * and each row's boxes as [key, label], all required on a started row.
 */
export const FINAL_LISTS = Object.freeze([
  Object.freeze({
    list: 'finalReserved', noItems: 'finalreserved', heading: 'Amounts Reserved',
    title: 'Amounts reserved for unpaid and anticipated disbursements, costs, and fees',
    noun: 'amounts reserved', fields: Object.freeze([['description', 'Description'], ['amount', 'Amount']]),
  }),
  Object.freeze({
    list: 'finalTurnover', noItems: 'finalturnover', heading: 'Assets to Be Turned Over',
    title: 'Assets to be turned over, and to whom',
    noun: 'assets to be turned over', fields: Object.freeze([['asset', 'Asset'], ['recipient', 'To Whom']]),
  }),
]);

/** Whether a filing type is the Final Accounting, the one filing with this page. */
export const isFinalAccountingType = (type) => type === 'finalAccounting';

const entered = (row) => Object.entries(row || {}).some(([key, v]) => key !== 'id' && v !== '' && v != null);

/** Whether a filing holds any entered row on either list. */
export function finalReportStarted(filing) {
  return FINAL_LISTS.some(({ list }) => (Array.isArray(filing?.[list]) ? filing[list] : []).some(entered));
}
