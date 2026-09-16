import { describe, it, expect, vi } from 'vitest';
import {
  setCell,
  numValue,
  percentValue,
  sanitizeCellValue,
} from '../../src/core/excel/excel-engine.js';

// Milestone 51D rewrote this spec down to the module's surviving exports. It
// previously covered fourteen, ten of which had no production caller; see
// excel-engine.js's own header for what was deleted and why, including the
// reader-semantics divergence (0 vs '' for an unparseable cell) that makes those
// readers deliberately NOT interchangeable with the features' local ones.
//
// setCell, numValue and percentValue are covered here because 51D made them live:
// all three feature excel.js files now import setCell, and annual-accounting also
// imports numValue/percentValue, in place of byte-identical local closures.
describe('Excel Engine unit tests', () => {
  describe('numeric coercion helpers', () => {
    it('numValue parses floats or falls back to 0', () => {
      expect(numValue('123.45')).toBe(123.45);
      expect(numValue(67)).toBe(67);
      expect(numValue('')).toBe(0);
      expect(numValue(null)).toBe(0);
      expect(numValue('not a number')).toBe(0);
    });

    it('percentValue converts percentages to decimal fractions', () => {
      expect(percentValue(50)).toBe(0.5);
      expect(percentValue('25')).toBe(0.25);
      expect(percentValue(0.75)).toBe(0.75);
      expect(percentValue('0.15')).toBe(0.15);
      expect(percentValue('invalid')).toBe(0);
    });

    it('numValue and percentValue match the closures they replaced in annual-accounting/excel.js', () => {
      // The local ones were `v=>parseFloat(v)||0` and
      // `v=>{const p=parseFloat(v);return isNaN(p)?0:p>1?p/100:p;}`. Pinning the
      // equivalence is what makes 51D's adoption provably behavior-neutral rather
      // than merely asserted.
      const localNv = v => parseFloat(v) || 0;
      const localPv = (v) => { const p = parseFloat(v); return isNaN(p) ? 0 : p > 1 ? p / 100 : p; };
      for (const v of ['', null, undefined, 0, 1, 0.5, 50, 100, '0', '50', '0.25', 'x', '12.5%', -3, 1e3]) {
        expect(numValue(v), `numValue(${JSON.stringify(v)})`).toBe(localNv(v));
        expect(percentValue(v), `percentValue(${JSON.stringify(v)})`).toBe(localPv(v));
      }
    });
  });

  describe('sanitization and cell writing', () => {
    it('sanitizeCellValue prefixes formula-injection characters with a single quote', () => {
      expect(sanitizeCellValue('=SUM(A1:A2)')).toBe("'=SUM(A1:A2)");
      expect(sanitizeCellValue('+1')).toBe("'+1");
      expect(sanitizeCellValue('-1')).toBe("'-1");
      expect(sanitizeCellValue('@import')).toBe("'@import");
      expect(sanitizeCellValue('Plain text')).toBe('Plain text');
      expect(sanitizeCellValue(null)).toBe('');
    });

    it('sanitizeCellValue defers to legacy-app.js sanitizeForExcel when it is present', () => {
      // In the browser that global always exists, so this wrapper is a passthrough
      // and adopting core setCell cannot change what the features sanitized with.
      const spy = vi.fn(() => 'DELEGATED');
      const original = globalThis.window;
      globalThis.window = { sanitizeForExcel: spy };
      try {
        expect(sanitizeCellValue('=danger')).toBe('DELEGATED');
        expect(spy).toHaveBeenCalledWith('=danger');
      } finally {
        if (original === undefined) delete globalThis.window;
        else globalThis.window = original;
      }
    });

    it("the local fallback guards a superset of legacy sanitizeForExcel's characters", () => {
      // legacy-app.js:985 is /^[=+\-@]/; this fallback adds \t and \r. A superset
      // is safe in one direction only, so pin the direction: anything the legacy
      // rule escapes, this must escape too. (The reverse does NOT hold, and that
      // asymmetry is deliberate -- see excel-engine.js's note. The legacy version
      // is the one that runs in production.)
      const legacyEscapes = s => /^[=+\-@]/.test(s);
      const original = globalThis.window;
      if (original !== undefined) delete globalThis.window;
      try {
        for (const s of ['=x', '+x', '-x', '@x', '\tx', '\rx', 'x', ' =x', '']) {
          if (legacyEscapes(s)) {
            expect(sanitizeCellValue(s), `legacy escapes ${JSON.stringify(s)}, so core must`).toBe("'" + s);
          }
        }
        // And the two extra characters the stricter fallback adds.
        expect(sanitizeCellValue('\tx')).toBe("'\tx");
        expect(sanitizeCellValue('\rx')).toBe("'\rx");
      } finally {
        if (original !== undefined) globalThis.window = original;
      }
    });

    it('setCell writes sanitized values or numbers to a worksheet cell', () => {
      const cells = {};
      const sheet = { getCell: (addr) => (cells[addr] = cells[addr] || { value: undefined }) };

      setCell(sheet, 'A1', 'Hello');
      expect(cells.A1.value).toBe('Hello');

      setCell(sheet, 'A2', 1234.5);
      expect(cells.A2.value).toBe(1234.5);

      setCell(sheet, 'A3', '');
      expect(cells.A3.value).toBeNull();

      setCell(sheet, 'A4', null);
      expect(cells.A4.value).toBeNull();

      setCell(sheet, 'A5', '=BAD()');
      expect(cells.A5.value).toBe("'=BAD()");
    });

    it('setCell tolerates a missing sheet instead of throwing', () => {
      // The local closures this replaced had no such guard; it is the only
      // behavioral difference, and it is strictly additive.
      expect(setCell(null, 'A1', 'x')).toBeNull();
      expect(setCell(undefined, 'A1', 'x')).toBeNull();
    });

    it('setCell returns the cell it wrote', () => {
      const cell = { value: undefined };
      const sheet = { getCell: () => cell };
      expect(setCell(sheet, 'B2', 'v')).toBe(cell);
    });
  });
});
