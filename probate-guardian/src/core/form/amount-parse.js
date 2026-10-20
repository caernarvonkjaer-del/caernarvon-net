// Milestone 76H item 7: reading an amount, on its own -- amount-codec.js's
// parse step (Milestone 73G part 1), moved here unchanged so money.js's n()
// can read through it without the two modules importing each other
// (amount-codec.js formats with money.js). It imports nothing; amount-codec.js
// re-exports parseAmount, so its callers are unchanged.

// The minus signs a pasted amount may carry: hyphen-minus, the minus sign
// (U+2212), the figure dash, the en dash (U+2013), the small and full-width
// hyphen-minus.
export const MINUS_SIGNS = /[−‒–﹣－]/g;
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
