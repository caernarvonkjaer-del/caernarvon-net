// Milestone 76H items 4 and 5: text as the PDF draws it, and the letters it
// can't.
//
// Item 4 (decision 76H-1, the requester's): the PDF's font holds Latin,
// Latin-1 and, since this item, Latin Extended-A and -B -- "Dvořák",
// "Łukasz Żółć", "Ştefan" print as typed. A letter outside the font is left
// out of the PDF by the PDF library without a word ("Dvořák" printed
// "Dvoák"); unprintableNote() says so beside the box instead, before filing.
// The list is read from the fonts themselves (printable-chars.js).
//
// Item 5: the PDF library stops drawing a line at a tab or a lone carriage
// return, both of which typed and pasted text keeps, so the rest of the line
// was lost ("Reads well.<tab>Col two" printed "Reads well."). pdfText() turns
// a tab into spaces and a carriage return into a line break; the stored text
// is unchanged. It also composes letters typed as a letter plus an accent
// mark into the one letter the font holds (a pasted "é" can arrive as "e"
// and a separate accent, and the accent was dropped).
import { PRINTABLE_RANGES } from './printable-chars.js';

const TAB_AS = '    ';

/**
 * Text as the PDF draws it. Arrays (lines) are mapped; anything else is
 * returned as it is.
 * @template T
 * @param {T} value
 * @returns {T}
 */
export function pdfText(value) {
  if (typeof value === 'string') {
    return /** @type {any} */ (value.normalize('NFC').replace(/\r\n?/g, '\n').replace(/\t/g, TAB_AS));
  }
  if (Array.isArray(value)) return /** @type {any} */ (value.map(pdfText));
  return value;
}

const printable = (code) => {
  let lo = 0;
  let hi = PRINTABLE_RANGES.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const [first, last] = PRINTABLE_RANGES[mid];
    if (code < first) hi = mid - 1;
    else if (code > last) lo = mid + 1;
    else return true;
  }
  return false;
};

/**
 * The characters of `text` the PDF would leave out, each once, in order.
 * Line breaks and tabs are not among them (pdfText() handles both).
 * @param {unknown} text
 * @returns {string[]}
 */
export function unprintableChars(text) {
  if (typeof text !== 'string' || !text) return [];
  const out = [];
  for (const ch of pdfText(text)) {
    if (ch === '\n' || out.includes(ch)) continue;
    if (!printable(ch.codePointAt(0) ?? 0)) out.push(ch);
  }
  return out;
}

/**
 * The note beside a box holding letters the PDF can't print, or ''.
 * @param {unknown} text
 */
export function unprintableNote(text) {
  const chars = unprintableChars(text);
  if (!chars.length) return '';
  const list = chars.map((c) => `"${c}"`).join(', ');
  return chars.length === 1
    ? `The filed PDF can't print ${list}: it would be left out. Type it another way.`
    : `The filed PDF can't print ${list}: they would be left out. Type them another way.`;
}
