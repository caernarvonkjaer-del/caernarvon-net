// Milestone 73T part 1: how one field's value goes into a workbook cell and
// comes back out -- the "codec" column of the workbook contract.
//
// Each codec is { kind, write(value, filing), read(cell) }:
//   - write returns { value } for setCell(), or { value, date: true } for
//     setDateCell(), and optionally { numFmt } to give the cell a number
//     format (Part VIII's share and amount boxes);
//   - read takes the ExcelJS cell and returns the field's value.
//
// Part 1 describes the exporters and importers as they are, so several
// codecs come in the variants the three forms use today (the Inventory reads
// a blank amount as 0, the Annual as blank; the Simplified reads a date as
// the cell's text). Where a variant is one of the losses 73T catalogues, the
// contract entry using it says so, and the part that connects the form
// changes it there.
import { amountForStore } from '../../form/amount-codec.js';
import { numValue, percentValue } from '../excel-engine.js';
import { readCellText, unwrapCellValue } from '../cell-reader.js';
import { shareFromWorkbookCell } from '../share-cell.js';

const raw = (cell) => unwrapCellValue(cell ? cell.value : null);

/** A calendar day from a cell, as YYYY-MM-DD, or null when there is none. */
export function isoDateFromCell(cell) {
  const v = raw(cell);
  if (v == null || v === '') return null;
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === 'number') return new Date((v - 25569) * 86400000).toISOString().slice(0, 10);
  const s = String(v).trim();
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) return `${m[3]}-${m[1].padStart(2, '0')}-${m[2].padStart(2, '0')}`;
  m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2})$/);
  if (m) { const yy = +m[3]; return `${yy < 50 ? 2000 + yy : 1900 + yy}-${m[1].padStart(2, '0')}-${m[2].padStart(2, '0')}`; }
  return null;
}

const tri = (v) => (v === 'Yes' || v === true) ? 'Yes' : ((v === 'No' || v === false) ? 'No' : '');

export const codecs = Object.freeze({
  /** Text: written as given (`x || ''`), read as the cell's trimmed text. */
  text: Object.freeze({ kind: 'text', write: (v) => ({ value: v || '' }), read: (cell) => readCellText(cell) }),

  /** A date written as a real Excel date. Read variants below. */
  date: Object.freeze({ kind: 'date', write: (v) => ({ value: v, date: true }), read: (cell) => isoDateFromCell(cell) }),
  /** The Annual's reader: '' for a blank or unreadable date -- and for a bare number (a serial with no date format), which it doesn't read as a date. */
  dateOrBlank: Object.freeze({ kind: 'date', write: (v) => ({ value: v, date: true }), read: (cell) => (typeof raw(cell) === 'number' ? '' : isoDateFromCell(cell) || '') }),
  /** The Simplified's reader: the cell's text, cut to ten characters. */
  dateText: Object.freeze({ kind: 'date', write: (v) => ({ value: v, date: true }), read: (cell) => readCellText(cell).substring(0, 10) }),

  /** The Inventory's amounts: written as stored (0 and blank alike leave the cell empty); a blank cell reads as 0. */
  amountRaw: Object.freeze({
    kind: 'amount',
    write: (v) => ({ value: v || '' }),
    read: (cell) => {
      const v = raw(cell);
      if (v == null || v === '') return 0;
      if (typeof v === 'number' || typeof v === 'string') return amountForStore(v, { blank: 0 });
      return Number(v) || 0;
    },
  }),
  /**
   * The Annual's amounts: written as a number, a blank as a blank (Milestone
   * 73T part 3, row 13 -- it used to be 0, so a re-import turned a blank into
   * an entered $0.00); a blank or date cell reads as blank.
   */
  amountNumber: Object.freeze({
    kind: 'amount',
    write: (v) => ({ value: v === '' || v == null ? '' : numValue(v) }),
    read: (cell) => { const v = raw(cell); if (v == null || v === '' || v instanceof Date) return ''; return amountForStore(v); },
  }),
  /** The Simplified's Part II amounts: written as a number (a blank as 0), read from the cell's text. */
  amountNumberText: Object.freeze({
    kind: 'amount',
    write: (v) => ({ value: numValue(v) }),
    read: (cell) => amountForStore(readCellText(cell)),
  }),

  /** A ward's share: the 0-100 figure written as the fraction the workbook holds; read every number as a fraction. */
  share: Object.freeze({ kind: 'share', write: (v) => ({ value: percentValue(v) }), read: (cell) => shareFromWorkbookCell(raw(cell)) }),

  /** A Yes/No box, tri-state both ways: '' stays unanswered, never 'No'. */
  yesNo: Object.freeze({
    kind: 'yesNo',
    write: (v) => ({ value: tri(v) }),
    read: (cell) => { const t = readCellText(cell).toLowerCase(); return t === 'yes' ? 'Yes' : (t === 'no' ? 'No' : ''); },
  }),
  /** A Yes/No or list box written and read as its text (the Annual's). */
  listText: Object.freeze({ kind: 'list', write: (v) => ({ value: v || '' }), read: (cell) => readCellText(cell) }),
});
