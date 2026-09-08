import { describe, it, expect, vi } from 'vitest';
import {
  setCell,
  fmtDate,
  numValue,
  percentValue,
  yesNo,
  yesNoTristate,
  readCellText,
  readCellNumber,
  readCellDate,
  protectSheet,
  autoFitColumns,
  sanitizeCellValue,
} from '../../src/core/excel/excel-engine.js';

describe('Excel Engine unit tests', () => {
  describe('formatting and conversion helpers', () => {
    it('fmtDate truncates ISO timestamps to YYYY-MM-DD', () => {
      expect(fmtDate('2026-09-08T14:30:00Z')).toBe('2026-09-08');
      expect(fmtDate('2026-01-15')).toBe('2026-01-15');
      expect(fmtDate('')).toBe('');
      expect(fmtDate(null)).toBe('');
    });

    it('numValue parses floats or falls back to 0', () => {
      expect(numValue('1234.56')).toBe(1234.56);
      expect(numValue(987)).toBe(987);
      expect(numValue('invalid')).toBe(0);
      expect(numValue(null)).toBe(0);
    });

    it('percentValue converts percentages to decimal fractions', () => {
      expect(percentValue(50)).toBe(0.5);
      expect(percentValue('25')).toBe(0.25);
      expect(percentValue(0.75)).toBe(0.75);
      expect(percentValue('0.15')).toBe(0.15);
      expect(percentValue('invalid')).toBe(0);
    });

    it('yesNo formats booleans cleanly', () => {
      expect(yesNo(true)).toBe('Yes');
      expect(yesNo(false)).toBe('No');
      expect(yesNo(null)).toBe('No');
    });

    it('yesNoTristate handles true, false, and null/undefined', () => {
      expect(yesNoTristate(true)).toBe('Yes');
      expect(yesNoTristate(false)).toBe('No');
      expect(yesNoTristate(null)).toBe('');
      expect(yesNoTristate(undefined)).toBe('');
    });
  });

  describe('sanitization and cell writing', () => {
    it('sanitizeCellValue prefixes formula injection characters with single quote', () => {
      expect(sanitizeCellValue('=SUM(A1:A10)')).toBe("'=SUM(A1:A10)");
      expect(sanitizeCellValue('+123')).toBe("'+123");
      expect(sanitizeCellValue('-456')).toBe("'-456");
      expect(sanitizeCellValue('@cmd')).toBe("'@cmd");
      expect(sanitizeCellValue('Regular text')).toBe('Regular text');
    });

    it('setCell writes sanitized values or numbers to worksheet cell', () => {
      const cellMap = new Map();
      const mockSheet = {
        getCell: (addr) => {
          if (!cellMap.has(addr)) {
            cellMap.set(addr, { value: null });
          }
          return cellMap.get(addr);
        },
      };

      setCell(mockSheet, 'A1', 'Hello World');
      expect(mockSheet.getCell('A1').value).toBe('Hello World');

      setCell(mockSheet, 'B1', '=1+1');
      expect(mockSheet.getCell('B1').value).toBe("'=1+1");

      setCell(mockSheet, 'C1', 12345.67);
      expect(mockSheet.getCell('C1').value).toBe(12345.67);

      setCell(mockSheet, 'D1', null);
      expect(mockSheet.getCell('D1').value).toBeNull();

      setCell(mockSheet, 'E1', '');
      expect(mockSheet.getCell('E1').value).toBeNull();
    });
  });

  describe('cell reading helpers', () => {
    it('readCellText extracts strings from plain, numeric, or formula cells', () => {
      expect(readCellText({ value: 'Sample Text' })).toBe('Sample Text');
      expect(readCellText({ value: 1234 })).toBe('1234');
      expect(readCellText({ value: { result: 'Computed Value' } })).toBe('Computed Value');
      expect(readCellText({ value: { text: 'Plain Text Object' } })).toBe('Plain Text Object');
      expect(readCellText({ value: { richText: [{ text: 'Part 1 ' }, { text: 'Part 2' }] } })).toBe('Part 1 Part 2');
      expect(readCellText(null)).toBe('');
    });

    it('readCellNumber parses currency-formatted strings', () => {
      expect(readCellNumber({ value: '$1,234.56' })).toBe(1234.56);
      expect(readCellNumber({ value: '456.78' })).toBe(456.78);
      expect(readCellNumber({ value: 999 })).toBe(999);
      expect(readCellNumber({ value: 'not a number' })).toBe(0);
    });

    it('readCellDate extracts formatted ISO date string', () => {
      expect(readCellDate({ value: new Date('2026-05-20T00:00:00Z') })).toBe('2026-05-20');
      expect(readCellDate({ value: '2026-08-15' })).toBe('2026-08-15');
      // Excel serial date for 2026-01-01 (approx 46023)
      expect(readCellDate({ value: null })).toBeNull();
    });
  });

  describe('sheet protection and auto-fit columns', () => {
    it('protectSheet invokes sheet.protect with standard permissions', () => {
      const protectSpy = vi.fn();
      const mockSheet = { protect: protectSpy };

      protectSheet(mockSheet, 'password123');
      expect(protectSpy).toHaveBeenCalledWith('password123', expect.objectContaining({
        selectLockedCells: true,
        selectUnlockedCells: true,
        formatCells: false,
      }));
    });

    it('autoFitColumns calculates column widths based on maximum text length', () => {
      const col1 = { width: 0, eachCell: (opts, cb) => { cb({ value: 'Short' }); cb({ value: 'Much longer text content' }); } };
      const col2 = { width: 0, eachCell: (opts, cb) => { cb({ value: 'Abc' }); } };
      const mockSheet = { columns: [col1, col2] };

      autoFitColumns(mockSheet, 10, 50);
      expect(col1.width).toBe('Much longer text content'.length + 2);
      expect(col2.width).toBe(10); // Minimum width
    });
  });
});
