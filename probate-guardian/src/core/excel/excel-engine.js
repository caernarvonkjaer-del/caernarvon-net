/**
 * Centralized Excel Engine for Probate Guardian.
 *
 * Provides shared workbook creation, cell setting with sanitization,
 * safe workbook downloading with object URL cleanup, cell formatting,
 * and value extraction.
 */

import { getExcelJS } from './exceljs-loader.js';

export { getExcelJS };

/**
 * Creates a new ExcelJS Workbook instance, ensuring ExcelJS is loaded.
 * @returns {Promise<any>}
 */
export async function createWorkbook() {
  const ExcelJS = await getExcelJS();
  return new ExcelJS.Workbook();
}

/**
 * Loads an Excel workbook from an ArrayBuffer or Uint8Array.
 * @param {ArrayBuffer|Uint8Array} buffer
 * @returns {Promise<any>}
 */
export async function loadWorkbookFromBuffer(buffer) {
  const workbook = await createWorkbook();
  const arrayBuffer = buffer instanceof Uint8Array ? buffer.buffer : buffer;
  await workbook.xlsx.load(arrayBuffer);
  return workbook;
}

/**
 * Sanitizes cell text to prevent formula injection in spreadsheet software.
 * @param {string} str
 * @returns {string}
 */
export function sanitizeCellValue(str) {
  if (typeof window !== 'undefined' && typeof window.sanitizeForExcel === 'function') {
    return window.sanitizeForExcel(str);
  }
  const s = String(str ?? '');
  if (/^[=+\-@\t\r]/.test(s)) {
    return "'" + s;
  }
  return s;
}

/**
 * Safely sets a worksheet cell's value, handling nulls, numbers, and sanitized text.
 * @param {any} sheet
 * @param {string} addr
 * @param {any} value
 * @returns {any} The cell
 */
export function setCell(sheet, addr, value) {
  if (!sheet) return null;
  const cell = sheet.getCell(addr);
  if (value == null || value === '') {
    cell.value = null;
  } else if (typeof value === 'number') {
    cell.value = value;
  } else {
    cell.value = sanitizeCellValue(String(value));
  }
  return cell;
}

/**
 * Formats dates to standard YYYY-MM-DD for court filings.
 * @param {any} val
 * @returns {string}
 */
export function fmtDate(val) {
  if (!val) return '';
  const str = String(val).trim();
  return str.length >= 10 ? str.substring(0, 10) : str;
}

/**
 * Converts a value to numeric, defaulting to 0.
 * @param {any} val
 * @returns {number}
 */
export function numValue(val) {
  return parseFloat(val) || 0;
}

/**
 * Converts percentage string/number to decimal (e.g. 50 -> 0.5 or 0.5 -> 0.5).
 * @param {any} val
 * @returns {number}
 */
export function percentValue(val) {
  const p = parseFloat(val);
  return isNaN(p) ? 0 : p > 1 ? p / 100 : p;
}

/**
 * Boolean to Yes / No string.
 * @param {any} bool
 * @returns {'Yes'|'No'}
 */
export function yesNo(bool) {
  return bool ? 'Yes' : 'No';
}

/**
 * Tristate boolean to Yes / No / empty.
 * @param {boolean|null|undefined} val
 * @returns {'Yes'|'No'|''}
 */
export function yesNoTristate(val) {
  return val === true ? 'Yes' : val === false ? 'No' : '';
}

/**
 * Writes an ExcelJS workbook to a binary buffer and initiates download in the browser,
 * guaranteeing object URL revocation to prevent memory leaks.
 * @param {any} workbook
 * @param {string} filename
 * @returns {Promise<void>}
 */
export async function saveWorkbookFile(workbook, filename) {
  try {
    if (workbook.definedNames) {
      workbook.definedNames.model = [];
    }
  } catch (e) {}

  const outBuf = await workbook.xlsx.writeBuffer();
  const blob = new Blob([outBuf], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

  if (typeof window === 'undefined' || !document?.body) {
    return;
  }

  const url = URL.createObjectURL(blob);
  try {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  } finally {
    setTimeout(() => {
      try {
        URL.revokeObjectURL(url);
      } catch (e) {}
    }, 1500);
  }
}

/**
 * Reads plain text from a cell, unwrapping formulas, richText, etc.
 * @param {any} cell
 * @returns {string}
 */
export function readCellText(cell) {
  if (!cell) return '';
  if (typeof window !== 'undefined' && typeof window.readCellText === 'function') {
    return window.readCellText(cell);
  }
  const v = cell.value;
  if (v == null) return '';
  if (typeof v === 'string') return v.trim();
  if (typeof v === 'number') return String(v);
  if (v instanceof Date) return v.toISOString().substring(0, 10);
  if (typeof v === 'object') {
    if (v.text) return String(v.text).trim();
    if (v.result != null) return String(v.result).trim();
    if (Array.isArray(v.richText)) return v.richText.map((t) => t.text || '').join('').trim();
  }
  return String(v).trim();
}

/**
 * Reads a numeric value from a cell.
 * @param {any} cell
 * @returns {number}
 */
export function readCellNumber(cell) {
  if (!cell) return 0;
  const txt = readCellText(cell);
  const clean = txt.replace(/[$,]/g, '');
  return parseFloat(clean) || 0;
}

/**
 * Reads a date string (YYYY-MM-DD) from a cell.
 * @param {any} cell
 * @returns {string|null}
 */
export function readCellDate(cell) {
  if (!cell || cell.value == null) return null;
  const v = cell.value;
  if (v instanceof Date) {
    return v.toISOString().substring(0, 10);
  }
  if (typeof v === 'number') {
    // Excel serial date to JS date
    const d = new Date((v - 25569) * 86400 * 1000);
    return isNaN(d.getTime()) ? null : d.toISOString().substring(0, 10);
  }
  const txt = readCellText(cell);
  if (!txt) return null;
  if (/^\d{4}-\d{2}-\d{2}/.test(txt)) return txt.substring(0, 10);
  const parsed = Date.parse(txt);
  if (!isNaN(parsed)) {
    return new Date(parsed).toISOString().substring(0, 10);
  }
  return txt.substring(0, 10);
}

/**
 * Protects a worksheet with standard court workbook protection flags.
 * @param {any} sheet
 * @param {string} [password='']
 */
export function protectSheet(sheet, password = '') {
  if (!sheet || typeof sheet.protect !== 'function') return;
  sheet.protect(password, {
    selectLockedCells: true,
    selectUnlockedCells: true,
    formatCells: false,
    formatColumns: false,
    formatRows: false,
    insertColumns: false,
    insertRows: false,
    insertHyperlinks: false,
    deleteColumns: false,
    deleteRows: false,
    sort: false,
    autoFilter: false,
    pivotTables: false,
  });
}

/**
 * Auto-fits columns based on cell content length.
 * @param {any} sheet
 * @param {number} [minWidth=10]
 * @param {number} [maxWidth=60]
 */
export function autoFitColumns(sheet, minWidth = 10, maxWidth = 60) {
  if (!sheet?.columns) return;
  sheet.columns.forEach((column) => {
    let maxLen = 0;
    column.eachCell?.({ includeEmpty: false }, (cell) => {
      const text = readCellText(cell);
      if (text.length > maxLen) {
        maxLen = text.length;
      }
    });
    column.width = Math.max(minWidth, Math.min(maxLen + 2, maxWidth));
  });
}

if (typeof window !== 'undefined') {
  window.ExcelEngine = {
    getExcelJS,
    createWorkbook,
    loadWorkbookFromBuffer,
    setCell,
    saveWorkbookFile,
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
  };
}
