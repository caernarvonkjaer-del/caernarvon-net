// Milestone 73G part 1: one way to read, keep and show an amount
// (src/core/form/amount-codec.js). The Clerk's three workbooks say any amount
// may be negative ("e.g., 2500.50 or -2500.50 ... ($2,500.50)") and Schedule
// E's to use parentheses for a negative; before this, "(1000)", a pasted
// "−250" and "$-5,000.00" all came in positive, "1,234.56" became 1 in a
// workbook text cell and in the Simplified's remuneration ($1.00 filed), and
// "$1,234.56" there filed as $0.00.
import { describe, expect, it } from 'vitest';
import { amountBoxText, amountForStore, filterAmountTyping, isUnreadableAmount, liveAmountValue, parseAmount } from '../../src/core/form/amount-codec.js';

const value = (input, options) => {
  const read = parseAmount(input, options);
  return 'unreadable' in read ? { unreadable: read.text } : read.value;
};

describe('parseAmount(): every notation a filer or a workbook uses', () => {
  it('reads plain, grouped and dollar-signed amounts', () => {
    expect(value('1234.56')).toBe(1234.56);
    expect(value('1,234.56')).toBe(1234.56);
    expect(value('$1,234.56')).toBe(1234.56);
    expect(value(' $ 1,234,567.8 ')).toBe(1234567.8);
    expect(value('1.')).toBe(1);
    expect(value('.5')).toBe(0.5);
    expect(value(0)).toBe(0);
    expect(value(-12.5)).toBe(-12.5);
  });

  it("reads the Clerk's parentheses and every pasted minus sign as negative (73G-2)", () => {
    expect(value('(1000)')).toBe(-1000);
    expect(value('($1,000.00)')).toBe(-1000);
    expect(value('-250')).toBe(-250);
    expect(value('−250')).toBe(-250); // minus sign, from Word or a PDF
    expect(value('–250')).toBe(-250); // en dash
    expect(value('$-5,000.00')).toBe(-5000);
    expect(value('-$5,000.00')).toBe(-5000);
    expect(value('-0')).toBe(0);
  });

  it('reads nothing entered as blank: empty text, or a sign, "$" or parentheses alone', () => {
    for (const blank of [null, undefined, '', '   ', '-', '$', '(', '()', '$-']) expect(value(blank), String(blank)).toBe('');
  });

  it("keeps text that isn't an amount, never cutting it to the digits it starts with or to 0", () => {
    for (const text of ['1.000,50', '1,23', '12abc', 'N/A', '--5', '(-5)', '1.2.3', '5-', '$$5', '(1000']) {
      expect(value(text), text).toEqual({ unreadable: text });
      expect(isUnreadableAmount(text), text).toBe(true);
    }
    expect(isUnreadableAmount(Number.NaN)).toBe(true);
    expect(isUnreadableAmount('')).toBe(false);
    expect(isUnreadableAmount(-5)).toBe(false);
  });

  it('reads an entry still being typed: an unclosed "(" and commas not yet in their places', () => {
    expect(value('(1000', { partial: true })).toBe(-1000);
    expect(value('1,0', { partial: true })).toBe(10);
    expect(value('1,0')).toEqual({ unreadable: '1,0' });
  });
});

describe('what is kept, what a box shows, what a box accepts', () => {
  it('amountForStore(): the number; blank as asked; unreadable text as it was', () => {
    expect(amountForStore('$1,234.56')).toBe(1234.56);
    expect(amountForStore('(250)')).toBe(-250);
    expect(amountForStore('')).toBe('');
    expect(amountForStore('', { blank: 0 })).toBe(0);
    expect(amountForStore(' 1.000,50 ')).toBe('1.000,50');
  });

  it('amountBoxText(): as stored, minus included; 0 empty only when asked; unreadable text shown as it is', () => {
    expect(amountBoxText(-50)).toBe('-50');
    expect(amountBoxText(1234.5)).toBe('1234.5');
    expect(amountBoxText(0)).toBe('0');
    expect(amountBoxText(0, { blankZero: true })).toBe('');
    expect(amountBoxText('')).toBe('');
    expect(amountBoxText('$1,234.56')).toBe('1234.56');
    expect(amountBoxText('1.000,50')).toBe('1.000,50');
  });

  it('filterAmountTyping() refuses letters and keeps "(", ")", "$", "," and a minus (any pasted minus shown as "-")', () => {
    expect(filterAmountTyping('($1,000.50)')).toBe('($1,000.50)');
    expect(filterAmountTyping('12ab3')).toBe('123');
    expect(filterAmountTyping('−250')).toBe('-250');
    expect(filterAmountTyping(' 1 000 ')).toBe('1000');
  });

  it('liveAmountValue(): the number read so far, nothing for a sign alone, the text when it is not an amount', () => {
    expect(liveAmountValue('1,000')).toBe(1000);
    expect(liveAmountValue('(250')).toBe(-250);
    expect(liveAmountValue('-')).toBe('');
    expect(liveAmountValue('1.2.3')).toBe('1.2.3');
  });
});
