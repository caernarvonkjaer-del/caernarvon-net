// Milestone 72E: every box for an amount that may be negative offers a phone
// keypad with a minus key.
//
// A phone picks its on-screen keyboard by the box's inputmode. "decimal" gives
// a keypad with no minus key, so a negative amount cannot be typed; "text"
// (or no inputmode) gives the full keyboard. The Annual's Schedule C "Loss /
// Reduction (enter as negative)" and Schedule E "Transfer Out Amt (negative)"
// boxes asked for "decimal". The browser round trip is
// tests/e2e/signed-amount-keypad.spec.ts. (Since Milestone 73G part 2 the
// shared builder draws both.)
//
// Two places build such a box: the shared field builder, by kind
// ('signed-money'), and boxes written out by hand in a page's markup, which
// carry the same 'signed-decimal' format. The builder is checked directly; the
// hand-written ones are found in the source -- the pages need a browser to
// draw, and the source is where the defect lived.
//
// Red-first: with the Annual's page source from before 72E, the scan reports
// the two schedule boxes, each asking for "decimal".
import { describe, expect, test } from 'vitest';
import path from 'node:path';
import { renderFormField } from '../../src/core/form/form-fields.js';
import { walkSourceFiles } from './support/source-scan.js';
import { readRepoSource } from './support/source-slice.js';

const inputmodeOf = (tag) => (tag.match(/\binputmode="([^"]*)"/) || [])[1] ?? null;
// A keyboard with a minus key: the full text keyboard, or none asked for.
const hasMinusKey = (mode) => mode === null || mode === 'text';

describe('the shared field builder', () => {
  test('a signed amount gets the text keyboard; other amounts and shares keep the decimal keypad', () => {
    const box = (kind) => renderFormField({ label: 'Amount', path: 'x', type: 'number', kind });
    expect(inputmodeOf(box('signed-money'))).toBe('text');
    expect(box('signed-money')).toContain('data-form-format="signed-decimal"');
    expect(inputmodeOf(box('money'))).toBe('decimal');
    expect(inputmodeOf(box('percent'))).toBe('decimal');
  });
});

describe('boxes written out by hand in a page', () => {
  // Every <input ...> literal in the app's source carrying the signed format.
  // A coarse scan of JavaScript source (AGENTS.md §10, P2: fine for finding
  // markup, never for a filed value); the minimum count below keeps it from
  // passing by finding nothing.
  const signedBoxes = walkSourceFiles(path.resolve('src'))
    .flatMap((file) => {
      const rel = path.relative(process.cwd(), file).split(path.sep).join('/');
      return (readRepoSource(rel).match(/<input\b[^>]*>/g) || [])
        .filter((tag) => /-format="signed-decimal"/.test(tag))
        .map((tag) => ({ file: rel, path: (tag.match(/data-[a-z]+-path="([^"]*)"/) || [])[1], inputmode: inputmodeOf(tag) }));
    });

  test('each one offers a keyboard with a minus key', () => {
    const decimalOnly = signedBoxes.filter((b) => !hasMinusKey(b.inputmode));
    expect(decimalOnly, 'boxes for a negative amount that ask for a keypad with no minus key').toEqual([]);
  });

  test('the scan finds the box it is meant to: the Simplified\'s Starting Balance', () => {
    const where = signedBoxes.map((b) => `${b.file} ${b.path}`);
    expect(where).toEqual(expect.arrayContaining([
      expect.stringMatching(/simplified-accounting\/index\.js startingBalance$/),
    ]));
  });

  // Milestone 73G part 2: the Annual's Schedule C Loss and Schedule E Transfer
  // Out were written out by hand; the shared builder draws them now, as signed
  // amounts, so the builder's own case above covers their keyboard.
  test('the Annual\'s Loss and Transfer Out boxes are drawn by the shared builder as signed amounts', () => {
    const page = readRepoSource('src/features/annual-accounting/index.js');
    expect(page).toContain("inpD('Loss / Reduction (enter as negative)',r.loss,`D.schC[${i}].loss=this.value`,false,'number',{kind:'signed-money'})");
    expect(page).toContain("inpD('Transfer Out Amount (enter as negative)',r.transferOutAmt,`D.schE[${i}].transferOutAmt=this.value`,false,'number',{kind:'signed-money'})");
    expect(signedBoxes.filter((b) => b.file.endsWith('annual-accounting/index.js')), 'no Annual box is written out by hand any more').toEqual([]);
  });
});
