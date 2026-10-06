// Milestone 73G part 1: one way to read, keep and show an amount.
//
// Every amount box, the three importers' amount readers and the open-time
// conversion read through this, so "(1000)" means the same thing wherever it
// is typed, pasted or imported. Before, each path had its own reader, and
// every one of them lost something: the boxes stripped a minus as it was
// typed and showed a stored negative as positive (so tabbing through it
// stored it positive); "(1000)", a pasted "−250" and "$-5,000.00" all became
// positive; the Simplified's remuneration Amount kept "$1,234.56" as text
// that filed as $0.00; and the Excel readers turned a text cell's
// "1,234.56" into 1 or 0.
//
// The Clerk's three workbooks are the authority: "Enter all amounts in this
// document in numbers, e.g., 2500.50 or -2500.50 ... ($2,500.50)" (Annual
// `PART I`!C11, Simplified `PARTS I, II `!C9, Inventory `SUMMARY I `!C15),
// and Schedule E: "Use parentheses ( ) to indicate the amount is negative."
// So a minus is accepted everywhere (decision 73G-N1), and "(1000)", "−250",
// "–250" and "$-1,000" are negative (73G-2).
//
// Four operations, kept apart: parse (text to a signed number), store (the
// number, or the text kept when it can't be read), show in the box (as
// stored, minus included), and present court-style (Milestone 73H, not
// here). What a sign MEANS -- the Inventory's negated liabilities, Part VI's
// subtracted disbursements -- belongs to each form, never to this module.

// The minus signs a pasted amount may carry: hyphen-minus, the minus sign
// (U+2212), the figure dash, the en dash (U+2013), the small and full-width
// hyphen-minus.
const MINUS_SIGNS = /[−‒–﹣－]/g;
// Thousands separators in their places, or none; then an optional decimal part.
const STRICT_NUMBER = /^(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d*)?$|^\.\d+$/;
const LENIENT_NUMBER = /^(?:\d[\d,]*)(?:\.\d*)?$|^\.\d+$/;

/** @type {{ blank: true, value: '' }} */
const BLANK = Object.freeze({ blank: /** @type {true} */ (true), value: /** @type {''} */ ('') });
/** @param {unknown} text @returns {{ unreadable: true, text: string }} */
const unreadable = (text) => ({ unreadable: true, text: String(text).trim() });

/**
 * Reads an amount.
 *
 * Returns `{ value: number }` for a readable amount, `{ blank: true, value: '' }`
 * for nothing entered (empty text, or only a sign, "$" or parentheses), or
 * `{ unreadable: true, text }` for text that is not an amount -- the text is
 * kept, never turned into 0 or into the digits it happens to start with.
 *
 * `partial: true` reads text still being typed: thousands separators need not
 * be in their places yet ("1,0" on the way to "1,000") and a leading "(" need
 * not be closed.
 *
 * @param {unknown} input
 * @param {{ partial?: boolean }} [options]
 * @returns {{ value: number } | { blank: true, value: '' } | { unreadable: true, text: string }}
 */
export function parseAmount(input, { partial = false } = {}) {
  if (input === null || input === undefined) return BLANK;
  if (typeof input === 'number') return Number.isFinite(input) ? { value: input } : unreadable(input);
  if (typeof input !== 'string') return unreadable(input);
  let body = input.replace(MINUS_SIGNS, '-').replace(/[\s ]+/g, '');
  if (body === '') return BLANK;

  let negatives = 0;
  if (body.startsWith('(')) {
    negatives++;
    body = body.slice(1);
    if (body.endsWith(')')) body = body.slice(0, -1);
    else if (body !== '' && !partial) return unreadable(input);
  }
  if (/[()]/.test(body)) return unreadable(input);
  let dollars = 0;
  while (body.startsWith('$') || body.startsWith('-')) {
    if (body[0] === '$') dollars++;
    else negatives++;
    body = body.slice(1);
  }
  if (dollars > 1 || negatives > 1) return unreadable(input);
  if (body === '') return BLANK;
  if (!(partial ? LENIENT_NUMBER : STRICT_NUMBER).test(body)) return unreadable(input);
  const magnitude = parseFloat(body.replace(/,/g, ''));
  if (!Number.isFinite(magnitude)) return unreadable(input);
  return { value: negatives && magnitude !== 0 ? -magnitude : magnitude };
}

/**
 * What the filing keeps for an amount: the number; `blank` (default '') for
 * nothing entered; the text itself when it can't be read, so nothing is lost
 * and the export checks can name it (amountFieldIssues()).
 *
 * @param {unknown} input
 * @param {{ blank?: '' | 0 }} [options]
 * @returns {number | '' | string}
 */
export function amountForStore(input, { blank = '' } = {}) {
  const read = parseAmount(input);
  if ('unreadable' in read) return read.text;
  if ('blank' in read) return blank;
  return read.value;
}

/** True when a stored amount is text that can't be read as an amount. */
export function isUnreadableAmount(value) {
  return 'unreadable' in parseAmount(value);
}

/**
 * The text an amount box shows for what the filing holds: the number as
 * stored, minus included; '' for blank (and for 0 when `blankZero` -- an
 * amount box that does not keep "empty" apart from $0.00 has always shown 0
 * as empty); text that can't be read, as it is, so the filer sees it.
 *
 * @param {unknown} value
 * @param {{ blankZero?: boolean }} [options]
 * @returns {string}
 */
export function amountBoxText(value, { blankZero = false } = {}) {
  const read = parseAmount(value);
  if ('unreadable' in read) return typeof value === 'string' ? value : read.text;
  if ('blank' in read) return '';
  if (blankZero && read.value === 0) return '';
  return String(read.value);
}

/**
 * The characters an amount box accepts while it is typed in: digits, ".",
 * ",", "$", "(", ")" and a minus (any of the pasted minus signs, shown as
 * "-"). Anything else is refused like a keystroke over maxlength; nothing is
 * reformatted until the box is left.
 *
 * @param {unknown} text
 * @returns {string}
 */
export function filterAmountTyping(text) {
  return String(text ?? '').replace(MINUS_SIGNS, '-').replace(/[^0-9.,$()-]/g, '');
}

/**
 * The value an amount box writes while it is typed in, so the live totals
 * follow the keystrokes: the number read so far, '' for nothing yet ("-",
 * "(" or "$" alone), or the text when it can't be read even as a partial
 * entry (the box's leave step then keeps and flags it).
 *
 * @param {unknown} text
 * @returns {number | '' | string}
 */
export function liveAmountValue(text) {
  const read = parseAmount(text, { partial: true });
  if ('unreadable' in read) return read.text;
  return read.value;
}

/** The message an amount box shows, and the export checks repeat, for text it can't read. */
export const UNREADABLE_AMOUNT_HINT = 'Enter it as a number, such as 1234.56, -1234.56 or (1234.56).';
