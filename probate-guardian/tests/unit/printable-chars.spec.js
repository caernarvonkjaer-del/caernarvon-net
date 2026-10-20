// Milestone 76H items 4 and 5. The PDF's font held Latin and Latin-1 only (203
// characters), and the PDF library leaves out any letter its font lacks:
// "Dvořák" printed "Dvoák", "Łukasz Żółć" printed "ukasz ó", and nothing on
// screen said so. Decision 76H-1: embed Latin Extended-A and -B, and say on
// screen when a box still holds a letter the PDF can't print. And a tab or a
// lone carriage return stopped the line it was on.
//
// printable-chars.js is generated with the fonts; here it is held to the
// fonts actually embedded, read with the same character-map reader.
import { describe, expect, test } from 'vitest';
import { fontCodePoints, toRanges } from '../../scripts/ttf-cmap.mjs';
import { PG_SANS_BOLD_B64, PG_SANS_ITALIC_B64, PG_SANS_REGULAR_B64 } from '../../src/assets/embedded-fonts.js';
import { PRINTABLE_RANGES } from '../../src/core/pdf/printable-chars.js';
import { pdfText, unprintableChars, unprintableNote } from '../../src/core/pdf/pdf-text.js';

const faces = [PG_SANS_REGULAR_B64, PG_SANS_BOLD_B64, PG_SANS_ITALIC_B64].map((b64) => fontCodePoints(new Uint8Array(Buffer.from(b64, 'base64'))));

describe('the letters the PDF can print are the fonts\' own', () => {
  test('printable-chars.js is exactly what all three embedded faces map', () => {
    const shared = faces.reduce((a, b) => a.filter((p) => b.includes(p)));
    expect(PRINTABLE_RANGES.map(([a, b]) => [a, b])).toEqual(toRanges(shared));
  });

  test('every face holds Latin Extended-A and -B (decision 76H-1)', () => {
    for (const face of faces) {
      for (let c = 0x100; c <= 0x24F; c++) expect(face.includes(c), `U+${c.toString(16).toUpperCase()}`).toBe(true);
    }
  });

  test('European names print as typed; Vietnamese tones and symbols are named', () => {
    expect(unprintableChars('Antonín Dvořák, Łukasz Żółć, Ştefan Ţurcanu, Ștefan Țurcanu, Đorđe, Ǧ')).toEqual([]);
    expect(unprintableChars('Nguyễn Văn ≥ 10 → Nguyễn')).toEqual(['ễ', '≥', '→']);
    expect(unprintableChars('')).toEqual([]);
    expect(unprintableChars(undefined)).toEqual([]);
  });

  test('the note says what would be left out, and is empty when nothing would', () => {
    expect(unprintableNote('Dvořák')).toBe('');
    expect(unprintableNote('Nguyễn')).toBe('The filed PDF can\'t print "ễ": it would be left out. Type it another way.');
    expect(unprintableNote('≥ →')).toBe('The filed PDF can\'t print "≥", "→": they would be left out. Type them another way.');
  });
});

describe('text as the PDF draws it (item 5)', () => {
  test('a tab becomes spaces and a lone carriage return a line break; the rest is as typed', () => {
    expect(pdfText('Reads well.\tCol two')).toBe('Reads well.    Col two');
    expect(pdfText('one\rtwo\r\nthree\nfour')).toBe('one\ntwo\nthree\nfour');
    expect(pdfText(['a\tb', 'c'])).toEqual(['a    b', 'c']);
    expect(pdfText(12)).toBe(12);
  });

  test('a letter typed as a letter and a separate accent becomes the one letter', () => {
    expect(pdfText('Pérez')).toBe('Pérez');
    expect(unprintableChars('Pérez')).toEqual([]);
  });
});
